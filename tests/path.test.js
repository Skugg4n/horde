import test from 'node:test';
import assert from 'node:assert/strict';
import { pathLength, pointAt } from '../src/sim/path.js';

const P = [[10, 0], [0, 0], [0, 10]];
test('längd', () => assert.equal(pathLength(P), 20));
test('punkt mitt på första sträckan', () => {
  const p = pointAt(P, 5);
  assert.deepEqual([p.x, p.z, p.dirX, p.dirZ], [5, 0, -1, 0]);
});
test('punkt på andra sträckan', () => {
  const p = pointAt(P, 15);
  assert.deepEqual([p.x, p.z], [0, 5]);
});
test('klampas vid slutet', () => {
  const p = pointAt(P, 99);
  assert.deepEqual([p.x, p.z], [0, 10]);
});
