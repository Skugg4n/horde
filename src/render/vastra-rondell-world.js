// Gnesta västra rondell i spelet (0.25.0, H559): förhandsvisningens scen (osm-world.js buildOsmWorld med rondellens
// byggsats, samma som gnesta-vastra-rondell.html) plus det banorna har: de befästa lägena (fortify.js).
import { buildOsmWorld } from './osm-world.js';
import { createFortify } from './fortify.js';
import { rondellIsland, vackerby, crane } from './gnesta-vastra-rondell-kit.js';

export const KIT = { rondellIsland, vackerby, crane };

export function buildVastraRondell(scene, map) {
  const w = buildOsmWorld(scene, map, { kit: KIT });
  scene.userData.fortify = createFortify(scene, { tagged: [] });
  return { ...w, update: w.update ?? (() => {}) };
}
