// Gemensam körning för Gnestas balanstester (balance-gnesta.test.js och route-gnesta.test.js).
// Gnesta efter E4: spelaren har forskningen som en girig E4-körning slutar med. Fem
// seed-förskjutningar, smart policy (barrikad vid rondellen, horden runt över fältet) dag 1 till 5,
// och naiv policy (samma vapen, aldrig en barrikad) på dagens första försök med samma forskning.
// Filen heter inte *.test.js, så npm test kör den bara via testerna som läser den.
import { gnestaCampaign, playGnestaDay } from '../scripts/balance.mjs';

export const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
export const logs = SEEDS.map(seedOffset => gnestaCampaign('smart', 6, { seedOffset }));
export const tries = (log, d) => log.filter(r => r.day === d);
const naive = (log, d, i) => playGnestaDay(tries(log, d)[0].before, d, 'naive', { seedOffset: SEEDS[i] });
export const naives = logs.map((log, i) => [1, 2, 3, 4, 5].map(d => naive(log, d, i)));
