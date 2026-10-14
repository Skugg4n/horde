import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build, upgrade, sell } from '../src/sim/sim.js';
import { weaponStats } from '../src/sim/stats.js';
import { MAPS } from '../src/data/maps.js';

const map = MAPS.riksvagen;
const run = (sim, secs) => { for (let i = 0; i < secs * 30; i++) step(sim, 1 / 30); };
const mk = (o = {}) => createSim({ map, day: 1, cash: 2000, research: [], seed: 3, ...o });

test('bygga drar pengar och fyller positionen', () => {
  const s = mk();
  assert.deepEqual(build(s, 'A', 'm249'), { ok: true });
  assert.equal(s.cash, 1750);
  assert.equal(s.slots[0].weapon.type, 'm249');
});
test('kan inte bygga på upptagen, låst eller utan pengar', () => {
  const s = mk({ cash: 300 });
  build(s, 'A', 'm249');
  assert.equal(build(s, 'A', 'm249').reason, 'upptagen');
  assert.equal(build(s, 'D', 'm249').reason, 'låst');
  assert.equal(build(s, 'B', 'm249').reason, 'pengar');
});
test('M2 kräver forskning', () => {
  assert.equal(build(mk(), 'A', 'm2').reason, 'ej upplåst');
  assert.equal(build(mk({ research: ['m2'] }), 'A', 'm2').ok, true);
});
test('uppgradering höjer nivå och värden, max 3', () => {
  const s = mk();
  build(s, 'A', 'm249');
  assert.equal(upgrade(s, 'A').ok, true);
  assert.equal(upgrade(s, 'A').ok, true);
  assert.equal(upgrade(s, 'A').ok, false);
  assert.ok(weaponStats('m249', 3, new Set()).damage > weaponStats('m249', 1, new Set()).damage);
});
test('sälja ger tillbaka 60 %', () => {
  const s = mk();
  build(s, 'A', 'm249');
  assert.equal(sell(s, 'A').refund, 150);
  assert.equal(s.slots[0].weapon, null);
});
test('ett försvar dödar vandrare och tjänar pengar', () => {
  const s = mk();
  build(s, 'A', 'm249'); build(s, 'B', 'm249'); build(s, 'C', 'm249');
  const before = s.cash;
  startWave(s);
  run(s, 40);
  assert.equal(s.phase, 'build');
  assert.ok(s.cash > before);
  assert.equal(s.baseHp, 20);
});
test('forskning m249Rate ökar takten', () => {
  assert.equal(weaponStats('m249', 1, new Set(['m249Rate'])).rate, 10);
});
