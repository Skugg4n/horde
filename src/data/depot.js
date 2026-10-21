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
  // 0.17.0-molnbo: Mölnbo är en riktig sektor (src/data/molnbo.js), öppnar efter Hagstumosse · Vikingavägen (0.22.0: en dag)
  { id: 'molnbo', name: 'Mölnbo', full: 'Mölnbo · Stationen', short: 'Mölnbo', x: 0.62, y: 0.15, maps: ['molnbo'] },
  // 0.23.0 (H545): Björnlunda (src/data/bjornlunda-play.js), öppnar efter Mölnbo dag 3
  { id: 'bjornlunda', name: 'Björnlunda', full: 'Björnlunda · Wattrangsborg', short: 'Björnlunda', x: 0.30, y: 0.22, maps: ['bjornlunda'] },
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
  // 0.22.0 (H539, kampanjbågen): Ishallen har tre dagar. Dag 3 (kampanjens dag 6) Hemvärnets grupp och radion; de
  // förrådsuppgraderingar som förut kom dag 4 släpps här och väntar tills förrådet visar dem (efter dag 3).
  { id: 'gn-3', map: 'gnesta', day: 3, from: 'MCF',
    text: 'Hemvärnet sends a rifle squad, and radios for every unit. They also come along Norra vägen.',
    grant: [{ type: 'hv' }], unlock: ['hv'], ups: { m249Rate: 1, hvRifles: 1, wireTough: 1 } },
  // ---------- Gnesta North ----------
  // 0.22.0 (H539, kampanjbågens dag 7): Vikingavägen är EN dag. Det som förut kom pö om pö på Ishallen dag 4 och 5 och
  // Vikingavägen dag 1 till 5 kommer här (Ksp 58, Ksp 88, pillboxen; Ak 5 att rekvirera) och på Mölnbo (Psg 90, infanteriet,
  // resten av uppgraderingarna). Leveranserna gn-4, gn-5 och gnn-2 till gnn-5 finns inte längre; en gammal sparfil
  // som redan fått dem behåller det den fick (src/meta/save.js).
  { id: 'gnn-1', map: 'gnesta-norr', day: 1, from: 'FM',
    text: 'Larger groups gather west, south and north of the ice rink. A Ksp 58, a Ksp 88 and a pillbox.',
    grant: [{ type: 'ksp58' }, { type: 'm2' }, { type: 'epa' }], unlock: NORTH_ALL, tiers: ['ksp58.1', 'm2.1', 'ak5.1'],
    stock: { ksp58: 1, m249: 2, ak5: 1, hv: 1 },
    ups: { grenade: 2, ksp58: 2, m2: 2, budget: 1, m249Rate: 2, block: 2, hvSquad: 1 } },
  // ---------- Mölnbo (0.17.0-molnbo) ----------
  // adopt: enheterna som står utan sektor (Hagstumosse är klar) följer med hit. Spelaren är befälhavaren som
  // skickas dit det behövs; truppen följer med.
  // 0.20.0 (kampanjbågen dag 8 till 10, H495): tre dagar. Dag 1 håll bron medan norra sidan evakueras (ett par
  // A-traktorer och Hemvärnet till att börja med), dag 2 tappar vi norra sidan, dag 3 släpper vi Mölnbo.
  { id: 'mb-1', map: 'molnbo', day: 1, from: 'FM', adopt: true,
    // (A-traktorn och Hemvärnet är redan med från Hagstumosse; en A-traktor till gav en rad för mycket i förrådet)
    // 0.22.0 (H539): spelaren kommer från fyra dagar på Hagstumosse i stället för tio, med färre och lägre enheter;
    // ledningen skickar mer hit (två Psg 90, infanteriet och en Ksp 58; förut en Psg 90) så att Mölnbo håller
    text: 'Järna has fallen. Hold the bridge while the north side crosses. Two Psg 90 and two Ksp 58 teams, and infantry.',
    grant: [{ type: 'psg90', count: 2, level: 2 }, { type: 'inf', level: 2 }, { type: 'ksp58', count: 2, level: 3 }], unlock: [...NORTH_ALL, 'inf'], tiers: ['psg90.1', 'psg90.2', 'm249Rate.1', 'grenade.2', 'hvRifles.2'], stock: { psg90: 1, ksp58: 1, inf: 1 },
    // 0.22.0: uppgraderingarna som förut kom på Vikingavägen dag 2 till 5, fördelade över Mölnbos tre dagar
    ups: { ksp58: 3, grenade: 3, budget: 2, ak5: 2 } },
  { id: 'mb-2', map: 'molnbo', day: 2, from: 'MCF',
    text: 'The north side is out. More are coming from Järna on both sides of the tracks.',
    grant: [{ type: 'hv' }, { type: 'm249', level: 2 }], stock: { inf: 1, ak5: 1, ksp58: 1, m249: 1 },
    ups: { m249Rate: 3, psg90: 3, m2: 3, wireTough: 2, hvVeterans: 1 } },
  { id: 'mb-3', map: 'molnbo', day: 3, from: 'FM',
    text: 'We cannot hold Mölnbo. Hold it as long as the clock says, then pull back to Gnesta.',
    grant: [{ type: 'inf' }], stock: { psg90: 1, m2: 1, inf: 1 },
    ups: { budget: 3, ak5: 3, hvRifles: 3, hvSquad: 2, hvVeterans: 2 } },
  // ---------- Björnlunda (0.23.0, H545) ----------
  // Kampanjbågen dag 11 och 12. Mölnbo är släppt; horden går runt Gnesta västerut. Truppen som kom ut ur Mölnbo följer
  // med (adopt). Ledningen har inga bra trupper att skicka hit: byns jägare (två frivilliga grupper) och inget mer.
  // Laxne-valet (kampanjplanen, beslut 2026-10-20) ska ligga före den här leveransen; inte byggt (src/data/bjornlunda-play.js).
  { id: 'bl-1', map: 'bjornlunda', day: 1, from: 'FM', adopt: true,
    text: 'They are turning west round Gnesta, at Björnlunda. No good troops to send. Hunters from the village join you.',
    grant: [{ type: 'civ', count: 2, level: 2 }], unlock: [...NORTH_ALL, 'inf'], stock: { civ: 1, m249: 1 } },
  // 0.23.2 (omtestet av 0.23.1: dag 12 gick inte att vinna med truppen man har efter dag 11): en blygsam förstärkning,
  // Hemvärnets två grupper och en Ksp 90 (kampanjplanen: inga bra trupper här)
  // 0.23.3 (H549, speltestet av 0.23.2: förstärkningen syntes inte på rullan): reinforce = förstärkning från ledningen
  // (inte köp). Enheterna står under en egen rubrik på rullan, "Reinforcement · Hemvärnet", märkta NEW tills dagen spelats.
  { id: 'bl-2', map: 'bjornlunda', day: 2, from: 'MCF', reinforce: 'Hemvärnet',
    text: 'People are still in their houses near Wattrangsborg. Hemvärnet sends two squads and a Ksp 90.',
    grant: [{ type: 'hv', count: 2 }, { type: 'm249' }], stock: { ksp58: 1, inf: 1 } },
];
// Leveransens sort: 'reinforcement' (trupper ledningen skickar, märkta på rullan) eller 'release' (det som blir möjligt att
// rekvirera, eller trupper som är sektorns startstyrka)
export const releaseKind = r => (r?.reinforce ? 'reinforcement' : 'release');
export const releaseOf = id => RELEASES.find(r => r.id === id) ?? null;
export const FROM_NAME = { FM: 'Försvarsmakten', MCF: 'Myndigheten för civilt försvar' };
