// Bana 3: Gnesta Norr. Samma stad som Gnesta, dimman har dragit sig undan norrut: Fornminnesvägen
// med stickgatorna, Vikingavägen upp till Dansutvägen, radhusen öster om Vikingavägen, villorna
// mellan Vikingavägen och Fornminnesvägen, Förskola Ringleken och skogsbacken i väster.
// Kartan som data, utan three.js (testbar i node).
//
// Ritad ur referensbilderna i ~/Projects/horde-refs/gnesta-norr (karta.jpg och satellit.jpg,
// 1983 x 2000, Google-bilder som aldrig läggs i repot). Kartbildens pixlar (K) räknas om till
// Gnestas bildpixlar med en affin passning mot elva punkter som finns i båda bilderna (stickgatornas
// ändar, Fornminnesvägens ändar, Lekplatsen, rondellen; felet under 1 m), och sedan till meter med
// Gnestas halva skala (gnesta.js w). Allt från Gnesta (ishallen, rondellen, Sigtunavägens kvarter)
// är med oförändrat i söder. x = öster, z = söder.
//
// Husen är generiska villor och radhus på fotavtryckens platser, inte kopior av riktiga hem.
import { makeRng } from '../sim/rng.js';
import { rect } from '../sim/placement.js';
import {
  w, PX, smooth, distPolyline, inPoly, ROADS as G_ROADS, ROUNDABOUT, ICE_RINK, PARKING, SPORTHALL, GROUND as G_GROUND,
  LOTS as G_LOTS, CARS as G_CARS, PLAYGROUND, LABELS as G_LABELS, SPAWNS as G_SPAWNS, BASE, SURROUNDINGS as G_SUR,
  townGrid, townPlacement, PLINTH, CHIMNEY_PERCH,
} from './gnesta.js';

export const NORR_VERSION = '0.1.0';

// ---------- skala ----------
// Kartbildens pixel (K) till Gnestas bildpixel. Minsta kvadrat över elva gemensamma punkter.
export const k2g = (kx, ky) => [1.13036 * kx + 0.007016 * ky - 63.631, 0.00575 * kx + 1.137194 * ky - 1287.74];
export const K = (kx, ky) => w(...k2g(kx, ky));
const KS = pts => pts.map(([x, y]) => K(x, y));
const KM = 1.1304 * PX;                 // en K-pixel i meter (halv skala)
const HOUSE_K = 1.42;                   // villorna är lite större än halv skala (som i Gnesta)
const ROW_K = 1.12;                     // radhusen nästan i skala: längorna står tätt, gårdarna ska rymmas

// ---------- vägar ----------
// Gnestas vägar följer med. Fornminnesvägens norra stickgata (fornN1) och Vikingavägens stump
// (fornN2) ersätts av de långa vägarna norrut. Nya vägar: pts i K, eller w() för Gnestas punkter.
const NEW_ROADS = [
  { id: 'dansut', name: 'Dansutvägen', surface: 'asphalt', width: 6.5, curbs: true, lamps: { side: 1, step: 20 }, center: true,
    pts: KS([[338, 192], [585, 166], [850, 108], [1000, 71], [1100, 38], [1200, 14], [1320, 0], [1440, -6]]) },
  { id: 'vikLink', surface: 'asphalt', width: 5, curbs: true, pts: KS([[1440, -6], [1440, 30], [1440, 64]]) },
  { id: 'vikingavagen', name: 'Vikingavägen', surface: 'asphalt', width: 5.5, curbs: true, lamps: { side: -1, step: 21 },
    pts: [...KS([[1690, -8], [1600, 14], [1520, 36], [1440, 64], [1360, 82], [1240, 108], [1197, 122], [1160, 150], [1149, 200],
      [1163, 240], [1180, 300], [1208, 360], [1234, 440], [1261, 520], [1280, 580], [1303, 640], [1344, 720], [1366, 780],
      [1372, 840], [1378, 900], [1374, 960], [1368, 1040], [1362, 1120]]), w(1482, 60)] },
  { id: 'vikW', surface: 'asphalt', width: 4.5, curbs: true, turn: true, pts: KS([[1152, 266], [1080, 289], [1004, 314]]) },
  { id: 'vikE1', surface: 'asphalt', width: 4.5, curbs: true, turn: true, pts: KS([[1185, 318], [1260, 304], [1328, 290]]) },
  { id: 'vikE2', surface: 'asphalt', width: 4.5, curbs: true, turn: true, pts: KS([[1288, 600], [1360, 583], [1436, 562]]) },
  { id: 'vikE3', surface: 'asphalt', width: 4.5, curbs: true, turn: true, pts: KS([[1378, 898], [1450, 902], [1526, 903]]) },
  { id: 'fornN1', name: 'Fornminnesvägen', surface: 'asphalt', width: 4.5, curbs: true, turn: true,
    pts: [w(1287, 45), ...KS([[1190, 1080], [1197, 960], [1204, 878]])] },
  // Förskolans slinga: från Fornminnesvägens stickgata förbi parkeringen ner till Fornminnesvägen.
  { id: 'forskP', surface: 'asphalt', width: 4.5, curbs: true, pts: [...KS([[1190, 1093], [1120, 1092], [1072, 1091], [1044, 1106], [1034, 1130]]), w(1108, 36)] },
  // Grusstigar mellan villatomterna från stickgatornas vändplaner till Gångvägen (tomtgränserna i
  // kartbilden; i satellitbilden går de som upptrampade gångar mellan häckarna).
  { id: 'stig1', surface: 'gravel', width: 2.4, pts: KS([[1328, 290], [1410, 296], [1494, 304]]) },
  { id: 'stig2', surface: 'gravel', width: 2.4, pts: KS([[1436, 562], [1510, 548], [1580, 534]]) },
  // Gångvägen: den långa raka asfaltsgången från Vikingavägens krök ner till Sigtunavägens
  // norra gren (Gnestas 'east'), förbi radhusen.
  { id: 'gangvag', name: 'Gångvägen', surface: 'asphalt', width: 3.4,
    pts: [...KS([[1440, 64], [1452, 160], [1476, 240], [1503, 320], [1529, 400], [1557, 480], [1583, 560], [1609, 640], [1640, 720],
      [1665, 800], [1692, 880], [1725, 960], [1758, 1040], [1778, 1085]]), w(1966, -20)] },
  // Gångarna mellan radhuslängorna (asfalt, smala).
  { id: 'p2', name: 'Radhusgången', surface: 'asphalt', width: 3, pts: KS([[1690, -8], [1738, 6], [1763, 80], [1790, 160], [1817, 240], [1842, 320],
    [1868, 400], [1894, 480], [1920, 560], [1946, 638]]) },
  { id: 'c1', surface: 'asphalt', width: 3, pts: KS([[1530, 360], [1640, 328], [1760, 293], [1880, 262], [1990, 240]]) },
  { id: 'c2', surface: 'asphalt', width: 3, pts: KS([[1640, 724], [1720, 703], [1806, 670], [1880, 655], [1946, 638]]) },
  { id: 'p3', surface: 'asphalt', width: 3, pts: KS([[1806, 670], [1834, 760], [1861, 840], [1887, 920], [1914, 1000], [1940, 1037]]) },
  { id: 'c3', surface: 'asphalt', width: 3, pts: KS([[1778, 1085], [1840, 1060], [1880, 1045], [1940, 1037], [1990, 1030]]) },
  // 0.11.0: ut i dimkanten för ingångarna (Olas krav). Sidogatan norrut från Dansutvägen (spöklagrets
  // väg dit), Vikingavägen norrut och gången vid radhusen österut mot Östra Storgatan.
  { id: 'dansN', surface: 'asphalt', width: 5, curbs: true, fog: true, pts: KS([[1000, 71], [1003, -40], [1008, -150]]) },
  // (Vikingavägens fortsättning norrut, inte österut: österut nådde den Radhusgången först och horden
  // tog den vägen i stället för Vikingavägen.)
  { id: 'vikFog', name: 'Vikingavägen', surface: 'asphalt', width: 5.5, curbs: true, fog: true, pts: KS([[1690, -8], [1672, -60], [1652, -125]]) },
  { id: 'c3fog', surface: 'asphalt', width: 3, fog: true, pts: KS([[1990, 1030], [2060, 1022], [2160, 1012]]) },
  // 0.12.0 (H115, speltestet av 0.11.0: "södra gruppen dyker upp mitt på kartan intill ishallen"):
  // Sigtunavägen fortsätter västerut ut i diset, så att öppningen kommer ur dimman som de andra.
  { id: 'sigWFog', name: 'Sigtunavägen', surface: 'asphalt', width: 6.5, curbs: true, fog: true, pts: [[-143.45, 2.85], [-162, -2.9], [-181, -8.8], [-196, -13.4]] },
  // Valsvägen och Hambovägen i nordväst: återvändsgator, horden har inget där att göra.
  { id: 'vals', name: 'Valsvägen', surface: 'asphalt', width: 4.5, curbs: true, turn: true, pts: KS([[578, 166], [590, 240], [604, 290], [637, 360], [646, 440], [658, 500]]) },
  { id: 'hambo', name: 'Hambovägen', surface: 'asphalt', width: 4.5, curbs: true, turn: true, pts: KS([[618, 378], [519, 404], [440, 425], [381, 442], [310, 474]]) },
];
// 0.11.0: Gnestas dimvägar mot Norra vägen och skogsvägen ligger här inne i den skarpa ytan eller
// används inte; Sigtunavägens (east1, dag 5) är med.
const DROP = new Set(['fornN2', 'eastFog', 'forestFog']);
export const ROADS = [
  ...G_ROADS.filter(r => !DROP.has(r.id) && r.id !== 'fornN1'),
  ...NEW_ROADS.map(r => ({ ...r, walk: r.walk !== false, ptsRaw: r.pts, pts: r.pts.length > 2 ? smooth(r.pts) : r.pts.map(p => [...p]) })),
];
export const road = id => ROADS.find(r => r.id === id);
const walkRoads = ROADS.filter(r => r.walk);
const nearRoad = (x, z, pad = 0) => ROADS.some(r => distPolyline(x, z, r.pts) < r.width / 2 + pad);

// ---------- radhusen ----------
// Längorna: första och sista lägenhetens mitt i K, antal lägenheter, djup i K, våningar och gatan
// som entréerna vetter mot. Ola: gult tegel nertill, mörkbrun panel upptill eller i gaveln, bruna
// tegeltak med en skorsten per lägenhet, vita dörrar, låga gula tegelmurar mellan förgårdarna,
// plankstaket mellan baksidorna, gångar mellan längorna och parkering framför.
const ROWS_K = [
  { id: 'A', from: [1581, 105], to: [1624, 283], units: 7, depth: 49, storeys: 2, faceTo: 'gangvag' },
  { id: 'B', from: [1693, 74], to: [1720, 158], units: 4, depth: 44, storeys: 1, faceTo: 'p2' },
  { id: 'C', from: [1748, 342], to: [1799, 322], units: 3, depth: 44, storeys: 1, faceTo: 'c1' },
  { id: 'D', from: [1605, 399], to: [1668, 377], units: 3, depth: 44, storeys: 1, faceTo: 'c1' },
  { id: 'E', from: [1702, 478], to: [1752, 628], units: 6, depth: 42, storeys: 2, faceTo: 'gangvag' },
  { id: 'F', from: [1826, 465], to: [1836, 493], units: 2, depth: 46, storeys: 1, faceTo: 'p2' },
  { id: 'G', from: [1718, 760], to: [1778, 740], units: 2, depth: 40, storeys: 1, faceTo: 'c2' },
  { id: 'G2', from: [1884, 716], to: [1936, 698], units: 2, depth: 44, storeys: 1, faceTo: 'c2' },
  { id: 'H', from: [1790, 842], to: [1840, 992], units: 6, depth: 50, storeys: 2, faceTo: 'p3' },
  { id: 'I', from: [1851, 1110], to: [1905, 1092], units: 3, depth: 42, storeys: 1, faceTo: 'c3' },
];
const ROW_PLINTH = 0.3;
export const ROW_WALL = { 1: 2.7, 2: 5.3 };      // vägghöjd till takfoten per antal våningar
export const ROW_PITCH = 0.47;
function buildRows() {
  const r = makeRng(20261016);
  return ROWS_K.map(R => {
    const [ax, az] = K(...R.from), [bx, bz] = K(...R.to);
    const span = Math.hypot(bx - ax, bz - az) * ROW_K;
    const unitW = span / Math.max(1, R.units - 1);
    const len = unitW * R.units, depth = R.depth * KM * ROW_K;
    const x = (ax + bx) / 2, z = (az + bz) / 2;
    const ux = (bx - ax) / Math.hypot(bx - ax, bz - az), uz = (bz - az) / Math.hypot(bx - ax, bz - az);
    // framsidan: den normal som pekar mot gatan entréerna vetter mot
    const rd = road(R.faceTo);
    let fx = -uz, fz = ux;
    if (distPolyline(x + fx * 6, z + fz * 6, rd.pts) > distPolyline(x - fx * 6, z - fz * 6, rd.pts)) { fx = -fx; fz = -fz; }
    const ry = Math.atan2(fx, fz);
    return { id: R.id, x, z, ry, units: R.units, unitW, len, depth, storeys: R.storeys, faceTo: R.faceTo, f: [fx, fz],
      seed: (r() * 1e9) | 0, chimneys: true, roofColor: r() < 0.5 ? 'tile' : 'tileDark' };
  });
}
export const ROWS = buildRows();
// Punkt i längans ram (lx längs längan, lz mot framsidan) till världen.
export const rowAt = (R, lx, lz) => [R.x + lx * Math.cos(R.ry) + lz * Math.sin(R.ry), R.z - lx * Math.sin(R.ry) + lz * Math.cos(R.ry)];
export const rowRect = (R, pad = 0) => rect(R.x, R.z, R.ry, R.len + pad * 2, R.depth + pad * 2);

// ---------- parkeringarna ----------
// Rutor med vita vinklar (som på bilderna), i rader längs parkeringens långsida. poly i K
// (fyra hörn, långsidan först), rows: en eller två rader, cars: andel rutor med bil.
const LOTS_K = [
  { id: 'PA', poly: [[1688, 214], [1772, 190], [1786, 236], [1702, 260]], rows: 2, cars: 0.55 },
  { id: 'PE', poly: [[1766, 404], [1842, 384], [1852, 420], [1776, 440]], rows: 1, cars: 0.5 },
  // framför längorna A och E, mellan förgårdarnas murar och Gångvägen (som på bilderna)
  { id: 'PAf', row: 'A', gap: 3.8, depth: 5.4, trim: 2.5, rows: 1, cars: 0.6 },
  { id: 'PEf', row: 'E', gap: 3.8, depth: 5.4, trim: 2, rows: 1, cars: 0.55 },
  // Förskolans parkering mellan slingan och Fornminnesvägen.
  { id: 'PF', poly: [[1066, 1108], [1172, 1108], [1172, 1142], [1066, 1142]], rows: 1, cars: 0.4 },
];
const BAY = 2.6, BAY_DEPTH = 5;
function buildLots() {
  const r = makeRng(1016);
  return LOTS_K.map(L => {
    let poly;
    if (L.row) {
      // i längans ram: rakt framför förgårdarna, långsidan längs längan (närmast längan först)
      const R = ROWS.find(q => q.id === L.row), z0 = R.depth / 2 + L.gap, x0 = R.len / 2 - L.trim;
      poly = [rowAt(R, x0, z0), rowAt(R, -x0, z0), rowAt(R, -x0, z0 + L.depth), rowAt(R, x0, z0 + L.depth)];
    } else poly = KS(L.poly);
    const [a, b, , d] = poly;
    const ux = b[0] - a[0], uz = b[1] - a[1], ul = Math.hypot(ux, uz);
    const vx = d[0] - a[0], vz = d[1] - a[1], vl = Math.hypot(vx, vz);
    const u = [ux / ul, uz / ul], v = [vx / vl, vz / vl];
    const n = Math.floor((ul - 1) / BAY);
    const rows = [];
    // en rad längs ena långsidan, eller två rygg mot rygg
    const offs = L.rows === 2 ? [Math.min(BAY_DEPTH / 2 + 0.3, vl / 4), vl - Math.min(BAY_DEPTH / 2 + 0.3, vl / 4)] : [Math.min(BAY_DEPTH / 2 + 0.3, vl / 2)];
    const cars = [];
    for (const off of offs) {
      // rutorna räknas från långsidan a-b (raden närmast den)
      const lines = [];
      for (let i = 0; i <= n; i++) {
        const s = (ul - n * BAY) / 2 + i * BAY;
        lines.push([a[0] + u[0] * s + v[0] * off, a[1] + u[1] * s + v[1] * off]);
      }
      rows.push({ lines, depth: Math.min(BAY_DEPTH, vl / L.rows - 0.4), u, v });
      for (let i = 0; i < n; i++) {
        if (r() > L.cars) continue;
        const [lx, lz] = lines[i], [mx, mz] = lines[i + 1];
        // bilens längd längs rutan (v), nosen åt endera hållet
        const ry = Math.atan2(-v[1], v[0]) + (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5) * 0.08;
        cars.push({ x: (lx + mx) / 2, z: (lz + mz) / 2, ry, color: (r() * 8) | 0 });
      }
    }
    // ram för byggsatsen (gnesta-kit.js parkingLot): lokal x längs u, lokal +z längs v
    let ry = Math.atan2(-u[1], u[0]);
    if (Math.sin(ry) * v[0] + Math.cos(ry) * v[1] < 0) ry += Math.PI;
    const x = poly.reduce((s0, q) => s0 + q[0], 0) / 4, z = poly.reduce((s0, q) => s0 + q[1], 0) / 4;
    return { id: L.id, poly, rows, cars, u, v, ry, x, z, len: ul, depth: vl, bay: BAY };
  });
}
export const PARKING_LOTS = buildLots();

// ---------- villorna ----------
// Fotavtryck i K: [mitt x, mitt y, längd, bredd, vinkel i grader (långsidan, bildens medurs)],
// ur kartbildens husformer. kind: 'garage' blir ett fristående garage (inget tak att ligga på).
const VILLAS_K = [
  // väster om Vikingavägen, vid stickgatan åt väster
  [941, 228, 60, 44, 73], [1057, 194, 66, 41, 73], [1134, 316, 48, 37, 83], [1104, 352, 66, 48, 58],
  // mellan Vikingavägen och Gångvägen
  [1344, 199, 70, 40, 73], [1267, 216, 79, 45, 73],
  [1400, 322, 69, 42, 162], [1306, 368, 92, 56, -174], [1446, 473, 64, 38, 73], [1360, 497, 54, 42, 70],
  [1494, 604, 60, 39, 161], [1388, 630, 56, 39, 163], [1467, 813, 64, 39, 73], [1549, 818, 69, 39, 72],
  [1441, 950, 48, 35, 94], [1560, 974, 90, 58, 153], [1437, 1084, 56, 37, 94], [1587, 1091, 55, 36, 96], [1665, 1097, 46, 30, 95],
  // mellan Fornminnesvägens stickgata och Vikingavägen, och väster om stickgatan
  [1280, 884, 50, 39, 93], [1269, 991, 60, 40, 90], [1254, 1095, 53, 42, 95],
  [1137, 912, 64, 52, 135], [1135, 995, 59, 36, 94],
  // Valsvägen och Hambovägen
  [682, 262, 60, 44, 164], [699, 315, 44, 40, 161], [709, 371, 44, 34, 162], [729, 418, 51, 30, 162], [719, 465, 43, 31, 162],
  [561, 322, 49, 42, 76], [501, 326, 50, 45, 162], [440, 340, 56, 49, 95], [380, 352, 54, 35, 73],
  [602, 458, 50, 42, 73], [544, 474, 50, 43, 77], [485, 494, 50, 41, 74], [425, 510, 60, 50, 55],
];
const FACADES = ['white', 'white', 'grey', 'yellow', 'brick', 'brickGrey', 'blueGrey', 'brown', 'red', 'beige'];
const ROOFS = ['black', 'black', 'charcoal', 'charcoal', 'tile', 'slate'];
const rowRects = ROWS.map(R => rowRect(R, 0.5));
const inAnyRect = (rs, x, z, pad = 0) => rs.some(q => { const dx = x - q.x, dz = z - q.z; return Math.abs(dx * q.c - dz * q.s) <= q.hw + pad && Math.abs(dx * q.s + dz * q.c) <= q.hd + pad; });

const corners = q => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [q.x + a * q.hw * q.c + b * q.hd * q.s, q.z - a * q.hw * q.s + b * q.hd * q.c]);
// 0.17.2 (H307): hörnen och kanternas mitt (en gångväg som går in i en vägg mitt på räknas också)
const outline = q => [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].map(([a, b]) => [q.x + a * q.hw * q.c + b * q.hd * q.s, q.z - a * q.hw * q.s + b * q.hd * q.c]);
// Överlappar två rektanglar (separerande axlar)?
function rectsOverlap(p, q) {
  for (const r of [p, q]) for (const [ax, az] of [[r.c, -r.s], [r.s, r.c]]) {
    const pr = o => corners(o).map(([x, z]) => x * ax + z * az);
    const a = pr(p), b = pr(q);
    if (Math.max(...a) < Math.min(...b) || Math.max(...b) < Math.min(...a)) return false;
  }
  return true;
}
function buildVillas() {
  const r = makeRng(20261017);
  const pick = a => a[(r() * a.length) | 0];
  const plots = [], edges = [];
  // husen först (för grannarnas avstånd), sedan tomterna
  const houses = VILLAS_K.map(([kx, ky, L, Wd, deg], i) => {
    const [cx, cz] = K(kx, ky), t = deg * Math.PI / 180;
    const a = [Math.cos(t), Math.sin(t)], b = [-Math.sin(t), Math.cos(t)];
    // närmaste gångbara gata: huset vänder framsidan dit
    let best = null, bd = Infinity;
    for (const rd of walkRoads) {
      if (rd.id === 'entrance') continue;
      for (let k = 1; k < rd.pts.length; k++) {
        const [px, pz] = rd.pts[k];
        const d = Math.hypot(px - cx, pz - cz);
        if (d < bd) { bd = d; best = [px, pz]; }
      }
    }
    const dv = [best[0] - cx, best[1] - cz];
    const axes = [[a, L, Wd], [[-a[0], -a[1]], L, Wd], [b, Wd, L], [[-b[0], -b[1]], Wd, L]];
    // axes: [riktning för framsidan, utsträckning längs framsidans normal (djup), bredd]
    let f = null, deep = 0, wide = 0, fd = -Infinity;
    for (const [dir, dp, wd] of axes) { const s = dir[0] * dv[0] + dir[1] * dv[1]; if (s > fd) { fd = s; f = dir; deep = dp; wide = wd; } }
    return { i, cx, cz, f, ry: Math.atan2(f[0], f[1]), w0: wide * KM, d0: deep * KM, k: HOUSE_K };
  });
  // Uppskalningen krymps hus för hus tills grannarna (och radhusen) får plats: villorna står
  // tätare här än i Gnesta. Minst skala 1 (halva verkligheten, som kartan).
  const sized = h => ({ w: Math.max(4.4, h.w0 * h.k), d: Math.max(4.4, h.d0 * h.k) });
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (const h of houses) {
      const me = sized(h), q = rect(h.cx, h.cz, h.ry, me.w + 3, me.d + 3);
      const hit = houses.some(o => o !== h && rectsOverlap(q, rect(o.cx, o.cz, o.ry, sized(o).w + 3, sized(o).d + 3)))
        || rowRects.some(o => rectsOverlap(q, o)) || outline(rect(h.cx, h.cz, h.ry, me.w, me.d)).some(([x, z]) => nearRoad(x, z, 1.2));
      if (hit && h.k > 0.951) { h.k = Math.max(0.95, h.k * 0.94); moved = true; }
    }
    if (!moved) break;
  }
  for (const h of houses) Object.assign(h, sized(h));
  // 0.17.2 (H307): ett hus som fortfarande står på en gångväg backar bort från gatan, högst 3 m
  for (const h of houses) for (let t = 0; t < 12 && outline(rect(h.cx, h.cz, h.ry, h.w, h.d)).some(([x, z]) => nearRoad(x, z, 0.3)); t++) { h.cx -= h.f[0] * 0.25; h.cz -= h.f[1] * 0.25; }
  const houseRects = houses.map(h => rect(h.cx, h.cz, h.ry, h.w, h.d));
  for (const h of houses) {
    const f = h.f, s = [Math.cos(h.ry), -Math.sin(h.ry)];
    const at = (ls, lf) => [h.cx + s[0] * ls + f[0] * lf, h.cz + s[1] * ls + f[1] * lf];
    // Tomtens kanter: ut från husväggen tills en gata, en annan tomt eller ett radhus är nära.
    const others = houseRects.filter((_, j) => j !== h.i);
    const reach = (dirS, dirF, from, cap) => {
      let d = 0;
      for (; d < cap; d += 0.25) {
        const [x, z] = at(dirS * (dirS ? h.w / 2 + d : 0), dirF * (dirF ? h.d / 2 + d : 0));
        if (nearRoad(x, z, 0.7) || inAnyRect(others, x, z, d + 0.6) || inAnyRect(rowRects, x, z, d + 0.6)) break;
      }
      void from;
      return d;
    };
    const front = Math.max(2.4, reach(0, 1, 0, 8)), back = Math.max(1.6, reach(0, -1, 0, 6));
    const left = Math.max(1.2, reach(-1, 0, 0, 3.6)), right = Math.max(1.2, reach(1, 0, 0, 3.6));
    const sMin = -h.w / 2 - left, sMax = h.w / 2 + right, fMin = -h.d / 2 - back, fMax = h.d / 2 + front;
    const corners = [at(sMin, fMax), at(sMax, fMax), at(sMax, fMin), at(sMin, fMin)];
    const storeys = r() < 0.36 ? 1.5 : 1;
    const garage = (r() < 0.45 && Math.max(left, right) > 4.2) ? (left > right ? -1 : 1) : 0;
    const house = {
      x: h.cx, z: h.cz, ry: h.ry, w: h.w, d: h.d, kind: 'villa', storeys,
      roof: r() < 0.3 ? 'hip' : 'gable', ridge: storeys === 1.5 && r() < 0.6 ? 'z' : 'x',
      facade: pick(FACADES), roofColor: pick(ROOFS), garage,
      chimney: r() < 0.6, veranda: r() < 0.35, solar: r() < 0.18, seed: (r() * 1e9) | 0,
    };
    if (house.ridge === 'z') house.balcony = true;
    const face = 'N';
    const plot = { id: `N-${h.i}`, block: 'N', i: h.i, j: 0, corners, face, f, park: false, house, extras: [], free: true };
    // uppfart mot gatan på husets ena sida
    const dSide = garage || (r() < 0.5 ? -1 : 1);
    const ds = garage ? garage * (h.w / 2 + 1.9) : dSide * (h.w / 2 - 1.6);
    const dsC = Math.min(Math.max(ds, sMin + 1.8), sMax - 1.8);
    plot.drive = { a: at(dsC, h.d / 2 - (garage ? h.d * 0.45 : -0.2)), b: at(dsC, fMax + 0.2), width: 3, surface: r() < 0.5 ? 'gravel' : 'paving' };
    const ex = (kind, s0, f0, o = {}) => { const [x, z] = at(s0, f0); plot.extras.push({ kind, x, z, ry: h.ry + (o.turn || 0), ...o }); };
    ex('mailbox', dsC + (dsC > 0 ? 1.9 : -1.9), fMax - 0.35, { n: 1 + ((r() * 2) | 0) });
    if (front > 3.6 && r() < 0.6) ex('car', dsC, h.d / 2 + 2.6, { turn: Math.PI / 2 + (r() < 0.5 ? Math.PI : 0), color: (r() * 6) | 0 });
    if (back > 3.4 && r() < 0.3) ex('trampoline', (r() - 0.5) * h.w * 0.5, -h.d / 2 - back / 2);
    else if (back > 2.6 && r() < 0.5) ex('furniture', (r() - 0.5) * h.w * 0.5, -h.d / 2 - back / 2 + 0.4, { turn: r() * 3 });
    for (let t = 0, nT = 1 + ((r() * 2.4) | 0); t < nT; t++) {
      const sd = r() < 0.5 ? -1 : 1, s0 = sd < 0 ? sMin + 1 + r() * 0.6 : sMax - 1 - r() * 0.6;
      const f0 = fMin + 1.2 + r() * Math.max(0.1, fMax - fMin - 2.4);
      if (Math.abs(s0) < h.w / 2 + 1.2 && Math.abs(f0) < h.d / 2 + 1.2) continue;
      if (Math.abs(s0 - dsC) < 2.4 && f0 > h.d / 2 - 1) continue;
      ex('tree', s0, f0, { h: 4.5 + r() * 3.5, k: (r() * 3) | 0 });
    }
    plots.push(plot);
    // staket och häckar runt tomten: mot gatan blandat, annars mest häck
    const kindFor = ext => { const x = r(); return ext === 'road' ? (x < 0.42 ? 'hedge' : x < 0.62 ? 'hedgeSlat' : x < 0.78 ? 'picket' : 'slat') : (x < 0.6 ? 'hedge' : x < 0.8 ? 'slat' : 'none'); };
    const sides = [[corners[0], corners[1], 'road', 'N'], [corners[1], corners[2], null, 'E'], [corners[2], corners[3], null, 'S'], [corners[3], corners[0], null, 'W']];
    for (const [a, b, ext, side] of sides) {
      const e = { a, b, kind: kindFor(ext), ext, plot: ext ? plot.id : null, side: ext ? side : null };
      // en kant som går genom grannens hus eller över en gata blir ingen häck
      for (let t = 0; t <= 1; t += 0.1) {
        const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
        if (inAnyRect(others, x, z, 0.8) || inAnyRect(rowRects, x, z, 0.3) || nearRoad(x, z, 0.2)) { e.kind = 'none'; break; }
      }
      if (ext) {
        const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
        e.gap = { t: ((plot.drive.b[0] - a[0]) * dx + (plot.drive.b[1] - a[1]) * dz) / L2, len: 3.4 };
      }
      edges.push(e);
    }
  }
  return { plots, edges };
}
const VILLAS = buildVillas();

// Förskola Ringleken: Gnestas förskola (kvarteret B0) får en inhägnad lekgård på västra sidan.
const PRESCHOOL = G_LOTS.plots.find(p => p.house?.kind === 'preschool').house;
export const FORSKOLA_YARD = (() => {
  const [x, z] = K(820, 1205);
  return { center: [x, z], ry: PRESCHOOL.ry, w: 11, d: 15 };
})();

// ---------- radhusens gårdar: murar och staket ----------
// Mellan förgårdarna låga gula tegelmurar (Hemvärnet tar skydd där), mellan baksidorna plankstaket.
// Varje bit kortas så att den slutar en bit från gatan, en annan länga och tomterna.
const villaRects = VILLAS.plots.map(p => rect(p.house.x, p.house.z, p.house.ry, p.house.w + 2, p.house.d + 2));
function clipSeg(R, lx, z0, z1) {
  // från z0 mot z1 i längans ram, kortad där den möter något
  const step = 0.2, dir = Math.sign(z1 - z0);
  let z = z0;
  for (; Math.abs(z - z0) < Math.abs(z1 - z0); z += dir * step) {
    const [x, zz] = rowAt(R, lx, z + dir * step);
    if (nearRoad(x, zz, 0.9) || inAnyRect(rowRects.filter((_, i) => ROWS[i] !== R), x, zz, 0.3) || inAnyRect(villaRects, x, zz)) break;
  }
  return z;
}
function buildYards() {
  const brick = [], plank = [], yards = [];
  for (const R of ROWS) {
    const L = R.len, D = R.depth;
    const fz0 = D / 2, fz1 = clipSeg(R, 0, D / 2, D / 2 + 3.2), bz1 = clipSeg(R, 0, -D / 2, -D / 2 - 5);
    // förgården och baksidan som ytor (gräs, och ingen skog)
    yards.push({ row: R.id, front: [rowAt(R, -L / 2 - 3.2, fz1 + 0.4), rowAt(R, L / 2 + 3.2, fz1 + 0.4), rowAt(R, L / 2 + 3.2, bz1 - 0.4), rowAt(R, -L / 2 - 3.2, bz1 - 0.4)] });
    for (let u = 0; u <= R.units; u++) {
      const lx = -L / 2 + u * R.unitW;
      const end = u === 0 || u === R.units;
      const f1 = clipSeg(R, lx, fz0, fz0 + (end ? 3.2 : 2.6));
      if (f1 - fz0 > 0.8) brick.push({ row: R.id, a: rowAt(R, lx, fz0), b: rowAt(R, lx, f1), h: end ? 1.7 : 1.25 });
      const b1 = clipSeg(R, lx, -D / 2, -D / 2 - 5);
      if (-D / 2 - b1 > 0.8) plank.push({ row: R.id, a: rowAt(R, lx, -D / 2), b: rowAt(R, lx, b1), h: 1.6 });
    }
    // gavelmurarna: från längans hörn ut längs framsidan och runt gavelträdgården
    for (const sx of [-1, 1]) {
      const ex = sx * (L / 2 + 3);
      const [x, z] = rowAt(R, ex, 0);
      if (!nearRoad(x, z, 1) && !inAnyRect(rowRects.filter((_, i) => ROWS[i] !== R), x, z, 0.3)) {
        const z1 = clipSeg(R, ex, D / 2, -D / 2 - 3);
        brick.push({ row: R.id, a: rowAt(R, sx * L / 2, D / 2), b: rowAt(R, ex, D / 2), h: 1.7 });
        if (D / 2 - z1 > 1) brick.push({ row: R.id, a: rowAt(R, ex, D / 2), b: rowAt(R, ex, z1), h: 1.7 });
      }
    }
    // bakre staketet längs tomtgränsen
    if (-D / 2 - bz1 > 1.6) plank.push({ row: R.id, a: rowAt(R, -L / 2, bz1), b: rowAt(R, L / 2, bz1), h: 1.6, back: true });
  }
  return { brick, plank, yards };
}
export const YARDS = buildYards();

// ---------- mark ----------
// Skogsbacken väster om Vikingavägen (sluten terräng: tät skog, ingen stig syns i bilderna).
// Tomterna, gårdarna och vägarna hålls fria (clearings).
export const GROUND = {
  bounds: { x0: -142, x1: 102, z0: -192, z1: 92 },
  ppm: 13,
  forest: [
    ...G_GROUND.forest,
    KS([[-200, 230], [300, 212], [560, 196], [620, 220], [760, 196], [880, 140], [1000, 110], [1110, 230], [1150, 380], [1205, 520],
      [1255, 680], [1300, 820], [1240, 840], [1170, 860], [1090, 880], [1070, 1060], [990, 1070], [930, 1110], [840, 1140], [790, 1200],
      [760, 1300], [-200, 1300]]),
    // en remsa skog mellan Dansutvägen och husen på norra sidan (spöklagret tar över bortom)
    KS([[-200, 60], [600, 60], [1000, -20], [1300, -60], [1300, -200], [-200, -200]]),
  ],
  field: G_GROUND.field,
  gravelField: G_GROUND.gravelField,
};
export const CLEARINGS = [
  ...VILLAS.plots.map(p => p.corners),
  ...YARDS.yards.map(y => y.front),
  ...ROWS.map(R => [rowAt(R, -R.len / 2 - 4, R.depth / 2 + 4), rowAt(R, R.len / 2 + 4, R.depth / 2 + 4), rowAt(R, R.len / 2 + 4, -R.depth / 2 - 5), rowAt(R, -R.len / 2 - 4, -R.depth / 2 - 5)]),
  ...PARKING_LOTS.map(l => l.poly),
  (() => { const Y = FORSKOLA_YARD, c = Math.cos(Y.ry), s = Math.sin(Y.ry); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [Y.center[0] + a * (Y.w / 2 + 2) * c + b * (Y.d / 2 + 2) * s, Y.center[1] - a * (Y.w / 2 + 2) * s + b * (Y.d / 2 + 2) * c]); })(),
];

// ---------- tomter, bilar, gatunamn ----------
export const LOTS = { plots: [...G_LOTS.plots, ...VILLAS.plots], edges: [...G_LOTS.edges, ...VILLAS.edges], blocks: G_LOTS.blocks };
export const CARS = [...G_CARS, ...PARKING_LOTS.flatMap(l => l.cars)];
export const LABELS = [
  ...G_LABELS,
  { text: 'Dansutvägen', at: K(700, 150) },
  { text: 'Vikingavägen', at: K(1310, 690) },
  { text: 'Vikingavägen', at: K(1280, 96) },
  { text: 'Gångvägen', at: K(1590, 600) },
  { text: 'Valsvägen', at: K(640, 400) },
  { text: 'Hambovägen', at: K(470, 430) },
  { text: 'Förskola Ringleken', at: K(880, 1150) },
  { text: 'Radhusen', at: K(1680, 420) },
];

// ---------- spawn och bas ----------
// Horden kommer mest norrifrån: Dansutvägen väster (dag 1), Vikingavägen norr från Dansutvägen
// öster (dag 2), och överraskningen dag 4: genom radhusen från Östra Storgatan i öster.
// Sigtunavägen öst (Gnestas gamla front) är med dag 5.
export const SPAWNS = [
  // 0.10.1: in längs Dansutvägen (var K(344, 192) vid dimkanten), 420 m till entrén med spärren (var 506)
  // 0.11.0: alla i dimkanten utanför den skarpa ytan (Olas krav), horden går fortare där.
  { id: 'dansW', name: 'Dansutvägen west', day: 1, at: K(1006, -120) },
  { id: 'vikN', name: 'Vikingavägen north', day: 2, at: K(1658, -108) },
  { id: 'ostra', name: 'Östra Storgatan', day: 4, at: K(2130, 1015) },
  { ...G_SPAWNS.find(s => s.id === 'east1'), day: 5 },
  // 0.11.0 (Olas idé): öppningen. Dagens första våg är en liten grupp söderifrån, Sigtunavägen från
  // dimman i väster förbi ishallen, så att spelaren har något att skjuta på inom 10 till 15 s medan
  // linjen i norr byggs. Sist i listan så att de andra ingångarnas ordning är som förut.
  // 0.12.0 (H115): 66 m ut i diset (var 15 m), längre än dimmans 42 m: ingen ser dem dyka upp.
  { id: 'sigW', name: 'Sigtunavägen west', day: 1, at: [-188, -11] },
];

// ---------- radhusen i placeringen ----------
// Längorna är hus (skymmer sikten), med tak för Psg 90: sadeltak med nocken längs längan.
// 0.12.0 (H106): en skorsten per lägenhet på nocken (som gnesta-kit.js rowHouse ritar dem); nocken
// intill en skorsten är en utsiktspunkt för Psg 90.
export const rowChimneys = R => Array.from({ length: R.units }, (_, i) => {
  const xc = -R.len / 2 + i * R.unitW + R.unitW / 2, flip = i % 2 ? -1 : 1;
  return rowAt(R, xc + flip * R.unitW * 0.18, -0.35);
});
const rowRoof = R => {
  const top = ROW_PLINTH + ROW_WALL[R.storeys], rh = (R.depth / 2) * Math.tan(ROW_PITCH);
  const q = rowRect(R), c = Math.cos(R.ry), s = Math.sin(R.ry);
  const chim = rowChimneys(R);
  const height = (x, z) => {
    const dx = x - R.x, dz = z - R.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) > R.len / 2 || Math.abs(lz) > R.depth / 2) return 0;
    return top + rh * Math.max(0, 1 - Math.abs(lz) / (R.depth / 2));
  };
  return { rects: [q], eave: top, kind: 'row', height,
    perch: (x, z) => (height(x, z) > 0 && chim.some(([cx, cz]) => Math.hypot(x - cx, z - cz) <= CHIMNEY_PERCH) ? 2 : 0),
    chimney: null, chimneys: chim };
};
void PLINTH;

// ---------- omgivningen ----------
// Spöklagret: Gnestas Östra Storgatan och sporthallen, plus husen norr om Dansutvägen och
// radhusen och garagen öster om kartan. Byggnaderna direkt i meter: [x, z, w, d, vinkel, höjd, tak].
const ghost = ([x, z, wd, d, deg = 0, h = 4.6, roof = 'gable']) => ({ x, z, w: wd, d, ry: -deg * Math.PI / 180, h, roof });
const ghostK = ([kx, ky, L, Wd, deg, h = 4.6, roof = 'gable'], dz = 0) => { const [x, z0] = K(kx, ky), z = z0 + dz; return ghost([x, z, Math.max(6.5, L * KM * HOUSE_K), Math.max(5.5, Wd * KM * HOUSE_K), -deg, h, roof]); };
const ghostRoadK = (name, width, pts) => ({ name, width, pts: smooth(KS(pts), 3) });
export const SURROUNDINGS = {
  crisp: { x0: -122, x1: 98, z0: -164, z1: 70 },
  fade: 42,
  extent: { x0: -240, x1: 270, z0: -300, z1: 200 },
  districts: [
    ...G_SUR.districts.filter(d => d.id === 'ostra-storgatan' || d.id === 'sporthallen'),
    { id: 'dansut-norr', name: 'Norr om Dansutvägen',
      roads: [ghostRoadK('Polonäsvägen', 4.5, [[-300, 60], [0, 30], [240, 20], [255, -120]]), ghostRoadK('Dansutvägen', 6.5, [[-700, 260], [-200, 205], [338, 192]]),
        ghostRoadK('Dansutvägen', 6.5, [[1440, -6], [1700, -60], [1990, -120], [2300, -160]]), ghostRoadK('', 4.5, [[1000, 0], [1010, -200], [1050, -400]])],
      buildings: [
        [120, 83, 71, 50, -165], [236, 88, 70, 38, -176], [705, 26, 75, 54, 45], [759, 10, 40, 24, 177], [825, 12, 54, 32, -176],
        [900, -20, 60, 40, 170], [1100, -90, 60, 44, 165], [1180, -100, 60, 40, 165], [600, -60, 70, 45, 0], [480, -40, 60, 45, 0],
        [300, -50, 60, 40, -5], [120, -20, 60, 44, 0], [1300, -140, 66, 44, 160], [-60, 90, 60, 45, 10],
      ].map(b => ghostK(b, -12)) },
    { id: 'radhus-ost', name: 'Radhusen och garagen öster om kartan',
      roads: [ghostRoadK('Vikingavägen', 5, [[1864, 0], [1972, 280], [2010, 400], [2060, 700], [2100, 1000], [2140, 1300]]),
        ghostRoadK('Östra Storgatan', 9, [[2050, -200], [2120, 200], [2200, 600], [2260, 1000], [2300, 1400]])],
      buildings: [
        [1952, 785, 48, 38, 162, 4.4],
        [1962, 821, 53, 41, 150, 4.4], [1968, 857, 49, 39, 108, 4.4], [1973, 886, 40, 30, 149, 4.4], [1898, 604, 53, 33, 72, 4.4],
        [2040, 300, 140, 40, -75, 4.4], [2080, 600, 140, 40, -75, 4.4], [2120, 900, 120, 40, -75, 4.4], [1850, 120, 110, 30, -72, 3.2, 'flat'],
      ].map(ghostK) },
  ],
};
// Spökhus inne i den skarpa ytan ser ut som grå klossar mitt i staden: de tas bort (radhusen allra
// längst i öster och garagelängan i nordost står utanför spelytan i verkligheten också).
{
  const c = SURROUNDINGS.crisp;
  SURROUNDINGS.districts = SURROUNDINGS.districts.map(d => ({ ...d, buildings: d.buildings.filter(b => !(b.x > c.x0 - 2 && b.x < c.x1 + 2 && b.z > c.z0 - 2 && b.z < c.z1 + 2)) }));
}

// ---------- dagarna ----------
// Dag 1 lär ut att horden kommer norrifrån nu, dag 2 andra ingången, dag 3 bjässar, dag 4
// överraskningen genom radhusen, dag 5 allt. hp: dagens hp-faktor (spelaren kommer från Gnesta
// med det mesta av forskningen). Balanserad i 0.10.0 (docs/balance-log.md).
// lead (0.10.2, tempot): som på Gnesta, de första i dagens första grupp har redan gått en bit
// (src/sim/sim.js), så att första skottet kommer efter 15 till 20 s i stället för 36 till 40.
const g = (type, count, interval, delay, spawn, lead = 0) => ({ type, count, interval, delay, spawn, ...(lead ? { lead } : {}) });
// Bara dag 1 (första intrycket). Prövat och förkastat: försprång på Dansutvägen väster (dag 4
// ovinnbar för policyn i fyra seeds av fem), på dag 2 och 5 (pengarna kommer tidigare: dag 5 vanns
// med full bas i alla seeds) och på dag 3 (bas kvar 17 i snitt; hp 4,2 till 4,4 i stället gav klippor).
// Dag 2 till 5 har första skottet efter 30 till 40 s, som i 0.10.1.
const LEAD = { vikN: 25 };
// Dagens första grupp delas: de första sex går före.
const first = (type, count, interval, delay, spawn) => [g(type, 6, interval, delay, spawn, LEAD[spawn]), g(type, count - 6, interval, delay + 6 * interval, spawn)];
// Öppningen (0.11.0): våg 1 varje dag är en liten grupp från Sigtunavägen söderut (sigW), våg 2 och
// framåt är norrifrån som förut, med en rad när de byter håll (wave.toast, main.js).
// De är eftersläntrare: dag 1:s hp-faktor (OPENER_HP) alla dagar, så att en Ksp 90 vid ishallen räcker.
const OPENER_HP = 2.8;
// 0.12.0 (H115): ingången ligger längre ut i diset, så de har ett försprång (stannar i diset).
const OPENER_LEAD = 8;
const opener = (walkers, runners = 0) => ({ groups: [{ ...g('walker', walkers, 0.8, 0, 'sigW', OPENER_LEAD), hp: OPENER_HP }, ...(runners ? [{ ...g('runner', runners, 0.9, 4, 'sigW', OPENER_LEAD), hp: OPENER_HP }] : [])] });
const NORTH = "They're coming from the north now.";
const north = w => ({ ...w, toast: NORTH });
const say = (toast, w) => ({ ...w, toast });
const tell = (toast, grp) => ({ ...grp, toast });
// 0.12.2 (speltestet: "varje dag är några från väster, sedan alla norrifrån"): varje dag har sin egen
// idé och sin rad i intro, och våg 1 kommer från olika håll. Verktygen: vilande hus (intel) och ett
// oannonserat hus (intel: false, ofta med delay: sent i vågen), flera ingångar, kniptång (två håll
// samtidigt), flanken genom radhusen från Östra Storgatan, bjässar först (brute-led), en vrål av
// löpare, och en vändning sent i en våg (group.toast). Dag 5 är kulmen. Balansen: docs/balance-log.md.
//  1 Norrifrån     väster först (öppningen), sedan Vikingavägen; löparna kommer ikapp sist
//  2 Kniptången    Dansutvägen först, sedan två kolonner samtidigt; Fornminnesvägen är inte tom
//  3 Bjässarna     husen på Valsvägen först; bjässarna går först och de andra i deras skugga
//  4 Flanken       Östra Storgatan först, genom radhusen bakom linjen; ett hus vid ishallen sist
//  5 Hela stan     Sigtunavägen öst först, sedan alla håll, löpare, bjässar och väster i ryggen
// 0.13.0 (H104): armén kommer pö om pö. Gnesta North har allt Gnesta South hade dag 5, och från dag 3
// infanteriet (den riktiga armén).
const NORR_ARSENAL = ['block', 'wire', 'civ', 'hv', 'm249', 'ksp58', 'ak5', 'psg90', 'epa', 'm2'];
const NORR_ARSENAL_INF = [...NORR_ARSENAL, 'inf'];
export const DAYS = [
  { n: 1, supplies: 600, arsenal: NORR_ARSENAL, startCash: 2350, hp: 7, overlap: 60, intro: { title: 'Day 1: From the north', text: 'The fog lifts. They are circling north.' },
    // 0.12.0 (H101): vilande smittade i en villa på Vikingavägen, ute med öppningen: linjen i norr har
    // något att skjuta på medan öppningen kommer söderifrån
    dormant: [{ house: 'N-16', street: 'Vikingavägen', count: 4, type: 'walker', wave: 0 }],
    waves: [ opener(8, 2), north({ groups: [...first('walker', 40, 0.45, 0, 'vikN')] }),
             { groups: [g('walker', 60, 0.3, 0, 'vikN'), g('runner', 20, 0.4, 8, 'vikN')] },
             { groups: [g('walker', 66, 0.25, 0, 'vikN'), tell('Runners coming up behind them!', g('runner', 30, 0.3, 22, 'vikN'))] } ] },
  { n: 2, supplies: 600, arsenal: NORR_ARSENAL, startCash: 2350, hp: 3.5, overlap: 60, intro: { title: 'Day 2: The pincer', text: 'Two columns at once.' },
    dormant: [{ house: 'N-18', street: 'Fornminnesvägen', count: 4, type: 'walker', wave: 0 }, { house: 'N-13', street: 'Gångvägen', count: 4, type: 'walker', wave: 1 },
      { house: 'N-21', street: 'Fornminnesvägen', count: 6, type: 'walker', wave: 3, delay: 25 }],
    waves: [ say('Straight down Vikingavägen.', { groups: [g('walker', 6, 0.45, 0, 'vikN', 25), g('walker', 8, 0.45, 2.7, 'vikN')] }),
             say('Two columns at once!', { groups: [g('walker', 40, 0.4, 0, 'dansW'), g('walker', 30, 0.45, 0, 'vikN')] }),
             say('Runners!', { groups: [g('runner', 60, 0.2, 0, 'vikN'), g('walker', 30, 0.35, 6, 'dansW')] }),
             { groups: [g('walker', 60, 0.25, 0, 'dansW'), g('walker', 50, 0.3, 0, 'vikN'), tell('Runners on both roads!', g('runner', 25, 0.3, 8, 'dansW')), g('runner', 25, 0.3, 8, 'vikN')] } ] },
  { n: 3, supplies: 600, arsenal: NORR_ARSENAL_INF, startCash: 2250, hp: 3.9, overlap: 60, intro: { title: 'Day 3: Brutes in front', text: 'Infantry has arrived. Not everyone fits on the line.' },
    dormant: [{ house: 'N-26', street: 'Valsvägen', count: 4, type: 'walker', wave: 0 }, { house: 'N-28', street: 'Valsvägen', count: 4, type: 'walker', wave: 0 },
      { house: 'B0-00', street: 'Cykelvägen', count: 5, type: 'walker', wave: 0 }, { house: 'N-17', street: 'Fornminnesvägen', count: 3, type: 'walker', wave: 0 },
      { house: 'N-19', count: 2, type: 'brute', wave: 3, delay: 40, intel: false }],
    waves: [ say('Out of the houses on Valsvägen and the preschool.', { groups: [g('walker', 6, 0.45, 0, 'dansW', 25)] }),
             say('Brutes in front!', { groups: [g('brute', 2, 3, 0, 'vikN'), g('walker', 40, 0.35, 4, 'vikN'), g('walker', 30, 0.4, 4, 'dansW')] }),
             { groups: [g('walker', 50, 0.3, 0, 'vikN'), g('runner', 40, 0.25, 4, 'dansW'), g('brute', 3, 3, 24, 'vikN')] },
             say('Brutes lead both columns!', { groups: [g('brute', 4, 3, 0, 'dansW'), g('walker', 55, 0.28, 3, 'dansW'), g('brute', 3, 3, 4, 'vikN'), g('walker', 45, 0.3, 7, 'vikN'), g('runner', 50, 0.2, 20, 'vikN')] }) ] },
  { n: 4, intel: 'unknown', supplies: 600, arsenal: NORR_ARSENAL_INF, startCash: 2450, hp: 7, overlap: 60, intro: { title: 'Day 4: The flank', text: 'They break through behind your line.' },
    dormant: [{ house: 'N-10', street: 'Gångvägen', count: 4, type: 'walker', wave: 0 },
      { house: 'B2-02', count: 6, type: 'walker', wave: 3, delay: 35, intel: false }, { house: 'B2-02', count: 1, type: 'brute', wave: 3, delay: 38, intel: false }],
    waves: [ say('From the east, through the terraces!', { groups: [g('walker', 12, 1.0, 0, 'ostra', 20)] }),
             say('North and east at once!', { groups: [g('walker', 36, 0.35, 0, 'dansW'), g('walker', 30, 0.4, 2, 'vikN'), g('walker', 15, 1.4, 10, 'ostra'), g('brute', 2, 4, 26, 'vikN')] }),
             say('Runners through the terraces!', { groups: [g('runner', 40, 0.9, 0, 'ostra'), g('walker', 30, 0.4, 4, 'dansW'), g('brute', 3, 3, 24, 'ostra')] }),
             // 0.18.0 (skiva 1): kryparna, under tråden genom gräset
             say('Crawlers in the grass! Wire does nothing.', { groups: [g('crawler', 10, 1.1, 0, 'dansW'), g('walker', 50, 0.3, 2, 'dansW'), g('walker', 40, 1.0, 0, 'ostra'), g('runner', 40, 0.4, 6, 'vikN'), g('brute', 4, 3, 26, 'dansW'), g('brute', 3, 3, 30, 'ostra')] }) ] },
  { n: 5, supplies: 600, arsenal: NORR_ARSENAL_INF, startCash: 2050, hp: 12, overlap: 60, intro: { title: 'Day 5: The whole town', text: 'Every road at once. Hold the doors.' },
    dormant: [{ house: 'B2-01', street: 'Sigtunavägen', count: 5, type: 'walker', wave: 0 }, { house: 'N-12', street: 'Vikingavägen', count: 5, type: 'walker', wave: 1 },
      { house: 'B3-02', count: 4, type: 'walker', wave: 3, delay: 45, intel: false }, { house: 'B3-02', count: 2, type: 'brute', wave: 3, delay: 48, intel: false }],
    waves: [ say('Up Sigtunavägen from the east.', { groups: [g('walker', 10, 0.7, 0, 'east1', 30), g('runner', 4, 0.9, 6, 'east1')] }),
             say('North and east!', { groups: [g('walker', 40, 0.35, 0, 'dansW'), g('walker', 30, 0.4, 2, 'vikN'), g('runner', 30, 0.45, 30, 'ostra'), g('brute', 2, 4, 30, 'vikN')] }),
             say('Runners from every side!', { groups: [g('crawler', 8, 1.2, 4, 'ostra'), g('runner', 20, 0.3, 0, 'vikN'), g('runner', 10, 0.4, 0, 'ostra'), g('runner', 10, 0.4, 0, 'dansW'), g('walker', 25, 0.8, 0, 'east1'), g('brute', 4, 3, 10, 'dansW'), g('walker', 40, 0.35, 13, 'dansW')] }),
             { groups: [g('brute', 4, 3, 0, 'vikN'), g('walker', 40, 0.3, 3, 'vikN'), g('walker', 50, 0.3, 0, 'dansW'), g('walker', 40, 0.3, 20, 'ostra'),
               g('runner', 25, 0.7, 40, 'east1'), g('brute', 3, 3, 40, 'ostra'), g('brute', 3, 3, 50, 'dansW'), tell('Behind you, from the west!', g('walker', 15, 0.5, 55, 'sigW'))] } ] },
];

// ---------- staden ----------
export const NORR_TOWN = {
  roads: ROADS, lots: LOTS, cars: CARS, ground: GROUND, spawns: SPAWNS, base: BASE,
  bounds: { x0: -200, z0: -190, x1: 120, z1: 64 },
  crisp: SURROUNDINGS.crisp,
  extraHouses: ROWS.map(R => rowRect(R)),
  extraThings: [],
  extraRoofs: ROWS.map(rowRoof),
  clearings: CLEARINGS,
  hedgeSegs: YARDS.plank.map(p => [p.a, p.b]),
  brickSegs: YARDS.brick.map(p => [p.a, p.b]),
};

export const gnestaNorr = {
  id: 'gnesta-norr', name: 'Hagstumosse · Vikingavägen', version: NORR_VERSION,
  // 0.16.4 (Olas rättelse): en vinst läses som en vinst, befälhavaren skickas dit det behövs.
  // 0.17.0: Mölnbo följer (src/data/molnbo.js)
  outro: { text: 'Hagstumosse holds and the ice rink is safe. Mölnbo station is the last way north for hundreds. Command is sending you to hold it.' },
  // Hemma: Vikingavägens nedre del och radhusen, där horden kommer in dag 1. Rinken ligger i
  // sydväst och nås med panorering.
  // intro (0.10.1): sekunder för svepet från ingången i norr till basen när dagen börjar (main.js).
  camera: { target: [8, -62], view: 58, zoom: [24, 84], pan: { x0: -100, x1: 96, z0: -176, z1: 66 }, intro: 4.5 },
  shadowBounds: { x0: -118, x1: 98, z0: -180, z1: 82 },
  roads: ROADS, roundabout: ROUNDABOUT, iceRink: ICE_RINK, parking: PARKING, sporthall: SPORTHALL, ground: GROUND,
  lots: LOTS, cars: CARS, playground: PLAYGROUND, labels: LABELS, spawns: SPAWNS, base: BASE, surroundings: SURROUNDINGS,
  rows: ROWS, parkingLots: PARKING_LOTS, yards: YARDS, forskolaYard: FORSKOLA_YARD, clearings: CLEARINGS,
  grid: townGrid(NORR_TOWN),
  // 0.12.1: fem pjäser från början (var fyra), Hemvärnet räknas inte med (src/sim/stats.js maxGuns).
  guns: 5,
  // 0.14.0: frontbredden, så många kärntrupper får stå ute samtidigt (src/sim/sim.js frontage)
  frontage: 9,
  baseHp: 20, days: DAYS,
  // 0.10.1: dörrarna släpper in en zombie per 3,2 s (src/sim/sim.js, doorBreak)
  door: { gap: 3.2 },
  // 0.10.1: vägen norrifrån till entrén är 400 m (Gnestas är 220); zombierna går en fjärdedel
  // fortare här så att en dag tar 6 till 8 minuter i stället för 16 till 20.
  pace: 1.25,
  baseModel: 'rink',
  // 0.13.0: Ksp 88, pillboxen och infanteriet är banans (förrådet per dag i DAYS)
  unlocks: ['block', 'm2', 'epa', 'inf', 'ksp58', 'ak5', 'psg90'],
  // 0.16.0 (Olas beslut, "Gnesta = en sektor"): Hagstumosse · Vikingavägen är fas två av samma sektor och
  // öppnar när Ishallen (dag 5) är vunnen; samma trupp följer med (src/data/depot.js SECTORS).
  unlock: { map: 'gnesta', day: 5 }, legacyUnlock: 4,
};
gnestaNorr.place = townPlacement(NORR_TOWN, gnestaNorr.grid);
void inPoly;
