// Balanssimulering: spelar kampanjen headless med en deterministisk girig policy.
import { fileURLToPath } from 'node:url';
import { createSim, startWave, step, build, upgrade, placeObstacle } from '../src/sim/sim.js';
import { weaponUnlocked, obstacleUnlocked, upgradeCost } from '../src/sim/stats.js';
import { WEAPONS } from '../src/data/weapons.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { newProgress, startConfig, dayResult, canBuyResearch, buyResearch } from '../src/meta/progress.js';

const DT = 1 / 30;
const RESEARCH_ORDER = ['m2', 'wireTough', 'budget', 'block', 'm249Rate', 'slot4'];
const WIRE_CELLS = [0, 1, 2];
const BLOCK_CELL = 0;
const MAX_TICKS = 30 * 600;

function openSlots(sim) { return sim.slots.filter(s => !s.locked && !s.weapon); }

// Girig policy, i ordning:
// 1. Minst ett vapen (billigaste upplåsta, M2 om den är upplåst och går att köpa).
// 2. Betongblock i ruta 0 (närmast basen, där alla vapen når) om upplåst och råd kvar för ett
//    vapen, sedan taggtråd i lediga rutor av 0, 1, 2 (de som saknas efter förra vågen).
// 3. Fler vapen på första lediga position.
// 4. Uppgraderingar, billigaste först.
function greedyBuild(sim) {
  const wanted = () => {
    const opts = Object.values(WEAPONS).filter(w => weaponUnlocked(w.id, sim.research));
    const heavy = opts.find(w => w.id === 'm2');
    if (heavy && sim.cash >= heavy.cost) return heavy.id;
    return opts.sort((a, b) => a.cost - b.cost)[0].id;
  };
  const buildOne = () => {
    const slot = openSlots(sim)[0];
    if (!slot) return false;
    return build(sim, slot.id, wanted()).ok;
  };
  if (!sim.slots.some(s => s.weapon)) buildOne();
  if (obstacleUnlocked('block', sim.research) && !sim.obstacles[BLOCK_CELL] && sim.cash >= OBSTACLES.block.cost + 250) placeObstacle(sim, BLOCK_CELL, 'block');
  if (obstacleUnlocked('wire', sim.research)) {
    for (const c of WIRE_CELLS) if (!sim.obstacles[c] && sim.cash >= OBSTACLES.wire.cost) placeObstacle(sim, c, 'wire');
  }
  while (buildOne());
  for (;;) {
    const ups = sim.slots.filter(s => s.weapon && upgradeCost(s.weapon.type, s.weapon.level) != null)
      .sort((a, b) => upgradeCost(a.weapon.type, a.weapon.level) - upgradeCost(b.weapon.type, b.weapon.level));
    if (!ups.length || !upgrade(sim, ups[0].id).ok) break;
  }
}

export function playDay(progress, day, policy = 'greedy') {
  if (policy !== 'greedy') throw new Error('okänd policy ' + policy);
  const cfg = startConfig(progress, day);
  const sim = createSim(cfg);
  let ticks = 0;
  while (sim.phase !== 'won' && sim.phase !== 'lost' && ticks < MAX_TICKS) {
    if (sim.phase === 'build') {
      greedyBuild(sim);
      startWave(sim);
    }
    step(sim, DT); ticks++;
  }
  return { won: sim.phase === 'won', intelEarned: sim.intelEarned, baseHp: sim.baseHp, waves: sim.waveIndex };
}

export function campaign(policy = 'greedy', maxAttempts = 6) {
  let progress = newProgress();
  const log = [];
  for (let day = 1; ; day++) {
    if (!startConfig(progress, day)) break;
    let won = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const r = playDay(progress, day, policy);
      progress = dayResult(progress, { day, won: r.won, intelEarned: r.intelEarned });
      const intel = r.intelEarned;
      // Sparar till nästa i ordningen: stannar vid första som inte går att köpa än.
      for (const id of RESEARCH_ORDER) {
        if (progress.research.includes(id)) continue;
        if (!canBuyResearch(progress, id).ok) break;
        progress = buyResearch(progress, id);
      }
      log.push({ day, attempt, won: r.won, intel, baseHp: r.baseHp, waves: r.waves, research: [...progress.research] });
      if (r.won) { won = true; break; }
    }
    if (!won) break; // dagen klarades aldrig: kampanjen stannar här
  }
  return log;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('dag  försök  vann  bas  vågor  forskning  köpt hittills');
  for (const r of campaign('greedy', 6)) {
    console.log(`${r.day}    ${r.attempt}       ${r.won ? 'ja ' : 'nej'}   ${String(r.baseHp).padStart(2)}   ${r.waves}      ${String(r.intel).padStart(3)}        ${r.research.join(',')}`);
  }
}
