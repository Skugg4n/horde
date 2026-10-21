// 0.19.0 (speltestet av 0.18.1, fynd 5): vågens svans. När allt har kommit ut och högst fem lever går eftersläntrarna
// (krypare och de långt bort) fortare mot basen efter en stund, så att dagen inte står still i 100 s.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, TAIL } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

const day = (n, type) => ({ n: 1, startCash: 0, waves: [{ groups: [{ type, count: n, interval: 1, delay: 0, spawn: 's1' }] }] });
function arrive(n, type, seed = 1) {
  const sim = createSim({ map: { ...MAPS.molnbo, baseHp: 999, days: [day(n, type)] }, day: 1, cash: 0, seed });
  startWave(sim);
  let hurried = null;
  while (sim.phase === 'wave' && sim.time < 900) { step(sim, 0.1); if (hurried == null && sim.zombies.some(z => z.hurry)) hurried = sim.time; }
  return { t: sim.time, hurried, phase: sim.phase };
}

test('svansen: fyra krypare går fortare efter TAIL.after s, deterministiskt', () => {
  const a = arrive(4, 'crawler');
  assert.ok(a.hurried != null && a.hurried >= TAIL.after - 0.2, `skyndar vid ${a.hurried}`);
  // samma krypare i en stor grupp (svansen gäller inte förrän högst fem lever): långsammare per krypare
  const b = arrive(4, 'crawler', 1);
  assert.equal(a.t, b.t, 'deterministiskt');
  assert.ok(a.t < 400, `klar efter ${a.t.toFixed(0)} s`);
});

test('svansen gäller inte så länge fler än fem lever', () => {
  const sim = createSim({ map: { ...MAPS.molnbo, baseHp: 999, days: [day(8, 'walker')] }, day: 1, cash: 0 });
  startWave(sim);
  for (let i = 0; i < 300; i++) step(sim, 0.1);
  assert.ok(!sim.zombies.some(z => z.hurry));
});

// 0.19.1 (speltestet av 0.19.0, fynd 2: tre bjässar sist gav 90 till 150 s väntan): svansen gäller alla typer
test('svansen: tre bjässar sist skyndar också', () => {
  const a = arrive(3, 'brute');
  assert.ok(a.hurried != null && a.hurried >= TAIL.after - 0.2, `skyndar vid ${a.hurried}`);
  // utan svansen gick de i sin egen takt hela vägen (191 s på väg 57 till Folkets hus, nu cirka 150).
  // 0.20.0: kartan efter satellitbilden, vägen från Järna till Folkets hus är längre (cirka 180 s med svansen)
  assert.ok(a.t < 200, `klar efter ${a.t.toFixed(0)} s`);
});

// 0.23.3 (H550, speltestet av 0.23.2: "4 left: brutes" i 60 till 70 s på Björnlunda): med tail.brutes skyndar högst så
// många bjässar genast och hela vägen; utan (standard) som förut
test('svansen: fyra bjässar sist med tail.brutes skyndar genast och kommer fram tidigare', () => {
  const run = tail => {
    const sim = createSim({ map: { ...MAPS.molnbo, baseHp: 999, days: [{ ...day(4, 'brute'), tail }] }, day: 1, cash: 0, seed: 1 });
    startWave(sim);
    let hurried = null;
    while (sim.phase === 'wave' && sim.time < 900) { step(sim, 0.1); if (hurried == null && sim.zombies.some(z => z.hurry)) hurried = sim.time; }
    return { t: sim.time, hurried };
  };
  const off = run(undefined), on = run({ brutes: 4 });
  assert.ok(on.hurried != null && on.hurried < TAIL.after, `skyndar vid ${on.hurried}`);
  assert.ok(on.t < off.t - 20, `med ${on.t.toFixed(0)} s, utan ${off.t.toFixed(0)} s`);
  assert.equal(TAIL.brutes, 0);
});
