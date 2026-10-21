// Sektor Laxne (0.24.0, H552): den valfria dagen mellan Mölnbo dag 10 och Björnlunda. Kartan är förhandsvisningens
// (src/data/laxne.js, GENERERAD ur OSM av scripts/osm-to-map.mjs; den filen redigeras inte för hand). Här ligger det som
// gör den spelbar: ingångarna, basen, rutnätet och placeringen, husen som går att besätta och dagen.
// Kampanjplanen avsnitt 10 och Olas beslut 2026-10-20 (docs/superpowers/specs/2026-10-18-kampanjplan.md): efter Mölnbo
// ber Laxne om hjälp. Spelaren väljer på bordet (src/data/choices.js): försvara byn en dag, eller släppa den till horden.
// Horden kommer norrifrån längs väg 223 (Laxnevägen från Mariefred) och Skottvångsvägen, i remsan mellan skogen och
// Klämmingen (sjön går inte att gå över). Utvägarna är 223 söderut förbi skolan och Hebyvägen; skolan är basen.
// Ingen Fjäderfabriken (Olas beslut): byggnaden är en lada och etiketten är borta. Kartan når inte längre norrut.
// Spelets meter: x öster, z söder (som de andra banorna). Kartdata © OpenStreetMap contributors (ODbL).
import * as L from './laxne.js';
import { osmGrid, distPolyline, inPoly } from './osm-map.js';
import { buildPlace, rect, inRect, distRect, KIND } from '../sim/placement.js';
import { timed } from '../meta/load-timing.js';
import { lazy } from './lazy.js';

export const LAXNE_PLAY_VERSION = '0.1.0';
const { GROUND } = L;
// Spelytan: mindre än förhandsvisningens (L.CRISP x -175..175, z -267,5..267,5). Norr om z -250 går Skottvångsvägen in i
// 223 (ingångarna ligger i diset där), i söder slutar den vid skolgården. Väster om x -140 och öster om x 112 är skog,
// sjö och åker som ingen går på.
export const CRISP = { x0: -140, x1: 112, z0: -250, z1: 252 };
export const SURROUNDINGS = { ...L.LAXNE_SURROUNDINGS, crisp: CRISP };
export const GRID_BOUNDS = L.GRID_BOUNDS;
const outside = (x, z) => Math.max(CRISP.x0 - x, x - CRISP.x1, CRISP.z0 - z, z - CRISP.z1);
const inCrisp = (x, z) => outside(x, z) <= 0;

// ---------- skolgården ----------
// Skolans framsida (entrén med skärmtaket) vetter österut mot cykelvägen från Invägen. Gården framför den är en
// grusplan: stigen går från cykelvägen längs framsidan och runt skolans södra gavel till Laxne skolväg, så att basen
// står vid en väg och horden når den både från Invägen och runt skolan från 223. OSM:s gångvägar på skolgården
// (footway-32, footway-33) och cykelvägens sista bit går genom skolans fotavtryck i kartan och är borttagna här.
export const PATHS = [
  { id: 'skolgarden', pts: [[-43.36, 185.59], [-41, 195], [-41, 238], [-48, 247], [-68, 246], [-69.05, 234.05]], from: 'cycleway-34', to: 'laxne-skolvag-28' },
].map(p => ({ ...p, name: null, path: true, cls: 'E', type: 'path', surface: 'gravel', width: 3.2, walk: true, smoothed: true, line: p.pts.map(q => [...q]) }));
const DROP = new Set(['footway-32', 'footway-33']);
const trimCycle = r => (r.id === 'cycleway-34' ? { ...r, pts: r.pts.filter(([, z]) => z <= 185.6), line: undefined } : r);
export const ROADS = [...L.ROADS.filter(r => !DROP.has(r.id)).map(trimCycle), ...PATHS];
const onPath = (x, z, pad) => PATHS.some(p => distPolyline(x, z, p.pts) < p.width / 2 + pad);
const segOnPath = ([ax, az, bx, bz]) => { for (let t = 0; t <= 1; t += 0.05) if (onPath(ax + (bx - ax) * t, az + (bz - az) * t, 0.6)) return true; return false; };
export const GARDENS = { ...L.GARDENS, hedges: L.GARDENS.hedges.filter(h => !segOnPath(h)), fences: L.GARDENS.fences.filter(f => !segOnPath(f)),
  trees: L.GARDENS.trees.filter(([x, z]) => !onPath(x, z, 0.8)), mailboxes: L.GARDENS.mailboxes.filter(([x, z]) => !onPath(x, z, 0.3)) };
// Olas beslut 2026-10-20: ingen Fjäderfabriken. Byggnaden står kvar som en lada, namnet är borta från kartan.
export const BUILDINGS = L.BUILDINGS.map(b => (b.kind === 'fjaderfabriken' ? { ...b, kind: 'barn', name: undefined } : b));
export const LABELS = L.LABELS.filter(l => !/Fjäderfabriken/.test(l.text));
export const POIS = L.POIS.filter(q => !/Fjäderfabriken/.test(q.name));

// ---------- ingångarna ----------
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
// Kampanjplanen: n väg 223 (Laxnevägen) från Mariefred, huvudvägen i remsan mellan skogen och sjön; nw Skottvångsvägen
// ur skogen, som mynnar i 223 vid hållplatserna. Båda samma dag.
export const SPAWNS = [
  { id: 'n', name: 'road 223 from Mariefred', day: 1, at: fogPoint('laxnevagen-2', [-88, -266]) },
  { id: 'nw', name: 'Skottvångsvägen', day: 1, at: fogPoint('skottvangsvagen-3', [-125, -266]) },
];

// ---------- basen: Laxne skola ----------
// Skolan är byns sista försvarspunkt (kampanjplanen). Basens ram som Wattrangsborg i Björnlunda: lokal +x ut genom
// framsidan mot gården (österut), dörrarna längs lokal z.
const SCHOOL_B = BUILDINGS.find(b => b.kind === 'laxneSchool');
export const SCHOOL = (() => {
  const ry = SCHOOL_B.ry - Math.PI / 2, len = SCHOOL_B.d, wid = SCHOOL_B.w, x = SCHOOL_B.x, z = SCHOOL_B.z;
  const at = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const face = len / 2;
  return { id: 'laxne-skola', x, z, ry, len, wid, wallH: 7.4, face, main: 0, doors: [-6.5, -1.8, 1.8, 6.5], at, entrance: at(face + 1.6, 0) };
})();
// Basrutan: gården framför entrén
export const BASE = { at: [-41, 212.6] };

// ---------- rutnätet ----------
export function laxneGrid() {
  return osmGrid({ id: 'laxne', roads: ROADS, sketch: { spawns: SPAWNS, base: BASE } }, GRID_BOUNDS);
}

// ---------- husen ----------
const STANDING = BUILDINGS.filter(b => !b.far && inCrisp(b.x, b.z));
const NO_GARRISON = new Set(['shed', 'barn', 'laxneSchool']);
// Prickskyttelägen: skolans och Laxnegårdens tak (de enda stora husen). Villorna har branta tak.
const PERCH = new Set(['laxneSchool', 'laxnegarden']);
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
    const perch = PERCH.has(h.kind) ? (x, z) => (inRect(body, x, z, -0.3) ? 1 : 0) : null;
    return { id: h.id, kind: h.kind, rects: [body], eave: h.eave ?? (h.h ?? 5) * 0.8, pad: h.kind === 'shed' ? 0.4 : HOUSE_PAD, height, perch, box: [h.x, h.z, Math.hypot(h.w, h.d) / 2 + HOUSE_PAD + 1] };
  });
}
export const SHAPES = buildingShapes();

// ---------- placeringen ----------
// Gator är gata, husen hus, sjön vatten (Klämmingen går inte att gå över eller ställa något i), bodarna och allt utanför
// den skarpa ytan hinder, tät skog skog. Häckarna och staketen i trädgårdarna är skydd för grupperna.
const CELL_SAMPLES = [[0, 0], [-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9], [0, -0.9], [0, 0.9], [-0.9, 0], [0.9, 0]];
const ROOF_SAMPLES = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 0.8, Math.sin(i * Math.PI / 4) * 0.8])];
const SHED_RECTS = GARDENS.sheds.map(([x, z, ry, w, d]) => rect(x, z, ry, w, d));
const HEDGES = [...GARDENS.hedges.map(([ax, az, bx, bz]) => [[ax, az], [bx, bz]]), ...GARDENS.fences.map(([ax, az, bx, bz]) => [[ax, az], [bx, bz]])];
export const inLake = (x, z) => GROUND.water.some(p => inPoly(x, z, p));
export function laxnePlacement(grid) {
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
      if (inLake(x, z)) return KIND.water;
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
// En dag (kampanjens dag 11 när spelaren valt att försvara byn). Horden norrifrån längs 223 och Skottvångsvägen, fyra
// vågor. De markerade husen går de gula linjerna till skolan (Hagstumosses evakuering, som Björnlunda dag 2). Vinst =
// vågorna hållna OCH minst need framme (evac.all).
const g = (type, count, interval, delay, spawn, lead = 0) => ({ type, count, interval, delay, spawn, ...(lead ? { lead } : {}) });
const say = (toast, wv) => ({ ...wv, toast });
const tell = (toast, grp) => ({ ...grp, toast });
const ALL = ['block', 'wire', 'civ', 'hv', 'm249', 'ksp58', 'ak5', 'psg90', 'epa', 'm2', 'inf'];
// Villan närmast punkten med dörren nära en gata (de civila går ut på gatan), och inte redan vald.
function homeNear(x, z, taken) {
  let best = null, bd = Infinity;
  for (const p of LOTS.plots) {
    const hh = p.house;
    if (hh.kind !== 'villa' || taken.has(hh.id)) continue;
    const fx = hh.x + Math.sin(hh.ry) * hh.d / 2, fz = hh.z + Math.cos(hh.ry) * hh.d / 2;
    if (!ROADS.some(r => r.walk !== false && !r.path && r.cls !== 'E' && distPolyline(fx, fz, r.line ?? r.pts) < r.width / 2 + 9)) continue;
    const d = Math.hypot(hh.x - x, hh.z - z);
    if (d < bd) { bd = d; best = hh; }
  }
  taken.add(best.id);
  return best.id;
}
// Husen som evakueras, i tur och ordning: först de närmast skolan (Laxne skolväg och Invägen), sedan längre ut längs 223
// och Invägen. Alla inom 100 m från skolan, så att den som håller skolan (ordern) täcker linjerna (Björnlunda 0.23.2).
export const EVAC_HOMES = (() => {
  const taken = new Set();
  return [[-107, 188], [-28, 149], [-106, 176], [-14, 144], [-79, 124], [-16, 120]].map(([x, z]) => homeNear(x, z, taken));
})();
export const DAYS = [
  // hp 7: balansen (docs/balance-log.md, Laxne 0.24.0); 8 som Björnlunda dag 1 fällde skolan för den vanliga spelaren
  { n: 1, supplies: 600, arsenal: ALL, startCash: 2200, hp: 7, overlap: 12, overlapMin: 0.3, bounty: 0.9,
    intro: { title: 'Day 1: Hold Laxne', text: 'Down road 223 from Mariefred, and Skottvångsvägen.' },
    order: { text: 'Hold Laxne skola. Get the marked houses in.' },
    objective: 'Get the marked houses to Laxne skola.',
    // skolan och vägarna dit från gaffeln, och husen som töms
    view: { pts: [SCHOOL.entrance, SCHOOL.at(-SCHOOL.len / 2, 0), [-92, 119], [19, 38]] },
    tail: { n: 8, after: 6, mul: 4 },
    evac: { need: 18, all: true,
      groups: [{ house: EVAC_HOMES[0], count: 4, at: 0, wave: 0 }, { house: EVAC_HOMES[1], count: 4, at: 6, wave: 0 },
        { house: EVAC_HOMES[2], count: 4, at: 0, wave: 1 }, { house: EVAC_HOMES[3], count: 4, at: 3, wave: 1 },
        { house: EVAC_HOMES[4], count: 4, at: 4, wave: 2 }, { house: EVAC_HOMES[5], count: 4, at: 10, wave: 2 }] },
    // Vägen är lång (remsan och byn, cirka 700 m): inga krypare (de skulle gå i fem minuter), och bjässarna i sista vågen
    // går först i den, så att dagen inte slutar med en minut av eftersläntrare.
    waves: [ say('Down road 223 from Mariefred.', { groups: [g('walker', 14, 0.6, 0, 'n', 20), g('walker', 8, 0.7, 4, 'nw', 20), g('runner', 4, 0.9, 8, 'n')] }),
             say('Skottvångsvägen, out of the forest!', { groups: [g('walker', 20, 0.5, 0, 'nw'), g('walker', 14, 0.6, 4, 'n'), g('runner', 6, 0.6, 10, 'nw')] }),
             { groups: [g('walker', 26, 0.45, 0, 'n'), g('walker', 18, 0.5, 4, 'nw'), tell('Brutes on road 223!', g('brute', 2, 3, 8, 'n')), g('runner', 6, 0.6, 12, 'nw')] },
             { groups: [g('brute', 2, 3, 0, 'n'), g('walker', 28, 0.4, 2, 'n'), g('walker', 24, 0.4, 4, 'nw'), g('runner', 12, 0.4, 8, 'n'), tell('Armoured ones on Skottvångsvägen!', g('armored', 3, 2.4, 6, 'nw'))] } ] },
];
for (const d of DAYS) {
  const first = new Set(d.waves[0].groups.map(q => q.spawn));
  d.foretell = [...new Set(d.waves.flatMap(wv => wv.groups.map(q => q.spawn)))].filter(id => !first.has(id));
}

export const laxnePlay = {
  id: 'laxne', name: 'Laxne · Laxne skola', version: LAXNE_PLAY_VERSION, world: 'osm', source: L.SOURCE,
  // kampanjbågen: Laxne höll och folket kom in i skolan; nästa är Björnlunda
  outro: { text: 'Laxne held. Its people are out, south past the school. Next: Björnlunda.' },
  evacPlace: 'reached Laxne skola',
  baseLabel: 'Laxne skola · Base',
  entryAt: 1000,
  // kameran i söder, norr upp: horden kommer uppifrån, skolan står längst ned (src/render/camera-eye.js setCameraYaw)
  camera: { target: [-30, 120], view: 70, zoom: [22, 150], yaw: 0, pan: { x0: CRISP.x0 + 6, x1: CRISP.x1 - 6, z0: CRISP.z0 + 6, z1: CRISP.z1 - 6 }, intro: 4 },
  shadowBounds: { x0: CRISP.x0 - 6, x1: CRISP.x1 + 6, z0: CRISP.z0 - 6, z1: CRISP.z1 + 6 },
  roads: ROADS, joins: L.JOINS, streams: L.STREAMS, rail: null,
  ground: { ...GROUND, bounds: { x0: CRISP.x0 - 24, x1: CRISP.x1 + 24, z0: CRISP.z0 - 24, z1: CRISP.z1 + 24 }, ppm: 8 },
  buildings: BUILDINGS, parts: L.PARTS, streets: L.STREETS, gardens: GARDENS, props: L.PROPS, labels: LABELS, pois: POIS,
  surroundings: SURROUNDINGS, lots: LOTS, spawns: SPAWNS, base: BASE,
  // Basen: skolans igenspikade dörrar (render/models.js rinkEntranceModel), som ishallen och Wattrangsborg
  iceRink: SCHOOL, baseModel: 'rink', hall: SCHOOL_B,
  guns: 5, frontage: 10, baseHp: 20, days: DAYS,
  door: { gap: 3.2 },
  // vägen in är lång (remsan längs sjön och sedan genom byn, cirka 700 m mot Björnlundas 340 till 440): horden går
  // fortare än i Björnlunda (1,5), så att dagen håller sig kring sju minuter
  pace: 2.2,
  unlocks: ['block', 'm2', 'epa', 'inf', 'ksp58', 'ak5', 'psg90'],
  // Öppnar när Mölnbo dag 3 är vunnen OCH spelaren valt att försvara byn (src/data/choices.js, src/meta/progress.js
  // mapUnlocked). Släpps byn spelas den aldrig.
  unlock: { map: 'molnbo', day: 3, choice: ['laxne', 'defend'] },
};
lazy(laxnePlay, 'grid', () => timed('laxne:rutnät', () => laxneGrid()));
lazy(laxnePlay, 'place', () => timed('laxne:placering', () => laxnePlacement(laxnePlay.grid)));
