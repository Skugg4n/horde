// Tillfälligt: dag 1 spelas av sig själv så att vyn kan ses (uppgift 10 ersätter gränssnittet).
import { VERSION } from './version.js';
import { MAPS } from './data/maps.js';
import { createScene } from './render/scene.js';
import { buildWorld, updateWorld } from './render/world.js';
import { createView } from './render/view.js';
import { createSim, startWave, step, build, placeObstacle } from './sim/sim.js';

const DT = 1 / 30, MAX_STEPS = 5;
const map = MAPS.riksvagen;
const { renderer, scene, camera } = createScene(document.getElementById('stage'), map);
buildWorld(scene, map);
document.getElementById('ver').textContent = 'v' + VERSION;
const status = document.createElement('div');
status.className = 'debug-status';
document.getElementById('ui').appendChild(status);

function newSim() {
  const sim = createSim({ map, day: 1, cash: 5000, research: ['m2', 'block'], seed: (Math.random() * 1e9) | 0 });
  build(sim, 'A', 'm2'); build(sim, 'B', 'm249'); build(sim, 'C', 'm249');
  placeObstacle(sim, 1, 'wire'); placeObstacle(sim, 2, 'wire'); placeObstacle(sim, 0, 'block');
  startWave(sim);
  return sim;
}

let sim = newSim();
const view = createView(scene, sim);
window.__horde = { get sim() { return sim; }, view, renderer, scene };

let last = performance.now(), time = 0, acc = 0, wait = 0;
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

  if (sim.phase === 'build') {
    wait += frameDt;
    if (wait > 2) { wait = 0; startWave(sim); }
  } else if (sim.phase === 'won' || sim.phase === 'lost') {
    wait += frameDt;
    if (wait > 3) { wait = 0; sim = newSim(); view.setSim(sim); }
  } else wait = 0;

  status.textContent = `Bas ${Math.max(0, sim.baseHp)}  ·  Våg ${Math.min(sim.waveIndex + 1, sim.dayCfg.waves.length)} av ${sim.dayCfg.waves.length}`;
  view.sync(frameDt);
  updateWorld(frameDt, time);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
