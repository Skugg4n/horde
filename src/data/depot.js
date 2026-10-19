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

// 0.16.0 (Olas beslut 2026-10-16, "Gnesta = en sektor"): Gnesta South och Gnesta North är samma plats, stadsdelen
// Hagstumosse (ishallen, Sigtunavägen, Fornminnesvägen och Vikingavägen). En sektor med två faser och en gemensam
// trupp: maps är banorna i ordning (id:na är oförändrade, så sparfilerna fungerar). Enheternas sector är sektorns
// id ('gnesta'); en sparfil med enheter i 'gnesta-norr' flyttas hit (src/meta/operation.js poolOf).
// Omplaceringen och garnisonen finns kvar i koden men visas bara när två skilda platser är aktiva samtidigt.
export const SECTORS = [
  // x, y: platsen på operationskartan (0..1 över kartans yta, src/ui/operation.js)
  { id: 'riksvagen', name: 'Sector E4', short: 'E4', x: 0.60, y: 0.50, maps: ['riksvagen'] },
  { id: 'gnesta', name: 'Hagstumosse', full: 'Hagstumosse · Gnesta', short: 'Hagstumosse', x: 0.46, y: 0.29, maps: ['gnesta', 'gnesta-norr'] },
  // senare sektorer, gråa platshållare
  { id: 'centrum', name: 'Gnesta Centrum', short: 'Centrum', x: 0.49, y: 0.21, placeholder: true },
  // 0.17.0-molnbo: Mölnbo är en riktig sektor (src/data/molnbo.js), öppnar efter Hagstumosse · Vikingavägen dag 5
  { id: 'molnbo', name: 'Mölnbo', full: 'Mölnbo · Stationen', short: 'Mölnbo', x: 0.62, y: 0.15, maps: ['molnbo'] },
  { id: 'trosa', name: 'Trosa', short: 'Trosa', x: 0.78, y: 0.72, placeholder: true },
  { id: 'nykoping', name: 'Nyköping', short: 'Nyköping', x: 0.42, y: 0.80, placeholder: true },
];
// Sektorn en bana hör till ('gnesta-norr' -> 'gnesta').
export const poolOf = mapId => SECTORS.find(s => s.maps?.includes(mapId))?.id ?? mapId;
export const sectorOf = id => SECTORS.find(s => s.id === id) ?? SECTORS.find(s => s.maps?.includes(id)) ?? null;

// Rekvisition: pris i RP per enhet (ungefär halva det gamla priset i pengar). Kärntrupperna
// följer med mellan dagarna, så styrkan växer av sig själv; priset håller tillväxten i takt med dagarna.
export const UNIT_RP = { civ: 60, hv: 130, inf: 220, m249: 130, ksp58: 200, ak5: 220, psg90: 330, m2: 300, epa: 270 };
// Nivå 2 och 3 köps mellan dagarna med RP (förut i striden med pengar).
export const LEVEL_RP = { civ: [40, 60], hv: [80, 120], inf: [120, 160], m249: [80, 140], ksp58: [120, 200], ak5: [140, 220], psg90: [200, 300], m2: [180, 280], epa: [140, 200] };
// Påfyllnad per stupad soldat (grupperna). En pjäs som gått förlorad är borta och rekvireras på nytt.
export const REFILL_RP = { civ: 8, hv: 15, inf: 25 };
// Tillbaka till förrådet: ungefär hälften av det som lagts på enheten.
export const RETURN_RATE = 0.5;
// 0.16.0 (Olas fråga om Reassign: "behöver jag ingen kvar i South?"): sektorns rekommenderade garnison. En öppen
// sektor med färre enheter än så får trycket att stiga dubbelt så fort när man strider någon annanstans
// (src/meta/operation.js pressureGain); en sektor faller aldrig (Olas beslut).
export const GARRISON = 3;
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
// 0.16.0 (Olas tillägg: knapphet i rekvisitionen): ledningen släpper ett bestämt antal per leverans. stock: så
// många av typen som går att rekvirera i sektorn (RP är priset, leveranserna taket; sektorns frontbredd står
// kvar). ups: förrådets uppgraderingar som släpps, upp till nivån (pö om pö, som trupperna). Rekvisitionen syns
// först efter South dag 3 och uppgraderingarna efter South dag 4 (src/meta/unlocks.js), så lagret från de
// tidigare leveranserna väntar där. Ledningens meddelanden är högst 20 ord (designen, avsnitt 2.2).
// Inlärningen (designen avsnitt 3): E4 dag 1 har bara pjäsen och infanteriet, dag 2 taggtråden och dag 3 Ksp 88
// och pillboxen, som står svetsad från början.
export const RELEASES = [
  // ---------- E4: arméns vägspärr ----------
  { id: 'e4-1', map: 'riksvagen', day: 1, from: 'FM',
    text: 'A group moves north along the E4. Stop it before väg 224. Infantry and two Ksp 90 teams.',
    grant: [{ type: 'inf' }, { type: 'm249', count: 2 }], unlock: ['inf', 'm249'], tiers: ['block.1'] },
  { id: 'e4-2', map: 'riksvagen', day: 2, from: 'FM',
    text: 'Runners on the E4 from Nyköping. Watch the Södertälje side too. The trucks brought barbed wire.' },
  { id: 'e4-3', map: 'riksvagen', day: 3, from: 'FM',
    text: 'A mounted Ksp 88 and a welded EPA pillbox reach the roadblock. Brutes tonight.',
    grant: [{ type: 'm2' }, { type: 'epa' }], unlock: ['m2', 'epa'], tiers: ['m2.1'] },
  // ---------- Gnesta South ----------
  { id: 'gn-1', map: 'gnesta', day: 1, from: 'MCF',
    text: 'They are coming at eastern Gnesta. Hunters and neighbours form three volunteer groups. Get the civilians into the ice rink.',
    grant: [{ type: 'civ', count: 3 }], unlock: ['civ'] },
  // 0.16.2 (speltestet av 0.16.1): Hemvärnets grupp kommer dag 3, så att dag 2 bara lär ut barrikaderna
  { id: 'gn-2', map: 'gnesta', day: 2, from: 'MCF',
    text: 'Two Ksp 90 teams from Hemvärnet reach Gnesta, with hand grenades. Barricades are ready.',
    grant: [{ type: 'm249', count: 2 }], unlock: ['m249'], tiers: ['grenade.1'] },
  // 0.16.4 (speltestet av 0.16.2: Ishallen dag 3 hade sex-sju nyheter): en ny enhet per dag. Hemvärnet dag 3, Ksp 58
  // och pillboxen dag 4, Ksp 88 och Ak 5 dag 5, Psg 90 på Vikingavägen dag 1. Den extra Ksp 90 släpps dag 4, när
  // rekvisitionen har öppnat (förut lovade dag 3:s meddelande en Ksp 90 som inte gick att få).
  { id: 'gn-3', map: 'gnesta', day: 3, from: 'MCF',
    text: 'Hemvärnet sends a rifle squad, and radios for every unit. They also come along Norra vägen.',
    grant: [{ type: 'hv' }], unlock: ['hv'] },
  { id: 'gn-4', map: 'gnesta', day: 4, from: 'FM',
    text: 'A Ksp 58 team and a welded pillbox for Gnesta. One more Ksp 58 and one Ksp 90 released.',
    grant: [{ type: 'ksp58' }, { type: 'epa' }], unlock: ['ksp58', 'epa'], tiers: ['ksp58.1'], stock: { ksp58: 1, m249: 1 },
    ups: { m249Rate: 1, hvRifles: 1, wireTough: 1 } },
  { id: 'gn-5', map: 'gnesta', day: 5, from: 'FM',
    text: 'A mounted Ksp 88 and an Ak 5 grenadier for Gnesta. One more Ksp 58 and one Ksp 90 released.',
    grant: [{ type: 'm2' }, { type: 'ak5' }], unlock: ['m2', 'ak5'], tiers: ['m2.1', 'ak5.1'], stock: { ksp58: 1, m249: 1 },
    ups: { grenade: 2, ksp58: 2 } },
  // ---------- Gnesta North ----------
  { id: 'gnn-1', map: 'gnesta-norr', day: 1, from: 'FM',
    text: 'Larger groups gather west, south and north of the ice rink. A Psg 90 sniper joins you.',
    grant: [{ type: 'm249' }, { type: 'ksp58' }, { type: 'psg90' }], unlock: NORTH_ALL, tiers: ['psg90.1'], stock: { ksp58: 2, psg90: 1, ak5: 1, hv: 1 },
    ups: { m2: 2, budget: 1 } },
  { id: 'gnn-2', map: 'gnesta-norr', day: 2, from: 'FM',
    text: 'New kit at the depot: faster Ksp 90 feeds, Psg 90 optics and better concrete.',
    ups: { m249Rate: 2, psg90: 2, block: 2, hvSquad: 1 } },
  { id: 'gnn-3', map: 'gnesta-norr', day: 3, from: 'FM',
    text: 'An infantry squad for Hagstumosse: regulars, Ak 5, body armour. One more Psg 90 is released.',
    grant: [{ type: 'inf' }], unlock: ['inf'], stock: { inf: 1, psg90: 1, ksp58: 1 },
    ups: { ksp58: 3, grenade: 3, hvRifles: 2, budget: 2, ak5: 2 } },
  { id: 'gnn-4', map: 'gnesta-norr', day: 4, from: 'FM',
    text: 'The depot has the last Ksp 90 and Psg 90 upgrades, and heavier Ksp 88 rounds.',
    ups: { m249Rate: 3, psg90: 3, m2: 3, wireTough: 2, hvVeterans: 1 } },
  { id: 'gnn-5', map: 'gnesta-norr', day: 5, from: 'FM',
    text: 'Everything we have left is at the depot. Hold the town.',
    ups: { budget: 3, ak5: 3, hvRifles: 3, hvSquad: 2, hvVeterans: 2 } },
  // ---------- Mölnbo (0.17.0-molnbo) ----------
  // adopt: enheterna som står utan sektor (Hagstumosse är klar) följer med hit. Spelaren är befälhavaren som
  // skickas dit det behövs; truppen följer med.
  { id: 'mb-1', map: 'molnbo', day: 1, from: 'FM', adopt: true,
    text: 'Your units are at Mölnbo station. A Psg 90 team waits on the stair towers.',
    grant: [{ type: 'psg90' }], unlock: [...NORTH_ALL, 'inf'], stock: { psg90: 1, ksp58: 1 } },
  { id: 'mb-2', map: 'molnbo', day: 2, from: 'MCF',
    // 0.19.1 (speltestet av 0.19.0, fynd 8: tåget som skydd ströks i 0.18.1, raden stod kvar)
    text: 'They come over the bridge and up Stenbyvägen. Hold the houses on both sides.',
    stock: { inf: 1, ak5: 1 } },
  { id: 'mb-3', map: 'molnbo', day: 3, from: 'MCF',
    text: 'One train out tonight. It leaves on time, with or without you holding.',
    grant: [{ type: 'hv' }], stock: { ksp58: 1, m249: 1 } },
  { id: 'mb-4', map: 'molnbo', day: 4, from: 'FM',
    text: 'More are coming north of the tracks from Järna. The bridge is the only way over.',
    grant: [{ type: 'inf' }], stock: { psg90: 1, m2: 1 } },
  { id: 'mb-5', map: 'molnbo', day: 5, from: 'FM',
    text: 'The last train out. Everything we have left is at Mölnbo.',
    stock: { ksp58: 1, inf: 1, ak5: 1 } },
];
export const releaseOf = id => RELEASES.find(r => r.id === id) ?? null;
export const FROM_NAME = { FM: 'Försvarsmakten', MCF: 'Myndigheten för civilt försvar' };
