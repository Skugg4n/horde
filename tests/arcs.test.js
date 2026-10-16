import test from 'node:test';
import assert from 'node:assert/strict';
import { gridFromAscii } from '../src/sim/grid.js';
import { buildPlace, KIND, inCone } from '../src/sim/placement.js';
import { createSim, startWave, step, build, rotateGun, checkRotate, AIM_TOL, autoFacing } from '../src/sim/sim.js';
import { WEAPONS } from '../src/data/weapons.js';

// Skjutvinkeln per vapenklass (0.13.0, H132).
// En gata längs översta raden (z 0..2) och öppen mark under; pjäsen står mitt på marken.
function openMap(count = 6) {
  const rows = ['B...................a', ...Array(8).fill('.....................')];
  const grid = gridFromAscii(rows.map((r, j) => (j === 0 ? r : '#'.repeat(r.length))));
  const place = buildPlace({ w: grid.w, h: grid.h, cellSize: 2, origin: [0, 0], classify: (x, z) => (Math.floor(z / 2) === 0 ? KIND.road : KIND.open) });
  return { id: 'arc-gun', grid, place, baseHp: 99, days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count, interval: 1.2, delay: 0 }] }] }] };
}
const DT = 1 / 30;
const N = -Math.PI / 2, S = Math.PI / 2;          // atan2(dz, dx): norr (mot gatan) och söder (bort)

test('vinklarna: Ksp 90 180, Ksp 58 120, Ksp 88 90, Psg 90 75, pillboxen 90; farten: Ksp 90 snabbast, Ksp 88 långsammast', () => {
  assert.equal(WEAPONS.m249.cone, 180); assert.equal(WEAPONS.ksp58.cone, 120); assert.equal(WEAPONS.m2.cone, 90);
  assert.ok(WEAPONS.psg90.cone >= 60 && WEAPONS.psg90.cone <= 90); assert.equal(WEAPONS.epa.cone, 90);
  assert.ok(WEAPONS.m249.traverse > WEAPONS.ksp58.traverse && WEAPONS.ksp58.traverse > WEAPONS.m2.traverse);
  for (const t of ['hv', 'inf', 'civ']) assert.equal(WEAPONS[t].cone, undefined, `${t}: flexibel per soldat`);
});

function shots(type, facing, secs = 30) {
  const map = openMap(), sim = createSim({ map, day: 1, cash: 9999, research: ['m2.1', 'ksp58.1'], seed: 2 });
  const key = 10 + 4 * map.grid.w;
  assert.ok(build(sim, key, type, { facing }).ok);
  startWave(sim);
  const out = [];
  for (let i = 0; i < secs / DT && sim.phase === 'wave'; i++) { step(sim, DT); for (const e of sim.events) if (e.t === 'shot') out.push(e); }
  return { out, sim, key };
}

test('ett mål utanför vinkeln skjuts inte: vänd bort från gatan skjuter pjäsen aldrig', () => {
  for (const type of ['m249', 'ksp58', 'm2']) {
    const away = shots(type, S);
    assert.equal(away.out.length, 0, `${type} vänd bort`);
    const toward = shots(type, N);
    assert.ok(toward.out.length > 0, `${type} mot gatan`);
    for (const e of toward.out) assert.ok(inCone(toward.sim.place, toward.key, toward.sim.place.keyAt(e.x, e.z), N, WEAPONS[type].cone), 'varje skott inom vinkeln');
  }
});

test('pipan vrids i vapnets fart: från målet syns till första skottet tar Ksp 88 längre tid än Ksp 90', () => {
  const lag = type => {
    const map = openMap(), sim = createSim({ map, day: 1, cash: 9999, research: ['m2.1'], seed: 2 });
    build(sim, 10 + 4 * map.grid.w, type, { facing: N });
    startWave(sim);
    let seen = null;
    for (let i = 0; i < 30 * 30; i++) {
      step(sim, DT);
      if (seen == null && sim.guns[0].weapon.targetId != null) seen = sim.time;
      if (sim.events.some(e => e.t === 'shot')) return sim.time - seen;
    }
    return Infinity;
  };
  const a = lag('m249'), b = lag('m2');
  assert.ok(Number.isFinite(a) && Number.isFinite(b));
  assert.ok(b > a + 0.3, `Ksp 88 ${b.toFixed(2)} s, Ksp 90 ${a.toFixed(2)} s`);
  assert.ok(AIM_TOL > 0 && AIM_TOL < 0.3);
});

test('Rotate vrider vinkeln i vapnets fart och pjäsen skjuter inte under tiden; före vågen direkt', () => {
  const map = openMap(30), sim = createSim({ map, day: 1, cash: 9999, research: ['m2.1'], seed: 4 });
  const key = 10 + 4 * map.grid.w;
  const id = build(sim, key, 'm2', { facing: S }).id;
  const g = sim.guns[0];
  assert.equal(rotateGun(sim, id, 0).ok, true);
  assert.equal(g.facing, 0, 'före vågen: direkt');
  rotateGun(sim, id, S);
  startWave(sim);
  assert.equal(rotateGun(sim, id, N).ok, true);
  let t = 0, fired = 0, turned = null;
  for (let i = 0; i < 30 * 12; i++) {
    step(sim, DT); t += DT;
    for (const e of sim.events) { if (e.t === 'rotateDone') turned = t; if (e.t === 'shot' && turned == null) fired++; }
  }
  const expect = Math.PI / WEAPONS.m2.traverse;
  assert.ok(turned != null && Math.abs(turned - expect) < 0.1, `vriden efter ${turned}, väntat ${expect}`);
  assert.equal(fired, 0, 'inga skott medan den vrids');
  assert.ok(Math.abs(g.facing - N) < 1e-9);
  assert.equal(checkRotate(sim, 'nope').ok, false);
});

test('ett vanligt klick ger riktningen som ser mest av hordens väg (mot gatan)', () => {
  const map = openMap(), sim = createSim({ map, day: 1, cash: 9999, research: ['m2.1'], seed: 1 });
  const f = autoFacing(sim, 10 + 4 * map.grid.w, 'm2');
  assert.ok(Math.abs(Math.atan2(Math.sin(f - N), Math.cos(f - N))) < Math.PI / 4 + 1e-9, `riktning ${f}`);
});
