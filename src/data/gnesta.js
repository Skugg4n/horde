// Bana 2: Gnesta, Sigtunavägen. Kartan som data, utan three.js (testbar i node).
// Allt är ritat ur referensbilderna karta.jpg och satellit.jpg (lokalt i ~/Projects/horde-refs/gnesta, inte i repot) i bildens pixlar (2000 x 1150)
// och räknas om till meter i halv skala: x = öster, z = söder, y upp. Basen (rondellen) ligger
// i väster, horden kommer från öster.
// Husen är generiska villor på tomternas platser, inte kopior av riktiga hem.
import { makeRng } from '../sim/rng.js';
import { buildPlace, rect, inRect, KIND } from '../sim/placement.js';

export const GNESTA_VERSION = '0.3.0';

// ---------- skala ----------
// 1 bildpixel = 0.095 m (ungefär halva verkliga skalan). Origo mitt i spelytan.
export const PX = 0.095;
const OX = 1180, OY = 490;
export const w = (px, py) => [(px - OX) * PX, (py - OY) * PX];
const W = pts => pts.map(([x, y]) => w(x, y));

// ---------- geometri ----------
export function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function distPolyline(px, pz, pts) {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(px, pz, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  return d;
}
export function inPoly(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > pz) !== (zj > pz) && px < (xj - xi) * (pz - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export const distPoly = (px, pz, poly) => distPolyline(px, pz, [...poly, poly[0]]);

// Mjuk kurva genom punkterna (Catmull-Rom), ungefär en punkt per 1.5 m.
export function smooth(pts, step = 1.5) {
  if (pts.length < 3) return pts.map(p => [...p]);
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([...pts[pts.length - 1]]);
  return out;
}

// ---------- vägar ----------
// surface: asphalt | gravel | dirt. walk: false = ritas men ingår inte i horden rutnät.
// curbs: kantsten längs asfalten. lamps: sida (+1 vänster om färdriktningen, -1 höger) och steg.
const ROADS_PX = [
  { id: 'sigtuna', name: 'Sigtunavägen', surface: 'asphalt', width: 6.5, curbs: true, lamps: { side: -1, step: 19 }, center: true,
    pts: [[-330, 520], [0, 622], [200, 688], [350, 733], [440, 738], [530, 732], [620, 732], [760, 752], [895, 778], [1000, 800], [1110, 822], [1225, 832], [1330, 840], [1450, 848], [1560, 858], [1730, 875], [1860, 905], [2000, 968]] },
  { id: 'east', name: 'Sigtunavägen', surface: 'asphalt', width: 5.5, curbs: true, lamps: { side: 1, step: 20 },
    pts: [[1860, 905], [1876, 820], [1884, 742], [1920, 712], [1938, 600], [1948, 450], [1956, 280], [1963, 110], [1966, -20]] },
  { id: 'spur1', name: 'Sigtunavägen', surface: 'asphalt', width: 5, curbs: true, lamps: { side: 1, step: 17 },
    pts: [[893, 778], [905, 640], [920, 480], [938, 325]] },
  { id: 'spur2', name: 'Sigtunavägen', surface: 'asphalt', width: 5, curbs: true, lamps: { side: 1, step: 17 },
    pts: [[1222, 832], [1235, 640], [1249, 430]] },
  { id: 'spur3', name: 'Sigtunavägen', surface: 'asphalt', width: 5, curbs: true, lamps: { side: 1, step: 17 },
    pts: [[1545, 858], [1558, 650], [1572, 450]] },
  { id: 'spur1path', surface: 'gravel', width: 3.2, pts: [[938, 325], [942, 270], [945, 212]] },
  { id: 'spur2path', surface: 'gravel', width: 3.2, pts: [[1249, 430], [1260, 330], [1270, 236]] },
  { id: 'spur3path', surface: 'gravel', width: 3.2, pts: [[1572, 450], [1582, 350], [1590, 256]] },
  { id: 'bike', name: 'Cykelvägen', surface: 'gravel', width: 3.6,
    pts: [[481, 588], [488, 520], [470, 430], [430, 362], [455, 312], [520, 270], [600, 240], [695, 213], [765, 200], [835, 200], [945, 212], [1100, 222], [1270, 236], [1430, 246], [1590, 256], [1760, 266], [1956, 280]] },
  { id: 'fornminnes', name: 'Fornminnesvägen', surface: 'asphalt', width: 5, curbs: true, lamps: { side: -1, step: 22 },
    pts: [[1040, 36], [1200, 42], [1300, 47], [1500, 62], [1700, 75], [1890, 90]] },
  { id: 'fornN1', surface: 'asphalt', width: 4.5, curbs: true, pts: [[1287, 45], [1287, -20]] },
  { id: 'fornN2', surface: 'asphalt', width: 4.5, curbs: true, pts: [[1482, 60], [1484, -20]] },
  { id: 'fornLink', surface: 'gravel', width: 2.6, pts: [[1890, 90], [1963, 96]] },
  { id: 'path1', surface: 'gravel', width: 2.6, pts: [[1075, 40], [1068, 130], [1062, 218]] },
  { id: 'path2', surface: 'gravel', width: 2.6, pts: [[1497, 62], [1492, 150], [1488, 247]] },
  { id: 'forest', name: 'Skogsvägen', surface: 'dirt', width: 4.2,
    pts: [[1858, 905], [1846, 960], [1815, 1008], [1750, 1028], [1600, 1033], [1520, 1040], [1460, 1065], [1380, 1115], [1320, 1170]] },
  { id: 'west', surface: 'gravel', width: 3, walk: false, pts: [[-330, 410], [200, 377], [430, 362]] },
  { id: 'parkIn', surface: 'asphalt', width: 6, walk: false, pts: [[560, 735], [552, 790]] },
];
export const ROADS = ROADS_PX.map(r => {
  const pts = W(r.pts);
  return { ...r, walk: r.walk !== false, ptsRaw: pts, pts: r.surface === 'asphalt' && r.pts.length > 2 ? smooth(pts) : (r.pts.length > 2 ? smooth(pts) : pts) };
});
export const road = id => ROADS.find(r => r.id === id);

// ---------- rondellen ----------
// Droppformad gräsö: rund ände mot Sigtunavägen, spetsen mot cykelvägen i norr.
// Sigtunavägen är rondellens södra körfält, resten av varvet är en 5 m ring.
const [rcx, rcz] = w(523, 654), [rtx, rtz] = w(483, 595);
export const ROUNDABOUT = (() => {
  const r = 4, ring = 5;
  const L = Math.hypot(rtx - rcx, rtz - rcz), th = Math.atan2(rtz - rcz, rtx - rcx), ac = Math.acos(r / L);
  const ux = (rtx - rcx) / L, uz = (rtz - rcz) / L;
  // bågen runt den runda änden: från ena tangentpunkten, bort från spetsen, till den andra
  const poly = [], N = 28, a0 = th + ac, a1 = th - ac + Math.PI * 2;
  for (let i = 0; i <= N; i++) { const t = a0 + (a1 - a0) * i / N; poly.push([rcx + Math.cos(t) * r, rcz + Math.sin(t) * r]); }
  poly.push([rtx, rtz]);
  return { center: [rcx, rcz], tip: [rtx, rtz], r, ring, island: poly, flag: [rcx - ux * 0.6, rcz - uz * 0.6] };
})();

// ---------- ishallen och parkeringen ----------
// Gaveln med skylten vetter mot rondellen (som i ishallen.jpg), långsidan längs Sigtunavägen.
export const ICE_RINK = (() => {
  const [ax, az] = w(0, 622), [bx, bz] = w(350, 733);
  const ry = -Math.atan2(bz - az, bx - ax);        // långsidan parallell med vägen
  const [x, z] = w(165, 500);
  const len = 36, wid = 23;
  // Tillbyggnaden längs gaveln mot rondellen: entrén. Huvudingången (dubbeldörr) mitt på,
  // en sidodörr åt varje håll. Överlevarna är inne i hallen: horden vill in här.
  const annex = { depth: 4.4, width: wid + 4, h: 3.6 };
  const at = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const face = len / 2 + annex.depth;                 // fasaden med dörrarna (lokalt x)
  // Huvudingången ligger söder om mitten, mot Sigtunavägen (lokalt +z är söderut).
  const main = 0;
  const doors = [-annex.width * 0.36, main - 0.8, main + 0.8, annex.width * 0.36];
  return { x, z, ry, len, wid, wallH: 7.2, annex, face, doors, main, at, entrance: at(face + 1.2, main) };
})();
// Vägen från rondellen till entrén: förplanen framför dörrarna. Gångbar, men ritas inte som
// gata (planen är redan asfalt). Horden går runt rondellen och hit.
ROADS.push({ id: 'entrance', name: 'Ishallens entré', surface: 'asphalt', width: 6, walk: true, paint: false,
  pts: [ICE_RINK.at(ICE_RINK.face + 1, ICE_RINK.main), ROUNDABOUT.center], ptsRaw: [ICE_RINK.at(ICE_RINK.face + 1, ICE_RINK.main), ROUNDABOUT.center] });
// Inne i hallen och tillbyggnaden (lokala x upp till fasaden) är aldrig gångbart.
export function insideRink(x, z, pad = 0) {
  const hr = ICE_RINK, dx = x - hr.x, dz = z - hr.z, c = Math.cos(hr.ry), s = Math.sin(hr.ry);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  if (Math.abs(lx) <= hr.len / 2 + pad && Math.abs(lz) <= hr.wid / 2 + pad) return true;
  return lx > hr.len / 2 - 1 && lx <= hr.face + pad && Math.abs(lz) <= hr.annex.width / 2 + pad;
}
// Stora parkeringen söder om rondellen (satellit-vid.jpg): fyra rader rutor, stolpar mellan raderna.
export const PARKING = (() => {
  const poly = W([[330, 768], [688, 780], [688, 1040], [326, 1030]]);
  const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
  const x0 = Math.min(...xs) + 1.2, x1 = Math.max(...xs) - 1.2, z0 = Math.min(...zs), z1 = Math.max(...zs);
  const bays = [0.14, 0.37, 0.63, 0.86].map(t => {
    const z = z0 + (z1 - z0) * t, lines = [];
    for (let x = x0; x <= x1; x += 2.7) lines.push([x, z]);
    return { z, depth: 5, lines };
  });
  // stolparna står i mittremsan mellan raderna 1-2 och 3-4
  const poles = [];
  for (const t of [0.255, 0.745]) for (const u of [0.15, 0.5, 0.85]) poles.push([x0 + (x1 - x0) * u, z0 + (z1 - z0) * t]);
  return { poly, rows: 4, bays, poles };
})();

// Gnesta sporthall söder om parkeringen: stor grå hall med mörkt tak och en lägre del med
// blått tak (solceller) mot väster.
export const SPORTHALL = (() => {
  const [x, z] = w(552, 1188);
  const [ax, az] = w(372, 1088);
  return { x, z, ry: -0.2, len: 30, wid: 22, wallH: 8.5, annex: { x: ax, z: az, len: 8, wid: 11, h: 6 } };
})();

// ---------- mark ----------
export const GROUND = {
  bounds: { x0: -142, x1: 96, z0: -62, z1: 92 },
  forest: [
    W([[700, 905], [770, 790], [900, 815], [1110, 860], [1330, 878], [1560, 892], [1730, 905], [1835, 935], [1810, 990], [1745, 1010], [1500, 1015], [1430, 1045], [1300, 1140], [1300, 1500], [700, 1500], [700, 1060], [700, 940]]),
    W([[1500, 1060], [1600, 1052], [1760, 1046], [1840, 1015], [1880, 960], [2160, 1010], [2160, 1500], [1360, 1500]]),
    W([[-330, -160], [905, -160], [895, 175], [700, 195], [560, 232], [455, 290], [400, 345], [330, 370], [-330, 380]]),
    W([[-330, 405], [420, 378], [455, 420], [100, 430], [-330, 440]]),
    W([[-330, 1000], [290, 1010], [300, 1340], [700, 1370], [700, 1500], [-330, 1500]]),
    W([[1985, -160], [2160, -160], [2160, 900], [1990, 860], [1985, 400]]),
  ],
  field: W([[478, 258], [690, 210], [690, 760], [600, 722], [512, 640], [508, 520], [470, 360]]),
  gravelField: W([[-330, 600], [330, 760], [330, 980], [-330, 950]]),
};

// ---------- kvarter och tomter ----------
// Kvarteren är fyrhörningar mellan gatornas mittlinjer (NV, NO, SO, SV i bildpixlar).
// inset: avstånd från mittlinjen till tomtgränsen per sida (N, O, S, V) i meter.
// cols/rows: delningar i andelar. face: åt vilket håll husen i varje kolumn vänder sig.
// edge: vad som står längs kvarterets yttre kanter.
const BLOCKS_PX = [
  { id: 'B0', quad: [[895, 30], [1060, 38], [1062, 205], [895, 195]], inset: [4, 3, 3.5, 1], cols: [], rows: [], face: ['E'],
    edge: { N: 'road', E: 'path', S: 'bike', W: 'wood' } },
  { id: 'B1', quad: [[690, 285], [942, 296], [893, 775], [690, 742]], inset: [3, 3.8, 4.7, 1], cols: [0.47], rows: [0.42], face: ['S', 'E'],
    edge: { N: 'bike', E: 'road', S: 'road', W: 'field' } },
  { id: 'B2', quad: [[945, 216], [1266, 238], [1223, 830], [895, 778]], inset: [3, 3.8, 4.7, 3.8], cols: [0.5], rows: [0.25, 0.51, 0.76], face: ['W', 'E'],
    edge: { N: 'bike', E: 'road', S: 'road', W: 'road' } },
  { id: 'B3', quad: [[1270, 238], [1590, 258], [1546, 856], [1223, 830]], inset: [3, 3.8, 4.7, 3.8], cols: [0.5], rows: [0.25, 0.5, 0.75], face: ['W', 'E'],
    edge: { N: 'bike', E: 'road', S: 'road', W: 'road' } },
  { id: 'B4', quad: [[1590, 258], [1954, 280], [1866, 900], [1546, 856]], inset: [3, 3.8, 4.7, 3.8], cols: [0.5], rows: [0.25, 0.49, 0.72], face: ['W', 'E'],
    edge: { N: 'bike', E: 'road', S: 'road', W: 'road' }, park: [[1, 0], [1, 1]] },
  { id: 'B5', quad: [[1075, 42], [1495, 64], [1490, 245], [1066, 220]], inset: [3.8, 2.2, 3, 2.2], cols: [0.37, 0.67], rows: [], face: ['N', 'N', 'N'],
    edge: { N: 'road', E: 'path', S: 'bike', W: 'path' } },
  { id: 'B6', quad: [[1497, 64], [1962, 96], [1956, 278], [1490, 248]], inset: [3.8, 3.8, 3, 2.2], cols: [0.31, 0.66], rows: [], face: ['N', 'N', 'N'],
    edge: { N: 'road', E: 'road', S: 'bike', W: 'path' } },
];

// Husen: mitt och fotavtryck i bildpixlar (från kartan). kind: villa | shop | preschool.
const HOUSES_PX = [
  [950, 95, 80, 130, 'preschool'],
  [727, 410, 45, 100], [861, 364, 42, 92], [732, 550, 58, 100], [840, 585, 40, 90],
  [1060, 310, 52, 80], [1184, 322, 52, 80], [993, 423, 67, 47], [1174, 467, 48, 65],
  [998, 580, 100, 57], [1178, 607, 43, 72], [978, 721, 70, 49], [1173, 745, 46, 71],
  [1352, 318, 72, 54], [1508, 358, 47, 76], [1350, 446, 76, 47], [1481, 479, 60, 72],
  [1297, 628, 54, 96], [1486, 616, 40, 90, 'shop'], [1300, 750, 63, 72], [1490, 761, 50, 78],
  [1651, 379, 53, 78], [1660, 490, 67, 92], [1645, 622, 69, 51], [1822, 648, 44, 63],
  [1636, 754, 65, 47], [1816, 776, 44, 67],
  [1156, 106, 87, 57], [1286, 104, 78, 58], [1401, 122, 46, 60],
  [1558, 126, 44, 62], [1721, 135, 71, 60], [1847, 152, 71, 51],
];

// Linjeskärning för att flytta in kvarterets kanter.
// Vilket intervall i delningarna (0, ..., 1) som x ligger i.
const slot = (xs, x) => { let k = 0; while (k < xs.length - 2 && x >= xs[k + 1]) k++; return k; };

function insetQuad(q, ins) {
  const lines = [];
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    const nx = -dz / L, nz = dx / L;                 // inåt för medurs ordning (x öster, z söder)
    lines.push({ p: [a[0] + nx * ins[i], a[1] + nz * ins[i]], d: [dx / L, dz / L] });
  }
  const out = [];
  for (let i = 0; i < 4; i++) {
    const l1 = lines[(i + 3) % 4], l2 = lines[i];
    const den = l1.d[0] * l2.d[1] - l1.d[1] * l2.d[0];
    const t = ((l2.p[0] - l1.p[0]) * l2.d[1] - (l2.p[1] - l1.p[1]) * l2.d[0]) / den;
    out.push([l1.p[0] + l1.d[0] * t, l1.p[1] + l1.d[1] * t]);
  }
  return out;
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const bil = (q, u, v) => lerp2(lerp2(q[0], q[1], u), lerp2(q[3], q[2], u), v);
function invBil(q, p) {
  let u = 0.5, v = 0.5;
  for (let it = 0; it < 12; it++) {
    const f = bil(q, u, v), e = 1e-3;
    const fu = bil(q, u + e, v), fv = bil(q, u, v + e);
    const a = (fu[0] - f[0]) / e, b = (fv[0] - f[0]) / e, c = (fu[1] - f[1]) / e, d = (fv[1] - f[1]) / e;
    const rx = p[0] - f[0], rz = p[1] - f[1], det = a * d - b * c;
    u += (d * rx - b * rz) / det; v += (-c * rx + a * rz) / det;
  }
  return [u, v];
}

const FACADES = ['white', 'white', 'grey', 'yellow', 'brick', 'brickGrey', 'blueGrey', 'brown', 'red', 'beige'];
const ROOFS = ['black', 'black', 'charcoal', 'charcoal', 'tile', 'slate'];

function buildPlots() {
  const rng = makeRng(20261015);
  const r = () => rng();
  const pick = a => a[(r() * a.length) | 0];
  const houses = HOUSES_PX.map(([px, py, fw, fh, kind]) => ({ px, py, fw, fh, kind: kind || 'villa' }));
  const blocks = [], plots = [], edges = [];
  for (const B of BLOCKS_PX) {
    const qw = W(B.quad);
    // kanterna i ordning N, O, S, V = q0-q1, q1-q2, q2-q3, q3-q0
    const q = insetQuad(qw, B.inset);
    const north = [qw[0][0] - qw[3][0], qw[0][1] - qw[3][1]], nl = Math.hypot(...north);
    const n = [north[0] / nl, north[1] / nl];
    const east = [qw[1][0] - qw[0][0], qw[1][1] - qw[0][1]], el = Math.hypot(...east);
    const e = [east[0] / el, east[1] / el];
    const dirs = { N: n, S: [-n[0], -n[1]], E: e, W: [-e[0], -e[1]] };
    const us = [0, ...B.cols, 1], vs = [0, ...B.rows, 1];
    blocks.push({ id: B.id, quad: q, outer: qw });
    const isPark = (i, j) => (B.park || []).some(([a, b]) => a === i && b === j);
    for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) {
      const corners = [bil(q, us[i], vs[j]), bil(q, us[i + 1], vs[j]), bil(q, us[i + 1], vs[j + 1]), bil(q, us[i], vs[j + 1])];
      const face = B.face[i] ?? B.face[0];
      const plot = { id: `${B.id}-${i}${j}`, block: B.id, i, j, corners, face, f: dirs[face], park: isPark(i, j), house: null, extras: [] };
      plots.push(plot);
    }
    // husen till sina tomter
    for (const h of houses) {
      if (h.plot) continue;
      const [u, v] = invBil(qw, [w(h.px, h.py)[0], w(h.px, h.py)[1]]);
      if (u < -0.05 || u > 1.05 || v < -0.08 || v > 1.08) continue;
      // tomtens index i det inflyttade nätet
      const [ui, vi] = invBil(q, w(h.px, h.py));
      const i = slot(us, ui), j = slot(vs, vi);
      const plot = plots.find(p => p.block === B.id && p.i === i && p.j === j);
      if (!plot || plot.house) continue;
      h.plot = plot.id; plot.house = h;
    }
    // staket och häckar längs nätets linjer
    const EXT = { N: 'bike', E: 'road', S: 'road', W: 'road', ...B.edge };
    const kindFor = (ext) => {
      const x = r();
      if (ext === 'field' || ext === 'wood') return x < 0.75 ? 'hedge' : 'slat';
      if (ext === 'bike' || ext === 'path') return x < 0.65 ? 'hedge' : x < 0.85 ? 'slat' : 'hedgeSlat';
      if (ext === 'road') return x < 0.42 ? 'hedge' : x < 0.62 ? 'hedgeSlat' : x < 0.78 ? 'picket' : 'slat';
      return x < 0.5 ? 'hedge' : x < 0.68 ? 'slat' : x < 0.78 ? 'picket' : 'none';
    };
    const plotAt = (i, j) => plots.find(p => p.block === B.id && p.i === i && p.j === j);
    // vertikala linjer (konstant u)
    for (let k = 0; k < us.length; k++) for (let j = 0; j < vs.length - 1; j++) {
      const ext = k === 0 ? EXT.W : k === us.length - 1 ? EXT.E : null;
      const left = k > 0 ? plotAt(k - 1, j) : null, right = k < us.length - 1 ? plotAt(k, j) : null;
      if ((left?.park || !left) && (right?.park || !right)) continue;
      const side = k === 0 ? 'W' : 'E';
      edges.push({ a: bil(q, us[k], vs[j]), b: bil(q, us[k], vs[j + 1]), kind: kindFor(ext), ext, plot: ext ? (k === 0 ? right : left).id : null, side: ext ? side : null });
    }
    for (let k = 0; k < vs.length; k++) for (let i = 0; i < us.length - 1; i++) {
      const ext = k === 0 ? EXT.N : k === vs.length - 1 ? EXT.S : null;
      const up = k > 0 ? plotAt(i, k - 1) : null, down = k < vs.length - 1 ? plotAt(i, k) : null;
      if ((up?.park || !up) && (down?.park || !down)) continue;
      const side = k === 0 ? 'N' : 'S';
      edges.push({ a: bil(q, us[i], vs[k]), b: bil(q, us[i + 1], vs[k]), kind: kindFor(ext), ext, plot: ext ? (k === 0 ? down : up).id : null, side: ext ? side : null });
    }
    // parker utan staket mot gatan men med häck mot grannen ritas av linjerna ovan
  }

  // ---------- husen i tomtens ram ----------
  for (const p of plots) {
    if (!p.house) continue;
    const h = p.house;
    const [cx, cz] = w(h.px, h.py);
    const f = p.f, a = Math.atan2(f[0], f[1]);       // rotation.y så att lokal +z pekar mot gatan
    const s = [Math.cos(a), -Math.sin(a)];             // lokal x (längs gatan)
    // tomtens utsträckning i husets ram
    const proj = (pt, ax) => (pt[0] - cx) * ax[0] + (pt[1] - cz) * ax[1];
    const sx = p.corners.map(c => proj(c, s)), fz = p.corners.map(c => proj(c, f));
    const sMin = Math.min(...sx), sMax = Math.max(...sx);
    const fMin = Math.min(...fz), fMax = Math.max(...fz);
    // fotavtrycket: kartans pixlar gånger 1.4 (husen är lite större än halv skala)
    const K = h.kind === 'preschool' ? 1.15 : 1.42;
    const along = (p.face === 'E' || p.face === 'W') ? h.fh : h.fw, deep = (p.face === 'E' || p.face === 'W') ? h.fw : h.fh;
    let hw = along * PX * K, hd = deep * PX * K;
    const roomS = (sMax - sMin) - 2.4, roomF = (fMax - fMin) - 4.6;
    hw = Math.min(hw, Math.max(6, roomS)); hd = Math.min(hd, Math.max(5.5, roomF));
    hw = Math.max(hw, 7.5); hd = Math.max(hd, 6.4);
    // mitten: kartans plats, men innanför tomten med marginal (3.5 m gräsmatta mot gatan)
    let ls = Math.min(Math.max(0, sMin + 1.3 + hw / 2), sMax - 1.3 - hw / 2);
    let lf = Math.min(Math.max(0, fMin + 1.3 + hd / 2), fMax - 3.3 - hd / 2);
    if (sMin + 1.3 + hw / 2 > sMax - 1.3 - hw / 2) ls = (sMin + sMax) / 2;
    if (fMin + 1.3 + hd / 2 > fMax - 3.3 - hd / 2) lf = (fMin + fMax) / 2 - 1;
    const x = cx + s[0] * ls + f[0] * lf, z = cz + s[1] * ls + f[1] * lf;
    const storeys = h.kind === 'villa' && r() < 0.36 ? 1.5 : 1;
    const garage = h.kind === 'villa' && r() < 0.45 ? (r() < 0.5 ? -1 : 1) : 0;
    const house = {
      x, z, ry: a, w: hw, d: hd, kind: h.kind, storeys,
      roof: h.kind !== 'villa' ? 'gable' : (r() < 0.3 ? 'hip' : 'gable'),
      ridge: storeys === 1.5 && r() < 0.6 ? 'z' : 'x',
      facade: h.kind === 'preschool' ? 'yellow' : h.kind === 'shop' ? 'beige' : pick(FACADES),
      roofColor: pick(ROOFS), garage,
      chimney: r() < 0.6, veranda: r() < 0.35, solar: r() < 0.18,
      seed: (r() * 1e9) | 0,
    };
    if (house.ridge === 'z') house.balcony = true;
    p.house = house;
    // uppfart: bredvid huset mot gatan (garagets sida om det finns)
    const dSide = garage || (r() < 0.5 ? -1 : 1);
    const ds = garage ? ls + garage * (hw / 2 + 1.9) : ls + dSide * (hw / 2 - 1.6);
    const dsC = Math.min(Math.max(ds, sMin + 1.8), sMax - 1.8);
    const front = lf + hd / 2;
    p.drive = { a: [cx + s[0] * dsC + f[0] * (front - (garage ? hd * 0.45 : 0.2)), cz + s[1] * dsC + f[1] * (front - (garage ? hd * 0.45 : 0.2))],
                b: [cx + s[0] * dsC + f[0] * (fMax + 0.2), cz + s[1] * dsC + f[1] * (fMax + 0.2)], width: 3, surface: r() < 0.5 ? 'gravel' : 'paving' };
    // trädgårdssaker, i husets ram (ls längs gatan, lf mot gatan)
    const back = (fMin + lf - hd / 2) / 2;
    const ex = (kind, s0, f0, o = {}) => p.extras.push({ kind, x: cx + s[0] * s0 + f[0] * f0, z: cz + s[1] * s0 + f[1] * f0, ry: a + (o.turn || 0), ...o });
    ex('mailbox', dsC + (dsC > ls ? 1.9 : -1.9), fMax - 0.35, { n: 1 + ((r() * 2) | 0) });
    if (r() < 0.6) ex('car', dsC, front + 2.6 + r() * 0.6, { turn: Math.PI / 2 + (r() < 0.5 ? Math.PI : 0), color: (r() * 6) | 0 });
    if (r() < 0.14) ex('trailer', dsC + (dsC > ls ? -2.6 : 2.6), front + 1.6, { turn: Math.PI / 2 });
    if (fMin < lf - hd / 2 - 3) {
      if (r() < 0.3) ex('trampoline', ls + (r() - 0.5) * hw * 0.6, back);
      else if (r() < 0.55) ex('furniture', ls + (r() - 0.5) * hw * 0.5, back + 0.4, { turn: r() * 3 });
    }
    const nTrees = 1 + ((r() * 2.4) | 0);
    for (let t = 0; t < nTrees; t++) {
      const side = r() < 0.5 ? -1 : 1;
      const s0 = side < 0 ? sMin + 1.6 + r() * 1.2 : sMax - 1.6 - r() * 1.2;
      const f0 = fMin + 1.6 + r() * Math.max(0.1, fMax - fMin - 3.2);
      if (Math.abs(s0 - ls) < hw / 2 + 1.5 && Math.abs(f0 - lf) < hd / 2 + 1.5) continue;
      if (Math.abs(s0 - dsC) < 2.4 && f0 > front - 1) continue;
      ex('tree', s0, f0, { h: 4.5 + r() * 3.5, k: (r() * 3) | 0 });
    }
  }
  // grindhål i staketet mot gatan där uppfarten går ut
  for (const e of edges) {
    if (!e.plot) continue;
    const p = plots.find(x => x.id === e.plot);
    if (!p?.drive || p.face !== e.side) continue;
    const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1], L2 = dx * dx + dz * dz;
    const t = ((p.drive.b[0] - e.a[0]) * dx + (p.drive.b[1] - e.a[1]) * dz) / L2;
    e.gap = { t, len: 3.4 };
  }
  return { plots, edges, blocks };
}
export const LOTS = buildPlots();

// ---------- lekplatsen ----------
export const PLAYGROUND = { center: w(1818, 378), ry: -0.06 };

// ---------- gatunamn (L) ----------
export const LABELS = [
  { text: 'Sigtunavägen', at: w(1040, 812) },
  { text: 'Sigtunavägen', at: w(1680, 872) },
  { text: 'Sigtunavägen', at: w(1946, 560) },
  { text: 'Fornminnesvägen', at: w(1420, 56) },
  { text: 'Cykelvägen', at: w(1120, 225) },
  { text: 'Cykelvägen', at: w(470, 470) },
  { text: 'Skogsvägen', at: w(1640, 1035) },
  { text: 'Gnesta ishall', at: [ICE_RINK.x, ICE_RINK.z - 4] },
  { text: 'Lekplats', at: w(1818, 345) },
  { text: 'Gnesta sporthall', at: [SPORTHALL.x, SPORTHALL.z - 4] },
];

// ---------- spawn och bas ----------
// 0.10.1: ingångarna flyttade in längs vägen (världskoordinater), så att första skottet kommer efter
// 15 till 25 s i stället för 40 till 55 och dagarna blir kortare (speltestet av 0.10.0). Förut låg de
// vid dimkanten: east1 w(1995, 965), east2 w(1966, -10), forest w(1330, 1160). Zombierna kliver upp ur
// diket när de kommer (render/horde.js). Sträckan till entrén med spärren vid rondellen: east1 190 m
// (var 268), east2 180 m (214), forest 280 m (320).
export const SPAWNS = [
  { id: 'east1', name: 'Sigtunavägen öst', day: 1, at: [37, 37] },
  { id: 'east2', name: 'Norra vägen', day: 2, at: [49, -39] },
  { id: 'forest', name: 'Skogsvägen', day: 3, at: [43, 51] },
];
// Basen är ishallens entré (0.6.0): horden ska fram till dörrarna, inte till rondellen.
// Rondellen blir sista försvarslinjen framför porten.
export const BASE = { at: ICE_RINK.entrance };

// ---------- rutnätet för horden ----------
// 2 m-rutor. walk = 1 på gator och cykelvägar, 0 på tomter, i skogen och på rondellens gräsö.
// townGrid tar en stads data (T: roads, spawns, base, bounds), så att Gnesta Norr (gnesta-norr.js)
// kan bygga sitt större rutnät med samma regler. Rondellen och ishallen är desamma.
export function townGrid(T, cellSize = 2) {
  const { x0, z0, x1, z1 } = T.bounds;
  const gw = Math.round((x1 - x0) / cellSize), gh = Math.round((z1 - z0) / cellSize);
  const walk = new Uint8Array(gw * gh);
  const walkRoads = T.roads.filter(r => r.walk);
  const cx = i => x0 + (i + 0.5) * cellSize, cz = j => z0 + (j + 0.5) * cellSize;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = cx(i), z = cz(j);
    let ok = walkRoads.some(r => distPolyline(x, z, r.pts) <= r.width / 2 + 0.25);
    if (!ok && distPoly(x, z, ROUNDABOUT.island) <= ROUNDABOUT.ring) ok = true;
    if (inPoly(x, z, ROUNDABOUT.island) || insideRink(x, z, 0.4)) ok = false;
    walk[j * gw + i] = ok ? 1 : 0;
  }
  // varje väglinje ger en sammanhängande kedja av rutor, även smala cykelvägar på snedden
  const mark = (x, z) => {
    const i = Math.floor((x - x0) / cellSize), j = Math.floor((z - z0) / cellSize);
    if (i < 0 || j < 0 || i >= gw || j >= gh) return;
    if (inPoly(cx(i), cz(j), ROUNDABOUT.island) || insideRink(cx(i), cz(j), 0.4)) return;
    walk[j * gw + i] = 1;
  };
  for (const r of walkRoads) for (let k = 1; k < r.pts.length; k++) {
    const [ax, az] = r.pts[k - 1], [bx, bz] = r.pts[k];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
    for (let t = 0; t <= n; t++) mark(ax + (bx - ax) * t / n, az + (bz - az) * t / n);
  }
  const cellOf = ([x, z]) => {
    const i = Math.min(gw - 1, Math.max(0, Math.floor((x - x0) / cellSize)));
    const j = Math.min(gh - 1, Math.max(0, Math.floor((z - z0) / cellSize)));
    return [i, j];
  };
  // terräng: 1 gata (asfalt, skogsvägens jord, rondellens ring), 2 cykelväg och grusgångar.
  // Närmaste gångbara väglinje avgör.
  const terrain = new Uint8Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const k = j * gw + i;
    if (!walk[k]) continue;
    const x = cx(i), z = cz(j);
    let near = null, nd = Infinity;
    for (const r of walkRoads) { const d = distPolyline(x, z, r.pts) - r.width / 2; if (d < nd) { nd = d; near = r; } }
    const ring = distPoly(x, z, ROUNDABOUT.island) <= ROUNDABOUT.ring;
    terrain[k] = !ring && near?.surface === 'gravel' ? 2 : 1;
  }
  // basens ruta: närmaste gångbara ruta vid ön
  let best = null, bd = Infinity;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) if (walk[j * gw + i]) {
    const d = Math.hypot(cx(i) - T.base.at[0], cz(j) - T.base.at[1]);
    if (d < bd) { bd = d; best = [i, j]; }
  }
  return {
    w: gw, h: gh, cellSize, origin: [x0, z0], walk, terrain,
    spawns: T.spawns.map(s => ({ id: s.id, cell: cellOf(s.at) })),
    base: best,
    cellOf, center: (i, j) => [cx(i), cz(j)],
  };
}
// Gnestas rutnät (x -82 till 80, z -48 till 64).
export const buildGrid = (cellSize = 2) => townGrid(gnestaTown(), cellSize);

// ---------- omgivningen: spöklagret ----------
// Det som ligger utanför spelytan, ut till kamerans panoreringsgräns, ritat ur karta-vid.jpg och
// satellit-vid.jpg (bildens pixlar, 2000 x 1236). Vid-bilden är satellit.jpg utzoomad: Gnesta IK
// ligger i (689, 758) där och i (576, 706) här, och en vid-pixel är 1.817 satellitpixlar.
// Lagret är data så att ett kvarter senare kan flyttas in i den riktiga kartan.
// Byggnader: [x, y, längd, bredd, vinkel i grader (bildens medurs, 0 = öster), höjd, tak].
const VX = 689, VY = 758, VK = 1.817;
export const wv = (vx, vy) => w(576 + (vx - VX) * VK, 706 + (vy - VY) * VK);
const VPX = PX * VK * 1.35;              // vid-pixlar till meter, med samma uppskalning som husen
const ghostBuilding = ([vx, vy, len, wid, ang = 0, h = 4.6, roof = 'gable']) => {
  const [x, z] = wv(vx, vy);
  return { x, z, w: Math.max(6.5, len * VPX), d: Math.max(5.5, wid * VPX), ry: -ang * Math.PI / 180, h, roof };
};
const ghostRoad = (name, width, pts) => ({ name, width, pts: smooth(pts.map(([x, y]) => wv(x, y)), 3) });
export const SURROUNDINGS = {
  // Spelytan som är skarp. Utanför den tonar allt mot diset över fade meter.
  crisp: { x0: -122, x1: 84, z0: -50, z1: 70 },
  fade: 42,
  districts: [
    { id: 'ostra-storgatan', name: 'Östra Storgatan',
      roads: [
        ghostRoad('Östra Storgatan', 9, [[1690, 40], [1720, 180], [1760, 300], [1800, 420], [1840, 540], [1880, 660], [1915, 780], [1945, 900], [1975, 1020], [1990, 1160]]),
        ghostRoad('Sigtunavägen', 6, [[1398, 860], [1470, 905], [1560, 945], [1650, 960], [1740, 944], [1800, 900], [1832, 830], [1834, 740], [1810, 650], [1790, 580], [1800, 520], [1835, 470]]),
        ghostRoad('', 4, [[1855, 985], [1900, 1000], [1940, 990]]),
      ],
      buildings: [
        [1662, 745, 34, 26, 8], [1700, 700, 30, 26, -10], [1690, 805, 34, 28, 5], [1722, 838, 26, 30, 0], [1668, 860, 30, 24, 12],
        [1838, 292, 26, 24, -20, 4.2], [1878, 300, 30, 26, -35, 4.2], [1893, 352, 26, 24, -30, 4.2], [1870, 492, 24, 22, 0, 4.2],
        [1855, 990, 28, 18, 30, 3.6, 'flat'],
      ].map(ghostBuilding) },
    { id: 'vikingavagen', name: 'Vikingavägen och Fornminnesvägen norr',
      roads: [
        ghostRoad('Fornminnesvägen', 4.5, [[1083, 405], [1086, 330], [1088, 270], [1090, 215]]),
        ghostRoad('', 4.5, [[1085, 372], [1030, 360], [990, 365], [975, 385]]),
        ghostRoad('Vikingavägen', 5, [[1188, 405], [1190, 330], [1197, 260], [1195, 200], [1182, 140], [1172, 80]]),
        ghostRoad('', 4.5, [[1196, 240], [1250, 238], [1300, 240]]),
        ghostRoad('', 5, [[1440, 360], [1428, 300], [1410, 235], [1385, 160], [1362, 90], [1350, 40]]),
      ],
      buildings: [
        [1043, 242, 30, 34, 0], [1045, 300, 28, 32, 0], [1133, 224, 28, 32, 2], [1128, 293, 30, 34, 0], [1118, 336, 30, 26, 0],
        [1248, 192, 40, 28, -5], [1306, 186, 32, 30, 0], [1238, 268, 30, 26, 0], [1296, 285, 36, 28, -8], [1323, 340, 30, 26, -6],
        [1236, 330, 26, 22, 0], [1150, 165, 26, 30, 0], [1262, 120, 30, 26, 0],
      ].map(ghostBuilding) },
    { id: 'radhusen', name: 'Radhusen i nordost',
      roads: [ghostRoad('', 4.5, [[1452, 330], [1530, 318], [1610, 296], [1690, 268]])],
      buildings: [
        [1475, 200, 84, 22, 72, 4.4], [1540, 205, 92, 22, 70, 4.4], [1600, 175, 70, 20, 68, 4.4], [1630, 250, 54, 20, 70, 4.4],
        [1512, 348, 62, 20, -12, 4.2], [1560, 330, 70, 20, -14, 4.2], [1640, 305, 46, 18, -18, 4.2],
      ].map(ghostBuilding) },
    { id: 'sporthallen', name: 'Sporthallens omgivning',
      roads: [ghostRoad('', 5, [[590, 1110], [560, 1150], [520, 1200]])],
      buildings: [[640, 1135, 60, 30, -10, 5.5, 'flat'], [470, 1110, 30, 22, 0, 4]].map(ghostBuilding) },
  ],
};

// ---------- parkerade bilar ----------
// Bilarna på parkeringen (ungefär hälften av rutorna, tätast närmast hallarna) och en vid
// ishallen. Data, så att placeringen vet var de står (ett vapen får inte stå på en bil).
// color: index i bilfärgerna (renderingen väljer färgen).
export const CARS = (() => {
  const r = makeRng(5150);
  const out = [];
  for (const row of PARKING.bays) {
    for (let i = 0; i < row.lines.length - 1; i++) {
      const [ax] = row.lines[i], [bx] = row.lines[i + 1];
      const cx = (ax + bx) / 2, near = 1 - (i / row.lines.length);
      if (r() > 0.28 + 0.4 * near) continue;
      out.push({ x: cx, z: row.z + (r() - 0.5) * 0.4, ry: Math.PI / 2 + (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5) * 0.1, color: (r() * 8) | 0 });
    }
  }
  // bilen vid ishallen står framför sidodörren, inte i entréns väg
  const hr = ICE_RINK, lx = hr.len / 2 + 8.5, lz = 11.5;
  out.push({ x: hr.x + lx * Math.cos(hr.ry) + lz * Math.sin(hr.ry), z: hr.z - lx * Math.sin(hr.ry) + lz * Math.cos(hr.ry), ry: hr.ry + Math.PI / 2, color: (r() * 8) | 0 });
  return out;
})();

// ---------- placering av vapen ----------
// Samma 2 m-rutnät som horden. Gångbara rutor (gator, cykelvägar, rondellens ring) är gata.
// Husen (villor med garage, ishallen, sporthallen) är hus och skymmer sikten; en meter runt
// dem är också "hus" så att sandsäckarna inte går in i väggen. Rondellens ö är basen.
// Skogen är tät (träd var 3,3 m, 9-16 m höga) och stängd där träden står: inne i skogen och
// minst 3,5 m från gatukanten. Remsan mellan gatan och skogen går att bygga på.
// Bilar, släpvagnar, studsmattor och trädgårdsträd står i vägen men skymmer inget.
// Häckar, staket och brevlådor är låga: där går det att bygga, och de skymmer inte.
const HOUSE_PAD = 1;
const THING_PAD = 0.8;
// T: stadens data. lots (tomterna), cars, roads, ground och tillägg från en större karta (Gnesta
// Norr): extraHouses (rektanglar som är hus: radhuslängorna), extraThings (bilar på
// radhusparkeringarna m.m.), extraRoofs (byggnader med tak, efter villorna), clearings
// (polygoner utan skog: tomter och gårdar), hedgeSegs (staket utöver tomternas), brickSegs
// (låga tegelmurar: skydd för Hemvärnet) och ditchRoads (vägar med dike).
function houseRects(T) {
  const out = [];
  for (const p of T.lots.plots) {
    const h = p.house;
    if (!h) continue;
    const w = h.kind === 'preschool' ? Math.max(h.w, 13) : h.w, d = h.kind === 'preschool' ? Math.max(h.d, 7.5) : h.d;
    out.push(rect(h.x, h.z, h.ry, w, d));
    if (h.garage) {
      // garaget i husets förlängning (som villan i gnesta-kit.js ritar det)
      const gd = Math.min(d * 0.95, 6.4), gx = h.garage * (w / 2 + 1.85), gz = d / 2 - gd / 2;
      const c = Math.cos(h.ry), sn = Math.sin(h.ry);
      out.push(rect(h.x + c * gx + sn * gz, h.z - sn * gx + c * gz, h.ry, 3.7, gd));
    }
  }
  const hr = ICE_RINK, sh = SPORTHALL;
  out.push(rect(hr.x, hr.z, hr.ry, hr.len, hr.wid));
  const [ax, az] = hr.at(hr.len / 2 + hr.annex.depth / 2, 0);
  out.push(rect(ax, az, hr.ry, hr.annex.depth, hr.annex.width));
  out.push(rect(sh.x, sh.z, sh.ry, sh.len, sh.wid));
  out.push(rect(sh.annex.x, sh.annex.z, sh.ry, sh.annex.len, sh.annex.wid));
  out.push(...(T.extraHouses ?? []));
  return out;
}
function thingRects(T) {
  const out = T.cars.map(c => rect(c.x, c.z, c.ry, 4.3, 1.82));
  for (const p of T.lots.plots) for (const x of p.extras) {
    if (x.kind === 'car') out.push(rect(x.x, x.z, x.ry, 4.3, 1.82));
    else if (x.kind === 'trailer') out.push(rect(x.x, x.z, x.ry, 2.8, 1.7));
    else if (x.kind === 'trampoline') out.push(rect(x.x, x.z, 0, 3.6, 3.6));
    else if (x.kind === 'tree') out.push(rect(x.x, x.z, 0, 0.8, 0.8));
  }
  out.push(...(T.extraThings ?? []));
  return out;
}
// Står det skog i punkten (samma regler som skogen ritas med, med marginal för trädens slump)?
export function denseForestIn(T, x, z) {
  if (!T.ground.forest.some(poly => inPoly(x, z, poly))) return false;
  if (T.roads.some(o => distPolyline(x, z, o.pts) < o.width / 2 + 3.2)) return false;
  if (T.lots.blocks.some(B => inPoly(x, z, B.outer)) || inPoly(x, z, PARKING.poly)) return false;
  if (T.clearings && T.clearings.some(poly => inPoly(x, z, poly))) return false;
  if (distPoly(x, z, ROUNDABOUT.island) < 9) return false;
  if (Math.hypot(x - ICE_RINK.x, z - ICE_RINK.z) < ICE_RINK.len / 2 + 9) return false;
  if (Math.hypot(x - SPORTHALL.x, z - SPORTHALL.z) < SPORTHALL.len / 2 + 12) return false;
  return Math.min(...T.roads.filter(o => o.walk).map(o => distPolyline(x, z, o.pts) - o.width / 2)) >= 3.5;
}
const islandThings = () => { const [cx, cz] = ROUNDABOUT.center; return [ROUNDABOUT.flag, [cx + 1.3, cz - 0.4], [cx - 0.9, cz + 1.2]]; };
// Taken (0.8.0): villorna, förskolan, affären och garagen går att ligga på (Psg 90). Ishallen är
// basen och sporthallen ligger utanför striden, så de har inga tak att ställa något på.
// Takens höjd följer hur gnesta-kit.js ritar husen (sockel 0,32 m, vägg 2,75 eller 3,3 m,
// taklutningen per hustyp); håll dem i takt om husen ritas om.
export const PLINTH = 0.32;
function roofShape(h) {
  const pre = h.kind === 'preschool', shop = h.kind === 'shop';
  const W = pre ? Math.max(h.w, 13) : h.w, D = pre ? Math.max(h.d, 7.5) : h.d;
  const storeys = pre || shop ? 1 : h.storeys;
  const roof = pre || shop ? 'gable' : h.roof;
  const ridgeX = (pre ? 'x' : h.ridge ?? 'x') === 'x';
  const pitch = pre ? 0.38 : shop ? 0.3 : storeys === 1.5 ? 0.74 : roof === 'hip' ? 0.4 : 0.47;
  const top = PLINTH + (storeys === 1.5 ? 3.3 : 2.75);
  const len = ridgeX ? W : D, span = ridgeX ? D : W, rh = (span / 2) * Math.tan(pitch);
  return { W, D, top, rh, len, span, ridgeX, hip: roof === 'hip' };
}
// Takets höjd i en punkt i husets lokala ram (lx längs bredden, lz längs djupet).
function roofHeight(sh, lx, lz) {
  const across = sh.ridgeX ? Math.abs(lz) : Math.abs(lx), along = sh.ridgeX ? Math.abs(lx) : Math.abs(lz);
  let k = 1 - across / (sh.span / 2);
  if (sh.hip) k = Math.min(k, (sh.len / 2 - along) / (sh.span / 2));
  return sh.top + sh.rh * Math.max(0, Math.min(1, k));
}
const GARAGE_TOP = 2.8;
// Byggnaderna med tak: { rects: [huset, garaget], height(x, z) } där height ger 0 utanför taket.
// Villorna först (i tomternas ordning), sedan T.extraRoofs (radhuslängorna i Gnesta Norr).
export function townRoofs(T) {
  const out = [];
  for (const p of T.lots.plots) {
    const h = p.house;
    if (!h) continue;
    const sh = roofShape(h), c = Math.cos(h.ry), sn = Math.sin(h.ry);
    const main = rect(h.x, h.z, h.ry, sh.W, sh.D), rects = [main];
    let garage = null;
    if (h.garage) {
      const gd = Math.min(sh.D * 0.95, 6.4), gx = h.garage * (sh.W / 2 + 1.85), gz = sh.D / 2 - gd / 2;
      garage = rect(h.x + c * gx + sn * gz, h.z - sn * gx + c * gz, h.ry, 3.7, gd);
      rects.push(garage);
    }
    out.push({ rects, height(x, z) {
      if (inRect(main, x, z)) {
        const dx = x - h.x, dz = z - h.z;
        return roofHeight(sh, dx * c - dz * sn, dx * sn + dz * c);
      }
      return garage && inRect(garage, x, z) ? GARAGE_TOP : 0;
    } });
  }
  out.push(...(T.extraRoofs ?? []));
  return out;
}
export const roofBuildings = () => townRoofs(gnestaTown());

const ROOF_SAMPLES = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 0.8, Math.sin(i * Math.PI / 4) * 0.8])];
export function townPlacement(T, grid) {
  const houses = houseRects(T), things = thingRects(T);
  const place = buildPlace({
    w: grid.w, h: grid.h, cellSize: grid.cellSize, origin: grid.origin,
    walk: (x, z, k) => grid.walk[k] === 1,
    classify(x, z) {
      const k = Math.floor((z - grid.origin[1]) / grid.cellSize) * grid.w + Math.floor((x - grid.origin[0]) / grid.cellSize);
      if (grid.walk[k]) return KIND.road;
      // Rondellens ö är sista försvarslinjen framför entrén: där går det att bygga, utom vid
      // flaggstången och elskåpen.
      if (inPoly(x, z, ROUNDABOUT.island)) return islandThings().some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.3) ? KIND.thing : KIND.open;
      if (houses.some(r => inRect(r, x, z))) return KIND.house;
      if (houses.some(r => inRect(r, x, z, HOUSE_PAD))) return KIND.house;
      if (things.some(r => inRect(r, x, z, THING_PAD))) return KIND.thing;
      if (denseForestIn(T, x, z)) return KIND.forest;
      return KIND.open;
    },
  });
  // Taken: rutor vars mitt ligger på ett tak (inte i marginalen runt huset).
  const blds = townRoofs(T), n = grid.w * grid.h;
  const roof = new Float32Array(n), bldg = new Int32Array(n);
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.house) continue;
    const x = grid.origin[0] + ((k % grid.w) + 0.5) * grid.cellSize, z = grid.origin[1] + (Math.floor(k / grid.w) + 0.5) * grid.cellSize;
    for (let i = 0; i < blds.length; i++) {
      if (!(blds[i].height(x, z) > 0)) continue;
      // Skytten ligger ovanpå taket: högsta punkten inom 0,8 m (annars sjunker han in i takfallet).
      let y = 0;
      for (const [dx, dz] of ROOF_SAMPLES) y = Math.max(y, blds[i].height(x + dx, z + dz));
      roof[k] = Math.round(y * 100) / 100; bldg[k] = i + 1; break;
    }
  }
  // Hemvärnet (0.9.0): häckar och staket längs tomterna (låga, skymmer inte sikten men ger skydd)
  // och diket längs skogsvägen. Bara öppna rutor; luckan vid uppfarten är ingen häck.
  const hedge = new Uint8Array(n), ditch = new Uint8Array(n);
  const segs = [];
  for (const e of T.lots.edges) {
    if (e.kind === 'none') continue;
    if (!e.gap) { segs.push([e.a, e.b]); continue; }
    const at = t => [e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t];
    const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]) || 1, h = e.gap.len / 2 / L;
    segs.push([e.a, at(Math.max(0, e.gap.t - h))], [at(Math.min(1, e.gap.t + h)), e.b]);
  }
  segs.push(...(T.hedgeSegs ?? []));
  const ditchRoads = (T.ditchRoads ?? ['forest']).map(id => T.roads.find(r => r.id === id)).filter(Boolean);
  // Gnesta Norr (0.10.0): radhusens låga tegelmurar, ett eget skydd (src/sim/squad.js 'brick').
  const brickSegs = T.brickSegs ?? null, brick = brickSegs ? new Uint8Array(n) : null;
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.open || place.walk[k]) continue;
    const x = grid.origin[0] + ((k % grid.w) + 0.5) * grid.cellSize, z = grid.origin[1] + (Math.floor(k / grid.w) + 0.5) * grid.cellSize;
    if (segs.some(sg => distPolyline(x, z, sg) < 1.3)) hedge[k] = 1;
    if (ditchRoads.some(rd => distPolyline(x, z, rd.pts) - rd.width / 2 < 2.4)) ditch[k] = 1;
    if (brick && brickSegs.some(sg => distPolyline(x, z, sg) < 1.3)) brick[k] = 1;
  }
  return { ...place, roof, bldg, buildings: blds.map(b => b.rects), hedge, ditch, ...(brick ? { brick } : {}) };
}
// Gnestas egen stad: allt ovan med Gnestas data.
let gnestaT = null;
export function gnestaTown() {
  return gnestaT ??= { roads: ROADS, lots: LOTS, cars: CARS, ground: GROUND, spawns: SPAWNS, base: BASE,
    bounds: { x0: -82, z0: -48, x1: 80, z1: 64 } };
}
export const buildPlacement = grid => townPlacement(gnestaTown(), grid);

// Dagarna (designen: dag 1 bara öst 1, dag 2 norra vägen, dag 3 skogsvägen, dag 4 bjässar,
// dag 5 allt). Balanserade i 0.4.2 och om i 0.5.0 för fri placering (docs/balance-log.md). hp: dagens hp-faktor för alla zombier;
// spelaren kommer från E4 med M2 II och mer, och fler zombier i bild ryms inte (högst ca 250).
// lead (0.10.2, tempot): gruppen har redan gått så många sekunder när vågen startar (src/sim/sim.js),
// så att första skottet kommer efter 15 till 20 s. Dagens första grupp delas: de första går före.
const g = (type, count, interval, delay, spawn, lead = 0) => ({ type, count, interval, delay, spawn, ...(lead ? { lead } : {}) });
const LEAD_RUN = 20, LEAD_WALK = 62;
export const DAYS = [
  { n: 1, startCash: 900, hp: 4.3, intro: { title: 'Day 1: Barricades', text: "The survivors are inside Gnesta ishall. The horde comes down Sigtunavägen from the east, for the doors. Block a street and they'll walk around the block, past your guns. They're fresh here and take more to put down." },
    hints: { lines: ['Pick the barricade (3).', 'Block Sigtunavägen.', 'Watch them walk around the block.'], steps: ['pick:block', 'block', 'watch'] },
    waves: [ { groups: [g('runner', 5, 1.2, 0, 'east1', LEAD_RUN), g('walker', 20, 0.7, 2, 'east1')] },
             { groups: [g('walker', 36, 0.45, 0, 'east1')] },
             { groups: [g('walker', 60, 0.25, 0, 'east1'), g('runner', 40, 0.3, 6, 'east1')] } ] },
  // 0.10.2 (speltestet av 0.10.1: basen 20 till 2 i våg 1, dag 2 förlorad på två minuter): hp 5,8 till
  // 5,0, våg 1 46 i stället för 60 och norra gruppen först efter 10 s, våg 2 30 löpare (var 40), våg 3
  // 130 (var 160). Naive klarar nu våg 1 utan skada och vinner dagen med 2 till 5 kvar i fyra seeds av fem.
  { n: 2, startCash: 1300, hp: 5.0, intro: { title: 'Day 2: The north road', text: 'A second group comes down the north road. Two ways in, and runners.' },
    waves: [ { groups: [g('walker', 6, 0.6, 0, 'east1', LEAD_WALK), g('walker', 24, 0.45, 3, 'east1'), g('walker', 16, 0.5, 10, 'east2')] },
             { groups: [g('walker', 40, 0.35, 0, 'east1'), g('runner', 30, 0.35, 6, 'east2')] },
             { groups: [g('walker', 50, 0.28, 0, 'east1'), g('walker', 30, 0.35, 0, 'east2'), g('runner', 50, 0.25, 10, 'east1')] } ] },
  { n: 3, startCash: 1300, hp: 5.8, intro: { title: 'Day 3: The forest road', text: 'The forest road opens in the south-east. Three ways in now.' },
    waves: [ { groups: [g('walker', 6, 0.5, 0, 'east1', LEAD_WALK), g('walker', 20, 0.5, 3, 'east1'), g('walker', 20, 0.6, 4, 'forest')] },
             { groups: [g('walker', 40, 0.35, 0, 'east2'), g('runner', 50, 0.25, 4, 'forest')] },
             { groups: [g('walker', 70, 0.25, 0, 'forest'), g('runner', 70, 0.2, 5, 'east1'), g('walker', 50, 0.3, 10, 'east2')] } ] },
  { n: 4, startCash: 1800, hp: 5.1, overlap: 100, intro: { title: 'Day 4: Brutes', text: 'Brutes, and plenty of them. Grenades help. Shut every road and they smash a barricade in seconds, so leave them a way round.' },
    waves: [ { groups: [g('walker', 6, 0.3, 0, 'east1', LEAD_WALK), g('walker', 44, 0.3, 1.8, 'east1'), g('brute', 6, 2.5, 2, 'east2')] },
             { groups: [g('walker', 40, 0.35, 0, 'east2'), g('runner', 40, 0.25, 4, 'forest'), g('brute', 8, 2, 4, 'east2')] },
             { groups: [g('walker', 50, 0.3, 0, 'east1'), g('walker', 40, 0.3, 0, 'forest'), g('runner', 50, 0.2, 6, 'east2'), g('brute', 10, 1.8, 4, 'east2'), g('brute', 10, 1.8, 6, 'east1')] } ] },
  { n: 5, startCash: 1600, hp: 4.0, overlap: 100, intro: { title: 'Day 5: Everything', text: 'All roads, all kinds, all at once. Hold the roundabout in front of the doors.' },
    waves: [ { groups: [g('walker', 6, 0.35, 0, 'east1', LEAD_WALK), g('walker', 34, 0.35, 2.1, 'east1'), g('walker', 30, 0.4, 2, 'east2'), g('runner', 30, 0.35, 4, 'forest')] },
             { groups: [g('runner', 60, 0.2, 0, 'east1'), g('walker', 44, 0.3, 0, 'forest'), g('brute', 10, 2, 2, 'east2')] },
             { groups: [g('walker', 44, 0.3, 0, 'east1'), g('walker', 38, 0.3, 0, 'east2'), g('walker', 38, 0.3, 0, 'forest'),
               g('runner', 60, 0.15, 8, 'east1'), g('brute', 12, 1.6, 2, 'east2'), g('brute', 12, 1.6, 6, 'east1'), g('brute', 10, 1.6, 22, 'east2')] } ] },
];

export const gnesta = {
  id: 'gnesta', name: 'Gnesta', version: GNESTA_VERSION,
  // Spelkameran: hem, zoom (vyns höjd i meter) och panoreringsgräns för kamerans mittpunkt.
  // Längst ut 68 m (var 84 före 0.5.2): längre ut går zombierna inte att skilja åt.
  camera: { target: [-30, 14], view: 52, zoom: [24, 68], pan: { x0: -100, x1: 92, z0: -58, z1: 66 } },
  // Skuggkameran täcker den skarpa ytan (med ishallen i väster och sporthallen i söder).
  shadowBounds: { x0: -118, x1: 84, z0: -50, z1: 82 },
  roads: ROADS, roundabout: ROUNDABOUT, iceRink: ICE_RINK, parking: PARKING, sporthall: SPORTHALL, ground: GROUND,
  lots: LOTS, cars: CARS, playground: PLAYGROUND, labels: LABELS, spawns: SPAWNS, base: BASE, surroundings: SURROUNDINGS,
  grid: buildGrid(),
  baseHp: 20, days: DAYS,
  // 0.10.1: dörrarna släpper in en zombie per 3,2 s (src/sim/sim.js, doorBreak)
  door: { gap: 3.2 },
  // Basen är ishallens entré: igenspikade dörrar som tar skada (render/models.js rinkEntranceModel).
  baseModel: 'rink',
  // Banans upplåsningar (0.6.0): dag 1 lär ut barrikaden, så den finns här utan forskning.
  // På E4 kräver den forskningen som förut (Concrete barrier, efter Heavy wire I).
  // 0.10.1: Ksp 88 också, så att en spelare utan forskningen från E4 (?debug&fresh, eller den som
  // forskat annat) har en tung pjäs dag 1. E4-spelaren har den redan.
  unlocks: ['block', 'm2'],
  // Låses upp när E4 dag 3 är klar.
  unlock: { map: 'riksvagen', day: 3 },
};
gnesta.place = buildPlacement(gnesta.grid);
