// Gatans namn (0.17.1, speltestet av 0.17.0: "jag förstod aldrig vilken väg horden tog in"). Rent: bara siffror.
// streetAt: närmaste namngivna gångbara gata vid en punkt (inom gatans halva bredd plus REACH meter), eller null.
// rerouteStreet: när en grupps väg byts, gatan där den nya vägen går som den gamla inte gick (flest rutor), så att
// raden kan säga "Horde rerouting via Kvarnvägen". before och after: rutnätets rutor (route.paths().cells).
import { distPolyline } from '../data/gnesta.js';

export const REACH = 3;
export function streetAt(map, x, z) {
  let best = null, bd = Infinity;
  for (const r of map.roads ?? []) {
    if (!r.name || r.walk === false || !r.pts || r.pts.length < 2) continue;
    const d = distPolyline(x, z, r.pts) - (r.width ?? 0) / 2;
    if (d < bd - 1e-9) { bd = d; best = r.name; }
  }
  return bd <= REACH ? best : null;
}
export function rerouteStreet(map, center, before, after) {
  const old = new Set(before);
  const count = new Map();
  let first = null;
  for (const k of after) {
    if (old.has(k)) continue;
    const [x, z] = center(k), n = streetAt(map, x, z);
    if (!n) continue;
    first ??= n;
    count.set(n, (count.get(n) ?? 0) + 1);
  }
  let best = first, bn = -1;
  for (const [n, c] of count) if (c > bn) { bn = c; best = n; }
  return best;
}
