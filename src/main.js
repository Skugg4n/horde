// Spelet: en dag på Riksvägen. Spelaren bygger mellan vågorna och startar dem själv.
// (Uppgift 11 ersätter slutskylten med den riktiga dagscykeln.)
import { VERSION } from './version.js';
import { MAPS } from './data/maps.js';
import { createScene } from './render/scene.js';
import { buildWorld, updateWorld } from './render/world.js';
import { createView } from './render/view.js';
import { createPicker } from './render/picking.js';
import { mountHud } from './ui/hud.js';
import { slotPanel, cellPanel } from './ui/panels.js';
import { createSim, startWave, step, build, upgrade, sell, placeObstacle, removeObstacle } from './sim/sim.js';
import { weaponStats } from './sim/stats.js';
import { Vector3 } from 'three';

const DT = 1 / 30, MAX_STEPS = 5;
const map = MAPS.riksvagen;
const { renderer, scene, camera } = createScene(document.getElementById('stage'), map);
buildWorld(scene, map);
document.getElementById('ver').textContent = 'v' + VERSION;
const uiRoot = document.getElementById('ui');

const newSim = () => createSim({ map, day: 1, cash: map.days[0].startCash, research: [], seed: 1001 });
let sim = newSim();
const view = createView(scene, sim);
const hud = mountHud(uiRoot, { onStart: () => go() });

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
picker.onPick(p => { if (sim.phase === 'won' || sim.phase === 'lost') return; if (p) open(p); else closePanel(); });
picker.onHover(p => { hovered = p; });
// Klick utanför panelen (men inte i scenen, den sköts av plockaren) stänger den.
document.addEventListener('pointerdown', e => {
  if (!panel || panel.el.contains(e.target) || e.target === renderer.domElement) return;
  closePanel();
});

function go() {
  if (sim.phase !== 'build') return;
  startWave(sim);
}
addEventListener('keydown', e => {
  if (e.key === 'Escape') closePanel();
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) go(); }
}, true);
addEventListener('keyup', e => { if (e.code === 'Space') e.preventDefault(); }, true);

// ---------- slutskylt (tillfällig) ----------
const endPlate = document.createElement('div');
endPlate.className = 'end plate';
endPlate.hidden = true;
endPlate.innerHTML = `<div class="t"></div><button type="button" class="act again"><span class="a">Spela igen</span></button>`;
uiRoot.appendChild(endPlate);
endPlate.querySelector('.again').addEventListener('click', () => {
  closePanel();
  sim = newSim(); view.setSim(sim); hud.reset();
  endPlate.hidden = true;
});
function showEnd() {
  if (!endPlate.hidden) return;
  closePanel();
  endPlate.querySelector('.t').textContent = sim.phase === 'won' ? 'Dag klarad' : 'Basen föll';
  endPlate.classList.toggle('lost', sim.phase === 'lost');
  endPlate.hidden = false;
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

window.__horde = { get sim() { return sim; }, view, renderer, scene, camera };

let last = performance.now(), time = 0, acc = 0;
function tick(now) {
  const frameDt = Math.min((now - last) / 1000, 0.1);
  last = now; time += frameDt;

  acc += frameDt;
  let steps = 0;
  while (acc >= DT && steps < MAX_STEPS) {
    step(sim, DT); view.consume(sim.events);
    acc -= DT; steps++;
  }
  if (steps === MAX_STEPS) acc = Math.min(acc, DT);
  if (sim.phase === 'won' || sim.phase === 'lost') showEnd();

  if (panel) panel.update(sim);
  hud.update(sim);
  view.setUi({ selected, hover: hovered, range: panelRange || rangeFor(hovered) || rangeFor(selected) });
  view.sync(frameDt);
  updateWorld(frameDt, time);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
