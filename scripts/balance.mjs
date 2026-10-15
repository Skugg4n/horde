// Balanssimulering: spelar kampanjen headless med deterministiska policyer.
//   greedy  : en människa som spenderar pengar när de kommer in, även mitt i vågen (koll varje sekund).
//   strong  : som greedy, men ställer pjäserna där de täcker mest väg (C, B, D, A i stället för A, B, C, D).
//   minimal : bara det dag 1 ber om, en M249 på en position, inget mer.
// greedy och strong kallar nästa våg tidigt (bonus) när försvaret har det bekvämt: basen hel och
// ingen levande zombie förbi halva vägen, och mitt i en våg dessutom när allt i vågen har kommit
// och högst tre lever.
// Annars väntar de ut nedräkningen. minimal väntar alltid ut den.
import { fileURLToPath } from 'node:url';
import { createSim, startWave, step, build, upgrade, placeObstacle, placeAcross, acrossCells, buyKit, callNextWave, hasNextWave } from '../src/sim/sim.js';
import { weaponUnlocked, obstacleUnlocked, upgradeCost, grenadeStats } from '../src/sim/stats.js';
import { WEAPONS, GRENADE_KIT } from '../src/data/weapons.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { newProgress, startConfig, dayResult, canBuyResearch, buyResearch, selectMap } from '../src/meta/progress.js';
import { gnesta } from '../src/data/gnesta.js';

const DT = 1 / 30;
const THINK_EVERY = 30;          // steg mellan policyns beslut under en våg (1 s simtid)
// Nod-id; varje förekomst köper nästa nivå i noden.
const RESEARCH_ORDER = ['m2', 'wireTough', 'budget', 'block', 'grenade', 'm249Rate', 'slot4',
  'm2', 'm249Rate', 'grenade', 'budget', 'block', 'wireTough', 'm2', 'm249Rate', 'grenade', 'budget', 'block'];
const KIT_ORDER = ['C', 'D', 'B', 'A'];   // lådan där pjäsen når mest väg
const MAX_KITS = 1;
const EARLY_ALIVE = 3;            // mitt i en våg kallas nästa bara när högst så många lever              // granatlådor per dag: ett stöd, inte huvudsaken
const WIRE_CELLS = [0, 1, 2];
const BLOCK_CELL = 0;
const MAX_TICKS = 30 * 900;

const ORDER = { greedy: ['A', 'B', 'C', 'D'], strong: ['C', 'B', 'D', 'A'] };
function openSlots(sim, order) {
  return order.map(id => sim.slots.find(s => s.id === id)).filter(s => s && !s.locked && !s.weapon);
}

// Girig policy, i ordning:
// 1. Minst ett vapen (billigaste upplåsta, M2 om den är upplåst och går att köpa).
// 2. Betongblock i ruta 0 (närmast basen, där alla vapen når) om upplåst och råd kvar för ett
//    vapen, sedan en taggtråd i första lediga ruta av 0, 1, 2.
// 3. Fler vapen på första lediga position.
// 4. Taggtråd i resten av rutorna 0, 1, 2 (även ny tråd när den gamla slitits sönder).
// 5. En granatlåda (om forskad) på den pjäs som når mest väg (C, D, B, A), om pengar finns kvar för en tråd.
// 6. Uppgraderingar, billigaste först.
function greedyBuild(sim, order = ORDER.greedy) {
  const wanted = () => {
    const opts = Object.values(WEAPONS).filter(w => weaponUnlocked(w.id, sim.research));
    const heavy = opts.find(w => w.id === 'm2');
    if (heavy && sim.cash >= heavy.cost) return heavy.id;
    return opts.sort((a, b) => a.cost - b.cost)[0].id;
  };
  const buildOne = () => {
    const slot = openSlots(sim, order)[0];
    if (!slot) return false;
    return build(sim, slot.id, wanted()).ok;
  };
  if (!sim.slots.some(s => s.weapon)) buildOne();
  if (obstacleUnlocked('block', sim.research) && !sim.obstacles[BLOCK_CELL] && sim.cash >= OBSTACLES.block.cost + 250) placeObstacle(sim, BLOCK_CELL, 'block');
  const wire = cells => {
    if (!obstacleUnlocked('wire', sim.research)) return;
    for (const c of cells) if (!sim.obstacles[c] && sim.cash >= OBSTACLES.wire.cost) placeObstacle(sim, c, 'wire');
  };
  if (!WIRE_CELLS.some(c => sim.obstacles[c]?.type === 'wire')) wire(WIRE_CELLS.filter(c => !sim.obstacles[c]).slice(0, 1));
  while (buildOne());
  wire(WIRE_CELLS);
  if (grenadeStats(sim.research) && sim.slots.filter(s => s.weapon?.kit).length < MAX_KITS && sim.cash >= GRENADE_KIT.cost + OBSTACLES.wire.cost) {
    const s = KIT_ORDER.map(id => sim.slots.find(x => x.id === id)).find(x => x?.weapon && !x.weapon.kit);
    if (s) buyKit(sim, s.id);
  }
  for (;;) {
    const ups = sim.slots.filter(s => s.weapon && upgradeCost(s.weapon.type, s.weapon.level) != null)
      .sort((a, b) => upgradeCost(a.weapon.type, a.weapon.level) - upgradeCost(b.weapon.type, b.weapon.level));
    if (!ups.length || !upgrade(sim, ups[0].id).ok) break;
  }
}

// Minimal policy: en M249 på given position, sedan ingenting.
function minimalBuild(sim, slotId) {
  if (!sim.slots.some(s => s.weapon)) build(sim, slotId, 'm249');
}

// Spelar en dag. Returnerar resultat plus kassa och bas efter varje våg, och hur basen föll:
// firstHit = simtid då basen först tog skada, fallTime = tid från första skadan till 0.
export function playDay(progress, day, policy = 'greedy', { seedOffset = 0, slot = 'A', onSecond = null, early: allowEarly = true } = {}) {
  const cfg = startConfig(progress, day);
  const sim = createSim({ ...cfg, seed: cfg.seed + seedOffset });
  const think = ORDER[policy] ? () => greedyBuild(sim, ORDER[policy])
    : policy === 'minimal' ? () => minimalBuild(sim, slot)
    : (() => { throw new Error('okänd policy ' + policy); })();
  const early = allowEarly && !!ORDER[policy];
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
// smart : en människa som läser kartan. Hon spärrar Sigtunavägen mellan första och andra
//         stickgatan, så att horden går ett varv runt kvarteret: upp den andra stickgatan, längs
//         cykelvägen och ner den första, förbi positionerna i kvarteret. Hela vägen hålls öppen
//         runt spärren, så ingen barrikad behöver slås sönder. Vapen byggs där de når mest av
//         hordens väg, taggtråd där flest pjäser når, granatlådor när grunden står.
// naive : samma vapen (valda efter sin egen väg), tråd, lådor och uppgraderingar, men aldrig en
//         barrikad. Horden går den kortaste vägen längs Sigtunavägen.
// Vågkall och köp mitt i vågen som greedy på E4 (runDay). Forskning mellan dagarna som på E4.
//
// Under balanspasset jämfördes spärrar valda girigt efter täckning (bästa positionernas rutor inom
// räckhåll) med den här enda spärren. Den giriga valde gärna spärrar längst österut och en på
// norra stigen, som gav längre väg men sämre försvar i simuleringen (dag 2 och 3 förlorades
// oftare). Varvet runt kvarteret närmast basen höll bäst över alla dagar, och det är också den
// spärr designen beskriver.
const SMART_BLOCKS = [[-3, 35]];   // Sigtunavägen mellan stickgata 1 och 2 (x, z i meter)
const PLAN_RANGE = 22;      // M2, pjäsen policyn helst bygger: täckning räknas för dess räckvidd
const PLAN_GUNS = 4;        // taggtråden läggs där flest av de fyra första pjäserna når
const PLAN_WIRE = 3;        // taggtrådsspärrar på hordens väg
const MIN_COVER = 6;        // en position byggs bara om den når minst så många rutor av vägen
const GN_KITS = [0, 1, 1, 2, 3, 3];   // granatlådor per dag (index = dag)
const GN_KIT_FROM_WAVE = 1; // lådorna köps först när första vågen är klar ("senare")

// Ingångarna som dagen använder, i den ordning de dyker upp.
export const daySpawns = (map, day) => [...new Set(map.days[day - 1].waves.flatMap(w => w.groups.map(g => g.spawn)))];

const planCache = new Map();
// Planen för en dag: barrikadernas rutor, vapenpositioner i ordning (flest rutor av hordens väg
// inom räckhåll först) och taggtrådens rutor. Beror bara på banan, ingångarna, upplåsta
// positioner och spärrarna, så den räknas en gång och sparas.
export function gnestaPlan(map, ids, research = [], { blocks = SMART_BLOCKS } = {}) {
  const key = JSON.stringify([map.id, ids, [...research].filter(r => r.startsWith('slot4')), blocks]);
  if (planCache.has(key)) return planCache.get(key);
  const sim = createSim({ map, day: 1, cash: 0, seed: 1, research });
  const route = sim.route, g = route.grid;
  const slots = sim.slots.filter(s => !s.locked);
  const near = new Map();
  const cover = c => {
    if (!near.has(c)) { const [x, z] = g.center(c); near.set(c, slots.filter(s => Math.hypot(x - s.x, z - s.z) <= PLAN_RANGE).map(s => s.id)); }
    return near.get(c);
  };
  const obs = {}, lines = [];
  for (const [x, z] of blocks) {
    const c = route.cellAt(x, z);
    if (c == null) throw new Error(`ingen gata vid ${x}, ${z}`);
    for (const k of route.span(c)) obs[k] = { type: 'block' };
    lines.push(c);
  }
  const ps = route.paths(ids, obs);
  if (ps.some(p => !p.reaches || p.through != null)) throw new Error('planen stänger alla vägar');
  const cov = Object.fromEntries(slots.map(s => [s.id, 0]));
  for (const p of ps) for (const c of p.cells) for (const id of cover(c)) cov[id]++;
  const guns = slots.map(s => s.id).filter(id => cov[id] >= MIN_COVER).sort((a, b) => cov[b] - cov[a] || a.localeCompare(b));
  // Taggtråd: rutorna på vägen som flest planerade pjäser når (lika: närmast basen), en spärr per gata.
  const top = new Set(guns.slice(0, PLAN_GUNS));
  const onPath = [...new Set(ps.flatMap(p => p.cells))].filter(c => route.validCell(c) && !obs[c]);
  const score = c => cover(c).filter(id => top.has(id)).length;
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
  const plan = { lines, guns, wire, len: ps.map(p => p.cells.length), cov };
  planCache.set(key, plan);
  return plan;
}

// Köpordning (en gång före varje våg och varje sekund under vågen): första vapnet, barrikaden,
// andra vapnet, en taggtråd, fler vapen, resten av tråden (även ny när den gamla slitits sönder),
// en granatlåda när första vågen är klar, sedan uppgraderingar, billigaste först.
function gnestaBuild(sim, plan, maxKits) {
  const wanted = () => {
    const opts = Object.values(WEAPONS).filter(w => weaponUnlocked(w.id, sim.research));
    const heavy = opts.find(w => w.id === 'm2');
    if (heavy && sim.cash >= heavy.cost) return heavy.id;
    return opts.sort((a, b) => a.cost - b.cost)[0].id;
  };
  const free = id => { const s = sim.slots.find(x => x.id === id); return s && !s.locked && !s.weapon; };
  const buildOne = () => {
    const id = plan.guns.find(free);
    return id ? build(sim, id, wanted()).ok : false;
  };
  const lay = (cells, type) => {
    for (const c of cells) {
      if (sim.obstacles[c]) continue;
      if (!acrossCells(sim, c).length || sim.cash < OBSTACLES[type].cost) return;
      placeAcross(sim, c, type);
    }
  };
  const built = () => sim.slots.filter(s => s.weapon).length;
  if (built() < 1) buildOne();
  lay(plan.lines.slice(0, 1), 'block');
  if (built() < 2) buildOne();
  lay(plan.lines, 'block');
  lay(plan.wire.slice(0, 1), 'wire');
  while (buildOne());
  lay(plan.wire, 'wire');
  const kits = sim.slots.filter(s => s.weapon?.kit).length;
  if (grenadeStats(sim.research) && sim.waveIndex >= GN_KIT_FROM_WAVE && kits < maxKits && sim.cash >= GRENADE_KIT.cost + OBSTACLES.wire.cost) {
    const s = plan.guns.map(id => sim.slots.find(x => x.id === id)).find(x => x?.weapon && !x.weapon.kit);
    if (s) buyKit(sim, s.id);
  }
  for (;;) {
    const ups = sim.slots.filter(s => s.weapon && upgradeCost(s.weapon.type, s.weapon.level) != null)
      .sort((a, b) => upgradeCost(a.weapon.type, a.weapon.level) - upgradeCost(b.weapon.type, b.weapon.level));
    if (!ups.length || !upgrade(sim, ups[0].id).ok) break;
  }
}

// Spelar en Gnesta-dag med policyn smart eller naive. progress: framsteget med forskningen.
export function playGnestaDay(progress, day, policy = 'smart', { seedOffset = 0, onSecond = null, plan: given = null, kits = true } = {}) {
  if (policy !== 'smart' && policy !== 'naive') throw new Error('okänd policy ' + policy);
  const cfg = startConfig(progress, day, 'gnesta');
  const sim = createSim({ ...cfg, seed: cfg.seed + seedOffset });
  const plan = given ?? gnestaPlan(cfg.map, daySpawns(cfg.map, day), cfg.research, { blocks: policy === 'smart' ? SMART_BLOCKS : [] });
  const r = runDay(sim, () => gnestaBuild(sim, plan, kits ? GN_KITS[day] : 0), true, onSecond);
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
  const map = { ...gnesta, baseHp: 99, slots: [], days: [{ n: 1, startCash: 0, waves: [{ groups }] }] };
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
