// Hordens rutnät ur bandata (map.grid). Rent: bara siffror, ingen DOM, ingen three.js.
//
// Indata: { w, h, cellSize, origin: [x0, z0], walk: Uint8Array, terrain?: Uint8Array,
//           spawns: [{ id, cell: [i, j] }], base: [i, j] }
// terrain: 0 stängd, 1 gata, 2 cykelväg/grusväg. Saknas den räknas varje gångbar ruta som gata.
// Rutans nyckel är heltalet j * w + i.
//
// Kostnader i heltal (tiondelar av en ruta) så att vägsökningen blir exakt och deterministisk:
//   gata 10, cykelväg 11, barrikad +4000, taggtråd +15.
import { OBSTACLES } from '../data/obstacles.js';

export const UNIT = 10;
export const TERRAIN_COST = [0, 10, 11];      // stängd, gata, cykelväg
export const BARRICADE_COST = 4000;           // 400 rutor: horden går hellre runt kvarteret
export const WIRE_COST = 15;                  // en och en halv ruta: bromsar men styr sällan om
export const BASE_RADIUS = 3;                 // meter från basrutans mitt som räknas som framme
export const SPAWN_RADIUS = 3;                // meter från spawnrutan där zombier kan dyka upp

export function makeGrid(data) {
  const { w, h, cellSize: size, origin: [x0, z0], walk } = data;
  const n = w * h;
  const terrain = data.terrain ?? walk;
  const base0 = data.base[1] * w + data.base[0];
  const center = k => [x0 + ((k % w) + 0.5) * size, z0 + (Math.floor(k / w) + 0.5) * size];
  const walkable = k => walk[k] === 1;
  const within = (k0, r) => {
    const [cx, cz] = center(k0), out = [];
    for (let k = 0; k < n; k++) if (walkable(k)) {
      const [x, z] = center(k);
      if (Math.hypot(x - cx, z - cz) <= r + 1e-9) out.push(k);
    }
    return out;
  };
  const base = within(base0, data.baseRadius ?? BASE_RADIUS);
  const baseSet = new Set(base);
  const spawns = data.spawns.map(s => {
    const key = s.cell[1] * w + s.cell[0];
    const starts = within(key, data.spawnRadius ?? SPAWN_RADIUS).filter(k => !baseSet.has(k));
    return { id: s.id, key, starts: starts.length ? starts : [key] };
  });
  return {
    w, h, n, size, origin: [x0, z0], UNIT, base, spawns, center, walkable,
    keyAt(x, z) {
      const i = Math.floor((x - x0) / size), j = Math.floor((z - z0) / size);
      return i < 0 || j < 0 || i >= w || j >= h ? -1 : j * w + i;
    },
    terrainOf: k => (walkable(k) ? terrain[k] || 1 : 0),
    // Kostnad för att gå in i varje ruta, med hindren ovanpå. 0 = stängd.
    costs(obstacles = {}) {
      const c = new Int32Array(n);
      for (let k = 0; k < n; k++) c[k] = walkable(k) ? TERRAIN_COST[terrain[k] || 1] ?? UNIT : 0;
      for (const key of Object.keys(obstacles)) {
        const k = Number(key), o = OBSTACLES[obstacles[key].type];
        if (!c[k] || !o) continue;
        if (o.kind === 'block') c[k] += BARRICADE_COST;
        else if (o.kind === 'slow') c[k] += WIRE_COST;
      }
      return c;
    },
  };
}

// Litet rutnät ur text, för tester och prov:
//   #  stängd     .  gata     :  cykelväg     B  bas (gata)     a-z  spawn med det id:t (gata)
export function gridFromAscii(rows, { cellSize = 2, origin = [0, 0], baseRadius = 0, spawnRadius = 0 } = {}) {
  const h = rows.length, w = rows[0].length;
  const walk = new Uint8Array(w * h), terrain = new Uint8Array(w * h);
  const spawns = [];
  let base = null;
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    const k = j * w + i;
    if (ch === '#') return;
    walk[k] = 1; terrain[k] = ch === ':' ? 2 : 1;
    if (ch === 'B') base = [i, j];
    else if (/[a-z]/.test(ch)) spawns.push({ id: ch, cell: [i, j] });
  }));
  spawns.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { w, h, cellSize, origin, walk, terrain, spawns, base, baseRadius, spawnRadius };
}
