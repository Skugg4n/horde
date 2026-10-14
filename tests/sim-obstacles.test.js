import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, placeObstacle, removeObstacle } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

const map = MAPS.riksvagen;
const run = (sim, secs) => { for (let i = 0; i < secs * 30; i++) step(sim, 1 / 30); };
const mk = (o = {}) => createSim({ map, day: 1, cash: 2000, research: [], seed: 5, ...o });
const firstZ = s => s.zombies.find(z => z.id === 1);

test('taggtråd saktar ner', () => {
  // Första zombien når taggtråden (d=36) vid ca 22,5 s. Vid 26 s ska den vara efter
  // ungefär 3,5 s i rutan, alltså ca 2 m in, medan den oskadade är 41,6 m.
  const a = mk(), b = mk();
  placeObstacle(b, 0, 'wire');
  startWave(a); startWave(b);
  run(a, 26); run(b, 26);
  assert.ok(firstZ(b).d < firstZ(a).d - 3);
});
test('taggtråd slits och försvinner', () => {
  const s = mk();
  placeObstacle(s, 0, 'wire');
  startWave(s);
  run(s, 120);
  assert.equal(s.obstacles[0], undefined);
});
test('grövre taggtråd håller dubbelt', () => {
  const s = mk({ research: ['wireTough'] });
  placeObstacle(s, 0, 'wire');
  assert.equal(s.obstacles[0].durability, 80);
});
test('betongblock kräver forskning och stoppar', () => {
  assert.equal(placeObstacle(mk(), 0, 'block').reason, 'ej upplåst');
  const s = mk({ research: ['block'] });
  placeObstacle(s, 0, 'block');
  startWave(s);
  // Första zombien når blocket vid ca 22 s och står kvar där.
  run(s, 30);
  assert.ok(firstZ(s).d <= map.cells[0] + 0.01);
  assert.ok(s.obstacles[0].hp < 400);
});
test('block visar högst en träff per ruta och steg', () => {
  const s = mk({ research: ['block'] });
  placeObstacle(s, 0, 'block');
  startWave(s);
  let total = 0;
  for (let i = 0; i < 30 * 30; i++) {
    step(s, 1 / 30);
    const hits = s.events.filter(e => e.t === 'obstacleHit' && e.cell === 0).length;
    assert.ok(hits <= 1);
    total += hits;
  }
  assert.ok(total > 0);
});
test('kan inte lägga två hinder i samma ruta', () => {
  const s = mk();
  placeObstacle(s, 0, 'wire');
  assert.equal(placeObstacle(s, 0, 'wire').reason, 'upptagen');
});
test('okänd ruta ger ok:false utan att kasta fel', () => {
  const s = mk();
  assert.deepEqual(placeObstacle(s, 99, 'wire'), { ok: false, reason: 'okänd' });
  assert.deepEqual(removeObstacle(s, 99), { ok: false, refund: 0 });
});
test('riva oskadat hinder ger 50 % tillbaka', () => {
  const s = mk();
  placeObstacle(s, 0, 'wire');
  assert.deepEqual(removeObstacle(s, 0), { ok: true, refund: 40 });
  assert.equal(s.cash, 1960);
  assert.equal(s.obstacles[0], undefined);
});
