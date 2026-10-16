import test from 'node:test';
import assert from 'node:assert/strict';
import { gridFromAscii } from '../src/sim/grid.js';
import { buildPlace, KIND } from '../src/sim/placement.js';
import { createSim, checkSpot, build, upgrade, squadPreview, squadRoom } from '../src/sim/sim.js';
import { WEAPONS } from '../src/data/weapons.js';
import { upgradeCost } from '../src/sim/stats.js';

// 0.10.1 (granskningen av 0.10, Must fix 1): gruppen blir aldrig mindre än spelaren betalar för.
// Provbana: gatan är rad 0, en smal gräsremsa mellan husen i rad 1 (n rutor bred), resten hus.
function stripMap(n) {
  const rows = ['B' + '.'.repeat(24) + 'a', 'H'.repeat(8) + '.'.repeat(n) + 'H'.repeat(18 - n), 'H'.repeat(26)];
  const grid = gridFromAscii(rows.map((r, j) => (j === 0 ? r : '#'.repeat(r.length))));
  const place = buildPlace({
    w: grid.w, h: grid.h, cellSize: 2, origin: [0, 0],
    classify(x, z) { const i = Math.floor(x / 2), j = Math.floor(z / 2); return j === 0 ? KIND.road : rows[j][i] === 'H' ? KIND.house : KIND.open; },
  });
  const map = { id: 'remsa', grid, place, baseHp: 99, days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0 }] }] }] };
  return { map, key: grid.w + 8 + Math.floor(n / 2) };
}

test('Bigger squad II: en ring där bara fem får plats nekas, ingen betalar för en sjätte man', () => {
  const { map, key } = stripMap(9);
  const sim = createSim({ map, day: 1, cash: 9999, research: ['hvSquad.1', 'hvSquad.2'] });
  assert.equal(squadPreview(sim, key).length, 5);
  assert.deepEqual(checkSpot(sim, key, 'hv'), { ok: false, reason: 'trångt' });
  assert.equal(build(sim, key, 'hv').ok, false);
  assert.equal(sim.cash, 9999, 'inget dras');
  // utan forskningen är fyra man gruppen, och fem platser räcker
  const plain = createSim({ map, day: 1, cash: 9999 });
  assert.equal(build(plain, key, 'hv').ok, true);
  assert.equal(plain.guns[0].soldiers.length, 4);
});

test('uppgraderingen som ger en man till nekas när han inte får plats, och kostar ingenting', () => {
  const { map, key } = stripMap(8);
  const sim = createSim({ map, day: 1, cash: 9999 });
  const r = build(sim, key, 'hv');
  assert.equal(r.ok, true);
  const g = sim.guns[0];
  assert.equal(g.soldiers.length, 4);
  assert.deepEqual(squadRoom(sim, r.id), { want: 1, fit: 0, plan: [] });
  const cash = sim.cash;
  assert.deepEqual(upgrade(sim, r.id), { ok: false, reason: 'trångt-man' });
  assert.equal(sim.cash, cash, 'inget dras');
  assert.equal(g.weapon.level, 1);
  assert.equal(g.soldiers.length, 4);
});

test('med rum ger uppgraderingen mannen den betalar för', () => {
  const { map, key } = stripMap(12);
  const sim = createSim({ map, day: 1, cash: 9999 });
  const r = build(sim, key, 'hv');
  assert.equal(r.ok, true);
  assert.equal(squadRoom(sim, r.id).fit, 1);
  const cash = sim.cash, cost = upgradeCost('hv', 1);
  assert.equal(upgrade(sim, r.id).ok, true);
  assert.equal(sim.cash, cash - cost);
  assert.equal(sim.guns[0].soldiers.length, 5);
  assert.equal(sim.guns[0].weapon.spent, WEAPONS.hv.cost + cost);
});
