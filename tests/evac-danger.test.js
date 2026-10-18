// 0.16.1 (speltestet av 0.16.0, "SPELBART: NEJ"): Hagstumosse dag 1 förlorades tre gånger utan att testaren förstod
// varför. Farozonerna (där de civilas väg går in på hordens) och de föreslagna platserna för de frivilliga
// (src/sim/evac-danger.js). Den som ställer de frivilliga där tipset säger vinner dagen med marginal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, finishDay, opStartConfig } from '../src/meta/operation.js';
import { selectMap } from '../src/meta/progress.js';
import { createSim, build, startWave, step } from '../src/sim/sim.js';
import { dangerZones, coverSpots } from '../src/sim/evac-danger.js';
import { playOpDay, opCampaign } from '../scripts/balance.mjs';
import { SEEDS } from './op-logs.js';

let after = null;
function afterE4() {
  if (after) return after;
  let p = selectMap(newCampaign(), 'riksvagen');
  for (const d of [1, 2, 3]) { const r = playOpDay(p, 'riksvagen', d, 'normal'); p = finishDay(p, { mapId: 'riksvagen', day: d, won: r.won, intelEarned: r.intelEarned, report: r.report }).progress; }
  return (after = selectMap(p, 'gnesta'));
}
const day1 = (seed = 0) => { const cfg = opStartConfig(afterE4(), 1, 'gnesta'); return createSim({ ...cfg, seed: cfg.seed + seed }); };

// 0.16.4 (Olas feedback: "dag 1 har ingen agens"): två omgångar hus på olika gator, fyra korsningar och tre grupper
// frivilliga. Inga föreslagna platser i spelet; balansens förstagångsspelare läser farokartan (scripts/balance.mjs
// hints: evacDeploy och evacReposition) och flyttar när evakueringen byter gata.
test('Hagstumosse dag 1 har fyra korsningar, fler än grupperna, i två omgångar', () => {
  const sim = day1();
  const zones = dangerZones(sim);
  assert.ok(zones.length >= 4, `zoner: ${zones.length}`);
  const civ = (sim.reserve ?? []).filter(u => u.type === 'civ').length;
  assert.ok(civ < zones.length, `${civ} grupper, ${zones.length} korsningar: ett val`);
  assert.deepEqual([...new Set(sim.dayCfg.evac.groups.map(g => g.wave))], [0, 1]);
  assert.ok(coverSpots(sim).length >= 3);
});

test('den som läser kartan och täcker korsningarna vinner Hagstumosse dag 1 inom två försök', () => {
  for (const seedOffset of SEEDS) {
    const e4 = opCampaign('normal', { seedOffset, sectors: ['riksvagen'] });
    const r = opCampaign('hints', { seedOffset, sectors: ['gnesta'], start: e4.progress, maxAttempts: 2 });
    const d1 = r.log.filter(x => x.mapId === 'gnesta' && x.day === 1);
    assert.ok(d1.some(x => x.won), `seed ${seedOffset}: ${JSON.stringify(d1.map(x => [x.won, x.evac]))}`);
  }
});

test('den som ställer de frivilliga vid ishallen förlorar fortfarande (avsikten står kvar)', () => {
  const sim = day1();
  const p = sim.place, b = sim.route.base;
  let placed = 0;
  for (let k = 0; k < p.n && placed < 3; k++) { const c = p.center(k); if (Math.hypot(c.x - b.x, c.z - b.z) < 14 && build(sim, k, 'civ').ok) placed++; }
  startWave(sim);
  assert.equal(placed, 3, 'tre grupper vid ishallen');
  for (let t = 0; t < 30 * 600 && (sim.phase === 'wave' || sim.phase === 'build'); t++) { step(sim, 1 / 30); if (sim.phase === 'build' && sim.nextWaveIn == null) startWave(sim); }
  assert.equal(sim.phase, 'lost', `${sim.evac.safe} framme, ${sim.evac.lost} förlorade`);
});
