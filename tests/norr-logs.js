// Gemensam körning för Gnesta Norrs balansprov (balance-norr.test.js). Gnesta Norr efter Gnesta:
// spelaren har forskningen som en smart Gnesta-körning (efter E4) slutar med. Fem
// seed-förskjutningar, smart policy dag 1 till 5 och naiv policy på dagens första försök med samma
// forskning. Filen heter inte *.test.js, så npm test kör den bara via provet som läser den.
import { norrCampaign, playNorrDay, gnestaFinished } from '../scripts/balance.mjs';

export const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
export const starts = SEEDS.map(seedOffset => gnestaFinished(seedOffset));
export const logs = SEEDS.map((seedOffset, i) => norrCampaign('smart', 6, { seedOffset, start: starts[i] }));
export const tries = (log, d) => log.filter(r => r.day === d);
const naive = (log, d, i) => playNorrDay(tries(log, d)[0].before, d, 'naive', { seedOffset: SEEDS[i] });
export const naives = logs.map((log, i) => [1, 2, 3, 4, 5].map(d => naive(log, d, i)));
