import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { routeFor } from '../src/sim/route.js';
import { fogFactor, FOG_SPEED, FOG_RAMP, createSim, startWave, step } from '../src/sim/sim.js';

// 0.11.0 (Olas krav): ingångarna ligger utanför den skarpa spelytan, i dimkanten, så att horden
// kommer ur diset längs gatan och inte dyker upp mitt i en korsning.
const outside = (c, x, z) => Math.max(c.x0 - x, x - c.x1, c.z0 - z, z - c.z1);
const towns = Object.values(MAPS).filter(m => m.grid);

test('ingen ingång ligger inne i den skarpa spelytan', () => {
  assert.ok(towns.length >= 2);
  for (const m of towns) {
    const c = m.surroundings.crisp, r = routeFor(m);
    for (const s of r.spawns) assert.ok(outside(c, s.x, s.z) >= 6, `${m.id} ${s.id} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) ligger ${outside(c, s.x, s.z).toFixed(1)} m utanför`);
    // och dagarna använder bara ingångar som finns
    const ids = new Set(r.spawns.map(s => s.id));
    for (const d of m.days) for (const w of d.waves) for (const g of w.groups) assert.ok(ids.has(g.spawn ?? r.spawns[0].id), `${m.id} dag ${d.n}: ${g.spawn}`);
  }
});

test('diset: fortare utanför, mjuk övergång, vanlig fart inne på kartan', () => {
  const m = MAPS.gnesta, c = m.surroundings.crisp;
  assert.equal(fogFactor(m, (c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2), 1);
  assert.equal(fogFactor(m, c.x1, 0), 1);
  assert.equal(fogFactor(m, c.x1 + FOG_RAMP + 5, 0), FOG_SPEED);
  let prev = 1;
  for (let d = 0; d <= FOG_RAMP; d += 0.5) { const f = fogFactor(m, c.x1 + d, 0); assert.ok(f >= prev - 1e-12 && f - prev < 0.35, `steg vid ${d} m`); prev = f; }
  assert.equal(fogFactor(MAPS.riksvagen, 1000, 0), 1, 'E4 har inget dis');
});

// Tiden till första skottet hålls kort av diset: dagens första zombie syns i kartkanten inom 10 s.
test('dagens första zombie kliver ur diset inom 10 s, varje dag på stadsbanorna', () => {
  for (const m of towns) for (const d of m.days) {
    const sim = createSim({ map: m, day: d.n, cash: 0, research: [], seed: 1 });
    startWave(sim);
    const c = m.surroundings.crisp;
    let t = null;
    while (sim.time < 30 && t == null) { step(sim, 1 / 30); if (sim.zombies.some(z => !z.dead && outside(c, z.x, z.z) <= 0)) t = sim.time; }
    assert.ok(t != null && t <= 10, `${m.id} dag ${d.n}: ${t?.toFixed(1)} s`);
  }
});
