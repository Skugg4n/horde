// Sektor Björnlunda (0.23.0, H545): kampanjens dag 11 och 12. Kartan är förhandsvisningens (src/data/bjornlunda.js,
// GENERERAD ur OSM av scripts/osm-to-map.mjs; den filen redigeras inte för hand). Här ligger det som gör den spelbar:
// ingångarna, basen, rutnätet och placeringen, husen som går att besätta, gångvägarna för omvägar och de två dagarna.
// Kampanjbågen: docs/superpowers/specs/2026-10-18-kampanjplan.md avsnitt 10 ("Dag 1 försvar från väst. Dag 2
// evakuering och försvar från väst och syd"). Före: Mölnbo dag 3, uttåget mot Gnesta. Efter: Gnesta västra rondell.
//
// Basen är Wattrangsborg, bygdegården vid väg 57/223 i byns sydöstra hörn. Skälen (kampanjplanen och beskrivning.md):
//   - Den ligger på ÖSTRA sidan, där väg 57 går vidare mot Gnesta. Horden från väster måste genom hela byn (eller
//     längs förbifarten) för att nå den, och det är dit man drar sig när byn töms.
//   - Kyrkan ligger 800 m nordväst om byn, utanför kartan och på fel sida (mot horden). Gamla stationen ligger i
//     väster vid spåret, också mot horden. ICA ligger mitt i byn vid plankorsningen, där horden söderifrån kommer
//     in dag 2: en bas där vore överkörd från början.
//   - Bygdegården är en samlingslokal med asfaltplan framför (en plats att samla folk på), och gatorna dit
//     (Stationsvägen, Villavägen, förbifarten) är raka och öppna: eldgator.
// Spelets meter: x öster, z söder (som de andra banorna). Kartdata © OpenStreetMap contributors (ODbL).
import * as B from './bjornlunda.js';
import { osmGrid, distPolyline, inPoly } from './osm-map.js';
import { buildPlace, rect, inRect, distRect, KIND } from '../sim/placement.js';
import { timed } from '../meta/load-timing.js';
import { lazy } from './lazy.js';

export const BJORNLUNDA_PLAY_VERSION = '0.1.0';
const { GROUND, RAIL } = B;
// 0.23.1 (speltestet av 0.23.0: en halv minut promenad före första skottet, dagen åtta minuter): spelytan är mindre än
// förhandsvisningens (B.CRISP x -140..140, z -169..169). Norra villorna vid Humlevägen och Korsbacksvägen och västligaste
// gårdarna ligger i diset, så att ingångarna ligger närmare byn.
export const CRISP = { x0: -112, x1: 140, z0: -112, z1: 160 };
export const SURROUNDINGS = { ...B.BJORNLUNDA_SURROUNDINGS, crisp: CRISP };
export const GRID_BOUNDS = B.GRID_BOUNDS;
const outside = (x, z) => Math.max(CRISP.x0 - x, x - CRISP.x1, CRISP.z0 - z, z - CRISP.z1);
const inCrisp = (x, z) => outside(x, z) <= 0;

// ---------- gångvägarna (H545: vägar för omvägar, som Mölnbo fick i 0.21.3) ----------
// Upptrampade stigar i grus mellan trädgårdarna, smalare än gatorna. Horden går på dem och flödet känner dem, så att en
// spärrad gata ger en omväg i stället för en vägg. Lagda där det är fritt mellan husen och bodarna (sökta ur kartan,
// provade i tests/bjornlunda.test.js), från gata till gata:
//   stigNorr  Stationsvägen till Smedjevägen i norr (runt korsningen vid Lokalvägen)
//   stigMitt  Smedjevägen till Villavägen norr om Gästgivarevägen
//   stigSyd   Smedjevägen vid ICA till Villavägen söder om Gästgivarevägen (runt en spärrad Villavägen mot basen)
export const PATHS = [
  { id: 'stigNorr', pts: [[-78.7, -93.2], [-43, -85.4]], from: 'stationsvagen-0', to: 'smedjevagen-15' },
  { id: 'stigMitt', pts: [[-33.2, -51.9], [3.6, -68.1]], from: 'smedjevagen-15', to: 'villavagen-5' },
  { id: 'stigSyd', pts: [[12.4, 66.2], [53, 44.8]], from: 'smedjevagen-15', to: 'villavagen-5' },
].map(p => ({ ...p, name: null, path: true, cls: 'E', type: 'path', surface: 'gravel', width: 2.2, walk: true, smoothed: true, line: p.pts.map(q => [...q]) }));
export const ROADS = [...B.ROADS, ...PATHS];
// Trädgårdarna utan det som skulle stå på stigarna (häckar, staket, träd och brevlådor)
const onPath = (x, z, pad) => PATHS.some(p => distPolyline(x, z, p.pts) < p.width / 2 + pad);
const segOnPath = ([ax, az, bx, bz]) => { for (let t = 0; t <= 1; t += 0.05) if (onPath(ax + (bx - ax) * t, az + (bz - az) * t, 0.6)) return true; return false; };
export const GARDENS = { ...B.GARDENS, hedges: B.GARDENS.hedges.filter(h => !segOnPath(h)), fences: B.GARDENS.fences.filter(f => !segOnPath(f)),
  trees: B.GARDENS.trees.filter(([x, z]) => !onPath(x, z, 0.8)), mailboxes: B.GARDENS.mailboxes.filter(([x, z]) => !onPath(x, z, 0.3)) };

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
// Kampanjbågen: horden kommer västerifrån (Mölnbo är förlorat, de går runt Gnesta). W1 väg 57/223 från Stjärnhov i
// nordväst (förbifarten), W2 längs spåret västerifrån (vägen förbi gamla stationen), W3 Lokalvägen västerifrån (rakt
// in i villorna; 0.23.1, förut Korsbacksvägen, som nu ligger i diset). Dag 2 också söderifrån: S1 Ekvägen ur skogen söder om spåret och S2 Ängsvägen från
// Hembygdsgården i sydväst; båda kommer över plankorsningen vid Ekvägen, den enda vägen över spåret i byn.
export const SPAWNS = [
  { id: 'w1', name: 'Väg 57/223 from Stjärnhov', day: 1, at: fogPoint('vag-57-223-28', [0, -128]) },
  { id: 'w2', name: 'Along the tracks', day: 1, at: fogPoint('service-60', [-128, 38]) },
  { id: 'w3', name: 'Lokalvägen', day: 1, at: fogPoint('lokalvagen-10', [-128, -100]) },
  { id: 's1', name: 'Ekvägen south', day: 2, at: fogPoint('ekvagen-2', [-123, 176]) },
  { id: 's2', name: 'Ängsvägen', day: 2, at: fogPoint('angsvagen-29', [-128, 140]) },
];

// ---------- basen: Wattrangsborg ----------
// Flygeln (den låga delen med asfaltplanen framför) är entrén. I basens ram (som Folkets hus i Mölnbo och ishallen):
// lokal +x ut genom fasaden mot planen, dörrarna längs lokal z. Flygelns framsida (lokal +z i byggnadens ram) vetter
// söderut mot planen och Stationsvägen.
const WING = B.BUILDINGS.find(b => b.kind === 'wattWing'), HALL = B.BUILDINGS.find(b => b.kind === 'wattHall');
export const WATT = (() => {
  const ry = WING.ry - Math.PI / 2, len = WING.d, wid = WING.w, x = WING.x, z = WING.z;
  const at = (lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const face = len / 2;
  return { id: 'wattrangsborg', x, z, ry, len, wid, wallH: 4.2, face, main: 0, doors: [-6.5, -1.8, 1.8, 6.5], at, entrance: at(face + 1.6, 0) };
})();
// Basrutan: där planen framför flygeln möter vägen (service-22:s ände)
export const BASE = { at: [83.4, 122.9] };

// ---------- rutnätet ----------
// 2 m-rutor, samma regler som de andra OSM-kartorna (src/data/osm-map.js osmGrid): gångbart där en väg ligger.
// Järnvägen är stängd utom vid plankorsningen (Ekvägen går över).
export function bjornlundaGrid() {
  return osmGrid({ id: 'bjornlunda', roads: ROADS, sketch: { spawns: SPAWNS, base: BASE } }, GRID_BOUNDS);
}

// ---------- husen ----------
// Allt som står på den skarpa ytan (inte i diset). Bodar och ladugårdar går inte att besätta; bygdegården är basen.
const STANDING = B.BUILDINGS.filter(b => !b.far && inCrisp(b.x, b.z));
const NO_GARRISON = new Set(['shed', 'barn', 'wattWing', 'wattHall']);
// Prickskyttelägen: platta eller låga tak på de stora husen (gula trevåningshuset, ICA, radhusen, sparbanken,
// affärshusen). Villorna har branta tak.
const PERCH = new Set(['yellowBlock', 'ica', 'row', 'sparbank', 'commercial']);
export const LOTS = { plots: STANDING.filter(b => !NO_GARRISON.has(b.kind)).map(b => ({ id: b.id, house: b, extras: [] })), edges: [], blocks: [] };
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
    const perch = PERCH.has(h.kind) ? (x, z) => (inRect(body, x, z, -0.3) ? 1 : 0) : null;
    return { id: h.id, kind: h.kind, rects: [body], eave: h.eave ?? (h.h ?? 5) * 0.8, pad: h.kind === 'shed' ? 0.4 : HOUSE_PAD, height, perch, box: [h.x, h.z, Math.hypot(h.w, h.d) / 2 + HOUSE_PAD + 1] };
  });
}
export const SHAPES = buildingShapes();

// ---------- placeringen ----------
// Gator är gata. Husen (med en meters marginal) är hus och skymmer efter sin höjd. Järnvägen (spåren och staketen) är
// hinder, liksom bodarna i trädgårdarna och allt utanför den skarpa ytan. Tät skog är skog. Häckarna och staketen i
// trädgårdarna är skydd för grupperna (hedge).
const CELL_SAMPLES = [[0, 0], [-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9], [0, -0.9], [0, 0.9], [-0.9, 0], [0.9, 0]];
const ROOF_SAMPLES = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 0.8, Math.sin(i * Math.PI / 4) * 0.8])];
const SHED_RECTS = GARDENS.sheds.map(([x, z, ry, w, d]) => rect(x, z, ry, w, d));
const HEDGES = [...GARDENS.hedges.map(([ax, az, bx, bz]) => [[ax, az], [bx, bz]]), ...GARDENS.fences.map(([ax, az, bx, bz]) => [[ax, az], [bx, bz]])];
export function bjornlundaPlacement(grid) {
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
      if (here.some(b => b.rects.some(r => inRect(r, x, z)))) return KIND.house;
      if (here.some(b => b.rects.some(r => inRect(r, x, z, b.pad)))) return KIND.house;
      if (distPolyline(x, z, RAIL.pts) < RAIL.half) return KIND.thing;
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
  // Skydd för grupperna: häckarna och staketen i trädgårdarna, och järnvägens staket (häck)
  const hedge = new Uint8Array(n), brick = new Uint8Array(n), ditch = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    if (place.kind[k] !== KIND.open || place.walk[k]) continue;
    const [x, z] = ctr(k);
    if (HEDGES.some(s => distPolyline(x, z, s) < 1.3)) hedge[k] = 1;
    else if (Math.abs(distPolyline(x, z, RAIL.pts) - RAIL.half) < 1.3) hedge[k] = 1;
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

// ---------- dagarna ----------
// Dag 1 (kampanjens dag 11)  Försvar från väst: väg 57/223 från Stjärnhov, längs spåret och Korsbacksvägen. Fyra vågor.
// Dag 2 (kampanjens dag 12)  Evakuering och försvar från väst och syd: de markerade husen går de gula linjerna till
//                            Wattrangsborg (Hagstumosses evakuering), horden västerifrån och över plankorsningen
//                            söderifrån, större. Vinst = vågorna hållna OCH minst need framme (evac.all, som Mölnbo dag 1).
// Truppen är det som kom ut ur Mölnbo; ledningen har inget nytt att skicka (src/data/depot.js bl-1).
// Balansen: docs/balance-log.md, Björnlunda 0.23.0.
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
    if (!ROADS.some(r => r.walk !== false && !r.path && distPolyline(fx, fz, r.line ?? r.pts) < r.width / 2 + 9)) continue;
    const d = Math.hypot(hh.x - x, hh.z - z);
    if (d < bd) { bd = d; best = hh; }
  }
  taken.add(best.id);
  return best.id;
}
// Dag 2: husen som evakueras, i tur och ordning. Som Mölnbo 0.20.1: först de närmast basen (Stationsvägen vid ICA och
// Smedjevägen), sedan längre ut, sist de i väster och söder om spåret där horden kommer in, när spelaren har ställt sig.
export const EVAC_HOMES = (() => {
  const taken = new Set();
  return [[10, 70], [-12, 30], [-40, 20], [-60, -20], [-100, 100], [-70, 5]].map(([x, z]) => homeNear(x, z, taken));
})();
// 0.23.1 (speltestet av 0.23.0): introna säger gatorna (inte väderstreck), ordern säger var man ska stå (vid
// Wattrangsborg, där Stationsvägen och Villavägen möts; en spelare som ställer allt inom 40 m från basen ska klara dag 1,
// scripts/balance.mjs blNear), bjässarna kommer mitt i sista vågen och inte sist ensamma, mindre förnödenheter per dödad
// (bounty), och dag 2:s grupp söderifrån kommer efter att de civila i andra vågen gått förbi plankorsningen.
export const DAYS = [
  { n: 1, supplies: 600, arsenal: ALL, startCash: 2200, hp: 8, overlap: 12, overlapMin: 0.3, bounty: 0.9,
    intro: { title: 'Day 1: From the west', text: 'Down väg 57/223 from Stjärnhov, along the tracks and Lokalvägen.' },
    order: { text: 'Stand at Wattrangsborg where Stationsvägen and Villavägen meet. Face both.' },
    objective: 'Hold the crossing in front of Wattrangsborg.',
    // basen (med plats under den för köpraden) och Stationsvägen förbi ICA (dit vägen längs spåret kommer) i bild
    view: { pts: [WATT.entrance, [WATT.x + 12, WATT.z + 30], [-25, 62], [60, 40]] },
    tail: { n: 8, after: 6, mul: 4 },
    waves: [ say('From Stjärnhov, down väg 57/223.', { groups: [g('walker', 12, 0.7, 0, 'w1', 14), g('walker', 8, 0.7, 0, 'w2', 14), g('runner', 4, 0.9, 8, 'w1')] }),
             say('Along the tracks!', { groups: [g('walker', 22, 0.5, 0, 'w2'), g('walker', 12, 0.6, 4, 'w1'), g('runner', 6, 0.6, 10, 'w2')] }),
             { groups: [g('walker', 26, 0.45, 0, 'w1'), g('walker', 18, 0.5, 4, 'w2'), tell('Into the houses from Lokalvägen!', g('walker', 14, 0.6, 6, 'w3')), tell('Brutes on väg 57/223!', g('brute', 2, 3, 8, 'w1'))] },
             { groups: [g('walker', 28, 0.4, 0, 'w3'), g('walker', 24, 0.4, 2, 'w2'), g('runner', 14, 0.4, 8, 'w1'), tell('Armoured ones along the tracks!', g('armored', 3, 2.4, 6, 'w2')), g('brute', 2, 3, 4, 'w3')] } ] },
  { n: 2, supplies: 600, arsenal: ALL, startCash: 2200, hp: 6, overlap: 12, overlapMin: 0.3, bounty: 1,
    intro: { title: 'Day 2: Get them out', text: 'Väg 57/223 and the tracks again, and Ekvägen over the level crossing.' },
    order: { text: 'Cover the yellow lines to Wattrangsborg. Ekvägen comes over the crossing.' },
    objective: 'Get the marked houses to Wattrangsborg.',
    // basen, Stationsvägen och plankorsningen (där horden söderifrån kommer in) i bild
    // 0.23.1 (speltestet av 0.23.0: plankorsningen och vägarna söderifrån syntes inte före vågen): också södra sidan
    view: { pts: [WATT.entrance, [WATT.x + 12, WATT.z + 30], [-100, 55], [-100, 140]] },
    tail: { n: 8, after: 6, mul: 4 },
    // all: dagen vinns först när vågorna är hållna OCH de civila är framme (src/sim/sim.js checkEvac)
    // 0.23.1: andra vågens hus går direkt när vågen börjar (förut 4 och 14 s), och gruppen söderifrån kommer 20 s senare
    evac: { need: 18, all: true,
      groups: [{ house: EVAC_HOMES[0], count: 4, at: 0, wave: 0 }, { house: EVAC_HOMES[1], count: 4, at: 6, wave: 0 },
        { house: EVAC_HOMES[2], count: 4, at: 0, wave: 1 }, { house: EVAC_HOMES[3], count: 4, at: 3, wave: 1 },
        { house: EVAC_HOMES[4], count: 4, at: 4, wave: 2 }, { house: EVAC_HOMES[5], count: 4, at: 12, wave: 2 }] },
    waves: [ say('West again, down väg 57/223.', { groups: [g('walker', 16, 0.6, 0, 'w1', 14), g('runner', 6, 0.8, 6, 'w2', 14)] }),
             say('From the south, over the level crossing!', { groups: [g('walker', 16, 0.5, 0, 'w2'), g('walker', 26, 0.45, 20, 's1'), g('walker', 18, 0.5, 24, 's2'), g('runner', 8, 0.5, 30, 's1')] }),
             { groups: [g('walker', 30, 0.4, 0, 'w1'), g('walker', 24, 0.4, 2, 's2'), tell('Armoured ones at the crossing!', g('armored', 3, 2.4, 8, 's1')), g('crawler', 6, 1.0, 6, 's1'), g('brute', 2, 3, 6, 'w2')] },
             { groups: [g('walker', 30, 0.34, 0, 's1'), g('walker', 26, 0.36, 4, 'w2'), tell('Runners down Lokalvägen!', g('runner', 14, 0.4, 6, 'w3')), tell('Brutes from Ängsvägen!', g('brute', 4, 2.5, 4, 's2')), g('armored', 4, 2, 8, 'w2')] } ] },
];
// Varje ingång dagen använder syns från början med sin väg och etiketten "From wave N" (main.js foretold)
for (const d of DAYS) {
  const first = new Set(d.waves[0].groups.map(q => q.spawn));
  d.foretell = [...new Set(d.waves.flatMap(wv => wv.groups.map(q => q.spawn)))].filter(id => !first.has(id));
}

export const bjornlundaPlay = {
  id: 'bjornlunda', name: 'Björnlunda · Wattrangsborg', version: BJORNLUNDA_PLAY_VERSION, world: 'osm', source: B.SOURCE,
  // kampanjbågen: Björnlunda håller och folket kom ut; nästa är Gnesta västra rondell (dag 13, inte byggd än)
  outro: { text: 'Björnlunda held, and its people got out. Next: the western roundabout in Gnesta.' },
  // dag 2:s civila är i säkerhet när de når bygdegården (resultatet och raderna i main.js)
  evacPlace: 'reached Wattrangsborg',
  baseLabel: 'Wattrangsborg · Base',
  // 0.23.1: ingångarnas skyltar där vägen kommer in i bild, inte på Stationsvägen där vägarna går ihop (main.js entryCells)
  entryAt: 1000,
  // 0.23.1 (speltestet av 0.23.0: "from the west" kom uppifrån höger): kameran i söder, norr upp och väster till vänster
  // (src/render/camera-eye.js setCameraYaw)
  camera: { target: [40, 80], view: 60, zoom: [22, 110], yaw: 0, pan: { x0: CRISP.x0 + 6, x1: CRISP.x1 - 6, z0: CRISP.z0 + 6, z1: CRISP.z1 - 6 }, intro: 4 },
  shadowBounds: { x0: CRISP.x0 - 6, x1: CRISP.x1 + 6, z0: CRISP.z0 - 6, z1: CRISP.z1 + 6 },
  roads: ROADS, joins: B.JOINS, streams: B.STREAMS, rail: RAIL,
  ground: { ...GROUND, bounds: { x0: CRISP.x0 - 24, x1: CRISP.x1 + 24, z0: CRISP.z0 - 24, z1: CRISP.z1 + 24 }, ppm: 8 },
  buildings: B.BUILDINGS, parts: B.PARTS, streets: B.STREETS, gardens: GARDENS, props: B.PROPS, labels: B.LABELS, pois: B.POIS,
  surroundings: SURROUNDINGS, lots: LOTS, spawns: SPAWNS, base: BASE,
  // Basen: Wattrangsborgs igenspikade dörrar (render/models.js rinkEntranceModel), som ishallen och Folkets hus
  iceRink: WATT, baseModel: 'rink', hall: HALL,
  guns: 5, frontage: 10, baseHp: 20, days: DAYS,
  door: { gap: 3.2 },
  // vägarna in är långa (byn är stor): horden går fortare än i Mölnbo
  pace: 1.5,
  unlocks: ['block', 'm2', 'epa', 'inf', 'ksp58', 'ak5', 'psg90'],
  // Öppnar när Mölnbo dag 3 (uttåget) är vunnen.
  // Laxne-valet (kampanjplanen, beslut 2026-10-20: "erbjuds mellan Mölnbo dag 10 och Björnlunda dag 11") är INTE byggt.
  // Kroken: valet läggs mellan den här grinden och leveransen bl-1 (src/data/depot.js). Släpps byn blir första vågen
  // dag 1 större (horden närmare); försvaras den spelas Laxne före Björnlunda och unlock pekar dit.
  unlock: { map: 'molnbo', day: 3 },
};
// rutnätet och placeringen räknas när banan behöver dem (src/data/lazy.js)
lazy(bjornlundaPlay, 'grid', () => timed('bjornlunda:rutnät', () => bjornlundaGrid()));
lazy(bjornlundaPlay, 'place', () => timed('bjornlunda:placering', () => bjornlundaPlacement(bjornlundaPlay.grid)));
