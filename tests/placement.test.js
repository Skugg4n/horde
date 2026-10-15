import test from 'node:test';
import assert from 'node:assert/strict';
import { gridFromAscii } from '../src/sim/grid.js';
import { buildPlace, placementFor, lineOfSight, sightFrom, KIND, MIN_SPACING } from '../src/sim/placement.js';
import { createSim, startWave, step, build, checkSpot, spotAt, sell, upgrade } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { gnesta } from '../src/data/gnesta.js';

// En rak gata (rad 0) från a i öster till basen B i väster. Ett hus (H) står mellan pjäsens
// plats (P, rad 3) och gatans östra del.
const ROWS = [
  'B.........a',
  '......HHHH.',
  '......HHHH.',
  '.....P.....',
  '...........',
];
function testMap() {
  // horden går bara på rad 0
  const grid = gridFromAscii(ROWS.map((r, j) => (j === 0 ? r : '#'.repeat(r.length))));
  const place = buildPlace({
    w: grid.w, h: grid.h, cellSize: 2, origin: [0, 0],
    classify(x, z) { const i = Math.floor(x / 2), j = Math.floor(z / 2); return j === 0 ? KIND.road : ROWS[j][i] === 'H' ? KIND.house : KIND.open; },
  });
  return { id: 'sikt', grid, place, baseHp: 20, days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0 }] }] }] };
}
const key = (map, i, j) => j * map.grid.w + i;

test('huset skymmer sikten, det låga gör det inte', () => {
  const map = testMap(), p = placementFor(map);
  const P = key(map, 5, 3);
  assert.equal(lineOfSight(p, P, key(map, 2, 0)), true, 'västerut: fri sikt');
  assert.equal(lineOfSight(p, P, key(map, 8, 0)), false, 'bakom huset');
  assert.equal(lineOfSight(p, P, key(map, 5, 0)), true, 'rakt fram');
  const { keys, mask } = sightFrom(p, P, 30);
  assert.ok(keys.includes(key(map, 1, 0)) && !keys.includes(key(map, 9, 0)));
  assert.equal(mask[key(map, 9, 0)], 0);
  // sikten är symmetrisk
  for (let i = 0; i < 11; i++) assert.equal(lineOfSight(p, P, key(map, i, 0)), lineOfSight(p, key(map, i, 0), P), `ruta ${i}`);
});

test('siktet tar bara zombier i rutor det ser, och sikten räknas en gång när pjäsen ställs ut', () => {
  const map = testMap();
  const sim = createSim({ map, day: 1, cash: 1000, seed: 1 });
  const r = build(sim, key(map, 5, 3), 'm249');
  assert.equal(r.ok, true);
  const gun = sim.guns[0];
  const sight = gun.sight;
  startWave(sim); step(sim, 1 / 30);
  const z = sim.zombies[0];
  // bakom huset (inom räckhåll): skjuter inte
  Object.assign(z, { x: 17, z: 1, cell: key(map, 8, 0), aimX: null });
  step(sim, 1 / 30);
  assert.equal(gun.weapon.targetId, null, 'zombien bakom huset syns inte');
  assert.ok(Math.hypot(17 - gun.x, 1 - gun.z) <= 16);
  // ut i synlig ruta: skjuter
  Object.assign(z, { x: 7, z: 1, cell: key(map, 3, 0), aimX: null });
  step(sim, 1 / 30);
  assert.equal(gun.weapon.targetId, z.id);
  assert.equal(gun.sight, sight, 'samma sikt, inte omräknad');
  assert.equal(upgrade(sim, gun.id).ok, true);
  assert.equal(gun.sight, sight, 'uppgradering räknar inte om sikten (den gäller största räckvidden)');
});

test('platsen: gata, hus, för nära, fullt; fyra pjäser och avstånd', () => {
  const map = testMap();
  const sim = createSim({ map, day: 1, cash: 9000, seed: 1 });
  assert.equal(checkSpot(sim, key(map, 3, 0)).reason, 'gata');
  assert.equal(checkSpot(sim, key(map, 7, 1)).reason, 'hus');
  assert.equal(checkSpot(sim, -1).reason, 'utanför');
  assert.equal(build(sim, key(map, 0, 3), 'm249').ok, true);
  assert.equal(checkSpot(sim, key(map, 2, 3)).reason, 'nära', '4 m bort');
  assert.ok(MIN_SPACING > 4 && MIN_SPACING <= 6);
  assert.equal(checkSpot(sim, key(map, 3, 3)).ok, true, '6 m bort');
  for (const i of [3, 6, 9]) assert.equal(build(sim, key(map, i, 3), 'm249').ok, true, `ruta ${i}`);
  assert.equal(checkSpot(sim, key(map, 0, 4 + 0)).reason, 'fullt');
  assert.equal(sell(sim, sim.guns[1].id).ok, true);
  assert.equal(checkSpot(sim, key(map, 3, 3)).ok, true, 'såld plats blir ledig');
});

test('E4: vägen är gata, och bredvid vägen går det att ställa en pjäs', () => {
  const map = MAPS.riksvagen, p = placementFor(map);
  const sim = createSim({ map, day: 1, cash: 500, seed: 1 });
  assert.equal(checkSpot(sim, spotAt(sim, 5, 1)).reason, 'gata');
  assert.equal(checkSpot(sim, spotAt(sim, 5, 6)).ok, true);
  assert.equal(checkSpot(sim, spotAt(sim, -26, -15)).reason, 'hus', 'ruinen');
  assert.equal(checkSpot(sim, spotAt(sim, 12, 7.5)).reason, 'hinder', 'bilen');
  // vägen mellan spawn och bas är gångbar, asfalten bakom basen inte
  assert.equal(p.walk[p.keyAt(0, 1)], 1);
  assert.equal(p.walk[p.keyAt(-30, 1)], 0);
  // ingen byggnad står mellan vägkanten och vägen: en pjäs bredvid vägen ser hela sin räckvidd av den
  const g = build(sim, spotAt(sim, 5, 6), 'm249');
  assert.equal(g.ok, true);
  const seen = sim.guns[0].sight.keys.length;
  assert.ok(seen >= 40, `ser ${seen} vägrutor`);
});

test('Gnesta: ett hus mellan pjäsen och gatan skymmer, gatan rakt fram syns', () => {
  const p = placementFor(gnesta);
  // en pjäs mitt i ett kvarter ser mindre av gatorna än en på gatukanten
  const counts = [];
  for (let k = 0; k < p.n; k++) if (p.kind[k] === KIND.open) counts.push(sightFrom(p, k, 22).keys.length);
  counts.sort((a, b) => a - b);
  assert.ok(counts[0] < counts[counts.length - 1] / 3, `minst ${counts[0]}, mest ${counts[counts.length - 1]}`);
  // och det finns pjäsplatser vars sikt skyms: inom räckhåll men inte synlig
  let hidden = 0;
  for (let k = 0; k < p.n && !hidden; k++) {
    if (p.kind[k] !== KIND.open) continue;
    const c = p.center(k);
    const all = p.walkKeys.filter(t => { const q = p.center(t); return Math.hypot(q.x - c.x, q.z - c.z) <= 22; });
    hidden = all.length - sightFrom(p, k, 22).keys.filter(t => all.includes(t)).length;
  }
  assert.ok(hidden > 0);
});
