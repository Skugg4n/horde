// 0.19.0 (speltestet av 0.18.1, fynd 5): vågens svans. När allt har kommit ut och högst fem lever går eftersläntrarna
// (krypare och de långt bort) fortare mot basen efter en stund, så att dagen inte står still i 100 s.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, TAIL } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

const day = (n, type) => ({ n: 1, startCash: 0, waves: [{ groups: [{ type, count: n, interval: 1, delay: 0, spawn: 's1' }] }] });
function arrive(n, type, seed = 1) {
  const sim = createSim({ map: { ...MAPS.molnbo, baseHp: 999, days: [day(n, type)] }, day: 1, cash: 0, seed });
  startWave(sim);
  let hurried = null;
  while (sim.phase === 'wave' && sim.time < 900) { step(sim, 0.1); if (hurried == null && sim.zombies.some(z => z.hurry)) hurried = sim.time; }
  return { t: sim.time, hurried, phase: sim.phase };
}

test('svansen: fyra krypare går fortare efter TAIL.after s, deterministiskt', () => {
  const a = arrive(4, 'crawler');
  assert.ok(a.hurried != null && a.hurried >= TAIL.after - 0.2, `skyndar vid ${a.hurried}`);
  // samma krypare i en stor grupp (svansen gäller inte förrän högst fem lever): långsammare per krypare
  const b = arrive(4, 'crawler', 1);
  assert.equal(a.t, b.t, 'deterministiskt');
  assert.ok(a.t < 400, `klar efter ${a.t.toFixed(0)} s`);
});

test('svansen gäller inte så länge fler än fem lever', () => {
  const sim = createSim({ map: { ...MAPS.molnbo, baseHp: 999, days: [day(8, 'walker')] }, day: 1, cash: 0 });
  startWave(sim);
  for (let i = 0; i < 300; i++) step(sim, 0.1);
  assert.ok(!sim.zombies.some(z => z.hurry));
});
