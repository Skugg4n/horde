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
const BEFORE = { hash: '38b664c', length: 37245 };

function fingerprint() {
  // before (hela framsteget före försöket) är med: forskningen och försöken styr seeden.
  const str = JSON.stringify({ smart: logs, naive: naives });
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return { hash: h.toString(16), length: str.length };
}

test('Gnestas balanslogg är identisk med 0.6.0', () => {
  assert.deepEqual(fingerprint(), BEFORE);
});
