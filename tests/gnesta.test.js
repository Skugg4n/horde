import test from 'node:test';
import assert from 'node:assert/strict';
import { gnesta, GNESTA_VERSION, LOTS, ROADS, distPolyline } from '../src/data/gnesta.js';

const g = gnesta.grid;
const idx = (i, j) => j * g.w + i;

function reach(from) {
  const seen = new Uint8Array(g.w * g.h), q = [from];
  seen[idx(...from)] = 1;
  while (q.length) {
    const [i, j] = q.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= g.w || b >= g.h) continue;
      const k = idx(a, b);
      if (!g.walk[k] || seen[k]) continue;
      seen[k] = 1; q.push([a, b]);
    }
  }
  return seen;
}

test('Gnesta-versionen är semver', () => assert.match(GNESTA_VERSION, /^\d+\.\d+\.\d+$/));

test('rutnätet har rätt form', () => {
  assert.equal(g.cellSize, 2);
  assert.equal(g.walk.length, g.w * g.h);
  assert.ok(g.w * g.cellSize > 130 && g.h * g.cellSize > 80);
});

test('alla spawnpunkter och basen ligger på gångbara rutor', () => {
  for (const s of g.spawns) assert.equal(g.walk[idx(...s.cell)], 1, s.id);
  assert.equal(g.walk[idx(...g.base)], 1);
});

test('horden når basen från varje spawn (4-grannar)', () => {
  const seen = reach(g.base);
  for (const s of g.spawns) assert.equal(seen[idx(...s.cell)], 1, s.id);
});

test('alla gångbara rutor hänger ihop', () => {
  const seen = reach(g.base);
  let walk = 0, got = 0;
  for (let k = 0; k < g.walk.length; k++) if (g.walk[k]) { walk++; if (seen[k]) got++; }
  assert.equal(got, walk);
});

test('inget hus står på en väg', () => {
  const houses = LOTS.plots.filter(p => p.house).map(p => p.house);
  assert.ok(houses.length >= 30);
  for (const h of houses) for (const r of ROADS) {
    assert.ok(distPolyline(h.x, h.z, r.pts) > r.width / 2 + Math.min(h.w, h.d) / 2, `${r.id} vid hus ${h.x.toFixed(1)},${h.z.toFixed(1)}`);
  }
});
