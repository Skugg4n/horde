import { ZOMBIES, takeOf } from '../data/zombies.js';
import { WEAPONS, GRENADE_KIT, PIERCE_WIDTH, VEHICLE_REACH, SUPPLIES, VETERAN, dmgClassOf } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { makeRng } from './rng.js';
import { routeFor } from './route.js';
import { weaponStats, weaponUnlocked, upgradeCost, obstacleUnlocked, weaponRefund, lineRefund, grenadeStats, launcherStats, wireDurability, blockHp, maxGuns, maxSquads, MAX_LEVEL, inArsenal } from './stats.js';
import { crewRoute, alongPath, crewPassable } from './crew-path.js';
import { placementFor, sightFrom, roofSightFrom, roofAt, KIND, KIND_REASON, MIN_SPACING, coneSight, bestFacing } from './placement.js';
import { emplacement } from './emplace.js';
import { SQUAD, isSquad, squadSize, soldierHp, planSquad, makeSoldier, unionSight, runTime, hordeWeight, inArc, RISE_TIME, SETTLE_TIME } from './squad.js';
import { SANITY, FATIGUE, hasSanity, resilience, fearAt, sanityFactor } from './sanity.js';
import { housesOf, houseAtKey, houseById, pickWindows, windowSight, DOOR_HP, ASSAULT, BREAK_HIT } from './houses.js';

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
// dayCfg.overlap (0.10.1, banor med långa vägar): nästa våg kan komma medan föregående fortfarande är på väg.
// Annars väntar den tills vågen är klar (COUNTDOWN). Klaras vågen före är nedräkningen minst COUNTDOWN.
// 0.18.1 (speltestet av 0.18.0: Mölnbo dag 5 hade alla fem vågor ute inom fyra minuter, Vikingavägen dag 4 310
// zombier samtidigt, och då spelade inga val någon roll): förut startade nästa våg dayCfg.overlap sekunder efter att
// föregående kommit ut, hur det än gick. Nu kommer nästa våg av sig själv först när (1) alla äldre vågor är klara,
// (2) den senaste har kommit ut helt och (3) OVERLAP_SPENT av den är döda eller framme vid basen, eller
// dayCfg.overlap sekunder har gått sedan den kom ut (den långa klockan). Sedan en nedräkning på OVERLAP_BEAT s, en
// paus där de nya verben hinner användas. Utan att spelaren kallar tidigt är alltså högst två vågor igång.
export const OVERLAP_SPENT = 0.7, OVERLAP_BEAT = 12;

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

// ---------- kärntrupperna (0.14.0, Operation Södermanland) ----------
// core: enheterna sektorn har (src/meta/operation.js opStartConfig), [{ uid, type, level, vet, men }]. Med
// core ställs trupperna ut ur reserven (sim.reserve) gratis i uppställningen, före första vågen; de
// köps aldrig i striden, och pengarna (förnödenheterna) går bara till hinder, granatlådor, ammunition och
// sandsäckar. Nivåer köps mellan dagarna; i striden finns ingen uppgradering, försäljning eller påfyllnad.
// Inget tak för pjäserna: man ställer ut det man har. dayReport säger vad som blev kvar. Utan core är
// allt som förut (köp med pengar), så att mekanikens prov fungerar.
// hpMul: sektorns tryck (zombiernas hp). bountyMul: förnödenheter per dödad (operationen: mindre, inga trupper att köpa).
// 0.16.0 (inlärningen, src/meta/unlocks.js): allow är det som är upplåst den dagen ('wire', 'block', 'car',
// 'rotate', 'aim', 'move', 'early', 'unitSupplies' ...), null betyder allt (proven och provbanorna). Det som
// inte är upplåst nekas, så att balansens policy spelar samma spel som spelaren.
// Dagens data kan ha: preset (enheter som redan står ute när dagen börjar, { type, at: [x, z] }: infanteriet vid
// bommen och den svetsade pillboxen på E4), late (en enhet av typen kommer först efter vågen wave: E4 dag 1:s
// andra Ksp 90) och spots (de markerade platserna, [[x, z]]: bara där får nya enheter ställas ut).
// 0.18.0: depth (skiva 1): utan allow (proven och provbanorna) är djupets mekaniker av, så att mekanikproven räknar
// som förut; depth: true slår på alla (provet för djupet), en lista bara de.
export function createSim({ map, day, cash, research = [], seed = 1, tweaks = null, core = null, hpMul = 1, bountyMul = 1, allow = null, depth = null }) {
  const dayCfg = map.days[day - 1];
  const res = new Set(research);
  const route = routeFor(map);
  const coreMode = Array.isArray(core);
  const sim = {
    allow: allow ? new Set(allow) : null, depth: depth === true ? new Set(DEPTH_FLAGS) : Array.isArray(depth) ? new Set(depth) : null,
    core: coreMode, reserve: coreMode ? core.map(u => ({ ...u })) : null, deployed: [], hpMul, bountyMul, earlyCalls: 0,
    // waveIndex: antal klarade vågor. wavesStarted: antal startade (vågor kan gå samtidigt
    // när nästa kallas tidigt). nextWaveIn: sekunder kvar av nedräkningen, null = väntar på spelaren.
    map, day, dayCfg, phase: 'build', waveIndex: 0, wavesStarted: 0, cleared: [], nextWaveIn: null, cash, intelEarned: 0, kills: 0,
    baseHp: map.baseHp, zombies: [], events: [], time: 0, rng: makeRng(seed), seed,
    research: res, nextId: 1, spawnQueue: [], route, len: route.len,
    // Utställda vapen: { id, x, z, cell, weapon, sight }. sight: synliga gångbara rutor (mask och lista).
    place: placementFor(map), guns: [], nextGun: 1, maxGuns: coreMode ? Infinity : maxGuns(res, map), maxSquads: coreMode ? Infinity : maxSquads(res, dayCfg),
    obstacles: {}, grenades: [], nextLine: 1,
    // husen vars dörrar slagits upp i dag (vilande smittade, H101)
    burst: [],
    tweaks: normalizeTweaks(tweaks),
    // 0.13.0 (H105): evakueringen (dayCfg.evac): de civila på väg till ishallen
    civilians: [], evac: dayCfg.evac ? { total: evacTotal(dayCfg.evac), safe: 0, lost: 0, need: dayCfg.evac.need, out: 0 } : null,
    // 0.17.0-molnbo: tågklockan (dayCfg.train), se runTrain
    train: dayCfg.train ? { at: dayCfg.train.at, left: dayCfg.train.at, gone: false, last: !!dayCfg.train.last } : null,
  };
  if (coreMode) setupCore(sim);
  return sim;
}
export const DEPTH_FLAGS = ['sanity', 'rout', 'overrun', 'garrison', 'crossfire', 'holdFire', 'target', 'fatigue'];
export const allowed = (sim, f) => (sim.allow ? sim.allow.has(f) : !DEPTH_FLAGS.includes(f) || !!sim.depth?.has(f));
// Dagens förberedda enheter (preset), de som kommer senare (late) och de markerade platserna (spots).
function setupCore(sim) {
  const d = sim.dayCfg;
  for (const l of d.late ?? []) {
    // den sämsta av typen kommer sist (nextReserve tar den bästa först)
    const cands = sim.reserve.filter(u => u.type === l.type && !u.arrive);
    const u = cands.sort((a, b) => a.level - b.level || (a.men ?? 0) - (b.men ?? 0) || b.uid - a.uid)[0];
    if (u && cands.length > 1) u.arrive = l.wave;
  }
  for (const pr of d.preset ?? []) {
    if (!sim.reserve.some(u => u.type === pr.type && !u.arrive)) continue;
    const key = sim.place.keyAt(pr.at[0], pr.at[1]);
    const r = build(sim, key, pr.type, pr.facing != null ? { facing: pr.facing } : {});
    const g = r.ok && sim.guns.find(x => x.id === r.id);
    if (g) { delete g.building; g.preset = true; }
  }
  if (d.spots) sim.marked = new Set(d.spots.map(([x, z]) => sim.place.keyAt(x, z)).filter(k => k >= 0));
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
// ---------- evakueringen (0.13.0, H105) ----------
// Gnesta South dag 1: "Hold until the civilians reach the ice rink." dayCfg.evac = { need, speed, groups:
// [{ house, count, at, wave }] }. När vågen wave börjar kommer de ut ur huset (at sekunder in i vågen, en
// i taget med CIV_GAP s) på gatan framför och går hordens väg till ishallens entré, där de är i säkerhet.
// Zombier som hinner ikapp slår ner dem (CIV_REACH m, zombiens hitDamage). Dagen vinns när alla har
// kommit fram eller fallit och minst need är framme; den förloras när för många har fallit (eller basen).
export const CIV_HP = 10, CIV_GAP = 0.9, CIV_SPEED = 2.1, CIV_REACH = 1.5;
// 0.14.1 (granskningen av 0.14, Critical 1): spelarens egna spärrar kunde låsa dagen. När flödet går
// genom en spärr (ingen öppen väg finns) klättrar den civila över på CLIMB_TIME s, när hon är högst
// CLIMB_REACH m från spärrens mitt. Finns en öppen väg går flödet runt och ingen klättrar.
export const CLIMB_TIME = 5, CLIMB_REACH = 2.2;
export const evacTotal = ev => ev.groups.reduce((a, g) => a + g.count, 0);
function scheduleCivilians(sim, index) {
  const ev = sim.dayCfg.evac;
  if (!ev) return;
  for (const g of ev.groups) {
    if ((g.wave ?? 0) !== index) continue;
    for (let i = 0; i < g.count; i++) (sim.civQueue ??= []).push({ at: sim.time + (g.at ?? 0) + i * CIV_GAP, house: g.house });
  }
  sim.civQueue?.sort((a, b) => a.at - b.at);
}
function runCivilians(sim, dt) {
  const ev = sim.evac;
  if (!ev) return;
  while (sim.civQueue?.length && sim.civQueue[0].at <= sim.time) {
    const q = sim.civQueue.shift(), door = houseDoor(sim.map, q.house, sim.route), id = ev.out++;
    const at = sim.route.spawnAt(sim.rng, door.cell, id);
    sim.civilians.push({ id, house: q.house, ...at, hp: CIV_HP, maxHp: CIV_HP, state: 'walk', door: { x: door.x, z: door.z }, wob: 0 });
    sim.events.push({ t: 'civilianOut', id, house: q.house, x: door.x, z: door.z });
  }
  const speed = (sim.dayCfg.evac.speed ?? CIV_SPEED), route = sim.route;
  for (const c of sim.civilians) {
    if (c.state !== 'walk') continue;
    if (c.held) { c.held = false; continue; }
    // 0.14.1: över spärren, långsamt (zombier kan slå henne under tiden)
    if (c.climb != null) {
      c.climb -= dt;
      if (c.climb <= 1e-9) { route.climbInto(c, c.climbKey); c.climb = null; sim.events.push({ t: 'civilianClimbed', id: c.id, x: c.x, z: c.z }); }
      continue;
    }
    const ahead = route.blockedAhead ? route.blockedAhead(c) : -1;
    if (ahead >= 0) {
      const b = route.cellCenter(ahead);
      if (Math.hypot(b.x - c.x, b.z - c.z) <= CLIMB_REACH) { c.climb = CLIMB_TIME; c.climbKey = ahead; sim.events.push({ t: 'civilianClimb', id: c.id, x: c.x, z: c.z }); continue; }
    }
    route.advance(c, speed * dt);
    c.wob += speed * dt;
    if (sim.route.arrived(c)) { c.state = 'safe'; ev.safe++; sim.events.push({ t: 'civilianSafe', id: c.id, safe: ev.safe }); }
  }
}
function hitCivilian(sim, c, amount) {
  c.hp -= amount; c.held = true;
  if (c.hp <= 0 && c.state === 'walk') {
    c.state = 'down'; c.hp = 0; sim.evac.lost++;
    sim.events.push({ t: 'civilianDown', id: c.id, x: c.x, z: c.z, lost: sim.evac.lost });
  }
}
// Dagens utfall för evakueringen: 'won', 'lost' eller null (pågår).
export function evacOutcome(ev) {
  if (!ev) return null;
  if (ev.lost > ev.total - ev.need) return 'lost';
  if (ev.safe + ev.lost >= ev.total) return ev.safe >= ev.need ? 'won' : 'lost';
  return null;
}
function checkEvac(sim) {
  const o = evacOutcome(sim.evac);
  if (!o || sim.phase === 'won' || sim.phase === 'lost') return;
  if (o === 'won') { sim.phase = 'won'; sim.events.push({ t: 'evacDone', safe: sim.evac.safe }); sim.events.push({ t: 'won' }); return; }
  lose(sim, 'civilians');
}

// ---------- tågklockan (0.17.0-molnbo) ----------
// Mölnbo dag 3 till 5: "Hold until the train leaves." dayCfg.train = { at, last }. Klockan går från första
// vågens start; när den når noll går tåget och dagen är vunnen om basen står, också mitt i en våg (zombierna som
// är kvar spelar ingen roll). Klaras alla vågor före avgången väntar dagen på tåget.
function runTrain(sim, dt) {
  const tr = sim.train;
  if (!tr || tr.gone || sim.wavesStarted === 0) return;
  tr.left = Math.max(0, tr.left - dt);
  if (tr.left > 1e-9 || sim.phase === 'lost' || sim.phase === 'won') return;
  tr.gone = true;
  sim.events.push({ t: 'trainGone', last: tr.last });
  sim.phase = 'won'; sim.events.push({ t: 'won' });
}

// ---------- pendeltåget som rullar in (0.19.0, H452) ----------
// Mölnbo dag 4: mitt i striden rullar ett pendeltåg in från Järna och stannar vid norra perrongen. Dörrarna slås upp
// och de som sitter i väller ut. dayCfg.arrival = { wave, at, warn, doors: [[x, z]], groups: [{ type, count,
// interval, delay }] }: at sekunder efter att vågen wave (index) startat står tåget vid perrongen; warn sekunder före
// kommer förvarningen (signalen och raden), ARRIVAL_DOORS sekunder efter stoppet går dörrarna och de kliver ut i tur och
// ordning, fördelade på dörrarna. De räknas till vågen. Deterministiskt: allt följer vågens start.
export const ARRIVAL_DOORS = 1.2;
function scheduleArrival(sim, index) {
  const ar = sim.dayCfg.arrival;
  if (!ar || ar.wave !== index) return;
  const kc = sim.tweaks?.count ?? 1, at = sim.time + ar.at;
  const doors = ar.doors.map(([x, z]) => ({ x, z, cell: sim.route.nearestCell ? sim.route.nearestCell(x, z) : -1 }));
  sim.arrival = { warnAt: at - ar.warn, at, open: at + ARRIVAL_DOORS, warned: false, arrived: false, opened: false, doors: doors.map(d => [d.x, d.z]) };
  let i = 0;
  for (const g of ar.groups) {
    const n = kc === 1 ? g.count : Math.max(1, Math.round(g.count * kc));
    for (let k = 0; k < n; k++, i++) sim.spawnQueue.push({ at: sim.arrival.open + (g.delay ?? 0) + k * g.interval, type: g.type, wave: index, cell: doors[i % doors.length].cell, train: true });
  }
}
function runArrival(sim) {
  const a = sim.arrival;
  if (!a) return;
  if (!a.warned && sim.time >= a.warnAt - 1e-9) { a.warned = true; sim.events.push({ t: 'trainWarn', in: a.at - sim.time }); }
  if (!a.arrived && sim.time >= a.at - 1e-9) { a.arrived = true; sim.events.push({ t: 'trainArrive' }); }
  if (!a.opened && sim.time >= a.open - 1e-9) { a.opened = true; sim.events.push({ t: 'trainDoors', doors: a.doors }); }
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
  scheduleArrival(sim, index);
  sim.spawnQueue.sort((a, b) => a.at - b.at || a.wave - b.wave);
  scheduleCivilians(sim, index);
  sim.wavesStarted++;
  sim.phase = 'wave';
  sim.nextWaveIn = null;
  sim.waveOutAt = null;
  sim.events.push({ t: 'waveStart', index });
  return index;
}

// ---------- debugmenyn (0.12.2) ----------
// Lägger till zombier mitt i en våg: count av type från ingången spawn (E4: vägens enda), räknas till
// den senast startade vågen så att vågen inte är klar förrän de är döda. Bara under en våg.
export function debugSpawn(sim, { type = 'walker', count = 1, spawn: spawnId = undefined } = {}) {
  if (sim.phase !== 'wave' || !ZOMBIES[type]) return { ok: false, reason: 'fel läge' };
  const n = Math.max(1, Math.min(500, Math.round(count)));
  const wave = Math.max(0, sim.wavesStarted - 1);
  for (let i = 0; i < n; i++) sim.spawnQueue.push({ at: sim.time + i * 0.25, type, wave, spawn: spawnId });
  sim.spawnQueue.sort((a, b) => a.at - b.at || a.wave - b.wave);
  return { ok: true, count: n };
}
// Slår upp dörren till ett hus nu (dagens vilande, eller vilket hus som helst på kartan): count
// smittade väller ut som i launch. Bara under en våg.
export function debugBurst(sim, house, { count = 4, type = 'walker' } = {}) {
  if (sim.phase !== 'wave') return { ok: false, reason: 'fel läge' };
  const door = houseDoor(sim.map, house, sim.route);
  const wave = Math.max(0, sim.wavesStarted - 1);
  for (let i = 0; i < count; i++) sim.spawnQueue.push({ at: sim.time + DORMANT_DELAY + i * DORMANT_GAP, type, wave, door: house, cell: door.cell });
  sim.spawnQueue.sort((a, b) => a.at - b.at || a.wave - b.wave);
  if (!sim.burst.includes(house)) sim.burst.push(house);
  if (sim.pendingBursts) sim.pendingBursts = sim.pendingBursts.filter(b => b.ev.house !== house);
  sim.events.push({ t: 'dormantBurst', house, x: door.x, z: door.z, ry: door.ry, intel: true });
  return { ok: true };
}
// Hoppar till våg n (1 = första) före dagens första våg: vågorna före räknas som klara utan zombier.
export function debugJumpWave(sim, n) {
  if (sim.phase !== 'build' || sim.wavesStarted > 0) return { ok: false, reason: 'fel läge' };
  const k = Math.max(0, Math.min(sim.dayCfg.waves.length - 1, Math.round(n) - 1));
  for (let i = 0; i < k; i++) sim.cleared[i] = true;
  sim.waveIndex = sim.wavesStarted = k;
  return { ok: true, wave: k + 1 };
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
  return Math.round(((sim.dayCfg.overlap != null ? OVERLAP_BEAT : countdownOf(sim)) + Math.min(EARLY_MAX_SPAWN, spawnLeft)) * EARLY_PER_SEC);
}

// Zombier som är kvar av vågorna som är igång: levande plus de som ännu inte kommit fram.
export const waveLeft = sim => sim.spawnQueue.length + sim.zombies.filter(z => !z.dead).length;

// Next wave: under nedräkningen eller mitt i en våg. Vågornas spawn läggs ihop.
// stack: false vägrar mitt i en våg så länge zombier är kvar ({ ok: false, reason: 'kvar', left }),
// så att ett vanligt tryck inte staplar vågor av misstag. Spelaren staplar med knappen eller
// Shift+Space (stack: true, standard för policyerna).
export function callNextWave(sim, { stack = true } = {}) {
  if (!canAct(sim) || !hasNextWave(sim)) return { ok: false, bonus: 0 };
  // 0.16.0: Next wave med bonus är upplåst från South dag 3; före det går nedräkningen av sig själv
  if (!allowed(sim, 'early')) return { ok: false, bonus: 0, reason: 'låst' };
  if (!stack && sim.phase === 'wave') {
    const left = waveLeft(sim);
    if (left > 0) return { ok: false, bonus: 0, reason: 'kvar', left };
  }
  const bonus = earlyBonus(sim);
  const index = launch(sim);
  sim.earlyCalls++;
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
  const hp = ZOMBIES[type].hp * (hpK ?? sim.dayCfg.hp ?? 1) * (sim.hpMul ?? 1) * (sim.tweaks?.hp ?? 1);
  // 0.12.0: de vilande kommer ut ur huset (door) på gatan framför det
  // 0.19.0 (H452): de som kliver ur pendeltåget kommer ut på perrongen vid dörren (cell)
  const at = door ? { ...sim.route.spawnAt(sim.rng, cell, id), house: door } : cell >= 0 ? sim.route.spawnAt(sim.rng, cell, id) : sim.route.spawn(sim.rng, spawnId, id);
  const z = { id, type, wave, hp, maxHp: hp, ...at, wob: sim.rng() * 6, dead: false, deadT: 0, blockedBy: null, breached: false, attacking: false, ...(ZOMBIES[type].shove ? { shove: true } : {}) };
  if (lead > 0) {
    const speed = ZOMBIES[type].speed * (sim.map.pace ?? 1) * (sim.tweaks?.speed ?? 1);
    const f0 = sim.route.fraction(z), stop = f0 + (1 - f0) * LEAD_MAX;
    // 0.11.0: på en bana med dis stannar försprånget i diset (ingen dyker upp mitt i kartan)
    const fog = sim.route.kind === 'grid' && sim.map.surroundings?.crisp;
    for (let left = lead * speed; left > 1e-9 && sim.route.fraction(z) < stop && (!fog || fogFactor(sim.map, z.x, z.z) >= FOG_SPEED - 1e-9); left -= 1) sim.route.advance(z, Math.min(1, left));
    z.lead = true;
  }
  sim.zombies.push(z);
  (sim.waveSpawned ??= [])[wave] = (sim.waveSpawned[wave] ?? 0) + 1;
  sim.events.push({ t: 'spawn', id: z.id });
}

// Överlappens grind (0.18.1, se OVERLAP_SPENT): öppen när nästa våg får börja räknas ned på en dag med överlapp.
// more: hur många till av den senaste vågen som ska ned innan dess (0 när den långa klockan gått ut), wait: sekunder
// kvar av den långa klockan, older: äldre vågor som inte är klara. Ren funktion av läget.
// De som står vid basens dörr (map.door, Mölnbo och ishallen) räknas som ute: de är förbi försvaret och tar sig in en i
// taget. En våg är igång (onRoad) så länge någon av dess zombier inte släppts än eller går levande utanför dörren.
const onRoad = z => !z.dead && !z.atDoor;
export function wavesOnRoad(sim) {
  const on = new Set();
  for (const q of sim.spawnQueue) on.add(q.wave);
  for (const z of sim.zombies) if (onRoad(z)) on.add(z.wave);
  return on;
}
export function overlapGate(sim) {
  const latest = sim.wavesStarted - 1, ov = sim.dayCfg.overlap;
  if (ov == null || latest < 0) return { open: false, more: 0, wait: null, older: 0 };
  const on = wavesOnRoad(sim);
  let older = 0;
  for (let k = 0; k < latest; k++) if (on.has(k)) older++;
  let queuedN = 0, alive = 0;
  for (const q of sim.spawnQueue) if (q.wave === latest) queuedN++;
  for (const z of sim.zombies) if (onRoad(z) && z.wave === latest) alive++;
  const queued = queuedN > 0, total = (sim.waveSpawned?.[latest] ?? 0) + queuedN;
  const more = Math.max(0, alive + queuedN - Math.floor((1 - OVERLAP_SPENT) * total + 1e-9));
  const wait = queued || sim.waveOutAt == null ? null : Math.max(0, ov - (sim.time - sim.waveOutAt));
  const open = !older && !queued && (more === 0 || wait === 0);
  return { open, more: wait === 0 ? 0 : more, wait, older };
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
    runCivilians(sim, dt);
    runArrival(sim);
    landGrenades(sim, dt);
    runSanity(sim, dt, null);
    runRetreats(sim);
    runRecrew(sim, dt, null);
    ageCorpses(sim, dt);
    checkEvac(sim);
    runTrain(sim, dt);
    if (sim.phase !== 'build') return;
    if (sim.nextWaveIn <= 1e-6) launch(sim);
    return;
  }
  if (sim.phase !== 'wave') return;
  sim.time += dt;
  if (sim.pendingBursts?.length) for (const b of sim.pendingBursts.filter(q => q.at <= sim.time)) { sim.pendingBursts.splice(sim.pendingBursts.indexOf(b), 1); sim.burst.push(b.ev.house); sim.events.push(b.ev); }
  runArrival(sim);
  while (sim.spawnQueue.length && sim.spawnQueue[0].at <= sim.time) spawn(sim, sim.spawnQueue.shift());
  // Överlapp: nedräkningen till nästa våg börjar när vågen kommit ut helt.
  const ov = sim.dayCfg.overlap;
  if (ov != null && hasNextWave(sim) && !sim.spawnQueue.length) {
    sim.waveOutAt ??= sim.time;
    if (sim.nextWaveIn == null) { if (overlapGate(sim).open) sim.nextWaveIn = OVERLAP_BEAT; }
    else { sim.nextWaveIn -= dt; if (sim.nextWaveIn <= 1e-6) launch(sim); }
  }
  runSoldiers(sim, dt);
  runMoves(sim, dt);
  moveZombies(sim, dt);
  runCivilians(sim, dt);
  const cells = zombieCells(sim);
  markCrossfire(sim, cells);
  fireWeapons(sim, dt, cells);
  fireLaunchers(sim, dt, cells);
  landGrenades(sim, dt);
  throwGrenades(sim, dt, cells);
  runSanity(sim, dt, cells);
  runRetreats(sim);
  runRecrew(sim, dt, cells);
  ageCorpses(sim, dt);
  if (sim.baseHp <= 0) { lose(sim, 'base'); return; }
  checkEvac(sim);
  runTrain(sim, dt);
  if (sim.phase !== 'wave') return;
  checkCleared(sim);
}
// Dagen förlorad: basen föll eller (0.13.0) för många civila föll. lostBy säger vilket.
function lose(sim, by) {
  sim.phase = 'lost'; sim.lostBy = by;
  const lesson = Math.max(0, LESSON_MIN - sim.intelEarned);
  if (lesson) { sim.intelEarned += lesson; sim.events.push({ t: 'lesson', intel: lesson }); }
  sim.lesson = lesson;
  sim.events.push({ t: 'lost', by });
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
    for (const u of sim.reserve ?? []) if (u.arrive === sim.waveIndex) sim.events.push({ t: 'arrived', type: u.type, uid: u.uid });
  }
  // 0.13.0: en evakueringsdag vinns bara när de civila är framme (checkEvac); vågorna fortsätter tills dess
  if (sim.waveIndex >= sim.dayCfg.waves.length) { if (sim.evac || sim.train) sim.phase = 'wave'; else { sim.phase = 'won'; sim.events.push({ t: 'won' }); } }
  else if (sim.waveIndex === sim.wavesStarted) { sim.phase = 'build'; sim.nextWaveIn = Math.max(sim.nextWaveIn ?? 0, countdownOf(sim)); }
}

// 0.18.1 (funnet under vågpasset: Mölnbo dag 4 stod 57 zombier i sju minuter och slog på ett hus där hela gruppen
// redan låg): ett hus med garnison går att storma så länge någon är kvar inne. Är dörren inslagen och alla nere går
// horden vidare.
const manned = g => !!g.house && !(g.house.broken && (g.squad ? g.soldiers.every(s => s.down) : g.silent));
function moveZombies(sim, dt) {
  const hitCells = new Set();
  const troops = activeSoldiers(sim), hurt = new Set(), others = exposedUnits(sim), crews = crewTargets(sim), held = sim.guns.filter(manned);
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
    // 0.13.0 (H134, H135): ett lag på väg med sin pjäs, och pillboxen, går att slå på; de civila på väg
    // till ishallen också (H105). Bara om zombien inte redan slår en soldat.
    if (!z.foe && (others.length || sim.civilians.length)) {
      const p = zombiePos(sim, z);
      let foe = null, fd = Infinity;
      for (const o of others) { const d = Math.hypot(o.x - p.x, o.z - p.z); if (d <= o.reach && d < fd) { fd = d; foe = o; } }
      for (const c of sim.civilians) { if (c.state !== 'walk') continue; const d = Math.hypot(c.x - p.x, c.z - p.z); if (d <= CIV_REACH && d < fd) { fd = d; foe = { x: c.x, z: c.z, civ: c }; } }
      if (foe) {
        mul = 0; z.attacking = true; z.foe = [foe.x, foe.z];
        if (foe.civ) hitCivilian(sim, foe.civ, def.hitDamage * dt);
        else hitUnit(sim, foe.g, def.hitDamage * dt, hurt);
      }
    }
    // 0.18.0 (skiva 1): pjäslagen går att slå ner (allow 'overrun'): en zombie i en ruta intill pjäsens slår laget.
    // Och ett hus med garnison går att storma: den som går förbi intill huset slår på dörren (assaults).
    if (!z.foe && (crews.length || held.length)) {
      const p = zombiePos(sim, z), pl = sim.place, k = pl.keyAt(p.x, p.z);
      const zi = Math.floor((p.x - pl.origin[0]) / pl.size), zj = Math.floor((p.z - pl.origin[1]) / pl.size);
      let foe = null, fd = Infinity;
      for (const c of crews) {
        if (c.g.silent || Math.abs(c.i - zi) > 1 || Math.abs(c.j - zj) > 1) continue;
        const d = Math.hypot(c.g.x - p.x, c.g.z - p.z);
        if (d < fd) { fd = d; foe = c.g; }
      }
      if (foe) { mul = 0; z.attacking = true; z.foe = [foe.x, foe.z]; hitCrew(sim, foe, def.hitDamage * dt, hurt); }
      else if (k >= 0) for (const g of held) {
        if (!g.house || !houseById(sim.map, pl, g.house.id)?.touch.has(k) || !assaults(sim, z)) continue;
        mul = 0; z.attacking = true; z.foe = [g.house.x, g.house.z];
        attackHouse(sim, g, def.hitDamage * dt, hurt);
        break;
      }
    }
    // map.pace (0.10.1, Gnesta Norr): banans takt, alla sorter lika (vägen dit är lång).
    const fog = sim.route.kind === 'grid' ? fogFactor(sim.map, z.x, z.z) : 1;
    if (def.stumble && mul > 0) mul *= stumble(sim, z, def.stumble, dt, fog);
    const speed = def.speed * mul * (sim.map.pace ?? 1) * (sim.tweaks?.speed ?? 1) * fog;
    z.v = speed;
    z.run = (z.run ?? 0) + speed * dt;
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
// 0.16.4 (Olas bonus): löparna snubblar ibland. Allt ur zombiens id och simuleringens frö, inte ur sim.rng, så att inget
// annat slumpas om. Inte i diset, där ingen ser det, och inte när zombien står still (slår eller väntar).
// 0.19.0 (H454, H455, Ola: "klonk, rakt ner, kryper på stället, plopp", och för ofta och för jämnt): sällsynt och
// oregelbundet, helst utlöst av något. Var every[0] till every[1] meter provas ett snubbel med chansen chance; dessutom
// kan en tung träff (12,7 mm, granat), taggtråden och en skarp sväng fälla löparen (trigger: chansen per tillfälle).
// Farten behålls: tre varianter med var sin fartkurva (variants, aldrig noll), vyn ritar samma variant (stumbleOf):
//   trip      snavar, viftar och tar emot sig utan att falla (vanligast, kort)
//   slide     faller och glider framåt med farten, som ebbar ut, och kommer upp
//   scramble  faller och kravlar upp på alla fyra medan den rör sig framåt
// 0.19.0 (funnet under H454): mix32 gav ett tal 0..1, och det inre anropet i stumbleRoll och assaults blev då 0 i det
// yttre (a ^ ... avrundar). Alla zombier fick samma tärning: alla löpare snubblade likadant, och varje zombie stormade
// ett hus med garnison (tärningen 0,26 under ASSAULT 0,3). mixU ger heltalet, mix32 talet 0..1 ur det.
const mixU = (a, b) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 13; return h >>> 0; };
const mix32 = (a, b) => mixU(a, b) / 4294967296;
const stumbleRoll = (sim, z, n, k) => mix32(mixU((sim.seed ?? 1) | 0, z.id * 131 + k), n);
// Farten i snubblet vid u (0..1): kurvans punkter [u, fart] linjärt emellan.
export function stumbleSpeed(v, u) {
  const P = v.speed;
  for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const [a, sa] = P[i - 1], [b, sb] = P[i]; return sa + (sb - sa) * (u - a) / Math.max(1e-9, b - a); }
  return P[P.length - 1][1];
}
// Varianten ur en tärning r (0..1): vikterna i ordning, eller (fall: true) bara de som faller.
function stumbleKind(st, r, fall = false) {
  const vs = st.variants.filter(v => !fall || v.fall), tot = vs.reduce((a, v) => a + v.w, 0);
  let acc = 0;
  for (const v of vs) { acc += v.w / tot; if (r < acc) return v.id; }
  return vs[vs.length - 1].id;
}
function startStumble(sim, z, st, kind, why) {
  const v = st.variants.find(q => q.id === kind);
  z.stumbleT = v.time; z.stumbleK = kind; z.stumbleAt = z.run ?? 0;
  sim.events.push({ t: 'stumble', id: z.id, kind, why });
}
// Utlöst snubbel (H454): why 'heavy' | 'wire' | 'turn'. Chansen trigger[why], inte strax efter ett annat snubbel
// (st.gap meter), inte i diset. Ren funktion av zombien, fröet och hur många gånger den provats.
function tripBy(sim, z, why) {
  const st = ZOMBIES[z.type]?.stumble;
  if (!st?.trigger?.[why] || z.dead || z.stumbleT > 0 || z.attacking) return;
  if ((z.run ?? 0) - (z.stumbleAt ?? -Infinity) < st.gap) return;
  if (sim.route.kind === 'grid' && fogFactor(sim.map, z.x, z.z) > 1 + 1e-9) return;
  const n = z.trigN = (z.trigN ?? 0) + 1;
  if (stumbleRoll(sim, z, n, 7) >= st.trigger[why]) return;
  startStumble(sim, z, st, stumbleKind(st, stumbleRoll(sim, z, n, 8), why === 'heavy'), why);
}
function stumble(sim, z, st, dt, fog) {
  if (z.stumbleT > 0) {
    const v = st.variants.find(q => q.id === z.stumbleK);
    z.stumbleT = Math.max(0, z.stumbleT - dt);
    return stumbleSpeed(v, 1 - z.stumbleT / v.time);
  }
  // en skarp sväng (rutnätets riktning vrider sig mer än st.turn grader på en meter)
  if (st.trigger?.turn && fog <= 1 + 1e-9) {
    const q = sim.route.place(z), h = Math.atan2(q.dirZ, q.dirX);
    if (z.hd != null && (z.run ?? 0) - (z.hdAt ?? 0) <= 1.5) {
      const d = Math.abs(Math.atan2(Math.sin(h - z.hd), Math.cos(h - z.hd)));
      if (d > st.turn * Math.PI / 180) { z.hd = h; z.hdAt = z.run; tripBy(sim, z, 'turn'); if (z.stumbleT > 0) return stumble(sim, z, st, 0, fog); }
    }
    if (z.hd == null || (z.run ?? 0) - (z.hdAt ?? 0) > 1) { z.hd = h; z.hdAt = z.run ?? 0; }
  }
  const n = z.tripN ?? 0;
  z.trip ??= (z.run ?? 0) + st.every[0] + (st.every[1] - st.every[0]) * stumbleRoll(sim, z, n, 1);
  if ((z.run ?? 0) < z.trip) return 1;
  z.tripN = n + 1;
  z.trip = z.run + st.every[0] + (st.every[1] - st.every[0]) * stumbleRoll(sim, z, n + 1, 1);
  if (fog > 1 + 1e-9 || stumbleRoll(sim, z, n, 2) >= st.chance) return 1;
  if ((z.run ?? 0) - (z.stumbleAt ?? -Infinity) < st.gap) return 1;
  startStumble(sim, z, st, stumbleKind(st, stumbleRoll(sim, z, n, 3)), 'run');
  return stumble(sim, z, st, 0, fog);
}
// Snubblets läge för vyn: null, eller { kind: 'trip' | 'slide' | 'scramble', u: 0..1 genom snubblet, side: -1 | 1 (åt
// vilket håll kroppen vrids och vilken arm som tar emot först, fast per zombie och snubbel) }.
export function stumbleOf(z) {
  const st = ZOMBIES[z.type]?.stumble;
  if (!st || !(z.stumbleT > 0)) return null;
  const v = st.variants.find(q => q.id === z.stumbleK);
  if (!v) return null;
  return { kind: v.id, u: 1 - z.stumbleT / v.time, side: ((z.id * 7 + (z.tripN ?? 0) + (z.trigN ?? 0)) & 1) ? 1 : -1 };
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
// 0.13.0: på väg till en ny plats (Move) går han längs sin väg (s.path) i gruppens fart.
function runSoldiers(sim, dt) {
  for (const g of sim.guns) if (g.squad) for (const s of g.soldiers) {
    if (s.path) {
      if (s.down) { s.path = null; s.run = 0; s.from = null; continue; }
      s.path.d = Math.min(s.path.len, s.path.d + s.speed * dt);
      s.run = (s.path.len - s.path.d) / s.speed;
      if (s.path.d >= s.path.len - 1e-9) { s.path = null; s.run = 0; s.from = null; }
    } else if (s.run > 0) { s.run = Math.max(0, s.run - dt); if (!s.run) s.from = null; }
  }
  // 0.18.1 (H426): framme vid dörren går gruppen in
  for (const g of sim.guns) if (g.squad && g.enter && g.soldiers.every(s => s.down || (!s.path && !(s.run > 0)))) enterHouse(sim, g);
}
// Gruppen eller laget som sprungit till dörren går in i huset (samma som uppställningens flytt in).
function enterHouse(sim, g) {
  const e = g.enter;
  delete g.enter;
  if (g.retreat || g.silent || (g.squad && g.soldiers.every(s => s.down))) return;
  const h = houseById(sim.map, sim.place, e.house);
  if (!h || (sim.brokenHouses ?? []).includes(h.id) || sim.guns.some(q => q !== g && q.house?.id === h.id)) return;
  occupyHouse(sim, g, h, g.squad ? g.soldiers.length : 0);
  g.cell = e.key; g.weapon.targetId = null;
  sim.events.push({ t: 'enteredHouse', gunId: g.id, house: h.id, x: h.x, z: h.z });
}
function activeSoldiers(sim) {
  const out = [];
  const w = sim.place.w;
  for (const g of sim.guns) if (g.squad && !g.house) for (const s of g.soldiers) {
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
  s.hp -= amount * (g.weapon.sandbags ? SUPPLIES.sandbags.take : 1);
  const key = g.id + ':' + s.i;
  if (!hurt.has(key)) { hurt.add(key); sim.events.push({ t: 'soldierHit', gunId: g.id, soldier: s.i, x: s.x, z: s.z }); }
  if (s.hp <= 0 && !s.down) {
    s.hp = 0; s.down = true; s.targetId = null;
    sim.events.push({ t: 'soldierDown', gunId: g.id, soldier: s.i, x: s.x, z: s.z });
    shake(sim, g, SANITY.downOwn, s.x, s.z, SANITY.downNear);
  }
}
// 0.13.0: pjäser som zombierna kan slå på: ett lag som flyttar sin pjäs (laget har crewHp) och pillboxen
// (hela tiden, den har hp). { g, x, z, reach }.
export const CREW_HP = 30;       // liv per man i ett lag som bär sin pjäs
function exposedUnits(sim) {
  const out = [];
  for (const g of sim.guns) {
    if (g.squad) continue;
    if (WEAPONS[g.weapon.type].vehicle) { const p = gunPos(g); out.push({ g, x: p.x, z: p.z, reach: VEHICLE_REACH }); }
    else if (g.move && g.move.crewHp > 0) { const p = gunPos(g); out.push({ g, x: p.x, z: p.z, reach: 1.6 }); }
  }
  return out;
}
function hitUnit(sim, g, amount, hurt) {
  if (!sim.guns.includes(g)) return;
  const veh = !!WEAPONS[g.weapon.type].vehicle;
  if (veh) g.hp -= amount; else g.move.crewHp -= amount;
  const p = gunPos(g);
  if (!hurt.has(g.id)) { hurt.add(g.id); sim.events.push({ t: veh ? 'vehicleHit' : 'crewHit', gunId: g.id, x: p.x, z: p.z }); }
  if ((veh ? g.hp : g.move.crewHp) <= 0) {
    const i = sim.guns.indexOf(g);
    if (i >= 0) sim.guns.splice(i, 1);
    sim.squadPlan = null;
    sim.events.push({ t: veh ? 'vehicleDown' : 'crewLost', gunId: g.id, type: g.weapon.type, x: p.x, z: p.z });
  }
}
// Gruppens val av rutor för markeringen i key, sparat så att spöket, kollen och bygget inte räknar
// om samma sak (nyckeln: rutan, pjäserna och hindren).
function squadPlanAt(sim, key, type, count = null) {
  const n = count ?? deployMen(sim, type);
  const sig = `${type}|${key}|${n}|${sim.guns.map(g => g.id + (g.squad ? ':' + g.soldiers.length : '')).join(',')}|${Object.keys(sim.obstacles).join(',')}`;
  if (sim.squadPlan?.sig === sig) return sim.squadPlan.plan;
  const plan = planSquad(sim, key, { type, count: n });
  sim.squadPlan = { sig, plan };
  return plan;
}
export const squadPreview = (sim, key, type = 'hv') => {
  if (!sim.place.valid(key)) return [];
  const gh = garrisonHouse(sim, key, type);
  return gh ? houseWindows(sim, gh, type, deployMen(sim, type)) : squadPlanAt(sim, key, type);
};
// Ersätter gruppens stupade soldater (panelen): SQUAD.reinforce per soldat. De springer ut från
// markeringen igen med fullt liv. (Nästa dag börjar alla om ändå.)
export function reinforce(sim, id) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id);
  if (!g?.squad) return { ok: false, reason: 'okänd' };
  if (g.weapon.uid != null) return { ok: false, reason: 'depå' };
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

// ---------- kärntrupperna (0.14.0) ----------
// Uppställningen: före första vågen (ingen våg startad, ingen nedräkning).
export const deployPhase = sim => sim.phase === 'build' && sim.wavesStarted === 0;
// 0.16.0: en enhet som kommer senare (late) är framme när vågen före den är klar, och går då att ställa ut
// resten av dagen (E4 dag 1: "A second Ksp 90. Place it too.").
export const arrived = (sim, u) => !u.arrive || sim.waveIndex >= u.arrive;
// 0.18.0: en enhet som vikit eller flytt (rallied) står i reserven och går att ställa ut igen när den samlats (readyAt).
export const canDeploy = (sim, u) => !!u && arrived(sim, u) && (deployPhase(sim) || ((!!u.arrive || !!u.rallied) && canAct(sim) && !(u.readyAt > sim.time)));
// Nästa enhet av typen i reserven som är framme: den med uid, annars högst nivå, sedan erfarenhet, sedan flest man.
export function nextReserve(sim, type, uid = null) {
  if (!sim.reserve) return null;
  if (uid != null) return sim.reserve.find(u => u.uid === uid && u.type === type && arrived(sim, u)) ?? null;
  let best = null;
  // 0.18.0: mitt i dagen den som går att ställa ut (en samlad enhet) före de som väntar till i morgon; lika nivå,
  // stjärna och man: den mest utvilade
  const ready = !deployPhase(sim) && sim.reserve.some(u => u.type === type && canDeploy(sim, u));
  for (const u of sim.reserve) {
    if (u.type !== type || !arrived(sim, u) || (ready && !canDeploy(sim, u))) continue;
    if (!best || u.level > best.level || (u.level === best.level && ((u.vet ?? 0) > (best.vet ?? 0) || ((u.vet ?? 0) === (best.vet ?? 0) && ((u.men ?? 0) > (best.men ?? 0) || ((u.men ?? 0) === (best.men ?? 0) && (u.fatigue ?? 0) < (best.fatigue ?? 0))))))) best = u;
  }
  return best;
}
export const reserveCount = (sim, type) => (sim.reserve ? sim.reserve.filter(u => u.type === type && arrived(sim, u)).length : 0);
// Enheter i reserven som går att ställa ut just nu (uppställningen, eller en sen enhet som kommit fram).
export const readyCount = (sim, type) => (sim.reserve ? sim.reserve.filter(u => u.type === type && canDeploy(sim, u)).length : 0);
// Gruppens storlek när den ställs ut: kärntruppens man (förlusterna följer med), annars nivå 1.
const deployCount = (u, sim, type) => u.men ?? squadSize(u.level ?? 1, sim.research, type);
export const deployMen = (sim, type) => (sim.core ? (nextReserve(sim, type)?.men ?? squadSize(nextReserve(sim, type)?.level ?? 1, sim.research, type)) : squadSize(1, sim.research, type));
// Pjäsens siffror just nu: vapnet med nivå och forskning, plus erfarenhetens stjärna (lite bättre träff och
// omladdning) och ammunitionslådan (förnödenheter: fortare eld resten av dagen).
export function gunStats(sim, g) {
  const w = g.weapon, st0 = weaponStats(w.type, w.level, sim.research);
  const st = g.roof && sim.place.perch?.[g.cell] === 3 ? { ...st0, range: st0.range * TOWER_RANGE } : st0;
  // 0.18.0: sanity (allow 'sanity') och tröttheten (allow 'fatigue') sänker träff och eldtakt
  const sf = allowed(sim, 'sanity') && g.sanity != null ? sanityFactor(g.sanity) : null;
  const fat = allowed(sim, 'fatigue') ? w.fatigue | 0 : 0;
  if (!w.vet && !w.ammo && !fat && (!sf || sf.accuracy === 1)) return st;
  const acc = Math.min(VETERAN.maxAccuracy, st.accuracy + (w.vet ? VETERAN.accuracy : 0)) * (sf?.accuracy ?? 1) * FATIGUE.accuracy[fat];
  return { ...st, accuracy: acc, rate: st.rate * (w.vet ? VETERAN.rate : 1) * (w.ammo ? SUPPLIES.ammo.rate : 1) * (sf?.rate ?? 1) * FATIGUE.rate[fat] };
}
// Förnödenheter till en utställd enhet (0.14.0): ammunition (alla) och sandsäckar (grupperna: soldaterna
// tar mindre skada). En gång per enhet och dag.
export function buySupply(sim, id, what) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id), sp = SUPPLIES[what];
  if (!g || !sp) return { ok: false, reason: 'okänd' };
  if (!allowed(sim, 'unitSupplies')) return { ok: false, reason: 'ej upplåst' };
  if (what === 'sandbags' && !g.squad) return { ok: false, reason: 'okänd' };
  if (g.weapon[what]) return { ok: false, reason: 'redan' };
  if (sim.cash < sp.cost) return { ok: false, reason: 'pengar' };
  sim.cash -= sp.cost;
  g.weapon[what] = true;
  return { ok: true, cost: sp.cost };
}
// Vad som blev kvar av kärntrupperna (src/meta/operation.js finishDay): per utställd enhet hur många som
// står (grupperna) eller om den gick förlorad, förlusterna, och underlaget för bonusarna. null utan core.
export function dayReport(sim) {
  if (!sim.core) return null;
  const units = [];
  let lostMen = 0, lostUnits = 0;
  for (const d of sim.deployed) {
    const g = sim.guns.find(x => x.weapon.uid === d.uid);
    // 0.18.0: en enhet som vikit eller flytt tillbaka till reserven lever
    const back = !g && sim.reserve?.find(u => u.uid === d.uid && u.rallied);
    if (back) { if (back.men != null) { lostMen += Math.max(0, (d.men ?? back.men) - back.men); units.push({ uid: d.uid, alive: back.men }); if (!back.men) lostUnits++; } else units.push({ uid: d.uid }); continue; }
    if (!g) { units.push({ uid: d.uid, destroyed: true }); lostUnits++; if (d.men) lostMen += d.men; continue; }
    if (g.squad) { const alive = g.soldiers.filter(s => !s.down).length; lostMen += g.soldiers.length - alive; units.push({ uid: d.uid, alive }); if (!alive) lostUnits++; }
    else units.push({ uid: d.uid });
  }
  const later = sim.dayCfg.waves.length - 1;
  return {
    units, lostMen, lostUnits,
    baseIntact: sim.baseHp >= sim.map.baseHp,
    fewLosses: lostUnits === 0 && lostMen <= 1,
    fast: later > 0 && sim.earlyCalls >= Math.ceil(later / 2),
  };
}

// ---------- vapen ----------
const gunOf = (sim, id) => sim.guns.find(g => g.id === id);

// Går det att ställa ett vapen i rutan key? Skälen i ordning: dagen slut, fullt, utanför
// kartan, rutans innehåll (gata, hus, skog ...), för nära ett annat vapen. type: vapnet som ska
// stå där. Ett vapen med roof (Psg 90) får också stå på ett hustak (en husruta med takhöjd).
// 0.12.1: pjäserna och Hemvärnets grupper har var sitt tak (maxGuns, maxSquads).
export const gunCount = sim => sim.guns.filter(g => !g.squad).length;
export const squadCount = sim => sim.guns.filter(g => g.squad).length;
// 0.14.0: med kärntrupperna gäller sektorns frontbredd (map.frontage): så många enheter, pjäser och grupper
// tillsammans, får stå ute samtidigt. Resten väntar i reserven.
export const frontage = sim => (sim.core ? sim.map.frontage ?? Infinity : Infinity);
export const capFull = (sim, type) => (sim.core ? sim.guns.length >= frontage(sim) : isSquad(type) ? squadCount(sim) >= sim.maxSquads : gunCount(sim) >= sim.maxGuns);
export const onRoof = (sim, key, type) => !!WEAPONS[type]?.roof && sim.place.kind[key] === KIND.house && roofAt(sim.place, key) > 0;
// ignore (0.12.0, Move): pjäsen som flyttas räknas inte (varken mot taket eller avståndet).
// moved (intern): antalet man i gruppen som flyttas (pjäsen ignore är redan borttagen ur listan).
export function checkSpot(sim, key, type = null, { ignore = null, moved = null } = {}) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  // 0.13.0 (H104): bara det sektorn har i förrådet i dag. 0.14.0: med kärntrupperna det som står i reserven,
  // och bara i uppställningen (före första vågen). En flytt gäller en enhet som redan står ute.
  const moving = ignore != null || moved != null;
  if (sim.core && type && !moving) {
    const u = nextReserve(sim, type);
    if (!u) return { ok: false, reason: 'reserv' };
    if (!canDeploy(sim, u)) return { ok: false, reason: 'uppställd' };
  } else if (!sim.core && type && !moving && !inArsenal(type, sim.map, sim.dayCfg)) return { ok: false, reason: 'ej här' };
  if (!moving && capFull(sim, type)) return { ok: false, reason: sim.core ? 'front' : isSquad(type) ? 'fulltHv' : 'fullt' };
  if (ignore != null) {
    const g = gunOf(sim, ignore);
    return without(sim, ignore, () => checkSpot(sim, key, type, { moved: g?.squad ? g.soldiers.filter(q => !q.down).length || g.soldiers.length : 0 }));
  }
  const p = sim.place;
  if (!p.valid(key)) return { ok: false, reason: 'utanför' };
  // 0.16.0: E4 dag 1, bara de markerade platserna
  if (sim.marked && !moving && !sim.marked.has(key)) return { ok: false, reason: 'markerad' };
  const kind = p.kind[key];
  // 0.18.0: trupper i hus (allow 'garrison')
  if (kind === KIND.house && type && !onRoof(sim, key, type)) { const gc = garrisonCheck(sim, key, type, moved); if (gc) return gc; }
  if (kind !== KIND.open && !onRoof(sim, key, type)) return { ok: false, reason: kind === KIND.house && WEAPONS[type]?.roof ? 'kant' : KIND_REASON[kind] || 'okänd' };
  const c = p.center(key);
  if (sim.guns.some(g => Math.hypot(g.x - c.x, g.z - c.z) < MIN_SPACING - 1e-9)) return { ok: false, reason: 'nära' };
  // Hemvärnet: en pjäs står inte i en soldats ruta, och gruppen behöver rum för alla.
  // Gruppens storlek med forskningen (Bigger squad): ingen soldat tas betalt för som inte får plats.
  if (isSquad(type)) { if (squadPlanAt(sim, key, type, moved || null).length < (moved || deployMen(sim, type))) return { ok: false, reason: 'trångt' }; }
  else if (sim.guns.some(g => g.squad && g.soldiers.some(s => Math.hypot(s.x - c.x, s.z - c.z) < SQUAD.gunGap - 1e-9))) return { ok: false, reason: 'nära' };
  return { ok: true };
}
// Rutan under en punkt på marken, eller -1 utanför kartan.
export const spotAt = (sim, x, z) => sim.place.keyAt(x, z);
// Sikten från en ruta för ett vapen av typen (största räckvidden, nivå 3). På ett tak ser
// skytten över husen (placement.js, roofSightFrom).
// 0.12.0 (H108): ett vapen med en skjutsektor (cone, Psg 90) ser bara inom konen runt facing
// (radianer). Utan facing väljs riktningen som ser mest av hordens väg. Svaret har då facing.
// 0.13.0 (H132): varje pjäs med skjutvinkel (cone) har sin sikt inom vinkeln; hela sikten (utan vinkeln)
// sparas på pjäsen (fullSight) så att Rotate kan vrida den.
export function sightFor(sim, key, type, facing = null) {
  return withCone(sim, key, type, baseSight(sim, key, type), facing);
}
function baseSight(sim, key, type) {
  const gh = garrisonHouse(sim, key, type);
  if (gh) return unionSight(sim.place, houseWindows(sim, gh, type, isSquad(type) ? deployMen(sim, type) : 1));
  return isSquad(type) ? unionSight(sim.place, squadPreview(sim, key, type))
    : (onRoof(sim, key, type) ? roofSightFrom : sightFrom)(sim.place, key, weaponStats(type, MAX_LEVEL, sim.research).range * (inTower(sim, key, type) ? TOWER_RANGE : 1));
}
// 0.17.2 (H301): ett torn (perch 3: Mölnbos trapptorn och missionskyrkans klocktorn) ger prickskytten längre räckvidd
// utöver höjdens sikt över husen
export const TOWER_RANGE = 1.15;
export const inTower = (sim, key, type) => onRoof(sim, key, type) && sim.place.perch?.[key] === 3;
function withCone(sim, key, type, base, facing) {
  const cone = WEAPONS[type]?.cone;
  if (!cone) return base;
  const f = facing ?? bestFacing(sim.place, key, base, hordeWeight(sim), cone);
  return coneSight(sim.place, key, base, f, cone);
}
// Riktningen en pjäs får av sig själv på platsen (vanligt klick): den som ser mest av hordens väg.
export const autoFacing = (sim, key, type) => (WEAPONS[type]?.cone ? sightFor(sim, key, type).facing : null);

// Ställ ut ett vapen i rutan key. Returnerar { ok, id }.
export function build(sim, key, type, opts = {}) {
  if (!WEAPONS[type]) return { ok: false, reason: 'okänd' };
  const check = checkSpot(sim, key, type);
  if (!check.ok) return check;
  // 0.14.0: kärntrupperna ur reserven (gratis, med enhetens nivå, erfarenhet och man)
  const unit = sim.core ? nextReserve(sim, type, opts.uid) : null;
  if (sim.core && !unit) return { ok: false, reason: 'reserv' };
  if (!sim.core && !weaponUnlocked(type, sim.research, sim.map)) return { ok: false, reason: 'ej upplåst' };
  const cost = sim.core ? 0 : WEAPONS[type].cost;
  if (sim.cash < cost) return { ok: false, reason: 'pengar' };
  sim.cash -= cost;
  const level = unit?.level ?? 1;
  // 0.18.0: tröttheten följer med (allow 'fatigue'), och en enhet som samlats efter ett vik har sin sanity
  const fat = unit && allowed(sim, 'fatigue') ? unit.fatigue | 0 : 0;
  const core = unit ? { uid: unit.uid, ...(unit.vet ? { vet: unit.vet } : {}), ...(fat ? { fatigue: fat } : {}) } : {};
  if (unit) {
    sim.reserve.splice(sim.reserve.indexOf(unit), 1);
    if (!sim.deployed.some(d => d.uid === unit.uid)) sim.deployed.push({ uid: unit.uid, type, men: unit.men ?? null });
  }
  const c = sim.place.center(key);
  const id = 'g' + sim.nextGun++;
  const extra = { sanity: unit?.sanity ?? SANITY.max, tgt: 'first' };
  if (check.house != null) {
    const h = houseById(sim.map, sim.place, check.house);
    const g = { id, x: h.x, z: h.z, y: 0, roof: false, cell: key, ...extra, weapon: { type, level, cooldown: 0, angle: Math.PI, targetId: null, spent: cost, ...core, ...(WEAPONS[type].launcher ? { lCooldown: 0 } : {}) } };
    if (isSquad(type)) { g.squad = true; g.soldiers = []; }
    occupyHouse(sim, g, h, isSquad(type) ? (unit ? deployCount(unit, sim, type) : squadSize(level, sim.research, type)) : 0);
    if (!g.squad) initCrew(g);
    sim.guns.push(g);
    sim.squadPlan = null;
    sim.events.push({ t: 'garrison', gunId: id, house: h.id });
    return { ok: true, id };
  }
  // y: takets höjd för en pjäs på ett tak (0 på marken). roof: står på ett tak.
  const roof = onRoof(sim, key, type);
  if (isSquad(type)) {
    // Gruppen: markeringen står i key, soldaterna i sina valda rutor (squad.js).
    const plan = squadPlanAt(sim, key, type, unit ? deployCount(unit, sim, type) : null);
    const soldiers = plan.map((pc, i) => makeSoldier(pc, i, level, c, sim.research, type));
    sim.guns.push({ id, x: c.x, z: c.z, y: 0, roof: false, cell: key, squad: true, soldiers, sight: unionSight(sim.place, soldiers), ...extra,
      weapon: { type, level, cooldown: 0, angle: soldiers[0]?.face ?? Math.PI, targetId: null, spent: cost, ...core } });
    return { ok: true, id };
  }
  const def = WEAPONS[type];
  const base = baseSight(sim, key, type);
  // 0.16.0: sikta-dra är upplåst från E4 dag 3; före det vänds pjäsen mot hordens väg
  const sight = withCone(sim, key, type, base, allowed(sim, 'aim') ? opts.facing ?? null : null);
  // 0.12.0 (H098): värnet på marken vänds mot hordens väg och byggs mot skyddet som redan står där
  const emplace = roof || def.vehicle ? null : emplacement(sim.place, key, sight.keys, hordeWeight(sim));
  const g = { id, x: c.x, z: c.z, y: roof ? roofAt(sim.place, key) : 0, roof, cell: key, sight, ...(def.vehicle ? { tgt: 'first' } : extra), ...(sight.facing != null ? { facing: sight.facing } : {}), ...(emplace ? { emplace } : {}),
    weapon: { type, level, cooldown: 0, angle: sight.facing ?? emplace?.face ?? Math.PI, targetId: null, spent: cost, ...core, ...(def.launcher ? { lCooldown: 0 } : {}) } };
  if (def.cone) g.fullSight = base;
  // 0.13.0 (H135): pillboxen har liv och svetsas ihop i def.build sekunder (före första vågen: direkt)
  if (def.vehicle) { g.hp = g.maxHp = def.hp[level - 1]; if (clock(sim)) g.building = def.build; }
  else initCrew(g);
  sim.guns.push(g);
  return { ok: true, id };
}
export function upgrade(sim, id) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id);
  if (!g) return { ok: false, reason: 'okänd' };
  const w = g.weapon;
  // 0.14.0: kärntruppernas nivåer köps i förrådet mellan dagarna
  if (w.uid != null) return { ok: false, reason: 'depå' };
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
  // 0.13.0: pillboxen får nivåns liv (skadan står kvar)
  const hpL = WEAPONS[w.type].vehicle ? WEAPONS[w.type].hp[w.level - 1] : null;
  if (hpL) { g.hp += hpL - g.maxHp; g.maxHp = hpL; }
  return { ok: true };
}
// Får gruppens nästa nivå plats? want: nya man som nivån ger, fit: hur många som får plats.
export function squadRoom(sim, id) {
  const g = gunOf(sim, id);
  if (!g?.squad || upgradeCost(g.weapon.type, g.weapon.level) == null) return { want: 0, fit: 0, plan: [] };
  const want = Math.max(0, squadSize(g.weapon.level + 1, sim.research, g.weapon.type) - g.soldiers.length);
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
  const hp = soldierHp(g.weapon.level, sim.research, g.weapon.type);
  for (const s of g.soldiers) { const d = hp - s.maxHp; s.maxHp = hp; if (!s.down) s.hp += d; }
  if (!add?.length) return;
  const mine = g.soldiers;
  for (const pc of add) mine.push(makeSoldier(pc, mine.length, g.weapon.level, g, sim.research, g.weapon.type));
  g.sight = unionSight(sim.place, mine);
}
// ---------- flytta (0.12.0, H102; riktiga vägar 0.13.0, H134 och H136) ----------
// Laget går en riktig väg (src/sim/crew-path.js: gator, tomter, gräs, aldrig genom hus) från där det står,
// genom spelarens waypoints (via, rutnycklar i ordning), till den nya platsen. En pjäs packas ihop
// (move.pack s), bärs längs vägen i lagets fart och ställs upp (move.setup s); under hela flytten skjuter
// den inte, och laget (move.crew man, CREW_HP var) kan slås ner av zombier på vägen (då är pjäsen
// förlorad). Ksp 88 är monterad och kan inte flyttas, bara säljas. Pillboxen kryper i en fjärdedel av
// infanteriets fart och har sina egna hp. Hemvärnet, infanteriet och de civila springer: varje soldat sin
// egen väg till sin nya ruta, i gruppens fart, och kan slås ner där han springer. Uppgraderingar och
// granatlådan följer med; befästningen på den gamla platsen ligger kvar (bara bild). Går tiden inte (före
// första vågen) står pjäsen klar direkt på den nya platsen.
export const MOVE_INFO = type => WEAPONS[type]?.move ?? null;
export const canMoveType = type => !WEAPONS[type]?.mounted && (isSquad(type) || !!WEAPONS[type]?.move);
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
  if (m.t < m.pack) return 'pack';
  if (m.t < m.pack + m.travel) return 'carry';
  return 'setup';
}
// Pjäsens läge just nu (på väg: längs vägen). { x, z, dir }.
export function gunPos(g) {
  const m = g.move;
  if (!m) return { x: g.x, z: g.z, dir: g.facing ?? 0 };
  const ph = movePhase(g);
  if (ph === 'pack') return { x: m.from.x, z: m.from.z, dir: alongPath(m.path, 0).dir };
  if (ph === 'carry') return alongPath(m.path, (m.t - m.pack) * m.speed);
  return { x: g.x, z: g.z, dir: alongPath(m.path, m.path.len).dir };
}
// Vägen för en pjäs eller en soldat från (x, z) genom via till rutan key, eller null.
export const crewPathTo = (sim, from, key, via = []) => crewRoute(sim.place, from, key, via);
// Kan pjäsen id flyttas till rutan key just nu (genom via)? Samma skäl som checkSpot, plus 'flyttar',
// 'fast' (Ksp 88), 'bygger' (pillboxen svetsas ihop) och 'ingen väg'.
// opts.path: false hoppar över vägsökningen (snäppningen provar många rutor; vägen provas en gång sist).
export function checkMove(sim, id, key, via = [], { path = true } = {}) {
  const g = gunOf(sim, id);
  if (!g) return { ok: false, reason: 'tom' };
  if (!allowed(sim, 'move')) return { ok: false, reason: 'låst' };
  if (!canMoveType(g.weapon.type)) return { ok: false, reason: 'fast' };
  if (g.move || (g.squad && g.soldiers.some(s => s.path))) return { ok: false, reason: 'flyttar' };
  if (g.building > 0) return { ok: false, reason: 'bygger' };
  if (key === g.cell) return { ok: false, reason: 'samma' };
  const c = checkSpot(sim, key, g.weapon.type, { ignore: id });
  if (!c.ok) return c;
  // 0.18.1 (H426): in i ett hus går vägen till dörren (moveGun), inte till rutan i huset.
  // 0.19.0 (speltestet av 0.18.1: "No way there on foot" utan skäl, fast platsen var giltig): vägen till dörren provas
  // redan här, och skälet säger vad som är fel (dörren blockerad, ingen väg till dörren).
  if (path && c.house != null && clock(sim)) {
    const d = doorRoute(sim, g, houseById(sim.map, sim.place, c.house));
    if (!d.ok) return d;
  }
  if (path && c.house == null && !crewPathTo(sim, { x: g.x, z: g.z }, key, via)) return { ok: false, reason: 'ingen väg' };
  return c;
}
// 0.19.0: vägen in i huset h för enheten g mitt i en våg. Dörren är den gångbara ruta intill huset som alla i enheten
// når, närmast först (lika: lägst nyckel; högst DOOR_TRIES provas). { ok, door, routes } (en väg per soldat, null för
// en stupad; för en pjäs en väg), eller { ok: false, reason }: 'hus anfall' (de döda står vid huset), 'hus bruten',
// 'hus dörr' (ingen ruta vid huset går att gå på) eller 'hus ingen väg' (ingen väg dit). Ren funktion av läget.
const DOOR_TRIES = 6;
export function doorRoute(sim, g, h) {
  if (!h) return { ok: false, reason: 'okänd' };
  if ((sim.brokenHouses ?? []).includes(h.id)) return { ok: false, reason: 'hus bruten' };
  for (const z of sim.zombies) { if (z.dead) continue; const q = zombiePos(sim, z); if (h.touch.has(sim.place.keyAt(q.x, q.z))) return { ok: false, reason: 'hus anfall' }; }
  const p = sim.place, at = g.squad ? (unitPos(g) ?? g) : { x: g.x, z: g.z };
  const doors = [...h.touch].filter(k => crewPassable(p, k)).map(k => { const q = p.center(k); return { k, d: Math.hypot(q.x - at.x, q.z - at.z) }; })
    .sort((a, b) => a.d - b.d || a.k - b.k);
  if (!doors.length) return { ok: false, reason: 'hus dörr' };
  const starts = g.squad ? g.soldiers.map(q => (q.down ? null : q.run > 0 ? soldierAt(q) : { x: q.x, z: q.z })) : [{ x: g.x, z: g.z }];
  for (const { k } of doors.slice(0, DOOR_TRIES)) {
    const routes = starts.map(st => (st ? crewPathTo(sim, st, k) : null));
    if (starts.every((st, i) => !st || routes[i])) return { ok: true, door: k, routes };
  }
  return { ok: false, reason: 'hus ingen väg' };
}
// Gruppens nya rutor om den flyttas till key (spöket i handen).
export const movePreview = (sim, id, key) => {
  const g = gunOf(sim, id);
  if (!g?.squad || !sim.place.valid(key)) return [];
  return without(sim, id, () => planSquad(sim, key, { type: g.weapon.type, count: g.soldiers.length }));
};
// 0.17.2 (Olas önskan): i uppställningen (byggfasen, ingen levande zombie: före första vågen och mellan vågorna) går en
// utställd enhet att lyfta och ställa någon annanstans direkt och gratis, också en monterad pjäs och före Move är
// upplåst. Mitt i en våg gäller Move med sin väg och tid som förut.
export const canReposition = sim => canAct(sim) && sim.phase === 'build' && !sim.zombies.some(z => !z.dead);
export function checkReposition(sim, id, key) {
  const g = gunOf(sim, id);
  if (!g) return { ok: false, reason: 'tom' };
  if (!canReposition(sim)) return { ok: false, reason: 'fel läge' };
  if (g.move || (g.squad && g.soldiers.some(s => s.path))) return { ok: false, reason: 'flyttar' };
  if (key === g.cell) return { ok: false, reason: 'samma' };
  return checkSpot(sim, key, g.weapon.type, { ignore: id });
}
export const repositionGun = (sim, id, key, opts = {}) => moveGun(sim, id, key, { ...opts, instant: true });
// opts: { facing, via, instant }. via: waypoints (rutnycklar) i ordning. instant: uppställningens fria flytt
// (checkReposition), pjäsen står på den nya platsen direkt.
export function moveGun(sim, id, key, opts = {}) {
  const via = opts.instant ? [] : opts.via ?? [];
  const check = opts.instant ? checkReposition(sim, id, key) : checkMove(sim, id, key, via);
  if (!check.ok) return check;
  const g = gunOf(sim, id), type = g.weapon.type, c = sim.place.center(key), def = WEAPONS[type];
  const running = !opts.instant && clock(sim);
  // 0.18.0: in i ett hus i uppställningen (Reposition) direkt.
  // 0.18.1 (H426, Olas speltest: Mölnbo dag 2 lär ut husen, men flytten in mitt i en våg nekades): mitt i en våg
  // springer gruppen, eller laget som bär sin Ksp 90 eller Ksp 58, längs vägen till husets dörr (den gångbara ruta vid
  // huset som är närmast) i vanlig flyttfart. På vägen skjuter de inte och går att slå på, som vid varje Move. Framme
  // går de in (enterHouse). Står de döda vid dörren, eller är huset redan inslaget i dag, nekas flytten.
  if (check.house != null && running) {
    const h = houseById(sim.map, sim.place, check.house);
    const dr = doorRoute(sim, g, h);
    if (!dr.ok) return dr;
    const door = dr.door, dc = sim.place.center(door), routes = dr.routes;
    if (g.house) g.house = null;
    if (g.squad) {
      const speed = def.speed ?? MOVE_RUN;
      g.soldiers.forEach((q, i) => {
        if (q.down) return;
        const from = q.run > 0 ? soldierAt(q) : { x: q.x, z: q.z };
        Object.assign(q, { targetId: null, rise: 0, risen: false, from, path: { ...routes[i], d: 0 }, speed, mv: (q.mv ?? 0) + 1, x: dc.x, z: dc.z, cell: door });
        q.run = q.runTotal = routes[i].len / speed;
      });
      Object.assign(g, { x: dc.x, z: dc.z, cell: door });
    } else {
      const path = routes[0];
      const mi = def.move, crew = mi.crew ?? 0, from = { x: g.x, z: g.z, y: g.y, roof: g.roof, cell: g.cell };
      Object.assign(g, { x: dc.x, z: dc.z, y: 0, roof: false, cell: door });
      delete g.emplace; delete g.turn;
      g.move = { t: 0, pack: mi.pack, setup: mi.setup, speed: mi.speed, travel: path.len / mi.speed, path, from, crewHp: crew * CREW_HP, crewMax: crew * CREW_HP };
      g.move.total = g.move.pack + g.move.travel + g.move.setup;
    }
    g.enter = { house: h.id, key };
    g.weapon.targetId = null;
    sim.squadPlan = null;
    sim.events.push({ t: 'move', gunId: id, cell: key });
    return { ok: true, id, entering: h.id };
  }
  if (check.house != null) {
    occupyHouse(sim, g, houseById(sim.map, sim.place, check.house), g.squad ? g.soldiers.length : 0);
    g.cell = key; g.weapon.targetId = null; delete g.turn; delete g.move; delete g.emplace;
    sim.squadPlan = null;
    sim.events.push({ t: 'move', gunId: id, cell: key });
    return { ok: true, id };
  }
  // ut ur huset: gruppen springer från fönstren, pjäsen bärs ut genom dörren
  if (g.house) g.house = null;
  if (g.squad) {
    const plan = movePreview(sim, id, key);
    if (plan.length < g.soldiers.length) return { ok: false, reason: 'trångt' };
    const routes = g.soldiers.map((s, i) => (s.down || !running ? null : crewPathTo(sim, { x: s.x, z: s.z }, plan[i].cell, via)));
    if (g.soldiers.some((s, i) => !s.down && running && !routes[i])) return { ok: false, reason: 'ingen väg' };
    const speed = def.speed ?? MOVE_RUN;
    g.soldiers.forEach((s, i) => {
      const pc = plan[i], from = { x: s.x, z: s.z };
      Object.assign(s, { cell: pc.cell, x: pc.x, z: pc.z, cover: pc.cover, stance: pc.stance, face: pc.face, sight: pc.sight, targetId: null, cooldown: 0.13 * i, rise: 0, risen: false });
      if (routes[i]) { s.from = from; s.path = { ...routes[i], d: 0 }; s.speed = speed; s.run = s.runTotal = routes[i].len / speed; s.mv = (s.mv ?? 0) + 1; }
      else { s.run = 0; s.from = null; s.path = null; }
    });
    Object.assign(g, { x: c.x, z: c.z, cell: key, sight: unionSight(sim.place, g.soldiers) });
    g.weapon.targetId = null;
    sim.squadPlan = null;
    sim.events.push({ t: 'move', gunId: id, cell: key });
    return { ok: true, id };
  }
  const path = crewPathTo(sim, { x: g.x, z: g.z }, key, via);
  const roof = onRoof(sim, key, type);
  const from = { x: g.x, z: g.z, y: g.y, roof: g.roof, cell: g.cell };
  const base = baseSight(sim, key, type);
  const sight = withCone(sim, key, type, base, opts.facing ?? null);
  Object.assign(g, { x: c.x, z: c.z, y: roof ? roofAt(sim.place, key) : 0, roof, cell: key, sight });
  if (def.cone) g.fullSight = base;
  if (roof || def.vehicle) delete g.emplace; else g.emplace = emplacement(sim.place, key, sight.keys, hordeWeight(sim));
  if (sight.facing != null) { g.facing = sight.facing; g.weapon.angle = sight.facing; }
  delete g.turn;
  g.weapon.targetId = null;
  if (running) {
    const mi = def.move, crew = mi.crew ?? 0;
    g.move = { t: 0, pack: mi.pack, setup: mi.setup, speed: mi.speed, travel: path.len / mi.speed, path, from, crewHp: crew * CREW_HP, crewMax: crew * CREW_HP };
    g.move.total = g.move.pack + g.move.travel + g.move.setup;
  } else delete g.move;
  sim.events.push({ t: 'move', gunId: id, cell: key });
  return { ok: true, id };
}
export const MOVE_RUN = 4.5;
// Flyttarna går framåt, pillboxen svetsas ihop och pjäserna som vrids (Rotate) vrids.
function runMoves(sim, dt) {
  for (const g of sim.guns) {
    if (g.building > 0) { g.building = Math.max(0, g.building - dt); if (!g.building) { delete g.building; sim.events.push({ t: 'built', gunId: g.id }); } }
    if (g.turn) turnStep(sim, g, dt);
    if (!g.move) continue;
    g.move.t += dt;
    if (g.move.t >= g.move.total - 1e-9) { delete g.move; sim.events.push({ t: 'moveDone', gunId: g.id }); if (g.enter) enterHouse(sim, g); }
  }
}
// Soldatens läge på väg (flytten): längs hans väg.
export function soldierAt(s) {
  if (s.path) return alongPath(s.path, s.path.d);
  if (!(s.run > 0) || !s.from) return { x: s.x, z: s.z };
  const k = 1 - s.run / s.runTotal, e = k * k * (3 - 2 * k);
  return { x: s.from.x + (s.x - s.from.x) * e, z: s.from.z + (s.z - s.from.z) * e };
}

// ---------- skjutvinkeln (0.13.0, H132) ----------
// Varje pjäs med cone (grader) skjuter bara inom vinkeln runt facing; pipan vrids inom den i traverse
// rad/s och skjuter först när den pekar på målet (AIM_TOL). Rotate vrider hela vinkeln till en ny
// riktning i samma fart, och under tiden skjuter pjäsen inte. Före första vågen vrids den direkt.
export const AIM_TOL = 0.12;
export function checkRotate(sim, id) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id);
  if (!g) return { ok: false, reason: 'tom' };
  if (g.squad || !WEAPONS[g.weapon.type].cone) return { ok: false, reason: 'flexibel' };
  if (!allowed(sim, 'rotate')) return { ok: false, reason: 'låst' };
  if (g.move) return { ok: false, reason: 'flyttar' };
  return { ok: true };
}
export function rotateGun(sim, id, facing) {
  const c = checkRotate(sim, id);
  if (!c.ok) return c;
  const g = gunOf(sim, id);
  if (!clock(sim)) { setFacing(sim, g, facing); return { ok: true }; }
  g.turn = { to: facing };
  g.weapon.targetId = null;
  sim.events.push({ t: 'rotate', gunId: id, facing });
  return { ok: true };
}
function setFacing(sim, g, facing) {
  const def = WEAPONS[g.weapon.type];
  g.fullSight ??= baseSight(sim, g.cell, g.weapon.type);
  g.sight = coneSight(sim.place, g.cell, g.fullSight, facing, def.cone);
  g.facing = facing; g.weapon.angle = facing;
  if (g.emplace) g.emplace = emplacement(sim.place, g.cell, g.sight.keys, hordeWeight(sim));
  delete g.turn;
}
function turnStep(sim, g, dt) {
  const tr = WEAPONS[g.weapon.type].traverse ?? 2, d = angDiff(g.facing, g.turn.to);
  if (Math.abs(d) <= tr * dt + 1e-9) { setFacing(sim, g, g.turn.to); sim.events.push({ t: 'rotateDone', gunId: g.id }); return; }
  g.facing += Math.sign(d) * tr * dt;
  g.weapon.angle = g.facing;
}
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Sälj: vapnet tas bort och platsen blir ledig.
export function sell(sim, id) {
  if (!canAct(sim)) return { ok: false, refund: 0 };
  const i = sim.guns.findIndex(g => g.id === id);
  if (i < 0) return { ok: false, refund: 0 };
  // 0.14.0: en kärntrupp säljs inte i striden (Return to depot mellan dagarna)
  if (sim.guns[i].weapon.uid != null) return { ok: false, refund: 0, reason: 'depå' };
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
  if (!grenadeStats(sim.research) || !allowed(sim, 'unitSupplies')) return { ok: false, reason: 'ej upplåst' };
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
  if (!allowed(sim, 'supplies') || !allowed(sim, type)) return { ok: false, reason: 'ej upplåst' };
  if (!sim.core && !inArsenal(type, sim.map, sim.dayCfg)) return { ok: false, reason: 'ej här' };
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
    // 0.14.0: skrotbilen har sina egna hp (forskningen gäller betongen)
    const hp = type === 'block' ? blockHp(sim.research) : o.hp;
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
export const IDLE_OUTSIDE = 3;
function outsideArc(s, range, cells) {
  const full = s.fullSight.mask;
  for (const [z, { p, k }] of cells) if (!z.dead && k >= 0 && full[k] && !s.sight.mask[k] && Math.hypot(p.x - s.x, p.z - s.z) <= range) return true;
  return false;
}
function fireWeapons(sim, dt, cells) {
  for (const s of sim.guns) {
    if (s.squad) { fireSquad(sim, dt, cells, s); continue; }
    const w = s.weapon, seen = s.sight.mask;
    // 0.12.0: en pjäs som flyttas skjuter inte. 0.13.0: inte heller medan den vrids (Rotate) eller svetsas ihop.
    // 0.18.0: inte heller när den tystnat (laget nere eller flytt), är på väg bakåt eller håller elden
    if (s.move || s.turn || s.building > 0 || s.silent || s.retreat || (s.hold && !holdBroken(sim, s, cells))) { w.targetId = null; w.cooldown = Math.max(0, w.cooldown - dt); s.idle = 0; s.idleOutside = false; continue; }
    const st = gunStats(sim, s), mode = targetMode(sim, s);
    let target = null, best = -Infinity;
    for (const [z, { p, k }] of cells) {
      if (z.dead || k < 0 || !seen[k]) continue;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d > st.range) continue;
      const sc = targetScore(mode, z, d, sim.route.progress(z));
      if (sc > best) { best = sc; target = z; }
    }
    w.targetId = target ? target.id : null;
    w.cooldown -= dt;
    // 0.14.1 (granskningen av 0.14, Important 5): sysslolös i IDLE_OUTSIDE s med levande zombier inom
    // räckvidd i hela sikten men utanför vinkeln. Vyn visar en flagga och panelen säger "Rotate (R)".
    s.idle = target ? 0 : (s.idle ?? 0) + dt;
    s.idleOutside = !target && s.fullSight && s.idle >= IDLE_OUTSIDE - 1e-9 ? outsideArc(s, st.range, cells) : false;
    if (!target) { w.cooldown = Math.max(w.cooldown, 0); continue; }
    const p = zombiePos(sim, target);
    // 0.13.0 (H132): pipan vrids mot målet i traverse rad/s och skjuter först när den pekar dit
    const want = Math.atan2(p.z - s.z, p.x - s.x), tr = WEAPONS[w.type].traverse;
    if (tr) {
      const d = angDiff(w.angle, want);
      w.angle = Math.abs(d) <= tr * dt ? want : w.angle + Math.sign(d) * tr * dt;
      if (Math.abs(angDiff(w.angle, want)) > AIM_TOL) { w.cooldown = Math.max(w.cooldown, 0); continue; }
    } else w.angle = want;
    const acc = st.accuracy * perchHit(s, target), cls = dmgClassOf(w.type);
    while (w.cooldown <= 0) {
      w.cooldown += 1 / st.rate;
      const hit = sim.rng() < acc;
      sim.events.push({ t: 'shot', gunId: s.id, targetId: target.id, hit, x: p.x, z: p.z });
      if (hit) damage(sim, target, st.damage, p, cls, s);
      if (hit && st.pierce > 1) pierce(sim, s, target, p, st, cells);
      if (target.dead) break;
    }
  }
}
// Hemvärnet: varje soldat siktar själv med sin egen sikt och samma regel som pjäserna (den
// zombie i en synlig ruta inom räckhåll som kommit längst). Stupade och de som springer skjuter inte.
// 0.18.0: gruppens mål-läge (targetMode), håll eld, och inga skott på väg bakåt.
function fireSquad(sim, dt, cells, g) {
  const st = gunStats(sim, g), mode = targetMode(sim, g);
  const quiet = g.retreat || (g.hold && !holdBroken(sim, g, cells));
  for (const s of g.soldiers) {
    s.cooldown -= dt;
    if (s.down || s.run > 0 || quiet) { s.targetId = null; s.cooldown = Math.max(s.cooldown, 0); s.rise = 0; s.risen = false; continue; }
    const seen = s.sight.mask, prone = s.stance === 'prone' && !s.risen;
    // 0.12.2: den liggande skjuter bara inom bågen runt skyddsriktningen (PRONE_ARC)
    let target = null, best = -Infinity, out = null, bestOut = -Infinity;
    for (const [z, { p, k }] of cells) {
      if (z.dead || k < 0 || !seen[k]) continue;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d > st.range) continue;
      const pr = targetScore(mode, z, d, sim.route.progress(z));
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
    const acc = st.accuracy * perchHit(g, target);
    while (s.cooldown <= 0) {
      s.cooldown += 1 / st.rate;
      const hit = sim.rng() < acc;
      sim.events.push({ t: 'shot', gunId: g.id, soldier: s.i, targetId: target.id, hit, x: p.x, z: p.z, sx: s.x, sz: s.z });
      if (hit) damage(sim, target, st.damage, p, 'small', g);
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
    damage(sim, b.z, st.damage, b.q, dmgClassOf(s.weapon.type), s);
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
    if (!w.kit || s.move || s.building > 0 || s.silent || s.retreat || s.hold) continue;
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
    if (w.lCooldown == null || s.move || s.building > 0 || s.silent || s.retreat || s.hold) continue;
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
      if (dist <= g.r) damage(sim, z, g.damage * (1 - g.falloff * dist / g.r), p, 'explosive', null);
    }
  }
}

// 0.18.0: skadeklassen (cls: 'small', 'heavy', 'explosive') mot zombiens take, korselden (+CROSSFIRE) och bakhållet
// (src: enheten som skjuter; första salvan efter Håll eld gör HOLD.ambush gånger skadan).
function damage(sim, z, amount, p, cls = 'small', src = null) {
  const take = takeOf(z.type, cls);
  let a = amount * take;
  if (sim.xf?.has(z.id)) a *= 1 + CROSSFIRE.bonus;
  if (src && src.ambushUntil > sim.time) a *= HOLD.mul;
  z.hp -= a;
  sim.events.push({ t: 'hit', id: z.id, x: p.x, z: p.z, cls, dmg: a, ...(take < 1 ? { armor: true } : {}) });
  // 0.19.0 (H454): en tung träff som inte dödar kan fälla en löpare
  if (z.hp > 0 && cls !== 'small') tripBy(sim, z, 'heavy');
  if (z.hp <= 0 && !z.dead) {
    const def = ZOMBIES[z.type];
    z.dead = true; z.deadT = 0;
    const bounty = def.bounty * (sim.bountyMul ?? 1) * (sim.tweaks?.cash ?? 1), intel = def.intel * (sim.tweaks?.intel ?? 1);
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
    if (o.kind === 'slow' && !def.underWire && route.inCell(z, i)) {
      // slowTaken: hur mycket av inbromsningen zombien känner (1 = hela, bjässen bara en del).
      mul = Math.min(mul, 1 - (1 - o.slow) * (def.slowTaken ?? 1));
      // 0.19.0 (H454): första gången i trådens ruta kan löparen snava
      if (def.stumble && z.wireAt !== i) { z.wireAt = i; tripBy(sim, z, 'wire'); }
      ob.durability -= dt;
      if (ob.durability <= 0) { delete sim.obstacles[i]; broke = true; sim.events.push({ t: 'obstacleBroken', cell: i, type: ob.type }); }
    }
    // Blocket stoppar även zombier som skulle passera det i ett enda steg (stort dt).
    const c = o.kind === 'block' ? route.blockContact(z, i, def.speed * dt) : null;
    if (c) {
      mul = 0; if (c.crosses) route.stopAt(z, i); z.attacking = true;
      // 0.19.0 (H456): bjässen knuffar undan skrotbilarna på def.shove sekunder (hela rutan, oavsett hur hel den är)
      const shove = ob.type === 'car' && def.shove;
      if (shove) { if (!ob.shove) sim.events.push({ t: 'carShove', cell: i }); ob.shove = Math.min(1, (ob.shove ?? 0) + dt / def.shove); ob.hp = Math.min(ob.hp, ob.maxHp * (1 - ob.shove)); if (ob.shove >= 1 - 1e-9) ob.hp = 0; }
      else ob.hp -= def.hitDamage * dt;
      if (!hitCells.has(i)) { hitCells.add(i); sim.events.push({ t: 'obstacleHit', cell: i }); }
      if (ob.hp > 0 && ob.hp < ob.maxHp * BARRICADE_FAILING) {
        const id = barricadeId(ob, i);
        sim.failing ??= [];
        if (!sim.failing.includes(id)) { sim.failing.push(id); sim.events.push({ t: 'barricadeFailing', id, cell: i, ...(ob.line != null ? { line: ob.line } : {}) }); }
      }
      if (ob.hp <= 0) {
        delete sim.obstacles[i]; broke = true;
        // 0.17.1 (speltestet av 0.17.0, Mölnbo dag 4: basen tömdes medan resten av gångbrons spärr stod kvar): en
        // lucka räcker för horden, så resten av spärren märks genombruten (bara bild och paneler; ändrar inget i
        // simuleringen)
        if (ob.line != null) for (const k of Object.keys(sim.obstacles)) if (sim.obstacles[k].line === ob.line) sim.obstacles[k].breached = true;
        // en ny spärr i samma ruta (E4) ska kunna varna igen; en spärr tvärs över gatan får ett nytt id
        if (ob.line == null && sim.failing) sim.failing = sim.failing.filter(x => x !== 'c' + i);
        sim.events.push({ t: 'obstacleBroken', cell: i, type: ob.type, ...(ob.line != null ? { line: ob.line } : {}), ...(shove ? { shoved: true } : {}) });
      }
    }
  }
  if (broke) route.rebuild(sim.obstacles);
  if (mul > 0) z.attacking = false;
  return mul;
}

// =====================================================================================================================
// 0.18.0: strategiskt djup, skiva 1 (docs/superpowers/specs/2026-10-18-strategiskt-djup.md, Olas beslut avsnitt 7).
// Varje mekanik är en flagga i allow (src/meta/unlocks.js), så att balansens policyer spelar samma spel som spelaren:
//   'sanity'    sanity tär och verkar på träff och eldtakt (src/sim/sanity.js)
//   'rout'      under SANITY.rout flyr enheten (routed), och Fall back finns som order
//   'overrun'   pjäslagen går att slå ner; pjäsen tystnar och står kvar tills den bemannas igen (Recrew)
//   'garrison'  grupper och lätta kulsprutor i hus (src/sim/houses.js)
//   'crossfire' +CROSSFIRE.bonus skada i två bågar som skiljer minst CROSSFIRE.angle grader
//   'holdFire'  Håll eld: ingen eld förrän släppt eller horden är nära; första salvan gör dubbel skada
//   'target'    mål-läget per enhet (First in line, Nearest, Strongest, Weakest)
//   'fatigue'   tröttheten över dagarna (src/meta/operation.js) sänker träff, eldtakt och sanity
// Allt är deterministiskt: inga nya slumptal ur sim.rng (stormningen räknas ur zombiens id och fröet).
// =====================================================================================================================

// ---------- mål-läget (3.10) ----------
export const TARGETS = ['first', 'nearest', 'strongest', 'weakest'];
export const TARGET_NAME = { first: 'First in line', nearest: 'Nearest', strongest: 'Strongest', weakest: 'Weakest' };
const targetMode = (sim, g) => (g.tgt && g.tgt !== 'first' && allowed(sim, 'target') ? g.tgt : 'first');
// Högre är bättre. First in line: den som kommit längst (som förut). pr är med som delare vid lika.
function targetScore(mode, z, d, pr) {
  if (mode === 'nearest') return -d * 1000 + pr * 1e-3;
  if (mode === 'strongest') return z.hp * 1000 + pr * 1e-3;
  if (mode === 'weakest') return -z.hp * 1000 + pr * 1e-3;
  return pr;
}
export function setTarget(sim, id, mode) {
  const g = gunOf(sim, id);
  if (!g || !TARGETS.includes(mode)) return { ok: false, reason: 'okänd' };
  if (!allowed(sim, 'target')) return { ok: false, reason: 'låst' };
  g.tgt = mode;
  if (g.weapon) g.weapon.targetId = null;
  return { ok: true, mode };
}
export const cycleTarget = (sim, id) => { const g = gunOf(sim, id); return g ? setTarget(sim, id, TARGETS[(TARGETS.indexOf(g.tgt ?? 'first') + 1) % TARGETS.length]) : { ok: false, reason: 'okänd' }; };

// Kryparen är svår att träffa uppifrån (tak, torn, hus).
const perchHit = (g, z) => ((g.roof || g.house) ? ZOMBIES[z.type].perchHit ?? 1 : 1);

// ---------- korselden (3.5) ----------
export const CROSSFIRE = { bonus: 0.2, angle: 60 };
const XF_RAD = CROSSFIRE.angle * Math.PI / 180;
// Enheterna som kan ge korseld just nu: { x, z, mask, r } (läget, sikten och räckvidden).
function fireUnits(sim) {
  const out = [];
  for (const g of sim.guns) {
    if (g.silent || g.move || g.retreat || g.building > 0 || g.turn) continue;
    const at = unitPos(g);
    if (!at) continue;
    out.push({ x: at.x, z: at.z, mask: g.sight.mask, r: gunStats(sim, g).range, id: g.id });
  }
  return out;
}
// Vinklarna (radianer) skiljer minst XF_RAD åt för något par?
function spread(angles) {
  for (let i = 0; i < angles.length; i++) for (let j = i + 1; j < angles.length; j++) if (Math.abs(angDiff(angles[i], angles[j])) >= XF_RAD - 1e-9) return true;
  return false;
}
function markCrossfire(sim, cells) {
  sim.xf = null;
  if (!allowed(sim, 'crossfire')) return;
  const units = fireUnits(sim);
  if (units.length < 2) return;
  const xf = new Set(), angles = [];
  for (const [z, { p, k }] of cells) {
    if (z.dead || k < 0) continue;
    angles.length = 0;
    for (const u of units) if (u.mask[k] && Math.hypot(p.x - u.x, p.z - u.z) <= u.r) angles.push(Math.atan2(p.z - u.z, p.x - u.x));
    if (angles.length >= 2 && spread(angles)) {
      // 0.18.1 (speltestet av 0.18.0: korselden syntes inte): första gången zombien hamnar i korselden (eller efter
      // en stund utanför) en händelse, så att bilden kan visa "+20 %" över den
      if (z.xfT == null || sim.time - z.xfT > 3) sim.events.push({ t: 'crossfire', id: z.id, x: p.x, z: p.z });
      xf.add(z.id); z.xfT = sim.time;
    }
  }
  sim.xf = xf;
}
// 0.18.1 (speltestet av 0.18.0: "korselden såg jag aldrig"): rutorna där två utställda enheters bågar skiljer minst
// CROSSFIRE.angle grader, alltid synliga i bygget och mellan vågorna. Gångbara rutor i sikten och inom räckvidd.
export function crossfireZones(sim) {
  if (!allowed(sim, 'crossfire')) return [];
  const units = fireUnits(sim);
  if (units.length < 2) return [];
  const seen = new Set(), out = [];
  for (const g of sim.guns) for (const k of g.sight?.keys ?? []) {
    if (seen.has(k)) continue;
    seen.add(k);
    const q = sim.place.center(k), angles = [];
    for (const u of units) if (u.mask[k] && Math.hypot(q.x - u.x, q.z - u.z) <= u.r) angles.push(Math.atan2(q.z - u.z, q.x - u.x));
    if (angles.length >= 2 && spread(angles)) out.push(k);
  }
  return out.sort((a, b) => a - b);
}
// Förhandsvisningen med en enhet i handen: rutorna som skulle hamna i korseld om enheten ställs i key (vända facing).
export function crossfirePreview(sim, key, type, facing = null) {
  if (!allowed(sim, 'crossfire') || !sim.place.valid(key) || !WEAPONS[type]) return [];
  const sight = sightFor(sim, key, type, facing);
  const c = garrisonHouse(sim, key, type) ?? sim.place.center(key);
  const r = weaponStats(type, 1, sim.research).range;
  const units = fireUnits(sim), out = [];
  for (const k of sight.keys) {
    const q = sim.place.center(k), d = Math.hypot(q.x - c.x, q.z - c.z);
    if (d > r) continue;
    const mine = Math.atan2(q.z - c.z, q.x - c.x);
    for (const u of units) {
      if (!u.mask[k] || Math.hypot(q.x - u.x, q.z - u.z) > u.r) continue;
      if (Math.abs(angDiff(mine, Math.atan2(q.z - u.z, q.x - u.x))) >= XF_RAD - 1e-9) { out.push(k); break; }
    }
  }
  return out;
}

// ---------- håll eld (3.6) ----------
export const HOLD = { close: 6, ambush: 1.2, mul: 2, cooldown: 15 };
export function checkHold(sim, id) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id);
  if (!g) return { ok: false, reason: 'tom' };
  if (!allowed(sim, 'holdFire')) return { ok: false, reason: 'låst' };
  if (g.silent || g.retreat) return { ok: false, reason: 'tyst' };
  if (!g.hold && g.holdCd > sim.time) return { ok: false, reason: 'nedkylning', left: g.holdCd - sim.time };
  return { ok: true };
}
// on: true håller elden, false släpper den (bakhållet), utan: växlar.
export function holdFire(sim, id, on = null) {
  const c = checkHold(sim, id);
  if (!c.ok) return c;
  const g = gunOf(sim, id), want = on ?? !g.hold;
  if (want === !!g.hold) return { ok: true, hold: !!g.hold };
  if (want) { g.hold = true; if (g.weapon) g.weapon.targetId = null; sim.events.push({ t: 'hold', gunId: id }); }
  else releaseHold(sim, g, 'order');
  return { ok: true, hold: !!g.hold };
}
function releaseHold(sim, g, why) {
  g.hold = false;
  g.ambushUntil = sim.time + HOLD.ambush;
  g.holdCd = sim.time + HOLD.cooldown;
  sim.events.push({ t: 'ambush', gunId: g.id, why });
}
// Släpps elden av sig själv? En levande zombie i sikte inom HOLD.close m.
function holdBroken(sim, g, cells) {
  const at = unitPos(g);
  if (!at) return false;
  for (const [z, { p, k }] of cells) {
    if (z.dead || k < 0 || !g.sight.mask[k]) continue;
    if (Math.hypot(p.x - at.x, p.z - at.z) <= HOLD.close) { releaseHold(sim, g, 'close'); return true; }
  }
  return false;
}

// ---------- läget för en enhet ----------
// Gruppen: medelpunkten av de som står (på väg: där de springer). Pjäsen: där den står (på väg: längs vägen).
export function unitPos(g) {
  if (!g.squad) return g.move ? gunPos(g) : { x: g.x, z: g.z };
  let x = 0, z = 0, n = 0;
  for (const s of g.soldiers) { if (s.down) continue; const q = s.run > 0 ? soldierAt(s) : s; x += q.x; z += q.z; n++; }
  return n ? { x: x / n, z: z / n } : null;
}

// ---------- sanity (3.3) ----------
// En enhet tappar sanity: amount delat med motståndet. Ingen sanity utan allow 'sanity'.
function loseSanity(sim, g, amount) {
  if (!allowed(sim, 'sanity') || g.sanity == null || !hasSanity(g)) return;
  g.sanity = Math.max(0, g.sanity - amount / resilience(allowed(sim, 'fatigue') ? g.weapon : { ...g.weapon, fatigue: 0 }));
}
// En kamrat stupar eller ett lag slås ner: own tappar a, andra enheter inom SANITY.nearUnits m tappar near.
function shake(sim, own, a, x, z, near) {
  if (!allowed(sim, 'sanity')) return;
  if (own) loseSanity(sim, own, a);
  for (const g of sim.guns) {
    if (g === own) continue;
    const at = unitPos(g);
    if (at && Math.hypot(at.x - x, at.z - z) <= SANITY.nearUnits) loseSanity(sim, g, near);
  }
}
function runSanity(sim, dt, cells) {
  if (!allowed(sim, 'sanity')) return;
  const fat = allowed(sim, 'fatigue');
  for (const g of sim.guns) {
    if (g.sanity == null || !hasSanity(g) || g.silent) continue;
    const at = unitPos(g);
    if (!at) continue;
    let drain = 0, calm = true;
    if (cells) for (const [z, { p }] of cells) {
      if (z.dead) continue;
      const dx = p.x - at.x, dz = p.z - at.z;
      if (Math.abs(dx) > SANITY.calm || Math.abs(dz) > SANITY.calm) continue;
      // gruppen: avståndet till närmaste man (de står utspridda runt markeringen)
      let d = Math.hypot(dx, dz);
      if (g.squad && d < SANITY.near + SQUAD.radius) for (const s of g.soldiers) { if (s.down) continue; const q = s.run > 0 ? soldierAt(s) : s; const e = Math.hypot(p.x - q.x, p.z - q.z); if (e < d) d = e; }
      if (d < SANITY.calm) calm = false;
      drain += fearAt(z.type, d);
    }
    const res = resilience(fat ? g.weapon : { ...g.weapon, fatigue: 0 });
    const cover = g.house ? SANITY.house : !g.squad ? SANITY.dugIn : g.weapon.sandbags ? SANITY.bags : 1;
    if (drain > 0) g.sanity = Math.max(0, g.sanity - drain * dt * cover / res);
    else if (calm && !g.retreat) g.sanity = Math.min(SANITY.max, g.sanity + SANITY.recover * dt);
    if (g.sanity >= SANITY.effectAt) g.wavered = false;
    if (g.sanity < SANITY.waver && !g.wavered && !g.retreat) { g.wavered = true; const q = unitPos(g); sim.events.push({ t: 'waver', gunId: g.id, x: q.x, z: q.z }); }
    if (g.sanity < SANITY.rout && !g.retreat && allowed(sim, 'rout')) rout(sim, g);
  }
}
// Enheten bryts: en grupp flyr mot basen (och samlas i reserven), ett pjäslag lämnar pjäsen (den tystnar och står kvar).
function rout(sim, g) {
  const at = unitPos(g) ?? { x: g.x, z: g.z };
  if (!g.squad) { silence(sim, g, 'routed'); sim.events.push({ t: 'routed', gunId: g.id, type: g.weapon.type, x: at.x, z: at.z }); return; }
  if (!sim.core) return;
  startRetreat(sim, g, 'rout');
  sim.events.push({ t: 'routed', gunId: g.id, type: g.weapon.type, x: at.x, z: at.z });
  shake(sim, null, 0, at.x, at.z, SANITY.downNear);
}

// ---------- vik och fly (3.3) ----------
// Platsen de drar sig tillbaka till: den öppna rutan närmast basen.
export function rallyKey(sim) {
  if (sim.rallyAt != null) return sim.rallyAt;
  const p = sim.place, b = sim.route.base;
  let best = -1, bd = Infinity;
  for (let k = 0; k < p.n; k++) {
    if (p.kind[k] !== KIND.open || p.walk[k]) continue;
    const c = p.center(k), d = Math.hypot(c.x - b.x, c.z - b.z);
    if (d < bd - 1e-9) { bd = d; best = k; }
  }
  sim.rallyAt = best;
  return best;
}
// Tiden en flydd grupp behöver i reserven innan den går att ställa ut igen (en som vikit i ordning: ingen).
export const RALLY_TIME = 20;
export function checkFallBack(sim, id) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id);
  if (!g) return { ok: false, reason: 'tom' };
  if (!allowed(sim, 'rout')) return { ok: false, reason: 'låst' };
  if (!sim.core || g.weapon.uid == null) return { ok: false, reason: 'depå' };
  if (g.retreat) return { ok: false, reason: 'viker' };
  if (g.silent) return { ok: false, reason: 'tyst' };
  if (g.move || (g.squad && g.soldiers.some(s => s.path))) return { ok: false, reason: 'flyttar' };
  const def = WEAPONS[g.weapon.type];
  if (!g.squad && (def.mounted || def.vehicle || !def.move)) return { ok: false, reason: 'fast' };
  if (rallyKey(sim) < 0) return { ok: false, reason: 'ingen väg' };
  return { ok: true };
}
// Fall back: enheten drar sig tillbaka mot basen i ordning och behåller sin sanity; i reserven går den att ställa ut igen.
export function fallBack(sim, id) {
  const c = checkFallBack(sim, id);
  if (!c.ok) return c;
  const g = gunOf(sim, id);
  if (!startRetreat(sim, g, 'fallback')) return { ok: false, reason: 'ingen väg' };
  const at = unitPos(g) ?? g;
  sim.events.push({ t: 'fallback', gunId: id, x: at.x, z: at.z });
  return { ok: true };
}
function startRetreat(sim, g, kind) {
  const rk = rallyKey(sim);
  if (rk < 0) return false;
  const c = sim.place.center(rk);
  if (g.hold) g.hold = false;
  if (g.squad) {
    const speed = (WEAPONS[g.weapon.type].speed ?? MOVE_RUN) * (kind === 'rout' ? 1.15 : 1);
    for (const s of g.soldiers) {
      if (s.down) continue;
      const from = s.run > 0 ? soldierAt(s) : { x: s.x, z: s.z };
      const route = crewPathTo(sim, from, rk);
      s.targetId = null; s.rise = 0; s.risen = false;
      if (route) { s.from = from; s.path = { ...route, d: 0 }; s.speed = speed; s.run = s.runTotal = route.len / speed; s.mv = (s.mv ?? 0) + 1; }
      else { s.path = null; s.from = from; s.run = s.runTotal = Math.max(0.5, Math.hypot(c.x - from.x, c.z - from.z) / speed); }
      s.x = c.x; s.z = c.z; s.cell = rk;
    }
    g.house = null;
    g.retreat = { kind, at: sim.time };
    sim.squadPlan = null;
    return true;
  }
  const mi = WEAPONS[g.weapon.type].move, crew = mi.crew ?? 0;
  const path = crewPathTo(sim, { x: g.x, z: g.z }, rk);
  if (!path) return false;
  const from = { x: g.x, z: g.z, y: g.y, roof: g.roof, cell: g.cell };
  g.house = null; g.roof = false; g.y = 0; g.x = c.x; g.z = c.z;
  g.move = { t: 0, pack: mi.pack, setup: 0, speed: mi.speed, travel: path.len / mi.speed, path, from, crewHp: crew * CREW_HP, crewMax: crew * CREW_HP };
  g.move.total = g.move.pack + g.move.travel;
  g.retreat = { kind, at: sim.time };
  return true;
}
// Grupper som kommit fram (alla stående har sprungit klart) och pjäser vars flytt bakåt är klar går till reserven.
function runRetreats(sim) {
  for (const g of [...sim.guns]) {
    if (!g.retreat) continue;
    if (g.squad) { if (g.soldiers.every(s => s.down || (!s.path && !(s.run > 0)))) toReserve(sim, g); }
    else if (!g.move) toReserve(sim, g);
  }
}
function toReserve(sim, g) {
  const i = sim.guns.indexOf(g);
  if (i < 0) return;
  sim.guns.splice(i, 1);
  sim.squadPlan = null;
  const w = g.weapon, kind = g.retreat?.kind ?? 'fallback';
  const men = g.squad ? g.soldiers.filter(s => !s.down).length : null;
  if (sim.reserve && w.uid != null && (men == null || men > 0)) {
    sim.reserve.push({ uid: w.uid, type: w.type, level: w.level, ...(w.vet ? { vet: w.vet } : {}), ...(men != null ? { men } : {}), ...(w.fatigue ? { fatigue: w.fatigue } : {}),
      sanity: kind === 'rout' ? SANITY.rallied : Math.max(SANITY.rallied, g.sanity ?? SANITY.max), rallied: true, readyAt: sim.time + (kind === 'rout' ? RALLY_TIME : 0) });
  }
  sim.events.push({ t: 'unitBack', gunId: g.id, uid: w.uid ?? null, type: w.type, kind, men });
}

// ---------- överrända pjäser (3.3) ----------
export const RECREW = { cost: 150, time: 4, squadTime: 8, squadNear: 10, clear: 4, routedBack: 30 };
function initCrew(g) {
  const def = WEAPONS[g.weapon.type], n = def.move?.crew ?? def.crew ?? 1;
  g.crew = { hp: Math.max(1, n) * CREW_HP, max: Math.max(1, n) * CREW_HP };
}
// Pjäslagen zombierna kan slå (allow 'overrun'): stående pjäser på marken med ett lag, inte i hus eller på tak.
function crewTargets(sim) {
  if (!allowed(sim, 'overrun')) return [];
  const out = [], w = sim.place.w;
  for (const g of sim.guns) {
    if (g.squad || g.roof || g.house || g.silent || g.move || g.retreat || !g.crew || WEAPONS[g.weapon.type].vehicle) continue;
    out.push({ g, i: g.cell % w, j: Math.floor(g.cell / w) });
  }
  return out;
}
function hitCrew(sim, g, amount, hurt) {
  if (!g.crew || g.silent) return;
  g.crew.hp -= amount;
  if (!hurt.has(g.id)) { hurt.add(g.id); sim.events.push({ t: 'crewHit', gunId: g.id, x: g.x, z: g.z }); }
  loseSanity(sim, g, amount * 0.6);
  if (g.crew.hp <= 0) silence(sim, g, 'overrun');
}
// Pjäsen tystnar: laget är nere (overrun) eller har flytt (routed). Den står kvar och kan bemannas igen.
function silence(sim, g, why) {
  g.silent = why; g.recrew = null; g.hold = false; g.silentAt = sim.time;
  if (g.crew) g.crew.hp = 0;
  g.weapon.targetId = null;
  sim.events.push({ t: 'gunSilent', gunId: g.id, type: g.weapon.type, why, x: g.x, z: g.z });
  shake(sim, null, 0, g.x, g.z, SANITY.crewLost);
}
export function checkRecrew(sim, id) {
  if (!canAct(sim)) return { ok: false, reason: 'fel läge' };
  const g = gunOf(sim, id);
  if (!g?.silent) return { ok: false, reason: 'bemannad' };
  if (g.recrew) return { ok: false, reason: 'bemannas' };
  if (sim.cash < RECREW.cost) return { ok: false, reason: 'pengar' };
  return { ok: true };
}
// Recrew: förnödenheter för ett nytt lag, som är på plats efter RECREW.time s.
export function recrew(sim, id) {
  const c = checkRecrew(sim, id);
  if (!c.ok) return c;
  const g = gunOf(sim, id);
  sim.cash -= RECREW.cost;
  g.recrew = { t: RECREW.time, total: RECREW.time, by: 'supply' };
  sim.events.push({ t: 'recrewing', gunId: id, by: 'supply' });
  return { ok: true, cost: RECREW.cost };
}
function runRecrew(sim, dt, cells) {
  for (const g of sim.guns) {
    if (!g.silent) continue;
    const near = r => { if (!cells) return false; for (const [z, { p }] of cells) if (!z.dead && Math.hypot(p.x - g.x, p.z - g.z) <= r) return true; return false; };
    if (!g.recrew) {
      // en grupp intill skickar folk (gratis, långsammare), eller det flydda laget kommer tillbaka när det lugnat sig
      if (near(RECREW.clear)) continue;
      const helper = sim.guns.find(q => q.squad && !q.retreat && !q.house && q.soldiers.some(s => !s.down && !(s.run > 0) && Math.hypot(s.x - g.x, s.z - g.z) <= RECREW.squadNear));
      if (helper) { g.recrew = { t: RECREW.squadTime, total: RECREW.squadTime, by: helper.id }; sim.events.push({ t: 'recrewing', gunId: g.id, by: 'squad' }); }
      else if (g.silent === 'routed' && sim.time - (g.silentAt ?? sim.time) >= RECREW.routedBack) { g.recrew = { t: 3, total: 3, by: 'crew' }; sim.events.push({ t: 'recrewing', gunId: g.id, by: 'crew' }); }
      continue;
    }
    g.recrew.t -= dt;
    if (g.recrew.t > 1e-9) continue;
    const by = g.recrew.by;
    g.silent = null; g.recrew = null; g.silentAt = null;
    if (g.crew) g.crew.hp = g.crew.max;
    g.sanity = SANITY.rallied; g.wavered = false;
    sim.events.push({ t: 'recrewed', gunId: g.id, by: by === 'supply' || by === 'crew' ? by : 'squad', x: g.x, z: g.z });
  }
}

// ---------- trupper i hus (3.1) ----------
// Huset i rutan key om typen får ställas där (allow 'garrison', grupperna och Ksp 90/58), annars null.
function garrisonHouse(sim, key, type) {
  if (!allowed(sim, 'garrison') || !WEAPONS[type]?.garrison || sim.place.kind[key] !== KIND.house) return null;
  return houseAtKey(sim.map, sim.place, key);
}
// checkSpot för ett hus: null (inget hus för typen, vanliga skäl gäller) eller { ok, reason, house }.
function garrisonCheck(sim, key, type, moved = null) {
  const h = garrisonHouse(sim, key, type);
  if (!h) return null;
  if (sim.guns.some(g => g.house?.id === h.id)) return { ok: false, reason: 'hus upptaget' };
  if (isSquad(type) && (moved || deployMen(sim, type)) > h.cap) return { ok: false, reason: 'hus litet' };
  if ((sim.dayCfg.dormant ?? []).some(d => d.house === h.id && !sim.burst.includes(h.id))) return { ok: false, reason: 'hus vilande' };
  if ((sim.dayCfg.evac?.groups ?? []).some(q => q.house === h.id)) return { ok: false, reason: 'hus evak' };
  return { ok: true, house: h.id };
}
// Fönstren en enhet tar i huset (count: soldater, en pjäs tar ett).
function houseWindows(sim, h, type, count) {
  const r = weaponStats(type, MAX_LEVEL, sim.research).range * (isSquad(type) ? 1.2 : 1);
  return pickWindows(sim.place, h, Math.max(1, count), r, hordeWeight(sim)).map(w => ({ ...w, cover: 'window', stance: 'kneel' }));
}
// Ställer enheten g i huset h: gruppens soldater i fönstren (de springer från dörren), pjäsen i det bästa fönstret.
function occupyHouse(sim, g, h, men) {
  const type = g.weapon.type;
  g.house = { id: h.id, x: h.x, z: h.z, door: DOOR_HP, max: DOOR_HP, broken: false };
  g.roof = false; g.y = 0;
  if (g.squad) {
    const old = g.soldiers;
    const wins = houseWindows(sim, h, type, men || old.length);
    const level = g.weapon.level;
    g.soldiers = wins.slice(0, men || old.length).map((w, i) => {
      const s = makeSoldier(w, i, level, { x: h.x, z: h.z }, sim.research, type);
      const o = old[i];
      if (o) { s.hp = o.hp; s.maxHp = o.maxHp; s.down = o.down; }
      return s;
    });
    g.x = h.x; g.z = h.z;
    g.sight = unionSight(sim.place, g.soldiers);
    return;
  }
  const [w] = houseWindows(sim, h, type, 1);
  const def = WEAPONS[type];
  g.x = w.x; g.z = w.z; g.cell = w.cell;
  g.fullSight = w.sight;
  g.sight = def.cone ? coneSight(sim.place, w.cell, w.sight, w.face, def.cone) : w.sight;
  g.facing = w.face; g.weapon.angle = w.face;
  delete g.emplace;
}
// Stormningen: zombien väljer att slå på dörren (deterministiskt ur id och frö; bjässar och pansrade alltid).
function assaults(sim, z) {
  if (z.assault == null) z.assault = z.type === 'brute' || z.type === 'armored' || mix32(mixU((sim.seed ?? 1) | 0, z.id * 977 + 5), 11) < ASSAULT;
  return z.assault;
}
function attackHouse(sim, g, amount, hurt) {
  const h = g.house;
  if (!h.broken) {
    h.door -= amount;
    if (!hurt.has('h' + g.id)) { hurt.add('h' + g.id); sim.events.push({ t: 'houseHit', gunId: g.id, x: h.x, z: h.z }); }
    loseSanity(sim, g, amount * 0.08);
    if (h.door <= 0) breakIn(sim, g);
    return;
  }
  // inne: de slår soldaterna (huset skyddar fortfarande lite) eller laget
  if (g.squad) { const s = g.soldiers.find(q => !q.down); if (s) hitSoldier(sim, g, s, amount * 0.8, hurt); }
  else hitCrew(sim, g, amount, hurt);
}
function breakIn(sim, g) {
  const h = g.house;
  h.broken = true; h.door = 0;
  // 0.18.1 (H426): ett inslaget hus går inte att springa in i senare samma dag
  (sim.brokenHouses ??= []).push(h.id);
  sim.events.push({ t: 'houseBreached', gunId: g.id, x: h.x, z: h.z });
  loseSanity(sim, g, SANITY.breakIn);
  const hurt = new Set();
  if (g.squad) for (const s of g.soldiers) { if (!s.down) hitSoldier(sim, g, s, s.maxHp * BREAK_HIT, hurt); }
  else if (g.crew) hitCrew(sim, g, g.crew.max * 0.6, hurt);
}
export const garrisonHouseAt = (sim, key, type) => garrisonHouse(sim, key, type);
export const housesFor = sim => housesOf(sim.map, sim.place);
