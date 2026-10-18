// Rekvisitionens kort (0.18.0, strategiskt djup 3.9, Olas beslut): streck i stället för siffror, och skadeklassens
// tecken. Fyra fält med ett till fem streck: Firepower, Range, Resilience (sanity) och Armour-piercing. Siffrorna
// bakom står bara i Field manual (src/ui/coach.js numbersTable). Reglerna för strecken står i docs/balance-log.md 0.18.0.
import { WEAPONS } from '../data/weapons.js';
import { DMG_ICONS } from './icons.js';

const pips = (v, steps) => 1 + steps.filter(t => v >= t - 1e-9).length;
// Skada per sekund mot vandrare på nivå 1 (gruppen: alla man; granattillsatsen räknas som två träffade per granat).
export function firepowerOf(type) {
  const w = WEAPONS[type];
  if (!w) return 0;
  const men = w.squad ? (w.men?.[0] ?? 4) : 1;
  const l = w.launcher ? (w.launcher.damage * 2) / w.launcher.cooldown : 0;
  return men * w.damage * w.rate * w.accuracy * (w.pierce ? 1.3 : 1) + l;
}
export const FIRE_STEPS = [15, 25, 38, 50], RANGE_STEPS = [14, 16, 18, 22], NERVE_STEPS = [0.8, 1.1, 1.3, 1.45];
export function unitBars(type) {
  const w = WEAPONS[type];
  return {
    firepower: pips(firepowerOf(type), FIRE_STEPS),
    range: pips(w.range, RANGE_STEPS),
    // pillboxen har ingen sanity: den står och tar stryk
    resilience: w.vehicle ? 5 : pips(w.nerve ?? 1, NERVE_STEPS),
    pierce: w.dmg === 'heavy' ? 5 : w.launcher ? 3 : 1,
    classes: [w.dmg ?? 'small', ...(w.launcher ? ['explosive'] : [])],
  };
}
const LABELS = [['firepower', 'Firepower'], ['range', 'Range'], ['resilience', 'Resilience'], ['pierce', 'Armour-piercing']];
export function barsHtml(type) {
  const b = unitBars(type);
  const row = ([k, label]) => `<span class="sb" title="${label}"><em>${label}</em><u>${[1, 2, 3, 4, 5].map(i => `<s class="${i <= b[k] ? 'on' : ''}"></s>`).join('')}</u></span>`;
  return `<span class="bars">${LABELS.map(row).join('')}<span class="dcls">${b.classes.map(c => DMG_ICONS[c]).join('')}</span></span>`;
}
