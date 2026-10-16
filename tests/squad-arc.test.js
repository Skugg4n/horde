import test from 'node:test';
import assert from 'node:assert/strict';
import { gridFromAscii } from '../src/sim/grid.js';
import { buildPlace, KIND } from '../src/sim/placement.js';
import { createSim, startWave, step, build } from '../src/sim/sim.js';
import { COVER, STANCE_ALT, stanceFor, inArc, PRONE_ARC, RISE_TIME, planSquad } from '../src/sim/squad.js';
import { MAPS } from '../src/data/maps.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaNorr } from '../src/data/gnesta-norr.js';

// 0.12.2 (speltestet: "de ligger och snurrar på marken"): den liggande skjuter bara inom en båge runt
// skyddsriktningen; ett mål utanför får honom att resa sig på knä (RISE_TIME) innan han skjuter.
function openMap() {
  const rows = ['B...................a', ...Array(6).fill('.....................')];
  const grid = gridFromAscii(rows.map((r, j) => (j === 0 ? r : '#'.repeat(r.length))));
  const place = buildPlace({ w: grid.w, h: grid.h, cellSize: 2, origin: [0, 0], classify: (x, z) => (Math.floor(z / 2) === 0 ? KIND.road : KIND.open) });
  return { id: 'arc-prov', grid, place, baseHp: 99, days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count: 6, interval: 1.5, delay: 0 }] }] }] };
}
function run(turn) {
  const map = openMap(), sim = createSim({ map, day: 1, cash: 9999, seed: 5 });
  assert.ok(build(sim, 10 + 3 * map.grid.w, 'hv').ok);
  const g = sim.guns[0];
  for (const s of g.soldiers) { s.stance = 'prone'; s.run = 0; s.from = null; if (turn) s.face += Math.PI; }
  startWave(sim);
  const log = [];
  let firstSeen = null;
  for (let i = 0; i < 30 * 40 && sim.phase === 'wave'; i++) {
    step(sim, 1 / 30);
    if (firstSeen == null && g.soldiers.some(s => s.rise > 0 || s.targetId != null)) firstSeen = sim.time;
    for (const ev of sim.events) if (ev.t === 'shot') log.push({ t: sim.time, i: ev.soldier, risen: !!g.soldiers[ev.soldier].risen, a: Math.atan2(ev.z - ev.sz, ev.x - ev.sx) });
  }
  return { log, firstSeen, g };
}

test('bågen: liggande skjuter bara inom PRONE_ARC runt skyddet, annars först när han rest sig', () => {
  const { log, g } = run(false);
  assert.ok(log.length > 0);
  for (const e of log) if (!e.risen) assert.ok(inArc(g.soldiers[e.i], e.a), 'liggande skott inom bågen');
  // vända bort från gatan: varje skott kommer från en som rest sig, och tidigast RISE_TIME efter att han såg målet
  const turned = run(true);
  assert.ok(turned.log.length > 0, 'de reser sig och skjuter');
  assert.ok(turned.log.every(e => e.risen));
  assert.ok(turned.log[0].t - turned.firstSeen >= RISE_TIME - 1 / 30 - 1e-9, `${turned.log[0].t} mot ${turned.firstSeen}`);
  assert.ok(Math.abs(PRONE_ARC - Math.PI * 2 / 3) < 1e-12);
});

test('bågen är deterministisk', () => {
  assert.deepEqual(run(true).log, run(true).log);
});

test('ställningen: följer skyddet, varierar deterministiskt, och en grupp är aldrig klonad', () => {
  for (const cover of Object.keys(COVER)) for (let k = 0; k < 200; k++) {
    const st = stanceFor(cover, k);
    assert.ok([COVER[cover].stance, STANCE_ALT[cover]].includes(st));
    assert.equal(stanceFor(cover, k), st);
  }
  assert.equal(stanceFor('ditch', 3), 'prone');
  let squads = 0;
  for (const map of [MAPS.riksvagen, gnesta, gnestaNorr]) {
    const sim = createSim({ map, day: 1, cash: 1e6, seed: 1 });
    for (let k = 0; k < sim.place.n; k += 37) {
      const plan = planSquad(sim, k, { count: 4 });
      if (plan.length < 3) continue;
      squads++;
      assert.ok(new Set(plan.map(c => c.stance)).size > 1 || plan.every(c => !STANCE_ALT[c.cover]), `${map.id} ${k}: ${plan.map(c => c.cover + '/' + c.stance)}`);
    }
  }
  assert.ok(squads > 20);
});
