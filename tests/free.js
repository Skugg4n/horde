// Prov som vill ha alla pjäser oavsett sektorns förråd per dag (0.13.0): samma bana utan arsenal och
// utan evakuering. Ett objekt per bana (placeringen sparas per banobjekt).
const cache = new Map();
export function free(map) {
  if (!cache.has(map)) cache.set(map, { ...map, arsenal: null, days: map.days.map(d => ({ ...d, arsenal: null, evac: null })) });
  return cache.get(map);
}
