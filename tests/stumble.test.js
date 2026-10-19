// 0.16.4 (Olas bonus): löparna snubblar ibland. Deterministiskt per zombie och frö, och snubblet kostar riktig tid i
// simuleringen, samma som vyn ritar.
// 0.19.0 (H454, H455): sällsynt och oregelbundet (chansen 0,2 var 40 till 90 m), helst utlöst av en tung träff,
// taggtråden eller en skarp sväng. Tre varianter (snavar, glider, kravlar) som behåller farten framåt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, stumbleOf, stumbleSpeed } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { ZOMBIES } from '../src/data/zombies.js';

const DT = 1 / 30;
const E4 = MAPS.riksvagen;
// 0.19.1: 120 löpare (var 30): snubblet är nu så sällsynt att 30 inte visar alla tre varianterna
const map = { ...E4, baseHp: 999, days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'runner', count: 120, interval: 0.3, delay: 0, spawn: 'nykoping' }, { type: 'walker', count: 10, interval: 1, delay: 0, spawn: 'nykoping' }] }] }] };
function run(seed = 3, m = map) {
  const sim = createSim({ map: m, day: 1, cash: 0, seed });
  startWave(sim);
  const trips = new Map(), kinds = {}, why = {}, runs = new Map(), sides = new Set();
  while (sim.phase === 'wave' && sim.time < 300) {
    step(sim, DT);
    for (const e of sim.events) if (e.t === 'stumble') { trips.set(e.id, (trips.get(e.id) ?? 0) + 1); kinds[e.kind] = (kinds[e.kind] ?? 0) + 1; why[e.why] = (why[e.why] ?? 0) + 1; }
    for (const z of sim.zombies) {
      runs.set(z.id, Math.max(runs.get(z.id) ?? 0, z.run ?? 0));
      const s = stumbleOf(z);
      if (s) sides.add(s.side);
      if (z.type === 'walker') assert.equal(stumbleOf(z), null, 'vandrarna snubblar inte');
    }
    sim.events = [];
  }
  return { trips, kinds, why, runs, sides };
}

test('snubblet är deterministiskt: samma frö ger samma snubbel', () => {
  const a = run(), b = run();
  assert.deepEqual([...a.trips], [...b.trips]);
  assert.notDeepEqual([...run(4).trips], [...a.trips], 'ett annat frö snubblar annorlunda');
});

test('sällsynt och oregelbundet: alla tre varianterna, snava vanligast, båda sidor', () => {
  const r = run();
  const n = Object.values(r.kinds).reduce((a, b) => a + b, 0);
  assert.ok(n > 0, 'någon snubblade');
  assert.ok(r.kinds.trip > r.kinds.slide && r.kinds.trip > r.kinds.scramble, JSON.stringify(r.kinds));
  assert.ok(r.kinds.slide > 0 && r.kinds.scramble > 0, JSON.stringify(r.kinds));
  assert.deepEqual([...r.sides].sort(), [-1, 1]);
  // inte alla snubblar lika ofta (förut gav en trasig tärning alla samma)
  const counts = new Set([...r.trips.values()]);
  assert.ok(counts.size > 1 || r.trips.size < 20, 'olika många per löpare');
  // sällsynt: över 100 m löpning per snubbel i snitt (förut cirka 50)
  let metres = 0;
  for (const m of r.runs.values()) metres += m;
  assert.ok(metres / n > 100, `${(metres / n).toFixed(0)} m per snubbel`);
});

test('farten behålls: ingen variant står still, och snubblet kostar lite tid', () => {
  for (const v of ZOMBIES.runner.stumble.variants) {
    let lost = 0, min = 1;
    for (let u = 0; u <= 1; u += 0.01) { const s = stumbleSpeed(v, u); min = Math.min(min, s); lost += (1 - s) * v.time * 0.01; }
    assert.ok(min >= 0.15, `${v.id}: farten ${min}`);
    assert.ok(lost > 0.1 && lost < 1, `${v.id}: ${lost.toFixed(2)} s förlorade`);
  }
});

test('taggtråden kan fälla löparen', async () => {
  const S = await import('../src/sim/sim.js');
  // taggtråd tvärs över vägen: några löpare snavar i tråden
  const sim = createSim({ map, day: 1, cash: 9999, seed: 5 });
  const path = sim.route.paths(['nykoping'])[0].cells, at = Math.floor(path.length * 0.6);
  for (const c of path.slice(at, at + 3)) assert.ok(S.placeAcross(sim, c, 'wire').ok);
  startWave(sim);
  const why = {};
  while (sim.phase === 'wave' && sim.time < 200) { step(sim, DT); for (const e of sim.events) if (e.t === 'stumble') why[e.why] = (why[e.why] ?? 0) + 1; }
  assert.ok(why.wire > 0, JSON.stringify(why));
});

// 0.19.1 (speltestet av 0.19.0, fynd 5: dag 4 snubblade 10 av 16 löpare, flera två och tre gånger, och tre till fyra på
// samma ruta vid brofästet inom 1,5 s). Mätt över en hel korsning av Mölnbo (inget försvar, god mode): ungefär var femte
// löpare snubblar, nästan ingen två gånger, och inga två snubbel inom 4 m och 10 s.
for (const day of [1, 4]) {
  test(`Mölnbo dag ${day}: ungefär var femte löpare snubblar, sällan två gånger, aldrig flera på samma ställe`, () => {
    const sim = createSim({ map: MAPS.molnbo, day, cash: 0, seed: 1, tweaks: { god: true } });
    startWave(sim);
    const trips = new Map(), runners = new Set(), at = [];
    while (sim.phase !== 'won' && sim.phase !== 'lost' && sim.time < 900) {
      step(sim, DT);
      for (const z of sim.zombies) if (z.type === 'runner') runners.add(z.id);
      for (const e of sim.events) if (e.t === 'stumble') {
        trips.set(e.id, (trips.get(e.id) ?? 0) + 1);
        const z = sim.zombies.find(q => q.id === e.id);
        at.push({ x: z.x, z: z.z, t: sim.time });
      }
    }
    const share = trips.size / runners.size, twice = [...trips.values()].filter(n => n > 1).length;
    assert.ok(share >= 0.1 && share <= 0.33, `${trips.size} av ${runners.size} snubblade`);
    assert.ok(twice <= Math.max(1, runners.size * 0.06), `${twice} snubblade mer än en gång`);
    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
      const a = at[i], b = at[j];
      assert.ok(!(Math.abs(a.t - b.t) < 10 - 1e-6 && Math.hypot(a.x - b.x, a.z - b.z) < 4 - 0.5), `två snubbel på samma ställe vid ${a.t.toFixed(1)} och ${b.t.toFixed(1)}`);
    }
  });
}
