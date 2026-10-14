import test from 'node:test';
import assert from 'node:assert/strict';
import { VERSION } from '../src/version.js';

test('VERSION är semver', () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
