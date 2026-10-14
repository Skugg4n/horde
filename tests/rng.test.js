import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/sim/rng.js';

test('samma frö ger samma följd', () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});
test('värden i [0,1)', () => {
  const r = makeRng(1);
  for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});
