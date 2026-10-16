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
//   progress(z)                större = närmare basen (siktet väljer störst). Gnesta: minus
//                              återstående gångsträcka, utan barrikadernas straff
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
import { OBSTACLES } from '../data/obstacles.js';

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
// Zombien har x, z (meter), cell (rutans nyckel under den), lane (fast fil, -1 till 1, över hela
// gatans bredd) och lat (sidoförskjutning i meter inom rutan, reserv nära basen och vid block).
// Den styr mot en punkt några rutor fram längs flödet (LOOK), så att horden går snett över en
// korsning i stället för i trappsteg. Punkten väljs bara om hela sträckan dit, med lite marginal
// åt sidorna, ligger på gångbara rutor utan barrikad; annars nästa ruta som förut (nuvarande och
// nästa ruta delar kant, så den sträckan skär aldrig ett tomthörn). Siktpunkten räknas om när
// zombien byter ruta eller hindren ändras, och sparas på zombien (aimX, aimZ, aimV) så att
// förloppet är deterministiskt och ahead() kan räkna exakt samma väg.
const SUB = 0.25;        // längsta delsteg i meter
const LAT_MAX = 0.7;     // största sidoförskjutning inom rutan (rutan är 2 m, halva = 1)
const NEAR = 0.6;        // så nära ett block räknas zombien stå vid det (som E4)
const HOLD = 0.3;        // zombien ställs så långt från blockets kant
const LOOK = 3;          // så många rutor fram kan siktpunkten ligga
const CLEAR = 0.25;      // marginal åt sidorna när sträckan till siktpunkten provas
const SAMPLE = 0.2;      // provsteg längs sträckan
const SPAN_MAX = 4;      // en spärr tvärs över gatan når högst så många rutor åt varje håll
// Filen: zombien håller en fast plats tvärs över gatan (lane, -1 = ena kanten, 1 = andra, sett i
// gångriktningen). Gatans bredd mäts vinkelrätt mot gångriktningen vid siktpunkten, högst
// LANE_REACH meter åt varje håll, och LANE_EDGE meter hålls fri från kanten. Filerna delas ut
// ur den gyllene snittets följd per zombie-id (plus lite brus), så att zombier i följd hamnar
// långt isär över bredden i stället för att staplas: en mild, deterministisk separation.
const LANE_REACH = 8;
const LANE_EDGE = 0.6;
const LANE_STEP = 0.25;
const PHI = 0.6180339887498949;
const LANE_JITTER = 0.12;
// Fil för zombie nummer index (id) och ett slumptal 0..1. Ren funktion, samma in ger samma ut.
export function laneFor(index, r) {
  const u = (index * PHI + (r - 0.5) * LANE_JITTER) % 1;
  return (u < 0 ? u + 1 : u) * 2 - 1;
}

export function gridRoute(map) {
  const grid = makeGrid(map.grid);
  const flow = makeFlow(grid);
  const { size, w } = grid;
  const half = size / 2;
  const spawnIds = grid.spawns.map(s => s.id);
  const laneGuard = !!map.grid.laneGuard;
  let blocked = new Set();        // rutor med barrikad
  let version = 0;                // ökar när hindren ändras (siktpunkterna räknas om)
  // Gångsträcka i meter längs flödet till basen, utan barrikadernas straff. Siktet använder den.
  const walk = new Float64Array(grid.n).fill(Infinity);

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
  const open = k => k >= 0 && grid.walkable(k) && !blocked.has(k);
  // Går det att gå rakt från (x0, z0) till (x1, z1) med marginal åt sidorna?
  const clear = (x0, z0, x1, z1) => {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
    if (L < 1e-9) return true;
    const nx = -dz / L * CLEAR, nz = dx / L * CLEAR, n = Math.ceil(L / SAMPLE);
    for (let i = 0; i <= n; i++) {
      const x = x0 + dx * i / n, z = z0 + dz * i / n;
      if (!open(grid.keyAt(x, z)) || !open(grid.keyAt(x + nx, z + nz)) || !open(grid.keyAt(x - nx, z - nz))) return false;
    }
    return true;
  };
  // Siktpunkten för zombien där den står nu.
  function aim(z) {
    const n1 = flow.next[z.cell];
    if (n1 < 0) return null;
    const chain = [n1];
    if (!blocked.has(n1)) {
      for (let c = n1; chain.length < LOOK && !flow.isBase(c);) {
        const n = flow.next[c];
        if (n < 0 || blocked.has(n)) break;
        chain.push(n); c = n;
      }
    }
    const lat = Math.max(-LAT_MAX, Math.min(LAT_MAX, z.lat));
    for (let i = chain.length - 1; i >= 0; i--) {
      const c = chain[i];
      let tx, tz;
      if (z.lane != null && !flow.isBase(c)) {
        // Filen: gångriktningen längs kedjan, gatans bredd vinkelrätt mot den vid rutan c.
        const [ox, oz] = grid.center(i > 0 ? chain[0] : z.cell), [bx, bz] = grid.center(c);
        let dx = bx - ox, dz = bz - oz;
        const L = Math.hypot(dx, dz);
        if (L < 1e-9) continue;
        dx /= L; dz /= L;
        const nx = -dz, nz = dx;
        const a = free(bx, bz, nx, nz), b = free(bx, bz, -nx, -nz);
        const mid = (a - b) / 2, room = Math.max(0, (a + b) / 2 - LANE_EDGE);
        const off = mid + z.lane * room;
        tx = bx + nx * off; tz = bz + nz * off;
        // Vakt (Gnesta Norr, 1.0.0): där två smala gångar möts kan filen hamna i den andra gången,
        // uppströms, och zombien pendlar mellan två rutor för alltid. Med laneGuard godtas inte en
        // siktpunkt i en ruta längre från basen än den zombien står i. Gnesta och E4 har ingen vakt
        // (deras kvitton är oförändrade, och där har det aldrig hänt).
        if (laneGuard) { const tk = grid.keyAt(tx, tz); if (tk < 0 || !(flow.dist[tk] <= flow.dist[z.cell])) continue; }
      } else {
        if (i === 0) continue;
        const [ax, az] = grid.center(chain[i - 1]), [bx, bz] = grid.center(c);
        const dx = Math.sign(bx - ax), dz = Math.sign(bz - az);
        tx = bx - dz * lat; tz = bz + dx * lat;
      }
      if (clear(z.x, z.z, tx, tz)) return { x: tx, z: tz };
    }
    const t = target(z, n1);
    return { x: t.x, z: t.z };
  }
  // Fri sträcka i meter från (x, z) i riktningen (nx, nz) på öppna rutor, högst LANE_REACH.
  // Räknas från rutans kant (rutans halva bredd ingår alltid).
  function free(x, z, nx, nz) {
    let d = 0;
    while (d < LANE_REACH && open(grid.keyAt(x + nx * (d + LANE_STEP), z + nz * (d + LANE_STEP)))) d += LANE_STEP;
    return Math.max(d, Math.min(half, LANE_REACH));
  }
  function aimOf(z) {
    if (z.aimV !== version || z.aimC !== z.cell || z.aimX == null) {
      const a = aim(z);
      if (!a) return null;
      z.aimX = a.x; z.aimZ = a.z; z.aimC = z.cell; z.aimV = version;
    }
    return z;
  }
  const left = z => {
    const nxt = flow.next[z.cell];
    if (nxt < 0) return 0;
    const t = target(z, nxt);
    return walk[nxt] + Math.hypot(t.x - z.x, t.z - z.z);
  };
  let total = 1;
  const order = [];
  const rebuildAll = obstacles => {
    const costs = grid.costs(obstacles);
    flow.compute(costs);
    blocked = new Set();
    for (const key of Object.keys(obstacles)) if (OBSTACLES[obstacles[key].type]?.kind === 'block') blocked.add(Number(key));
    version++;
    // gångsträckan: rutorna i ordning efter kostnad, så att nästa ruta alltid är räknad först
    order.length = 0;
    for (let k = 0; k < grid.n; k++) if (Number.isFinite(flow.dist[k])) order.push(k);
    order.sort((a, b) => flow.dist[a] - flow.dist[b] || a - b);
    walk.fill(Infinity);
    for (const k of order) walk[k] = flow.isBase(k) ? 0 : walk[flow.next[k]] + size;
    const far = grid.spawns.map(s => walk[s.key]).filter(Number.isFinite);
    total = Math.max(1, ...far);
  };
  rebuildAll({});

  // Gatans riktning genom rutan: den längsta raden gångbara rutor (x eller z) genom den.
  const run = (k, di, dj, max = 8) => {
    let n = 0, i = k % w, j = (k - i) / w;
    for (;;) {
      i += di; j += dj;
      if (n >= max || i < 0 || j < 0 || i >= w || j >= grid.h || !grid.walkable(j * w + i)) return n;
      n++;
    }
  };
  function axis(key) {
    const ax = run(key, -1, 0) + run(key, 1, 0), az = run(key, 0, -1) + run(key, 0, 1);
    if (ax !== az) return ax > az ? 'x' : 'z';
    const nxt = flow.next[key];
    return nxt >= 0 && Math.abs(nxt - key) === 1 ? 'x' : 'z';
  }

  // Flödet för en tänkt uppsättning hinder (förhandsvisningen), utan att röra horden.
  const shadow = makeFlow(grid);
  function trace(f, from) {
    const cells = [from];
    let through = null;
    for (let c = from, n = 0; !f.isBase(c) && n < grid.n; n++) {
      const nx = f.next[c];
      if (nx < 0) return { cells, through, reaches: false };
      if (through == null && blocked.has(nx)) through = nx;
      cells.push(nx); c = nx;
    }
    return { cells, through, reaches: true };
  }

  return {
    kind: 'grid', grid, flow,
    get len() { return total; },
    base: (() => { const [x, z] = grid.center(grid.base[0]); return { x, z }; })(),
    spawns: grid.spawns.map(s => { const [x, z] = grid.center(s.key); return { id: s.id, key: s.key, x, z }; }),
    // index: zombiens nummer (simuleringen skickar id), väljer filen över gatan.
    spawn(rng, spawnId, index = 0) {
      const s = grid.spawns.find(q => q.id === (spawnId ?? spawnIds[0]));
      if (!s) throw new Error('okänd spawn ' + spawnId);
      const cell = s.starts[Math.floor(rng() * s.starts.length)];
      const [x, z] = grid.center(cell);
      const lane = laneFor(index, rng());
      return { x, z, cell, lane, lat: lane * LAT_MAX, spawn: s.id };
    },
    advance(z, dist) {
      let rest = dist;
      for (let guard = 0; rest > 1e-9 && guard < 4096; guard++) {
        if (flow.isBase(z.cell)) return;
        if (!aimOf(z)) return;
        const dx = z.aimX - z.x, dz = z.aimZ - z.z, L = Math.hypot(dx, dz);
        const k = Math.min(rest, SUB, L);
        if (L > 1e-9) { z.x += dx / L * k; z.z += dz / L * k; }
        rest -= k;
        const at = grid.keyAt(z.x, z.z);
        if (at !== z.cell && open(at)) z.cell = at;
        else if (L <= k + 1e-9) {
          // framme vid siktpunkten utan att ha bytt ruta (kan bara hända vid avrundning): ta nästa
          const nxt = flow.next[z.cell];
          if (nxt >= 0 && !blocked.has(nxt)) z.cell = nxt;
          z.aimX = null;
        }
        if (L <= 1e-9 && k === 0) return;
      }
    },
    arrived: z => flow.isBase(z.cell),
    place(z) {
      if (flow.next[z.cell] < 0 || !aimOf(z)) return { x: z.x, z: z.z, dirX: -1, dirZ: 0 };
      const dx = z.aimX - z.x, dz = z.aimZ - z.z, L = Math.hypot(dx, dz);
      if (L < 1e-6) {
        const t = target(z, flow.next[z.cell]);
        return { x: z.x, z: z.z, dirX: t.dirX || -1, dirZ: t.dirZ };
      }
      return { x: z.x, z: z.z, dirX: dx / L, dirZ: dz / L };
    },
    ahead(z, dist) {
      const c = { x: z.x, z: z.z, cell: z.cell, lat: z.lat, lane: z.lane, aimX: z.aimX, aimZ: z.aimZ, aimC: z.aimC, aimV: z.aimV };
      this.advance(c, dist);
      return { x: c.x, z: c.z };
    },
    // Siktet: minst kvar att GÅ till basen vinner. Barrikadens straff räknas inte, så en zombie
    // som slår sig igenom en barrikad nära basen prioriteras som den närmaste den är.
    progress: z => -left(z),
    fraction: z => Math.max(0, Math.min(1, 1 - left(z) / total)),
    left,
    walkLeft: k => walk[k],
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
    // Gatans riktning genom rutan ('x' eller 'z').
    axis,
    // Rutorna tvärs över gatan genom rutan key, i ordning från ena kanten till den andra.
    // Bara gångbara rutor som inte är bas, högst SPAN_MAX åt varje håll.
    span(key) {
      if (!Number.isInteger(key) || key < 0 || key >= grid.n || !grid.walkable(key)) return [];
      const [di, dj] = axis(key) === 'x' ? [0, 1] : [1, 0];
      const out = [key];
      for (const s of [-1, 1]) {
        let i = key % w, j = (key - (key % w)) / w;
        for (let n = 0; n < SPAN_MAX; n++) {
          i += di * s; j += dj * s;
          if (i < 0 || j < 0 || i >= w || j >= grid.h) break;
          const k = j * w + i;
          if (!grid.walkable(k) || flow.isBase(k)) break;
          if (s < 0) out.unshift(k); else out.push(k);
        }
      }
      return out.filter(k => !flow.isBase(k));
    },
    // Hordens väg från varje spawn: rutorna längs flödet till basen. Med obstacles räknas ett
    // tänkt flöde (förhandsvisning), annars det som gäller nu. through: första barrikaden på
    // vägen (horden slår sig igenom där), eller null.
    paths(ids = spawnIds, obstacles = null) {
      let f = flow, saved = blocked;
      if (obstacles) {
        shadow.compute(grid.costs(obstacles));
        f = shadow;
        blocked = new Set(Object.keys(obstacles).filter(k => OBSTACLES[obstacles[k].type]?.kind === 'block').map(Number));
      }
      const out = ids.map(id => {
        const s = grid.spawns.find(q => q.id === id);
        return s ? { id, ...trace(f, s.key) } : null;
      }).filter(Boolean);
      blocked = saved;
      return out;
    },
    rebuild: rebuildAll,
  };
}
