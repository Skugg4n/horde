// Byggsats för Mölnbo (0.17.0-molnbo): bron och gångbron med trapptornen, perrongerna med väntkurer,
// kontaktledningen, avgångsskylten, X60, Folkets hus, stationshuset, caféet Harmoni, Missionshuset, det gula
// huset med snickarglädje, de röda kedjehusen, det gamla vita huset, Hembygdsgården med gärdsgården, Kvarnen,
// hyreshusen, trafikljusen och bergskärningen. Samma stil och batch som Gnesta (gnesta-kit.js): allt läggs i
// en batch där varje (geometri, materialsort) blir en InstancedMesh. Skyltarna med text är egna plan (canvas).
// Ramen för spåret och broarna är järnvägens ram: lokal x = u längs spåret, lokal z = v tvärs över (söderut).
import * as THREE from 'three';
import { canvasTex } from './kit.js';
import { GP, UNIT, frame } from './gnesta-kit.js';

// Mölnbos palett: grå betong, falurött, SL:s blåvita tåg, caféets ljusgrå panel. Avmättat som resten.
export const MP = {
  concrete: '#9d9a92', concreteDark: '#7d7a72', concreteLight: '#b5b2a9', deckTop: '#5f5a51', footTop: '#8f8b82',
  steel: '#8d918f', steelDark: '#555957', glass: '#7f969c', graffiti: ['#5a7a9a', '#8a3a4a', '#c9a33a', '#3f6a4a', '#d0d0c8'],
  ballast: '#6e665a', sleeper: '#77736a', rail: '#5b544c', platform: '#a29e93', platformEdge: '#d6d1c2', tactile: '#c8bfa0',
  fenceRed: '#7a3328', mast: '#7d817f', shelterRoof: '#3a3c3c', shelterFrame: '#2e3133', bench: '#2d2f30', ledFrame: '#2f5a9a', ledFace: '#141516',
  x60: '#e7e8e4', x60Band: '#2f63a8', x60Dark: '#2a2e33', x60Skirt: '#5c6064', x60Glass: '#1f2a33', x60Roof: '#b9bcbb', x60Door: '#c9ccca',
  falu: '#7c3326', faluDark: '#5e2219', white: '#e3ded0', roofSheet: '#3f4142', roofTile: '#7a4430', stone: '#7b766b',
  cafe: '#c3c6c4', cafeTrim: '#eeeee8', deck: '#7a5d43', yellow: '#cfae55', mission: '#ddd8c8', aptWall: '#c9b98f', aptBalcony: '#8a8577',
  logs: '#6e5a42', light: '#262829', granite: ['#8b8079', '#9a8f86', '#7a716b', '#a39890'], moss: '#5d6a3d',
};
const HERE = ['#ff5a3c', '#ffc23a', '#5ade6a'];

// Ett lådsegment från p0 till p1 (lokala [x, y, z]), med tjocklek t (lokal y) och bredd w (tvärs).
export function seg(b, M, p0, p1, w, t, color, kind = 'matte', opts) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], Lh = Math.hypot(dx, dz), L = Math.hypot(Lh, dy);
  if (L < 1e-6) return;
  b.box(M, (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2, L, t, w, color, kind, Math.atan2(-dz, dx), 0, Math.atan2(dy, Lh), opts);
}
// Text på en skylt: eget plan med canvas (ett ritanrop). Returnerar mesh (planet vänt mot +z).
export function signMesh(text, w, h, { bg = '#e8e4d8', fg = '#7a2e24', font = 'Oswald, Arial Narrow, sans-serif', weight = 700, border = null, glow = false, sub = null } = {}) {
  const S = 512, H = Math.max(32, Math.round(S * h / w));
  const tex = canvasTex(S, (g, s) => {
    g.fillStyle = bg; g.fillRect(0, 0, s, s);
    if (border) { g.strokeStyle = border; g.lineWidth = s * 0.03; g.strokeRect(s * 0.015, s * 0.015 * H / S * 0 + 2, s - s * 0.03, H - 4); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${weight} ${Math.round(H * (sub ? 0.42 : 0.62))}px ${font}`;
    g.fillText(text, s / 2, sub ? H * 0.34 : H / 2 + 2, s - 30);
    if (sub) { g.font = `${weight} ${Math.round(H * 0.3)}px ${font}`; g.fillText(sub, s / 2, H * 0.74, s - 30); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, ...(glow ? { emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.55 } : {}) }));
  // bara överkanten av canvasen används (H av S pixlar)
  const uv = m.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (1 - uv.getY(i)) * H / S);
  uv.needsUpdate = true;
  m.castShadow = false; m.receiveShadow = true;
  return m;
}
// Placerar en mesh i ramen M på (x, y, z) med rotation ry (i ramen).
export function placeIn(mesh, M, x, y, z, ry = 0) {
  const m = frame(M, x, y, z, ry);
  mesh.matrixAutoUpdate = false; mesh.matrix.copy(m); mesh.matrixWorldNeedsUpdate = true;
  return mesh;
}

// ---------- bron ----------
// br: { a: [u, v], b: [u, v], width, deck, ramp } i järnvägens ram. H: däckets höjd. Däck och ramper i steg om
// en meter, betongkant (fascia) under däckets kanter, pelare mellan spåren, landfästen under ramperna, räcken av
// stål och glas längs båda kanterna, belysningsstolpar. foot: gångbron (smalare, högre glasräcke, ljusare däck).
export function bridge(b, M, br, H, { foot = false, pillars = [-3.25, 1.4], corridor = [-15, 12] } = {}) {
  const uOn = v => br.a[0] + (br.a[1] - v) * (br.b[0] - br.a[0]) / (br.a[1] - br.b[1]);
  const smooth = (x0, x1, x) => { const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0))); return t * t * (3 - 2 * t); };
  const h = v => H * (1 - smooth(br.deck, br.ramp, Math.abs(v)));
  const v0 = Math.max(br.a[1], br.b[1]), v1 = Math.min(br.a[1], br.b[1]);
  // tvärs: enhetsvektor vinkelrät mot axeln (lokalt x, z)
  const ax = br.b[0] - br.a[0], az = br.b[1] - br.a[1], AL = Math.hypot(ax, az), nx = -az / AL, nz = ax / AL;
  const W = br.width, top = foot ? MP.footTop : MP.deckTop;
  const pts = [];
  for (let v = v0; v >= v1 - 1e-9; v -= 1) pts.push([uOn(v), h(v), v]);
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i], vm = (p0[2] + p1[2]) / 2, ym = (p0[1] + p1[1]) / 2;
    if (ym < 0.05) continue;
    // körbanan (ovansidan) och plattan under
    seg(b, M, [p0[0], p0[1] - 0.12, p0[2]], [p1[0], p1[1] - 0.12, p1[2]], W, 0.24, top);
    const over = vm > corridor[0] - 1 && vm < corridor[1] + 1;
    if (over) seg(b, M, [p0[0], p0[1] - 0.6, p0[2]], [p1[0], p1[1] - 0.6, p1[2]], W - 0.4, 0.75, MP.concrete);
    else {
      // landfästet: betongvägg ner till marken (rampen)
      const mx = (p0[0] + p1[0]) / 2, mz = (p0[2] + p1[2]) / 2;
      b.box(M, mx, (ym - 0.2) / 2, mz, 1.1, Math.max(0.1, ym - 0.2), W - 0.2, MP.concreteDark, 'matte', Math.atan2(-(p1[2] - p0[2]), p1[0] - p0[0]));
    }
    // kantbalkar (grå betong) och räcken
    for (const s of [-1, 1]) {
      const o = (W / 2 - 0.12) * s, q0 = [p0[0] + nx * o, p0[1], p0[2] + nz * o], q1 = [p1[0] + nx * o, p1[1], p1[2] + nz * o];
      seg(b, M, [q0[0], q0[1] - 0.45, q0[2]], [q1[0], q1[1] - 0.45, q1[2]], 0.3, over ? 1.0 : 0.6, MP.concreteLight);
      const rh = foot ? 1.5 : 1.15;
      seg(b, M, [q0[0], q0[1] + rh, q0[2]], [q1[0], q1[1] + rh, q1[2]], 0.08, 0.08, MP.steel, 'metal');
      seg(b, M, [q0[0], q0[1] + 0.5, q0[2]], [q1[0], q1[1] + 0.5, q1[2]], 0.06, 0.06, MP.steel, 'metal');
      seg(b, M, [q0[0], q0[1] + rh * 0.55 + 0.1, q0[2]], [q1[0], q1[1] + rh * 0.55 + 0.1, q1[2]], 0.04, rh * 0.8, MP.glass, 'glass');
      b.box(M, q0[0], q0[1] + rh / 2, q0[2], 0.08, rh, 0.08, MP.steelDark, 'metal');
    }
  }
  // pelare mellan spåren (två per bro), med graffiti längst ned
  for (const pv of pillars) {
    const u = uOn(pv);
    for (const s of foot ? [0] : [-1, 1]) {
      const o = foot ? 0 : (W / 2 - 1.4) * s, x = u + nx * o, z = pv + nz * o;
      b.box(M, x, (H - 0.9) / 2, z, foot ? 0.6 : 0.85, H - 0.9, foot ? 0.6 : 0.85, MP.concrete);
      b.box(M, x, 0.9, z + 0.46, 0.7, 1.1, 0.02, MP.graffiti[(Math.abs(Math.round(pv * 7 + s)) % MP.graffiti.length)]);
    }
  }
  // belysningsstolpar på vägbron
  if (!foot) for (const v of [10, -2, -14]) {
    const u = uOn(v), o = W / 2 - 0.2;
    b.put(UNIT.taper, M, u + nx * o, h(v) + 3.6, v + nz * o, 0.16, 7.2, 0.16, GP.lamp, 'metal');
    b.box(M, u + nx * (o - 0.6), h(v) + 7.2, v + nz * (o - 0.6), 1.4, 0.12, 0.3, GP.lampHead, 'metal');
    b.box(M, u + nx * (o - 0.6), h(v) + 7.12, v + nz * (o - 0.6), 1.1, 0.05, 0.22, GP.lampGlow, 'glow');
  }
}
// Trapptornet: betongkub med trappan i, platt tak med räcke (prickskyttens läge). Ramen: mitt på marken.
export function stairTower(b, M, size, hgt, { side = 1 } = {}) {
  const s = size;
  b.box(M, 0, hgt / 2, 0, s, hgt, s, MP.concrete);
  // mörka fogar och en smal glasad springa där trappan går
  for (const y of [1.4, 2.8, 4.2]) b.box(M, 0, y, 0, s + 0.04, 0.05, s + 0.04, MP.concreteDark);
  b.box(M, s / 2 + 0.02, hgt * 0.55, 0, 0.04, hgt * 0.8, 0.9, MP.glass, 'glass');
  // trappan på ena sidan: lopp av steg utanpå
  for (let k = 0; k < 10; k++) b.box(M, -s / 2 + 0.2 + k * (s - 0.4) / 10, 0.25 + k * 0.42, side * (s / 2 + 0.55), (s - 0.4) / 10 + 0.02, 0.2, 1.1, MP.concreteLight);
  for (let k = 0; k < 10; k += 3) b.box(M, -s / 2 + 0.2 + k * (s - 0.4) / 10, 0.9 + k * 0.42, side * (s / 2 + 1.08), 0.06, 1.0, 0.06, MP.steel, 'metal');
  // taket: platta, låg kant, räcke
  b.box(M, 0, hgt + 0.1, 0, s + 0.3, 0.2, s + 0.3, MP.concreteLight);
  for (const [dx, dz, w, d] of [[0, s / 2 + 0.1, s + 0.3, 0.06], [0, -s / 2 - 0.1, s + 0.3, 0.06], [s / 2 + 0.1, 0, 0.06, s + 0.3], [-s / 2 - 0.1, 0, 0.06, s + 0.3]])
    b.box(M, dx, hgt + 0.75, dz, w, 0.06, d, MP.steel, 'metal');
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(M, dx * (s / 2 + 0.1), hgt + 0.45, dz * (s / 2 + 0.1), 0.07, 0.7, 0.07, MP.steel, 'metal');
  b.box(M, -s * 0.2, hgt + 0.45, -s * 0.2, 0.9, 0.5, 0.9, MP.concreteDark);   // takluckan
  b.box(M, 0.1, 1.0, -s / 2 - 0.02, 1.2, 1.3, 0.02, MP.graffiti[1]);
}

// ---------- spåret och perrongerna ----------
// Ett spår längs lokal x från u0 till u1 vid v: makadam (ritas på marken), sliprar och räler.
export function track(b, M, u0, u1, v, gauge = 1.435) {
  for (const s of [-1, 1]) b.box(M, (u0 + u1) / 2, 0.22, v + s * gauge / 2, u1 - u0, 0.12, 0.08, MP.rail, 'metal', 0, 0, 0, { noShadow: true });
  for (let u = u0 + 0.3; u < u1; u += 0.68) b.box(M, u, 0.1, v, 0.24, 0.12, 2.5, MP.sleeper, 'matte', 0, 0, 0, { noShadow: true });
}
// Perrongen: P = { u0, u1, v0, v1, h }. Kanten mot spåret (edge: -1 = v0-sidan, 1 = v1-sidan) får vit kant och
// ljusare taktila plattor. back: rött plankstaket på baksidan (norra perrongen).
export function platform(b, M, P, { edge = 1, back = false } = {}) {
  const um = (P.u0 + P.u1) / 2, vm = (P.v0 + P.v1) / 2, L = P.u1 - P.u0, D = P.v1 - P.v0;
  b.box(M, um, P.h / 2, vm, L, P.h, D, MP.platform);
  const ev = edge > 0 ? P.v1 : P.v0;
  b.box(M, um, P.h + 0.01, ev - edge * 0.2, L, 0.03, 0.35, MP.platformEdge, 'matte', 0, 0, 0, { noShadow: true });
  b.box(M, um, P.h + 0.01, ev - edge * 0.75, L, 0.03, 0.5, MP.tactile, 'matte', 0, 0, 0, { noShadow: true });
  if (back) {
    const bv = edge > 0 ? P.v0 : P.v1;
    b.box(M, um, P.h + 1.0, bv + edge * 0.1, L, 2.0, 0.12, MP.fenceRed);
    for (let u = P.u0 + 1; u < P.u1; u += 3) b.box(M, u, P.h + 1.15, bv + edge * 0.1, 0.3, 2.3, 0.3, MP.fenceRed);
  }
  // lampor och en klocka
  for (let u = P.u0 + 6; u < P.u1 - 2; u += 14) {
    const lv = (edge > 0 ? P.v0 : P.v1) + edge * 1.2;
    b.box(M, u, P.h + 1.9, lv, 0.1, 3.8, 0.1, MP.shelterFrame, 'metal');
    b.put(UNIT.disc, M, u, P.h + 3.85, lv, 0.7, 0.08, 0.7, MP.shelterFrame, 'metal');
    b.put(UNIT.disc, M, u, P.h + 3.78, lv, 0.5, 0.04, 0.5, GP.lampGlow, 'glow');
  }
}
// Väntkuren i glas: mörk ram, glasväggar, platt tak, bänk. Ramen: mitt på perrongen (lokal x längs spåret).
export function shelter(b, M, y = 0) {
  const W = 3.6, D = 1.5, H = 2.3;
  b.box(M, 0, y + H + 0.08, 0, W + 0.3, 0.16, D + 0.3, MP.shelterRoof);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(M, dx * W / 2, y + H / 2, dz * D / 2, 0.08, H, 0.08, MP.shelterFrame, 'metal');
  b.box(M, 0, y + H / 2 + 0.1, -D / 2, W, H - 0.2, 0.04, MP.glass, 'glass');
  for (const dx of [-1, 1]) b.box(M, dx * W / 2, y + H / 2 + 0.1, 0, 0.04, H - 0.2, D, MP.glass, 'glass');
  b.box(M, 0, y + 0.45, -D / 2 + 0.3, W - 0.4, 0.08, 0.45, MP.bench);
}
// Avgångsskylten: blå ram, svart LED-yta med orange text, på en stolpe med arm. Returnerar skylten (mesh) att
// lägga i scenen; stolpen läggs i batchen.
export function departureSign(b, M, y = 0, text = '77 Gnesta  2 min') {
  b.box(M, 0, y + 1.9, 0, 0.14, 3.8, 0.14, MP.shelterFrame, 'metal');
  b.box(M, 0.9, y + 3.75, 0, 1.9, 0.1, 0.1, MP.shelterFrame, 'metal');
  b.box(M, 1.2, y + 3.25, 0, 2.5, 0.75, 0.18, MP.ledFrame, 'paint');
  const s = signMesh(text, 2.3, 0.55, { bg: MP.ledFace, fg: '#ff8a3a', font: 'monospace', weight: 700, glow: true, sub: 'Mot Södertälje C' });
  return placeIn(s, M, 1.2, y + 3.25, 0.1);
}
// Kontaktledningen: en portal av stål över spåren vid u, stolpar vid vs (järnvägens ram).
export function catenaryPortal(b, M, u, vs, h = 7.4) {
  for (const v of vs) {
    b.box(M, u, h / 2, v, 0.28, h, 0.28, MP.mast, 'metal');
    b.box(M, u, h / 2, v, 0.06, h, 0.5, MP.mast, 'metal');
  }
  const v0 = Math.min(...vs), v1 = Math.max(...vs);
  b.box(M, u, h - 0.25, (v0 + v1) / 2, 0.22, 0.22, v1 - v0 + 0.4, MP.mast, 'metal');
  b.box(M, u, h - 0.75, (v0 + v1) / 2, 0.18, 0.18, v1 - v0 + 0.4, MP.mast, 'metal');
  for (let v = v0 + 0.8; v < v1; v += 1.6) b.box(M, u, h - 0.5, v, 0.04, 0.6, 0.04, MP.mast, 'metal', 0, 0.6);
}
// Linorna: kontakttråd och bärlina över varje spår, ett LineSegments i världen. pts: [[u, y, v]...] par i ramen.
export function wires(M, pairs, color = '#2a2b28') {
  const p = new THREE.Vector3(), out = [];
  for (const [a, c] of pairs) for (const q of [a, c]) { p.set(q[0], q[1], q[2]).applyMatrix4(M); out.push(p.x, p.y, p.z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 }));
  l.frustumCulled = false;
  return l;
}
// Stängsel (nät på stolpar) längs lokal x från u0 till u1 vid v.
export function meshFence(b, M, u0, u1, v, h = 1.6) {
  for (let u = u0; u <= u1; u += 2.6) b.box(M, u, h / 2, v, 0.07, h, 0.07, MP.steelDark, 'metal');
  for (const y of [0.15, h - 0.05]) b.box(M, (u0 + u1) / 2, y, v, u1 - u0, 0.04, 0.04, MP.steelDark, 'metal');
  b.box(M, (u0 + u1) / 2, h / 2, v, u1 - u0, h - 0.2, 0.015, '#6c6f6a', 'metal', 0, 0, 0, { noShadow: true });
}

// ---------- X60 ----------
// SL:s pendeltåg: vit korg med blått band, mörkt fönsterband, grå kjol, dörrar, takutrustning och strömavtagare,
// fronten med mörkblått ansikte, strålkastare och SL-märket (blå skiva med vit ring). Ramen: tågets mitt på
// rälsens höjd, lokal x längs tåget. o: { w (längd), cars }
export function x60(b, M, o) {
  const L = o.w, n = o.cars ?? 4, Lc = L / n, W = 3.2, y0 = 0.35, Hb = 3.75;
  for (let i = 0; i < n; i++) {
    const cx = -L / 2 + (i + 0.5) * Lc, cl = Lc - 0.5;
    const nose = i === 0 ? -1 : i === n - 1 ? 1 : 0;
    const body = nose ? cl - 2.2 : cl, bx = cx - nose * 1.1;
    b.box(M, bx, y0 + 0.35, 0, body, 0.7, W - 0.2, MP.x60Skirt);
    b.box(M, bx, y0 + 0.7 + Hb / 2, 0, body, Hb, W, MP.x60);
    b.box(M, bx, y0 + 1.25, 0, body + 0.02, 0.38, W + 0.04, MP.x60Band);
    b.box(M, bx, y0 + 2.55, 0, body - 0.6, 0.85, W + 0.03, MP.x60Glass, 'glass');
    for (let x = bx - body / 2 + 1.2; x < bx + body / 2 - 0.8; x += 1.7) b.box(M, x, y0 + 2.55, 0, 0.18, 0.86, W + 0.05, MP.x60);
    // dörrar: två per sida och vagn
    for (const dx of [-0.28, 0.28]) for (const s of [-1, 1]) {
      b.box(M, cx + dx * cl, y0 + 0.7 + 1.1, s * (W / 2 + 0.03), 1.3, 2.2, 0.04, MP.x60Door);
      b.box(M, cx + dx * cl, y0 + 2.3, s * (W / 2 + 0.05), 0.9, 0.9, 0.03, MP.x60Glass, 'glass');
    }
    // tak: ljusgrå, utrustningslådor, och strömavtagaren på varannan vagn
    b.box(M, bx, y0 + 0.7 + Hb + 0.08, 0, body - 0.2, 0.16, W - 0.5, MP.x60Roof);
    b.box(M, bx - body * 0.2, y0 + 0.7 + Hb + 0.35, 0, body * 0.3, 0.4, W * 0.55, MP.x60Roof);
    b.box(M, bx + body * 0.22, y0 + 0.7 + Hb + 0.3, 0, body * 0.18, 0.3, W * 0.5, '#9a9d9c');
    if (i % 2 === 1) {
      b.box(M, bx, y0 + 0.7 + Hb + 0.6, 0, 1.8, 0.06, 0.06, MP.steelDark, 'metal', 0, 0, 0.5);
      b.box(M, bx + 0.7, y0 + 0.7 + Hb + 1.1, 0, 1.6, 0.06, 0.06, MP.steelDark, 'metal', 0, 0, -0.5);
      b.box(M, bx + 0.2, y0 + 0.7 + Hb + 1.45, 0, 0.2, 0.05, 1.6, MP.steelDark, 'metal');
    }
    // SL-märket på sidan
    for (const s of [-1, 1]) {
      b.put(UNIT.disc, M, cx + cl * 0.42, y0 + 1.85, s * (W / 2 + 0.05), 0.55, 0.03, 0.55, MP.x60Band, 'paint', 0, Math.PI / 2);
      b.put(UNIT.disc, M, cx + cl * 0.42, y0 + 1.85, s * (W / 2 + 0.07), 0.36, 0.02, 0.36, MP.x60, 'paint', 0, Math.PI / 2);
      b.put(UNIT.disc, M, cx + cl * 0.42, y0 + 1.85, s * (W / 2 + 0.09), 0.26, 0.02, 0.26, MP.x60Band, 'paint', 0, Math.PI / 2);
    }
    // bälgen till nästa vagn
    if (i < n - 1) b.box(M, cx + Lc / 2, y0 + 0.7 + Hb / 2, 0, 0.6, Hb - 0.4, W - 0.6, MP.x60Dark);
    // fronten: avsmalnande nos med mörkblått ansikte och svart ruta
    if (nose) {
      const fx = cx + nose * (cl / 2 - 1.1);
      b.box(M, fx, y0 + 0.35, 0, 2.2, 0.7, W - 0.3, MP.x60Skirt);
      b.box(M, fx - nose * 0.2, y0 + 0.7 + 1.0, 0, 1.8, 2.0, W, MP.x60);
      b.box(M, fx + nose * 0.15, y0 + 0.7 + 2.6, 0, 1.5, 1.6, W - 0.2, MP.x60, 'matte', 0, 0, -nose * 0.35);
      b.box(M, fx + nose * 0.75, y0 + 0.7 + 1.9, 0, 0.12, 2.7, W - 0.5, MP.x60Band, 'matte', 0, 0, -nose * 0.25);
      b.box(M, fx + nose * 0.86, y0 + 0.7 + 2.3, 0, 0.06, 1.3, W - 0.9, MP.x60Glass, 'glass', 0, 0, -nose * 0.3);
      for (const s of [-1, 1]) b.box(M, fx + nose * 0.95, y0 + 0.95, s * (W / 2 - 0.45), 0.06, 0.18, 0.4, GP.lampGlow, 'glow');
      b.put(UNIT.disc, M, fx + nose * 0.97, y0 + 1.5, 0, 0.5, 0.03, 0.5, MP.x60, 'paint', 0, 0, Math.PI / 2);
      b.put(UNIT.disc, M, fx + nose * 0.99, y0 + 1.5, 0, 0.32, 0.02, 0.32, MP.x60Band, 'paint', 0, 0, Math.PI / 2);
      b.box(M, fx + nose * 1.05, y0 + 0.25, 0, 0.3, 0.3, W - 0.8, '#d8c13a');   // gul/svart kofångare
    }
  }
}

// ---------- husen ----------
// Gemensamt: sockel, väggar, vita knutar och fönsterkarmar, sadeltak. Ramen: husets mitt på marken, lokal +z
// är framsidan, nocken längs x (ridgeX false: längs z).
function walls(b, M, W, D, wallH, color, { plinth = 0.4, corner = MP.white, plinthC = MP.stone } = {}) {
  b.box(M, 0, plinth / 2, 0, W + 0.2, plinth, D + 0.2, plinthC);
  b.box(M, 0, plinth + wallH / 2, 0, W, wallH, D, color);
  if (corner) for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(M, cx * (W / 2 + 0.02), plinth + wallH / 2, cz * (D / 2 + 0.02), 0.2, wallH, 0.2, corner);
  b.box(M, 0, plinth + wallH - 0.1, 0, W + 0.1, 0.2, D + 0.1, corner ?? color);
}
function gableRoof(b, M, W, D, top, rh, color, gableColor, ridgeX = true, ov = 0.4) {
  const R = ridgeX ? M : frame(M, 0, 0, 0, Math.PI / 2);
  const len = ridgeX ? W : D, span = ridgeX ? D : W, pitch = Math.atan2(rh, span / 2), t = 0.16;
  b.put(UNIT.prism, R, 0, top, 0, len, rh, span, gableColor);
  const L = (span / 2 + ov) / Math.cos(pitch);
  for (const side of [-1, 1]) {
    const zc = side * (span / 2 + ov) / 2, yc = top + rh - ((span / 2 + ov) / 2) * Math.tan(pitch);
    b.box(R, 0, yc + Math.cos(pitch) * t / 2, zc + Math.sin(pitch) * side * t / 2, len + ov * 1.4, t, L, color, 'matte', 0, side * pitch);
  }
  b.box(R, 0, top + rh + 0.05, 0, len + ov * 1.4, 0.1, 0.22, color);
}
// Fönster i väggen: side '+z' '-z' '+x' '-x', läge u längs väggen, höjd y.
function win(b, M, W, D, side, u, y, ww = 1.0, wh = 1.3, frameC = MP.white, glass = GP.glass) {
  const k = side[0] === '+' ? 1 : -1, onZ = side[1] === 'z';
  const px = onZ ? u : k * (W / 2 + 0.03), pz = onZ ? k * (D / 2 + 0.03) : u;
  b.box(M, px, y, pz, onZ ? ww : 0.06, wh, onZ ? 0.06 : ww, frameC);
  b.box(M, onZ ? u : k * (W / 2 + 0.06), y, onZ ? k * (D / 2 + 0.06) : u, onZ ? ww - 0.2 : 0.04, wh - 0.2, onZ ? 0.04 : ww - 0.2, glass, 'glass');
  b.box(M, onZ ? u : k * (W / 2 + 0.08), y, onZ ? k * (D / 2 + 0.08) : u, onZ ? 0.05 : 0.03, wh - 0.2, onZ ? 0.03 : 0.05, frameC);
}
function windowRow(b, M, W, D, side, y, n, opts = {}) {
  const along = side[1] === 'z' ? W : D;
  for (let i = 0; i < n; i++) { const u = -along / 2 + (i + 0.5) * along / n; if (opts.skip?.(u)) continue; win(b, M, W, D, side, u, y, opts.ww, opts.wh, opts.frame); }
}

// Folkets hus: stort rött trähus i två våningar, vita knutar, frontespis på långsidan, gaveln med skylten och
// dörrarna mot gatan (lokal +x). o: { len, wid, wallH, doors }. Returnerar skylten (mesh) att lägga i scenen.
export function folketsHus(b, M, o) {
  const W = o.len, D = o.wid, wallH = o.wallH, PL = 0.5, top = PL + wallH, rh = 3.6;
  walls(b, M, W, D, wallH, MP.falu);
  // panelens lodräta läkt
  for (let x = -W / 2 + 0.6; x < W / 2; x += 1.2) for (const s of [-1, 1]) b.box(M, x, PL + wallH / 2, s * (D / 2 + 0.03), 0.06, wallH, 0.03, MP.faluDark);
  gableRoof(b, M, W, D, top, rh, MP.roofSheet, MP.falu);
  // mellanlist och fönster i två rader på långsidorna, gavelfönster
  for (const s of ['+z', '-z']) { windowRow(b, M, W, D, s, PL + 1.6, 6, { wh: 1.5 }); windowRow(b, M, W, D, s, PL + 4.4, 6, { wh: 1.3 }); }
  for (const s of [-1, 1]) b.box(M, 0, PL + 3.1, s * (D / 2 + 0.04), W, 0.18, 0.05, MP.white);
  windowRow(b, M, W, D, '-x', PL + 1.6, 3); windowRow(b, M, W, D, '-x', PL + 4.4, 3);
  win(b, M, W, D, '+x', -3.2, PL + 4.4); win(b, M, W, D, '+x', 3.2, PL + 4.4);
  win(b, M, W, D, '+x', 0, top + 1.3, 1.2, 1.0);
  // frontespisen mitt på framsidan (+z)
  const fw = 6, fd = 2.2;
  b.box(M, 0, top + 0.8, D / 2 - fd / 2 + 0.3, fw, 1.6, fd, MP.falu);
  gableRoof(b, frame(M, 0, 0, D / 2 - fd / 2 + 0.3), fw, fd + 2, top + 1.6, 1.9, MP.roofSheet, MP.falu, false, 0.25);
  win(b, frame(M, 0, 0, D / 2 + 0.3 - fd / 2), fw, fd, '+z', 0, top + 1.2, 1.4, 1.1);
  for (const sx of [-1, 1]) b.box(M, sx * (fw / 2 + 0.02), top + 0.8, D / 2 + 0.3, 0.18, 1.6, 0.18, MP.white);
  // dörrarna på gaveln mot gatan, trappan och skärmtaket
  for (const z of o.doors ?? [0]) {
    b.box(M, W / 2 + 0.03, PL + 1.15, z, 0.06, 2.4, 1.3, MP.white);
    b.box(M, W / 2 + 0.07, PL + 1.1, z, 0.05, 2.2, 1.0, '#4a2a22');
  }
  b.box(M, W / 2 + 1.2, PL * 0.5, 0, 2.4, PL, 6.4, MP.stone);
  b.box(M, W / 2 + 1.3, PL + 2.75, 0, 2.6, 0.14, 8.6, MP.roofSheet, 'matte', 0, 0, -0.12);
  for (const z of [-4, 4]) b.box(M, W / 2 + 2.4, PL + 1.35, z, 0.16, 2.7, 0.16, MP.white);
  // skylten på gaveln
  const sign = signMesh('MÖLNBO FOLKETS PARK', 7, 1.0, { bg: MP.white, fg: '#2a1a14', sub: '80 år' });
  return placeIn(sign, M, W / 2 + 0.09, top - 1.0, 0, Math.PI / 2);
}
// Stationshuset: rött, vita knutar, plåttak, frontespis mot spåret, inglasad väntsal på gaveln (platt tak).
export function stationHouse(b, M, o) {
  const W = o.w, D = o.d, wallH = 3.6, PL = 0.5, top = PL + wallH, rh = 2.8;
  walls(b, M, W - 3.4, D, wallH, MP.falu);
  const M2 = frame(M, -1.7, 0, 0);
  gableRoof(b, M2, W - 3.4, D, top, rh, MP.roofSheet, MP.falu);
  windowRow(b, M2, W - 3.4, D, '+z', PL + 1.7, 4, { wh: 1.6 }); windowRow(b, M2, W - 3.4, D, '-z', PL + 1.7, 4, { wh: 1.6 });
  win(b, M2, W - 3.4, D, '-x', 0, top + 1.0, 1.0, 1.0);
  // frontespisen mot spåret (-z)
  b.box(M2, 0, top + 0.7, -D / 2 + 1, 4, 1.4, 2, MP.falu);
  gableRoof(b, frame(M2, 0, 0, -D / 2 + 1), 4, 3.6, top + 1.4, 1.5, MP.roofSheet, MP.falu, false, 0.2);
  // väntsalen i glas på östra gaveln
  const gx = W / 2 - 1.7, gw = 3.4;
  b.box(M, gx, PL / 2, 0, gw + 0.2, PL, D + 0.2, MP.stone);
  b.box(M, gx, PL + 1.5, 0, gw, 3.0, D - 0.4, MP.glass, 'glass');
  for (let z = -D / 2 + 0.2; z <= D / 2 - 0.2; z += 1.1) b.box(M, gx + gw / 2 + 0.02, PL + 1.5, z, 0.08, 3.0, 0.1, MP.white);
  for (let x = gx - gw / 2; x <= gx + gw / 2; x += 1.1) for (const s of [-1, 1]) b.box(M, x, PL + 1.5, s * (D / 2 - 0.18), 0.1, 3.0, 0.08, MP.white);
  b.box(M, gx, PL + 3.1, 0, gw + 0.6, 0.2, D, MP.white);
  b.box(M, gx, PL + 0.4, 0, gw + 0.05, 0.8, D - 0.35, MP.falu);
  // stuprör
  for (const s of [-1, 1]) b.box(M, -W / 2 + 0.2, PL + wallH / 2, s * (D / 2 + 0.1), 0.1, wallH, 0.1, MP.steelDark, 'metal');
}
// Caféet Harmoni: ljusgrå panel, två våningar, veranda med vitt räcke och trappa mot gatan (+z), trädäck med
// brunt räcke och parasoller på sidan (+x). Returnerar skyltarna (CAFÉ, HARMONI).
export function cafeHarmoni(b, M, o) {
  const W = o.w, D = o.d, wallH = 5.0, PL = 0.4, top = PL + wallH, rh = 2.5;
  walls(b, M, W, D, wallH, MP.cafe, { corner: MP.cafeTrim });
  for (let y = PL + 0.3; y < top; y += 0.3) for (const s of [-1, 1]) b.box(M, 0, y, s * (D / 2 + 0.02), W, 0.03, 0.03, '#aeb1af');
  gableRoof(b, M, W, D, top, rh, MP.roofSheet, MP.cafe);
  windowRow(b, M, W, D, '+z', PL + 1.4, 5, { wh: 1.5, ww: 1.3, frame: MP.cafeTrim });
  windowRow(b, M, W, D, '+z', PL + 3.9, 5, { wh: 1.1, frame: MP.cafeTrim });
  windowRow(b, M, W, D, '-z', PL + 3.9, 4, { frame: MP.cafeTrim });
  // frontespis med balkong
  b.box(M, -W * 0.2, top + 0.6, D / 2 - 0.8, 4.4, 1.2, 1.6, MP.cafe);
  gableRoof(b, frame(M, -W * 0.2, 0, D / 2 - 0.8), 4.4, 2.8, top + 1.2, 1.5, MP.roofSheet, MP.cafe, false, 0.2);
  // verandan: plattform, vita stolpar, vitt räcke, tak, trappa
  const vx = W * 0.15, vw = 6, vd = 2.4, vy = 0.9;
  b.box(M, vx, vy / 2, D / 2 + vd / 2, vw, vy, vd, '#8a8478');
  b.box(M, vx, vy + 0.02, D / 2 + vd / 2, vw, 0.06, vd, MP.deck);
  for (const dx of [-vw / 2, -vw / 6, vw / 6, vw / 2]) b.box(M, vx + dx, vy + 1.3, D / 2 + vd - 0.1, 0.14, 2.6, 0.14, MP.cafeTrim);
  b.box(M, vx, vy + 0.95, D / 2 + vd - 0.1, vw, 0.08, 0.08, MP.cafeTrim);
  for (let x = vx - vw / 2 + 0.15; x < vx + vw / 2; x += 0.25) if (Math.abs(x - vx) > 0.8) b.box(M, x, vy + 0.5, D / 2 + vd - 0.1, 0.05, 0.85, 0.05, MP.cafeTrim);
  b.box(M, vx, vy + 2.7, D / 2 + vd / 2, vw + 0.4, 0.14, vd + 0.4, MP.roofSheet);
  for (let k = 0; k < 4; k++) b.box(M, vx, 0.12 + k * 0.22, D / 2 + vd + 0.25 + (3 - k) * 0.3, 1.5, 0.22, 0.32, '#8a8478');
  // trädäcket (uteserveringen) med räcke, bord och parasoller
  const dx0 = W / 2 + 3.2;
  b.box(M, dx0, 0.25, 0.5, 6, 0.5, D + 1, MP.deck);
  for (const z of [-D / 2, D / 2 + 1]) b.box(M, dx0, 0.95, z, 6, 0.9, 0.08, MP.deck);
  b.box(M, dx0 + 3, 0.95, 0.5, 0.08, 0.9, D + 1, MP.deck);
  for (const [tx, tz, c] of [[-1.4, -1.5, GP.parasol[1]], [1.2, 1.2, GP.parasol[0]], [-1.2, 2.8, GP.parasol[2]]]) {
    b.box(M, dx0 + tx, 0.85, tz, 0.9, 0.06, 0.9, '#d6d1c3');
    b.box(M, dx0 + tx, 1.5, tz, 0.06, 2.0, 0.06, '#d6d1c3');
    b.put(UNIT.cone, M, dx0 + tx, 2.55, tz, 2.4, 0.5, 2.4, c);
  }
  const cafe = signMesh('CAFÉ', 1.6, 0.5, { bg: '#f2f0ea', fg: '#b3261e' });
  const name = signMesh('HARMONI', 3.2, 0.7, { bg: '#f2f0ea', fg: '#b3261e', sub: 'restaurang café pizzeria' });
  return [placeIn(cafe, M, vx, vy + 3.1, D / 2 + vd + 0.25), placeIn(name, M, W * 0.3, PL + 2.75, D / 2 + 0.1)];
}
// Missionshuset: vitt trähus med brant tak, höga fönster och en liten takryttare med spira. Nocken längs z.
export function missionHouse(b, M, o) {
  const W = o.w, D = o.d, wallH = 3.8, PL = 0.5, top = PL + wallH, rh = 3.9;
  walls(b, M, W, D, wallH, MP.mission, { corner: '#f0ece0' });
  gableRoof(b, M, W, D, top, rh, MP.roofSheet, MP.mission, false);
  for (const s of ['-x', '+x']) windowRow(b, M, W, D, s, PL + 2.0, 3, { wh: 2.4, ww: 0.9 });
  win(b, M, W, D, '+z', 0, top + 1.4, 1.0, 1.4);
  b.box(M, 0, PL + 1.2, D / 2 + 0.05, 1.6, 2.4, 0.06, '#5a3f30');
  b.box(M, 0, PL + 2.7, D / 2 + 0.6, 2.6, 0.14, 1.4, MP.roofSheet);
  // takryttaren
  b.box(M, 0, top + rh + 0.7, D * 0.2, 1.3, 1.6, 1.3, MP.mission);
  b.put(UNIT.cone, M, 0, top + rh + 2.4, D * 0.2, 1.4, 2.4, 1.4, MP.roofSheet);
  b.box(M, 0, top + rh + 4.0, D * 0.2, 0.06, 1.0, 0.06, '#b9a35a', 'metal');
  b.box(M, 0, top + rh + 4.1, D * 0.2, 0.5, 0.06, 0.06, '#b9a35a', 'metal');
}
// Det gula huset med snickarglädje: gul panel, tegeltak, glasveranda med vita svarvade stolpar på framsidan,
// sågade lister under takfoten och korsande dekor i gavlarna.
export function yellowHouse(b, M, o) {
  const W = o.w, D = o.d, wallH = 4.5, PL = 0.5, top = PL + wallH, rh = 2.8;
  walls(b, M, W, D, wallH, MP.yellow);
  gableRoof(b, M, W, D, top, rh, MP.roofTile, MP.yellow);
  for (const s of ['+z', '-z']) { windowRow(b, M, W, D, s, PL + 1.5, 4); windowRow(b, M, W, D, s, PL + 3.6, 4, { wh: 1.1 }); }
  // snickarglädje: tandlist under takfoten och kryss i gavlarna
  for (const s of [-1, 1]) for (let x = -W / 2; x <= W / 2; x += 0.45) b.box(M, x, top - 0.3, s * (D / 2 + 0.12), 0.18, 0.3, 0.05, MP.white);
  for (const s of [-1, 1]) {
    b.box(M, s * (W / 2 + 0.06), top + rh * 0.45, 0, 0.05, 0.08, D * 0.7, MP.white, 'matte', 0, 0.35);
    b.box(M, s * (W / 2 + 0.06), top + rh * 0.45, 0, 0.05, 0.08, D * 0.7, MP.white, 'matte', 0, -0.35);
    b.box(M, s * (W / 2 + 0.07), top + rh * 0.75, 0, 0.05, rh * 0.5, 0.1, MP.white);
  }
  // glasverandan med balkong ovanpå
  const vw = 4.6, vd = 2.4;
  b.box(M, 0, 0.3, D / 2 + vd / 2, vw + 0.3, 0.6, vd + 0.3, MP.stone);
  b.box(M, 0, 1.75, D / 2 + vd / 2, vw, 2.3, vd, MP.glass, 'glass');
  for (const dx of [-vw / 2, -vw / 6, vw / 6, vw / 2]) b.put(UNIT.cyl6, M, dx, 1.75, D / 2 + vd, 0.16, 2.3, 0.16, MP.white);
  b.box(M, 0, 3.0, D / 2 + vd / 2, vw + 0.3, 0.2, vd + 0.3, MP.white);
  for (let x = -vw / 2; x <= vw / 2; x += 0.3) b.box(M, x, 3.45, D / 2 + vd + 0.05, 0.05, 0.7, 0.05, MP.white);
  b.box(M, 0, 3.8, D / 2 + vd + 0.05, vw, 0.07, 0.07, MP.white);
  b.box(M, W * 0.25, top + rh * 0.6, 0, 0.6, rh * 0.8, 0.6, '#6a3a2c');
}
// Det gamla vita huset: två våningar, brutet tak (brant nedre del, flack övre), två skorstenar.
export function whiteHouse(b, M, o) {
  const W = o.w, D = o.d, wallH = 5.2, PL = 0.5, top = PL + wallH;
  walls(b, M, W, D, wallH, MP.white, { corner: '#f0ece0' });
  for (const s of ['+z', '-z']) { windowRow(b, M, W, D, s, PL + 1.5, 4, { wh: 1.5 }); windowRow(b, M, W, D, s, PL + 4.0, 4, { wh: 1.4 }); }
  // brutet tak: den branta nedre delen som en låda med lutande sidor, den flacka överst som ett prisma
  for (const s of [-1, 1]) b.box(M, 0, top + 0.8, s * (D / 2 - 0.35), W + 0.4, 0.16, 2.0, MP.roofTile, 'matte', 0, s * 1.05);
  b.box(M, 0, top + 0.8, 0, W - 0.1, 1.6, D - 1.4, MP.white);
  b.put(UNIT.prism, M, 0, top + 1.6, 0, W + 0.4, 0.9, D - 0.6, MP.roofTile);
  for (const s of [-1, 1]) win(b, frame(M, 0, 0, 0), W, D - 1.6, s > 0 ? '+z' : '-z', 0, top + 0.9, 1.0, 0.9);
  for (const x of [-W * 0.28, W * 0.28]) b.box(M, x, top + 2.6, 0, 0.7, 1.6, 0.7, '#7a3a2c');
}
// Röda kedjehus: o.units hus med branta gavlar mot gatan, hopbyggda med lägre förråd.
export function chainHouses(b, M, o) {
  const n = o.units ?? 3, W = o.w, D = o.d, uw = W / n, hw = uw * 0.62;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (i + 0.5) * uw, H = frame(M, x - (uw - hw) / 2, 0, 0);
    walls(b, H, hw, D, 2.7, MP.falu, { plinth: 0.3 });
    gableRoof(b, H, hw, D, 3.0, 2.6, MP.roofSheet, MP.falu, false);
    win(b, H, hw, D, '+z', -hw * 0.2, 1.7, 1.4, 1.3); win(b, H, hw, D, '+z', 0, 4.0, 0.8, 0.9);
    b.box(H, hw * 0.3, 1.25, D / 2 + 0.04, 1.0, 2.1, 0.06, '#3a2a22');
    // förrådet mellan husen
    const gx = x + hw / 2 + (uw - hw) / 2 - (uw - hw) / 2;
    b.box(M, gx + (uw - hw) / 2 - 0.0, 1.3, -0.5, uw - hw, 2.6, D - 1, MP.faluDark);
    b.box(M, gx + (uw - hw) / 2, 2.7, -0.5, uw - hw + 0.3, 0.2, D - 0.6, MP.roofSheet);
  }
}
// Hembygdsgården: rött trähus med vita knutar och frontespis. Gärdsgården ritas för sig (logFence).
export function hembygdsgard(b, M, o) {
  const W = o.w, D = o.d, wallH = 2.8, PL = 0.5, top = PL + wallH, rh = 2.4;
  walls(b, M, W, D, wallH, MP.falu);
  gableRoof(b, M, W, D, top, rh, MP.roofTile, MP.falu);
  for (const s of ['+z', '-z']) windowRow(b, M, W, D, s, PL + 1.5, 4, { skip: u => Math.abs(u) < 1 && s === '+z' });
  b.box(M, 0, top + 0.6, D / 2 - 0.6, 3.2, 1.2, 1.4, MP.falu);
  gableRoof(b, frame(M, 0, 0, D / 2 - 0.6), 3.2, 2.4, top + 1.2, 1.3, MP.roofTile, MP.falu, false, 0.2);
  b.box(M, 0, PL + 1.05, D / 2 + 0.05, 1.0, 2.1, 0.06, '#4a2a22');
  b.box(M, -W * 0.25, top + rh * 0.6, 0, 0.55, rh * 0.8, 0.55, '#5a3f35');
}
// Gärdsgård: lutande trästörar parvis längs en polyline (lokal ram), med liggande slanor.
export function logFence(b, M, pts) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax);
    for (let s = 0; s < L; s += 0.9) {
      const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L;
      b.box(M, x, 0.55, z, 1.5, 0.08, 0.08, MP.logs, 'matte', ry, 0, 0.75);
    }
    for (const y of [0.4, 0.75]) seg(b, M, [ax, y, az], [bx, y, bz], 0.07, 0.07, MP.logs);
    for (let s = 0; s < L; s += 2.7) { const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L; b.box(M, x, 0.6, z, 0.1, 1.2, 0.1, MP.logs); }
  }
}
// Kvarnen: högt rött hus på stenfot, tre våningar, lastlucka och hissbalk på gaveln.
export function kvarnen(b, M, o) {
  const W = o.w, D = o.d, foot = 1.6, wallH = 4.6, top = foot + wallH, rh = 3.2;
  b.box(M, 0, foot / 2, 0, W + 0.3, foot, D + 0.3, MP.stone);
  b.box(M, 0, foot + wallH / 2, 0, W, wallH, D, MP.falu);
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(M, cx * (W / 2 + 0.02), foot + wallH / 2, cz * (D / 2 + 0.02), 0.22, wallH, 0.22, MP.white);
  gableRoof(b, M, W, D, top, rh, MP.roofSheet, MP.falu);
  for (const s of ['+z', '-z']) { windowRow(b, M, W, D, s, foot + 1.4, 4, { wh: 1.0 }); windowRow(b, M, W, D, s, foot + 3.5, 4, { wh: 1.0 }); }
  b.box(M, W / 2 + 0.05, top + 0.9, 0, 0.06, 1.6, 1.3, MP.faluDark);
  b.box(M, W / 2 + 0.8, top + 2.0, 0, 1.6, 0.25, 0.25, MP.logs);
}
// Hyreshus: tre våningar, ljus puts, balkonger mot gatan.
export function apartment(b, M, o) {
  const W = o.w, D = o.d, wallH = 6.0, PL = 0.3, top = PL + wallH;
  walls(b, M, W, D, wallH, MP.aptWall, { corner: null, plinth: PL });
  gableRoof(b, M, W, D, top, 2.4, MP.roofTile, MP.aptWall);
  for (const s of ['+z', '-z']) for (const y of [PL + 1.2, PL + 3.2, PL + 5.1]) windowRow(b, M, W, D, s, y, 7, { wh: 1.1 });
  for (let i = 0; i < 4; i++) for (const y of [PL + 2.2, PL + 4.2]) b.box(M, -W / 2 + (i + 0.5) * W / 4, y, D / 2 + 0.6, 2.6, 0.9, 1.2, MP.aptBalcony);
}
// Trafikljus: grå stolpe, svart låda med tre ljus mot +x, tryckknapp.
export function trafficLight(b, M, lit = 0) {
  b.box(M, 0, 1.6, 0, 0.12, 3.2, 0.12, '#5a5d5b', 'metal');
  b.box(M, 0.12, 2.9, 0, 0.22, 0.95, 0.36, MP.light, 'paint');
  HERE.forEach((c, i) => b.box(M, 0.24, 3.2 - i * 0.3, 0, 0.03, 0.2, 0.2, i === lit ? c : '#2a2a28', i === lit ? 'glow' : 'matte'));
  b.box(M, 0.1, 1.1, 0, 0.12, 0.22, 0.14, '#c9a23a');
  b.box(M, 0.0, 3.5, 0, 0.3, 0.06, 0.3, MP.light, 'paint');
}
// Bergskärningen: grå-rosa granit i block längs lokal x (L meter), djup D, höjd H, med lite mossa.
export function rockCut(b, M, L, D, H, r) {
  for (let x = -L / 2; x < L / 2; x += r.range(1.4, 2.4)) {
    const s = r.range(1.6, 2.8), h = H * r.range(0.6, 1.05);
    b.put(UNIT.blob, M, x, h * 0.45, r.range(-D * 0.2, D * 0.2), s * 1.3, h, D * r.range(0.9, 1.3), r.pick(MP.granite), 'matte', r() * 6);
    if (r() < 0.35) b.put(UNIT.blob, M, x + r.range(-0.5, 0.5), h * 0.92, r.range(-0.4, 0.4), s * 0.8, 0.35, D * 0.6, MP.moss, 'matte', r() * 6);
  }
}
// Räcket längs Fagernäsvägen mot spåret: stålräcke på stolpar (lokal x).
export function roadRail(b, M, u0, u1, v) {
  b.box(M, (u0 + u1) / 2, 0.75, v, u1 - u0, 0.06, 0.06, MP.steel, 'metal');
  b.box(M, (u0 + u1) / 2, 0.45, v, u1 - u0, 0.06, 0.06, MP.steel, 'metal');
  for (let u = u0; u <= u1; u += 2) b.box(M, u, 0.45, v, 0.08, 0.9, 0.08, MP.steelDark, 'metal');
}
