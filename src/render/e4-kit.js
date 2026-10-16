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
    const h = 0.8 * s.lines.length + 0.3, wd = h * aspect, y0 = 1.6;
    for (const sx of [-1, 1]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, y0 + h, 6), post).translateX(sx * wd * 0.32).translateY((y0 + h) / 2));
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(wd, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    panel.position.set(0, y0 + h / 2, 0.06); g.add(panel);
    const back = new THREE.Mesh(new THREE.BoxGeometry(wd, h, 0.06), mat(EP.signBack)); back.position.set(0, y0 + h / 2, 0); g.add(back);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(s.x, 0, s.z); g.rotation.y = s.ry;
  return g;
}
