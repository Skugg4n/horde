// Balanssimulering (0.14.0, Operation Södermanland): spelar hela kampanjen headless med deterministiska
// policyer: E4, Gnesta South och Gnesta North dag för dag, med försök, RP, kärntrupper, leveranser och
// rekvisition mellan försöken (src/meta/operation.js). Två spelare:
//   skilled : läser kartan (Gnesta: smart, spärren som leder horden dit pjäserna ser), kallar vågor
//             tidigt när det är lugnt, köper ammunition och sandsäckar.
//   normal  : ställer allt efter sin egen väg (Gnesta: naive, aldrig en barrikad), väntar ut
//             nedräkningarna, köper samma förnödenheter.
// Båda rekvirerar i samma ordning (REQUISITION) och ställer ut allt de har i uppställningen (deployAll).
// Policyerna för köpen i striden (greedyBuild, gnestaBuild, norrBuild) är 0.13:s; med kärntrupperna
// köper de bara förnödenheter (hinder, granatlådor). Mål (Olas): en normal spelare klarar varje dag inom
// 1 till 4 försök, en skicklig på 1, ingen dag kräver mer än cirka 6, och ribban ligger högt hela tiden.
import { fileURLToPath } from 'node:url';
import { gunCount, squadCount, createSim, startWave, step, build, rotateGun, zombiePos, upgrade, placeObstacle, placeAcross, acrossCells, buyKit, callNextWave, hasNextWave, checkSpot, sell, moveGun, checkMove, deployPhase, reserveCount, dayReport, buySupply, frontage, canDeploy } from '../src/sim/sim.js';
import { weaponUnlocked, obstacleUnlocked, upgradeCost, grenadeStats, maxGuns, inArsenal } from '../src/sim/stats.js';
import { placementFor, lineOfSightH, KIND, MIN_SPACING, roofSightFrom, bestFacing, coneSight, CONE } from '../src/sim/placement.js';
import { WEAPONS, GRENADE_KIT, SUPPLIES } from '../src/data/weapons.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { selectMap, mapState } from '../src/meta/progress.js';
import { newCampaign, opStartConfig, finishDay, requisition, levelUp, refill, refillCost, reassign, canReassign, buyUpgrade, upgradeState, unitsIn, releasedTypes, pressureOf } from '../src/meta/operation.js';
import { UPGRADES } from '../src/data/depot.js';
import { MAPS } from '../src/data/maps.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaNorr, K as normK } from '../src/data/gnesta-norr.js';
import { planSquad } from '../src/sim/squad.js';
import { routeFor } from '../src/sim/route.js';
import { distPolyline } from '../src/data/gnesta.js';
import { R as R_MB } from '../src/data/molnbo.js';

const DT = 1 / 30;
const THINK_EVERY = 30;          // steg mellan policyns beslut under en våg (1 s simtid)
const MAX_KITS = 1;               // granatlådor per dag på E4: ett stöd, inte huvudsaken
const EARLY_ALIVE = 3;            // mitt i en våg kallas nästa bara när högst så många lever
const WIRE_CELLS = [0, 1, 2];
const BLOCK_CELL = 0;
const MAX_TICKS = 30 * 900;

// ---------- var pjäserna ställs: synlig täckning av hordens väg ----------
// route: hordens väg som placeringsrutor (en ruta kan förekomma flera gånger: den vägs då
// tyngre, t.ex. där två ingångars vägar går ihop). Varje öppen ruta får sin täckning: vägens
// rutor inom range som syns därifrån. Pjäserna väljs en i taget: den ruta som lägger till mest,
// där en vägruta som redan täcks av k valda pjäser väger 0,5^k (så att pjäserna sprids över
// vägen i stället för att alla ser samma bit). Minst MIN_SPACING mellan pjäserna. Lika: lägst
// rutnyckel. Deterministiskt. Returnerar rutnycklarna i ordning och varje rutas täckning.
const coverCache = new Map();
export function coveragePlan(map, route, { range, count = 8, decay = 0.5, cacheKey = null } = {}) {
  const key = cacheKey && JSON.stringify([map.id, cacheKey, range, count, decay]);
  if (key && coverCache.has(key)) return coverCache.get(key);
  const p = placementFor(map);
  const weight = new Map();
  for (const it of route) {
    const [k, wt] = typeof it === 'number' ? [it, 1] : it;
    weight.set(k, (weight.get(k) || 0) + wt);
  }
  const targets = [...weight.keys()].sort((a, b) => a - b);
  const reach = range + p.size * 0.7072;
  const cands = [];
  for (let c = 0; c < p.n; c++) {
    if (p.kind[c] !== KIND.open) continue;
    const at = p.center(c), sees = [];
    for (const t of targets) {
      const q = p.center(t);
      if (Math.hypot(q.x - at.x, q.z - at.z) <= reach && lineOfSightH(p, c, t)) sees.push(t);
    }
    if (sees.length) cands.push({ c, at, sees });
  }
  const times = new Map(), picked = [];
  for (let n = 0; n < count; n++) {
    let best = null, bestScore = 0;
    for (const cd of cands) {
      if (picked.some(q => Math.hypot(q.at.x - cd.at.x, q.at.z - cd.at.z) < MIN_SPACING - 1e-9)) continue;
      let sc = 0;
      for (const t of cd.sees) sc += weight.get(t) * decay ** (times.get(t) || 0);
      if (sc > bestScore + 1e-9) { best = cd; bestScore = sc; }
    }
    if (!best) break;
    picked.push(best);
    for (const t of best.sees) times.set(t, (times.get(t) || 0) + 1);
  }
  const out = { spots: picked.map(q => q.c), cover: picked.map(q => q.sees.length), sees: picked.map(q => q.sees) };
  if (key) coverCache.set(key, out);
  return out;
}

// E4 (0.15.0, trafikplatsen vid Lästringe): hordens väg är rutorna från dagens ingångar till spärren,
// inne i den skarpa ytan (diset räknas inte). Där ingångarnas vägar går ihop (stammen) väger rutan
// dubbelt. M249:ns räckvidd, pjäsen policyn bygger först.
const E4_RANGE = WEAPONS.m249.range;
export function e4Plan(day = 1) {
  const map = MAPS.riksvagen, route = routeFor(map), c = map.surroundings.crisp, p = placementFor(map);
  const ids = daySpawns(map, day);
  const cells = route.paths(ids).flatMap(q => q.cells).filter(k => { const q = p.center(k); return q.x >= c.x0 && q.x <= c.x1 && q.z >= c.z0 && q.z <= c.z1; });
  return coveragePlan(map, cells, { range: E4_RANGE, cacheKey: 'e4:' + ids.join('+') });
}
// Spärrarna på E4 som greedy lägger (förut rutorna 0, 1 och 2 på den raka vägen, 3 m var): betongen
// strax nedanför spärren, taggtråden längre ned i stammen och på avfarten, där alla dagens vägar går.
// Rutorna längs vägen från första ingången, så många meter gångväg från basen.
const E4_BLOCK_AT = 5, E4_WIRE_AT = [9, 13, 17];
// 0.16.1 (H192): överskottet går till fler trådar längre ned i stammen (det en människa gör med pengarna mitt
// i vågen), när det finns mer än två trådars pengar över.
const E4_WIRE_EXTRA = [21, 25], E4_EXTRA_KEEP = 2;
const e4LineCache = new Map();
function e4Lines(sim) {
  const id = sim.map.id + ':' + sim.day;
  if (e4LineCache.has(id)) return e4LineCache.get(id);
  const r = routeFor(sim.map), first = daySpawns(sim.map, sim.day)[0];
  const cells = r.paths([first])[0].cells;
  const at = m => cells.filter(k => !r.flow.isBase(k)).find(k => r.walkLeft(k) <= m + 1e-9 && r.walkLeft(k) > m - 2 - 1e-9) ?? cells.find(k => r.walkLeft(k) <= m);
  const out = { block: at(E4_BLOCK_AT), wire: E4_WIRE_AT.map(at), extra: E4_WIRE_EXTRA.map(at) };
  e4LineCache.set(id, out);
  return out;
}

// Bygger nästa planerade plats som är ledig. Returnerar true om något byggdes.
function buildNext(sim, spots, type) {
  if (!type || gunCount(sim) >= sim.maxGuns) return false;
  for (const k of spots) {
    if (sim.guns.some(g => g.cell === k)) continue;
    const r = build(sim, k, type);
    if (r.ok) return true;
    if (r.reason === 'pengar' || r.reason === 'fullt' || r.reason === 'reserv' || r.reason === 'uppställd') return false;
  }
  return false;
}
// Vapnet på marken: Ksp 88 om den går att köpa, annars Ksp 58 om den är forskad (då sparar
// policyn till den i stället för att köpa en Ksp 90), annars det billigaste. Ak 5 och Psg 90
// köps för sig (gnestaBuild).
// 0.13.0: bara det sektorn har i förrådet i dag (inArsenal); Gnesta dag 1 har inga pjäser alls (null).
const GROUND = ['m249', 'ksp58', 'm2'];
// 0.14.0: med kärntrupperna det som väntar i reserven, och bara i uppställningen
const has = (sim, id) => (sim.core ? deployPhase(sim) && reserveCount(sim, id) > 0 : weaponUnlocked(id, sim.research, sim.map) && inArsenal(id, sim.map, sim.dayCfg));
const wantedWeapon = sim => {
  const opts = GROUND.map(id => WEAPONS[id]).filter(w => has(sim, w.id));
  if (!opts.length) return null;
  // 0.13.0 (H132): Ksp 58 (120 grader) före Ksp 88 (90 grader, långsam) när den finns. På stadsbanornas
  // krokiga vägar ser den smala vinkeln för lite; prövat i docs/balance-log.md 0.13.0.
  if (opts.some(w => w.id === 'ksp58')) return 'ksp58';
  const heavy = opts.find(w => w.id === 'm2');
  if (heavy && sim.cash >= heavy.cost) return heavy.id;
  return opts.sort((a, b) => a.cost - b.cost)[0].id;
};
// Hemvärnet (0.9.0). E4: billig täckning dag 1, en grupp direkt efter första pjäsen på nästa
// lediga plats i planen. Gnesta: fyller luckor, en grupp när första vågen är klar, en position
// står tom och pengarna inte räcker till pjäsen policyn sparar till. (Prövat i docs/balance-log.md
// 0.9.0: dag 1 på Gnesta tog pengarna från andra pjäsen, och senare dagar på E4 från taggtråden.)
const HV_PER_DAY = 1;
// days: dagar då gruppen köps tidigt, gap: dagar då den fyller en lucka.
// 0.13.0: gruppen är den sektorn har: infanteriet på E4, Hemvärnet på Gnesta från dag 2, de civila på
// Gnesta dag 1 (där köps så många grupper som taket tillåter: de är dagens enda trupp).
export const HV_POLICY = { riksvagen: { days: [1], gap: [] }, gnesta: { days: [1], gap: [2, 3, 4, 5] } };
const squadType = sim => ['hv', 'inf', 'civ'].find(t => has(sim, t)) ?? null;
function buySquad(sim, spots, { gap = false } = {}) {
  const pol = sim.hvPolicy ?? HV_POLICY[sim.map.id] ?? { days: [], gap: [] };
  if (gap ? !pol.gap.includes(sim.day) || sim.waveIndex < 1 : !pol.days.includes(sim.day)) return;
  const type = squadType(sim);
  if (!type || squadCount(sim) >= sim.maxSquads) return;
  if (sim.guns.filter(g => g.squad).length >= (type === 'civ' ? sim.maxSquads : HV_PER_DAY)) return;
  if (sim.cash < WEAPONS[type].cost) return 'saving';
  for (const k of spots) {
    if (sim.guns.some(g => g.cell === k)) continue;
    const r = build(sim, k, type);
    if (r.ok) return 'built';
    if (r.reason === 'pengar' || r.reason === 'fullt' || r.reason === 'reserv') return;
  }
}
const upgradeAll = sim => {
  for (;;) {
    const ups = sim.guns.filter(g => upgradeCost(g.weapon.type, g.weapon.level) != null)
      .sort((a, b) => upgradeCost(a.weapon.type, a.weapon.level) - upgradeCost(b.weapon.type, b.weapon.level));
    if (!ups.length || !upgrade(sim, ups[0].id).ok) break;
  }
};

// Girig policy, i ordning:
// 1. Minst ett vapen (billigaste upplåsta, M2 om den är upplåst och går att köpa), på platsen
//    som ser mest av vägen.
// 2. Betongblock i ruta 0 (närmast basen) om upplåst och råd kvar för ett vapen, sedan en
//    taggtråd i första lediga ruta av 0, 1, 2.
// 3. Fler vapen på nästa plats i planen, så länge det finns plats (fyra plus forskningen).
// 4. Taggtråd i resten av rutorna 0, 1, 2 (även ny tråd när den gamla slitits sönder).
// 5. En granatlåda (om forskad) på den pjäs som ser mest väg, om pengar finns kvar för en tråd.
// 6. Uppgraderingar, billigaste först.
function greedyBuild(sim, spots) {
  const buildOne = () => buildNext(sim, spots, wantedWeapon(sim));
  if (!sim.guns.length) buildOne();
  buySquad(sim, spots);
  // 0.15.0: rutorna på E4:s rutnät (e4Lines), en spärr tvärs över vägen (placeAcross)
  const L = sim.route.kind === 'grid' ? e4Lines(sim) : { block: BLOCK_CELL, wire: WIRE_CELLS };
  const put = sim.route.kind === 'grid' ? placeAcross : placeObstacle;
  if (obstacleUnlocked('block', sim.research) && !sim.obstacles[L.block] && sim.cash >= OBSTACLES.block.cost + 250) put(sim, L.block, 'block');
  const wire = cells => {
    if (!obstacleUnlocked('wire', sim.research)) return;
    for (const c of cells) if (!sim.obstacles[c] && sim.cash >= OBSTACLES.wire.cost) put(sim, c, 'wire');
  };
  if (!L.wire.some(c => sim.obstacles[c]?.type === 'wire')) wire(L.wire.filter(c => !sim.obstacles[c]).slice(0, 1));
  while (buildOne());
  wire(L.wire);
  if (L.extra && sim.phase === 'wave' && sim.cash >= OBSTACLES.wire.cost * (1 + E4_EXTRA_KEEP)) wire(L.extra.filter(c => c != null && sim.cash >= OBSTACLES.wire.cost * (1 + E4_EXTRA_KEEP)));
  if (grenadeStats(sim.research) && sim.guns.filter(g => g.weapon.kit).length < MAX_KITS && sim.cash >= GRENADE_KIT.cost + OBSTACLES.wire.cost) {
    const g = spots.map(k => sim.guns.find(x => x.cell === k)).find(x => x && !x.weapon.kit);
    if (g) buyKit(sim, g.id);
  }
  upgradeAll(sim);
}

// Dagens slinga, gemensam för båda banorna: policyn tänker före varje våg och en gång per
// simulerad sekund under vågen, och kallar nästa våg tidigt när försvaret har det bekvämt.
// peak: flest levande zombier samtidigt.
// 0.13.0 (H132): en människa vrider en pjäs som står sysslolös medan zombier går förbi utanför dess
// skjutvinkel (Rotate). En pjäs som inte haft något mål på REAIM_IDLE s, och ser levande zombier inom
// räckvidd i sin hela sikt men inte i vinkeln, vrids mot deras mitt. Deterministiskt.
const REAIM_IDLE = 3;
function reaim(sim) {
  for (const g of sim.guns) {
    if (g.squad || !g.fullSight || g.move || g.turn || g.building > 0) continue;
    if (g.weapon.targetId != null) { g._idleSince = sim.time; continue; }
    g._idleSince ??= sim.time;
    if (sim.time - g._idleSince < REAIM_IDLE) continue;
    const range = WEAPONS[g.weapon.type].range * 1.2;
    let sx = 0, sz = 0, n = 0;
    for (const z of sim.zombies) {
      if (z.dead) continue;
      const p = zombiePos(sim, z), k = sim.place.keyAt(p.x, p.z);
      if (k < 0 || !g.fullSight.mask[k] || g.sight.mask[k] || Math.hypot(p.x - g.x, p.z - g.z) > range) continue;
      sx += p.x; sz += p.z; n++;
    }
    if (!n) continue;
    rotateGun(sim, g.id, Math.atan2(sz / n - g.z, sx / n - g.x));
    g._idleSince = sim.time;
  }
}
function runDay(sim, think0, early, onSecond = null, maxTicks = MAX_TICKS, trackSquads = false) {
  const think = () => { think0(); if (sim.phase === 'wave') reaim(sim); };
  const comfortable = () => sim.baseHp >= sim.map.baseHp && sim.zombies.every(z => z.dead || sim.route.fraction(z) < 0.5);
  let bonus = 0, thrown = 0, blastKills = 0, blastNow = false, squadHits = 0, squads = 0, squadDown = 0;
  const waves = [];
  let ticks = 0, firstHit = null, firstShot = null, waveIdx = 0, peak = 0;
  while (sim.phase !== 'won' && sim.phase !== 'lost' && ticks < maxTicks) {
    if (sim.phase === 'build' && sim.nextWaveIn == null) { think(); startWave(sim); }
    else if (sim.phase === 'build') {
      think();
      if (early && comfortable()) bonus += callNextWave(sim).bonus;
    } else if (ticks % THINK_EVERY === 0) {
      think();
      if (early && hasNextWave(sim) && !sim.spawnQueue.length && sim.zombies.filter(z => !z.dead).length <= EARLY_ALIVE && comfortable()) bonus += callNextWave(sim).bonus;
    }
    step(sim, DT); ticks++;
    if (sim.events.length) for (const ev of sim.events) {
      if (ev.t === 'grenade') thrown++;
      else if (ev.t === 'blast') blastNow = true;
      else if (ev.t === 'kill' && blastNow) blastKills++;
      else if (ev.t === 'shot' && firstShot == null) { firstShot = sim.time; if (trackSquads && ev.soldier != null && ev.hit) squadHits++; }
      else if (trackSquads && ev.t === 'shot' && ev.soldier != null && ev.hit) squadHits++;
      else if (trackSquads && ev.t === 'soldierDown') squadDown++;
    }
    blastNow = false;
    if (onSecond && ticks % 30 === 0) onSecond(sim);
    if (trackSquads && ticks % 30 === 0) squads = Math.max(squads, sim.guns.filter(g => g.squad).length);
    if (ticks % 15 === 0) { let n = 0; for (const z of sim.zombies) if (!z.dead) n++; if (n > peak) peak = n; }
    if (firstHit == null && sim.baseHp < sim.map.baseHp) firstHit = sim.time;
    if (sim.waveIndex > waveIdx || sim.phase === 'lost' || sim.phase === 'won') {
      if (sim.waveIndex > waveIdx || sim.phase === 'lost') waves.push({ cash: sim.cash, baseHp: Math.max(0, sim.baseHp) });
      waveIdx = sim.waveIndex;
    }
  }
  return {
    won: sim.phase === 'won', intelEarned: sim.intelEarned, baseHp: Math.max(0, sim.baseHp), waves: sim.waveIndex, lostBy: sim.lostBy ?? null,
    ...(sim.evac ? { evac: { ...sim.evac } } : {}),
    waveLog: waves, bonus, grenades: thrown, blastKills, firstHit, firstShot, fallTime: sim.phase === 'lost' && firstHit != null ? sim.time - firstHit : null, time: sim.time,
    peak, sim, report: dayReport(sim), cashEnd: sim.cash,
    ...(trackSquads ? { squads, squadHits, squadDown } : {}),
  };
}

// ---------- Gnesta: styr horden med barrikader ----------
// smart : en människa som läser kartan. Hon spärrar Sigtunavägen strax öster om rondellen, så
//         att horden måste upp första stickgatan, längs cykelvägen och ner över det öppna fältet
//         till rondellen. Hela vägen hålls öppen runt spärren, så ingen barrikad behöver slås
//         sönder. Vapen ställs där de ser mest av den vägen (coveragePlan: husen skymmer,
//         fältet gör det inte), taggtråd där flest pjäser ser, granatlådor när grunden står.
// naive : samma vapen (valda efter sin egen väg), tråd, lådor och uppgraderingar, men aldrig en
//         barrikad. Horden går den kortaste vägen längs Sigtunavägen, och pjäserna ställs där de
//         ser mest av den.
// Vågkall och köp mitt i vågen som greedy på E4 (runDay). Forskning mellan dagarna som på E4.
//
// 0.5.0 (fri placering och sikt): förut spärrade smart mellan stickgata 1 och 2 (varvet runt
// kvarteret förbi de fasta positionerna). Med fri placering ställer båda policyerna pjäserna där
// de ser mest, och det varvet går mellan husen där sikten är kort: smart blev inte bättre än
// naive (docs/balance-log.md, 0.5.0). Spärren vid rondellen leder horden över fältet, där
// pjäserna ser 40 rutor av vägen i stället för 30. Det är kartläsningen spelet vill lära ut:
// stäng gatan så att de måste gå där du ser dem.
const SMART_BLOCKS = [[-45, 24]];  // Sigtunavägen strax öster om rondellen (x, z i meter)
const DAY2_BLOCKS = [[-25, 31]];   // 0.16.2: Sigtunavägen vid första stickgatan, dag 2 (en ingång)
const PLAN_RANGE = 22;      // M2, pjäsen policyn helst bygger: täckning räknas för dess räckvidd
const PLAN_GUNS = 4;        // taggtråden läggs där flest av de fyra första pjäserna ser
const PLAN_WIRE = 3;        // taggtrådsspärrar på hordens väg
const MIN_COVER = 6;        // en plats byggs bara om den ser minst så många rutor av vägen
const GN_KITS = [0, 1, 1, 2, 3, 3];   // granatlådor per dag (index = dag)
const GN_DECAY = 0.7;       // täckningens avtagande per pjäs som redan ser rutan (coveragePlan)
const GN_NEAR = 1;          // vägrutan närmast basen väger 1 + GN_NEAR, den vid ingången 1
const GN_KIT_FROM_WAVE = 1; // lådorna köps först när första vågen är klar ("senare")
const GN_ROOFS = 2;         // Psg 90 på taken (0.8.0): planen har så många tak, där de ser mest av hordens väg
const GN_ROOFS_DAY = [0, 1, 1, 1, 1, 2];   // ... och så många bemannas per dag (index = dag)
const ROOF_RANGE = WEAPONS.psg90.range;
const GN_AK5 = 1;           // Ak 5 med granattillsats: högst en, på nästa plats i planen

// Ingångarna som dagen använder, i den ordning de dyker upp.
export const daySpawns = (map, day) => [...new Set(map.days[day - 1].waves.flatMap(w => w.groups.map(g => g.spawn)))];

const planCache = new Map();
// Planen för en dag: barrikadernas rutor, vapenplatser i ordning (coveragePlan över hordens väg
// med spärrarna på plats, M2:ns räckvidd) och taggtrådens rutor. Beror bara på banan,
// ingångarna och spärrarna, så den räknas en gång och sparas. research används inte längre
// (antalet pjäser styrs av sim.maxGuns), men argumentet finns kvar för anroparna.
export function gnestaPlan(map, ids, research = [], { blocks = SMART_BLOCKS, roofs: roofCount = GN_ROOFS, roofFilter = null, roofFirst = null, squadNear = null, near = GN_NEAR, focus = null, squadFocus = null, lastLine = 0, opener = null } = {}) {
  void research;
  const key = JSON.stringify([map.id, ids, blocks, ...(roofFilter || roofFirst || squadNear || focus || roofCount !== GN_ROOFS || near !== GN_NEAR ? [roofCount, !!roofFilter, !!roofFirst, squadNear, near, focus?.id, lastLine] : []), ...(opener ? [opener] : [])]);
  if (planCache.has(key)) return planCache.get(key);
  const sim = createSim({ map, day: 1, cash: 0, seed: 1 });
  const route = sim.route, g = route.grid;
  const obs = {}, lines = [];
  for (const [x, z] of blocks) {
    const c = route.cellAt(x, z);
    if (c == null) throw new Error(`ingen gata vid ${x}, ${z}`);
    for (const k of route.span(c)) obs[k] = { type: 'block' };
    lines.push(c);
  }
  const ps = route.paths(ids, obs);
  if (ps.some(p => !p.reaches || p.through != null)) throw new Error('planen stänger alla vägar');
  // Vägrutorna väger mer ju närmare basen de ligger (dit når alla som inte dött än).
  // focus (Gnesta Norr): vägrutorna i dödszonen väger mer (där spelaren vill slåss)
  const fw = c => (focus ? focus.weight(...g.center(c)) : 1);
  const weighted = ps.flatMap(p => p.cells.map((c, i) => [c, (1 + near * i / Math.max(1, p.cells.length - 1)) * fw(c)]));
  let cp = coveragePlan(map, weighted, { range: PLAN_RANGE, count: 8, decay: GN_DECAY, cacheKey: key });
  if (lastLine) {
    // Gnesta Norr: två linjer. Varannan pjäs i dödszonen (focus), varannan i sista linjen framför
    // entrén (den sista delen av vägen, lastLine av längden), sista linjen först.
    const tail = ps.flatMap(p => p.cells.map((c, i) => [c, i >= p.cells.length * (1 - lastLine) ? 1 : 0])).filter(([, wt]) => wt > 0);
    const cb = coveragePlan(map, tail, { range: PLAN_RANGE, count: 6, decay: GN_DECAY, cacheKey: key + '|last' });
    const merged = { spots: [], cover: [], sees: [] };
    const take = (src, i) => {
      const k = src.spots[i];
      if (k == null || merged.spots.includes(k)) return;
      const a = placementFor(map).center(k);
      if (merged.spots.some(q => { const b = placementFor(map).center(q); return Math.hypot(a.x - b.x, a.z - b.z) < MIN_SPACING; })) return;
      merged.spots.push(k); merged.cover.push(src.cover[i]); merged.sees.push(src.sees[i]);
    };
    for (let i = 0; i < 8; i++) { take(cb, i); take(cp, i); }
    cp = merged;
  }
  const keep = cp.spots.map((k, i) => i).filter(i => cp.cover[i] >= MIN_COVER);
  const guns = keep.map(i => cp.spots[i]);
  const seenBy = new Map();
  keep.slice(0, PLAN_GUNS).forEach(i => { for (const c of cp.sees[i]) seenBy.set(c, (seenBy.get(c) || 0) + 1); });
  // Taggtråd: rutorna på vägen som flest planerade pjäser ser (lika: närmast basen), en spärr per gata.
  const onPath = [...new Set(ps.flatMap(p => p.cells))].filter(c => route.validCell(c) && !obs[c]);
  const score = c => seenBy.get(c) || 0;
  onPath.sort((a, b) => score(b) - score(a) || route.walkLeft(a) - route.walkLeft(b) || a - b);
  const wire = [], taken = new Set();
  for (const c of onPath) {
    if (wire.length >= PLAN_WIRE || score(c) === 0) break;
    const span = route.span(c);
    if (span.some(k => taken.has(k) || obs[k])) continue;
    wire.push(c);
    // spärren och en ruta runt den hålls fri, så att trådarna inte klumpar ihop sig
    for (const k of span) for (const d of [0, 1, -1, g.w, -g.w]) taken.add(k + d);
  }
  // roofFirst (Gnesta Norr): första skytten på det radhustak som ser mest, de andra på vilket tak som
  // helst. (Prövat: bara radhustak gav dag 3 lika många läckor som naive; alla skyttar på villataken
  // tog bort radhusens roll helt.)
  let roofs = roofPlan(map, weighted, { count: roofCount, filter: roofFilter });
  if (roofFirst) {
    const first = roofPlan(map, weighted, { count: 1, filter: roofFirst });
    const pl = placementFor(map), at = k => pl.center(k);
    const rest = roofs.spots.map((k, i) => [k, roofs.cover[i], roofs.facings[i]]).filter(([k]) => first.spots.every(f => Math.hypot(at(k).x - at(f).x, at(k).z - at(f).z) >= MIN_SPACING));
    roofs = { spots: [...first.spots, ...rest.map(r => r[0])].slice(0, roofCount), cover: [...first.cover, ...rest.map(r => r[1])].slice(0, roofCount), facings: [...first.facings, ...rest.map(r => r[2])].slice(0, roofCount) };
  }
  // Hemvärnet: egna platser, där gevären (kortare räckvidd) ser mest av vägen. squadNear (Gnesta
  // Norr): platser där gruppen får minst så många man bakom tegelmurar eller husknutar först.
  // squadFocus (Gnesta Norr): gruppen ställs där den ser dödszonen (Gångvägen förbi radhusen)
  const sw = squadFocus ? ps.flatMap(p => p.cells.map(c => [c, squadFocus.weight(...g.center(c))])) : weighted;
  let squads = coveragePlan(map, sw, { range: WEAPONS.hv.range, count: squadNear ? 16 : 8, decay: GN_DECAY, cacheKey: key + (squadFocus ? '|sq' : '') }).spots;
  if (squadNear) {
    const s0 = createSim({ map, day: 1, cash: 0, seed: 1 });
    for (const k of Object.keys(obs)) s0.obstacles[k] = obs[k];
    const good = k => planSquad(s0, k).filter(c => c.cover === 'brick').length >= squadNear;
    squads = [...squads.filter(good), ...squads.filter(k => !good(k))];
  }
  // opener (Gnesta Norr 0.11.0): platsen som ser mest av öppningsgruppens väg (Sigtunavägen söderut
  // förbi ishallen); en människa ställer sin första pjäs där medan linjen i norr byggs.
  let openerGun = null, plan_openerSees = 0;
  if (opener && ids.includes(opener)) {
    // Helst en av planens första platser (den byggs ändan): den av dem som ser mest av öppningens väg.
    const op = ps.find(p => p.id === opener), on = new Set(op.cells);
    let bestN = 0;
    // 0.12.2: våg 1 kommer från olika håll. Söderifrån (sigW, nära ishallen) som förut; från norr och
    // öster möter människan dem där de kliver ur diset: pjäsen ser den första tredjedelen av vägen.
    const early = opener !== 'sigW';
    if (!early) keep.slice(0, 4).forEach(i => { const n = [...cp.sees[i]].filter(c => on.has(c)).length; if (n > bestN) { bestN = n; openerGun = cp.spots[i]; } });
    if (bestN < 4) {
      const cells = early ? op.cells.slice(0, Math.ceil(op.cells.length * 0.35)).map((c, i, a) => [c, 2 - i / a.length]) : op.cells.map((c, i) => [c, 1 + i / op.cells.length]);
      const oc = coveragePlan(map, cells, { range: PLAN_RANGE, count: 1, decay: GN_DECAY, cacheKey: key + '|opener' + (early ? 'E' : '') });
      openerGun = oc.spots[0] ?? null;
    }
    plan_openerSees = bestN;
  }
  const plan = { lines, guns, wire, squads, roofs: roofs.spots, roofCov: roofs.cover, roofFacing: roofs.facings, len: ps.map(p => p.cells.length), cov: keep.map(i => cp.cover[i]), ...(openerGun != null ? { openerGun, openerSees: plan_openerSees, opener } : {}) };
  planCache.set(key, plan);
  return plan;
}

// Taken för Psg 90 (0.8.0): som coveragePlan, men kandidaterna är takrutor och sikten är takets
// (allt inom räckvidd utom närmast det egna huset, placement.js ROOF_DEAD). Minst MIN_SPACING
// mellan skyttarna, lika: lägst rutnyckel. Deterministiskt.
export function roofPlan(map, route, { range = ROOF_RANGE, count = GN_ROOFS, decay = GN_DECAY, filter = null } = {}) {
  const p = placementFor(map);
  if (!p.roof) return { spots: [], cover: [], facings: [] };
  const weight = new Map();
  for (const it of route) { const [k, wt] = typeof it === 'number' ? [it, 1] : it; weight.set(k, (weight.get(k) || 0) + wt); }
  // 0.12.0 (H106, H107, H108): bara utsiktspunkterna (p.roof > 0), sikten med höjd från taket, och
  // konen vänd dit den ser mest av hordens väg (gärna längs en gata). Vikterna som rutnät för bestFacing.
  const wArr = new Float64Array(p.n);
  for (const [k, wt] of weight) wArr[k] = wt;
  const reach = range * 1.2, cands = [];
  for (let c = 0; c < p.n; c++) {
    if (!(p.roof[c] > 0) || (filter && !filter(p.bldg[c] - 1))) continue;
    const full = roofSightFrom(p, c, reach);
    const facing = bestFacing(p, c, full, wArr, CONE);
    const sees = coneSight(p, c, full, facing, CONE).keys.filter(t => weight.has(t) && Math.hypot(p.center(t).x - p.center(c).x, p.center(t).z - p.center(c).z) <= range + p.size * 0.7072);
    if (sees.length) cands.push({ c, at: p.center(c), sees, facing });
  }
  const times = new Map(), picked = [];
  for (let n = 0; n < count; n++) {
    let best = null, bestScore = 0;
    for (const cd of cands) {
      if (picked.some(q => Math.hypot(q.at.x - cd.at.x, q.at.z - cd.at.z) < MIN_SPACING - 1e-9)) continue;
      let sc = 0;
      for (const t of cd.sees) sc += weight.get(t) * decay ** (times.get(t) || 0);
      if (sc > bestScore + 1e-9) { best = cd; bestScore = sc; }
    }
    if (!best) break;
    picked.push(best);
    for (const t of best.sees) times.set(t, (times.get(t) || 0) + 1);
  }
  return { spots: picked.map(q => q.c), cover: picked.map(q => q.sees.length), facings: picked.map(q => q.facing) };
}

// Köpordning (en gång före varje våg och varje sekund under vågen): första vapnet, barrikaden,
// andra vapnet, en taggtråd, fler vapen, resten av tråden (även ny när den gamla slitits sönder),
// en granatlåda när första vågen är klar, sedan uppgraderingar, billigaste först.
function gnestaBuild(sim, plan, maxKits, maxRoofs = GN_ROOFS) {
  const buildOne = () => buildNext(sim, plan.guns, wantedWeapon(sim));
  const lay = (cells, type) => {
    for (const c of cells) {
      if (sim.obstacles[c]) continue;
      if (!acrossCells(sim, c).length || sim.cash < OBSTACLES[type].cost) return;
      placeAcross(sim, c, type);
    }
  };
  // 0.13.0 (H132): spärren först, så att pjäsernas skjutvinkel vänds mot vägen horden tar med spärren
  // (förut byggdes första pjäsen före spärren och vändes då mot Sigtunavägen).
  lay(plan.lines.slice(0, 1), 'block');
  if (sim.guns.length < 1) buildOne();
  if (sim.guns.length < 2) buildOne();
  lay(plan.lines, 'block');
  lay(plan.wire.slice(0, 1), 'wire');
  buySquad(sim, plan.squads);
  // 0.8.0: Psg 90 på taken som ser den tvingade vägen, sedan en Ak 5, sedan fler vapen på marken.
  // Pengarna sparas till dem: inga fler pjäser på marken förrän taken är bemannade.
  let saving = false;
  if (has(sim, 'psg90')) {
    for (const k of plan.roofs.slice(0, maxRoofs)) {
      if (sim.guns.some(g => g.cell === k)) continue;
      const r = build(sim, k, 'psg90', { facing: plan.roofFacing?.[plan.roofs.indexOf(k)] });
      if (!r.ok) { saving = r.reason === 'pengar'; break; }
    }
  }
  if (!saving && has(sim, 'ak5') && sim.guns.filter(g => g.weapon.type === 'ak5').length < GN_AK5) {
    if (!buildNext(sim, plan.guns, 'ak5') && sim.cash < WEAPONS.ak5.cost && gunCount(sim) < sim.maxGuns) saving = true;
  }
  // Hemvärnet fyller en lucka: när en position står tom efter första vågen och planen inte har
  // fler platser för pjäser köps en grupp på en egen plats, och policyn sparar till den (före
  // uppgraderingarna).
  const gunSpotLeft = plan.guns.some(k => !sim.guns.some(g => g.cell === k) && checkSpot(sim, k, 'm249').ok);
  const squadSaving = !saving && !gunSpotLeft && buySquad(sim, plan.squads, { gap: true }) === 'saving';
  if (!saving && !squadSaving) while (buildOne());
  lay(plan.wire, 'wire');
  if (squadSaving) saving = true;
  // Granatlådorna väntar också medan policyn sparar till taken.
  const kits = sim.guns.filter(g => g.weapon.kit).length;
  if (!saving && grenadeStats(sim.research) && sim.waveIndex >= GN_KIT_FROM_WAVE && kits < maxKits && sim.cash >= GRENADE_KIT.cost + OBSTACLES.wire.cost) {
    const g = plan.guns.map(k => sim.guns.find(x => x.cell === k)).find(x => x && !x.weapon.kit);
    if (g) buyKit(sim, g.id);
  }
  if (!squadSaving) upgradeAll(sim);
}

// Gnesta Norr: köpordningen följer det kartan lär ut. Barrikaden på Vikingavägen först, sedan en
// Psg 90 på ett radhustak och en Hemvärnsgrupp vid tegelmurarna, sedan pjäser på marken och
// taggtråd, fler tak, granatlådor när första vågen är klar och sist uppgraderingar (gruppen med).
// Pengarna sparas till taket och gruppen: inget annat köps förrän de står.
function norrBuild(sim, plan, maxKits, maxRoofs) {
  const lay = (cells, type) => {
    for (const c of cells) {
      if (sim.obstacles[c]) continue;
      if (!acrossCells(sim, c).length || sim.cash < OBSTACLES[type].cost) return;
      placeAcross(sim, c, type);
    }
  };
  // 0.11.0: öppningen söderifrån först, en billig Ksp 90 där den ser Sigtunavägen förbi ishallen
  // (en Ksp 88 där åt upp pengarna till linjen i norr: dag 5 förlorades i alla försök)
  // När öppningen är slut och norr har börjat säljs den (den ser inget av linjen i norr), och
  // pengarna går till linjen där. Prövat: att behålla den kostade dag 4 i alla seeds.
  const og = plan.openerGun != null ? sim.guns.find(g => g.cell === plan.openerGun) : null;
  if (plan.openerGun != null && sim.wavesStarted === 0 && !og) buildNext(sim, [plan.openerGun], 'm249');
  // 0.12.0 (H102): i stället för att sälja den flyttas den upp till nästa lediga plats i planen (8 s utan
  // eld), så att linjen i norr får en pjäs till utan att 40 % av priset går förlorat.
  const oid = plan.opener ?? 'sigW';
  if (og && !og.move && sim.wavesStarted >= 2 && !sim.spawnQueue.some(q => q.spawn === oid && q.wave === 0) && !sim.zombies.some(z => !z.dead && z.spawn === oid && z.wave === 0)) {
    const to = [...plan.guns].reverse().find(k => !sim.guns.some(g => g.cell === k) && checkMove(sim, og.id, k).ok);
    // naive (läser inte kartan) säljer som förut; smart flyttar
    if (to != null && sim.policy === 'smart') moveGun(sim, og.id, to); else sell(sim, og.id);
  }
  lay(plan.lines, 'block');
  let saving = false;
  if (has(sim, 'psg90')) {
    for (const k of plan.roofs.slice(0, Math.max(1, maxRoofs))) {
      if (sim.guns.some(g => g.cell === k)) continue;
      // fler tak först när två pjäser står på marken
      if (sim.guns.some(g => g.roof) && sim.guns.filter(g => !g.roof && !g.squad).length < 2) break;
      const r = build(sim, k, 'psg90', { facing: plan.roofFacing?.[plan.roofs.indexOf(k)] });
      if (!r.ok) { saving = r.reason === 'pengar'; break; }
    }
  }
  if (!saving && buySquad(sim, plan.squads) === 'saving') saving = true;
  if (saving && sim.guns.length) { lay(plan.wire.slice(0, 1), 'wire'); return; }
  while (buildNext(sim, plan.guns, wantedWeapon(sim)));
  lay(plan.wire, 'wire');
  if (has(sim, 'ak5') && sim.guns.filter(g => g.weapon.type === 'ak5').length < GN_AK5) buildNext(sim, plan.guns, 'ak5');
  const kits = sim.guns.filter(g => g.weapon.kit).length;
  // lådorna när första vågen norrifrån är klar (öppningen räknas inte, 0.11.0)
  const kitFrom = GN_KIT_FROM_WAVE + (plan.openerGun != null ? 1 : 0);
  if (grenadeStats(sim.research) && sim.waveIndex >= kitFrom && kits < maxKits && sim.cash >= GRENADE_KIT.cost + OBSTACLES.wire.cost) {
    const g = plan.guns.map(k => sim.guns.find(x => x.cell === k)).find(x => x && !x.weapon.kit);
    if (g) buyKit(sim, g.id);
  }
  // Fler pjäser före uppgraderingar: så länge en plats i planen är ledig sparas pengarna till nästa.
  const freeSpot = gunCount(sim) < sim.maxGuns && plan.guns.some(k => !sim.guns.some(g => g.cell === k) && checkSpot(sim, k, 'm249').ok);
  if (!freeSpot) upgradeAll(sim);
}

// ---------- Gnesta Norr (0.10.0): horden norrifrån ----------
// smart : en människa som läser kartan. Hon spärrar Vikingavägen söder om den andra stigen till
//         Gångvägen, så att horden från Dansutvägen och Vikingavägen norr måste gå hela Gångvägen förbi
//         radhusen och sedan Fornminnesvägen och gångarna ner mot ishallen. Utan spärren viker horden
//         av mot Vikingavägen vid stigen. Hennes dödszon är Gångvägens södra del (radhuslängorna E, G
//         och H): där ställs pjäserna (varannan, varannan i sista linjen framför entrén), gruppen vid
//         tegelmurarna och den första Psg 90 på det radhustak som ser mest. Dag 5, när Sigtunavägen
//         öst öppnar igen, spärrar hon också Sigtunavägen vid rondellen som på Gnesta.
// naive : samma köp, allt ställt efter sin egen väg (vilket tak som helst, vilken plats som helst),
//         aldrig en barrikad.
// Prövat och förkastat (docs/balance-log.md, 0.10.0): spärren söder om Gångvägens början (horden
// tog en U-sväng vid Vikingavägens krök som var bättre för naive), två spärrar genom
// radhuskvarteret, dödszonen över hela Gångvägen.
export const NORR_BLOCKS = [normK(1305, 650)];   // Vikingavägen, söder om den andra stigen
// Dödszonen: vägrutor närmare Gångvägens södra del än 14 m väger tre gånger så mycket.
const GANGVAG = gnestaNorr.roads.find(r => r.id === 'gangvag').pts;
const NORR_FOCUS = { id: 'gangvag-syd', weight: (x, z) => (z > -112 && distPolyline(x, z, GANGVAG) < 14 ? 3 : 1) };
const NORR_ROW_ROOFS = (() => {
  // radhuslängornas tak kommer efter villornas i placeringens byggnadslista
  const villas = gnestaNorr.lots.plots.filter(p => p.house).length;
  return i => i >= villas;
})();
// Ingången för dagens första grupp på Gnesta Norr (öppningen), sigW om våg 1 bara är hus.
const norrOpener = day => gnestaNorr.days[day - 1].waves[0].groups[0]?.spawn ?? 'sigW';
export const TOWN = {
  // 0.16.2: dag 2 har en enda ingång (Sigtunavägen öst); spärren där läggs så att horden går runt kvarteret
  // (DAY2_BLOCKS), inte vid rondellen där vägen inte har någon omväg
  gnesta: { blocks: day => (day === 2 ? DAY2_BLOCKS : SMART_BLOCKS), planOpts: () => ({}), kits: GN_KITS, roofsDay: GN_ROOFS_DAY, maxTicks: MAX_TICKS },
  'gnesta-norr': {
    blocks: day => (day >= 5 ? [...NORR_BLOCKS, ...SMART_BLOCKS] : NORR_BLOCKS),
    // smart läser kartan (dödszonen, radhustaken, tegelmurarna); naive ställer allt efter sin egen väg
    // 0.12.2: öppningspjäsen möter dagens första grupp, varifrån den än kommer
    planOpts: (day, policy) => (policy === 'smart' ? { roofs: 3, roofFirst: NORR_ROW_ROOFS, squadNear: 1, near: 0, focus: NORR_FOCUS, squadFocus: NORR_FOCUS, lastLine: 0.25, opener: norrOpener(day) }
      : { roofs: 3, near: 0, lastLine: 0.25, opener: norrOpener(day) }),
    kits: [0, 1, 1, 2, 3, 3], roofsDay: [0, 1, 2, 2, 2, 3], maxTicks: 30 * 1500, build: (...a) => norrBuild(...a),
  },
};
// Gnesta Norr: Hemvärnet köps inte av policyn (den använder det den har i reserven).
HV_POLICY['gnesta-norr'] = { days: [], gap: [] };

// Gnesta, rök-körning: en trivial våg, tre vandrare från varje spawn, inga vapen eller hinder.
// Inga balansmål än; den visar att horden hittar fram och hur lång tid det tar per ingång.
// check: kontrollera varje steg att varje zombie står på en gångbar ruta.
export function gnestaSmoke({ check = false, seed = 1, base = gnesta, blocks = [], count = 3, types = ['walker'] } = {}) {
  const groups = base.spawns.flatMap((s, i) => types.map(type => ({ type, count, interval: 2, delay: i * 0.5, spawn: s.id })));
  const map = { ...base, baseHp: 999, days: [{ n: 1, startCash: 0, waves: [{ groups }] }] };
  const sim = createSim({ map, day: 1, cash: blocks.length * OBSTACLES.block.cost, seed });
  for (const [x, z] of blocks) if (!placeAcross(sim, sim.route.cellAt(x, z), 'block').ok) throw new Error(`ingen spärr vid ${x}, ${z}`);
  const g = sim.route.grid;
  const arrivals = Object.fromEntries(base.spawns.map(s => [s.id, { count: 0, first: null, last: null }]));
  let offRoad = 0;
  const from = new Map();      // zombie-id -> spawn (framme-zombier tas bort i samma steg)
  startWave(sim);
  while (sim.phase === 'wave' && sim.time < 900) {
    step(sim, DT);
    for (const z of sim.zombies) if (!from.has(z.id)) from.set(z.id, z.spawn);
    for (const ev of sim.events) if (ev.t === 'breach') {
      const a = arrivals[from.get(ev.id)];
      a.count++; a.first ??= sim.time; a.last = sim.time;
    }
    if (check) for (const z of sim.zombies) if (!z.dead && !g.walkable(g.keyAt(z.x, z.z))) offRoad++;
  }
  return { phase: sim.phase, time: sim.time, arrivals, offRoad, len: sim.route.len };
}


// ---------- Operation Södermanland (0.14.0): kampanjen ----------
export const SECTOR_ORDER = ['riksvagen', 'gnesta', 'gnesta-norr'];
const SQUAD_ORDER = ['inf', 'hv', 'civ'];
// Uppställningens ordning när frontbredden inte räcker till alla: tyngst först.
const DEPLOY_ORDER = ['m2', 'ksp58', 'epa', 'psg90', 'ak5', 'inf', 'm249', 'hv', 'civ'];

// Uppställningen: allt i reserven ut på planens platser. Öppningens Ksp 90 först (Gnesta North), Psg 90 på
// planens tak (sedan marken), pjäserna från den tyngsta på de platser som ser mest av hordens väg, grupperna
// på sina egna platser. Det som inte får plats på planen provas på de andras platser.
function deployAll(sim, plan) {
  const tryAt = (spots, type, opts = () => ({})) => {
    for (const k of spots) {
      if (sim.guns.some(g => g.cell === k)) continue;
      const r = build(sim, k, type, opts(k));
      if (r.ok) return true;
      if (r.reason === 'reserv' || r.reason === 'uppställd' || r.reason === 'front') return false;
    }
    return false;
  };
  const guns = [...plan.guns, ...plan.squads], squads = [...plan.squads, ...plan.guns];
  if (plan.openerGun != null && reserveCount(sim, 'm249')) tryAt([plan.openerGun], 'm249');
  // frontbredden: de tyngsta först (DEPLOY_ORDER), högst nivå först inom typen (build tar den)
  for (const t of DEPLOY_ORDER) {
    while (reserveCount(sim, t) && sim.guns.length < frontage(sim)) {
      const ok = t === 'psg90' ? tryAt(plan.roofs ?? [], t, k => ({ facing: plan.roofFacing?.[plan.roofs.indexOf(k)] })) || tryAt(guns, t)
        : tryAt(SQUAD_ORDER.includes(t) ? squads : guns, t);
      if (!ok) break;
    }
  }
}
// Förnödenheterna utöver hindren och granatlådorna: ammunition till pjäserna, sandsäckar till grupperna,
// med pengar kvar till en ny taggtråd. Efter första vågen (en människa bygger först).
function spendSupplies(sim) {
  if (sim.waveIndex < 1) return;
  const keep = OBSTACLES.wire.cost;
  for (const g of sim.guns) if (!g.squad && !g.weapon.ammo && sim.cash >= SUPPLIES.ammo.cost + keep) buySupply(sim, g.id, 'ammo');
  for (const g of sim.guns) if (g.squad && !g.weapon.sandbags && sim.cash >= SUPPLIES.sandbags.cost + keep) buySupply(sim, g.id, 'sandbags');
}
const lay = (sim, cells, type) => {
  for (const c of cells) {
    if (sim.obstacles[c]) continue;
    if (!acrossCells(sim, c).length || sim.cash < OBSTACLES[type].cost) return;
    placeAcross(sim, c, type);
  }
};
// Dagens plan: E4 platserna som ser mest av vägen, stadsbanorna gnestaPlan (smart med spärrarna, naive utan).
function opPlan(map, day, town) {
  if (!town) { const sp = e4Plan(day).spots; return { guns: sp, squads: sp, roofs: [], lines: [] }; }
  const T = TOWN[map.id];
  return gnestaPlan(map, daySpawns(map, day), [], { ...T.planOpts(day, town), blocks: town === 'smart' ? T.blocks(day) : [] });
}
// Spelarna. plan: hur pjäserna ställs ('smart' läser kartan, 'naive' efter sin egen väg), blocks: spärrar
// som smart (leder horden), early: kallar vågor tidigt när det är lugnt, supplies: köper ammunition och
// sandsäckar. E4 har ingen spärr att välja; där skiljer bara early och supplies.
// 0.14.0: på Gnesta North är spärren på Vikingavägen med pjäserna där de ser hordens väg bättre än 0.13:s
// smarta plan (dödszonen, radhustaken) när styrkan är kärntrupper; skilled spelar så där (planBy).
export const POLICIES = {
  skilled: { plan: 'smart', planBy: { 'gnesta-norr': 'naive' }, blocks: true, early: true, supplies: true },
  normal: { plan: 'naive', blocks: true, early: false, supplies: false },
  naive: { plan: 'naive', blocks: false, early: false, supplies: false },
  // 0.16.2 (speltestet av 0.16.1, Ishallen dag 2): förstagångsspelaren som följer tipsen. Lägger spärren som
  // lektionen säger och ställer sedan pjäserna längs den nya vägen som pilarna visar (followRoute), men läser inte
  // kartan mer än så och köper inget extra.
  hints: { plan: 'naive', blocks: true, followRoute: true, early: false, supplies: false },
};
// En dag i operationen. policy: namnet i POLICIES. Returnerar runDay:s resultat med dagens rapport.
export function playOpDay(progress, mapId, day, policy = 'skilled', { seedOffset = 0, onSecond = null } = {}) {
  const P0 = typeof policy === 'string' ? POLICIES[policy] : policy;
  const P = { ...P0, plan: P0.planBy?.[mapId] ?? P0.plan };
  const cfg = opStartConfig(progress, day, mapId);
  const sim = createSim({ ...cfg, seed: cfg.seed + seedOffset });
  const map = cfg.map, T = TOWN[mapId], isTown = !!T;
  sim.policy = isTown ? (P.plan === 'smart' ? 'smart' : 'naive') : 'greedy';
  // 0.16.0: barrikaderna är upplåsta från South dag 2 (src/meta/unlocks.js); före det spärrar ingen
  const canBlock = !cfg.allow || cfg.allow.includes('block');
  let plan = !isTown ? opPlan(map, day, null) : gnestaPlan(map, daySpawns(map, day), [], { ...T.planOpts(day, P.plan), blocks: P.blocks && canBlock ? T.blocks(day) : [] });
  // spärrarna utan planens platser: pjäserna ställs där de ser sin egen väg (naive), spärren läggs ändå
  if (isTown && P.blocks && canBlock && P.plan !== 'smart' && !P.followRoute) {
    const own = gnestaPlan(map, daySpawns(map, day), [], { ...T.planOpts(day, 'naive'), blocks: [] });
    plan = { ...own, lines: plan.lines, wire: plan.wire };
  }
  const builder = !isTown ? () => greedyBuild(sim, plan.guns)
    : () => (T.build ?? gnestaBuild)(sim, plan, T.kits[day], T.roofsDay[day]);
  // 0.16.0: en sen enhet (E4 dag 1:s andra Ksp 90) ställs ut när den kommit fram
  const lateReady = () => sim.reserve?.some(u => u.arrive && canDeploy(sim, u));
  const think = () => {
    if (deployPhase(sim)) { lay(sim, plan.lines ?? [], 'block'); deployAll(sim, plan); }
    else if (lateReady()) deployAll(sim, plan);
    builder();
    if (P.supplies) spendSupplies(sim);
  };
  const r = runDay(sim, think, P.early, onSecond, T?.maxTicks ?? MAX_TICKS, isTown);
  const { sim: _s, ...rest } = r;
  void _s;
  return { ...rest, plan };
}

// Rekvisitionen mellan försöken: mål i ordning per sektor. 'unit:T:N' (minst N av typen i sektorn),
// 'lvl:T:L' (alla av typen minst nivå L, lägsta först), 'up:X:N' (förrådets uppgradering X till nivå N).
// Ett mål som inte är uppfyllt köps mot; går det inte att betala sparas RP till det (inget längre ned
// köps). Typer som inte är släppta i sektorn hoppas över. Påfyllnad av grupperna först, om RP räcker.
export const REQUISITION = {
  riksvagen: ['up:m249Rate:1', 'lvl:inf:2', 'unit:m249:3', 'up:wireTough:1', 'lvl:m249:2', 'lvl:epa:2', 'up:m249Rate:2', 'up:m2:2', 'unit:inf:2'],
  gnesta: ['lvl:civ:2', 'unit:m249:3', 'lvl:m249:2', 'lvl:hv:2', 'up:m249Rate:2', 'up:grenade:2', 'unit:ksp58:2', 'lvl:ksp58:2', 'up:ksp58:2', 'unit:ksp58:3',
    'lvl:ak5:2', 'up:grenade:3', 'lvl:ksp58:3', 'up:wireTough:2', 'up:block:2', 'lvl:m2:2', 'up:m2:2', 'unit:ksp58:4', 'up:ksp58:3', 'up:budget:1', 'unit:psg90:2', 'up:hvRifles:1'],
  'gnesta-norr': ['up:hvRifles:2', 'lvl:ksp58:2', 'unit:ksp58:4', 'up:ksp58:2', 'lvl:psg90:2', 'unit:psg90:3', 'up:psg90:2', 'lvl:inf:2', 'up:budget:2', 'lvl:ksp58:3', 'unit:inf:2',
    'up:m2:3', 'up:ksp58:3', 'unit:ak5:2', 'lvl:ak5:3', 'up:psg90:3', 'up:budget:3', 'unit:ksp58:5'],
};
function requisitionPolicy(p, mapId) {
  for (const u of unitsIn(p, mapId)) if (refillCost(p, u) && refillCost(p, u) <= p.rp) p = refill(p, u.uid).progress;
  const released = releasedTypes(p, mapId);
  for (const t of REQUISITION[mapId] ?? []) {
    const [kind, id, nStr] = t.split(':'), n = Number(nStr);
    for (let guard = 0; guard < 12; guard++) {
      if (kind === 'unit') {
        if (!released.includes(id) || unitsIn(p, mapId).filter(u => u.type === id).length >= n) break;
        const r = requisition(p, id, mapId);
        // 0.16.0: inget släppt (lagret är tomt) eller rekvisitionen inte upplåst än: nästa mål
        if (!r.ok && (r.reason === 'none' || r.reason === 'locked')) break;
        if (!r.ok) return p;
        p = r.progress;
      } else if (kind === 'lvl') {
        const low = unitsIn(p, mapId).filter(u => u.type === id && u.level < n).sort((a, b) => a.level - b.level || a.uid - b.uid)[0];
        if (!low) break;
        const r = levelUp(p, low.uid);
        if (!r.ok && r.reason === 'locked') break;
        if (!r.ok) return p;
        p = r.progress;
      } else if (kind === 'up') {
        const st = upgradeState(p, id);
        if (!st || st.tier == null || st.tier > n || st.reason === 'locked') break;
        if (!st.ok) return p;
        p = buyUpgrade(p, id).progress;
      }
    }
  }
  return p;
}
// Otilldelade enheter (en sektor som håller) och enheter i sektorer utan fler dagar flyttas till sektorn
// som spelas, om typen är släppt där.
function gatherUnits(p, mapId) {
  for (const u of p.op.units) if (u.sector !== mapId && (u.sector == null || mapState(p, u.sector).unlockedDay > MAPS[u.sector].days.length) && canReassign(p, u.uid, mapId).ok) p = reassign(p, u.uid, mapId).progress;
  return p;
}
const forceOf = (p, mapId) => {
  const c = {};
  for (const u of unitsIn(p, mapId)) { const k = u.type + 'L' + u.level + (u.wins >= 3 ? '*' : ''); c[k] = (c[k] ?? 0) + 1; }
  return Object.entries(c).map(([k, n]) => (n > 1 ? `${n}x` : '') + k).join(' ');
};
// Hela kampanjen: varje sektor i ordning, varje dag tills den vinns (högst maxAttempts försök).
// Loggen har en rad per försök. stuck: dagen som aldrig vanns (kampanjen stannar där).
// start: framsteget att börja från (standard: en ny kampanj); sectors: sektorerna som spelas.
export function opCampaign(policy = 'skilled', { seedOffset = 0, maxAttempts = 8, sectors = SECTOR_ORDER, start = null } = {}) {
  let p = start ?? newCampaign();
  const log = [];
  for (const mapId of sectors) {
    p = selectMap(p, mapId);
    const days = MAPS[mapId].days.length;
    for (let day = mapState(p, mapId).unlockedDay; day <= days; day++) {
      let won = false;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        p = requisitionPolicy(gatherUnits(p, mapId), mapId);
        const force = forceOf(p, mapId), rpBefore = p.rp, pressure = pressureOf(p, mapId);
        const r = playOpDay(p, mapId, day, policy, { seedOffset });
        const f = finishDay(p, { mapId, day, won: r.won, intelEarned: r.intelEarned, report: r.report, evac: r.evac });
        log.push({ mapId, day, attempt, won: r.won, baseHp: r.baseHp, waves: r.waves, rp: f.rp.total, rpBefore, rpAfter: f.progress.rp, pressure, force,
          lostMen: r.report?.lostMen ?? 0, lostUnits: r.report?.lostUnits ?? 0, bonuses: f.rp.bonuses.map(b => b.id), time: Math.round(r.time), firstShot: r.firstShot, peak: r.peak,
          ...(r.evac ? { evac: { safe: r.evac.safe, lost: r.evac.lost, need: r.evac.need } } : {}), fallTime: r.fallTime == null ? null : Math.round(r.fallTime),
          // 0.14.1: basen efter varje våg (tempot inom dagen); räknas inte in i fingeravtrycket (stepPrints)
          waveBase: r.waveLog.map(w => w.baseHp),
          // 0.14.2: förnödenheterna kvar när dagen tar slut (överskottet); inte heller i fingeravtrycket
          cashEnd: r.cashEnd });
        p = f.progress;
        if (r.won) { won = true; break; }
      }
      if (!won) return { log, progress: p, stuck: { mapId, day } };
    }
  }
  return { log, progress: p, stuck: null };
}
// Försök till vinst per kampanjsteg ('riksvagen 1' ...), eller 'x' om dagen aldrig vanns.
export const STEPS = SECTOR_ORDER.flatMap(m => MAPS[m].days.map(d => `${m} ${d.n}`));
export function attemptsPerStep(log) {
  return STEPS.map(s => { const [m, d] = s.split(' '); const t = log.filter(r => r.mapId === m && r.day === Number(d)); const w = t.find(r => r.won); return w ? w.attempt : t.length ? 'x' : '-'; });
}
// Kampanjstegens fingeravtryck: varje stegs utfall (försök, bas kvar, RP, förluster) i en kort hash, så att
// ett prov kan peka ut vilket steg som ändrades.
export function stepPrints(log) {
  const h = str => { let x = 0x811c9dc5; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };
  const strip = ({ waveBase, cashEnd, ...r }) => (void waveBase, void cashEnd, r);
  return Object.fromEntries(STEPS.map(s => { const [m, d] = s.split(' '); return [s, h(JSON.stringify(log.filter(r => r.mapId === m && r.day === Number(d)).map(strip)))]; }));
}

// ---------- Mölnbo (0.17.0-molnbo) ----------
// Spelaren kommer från Hagstumosse med det en vanlig spelare har där (opCampaign('normal'): trupperna, nivåerna,
// förrådets uppgraderingar och RP). Två spelare i Mölnbo:
//   mbSmart : läser kartan. Spärrar Stenbyvägen vid Missionshuset och Kvarnvägen (horden från Gnestavägen måste runt
//             genom rutnätet söder om spåret), gångbron när horden kommer norr om spåret (dag 4 och 5: allt därifrån
//             måste över vägbron, flaskhalsen), Psg 90 på trapptornen och taken, grupperna bakom tåget.
//   naive   : samma trupper och köp, ställer allt efter sin egen väg och spärrar aldrig.
// Mål (uppdraget): mbSmart vinner dag 1 till 3 inom 2 försök och dag 4 och 5 inom 3 till 4, naive förlorar från dag 3,
// högst cirka 250 levande zombier. docs/balance-log.md, Mölnbo.
// Stenbyvägen vid Missionshuset, och Kvarnvägen förbi hyreshusen (annars går horden från Gnestavägen den vägen,
// söder om Folkets hus, och aldrig förbi stationen)
const MB_STENBY = [R_MB(-1.5, 56), R_MB(-90, 71)];
// Gångbrons södra ramp: horden norrifrån måste över vägbron, där tornen och caféets parkering ser dem. Prövat
// (balansloggen): spärren på vägbron i stället (horden tar gångbron) och en tyngd på pjäserna vid broarna var sämre.
const MB_FOOT = [R_MB(-17.5, 22)];
TOWN.molnbo = {
  blocks: day => (day >= 4 ? [...MB_STENBY, ...MB_FOOT] : MB_STENBY),
  planOpts: (day, policy) => (policy === 'smart' ? { roofs: 3, near: 0.5, lastLine: 0.25 } : { roofs: 3, near: 0 }),
  kits: [0, 1, 1, 2, 2, 3], roofsDay: [0, 2, 2, 3, 3, 3], maxTicks: 30 * 1200,
};
HV_POLICY.molnbo = { days: [], gap: [] };
REQUISITION.molnbo = ['up:psg90:3', 'lvl:psg90:2', 'unit:psg90:4', 'lvl:ksp58:3', 'unit:ksp58:6', 'lvl:inf:2', 'unit:inf:3', 'lvl:m2:3', 'lvl:psg90:3', 'unit:ak5:3', 'lvl:ak5:3', 'unit:m249:6'];
POLICIES.mbSmart = { plan: 'smart', blocks: true, early: false, supplies: true };
// Framsteget en vanlig spelare har när Mölnbo öppnar (sparas per seed).
const mbArrival = new Map();
export function molnboArrival(seedOffset = 0) {
  if (!mbArrival.has(seedOffset)) mbArrival.set(seedOffset, opCampaign('normal', { seedOffset }).progress);
  return mbArrival.get(seedOffset);
}
// Mölnbo från ankomsten. maxAttempts: försök per dag innan policyn ger upp.
export function molnboCampaign(policy = 'mbSmart', { seedOffset = 0, maxAttempts = 6 } = {}) {
  return opCampaign(policy, { seedOffset, maxAttempts, sectors: ['molnbo'], start: molnboArrival(seedOffset) });
}
export const MB_STEPS = MAPS.molnbo.days.map(d => `molnbo ${d.n}`);
export const mbAttempts = log => MB_STEPS.map(s => { const d = Number(s.split(' ')[1]); const t = log.filter(r => r.mapId === 'molnbo' && r.day === d); const w = t.find(r => r.won); return w ? w.attempt : t.length ? 'x' : '-'; });
export function mbPrints(log) {
  const h = str => { let x = 0x811c9dc5; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };
  const strip = ({ waveBase, cashEnd, ...r }) => (void waveBase, void cashEnd, r);
  return Object.fromEntries(MB_STEPS.map(s => { const d = Number(s.split(' ')[1]); return [s, h(JSON.stringify(log.filter(r => r.mapId === 'molnbo' && r.day === d).map(strip)))]; }));
}

const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === 'molnbo') {
  for (const policy of process.argv[3] ? [process.argv[3]] : ['mbSmart', 'naive']) {
    console.log(`\n=== Mölnbo, ${policy} ===`);
    console.log('seed  ' + MB_STEPS.map(s => 'M' + s.split(' ')[1]).join(' ') + '   peak');
    const runs = SEEDS.map(seedOffset => molnboCampaign(policy, { seedOffset, maxAttempts: policy === 'naive' ? 4 : 6 }));
    runs.forEach((r, i) => console.log(`${String(i).padEnd(5)} ${mbAttempts(r.log).map(x => String(x).padStart(2)).join(' ')}   ${Math.max(...r.log.map(x => x.peak))}${r.stuck ? `  fast: dag ${r.stuck.day}` : ''}`));
    for (const x of runs[0].log) console.log(`  dag ${x.day} försök ${x.attempt} ${x.won ? 'ja ' : 'nej'} bas ${String(x.baseHp).padStart(2)} vågor ${x.waves} tid ${x.time} topp ${x.peak} -${x.lostMen}/${x.lostUnits}  ${x.force}`);
  }
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const only = process.argv[2];
  const name = { riksvagen: 'E4', gnesta: 'South', 'gnesta-norr': 'North' };
  for (const policy of only ? [only] : ['skilled', 'normal']) {
    console.log(`\n=== ${policy} ===`);
    console.log('seed  ' + STEPS.map(s => { const [m, d] = s.split(' '); return `${name[m][0]}${d}`; }).join(' '));
    const runs = SEEDS.map(seedOffset => opCampaign(policy, { seedOffset }));
    runs.forEach((r, i) => console.log(`${String(i).padEnd(5)} ${attemptsPerStep(r.log).map(x => String(x).padStart(2)).join(' ')}${r.stuck ? `  fast: ${r.stuck.mapId} dag ${r.stuck.day}` : ''}`));
    const r0 = runs[0];
    console.log('seed 0, försök för försök: sektor dag försök vann bas rp (före→efter) tryck förluster bonus  styrka');
    for (const x of r0.log) console.log(`  ${name[x.mapId].padEnd(5)} ${x.day} ${x.attempt} ${x.won ? 'ja ' : 'nej'} ${String(x.baseHp).padStart(2)} ${String(x.rp).padStart(4)} (${x.rpBefore}→${x.rpAfter}) p${x.pressure} -${x.lostMen}/${x.lostUnits} ${x.bonuses.join(',') || '-'} ${x.evac ? `civ ${x.evac.safe}/${x.evac.need} ` : ''}${x.time}s  ${x.force}`);
  }
}
