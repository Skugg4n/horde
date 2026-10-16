import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, houseDoor } from '../src/sim/sim.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaNorr } from '../src/data/gnesta-norr.js';
import { intelLine } from '../src/ui/panels.js';

// Vilande smittade i husen (0.12.0, H101).
const run = (map, day, secs, seed = 1) => {
  const sim = createSim({ map, day, cash: 0, seed });
  const evs = [];
  startWave(sim); evs.push(...sim.events);
  for (let t = 0; t < secs * 30; t++) { step(sim, 1 / 30); evs.push(...sim.events); }
  return { sim, evs };
};

test('dörren slås upp när vågen börjar och de väller ut på gatan framför huset', () => {
  const { sim, evs } = run(gnesta, 1, 3);
  const bursts = evs.filter(e => e.t === 'dormantBurst');
  // 0.13.0: dag 1 är de civila, med ett hus med vilande vid stickgatan
  assert.deepEqual(bursts.map(b => b.house), ['B1-00']);
  assert.deepEqual(sim.burst, ['B1-00']);
  for (const d of gnesta.days[0].dormant) {
    const door = houseDoor(gnesta, d.house, sim.route);
    const out = sim.zombies.filter(z => z.house === d.house);
    assert.equal(out.length, d.count);
    const [cx, cz] = sim.route.grid.center(door.cell);
    assert.ok(Math.hypot(cx - door.x, cz - door.z) < 8, `${d.house}: gatan ${Math.hypot(cx - door.x, cz - door.z).toFixed(1)} m från dörren`);
    for (const z of out) assert.ok(Number.isFinite(sim.route.flow.dist[z.cell]), 'på väg mot basen');
  }
});

test('de vilande är deterministiska', () => {
  const a = run(gnesta, 2, 12, 7).sim.zombies.filter(z => z.house).map(z => [z.id, z.x.toFixed(4), z.z.toFixed(4)]);
  const b = run(gnesta, 2, 12, 7).sim.zombies.filter(z => z.house).map(z => [z.id, z.x.toFixed(4), z.z.toFixed(4)]);
  assert.ok(a.length > 0);
  assert.deepEqual(a, b);
});

test('överraskningen: ett hus utan förvarning, först i en senare våg', () => {
  const d3 = gnesta.days[2].dormant;
  assert.ok(d3.some(d => d.intel === false && d.wave > 0));
  assert.equal(intelLine(gnesta.days[2]), '');
  assert.match(intelLine(gnesta.days[0]), /Intel: dormant infected reported on Sigtunavägen\./);
  assert.match(intelLine(gnestaNorr.days[0]), /Vikingavägen/);
  // 0.12.2: Norr dag 4 och 5 har ett oannonserat hus sent i sista vågen
  for (const n of [3, 4]) assert.ok(gnestaNorr.days[n].dormant.some(d => d.intel === false && d.wave > 0 && d.delay > 0));
  // varje hus finns, och gatan i texten är den närmaste namngivna
  for (const map of [gnesta, gnestaNorr]) for (const day of map.days) for (const d of day.dormant ?? []) {
    // 0.12.2: upp till sex smittade, eller en till två bjässar (Norrs överraskningar sent i vågen)
    if (d.type === 'brute') assert.ok(d.count >= 1 && d.count <= 2);
    else assert.ok(d.count >= 3 && d.count <= 6);
    // d.delay: dörren slås upp senare i vågen, men aldrig efter att vågen kommit ut
    if (d.delay != null) assert.ok(d.delay > 0 && d.delay <= 60);
    houseDoor(map, d.house);
  }
});

// 0.12.2: ett hus med delay slås upp sent i vågen, inte när den börjar, och de kommer ut då.
test('dörren med delay slås upp först efter delay sekunder in i vågen', () => {
  const map = { ...gnestaNorr, days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0, spawn: 'vikN' }] }],
    dormant: [{ house: 'N-19', count: 3, type: 'walker', wave: 0, delay: 12, intel: false }] }] };
  const sim = createSim({ map, day: 1, cash: 0, seed: 3 });
  startWave(sim);
  let burstAt = null;
  for (let i = 0; i < 30 * 20; i++) { step(sim, 1 / 30); if (sim.events.some(e => e.t === 'dormantBurst')) burstAt ??= sim.time; }
  assert.ok(burstAt > 11.9 && burstAt < 12.2, `dörren vid ${burstAt}`);
  assert.equal(sim.zombies.filter(z => z.house === 'N-19').length, 3);
});
