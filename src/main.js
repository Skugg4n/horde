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
import { barricadeId, BARRICADE_FAILING, gunCount, createSim, startWave, step, build, upgrade, sell, placeAcross, removeObstacle, acrossCells, zombiePos, buyKit, callNextWave, checkSpot, sightFor, checkObstacle, onRoof, reinforce, squadPreview, squadRoom, moveGun, checkMove, movePreview } from './sim/sim.js';
import { SQUAD, isSquad } from './sim/squad.js';
import { snapGun, snapObstacle, snapRoof } from './sim/snap.js';
import { KIND } from './sim/placement.js';
import { pointAt } from './sim/path.js';
import { weaponStats, upgradeCost } from './sim/stats.js';
import { loadSettings, saveSettings, normalizeSettings, SPEEDS } from './meta/settings.js';
import { advance, escapeAction } from './sim/clock.js';
import { mountMenu } from './ui/menu.js';
import { createChord } from './ui/chord.js';
import { createMinimap } from './ui/minimap.js';
import { createAudio } from './audio/audio.js';
import { Vector3, Box3, Raycaster, Vector2, Plane } from 'three';

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
// ---------- minikartan (0.12.0, H100) ----------
// M slår av och på; valet sparas i webbläsaren (bara en bekvämlighet, går det inte gäller "på").
const MM_KEY = 'horde.minimap';
let mmOn = true;
try { mmOn = localStorage.getItem(MM_KEY) !== 'off'; } catch { /* ingen lagring */ }
const minimap = createMinimap(uiRoot, { onPan: (x, z) => { if (map?.camera?.pan) rig?.focus(x, z); }, visible: mmOn });
minimap.toggle(mmOn);
const mmRay = new Raycaster(), mmNdc = new Vector2(), mmPlane = new Plane(new Vector3(0, 1, 0), 0), mmHit = new Vector3();
// Kamerans ruta på marken: skärmens fyra hörn rakt ned på marken.
function viewOnGround() {
  const out = [];
  for (const [x, y] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
    mmNdc.set(x, y); mmRay.setFromCamera(mmNdc, camera);
    if (!mmRay.ray.intersectPlane(mmPlane, mmHit)) return null;
    out.push([mmHit.x, mmHit.z]);
  }
  return out;
}
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
// 0.12.1 (speltestet: "det syns inte om spöket står på taket eller på marken"): för ett vapen som får
// ligga på tak står ROOF eller GROUND vid pekaren, och vart spöket snäppte.
const ghostWhere = document.createElement('div');
ghostWhere.id = 'ghostwhere'; ghostWhere.className = 'plate'; ghostWhere.hidden = true;
uiRoot.appendChild(ghostWhere);
const canPlaceNow = () => mode === 'play' && (sim.phase === 'build' || sim.phase === 'wave');
// 0.12.0 (H102): Move i panelen tar pjäsen i handen; samma spöke och samma regler som ett köp.
function startMove(id) {
  if (!canPlaceNow()) return;
  const g = sim.guns.find(x => x.id === id);
  if (!g) return;
  closePanel();
  audio.ui('pick');
  placing = { type: g.weapon.type, kind: 'gun', move: id };
  spot = null; hovered = null;
}
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
  ghostTip.hidden = true; ghostWhere.hidden = true;
  // H095: "On the road" och de andra skälen från placeringen ligger inte kvar när den är slut
  for (const n of uiRoot.querySelectorAll('.note.place')) n.remove();
}
// Rutan under pekaren för det som är i handen. Vapen: placeringsrutnätet. Hinder: vägens rutor.
// 0.12.0 (H113): med punkten på marken (x, z) tas närmaste ruta som går om rutan under pekaren inte
// gör det (src/sim/snap.js); ett tak under pekaren (roof) tas som det är.
function spotFor(key, x = null, z = null, roofHit = false, rt = null) {
  if (placing?.kind === 'obstacle') {
    if (x != null) { const sn = snapObstacle(sim, x, z, placing.type); key = sn.key; }
    if (key == null || key < 0) return { key: -1, ok: false, reason: 'ingen gata' };
    const c = sim.route.cellCenter(key), check = checkObstacle(sim, key, placing.type);
    return { key, x: c.x, z: c.z, ok: check.ok, reason: check.reason };
  }
  // 0.12.1: pekaren på en byggnad: byggnadens bästa utsiktspunkt, eller taket med skälet (aldrig marken bakom)
  if (rt && !rt.ok && rt.reason?.startsWith('brant')) {
    const c = sim.place.center(rt.key);
    return { key: rt.key, x: rt.x ?? c.x, z: rt.z ?? c.z, y: rt.y ?? 0, roof: true, ok: false, reason: rt.reason, steep: true };
  }
  if (rt) key = rt.key;
  else if (x != null && !roofHit) key = snapGun(sim, x, z, placing?.type, { move: placing?.move }).key;
  if (key == null || key < 0) return { key: -1, ok: false, reason: 'utanför' };
  const c = sim.place.center(key), check = placing?.move ? checkMove(sim, placing.move, key) : checkSpot(sim, key, placing?.type);
  const roof = onRoof(sim, key, placing?.type);
  return { key, x: c.x, z: c.z, y: roof ? sim.place.roof[key] : 0, roof, ok: check.ok, reason: check.reason, ...(rt ? { snapped: rt.snapped, perch: rt.perch } : {}) };
}
function placeHere(p) {
  const sp = typeof p === 'object' ? spotFor(p.id, p.x, p.z, p.roof, p.rt) : spotFor(p);
  const key = sp.key;
  if (!sp.ok) { flashTip(reasonText(sp.reason)); audio.ui('deny'); return; }
  const type = placing.type;
  if (placing.move) {
    const r = actions.move(placing.move, key, hasCone() ? aimFacing() : null);
    if (!r.ok) { flashTip(reasonText(r.reason)); return; }
    stopPlacing(); placedAt = performance.now();
    return;
  }
  const r = placing.kind === 'obstacle' ? actions.place(key, type) : actions.build(key, type, hasCone() ? aimFacing() : null);
  if (!r.ok) { flashTip(reasonText(r.reason)); return; }
  // Shift: kvar i handen så länge det finns råd till en till.
  // H095: ett Esc strax efter köpet gäller saken som just släpptes, inte pausmenyn.
  if (!shiftHeld || buyState(sim, type).state !== 'ok') { stopPlacing(); placedAt = performance.now(); }
  else spot = sp.ok ? spotFor(key) : sp;
}
function sightOf(type, key, facing = null) {
  const k = type + ':' + key + ':' + (facing == null ? '' : facing.toFixed(3));
  if (!sightCache.has(k)) sightCache.set(k, sightFor(sim, key, type, facing));
  return sightCache.get(k);
}
// 0.12.0 (H108): skjutsektorn för det som är i handen. Tills spelaren vrider (hjulet eller Q/E) följer
// den platsen: riktningen som ser mest av hordens väg därifrån. Vriden står den kvar.
const AIM_STEP = Math.PI / 12;
const hasCone = () => !!placing && !!WEAPONS[placing.type]?.cone;
function aimFacing() {
  if (!hasCone() || !spot || spot.key < 0) return null;
  if (!placing.userFacing) placing.facing = sightOf(placing.type, spot.key).facing;
  return placing.facing;
}
function turnAim(dir) {
  if (!hasCone()) return false;
  const f = aimFacing() ?? 0;
  placing.facing = f + dir * AIM_STEP; placing.userFacing = true;
  return true;
}
addEventListener('wheel', e => { if (hasCone() && mode === 'play') { e.preventDefault(); e.stopImmediatePropagation(); turnAim(Math.sign(e.deltaY)); } }, { capture: true, passive: false });
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
    const men = spot.ok ? (placing.move ? movePreview(sim, placing.move, spot.key) : squadPreview(sim, spot.key, placing.type)) : [];
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
    // 0.12.1: ett tak utan utsiktspunkt: spöket i rött på taket, ingen sikt
    if (spot.steep) return { ghost: { type: placing.type, x: spot.x, y: spot.y, z: spot.z, roof: true, ok: false }, cover: null, range: null };
    return {
      ghost: { type: placing.type, x: spot.x, y: spot.y, z: spot.z, roof: spot.roof, ok: spot.ok, ...(hasCone() ? { facing: aimFacing(), cone: WEAPONS[placing.type].cone, r } : {}) },
      range: hasCone() ? null : { x: spot.x, z: spot.z, r },
      cover: { id: 'p' + spot.key + placing.type + (hasCone() ? aimFacing().toFixed(3) : ''), x: spot.x, z: spot.z, r, keys: sightOf(placing.type, spot.key, hasCone() ? aimFacing() : null).keys, tone: spot.ok ? 'ok' : 'bad' },
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
  const sector = g.facing != null ? { x: g.x, y: g.y ?? 0, z: g.z, facing: g.facing, cone: WEAPONS[g.weapon.type].cone, r: rng.r } : null;
  return { ghost: null, range: sector ? null : rng, sector, cover: { id: g.id, x: g.x, z: g.z, r: rng.r, keys: g.sight.keys, tone: 'paper' } };
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
// 0.12.0 (speltestet av 0.11.0: "placeringen misslyckas utan synligt skäl"): skälet står alltid vid
// pekaren, både medan saken hålls över en ruta som inte går och en stund efter ett klick som nekades
// (förut kom klickets skäl uppe i skärmens topp).
let tipFlash = null;     // { text, until }
function flashTip(text) { tipFlash = { text, until: performance.now() + 1800 }; }
function updateGhostTip() {
  const flash = tipFlash && performance.now() < tipFlash.until ? tipFlash.text : null;
  const show = !!flash || (placing && spot && !spot.ok);
  const where = placing && placing.kind === 'gun' && WEAPONS[placing.type]?.roof && spot && spot.key >= 0;
  ghostWhere.hidden = !where;
  if (where) {
    const t = spot.roof ? (spot.snapped ? `ROOF · ${spot.perch === 2 ? 'ridge by the chimney' : 'flat part'}` : 'ROOF') : 'GROUND';
    if (ghostWhere.textContent !== t) ghostWhere.textContent = t;
    ghostWhere.classList.toggle('roof', !!spot.roof);
    ghostWhere.style.left = pointer.x + 'px'; ghostWhere.style.top = pointer.y + 'px';
  }
  ghostTip.hidden = !show;
  ghostTip.classList.toggle('flash', !!flash);
  if (!show) return;
  const t = flash ?? reasonText(spot.reason);
  if (ghostTip.textContent !== t) ghostTip.textContent = t;
  ghostTip.style.left = pointer.x + 'px'; ghostTip.style.top = pointer.y + 'px';
}
renderer.domElement.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; shiftHeld = e.shiftKey; });
renderer.domElement.addEventListener('pointerdown', e => { shiftHeld = e.shiftKey; }, true);
renderer.domElement.addEventListener('pointerleave', () => { ghostTip.hidden = true; ghostWhere.hidden = true; spot = null; });
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
  build: withCash('place', (id, type, facing) => build(sim, id, type, facing == null ? {} : { facing })),
  upgrade: withCash('click', id => upgrade(sim, id)),
  sell: withCash('click', id => sell(sim, id)),
  kit: withCash('click', id => buyKit(sim, id)),
  reinforce: withCash('click', id => reinforce(sim, id)),
  move: withCash('place', (id, key, facing) => moveGun(sim, id, key, { facing })),
  startMove: id => startMove(id),
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
// 0.12.1: byggnaden strålen träffar först (husens höjd per ruta, src/data/gnesta.js height), för ett
// vapen som får ligga på tak. { k, x, z, h }: rutan, punkten och höjden där strålen når taket.
function buildingUnder(ray) {
  const p = sim.place;
  if (!ray || !p.height || !p.bldg || !WEAPONS[placing?.type]?.roof || ray.direction.y >= 0) return null;
  for (let h = 16; h > 0.5; h -= 0.25) {
    ray3.copy(ray.direction).multiplyScalar((h - ray.origin.y) / ray.direction.y).add(ray.origin);
    const k = p.keyAt(ray3.x, ray3.z);
    if (k >= 0 && p.kind[k] === KIND.house && p.height[k] >= h - 0.2) return { k, x: ray3.x, z: ray3.z, h };
  }
  return null;
}
// Med något i handen svarar bara marken (rutan under pekaren). Annars pjäserna och hindren som
// står ute; en tom gata öppnar ingenting (köp sker från köpraden).
const picker = createPicker(() => camera, renderer.domElement, () => (placing ? [] : view.rayTargets()), (x, z, ray) => {
  if (placing?.kind === 'obstacle') { const i = sim.route.cellAt(x, z); return { kind: 'spot', id: i == null || !sim.route.validCell(i) ? -1 : i, x, z }; }
  if (placing) {
    // 0.12.1: en byggnad under pekaren ger byggnadens utsiktspunkt (snapRoof), inte marken bakom
    const b = buildingUnder(ray);
    if (b) {
      const rt = snapRoof(sim, b.k, b.x, b.z, placing.type, { move: placing.move });
      if (rt) return { kind: 'spot', id: rt.key, x: b.x, z: b.z, roof: true, rt: { ...rt, x: b.x, z: b.z, y: b.h } };
    }
    const roof = roofUnder(ray);
    return { kind: 'spot', id: roof ?? sim.place.keyAt(x, z), x, z, roof: roof != null };
  }
  const i = sim.route.cellAt(x, z);
  return i == null || !sim.route.validCell(i) || !sim.obstacles[i] ? null : { kind: 'cell', id: i };
}, { ignoreClick: () => rig.takeDrag() });
picker.onPick(p => {
  if (mode !== 'play' || sim.phase === 'won' || sim.phase === 'lost') return;
  if (placing) { if (p?.kind === 'spot') placeHere(p); return; }
  if (p) open(p); else closePanel();
});
picker.onHover(p => {
  hovered = mode === 'play' ? p : null;
  if (placing) spot = p?.kind === 'spot' ? spotFor(p.id, p.x, p.z, p.roof, p.rt) : null;
});
const bar = buildBar(uiRoot, actions);
// 0.12.0 (H116): en öppen kategori i köpraden stängs av Esc eller ett klick utanför köpraden.
document.addEventListener('pointerdown', e => { if (chord.open != null && !e.target.closest?.('#buildbar')) chord.reset(); }, true);
// Klick utanför panelen (men inte i scenen, den sköts av plockaren) stänger den.
document.addEventListener('pointerdown', e => {
  if (!panel || panel.el.contains(e.target) || e.target === renderer.domElement) return;
  closePanel();
});

// ---------- skymda enheter (0.12.0, H099) ----------
// En liten flagga i lagets färg ovanför en pjäs eller grupp som skyms av ett hus. Klick väljer den.
const pips = document.createElement('div');
pips.id = 'pips';
uiRoot.appendChild(pips);
const pipEls = new Map();
// 0.12.0 (H118, speltestet av 0.11.0: $ 1 180 kvar som inte gick att använda): när alla platser är
// tagna och kassan räcker till en uppgradering säger spelet det en gång per dag.
let spareTold = false;
function updateSpare() {
  if (mode !== 'play' || spareTold || sim.phase !== 'wave' || gunCount(sim) < sim.maxGuns) return;
  const cheapest = Math.min(...sim.guns.map(g => upgradeCost(g.weapon.type, g.weapon.level) ?? Infinity));
  if (sim.cash < cheapest) return;
  spareTold = true;
  note(uiRoot, 'Cash to spare: point at a gun and press U to upgrade it, or Move it where the horde is.');
}
function updatePips() {
  const occ = mode === 'play' && !placing ? view.occluded : new Map();
  for (const [id, el] of pipEls) if (!occ.has(id)) { el.remove(); pipEls.delete(id); }
  for (const [id, p] of occ) {
    let el = pipEls.get(id);
    if (!el) {
      el = document.createElement('button'); el.type = 'button'; el.className = 'pip'; el.title = 'Behind a building: click to select';
      el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (mode === 'play') open({ kind: 'gun', id }); });
      pips.appendChild(el); pipEls.set(id, el);
    }
    tmpV.set(p.x, p.y, p.z).project(camera);
    el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
    el.classList.toggle('sel', selected?.kind === 'gun' && selected.id === id);
  }
}

// ---------- barrikadernas hälsa (0.12.0, H114) ----------
// Speltestet av 0.11.0: barrikaden gick sönder tyst mitt i våg 3 och horden tog en annan väg. Nu har en
// skadad spärr en liten stapel ovanför sig, "Barricade failing" när den har en fjärdedel kvar (med en
// ping på minikartan), och när den går sönder står det så och den nya vägen blinkar.
const FAILING = BARRICADE_FAILING;
let routeFlash = 0;
const alerts = [];            // { x, z, until, kind } för minikartan
const failingWarned = new Set();
const bars = document.createElement('div');
bars.id = 'obbars';
uiRoot.appendChild(bars);
const barEls = new Map();
// 0.12.1: stapeln visar spärrens svagaste ruta (där den går sönder), inte summan, som annars hoppade
// upp när en ruta gått sönder. Varningen kommer som händelsen barricadeFailing från simuleringen.
function blockLines() {
  const lines = new Map();
  for (const key of Object.keys(sim.obstacles)) {
    const o = sim.obstacles[key];
    if (o.type !== 'block') continue;
    const id = barricadeId(o, key), c = sim.route.cellCenter(Number(key));
    if (!lines.has(id)) lines.set(id, { frac: 1, x: 0, z: 0, n: 0 });
    const l = lines.get(id);
    l.frac = Math.min(l.frac, Math.max(0, o.hp) / o.maxHp); l.x += c.x; l.z += c.z; l.n++;
  }
  for (const l of lines.values()) { l.x /= l.n; l.z /= l.n; }
  return lines;
}
function barricadeFailing(ev) {
  if (failingWarned.has(ev.id)) return;
  failingWarned.add(ev.id);
  note(uiRoot, 'Barricade failing', 'warn');
  const c = sim.route.cellCenter(ev.cell);
  alerts.push({ x: c.x, z: c.z, until: time + 8, kind: 'barricade' });
}
function updateBarricades(dt) {
  routeFlash = Math.max(0, routeFlash - dt);
  const lines = mode === 'play' ? blockLines() : new Map();
  for (const [id, el] of barEls) if (!lines.has(id) || lines.get(id).frac >= 0.999) { el.remove(); barEls.delete(id); }
  for (const [id, l] of lines) {
    if (l.frac >= 0.999) continue;
    let el = barEls.get(id);
    if (!el) { el = document.createElement('div'); el.className = 'obbar'; el.innerHTML = '<i></i>'; bars.appendChild(el); barEls.set(id, el); }
    tmpV.set(l.x, 2.2, l.z).project(camera);
    el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
    el.firstChild.style.width = Math.round(l.frac * 100) + '%';
    el.classList.toggle('low', l.frac < FAILING);
  }
  for (let i = alerts.length - 1; i >= 0; i--) if (alerts[i].until < time) alerts.splice(i, 1);
}
function barricadeBroken(ev) {
  // en lucka i spärren räcker för horden: första rutan som går sönder säger det, en gång per spärr
  const id = ev.line != null ? 'l' + ev.line : 'c' + ev.cell;
  if (failingWarned.has('down:' + id)) return;
  failingWarned.add('down:' + id);
  note(uiRoot, 'Barricade down. They are taking another way.', 'warn');
  routeFlash = 4;
  const c = sim.route.cellCenter(ev.cell);
  alerts.push({ x: c.x, z: c.z, until: time + 8, kind: 'barricade' });
}

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
    if (ev.t === 'waveStart') {
      hud.banner(waveText(sim.dayCfg, ev.index), 4.5);
      // 0.11.0: en våg kan säga något när den börjar (Gnesta Norr: "They're coming from the north now.")
      const toast = sim.dayCfg.waves[ev.index]?.toast;
      if (toast) note(uiRoot, toast, 'warn');
    }
    else if (ev.t === 'earlyBonus') hud.early(ev.amount);
    else if (ev.t === 'obstacleBroken' && ev.type === 'block') barricadeBroken(ev);
    else if (ev.t === 'barricadeFailing') barricadeFailing(ev);
    else if (ev.t === 'dormantBurst') { alerts.push({ x: ev.x, z: ev.z, until: time + 6, kind: 'house' }); if (!ev.intel) note(uiRoot, 'Infected breaking out of a house!', 'warn'); }
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
// ?mute (0.12.0): spelet startar helt tyst, före AudioContext, utan att spara något i inställningarna.
const MUTE = new URLSearchParams(location.search).has('mute');
const audio = createAudio({ settings, muted: MUTE });
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
  if (sim.route.kind === 'grid') { hud.entry(gridEntries(), unitPoints()); return; }
  if (sim.phase !== 'wave') { hud.entry(null); return; }
  const alive = sim.zombies.filter(z => !z.dead);
  if (!alive.length && !sim.spawnQueue.length) { hud.entry(null); return; }
  const seen = alive.some(z => { const p = zombiePos(sim, z); return onScreen(p.x, p.z, 10).in; });
  if (seen) { hud.entry(null); return; }
  entryAt = entryAt || findEntry();
  hud.entry(entryAt, unitPoints());
}
// 0.12.1 (speltestet: "HORDE INCOMING" låg ovanpå en Ksp 90): pjäsernas och soldaternas punkter på
// skärmen, så att etiketterna undviker dem (och tonas ned om de ändå hamnar över en).
function unitPoints() {
  const out = [];
  for (const g of sim.guns) {
    if (g.squad) for (const s of g.soldiers) { const p = toScreen(s.x, s.z); out.push({ x: p.sx, y: p.sy }); }
    else { const p = toScreen(g.x, g.z); out.push({ x: p.sx, y: p.sy }); }
  }
  return out;
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
    // 0.12.0: de vilande i husen (q.door) kommer inte från någon ingång
    const queue = sim.spawnQueue.filter(q => !q.door);
    for (const q of queue) ids.add(q.spawn ?? first);
    for (const z of sim.zombies) if (!z.dead && z.spawn) ids.add(z.spawn);
    if (queue.length) next = queue[0].spawn ?? first;
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
    for (const q of sim.spawnQueue) if (!q.door) add(q.spawn ?? first, q.type, 1);
    const w = sim.nextWaveIn != null && waves[sim.wavesStarted];
    if (w) for (const g of w.groups) add(g.spawn ?? first, g.type, g.count);
  }
  // 0.12.1 (speltestet: ordningen bytte medan siffrorna sjönk): fast ordning per typ
  const ORDER = ['walker', 'runner', 'brute'], rank = t => (ORDER.includes(t) ? ORDER.indexOf(t) : ORDER.length);
  return new Map([...out].map(([id, m]) => [id, [...m].sort((a, b) => rank(a[0]) - rank(b[0]))]));
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
      const pending = sim.spawnQueue.some(q => !q.door && (q.spawn ?? sim.route.spawns[0].id) === id);
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
  // 0.12.0 (H114): när en barrikad går sönder blinkar den nya vägen några sekunder
  const flash = routeFlash > 0 ? 0.5 + 0.5 * Math.abs(Math.sin(routeFlash * 6)) : 0;
  routeLines.strength(Math.max(sim.phase === 'build' ? 1 : 0.6, flash * 1.6));
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
  if (e.key === 'Enter' && mode === 'result' && !e.repeat) { e.preventDefault(); sheetAction('nextmap'); }
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) go({ stack: e.shiftKey }); }
  if (e.key === 'Shift') { hud.shift(true); shiftHeld = true; }
  // 0.12.0 (H108): Q och E vrider prickskyttens sektor i handen
  if ((e.code === 'KeyQ' || e.code === 'KeyE') && !e.repeat && mode === 'play' && turnAim(e.code === 'KeyQ' ? -1 : 1)) e.preventDefault();
  if (e.code === 'KeyF' && !e.repeat && !e.metaKey && !e.ctrlKey) toggleSpeed();
  // 0.12.0 (H118): U uppgraderar den valda pjäsen (pengar mitt i vågen ska gå att använda snabbt).
  // 0.12.1 (speltestet: överskottet gick bara att lägga en pjäs i taget med klick och U): U tar pjäsen
  // under pekaren utan att panelen öppnas, annars den valda. Svaret står vid pekaren.
  if (e.code === 'KeyU' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play' && !placing) {
    const id = hovered?.kind === 'gun' ? hovered.id : selected?.kind === 'gun' ? selected.id : null;
    if (id != null) {
      const r = actions.upgrade(id);
      const g = sim.guns.find(x => x.id === id);
      flashTip(r.ok ? `${WEAPONS[g.weapon.type].short ?? WEAPONS[g.weapon.type].name} level ${g.weapon.level}` : reasonText(r.reason));
    }
  }
  if (e.code === 'KeyM' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play') {
    minimap.toggle();
    try { localStorage.setItem(MM_KEY, minimap.visible ? 'on' : 'off'); } catch { /* ingen lagring */ }
  }
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
  failingWarned.clear(); alerts.length = 0; routeFlash = 0; spareTold = false;
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
  hud.hint(hintDone, h.lines, { compact: !!placing, pointer });
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
  const next = map.outro?.next && MAPS[map.outro.next];
  const outro = map.outro ? { text: map.outro.text, nextName: next?.name ?? null } : null;
  setMode('result', () => dayResultPanel(uiRoot, { ...lastResult, totalIntel: progress.intel, outro }, {
    onRetry: () => startDay(day),
    onNext: () => startDay(day + 1),
    // 0.11.0: sektorns slut leder rakt in i nästa sektors dag 1 (den är upplåst av vinsten)
    onNextMap: () => { if (!next) return; progress = selectMap(progress, next.id); save(); loadMap(next.id).then(() => { hud.reset(); startDay(1); }); },
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
  for (const sel of ['#day', '#res', '#hint', '#buildbar', '#go', '#wavebar', '#speedcd', '#minimap:not(.off)']) {
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
  // 0.12.0: byt bana som menyn gör (prov och skärmbilder)
  pickMap: id => { progress = selectMap(progress, id); return loadMap(id); },
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
  if (placing && (!canPlaceNow() || (placing.move ? !sim.guns.some(g => g.id === placing.move) : buyState(sim, placing.type).state === 'locked'))) stopPlacing();
  updateHint();
  if (!canPlaceNow()) chord.reset();
  bar.update(sim, placing?.type, canPlaceNow(), chord.open, chord.armed(performance.now() / 1000));
  updateGhostTip();

  if (panel) panel.update(sim);
  hud.update(sim);
  hud.routeKey(mode === 'play' && sim.route.kind === 'grid' && (sim.phase === 'build' || sim.phase === 'wave'), showRoute);
  updateEntry();
  updateBarricades(paused ? 0 : frameDt);
  updatePips();
  updateSpare();
  if (mode === 'play') minimap.update(frameDt, { sim, view: viewOnGround(), spawns: sim.route.kind === 'grid' ? activeSpawns().ids : [], alerts });
  rig.active = mode === 'play' && !paused;
  const vdt = paused ? 0 : frameDt;   // pausad: zombier, effekter och skak står stilla
  rig.update(vdt);
  shakeCamera(vdt);
  const tiles = updateRoutes();
  routeLines.update(vdt);
  const pu = placementUi();
  view.setUi({ selected, hover: placing ? (placing.kind === 'obstacle' && spot?.key >= 0 ? { kind: 'cell', id: spot.key } : null) : hovered,
    range: pu.range || panelRange || rangeFor(hovered) || rangeFor(selected), tiles: pu.tiles || (placing ? null : tiles),
    ghost: pu.ghost, cover: pu.cover, obGhost: pu.obGhost, sector: pu.sector ?? (pu.ghost?.cone ? pu.ghost : null), marks: placing?.kind === 'obstacle', squadRange: pu.squadRange ?? null });
  view.setZoom(rig.view);
  view.sync(vdt);
  audio.update(frameDt, sim, { paused, mode, mapId: map.id, speed: running ? speed : 1, toScreen, zombiePos: z => zombiePos(sim, z) });
  updateWorld(frameDt, time);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.__hordeReady = true;   // laddningsskyddet i index.html: från nu är vanliga fel inte cachefel
