// 0.26.1 (H601, helspeltestet 2026-11-16): dag 13 (Björnlunda dag 2) stod fem zombier still bakom skrotbilar i över tre
// minuter och vågen tog aldrig slut. Ingen zombie står länge utan framsteg, och varje dag tar slut.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, placeAcross, hasNextWave, STUCK } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { fuzzDay } from '../scripts/stuck-fuzz.mjs';

const DT = 1 / 30;
// Dagen utan trupp: basen tål allt och de civila får falla (bara rörelsen prövas).
function bare(map, day, seed = 1) {
  const d0 = map.days[day - 1];
  const dayCfg = { ...d0, ...(d0.evac ? { evac: { ...d0.evac, need: 0 } } : {}) };
  const sim = createSim({ map: { ...map, baseHp: 1e9 }, day, cash: 1e6, seed, core: [], research: ['block.1'], dayCfg });
  return { sim, waves: dayCfg.waves.length };
}
// Kör tills alla vågor är klara. Svar: längsta tid någon levande zombie stått utan framsteg utan att slå på något.
function run(sim, waves, limit = 1500) {
  const best = new Map();
  let worst = 0;
  startWave(sim);
  while (sim.time < limit && sim.phase !== 'lost' && sim.waveIndex < waves) {
    step(sim, DT);
    if (sim.phase === 'build' && sim.nextWaveIn == null && hasNextWave(sim)) startWave(sim);
    for (const z of sim.zombies) {
      if (z.dead) continue;
      const f = sim.route.togo(z), b = best.get(z.id), v = sim.routeV ?? 0;
      if (!b || b.v !== v || f < b.f - 1e-4 || (z.attacking && z.bash == null) || z.atDoor) best.set(z.id, { f: Math.min(f, b && b.v === v ? b.f : Infinity), t: sim.time, v });
      else worst = Math.max(worst, sim.time - b.t);
    }
  }
  return { worst, done: sim.waveIndex >= waves || sim.phase === 'lost', time: sim.time };
}

test('H601: speltestets skrotbilar vid hyreshuset på dag 13 (Björnlunda dag 2), vågen tar slut', () => {
  const map = MAPS.bjornlunda;
  // spärrarna där horden frös (bild 19): skrotbilarna tvärs över vägen vid spåret väster om hyreshuset, betong på
  // Lokalvägens fortsättning och skrotbilar på östra infarten
  for (const seed of [3, 1]) {
    const { sim, waves } = bare(map, 2, seed);
    for (const [t, x, z] of [['block', -91, 78], ['car', 67, 118], ['car', -27, 76]]) assert.ok(placeAcross(sim, sim.route.cellAt(x, z), t).ok, `${t} vid ${x}, ${z}`);
    const r = run(sim, waves);
    assert.ok(r.done, `seed ${seed}: dagen tog slut (${Math.round(r.time)} s)`);
    assert.ok(r.worst < STUCK.bash, `seed ${seed}: längst ${r.worst.toFixed(1)} s utan framsteg`);
  }
});

test('H601: den som ändå fastnar slår på närmaste hinder efter 8 s och går igenom efter 30 s', () => {
  const map = MAPS.bjornlunda, spawn = map.days[0].waves[0].groups[0].spawn;
  const dayCfg = { ...map.days[0], waves: [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0, spawn }] }] };
  const sim = createSim({ map: { ...map, baseHp: 1e9 }, day: 1, cash: 1e6, seed: 1, core: [], research: ['block.1'], dayCfg });
  const orig = sim.route.advance.bind(sim.route);
  // en zombie som inte kommer någonstans (bara när den går igenom flyttar den sig)
  sim.route.advance = (z, d) => (z.ghost ? orig(z, d) : undefined);
  startWave(sim);
  while (!sim.zombies.length) step(sim, DT);
  const z = sim.zombies[0], R = sim.route, f = R.flow;
  // mitt på vägen, inne på spelytan, med skrotbilar två rutor fram: efter STUCK.bash slår den på dem
  const path = R.paths([spawn])[0].cells, mid = path[Math.floor(path.length / 2)];
  R.climbInto(z, mid);
  for (let i = 0; i < 3; i++) step(sim, DT);
  const t0 = sim.time, ahead = f.next[f.next[z.cell]];
  assert.ok(placeAcross(sim, ahead, 'car').ok);
  let bashAt = null;
  while (!z.ghost && sim.time - t0 < 40) { step(sim, DT); if (z.bash != null && bashAt == null) bashAt = sim.time - t0; }
  assert.ok(bashAt != null && Math.abs(bashAt - STUCK.bash) < 1, `slår efter ${bashAt} s`);
  assert.ok(z.ghost, 'går igenom');
  assert.ok(Math.abs(sim.time - t0 - STUCK.ghost) < 1, `efter ${(sim.time - t0).toFixed(1)} s`);
  const togo = sim.route.togo(z);
  for (let i = 0; i < 5 * 30; i++) step(sim, DT);
  assert.ok(sim.route.togo(z) < togo, 'kommer framåt');
  assert.equal(z.ghost, false, 'vanlig igen när den kommit framåt');
});

test('H601: slumpade spärrar och skrotbilar på varje bana och dag, dagen tar alltid slut', () => {
  for (const map of Object.values(MAPS)) {
    if (!map.grid || !map.days) continue;
    for (const d of map.days) {
      const r = fuzzDay(map, d.n, 1);
      if (!r) continue;
      const ended = ['won', 'lost', 'exodus'].includes(r.phase) || r.door;
      assert.ok(ended, `${map.id} dag ${d.n}: ${r.phase} efter ${r.time} s, ${r.alive} kvar ${JSON.stringify(r.placed)}`);
      assert.deepEqual(r.stuck, [], `${map.id} dag ${d.n} ${JSON.stringify(r.placed)}`);
    }
  }
});
