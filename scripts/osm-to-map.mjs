// OSM-plan till spelkarta: läser en plan.json från ~/Projects/horde-refs/<plats>/ (byggd av tools/geojson_to_plan.py,
// lokala meter, x öster, y norr) och en inställningsfil i scripts/osm-places/<plats>.mjs, och skriver en kartmodul
// i src/data/ (ren data, ingen three.js, testbar i node). Samma modul ritas av src/render/osm-world.js.
//
//   node scripts/osm-to-map.mjs bjornlunda            (refs i ../horde-refs eller $HORDE_REFS)
//
// Steg: utsnitt och skala, vägarna förenklade (Douglas-Peucker) med spelets bredder, byggnaderna som minsta
// omskrivna rektangel med typ, rotation (framsidan mot närmaste gata) och höjd, krockar med gator, spår och
// grannar löses genom att flytta, krympa eller stryka, trädgårdarna (häckar, staket, fruktträd, bodar,
// brevlådor), mark (åker, skog, gräs, asfalt, grus), järnvägen som mittlinje, omgivningen i diset (allt i
// planen utanför utsnittet) och skisserna (ingångar, bas, försvarslägen) ur inställningarna.
//
// Kartdata © OpenStreetMap contributors (ODbL). Den skrivna modulen säger det också.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REFS = process.env.HORDE_REFS ?? join(ROOT, '..', 'horde-refs');

// ---------- små verktyg ----------
const r2 = v => Math.round(v * 100) / 100;
const P2 = p => [r2(p[0]), r2(p[1])];
function rng(seed) {
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (a0, a1) => a0 + r() * (a1 - a0);
  r.pick = arr => arr[(r() * arr.length) | 0];
  r.weighted = arr => { const tot = arr.reduce((s, [, w]) => s + w, 0); let x = r() * tot; for (const [v, w] of arr) { if ((x -= w) <= 0) return v; } return arr[0][0]; };
  return r;
}
const slug = s => String(s).toLowerCase().replace(/å|ä/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function nearestOnSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + dx * t, z = az + dz * t;
  return { d: Math.hypot(px - x, pz - z), x, z };
}
function nearestOn(px, pz, pts) {
  let best = { d: Infinity, x: 0, z: 0, i: 0 };
  for (let i = 1; i < pts.length; i++) { const q = nearestOnSeg(px, pz, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); if (q.d < best.d) best = { ...q, i }; }
  return best;
}
function inPoly(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > pz) !== (zj > pz) && px < (xj - xi) * (pz - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function polyArea(p) { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return Math.abs(a / 2); }
// Douglas-Peucker
function simplify(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = nearestOnSeg(pts[i][0], pts[i][1], pts[a][0], pts[a][1], pts[b][0], pts[b][1]).d; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function hull(points) {
  const p = points.map(q => [...q]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// Minsta omskrivna rektangel (roterande kalipers över hullet): mitt, axel u (enhet), utsträckning längs u och v.
function minRect(points) {
  const h = hull(points);
  let best = null;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, vx = -uy, vy = ux;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const q of h) { const u = q[0] * ux + q[1] * uy, v = q[0] * vx + q[1] * vy; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) best = { area, ux, uy, eu: u1 - u0, ev: v1 - v0, cx: ((u0 + u1) / 2) * ux + ((v0 + v1) / 2) * vx, cy: ((u0 + u1) / 2) * uy + ((v0 + v1) / 2) * vy };
  }
  return best;
}
// Rektangel i spelet: { x, z, ry, w, d }. Lokal +x = (cos ry, -sin ry), lokal +z = (sin ry, cos ry).
const corners = (h, pad = 0) => {
  const c = Math.cos(h.ry), s = Math.sin(h.ry), hw = h.w / 2 + pad, hd = h.d / 2 + pad;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([lx, lz]) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c]);
};
const samples = (h, pad = 0) => {
  const C = corners(h, pad), out = [...C];
  for (let i = 0; i < 4; i++) { const a = C[i], b = C[(i + 1) % 4]; for (const t of [0.25, 0.5, 0.75]) out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  return out;
};
function rectHit(p, q, pad = 0) {
  const P = corners(p, pad / 2), Q = corners(q, pad / 2);
  const axes = [p.ry, q.ry].flatMap(ry => [[Math.cos(ry), -Math.sin(ry)], [Math.sin(ry), Math.cos(ry)]]);
  return axes.every(([ax, az]) => {
    const pp = P.map(([x, z]) => x * ax + z * az), qq = Q.map(([x, z]) => x * ax + z * az);
    return Math.max(...pp) > Math.min(...qq) && Math.max(...qq) > Math.min(...pp);
  });
}
const inRectPt = (h, x, z, pad = 0) => { const dx = x - h.x, dz = z - h.z, c = Math.cos(h.ry), s = Math.sin(h.ry); return Math.abs(dx * c - dz * s) <= h.w / 2 + pad && Math.abs(dx * s + dz * c) <= h.d / 2 + pad; };

// ---------- mjuka vägar ----------
// Glesa ut (punkter närmare än minSeg m stryks, ändarna står kvar) och runda med Chaikin: varje hörn skärs till två
// punkter på 1/4 och 3/4, iter gånger. Ingen överslängd som Catmull-Rom, inga sågtänder från tätt liggande OSM-noder.
function thin(pts, minSeg) {
  if (pts.length < 3) return pts.map(p => [...p]);
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) { const l = out[out.length - 1]; if (Math.hypot(pts[i][0] - l[0], pts[i][1] - l[1]) >= minSeg) out.push(pts[i]); }
  const last = pts[pts.length - 1];
  if (out.length > 1 && Math.hypot(last[0] - out[out.length - 1][0], last[1] - out[out.length - 1][1]) < minSeg * 0.5) out.pop();
  out.push(last);
  return out.map(p => [...p]);
}
export function chaikin(pts, iter = 3) {
  let p = pts;
  for (let k = 0; k < iter && p.length > 2; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i], [bx, bz] = p[i + 1];
      if (i > 0) q.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25]);
      if (i < p.length - 2) q.push([ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}
// Hur hårt varje klass rundas: Douglas-Peucker-tolerans, minsta segment och Chaikin-varv.
const SMOOTH = { A: [1.4, 9, 4], B: [1.0, 7, 4], C: [0.6, 4, 3], D: [0.35, 2.5, 2], E: [0.35, 2, 2] };
// Kedja ihop vägbitar med samma namn/nummer och klass som möts i en ände: en riksväg blir en linje utan skarvar.
function chainRoads(list) {
  const key = r => `${r.cls}|${r.ref ?? ''}|${r.name ?? ''}|${r.surface}|${r.bridge ? 1 : 0}`;
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.5;
  const out = [], used = new Set();
  for (const r of list) {
    if (used.has(r)) continue;
    used.add(r);
    if (!r.name && !r.ref) { out.push(r); continue; }
    let pts = r.pts.map(p => [...p]), grew = true;
    while (grew) {
      grew = false;
      for (const o of list) {
        if (used.has(o) || key(o) !== key(r)) continue;
        const a = o.pts, f = pts[0], l = pts[pts.length - 1];
        // bara rena ändmöten där ingen tredje bit av samma väg går ut (annars blir det en gren, inte en fortsättning)
        if (near(a[0], l)) pts = pts.concat(a.slice(1));
        else if (near(a[a.length - 1], l)) pts = pts.concat(a.slice(0, -1).reverse());
        else if (near(a[a.length - 1], f)) pts = a.slice(0, -1).concat(pts);
        else if (near(a[0], f)) pts = a.slice(1).reverse().concat(pts);
        else continue;
        used.add(o); grew = true; break;
      }
    }
    out.push({ ...r, pts });
  }
  return out;
}
const lineLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };

// ---------- vägarnas klasser i spelet ----------
// Bredd i spelets meter (inte skalad: gatorna ska rymma horden), yta och om den är gångbar.
const CLASS = {
  A: { width: 8, surface: 'asphalt', center: true },
  B: { width: 6.5, surface: 'asphalt', center: true },
  C: { width: 5, surface: 'asphalt' },
  D: { width: 3.6, surface: 'asphalt' },
  E: { width: 2.2, surface: 'gravel' },
};
const SKIP_ROADS = new Set(['platform', 'steps', 'construction', 'proposed']);

export function convert(plan, cfg) {
  // cfg.extraBuildings: hus som OSM saknar (läge och storlek avlästa ur en referensbild, aldrig bilden själv), i
  // plan.json-meter; de får added: true i modulen så att det syns vilka som inte kommer från OSM.
  // cfg.roadNames: namn på namnlösa OSM-vägar (närmast punkten), t.ex. ur en hållplats med vägens namn.
  if (cfg.extraBuildings?.length || cfg.roadNames?.length) {
    const roadsN = plan.roads.map(rd => ({ ...rd }));
    for (const { at, name } of cfg.roadNames ?? []) {
      let best = null;
      for (const rd of roadsN) if (!rd.name) { const q = nearestOn(at[0], at[1], rd.pts); if (!best || q.d < best.d) best = { d: q.d, rd }; }
      if (best && best.d < 30) best.rd.name = name;
    }
    const extra = (cfg.extraBuildings ?? []).map(e => ({ id: e.id, type: e.type ?? 'yes', name: null, h: e.h ?? 6.5, h_source: 'added', levels: null, area_m2: Math.round(polyArea(e.pts)), pts: [...e.pts, e.pts[0]], added: true }));
    plan = { ...plan, roads: roadsN, buildings: [...plan.buildings, ...extra] };
  }
  const S = cfg.scale, BS = cfg.buildingScale, crop = cfg.crop;
  const cx = (crop.x0 + crop.x1) / 2, cy = (crop.y0 + crop.y1) / 2;
  const T = ([x, y]) => [(x - cx) * S, -(y - cy) * S];
  const TP = pts => pts.map(T);
  const CRISP = { x0: r2((crop.x0 - cx) * S), x1: r2((crop.x1 - cx) * S), z0: r2(-(crop.y1 - cy) * S), z1: r2(-(crop.y0 - cy) * S) };
  const outside = (x, z) => Math.max(CRISP.x0 - x, x - CRISP.x1, CRISP.z0 - z, z - CRISP.z1);
  const outD = (x, z) => Math.hypot(Math.max(CRISP.x0 - x, 0, x - CRISP.x1), Math.max(CRISP.z0 - z, 0, z - CRISP.z1));
  const he = plan.meta.half_extent_m;
  const PLAN = { x0: r2(T([-he[0], 0])[0]), x1: r2(T([he[0], 0])[0]), z0: r2(T([0, he[1]])[1]), z1: r2(T([0, -he[1]])[1]) };
  const r = rng(cfg.seed ?? 1);
  const report = { dropped: [], moved: 0, shrunk: 0 };

  // ---------- landsbygdskanten ----------
  // cfg.rural: områden (plan.json-meter) där byn tar slut och åkrarna tar vid. Där: grusvägar i två tydliga
  // bredder, inga gångstigar, inga stumpar, inga lösa hus ute på åkern, och marken målas som åker.
  const ruralPolys = (cfg.rural ?? []).map(z => TP(z.poly));
  const rural = (x, z) => ruralPolys.some(p => inPoly(x, z, p));
  // husens mittpunkter i spelets meter (före placeringen), för stumpvägarna
  const rawHouses = plan.buildings.map(b => { const R = minRect(b.pts.slice(0, -1)); return T([R.cx, R.cy]); });

  // ---------- vägarna ----------
  let roads = [];
  plan.roads.forEach((rd, i) => {
    if (SKIP_ROADS.has(rd.type) || rd.tunnel) return;
    const k = CLASS[rd.cls] ?? CLASS.C;
    const pts = simplify(TP(rd.pts), 0.35);
    if (pts.length < 2) return;
    const name = rd.name ?? (rd.ref ? `Väg ${rd.ref.replace(';', '/')}` : null);
    let surface = rd.surface === 'gravel' || rd.surface === 'unpaved' || rd.surface === 'dirt' || rd.surface === 'ground' || rd.type === 'track' ? 'gravel'
      : rd.surface === 'asphalt' || rd.surface === 'paved' ? 'asphalt' : k.surface;
    if (cfg.paveFootways && rd.cls === 'E' && !rd.surface && rd.type !== 'path') surface = 'asphalt';
    const o = { id: `${slug(name ?? rd.type)}-${i}`, name, ref: rd.ref ?? null, cls: rd.cls, type: rd.type, surface, width: rd.cls === 'B' && rd.type === 'secondary' ? 7 : k.width, pts };
    if (k.center) o.center = true;
    if (name && cfg.curbs?.includes(name)) o.curbs = true;
    if (name && cfg.lamps?.[name]) o.lamps = { step: cfg.lamps[name], side: 1 };
    if (rd.bridge) o.bridge = true;
    if (rd.type === 'steps') o.steps = true;
    roads.push(o);
  });
  roads = chainRoads(roads);
  // på landet: grusvägarna blir två bredder (grusväg 4,2 m, brukningsväg 3 m), gång- och cykelstigar stryks
  for (const rd of roads) {
    const mid = rd.pts[(rd.pts.length / 2) | 0];
    if (!rural(...mid) || rd.cls === 'A' || rd.cls === 'B') continue;
    rd.rural = true;
    if (rd.surface === 'gravel' || rd.type === 'track' || rd.type === 'service') {
      if (rd.cls === 'C') { rd.width = 4.2; rd.surface = 'gravel'; rd.type = 'gravelRoad'; }
      else { rd.width = 3; rd.surface = 'gravel'; rd.cls = 'D'; rd.type = 'farmTrack'; }
      rd.ditch = true;
    }
  }
  roads = roads.filter(rd => !(rd.rural && rd.cls === 'E'));
  // stumpar: korta uppfarter och stigar som slutar i ingenting (ingen annan väg, inget hus vid änden) stryks,
  // tills inga fler faller bort. På landet räknas bara hus vid änden, och gränsen är längre.
  const STUB = cfg.stub ?? 14;
  for (let pass = 0; pass < 4; pass++) {
    const keep = roads.filter(rd => {
      if (!['D', 'E'].includes(rd.cls)) return true;
      const L = lineLen(rd.pts), limit = rd.rural ? STUB * 3 : STUB;
      if (L >= limit) return true;
      const dangling = [rd.pts[0], rd.pts[rd.pts.length - 1]].filter(p => !roads.some(o => o !== rd && nearestOn(p[0], p[1], o.pts).d < o.width / 2 + 1.5));
      if (!dangling.length) return true;
      return dangling.every(p => rawHouses.some(([hx, hz]) => Math.hypot(hx - p[0], hz - p[1]) < (rd.rural ? 9 : 7)));
    });
    if (keep.length === roads.length) break;
    report.stubs = (report.stubs ?? 0) + roads.length - keep.length;
    roads = keep;
  }
  // mjuka linjer: glesa ut och runda per klass (riksvägen hårdast). Sedan fästs varje ände som slutar på en
  // större väg exakt på den vägens mittlinje: korsningen blir ren, och ritningen lägger en avrundad mynning där.
  for (const rd of roads) {
    const [tol, minSeg, iter] = SMOOTH[rd.cls] ?? SMOOTH.C;
    const thinned = thin(simplify(rd.pts, tol), minSeg);
    rd.pts = chaikin(thinned, iter);
  }
  const rank = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const joins = [];
  for (const rd of roads) for (const end of [0, 1]) {
    const i = end ? rd.pts.length - 1 : 0, p = rd.pts[i];
    let best = null;
    for (const o of roads) {
      if (o === rd || rank[o.cls] < rank[rd.cls] || (o.cls === rd.cls && o.width <= rd.width && rank[o.cls] < 3)) continue;
      const q = nearestOn(p[0], p[1], o.pts);
      if (q.d < o.width / 2 + 2.5 && (!best || q.d < best.q.d)) best = { o, q };
    }
    if (!best) continue;
    const { o, q } = best;
    // änden flyttas till mittlinjen; punkten närmast änden flyttas med om den nu hamnar bakom
    rd.pts[i] = [q.x, q.z];
    const a = o.pts[q.i - 1], b = o.pts[q.i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nb = rd.pts[end ? i - 1 : 1];
    let n = [nb[0] - q.x, nb[1] - q.z]; const nl = Math.hypot(n[0], n[1]) || 1; n = [n[0] / nl, n[1] / nl];
    if (rd.cls !== 'E' && o.surface) joins.push({ at: P2([q.x, q.z]), u: P2([(b[0] - a[0]) / L, (b[1] - a[1]) / L]), n: P2(n), major: o.id, minor: rd.id, wMajor: o.width, wMinor: rd.width, surface: rd.surface });
  }
  for (const rd of roads) rd.pts = rd.pts.map(P2);
  const walkRoads = roads;   // alla vägar är gångbara (gång- och cykelvägar också)
  // vägarnas ramar för snabba avståndsprov
  for (const rd of roads) { const xs = rd.pts.map(p => p[0]), zs = rd.pts.map(p => p[1]); rd._bb = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; }
  const nearRoads = (x, z, pad) => roads.filter(rd => x > rd._bb[0] - pad && x < rd._bb[2] + pad && z > rd._bb[1] - pad && z < rd._bb[3] + pad);
  const nearestRoad = (x, z) => {
    let best = null;
    for (const rd of nearRoads(x, z, 60)) { const q = nearestOn(x, z, rd.pts); const e = q.d - rd.width / 2; if (!best || e < best.e) best = { ...q, e, rd }; }
    return best;
  };

  // ---------- järnvägen ----------
  // Huvudspåren är två OSM-linjer (ett spår var). Mittlinjen = mitten mellan dem; spelet ritar två spår i verklig
  // spårvidd och spåravstånd (som Mölnbo) kring mittlinjen.
  const mains = plan.railways.filter(w => w.usage === 'main');
  const sidings = plan.railways.filter(w => w.usage !== 'main').map(w => simplify(TP(w.pts), 0.3).map(P2));
  let rail = null;
  if (mains.length) {
    // linjerna ihopkedjade till spår: den längsta är spår A, resten hakas på efter närmaste ände
    const lines = mains.map(w => w.pts.map(p => [...p]));
    lines.sort((a, b) => b.length - a.length);
    const A = lines.shift();
    const join = (track, rest) => { let grew = true; while (grew) { grew = false; for (let i = 0; i < rest.length; i++) { const l = rest[i]; const e = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 12; if (e(l[l.length - 1], track[0])) { track.unshift(...l.slice(0, -1)); rest.splice(i, 1); grew = true; break; } if (e(l[0], track[track.length - 1])) { track.push(...l.slice(1)); rest.splice(i, 1); grew = true; break; } if (e(l[0], track[0])) { track.unshift(...l.slice(1).reverse()); rest.splice(i, 1); grew = true; break; } if (e(l[l.length - 1], track[track.length - 1])) { track.push(...l.slice(0, -1).reverse()); rest.splice(i, 1); grew = true; break; } } } return track; };
    const trackA = join(A, lines);
    const trackB = lines.length ? join(lines.shift(), lines) : null;
    let centre = trackA;
    if (trackB) {
      // täta ut A och ta mitten mot närmaste punkt på B
      const dense = [];
      for (let i = 1; i < trackA.length; i++) { const [ax, ay] = trackA[i - 1], [bx, by] = trackA[i]; const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 10)); for (let k = 0; k < n; k++) dense.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); }
      dense.push(trackA[trackA.length - 1]);
      centre = dense.map(([x, y]) => { const q = nearestOn(x, y, trackB); return q.d < 15 ? [(x + q.x) / 2, (y + q.z) / 2] : [x, y]; });
    }
    rail = { name: mains[0].name ?? 'Järnvägen', pts: simplify(TP(centre), 0.4).map(P2), tracks: [-2.25, 2.25], gauge: 1.435, half: 6.4, sidings };
  }
  const railD = (x, z) => (rail ? nearestOn(x, z, rail.pts).d : Infinity);

  // ---------- marken ----------
  const ground = { field: [], forest: [], lawn: [], paved: [], gravel: [], sand: [], pitch: [], yard: [] };
  const CAT = { farmland: 'field', meadow: 'field', grass: 'lawn', village_green: 'lawn', religious: 'lawn', social_facility: 'lawn', miniature_golf: 'lawn',
    parking: 'paved', retail: 'paved', commercial: 'paved', industrial: 'gravel', farmyard: 'yard', playground: 'sand', pitch: 'pitch', sports_centre: 'lawn',
    park: 'lawn', garden: 'lawn', beach: 'sand', bare_rock: 'rock', ...(cfg.landuse ?? {}) };
  ground.rock = [];
  for (const l of plan.landuse) { const c = (l.name && cfg.landuseByName?.[l.name]) ?? CAT[l.type]; if (c) (ground[c] ??= []).push(simplify(TP(l.pts), 0.3).map(P2)); }
  for (const w of plan.wood) ground.forest.push(simplify(TP(w.pts), 0.4).map(P2));
  // cfg.extraGround: ytor som OSM saknar (en grusplan), per sort i plan.json-meter
  for (const [k, polys] of Object.entries(cfg.extraGround ?? {})) for (const p of polys) (ground[k] ??= []).push(TP(p).map(P2));
  // landsbygdskanten målas som åker under allt annat (skog, gårdsplaner och tomter läggs ovanpå)
  for (const p of ruralPolys) ground.field.unshift(p.map(P2));
  // vatten (sjöar) och vattendrag
  ground.water = (plan.water ?? []).map(w => simplify(TP(w.pts), 0.4).map(P2)).filter(p => p.length > 2);
  const streams = (plan.waterways ?? []).map(w => ({ type: w.type, pts: simplify(TP(w.pts), 0.4).map(P2) }));
  const landuseAt = (px, py) => plan.landuse.find(l => inPoly(px, py, l.pts))?.type ?? null;

  // ---------- byggnaderna ----------
  const lm = new Map((cfg.landmarks ?? []).map(l => [l.osm, l]));
  const houses = [];
  // avstånd från en punkt till kanten av närmaste väg med ett visst namn (för platsens regler: butiker mot Storgatan)
  const roadGapAt = (x, z, name) => { let e = Infinity; for (const rd of nearRoads(x, z, 40)) if (rd.name === name) e = Math.min(e, nearestOn(x, z, rd.pts).d - rd.width / 2); return e; };
  for (const b of plan.buildings) {
    const pts = b.pts.slice(0, -1);
    const R = minRect(pts);
    const area = b.area_m2 ?? polyArea(pts);
    const [gx, gz] = T([R.cx, R.cy]);
    const far = outside(gx, gz) > 0;
    if (outD(gx, gz) > 140) continue;
    const L = lm.get(b.id);
    const use = landuseAt(R.cx, R.cy);
    // på landet: hus ute på åkern (långt från väg och inte på en gårdsplan) stryks, bodar utan gård också
    if (!L && rural(gx, gz) && use !== 'farmyard') {
      const nr = nearestRoad(gx, gz);
      const lim = area < 38 ? 9 : 20;
      if (!nr || nr.e > lim) { report.rural = (report.rural ?? 0) + 1; continue; }
    }
    let kind;
    // cfg.classify: platsens egna regler (ålder, användning, kvarter) före de allmänna; null = de allmänna
    const nr0 = nearestRoad(gx, gz);
    const ctx = { type: b.type, area, h: b.h, levels: b.levels, name: b.name, use, px: R.cx, py: R.cy, long: Math.max(R.eu, R.ev), short: Math.min(R.eu, R.ev),
      street: nr0?.rd.name ?? null, streetCls: nr0?.rd.cls ?? null, streetGap: nr0 ? nr0.e : Infinity, roadGap: name => roadGapAt(gx, gz, name) };
    if (L) kind = L.kind;
    else if (cfg.classify && (kind = cfg.classify(ctx))) { /* platsens regel */ }
    else if (area < 38) kind = 'shed';
    else if (use === 'industrial' || area > 900) kind = 'industrial';
    else if (use === 'farmyard') kind = area > 220 ? 'barn' : 'farm';
    else if (use === 'retail' || use === 'commercial') kind = 'commercial';
    else if (use === 'social_facility') kind = 'row';
    else if (area > 230) kind = Math.max(R.eu, R.ev) / Math.min(R.eu, R.ev) > 2.1 ? 'row' : (area > 420 ? 'apartment' : 'villa');
    else kind = 'villa';
    // storlek: skalad med BS och klämd per typ
    const CL = { villa: [[8, 13.5], [6.6, 10]], shed: [[2.6, 5.5], [2.2, 4]], farm: [[9, 13], [6.5, 8.5]], barn: [[14, 26], [8, 12]], sternersborg: [[9, 13], [7, 10]], sparbank: [[10, 13], [8, 10]], pastor: [[9, 13], [7, 10]], ...(cfg.sizes ?? {}) };
    // stora hus krymps mer (ICA, längorna): de är stora ändå och skulle annars täcka gatorna runt sig
    // cfg.buildingScaleAt: tät stad kan krympa husen mer (mot verklig skala) än villorna
    const BSx = cfg.buildingScaleAt?.(ctx) ?? BS;
    const floorS = Math.min(BSx, S + 0.12), bs = area <= 250 ? BSx : Math.max(floorS, BSx - (area - 250) / 600 * (BSx - floorS));
    let eu = R.eu * bs, ev = R.ev * bs;
    const cl = CL[kind];
    // utsträckningarna sorteras: den längre är bredden (w) i klämningen
    const long = Math.max(eu, ev), short = Math.min(eu, ev);
    let lw = long, sd = short;
    if (cl) { lw = Math.min(cl[0][1], Math.max(cl[0][0], long)); sd = Math.min(cl[1][1], Math.max(cl[1][0], short)); }
    if (eu >= ev) { eu = lw; ev = sd; } else { ev = lw; eu = sd; }
    const h = { id: `b${b.id}`, osm: b.id, added: !!b.added, kind, x: gx, z: gz, area: Math.round(area), hReal: b.h, eu, ev, ua: [R.ux, -R.uy], far, landmark: L?.name ?? null, lmH: L?.h, front: L?.front ? [L.front[0], -L.front[1]] : null, ctx };
    houses.push(h);
  }
  // framsidan mot närmaste gata: lokal +z åt det av fyra håll som pekar mest mot gatan; w längs gatan
  // cfg.faceStreets: huvudgator som husen inom 12 m hellre vänder framsidan mot (butiksgatan före bakgården)
  const faceRoad = (x, z) => { let best = null; for (const rd of nearRoads(x, z, 40)) if (cfg.faceStreets?.includes(rd.name)) { const q = nearestOn(x, z, rd.pts), e = q.d - rd.width / 2; if (e < 12 && (!best || e < best.e)) best = { ...q, e, rd }; } return best; };
  const orient = h => {
    const nr = (h.landmark ? null : faceRoad(h.x, h.z)) ?? nearestRoad(h.x, h.z);
    const [ax, az] = h.ua, bx = -az, bz = ax;
    // landmärken kan ha framsidan given i inställningarna (plan-riktning), annars mot närmaste gata
    let n = h.front ?? (nr ? [nr.x - h.x, nr.z - h.z] : [0, 1]);
    const nl = Math.hypot(n[0], n[1]) || 1; n = [n[0] / nl, n[1] / nl];
    // z-axeln längs u: djupet = eu, bredden = ev (och tvärtom längs v)
    const cands = [[ax, az, h.ev, h.eu], [-ax, -az, h.ev, h.eu], [bx, bz, h.eu, h.ev], [-bx, -bz, h.eu, h.ev]];
    let best = null;
    for (const [zx, zz, w, d] of cands) { const dot = zx * n[0] + zz * n[1]; if (!best || dot > best.dot) best = { dot, zx, zz, w, d }; }
    h.ry = Math.atan2(best.zx, best.zz); h.w = best.w; h.d = best.d;
  };
  houses.forEach(orient);

  // krockar: gator (bredd/2 + 1,2 m), spåret, och grannarna. Störst först; bodar sist.
  // marginal mot gatan per klass: uppfarter (D) och gångvägar (E) får gå tätt intill husen
  const KEEP = 1.2, KEEP_CLS = { A: 3.5, B: 2.8, C: 2.6, D: 0.25, E: 0.2, ...(cfg.keep ?? {}) };
  const roadDeficit = h => {
    let worst = null;
    for (const [x, z] of samples(h)) {
      for (const rd of nearRoads(x, z, 12)) {
        if (cfg.footwaysYield && (rd.cls === 'E' || (rd.cls === 'D' && !rd.name && cfg.serviceYield))) continue;   // tät stad: gångvägar och namnlösa uppfarter viker för husen
        const q = nearestOn(x, z, rd.pts), e = q.d - rd.width / 2 - (KEEP_CLS[rd.cls] ?? KEEP);
        if (e < 0 && (!worst || e < worst.e)) worst = { e, x: q.x, z: q.z, px: x, pz: z };
      }
      if (rail) { const q = nearestOn(x, z, rail.pts), e = q.d - rail.half - 0.8; if (e < 0 && (!worst || e < worst.e)) worst = { e, x: q.x, z: q.z, px: x, pz: z }; }
    }
    return worst;
  };
  // landmärken först (de stryks aldrig), sedan störst först, bodar sist
  const order = houses.slice().sort((a, b) => !!b.landmark - !!a.landmark || (a.kind === 'shed') - (b.kind === 'shed') || b.area - a.area);
  const placed = [];
  const MIN = { villa: [7, 6], shed: [2.2, 2], farm: [8, 6], barn: [10, 7], ...(cfg.minSizes ?? {}) };
  for (const h of order) {
    let ok = false, moved = false, shrunk = false;
    for (let attempt = 0; attempt < (cfg.attempts ?? 4) && !ok; attempt++) {
      for (let it = 0; it < 12; it++) {
        const w = roadDeficit(h);
        const hit = placed.find(o => rectHit(h, o, h.kind === 'shed' || o.kind === 'shed' ? 0.6 : (cfg.neighbourPad ?? 1.4)));
        if (!w && !hit) { ok = true; break; }
        if (w) { let dx = w.px - w.x, dz = w.pz - w.z; const l = Math.hypot(dx, dz) || 1; h.x += dx / l * (-w.e + 0.05); h.z += dz / l * (-w.e + 0.05); moved = true; continue; }
        let dx = h.x - hit.x, dz = h.z - hit.z; const l = Math.hypot(dx, dz) || 1; h.x += dx / l * 0.6; h.z += dz / l * 0.6; moved = true;
      }
      if (ok) break;
      const m = MIN[h.kind] ?? [h.w * 0.7, h.d * 0.7];
      if (h.w <= m[0] && h.d <= m[1]) break;
      h.w = Math.max(m[0], h.w * 0.88); h.d = Math.max(m[1], h.d * 0.88); shrunk = true;
    }
    // för långt från fotavtrycket = stryk (då blir byn fel)
    // ett litet hus som inte får plats blir en bod (garage, gäststuga) i stället för att strykas
    if (!ok && !h.landmark && h.kind === 'villa' && h.area < 90 && !h._asShed) { Object.assign(h, { kind: 'shed', _asShed: true, w: Math.min(h.w, 5), d: Math.min(h.d, 3.8) }); order.push(h); continue; }
    if (!ok && process.env.WHY?.split(',').includes(String(h.osm))) { const w = roadDeficit(h), o = placed.find(q => rectHit(h, q, 0.5)); console.log('WHY', h.osm, h.kind, h.w.toFixed(1), h.d.toFixed(1), w ? `road ${w.e.toFixed(2)} at ${w.x.toFixed(1)},${w.z.toFixed(1)}` : '', o ? `hit ${o.osm} ${o.kind}` : ''); }
    if (!ok && !h.landmark) { report.dropped.push(`${h.kind} ${h.osm}`); continue; }
    if (!ok) report.forced = [...(report.forced ?? []), `${h.landmark} (${(roadDeficit(h)?.e ?? 0).toFixed(1)} m)`];
    if (moved) report.moved++;
    if (shrunk) report.shrunk++;
    placed.push(h);
  }

  // detaljer per typ: villans tak, våningar, fasad; höjd för de andra
  const out = [];
  for (const h of placed) {
    const hr = rng(h.osm % 2147483647);
    const o = { id: h.id, osm: h.osm, kind: h.kind, x: r2(h.x), z: r2(h.z), ry: r2(h.ry), w: r2(h.w), d: r2(h.d) };
    if (h.far) o.far = true;
    if (h.added) o.added = true;
    if (h.landmark) o.name = h.landmark;
    if (h.kind === 'villa') {
      o.storeys = h.hReal > 7 || (h.area > 150 && hr() < 0.5) || hr() < 0.18 ? 1.5 : 1;
      o.roof = hr() < 0.28 ? 'hip' : 'gable';
      o.facade = hr.weighted(cfg.facades); o.roofColor = hr.weighted(cfg.roofs);
      if (o.facade === 'red') o.roofColor = hr() < 0.6 ? 'black' : 'tile';
      o.chimney = hr() < 0.65; o.veranda = hr() < 0.25; o.solar = hr() < 0.06; o.garage = 0; o.seed = (hr() * 1e9) | 0;
      const top = 0.32 + (o.storeys === 1.5 ? 3.3 : 2.75), pitch = o.storeys === 1.5 ? 0.74 : o.roof === 'hip' ? 0.4 : 0.47;
      o.eave = r2(top); o.ridge = r2(top + (o.d / 2) * Math.tan(pitch));
    } else {
      o.h = r2(h.lmH ?? Math.max(2.6, Math.min(12, (h.hReal ?? 6.5) * 0.9)));
      o.seed = (hr() * 1e9) | 0;
      if (h.kind === 'shed') o.color = hr.pick(['red', 'red', 'grey', 'brown', 'green']);
      if (h.kind === 'farm') o.color = hr.weighted([['red', 6], ['yellow', 2], ['white', 2]]);
      if (h.kind === 'row' || h.kind === 'apartment' || h.kind === 'commercial') o.wall = hr.pick(['brick', 'plaster', 'plaster', 'panel']);
    }
    // cfg.style: platsens utseende per hus (våningar, fasad, tak, butiker i bottenvåningen). Gatan efter placeringen.
    if (cfg.style) { const nr = nearestRoad(h.x, h.z); cfg.style(o, { ...h.ctx, street: nr?.rd.name ?? null, streetCls: nr?.rd.cls ?? null, streetGap: nr ? nr.e : Infinity, roadGap: name => roadGapAt(h.x, h.z, name) - Math.min(h.w, h.d) / 2, hReal: h.hReal }, hr); }
    out.push(o);
  }
  out.sort((a, b) => a.osm - b.osm);

  // ---------- trädgårdarna ----------
  // Runt varje villa i spelytan: en gräns mot gatan (häck, vitt spjälstaket, grått plankstaket eller inget),
  // fruktträd på sidorna och bakom, ibland en bod och en brevlåda vid gatan. Allt hålls fritt från gator, spår
  // och hus (med marginal).
  const gardens = { hedges: [], fences: [], trees: [], sheds: [], mailboxes: [] };
  const all = out;
  const clearAt = (x, z, roadPad, housePad = 0.8) => {
    for (const rd of nearRoads(x, z, 10)) if (nearestOn(x, z, rd.pts).d < rd.width / 2 + roadPad) return false;
    if (railD(x, z) < (rail?.half ?? 0) + 1) return false;
    for (const o of all) if (Math.abs(o.x - x) < 20 && Math.abs(o.z - z) < 20 && inRectPt(o, x, z, housePad)) return false;
    return true;
  };
  const treeAt = [];
  const freeTree = (x, z, d) => !treeAt.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < d);
  for (const h of out) {
    if (h.kind !== 'villa' || h.far) continue;
    const gr = rng(h.seed ^ 0x5bd1e995);
    const c = Math.cos(h.ry), s = Math.sin(h.ry), L = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c];
    const nr = nearestRoad(h.x, h.z);
    // gränsen mot gatan: från husets framsida halvvägs till gatan
    if (nr) {
      const front = Math.hypot(nr.x - h.x, nr.z - h.z) - nr.rd.width / 2 - 0.9;
      if (front > h.d / 2 + 1.4) {
        const fz = Math.min(front, h.d / 2 + 6), hw = h.w / 2 + gr.range(1.5, 3.5);
        let a = L(-hw, fz), b = L(hw, fz);
        // korta av ändarna tills de är fria
        for (let k = 0; k < 6 && !(clearAt(...a, 0.6, 0.4)); k++) a = [a[0] + (b[0] - a[0]) * 0.12, a[1] + (b[1] - a[1]) * 0.12];
        for (let k = 0; k < 6 && !(clearAt(...b, 0.6, 0.4)); k++) b = [b[0] + (a[0] - b[0]) * 0.12, b[1] + (a[1] - b[1]) * 0.12];
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 3 && clearAt(...a, 0.6, 0.4) && clearAt(...b, 0.6, 0.4) && clearAt(...mid, 0.6, 0.4)) {
          const k = gr.weighted([['hedge', 50], ['picket', 22], ['slat', 14], ['none', 14]]);
          if (k === 'hedge') gardens.hedges.push([...P2(a), ...P2(b), r2(gr.range(1.1, 1.8))]);
          else if (k !== 'none') gardens.fences.push([...P2(a), ...P2(b), k]);
          // brevlådan vid grinden
          if (gr() < 0.5) { const m = L(h.w / 2 - 1, fz + 0.6); if (clearAt(...m, 0.4, 0.4)) gardens.mailboxes.push([...P2(m), r2(h.ry)]); }
        }
      }
    }
    // fruktträd: ett till tre, på sidorna och bakom
    const n = 1 + ((gr() * 3) | 0);
    let got = 0;
    for (let i = 0; i < n * 4 && got < n; i++) {
      const side = gr.pick(['back', 'back', 'left', 'right']);
      const [lx, lz] = side === 'back' ? [gr.range(-h.w / 2, h.w / 2), -h.d / 2 - gr.range(3, 7)]
        : [(side === 'left' ? -1 : 1) * (h.w / 2 + gr.range(2.5, 5)), gr.range(-h.d / 2, h.d / 2)];
      const [x, z] = L(lx, lz);
      if (!clearAt(x, z, 2.2, 1.6) || !freeTree(x, z, 3.2)) continue;
      treeAt.push([x, z]);
      gardens.trees.push([...P2([x, z]), r2(gr.range(3.6, 6.2)), gr.weighted([[0, 5], [1, 3], [2, 2], [3, 2]])]);
      got++;
    }
    // boden bakom huset (om OSM inte redan har en inom 10 m)
    if (gr() < 0.45 && !out.some(o => o.kind === 'shed' && Math.hypot(o.x - h.x, o.z - h.z) < 10)) {
      const sw = gr.range(2.6, 3.6), sd = gr.range(2.2, 2.8), lx = (gr() < 0.5 ? -1 : 1) * (h.w / 2 - sw / 2 + gr.range(0, 1.5)), lz = -h.d / 2 - gr.range(2.6, 4.5);
      const [x, z] = L(lx, lz), sh = { x, z, ry: h.ry, w: sw, d: sd };
      if (samples(sh, 0.5).every(([px, pz]) => clearAt(px, pz, 1.2, 0.6)) && freeTree(x, z, 2.6)) {
        gardens.sheds.push([...P2([x, z]), r2(h.ry + Math.PI), r2(sw), r2(sd), gr.pick(['red', 'red', 'grey', 'brown', 'green'])]);
        treeAt.push([x, z]);
      }
    }
  }

  // ---------- skisserna ----------
  const SPAWN_OUT = 14;
  const findRoad = (name, at) => {
    const g = T(at);
    let best = null;
    for (const rd of roads) if (rd.name === name || rd.ref === name || rd.name === `Väg ${name.replace(';', '/')}`) {
      const q = nearestOn(g[0], g[1], rd.pts); if (!best || q.d < best.q.d) best = { rd, q };
    }
    return best?.rd ?? null;
  };
  const sk = cfg.sketch ?? {};
  const snapEnd = s => {
    const rd = findRoad(s.road, s.at);
    if (!rd) throw new Error(`skiss ${s.id}: hittar ingen väg ${s.road}`);
    const g = T(s.at);
    // alla vägbitar med samma namn: punkten där vägen är SPAWN_OUT m ute i dimman, närmast skissens punkt;
    // når vägen aldrig dit (gatan slutar i spelytan) blir ingången gatans ände närmast punkten
    const same = roads.filter(o => o.name === rd.name && o.ref === rd.ref);
    let at = null, bd = Infinity;
    for (const o of same) for (let i = 1; i < o.pts.length; i++) {
      const [ax, az] = o.pts[i - 1], [bx, bz] = o.pts[i], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
      for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; if (Math.abs(outside(x, z) - SPAWN_OUT) < 0.2) { const dd = Math.hypot(x - g[0], z - g[1]); if (dd < bd) { bd = dd; at = [x, z]; } } }
    }
    if (!at) for (const o of same) for (const p of o.pts) { const dd = Math.hypot(p[0] - g[0], p[1] - g[1]); if (dd < bd) { bd = dd; at = p; } }
    const o = { id: s.id, name: s.name, road: rd.id, at: P2(at), note: s.note };
    if (s.field) o.field = P2(T(s.field));
    return o;
  };
  const spawns = (sk.spawns ?? []).map(snapEnd);
  // utgångarna (dit konvojen ska): samma läge i dimkanten som ingångarna
  const exits = (sk.exits ?? []).map(snapEnd);
  const sketch = {
    spawns,
    ...(exits.length ? { exits } : {}),
    base: sk.base ? { at: P2(T(sk.base.at)), name: sk.base.name } : null,
    defence: (sk.defence ?? []).map(d => ({ kind: d.kind, at: P2(T(d.at)), note: d.note, ...(d.name ? { name: d.name } : {}) })),
    // linjer mellan försvarspunkterna (triangeln), bara bild
    links: (sk.links ?? []).map(l => ({ a: P2(T(l.a)), b: P2(T(l.b)), name: l.name ?? null })),
  };

  // ---------- namn ----------
  const labels = [];
  const byName = new Map();
  for (const rd of roads) {
    if (!rd.name || rd.cls === 'E' || rd.cls === 'D') continue;
    // längsta biten inne i spelytan
    let len = 0, mid = null;
    const inside = rd.pts.filter(([x, z]) => outside(x, z) < -6);
    for (let i = 1; i < inside.length; i++) len += Math.hypot(inside[i][0] - inside[i - 1][0], inside[i][1] - inside[i - 1][1]);
    if (len < 12) continue;
    let acc = 0;
    for (let i = 1; i < inside.length && !mid; i++) { const l = Math.hypot(inside[i][0] - inside[i - 1][0], inside[i][1] - inside[i - 1][1]); if (acc + l >= len / 2) { const t = (len / 2 - acc) / l; mid = [inside[i - 1][0] + (inside[i][0] - inside[i - 1][0]) * t, inside[i - 1][1] + (inside[i][1] - inside[i - 1][1]) * t]; } acc += l; }
    if (!byName.has(rd.name) || byName.get(rd.name).len < len) byName.set(rd.name, { len, mid });
  }
  for (const [text, { mid }] of byName) labels.push({ text, at: P2(mid) });
  for (const l of cfg.labels ?? []) labels.push({ text: l.text, at: P2(T(l.at)) });
  const props = (cfg.props ?? []).map(p => {
    const g = T(p.at), o = { kind: p.kind, name: p.name, at: P2(g) };
    if (p.kind === 'levelCrossing' && rail) {
      // tvärs över spåret: ramens x längs spåret
      // där en väg korsar mittlinjen, närmast skissens punkt
      const X = (p1, p2, p3, p4) => { const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]); if (!d) return null; const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d, u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t] : null; };
      let best = null;
      for (const rd of roads) for (let i = 1; i < rd.pts.length; i++) for (let j = 1; j < rail.pts.length; j++) {
        const c = X(rd.pts[i - 1], rd.pts[i], rail.pts[j - 1], rail.pts[j]); if (!c) continue;
        const dd = Math.hypot(c[0] - g[0], c[1] - g[1]); if (!best || dd < best.dd) best = { dd, c, j, rd };
      }
      const q = best ? { x: best.c[0], z: best.c[1], i: best.j } : nearestOn(g[0], g[1], rail.pts), a = rail.pts[q.i - 1], b = rail.pts[q.i];
      o.at = P2([q.x, q.z]); o.ry = r2(Math.atan2(-(b[1] - a[1]), b[0] - a[0]));
      o.road = best?.rd.width ?? nearestRoad(q.x, q.z)?.rd.width ?? 5;
    } else if (rail && (p.kind === 'oldStation')) {
      const q = nearestOn(g[0], g[1], rail.pts), a = rail.pts[q.i - 1], b = rail.pts[q.i];
      const ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      // perrongen på den sida av spåret där läget ligger
      const side = Math.sign((g[0] - q.x) * Math.sin(ry) + (g[1] - q.z) * Math.cos(ry)) || 1;
      o.at = P2([q.x + Math.sin(ry) * side * (rail.half + 0.6), q.z + Math.cos(ry) * side * (rail.half + 0.6)]); o.ry = r2(ry); o.side = side;
    } else if (p.free || p.to) {
      // fritt placerad (bryggor, båtar, stationens perronger): to = andra änden, ry längs at till to
      if (p.to) { const t = T(p.to); o.to = P2(t); o.ry = r2(Math.atan2(-(t[1] - g[1]), t[0] - g[0])); }
      else { o.ry = r2(p.ry ?? 0); o.free = true; }
      for (const k of Object.keys(p)) if (!['kind', 'name', 'at', 'to', 'free', 'ry'].includes(k)) o[k] = p[k];
    } else {
      // vid närmaste gata (inte uppfarter och gångvägar)
      let rd = null;
      for (const x of roads) if (!['D', 'E'].includes(x.cls)) { const q = nearestOn(g[0], g[1], x.pts); if (!rd || q.d < rd.d) rd = { ...q, rd: x }; }
      if (rd) { const a = rd.rd.pts[rd.i - 1], b = rd.rd.pts[rd.i]; o.ry = r2(Math.atan2(-(b[1] - a[1]), b[0] - a[0])); o.road = rd.rd.id; o.at = P2([rd.x, rd.z]); }
    }
    return o;
  });

  // cfg.shore: strandkanten längs sjön i spelytan, vass ute i vattnet och stenar i vattenbrynet, med ett steg i meter
  // och andelar ({ step, reed, rock }). Badstranden (ground.beach), bryggornas fästen och vägarnas ändar hålls fria.
  // Bara kartor med cfg.shore får ground.shore: [x, z, sort (0 vass, 1 sten), storlek, vridning].
  if (cfg.shore && ground.water.length) {
    const sr = rng((cfg.seed ?? 1) + 7), SH = cfg.shore, step = SH.step ?? 5, out = [];
    const free = [...(ground.beach ?? []), ...(ground.sand ?? [])].map(pl => {
      const c = pl.reduce((a, q) => [a[0] + q[0] / pl.length, a[1] + q[1] / pl.length], [0, 0]);
      return [c[0], c[1], Math.max(...pl.map(q => Math.hypot(q[0] - c[0], q[1] - c[1]))) + (SH.beachPad ?? 6)];
    });
    for (const p of props) if (p.kind === 'pier') free.push([p.at[0], p.at[1], 5]);
    for (const [x, z, rad] of SH.keepOpen ?? []) { const g = T([x, z]); free.push([g[0], g[1], rad * S]); }
    for (const w of ground.water) for (let i = 1; i <= w.length; i++) {
      const [ax, az] = w[i - 1], [bx, bz] = w[i % w.length], L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
      const ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let s = sr() * step; s < L; s += step * sr.range(0.7, 1.3)) {
        const x = ax + ux * s, z = az + uz * s;
        if (outD(x, z) > 4 || free.some(([fx, fz, fr]) => Math.hypot(fx - x, fz - z) < fr)) continue;
        if (roads.some(rd => nearestOn(x, z, rd.pts).d < rd.width / 2 + 3)) continue;
        // normalen ut i vattnet
        let nx = -uz, nz = ux; if (!inPoly(x + nx * 1.5, z + nz * 1.5, w)) { nx = -nx; nz = -nz; }
        const k = sr();
        if (k < SH.reed) { const o = sr.range(0.6, 2.6); out.push([r2(x + nx * o), r2(z + nz * o), 0, r2(sr.range(1.1, 2.0)), r2(sr() * 6.28)]); }
        else if (k < SH.reed + SH.rock) { const o = sr.range(-0.6, 0.8); out.push([r2(x + nx * o), r2(z + nz * o), 1, r2(sr.range(0.5, 1.1)), r2(sr() * 6.28)]); }
      }
    }
    ground.shore = out;
  }

  const pois = plan.pois.map(p => ({ name: p.name, kind: p.kind, at: P2(T([p.x, p.y])) })).filter(p => outD(...p.at) < 140);

  // delarna: spelbara bitar av en stor karta (egna gränser och kamerahem). Hela kartan är summan.
  const parts = (cfg.parts ?? []).map(p => {
    const [a, c] = [T([p.bounds[0], p.bounds[3]]), T([p.bounds[2], p.bounds[1]])];
    return { id: p.id, key: p.key, name: p.name, bounds: { x0: r2(a[0]), z0: r2(a[1]), x1: r2(c[0]), z1: r2(c[1]) }, home: P2(T(p.home)), view: p.view ?? 60 };
  });
  return {
    parts, T,
    meta: { place: cfg.place, name: cfg.name, version: cfg.version, scale: S, buildingScale: BS, crop, osm_base: plan.meta.osm_base, license: plan.meta.license, planOrigin: [cx, cy] },
    CRISP, PLAN, roads: roads.map(({ _bb, ...rd }) => ({ ...rd, smoothed: true })), joins, streams, rail, ground, buildings: out, gardens, props, labels, pois, sketch, report,
  };
}

// ---------- modulen ----------
function emit(cfg, d) {
  const J = v => JSON.stringify(v);
  const rows = (arr, f = J) => '[\n' + arr.map(x => '  ' + f(x)).join(',\n') + '\n]';
  const NAME = cfg.exportName, UP = NAME.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  const s = [];
  s.push(`// ${cfg.name}: kartan som data (förhandsvisning, ingen spellogik). GENERERAD av scripts/osm-to-map.mjs ${cfg.place}`);
  s.push(`// ur ~/Projects/horde-refs/${cfg.place}/plan.json och scripts/osm-places/${cfg.place}.mjs. Ändra inställningarna och kör om,`);
  s.push(`// redigera inte för hand.`);
  s.push(`//`);
  s.push(`// Kartdata © OpenStreetMap contributors (ODbL), https://www.openstreetmap.org/copyright. OSM-läge ${d.meta.osm_base}.`);
  s.push(`// Geometrin är härledd ur OSM: utsnitt, skala ${d.meta.scale} (avstånd) och ${d.meta.buildingScale} (husens fotavtryck),`);
  s.push(`// förenklade vägar, husen som rektanglar. Spelets meter: x öster, z söder; origo = plan.json (${d.meta.planOrigin.join(', ')}).`);
  s.push(`//`);
  s.push(`// Krockar vid konverteringen: ${d.report.moved} hus flyttade, ${d.report.shrunk} krympta, ${d.report.dropped.length} strukna${d.report.dropped.length ? ' (' + d.report.dropped.join(', ') + ')' : ''}.`);
  s.push(`import { osmGrid } from './osm-map.js';`);
  // 0.23.0: rutnätet räknas när någon läser det (src/data/lazy.js), så att kartan går att importera billigt (Björnlunda är en bana)
  s.push(`import { lazy } from './lazy.js';`);
  s.push('');
  s.push(`export const ${UP}_VERSION = ${J(cfg.version)};`);
  s.push(`export const SOURCE = ${J(d.meta)};`);
  s.push(`// Den skarpa spelytan; utanför tonar allt mot diset. PLAN: hela underlaget (där omgivningen tar slut).`);
  s.push(`export const CRISP = ${J(d.CRISP)};`);
  s.push(`export const PLAN = ${J(d.PLAN)};`);
  s.push(`// Vägar: cls A (riksväg) till E (gång och cykel), width i spelets meter, pts redan mjuka (Chaikin, smoothed: true).`);
  s.push(`export const ROADS = ${rows(d.roads)};`);
  s.push(`// Korsningar: där en mindre väg mynnar i en större (at på den större vägens mittlinje, u längs den, n in i den`);
  s.push(`// mindre). Ritningen lägger en avrundad mynning där och bryter kantlinjerna.`);
  s.push(`export const JOINS = ${rows(d.joins)};`);
  s.push(`export const STREAMS = ${rows(d.streams)};`);
  s.push(`// Järnvägen: mittlinjen; två spår i verklig spårvidd på tracks (meter tvärs), half = halva bredden med staket.`);
  s.push(`export const RAIL = ${J(d.rail)};`);
  s.push(`// Mark: polygoner per sort (åker, skog, gräsytor, asfalt, grus, sand, bollplan, gårdsplan).`);
  s.push(`export const GROUND = {\n${Object.entries(d.ground).map(([k, v]) => `  ${k}: ${rows(v).replace(/\n/g, '\n  ')}`).join(',\n')}\n};`);
  s.push(`// Byggnaderna: kind (villa, shed, row, apartment, commercial, industrial, farm, barn eller ett landmärke), mitt (x, z),`);
  s.push(`// rotation ry (lokal +z = framsidan mot gatan), w längs fasaden, d djupet. far: i diset utanför spelytan.`);
  s.push(`export const BUILDINGS = ${rows(d.buildings)};`);
  s.push(`// Trädgårdarna: häckar [ax, az, bx, bz, höjd], staket [ax, az, bx, bz, sort], fruktträd [x, z, höjd, sort],`);
  s.push(`// bodar [x, z, ry, w, d, färg], brevlådor [x, z, ry].`);
  s.push(`export const GARDENS = {\n${Object.entries(d.gardens).map(([k, v]) => `  ${k}: ${J(v)}`).join(',\n')}\n};`);
  s.push(`// Delarna: spelbara bitar (gränser och kamerahem i spelets meter). Tom för kartor i ett stycke.`);
  s.push(`export const PARTS = ${rows(d.parts)};`);
  s.push(`// Gatulivet per gata: kantstensparkering (andel), gatuträd, bänkar och cykelställ (steg i meter).`);
  s.push(`export const STREETS = ${J(cfg.streets ?? {})};`);
  s.push(`// Saker som inte är byggnader i OSM (plankorsningen, busshållplatsen, gamla stationen).`);
  s.push(`export const PROPS = ${rows(d.props)};`);
  s.push(`export const LABELS = ${rows(d.labels)};`);
  s.push(`export const POIS = ${rows(d.pois)};`);
  s.push(`// SKISSER, inte spellogik: ingångarna i dimkanten (field: horden går över åkern därifrån till gatan), basen och`);
  s.push(`// försvarslägena ur beskrivning.md. Förhandsvisningen ritar dem med R; inget i simuleringen läser dem.`);
  s.push(`export const SKETCH = ${JSON.stringify(d.sketch, null, 1).replace(/\n\s*/g, ' ')};`);
  s.push('');
  s.push(`export const ${UP}_SURROUNDINGS = { crisp: CRISP, fade: 38, haze: { start: 18, end: 140, max: 0.9 }, extent: { x0: PLAN.x0 - 60, x1: PLAN.x1 + 60, z0: PLAN.z0 - 60, z1: PLAN.z1 + 60 } };`);
  s.push(`export const GRID_BOUNDS = { x0: CRISP.x0 - 30, z0: CRISP.z0 - 30, x1: CRISP.x1 + 30, z1: CRISP.z1 + 30 };`);
  s.push('');
  s.push(`export const ${NAME} = {`);
  s.push(`  id: ${J(cfg.place)}, name: ${J(cfg.name)}, version: ${UP}_VERSION, world: 'osm', source: SOURCE,`);
  s.push(`  camera: { target: ${J(P2(cfg.home ? d.T(cfg.home) : [(d.sketch.base?.at ?? [0, 0])[0], (d.sketch.base?.at ?? [0, 0])[1]]))}, view: ${cfg.view ?? 60}, zoom: [22, ${cfg.zoomMax ?? 110}], pan: { x0: CRISP.x0 + 6, x1: CRISP.x1 - 6, z0: CRISP.z0 + 6, z1: CRISP.z1 - 6 } },`);
  s.push(`  shadowBounds: { x0: CRISP.x0 - 6, x1: CRISP.x1 + 6, z0: CRISP.z0 - 6, z1: CRISP.z1 + 6 },`);
  s.push(`  roads: ROADS, joins: JOINS, streams: STREAMS, rail: RAIL, ground: { ...GROUND, bounds: { x0: CRISP.x0 - 24, x1: CRISP.x1 + 24, z0: CRISP.z0 - 24, z1: CRISP.z1 + 24 }, ppm: 8 },`);
  s.push(`  buildings: BUILDINGS, parts: PARTS, streets: STREETS, gardens: GARDENS, props: PROPS, labels: LABELS, pois: POIS, sketch: SKETCH, surroundings: ${UP}_SURROUNDINGS,`);
  s.push(`};`);
  s.push(`lazy(${NAME}, 'grid', () => osmGrid(${NAME}, GRID_BOUNDS));`);
  s.push('');
  return s.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const place = process.argv[2];
  if (!place) { console.error('användning: node scripts/osm-to-map.mjs <plats>'); process.exit(1); }
  const cfgPath = join(ROOT, 'scripts', 'osm-places', `${place}.mjs`);
  if (!existsSync(cfgPath)) { console.error(`saknar ${cfgPath}`); process.exit(1); }
  const cfg = { ...(await import(pathToFileURL(cfgPath))).default };
  // prova andra skalor utan att ändra inställningarna: --scale 0.5 --bs 0.7 --dry
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  if (arg('--scale')) cfg.scale = +arg('--scale');
  if (arg('--bs')) cfg.buildingScale = +arg('--bs');
  const dry = process.argv.includes('--dry');
  const plan = JSON.parse(readFileSync(join(REFS, place, 'plan.json'), 'utf8'));
  const d = convert(plan, cfg);
  const outPath = join(ROOT, cfg.out);
  if (!dry) writeFileSync(outPath, emit(cfg, d));
  const kinds = {};
  for (const b of d.buildings) kinds[b.kind] = (kinds[b.kind] ?? 0) + 1;
  console.log(`${cfg.out}: ${d.roads.length} vägar, ${d.buildings.length} hus (${d.buildings.filter(b => !b.far).length} i spelytan) ${JSON.stringify(kinds)}`);
  console.log(`trädgårdar: ${d.gardens.hedges.length} häckar, ${d.gardens.fences.length} staket, ${d.gardens.trees.length} träd, ${d.gardens.sheds.length} bodar, ${d.gardens.mailboxes.length} brevlådor`);
  console.log(`stumpar strukna: ${d.report.stubs ?? 0}, hus på åkern strukna: ${d.report.rural ?? 0}, korsningar: ${d.joins.length}`);
  if (cfg.extraBuildings?.length) console.log(`tillagda hus (inte OSM): ${d.buildings.filter(b => b.added).length} av ${cfg.extraBuildings.length}`);
  console.log(`krockar: ${d.report.moved} flyttade, ${d.report.shrunk} krympta, ${d.report.dropped.length} strukna ${d.report.dropped.join(', ')}`);
  console.log(`spelytan ${JSON.stringify(d.CRISP)}, ingångar ${d.sketch.spawns.map(s => s.id + '@' + s.at).join(' ')}${d.sketch.exits ? ', utgångar ' + d.sketch.exits.map(s => s.id + '@' + s.at).join(' ') : ''}`);
}
