// 0.18.1 (speltestet av 0.18.0: Ishallen dag 1 vanns med 5 dödade zombier): evakueringsdagen kräver ett riktigt
// försvar. Utan trupp, eller med de frivilliga vid ishallens dörr långt från korsningarna, faller för många civila.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, debugReach, opStartConfig } from '../src/meta/operation.js';
import { createSim, startWave, step, build } from '../src/sim/sim.js';
import { KIND } from '../src/sim/placement.js';

const run = (place) => {
  const p = debugReach(newCampaign(), 'gnesta', 1), cfg = opStartConfig(p, 1, 'gnesta');
  const sim = createSim({ ...cfg });
  place(sim);
  startWave(sim);
  for (let i = 0; i < 30 * 900 && sim.phase !== 'won' && sim.phase !== 'lost'; i++) { if (sim.phase === 'build' && sim.nextWaveIn == null) startWave(sim); step(sim, 1 / 30); }
  return sim;
};
test('Ishallen dag 1: utan försvar, eller med de frivilliga vid dörren, förloras dagen', () => {
  const none = run(() => {});
  assert.equal(none.phase, 'lost'); assert.equal(none.lostBy, 'civilians');
  const door = run(sim => {
    const b = sim.route.base, pl = sim.place, cand = [];
    for (let k = 0; k < pl.n; k++) if (pl.kind[k] === KIND.open && !pl.walk[k]) { const c = pl.center(k); cand.push([Math.hypot(c.x - b.x, c.z - b.z), k]); }
    cand.sort((a, c) => a[0] - c[0]);
    let n = 0; for (const [, k] of cand) { if (n >= 3) break; if (build(sim, k, 'civ').ok) n++; }
    assert.equal(n, 3);
  });
  assert.equal(door.phase, 'lost'); assert.equal(door.lostBy, 'civilians');
});
