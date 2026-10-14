// Byggsats: hjälpare för att bygga allt i kod (inga bildfiler).
import * as THREE from 'three';

export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[(Math.random() * a.length) | 0];

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true, ...opts }));
  return matCache.get(key);
}

export function mesh(geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
  return o;
}
export const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);

export function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

export function speckle(g, s, n, colors, rMax) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = pick(colors); g.globalAlpha = rnd(0.15, 0.6);
    g.beginPath(); g.arc(Math.random() * s, Math.random() * s, rnd(0.5, rMax), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

export function humanoid({ skin, shirt, pants, helmet }) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const hipL = new THREE.Group(), hipR = new THREE.Group();
  hipL.position.set(-0.18, 0.85, 0); hipR.position.set(0.18, 0.85, 0);
  hipL.add(box(0.27, 0.85, 0.3, mat(pants), 0, -0.42, 0));
  hipR.add(box(0.27, 0.85, 0.3, mat(pants), 0, -0.42, 0));
  const torso = box(0.72, 0.85, 0.42, mat(shirt), 0, 1.3, 0);
  const head = box(0.42, 0.45, 0.42, mat(skin), 0, 1.98, 0.03);
  const shL = new THREE.Group(), shR = new THREE.Group();
  shL.position.set(-0.47, 1.62, 0); shR.position.set(0.47, 1.62, 0);
  shL.add(box(0.2, 0.75, 0.22, mat(shirt), 0, -0.3, 0)); shL.add(box(0.17, 0.2, 0.18, mat(skin), 0, -0.75, 0));
  shR.add(box(0.2, 0.75, 0.22, mat(shirt), 0, -0.3, 0)); shR.add(box(0.17, 0.2, 0.18, mat(skin), 0, -0.75, 0));
  body.add(hipL, hipR, torso, head, shL, shR);
  if (helmet) {
    const h = mesh(new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(helmet), 0, 2.1, 0.03);
    h.scale.set(1.05, 0.8, 1.1); body.add(h);
  }
  return { root, body, hipL, hipR, shL, shR, head };
}
