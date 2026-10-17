// Byggsats för E4 vid Lästringe (0.15.0): motorvägens detaljer. Vägräcken, höga belysningsstolpar,
// vägskyltar (grön botten för motorvägen, blå för övriga vägar, 110), långtradaren, bussen, stenblock
// och högt gräs. Allt utom skyltarna läggs i Gnesta-byggsatsens batch (gnesta-kit.js createBatch).
import * as THREE from 'three';
import { mat, canvasTex } from './kit.js';
import { GP, UNIT, frame } from './gnesta-kit.js';

export const EP = {
  rail: '#a3a59f', railPost: '#7f817c', lamp: '#8a8c88', lampHead: '#4a4c4a', lampGlow: '#efe3c0',
  signGreen: '#1f6a46', signBlue: '#1f4d8c', signWhite: '#f1eee4', signBack: '#7d807c', signPost: '#9a9c97',
  speedRed: '#b32a22',
  cab: ['#7c3a2c', '#d2cfc5', '#2f3a3f'], trailer: '#c8c4b8', trailerDirt: '#9d978a', chassis: '#2a2b2c',
  bus: '#d8d3c4', busStripe: '#8e2d23', busGlass: '#1d2226',
  rock: ['#8c8a82', '#7a7972', '#9a978d', '#6e6d67'], moss: '#5c6a3a',
  grass: ['#8a8c4f', '#9a9358', '#7a8546', '#a39a5e', '#6f7b40'],
  burnt: '#2b2724', burntRust: '#5a3424',
  // 0.16.3 (H230): gårdarna, kraftledningen, portalen, balarna och virket
  falu: '#7a2e22', faluDark: '#5f241b', farmWhite: '#e2ddd0', farmYellow: '#c9b27a', farmRoof: '#34353a', barnRoof: '#8a8c88',
  stone: '#8d8a80', farmDoor: '#3b3027', farmGlass: '#22272a',
  pylon: '#6f7471', insulator: '#9aa4a6', gantry: '#a2a49e', bale: '#e8e5dc', log: '#6e5843', logEnd: '#b59a72',
};

// ---------- vägräcke ----------
// Stolpar var 2 m och en W-balk på 0,6 m. pts: polylinjen i världen.
export function guardRail(b, pts) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-6) continue;
    const ry = -Math.atan2(bz - az, bx - ax);
    b.box(null, (ax + bx) / 2, 0.62, (az + bz) / 2, L + 0.04, 0.32, 0.07, EP.rail, 'metal', ry);
    for (let s = (2 - acc % 2) % 2; s < L; s += 2) {
      const t = s / L;
      b.box(null, ax + (bx - ax) * t, 0.4, az + (bz - az) * t, 0.12, 0.8, 0.12, EP.railPost, 'metal', ry);
    }
    acc += L;
  }
}

// ---------- hög belysningsstolpe ----------
// Ramen: armen mot +x.
export function highwayLamp(b, M) {
  b.put(UNIT.taper, M, 0, 5, 0, 0.24, 10, 0.24, EP.lamp, 'metal');
  b.box(M, 1.1, 9.85, 0, 2.3, 0.1, 0.1, EP.lamp, 'metal', 0, 0, 0.08);
  b.box(M, 2.3, 9.92, 0, 0.8, 0.16, 0.32, EP.lampHead, 'metal');
  b.box(M, 2.3, 9.82, 0, 0.66, 0.05, 0.24, EP.lampGlow, 'glow');
}

// ---------- fordon ----------
// Personbil som stått sedan det började. o: { color, burnt, flipped }. Längd längs x.
export function wreck(b, M, color, o = {}) {
  const body = o.burnt ? EP.burnt : color;
  const k = o.burnt ? 'matte' : 'paint';
  if (o.flipped) M = M.clone().multiply(frame(null, 0, 1.62, 0, 0, 0, Math.PI));
  b.box(M, 0, 0.62, 0, 4.3, 0.72, 1.82, body, k);
  b.box(M, -0.25, 1.28, 0, 2.3, 0.62, 1.66, o.burnt ? EP.burntRust : body, k);
  b.box(M, -0.25, 1.28, 0, 2.08, 0.5, 1.7, GP.carGlass, o.burnt ? 'matte' : 'glass');
  for (const [wx, wz] of [[-1.35, 0.84], [1.35, 0.84], [-1.35, -0.84], [1.35, -0.84]])
    b.put(UNIT.wheel, M, wx, 0.36, wz, 0.72, 0.26, 0.72, o.burnt ? EP.burnt : GP.tire, 'matte', 0, Math.PI / 2);
  // öppen dörr på de övergivna
  if (!o.burnt && !o.flipped) b.box(M, 0.3, 0.95, 1.25, 1.0, 0.85, 0.06, body, k, 0.9);
}
// Långtradare: dragbilen (ramen, fram mot +x) och trailern knäckt jack radianer bakom kopplingen.
export function semiTruck(b, M, jack = 1.1, cab = EP.cab[0]) {
  b.box(M, 1.3, 1.7, 0, 2.3, 2.5, 2.5, cab, 'paint');
  b.box(M, 2.42, 2.1, 0, 0.06, 0.9, 2.2, GP.carGlass, 'glass');
  b.box(M, 1.1, 3.15, 0, 1.9, 0.4, 2.3, cab, 'paint');
  b.box(M, -1.4, 0.7, 0, 4.4, 0.4, 1.2, EP.chassis, 'metal');
  for (const wx of [1.6, -0.8, -2.2]) for (const sz of [-1, 1]) b.put(UNIT.wheel, M, wx, 0.5, sz * 1.05, 1.0, 0.4, 1.0, GP.tire, 'matte', 0, Math.PI / 2);
  // trailern: kopplingen vid x = -1.4, lådan 13 m bakåt
  const T = M.clone().multiply(frame(null, -1.4, 0, 0, jack));
  b.box(T, -6.6, 2.35, 0, 13, 2.7, 2.5, EP.trailer, 'panel');
  b.box(T, -6.6, 1.05, 0, 13, 0.18, 2.5, EP.trailerDirt, 'panel');
  b.box(T, -6.6, 3.72, 0, 13.04, 0.06, 2.54, EP.trailerDirt, 'panel');
  for (const wx of [-10.6, -11.9, -13.0]) for (const sz of [-1, 1]) b.put(UNIT.wheel, T, wx, 0.5, sz * 1.05, 1.0, 0.4, 1.0, GP.tire, 'matte', 0, Math.PI / 2);
}
// Buss: 12 m, fram mot +x. Ljus med rött band, mörka fönster, framdörren öppen.
export function bus(b, M) {
  b.box(M, 0, 1.75, 0, 12, 2.6, 2.55, EP.bus, 'paint');
  b.box(M, 0, 2.15, 0, 11.2, 0.95, 2.6, EP.busGlass, 'glass');
  b.box(M, 5.98, 2.0, 0, 0.08, 1.6, 2.3, EP.busGlass, 'glass');
  b.box(M, 0, 0.95, 0, 12.04, 0.32, 2.58, EP.busStripe, 'paint');
  b.box(M, 0, 3.12, 0, 11.6, 0.18, 2.4, '#bdb8aa', 'paint');
  b.box(M, 4.6, 1.5, 1.29, 1.1, 2.0, 0.04, '#1a1a1a', 'matte');
  for (const wx of [3.9, -3.3]) for (const sz of [-1, 1]) b.put(UNIT.wheel, M, wx, 0.5, sz * 1.1, 1.0, 0.36, 1.0, GP.tire, 'matte', 0, Math.PI / 2);
}

// ---------- gårdarna (0.16.3, H230) ----------
// Ram: w längs x, d längs z, framsidan (dörren) mot +z. Allt i batchen.
// Fönster: mörk ruta i vit karm på väggen vid (lx, y), på framsidan (side 1) eller baksidan (-1).
function farmWindow(b, M, lx, y, zFace, side, w = 0.9, h = 1.15) {
  b.box(M, lx, y, zFace + side * 0.03, w + 0.22, h + 0.22, 0.05, EP.farmWhite);
  b.box(M, lx, y, zFace + side * 0.06, w, h, 0.04, EP.farmGlass);
}
// Mangårdsbyggnaden: rött 1,5-planshus med vita knutar, svart tak, skorsten och farstukvist.
// o: { w, d, color ('red' | 'yellow' | 'white'), porch }
export function farmhouse(b, M, o = {}) {
  const W = o.w ?? 11, D = o.d ?? 7, wallH = 4.4, PL = 0.5;
  const wall = { red: EP.falu, yellow: EP.farmYellow, white: EP.farmWhite }[o.color ?? 'red'];
  const trim = o.color === 'white' ? '#c9c4b6' : EP.farmWhite;
  b.box(M, 0, PL / 2, 0, W + 0.2, PL, D + 0.2, EP.stone);
  b.box(M, 0, PL + wallH / 2, 0, W, wallH, D, wall);
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(M, cx * (W / 2 + 0.02), PL + wallH / 2, cz * (D / 2 + 0.02), 0.22, wallH, 0.22, trim);
  b.box(M, 0, PL + wallH - 0.1, 0, W + 0.12, 0.2, D + 0.12, trim);
  // fönster: fyra i bottenvåningen, tre små under taket, fram och bak
  for (const side of [1, -1]) {
    for (const lx of [-3.6, -1.6, 1.6, 3.6]) if (!(side === 1 && Math.abs(lx) < 2)) farmWindow(b, M, lx * W / 11, PL + 1.5, side * D / 2, side);
    for (const lx of [-2.6, 0, 2.6]) farmWindow(b, M, lx * W / 11, PL + 3.45, side * D / 2, side, 0.7, 0.75);
  }
  // gavlarnas fönster
  for (const sx of [-1, 1]) {
    b.box(M, sx * (W / 2 + 0.03), PL + 1.5, 0, 0.05, 1.37, 1.12, trim);
    b.box(M, sx * (W / 2 + 0.06), PL + 1.5, 0, 0.04, 1.15, 0.9, EP.farmGlass);
  }
  const rh = D * 0.42;
  b.put(UNIT.prism, M, 0, PL + wallH, 0, W + 0.7, rh, D + 0.9, EP.farmRoof);
  b.box(M, W * 0.18, PL + wallH + rh * 0.8, 0, 0.6, rh * 0.9, 0.6, '#5a3f35');
  // farstukvisten: vit, med eget litet sadeltak
  if (o.porch !== false) {
    b.box(M, 0, PL + 1.3, D / 2 + 0.8, 2.2, 2.6, 1.6, EP.farmWhite);
    b.box(M, 0, PL + 1.05, D / 2 + 1.62, 0.95, 2.1, 0.05, EP.farmDoor);
    b.put(UNIT.prism, M, 0, PL + 2.6, D / 2 + 0.85, 2.0, 0.9, 2.6, EP.farmRoof, 'matte', Math.PI / 2);
    b.box(M, 0, PL * 0.5, D / 2 + 2.0, 2.2, PL, 0.8, EP.stone);
  }
}
// Ladugården: lång röd, hög stenfot, ljust plåttak, vita knutar och portar, en logbro upp på ena långsidan.
export function barn(b, M, o = {}) {
  const W = o.w ?? 20, D = o.d ?? 10, foot = 1.4, wallH = 5.2;
  b.box(M, 0, foot / 2, 0, W + 0.3, foot, D + 0.3, EP.stone);
  b.box(M, 0, foot + wallH / 2, 0, W, wallH, D, EP.falu);
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(M, cx * (W / 2 + 0.02), foot + wallH / 2, cz * (D / 2 + 0.02), 0.24, wallH, 0.24, EP.farmWhite);
  // portarna: vit karm, mörkröda dörrar med vitt kryss (framsidan), och logporten på gaveln
  for (const lx of [-W * 0.25, W * 0.2]) {
    b.box(M, lx, foot + 1.6, D / 2 + 0.03, 3.4, 3.3, 0.05, EP.farmWhite);
    b.box(M, lx, foot + 1.55, D / 2 + 0.07, 3.0, 3.0, 0.04, EP.faluDark);
    b.box(M, lx, foot + 1.55, D / 2 + 0.1, 3.9, 0.14, 0.03, EP.farmWhite, 'matte', 0, 0, 0.78);
    b.box(M, lx, foot + 1.55, D / 2 + 0.1, 3.9, 0.14, 0.03, EP.farmWhite, 'matte', 0, 0, -0.78);
  }
  for (const lx of [-W * 0.4, -W * 0.05, W * 0.38]) b.box(M, lx, foot * 0.55, D / 2 + 0.17, 1.0, 0.6, 0.05, EP.farmGlass);
  const rh = D * 0.55;
  b.put(UNIT.prism, M, 0, foot + wallH, 0, W + 0.8, rh, D + 1.0, EP.barnRoof);
  // logbron: jordramp upp till porten på baksidan
  b.box(M, 0, 1.2, -D / 2 - 3, 4.6, 2.4, 6.2, '#6f6a4f', 'matte', 0, -0.3);
  b.box(M, 0, foot + 2.2, -D / 2 - 0.03, 3.6, 3.4, 0.05, EP.farmWhite);
  b.box(M, 0, foot + 2.15, -D / 2 - 0.07, 3.2, 3.1, 0.04, EP.faluDark);
}
// Uthus: litet rött eller grått med sadeltak. o: { w, d, color }
export function shed(b, M, o = {}) {
  const W = o.w ?? 5, D = o.d ?? 3.5, h = 2.5;
  b.box(M, 0, h / 2, 0, W, h, D, o.color ?? EP.falu);
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(M, cx * (W / 2 + 0.02), h / 2, cz * (D / 2 + 0.02), 0.16, h, 0.16, EP.farmWhite);
  b.box(M, -W * 0.2, 0.95, D / 2 + 0.03, 0.9, 1.9, 0.05, EP.farmDoor);
  b.put(UNIT.prism, M, 0, h, 0, W + 0.5, D * 0.38, D + 0.6, o.roof ?? EP.farmRoof);
}
// Rundbal i vit plast, liggande.
export function hayBale(b, x, z, ry) {
  b.put(UNIT.cyl, null, x, 0.65, z, 1.3, 1.2, 1.3, EP.bale, 'matte', ry, 0, Math.PI / 2);
}
// Virkesvälta: stockar på 4 m i tre lager, ramens x längs stockarna.
export function timberStack(b, M) {
  [[5, 0.22], [4, 0.6], [3, 0.98]].forEach(([n, y], k) => {
    for (let i = 0; i < n; i++) {
      const lz = (i - (n - 1) / 2) * 0.46;
      b.put(UNIT.cyl6, M, 0, y, lz, 0.44, 4 - k * 0.1, 0.44, EP.log, 'matte', 0, 0, Math.PI / 2);
      b.put(UNIT.cyl6, M, 2 - k * 0.05 + 0.01, y, lz, 0.4, 0.02, 0.4, EP.logEnd, 'matte', 0, 0, Math.PI / 2);
    }
  });
}

// ---------- kraftledningen (0.16.3, H230) ----------
// Portalstolpe av stål (som de svenska 220 kV-ledningarna): två ben, en bom, tre isolatorkedjor.
// Ramen: bommen längs x, ledningen går längs z. Fästpunkterna för linorna: PYLON_ATTACH.
export const PYLON_H = 15;
export const PYLON_ATTACH = [[-6, PYLON_H - 2.2], [0, PYLON_H - 2.2], [6, PYLON_H - 2.2]];
export function pylon(b, M) {
  const H = PYLON_H;
  for (const sx of [-1, 1]) {
    b.box(M, sx * 3.6, H / 2, 0, 0.55, H, 0.7, EP.pylon, 'matte', 0, 0, sx * 0.06);
    b.box(M, sx * 3.6, 0.3, 0, 1.2, 0.6, 1.2, '#8e8b82');
    // fackverket: två snedstag per ben
    for (const y of [H * 0.3, H * 0.62]) b.box(M, sx * 3.6, y, 0, 0.12, 3.2, 0.9, EP.pylon, 'matte', 0, 0.5);
  }
  b.box(M, 0, H, 0, 15, 1.1, 0.9, EP.pylon);
  b.box(M, 0, H - 0.55, 0, 15, 0.12, 1.2, EP.pylon);
  for (const [ax] of PYLON_ATTACH) b.put(UNIT.cyl6, M, ax, H - 1.3, 0, 0.26, 1.8, 0.26, EP.insulator);
}

// ---------- portalen över motorvägen (0.16.3, H231) ----------
// Ramen: x tvärs över vägen, benen vid legs (meter längs x), bommen på höjden h. Skyltarna hängs i
// roadSign med mount: 'gantry'.
export function gantryFrame(b, M, legs, h) {
  const x0 = Math.min(...legs), x1 = Math.max(...legs), L = x1 - x0, cx = (x0 + x1) / 2;
  for (const lx of legs) {
    b.box(M, lx, h / 2, 0, 0.42, h, 0.42, EP.gantry, 'metal');
    b.box(M, lx, 0.15, 0, 0.9, 0.3, 0.9, '#8e8b82');
  }
  // fackverksbommen: två par ramstänger och snedstag
  for (const dz of [-0.45, 0.45]) for (const y of [h, h - 1.1]) b.box(M, cx, y, dz, L + 0.4, 0.14, 0.14, EP.gantry, 'metal');
  for (let x = x0 + 0.6; x < x1; x += 1.4) b.box(M, x, h - 0.55, 0, 0.1, 1.3, 1.0, EP.gantry, 'metal', 0, 0, 0.7);
}

// ---------- natur ----------
// Stenblock: två eller tre grå klumpar, delvis nedsjunkna, med lite mossa.
export function boulder(b, x, z, s, r) {
  const n = 2 + (r() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const k = i ? r.range(0.45, 0.7) : 1, a = r() * 6;
    const ox = i ? Math.cos(a) * s * 0.7 : 0, oz = i ? Math.sin(a) * s * 0.7 : 0;
    b.put(UNIT.blob, null, x + ox, s * 0.22 * k, z + oz, s * 1.5 * k, s * 0.75 * k, s * 1.2 * k, r.pick(EP.rock), 'matte', r() * 6, r.range(-0.2, 0.2));
  }
  b.put(UNIT.blob, null, x, s * 0.5, z, s * 0.9, s * 0.18, s * 0.7, EP.moss, 'matte', r() * 6);
}
// Högt gräs: en tuva av tre smala strån (koner). Billigt, en instans per strå.
export function grassTuft(b, x, z, h, r) {
  const c = r.pick(EP.grass);
  for (let i = 0; i < 3; i++) {
    const a = r() * 6, d = r.range(0, 0.25);
    b.put(UNIT.cone, null, x + Math.cos(a) * d, h / 2, z + Math.sin(a) * d, 0.22, h * r.range(0.75, 1.1), 0.22, c, 'matte', 0, r.range(-0.25, 0.25), r.range(-0.25, 0.25), { noShadow: true });
  }
}

// ---------- vägskyltar ----------
// Panelens textur: grön eller blå botten, vit kant, vit text. Pilarna '<' och '>' ritas som pilar.
// motorway: motorvägssymbolen till vänster. exit: avfartsnumret i en ruta (första raden).
function signCanvas(s) {
  const lines = s.lines, W = 512, lh = 96, H = Math.max(1, lines.length) * lh + 40;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = s.kind === 'green' ? EP.signGreen : EP.signBlue;
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = EP.signWhite; g.lineWidth = 8; g.strokeRect(10, 10, W - 20, H - 20);
  g.fillStyle = EP.signWhite; g.textBaseline = 'middle';
  g.font = 'bold 60px "Arial Narrow", Arial, sans-serif';
  const left = s.motorway ? 104 : 34;
  if (s.motorway) {
    // motorvägssymbolen: två körbanor under en bro, förenklad
    g.save(); g.translate(58, H / 2); g.lineWidth = 6; g.strokeStyle = EP.signWhite;
    g.strokeRect(-30, -34, 60, 68);
    g.beginPath(); g.moveTo(-14, 30); g.lineTo(-6, -22); g.moveTo(14, 30); g.lineTo(6, -22); g.moveTo(-26, -20); g.lineTo(26, -20); g.stroke();
    g.restore();
  }
  lines.forEach((t, i) => {
    const y = 20 + lh * (i + 0.5);
    let text = t.trim(), arrowL = false, arrowR = false;
    if (text.startsWith('<')) { arrowL = true; text = text.slice(1).trim(); }
    if (text.endsWith('>')) { arrowR = true; text = text.slice(0, -1).trim(); }
    let x = left + (arrowL ? 54 : 0);
    if (s.exit && i === 0 && /^\d+ /.test(text)) {
      const [num, ...rest] = text.split(' ');
      g.save(); g.fillStyle = EP.signWhite; g.fillRect(x - 6, y - 34, 104, 68); g.fillStyle = bg; g.fillText(num, x + 4, y + 2); g.restore();
      x += 116; text = rest.join(' ');
    }
    g.fillText(text, x, y + 2, W - x - (arrowR ? 80 : 30));
    const arrow = (ax, dir) => {
      g.beginPath(); g.moveTo(ax + dir * 26, y); g.lineTo(ax - dir * 6, y - 24); g.lineTo(ax - dir * 6, y - 9); g.lineTo(ax - dir * 26, y - 9);
      g.lineTo(ax - dir * 26, y + 9); g.lineTo(ax - dir * 6, y + 9); g.lineTo(ax - dir * 6, y + 24); g.closePath(); g.fill();
    };
    if (arrowL) arrow(left + 24, -1);
    if (arrowR) arrow(W - 52, 1);
  });
  return { canvas: c, aspect: W / H };
}
function speedCanvas(text) {
  return canvasTex(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = EP.speedRed; g.beginPath(); g.arc(s / 2, s / 2, s * 0.48, 0, 7); g.fill();
    g.fillStyle = EP.signWhite; g.beginPath(); g.arc(s / 2, s / 2, s * 0.36, 0, 7); g.fill();
    g.fillStyle = '#151515'; g.font = 'bold 98px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, s / 2, s / 2 + 6);
  });
}
// En skylt som Group: stolpar och panel (framsidan mot +z i ramen). s: { x, z, ry, kind, lines, ... }.
export function roadSign(s) {
  const g = new THREE.Group();
  const post = mat(EP.signPost, { metalness: 0.4, roughness: 0.6 });
  if (s.kind === 'speed') {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), post).translateY(1.3));
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshStandardMaterial({ map: speedCanvas(s.lines[0]), transparent: true, roughness: 0.7 }));
    face.position.set(0, 2.45, 0.04); g.add(face);
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), mat(EP.signBack)); back.position.set(0, 2.45, 0.03); back.rotation.y = Math.PI; g.add(back);
  } else {
    const { canvas, aspect } = signCanvas(s);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const h = (0.8 * s.lines.length + 0.3) * (s.scale ?? 1), wd = h * aspect, y0 = s.y0 ?? 1.6;
    // 0.16.3 (H231): på portalen hänger panelen framför bommen (som är 1 m djup), utan egna stolpar
    const dz = s.mount === 'gantry' ? 0.62 : 0;
    if (s.mount !== 'gantry') for (const sx of [-1, 1]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, y0 + h, 6), post).translateX(sx * wd * 0.32).translateY((y0 + h) / 2));
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(wd, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    panel.position.set(0, y0 + h / 2, dz + 0.06); g.add(panel);
    const back = new THREE.Mesh(new THREE.BoxGeometry(wd, h, 0.06), mat(EP.signBack)); back.position.set(0, y0 + h / 2, dz); g.add(back);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(s.x, 0, s.z); g.rotation.y = s.ry;
  return g;
}
