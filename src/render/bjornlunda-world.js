// Björnlunda i spelet (0.23.0, H545): förhandsvisningens scen (osm-world.js buildOsmWorld med Björnlundas landmärken)
// plus det banorna har: de befästa lägena (fortify.js). Landmärkena (KIT) delas med förhandsvisningen bjornlunda.html.
import { buildOsmWorld } from './osm-world.js';
import { createFortify } from './fortify.js';
import { icaStore, yellowBlock, wattHall, wattWing, sparbank, signedVilla, levelCrossing, oldStation, busStop } from './bjornlunda-kit.js';

export const KIT = {
  ica: (b, M, o) => icaStore(b, M, o),
  yellowBlock: (b, M, o) => yellowBlock(b, M, o),
  wattHall: (b, M, o) => wattHall(b, M, o),
  wattWing: (b, M, o) => wattWing(b, M, o),
  sparbank: (b, M, o) => sparbank(b, M, o),
  sternersborg: (b, M, o) => signedVilla(b, M, { ...o, facade: 'beige', roofColor: 'tile' }, 'Sternersborgs', 'choklad & glassbar', { bg: '#efe6d2', fg: '#5a2a1e' }),
  pastor: (b, M, o) => signedVilla(b, M, { ...o, facade: 'yellow', roofColor: 'black' }, 'Daga församling', 'pastorsexpedition', { bg: '#e8e4d8', fg: '#2a3a52' }),
  levelCrossing, oldStation, busStop,
};

export function buildBjornlunda(scene, map) {
  const w = buildOsmWorld(scene, map, { kit: KIT });
  scene.userData.fortify = createFortify(scene, { tagged: [] });
  return { ...w, update: w.update ?? (() => {}) };
}
