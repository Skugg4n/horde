// Vad köpraden visar för en sak just nu: går att ta upp, för dyr, låst av forskningen eller
// fullt (alla positioner upptagna). Ren funktion av simuleringen, så att kortens läge och
// "går den att ta upp" är samma sak.
import { WEAPONS } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { shopItem } from '../data/shop.js';
import { weaponUnlocked, obstacleUnlocked, inArsenal } from './stats.js';
import { canAct, capFull } from './sim.js';

// { state: 'ok' | 'poor' | 'locked' | 'full' | 'closed' | 'absent', cost, need, research }
//   absent (0.13.0): sektorn har inte saken i förrådet i dag; kortet syns inte i köpraden
//   need: pengar som saknas (poor), research: forskningsnoden som låser upp (locked)
export function buyState(sim, id) {
  const item = shopItem(id);
  if (!item) return { state: 'closed', cost: 0, need: 0 };
  const gun = item.kind === 'gun';
  const cost = gun ? WEAPONS[id].cost : OBSTACLES[id].cost;
  if (!inArsenal(id, sim.map, sim.dayCfg)) return { state: 'absent', cost, need: 0 };
  const unlocked = gun ? weaponUnlocked(id, sim.research, sim.map) : obstacleUnlocked(id, sim.research, sim.map);
  if (!unlocked) return { state: 'locked', cost, need: 0, research: id };
  if (!canAct(sim)) return { state: 'closed', cost, need: 0 };
  if (gun && capFull(sim, id)) return { state: 'full', cost, need: 0 };
  if (sim.cash < cost) return { state: 'poor', cost, need: Math.ceil(cost - sim.cash) };
  return { state: 'ok', cost, need: 0 };
}
export const canPickUp = (sim, id) => buyState(sim, id).state === 'ok';
