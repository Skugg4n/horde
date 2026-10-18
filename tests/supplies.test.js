// Förnödenheterna på enheten (0.17.2, H306, Olas speltest av 0.17.1: "sandsäckarna och ammolådan verkar inte göra
// något"). Effekten fanns i simuleringen men syntes inte; här provas att den verkligen gäller i striden: samma
// bana, samma frö, samma våg, med och utan. Ammolådan: fler skott på samma tid. Sandsäckarna: mindre skada på
// männen när horden når dem.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gridFromAscii } from '../src/sim/grid.js';
import { buildPlace, KIND } from '../src/sim/placement.js';
import { createSim, startWave, step, build, buySupply, gunStats } from '../src/sim/sim.js';
import { SUPPLIES } from '../src/data/weapons.js';

// Gatan är rad 0 (från a i öster till basen B i väster), gräs under.
function testMap(rows, waves) {
  const grid = gridFromAscii(rows.map((r, j) => (j === 0 ? r : '#'.repeat(r.length))));
  const place = buildPlace({
    w: grid.w, h: grid.h, cellSize: 2, origin: [0, 0],
    classify(x, z) { const j = Math.floor(z / 2); return j === 0 ? KIND.road : KIND.open; },
  });
  return { id: 'sup-prov', grid, place, baseHp: 999, days: [{ n: 1, startCash: 0, waves }] };
}
const ROWS = ['B.............................a', '...............................', '...............................', '...............................'];
const shots = (sim, id) => sim.events.filter(e => e.t === 'shot' && e.gunId === id).length;

test('ammolådan: pjäsen skjuter fler skott på samma tid', () => {
  const map = testMap(ROWS, [{ groups: [{ type: 'brute', count: 12, interval: 0.8, delay: 0 }] }]);
  const count = ammo => {
    const sim = createSim({ map, day: 1, cash: 5000, seed: 3 });
    const k = 1 * map.grid.w + 15;
    assert.equal(build(sim, k, 'm249').ok, true);
    const g = sim.guns[0];
    if (ammo) assert.equal(buySupply(sim, g.id, 'ammo').ok, true);
    startWave(sim);
    let n = 0;
    for (let t = 0; t < 30; t += 0.05) { sim.events.length = 0; step(sim, 0.05); n += shots(sim, g.id); }
    return { n, rate: gunStats(sim, g).rate };
  };
  const off = count(false), on = count(true);
  assert.ok(Math.abs(on.rate / off.rate - SUPPLIES.ammo.rate) < 1e-9);
  assert.ok(on.n > off.n * 1.1, `skott med låda ${on.n}, utan ${off.n}`);
});

test('sandsäckarna: männen tar mindre skada när horden når dem', () => {
  // gruppen står intill gatan, horden går förbi och slår på dem
  const map = testMap(ROWS, [{ groups: [{ type: 'walker', count: 30, interval: 0.4, delay: 0 }] }]);
  // skadan fram till tiden until (sekunder), och när första mannen föll
  const taken = (bags, until = 60) => {
    const sim = createSim({ map, day: 1, cash: 5000, seed: 5 });
    const k = 1 * map.grid.w + 15;
    assert.equal(build(sim, k, 'hv').ok, true);
    const g = sim.guns[0];
    if (bags) assert.equal(buySupply(sim, g.id, 'sandbags').ok, true);
    let hurt = 0, firstDown = null;
    startWave(sim);
    for (let t = 0; t < until; t += 0.05) {
      const before = g.soldiers.map(s => s.hp);
      step(sim, 0.05);
      g.soldiers.forEach((s, i) => { if (s.hp < before[i]) hurt += before[i] - s.hp; });
      if (firstDown == null && g.soldiers.some(s => s.down)) firstDown = t;
    }
    return { hurt, firstDown };
  };
  const off = taken(false);
  assert.ok(off.hurt > 0 && off.firstDown != null, 'horden nådde gruppen och slog ner en man');
  // samma tid: fram till att den första föll utan säckar
  const a = taken(false, off.firstDown), b = taken(true, off.firstDown);
  assert.ok(Math.abs(b.hurt / a.hurt - SUPPLIES.sandbags.take) < 0.05, `skada med säckar ${b.hurt.toFixed(1)}, utan ${a.hurt.toFixed(1)}`);
  // och männen håller längre
  const on = taken(true);
  assert.ok(on.firstDown == null || on.firstDown > off.firstDown, `första föll ${on.firstDown} s med säckar, ${off.firstDown} s utan`);
});
