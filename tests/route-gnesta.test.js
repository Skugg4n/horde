import test from 'node:test';
import assert from 'node:assert/strict';
import { logs, naives } from './gnesta-logs.js';

// Kvittot på Gnestas balans, samma disciplin som E4 (route-e4.test.js): hela balansloggen (smart
// policy dag 1 till 5 över fem seeds, plus naiv dag 1 till 5 på dagens första försök) ger samma
// fingeravtryck. Ett ändrat kvitto ska vara avsiktligt och förklarat här och i docs/balance-log.md.
// 0.5.2: första kvittot. Samma värde med och utan 0.5.2:s regler (ingen spärr på levande
// zombier, barrikaden kräver forskning även på Gnesta): E4-spelaren har redan block.1, och
// policyn lägger aldrig en spärr där zombier står.
// 0.6.0: bytt avsiktligt. Basen är ishallens entré i stället för rondellens mitt (H039): vägen
// dit är annan (norra gruppen tar cykelvägen till entrén), dag 1 hp 3,8 till 3,6 och dag 2
// $ 900 till $ 1100, hp 4,6 till 5,0. Skälen i docs/balance-log.md (0.6.0).
// 0.8.0: bytt avsiktligt. Arsenalen: forskningsordningen köper Psg 90 efter Ksp 88 III och
// Ksp 58 och Ak 5 efter dag 4; smart och naiv bemannar ett tak per dag (två dag 5) med Psg 90 och
// sparar till det, Ak 5 på nästa plats, Ksp 58 i stället för Ksp 90 när den finns. Dag 4 hp 5,6
// till 6,0, dag 5 4,6 till 5,1. Skälen i docs/balance-log.md (0.8.0).
// 0.9.0: bytt avsiktligt. Gnestas plan har egna platser för Hemvärnet (plan.squads, gevärens
// räckvidd) och policyn köper en grupp när en position står tom och planen saknar fler platser för
// pjäser. I de fem seedsen händer det aldrig, så vinster, försök och bas kvar är som i 0.8.0;
// kvittot ändras av planens nya fält och av E4-kampanjens kassa dag 1. Se docs/balance-log.md, 0.9.0.
// 0.10.1: bytt avsiktligt. Fil-vakten (src/sim/route.js) gäller nu alla rutnät, inte bara Gnesta
// Norr: en siktpunkt uppströms godtas aldrig (granskningen av 0.10, Must fix 2). Gnesta valde sådana
// siktpunkter i vanliga körningar, så vägarna ändras något; vinster, försök och naives utfall är
// samma i alla 25 dagar, bas kvar varierar inom kaoset. Se docs/balance-log.md, 0.10.1.
const BEFORE = { hash: 'eaf289f6', length: 39328 };

function fingerprint() {
  // before (hela framsteget före försöket) är med: forskningen och försöken styr seeden.
  const str = JSON.stringify({ smart: logs, naive: naives });
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return { hash: h.toString(16), length: str.length };
}

test('Gnestas balanslogg är identisk med 0.10.1', () => {
  assert.deepEqual(fingerprint(), BEFORE);
});
