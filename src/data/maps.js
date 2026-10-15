// Banor som data. Gnesta bor i en egen fil (gnesta.js) och läggs till sist.
import { gnesta } from './gnesta.js';
import { buildPlace, rect, inRect, KIND } from '../sim/placement.js';
import { ROAD_HALF } from '../sim/cells.js';

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

export const MAPS = {
  riksvagen: {
    id: 'riksvagen',
    name: 'E4',
    camera: { target: [-2, 0], view: 25 },
    path: [[27, 0], [-12, 0]],
    // Hinderrutor: d-värdet (meter från spawn) där rutan börjar, 3 m lång, utan mellanrum.
    // Ordnade från basen: ruta 0 täcker x -6..-9, ruta 5 x 9..6.
    cells: [33, 30, 27, 24, 21, 18],
    baseHp: 20,
    days: [
      { n: 1, startCash: 500, intro: { title: 'Day 1', text: 'Place an M249 by the road. It fires on its own at what it can see.' },
        // Tipsen första gången: rader och stegen som bockar av dem (main.js updateHint).
        hints: { lines: ['Pick the M249 (1).', 'Place it by the road.', 'Start the wave.'], steps: ['pick:m249', 'gun', 'wave'] },
        waves: [ { groups: [{ type: 'walker', count: 8, interval: 1.6, delay: 0 }] },
                 { groups: [{ type: 'walker', count: 12, interval: 1.2, delay: 0 }] },
                 { groups: [{ type: 'walker', count: 20, interval: 0.8, delay: 0 }] } ] },
      { n: 2, startCash: 550, hp: 1.5, intro: { title: 'Day 2: Runners', text: 'Fast and fragile. Put barbed wire on the road to buy time to shoot.' },
        waves: [ { groups: [{ type: 'walker', count: 12, interval: 1.0, delay: 0 }] },
                 { groups: [{ type: 'walker', count: 10, interval: 1.2, delay: 0 }, { type: 'runner', count: 18, interval: 1.0, delay: 4 }] },
                 { groups: [{ type: 'walker', count: 14, interval: 0.9, delay: 0 }, { type: 'runner', count: 48, interval: 0.32, delay: 3 }] } ] },
      { n: 3, startCash: 1000, hp: 1.15, intro: { title: 'Day 3: Brutes', text: 'Big and tough. Wire barely holds them. Heavy caliber works best.' },
        waves: [ { groups: [{ type: 'walker', count: 16, interval: 0.9, delay: 0 }, { type: 'runner', count: 6, interval: 1.2, delay: 5 }] },
                 { groups: [{ type: 'walker', count: 14, interval: 1.0, delay: 0 }, { type: 'brute', count: 3, interval: 4, delay: 8 }] },
                 { groups: [{ type: 'walker', count: 18, interval: 0.8, delay: 0 }, { type: 'runner', count: 24, interval: 0.5, delay: 4 }, { type: 'brute', count: 7, interval: 1.5, delay: 8 },
                   { type: 'brute', count: 7, interval: 1.5, delay: 22 }, { type: 'brute', count: 7, interval: 1.5, delay: 36 },
                   { type: 'brute', count: 7, interval: 1.5, delay: 50 }, { type: 'brute', count: 7, interval: 1.5, delay: 64 }] } ] },
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
  },
  gnesta,
};
MAPS.riksvagen.place = e4Place(MAPS.riksvagen.props, MAPS.riksvagen.path);
