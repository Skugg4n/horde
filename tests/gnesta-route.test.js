import test from 'node:test';
import assert from 'node:assert/strict';
import { gnestaSmoke } from '../scripts/balance.mjs';
import { gnesta } from '../src/data/gnesta.js';
import { gridRoute } from '../src/sim/route.js';

test('Gnesta: zombier från varje spawn når basen på tom karta, alltid på gatan', () => {
  const r = gnestaSmoke({ check: true });
  assert.equal(r.offRoad, 0, 'någon zombie stod på en stängd ruta');
  for (const s of gnesta.spawns) {
    const t = r.arrivals[s.id];
    assert.equal(t.count, 3, `${s.id}: alla tre kom fram`);
    // Vandrarna går 1,6 m/s. Vägen ska vara längre än fågelvägen men inte orimligt mycket.
    assert.ok(t.first > 20 && t.first < 180, `${s.id}: första framme efter ${t.first.toFixed(0)} s`);
  }
});

test('Gnesta: flödesfältet når varje spawn och varje gångbar ruta', () => {
  const r = gridRoute(gnesta), g = r.grid;
  for (const s of g.spawns) assert.ok(Number.isFinite(r.flow.dist[s.key]), s.id);
  for (let k = 0; k < g.n; k++) if (g.walkable(k) && !r.flow.isBase(k)) assert.ok(r.flow.next[k] >= 0, `ruta ${k}`);
});
