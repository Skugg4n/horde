// Tillfälligt: bygger scenen och världen från Riksvägen och renderar.
import { VERSION } from './version.js';
import { MAPS } from './data/maps.js';
import { createScene } from './render/scene.js';
import { buildWorld, updateWorld } from './render/world.js';

const map = MAPS.riksvagen;
const { renderer, scene, camera } = createScene(document.getElementById('stage'), map);
buildWorld(scene, map);
document.getElementById('ver').textContent = 'v' + VERSION;

let last = performance.now(), time = 0;
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now; time += dt;
  updateWorld(dt, time);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
