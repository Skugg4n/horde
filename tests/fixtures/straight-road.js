// Provbana: E4 som den var till och med 0.14.2, en rak väg (pathRoute) från x 27 till basen vid x -12.
// 0.15.0 blev E4 trafikplatsen vid Lästringe (src/data/e4-lastringe.js, ett rutnät). Simuleringens prov
// av vägen, hindren, vapnen och granaterna mäter på den raka vägen som förut, så att de inte rör sig
// när banan ritas om. pathRoute finns kvar i src/sim/route.js för den här.
import { buildPlace, rect, inRect, KIND } from '../../src/sim/placement.js';
import { ROAD_HALF } from '../../src/sim/cells.js';

// E4:s placeringsrutnät: 2 m-rutor över den öppna marken runt vägen. Asfalten (9 m bred, hela
// vägen) är gata. Zombierna går bara på vägen mellan spawn (x 27) och basen (x -12), så de
// rutorna är de gångbara som vapnen kan se. Ruinen är det enda huset och skymmer sikten.
// Bilar, betongsuggor, tunnor och träd står i vägen för ett vapen men skymmer inget.
const E4_PROP_PAD = 0.8;     // så nära ett föremål (meter från dess kant) får vapnets mitt inte stå
function e4Place(props, path) {
  const xs = path.map(p => p[0]);
  const x0 = Math.min(...xs) - 0.5, x1 = Math.max(...xs) + 1;
  const ruins = props.filter(p => p.kind === 'ruin').map(p => rect(p.x, p.z, p.ry, 8.4, 6.4));
  const things = [];
  for (const p of props) {
    if (p.kind === 'car') things.push(rect(p.x, p.z, p.ry, 4.2, 1.9));
    else if (p.kind === 'jersey') things.push(rect(p.x, p.z, p.ry, 1.1, 3));
    else if (p.kind === 'barrel') things.push(rect(p.x, p.z, 0, 0.9, 0.9));
    else if (p.kind === 'tree') things.push(rect(p.x, p.z, 0, 0.7, 0.7));
  }
  return buildPlace({
    w: 54, h: 26, cellSize: 2, origin: [-48, -26],
    classify(x, z) {
      if (Math.abs(z) < ROAD_HALF) return KIND.road;
      if (ruins.some(r => inRect(r, x, z))) return KIND.house;
      if (ruins.some(r => inRect(r, x, z, 1))) return KIND.thing;
      if (things.some(r => inRect(r, x, z, E4_PROP_PAD))) return KIND.thing;
      return KIND.open;
    },
    walk: (x, z) => Math.abs(z) < ROAD_HALF && x >= x0 && x <= x1,
  });
}

export const STRAIGHT = {
    id: 'riksvagen',
    // 0.11.0 (Olas önskan): sektornamnen i banvalet och på skyltarna; id:na är oförändrade.
    name: 'Sector E4',
    // Sektorns slut (0.11.0): texten på vinstskylten efter sista dagen och banan den leder till.
    // 0.13.0 (H104): sektorsövergången. Vägspärren tystnar, Gnesta har bara sitt Hemvärn.
    outro: { text: 'The roadblock at E4 has fallen silent. Gnesta has only its Home Guard.', next: 'gnesta', withdraw: true },
    camera: { target: [-2, 0], view: 25 },
    path: [[27, 0], [-12, 0]],
    // Hinderrutor: d-värdet (meter från spawn) där rutan börjar, 3 m lång, utan mellanrum.
    // Ordnade från basen: ruta 0 täcker x -6..-9, ruta 5 x 9..6.
    cells: [33, 30, 27, 24, 21, 18],
    baseHp: 20,
    // 0.14.0: frontbredden, så många kärntrupper får stå ute samtidigt (src/sim/sim.js frontage)
    frontage: 6,
    // 0.14.2 (speltestet av 0.14.1: "basen från 17 till 0 på några sekunder"): spärren tar dem en i taget, som
    // ishallens dörrar på Gnesta (src/sim/sim.js doorBreak). De som når fram står vid spärren och går att
    // skjuta; en släpps igenom var 3,2 s, så att 20 i bas räcker minst en minut från första skadan.
    door: { gap: 3.2 },
    // 0.13.0 (H104, H130): E4 är den militära vägspärren, en smak av riktig militär kraft. Inget Hemvärn
    // här: infanteriet, Ksp 90, Ksp 88 och EPA-pillboxen finns från början (utan forskning), plus tråd och
    // betong som förut. Lite som en övning: dag 1 lär ut pjäsen och vinkeln, dag 2 tråden och pillboxen,
    // dag 3 den tunga pjäsen mot bjässarna.
    arsenal: ['block', 'wire', 'inf', 'm249', 'm2', 'epa'],
    unlocks: ['inf', 'm2', 'epa'],
    days: [
      // 0.14.1 (speltestet av 0.14.0: dag 1 under två minuter med orörd bas, dag 2 våg 3 ett stup från 34 till
      // 74 fiender där basen föll från 20 till 0 på sekunder): dag 1 längre och lite tyngre, dag 2:s löpare
      // fördelade, så att våg 2 tar mer och våg 3 kommer i två klungor. Kurvan är densamma: dag 1 övningen,
      // dag 2 löparna, dag 3 bjässarna (docs/balance-log.md, 0.14.1).
      { n: 1, supplies: 300, startCash: 700, hp: 3.0, intro: { title: 'Day 1: The roadblock', text: 'The army holds the E4 roadblock south of Gnesta. Place a Ksp 90 by the road: a plain click aims it at the road, click and drag to aim it yourself. It only fires inside its arc. Infantry find their own cover.' },
        // Tipsen första gången: rader och stegen som bockar av dem (main.js updateHint).
        hints: { lines: ['Pick the Ksp 90 (2-2).', 'Place it by the road. Drag to aim.', 'Start the wave.'], steps: ['pick:m249', 'gun', 'wave'] },
        waves: [ { groups: [{ type: 'walker', count: 14, interval: 1.2, delay: 0 }] },
                 { groups: [{ type: 'walker', count: 22, interval: 0.8, delay: 0 }] },
                 { groups: [{ type: 'walker', count: 22, interval: 0.6, delay: 0 }, { type: 'walker', count: 18, interval: 0.5, delay: 18 }] } ] },
      // 0.14.2 (speltestet av 0.14.1: basen från 17 till 0 på sekunder, och två uppgraderingar gav full bas):
      // spärren släpper in en i taget (door ovan), våg 2:s löpare i två klungor och våg 3:s i sex om 8 i
      // stället för tre om 16, hp 4,4 till 4,0. Utan uppgraderingar vinner man nu med skada (bas 7 till 9);
      // en förlust tar minst en minut (docs/balance-log.md, 0.14.2).
      { n: 2, supplies: 350, startCash: 800, hp: 4.0, intro: { title: 'Day 2: Runners', text: 'Fast and fragile. Barbed wire buys time to shoot. The welded EPA pillbox takes a beating while it fires.' },
        waves: [ { groups: [{ type: 'walker', count: 14, interval: 1.0, delay: 0 }, { type: 'runner', count: 6, interval: 1.2, delay: 8 }] },
                 { groups: [{ type: 'walker', count: 14, interval: 1.0, delay: 0 }, { type: 'runner', count: 13, interval: 0.8, delay: 4 }, { type: 'runner', count: 13, interval: 0.8, delay: 22 }] },
                 { groups: [{ type: 'walker', count: 20, interval: 0.7, delay: 0 }, ...[3, 14, 25, 36, 47, 58].map(delay => ({ type: 'runner', count: 8, interval: 0.8, delay }))] } ] },
      // 0.14.2 (speltestet: 1 042 dollar oanvända efter våg 3): bjässarna ger hälften så mycket förnödenheter
      // (bounty), och hp 1,15 till 1,2 (bjässarna vid spärren dog för lätt med door).
      { n: 3, supplies: 400, startCash: 1200, hp: 1.2, bounty: 0.5, intro: { title: 'Day 3: Brutes', text: 'Big and tough. Wire barely holds them. The mounted Ksp 88 turns slowly but hits hard.' },
        waves: [ { groups: [{ type: 'walker', count: 18, interval: 0.9, delay: 0 }, { type: 'runner', count: 8, interval: 1.2, delay: 5 }] },
                 { groups: [{ type: 'walker', count: 16, interval: 1.0, delay: 0 }, { type: 'brute', count: 4, interval: 4, delay: 8 }] },
                 { groups: [{ type: 'walker', count: 20, interval: 0.8, delay: 0 }, { type: 'runner', count: 26, interval: 0.5, delay: 4 }, { type: 'brute', count: 7, interval: 1.5, delay: 8 },
                   { type: 'brute', count: 7, interval: 1.5, delay: 22 }, { type: 'brute', count: 7, interval: 1.5, delay: 36 },
                   { type: 'brute', count: 7, interval: 1.5, delay: 50 }, { type: 'brute', count: 8, interval: 1.5, delay: 64 }] } ] },
    ],
    props: [
      { kind: 'car', x: 12, z: 7.5, ry: 0.5, color: '#6b2f22' },
      { kind: 'car', x: 26, z: -8, ry: -0.3, color: '#3a3a33', burnt: true },
      { kind: 'car', x: -12, z: -12.5, ry: 1.3, color: '#56605a' },
      { kind: 'car', x: 38, z: 6.5, ry: 2.6, color: '#7b6a45' },
      { kind: 'jersey', x: -10, z: 7, ry: 0.1 },
      { kind: 'jersey', x: -10.6, z: 10.2, ry: 0.25 },
      { kind: 'jersey', x: -19, z: -6.5, ry: 1.5 },
      { kind: 'barrel', x: -12.5, z: 4.5, color: '#4d5a3d' },
      { kind: 'barrel', x: -13.3, z: 5.2, color: '#7a3b22' },
      { kind: 'barrel', x: 16, z: -6.2, color: '#4d5a3d', tipped: true },
      { kind: 'barrel', x: -17.5, z: 5.5, color: '#2f3a40' },
      { kind: 'tree', x: 4, z: -11, h: 5 },
      { kind: 'tree', x: 20, z: 12, h: 6 },
      { kind: 'tree', x: -24, z: 12, h: 4.5 },
      { kind: 'tree', x: 44, z: -12, h: 5.5 },
      { kind: 'poles', x0: -46, x1: 60, step: 16, z: -6.8 },
      { kind: 'ruin', x: -26, z: -15, ry: 0.2 },
    ],
  };
STRAIGHT.place = e4Place(STRAIGHT.props, STRAIGHT.path);
// Dikena (0.9.0): rutorna närmast asfalten på båda sidor är vägdiken. Hemvärnet ligger där
// (src/sim/squad.js); sikten påverkas inte.
{
  const pl = STRAIGHT.place, ditch = new Uint8Array(pl.kind.length);
  for (let k = 0; k < ditch.length; k++) {
    const z = pl.origin[1] + (Math.floor(k / pl.w) + 0.5) * pl.cellSize;
    if (pl.kind[k] === KIND.open && Math.abs(z) > ROAD_HALF && Math.abs(z) < ROAD_HALF + 2) ditch[k] = 1;
  }
  pl.ditch = ditch;
}
