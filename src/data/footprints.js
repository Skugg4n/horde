// Fotavtrycken för det som står still på en bana (0.17.2, H307, Olas speltest av 0.17.1: "hus och stenar ligger på
// vägen, en stenmur korsar vägen"): hus, radhus, hallarna, parkerade bilar, bergskärningen, tornen och sakerna i
// trädgårdarna. Ren data utan three.js; tests/footprints.test.js provar att inget av det står på en gångbar ruta.
// E4:s olycksbilar räknas inte: de står på motorvägen med avsikt (kön som stannade).
import { rect } from '../sim/placement.js';

export function staticFootprints(map) {
  const out = [];
  const add = (id, kind, x, z, ry, w, d) => out.push({ id, kind, r: rect(x, z, ry ?? 0, w, d) });
  for (const p of map.lots?.plots ?? []) {
    const h = p.house;
    if (h) add(h.id ?? p.id, h.kind ?? 'house', h.x, h.z, h.ry, h.w, h.d);
    for (const e of p.extras ?? []) {
      if (e.kind === 'car') add(p.id + ':car', 'car', e.x, e.z, e.ry, 4.3, 1.82);
      else if (e.kind === 'trailer') add(p.id + ':trailer', 'trailer', e.x, e.z, e.ry, 2.6, 1.5);
    }
  }
  for (const r of map.rows ?? []) add('row-' + r.id, 'row', r.x, r.z, r.ry, r.len, r.depth);
  for (const [id, b] of [['sporthall', map.sporthall], ['iceRink', map.iceRink]]) if (b?.len && b.id !== 'folkets') add(id, 'hall', b.x, b.z, b.ry, b.len, b.wid);
  if (map.folkets) add('folkets', 'hall', map.folkets.x, map.folkets.z, map.folkets.ry, map.folkets.len, map.folkets.wid);
  for (const c of map.cars ?? []) add('car', 'car', c.x, c.z, c.ry, 4.3, 1.82);
  // Mölnbo
  if (Array.isArray(map.far)) for (const f of map.far) add('far', 'house', f.x, f.z, f.ry, f.w, f.d);
  if (map.rock?.segs && map.railFrame) {
    const { R, RAIL_RY } = map.railFrame, k = map.rock;
    for (const [u0, u1] of k.segs) { const [x, z] = R((u0 + u1) / 2, k.v); add('rock', 'rock', x, z, RAIL_RY, u1 - u0, k.depth); }
  }
  // E4: stenblocken och lyktstolparna vid korsningen (skyltarna provas i tests/e4-env.test.js)
  for (const k of map.rocks ?? []) add('rock', 'rock', k.x, k.z, 0, k.s * 1.4, k.s * 1.4);
  for (const l of map.lamps ?? []) { const [x, z] = Array.isArray(l) ? l : [l.x, l.z]; add('lamp', 'lamp', x, z, 0, 0.4, 0.4); }
  for (const g of map.garden ?? []) add(g.kind, g.kind, g.x, g.z, g.ry, g.w, g.d);
  for (const f of map.fences ?? []) add(f.kind, f.kind, f.x, f.z, f.ry, f.w, f.d);
  return out;
}
