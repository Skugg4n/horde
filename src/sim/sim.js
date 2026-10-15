import { ZOMBIES } from '../data/zombies.js';
import { WEAPONS, GRENADE_KIT } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { makeRng } from './rng.js';
import { routeFor } from './route.js';
import { weaponStats, weaponUnlocked, upgradeCost, obstacleUnlocked, weaponRefund, obstacleRefund, tierOf, grenadeStats, wireDurability, blockHp } from './stats.js';

export const WAVE_INTEL = 2;      // forskning per klarad våg
export { CELL_LEN } from './cells.js';
// Nästa våg: nedräkning efter en klarad våg, och bonus för att kalla den tidigt.
export const COUNTDOWN = 5;         // sekunder från klarad våg till nästa startar av sig själv
export const EARLY_PER_SEC = 5;    // pengar per sekund som sparas
export const EARLY_MAX_SPAWN = 5;   // mitt i en våg räknas högst så många sekunder kvarvarande spawn

export function createSim({ map, day, cash, research = [], seed = 1 }) {
  const dayCfg = map.days[day - 1];
  const res = new Set(research);
  const route = routeFor(map);
  return {
    // waveIndex: antal klarade vågor. wavesStarted: antal startade (vågor kan gå samtidigt
    // när nästa kallas tidigt). nextWaveIn: sekunder kvar av nedräkningen, null = väntar på spelaren.
    map, day, dayCfg, phase: 'build', waveIndex: 0, wavesStarted: 0, cleared: [], nextWaveIn: null, cash, intelEarned: 0, kills: 0,
    baseHp: map.baseHp, zombies: [], events: [], time: 0, rng: makeRng(seed),
    research: res, nextId: 1, spawnQueue: [], route, len: route.len,
    slots: map.slots.map(s => ({ id: s.id, x: s.x, z: s.z, locked: !!(s.locked && tierOf(res, s.locked) < 1), weapon: null })),
    obstacles: {}, grenades: [], nextLine: 1,
  };
}

// Zombiens läge och riktning. Rutten vet hur (polylinje för E4, rutnät för Gnesta).
export const zombiePos = (sim, z) => sim.route.place(z);

export const hasNextWave = sim => sim.wavesStarted < sim.dayCfg.waves.length;

function launch(sim) {
  const index = sim.wavesStarted;
  const wave = sim.dayCfg.waves[index];
  for (const g of wave.groups) for (let i = 0; i < g.count; i++) sim.spawnQueue.push({ at: sim.time + g.delay + i * g.interval, type: g.type, wave: index, spawn: g.spawn });
  sim.spawnQueue.sort((a, b) => a.at - b.at || a.wave - b.wave);
  sim.wavesStarted++;
  sim.phase = 'wave';
  sim.nextWaveIn = null;
  sim.events.push({ t: 'waveStart', index });
  return index;
}

// Startar nästa våg utan bonus (första vågen, eller policyer som inte vill vänta).
export function startWave(sim) {
  if (sim.phase !== 'build' || !hasNextWave(sim)) return false;
  launch(sim);
  return true;
}

// Bonus om nästa våg kallas nu: sekunder som sparas gånger EARLY_PER_SEC. Under nedräkningen
// är det sekunderna kvar. Mitt i en våg är det hela nedräkningen plus den spawn som återstår
// (högst EARLY_MAX_SPAWN s). Före första vågen och efter sista: 0.
export function earlyBonus(sim) {
  if (!hasNextWave(sim)) return 0;
  if (sim.phase === 'build') return sim.nextWaveIn == null ? 0 : Math.ceil(sim.nextWaveIn - 1e-6) * EARLY_PER_SEC;
  if (sim.phase !== 'wave') return 0;
  const q = sim.spawnQueue;
  const spawnLeft = q.length ? Math.max(0, q[q.length - 1].at - sim.time) : 0;
  return Math.round((COUNTDOWN + Math.min(EARLY_MAX_SPAWN, spawnLeft)) * EARLY_PER_SEC);
}

// Next wave: under nedräkningen eller mitt i en våg. Vågornas spawn läggs ihop.
export function callNextWave(sim) {
  if (!canAct(sim) || !hasNextWave(sim)) return { ok: false, bonus: 0 };
  const bonus = earlyBonus(sim);
  const index = launch(sim);
  if (bonus) { sim.cash += bonus; sim.events.push({ t: 'earlyBonus', amount: bonus, index }); }
  return { ok: true, bonus, index };
}

// group.spawn väljer ingång på banor med flera (standard: den första).
function spawn(sim, { type, wave, spawn: spawnId }) {
  const id = sim.nextId++;
  const z = { id, type, wave, hp: ZOMBIES[type].hp, maxHp: ZOMBIES[type].hp, ...sim.route.spawn(sim.rng, spawnId, id), wob: sim.rng() * 6, dead: false, deadT: 0, blockedBy: null, breached: false, attacking: false };
  sim.zombies.push(z);
  sim.events.push({ t: 'spawn', id: z.id });
}

function ageCorpses(sim, dt) {
  for (const z of sim.zombies) if (z.dead) z.deadT += dt;
  sim.zombies = sim.zombies.filter(z => !(z.dead && z.deadT > 20));
}

export function step(sim, dt) {
  sim.events = [];
  if (sim.phase === 'build' && sim.nextWaveIn != null) {
    // Nedräkning: tiden går, granater i luften landar, nästa våg startar vid 0.
    sim.time += dt;
    sim.nextWaveIn -= dt;
    landGrenades(sim, dt);
    ageCorpses(sim, dt);
    if (sim.nextWaveIn <= 1e-6) launch(sim);
    return;
  }
  if (sim.phase !== 'wave') return;
  sim.time += dt;
  while (sim.spawnQueue.length && sim.spawnQueue[0].at <= sim.time) spawn(sim, sim.spawnQueue.shift());
  moveZombies(sim, dt);
  fireWeapons(sim, dt);
  landGrenades(sim, dt);
  throwGrenades(sim, dt);
  ageCorpses(sim, dt);
  if (sim.baseHp <= 0) { sim.phase = 'lost'; sim.events.push({ t: 'lost' }); return; }
  checkCleared(sim);
}

// En våg är klar när allt den skulle spawna har kommit och alla dess zombier är döda. Med
// tidigt kallade vågor kan flera vara igång; dagen vinns först när alla vågor är klara.
function checkCleared(sim) {
  for (let k = 0; k < sim.wavesStarted; k++) {
    if (sim.cleared[k]) continue;
    if (sim.spawnQueue.some(q => q.wave === k) || sim.zombies.some(z => !z.dead && z.wave === k)) continue;
    sim.cleared[k] = true;
    sim.waveIndex++;
    sim.intelEarned += WAVE_INTEL;
    sim.events.push({ t: 'waveCleared', index: k, intel: WAVE_INTEL });
  }
  if (sim.waveIndex >= sim.dayCfg.waves.length) { sim.phase = 'won'; sim.events.push({ t: 'won' }); }
  else if (sim.waveIndex === sim.wavesStarted) { sim.phase = 'build'; sim.nextWaveIn = COUNTDOWN; }
}

function moveZombies(sim, dt) {
  const hitCells = new Set();
  for (const z of sim.zombies) {
    if (z.dead) continue;
    const def = ZOMBIES[z.type];
    const speed = def.speed * obstacleEffect(sim, z, dt, hitCells);
    z.v = speed;
    sim.route.advance(z, speed * dt);
    z.wob += dt * speed;
    if (sim.route.arrived(z)) {
      sim.baseHp -= def.baseDamage;
      const p = zombiePos(sim, z);
      z.dead = true; z.breached = true; z.deadT = 99;
      sim.events.push({ t: 'breach', id: z.id, damage: def.baseDamage, x: p.x, z: p.z });
    }
  }
}

// Bygga, uppgradera, sälja och lägga hinder går när som helst under dagen, även mitt i en våg.
// Bara när dagen är slut (vunnen eller förlorad) är det stängt.
export const canAct = sim => sim.phase === 'build' || sim.phase === 'wave';

export function build(sim, slotId, type) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
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
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
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
  if (!canAct(sim)) return { ok: false, refund: 0 };
  const s = sim.slots.find(x => x.id === slotId);
  if (!s || !s.weapon) return { ok: false, refund: 0 };
  const refund = weaponRefund(s.weapon);
  sim.cash += refund; s.weapon = null;
  return { ok: true, refund };
}
// Granatlåda till en byggd position. Kräver forskningen Grenades. Följer med i sälj (spent).
export function buyKit(sim, slotId) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const s = sim.slots.find(x => x.id === slotId);
  if (!s) return { ok: false, reason: 'okänd' };
  const w = s.weapon;
  if (!w) return { ok: false, reason: 'tom' };
  if (!grenadeStats(sim.research)) return { ok: false, reason: 'ej upplåst' };
  if (w.kit) return { ok: false, reason: 'redan' };
  if (sim.cash < GRENADE_KIT.cost) return { ok: false, reason: 'pengar' };
  sim.cash -= GRENADE_KIT.cost;
  w.kit = true; w.gCooldown = 0; w.spent += GRENADE_KIT.cost;
  return { ok: true };
}

export function placeObstacle(sim, cell, type) {
  const check = canPlace(sim, cell, type);
  if (!check.ok) return check;
  sim.cash -= OBSTACLES[type].cost;
  putObstacle(sim, cell, type);
  sim.route.rebuild(sim.obstacles);
  return { ok: true };
}
function canPlace(sim, cell, type, n = 1) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  if (!sim.route.validCell(cell)) return { ok: false, reason: 'okänd' };
  if (n === 1 && sim.obstacles[cell]) return { ok: false, reason: 'upptagen' };
  if (!OBSTACLES[type] || !obstacleUnlocked(type, sim.research, sim.map)) return { ok: false, reason: 'ej upplåst' };
  if (n < 1) return { ok: false, reason: 'upptagen' };
  if (sim.cash < OBSTACLES[type].cost * n) return { ok: false, reason: 'pengar' };
  return { ok: true };
}
function putObstacle(sim, cell, type, line = null) {
  const o = OBSTACLES[type];
  if (o.kind === 'slow') {
    const dur = wireDurability(sim.research);
    sim.obstacles[cell] = { type, durability: dur, maxDurability: dur };
  } else {
    const hp = blockHp(sim.research);
    sim.obstacles[cell] = { type, hp, maxHp: hp };
  }
  if (line != null) sim.obstacles[cell].line = line;
}

// Rutorna som en spärr tvärs över gatan genom cell skulle ta (lediga, giltiga). På E4 (ingen
// gatubredd i rutor) bara rutan själv.
export function acrossCells(sim, cell) {
  if (!sim.route.span) return sim.route.validCell(cell) && !sim.obstacles[cell] ? [cell] : [];
  return sim.route.span(cell).filter(k => sim.route.validCell(k) && !sim.obstacles[k]);
}
// Spärr tvärs över gatan: samma hinder i varje ledig ruta över gatans bredd, betalt per ruta,
// allt eller inget. Rutorna hör ihop (line) och rivs tillsammans.
export function placeAcross(sim, cell, type) {
  if (!sim.route.span) return placeObstacle(sim, cell, type);
  const keys = acrossCells(sim, cell);
  const check = canPlace(sim, cell, type, keys.length);
  if (!check.ok) return check;
  const line = sim.nextLine++;
  for (const k of keys) { sim.cash -= OBSTACLES[type].cost; putObstacle(sim, k, type, line); }
  sim.route.rebuild(sim.obstacles);
  return { ok: true, cells: keys };
}
// Riva: hela spärren om hindret hör till en (line), annars bara rutan. Helt hinder ger halva priset.
export function removeObstacle(sim, cell) {
  if (!sim.route.validCell(cell)) return { ok: false, refund: 0 };
  const ob = sim.obstacles[cell];
  if (!canAct(sim) || !ob) return { ok: false, refund: 0 };
  const keys = ob.line != null ? Object.keys(sim.obstacles).filter(k => sim.obstacles[k].line === ob.line) : [String(cell)];
  let refund = 0;
  for (const k of keys) { refund += obstacleRefund(sim.obstacles[k]); delete sim.obstacles[k]; }
  sim.cash += refund;
  sim.route.rebuild(sim.obstacles);
  return { ok: true, refund };
}

function fireWeapons(sim, dt) {
  for (const s of sim.slots) {
    const w = s.weapon; if (!w) continue;
    const st = weaponStats(w.type, w.level, sim.research);
    let target = null, best = -Infinity;
    for (const z of sim.zombies) {
      if (z.dead) continue;
      const p = zombiePos(sim, z);
      const pr = sim.route.progress(z);
      if (Math.hypot(p.x - s.x, p.z - s.z) <= st.range && pr > best) { best = pr; target = z; }
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
// Granater: en position med granatlåda kastar själv när minst minCount zombier, eller en
// bjässe, är inom räckhåll. Siktet läggs där flest hamnar inom radien (bjässar väger tre),
// med zombiernas gång under flygtiden inräknad. Andra granaten (nivå III) tar nästa klunga.
function throwGrenades(sim, dt) {
  const gs = grenadeStats(sim.research);
  if (!gs) return;
  for (const s of sim.slots) {
    const w = s.weapon;
    if (!w || !w.kit) continue;
    w.gCooldown = Math.max(0, w.gCooldown - dt);
    if (w.gCooldown > 0) continue;
    const near = [];
    for (const z of sim.zombies) {
      if (z.dead) continue;
      const p = zombiePos(sim, z);
      if (Math.hypot(p.x - s.x, p.z - s.z) > gs.range) continue;
      const lead = z.attacking ? 0 : (z.v ?? ZOMBIES[z.type].speed) * gs.flight;
      near.push({ z, aim: sim.route.ahead(z, lead), pr: sim.route.progress(z), wt: z.type === 'brute' ? 3 : 1 });
    }
    if (!near.length) continue;
    if (near.length < gs.minCount && !near.some(n => n.z.type === 'brute')) continue;
    const covered = new Set();
    for (let c = 0; c < gs.count; c++) {
      let best = null, bestScore = 0;
      for (const n of near) {
        let score = 0;
        for (const m of near) if (!covered.has(m) && Math.hypot(m.aim.x - n.aim.x, m.aim.z - n.aim.z) <= gs.radius) score += m.wt;
        if (score > bestScore || (score === bestScore && best && n.pr > best.pr)) { best = n; bestScore = score; }
      }
      if (!best) break;
      for (const m of near) if (Math.hypot(m.aim.x - best.aim.x, m.aim.z - best.aim.z) <= gs.radius) covered.add(m);
      sim.grenades.push({ slotId: s.id, x: best.aim.x, z: best.aim.z, left: gs.flight, damage: gs.damage, r: gs.radius, falloff: gs.falloff });
      sim.events.push({ t: 'grenade', slotId: s.id, x: best.aim.x, z: best.aim.z, flight: gs.flight });
    }
    w.gCooldown = gs.cooldown;
  }
}
// Granaten landar: skada inom radien, avtagande ut mot kanten.
function landGrenades(sim, dt) {
  if (!sim.grenades.length) return;
  for (const g of sim.grenades) g.left -= dt;
  const landed = sim.grenades.filter(g => g.left <= 1e-6);
  if (!landed.length) return;
  sim.grenades = sim.grenades.filter(g => g.left > 1e-6);
  for (const g of landed) {
    sim.events.push({ t: 'blast', x: g.x, z: g.z, r: g.r });
    for (const z of sim.zombies) {
      if (z.dead) continue;
      const p = zombiePos(sim, z);
      const dist = Math.hypot(p.x - g.x, p.z - g.z);
      if (dist <= g.r) damage(sim, z, g.damage * (1 - g.falloff * dist / g.r), p);
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

// Hinder på vägen, nycklade på rutans nyckel. Returnerar multiplikatorn för zombiens fart denna
// frame. hitCells: rutor som redan fått en obstacleHit under detta steg. Ett sönderslaget hinder
// gör att rutten räknas om (rutnätet väljer då vägen genom luckan).
function obstacleEffect(sim, z, dt, hitCells) {
  const def = ZOMBIES[z.type], route = sim.route;
  let mul = 1, broke = false;
  for (const i of route.obstacleKeys(sim.obstacles)) {
    const ob = sim.obstacles[i]; if (!ob) continue;
    const o = OBSTACLES[ob.type];
    if (o.kind === 'slow' && route.inCell(z, i)) {
      // slowTaken: hur mycket av inbromsningen zombien känner (1 = hela, bjässen bara en del).
      mul = Math.min(mul, 1 - (1 - o.slow) * (def.slowTaken ?? 1));
      ob.durability -= dt;
      if (ob.durability <= 0) { delete sim.obstacles[i]; broke = true; sim.events.push({ t: 'obstacleBroken', cell: i, type: ob.type }); }
    }
    // Blocket stoppar även zombier som skulle passera det i ett enda steg (stort dt).
    const c = o.kind === 'block' ? route.blockContact(z, i, def.speed * dt) : null;
    if (c) {
      mul = 0; if (c.crosses) route.stopAt(z, i); z.attacking = true;
      ob.hp -= def.hitDamage * dt;
      if (!hitCells.has(i)) { hitCells.add(i); sim.events.push({ t: 'obstacleHit', cell: i }); }
      if (ob.hp <= 0) { delete sim.obstacles[i]; broke = true; sim.events.push({ t: 'obstacleBroken', cell: i, type: ob.type }); }
    }
  }
  if (broke) route.rebuild(sim.obstacles);
  if (mul > 0) z.attacking = false;
  return mul;
}
