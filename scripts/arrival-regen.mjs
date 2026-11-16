// 0.26.1: skriver om truppen och forskningen i src/data/arrival.js (Quick jump) ur balansens ankomster, i filens ordning:
// Mölnbo, Mölnbo dag 2 och 3, Björnlunda, Björnlunda dag 2, Laxne, rondellen, Västerkärv. Proven i tests/*-sector.test.js
// och tests/molnbo.test.js jämför samma funktioner. node scripts/arrival-regen.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { molnboArrival, molnboDayTroop, bjornlundaArrival, bjornlundaDayTroop, laxneArrival, vastraRondellArrival, vasterkarvArrival } from './balance.mjs';
import { unitsIn } from '../src/meta/operation.js';
const row = u => [u.type, u.level, u.men ?? null, u.wins ?? 0];
const m = molnboArrival(0), m2 = molnboDayTroop(2), m3 = molnboDayTroop(3), b = bjornlundaArrival(0), b2 = bjornlundaDayTroop(2), l = laxneArrival(0), r = vastraRondellArrival(0), v = vasterkarvArrival(0);
const seq = [[m.research, m.op.units.map(row)], [m2.research, unitsIn(m2, 'molnbo').map(row)], [m3.research, unitsIn(m3, 'molnbo').map(row)],
  [b.research, b.op.units.map(row)], [b2.research, unitsIn(b2, 'bjornlunda').map(row)], [l.research, unitsIn(l, 'laxne').map(row)],
  [r.research, unitsIn(r, 'gnesta-vastra-rondell').map(row)], [v.research, unitsIn(v, 'vasterkarv').map(row)]];
const file = new URL('../src/data/arrival.js', import.meta.url);
const js = x => JSON.stringify(x).replace(/"/g, "'").replace(/,/g, ', ');
// research: och units: kan gå över flera rader: allt fram till hakparentesen som stänger ersätts
let src = readFileSync(file, 'utf8'), i = 0, j = 0;
const swap = (key, vals) => {
  let at = 0, n = 0;
  for (;;) {
    const re = new RegExp(`^\\s+${key}: \\[`, 'mg'); re.lastIndex = at;
    const hit = re.exec(src);
    if (!hit || n >= vals.length) break;
    const k = hit.index + hit[0].indexOf(key);
    let d = 0, e = k + key.length + 2;
    for (; e < src.length; e++) { if (src[e] === '[') d++; else if (src[e] === ']' && --d === 0) break; }
    const rep = `${key}: ${js(vals[n++])}`;
    src = src.slice(0, k) + rep + src.slice(e + 1);
    at = k + rep.length;
  }
  return n;
};
i = swap('research', seq.map(q => q[0]));
j = swap('units', seq.map(q => q[1]));
const out = src.split('\n');
if (i !== seq.length || j !== seq.length) throw new Error(`hittade ${i} research- och ${j} units-rader, väntade ${seq.length}`);
writeFileSync(file, out.join('\n'));
console.log('src/data/arrival.js omskriven');
