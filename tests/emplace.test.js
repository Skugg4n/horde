import { free } from './free.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, build } from '../src/sim/sim.js';
import { emplacement, DIRS8 } from '../src/sim/emplace.js';
import { KIND } from '../src/sim/placement.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaNorr } from '../src/data/gnesta-norr.js';
import { gnestaPlan, daySpawns } from '../scripts/balance.mjs';

// Värnet anpassar sig efter miljön (0.12.0, H098).
test('värnet vänds mot hordens väg och är detsamma för samma plats', () => {
  const plan = gnestaPlan(gnesta, daySpawns(gnesta, 1));
  const a = createSim({ map: free(gnesta), day: 1, cash: 9999, seed: 1 }), b = createSim({ map: free(gnesta), day: 1, cash: 9999, seed: 9 });
  for (const k of plan.guns.slice(0, 4)) {
    const ia = build(a, k, 'm249').id, ib = build(b, k, 'm249').id;
    const ga = a.guns.find(g => g.id === ia), gb = b.guns.find(g => g.id === ib);
    assert.deepEqual(ga.emplace, gb.emplace);
    // pjäsen ser mer av vägen framåt än bakåt
    const p = a.place, c = p.center(k);
    let front = 0, back = 0;
    for (const q of ga.sight.keys) { const d = p.center(q); const dot = (d.x - c.x) * Math.cos(ga.emplace.face) + (d.z - c.z) * Math.sin(ga.emplace.face); if (dot > 0) front++; else back++; }
    assert.ok(front > back, `${k}: fram ${front}, bak ${back}`);
  }
});

test('skyddet i grannrutorna: hus, tegelmur, bil och häck; inget skydd på öppen mark', () => {
  const sim = createSim({ map: gnestaNorr, day: 1, cash: 0, seed: 1 }), p = sim.place;
  const seen = new Set();
  let open = 0;
  for (let k = 0; k < p.n; k++) {
    if (p.kind[k] !== KIND.open || p.walk[k]) continue;
    const e = emplacement(p, k);
    e.cover.forEach((cv, s) => {
      if (!cv) return;
      seen.add(cv);
      const [di, dj] = DIRS8[s], q = k + dj * p.w + di;
      if (cv === 'house') assert.equal(p.kind[q], KIND.house);
    });
    if (e.cover.every(c => !c)) { open++; assert.deepEqual(e.nestle, [0, 0]); assert.equal(e.kneel, false); }
  }
  assert.deepEqual([...seen].sort(), ['brick', 'car', 'hedge', 'house']);
  assert.ok(open > 500);
});

test('pjäsen trycker sig mot skyddet framför sig, aldrig bakåt', () => {
  const sim = createSim({ map: gnestaNorr, day: 1, cash: 0, seed: 1 }), p = sim.place;
  let nestled = 0;
  for (let k = 0; k < p.n; k += 3) {
    if (p.kind[k] !== KIND.open || p.walk[k]) continue;
    const e = emplacement(p, k, p.walkKeys.filter(q => Math.abs(p.center(q).x - p.center(k).x) < 16 && Math.abs(p.center(q).z - p.center(k).z) < 16));
    if (!e.nestle[0] && !e.nestle[1]) continue;
    nestled++;
    const a = Math.atan2(e.nestle[1], e.nestle[0]);
    assert.ok(Math.abs(Math.atan2(Math.sin(a - e.face), Math.cos(a - e.face))) <= Math.PI / 2 + 1e-6);
  }
  assert.ok(nestled > 50);
});
