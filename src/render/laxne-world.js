// Laxne i spelet (0.24.0, H552): förhandsvisningens scen (osm-world.js buildOsmWorld med Laxnes landmärken, samma som
// laxne.html) plus det banorna har: de befästa lägena (fortify.js). Ingen Fjäderfabriken (Olas beslut 2026-10-20):
// src/data/laxne-play.js gör den till en lada.
import { buildOsmWorld } from './osm-world.js';
import { createFortify } from './fortify.js';
import { busStop } from './bjornlunda-kit.js';
import { pier } from './gnesta-centrum-kit.js';
import { laxneSchool, laxnegarden, goal } from './laxne-kit.js';

export const KIT = {
  laxneSchool, laxnegarden,
  // saker utan OSM-byggnad: bryggorna vid badplatsen, målen på bollplanen, busshållplatserna
  pier: (b, M, p, { r }) => { const L = Math.hypot(p.to[0] - p.at[0], p.to[1] - p.at[1]); pier(b, M, L, r); },
  goal: (b, M) => goal(b, M),
  busStop,
};

export function buildLaxne(scene, map) {
  const w = buildOsmWorld(scene, map, { kit: KIT });
  scene.userData.fortify = createFortify(scene, { tagged: [] });
  return { ...w, update: w.update ?? (() => {}) };
}
