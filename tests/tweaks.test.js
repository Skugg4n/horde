import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build, callNextWave, checkSpot, IDENTITY_TWEAKS, normalizeTweaks, tweaksActive } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { STRAIGHT } from './fixtures/straight-road.js';

// 0.12.2: debugmenyns reglar. Identitet (standard) ska räkna exakt som utan tweaks, så att
// balansproven och kvittona aldrig påverkas av debugmenyn.
const DT = 1 / 30;
function play(mapId, day, tweaks) {
  const sim = createSim({ map: MAPS[mapId], day, cash: 3000, research: ['m2.1'], seed: 11, ...(tweaks === undefined ? {} : { tweaks }) });
  let placed = 0;
  for (let k = 0; k < sim.place.n && placed < 4; k++) if (checkSpot(sim, k, placed % 2 ? 'm2' : 'm249').ok && build(sim, k, placed % 2 ? 'm2' : 'm249').ok) placed++;
  startWave(sim);
  const trace = [];
  for (let t = 0; t < 30 * 400 && (sim.phase === 'wave' || sim.phase === 'build'); t++) {
    if (sim.phase === 'build' && sim.nextWaveIn != null && t % 90 === 0) callNextWave(sim);
    step(sim, DT);
    if (t % 150 === 0) trace.push([sim.time, sim.cash, sim.baseHp, sim.kills, sim.intelEarned, sim.zombies.filter(z => !z.dead).map(z => [z.id, z.hp, z.x, z.z])]);
  }
  return JSON.stringify({ trace, phase: sim.phase, cash: sim.cash, hp: sim.baseHp, kills: sim.kills, intel: sim.intelEarned, time: sim.time });
}

test('identitetens tweaks ändrar ingenting (E4, Gnesta och Norr)', () => {
  for (const [m, d] of [['riksvagen', 2], ['gnesta', 2], ['gnesta-norr', 1]]) {
    const plain = play(m, d, undefined);
    assert.equal(play(m, d, IDENTITY_TWEAKS), plain, m);
    assert.equal(play(m, d, { hp: 1, speed: 1, count: 1, cash: 1, intel: 1, countdown: null, god: false }), plain, m);
    assert.equal(play(m, d, normalizeTweaks({ junk: 3, hp: 'x' })), plain, m);
  }
});

test('tweaksActive och normalizeTweaks', () => {
  assert.equal(tweaksActive(IDENTITY_TWEAKS), false);
  assert.equal(tweaksActive(normalizeTweaks({ hp: 2 })), true);
  assert.equal(tweaksActive(normalizeTweaks({ countdown: 5 })), true);
  assert.equal(tweaksActive(normalizeTweaks({ god: true })), true);
  assert.deepEqual(normalizeTweaks({ hp: -1, speed: 0, count: NaN }), { ...IDENTITY_TWEAKS });
});

test('reglarna verkar: hp ×, antal ×, god mode och nedräkningen', () => {
  const run = (tw, secs = 60) => { const s = createSim({ map: STRAIGHT, day: 1, cash: 0, seed: 1, tweaks: tw }); startWave(s); for (let i = 0; i < 30 * secs; i++) step(s, DT); return s; };
  // 0.13.0: räknas mitt i första vågen (efter 10 s), innan någon hunnit fram till basen
  const a = run(null, 10), b = run({ hp: 2, count: 2 }, 10);
  const total = s => s.zombies.length + s.spawnQueue.length;
  assert.equal(total(b), total(a) * 2);
  assert.equal(b.zombies[0].maxHp, a.zombies[0].maxHp * 2);
  const g = run({ god: true });
  assert.equal(g.baseHp, STRAIGHT.baseHp);
  assert.ok(run(null).baseHp < STRAIGHT.baseHp);
  // nedräkningen efter en klarad våg
  const c = createSim({ map: MAPS.riksvagen, day: 1, cash: 5000, seed: 1, tweaks: { countdown: 3 } });
  for (let k = 0, n = 0; k < c.place.n && n < 3; k++) if (checkSpot(c, k, 'm249').ok && build(c, k, 'm249').ok) n++;
  startWave(c);
  for (let i = 0; i < 30 * 200 && c.nextWaveIn == null; i++) step(c, DT);
  assert.ok(c.nextWaveIn != null && c.nextWaveIn <= 3, `nedräkning ${c.nextWaveIn}`);
});
