// Laxne (förhandsvisning): kartan ur OSM via scripts/osm-to-map.mjs, kompletterad med hus som OSM saknar. Ingen
// spellogik; provet säger att den genererade modulen laddar och hänger ihop: rutnätet, vägar från varje ingång i norr
// till basen vid skolan och från basen ut genom båda utgångarna söderut, sjön som stängd flank, landmärkena på plats
// och OSM-källan angiven.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { laxne, CRISP, ROADS, BUILDINGS, GROUND, SKETCH, SOURCE, LAXNE_VERSION } from '../src/data/laxne.js';
import { gridPath, distPolyline, inPoly } from '../src/data/osm-map.js';
import { MAPS } from '../src/data/maps.js';

test('Laxne laddar och är bara en förhandsvisning: ingen bana i spelet, inga dagar', () => {
  assert.equal(laxne.id, 'laxne');
  assert.match(LAXNE_VERSION, /^\d+\.\d+\.\d+$/);
  assert.ok(!Object.values(MAPS).includes(laxne));
  assert.equal(laxne.days, undefined);
});

test('källan och licensen står i modulen och på sidan', () => {
  const src = readFileSync(new URL('../src/data/laxne.js', import.meta.url), 'utf8');
  assert.match(src, /© OpenStreetMap contributors \(ODbL\)/);
  assert.match(SOURCE.license, /OpenStreetMap/);
  assert.match(readFileSync(new URL('../laxne.html', import.meta.url), 'utf8'), /© OpenStreetMap contributors \(ODbL\)/);
});

test('ingångarna ligger i norr, utgångarna i söder, basen vid skolan', () => {
  assert.deepEqual(SKETCH.spawns.map(s => s.id), ['n', 'nw']);
  assert.deepEqual(SKETCH.exits.map(s => s.id), ['s', 'se']);
  for (const s of SKETCH.spawns) assert.ok(s.at[1] < CRISP.z0, `${s.id} norr om spelytan`);
  for (const e of SKETCH.exits) assert.ok(e.at[1] > 0, `${e.id} i södra halvan`);
  const school = BUILDINGS.find(b => b.kind === 'laxneSchool');
  assert.ok(Math.hypot(school.x - SKETCH.base.at[0], school.z - SKETCH.base.at[1]) < 40);
});

test('varje ingång når basen och basen når båda utgångarna genom rutnätet', () => {
  const g = laxne.grid;
  assert.ok(g.w * g.cellSize >= CRISP.x1 - CRISP.x0 && g.h * g.cellSize >= CRISP.z1 - CRISP.z0);
  assert.ok(g.base);
  assert.equal(g.spawns.length, 2);
  assert.equal(g.exits.length, 2);
  for (const s of g.spawns) { const p = gridPath(g, s.cell, g.base); assert.ok(p && p.length > 100, s.id); }
  for (const e of g.exits) { const p = gridPath(g, g.base, e.cell); assert.ok(p && p.length > 20, e.id); }
});

test('sjön Klämmingen är en stängd flank: ingen gångbar ruta och inget hus i vattnet', () => {
  assert.equal(GROUND.water.length, 1);
  const lake = GROUND.water[0], g = laxne.grid;
  let wet = 0;
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    const [x, z] = g.center(i, j);
    if (!inPoly(x, z, lake)) continue;
    wet++;
    if (g.walk[j * g.w + i]) { const near = Math.min(...ROADS.map(r => distPolyline(x, z, r.pts))); assert.ok(near < 4, `gångbar ruta i sjön vid ${x},${z}`); }
  }
  assert.ok(wet > 2000, 'sjön tar en stor del av spelytan');
  for (const h of BUILDINGS.filter(b => !b.far)) assert.ok(!inPoly(h.x, h.z, lake), `${h.id} i sjön`);
});

test('husen i spelytan står fria från de större vägarna', () => {
  for (const h of BUILDINGS.filter(b => !b.far)) {
    const c = Math.cos(h.ry), s = Math.sin(h.ry);
    for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      const x = h.x + lx * h.w / 2 * c + lz * h.d / 2 * s, z = h.z - lx * h.w / 2 * s + lz * h.d / 2 * c;
      for (const rd of ROADS) if (['A', 'B', 'C'].includes(rd.cls)) assert.ok(distPolyline(x, z, rd.pts) > rd.width / 2 + 0.5, `${h.id} på ${rd.id}`);
    }
  }
});

test('landmärkena och de tillagda husen finns', () => {
  for (const k of ['laxneSchool', 'laxnegarden', 'fjaderfabriken']) assert.ok(BUILDINGS.some(b => b.kind === k && !b.far), k);
  const added = BUILDINGS.filter(b => b.added && !b.far);
  assert.ok(added.length >= 30, `${added.length} tillagda`);
  assert.ok(BUILDINGS.filter(b => !b.far).length > 100);
  assert.ok(GROUND.beach.length >= 1, 'badstranden');
  assert.ok(ROADS.some(r => r.name === 'Skottvångsvägen'));
  for (const t of ['Laxne skola', 'Laxnegården', 'Laxne Bollplan', 'Badplatsen', 'Fjäderfabriken', 'Klämmingen']) assert.ok(laxne.labels.some(l => l.text === t), t);
});

test('inga tankstreck i Laxnes filer', () => {
  for (const f of ['../src/data/laxne.js', '../src/render/laxne-kit.js', '../laxne.html', '../scripts/osm-places/laxne.mjs'])
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /\u2014/, f);
});
