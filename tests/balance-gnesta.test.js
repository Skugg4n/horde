import test from 'node:test';
import assert from 'node:assert/strict';
import { gnestaCampaign, playGnestaDay, gnestaPlan, daySpawns, roofPlan } from '../scripts/balance.mjs';
import { placementFor } from '../src/sim/placement.js';
import { MAPS } from '../src/data/maps.js';
import { createSim, placeAcross, removeObstacle, acrossCells } from '../src/sim/sim.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { gnesta } from '../src/data/gnesta.js';
import { SEEDS, logs, tries, naives } from './gnesta-logs.js';

// Körningen (fem seeds, smart och naiv) ligger i gnesta-logs.js och delas med fingeravtrycket.
const winIdx = (log, d) => tries(log, d).findIndex(r => r.won);
const winner = (log, d) => tries(log, d).find(r => r.won);
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

test('dag 1: smart vinner direkt, naiv tar klart mer skada', () => {
  logs.forEach((log, i) => {
    assert.equal(tries(log, 1)[0].won, true, `seed ${i}: dag 1 första försöket`);
    const n = naives[i][0];
    // 0.10.2: <= i stället för <. Med försprånget (lead) ser naives pjäser på Sigtunavägen de första
    // löparna direkt, och i en seed av fem klarar naive dag 1 utan skada. Skillnaden i snitt nedan
    // (minst 5) är kravet som bär: smart är klart bättre, inte i varje enskild seed.
    assert.ok(!n.won || n.baseHp <= winner(log, 1).baseHp, `seed ${i}: naiv ${n.baseHp} mot smart ${winner(log, 1).baseHp}`);
  });
  const smart = mean(logs.map(log => winner(log, 1).baseHp));
  const nv = mean(naives.map(n => n[0].baseHp));
  assert.ok(smart - nv >= 5, `bas kvar: smart ${smart}, naiv ${nv}`);
});

test('dag 2: smart vinner på 1 till 2 försök, naiv förlorar ibland', () => {
  logs.forEach((log, i) => assert.ok(winIdx(log, 2) >= 0 && winIdx(log, 2) <= 1, `seed ${i}: index ${winIdx(log, 2)}`));
  assert.ok(naives.some(n => !n[1].won), 'naiv ska förlora dag 2 i minst en seed');
});

// 0.10.2 (speltestet av 0.10.1: basen 20 till 2 i våg 1, dagen förlorad på två minuter): dag 2 är ett
// steg upp från dag 1, inte en vägg. Naive klarar våg 1 nästan utan skada, vinner oftast men med
// klart mindre kvar än dag 1.
test('dag 2: ett steg upp från dag 1, inte en vägg', () => {
  naives.forEach((n, i) => assert.ok(n[1].waveLog[0].baseHp >= 17, `seed ${i}: naiv efter våg 1 ${n[1].waveLog[0].baseHp}`));
  assert.ok(naives.filter(n => n[1].won).length >= 3, `naiv vinner dag 2 i ${naives.filter(n => n[1].won).length} av 5`);
  const d1 = mean(naives.map(n => n[0].baseHp)), d2 = mean(naives.map(n => n[1].baseHp));
  assert.ok(d2 <= d1 - 4, `naiv bas kvar dag 1 ${d1}, dag 2 ${d2}`);
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

test('smart planen lämnar en väg öppen och tvingar horden runt över fältet', () => {
  for (let d = 1; d <= 5; d++) {
    const ids = daySpawns(gnesta, d);
    const smart = gnestaPlan(gnesta, ids, ['positions.1']);
    const plain = gnestaPlan(gnesta, ids, ['positions.1'], { blocks: [] });
    assert.equal(smart.lines.length, 1);
    assert.ok(smart.len[0] > plain.len[0] + 20, `dag ${d}: Sigtunavägen ${smart.len[0]} mot ${plain.len[0]} rutor`);
    // pjäserna ställs där de ser hordens väg: varje planerad plats ser minst sex rutor av den
    assert.ok(smart.guns.length >= 5 && smart.cov.every(c => c >= 6), `dag ${d}: ${smart.cov.join(', ')}`);
  }
});

test('barrikaden: ett fast pris per spärr, hur bred gatan än är', () => {
  const sim = createSim({ map: gnesta, day: 1, cash: 1000, research: ['wireTough.1', 'block.1'], seed: 1 });
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

test('Psg 90 på taken: planen väljer tak som ser den tvingade vägen, policyn bemannar dem dag 4 och 5', () => {
  const p = placementFor(gnesta);
  for (const d of [4, 5]) {
    const plan = gnestaPlan(gnesta, daySpawns(gnesta, d));
    assert.equal(plan.roofs.length, 2);
    for (const [i, k] of plan.roofs.entries()) {
      assert.ok(p.roof[k] > 0, 'ett tak');
      assert.ok(plan.roofCov[i] >= 40, `dag ${d}: taket ser ${plan.roofCov[i]} rutor av vägen`);
    }
    const before = tries(logs[0], d)[0].before;
    let guns = [];
    const r = playGnestaDay(before, d, 'smart', { seedOffset: SEEDS[0], onSecond: s => { guns = s.guns.map(g => ({ type: g.weapon.type, roof: g.roof, cell: g.cell })); } });
    const roofs = guns.filter(g => g.type === 'psg90' && g.roof);
    assert.ok(roofs.length >= (d === 5 ? 2 : 1), `dag ${d}: ${roofs.length} Psg 90 på tak (vann ${r.won})`);
    for (const g of roofs) assert.ok(plan.roofs.includes(g.cell));
  }
  // utan tak (E4) blir planen tom
  assert.deepEqual(roofPlan(MAPS.riksvagen, placementFor(MAPS.riksvagen).walkKeys).spots, []);
});

test('Hemvärnet med forskningen (0.10.0, H054) är ett riktigt val på Gnesta dag 4, inte bättre än pjäserna', async () => {
  const { HV_POLICY } = await import('../scripts/balance.mjs');
  const HV = ['hvRifles.1', 'hvRifles.2', 'hvRifles.3', 'hvSquad.1', 'hvSquad.2', 'hvVeterans.1'];
  const saved = HV_POLICY.gnesta;
  try {
    HV_POLICY.gnesta = { days: [4], gap: [] };       // en grupp direkt dag 4, före fler pjäser
    let withRes = 0, without = 0, plain = 0;
    logs.forEach((log, i) => {
      const before = tries(log, 4)[0].before;
      const a = playGnestaDay({ ...before, research: [...before.research, ...HV] }, 4, 'smart', { seedOffset: SEEDS[i] });
      const b = playGnestaDay(before, 4, 'smart', { seedOffset: SEEDS[i] });
      assert.equal(a.won, true, `seed ${i}: gruppen med forskning håller dag 4`);
      withRes += a.baseHp; without += b.won ? b.baseHp : 0;
      plain += winner(log, 4).baseHp;
    });
    assert.ok(withRes > without, `forskningen gör gruppen bättre: ${withRes} mot ${without}`);
    assert.ok(withRes <= plain, `men inte bättre än en pjäs till: ${withRes} mot ${plain}`);
  } finally { HV_POLICY.gnesta = saved; }
});

// 0.10.1 (speltestet av 0.10.0): dagarna var 7 till 13 minuter och första skottet kom efter 110 s.
// 0.10.2 (speltestet av 0.10.1: 35 till 45 s): de första i dagens första grupp har ett försprång
// (lead), så första skottet kommer inom 22 s varje dag.
// 0.11.0 (Olas krav: ingångarna ute i diset igen, inte mitt i en korsning): vägen inne på kartan är
// längre (Sigtunavägen från x 84 i stället för 37), så dagen tar upp till 9 minuter och policyns första
// skott (pjäserna vid fältet) kommer efter 52 till 54 s. Horden går fortare i diset och syns i
// kartkanten inom 10 s (tests/fog-spawns.test.js); den som ställer en pjäs där skjuter direkt.
test('en dag på Gnesta tar 4 till 9 minuter vid 1x, och policyns första skott kommer inom 60 s', () => {
  for (const log of logs) for (const r of log.filter(q => q.won)) assert.ok(r.time >= 240 && r.time <= 560, `dag ${r.day}: ${r.time.toFixed(0)} s`);
  for (const log of logs) for (let d = 1; d <= 5; d++) assert.ok(tries(log, d)[0].firstShot <= 60, `dag ${d}: första skottet ${tries(log, d)[0].firstShot}`);
});

test('?debug-tabellen (src/data/arrival.js) är forskningen balansen ger vid ankomsten till Gnesta', async () => {
  const { ARRIVAL } = await import('../src/data/arrival.js');
  assert.deepEqual(ARRIVAL.gnesta, tries(logs[0], 1)[0].before.research);
});
