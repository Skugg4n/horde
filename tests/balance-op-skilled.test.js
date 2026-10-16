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
  // 0.14.2: South dag 2 kostar inte längre den skickliga något. E4 dag 2 håller hon nu med full bas (bonusen
  // för oskadad bas), och RP:n räcker till en tredje Ksp 90 före Gnesta; med tre håller spärren vid rondellen
  // (hp 3,6 på South dag 2 ändrar inte det). Kvar till balanspasset för South och North (todo.md).
  // E4 dag 3 kostar henne något i fyra seeds av fem.
  const e3 = rs.filter(r => r.log.find(x => x.mapId === 'riksvagen' && x.day === 3 && x.won).baseHp < 20).length;
  assert.ok(e3 >= 3, `E4 dag 3 kostar något i ${e3} seeds`);
});

// 0.14.2 (speltestet av 0.14.1: 1 042 dollar oanvända efter E4 dag 3): förnödenheterna hopar sig inte sent.
test('skilled: E4 dag 3 slutar utan stort överskott av förnödenheter', () => {
  for (const [i, r] of rs.entries()) {
    const x = r.log.find(q => q.mapId === 'riksvagen' && q.day === 3 && q.won);
    assert.ok(x.cashEnd < 500, `seed ${i}: $ ${x.cashEnd} kvar`);
  }
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
// 0.14.2: alla steg nya, avsiktligt (E4:s spärr, dag 2 och 3, skogsbrynet på Gnesta; docs/balance-log.md 0.14.2).
// 0.15.0: alla steg nya, avsiktligt: E4 är trafikplatsen vid Lästringe (ett rutnät med avfarten, påfarten dag 2
// och nya hp 3,2, 3,6 och 1,2); kampanjen bär det vidare in i Gnesta (docs/balance-log.md 0.15.0).
// 0.16.0: alla steg nya, avsiktligt: inlärningen (E4 dag 1 utan förnödenheter med infanteriet vid bommen och den
// andra Ksp 90 efter våg 1, pillboxen dag 3, barrikaderna från South dag 2, förrådet i steg från South dag 2,
// knappheten i rekvisitionen och uppgraderingarna i ledningens takt, Hagstumosse som en sektor med en trupp;
// docs/balance-log.md 0.16.0).
// 0.16.1: alla steg nya, avsiktligt: E4 dag 1 till 3 med jämnare sista vågor (32, 60, och bjässarna delade mellan
// våg 2 och 3, H192), överskottet på fler trådar (policyn), Ishallen dag 1 med våg 2:s löpare senare (speltestet av
// 0.16.0), South dag 3 och 4 med mindre förnödenheter per dödad (H215). docs/balance-log.md 0.16.1.
const BEFORE = {"riksvagen 1":"37ca880a","riksvagen 2":"d57d442a","riksvagen 3":"b59eecbe","gnesta 1":"24ffed1c","gnesta 2":"9246b8d5","gnesta 3":"6c18441e","gnesta 4":"795c2dfc","gnesta 5":"aeeddcff","gnesta-norr 1":"2d16b237","gnesta-norr 2":"a8b18c09","gnesta-norr 3":"6f5d500f","gnesta-norr 4":"5cccf572","gnesta-norr 5":"49af7e97"};
test('skilled: kvittot per kampanjsteg är oförändrat', () => {
  const now = prints(rs);
  assert.deepEqual(changed(now, BEFORE), [], JSON.stringify(now));
});
