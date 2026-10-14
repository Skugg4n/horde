import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign } from '../scripts/balance.mjs';

test('svårighetskurvan', () => {
  const log = campaign('greedy', 6);
  const tries = d => log.filter(r => r.day === d);
  assert.equal(tries(1)[0].won, true, 'dag 1 första försöket');
  assert.ok(tries(2).findIndex(r => r.won) <= 1, 'dag 2 inom 2 försök');
  assert.equal(tries(3)[0].won, false, 'dag 3 ska inte gå direkt');
  assert.ok(tries(3).some((r, i) => r.won && i <= 3), 'dag 3 inom 4 försök');
});
