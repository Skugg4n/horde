// 0.26.5 (speltestet av 0.26.4): dag 9 (Mölnbo 2), Björnlunda dag 2 och Västerkärv med speltestarens uppställning
// (FAMILIES.tester), den mänskliga spelaren (casual) och den vanliga (normal), med truppen den vanliga spelaren har fram
// till dagen. node scripts/balance-0265.mjs [seeds] [familjer] [dagar]. Truppen sparas i os.tmpdir() per seed och gren.
import { fullCampaign, playOpDay, FAMILIES } from './balance.mjs';
import { nightAfter, debugReach, newCampaign } from '../src/meta/operation.js';
import { selectMap, withChoice } from '../src/meta/progress.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAPS } from '../src/data/maps.js';
// Prov av dagarnas siffror utan att ändra filen: HP_MB2, HP_BL2, HP_VK, BASE_VK, CASH_VK
const num = k => (process.env[k] != null ? Number(process.env[k]) : null);
if (num('HP_MB2') != null) MAPS.molnbo.days[1].hp = num('HP_MB2');
if (num('HP_BL2') != null) { MAPS.bjornlunda.days[1].hp = num('HP_BL2'); MAPS.bjornlunda.days[1].hpBy = { fallback: num('HP_BL2') }; }
if (num('HP_VK') != null) { MAPS.vasterkarv.days[0].hp = num('HP_VK'); MAPS.vasterkarv.days[0].choiceMod = { ...MAPS.vasterkarv.days[0].choiceMod, hp: num('HP_VK') }; }
if (num('COUNT_BL2') != null) MAPS.bjornlunda.days[1].waves = MAPS.bjornlunda.days[1].waves.map((w, i) => (i < 1 ? w : { ...w, groups: w.groups.map(g => ({ ...g, count: Math.max(1, Math.round(g.count * num('COUNT_BL2'))) })) }));
if (num('BASE_VK') != null) MAPS.vasterkarv.baseHp = num('BASE_VK');
if (num('CASH_VK') != null) MAPS.vasterkarv.days[0].startCash = num('CASH_VK');
const seeds = [0, 1, 2, 3, 4].map(o => o * 7919).slice(0, Number(process.argv[2] ?? 3));
const fams = (process.argv[3] ?? 'tester,casual,normal').split(',');
const only = process.argv[4] ? process.argv[4].split(',') : null;
const DAYS = [['molnbo', 2, 'defend', 'd9'], ['bjornlunda', 2, 'defend', 'd13'], ['bjornlunda', 2, 'fallback', 'd12'], ['vasterkarv', 1, 'defend', 'd15'], ['vasterkarv', 1, 'fallback', 'd14']];
const fresh = new Set();
// TROOP=jump: truppen Quick jump ger (debugmenyn, som speltestaren hade)
const troop = (mapId, day, choice, s) => {
  if (process.env.TROOP === 'jump') return selectMap(debugReach(withChoice(newCampaign(), 'laxne', choice), mapId, day), mapId);
  const f = join(tmpdir(), `horde-troop-${mapId}-${day}-${choice}-${s}.json`);
  if (existsSync(f) && (!process.env.FRESH || fresh.has(f))) return JSON.parse(readFileSync(f, 'utf8'));
  const p = fullCampaign('normal', { seedOffset: s, choice, until: { mapId, day } }).progress;
  writeFileSync(f, JSON.stringify(p)); fresh.add(f);
  return p;
};
for (const [mapId, day, choice, tag] of DAYS) {
  if (only && !only.includes(tag)) continue;
  for (const fam of fams) {
    const out = [];
    for (const s of seeds) {
      let p = troop(mapId, day, choice, s);
      const res = [];
      for (let t = 1; t <= 2; t++) {
        const r = playOpDay(p, mapId, day, FAMILIES[fam][mapId] ?? FAMILIES[fam].default, { seedOffset: s });
        res.push(r.won ? `ja${r.baseHp}($${Math.round(r.cashEnd)})` : `nej(v${r.waves},b${r.baseHp})`);
        if (r.won) break;
        p = nightAfter(p, { mapId, day, won: false, intelEarned: r.intelEarned, report: r.report, evac: r.evac }).progress;
      }
      out.push(res.join('>'));
    }
    console.log(`${tag} ${mapId} ${day} ${choice} ${fam.padEnd(7)} ${out.join('  ')}`);
  }
}
