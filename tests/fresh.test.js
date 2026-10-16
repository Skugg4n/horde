import test from 'node:test';
import assert from 'node:assert/strict';
import { freshCampaign, FRESH_ORDER } from '../scripts/balance.mjs';
import { createSim, step, startWave, LESSON_MIN } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

// 0.10.1 (speltestet av 0.10.0): en ny spelare utan forskning (?debug&fresh) föll på Gnesta dag 1
// i alla försök, och en förlust gav 7 till 32 i forskning när det billigaste nyttiga kostade 40 till 80.
// Nu ger varje förlust minst LESSON_MIN, Gnesta har Ksp 88 från dag 1, och smart vinner dag 1 inom
// fyra försök med forskningen förlusterna ger (FRESH_ORDER).
const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const logs = SEEDS.map(seedOffset => freshCampaign('gnesta', 'smart', 6, { seedOffset }));

test('ny spelare på Gnesta dag 1: smart vinner inom fyra försök, och varje förlust köper forskning', () => {
  logs.forEach((log, i) => {
    const w = log.findIndex(r => r.won);
    assert.ok(w >= 0 && w <= 3, `seed ${i}: vann på försök ${w + 1}`);
    for (const r of log.filter(q => !q.won)) {
      assert.ok(r.intel >= LESSON_MIN, `seed ${i}: förlusten gav ${r.intel}`);
      assert.ok(r.research.length > r.had.length, `seed ${i}: forskning köpt efter förlusten`);
    }
  });
  assert.ok(FRESH_ORDER.length > 0);
});

test('överlevarnas lärdom: en förlust ger minst LESSON_MIN, en avbruten dag ingenting', () => {
  const map = { ...MAPS.riksvagen, baseHp: 1, days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0 }] }] }] };
  const sim = createSim({ map, day: 1, cash: 0, seed: 1 });
  startWave(sim);
  const seen = [];
  while (sim.phase === 'wave') { step(sim, 1 / 30); seen.push(...sim.events); }
  assert.equal(sim.phase, 'lost');
  assert.equal(sim.intelEarned, LESSON_MIN);
  assert.ok(seen.some(e => e.t === 'lesson' && e.intel === LESSON_MIN));
});
