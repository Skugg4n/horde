// Björnlunda (förhandsvisning): kartan ur OSM via scripts/osm-to-map.mjs. Ingen spellogik; provet säger att den
// genererade modulen hänger ihop: rutnätet, skissernas vägar till basen, husen fria från gatorna och spåret,
// landmärkena på plats, OSM-källan angiven och modulen i takt med konverteraren.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bjornlunda, CRISP, ROADS, RAIL, BUILDINGS, SKETCH, SOURCE } from '../src/data/bjornlunda.js';
import { gridPath, distPolyline } from '../src/data/osm-map.js';
import { MAPS } from '../src/data/maps.js';

// 0.23.0 (H545): Björnlunda är en bana. Banan bygger på den här modulen men är src/data/bjornlunda-play.js
// (tests/bjornlunda-sector.test.js); den genererade modulen är förhandsvisningens och har inga dagar.
test('den genererade modulen är förhandsvisningens: banan är bjornlunda-play.js, med samma vägar och hus', () => {
  assert.ok(!Object.values(MAPS).includes(bjornlunda));
  assert.equal(bjornlunda.days, undefined);
  assert.equal(MAPS.bjornlunda.buildings, BUILDINGS);
  assert.ok(ROADS.every(r => MAPS.bjornlunda.roads.includes(r)));
});

test('källan och licensen står i modulen', () => {
  const src = readFileSync(new URL('../src/data/bjornlunda.js', import.meta.url), 'utf8');
  assert.match(src, /© OpenStreetMap contributors \(ODbL\)/);
  assert.match(SOURCE.license, /OpenStreetMap/);
  assert.equal(SOURCE.scale, 0.5);
});

test('rutnätet täcker spelytan och varje skissad ingång når basen', () => {
  const g = bjornlunda.grid;
  assert.ok(g.w * g.cellSize >= CRISP.x1 - CRISP.x0 && g.h * g.cellSize >= CRISP.z1 - CRISP.z0);
  assert.ok(g.base);
  assert.equal(g.spawns.length, SKETCH.spawns.length);
  for (const s of g.spawns) {
    const p = gridPath(g, s.cell, g.base);
    assert.ok(p && p.length > 20, s.id);
  }
});

test('husen i spelytan står fria från gatorna och spåret', () => {
  for (const h of BUILDINGS.filter(b => !b.far)) {
    const c = Math.cos(h.ry), s = Math.sin(h.ry);
    for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      const x = h.x + lx * h.w / 2 * c + lz * h.d / 2 * s, z = h.z - lx * h.w / 2 * s + lz * h.d / 2 * c;
      for (const rd of ROADS) if (['A', 'B', 'C'].includes(rd.cls)) assert.ok(distPolyline(x, z, rd.pts) > rd.width / 2 + 0.5, `${h.id} på ${rd.id}`);
      assert.ok(distPolyline(x, z, RAIL.pts) > RAIL.half, `${h.id} på spåret`);
    }
  }
});

test('landmärkena finns: ICA, gula huset, Wattrangsborg, sparbanken', () => {
  for (const k of ['ica', 'yellowBlock', 'wattHall', 'wattWing', 'sparbank']) assert.ok(BUILDINGS.some(b => b.kind === k && !b.far), k);
  assert.ok(BUILDINGS.filter(b => b.kind === 'villa' && !b.far).length > 80);
});

test('inga tankstreck i Björnlundas filer', () => {
  for (const f of ['../src/data/bjornlunda.js', '../src/data/osm-map.js', '../src/render/osm-world.js', '../src/render/bjornlunda-kit.js', '../src/render/bjornlunda-world.js', '../src/data/bjornlunda-play.js', '../bjornlunda.html', '../scripts/osm-to-map.mjs', '../scripts/osm-places/bjornlunda.mjs'])
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /\u2014/, f);
});

test('väg 57/223 är mjuk: inga sågtänder (vinkeln mellan två led under 25 grader), en bredd hela vägen', () => {
  const main = ROADS.filter(r => r.cls === 'A');
  assert.ok(main.length >= 1);
  for (const rd of ROADS.filter(r => r.cls === 'A' || r.cls === 'B')) for (let i = 2; i < rd.pts.length; i++) {
    const [a, b, c] = [rd.pts[i - 2], rd.pts[i - 1], rd.pts[i]];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.3) continue;
    let d = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0])); if (d > Math.PI) d = 2 * Math.PI - d;
    assert.ok(d < 25 * Math.PI / 180, `${rd.id} vid ${b}`);
  }
  assert.equal(new Set(main.map(r => r.width)).size, 1);
});

test('östra kanten är landsbygd: inga gångstigar, grusvägarna i två bredder med diken, korsningarna har mynningar', () => {
  const rural = ROADS.filter(r => r.rural);
  assert.ok(rural.length > 3);
  assert.ok(!rural.some(r => r.cls === 'E'));
  for (const r of rural.filter(r => r.surface === 'gravel')) { assert.ok([3, 4.2].includes(r.width), r.id); assert.ok(r.ditch, r.id); }
  assert.ok(bjornlunda.joins.some(j => ROADS.find(r => r.id === j.major)?.cls === 'A'));
});
