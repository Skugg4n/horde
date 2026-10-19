// Sektor Mölnbo: stationen, bron och Folkets hus. Kartan som data, utan three.js (testbar i node).
// Design: docs/superpowers/specs/2026-10-17-molnbo-design.md. Byggnoteringar: docs/superpowers/specs/2026-10-18-molnbo-build-notes.md.
// Kampanjbågen (Mölnbo är kampanjens dag 8 till 10): docs/superpowers/specs/2026-10-18-kampanjplan.md avsnitt 10.
//
// 0.20.0 (H494, Olas satellitbild 2026-10-19): kartan omritad efter verkligheten. Vägnätet är spårat ur Olas
// satellitbild (~/Projects/horde-refs/molnbo/satellit-ola-2026-10-19.jpg, bara referens, inte i repot) och
// kulturmiljökartan. Pixlarna fördes över till järnvägens ram med origo där väg 57 går över spåret, ungefär 0,15 m
// spel per bildpunkt (cirka halv verklig skala, som Gnesta). Järnvägens tvärsnitt (spår, perronger, tåget) och husen
// är nära verklig storlek, så sidorna om spåret är isärskjutna: allt söder om spåret ligger 23 m längre söderut och
// allt norr om det 10 m längre norrut än bilden ger. Det som är rättat jämfört med 0.17 till 0.19:
//   - EN väg över spåret: väg 57:s bro vid stationen. Gångbron (den andra passagen) är borta; trapptornen står
//     vid vägbron, och trappan från norra perrongen går upp på vägbrons däck.
//   - Väg 57 (Gnestavägen) kommer från Järna i nordost, går över bron och fortsätter mot Gnesta i sydväst.
//     Stenbyvägen söderut från korsningen vid caféet, Trollvägen och Kvarnvägen öster om den, Fagernäsvägen längs
//     spåret på södra sidan, Backvägen, Norrängsvägen och Skogstorpsvägen på norra sidan, och stationsparkeringen
//     vid 24Food norr om spåret.
//   - Folkets hus (basen, där folk samlas) ligger vid Kvarnvägen, radhusen vid Mjölnarstigen i sydväst och
//     kvarnen längre söderut, i diset.
// Kartan är ritad i järnvägens ram: u längs spåret (österut, mot Järna) och v tvärs över det (söderut). Spåret
// ligger 21 grader mot öster-nordost i världen. x = öster, z = söder som på de andra banorna.
import { makeRng } from '../sim/rng.js';
import { buildPlace, rect, inRect, distRect, KIND } from '../sim/placement.js';
import { smooth, distPolyline, inPoly } from './gnesta.js';

export const MOLNBO_VERSION = '0.2.0';

// ---------- järnvägens ram ----------
const TH = 21 * Math.PI / 180;
const A = [Math.cos(TH), -Math.sin(TH)], B = [Math.sin(TH), Math.cos(TH)];
// (u, v) i järnvägens ram till världen (x, z), och tillbaka.
export const R = (u, v) => [u * A[0] + v * B[0], u * A[1] + v * B[1]];
export const toRail = (x, z) => [x * A[0] + z * A[1], x * B[0] + z * B[1]];
const RS = pts => pts.map(([u, v]) => R(u, v));
// rotation.y (three.js) för en byggnad vars lokala +x pekar längs (du, dv) i järnvägens ram
export const ryAlong = (du, dv) => { const [dx, dz] = [du * A[0] + dv * B[0], du * A[1] + dv * B[1]]; return Math.atan2(-dz, dx); };
export const RAIL_RY = ryAlong(1, 0);
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- spelytan ----------
// Den skarpa ytan (världens axlar). Utanför den tonar allt mot diset, och där ligger ingångarna.
// 0.20.0: från Skogstorpsvägen och Norrängsvägen i norr till Folkets hus och Mjölnarstigen i söder.
export const CRISP = { x0: -96, x1: 112, z0: -92, z1: 146 };
const outside = (x, z, c = CRISP) => Math.max(c.x0 - x, x - c.x1, c.z0 - z, z - c.z1);

// ---------- järnvägen ----------
// Tre spår, två perronger, staket. Stängd mark för horden, utom norra perrongen (pendeltåget dag 2) som bara når
// vägbron genom trappan. Södra perrongen går att stå på (bakom tåget) men inte att gå på.
export const RAIL = {
  corridor: [-15, 12],                 // v-intervallet som är järnväg
  tracks: [-5.5, -1, 3.8],             // spårens mitt (v)
  gauge: 1.435,
  platformN: { u0: -84, u1: 0, v0: -13, v1: -8, h: 0.9 },     // u1: vid vägbron (sätts under bron nedan)
  platformS: { u0: -84, u1: 0, v0: 6, v1: 10.5, h: 0.9 },
  fences: [-14.6, 1.4, 11.6],          // staket mot tomterna i norr, mellan spår 2 och 3, mot slänten i söder
  masts: { step: 24, v: [-14, 1.4, 11.2] },
};
export const inRail = (x, z) => { const [, v] = toRail(x, z); return v >= RAIL.corridor[0] && v <= RAIL.corridor[1]; };
const inPlat = (P, u, v, pad = 0) => u >= P.u0 - pad && u <= P.u1 + pad && v >= P.v0 - pad && v <= P.v1 + pad;

// ---------- bron ----------
// Vägbron (väg 57), den enda vägen över spåret: korsningen vid caféet (J) i söder, norra brofästet i norr. Däcket
// ligger DECK_H meter över spåren, ramperna går ner till marken mellan |v| = 15 och 30. Bron korsar spåret snett,
// som i verkligheten (satellitbilden: väg 57 går mot nordnordost över spåret), och landar i söder där Gnestavägen,
// Stenbyvägen och Fagernäsvägen möts. Snedden är något mindre än i verkligheten, eftersom järnvägen är i full skala.
export const DECK_H = 4.4;
export const BRIDGE = { a: [-14, 34], b: [26, -34], width: 9, deck: 15, ramp: 30 };
export const uOnBridge = v => BRIDGE.a[0] + (BRIDGE.a[1] - v) * (BRIDGE.b[0] - BRIDGE.a[0]) / (BRIDGE.a[1] - BRIDGE.b[1]);
const westEdge = v => uOnBridge(v) - BRIDGE.width / 2;
// Trapptornen: ett högt betongschakt vid vägbrons västra kant med trappan utanpå, platt tak (prickskytt), ett vid
// varje perrong. LINK: trappan på norra perrongen upp till vägbrons däck (dit pendeltågets folk går).
const TOWER_GAP = 0.9, TOWER_SIZE = 3.6;
export const TOWERS = [-12.4, 8.4].map((v, i) => ({ id: i ? 'towerS' : 'towerN', at: [westEdge(v) - TOWER_GAP - TOWER_SIZE / 2, v], size: TOWER_SIZE, h: 7.2 }));
export const LINK = { v: -9.4, u0: westEdge(-9.4) - 14, u1: westEdge(-9.4) + 0.4, w: 2.4 };
// perrongerna slutar vid vägbron
RAIL.platformN.u1 = westEdge(RAIL.platformN.v1) - 0.5;
RAIL.platformS.u1 = westEdge(RAIL.platformS.v0) - 0.5;
// Däckets höjd i en punkt: vägbron med ramperna och trappan upp från norra perrongen (0 = inget däck).
// Ren funktion av läget.
export function deckY(x, z) {
  const [u, v] = toRail(x, z), av = Math.abs(v);
  if (Math.abs(v - LINK.v) <= LINK.w / 2 + 0.6 && u >= LINK.u0 && u <= LINK.u1) return RAIL.platformN.h + (DECK_H - RAIL.platformN.h) * smoothstep(LINK.u0 + 1, LINK.u1 - 1.5, u);
  if (av <= BRIDGE.ramp + 2 && Math.abs(u - uOnBridge(v)) <= BRIDGE.width / 2 + 0.9) return DECK_H * (1 - smoothstep(BRIDGE.deck, BRIDGE.ramp, av));
  return 0;
}
// 0.17.1 (speltestet av 0.17.0: en Psg 90 hamnade under gångbron och syntes inte): en ruta under däcket (eller
// under rampens kant) går inte att ställa något på. Rutans mitt och fyra punkter nära kanterna provas, så att
// sandsäckarna inte sticker in under däcket. UNDER_DECK: lägsta däckhöjden som räknas.
export const UNDER_DECK = 0.3;
const DECK_SAMPLES = [[0, 0], [-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]];
export const underDeck = (x, z) => DECK_SAMPLES.some(([dx, dz]) => deckY(x + dx, z + dz) >= UNDER_DECK);
// Höjden över marken i en punkt (bara bilden: zombierna, hindren och vägen på bron och perrongen). Ren funktion av läget.
export function groundY(x, z) {
  const [u, v] = toRail(x, z);
  const d = deckY(x, z);
  if (d > 0) return d;
  if (inPlat(RAIL.platformN, u, v, 0.5)) return RAIL.platformN.h;
  return 0;
}

// ---------- vägar ----------
// I järnvägens ram, spårade ur satellitbilden (se överst). surface: asphalt | gravel | dirt. walk: false = ritas men
// ingår inte i rutnätet. bridge: ritas av byggsatsen (bron och ramperna), inte på marken.
const J = [-14, 34];          // korsningen vid caféet, vid brons södra fot
const KV = [-12, 131];         // Kvarnvägen in på Stenbyvägen
const TK = [35.5, 106.5];      // Trollvägen, Kvarnvägen och Dvärgvägen möts
const NB = [31, -42];          // väg 57 norr om bron, där Backvägen och Skogstorpsvägen går ut
const ROADS_RAIL = [
  { id: 'v57', name: 'Väg 57', surface: 'asphalt', width: 7, center: true, bridge: true, pts: [BRIDGE.a, BRIDGE.b] },
  // väg 57 från bron mot Järna (nordost): Backvägen och Skogstorpsvägen vid NB, Norrängsvägen längre upp
  { id: 'v57n', name: 'Väg 57', surface: 'asphalt', width: 7, curbs: true, center: true, lamps: { side: -1, step: 22 },
    pts: [BRIDGE.b, [28.5, -38], NB, [35.5, -46.5], [41.5, -52], [51.5, -60.5], [62, -70], [69.5, -77], [76, -84], [84, -96], [92, -112]] },
  // väg 57 från korsningen mot Gnesta (sydväst), Gnestavägen
  { id: 'gnestavagen', name: 'Gnestavägen', surface: 'asphalt', width: 7, curbs: true, center: true, lamps: { side: 1, step: 22 },
    pts: [J, [-20, 37], [-26, 38], [-31.5, 38.5], [-47.5, 38.5], [-63, 37], [-78.5, 35.5], [-98.5, 33.5], [-130, 32], [-170, 32], [-220, 34]] },
  { id: 'stenby', name: 'Stenbyvägen', surface: 'asphalt', width: 6, curbs: true, center: true, lamps: { side: 1, step: 22 },
    pts: [J, [-10, 42], [-8.5, 52.5], [-9, 63.5], [-9, 74.5], [-9.5, 87.5], [-9.5, 100.5], [-10, 113], [-10.5, 124], KV, [-18, 137.5], [-26.5, 143.5], [-37, 149], [-46.5, 157], [-55, 166.5], [-62, 180], [-68, 200], [-72, 230]] },
  { id: 'troll', name: 'Trollvägen', surface: 'asphalt', width: 5, curbs: true,
    pts: [[-8.5, 57], [0.5, 57.5], [13.5, 58], [26, 59.5], [33.5, 61.5], [37.5, 67], [37.5, 75.5], [36.5, 88], [35.5, 99], TK] },
  { id: 'kvarn', name: 'Kvarnvägen', surface: 'asphalt', width: 5, curbs: true,
    pts: [TK, [28.5, 110.5], [20, 115], [12, 119.5], [4, 123.5], [-3, 127.5], [-8.5, 130.5], KV] },
  { id: 'dvarg', name: 'Dvärgvägen', surface: 'asphalt', width: 4.5, curbs: false,
    pts: [TK, [44.5, 105.5], [55.5, 107.5], [67.5, 109.5], [79.5, 112], [100, 116], [130, 120]] },
  // Folkets hus: grusgången från Kvarnvägen till gårdsplanen framför gaveln (basen)
  { id: 'folkets', name: 'Folkets hus', surface: 'gravel', width: 5, paint: false, pts: [[16, 117.5], [21, 122.5], [26.5, 127.5]] },
  // Fagernäsvägen längs spåret på södra sidan, förbi stationshuset, österut mot Järna
  { id: 'fagernas', name: 'Fagernäsvägen', surface: 'asphalt', width: 5, curbs: false,
    pts: [J, [-6, 33], [2, 33], [11, 33], [26.5, 33], [42.5, 34], [58, 35], [73.5, 36.5], [95.5, 38.5], [110.5, 40.5], [140, 44], [180, 48], [230, 52]] },
  // norra sidan
  { id: 'backv', name: 'Backvägen', surface: 'asphalt', width: 4.5, curbs: false,
    pts: [NB, [25, -48], [21, -55], [20, -62], [20, -69.5], [21, -82], [22, -91], [24, -100], [27, -120], [30, -150]] },
  { id: 'norrang', name: 'Norrängsvägen', surface: 'asphalt', width: 4.5, curbs: false,
    pts: [[48.5, -57.5], [58.5, -51], [68, -46], [78.5, -44], [91.5, -43.5], [100.5, -42.5], [113, -40.5], [125, -38.5], [150, -36], [190, -34]] },
  { id: 'skogstorp', name: 'Skogstorpsvägen', surface: 'asphalt', width: 4.5, curbs: false,
    pts: [NB, [21, -43], [9.5, -45], [-1, -49], [-12, -55], [-23.5, -62], [-26.5, -70.5], [-29.5, -83], [-34.5, -91], [-41.5, -97], [-52, -104], [-80, -112], [-120, -118]] },
  // vägen ner till stationsparkeringen (parkeringen själv går att bygga på)
  { id: 'station', name: 'Mölnbo station', surface: 'asphalt', width: 4.5, curbs: false,
    pts: [[-23.5, -62], [-28, -54.5], [-33, -45], [-35.5, -35], [-36, -28]] },
  { id: 'mjolnar', name: 'Mjölnarstigen', surface: 'asphalt', width: 4.5, curbs: false,
    pts: [[-36.5, 149], [-44, 146.5], [-52.5, 139], [-60.5, 131], [-72, 120], [-83, 110], [-94, 101], [-110, 88]] },
];
export const ROADS = ROADS_RAIL.map(r => {
  const raw = RS(r.pts);
  return { ...r, walk: r.walk !== false, rail: r.pts, ptsRaw: raw, pts: r.bridge || r.pts.length < 3 ? raw : smooth(raw) };
});
export const road = id => ROADS.find(r => r.id === id);

// Ytor (polygoner i järnvägens ram): målas som asfalt eller grus men är inte gångbara. Där står vapenplatserna i
// designen: caféets gård, Folkets hus grusplan, stationshusets grusplan och stationsparkeringen vid 24Food.
const AREAS_RAIL = {
  parking: [[-36.5, -24], [-13, -17.5], [-9, -31], [-33, -40]],      // stationsparkeringen (24Food)
  plaza: [[17, 121], [36, 121], [36, 129.5], [17, 129.5]],            // Folkets hus grusplan
  cafePark: [[-3, 50], [8.5, 50], [8.5, 54], [-3, 54]],               // caféets gård mot Trollvägen
  stationYard: [[70, 26], [96, 26], [96, 32], [70, 32]],               // grusplanen framför stationshuset
};
export const AREAS = Object.fromEntries(Object.entries(AREAS_RAIL).map(([k, p]) => [k, RS(p)]));
const PLAT_N = RS([[RAIL.platformN.u0, RAIL.platformN.v0], [RAIL.platformN.u1, RAIL.platformN.v0], [RAIL.platformN.u1, RAIL.platformN.v1], [RAIL.platformN.u0, RAIL.platformN.v1]]);
const PLAT_S = RS([[RAIL.platformS.u0, RAIL.platformS.v0], [RAIL.platformS.u1, RAIL.platformS.v0], [RAIL.platformS.u1, RAIL.platformS.v1], [RAIL.platformS.u0, RAIL.platformS.v1]]);
export const PLATFORMS = { N: PLAT_N, S: PLAT_S };

// 0.17.2 (H307): står rektangeln (x, z, ry, w, d) fri från de gångbara vägarna (med pad meters marginal)?
function clearOfRoads(x, z, ry, w, d, pad = 0.3) {
  const c = Math.cos(ry), sn = Math.sin(ry), pts = [];
  for (const a of [-1, -0.5, 0, 0.5, 1]) for (const b of [-1, -0.5, 0, 0.5, 1]) {
    const lx = a * w / 2, lz = b * d / 2;
    pts.push([x + lx * c + lz * sn, z - lx * sn + lz * c]);
  }
  return !ROADS.some(r => r.walk && pts.some(([px, pz]) => distPolyline(px, pz, r.pts) < r.width / 2 + pad));
}

// ---------- byggnaderna ----------
// Lokal +z är framsidan (dörren, mot gatan), lokal +x längs fasaden. w längs x, d längs z.
// eave: takfotens höjd, ridge: nockens höjd, ridgeX: nocken längs x. perch: prickskytt på taket.
const B0 = (id, kind, [u, v], w, d, front, o = {}) => {
  const [x, z] = R(u, v);
  // front: åt vilket håll framsidan vetter i järnvägens ram ([du, dv])
  const [fu, fv] = front, ry = ryAlong(fv, -fu);   // lokal +z = front
  return { id, kind, x, z, ry, w, d, eave: 3.0, ridge: 5.5, ridgeX: true, u, v, ...o };
};
export const FOLKETS = (() => {
  // Folkets hus: stort rött trähus vid Kvarnvägen, långt i nord-sydlig riktning (satellitbilden). Gaveln med skylten
  // och dörrarna vetter norrut mot grusplanen, där gången från Kvarnvägen slutar.
  const [u, v] = [28, 140], len = 20, wid = 13;
  const [x, z] = R(u, v);
  const ry = ryAlong(0, -1);           // lokal +x mot grusplanen i norr
  const at = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const face = len / 2;
  return { id: 'folkets', x, z, ry, len, wid, wallH: 6.2, face, main: 0, doors: [-3.6, -0.8, 0.8, 3.6], at, entrance: at(face + 1.4, 0), u, v };
})();
const STATION = B0('station', 'station', [84, 21], 15, 8, [0, 1], { eave: 3.6, ridge: 6.4, perch: true });
export const X60 = (() => {
  // Det övergivna X60 vid södra perrongen. Fyra vagnar.
  const u0 = -80, u1 = -22, v = RAIL.tracks[2];
  const [x, z] = R((u0 + u1) / 2, v);
  return { id: 'x60', kind: 'x60', x, z, ry: RAIL_RY, w: u1 - u0, d: 3.3, eave: 4.1, ridge: 4.1, perch: true, u0, u1, v, cars: 4 };
})();
// Radhusen vid Mjölnarstigen (satellitbilden: rader parallellt med gatan på båda sidor), framsidan mot gatan.
function rowHouses() {
  const P = road('mjolnar').rail, out = [], w = 22, d = 8.5, off = 4.5 / 2 + 3.5 + d / 2;
  // punkten s meter in längs gatan, med riktningen
  const along = s => {
    for (let i = 1; i < P.length; i++) {
      const [au, av] = P[i - 1], [bu, bv] = P[i], L = Math.hypot(bu - au, bv - av);
      if (s <= L) return [au + (bu - au) * s / L, av + (bv - av) * s / L, (bu - au) / L, (bv - av) / L];
      s -= L;
    }
    return null;
  };
  for (const s of [16, 42, 68]) for (const side of [1, -1]) {
    const a = along(s);
    if (!a) continue;
    const [pu, pv, du, dv] = a, nu = -dv * side, nv = du * side, cu = pu + nu * off, cv = pv + nv * off;
    const [x, z] = R(cu, cv), ry = ryAlong(-nv, nu);
    if (!clearOfRoads(x, z, ry, w, d, 1)) continue;
    out.push({ id: `row${out.length + 1}`, kind: 'chain', x, z, ry, w, d, eave: 2.9, ridge: 5.0, ridgeX: true, units: 4, u: cu, v: cv });
  }
  return out;
}
const HOUSES = [
  STATION,
  // Harmoni, caféet vid brofästet: mellan Stenbyvägen och Fagernäsvägen, framsidan mot Stenbyvägen
  B0('cafe', 'cafe', [3.5, 43], 12, 9, [-1, 0], { eave: 5.4, ridge: 7.9 }),
  // Postillan vid caféets gård, mot Trollvägen
  B0('postillan', 'white', [15, 50], 10, 7, [0, 1], { eave: 5.2, ridge: 7.8 }),
  // 0.17.2 (H301): missionskyrkans klocktorn (takryttaren, lokalt (lx, lz)) är en prickskyttepost, 10,6 m upp.
  // 0.20.0: Mölnbo missionskyrka öster om Stenbyvägen, söder om Trollvägen (satellitbilden)
  B0('mission', 'mission', [2, 74], 13, 9, [-1, 0], { eave: 4.2, ridge: 8.2, ridgeX: false, tower: { lx: 0, lz: 1.8, size: 2.6, h: 10.6 } }),
  B0('white', 'white', [-38, 46], 11, 9, [0, -1], { eave: 5.6, ridge: 8.4 }),
  // gamla speceributiken på norra sidan, vid väg 57 mot Järna
  B0('yellow', 'yellow', [52, -45], 11, 9, [-1, 0], { eave: 4.9, ridge: 7.6 }),
  // 0.17.2 (H301): det höga huset är högt nog för prickskytten (0.20.0: väster om Stenbyvägen, söder om caféet)
  B0('apt1', 'apartment', [-27, 104], 22, 11, [1, 0], { eave: 6.2, ridge: 8.8, perch: true }),
  // 24Food: den lilla butiken på stationsparkeringen
  B0('shop', 'shop', [-30, -32], 7, 3.4, [1, 0], { eave: 2.8, ridge: 2.8 }),
  // Kvarnen längre söderut vid Stenbyvägen, i diset
  B0('kvarn', 'kvarn', [-34, 164], 12, 10, [-1, -0.6], { eave: 6.0, ridge: 9.2 }),
  ...rowHouses(),
];
// Villorna: generiska hus längs gatorna (fritt utplacerade med marginal, deterministiskt).
const FACADES = ['white', 'white', 'yellow', 'red', 'red', 'grey', 'beige', 'brown', 'blueGrey'];
const ROOFS = ['black', 'charcoal', 'tile', 'tile', 'slate'];
const VILLA_ROADS = ['norrang', 'backv', 'skogstorp', 'v57n', 'station', 'gnestavagen', 'stenby', 'troll', 'kvarn', 'dvarg', 'fagernas'];
// bergskärningen längs Fagernäsvägens södra sida (ROCK nedan): inga villor där
const inRockBand = (u, v) => u > 12 && u < 66 && v > 35 && v < 45;
function placeVillas() {
  const rng = makeRng(20261018), r = () => rng();
  const out = [];
  const fixed = [...HOUSES.map(h => rect(h.x, h.z, h.ry, h.w + 4, h.d + 4)), rect(FOLKETS.x, FOLKETS.z, FOLKETS.ry, FOLKETS.len + 6, FOLKETS.wid + 6)];
  const free = q => !fixed.some(f => rectHit(f, q)) && !out.some(o => rectHit(o.r, q));
  const walkRoads = ROADS.filter(rd => rd.walk);
  for (const id of VILLA_ROADS) {
    const rd = road(id);
    const P = rd.rail;
    for (let i = 1; i < P.length; i++) {
      const [au, av] = P[i - 1], [bu, bv] = P[i], L = Math.hypot(bu - au, bv - av);
      const du = (bu - au) / L, dv = (bv - av) / L;
      for (let s = 8; s < L - 4; s += 17) {
        for (const side of [-1, 1]) {
          const nu = -dv * side, nv = du * side;
          const w = 9 + r() * 3, d = 7.5 + r() * 2;
          const off = rd.width / 2 + 4.5 + d / 2;
          const cu = au + du * s + nu * off, cv = av + dv * s + nv * off;
          const [x, z] = R(cu, cv);
          // inte i järnvägen (med slänterna), inte i bergskärningen, inom räckhåll för kameran
          if (cv > RAIL.corridor[0] - 6 && cv < RAIL.corridor[1] + 5) continue;
          if (inRockBand(cu, cv)) continue;
          if (outside(x, z) > 40) continue;
          const ry = ryAlong(-nv, nu);   // framsidan (lokal +z) mot vägen (-nu, -nv)
          const q = rect(x, z, ry, w + 3, d + 3);
          if (walkRoads.some(o => o !== rd && distPolyline(x, z, o.pts) < o.width / 2 + Math.max(w, d) / 2 + 3)) continue;
          if (distPolyline(x, z, rd.pts) < rd.width / 2 + d / 2 + 2) continue;
          if (!clearOfRoads(x, z, ry, w, d, 1)) continue;
          if (Object.values(AREAS).some(a => inPoly(x, z, a)) || inRect(rect(X60.x, X60.z, X60.ry, X60.w + 20, 40), x, z)) continue;
          if (underDeck(x, z) || Math.abs(cu - uOnBridge(cv)) < 14 && Math.abs(cv) < 40) continue;
          if (!free(q)) continue;
          const storeys = r() < 0.4 ? 1.5 : 1;
          out.push({ r: q, h: { id: `V-${out.length + 1}`, kind: 'villa', x, z, ry, w, d, storeys, roof: r() < 0.25 ? 'hip' : 'gable',
            facade: FACADES[(r() * FACADES.length) | 0], roofColor: ROOFS[(r() * ROOFS.length) | 0], chimney: r() < 0.6, veranda: r() < 0.3,
            solar: r() < 0.1, seed: (r() * 1e9) | 0, garage: 0, road: id, u: cu, v: cv } });
        }
      }
    }
  }
  return out.map(o => o.h);
}
function rectHit(p, q) {
  // separerande axlar för två rektanglar (placement.js rect)
  const cs = c => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [c.x + a * c.hw * c.c + b * c.hd * c.s, c.z - a * c.hw * c.s + b * c.hd * c.c]);
  const axes = [[p.c, -p.s], [p.s, p.c], [q.c, -q.s], [q.s, q.c]];
  const P = cs(p), Q = cs(q);
  return axes.every(([ax, az]) => {
    const pp = P.map(([x, z]) => x * ax + z * az), qq = Q.map(([x, z]) => x * ax + z * az);
    return Math.max(...pp) >= Math.min(...qq) && Math.max(...qq) >= Math.min(...pp);
  });
}
export const VILLAS = placeVillas();
// Villornas tak: som villan i gnesta-kit.js (sockel 0,32 m, vägg 2,75 eller 3,3 m, lutning per typ).
for (const h of VILLAS) {
  const top = 0.32 + (h.storeys === 1.5 ? 3.3 : 2.75), pitch = h.storeys === 1.5 ? 0.74 : h.roof === 'hip' ? 0.4 : 0.47;
  h.eave = top; h.ridge = top + (h.d / 2) * Math.tan(pitch); h.ridgeX = true;
}
export const BUILDINGS = [...HOUSES, ...VILLAS];
// Tomterna (för de vilande smittade, src/sim/sim.js houseDoor, och debugmenyn): varje hus med en dörr.
export const LOTS = { plots: BUILDINGS.filter(h => h.kind !== 'x60').map(h => ({ id: h.id, house: h, extras: [] })), edges: [], blocks: [] };
// Norra sidans villor (dag 1:s evakuering och dag 3:s flodvåg): de som ligger norr om spåret och inom den skarpa ytan.
export const NORTH_HOMES = VILLAS.filter(h => h.v < RAIL.corridor[0] - 10 && outside(h.x, h.z) < -2);
// Villan på norra sidan närmast punkten (u, v) i järnvägens ram, och inte redan vald.
function homeNear(u, v, taken) {
  let best = null, bd = Infinity;
  for (const h of NORTH_HOMES) { if (taken.has(h.id)) continue; const d = Math.hypot(h.u - u, h.v - v); if (d < bd) { bd = d; best = h; } }
  taken.add(best.id);
  return best.id;
}

// ---------- bergskärningen, staket, saker ----------
// Bergskärningen i granit längs Fagernäsvägens södra sida (Street View 6).
export const ROCK = { u0: 16, u1: 62, v: 39.5, depth: 2.6, h: 3.2 };
// 0.17.2 (H307, "en stenmur korsar vägen"): skärningen bryts där en gata går igenom, i bitar [u0, u1]
ROCK.segs = (() => {
  const out = [], step = 0.5;
  let a = null;
  for (let u = ROCK.u0; u <= ROCK.u1 + 1e-9; u += step) {
    const [x, z] = R(u, ROCK.v), ok = clearOfRoads(x, z, RAIL_RY, step, ROCK.depth, 0.6);
    if (ok && a == null) a = u;
    if ((!ok || u + step > ROCK.u1 + 1e-9) && a != null) { const b = ok ? u : u - step; if (b - a >= 3) out.push([a, b]); a = null; }
  }
  return out;
})();
// 0.20.0: Hembygdsgården ligger väster om kartan (kulturmiljökartan), så gärdsgården är borta.
export const FENCES = [];
// Trafikljusen vid caféets korsning (J).
export const LIGHTS = [[-7.5, 30], [-21, 32], [-3.5, 38.5], [-17, 42.5]].map(([u, v]) => R(u, v));
// Parkerade bilar: stationsparkeringen vid 24Food och caféets gård.
export const CARS = (() => {
  const r = makeRng(5711), out = [], park = AREAS.parking;
  for (let u = -36; u <= -8; u += 2.8) for (let v = -36; v <= -19; v += 5.5) {
    if (r() > 0.45) continue;
    const [x, z] = R(u + (r() - 0.5) * 0.3, v);
    if (!inPoly(x, z, park)) continue;
    out.push({ x, z, ry: ryAlong(0, 1) + (r() < 0.5 ? 0 : Math.PI), color: (r() * 8) | 0 });
  }
  for (const [u, v] of [[0.5, 52], [4.5, 52]]) { const [x, z] = R(u, v); out.push({ x, z, ry: ryAlong(0, 1), color: (r() * 8) | 0 }); }
  // 0.17.2 (H307): ingen bil på en gata, ingen i butiken
  const shop = HOUSES.find(h => h.id === 'shop');
  return out.filter(c => clearOfRoads(c.x, c.z, c.ry, 4.3, 1.82) && !rectHit(rect(shop.x, shop.z, shop.ry, shop.w + 1, shop.d + 1), rect(c.x, c.z, c.ry, 4.3, 1.82)));
})();
// Väntkurer i glas på perrongerna, avgångsskylten (blå LED) och kontaktledningsstolparna.
export const SHELTERS = [[-60, -11.6], [-36, -11.6], [-56, 9.6], [-30, 9.6]].map(([u, v]) => ({ x: R(u, v)[0], z: R(u, v)[1], u, v }));
export const DEPARTURE_SIGN = { at: R(-20, -10.4), u: -20, v: -10.4 };
// Skog, åkrar och sjön (polygoner i världen). Skogen och sjön ligger mest i dimkanten.
export const GROUND = {
  bounds: { x0: CRISP.x0 - 24, x1: CRISP.x1 + 24, z0: CRISP.z0 - 24, z1: CRISP.z1 + 24 },
  ppm: 10,
  forest: [
    RS([[-150, -60], [-60, -120], [-40, -170], [-140, -180], [-230, -100]]),
    RS([[34, -100], [110, -70], [170, -30], [180, -130], [60, -160]]),
    RS([[-10, -70], [12, -66], [14, -92], [-6, -96]]),
    RS([[70, 42], [100, 44], [104, 70], [80, 78], [66, 60]]),
    RS([[140, 20], [220, 0], [240, 90], [160, 80]]),
    RS([[-60, 60], [-30, 58], [-24, 90], [-40, 96], [-62, 86]]),
  ],
  field: RS([[-260, 44], [-110, 44], [-100, 70], [-150, 110], [-260, 120]]),
  field2: RS([[50, 160], [120, 140], [130, 210], [40, 225]]),
  lake: RS([[150, 150], [190, 120], [230, 140], [240, 200], [190, 230], [150, 210]]),
};
// Bara bild utanför kartan (den som läser dimkanten ser byn fortsätta): villor norr om spåret, gårdar
// vid åkrarna, Fagernäs vid sjön och Hembygdsgården i väster. [u, v, bredd, djup, grader, höjd, tak]
const FAR_RAIL = [
  [-60, -130, 11, 9, 5, 4.6], [-30, -140, 10, 8, -10, 4.6], [-90, -125, 12, 9, 0, 4.6], [-120, -110, 11, 9, 20, 4.6],
  [0, -125, 10, 9, 0, 4.6], [10, -150, 12, 10, 10, 5], [60, -125, 10, 9, -15, 4.6], [70, -150, 26, 12, 0, 7, 'flat'], [110, -110, 11, 9, 0, 4.6],
  [-150, -70, 11, 9, 0, 4.6], [-170, -40, 12, 9, 10, 4.6], [-150, 52, 14, 8, 0, 5.4], [-160, 74, 20, 10, 90, 6.5],
  [-200, 14, 12, 8, 0, 4.6], [150, 95, 30, 16, 10, 7.5], [162, 112, 12, 8, 0, 4.6], [120, 150, 11, 9, 0, 4.6], [70, 170, 11, 9, 10, 4.6],
  [0, 185, 12, 8, 0, 4.6], [-90, 150, 11, 9, 0, 4.6], [150, -10, 11, 9, 10, 4.6], [160, 40, 11, 9, 0, 4.6], [-120, 48, 12, 7, 0, 4.6],
];
export const FAR = FAR_RAIL.map(([u, v, w, d, deg = 0, h = 4.6, roof = 'gable']) => {
  const [x, z] = R(u, v);
  return { x, z, w, d, ry: RAIL_RY - deg * Math.PI / 180, h, roof };
}).filter(f => clearOfRoads(f.x, f.z, f.ry, f.w, f.d, 1) && outside(f.x, f.z) > 6);    // 0.17.2 (H307): inget hus i diset på en väg

// ---------- ingångarna ----------
// Varje ingång ligger där dess dimväg är SPAWN_OUT meter utanför den skarpa ytan. Dagarna i DAYS.
const SPAWN_OUT = 14;
function fogPoint(id, out = SPAWN_OUT) {
  const P = road(id).pts;
  for (let i = 1; i < P.length; i++) {
    const [ax, az] = P[i - 1], [bx, bz] = P[i];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; if (outside(x, z) >= out) return [x, z]; }
  }
  throw new Error('ingen dimkant på ' + id);
}
// 0.20.0 (H494, kampanjbågen dag 8 till 10): horden har tagit Järna och kommer från nordost, längs väg 57 och längs
// banan på båda sidor om spåret, på väg mot Gnesta i sydväst. S1 väg 57 norrifrån (över bron), S2 Fagernäsvägen
// österifrån längs spåret (södra sidan), S3 Norrängsvägen i nordost (norra sidan, över bron). S4 Stenbyvägen
// söderifrån är en mindre grupp en dag (H451). S5 Backvägen och S6 Skogstorpsvägen är flodvågen dag 3 (norra sidan).
// Gnestavägen, Kvarnvägen, Dvärgvägen och Mjölnarstigen har ingen ingång.
export const SPAWNS = [
  { id: 's1', name: 'Väg 57 north', day: 1, at: fogPoint('v57n') },
  { id: 's2', name: 'Fagernäsvägen east', day: 2, at: fogPoint('fagernas') },
  { id: 's3', name: 'Norrängsvägen', day: 1, at: fogPoint('norrang') },
  { id: 's4', name: 'Stenbyvägen south', day: 2, at: fogPoint('stenby') },
  { id: 's5', name: 'Backvägen', day: 3, at: fogPoint('backv') },
  { id: 's6', name: 'Skogstorpsvägen', day: 3, at: fogPoint('skogstorp') },
];
export const BASE = { at: FOLKETS.entrance };
// 0.19.0 (H452): pendeltåget som rullar in dag 2 (0.20.0, förut dag 4) stannar på spår 1 vid norra perrongen, lika långt
// som X60 vid södra. Dörrarna (två per vagn och sida) slås upp mot perrongen; de som kliver ut står på perrongen vid
// dörren och tar trappan upp på vägbron. INBOUND: tåget i järnvägens ram (render/molnbo-world.js ritar det), DOORS i världen.
export const INBOUND = (() => {
  const u0 = X60.u0, u1 = X60.u1, v = RAIL.tracks[0], n = X60.cars, Lc = (u1 - u0) / n, cl = Lc - 0.5;
  const doorsU = [];
  for (let i = 0; i < n; i++) { const cx = u0 + (i + 0.5) * Lc; doorsU.push(cx - 0.28 * cl, cx + 0.28 * cl); }
  return { u0, u1, v, uStop: (u0 + u1) / 2, from: 260, doorsU, doors: doorsU.map(u => R(u, RAIL.platformN.v0 + 1.6)) };
})();

// 0.19.2 (speltestet av 0.19.1, fynd 1: "jag såg inte var perrongen är eller vart folket från tåget går"): det som lyser
// när pendeltåget signalerar. Norra perrongen och de två trapptornens tak (konturerna, med sina höjder), etiketten mitt
// på perrongen där tåget stannar, och målet för pilarna från de närmaste enheterna.
// 0.20.0 (H490): målet är trappans topp på vägbron, där de som kliver ur kommer upp och där det lönar sig att möta dem.
export const TRAIN_MARK = (() => {
  const P = RAIL.platformN, sq = t => RS([[t.at[0] - t.size / 2, t.at[1] - t.size / 2], [t.at[0] + t.size / 2, t.at[1] - t.size / 2], [t.at[0] + t.size / 2, t.at[1] + t.size / 2], [t.at[0] - t.size / 2, t.at[1] + t.size / 2]]);
  return {
    polys: [PLAT_N, ...TOWERS.map(sq)],
    ys: [P.h + 0.06, ...TOWERS.map(t => t.h + 0.06)],
    label: R(INBOUND.uStop, (P.v0 + P.v1) / 2), labelY: P.h + 1.2,
    target: R(uOnBridge(LINK.v), LINK.v),
    pts: [...PLAT_N, ...TOWERS.map(t => R(t.at[0], t.at[1])), R(uOnBridge(LINK.v), LINK.v)],
  };
})();

// ---------- rutnätet ----------
// 2 m-rutor, samma regler som Gnesta (src/data/gnesta.js townGrid): gångbart där en gångbar väg eller yta
// ligger, en sammanhängande kedja längs varje väglinje. Järnvägen är stängd; bron är vanliga rutor (horden ser inte
// höjden, bara bilden lyfter dem). Norra perrongen är gångbar men når resten bara genom trappan till vägbron.
export const GRID_BOUNDS = { x0: -128, z0: -124, x1: 144, z1: 178 };
export function molnboGrid(cellSize = 2) {
  const { x0, z0, x1, z1 } = GRID_BOUNDS;
  const gw = Math.round((x1 - x0) / cellSize), gh = Math.round((z1 - z0) / cellSize);
  const walk = new Uint8Array(gw * gh), terrain = new Uint8Array(gw * gh);
  const walkRoads = ROADS.filter(r => r.walk);
  const cx = i => x0 + (i + 0.5) * cellSize, cz = j => z0 + (j + 0.5) * cellSize;
  const linkPoly = RS([[LINK.u0, LINK.v - LINK.w / 2], [LINK.u1, LINK.v - LINK.w / 2], [LINK.u1, LINK.v + LINK.w / 2], [LINK.u0, LINK.v + LINK.w / 2]]);
  // Rutor som aldrig är gångbara: tornen (även om en väglinje passerar nära).
  const solid = (x, z) => TOWERS.some(t => { const [u, v] = toRail(x, z); return Math.abs(u - t.at[0]) <= t.size / 2 && Math.abs(v - t.at[1]) <= t.size / 2; });
  const open = (x, z) => walkRoads.some(r => distPolyline(x, z, r.pts) <= r.width / 2 + 0.25) || inPoly(x, z, PLAT_N) || inPoly(x, z, linkPoly);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = cx(i), z = cz(j);
    if (!open(x, z) || solid(x, z)) continue;
    // i järnvägen: bara bron, perrongen och trappan
    if (inRail(x, z)) {
      const [u, v] = toRail(x, z);
      const onBridge = Math.abs(u - uOnBridge(v)) <= BRIDGE.width / 2 + 0.25;
      if (!onBridge && !inPoly(x, z, PLAT_N) && !inPoly(x, z, linkPoly)) continue;
    }
    walk[j * gw + i] = 1;
  }
  const mark = (x, z) => {
    const i = Math.floor((x - x0) / cellSize), j = Math.floor((z - z0) / cellSize);
    if (i < 0 || j < 0 || i >= gw || j >= gh || solid(cx(i), cz(j))) return;
    walk[j * gw + i] = 1;
  };
  for (const r of walkRoads) for (let k = 1; k < r.pts.length; k++) {
    const [ax, az] = r.pts[k - 1], [bx, bz] = r.pts[k];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
    for (let t = 0; t <= n; t++) mark(ax + (bx - ax) * t / n, az + (bz - az) * t / n);
  }
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const k = j * gw + i;
    if (!walk[k]) continue;
    let near = null, nd = Infinity;
    for (const r of walkRoads) { const d = distPolyline(cx(i), cz(j), r.pts) - r.width / 2; if (d < nd) { nd = d; near = r; } }
    terrain[k] = near?.surface === 'gravel' && nd < 0.5 ? 2 : 1;
  }
  const cellOf = ([x, z]) => [Math.min(gw - 1, Math.max(0, Math.floor((x - x0) / cellSize))), Math.min(gh - 1, Math.max(0, Math.floor((z - z0) / cellSize)))];
  let best = null, bd = Infinity;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) if (walk[j * gw + i]) {
    const d = Math.hypot(cx(i) - BASE.at[0], cz(j) - BASE.at[1]);
    if (d < bd) { bd = d; best = [i, j]; }
  }
  return {
    w: gw, h: gh, cellSize, origin: [x0, z0], walk, terrain,
    spawns: SPAWNS.map(s => ({ id: s.id, cell: cellOf(s.at) })),
    base: best, cellOf, center: (i, j) => [cx(i), cz(j)],
  };
}

// ---------- placeringen ----------
// Gator, bron och perrongen är gata. Husen (med en meters marginal), tornen, tåget och bergskärningen är hus
// och skymmer efter sin höjd. Järnvägen i övrigt är hinder (spåren), utom södra perrongen: där går det att stå
// bakom tåget (tåget är skydd för grupperna, 'brick'). Prickskyttelägen (perch): trapptornens tak,
// stationshusets tak och tågets tak.
const HOUSE_PAD = 1;
function buildingShapes() {
  const out = [];
  const gable = (o, top, rh, half, ridgeX) => (x, z) => {
    const r = rect(o.x, o.z, o.ry, o.w, o.d);
    if (!inRect(r, x, z)) return 0;
    const dx = x - o.x, dz = z - o.z, c = Math.cos(o.ry), s = Math.sin(o.ry);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    const across = ridgeX ? Math.abs(lz) : Math.abs(lx);
    return top + rh * Math.max(0, 1 - across / half);
  };
  for (const h of BUILDINGS) {
    const half = (h.ridgeX ?? true) ? h.d / 2 : h.w / 2;
    const roofH = gable(h, h.eave, h.ridge - h.eave, half, h.ridgeX ?? true), body = rect(h.x, h.z, h.ry, h.w, h.d);
    let height = roofH, perch = h.perch ? (x, z) => (inRect(body, x, z, -0.3) ? 1 : 0) : null;
    if (h.tower) {
      // 0.17.2 (H301): tornet: höjden är tornets i dess ruta, och bara tornet är en utsiktspunkt (perch 3 = torn)
      const t = h.tower, c = Math.cos(h.ry), sn = Math.sin(h.ry);
      const tr = rect(h.x + t.lx * c + t.lz * sn, h.z - t.lx * sn + t.lz * c, h.ry, t.size, t.size);
      height = (x, z) => (inRect(tr, x, z) ? t.h : roofH(x, z));
      perch = (x, z) => (inRect(tr, x, z, 0.8) ? 3 : 0);
      h.towerRect = tr;
    }
    out.push({ id: h.id, kind: h.kind, rects: [body], eave: h.eave, pad: h.kind === 'x60' ? 0.4 : HOUSE_PAD, height, perch });
  }
  {
    const F = FOLKETS, o = { x: F.x, z: F.z, ry: F.ry, w: F.len, d: F.wid };
    // 0.17.2 (H301): prickskytten på Folkets hus ligger vid nocken över gaveln mot grusplanen (frontespisen), inte
    // över hela taket: basens tak fick annars plats för alla Psg 90 och dagarna blev för lätta (balansen)
    const fr = rect(F.x, F.z, F.ry, F.len, F.wid);
    const [gx, gz] = F.at(F.face - 2.4, 0), front = rect(gx, gz, F.ry, 4.4, 4.4);
    out.push({ id: 'folkets', kind: 'folkets', rects: [fr], eave: F.wallH, pad: HOUSE_PAD, height: gable(o, F.wallH, 3.6, F.wid / 2, true), perch: (x, z) => (inRect(front, x, z) ? 1 : 0) });
  }
  {
    const o = X60;
    out.push({ id: 'x60', kind: 'x60', rects: [rect(o.x, o.z, o.ry, o.w, o.d)], eave: o.eave, pad: 0.3, height: (x, z) => (inRect(rect(o.x, o.z, o.ry, o.w, o.d), x, z) ? o.eave : 0),
      perch: (x, z) => (inRect(rect(o.x, o.z, o.ry, o.w, o.d), x, z, 0.4) ? 1 : 0) });
  }
  for (const t of TOWERS) {
    const [x, z] = R(...t.at), r0 = rect(x, z, RAIL_RY, t.size, t.size);
    out.push({ id: t.id, kind: 'tower', rects: [r0], eave: t.h, pad: 0.2, height: (px, pz) => (inRect(r0, px, pz) ? t.h : 0), perch: (px, pz) => (inRect(r0, px, pz, 0.6) ? 3 : 0) });
  }
  {
    const rs = ROCK.segs.map(([u0, u1]) => { const [x, z] = R((u0 + u1) / 2, ROCK.v); return rect(x, z, RAIL_RY, u1 - u0, ROCK.depth); });
    out.push({ id: 'rock', kind: 'rock', rects: rs, eave: ROCK.h, pad: 0, height: (px, pz) => (rs.some(r0 => inRect(r0, px, pz)) ? ROCK.h : 0), perch: null });
  }
  return out;
}
export const SHAPES = buildingShapes();

// ---------- trädgårdarna (0.17.2, H308, Olas "fylligare", refs satellit-vid-sodra.jpg) ----------
// Varje villa får en trädgård bakom huset: bod, trädgårdsmöbler eller studsmatta, fruktträd, och häck eller staket
// längs tomtgränserna. Mellan tomterna står lövträd i dungar (Mölnbo är lummigt). Allt är data, så att
// fotavtrycken provas (inget på en gata, tests/footprints.test.js) och placeringen vet var boden står.
// kind: shed | table | tramp | tree | hedge | fence. Häck och staket: a, b (ändpunkterna) och en tunn rektangel.
export const GARDEN = (() => {
  const rng = makeRng(20261102), r = () => rng();
  const out = [];
  const solid = SHAPES.flatMap(b => b.rects);
  const free = (x, z, ry, w, d, pad = 0.6) => {
    if (outside(x, z) > 18 || inRail(x, z) || Math.abs(toRail(x, z)[1] - 0) < 18) return false;
    if (!clearOfRoads(x, z, ry, w, d, pad)) return false;
    if (Object.values(AREAS).some(a => inPoly(x, z, a)) || inPoly(x, z, GROUND.lake)) return false;
    const q = rect(x, z, ry, w + 1, d + 1);
    if (solid.some(o => rectHit(o, q))) return false;
    if (out.some(o => o.kind !== 'tree' && rectHit(o.r, q))) return false;
    if (Math.hypot(x - FOLKETS.x, z - FOLKETS.z) < 15) return false;
    return true;
  };
  const push = (o) => { o.r = rect(o.x, o.z, o.ry, o.w, o.d); out.push(o); };
  const homes = BUILDINGS.filter(h => h.kind === 'villa' || h.kind === 'white' || h.kind === 'yellow');
  for (const h of homes) {
    const c = Math.cos(h.ry), sn = Math.sin(h.ry);
    const W = (lx, lz) => [h.x + lx * c + lz * sn, h.z - lx * sn + lz * c];
    const back = -h.d / 2;
    // boden i ett bakre hörn
    if (r() < 0.65) {
      const side = r() < 0.5 ? -1 : 1, w = 2.4 + r() * 1.2, d = 2 + r() * 0.6;
      const [x, z] = W(side * (h.w / 2 - w / 2 + 0.5), back - 3.2 - d / 2);
      if (free(x, z, h.ry, w, d)) push({ kind: 'shed', x, z, ry: h.ry, w, d, color: r() < 0.6 ? 'falu' : r() < 0.5 ? 'grey' : 'green' });
    }
    // möbler eller studsmatta på gräset bakom
    const k = r();
    if (k < 0.75) {
      const tramp = k < 0.2, s = tramp ? 3.6 : 2;
      const [x, z] = W((r() - 0.5) * h.w * 0.5, back - (tramp ? 3.4 : 2.2));
      if (free(x, z, h.ry, s, s, 0.4)) push({ kind: tramp ? 'tramp' : 'table', x, z, ry: h.ry + (r() - 0.5) * 0.4, w: s, d: s });
    }
    // fruktträd
    for (let i = 0, n = 1 + ((r() * 3) | 0); i < n; i++) {
      const [x, z] = W((r() - 0.5) * (h.w + 6), back - 4 - r() * 5);
      if (free(x, z, 0, 0.8, 0.8, 1.2)) push({ kind: 'tree', x, z, ry: r() * 6, w: 0.8, d: 0.8, h: 4 + r() * 3, shape: (r() * 3) | 0 });
    }
    // tomtgränserna: häck eller staket längs sidorna och baksidan
    const hw = h.w / 2 + 3.2, f = h.d / 2 + 2.5, bk = back - 8.5;
    const lines = [[[-hw, f], [-hw, bk]], [[hw, f], [hw, bk]], [[-hw, bk], [hw, bk]]];
    const kind = r() < 0.55 ? 'hedge' : 'fence', style = r() < 0.5 ? 'picket' : 'slat';
    for (const [[ax, az], [bx, bz]] of lines) {
      if (r() < 0.25) continue;
      const [x0, z0] = W(ax, az), [x1, z1] = W(bx, bz), L = Math.hypot(x1 - x0, z1 - z0);
      const ry = Math.atan2(-(z1 - z0), x1 - x0), x = (x0 + x1) / 2, z = (z0 + z1) / 2;
      if (!clearOfRoads(x, z, ry, L, 0.9, 0.4) || solid.some(o => rectHit(o, rect(x, z, ry, L, 0.9)))) continue;
      if (outside(x, z) > 18 || inRail(x, z)) continue;
      if (Object.values(AREAS).some(a => inPoly(x, z, a))) continue;
      push({ kind, style, x, z, ry, w: L, d: kind === 'hedge' ? 0.9 : 0.2, a: [x0, z0], b: [x1, z1] });
    }
  }
  // lövträdsdungar mellan tomterna: ett glest rutnät med brus, tätare i klungor
  const bump = (x, z) => Math.sin(x * 0.071) * Math.cos(z * 0.063) + Math.sin((x + z) * 0.041);
  for (let z = CRISP.z0 - 14; z < CRISP.z1 + 14; z += 6.5) for (let x = CRISP.x0 - 14; x < CRISP.x1 + 14; x += 6.5) {
    const px = x + (r() - 0.5) * 4, pz = z + (r() - 0.5) * 4;
    if (bump(px, pz) < 0.35 || r() < 0.35) continue;
    if (!free(px, pz, 0, 0.8, 0.8, 2.2)) continue;
    if (inPoly(px, pz, GROUND.field) || inPoly(px, pz, GROUND.field2) || GROUND.forest.some(p => inPoly(px, pz, p))) continue;
    if (solid.some(o => distRect(o, px, pz) < 3.5)) continue;
    push({ kind: 'tree', x: px, z: pz, ry: r() * 6, w: 0.8, d: 0.8, h: 6 + r() * 5, shape: (r() * 3) | 0, grove: true });
  }
  return out;
})();
const THING_PAD = 0.8;
function thingRects() {
  const out = CARS.map(c => rect(c.x, c.z, c.ry, 4.3, 1.82));
  for (const [x, z] of LIGHTS) out.push(rect(x, z, 0, 0.6, 0.6));
  for (const s of SHELTERS) out.push(rect(s.x, s.z, RAIL_RY, 4, 1.8));
  // 0.17.2 (H308): bodarna och studsmattorna i trädgårdarna (ingen pjäs i en bod)
  for (const g of GARDEN) if (g.kind === 'shed' || g.kind === 'tramp') out.push(g.r);
  return out;
}
// Skog där den är tät: inne i en skogspolygon och minst 7 m från gator och hus.
function denseForest(x, z) {
  if (!GROUND.forest.some(p => p.length && inPoly(x, z, p))) return false;
  if (ROADS.some(o => distPolyline(x, z, o.pts) < o.width / 2 + 7)) return false;
  return !SHAPES.some(b => b.rects.some(r => distRect(r, x, z) < 6));
}
const CELL_SAMPLES = [[0, 0], [-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9], [0, -0.9], [0, 0.9], [-0.9, 0], [0.9, 0]];
const ROOF_SAMPLES = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 0.8, Math.sin(i * Math.PI / 4) * 0.8])];
export function molnboPlacement(grid) {
  const things = thingRects();
  const inS = (x, z) => { const [u, v] = toRail(x, z); return inPlat(RAIL.platformS, u, v, -0.4); };
  const place = buildPlace({
    w: grid.w, h: grid.h, cellSize: grid.cellSize, origin: grid.origin,
    walk: (x, z, k) => grid.walk[k] === 1,
    classify(x, z) {
      const k = Math.floor((z - grid.origin[1]) / grid.cellSize) * grid.w + Math.floor((x - grid.origin[0]) / grid.cellSize);
      if (grid.walk[k]) return KIND.road;
      if (outside(x, z) > 0) return KIND.thing;
      // 0.20.0: trapptornen står intill trappan upp på vägbron; tornets rutor är tornet (prickskytten), inte under däcket
      if (TOWERS.some(t => { const [u, v] = toRail(x, z); return Math.abs(u - t.at[0]) <= t.size / 2 && Math.abs(v - t.at[1]) <= t.size / 2; })) return KIND.house;
      // 0.17.1: under bron (eller rampens kant) syns ingen enhet: 'Under the bridge'
      if (underDeck(x, z)) return KIND.bridge;
      if (inPoly(x, z, GROUND.lake)) return KIND.water;
      if (SHAPES.some(b => b.rects.some(r => inRect(r, x, z)))) return KIND.house;
      if (SHAPES.some(b => b.rects.some(r => inRect(r, x, z, b.pad)))) return KIND.house;
      if (inRail(x, z) && !inS(x, z)) return KIND.thing;
      if (things.some(r => inRect(r, x, z, THING_PAD))) return KIND.thing;
      if (denseForest(x, z)) return KIND.forest;
      return KIND.open;
    },
  });
  const n = grid.w * grid.h;
  const roof = new Float32Array(n), bldg = new Int32Array(n), height = new Float32Array(n), perch = new Uint8Array(n);
  const ctr = k => [grid.origin[0] + ((k % grid.w) + 0.5) * grid.cellSize, grid.origin[1] + (Math.floor(k / grid.w) + 0.5) * grid.cellSize];
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.house) continue;
    const [x, z] = ctr(k);
    let hMax = 0;
    for (let i = 0; i < SHAPES.length; i++) {
      const b = SHAPES[i];
      let hi = 0;
      for (const [dx, dz] of CELL_SAMPLES) hi = Math.max(hi, b.height(x + dx, z + dz));
      hMax = Math.max(hMax, hi);
      if (bldg[k] || !(b.height(x, z) > 0)) continue;
      bldg[k] = i + 1;
      const kp = b.perch ? b.perch(x, z) : 0;
      if (!kp) continue;
      let y = 0;
      for (const [dx, dz] of ROOF_SAMPLES) y = Math.max(y, b.height(x + dx, z + dz));
      roof[k] = Math.round(y * 100) / 100; perch[k] = kp;
    }
    if (!hMax) {
      let best = Infinity;
      for (const b of SHAPES) for (const r of b.rects) { const d = distRect(r, x, z); if (d < best && d < 1.6) { best = d; hMax = b.eave ?? 3; } }
      if (!hMax) hMax = 3;
    }
    height[k] = Math.round(hMax * 100) / 100;
  }
  // Skydd för grupperna: staketen längs järnvägen (häck) och tåget (mur).
  const hedge = new Uint8Array(n), brick = new Uint8Array(n), ditch = new Uint8Array(n);
  const fenceSegs = RAIL.fences.filter(v => v !== RAIL.fences[1]).map(v => RS([[-300, v], [300, v]]));
  const trainSide = RS([[X60.u0, X60.v + X60.d / 2], [X60.u1, X60.v + X60.d / 2]]);
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.open || place.walk[k]) continue;
    const [x, z] = ctr(k);
    if (distPolyline(x, z, trainSide) < 2.4) brick[k] = 1;
    else if (fenceSegs.some(s => distPolyline(x, z, s) < 1.3)) hedge[k] = 1;
  }
  return { ...place, roof, bldg, buildings: SHAPES.map(b => b.rects), hedge, ditch, brick, height, perch,
    perchAt: (x, z) => {
      for (const b of SHAPES) {
        const h = b.height(x, z);
        if (!(h > 0)) continue;
        return { y: h, kind: b.perch?.(x, z) ?? 0, chimney: null, roofKind: b.kind, height: b.height };
      }
      return null;
    } };
}

// ---------- dagarna ----------
// Kampanjbågen (Ola 2026-10-19, kampanjplanen avsnitt 10): Mölnbo är kampanjens dag 8 till 10. Försvaret av Gnesta höll,
// men en större hord från Södertälje har tagit Järna och Mölnbo står på tur. Tre dagar:
//  1 Hold the bridge     evakuera norra sidan: de civila går över bron i grupper under dagen (Hagstumosses
//                        evakuering: markerade hus, gula linjer). Vinst = dagens vågor hållna och minst need över.
//  2 The north side      ett större angrepp på båda sidor om spåret och en mindre grupp söderifrån; pendeltåget rullar
//                        in med sin överraskning. Efter dagen är norra sidan förlorad.
//  3 Pull out            norra sidan är förlorad (ingen placering där). Håll en viss tid (klockan), sedan uttåg mot
//                        Gnesta: menyerna försvinner, trupperna packar och springer sydväst ut ur kartan, en flodvåg
//                        väller in från norr genom gatorna och husen, och när de går ut på bron tonar bilden ut.
// Balansen: docs/balance-log.md, Mölnbo.
const g = (type, count, interval, delay, spawn, lead = 0) => ({ type, count, interval, delay, spawn, ...(lead ? { lead } : {}) });
const say = (toast, w) => ({ ...w, toast });
const tell = (toast, grp) => ({ ...grp, toast });
const ALL = ['block', 'wire', 'civ', 'hv', 'm249', 'ksp58', 'ak5', 'psg90', 'epa', 'm2', 'inf'];
// Över bron = i säkerhet: allt söder om rampens fot (dag 1:s civila).
const SOUTH_SIDE = RS([[-160, BRIDGE.ramp + 2], [200, BRIDGE.ramp + 2], [200, 240], [-160, 240]]);
// Norra sidan (dag 3): allt norr om spåret, också norra perrongen. Ingen placering där, och bilden färgas.
export const NORTH_SIDE = RS([[-260, RAIL.corridor[0] - 1], [260, RAIL.corridor[0] - 1], [260, -260], [-260, -260]]);
// Dag 1: husen som evakueras, i tur och ordning. Först de längst upp mot Järna (Norrängsvägen och väg 57), innan horden
// är där; sedan Backvägen, och sist Skogstorpsvägen i väster, vars väg möter horden först vid bron. Villorna väljs nära
// punkterna i järnvägens ram.
const EVAC_HOMES = (() => {
  const taken = new Set();
  return [[84, -50], [50, -75], [30, -77], [10, -78], [-3, -62], [-13, -43]].map(([u, v]) => homeNear(u, v, taken));
})();
// Dag 3: husen på norra sidan där flodvågen väller ut (de som inte evakuerades i tid).
const FLOOD_HOMES = (() => {
  const taken = new Set();
  return [[-20, -66], [30, -72], [70, -52], [8, -56]].map(([u, v]) => homeNear(u, v, taken));
})();
export const DAYS = [
  { n: 1, supplies: 600, arsenal: ALL, startCash: 2200, hp: 16,
    intro: { title: 'Day 1: Hold the bridge', text: 'From Järna down väg 57. Hold the bridge, get them across.' },
    objective: 'Get the north side over the bridge.',
    // all: dagen vinns först när vågorna är hållna OCH de civila är över (src/sim/sim.js checkEvac)
    evac: { need: 19, all: true, safeZone: SOUTH_SIDE,
      groups: [{ house: EVAC_HOMES[0], count: 4, at: 0, wave: 0 }, { house: EVAC_HOMES[1], count: 4, at: 6, wave: 0 },
        { house: EVAC_HOMES[2], count: 4, at: 6, wave: 1 }, { house: EVAC_HOMES[3], count: 4, at: 16, wave: 1 },
        { house: EVAC_HOMES[4], count: 4, at: 4, wave: 2 }, { house: EVAC_HOMES[5], count: 4, at: 14, wave: 2 }] },
    waves: [ say('Down väg 57, from Järna.', { groups: [g('walker', 10, 0.8, 2, 's1'), g('runner', 3, 1, 14, 's1')] }),
             say('North of the tracks, along Norrängsvägen!', { groups: [g('walker', 18, 0.55, 0, 's1'), g('walker', 12, 0.6, 6, 's3'), g('runner', 6, 0.6, 14, 's1')] }),
             { groups: [g('walker', 26, 0.45, 0, 's1'), g('walker', 16, 0.5, 4, 's3'), tell('Runners on väg 57!', g('runner', 10, 0.5, 16, 's1')), g('brute', 1, 4, 24, 's1')] } ] },
  // H451: en mindre grupp söderifrån. H452: pendeltåget rullar in i tredje vågen (förut dag 4).
  { n: 2, intel: 'unknown', supplies: 600, arsenal: ALL, startCash: 2200, hp: 13, overlap: 50, overlapMin: 0.4,
    intro: { title: 'Day 2: The north side', text: 'From Järna, both sides of the tracks. And the south.' },
    objective: 'Hold Folkets hus.',
    arrival: { wave: 2, at: 35, warn: 12, doors: INBOUND.doors,
      groups: [{ type: 'walker', count: 34, interval: 0.12 }, { type: 'runner', count: 10, interval: 0.3, delay: 1.5 }, { type: 'crawler', count: 6, interval: 0.5, delay: 3 }] },
    waves: [ say('Väg 57 again.', { groups: [g('walker', 12, 0.7, 0, 's1', 14), g('runner', 4, 0.9, 5, 's1')] }),
             say('From the east along the tracks, Fagernäsvägen!', { groups: [g('walker', 30, 0.45, 0, 's2'), g('walker', 24, 0.45, 4, 's1'), tell('Armoured ones on väg 57! Small arms barely bite.', g('armored', 3, 2.4, 10, 's1'))] }),
             say('A smaller group from the south, up Stenbyvägen!', { groups: [g('walker', 14, 0.6, 0, 's4'), g('walker', 30, 0.35, 4, 's3'), g('runner', 20, 0.35, 8, 's1'), g('crawler', 6, 1.2, 12, 's2')] }),
             { groups: [g('walker', 30, 0.34, 0, 's1'), g('walker', 22, 0.36, 6, 's2'), tell('Brutes at the bridge!', g('brute', 3, 3, 16, 's3')), g('armored', 3, 2, 10, 's1'), g('runner', 18, 0.35, 22, 's3')] } ] },
  { n: 3, supplies: 600, arsenal: ALL, startCash: 2200, hp: 10, overlap: 50, overlapMin: 0.4,
    intro: { title: 'Day 3: Pull out', text: 'From Järna, all of them. Hold, then we pull out.' },
    objective: 'Hold Mölnbo, then pull out to Gnesta.',
    // Norra sidan är förlorad: ingen placering där, och bilden färgar den (main.js lostSide)
    lost: { poly: NORTH_SIDE, name: 'The north side is lost' },
    // Klockan (src/sim/sim.js runTrain): håll i sex minuter från första vågen. Sedan uttåget (src/sim/sim.js runExodus).
    hold: { at: 360,
      exodus: {
        // trupperna springer sydväst längs Gnestavägen ut i diset mot Gnesta
        exit: R(-104, 33.5),
        // flodvågen från norr: ur dimman och ur husen på norra sidan, alla mot bron
        // (högst cirka 110: med det som är kvar av vågorna blir det inte mer än vyn orkar, ~250 levande)
        flood: [{ spawn: 's1', type: 'walker', count: 30, interval: 0.15, delay: 0 }, { spawn: 's3', type: 'walker', count: 18, interval: 0.2, delay: 0.5 },
          { spawn: 's5', type: 'walker', count: 16, interval: 0.2, delay: 1 }, { spawn: 's6', type: 'walker', count: 16, interval: 0.2, delay: 1.5 },
          { spawn: 's1', type: 'runner', count: 12, interval: 0.25, delay: 3 },
          ...FLOOD_HOMES.map((house, i) => ({ house, type: 'walker', count: 5, interval: 0.4, delay: 2 + i * 1.2 }))],
        // när den första går ut på bron (norra rampen) tonar bilden ut, och fade sekunder senare är dagen vunnen
        trigger: RS([[uOnBridge(-BRIDGE.ramp) - 8, -BRIDGE.ramp], [uOnBridge(-BRIDGE.ramp) + 8, -BRIDGE.ramp], [uOnBridge(-BRIDGE.deck) + 8, -BRIDGE.deck], [uOnBridge(-BRIDGE.deck) - 8, -BRIDGE.deck]]),
        fade: 3, max: 70,
      } },
    waves: [ say('From today the next wave will not wait for this one.', { groups: [g('walker', 14, 0.6, 0, 's1', 14), g('runner', 6, 0.8, 6, 's1')] }),
             say('From the east, along Fagernäsvägen!', { groups: [g('walker', 24, 0.45, 0, 's2'), g('walker', 18, 0.5, 6, 's1')] }),
             { groups: [g('runner', 18, 0.35, 0, 's3'), g('walker', 22, 0.4, 0, 's2'), g('crawler', 6, 1.0, 8, 's2'), g('brute', 2, 3, 16, 's1')] },
             { groups: [g('walker', 30, 0.34, 0, 's1'), g('walker', 22, 0.36, 4, 's2'), tell('Runners along Fagernäsvägen!', g('runner', 16, 0.32, 20, 's2')), g('brute', 3, 3, 24, 's3')] },
             { groups: [g('walker', 56, 0.25, 0, 's3'), g('runner', 40, 0.25, 6, 's1'), g('armored', 5, 2, 14, 's1'), g('brute', 4, 2.5, 10, 's2')] },
             { groups: [g('walker', 60, 0.25, 0, 's1'), g('walker', 40, 0.3, 4, 's2'), g('runner', 30, 0.3, 10, 's3'), g('brute', 5, 2.5, 14, 's1')] } ] },
];

// 0.17.1 (speltestet av 0.17.0, dag 4: "bara våg 1 visar en rutt, Krokvägen-vågen visar ingen rutt före start"): varje
// ingång dagen använder syns från början med sin väg och etiketten "From wave N" (main.js foretold).
for (const d of DAYS) {
  const first = new Set(d.waves[0].groups.map(q => q.spawn));
  d.foretell = [...new Set(d.waves.flatMap(w => w.groups.map(q => q.spawn)))].filter(id => !first.has(id));
}

export const MOLNBO_SURROUNDINGS = {
  crisp: CRISP, fade: 38,
  haze: { start: 18, end: 140, max: 0.9 },
  extent: { x0: -300, x1: 320, z0: -260, z1: 300 },
};

export const molnbo = {
  id: 'molnbo', name: 'Mölnbo · Stationen', version: MOLNBO_VERSION, world: 'molnbo',
  // 0.20.0: Mölnbo släpps (kampanjbågen dag 10); truppen drar sig tillbaka till Gnesta
  outro: { text: 'Mölnbo is lost, but the north side got across. Fall back to Gnesta.' },
  // dag 1:s civila är i säkerhet när de är över bron (resultatet och raderna i main.js)
  evacPlace: 'got over the bridge',
  camera: { target: R(-2, 30), view: 56, zoom: [24, 84], pan: { x0: CRISP.x0 + 6, x1: CRISP.x1 - 6, z0: CRISP.z0 + 6, z1: CRISP.z1 - 6 }, intro: 4 },
  shadowBounds: { x0: CRISP.x0 - 6, x1: CRISP.x1 + 6, z0: CRISP.z0 - 6, z1: CRISP.z1 + 6 },
  roads: ROADS, ground: GROUND, rail: RAIL, inbound: INBOUND, trainMark: TRAIN_MARK, bridge: BRIDGE, link: LINK, towers: TOWERS, x60: X60, folkets: FOLKETS,
  buildings: BUILDINGS, lots: LOTS, cars: CARS, lights: LIGHTS, shelters: SHELTERS, sign: DEPARTURE_SIGN, rock: ROCK, far: FAR, areas: AREAS, platforms: PLATFORMS,
  spawns: SPAWNS, base: BASE, surroundings: MOLNBO_SURROUNDINGS,
  // 0.17.2 (H307): järnvägens ram för fotavtrycken (src/data/footprints.js), gärdsgården och trädgårdarna
  railFrame: { R, RAIL_RY }, fences: FENCES, garden: GARDEN,
  // Basen: Folkets hus igenspikade dörrar (render/models.js rinkEntranceModel), samma som ishallens entré.
  iceRink: FOLKETS, baseModel: 'rink',
  grid: molnboGrid(),
  // Bilden lyfter zombierna på bron och perrongen (render/view.js). Simuleringen är platt.
  groundY,
  guns: 5, frontage: 10, baseHp: 20, days: DAYS,
  door: { gap: 3.2 },
  pace: 1.15,
  unlocks: ['block', 'm2', 'epa', 'inf', 'ksp58', 'ak5', 'psg90'],
  // Öppnar när Hagstumosse · Vikingavägen dag 5 är vunnen.
  unlock: { map: 'gnesta-norr', day: 5 },
};
molnbo.place = molnboPlacement(molnbo.grid);
