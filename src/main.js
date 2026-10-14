// Spelet: meny, dagar på Riksvägen och forskning mellan dagarna.
// Lägen: menu -> intro -> play -> result -> (intro samma dag | intro nästa dag | research).
// Simuleringen stegas bara i play; scenen ritas alltid (dammet rör sig bakom skyltarna).
import { VERSION } from './version.js';
import { MAPS } from './data/maps.js';
import { createScene } from './render/scene.js';
import { buildWorld, updateWorld } from './render/world.js';
import { createView } from './render/view.js';
import { createPicker } from './render/picking.js';
import { mountHud } from './ui/hud.js';
import { slotPanel, cellPanel, dayIntro, dayResultPanel, researchPanel, mainMenu, note } from './ui/panels.js';
import { startConfig, dayResult, buyResearch } from './meta/progress.js';
import { loadProgress, saveProgress } from './meta/save.js';
import { createSim, startWave, step, build, upgrade, sell, placeObstacle, removeObstacle } from './sim/sim.js';
import { weaponStats } from './sim/stats.js';
import { Vector3 } from 'three';

const DT = 1 / 30, MAX_STEPS = 5;
const map = MAPS.riksvagen;
const { renderer, scene, camera } = createScene(document.getElementById('stage'), map);
buildWorld(scene, map);
document.getElementById('ver').textContent = 'v' + VERSION;
const uiRoot = document.getElementById('ui');

let progress = loadProgress();
let day = Math.min(progress.unlockedDay, map.days.length);
let sim = createSim(startConfig(progress, day));
const view = createView(scene, sim);
const hud = mountHud(uiRoot, { onStart: () => go() });
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
const actions = {
  build: (id, type) => build(sim, id, type),
  upgrade: id => upgrade(sim, id),
  sell: id => sell(sim, id),
  place: (cell, type) => placeObstacle(sim, cell, type),
  remove: cell => removeObstacle(sim, cell),
  range: r => { panelRange = r; },
  close: closePanel,
};
function open(p) {
  if (selected && selected.kind === p.kind && selected.id === p.id) return;
  closePanel();
  selected = p;
  panel = p.kind === 'slot' ? slotPanel(uiRoot, p.id, sim, actions) : cellPanel(uiRoot, p.id, sim, actions);
  placePanel();
}

const picker = createPicker(camera, renderer.domElement, () => view.pickTargets());
picker.onPick(p => { if (mode !== 'play' || sim.phase === 'won' || sim.phase === 'lost') return; if (p) open(p); else closePanel(); });
picker.onHover(p => { hovered = mode === 'play' ? p : null; });
// Klick utanför panelen (men inte i scenen, den sköts av plockaren) stänger den.
document.addEventListener('pointerdown', e => {
  if (!panel || panel.el.contains(e.target) || e.target === renderer.domElement) return;
  closePanel();
});

function go() {
  if (mode !== 'play' || sim.phase !== 'build') return;
  if (startWave(sim) && hinting) { hinting = false; progress = { ...progress, seenHint: true }; save(); }
}
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (mode === 'research') sheetAction('close'); else closePanel(); }
  if (e.key === 'Enter' && mode === 'intro' && !e.repeat) { e.preventDefault(); sheetAction('go'); }
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) go(); }
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
  note(uiRoot, 'Kunde inte spara.');
}
function setMode(m, makeSheet) {
  if (sheet) sheet.close();
  closePanel();
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
  hinting = n === 1 && !progress.seenHint;
  setMode('intro', () => dayIntro(uiRoot, map.days[n - 1], () => setMode('play')));
}
function finishDay() {
  const won = sim.phase === 'won';
  progress = dayResult(progress, { day, won, intelEarned: sim.intelEarned });
  save();
  lastResult = {
    won, day, intelEarned: sim.intelEarned, kills: sim.kills,
    wavesCleared: sim.waveIndex, waves: sim.dayCfg.waves.length,
    lastDay: day >= map.days.length,
  };
  showResult();
}
function showResult() {
  setMode('result', () => dayResultPanel(uiRoot, { ...lastResult, totalIntel: progress.intel }, {
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

// Panelen ligger nere i mitten, men läggs upptill om den skulle täcka det valda.
// Bestäms när panelen öppnas så att den inte hoppar.
const tmpV = new Vector3();
function placePanel() {
  if (!panel || !selected) return;
  const t = view.pickTargets().find(x => x.kind === selected.kind && x.id === selected.id);
  if (!t) return;
  t.object.getWorldPosition(tmpV).project(camera);
  const y = (1 - tmpV.y) / 2 * innerHeight;
  panel.el.classList.toggle('top', y > panel.el.getBoundingClientRect().top - 50);
}

window.__horde = { get sim() { return sim; }, get progress() { return progress; }, get mode() { return mode; }, view, renderer, scene, camera };
showMenu();

let last = performance.now(), time = 0, acc = 0;
function tick(now) {
  const frameDt = Math.min((now - last) / 1000, 0.1);
  last = now; time += frameDt;

  if (mode === 'play') acc += frameDt;
  let steps = 0;
  while (acc >= DT && steps < MAX_STEPS) {
    step(sim, DT); view.consume(sim.events);
    acc -= DT; steps++;
  }
  if (steps === MAX_STEPS) acc = Math.min(acc, DT);
  if (mode !== 'play') acc = 0;
  if (mode === 'play' && (sim.phase === 'won' || sim.phase === 'lost')) finishDay();
  if (hinting) {
    const anyWeapon = sim.slots.some(x => x.weapon);
    hud.hint(mode === 'play' ? (anyWeapon ? 2 : selected?.kind === 'slot' ? 1 : 0) : null);
  } else hud.hint(null);

  if (panel) panel.update(sim);
  hud.update(sim);
  view.setUi({ selected, hover: hovered, range: panelRange || rangeFor(hovered) || rangeFor(selected) });
  view.sync(frameDt);
  updateWorld(frameDt, time);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
