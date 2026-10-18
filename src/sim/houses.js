// Trupper i hus (0.18.0, strategiskt djup 3.1, skiva 1). Rent och deterministiskt: bara siffror.
//
// Banans hus (map.lots.plots[].house, rektanglar) blir garnisonsplatser. En grupp eller en lätt kulspruta (Ksp 90,
// Ksp 58) kan ställas i ett hus: soldaterna skjuter från fönstren, med sikten från husets fasad och höjd (en ruta per
// fönster i husets kant, ögat FLOOR_EYE över marken, och det egna huset skymmer bakåt). Huset ger skydd: zombierna
// når dem inte förrän dörren är inslagen, och sanity tär hälften så fort (src/sim/sanity.js HOUSE).
//
// Zombierna kan storma ett hus med garnison: den som går förbi intill huset (i en gångbar ruta som rör husets
// rutor) väljer med chansen ASSAULT att slå på dörren (bjässar och pansrade alltid). Dörren har DOOR_HP; när den
// går slås gruppen hårt (BREAK_HIT av livet på var och en) och de som stormar slår sedan soldaterna direkt.
//
// Kapacitet: husets yta delat med AREA_PER_MAN, mellan CAP_MIN och CAP_MAX soldater, eller en pjäs.
import { KIND, rect, inRect, lineOfSightH } from './placement.js';

export const FLOOR_EYE = 3.2;     // fönstrets höjd (m), högst husets höjd
export const AREA_PER_MAN = 11;   // kvadratmeter per soldat
export const CAP_MIN = 4, CAP_MAX = 8;
export const DOOR_HP = 260;
export const ASSAULT = 0.3;       // andel av de som går förbi som stormar
export const BREAK_HIT = 0.45;    // andel av livet varje soldat förlorar när dörren slås in
export const WINDOW_GAP = 2.4;    // meter mellan två soldater i fönstren
export const DOOR_REACH = 14;     // meter: huset måste ha en gata så nära dörren

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

const cache = new WeakMap();
// Husen på banan som går att besätta: [{ id, x, z, ry, w, d, cells, edge, touch, cap, eye, kind }].
// cells: husets rutor, edge: [{ key, out: [dx, dz] }] rutor i kanten med riktningen ut, touch: gångbara rutor som rör huset.
export function housesOf(map, p) {
  if (cache.has(map)) return cache.get(map);
  const out = [];
  for (const plot of map.lots?.plots ?? []) {
    const h = plot.house;
    if (!h || h.kind === 'x60' || !(h.w > 0) || !(h.d > 0)) continue;
    const r = rect(h.x, h.z, h.ry, h.w, h.d);
    const cells = [];
    const R = Math.hypot(h.w, h.d) / 2 + p.size;
    const i0 = Math.floor((h.x - R - p.origin[0]) / p.size), i1 = Math.floor((h.x + R - p.origin[0]) / p.size);
    const j0 = Math.floor((h.z - R - p.origin[1]) / p.size), j1 = Math.floor((h.z + R - p.origin[1]) / p.size);
    for (let j = Math.max(0, j0); j <= Math.min(p.h - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(p.w - 1, i1); i++) {
      const k = j * p.w + i, c = p.center(k);
      if (p.kind[k] === KIND.house && inRect(r, c.x, c.z)) cells.push(k);
    }
    if (cells.length < 4) continue;
    const mine = new Set(cells), edge = [], touch = new Set();
    for (const k of cells) {
      const i = k % p.w, j = (k - i) / p.w;
      let ox = 0, oz = 0;
      for (const [di, dj] of N4) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= p.w || b >= p.h) continue;
        if (!mine.has(b * p.w + a) && p.kind[b * p.w + a] !== KIND.house) { ox += di; oz += dj; }
      }
      if (ox || oz) edge.push({ key: k, out: [Math.sign(ox), Math.sign(oz)] });
      for (const [di, dj] of N8) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= p.w || b >= p.h) continue;
        const q = b * p.w + a;
        if (p.walk[q]) touch.add(q);
      }
    }
    if (!edge.length) continue;
    const H = p.height ? Math.max(...cells.map(k => p.height[k])) : 5;
    const cap = Math.max(CAP_MIN, Math.min(CAP_MAX, Math.round(h.w * h.d / AREA_PER_MAN)));
    out.push({ id: plot.id, x: h.x, z: h.z, ry: h.ry, w: h.w, d: h.d, kind: h.kind ?? 'house', cells, edge, touch, cap, eye: Math.min(FLOOR_EYE, H * 0.6), height: H, eave: h.eave ?? H * 0.6 });
  }
  cache.set(map, out);
  return out;
}
const cellHouse = new WeakMap();
// Huset som rutan key hör till, eller null.
export function houseAtKey(map, p, key) {
  let m = cellHouse.get(map);
  if (!m) { m = new Map(); for (const h of housesOf(map, p)) for (const k of h.cells) m.set(k, h); cellHouse.set(map, m); }
  return m.get(key) ?? null;
}
export const houseById = (map, p, id) => housesOf(map, p).find(h => h.id === id) ?? null;

// Sikten från ett fönster (en kantruta): gångbara rutor inom radius, från ögat på eye m.
const winCaches = new WeakMap();
export function windowSight(p, h, key, radius) {
  let winCache = winCaches.get(p);
  if (!winCache) { winCache = new Map(); winCaches.set(p, winCache); }
  const ck = key + ':' + radius;
  if (winCache.has(ck)) return winCache.get(ck);
  const mask = new Uint8Array(p.n), keys = [];
  const c = p.center(key), reach = radius + p.size * 0.7072;
  for (const k of p.walkKeys) {
    const q = p.center(k);
    if (Math.hypot(q.x - c.x, q.z - c.z) > reach) continue;
    if (lineOfSightH(p, key, k, h.eye)) { mask[k] = 1; keys.push(k); }
  }
  const out = { mask, keys };
  if (winCache.size > 4000) winCache.clear();
  winCache.set(ck, out);
  return out;
}
// Fönstren gruppen tar: count kantrutor som ser mest av hordens väg (weight), minst WINDOW_GAP isär. Lika: lägst nyckel.
// Varje fönster: { cell, x, z, face, sight } där x, z ligger i fasaden (rutans mitt flyttad ut mot kanten).
export function pickWindows(p, h, count, radius, weight) {
  const cands = h.edge.map(e => {
    const s = windowSight(p, h, e.key, radius);
    let seen = 0, fx = 0, fz = 0;
    const c = p.center(e.key);
    for (const k of s.keys) { const q = p.center(k), wt = weight ? weight[k] : 1; seen += wt; fx += (q.x - c.x) * wt; fz += (q.z - c.z) * wt; }
    const x = c.x + e.out[0] * p.size * 0.75, z = c.z + e.out[1] * p.size * 0.75;
    return { cell: e.key, x, z, out: e.out, face: seen ? Math.atan2(fz, fx) : Math.atan2(e.out[1], e.out[0]), sight: s, seen };
  });
  cands.sort((a, b) => b.seen - a.seen || a.cell - b.cell);
  const picked = [];
  for (const c of cands) {
    if (picked.length >= count) break;
    if (picked.some(q => Math.hypot(q.x - c.x, q.z - c.z) < WINDOW_GAP - 1e-9)) continue;
    picked.push(c);
  }
  // trångt (ett litet hus): fyll på utan avstånd
  for (const c of cands) { if (picked.length >= count) break; if (!picked.includes(c)) picked.push(c); }
  return picked;
}
// Dörren ett hus slås på: husets mitt räknas som dörrens plats (bara för avstånd).
export const houseRect = h => rect(h.x, h.z, h.ry, h.w, h.d);
