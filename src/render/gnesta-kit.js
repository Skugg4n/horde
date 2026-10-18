// Byggsats för Gnesta: villor, trädgård, gata, ishall och skog.
// Allt läggs i en batch: varje (geometri, materialsort) blir en InstancedMesh med färg per
// instans. Ett helt kvarter blir då några tiotal ritanrop i stället för tusentals meshar.
// Geometrierna kommer från kit.js-cachen (enhetskub, cylindrar osv.) och skalas per instans.
import * as THREE from 'three';
import { mat, geo, canvasTex } from './kit.js';

// Gnestas palett: en sommardag i en svensk villastad, dammig och avmättad som resten.
export const GP = {
  // fasader
  facade: {
    white: '#d6d1c3', grey: '#b3b1a8', yellow: '#cbbb8e', brick: '#8e5a46', brickGrey: '#a5a198',
    blueGrey: '#8f9a9a', brown: '#6a5240', red: '#7c3a2c', beige: '#b9a687',
  },
  roof: { black: '#3e3e3e', charcoal: '#4a4c4e', tile: '#66402f', slate: '#565c60' },
  trim: '#e0dbcd', plinth: '#57534b', glass: '#1d2226', glassSky: '#5d6a70', door: ['#3b3027', '#5a4636', '#6b2c22', '#2f3a3f', '#d6d1c3'],
  chimney: ['#5a3f35', '#6d6a62', '#3a3836'], metal: '#7b7d7b', sheet: '#2b2e30', solar: '#1f2833',
  // trädgård
  lawn: '#7e8a55', lawnMown: '#85915a', hedge: ['#52703a', '#5b7a3f', '#4c6835', '#627e45'],
  leaf: ['#55733a', '#617d40', '#4e6a34', '#6b8445', '#486432'], leafAutumn: '#8a7a3a',
  bark: '#3a2f25', birch: '#d3cec0', birchLeaf: ['#7a8a44', '#6e8240', '#86934b'],
  pine: ['#3a5232', '#425a36', '#34492e'], spruce: ['#2e4430', '#354c35', '#293e2c'], pineBark: '#6a4b33',
  picket: '#d9d4c6', slat: ['#7d776b', '#6e695f', '#8a8376'], post: '#4f4a42',
  mailbox: ['#2f4a35', '#2a2c2e', '#6b2c22', '#8a8c88'], tramp: '#3e5566', trampMat: '#1a1b1c',
  furniture: ['#6b5a45', '#d6d1c3', '#3a3b3c'], parasol: ['#c9bea3', '#7c3a2c', '#4b5d6a'],
  car: ['#8a8c88', '#2c2f33', '#6b2f22', '#3e4a52', '#d2cfc5', '#4a5444', '#7b6a45'],
  tire: '#151413', carGlass: '#1d1c1a', trailer: '#8e918d',
  // gata
  curb: '#a8a395', lamp: '#6f716e', lampHead: '#4a4c4a', lampGlow: '#efe3c0', sign: '#2f5d8a', signWhite: '#e8e4d8',
  cabinet: '#7c8670', flag: '#d8d4c8',
  // sporthallen
  hallWall: '#9c9c95', hallWallDark: '#6e6f6b', hallRoof: '#3a3c3e', hallSolar: '#2c3e5a', hallBlue: '#40618a',
  // ishallen
  rinkRed: '#7a2e24', rinkRedDark: '#5e2219', rinkWhite: '#dcd8cc', rinkRoof: '#3d3f40', annexRoof: '#5a3a2b', signGreen: '#2f6b48',
  // lekplats
  sand: '#bfae86', play: ['#7c3a2c', '#c49a3c', '#3e5566', '#4f6a3a'], wood: '#7a6146',
  // mark (målas på canvas)
  grass: '#7f8650', grassDry: '#7e7d4d', forestFloor: '#575a3d', gravel: '#9a8c6f', gravelDark: '#7d7158',
  dirtRoad: '#8a7a5c', asphalt: '#625d54', paving: '#958f81', line: '#d9d2bf',
};

// ---------- enhetsgeometrier ----------
// Gavelprisma: triangel i (z, y), spetsen på y = 1, längd 1 längs x. Utan botten.
function prismGeo() {
  const g = new THREE.BufferGeometry();
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-0.5, 1, 0], F = [0.5, 1, 0];
  const tris = [D, C, F, D, F, E, B, A, E, B, E, F, A, D, E, C, B, F];
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}
// Valmat tak: rygg på y = 1 från x = -k till k.
function hipGeo(k) {
  const g = new THREE.BufferGeometry();
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-k, 1, 0], F = [k, 1, 0];
  const tris = [D, C, F, D, F, E, B, A, E, B, E, F, A, D, E, C, B, F];
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}
const G = {};
export const UNIT = {
  get box() { return geo('box', 1, 1, 1); },
  get cyl() { return G.cyl ??= geo('cylinder', 0.5, 0.5, 1, 8); },
  get cyl6() { return geo('cylinder', 0.5, 0.5, 1, 6); },
  get taper() { return geo('cylinder', 0.32, 0.5, 1, 6); },
  get cone() { return geo('cylinder', 0, 0.5, 1, 7); },
  get blob() { return geo('dodeca', 0.5, 0); },
  get ball() { return geo('sphere', 0.5, 7, 5); },
  get wheel() { return geo('cylinder', 0.5, 0.5, 1, 10); },
  get disc() { return geo('cylinder', 0.5, 0.5, 1, 16); },
  get ring() { return geo('torus', 0.5, 0.04, 4, 18); },
  get prism() { return G.prism ??= prismGeo(); },
  get hip() { return G.hip ??= hipGeo(0.22); },
};

// ---------- transformer ----------
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
// Lokal ram: förälder * flytt * rotation (ry, rx, rz). Returnerar ny Matrix4.
export function frame(parent, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
  const m = new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(1, 1, 1));
  return parent ? parent.clone().multiply(m) : m;
}

// ---------- batch ----------
const KINDS = {
  matte: () => mat('#ffffff'),
  glass: () => mat('#ffffff', { roughness: 0.25, metalness: 0.35 }),
  metal: () => mat('#ffffff', { roughness: 0.5, metalness: 0.45 }),
  paint: () => mat('#ffffff', { roughness: 0.55, metalness: 0.25 }),
  panel: () => mat('#ffffff', { roughness: 0.7, metalness: 0.1 }),
  glow: () => mat('#ffffff', { emissive: '#ffe2a8', emissiveIntensity: 0.25 }),
};
export function createBatch() {
  const groups = new Map();
  const _m = new THREE.Matrix4(), _c = new THREE.Color();
  let count = 0;
  const b = {
    // tag: läggs på varje instans som byggs medan den är satt (fortify.js röjer runt pjäserna).
    tag: null,
    tagged: [],
    // geometri g i ramen M, med mitt (x,y,z), storlek (sx,sy,sz), färg, och rotation i ramen
    put(g, M, x, y, z, sx, sy, sz, color, kind = 'matte', ry = 0, rx = 0, rz = 0, opts) {
      const key = g.uuid + '|' + kind + (opts?.noShadow ? '|ns' : '');
      let grp = groups.get(key);
      if (!grp) { grp = { g, kind, m: [], c: [], t: [], noShadow: !!opts?.noShadow }; groups.set(key, grp); }
      grp.t.push(b.tag);
      _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
      grp.m.push(M ? M.clone().multiply(_m) : _m.clone());
      grp.c.push(color);
      count++;
    },
    box(M, x, y, z, sx, sy, sz, color, kind, ry, rx, rz, opts) { b.put(UNIT.box, M, x, y, z, sx, sy, sz, color, kind, ry, rx, rz, opts); },
    get count() { return count; },
    flush(parent) {
      const out = [];
      for (const grp of groups.values()) {
        const im = new THREE.InstancedMesh(grp.g, KINDS[grp.kind](), grp.m.length);
        im.userData.kind = grp.kind;
        grp.m.forEach((m4, i) => { im.setMatrixAt(i, m4); im.setColorAt(i, _c.set(grp.c[i])); if (grp.t[i]) b.tagged.push({ mesh: im, i, tag: grp.t[i] }); });
        im.castShadow = !grp.noShadow; im.receiveShadow = true;
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        parent.add(im); out.push(im);
      }
      groups.clear(); count = 0;
      return out;
    },
  };
  return b;
}

// små hjälpare
export function seeded(seed) {
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (a0, a1) => a0 + r() * (a1 - a0);
  r.pick = arr => arr[(r() * arr.length) | 0];
  return r;
}

// ---------- villa ----------
// Lokal ram: origo mitt på huset vid marken, framsidan (dörren) mot +z, w längs x, d längs z.
// o: { w, d, storeys (1 | 1.5), roof ('gable' | 'hip'), ridge ('x' | 'z'), facade, roofColor,
//      garage (-1 vänster, 1 höger, 0 inget), chimney, veranda, balcony, solar, seed }
export function villa(b, M, o) {
  const r = seeded(o.seed ?? 1);
  const W = o.w, D = o.d;
  const fac = GP.facade[o.facade] ?? o.facade ?? GP.facade.white;
  const roofC = GP.roof[o.roofColor] ?? o.roofColor ?? GP.roof.black;
  const board = !['brick', 'brickGrey'].includes(o.facade);
  const PL = 0.32;                                         // sockel
  const wallH = o.storeys === 1.5 ? 3.3 : 2.75;
  const top = PL + wallH;
  // sockel och väggar
  b.box(M, 0, PL / 2, 0, W + 0.16, PL, D + 0.16, GP.plinth);
  b.box(M, 0, PL + wallH / 2, 0, W, wallH, D, fac);
  if (board) for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
    b.box(M, cx * (W / 2 + 0.01), PL + wallH / 2, cz * (D / 2 + 0.01), 0.16, wallH, 0.16, GP.trim);
  // takfot (vit list under taket)
  b.box(M, 0, top - 0.09, 0, W + 0.1, 0.18, D + 0.1, GP.trim);

  // tak
  const ridgeX = (o.ridge ?? 'x') === 'x';
  const len = ridgeX ? W : D, span = ridgeX ? D : W;
  const pitch = o.pitch ?? (o.storeys === 1.5 ? 0.74 : (o.roof === 'hip' ? 0.4 : 0.47));
  const rh = (span / 2) * Math.tan(pitch);
  const R = ridgeX ? M : frame(M, 0, 0, 0, Math.PI / 2);   // takets ram: ryggen längs x
  const ov = 0.45, t = 0.16;
  if (o.roof === 'hip') {
    b.put(UNIT.hip, R, 0, top - 0.02, 0, len + ov * 2, rh + ov * Math.tan(pitch), span + ov * 2, roofC);
    // lite lägre ner så att takfoten sticker ut
  } else {
    b.put(UNIT.prism, R, 0, top, 0, len, rh, span, fac);  // gavelspetsarna i fasadfärg
    const L = (span / 2 + ov) / Math.cos(pitch);
    for (const side of [-1, 1]) {
      const zc = side * (span / 2 + ov - (span / 2 + ov) / 2) , yc = top + rh - ((span / 2 + ov) / 2) * Math.tan(pitch);
      // flytta ut halva tjockleken längs takets normal
      const nx = Math.sin(pitch) * side, ny = Math.cos(pitch);
      b.box(R, 0, yc + ny * t / 2, zc + nx * t / 2, len + ov * 2 * 0.7, t, L, roofC, 'matte', 0, side * pitch);
    }
    // nock
    b.box(R, 0, top + rh + 0.05, 0, len + ov * 1.4, 0.1, 0.22, roofC);
    // solceller på ena takfallet
    if (o.solar) {
      const sl = Math.min(len * 0.7, 7), sw = L * 0.55;
      const zc = (span / 2) * 0.5, yc = top + rh * 0.5;
      b.box(R, 0, yc + Math.cos(pitch) * (t + 0.04), zc + Math.sin(pitch) * (t + 0.04), sl, 0.05, sw, GP.solar, 'panel', 0, pitch);
    }
  }
  // skorsten
  if (o.chimney) {
    const cx = (r() - 0.5) * len * 0.5, cz = (r() < 0.5 ? -1 : 1) * span * 0.12;
    const ch = rh + 0.9, cc = r.pick(GP.chimney);
    b.box(R, cx, top + ch / 2 + 0.1, cz, 0.62, ch, 0.62, cc);
    b.box(R, cx, top + ch + 0.16, cz, 0.78, 0.1, 0.78, GP.sheet);
  }

  // fönster: ram + glas, på väggarna. win(väggens normal, läge längs väggen, höjd)
  const win = (side, u, y, ww = 1.15, wh = 1.2) => {
    // side: '+z' '-z' '+x' '-x'
    const k = side[0] === '+' ? 1 : -1, onZ = side[1] === 'z';
    const px = onZ ? u : k * (W / 2 + 0.03), pz = onZ ? k * (D / 2 + 0.03) : u;
    const sx = onZ ? ww : 0.08, sz = onZ ? 0.08 : ww;
    b.box(M, px, y, pz, sx, wh, sz, GP.trim);
    const gx = onZ ? u : k * (W / 2 + 0.06), gz = onZ ? k * (D / 2 + 0.06) : u;
    b.box(M, gx, y, gz, onZ ? ww - 0.2 : 0.05, wh - 0.2, onZ ? 0.05 : ww - 0.2, r() < 0.25 ? GP.glassSky : GP.glass, 'glass');
  };
  const wy = PL + 1.45;
  const doorX = (r() < 0.5 ? -1 : 1) * Math.min(W / 2 - 1.4, W * 0.18);
  const nf = Math.max(1, Math.floor((W - 1.2) / 2.3));
  for (let i = 0; i < nf; i++) {
    const u = -W / 2 + (i + 0.5) * W / nf;
    if (Math.abs(u - doorX) > 1.1) win('+z', u, wy, r() < 0.3 ? 1.7 : 1.15);
    if (r() < 0.85) win('-z', u, wy, r() < 0.4 ? 2.0 : 1.15, r() < 0.3 ? 1.9 : 1.2);
  }
  const ns = Math.max(1, Math.floor((D - 1.4) / 2.6));
  for (let i = 0; i < ns; i++) {
    const u = -D / 2 + (i + 0.5) * D / ns;
    if (!(o.garage === -1 && Math.abs(u) < D * 0.4)) win('-x', u, wy);
    if (!(o.garage === 1 && Math.abs(u) < D * 0.4)) win('+x', u, wy);
  }
  // gavelfönster på övervåningen (1,5 plan)
  if (o.storeys === 1.5 || rh > 2.2) {
    const gy = top + Math.min(rh * 0.38, 1.4);
    if (ridgeX) { win('+x', 0, gy, 1.0, 1.1); win('-x', 0, gy, 1.0, 1.1); }
    else { win('+z', 0, gy, 1.6, 1.3); win('-z', 0, gy, 1.0, 1.1); }
  }
  // dörr med smygtak
  b.box(M, doorX, PL + 1.1, D / 2 + 0.03, 1.22, 2.25, 0.08, GP.trim);
  b.box(M, doorX, PL + 1.05, D / 2 + 0.07, 0.98, 2.08, 0.06, r.pick(GP.door));
  b.box(M, doorX, PL + 0.05, D / 2 + 0.6, 1.8, 0.14, 1.1, GP.paving);       // trappsten
  if (r() < 0.7) b.box(M, doorX, PL + 2.55, D / 2 + 0.55, 1.7, 0.1, 1.15, roofC);

  // balkong på gaveln mot gatan (1,5 plan med ryggen tvärs gatan)
  if (o.balcony && !ridgeX) {
    const by = top + 0.05, bw = Math.min(W * 0.55, 3.6);
    b.box(M, 0, by, D / 2 + 0.65, bw, 0.14, 1.3, GP.trim);
    b.box(M, 0, by + 0.5, D / 2 + 1.27, bw, 0.85, 0.05, GP.trim);
    for (const sx of [-1, 1]) b.box(M, sx * (bw / 2 - 0.03), by + 0.5, D / 2 + 0.65, 0.05, 0.85, 1.3, GP.trim);
    for (const sx of [-1, 1]) b.box(M, sx * (bw / 2 - 0.1), (by) / 2, D / 2 + 1.2, 0.14, by, 0.14, GP.trim);
    b.box(M, 0, by + 1.05, D / 2 + 0.05, 1.0, 1.9, 0.06, GP.glass, 'glass');
  }
  // inglasat uterum på baksidan
  if (o.veranda) {
    const vw = Math.min(W * 0.5, 4.2), vx = (r() - 0.5) * (W - vw) * 0.8;
    b.box(M, vx, 0.15, -D / 2 - 1.3, vw + 0.4, 0.3, 2.8, GP.facade.brown);
    b.box(M, vx, 1.45, -D / 2 - 1.2, vw, 2.3, 2.3, GP.glassSky, 'glass');
    b.box(M, vx, 2.65, -D / 2 - 1.2, vw + 0.3, 0.12, 2.6, GP.trim);
    for (const sx of [-1, 1]) b.box(M, vx + sx * vw / 2, 1.45, -D / 2 - 2.33, 0.1, 2.3, 0.1, GP.trim);
  }
  // garage i husets förlängning
  if (o.garage) {
    const gw = 3.7, gd = Math.min(D * 0.95, 6.4), gh = 2.6, gx = o.garage * (W / 2 + gw / 2);
    const gz = D / 2 - gd / 2;
    b.box(M, gx, gh / 2, gz, gw, gh, gd, fac);
    b.box(M, gx, gh + 0.1, gz, gw + 0.5, 0.2, gd + 0.5, roofC);
    b.box(M, gx, 1.05, gz + gd / 2 + 0.03, 2.7, 2.1, 0.06, GP.trim);
    for (let k = 0; k < 4; k++) b.box(M, gx, 0.35 + k * 0.5, gz + gd / 2 + 0.07, 2.6, 0.04, 0.03, GP.facade.grey);
  }
  // stuprör vid hörnen
  for (const sx of [-1, 1]) b.box(M, sx * (W / 2 + 0.08), PL + wallH / 2, D / 2 + 0.08, 0.09, wallH, 0.09, GP.sheet, 'metal');
  // 0.12.0 (H101): dörren och ett fönster på framsidan (vilande smittade markeras och dörren slås upp)
  const winU = (() => { for (let i = 0; i < nf; i++) { const u = -W / 2 + (i + 0.5) * W / nf; if (Math.abs(u - doorX) > 1.1) return u; } return null; })();
  return { doorX, doorY: PL + 1.05, frontZ: D / 2, winU, winY: wy };
}

// Lång låg byggnad (förskolan): villans regler, längre och med fler dörrar.
export function preschool(b, M, o) {
  const front = villa(b, M, { ...o, storeys: 1, roof: 'gable', ridge: 'x', pitch: 0.07 /* 0.12.0: platt tak (PRESCHOOL_PITCH) */, garage: 0, balcony: false, veranda: false, chimney: false });
  b.box(M, 0, 1.4, o.d / 2 + 1.0, o.w * 0.6, 0.12, 2.0, GP.roof.charcoal);  // skärmtak
  for (const sx of [-1, 1]) b.box(M, sx * o.w * 0.28, 0.7, o.d / 2 + 1.9, 0.12, 1.4, 0.12, GP.trim);
  return front;
}

// Verkstad/butik: plåt och port.
export function shop(b, M, o) {
  const front = villa(b, M, { ...o, storeys: 1, roof: 'gable', pitch: 0.3, garage: 0, balcony: false, veranda: false, chimney: false, solar: false });
  b.box(M, -o.w * 0.2, 1.4, o.d / 2 + 0.05, 3.2, 2.8, 0.08, GP.facade.grey);
  return front;
}

// ---------- trädgård ----------
// Häck längs a-b (världskoordinater): kantig, i bitar om 2-3 m med ojämn höjd.
export function hedge(b, ax, az, bx, bz, r, h = 1.7, w = 0.95) {
  const L = Math.hypot(bx - ax, bz - az); if (L < 0.4) return;
  const ry = -Math.atan2(bz - az, bx - ax);
  const n = Math.max(1, Math.round(L / 2.6));
  const color = r.pick(GP.hedge);
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
    const hh = h * r.range(0.9, 1.08), ww = w * r.range(0.92, 1.1);
    b.box(null, ax + (bx - ax) * tm, hh / 2, az + (bz - az) * tm, L / n + 0.12, hh, ww, color, 'matte', ry);
  }
}
// Staket längs a-b. kind: 'picket' (vit spjäl) eller 'slat' (grå tät spjäl, ojämn topp).
export function fence(b, ax, az, bx, bz, r, kind = 'picket') {
  const L = Math.hypot(bx - ax, bz - az); if (L < 0.3) return;
  const ry = -Math.atan2(bz - az, bx - ax);
  const M = frame(null, ax, 0, az, ry);
  const picket = kind === 'picket';
  const H = picket ? 0.95 : 1.15, step = picket ? 0.16 : 0.12, color = picket ? GP.picket : r.pick(GP.slat);
  for (let x = 0; x <= L; x += 2.4) b.box(M, x, H / 2 + 0.05, 0, 0.1, H + 0.1, 0.1, picket ? GP.picket : GP.post);
  for (const y of [0.25, H - 0.2]) b.box(M, L / 2, y, 0.05, L, 0.07, 0.035, color);
  for (let x = step / 2; x < L; x += step) {
    const hh = picket ? H : H * r.range(0.96, 1.04);
    b.box(M, x, hh / 2, 0.09, picket ? 0.075 : 0.095, hh, 0.022, color);
    if (picket) b.box(M, x, hh + 0.03, 0.09, 0.05, 0.06, 0.022, color, 'matte', 0, 0, Math.PI / 4);
  }
}
export function mailbox(b, M, n = 1, r) {
  b.box(M, 0, 0.55, 0, 0.08, 1.1, 0.08, GP.post);
  b.box(M, 0, 1.08, 0, 0.18 + n * 0.4, 0.06, 0.4, GP.post);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.42;
    b.box(M, x, 1.27, 0, 0.32, 0.32, 0.44, r.pick(GP.mailbox), 'paint');
  }
}
// Lövträd: stam och en till tre klumpar. k varierar formen.
export function gardenTree(b, M, h = 5.5, k = 0, r) {
  const trunk = h * 0.38;
  b.put(UNIT.taper, M, 0, trunk / 2, 0, 0.32, trunk, 0.32, GP.bark);
  const c = r.pick(GP.leaf), R = h * 0.36;
  b.put(UNIT.blob, M, 0, trunk + R * 0.75, 0, R * 2, R * 1.8, R * 2, c, 'matte', r() * 6);
  if (k > 0) b.put(UNIT.blob, M, R * 0.55, trunk + R * 0.4, R * 0.2, R * 1.3, R * 1.2, R * 1.3, r.pick(GP.leaf), 'matte', r() * 6);
  if (k > 1) b.put(UNIT.blob, M, -R * 0.4, trunk + R * 1.3, -R * 0.3, R * 1.2, R * 1.1, R * 1.2, c, 'matte', r() * 6);
}
export function trampoline(b, M) {
  b.put(UNIT.disc, M, 0, 0.82, 0, 3.0, 0.04, 3.0, GP.trampMat, 'matte', 0, 0, 0, { noShadow: false });
  b.put(UNIT.ring, M, 0, 0.84, 0, 3.4, 3.4, 3.4, GP.tramp, 'matte', 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.box(M, Math.cos(a) * 1.6, 0.42, Math.sin(a) * 1.6, 0.06, 0.84, 0.06, GP.metal, 'metal'); }
  // skyddsnät: stolpar
  for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI * 2; b.box(M, Math.cos(a) * 1.68, 1.55, Math.sin(a) * 1.68, 0.05, 1.5, 0.05, GP.sheet); }
}
export function furniture(b, M, r) {
  const c = r.pick(GP.furniture);
  b.box(M, 0, 0.72, 0, 1.6, 0.06, 0.9, c);
  b.box(M, 0, 0.36, 0, 0.1, 0.72, 0.1, c);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box(M, sx * 0.5, 0.23, sz * 0.75, 0.46, 0.46, 0.44, c);
    b.box(M, sx * 0.5, 0.65, sz * 0.97, 0.46, 0.45, 0.06, c);
  }
  if (r() < 0.6) {
    b.box(M, 0, 1.3, 0, 0.05, 1.3, 0.05, GP.metal, 'metal');
    b.put(UNIT.cone, M, 0, 2.1, 0, 2.6, 0.55, 2.6, r.pick(GP.parasol));
  }
}
// Parkerad bil, längd längs x.
// 0.17.2 (Olas önskan): var fjärde parkerad bil är en fyrkantig Volvo-kombi (240-stil), på alla banor
let carN = 0;
export function car(b, M, color) {
  if (++carN % 4 === 0) { volvoEstate(b, M, color); return; }
  b.box(M, 0, 0.62, 0, 4.3, 0.72, 1.82, color, 'paint');
  b.box(M, -0.25, 1.28, 0, 2.3, 0.62, 1.66, color, 'paint');
  b.box(M, -0.25, 1.28, 0, 2.08, 0.5, 1.7, GP.carGlass, 'glass');
  b.box(M, 0.98, 1.24, 0, 0.2, 0.46, 1.6, GP.carGlass, 'glass', 0, 0, -0.6);
  for (const [wx, wz] of [[-1.35, 0.84], [1.35, 0.84], [-1.35, -0.84], [1.35, -0.84]])
    b.put(UNIT.wheel, M, wx, 0.36, wz, 0.72, 0.26, 0.72, GP.tire, 'matte', 0, Math.PI / 2);
}
// Volvo 240 kombi: lång, fyrkantig, platt tak ända bak, rak baklucka, svarta stötfångare, grill med sned ribba
// och fyrkantiga lyktor, takräcke. Samma fotavtryck som car (4,3 x 1,82 m), fram mot +x. o.burnt: utbränd.
export function volvoEstate(b, M, color, o = {}) {
  const body = o.burnt ? '#2a2623' : color, k = o.burnt ? 'matte' : 'paint', glass = o.burnt ? '#1c1a18' : GP.carGlass;
  b.box(M, 0.02, 0.6, 0, 4.12, 0.62, 1.74, body, k);
  b.box(M, -0.42, 1.2, 0, 2.95, 0.58, 1.66, body, k);
  b.box(M, -0.42, 1.21, 0, 2.75, 0.44, 1.7, glass, o.burnt ? 'matte' : 'glass');
  b.box(M, -0.42, 1.21, 0, 0.12, 0.46, 1.71, body, k);
  b.box(M, 1.1, 1.18, 0, 0.18, 0.5, 1.56, glass, o.burnt ? 'matte' : 'glass', 0, 0, -0.55);
  b.box(M, -1.92, 1.2, 0, 0.06, 0.42, 1.44, glass, o.burnt ? 'matte' : 'glass');
  b.box(M, 2.1, 0.66, 0, 0.04, 0.24, 1.0, '#26262a');
  b.box(M, 2.11, 0.66, 0, 0.02, 0.04, 1.04, '#b9b6ad', 'metal', 0, 0.26);
  for (const z of [-0.64, 0.64]) b.box(M, 2.1, 0.68, z, 0.04, 0.18, 0.26, '#e6dfc4');
  for (const x of [2.13, -2.1]) b.box(M, x, 0.4, 0, 0.14, 0.14, 1.78, '#1f1f1d');
  for (const z of [-0.62, 0.62]) b.box(M, -0.5, 1.52, z, 2.4, 0.04, 0.05, '#2a2a28', 'metal');
  for (const [wx, wz] of [[-1.38, 0.82], [1.32, 0.82], [-1.38, -0.82], [1.32, -0.82]])
    b.put(UNIT.wheel, M, wx, 0.34, wz, 0.68, 0.24, 0.68, o.burnt ? '#1c1a18' : GP.tire, 'matte', 0, Math.PI / 2);
}
// Släpkärra, dragstången mot +x.
export function trailer(b, M) {
  b.box(M, 0, 0.62, 0, 2.3, 0.08, 1.3, GP.trailer, 'metal');
  for (const sz of [-1, 1]) b.box(M, 0, 0.82, sz * 0.63, 2.3, 0.36, 0.04, GP.trailer, 'metal');
  for (const sx of [-1, 1]) b.box(M, sx * 1.13, 0.82, 0, 0.04, 0.36, 1.3, GP.trailer, 'metal');
  for (const sz of [-1, 1]) b.put(UNIT.wheel, M, 0, 0.3, sz * 0.78, 0.6, 0.2, 0.6, GP.tire, 'matte', 0, Math.PI / 2);
  b.box(M, 1.75, 0.5, 0, 1.3, 0.08, 0.08, GP.sheet, 'metal');
}

// ---------- gata ----------
// Gatlykta: stolpe, arm mot gatan (+x i ramen) och armatur.
export function lamp(b, M) {
  b.put(UNIT.taper, M, 0, 3.2, 0, 0.18, 6.4, 0.18, GP.lamp, 'metal');
  b.box(M, 0.75, 6.35, 0, 1.6, 0.08, 0.08, GP.lamp, 'metal', 0, 0, 0.12);
  b.box(M, 1.55, 6.38, 0, 0.62, 0.14, 0.26, GP.lampHead, 'metal');
  b.box(M, 1.55, 6.29, 0, 0.5, 0.05, 0.2, GP.lampGlow, 'glow');
}
export function curb(b, ax, az, bx, bz) {
  const L = Math.hypot(bx - ax, bz - az); if (L < 0.05) return;
  b.box(null, (ax + bx) / 2, 0.06, (az + bz) / 2, L + 0.02, 0.13, 0.16, GP.curb, 'matte', -Math.atan2(bz - az, bx - ax), 0, 0, { noShadow: true });
}

// ---------- skog ----------
export function spruce(b, x, z, h, r) {
  const M = frame(null, x, 0, z, r() * 6);
  b.put(UNIT.cyl6, M, 0, h * 0.12, 0, 0.3, h * 0.24, 0.3, GP.bark);
  const c = r.pick(GP.spruce);
  b.put(UNIT.cone, M, 0, h * 0.42, 0, h * 0.42, h * 0.55, h * 0.42, c);
  b.put(UNIT.cone, M, 0, h * 0.72, 0, h * 0.3, h * 0.45, h * 0.3, c);
}
export function pine(b, x, z, h, r) {
  const M = frame(null, x, 0, z, r() * 6);
  b.put(UNIT.taper, M, 0, h * 0.36, 0, 0.36, h * 0.72, 0.36, GP.pineBark);
  const c = r.pick(GP.pine), R = h * 0.2;
  b.put(UNIT.blob, M, 0, h * 0.8, 0, R * 2.2, R * 1.2, R * 2.2, c, 'matte', r() * 6);
  b.put(UNIT.blob, M, R * 0.6, h * 0.68, -R * 0.3, R * 1.4, R * 0.8, R * 1.4, c, 'matte', r() * 6);
}
export function birch(b, x, z, h, r) {
  const M = frame(null, x, 0, z, r() * 6);
  b.put(UNIT.taper, M, 0, h * 0.4, 0, 0.24, h * 0.8, 0.24, GP.birch);
  const c = r.pick(GP.birchLeaf), R = h * 0.2;
  b.put(UNIT.blob, M, 0, h * 0.68, 0, R * 1.8, R * 2.6, R * 1.8, c, 'matte', r() * 6);
  b.put(UNIT.blob, M, R * 0.4, h * 0.85, R * 0.2, R * 1.2, R * 1.5, R * 1.2, c, 'matte', r() * 6);
}

// ---------- ishallen ----------
// Ram: långsidan längs x, gaveln med skylten mot +x. len, wid, wallH i meter.
export function iceRink(b, M, o) {
  const { len, wid, wallH } = o;
  const rh = wid / 2 * Math.tan(0.26);
  b.box(M, 0, 0.2, 0, len + 0.3, 0.4, wid + 0.3, GP.plinth);
  b.box(M, 0, wallH / 2, 0, len, wallH, wid, GP.rinkRed);
  // stående panel: mörka linjer
  for (let x = -len / 2 + 1.2; x < len / 2; x += 2.4) for (const sz of [-1, 1]) b.box(M, x, wallH / 2, sz * (wid / 2 + 0.02), 0.08, wallH, 0.05, GP.rinkRedDark);
  for (let z = -wid / 2 + 1.2; z < wid / 2; z += 2.4) b.box(M, -len / 2 - 0.02, wallH / 2, z, 0.05, wallH, 0.08, GP.rinkRedDark);
  for (const sz of [-1, 1]) b.box(M, 0, wallH - 0.15, sz * (wid / 2 + 0.05), len + 0.2, 0.3, 0.06, GP.rinkWhite);
  // vita gavlar (prismat syns bara i gavlarna) och tak
  b.put(UNIT.prism, M, 0, wallH, 0, len, rh, wid, GP.rinkWhite);
  const ov = 0.6, t = 0.25, L = (wid / 2 + ov) / Math.cos(0.26);
  const RR = frame(M, 0, 0, 0, 0);
  for (const side of [-1, 1]) {
    const zc = side * (wid / 2 + ov) / 2, yc = wallH + rh - ((wid / 2 + ov) / 2) * Math.tan(0.26);
    b.box(RR, 0, yc + Math.cos(0.26) * t / 2, zc + Math.sin(0.26) * side * t / 2, len + ov * 2, t, L, GP.rinkRoof, 'matte', 0, side * 0.26);
  }
  void RR;
  // ventilationshuvar på nocken
  for (const x of [-len * 0.3, 0, len * 0.3]) b.box(M, x, wallH + rh + 0.4, 0, 1.4, 0.7, 1.4, GP.metal, 'metal');
  // låg tillbyggnad längs gaveln mot rondellen, med bruna tak och vita dörrar
  const aw = wid + 4, ad = 4.4, ah = 3.6;
  b.box(M, len / 2 + ad / 2, ah / 2, 0, ad, ah, aw, GP.rinkRed);
  b.box(M, len / 2 + ad / 2 + 0.3, ah + 0.25, 0, ad + 1.2, 0.3, aw + 0.8, GP.annexRoof, 'matte', 0, 0, -0.16);
  // dörrarna: huvudingångens dubbeldörr och en sidodörr åt varje håll (bandata, o.doors)
  for (const z of o.doors ?? [-aw * 0.38, -aw * 0.12, aw * 0.16, aw * 0.36]) {
    b.box(M, len / 2 + ad + 0.03, 1.15, z, 0.06, 2.3, 1.5, GP.rinkWhite);
    b.box(M, len / 2 + ad + 0.06, 1.1, z, 0.05, 2.1, 1.2, GP.glassSky, 'glass');
  }
  if (o.doors) {
    // skärmtak över huvudingången
    const mz = o.main ?? 0;
    b.box(M, len / 2 + ad + 0.7, 2.75, mz, 1.4, 0.12, 4.2, GP.annexRoof);
  }
  for (const z of [-aw / 2 + 0.1, aw / 2 - 0.1]) b.box(M, len / 2 + ad / 2, ah / 2, z, ad + 0.06, ah, 0.12, GP.rinkWhite);
  // liten röd bod vid sidan
  b.box(M, len / 2 - 4, 1.4, wid / 2 + 3.2, 4.5, 2.8, 3.2, GP.rinkRed);
  b.box(M, len / 2 - 4, 3.0, wid / 2 + 3.2, 5.0, 0.25, 3.7, GP.annexRoof, 'matte', 0, 0.12);
  b.box(M, len / 2 - 1.72, 1.1, wid / 2 + 3.2, 0.05, 2.0, 1.5, GP.rinkWhite);
}
// Skylten "GNESTA ISHALL": egen plan med canvas (ett anrop). Returnerar mesh.
export function rinkSign(text = 'GNESTA ISHALL') {
  const tex = canvasTex(512, (g, s) => {
    g.fillStyle = GP.rinkWhite; g.fillRect(0, 0, s, s);
    g.fillStyle = GP.signGreen; g.fillRect(10, s * 0.32, s - 20, s * 0.36);
    g.fillStyle = '#e8e4d8'; g.font = `700 ${s * 0.15}px Oswald, Arial Narrow, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, s / 2, s / 2 + 4, s - 50);
  });
  tex.repeat.set(1, 1); tex.offset.set(0, 0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  m.geometry.attributes.uv.array.forEach((v, i, a) => { if (i % 2) a[i] = v * 0.36 + 0.32; });
  m.geometry.attributes.uv.needsUpdate = true;
  m.castShadow = false; m.receiveShadow = true;
  return m;
}

// ---------- rondellen ----------
// Gräsö som extruderad droppe med kantsten, flaggstång, elskåp och påbudsmärke vid spetsen.
export function roundaboutIsland(scene, b, R) {
  const shape = new THREE.Shape(R.island.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  const island = new THREE.Mesh(g, mat(GP.lawnMown));
  island.receiveShadow = true; island.castShadow = false;
  scene.add(island);
  const P = R.island;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], c = P[(i + 1) % P.length];
    b.box(null, (a[0] + c[0]) / 2, 0.09, (a[1] + c[1]) / 2, Math.hypot(c[0] - a[0], c[1] - a[1]) + 0.05, 0.19, 0.24, GP.curb, 'matte', -Math.atan2(c[1] - a[1], c[0] - a[0]));
  }
  const [fx, fz] = R.flag;
  b.put(UNIT.cyl, null, fx, 5.2, fz, 0.13, 10.4, 0.13, GP.flag, 'metal');
  b.put(UNIT.ball, null, fx, 10.45, fz, 0.22, 0.22, 0.22, GP.flag, 'metal');
  b.put(UNIT.cyl, null, fx, 0.3, fz, 0.5, 0.3, 0.5, GP.curb);
  const [cx, cz] = R.center;
  b.box(null, cx + 1.3, 0.75, cz - 0.4, 0.9, 1.3, 0.45, GP.cabinet, 'matte', 0.4);
  b.box(null, cx - 0.9, 0.55, cz + 1.2, 0.6, 0.9, 0.4, GP.cabinet, 'matte', -0.3);
  const [tx, tz] = R.tip;
  const dx = cx - tx, dz = cz - tz, L = Math.hypot(dx, dz);
  const sx = tx + dx / L * 0.9, sz = tz + dz / L * 0.9;
  b.put(UNIT.cyl, null, sx, 1.1, sz, 0.07, 2.2, 0.07, GP.lamp, 'metal');
  b.put(UNIT.disc, null, sx, 2.05, sz, 0.6, 0.04, 0.6, GP.sign, 'matte', -Math.atan2(dz, dx) + Math.PI / 2, Math.PI / 2);
}

// ---------- lekplats ----------
export function playground(b, M) {
  // gungställning
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(M, sx * 1.9, 1.15, sz * 0.55, 0.1, 2.4, 0.1, GP.wood, 'matte', 0, sz * 0.22);
  b.box(M, 0, 2.3, 0, 4.0, 0.12, 0.12, GP.wood);
  for (const x of [-0.9, 0.9]) {
    for (const k of [-0.18, 0.18]) b.box(M, x + k, 1.5, 0, 0.02, 1.6, 0.02, GP.sheet, 'metal');
    b.box(M, x, 0.65, 0, 0.5, 0.06, 0.25, GP.play[0]);
  }
  // klätterställning med rutschkana
  const C = frame(M, 5.2, 0, 1.0, 0.4);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(C, sx * 0.9, 1.3, sz * 0.9, 0.14, 2.6, 0.14, GP.wood);
  b.box(C, 0, 1.4, 0, 2.0, 0.12, 2.0, GP.wood);
  b.put(UNIT.prism, C, 0, 2.6, 0, 2.2, 0.8, 2.2, GP.play[1]);
  b.box(C, 0, 0.8, 2.2, 0.7, 0.08, 2.9, GP.play[2], 'matte', 0, 0.5);
  // sandlåda
  const S = frame(M, -1.0, 0, 4.2, 0.1);
  for (const [x, z, w, d] of [[0, -1.3, 2.8, 0.18], [0, 1.3, 2.8, 0.18], [-1.3, 0, 0.18, 2.8], [1.3, 0, 0.18, 2.8]]) b.box(S, x, 0.15, z, w, 0.3, d, GP.wood);
  b.box(S, 0, 0.05, 0, 2.5, 0.1, 2.5, GP.sand);
  // gungdjur och bänk
  b.box(M, 3.6, 0.45, -2.6, 0.8, 0.4, 0.3, GP.play[3]);
  b.box(M, 3.6, 0.2, -2.6, 0.08, 0.4, 0.08, GP.sheet, 'metal');
  b.box(M, -4.2, 0.45, 2.0, 1.8, 0.08, 0.45, GP.wood);
  for (const sx of [-1, 1]) b.box(M, -4.2 + sx * 0.7, 0.22, 2.0, 0.1, 0.44, 0.4, GP.sheet);
}

// Parkeringsbelysning: hög stolpe med två armaturer.
export function tallLamp(b, M) {
  b.put(UNIT.taper, M, 0, 4.5, 0, 0.2, 9, 0.2, GP.lamp, 'metal');
  for (const sx of [-1, 1]) {
    b.box(M, sx * 0.5, 8.9, 0, 1.0, 0.07, 0.07, GP.lamp, 'metal');
    b.box(M, sx * 1.0, 8.92, 0, 0.55, 0.14, 0.25, GP.lampHead, 'metal');
  }
}

// Gnesta sporthall: stor grå låda med mörkt, nästan platt tak, ljusband upptill, solceller på
// taket och en lägre del med blått tak mot väster. o = SPORTHALL (len längs lokal x).
export function sportHall(b, M, o) {
  const { len, wid, wallH } = o;
  b.box(M, 0, 0.2, 0, len + 0.4, 0.4, wid + 0.4, GP.plinth);
  b.box(M, 0, wallH / 2, 0, len, wallH, wid, GP.hallWall);
  // mörk sockel och ljusband
  for (const sz of [-1, 1]) {
    b.box(M, 0, 1.3, sz * (wid / 2 + 0.03), len + 0.05, 2.6, 0.06, GP.hallWallDark);
    b.box(M, 0, wallH - 1.2, sz * (wid / 2 + 0.04), len - 1.2, 0.9, 0.05, GP.glassSky, 'glass');
  }
  for (const sx of [-1, 1]) b.box(M, sx * (len / 2 + 0.03), 1.3, 0, 0.06, 2.6, wid + 0.05, GP.hallWallDark);
  // pilastrar
  for (let x = -len / 2 + 3; x < len / 2 - 1; x += 3.6) for (const sz of [-1, 1]) b.box(M, x, wallH / 2, sz * (wid / 2 + 0.06), 0.35, wallH, 0.12, GP.hallWallDark);
  // tak: låg sadel, mörkt, med solcellsfält på södra sidan
  const rh = 1.1;
  b.put(UNIT.prism, M, 0, wallH, 0, len + 0.6, rh, wid + 0.6, GP.hallRoof);
  for (let x = -len / 2 + 2.5; x < len / 2 - 2; x += 5) b.box(M, x, wallH + rh * 0.45, wid * 0.24, 4.2, 0.08, wid * 0.36, GP.hallSolar, 'glass', 0, -Math.atan2(rh, wid / 2));
  for (const x of [-len * 0.25, len * 0.25]) b.box(M, x, wallH + rh + 0.35, 0, 2, 0.7, 1.4, GP.metal, 'metal');
  // entré mot parkeringen
  b.box(M, -len * 0.15, 1.6, -wid / 2 - 1.4, 7, 0.25, 2.8, GP.hallRoof);
  b.box(M, -len * 0.15, 1.2, -wid / 2 - 0.05, 3.2, 2.4, 0.08, GP.glass, 'glass');
  // lägre del med blått tak
  const A = o.annex;
  if (A) {
    const L = A.local;
    b.box(M, L[0], A.h / 2, L[1], A.len, A.h, A.wid, GP.hallWall);
    b.box(M, L[0], 1.3, L[1], A.len + 0.06, 2.6, A.wid + 0.06, GP.hallWallDark);
    b.put(UNIT.prism, M, L[0], A.h, L[1], A.len + 0.5, 0.9, A.wid + 0.5, GP.hallBlue);
  }
}

// ---------- Gnesta Norr: radhusen ----------
// Färgerna ur Olas bilder: gult tegel nertill, mörkbrun stående panel upptill och i gavlarna,
// bruna tegeltak, svarta skorstenar med plåthuv, vita dörrar och fönsterbågar.
export const RP = {
  brick: '#c2a962', brickDark: '#a38c4d', brickCap: '#8f8a7e', wood: '#43301f', woodDark: '#35251a',
  tile: '#6b4332', tileDark: '#5b3a2c', tileLine: '#4a2f23', chimney: '#2c2826', cap: '#5f6062',
  door: '#e2ded3', frame: '#e6e2d6', plank: '#4b3626', plankPost: '#3a2a1e', pump: '#d9d7d0',
  lot: '#5f5a52', paint: '#dcd6c6',
};
// Radhuslänga. Lokal ram: längan längs x, entréerna mot +z, mitt vid marken.
// o: { units, unitW, depth, storeys (1 | 2), seed, roofColor ('tile' | 'tileDark') }
// Varje lägenhet: vit dörr i en indragen entré under takfoten, ett fönster bredvid, en låg
// tegelpelare mot grannen, skorsten på nocken, en värmepump ibland. Två våningar: panel upptill.
export function rowHouse(b, M, o) {
  const r = seeded(o.seed ?? 7);
  const n = o.units, uw = o.unitW, L = n * uw, D = o.depth;
  const PL = 0.3, two = o.storeys === 2;
  const gH = 2.4, wallH = two ? 5.0 : 2.4, top = PL + wallH;
  const roofC = RP[o.roofColor] ?? RP.tile;
  b.box(M, 0, PL / 2, 0, L + 0.12, PL, D + 0.12, GP.plinth);
  // bottenvåningen i tegel, en mörkare skift vid foten
  b.box(M, 0, PL + gH / 2, 0, L, gH, D, RP.brick);
  b.box(M, 0, PL + 0.18, 0, L + 0.02, 0.36, D + 0.02, RP.brickDark);
  if (two) {
    // övervåningen: stående panel, lite utskjutande mot framsidan
    b.box(M, 0, PL + gH + (wallH - gH) / 2, 0.08, L, wallH - gH, D + 0.16, RP.wood);
    for (let x = -L / 2 + 0.3; x < L / 2; x += 0.55) for (const sz of [-1, 1]) b.box(M, x, PL + gH + (wallH - gH) / 2, sz * (D / 2 + 0.17) + 0.08, 0.06, wallH - gH, 0.03, RP.woodDark);
  } else {
    // takfotsbräda i mörkt trä
    for (const sz of [-1, 1]) b.box(M, 0, top - 0.15, sz * (D / 2 + 0.02), L + 0.02, 0.3, 0.05, RP.wood);
  }
  // gavlarna: trekant i mörkt trä
  const pitch = 0.47, rh = (D / 2) * Math.tan(pitch);
  b.put(UNIT.prism, M, 0, top, 0, L, rh, D, RP.wood);
  // taket: två fall med lite större utsprång mot framsidan (skyddar entréerna)
  const ovS = 0.35, t = 0.14;
  for (const side of [-1, 1]) {
    const ov = side > 0 ? 0.75 : 0.5, Ls = (D / 2 + ov) / Math.cos(pitch);
    const zc = side * (D / 2 + ov) / 2, yc = top + rh - ((D / 2 + ov) / 2) * Math.tan(pitch);
    const nx = Math.sin(pitch) * side, ny = Math.cos(pitch);
    b.box(M, 0, yc + ny * t / 2, zc + nx * t / 2, L + ovS * 2, t, Ls, roofC, 'matte', 0, side * pitch);
    // tegelraderna: några mörka streck längs takfallet, i takfallets egen ram
    const S = frame(M, 0, yc + ny * t / 2, zc + nx * t / 2, 0, side * pitch);
    for (let k = 1; k <= 5; k++) b.box(S, 0, t / 2 + 0.012, Ls * (k / 6 - 0.5), L + ovS * 2, 0.025, 0.07, RP.tileLine);
  }
  b.box(M, 0, top + rh + 0.06, 0, L + ovS * 2, 0.12, 0.26, RP.tileDark);
  // per lägenhet
  for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + i * uw, xc = x0 + uw / 2, flip = i % 2 ? -1 : 1;
    const dx = xc + flip * uw * 0.24;
    // entrén: vit dörr i en mörk nisch, tegelpelare mot grannen
    b.box(M, dx, PL + 1.1, D / 2 + 0.02, 1.25, 2.25, 0.04, '#2c2a26');
    b.box(M, dx, PL + 1.05, D / 2 + 0.05, 0.92, 2.08, 0.05, RP.door);
    b.box(M, dx + flip * 0.32, PL + 1.0, D / 2 + 0.09, 0.05, 0.05, 0.04, GP.metal, 'metal');
    b.box(M, dx, PL + 0.04, D / 2 + 0.55, 1.4, 0.1, 1.0, GP.paving);
    if (i > 0) b.box(M, x0, PL + 1.15, D / 2 + 0.45, 0.32, 2.3, 0.9, RP.brick);
    // fönster bredvid dörren
    const wx = xc - flip * uw * 0.2;
    b.box(M, wx, PL + 1.45, D / 2 + 0.03, 1.15, 1.2, 0.06, RP.frame);
    b.box(M, wx, PL + 1.45, D / 2 + 0.06, 0.95, 1.0, 0.04, r() < 0.3 ? GP.glassSky : GP.glass, 'glass');
    // lampa vid dörren, värmepump ibland
    b.box(M, dx - flip * 0.75, PL + 1.9, D / 2 + 0.08, 0.14, 0.2, 0.1, GP.lampHead);
    if (r() < 0.4) b.box(M, wx + flip * 0.2, 0.45, D / 2 + 0.28, 0.8, 0.6, 0.32, RP.pump, 'metal');
    // baksidan: altandörr och fönster
    b.box(M, xc - uw * 0.15, PL + 1.15, -D / 2 - 0.03, 1.5, 2.1, 0.06, RP.frame);
    b.box(M, xc - uw * 0.15, PL + 1.15, -D / 2 - 0.06, 1.3, 1.9, 0.04, GP.glass, 'glass');
    if (two) for (const ux of [-0.25, 0.25]) for (const sz of [-1, 1]) {
      b.box(M, xc + ux * uw, PL + gH + 1.3, sz * (D / 2 + 0.2) + 0.08, 1.05, 1.1, 0.05, RP.frame);
      b.box(M, xc + ux * uw, PL + gH + 1.3, sz * (D / 2 + 0.23) + 0.08, 0.85, 0.9, 0.03, GP.glass, 'glass');
    }
    // skorsten på nocken, en per lägenhet
    const cx = xc + flip * uw * 0.18, ch = rh + 0.85;
    b.box(M, cx, top + ch / 2 + 0.1, -0.35, 0.46, ch, 0.46, RP.chimney);
    b.box(M, cx, top + ch + 0.18, -0.35, 0.62, 0.08, 0.62, RP.cap, 'metal');
    b.box(M, cx, top + ch + 0.3, -0.35, 0.3, 0.18, 0.3, RP.cap, 'metal');
    // stuprör mellan lägenheterna
    if (i > 0) b.box(M, x0 + 0.22, PL + wallH / 2, D / 2 + 0.72, 0.08, wallH, 0.08, GP.sheet, 'metal');
  }
}
// Låg tegelmur längs a-b (världskoordinater), med täckplåt.
export function brickWall(b, ax, az, bx, bz, h = 1.3) {
  const L = Math.hypot(bx - ax, bz - az); if (L < 0.2) return;
  const ry = -Math.atan2(bz - az, bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2;
  b.box(null, mx, h / 2, mz, L, h, 0.24, RP.brick, 'matte', ry);
  b.box(null, mx, 0.15, mz, L + 0.01, 0.3, 0.25, RP.brickDark, 'matte', ry);
  b.box(null, mx, h + 0.03, mz, L + 0.04, 0.06, 0.32, RP.brickCap, 'matte', ry);
}
// Plankstaket längs a-b: stolpar och tät panel i mörkt trä.
export function plankFence(b, ax, az, bx, bz, h = 1.6) {
  const L = Math.hypot(bx - ax, bz - az); if (L < 0.3) return;
  const ry = -Math.atan2(bz - az, bx - ax);
  const M = frame(null, ax, 0, az, ry);
  for (let x = 0; x <= L + 0.01; x += Math.max(1.2, L / Math.ceil(L / 2))) b.box(M, x, h / 2 + 0.05, 0, 0.1, h + 0.1, 0.1, RP.plankPost);
  b.box(M, L / 2, h / 2 + 0.08, 0.05, L, h - 0.05, 0.04, RP.plank);
  b.box(M, L / 2, h + 0.06, 0.05, L, 0.05, 0.1, RP.plankPost);
}
// Parkering med vita vinklar vid rutornas hörn (som på bilderna). Lokal ram: rutraden längs x,
// rutorna mot +z. o: { len, depth, rows (1 | 2), bay }. Asfalten ligger tunt ovanpå marken.
export function parkingLot(b, M, o) {
  const bay = o.bay ?? 2.6, len = o.len, depth = o.depth, rows = o.rows ?? 1;
  b.box(M, 0, 0.012, 0, len, 0.024, depth, RP.lot, 'matte', 0, 0, 0, { noShadow: true });
  const n = Math.floor((len - 1) / bay);
  const bd = Math.min(5, depth / rows - 0.3);
  for (let row = 0; row < rows; row++) {
    const sz = rows === 2 ? (row ? 1 : -1) : -1, z0 = sz * depth / 2;
    for (let i = 0; i <= n; i++) {
      const x = -n * bay / 2 + i * bay;
      // vinkeln: kort streck in i rutan och ett tvärs, vid rutans inre ände
      const zi = z0 - sz * (bd - 0.45);
      b.box(M, x, 0.03, zi, 0.11, 0.012, 0.9, RP.paint, 'matte', 0, 0, 0, { noShadow: true });
      b.box(M, x, 0.03, zi - sz * 0.42, 0.7, 0.012, 0.11, RP.paint, 'matte', 0, 0, 0, { noShadow: true });
      // och ett kort streck vid rutans yttre ände
      b.box(M, x, 0.03, z0 - sz * 0.5, 0.11, 0.012, 0.7, RP.paint, 'matte', 0, 0, 0, { noShadow: true });
    }
  }
}

// ---------- Förskola Ringleken ----------
// Förskolans byggnad: Gnestas långa låga hus (villans regler, samma tak), med färgade skivor
// vid fönstren, skärmtak och en barnvagnsbod. o: som preschool.
export function forskola(b, M, o) {
  const front = preschool(b, M, o);
  const W = o.w, D = o.d, colors = ['#7c3a2c', '#3e5566', '#4f6a3a', '#c49a3c'];
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + W * (0.12 + i * 0.25);
    b.box(M, x, 1.2, D / 2 + 0.05, 0.5, 1.6, 0.05, colors[i]);
    b.box(M, x, 1.2, -D / 2 - 0.05, 0.5, 1.6, 0.05, colors[(i + 2) % 4]);
  }
  // barnvagnsbod vid gaveln
  b.box(M, W / 2 + 1.6, 1.0, D / 2 - 1.2, 2.2, 2.0, 2.4, '#7a6146');
  b.box(M, W / 2 + 1.6, 2.1, D / 2 - 1.2, 2.6, 0.12, 2.8, GP.roof.charcoal, 'matte', 0, 0.1);
  return front;
}
// Förskolans lekgård: lågt grönt staket runt, sandlåda, lekstuga, gungor, rutschkana och en
// klätterställning. Lokal ram: w längs x, d längs z, mitt vid marken.
export function forskolaYard(b, M, o) {
  const W = o.w, D = o.d, r = seeded(o.seed ?? 3);
  const fenceC = '#3f5a3a';
  const edge = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), ry = -Math.atan2(bz - az, bx - ax), F = frame(M, ax, 0, az, ry);
    for (let x = 0; x <= L + 0.01; x += 1.25) b.box(F, x, 0.55, 0, 0.06, 1.1, 0.06, fenceC, 'metal');
    for (const y of [0.15, 1.05]) b.box(F, L / 2, y, 0, L, 0.04, 0.04, fenceC, 'metal');
    for (let x = 0.15; x < L; x += 0.15) b.box(F, x, 0.6, 0, 0.02, 0.9, 0.02, fenceC, 'metal');
  };
  edge(-W / 2, -D / 2, W / 2, -D / 2); edge(W / 2, -D / 2, W / 2, D / 2 - 2); edge(W / 2, D / 2, -W / 2, D / 2); edge(-W / 2, D / 2, -W / 2, -D / 2);
  // sand under lekredskapen
  b.box(M, -W * 0.12, 0.02, -D * 0.15, W * 0.6, 0.04, D * 0.5, GP.sand, 'matte', 0, 0, 0, { noShadow: true });
  // lekstuga: röd med vita knutar
  const H = frame(M, W * 0.28, 0, D * 0.25, 0.1);
  b.box(H, 0, 0.75, 0, 1.8, 1.5, 1.5, '#8a3426');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(H, sx * 0.9, 0.75, sz * 0.75, 0.08, 1.5, 0.08, GP.trim);
  b.put(UNIT.prism, H, 0, 1.5, 0, 2.1, 0.7, 1.9, '#3e3e3e');
  b.box(H, 0, 0.6, 0.77, 0.5, 1.0, 0.04, GP.trim);
  // gungor, rutschkana, klätterställning och sandlåda (som Gnestas lekplats, mindre)
  const G2 = frame(M, -W * 0.22, 0, -D * 0.28, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(G2, sx * 1.5, 1.0, sz * 0.5, 0.1, 2.1, 0.1, GP.wood, 'matte', 0, sz * 0.22);
  b.box(G2, 0, 2.05, 0, 3.2, 0.12, 0.12, GP.wood);
  for (const x of [-0.7, 0.7]) { for (const k of [-0.16, 0.16]) b.box(G2, x + k, 1.35, 0, 0.02, 1.4, 0.02, GP.sheet, 'metal'); b.box(G2, x, 0.62, 0, 0.45, 0.06, 0.22, GP.play[r() < 0.5 ? 0 : 2]); }
  const C = frame(M, -W * 0.05, 0, D * 0.12, -0.3);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(C, sx * 0.7, 1.0, sz * 0.7, 0.12, 2.0, 0.12, GP.wood);
  b.box(C, 0, 1.0, 0, 1.6, 0.1, 1.6, GP.wood);
  b.put(UNIT.prism, C, 0, 2.0, 0, 1.8, 0.6, 1.8, GP.play[1]);
  b.box(C, 0, 0.55, 1.75, 0.6, 0.07, 2.2, GP.play[2], 'matte', 0, 0.45);
  const S = frame(M, -W * 0.3, 0, D * 0.3, 0);
  for (const [x, z, w, d] of [[0, -1, 2.2, 0.16], [0, 1, 2.2, 0.16], [-1, 0, 0.16, 2.2], [1, 0, 0.16, 2.2]]) b.box(S, x, 0.14, z, w, 0.28, d, GP.wood);
  b.box(S, 0, 0.05, 0, 1.9, 0.1, 1.9, GP.sand);
  // bänk och några buskar längs staketet
  b.box(M, W * 0.3, 0.42, -D * 0.38, 1.6, 0.07, 0.42, GP.wood);
  for (let i = 0; i < 5; i++) { const x = -W / 2 + 1 + r() * (W - 2); b.put(UNIT.blob, M, x, 0.55, D / 2 - 0.8, 1.2, 1.0, 1.1, r.pick(GP.hedge), 'matte', r() * 6); }
}
