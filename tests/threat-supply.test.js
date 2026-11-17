// 0.26.5 (speltestet av 0.26.4): ↻R på 3 till 5 pjäser och R som vred ett steg i taget (threatOf: hotet en pjäs ser), och
// pengarna som hopade sig (supplyAll: ammolådor och sandsäckar till alla med ett klick).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, threatOf, rotateGun, supplyAll, supplyAllCost, supplyAllSpend, supplyKeep, RECREW } from '../src/sim/sim.js';
import { opStartConfig, debugReach, newCampaign } from '../src/meta/operation.js';
import { selectMap } from '../src/meta/progress.js';
import { autoDeploy } from '../scripts/balance.mjs';
import { SUPPLIES } from '../src/data/weapons.js';

function molnbo2() {
  const p = selectMap(debugReach(newCampaign(), 'molnbo', 2), 'molnbo');
  const sim = createSim(opStartConfig(p, 2, 'molnbo'));
  autoDeploy(sim);
  return sim;
}

test('threatOf: riktningen mot närmaste grupp i pjäsens sikt, och en vridning dit', () => {
  const sim = molnbo2();
  startWave(sim);
  let seen = null;
  for (let t = 0; t < 30 * 120 && !seen; t++) {
    step(sim, 1 / 30);
    if (t % 30) continue;
    seen = sim.guns.find(g => !g.squad && g.facing != null && threatOf(sim, g));
  }
  assert.ok(seen, 'ingen pjäs såg något på två minuter');
  const th = threatOf(sim, seen);
  assert.ok(th.n >= 1 && Number.isFinite(th.facing));
  assert.ok(Math.abs(Math.atan2(th.z - seen.z, th.x - seen.x) - th.facing) < 1e-9);
  assert.equal(rotateGun(sim, seen.id, th.facing).ok, true);
  for (let t = 0; t < 30 * 6; t++) step(sim, 1 / 30);
  const d = Math.atan2(Math.sin(seen.facing - th.facing), Math.cos(seen.facing - th.facing));
  assert.ok(Math.abs(d) < 0.05, `vriden till ${seen.facing}, väntat ${th.facing}`);
});

test('supplyAll: ammolådor till alla och sandsäckar till grupperna, så långt pengarna räcker ovanför en ny besättning', () => {
  const sim = molnbo2();
  const all = supplyAllCost(sim), keep = supplyKeep(sim);
  assert.ok(all > 0);
  // 0.26.6 (speltestet av 0.26.5: ett klick tog 580 av 583 $): köpet lämnar pengar till en ny besättning
  assert.equal(keep, RECREW.cost);
  sim.cash = all + keep + 50;
  assert.equal(supplyAllSpend(sim), all);
  const r = supplyAll(sim);
  assert.equal(r.ok, true);
  assert.equal(r.cost, all);
  assert.equal(r.kept, keep);
  assert.equal(sim.cash, keep + 50);
  assert.equal(supplyAllCost(sim), 0);
  assert.equal(supplyAllSpend(sim), 0);
  for (const g of sim.guns) if (!g.weapon.type.startsWith('epa')) assert.ok(g.weapon.ammo, g.weapon.type);
  const sim2 = molnbo2();
  sim2.cash = SUPPLIES.ammo.cost * 2 + keep + 10;
  assert.equal(supplyAllSpend(sim2), SUPPLIES.ammo.cost * 2);
  const r2 = supplyAll(sim2);
  assert.equal(r2.n, 2);
  assert.equal(r2.units, 2);
  assert.ok(sim2.cash >= keep, `kvar ${sim2.cash}`);
  assert.equal(supplyAll(sim2).ok, false);
  sim2.cash = 0;
  assert.equal(supplyAll(sim2).ok, false);
});
