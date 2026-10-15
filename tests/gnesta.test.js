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

test('vapenpositionerna står på tomter, inte på gatan, och når en gata', () => {
  for (const s of gnesta.slots) {
    const i = Math.floor((s.x - g.origin[0]) / g.cellSize), j = Math.floor((s.z - g.origin[1]) / g.cellSize);
    assert.equal(g.walk[idx(i, j)], 0, `${s.id} på gatan`);
    const gap = Math.min(...ROADS.filter(r => r.walk).map(r => distPolyline(s.x, s.z, r.pts) - r.width / 2));
    assert.ok(gap > 2.5 && gap < 10, `${s.id}: ${gap.toFixed(1)} m från gatan`);
  }
  assert.deepEqual(gnesta.slots.map(s => s.id), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  assert.deepEqual(gnesta.slots.filter(s => s.locked).map(s => s.id), ['G', 'H']);
});

test('dagarna öppnar ingångarna i tur och ordning', () => {
  const spawnsOf = d => new Set(d.waves.flatMap(w => w.groups.map(x => x.spawn)));
  const types = d => new Set(d.waves.flatMap(w => w.groups.map(x => x.type)));
  assert.equal(gnesta.days.length, 5);
  assert.deepEqual([...spawnsOf(gnesta.days[0])], ['east1']);
  assert.ok(spawnsOf(gnesta.days[1]).has('east2') && !spawnsOf(gnesta.days[1]).has('forest'));
  assert.ok(spawnsOf(gnesta.days[2]).has('forest'));
  assert.ok(!types(gnesta.days[2]).has('brute') && types(gnesta.days[3]).has('brute'));
  assert.equal(spawnsOf(gnesta.days[4]).size, 3);
  assert.match(gnesta.days[0].intro.text, /Block a street and they'll walk around the block/);
});

test('sporthallen och parkeringen ligger inte på någon väg', () => {
  const { sporthall: h, parking } = gnesta;
  for (const r of ROADS.filter(r => r.walk)) assert.ok(distPolyline(h.x, h.z, r.pts) > Math.max(h.len, h.wid) / 2, r.id);
  for (const row of parking.bays) assert.ok(row.lines.length > 8);
  assert.equal(parking.bays.length, 4);
});

test('spöklagret ligger utanför den skarpa spelytan', () => {
  const { crisp, districts } = gnesta.surroundings;
  const inside = (x, z) => x > crisp.x0 && x < crisp.x1 && z > crisp.z0 && z < crisp.z1;
  let n = 0;
  for (const d of districts) for (const b of d.buildings) { n++; assert.ok(!inside(b.x, b.z), `${d.id} ${b.x.toFixed(0)},${b.z.toFixed(0)}`); }
  assert.ok(n >= 25);
  assert.deepEqual(districts.map(d => d.id), ['ostra-storgatan', 'vikingavagen', 'radhusen', 'sporthallen']);
});
