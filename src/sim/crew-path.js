// Besättningarnas vägar (0.13.0, H134). Rent och deterministiskt: bara siffror.
//
// En egen vägsökning, skild från hordens rutnät (route.js): soldaterna och lagen går över allt som är
// öppen mark eller gata i placeringsrutnätet (gator, tomter, gräs, trädgårdar), aldrig genom hus, skog,
// vatten eller föremål (bilar, staket som rutnätet räknar som hinder). A* med åtta grannar, inga
// genvägar över ett hörn (diagonalen bara när båda raka grannarna går), heltalskostnader (rakt 10,
// snett 14) och lika poäng avgörs av rutans nyckel. Vägen rätas sedan ut (en sträcka i taget så långt
// som en rak linje håller sig på gångbara rutor), så att de springer i raka linjer och inte i trappsteg.
import { KIND } from './placement.js';

// Rutan går att gå på för en besättning (och för pillboxen: vägar och gräs).
export const crewPassable = (p, k) => k >= 0 && k < p.n && (p.kind[k] === KIND.open || p.kind[k] === KIND.road);

const SQ = 10, DG = 14;
const N8 = [[1, 0, SQ], [-1, 0, SQ], [0, 1, SQ], [0, -1, SQ], [1, 1, DG], [-1, 1, DG], [1, -1, DG], [-1, -1, DG]];

// Liten binär hög på (f, nyckel).
function heap() {
  const a = [];
  const less = (x, y) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
  return {
    get size() { return a.length; },
    push(v) { a.push(v); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (!less(a[i], a[p])) break; [a[i], a[p]] = [a[p], a[i]]; i = p; } },
    pop() {
      const top = a[0], last = a.pop();
      if (a.length) {
        a[0] = last; let i = 0;
        for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && less(a[l], a[m])) m = l; if (r < a.length && less(a[r], a[m])) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; }
      }
      return top;
    },
  };
}

// Närmaste gångbara ruta till rutan k (k själv om den går), inom r rutor. Lika: lägst nyckel. -1 om ingen.
export function nearestPassable(p, k, r = 6, ok = crewPassable) {
  if (ok(p, k)) return k;
  const i0 = k % p.w, j0 = Math.floor(k / p.w);
  let best = -1, bd = Infinity;
  for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
    if (i < 0 || j < 0 || i >= p.w || j >= p.h) continue;
    const q = j * p.w + i;
    if (!ok(p, q)) continue;
    const d = (i - i0) ** 2 + (j - j0) ** 2;
    if (d < bd || (d === bd && q < best)) { bd = d; best = q; }
  }
  return best;
}

// Kortaste vägen från rutan a till rutan b som rutnycklar (a och b med), eller null.
export function findPath(p, a, b, ok = crewPassable) {
  if (!ok(p, a) || !ok(p, b)) return null;
  if (a === b) return [a];
  const w = p.w, bi = b % w, bj = Math.floor(b / w);
  const g = new Map([[a, 0]]), from = new Map(), closed = new Set();
  const hOf = k => { const di = Math.abs((k % w) - bi), dj = Math.abs(Math.floor(k / w) - bj); return SQ * Math.max(di, dj) + (DG - SQ) * Math.min(di, dj); };
  const open = heap();
  open.push([hOf(a), a]);
  while (open.size) {
    const [, k] = open.pop();
    if (closed.has(k)) continue;
    if (k === b) break;
    closed.add(k);
    const i = k % w, j = Math.floor(k / w), gk = g.get(k);
    for (const [di, dj, c] of N8) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= p.h) continue;
      const q = nj * w + ni;
      if (closed.has(q) || !ok(p, q)) continue;
      if (di && dj && (!ok(p, j * w + ni) || !ok(p, nj * w + i))) continue;
      const ng = gk + c;
      if (ng < (g.get(q) ?? Infinity)) { g.set(q, ng); from.set(q, k); open.push([ng + hOf(q), q]); }
    }
  }
  if (!g.has(b)) return null;
  const out = [b];
  for (let k = b; k !== a;) { k = from.get(k); out.push(k); }
  return out.reverse();
}

// Går en rak linje mellan två punkter bara över gångbara rutor? Prov var 0,25 m, och en bit åt sidorna
// (0,35 m), så att linjen inte skär ett hushörn.
export function clearLine(p, x0, z0, x1, z1, ok = crewPassable) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.25));
  const nx = L ? -(z1 - z0) / L * 0.35 : 0, nz = L ? (x1 - x0) / L * 0.35 : 0;
  for (let s = 0; s <= n; s++) {
    const x = x0 + (x1 - x0) * s / n, z = z0 + (z1 - z0) * s / n;
    if (!ok(p, p.keyAt(x, z)) || !ok(p, p.keyAt(x + nx, z + nz)) || !ok(p, p.keyAt(x - nx, z - nz))) return false;
  }
  return true;
}

// Rutnycklar till punkter, uträtade. start/end: exakta punkter i början och slutet (annars rutornas mitt).
export function smoothPath(p, keys, start = null, end = null, ok = crewPassable) {
  const pts = keys.map(k => { const c = p.center(k); return [c.x, c.z]; });
  if (start) pts[0] = [start.x, start.z];
  if (end) pts[pts.length - 1] = [end.x, end.z];
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !clearLine(p, pts[i][0], pts[i][1], pts[j][0], pts[j][1], ok)) j--;
    out.push(pts[j]); i = j;
  }
  return out;
}

// Hela vägen från en punkt genom waypoints (rutnycklar) till målrutan. Start- och målrutan får ligga
// utanför det gångbara (ett tak, en pjäs vid en vägg): då tas närmaste gångbara ruta. Svar:
// { pts: [[x, z], ...], len } eller null om någon sträcka saknar väg.
export function crewRoute(p, from, to, via = [], ok = crewPassable) {
  const startKey = nearestPassable(p, p.keyAt(from.x, from.z), 6, ok);
  if (startKey < 0) return null;
  const stops = [...via, to].map(k => nearestPassable(p, k, 6, ok));
  if (stops.some(k => k < 0)) return null;
  let keys = [startKey];
  for (const k of stops) {
    const seg = findPath(p, keys[keys.length - 1], k, ok);
    if (!seg) return null;
    keys = keys.concat(seg.slice(1));
  }
  const endC = p.center(to);
  // varje waypoint är ett stopp på vägen: räta ut sträckorna mellan dem var för sig
  const cuts = [0];
  let at = 0;
  for (const k of stops.slice(0, -1)) { at = keys.indexOf(k, at); cuts.push(at); }
  cuts.push(keys.length - 1);
  let pts = [];
  for (let s = 0; s < cuts.length - 1; s++) {
    const part = keys.slice(cuts[s], cuts[s + 1] + 1);
    const sm = smoothPath(p, part, s === 0 ? from : null, s === cuts.length - 2 ? endC : null, ok);
    pts = pts.length ? pts.concat(sm.slice(1)) : sm;
  }
  if (pts.length === 1) pts.push([endC.x, endC.z]);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return { pts, len };
}

// Punkten d meter längs vägen och riktningen där (atan2(dz, dx)).
export function alongPath(path, d) {
  const pts = path.pts;
  let left = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az);
    if (left <= L || i === pts.length - 1) {
      const t = L ? Math.min(1, left / L) : 1;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dir: Math.atan2(bz - az, bx - ax) };
    }
    left -= L;
  }
  return { x: pts[0][0], z: pts[0][1], dir: 0 };
}
