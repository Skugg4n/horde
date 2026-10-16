// Bana 1: Sector E4, trafikplats 137 Lästringe i Södermanland (0.15.0). Kartan som data, utan three.js
// (testbar i node). Ritad ur referensbilderna karta.jpg, satellit.jpg och gatubilderna (lokalt i
// ~/Projects/horde-refs/e4-lastringe, inte i repot) i satellitbildens pixlar (2000 x 1190) och omräknad
// till meter: x = öster, z = söder, y upp. Ungefär en femtedel av verklig skala, vägbredderna i
// spelets mått (vägarna är bredare än skalan säger, annars syns de inte).
//
// E4 går diagonalt genom skogen (sydväst mot Nyköping, nordost mot Södertälje). Väg 800 löper norr om
// motorvägen, parallellt, och väg 224 går norrut från 800 vid busshållplatsen. Två ramper svänger upp
// från E4 och går ihop i en stam som möter väg 800 i en T-korsning. Där står vägspärren (basen).
//
// Horden kommer längs E4 från sydväst (Nyköping) och tar avfarten upp mot korsningen (dag 1). Dag 2
// kommer en andra grupp från nordost och går uppför påfarten, fel håll. Mellan ramperna står en
// knäckt långtradare och en bilkö tvärs över motorvägen: där går ingen, så dag 1 har bara en väg.
import { buildPlace, rect, inRect, KIND } from '../sim/placement.js';
import { distPolyline, inPoly, smooth } from './gnesta.js';

export const E4_VERSION = '1.0.0';

// ---------- skala ----------
export const K = 0.09;                 // meter per bildpixel
const OX = 1300, OY = 650;
export const w = (px, py) => [(px - OX) * K, (py - OY) * K];
const W = pts => pts.map(([x, y]) => w(x, y));

// Polylinjen förskjuten off meter åt höger i färdriktningen (x öster, z söder: höger = (-dz, dx)).
export function offsetLine(pts, off) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    return [p[0] - dz / L * off, p[1] + dx / L * off];
  });
}

// ---------- vägar ----------
// surface asphalt | gravel. walk: false = ritas men horden går inte där. paint: false = går men ritas
// inte (en annan väg ritar asfalten). lines: vägmarkeringarna ('motorway' kantlinjer och körfältslinje,
// 'ramp' kantlinjer, 'road' mittlinje och kantlinjer). rail: vägräcke på sidan (+1 vänster, -1 höger
// om färdriktningen). lamps: höga belysningsstolpar (sida och steg i meter).
const E4N_PX = [[150, 1153], [400, 1072], [893, 913], [1190, 817], [1535, 740], [1940, 688], [2450, 623]];
const ROADS_PX = [
  { id: 'e4n', name: 'E4', surface: 'asphalt', width: 8, walk: false, lines: 'motorway', pts: E4N_PX },
  // Avfarten (dag 1): från E4 upp mot korsningen. Börjar på motorvägen så att rutorna hänger ihop.
  { id: 'rampA', name: 'Avfart 137', surface: 'asphalt', width: 5.5, lines: 'ramp', rail: -1, lamps: { side: -1, step: 26 },
    pts: [[1040, 865], [1130, 833], [1230, 797], [1320, 752], [1390, 702], [1440, 646], [1462, 582], [1460, 530], [1445, 490]] },
  // Påfarten (dag 2): från korsningen ner mot E4 i nordost. Horden går den fel håll.
  { id: 'rampB', name: 'Påfart 137', surface: 'asphalt', width: 5.5, lines: 'ramp', rail: 1,
    pts: [[1445, 490], [1490, 540], [1550, 595], [1630, 635], [1730, 660], [1840, 673], [1960, 684], [2010, 680]] },
  // Stammen: ramperna ihop, upp till väg 800. Vägspärren står vid dess ände.
  { id: 'stem', name: 'Avfart 137', surface: 'asphalt', width: 9, lines: 'ramp', lamps: { side: 1, step: 14 },
    pts: [[1445, 490], [1415, 448], [1385, 410]] },
  // Motorvägens körfält där horden går: bara fram till ramperna (paint: e4n ritar asfalten).
  { id: 'e4sw', name: 'E4', surface: 'asphalt', width: 6.5, paint: false, fog: true, pts: [[230, 1127], [400, 1072], [893, 913], [1100, 840]] },
  { id: 'e4ne', name: 'E4', surface: 'asphalt', width: 6.5, paint: false, fog: true, pts: [[2420, 627], [2150, 661], [1950, 686]] },
  { id: 'r800', name: 'Väg 800', surface: 'asphalt', width: 7, walk: false, lines: 'road', lamps: { side: -1, step: 24, from: 1100, to: 1650 },
    pts: [[250, 985], [420, 925], [540, 880], [640, 845], [730, 800], [830, 752], [910, 715], [1000, 670], [1100, 615], [1250, 515], [1385, 410], [1550, 290], [1700, 180], [1850, 80], [2000, -30]] },
  { id: 'r224', name: 'Väg 224', surface: 'asphalt', width: 6.5, walk: false, lines: 'road',
    pts: [[910, 715], [893, 665], [888, 630], [900, 560], [930, 500], [960, 450], [1000, 380], [1050, 270], [1080, 200], [1125, 90], [1160, -20]] },
  // Busshållplatsen och rastfickan söder om väg 800.
  { id: 'layby', name: 'Lästringe busshållplats', surface: 'asphalt', width: 5, walk: false, lines: 'edge',
    pts: [[722, 803], [738, 826], [770, 838], [815, 832], [840, 808], [838, 772], [832, 752]] },
  { id: 'track', name: 'Skogsväg', surface: 'gravel', width: 3.4, walk: false, pts: [[992, 393], [930, 372], [870, 356], [800, 338]] },
];
export const ROADS = ROADS_PX.map(r => {
  const raw = W(r.pts);
  return { ...r, walk: r.walk !== false, ptsRaw: raw, pts: raw.length > 2 ? smooth(raw, 1.2) : raw };
});
export const road = id => ROADS.find(r => r.id === id);
// Motorvägens södra körbana (mot Södertälje): den norra förskjuten 15 m söderut. Ritas, ingen går där.
{
  const n = road('e4n');
  ROADS.push({ id: 'e4s', name: 'E4', surface: 'asphalt', width: 8, walk: false, lines: 'motorway', pts: offsetLine(n.pts, 15), ptsRaw: offsetLine(n.ptsRaw, 15) });
}

// ---------- korsningen och vägspärren ----------
export const JUNCTION = w(1385, 410);
// Basen: stammens ände strax före väg 800. Modellens +x vetter nedför stammen, mot horden.
export const BASE = (() => {
  const [jx, jz] = JUNCTION, [sx, sz] = w(1445, 490);
  const L = Math.hypot(sx - jx, sz - jz), ux = (sx - jx) / L, uz = (sz - jz) / L;
  const at = [jx + ux * 2.5, jz + uz * 2.5];
  return { at, place: { x: at[0], z: at[1], ry: Math.atan2(-uz, ux) }, dir: [ux, uz] };
})();

// ---------- ingångarna ----------
// I diset längs E4, utanför den skarpa ytan. Horden går fortare där (src/sim/sim.js fogFactor).
export const SPAWNS = [
  { id: 'nykoping', name: 'E4 från Nyköping', day: 1, at: w(270, 1114) },
  { id: 'sodertalje', name: 'E4 från Södertälje', day: 2, at: w(2390, 631) },
];

// ---------- marken ----------
// Skog överallt utom vägarna, åkern i väster, ängen inne i rampernas ögla och vägrenarna.
export const GROUND = {
  bounds: { x0: -104, x1: 106, z0: -40, z1: 52 },
  ppm: 10,
  forest: [
    // norr om väg 800, öster om 224: tät gran- och tallskog upp mot korsningen
    W([[930, 380], [1060, 200], [1150, -100], [2500, -100], [2500, 560], [2150, 610], [1900, 640], [1720, 600], [1600, 520], [1500, 420], [1420, 330], [1300, 420], [1180, 520], [1060, 590], [960, 610], [940, 520]]),
    // söder om motorvägen
    W([[-100, 1200], [500, 1150], [900, 1060], [1300, 950], [1700, 880], [2100, 830], [2500, 790], [2500, 1500], [-100, 1500]]),
    // skogen mellan väg 800, avfarten och E4
    W([[925, 770], [1000, 705], [1100, 645], [1220, 580], [1300, 535], [1360, 590], [1390, 670], [1300, 735], [1180, 785], [1060, 825], [950, 865]]),
    // skogsdungar i rampernas ögla
    W([[1500, 650], [1560, 640], [1600, 690], [1540, 710]]),
    // väster om åkern och norr om spåret
    W([[-100, 300], [700, 300], [800, 330], [850, 360], [880, 420], [700, 470], [520, 520], [380, 600], [-100, 700]]),
    // väster om rastfickan ner mot E4
    W([[-100, 760], [300, 700], [500, 860], [700, 900], [880, 870], [890, 900], [600, 990], [300, 1080], [-100, 1150]]),
  ],
  // åkern väster om 224 och norr om 800
  field: W([[400, 640], [560, 560], [720, 500], [850, 455], [885, 520], [880, 650], [860, 700], [760, 770], [620, 830], [460, 900], [360, 800]]),
  // ängen med högt gräs inne i öglan och längs ramperna
  meadow: W([[1150, 780], [1330, 700], [1420, 610], [1450, 520], [1500, 560], [1560, 620], [1700, 655], [1900, 668], [1900, 700], [1500, 745], [1200, 820]]),
};

// ---------- föremål ----------
// Bilar som ställts när det började. car: personbil (färgindex i gnesta-kit GP.car, burnt), truck:
// långtradaren (dragbil + trailer, knäckt), bus: bussen vid hållplatsen.
const C = (px, py, ry, color, extra = {}) => { const [x, z] = w(px, py); return { kind: 'car', x, z, ry, color, ...extra }; };
const E4A = Math.atan2(-(817 - 913), 1190 - 893);      // E4:s riktning (österut), som rotation.y (bilen längs x)
export const PROPS = [
  // på motorvägen: kön som stannade bakom olyckan, och de som lämnades i vägrenen
  C(1600, 726, E4A + 0.15, 3), C(1660, 724, E4A - 0.9, 1, { burnt: true }), C(1700, 716, E4A + 0.05, 5), C(1760, 704, E4A + 2.6, 2),
  C(1820, 700, E4A + 0.1, 6), C(1470, 754, E4A - 0.2, 0),
  C(760, 966, E4A + 0.25, 4), C(560, 1026, E4A - 0.1, 2, { burnt: true }), C(1010, 892, E4A + 3.0, 0),
  // södra körbanan: en bil på taket, en tvärs
  C(1500, 925, E4A + 1.2, 1), C(1050, 1035, E4A + 0.1, 4, { flipped: true }), C(700, 1120, E4A - 0.3, 6),
  // väg 800 och 224
  C(1180, 572, Math.atan2(-(515 - 615), 1250 - 1100) + 0.3, 5), C(905, 600, 1.4, 3, { burnt: true }),
  // långtradaren tvärs över motorvägen mellan ramperna
  (() => { const [x, z] = w(1545, 742); return { kind: 'truck', x, z, ry: E4A + 0.55, jack: 1.15 }; })(),
  // bussen som stannade vid hållplatsen
  (() => { const [x, z] = w(782, 790); return { kind: 'bus', x, z, ry: Math.atan2(-(752 - 830), 830 - 730) + Math.PI }; })(),
];
// Vägskyltar. green: motorvägens (grön botten), blue: övriga vägar. speed: 110. Pilarna i texten (< >).
// ry: skyltarna vänds mot kameran (sydost) så att texten går att läsa, inte exakt mot trafiken.
const S = (px, py, ry, kind, lines, extra = {}) => { const [x, z] = w(px, py); return { x, z, ry, kind, lines, ...extra }; };
export const SIGNS = [
  // på väg 800 före korsningen, från sydväst: mot motorvägen (som gatubilden)
  S(1290, 458, 0.55, 'green', ['HELSINGBORG >', 'NYKÖPING >'], { motorway: true }),
  // vid korsningen, mitt emot stammen (som gatubilden mot Gnesta och Södertälje)
  S(1345, 368, 0.75, 'blue', ['< GNESTA', '< S LÄSTRINGE']),
  S(1440, 352, 0.75, 'blue', ['SÖDERTÄLJE 45 >', 'VÄSTERLJUNG >', 'GRANLUND >']),
  // vid stammen: tillbaka ner mot E4 mot Södertälje
  S(1500, 470, 0.9, 'green', ['SÖDERTÄLJE >'], { motorway: true }),
  // på motorvägen före avfarten, från sydväst
  S(980, 868, 0.5, 'green', ['137 S LÄSTRINGE', 'GNESTA'], { exit: true }),
  // 110 vid påfarten och på motorvägen
  S(1700, 632, 0.8, 'speed', ['110']),
  S(700, 1002, 0.6, 'speed', ['110']),
];
// Höga belysningsstolpar runt korsningen (gatubilden), utöver rampernas och väg 800:s.
export const LAMPS = [w(1340, 392), w(1430, 420), w(1405, 470)];
// Stenblock och hällar i vägrenen och skogsbrynet.
export const ROCKS = [
  [1250, 560, 1.6], [1290, 600, 1.1], [1180, 740, 1.3], [1520, 590, 1.8], [1600, 610, 1.0], [1070, 740, 1.4],
  [880, 750, 1.2], [990, 650, 1.5], [1650, 560, 2.2], [700, 720, 1.1], [1420, 560, 1.0], [1150, 680, 1.7],
].map(([px, py, s]) => { const [x, z] = w(px, py); return { x, z, s }; });

// ---------- omgivningen utanför spelytan ----------
const ghostRoad = (name, width, pts) => ({ name, width, pts: smooth(W(pts), 3) });
const ghostBuilding = (px, py, len, wid, ang = 0, h = 4.6, roof = 'gable') => { const [x, z] = w(px, py); return { x, z, w: len, d: wid, ry: -ang * Math.PI / 180, h, roof }; };
export const SURROUNDINGS = {
  // Spelytan som är skarp. Utanför tonar allt mot diset.
  crisp: { x0: -60, x1: 66, z0: -31, z1: 38 },
  fade: 34,
  extent: { x0: -230, x1: 240, z0: -170, z1: 180 },
  districts: [
    { id: 'lastringe', name: 'Lästringe',
      roads: [
        ghostRoad('E4', 9, [[150, 1153], [-400, 1330], [-900, 1500]]),
        ghostRoad('E4', 9, [[2450, 623], [2900, 565], [3400, 500]]),
        ghostRoad('Väg 800', 7, [[2000, -30], [2250, -200], [2500, -400]]),
        ghostRoad('Väg 800', 7, [[250, 985], [0, 1080], [-300, 1200]]),
        ghostRoad('Väg 224', 6.5, [[1160, -20], [1200, -250], [1260, -500]]),
        ghostRoad('', 3.4, [[800, 338], [790, 200], [800, 0], [780, -250]]),
        ghostRoad('', 3.4, [[800, 338], [650, 420], [500, 470], [200, 520]]),
      ],
      buildings: [
        // gårdarna vid åkern (röda trähus, ritade som spöken)
        ghostBuilding(260, 330, 14, 8, 10, 5), ghostBuilding(330, 280, 18, 9, 10, 6, 'gable'), ghostBuilding(270, 250, 9, 6, 80, 4),
        ghostBuilding(60, 640, 12, 7, -15, 5), ghostBuilding(-40, 590, 16, 8, -15, 5.5),
        ghostBuilding(1000, -260, 12, 8, 60, 5), ghostBuilding(1060, -310, 9, 6, 60, 4),
      ] },
  ],
};

// ---------- rutnätet för horden ----------
// 2 m-rutor. walk = 1 på avfarten, påfarten, stammen och motorvägens körfält dit horden kommer.
export function e4Grid(cellSize = 2) {
  const { x0, z0, x1, z1 } = { x0: -100, z0: -36, x1: 102, z1: 48 };
  const gw = Math.round((x1 - x0) / cellSize), gh = Math.round((z1 - z0) / cellSize);
  const walk = new Uint8Array(gw * gh);
  const walkRoads = ROADS.filter(r => r.walk);
  const cx = i => x0 + (i + 0.5) * cellSize, cz = j => z0 + (j + 0.5) * cellSize;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    walk[j * gw + i] = walkRoads.some(r => distPolyline(cx(i), cz(j), r.pts) <= r.width / 2 + 0.25) ? 1 : 0;
  }
  // varje väglinje ger en sammanhängande kedja av rutor
  for (const r of walkRoads) for (let k = 1; k < r.pts.length; k++) {
    const [ax, az] = r.pts[k - 1], [bx, bz] = r.pts[k];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
    for (let t = 0; t <= n; t++) {
      const i = Math.floor((ax + (bx - ax) * t / n - x0) / cellSize), j = Math.floor((az + (bz - az) * t / n - z0) / cellSize);
      if (i >= 0 && j >= 0 && i < gw && j < gh) walk[j * gw + i] = 1;
    }
  }
  const cellOf = ([x, z]) => [Math.min(gw - 1, Math.max(0, Math.floor((x - x0) / cellSize))), Math.min(gh - 1, Math.max(0, Math.floor((z - z0) / cellSize)))];
  let best = null, bd = Infinity;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) if (walk[j * gw + i]) {
    const d = Math.hypot(cx(i) - BASE.at[0], cz(j) - BASE.at[1]);
    if (d < bd) { bd = d; best = [i, j]; }
  }
  return {
    w: gw, h: gh, cellSize, origin: [x0, z0], walk, terrain: Uint8Array.from(walk),
    spawns: SPAWNS.map(s => ({ id: s.id, cell: cellOf(s.at) })),
    base: best, baseRadius: 3.5,
  };
}

// ---------- placering av vapen ----------
// Gångbara rutor är gata. Vägspärrens föremål, bilarna, långtradaren, bussen, skyltarna och stenarna
// står i vägen (men skymmer inget). Skogen är tät och stängd längre än FOREST_EDGE m från en väg;
// brynet, vägrenarna, åkern, ängen, rastfickan och väg 800:s och 224:s asfalt går att bygga på.
// Utanför den skarpa ytan (diset) går inget att bygga.
export const FOREST_EDGE = 7;
const PAD = 0.8;
export function thingRects() {
  const out = [];
  for (const p of PROPS) {
    if (p.kind === 'car') out.push(rect(p.x, p.z, p.ry, 4.4, 2));
    else if (p.kind === 'bus') out.push(rect(p.x, p.z, p.ry, 12, 2.6));
    else if (p.kind === 'truck') {
      out.push(rect(p.x, p.z, p.ry, 6.5, 2.6));
      const tx = p.x - Math.cos(p.ry) * 1.4 - Math.cos(p.ry + p.jack) * 6.6, tz = p.z + Math.sin(p.ry) * 1.4 + Math.sin(p.ry + p.jack) * 6.6;
      out.push(rect(tx, tz, p.ry + p.jack, 13.5, 2.6));
    }
  }
  for (const s of SIGNS) out.push(rect(s.x, s.z, s.ry, s.kind === 'speed' ? 0.8 : 4.4, 0.6));
  for (const r of ROCKS) out.push(rect(r.x, r.z, 0, r.s * 1.6, r.s * 1.6));
  for (const [x, z] of LAMPS) out.push(rect(x, z, 0, 0.5, 0.5));
  // vägspärren: kuren, fordonen och betongsuggorna kring stammens ände (render/models.js roadblockModel)
  for (const [lx, lz, sw, sd] of ROADBLOCK_PARTS) {
    const { x, z, ry } = BASE.place, c = Math.cos(ry), s = Math.sin(ry);
    out.push(rect(x + lx * c + lz * s, z - lx * s + lz * c, ry, sw, sd));
  }
  return out;
}
// Vägspärrens fotavtryck i modellens ram (x mot horden, z tvärs): [x, z, bredd, djup]. Samma som modellen.
export const ROADBLOCK_PARTS = [
  [-3.2, -8.2, 2.6, 2.6],      // vaktkuren
  [-7.5, 7.5, 7, 3],           // lastbilen
  [-8.8, -2, 6.2, 3.2],        // pansarbandvagnen
  [1.5, -6.6, 1.2, 3.2], [1.5, 6.6, 1.2, 3.2],   // betongsuggor på sidorna
];
export function denseForestIn(x, z) {
  if (!GROUND.forest.some(f => inPoly(x, z, f))) return false;
  return !ROADS.some(r => distPolyline(x, z, r.pts) - r.width / 2 < FOREST_EDGE);
}
export function e4Placement(grid) {
  const things = thingRects(), c = SURROUNDINGS.crisp;
  const place = buildPlace({
    w: grid.w, h: grid.h, cellSize: grid.cellSize, origin: grid.origin,
    walk: (x, z, k) => grid.walk[k] === 1,
    classify(x, z) {
      const k = Math.floor((z - grid.origin[1]) / grid.cellSize) * grid.w + Math.floor((x - grid.origin[0]) / grid.cellSize);
      if (grid.walk[k]) return KIND.road;
      if (x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) return KIND.thing;
      if (things.some(r => inRect(r, x, z, PAD))) return KIND.thing;
      if (denseForestIn(x, z)) return KIND.forest;
      return KIND.open;
    },
  });
  // Skydd för infanteriet: diket i vägrenen längs ramperna och motorvägen, och vägräcket.
  const n = grid.w * grid.h, ditch = new Uint8Array(n), hedge = new Uint8Array(n);
  const ditchRoads = ['rampA', 'rampB', 'stem', 'e4n'].map(road);
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.open || place.walk[k]) continue;
    const x = grid.origin[0] + ((k % grid.w) + 0.5) * grid.cellSize, z = grid.origin[1] + (Math.floor(k / grid.w) + 0.5) * grid.cellSize;
    if (ditchRoads.some(rd => { const d = distPolyline(x, z, rd.pts) - rd.width / 2; return d > 0.5 && d < 3.4; })) ditch[k] = 1;
    if (RAILS.some(rl => distPolyline(x, z, rl) < 1.2)) hedge[k] = 1;
  }
  return { ...place, ditch, hedge };
}

// ---------- vägräcken ----------
// Mitträcket mellan körbanorna och räcket på yttersidan av rampernas kurvor.
export const RAILS = (() => {
  const out = [offsetLine(road('e4n').pts, 7.5)];
  for (const id of ['rampA', 'rampB']) {
    const r = road(id);
    out.push(offsetLine(r.pts, r.rail * -(r.width / 2 + 0.9)).slice(id === 'rampA' ? 12 : 3, id === 'rampA' ? -2 : -8));
  }
  return out;
})();

// ---------- dagarna ----------
// 0.15.0: dag 1 är minsta möjliga (en väg, infanteriet och Ksp 90; onboardingen görs om separat),
// dag 2 öppnar påfarten (den andra grenen), dag 3 är den stora stöten med bjässarna från båda hållen.
const g = (type, count, interval, delay, spawn, lead = 0) => ({ type, count, interval, delay, spawn, ...(lead ? { lead } : {}) });
export const DAYS = [
  { n: 1, supplies: 300, startCash: 700, hp: 3.2,
    intro: { title: 'Day 1: The roadblock', text: 'The army holds the E4 off-ramp at Lästringe. The dead come along the motorway from Nyköping and up the ramp. Place a Ksp 90 by the ramp: a plain click aims it at the road, click and drag to aim it yourself. It only fires inside its arc. Infantry find their own cover.' },
    hints: { lines: ['Pick the Ksp 90 (2-2).', 'Place it by the ramp. Drag to aim.', 'Start the wave.'], steps: ['pick:m249', 'gun', 'wave'] },
    waves: [ { groups: [g('walker', 14, 1.2, 0, 'nykoping')] },
             { groups: [g('walker', 22, 0.8, 0, 'nykoping')] },
             { groups: [g('walker', 22, 0.6, 0, 'nykoping'), g('walker', 18, 0.5, 18, 'nykoping')] } ] },
  { n: 2, supplies: 350, startCash: 800, hp: 3.6,
    intro: { title: 'Day 2: Runners', text: 'Fast and fragile, and now from both sides. A second group comes from Södertälje and up the on-ramp. Barbed wire buys time to shoot. The welded EPA pillbox takes a beating while it fires.' },
    waves: [ { groups: [g('walker', 14, 1.0, 0, 'nykoping'), g('runner', 6, 1.2, 8, 'nykoping')] },
             { groups: [g('walker', 14, 1.0, 0, 'nykoping'), g('runner', 13, 0.8, 4, 'sodertalje'), g('runner', 13, 0.8, 22, 'nykoping')] },
             { groups: [g('walker', 20, 0.7, 0, 'nykoping'), ...[3, 14, 25, 36, 47, 58].map((delay, i) => g('runner', 8, 0.8, delay, i % 2 ? 'sodertalje' : 'nykoping'))] } ] },
  { n: 3, supplies: 400, startCash: 1200, hp: 1.2, bounty: 0.5,
    intro: { title: 'Day 3: Brutes', text: 'Big and tough, from both directions. Wire barely holds them. The mounted Ksp 88 turns slowly but hits hard.' },
    waves: [ { groups: [g('walker', 18, 0.9, 0, 'nykoping'), g('runner', 8, 1.2, 5, 'sodertalje')] },
             { groups: [g('walker', 16, 1.0, 0, 'nykoping'), g('brute', 4, 4, 8, 'nykoping')] },
             { groups: [g('walker', 20, 0.8, 0, 'nykoping'), g('runner', 26, 0.5, 4, 'sodertalje'), g('brute', 7, 1.5, 8, 'nykoping'),
               g('brute', 7, 1.5, 22, 'sodertalje'), g('brute', 7, 1.5, 36, 'nykoping'),
               g('brute', 7, 1.5, 50, 'sodertalje'), g('brute', 8, 1.5, 64, 'nykoping')] } ] },
];
