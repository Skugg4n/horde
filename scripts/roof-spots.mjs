// Takplatserna för Psg 90 per bana (0.26.2, H605: "nästan alla tak är för branta"). Räknar rutorna där Psg 90 får
// ligga (roof > 0) och de bra platserna: byggnader med en takruta vars sikt (Psg 90:s räckvidd) täcker minst GOOD
// rutor av huvudvägarna (flödet från varje ingång till basen). Rent, ingen webbläsare.
//   node scripts/roof-spots.mjs [--json]
import { createSim } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { roofSightFrom } from '../src/sim/placement.js';
import { WEAPONS } from '../src/data/weapons.js';

export const GOOD = 10;
export function roofSpots(map) {
  const sim = createSim({ map, day: 1, cash: 0, seed: 1 });
  const p = sim.place, range = WEAPONS.psg90.range;
  const main = new Set();
  if (sim.route.kind === 'grid') {
    for (const path of sim.route.paths()) for (const c of path.cells) { const q = sim.route.cellCenter(c); const k = p.keyAt(q.x, q.z); if (k >= 0) main.add(k); }
  } else for (const k of p.walkKeys) main.add(k);
  const cells = [], byBldg = new Map(), kinds = {};
  for (let k = 0; k < p.n; k++) {
    if (!(p.roof?.[k] > 0)) continue;
    cells.push(k);
    const perch = p.perch?.[k] ?? 1;
    kinds[perch] = (kinds[perch] ?? 0) + 1;
    const seen = roofSightFrom(p, k, range).keys.filter(q => main.has(q)).length;
    const b = p.bldg?.[k] ?? -k;
    byBldg.set(b, Math.max(byBldg.get(b) ?? 0, seen));
  }
  const good = [...byBldg.values()].filter(v => v >= GOOD).length;
  return { map: map.id, cells: cells.length, buildings: byBldg.size, good, kinds, main: main.size };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const rows = Object.values(MAPS).map(roofSpots);
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows));
  else for (const r of rows) console.log(`${r.map.padEnd(22)} takrutor ${String(r.cells).padStart(4)}  byggnader ${String(r.buildings).padStart(3)}  bra (>= ${GOOD} vägrutor) ${String(r.good).padStart(3)}  slag ${JSON.stringify(r.kinds)}  huvudväg ${r.main}`);
}
