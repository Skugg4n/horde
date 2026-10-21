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
    research: ['block.1', 'm2.1', 'grenade.1', 'ksp58.1', 'ak5.1', 'hvRifles.1', 'ksp58.2', 'budget.1', 'psg90.1', 'psg90.2', 'm249Rate.1', 'grenade.2', 'hvRifles.2'],
    // 0.18.0: omräknad efter skiva 1 (tröttheten, sanity och korselden på Hagstumosse; docs/balance-log.md 0.18.0)
    // 0.18.1: omräknad efter vågornas grind, förrådets banor och Vikingavägen dag 2 och 3 (docs/balance-log.md 0.18.1)
    // 0.19.0: omräknad efter snubblet, stormningens tärning, vågens svans och löparnas fart (docs/balance-log.md 0.19.0)
    // 0.19.1: omräknad efter snubblets nedkylning, svansen för alla typer, dörrarna och förrådets förslag (docs/balance-log.md 0.19.1)
    // 0.20.0: omräknad efter riktningarna (Vikingavägen väst, syd och nord; Move och Rotate från Ishallen dag 3;
    // docs/balance-log.md 0.20.0 riktningarna)
    // 0.22.0 (H539): omräknad efter kampanjbågens Hagstumosse (Ishallen 3 dagar, Vikingavägen 1). 15 enheter i stället
    // för 20, färre veteraner; ledningens förstärkning till Mölnbo dag 1 (två Psg 90, två Ksp 58 på nivå III, infanteriet och nivåerna
    // Psg 90 II, Ksp 90 rate I, granater II och Hemvärnets gevär II) ingår.
    // docs/balance-log.md 0.22.0.
    units: [['civ', 2, 2, 4], ['civ', 2, 3, 4], ['civ', 2, 4, 3], ['m249', 2, null, 3], ['m249', 2, null, 3], ['hv', 2, 5, 2], ['ksp58', 2, null, 1],
      ['m2', 1, null, 1], ['epa', 1, null, 1], ['ksp58', 2, null, 1], ['psg90', 2, null, 0], ['psg90', 2, null, 0], ['inf', 2, 5, 0], ['ksp58', 3, null, 0], ['ksp58', 3, null, 0]],
    // 0.22.0 (H539): Quick jump till dag 2 och 3 får truppen kartläsaren går in med där (scripts/balance.mjs molnboDayTroop,
    // seed 0: förrådets köp och vinsterna dagarna före; tröttheten tas inte med, hoppet börjar utvilat). Med dag 1:s ankomst
    // förlorades dag 3 i skiva 1:s prov (scripts/slice1-check.mjs molnbo). units: [typ, nivå, män, vinster].
    days: {
      2: {
        research: ['block.1', 'm2.1', 'grenade.1', 'ksp58.1', 'ak5.1', 'hvRifles.1', 'ksp58.2', 'budget.1', 'psg90.1', 'psg90.2', 'm249Rate.1', 'grenade.2', 'hvRifles.2', 'psg90.3'],
        units: [['civ', 2, 4, 4], ['civ', 2, 4, 4], ['civ', 2, 4, 3], ['m249', 2, null, 3], ['m249', 2, null, 3], ['hv', 2, 5, 2], ['ksp58', 2, null, 2],
          ['m2', 1, null, 2], ['epa', 1, null, 2], ['ksp58', 2, null, 2], ['psg90', 2, null, 1], ['psg90', 2, null, 1], ['inf', 2, 5, 1], ['ksp58', 3, null, 1],
          ['ksp58', 3, null, 1], ['psg90', 1, null, 1], ['hv', 1, 4, 0], ['m249', 2, null, 0]],
      },
      3: {
        research: ['block.1', 'm2.1', 'grenade.1', 'ksp58.1', 'ak5.1', 'hvRifles.1', 'ksp58.2', 'budget.1', 'psg90.1', 'psg90.2', 'm249Rate.1', 'grenade.2', 'hvRifles.2', 'psg90.3'],
        units: [['civ', 2, 4, 4], ['civ', 2, 4, 4], ['civ', 2, 4, 3], ['m249', 2, null, 3], ['m249', 2, null, 3], ['hv', 2, 5, 2], ['ksp58', 2, null, 3],
          ['m2', 1, null, 3], ['ksp58', 2, null, 3], ['psg90', 2, null, 2], ['psg90', 2, null, 2], ['inf', 2, 5, 2], ['ksp58', 3, null, 2], ['ksp58', 3, null, 2],
          ['psg90', 2, null, 2], ['hv', 1, 4, 0], ['m249', 2, null, 0], ['inf', 1, 4, 0]],
      },
    },
  },
  // 0.23.0 (H545): Björnlunda (kampanjens dag 11 och 12). Truppen och forskningen kartläsaren har efter Mölnbo dag 3
  // (scripts/balance.mjs bjornlundaArrival: molnboCampaign('mbSmart'), seed 0), med byns jägare (leveransen bl-1). Dag 2:
  // truppen kartläsaren går in med efter dag 1 (bjornlundaDayTroop). Provet i tests/bjornlunda.test.js säger till när
  // tabellen inte längre stämmer med balansen. docs/balance-log.md, Björnlunda 0.23.0.
  bjornlunda: {
    research: ['block.1', 'm2.1', 'grenade.1', 'ksp58.1', 'ak5.1', 'hvRifles.1', 'ksp58.2', 'budget.1', 'psg90.1', 'psg90.2', 'm249Rate.1', 'grenade.2', 'hvRifles.2', 'psg90.3'],
    units: [['civ', 2, 4, 4], ['civ', 2, 4, 4], ['civ', 2, 4, 3], ['m249', 2, null, 4], ['m249', 2, null, 4], ['hv', 2, 3, 3], ['ksp58', 2, null, 3], ['m2', 1, null, 3],
      ['ksp58', 2, null, 3], ['psg90', 2, null, 3], ['psg90', 2, null, 3], ['inf', 2, 5, 2], ['ksp58', 3, null, 3], ['ksp58', 3, null, 3], ['psg90', 2, null, 3],
      ['hv', 1, 4, 0], ['m249', 2, null, 1], ['inf', 1, 4, 1], ['civ', 2, 4, 0], ['civ', 2, 4, 0]],
    days: {
      2: {
        // 0.23.2: med leveransen bl-2 (Hemvärnets två grupper och en Ksp 90)
        research: ['block.1', 'm2.1', 'grenade.1', 'ksp58.1', 'ak5.1', 'hvRifles.1', 'ksp58.2', 'budget.1', 'psg90.1', 'psg90.2', 'm249Rate.1', 'grenade.2', 'hvRifles.2', 'psg90.3'],
        units: [['civ', 2, 4, 4], ['civ', 2, 4, 4], ['civ', 2, 4, 3], ['m249', 2, null, 5], ['m249', 2, null, 5], ['hv', 2, 5, 3], ['ksp58', 2, null, 4],
          ['m2', 1, null, 4], ['ksp58', 2, null, 4], ['psg90', 2, null, 4], ['psg90', 2, null, 4], ['inf', 2, 5, 3], ['ksp58', 3, null, 3], ['ksp58', 3, null, 3],
          ['psg90', 2, null, 4], ['hv', 2, 5, 1], ['m249', 2, null, 1], ['inf', 1, 4, 1], ['civ', 2, 4, 0], ['civ', 2, 4, 0], ['hv', 2, 5, 0],
          ['hv', 2, 5, 0], ['m249', 2, null, 0]],
      },
    },
  },
  // 0.24.0 (H552): Laxne (DEFEND LAXNE, kampanjens dag 11). Truppen kartläsaren har efter Mölnbo dag 3 med byns jägare
  // (leveransen lx-1): scripts/balance.mjs laxneArrival, seed 0. Björnlunda ovan är grenen FALL BACK (bjornlundaArrival);
  // dag 2 utan Mölnbos sista Ksp 58 (valets kostnad, 150 RP, räckte inte till den). docs/balance-log.md, Laxne 0.24.0.
  laxne: {
    research: ['block.1', 'm2.1', 'grenade.1', 'ksp58.1', 'ak5.1', 'hvRifles.1', 'ksp58.2', 'budget.1', 'psg90.1', 'psg90.2', 'm249Rate.1', 'grenade.2', 'hvRifles.2', 'psg90.3'],
    units: [['civ', 2, 4, 4], ['civ', 2, 4, 4], ['civ', 2, 4, 3], ['m249', 2, null, 4], ['m249', 2, null, 4], ['hv', 2, 3, 3], ['ksp58', 2, null, 3], ['m2', 1, null, 3],
      ['ksp58', 2, null, 3], ['psg90', 2, null, 3], ['psg90', 2, null, 3], ['inf', 2, 5, 2], ['ksp58', 3, null, 3], ['ksp58', 3, null, 3], ['psg90', 2, null, 3],
      ['hv', 1, 4, 0], ['m249', 2, null, 1], ['inf', 1, 4, 1], ['civ', 2, 4, 0], ['civ', 2, 4, 0]],
  },
};
