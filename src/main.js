// Spelet (0.14.0, Operation Södermanland): meny, operationskartan, förrådet, uppställningen och striden.
// Lägen: menu -> opmap -> (depot) -> intro -> play (uppställning, sedan vågorna) -> result -> opmap | intro (försök igen).
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
import { gunPanel, cellPanel, buildBar, reasonText, dayIntro, dayResultPanel, mainMenu, note, clearNoteQueue } from './ui/panels.js';
import { opMapSheet, depotSheet, nextDay } from './ui/operation.js';
import { shopItem, dayMenu, BUY_MENU } from './data/shop.js';
import { WEAPONS } from './data/weapons.js';
import { OBSTACLES } from './data/obstacles.js';
import { buyState, inBar } from './sim/buy.js';
import { abandonDay, mapState, mapUnlocked, selectMap, hintSeen, markHintSeen } from './meta/progress.js';
import { newCampaign, opStartConfig, finishDay as finishOpDay, markRead, requisition, levelUp, refill, returnUnit, reassign, buyUpgrade, debugDepot, debugReach, unitsIn, pressureOf, PRESSURE_HP, unitName } from './meta/operation.js';
import { RELEASES, FROM_NAME } from './data/depot.js';
import { loadProgress, saveProgress, resetSave } from './meta/save.js';
import { loadDebug, saveDebug } from './meta/debug-store.js';
import { mountDebug, versionClicks } from './ui/debug.js';
import { createDebugOverlay } from './render/debug-overlay.js';
import { ARRIVAL } from './data/arrival.js';
import { barricadeId, BARRICADE_FAILING, gunCount, createSim, dayReport, buySupply, deployPhase, frontage, startWave, step, build, upgrade, sell, placeAcross, removeObstacle, acrossCells, zombiePos, buyKit, callNextWave, checkSpot, sightFor, checkObstacle, onRoof, reinforce, squadPreview, squadRoom, moveGun, checkMove, movePreview, normalizeTweaks, debugSpawn, debugBurst, debugJumpWave, rotateGun, checkRotate, crewPathTo, canMoveType, houseDoor, evacOutcome } from './sim/sim.js';
import { SQUAD, isSquad } from './sim/squad.js';
import { snapGun, snapObstacle, snapRoof } from './sim/snap.js';
import { KIND, roofAt } from './sim/placement.js';
import { pointAt } from './sim/path.js';
import { weaponStats, upgradeCost } from './sim/stats.js';
import { crewPassable } from './sim/crew-path.js';
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
const TEST = new URLSearchParams(location.search).has('test');
// Laddningsskydd (index.html): huvudfilen och version.js ska vara samma version. Skiljer de sig har en
// fil kommit ur cachen från en annan publicering.
{ const v = new URL(import.meta.url).searchParams.get('v'); if (v && v !== VERSION) window.__hordeStale?.(); }
let progress = loadProgress();
// 0.12.2: debugmenyns reglar och hjälplager ('horde.debug', aldrig i sparfilen)
const dbg = loadDebug();
const withTweaks = cfg => ({ ...cfg, tweaks: dbg.tweaks });
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
  w.sim = createSim(withTweaks(opStartConfig(progress, d, m.id) ?? opStartConfig(newCampaign(), 1, 'riksvagen')));
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
    sim = createSim(withTweaks(opStartConfig(progress, day, map.id) ?? opStartConfig(newCampaign(), 1, 'riksvagen')));
    view.setSim(sim);
    stage.resize(); rig.apply(); rig.goHome();
    routeKeys.now = routeKeys.preview = routeKeys.evac = null;
    sightCache.clear();
    // en bildruta med den nya banan innan skylten tas bort
    await nextFrame();
    loading.hidden = true;
  })();
  try { await loadingMap; } finally { loadingMap = null; }
}
const routeKeys = { now: null, preview: null, evac: null };

const hud = mountHud(uiRoot, { onStart: () => go(), onSpeed: () => toggleSpeed(), onNext: () => go({ stack: true }) });
// ---------- minikartan (0.12.0, H100) ----------
// Tab slår av och på (0.13.0, var M: M är nu Move); valet sparas i webbläsaren (bara en bekvämlighet).
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
// 0.13.0: snabbvalen räknas på dagens köprad (förrådet per sektor och dag)
const chord = createChord({ menu: () => (sim ? dayMenu(id => inBar(sim, id)) : BUY_MENU) });
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
  // 0.13.0 (H136): Shift-klick lägger till waypoints (via), vanligt klick är slutpunkten
  placing = { type: g.weapon.type, kind: 'gun', move: id, via: [] };
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
  placing = null; spot = null; aim = null; if (rig) rig.panLock = false;
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
  const c = sim.place.center(key), check = placing?.move ? checkMove(sim, placing.move, key, placing.via ?? []) : checkSpot(sim, key, placing?.type);
  const roof = onRoof(sim, key, placing?.type);
  // 0.14.2: snäppte spöket bort från rutan under pekaren står pekarens punkt kvar (pilen dit, view.js snap)
  const from = x != null && !roofHit && !rt && key !== sim.place.keyAt(x, z) ? { fx: x, fz: z } : {};
  return { key, x: c.x, z: c.z, y: roof ? sim.place.roof[key] : 0, roof, ok: check.ok, reason: check.reason, ...from, ...(rt ? { snapped: rt.snapped, perch: rt.perch } : {}) };
}
function placeHere(p) {
  const sp = typeof p === 'object' ? spotFor(p.id, p.x, p.z, p.roof, p.rt) : spotFor(p);
  const key = sp.key;
  if (!sp.ok) { flashTip(reasonText(sp.reason)); audio.ui('deny'); return; }
  const type = placing.type;
  if (placing.move) {
    const r = actions.move(placing.move, key, hasCone() ? aimFacing() : null, placing.via ?? []);
    if (!r.ok) { flashTip(reasonText(r.reason)); return; }
    stopPlacing(); placedAt = performance.now();
    return;
  }
  const r = placing.kind === 'obstacle' ? actions.place(key, type) : actions.build(key, type, hasCone() ? aimFacing() : null);
  if (!r.ok) { flashTip(reasonText(r.reason)); return; }
  // Shift: kvar i handen så länge det finns råd till en till.
  // H095: ett Esc strax efter köpet gäller saken som just släpptes, inte pausmenyn.
  if (!shiftHeld || buyState(sim, type).state !== 'ok') { stopPlacing(); placedAt = performance.now(); }
  else { spot = sp.ok ? spotFor(key) : sp; placing.userFacing = false; }
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
// 0.13.0 (H132): klicka och dra för att sikta (hjulet zoomar igen, Q och E vrider fortfarande i handen).
// Ett vanligt klick ger riktningen mot hordens väg. Dragningen börjar på pekarens ruta, som står kvar
// medan man drar; släppet ställer ut pjäsen (eller flytten, eller Rotate) med den riktningen.
// 0.14.1 (speltestet av 0.14.0: "enheten hamnade där jag släppte"): rutan tas från själva trycket. Förut
// gällde rutan som pekaren senast räknats på (en gång per bildruta); i låg bildtakt, eller när pekaren
// flyttats och tryckts i samma bildruta, var den gammal eller saknades, och då tog släppets klick över och
// ställde pjäsen där man släppte. Medan man drar står "Unit here" vid pjäsens punkt och en linje går
// därifrån till pekaren.
const AIM_DRAG_PX = 10;
let aim = null, suppressClick = false;
const groundRay = new Raycaster(), groundNdc = new Vector2(), groundHit = new Vector3();
function groundAt(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  groundNdc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  groundRay.setFromCamera(groundNdc, camera);
  return groundRay.ray.intersectPlane(mmPlane, groundHit) ? { x: groundHit.x, z: groundHit.z } : null;
}
renderer.domElement.addEventListener('pointerdown', e => {
  suppressClick = false;           // ett gammalt släpp utan klick ska inte äta nästa klick
  if (e.button !== 0 || mode !== 'play') return;
  if (rotating) { aim = { rotate: true, sx: e.clientX, sy: e.clientY, drag: false }; rig.panLock = true; return; }
  if (!hasCone() || (placing.move && e.shiftKey)) return;
  const here = picker.pickAt(e.clientX, e.clientY);
  if (here?.kind === 'spot') spot = spotFor(here.id, here.x, here.z, here.roof, here.rt);
  if (!spot || spot.key < 0) return;
  aim = { sp: spot, x: spot.x, z: spot.z, sx: e.clientX, sy: e.clientY, drag: false };
  rig.panLock = true;
}, true);
addEventListener('pointermove', e => {
  if (!aim) return;
  if (!aim.drag && Math.hypot(e.clientX - aim.sx, e.clientY - aim.sy) < AIM_DRAG_PX) return;
  aim.drag = true;
  if (aim.rotate || !placing) return;
  const g = groundAt(e.clientX, e.clientY);
  if (g && Math.hypot(g.x - aim.x, g.z - aim.z) > 0.5) { placing.facing = Math.atan2(g.z - aim.z, g.x - aim.x); placing.userFacing = true; }
});
addEventListener('pointerup', () => {
  if (!aim) return;
  const a = aim; aim = null; rig.panLock = false;
  if (!a.drag) return;            // ett vanligt klick: plockaren sköter det
  suppressClick = true;
  if (a.rotate) { commitRotate(); return; }
  if (placing) { spot = a.sp; placeHere(a.sp.key); }
});
const takeSuppress = () => { const s0 = suppressClick; suppressClick = false; return s0; };
const aimTip = document.createElement('div');
aimTip.id = 'aimtip'; aimTip.className = 'plate'; aimTip.hidden = true; aimTip.textContent = 'Unit here';
uiRoot.appendChild(aimTip);
// Medan man drar för att sikta: linjen från pjäsens punkt till pekaren, och "Unit here" vid punkten.
function aimLine() {
  if (!aim?.drag || aim.rotate || !placing) { aimTip.hidden = true; return null; }
  const p = toScreen(aim.x, aim.z);
  aimTip.hidden = false; aimTip.style.left = p.sx + 'px'; aimTip.style.top = p.sy + 'px';
  const g = groundAt(pointer.x, pointer.y);
  return g ? { pts: [[aim.x, aim.z], [g.x, g.z]], ok: true, via: [] } : null;
}

// ---------- Rotate (0.13.0, H132) ----------
// R eller panelens Rotate: skjutvinkeln följer pekaren runt pjäsen; klick (eller dra och släpp) vrider
// den dit. Pjäsen vrids i sin egen fart och skjuter inte under tiden. Esc eller högerklick avbryter.
let rotating = null;           // { id, facing }
function startRotate(id) {
  const c = checkRotate(sim, id);
  if (!c.ok) { flashTip(reasonText(c.reason)); audio.ui('deny'); return; }
  const g = sim.guns.find(x => x.id === id);
  closePanel(); stopPlacing();
  rotating = { id, facing: g.facing ?? 0 };
  audio.ui('pick');
}
function updateRotate() {
  if (!rotating) return null;
  const g = sim.guns.find(x => x.id === rotating.id);
  if (!g || mode !== 'play' || !canPlaceNow()) { rotating = null; return null; }
  const p = groundAt(pointer.x, pointer.y);
  if (p && Math.hypot(p.x - g.x, p.z - g.z) > 0.8) rotating.facing = Math.atan2(p.z - g.z, p.x - g.x);
  return { x: g.x, y: g.y ?? 0, z: g.z, facing: rotating.facing, cone: WEAPONS[g.weapon.type].cone, r: weaponStats(g.weapon.type, g.weapon.level, sim.research).range, ok: true };
}
function commitRotate() {
  if (!rotating) return;
  const { id, facing } = rotating;
  rotating = null;
  const r = actions.rotate(id, facing);
  if (!r.ok) flashTip(reasonText(r.reason));
}
function guideMove(id) {
  const g = sim.guns.find(x => x.id === id);
  if (!g) return;
  if (!canMoveType(g.weapon.type)) { flashTip(reasonText('fast')); audio.ui('deny'); return; }
  startMove(id);
}
// Flyttens väg i handen (H136): från pjäsen genom waypoints till rutan under pekaren.
const routeCache = { key: '', route: null };
function moveRoute() {
  if (!placing?.move || !spot || spot.key < 0) return null;
  const g = sim.guns.find(x => x.id === placing.move);
  if (!g) return null;
  const via = placing.via ?? [];
  const k = `${g.id}|${g.cell}|${via.join(',')}|${spot.key}`;
  if (routeCache.key !== k) { routeCache.key = k; routeCache.route = crewPathTo(sim, { x: g.x, z: g.z }, spot.key, via); }
  const r = routeCache.route, viaPts = via.map(q => { const c = sim.place.center(q); return [c.x, c.z]; });
  if (!r) return { pts: [[g.x, g.z], ...viaPts, [spot.x, spot.z]], ok: false, via: viaPts };
  return { pts: r.pts, ok: !!spot.ok, via: viaPts };
}
function addWaypoint(p) {
  const k = sim.place.keyAt(p.x, p.z);
  if (k < 0 || !crewPassable(sim.place, k)) { flashTip(reasonText('ingen väg')); audio.ui('deny'); return; }
  placing.via.push(k);
  audio.ui('click');
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
// ---------- giltig mark (0.14.2) ----------
// Speltestet av 0.14.1: ungefär hälften av placeringarna i Gnesta nekades ("On the road", "Inside a house",
// "In the forest"). Medan en enhet hålls i handen ligger en ljus, svag ton på rutorna där just den typen
// får stå, inom VALID_R meter från pekaren. Svaren sparas per ruta tills något ändras (typen, pjäserna
// ute, läget); högst VALID_BUDGET nya rutor räknas per bildruta, så att tonen fylls på utan hack.
const VALID_R = 20, VALID_BUDGET = 180;
const validCache = { sig: '', ok: new Map() };
function validTint() {
  if (!placing || placing.kind !== 'gun' || !canPlaceNow() || aim?.drag) return null;
  const g = groundAt(pointer.x, pointer.y);
  if (!g) return null;
  const sig = `${placing.type}|${placing.move ?? ''}|${sim.phase}|${sim.reserve?.length ?? ''}|${sim.guns.map(q => `${q.id}:${Math.round(q.x * 2)},${Math.round(q.z * 2)}`).join(';')}`;
  if (sig !== validCache.sig) { validCache.sig = sig; validCache.ok.clear(); }
  const p = sim.place, ci = Math.floor((g.x - p.origin[0]) / p.size), cj = Math.floor((g.z - p.origin[1]) / p.size), span = Math.ceil(VALID_R / p.size);
  const ok = validCache.ok, keys = [];
  let budget = VALID_BUDGET;
  for (let j = cj - span; j <= cj + span; j++) for (let i = ci - span; i <= ci + span; i++) {
    if (i < 0 || j < 0 || i >= p.w || j >= p.h) continue;
    const k = j * p.w + i, c = p.center(k);
    if (Math.hypot(c.x - g.x, c.z - g.z) > VALID_R) continue;
    if (!ok.has(k)) {
      if (budget-- <= 0) continue;
      const kind = p.kind[k];
      ok.set(k, (kind === KIND.open || (kind === KIND.house && roofAt(p, k) > 0)) &&
        (placing.move ? checkSpot(sim, k, placing.type, { ignore: placing.move }) : checkSpot(sim, k, placing.type)).ok);
    }
    if (ok.get(k)) keys.push(k);
  }
  return { id: sig + '|' + ci + ',' + cj + '|' + keys.length, keys, x: g.x, z: g.z, r: VALID_R };
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
// 0.14.1 (speltestet av 0.14.0: "Tile already taken" långt från klicket): skälet står där pekaren var när
// det hände (pekaren följs i hela fönstret, inte bara över scenen) och flyttar inte med efteråt.
let tipFlash = null;     // { text, until, x, y }
function flashTip(text) { tipFlash = { text, until: performance.now() + 1800, x: pointer.x, y: pointer.y }; }
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
  const at = flash ? tipFlash : pointer;
  ghostTip.style.left = at.x + 'px'; ghostTip.style.top = at.y + 'px';
}
renderer.domElement.addEventListener('pointermove', e => { shiftHeld = e.shiftKey; });
addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, true);
addEventListener('pointerdown', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, true);
renderer.domElement.addEventListener('pointerdown', e => { shiftHeld = e.shiftKey; }, true);
renderer.domElement.addEventListener('pointerleave', () => { ghostTip.hidden = true; ghostWhere.hidden = true; spot = null; });
renderer.domElement.addEventListener('contextmenu', e => { if (placing || rotating) { e.preventDefault(); stopPlacing(); rotating = null; } });
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
  supply: withCash('click', (id, what) => buySupply(sim, id, what)),
  reinforce: withCash('click', id => reinforce(sim, id)),
  move: withCash('place', (id, key, facing, via = []) => moveGun(sim, id, key, { facing, via })),
  startMove: id => guideMove(id),
  rotate: withCash('click', (id, facing) => rotateGun(sim, id, facing)),
  startRotate: id => startRotate(id),
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
const picker = createPicker(() => camera, renderer.domElement, () => (placing || rotating ? [] : view.rayTargets()), (x, z, ray) => {
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
}, { ignoreClick: () => rig.takeDrag() || takeSuppress() });
picker.onPick(p => {
  if (mode !== 'play' || sim.phase === 'won' || sim.phase === 'lost') return;
  if (rotating) { commitRotate(); return; }
  // 0.13.0 (H136): Shift-klick lägger en waypoint på flyttens väg
  if (placing?.move && shiftHeld && p?.kind === 'spot') { addWaypoint(p); return; }
  if (placing) { if (p?.kind === 'spot') placeHere(p); return; }
  if (p) open(p); else closePanel();
});
picker.onHover(p => {
  hovered = mode === 'play' ? p : null;
  // medan spelaren drar för att sikta står spöket kvar på sin ruta
  if (placing && !aim?.drag) spot = p?.kind === 'spot' ? spotFor(p.id, p.x, p.z, p.roof, p.rt) : null;
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
let civToldAt = -Infinity, builtTold = false, climbTold = false;
// 0.13.0 (H105): uppdraget med de civila uppe i mitten: hur många som är framme och hur många som behövs.
const evacEl = document.createElement('div');
evacEl.id = 'evac'; evacEl.className = 'plate'; evacEl.hidden = true;
evacEl.innerHTML = '<div class="t"></div><div class="n"></div><div class="evbar"><i class="safe"></i><i class="lostbar"></i><i class="need"></i></div>';
uiRoot.appendChild(evacEl);
let evacKey = '';
function updateEvac() {
  const ev = mode === 'play' ? sim.evac : null;
  evacEl.hidden = !ev;
  if (!ev) return;
  const k = `${ev.safe}|${ev.lost}|${ev.out}`;
  if (k === evacKey) return;
  evacKey = k;
  // 0.14.1 (speltestet av 0.14.0: "0 of 13 safe · 20 on the way" sa inte vem som var 20): en stapel med
  // de framme (gula), strecket vid så många som behövs, och de förlorade av så många som får falla.
  evacEl.querySelector('.t').textContent = sim.dayCfg.objective ?? 'Hold until the civilians reach the ice rink.';
  const maxLost = ev.total - ev.need;
  evacEl.querySelector('.n').innerHTML = `Evacuated <b>${ev.safe}</b> / ${ev.need} needed · <span class="${ev.lost ? 'lost' : ''}">Lost ${ev.lost} / ${maxLost}</span>`;
  const pct = n => (100 * n / ev.total).toFixed(2) + '%';
  evacEl.querySelector('.safe').style.width = pct(ev.safe);
  evacEl.querySelector('.need').style.left = pct(ev.need);
  evacEl.querySelector('.lostbar').style.width = pct(ev.lost);
}
// En civil har fallit: ett märke där det hände (vid skärmkanten om platsen är utanför bild) och en ping.
function civilianLost(ev) {
  alerts.push({ x: ev.x, z: ev.z, until: time + 6, kind: 'civ' });
  const p = toScreen(ev.x, ev.z), m = 40;
  const off = p.sx < m || p.sx > innerWidth - m || p.sy < m || p.sy > innerHeight - m;
  const el = document.createElement('div');
  el.className = 'civlost' + (off ? ' off' : '');
  el.textContent = off ? 'Civilian lost, off screen' : 'Civilian lost';
  el.style.left = Math.max(m + 60, Math.min(innerWidth - m - 60, p.sx)) + 'px';
  el.style.top = Math.max(m + 20, Math.min(innerHeight - m - 20, p.sy)) + 'px';
  uiRoot.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}
function updateSpare() {
  // 0.14.0: med kärntrupperna går överskottet till förnödenheter
  if (mode === 'play' && sim.core && !spareTold && sim.phase === 'wave' && sim.cash >= 320) {
    spareTold = true;
    note(uiRoot, 'Supplies to spare: click a unit for an ammo crate, sandbags or a grenade kit, or lay more wire.');
    return;
  }
  if (sim.core || mode !== 'play' || spareTold || sim.phase !== 'wave' || gunCount(sim) < sim.maxGuns) return;
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

// ---------- mål utanför vinkeln (0.14.1, granskningen av 0.14, Important 5) ----------
// En liten gul flagga "R" över en pjäs som stått sysslolös med zombier i sikte men utanför vinkeln
// (simuleringens idleOutside), en ping på minikartan första gången och klick väljer pjäsen.
const arcFlags = new Map(), arcPinged = new Map();
function updateArcFlags() {
  const want = mode === 'play' && !placing ? sim.guns.filter(g => g.idleOutside) : [];
  const ids = new Set(want.map(g => g.id));
  for (const [id, el] of arcFlags) if (!ids.has(id)) { el.remove(); arcFlags.delete(id); }
  for (const g of want) {
    let el = arcFlags.get(g.id);
    if (!el) {
      el = document.createElement('button'); el.type = 'button'; el.className = 'arcflag'; el.textContent = 'R';
      el.title = 'Target outside arc. Press R to rotate.';
      const id = g.id;
      el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (mode === 'play') open({ kind: 'gun', id }); });
      pips.appendChild(el); arcFlags.set(g.id, el);
      if (time - (arcPinged.get(g.id) ?? -Infinity) > 12) { arcPinged.set(g.id, time); alerts.push({ x: g.x, z: g.z, until: time + 4, kind: 'arc' }); }
    }
    tmpV.set(g.x, (g.y ?? 0) + 2.6, g.z).project(camera);
    el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
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
    if (OBSTACLES[o.type]?.kind !== 'block') continue;
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
    // 0.12.2: en grupp sent i vågen säger till när den kommer (vändningen)
    else if (ev.t === 'groupToast') note(uiRoot, ev.text, 'warn');
    else if (ev.t === 'earlyBonus') hud.early(ev.amount);
    else if (ev.t === 'obstacleBroken' && OBSTACLES[ev.type]?.kind === 'block') barricadeBroken(ev);
    else if (ev.t === 'barricadeFailing') barricadeFailing(ev);
    // 0.13.0: de civila, pillboxen och lagen på väg
    else if (ev.t === 'civilianDown') { if (time - civToldAt > 3) { civToldAt = time; note(uiRoot, 'A civilian is down!', 'warn'); } civilianLost(ev); }
    else if (ev.t === 'civilianSafe' && ev.safe === 1) note(uiRoot, 'The first civilians are inside the ice rink.');
    else if (ev.t === 'civilianClimb' && !climbTold) { climbTold = true; note(uiRoot, 'No way round: civilians are climbing over your barricade.', 'warn'); }
    else if (ev.t === 'evacDone') note(uiRoot, 'The civilians are inside the ice rink.');
    else if (ev.t === 'vehicleDown') { note(uiRoot, 'The pillbox is torn open!', 'warn'); alerts.push({ x: ev.x, z: ev.z, until: time + 6, kind: 'barricade' }); }
    else if (ev.t === 'crewLost') { note(uiRoot, `${WEAPONS[ev.type]?.short ?? WEAPONS[ev.type]?.name} team lost on the move!`, 'warn'); alerts.push({ x: ev.x, z: ev.z, until: time + 6, kind: 'barricade' }); }
    else if (ev.t === 'built' && !builtTold) { builtTold = true; note(uiRoot, 'Pillbox welded. It fires now.'); }
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
// 0.14.0: i uppställningen säger första trycket till om enheter väntar kvar i reserven (och frontbredden räcker);
// nästa tryck startar ändå.
let reserveWarned = false;
function go({ stack = false } = {}) {
  if (mode !== 'play') return;
  if (sim.phase === 'build' && sim.nextWaveIn == null) {
    const left = sim.reserve?.length ?? 0;
    if (deployPhase(sim) && left && sim.guns.length < frontage(sim) && !reserveWarned) {
      reserveWarned = true;
      note(uiRoot, `${left} unit${left > 1 ? 's' : ''} still in reserve. Deploy them (2), or press again to start.`, 'warn');
      return;
    }
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
  if (!grid) { routeLines.set('now', null); routeLines.set('preview', null); routeLines.set('evac', null); return null; }
  // 0.10.2: från varje ingång som används nu (activeSpawns), som pilarna
  const ids = activeSpawns().ids;
  const obsKey = Object.keys(sim.obstacles).join(',');
  // 0.14.1 (speltestet av 0.14.0): de civilas väg från varje dörr till ishallen, gul, tills evakueringen är avgjord
  const ev = sim.evac && !evacOutcome(sim.evac) ? sim.dayCfg.evac : null;
  if (ev) {
    const houses = [...new Set(ev.groups.map(g => g.house))], eKey = obsKey + '|' + houses.join(',');
    if (routeKeys.evac !== eKey) { routeKeys.evac = eKey; routeKeys.evacPaths = houses.map(h => { const d = houseDoor(sim.map, h, sim.route); return [[d.x, d.z], ...sim.route.pathFrom(d.cell).map(cellWorld)]; }); }
    routeLines.set('evac', routeKeys.evacPaths, eKey);
  } else routeLines.set('evac', null);
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
  // 0.12.2: det man skriver i debugmenyns fält styr inte spelet; Esc stänger menyn
  if (e.target?.closest?.('#debug')) { if (e.key === 'Escape') { e.preventDefault(); debugUi.close(); } return; }
  if (e.key === 'Escape') {
    // Esc: stäng menyn, annars forskningen, placeringen eller panelen, och först sist öppna menyn.
    e.preventDefault();
    const what = escapeAction({ menuOpen: menu.isOpen(), mode, placing: !!placing || !!rotating, panel: !!panel, selected: !!selected, repeat: e.repeat,
      category: chord.open != null, justPlaced: performance.now() - placedAt < JUST_PLACED_MS });
    if (what === 'close-category') chord.escape();
    else if (what === 'menu-back') menu.back();
    else if (what === 'close-research') sheetAction('done');
    else if (what === 'cancel-placing') { stopPlacing(); rotating = null; }
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
  // en Enter gör en sak (skylten byts i samma tryck: else if)
  if (e.key === 'Enter' && !e.repeat) {
    // 0.14.1: förrådet som steg (Deploy), och på förlustskylten är Try again det markerade valet
    const a = { intro: 'go', result: lastResult?.won === false ? 'retry' : 'opmap', opmap: 'go', menu: 'continue', depot: 'deploy' }[mode];
    if (a && !menu.isOpen()) { e.preventDefault(); sheetAction(a); }
  }
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
  // 0.13.0 (H136, H132): Tab minikartan (var M), M flyttar, R vrider, V visar hordens väg (var R).
  if (e.code === 'Tab' && mode === 'play' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    if (!e.repeat) { minimap.toggle(); try { localStorage.setItem(MM_KEY, minimap.visible ? 'on' : 'off'); } catch { /* ingen lagring */ } }
  }
  const unitId = () => (hovered?.kind === 'gun' ? hovered.id : selected?.kind === 'gun' ? selected.id : null);
  if (e.code === 'KeyM' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play' && !placing && canPlaceNow()) {
    const id = unitId();
    if (id != null) guideMove(id);
  }
  if (e.code === 'KeyR' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play' && !placing) {
    const id = unitId();
    if (id != null) startRotate(id);
  }
  if (e.code === 'KeyV' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play' && sim.route.kind === 'grid') {
    showRoute = !showRoute;
    note(uiRoot, showRoute ? 'Horde route shown (V)' : 'Horde route hidden (V)');
    hud.routeKey(true, showRoute);
  }
}, true);
addEventListener('keyup', e => { if (e.code === 'Space') e.preventDefault(); if (e.key === 'Shift') { hud.shift(false); shiftHeld = false; } }, true);
addEventListener('blur', () => { hud.shift(false); shiftHeld = false; });

// ---------- dagcykeln ----------
let mode = 'menu';
let sheet = null;            // skylten som visas (meny, intro, resultat, forskning)
let lastResult = null;       // det som resultatskylten visar, för att komma tillbaka från forskning
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
  // Notiser från dagen (t.ex. "Basen tar skada!") ska inte ligga kvar över skyltarna. 0.14.0: utanför striden
  // tas alla bort (operationskartan och förrådet täcker skärmen).
  for (const n of uiRoot.querySelectorAll(m === 'play' ? '.note.warn' : '.note')) n.remove();
  if (m !== 'play') { clearNoteQueue(); for (const n of uiRoot.querySelectorAll('.civlost')) n.remove(); }
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
  const started = Object.values(progress.maps).some(m => Object.keys(m.attempts).length || m.unlockedDay > 1);
  setMode('menu', () => mainMenu(uiRoot, {
    version: VERSION, started, rp: progress.rp,
    onContinue: () => showOpMap(),
    onNew: () => { resetSave(newCampaign()); progress = loadProgress(); loadMap(progress.mapId).then(() => showOpMap()); },
  }));
}
// ---------- operationskartan och förrådet (0.14.0) ----------
function showOpMap() {
  setMode('opmap', () => opMapSheet(uiRoot, progress, {
    onGo: id => goSector(id),
    onDepot: id => showDepot(id),
    onMenu: () => showMenu(),
    // inkorgen är läst när kartan har visats (de nya står markerade just den gången)
    onSeen: () => { progress = markRead(progress); save(); },
  }));
}
// 0.14.1 (speltestet av 0.14.0: förrådet var ett sidospår man gick förbi, och två "To deployment" i rad):
// kartan -> Requisition (förrådet för sektorn, steget i flödet) -> Deploy -> dagens intro -> linjen.
function goSector(id) {
  const d = nextDay(progress, id);
  if (!d) return;
  showDepot(id, 'opmap', { day: d });
}
function deploySector(id) {
  const d = nextDay(progress, id);
  if (!d) { showOpMap(); return; }
  progress = selectMap(progress, id); save();
  loadMap(id).then(() => { hud.reset(); startDay(d); });
}
const DEPOT_ACTS = {
  requisition: (p, type, sector) => { const r = requisition(p, type, sector); return { ...r, text: r.ok ? `${unitName({ type })} requisitioned for ${MAPS[sector].name}.` : null }; },
  level: (p, uid) => { const r = levelUp(p, uid); return { ...r, text: r.ok ? 'Level bought.' : null }; },
  refill: (p, uid) => { const r = refill(p, uid); return { ...r, text: r.ok ? 'Back at full strength.' : null }; },
  return: (p, uid) => { const r = returnUnit(p, uid); return { ...r, text: r.ok ? `Returned to the depot: +${r.refund} RP.` : null }; },
  reassign: (p, uid, sector) => { const r = reassign(p, uid, sector); return { ...r, text: r.ok ? `Reassigned to ${MAPS[sector].name}.` : null }; },
  upgrade: (p, id) => { const r = buyUpgrade(p, id); return { ...r, text: r.ok ? 'Upgrade bought.' : null }; },
};
function showDepot(sector, from = 'opmap', deploy = null) {
  void from;
  setMode('depot', () => depotSheet(uiRoot, progress, sector, {
    act: (kind, ...args) => {
      const r = DEPOT_ACTS[kind](progress, ...args);
      if (r.ok) { progress = r.progress; save(); audio.ui('click'); } else audio.ui('deny');
      return r;
    },
    onDone: () => showOpMap(),
    onDeploy: () => deploySector(sector),
  }, { deploy }));
}
// Leveransen som hör till dagen (meddelandet i introt), eller ingenting.
function releaseLine(mapId, n) {
  const r = RELEASES.find(x => x.map === mapId && x.day === n);
  return r ? `<p class="lead arrived">${FROM_NAME[r.from]}: ${r.text}</p>` : '';
}
function startDay(n) {
  const cfg = opStartConfig(progress, n);
  if (!cfg) { showOpMap(); return; }
  day = n;
  sim = createSim(withTweaks(cfg));
  failingWarned.clear(); alerts.length = 0; routeFlash = 0; spareTold = false; rotating = null; civToldAt = -Infinity; builtTold = false; climbTold = false; reserveWarned = false; evacKey = '';
  sightCache.clear(); validCache.sig = '';
  view.setSim(sim);
  hud.reset();
  hud.setSpeed(speed);
  entryAt = null; shakeT = 0; rig.setShake(0, 0); rig.goHome();
  const frame = dayFrame();
  if (frame) rig.focus(frame.x, frame.z, frame.view);
  hinting = n === 1 && !hintSeen(progress, map.id) && !!map.days[0].hints; hintDone = 0;
  const op = { units: cfg.core.length, pressure: Math.round(pressureOf(progress, map.id) * PRESSURE_HP * 100) };
  setMode('intro', () => dayIntro(uiRoot, map.days[n - 1], cfg.cash, () => { setMode('play'); introPan(frame); }, { arrived: releaseLine(map.id, n), op }));
}
// Kameran när dagen börjar (0.10.1, speltestet: "var basen ligger syns inte"): ishallens entré och
// vägen dit från dagens första ingång i bild, så långt zoomen räcker (högst 120 m av vägen).
function dayFrame() {
  if (sim.route.kind !== 'grid') return null;
  // 0.14.1 (speltestet av 0.14.0: "familjerna dog utanför bild"): en evakueringsdag börjar med hela de
  // civilas väg i bild, från husen till ishallen.
  // 0.14.2 (speltestet av 0.14.1: "ishallen syns inte vid start, jag fick dra kartan"): basen är entrén, så
  // hallen själv (36 x 23 m) låg delvis utanför; nu är hallens hörn med i bilden.
  if (sim.dayCfg.evac) {
    const b = sim.route.base, pts = [[b.x, b.z]];
    for (const g of sim.dayCfg.evac.groups) { const d = houseDoor(sim.map, g.house, sim.route); pts.push([d.x, d.z]); }
    const hr = sim.map.iceRink;
    if (hr?.at) for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push(hr.at(sx * hr.len / 2, sz * hr.wid / 2));
    return rig.fit(pts, 6);
  }
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
  const report = dayReport(sim);
  const before = progress;
  const f = finishOpDay(progress, { mapId: map.id, day, won, intelEarned: sim.intelEarned, report, evac: sim.evac });
  progress = f.progress;
  save();
  // förlusterna per enhet (bara intressanta vid vinst; vid förlust står styrkan kvar)
  const losses = (report?.units ?? []).map(u => {
    const unit = before.op.units.find(x => x.uid === u.uid);
    return { name: unit ? unitName(unit) : '?', men: unit?.men != null && u.alive != null ? unit.men - u.alive : 0, destroyed: !!u.destroyed };
  });
  lastResult = {
    won, day, rp: f.rp, attempt: f.attempt, kills: sim.kills, lostBy: sim.lostBy ?? null, evac: sim.evac ? { ...sim.evac } : null,
    wavesCleared: sim.waveIndex, waves: sim.dayCfg.waves.length, lastDay: day >= map.days.length, losses,
  };
  showResult();
}
function showResult() {
  const outro = map.outro ? { text: map.outro.text, withdraw: !!map.outro.withdraw, name: map.name, from: FROM_NAME[map.outro.from ?? 'FM'] } : null;
  setMode('result', () => dayResultPanel(uiRoot, { ...lastResult, totalRp: progress.rp, outro }, {
    // 0.14.1: Try again går genom förrådet (RP:n från förlusten), Deploy startar dagen igen
    onRetry: () => showDepot(map.id, 'result', { day }),
    onOpMap: () => showOpMap(),
    onMenu: showMenu,
  }));
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
  for (const sel of ['#day', '#res', '#hint', '#buildbar', '#go', '#wavebar', '#speedcd', '#minimap:not(.off)', '#evac']) {
    const n = uiRoot.querySelector(sel);
    if (!n || n.hidden) continue;
    const r = n.getBoundingClientRect();
    if (r.width) out.push({ x0: r.left - PAD, y0: r.top - PAD, x1: r.right + PAD, y1: r.bottom + PAD });
  }
  // Knappen och raden nere i mitten byter med fasen; hela den ytan hålls fri.
  out.push({ x0: innerWidth / 2 - 320, y0: innerHeight - (sim?.evac ? 140 : 90), x1: innerWidth / 2 + 320, y1: innerHeight });
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

// 0.14.1 (speltestet av 0.14.0: utan ?debug gick klockan inte att driva): med ?test finns bara klockan och
// läget, inget låses upp och inget ändras i framsteget. ?debug har allt nedan.
function advanceSim(secs) { for (let t = 0; t < secs / DT && mode === 'play' && (sim.phase === 'wave' || sim.phase === 'build'); t++) { step(sim, DT); handleEvents(); } }
if (TEST && !DEBUG) window.__horde = { advance: advanceSim, get sim() { return sim; }, get mode() { return mode; }, get progress() { return progress; }, get version() { return VERSION; } };
// Felsökning och prestandamätning i konsolen, bara med ?debug i adressen.
if (DEBUG) window.__horde = { startRotate, get rotating() { return rotating; }, commitRotate, guideMove, get aim() { return aim; }, groundAt, moveRoute, get chord() { return chord; }, get worlds() { return worlds; }, get speed() { return speed; }, setSpeed, get routeLines() { return routeLines; }, get placing() { return placing; }, get spot() { return spot; }, startPlacing, stopPlacing, placeHere, get sim() { return sim; }, get progress() { return progress; }, get mode() { return mode; }, get selected() { return selected; }, get hovered() { return hovered; }, set hovered(v) { hovered = v; }, get view() { return view; }, audio, get rig() { return rig; }, get scene() { return scene; }, get camera() { return camera; }, renderer, actions, go, startDay, setMode, loadMap, toggleSpeed, sheetAction,
  // 0.12.0: byt bana som menyn gör (prov och skärmbilder)
  pickMap: id => { progress = selectMap(progress, id); return loadMap(id); },
  open, jump: (...a) => debugJump(...a), get pointer() { return pointer; }, get minimap() { return minimap; },
  showDepot: (...a) => showDepot(...a), showResult: () => showResult(), setProgress: v => { progress = v; save(); },
  // simuleringen framåt utan att vänta (prov och skärmbilder); vyn ritas i nästa bildruta
  advance: advanceSim };

// Jump to i debugmenyn (och __horde.jump med ?debug): dagen med sektorerna före räknade som klara.
async function debugJump(mapId, d, wave) {
  if (!MAPS[mapId]) return;
  // 0.14.0: sektorerna före räknas som klara, så att leveranserna och trupperna finns där
  progress = selectMap(debugReach(progress, mapId, Math.max(1, Math.round(d) || 1)), mapId); save();
  await loadMap(mapId);
  startDay(Math.max(1, Math.min(map.days.length, Math.round(d) || 1)));
  sheetAction('go');
  if (wave > 1) debugJumpWave(sim, wave);
}
// ---------- debugmenyn (0.12.2, Olas önskan) ----------
// Fem snabba klick på versionsnumret (hörnet eller menyn) öppnar den; med ?debug finns knappen DEBUG.
// 0.14.0: forskningens förval blir förrådets (debugDepot): none, arrival (src/data/arrival.js) eller all.
function applyDepot(preset) {
  progress = debugDepot(progress, preset, ARRIVAL[map.id] ?? []); save();
  if (sim) sim.research = new Set(progress.research);
  return { ok: true };
}
const overlays = new Map();
const debugUi = mountDebug(uiRoot, {
  sim: () => sim, progress: () => progress, map: () => map, day: () => day,
  maps: () => Object.values(MAPS).map(m => ({ id: m.id, name: m.name })),
  spawns: () => map?.spawns ?? [],
  houses: () => {
    const today = new Set((sim?.dayCfg.dormant ?? []).map(d => d.house));
    const all = (map?.lots?.plots ?? []).filter(p => p.house && p.id).map(p => ({ id: p.id, label: p.id + (today.has(p.id) ? ' (today)' : '') }));
    return [...all.filter(h => today.has(h.id)), ...all.filter(h => !today.has(h.id))];
  },
  setIntel: v => { if (!Number.isFinite(v)) return { ok: false }; progress = { ...progress, rp: Math.max(0, Math.round(v)) }; save(); return { ok: true }; },
  setResearch: preset => applyDepot(preset),
  setCash: v => { if (!sim || !Number.isFinite(v)) return { ok: false }; sim.cash = Math.max(0, Math.round(v)); return { ok: true }; },
  setBaseHp: v => { if (!sim || !Number.isFinite(v)) return { ok: false }; sim.baseHp = Math.max(1, Math.round(v)); return { ok: true }; },
  jump: debugJump,
  unlockAll: () => {
    const maps = { ...progress.maps };
    for (const m of Object.values(MAPS)) { const st = mapState(progress, m.id); maps[m.id] = { ...st, unlockedDay: Math.max(st.unlockedDay, m.days.length + 1) }; }
    progress = { ...progress, maps }; save();
    return { ok: true };
  },
  resetSave: () => {
    const ok = resetSave(newCampaign());
    progress = loadProgress();
    loadMap(progress.mapId).then(() => showMenu());
    return { ok };
  },
  tweaks: () => dbg.tweaks,
  setTweaks: t => { dbg.tweaks = normalizeTweaks(t); saveDebug(dbg); if (sim) sim.tweaks = dbg.tweaks; },
  spawn: (type, n, spawnId) => (sim && mode === 'play' ? debugSpawn(sim, { type, count: n, spawn: spawnId || undefined }) : { ok: false }),
  burst: house => (sim && mode === 'play' && house ? debugBurst(sim, house) : { ok: false }),
  visuals: () => ({ ...dbg.visuals, routes: showRoute, minimap: minimap.visible }),
  setVisual: (k, on) => {
    if (k === 'routes') { showRoute = on; hud.routeKey(mode === 'play' && sim?.route.kind === 'grid', showRoute); }
    else if (k === 'minimap') { minimap.toggle(on); try { localStorage.setItem(MM_KEY, on ? 'on' : 'off'); } catch { /* ingen lagring */ } }
    else { dbg.visuals[k] = on; saveDebug(dbg); }
  },
});
if (DEBUG) debugUi.reveal();
versionClicks(document.getElementById('ver'), () => debugUi.open());
uiRoot.addEventListener('click', e => { if (e.target.closest?.('.v') && e.target.closest('.sheet')) verClick(); });
let verTimes = [];
function verClick() {
  const t = performance.now();
  verTimes = verTimes.filter(x => t - x < 1600); verTimes.push(t);
  if (verTimes.length >= 5) { verTimes = []; debugUi.open(); }
}
let fpsT = 0, fpsN = 0, fpsText = '';
function updateDebug(dt) {
  debugUi.update(dt);
  if (scene) {
    let ov = overlays.get(scene);
    if (!ov && (dbg.visuals.los || dbg.visuals.grid)) { ov = createDebugOverlay(scene); overlays.set(scene, ov); }
    ov?.update(mode === 'play' ? sim : null, dbg.visuals);
  }
  if (dbg.visuals.fps) {
    fpsT += dt; fpsN++;
    if (fpsT >= 0.5) { const i = renderer.info.render; fpsText = `${Math.round(fpsN / fpsT)} fps · ${i.calls} draws · ${Math.round(i.triangles / 1000)}k tris`; fpsT = 0; fpsN = 0; }
  }
  debugUi.showFps(dbg.visuals.fps, fpsText);
}

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
  if (placing && (!canPlaceNow() || (placing.move ? !sim.guns.some(g => g.id === placing.move) : ['locked', 'absent'].includes(buyState(sim, placing.type).state)))) stopPlacing();
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
  updateArcFlags();
  updateSpare();
  if (mode === 'play') minimap.update(frameDt, { sim, view: viewOnGround(), spawns: sim.route.kind === 'grid' ? activeSpawns().ids : [], alerts });
  rig.active = mode === 'play' && !paused;
  const vdt = paused ? 0 : frameDt;   // pausad: zombier, effekter och skak står stilla
  rig.update(vdt);
  shakeCamera(vdt);
  const tiles = updateRoutes();
  routeLines.update(vdt);
  const pu = placementUi();
  const rot = updateRotate();
  updateEvac();
  view.setUi({ selected: rot ? { kind: 'gun', id: rotating.id } : selected, hover: placing ? (placing.kind === 'obstacle' && spot?.key >= 0 ? { kind: 'cell', id: spot.key } : null) : hovered,
    range: rot ? null : pu.range || panelRange || rangeFor(hovered) || rangeFor(selected), tiles: pu.tiles || (placing ? null : tiles),
    ghost: pu.ghost, cover: rot ? null : pu.cover, obGhost: pu.obGhost, sector: rot ?? pu.sector ?? (pu.ghost?.cone ? pu.ghost : null), marks: placing?.kind === 'obstacle', squadRange: pu.squadRange ?? null,
    route: aimLine() ?? moveRoute(), valid: validTint(),
    snap: placing && spot?.ok && spot.fx != null && !aim?.drag ? { from: [spot.fx, spot.fz], to: [spot.x, spot.z] } : null });
  view.setZoom(rig.view);
  view.sync(vdt);
  audio.update(frameDt, sim, { paused, mode, mapId: map.id, speed: running ? speed : 1, toScreen, zombiePos: z => zombiePos(sim, z) });
  updateWorld(frameDt, time);
  renderer.render(scene, camera);
  updateDebug(frameDt);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.__hordeReady = true;   // laddningsskyddet i index.html: från nu är vanliga fel inte cachefel
