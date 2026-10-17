// Vad köpraden visar för en sak just nu: går att ta upp, för dyr, låst av forskningen eller
// fullt (alla positioner upptagna). Ren funktion av simuleringen, så att kortens läge och
// "går den att ta upp" är samma sak.
import { WEAPONS } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { shopItem } from '../data/shop.js';
import { weaponUnlocked, obstacleUnlocked, inArsenal } from './stats.js';
import { canAct, capFull, readyCount, allowed } from './sim.js';

// { state: 'ok' | 'poor' | 'locked' | 'full' | 'closed' | 'absent', cost, need, research }
//   absent (0.13.0): sektorn har inte saken i förrådet i dag; kortet syns inte i köpraden
//   out (0.16.2): alla enheter av typen är utställda i dag; kortet står kvar grått på sin plats (speltestet av
//          0.16.1: "kortraden hoppar", Ksp 90 gick från 5 till 4 när ett annat kort tog slut)
//   need: pengar som saknas (poor), research: forskningsnoden som låser upp (locked)
export function buyState(sim, id) {
  const item = shopItem(id);
  if (!item) return { state: 'closed', cost: 0, need: 0 };
  const gun = item.kind === 'gun';
  // 0.14.0: med kärntrupperna (sim.core) är trupperna reserven, gratis och bara i uppställningen; köpraden har
  // bara förnödenheter (hinder) när striden börjat. count: hur många av typen som väntar i reserven.
  if (sim.core && gun) {
    // 0.16.0: en sen enhet (E4 dag 1:s andra Ksp 90) syns när den kommit fram
    const count = readyCount(sim, id);
    if (!count) return sim.deployed?.some(d => d.type === id) ? { state: 'out', cost: 0, need: 0, count: 0 } : { state: 'absent', cost: 0, need: 0 };
    if (capFull(sim, id)) return { state: 'full', cost: 0, need: 0, count };
    return { state: 'ok', cost: 0, need: 0, count };
  }
  const cost = gun ? WEAPONS[id].cost : OBSTACLES[id].cost;
  if (!sim.core && !inArsenal(id, sim.map, sim.dayCfg)) return { state: 'absent', cost, need: 0 };
  // 0.16.0: hinder som inte är upplåsta än (inlärningen) syns inte
  if (!gun && (!allowed(sim, 'supplies') || !allowed(sim, id))) return { state: 'absent', cost, need: 0 };
  const unlocked = gun ? weaponUnlocked(id, sim.research, sim.map) : obstacleUnlocked(id, sim.research, sim.map);
  if (!unlocked) return { state: 'locked', cost, need: 0, research: id };
  if (!canAct(sim)) return { state: 'closed', cost, need: 0 };
  if (gun && capFull(sim, id)) return { state: 'full', cost, need: 0 };
  if (sim.cash < cost) return { state: 'poor', cost, need: Math.ceil(cost - sim.cash) };
  return { state: 'ok', cost, need: 0 };
}
export const canPickUp = (sim, id) => buyState(sim, id).state === 'ok';
// Syns saken i köpraden i dag? (köpradens och snabbvalens urval, main.js och panels.js)
export const inBar = (sim, id) => buyState(sim, id).state !== 'absent';
