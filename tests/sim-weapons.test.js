import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build, upgrade, sell } from '../src/sim/sim.js';
import { weaponStats } from '../src/sim/stats.js';
import { MAPS } from '../src/data/maps.js';
import { ZOMBIES } from '../src/data/zombies.js';

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
test('en dödad zombie ger exakt bounty och intel', () => {
  const s = mk();
  build(s, 'A', 'm249');
  startWave(s);
  let kill = null;
  for (let i = 0; i < 30 * 60 && !kill; i++) {
    const cash = s.cash, intel = s.intelEarned;
    step(s, 1 / 30);
    kill = s.events.find(e => e.t === 'kill') || null;
    if (kill) {
      assert.equal(s.cash - cash, ZOMBIES.walker.bounty);
      assert.equal(s.intelEarned - intel, ZOMBIES.walker.intel);
    }
  }
  assert.ok(kill, 'ingen kill-händelse');
});
test('genombruten zombie ger ingen bounty', () => {
  const s = mk();
  startWave(s);
  let breach = null;
  for (let i = 0; i < 30 * 60 && !breach; i++) {
    step(s, 1 / 30);
    breach = s.events.find(e => e.t === 'breach') || null;
  }
  assert.ok(breach, 'ingen breach-händelse');
  assert.equal(typeof breach.x, 'number');
  assert.equal(typeof breach.z, 'number');
  assert.equal(s.cash, 2000);
  assert.equal(s.intelEarned, 0);
});
test('okänd plats ger ok:false utan att kasta fel', () => {
  const s = mk();
  assert.deepEqual(build(s, 'Z', 'm249'), { ok: false, reason: 'okänd' });
  assert.deepEqual(upgrade(s, 'Z'), { ok: false, reason: 'okänd' });
  assert.deepEqual(sell(s, 'Z'), { ok: false, refund: 0 });
});
test('bygga, uppgradera och sälja går mitt i en våg', () => {
  const s = mk();
  startWave(s);
  run(s, 3);
  assert.equal(s.phase, 'wave');
  assert.equal(build(s, 'A', 'm249').ok, true);
  assert.equal(upgrade(s, 'A').ok, true);
  assert.equal(sell(s, 'A').ok, true);
});
test('när dagen är slut går det inte att bygga', () => {
  for (const phase of ['won', 'lost']) {
    const s = mk();
    s.phase = phase;
    assert.deepEqual(build(s, 'A', 'm249'), { ok: false, reason: 'fel läge' });
    assert.deepEqual(upgrade(s, 'A'), { ok: false, reason: 'fel läge' });
    assert.deepEqual(sell(s, 'A'), { ok: false, refund: 0 });
  }
});
