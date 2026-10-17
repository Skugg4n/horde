// 0.16.4 (Olas bonus): löparna snubblar ibland. Deterministiskt per zombie och frö, ungefär en gång per 20 till 40 m
// (med chansen 0,6), och snubblet kostar riktig tid i simuleringen (cirka 1 s), samma som vyn ritar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, stumbleOf } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { ZOMBIES } from '../src/data/zombies.js';

const DT = 1 / 30;
const E4 = MAPS.riksvagen;
const map = { ...E4, baseHp: 999, days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'runner', count: 30, interval: 0.7, delay: 0, spawn: 'nykoping' }, { type: 'walker', count: 10, interval: 1, delay: 0, spawn: 'nykoping' }] }] }] };
function run(seed = 3) {
  const sim = createSim({ map, day: 1, cash: 0, seed });
  startWave(sim);
  const trips = new Map(), slow = new Map(), runs = new Map();
  while (sim.phase === 'wave' && sim.time < 300) {
    step(sim, DT);
    for (const e of sim.events) if (e.t === 'stumble') trips.set(e.id, (trips.get(e.id) ?? 0) + 1);
    for (const z of sim.zombies) {
      runs.set(z.id, z.run ?? 0);
      const s = stumbleOf(z);
      if (s) slow.set(z.id, (slow.get(z.id) ?? 0) + DT);
      if (z.type === 'walker') assert.equal(stumbleOf(z), null, 'vandrarna snubblar inte');
    }
    sim.events = [];
  }
  return { trips, slow, runs, time: sim.time };
}

test('snubblet är deterministiskt: samma frö ger samma snubbel', () => {
  const a = run(), b = run();
  assert.deepEqual([...a.trips], [...b.trips]);
  assert.notDeepEqual([...run(4).trips], [...a.trips], 'ett annat frö snubblar annorlunda');
});

test('ungefär en gång per 20 till 40 m för löparna, ingen gång för vandrarna', () => {
  const r = run();
  const st = ZOMBIES.runner.stumble;
  let metres = 0, n = 0;
  for (const [id, m] of r.runs) if (r.trips.has(id) || m > 0) { metres += m; n += r.trips.get(id) ?? 0; }
  assert.ok(n > 0, 'någon snubblade');
  const per = metres / n;
  // väntevärdet (20 + 40) / 2 / chansen, med marginal (en del av vägen är dimma där ingen snubblar, vandrarnas meter räknas också)
  assert.ok(per >= 20 && per <= 300, `${per.toFixed(1)} m per snubbel`);
  for (const t of r.slow.values()) assert.ok(t % st.time < st.time + DT * 2);
});

test('snubblet kostar tid: cirka 1 s långsammare per snubbel', () => {
  const st = ZOMBIES.runner.stumble;
  const lost = st.time - (st.slow[0] * st.steps[0] + st.slow[1] * (st.steps[1] - st.steps[0]) + st.slow[2] * (1 - st.steps[1])) * st.time;
  assert.ok(lost >= 0.6 && lost <= 1.5, `${lost.toFixed(2)} s förlorade`);
});
