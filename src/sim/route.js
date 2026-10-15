// Rutten: allt simuleringen behöver veta om vägen, bakom ett gränssnitt. Två rutter:
//   pathRoute(map)  E4: en polylinje, zombien har d (meter från spawn) och off (sidoavstånd).
//   gridRoute(map)  Gnesta: 2 m-rutnät och flödesfält mot basen, flera spawns.
// Ren och deterministisk: ingen DOM, ingen three.js.
//
// Gränssnittet (z = zombien, key = hinderrutans nyckel, ett heltal):
//   len                        nominell väglängd i meter
//   spawn(rng, spawnId)        fält att lägga på en ny zombie (läge och sidoförskjutning)
//   advance(z, dist)           gå dist meter mot basen
//   arrived(z)                 true när zombien är framme vid basen
//   place(z)                   { x, z, dirX, dirZ }: läge och riktning
//   ahead(z, dist)             { x, z }: läget om dist meter (granatens ledning)
//   progress(z)                större = närmare basen (siktet väljer störst)
//   fraction(z)                0 vid spawn, 1 vid basen
//   validCell(key)             går det att lägga hinder här
//   obstacleKeys(obstacles)    hinderrutorna i fast ordning
//   inCell(z, key)             står zombien i rutan (taggtråd)
//   blockContact(z, key, reach) null, eller { crosses } när zombien står vid ett block eller skulle
//                              passera det inom reach meter
//   stopAt(z, key)             ställ zombien vid blockets kant
//   cellAt(x, z)               rutan under en punkt på marken (klick), eller null
//   cellCenter(key)            { x, z, dirX, dirZ }
//   base                       { x, z }
//   rebuild(obstacles)         hindren har ändrats (bara gridRoute gör något)
import { pathLength, pointAt } from './path.js';
import { cellAt as pathCellAt, CELL_LEN } from './cells.js';
import { makeGrid } from './grid.js';
import { makeFlow } from './flow.js';

export const routeFor = map => (map.grid ? gridRoute(map) : pathRoute(map));

// ---------- E4 ----------
export function pathRoute(map) {
  const len = pathLength(map.path);
  const cells = map.cells.map((_, i) => i);
  const end = pointAt(map.path, len);
  const posAt = (d, off) => {
    const p = pointAt(map.path, Math.min(d, len));
    return { x: p.x - p.dirZ * off, z: p.z + p.dirX * off };
  };
  return {
    kind: 'path', len,
    base: { x: end.x, z: end.z },
    spawn: rng => ({ d: 0, off: (rng() - 0.5) * 6 }),
    advance(z, dist) { z.d += dist; },
    arrived: z => z.d >= len,
    place(z) {
      const p = pointAt(map.path, z.d);
      return { x: p.x - p.dirZ * z.off, z: p.z + p.dirX * z.off, dirX: p.dirX, dirZ: p.dirZ };
    },
    ahead: (z, dist) => posAt(z.d + dist, z.off),
    progress: z => z.d,
    fraction: z => z.d / len,
    validCell: key => Number.isInteger(key) && key >= 0 && key < map.cells.length,
    obstacleKeys: () => cells,
    inCell(z, key) { const cd = map.cells[key]; return z.d >= cd && z.d < cd + CELL_LEN; },
    blockContact(z, key, reach) {
      const cd = map.cells[key];
      const crosses = z.d < cd && z.d + reach > cd;
      return (z.d >= cd - 0.6 && z.d <= cd) || crosses ? { crosses } : null;
    },
    stopAt(z, key) { z.d = map.cells[key]; },
    cellAt: (x, z) => pathCellAt(map, x, z),
    cellCenter: key => pointAt(map.path, map.cells[key] + CELL_LEN / 2),
    rebuild() {},
  };
}

// ---------- Gnesta ----------
// Zombien har x, z (meter), cell (rutans nyckel) och lat (fast sidoförskjutning i meter). Den
// styr mot nästa rutas mitt plus lat, vinkelrätt mot steget. Med 4-grannar ligger nuvarande och
// nästa ruta kant i kant, och två sådana rutor bildar en rektangel, så sträckan från zombien till
// målpunkten går aldrig över en stängd ruta.
const SUB = 0.25;        // längsta delsteg i meter
const LAT_MAX = 0.7;     // största sidoförskjutning inom rutan (rutan är 2 m, halva = 1)
const NEAR = 0.6;        // så nära ett block räknas zombien stå vid det (som E4)
const HOLD = 0.3;        // zombien ställs så långt från blockets kant

export function gridRoute(map) {
  const grid = makeGrid(map.grid);
  const flow = makeFlow(grid);
  const { size } = grid;
  const half = size / 2;
  const spawnIds = grid.spawns.map(s => s.id);

  const target = (z, nxt) => {
    const [ax, az] = grid.center(z.cell), [bx, bz] = grid.center(nxt);
    const dx = Math.sign(bx - ax), dz = Math.sign(bz - az);
    const lat = Math.max(-LAT_MAX, Math.min(LAT_MAX, z.lat));
    return { x: bx - dz * lat, z: bz + dx * lat, dirX: dx, dirZ: dz };
  };
  // Avstånd från zombien till rutan nxt:s kant (nxt är granne till zombiens ruta).
  const gap = (z, nxt) => {
    const [cx, cz] = grid.center(nxt);
    return Math.max(0, Math.abs(z.x - cx) - half, Math.abs(z.z - cz) - half);
  };
  const left = z => {
    const nxt = flow.next[z.cell];
    if (nxt < 0) return 0;
    const t = target(z, nxt);
    return (flow.dist[nxt] / grid.UNIT) * size + Math.hypot(t.x - z.x, t.z - z.z);
  };
  let total = 1;
  const rebuildAll = obstacles => {
    flow.compute(grid.costs(obstacles));
    const far = grid.spawns.map(s => (flow.dist[s.key] / grid.UNIT) * size).filter(Number.isFinite);
    total = Math.max(1, ...far);
  };
  rebuildAll({});

  return {
    kind: 'grid', grid, flow,
    get len() { return total; },
    base: (() => { const [x, z] = grid.center(grid.base[0]); return { x, z }; })(),
    spawn(rng, spawnId) {
      const s = grid.spawns.find(q => q.id === (spawnId ?? spawnIds[0]));
      if (!s) throw new Error('okänd spawn ' + spawnId);
      const cell = s.starts[Math.floor(rng() * s.starts.length)];
      const [x, z] = grid.center(cell);
      return { x, z, cell, lat: (rng() - 0.5) * 2 * LAT_MAX, spawn: s.id };
    },
    advance(z, dist) {
      let rest = dist;
      while (rest > 1e-9) {
        if (flow.isBase(z.cell)) return;
        const nxt = flow.next[z.cell];
        if (nxt < 0) return;
        const t = target(z, nxt);
        const dx = t.x - z.x, dz = t.z - z.z, L = Math.hypot(dx, dz);
        const k = Math.min(rest, SUB, L);
        if (L > 1e-9) { z.x += dx / L * k; z.z += dz / L * k; }
        rest -= k;
        if (L <= k + 1e-9 || grid.keyAt(z.x, z.z) === nxt) z.cell = nxt;
        if (L <= 1e-9 && k === 0) return;
      }
    },
    arrived: z => flow.isBase(z.cell),
    place(z) {
      const nxt = flow.next[z.cell];
      if (nxt < 0) return { x: z.x, z: z.z, dirX: -1, dirZ: 0 };
      const t = target(z, nxt);
      const dx = t.x - z.x, dz = t.z - z.z, L = Math.hypot(dx, dz) || 1;
      return { x: z.x, z: z.z, dirX: dx / L, dirZ: dz / L };
    },
    ahead(z, dist) {
      const c = { x: z.x, z: z.z, cell: z.cell, lat: z.lat };
      this.advance(c, dist);
      return { x: c.x, z: c.z };
    },
    progress: z => -left(z),
    fraction: z => Math.max(0, Math.min(1, 1 - left(z) / total)),
    left,
    validCell: key => Number.isInteger(key) && key >= 0 && key < grid.n && grid.walkable(key) && !flow.isBase(key),
    obstacleKeys: obstacles => Object.keys(obstacles).map(Number),
    inCell: (z, key) => z.cell === key,
    blockContact(z, key, reach) {
      if (z.cell === key) return { crosses: false };
      if (flow.next[z.cell] !== key) return null;
      const g = gap(z, key);
      if (g <= NEAR) return { crosses: false };
      return reach > g ? { crosses: true } : null;
    },
    stopAt(z, key) {
      // Gå rakt mot målpunkten tills HOLD meter från kanten återstår.
      const t = target(z, key);
      for (let i = 0; i < 64 && gap(z, key) > HOLD; i++) {
        const dx = t.x - z.x, dz = t.z - z.z, L = Math.hypot(dx, dz);
        if (L < 1e-9) break;
        const k = Math.min(0.1, gap(z, key) - HOLD);
        z.x += dx / L * k; z.z += dz / L * k;
      }
    },
    cellAt(x, z) {
      const key = grid.keyAt(x, z);
      return key >= 0 && grid.walkable(key) ? key : null;
    },
    cellCenter(key) {
      const [x, z] = grid.center(key);
      const nxt = flow.next[key];
      if (nxt < 0) return { x, z, dirX: -1, dirZ: 0 };
      const [bx, bz] = grid.center(nxt);
      return { x, z, dirX: Math.sign(bx - x), dirZ: Math.sign(bz - z) };
    },
    rebuild: rebuildAll,
  };
}
