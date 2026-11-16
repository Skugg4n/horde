// prov (balansarbetet 0.26.1): en dag med truppen hela kampanjen ger fram till den, för flera värden på ett fält
import { fullCampaign, FAMILIES, playOpDay } from './balance.mjs';
import { MAPS } from '../src/data/maps.js';
const [mapId, dayS, vals, fams = 'normal', field = 'hp'] = process.argv.slice(2), day = +dayS;
const seeds = [0, 1, 2, 3, 4].map(o => o * 7919);
const d = MAPS[mapId].days[day - 1];
for (const fam of fams.split(',')) {
  const starts = seeds.map(seedOffset => fullCampaign(fam, { seedOffset, until: { mapId, day } }).progress);
  for (const v of vals.split(',').map(Number)) {
    d[field] = v;
    const out = starts.map((p, i) => { const r = playOpDay(p, mapId, day, FAMILIES[fam][mapId] ?? FAMILIES[fam].default, { seedOffset: seeds[i] }); return r.won ? `ja${r.baseHp}${r.evac ? "c" + r.evac.safe : ""}/${Math.round(r.cashEnd)}/${Math.round(r.cashStart + r.earned - r.cashEnd)}` : `nej${r.waves}${r.lostBy?.[0] ?? ''}@${Math.round(r.time)}`; });
    console.log(`${fam} ${field} ${v}: ${out.join('  ')}`);
  }
}
