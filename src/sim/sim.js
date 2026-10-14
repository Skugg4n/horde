import { ZOMBIES } from '../data/zombies.js';
import { WEAPONS } from '../data/weapons.js';
import { makeRng } from './rng.js';
import { pathLength, pointAt } from './path.js';
import { weaponStats, weaponUnlocked, upgradeCost } from './stats.js';

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

export function build(sim, slotId, type) {
  if (sim.phase !== 'build') return { ok: false, reason: 'fel läge' };
  const s = sim.slots.find(x => x.id === slotId);
  if (s.locked) return { ok: false, reason: 'låst' };
  if (s.weapon) return { ok: false, reason: 'upptagen' };
  if (!weaponUnlocked(type, sim.research)) return { ok: false, reason: 'ej upplåst' };
  const cost = WEAPONS[type].cost;
  if (sim.cash < cost) return { ok: false, reason: 'pengar' };
  sim.cash -= cost;
  s.weapon = { type, level: 1, cooldown: 0, angle: Math.PI, targetId: null, spent: cost };
  return { ok: true };
}
export function upgrade(sim, slotId) {
  if (sim.phase !== 'build') return { ok: false, reason: 'fel läge' };
  const w = sim.slots.find(x => x.id === slotId).weapon;
  if (!w) return { ok: false, reason: 'tom' };
  const cost = upgradeCost(w.type, w.level);
  if (cost == null) return { ok: false, reason: 'max' };
  if (sim.cash < cost) return { ok: false, reason: 'pengar' };
  sim.cash -= cost; w.level++; w.spent += cost;
  return { ok: true };
}
export function sell(sim, slotId) {
  if (sim.phase !== 'build') return { ok: false, refund: 0 };
  const s = sim.slots.find(x => x.id === slotId);
  if (!s.weapon) return { ok: false, refund: 0 };
  const refund = Math.round(s.weapon.spent * 0.6);
  sim.cash += refund; s.weapon = null;
  return { ok: true, refund };
}

function fireWeapons(sim, dt) {
  for (const s of sim.slots) {
    const w = s.weapon; if (!w) continue;
    const st = weaponStats(w.type, w.level, sim.research);
    let target = null, best = -1;
    for (const z of sim.zombies) {
      if (z.dead) continue;
      const p = zombiePos(sim, z);
      if (Math.hypot(p.x - s.x, p.z - s.z) <= st.range && z.d > best) { best = z.d; target = z; }
    }
    w.targetId = target ? target.id : null;
    w.cooldown -= dt;
    if (!target) { w.cooldown = Math.max(w.cooldown, 0); continue; }
    const p = zombiePos(sim, target);
    w.angle = Math.atan2(p.z - s.z, p.x - s.x);
    while (w.cooldown <= 0) {
      w.cooldown += 1 / st.rate;
      const hit = sim.rng() < st.accuracy;
      sim.events.push({ t: 'shot', slotId: s.id, targetId: target.id, hit, x: p.x, z: p.z });
      if (hit) damage(sim, target, st.damage, p);
      if (target.dead) break;
    }
  }
}
function damage(sim, z, amount, p) {
  z.hp -= amount;
  sim.events.push({ t: 'hit', id: z.id, x: p.x, z: p.z });
  if (z.hp <= 0 && !z.dead) {
    const def = ZOMBIES[z.type];
    z.dead = true; z.deadT = 0;
    sim.cash += def.bounty; sim.intelEarned += def.intel;
    sim.events.push({ t: 'kill', id: z.id, type: z.type, bounty: def.bounty, intel: def.intel, x: p.x, z: p.z });
  }
}

// Stub, ersätts i Task 5 (hinder).
function obstacleEffect(sim, z, dt) { return 1; }
