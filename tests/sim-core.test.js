import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { STRAIGHT } from './fixtures/straight-road.js';

const map = STRAIGHT;
const run = (sim, secs) => { for (let i = 0; i < secs * 30; i++) step(sim, 1 / 30); };
const mk = (o = {}) => createSim({ map, day: 1, cash: 500, research: [], seed: 1, ...o });

test('börjar i byggläge med dagens kassa', () => {
  const s = mk();
  assert.equal(s.phase, 'build');
  assert.equal(s.cash, 500);
  assert.equal(s.baseHp, 20);
});
test('våg startar och spawnar zombier enligt schema', () => {
  const s = mk();
  assert.equal(startWave(s), true);
  assert.equal(s.phase, 'wave');
  run(s, 1.7);
  assert.equal(s.zombies.length, 2); // t=0 och t=1.6
});
test('zombier går mot basen och skadar den', () => {
  const s = mk();
  startWave(s);
  run(s, 60);
  assert.ok(s.baseHp < 20);
});
test('utan försvar förloras dagen', () => {
  const s = mk();
  for (let w = 0; w < 3 && s.phase !== 'lost'; w++) { if (s.phase === 'build') startWave(s); run(s, 120); }
  assert.equal(s.phase, 'lost');
});
test('tom våg klaras och ger forskning', () => {
  const s = mk();
  startWave(s);
  s.spawnQueue.length = 0; // inga zombier
  step(s, 1 / 30);
  assert.equal(s.phase, 'build');
  assert.equal(s.waveIndex, 1);
  assert.ok(s.intelEarned >= 2);
});
