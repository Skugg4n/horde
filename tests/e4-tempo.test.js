// 0.14.2 (speltestet av 0.14.1): E4 dag 2 svängde för mycket. Utan uppgraderingar föll basen från 17 till 0
// på några sekunder (en klunga löpare nådde fram), med två uppgraderingar var dagen en promenad.
// Nu tar spärren dem en i taget (map.door, src/sim/sim.js doorBreak), så att basen faller gradvis, och
// löparna kommer i fler och mindre klungor. Proven spelar dag 2 med styrkan man har efter dag 1, utan
// något köpt i förrådet (den svagaste spelaren), med den normala policyn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { newCampaign, finishDay } from '../src/meta/operation.js';
import { selectMap } from '../src/meta/progress.js';
import { playOpDay } from '../scripts/balance.mjs';

const SEEDS = [0, 7919, 15838];
function weakDay2(seedOffset) {
  let p = selectMap(newCampaign(), 'riksvagen');
  const r1 = playOpDay(p, 'riksvagen', 1, 'normal', { seedOffset });
  p = finishDay(p, { mapId: 'riksvagen', day: 1, won: r1.won, intelEarned: r1.intelEarned, report: r1.report }).progress;
  const hp = [];
  const r = playOpDay(p, 'riksvagen', 2, 'normal', { seedOffset, onSecond: sim => hp.push(Math.max(0, sim.baseHp)) });
  return { r, hp };
}

test('E4 har en spärr som släpper in en i taget', () => {
  assert.ok(MAPS.riksvagen.door?.gap >= 3, 'door.gap');
});

test('E4 dag 2 utan uppgraderingar: vinst med skada, och basen faller aldrig på några sekunder', () => {
  for (const s of SEEDS) {
    const { r, hp } = weakDay2(s);
    assert.ok(r.won, `seed ${s}: dagen vanns (bas ${r.baseHp})`);
    assert.ok(r.baseHp < 20, `seed ${s}: basen tog skada (${r.baseHp})`);
    // högst 4 förlorade på 10 s (en var 3,2 s vid spärren)
    for (let i = 10; i < hp.length; i++) assert.ok(hp[i - 10] - hp[i] <= 4, `seed ${s}: ${hp[i - 10]} till ${hp[i]} på 10 s`);
  }
});
