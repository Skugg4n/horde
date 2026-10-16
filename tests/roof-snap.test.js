import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { snapRoof, buildingAt } from '../src/sim/snap.js';
import { KIND } from '../src/sim/placement.js';

// 0.12.1 (speltestet av 0.12.0: Psg 90 siktad på ishallens tak hamnade på marken bakom hallen): en
// byggnad under pekaren ger byggnadens bästa utsiktspunkt, eller taket med skälet, aldrig marken.
const mk = map => createSim({ map, day: 1, cash: 1e5, research: ['m2.1', 'psg90.1'], seed: 1 });

for (const map of [MAPS.gnesta, MAPS['gnesta-norr']]) {
  test(`${map.id}: husrutor utan utsiktspunkt snäpper till byggnadens utsiktspunkt eller säger varför`, () => {
    const sim = mk(map), p = sim.place;
    let snapped = 0, steep = 0, highSnap = 0;
    for (let k = 0; k < p.n; k++) {
      if (p.kind[k] !== KIND.house || p.roof[k] > 0) continue;
      const c = p.center(k), r = snapRoof(sim, k, c.x, c.z, 'psg90');
      if (!r) continue;
      assert.equal(r.roof, true);
      if (r.ok) {
        assert.ok(p.roof[r.key] > 0, 'en utsiktspunkt');
        assert.equal(buildingAt(p, r.key), buildingAt(p, k), 'samma byggnad');
        snapped++;
        if (p.roof[r.key] > 6) highSnap++;
      } else {
        assert.ok(['brant', 'brant-skorsten'].includes(r.reason), r.reason);
        assert.equal(r.key, k, 'stannar på taket');
        steep++;
      }
    }
    assert.ok(snapped > 50, `${snapped} snäppte`);
    if (map.id === 'gnesta') assert.ok(highSnap > 0, 'ishallens eller sporthallens kant snäpper upp på taket');
    assert.ok(steep >= 0);
  });
}

test('en utsiktspunkt under pekaren tas som den är', () => {
  const sim = mk(MAPS.gnesta), p = sim.place;
  const k = [...Array(p.n).keys()].find(i => p.roof[i] > 6);
  const c = p.center(k);
  const first = snapRoof(sim, k, c.x, c.z, 'psg90');
  assert.equal(first.ok, true);
  assert.equal(first.key, k);
});
