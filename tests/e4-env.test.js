// 0.16.3 (H230 till H232): omgivningen runt E4, skyltarna i vägrenen och portalen. Det som syns får inte
// ändra placeringen: placeringens rutor jämförs med ett fingeravtryck från 0.16.2.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { ROADS, road, SIGNS, GANTRIES, FAR, SURROUNDINGS, signWidth } from '../src/data/e4-lastringe.js';
import { distPolyline, inPoly } from '../src/data/gnesta.js';
import { KIND, placementFor } from '../src/sim/placement.js';

const lay = road('layby');
const gap = (x, z) => Math.min(...ROADS.map(r => distPolyline(x, z, r.pts) - r.width / 2), inPoly(x, z, lay.pts) ? -1 : 99);

test('H231: varje skylt står i vägrenen, stolparna minst 1,3 m och panelen 0,7 m från körbanan', () => {
  for (const s of SIGNS) {
    const wd = signWidth(s), ux = Math.cos(s.ry), uz = -Math.sin(s.ry);
    const posts = s.kind === 'speed' ? [0] : [-0.32, 0.32];
    for (const t of posts) assert.ok(gap(s.x + ux * wd * t, s.z + uz * wd * t) >= 1.3, `${s.lines[0]}: stolpen på körbanan`);
    for (const t of [-0.5, 0.5]) assert.ok(gap(s.x + ux * wd * t, s.z + uz * wd * t) >= 0.7, `${s.lines[0]}: panelen över körbanan`);
  }
});

test('H231: avfartsskylten hänger på portalen, benen står utanför körbanorna', () => {
  const texts = SIGNS.map(s => s.lines.join(' '));
  assert.ok(!texts.some(t => t.includes('137')), 'avfartsskylten står inte längre på marken');
  assert.equal(GANTRIES.length, 1);
  const gt = GANTRIES[0];
  assert.ok(gt.panels.every(p => p.lines.join(' ') === '137 S LÄSTRINGE GNESTA'), 'texten är kvar');
  for (const off of gt.legs) {
    const x = gt.x + gt.across[0] * off, z = gt.z + gt.across[1] * off;
    assert.ok(gap(x, z) >= 1, `benet vid ${off} m står på körbanan`);
  }
});

// 0.16.4 (H234): skyltarnas fotavtryck följer skyltarna (förut frysta där de stod i 0.16.2). Placeringens nya
// fingeravtryck, avsiktligt; balansen räknas om (docs/balance-log.md 0.16.4).
test('H234: placeringens fingeravtryck med skyltarnas fotavtryck där de står nu', () => {
  const p = MAPS.riksvagen.place, g = MAPS.riksvagen.grid;
  let h = 2166136261;
  for (const arr of [p.kind, p.ditch, p.hedge, g.walk]) for (const v of arr) { h ^= v; h = Math.imul(h, 16777619) >>> 0; }
  assert.equal(h, 3790515640);
});

test('H234: de gamla osynliga fotavtrycken blockerar inte längre, de nya står där skyltarna står', () => {
  const p = placementFor(MAPS.riksvagen);
  const cellAt = (x, z) => { let best = -1, bd = Infinity; for (let k = 0; k < p.n; k++) { const c = p.center(k), d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = k; } } return best; };
  // 0.16.2:s fotavtryck: väg 800:s asfalt före korsningen (den gröna skylten) och vid korsningen (de blå)
  for (const [x, z] of [[-3, -17], [-3, -15], [3, -25], [11, -25], [19, -19]]) {
    assert.notEqual(p.kind[cellAt(x, z)], KIND.thing, `0.16.2:s skylt vid ${x}, ${z} blockerar fortfarande`);
  }
  for (const s of SIGNS) assert.equal(p.kind[cellAt(s.x, s.z)], KIND.thing, `${s.lines[0]} saknar fotavtryck`);
});

test('H230: omgivningen ligger utanför spelytan, gårdarna och husen står inte på vägarna', () => {
  const c = SURROUNDINGS.crisp, ext = SURROUNDINGS.extent;
  const farRoads = [...ROADS, ...FAR.roads];
  // grusvägen fram till en gård slutar på gårdsplanen och räknas inte
  const fgap = (x, z) => Math.min(...farRoads.filter(r => { const e = r.pts[r.pts.length - 1]; return Math.hypot(e[0] - x, e[1] - z) > 8; }).map(r => distPolyline(x, z, r.pts) - r.width / 2));
  const outside = (x, z) => x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1;
  for (const f of FAR.farms) {
    assert.ok(outside(f.x, f.z), f.id);
    assert.ok(fgap(f.x, f.z) > 8, `${f.id} står på en väg`);
    assert.ok(f.x > ext.x0 && f.x < ext.x1 && f.z > ext.z0 && f.z < ext.z1, `${f.id} utanför marken`);
  }
  for (const [x, z] of FAR.houses) { assert.ok(outside(x, z)); assert.ok(fgap(x, z) > 5, `huset vid ${x}, ${z} står på en väg`); }
  for (const l of FAR.land) for (const [x, z] of l.pts) assert.ok(outside(x, z), `${l.kind} går in på spelytan`);
  assert.ok(SURROUNDINGS.haze.start > 0 && SURROUNDINGS.haze.end > SURROUNDINGS.haze.start);
});
