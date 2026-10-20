// Kampanjens dagnummer (0.21.3, H539, Ola: HUD:en, introt och bordet visar banans egen dag, men han väntar sig
// kampanjens). Dagarna räknas i kampanjens ordning, banornas dagar efter varandra: E4 3, Ishallen 5, Vikingavägen 5,
// Mölnbo 3. Mölnbo dag 2 är alltså kampanjens dag 15. När kampanjbågen kortar Hagstumosse följer numret banornas
// dagar. En bana utanför kampanjen (provbanorna) har inget nummer (null).
import { MAPS } from '../data/maps.js';

export const CAMPAIGN_MAPS = ['riksvagen', 'gnesta', 'gnesta-norr', 'molnbo'];

// Kampanjens dag för banans dag, eller null utanför kampanjen.
export function campaignDayOf(mapId, day) {
  let n = 0;
  for (const id of CAMPAIGN_MAPS) {
    const len = MAPS[id]?.days?.length ?? 0;
    if (id === mapId) return Number.isInteger(day) && day >= 1 && day <= len ? n + day : null;
    n += len;
  }
  return null;
}

// Kampanjens dag för framsteget: banan som spelas (progress.mapId) och dess nästa dag (den första som inte är vunnen,
// högst banans sista), eller day om den anges.
export function campaignDay(progress, mapId = progress?.mapId, day = null) {
  const map = MAPS[mapId];
  if (!map) return null;
  const d = day ?? Math.min(progress?.maps?.[mapId]?.unlockedDay ?? 1, map.days.length);
  return campaignDayOf(mapId, d);
}
