// Vilken ruta på vägen en punkt på marken hör till. Ren funktion, används av klickhanteringen.
// Rutorna är 3 m långa med vägfärgad mark emellan. Ett klick mellan två rutor går till den
// närmaste, så att hela vägsträckan med rutor svarar (musen lyser upp den ruta som väljs).
import { projectOnPath } from './path.js';
import { CELL_LEN } from './sim.js';

export const ROAD_HALF = 4.5;      // halva vägbredden i meter

// reach: hur långt utanför en ruta (längs vägen) ett klick fortfarande räknas till den.
export function cellAt(map, x, z, { reach = 1.6, halfWidth = ROAD_HALF + 0.3 } = {}) {
  const p = projectOnPath(map.path, x, z);
  if (!p || Math.abs(p.off) > halfWidth) return null;
  let best = -1, bestGap = Infinity;
  map.cells.forEach((cd, i) => {
    const gap = p.d < cd ? cd - p.d : p.d > cd + CELL_LEN ? p.d - (cd + CELL_LEN) : 0;
    if (gap < bestGap) { bestGap = gap; best = i; }
  });
  return best >= 0 && bestGap <= reach ? best : null;
}
