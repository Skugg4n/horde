import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, placeAcross } from '../src/sim/sim.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaNorr } from '../src/data/gnesta-norr.js';
import { NORR_BLOCKS } from '../scripts/balance.mjs';

// 0.10.1 (granskningen av 0.10, Must fix 2): ingen zombie står still. En levande zombie som inte
// slår på något (attacking) och vars fraction (0 vid ingången, 1 vid basen) inte ökat på 10 s
// simtid har fastnat; då tar dagen aldrig slut. Fil-vakten i src/sim/route.js gäller alla rutnät.
// Utan vakten fastnar 100 till 220 zombier på Gnesta Norr med spärren, alla sorter blandade (prövat
// med vakten avslagen innan den blev global).
const DT = 1 / 30, STILL = 10;
const SMART_GNESTA = [[-45, 24]];

function stuckRun(base, blocks, types, { count = 8, seed = 1 } = {}) {
  const groups = base.spawns.flatMap((s, i) => types.map(type => ({ type, count, interval: 0.7, delay: i * 0.3, spawn: s.id })));
  const map = { ...base, baseHp: 9999, days: [{ n: 1, startCash: 0, waves: [{ groups }] }] };
  const sim = createSim({ map, day: 1, cash: blocks.length * OBSTACLES.block.cost, seed });
  for (const [x, z] of blocks) assert.ok(placeAcross(sim, sim.route.cellAt(x, z), 'block').ok, `spärr vid ${x}, ${z}`);
  const best = new Map(), stuck = [];
  startWave(sim);
  while (sim.phase === 'wave' && sim.time < 1200) {
    step(sim, DT);
    for (const z of sim.zombies) {
      if (z.dead) continue;
      const f = sim.route.fraction(z), b = best.get(z.id);
      if (!b || f > b.f + 1e-4 || z.attacking) best.set(z.id, { f: Math.max(f, b?.f ?? 0), t: sim.time });
      else if (sim.time - b.t > STILL) { stuck.push({ id: z.id, type: z.type, spawn: z.spawn, x: z.x, z: z.z, f }); best.set(z.id, { f, t: sim.time }); }
    }
  }
  return { stuck, phase: sim.phase, time: sim.time };
}

for (const [name, base, blockSets] of [['Gnesta', gnesta, [[], SMART_GNESTA]], ['Gnesta Norr', gnestaNorr, [[], NORR_BLOCKS, [...NORR_BLOCKS, ...SMART_GNESTA]]]]) {
  test(`${name}: ingen zombie står still i 10 s utan att slå på något`, () => {
    for (const blocks of blockSets) for (const types of [['walker'], ['runner'], ['brute'], ['walker', 'runner', 'brute']]) {
      const r = stuckRun(base, blocks, types);
      assert.deepEqual(r.stuck, [], `${types} med ${blocks.length} spärrar`);
      assert.equal(r.phase, 'won', `${types} med ${blocks.length} spärrar: alla framme`);
    }
  });
}
