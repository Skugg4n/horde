// 0.19.2 (speltestet av 0.19.1, fynd 2: "det syntes inte vilken väg som läckte förrän basen tog skada"): läckorna
// (src/ui/leaks.js) läser simuleringen och säger var zombierna tog sig förbi de sista försvararna.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { streetAt } from '../src/sim/streets.js';
import { createLeakWatch, aheadOf, LEAK } from '../src/ui/leaks.js';

const day = { n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count: 4, interval: 2, delay: 0, spawn: 's1' }] }] };
function run(covers, secs = 400) {
  const sim = createSim({ map: { ...MAPS.molnbo, baseHp: 999, days: [day] }, day: 1, cash: 0, seed: 3 });
  startWave(sim);
  const w = createLeakWatch(), base = sim.route.base, leaks = [];
  const streetOf = (x, z) => streetAt(sim.map, x, z);
  for (let t = 0; t < secs * 30 && sim.phase === 'wave'; t++) {
    step(sim, 1 / 30);
    for (const l of w.update(sim, 1 / 30, { covered: (z, p) => covers(p.x, p.z), ahead: aheadOf(sim, covers), base, streetOf, time: sim.time })) leaks.push({ ...l, t: sim.time, d: Math.hypot(l.x - base.x, l.z - base.z) });
  }
  return leaks;
}

test('en tom väg: läckan nära basen, med gatans namn, en rad för gruppen', () => {
  const leaks = run(() => false);
  assert.ok(leaks.length >= 1, 'ingen läcka');
  for (const l of leaks) assert.ok(l.d <= LEAK.near + 1, `läckan ${Math.round(l.d)} m från basen`);
  assert.ok(leaks.every(l => l.street), leaks.map(l => l.street).join());
});

test('en väg som täcks hela vägen till basen läcker inte', () => {
  assert.deepEqual(run(() => true), []);
});

test('förbi de sista försvararna: läckan är där de sist var under eld', () => {
  // en "linje" som täcker allt längre än 60 m från basen, inget närmare
  const sim0 = createSim({ map: { ...MAPS.molnbo, baseHp: 999, days: [day] }, day: 1, cash: 0, seed: 3 });
  const b = sim0.route.base;
  const leaks = run((x, z) => Math.hypot(x - b.x, z - b.z) > 60);
  assert.ok(leaks.length >= 1);
  for (const l of leaks) assert.ok(Math.abs(l.d - 60) < 6, `läckan ${Math.round(l.d)} m från basen, väntat cirka 60`);
});
