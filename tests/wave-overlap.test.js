// 0.18.1 (speltestet av 0.18.0: Mölnbo dag 5 hade alla fem vågor ute inom fyra minuter och Vikingavägen dag 4 310
// zombier samtidigt). Överlappens grind (src/sim/sim.js overlapGate): utan att spelaren kallar tidigt är högst två
// vågor igång samtidigt, på varje dag på varje bana. Nästa våg kommer av sig själv först när de äldre är klara och
// OVERLAP_SPENT av den senaste är döda (eller framme vid basen), eller när den långa klockan gått ut.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, overlapGate, wavesOnRoad, OVERLAP_SPENT, OVERLAP_BEAT } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

// Igång: en våg med zombier kvar att släppa eller levande ute på vägen. De som står vid basens dörr (Mölnbo och
// ishallen tar in dem en i taget) är förbi försvaret och räknas inte.
const active = sim => wavesOnRoad(sim).size;

test('högst två vågor igång utan tidigt kall, varje dag på varje bana', () => {
  for (const map of Object.values(MAPS)) for (const d of map.days) {
    // inget försvar och god mode: horden går in i basen, dagen går till slutet (eller tåget, eller de civila)
    const sim = createSim({ map, day: d.n, cash: 0, seed: 1, tweaks: { god: true } });
    startWave(sim);
    let most = 0;
    for (let t = 0; t < 3000 && sim.phase !== 'won' && sim.phase !== 'lost'; t += 0.1) { step(sim, 0.1); most = Math.max(most, active(sim)); }
    assert.ok(most <= 2, `${map.id} dag ${d.n}: ${most} vågor igång samtidigt`);
  }
});

// En dag med överlapp där ingen zombie dör: den långa klockan (dayCfg.overlap) släpper nästa våg, med OVERLAP_BEAT
// s nedräkning, och den tredje vågen väntar tills den första är klar.
const mapOf = ov => {
  const m = MAPS.molnbo;
  const g = n => ({ type: 'walker', count: n, interval: 0.2, delay: 0, spawn: 's2' });
  return { ...m, days: [{ n: 1, startCash: 0, overlap: ov, waves: [g(10), g(10), g(10)].map(x => ({ groups: [x] })) }] };
};
test('grinden: väntar på att 70 % är nere, sedan en nedräkning', () => {
  const sim = createSim({ map: mapOf(400), day: 1, cash: 0, seed: 1, tweaks: { god: true } });
  startWave(sim);
  while (sim.spawnQueue.length) step(sim, 0.1);
  const g0 = overlapGate(sim);
  assert.equal(g0.open, false);
  assert.equal(g0.more, Math.ceil(10 * OVERLAP_SPENT));
  // döda sju av tio för hand
  for (const z of sim.zombies.filter(q => !q.dead).slice(0, 7)) z.dead = true;
  assert.equal(overlapGate(sim).open, true);
  step(sim, 0.1);
  assert.ok(Math.abs(sim.nextWaveIn - OVERLAP_BEAT) < 0.2, `nedräkningen ${sim.nextWaveIn}`);
});
test('grinden: den långa klockan släpper nästa våg, men aldrig en tredje medan den första går', () => {
  const sim = createSim({ map: mapOf(20), day: 1, cash: 0, seed: 1, tweaks: { god: true, speed: 0.01 } });
  startWave(sim);
  for (let t = 0; t < 60; t += 0.1) step(sim, 0.1);
  assert.equal(sim.wavesStarted, 2, 'den långa klockan släppte våg 2');
  for (let t = 0; t < 200; t += 0.1) step(sim, 0.1);
  assert.equal(sim.wavesStarted, 2, 'våg 3 väntar: våg 1 är inte klar');
  assert.equal(overlapGate(sim).older, 1);
});
