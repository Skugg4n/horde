// Björnlunda (förhandsvisning): kartan ur OSM via scripts/osm-to-map.mjs. Ingen spellogik; provet säger att den
// genererade modulen hänger ihop: rutnätet, skissernas vägar till basen, husen fria från gatorna och spåret,
// landmärkena på plats, OSM-källan angiven och modulen i takt med konverteraren.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bjornlunda, CRISP, ROADS, RAIL, BUILDINGS, SKETCH, SOURCE } from '../src/data/bjornlunda.js';
import { gridPath, distPolyline } from '../src/data/osm-map.js';
import { MAPS } from '../src/data/maps.js';

test('Björnlunda är bara en förhandsvisning: ingen bana i spelet, inga dagar', () => {
  assert.ok(!Object.values(MAPS).includes(bjornlunda));
  assert.equal(bjornlunda.days, undefined);
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
  for (const f of ['../src/data/bjornlunda.js', '../src/data/osm-map.js', '../src/render/osm-world.js', '../src/render/bjornlunda-kit.js', '../bjornlunda.html', '../scripts/osm-to-map.mjs', '../scripts/osm-places/bjornlunda.mjs'])
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /\u2014/, f);
});
