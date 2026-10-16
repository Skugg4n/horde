// Placeringen förlåter (0.12.0, H113). Speltestet av 0.11.0: var tredje placering misslyckades, oftast
// för att rutan under pekaren inte var den spelaren såg: gatan ritas med sin riktiga bredd men
// rutnätet har 2 m-rutor, så pekaren vid kanten av en smal grus- eller cykelväg hamnar i en ruta som
// inte är gata ("Only on the road"), och en pjäs vid gatukanten hamnar i en gaturuta ("On the road").
// Nu tas närmaste ruta inom SNAP meter från pekaren som går, om rutan under pekaren inte gör det. Rent.
import { checkSpot, checkObstacle, checkMove } from './sim.js';

export const SNAP = 2.3;     // meter från pekaren

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
  const check = k => (move ? checkMove(sim, move, k) : checkSpot(sim, k, type));
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
  return fallback ?? { key: -1, ok: false, reason: 'ingen gata' };
}
