import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign, playDay } from '../scripts/balance.mjs';
import { newProgress } from '../src/meta/progress.js';
import { RESEARCH } from '../src/data/research.js';

// Fem seed-förskjutningar: kurvan ska hålla för fler slumpföljder än den vi råkar mäta med.
const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const logs = SEEDS.map(seedOffset => campaign('greedy', 6, { seedOffset }));
const tries = (log, d) => log.filter(r => r.day === d);
const winIdx = (log, d) => tries(log, d).findIndex(r => r.won);

test('svårighetskurvan, standardseed', () => {
  const log = logs[0];
  assert.equal(tries(log, 1)[0].won, true, 'dag 1 första försöket');
  assert.ok(winIdx(log, 2) >= 0 && winIdx(log, 2) <= 1, 'dag 2 inom 2 försök');
  assert.equal(tries(log, 3)[0].won, false, 'dag 3 första försöket förloras med girig policy');
  assert.ok(winIdx(log, 3) >= 1 && winIdx(log, 3) <= 2, `dag 3 vinns på försök 2 eller 3, fick index ${winIdx(log, 3)}`);
});

test('svårighetskurvan håller över fem seeds', () => {
  logs.forEach((log, i) => {
    assert.equal(tries(log, 1)[0].won, true, `seed ${i}: dag 1 första försöket`);
    assert.ok(winIdx(log, 2) >= 0 && winIdx(log, 2) <= 1, `seed ${i}: dag 2 inom 2 försök`);
    assert.ok(winIdx(log, 3) >= 0 && winIdx(log, 3) <= 2, `seed ${i}: dag 3 inom 3 försök`);
  });
  // Dag 3 ska inte gå på första försöket för de flesta: minst tre av fem förlorar det.
  assert.ok(logs.filter(log => !tries(log, 3)[0].won).length >= 3, 'dag 3 försök 1 förloras oftast');
});

test('dag 2 kostar märkbart på basen', () => {
  const left = logs.map(log => tries(log, 2).find(r => r.won).baseHp);
  const mean = left.reduce((a, b) => a + b, 0) / left.length;
  assert.ok(mean >= 4 && mean <= 17, `snitt bas kvar dag 2 ${mean} (${left.join(', ')})`);
});

test('dag 1 med bara en M249 vinns, men basen tar lite skada', () => {
  for (const seedOffset of SEEDS) {
    const left = ['A', 'B', 'C'].map(slot => {
      const r = playDay(newProgress(), 1, 'minimal', { slot, seedOffset });
      assert.equal(r.won, true, `en M249 på ${slot} ska räcka dag 1`);
      return r.baseHp;
    });
    const damage = 20 - left.reduce((a, b) => a + b, 0) / left.length;
    assert.ok(damage >= 1 && damage <= 6, `snittskada över A, B, C ${damage.toFixed(1)} (${left.join(', ')})`);
  }
});

test('M2 går att köpa före dag 3 om man klarar dag 1 och 2', () => {
  const m2 = RESEARCH.find(r => r.id === 'm2').cost;
  for (const log of logs) {
    const intel = [1, 2].reduce((sum, d) => sum + tries(log, d).reduce((a, r) => a + r.intel, 0), 0);
    assert.ok(intel >= m2, `forskning efter dag 1 och 2: ${intel}, M2 kostar ${m2}`);
    assert.ok(tries(log, 3)[0].had.includes('m2'), 'policyn har M2 på dag 3 försök 1');
  }
});

test('en förlorad dag 3 rasar gradvis, inte på några sekunder', () => {
  const lost = logs.flatMap(log => tries(log, 3).filter(r => !r.won));
  assert.ok(lost.length > 0);
  for (const r of lost) assert.ok(r.fallTime >= 25, `basen föll på ${r.fallTime.toFixed(0)} s`);
});

test('forskningen är det som vänder dag 3', () => {
  for (const seedOffset of SEEDS) {
    assert.equal(playDay(newProgress(), 3, 'greedy', { seedOffset }).won, false, 'dag 3 utan forskning ska förloras');
  }
});
