import { ZOMBIES } from '../data/zombies.js';
import { makeRng } from './rng.js';
import { pathLength, pointAt } from './path.js';

export const WAVE_INTEL = 2;      // forskning per klarad våg
export const CELL_LEN = 3;

export function createSim({ map, day, cash, research = [], seed = 1 }) {
  const dayCfg = map.days[day - 1];
  const res = new Set(research);
  return {
    map, day, dayCfg, phase: 'build', waveIndex: 0, cash, intelEarned: 0,
    baseHp: map.baseHp, zombies: [], events: [], time: 0, rng: makeRng(seed),
    research: res, nextId: 1, spawnQueue: [], len: pathLength(map.path),
    slots: map.slots.map(s => ({ id: s.id, x: s.x, z: s.z, locked: !!(s.locked && !res.has(s.locked)), weapon: null })),
    obstacles: {},
  };
}

export function zombiePos(sim, z) {
  const p = pointAt(sim.map.path, z.d);
  return { x: p.x - p.dirZ * z.off, z: p.z + p.dirX * z.off, dirX: p.dirX, dirZ: p.dirZ };
}

export function startWave(sim) {
  if (sim.phase !== 'build') return false;
  const wave = sim.dayCfg.waves[sim.waveIndex];
  sim.spawnQueue = [];
  for (const g of wave.groups) for (let i = 0; i < g.count; i++) sim.spawnQueue.push({ at: sim.time + g.delay + i * g.interval, type: g.type });
  sim.spawnQueue.sort((a, b) => a.at - b.at);
  sim.phase = 'wave';
  return true;
}

function spawn(sim, type) {
  const z = { id: sim.nextId++, type, hp: ZOMBIES[type].hp, maxHp: ZOMBIES[type].hp, d: 0, off: (sim.rng() - 0.5) * 6, wob: sim.rng() * 6, dead: false, deadT: 0, blockedBy: null };
  sim.zombies.push(z);
  sim.events.push({ t: 'spawn', id: z.id });
}

export function step(sim, dt) {
  sim.events = [];
  if (sim.phase !== 'wave') return;
  sim.time += dt;
  while (sim.spawnQueue.length && sim.spawnQueue[0].at <= sim.time) spawn(sim, sim.spawnQueue.shift().type);
  moveZombies(sim, dt);
  fireWeapons(sim, dt);   // Task 4
  for (const z of sim.zombies) if (z.dead) z.deadT += dt;
  sim.zombies = sim.zombies.filter(z => !(z.dead && z.deadT > 20));
  if (sim.baseHp <= 0) { sim.phase = 'lost'; sim.events.push({ t: 'lost' }); return; }
  if (!sim.spawnQueue.length && sim.zombies.every(z => z.dead)) {
    sim.intelEarned += WAVE_INTEL;
    sim.events.push({ t: 'waveCleared', index: sim.waveIndex, intel: WAVE_INTEL });
    sim.waveIndex++;
    if (sim.waveIndex >= sim.dayCfg.waves.length) { sim.phase = 'won'; sim.events.push({ t: 'won' }); }
    else sim.phase = 'build';
  }
}

function moveZombies(sim, dt) {
  for (const z of sim.zombies) {
    if (z.dead) continue;
    const def = ZOMBIES[z.type];
    const speed = def.speed * obstacleEffect(sim, z, dt); // Task 5; returnerar 1 tills dess
    z.d += speed * dt;
    z.wob += dt * speed;
    if (z.d >= sim.len) {
      sim.baseHp -= def.baseDamage;
      z.dead = true; z.breached = true; z.deadT = 99;
      sim.events.push({ t: 'breach', id: z.id, damage: def.baseDamage });
    }
  }
}

// Stubbar, ersätts i Task 4 (vapen) och Task 5 (hinder).
function fireWeapons(sim, dt) {}
function obstacleEffect(sim, z, dt) { return 1; }
