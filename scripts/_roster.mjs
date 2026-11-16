import { fullCampaign } from './balance.mjs';
import { lanes, unitsIn } from '../src/meta/operation.js';
const [mapId, day, fam = 'normal'] = process.argv.slice(2);
const p = fullCampaign(fam, { seedOffset: 0, until: { mapId, day: +day } }).progress;
const L = lanes(p, mapId), show = u => `${u.type}L${u.level}${u.men != null ? '(' + u.men + ')' : ''}f${u.fatigue ?? 0}${u.rel ? 'R' : ''}`;
console.log('rp', p.rp, 'battle', L.battle.map(show).join(' '));
console.log('rest', L.rest.map(show).join(' '));
