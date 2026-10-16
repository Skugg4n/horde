// Balansen i Operation Södermanland (0.14.0), den skickliga spelaren: läser kartan, kallar vågor tidigt,
// köper ammunition och sandsäckar. Mål (Olas): klarar varje dag på första försöket. docs/balance-log.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runs, prints, changed, attemptsPerStep, STEPS } from './op-logs.js';

const rs = runs('skilled');

test('skilled: hela kampanjen, varje dag på första försöket, i fem seeds', () => {
  rs.forEach((r, i) => {
    assert.equal(r.stuck, null, `seed ${i}: fast på ${JSON.stringify(r.stuck)}`);
    assert.deepEqual(attemptsPerStep(r.log), STEPS.map(() => 1), `seed ${i}`);
  });
});

test('skilled: ribban ligger högt, basen tar skada på de svåra dagarna', () => {
  const hurt = rs.flatMap(r => r.log.filter(x => x.won && x.baseHp < 20));
  assert.ok(hurt.length >= rs.length * 5, `${hurt.length} vunna dagar med skada`);
  // Gnesta North dag 4 kostar alltid något. 0.14.1: E4 är övningen och kan hållas orörd av den skickliga
  // (stupet i dag 2 våg 3 är borttaget); kurvan där mäts på den normala spelaren (balance-op-normal.test.js).
  // E4:s längre dagar ger den skickliga mer RP in i Gnesta, så South dag 2 kostar något i två seeds av fem
  // (var fem av fem); docs/balance-log.md 0.14.1.
  for (const r of rs) assert.ok(r.log.find(x => x.mapId === 'gnesta-norr' && x.day === 4 && x.won).baseHp < 20, 'gnesta-norr dag 4');
  const south2 = rs.filter(r => r.log.find(x => x.mapId === 'gnesta' && x.day === 2 && x.won).baseHp < 20).length;
  assert.ok(south2 >= 2, `gnesta dag 2 kostar något i ${south2} seeds`);
});

test('skilled: bonusarna belönar skicklighet (snabb seger, få förluster, oskadad bas)', () => {
  const b = rs.flatMap(r => r.log.flatMap(x => x.bonuses));
  for (const id of ['fast', 'losses', 'base']) assert.ok(b.includes(id), id);
});

// Kvittot per kampanjsteg. Ett ändrat steg ska vara avsiktligt och förklarat i docs/balance-log.md.
// 0.14.0: första kvittot.
// 0.14.1: alla steg nya, avsiktligt. E4:s tempo (dag 1 till 3) och de civilas hus på Gnesta dag 1 ändrades;
// kampanjen bär RP, enheter och erfarenhet vidare, så varje steg efter rör sig också. Att simuleringen
// i övrigt är orörd visar tests/sim-receipt.test.js (Gnesta South dag 3 och North dag 2 oförändrade).
const BEFORE = {"riksvagen 1":"0d46ca2a","riksvagen 2":"f8f73bfe","riksvagen 3":"acdbbc78","gnesta 1":"8ac7b1cd","gnesta 2":"90394377","gnesta 3":"14b7728d","gnesta 4":"a490e64f","gnesta 5":"42650a55","gnesta-norr 1":"125a8860","gnesta-norr 2":"a1a26a8b","gnesta-norr 3":"8ed12ae7","gnesta-norr 4":"f43d70e9","gnesta-norr 5":"fc61df90"};
test('skilled: kvittot per kampanjsteg är oförändrat', () => {
  const now = prints(rs);
  assert.deepEqual(changed(now, BEFORE), [], JSON.stringify(now));
});
