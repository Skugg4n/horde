// Balanssimulering: spelar kampanjen headless med deterministiska policyer.
//   greedy  : en människa som spenderar pengar när de kommer in, även mitt i vågen (koll varje sekund).
//   strong  : som greedy, men ställer pjäserna där de täcker mest väg (C, B, D, A i stället för A, B, C, D).
//   minimal : bara det dag 1 ber om, en M249 på en position, inget mer.
import { fileURLToPath } from 'node:url';
import { createSim, startWave, step, build, upgrade, placeObstacle } from '../src/sim/sim.js';
import { weaponUnlocked, obstacleUnlocked, upgradeCost } from '../src/sim/stats.js';
import { WEAPONS } from '../src/data/weapons.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { newProgress, startConfig, dayResult, canBuyResearch, buyResearch } from '../src/meta/progress.js';

const DT = 1 / 30;
const THINK_EVERY = 30;          // steg mellan policyns beslut under en våg (1 s simtid)
const RESEARCH_ORDER = ['m2', 'wireTough', 'budget', 'block', 'm249Rate', 'slot4'];
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
// 5. Uppgraderingar, billigaste först.
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
export function playDay(progress, day, policy = 'greedy', { seedOffset = 0, slot = 'A', onSecond = null } = {}) {
  const cfg = startConfig(progress, day);
  const sim = createSim({ ...cfg, seed: cfg.seed + seedOffset });
  const think = ORDER[policy] ? () => greedyBuild(sim, ORDER[policy])
    : policy === 'minimal' ? () => minimalBuild(sim, slot)
    : (() => { throw new Error('okänd policy ' + policy); })();
  const waves = [];
  let ticks = 0, firstHit = null, waveIdx = 0;
  while (sim.phase !== 'won' && sim.phase !== 'lost' && ticks < MAX_TICKS) {
    if (sim.phase === 'build') { think(); startWave(sim); }
    else if (ticks % THINK_EVERY === 0) think();
    step(sim, DT); ticks++;
    if (onSecond && ticks % 30 === 0) onSecond(sim);
    if (firstHit == null && sim.baseHp < sim.map.baseHp) firstHit = sim.time;
    if (sim.waveIndex > waveIdx || sim.phase === 'lost' || sim.phase === 'won') {
      if (sim.waveIndex > waveIdx || sim.phase === 'lost') waves.push({ cash: sim.cash, baseHp: Math.max(0, sim.baseHp) });
      waveIdx = sim.waveIndex;
    }
  }
  return {
    won: sim.phase === 'won', intelEarned: sim.intelEarned, baseHp: Math.max(0, sim.baseHp), waves: sim.waveIndex,
    waveLog: waves, firstHit, fallTime: sim.phase === 'lost' && firstHit != null ? sim.time - firstHit : null, time: sim.time,
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
      for (const id of RESEARCH_ORDER) {
        if (progress.research.includes(id)) continue;
        if (!canBuyResearch(progress, id).ok) break;
        progress = buyResearch(progress, id);
      }
      log.push({ day, attempt, won: r.won, intel: r.intelEarned, baseHp: r.baseHp, waves: r.waves,
        waveLog: r.waveLog, fallTime: r.fallTime, had: research, research: [...progress.research] });
      if (r.won) { won = true; break; }
    }
    if (!won) break; // dagen klarades aldrig: kampanjen stannar här
  }
  return log;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('dag försök vann bas forskning  bas/kassa efter våg 1, 2, 3       fall  hade');
  for (const r of campaign('greedy', 6)) {
    const wl = r.waveLog.map(w => `${String(w.baseHp).padStart(2)}/${String(w.cash).padStart(4)}`).join('  ');
    const fall = r.fallTime == null ? '   -' : `${r.fallTime.toFixed(0).padStart(3)}s`;
    console.log(`${r.day}   ${r.attempt}      ${r.won ? 'ja ' : 'nej'}  ${String(r.baseHp).padStart(2)}  ${String(r.intel).padStart(3)}        ${wl.padEnd(30)}  ${fall}  ${r.had.join(',') || '-'}`);
  }
  const mins = ['A', 'B', 'C'].map(s => `${s} ${playDay(newProgress(), 1, 'minimal', { slot: s }).baseHp}`);
  console.log('minimal dag 1 (en M249), bas kvar per position: ' + mins.join(', '));
  const seeds = [0, 1, 2, 3, 4, 5, 6, 7].map(o => campaign('greedy', 6, { seedOffset: o * 7919 }))
    .map(log => [1, 2, 3].map(d => { const t = log.filter(r => r.day === d); const i = t.findIndex(r => r.won); return i < 0 ? 'x' : i + 1; }).join('/'));
  console.log('seed-offsets, försök till vinst dag 1/2/3: ' + seeds.join('  '));
}
