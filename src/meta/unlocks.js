// Inlärningen steg för steg (0.16.0, docs/superpowers/specs/2026-10-16-onboarding-design.md): ett nytt
// begrepp per dag, resten dolt. Upplåsningen hör till kampanjen, inte till om tipsen är på: den räknas ur
// framsteget (hur långt spelaren kommit på varje bana), så att en spelare som stänger av tipsen får samma HUD
// i samma takt, och debugmenyns Jump to låser upp allt fram till dagen av sig själv. Rena funktioner.
//
// STAGES är kampanjens ordning: en dag ({ map, day }) eller tiden mellan två dagar ({ after: [map, day] }, när
// dagen är vunnen). adds är det som blir synligt och går att använda från och med det steget.
//   place, start, base   alltid (ställa ut, starta vågen, basen)
//   manual               Field manual (J), från slutet av E4 dag 1
//   supplies             förnödenhetsmätaren och köpen i striden; wire, block, car: hindren var för sig
//   speed                fartknappen (F), efter första vågen E4 dag 2
//   aim, rotate          sikta-dra och Rotate (R), E4 dag 3
//   opmap                operationskartan, efter E4 dag 3
//   evac, minimap        evakueringen och minikartan (Tab), South dag 1
//   route                hordens väg med etiketten V, South dag 2
//   rp, depot, levels    RP-mätaren, förrådet och nivåer på egna enheter, efter South dag 2
//   dormant, early       vilande hus och Next wave med bonus, South dag 3
//   requisition          rekvisitionen i förrådet, efter South dag 3
//   move                 Move (M) och waypoints, South dag 4
//   upgrades             förrådets uppgraderingar, efter South dag 4
//   unitSupplies         ammunition, sandsäckar och granatlådor på enheten, South dag 5
//   return               Return till förrådet, efter South dag 4. ('sectors': vilande, se src/data/depot.js SECTORS)
//   pings, frontage      minikartans pingar framhävda (North dag 2), frontbredden och reserven (North dag 3)
import { MAPS } from '../data/maps.js';
import { mapState, mapUnlocked } from './progress.js';

export const STAGES = [
  { id: 'e4-1', map: 'riksvagen', day: 1, adds: ['place', 'start', 'base'] },
  { id: 'after-e4-1', after: ['riksvagen', 1], adds: ['manual'] },
  { id: 'e4-2', map: 'riksvagen', day: 2, adds: ['supplies', 'wire', 'speed'] },
  { id: 'e4-3', map: 'riksvagen', day: 3, adds: ['aim', 'rotate'] },
  { id: 'after-e4', after: ['riksvagen', 3], adds: ['opmap'] },
  { id: 'gn-1', map: 'gnesta', day: 1, adds: ['evac', 'minimap'] },
  { id: 'gn-2', map: 'gnesta', day: 2, adds: ['block', 'route'] },
  { id: 'after-gn-2', after: ['gnesta', 2], adds: ['rp', 'depot', 'levels', 'car'] },
  { id: 'gn-3', map: 'gnesta', day: 3, adds: ['dormant', 'early'] },
  { id: 'after-gn-3', after: ['gnesta', 3], adds: ['requisition'] },
  { id: 'gn-4', map: 'gnesta', day: 4, adds: ['move'] },
  // 0.16.0: Return till förrådet kommer med uppgraderingarna. Omplaceringen och trycket mellan sektorerna
  // ('sectors') är vilande tills två skilda platser är aktiva samtidigt (Hagstumosse är en sektor).
  { id: 'after-gn-4', after: ['gnesta', 4], adds: ['upgrades', 'return'] },
  { id: 'gn-5', map: 'gnesta', day: 5, adds: ['unitSupplies'] },
  // Hagstumosse · Vikingavägen: samma sektor, kartan vidgas norrut (Olas beslut 2026-10-16, "Gnesta = en sektor")
  { id: 'after-gn-5', after: ['gnesta', 5], adds: [] },
  { id: 'gnn-1', map: 'gnesta-norr', day: 1, adds: [] },
  { id: 'gnn-2', map: 'gnesta-norr', day: 2, adds: ['pings'] },
  { id: 'gnn-3', map: 'gnesta-norr', day: 3, adds: ['frontage'] },
  { id: 'gnn-4', map: 'gnesta-norr', day: 4, adds: [] },
  { id: 'gnn-5', map: 'gnesta-norr', day: 5, adds: [] },
];
export const ALL_FEATURES = [...new Set(STAGES.flatMap(s => s.adds))];
export const stageIndex = id => STAGES.findIndex(s => s.id === id);
// Dagens steg i schemat, eller -1 (en bana som inte finns i kampanjen, t.ex. provbanorna).
export const dayStage = (mapId, day) => STAGES.findIndex(s => s.map === mapId && s.day === day);
const upTo = i => new Set(STAGES.slice(0, i + 1).flatMap(s => s.adds));

// Det som är upplåst medan dagen spelas: allt i schemat fram till och med dagen. En dag utanför schemat
// (provbanor, okända banor) har allt, så att mekanikens prov fungerar som förut.
export function featuresFor(mapId, day) {
  const i = dayStage(mapId, day);
  return i < 0 ? new Set(ALL_FEATURES) : upTo(i);
}

// Har spelaren nått steget? En dag: den går att spela (eller är vunnen). Tiden efter en dag: dagen är vunnen.
export function stageReached(p, s) {
  const [m, d] = s.after ?? [s.map, s.day];
  if (!MAPS[m] || !mapUnlocked(p, m)) return false;
  return s.after ? mapState(p, m).unlockedDay > d : mapState(p, m).unlockedDay >= d;
}
// Längst nådda steget (index), -1 om inget.
export function furthestStage(p) {
  let best = -1;
  STAGES.forEach((s, i) => { if (stageReached(p, s)) best = i; });
  return best;
}
// Det som är upplåst mellan dagarna (operationskartan och förrådet): allt fram till längst nådda steget.
export function metaFeatures(p) {
  return upTo(furthestStage(p));
}
export const hasMeta = (p, f) => metaFeatures(p).has(f);

// Längst SPELADE steget: en dag med försök eller som är vunnen, och tiden efter en vunnen dag. Sparfilens
// migrering (lessonsFor) räknar allt fram till hit som sett.
export function furthestPlayed(p) {
  let best = -1;
  STAGES.forEach((s, i) => {
    if (s.after) { if (stageReached(p, s)) best = i; return; }
    const st = p.maps?.[s.map];
    if (st && ((st.attempts?.[s.day] ?? 0) > 0 || st.unlockedDay > s.day)) best = i;
  });
  return best;
}
