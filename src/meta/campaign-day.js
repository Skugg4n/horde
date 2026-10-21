// Kampanjens dagnummer (0.21.3, H539, Ola: HUD:en, introt och bordet visar banans egen dag, men han väntar sig
// kampanjens). Dagarna räknas i kampanjens ordning, banornas dagar efter varandra. 0.22.0 (kampanjbågen, avsnitt 10):
// E4 3, Ishallen 3, Vikingavägen 1, Mölnbo 3, så Mölnbo dag 1 är kampanjens dag 8 och dag 2 dag 9 (förut 15). Numret
// följer banornas dagar. En bana utanför kampanjen (provbanorna) har inget nummer (null).
import { MAPS } from '../data/maps.js';

// 0.23.0 (H545): Björnlunda efter Mölnbo, dag 1 och 2 = kampanjens dag 11 och 12
// 0.25.0 (H559): Gnesta västra rondell efter Björnlunda, en dag = kampanjens dag 13 (14 efter DEFEND LAXNE)
export const CAMPAIGN_MAPS = ['riksvagen', 'gnesta', 'gnesta-norr', 'molnbo', 'bjornlunda', 'gnesta-vastra-rondell'];

// 0.24.0 (H552): valfria banor, som bara räknas när valet gjorts (src/data/choices.js). Laxne kommer efter Mölnbo när
// spelaren valt att försvara byn: Laxne är då dag 11 och Björnlunda dag 12 och 13. Utan valet (eller med FALL BACK) är
// Björnlunda dag 11 och 12 som förut. Laxne själv är alltid dag 11.
export const OPTIONAL_MAPS = { laxne: { after: 'molnbo', choice: ['laxne', 'defend'] } };
// Valen dagnumret räknar med när inget framsteg anges (HUD:en, introt, resultatet): spelets framsteg, satt av main.js
// (setChoices efter varje sparning). Rena funktioner som har framsteget skickar dess val (choices).
let current = {};
export const setChoices = c => { current = c && typeof c === 'object' ? { ...c } : {}; };
export const currentChoices = () => current;

// Kampanjens dag för banans dag, eller null utanför kampanjen.
export function campaignDayOf(mapId, day, choices = current) {
  const ok = len => Number.isInteger(day) && day >= 1 && day <= len;
  let n = 0;
  for (const id of CAMPAIGN_MAPS) {
    const len = MAPS[id]?.days?.length ?? 0;
    if (id === mapId) return ok(len) ? n + day : null;
    n += len;
    for (const [opt, o] of Object.entries(OPTIONAL_MAPS)) {
      if (o.after !== id || !MAPS[opt]) continue;
      if (opt === mapId) return ok(MAPS[opt].days.length) ? n + day : null;
      if (choices?.[o.choice[0]] === o.choice[1]) n += MAPS[opt].days.length;
    }
  }
  return null;
}

// 0.22.1 (speltestet av 0.22.0, fynd 1: resultatrutan sa "Day 1 held." under HUD:ens DAY 04): dagnumret spelaren
// ser, överallt (HUD, intro, resultat, bordets blad, menyn). Dagens eget campaignDay går före (kroken), sedan
// kampanjens räkning, och utanför kampanjen banans egen dag.
export function shownDay(mapId, day, choices = current) {
  const own = MAPS[mapId]?.days?.[day - 1]?.campaignDay;
  if (Number.isInteger(own) && own > 0) return own;
  return campaignDayOf(mapId, day, choices) ?? day;
}

// Kampanjens dag för framsteget: banan som spelas (progress.mapId) och dess nästa dag (den första som inte är vunnen,
// högst banans sista), eller day om den anges.
export function campaignDay(progress, mapId = progress?.mapId, day = null) {
  const map = MAPS[mapId];
  if (!map) return null;
  const d = day ?? Math.min(progress?.maps?.[mapId]?.unlockedDay ?? 1, map.days.length);
  return campaignDayOf(mapId, d, progress?.choices ?? {});
}
