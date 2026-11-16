// H601 (helspeltestet 2026-11-16): letar zombier som står still. Slumpar spärrar (betong och skrotbilar) på hordens
// vägar på varje bana och dag, kör dagen utan trupp (basen tål allt) och räknar zombier utan framsteg.
// node scripts/stuck-fuzz.mjs [mapId] [försök]
import { createSim, startWave, step, placeAcross, callNextWave, hasNextWave } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { daySpawns } from './balance.mjs';

const DT = 1 / 30;
const rand = s => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
export function fuzzDay(map, day, seed, { lines = 3, stillFor = 10, limit = 1500 } = {}) {
  const r = rand(seed * 7919 + day);
  const d0 = map.days[day - 1];
  const dayCfg = { ...d0, ...(d0.evac ? { evac: { ...d0.evac, need: 0 } } : {}) };
  const sim = createSim({ map: { ...map, baseHp: 1e9 }, day, cash: 1e6, seed, core: [], research: ['block.1'], dayCfg });
  if (sim.route.kind !== 'grid') return null;
  sim.cash = 1e6;
  const paths = sim.route.paths(daySpawns(map, day)).filter(p => p.reaches);
  const placed = [];
  for (let i = 0; i < lines && paths.length; i++) {
    const p = paths[Math.floor(r() * paths.length)], c = p.cells[Math.floor(r() * (p.cells.length - 2)) + 1];
    const type = r() < 0.6 ? 'car' : 'block';
    if (sim.route.validCell(c) && placeAcross(sim, c, type).ok) placed.push([type, c]);
  }
  const best = new Map(), stuck = [];
  startWave(sim);
  const waves = dayCfg.waves.length;
  while ((sim.phase === 'wave' || (sim.phase === 'build' && sim.nextWaveIn != null)) && sim.time < limit && !(sim.waveIndex >= waves)) {
    step(sim, DT);
    if (sim.phase === 'build' && sim.nextWaveIn == null && hasNextWave(sim)) startWave(sim);
    for (const z of sim.zombies) {
      if (z.dead) continue;
      const f = sim.route.togo(z), b = best.get(z.id), v = sim.routeV ?? 0;
      if (!b || b.v !== v || f < b.f - 1e-4 || z.attacking) best.set(z.id, { f: Math.min(f, b && b.v === v ? b.f : Infinity), t: sim.time, v });
      else if (sim.time - b.t > stillFor) { stuck.push({ id: z.id, type: z.type, x: +z.x.toFixed(1), z: +z.z.toFixed(1), cell: z.cell, t: Math.round(sim.time) }); best.set(z.id, { f, t: sim.time, v }); }
    }
  }
  const door = sim.zombies.filter(z => !z.dead).every(z => z.atDoor);
  return { placed, stuck, door, phase: sim.waveIndex >= waves && sim.phase !== 'lost' ? 'won' : sim.phase, time: Math.round(sim.time), alive: sim.zombies.filter(z => !z.dead).length, left: sim.spawnQueue.length, wi: sim.waveIndex, ws: sim.wavesStarted };
}
const IS_MAIN = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (IS_MAIN) {
  const only = process.argv[2], n = Number(process.argv[3] ?? 4);
  for (const id of Object.keys(MAPS)) {
    if (only && only !== '-' && id !== only) continue;
    const m = MAPS[id];
    if (!m.grid || !m.days) continue;
    for (const d of m.days) for (let s = 1; s <= n; s++) {
      const t0 = Date.now(), r = fuzzDay(m, d.n, s);
      if (!r) continue;
      console.log(`${id} dag ${d.n} seed ${s}: ${r.phase} ${r.time}s, fast ${r.stuck.length} (lever ${r.alive}, kö ${r.left}, våg ${r.wi}/${r.ws}) ${JSON.stringify(r.placed)} ${r.stuck.slice(0, 3).map(q => JSON.stringify(q)).join(' ')} (${Date.now() - t0} ms)`);
    }
  }
}
