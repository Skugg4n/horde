// Fri placering av vapen och siktlinjer. Rent och deterministiskt: bara siffror.
//
// Banan har ett placeringsrutnät med 2 m-rutor (map.place, eller härlett ur map.grid):
//   { w, h, cellSize, origin: [x0, z0], kind: Uint8Array, walk: Uint8Array }
// kind säger vad som står i rutan (KIND nedan). walk = 1 där zombier kan stå: de rutorna kan
// ett vapen skjuta mot. Byggnader (KIND.house) skymmer sikten; häckar, staket, bilar och
// barrikader är låga och skymmer inte.
//
// Ett vapen får stå i en ruta med KIND.open. Sikten räknas en gång när vapnet ställs ut: alla
// gångbara rutor inom vapnets största räckvidd (nivå 3) som en stråle från vapnets ruta når
// utan att passera en byggnadsruta (rutvis DDA, Amanatides-Woo). Siktet tittar sedan bara på
// zombier som står i en synlig ruta. Inga strålar per bildruta.

export const KIND = { open: 0, road: 1, house: 2, water: 3, forest: 4, thing: 5, base: 6 };
// Varför en ruta inte går (simuleringens skäl, panelerna översätter).
export const KIND_REASON = ['', 'gata', 'hus', 'vatten', 'skog', 'hinder', 'bas'];
export const MIN_SPACING = 5;      // meter mellan två vapens mittpunkter (sandsäckarna är 2-2,5 m i radie)

// Rektangel i världen: mitt, rotation.y (som three.js), bredd längs lokal x och djup längs lokal z.
export const rect = (x, z, ry, w, d) => ({ x, z, c: Math.cos(ry), s: Math.sin(ry), hw: w / 2, hd: d / 2 });
export function inRect(r, px, pz, pad = 0) {
  const dx = px - r.x, dz = pz - r.z;
  const lx = dx * r.c - dz * r.s, lz = dx * r.s + dz * r.c;
  return Math.abs(lx) <= r.hw + pad && Math.abs(lz) <= r.hd + pad;
}

// Bygger rutnätets kind ur banans data. classify(x, z) får rutans mitt och returnerar en KIND.
export function buildPlace({ w, h, cellSize = 2, origin, classify, walk }) {
  const n = w * h, kind = new Uint8Array(n), wk = new Uint8Array(n);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, x = origin[0] + (i + 0.5) * cellSize, z = origin[1] + (j + 0.5) * cellSize;
    kind[k] = classify(x, z);
    wk[k] = walk ? (walk(x, z, k) ? 1 : 0) : kind[k] === KIND.road ? 1 : 0;
  }
  return { w, h, cellSize, origin, kind, walk: wk };
}

// Placeringen för en bana, med hjälpfunktioner. Sparas per bana.
const cache = new WeakMap();
export function placementFor(map) {
  if (cache.has(map)) return cache.get(map);
  let data = map.place;
  if (!data && map.grid) {
    // Rutnät utan egen placering (prov): gångbart = gata, allt annat öppet.
    const g = map.grid;
    data = { w: g.w, h: g.h, cellSize: g.cellSize, origin: g.origin, walk: g.walk, kind: Uint8Array.from(g.walk, v => (v ? KIND.road : KIND.open)) };
  }
  if (!data) throw new Error('banan saknar placering: ' + map.id);
  const { w, h, cellSize: size, origin: [x0, z0], kind, walk } = data;
  const n = w * h;
  const p = {
    w, h, n, size, origin: [x0, z0], kind, walk,
    keyAt(x, z) {
      const i = Math.floor((x - x0) / size), j = Math.floor((z - z0) / size);
      return i < 0 || j < 0 || i >= w || j >= h ? -1 : j * w + i;
    },
    center: k => ({ x: x0 + ((k % w) + 0.5) * size, z: z0 + (Math.floor(k / w) + 0.5) * size }),
    valid: k => Number.isInteger(k) && k >= 0 && k < n,
  };
  // De gångbara rutorna, i nyckelordning (sikten letar bland dem).
  p.walkKeys = [];
  for (let k = 0; k < n; k++) if (walk[k]) p.walkKeys.push(k);
  cache.set(map, p);
  return p;
}

// Ser man från rutan a till rutan b? Strålen går mitt till mitt; varje ruta den passerar
// (utom a och b) får inte vara en byggnad. Går strålen exakt genom ett hörn skyms den bara om
// båda rutorna bredvid hörnet är byggnader.
export function lineOfSight(p, a, b) {
  const w = p.w, kind = p.kind;
  let i = a % w, j = (a - i) / w;
  const i1 = b % w, j1 = (b - i1) / w;
  const di = i1 - i, dj = j1 - j;
  const si = Math.sign(di), sj = Math.sign(dj);
  const ai = Math.abs(di), aj = Math.abs(dj);
  // t i [0, 1] längs strålen; nästa kant i x vid tx, i z vid tz (heltalsbråk: exakt jämförelse)
  // tx = (2*nx + 1) / (2*ai), tz = (2*nz + 1) / (2*aj). Jämför korsvis i heltal.
  let nx = 0, nz = 0;
  const wall = (ii, jj) => kind[jj * w + ii] === KIND.house;
  while (i !== i1 || j !== j1) {
    // jämför (2nx+1)/ai mot (2nz+1)/aj  ->  (2nx+1)*aj mot (2nz+1)*ai
    const cx = ai ? (2 * nx + 1) * aj : Infinity, cz = aj ? (2 * nz + 1) * ai : Infinity;
    if (ai && (!aj || cx < cz)) { i += si; nx++; }
    else if (aj && (!ai || cz < cx)) { j += sj; nz++; }
    else {
      // exakt genom ett hörn
      if (wall(i + si, j) && wall(i, j + sj)) return false;
      i += si; j += sj; nx++; nz++;
    }
    if (i === i1 && j === j1) break;
    if (wall(i, j)) return false;
  }
  return true;
}

// Synliga gångbara rutor från rutan key inom radius meter (rutans mitt, plus en halv
// rutdiagonal så att en zombie i rutans kant räknas). Returnerar { mask, keys }.
export function sightFrom(p, key, radius) {
  const mask = new Uint8Array(p.n), keys = [];
  const c = p.center(key), reach = radius + p.size * 0.7072;
  for (const k of p.walkKeys) {
    const q = p.center(k);
    if (Math.hypot(q.x - c.x, q.z - c.z) > reach) continue;
    if (lineOfSight(p, key, k)) { mask[k] = 1; keys.push(k); }
  }
  return { mask, keys };
}
