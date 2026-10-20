import test from 'node:test';
import assert from 'node:assert/strict';
import { gnesta, GNESTA_VERSION, LOTS, ROADS, distPolyline } from '../src/data/gnesta.js';
import { placementFor, KIND } from '../src/sim/placement.js';

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

test('basen är ishallens entré: framför dörrarna, på andra sidan rondellen', () => {
  const [bx, bz] = g.center(...g.base), hr = gnesta.iceRink;
  const [ex, ez] = hr.entrance;
  assert.ok(Math.hypot(bx - ex, bz - ez) < 2.5, `basrutan ${bx},${bz} mot entrén ${ex.toFixed(1)},${ez.toFixed(1)}`);
  const [rx, rz] = gnesta.roundabout.center;
  assert.ok(Math.hypot(bx - rx, bz - rz) > 9, 'basen ligger inte i rondellen');
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

test('placeringen: gatan är gata, husen hus, ön går att bygga på, entrén är hus, och det finns gott om öppen mark nära gatan', () => {
  const p = placementFor(gnesta);
  assert.equal(p.w, g.w); assert.equal(p.h, g.h);
  for (let k = 0; k < p.n; k++) if (g.walk[k]) assert.equal(p.kind[k], KIND.road);
  for (const h of LOTS.plots.filter(q => q.house).map(q => q.house)) {
    const k = p.keyAt(h.x, h.z);
    if (k >= 0) assert.equal(p.kind[k], KIND.house, `hus vid ${h.x.toFixed(1)},${h.z.toFixed(1)}`);
  }
  // Rondellens ö är sista försvarslinjen (0.6.0): öppen mark, utom vid flaggstången.
  const R = gnesta.roundabout;
  assert.ok([[-1.5, 1.5], [1.5, -1.5], [0, -2], [2, 1]].some(([dx, dz]) => p.kind[p.keyAt(R.center[0] + dx, R.center[1] + dz)] === KIND.open), 'ön har öppen mark');
  assert.equal(p.kind[p.keyAt(...R.flag)], KIND.thing);
  // Tillbyggnaden med dörrarna är hus (ingen pjäs inne i entrén).
  const hr = gnesta.iceRink;
  assert.equal(p.kind[p.keyAt(...hr.at(hr.len / 2 + hr.annex.depth / 2, 6))], KIND.house);
  // öppna rutor 2 till 10 m från en gångbar gata (vägkanten, tomter, parkeringen)
  let near = 0;
  for (let k = 0; k < p.n; k++) {
    if (p.kind[k] !== KIND.open) continue;
    const c = p.center(k);
    const gap = Math.min(...ROADS.filter(r => r.walk).map(r => distPolyline(c.x, c.z, r.pts) - r.width / 2));
    if (gap < 10) near++;
  }
  assert.ok(near > 300, `öppna rutor nära gatan ${near}`);
});

test('dagarna öppnar ingångarna i tur och ordning', () => {
  const spawnsOf = d => new Set(d.waves.flatMap(w => w.groups.map(x => x.spawn)));
  const types = d => new Set(d.waves.flatMap(w => w.groups.map(x => x.type)));
  // 0.22.0 (H539, kampanjbågen dag 4 till 6): tre dagar
  assert.equal(gnesta.days.length, 3);
  assert.deepEqual([...spawnsOf(gnesta.days[0])], ['east1']);
  // 0.16.2 (speltestet av 0.16.1): dag 2 en ingång (barrikaderna är dagens begrepp), Norra vägen dag 3
  assert.deepEqual([...spawnsOf(gnesta.days[1])], ['east1']);
  assert.ok(spawnsOf(gnesta.days[2]).has('east2') && !spawnsOf(gnesta.days[2]).has('forest'));
  // dag 1 bara vandrare och löpare: de frivilliga ensamma
  assert.deepEqual([...types(gnesta.days[0])].sort(), ['runner', 'walker']);
  // 0.16.0: en rad per dag, dagens enda begrepp (designen avsnitt 3)
  assert.match(gnesta.days[0].intro.text, /civilians/);
  assert.match(gnesta.days[1].intro.text, /Block a street/);
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

test('inget spökhus står på en gata i spelytan', () => {
  for (const d of gnesta.surroundings.districts) for (const b of d.buildings) {
    const c = Math.cos(b.ry), s = Math.sin(b.ry);
    const pts = [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [b.x + u * b.w / 2 * c + v * b.d / 2 * s, b.z - u * b.w / 2 * s + v * b.d / 2 * c]);
    for (const r of ROADS.filter(r => r.walk)) for (const [x, z] of pts) {
      assert.ok(distPolyline(x, z, r.pts) > r.width / 2 + 0.5, `${d.id} ${b.x.toFixed(0)},${b.z.toFixed(0)} på ${r.id}`);
    }
  }
});
