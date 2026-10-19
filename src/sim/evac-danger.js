// Evakueringens farozoner (0.16.1, speltestet av 0.16.0: "Hagstumosse dag 1 förlorad tre gånger utan att jag
// förstod varför; de civila dog på nedre delen av gula linjen innan de frivilliga sköt"). Där hordens väg möter
// de civilas väg (inom DANGER_R meter) är linjen farlig: där dör de civila. Platserna som täcker en farozon är
// öppna rutor nära den, med fri sikt dit, där de frivilliga får stå. Rent och deterministiskt: samma svar i
// webbläsaren (de röda fläckarna och de föreslagna platserna) och i balansskriptet (den som följer tipset).
import { checkSpot, evacPath } from './sim.js';
import { KIND, lineOfSightH } from './placement.js';
import { WEAPONS } from '../data/weapons.js';

export const DANGER_R = 7;          // m mellan de civilas väg och hordens väg
const MIN_SEG = 2;                  // punkter i rad som räknas som en zon

// De civilas vägar ([x, z][] per hus) och hordens rutor (världspunkter) för dagens ingångar.
export function evacPaths(sim) {
  const ev = sim.dayCfg.evac;
  if (!ev || sim.route.kind !== 'grid') return [];
  const houses = [...new Set(ev.groups.map(g => g.house))];
  // 0.20.0: vägen slutar i den säkra zonen när dagen har en (sim.js evacPath)
  return houses.map(h => evacPath(sim, h));
}
function hordePoints(sim) {
  const ids = [...new Set(sim.dayCfg.waves.flatMap(w => w.groups.map(g => g.spawn ?? sim.route.spawns[0].id)))];
  const pts = [];
  for (const p of sim.route.paths(ids)) for (const k of p.cells) { const c = sim.route.cellCenter(k); pts.push([c.x, c.z]); }
  return pts;
}

// Zonerna: { pts: [x, z][], x, z (mitten), house }. Där varje hus väg går in på hordens väg: därifrån går de
// civila på samma gata som horden, och där hinner löparna ikapp dem. Zonen är de första ZONE_LEN punkterna
// (ungefär 2 m var) från den punkten. Zoner som ligger på samma ställe slås ihop.
const ZONE_LEN = 6;
export function dangerZones(sim) {
  const paths = evacPaths(sim);
  if (!paths.length) return [];
  const horde = hordePoints(sim);
  const near = ([x, z]) => horde.some(([hx, hz]) => Math.hypot(hx - x, hz - z) <= DANGER_R);
  const houses = [...new Set(sim.dayCfg.evac.groups.map(g => g.house))];
  const out = [];
  paths.forEach((path, n) => {
    const i = path.findIndex(near);
    if (i < 0 || i >= path.length - 3) return;
    const pts = path.slice(i, Math.min(path.length - 3, i + ZONE_LEN));
    if (pts.length < MIN_SEG) return;
    // mitten av zonen för de röda fläckarna; platserna siktar på början (ax, az), där de civila kommer ut på gatan
    const [x, z] = pts[Math.floor(pts.length / 2)], [ax, az] = pts[Math.min(1, pts.length - 1)];
    if (!out.some(o => Math.hypot(o.x - x, o.z - z) < 8)) out.push({ pts, x, z, ax, az, house: houses[n] });
  });
  return out;
}

// Föreslagna platser för de frivilliga: för varje zon den öppna ruta där de får stå, 4 till 9 m från zonens mitt
// och med fri sikt dit, närmast 6 m. Högst max platser, en per zon i zonernas ordning (vägens ordning).
// Efter zonerna en plats till på de civilas långa bit mot ishallen (APPROACH av den längsta vägen): där hinner
// de senare vågorna ikapp den sista gruppen.
const APPROACH = 0.7;
export function coverTargets(sim, zones = dangerZones(sim)) {
  const paths = evacPaths(sim), long = paths.reduce((a, q) => (q.length > (a?.length ?? 0) ? q : a), null);
  const out = [...zones];
  if (long && long.length > 8) { const [x, z] = long[Math.round((long.length - 1) * APPROACH)]; out.push({ x, z, approach: true }); }
  return out;
}
export function coverSpots(sim, zones = coverTargets(sim), { type = 'civ', max = 4 } = {}) {
  const p = sim.place, range = WEAPONS[type]?.range ?? 12, out = [];
  for (const z of zones) {
    if (out.length >= max) break;
    const tx = z.ax ?? z.x, tz = z.az ?? z.z, zk = p.keyAt(tx, tz);
    if (zk < 0) continue;
    let best = null, bestScore = Infinity;
    const ci = Math.floor((tx - p.origin[0]) / p.size), cj = Math.floor((tz - p.origin[1]) / p.size), span = Math.ceil(9 / p.size);
    for (let j = cj - span; j <= cj + span; j++) for (let i = ci - span; i <= ci + span; i++) {
      if (i < 0 || j < 0 || i >= p.w || j >= p.h) continue;
      const k = j * p.w + i;
      if (p.kind[k] !== KIND.open) continue;
      const c = p.center(k), d = Math.hypot(c.x - tx, c.z - tz);
      if (d < 4 || d > Math.min(9, range - 2)) continue;
      if (out.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 8)) continue;
      if (!lineOfSightH(p, k, zk)) continue;
      if (!checkSpot(sim, k, type).ok) continue;
      const score = Math.abs(d - 6) + k * 1e-9;
      if (score < bestScore) { bestScore = score; best = { key: k, x: c.x, z: c.z }; }
    }
    if (best) out.push(best);
  }
  return out;
}
