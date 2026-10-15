// Balanssimulering: spelar kampanjen headless med deterministiska policyer.
//   greedy  : en människa som spenderar pengar när de kommer in, även mitt i vågen (koll varje sekund).
//             Pjäserna ställs där de ser mest av hordens väg (coveragePlan).
//   minimal : bara det dag 1 ber om, en M249 på en given plats, inget mer.
// greedy kallar nästa våg tidigt (bonus) när försvaret har det bekvämt: basen hel och ingen
// levande zombie förbi halva vägen, och mitt i en våg dessutom när allt i vågen har kommit och
// högst tre lever. Annars väntar den ut nedräkningen. minimal väntar alltid ut den.
import { fileURLToPath } from 'node:url';
import { createSim, startWave, step, build, upgrade, placeObstacle, placeAcross, acrossCells, buyKit, callNextWave, hasNextWave } from '../src/sim/sim.js';
import { weaponUnlocked, obstacleUnlocked, upgradeCost, grenadeStats, maxGuns } from '../src/sim/stats.js';
import { placementFor, lineOfSight, distRect, KIND, MIN_SPACING, ROOF_DEAD } from '../src/sim/placement.js';
import { WEAPONS, GRENADE_KIT } from '../src/data/weapons.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { newProgress, startConfig, dayResult, canBuyResearch, buyResearch, selectMap } from '../src/meta/progress.js';
import { MAPS } from '../src/data/maps.js';
import { gnesta } from '../src/data/gnesta.js';

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
      if (Math.hypot(q.x - at.x, q.z - at.z) <= reach && lineOfSight(p, c, t)) sees.push(t);
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
  if (sim.guns.length >= maxGuns(sim.research)) return false;
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
  const opts = GROUND.map(id => WEAPONS[id]).filter(w => weaponUnlocked(w.id, sim.research));
  const heavy = opts.find(w => w.id === 'm2');
  if (heavy && sim.cash >= heavy.cost) return heavy.id;
  if (opts.some(w => w.id === 'ksp58')) return 'ksp58';
  return opts.sort((a, b) => a.cost - b.cost)[0].id;
};
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
function runDay(sim, think, early, onSecond = null) {
  const comfortable = () => sim.baseHp >= sim.map.baseHp && sim.zombies.every(z => z.dead || sim.route.fraction(z) < 0.5);
  let bonus = 0, thrown = 0, blastKills = 0, blastNow = false;
  const waves = [];
  let ticks = 0, firstHit = null, waveIdx = 0, peak = 0;
  while (sim.phase !== 'won' && sim.phase !== 'lost' && ticks < MAX_TICKS) {
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
    }
    blastNow = false;
    if (onSecond && ticks % 30 === 0) onSecond(sim);
    if (ticks % 15 === 0) { let n = 0; for (const z of sim.zombies) if (!z.dead) n++; if (n > peak) peak = n; }
    if (firstHit == null && sim.baseHp < sim.map.baseHp) firstHit = sim.time;
    if (sim.waveIndex > waveIdx || sim.phase === 'lost' || sim.phase === 'won') {
      if (sim.waveIndex > waveIdx || sim.phase === 'lost') waves.push({ cash: sim.cash, baseHp: Math.max(0, sim.baseHp) });
      waveIdx = sim.waveIndex;
    }
  }
  return {
    won: sim.phase === 'won', intelEarned: sim.intelEarned, baseHp: Math.max(0, sim.baseHp), waves: sim.waveIndex,
    waveLog: waves, bonus, grenades: thrown, blastKills, firstHit, fallTime: sim.phase === 'lost' && firstHit != null ? sim.time - firstHit : null, time: sim.time,
    ...(sim.map.grid ? { peak, sim } : {}),
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
export function gnestaPlan(map, ids, research = [], { blocks = SMART_BLOCKS } = {}) {
  void research;
  const key = JSON.stringify([map.id, ids, blocks]);
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
  const weighted = ps.flatMap(p => p.cells.map((c, i) => [c, 1 + GN_NEAR * i / Math.max(1, p.cells.length - 1)]));
  const cp = coveragePlan(map, weighted, { range: PLAN_RANGE, count: 8, decay: GN_DECAY, cacheKey: key });
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
  const roofs = roofPlan(map, weighted, { count: GN_ROOFS });
  const plan = { lines, guns, wire, roofs: roofs.spots, roofCov: roofs.cover, len: ps.map(p => p.cells.length), cov: keep.map(i => cp.cover[i]) };
  planCache.set(key, plan);
  return plan;
}

// Taken för Psg 90 (0.8.0): som coveragePlan, men kandidaterna är takrutor och sikten är takets
// (allt inom räckvidd utom närmast det egna huset, placement.js ROOF_DEAD). Minst MIN_SPACING
// mellan skyttarna, lika: lägst rutnyckel. Deterministiskt.
export function roofPlan(map, route, { range = ROOF_RANGE, count = GN_ROOFS, decay = GN_DECAY } = {}) {
  const p = placementFor(map);
  if (!p.roof) return { spots: [], cover: [] };
  const weight = new Map();
  for (const it of route) { const [k, wt] = typeof it === 'number' ? [it, 1] : it; weight.set(k, (weight.get(k) || 0) + wt); }
  const targets = [...weight.keys()].sort((a, b) => a - b);
  const reach = range + p.size * 0.7072, cands = [];
  for (let c = 0; c < p.n; c++) {
    if (!(p.roof[c] > 0)) continue;
    const at = p.center(c), own = p.buildings[p.bldg[c] - 1], sees = [];
    for (const t of targets) {
      const q = p.center(t);
      if (Math.hypot(q.x - at.x, q.z - at.z) <= reach && !own.some(r => distRect(r, q.x, q.z) < ROOF_DEAD)) sees.push(t);
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
  return { spots: picked.map(q => q.c), cover: picked.map(q => q.sees.length) };
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
  // 0.8.0: Psg 90 på taken som ser den tvingade vägen, sedan en Ak 5, sedan fler vapen på marken.
  // Pengarna sparas till dem: inga fler pjäser på marken förrän taken är bemannade.
  let saving = false;
  if (weaponUnlocked('psg90', sim.research)) {
    for (const k of plan.roofs.slice(0, maxRoofs)) {
      if (sim.guns.some(g => g.cell === k)) continue;
      const r = build(sim, k, 'psg90');
      if (!r.ok) { saving = r.reason === 'pengar'; break; }
    }
  }
  if (!saving && weaponUnlocked('ak5', sim.research) && sim.guns.filter(g => g.weapon.type === 'ak5').length < GN_AK5) {
    if (!buildNext(sim, plan.guns, 'ak5') && sim.cash < WEAPONS.ak5.cost && sim.guns.length < sim.maxGuns) saving = true;
  }
  if (!saving) while (buildOne());
  lay(plan.wire, 'wire');
  // Granatlådorna väntar också medan policyn sparar till taken.
  const kits = sim.guns.filter(g => g.weapon.kit).length;
  if (!saving && grenadeStats(sim.research) && sim.waveIndex >= GN_KIT_FROM_WAVE && kits < maxKits && sim.cash >= GRENADE_KIT.cost + OBSTACLES.wire.cost) {
    const g = plan.guns.map(k => sim.guns.find(x => x.cell === k)).find(x => x && !x.weapon.kit);
    if (g) buyKit(sim, g.id);
  }
  upgradeAll(sim);
}

// Spelar en Gnesta-dag med policyn smart eller naive. progress: framsteget med forskningen.
export function playGnestaDay(progress, day, policy = 'smart', { seedOffset = 0, onSecond = null, plan: given = null, kits = true } = {}) {
  if (policy !== 'smart' && policy !== 'naive') throw new Error('okänd policy ' + policy);
  const cfg = startConfig(progress, day, 'gnesta');
  const sim = createSim({ ...cfg, seed: cfg.seed + seedOffset });
  const plan = given ?? gnestaPlan(cfg.map, daySpawns(cfg.map, day), cfg.research, { blocks: policy === 'smart' ? SMART_BLOCKS : [] });
  const r = runDay(sim, () => gnestaBuild(sim, plan, kits ? GN_KITS[day] : 0, GN_ROOFS_DAY[day]), true, onSecond);
  const { sim: _s, ...rest } = r;
  return { ...rest, plan, barricades: Object.values(_s.obstacles).filter(o => o.type === 'block').length };
}

// Spelarens framsteg när E4 är klar med girig policy: forskningen och poängen som blev över.
export function e4Finished(seedOffset = 0) {
  return selectMap(runCampaign('greedy', 6, { seedOffset }).progress, 'gnesta');
}

// Gnesta dag 1 till 5 efter E4. Forskning köps mellan dagarna som på E4.
export function gnestaCampaign(policy = 'smart', maxAttempts = 6, { seedOffset = 0, start = e4Finished(seedOffset) } = {}) {
  let progress = start;
  const log = [];
  for (let day = 1; day <= gnesta.days.length; day++) {
    let won = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const before = progress;
      const r = playGnestaDay(progress, day, policy, { seedOffset });
      progress = buyInOrder(dayResult(progress, { day, won: r.won, intelEarned: r.intelEarned, mapId: 'gnesta' }));
      log.push({ day, attempt, won: r.won, intel: r.intelEarned, baseHp: r.baseHp, waves: r.waves, bonus: r.bonus, peak: r.peak,
        grenades: r.grenades, waveLog: r.waveLog, fallTime: r.fallTime, firstHit: r.firstHit, time: r.time, barricades: r.barricades,
        before, had: [...before.research], research: [...progress.research] });
      if (r.won) { won = true; break; }
    }
    if (!won) break;
  }
  return log;
}

// Gnesta, rök-körning: en trivial våg, tre vandrare från varje spawn, inga vapen eller hinder.
// Inga balansmål än; den visar att horden hittar fram och hur lång tid det tar per ingång.
// check: kontrollera varje steg att varje zombie står på en gångbar ruta.
export function gnestaSmoke({ check = false, seed = 1 } = {}) {
  const groups = gnesta.spawns.map((s, i) => ({ type: 'walker', count: 3, interval: 2, delay: i * 0.5, spawn: s.id }));
  const map = { ...gnesta, baseHp: 99, days: [{ n: 1, startCash: 0, waves: [{ groups }] }] };
  const sim = createSim({ map, day: 1, cash: 0, seed });
  const g = sim.route.grid;
  const arrivals = Object.fromEntries(gnesta.spawns.map(s => [s.id, { count: 0, first: null, last: null }]));
  let offRoad = 0;
  const from = new Map();      // zombie-id -> spawn (framme-zombier tas bort i samma steg)
  startWave(sim);
  while (sim.phase === 'wave' && sim.time < 600) {
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
  const gs = gnestaSmoke({ check: true });
  console.log(`Gnesta rök (3 vandrare per ingång, tom karta): ${gs.phase}, ${gs.time.toFixed(0)} s, utanför gatan ${gs.offRoad}`);
  for (const [id, a] of Object.entries(gs.arrivals)) console.log(`  ${id.padEnd(7)} framme ${a.count}/3, första ${a.first?.toFixed(1)} s, sista ${a.last?.toFixed(1)} s`);
}
