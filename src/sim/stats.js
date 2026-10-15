import { WEAPONS, GRENADE_KIT } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { researchNode } from '../data/research.js';

export const MAX_LEVEL = 3;
const WEAPON_REFUND = 0.6;     // andel av allt som lagts på vapnet
const OBSTACLE_REFUND = 0.5;   // andel av priset, bara för helt hinder

// Högsta köpta nivå i en forskningsnod. Läser 'nod.nivå' och även gamla platta id ('m2' = nivå 1).
export function tierOf(research, node) {
  let t = 0;
  for (const id of research) {
    if (id === node) t = Math.max(t, 1);
    else if (id.length > node.length && id.startsWith(node) && id[node.length] === '.') t = Math.max(t, Number(id.slice(node.length + 1)) || 0);
  }
  return t;
}
// Nivåns data (tiers[t-1]) eller null om noden inte är köpt.
export function tierData(research, node) {
  const t = tierOf(research, node);
  return t ? researchNode(node).tiers[t - 1] : null;
}

// Hur många vapen som får stå ute: fyra, plus en per nivå i More positions.
export const BASE_GUNS = 4;
export function maxGuns(research) {
  return BASE_GUNS + tierOf(research, 'positions');
}

export function weaponUnlocked(type, research) {
  return type === 'm249' || tierOf(research, type) >= 1;
}
// map.freeObstacles: hinder som banan ger utan forskning (Gnesta lär ut barrikader dag 1).
export function obstacleUnlocked(type, research, map = null) {
  return type === 'wire' || !!map?.freeObstacles?.includes(type) || tierOf(research, type) >= 1;
}
export function weaponStats(type, level, research) {
  const w = WEAPONS[type], l = level - 1;
  let rate = w.rate * (1 + 0.15 * l), damage = w.damage * (1 + 0.3 * l);
  if (type === 'm249') rate *= tierData(research, 'm249Rate')?.rate ?? 1;
  if (type === 'm2') damage *= tierData(research, 'm2')?.damage ?? 1;
  return { range: w.range * (1 + 0.1 * l), rate, damage, accuracy: w.accuracy };
}
export function wireDurability(research) {
  return OBSTACLES.wire.durability * (tierData(research, 'wireTough')?.durability ?? 1);
}
export function blockHp(research) {
  return OBSTACLES.block.hp * (tierData(research, 'block')?.hp ?? 1);
}
// Granatlådans värden med dagens forskning, eller null om Grenades inte är forskat.
export function grenadeStats(research) {
  const t = tierData(research, 'grenade');
  if (!t) return null;
  return { range: GRENADE_KIT.range, minCount: GRENADE_KIT.minCount, flight: GRENADE_KIT.flight, falloff: GRENADE_KIT.falloff,
    damage: t.damage, radius: t.radius, cooldown: t.cooldown, count: t.count };
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
  return obstacleWhole(ob) ? Math.round((ob.paid ?? OBSTACLES[ob.type].cost) * OBSTACLE_REFUND) : 0;
}
// En hel spärr (alla rutor hela) ger halva det som betalades för den, annars inget.
export function lineRefund(obs) {
  if (!obs.length || !obs.every(obstacleWhole)) return 0;
  return Math.round(obs.reduce((a, ob) => a + (ob.paid ?? OBSTACLES[ob.type].cost), 0) * OBSTACLE_REFUND);
}
