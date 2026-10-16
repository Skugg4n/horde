import test from 'node:test';
import assert from 'node:assert/strict';
import { pathRoute } from '../src/sim/route.js';
import { pointAt } from '../src/sim/path.js';
import { MAPS } from '../src/data/maps.js';
import { makeRng } from '../src/sim/rng.js';

test('pathRoute: läge, framsteg och ankomst som förut', () => {
  const map = MAPS.riksvagen, r = pathRoute(map);
  const z = r.spawn(makeRng(3));
  assert.equal(z.d, 0);
  assert.ok(Math.abs(z.off) <= 3);
  r.advance(z, 10);
  const p = pointAt(map.path, 10);
  assert.deepEqual(r.place(z), { x: p.x - p.dirZ * z.off, z: p.z + p.dirX * z.off, dirX: p.dirX, dirZ: p.dirZ });
  assert.equal(r.progress(z), 10);
  assert.equal(r.arrived(z), false);
  r.advance(z, r.len);
  assert.equal(r.arrived(z), true);
  assert.equal(r.validCell(0), true);
  assert.equal(r.validCell(map.cells.length), false);
  assert.equal(r.validCell('constructor'), false);
});
