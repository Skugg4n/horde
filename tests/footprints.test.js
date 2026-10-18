// Inget som står still står på vägen (0.17.2, H307, Olas speltest av 0.17.1: "hus och stenar ligger på vägen,
// stenmur korsar väg"). Varje statiskt fotavtryck (src/data/footprints.js) på varje bana: ingen gångbar ruta har
// sin mitt inne i det.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { staticFootprints } from '../src/data/footprints.js';
import { inRect } from '../src/sim/placement.js';

// En ruta räknas som överkörd när dess mitt ligger minst INSIDE m inne i fotavtrycket. Rutorna är 2 m: en
// gångväg som snuddar en husvägg (rutnätets kvantisering) räknas inte, ett hus eller en bil på vägen gör det.
const INSIDE = 0.6;
test('inga hus, murar, bilar eller trädgårdssaker på en gångbar ruta, på någon bana', () => {
  const all = {};
  for (const map of Object.values(MAPS)) {
    const g = map.grid, fp = staticFootprints(map), bad = [];
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
      if (!g.walk[j * g.w + i]) continue;
      const x = g.origin[0] + (i + 0.5) * g.cellSize, z = g.origin[1] + (j + 0.5) * g.cellSize;
      for (const f of fp) if (inRect(f.r, x, z, -INSIDE)) bad.push(`${f.kind} ${f.id} vid (${x.toFixed(0)}, ${z.toFixed(0)})`);
    }
    assert.ok(fp.length >= 10, `${map.id}: ${fp.length} fotavtryck`);
    if (bad.length) all[map.id] = [...new Set(bad)];
  }
  assert.deepEqual(all, {});
});
