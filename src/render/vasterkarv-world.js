// Västerkärv i spelet (0.26.0): förhandsvisningens scen (osm-world.js buildOsmWorld med gårdens byggsats, samma som
// vasterkarv.html) plus det banorna har: de befästa lägena (fortify.js).
import { buildOsmWorld } from './osm-world.js';
import { createFortify } from './fortify.js';
import { gard, ladan, uthus, ladugard, maskinhall, stoneWall, tractor, dieselTank, balePile, machine, fieldGate, cairn, jakttorn } from './vasterkarv-kit.js';

export const KIT = { gard, ladan, uthus, ladugard, maskinhall, stoneWall, tractor, dieselTank, balePile, machine, fieldGate, cairn, jakttorn };

export function buildVasterkarv(scene, map) {
  const w = buildOsmWorld(scene, map, { kit: KIT });
  scene.userData.fortify = createFortify(scene, { tagged: [] });
  return { ...w, update: w.update ?? (() => {}) };
}
