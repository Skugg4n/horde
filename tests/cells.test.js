import test from 'node:test';
import assert from 'node:assert/strict';
import { cellAt } from '../src/sim/cells.js';
import { projectOnPath } from '../src/sim/path.js';
import { CELL_LEN } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

const map = MAPS.riksvagen;
// Riksvägen går från x 46 mot x -12 längs z 0, så d = 46 - x.
const at = (d, z) => cellAt(map, 46 - d, z);

test('projectOnPath ger sträcka och sidoavstånd', () => {
  const p = projectOnPath(map.path, 10, 2);
  assert.equal(p.d, 36);
  assert.equal(Math.abs(p.off), 2);
});
test('hela rutan svarar, över hela vägbredden', () => {
  map.cells.forEach((cd, i) => {
    for (let f = 0; f <= 1; f += 0.1) for (let z = -4.4; z <= 4.4; z += 0.4) {
      assert.equal(at(cd + f * CELL_LEN, z), i, `ruta ${i} f ${f} z ${z}`);
    }
  });
});
test('mellan två rutor (49..52) går klicket till den närmaste', () => {
  assert.equal(at(49.5, 0), 1);
  assert.equal(at(51.5, 0), 0);
});
test('utanför vägen eller långt från rutor blir det ingen ruta', () => {
  assert.equal(at(50, 6), null);
  assert.equal(at(5, 0), null);       // nära spawn, långt före första rutan
});
