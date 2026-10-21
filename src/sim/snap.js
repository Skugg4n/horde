// Placeringen förlåter (0.12.0, H113). Speltestet av 0.11.0: var tredje placering misslyckades, oftast
// för att rutan under pekaren inte var den spelaren såg: gatan ritas med sin riktiga bredd men
// rutnätet har 2 m-rutor, så pekaren vid kanten av en smal grus- eller cykelväg hamnar i en ruta som
// inte är gata ("Only on the road"), och en pjäs vid gatukanten hamnar i en gaturuta ("On the road").
// Nu tas närmaste ruta inom SNAP meter från pekaren som går, om rutan under pekaren inte gör det. Rent.
import { checkSpot, checkObstacle, checkMove } from './sim.js';

// 0.14.2 (speltestet av 0.14.1: hälften av placeringarna i Gnesta nekades): 3 m (var 2,3). En pil går från
// pekaren till rutan spöket snäppte till (main.js, view.js snap).
export const SNAP = 3.0;     // meter från pekaren

// Rutorna inom r meter från punkten, närmast först (lika: lägst nyckel). cells: { size, w, h, origin }.
function near(g, x, z, r) {
  const out = [], [x0, z0] = g.origin, size = g.size ?? g.cellSize;
  const i0 = Math.floor((x - x0) / size), j0 = Math.floor((z - z0) / size), span = Math.ceil(r / size) + 1;
  for (let j = j0 - span; j <= j0 + span; j++) for (let i = i0 - span; i <= i0 + span; i++) {
    if (i < 0 || j < 0 || i >= g.w || j >= g.h) continue;
    const cx = x0 + (i + 0.5) * size, cz = z0 + (j + 0.5) * size, d = Math.hypot(cx - x, cz - z);
    if (d <= r + size * 0.7072) out.push({ k: j * g.w + i, d });
  }
  return out.sort((a, b) => a.d - b.d || a.k - b.k).map(o => o.k);
}

// Pjäs (eller flytt: move = pjäsens id) i punkten (x, z). Svar: { key, ok, reason }; reason är skälet
// för rutan under pekaren när ingen ruta i närheten går.
export function snapGun(sim, x, z, type, { move = null } = {}) {
  const p = sim.place, under = p.keyAt(x, z);
  const check = k => (move ? checkMove(sim, move, k, [], { path: false }) : checkSpot(sim, k, type));
  const first = under >= 0 ? check(under) : { ok: false, reason: 'utanför' };
  if (first.ok || ['fel läge', 'fullt', 'pengar', 'flyttar'].includes(first.reason)) return { key: under, ...first };
  for (const k of near(p, x, z, SNAP)) {
    if (k === under) continue;
    // ett tak tas bara om pekaren står på det (taken ligger högt, en ruta bredvid är något annat)
    if (p.kind[k] !== p.kind[under] && p.kind[k] !== 0) continue;
    if (check(k).ok) return { key: k, ok: true };
  }
  return { key: under, ...first };
}

// Hinder (barrikad, tråd) på gatan närmast punkten. Svar som checkObstacle plus key.
export function snapObstacle(sim, x, z, type) {
  const r = sim.route, under = r.cellAt(x, z);
  if (under != null && r.validCell(under)) {
    const c = checkObstacle(sim, under, type);
    if (c.ok || ['fel läge', 'pengar', 'ej upplåst', 'zombier'].includes(c.reason)) return { key: under, ...c };
  }
  const g = r.grid;
  if (!g) return under == null ? { key: -1, ok: false, reason: 'ingen gata' } : { key: under, ...checkObstacle(sim, under, type) };
  let fallback = null;
  for (const k of near(g, x, z, SNAP)) {
    if (!r.validCell(k)) continue;
    const c = checkObstacle(sim, k, type);
    if (c.ok) return { key: k, ok: true };
    fallback ??= { key: k, ...c };
  }
  if (fallback) return fallback;
  // 0.23.2 (omtestet av 0.23.1: taggtråd nekades med "Only on the road" mitt på Stationsvägen vid Wattrangsborg): gatan
  // närmast basen hör till basen (rutnätets bas, BASE_RADIUS), så skälet säger det
  const baseSet = new Set(g.base ?? []);
  if (near(g, x, z, SNAP).some(k => baseSet.has(k))) return { key: -1, ok: false, reason: 'basnära' };
  return { key: -1, ok: false, reason: 'ingen gata' };
}

// 0.12.1 (speltestet av 0.12.0: Psg 90 siktad på ishallens tak hamnade på marken bakom hallen): när
// pekaren står på en byggnad (hit: husrutan strålen träffar, x/z punkten på taket) tas byggnadens
// bästa utsiktspunkt: närmast pekaren av byggnadens perch-rutor som går. Går ingen svarar den ändå med
// taket (aldrig marken bakom), med skälet: 'brant' / 'brant-skorsten' när byggnaden saknar
// utsiktspunkt, annars skälet för närmaste utsiktspunkt ("Too close to another gun"). Rent.
// Svar: { key, ok, reason, roof: true, snapped, perch } eller null när hit inte är en byggnad.
const roofCells = new WeakMap();
function perchCellsOf(p, bid) {
  let m = roofCells.get(p);
  if (!m) {
    m = new Map();
    for (let k = 0; k < p.n; k++) if (p.bldg?.[k] && p.roof?.[k] > 0) { const b = p.bldg[k]; if (!m.has(b)) m.set(b, []); m.get(b).push(k); }
    roofCells.set(p, m);
  }
  return m.get(bid) ?? [];
}
// Byggnaden i rutan, eller i en grannruta (marginalen runt huset har ingen byggnad).
export function buildingAt(p, key) {
  if (!p.bldg || !p.valid(key)) return 0;
  if (p.bldg[key]) return p.bldg[key];
  const i = key % p.w, j = Math.floor(key / p.w);
  for (let r = 1; r <= 2; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const ii = i + di, jj = j + dj;
    if (ii < 0 || jj < 0 || ii >= p.w || jj >= p.h) continue;
    const b = p.bldg[jj * p.w + ii];
    if (b) return b;
  }
  return 0;
}
export function snapRoof(sim, hit, x, z, type, { move = null } = {}) {
  const p = sim.place, bid = buildingAt(p, hit);
  if (!bid) return null;
  const check = k => (move ? checkMove(sim, move, k, [], { path: false }) : checkSpot(sim, k, type));
  const cells = perchCellsOf(p, bid).map(k => { const c = p.center(k); return { k, d: Math.hypot(c.x - x, c.z - z) }; })
    .sort((a, b) => a.d - b.d || a.k - b.k);
  for (const { k } of cells) {
    const c = check(k);
    if (c.ok) return { key: k, ok: true, roof: true, snapped: k !== hit, perch: p.perch?.[k] ?? 1 };
    if (['fel läge', 'fullt', 'pengar', 'flyttar'].includes(c.reason)) return { key: k, ...c, roof: true, snapped: k !== hit, perch: p.perch?.[k] ?? 1 };
  }
  if (cells.length) return { key: cells[0].k, ...check(cells[0].k), roof: true, snapped: cells[0].k !== hit, perch: p.perch?.[cells[0].k] ?? 1 };
  const at = p.perchAt?.(x, z);
  return { key: hit, ok: false, reason: at?.chimney ? 'brant-skorsten' : 'brant', roof: true, snapped: false, perch: 0 };
}
