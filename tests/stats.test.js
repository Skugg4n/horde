import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_LEVEL, upgradeCost, weaponRefund, obstacleRefund, obstacleWhole } from '../src/sim/stats.js';
import { OBSTACLES } from '../src/data/obstacles.js';

test('högsta nivån har ingen uppgradering', () => {
  assert.equal(MAX_LEVEL, 3);
  assert.equal(upgradeCost('m249', MAX_LEVEL), null);
  assert.ok(upgradeCost('m249', MAX_LEVEL - 1) > 0);
});
test('sålt vapen ger tillbaka 60 % av allt som lagts', () => {
  assert.equal(weaponRefund({ spent: 250 }), 150);
  assert.equal(weaponRefund({ spent: 450 }), 270);
});
test('helt hinder ger halva priset, skadat ger inget', () => {
  const wire = { type: 'wire', durability: 40, maxDurability: 40 };
  assert.equal(obstacleWhole(wire), true);
  assert.equal(obstacleRefund(wire), Math.round(OBSTACLES.wire.cost * 0.5));
  assert.equal(obstacleRefund({ ...wire, durability: 39 }), 0);
  const block = { type: 'block', hp: 400, maxHp: 400 };
  assert.equal(obstacleRefund(block), Math.round(OBSTACLES.block.cost * 0.5));
  assert.equal(obstacleRefund({ ...block, hp: 10 }), 0);
});
