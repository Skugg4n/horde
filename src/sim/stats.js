import { WEAPONS } from '../data/weapons.js';

export function weaponUnlocked(type, research) {
  return type === 'm249' || research.has(type);
}
export function weaponStats(type, level, research) {
  const w = WEAPONS[type], l = level - 1;
  let rate = w.rate * (1 + 0.15 * l);
  if (type === 'm249' && research.has('m249Rate')) rate *= 1.25;
  return { range: w.range * (1 + 0.1 * l), rate, damage: w.damage * (1 + 0.3 * l), accuracy: w.accuracy };
}
export function upgradeCost(type, level) {
  return level >= 3 ? null : WEAPONS[type].upgradeCost[level - 1];
}
