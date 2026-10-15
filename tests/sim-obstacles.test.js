import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, placeObstacle, removeObstacle } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { OBSTACLES } from '../src/data/obstacles.js';

const map = MAPS.riksvagen;
const run = (sim, secs) => { for (let i = 0; i < secs * 30; i++) step(sim, 1 / 30); };
const mk = (o = {}) => createSim({ map, day: 1, cash: 2000, research: [], seed: 5, ...o });
const firstZ = s => s.zombies.find(z => z.id === 1);

test('taggtråd saktar ner', () => {
  // Första zombien når taggtråden (ruta 0, d=33) vid ca 20,6 s. Vid 25 s har den sinkats
  // i rutan medan den oskadade ligger ca 1,5 m längre fram.
  const a = mk(), b = mk();
  placeObstacle(b, 0, 'wire');
  startWave(a); startWave(b);
  run(a, 23); run(b, 23);
  assert.ok(firstZ(b).d < firstZ(a).d - 1);
});
test('taggtråd slits och försvinner', () => {
  // Dag 2 våg 1: tolv vandrare går genom rutan på ca 3,75 s var, sammanlagt mer än trådens 40 s.
  const s = mk({ day: 2 });
  placeObstacle(s, 0, 'wire');
  startWave(s);
  run(s, 120);
  assert.equal(s.obstacles[0], undefined);
});
test('grövre taggtråd håller dubbelt', () => {
  const s = mk({ research: ['wireTough'] });
  placeObstacle(s, 0, 'wire');
  assert.equal(s.obstacles[0].durability, OBSTACLES.wire.durability * 2);
});
test('betongblock kräver forskning och stoppar', () => {
  assert.equal(placeObstacle(mk(), 0, 'block').reason, 'ej upplåst');
  const s = mk({ research: ['block'] });
  placeObstacle(s, 0, 'block');
  startWave(s);
  // Första zombien når blocket (d=33) vid ca 20,6 s och står kvar där.
  run(s, 28);
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
test('riva okänd ruta ger ok:false, även för egenskaper i objektet', () => {
  const s = mk();
  assert.deepEqual(removeObstacle(s, 'constructor'), { ok: false, refund: 0 });
  assert.deepEqual(removeObstacle(s, 99), { ok: false, refund: 0 });
});
test('zombie som skulle passera ett block i ett enda steg stannar vid blocket', () => {
  const s = mk({ research: ['block'] });
  placeObstacle(s, 0, 'block');
  startWave(s);
  s.zombies.push({ id: 1, type: 'walker', hp: 30, maxHp: 30, d: map.cells[0] - 0.8, off: 0, wob: 0, dead: false, deadT: 0, blockedBy: null, breached: false, attacking: false });
  step(s, 1);
  assert.ok(firstZ(s).d <= map.cells[0]);
  assert.equal(firstZ(s).d, map.cells[0]);
});
test('hinder går att lägga och riva mitt i en våg', () => {
  const s = mk();
  startWave(s);
  run(s, 3);
  assert.equal(s.phase, 'wave');
  assert.equal(placeObstacle(s, 2, 'wire').ok, true);
  assert.equal(removeObstacle(s, 2).ok, true);
});
test('när dagen är slut går det inte att lägga hinder', () => {
  const s = mk();
  placeObstacle(s, 0, 'wire');
  s.phase = 'lost';
  assert.deepEqual(placeObstacle(s, 1, 'wire'), { ok: false, reason: 'fel läge' });
  assert.deepEqual(removeObstacle(s, 0), { ok: false, refund: 0 });
});

// 0.5.2: en spärr på levande zombier låste in dem i betongen. Nu nekas den.
test('spärr på rutor med levande zombier nekas med skälet zombier (E4 och Gnesta)', async () => {
  const { placeAcross, checkObstacle } = await import('../src/sim/sim.js');
  const s = mk({ research: ['block.1'] });
  startWave(s);
  run(s, 21);                                   // första zombien står i ruta 0 (d 33 till 35)
  assert.ok(s.zombies.some(z => !z.dead && s.route.inCell(z, 0)));
  const cash = s.cash;
  assert.deepEqual(placeObstacle(s, 0, 'block'), { ok: false, reason: 'zombier' });
  assert.equal(s.cash, cash);
  assert.equal(placeObstacle(s, 0, 'wire').ok, true, 'taggtråd går att lägga på dem');

  const g = createSim({ map: MAPS.gnesta, day: 1, cash: 2000, research: ['wireTough.1', 'block.1'], seed: 3 });
  startWave(g);
  for (let i = 0; i < 30 * 20; i++) step(g, 1 / 30);   // horden är inne på Sigtunavägen
  const z = g.zombies.find(q => !q.dead && g.route.validCell(q.cell) && g.route.span(q.cell).length >= 2);
  assert.ok(z, 'en zombie på en gata');
  // Spärren över gatan genom en ruta bredvid zombien täcker också zombiens ruta.
  const side = g.route.span(z.cell).find(k => k !== z.cell && g.route.span(k).includes(z.cell));
  assert.ok(side != null);
  assert.deepEqual(checkObstacle(g, side, 'block'), { ok: false, reason: 'zombier' });
  assert.deepEqual(placeAcross(g, side, 'block'), { ok: false, reason: 'zombier' });
  assert.equal(Object.keys(g.obstacles).length, 0);
});

test('banans upplåsningar: barrikaden finns på Gnesta dag 1 utan forskning, E4 kräver den', async () => {
  const { placeAcross, checkObstacle, placeObstacle } = await import('../src/sim/sim.js');
  const { obstacleUnlocked } = await import('../src/sim/stats.js');
  assert.equal(obstacleUnlocked('block', [], MAPS.gnesta), true);
  assert.equal(obstacleUnlocked('block', [], MAPS.riksvagen), false);
  assert.equal(obstacleUnlocked('block', ['wireTough.1', 'block.1'], MAPS.riksvagen), true);
  const g = createSim({ map: MAPS.gnesta, day: 1, cash: 2000, research: [], seed: 1 });
  const cell = g.route.cellAt(-3, 35);
  assert.deepEqual(checkObstacle(g, cell, 'block'), { ok: true });
  assert.equal(placeAcross(g, cell, 'block').ok, true);
  const e4 = createSim({ map: MAPS.riksvagen, day: 1, cash: 2000, research: [], seed: 1 });
  assert.deepEqual(placeObstacle(e4, 0, 'block'), { ok: false, reason: 'ej upplåst' });
  assert.equal(e4.cash, 2000);
});
