// Balansen i Operation Södermanland (0.14.0), den normala spelaren: lägger spärren som introt lär ut men
// ställer pjäserna där de ser sin egen väg, väntar ut nedräkningarna och köper inga extra förnödenheter.
// Mål (Olas): klarar varje dag inom 1 till 4 försök, ingen dag kräver mer än cirka 6, grind spelar roll.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runs, prints, changed, attemptsPerStep, STEPS } from './op-logs.js';
import { LESSON_MIN } from '../src/sim/sim.js';

const rs = runs('normal');

// 0.22.0 (H539, Ola): den normala spelaren vinner varje dag inom 1 till 3 försök (förut 4)
test('normal: hela kampanjen, varje dag inom 1 till 3 försök, i fem seeds', () => {
  rs.forEach((r, i) => {
    assert.equal(r.stuck, null, `seed ${i}: fast på ${JSON.stringify(r.stuck)}`);
    const a = attemptsPerStep(r.log);
    a.forEach((n, k) => assert.ok(n >= 1 && n <= 3, `seed ${i}: ${STEPS[k]} på försök ${n}`));
  });
});

test('normal: grind spelar roll, förlusterna ger RP och styrkan växer före nästa försök', () => {
  // 0.22.0 (H539): sju dagar fram till Mölnbo i stället för tretton. Den normala policyn vinner nu varje dag på första
  // försöket (Vikingavägen med 7 till 11 kvar); kravet på minst två förlorade försök per seed är borttaget. Förlorade
  // försök, när de finns, ger RP och styrkan växer (nedan). docs/balance-log.md 0.22.0.
  const retries = rs.flatMap(r => r.log.filter(x => !x.won));
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
    // 0.18.1 (vågornas grind): nästa våg väntar tills det mesta av den förra är nere, så dagarna med överlapp blir längre;
    // taket 600 till 760 s (docs/balance-log.md 0.18.1). Och utan tidigt kall högst två vågor ute samtidigt.
    // 0.19.0: taket 760 till 780 s (löparna 5 % långsammare när snubblet blev sällsynt; Vikingavägen dag 4 762 s i en seed)
    if (x.won) { const min = x.mapId === 'riksvagen' ? 120 : 200; assert.ok(x.time >= min && x.time <= 780, `${where}: ${x.time} s`); }
    assert.ok(x.peakWaves <= 2, `${where}: ${x.peakWaves} vågor ute samtidigt`);
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
// 0.16.4: alla steg utom E4 dag 1 nya, avsiktligt (Olas feedback och speltestet av 0.16.2): löparna snubblar ibland
// (kostar cirka 1 s), skyltarnas fotavtryck där skyltarna står (H234), E4 dag 2 med Move och Södertälje förvarnad,
// Ishallen dag 1 med två omgångar hus och fyra korsningar (need 18 av 24), dag 3 Hemvärnet och Norra vägen (39 / 60 / 84,
// hp 2,7), de vilande husen och Ksp 58 dag 4 (hp 1,3), Ak 5 och Ksp 88 dag 5 (hp 2,1), Psg 90 på Vikingavägen.
// docs/balance-log.md 0.16.4.
// 0.17.2: avsiktligt (H307, inget på vägarna): Vikingavägens villor och radhus G backar från gångvägarna,
// så Vikingavägen dag 1 till 5 är nya. docs/balance-log.md 0.17.2.
// 0.18.0: Ishallen dag 2 till Vikingavägen dag 5 nya, avsiktligt (strategiskt djup, skiva 1): korselden från Ishallen
// dag 2, sanity från dag 3, tröttheten efter Vikingavägen dag 3 (policyerna vilar de utmattade när det finns
// likvärdiga), kryparna och mål-läget dag 4, husen dag 5 (den skickliga ställer en grupp i huset som ser mest av
// hordens väg). E4 och Ishallen dag 1 står kvar. docs/balance-log.md 0.18.0.
// 0.18.1: Ishallen dag 4 till Vikingavägen dag 5 nya (skilled), Ishallen dag 1 till Vikingavägen dag 5 (normal), avsiktligt:
// vågornas grind (nästa våg först när 70 % av den förra är nere eller efter dagens långa klocka, högst två ute), förrådets
// banor (bara stridsbanan går ut, förslaget efter värde och trötthet), husen som stormas slutar när alla där är nere,
// Vikingavägen dag 2 hp 4,4 till 3,5 och dag 3 4,2 till 3,9. docs/balance-log.md 0.18.1.
// 0.19.0: alla steg utom E4 dag 1 nya, avsiktligt: löparnas snubbel sällsynt och utlöst (förut samma tärning för alla) och
// farten 3,4 till 3,22, stormningens tärning rättad (30 % i stället för alla), vågens svans, bjässarna och skrotbilarna.
// docs/balance-log.md 0.19.0.
// 0.19.1: alla steg utom E4 dag 1 nya, avsiktligt: snubblets nedkylning (60 m, utlösarna en liten chans, inte två på samma
// ställe), vågens svans för alla typer, dörrarna in i husen och förrådets förslag (vilade före utmattade). Grinden på
// Vikingavägen och Ishallen är oförändrad (overlapMin bara på Mölnbo). docs/balance-log.md 0.19.1.
// 0.20.0 (riktningarna): E4 dag 3 till Vikingavägen dag 5 nya, avsiktligt: Move och Rotate kommer först Ishallen dag 3
// (policyerna flyttar i uppställningen före det och vrider inte på E4 dag 3 och Ishallen dag 1 och 2), Vikingavägen
// väst, syd och nord (skogsvägen i stället för Östra Storgatan och Sigtunavägen öst, kartan till skogsvägens dimkant),
// dag 4 hp 7 till 9. E4 dag 1 och 2 orörda. docs/balance-log.md 0.20.0 (riktningarna).
// 0.22.0 (H539, kampanjbågen): Hagstumosse har fyra dagar (Ishallen 1 till 3, Vikingavägen 1). Ishallen dag 3 och
// Vikingavägen nya, avsiktligt: de första bjässarna nerför Norra vägen i dag 3:s sista våg, Next wave med bonus från dag 3,
// Vikingavägen en dag från väst, syd och nord (gamla dag 5 utan kryparna, en grupp till västerifrån, hp 3,75) med
// leveransen Ksp 58, Ksp 88 och pillboxen. Ishallen dag 4 och 5 och Vikingavägen dag 2 till 5 finns inte längre. E4 och
// Ishallen dag 1 och 2 orörda. docs/balance-log.md 0.22.0.
const BEFORE = {"riksvagen 1":"37ca880a","riksvagen 2":"d8e825ab","riksvagen 3":"68ec2156","gnesta 1":"fd3928f0","gnesta 2":"e241945c","gnesta 3":"7a23499b","gnesta-norr 1":"986341cb"};
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

// 0.16.4 (speltestet av 0.16.2: "Ishallen dag 3 är ett stup", 49 / 94 / 190 och sex-sju nyheter): förstagångsspelaren
// som följer tipsen klarar dag 3 inom två försök, och vågorna växer utan dubbla hopp.
test('Ishallen dag 3: förstagångsspelaren vinner inom två försök, inga dubbla hopp mellan vågorna', () => {
  const sizes = gnestaDays[2].waves.map(w => w.groups.reduce((a, g) => a + g.count, 0));
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] < sizes[i - 1] * 2, `vågorna ${sizes.join(' / ')}`);
  for (const [i, seedOffset] of SEEDS.entries()) {
    const e4 = opCampaign('normal', { seedOffset, sectors: ['riksvagen'] });
    const r = opCampaign('hints', { seedOffset, sectors: ['gnesta'], start: e4.progress, maxAttempts: 2 });
    const d3 = r.log.filter(x => x.mapId === 'gnesta' && x.day === 3);
    assert.ok(d3.some(x => x.won), `seed ${i}: ${JSON.stringify(d3.map(x => [x.won, x.waveBase]))}`);
  }
});

// 0.16.4 (Olas feedback: "E4 dag 2 är orättvis"): förstagångsspelaren som ställer båda Ksp 90 mot Nyköping och
// reagerar på varningen före våg 2 (flyttar en pjäs mot Södertälje, Move) vinner dag 2 på första försöket.
test('E4 dag 2: förstagångsspelaren som flyttar en pjäs vid varningen vinner på första försöket', () => {
  assert.deepEqual(MAPS.riksvagen.days[1].foretell, ['sodertalje'], 'Södertälje sägs från början');
  for (const [i, seedOffset] of SEEDS.entries()) {
    const r = opCampaign('firstTimer', { seedOffset, sectors: ['riksvagen'], maxAttempts: 1 });
    const d2 = r.log.find(x => x.mapId === 'riksvagen' && x.day === 2);
    assert.ok(d2?.won, `seed ${i}: ${JSON.stringify(d2?.waveBase)}`);
  }
});
import { MAPS } from '../src/data/maps.js';
const gnestaDays = MAPS.gnesta.days;
