// 0.26.1 (H602): prova en dag med truppen hela kampanjen ger fram till den (scripts/balance.mjs fullCampaign), för flera
// värden på ett fält. node scripts/balance-try.mjs <bana> <dag> <v1,v2> [normal,near] [hp|budget|choiceMod.hp|hpBy.fallback]
// CHOICE=fallback för den grenen. Svar per seed: ja<bas>[c<civila>]/<kvar $>/<köpt $> eller nej<vågor><orsak>@<s>.
import { fullCampaign, FAMILIES, playOpDay } from './balance.mjs';
import { MAPS } from '../src/data/maps.js';
const [mapId, dayS, vals, fams = 'normal', field = 'hp'] = process.argv.slice(2), day = +dayS;
const seeds = [0, 1, 2, 3, 4].map(o => o * 7919);
const d0 = MAPS[mapId].days[day - 1];
if (field.includes('.')) d0[field.split('.')[0]] ??= {};
const [d, f2] = field.includes('.') ? [d0[field.split('.')[0]], field.split('.')[1]] : [d0, field];
for (const fam of fams.split(',')) {
  const starts = seeds.map(seedOffset => fullCampaign(fam, { seedOffset, choice: process.env.CHOICE ?? 'defend', until: { mapId, day } }).progress);
  for (const v of vals.split(',').map(Number)) {
    d[f2] = v;
    const out = starts.map((p, i) => { const r = playOpDay(p, mapId, day, FAMILIES[fam][mapId] ?? FAMILIES[fam].default, { seedOffset: seeds[i] }); return r.won ? `ja${r.baseHp}${r.evac ? "c" + r.evac.safe : ""}/${Math.round(r.cashEnd)}/${Math.round(r.cashStart + r.earned - r.cashEnd)}` : `nej${r.waves}${r.lostBy?.[0] ?? ''}@${Math.round(r.time)}`; });
    console.log(`${fam} ${field} ${v}: ${out.join('  ')}`);
  }
}
