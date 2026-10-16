import { free } from './free.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, checkObstacle, build } from '../src/sim/sim.js';
import { snapObstacle, snapGun } from '../src/sim/snap.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaNorr } from '../src/data/gnesta-norr.js';

// Placeringen förlåter (0.12.0, H113): speltestet av 0.11.0 fick var tredje placering nekad, och tråd
// gick aldrig att lägga på norra grusvägen. Orsaken: gatan ritas med sin riktiga bredd men rutnätet har
// 2 m-rutor, så en punkt på den synliga vägytan låg i ungefär var sjätte fall i en ruta som inte är gata.
const onSurface = function* (map) {
  const c = map.surroundings.crisp, g = map.grid;
  const x0 = g.origin[0], z0 = g.origin[1], x1 = x0 + g.w * g.cellSize, z1 = z0 + g.h * g.cellSize;
  for (const r of map.roads.filter(q => q.walk && !q.fog && q.id !== 'entrance')) for (let i = 0; i < r.pts.length; i++) {
    const [x, z] = r.pts[i], q = r.pts[Math.min(i + 1, r.pts.length - 1)], p0 = r.pts[Math.max(0, i - 1)];
    const dx = q[0] - p0[0], dz = q[1] - p0[1], L = Math.hypot(dx, dz) || 1;
    for (const off of [-0.45, 0, 0.45]) {
      const px = x - dz / L * off * r.width, pz = z + dx / L * off * r.width;
      if (px < Math.max(c.x0, x0) + 3 || px > Math.min(c.x1, x1) - 3 || pz < Math.max(c.z0, z0) + 3 || pz > Math.min(c.z1, z1) - 3) continue;
      yield { road: r.id, surface: r.surface, x: px, z: pz };
    }
  }
};

for (const map of [gnesta, gnestaNorr]) test(`${map.name}: tråd och barrikad går att lägga var som helst på den synliga vägytan, också grus och cykelväg`, () => {
  const sim = createSim({ map, day: 2, cash: 9999, research: ['block.1'], seed: 1 });
  let n = 0, direct = 0;
  const fail = [];
  for (const p of onSurface(map)) {
    n++;
    const k = sim.route.cellAt(p.x, p.z);
    if (k != null && sim.route.validCell(k) && checkObstacle(sim, k, 'wire').ok) direct++;
    for (const type of ['wire', 'block']) {
      const r = snapObstacle(sim, p.x, p.z, type);
      if (!r.ok && r.reason !== 'zombier') fail.push(`${type} ${p.road} ${p.x.toFixed(1)},${p.z.toFixed(1)} ${r.reason}`);
    }
  }
  assert.ok(n > 500);
  assert.ok(direct < n, 'rutan under pekaren räckte inte alltid (orsaken)');
  assert.deepEqual(fail.slice(0, 5), []);
  assert.ok([...onSurface(map)].some(p => p.surface === 'gravel'));
});

test('en pjäs vid gatukanten hamnar på marken bredvid, inte "On the road"', () => {
  const sim = createSim({ map: free(gnesta), day: 1, cash: 9999, seed: 1 });
  let tried = 0, ok = 0;
  for (const r of gnesta.roads.filter(q => q.walk && !q.fog && q.surface === 'asphalt')) for (let i = 1; i < r.pts.length; i += 3) {
    const [x, z] = r.pts[i], q = r.pts[i - 1], dx = x - q[0], dz = z - q[1], L = Math.hypot(dx, dz) || 1;
    for (const side of [-1, 1]) {
      // just innanför vägkanten, på asfalten
      const px = x - dz / L * side * (r.width / 2 - 0.3), pz = z + dx / L * side * (r.width / 2 - 0.3);
      const k = sim.place.keyAt(px, pz);
      if (k < 0 || sim.place.kind[k] !== 1) continue;
      tried++;
      const s = snapGun(sim, px, pz, 'm249');
      if (s.ok) { ok++; assert.notEqual(sim.place.kind[s.key], 1); const c = sim.place.center(s.key); assert.ok(Math.hypot(c.x - px, c.z - pz) < 4.5); }   // 0.14.2: SNAP 3 m plus en halv rutdiagonal
    }
  }
  assert.ok(tried > 50 && ok / tried > 0.8, `${ok} av ${tried}`);
  // och den byggs där
  const s = snapGun(sim, ...gnesta.roads[0].pts[40], 'm249');
  if (s.ok) assert.equal(build(sim, s.key, 'm249').ok, true);
});
