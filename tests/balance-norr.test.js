import test from 'node:test';
import assert from 'node:assert/strict';
import { gnestaSmoke, gnestaPlan, daySpawns, TOWN, NORR_BLOCKS } from '../scripts/balance.mjs';
import { gnestaNorr } from '../src/data/gnesta-norr.js';
import { placementFor } from '../src/sim/placement.js';
import { SEEDS, logs, tries, naives } from './norr-logs.js';

// Gnesta Norr (1.0.0): balansmålen över fem seeds, och kvittot. Körningen ligger i norr-logs.js.
// Målen (Olas uppdrag): dag 1 vinner smart direkt och naive tar klar skada; dag 2 till 4 vinner smart
// inom 1 till 3 försök och naive förlorar; dag 5 är svårast och smart vinner inom 4 försök; en
// förlorad dag rasar gradvis; högst cirka 250 levande; Hemvärnet används.
const winIdx = (log, d) => tries(log, d).findIndex(r => r.won);
const winner = (log, d) => tries(log, d).find(r => r.won);
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

test('Gnesta Norr dag 1: smart vinner direkt, naive tar klart mer skada', () => {
  logs.forEach((log, i) => {
    assert.equal(tries(log, 1)[0].won, true, `seed ${i}: dag 1 första försöket`);
    const n = naives[i][0];
    assert.ok(!n.won || n.baseHp < winner(log, 1).baseHp, `seed ${i}: naive ${n.baseHp} mot smart ${winner(log, 1).baseHp}`);
  });
  const smart = mean(logs.map(log => winner(log, 1).baseHp)), nv = mean(naives.map(n => n[0].baseHp));
  assert.ok(smart - nv >= 8, `bas kvar: smart ${smart}, naive ${nv}`);
});

test('Gnesta Norr dag 2 till 4: smart vinner inom 3 försök, naive förlorar', () => {
  for (const d of [2, 3, 4]) {
    logs.forEach((log, i) => assert.ok(winIdx(log, d) >= 0 && winIdx(log, d) <= 2, `dag ${d} seed ${i}: index ${winIdx(log, d)}`));
    const lost = naives.filter(n => !n[d - 1].won).length;
    assert.ok(lost >= 4, `dag ${d}: naive förlorar i ${lost} av 5`);
  }
});

test('Gnesta Norr dag 5: svårast, smart vinner inom 4 försök, naive förlorar', () => {
  logs.forEach((log, i) => assert.ok(winIdx(log, 5) >= 0 && winIdx(log, 5) <= 3, `seed ${i}: index ${winIdx(log, 5)}`));
  const left = d => mean(logs.map(log => winner(log, d).baseHp));
  for (const d of [1, 2, 3, 4]) assert.ok(left(5) < left(d), `bas kvar dag 5 ${left(5)} mot dag ${d} ${left(d)}`);
  assert.ok(naives.every(n => !n[4].won), 'naive förlorar dag 5');
});

test('Gnesta Norr: en förlorad dag rasar gradvis, och ingen dag fastnar', () => {
  const lost = [...logs.flatMap(log => log.filter(r => !r.won)), ...naives.flat().filter(r => !r.won)];
  assert.ok(lost.length > 10);
  for (const r of lost) assert.ok(r.fallTime >= 60, `basen föll på ${r.fallTime.toFixed(0)} s`);
  // varje försök tar slut (vunnet eller förlorat) långt före tidsgränsen: ingen zombie fastnar
  for (const r of [...logs.flat(), ...naives.flat()]) assert.ok(r.time < 1400, `dagen tog ${r.time.toFixed(0)} s`);
});

test('Gnesta Norr: högst cirka 250 levande zombier samtidigt', () => {
  const peaks = [...logs.flatMap(log => log.map(r => r.peak)), ...naives.flat().map(r => r.peak)];
  assert.ok(Math.max(...peaks) < 250, `flest levande ${Math.max(...peaks)}`);
});

test('Gnesta Norr: smart använder Hemvärnet och dess forskning, gruppen träffar', () => {
  logs.forEach((log, i) => {
    const days = [1, 2, 3, 4, 5].filter(d => tries(log, d).some(r => r.squads > 0 && r.squadHits > 100));
    assert.ok(days.length >= 3, `seed ${i}: gruppen gör nytta dag ${days.join(', ')}`);
    assert.ok(log.at(-1).research.some(id => id.startsWith('hvRifles')), `seed ${i}: Better rifles köpt`);
  });
});

test('Gnesta Norr: spärren på Vikingavägen leder horden förbi radhusen, taket och muren används', () => {
  const p = placementFor(gnestaNorr);
  for (let d = 1; d <= 5; d++) {
    const ids = daySpawns(gnestaNorr, d);
    const smart = gnestaPlan(gnestaNorr, ids, [], { ...TOWN['gnesta-norr'].planOpts(d, 'smart'), blocks: TOWN['gnesta-norr'].blocks(d) });
    const plain = gnestaPlan(gnestaNorr, ids, [], { ...TOWN['gnesta-norr'].planOpts(d, 'naive'), blocks: [] });
    // norrifrån blir vägen längre med spärren (hela Gångvägen i stället för stigen till Vikingavägen)
    const north = ids.indexOf('dansW') >= 0 ? ids.indexOf('dansW') : ids.indexOf('vikN');
    assert.ok(smart.len[north] > plain.len[north] + 10, `dag ${d}: ${smart.len[north]} mot ${plain.len[north]} rutor`);
    // första skytten på ett radhustak: radhusen kommer efter villorna i byggnadslistan
    const villas = gnestaNorr.lots.plots.filter(q => q.house).length;
    assert.ok(p.bldg[smart.roofs[0]] - 1 >= villas, `dag ${d}: första taket är ett radhus`);
  }
  // och vägen hittar fram från varje ingång, med och utan spärren, för alla sorter
  for (const blocks of [[], NORR_BLOCKS]) for (const types of [['walker'], ['runner'], ['brute']]) {
    const r = gnestaSmoke({ check: true, base: gnestaNorr, blocks, types });
    assert.equal(r.phase, 'won', `${types} med ${blocks.length} spärrar`);
    assert.equal(r.offRoad, 0);
    for (const [id, a] of Object.entries(r.arrivals)) assert.equal(a.count, 3, `${id} ${types}`);
  }
});

// Kvittot på Gnesta Norrs balans: hela loggen (smart dag 1 till 5 över fem seeds, naive dag 1 till 5
// på dagens första försök) ger samma fingeravtryck. Ett ändrat kvitto ska vara avsiktligt och
// förklarat här och i docs/balance-log.md.
// 1.0.0: första kvittot.
const BEFORE = { hash: '6f86b22c', length: 65389 };
function fingerprint() {
  const str = JSON.stringify({ smart: logs, naive: naives });
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return { hash: h.toString(16), length: str.length };
}
test('Gnesta Norrs balanslogg är identisk med 1.0.0', () => {
  assert.deepEqual(fingerprint(), BEFORE);
});
void SEEDS;
