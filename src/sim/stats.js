import { WEAPONS } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';

export const MAX_LEVEL = 3;
const WEAPON_REFUND = 0.6;     // andel av allt som lagts på vapnet
const OBSTACLE_REFUND = 0.5;   // andel av priset, bara för helt hinder

export function weaponUnlocked(type, research) {
  return type === 'm249' || research.has(type);
}
export function obstacleUnlocked(type, research) {
  return type === 'wire' || research.has(type);
}
export function weaponStats(type, level, research) {
  const w = WEAPONS[type], l = level - 1;
  let rate = w.rate * (1 + 0.15 * l);
  if (type === 'm249' && research.has('m249Rate')) rate *= 1.25;
  return { range: w.range * (1 + 0.1 * l), rate, damage: w.damage * (1 + 0.3 * l), accuracy: w.accuracy };
}
export function upgradeCost(type, level) {
  return level >= MAX_LEVEL ? null : WEAPONS[type].upgradeCost[level - 1];
}
export function weaponRefund(weapon) {
  return Math.round(weapon.spent * WEAPON_REFUND);
}
export function obstacleWhole(ob) {
  return OBSTACLES[ob.type].kind === 'slow' ? ob.durability >= ob.maxDurability : ob.hp >= ob.maxHp;
}
export function obstacleRefund(ob) {
  return obstacleWhole(ob) ? Math.round(OBSTACLES[ob.type].cost * OBSTACLE_REFUND) : 0;
}
