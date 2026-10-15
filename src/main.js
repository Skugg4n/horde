// Spelet: meny, dagar på E4 och forskning mellan dagarna.
// Lägen: menu -> intro -> play -> result -> (intro samma dag | intro nästa dag | research).
// Simuleringen stegas bara i play; scenen ritas alltid (dammet rör sig bakom skyltarna).
import { VERSION } from './version.js';
import { MAPS } from './data/maps.js';
import { createScene } from './render/scene.js';
import { buildWorld, updateWorld } from './render/world.js';
import { createView } from './render/view.js';
import { createPicker } from './render/picking.js';
import { mountHud, waveText } from './ui/hud.js';
import { slotPanel, cellPanel, dayIntro, dayResultPanel, researchPanel, mainMenu, note } from './ui/panels.js';
import { newProgress, startConfig, dayResult, buyResearch } from './meta/progress.js';
import { loadProgress, saveProgress } from './meta/save.js';
import { createSim, startWave, step, build, upgrade, sell, placeObstacle, removeObstacle, zombiePos, buyKit, callNextWave } from './sim/sim.js';
import { pointAt } from './sim/path.js';
import { weaponStats } from './sim/stats.js';
import { cellAt } from './sim/cells.js';
import { Vector3, Box3 } from 'three';

const DT = 1 / 30;
// Fart 1x, 2x, 3x: fler fasta steg per bildruta (simuleringen har samma dt), taket följer med.
const SPEEDS = [1, 2, 3];
const MAX_STEPS_PER_SPEED = 5;
const BASE_TOAST_GAP = 4;          // sekunder mellan två "Basen tar skada!"
const SHAKE_TIME = 0.35, SHAKE_AMP = 0.18;
const BLAST_SHAKE_TIME = 0.25, BLAST_SHAKE_AMP = 0.1;   // granatsmäll: kortare och svagare än basen
let progress = loadProgress();
const map = MAPS[progress.mapId] ?? MAPS.riksvagen;
const { renderer, scene, camera } = createScene(document.getElementById('stage'), map);
buildWorld(scene, map);
document.getElementById('ver').textContent = 'v' + VERSION;
const uiRoot = document.getElementById('ui');

let day = Math.min(progress.unlockedDay, map.days.length);
// Vakt: hittas ingen dag (konstig sparfil) byggs dag 1 i stället för att spelet kraschar.
// Simuleringen ersätts ändå när spelaren väljer dag i menyn.
let sim = createSim(startConfig(progress, day) ?? startConfig(newProgress(), 1));
const view = createView(scene, sim);
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
  panel = null; selected = null; panelRange = null;
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
  place: withCash((cell, type) => placeObstacle(sim, cell, type)),
  remove: withCash(cell => removeObstacle(sim, cell)),
  range: r => { panelRange = r; },
  close: closePanel,
};
// Klick på en annan position eller ruta medan panelen är öppen byter direkt till den.
function open(p) {
  if (selected && selected.kind === p.kind && selected.id === p.id) return;
  closePanel();
  selected = p;
  panel = p.kind === 'slot' ? slotPanel(uiRoot, p.id, sim, actions) : cellPanel(uiRoot, p.id, sim, actions);
  placePanel();
}

const picker = createPicker(camera, renderer.domElement, () => view.rayTargets(), (x, z) => {
  const i = cellAt(sim.map, x, z);
  return i == null ? null : { kind: 'cell', id: i };
});
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
const camHome = camera.position.clone();
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
  camera.position.set(camHome.x + (Math.random() - 0.5) * 2 * a, camHome.y, camHome.z + (Math.random() - 0.5) * 2 * a);
  if (shakeT === 0) camera.position.copy(camHome);
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
  if (mode !== 'play' || sim.phase !== 'wave') { hud.entry(null); return; }
  const alive = sim.zombies.filter(z => !z.dead);
  if (!alive.length && !sim.spawnQueue.length) { hud.entry(null); return; }
  const seen = alive.some(z => { const p = zombiePos(sim, z); return onScreen(p.x, p.z, 10).in; });
  if (seen) { hud.entry(null); return; }
  entryAt = entryAt || findEntry();
  hud.entry(entryAt);
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
    onDay: n => startDay(n),
    onResearch: () => showResearch('menu'),
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
  entryAt = null; shakeT = 0; camera.position.copy(camHome);
  hinting = n === 1 && !progress.seenHint;
  setMode('intro', () => dayIntro(uiRoot, map.days[n - 1], cfg.cash, () => setMode('play')));
}
function finishDay() {
  const won = sim.phase === 'won';
  progress = dayResult(progress, { day, won, intelEarned: sim.intelEarned });
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
if (new URLSearchParams(location.search).has('debug')) window.__horde = { get sim() { return sim; }, get progress() { return progress; }, get mode() { return mode; }, get selected() { return selected; }, view, renderer, scene, camera };
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
  shakeCamera(frameDt);
  view.setUi({ selected, hover: hovered, range: panelRange || rangeFor(hovered) || rangeFor(selected) });
  view.sync(frameDt);
  updateWorld(frameDt, time);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
