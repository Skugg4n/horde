import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step } from '../src/sim/sim.js';
import { gridFromAscii } from '../src/sim/grid.js';
import { gridRoute, laneFor } from '../src/sim/route.js';
import { makeRng } from '../src/sim/rng.js';

// En lång gata, fem rutor (10 m) bred, rakt mot basen.
const WIDE = gridFromAscii([
  '##############################',
  '.............................a',
  '..............................',
  'B.............................',
  '..............................',
  '..............................',
  '##############################',
]);
const DT = 1 / 30;
const N = 30;
const map = { id: 't', grid: WIDE, baseHp: 1000, slots: [],
  days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count: N, interval: 0.6, delay: 0 }] }] }] };

// Kör vågen; för varje zombie: tvärläget (z) när den passerar mitten av gatan, och hur mycket
// tvärläget varierar på sträckan x 10 till 34 (gatans mittre del: efter spawn har zombien glidit ut i sin fil, och basen drar ihop horden först sist).
function run(seed) {
  const sim = createSim({ map, day: 1, cash: 0, seed });
  startWave(sim);
  const track = new Map();
  for (let t = 0; t < 120 * 30 && sim.phase === 'wave'; t++) {
    step(sim, DT);
    for (const z of sim.zombies) {
      if (z.dead || z.x < 10 || z.x > 34) continue;
      const r = track.get(z.id) ?? { lane: z.lane, min: Infinity, max: -Infinity, sum: 0, n: 0 };
      r.min = Math.min(r.min, z.z); r.max = Math.max(r.max, z.z); r.sum += z.z; r.n++;
      track.set(z.id, r);
    }
  }
  return { sim, track };
}

test('filen: samma id och slumptal ger samma fil, i följd sprids de över hela bredden', () => {
  assert.equal(laneFor(17, 0.3), laneFor(17, 0.3));
  const rngA = makeRng(5), rngB = makeRng(5);
  const r = gridRoute({ grid: WIDE });
  for (let id = 1; id <= 20; id++) assert.deepEqual(r.spawn(rngA, 'a', id), r.spawn(rngB, 'a', id));
  const lanes = Array.from({ length: 12 }, (_, i) => laneFor(i + 1, 0.5)).sort((a, b) => a - b);
  assert.ok(lanes[0] < -0.8 && lanes[lanes.length - 1] > 0.8, 'filerna täcker bredden');
  for (let i = 1; i < lanes.length; i++) assert.ok(lanes[i] - lanes[i - 1] > 0.05, `filerna staplas inte (${lanes.join(', ')})`);
});

test('horden sprider sig över gatans bredd, varje zombie håller sin fil, deterministiskt', () => {
  const a = run(3), b = run(3);
  // deterministiskt: samma frö ger exakt samma läge för alla
  assert.deepEqual([...a.track.entries()], [...b.track.entries()]);
  assert.equal(a.track.size, N);
  const means = [...a.track.values()].map(r => r.sum / r.n);
  const lo = Math.min(...means), hi = Math.max(...means);
  // gatan är z 2 till 12; med 0,6 m från kanten blir filerna z 2,6 till 11,4
  assert.ok(hi - lo > 7, `horden täcker ${(hi - lo).toFixed(1)} m av gatans 10`);
  for (const m of means) assert.ok(m > 2.3 && m < 11.7, `inom gatan: ${m.toFixed(2)}`);
  // ingen enskild rad tar mer än en tredjedel av horden (inte i ett led längs trottoaren)
  const rows = new Map();
  for (const m of means) { const j = Math.floor(m / 2); rows.set(j, (rows.get(j) ?? 0) + 1); }
  assert.ok(Math.max(...rows.values()) <= N / 3, `rader ${JSON.stringify([...rows])}`);
  // varje zombie håller sin fil på gatans mittre del, och filen följer lane (större lane = samma sida)
  for (const r of a.track.values()) assert.ok(r.max - r.min < 0.6, `filen drar ${(r.max - r.min).toFixed(2)} m`);
  const byLane = [...a.track.values()].sort((p, q) => p.lane - q.lane).map(r => r.sum / r.n);
  const first = byLane[0], last = byLane[byLane.length - 1];
  assert.ok(Math.abs(last - first) > 7, 'ytterfilerna på var sin sida');
  assert.equal(a.sim.baseHp, b.sim.baseHp);
  assert.ok(a.sim.baseHp < 1000, 'horden kommer fram till basen');
});
