// Balanssimulering: spelar kampanjen headless med deterministiska policyer.
//   greedy  : en människa som spenderar pengar när de kommer in, även mitt i vågen (koll varje sekund).
//   strong  : som greedy, men ställer pjäserna där de täcker mest väg (C, B, D, A i stället för A, B, C, D).
//   minimal : bara det dag 1 ber om, en M249 på en position, inget mer.
// greedy och strong kallar nästa våg tidigt (bonus) när försvaret har det bekvämt: basen hel och
// ingen levande zombie förbi halva vägen, och mitt i en våg dessutom när allt i vågen har kommit
// och högst tre lever.
// Annars väntar de ut nedräkningen. minimal väntar alltid ut den.
import { fileURLToPath } from 'node:url';
import { createSim, startWave, step, build, upgrade, placeObstacle, buyKit, callNextWave, hasNextWave } from '../src/sim/sim.js';
import { weaponUnlocked, obstacleUnlocked, upgradeCost, grenadeStats } from '../src/sim/stats.js';
import { WEAPONS, GRENADE_KIT } from '../src/data/weapons.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { newProgress, startConfig, dayResult, canBuyResearch, buyResearch } from '../src/meta/progress.js';

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
  const comfortable = () => sim.baseHp >= sim.map.baseHp && sim.zombies.every(z => z.dead || z.d < sim.len / 2);
  let bonus = 0, thrown = 0, blastKills = 0, blastNow = false;
  const waves = [];
  let ticks = 0, firstHit = null, waveIdx = 0;
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
    if (firstHit == null && sim.baseHp < sim.map.baseHp) firstHit = sim.time;
    if (sim.waveIndex > waveIdx || sim.phase === 'lost' || sim.phase === 'won') {
      if (sim.waveIndex > waveIdx || sim.phase === 'lost') waves.push({ cash: sim.cash, baseHp: Math.max(0, sim.baseHp) });
      waveIdx = sim.waveIndex;
    }
  }
  return {
    won: sim.phase === 'won', intelEarned: sim.intelEarned, baseHp: Math.max(0, sim.baseHp), waves: sim.waveIndex,
    waveLog: waves, bonus, grenades: thrown, blastKills, firstHit, fallTime: sim.phase === 'lost' && firstHit != null ? sim.time - firstHit : null, time: sim.time,
  };
}

export function campaign(policy = 'greedy', maxAttempts = 6, { seedOffset = 0 } = {}) {
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
      const seen = {};
      for (const id of RESEARCH_ORDER) {
        const want = (seen[id] = (seen[id] || 0) + 1);
        if (progress.research.includes(`${id}.${want}`)) continue;
        const c = canBuyResearch(progress, id);
        if (c.reason === 'redan') continue;
        if (!c.ok) break;
        progress = buyResearch(progress, id);
      }
      log.push({ day, attempt, won: r.won, intel: r.intelEarned, baseHp: r.baseHp, waves: r.waves, bonus: r.bonus,
        waveLog: r.waveLog, fallTime: r.fallTime, had: research, research: [...progress.research] });
      if (r.won) { won = true; break; }
    }
    if (!won) break; // dagen klarades aldrig: kampanjen stannar här
  }
  return log;
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
}
