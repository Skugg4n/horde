// Laddtiden (0.20.0, H502): de snabbare vägarna ger samma svar som de gamla, och banornas rutnät räknas först när
// banan behövs. Mätningen: docs/reports/2026-10-19-laddtid.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nearLine, nearEdge, eachRoadCell } from '../src/data/road-field.js';
import { distPolyline } from '../src/data/gnesta.js';
import { lazy } from '../src/data/lazy.js';
import { makeRng } from '../src/sim/rng.js';

test('nearLine och nearEdge svarar som distPolyline', () => {
  const rng = makeRng(502), r = () => rng();
  for (let n = 0; n < 200; n++) {
    const pts = []; let x = r() * 100, z = r() * 100;
    for (let i = 0; i < 2 + (r() * 12 | 0); i++) { pts.push([x, z]); x += (r() - 0.5) * 30; z += (r() - 0.5) * 30; }
    for (let k = 0; k < 40; k++) {
      const px = r() * 140 - 20, pz = r() * 140 - 20, thr = r() * 12, sub = r() * 4;
      assert.equal(nearLine(px, pz, pts, thr), distPolyline(px, pz, pts) < thr);
      assert.equal(nearEdge(px, pz, pts, sub, thr), distPolyline(px, pz, pts) - sub < thr);
    }
  }
});

test('vägfältet ger varje ruta nära vägen samma avstånd som distPolyline', () => {
  const roads = [{ width: 6, pts: [[0, 0], [40, 10], [60, 50]] }, { width: 3, pts: [[10, 60], [12, 2]] }];
  const geo = { x0: -10, z0: -10, gw: 40, gh: 40, cellSize: 2 };
  let n = 0;
  eachRoadCell(roads, geo, 2, (ri, k, d) => {
    const x = geo.x0 + ((k % geo.gw) + 0.5) * 2, z = geo.z0 + (Math.floor(k / geo.gw) + 0.5) * 2;
    if (d <= roads[ri].width / 2 + 2) { assert.equal(d, distPolyline(x, z, roads[ri].pts)); n++; }
  });
  assert.ok(n > 100);
});

test('lazy: räknas en gång, när någon läser, och går att skriva över', () => {
  let calls = 0; const o = {};
  lazy(o, 'grid', () => { calls++; return { w: 3 }; });
  assert.equal(calls, 0);
  assert.equal(o.grid.w, 3); assert.equal(o.grid.w, 3); assert.equal(calls, 1);
  o.grid = 7; assert.equal(o.grid, 7);
  assert.deepEqual(Object.keys(o), ['grid']);
});

test('banornas rutnät och placering räknas inte vid start', async () => {
  const { MAPS } = await import('../src/data/maps.js');
  for (const m of Object.values(MAPS)) {
    const g = Object.getOwnPropertyDescriptor(m, 'grid'), p = Object.getOwnPropertyDescriptor(m, 'place');
    assert.ok(g.get, m.id + ' grid'); assert.ok(p.get, m.id + ' place');
  }
  // och finns när de läses
  assert.ok(MAPS.molnbo.grid.w > 0 && MAPS.molnbo.place.kind.length === MAPS.molnbo.grid.w * MAPS.molnbo.grid.h);
});
