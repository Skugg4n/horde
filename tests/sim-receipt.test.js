// Simuleringens kvitto (0.14.1, granskningen av 0.14, Critical 2a). Kampanjens fingeravtryck
// (balance-op-*.test.js) går genom hela kedjan med RP, rekvisition och tryck, så en ändring i ekonomin
// och en ändring i hur en pjäs skjuter syns likadant där. Det här kvittot rör sig bara när simuleringen
// rör sig: en fast styrka (kärntrupper), fast forskning, fasta rutor och fasta spärrar per bana, en dag
// var, utan RP, utan policy och utan balansskriptet. Vågorna startas när de kan, ingen kallas tidigt.
//
// Byts ett kvitto med avsikt (vågor, hp, vapnens siffror): skriv det nya här och varför i
// docs/balance-log.md. Byts det utan avsikt är simuleringen inte längre deterministisk eller har ändrats.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build, placeAcross } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

const DT = 1 / 30;
const unit = (uid, type, level = 1, men = null) => ({ uid, type, level, vet: 0, ...(men != null ? { men } : {}) });
// Rutorna kommer från balansens planer i 0.14.0 (e4Plan, gnestaPlan smart) men står här som tal, så att
// kvittot inte rör sig när planerna gör det.
export const RECEIPT_DAYS = {
  'E4 day 2': {
    map: 'riksvagen', day: 2, cash: 350, research: ['block.1'],
    core: [unit(1, 'inf', 1, 4), unit(2, 'm249', 2), unit(3, 'm249', 1), unit(4, 'epa', 1)],
    guns: [[566, 'epa'], [569, 'm249'], [836, 'm249'], [839, 'inf']], lines: [], wire: [],
  },
  'Gnesta South day 3': {
    map: 'gnesta', day: 3, cash: 500, research: ['block.1', 'grenade.1', 'ksp58.1', 'ak5.1'],
    core: [unit(1, 'civ', 1, 3), unit(2, 'hv', 1, 4), unit(3, 'm249', 2), unit(4, 'm249', 1), unit(5, 'ksp58', 1), unit(6, 'ak5', 1)],
    guns: [[3581, 'ksp58'], [3484, 'm249'], [3189, 'm249'], [3787, 'ak5'], [3884, 'hv'], [6388, 'civ']], lines: [5526], wire: [2974],
  },
  'Gnesta North day 2': {
    map: 'gnesta-norr', day: 2, cash: 450, research: ['block.1', 'grenade.1', 'ksp58.1'],
    core: [unit(1, 'm249', 2), unit(2, 'ksp58', 1), unit(3, 'hv', 1, 4), unit(4, 'civ', 1, 3), unit(5, 'm249', 1)],
    guns: [[13992, 'm249'], [10372, 'ksp58'], [13995, 'm249'], [7489, 'hv'], [2679, 'civ']], lines: [7471], wire: [15106],
  },
};
const COUNTED = ['shot', 'kill', 'breach', 'obstacleHit', 'obstacleBroken', 'soldierDown', 'vehicleHit', 'grenade', 'waveCleared'];

export function receiptRun(name) {
  const d = RECEIPT_DAYS[name], map = MAPS[d.map];
  const sim = createSim({ map, day: d.day, cash: d.cash, research: d.research, seed: 1000 * d.day, core: d.core.map(u => ({ ...u })) });
  const placed = d.guns.map(([k, t]) => build(sim, k, t).ok);
  for (const k of d.lines) placeAcross(sim, k, 'block');
  for (const k of d.wire) placeAcross(sim, k, 'wire');
  const counts = Object.fromEntries(COUNTED.map(t => [t, 0]));
  let peak = 0;
  for (let i = 0; i < 900 / DT && sim.phase !== 'won' && sim.phase !== 'lost'; i++) {
    if (sim.phase === 'build' && sim.nextWaveIn == null) startWave(sim);
    step(sim, DT);
    for (const e of sim.events) if (e.t in counts) counts[e.t]++;
    if (i % 15 === 0) { let n = 0; for (const z of sim.zombies) if (!z.dead) n++; peak = Math.max(peak, n); }
  }
  return { placed, phase: sim.phase, baseHp: Math.max(0, Math.round(sim.baseHp)), waves: sim.waveIndex, kills: sim.kills, time: Math.round(sim.time * 10) / 10, cash: Math.round(sim.cash), peak, counts };
}
export const hashOf = r => { const s = JSON.stringify(r); let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };

// 0.14.1: första kvittot. E4 dag 2 var 39a99c7f med 0.14.0:s vågor; E4:s nya tempo (löparna i tre klungor,
// hp 4,4) byter det avsiktligt (docs/balance-log.md 0.14.1). South dag 3 och North dag 2 står kvar.
const RECEIPTS = {
  'E4 day 2': 'a773fa93',
  'Gnesta South day 3': '3b601645',
  'Gnesta North day 2': 'b50f3d9a',
};

for (const name of Object.keys(RECEIPT_DAYS)) {
  test(`simuleringens kvitto: ${name}`, () => {
    const a = receiptRun(name), b = receiptRun(name);
    assert.deepEqual(a, b, 'samma körning två gånger ger samma utfall');
    assert.ok(a.placed.every(Boolean), `alla pjäser ställdes ut: ${a.placed}`);
    assert.ok(a.phase === 'won' || a.phase === 'lost', `dagen tog slut (${a.phase})`);
    assert.equal(hashOf(a), RECEIPTS[name], JSON.stringify(a));
  });
}
