// Operationens kampanj (0.14.0) över fem seeds, delad av balance-op-*.test.js. scripts/balance.mjs opCampaign.
import { opCampaign, stepPrints, attemptsPerStep, STEPS } from '../scripts/balance.mjs';

export const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
export const runs = policy => SEEDS.map(seedOffset => opCampaign(policy, { seedOffset }));
// Fingeravtrycket per kampanjsteg över alla seeds: ett prov kan säga vilket steg som ändrades.
export const prints = rs => stepPrints([].concat(...rs.map((r, i) => r.log.map(x => ({ ...x, seed: i })))));
export const changed = (now, before) => STEPS.filter(s => now[s] !== before[s]);
export { attemptsPerStep, STEPS };
