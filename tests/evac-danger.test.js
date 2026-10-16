// 0.16.1 (speltestet av 0.16.0, "SPELBART: NEJ"): Hagstumosse dag 1 förlorades tre gånger utan att testaren förstod
// varför. Farozonerna (där de civilas väg går in på hordens) och de föreslagna platserna för de frivilliga
// (src/sim/evac-danger.js). Den som ställer de frivilliga där tipset säger vinner dagen med marginal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, finishDay, opStartConfig } from '../src/meta/operation.js';
import { selectMap } from '../src/meta/progress.js';
import { createSim, build, startWave, step } from '../src/sim/sim.js';
import { dangerZones, coverSpots } from '../src/sim/evac-danger.js';
import { playOpDay } from '../scripts/balance.mjs';

let after = null;
function afterE4() {
  if (after) return after;
  let p = selectMap(newCampaign(), 'riksvagen');
  for (const d of [1, 2, 3]) { const r = playOpDay(p, 'riksvagen', d, 'normal'); p = finishDay(p, { mapId: 'riksvagen', day: d, won: r.won, intelEarned: r.intelEarned, report: r.report }).progress; }
  return (after = selectMap(p, 'gnesta'));
}
const day1 = (seed = 0) => { const cfg = opStartConfig(afterE4(), 1, 'gnesta'); return createSim({ ...cfg, seed: cfg.seed + seed }); };

test('Hagstumosse dag 1 har farozoner på de civilas väg och en föreslagen plats per zon', () => {
  const sim = day1();
  const zones = dangerZones(sim), spots = coverSpots(sim);
  assert.ok(zones.length >= 2, `zoner: ${zones.length}`);
  assert.ok(spots.length >= zones.length, `platser: ${spots.length}`);
});

test('den som följer tipset vinner Hagstumosse dag 1 med marginal', () => {
  for (const seed of [0, 7919, 15838, 23757, 31676]) {
    const sim = day1(seed);
    let placed = 0;
    for (const s of coverSpots(sim)) if (build(sim, s.key, 'civ').ok) placed++;
    assert.ok(placed >= 3, `seed ${seed}: ${placed} grupper ute`);
    startWave(sim);
    for (let t = 0; t < 30 * 600 && (sim.phase === 'wave' || sim.phase === 'build'); t++) {
      step(sim, 1 / 30);
      if (sim.phase === 'build' && sim.nextWaveIn == null) startWave(sim);
    }
    assert.equal(sim.phase, 'won', `seed ${seed}`);
    assert.ok(sim.evac.safe >= 16, `seed ${seed}: ${sim.evac.safe} framme`);
  }
});

test('den som ställer de frivilliga vid ishallen förlorar fortfarande (avsikten står kvar)', () => {
  const sim = day1();
  const p = sim.place, b = sim.route.base;
  let placed = 0;
  for (let k = 0; k < p.n && placed < 3; k++) { const c = p.center(k); if (Math.hypot(c.x - b.x, c.z - b.z) < 14 && build(sim, k, 'civ').ok) placed++; }
  startWave(sim);
  for (let t = 0; t < 30 * 600 && (sim.phase === 'wave' || sim.phase === 'build'); t++) { step(sim, 1 / 30); if (sim.phase === 'build' && sim.nextWaveIn == null) startWave(sim); }
  assert.ok(sim.evac.safe < 16, `${sim.evac.safe} framme`);
});
