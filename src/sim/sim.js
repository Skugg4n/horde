import { ZOMBIES } from '../data/zombies.js';
import { WEAPONS } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { makeRng } from './rng.js';
import { pathLength, pointAt } from './path.js';
import { weaponStats, weaponUnlocked, upgradeCost, obstacleUnlocked, weaponRefund, obstacleRefund } from './stats.js';

export const WAVE_INTEL = 2;      // forskning per klarad våg
export const CELL_LEN = 3;

export function createSim({ map, day, cash, research = [], seed = 1 }) {
  const dayCfg = map.days[day - 1];
  const res = new Set(research);
  return {
    map, day, dayCfg, phase: 'build', waveIndex: 0, cash, intelEarned: 0, kills: 0,
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
  const z = { id: sim.nextId++, type, hp: ZOMBIES[type].hp, maxHp: ZOMBIES[type].hp, d: 0, off: (sim.rng() - 0.5) * 6, wob: sim.rng() * 6, dead: false, deadT: 0, blockedBy: null, breached: false, attacking: false };
  sim.zombies.push(z);
  sim.events.push({ t: 'spawn', id: z.id });
}

export function step(sim, dt) {
  sim.events = [];
  if (sim.phase !== 'wave') return;
  sim.time += dt;
  while (sim.spawnQueue.length && sim.spawnQueue[0].at <= sim.time) spawn(sim, sim.spawnQueue.shift().type);
  moveZombies(sim, dt);
  fireWeapons(sim, dt);
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
  const hitCells = new Set();
  for (const z of sim.zombies) {
    if (z.dead) continue;
    const def = ZOMBIES[z.type];
    const speed = def.speed * obstacleEffect(sim, z, dt, hitCells);
    z.d += speed * dt;
    z.wob += dt * speed;
    if (z.d >= sim.len) {
      sim.baseHp -= def.baseDamage;
      const p = zombiePos(sim, z);
      z.dead = true; z.breached = true; z.deadT = 99;
      sim.events.push({ t: 'breach', id: z.id, damage: def.baseDamage, x: p.x, z: p.z });
    }
  }
}

export function build(sim, slotId, type) {
  if (sim.phase !== 'build') return { ok: false, reason: 'fel läge' };
  const s = sim.slots.find(x => x.id === slotId);
  if (!s) return { ok: false, reason: 'okänd' };
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
  const s = sim.slots.find(x => x.id === slotId);
  if (!s) return { ok: false, reason: 'okänd' };
  const w = s.weapon;
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
  if (!s || !s.weapon) return { ok: false, refund: 0 };
  const refund = weaponRefund(s.weapon);
  sim.cash += refund; s.weapon = null;
  return { ok: true, refund };
}

export function placeObstacle(sim, cell, type) {
  if (sim.phase !== 'build') return { ok: false, reason: 'fel läge' };
  if (!Number.isInteger(cell) || cell < 0 || cell >= sim.map.cells.length) return { ok: false, reason: 'okänd' };
  if (sim.obstacles[cell]) return { ok: false, reason: 'upptagen' };
  if (!OBSTACLES[type] || !obstacleUnlocked(type, sim.research)) return { ok: false, reason: 'ej upplåst' };
  const o = OBSTACLES[type];
  if (sim.cash < o.cost) return { ok: false, reason: 'pengar' };
  sim.cash -= o.cost;
  if (o.kind === 'slow') {
    const dur = o.durability * (sim.research.has('wireTough') ? 2 : 1);
    sim.obstacles[cell] = { type, durability: dur, maxDurability: dur };
  } else {
    sim.obstacles[cell] = { type, hp: o.hp, maxHp: o.hp };
  }
  return { ok: true };
}
export function removeObstacle(sim, cell) {
  if (!Number.isInteger(cell) || cell < 0 || cell >= sim.map.cells.length) return { ok: false, refund: 0 };
  const ob = sim.obstacles[cell];
  if (sim.phase !== 'build' || !ob) return { ok: false, refund: 0 };
  const refund = obstacleRefund(ob);
  sim.cash += refund;
  delete sim.obstacles[cell];
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
    sim.cash += def.bounty; sim.intelEarned += def.intel; sim.kills++;
    sim.events.push({ t: 'kill', id: z.id, type: z.type, bounty: def.bounty, intel: def.intel, x: p.x, z: p.z });
  }
}

// Hinder längs vägen. Returnerar farthållarens multiplikator för zombiens fart denna frame.
// hitCells: rutor som redan fått en obstacleHit under detta steg.
function obstacleEffect(sim, z, dt, hitCells) {
  const def = ZOMBIES[z.type];
  let mul = 1;
  sim.map.cells.forEach((cd, i) => {
    const ob = sim.obstacles[i]; if (!ob) return;
    const o = OBSTACLES[ob.type];
    if (o.kind === 'slow' && z.d >= cd && z.d < cd + CELL_LEN) {
      mul = Math.min(mul, o.slow);
      ob.durability -= dt;
      if (ob.durability <= 0) { delete sim.obstacles[i]; sim.events.push({ t: 'obstacleBroken', cell: i, type: ob.type }); }
    }
    // Blocket stoppar även zombier som skulle passera det i ett enda steg (stort dt).
    const crosses = z.d < cd && z.d + def.speed * dt > cd;
    if (o.kind === 'block' && ((z.d >= cd - 0.6 && z.d <= cd) || crosses)) {
      mul = 0; if (crosses) z.d = cd; z.attacking = true;
      ob.hp -= def.hitDamage * dt;
      if (!hitCells.has(i)) { hitCells.add(i); sim.events.push({ t: 'obstacleHit', cell: i }); }
      if (ob.hp <= 0) { delete sim.obstacles[i]; sim.events.push({ t: 'obstacleBroken', cell: i, type: ob.type }); }
    }
  });
  if (mul > 0) z.attacking = false;
  return mul;
}
