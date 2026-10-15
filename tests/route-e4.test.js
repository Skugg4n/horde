import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign, playDay } from '../scripts/balance.mjs';
import { newProgress } from '../src/meta/progress.js';
import { pathRoute } from '../src/sim/route.js';
import { pointAt } from '../src/sim/path.js';
import { MAPS } from '../src/data/maps.js';
import { makeRng } from '../src/sim/rng.js';

// Kvittot på E4:s balans: hela balansloggen (girig policy över fem seeds, plus minimal dag 1 på
// A, B, C) ger samma fingeravtryck. Ett ändrat kvitto ska vara avsiktligt och förklarat.
// 0.3.1 till 0.4.2: '3fbfe043' (14714 tecken, även policyn strong), oförändrat genom route-
// refaktorn. 0.5.0: nytt kvitto, avsiktligt: fri placering med sikt (pjäserna står där de ser mest
// av vägen, fyra i stället för tre utan forskning), New position blev More positions I till III,
// dag 2 och 3 fick hp-faktor 1,5 och 1,15, och policyn strong (fasta positioner C, B, D, A)
// finns inte längre. Se docs/balance-log.md, 0.5.0.
const BEFORE = { hash: '3a2cb567', length: 7663 };

function fingerprint() {
  const out = [];
  for (const o of [0, 1, 2, 3, 4].map(x => x * 7919)) out.push(campaign('greedy', 6, { seedOffset: o }));
  for (const s of ['A', 'B', 'C']) out.push(playDay(newProgress(), 1, 'minimal', { slot: s }));
  const str = JSON.stringify(out);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return { hash: h.toString(16), length: str.length };
}

test('E4:s balanslogg är identisk med 0.5.0', () => {
  assert.deepEqual(fingerprint(), BEFORE);
});

test('pathRoute: läge, framsteg och ankomst som förut', () => {
  const map = MAPS.riksvagen, r = pathRoute(map);
  const z = r.spawn(makeRng(3));
  assert.equal(z.d, 0);
  assert.ok(Math.abs(z.off) <= 3);
  r.advance(z, 10);
  const p = pointAt(map.path, 10);
  assert.deepEqual(r.place(z), { x: p.x - p.dirZ * z.off, z: p.z + p.dirX * z.off, dirX: p.dirX, dirZ: p.dirZ });
  assert.equal(r.progress(z), 10);
  assert.equal(r.arrived(z), false);
  r.advance(z, r.len);
  assert.equal(r.arrived(z), true);
  assert.equal(r.validCell(0), true);
  assert.equal(r.validCell(map.cells.length), false);
  assert.equal(r.validCell('constructor'), false);
});
