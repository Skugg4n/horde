// 0.19.1 (speltestet av 0.19.0, fynd 3: Move in i ett hus mitt i vågen gick i 1 av 13 hus, villorna sa "Door blocked"
// utan synlig orsak). Dörren valdes bland rutorna horden går på intill huset, och en villa på sin tomt har ingen sådan.
// Nu är dörren den ruta trupperna går på närmast huset (src/sim/houses.js doorCells). Varje hus som en grupp kan läggas i
// i uppställningen går också att springa in i mitt i en våg, när ingen zombie står vid dörren.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build, checkMove, moveGun, housesFor, checkSpot } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { KIND } from '../src/sim/placement.js';
import { doorCells } from '../src/sim/houses.js';
import { crewPassable } from '../src/sim/crew-path.js';

// Gruppen ställs på den öppna ruta närmast kamerans mitt där den får stå; zombierna går nästan inte alls (de blir kvar
// vid ingångarna), så att ingen står vid något hus.
function setup(mapId, day, type = 'inf') {
  const map = MAPS[mapId];
  const sim = createSim({ map, day, cash: 9999, seed: 2, depth: true, tweaks: { speed: 0.001 } });
  sim.maxSquads = 9;
  const p = sim.place, t = map.camera?.target ?? { x: 0, z: 0 };
  const keys = [];
  for (let k = 0; k < p.n; k++) if (p.kind[k] === KIND.open) { const c = p.center(k); keys.push([Math.hypot(c.x - (t.x ?? t[0] ?? 0), c.z - (t.z ?? t[1] ?? 0)), k]); }
  keys.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, k] of keys.slice(0, 400)) if (checkSpot(sim, k, type).ok && build(sim, k, type).ok && !sim.guns[0].house) break;
  assert.ok(sim.guns[0] && !sim.guns[0].house, `${mapId}: gruppen ute`);
  return sim;
}

// Vikingavägen har Hemvärnet (0.22.0: en dag)
for (const [mapId, day, type] of [['molnbo', 2, 'inf'], ['gnesta-norr', 1, 'hv']]) {
  test(`${mapId}: varje hus som går att besätta i uppställningen går att springa in i mitt i vågen`, () => {
    const sim = setup(mapId, day, type), g = sim.guns[0];
    // i uppställningen: husen som gruppen får läggas i (samma prov som när den lyfts dit)
    const houses = housesFor(sim).filter(h => checkMove(sim, g.id, h.cells[0]).ok);
    assert.ok(houses.length >= 8, `${mapId}: ${houses.length} hus`);
    startWave(sim);
    for (let t = 0; t < 1; t += 0.1) step(sim, 0.1);
    assert.equal(sim.phase, 'wave');
    const bad = [];
    for (const h of houses) {
      assert.ok(doorCells(sim.place, h).every(k => crewPassable(sim.place, k)), h.id);
      const r = checkMove(sim, g.id, h.cells[0]);
      if (!r.ok) bad.push(`${h.id}: ${r.reason}`);
    }
    assert.deepEqual(bad, [], `${mapId}: ${bad.length} av ${houses.length} nekas`);
  });
}

test('molnbo: gruppen springer verkligen in i en villa mitt i vågen', () => {
  const sim = setup('molnbo', 2), g = sim.guns[0];
  const villas = housesFor(sim).filter(h => h.kind === 'villa' && checkMove(sim, g.id, h.cells[0]).ok);
  startWave(sim);
  for (let t = 0; t < 1; t += 0.1) step(sim, 0.1);
  // den närmaste villan
  const h = villas.map(v => [Math.hypot(v.x - g.x, v.z - g.z), v]).sort((a, b) => a[0] - b[0])[0][1];
  const r = moveGun(sim, g.id, h.cells[0]);
  assert.ok(r.ok && r.entering === h.id, JSON.stringify(r));
  let entered = false;
  for (let t = 0; t < 90 && !entered; t += 0.1) { step(sim, 0.1); entered = sim.events.some(e => e.t === 'enteredHouse' && e.gunId === g.id); }
  assert.ok(entered && g.house?.id === h.id, 'inne i villan');
});
