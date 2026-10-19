// 0.19.0 (H456, Ola 2026-10-18): bjässen går inte runt skrotbilar utan knuffar undan dem på ett par sekunder;
// betongen respekterar den som förut. Mölnbo: en bilspärr på Stenbyvägen vid missionskyrkan.
// 0.20.0 (kartan efter satellitbilden): spärren på Kvarnvägen mellan Stenbyvägen och Folkets hus, gruppen söderifrån
// (s4). Omvägen runt via Trollvägen är lång; vid missionskyrkan finns nu en lika kort väg runt (Trollvägen).
import test from 'node:test';
import assert from 'node:assert/strict';
import { molnbo, R } from '../src/data/molnbo.js';
import { createSim, startWave, step, placeAcross } from '../src/sim/sim.js';
import { ZOMBIES } from '../src/data/zombies.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { TIPS, MANUAL } from '../src/data/lessons.js';

const day = n => ({ n: 1, startCash: 0, waves: [{ groups: [{ type: 'brute', count: n, interval: 2, delay: 0, spawn: 's4' }, { type: 'walker', count: 10, interval: 0.5, delay: 0, spawn: 's4' }] }] });
function run(type) {
  const sim = createSim({ map: { ...molnbo, baseHp: 999, days: [day(2)] }, day: 1, cash: 9999 });
  const [x, z] = R(4, 123.5);
  assert.ok(placeAcross(sim, sim.route.cellAt(x, z), type).ok);
  const walkers = sim.route.paths(['s4'])[0].cells;
  startWave(sim);
  const ev = [];
  while (sim.time < 300 && sim.phase === 'wave') { step(sim, 0.1); for (const e of sim.events) if (e.t === 'carShove' || e.t === 'obstacleBroken' || e.t === 'obstacleHit') ev.push({ ...e, at: sim.time }); }
  return { sim, ev, walkers };
}

test('bjässen knuffar undan skrotbilarna på cirka 2 s, i stället för att gå runt', () => {
  assert.equal(ZOMBIES.brute.shove, 2);
  const { ev } = run('car');
  const start = ev.find(e => e.t === 'carShove'), gone = ev.find(e => e.t === 'obstacleBroken');
  assert.ok(start && gone && gone.shoved, JSON.stringify(ev.slice(0, 4)));
  assert.ok(gone.at - start.at <= 2.3, `${(gone.at - start.at).toFixed(1)} s`);
});

test('betongen håller: bjässen går runt som de andra', () => {
  const { ev } = run('block');
  assert.ok(!ev.some(e => e.t === 'carShove' || e.t === 'obstacleBroken'), JSON.stringify(ev.slice(0, 3)));
});

test('kortet, tipset och Field manual säger regeln', () => {
  assert.equal(OBSTACLES.car.desc, 'Wrecks pushed across the street. Brutes shove them aside.');
  assert.equal(TIPS.find(t => t.id === 'tip.shove').text, 'A brute shoved the cars aside. Concrete holds.');
  assert.ok(MANUAL.some(m => m.id === 'cars' && /shoves/.test(m.text)));
});
