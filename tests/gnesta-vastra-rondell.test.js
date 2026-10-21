// Gnesta västra rondell (förhandsvisning): kartan ur OSM via scripts/osm-to-map.mjs, kompletterad med hus som OSM
// saknar. Ingen spellogik; provet säger att den genererade modulen laddar och hänger ihop: ingångarna i väster,
// utgångarna österut, basen öster om rondellen, väg från varje ingång till basen och från basen till varje utgång,
// inget gångbart eller bebyggt i vatten, landmärkena på plats och OSM-källan angiven.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vastraRondell as map, CRISP, ROADS, BUILDINGS, GROUND, SKETCH, SOURCE, VASTRA_RONDELL_VERSION } from '../src/data/gnesta-vastra-rondell.js';
import { gridPath, distPolyline, inPoly } from '../src/data/osm-map.js';
import { MAPS } from '../src/data/maps.js';

test('Västra rondellen laddar och är bara en förhandsvisning: ingen bana i spelet, inga dagar', () => {
  assert.equal(map.id, 'gnesta-vastra-rondell');
  assert.match(VASTRA_RONDELL_VERSION, /^\d+\.\d+\.\d+$/);
  assert.ok(!Object.values(MAPS).includes(map));
  assert.equal(map.days, undefined);
});

test('källan och licensen står i modulen och på sidan', () => {
  const src = readFileSync(new URL('../src/data/gnesta-vastra-rondell.js', import.meta.url), 'utf8');
  assert.match(src, /© OpenStreetMap contributors \(ODbL\)/);
  assert.match(SOURCE.license, /OpenStreetMap/);
  assert.match(readFileSync(new URL('../gnesta-vastra-rondell.html', import.meta.url), 'utf8'), /© OpenStreetMap contributors \(ODbL\)/);
});

test('ingångarna ligger i väster, utgångarna österut, basen öster om rondellen vid ett hus', () => {
  assert.deepEqual(SKETCH.spawns.map(s => s.id), ['w57', 'd830']);
  assert.deepEqual(SKETCH.exits.map(s => s.id), ['ne', 'se', 'kv']);
  for (const s of SKETCH.spawns) assert.ok(s.at[0] < CRISP.x0, `${s.id} väster om spelytan`);
  for (const e of SKETCH.exits) assert.ok(e.at[0] > 0, `${e.id} i östra halvan`);
  const island = map.props.find(p => p.kind === 'rondellIsland');
  assert.ok(island);
  assert.ok(SKETCH.base.at[0] > island.at[0] + 20, 'basen öster om rondellen');
  assert.ok(Math.hypot(SKETCH.base.at[0] - island.at[0], SKETCH.base.at[1] - island.at[1]) < 80, 'basen nära rondellen');
  const near = BUILDINGS.filter(b => !b.far && Math.hypot(b.x - SKETCH.base.at[0], b.z - SKETCH.base.at[1]) < 8);
  assert.ok(near.length >= 1, 'ett hus vid basen');
});

test('varje ingång når basen och basen når varje utgång genom rutnätet', () => {
  const g = map.grid;
  assert.ok(g.w * g.cellSize >= CRISP.x1 - CRISP.x0 && g.h * g.cellSize >= CRISP.z1 - CRISP.z0);
  assert.ok(g.base);
  assert.equal(g.spawns.length, 2);
  assert.equal(g.exits.length, 3);
  for (const s of g.spawns) { const p = gridPath(g, s.cell, g.base); assert.ok(p && p.length > 60, s.id); }
  for (const e of g.exits) { const p = gridPath(g, g.base, e.cell); assert.ok(p && p.length > 60, e.id); }
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

test('husen i spelytan står fria från de större vägarna', () => {
  for (const h of BUILDINGS.filter(b => !b.far)) {
    const c = Math.cos(h.ry), s = Math.sin(h.ry);
    for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      const x = h.x + lx * h.w / 2 * c + lz * h.d / 2 * s, z = h.z - lx * h.w / 2 * s + lz * h.d / 2 * c;
      for (const rd of ROADS) if (['A', 'B', 'C'].includes(rd.cls)) assert.ok(distPolyline(x, z, rd.pts) > rd.width / 2 + 0.5, `${h.id} på ${rd.id}`);
    }
  }
});

test('villaraden, rondellen och landmärkena finns', () => {
  const added = BUILDINGS.filter(b => b.added && !b.far);
  assert.ok(added.length >= 12, `${added.length} tillagda`);
  assert.ok(BUILDINGS.filter(b => !b.far).length > 55);
  // villaraden väster om rondellen finns bara tack vare de tillagda husen (OSM har inga väster om x = -100 i planen)
  assert.ok(added.filter(b => b.x < -60).length >= 8, 'villaraden längs gamla landsvägen');
  assert.ok(ROADS.some(r => r.name === 'Gamla landsvägen'));
  assert.ok(ROADS.some(r => r.name === 'Västra Storgatan'));
  for (const k of ['rondellIsland', 'vackerby', 'crane']) assert.ok(map.props.some(p => p.kind === k), k);
  for (const t of ['Rondellen', 'Villaraden', 'Åkern', 'Granskogen', 'Radhusen', 'Byggarbetsplatsen', 'Vackerby']) assert.ok(map.labels.some(l => l.text === t), t);
  for (const n of ['Barrstigen', 'Furulundsvägen', 'Västra Storgatan']) assert.ok(map.labels.some(l => l.text === n), n);
});

test('inga tankstreck i Västra rondellens filer', () => {
  for (const f of ['../src/data/gnesta-vastra-rondell.js', '../src/render/gnesta-vastra-rondell-kit.js', '../gnesta-vastra-rondell.html', '../scripts/osm-places/gnesta-vastra-rondell.mjs'])
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /—/, f);
});
