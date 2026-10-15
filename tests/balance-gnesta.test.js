import test from 'node:test';
import assert from 'node:assert/strict';
import { gnestaCampaign, playGnestaDay, gnestaPlan, daySpawns } from '../scripts/balance.mjs';
import { createSim, placeAcross, removeObstacle, acrossCells } from '../src/sim/sim.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { gnesta } from '../src/data/gnesta.js';

// Gnesta efter E4: spelaren har forskningen som en girig E4-körning slutar med. Fem
// seed-förskjutningar, smart policy (barrikad runt kvarteret) dag 1 till 5, och naiv policy
// (samma vapen, aldrig en barrikad) på dagens första försök med samma forskning.
const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const logs = SEEDS.map(seedOffset => gnestaCampaign('smart', 6, { seedOffset }));
const tries = (log, d) => log.filter(r => r.day === d);
const winIdx = (log, d) => tries(log, d).findIndex(r => r.won);
const winner = (log, d) => tries(log, d).find(r => r.won);
const naive = (log, d, i) => playGnestaDay(tries(log, d)[0].before, d, 'naive', { seedOffset: SEEDS[i] });
const naives = logs.map((log, i) => [1, 2, 3, 4, 5].map(d => naive(log, d, i)));
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

test('dag 1: smart vinner direkt, naiv tar klart mer skada', () => {
  logs.forEach((log, i) => {
    assert.equal(tries(log, 1)[0].won, true, `seed ${i}: dag 1 första försöket`);
    const n = naives[i][0];
    assert.ok(!n.won || n.baseHp < winner(log, 1).baseHp, `seed ${i}: naiv ${n.baseHp} mot smart ${winner(log, 1).baseHp}`);
  });
  const smart = mean(logs.map(log => winner(log, 1).baseHp));
  const nv = mean(naives.map(n => n[0].baseHp));
  assert.ok(smart - nv >= 5, `bas kvar: smart ${smart}, naiv ${nv}`);
});

test('dag 2: smart vinner på 1 till 2 försök, naiv förlorar ibland', () => {
  logs.forEach((log, i) => assert.ok(winIdx(log, 2) >= 0 && winIdx(log, 2) <= 1, `seed ${i}: index ${winIdx(log, 2)}`));
  assert.ok(naives.some(n => !n[1].won), 'naiv ska förlora dag 2 i minst en seed');
});

test('dag 3: smart vinner på 1 till 3 försök', () => {
  logs.forEach((log, i) => assert.ok(winIdx(log, 3) >= 0 && winIdx(log, 3) <= 2, `seed ${i}: index ${winIdx(log, 3)}`));
});

test('dag 4: tryck på riktigt, smart vinner inom 3 försök', () => {
  logs.forEach((log, i) => assert.ok(winIdx(log, 4) >= 0 && winIdx(log, 4) <= 2, `seed ${i}: index ${winIdx(log, 4)}`));
  const left = logs.map(log => winner(log, 4).baseHp);
  assert.ok(mean(left) <= 12, `bas kvar dag 4 ${left.join(', ')}`);
});

test('dag 4: forskningen och granatlådorna spelar roll', () => {
  let withKits = 0, without = 0;
  logs.forEach((log, i) => {
    const before = tries(log, 4)[0].before;
    const e4 = tries(log, 1)[0].before.research;     // bara det E4 gav
    assert.equal(playGnestaDay({ ...before, research: e4 }, 4, 'smart', { seedOffset: SEEDS[i] }).won, false, `seed ${i}: dag 4 med bara E4:s forskning ska förloras`);
    const k = playGnestaDay(before, 4, 'smart', { seedOffset: SEEDS[i] });
    const nk = playGnestaDay(before, 4, 'smart', { seedOffset: SEEDS[i], kits: false });
    assert.ok(k.grenades > 0, `seed ${i}: lådorna kastar`);
    assert.ok(k.baseHp >= nk.baseHp, `seed ${i}: med lådor ${k.baseHp}, utan ${nk.baseHp}`);
    withKits += k.baseHp; without += nk.baseHp;
  });
  assert.ok(withKits > without, `bas kvar med lådor ${withKits}, utan ${without}`);
});

test('dag 5: svårast, smart vinner inom 4 försök', () => {
  logs.forEach((log, i) => assert.ok(winIdx(log, 5) >= 0 && winIdx(log, 5) <= 3, `seed ${i}: index ${winIdx(log, 5)}`));
  const left = d => mean(logs.map(log => winner(log, d).baseHp));
  for (const d of [1, 2, 3, 4]) assert.ok(left(5) < left(d), `bas kvar dag 5 ${left(5)} mot dag ${d} ${left(d)}`);
});

test('en förlorad dag rasar gradvis, inte på några sekunder', () => {
  const lost = [
    ...logs.flatMap(log => log.filter(r => !r.won)),
    ...naives.flatMap(n => n.filter(r => !r.won)),
    ...logs.map((log, i) => playGnestaDay({ ...tries(log, 5)[0].before, research: tries(log, 1)[0].before.research }, 5, 'smart', { seedOffset: SEEDS[i] })),
  ];
  assert.ok(lost.some(r => !r.won));
  for (const r of lost) if (!r.won) assert.ok(r.fallTime >= 60, `basen föll på ${r.fallTime.toFixed(0)} s`);
});

test('högst cirka 250 levande zombier samtidigt', () => {
  const peaks = [...logs.flatMap(log => log.map(r => r.peak)), ...naives.flat().map(r => r.peak)];
  assert.ok(Math.max(...peaks) < 250, `flest levande ${Math.max(...peaks)}`);
});

test('smart planen lämnar en väg öppen och tvingar horden runt kvarteret', () => {
  for (let d = 1; d <= 5; d++) {
    const ids = daySpawns(gnesta, d);
    const smart = gnestaPlan(gnesta, ids, ['slot4.1']);
    const plain = gnestaPlan(gnesta, ids, ['slot4.1'], { blocks: [] });
    assert.equal(smart.lines.length, 1);
    assert.ok(smart.len[0] > plain.len[0] + 20, `dag ${d}: Sigtunavägen ${smart.len[0]} mot ${plain.len[0]} rutor`);
  }
});

test('barrikaden: ett fast pris per spärr, hur bred gatan än är', () => {
  const sim = createSim({ map: gnesta, day: 1, cash: 1000, seed: 1 });
  const cell = sim.route.cellAt(-3, 35);                 // Sigtunavägen, 4 rutor bred
  assert.ok(acrossCells(sim, cell).length >= 3);
  const r = placeAcross(sim, cell, 'block');
  assert.equal(r.ok, true);
  assert.equal(r.cost, OBSTACLES.block.cost);
  assert.equal(sim.cash, 1000 - OBSTACLES.block.cost);
  const wire = placeAcross(sim, gnestaPlan(gnesta, ['east1'], []).wire[0], 'wire');
  assert.equal(wire.ok, true);
  assert.equal(sim.cash, 1000 - OBSTACLES.block.cost - OBSTACLES.wire.cost);
  assert.equal(removeObstacle(sim, cell).refund, Math.round(OBSTACLES.block.cost / 2), 'hel spärr: halva priset tillbaka');
});
