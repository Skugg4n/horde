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
