// Forskningen en typisk spelare har när en bana låses upp (0.10.1). ?debug låser upp alla banor;
// då får spelaren också den här forskningen (inte sparad), så att Gnesta och Gnesta Norr spelas som
// de är balanserade. ?debug&fresh behåller ingen forskning, för att prova banan som helt ny.
// Värdena är balansskriptets (scripts/balance.mjs, seed 0). Gnesta: girig E4-kampanj. Gnesta Norr
// (0.10.2, norrArrival): en spelare som vinner varje dag på första försöket, utan förlusternas
// forskning, och köper i balansens ordning; förut smart Gnesta-kampanj med alla förluster (23
// nivåer, sex platser), som gjorde banan för lätt i speltestet av 0.10.1. Proven i
// tests/balance-gnesta.test.js och tests/balance-norr.test.js säger till om tabellen inte längre
// stämmer med balansen.
export const ARRIVAL = {
  riksvagen: [],
  gnesta: ['m2.1', 'wireTough.1', 'budget.1', 'block.1', 'grenade.1', 'm249Rate.1', 'positions.1', 'm2.2'],
  'gnesta-norr': ['m2.1', 'wireTough.1', 'budget.1', 'block.1', 'grenade.1', 'm249Rate.1', 'positions.1', 'm2.2', 'm249Rate.2',
    'grenade.2', 'budget.2', 'block.2', 'wireTough.2', 'm2.3', 'psg90.1', 'm249Rate.3', 'grenade.3', 'budget.3'],
};

// 0.17.1 (speltestet av 0.17.0 hoppade till Mölnbo med ?debug&jump=molnbo:1 och fick hela truppen på nivå 1 och sex
// forskningar, långt svagare än en spelare som kommer dit genom kampanjen): truppen och forskningen en vanlig spelare
// har när sektorn öppnar, balansens ankomst (scripts/balance.mjs molnboArrival, seed 0). debugReach (src/meta/operation.js)
// ger hoppet den här truppen. units: [typ, nivå, män (grupperna), vinster]. Provet i tests/molnbo.test.js säger till
// om tabellen inte längre stämmer med balansen.
export const ARRIVAL_TROOP = {
  molnbo: {
    research: ['block.1', 'm2.1', 'grenade.1', 'ksp58.1', 'ak5.1', 'm249Rate.1', 'grenade.2', 'ksp58.2', 'psg90.1', 'hvRifles.1', 'hvRifles.2', 'psg90.2', 'budget.1', 'budget.2'],
    // 0.18.0: omräknad efter skiva 1 (tröttheten, sanity och korselden på Hagstumosse; docs/balance-log.md 0.18.0)
    // 0.18.1: omräknad efter vågornas grind, förrådets banor och Vikingavägen dag 2 och 3 (docs/balance-log.md 0.18.1)
    // 0.19.0: omräknad efter snubblet, stormningens tärning, vågens svans och löparnas fart (docs/balance-log.md 0.19.0)
    units: [['civ', 2, 4, 4], ['civ', 2, 4, 3], ['civ', 2, 4, 3], ['m249', 2, null, 6], ['m249', 2, null, 5], ['hv', 2, 5, 3], ['ksp58', 3, null, 7], ['epa', 1, null, 5],
      ['m249', 2, null, 1], ['ksp58', 3, null, 7], ['m2', 1, null, 6], ['ak5', 1, null, 1], ['ksp58', 3, null, 5], ['m249', 1, null, 0], ['ksp58', 3, null, 5], ['psg90', 2, null, 5],
      ['psg90', 2, null, 4], ['inf', 2, 5, 2], ['psg90', 2, null, 3], ['inf', 1, 4, 0], ['psg90', 1, null, 0]],
  },
};
