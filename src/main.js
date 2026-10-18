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
import { dangerZones, coverSpots } from './sim/evac-danger.js';
import { mountTrain } from './ui/train.js';
import { createRouteLines } from './render/route-lines.js';
import { mountHud, waveText, comingBySpawn } from './ui/hud.js';
import { rerouteStreet, streetAt } from './sim/streets.js';
import { gunPanel, cellPanel, buildBar, reasonText, dayIntro, dayResultPanel, mainMenu, note, clearNoteQueue } from './ui/panels.js';
import { opMapSheet, depotSheet, nextDay } from './ui/operation.js';
import { shopItem, dayMenu, BUY_MENU } from './data/shop.js';
import { WEAPONS } from './data/weapons.js';
import { OBSTACLES } from './data/obstacles.js';
import { buyState, inBar } from './sim/buy.js';
import { abandonDay, mapState, mapUnlocked, selectMap, hintSeen, markHintSeen } from './meta/progress.js';
import { metaFeatures, dayStage, STAGES, stageReached } from './meta/unlocks.js';
import { isSeen, markSeen, shows, tipsMode, setMode as setTipsMode, resetTips, markAllSeen, manualUnlocked, manualNew, markRead as markManualRead, lessonsOf } from './meta/lessons.js';
import { LESSONS, TIPS, ENEMIES, REVEALS, REPEAT_GAP, manualEntry } from './data/lessons.js';
import { createCoach, enemyCard, manualSheet } from './ui/coach.js';
import { portraitOf } from './render/portrait.js';
import { VET_WINS } from './data/depot.js';
import { newCampaign, opStartConfig, finishDay as finishOpDay, markRead, requisition, levelUp, refill, returnUnit, reassign, buyUpgrade, debugDepot, debugReach, unitName, sendUnit, bringBack, currentMap } from './meta/operation.js';
import { FROM_NAME, sectorOf } from './data/depot.js';
import { loadProgress, saveProgress, resetSave } from './meta/save.js';
import { loadDebug, saveDebug } from './meta/debug-store.js';
import { mountDebug, versionClicks } from './ui/debug.js';
import { createDebugOverlay } from './render/debug-overlay.js';
import { ARRIVAL } from './data/arrival.js';
import { allowed, canDeploy, readyCount, barricadeId, BARRICADE_FAILING, gunCount, createSim, dayReport, buySupply, deployPhase, frontage, startWave, step, build, upgrade, sell, placeAcross, removeObstacle, acrossCells, zombiePos, buyKit, callNextWave, checkSpot, sightFor, checkObstacle, onRoof, reinforce, squadPreview, squadRoom, moveGun, checkMove, movePreview, normalizeTweaks, debugSpawn, debugBurst, debugJumpWave, rotateGun, checkRotate, crewPathTo, canMoveType, houseDoor, evacOutcome } from './sim/sim.js';
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
// 0.17.1 (speltestet av 0.17.0: "Loading Hagstumosse · Ishallen" när Mölnbo öppnades): skylten säger alltid banan
// spelaren väntar på (loadTarget), också medan en annan bana byggs färdigt före den.
let loadTarget = null;
function showLoading(name, step, frac) {
  loading.hidden = false;
  loading.querySelector('.t').textContent = 'Loading ' + (loadTarget ?? name);
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
  w.routeLines = createRouteLines(w.scene, { heightAt: m.groundY ?? null });   // 0.17.0-molnbo: vägen följer bron
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
let loadingId = null;
async function loadMap(id) {
  const m = MAPS[id] ?? MAPS.riksvagen;
  // 0.17.1: en bana som byggs färdigt först, sedan den som efterfrågades (förut lämnades den nya begäran bort och
  // den gamla banans namn stod kvar på skylten)
  while (loadingMap) {
    if (loadingId === m.id) return loadingMap;
    loadTarget = m.name;
    if (!loading.hidden) loading.querySelector('.t').textContent = 'Loading ' + m.name;
    try { await loadingMap; } catch { /* den förra banan; den här provas ändå */ }
  }
  if (map && map.id === m.id) { if (loadTarget === m.name) loadTarget = null; return; }
  loadingId = m.id; loadTarget = m.name;
  loadingMap = (async () => {
    let w = worlds.get(m.id);
    if (!w) { w = await buildMapWorld(m); worlds.set(m.id, w); }
    if (rig) rig.active = false;
    map = w.map; stage = w.stage; scene = w.scene; camera = w.camera; rig = w.rig; view = w.view; routeLines = w.routeLines;
    day = Math.min(mapState(progress, map.id).unlockedDay, map.days.length);
    sim = createSim(withTweaks(opStartConfig(progress, day, map.id) ?? opStartConfig(newCampaign(), 1, 'riksvagen')));
    view.setSim(sim);
    minimap.reset(sim);
    stage.resize(); rig.apply(); rig.goHome();
    routeKeys.now = routeKeys.preview = routeKeys.evac = null;
    sightCache.clear();
    // en bildruta med den nya banan innan skylten tas bort
    await nextFrame();
    loading.hidden = true;
  })();
  try { await loadingMap; } finally { loadingMap = null; loadingId = null; if (loadTarget === m.name) loadTarget = null; }
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
  // 0.16.2 (speltestet av 0.16.1: "mitt andra klick avmarkerade kortet"): samma kort igen släpper inte saken. I
  // låg bildtakt syns inte att det första klicket tog, och ett andra klick lade förut tillbaka saken, så att nästa
  // klick på kartan inte gjorde något. Esc eller högerklick lägger tillbaka.
  if (placing?.type === type && !placing.move) { flashTip(reasonText('i handen')); return; }
  const st = buyState(sim, type).state;
  // 0.16.4 (Olas: taket ska synas): vid taket säger klicket varför, med siffrorna
  if (st !== 'ok') { bar.shake(type); audio.ui('deny'); if (st === 'out') flashTip(reasonText('ute')); else if (st === 'full' && sim.core) flashTip(`Sector full: ${sim.guns.length} / ${frontage(sim)} deployed. The rest wait in reserve.`); return; }
  closePanel();
  audio.ui('pick');
  placing = { type, kind: shopItem(type).kind };
  if (type === 'psg90') tip('tip.roof');
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
    // 0.16.0 (textgenomgången, speltestet av 0.14.2): E4 har markerade rutor för hindren, inte gatan
    if (key == null || key < 0) return { key: -1, ok: false, reason: sim.map.id === 'riksvagen' ? 'markerad-hinder' : 'ingen gata' };
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
// 0.16.2: varje försök att ställa ut med något i handen och hur det gick (__horde.placeLog med ?debug eller ?test)
const placeLog = [];
function logPlace(e) { placeLog.push({ t: Math.round(performance.now()), type: placing?.type ?? null, ...e }); if (placeLog.length > 200) placeLog.shift(); }
function placeHere(p) {
  const sp = typeof p === 'object' ? spotFor(p.id, p.x, p.z, p.roof, p.rt) : spotFor(p);
  const key = sp.key;
  if (!sp.ok) { logPlace({ out: 'reason', key, reason: sp.reason }); flashTip(reasonText(sp.reason)); audio.ui('deny'); return; }
  const type = placing.type;
  // 0.16.2: riktningen räknas från rutan som klicket gäller, inte från rutan som hovringen senast räknade
  spot = sp;
  if (placing.move) {
    const r = actions.move(placing.move, key, hasCone() ? aimFacing() : null, placing.via ?? []);
    if (!r.ok) { logPlace({ out: 'reason', key, reason: r.reason }); flashTip(reasonText(r.reason)); return; }
    logPlace({ out: 'moved', key });
    stopPlacing(); placedAt = performance.now();
    return;
  }
  const r = placing.kind === 'obstacle' ? actions.place(key, type) : actions.build(key, type, hasCone() ? aimFacing() : null);
  if (!r.ok) { logPlace({ out: 'reason', key, reason: r.reason }); flashTip(reasonText(r.reason)); return; }
  logPlace({ out: 'placed', key });
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
  // 0.16.0: sikta-dra är upplåst från E4 dag 3; före det ger ett klick riktningen mot vägen
  if (!hasCone() || !feat('aim') || (placing.move && e.shiftKey)) return;
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
  if (!canMoveType(g.weapon.type)) { flashTip(reasonText('fast')); audio.ui('deny'); tip('tip.mounted'); return; }
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
}, { heightAt: () => map?.groundY ?? null, ignoreClick: () => { const d = rig.takeDrag(), s0 = takeSuppress(); if ((d || s0) && placing) logPlace({ out: d ? 'ignored-pan' : 'ignored-aim' }); return d || s0; } });
picker.onPick(p => mapPick(p));
function mapPick(p) {
  if (mode !== 'play' || sim.phase === 'won' || sim.phase === 'lost') { if (placing) logPlace({ out: 'ignored-phase' }); return; }
  if (rotating) { commitRotate(); return; }
  // 0.13.0 (H136): Shift-klick lägger en waypoint på flyttens väg
  if (placing?.move && shiftHeld && p?.kind === 'spot') { addWaypoint(p); return; }
  // 0.16.1 (speltestet av 0.16.0: "flera klick med valt kort gjorde ingenting"): ett klick som inte träffar en
  // ruta säger också varför, vid pekaren
  if (placing) { if (p?.kind === 'spot') placeHere(p); else { logPlace({ out: 'reason', reason: 'utanför' }); flashTip(reasonText('utanför')); audio.ui('deny'); } return; }
  if (p) open(p); else closePanel();
}
// 0.16.2 (speltestet av 0.16.1, tre speltester i rad: "ungefär var tredje placering gav ingenting"): ett klick
// på kartan går aldrig förlorat. I låg bildtakt hinner en lektionsplåt (eller ett annat lager) komma upp mellan
// två bilder, och klicket som spelaren menade för kartan eller köpraden landade på plåten. Plåten släpps och
// klicket går vidare till det som ligger under (scripts/placement-harness.mjs).
function forwardClick(x, y) {
  const hid = coach.el.hidden;
  coach.el.hidden = true;
  const under = document.elementFromPoint(x, y);
  coach.el.hidden = hid;
  if (under === renderer.domElement) { mapPick(picker.pickAt(x, y)); return; }
  const btn = under?.closest?.('button');
  if (btn && !btn.closest('#coach')) btn.click();
}
// Med något i handen: ett klick på något i gränssnittet som inte gör något säger det vid pekaren
const CLICKABLE = 'button, a, input, select, label, .card, .panel, #minimap, .pip, .sqtag, .arcflag, .entry, #basearrow, #coach, #enemycard, #pausemenu, .sheet, #debug, #manual';
addEventListener('click', e => {
  if (!placing || mode !== 'play' || e.button !== 0) return;
  const t = e.target;
  if (t === renderer.domElement || !(t instanceof Element) || t.closest(CLICKABLE) || !t.closest('#ui')) return;
  logPlace({ out: 'reason', reason: 'gränssnitt' });
  flashTip(reasonText('gränssnitt')); audio.ui('deny');
}, true);
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
// 0.17.0-molnbo: tågklockan (src/ui/train.js), samma plats som evakueringens ruta
const trainUi = mountTrain(uiRoot);
function updateEvac() {
  trainUi.update(sim, mode);
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
// 0.16.0 (textgenomgången): "Supplies to spare. Click a unit." när förnödenheterna på enheten är upplåsta (South
// dag 5). Den gamla raden om U och forskningen är borta (uppgraderingarna köps i förrådet).
function updateSpare() {
  if (mode === 'play' && sim.core && sim.phase === 'wave' && sim.cash >= 320) tip('tip.spare');
}
function updatePips() {
  const occ = mode === 'play' && !placing ? view.occluded : new Map();
  for (const [id, el] of pipEls) if (!occ.has(id)) { el.remove(); pipEls.delete(id); }
  for (const [id, p] of occ) {
    let el = pipEls.get(id);
    if (!el) {
      el = document.createElement('button'); el.type = 'button'; el.className = 'pip'; el.title = 'Behind a building: click to select';
      // 0.16.4 (speltestet av 0.16.2: ett klick på "VOL 3" med en enhet i handen gav ingenting): med något i handen går
      // klicket igenom till kartan (placeringen), annars väljs gruppen
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        if (mode !== 'play') return;
        if (placing || rotating) { const v = el.style.visibility; el.style.visibility = 'hidden'; const under = document.elementFromPoint(e.clientX, e.clientY); el.style.visibility = v; if (under === renderer.domElement) mapPick(picker.pickAt(e.clientX, e.clientY)); return; }
        open({ kind: 'gun', id });
      });
      pips.appendChild(el); pipEls.set(id, el);
    }
    tmpV.set(p.x, p.y, p.z).project(camera);
    el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
    el.classList.toggle('sel', selected?.kind === 'gun' && selected.id === id);
  }
}

// ---------- gruppernas märken (0.16.1, H194) ----------
// Speltesterna av 0.14.2 och 0.16.0: "frivilliga är små gula prickar som knappt syns, och jag ser inte om de skjuter",
// "Hemvärnet kunde jag knappt se efteråt". Över varje grupp (de frivilliga och Hemvärnet) står ett litet märke i
// gruppens färg med kortnamnet och hur många som står, som lyser upp när gruppen skjuter. Klick väljer gruppen.
const squadTags = new Map();
const SQUAD_TAG = { civ: { t: 'VOL', cls: 'civ' }, hv: { t: 'HV', cls: 'hv' } };
const shotAt = new Map();
function updateSquadTags() {
  const want = mode === 'play' && !placing ? sim.guns.filter(g => g.squad && SQUAD_TAG[g.weapon.type] && g.soldiers.length) : [];
  const ids = new Set(want.map(g => g.id));
  for (const [id, el] of squadTags) if (!ids.has(id)) { el.remove(); squadTags.delete(id); }
  for (const g of want) {
    let el = squadTags.get(g.id);
    if (!el) {
      const d = SQUAD_TAG[g.weapon.type], id = g.id;
      el = document.createElement('button'); el.type = 'button'; el.className = 'sqtag ' + d.cls;
      el.innerHTML = `<b>${d.t}</b><i></i>`;
      // 0.16.4 (speltestet av 0.16.2: ett klick på "VOL 3" med en enhet i handen gav ingenting): med något i handen går
      // klicket igenom till kartan (placeringen), annars väljs gruppen
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        if (mode !== 'play') return;
        if (placing || rotating) { const v = el.style.visibility; el.style.visibility = 'hidden'; const under = document.elementFromPoint(e.clientX, e.clientY); el.style.visibility = v; if (under === renderer.domElement) mapPick(picker.pickAt(e.clientX, e.clientY)); return; }
        open({ kind: 'gun', id });
      });
      pips.appendChild(el); squadTags.set(id, el);
    }
    const up = g.soldiers.filter(q => !q.down);
    const cx = up.reduce((a, q) => a + q.x, 0) / (up.length || 1), cz = up.reduce((a, q) => a + q.z, 0) / (up.length || 1);
    tmpV.set(up.length ? cx : g.x, 2.4, up.length ? cz : g.z).project(camera);
    el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
    const n = String(up.length);
    const ni = el.querySelector('i'); if (ni.textContent !== n) ni.textContent = n;
    el.classList.toggle('fire', time - (shotAt.get(g.id) ?? -Infinity) < 0.35);
    el.classList.toggle('sel', selected?.kind === 'gun' && selected.id === g.id);
  }
}

// ---------- mål utanför vinkeln (0.14.1, granskningen av 0.14, Important 5) ----------
// En liten gul flagga "R" över en pjäs som stått sysslolös med zombier i sikte men utanför vinkeln
// (simuleringens idleOutside), en ping på minikartan första gången och klick väljer pjäsen.
const arcFlags = new Map(), arcPinged = new Map();
function updateArcFlags() {
  const want = mode === 'play' && !placing && feat('rotate') ? sim.guns.filter(g => g.idleOutside && rotating?.id !== g.id) : [];
  const ids = new Set(want.map(g => g.id));
  for (const [id, el] of arcFlags) if (!ids.has(id)) { el.remove(); arcFlags.delete(id); }
  for (const g of want) {
    let el = arcFlags.get(g.id);
    if (!el) {
      // 0.14.2 (speltestet av 0.14.1: "flaggan är liten, ungefär 12 punkter"): större, med en vridpil och R
      el = document.createElement('button'); el.type = 'button'; el.className = 'arcflag'; el.innerHTML = '<i>&#8635;</i><b>R</b>';
      el.title = 'Target outside arc. Press R to rotate.';
      const id = g.id;
      // 0.16.4 (speltestet av 0.16.2: ett klick på "VOL 3" med en enhet i handen gav ingenting): med något i handen går
      // klicket igenom till kartan (placeringen), annars väljs gruppen
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        if (mode !== 'play') return;
        if (placing || rotating) { const v = el.style.visibility; el.style.visibility = 'hidden'; const under = document.elementFromPoint(e.clientX, e.clientY); el.style.visibility = v; if (under === renderer.domElement) mapPick(picker.pickAt(e.clientX, e.clientY)); return; }
        open({ kind: 'gun', id });
      });
      pips.appendChild(el); arcFlags.set(g.id, el);
      tip('tip.arc');
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
    l.frac = o.breached ? 0 : Math.min(l.frac, Math.max(0, o.hp) / o.maxHp); l.x += c.x; l.z += c.z; l.n++;
    if (o.breached) l.breached = true;
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
    tmpV.set(l.x, 2.2 + (map.groundY ? map.groundY(l.x, l.z) : 0), l.z).project(camera);
    el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
    el.firstChild.style.width = Math.round(l.frac * 100) + '%';
    el.classList.toggle('low', l.frac < FAILING);
    el.classList.toggle('breached', !!l.breached);
  }
  for (let i = alerts.length - 1; i >= 0; i--) if (alerts[i].until < time) alerts.splice(i, 1);
}
// 0.16.1 (speltestet av 0.16.0: "andra infarten på E4 dag 2 kommer utan förvarning, basen 14 till 3"): en ingång som
// inte använts tidigare (inte i en tidigare dag på banan, inte i en tidigare våg i dag) sägs före vågen: en rad,
// minikartan pingar ingången och hordens väg därifrån blinkar. Etiketten vid infarten står där som vanligt.
const toldSpawns = new Set();
function spawnsOf(waves) { const first = sim.route.spawns[0]?.id; return new Set(waves.flatMap(w => w.groups.map(g => g.spawn ?? first))); }
let newsUntil = -Infinity;
function updateNewSpawn() {
  if (mode !== 'play' || sim.route.kind !== 'grid' || sim.phase !== 'build') return;
  const idx = sim.wavesStarted, waves = sim.dayCfg.waves;
  if (!waves[idx] || (day === 1 && idx === 0)) return;
  const known = spawnsOf([...sim.map.days.slice(0, day - 1).flatMap(d => d.waves), ...waves.slice(0, idx)]);
  for (const id of spawnsOf([waves[idx]])) {
    if (known.has(id) || toldSpawns.has(id)) continue;
    toldSpawns.add(id);
    const sp = sim.map.spawns?.find(q => q.id === id), at = sim.route.spawns.find(q => q.id === id);
    // 0.16.2 (speltestet av 0.16.1: raden stod ca 5 s och krockade med fartknappens tips): 8 s, och inga andra
    // tips eller bildtexter börjar medan den står (newsUntil)
    // 0.16.4: en förvarnad ingång (E4 dag 2) säger att det är nu; lektionen om Move får komma samtidigt
    const told = (sim.dayCfg.foretell ?? []).includes(id);
    note(uiRoot, told ? `Next wave: they also come from ${sp?.from ?? sp?.name ?? id}.` : sp?.from ? `They're also coming from ${sp.from}.` : `They're also coming along ${sp?.name ?? id}.`, 'warn', { prio: true, ms: 8000 });
    if (!told) newsUntil = performance.now() + 8000;
    routeFlash = 4;
    if (at) alerts.push({ x: at.x, z: at.z, until: time + 10, kind: 'spawn' });
  }
}
function barricadeBroken(ev) {
  // en lucka i spärren räcker för horden: första rutan som går sönder säger det, en gång per spärr
  const id = ev.line != null ? 'l' + ev.line : 'c' + ev.cell;
  if (failingWarned.has('down:' + id)) return;
  failingWarned.add('down:' + id);
  // 0.17.1: var spärren gick sönder (gatan), och att resten av spärren inte stoppar någon längre
  const c = sim.route.cellCenter(ev.cell), street = sim.route.kind === 'grid' ? streetAt(sim.map, c.x, c.z) : null;
  note(uiRoot, street ? `Barricade down on ${street}. They are through the gap.` : 'Barricade down. They are taking another way.', 'warn');
  routeFlash = 4;
  alerts.push({ x: c.x, z: c.z, until: time + 8, kind: 'barricade' });
}

// En enda väg för händelser: efter varje step och efter startWave/callNextWave.
function handleEvents() {
  const evs = sim.events;
  view.consume(evs);
  audio.consume(evs, sim, toScreen);
  if (evs.some(e => e.t === 'breach')) onBreach();
  for (const e of evs) if (e.t === 'shot' && e.soldier != null) shotAt.set(e.gunId, time);
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
    else if (ev.t === 'civilianDown') { if (!isSeen(progress, 'tip.civ')) tip('tip.civ', [ev.x, ev.z]); else if (time - civToldAt > 3) { civToldAt = time; note(uiRoot, 'A civilian is down!', 'warn'); } civilianLost(ev); }
    else if (ev.t === 'civilianSafe' && ev.safe === 1) note(uiRoot, 'The first civilians are inside the ice rink.');
    else if (ev.t === 'civilianClimb' && !climbTold) { climbTold = true; note(uiRoot, 'No way round: civilians are climbing over your barricade.', 'warn'); }
    else if (ev.t === 'evacDone') note(uiRoot, 'The civilians are inside the ice rink.');
    // 0.17.0-molnbo: tåget går (Mölnbo dag 3 till 5)
    else if (ev.t === 'trainGone') { scene.userData.molnbo?.depart(); note(uiRoot, ev.last ? 'The last train north is away. Mölnbo held.' : 'The train is away with everyone on board.'); }
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
  if (mode !== 'play' || card || manual) return;
  // 0.16.0: under ett lektionssteg startar mellanslaget inget, utom när steget är att starta vågen
  if (lesson?.pause && lesson.step.target?.ui !== '#go') return;
  if (sim.phase === 'build' && sim.nextWaveIn == null) {
    const left = sim.reserve?.filter(u => canDeploy(sim, u)).length ?? 0;
    if (deployPhase(sim) && left && sim.guns.length < frontage(sim) && !reserveWarned) {
      reserveWarned = true;
      // 0.16.0 (textgenomgången): reserven och frontbredden finns från North dag 3
      note(uiRoot, feat('frontage') ? 'Units left in reserve. Start anyway?' : 'Units not placed yet. Start anyway?', 'warn');
      return;
    }
    if (!startWave(sim)) return;
  } else {
    const r = callNextWave(sim, { stack });
    if (!r.ok) { nextDenied(r); return; }
  }
  handleEvents();
}
// 0.16.2 (speltestet av 0.16.1: "NEXT WAVE IN-knappen ser klickbar ut men gör ingenting"): knappen och mellanslaget
// säger varför nästa våg inte kommer nu, vid knappen
function nextDenied(r) {
  const secs = sim.nextWaveIn != null ? Math.max(0, Math.ceil(sim.nextWaveIn - 1e-6)) : null;
  const text = r.reason === 'låst' ? (secs != null ? `It comes by itself in ${secs}s` : 'It comes by itself')
    : r.reason === 'kvar' ? `Clear this wave first: ${r.left} still out. Shift+Space calls it anyway`
    : null;
  if (!text) return;
  const btn = document.getElementById('go');
  const wb = document.getElementById('wavebar');
  const at = [btn, wb].find(n => n && !n.hidden && n.getBoundingClientRect().width)?.getBoundingClientRect();
  tipFlash = { text, until: performance.now() + 2200, x: at ? at.left + 4 : pointer.x, y: at ? at.top - 44 : pointer.y };
  audio.ui('deny');
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
let speedShown = true;
function toggleSpeed() {
  if (menu.isOpen() || !speedShown) return;
  setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]);
}

// ---------- basen tar skada ----------
let lastBaseToast = -Infinity, lastBreach = -Infinity, shakeT = 0, shakeLen = SHAKE_TIME, shakeAmp = SHAKE_AMP;
function onBreach() {
  hud.baseHit();
  lastBreach = time;
  shake(SHAKE_TIME, SHAKE_AMP);
  if (time - lastBaseToast >= BASE_TOAST_GAP) { lastBaseToast = time; note(uiRoot, 'Base under attack!', 'warn'); }
  tip('tip.base');
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

// ---------- basen utanför bild (0.16.1, H190) ----------
// Speltestet av 0.14.2: "basen föll 20 till 9 medan jag tittade på ett tomt villakvarter". När basen tar skada och
// inte syns står en pil vid skärmkanten som pekar dit, med basens hälsa som pulserar; klick på pilen eller B (Home)
// flyttar kameran till basen.
const baseArrow = document.createElement('button');
baseArrow.type = 'button'; baseArrow.id = 'basearrow'; baseArrow.hidden = true;
baseArrow.innerHTML = '<span class="chev"><i></i></span><span class="txt">Base <b></b></span><kbd>B</kbd>';
baseArrow.addEventListener('click', () => goToBase());
uiRoot.appendChild(baseArrow);
const BASE_ARROW_S = 5, BASE_EDGE = 70;
function baseCenter() {
  const pts = baseShape();
  return { x: pts.reduce((a, p) => a + p[0], 0) / pts.length, z: pts.reduce((a, p) => a + p[1], 0) / pts.length };
}
function updateBaseArrow() {
  const show = mode === 'play' && !!sim && !menu.isOpen() && time - lastBreach < BASE_ARROW_S && sim.phase !== 'won' && sim.phase !== 'lost';
  const c = show && baseCenter(), s = show && onScreen(c.x, c.z, 40);
  if (!show || s.in) { baseArrow.hidden = true; return; }
  const cx = innerWidth / 2, cy = innerHeight / 2, dx = s.sx - cx, dy = s.sy - cy;
  const k = Math.min(Math.abs((cx - BASE_EDGE) / (dx || 1e-6)), Math.abs((cy - BASE_EDGE - 40) / (dy || 1e-6)));
  baseArrow.hidden = false;
  baseArrow.style.left = (cx + dx * k) + 'px'; baseArrow.style.top = (cy + dy * k) + 'px';
  baseArrow.querySelector('.chev').style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  const b = baseArrow.querySelector('b'), hp = String(Math.max(0, Math.ceil(sim.baseHp)));
  if (b.textContent !== hp) { b.textContent = hp; baseArrow.classList.remove('pulse'); void baseArrow.offsetWidth; baseArrow.classList.add('pulse'); }
}
function goToBase() {
  if (mode !== 'play' || !sim || !rig?.canPan) return;
  const c = baseCenter();
  rig.focus(c.x, c.z, Math.min(rig.view, sim.map.camera.zoom?.[1] ?? rig.view));
  audio.ui('click');
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
  if (sim.route.kind === 'grid') { hud.entry(gridEntries(), unitPoints(), { covers: coversGround, holding: !!placing || !!rotating }); return; }
  if (sim.phase !== 'wave') { hud.entry(null); return; }
  const alive = sim.zombies.filter(z => !z.dead);
  if (!alive.length && !sim.spawnQueue.length) { hud.entry(null); return; }
  const seen = alive.some(z => { const p = zombiePos(sim, z); return onScreen(p.x, p.z, 10).in; });
  if (seen) { hud.entry(null); return; }
  entryAt = entryAt || findEntry();
  hud.entry(entryAt, unitPoints());
}
// 0.16.1 (H191, speltestet av 0.14.2: "etiketten lade sig över just den mark jag ville placera på"): ligger mer
// än en av nio punkter i etikettens ruta på öppen mark där enheter får stå?
function coversGround(r) {
  const p = sim.place;
  let n = 0;
  for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.15, 0.5, 0.85]) {
    const g = groundAt(r.x0 + (r.x1 - r.x0) * fx, r.y0 + (r.y1 - r.y0) * fy);
    const k = g ? p.keyAt(g.x, g.z) : -1;
    if (k >= 0 && p.kind[k] === KIND.open) n++;
  }
  return n > 1;
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
  // 0.16.4 (Olas feedback, E4 dag 2): dagens förvarnade ingångar (dayCfg.foretell) syns från början med sin väg,
  // tills vågen de kommer i har släppt allt
  for (const id of foretold().keys()) ids.add(id);
  return { ids: sim.route.spawns.map(s => s.id).filter(id => ids.has(id)), next };
}
// Förvarnade ingångar vars första våg inte har börjat än. Map id -> vågens nummer (1-baserat).
function foretold() {
  const out = new Map(), first = sim.route.spawns[0]?.id;
  for (const id of sim.dayCfg.foretell ?? []) {
    const w = sim.dayCfg.waves.findIndex(w => w.groups.some(g => (g.spawn ?? first) === id));
    if (w >= sim.wavesStarted) out.set(id, w + 1);
  }
  return out;
}
const spawnName = id => sim.map.spawns?.find(s => s.id === id)?.name ?? id;
// Vad som kommer från varje ingång (0.11.0, H090): "30 walkers", "50 runners". Före en våg (bygget
// och nedräkningen): hela vågens grupper. Under vågen: de som ännu inte släppts, och med överlapp
// nästa vågs grupper. Map ingång -> [[typ, antal], ...] i gruppernas ordning.
const PLURAL = { walker: 'walkers', runner: 'runners', brute: 'brutes' };
const countText = ([type, n]) => `${n} ${n === 1 ? type : PLURAL[type] ?? type}`;
// Gnesta: en etikett per ingång som används nu, på gatan (H091): på första punkten längs hordens väg
// från ingången där etiketten ryms i bild utan att täcka gränssnittet (hud.js väljer bland
// kandidaterna). Ingången själv om den syns, annars där vägen kommer in i bild. Syns vägen inte alls:
// vid kanten på linjen från mitten mot ingången. Under vågen bara för ingångar vars zombier inte
// syns än, och för den som nästa grupp kommer från.
function gridEntries() {
  const out = [], wave = sim.phase === 'wave';
  if (!wave && sim.phase !== 'build') return out;
  const { ids, next } = activeSpawns();
  const coming = comingBySpawn(sim);
  const cx = innerWidth / 2, cy = innerHeight / 2;
  const later = foretold();
  for (const id of ids) {
    const isNext = id === next;
    // 0.16.4: en förvarnad ingång säger när den kommer ("From wave 2"), före och under vågorna innan dess
    if (later.has(id) && !(sim.phase === 'build' && later.get(id) === sim.wavesStarted + 1)) {
      const cellsF = sim.route.paths([id])[0]?.cells ?? [], candsF = [];
      for (let i = 0; i < cellsF.length && candsF.length < 48; i += 2) {
        const c = sim.route.cellCenter(cellsF[i]), q = onScreen(c.x, c.z, 0);
        if (!q.in) continue;
        const t = sim.route.cellCenter(cellsF[Math.min(i + 3, cellsF.length - 1)]), u = onScreen(t.x, t.z);
        candsF.push({ x: q.sx, y: q.sy, angle: Math.atan2(u.sy - q.sy, u.sx - q.sx) + Math.PI });
      }
      const spF = sim.route.spawns.find(q => q.id === id), sF = onScreen(spF.x, spF.z, EDGE);
      const dxF = sF.sx - cx, dyF = sF.sy - cy, kF = Math.min(Math.abs((cx - EDGE) / (dxF || 1e-6)), Math.abs((dyF < 0 ? cy - 110 : cy - 120) / (dyF || 1e-6)));
      out.push({ cands: candsF, fallback: { x: cx + dxF * kF, y: cy + dyF * kF, angle: Math.atan2(-dyF, -dxF) + Math.PI }, lines: [`From wave ${later.get(id)}`], sub: spawnName(id), next: false });
      continue;
    }
    if (wave) {
      const pending = sim.spawnQueue.some(q => !q.door && (q.spawn ?? sim.route.spawns[0].id) === id);
      const alive = sim.zombies.filter(z => !z.dead && z.spawn === id);
      const seen = alive.some(z => onScreen(z.x, z.z, 10).in);
      if (!isNext && (seen || (!pending && !alive.length))) continue;
      if (isNext && !pending && seen) continue;
    }
    const counts = coming.get(id) ?? [];
    const lines = counts.length ? counts.map(countText) : ['Horde incoming'];
    // 0.16.2: under vågen är talen det som ännu inte kommit härifrån, och det står (vågens rad säger hela vågen)
    if (wave && counts.length) lines[lines.length - 1] += ' to come';
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
  if (!grid) { routeLines.set('now', null); routeLines.set('preview', null); routeLines.set('evac', null); routeLines.set('danger', null); return null; }
  // 0.10.2: från varje ingång som används nu (activeSpawns), som pilarna
  const ids = activeSpawns().ids;
  const obsKey = Object.keys(sim.obstacles).join(',');
  // 0.14.1 (speltestet av 0.14.0): de civilas väg från varje dörr till ishallen, gul, tills evakueringen är avgjord
  const ev = sim.evac && !evacOutcome(sim.evac) ? sim.dayCfg.evac : null;
  if (ev) {
    const houses = [...new Set(ev.groups.map(g => g.house))], eKey = obsKey + '|' + houses.join(',');
    if (routeKeys.evac !== eKey) { routeKeys.evac = eKey; routeKeys.evacPaths = houses.map(h => { const d = houseDoor(sim.map, h, sim.route); return [[d.x, d.z], ...sim.route.pathFrom(d.cell).map(cellWorld)]; }); }
    routeLines.set('evac', routeKeys.evacPaths, eKey);
    // 0.16.1 (speltestet av 0.16.0): där de civila går in på hordens väg, röda fläckar på den gula linjen
    routeLines.set('danger', evacHelp().zones.map(z => z.pts), 'd' + day);
  } else { routeLines.set('evac', null); routeLines.set('danger', null); }
  const nowKey = obsKey + '|' + ids.join(',');
  if (routeKeys.now !== nowKey) {
    const before = routeKeys.nowSim === sim && routeKeys.nowIds === ids.join(',') ? nowPaths : null;
    routeKeys.now = nowKey; routeKeys.nowSim = sim; routeKeys.nowIds = ids.join(',');
    nowPaths = sim.route.paths(ids);
    if (nowPaths.some(p => p.through != null)) tip('tip.shut');
    // 0.16.4 (speltestet av 0.16.2: taggtråden på en omväg fick horden att byta väg tyst): samma ingångar men ny väg
    // efter ett hinder, så blinkar den nya vägen och en rad säger det
    // 0.17.1 (speltestet av 0.17.0: "jag förstod aldrig vilken väg horden tog in"): raden säger gatan den nya vägen
    // går på, och den blinkar också när en spärr gått sönder (då står raden om spärren först)
    else if (before) {
      const i = nowPaths.findIndex((q, j) => q.cells.join() !== before[j]?.cells.join());
      if (i >= 0) {
        const street = rerouteStreet(sim.map, k => sim.route.grid.center(k), before[i].cells, nowPaths[i].cells);
        if (!(routeFlash > 0)) note(uiRoot, street ? `Horde rerouting via ${street}` : 'Horde rerouted', 'warn');
        routeFlash = 4;
      }
    }
  }
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
  // 0.16.0: fiendens presentationsruta (Continue), Field manual (J, Esc) och lektionsplåten (Esc hoppar över,
  // Enter och Space släpper ett steg som bara visar något) går före allt annat
  if (card) {
    if ((e.key === 'Enter' || e.code === 'Space' || e.key === 'Escape') && !e.repeat) { e.preventDefault(); closeCard(); }
    return;
  }
  if (manual) {
    if ((e.key === 'Escape' || e.code === 'KeyJ') && !e.repeat) { e.preventDefault(); closeManual(); }
    return;
  }
  if (e.code === 'KeyJ' && !e.repeat && !e.metaKey && !e.ctrlKey && !menu.isOpen() && meta('manual')) { e.preventDefault(); openManual(); return; }
  if (lesson && !menu.isOpen() && (lesson.pause || lesson.step.kind === 'caption')) {
    if (e.key === 'Escape' && !e.repeat) { e.preventDefault(); skipLesson(); return; }
    if (lesson.step.kind === 'show' && (e.key === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); releaseLesson(); return; }
    // ett 'show' under hård paus: inga andra tangenter; ett 'step': handlingen går, men Enter och Space startar
    // inget annat än vad steget gäller (Start the wave)
    // 0.16.2: en siffra (ta upp ett kort) släpper ett 'show' och tar upp kortet, som ett klick på plåten gör
    if (lesson.pause && lesson.step.kind === 'show') { if (!/^(Digit|Numpad)[0-9]$/.test(e.code) || e.repeat) return; releaseLesson(); }
    else if (lesson.pause && (e.key === 'Enter' || (e.code === 'Space' && lesson.step.target?.ui !== '#go'))) { e.preventDefault(); return; }
  }
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
  // 0.16.4: hindren på Z, X och C (shop.js FIXED_KEYS)
  if (mode === 'play' && /^(Digit[0-9]|Numpad[0-9]|KeyZ|KeyX|KeyC)$/.test(e.code) && !e.repeat && !e.metaKey && !e.ctrlKey && canPlaceNow()) {
    const r = chord.press(/^Key/.test(e.code) ? e.code.slice(-1) : Number(e.code.slice(-1)), performance.now() / 1000);
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
  // 0.16.1 (H190): B eller Home flyttar kameran till basen
  if ((e.code === 'KeyB' || e.code === 'Home') && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play') { e.preventDefault(); goToBase(); }
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
    // 0.16.0: minikartan är upplåst från South dag 1
    if (!e.repeat && feat('minimap')) { mmOn = !mmOn; minimap.toggle(mmOn); try { localStorage.setItem(MM_KEY, mmOn ? 'on' : 'off'); } catch { /* ingen lagring */ } }
  }
  const unitId = () => (hovered?.kind === 'gun' ? hovered.id : selected?.kind === 'gun' ? selected.id : null);
  if (e.code === 'KeyM' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play' && !placing && canPlaceNow() && feat('move')) {
    const id = unitId();
    if (id != null) guideMove(id);
  }
  if (e.code === 'KeyR' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play' && !placing && feat('rotate')) {
    const id = unitId();
    if (id != null) startRotate(id);
  }
  if (e.code === 'KeyV' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play' && sim.route.kind === 'grid' && feat('route')) {
    showRoute = !showRoute;
    note(uiRoot, showRoute ? 'Horde route shown (V)' : 'Horde route hidden (V)');
    hud.routeKey(true, showRoute);
  }
}, true);
addEventListener('keyup', e => { if (e.code === 'Space') e.preventDefault(); if (e.key === 'Shift') { hud.shift(false); shiftHeld = false; } }, true);
addEventListener('blur', () => { hud.shift(false); shiftHeld = false; });


// ---------- inlärningen (0.16.0, docs/superpowers/specs/2026-10-16-onboarding-design.md) ----------
// Ett begrepp per dag. Upplåsningen kommer från kampanjen (sim.allow i striden, metaFeatures mellan dagarna);
// lektionerna, tipsen, fiendernas presentationsruta och HUD:ens första animation styrs härifrån och sparas i
// progress.lessons (src/meta/lessons.js).
const feat = f => !!sim && allowed(sim, f);
const meta = f => metaFeatures(progress).has(f);
const coach = createCoach(uiRoot, { onRelease: () => releaseLesson(), onClick: (e, step) => { if (step?.kind === 'show') releaseLesson(); forwardClick(e.clientX, e.clientY); }, onFewer: () => { progress = setTipsMode(progress, 'new'); save(); } });
let lesson = null;             // { step, pause, missing }
let lastEsc = -Infinity;
let card = null;               // fiendens presentationsruta { type, el, close }
let manual = null;             // Field manual
const enemyWait = new Map();   // typ -> när den första sågs i vågen
let wavePauses = { wave: -1, n: 0, at: -Infinity };
const tipAt = new Map();
let civDownAt = null;
const HARD_GAP = 20, HARD_PER_WAVE = 2;
const lessonPaused = () => !!lesson?.pause || !!card || !!manual;

const countGuns = type => sim.guns.filter(g => g.weapon.type === type).length;
function lessonTest(expr) {
  if (!expr) return true;
  return expr.split('|').some(alt => alt.split('&').every(c => lessonCond(c.trim())));
}
function lessonCond(c) {
  const [k, a, b] = c.split(':');
  const play = mode === 'play' && !!sim;
  switch (k) {
    case 'start': return play && sim.phase === 'build' && sim.wavesStarted === 0;
    case 'afterWave1': return play && sim.waveIndex >= 1 && (sim.phase === 'build' || sim.phase === 'wave');
    case 'waveStarted': return play && sim.wavesStarted > 0 && (sim.phase === 'wave' || sim.phase === 'build');
    case 'arrived': return play && !!sim.reserve?.some(u => u.arrive && u.type === a && canDeploy(sim, u));
    case 'placing': return play && placing?.type === a && !placing.move;
    case 'placed': return play && countGuns(a) >= (Number(b) || 1);
    case 'obstacle': return play && Object.values(sim.obstacles).some(o => o.type === a);
    case 'moving': return play && !!placing?.move;
    case 'ping': return play && alerts.length > 0;
    case 'deployed': return play && sim.guns.length > 0 && (sim.reserve?.length ?? 0) > 0;
    case 'chords': return play && chord.chords && canPlaceNow();
    case 'opmap': case 'depot': case 'result': return mode === k;
    default: return false;
  }
}
// Lektionerna där spelaren är: dagens steg i striden; mellan dagarna stegen för den tid mellan dagarna som nåtts.
function lessonList() {
  if (mode === 'play') { const i = dayStage(map.id, day); return [...(i >= 0 ? LESSONS[STAGES[i].id] ?? [] : []), ...LESSONS.any]; }
  if (mode === 'opmap' || mode === 'depot' || mode === 'result') return STAGES.filter(s => s.after && stageReached(progress, s)).flatMap(s => LESSONS[s.id] ?? []);
  return [];
}
function uiRect(sel) {
  const n = uiRoot.querySelector(sel);
  if (!n || n.hidden || n.closest('[hidden]') || n.classList.contains('off') && n.id === 'minimap') return null;
  const r = n.getBoundingClientRect();
  return r.width && r.height ? { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } : null;
}
// 0.16.1: det lektionsplåten inte ska täcka (etiketterna, gränssnittet, kortets utfällda ruta, ledningens rad)
const COACH_AVOID = ['.entry:not([hidden])', '#evac:not([hidden])', '#go', '#wavebar', '#res', '#day', '#minimap:not(.off)', '.panel', '#banner:not([hidden])',
  '.civlost', '#buildbar .card:hover .more', '.opmap .inbox', '.opmap .sector', '#basearrow:not([hidden])', '#notes .note', '.sqtag', '.evacmark'];
function coachAvoid() {
  const out = [];
  for (const sel of COACH_AVOID) for (const n of uiRoot.querySelectorAll(sel)) {
    const r = n.getBoundingClientRect();
    if (r.width && r.height) out.push({ x0: r.left - 6, y0: r.top - 6, x1: r.right + 6, y1: r.bottom + 6 });
  }
  return out;
}
// Ett världsmåls punkter ([x, z]) för lektionsplåten och Show me.
function lessonWorldPts(t) {
  const w = t.world, pts = [];
  if (!w || w === 'pointer' || !sim) return pts;
  if (w === 'marked') { for (const k of sim.marked ?? []) if (!sim.guns.some(g => g.cell === k)) { const c = sim.place.center(k); pts.push([c.x, c.z]); } }
  else if (w === 'route') { for (const p of nowPaths ?? []) for (let i = Math.floor(p.cells.length * 0.55); i < p.cells.length; i += 2) pts.push(cellWorld(p.cells[i])); }
  else if (w === 'danger') { for (const z of evacHelp().zones) for (const q of z.pts) pts.push(q); }
  else if (w === 'suggest') { for (const k of suggestKeys()) { const c = sim.place.center(k); pts.push([c.x, c.z]); } }
  else if (w === 'evac') { for (const path of routeKeys.evacPaths ?? []) for (let i = 0; i < path.length; i += 2) pts.push(path[i]); }
  else if (w === 'dormant') { for (const d of sim.dayCfg.dormant ?? []) if (d.intel !== false) { const q = houseDoor(sim.map, d.house, sim.route); pts.push([q.x, q.z]); } }
  else if (w === 'civdown') { if (civDownAt) pts.push(civDownAt); }
  // 0.16.4: en ingång och vägen därifrån till spärren (E4 dag 2: Södertälje)
  else if (w.startsWith('entry:')) { const id = w.slice(6), cells = sim.route.paths([id])[0]?.cells ?? []; for (let i = 0; i < cells.length * 0.6; i += 3) pts.push(cellWorld(cells[i])); }
  else if (w.startsWith('gun')) { const type = w.split(':')[1]; const g = sim.guns.find(x => (type ? x.weapon.type === type : !x.preset)) ?? sim.guns[0]; if (g) pts.push([g.x, g.z]); }
  return pts;
}
// Målet på skärmen: { rect } för något som syns, { off: { x, y, angle } } vid kanten för något utanför bild.
function lessonTarget(t) {
  if (!t) return null;
  if (t.ui) { const r = uiRect(t.ui); return r ? { rect: r } : null; }
  if (mode !== 'play') return null;
  const w = t.world;
  if (w === 'pointer') return { rect: { x0: pointer.x - 16, y0: pointer.y - 16, x1: pointer.x + 16, y1: pointer.y + 16 }, light: true };
  const pts = lessonWorldPts(t);
  if (!pts.length) return null;
  const sp = pts.map(([x, z]) => toScreen(x, z));
  const inside = sp.filter(q => q.sx >= 20 && q.sx <= innerWidth - 20 && q.sy >= 20 && q.sy <= innerHeight - 20);
  if (!inside.length) {
    const cx = sp.reduce((a, q) => a + q.sx, 0) / sp.length, cy = sp.reduce((a, q) => a + q.sy, 0) / sp.length;
    const mx = innerWidth / 2, my = innerHeight / 2, dx = cx - mx, dy = cy - my, k = Math.min((mx - 50) / Math.abs(dx || 1e-6), (my - 50) / Math.abs(dy || 1e-6));
    return { off: { x: mx + dx * k, y: my + dy * k, angle: Math.atan2(dy, dx) } };
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of inside) { x0 = Math.min(x0, q.sx); x1 = Math.max(x1, q.sx); y0 = Math.min(y0, q.sy); y1 = Math.max(y1, q.sy); }
  const pad = 22, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.max(30, (x1 - x0) / 2 + pad), hh = Math.max(30, (y1 - y0) / 2 + pad);
  return { rect: { x0: Math.max(8, cx - hw), y0: Math.max(8, cy - hh), x1: Math.min(innerWidth - 8, cx + hw), y1: Math.min(innerHeight - 8, cy + hh) } };
}
// Högst två hårda pauser per våg och minst 20 s mellan dem (designen avsnitt 2.3); bygget före första vågen räknas inte.
// 0.16.4: nedräkningen mellan vågorna räknas inte heller (där kommer E4 dag 2:s Move, efter att löparnas
// presentationsruta redan tagit vågens pauser); ingen zombie går då.
const inWave = () => mode === 'play' && sim.phase === 'wave';
function hardPauseOk() {
  if (!inWave()) return true;
  if (wavePauses.wave !== sim.wavesStarted) wavePauses = { wave: sim.wavesStarted, n: 0, at: -Infinity };
  return wavePauses.n < HARD_PER_WAVE && time - wavePauses.at >= HARD_GAP;
}
function countHardPause() { if (!inWave()) return; if (wavePauses.wave !== sim.wavesStarted) wavePauses = { wave: sim.wavesStarted, n: 0, at: -Infinity }; wavePauses.n++; wavePauses.at = time; }
function fillText(t) {
  return t.replace('{need}', sim?.evac?.need ?? '').replace('{total}', sim?.evac?.total ?? '').replace('{frontage}', Number.isFinite(frontage(sim)) ? frontage(sim) : '');
}
// 0.16.4 (speltestet av 0.16.2 och Olas skärmbild: RP-tipset låg över raden KILLS / WAVES CLEARED och knappen; "Gnesta
// is next" kom tre gånger): mellan dagarna (resultatet, kartan, förrådet) står tipset som en rad i skyltens flöde,
// ovanför knapparna eller under målet, och räknas som sett när det visas. Det täcker aldrig skyltens innehåll.
function inlineLesson(step) {
  const n = step.target?.ui && uiRoot.querySelector(step.target.ui);
  const host = n?.closest('.sheet');
  if (!host) return false;
  host.querySelector('.inltip')?.remove();
  const el = document.createElement('p');
  el.className = 'inltip';
  el.innerHTML = `${fillText(step.text).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}${step.keys?.length ? ' ' + step.keys.map(k => `<kbd>${k}</kbd>`).join(' ') : ''}`;
  const acts = n.closest('.acts');
  if (acts) acts.insertAdjacentElement('beforebegin', el); else n.insertAdjacentElement('afterend', el);
  progress = markSeen(progress, step.id); save();
  audio.ui('click');
  return true;
}
function startLesson(step) {
  if (mode !== 'play' && step.target?.ui && inlineLesson(step)) return true;
  const pause = step.kind === 'step' || step.kind === 'show';
  if (pause && !hardPauseOk()) return false;
  if (pause) countHardPause();
  lesson = { step, pause: pause && mode === 'play', missing: 0 };
  const first = mode === 'play' && !lessonsOf(progress).seen.some(id => LESSONS[STAGES[0].id].some(l => l.id === id)) && tipsMode(progress) === 'on' && step.kind !== 'caption';
  coach.show({ ...step, text: fillText(step.text), pause: lesson.pause, dim: pause, fewer: first });
  if (lesson.pause && speed > 1) { speed = 1; hud.setSpeed(1); }
  if (step.kind !== 'caption') audio.ui('click');
  return true;
}
function finishLesson() {
  if (!lesson) return;
  progress = markSeen(progress, lesson.step.id); save();
  coach.hide(); lesson = null;
}
function releaseLesson() { if (lesson?.step.kind === 'show') finishLesson(); }
// Esc under ett steg hoppar över det; ett andra Esc inom 1 s hoppar över resten av dagens lektion (avsnitt 5.4).
function skipLesson() {
  const now = performance.now();
  if (now - lastEsc < 1000) { progress = markSeen(progress, ...lessonList().map(l => l.id)); save(); }
  lastEsc = now;
  finishLesson();
}
// 0.16.2 (speltestet av 0.16.1): bildtexternas 4 s räknas i verklig tid (förut i bildrutornas tid, högst 0,1 s per
// bild: i 1,5 bilder/s stod "Press, then drag toward the road to aim." i en halv minut och följde varje ny enhet).
// En bildtext som gäller det man håller i (when: placing:X) går när man inte längre håller det.
let lessonWall = performance.now();
function updateLessons() {
  const now = performance.now(), dt = Math.min(1, (now - lessonWall) / 1000);
  lessonWall = now;
  if (card || manual || menu.isOpen()) return;
  if (lesson) {
    const st = lesson.step;
    if (st.kind === 'step' && lessonTest(st.done)) { finishLesson(); return; }
    if (st.kind === 'caption' && (coach.tick(dt) || (st.when?.startsWith('placing:') && !lessonTest(st.when)))) { finishLesson(); return; }
    const tg = lessonTarget(st.target);
    if (!tg && st.target && !st.target.world) {
      if ((lesson.missing += dt) > 1) { console.info('Lektionen hoppades över, målet finns inte:', st.id); finishLesson(); }
      return;
    }
    lesson.missing = 0;
    coach.el.classList.toggle('dimmed', lesson.pause && !placing && !tg?.light && !!tg?.rect);
    coach.place(tg?.rect ?? null, { off: tg?.off ?? null, avoid: coachAvoid() });
    // 0.16.2 (speltestet av 0.16.1: plåten och kortets utfällda ruta skrevs över varandra): finns ingen fri plats
    // viker plåten för den utfällda rutan så länge pekaren står på kortet
    const more = uiRoot.querySelector('#buildbar .card:hover .more');
    const mr = more?.getBoundingClientRect(), pr = coach.plateRect();
    coach.el.classList.toggle('yield', !!mr?.width && mr.left < pr.right && pr.left < mr.right && mr.top < pr.bottom && pr.top < mr.bottom);
    return;
  }
  // en ny ingång har företräde: inga nya plåtar eller bildtexter medan raden står
  if (performance.now() < newsUntil) return;
  for (const l of lessonList()) {
    if (isSeen(progress, l.id)) continue;
    if (l.done && lessonTest(l.done)) { progress = markSeen(progress, l.id); save(); continue; }
    // 0.16.4: mellan dagarna hör stegen till olika skärmar (kartan, resultatet, förrådet); ett som väntar på kartan
    // stoppar inte resultatets
    if (!lessonTest(l.when)) { if (l.kind === 'caption' || mode !== 'play') continue; break; }
    if (!shows(progress, l.kind)) { progress = markSeen(progress, l.id); save(); continue; }
    startLesson(l);
    break;
  }
}
// Fiendernas presentationsruta: hård paus första gången en typ syns (eller 8 s efter att den kom in).
function updateEnemies() {
  if (mode !== 'play' || card || manual || sim.phase !== 'wave') return;
  for (const z of sim.zombies) {
    if (z.dead || !ENEMIES[z.type]) continue;
    const id = 'enemy:' + z.type;
    if (isSeen(progress, id)) continue;
    if (!shows(progress, 'enemy')) { progress = markSeen(progress, id); save(); continue; }
    if (!enemyWait.has(z.type)) enemyWait.set(z.type, time);
    const p = zombiePos(sim, z);
    if (onScreen(p.x, p.z, 60).in || time - enemyWait.get(z.type) > 8) { openCard(z.type); return; }
  }
}
function openCard(type) {
  if (lesson) { if (lesson.step.kind === 'caption') finishLesson(); else { coach.hide(); lesson = null; } }
  // 0.16.2: det som var i handen ligger kvar i handen när rutan stängs (förut tappades det tyst)
  const held = placing && !placing.move ? { type: placing.type, kind: placing.kind } : null;
  stopPlacing(); closePanel();
  const e = ENEMIES[type];
  countHardPause();
  card = { type, held, ...enemyCard(uiRoot, { title: e.title, report: e.report, portrait: portraitOf(type), onContinue: () => closeCard() }) };
  if (speed > 1) { speed = 1; hud.setSpeed(1); }
  audio.ui('click');
}
function closeCard() {
  if (!card) return;
  progress = markSeen(progress, 'enemy:' + card.type); save();
  const held = card.held;
  card.close(); card = null;
  if (held && canPlaceNow() && buyState(sim, held.type).state === 'ok') placing = { ...held };
}
// Tips i stunden (avsnitt 5.3): för det som är upplåst, en gång per kampanj (de med repeat högst var femte minut).
function tip(id, at = null) {
  const t = TIPS.find(x => x.id === id);
  if (!t) return;
  if (t.needs && !(mode === 'play' ? feat(t.needs) : meta(t.needs))) return;
  const seen = isSeen(progress, id);
  if (seen && !(t.repeat && tipsMode(progress) === 'on' && time - (tipAt.get(id) ?? -Infinity) >= REPEAT_GAP)) return;
  if (!seen) { progress = markSeen(progress, id); save(); }
  if (!shows(progress, t.kind === 'show' ? 'show' : 'tip') && !(t.kind === 'show' && shows(progress, 'show'))) return;
  tipAt.set(id, time);
  if (at) civDownAt = at;
  if (t.kind === 'show' && mode === 'play' && !lesson && !card && startLesson({ ...t, kind: 'show' })) return;
  note(uiRoot, t.text);
}
// HUD:ens delar dyker upp med en diskret animation första gången (designen avsnitt 4).
function updateReveals() {
  for (const r of REVEALS) {
    if (isSeen(progress, r.id)) continue;
    const ok = r.feature === 'manual' ? meta('manual') : mode === 'play' && feat(r.feature);
    if (!ok) continue;
    const n = uiRoot.querySelector(r.sel);
    if (!n || n.hidden || n.closest('[hidden]') || !n.offsetWidth || n.classList.contains('off')) continue;
    hud.reveal(n);
    progress = markSeen(progress, r.id); save();
  }
}
// Field manual: knappen nere till vänster (en liten bok) och J. Öppen manual pausar spelet.
const manualBtn = document.createElement('button');
manualBtn.type = 'button'; manualBtn.id = 'manualbtn'; manualBtn.className = 'plate'; manualBtn.hidden = true;
manualBtn.title = 'Field manual (J)'; manualBtn.setAttribute('aria-label', 'Field manual');
manualBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 5.5C6.5 4 9.5 4 12 5.5 14.5 4 17.5 4 20 5.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0Z M12 5.5V19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><i class="dot"></i><kbd>J</kbd>';
manualBtn.addEventListener('pointerdown', e => e.preventDefault());
manualBtn.addEventListener('click', () => (manual ? closeManual() : openManual()));
uiRoot.appendChild(manualBtn);
let manualDotT = 0;
function updateManualBtn(dt) {
  const show = meta('manual') && mode !== 'menu';
  if (manualBtn.hidden === show) manualBtn.hidden = !show;
  uiRoot.dataset.manual = show ? 'on' : 'off';
  if ((manualDotT -= dt) <= 0) { manualDotT = 0.5; manualBtn.classList.toggle('fresh', show && manualNew(progress).length > 0); }
}
// 0.16.1 (H216, "Show me spelar bara om steg vars mål finns på skärmen"): målets punkter i världen, och kameran dit
// när det ligger utanför bild (banor som går att panorera).
function panToTarget(t) {
  if (!t?.world || !rig?.canPan) return;
  const tg = lessonTarget(t);
  if (!tg?.off) return;
  const pts = lessonWorldPts(t);
  if (!pts.length) return;
  const f = rig.fit(pts, 10);
  rig.focus(f.x, f.z, Math.max(rig.view, f.view));
}
function showMeStep(id) {
  if (mode !== 'play') return null;
  for (const ls of Object.values(LESSONS)) for (const l of ls) if (l.manual === id && l.target && lessonTarget(l.target)) return l;
  return null;
}
function openManual(focus = null) {
  if (manual || !meta('manual')) return;
  if (menu.isOpen()) menu.close();
  stopPlacing();
  // 0.16.1 (speltestet av 0.16.0: "Field manual: Evacuation" på förlustskylten öppnade "Start the wave"): uppslaget
  // som länken gäller öppnas, också om lektionen inte hunnit låsa upp det
  const entries = manualUnlocked(progress);
  manual = manualSheet(uiRoot, {
    entries: focus && !entries.includes(focus) ? [...entries, focus] : entries, fresh: manualNew(progress), portrait: portraitOf, focus,
    onOpen: id => { progress = markManualRead(progress, id); save(); },
    // 0.16.1 (H216): ett mål utanför bild flyttar kameran dit först
    onShowMe: id => { const st = showMeStep(id); closeManual(); if (st && !lesson) { panToTarget(st.target); lesson = { step: { ...st, kind: 'show' }, pause: true, missing: 0 }; coach.show({ ...st, kind: 'show', text: fillText(st.text), pause: true, dim: true }); } },
    onClose: () => closeManual(),
    canShow: id => !!showMeStep(id),
  });
}
function closeManual() { manual?.close(); manual = null; }
// 0.16.1 (speltestet av 0.16.0: "civila dog innan mina frivilliga sköt, jag vet inte var de ska stå"): evakueringens
// farozoner och de föreslagna platserna för de frivilliga (src/sim/evac-danger.js), räknade en gång per dag.
let evacCache = { sim: null, zones: [], spots: [] };
function evacHelp() {
  if (evacCache.sim !== sim) {
    const zones = sim.dayCfg.evac ? dangerZones(sim) : [];
    evacCache = { sim, zones, spots: zones.length ? coverSpots(sim) : [] };
  }
  return evacCache;
}
// E4 dag 1: de markerade platserna pulserar medan det finns något att ställa ut (src/sim/sim.js marked).
// 0.16.1: på en evakueringsdag pulserar de föreslagna platserna (gula hörn) medan de frivilliga står i reserven
// eller hålls i handen, före första vågen; de är förslag, inte de enda platserna.
const spotEls = new Map();
const SUGGEST = false;
// 0.16.4 (Olas feedback: "dag 1 har ingen agens"): inga föreslagna platser; spelaren läser kartan själv. Husen som
// ska utrymmas märks i stället (updateEvacMarks).
function suggestKeys() {
  if (!SUGGEST || mode !== 'play' || !sim.dayCfg.evac || sim.wavesStarted > 0) return [];
  const civ = placing?.type === 'civ' || sim.reserve?.some(u => u.type === 'civ' && canDeploy(sim, u));
  if (!civ) return [];
  return evacHelp().spots.map(s => s.key).filter(k => !sim.guns.some(g => Math.hypot(g.x - sim.place.center(k).x, g.z - sim.place.center(k).z) < 4));
}
function updateSpotMarks() {
  const marked = mode === 'play' && sim.marked && (placing || sim.reserve?.some(u => canDeploy(sim, u)));
  const keys = marked ? [...sim.marked].filter(k => !sim.guns.some(g => g.cell === k)) : suggestKeys();
  // 0.16.2 (speltestet av 0.16.1: "tre små gula hörnmarkeringar, tunna, smälter in mot husen"): en fylld mjuk
  // fläck under hörnen och en etikett, så att platserna syns utan att zooma
  const label = marked ? 'Here' : 'Volunteers here';
  const want = new Set(keys);
  for (const [k, el] of spotEls) if (!want.has(k)) { el.remove(); spotEls.delete(k); }
  for (const k of keys) {
    let el = spotEls.get(k);
    if (!el) { el = document.createElement('div'); el.className = 'spotmark'; el.innerHTML = '<b></b><i></i><i></i><i></i><i></i><span></span>'; pips.appendChild(el); spotEls.set(k, el); }
    const sp = el.querySelector('span'); if (sp.textContent !== label) sp.textContent = label;
    const c = sim.place.center(k), p = toScreen(c.x, c.z);
    el.style.left = p.sx + 'px'; el.style.top = p.sy + 'px';
  }
}

// 0.16.4: husen som utryms märks med vågen de går i ("Evacuates · wave 2") tills den vågen startar.
const evacEls = new Map();
function updateEvacMarks() {
  const ev = mode === 'play' && sim.dayCfg.evac && sim.evac && !evacOutcome(sim.evac) ? sim.dayCfg.evac : null;
  const want = new Map();
  if (ev) for (const g of ev.groups) {
    if (sim.wavesStarted <= g.wave) want.set(g.house, g.wave);
  }
  for (const [h, el] of evacEls) if (!want.has(h)) { el.remove(); evacEls.delete(h); }
  for (const [h, w] of want) {
    let el = evacEls.get(h);
    if (!el) { el = document.createElement('div'); el.className = 'evacmark'; el.innerHTML = '<span></span>'; pips.appendChild(el); evacEls.set(h, el); }
    const t = `Evacuates · wave ${w + 1}`;
    const sp = el.querySelector('span'); if (sp.textContent !== t) sp.textContent = t;
    const d = houseDoor(sim.map, h, sim.route), p = toScreen(d.x, d.z);
    el.style.left = p.sx + 'px'; el.style.top = p.sy + 'px';
  }
}

// ---------- dagcykeln ----------
let mode = 'menu';
let sheet = null;            // skylten som visas (meny, intro, resultat, forskning)
let lastResult = null;       // det som resultatskylten visar, för att komma tillbaka från forskning
let warnedSave = false;

function save() {
  if (saveProgress(progress) || warnedSave) return;
  warnedSave = true;
  note(uiRoot, 'Could not save.');
}
function setMode(m, makeSheet) {
  if (sheet) sheet.close();
  // 0.16.0: en lektionsplåt hör till skylten eller dagen den visades på (den kommer tillbaka om den inte setts)
  if (lesson) { coach.hide(); lesson = null; }
  closeManual();
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
  // 0.16.3: statusraden under Continue säger var operationen står
  const id = progress.mapId, d = MAPS[id] ? nextDay(progress, id) : null;
  const status = MAPS[id] ? { place: MAPS[id].name, day: d } : null;
  setMode('menu', () => mainMenu(uiRoot, {
    version: VERSION, started, rp: progress.rp, status,
    // 0.16.0: före operationskartan (efter E4 dag 3) går Continue direkt till dagen
    onContinue: () => (meta('opmap') ? showOpMap() : deploySector(progress.mapId)),
    onNew: () => { resetSave(newCampaign()); progress = loadProgress(); loadMap(progress.mapId).then(() => deploySector(progress.mapId)); },
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
function goSector(sectorId) {
  // 0.16.0: kartan väljer en sektor; Hagstumosse strider på den fas som är öppen (Ishallen, sedan Vikingavägen)
  const id = currentMap(progress, sectorId) ?? sectorId;
  const d = nextDay(progress, id);
  if (!d) return;
  // 0.16.0: förrådet finns från South dag 3 (efter dag 2); före det går kartan direkt till dagen
  if (!meta('depot')) { deploySector(id); return; }
  showDepot(id, 'opmap', { day: d });
}
function deploySector(id) {
  const d = meta('opmap') ? nextDay(progress, id) : Math.min(mapState(progress, id).unlockedDay, MAPS[id].days.length);
  if (!d) { showOpMap(); return; }
  progress = selectMap(progress, id); save();
  loadMap(id).then(() => { hud.reset(); startDay(d); });
}
const DEPOT_ACTS = {
  requisition: (p, type, sector) => { const r = requisition(p, type, sector); return { ...r, text: r.ok ? `${unitName({ type })} requisitioned for ${sectorOf(sector)?.name ?? sector}.` : null }; },
  level: (p, uid) => { const r = levelUp(p, uid); return { ...r, text: r.ok ? 'Level bought.' : null }; },
  refill: (p, uid) => { const r = refill(p, uid); return { ...r, text: r.ok ? 'Back at full strength.' : null }; },
  return: (p, uid) => { const r = returnUnit(p, uid); return { ...r, text: r.ok ? `Returned to the depot: +${r.refund} RP.` : null }; },
  reassign: (p, uid, sector) => { const r = reassign(p, uid, sector); return { ...r, text: r.ok ? `Reassigned to ${sectorOf(sector)?.name ?? sector}.` : null }; },
  // 0.16.0: skicka och ta tillbaka (gratis tills Deploy, src/meta/operation.js sendUnit, bringBack)
  send: (p, uid, sector, log) => sendUnit(p, log, uid, sector),
  back: (p, uid, log) => bringBack(p, log, uid),
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
function startDay(n) {
  victoryWait = null;
  const cfg = opStartConfig(progress, n);
  if (!cfg) { showOpMap(); return; }
  day = n;
  sim = createSim(withTweaks(cfg));
  failingWarned.clear(); toldSpawns.clear(); shotAt.clear(); alerts.length = 0; routeFlash = 0; spareTold = false; rotating = null; civToldAt = -Infinity; builtTold = false; climbTold = false; reserveWarned = false; evacKey = '';
  enemyWait.clear(); wavePauses = { wave: -1, n: 0, at: -Infinity }; civDownAt = null; if (card) { card.close(); card = null; }
  sightCache.clear(); validCache.sig = '';
  scene.userData.molnbo?.reset(); trainUi.reset();
  view.setSim(sim);
  minimap.reset(sim);
  hud.reset();
  hud.setSpeed(speed);
  entryAt = null; shakeT = 0; lastBreach = -Infinity; rig.setShake(0, 0); rig.goHome();
  const frame = dayFrame();
  if (frame) rig.focus(frame.x, frame.z, frame.view);
  // 0.16.0: uppdragsrutan (#hint) är ersatt av lektionsplåten (src/ui/coach.js)
  setMode('intro', () => dayIntro(uiRoot, map.days[n - 1], cfg.cash, () => { setMode('play'); introPan(frame); }));
}
// Kameran när dagen börjar (0.10.1, speltestet: "var basen ligger syns inte"): ishallens entré och
// vägen dit från dagens första ingång i bild, så långt zoomen räcker (högst 120 m av vägen).
// 0.16.1 (H190, speltestet av 0.14.2: "Gnesta dag 2 startar med ishallen utanför bild; basen faller osedd"):
// hela basen (ishallens fyra hörn, på E4 vägspärren med marginal) är alltid med, med plats för HUD:en upptill
// och köpraden nedtill. Vägen tas med så långt den ryms: 120 m, annars 90, 60, 30 eller ingen.
function baseShape() {
  const b = sim.route.base, hr = sim.map.iceRink, pts = [[b.x, b.z]];
  if (hr?.at) for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push(hr.at(sx * hr.len / 2, sz * hr.wid / 2));
  else for (const [dx, dz] of [[-8, -8], [8, -8], [8, 8], [-8, 8]]) pts.push([b.x + dx, b.z + dz]);
  return pts;
}
const FRAME_PAD = 10;
function dayFrame() {
  if (sim.route.kind !== 'grid') return null;
  const base = baseShape();
  // 0.14.1 (speltestet av 0.14.0: "familjerna dog utanför bild"): en evakueringsdag börjar med hela de
  // civilas väg i bild, från husen till ishallen.
  if (sim.dayCfg.evac) {
    const pts = [...base];
    for (const g of sim.dayCfg.evac.groups) { const d = houseDoor(sim.map, g.house, sim.route); pts.push([d.x, d.z]); }
    return rig.fit(pts, FRAME_PAD);
  }
  // längst ut som banan själv tillåter med hjulet (map.camera.zoom), inte hela den skarpa ytan: pjäserna ska synas
  const comfort = (sim.map.camera.zoom?.[1] ?? Infinity) * 1.15;
  const first = sim.dayCfg.waves[0].groups[0].spawn ?? sim.route.spawns[0].id;
  const cells = sim.route.paths([first])[0]?.cells ?? [];
  for (const m of [120, 90, 60, 30]) {
    if (!cells.length) break;
    const k = Math.max(0, cells.length - 1 - Math.round(m / sim.route.grid.size));
    const p = sim.route.cellCenter(cells[k]), f = rig.fit([...base, [p.x, p.z]], FRAME_PAD);
    if (f.fits && f.view <= comfort) return f;
  }
  return rig.fit(base, FRAME_PAD);
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
  // 0.16.0 (designen avsnitt 3, "när det händer"): erfarenheten och förlusterna som tips första gången
  if (won && (report?.units ?? []).some(u => !u.destroyed && before.op.units.find(x => x.uid === u.uid)?.wins === VET_WINS - 1)) tip('tip.star');
  if (won && losses.some(l => l.men || l.destroyed) && meta('depot')) tip('tip.fallen');
}
function showResult() {
  const outro = map.outro ? { text: map.outro.text, withdraw: !!map.outro.withdraw, name: map.name, from: FROM_NAME[map.outro.from ?? 'FM'] } : null;
  // 0.16.0: RP syns först när förrådet öppnar; före kartan går knappen direkt till nästa dag; efter en förlust
  // föreslås dagens uppslag i Field manual (designen avsnitt 5.3)
  const i = dayStage(map.id, day), entry = !lastResult.won && meta('manual') ? (LESSONS[STAGES[i]?.id] ?? []).map(l => manualEntry(l.manual)).find(Boolean) : null;
  setMode('result', () => dayResultPanel(uiRoot, { ...lastResult, totalRp: progress.rp, outro, showRp: meta('rp'), depot: meta('depot'), next: meta('opmap') ? 'Operations map' : 'Next day',
    manualHint: entry && manualUnlocked(progress).includes(entry.id) ? { id: entry.id, title: entry.title } : null }, {
    // 0.14.1: Try again går genom förrådet (RP:n från förlusten), Deploy startar dagen igen
    onRetry: () => (meta('depot') ? showDepot(map.id, 'result', { day }) : startDay(day)),
    onOpMap: () => (meta('opmap') ? showOpMap() : deploySector(map.id)),
    onMenu: showMenu,
    onManual: id => openManual(id),
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
// 0.16.0: lektionen som visas (steget eller fiendens ruta) och att släppa den, för proven i webbläsaren
const lessonApi = { get lesson() { return card ? 'enemy:' + card.type : lesson?.step.id ?? null; }, release: () => (card ? closeCard() : releaseLesson()), get manualOpen() { return !!manual; } };
if (TEST && !DEBUG) window.__horde = { advance: advanceSim, get sim() { return sim; }, get mode() { return mode; }, get progress() { return progress; }, get version() { return VERSION; }, placeLog };
if (TEST && !DEBUG) Object.defineProperties(window.__horde, Object.getOwnPropertyDescriptors(lessonApi));
// Felsökning och prestandamätning i konsolen, bara med ?debug i adressen.
if (DEBUG) window.__horde = { startRotate, get rotating() { return rotating; }, commitRotate, guideMove, get aim() { return aim; }, groundAt, moveRoute, get chord() { return chord; }, get worlds() { return worlds; }, get speed() { return speed; }, setSpeed, get routeLines() { return routeLines; }, get placing() { return placing; }, get spot() { return spot; }, startPlacing, stopPlacing, placeHere, get sim() { return sim; }, get progress() { return progress; }, get mode() { return mode; }, get selected() { return selected; }, get hovered() { return hovered; }, set hovered(v) { hovered = v; }, get view() { return view; }, audio, get rig() { return rig; }, get scene() { return scene; }, get camera() { return camera; }, renderer, actions, go, startDay, setMode, loadMap, toggleSpeed, sheetAction,
  // 0.12.0: byt bana som menyn gör (prov och skärmbilder)
  pickMap: id => { progress = selectMap(progress, id); return loadMap(id); },
  open, jump: (...a) => debugJump(...a), get pointer() { return pointer; }, get minimap() { return minimap; }, placeLog,
  showDepot: (...a) => showDepot(...a), showResult: () => showResult(), setProgress: v => { progress = v; save(); },
  // simuleringen framåt utan att vänta (prov och skärmbilder); vyn ritas i nästa bildruta
  advance: advanceSim };
if (DEBUG) Object.defineProperties(window.__horde, Object.getOwnPropertyDescriptors(lessonApi));

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
  resetTips: () => { progress = resetTips(progress); save(); return { ok: true }; },
  markAllSeen: () => { progress = markAllSeen(progress); save(); if (lesson) { coach.hide(); lesson = null; } return { ok: true }; },
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
  tipsMode: () => tipsMode(progress), setTipsMode: m => { progress = setTipsMode(progress, m); save(); },
  manualOk: () => meta('manual'), openManual: () => openManual(),
  resetTips: () => { progress = resetTips(progress); save(); },
  onClose: () => {},
});
// 0.17.0-molnbo: ?debug&jump=molnbo:2 hoppar direkt till en bana och dag (prov och speltest)
{ const j = new URLSearchParams(location.search).get('jump');
  if (DEBUG && j) { const [m, d] = j.split(':'); window.__hordeJump = loadMap(progress.mapId).then(() => debugJump(m, Number(d) || 1)); }
  else loadMap(progress.mapId).then(() => showMenu()); }

let last = performance.now(), time = 0;
const VICTORY_PAUSE = 2.6, VICTORY_LINE_AT = 0.7;
let victoryWait = null;
const clock = { acc: 0 };
function tick(now) {
  const frameDt = Math.min((now - last) / 1000, 0.1);
  last = now; time += frameDt;
  if (!scene || !sim) { requestAnimationFrame(tick); return; }   // första banan laddas

  // Fart bara när tiden går i simuleringen (våg eller nedräkning), inte före första vågen.
  const running = sim.phase === 'wave' || (sim.phase === 'build' && sim.nextWaveIn != null);
  const paused = menu.isOpen() || lessonPaused();
  advance(clock, frameDt, { playing: mode === 'play', paused, mul: running ? speed : 1, dt: DT, maxPerSpeed: MAX_STEPS_PER_SPEED }, () => { step(sim, DT); handleEvents(); });
  // 0.16.4 (Olas önskan): efter den sista zombien en stund av lugn innan VICTORY, så att man ser det. Tiden går i
  // spelets fart och står still när spelet pausas; musiken har redan gått ner (phase 'won').
  if (mode === 'play' && sim.phase === 'won') {
    if (!victoryWait) { victoryWait = { t: 0, told: false }; if (placing) stopPlacing(); }
    if (!paused) victoryWait.t += frameDt * speed;
    if (!victoryWait.told && victoryWait.t >= VICTORY_LINE_AT) { victoryWait.told = true; hud.banner('Sector quiet', VICTORY_PAUSE - VICTORY_LINE_AT + 0.4); }
    if (victoryWait.t >= VICTORY_PAUSE) { victoryWait = null; finishDay(); }
  } else if (mode === 'play' && sim.phase === 'lost') finishDay();
  if (placing && (!canPlaceNow() || (placing.move ? !sim.guns.some(g => g.id === placing.move) : ['locked', 'absent', 'out'].includes(buyState(sim, placing.type).state)))) stopPlacing();
  updateLessons();
  updateBaseArrow();
  if (sim) updateNewSpawn();
  updateEnemies();
  updateReveals();
  updateManualBtn(frameDt);
  if (mode === 'play') {
    // 0.16.0: HUD:ens delar i inlärningens takt (designen avsnitt 4)
    speedShown = feat('speed') && (isSeen(progress, 'hud:speed') || sim.waveIndex >= 1);
    hud.features({ supplies: feat('supplies'), speed: speedShown, early: feat('early') });
    const mmWant = mmOn && feat('minimap');
    if (minimap.visible !== mmWant) minimap.toggle(mmWant);
  }
  updateSpotMarks();
  updateEvacMarks();
  if (!canPlaceNow()) chord.reset();
  bar.update(sim, placing?.type, canPlaceNow(), chord.open, chord.armed(performance.now() / 1000));
  updateGhostTip();

  if (panel) panel.update(sim);
  hud.update(sim);
  hud.routeKey(mode === 'play' && sim.route.kind === 'grid' && feat('route') && (sim.phase === 'build' || sim.phase === 'wave'), showRoute);
  updateEntry();
  updateBarricades(paused ? 0 : frameDt);
  updatePips();
  updateSquadTags();
  updateArcFlags();
  updateSpare();
  if (mode === 'play') minimap.update(frameDt, { sim, view: viewOnGround(), spawns: sim.route.kind === 'grid' ? activeSpawns().ids : [], alerts });
  // 0.16.0: under en lektionspaus går kameran att flytta (målet kan ligga utanför bild), inte under menyn
  rig.active = mode === 'play' && !menu.isOpen() && !card && !manual;
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
