import { ZOMBIES } from '../data/zombies.js';
import { WEAPONS, GRENADE_KIT, PIERCE_WIDTH } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { makeRng } from './rng.js';
import { routeFor } from './route.js';
import { weaponStats, weaponUnlocked, upgradeCost, obstacleUnlocked, weaponRefund, lineRefund, grenadeStats, launcherStats, wireDurability, blockHp, maxGuns, MAX_LEVEL } from './stats.js';
import { placementFor, sightFrom, roofSightFrom, roofAt, KIND, KIND_REASON, MIN_SPACING } from './placement.js';
import { SQUAD, isSquad, squadSize, soldierHp, planSquad, makeSoldier, unionSight, runTime } from './squad.js';

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
    // Utställda vapen: { id, x, z, cell, weapon, sight }. sight: synliga gångbara rutor (mask och lista).
    place: placementFor(map), guns: [], nextGun: 1, maxGuns: maxGuns(res),
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

// Zombier som är kvar av vågorna som är igång: levande plus de som ännu inte kommit fram.
export const waveLeft = sim => sim.spawnQueue.length + sim.zombies.filter(z => !z.dead).length;

// Next wave: under nedräkningen eller mitt i en våg. Vågornas spawn läggs ihop.
// stack: false vägrar mitt i en våg så länge zombier är kvar ({ ok: false, reason: 'kvar', left }),
// så att ett vanligt tryck inte staplar vågor av misstag. Spelaren staplar med knappen eller
// Shift+Space (stack: true, standard för policyerna).
export function callNextWave(sim, { stack = true } = {}) {
  if (!canAct(sim) || !hasNextWave(sim)) return { ok: false, bonus: 0 };
  if (!stack && sim.phase === 'wave') {
    const left = waveLeft(sim);
    if (left > 0) return { ok: false, bonus: 0, reason: 'kvar', left };
  }
  const bonus = earlyBonus(sim);
  const index = launch(sim);
  if (bonus) { sim.cash += bonus; sim.events.push({ t: 'earlyBonus', amount: bonus, index }); }
  return { ok: true, bonus, index };
}

// group.spawn väljer ingång på banor med flera (standard: den första). dayCfg.hp: dagens
// hp-faktor för alla zombier (banans data, standard 1), så att en senare bana kan möta en spelare
// med mer forskning utan fler zombier i bild.
function spawn(sim, { type, wave, spawn: spawnId }) {
  const id = sim.nextId++;
  const hp = ZOMBIES[type].hp * (sim.dayCfg.hp ?? 1);
  const z = { id, type, wave, hp, maxHp: hp, ...sim.route.spawn(sim.rng, spawnId, id), wob: sim.rng() * 6, dead: false, deadT: 0, blockedBy: null, breached: false, attacking: false };
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
    runSoldiers(sim, dt);
    landGrenades(sim, dt);
    ageCorpses(sim, dt);
    if (sim.nextWaveIn <= 1e-6) launch(sim);
    return;
  }
  if (sim.phase !== 'wave') return;
  sim.time += dt;
  while (sim.spawnQueue.length && sim.spawnQueue[0].at <= sim.time) spawn(sim, sim.spawnQueue.shift());
  runSoldiers(sim, dt);
  moveZombies(sim, dt);
  const cells = zombieCells(sim);
  fireWeapons(sim, dt, cells);
  fireLaunchers(sim, dt, cells);
  landGrenades(sim, dt);
  throwGrenades(sim, dt, cells);
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
  const troops = activeSoldiers(sim), hurt = new Set();
  for (const z of sim.zombies) {
    if (z.dead) continue;
    const def = ZOMBIES[z.type];
    let mul = obstacleEffect(sim, z, dt, hitCells);
    // Hemvärnet: en zombie som når en soldat stannar och slår honom (bara soldaterna, pjäserna
    // är som förut). Närmaste soldat inom SQUAD.melee, lika: den som kom först i listan.
    z.foe = null;
    if (troops.length) {
      const p = zombiePos(sim, z);
      let foe = null, fd = SQUAD.melee + 1e-9;
      for (const t of troops) { if (t.s.down) continue; const d = Math.hypot(t.s.x - p.x, t.s.z - p.z); if (d < fd) { fd = d; foe = t; } }
      if (foe) {
        mul = 0; z.attacking = true; z.foe = [foe.s.x, foe.s.z];
        hitSoldier(sim, foe.g, foe.s, def.hitDamage * dt, hurt);
      }
    }
    const speed = def.speed * mul;
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

// ---------- Hemvärnet ----------
// Soldaterna springer ut från markeringen (run sekunder) och är med först när de är framme.
function runSoldiers(sim, dt) {
  for (const g of sim.guns) if (g.squad) for (const s of g.soldiers) if (s.run > 0) s.run = Math.max(0, s.run - dt);
}
function activeSoldiers(sim) {
  const out = [];
  for (const g of sim.guns) if (g.squad) for (const s of g.soldiers) if (!s.down && s.run <= 0) out.push({ g, s });
  return out;
}
function hitSoldier(sim, g, s, amount, hurt) {
  s.hp -= amount;
  const key = g.id + ':' + s.i;
  if (!hurt.has(key)) { hurt.add(key); sim.events.push({ t: 'soldierHit', gunId: g.id, soldier: s.i, x: s.x, z: s.z }); }
  if (s.hp <= 0 && !s.down) {
    s.hp = 0; s.down = true; s.targetId = null;
    sim.events.push({ t: 'soldierDown', gunId: g.id, soldier: s.i, x: s.x, z: s.z });
  }
}
// Gruppens val av rutor för markeringen i key, sparat så att spöket, kollen och bygget inte räknar
// om samma sak (nyckeln: rutan, pjäserna och hindren).
function squadPlanAt(sim, key, type) {
  const sig = `${type}|${key}|${sim.guns.map(g => g.id + (g.squad ? ':' + g.soldiers.length : '')).join(',')}|${Object.keys(sim.obstacles).join(',')}`;
  if (sim.squadPlan?.sig === sig) return sim.squadPlan.plan;
  const plan = planSquad(sim, key, { type, count: squadSize(1) });
  sim.squadPlan = { sig, plan };
  return plan;
}
export const squadPreview = (sim, key, type = 'hv') => (sim.place.valid(key) ? squadPlanAt(sim, key, type) : []);
// Ersätter gruppens stupade soldater (panelen): SQUAD.reinforce per soldat. De springer ut från
// markeringen igen med fullt liv. (Nästa dag börjar alla om ändå.)
export function reinforce(sim, id) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id);
  if (!g?.squad) return { ok: false, reason: 'okänd' };
  const down = g.soldiers.filter(s => s.down);
  if (!down.length) return { ok: false, reason: 'hela' };
  const cost = down.length * SQUAD.reinforce;
  if (sim.cash < cost) return { ok: false, reason: 'pengar' };
  sim.cash -= cost; g.weapon.spent += cost;
  for (const s of down) { s.down = false; s.hp = s.maxHp; s.run = runTime(Math.hypot(s.x - g.x, s.z - g.z)); s.cooldown = 0; s.targetId = null; }
  sim.events.push({ t: 'reinforce', gunId: g.id, count: down.length });
  return { ok: true, cost, count: down.length };
}
export const reinforceCost = g => (g?.squad ? g.soldiers.filter(s => s.down).length * SQUAD.reinforce : 0);

// Bygga, uppgradera, sälja och lägga hinder går när som helst under dagen, även mitt i en våg.
// Bara när dagen är slut (vunnen eller förlorad) är det stängt.
export const canAct = sim => sim.phase === 'build' || sim.phase === 'wave';

// ---------- vapen ----------
const gunOf = (sim, id) => sim.guns.find(g => g.id === id);

// Går det att ställa ett vapen i rutan key? Skälen i ordning: dagen slut, fullt, utanför
// kartan, rutans innehåll (gata, hus, skog ...), för nära ett annat vapen. type: vapnet som ska
// stå där. Ett vapen med roof (Psg 90) får också stå på ett hustak (en husruta med takhöjd).
export const onRoof = (sim, key, type) => !!WEAPONS[type]?.roof && sim.place.kind[key] === KIND.house && roofAt(sim.place, key) > 0;
export function checkSpot(sim, key, type = null) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  if (sim.guns.length >= sim.maxGuns) return { ok: false, reason: 'fullt' };
  const p = sim.place;
  if (!p.valid(key)) return { ok: false, reason: 'utanför' };
  const kind = p.kind[key];
  if (kind !== KIND.open && !onRoof(sim, key, type)) return { ok: false, reason: kind === KIND.house && WEAPONS[type]?.roof ? 'kant' : KIND_REASON[kind] || 'okänd' };
  const c = p.center(key);
  if (sim.guns.some(g => Math.hypot(g.x - c.x, g.z - c.z) < MIN_SPACING - 1e-9)) return { ok: false, reason: 'nära' };
  // Hemvärnet: en pjäs står inte i en soldats ruta, och gruppen behöver rum för alla.
  if (isSquad(type)) { if (squadPlanAt(sim, key, type).length < squadSize(1)) return { ok: false, reason: 'trångt' }; }
  else if (sim.guns.some(g => g.squad && g.soldiers.some(s => Math.hypot(s.x - c.x, s.z - c.z) < SQUAD.gunGap - 1e-9))) return { ok: false, reason: 'nära' };
  return { ok: true };
}
// Rutan under en punkt på marken, eller -1 utanför kartan.
export const spotAt = (sim, x, z) => sim.place.keyAt(x, z);
// Sikten från en ruta för ett vapen av typen (största räckvidden, nivå 3). På ett tak ser
// skytten över husen (placement.js, roofSightFrom).
export const sightFor = (sim, key, type) => (isSquad(type) ? unionSight(sim.place, squadPreview(sim, key, type))
  : (onRoof(sim, key, type) ? roofSightFrom : sightFrom)(sim.place, key, weaponStats(type, MAX_LEVEL, sim.research).range));

// Ställ ut ett vapen i rutan key. Returnerar { ok, id }.
export function build(sim, key, type) {
  if (!WEAPONS[type]) return { ok: false, reason: 'okänd' };
  const check = checkSpot(sim, key, type);
  if (!check.ok) return check;
  if (!weaponUnlocked(type, sim.research, sim.map)) return { ok: false, reason: 'ej upplåst' };
  const cost = WEAPONS[type].cost;
  if (sim.cash < cost) return { ok: false, reason: 'pengar' };
  sim.cash -= cost;
  const c = sim.place.center(key);
  const id = 'g' + sim.nextGun++;
  // y: takets höjd för en pjäs på ett tak (0 på marken). roof: står på ett tak.
  const roof = onRoof(sim, key, type);
  if (isSquad(type)) {
    // Gruppen: markeringen står i key, soldaterna i sina valda rutor (squad.js).
    const plan = squadPlanAt(sim, key, type);
    const soldiers = plan.map((pc, i) => makeSoldier(pc, i, 1, c));
    sim.guns.push({ id, x: c.x, z: c.z, y: 0, roof: false, cell: key, squad: true, soldiers, sight: unionSight(sim.place, soldiers),
      weapon: { type, level: 1, cooldown: 0, angle: soldiers[0]?.face ?? Math.PI, targetId: null, spent: cost } });
    return { ok: true, id };
  }
  sim.guns.push({ id, x: c.x, z: c.z, y: roof ? roofAt(sim.place, key) : 0, roof, cell: key, sight: sightFor(sim, key, type),
    weapon: { type, level: 1, cooldown: 0, angle: Math.PI, targetId: null, spent: cost, ...(WEAPONS[type].launcher ? { lCooldown: 0 } : {}) } });
  return { ok: true, id };
}
export function upgrade(sim, id) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id);
  if (!g) return { ok: false, reason: 'okänd' };
  const w = g.weapon;
  const cost = upgradeCost(w.type, w.level);
  if (cost == null) return { ok: false, reason: 'max' };
  if (sim.cash < cost) return { ok: false, reason: 'pengar' };
  sim.cash -= cost; w.level++; w.spent += cost;
  if (g.squad) growSquad(sim, g);
  return { ok: true };
}
// Hemvärnet efter en uppgradering: mer liv till alla, och en soldat till om nivån ger det (han
// väljer den bästa lediga rutan med de andra på plats; finns ingen blir gruppen som den var).
function growSquad(sim, g) {
  const hp = soldierHp(g.weapon.level);
  for (const s of g.soldiers) { const add = hp - s.maxHp; s.maxHp = hp; if (!s.down) s.hp += add; }
  const want = squadSize(g.weapon.level) - g.soldiers.length;
  if (want <= 0) return;
  const mine = g.soldiers;
  // de egna soldaterna räknas som fasta (inte som andra gruppers), så att planen inte stängs ute
  g.soldiers = [];
  const add = planSquad(sim, g.cell, { type: g.weapon.type, count: want, fixed: mine });
  g.soldiers = mine;
  for (const pc of add) mine.push(makeSoldier(pc, mine.length, g.weapon.level, g));
  g.sight = unionSight(sim.place, mine);
}
// Sälj: vapnet tas bort och platsen blir ledig.
export function sell(sim, id) {
  if (!canAct(sim)) return { ok: false, refund: 0 };
  const i = sim.guns.findIndex(g => g.id === id);
  if (i < 0) return { ok: false, refund: 0 };
  const refund = weaponRefund(sim.guns[i].weapon);
  sim.cash += refund;
  sim.guns.splice(i, 1);
  return { ok: true, refund };
}
// Granatlåda till ett utställt vapen. Kräver forskningen Grenades. Följer med i sälj (spent).
export function buyKit(sim, id) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id);
  if (!g) return { ok: false, reason: 'okänd' };
  const w = g.weapon;
  if (g.squad) return { ok: false, reason: 'okänd' };
  if (!grenadeStats(sim.research)) return { ok: false, reason: 'ej upplåst' };
  if (w.kit) return { ok: false, reason: 'redan' };
  if (sim.cash < GRENADE_KIT.cost) return { ok: false, reason: 'pengar' };
  sim.cash -= GRENADE_KIT.cost;
  w.kit = true; w.gCooldown = 0; w.spent += GRENADE_KIT.cost;
  return { ok: true };
}

export function placeObstacle(sim, cell, type) {
  const check = canPlace(sim, cell, type, [cell]);
  if (!check.ok) return check;
  sim.cash -= OBSTACLES[type].cost;
  putObstacle(sim, cell, type);
  sim.route.rebuild(sim.obstacles);
  return { ok: true };
}
// keys: rutorna hindret tar (en spärr över gatan: alla lediga rutor över bredden).
function canPlace(sim, cell, type, keys) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  if (!sim.route.validCell(cell)) return { ok: false, reason: 'okänd' };
  if (keys.length === 1 && keys[0] === cell && sim.obstacles[cell]) return { ok: false, reason: 'upptagen' };
  if (!OBSTACLES[type] || !obstacleUnlocked(type, sim.research, sim.map)) return { ok: false, reason: 'ej upplåst' };
  if (keys.length < 1) return { ok: false, reason: 'upptagen' };
  // En spärr på levande zombier skulle låsa in dem i betongen: nekas.
  if (OBSTACLES[type].kind === 'block' && zombiesIn(sim, keys)) return { ok: false, reason: 'zombier' };
  if (sim.cash < OBSTACLES[type].cost) return { ok: false, reason: 'pengar' };
  return { ok: true };
}
// Står någon levande zombie i någon av rutorna?
export const zombiesIn = (sim, keys) => sim.zombies.some(z => !z.dead && keys.some(k => sim.route.inCell(z, k)));
// Kan hindret läggas här just nu (spärren över gatan på Gnesta)? Samma svar som placeAcross ger.
export function checkObstacle(sim, cell, type) {
  return canPlace(sim, cell, type, sim.route.span ? acrossCells(sim, cell) : [cell]);
}
// paid: rutans del av priset (en spärr delar sitt pris lika på sina rutor), så att återbetalningen
// blir halva det man betalade för hela spärren.
function putObstacle(sim, cell, type, line = null, paid = OBSTACLES[type].cost) {
  const o = OBSTACLES[type];
  if (o.kind === 'slow') {
    const dur = wireDurability(sim.research);
    sim.obstacles[cell] = { type, durability: dur, maxDurability: dur };
  } else {
    const hp = blockHp(sim.research);
    sim.obstacles[cell] = { type, hp, maxHp: hp };
  }
  if (line != null) { sim.obstacles[cell].line = line; sim.obstacles[cell].paid = paid; }
}

// Rutorna som en spärr tvärs över gatan genom cell skulle ta (lediga, giltiga). På E4 (ingen
// gatubredd i rutor) bara rutan själv.
export function acrossCells(sim, cell) {
  if (!sim.route.span) return sim.route.validCell(cell) && !sim.obstacles[cell] ? [cell] : [];
  return sim.route.span(cell).filter(k => sim.route.validCell(k) && !sim.obstacles[k]);
}
// Spärr tvärs över gatan: samma hinder i varje ledig ruta över gatans bredd, till ett fast pris
// per spärr (hindrets pris, hur bred gatan än är), allt eller inget. Rutorna hör ihop (line) och
// rivs tillsammans.
export function placeAcross(sim, cell, type) {
  if (!sim.route.span) return placeObstacle(sim, cell, type);
  const keys = acrossCells(sim, cell);
  const check = canPlace(sim, cell, type, keys);
  if (!check.ok) return check;
  const line = sim.nextLine++, cost = OBSTACLES[type].cost;
  sim.cash -= cost;
  for (const k of keys) putObstacle(sim, k, type, line, cost / keys.length);
  sim.route.rebuild(sim.obstacles);
  return { ok: true, cells: keys, cost };
}
// Riva: hela spärren om hindret hör till en (line), annars bara rutan. Hel spärr ger halva priset.
export function removeObstacle(sim, cell) {
  if (!sim.route.validCell(cell)) return { ok: false, refund: 0 };
  const ob = sim.obstacles[cell];
  if (!canAct(sim) || !ob) return { ok: false, refund: 0 };
  const keys = ob.line != null ? Object.keys(sim.obstacles).filter(k => sim.obstacles[k].line === ob.line) : [String(cell)];
  const refund = lineRefund(keys.map(k => sim.obstacles[k]));
  for (const k of keys) delete sim.obstacles[k];
  sim.cash += refund;
  sim.route.rebuild(sim.obstacles);
  return { ok: true, refund };
}

// Siktet: bara zombier som står i en ruta vapnet ser, inom räckhåll. Av dem den som har minst
// kvar att gå (barrikadens straff räknas inte). Zombiens ruta slås upp en gång per steg.
function zombieCells(sim) {
  const out = new Map();
  for (const z of sim.zombies) if (!z.dead) { const p = zombiePos(sim, z); out.set(z, { p, k: sim.place.keyAt(p.x, p.z) }); }
  return out;
}
function fireWeapons(sim, dt, cells) {
  for (const s of sim.guns) {
    if (s.squad) { fireSquad(sim, dt, cells, s); continue; }
    const w = s.weapon, seen = s.sight.mask;
    const st = weaponStats(w.type, w.level, sim.research);
    let target = null, best = -Infinity;
    for (const [z, { p, k }] of cells) {
      if (z.dead || k < 0 || !seen[k]) continue;
      if (Math.hypot(p.x - s.x, p.z - s.z) > st.range) continue;
      const pr = sim.route.progress(z);
      if (pr > best) { best = pr; target = z; }
    }
    w.targetId = target ? target.id : null;
    w.cooldown -= dt;
    if (!target) { w.cooldown = Math.max(w.cooldown, 0); continue; }
    const p = zombiePos(sim, target);
    w.angle = Math.atan2(p.z - s.z, p.x - s.x);
    while (w.cooldown <= 0) {
      w.cooldown += 1 / st.rate;
      const hit = sim.rng() < st.accuracy;
      sim.events.push({ t: 'shot', gunId: s.id, targetId: target.id, hit, x: p.x, z: p.z });
      if (hit) damage(sim, target, st.damage, p);
      if (hit && st.pierce > 1) pierce(sim, s, target, p, st, cells);
      if (target.dead) break;
    }
  }
}
// Hemvärnet: varje soldat siktar själv med sin egen sikt och samma regel som pjäserna (den
// zombie i en synlig ruta inom räckhåll som kommit längst). Stupade och de som springer skjuter inte.
function fireSquad(sim, dt, cells, g) {
  const st = weaponStats(g.weapon.type, g.weapon.level, sim.research);
  for (const s of g.soldiers) {
    s.cooldown -= dt;
    if (s.down || s.run > 0) { s.targetId = null; s.cooldown = Math.max(s.cooldown, 0); continue; }
    const seen = s.sight.mask;
    let target = null, best = -Infinity;
    for (const [z, { p, k }] of cells) {
      if (z.dead || k < 0 || !seen[k]) continue;
      if (Math.hypot(p.x - s.x, p.z - s.z) > st.range) continue;
      const pr = sim.route.progress(z);
      if (pr > best) { best = pr; target = z; }
    }
    s.targetId = target ? target.id : null;
    if (!target) { s.cooldown = Math.max(s.cooldown, 0); continue; }
    const p = zombiePos(sim, target);
    s.angle = Math.atan2(p.z - s.z, p.x - s.x);
    while (s.cooldown <= 0) {
      s.cooldown += 1 / st.rate;
      const hit = sim.rng() < st.accuracy;
      sim.events.push({ t: 'shot', gunId: g.id, soldier: s.i, targetId: target.id, hit, x: p.x, z: p.z, sx: s.x, sz: s.z });
      if (hit) damage(sim, target, st.damage, p);
      if (target.dead) break;
    }
  }
}
// Psg 90: kulan går igenom målet och träffar upp till pierce - 1 till bakom det, i skottlinjen
// (inom PIERCE_WIDTH m från linjen, längre bort än målet, inom räckvidd och synliga), närmast
// först. Samma skada på alla.
function pierce(sim, s, target, p, st, cells) {
  const dx = p.x - s.x, dz = p.z - s.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
  const behind = [];
  for (const [z, { p: q, k }] of cells) {
    if (z === target || z.dead || k < 0 || !s.sight.mask[k]) continue;
    const along = (q.x - s.x) * ux + (q.z - s.z) * uz;
    if (along <= L || along > st.range) continue;
    if (Math.abs((q.x - s.x) * uz - (q.z - s.z) * ux) > PIERCE_WIDTH) continue;
    behind.push({ z, q, along });
  }
  behind.sort((a, b) => a.along - b.along || a.z.id - b.z.id);
  for (const b of behind.slice(0, st.pierce - 1)) {
    sim.events.push({ t: 'pierce', gunId: s.id, targetId: b.z.id, x: b.q.x, z: b.q.z });
    damage(sim, b.z, st.damage, b.q);
  }
}
// Granater: ett vapen med granatlåda kastar själv när minst minCount zombier, eller en
// bjässe, är inom räckhåll och syns (samma sikt som vapnet). Siktet läggs där flest hamnar inom radien (bjässar väger tre),
// med zombiernas gång under flygtiden inräknad. Andra granaten (nivå III) tar nästa klunga.
function throwGrenades(sim, dt, cells) {
  const gs = grenadeStats(sim.research);
  if (!gs) return;
  for (const s of sim.guns) {
    const w = s.weapon;
    if (!w.kit) continue;
    w.gCooldown = Math.max(0, w.gCooldown - dt);
    if (w.gCooldown > 0) continue;
    const near = [];
    for (const [z, { p, k }] of cells) {
      if (z.dead || k < 0 || !s.sight.mask[k]) continue;
      if (Math.hypot(p.x - s.x, p.z - s.z) > gs.range) continue;
      const lead = z.attacking ? 0 : (z.v ?? ZOMBIES[z.type].speed) * gs.flight;
      near.push({ z, aim: sim.route.ahead(z, lead), pr: sim.route.progress(z), wt: z.type === 'brute' ? 3 : 1 });
    }
    if (!near.length) continue;
    if (near.length < gs.minCount && !near.some(n => n.z.type === 'brute')) continue;
    for (const best of aimClusters(near, gs.radius, gs.count)) {
      sim.grenades.push({ gunId: s.id, x: best.aim.x, z: best.aim.z, left: gs.flight, damage: gs.damage, r: gs.radius, falloff: gs.falloff });
      sim.events.push({ t: 'grenade', gunId: s.id, x: best.aim.x, z: best.aim.z, flight: gs.flight });
    }
    w.gCooldown = gs.cooldown;
  }
}
// Siktet för granater: där flest hamnar inom radien (bjässar väger tre), lika: den som kommit
// längst. Nästa granat tar nästa klunga. near: [{ z, aim, pr, wt }].
function aimClusters(near, radius, count) {
  const covered = new Set(), out = [];
  for (let c = 0; c < count; c++) {
    let best = null, bestScore = 0;
    for (const n of near) {
      let score = 0;
      for (const m of near) if (!covered.has(m) && Math.hypot(m.aim.x - n.aim.x, m.aim.z - n.aim.z) <= radius) score += m.wt;
      if (score > bestScore || (score === bestScore && best && n.pr > best.pr)) { best = n; bestScore = score; }
    }
    if (!best) break;
    for (const m of near) if (Math.hypot(m.aim.x - best.aim.x, m.aim.z - best.aim.z) <= radius) covered.add(m);
    out.push(best);
  }
  return out;
}
// Granattillsatsen (Ak 5): en 40 mm-granat var cooldown:e sekund mot den tätaste klungan som
// vapnet ser inom range, när minst minCount zombier (eller en bjässe) är där. Granaten flyger
// flight sekunder och landar som kitets granater (landGrenades), med kind 'grt'.
function fireLaunchers(sim, dt, cells) {
  for (const s of sim.guns) {
    const w = s.weapon;
    if (w.lCooldown == null) continue;
    w.lCooldown = Math.max(0, w.lCooldown - dt);
    if (w.lCooldown > 0) continue;
    const ls = launcherStats(w.type, w.level, sim.research);
    const near = [];
    for (const [z, { p, k }] of cells) {
      if (z.dead || k < 0 || !s.sight.mask[k]) continue;
      if (Math.hypot(p.x - s.x, p.z - s.z) > ls.range) continue;
      const lead = z.attacking ? 0 : (z.v ?? ZOMBIES[z.type].speed) * ls.flight;
      near.push({ z, aim: sim.route.ahead(z, lead), pr: sim.route.progress(z), wt: z.type === 'brute' ? 3 : 1 });
    }
    if (!near.length || (near.length < ls.minCount && !near.some(n => n.z.type === 'brute'))) continue;
    const [best] = aimClusters(near, ls.radius, 1);
    sim.grenades.push({ gunId: s.id, kind: 'grt', x: best.aim.x, z: best.aim.z, left: ls.flight, damage: ls.damage, r: ls.radius, falloff: ls.falloff });
    sim.events.push({ t: 'launch', gunId: s.id, x: best.aim.x, z: best.aim.z, flight: ls.flight });
    w.lCooldown = ls.cooldown;
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
    sim.events.push({ t: 'blast', x: g.x, z: g.z, r: g.r, ...(g.kind ? { kind: g.kind } : {}) });
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
