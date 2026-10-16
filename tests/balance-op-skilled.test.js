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
  // E4 dag 2 och 3, Gnesta South dag 2 och Gnesta North dag 4 kostar alltid något
  for (const [m, d] of [['riksvagen', 2], ['riksvagen', 3], ['gnesta', 2], ['gnesta-norr', 4]]) {
    for (const r of rs) assert.ok(r.log.find(x => x.mapId === m && x.day === d && x.won).baseHp < 20, `${m} dag ${d}`);
  }
});

test('skilled: bonusarna belönar skicklighet (snabb seger, få förluster, oskadad bas)', () => {
  const b = rs.flatMap(r => r.log.flatMap(x => x.bonuses));
  for (const id of ['fast', 'losses', 'base']) assert.ok(b.includes(id), id);
});

// Kvittot per kampanjsteg. Ett ändrat steg ska vara avsiktligt och förklarat i docs/balance-log.md.
// 0.14.0: första kvittot.
const BEFORE = {"riksvagen 1":"b9d80ab1","riksvagen 2":"96bf7adc","riksvagen 3":"f0d3daf2","gnesta 1":"af28932d","gnesta 2":"700d5359","gnesta 3":"ddef6806","gnesta 4":"887e3275","gnesta 5":"b198f0e6","gnesta-norr 1":"b1d0f348","gnesta-norr 2":"f6325f93","gnesta-norr 3":"7b11e1e4","gnesta-norr 4":"91100b1d","gnesta-norr 5":"c1a3ad1b"};
test('skilled: kvittot per kampanjsteg är oförändrat', () => {
  const now = prints(rs);
  assert.deepEqual(changed(now, BEFORE), [], JSON.stringify(now));
});
