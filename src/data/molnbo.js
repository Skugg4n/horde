// Sektor Mölnbo (0.17.0-molnbo): stationen, bron och Folkets hus. Kartan som data, utan three.js (testbar i node).
// Design: docs/superpowers/specs/2026-10-17-molnbo-design.md. Byggnoteringar och antagna svar på Olas öppna
// frågor: docs/superpowers/specs/2026-10-18-molnbo-build-notes.md.
//
// Ritad ur referenserna i ~/Projects/horde-refs/molnbo (kulturmiljökartan, satellitbilden, Street View och
// Commons-fotona; inget av det ligger i repot). Avstånden är ungefär halv verklig skala som Gnesta, men
// järnvägens tvärsnitt (spår, perronger, tåget) och husen är nära verklig storlek så att de läses bredvid
// zombierna. Kartan är ritad i järnvägens ram: u längs spåret (österut, mot Järna) och v tvärs över det
// (söderut), med origo där väg 57 går över spåret. Spåret ligger 21 grader mot öster-nordost i världen.
// x = öster, z = söder som på de andra banorna.
//
// Antaganden (Olas frågor är obesvarade, se byggnoteringarna):
//   - gångbron är en egen bro väster om vägbron, med ett trapptorn vid varje perrong
//   - ingen annan passage över eller under spåret; ån har ingen gångbar väg under banan
//   - Trollvägen når Fagernäsvägen, och vägen förbi hyreshusen vid Kvarnen går igenom till Gnestavägen
//   - basen är Folkets hus (Olas beslut), målet "håll tills sista tåget gått" (dag 3 till 5)
//   - 0.19.0 (H450): horden kommer från Järna och Södertälje i nordost och drar mot Gnesta i sydväst
//   - Mölnbo är inte kampanjens final
import { makeRng } from '../sim/rng.js';
import { buildPlace, rect, inRect, distRect, KIND } from '../sim/placement.js';
import { smooth, distPolyline, inPoly } from './gnesta.js';

export const MOLNBO_VERSION = '0.1.1';

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
export const CRISP = { x0: -100, x1: 108, z0: -66, z1: 126 };
const outside = (x, z, c = CRISP) => Math.max(c.x0 - x, x - c.x1, c.z0 - z, z - c.z1);

// ---------- järnvägen ----------
// Tre spår, två perronger, staket. Stängd mark för horden, utom norra perrongen och banvallen väster om den
// (dag 5:s överraskning, S5) som bara når gångbron via norra trapptornet. Södra perrongen går att stå på
// (bakom tåget) men inte att gå på.
export const RAIL = {
  corridor: [-15, 12],                 // v-intervallet som är järnväg
  tracks: [-5.5, -1, 3.8],             // spårens mitt (v)
  gauge: 1.435,
  platformN: { u0: -84, u1: -12, v0: -13, v1: -8, h: 0.9 },
  platformS: { u0: -84, u1: -14, v0: 6, v1: 10.5, h: 0.9 },
  fences: [-14.6, 1.4, 11.6],          // staket mot tomterna i norr, mellan spår 2 och 3, mot slänten i söder
  bank: { v: -10.5, u1: -84, h: 0.5 }, // banvallen (S5) längs norra perrongens förlängning västerut
  masts: { step: 24, v: [-14, 1.4, 11.2] },
};
export const inRail = (x, z) => { const [, v] = toRail(x, z); return v >= RAIL.corridor[0] && v <= RAIL.corridor[1]; };
const inPlat = (P, u, v, pad = 0) => u >= P.u0 - pad && u <= P.u1 + pad && v >= P.v0 - pad && v <= P.v1 + pad;

// ---------- broarna ----------
// Vägbron (väg 57): korsningen vid caféet (J) i söder, norra brofästet (N) i norr. Däcket ligger DECK_H
// meter över spåren, ramperna går ner till marken mellan |v| = 15 och 30. Gångbron väster om den: landar på
// Gnestavägens trottoar i söder och på stationsparkeringen i norr; trapptornen står vid perrongerna.
export const DECK_H = 4.4;
export const BRIDGE = { a: [-6, 34], b: [16, -34], width: 9, deck: 15, ramp: 30 };
export const FOOT = { a: [-20, 30], b: [2, -30], width: 3.2, deck: 13, ramp: 28 };
const uOn = (br, v) => br.a[0] + (br.a[1] - v) * (br.b[0] - br.a[0]) / (br.a[1] - br.b[1]);
// Trapptornen: ett högt betongschakt vid gångbron med trappan utanpå, platt tak (prickskytt). LINK: trappan ner till
// norra perrongen. 0.17.1 (speltestet: "små grå lådor"): 7,2 m höga, taket en våning över gångbron.
export const TOWERS = [
  { id: 'towerN', at: [-9.5, -12.4], size: 3.6, h: 7.2 },
  { id: 'towerS', at: [-16.4, 8.4], size: 3.6, h: 7.2 },
];
const LINK = { v: -9.4, u0: -13, w: 2.4 };
// Däckets höjd i en punkt: vägbron, gångbron med ramperna och trappan ner till norra perrongen (0 = inget däck).
// Ren funktion av läget.
export function deckY(x, z) {
  const [u, v] = toRail(x, z), av = Math.abs(v);
  if (av <= FOOT.ramp + 2 && Math.abs(u - uOn(FOOT, v)) <= FOOT.width / 2 + 0.9) return DECK_H * (1 - smoothstep(FOOT.deck, FOOT.ramp, av));
  const fu = uOn(FOOT, LINK.v);
  if (Math.abs(v - LINK.v) <= LINK.w / 2 + 0.6 && u >= LINK.u0 && u <= fu) return RAIL.platformN.h + (DECK_H - RAIL.platformN.h) * smoothstep(LINK.u0 + 1, fu - 1.5, u);
  if (av <= BRIDGE.ramp + 2 && Math.abs(u - uOn(BRIDGE, v)) <= BRIDGE.width / 2 + 0.9) return DECK_H * (1 - smoothstep(BRIDGE.deck, BRIDGE.ramp, av));
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
  if (u < RAIL.platformN.u0 && Math.abs(v - RAIL.bank.v) < 2.5) return RAIL.bank.h;
  return 0;
}

// ---------- vägar ----------
// I järnvägens ram. surface: asphalt | gravel | dirt. walk: false = ritas men ingår inte i rutnätet.
// fog: vägen ut i dimkanten till en ingång. bridge: ritas av byggsatsen (bron och ramperna), inte på marken.
const ROADS_RAIL = [
  { id: 'gnestavagen', name: 'Gnestavägen', surface: 'asphalt', width: 7, curbs: true, center: true, lamps: { side: 1, step: 22 },
    pts: [[-6, 34], [-28, 30], [-60, 27.5], [-100, 26.5], [-140, 26.5], [-200, 27], [-260, 28]] },
  { id: 'v57', name: 'Väg 57', surface: 'asphalt', width: 7, center: true, bridge: true,
    pts: [BRIDGE.a, BRIDGE.b] },
  { id: 'v57n', name: 'Väg 57', surface: 'asphalt', width: 7, curbs: true, center: true, lamps: { side: -1, step: 22 },
    pts: [BRIDGE.b, [19, -46], [24, -66], [30, -96], [36, -130], [42, -170], [48, -210]] },
  { id: 'foot', name: 'Gångbron', surface: 'asphalt', width: FOOT.width, bridge: true, pts: [FOOT.a, FOOT.b] },
  { id: 'stenby', name: 'Stenbyvägen', surface: 'asphalt', width: 6, curbs: true, center: true, lamps: { side: 1, step: 22 },
    pts: [[-6, 34], [-3, 48], [0, 64], [2, 82], [3, 100], [4, 118], [0, 134], [-8, 150], [-14, 168], [-18, 190], [-20, 230]] },
  { id: 'fagernas', name: 'Fagernäsvägen', surface: 'asphalt', width: 5, curbs: false,
    pts: [[-6, 34], [8, 32], [30, 29], [60, 27.5], [90, 28], [112, 29], [124, 34], [132, 48], [138, 70], [148, 100], [162, 135], [176, 170]] },
  { id: 'troll', name: 'Trollvägen', surface: 'asphalt', width: 5, curbs: true,
    pts: [[0, 64], [25, 62], [50, 58.5], [75, 53], [96, 44], [106, 34], [110, 29]] },
  { id: 'genvagen', name: 'Genvägen', surface: 'asphalt', width: 4.5, curbs: true,
    pts: [[46, 28], [47, 45], [48, 58.5], [49, 80], [50, 100], [50, 113]] },
  { id: 'inner', name: 'Skolvägen', surface: 'asphalt', width: 4.5, curbs: true,
    pts: [[2, 82], [25, 81], [49, 80], [72, 76], [94, 70]] },
  { id: 'folkets', name: 'Folkets hus', surface: 'gravel', width: 6, paint: false,
    pts: [[3.8, 116], [16, 116], [30, 116], [30, 111]] },
  { id: 'folkbak', surface: 'gravel', width: 3.4, pts: [[50, 113], [44, 116], [38, 116]] },
  { id: 'fagpath', name: 'Fagernäs', surface: 'gravel', width: 3.4, pts: [[50, 100], [75, 97], [104, 90], [128, 78], [138, 70]] },
  { id: 'kvarn', name: 'Kvarnvägen', surface: 'asphalt', width: 4.5, curbs: false,
    pts: [[-8, 150], [-30, 146], [-58, 128], [-82, 90], [-98, 52], [-104, 27]] },
  { id: 'parkin', name: 'Mölnbo station', surface: 'asphalt', width: 5, curbs: true, pts: [[2, -30], [8, -42], [19, -46]] },
  // körgatan genom stationsparkeringen (parkeringen själv går att bygga på: vapenplats E)
  { id: 'parklane', name: 'Mölnbo station', surface: 'asphalt', width: 4.5, curbs: false, pts: [[-42, -30], [-20, -30.5], [2, -30]] },
  { id: 'krok', name: 'Krokvägen', surface: 'asphalt', width: 4.5, curbs: false,
    pts: [[-42, -30], [-70, -28], [-96, -32], [-126, -40], [-160, -46], [-200, -50], [-240, -54]] },
  { id: 'petter', name: 'Petterslundsvägen', surface: 'asphalt', width: 4.5, curbs: false,
    pts: [[-26, -30.5], [-30, -45], [-34, -62], [-42, -90], [-70, -96], [-96, -86], [-110, -60], [-114, -43]] },
  { id: 'bank', surface: 'gravel', width: 2.6, paint: false, pts: [[RAIL.platformN.u0 + 1, RAIL.bank.v], [-120, RAIL.bank.v], [-180, RAIL.bank.v], [-240, RAIL.bank.v]] },
  // gångväg upp till gula huset på norra sidan (ritas, ingår inte i rutnätet)
  { id: 'yellowIn', surface: 'gravel', width: 2.4, walk: false, pts: [[24, -58], [30, -56]] },
  { id: 'norrback', name: 'Norrbacken', surface: 'asphalt', width: 4.5, curbs: false, pts: [[21, -54], [48, -44], [80, -34], [112, -30], [140, -32]] },
];
export const ROADS = ROADS_RAIL.map(r => {
  const raw = RS(r.pts);
  return { ...r, walk: r.walk !== false, rail: r.pts, ptsRaw: raw, pts: r.bridge || r.pts.length < 3 ? raw : smooth(raw) };
});
export const road = id => ROADS.find(r => r.id === id);

// Ytor (polygoner i järnvägens ram): målas som asfalt eller grus men är inte gångbara. Där står vapenplatserna i
// designen: A caféets parkering, B Folkets hus grusplan, D stationshusets grusplan, E stationsparkeringen.
const AREAS_RAIL = {
  parking: [[-46, -18], [4, -18], [4, -40], [-46, -40]],
  plaza: [[21, 110], [39, 110], [39, 121], [21, 121]],    // Folkets hus grusplan
  cafePark: [[-3, 36], [6, 36], [6, 46], [-3, 46]],       // caféets parkering mot korsningen
  stationYard: [[80, 21], [104, 21], [104, 25], [80, 25]], // grusplanen framför stationshuset
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
  // Folkets hus: stort rött trähus, gaveln med skylten och dörrarna mot grusplanen i söder (mot kameran).
  const [u, v] = [30, 99], len = 20, wid = 13;
  const [x, z] = R(u, v);
  const ry = ryAlong(0, 1);            // lokal +x mot grusplanen (horden kommer dit)
  const at = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const face = len / 2;
  return { id: 'folkets', x, z, ry, len, wid, wallH: 6.2, face, main: 0, doors: [-3.6, -0.8, 0.8, 3.6], at, entrance: at(face + 1.4, 0), u, v };
})();
const STATION = B0('station', 'station', [92, 16.5], 15, 8, [0, 1], { eave: 3.6, ridge: 6.4, perch: true });
export const X60 = (() => {
  // Det övergivna X60 vid södra perrongen (dag 3 till 5 väntar det på att gå). Fyra vagnar.
  const u0 = -80, u1 = -22, v = RAIL.tracks[2];
  const [x, z] = R((u0 + u1) / 2, v);
  return { id: 'x60', kind: 'x60', x, z, ry: RAIL_RY, w: u1 - u0, d: 3.3, eave: 4.1, ridge: 4.1, perch: true, u0, u1, v, cars: 4 };
})();
const HOUSES = [
  STATION,
  B0('cafe', 'cafe', [12, 41], 14, 9, [-1, 0], { eave: 5.4, ridge: 7.9 }),
  // 0.17.2 (H301): missionskyrkans klocktorn (takryttaren, lokalt (lx, lz)) är en prickskyttepost, 10,6 m upp
  B0('mission', 'mission', [16, 72], 13, 9, [-1, 0], { eave: 4.2, ridge: 8.2, ridgeX: false, tower: { lx: 0, lz: 1.8, size: 2.6, h: 10.6 } }),
  B0('white', 'white', [-42, 41], 11, 9, [0, -1], { eave: 5.6, ridge: 8.4 }),
  B0('yellow', 'yellow', [36, -57.5], 11, 9, [-1, 0], { eave: 4.9, ridge: 7.6 }),
  // 0.17.2 (H307): Hembygdsgården och gärdsgården öster om Kvarnvägen (vägen gick förut rakt genom huset)
  B0('hembygd', 'hembygd', [-84, 40], 12, 7, [0, -1], { eave: 3.0, ridge: 5.6 }),
  B0('kvarn', 'kvarn', [-22, 134], 12, 10, [0, 1], { eave: 6.0, ridge: 9.2 }),
  B0('chain1', 'chain', [66, 67], 30, 8, [0, -1], { eave: 2.9, ridge: 5.0, units: 4 }),
  B0('chain2', 'chain', [72, 89], 26, 8, [0, -1], { eave: 2.9, ridge: 5.0, units: 3 }),
  // 0.17.2 (H301): hyreshusen, Folkets hus och stationshuset är höga nog för prickskytten
  B0('apt1', 'apartment', [-38, 108], 26, 11, [0, 1], { eave: 6.2, ridge: 8.8, perch: true }),
  B0('apt2', 'apartment', [-64, 96], 24, 11, [1, 0], { eave: 6.2, ridge: 8.8, perch: true }),
];
// Villorna: generiska hus längs gatorna (fritt utplacerade med marginal, deterministiskt).
const FACADES = ['white', 'white', 'yellow', 'red', 'red', 'grey', 'beige', 'brown', 'blueGrey'];
const ROOFS = ['black', 'charcoal', 'tile', 'tile', 'slate'];
const VILLA_ROADS = ['norrback', 'gnestavagen', 'stenby', 'troll', 'genvagen', 'inner', 'krok', 'petter', 'v57n', 'kvarn', 'fagpath'];
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
          // inte i järnvägen, inte på en annan väg, inom räckhåll för kameran
          if (cv > RAIL.corridor[0] - 6 && cv < RAIL.corridor[1] + 5 && cu < 150) continue;
          // inte i bergskärningen längs Fagernäsvägen (ROCK nedan)
          if (cu > 12 && cu < 106 && cv > 30 && cv < 42) continue;
          if (outside(x, z) > 40) continue;
          const ry = ryAlong(-nv, nu);   // framsidan (lokal +z) mot vägen (-nu, -nv)
          const q = rect(x, z, ry, w + 3, d + 3);
          if (walkRoads.some(o => o !== rd && distPolyline(x, z, o.pts) < o.width / 2 + Math.max(w, d) / 2 + 3)) continue;
          if (distPolyline(x, z, rd.pts) < rd.width / 2 + d / 2 + 2) continue;
          if (Object.values(AREAS).some(a => inPoly(x, z, a)) || inRect(rect(X60.x, X60.z, X60.ry, X60.w + 20, 40), x, z)) continue;
          if (!free(q)) continue;
          const storeys = r() < 0.4 ? 1.5 : 1;
          out.push({ r: q, h: { id: `V-${out.length + 1}`, kind: 'villa', x, z, ry, w, d, storeys, roof: r() < 0.25 ? 'hip' : 'gable',
            facade: FACADES[(r() * FACADES.length) | 0], roofColor: ROOFS[(r() * ROOFS.length) | 0], chimney: r() < 0.6, veranda: r() < 0.3,
            solar: r() < 0.1, seed: (r() * 1e9) | 0, garage: 0, road: id } });
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

// ---------- bergskärningen, staket, saker ----------
// Bergskärningen i granit längs Fagernäsvägens södra sida (Street View 6).
export const ROCK = { u0: 18, u1: 100, v: 33.8, depth: 2.6, h: 3.2 };
// 0.17.2 (H307, "en stenmur korsar vägen"): skärningen bryts där en gata går igenom (Genvägen), i bitar [u0, u1]
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
// Gärdsgården runt Hembygdsgården (rendern ritar den, placeringen räknar den som häck): bitarna som rektanglar.
const HB = HOUSES.find(h => h.id === 'hembygd');
export const LOG_FENCE = [[-11, -8], [11, -8], [11, 8], [-11, 8], [-11, -2]];
export const FENCES = LOG_FENCE.slice(1).map(([bx, bz], i) => {
  const [ax, az] = LOG_FENCE[i], c = Math.cos(HB.ry), sn = Math.sin(HB.ry);
  const W = (lx, lz) => [HB.x + lx * c + lz * sn, HB.z - lx * sn + lz * c];
  const [x0, z0] = W(ax, az), [x1, z1] = W(bx, bz);
  return { kind: 'fence', x: (x0 + x1) / 2, z: (z0 + z1) / 2, ry: Math.atan2(-(z1 - z0), x1 - x0), w: Math.hypot(x1 - x0, z1 - z0), d: 0.5 };
});
// Trafikljusen vid caféets korsning (J).
export const LIGHTS = [[-0.5, 29], [-11.5, 31], [4, 39.5], [-10, 39]].map(([u, v]) => R(u, v));
// Parkerade bilar: stationsparkeringen och caféet.
export const CARS = (() => {
  const r = makeRng(5711), out = [];
  for (let u = -40; u <= -6; u += 2.8) for (const v of [-21.5, -36.5]) if (r() < 0.45) { const [x, z] = R(u + (r() - 0.5) * 0.3, v); out.push({ x, z, ry: ryAlong(0, 1) + (r() < 0.5 ? 0 : Math.PI), color: (r() * 8) | 0 }); }
  for (const [u, v] of [[0, 38.5], [0, 43.5]]) { const [x, z] = R(u, v); out.push({ x, z, ry: ryAlong(1, 0), color: (r() * 8) | 0 }); }
  // 0.17.2 (H307): ingen bil på en gata
  return out.filter(c => clearOfRoads(c.x, c.z, c.ry, 4.3, 1.82));
})();
// Väntkurer i glas på perrongerna, avgångsskylten (blå LED) och kontaktledningsstolparna.
export const SHELTERS = [[-60, -11.6], [-36, -11.6], [-56, 9.6], [-30, 9.6]].map(([u, v]) => ({ x: R(u, v)[0], z: R(u, v)[1], u, v }));
export const DEPARTURE_SIGN = { at: R(-20, -10.4), u: -20, v: -10.4 };
// Skog, åkrar och sjön (polygoner i världen). Skogen och sjön ligger mest i dimkanten.
export const GROUND = {
  bounds: { x0: CRISP.x0 - 24, x1: CRISP.x1 + 24, z0: CRISP.z0 - 24, z1: CRISP.z1 + 24 },
  ppm: 10,
  forest: [
    RS([[-150, -60], [-60, -110], [-30, -160], [-140, -170], [-230, -100]]),
    RS([[40, -80], [110, -60], [170, -20], [180, -120], [60, -150]]),
    RS([[104, 38], [124, 40], [128, 62], [112, 64], [100, 52]]),
    RS([[140, 20], [220, 0], [240, 90], [160, 80]]),
  ],
  field: RS([[-260, 40], [-120, 40], [-110, 70], [-150, 110], [-260, 120]]),
  field2: RS([[30, 150], [120, 130], [130, 200], [20, 220]]),
  lake: RS([[150, 150], [190, 120], [230, 140], [240, 200], [190, 230], [150, 210]]),
};
// Bara bild utanför kartan (den som läser dimkanten ser byn fortsätta): villor norr om spåret, gårdar
// vid åkrarna, Fagernäs vid sjön och hyreshusen. [u, v, bredd, djup, grader, höjd, tak]
const FAR_RAIL = [
  [-60, -130, 11, 9, 5, 4.6], [-30, -140, 10, 8, -10, 4.6], [-90, -120, 12, 9, 0, 4.6], [-120, -110, 11, 9, 20, 4.6],
  [0, -110, 10, 9, 0, 4.6], [10, -150, 12, 10, 10, 5], [60, -110, 10, 9, -15, 4.6], [70, -140, 26, 12, 0, 7, 'flat'], [100, -100, 11, 9, 0, 4.6],
  [-150, -70, 11, 9, 0, 4.6], [-170, -40, 12, 9, 10, 4.6], [-150, 50, 14, 8, 0, 5.4], [-160, 70, 20, 10, 90, 6.5],
  [-200, 10, 12, 8, 0, 4.6], [150, 95, 30, 16, 10, 7.5], [162, 112, 12, 8, 0, 4.6], [120, 140, 11, 9, 0, 4.6], [60, 150, 11, 9, 10, 4.6],
  [20, 160, 12, 8, 0, 4.6], [-60, 140, 26, 11, 5, 8, 'flat'], [-90, 130, 11, 9, 0, 4.6], [140, -30, 11, 9, 10, 4.6], [160, 40, 11, 9, 0, 4.6],
];
export const FAR = FAR_RAIL.map(([u, v, w, d, deg = 0, h = 4.6, roof = 'gable']) => {
  const [x, z] = R(u, v);
  return { x, z, w, d, ry: RAIL_RY - deg * Math.PI / 180, h, roof };
}).filter(f => clearOfRoads(f.x, f.z, f.ry, f.w, f.d, 1));    // 0.17.2 (H307): inget hus i diset på en väg

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
// 0.19.0 (H450, Olas rättelse): horden kommer från Järna och Södertälje i nordost (väg 57 och banan) och drar mot Gnesta i
// sydväst, inte tvärtom. S1 väg 57 norrifrån över bron, S3 Fagernäsvägen österifrån längs spåret, S4 Norrbacken i
// nordost (norr om spåret). S2 Stenbyvägen söderifrån är en mindre flankgrupp (H451, dag 2 och 5), S5 banvallen
// västerifrån är dag 5:s överraskning (de som gått runt). Gnestavägen, Kvarnvägen och Krokvägen har ingen ingång.
export const SPAWNS = [
  { id: 's1', name: 'Väg 57 north', day: 1, at: fogPoint('v57n') },
  { id: 's2', name: 'Stenbyvägen south', day: 2, at: fogPoint('stenby') },
  { id: 's3', name: 'Fagernäsvägen east', day: 3, at: fogPoint('fagernas') },
  { id: 's4', name: 'Norrbacken', day: 4, at: fogPoint('norrback', 12) },
  { id: 's5', name: 'The tracks', day: 5, at: fogPoint('bank') },
];
export const BASE = { at: FOLKETS.entrance };
// 0.19.0 (H452): pendeltåget som rullar in dag 4 stannar på spår 1 vid norra perrongen, lika långt som X60 vid södra.
// Dörrarna (två per vagn och sida) slås upp mot perrongen; de som kliver ut står på perrongen vid dörren och tar trappan
// upp till gångbron. INBOUND: tåget i järnvägens ram (render/molnbo-world.js ritar det), DOORS i världen.
export const INBOUND = (() => {
  const u0 = X60.u0, u1 = X60.u1, v = RAIL.tracks[0], n = X60.cars, Lc = (u1 - u0) / n, cl = Lc - 0.5;
  const doorsU = [];
  for (let i = 0; i < n; i++) { const cx = u0 + (i + 0.5) * Lc; doorsU.push(cx - 0.28 * cl, cx + 0.28 * cl); }
  return { u0, u1, v, uStop: (u0 + u1) / 2, from: 260, doorsU, doors: doorsU.map(u => R(u, RAIL.platformN.v0 + 1.6)) };
})();

// 0.19.2 (speltestet av 0.19.1, fynd 1: "jag såg inte var perrongen är eller vart folket från tåget går"): det som lyser
// när pendeltåget signalerar. Norra perrongen och de två trapptornens tak (konturerna, med sina höjder), etiketten mitt
// på perrongen där tåget stannar, och målet för pilarna från de närmaste enheterna: foten av norra trapptornet, där de
// som kliver ur tar trappan upp till gångbron.
export const TRAIN_MARK = (() => {
  const P = RAIL.platformN, sq = t => RS([[t.at[0] - t.size / 2, t.at[1] - t.size / 2], [t.at[0] + t.size / 2, t.at[1] - t.size / 2], [t.at[0] + t.size / 2, t.at[1] + t.size / 2], [t.at[0] - t.size / 2, t.at[1] + t.size / 2]]);
  return {
    polys: [PLAT_N, ...TOWERS.map(sq)],
    ys: [P.h + 0.06, ...TOWERS.map(t => t.h + 0.06)],
    label: R(INBOUND.uStop, (P.v0 + P.v1) / 2), labelY: P.h + 1.2,
    target: R(TOWERS[0].at[0], TOWERS[0].at[1]),
    pts: [...PLAT_N, ...TOWERS.map(t => R(t.at[0], t.at[1]))],
  };
})();

// ---------- rutnätet ----------
// 2 m-rutor, samma regler som Gnesta (src/data/gnesta.js townGrid): gångbart där en gångbar väg eller yta
// ligger, en sammanhängande kedja längs varje väglinje. Järnvägen är stängd; broarna och gångbron är vanliga
// rutor (horden ser inte höjden, bara bilden lyfter dem). Norra perrongen och banvallen är gångbara men når
// resten bara genom trappan till gångbron.
export const GRID_BOUNDS = { x0: -130, z0: -94, x1: 136, z1: 156 };
export function molnboGrid(cellSize = 2) {
  const { x0, z0, x1, z1 } = GRID_BOUNDS;
  const gw = Math.round((x1 - x0) / cellSize), gh = Math.round((z1 - z0) / cellSize);
  const walk = new Uint8Array(gw * gh), terrain = new Uint8Array(gw * gh);
  const walkRoads = ROADS.filter(r => r.walk);
  const cx = i => x0 + (i + 0.5) * cellSize, cz = j => z0 + (j + 0.5) * cellSize;
  const linkPoly = RS([[LINK.u0, LINK.v - LINK.w / 2], [uOn(FOOT, LINK.v), LINK.v - LINK.w / 2], [uOn(FOOT, LINK.v), LINK.v + LINK.w / 2], [LINK.u0, LINK.v + LINK.w / 2]]);
  // Rutor som aldrig är gångbara: tornen och tåget (även om en väglinje passerar nära).
  const solid = (x, z) => TOWERS.some(t => { const [u, v] = toRail(x, z); return Math.abs(u - t.at[0]) <= t.size / 2 && Math.abs(v - t.at[1]) <= t.size / 2; });
  const open = (x, z) => walkRoads.some(r => distPolyline(x, z, r.pts) <= r.width / 2 + 0.25) || inPoly(x, z, PLAT_N) || inPoly(x, z, linkPoly);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = cx(i), z = cz(j);
    if (!open(x, z) || solid(x, z)) continue;
    // i järnvägen: bara broarna, perrongen, trappan och banvallen
    if (inRail(x, z)) {
      const [u, v] = toRail(x, z);
      const onBridge = [BRIDGE, FOOT].some(br => Math.abs(u - uOn(br, v)) <= br.width / 2 + 0.25);
      if (!onBridge && !inPoly(x, z, PLAT_N) && !inPoly(x, z, linkPoly) && !(u < RAIL.platformN.u0 + 2 && Math.abs(v - RAIL.bank.v) <= 1.6)) continue;
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
// Gator, broar och perrongen är gata. Husen (med en meters marginal), tornen, tåget och bergskärningen är hus
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
    // över hela taket: basens tak fick annars plats för alla Psg 90 och dag 3 till 5 blev för lätta (balansen)
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
  // Skydd för grupperna: staketen längs järnvägen och gärdsgården vid Hembygdsgården (häck), tåget (mur).
  const hedge = new Uint8Array(n), brick = new Uint8Array(n), ditch = new Uint8Array(n);
  const fenceSegs = RAIL.fences.filter(v => v !== RAIL.fences[1]).map(v => RS([[-300, v], [300, v]]));
  const hb = HOUSES.find(h => h.id === 'hembygd');
  const logFence = RS([[hb.u - 11, hb.v - 8], [hb.u + 11, hb.v - 8], [hb.u + 11, hb.v + 8], [hb.u - 11, hb.v + 8], [hb.u - 11, hb.v - 8]]);
  const trainSide = RS([[X60.u0, X60.v + X60.d / 2], [X60.u1, X60.v + X60.d / 2]]);
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.open || place.walk[k]) continue;
    const [x, z] = ctr(k);
    if (distPolyline(x, z, trainSide) < 2.4) brick[k] = 1;
    else if (fenceSegs.some(s => distPolyline(x, z, s) < 1.3) || distPolyline(x, z, logFence) < 1.3) hedge[k] = 1;
    else if (ROADS.some(rd => rd.id === 'fagpath' && distPolyline(x, z, rd.pts) - rd.width / 2 < 2.2)) ditch[k] = 1;
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
// En ny idé per dag (docs/superpowers/specs/2026-10-16-onboarding-design.md). Spelaren kommer från
// Hagstumosse med hela truppen och allt förrådet har; det nya här är det som platsen själv ger.
//  1 Mölnbo station   höjden: trapptornen och stationstaket för Psg 90 (S1, väg 57 norrifrån över bron)
//  2 Stenbyvägen      husen längs Stenbyvägen (S1, en mindre grupp söderifrån S2)
//  3 Sista tåget      tågklockan: håll tills tåget går (S1, S3 österifrån)
//  4 Norra sidan      bron som flaskhals: horden norr om spåret (S1, S3, S4), pendeltåget som rullar in fullt
//  5 Längs spåret     horden på banvallen och upp på perrongen (S5), sista tåget (alla)
// train: { at } sekunder efter första vågens start går tåget, och dagen är vunnen om basen står (src/sim/sim.js).
// Balansen: docs/balance-log.md, Mölnbo. 0.17.0 (sammanslagningen med 0.16.4, löparnas snubbel): dag 3 hp 16,5 till 17,5,
// dag 4 32 till 31, dag 5 15 till 16.
const g = (type, count, interval, delay, spawn, lead = 0) => ({ type, count, interval, delay, spawn, ...(lead ? { lead } : {}) });
const say = (toast, w) => ({ ...w, toast });
const tell = (toast, grp) => ({ ...grp, toast });
const ALL = ['block', 'wire', 'civ', 'hv', 'm249', 'ksp58', 'ak5', 'psg90', 'epa', 'm2', 'inf'];
export const DAYS = [
  // 0.17.1 (speltestet av 0.17.0: 14, 56 och 88 med överlapp, ingen vann dag 1 på två försök): jämnare vågor och
  // ingen överlapp dag 1 och 2 (nästa våg väntar tills den förra är klar). Överlappen kommer dag 3 med tåget, och
  // dagens första rad varnar.
  // 0.19.0 (H450): horden från Järna i nordost. Dag 1 väg 57 norrifrån över bron, där trapptornen ser vägen.
  { n: 1, supplies: 600, arsenal: ALL, startCash: 2200, hp: 18, intro: { title: 'Day 1: Mölnbo station', text: 'From Järna down väg 57. Snipers on the stair towers see it.' },
    waves: [ say('Down väg 57, from Järna.', { groups: [g('walker', 10, 0.7, 0, 's1', 14), g('runner', 4, 0.9, 5, 's1')] }),
             { groups: [g('walker', 22, 0.5, 0, 's1'), g('runner', 8, 0.6, 10, 's1')] },
             { groups: [g('walker', 30, 0.42, 0, 's1'), tell('Runners behind them!', g('runner', 12, 0.45, 14, 's1')), g('brute', 1, 4, 22, 's1')] } ] },
  // 0.19.0 (H450, H451): horden över bron och ner längs Stenbyvägen mot Folkets hus; en mindre grupp söderifrån.
  // H443: introt högst tolv ord. 0.19.1 (speltestet av 0.19.0, fynd 9): introt säger varifrån (Järna och söderifrån).
  { n: 2, intel: 'unknown', supplies: 600, arsenal: ALL, startCash: 2200, hp: 12, intro: { title: 'Day 2: Stenbyvägen', text: 'From Järna and from the south. Squads in houses along Stenbyvägen.' },
    waves: [ say('Väg 57 again.', { groups: [g('walker', 12, 0.7, 0, 's1', 14), g('runner', 4, 0.9, 5, 's1')] }),
             // 0.18.0 (skiva 1, kampanjplanens dag 9): de pansrade. Småkaliber biter knappt; Ksp 88 och granaterna tar dem.
             say('A smaller group from the south, up Stenbyvägen!', { groups: [g('walker', 18, 0.6, 0, 's2'), g('walker', 48, 0.4, 4, 's1'), tell('Armoured ones on Stenbyvägen! Small arms barely bite.', g('armored', 3, 2.4, 10, 's1'))] }),
             { groups: [g('runner', 40, 0.3, 0, 's1'), g('walker', 40, 0.35, 6, 's1'), g('crawler', 8, 1.2, 12, 's1'), g('brute', 3, 3.5, 20, 's1')] },
             { groups: [g('walker', 50, 0.3, 0, 's1'), g('walker', 46, 0.3, 14, 's1'), tell('Brutes on väg 57!', g('brute', 4, 3, 18, 's1')), g('armored', 4, 2, 10, 's1'), g('runner', 30, 0.35, 26, 's1')] } ] },
  { n: 3, supplies: 600, arsenal: ALL, startCash: 2200, hp: 18, overlap: 50, overlapMin: 0.4, train: { at: 420 },
    // 0.19.1 (speltestet av 0.19.0, fynd 9): varifrån, och dag 3 heter inte "the last train" (det är dag 5)
    intro: { title: 'Day 3: The train', text: 'From Järna, and from the east along Fagernäsvägen. Hold until the train.' },
    objective: 'Hold Folkets hus until the train leaves.',
    waves: [ say('From today the next wave will not wait for this one.', { groups: [g('walker', 14, 0.6, 0, 's1', 14), g('runner', 6, 0.8, 6, 's1')] }),
             say('From the east, along Fagernäsvägen!', { groups: [g('walker', 40, 0.4, 0, 's3'), g('walker', 30, 0.45, 6, 's1')] }),
             { groups: [g('runner', 30, 0.3, 0, 's1'), g('walker', 36, 0.35, 0, 's3'), g('crawler', 8, 1.0, 8, 's3'), g('brute', 3, 3, 16, 's1')] },
             { groups: [g('walker', 44, 0.3, 0, 's3'), g('walker', 36, 0.32, 4, 's1'), tell('Runners along Fagernäsvägen!', g('runner', 26, 0.3, 20, 's3')), g('brute', 4, 3, 24, 's1')] },
             { groups: [g('walker', 70, 0.25, 0, 's3'), g('runner', 50, 0.25, 6, 's1'), g('armored', 5, 2, 14, 's1'), g('brute', 5, 2.5, 10, 's3')] } ] },
  // 0.19.0 (H450): norr om spåret från Norrbacken; (H452) pendeltåget som rullar in fullt.
  // arrival (H452): 30 s in i fjärde vågen ("Brutes at the bridge!") står pendeltåget vid norra perrongen; förvarningen
  // 9 s före. 50 kliver ut. hp 38 till 32 (tåget i tredje vågen med hp 38 tog basen i alla seeds, och balansens
  // uppställning utan policyns ordrar förlorade dag 4 med 34; docs/balance-log.md 0.19.0).
  { n: 4, supplies: 600, arsenal: ALL, startCash: 2200, hp: 38, overlap: 50, overlapMin: 0.4, train: { at: 420 },
    arrival: { wave: 2, at: 35, warn: 12, doors: INBOUND.doors,
      groups: [{ type: 'walker', count: 34, interval: 0.12 }, { type: 'runner', count: 10, interval: 0.3, delay: 1.5 }, { type: 'crawler', count: 6, interval: 0.5, delay: 3 }] },
    intro: { title: 'Day 4: North side', text: 'More of them north of the tracks. Close the bridges.' },
    objective: 'Hold Folkets hus until the train leaves.',
    waves: [ say('Väg 57.', { groups: [g('walker', 10, 0.6, 0, 's1', 14), g('runner', 4, 0.8, 6, 's1')] }),
             say('North of the tracks, along Norrbacken!', { groups: [g('walker', 36, 0.35, 0, 's4'), g('runner', 12, 0.5, 12, 's4')] }),
             { groups: [g('walker', 22, 0.35, 0, 's4'), g('walker', 16, 0.4, 4, 's3'), g('armored', 3, 2, 8, 's3'), g('brute', 2, 3, 14, 's4')] },
             { groups: [g('runner', 30, 0.25, 0, 's4'), g('walker', 30, 0.3, 4, 's1'), g('walker', 24, 0.35, 8, 's3'), tell('Brutes at the bridge!', g('brute', 5, 2.5, 20, 's4'))] },
             { groups: [g('walker', 46, 0.26, 0, 's4'), g('runner', 29, 0.3, 8, 's3'), g('crawler', 10, 1.0, 4, 's4'), g('armored', 4, 2, 16, 's4'), g('brute', 4, 3, 14, 's4')] } ] },
  // 0.19.0 (H450): "the last train north" stämmer inte när horden kommer norrifrån; tåget heter nu bara det sista.
  // Banvallen västerifrån är de som gått runt.
  { n: 5, supplies: 600, arsenal: ALL, startCash: 2200, hp: 19, overlap: 50, overlapMin: 0.4, train: { at: 420, last: true },
    intro: { title: 'Day 5: Along the tracks', text: 'The last train out. Everyone who can, gets on.' },
    objective: 'Hold Folkets hus until the last train leaves.',
    waves: [ say('Fagernäsvägen and Stenbyvägen.', { groups: [g('walker', 10, 0.6, 0, 's3', 14), g('walker', 7, 0.7, 4, 's2')] }),
             say('North of the tracks!', { groups: [g('walker', 36, 0.3, 0, 's4'), g('walker', 22, 0.4, 4, 's1'), g('runner', 14, 0.4, 12, 's3')] }),
             say('Some went round. On the tracks from the west!', { groups: [g('walker', 29, 0.35, 0, 's5'), g('runner', 22, 0.3, 8, 's5'), g('walker', 29, 0.35, 4, 's3')] }),
             { groups: [g('walker', 36, 0.28, 0, 's4'), g('runner', 29, 0.3, 4, 's2'), g('armored', 5, 2, 6, 's2'), g('brute', 4, 3, 10, 's1'), g('walker', 29, 0.3, 10, 's5')] },
             { groups: [g('walker', 34, 0.3, 0, 's3'), g('walker', 30, 0.34, 0, 's5'), g('crawler', 10, 1.0, 4, 's3'), g('runner', 29, 0.3, 10, 's4'), g('armored', 6, 1.8, 8, 's3'), g('brute', 6, 2.4, 14, 's2'), g('brute', 4, 3, 20, 's5')] } ] },
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
  extent: { x0: -300, x1: 320, z0: -260, z1: 290 },
};

export const molnbo = {
  id: 'molnbo', name: 'Mölnbo · Stationen', version: MOLNBO_VERSION, world: 'molnbo',
  outro: { text: 'The last train is through. Mölnbo station held long enough.' },
  camera: { target: R(-6, 20), view: 56, zoom: [24, 84], pan: { x0: CRISP.x0 + 6, x1: CRISP.x1 - 6, z0: CRISP.z0 + 6, z1: CRISP.z1 - 6 }, intro: 4 },
  shadowBounds: { x0: CRISP.x0 - 6, x1: CRISP.x1 + 6, z0: CRISP.z0 - 6, z1: CRISP.z1 + 6 },
  roads: ROADS, ground: GROUND, rail: RAIL, inbound: INBOUND, trainMark: TRAIN_MARK, bridge: BRIDGE, foot: FOOT, towers: TOWERS, x60: X60, folkets: FOLKETS,
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
