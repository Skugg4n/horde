import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build, upgrade, buyKit, moveGun, checkMove, movePhase, sell, MOVE_TIME, soldierAt } from '../src/sim/sim.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaPlan, daySpawns } from '../scripts/balance.mjs';

// Flytta i stället för att bara sälja (0.12.0, H102).
const plan = gnestaPlan(gnesta, daySpawns(gnesta, 1));
const fresh = (cash = 5000) => createSim({ map: gnesta, day: 1, cash, research: ['grenade.1', 'm2.1'], seed: 3 });
const DT = 1 / 30;
function runFor(sim, secs, onStep = () => {}) { for (let t = 0; t < Math.round(secs / DT); t++) { step(sim, DT); onStep(sim.events); } }

test('Ksp 88 packar, bärs och ställs upp på 15 s och skjuter inte under tiden', () => {
  const sim = fresh();
  const id = build(sim, plan.guns[0], 'm2').id;
  startWave(sim);
  runFor(sim, 20);
  const shotsBefore = [];
  const r = moveGun(sim, id, plan.guns[1]);
  assert.equal(r.ok, true);
  const g = sim.guns.find(x => x.id === id);
  const phases = new Set();
  let t = 0, done = null;
  runFor(sim, 16, evs => {
    t += DT;
    if (g.move) phases.add(movePhase(g));
    for (const e of evs) {
      if (e.t === 'shot' && e.gunId === id && g.move) shotsBefore.push(e);
      if (e.t === 'moveDone' && e.gunId === id) done = t;
    }
  });
  assert.deepEqual([...phases], ['pack', 'carry', 'setup']);
  assert.equal(shotsBefore.length, 0, 'inga skott medan den flyttas');
  assert.ok(Math.abs(done - MOVE_TIME.m2) < 0.05, `klar efter ${done}`);
  assert.equal(g.cell, plan.guns[1]);
});

test('tiderna: Ksp 90 och Ksp 58 8 s, Ak 5 5 s, Psg 90 10 s, Ksp 88 15 s', () => {
  assert.deepEqual(MOVE_TIME, { m2: 15, m249: 8, ksp58: 8, ak5: 5, psg90: 10 });
});

test('uppgraderingar och granatlådan följer med; sälj ger fortfarande 60 %', () => {
  const sim = fresh();
  const id = build(sim, plan.guns[0], 'm249').id;
  assert.equal(upgrade(sim, id).ok, true);
  assert.equal(buyKit(sim, id).ok, true);
  startWave(sim);
  runFor(sim, 2);
  assert.equal(moveGun(sim, id, plan.guns[2]).ok, true);
  runFor(sim, 9);
  const g = sim.guns.find(x => x.id === id);
  assert.equal(g.move, undefined);
  assert.equal(g.weapon.level, 2);
  assert.equal(g.weapon.kit, true);
  const spent = g.weapon.spent, cash = sim.cash;
  assert.equal(sell(sim, id).refund, Math.round(spent * 0.6));
  assert.equal(sim.cash, cash + Math.round(spent * 0.6));
});

test('flytten följer placeringens regler, och före första vågen står pjäsen klar direkt', () => {
  const sim = fresh();
  const a = build(sim, plan.guns[0], 'm249').id;
  build(sim, plan.guns[1], 'm249');
  assert.equal(checkMove(sim, a, plan.guns[1]).reason, 'nära');
  const road = sim.route.cellAt(-3, 35);
  assert.equal(checkMove(sim, a, sim.place.keyAt(sim.route.cellCenter(road).x, sim.route.cellCenter(road).z)).ok, false);
  assert.equal(moveGun(sim, a, plan.guns[2]).ok, true);
  assert.equal(sim.guns.find(g => g.id === a).move, undefined, 'ingen tid går före vågen');
});

test('Hemvärnet springer till den nya platsen, skjuter inte på vägen och kan slås ner där', () => {
  const sim = fresh();
  const id = build(sim, plan.squads[0], 'hv').id;
  startWave(sim);
  runFor(sim, 3);
  const g = sim.guns.find(x => x.id === id);
  const target = plan.squads.find(k => k !== plan.squads[0] && checkMove(sim, id, k).ok);
  assert.equal(moveGun(sim, id, target).ok, true);
  assert.ok(g.soldiers.every(s => s.run > 0 && s.from));
  const mid = soldierAt({ ...g.soldiers[0], run: g.soldiers[0].runTotal / 2 });
  assert.ok(Math.hypot(mid.x - g.soldiers[0].x, mid.z - g.soldiers[0].z) > 0.1, 'halvvägs någon annanstans');
  let shots = 0;
  runFor(sim, 1, evs => { for (const e of evs) if (e.t === 'shot' && e.gunId === id) shots++; });
  assert.equal(shots, 0);
  runFor(sim, 6);
  assert.ok(g.soldiers.every(s => s.run === 0 && !s.from));
});
