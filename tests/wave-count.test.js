// 0.14.1 (speltestet av 0.14.0: "Wave 2: 12 walkers" mot "8 left", och i Gnesta "13 walkers" mot "22 left"):
// vågens rad och räknaren räknar samma zombier, också de vilande i husen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, debugJumpWave, waveLeft } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { waveText, waveSize, waveCounts } from '../src/ui/hud.js';

test('vågens rad, räknarens total och det som faktiskt släpps är samma tal, varje våg på varje bana', () => {
  for (const map of Object.values(MAPS)) for (const d of map.days) d.waves.forEach((w, i) => {
    const sim = createSim({ map, day: d.n, cash: 0, seed: 1 });
    if (i > 0) debugJumpWave(sim, i + 1);
    startWave(sim);
    const where = `${map.id} dag ${d.n} våg ${i + 1}`;
    assert.equal(waveLeft(sim), waveSize(d, i), where);
    const c = waveCounts(sim);
    assert.equal(c.total, waveSize(d, i), where);
    assert.equal(c.left, c.total, where);
    const inText = [...waveText(d, i).matchAll(/(\d+) \w+/g)].reduce((a, m) => a + Number(m[1]), 0);
    assert.equal(inText, waveSize(d, i), `${where}: ${waveText(d, i)}`);
  });
});

// 0.16.2 (speltestet av 0.16.1: "0 of 32 left" fast 31 zombier gick kvar, och vågens etiketter med olika tal):
// en källa (hud.js waveCounts och comingBySpawn). left = alive + queued i varje läge, och ingångarnas tal plus
// de vilande i husen är det som ännu inte släppts.
import { comingBySpawn } from '../src/ui/hud.js';
import { step } from '../src/sim/sim.js';
const sumComing = sim => [...comingBySpawn(sim).values()].flat().reduce((a, [, n]) => a + n, 0);
test('en källa: kvar = på kartan + inte släppta, ingångarnas tal summerar vågen', () => {
  for (const map of [MAPS.gnesta, MAPS.riksvagen]) for (const d of map.days.slice(0, 3)) {
    const sim = createSim({ map, day: d.n, cash: 0, seed: 1 });
    const where = `${map.id} dag ${d.n}`;
    const dormant = (d.dormant ?? []).filter(x => (x.wave ?? 0) === 0).reduce((a, x) => a + x.count, 0);
    assert.equal(sumComing(sim) + dormant, waveCounts(sim).total, where + ': före vågen');
    startWave(sim);
    for (let t = 0; t < 30 * 40; t++) {
      step(sim, 1 / 30);
      if (sim.phase !== 'wave') break;
      if (t % 90) continue;
      const c = waveCounts(sim), alive = sim.zombies.filter(z => !z.dead).length;
      assert.equal(c.left, alive + sim.spawnQueue.length, where);
      assert.equal(c.alive + c.queued, c.left, where);
      assert.ok(c.left <= c.total, where);
      if (sim.nextWaveIn == null) assert.equal(sumComing(sim), sim.spawnQueue.filter(q => !q.door).length, where);
    }
  }
});

test('evakueringen vinner dagen mitt i en våg: räknaren säger hur många som går kvar, inte 0', () => {
  const sim = createSim({ map: MAPS.gnesta, day: 1, cash: 0, seed: 1 });
  startWave(sim);
  for (let t = 0; t < 30 * 20; t++) step(sim, 1 / 30);
  sim.phase = 'won';
  const c = waveCounts(sim), alive = sim.zombies.filter(z => !z.dead).length + sim.spawnQueue.length;
  assert.ok(alive > 0);
  assert.equal(c.left, alive);
  assert.ok(c.total >= c.left);
});
