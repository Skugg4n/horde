// Balansen i Operation Södermanland (0.14.0), den normala spelaren: lägger spärren som introt lär ut men
// ställer pjäserna där de ser sin egen väg, väntar ut nedräkningarna och köper inga extra förnödenheter.
// Mål (Olas): klarar varje dag inom 1 till 4 försök, ingen dag kräver mer än cirka 6, grind spelar roll.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runs, prints, changed, attemptsPerStep, STEPS } from './op-logs.js';
import { LESSON_MIN } from '../src/sim/sim.js';

const rs = runs('normal');

test('normal: hela kampanjen, varje dag inom 1 till 4 försök, i fem seeds', () => {
  rs.forEach((r, i) => {
    assert.equal(r.stuck, null, `seed ${i}: fast på ${JSON.stringify(r.stuck)}`);
    const a = attemptsPerStep(r.log);
    a.forEach((n, k) => assert.ok(n >= 1 && n <= 4, `seed ${i}: ${STEPS[k]} på försök ${n}`));
  });
});

test('normal: grind spelar roll, förlusterna ger RP och styrkan växer före nästa försök', () => {
  const retries = rs.flatMap(r => r.log.filter(x => !x.won));
  assert.ok(retries.length >= rs.length * 2, `${retries.length} förlorade försök`);
  for (const x of retries) assert.ok(x.rp >= Math.round(LESSON_MIN * 0.25), `${x.mapId} dag ${x.day}: ${x.rp} RP`);
  // nästa försök går in med samma eller större styrka (RP:n köper något)
  for (const r of rs) for (const x of r.log.filter(q => !q.won)) {
    const next = r.log.find(q => q.mapId === x.mapId && q.day === x.day && q.attempt === x.attempt + 1);
    if (next) assert.ok(next.force.length >= x.force.length || next.force !== x.force, `${x.mapId} dag ${x.day}`);
  }
});

test('normal: basen tar skada, ribban är hög hela vägen', () => {
  const won = rs.flatMap(r => r.log.filter(x => x.won));
  const mean = won.reduce((a, x) => a + x.baseHp, 0) / won.length;
  assert.ok(mean <= 15, `snitt bas kvar ${mean.toFixed(1)}`);
});

// 0.14.1 (granskningen av 0.14, Critical 2b): vakterna som bar genom speltesterna, tillbaka.
//   En förlorad dag rasar gradvis: minst 60 s från första skadan på basen till fallet.
//   Högst cirka 250 levande zombier samtidigt (prestandan på Retina).
//   Första skottet inom 60 s.
//   En vunnen dag tar 200 till 600 s i staden; E4 är övningen och får vara kortare (minst 120 s).
test('normal: vakterna, gradvis fall, toppen, första skottet och dagens längd', () => {
  for (const [i, r] of rs.entries()) for (const x of r.log) {
    const where = `seed ${i}: ${x.mapId} dag ${x.day} försök ${x.attempt}`;
    if (!x.won && x.fallTime != null) assert.ok(x.fallTime >= 60, `${where}: föll på ${x.fallTime} s`);
    assert.ok(x.peak < 250, `${where}: ${x.peak} levande`);
    assert.ok(x.firstShot != null && x.firstShot <= 60, `${where}: första skottet ${x.firstShot}`);
    if (x.won) { const min = x.mapId === 'riksvagen' ? 120 : 200; assert.ok(x.time >= min && x.time <= 600, `${where}: ${x.time} s`); }
  }
});

// Kvittot per kampanjsteg. 0.14.0: första kvittot.
// 0.14.1: alla steg nya, avsiktligt (E4:s tempo och de civilas hus på Gnesta dag 1; kampanjen bär det vidare).
// 0.14.2: alla steg nya, avsiktligt: E4:s spärr släpper in en i taget, dag 2:s löpare i mindre klungor (hp 4,0),
// dag 3 hp 1,2 och halva förnödenheterna per dödad; skogsbrynet på Gnesta går att stå i (fler platser för
// pjäserna). Kampanjen bär det vidare (docs/balance-log.md 0.14.2).
// 0.15.0: alla steg nya, avsiktligt: E4 är trafikplatsen vid Lästringe (ett rutnät med avfarten, påfarten dag 2
// och nya hp 3,2, 3,6 och 1,2); kampanjen bär det vidare in i Gnesta (docs/balance-log.md 0.15.0).
// 0.16.0: alla steg nya, avsiktligt: inlärningen (E4 dag 1 utan förnödenheter med infanteriet vid bommen och den
// andra Ksp 90 efter våg 1, pillboxen dag 3, barrikaderna från South dag 2, förrådet i steg från South dag 2,
// knappheten i rekvisitionen och uppgraderingarna i ledningens takt, Hagstumosse som en sektor med en trupp;
// docs/balance-log.md 0.16.0).
// 0.16.1: alla steg nya, avsiktligt: E4 dag 1 till 3 med jämnare sista vågor (32, 60, och bjässarna delade mellan
// våg 2 och 3, H192), överskottet på fler trådar (policyn), Ishallen dag 1 med våg 2:s löpare senare (speltestet av
// 0.16.0), South dag 3 och 4 med mindre förnödenheter per dödad (H215). docs/balance-log.md 0.16.1.
// 0.16.2: Ishallen dag 2 till North dag 5 nya, avsiktligt (speltestet av 0.16.1): dag 2 en ingång med 30 / 44 / 58 och
// spärren vid första stickgatan, Hemvärnet och Norra vägen dag 3 (hp 3,5 till 4,0 när skogsvägen flyttade till dag
// 4), North dag 3 hp 4,4 till 4,2 (mindre RP från en kortare dag 2). E4 och Ishallen dag 1 står kvar.
// docs/balance-log.md 0.16.2.
const BEFORE = {"riksvagen 1":"37ca880a","riksvagen 2":"d57d442a","riksvagen 3":"b59eecbe","gnesta 1":"24ffed1c","gnesta 2":"533d645b","gnesta 3":"0af8b2e5","gnesta 4":"aa960bfe","gnesta 5":"4c28d95a","gnesta-norr 1":"9925db7b","gnesta-norr 2":"0e072c56","gnesta-norr 3":"a431bdee","gnesta-norr 4":"7e1af42f","gnesta-norr 5":"be8f6156"};
test('normal: kvittot per kampanjsteg är oförändrat', () => {
  const now = prints(rs);
  assert.deepEqual(changed(now, BEFORE), [], JSON.stringify(now));
});

// 0.16.2 (speltestet av 0.16.1: Ishallen dag 2 förlorad två gånger, förrådet öppnade aldrig): förstagångsspelaren
// som följer tipsen (lägger spärren och ställer pjäserna längs den nya vägen, scripts/balance.mjs POLICIES.hints)
// klarar dag 2 inom två försök i alla fem seeds, och den som inte lägger någon spärr alls (naive) också.
import { opCampaign } from '../scripts/balance.mjs';
import { SEEDS } from './op-logs.js';
test('Ishallen dag 2: förstagångsspelaren som följer tipsen vinner inom två försök', () => {
  for (const policy of ['hints', 'naive']) for (const [i, seedOffset] of SEEDS.entries()) {
    const e4 = opCampaign('normal', { seedOffset, sectors: ['riksvagen'] });
    const r = opCampaign(policy, { seedOffset, sectors: ['gnesta'], start: e4.progress, maxAttempts: 2 });
    const d2 = r.log.filter(x => x.mapId === 'gnesta' && x.day === 2);
    assert.ok(d2.some(x => x.won), `${policy} seed ${i}: ${JSON.stringify(d2.map(x => [x.won, x.waveBase]))}`);
  }
});
