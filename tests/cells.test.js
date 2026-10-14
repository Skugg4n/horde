import test from 'node:test';
import assert from 'node:assert/strict';
import { cellAt } from '../src/sim/cells.js';
import { projectOnPath, pointAt, pathLength } from '../src/sim/path.js';
import * as WEAPONS_MOD from '../src/data/weapons.js';
import { CELL_LEN } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

const map = MAPS.riksvagen;
// Riksvägen går rakt längs z 0 från spawn (x0) mot basen, så d = x0 - x.
const X0 = map.path[0][0];
const at = (d, z) => cellAt(map, X0 - d, z);

test('projectOnPath ger sträcka och sidoavstånd', () => {
  const p = projectOnPath(map.path, 10, 2);
  assert.equal(p.d, X0 - 10);
  assert.equal(Math.abs(p.off), 2);
});
test('hela rutan svarar, över hela vägbredden (kanten mot basen hör till nästa ruta)', () => {
  map.cells.forEach((cd, i) => {
    for (let f = 0; f < 0.99; f += 0.1) for (let z = -4.4; z <= 4.4; z += 0.4) {
      assert.equal(at(cd + f * CELL_LEN, z), i, `ruta ${i} f ${f} z ${z}`);
    }
  });
});
test('rutorna ligger kant i kant, utan väg emellan', () => {
  const sorted = [...map.cells].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) assert.equal(sorted[i] - sorted[i - 1], CELL_LEN);
});
test('gränsen mellan två rutor går till rätt ruta', () => {
  assert.equal(at(map.cells[0] - 0.2, 0), 1);
  assert.equal(at(map.cells[0] + 0.2, 0), 0);
});
test('alla rutor ligger på vägen och inom räckhåll för en M249 på nivå 1, hela vägbredden', () => {
  const { WEAPONS } = WEAPONS_MOD;
  const open = map.slots.filter(s => !s.locked);
  map.cells.forEach((cd, i) => {
    for (const f of [0, 0.5, 1]) for (const off of [-3, 0, 3]) {
      assert.ok(cd + f * CELL_LEN <= pathLength(map.path), `ruta ${i} ligger efter vägens slut`);
      const p = pointAt(map.path, cd + f * CELL_LEN);
      const x = p.x - p.dirZ * off, z = p.z + p.dirX * off;
      const near = open.filter(s => Math.hypot(x - s.x, z - s.z) <= WEAPONS.m249.range);
      // De tre rutorna närmast basen (där taggtråden brukar ligga) når minst två positioner.
      assert.ok(near.length >= (i <= 2 ? 2 : 1), `ruta ${i} f ${f} off ${off}: ${near.length} positioner`);
    }
  });
});
test('rekvisita står inte på rutor eller nära positioner', () => {
  for (const pr of map.props) {
    if (pr.kind === 'poles') continue;
    for (const s of map.slots) assert.ok(Math.hypot(pr.x - s.x, pr.z - s.z) >= 3.5, `${pr.kind} vid ${pr.x},${pr.z} nära ${s.id}`);
    assert.equal(cellAt(map, pr.x, pr.z, { reach: 0 }), null, `${pr.kind} vid ${pr.x},${pr.z} på en ruta`);
  }
});
test('utanför vägen eller långt från rutor blir det ingen ruta', () => {
  assert.equal(at(50, 6), null);
  assert.equal(at(5, 0), null);       // nära spawn, långt före första rutan
  assert.equal(at(map.cells[0] + CELL_LEN + 3, 0), null);   // mellan sista rutan och basen
});
