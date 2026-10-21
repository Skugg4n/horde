// Västerkärv (förhandsvisning): kartan ur OSM via scripts/osm-to-map.mjs, kompletterad med småvägar och hus som OSM
// saknar. Ingen spellogik; provet säger att den genererade modulen laddar och hänger ihop: ingångarna på småvägarna i
// väster och sydväst, utgångarna österut och norrut, basen vid boningshuset, väg från varje ingång till basen och från
// basen till varje utgång, inget gångbart eller bebyggt i vatten, landmärkena på plats och OSM-källan angiven.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vasterkarv as map, CRISP, ROADS, BUILDINGS, GROUND, SKETCH, SOURCE, VASTERKARV_VERSION } from '../src/data/vasterkarv.js';
import { gridPath, distPolyline, inPoly } from '../src/data/osm-map.js';
import { MAPS } from '../src/data/maps.js';

test('Västerkärv laddar och är bara en förhandsvisning: ingen bana i spelet, inga dagar', () => {
  assert.equal(map.id, 'vasterkarv');
  assert.match(VASTERKARV_VERSION, /^\d+\.\d+\.\d+$/);
  assert.ok(!Object.values(MAPS).includes(map));
  assert.equal(map.days, undefined);
});

test('källan och licensen står i modulen och på sidan', () => {
  const src = readFileSync(new URL('../src/data/vasterkarv.js', import.meta.url), 'utf8');
  assert.match(src, /© OpenStreetMap contributors \(ODbL\)/);
  assert.match(SOURCE.license, /OpenStreetMap/);
  assert.match(readFileSync(new URL('../vasterkarv.html', import.meta.url), 'utf8'), /© OpenStreetMap contributors \(ODbL\)/);
});

test('ingångarna ligger på småvägarna i väster och sydväst, utgångarna österut och norrut, basen vid boningshuset', () => {
  assert.deepEqual(SKETCH.spawns.map(s => s.id), ['w', 'sw', 's']);
  assert.deepEqual(SKETCH.exits.map(s => s.id), ['e', 'n']);
  for (const id of ['w', 'sw']) assert.ok(SKETCH.spawns.find(s => s.id === id).at[0] < CRISP.x0 + 40, `${id} i västra kanten`);
  assert.ok(SKETCH.spawns.find(s => s.id === 's').at[1] > CRISP.z1 - 40, 'södra ingången i södra kanten (z mot söder)');
  const e = SKETCH.exits.find(s => s.id === 'e'), n = SKETCH.exits.find(s => s.id === 'n');
  assert.ok(e.at[0] > 100, 'östra utgången i östra kanten');
  assert.ok(n.at[1] < CRISP.z0 + 40, 'norra utgången i norra kanten');
  for (const s of SKETCH.spawns) assert.ok(ROADS.some(r => r.id === s.road && /Skogsvägen|Traktorspåret|Södra skogsvägen/.test(r.name)), `${s.id} står på en småväg`);
  const home = BUILDINGS.find(b => b.name === 'Boningshuset');
  assert.ok(home && home.kind === 'gard', 'boningshuset är ett landmärke');
  assert.ok(Math.hypot(SKETCH.base.at[0] - home.x, SKETCH.base.at[1] - home.z) < 6, 'basen vid boningshuset');
});

test('varje ingång når basen och basen når varje utgång genom rutnätet', () => {
  const g = map.grid;
  assert.ok(g.w * g.cellSize >= CRISP.x1 - CRISP.x0 && g.h * g.cellSize >= CRISP.z1 - CRISP.z0);
  assert.ok(g.base);
  assert.equal(g.spawns.length, 3);
  assert.equal(g.exits.length, 2);
  for (const s of g.spawns) { const p = gridPath(g, s.cell, g.base); assert.ok(p && p.length > 40, s.id); }
  for (const e of g.exits) { const p = gridPath(g, g.base, e.cell); assert.ok(p && p.length > 40, e.id); }
});

test('inget gångbart och inget hus i vatten (kartan har inget vatten)', () => {
  const g = map.grid;
  assert.equal(GROUND.water.length, 0);
  for (const lake of GROUND.water) {
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
      const [x, z] = g.center(i, j);
      if (inPoly(x, z, lake) && g.walk[j * g.w + i]) assert.fail(`gångbar ruta i vatten vid ${x},${z}`);
    }
    for (const h of BUILDINGS.filter(b => !b.far)) assert.ok(!inPoly(h.x, h.z, lake), `${h.id} i vatten`);
  }
});

test('husen i spelytan står fria från vägarna', () => {
  for (const h of BUILDINGS.filter(b => !b.far)) {
    const c = Math.cos(h.ry), s = Math.sin(h.ry);
    for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      const x = h.x + lx * h.w / 2 * c + lz * h.d / 2 * s, z = h.z - lx * h.w / 2 * s + lz * h.d / 2 * c;
      for (const rd of ROADS) if (['A', 'B', 'C'].includes(rd.cls)) assert.ok(distPolyline(x, z, rd.pts) > rd.width / 2 + 0.5, `${h.id} på ${rd.id}`);
    }
  }
});

test('gården, grannens gård, småvägarna, stengärdsgårdarna och namnen finns', () => {
  const near = BUILDINGS.filter(b => !b.far);
  for (const k of ['gard', 'ladan', 'uthus', 'ladugard', 'maskinhall']) assert.ok(near.some(b => b.kind === k), k);
  assert.ok(near.filter(b => b.added).length >= 2, 'tillagda hus');
  for (const n of ['Skogsvägen', 'Traktorspåret', 'Gårdsstigen', 'Grusvägen', 'Östra grusvägen']) assert.ok(ROADS.some(r => r.name === n), n);
  for (const k of ['stoneWall', 'tractor', 'dieselTank', 'balePile', 'fieldGate', 'cairn']) assert.ok(map.props.some(p => p.kind === k), k);
  assert.ok(map.props.filter(p => p.kind === 'stoneWall').length >= 8, 'stengärdsgårdar');
  for (const t of ['Grusvägens båge', 'Gårdsplanen', 'Åkern i sydväst', 'Grannens gård', 'Ridbanan']) assert.ok(map.labels.some(l => l.text === t), t);
  assert.ok(GROUND.field.length > 3 && GROUND.forest.length > 3, 'åkrar och skog');
});

test('gården är anonym och filerna har inga tankstreck', () => {
  for (const f of ['../src/data/vasterkarv.js', '../src/render/vasterkarv-kit.js', '../vasterkarv.html', '../scripts/osm-places/vasterkarv.mjs']) {
    const t = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.doesNotMatch(t, /—/, f);
    assert.doesNotMatch(t, new RegExp('Fru' + 'ängen'), `${f} nämner platsnamnet som pekar ut gården`);
  }
});
