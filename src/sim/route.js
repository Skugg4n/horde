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

export const routeFor = map => pathRoute(map);

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
