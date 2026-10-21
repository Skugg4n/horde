// Sektor Gnesta västra rondell (0.25.0, H559): kampanjens dag 13, "Försvar mot förtrupper". Kartan är förhandsvisningens
// (src/data/gnesta-vastra-rondell.js, GENERERAD ur OSM av scripts/osm-to-map.mjs; den filen redigeras inte för hand). Här
// ligger det som gör den spelbar: ingångarna, basen, rutnätet och placeringen, husen som går att besätta, gångvägarna för
// omvägar och dagen.
// Kampanjbågen: docs/superpowers/specs/2026-10-18-kampanjplan.md avsnitt 10 ("Dag 13, Gnesta västra rondell. Försvar mot
// förtrupper."). Före: Björnlunda dag 11 och 12 (12 och 13 om spelaren försvarade Laxne; src/meta/campaign-day.js räknar).
// Efter: Västerkärv (dag 14, inte byggd: kampanjen slutar här med "To be continued.", se outro nedan). Dag 15 (vi blir
// överkörda) och dag 19 (spår av något konstigt) spelas på samma karta senare, med egna specar.
//
// Basen är förhandsvisningens förslag och står kvar: villan på Barrstigens norra sida, cirka 46 m öster om rondellen
// (skälen i scripts/osm-places/gnesta-vastra-rondell.mjs): öster om punkten där alla västliga vägar möts, så att horden
// måste ut i rondellen eller längs gamla landsvägen först; Barrstigen, Furulundsvägen och 57 sydost ligger inom några steg;
// grannvillan närmast rondellen är prickskyttetaket. Radhusen vid Dansbanestigen är en bättre sista bastion men ligger
// 250 m bort och ser inte rondellen; de passar dag 15, när vi blir överkörda och drar oss österut.
// Spelets meter: x öster, z söder (som de andra banorna). Kartdata © OpenStreetMap contributors (ODbL).
import * as V from './gnesta-vastra-rondell.js';
import { osmGrid, distPolyline, inPoly } from './osm-map.js';
import { buildPlace, rect, inRect, distRect, KIND } from '../sim/placement.js';
import { timed } from '../meta/load-timing.js';
import { lazy } from './lazy.js';

export const VASTRA_RONDELL_PLAY_VERSION = '0.1.0';
const { GROUND } = V;
// Spelytan: förhandsvisningens (V.CRISP x -183,75..183,75, z -145..145) utan radhusområdets östra ände och skogen längst
// i söder och norr. Väster om rondellen ligger ingångarna i dimkanten där 57 och D 830 kommer in.
export const CRISP = { x0: -183.75, x1: 140, z0: -130, z1: 130 };
export const SURROUNDINGS = { ...V.VASTRA_RONDELL_SURROUNDINGS, crisp: CRISP };
export const GRID_BOUNDS = V.GRID_BOUNDS;
const outside = (x, z) => Math.max(CRISP.x0 - x, x - CRISP.x1, CRISP.z0 - z, z - CRISP.z1);
const inCrisp = (x, z) => outside(x, z) <= 0;

// ---------- gångvägarna (vägar för omvägar, som Björnlunda och Mölnbo) ----------
// Upptrampade stigar i grus mellan trädgårdarna. Horden går på dem och flödet känner dem, så att en spärrad gata ger en
// omväg i stället för en vägg. Lagda där det är fritt mellan husen och bodarna (provade i tests/vastra-rondell-sector.test.js):
//   stigNorr  Västra Storgatan ned till Barrstigens östra ände (runt en spärrad Furulundsvägen vid rondellen)
//   stigMitt  Furulundsvägen upp till Barrstigen mellan villorna, öster om basen (runt en spärrad Barrstigen vid rondellen)
//   stigSyd   57 sydost upp till Furulundsvägen (in i villorna söderifrån, runt en spärrad Furulundsvägen)
export const PATHS = [
  { id: 'stigNorr', pts: [[5.5, -54.95], [5.5, -21.51]], from: 'vastra-storgatan-2', to: 'barrstigen-5' },
  { id: 'stigMitt', pts: [[13.2, 4.83], [13.2, -21.89]], from: 'furulundsvagen-7', to: 'barrstigen-5' },
  { id: 'stigSyd', pts: [[18, 23.54], [18, 6.18]], from: 'vag-57-1', to: 'furulundsvagen-7' },
].map(p => ({ ...p, name: null, path: true, cls: 'E', type: 'path', surface: 'gravel', width: 2.2, walk: true, smoothed: true, line: p.pts.map(q => [...q]) }));
export const ROADS = [...V.ROADS, ...PATHS];
// Trädgårdarna utan det som skulle stå på stigarna (häckar, staket, träd och brevlådor)
const onPath = (x, z, pad) => PATHS.some(p => distPolyline(x, z, p.pts) < p.width / 2 + pad);
const segOnPath = ([ax, az, bx, bz]) => { for (let t = 0; t <= 1; t += 0.05) if (onPath(ax + (bx - ax) * t, az + (bz - az) * t, 0.6)) return true; return false; };
export const GARDENS = { ...V.GARDENS, hedges: V.GARDENS.hedges.filter(h => !segOnPath(h)), fences: V.GARDENS.fences.filter(f => !segOnPath(f)),
  trees: V.GARDENS.trees.filter(([x, z]) => !onPath(x, z, 0.8)), mailboxes: V.GARDENS.mailboxes.filter(([x, z]) => !onPath(x, z, 0.3)) };

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
// Kampanjbågen: förtrupperna kommer västerifrån. w57 väg 57 från Björnlunda (huvudvägen, rak och bred rakt in i
// rondellen; gamla landsvägen med villaraden går bredvid), d830 väg D 830 ur skogen i sydväst, in i rondellen söderifrån.
export const SPAWNS = [
  { id: 'w57', name: 'väg 57 from Björnlunda', day: 1, at: fogPoint('vag-57-23', [-200, -70]) },
  { id: 'd830', name: 'D 830', day: 1, at: fogPoint('vag-d-830-3', [-200, 95]) },
];
// Utgångarna österut in i Gnesta (förhandsvisningens skiss): Västra Storgatan mot centrum, 57 sydost förbi Helenebergsvägen.
// Ingen simulering läser dem dag 13 (horden vill till basen); de är vägen förbi basen in i stan, och dag 15 (överkörda)
// blir de reträttens vägar. Kärvsvägen söderut mot Västerkärv ligger utanför spelytan (dag 14, inte byggd).
export const EXITS = [
  { id: 'ne', name: 'Västra Storgatan to Gnesta centre', at: fogPoint('vastra-storgatan-2', [160, -120], 4) },
  { id: 'se', name: 'väg 57 south-east', at: fogPoint('vag-57-1', [120, 140], 4) },
];

// ---------- basen: villan på Barrstigen ----------
// Basens ram som Wattrangsborg och Laxne skola (render/models.js rinkEntranceModel): lokal +x ut genom framsidan mot
// gatan (villans lokala +z, söderut mot Barrstigen), dörren mitt på. En villa har en dörr; planket och sandsäckarna
// ritas i 0,85 av ishallens storlek (scale), så att de ryms på fasaden.
export const BASE_ID = 'b660806495';
const HOUSE = V.BUILDINGS.find(b => b.id === BASE_ID);
export const VILLA = (() => {
  const ry = HOUSE.ry - Math.PI / 2, len = HOUSE.d, wid = HOUSE.w, x = HOUSE.x, z = HOUSE.z;
  const at = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const face = len / 2;
  return { id: 'barrstigen', x, z, ry, len, wid, wallH: HOUSE.eave ?? 3, face, main: 0, doors: [0], scale: 0.85, at, entrance: at(face + 1.6, 0) };
})();
// Basrutan: Barrstigen framför villan
export const BASE = { at: [-17.75, -23.5] };

// ---------- rutnätet ----------
// 2 m-rutor, samma regler som de andra OSM-kartorna (src/data/osm-map.js osmGrid): gångbart där en väg ligger.
export function vastraRondellGrid() {
  return osmGrid({ id: 'gnesta-vastra-rondell', roads: ROADS, sketch: { spawns: SPAWNS, base: BASE, exits: EXITS } }, GRID_BOUNDS);
}

// ---------- husen ----------
// Allt som står på den skarpa ytan (inte i diset). Bodar går inte att besätta; villan på Barrstigen är basen.
const STANDING = V.BUILDINGS.filter(b => !b.far && inCrisp(b.x, b.z));
const NO_GARRISON = new Set(['shed']);
// Prickskyttelägen: radhusens låga tak vid Dansbanestigen och Hagstigen, och villataket närmast rondellen (grannen väster
// om basen, förhandsvisningens skiss: "ser in i rondellen"). De andra villorna har branta tak.
const PERCH = new Set(['row']);
export const PERCH_IDS = new Set(['b660806494']);
export const LOTS = { plots: STANDING.filter(b => !NO_GARRISON.has(b.kind) && b.id !== BASE_ID).map(b => ({ id: b.id, house: b, extras: [] })), edges: [], blocks: [] };
const HOUSE_PAD = 1;
function buildingShapes() {
  return STANDING.map(h => {
    const body = rect(h.x, h.z, h.ry, h.w, h.d);
    let height;
    if (h.kind === 'villa' && h.ridge) {
      // sadeltak med nocken längs lokal x (gnesta-kit.js villa)
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
    const perch = PERCH.has(h.kind) || PERCH_IDS.has(h.id) ? (x, z) => (inRect(body, x, z, -0.3) ? 1 : 0) : null;
    return { id: h.id, kind: h.kind, rects: [body], eave: h.eave ?? (h.h ?? 5) * 0.8, pad: h.kind === 'shed' ? 0.4 : HOUSE_PAD, height, perch, box: [h.x, h.z, Math.hypot(h.w, h.d) / 2 + HOUSE_PAD + 1] };
  });
}
export const SHAPES = buildingShapes();

// ---------- placeringen ----------
// Gator är gata. Husen (med en meters marginal) är hus och skymmer efter sin höjd. Bodarna i trädgårdarna och allt utanför
// den skarpa ytan är hinder, tät skog är skog. Häckarna och staketen i trädgårdarna är skydd för grupperna (hedge).
const CELL_SAMPLES = [[0, 0], [-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9], [0, -0.9], [0, 0.9], [-0.9, 0], [0.9, 0]];
const ROOF_SAMPLES = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 0.8, Math.sin(i * Math.PI / 4) * 0.8])];
const SHED_RECTS = GARDENS.sheds.map(([x, z, ry, w, d]) => rect(x, z, ry, w, d));
const HEDGES = [...GARDENS.hedges.map(([ax, az, bx, bz]) => [[ax, az], [bx, bz]]), ...GARDENS.fences.map(([ax, az, bx, bz]) => [[ax, az], [bx, bz]])];
export function vastraRondellPlacement(grid) {
  const { w, h, cellSize: cs, origin: [x0, z0] } = grid;
  // husen per ruta (deras omskrivna cirkel), så att varje ruta bara provar husen nära den
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
  // Skydd för grupperna: häckarna och staketen i trädgårdarna
  const hedge = new Uint8Array(n), brick = new Uint8Array(n), ditch = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.open || place.walk[k]) continue;
    const [x, z] = ctr(k);
    if (HEDGES.some(s => distPolyline(x, z, s) < 1.3)) hedge[k] = 1;
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
// En dag (kampanjens dag 13, eller 14 efter DEFEND LAXNE). Förtrupperna västerifrån längs väg 57 från Björnlunda och
// D 830 ur skogen, fyra vågor: mindre än en hel hord (den kommer dag 15), med springare och pansrade i klungorna, så att
// dagen känns som en känselspröt före det stora anfallet. Truppen är det som kom ut ur Björnlunda; ledningen skickar en
// Ksp 88 (src/data/depot.js vr-1). Balansen: docs/balance-log.md, Västra rondellen 0.25.0.
const g = (type, count, interval, delay, spawn, lead = 0) => ({ type, count, interval, delay, spawn, ...(lead ? { lead } : {}) });
const say = (toast, wv) => ({ ...wv, toast });
const tell = (toast, grp) => ({ ...grp, toast });
const ALL = ['block', 'wire', 'civ', 'hv', 'm249', 'ksp58', 'ak5', 'psg90', 'epa', 'm2', 'inf'];
export const DAYS = [
  // hp 16: balansen (docs/balance-log.md, Västra rondellen 0.25.0). Vägarna är korta (cirka 230 och 300 m) och truppen
  // är hela Björnlunda-truppen med en Ksp 88: med Björnlundas 7 stod basen orörd för alla spelare. 18 fällde den vanliga
  // spelaren sex gånger i grenen DEFEND LAXNE (tröttare trupp efter tre dagar i rad).
  // 0.25.1 (H562, speltestet av 0.25.0: tre vinster av tre, 885 till 1 094 $ över): hp 17 (den vanliga spelaren vinner på
  // första försöket med basen 2 till 10 kvar i båda grenarna; 18 och 19 fällde den i grenen DEFEND) och bounty 0,65
  // (spelaren vid basen har 410 till 462 $ över, förut 530 till 563). docs/balance-log.md, Västra rondellen 0.25.1.
  { n: 1, supplies: 600, arsenal: ALL, startCash: 2200, hp: 17, overlap: 12, overlapMin: 0.3, bounty: 0.65,
    intro: { title: 'Day 1: Forward groups', text: 'Down väg 57 from Björnlunda, and D 830 out of the forest.' },
    order: { text: 'Hold the roundabout from the villa on Barrstigen.' },
    objective: 'Stop their forward groups at the roundabout.',
    // basen, rondellen och 57 västerut (dit förtrupperna kommer) i bild
    view: { pts: [VILLA.entrance, [VILLA.x + 14, VILLA.z - 8], [-63, -20.5], [-110, -50], [-100, 30]] },
    tail: { n: 8, after: 6, mul: 4, brutes: 4 },
    waves: [ say('Forward groups on väg 57.', { groups: [g('walker', 10, 0.7, 0, 'w57', 14), g('runner', 5, 0.9, 6, 'w57'), g('walker', 6, 0.8, 8, 'd830')] }),
             say('D 830, out of the forest!', { groups: [g('walker', 14, 0.55, 0, 'd830'), g('runner', 8, 0.6, 6, 'd830'), g('walker', 10, 0.6, 4, 'w57'), tell('Armoured ones on väg 57!', g('armored', 2, 2.4, 10, 'w57'))] }),
             { groups: [g('walker', 18, 0.45, 0, 'w57'), g('walker', 14, 0.5, 4, 'd830'), tell('Runners down väg 57!', g('runner', 10, 0.45, 8, 'w57')), tell('Armoured ones on D 830!', g('armored', 3, 2.4, 6, 'd830'))] },
             { groups: [g('walker', 20, 0.4, 0, 'd830'), g('walker', 18, 0.4, 2, 'w57'), g('runner', 12, 0.4, 6, 'd830'), g('runner', 8, 0.45, 10, 'w57'), tell('Armoured ones on both roads!', g('armored', 3, 2.2, 6, 'w57')), g('armored', 2, 2.4, 8, 'd830')] } ] },
];
// Varje ingång dagen använder syns från början med sin väg och etiketten "From wave N" (main.js foretold)
for (const d of DAYS) {
  const first = new Set(d.waves[0].groups.map(q => q.spawn));
  d.foretell = [...new Set(d.waves.flatMap(wv => wv.groups.map(q => q.spawn)))].filter(id => !first.has(id));
}

export const vastraRondellPlay = {
  id: 'gnesta-vastra-rondell', name: 'Gnesta · Västra rondellen', version: VASTRA_RONDELL_PLAY_VERSION, world: 'osm', source: V.SOURCE,
  // Kampanjbågen: förtrupperna bröts vid rondellen; nästa är Västerkärv (dag 14), som inte är byggd. Kampanjen slutar här
  // tills den finns. Kroken: outro.next är banan som tar vid (src/data/maps.js har den inte än, så inget öppnar), och
  // outro.end är raden som säger att kampanjen fortsätter senare. När Västerkärv byggs: ta bort end och ge Västerkärv
  // unlock { map: 'gnesta-vastra-rondell', day: 1 }.
  outro: { text: 'The roundabout held. Their forward groups broke on väg 57. Next: Västerkärv. To be continued.',
    summary: 'Västra rondellen held. To be continued.', next: 'vasterkarv', end: 'To be continued.' },
  baseLabel: 'Barrstigen · Base',
  // ingångarnas skyltar där vägen kommer in i bild (main.js entryCells), inte i rondellen där vägarna går ihop
  entryAt: 1000,
  // kameran i söder, norr upp och väster till vänster (src/render/camera-eye.js setCameraYaw), som Björnlunda
  camera: { target: [-50, -20], view: 70, zoom: [22, 140], yaw: 0, pan: { x0: CRISP.x0 + 6, x1: CRISP.x1 - 6, z0: CRISP.z0 + 6, z1: CRISP.z1 - 6 }, intro: 4 },
  shadowBounds: { x0: CRISP.x0 - 6, x1: CRISP.x1 + 6, z0: CRISP.z0 - 6, z1: CRISP.z1 + 6 },
  roads: ROADS, joins: V.JOINS, streams: V.STREAMS, rail: null,
  ground: { ...GROUND, bounds: { x0: CRISP.x0 - 24, x1: CRISP.x1 + 24, z0: CRISP.z0 - 24, z1: CRISP.z1 + 24 }, ppm: 8 },
  buildings: V.BUILDINGS, parts: V.PARTS, streets: V.STREETS, gardens: GARDENS, props: V.PROPS, labels: V.LABELS, pois: V.POIS,
  surroundings: SURROUNDINGS, lots: LOTS, spawns: SPAWNS, base: BASE, exits: EXITS,
  // Basen: villans igenspikade dörr (render/models.js rinkEntranceModel), som ishallen, Wattrangsborg och Laxne skola
  iceRink: VILLA, baseModel: 'rink', hall: HOUSE,
  guns: 5, frontage: 10, baseHp: 20, days: DAYS,
  door: { gap: 3.2 },
  // vägarna in är korta men breda och raka: horden går lite fortare än i Mölnbo, långsammare än i Björnlunda (1,5)
  pace: 1.3,
  unlocks: ['block', 'm2', 'epa', 'inf', 'ksp58', 'ak5', 'psg90'],
  // Öppnar när Björnlunda dag 2 är vunnen (båda grenarna av Laxne-valet går genom Björnlunda)
  unlock: { map: 'bjornlunda', day: 2 },
};
// rutnätet och placeringen räknas när banan behöver dem (src/data/lazy.js)
lazy(vastraRondellPlay, 'grid', () => timed('vastra-rondell:rutnät', () => vastraRondellGrid()));
lazy(vastraRondellPlay, 'place', () => timed('vastra-rondell:placering', () => vastraRondellPlacement(vastraRondellPlay.grid)));
