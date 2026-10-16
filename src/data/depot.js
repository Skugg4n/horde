// Operation Södermanland (0.14.0, docs/superpowers/specs/2026-10-16-operation-design.md): förrådet,
// rekvisitionen och leveranserna från ledningen. Ren data; reglerna bor i src/meta/operation.js.
//
// Två valutor: rekvisitionspoäng (RP, permanenta, mellan dagarna) och förnödenheter (pengarna i striden,
// bara inom dagen). Trupper köps aldrig i striden: de rekvireras här med RP, följer med mellan dagarna
// (kärntrupper) och ställs ut i uppställningen före första vågen.
//
// Ledningen bestämmer vad som är loss. RELEASES är leveranserna i kampanjens ordning: när en dag blir
// spelbar (map, day) kommer ett meddelande från Försvarsmakten eller Myndigheten för civilt försvar (ersatte
// MSB 2026-01-01, kontrollerat mot regeringen.se 0.14.1; förkortningen är inte kontrollerad, så spelet skriver
// ut hela namnet), trupper ges till sektorn (grant) och typer blir möjliga att rekvirera där (unlock).
// 0.14.1: texterna börjar inte med avsändaren, som redan står ovanför ("Försvarsmakten: Försvarsmakten ...").
// tiers: forskningsnivåer som leveransen ger (barrikaden, granatlådorna och vapnens första nivå), så att
// simuleringens siffror (src/sim/stats.js) fungerar som förut.
//
// 0.13:s kampanjgrind ligger kvar som leveranser: E4 är arméns vägspärr (infanteriet, Ksp 90, sedan
// pillboxen och Ksp 88), Gnesta South dag 1 de civila, Hemvärnet och Ksp 90 dag 2, Ksp 58 och Ak 5 dag 3,
// Psg 90 och pillboxen dag 4, Ksp 88 dag 5, och infanteriet på Gnesta North från dag 3.

export const SECTORS = [
  // x, y: platsen på operationskartan (0..1 över kartans yta, src/ui/operation.js)
  { id: 'riksvagen', name: 'Sector E4', short: 'E4', x: 0.60, y: 0.50 },
  { id: 'gnesta', name: 'Gnesta South', short: 'Gnesta S', x: 0.47, y: 0.33 },
  { id: 'gnesta-norr', name: 'Gnesta North', short: 'Gnesta N', x: 0.45, y: 0.24 },
  // senare sektorer, gråa platshållare
  { id: 'molnbo', name: 'Mölnbo', short: 'Mölnbo', x: 0.62, y: 0.15, placeholder: true },
  { id: 'trosa', name: 'Trosa', short: 'Trosa', x: 0.78, y: 0.72, placeholder: true },
  { id: 'nykoping', name: 'Nyköping', short: 'Nyköping', x: 0.42, y: 0.80, placeholder: true },
];
export const sectorOf = id => SECTORS.find(s => s.id === id) ?? null;

// Rekvisition: pris i RP per enhet (ungefär halva det gamla priset i pengar). Kärntrupperna
// följer med mellan dagarna, så styrkan växer av sig själv; priset håller tillväxten i takt med dagarna.
export const UNIT_RP = { civ: 60, hv: 130, inf: 220, m249: 130, ksp58: 200, ak5: 220, psg90: 330, m2: 300, epa: 270 };
// Nivå 2 och 3 köps mellan dagarna med RP (förut i striden med pengar).
export const LEVEL_RP = { civ: [40, 60], hv: [80, 120], inf: [120, 160], m249: [80, 140], ksp58: [120, 200], ak5: [140, 220], psg90: [200, 300], m2: [180, 280], epa: [140, 200] };
// Påfyllnad per stupad soldat (grupperna). En pjäs som gått förlorad är borta och rekvireras på nytt.
export const REFILL_RP = { civ: 8, hv: 15, inf: 25 };
// Tillbaka till förrådet: ungefär hälften av det som lagts på enheten.
export const RETURN_RATE = 0.5;
// Erfarenhet: en stjärna efter så många vunna dagar ute. Blygsamt (src/sim/sim.js gunStats).
export const VET_WINS = 3;

// Förrådets uppgraderingar: forskningsnoderna (src/data/research.js, samma nivå-id och siffror) som
// köps med RP mellan dagarna. needs: typen som måste vara släppt någonstans, eller nivån som måste ägas.
// from: första nivån som säljs här (vapnens första nivå kommer med leveransen). More positions och More
// squads finns inte längre: man ställer ut det man har.
export const UPGRADES = [
  { id: 'm249Rate', from: 1, needs: 'm249' },
  { id: 'm2', from: 2, needs: 'm2' },
  { id: 'ksp58', from: 2, needs: 'ksp58' },
  { id: 'ak5', from: 2, needs: 'ak5' },
  { id: 'psg90', from: 2, needs: 'psg90' },
  { id: 'hvRifles', from: 1, needs: 'hv' },
  { id: 'hvSquad', from: 1, needs: 'hv' },
  { id: 'hvVeterans', from: 1, needs: 'hv' },
  { id: 'wireTough', from: 1, needs: null },
  { id: 'block', from: 2, needs: 'tier:block.1' },
  { id: 'grenade', from: 2, needs: 'tier:grenade.1' },
  { id: 'budget', from: 1, needs: null },
];
// Bigger budget heter Supply budget här: förnödenheterna per dag (andel av den gamla summan).
export const SUPPLY_BUDGET = 0.4;
// Noder som inte längre finns: deras RP lämnas tillbaka när en gammal sparfil flyttas (save v4).
export const RETIRED_NODES = ['positions', 'hvPlatoon'];
// Vapnens första nivå var en upplåsning i forskningen; nu kommer den med leveransen.
export const UNLOCK_TIERS = ['m2.1', 'ksp58.1', 'psg90.1', 'ak5.1'];

const NORTH_ALL = ['civ', 'hv', 'm249', 'ksp58', 'ak5', 'psg90', 'epa', 'm2'];
export const RELEASES = [
  // ---------- E4: arméns vägspärr ----------
  { id: 'e4-1', map: 'riksvagen', day: 1, from: 'FM',
    text: 'We hold the E4 roadblock south of Gnesta. You have an infantry squad and two Ksp 90 teams. Concrete and wire are on the trucks.',
    grant: [{ type: 'inf' }, { type: 'm249', count: 2 }], unlock: ['inf', 'm249'], tiers: ['block.1'] },
  { id: 'e4-2', map: 'riksvagen', day: 2, from: 'FM',
    text: 'Engineers have welded an EPA pillbox at the roadblock. Runners reported on the E4.',
    grant: [{ type: 'epa' }], unlock: ['epa'] },
  { id: 'e4-3', map: 'riksvagen', day: 3, from: 'FM',
    text: 'A mounted Ksp 88 has reached the roadblock. Brutes on the road tonight.',
    grant: [{ type: 'm2' }], unlock: ['m2'], tiers: ['m2.1'] },
  // ---------- Gnesta South ----------
  { id: 'gn-1', map: 'gnesta', day: 1, from: 'MCF',
    text: 'Hunters and neighbours in Gnesta are organised into three groups of volunteers. Civilians are still in the houses east of the roundabout.',
    grant: [{ type: 'civ', count: 3 }], unlock: ['civ'] },
  { id: 'gn-2', map: 'gnesta', day: 2, from: 'MCF',
    text: 'Hemvärnet is released to Gnesta: one squad and two Ksp 90 teams. Crates of hand grenades came with them.',
    grant: [{ type: 'hv' }, { type: 'm249', count: 2 }], unlock: ['hv', 'm249'], tiers: ['grenade.1'] },
  { id: 'gn-3', map: 'gnesta', day: 3, from: 'FM',
    text: 'A Ksp 58 team and an Ak 5 grenadier are released for Gnesta. The forest road is open.',
    grant: [{ type: 'ksp58' }, { type: 'ak5' }], unlock: ['ksp58', 'ak5'], tiers: ['ksp58.1', 'ak5.1'] },
  { id: 'gn-4', map: 'gnesta', day: 4, from: 'MCF',
    text: 'Fuel and an A-tractor are secured. Your engineers welded a pillbox, and Försvarsmakten sends a Psg 90 sniper.',
    grant: [{ type: 'epa' }, { type: 'psg90' }], unlock: ['epa', 'psg90'], tiers: ['psg90.1'] },
  { id: 'gn-5', map: 'gnesta', day: 5, from: 'FM',
    text: 'A mounted Ksp 88 is released for Gnesta. Everything we have is coming.',
    grant: [{ type: 'm2' }], unlock: ['m2'], tiers: ['m2.1'] },
  // ---------- Gnesta North ----------
  { id: 'gnn-1', map: 'gnesta-norr', day: 1, from: 'FM',
    text: 'They are circling north of the ice rink. Gnesta North is a sector now: reassign what you can spare from Gnesta South, or requisition.',
    grant: [{ type: 'm249' }, { type: 'ksp58' }], unlock: NORTH_ALL },
  { id: 'gnn-3', map: 'gnesta-norr', day: 3, from: 'FM',
    text: 'An infantry squad is released for Gnesta North. Regulars, Ak 5, body armour.',
    grant: [{ type: 'inf' }], unlock: ['inf'] },
];
export const releaseOf = id => RELEASES.find(r => r.id === id) ?? null;
export const FROM_NAME = { FM: 'Försvarsmakten', MCF: 'Myndigheten för civilt försvar' };
