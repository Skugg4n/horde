import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign, playDay } from '../scripts/balance.mjs';
import { newProgress } from '../src/meta/progress.js';

test('svårighetskurvan', () => {
  const log = campaign('greedy', 6);
  const tries = d => log.filter(r => r.day === d);
  assert.equal(tries(1)[0].won, true, 'dag 1 första försöket');
  assert.ok(tries(2).findIndex(r => r.won) >= 0 && tries(2).findIndex(r => r.won) <= 1, 'dag 2 inom 2 försök');
  assert.equal(tries(3)[0].won, false, 'dag 3 ska inte gå direkt');
  const winIdx = tries(3).findIndex(r => r.won); // index bland dag 3-försöken
  assert.ok(winIdx >= 1 && winIdx <= 3, `dag 3 vinns på försök 2 till 4, fick index ${winIdx}`);
});

test('forskningen är det som vänder dag 3', () => {
  assert.equal(playDay(newProgress(), 3, 'greedy').won, false, 'dag 3 utan forskning ska förloras');
});
