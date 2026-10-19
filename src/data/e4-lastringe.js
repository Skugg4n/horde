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
// Horden kommer norrut längs E4 från sydväst (Nyköping) och tar avfarten upp mot korsningen och väg 224 (dag 1; kampanjbågen,
// kampanjplanen avsnitt 10: "hindra gruppen från att nå väg 224 vid trafikplats Lästringe"). Dag 2
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
  { id: 'nykoping', name: 'E4 från Nyköping', from: 'Nyköping', day: 1, at: w(270, 1114) },
  { id: 'sodertalje', name: 'E4 från Södertälje', from: 'Södertälje', day: 2, at: w(2390, 631) },
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
// 0.16.3 (H231, Olas "skyltarna står mitt i vägen"): alla står i vägrenen, minst 1,3 m från körbanan med
// stolparna och 0,7 m med panelens kanter (prov: tests/e4-env.test.js). Positionerna i meter.
const S = (x, z, ry, kind, lines, extra = {}) => ({ x, z, ry, kind, lines, ...extra });
export const SIGNS = [
  // på väg 800 före korsningen, från sydväst: mot motorvägen (som gatubilden), i norra vägrenen
  S(-6.9, -16.8, 0.55, 'green', ['HELSINGBORG >', 'NYKÖPING >'], { motorway: true }),
  // vid korsningen, mitt emot stammen på andra sidan väg 800 (som gatubilden mot Gnesta och Södertälje)
  S(11, -31.5, 0.75, 'blue', ['< GNESTA', '< S LÄSTRINGE']),
  S(18, -37, 0.75, 'blue', ['SÖDERTÄLJE 45 >', 'VÄSTERLJUNG >', 'GRANLUND >']),
  // vid stammen: tillbaka ner mot E4 mot Södertälje, mellan stammen och påfarten
  S(19.5, -16.95, 0.9, 'green', ['SÖDERTÄLJE >'], { motorway: true }),
  // 110 vid påfarten och på motorvägen
  S(36.5, -4.1, 0.8, 'speed', ['110']),
  S(-53.25, 34.7, 0.6, 'speed', ['110']),
];
// Skyltens bredd i meter (render/e4-kit.js roadSign: panelen 0,8 m per rad + 0,3, bildformatet ur texturen).
export function signWidth(s) {
  if (s.kind === 'speed') return 0.84;
  const n = s.lines.length;
  return (0.8 * n + 0.3) * 512 / (n * 96 + 40);
}
// Portalen över motorvägen före avfarten (H231): avfartsskylten hänger över körbanan, inte på den. Den
// spänner över båda körbanorna med ett ben i mittremsan; skylten mot sydväst gäller avfarten upp mot
// korsningen, den mot nordost samma avfart för andra hållet (den syns från kameran).
export const GANTRIES = (() => {
  // punkten på E4 en bit före avfarten (925, 895 i bilden), och riktningen där
  const n = road('e4n'), [ox, oz] = w(925, 895);
  let best = null;
  for (let i = 1; i < n.pts.length; i++) {
    const [ax, az] = n.pts[i - 1], [bx, bz] = n.pts[i], L = Math.hypot(bx - ax, bz - az) || 1;
    const t = Math.max(0, Math.min(1, ((ox - ax) * (bx - ax) + (oz - az) * (bz - az)) / (L * L)));
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t, d = Math.hypot(ox - x, oz - z);
    if (!best || d < best.d) best = { d, x, z, dx: (bx - ax) / L, dz: (bz - az) / L };
  }
  const sign = { kind: 'green', lines: ['137 S LÄSTRINGE', 'GNESTA'], exit: true };
  // across: tvärs över vägen, åt höger i färdriktningen österut (söderut, mot södra körbanan).
  // legs och off: meter längs across från norra körbanans mitt. face 0: skylten vänd mot trafiken
  // från sydväst, face 1: mot nordost.
  return [{ x: best.x, z: best.z, across: [-best.dz, best.dx], legs: [-6.2, 7.5, 21.2], height: 6.6,
    panels: [{ ...sign, off: -0.6, face: 0 }, { ...sign, off: 15.6, face: 1 }] }];
})();
// Placeringens fotavtryck för skyltarna: där de står nu (0.16.4, H234). I 0.16.3 låg de kvar där skyltarna stod
// i 0.16.2 (bland annat på väg 800:s asfalt före korsningen) för att inte röra balansen; nu räknas balansen om.
// Panelens bredd och ett smalt djup, och portalens ben.
export const SIGN_BLOCKS = [
  ...SIGNS.map(s => ({ x: s.x, z: s.z, ry: s.ry, w: s.kind === 'speed' ? 0.8 : signWidth(s), d: 0.6 })),
  ...GANTRIES.flatMap(g => g.legs.map(l => ({ x: g.x + g.across[0] * l, z: g.z + g.across[1] * l, ry: 0, w: 0.6, d: 0.6 }))),
];
// Höga belysningsstolpar runt korsningen (gatubilden), utöver rampernas och väg 800:s.
export const LAMPS = [w(1340, 392), w(1430, 420), w(1405, 470)];
// Stenblock och hällar i vägrenen och skogsbrynet.
export const ROCKS = [
  [1250, 560, 1.6], [1290, 600, 1.1], [1180, 740, 1.3], [1520, 590, 1.8], [1600, 610, 1.0], [1070, 740, 1.4],
  [880, 750, 1.2], [990, 650, 1.5], [1650, 560, 2.2], [700, 720, 1.1], [1420, 560, 1.0], [1150, 680, 1.7],
].map(([px, py, s]) => { const [x, z] = w(px, py); return { x, z, s }; });

// ---------- omgivningen utanför spelytan ----------
// 0.16.3 (H230, Olas "för mycket suddigt utanför, det får inte se så superkonstigt ut"): Sörmland fortsätter
// in i diset, efter översiktsbilden oversikt-vid.jpg (lokalt, inte i repot). Väg 224 norrut genom skogen,
// E4 åt båda hållen, den stora vallen norr om korsningen med ett dike och en kraftledning rakt igenom,
// plöjd åker i sydväst, grusvägar till tre gårdar (rött hus, ladugård, uthus) och några hus, kuperad
// granskog med hyggen och hällar. Bara att se på: inget här går att gå på eller bygga på. Meter, x öster,
// z söder. Ritas av src/render/e4-far.js.
const far = (pts, step = 3) => smooth(pts, step);
// E4:s norra körbana förlängd åt båda hållen (södra körbanan är den förskjuten 15 m, som på spelytan)
const E4_FAR = far([[-262, 94], [-205, 76], [-150, 60], [...ROADS.find(r => r.id === 'e4n').ptsRaw[0]],
  ...ROADS.find(r => r.id === 'e4n').ptsRaw.slice(1), [150, -7], [205, -13], [265, -19]], 4);
export const FAR = {
  e4: E4_FAR,
  roads: [
    { id: 'e4n', surface: 'asphalt', width: 8, lines: 'motorway', pts: E4_FAR },
    { id: 'e4s', surface: 'asphalt', width: 8, lines: 'motorway', pts: offsetLine(E4_FAR, 15) },
    { id: 'r800w', surface: 'asphalt', width: 7, lines: 'road', pts: far([[-79, 25], [-95, 30], [-118, 36], [-146, 39], [-182, 37], [-245, 31]]) },
    { id: 'r800ne', surface: 'asphalt', width: 7, lines: 'road', pts: far([[50, -51], [63, -61], [85, -77], [110, -95], [140, -119], [178, -152]]) },
    { id: 'r224n', surface: 'asphalt', width: 6.5, lines: 'road', pts: far([[-16, -50], [-13, -60], [-9, -80], [-4, -105], [3, -135], [13, -185]]) },
    // grusvägarna: skogsvägen norrut längs vallen till Norrgården, västerut till gården vid åkern, från
    // väg 800 österut till Österby, och en skogsväg söder om E4 till ett hygge med en virkesvälta, och en i sydväst
    { id: 'gravelA', surface: 'gravel', width: 3.4, pts: far([[-45, -28], [-50, -40], [-57, -56], [-64, -78], [-70, -95], [-76, -103]]) },
    { id: 'gravelB', surface: 'gravel', width: 3.4, pts: far([[-45, -28], [-61, -33], [-82, -34], [-104, -29], [-118, -21], [-124, -15]]) },
    { id: 'gravelC', surface: 'gravel', width: 3.4, pts: far([[86, -78], [98, -72], [110, -67], [117, -64]]) },
    { id: 'gravelD', surface: 'gravel', width: 3.2, pts: far([[215, 58], [170, 66], [130, 78], [104, 84], [92, 86]]) },
    { id: 'gravelE', surface: 'gravel', width: 3, pts: far([[-232, 124], [-180, 116], [-140, 106], [-108, 99]]) },
  ],
  // markslag: ley (vall, slagen), plough (plöjd åker), pasture (betesmark), clearcut (hygge), yard (gårdsplan)
  land: [
    // den stora vallen mellan skogsvägen och väg 224
    { kind: 'ley', pts: [[-47, -35], [-34, -37], [-27, -48], [-21, -64], [-15, -84], [-11, -104], [-8, -126], [-6, -160], [-55, -165], [-62, -136], [-66, -112], [-61, -94], [-55, -76], [-49, -57], [-44, -44]] },
    // betesmarken väster om skogsvägen vid Norrgården
    { kind: 'pasture', pts: [[-84, -86], [-72, -80], [-78, -112], [-92, -128], [-112, -122], [-108, -96]] },
    // plöjd åker i sydväst, mellan gården och väg 800
    { kind: 'plough', pts: [[-108, -8], [-128, -4], [-162, -6], [-200, -2], [-212, 26], [-176, 30], [-140, 31], [-112, 24]] },
    // Österbys hagar
    { kind: 'pasture', pts: [[112, -48], [138, -40], [166, -46], [168, -80], [140, -88], [120, -76]] },
    // hyggen: söder om E4 i öster (virkesvältan), i nordväst, nordost om väg 800 och söder om E4 i väster
    { kind: 'clearcut', pts: [[40, 66], [72, 58], [102, 66], [106, 98], [74, 112], [44, 100]] },
    { kind: 'clearcut', pts: [[-122, -48], [-98, -54], [-94, -80], [-116, -90], [-134, -70]] },
    { kind: 'clearcut', pts: [[58, -92], [86, -100], [98, -124], [72, -138], [52, -116]] },
    { kind: 'clearcut', pts: [[-126, 84], [-84, 76], [-72, 104], [-110, 118]] },
    // gårdsplanerna
    { kind: 'yard', pts: [[-84, -96], [-68, -98], [-66, -114], [-86, -116]] },
    { kind: 'yard', pts: [[-136, -24], [-122, -24], [-120, -6], [-138, -6]] },
    { kind: 'yard', pts: [[114, -70], [130, -70], [130, -54], [114, -54]] },
  ],
  // diket genom vallen med videbuskar, och kraftledningen snett över den (stolpar var ~50 m, gata i skogen)
  ditch: far([[-38, -40], [-36, -60], [-35, -82], [-33, -104], [-30, -128], [-28, -162]]),
  power: { from: [-210, -8], to: [120, -168], step: 50, corridor: 9 },
  // gårdarna: { x, z, ry, house: [w, d], barn: [w, d], sheds: [[x, z, w, d, ry]] } i gårdens ram
  farms: [
    { id: 'norrgarden', x: -76, z: -106, ry: 0.25, house: [11, 7], barn: [20, 10], sheds: [[-12, 9, 6, 4, 0.1], [9, -10, 5, 3.5, 1.57]] },
    { id: 'akern', x: -129, z: -15, ry: -0.3, house: [10, 6.5], barn: [16, 9], sheds: [[10, 8, 5, 3.5, 0]] },
    { id: 'osterby', x: 122, z: -62, ry: 0.6, house: [10, 7], barn: [18, 9], sheds: [[-10, 9, 6, 4, 0.2], [11, 9, 4, 3, 0]] },
  ],
  // lösa hus längs vägarna: [x, z, ry, färg]
  houses: [[-24, -118, 0.4, 'red'], [14, -122, -0.2, 'yellow'], [-162, 26, 0.1, 'red'], [150, -102, 0.7, 'white']],
  // hällar på höjderna: [x, z, storlek]
  outcrops: [[86, 46, 3.2], [132, 28, 4], [-72, 70, 3.4], [28, 74, 2.8], [-122, 70, 3], [60, -76, 3.6], [150, -18, 3.4],
    [-104, -66, 3.2], [-150, -44, 3], [30, -108, 3.8], [152, -108, 3.6], [-40, 88, 3], [110, 118, 3.4], [-88, -148, 3]],
  // virkesvältan vid skogsvägens slut och rundbalarna på vallen
  timber: [[96, 90, 0.2]],
  bales: [[-40, -70], [-36, -73], [-44, -92], [-26, -86], [-31, -118], [-48, -122], [-22, -66]],
};
export const SURROUNDINGS = {
  // Spelytan som är skarp. Utanför tonar allt mot diset.
  crisp: { x0: -60, x1: 66, z0: -31, z1: 38 },
  fade: 34,
  // 0.16.3: diset börjar 20 m utanför den skarpa ytan och är som tätast (90 %) 150 m ut
  haze: { start: 20, end: 150, max: 0.9 },
  extent: { x0: -270, x1: 270, z0: -200, z1: 190 },
  districts: [],
  far: FAR,
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
  for (const s of SIGN_BLOCKS) out.push(rect(s.x, s.z, s.ry, s.w, s.d));
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
// 0.16.0 (inlärningen, docs/superpowers/specs/2026-10-16-onboarding-design.md): ett begrepp per dag. Infanteriet
// står vid bommen från början (preset, visas men sägs inte), dag 1 har de markerade platserna för Ksp 90 (spots)
// och den andra Ksp 90 kommer efter första vågen (late). Dag 3 står pillboxen redan svetsad vid spärren.
// Introt är en rubrik och en rad (högst 12 ord); resten lär lektionerna ut (src/data/lessons.js).
const INF_AT = [1, -13], EPA_AT = [7, -13];
export const E4_SPOTS = [[3, -3], [-1, 1], [-15, 13], [-29, 17]];
export const DAYS = [
  { n: 1, intel: 'known', supplies: 300, startCash: 700, hp: 2.8,
    intro: { title: 'Day 1: The roadblock', text: 'North up the E4 from Nyköping. Keep them off väg 224.' },
    preset: [{ type: 'inf', at: INF_AT }], late: [{ type: 'm249', wave: 1 }], spots: E4_SPOTS,
    waves: [ { groups: [g('walker', 14, 1.2, 0, 'nykoping')] },
             { groups: [g('walker', 22, 0.8, 0, 'nykoping')] },
             // 0.16.1 (speltestet av 0.16.0: "sista vågen 2 till 3 gånger den näst sista", 14 / 22 / 40): 32 i våg 3
             { groups: [g('walker', 20, 0.6, 0, 'nykoping'), g('walker', 12, 0.5, 18, 'nykoping')] } ] },
  // 0.16.4 (Olas feedback: "dag 2 är orättvis, Södertälje kommer plötsligt och man kan inte flytta"): båda ingångarna
  // syns från början (foretell: etiketten "From wave 2" och vägen därifrån) och raden före våg 2 varnar. Move (M) var
  // dagens andra lektion; 0.20.0 (H497) kommer den med radion på Ishallen dag 3, och här flyttar man i uppställningen
  // mellan vågorna (Reposition). Kampanjbågen: gruppen går norrut längs E4 från Nyköping, Södertälje är dag 2:s överraskning.
  { n: 2, supplies: 250, startCash: 800, hp: 3.2, bounty: 0.6, foretell: ['sodertalje'],
    intro: { title: 'Day 2: Two roads', text: 'Runners from Nyköping, then Södertälje. Wire buys you time.' },
    preset: [{ type: 'inf', at: INF_AT }],
    waves: [ { groups: [g('walker', 14, 1.0, 0, 'nykoping'), g('runner', 6, 1.2, 8, 'nykoping')] },
             // 0.16.1 (speltestet av 0.16.0, 20 / 40 / 68): våg 2 44, våg 3 60 (fem klungor löpare i stället för sex)
             { groups: [g('walker', 14, 1.0, 0, 'nykoping'), g('runner', 15, 0.8, 4, 'sodertalje'), g('runner', 15, 0.8, 22, 'nykoping')] },
             { groups: [g('walker', 20, 0.7, 0, 'nykoping'), ...[3, 14, 25, 36, 47].map((delay, i) => g('runner', 8, 0.8, delay, i % 2 ? 'sodertalje' : 'nykoping'))] } ] },
  // 0.16.1 (H192, speltestet av 0.14.2: "dag 3 våg 3 är ett stup, 82 fiender, 20 till 5"): våg 2 har två
  // klungor bjässar och löpare från påfarten, så att basen känner av den (0 till 2), och våg 3 har 26 bjässar i
  // fyra klungor (var 36 i fem). Förut kom all skada i våg 3. Bounty 0,4 till 0,3: överskottet efter dagen var
  // 420 till 470 dollar och går nu till trådarna (170 till 200 kvar).
  { n: 3, supplies: 200, startCash: 1200, hp: 1.0, bounty: 0.3,
    intro: { title: 'Day 3: Brutes', text: 'Brutes from Nyköping and Södertälje. The Ksp 88 hits hard.' },
    preset: [{ type: 'epa', at: EPA_AT }, { type: 'inf', at: INF_AT }],
    waves: [ { groups: [g('walker', 18, 0.9, 0, 'nykoping'), g('runner', 8, 1.2, 5, 'sodertalje')] },
             { groups: [g('walker', 16, 0.8, 0, 'nykoping'), g('runner', 16, 0.5, 4, 'sodertalje'), g('brute', 7, 1.5, 10, 'nykoping'),
               g('brute', 6, 1.5, 28, 'sodertalje')] },
             { groups: [g('walker', 20, 0.8, 0, 'nykoping'), g('runner', 26, 0.5, 4, 'sodertalje'), g('brute', 7, 1.5, 8, 'nykoping'),
               g('brute', 7, 1.5, 24, 'sodertalje'), g('brute', 6, 1.5, 40, 'nykoping'), g('brute', 6, 1.5, 56, 'sodertalje')] } ] },
];
