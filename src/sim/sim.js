import { ZOMBIES } from '../data/zombies.js';
import { WEAPONS, GRENADE_KIT, PIERCE_WIDTH } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { makeRng } from './rng.js';
import { routeFor } from './route.js';
import { weaponStats, weaponUnlocked, upgradeCost, obstacleUnlocked, weaponRefund, lineRefund, grenadeStats, launcherStats, wireDurability, blockHp, maxGuns, maxSquads, MAX_LEVEL } from './stats.js';
import { placementFor, sightFrom, roofSightFrom, roofAt, KIND, KIND_REASON, MIN_SPACING, coneSight, bestFacing } from './placement.js';
import { emplacement } from './emplace.js';
import { SQUAD, isSquad, squadSize, soldierHp, planSquad, makeSoldier, unionSight, runTime, hordeWeight, inArc, RISE_TIME, SETTLE_TIME } from './squad.js';

export const WAVE_INTEL = 2;      // forskning per klarad våg
// Överlevarnas lärdom (0.10.1): ett förlorat försök ger alltid minst så mycket forskning (dödade,
// klarade vågor och lärdomen tillsammans), så att en förlust räcker till en nyttig nivå (Heavy wire
// I kostar 50, Faster Ksp 90 I 40, Grenades I 60). Restart day och Main menu ger ingenting (abandonDay).
export const LESSON_MIN = 60;
export { CELL_LEN } from './cells.js';
// Nästa våg: nedräkning efter en klarad våg, och bonus för att kalla den tidigt.
// 0.10.1: 10 s (var 5, speltestet hann inte bygga om); bonusen per sekund sänkt så att en hel
// nedräkning är värd ungefär lika mycket som förut.
// 0.10.2: 15 s (speltestet av 0.10.1: 10 s räckte till ett köp). Bonusen 2 per sekund, så att en hel
// nedräkning fortfarande är värd 30 och Next wave tidigt är det snabba valet med bonus.
export const COUNTDOWN = 15;        // sekunder från klarad våg till nästa startar av sig själv
export const EARLY_PER_SEC = 2;     // pengar per sekund som sparas
export const EARLY_MAX_SPAWN = 5;   // mitt i en våg räknas högst så många sekunder kvarvarande spawn
// dayCfg.overlap (0.10.1, banor med långa vägar): nästa våg startar så många sekunder efter att
// föregående våg kommit ut helt, även om dess zombier fortfarande är på väg. Annars väntar den tills
// vågen är klar (COUNTDOWN). Klaras vågen före är nedräkningen minst COUNTDOWN.

// ---------- debugmenyns reglar (0.12.2) ----------
// tweaks: multiplikatorer som debugmenyn ändrar live (zombiernas hp och fart, antalet i varje grupp,
// pengar och forskning per död, nedräkningens sekunder, god mode). Standard är identitet: då räknar
// simuleringen exakt som förut (balansproven kör alltid utan tweaks, tests/tweaks.test.js).
// Lagras bara i 'horde.debug' i webbläsaren, aldrig i sparfilen.
export const IDENTITY_TWEAKS = Object.freeze({ hp: 1, speed: 1, count: 1, cash: 1, intel: 1, countdown: null, god: false });
export function normalizeTweaks(t) {
  const out = { ...IDENTITY_TWEAKS };
  if (!t || typeof t !== 'object') return out;
  for (const k of ['hp', 'speed', 'count', 'cash', 'intel']) { const v = Number(t[k]); if (Number.isFinite(v) && v > 0) out[k] = v; }
  const c = t.countdown == null || t.countdown === '' ? NaN : Number(t.countdown);
  if (Number.isFinite(c) && c >= 0) out.countdown = c;
  out.god = t.god === true;
  return out;
}
export const tweaksActive = t => !!t && (['hp', 'speed', 'count', 'cash', 'intel'].some(k => t[k] !== 1) || t.countdown != null || t.god === true);
const countdownOf = sim => sim.tweaks?.countdown ?? COUNTDOWN;

export function createSim({ map, day, cash, research = [], seed = 1, tweaks = null }) {
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
    place: placementFor(map), guns: [], nextGun: 1, maxGuns: maxGuns(res, map), maxSquads: maxSquads(res),
    obstacles: {}, grenades: [], nextLine: 1,
    // husen vars dörrar slagits upp i dag (vilande smittade, H101)
    burst: [],
    tweaks: normalizeTweaks(tweaks),
  };
}

// Zombiens läge och riktning. Rutten vet hur (polylinje för E4, rutnät för Gnesta).
export const zombiePos = (sim, z) => sim.route.place(z);

export const hasNextWave = sim => sim.wavesStarted < sim.dayCfg.waves.length;

// Vilande smittade i hus (0.12.0, H101): dayCfg.dormant = [{ house, count, type, wave, street, intel }].
// house: tomtens id (map.lots). När vågen wave (index, 0 = första) startar slås dörren upp och de
// väller ut en i taget (DORMANT_GAP s) på närmaste gata framför huset och följer flödet som alla
// andra. intel: false = ingen förvarning i dagintrot och ingen markering (överraskningen).
export const DORMANT_DELAY = 0.4, DORMANT_GAP = 0.45;
// Husets dörr (framsidans mitt, där lokal +z pekar mot gatan) och rutan de kommer ut på.
export function houseDoor(map, house, route) {
  const h = map.lots?.plots.find(p => p.id === house)?.house;
  if (!h) throw new Error('okänt hus ' + house);
  const fx = h.x + Math.sin(h.ry) * h.d / 2, fz = h.z + Math.cos(h.ry) * h.d / 2;
  const cell = route?.nearestCell ? route.nearestCell(fx, fz) : -1;
  return { x: fx, z: fz, ry: h.ry, cell };
}
function launch(sim) {
  const index = sim.wavesStarted;
  const wave = sim.dayCfg.waves[index];
  const kc = sim.tweaks?.count ?? 1;
  // debug: spawn count × (gruppens tid behålls; identitet = exakt dagens data)
  const nOf = n => kc === 1 ? n : Math.max(1, Math.round(n * kc));
  // 0.12.2: group.toast = en rad när gruppens första kommer (vändningen sent i en våg)
  for (const g of wave.groups) { const n = nOf(g.count), iv = kc === 1 ? g.interval : g.interval * g.count / n; for (let i = 0; i < n; i++) sim.spawnQueue.push({ at: sim.time + g.delay + i * iv, type: g.type, wave: index, spawn: g.spawn, ...(g.toast && i === 0 ? { toast: g.toast } : {}), ...(g.lead ? { lead: g.lead } : {}), ...(g.hp ? { hp: g.hp } : {}) }); }
  for (const d of sim.dayCfg.dormant ?? []) {
    if ((d.wave ?? 0) !== index) continue;
    const door = houseDoor(sim.map, d.house, sim.route);
    // 0.12.2: d.delay = sekunder in i vågen innan dörren slås upp (överraskningen sent i vågen)
    const dl = d.delay ?? 0;
    for (let i = 0; i < nOf(d.count); i++) sim.spawnQueue.push({ at: sim.time + dl + DORMANT_DELAY + i * DORMANT_GAP, type: d.type ?? 'walker', wave: index, door: d.house, cell: door.cell, ...(d.hp ? { hp: d.hp } : {}) });
    const ev = { t: 'dormantBurst', house: d.house, x: door.x, z: door.z, ry: door.ry, intel: d.intel !== false };
    if (dl > 0) (sim.pendingBursts ??= []).push({ at: sim.time + dl, ev });
    else { sim.burst.push(d.house); sim.events.push(ev); }
  }
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
  if (sim.nextWaveIn != null) return Math.ceil(sim.nextWaveIn - 1e-6) * EARLY_PER_SEC;
  const q = sim.spawnQueue;
  const spawnLeft = q.length ? Math.max(0, q[q.length - 1].at - sim.time) : 0;
  return Math.round(((sim.dayCfg.overlap ?? countdownOf(sim)) + Math.min(EARLY_MAX_SPAWN, spawnLeft)) * EARLY_PER_SEC);
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
// group.lead (0.10.2, tempot): gruppen har redan gått så många sekunder när den kommer (den kliver
// upp ur diket längre in längs vägen), så att första skottet kommer efter 15 till 20 s i stället för
// 35 till 45. Högst LEAD_MAX av vägen, så att de aldrig dyker upp vid pjäserna framför entrén.
export const LEAD_MAX = 0.5;
// Diset (0.11.0, Olas krav): ingångarna ligger i dimkanten utanför den skarpa ytan
// (map.surroundings.crisp). Där går horden FOG_SPEED gånger fortare, och farten ebbar ut mjukt över
// de sista FOG_RAMP metrarna in mot kanten, så att de kliver ur diset i vanlig takt. Så hålls tiden
// till första skottet kort utan att någon dyker upp mitt i kartan. Ren funktion av läget.
export const FOG_SPEED = 2.75, FOG_RAMP = 8;
export function fogFactor(map, x, z) {
  const c = map.surroundings?.crisp;
  if (!c || !map.grid) return 1;
  const out = Math.max(c.x0 - x, x - c.x1, c.z0 - z, z - c.z1);
  if (out <= 0) return 1;
  const t = Math.min(1, out / FOG_RAMP);
  return 1 + (FOG_SPEED - 1) * t * t * (3 - 2 * t);
}
// group.hp (0.11.0): gruppens egen hp-faktor i stället för dagens (Gnesta Norrs öppning: eftersläntrare).
function spawn(sim, { type, wave, spawn: spawnId, lead = 0, hp: hpK = null, door = null, cell = -1, toast = null }) {
  if (toast) sim.events.push({ t: 'groupToast', text: toast, wave });
  const id = sim.nextId++;
  const hp = ZOMBIES[type].hp * (hpK ?? sim.dayCfg.hp ?? 1) * (sim.tweaks?.hp ?? 1);
  // 0.12.0: de vilande kommer ut ur huset (door) på gatan framför det
  const at = door ? { ...sim.route.spawnAt(sim.rng, cell, id), house: door } : sim.route.spawn(sim.rng, spawnId, id);
  const z = { id, type, wave, hp, maxHp: hp, ...at, wob: sim.rng() * 6, dead: false, deadT: 0, blockedBy: null, breached: false, attacking: false };
  if (lead > 0) {
    const speed = ZOMBIES[type].speed * (sim.map.pace ?? 1) * (sim.tweaks?.speed ?? 1);
    const f0 = sim.route.fraction(z), stop = f0 + (1 - f0) * LEAD_MAX;
    // 0.11.0: på en bana med dis stannar försprånget i diset (ingen dyker upp mitt i kartan)
    const fog = sim.route.kind === 'grid' && sim.map.surroundings?.crisp;
    for (let left = lead * speed; left > 1e-9 && sim.route.fraction(z) < stop && (!fog || fogFactor(sim.map, z.x, z.z) >= FOG_SPEED - 1e-9); left -= 1) sim.route.advance(z, Math.min(1, left));
    z.lead = true;
  }
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
    runMoves(sim, dt);
    landGrenades(sim, dt);
    ageCorpses(sim, dt);
    if (sim.nextWaveIn <= 1e-6) launch(sim);
    return;
  }
  if (sim.phase !== 'wave') return;
  sim.time += dt;
  if (sim.pendingBursts?.length) for (const b of sim.pendingBursts.filter(q => q.at <= sim.time)) { sim.pendingBursts.splice(sim.pendingBursts.indexOf(b), 1); sim.burst.push(b.ev.house); sim.events.push(b.ev); }
  while (sim.spawnQueue.length && sim.spawnQueue[0].at <= sim.time) spawn(sim, sim.spawnQueue.shift());
  // Överlapp: nedräkningen till nästa våg börjar när vågen kommit ut helt.
  const ov = sim.dayCfg.overlap;
  if (ov != null && hasNextWave(sim) && !sim.spawnQueue.length) {
    if (sim.nextWaveIn == null) sim.nextWaveIn = ov;
    else { sim.nextWaveIn -= dt; if (sim.nextWaveIn <= 1e-6) launch(sim); }
  }
  runSoldiers(sim, dt);
  runMoves(sim, dt);
  moveZombies(sim, dt);
  const cells = zombieCells(sim);
  fireWeapons(sim, dt, cells);
  fireLaunchers(sim, dt, cells);
  landGrenades(sim, dt);
  throwGrenades(sim, dt, cells);
  ageCorpses(sim, dt);
  if (sim.baseHp <= 0) {
    sim.phase = 'lost';
    const lesson = Math.max(0, LESSON_MIN - sim.intelEarned);
    if (lesson) { sim.intelEarned += lesson; sim.events.push({ t: 'lesson', intel: lesson }); }
    sim.lesson = lesson;
    sim.events.push({ t: 'lost' });
    return;
  }
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
    const wi = WAVE_INTEL * (sim.tweaks?.intel ?? 1);
    sim.intelEarned += wi;
    sim.events.push({ t: 'waveCleared', index: k, intel: wi });
  }
  if (sim.waveIndex >= sim.dayCfg.waves.length) { sim.phase = 'won'; sim.events.push({ t: 'won' }); }
  else if (sim.waveIndex === sim.wavesStarted) { sim.phase = 'build'; sim.nextWaveIn = Math.max(sim.nextWaveIn ?? 0, countdownOf(sim)); }
}

function moveZombies(sim, dt) {
  const hitCells = new Set();
  const troops = activeSoldiers(sim), hurt = new Set();
  for (const z of sim.zombies) {
    if (z.dead) continue;
    const def = ZOMBIES[z.type];
    let mul = obstacleEffect(sim, z, dt, hitCells);
    // Hemvärnet: en zombie i en ruta intill en soldats ruta (de åtta grannarna) stannar och slår
    // honom (bara soldaterna, pjäserna är som förut). Närmaste soldat, lika: först i listan.
    z.foe = null;
    if (troops.length) {
      const p = zombiePos(sim, z), pl = sim.place;
      const zi = Math.floor((p.x - pl.origin[0]) / pl.size), zj = Math.floor((p.z - pl.origin[1]) / pl.size);
      let foe = null, fd = Infinity;
      for (const t of troops) {
        if (t.s.down || Math.abs(t.i - zi) > 1 || Math.abs(t.j - zj) > 1) continue;
        const d = Math.hypot((t.x ?? t.s.x) - p.x, (t.z ?? t.s.z) - p.z);
        if (d < fd) { fd = d; foe = t; }
      }
      if (foe) {
        mul = 0; z.attacking = true; z.foe = [foe.x ?? foe.s.x, foe.z ?? foe.s.z];
        hitSoldier(sim, foe.g, foe.s, def.hitDamage * dt, hurt);
      }
    }
    // map.pace (0.10.1, Gnesta Norr): banans takt, alla sorter lika (vägen dit är lång).
    const speed = def.speed * mul * (sim.map.pace ?? 1) * (sim.tweaks?.speed ?? 1) * (sim.route.kind === 'grid' ? fogFactor(sim.map, z.x, z.z) : 1);
    z.v = speed;
    sim.route.advance(z, speed * dt);
    z.wob += dt * speed;
    if (sim.route.arrived(z)) {
      // Dörrarna (map.door, ishallens igenspikade entré): de som når fram slår på dörrarna och
      // tar sig in en i taget (doorBreak), och går att skjuta medan de står där.
      if (sim.map.door) { if (!z.atDoor) { z.atDoor = true; z.doorAt = sim.time; } z.attacking = true; z.v = 0; }
      else breach(sim, z);
    }
  }
  if (sim.map.door) doorBreak(sim, dt);
}
function breach(sim, z) {
  const def = ZOMBIES[z.type];
  if (!sim.tweaks?.god) sim.baseHp -= def.baseDamage;
  const p = zombiePos(sim, z);
  z.dead = true; z.breached = true; z.deadT = 99;
  sim.events.push({ t: 'breach', id: z.id, damage: def.baseDamage, x: p.x, z: p.z });
}
// 0.10.1: dörrarna släpper in en zombie per map.door.gap sekunder (den som kom först), så att
// basen aldrig faller på några sekunder när en klunga når fram (speltestet av 0.10.0: "20 till 0
// på ett par sekunder"). Med 20 i bas och 3,2 s tar det minst en minut från första skadan.
function doorBreak(sim, dt) {
  sim.doorCd = Math.max(0, (sim.doorCd ?? 0) - dt);
  if (sim.doorCd > 0) return;
  let first = null;
  for (const z of sim.zombies) if (z.atDoor && !z.dead && (!first || z.doorAt < first.doorAt || (z.doorAt === first.doorAt && z.id < first.id))) first = z;
  if (!first) return;
  breach(sim, first);
  sim.doorCd = sim.map.door.gap;
}

// ---------- Hemvärnet ----------
// Soldaterna springer ut från markeringen (run sekunder) och är med först när de är framme.
function runSoldiers(sim, dt) {
  for (const g of sim.guns) if (g.squad) for (const s of g.soldiers) if (s.run > 0) { s.run = Math.max(0, s.run - dt); if (!s.run) s.from = null; }
}
function activeSoldiers(sim) {
  const out = [];
  const w = sim.place.w;
  for (const g of sim.guns) if (g.squad) for (const s of g.soldiers) {
    if (s.down) continue;
    if (s.run <= 0) out.push({ g, s, i: s.cell % w, j: Math.floor(s.cell / w) });
    else if (s.from) {
      // 0.12.0: på väg till en ny plats (Move) går han att slå ner där han springer
      const p = soldierAt(s), k = sim.place.keyAt(p.x, p.z);
      if (k >= 0) out.push({ g, s, i: k % w, j: Math.floor(k / w), x: p.x, z: p.z });
    }
  }
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
  const plan = planSquad(sim, key, { type, count: squadSize(1, sim.research) });
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
// 0.12.1: pjäserna och Hemvärnets grupper har var sitt tak (maxGuns, maxSquads).
export const gunCount = sim => sim.guns.filter(g => !g.squad).length;
export const squadCount = sim => sim.guns.filter(g => g.squad).length;
export const capFull = (sim, type) => (isSquad(type) ? squadCount(sim) >= sim.maxSquads : gunCount(sim) >= sim.maxGuns);
export const onRoof = (sim, key, type) => !!WEAPONS[type]?.roof && sim.place.kind[key] === KIND.house && roofAt(sim.place, key) > 0;
// ignore (0.12.0, Move): pjäsen som flyttas räknas inte (varken mot taket eller avståndet).
export function checkSpot(sim, key, type = null, { ignore = null } = {}) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  if (ignore == null && capFull(sim, type)) return { ok: false, reason: isSquad(type) ? 'fulltHv' : 'fullt' };
  if (ignore != null) return without(sim, ignore, () => checkSpot(sim, key, type));
  const p = sim.place;
  if (!p.valid(key)) return { ok: false, reason: 'utanför' };
  const kind = p.kind[key];
  if (kind !== KIND.open && !onRoof(sim, key, type)) return { ok: false, reason: kind === KIND.house && WEAPONS[type]?.roof ? 'kant' : KIND_REASON[kind] || 'okänd' };
  const c = p.center(key);
  if (sim.guns.some(g => Math.hypot(g.x - c.x, g.z - c.z) < MIN_SPACING - 1e-9)) return { ok: false, reason: 'nära' };
  // Hemvärnet: en pjäs står inte i en soldats ruta, och gruppen behöver rum för alla.
  // Gruppens storlek med forskningen (Bigger squad): ingen soldat tas betalt för som inte får plats.
  if (isSquad(type)) { if (squadPlanAt(sim, key, type).length < squadSize(1, sim.research)) return { ok: false, reason: 'trångt' }; }
  else if (sim.guns.some(g => g.squad && g.soldiers.some(s => Math.hypot(s.x - c.x, s.z - c.z) < SQUAD.gunGap - 1e-9))) return { ok: false, reason: 'nära' };
  return { ok: true };
}
// Rutan under en punkt på marken, eller -1 utanför kartan.
export const spotAt = (sim, x, z) => sim.place.keyAt(x, z);
// Sikten från en ruta för ett vapen av typen (största räckvidden, nivå 3). På ett tak ser
// skytten över husen (placement.js, roofSightFrom).
// 0.12.0 (H108): ett vapen med en skjutsektor (cone, Psg 90) ser bara inom konen runt facing
// (radianer). Utan facing väljs riktningen som ser mest av hordens väg. Svaret har då facing.
export function sightFor(sim, key, type, facing = null) {
  const base = isSquad(type) ? unionSight(sim.place, squadPreview(sim, key, type))
    : (onRoof(sim, key, type) ? roofSightFrom : sightFrom)(sim.place, key, weaponStats(type, MAX_LEVEL, sim.research).range);
  const cone = WEAPONS[type]?.cone;
  if (!cone) return base;
  const f = facing ?? bestFacing(sim.place, key, base, hordeWeight(sim), cone);
  return coneSight(sim.place, key, base, f, cone);
}

// Ställ ut ett vapen i rutan key. Returnerar { ok, id }.
export function build(sim, key, type, opts = {}) {
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
    const soldiers = plan.map((pc, i) => makeSoldier(pc, i, 1, c, sim.research));
    sim.guns.push({ id, x: c.x, z: c.z, y: 0, roof: false, cell: key, squad: true, soldiers, sight: unionSight(sim.place, soldiers),
      weapon: { type, level: 1, cooldown: 0, angle: soldiers[0]?.face ?? Math.PI, targetId: null, spent: cost } });
    return { ok: true, id };
  }
  const sight = sightFor(sim, key, type, opts.facing ?? null);
  // 0.12.0 (H098): värnet på marken vänds mot hordens väg och byggs mot skyddet som redan står där
  const emplace = roof ? null : emplacement(sim.place, key, sight.keys, hordeWeight(sim));
  sim.guns.push({ id, x: c.x, z: c.z, y: roof ? roofAt(sim.place, key) : 0, roof, cell: key, sight, ...(sight.facing != null ? { facing: sight.facing } : {}), ...(emplace ? { emplace } : {}),
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
  // Hemvärnet (0.10.1): ger nivån en man till och han inte får plats nekas uppgraderingen, så att
  // ingen betalar för en soldat som aldrig kommer.
  let add = null;
  if (g.squad) {
    const room = squadRoom(sim, id);
    if (room.fit < room.want) return { ok: false, reason: 'trångt-man' };
    add = room.plan;
  }
  sim.cash -= cost; w.level++; w.spent += cost;
  if (g.squad) growSquad(sim, g, add);
  return { ok: true };
}
// Får gruppens nästa nivå plats? want: nya man som nivån ger, fit: hur många som får plats.
export function squadRoom(sim, id) {
  const g = gunOf(sim, id);
  if (!g?.squad || upgradeCost(g.weapon.type, g.weapon.level) == null) return { want: 0, fit: 0, plan: [] };
  const want = Math.max(0, squadSize(g.weapon.level + 1, sim.research) - g.soldiers.length);
  if (!want) return { want, fit: 0, plan: [] };
  const mine = g.soldiers;
  // de egna soldaterna räknas som fasta (inte som andra gruppers), så att planen inte stängs ute
  g.soldiers = [];
  const plan = planSquad(sim, g.cell, { type: g.weapon.type, count: want, fixed: mine });
  g.soldiers = mine;
  return { want, fit: plan.length, plan };
}
// Hemvärnet efter en uppgradering: mer liv till alla, och de nya männen i rutorna squadRoom valde
// (den bästa lediga rutan med de andra på plats; upgrade har redan kollat att alla får plats).
function growSquad(sim, g, add) {
  const hp = soldierHp(g.weapon.level, sim.research);
  for (const s of g.soldiers) { const d = hp - s.maxHp; s.maxHp = hp; if (!s.down) s.hp += d; }
  if (!add?.length) return;
  const mine = g.soldiers;
  for (const pc of add) mine.push(makeSoldier(pc, mine.length, g.weapon.level, g, sim.research));
  g.sight = unionSight(sim.place, mine);
}
// ---------- flytta (0.12.0, H102) ----------
// Pjäsen packas ihop, bärs till den nya platsen och ställs upp igen. Under tiden skjuter den inte
// (inte heller granater). Uppgraderingar och granatlådan följer med; befästningen på den gamla
// platsen ligger kvar (bara bild). Tiden i sekunder per vapen, delad i packa (MOVE_PACK), bära
// (MOVE_CARRY) och ställa upp (resten). Hemvärnet springer i stället: varje soldat från sin plats
// till sin nya, i MOVE_RUN m/s (minst MOVE_RUN_MIN s), och kan slås ner av zombier på vägen.
// Går tiden inte (före första vågen) står pjäsen klar direkt.
export const MOVE_TIME = { m2: 15, m249: 8, ksp58: 8, ak5: 5, psg90: 10 };
export const MOVE_PACK = 0.4, MOVE_CARRY = 0.2;
export const MOVE_RUN = 4, MOVE_RUN_MIN = 1.5, MOVE_RUN_MAX = 6;
const clock = sim => sim.phase === 'wave' || (sim.phase === 'build' && sim.nextWaveIn != null);
// Kör fn med pjäsen id borttagen ur listan (placeringskollen och gruppens plan ska inte se den).
function without(sim, id, fn) {
  const i = sim.guns.findIndex(g => g.id === id);
  if (i < 0) return fn();
  const [g] = sim.guns.splice(i, 1);
  try { return fn(); } finally { sim.guns.splice(i, 0, g); }
}
// Var flytten är: 'pack', 'carry', 'setup' eller null (står still).
export function movePhase(g) {
  const m = g.move;
  if (!m) return null;
  if (m.t < m.total * MOVE_PACK) return 'pack';
  if (m.t < m.total * (MOVE_PACK + MOVE_CARRY)) return 'carry';
  return 'setup';
}
// Kan pjäsen id flyttas till rutan key just nu? Samma skäl som checkSpot, plus 'flyttar'.
export function checkMove(sim, id, key) {
  const g = gunOf(sim, id);
  if (!g) return { ok: false, reason: 'tom' };
  if (g.move || (g.squad && g.soldiers.some(s => s.run > 0 && s.from))) return { ok: false, reason: 'flyttar' };
  if (key === g.cell) return { ok: false, reason: 'samma' };
  return checkSpot(sim, key, g.weapon.type, { ignore: id });
}
// Gruppens nya rutor om den flyttas till key (spöket i handen).
export const movePreview = (sim, id, key) => {
  const g = gunOf(sim, id);
  if (!g?.squad || !sim.place.valid(key)) return [];
  return without(sim, id, () => planSquad(sim, key, { type: g.weapon.type, count: g.soldiers.length }));
};
export function moveGun(sim, id, key, opts = {}) {
  const check = checkMove(sim, id, key);
  if (!check.ok) return check;
  const g = gunOf(sim, id), type = g.weapon.type, c = sim.place.center(key);
  if (g.squad) {
    const plan = movePreview(sim, id, key);
    if (plan.length < g.soldiers.length) return { ok: false, reason: 'trångt' };
    g.soldiers.forEach((s, i) => {
      const pc = plan[i], from = { x: s.x, z: s.z };
      const d = Math.hypot(pc.x - from.x, pc.z - from.z);
      Object.assign(s, { cell: pc.cell, x: pc.x, z: pc.z, cover: pc.cover, stance: pc.stance, face: pc.face, sight: pc.sight, targetId: null, cooldown: 0.13 * i });
      if (!s.down && clock(sim)) { s.from = from; s.run = s.runTotal = Math.min(MOVE_RUN_MAX, Math.max(MOVE_RUN_MIN, d / MOVE_RUN)); s.mv = (s.mv ?? 0) + 1; }
      else { s.run = 0; s.from = null; }
    });
    Object.assign(g, { x: c.x, z: c.z, cell: key, sight: unionSight(sim.place, g.soldiers) });
    g.weapon.targetId = null;
    sim.squadPlan = null;
    sim.events.push({ t: 'move', gunId: id, cell: key });
    return { ok: true, id };
  }
  const roof = onRoof(sim, key, type);
  const from = { x: g.x, z: g.z, y: g.y, roof: g.roof, cell: g.cell };
  const sight = sightFor(sim, key, type, opts.facing ?? null);
  Object.assign(g, { x: c.x, z: c.z, y: roof ? roofAt(sim.place, key) : 0, roof, cell: key, sight });
  if (roof) delete g.emplace; else g.emplace = emplacement(sim.place, key, sight.keys, hordeWeight(sim));
  if (sight.facing != null) g.facing = sight.facing;
  g.weapon.targetId = null;
  g.move = clock(sim) ? { t: 0, total: MOVE_TIME[type] ?? 8, from } : null;
  if (!g.move) delete g.move;
  sim.events.push({ t: 'move', gunId: id, cell: key });
  return { ok: true, id };
}
// Flyttarna går framåt (pjäserna och soldaterna som springer).
function runMoves(sim, dt) {
  for (const g of sim.guns) {
    if (!g.move) continue;
    g.move.t += dt;
    if (g.move.t >= g.move.total - 1e-9) { delete g.move; sim.events.push({ t: 'moveDone', gunId: g.id }); }
  }
}
// Soldatens läge på väg (flytten): mjuk start och stopp, som bilden.
export function soldierAt(s) {
  if (!(s.run > 0) || !s.from) return { x: s.x, z: s.z };
  const k = 1 - s.run / s.runTotal, e = k * k * (3 - 2 * k);
  return { x: s.from.x + (s.x - s.from.x) * e, z: s.from.z + (s.z - s.from.z) * e };
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
    // 0.12.0: en pjäs som flyttas skjuter inte
    if (s.move) { w.targetId = null; w.cooldown = Math.max(0, w.cooldown - dt); continue; }
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
    if (s.down || s.run > 0) { s.targetId = null; s.cooldown = Math.max(s.cooldown, 0); s.rise = 0; s.risen = false; continue; }
    const seen = s.sight.mask, prone = s.stance === 'prone' && !s.risen;
    // 0.12.2: den liggande skjuter bara inom bågen runt skyddsriktningen (PRONE_ARC)
    let target = null, best = -Infinity, out = null, bestOut = -Infinity;
    for (const [z, { p, k }] of cells) {
      if (z.dead || k < 0 || !seen[k]) continue;
      if (Math.hypot(p.x - s.x, p.z - s.z) > st.range) continue;
      const pr = sim.route.progress(z);
      if (s.stance === 'prone' && !inArc(s, Math.atan2(p.z - s.z, p.x - s.x))) { if (pr > bestOut) { bestOut = pr; out = z; } continue; }
      if (pr > best) { best = pr; target = z; }
    }
    if (s.stance === 'prone') {
      if (prone && !target && out) {
        // reser sig på knä och vänder sig; skjuter först när han är uppe
        s.rise = (s.rise ?? 0) + dt;
        if (s.rise >= RISE_TIME - 1e-9) { s.risen = true; s.settle = 0; }
      } else if (prone) s.rise = 0;
      if (s.risen) {
        if (out && (!target || bestOut > best)) { target = out; best = bestOut; }
        s.settle = out ? 0 : (s.settle ?? 0) + dt;
        if (s.settle >= SETTLE_TIME - 1e-9) { s.risen = false; s.rise = 0; }
      } else if (!target) { s.targetId = null; s.cooldown = Math.max(s.cooldown, 0); continue; }
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
    if (!w.kit || s.move) continue;
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
    if (w.lCooldown == null || s.move) continue;
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
    const bounty = def.bounty * (sim.tweaks?.cash ?? 1), intel = def.intel * (sim.tweaks?.intel ?? 1);
    sim.cash += bounty; sim.intelEarned += intel; sim.kills++;
    sim.events.push({ t: 'kill', id: z.id, type: z.type, bounty, intel, x: p.x, z: p.z });
  }
}

// 0.12.1 (speltestet av 0.12.0: varken stapeln eller "Barricade failing" syntes): en spärr varnar en gång
// när dess svagaste ruta har mindre än BARRICADE_FAILING av sina slag kvar (förut räknades hela spärrens
// summa, och när första rutan gick sönder hoppade summan upp igen, så varningen kom aldrig). Händelsen
// barricadeFailing { line, cell } kommer från simuleringen, så att den går att pröva.
export const BARRICADE_FAILING = 0.25;
// Spärrens id (samma för alla rutor i en spärr tvärs över gatan, annars rutan).
export const barricadeId = (ob, cell) => (ob.line != null ? 'l' + ob.line : 'c' + cell);
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
      if (ob.hp > 0 && ob.hp < ob.maxHp * BARRICADE_FAILING) {
        const id = barricadeId(ob, i);
        sim.failing ??= [];
        if (!sim.failing.includes(id)) { sim.failing.push(id); sim.events.push({ t: 'barricadeFailing', id, cell: i, ...(ob.line != null ? { line: ob.line } : {}) }); }
      }
      if (ob.hp <= 0) {
        delete sim.obstacles[i]; broke = true;
        // en ny spärr i samma ruta (E4) ska kunna varna igen; en spärr tvärs över gatan får ett nytt id
        if (ob.line == null && sim.failing) sim.failing = sim.failing.filter(x => x !== 'c' + i);
        sim.events.push({ t: 'obstacleBroken', cell: i, type: ob.type, ...(ob.line != null ? { line: ob.line } : {}) });
      }
    }
  }
  if (broke) route.rebuild(sim.obstacles);
  if (mul > 0) z.attacking = false;
  return mul;
}
