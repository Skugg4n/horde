// Sektor Västerkärv (0.26.0): kampanjens dag 14, "Hinna" (docs/superpowers/specs/2026-10-21-slutspelet-design.md, avsnittet
// Dag 14, Västerkärv; utkast, inte godkänt av Ola: reglerna är data här och i src/sim/sim.js så att de är lätta att ändra).
// Kartan är förhandsvisningens (src/data/vasterkarv.js, GENERERAD ur OSM av scripts/osm-to-map.mjs; den filen redigeras
// inte för hand). Här ligger det som gör den spelbar: ingångarna, utgången, basen, gårdsplanens stig, rutnätet och
// placeringen, husen och dagen.
// Kampanjbågen: docs/superpowers/specs/2026-10-18-kampanjplan.md avsnitt 10 ("Dag 14, Västerkärv. Zombier via småvägar.
// Civila, någon Ksp, en EPA. Stigar och specialregler för den här kartan."). Före: Gnesta västra rondell (dag 13, 14 efter
// DEFEND LAXNE). Efter: västra rondellen igen (dag 15, inte byggd): kampanjen slutar här tills vidare (src/meta/table.js
// campaignEnd följer den sista byggda dagen av sig själv).
//
// Dagens regler (dagens data nedan, mekaniken i src/sim/sim.js 0.26.0):
//   evac.exit         de civila går i tre grupper längs de gula linjerna UT ur kartan på östra grusvägen mot väg 57
//   evac.baseMayFall  boningshuset får falla när sista gruppen gått; faller det före är dagen förlorad
//   extract           gårdens EPA ska köras ut till utgången (Move) innan dagen är vunnen
//   track             EPA:n kör bara på grusvägarna och stigarna, aldrig över åkern, och fortare där än sin krypfart
//   preset own        EPA:n är gårdens, inte truppens: den står på gårdsplanen från början och tar ingen plats i fronten
// Spelets meter: x öster, z söder (som de andra banorna). Kartdata © OpenStreetMap contributors (ODbL).
import * as V from './vasterkarv.js';
import { osmGrid, distPolyline, inPoly } from './osm-map.js';
import { buildPlace, rect, inRect, distRect, KIND, gablePerch, SHED_PERCH } from '../sim/placement.js';
import { timed } from '../meta/load-timing.js';
import { lazy } from './lazy.js';

export const VASTERKARV_PLAY_VERSION = '0.1.0';
const { GROUND } = V;
// Spelytan: förhandsvisningens (x -157,5..157,5, z -145..145). Ingångarna i väster och sydväst, utgången i öster.
export const CRISP = { ...V.CRISP };
export const SURROUNDINGS = { ...V.VASTERKARV_SURROUNDINGS, crisp: CRISP };
export const GRID_BOUNDS = V.GRID_BOUNDS;
const outside = (x, z) => Math.max(CRISP.x0 - x, x - CRISP.x1, CRISP.z0 - z, z - CRISP.z1);
const inCrisp = (x, z) => outside(x, z) <= 0;

// ---------- gårdsplanens stig ----------
// OSM:s småvägar slutar på gårdsplanen utan att mötas: servicevägen från grusvägen (väster om ladan), traktorspåret
// (vid uthuset) och gårdsstigen (vid grinden mot åkern). Stigen binder ihop dem över gårdsplanen och går fram till
// boningshusets gavel, där basen är. Horden och de civila går på den; EPA:n kör på den.
export const PATHS = [
  { id: 'gardsplan', pts: [[-6.2, -23.65], [-3.6, -19.6], [-2.6, -17.4], [-5, -13.5], [-9.3, -12.4]], from: 'service-8', to: 'gardsstigen-12' },
].map(p => ({ ...p, name: null, path: true, cls: 'E', type: 'path', surface: 'gravel', width: 2.6, walk: true, smoothed: true, line: p.pts.map(q => [...q]) }));
export const ROADS = [...V.ROADS, ...PATHS];

// ---------- ingångarna och utgångarna ----------
// Varje ingång ligger där dess väg är SPAWN_OUT meter utanför den skarpa ytan (i dimkanten).
const SPAWN_OUT = 16;
function fogPoint(id, hint, out = SPAWN_OUT) {
  const P = ROADS.find(r => r.id === id).pts;
  let best = null, bd = Infinity;
  for (let i = 1; i < P.length; i++) {
    const [ax, az] = P[i - 1], [bx, bz] = P[i], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
    for (let k = 0; k <= n; k++) {
      const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
      if (Math.abs(outside(x, z) - out) > 0.2) continue;
      const d = Math.hypot(x - hint[0], z - hint[1]);
      if (d < bd) { bd = d; best = [Math.round(x * 100) / 100, Math.round(z * 100) / 100]; }
    }
  }
  if (!best) throw new Error('ingen dimkant på ' + id);
  return best;
}
// Kampanjbågen: horden kommer på småvägarna. w Skogsvägen ur skogen i väster (möter grusvägen norr om gården), sw
// Traktorspåret över åkern i sydväst (slutar vid gårdsplanen). Södra skogsvägen (förhandsvisningens s) används inte dag 14.
export const SPAWNS = [
  { id: 'w', name: 'Skogsvägen', day: 1, at: fogPoint('skogsvagen-10', [-200, -54]) },
  { id: 'sw', name: 'Traktorspåret', day: 1, at: fogPoint('traktorsparet-11', [-200, 64]) },
];
// Utgångarna: e östra grusvägen mot väg 57 och Gnesta (de civilas väg ut, src/sim/sim.js civRouteOf), n grusvägen norrut
// mot Kärvsvägen (ingen använder den dag 14).
export const EXITS = [
  { id: 'e', name: 'Östra grusvägen to väg 57', at: fogPoint('ostra-grusvagen-1', [175, 45], 6) },
  { id: 'n', name: 'Grusvägen north', at: fogPoint('grusvagen-4', [56, -170], 4) },
];
// Utgången för EPA:n: en ring på östra grusvägen innanför kanten, där den lämnar kartan efter de civila
export const EXTRACT = { at: [140.5, 63.6], r: 9 };

// ---------- basen: boningshuset ----------
// Basens ram som villan på Barrstigen (render/models.js rinkEntranceModel): lokal +x ut genom gaveln mot gårdsplanen och
// grinden (husets lokala +z), dörren mitt på, planket och sandsäckarna i 0,8 av ishallens storlek.
export const BASE_ID = 'b867826786';
const HOUSE = V.BUILDINGS.find(b => b.id === BASE_ID);
export const FARMHOUSE = (() => {
  const ry = HOUSE.ry - Math.PI / 2, len = HOUSE.d, wid = HOUSE.w, x = HOUSE.x, z = HOUSE.z;
  const at = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const face = len / 2;
  return { id: 'boningshuset', x, z, ry, len, wid, wallH: 3.4, face, main: 0, doors: [0], scale: 0.8, at, entrance: at(face + 1.6, 0) };
})();
// Basrutan: gårdsplanens stig framför gaveln
export const BASE = { at: [-9.3, -12.4] };

// ---------- rutnätet ----------
export function vasterkarvGrid() {
  return osmGrid({ id: 'vasterkarv', roads: ROADS, sketch: { spawns: SPAWNS, base: BASE, exits: EXITS } }, GRID_BOUNDS);
}

// ---------- husen ----------
// Allt som står på den skarpa ytan. Bodar går inte att besätta. Boningshuset, ladan och uthuset är husen de civila går
// ut ur (dagens evac.groups), så de går inte att besätta i dag (src/sim/sim.js 'hus evak').
const STANDING = V.BUILDINGS.filter(b => !b.far && inCrisp(b.x, b.z));
const NO_GARRISON = new Set(['shed']);
// Prickskyttelägen: ladans och maskinhallens låga tak (ser gårdsplanen och åkern)
export const PERCH_IDS = new Set(['b867826784', 'b867826770']);
const FLAT_PERCH = new Set(['ladugard', 'farm']);
export const LOTS = { plots: STANDING.filter(b => !NO_GARRISON.has(b.kind)).map(b => ({ id: b.id, house: b, extras: [] })), edges: [], blocks: [] };
const HOUSE_PAD = 1;
function buildingShapes() {
  return STANDING.map(h => {
    const body = rect(h.x, h.z, h.ry, h.w, h.d);
    let height;
    if (h.kind === 'villa' && h.ridge) {
      const eave = h.eave ?? 3, rh = h.ridge - eave, c = Math.cos(h.ry), s = Math.sin(h.ry);
      height = (x, z) => {
        if (!inRect(body, x, z)) return 0;
        const dx = x - h.x, dz = z - h.z, lz = dx * s + dz * c;
        return eave + rh * Math.max(0, 1 - Math.abs(lz) / (h.d / 2));
      };
    } else {
      const top = h.h ?? 5;
      height = (x, z) => (inRect(body, x, z) ? top : 0);
    }
    // 0.26.2 (H605): också nocken på villornas flacka sadeltak (perch 4) och bodarnas låga platta tak
    // 0.26.4 (speltestet av 0.26.3: "Roof too steep" nästan överallt): också grannens ladugård och gårdarnas låga uthus
    const flat = PERCH_IDS.has(h.id) || FLAT_PERCH.has(h.kind) || SHED_PERCH.has(h.kind);
    const perch = flat ? (x, z) => (inRect(body, x, z, -0.3) ? 1 : 0) : h.kind === 'villa' && h.ridge ? gablePerch(h) : null;
    return { id: h.id, kind: h.kind, rects: [body], eave: h.eave ?? (h.h ?? 5) * 0.8, pad: h.kind === 'shed' ? 0.4 : HOUSE_PAD, height, perch, box: [h.x, h.z, Math.hypot(h.w, h.d) / 2 + HOUSE_PAD + 1] };
  });
}
export const SHAPES = buildingShapes();

// ---------- placeringen ----------
// Vägar är väg. Husen (med en meters marginal) är hus och skymmer efter sin höjd. Bodarna och allt utanför den skarpa
// ytan är hinder, tät skog är skog. Stengärdsgårdarna (och de få staketen) är skydd för grupperna (hedge).
const CELL_SAMPLES = [[0, 0], [-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9], [0, -0.9], [0, 0.9], [-0.9, 0], [0.9, 0]];
const ROOF_SAMPLES = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 0.8, Math.sin(i * Math.PI / 4) * 0.8])];
const SHED_RECTS = V.GARDENS.sheds.map(([x, z, ry, w, d]) => rect(x, z, ry, w, d));
export const WALLS = [...V.PROPS.filter(q => q.kind === 'stoneWall').map(q => [q.at, q.to]), ...V.GARDENS.fences.map(([ax, az, bx, bz]) => [[ax, az], [bx, bz]])];
export function vasterkarvPlacement(grid) {
  const { w, h, cellSize: cs, origin: [x0, z0] } = grid;
  const near = new Map();
  SHAPES.forEach((b, i) => {
    const [bx, bz, r] = b.box;
    for (let j = Math.max(0, Math.floor((bz - r - z0) / cs)); j <= Math.min(h - 1, Math.floor((bz + r - z0) / cs)); j++)
      for (let ii = Math.max(0, Math.floor((bx - r - x0) / cs)); ii <= Math.min(w - 1, Math.floor((bx + r - x0) / cs)); ii++) {
        const k = j * w + ii; if (!near.has(k)) near.set(k, []); near.get(k).push(i);
      }
  });
  const shapesAt = k => (near.get(k) ?? []).map(i => SHAPES[i]);
  const forests = GROUND.forest.filter(p => p.length > 2);
  const keyOf = (x, z) => Math.floor((z - z0) / cs) * w + Math.floor((x - x0) / cs);
  const denseForest = (x, z, k) => {
    if (!forests.some(p => inPoly(x, z, p))) return false;
    if (ROADS.some(o => o.walk !== false && distPolyline(x, z, o.line ?? o.pts) < o.width / 2 + 7)) return false;
    return !shapesAt(k).some(b => b.rects.some(r => distRect(r, x, z) < 6));
  };
  const place = buildPlace({
    w, h, cellSize: cs, origin: [x0, z0],
    walk: (x, z, k) => grid.walk[k] === 1,
    classify(x, z) {
      const k = keyOf(x, z);
      if (grid.walk[k]) return KIND.road;
      if (outside(x, z) > 0) return KIND.thing;
      const here = shapesAt(k);
      if (here.some(b => b.rects.some(r => inRect(r, x, z, b.pad)))) return KIND.house;
      if (SHED_RECTS.some(r => inRect(r, x, z, 0.8))) return KIND.thing;
      if (denseForest(x, z, k)) return KIND.forest;
      return KIND.open;
    },
  });
  const n = w * h;
  const roof = new Float32Array(n), bldg = new Int32Array(n), height = new Float32Array(n), perch = new Uint8Array(n);
  const ctr = k => [x0 + ((k % w) + 0.5) * cs, z0 + (Math.floor(k / w) + 0.5) * cs];
  const idx = new Map(SHAPES.map((b, i) => [b, i]));
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.house) continue;
    const [x, z] = ctr(k);
    let hMax = 0;
    for (const b of shapesAt(k)) {
      let hi = 0;
      for (const [dx, dz] of CELL_SAMPLES) hi = Math.max(hi, b.height(x + dx, z + dz));
      hMax = Math.max(hMax, hi);
      if (bldg[k] || !(b.height(x, z) > 0)) continue;
      bldg[k] = idx.get(b) + 1;
      const kp = b.perch ? b.perch(x, z) : 0;
      if (!kp) continue;
      let y = 0;
      for (const [dx, dz] of ROOF_SAMPLES) y = Math.max(y, b.height(x + dx, z + dz));
      roof[k] = Math.round(y * 100) / 100; perch[k] = kp;
    }
    if (!hMax) {
      let best = Infinity;
      for (const b of shapesAt(k)) for (const r of b.rects) { const d = distRect(r, x, z); if (d < best && d < 1.6) { best = d; hMax = b.eave ?? 3; } }
      if (!hMax) hMax = 3;
    }
    height[k] = Math.round(hMax * 100) / 100;
  }
  const hedge = new Uint8Array(n), brick = new Uint8Array(n), ditch = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.open || place.walk[k]) continue;
    const [x, z] = ctr(k);
    if (WALLS.some(s => distPolyline(x, z, s) < 1.3)) hedge[k] = 1;
  }
  return { ...place, roof, bldg, buildings: SHAPES.map(b => b.rects), hedge, ditch, brick, height, perch,
    perchAt: (x, z) => {
      for (const b of shapesAt(keyOf(x, z))) {
        const hh = b.height(x, z);
        if (!(hh > 0)) continue;
        return { y: hh, kind: b.perch?.(x, z) ?? 0, chimney: null, roofKind: b.kind, height: b.height };
      }
      return null;
    } };
}

// ---------- dagen ----------
// En dag (kampanjens dag 14, eller 15 efter DEFEND LAXNE): "Hinna". Horden på småvägarna västerifrån och över åkern i
// sydväst, fyra vågor. Gårdens folk går ut i tre grupper (ladan, uthuset, sist boningshuset), en per våg, längs gårdsstigen
// och grusvägen ut på östra grusvägen. När sista gruppen gått får huset falla; sedan ska EPA:n ut samma väg.
// Truppen: det som kom ut ur rondellen, men bara fem får plats på gårdens vägar (frontage), plus gårdens EPA; ledningen
// skickar gårdens frivilliga och en Ksp 90 (src/data/depot.js vk-1). Balansen: docs/balance-log.md, Västerkärv 0.26.0.
const g = (type, count, interval, delay, spawn, lead = 0) => ({ type, count, interval, delay, spawn, ...(lead ? { lead } : {}) });
const say = (toast, wv) => ({ ...wv, toast });
const tell = (toast, grp) => ({ ...grp, toast });
const ALL = ['block', 'wire', 'civ', 'hv', 'm249', 'ksp58', 'ak5', 'psg90', 'epa', 'm2', 'inf'];
// Husen de civila går ut ur, i tur och ordning
export const EVAC_HOUSES = ['b867826784', 'b867826785', BASE_ID];
// EPA:ns plats på gårdsplanen (vid servicevägen mellan boningshuset och ladan, vänd mot åkern)
export const EPA_AT = [-1.5, -23.5];
export const DAYS = [
  // hp 15,5 med basen 16 (balansen, docs/balance-log.md Västerkärv 0.26.0): den vanliga spelaren tappar ibland huset innan
  // sista gruppen gått (vinner inom två försök); 16 fällde den fem gånger, 17 sex. Efter DEFEND LAXNE är truppen tröttare
  // och olika sammansatt: hp 12 i den grenen (choiceMod), 12,5 fällde den vanliga spelaren fyra gånger.
  { n: 1, supplies: 500, arsenal: ALL, startCash: 2000, hp: 15.5, overlap: 10, overlapMin: 0.3, bounty: 0.7,
    choiceMod: { choice: ['laxne', 'defend'], hp: 12 },
    intro: { title: 'Day 1: Get out in time', text: 'Up Skogsvägen and across the field on Traktorspåret.' },
    // 0.26.1 (H607, speltestet av dag 14: horden kom runt huset till gårdsplanen där ingen såg dem): ordern säger var
    order: { text: 'Stand in the yard and on Skogsvägen. Out east, then the EPA.' },
    objective: 'Get the farm out east. Then drive the EPA out.',
    // gårdsplanen, de två småvägarna in och östra grusvägen ut i bild
    view: { pts: [FARMHOUSE.entrance, [12, -22], [-90, -55], [-90, 50], EXTRACT.at] },
    tail: { n: 8, after: 6, mul: 4, brutes: 4 },
    // de civila: ut ur kartan på östra grusvägen (exit), minst need av total. Huset får falla när ingen som går är
    // närmare än left meter.
    evac: { need: 10, exit: 'e', baseMayFall: { left: 40 },
      groups: [{ house: EVAC_HOUSES[0], count: 4, at: 10, wave: 0 }, { house: EVAC_HOUSES[1], count: 4, at: 12, wave: 1 },
        { house: EVAC_HOUSES[2], count: 4, at: 10, wave: 3 }] },
    preset: [{ type: 'epa', at: EPA_AT, own: true }],
    extract: { types: ['epa'], at: EXTRACT.at, r: EXTRACT.r },
    track: { types: ['epa'], reach: 1, speed: 2.6 },
    waves: [ say('On Skogsvägen, out of the forest.', { groups: [g('walker', 12, 0.7, 0, 'w', 14), g('runner', 4, 0.9, 8, 'w')] }),
             say('Across the field on Traktorspåret!', { groups: [g('walker', 16, 0.5, 0, 'sw'), g('runner', 6, 0.6, 6, 'sw'), g('walker', 8, 0.6, 4, 'w')] }),
             { groups: [g('walker', 18, 0.45, 0, 'w'), g('walker', 14, 0.5, 4, 'sw'), tell('Runners over the field!', g('runner', 10, 0.45, 8, 'sw')), tell('Armoured ones on Skogsvägen!', g('armored', 2, 2.4, 6, 'w'))] },
             { groups: [g('walker', 20, 0.4, 0, 'sw'), g('walker', 16, 0.45, 2, 'w'), g('runner', 10, 0.45, 6, 'w'), tell('Brutes on Traktorspåret!', g('brute', 2, 3, 8, 'sw')), g('armored', 2, 2.4, 6, 'sw')] } ] },
];
for (const d of DAYS) {
  const first = new Set(d.waves[0].groups.map(q => q.spawn));
  d.foretell = [...new Set(d.waves.flatMap(wv => wv.groups.map(q => q.spawn)))].filter(id => !first.has(id));
}

export const vasterkarvPlay = {
  id: 'vasterkarv', name: 'Västerkärv', version: VASTERKARV_PLAY_VERSION, world: 'osm', source: V.SOURCE,
  // Kampanjbågen: gården är tom, alla kom ut. Nästa är västra rondellen igen (dag 15, inte byggd): kampanjens slutblad
  // (src/meta/table.js campaignEnd) tar vid av sig själv.
  outro: { text: 'The farm is empty. Everyone got out. The EPA is on its way to Gnesta. To be continued.',
    summary: 'Västerkärv is empty. Everyone got out. To be continued.', end: 'To be continued.',
    // 0.26.4 (speltestet av 0.26.3: slutbladet stämplade gården HELD med huset fallet): en dag som går ut på att lämna
    stamp: 'EVACUATED', pen: 'evacuated', status: 'Everyone got out.' },
  evacPlace: 'got out on the east road',
  baseLabel: 'Boningshuset · Base',
  // 0.26.5 (speltestet av 0.26.4: skylten satt cirka 20 m norr om gården som tog skadan, och en Ksp 90 21 m bort nådde
  // inte): skylten står på basrutan vid gaveln och grinden, där horden slår, och en gul ring markerar platsen
  baseLabelAt: BASE.at,
  entryAt: 1000,
  // kameran i söder, norr upp och väster till vänster (src/render/camera-eye.js setCameraYaw), som rondellen
  camera: { target: [-20, -10], view: 80, zoom: [22, 150], yaw: 0, pan: { x0: CRISP.x0 + 6, x1: CRISP.x1 - 6, z0: CRISP.z0 + 6, z1: CRISP.z1 - 6 }, intro: 4 },
  shadowBounds: { x0: CRISP.x0 - 6, x1: CRISP.x1 + 6, z0: CRISP.z0 - 6, z1: CRISP.z1 + 6 },
  roads: ROADS, joins: V.JOINS, streams: V.STREAMS, rail: null,
  ground: { ...GROUND, bounds: { x0: CRISP.x0 - 24, x1: CRISP.x1 + 24, z0: CRISP.z0 - 24, z1: CRISP.z1 + 24 }, ppm: 8 },
  buildings: V.BUILDINGS, parts: V.PARTS, streets: V.STREETS, gardens: V.GARDENS, props: V.PROPS, labels: V.LABELS, pois: V.POIS,
  surroundings: SURROUNDINGS, lots: LOTS, spawns: SPAWNS, base: BASE, exits: EXITS,
  iceRink: FARMHOUSE, baseModel: 'rink', hall: HOUSE,
  // Basen är ett litet hus: färre i bas än ishallen, dörren släpper in en i taget
  // 0.26.5 (speltestet av 0.26.4: "börjar med BASE 16 utan förklaring"): 20 som alla andra dagar
  guns: 5, frontage: 5, baseHp: 20, days: DAYS,
  door: { gap: 3.2 },
  // småvägarna är smala och slingrar: horden går som i Björnlunda
  pace: 1.4,
  unlocks: ['block', 'm2', 'epa', 'inf', 'ksp58', 'ak5', 'psg90'],
  // Öppnar när västra rondellen är vunnen
  unlock: { map: 'gnesta-vastra-rondell', day: 1 },
};
lazy(vasterkarvPlay, 'grid', () => timed('vasterkarv:rutnät', () => vasterkarvGrid()));
lazy(vasterkarvPlay, 'place', () => timed('vasterkarv:placering', () => vasterkarvPlacement(vasterkarvPlay.grid)));
