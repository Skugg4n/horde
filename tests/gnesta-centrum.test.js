// Gnesta centrum (förhandsvisning): en stor karta i fyra delar ur OSM via scripts/osm-to-map.mjs. Ingen spellogik;
// provet säger att modulen hänger ihop: delarna, landmärkena i rätt del, rutnätet och skissernas vägar, husen fria
// från gatorna och spåret, mjuka huvudvägar och OSM-källan angiven.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gnestaCentrum, CRISP, ROADS, RAIL, BUILDINGS, SKETCH, SOURCE, PARTS, PROPS } from '../src/data/gnesta-centrum.js';
import { gridPath, distPolyline } from '../src/data/osm-map.js';
import { MAPS } from '../src/data/maps.js';

test('Gnesta centrum är bara en förhandsvisning: ingen bana i spelet, inga dagar', () => {
  assert.ok(!Object.values(MAPS).includes(gnestaCentrum));
  assert.equal(gnestaCentrum.days, undefined);
});

test('källan och licensen står i modulen', () => {
  const src = readFileSync(new URL('../src/data/gnesta-centrum.js', import.meta.url), 'utf8');
  assert.match(src, /© OpenStreetMap contributors \(ODbL\)/);
  assert.match(SOURCE.license, /OpenStreetMap/);
  assert.equal(SOURCE.scale, 0.5);
  assert.match(readFileSync(new URL('../gnesta-centrum.html', import.meta.url), 'utf8'), /Map data © OpenStreetMap contributors \(ODbL\)/);
});

test('fyra delar med tangent 1-4, inom spelytan, kamerahemmet i delen', () => {
  assert.deepEqual(PARTS.map(p => p.key), ['1', '2', '3', '4']);
  for (const p of PARTS) {
    const B = p.bounds;
    assert.ok(B.x0 >= CRISP.x0 - 1 && B.x1 <= CRISP.x1 + 1 && B.z0 >= CRISP.z0 - 1 && B.z1 <= CRISP.z1 + 1, p.id);
    assert.ok(p.home[0] > B.x0 && p.home[0] < B.x1 && p.home[1] > B.z0 && p.home[1] < B.z1, p.id);
  }
});

test('landmärkena står i sina delar', () => {
  const part = id => PARTS.find(p => p.id === id).bounds;
  const inside = (b, B) => b.x > B.x0 && b.x < B.x1 && b.z > B.z0 && b.z < B.z1;
  const want = { a: ['fireStation', 'elektron', 'kommunhus'], b: ['gnestaStation', 'tingshus'], c: ['school', 'waterTower', 'gymHall'], d: ['brewery', 'holmenApt'] };
  for (const [id, kinds] of Object.entries(want)) for (const k of kinds) assert.ok(BUILDINGS.some(b => b.kind === k && inside(b, part(id))), `${k} i ${id}`);
  assert.ok(BUILDINGS.some(b => b.kind === 'stenstad' && b.tower), 'tornhuset vid Stora torget');
  assert.equal(PROPS.filter(p => p.kind === 'pier').length, 4);
  assert.ok(BUILDINGS.filter(b => b.shop && !b.far).length >= 10, 'butiker i bottenvåningen längs Storgatan');
  assert.ok(BUILDINGS.filter(b => b.kind === 'villa' && !b.far).length > 120);
});

test('rutnätet täcker spelytan och varje skissad ingång når basen', () => {
  const g = gnestaCentrum.grid;
  assert.ok(g.w * g.cellSize >= CRISP.x1 - CRISP.x0 && g.h * g.cellSize >= CRISP.z1 - CRISP.z0);
  assert.ok(g.base);
  assert.equal(g.spawns.length, SKETCH.spawns.length);
  for (const s of g.spawns) assert.ok(gridPath(g, s.cell, g.base)?.length > 20, s.id);
  assert.equal(SKETCH.defence.filter(d => d.kind === 'point').map(d => d.name).join(''), 'ABCD');
});

test('husen i spelytan står fria från gatorna och spåret', () => {
  for (const h of BUILDINGS.filter(b => !b.far && !['waterTower'].includes(b.kind))) {
    const c = Math.cos(h.ry), s = Math.sin(h.ry);
    for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      const x = h.x + lx * h.w / 2 * c + lz * h.d / 2 * s, z = h.z - lx * h.w / 2 * s + lz * h.d / 2 * c;
      for (const rd of ROADS) if (['A', 'B', 'C'].includes(rd.cls)) assert.ok(distPolyline(x, z, rd.pts) > rd.width / 2 + 0.3, `${h.id} på ${rd.id}`);
      assert.ok(distPolyline(x, z, RAIL.pts) > RAIL.half, `${h.id} på spåret`);
    }
  }
});

test('huvudvägarna är mjuka: inga sågtänder (vinkeln mellan två led under 25 grader)', () => {
  for (const rd of ROADS.filter(r => r.cls === 'A' || r.cls === 'B')) {
    for (let i = 2; i < rd.pts.length; i++) {
      const [a, b, c] = [rd.pts[i - 2], rd.pts[i - 1], rd.pts[i]];
      const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      let d = Math.abs(t2 - t1); if (d > Math.PI) d = 2 * Math.PI - d;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.3) continue;
      assert.ok(d < 25 * Math.PI / 180, `${rd.id} vid ${b}: ${(d * 180 / Math.PI).toFixed(0)} grader`);
    }
  }
});

test('inga tankstreck i Gnesta centrums filer', () => {
  for (const f of ['../src/data/gnesta-centrum.js', '../src/render/gnesta-centrum-kit.js', '../gnesta-centrum.html', '../scripts/osm-places/gnesta-centrum.mjs', '../src/render/osm-world.js', '../scripts/osm-to-map.mjs'])
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /\u2014/, f);
});
