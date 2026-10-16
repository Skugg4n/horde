// Balanssimulering: spelar kampanjen headless med deterministiska policyer.
//   greedy  : en människa som spenderar pengar när de kommer in, även mitt i vågen (koll varje sekund).
//             Pjäserna ställs där de ser mest av hordens väg (coveragePlan).
//   minimal : bara det dag 1 ber om, en M249 på en given plats, inget mer.
// greedy kallar nästa våg tidigt (bonus) när försvaret har det bekvämt: basen hel och ingen
// levande zombie förbi halva vägen, och mitt i en våg dessutom när allt i vågen har kommit och
// högst tre lever. Annars väntar den ut nedräkningen. minimal väntar alltid ut den.
import { fileURLToPath } from 'node:url';
import { gunCount, squadCount, createSim, startWave, step, build, upgrade, placeObstacle, placeAcross, acrossCells, buyKit, callNextWave, hasNextWave, checkSpot, sell, moveGun, checkMove } from '../src/sim/sim.js';
import { weaponUnlocked, obstacleUnlocked, upgradeCost, grenadeStats, maxGuns } from '../src/sim/stats.js';
import { placementFor, lineOfSightH, KIND, MIN_SPACING, roofSightFrom, bestFacing, coneSight, CONE } from '../src/sim/placement.js';
import { WEAPONS, GRENADE_KIT } from '../src/data/weapons.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { newProgress, startConfig, dayResult, canBuyResearch, buyResearch, selectMap } from '../src/meta/progress.js';
import { MAPS } from '../src/data/maps.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaNorr, K as normK } from '../src/data/gnesta-norr.js';
import { planSquad } from '../src/sim/squad.js';
import { distPolyline } from '../src/data/gnesta.js';

const DT = 1 / 30;
const THINK_EVERY = 30;          // steg mellan policyns beslut under en våg (1 s simtid)
// Nod-id; varje förekomst köper nästa nivå i noden.
// 0.8.0: Psg 90 direkt efter Ksp 88 III (Psg 90 kräver Ksp 88 II), Ksp 58 och Ak 5 efter
// Grenades III och Bigger budget III, sedan nivåerna. Policyn har Psg 90 från Gnesta dag 4 och
// alla tre dag 5. E4-kampanjen stannar långt före, så E4:s kvitto är orört. (Ksp 58 före dag 4
// gjorde granatlådan sämre än pengarna dag 4: se docs/balance-log.md.)
const RESEARCH_ORDER = ['m2', 'wireTough', 'budget', 'block', 'grenade', 'm249Rate', 'positions',
  'm2', 'm249Rate', 'grenade', 'budget', 'block', 'wireTough', 'm2', 'psg90', 'm249Rate', 'grenade', 'budget', 'ksp58', 'ak5', 'block', 'positions',
  'ksp58', 'ak5', 'psg90', 'positions', 'ksp58', 'ak5', 'psg90'];
// Gnesta Norr (0.10.0): Hemvärnets forskning först (H054), sedan resten i samma ordning. E4 och Gnesta
// använder RESEARCH_ORDER som förut, så deras kvitton påverkas inte.
export const NORR_HV_ORDER = ['hvRifles', 'hvSquad', 'hvRifles', 'hvVeterans', 'hvRifles', 'hvSquad', 'hvVeterans', ...RESEARCH_ORDER];
// En spelare som kommer till en bana utan forskning (?debug&fresh): billigast nyttiga först (Faster
// Ksp 90 I, Heavy wire I), sedan som vanligt.
export const FRESH_ORDER = ['budget', 'm249Rate', 'grenade', 'm249Rate', 'budget', ...RESEARCH_ORDER];
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

// E4: hordens väg är alla gångbara rutor (vägen från spawn till basen). M249:ns räckvidd,
// pjäsen policyn bygger först.
const E4_RANGE = WEAPONS.m249.range;
export const e4Plan = () => coveragePlan(MAPS.riksvagen, placementFor(MAPS.riksvagen).walkKeys, { range: E4_RANGE, cacheKey: 'e4' });

// Bygger nästa planerade plats som är ledig. Returnerar true om något byggdes.
function buildNext(sim, spots, type) {
  if (gunCount(sim) >= sim.maxGuns) return false;
  for (const k of spots) {
    if (sim.guns.some(g => g.cell === k)) continue;
    const r = build(sim, k, type);
    if (r.ok) return true;
    if (r.reason === 'pengar' || r.reason === 'fullt') return false;
  }
  return false;
}
// Vapnet på marken: Ksp 88 om den går att köpa, annars Ksp 58 om den är forskad (då sparar
// policyn till den i stället för att köpa en Ksp 90), annars det billigaste. Ak 5 och Psg 90
// köps för sig (gnestaBuild).
const GROUND = ['m249', 'ksp58', 'm2'];
const wantedWeapon = sim => {
  const opts = GROUND.map(id => WEAPONS[id]).filter(w => weaponUnlocked(w.id, sim.research, sim.map));
  const heavy = opts.find(w => w.id === 'm2');
  if (heavy && sim.cash >= heavy.cost) return heavy.id;
  if (opts.some(w => w.id === 'ksp58')) return 'ksp58';
  return opts.sort((a, b) => a.cost - b.cost)[0].id;
};
// Hemvärnet (0.9.0). E4: billig täckning dag 1, en grupp direkt efter första pjäsen på nästa
// lediga plats i planen. Gnesta: fyller luckor, en grupp när första vågen är klar, en position
// står tom och pengarna inte räcker till pjäsen policyn sparar till. (Prövat i docs/balance-log.md
// 0.9.0: dag 1 på Gnesta tog pengarna från andra pjäsen, och senare dagar på E4 från taggtråden.)
const HV_PER_DAY = 1;
// days: dagar då gruppen köps tidigt, gap: dagar då den fyller en lucka.
export const HV_POLICY = { riksvagen: { days: [1], gap: [] }, gnesta: { days: [], gap: [2, 3, 4, 5] } };
function buySquad(sim, spots, { gap = false } = {}) {
  const pol = sim.hvPolicy ?? HV_POLICY[sim.map.id] ?? { days: [], gap: [] };
  if (gap ? !pol.gap.includes(sim.day) || sim.waveIndex < 1 : !pol.days.includes(sim.day)) return;
  if (!weaponUnlocked('hv', sim.research, sim.map) || squadCount(sim) >= sim.maxSquads) return;
  if (sim.guns.filter(g => g.squad).length >= HV_PER_DAY) return;
  if (sim.cash < WEAPONS.hv.cost) return 'saving';
  for (const k of spots) {
    if (sim.guns.some(g => g.cell === k)) continue;
    const r = build(sim, k, 'hv');
    if (r.ok) return 'built';
    if (r.reason === 'pengar' || r.reason === 'fullt') return;
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
  if (obstacleUnlocked('block', sim.research) && !sim.obstacles[BLOCK_CELL] && sim.cash >= OBSTACLES.block.cost + 250) placeObstacle(sim, BLOCK_CELL, 'block');
  const wire = cells => {
    if (!obstacleUnlocked('wire', sim.research)) return;
    for (const c of cells) if (!sim.obstacles[c] && sim.cash >= OBSTACLES.wire.cost) placeObstacle(sim, c, 'wire');
  };
  if (!WIRE_CELLS.some(c => sim.obstacles[c]?.type === 'wire')) wire(WIRE_CELLS.filter(c => !sim.obstacles[c]).slice(0, 1));
  while (buildOne());
  wire(WIRE_CELLS);
  if (grenadeStats(sim.research) && sim.guns.filter(g => g.weapon.kit).length < MAX_KITS && sim.cash >= GRENADE_KIT.cost + OBSTACLES.wire.cost) {
    const g = spots.map(k => sim.guns.find(x => x.cell === k)).find(x => x && !x.weapon.kit);
    if (g) buyKit(sim, g.id);
  }
  upgradeAll(sim);
}

// Minimal policy: en M249 i given ruta, sedan ingenting.
function minimalBuild(sim, spot) {
  if (!sim.guns.length) build(sim, spot, 'm249');
}
// Platser för minimal-policyn på E4 (världskoordinater): där en förstagångsspelare gärna ställer
// sin första pjäs. A: tätt intill vägen mitt på sträckan, B: snett framför basen, C: långt från
// vägen bakom basen. Ingen av dem är den bästa platsen.
export const MINIMAL_SPOTS = { A: [4, 6], B: [-6, -8], C: [-16, 9] };
const spotKey = (map, [x, z]) => placementFor(map).keyAt(x, z);

// Spelar en dag. Returnerar resultat plus kassa och bas efter varje våg, och hur basen föll:
// firstHit = simtid då basen först tog skada, fallTime = tid från första skadan till 0.
export function playDay(progress, day, policy = 'greedy', { seedOffset = 0, slot = 'A', onSecond = null, early: allowEarly = true } = {}) {
  const cfg = startConfig(progress, day);
  const sim = createSim({ ...cfg, seed: cfg.seed + seedOffset });
  const think = policy === 'greedy' ? (spots => () => greedyBuild(sim, spots))(e4Plan().spots)
    : policy === 'minimal' ? () => minimalBuild(sim, spotKey(cfg.map, MINIMAL_SPOTS[slot] ?? slot))
    : (() => { throw new Error('okänd policy ' + policy); })();
  const early = allowEarly && policy === 'greedy';
  return runDay(sim, think, early, onSecond);
}

// Dagens slinga, gemensam för båda banorna: policyn tänker före varje våg och en gång per
// simulerad sekund under vågen, och kallar nästa våg tidigt när försvaret har det bekvämt.
// peak: flest levande zombier samtidigt.
function runDay(sim, think, early, onSecond = null, maxTicks = MAX_TICKS, trackSquads = false) {
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
    won: sim.phase === 'won', intelEarned: sim.intelEarned, baseHp: Math.max(0, sim.baseHp), waves: sim.waveIndex,
    waveLog: waves, bonus, grenades: thrown, blastKills, firstHit, firstShot, fallTime: sim.phase === 'lost' && firstHit != null ? sim.time - firstHit : null, time: sim.time,
    ...(sim.map.grid ? { peak, sim } : {}),
    ...(trackSquads ? { squads, squadHits, squadDown } : {}),
  };
}

// Forskning mellan dagarna: köper i RESEARCH_ORDER och sparar till nästa i ordningen, stannar vid
// första som inte går att köpa än. Den n:te förekomsten av en nod i listan betyder nivå n.
export function buyInOrder(progress, order = RESEARCH_ORDER) {
  const seen = {};
  for (const id of order) {
    const want = (seen[id] = (seen[id] || 0) + 1);
    if (progress.research.includes(`${id}.${want}`)) continue;
    const c = canBuyResearch(progress, id);
    if (c.reason === 'redan') continue;
    if (!c.ok) break;
    progress = buyResearch(progress, id);
  }
  return progress;
}

export function campaign(policy = 'greedy', maxAttempts = 6, { seedOffset = 0 } = {}) {
  return runCampaign(policy, maxAttempts, { seedOffset }).log;
}
// Som campaign, men returnerar även framsteget efter sista dagen (forskning och poäng kvar).
export function runCampaign(policy = 'greedy', maxAttempts = 6, { seedOffset = 0 } = {}) {
  let progress = newProgress();
  const log = [];
  for (let day = 1; ; day++) {
    if (!startConfig(progress, day)) break;
    let won = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const research = [...progress.research];
      const r = playDay(progress, day, policy, { seedOffset });
      progress = dayResult(progress, { day, won: r.won, intelEarned: r.intelEarned });
      // Sparar till nästa i ordningen: stannar vid första som inte går att köpa än.
      // Den n:te förekomsten av en nod i listan betyder nivå n.
      progress = buyInOrder(progress);
      log.push({ day, attempt, won: r.won, intel: r.intelEarned, baseHp: r.baseHp, waves: r.waves, bonus: r.bonus,
        waveLog: r.waveLog, fallTime: r.fallTime, had: research, research: [...progress.research] });
      if (r.won) { won = true; break; }
    }
    if (!won) break; // dagen klarades aldrig: kampanjen stannar här
  }
  return { log, progress };
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
    keep.slice(0, 4).forEach(i => { const n = [...cp.sees[i]].filter(c => on.has(c)).length; if (n > bestN) { bestN = n; openerGun = cp.spots[i]; } });
    if (bestN < 4) {
      const oc = coveragePlan(map, op.cells.map((c, i) => [c, 1 + i / op.cells.length]), { range: PLAN_RANGE, count: 1, decay: GN_DECAY, cacheKey: key + '|opener' });
      openerGun = oc.spots[0] ?? null;
    }
    plan_openerSees = bestN;
  }
  const plan = { lines, guns, wire, squads, roofs: roofs.spots, roofCov: roofs.cover, roofFacing: roofs.facings, len: ps.map(p => p.cells.length), cov: keep.map(i => cp.cover[i]), ...(openerGun != null ? { openerGun, openerSees: plan_openerSees } : {}) };
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
  if (sim.guns.length < 1) buildOne();
  lay(plan.lines.slice(0, 1), 'block');
  if (sim.guns.length < 2) buildOne();
  lay(plan.lines, 'block');
  lay(plan.wire.slice(0, 1), 'wire');
  buySquad(sim, plan.squads);
  // 0.8.0: Psg 90 på taken som ser den tvingade vägen, sedan en Ak 5, sedan fler vapen på marken.
  // Pengarna sparas till dem: inga fler pjäser på marken förrän taken är bemannade.
  let saving = false;
  if (weaponUnlocked('psg90', sim.research, sim.map)) {
    for (const k of plan.roofs.slice(0, maxRoofs)) {
      if (sim.guns.some(g => g.cell === k)) continue;
      const r = build(sim, k, 'psg90', { facing: plan.roofFacing?.[plan.roofs.indexOf(k)] });
      if (!r.ok) { saving = r.reason === 'pengar'; break; }
    }
  }
  if (!saving && weaponUnlocked('ak5', sim.research, sim.map) && sim.guns.filter(g => g.weapon.type === 'ak5').length < GN_AK5) {
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
  if (og && !og.move && sim.wavesStarted >= 2 && !sim.spawnQueue.some(q => q.spawn === 'sigW') && !sim.zombies.some(z => !z.dead && z.spawn === 'sigW')) {
    const to = [...plan.guns].reverse().find(k => !sim.guns.some(g => g.cell === k) && checkMove(sim, og.id, k).ok);
    // naive (läser inte kartan) säljer som förut; smart flyttar
    if (to != null && sim.policy === 'smart') moveGun(sim, og.id, to); else sell(sim, og.id);
  }
  lay(plan.lines, 'block');
  let saving = false;
  if (weaponUnlocked('psg90', sim.research, sim.map)) {
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
  if (weaponUnlocked('ak5', sim.research, sim.map) && sim.guns.filter(g => g.weapon.type === 'ak5').length < GN_AK5) buildNext(sim, plan.guns, 'ak5');
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

// Spelar en Gnesta-dag med policyn smart eller naive. progress: framsteget med forskningen.
export function playGnestaDay(progress, day, policy = 'smart', { seedOffset = 0, onSecond = null, plan: given = null, kits = true } = {}) {
  return playTownDay(progress, day, policy, { seedOffset, onSecond, plan: given, kits, mapId: 'gnesta' });
}
// En dag på Gnesta eller Gnesta Norr. TOWN[mapId] säger hur policyn läser kartan.
function playTownDay(progress, day, policy, { seedOffset = 0, onSecond = null, plan: given = null, kits = true, mapId, hv = false }) {
  const T = TOWN[mapId];
  if (policy !== 'smart' && policy !== 'naive') throw new Error('okänd policy ' + policy);
  const cfg = startConfig(progress, day, mapId);
  const sim = createSim({ ...cfg, seed: cfg.seed + seedOffset });
  sim.policy = policy;
  // hv (Gnesta Norr): spelaren som köper Hemvärnet varje dag (HV_NORR), i stället för banans policy
  if (hv) sim.hvPolicy = HV_NORR;
  const plan = given ?? gnestaPlan(cfg.map, daySpawns(cfg.map, day), cfg.research, { ...T.planOpts(day, policy), blocks: policy === 'smart' ? T.blocks(day) : [] });
  const buildFn = T.build ?? gnestaBuild;
  const r = runDay(sim, () => buildFn(sim, plan, kits ? T.kits[day] : 0, T.roofsDay[day]), true, onSecond, T.maxTicks, mapId !== 'gnesta');
  const { sim: _s, ...rest } = r;
  return { ...rest, plan, barricades: Object.values(_s.obstacles).filter(o => o.type === 'block').length };
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
export const TOWN = {
  gnesta: { blocks: () => SMART_BLOCKS, planOpts: () => ({}), kits: GN_KITS, roofsDay: GN_ROOFS_DAY, maxTicks: MAX_TICKS },
  'gnesta-norr': {
    blocks: day => (day >= 5 ? [...NORR_BLOCKS, ...SMART_BLOCKS] : NORR_BLOCKS),
    // smart läser kartan (dödszonen, radhustaken, tegelmurarna); naive ställer allt efter sin egen väg
    planOpts: (day, policy) => (policy === 'smart' ? { roofs: 3, roofFirst: NORR_ROW_ROOFS, squadNear: 1, near: 0, focus: NORR_FOCUS, squadFocus: NORR_FOCUS, lastLine: 0.25, opener: 'sigW' }
      : { roofs: 3, near: 0, lastLine: 0.25, opener: 'sigW' }),
    kits: [0, 1, 1, 2, 3, 3], roofsDay: [0, 1, 2, 2, 2, 3], maxTicks: 30 * 1500, build: (...a) => norrBuild(...a),
  },
};
// 0.10.1: Norr balanseras mot spelaren som INTE köper Hemvärnet (granskningen av 0.10: gruppen var
// ett sämre köp än pjäserna, och hp-faktorerna var satta för en handikappad spelare). Den som köper
// gruppen varje dag och forskar i den först (hv: true, NORR_HV_ORDER) ska också vinna; det provas för sig.
HV_POLICY['gnesta-norr'] = { days: [], gap: [] };
export const HV_NORR = { days: [1, 2, 3, 4, 5], gap: [] };
export function playNorrDay(progress, day, policy = 'smart', opts = {}) {
  return playTownDay(progress, day, policy, { ...opts, mapId: 'gnesta-norr' });
}
// Gnesta dag 1 till 5 med smart policy efter E4, och framsteget efteråt (Gnesta Norr vald).
export function gnestaFinished(seedOffset = 0) {
  return selectMap(runGnestaCampaign('smart', 6, { seedOffset }).progress, 'gnesta-norr');
}
export function norrCampaign(policy = 'smart', maxAttempts = 6, { seedOffset = 0, start = gnestaFinished(seedOffset), hv = false, days } = {}) {
  return runTownCampaign('gnesta-norr', policy, maxAttempts, { seedOffset, start, hv, order: hv ? NORR_HV_ORDER : RESEARCH_ORDER, days }).log;
}
// En ny spelare på en stadsbana (?debug&fresh): ingen forskning alls, FRESH_ORDER mellan försöken.
// days: hur många dagar som spelas.
export function freshCampaign(mapId, policy = 'smart', maxAttempts = 6, { seedOffset = 0, days = 1 } = {}) {
  return runTownCampaign(mapId, policy, maxAttempts, { seedOffset, start: selectMap(newProgress(), mapId), order: FRESH_ORDER, days }).log;
}

// ?debug-tabellen för Gnesta Norr (0.10.2, src/data/arrival.js). Förut var den forskningen smart
// policy slutar Gnesta med (23 nivåer, alla vapen, 6 platser), och speltestet av 0.10.1 fann banan
// för lätt med den. Nu: en spelare som vinner varje dag på första försöket, utan förlusternas
// forskning, och köper i RESEARCH_ORDER: forskningen från de vunna försöken på E4 (girig) och
// Gnesta (smart), köpt i ordning från noll.
export function norrArrival(seedOffset = 0) {
  const e4 = runCampaign('greedy', 6, { seedOffset }).log;
  const gn = runGnestaCampaign('smart', 6, { seedOffset }).log;
  const intel = [...e4, ...gn].filter(r => r.won).reduce((a, r) => a + r.intel, 0);
  return buyInOrder({ ...newProgress(), intel }).research;
}

// Spelarens framsteg när E4 är klar med girig policy: forskningen och poängen som blev över.
export function e4Finished(seedOffset = 0) {
  return selectMap(runCampaign('greedy', 6, { seedOffset }).progress, 'gnesta');
}

// Gnesta dag 1 till 5 efter E4. Forskning köps mellan dagarna som på E4.
export function gnestaCampaign(policy = 'smart', maxAttempts = 6, { seedOffset = 0, start = e4Finished(seedOffset), days } = {}) {
  return runGnestaCampaign(policy, maxAttempts, { seedOffset, start, days }).log;
}
export function runGnestaCampaign(policy = 'smart', maxAttempts = 6, { seedOffset = 0, start = e4Finished(seedOffset), days } = {}) {
  return runTownCampaign('gnesta', policy, maxAttempts, { seedOffset, start, days });
}
function runTownCampaign(mapId, policy, maxAttempts, { seedOffset, start, hv = false, order = RESEARCH_ORDER, days = MAPS[mapId].days.length }) {
  days ??= MAPS[mapId].days.length;
  let progress = start;
  const log = [];
  for (let day = 1; day <= days; day++) {
    let won = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const before = progress;
      const r = playTownDay(progress, day, policy, { seedOffset, mapId, hv });
      progress = buyInOrder(dayResult(progress, { day, won: r.won, intelEarned: r.intelEarned, mapId }), order);
      log.push({ day, attempt, won: r.won, intel: r.intelEarned, baseHp: r.baseHp, waves: r.waves, bonus: r.bonus, peak: r.peak,
        grenades: r.grenades, waveLog: r.waveLog, fallTime: r.fallTime, firstHit: r.firstHit, firstShot: r.firstShot, time: r.time, barricades: r.barricades,
        ...(mapId === 'gnesta' ? {} : { squads: r.squads, squadHits: r.squadHits, squadDown: r.squadDown }),
        before, had: [...before.research], research: [...progress.research] });
      if (r.won) { won = true; break; }
    }
    if (!won) break;
  }
  return { log, progress };
}

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pl = placementFor(MAPS.riksvagen), ep = e4Plan();
  console.log('E4-planen (ruta: mitt, synliga vägrutor): ' + ep.spots.map((k, i) => { const c = pl.center(k); return `${c.x},${c.z}:${ep.cover[i]}`; }).join('  '));
  console.log('dag försök vann bas forskning bonus  bas/kassa efter våg 1, 2, 3       fall  hade');
  for (const r of campaign('greedy', 6)) {
    const wl = r.waveLog.map(w => `${String(w.baseHp).padStart(2)}/${String(w.cash).padStart(4)}`).join('  ');
    const fall = r.fallTime == null ? '   -' : `${r.fallTime.toFixed(0).padStart(3)}s`;
    console.log(`${r.day}   ${r.attempt}      ${r.won ? 'ja ' : 'nej'}  ${String(r.baseHp).padStart(2)}  ${String(r.intel).padStart(3)}        ${String(r.bonus).padStart(4)}  ${wl.padEnd(30)}  ${fall}  ${r.had.join(',') || '-'}`);
  }
  const mins = ['A', 'B', 'C'].map(s => `${s} ${playDay(newProgress(), 1, 'minimal', { slot: s }).baseHp}`);
  console.log('minimal dag 1 (en M249), bas kvar per position: ' + mins.join(', '));
  const seeds = [0, 1, 2, 3, 4, 5, 6, 7].map(o => campaign('greedy', 6, { seedOffset: o * 7919 }))
    .map(log => [1, 2, 3].map(d => { const t = log.filter(r => r.day === d); const i = t.findIndex(r => r.won); return i < 0 ? 'x' : i + 1; }).join('/'));
  console.log('seed-offsets, försök till vinst dag 1/2/3: ' + seeds.join('  '));
  for (const d of [1, 2, 3]) {
    const gp = gnestaPlan(gnesta, daySpawns(gnesta, d)), gpl = placementFor(gnesta);
    console.log(`Gnesta dag ${d} smart plan: ` + gp.guns.map((k, i) => { const c = gpl.center(k); return `${c.x},${c.z}:${gp.cov[i]}`; }).join('  '));
  }
  console.log('Gnesta efter E4 (smart: försök till vinst/bas kvar, flest levande; naive: dagens första försök med samma forskning)');
  for (const o of [0, 1, 2, 3, 4]) {
    const log = gnestaCampaign('smart', 6, { seedOffset: o * 7919 });
    const cells = [1, 2, 3, 4, 5].map(d => {
      const t = log.filter(r => r.day === d);
      if (!t.length) return `d${d} -`;
      const w = t.find(r => r.won);
      const n = playGnestaDay(t[0].before, d, 'naive', { seedOffset: o * 7919 });
      return `d${d} ${w ? `${t.indexOf(w) + 1}/${String(w.baseHp).padStart(2)}` : ' x/ 0'} p${String(Math.max(...t.map(r => r.peak))).padStart(3)} naive ${n.won ? `vann ${String(n.baseHp).padStart(2)}` : 'förlust'}`;
    });
    console.log(`  seed ${o}: ${cells.join(' | ')}`);
  }
  console.log('Gnesta Norr efter Gnesta (smart: försök till vinst/bas kvar, flest levande, Hemvärnets träffar; naive: dagens första försök med samma forskning)');
  for (const o of [0, 1, 2, 3, 4]) {
    const log = norrCampaign('smart', 6, { seedOffset: o * 7919 });
    const cells = [1, 2, 3, 4, 5].map(d => {
      const t = log.filter(r => r.day === d);
      if (!t.length) return `d${d} -`;
      const w = t.find(r => r.won);
      const n = playNorrDay(t[0].before, d, 'naive', { seedOffset: o * 7919 });
      return `d${d} ${w ? `${t.indexOf(w) + 1}/${String(w.baseHp).padStart(2)}` : ' x/ 0'} p${String(Math.max(...t.map(r => r.peak))).padStart(3)} hv${t.at(-1).squadHits} naive ${n.won ? `vann ${String(n.baseHp).padStart(2)}` : 'förlust'}`;
    });
    console.log(`  seed ${o}: ${cells.join(' | ')}`);
  }
  const gs = gnestaSmoke({ check: true });
  console.log(`Gnesta rök (3 vandrare per ingång, tom karta): ${gs.phase}, ${gs.time.toFixed(0)} s, utanför gatan ${gs.offRoad}`);
  for (const [id, a] of Object.entries(gs.arrivals)) console.log(`  ${id.padEnd(7)} framme ${a.count}/3, första ${a.first?.toFixed(1)} s, sista ${a.last?.toFixed(1)} s`);
}
