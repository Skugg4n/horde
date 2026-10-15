// Spelet: meny med banval, dagar på E4 och Gnesta, och forskning mellan dagarna.
// Lägen: menu -> intro -> play -> result -> (intro samma dag | intro nästa dag | research).
// Simuleringen stegas bara i play; scenen ritas alltid (dammet rör sig bakom skyltarna).
import { VERSION } from './version.js';
import { MAPS } from './data/maps.js';
import { createRenderer, createScene } from './render/scene.js';
import { buildWorld, updateWorld } from './render/world.js';
import { createView } from './render/view.js';
import { createPicker } from './render/picking.js';
import { createRig } from './render/camera-rig.js';
import { createRouteLines } from './render/route-lines.js';
import { mountHud, waveText } from './ui/hud.js';
import { slotPanel, cellPanel, dayIntro, dayResultPanel, researchPanel, mainMenu, note } from './ui/panels.js';
import { newProgress, startConfig, dayResult, buyResearch, mapState, mapUnlocked, selectMap } from './meta/progress.js';
import { loadProgress, saveProgress } from './meta/save.js';
import { createSim, startWave, step, build, upgrade, sell, placeAcross, removeObstacle, acrossCells, zombiePos, buyKit, callNextWave } from './sim/sim.js';
import { pointAt } from './sim/path.js';
import { weaponStats } from './sim/stats.js';
import { Vector3, Box3 } from 'three';

const DT = 1 / 30;
// Fart 1x, 2x, 3x: fler fasta steg per bildruta (simuleringen har samma dt), taket följer med.
const SPEEDS = [1, 2, 3];
const MAX_STEPS_PER_SPEED = 5;
const BASE_TOAST_GAP = 4;          // sekunder mellan två "Basen tar skada!"
const SHAKE_TIME = 0.35, SHAKE_AMP = 0.18;
const BLAST_SHAKE_TIME = 0.25, BLAST_SHAKE_AMP = 0.1;   // granatsmäll: kortare och svagare än basen
// ?debug: alla banor går att välja och window.__horde finns i konsolen.
const DEBUG = new URLSearchParams(location.search).has('debug');
let progress = loadProgress();
if (!mapUnlocked(progress, progress.mapId, { debug: DEBUG })) progress = selectMap(progress, 'riksvagen');
const renderer = createRenderer(document.getElementById('stage'));
document.getElementById('ver').textContent = 'v' + VERSION;
const uiRoot = document.getElementById('ui');

// Banan: scen, kamera, värld, vy och hordens vägar. Byggs om när spelaren byter bana i menyn.
let map = null, stage = null, scene = null, camera = null, rig = null, view = null, routeLines = null;
let day = 1, sim = null;
function disposeScene() {
  stage.dispose(); rig.dispose();
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
      m.dispose();
    }
  });
  renderer.renderLists.dispose();
}
function loadMap(id) {
  if (map && map.id === id) return;
  if (scene) disposeScene();
  map = MAPS[id] ?? MAPS.riksvagen;
  stage = createScene(null, map, { renderer });
  ({ scene, camera } = stage);
  buildWorld(scene, map);
  rig = createRig({ camera, map, fill: stage.fill, dom: renderer.domElement });
  day = Math.min(mapState(progress, map.id).unlockedDay, map.days.length);
  // Vakt: hittas ingen dag (konstig sparfil) byggs dag 1 i stället för att spelet kraschar.
  // Simuleringen ersätts ändå när spelaren väljer dag i menyn.
  sim = createSim(startConfig(progress, day, map.id) ?? startConfig(newProgress(), 1));
  view = createView(scene, sim);
  routeLines = createRouteLines(scene);
  routeKeys.now = routeKeys.preview = null;
}
const routeKeys = { now: null, preview: null };
loadMap(progress.mapId);

const hud = mountHud(uiRoot, { onStart: () => go(), onSpeed: () => toggleSpeed(), onNext: () => go() });
const dim = document.createElement('div');
dim.className = 'dim';
uiRoot.prepend(dim);

// ---------- val och panel ----------
let selected = null;      // { kind, id }
let hovered = null;
let panel = null;
let panelRange = null;    // räckvidd som panelen vill visa (kort under musen)

function closePanel() {
  if (panel) panel.close();
  panel = null; selected = null; panelRange = null; previewCard = null;
}
// Varje handling visar sin egen ändring av pengarna under kassan, exakt det beloppet.
const withCash = fn => (...args) => {
  const before = sim.cash;
  const r = fn(...args);
  if (r.ok && sim.cash !== before) hud.cashDelta(Math.round(sim.cash) - Math.round(before));
  return r;
};
const actions = {
  build: withCash((id, type) => build(sim, id, type)),
  upgrade: withCash(id => upgrade(sim, id)),
  sell: withCash(id => sell(sim, id)),
  kit: withCash(id => buyKit(sim, id)),
  // Gnesta: spärren läggs tvärs över gatan (E4: bara rutan).
  place: withCash((cell, type) => placeAcross(sim, cell, type)),
  remove: withCash(cell => removeObstacle(sim, cell)),
  range: r => { panelRange = r; },
  // Kortet under pekaren i rutans panel: förhandsvisa just det hindret.
  preview: (cell, type) => { previewCard = type ? { cell, type } : null; },
  close: closePanel,
};
let previewCard = null;
// Klick på en annan position eller ruta medan panelen är öppen byter direkt till den.
function open(p) {
  if (selected && selected.kind === p.kind && selected.id === p.id) return;
  closePanel();
  selected = p;
  panel = p.kind === 'slot' ? slotPanel(uiRoot, p.id, sim, actions) : cellPanel(uiRoot, p.id, sim, actions);
  placePanel();
}

const picker = createPicker(() => camera, renderer.domElement, () => view.rayTargets(), (x, z) => {
  const i = sim.route.cellAt(x, z);
  return i == null || !sim.route.validCell(i) ? null : { kind: 'cell', id: i };
}, { ignoreClick: () => rig.takeDrag() });
picker.onPick(p => { if (mode !== 'play' || sim.phase === 'won' || sim.phase === 'lost') return; if (p) open(p); else closePanel(); });
picker.onHover(p => { hovered = mode === 'play' ? p : null; });
// Klick utanför panelen (men inte i scenen, den sköts av plockaren) stänger den.
document.addEventListener('pointerdown', e => {
  if (!panel || panel.el.contains(e.target) || e.target === renderer.domElement) return;
  closePanel();
});

// En enda väg för händelser: efter varje step och efter startWave/callNextWave.
function handleEvents() {
  const evs = sim.events;
  view.consume(evs);
  if (evs.some(e => e.t === 'breach')) onBreach();
  if (evs.some(e => e.t === 'blast')) shake(BLAST_SHAKE_TIME, BLAST_SHAKE_AMP);
  for (const ev of evs) {
    if (ev.t === 'waveStart') hud.banner(waveText(sim.dayCfg, ev.index), 4.5);
    else if (ev.t === 'earlyBonus') hud.early(ev.amount);
    else if (ev.t === 'kill' && ev.bounty) {
      tmpV.set(ev.x, 2, ev.z).project(camera);
      hud.bounty((tmpV.x + 1) / 2 * innerWidth, (1 - tmpV.y) / 2 * innerHeight, ev.bounty);
    }
  }
  sim.events = [];
}

// Mellanslag och knappen: Start wave före våg 1, annars Next wave (under nedräkningen eller mitt
// i en våg). Tidigt kall ger bonus, som visas under kassan.
function go() {
  if (mode !== 'play') return;
  if (sim.phase === 'build' && sim.nextWaveIn == null) {
    if (!startWave(sim)) return;
  } else {
    if (!callNextWave(sim).ok) return;
  }
  handleEvents();
  if (hinting) { hinting = false; progress = { ...progress, seenHint: true }; save(); }
}

// ---------- fart ----------
let speed = 1;
// F och knappen stegar 1x, 2x, 3x och runt. Gäller under vågen och nedräkningen.
function toggleSpeed() {
  if (mode !== 'play' || !(sim.phase === 'wave' || sim.phase === 'build')) return;
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  hud.setSpeed(speed);
}

// ---------- basen tar skada ----------
let lastBaseToast = -Infinity, shakeT = 0, shakeLen = SHAKE_TIME, shakeAmp = SHAKE_AMP;
function onBreach() {
  hud.baseHit();
  shake(SHAKE_TIME, SHAKE_AMP);
  if (time - lastBaseToast >= BASE_TOAST_GAP) { lastBaseToast = time; note(uiRoot, 'Base under attack!', 'warn'); }
}
// Samma skak för basen och granaterna; en starkare pågående skakning skrivs inte över av en svagare.
function shake(len, amp) {
  if (shakeT > 0 && shakeAmp * (shakeT / shakeLen) > amp) return;
  shakeT = shakeLen = len; shakeAmp = amp;
}
function shakeCamera(dt) {
  if (shakeT <= 0) return;
  shakeT = Math.max(0, shakeT - dt);
  const a = shakeAmp * (shakeT / shakeLen);
  if (shakeT === 0) rig.setShake(0, 0);
  else rig.setShake((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a);
}

// ---------- horden på väg in ----------
// Pil vid skärmkanten där vägen kommer in, medan zombier är på väg men ännu inte syns.
const tmpE = new Vector3();
const EDGE = 60;   // px från skärmkanten
function onScreen(x, z, margin = 0) {
  tmpE.set(x, 0, z).project(camera);
  const sx = (tmpE.x + 1) / 2 * innerWidth, sy = (1 - tmpE.y) / 2 * innerHeight;
  return { sx, sy, in: sx >= margin && sx <= innerWidth - margin && sy >= margin && sy <= innerHeight - margin };
}
let entryAt = null;
function findEntry() {
  // Första punkten längs vägen (från spawn) som ligger EDGE px innanför kanten.
  for (let d = 0; d <= sim.len; d += 0.5) {
    const p = pointAt(sim.map.path, d);
    const s = onScreen(p.x, p.z, EDGE);
    if (s.in) {
      const q = pointAt(sim.map.path, d + 2), t = onScreen(q.x, q.z);
      return { x: s.sx, y: s.sy, angle: Math.atan2(t.sy - s.sy, t.sx - s.sx) + Math.PI };
    }
  }
  return null;
}
addEventListener('resize', () => { entryAt = null; });
function updateEntry() {
  if (mode !== 'play') { hud.entry(null); return; }
  if (sim.route.kind === 'grid') { hud.entry(gridEntries()); return; }
  if (sim.phase !== 'wave') { hud.entry(null); return; }
  const alive = sim.zombies.filter(z => !z.dead);
  if (!alive.length && !sim.spawnQueue.length) { hud.entry(null); return; }
  const seen = alive.some(z => { const p = zombiePos(sim, z); return onScreen(p.x, p.z, 10).in; });
  if (seen) { hud.entry(null); return; }
  entryAt = entryAt || findEntry();
  hud.entry(entryAt);
}

// Ingångarna som dagens vågor använder (standard: banans första).
function daySpawns() {
  const first = sim.route.spawns?.[0]?.id;
  return [...new Set(sim.dayCfg.waves.flatMap(w => w.groups.map(g => g.spawn ?? first)))];
}
// Gnesta: en pil per ingång. Under vågen där zombier från den är på väg men inte syns
// ("Horde incoming"); före vågen vid kanten för ingångar som ligger utanför bild.
function gridEntries() {
  const out = [], wave = sim.phase === 'wave', build = sim.phase === 'build';
  if (!wave && !build) return out;
  const first = sim.route.spawns[0].id, active = daySpawns();
  const cx = innerWidth / 2, cy = innerHeight / 2;
  for (const sp of sim.route.spawns) {
    if (!active.includes(sp.id)) continue;
    let text = 'Horde incoming';
    if (wave) {
      const pending = sim.spawnQueue.some(q => (q.spawn ?? first) === sp.id);
      const alive = sim.zombies.filter(z => !z.dead && z.spawn === sp.id);
      if (!pending && !alive.length) continue;
      if (alive.some(z => onScreen(z.x, z.z, 10).in)) continue;
    } else text = 'They come from here';
    const s = onScreen(sp.x, sp.z, EDGE);
    if (s.in) {
      if (!wave) continue;
      // ingången syns: pilen vid den, i riktning längs vägen in
      const path = sim.route.paths([sp.id])[0];
      const c = path && sim.route.cellCenter(path.cells[Math.min(3, path.cells.length - 1)]);
      const t = c ? onScreen(c.x, c.z) : { sx: cx, sy: cy };
      out.push({ x: s.sx, y: s.sy, angle: Math.atan2(t.sy - s.sy, t.sx - s.sx) + Math.PI, text });
      continue;
    }
    // utanför bild: vid kanten på linjen från mitten mot ingången, fri från plåtarna uppe och
    // knappen nere (större marginal där)
    const dx = s.sx - cx, dy = s.sy - cy;
    const half = dy < 0 ? cy - 110 : cy - 120;
    const k = Math.min(Math.abs((cx - EDGE) / (dx || 1e-6)), Math.abs(half / (dy || 1e-6)));
    let x = cx + dx * k, y = cy + dy * k;
    if (y > innerHeight - 160 && Math.abs(x - cx) < 380) x = cx + (x < cx ? -380 : 380);
    out.push({ x, y, angle: Math.atan2(-dy, -dx) + Math.PI, text });
  }
  return out;
}

// Hordens väg på Gnesta: svagt band för vägen som gäller nu, rost för förhandsvisningen när
// pekaren står på en gata (eller en ruta är vald): så går de om du spärrar här.
const cellWorld = k => { const c = sim.route.cellCenter(k); return [c.x, c.z]; };
let nowPaths = null;
function updateRoutes() {
  const grid = sim.route.kind === 'grid' && mode === 'play' && (sim.phase === 'build' || sim.phase === 'wave');
  if (!grid) { routeLines.set('now', null); routeLines.set('preview', null); return null; }
  const ids = daySpawns();
  const obsKey = Object.keys(sim.obstacles).join(',');
  const nowKey = obsKey + '|' + ids.join(',');
  if (routeKeys.now !== nowKey) { routeKeys.now = nowKey; nowPaths = sim.route.paths(ids); }
  routeLines.set('now', nowPaths.map(p => p.cells.map(cellWorld)), nowKey);
  const at = hovered?.kind === 'cell' ? hovered.id : selected?.kind === 'cell' ? selected.id : null;
  if (at == null) { routeLines.set('preview', null); return null; }
  const ob = sim.obstacles[at];
  const type = previewCard?.cell === at ? previewCard.type : 'block';
  const obs = { ...sim.obstacles };
  let cells;
  if (ob) {
    cells = Object.keys(sim.obstacles).filter(k => k === String(at) || (ob.line != null && sim.obstacles[k].line === ob.line)).map(Number);
    for (const k of cells) delete obs[k];
  } else {
    cells = acrossCells(sim, at);
    for (const k of cells) obs[k] = { type };
  }
  const pKey = `${at}|${type}|${nowKey}`;
  if (routeKeys.preview !== pKey) {
    routeKeys.preview = pKey;
    const paths = sim.route.paths(ids, obs);
    const same = paths.every((p, i) => p.cells.join() === nowPaths[i]?.cells.join());
    routeKeys.previewPaths = same ? null : paths.map(p => p.cells.map(cellWorld));
  }
  routeLines.set('preview', routeKeys.previewPaths, pKey);
  return { cells, tone: ob ? 'paper' : 'rust' };
}
addEventListener('keydown', e => {
  // Esc tar bort både valet och pekarens markering, så att ingen ram eller räckvidd ligger kvar.
  if (e.key === 'Escape') { if (mode === 'research') sheetAction('close'); else { closePanel(); hovered = null; } }
  if (e.key === 'Enter' && mode === 'intro' && !e.repeat) { e.preventDefault(); sheetAction('go'); }
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) go(); }
  if (e.code === 'KeyF' && !e.repeat && !e.metaKey && !e.ctrlKey) toggleSpeed();
}, true);
addEventListener('keyup', e => { if (e.code === 'Space') e.preventDefault(); }, true);

// ---------- dagcykeln ----------
let mode = 'menu';
let sheet = null;            // skylten som visas (meny, intro, resultat, forskning)
let lastResult = null;       // det som resultatskylten visar, för att komma tillbaka från forskning
let researchFrom = 'menu';
let hinting = false;         // de tre stegen för första dagen visas
let warnedSave = false;

function save() {
  if (saveProgress(progress) || warnedSave) return;
  warnedSave = true;
  note(uiRoot, 'Could not save.');
}
function setMode(m, makeSheet) {
  if (sheet) sheet.close();
  closePanel();
  // Notiser från dagen (t.ex. "Basen tar skada!") ska inte ligga kvar över skyltarna.
  for (const n of uiRoot.querySelectorAll('.note.warn')) n.remove();
  hovered = null;
  mode = m;
  uiRoot.dataset.mode = m;
  sheet = makeSheet ? makeSheet() : null;
}
// Knapp på skylten via tangent: samma sak som att klicka på den.
function sheetAction(a) {
  const b = sheet && sheet.el.querySelector(`[data-a="${a}"]`);
  if (b) b.click();
}

function showMenu() {
  setMode('menu', () => mainMenu(uiRoot, progress, {
    version: VERSION,
    debug: DEBUG,
    onDay: n => startDay(n),
    onResearch: () => showResearch('menu'),
    onMap: id => { progress = selectMap(progress, id); save(); loadMap(id); hud.reset(); showMenu(); },
  }));
}
function startDay(n) {
  const cfg = startConfig(progress, n);
  if (!cfg) { showMenu(); return; }
  day = n;
  sim = createSim(cfg);
  view.setSim(sim);
  hud.reset();
  speed = 1; hud.setSpeed(1);
  entryAt = null; shakeT = 0; rig.setShake(0, 0); rig.goHome();
  hinting = n === 1 && !progress.seenHint;
  setMode('intro', () => dayIntro(uiRoot, map.days[n - 1], cfg.cash, () => setMode('play')));
}
function finishDay() {
  const won = sim.phase === 'won';
  progress = dayResult(progress, { day, won, intelEarned: sim.intelEarned, mapId: map.id });
  save();
  lastResult = {
    won, day, intelEarned: sim.intelEarned, kills: sim.kills,
    wavesCleared: sim.waveIndex, waves: sim.dayCfg.waves.length,
    lastDay: day >= map.days.length,
    cashLeft: won ? Math.round(sim.cash) : 0,
  };
  showResult();
}
function showResult() {
  setMode('result', () => dayResultPanel(uiRoot, { ...lastResult, totalIntel: progress.intel, mapName: map.name }, {
    onRetry: () => startDay(day),
    onNext: () => startDay(day + 1),
    onResearch: () => showResearch('result'),
    onMenu: showMenu,
  }));
}
function showResearch(from) {
  researchFrom = from;
  setMode('research', () => researchPanel(uiRoot, progress, id => {
    progress = buyResearch(progress, id);
    save();
    return progress;
  }, () => (researchFrom === 'result' ? showResult() : showMenu())));
}

function rangeFor(p) {
  if (!p || p.kind !== 'slot') return null;
  const s = sim.slots.find(x => x.id === p.id);
  if (!s || !s.weapon) return null;
  return { x: s.x, z: s.z, r: weaponStats(s.weapon.type, s.weapon.level, sim.research).range };
}

// Panelen läggs där den inte täcker någon position eller ruta på vägen, och inte heller
// dagens plåtar eller knappen nere i mitten. Samma plats behålls så länge den är fri, så att
// panelen inte hoppar när man klickar från position till position.
const tmpV = new Vector3(), tmpBox = new Box3();
const PAD = 10, GRID = 16, MARGIN = 16;
let panelSpot = null;
addEventListener('resize', () => { panelSpot = null; if (panel) placePanel(); });
function screenRect(object) {
  tmpBox.setFromObject(object);
  if (tmpBox.isEmpty()) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    tmpV.set(i & 1 ? tmpBox.max.x : tmpBox.min.x, i & 2 ? tmpBox.max.y : tmpBox.min.y, i & 4 ? tmpBox.max.z : tmpBox.min.z).project(camera);
    const x = (tmpV.x + 1) / 2 * innerWidth, y = (1 - tmpV.y) / 2 * innerHeight;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0: x0 - PAD, y0: y0 - PAD, x1: x1 + PAD, y1: y1 + PAD };
}
function hudRects() {
  const out = [];
  for (const sel of ['#day', '#res', '#hint']) {
    const n = uiRoot.querySelector(sel);
    if (!n || n.hidden) continue;
    const r = n.getBoundingClientRect();
    if (r.width) out.push({ x0: r.left - PAD, y0: r.top - PAD, x1: r.right + PAD, y1: r.bottom + PAD });
  }
  // Knappen och raden nere i mitten byter med fasen; hela den ytan hålls fri.
  out.push({ x0: innerWidth / 2 - 320, y0: innerHeight - 90, x1: innerWidth / 2 + 320, y1: innerHeight });
  // Vågens rad uppe i mitten.
  out.push({ x0: innerWidth / 2 - 260, y0: 0, x1: innerWidth / 2 + 260, y1: 64 });
  return out;
}
const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
function placePanel() {
  if (!panel) return;
  const el = panel.el;
  el.classList.add('placed');
  const w = el.offsetWidth, h = el.offsetHeight;
  const markers = view.pickTargets().map(t => screenRect(t.object)).filter(Boolean);
  const huds = hudRects();
  const maxX = Math.max(MARGIN, innerWidth - w - MARGIN), maxY = Math.max(MARGIN, innerHeight - h - MARGIN);
  // Förstahandsval utan tidigare plats: nere till vänster.
  const want = panelSpot || { x: MARGIN, y: maxY };
  let best = null;
  for (let y = MARGIN; y <= maxY + 0.5; y += GRID) {
    for (let x = MARGIN; x <= maxX + 0.5; x += GRID) {
      const r = { x0: x, y0: y, x1: x + w, y1: y + h };
      let cost = 0;
      for (const m of markers) cost += overlap(r, m) * 10;
      for (const u of huds) cost += overlap(r, u) * 4;
      cost += Math.hypot(x - want.x, y - want.y) * 0.05;
      if (!best || cost < best.cost) best = { x, y, cost };
    }
  }
  // Den gamla platsen vinner om den fortfarande är fri (då står panelen still).
  if (panelSpot) {
    const x = Math.min(panelSpot.x, maxX), y = Math.min(panelSpot.y, maxY);
    const r = { x0: x, y0: y, x1: x + w, y1: y + h };
    if (markers.every(m => !overlap(r, m)) && huds.every(u => !overlap(r, u))) best = { x, y };
  }
  panelSpot = { x: best.x, y: best.y };
  el.style.left = best.x + 'px';
  el.style.top = best.y + 'px';
}

// Felsökning och prestandamätning i konsolen, bara med ?debug i adressen.
if (DEBUG) window.__horde = { get sim() { return sim; }, get progress() { return progress; }, get mode() { return mode; }, get selected() { return selected; }, get hovered() { return hovered; }, set hovered(v) { hovered = v; }, get view() { return view; }, get rig() { return rig; }, get scene() { return scene; }, get camera() { return camera; }, renderer, actions, go, startDay, setMode, loadMap, toggleSpeed, sheetAction,
  // simuleringen framåt utan att vänta (prov och skärmbilder); vyn ritas i nästa bildruta
  advance(secs) { for (let t = 0; t < secs / DT && mode === 'play' && (sim.phase === 'wave' || sim.phase === 'build'); t++) { step(sim, DT); handleEvents(); } } };
showMenu();

let last = performance.now(), time = 0, acc = 0;
function tick(now) {
  const frameDt = Math.min((now - last) / 1000, 0.1);
  last = now; time += frameDt;

  // Fart bara när tiden går i simuleringen (våg eller nedräkning), inte före första vågen.
  const running = sim.phase === 'wave' || (sim.phase === 'build' && sim.nextWaveIn != null);
  const mul = running ? speed : 1;
  const maxSteps = MAX_STEPS_PER_SPEED * mul;
  if (mode === 'play') acc += frameDt * mul;
  let steps = 0;
  while (acc >= DT && steps < maxSteps) {
    step(sim, DT);
    handleEvents();
    acc -= DT; steps++;
  }
  if (steps === maxSteps) acc = Math.min(acc, DT);
  if (mode !== 'play') acc = 0;
  if (mode === 'play' && (sim.phase === 'won' || sim.phase === 'lost')) finishDay();
  if (hinting) {
    const anyWeapon = sim.slots.some(x => x.weapon);
    hud.hint(mode === 'play' ? (anyWeapon ? 2 : selected?.kind === 'slot' ? 1 : 0) : null);
  } else hud.hint(null);

  if (panel) panel.update(sim);
  hud.update(sim);
  updateEntry();
  rig.active = mode === 'play';
  rig.update(frameDt);
  shakeCamera(frameDt);
  const tiles = updateRoutes();
  routeLines.update(frameDt);
  view.setUi({ selected, hover: hovered, range: panelRange || rangeFor(hovered) || rangeFor(selected), tiles });
  view.sync(frameDt);
  updateWorld(frameDt, time);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
