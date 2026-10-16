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
import { gunPanel, cellPanel, buildBar, reasonText, dayIntro, dayResultPanel, researchPanel, mainMenu, note } from './ui/panels.js';
import { shopItem } from './data/shop.js';
import { WEAPONS } from './data/weapons.js';
import { buyState } from './sim/buy.js';
import { newProgress, startConfig, dayResult, abandonDay, buyResearch, mapState, mapUnlocked, selectMap, hintSeen, markHintSeen, debugArrival } from './meta/progress.js';
import { loadProgress, saveProgress } from './meta/save.js';
import { createSim, startWave, step, build, upgrade, sell, placeAcross, removeObstacle, acrossCells, zombiePos, buyKit, callNextWave, checkSpot, sightFor, checkObstacle, onRoof, reinforce, squadPreview, squadRoom } from './sim/sim.js';
import { SQUAD, isSquad } from './sim/squad.js';
import { pointAt } from './sim/path.js';
import { weaponStats } from './sim/stats.js';
import { loadSettings, saveSettings, normalizeSettings, SPEEDS } from './meta/settings.js';
import { advance, escapeAction } from './sim/clock.js';
import { mountMenu } from './ui/menu.js';
import { createChord } from './ui/chord.js';
import { createAudio } from './audio/audio.js';
import { Vector3, Box3 } from 'three';

const DT = 1 / 30;
// Fart 1x, 2x, 3x (SPEEDS i settings.js): fler fasta steg per bildruta (simuleringen har samma dt),
// taket följer med. Farten sparas i inställningarna och följer med mellan dagarna.
const MAX_STEPS_PER_SPEED = 5;
const BASE_TOAST_GAP = 4;          // sekunder mellan två "Basen tar skada!"
const SHAKE_TIME = 0.35, SHAKE_AMP = 0.18;
const BLAST_SHAKE_TIME = 0.25, BLAST_SHAKE_AMP = 0.1;   // granatsmäll: kortare och svagare än basen
// ?debug: alla banor går att välja och window.__horde finns i konsolen.
const DEBUG = new URLSearchParams(location.search).has('debug');
// ?debug&fresh: ingen forskning läggs till (0.10.1); annars spelas en upplåst bana med forskningen en
// typisk spelare har när den kommer dit (src/data/arrival.js).
const FRESH = DEBUG && new URLSearchParams(location.search).has('fresh');
// Laddningsskydd (index.html): huvudfilen och version.js ska vara samma version. Skiljer de sig har en
// fil kommit ur cachen från en annan publicering.
{ const v = new URL(import.meta.url).searchParams.get('v'); if (v && v !== VERSION) window.__hordeStale?.(); }
let progress = loadProgress();
if (!mapUnlocked(progress, progress.mapId, { debug: DEBUG })) progress = selectMap(progress, 'riksvagen');
const renderer = createRenderer(document.getElementById('stage'));
document.getElementById('ver').textContent = 'v' + VERSION;
const uiRoot = document.getElementById('ui');
uiRoot.dataset.mode = 'menu';   // tills första banan är laddad: ingen HUD

// Banan: scen, kamera, värld, vy och hordens vägar. Varje bana byggs en gång och sparas
// (worlds): att byta tillbaka är då omedelbart, och shaderprogrammen ligger kvar.
// Bygget görs i steg bakom en laddningsskylt, och shaders kompileras i förväg
// (renderer.compileAsync), så att sidan inte fryser och första bildrutan inte hackar.
// Mätt 0.6.0 (docs/balance-log.md, Laddning): kartans CPU-del är under 0,15 s; nästan hela
// väntan var GPU:ns första bildruta (shaderprogram), som med mjukvaru-GL tar 20-30 s.
let map = null, stage = null, scene = null, camera = null, rig = null, view = null, routeLines = null;
let day = 1, sim = null;
const worlds = new Map();
const loading = document.createElement('div');
loading.id = 'loading'; loading.className = 'plate'; loading.hidden = true;
loading.innerHTML = '<div class="t">Loading</div><div class="bar"><i></i></div><div class="s"></div>';
uiRoot.appendChild(loading);
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
function showLoading(name, step, frac) {
  loading.hidden = false;
  loading.querySelector('.t').textContent = 'Loading ' + name;
  loading.querySelector('.s').textContent = step;
  loading.querySelector('.bar i').style.width = Math.round(frac * 100) + '%';
}
let loadingMap = null;
async function buildMapWorld(m) {
  showLoading(m.name, 'Laying out the streets', 0.1);
  await nextFrame(); await nextFrame();
  const t0 = performance.now();
  const st = createScene(null, m, { renderer });
  const w = { map: m, stage: st, scene: st.scene, camera: st.camera };
  buildWorld(w.scene, m);
  showLoading(m.name, 'Raising the houses', 0.45);
  await nextFrame();
  w.rig = createRig({ camera: w.camera, map: m, fill: st.fill, dom: renderer.domElement });
  w.rig.active = false;
  const d = Math.min(mapState(progress, m.id).unlockedDay, m.days.length);
  // Vakt: hittas ingen dag (konstig sparfil) byggs dag 1 i stället för att spelet kraschar.
  // Simuleringen ersätts ändå när spelaren väljer dag i menyn.
  w.sim = createSim(startConfig(progress, d, m.id) ?? startConfig(newProgress(), 1));
  w.day = d;
  w.view = createView(w.scene, w.sim);
  w.routeLines = createRouteLines(w.scene);
  const tBuild = performance.now() - t0;
  showLoading(m.name, 'Mixing the paint', 0.7);
  await nextFrame();
  const t1 = performance.now();
  // Shaderprogrammen kompileras parallellt (KHR_parallel_shader_compile) medan skylten står.
  try { await renderer.compileAsync(w.scene, w.camera); } catch { renderer.compile(w.scene, w.camera); }
  for (const tex of texturesOf(w.scene)) renderer.initTexture(tex);
  w.timing = { build: Math.round(tBuild), compile: Math.round(performance.now() - t1) };
  showLoading(m.name, 'Ready', 1);
  return w;
}
function texturesOf(sc) {
  const out = new Set();
  sc.traverse(o => { for (const mt of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) for (const v of Object.values(mt)) if (v && v.isTexture) out.add(v); });
  return out;
}
async function loadMap(id) {
  const m = MAPS[id] ?? MAPS.riksvagen;
  if (map && map.id === m.id) return;
  if (loadingMap) return loadingMap;
  loadingMap = (async () => {
    let w = worlds.get(m.id);
    if (!w) { w = await buildMapWorld(m); worlds.set(m.id, w); }
    if (rig) rig.active = false;
    map = w.map; stage = w.stage; scene = w.scene; camera = w.camera; rig = w.rig; view = w.view; routeLines = w.routeLines;
    day = Math.min(mapState(progress, map.id).unlockedDay, map.days.length);
    sim = createSim(startConfig(progress, day, map.id) ?? startConfig(newProgress(), 1));
    view.setSim(sim);
    stage.resize(); rig.apply(); rig.goHome();
    routeKeys.now = routeKeys.preview = null;
    sightCache.clear();
    // en bildruta med den nya banan innan skylten tas bort
    await nextFrame();
    loading.hidden = true;
  })();
  try { await loadingMap; } finally { loadingMap = null; }
}
const routeKeys = { now: null, preview: null };

const hud = mountHud(uiRoot, { onStart: () => go(), onSpeed: () => toggleSpeed(), onNext: () => go({ stack: true }) });
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

// ---------- köp och placering (H037) ----------
// Ett enda köpflöde: välj först VAD du köper (kort i köpraden eller siffertangent), sedan VAR.
// Saken följer pekaren som ett spöke: vapen står på mark bredvid vägen (grönt där pjäsen får
// stå, med sikten), hinder ligger på vägen (hela gatans bredd på Gnesta, med hordens nya väg).
// Klick ställer ut; med Shift nedtryckt stannar saken i handen så att flera kan ställas ut.
// Esc eller högerklick släpper den. Det som inte har råd eller är låst går inte att ta upp: kortet
// skakar. Klick på något som redan står ute (pjäs, barrikad, tråd) öppnar dess panel.
let placing = null;          // { type, kind: 'gun' | 'obstacle' } medan något är i handen
let placedAt = -Infinity;    // när något senast ställdes ut och släpptes ur handen (H095)
const JUST_PLACED_MS = 1200;
const chord = createChord();
let spot = null;             // under pekaren: { key, x, z, ok, reason }
const sightCache = new Map();  // 'typ:ruta' -> synliga rutor (för spöket; byggs om per dag)
const pointer = { x: 0, y: 0 };
let shiftHeld = false;
const ghostTip = document.createElement('div');
ghostTip.id = 'ghosttip'; ghostTip.className = 'plate'; ghostTip.hidden = true;
uiRoot.appendChild(ghostTip);
const canPlaceNow = () => mode === 'play' && (sim.phase === 'build' || sim.phase === 'wave');
function startPlacing(type) {
  if (!canPlaceNow()) return;
  if (placing?.type === type) { stopPlacing(); return; }
  if (buyState(sim, type).state !== 'ok') { bar.shake(type); audio.ui('deny'); return; }
  closePanel();
  audio.ui('pick');
  placing = { type, kind: shopItem(type).kind };
  spot = null;
  hovered = null;
}
function stopPlacing() {
  placing = null; spot = null;
  ghostTip.hidden = true;
  // H095: "On the road" och de andra skälen från placeringen ligger inte kvar när den är slut
  for (const n of uiRoot.querySelectorAll('.note.place')) n.remove();
}
// Rutan under pekaren för det som är i handen. Vapen: placeringsrutnätet. Hinder: vägens rutor.
function spotFor(key) {
  if (placing?.kind === 'obstacle') {
    if (key == null || key < 0) return { key: -1, ok: false, reason: 'ingen gata' };
    const c = sim.route.cellCenter(key), check = checkObstacle(sim, key, placing.type);
    return { key, x: c.x, z: c.z, ok: check.ok, reason: check.reason };
  }
  if (key == null || key < 0) return { key: -1, ok: false, reason: 'utanför' };
  const c = sim.place.center(key), check = checkSpot(sim, key, placing?.type);
  const roof = onRoof(sim, key, placing?.type);
  return { key, x: c.x, z: c.z, y: roof ? sim.place.roof[key] : 0, roof, ok: check.ok, reason: check.reason };
}
function placeHere(key) {
  const sp = spotFor(key);
  if (!sp.ok) { note(uiRoot, reasonText(sp.reason), 'warn place'); audio.ui('deny'); return; }
  const type = placing.type;
  const r = placing.kind === 'obstacle' ? actions.place(key, type) : actions.build(key, type);
  if (!r.ok) { note(uiRoot, reasonText(r.reason), 'warn place'); return; }
  // Shift: kvar i handen så länge det finns råd till en till.
  // H095: ett Esc strax efter köpet gäller saken som just släpptes, inte pausmenyn.
  if (!shiftHeld || buyState(sim, type).state !== 'ok') { stopPlacing(); placedAt = performance.now(); }
  else spot = spotFor(key);
}
function sightOf(type, key) {
  const k = type + ':' + key;
  if (!sightCache.has(k)) sightCache.set(k, sightFor(sim, key, type));
  return sightCache.get(k);
}
// Hindrets rutor och vridning (som view.js ställer hindren): spöket i handen.
function obstacleCells(key, type) {
  const grid = sim.route.kind === 'grid';
  const keys = grid ? sim.route.span(key).filter(k => !sim.obstacles[k]) : [key];
  return keys.map(k => {
    const c = sim.route.cellCenter(k);
    return { x: c.x, z: c.z, ry: grid ? (sim.route.axis(k) === 'x' ? 0 : Math.PI / 2) : Math.atan2(c.dirZ, -c.dirX), key: k, type };
  });
}
// Spöket, räckvidden och sikten för det som är i handen, eller för pjäsen som är vald eller pekas på.
function placementUi() {
  if (placing?.kind === 'obstacle') {
    if (!spot || spot.key < 0) return { ghost: null, cover: null, range: null, obGhost: null };
    const cells = obstacleCells(spot.key, placing.type);
    return { ghost: null, cover: null, range: null, obGhost: { type: placing.type, cells, ok: spot.ok }, tiles: { cells: cells.map(c => c.key), tone: spot.ok ? 'ok' : 'bad' } };
  }
  if (placing && isSquad(placing.type)) {
    // Hemvärnet: markeringens ring, var soldaterna skulle ta skydd och vad de tillsammans ser
    if (!spot || spot.key < 0) return { ghost: null, cover: null, range: null };
    const men = spot.ok ? squadPreview(sim, spot.key, placing.type) : [];
    const r = weaponStats(placing.type, 1, sim.research).range;
    return {
      ghost: { type: placing.type, x: spot.x, y: 0, z: spot.z, ok: spot.ok, men },
      range: null,
      cover: { id: 'p' + spot.key + placing.type, x: spot.x, z: spot.z, r: 1e9, keys: squadKeys(men, r), tone: spot.ok ? 'ok' : 'bad' },
    };
  }
  if (placing) {
    if (!spot || spot.key < 0) return { ghost: null, cover: null, range: null };
    const r = weaponStats(placing.type, 1, sim.research).range;
    return {
      ghost: { type: placing.type, x: spot.x, y: spot.y, z: spot.z, roof: spot.roof, ok: spot.ok },
      range: { x: spot.x, z: spot.z, r },
      cover: { id: 'p' + spot.key + placing.type, x: spot.x, z: spot.z, r, keys: sightOf(placing.type, spot.key).keys, tone: spot.ok ? 'ok' : 'bad' },
    };
  }
  const at = selected?.kind === 'gun' ? selected : hovered?.kind === 'gun' ? hovered : null;
  const g = at && sim.guns.find(x => x.id === at.id);
  if (!g) return { ghost: null, cover: null, range: null };
  const rng = (at === selected && panelRange) || rangeFor(at);
  if (g.squad) {
    // gruppens samlade sikt: varje soldats egna rutor inom gevärets räckvidd (stupade ser inget)
    const r = weaponStats(g.weapon.type, g.weapon.level, sim.research).range;
    const men = g.soldiers.filter(s => !s.down);
    return { ghost: null, range: rng, squadRange: r, cover: { id: g.id + ':' + g.weapon.level + ':' + men.length, x: g.x, z: g.z, r: 1e9, keys: squadKeys(men, r), tone: 'paper' } };
  }
  return { ghost: null, range: rng, cover: { id: g.id, x: g.x, z: g.z, r: rng.r, keys: g.sight.keys, tone: 'paper' } };
}
// Rutorna en grupp ser tillsammans: varje soldats synliga rutor inom räckvidden från honom.
function squadKeys(men, r) {
  const p = sim.place, reach = r + p.size * 0.7072, out = new Set();
  for (const s of men) for (const k of s.sight.keys) {
    if (out.has(k)) continue;
    const q = p.center(k);
    if (Math.hypot(q.x - s.x, q.z - s.z) <= reach) out.add(k);
  }
  return [...out];
}
function updateGhostTip() {
  const show = placing && spot && !spot.ok;
  ghostTip.hidden = !show;
  if (!show) return;
  const t = reasonText(spot.reason);
  if (ghostTip.textContent !== t) ghostTip.textContent = t;
  ghostTip.style.left = pointer.x + 'px'; ghostTip.style.top = pointer.y + 'px';
}
renderer.domElement.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; shiftHeld = e.shiftKey; });
renderer.domElement.addEventListener('pointerdown', e => { shiftHeld = e.shiftKey; }, true);
renderer.domElement.addEventListener('pointerleave', () => { ghostTip.hidden = true; spot = null; });
renderer.domElement.addEventListener('contextmenu', e => { if (placing) { e.preventDefault(); stopPlacing(); } });
// Varje handling visar sin egen ändring av pengarna under kassan, exakt det beloppet,
// och låter: ett klick när den gick igenom, en nekande ton när den inte gjorde det.
const withCash = (sound, fn) => (...args) => {
  const before = sim.cash;
  const r = fn(...args);
  if (r.ok && sim.cash !== before) hud.cashDelta(Math.round(sim.cash) - Math.round(before));
  audio.ui(r.ok ? sound : 'deny');
  return r;
};
const actions = {
  build: withCash('place', (id, type) => build(sim, id, type)),
  upgrade: withCash('click', id => upgrade(sim, id)),
  sell: withCash('click', id => sell(sim, id)),
  kit: withCash('click', id => buyKit(sim, id)),
  reinforce: withCash('click', id => reinforce(sim, id)),
  squadRoom: id => squadRoom(sim, id),
  pick: type => { chord.reset(); startPlacing(type); },
  // Gnesta: spärren läggs tvärs över gatan (E4: bara rutan).
  place: withCash('place', (cell, type) => placeAcross(sim, cell, type)),
  remove: withCash('click', cell => removeObstacle(sim, cell)),
  range: r => { panelRange = r; },
  close: closePanel,
};
// Klick på en annan position eller ruta medan panelen är öppen byter direkt till den.
function open(p) {
  if (selected && selected.kind === p.kind && selected.id === p.id) return;
  closePanel();
  selected = p;
  panel = p.kind === 'gun' ? gunPanel(uiRoot, p.id, sim, actions) : cellPanel(uiRoot, p.id, sim, actions);
  placePanel();
}

// Ett vapen som får ligga på tak (Psg 90): taket som strålen träffar först. Strålen stegas
// nedåt i höjd; första rutan vars tak ligger i höjd med strålen är taket under pekaren.
const ray3 = new Vector3();
function roofUnder(ray) {
  const p = sim.place;
  if (!ray || !p.roof || !WEAPONS[placing?.type]?.roof || ray.direction.y >= 0) return null;
  for (let h = 9; h > 0.5; h -= 0.25) {
    ray3.copy(ray.direction).multiplyScalar((h - ray.origin.y) / ray.direction.y).add(ray.origin);
    const k = p.keyAt(ray3.x, ray3.z);
    if (k >= 0 && p.roof[k] >= h - 0.2) return k;
  }
  return null;
}
// Med något i handen svarar bara marken (rutan under pekaren). Annars pjäserna och hindren som
// står ute; en tom gata öppnar ingenting (köp sker från köpraden).
const picker = createPicker(() => camera, renderer.domElement, () => (placing ? [] : view.rayTargets()), (x, z, ray) => {
  if (placing?.kind === 'obstacle') { const i = sim.route.cellAt(x, z); return { kind: 'spot', id: i == null || !sim.route.validCell(i) ? -1 : i }; }
  if (placing) return { kind: 'spot', id: roofUnder(ray) ?? sim.place.keyAt(x, z) };
  const i = sim.route.cellAt(x, z);
  return i == null || !sim.route.validCell(i) || !sim.obstacles[i] ? null : { kind: 'cell', id: i };
}, { ignoreClick: () => rig.takeDrag() });
picker.onPick(p => {
  if (mode !== 'play' || sim.phase === 'won' || sim.phase === 'lost') return;
  if (placing) { if (p?.kind === 'spot') placeHere(p.id); return; }
  if (p) open(p); else closePanel();
});
picker.onHover(p => {
  hovered = mode === 'play' ? p : null;
  if (placing) spot = p?.kind === 'spot' ? spotFor(p.id) : null;
});
const bar = buildBar(uiRoot, actions);
// Klick utanför panelen (men inte i scenen, den sköts av plockaren) stänger den.
document.addEventListener('pointerdown', e => {
  if (!panel || panel.el.contains(e.target) || e.target === renderer.domElement) return;
  closePanel();
});

// En enda väg för händelser: efter varje step och efter startWave/callNextWave.
function handleEvents() {
  const evs = sim.events;
  view.consume(evs);
  audio.consume(evs, sim, toScreen);
  if (evs.some(e => e.t === 'breach')) onBreach();
  // 0.10.2 (speltestet av 0.10.1: "Next wave in 22s" med 40 kvar förklarades inte): första gången
  // nästa våg räknas ned medan den här fortfarande går, på en bana med överlapp, en rad om det.
  const ovKey = 'overlap-' + map.id;
  if (sim.dayCfg.overlap != null && sim.phase === 'wave' && sim.nextWaveIn != null && !hintSeen(progress, ovKey)) {
    note(uiRoot, 'Waves overlap here. Keep the line.');
    progress = markHintSeen(progress, ovKey); save();
  }
  // Granattillsatsens små smällar skakar inte bilden, bara granatlådans.
  if (evs.some(e => e.t === 'blast' && e.kind !== 'grt')) shake(BLAST_SHAKE_TIME, BLAST_SHAKE_AMP);
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
// i en våg). Tidigt kall ger bonus, som visas under kassan. Mitt i en våg staplar bara ett
// uttryckligt klick på knappen eller Shift+Space (stack); mellanslaget ensamt gör då ingenting.
function go({ stack = false } = {}) {
  if (mode !== 'play') return;
  if (sim.phase === 'build' && sim.nextWaveIn == null) {
    if (!startWave(sim)) return;
  } else {
    if (!callNextWave(sim, { stack }).ok) return;
  }
  handleEvents();
}

// ---------- ljud ----------
// Ljudet startar vid första klick eller tangent (webbläsarnas regel). Det läser händelserna och
// läget, aldrig tvärtom (src/audio/audio.js).
let settings = loadSettings();
const audio = createAudio({ settings });
audio.attach(window);
const tmpS = new Vector3();
function toScreen(x, z) {
  tmpS.set(x, 0, z).project(camera);
  return { sx: (tmpS.x + 1) / 2 * innerWidth, sy: (1 - tmpS.y) / 2 * innerHeight };
}
let lastVolTick = 0;

// ---------- fart ----------
let speed = settings.speed;
hud.setSpeed(speed);
// F och knappen stegar 1x, 2x, 3x och runt. Gäller under vågen och nedräkningen. Sparas.
const canSpeed = () => mode === 'play' && (sim.phase === 'wave' || sim.phase === 'build');
function setSpeed(n) {
  if (!canSpeed() || !SPEEDS.includes(n)) return;
  speed = n;
  hud.setSpeed(speed);
  if (settings.speed !== n) { settings = normalizeSettings({ ...settings, speed: n }); saveSettings(settings); }
}
function toggleSpeed() {
  if (menu.isOpen()) return;
  setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]);
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
  // Pausad (dt 0): kameran står still bakom menyn och skakar vidare när spelet fortsätter.
  if (shakeT <= 0 || dt <= 0) return;
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

// Ingångarna som används nu (0.10.2, speltestet av 0.10.1: båda "They come from here" pekade österut
// medan första gruppen kom söderifrån, och dagens alla ingångar visades). Före en våg: den vågens
// ingångar. Under en våg: de som har zombier kvar att släppa eller på väg, och med överlapp nästa
// vågs. next: ingången som nästa grupp kommer från. Ordning: banans.
function activeSpawns() {
  const first = sim.route.spawns[0]?.id, waves = sim.dayCfg.waves;
  const ids = new Set();
  let next = null;
  const firstOf = w => [...w.groups].sort((a, b) => a.delay - b.delay)[0];
  if (sim.phase === 'build') {
    const w = waves[sim.wavesStarted];
    if (w) { for (const g of w.groups) ids.add(g.spawn ?? first); next = firstOf(w).spawn ?? first; }
  } else if (sim.phase === 'wave') {
    for (const q of sim.spawnQueue) ids.add(q.spawn ?? first);
    for (const z of sim.zombies) if (!z.dead) ids.add(z.spawn);
    if (sim.spawnQueue.length) next = sim.spawnQueue[0].spawn ?? first;
    const w = sim.nextWaveIn != null && waves[sim.wavesStarted];
    if (w) { for (const g of w.groups) ids.add(g.spawn ?? first); next ??= firstOf(w).spawn ?? first; }
  }
  return { ids: sim.route.spawns.map(s => s.id).filter(id => ids.has(id)), next };
}
const spawnName = id => sim.map.spawns?.find(s => s.id === id)?.name ?? id;
// Vad som kommer från varje ingång (0.11.0, H090): "30 walkers", "50 runners". Före en våg (bygget
// och nedräkningen): hela vågens grupper. Under vågen: de som ännu inte släppts, och med överlapp
// nästa vågs grupper. Map ingång -> [[typ, antal], ...] i gruppernas ordning.
const PLURAL = { walker: 'walkers', runner: 'runners', brute: 'brutes' };
const countText = ([type, n]) => `${n} ${n === 1 ? type : PLURAL[type] ?? type}`;
function comingBySpawn() {
  const first = sim.route.spawns[0]?.id, out = new Map();
  const add = (id, type, n) => {
    if (!out.has(id)) out.set(id, new Map());
    const m = out.get(id); m.set(type, (m.get(type) ?? 0) + n);
  };
  const waves = sim.dayCfg.waves;
  if (sim.phase === 'build') {
    for (const g of waves[sim.wavesStarted]?.groups ?? []) add(g.spawn ?? first, g.type, g.count);
  } else if (sim.phase === 'wave') {
    for (const q of sim.spawnQueue) add(q.spawn ?? first, q.type, 1);
    const w = sim.nextWaveIn != null && waves[sim.wavesStarted];
    if (w) for (const g of w.groups) add(g.spawn ?? first, g.type, g.count);
  }
  return new Map([...out].map(([id, m]) => [id, [...m]]));
}
// Gnesta: en etikett per ingång som används nu, på gatan (H091): på första punkten längs hordens väg
// från ingången där etiketten ryms i bild utan att täcka gränssnittet (hud.js väljer bland
// kandidaterna). Ingången själv om den syns, annars där vägen kommer in i bild. Syns vägen inte alls:
// vid kanten på linjen från mitten mot ingången. Under vågen bara för ingångar vars zombier inte
// syns än, och för den som nästa grupp kommer från.
function gridEntries() {
  const out = [], wave = sim.phase === 'wave';
  if (!wave && sim.phase !== 'build') return out;
  const { ids, next } = activeSpawns();
  const coming = comingBySpawn();
  const cx = innerWidth / 2, cy = innerHeight / 2;
  for (const id of ids) {
    const isNext = id === next;
    if (wave) {
      const pending = sim.spawnQueue.some(q => (q.spawn ?? sim.route.spawns[0].id) === id);
      const alive = sim.zombies.filter(z => !z.dead && z.spawn === id);
      const seen = alive.some(z => onScreen(z.x, z.z, 10).in);
      if (!isNext && (seen || (!pending && !alive.length))) continue;
      if (isNext && !pending && seen) continue;
    }
    const counts = coming.get(id) ?? [];
    const lines = counts.length ? counts.map(countText) : ['Horde incoming'];
    const cells = sim.route.paths([id])[0]?.cells ?? [];
    const cands = [];
    for (let i = 0; i < cells.length && cands.length < 48; i += 2) {
      const c = sim.route.cellCenter(cells[i]), s = onScreen(c.x, c.z, 0);
      if (!s.in) continue;
      const t = sim.route.cellCenter(cells[Math.min(i + 3, cells.length - 1)]), u = onScreen(t.x, t.z);
      cands.push({ x: s.sx, y: s.sy, angle: Math.atan2(u.sy - s.sy, u.sx - s.sx) + Math.PI });
    }
    const sp = sim.route.spawns.find(q => q.id === id), s = onScreen(sp.x, sp.z, EDGE);
    const dx = s.sx - cx, dy = s.sy - cy;
    const half = dy < 0 ? cy - 110 : cy - 120;
    const k = Math.min(Math.abs((cx - EDGE) / (dx || 1e-6)), Math.abs(half / (dy || 1e-6)));
    const fallback = { x: cx + dx * k, y: cy + dy * k, angle: Math.atan2(-dy, -dx) + Math.PI };
    out.push({ cands, fallback, lines, sub: spawnName(id), next: isNext });
  }
  return out;
}

// Hordens väg på Gnesta: rostfärgade pilar (chevroner) som flyter mot basen för vägen som gäller nu
// (0.10.2: de vita strecken såg ut som vägmarkering), och en orange streckad förhandsvisning när
// pekaren står på en gata (eller en ruta är vald): så går de om du spärrar här.
const cellWorld = k => { const c = sim.route.cellCenter(k); return [c.x, c.z]; };
let nowPaths = null;
// 0.10.1 (speltestet: "när barrikaden står där är vägen borta"): vägen som gäller nu ligger kvar hela
// dagen från varje ingång som dagen använder, tydligare än förut. R slår av och på den.
let showRoute = true;
function updateRoutes() {
  const grid = sim.route.kind === 'grid' && mode === 'play' && (sim.phase === 'build' || sim.phase === 'wave');
  if (!grid) { routeLines.set('now', null); routeLines.set('preview', null); return null; }
  // 0.10.2: från varje ingång som används nu (activeSpawns), som pilarna
  const ids = activeSpawns().ids;
  const obsKey = Object.keys(sim.obstacles).join(',');
  const nowKey = obsKey + '|' + ids.join(',');
  if (routeKeys.now !== nowKey) { routeKeys.now = nowKey; nowPaths = sim.route.paths(ids); }
  routeLines.set('now', showRoute ? nowPaths.map(p => p.cells.map(cellWorld)) : null, nowKey);
  // 0.11.0 (H090): före vågen är vägarna förhandsvisningen spelaren bygger efter, så de lyser starkare
  routeLines.strength(sim.phase === 'build' ? 1 : 0.6);
  // Förhandsvisningen: hindret i handen (så går de om du lägger det här), eller ett utlagt hinder
  // som pekas på eller är valt (så går de om du river det).
  const holding = placing?.kind === 'obstacle' && spot && spot.key >= 0;
  const at = holding ? spot.key : hovered?.kind === 'cell' ? hovered.id : selected?.kind === 'cell' ? selected.id : null;
  if (at == null || (!holding && !sim.obstacles[at])) { routeLines.set('preview', null); return null; }
  const ob = holding ? null : sim.obstacles[at];
  const type = holding ? placing.type : 'block';
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
  if (e.key === 'Escape') {
    // Esc: stäng menyn, annars forskningen, placeringen eller panelen, och först sist öppna menyn.
    e.preventDefault();
    const what = escapeAction({ menuOpen: menu.isOpen(), mode, placing: !!placing, panel: !!panel, selected: !!selected, repeat: e.repeat,
      category: chord.open != null, justPlaced: performance.now() - placedAt < JUST_PLACED_MS });
    if (what === 'close-category') chord.escape();
    else if (what === 'menu-back') menu.back();
    else if (what === 'close-research') sheetAction('close');
    else if (what === 'cancel-placing') stopPlacing();
    else if (what === 'close-panel') { closePanel(); hovered = null; }
    else if (what === 'open-menu') menu.show();
    return;
  }
  // Medan menyn är öppen gör spelets tangenter ingenting.
  if (menu.isOpen()) { if (e.code === 'Space') e.preventDefault(); return; }
  // 0.11.0: tvåstegsval, kategori och sedan sak ("2" "1" = Ksp 90), src/ui/chord.js
  if (mode === 'play' && /^(Digit|Numpad)[0-9]$/.test(e.code) && !e.repeat && !e.metaKey && !e.ctrlKey && canPlaceNow()) {
    const r = chord.press(Number(e.code.slice(-1)), performance.now() / 1000);
    if (r.t === 'pick') startPlacing(r.id);
    else if (r.t === 'category' || r.t === 'close') audio.ui('click');
  }
  if (e.key === 'Enter' && mode === 'intro' && !e.repeat) { e.preventDefault(); sheetAction('go'); }
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) go({ stack: e.shiftKey }); }
  if (e.key === 'Shift') { hud.shift(true); shiftHeld = true; }
  if (e.code === 'KeyF' && !e.repeat && !e.metaKey && !e.ctrlKey) toggleSpeed();
  if (e.code === 'KeyR' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play' && sim.route.kind === 'grid') {
    showRoute = !showRoute;
    note(uiRoot, showRoute ? 'Horde route shown (R)' : 'Horde route hidden (R)');
    hud.routeKey(true, showRoute);
  }
}, true);
addEventListener('keyup', e => { if (e.code === 'Space') e.preventDefault(); if (e.key === 'Shift') { hud.shift(false); shiftHeld = false; } }, true);
addEventListener('blur', () => { hud.shift(false); shiftHeld = false; });

// ---------- dagcykeln ----------
let mode = 'menu';
let sheet = null;            // skylten som visas (meny, intro, resultat, forskning)
let lastResult = null;       // det som resultatskylten visar, för att komma tillbaka från forskning
let researchFrom = 'menu';
let hinting = false;         // stegen för första dagen visas
let hintDone = 0;
let warnedSave = false;

function save() {
  if (saveProgress(progress) || warnedSave) return;
  warnedSave = true;
  note(uiRoot, 'Could not save.');
}
function setMode(m, makeSheet) {
  if (sheet) sheet.close();
  closePanel();
  stopPlacing();
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
    onMap: id => { progress = selectMap(progress, id); save(); loadMap(id).then(() => { hud.reset(); showMenu(); }); },
  }));
}
function startDay(n) {
  const cfg = startConfig(DEBUG ? debugArrival(progress, map.id, { fresh: FRESH }) : progress, n);
  if (!cfg) { showMenu(); return; }
  day = n;
  sim = createSim(cfg);
  sightCache.clear();
  view.setSim(sim);
  hud.reset();
  hud.setSpeed(speed);
  entryAt = null; shakeT = 0; rig.setShake(0, 0); rig.goHome();
  const frame = dayFrame();
  if (frame) rig.focus(frame.x, frame.z, frame.view);
  hinting = n === 1 && !hintSeen(progress, map.id) && !!map.days[0].hints; hintDone = 0;
  setMode('intro', () => dayIntro(uiRoot, map.days[n - 1], cfg.cash, () => { setMode('play'); introPan(frame); }));
}
// Kameran när dagen börjar (0.10.1, speltestet: "var basen ligger syns inte"): ishallens entré och
// vägen dit från dagens första ingång i bild, så långt zoomen räcker (högst 120 m av vägen).
function dayFrame() {
  if (sim.route.kind !== 'grid') return null;
  const first = sim.dayCfg.waves[0].groups[0].spawn ?? sim.route.spawns[0].id;
  const cells = sim.route.paths([first])[0]?.cells ?? [];
  if (!cells.length) return null;
  const k = Math.max(0, cells.length - 1 - Math.round(120 / sim.route.grid.size));
  const p = sim.route.cellCenter(cells[k]), b = sim.route.base;
  return rig.fit([[b.x, b.z], [p.x, p.z]]);
}
// Gnesta Norr (map.camera.intro): ett kort svep från ingången i norr ner till basen när spelaren
// går till linjen. Klick, hjul eller tangent hoppar över.
function introPan(frame) {
  if (!frame || !map.camera.intro) return;
  const first = sim.dayCfg.waves[0].groups[0].spawn ?? sim.route.spawns[0].id;
  const sp = sim.route.spawns.find(q => q.id === first);
  if (!sp) return;
  rig.tour({ x: sp.x, z: sp.z, view: 40 }, frame, map.camera.intro);
}
// Första dagens steg: bockas av i tur och ordning (ett senare steg som är gjort bockar av de
// före). När alla är gjorda försvinner rutan och banan minns att tipsen är visade.
function hintStepDone(st) {
  if (st.startsWith('pick:')) return placing?.type === st.slice(5);
  if (st === 'gun') return sim.guns.length > 0;
  if (st === 'block') return Object.values(sim.obstacles).some(o => o.type === 'block');
  if (st === 'wave') return sim.wavesStarted > 0;
  if (st === 'watch') return sim.waveIndex > 0;
  return false;
}
function updateHint() {
  const h = hinting && mode === 'play' ? map.days[day - 1]?.hints : null;
  if (!h) { hud.hint(null); return; }
  for (let i = h.steps.length - 1; i >= hintDone; i--) if (hintStepDone(h.steps[i])) { hintDone = i + 1; break; }
  if (hintDone >= h.steps.length) { hinting = false; progress = markHintSeen(progress, map.id); save(); hud.hint(null); return; }
  hud.hint(hintDone, h.lines);
}
function finishDay() {
  const won = sim.phase === 'won';
  progress = dayResult(progress, { day, won, intelEarned: sim.intelEarned, mapId: map.id });
  save();
  lastResult = {
    won, day, intelEarned: sim.intelEarned, lesson: sim.lesson ?? 0, kills: sim.kills,
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
  if (!p || p.kind !== 'gun') return null;
  const g = sim.guns.find(x => x.id === p.id);
  if (!g) return null;
  // Hemvärnet: markeringens ring (gruppens område); sikten visas som rutor och linjer
  if (g.squad) return { x: g.x, z: g.z, r: SQUAD.radius };
  return { x: g.x, z: g.z, r: weaponStats(g.weapon.type, g.weapon.level, sim.research).range };
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
  for (const sel of ['#day', '#res', '#hint', '#buildbar', '#go', '#wavebar', '#speedcd']) {
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
if (DEBUG) window.__horde = { get worlds() { return worlds; }, get speed() { return speed; }, setSpeed, get routeLines() { return routeLines; }, get placing() { return placing; }, get spot() { return spot; }, startPlacing, stopPlacing, placeHere, get sim() { return sim; }, get progress() { return progress; }, get mode() { return mode; }, get selected() { return selected; }, get hovered() { return hovered; }, set hovered(v) { hovered = v; }, get view() { return view; }, audio, get rig() { return rig; }, get scene() { return scene; }, get camera() { return camera; }, renderer, actions, go, startDay, setMode, loadMap, toggleSpeed, sheetAction,
  // simuleringen framåt utan att vänta (prov och skärmbilder); vyn ritas i nästa bildruta
  advance(secs) { for (let t = 0; t < secs / DT && mode === 'play' && (sim.phase === 'wave' || sim.phase === 'build'); t++) { step(sim, DT); handleEvents(); } } };

// ---------- spelmenyn och paus ----------
// Medan menyn är öppen går ingen tid i spelet (se tick). Scenen ritas ändå, så dammet rör sig.
// Restart day och Main menu mitt i en dag räknar försöket (ny seed, som efter Try again).
function abandon() {
  if (mode !== 'play') return;
  progress = abandonDay(progress, { day, mapId: map.id });
  save();
}
const menu = mountMenu(uiRoot, {
  mode: () => mode, day: () => day, speed: () => speed, canSpeed, setSpeed,
  resume: () => {}, restart: () => { abandon(); startDay(day); }, toMain: () => { abandon(); showMenu(); },
  settings: () => settings,
  setSetting: (k, v) => {
    settings = normalizeSettings({ ...settings, [k]: v }); saveSettings(settings);
    audio.setSettings(settings);
    // Ljudreglaget hörs medan man drar i det (gränssnittets ljud går igenom pausen).
    if (k === 'sound' || k === 'soundMuted') { const t = performance.now(); if (t - lastVolTick > 120) { lastVolTick = t; audio.ui('click'); } }
  },
  // Öppnandet avbryter placering och panel: inget ska hänga kvar när spelet fortsätter.
  onOpen: () => { stopPlacing(); closePanel(); hovered = null; },
  onClose: () => {},
});
loadMap(progress.mapId).then(() => showMenu());

let last = performance.now(), time = 0;
const clock = { acc: 0 };
function tick(now) {
  const frameDt = Math.min((now - last) / 1000, 0.1);
  last = now; time += frameDt;
  if (!scene || !sim) { requestAnimationFrame(tick); return; }   // första banan laddas

  // Fart bara när tiden går i simuleringen (våg eller nedräkning), inte före första vågen.
  const running = sim.phase === 'wave' || (sim.phase === 'build' && sim.nextWaveIn != null);
  const paused = menu.isOpen();
  advance(clock, frameDt, { playing: mode === 'play', paused, mul: running ? speed : 1, dt: DT, maxPerSpeed: MAX_STEPS_PER_SPEED }, () => { step(sim, DT); handleEvents(); });
  if (mode === 'play' && (sim.phase === 'won' || sim.phase === 'lost')) finishDay();
  if (placing && (!canPlaceNow() || buyState(sim, placing.type).state === 'locked')) stopPlacing();
  updateHint();
  if (!canPlaceNow()) chord.reset();
  bar.update(sim, placing?.type, canPlaceNow(), chord.open, chord.armed(performance.now() / 1000));
  updateGhostTip();

  if (panel) panel.update(sim);
  hud.update(sim);
  hud.routeKey(mode === 'play' && sim.route.kind === 'grid' && (sim.phase === 'build' || sim.phase === 'wave'), showRoute);
  updateEntry();
  rig.active = mode === 'play' && !paused;
  const vdt = paused ? 0 : frameDt;   // pausad: zombier, effekter och skak står stilla
  rig.update(vdt);
  shakeCamera(vdt);
  const tiles = updateRoutes();
  routeLines.update(vdt);
  const pu = placementUi();
  view.setUi({ selected, hover: placing ? (placing.kind === 'obstacle' && spot?.key >= 0 ? { kind: 'cell', id: spot.key } : null) : hovered,
    range: pu.range || panelRange || rangeFor(hovered) || rangeFor(selected), tiles: pu.tiles || (placing ? null : tiles),
    ghost: pu.ghost, cover: pu.cover, obGhost: pu.obGhost, marks: placing?.kind === 'obstacle', squadRange: pu.squadRange ?? null });
  view.sync(vdt);
  audio.update(frameDt, sim, { paused, mode, mapId: map.id, speed: running ? speed : 1, toScreen, zombiePos: z => zombiePos(sim, z) });
  updateWorld(frameDt, time);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.__hordeReady = true;   // laddningsskyddet i index.html: från nu är vanliga fel inte cachefel
