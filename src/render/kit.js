// Byggsats: hjälpare för att bygga allt i kod (inga bildfiler).
import * as THREE from 'three';

// Palett: alla färger som modeller, värld och ljus använder. Ändra här, inte i modellerna.
export const PALETTE = {
  // ljus och luft
  haze: '#b9aa8c', hemiSky: '#d6dbe0', hemiGround: '#5b4a35', sun: '#ffdcae', fill: '#c9d2dc', dust: '#efe2c4',
  muzzle: '#ffb15c', muzzleFlash: '#ffd391', tracer: '#ffcc80', brass: '#b08a3a', gib: '#5e130d', splat: ['#5b120d', '#4a0f0b', '#6a1810'],
  // mark
  dirt: '#8c7b5c', dirtSpeck: ['#5e5039', '#a3936f', '#6d6a4b', '#3f362a'],
  asphalt: '#45413a', asphaltSpeck: ['#2d2a25', '#5a554b', '#3a3630', '#6b6456'],
  gravel: ['#6f6352', '#8a7d65', '#4f473b'],
  // värn och vapen
  sandbag: ['#8f8160', '#7f7254', '#9a8c6a', '#867a5b'],
  gunMetal: '#2a2b28', gunDark: '#1d1e1c', shield: '#8a8b64', ammo: '#4d4f3a', crate: '#55603f', crateDark: '#3d4530', stencil: '#c9bd98',
  // soldat
  soldierSkin: '#a58467', soldierShirt: '#55593f', soldierPants: '#4a4d38', helmet: '#4f5438', vest: '#43472f',
  // hinder
  wireSteel: '#3c3a36', post: '#4a3a2a', concrete: '#a59f90', concreteDark: '#6f695d', grime: '#7d7768', crack: '#3a3630',
  // zombier
  zSkin: ['#7e8a69', '#8b8f73', '#6f7962', '#9b9477', '#7a7f6c'],
  zShirt: ['#4a4f5a', '#5e4a3a', '#6b6455', '#3d4a3f', '#7a3b2e', '#8a8577', '#2f3b52'],
  zPants: ['#2f3340', '#3a352c', '#4a4538', '#24272b'],
  zRunnerShirt: ['#4b4740', '#5c4c3e', '#6a6152', '#3f454b'],
  zBruteSkin: ['#7f8770', '#8a8b74', '#767e68'],
  zBruteShirt: ['#5a4c3b', '#4d4a42', '#6a5a44'],
  blood: '#4f120d', bloodDark: '#3a0e0a',
  // rekvisita
  carGlass: '#1d1c1a', tire: '#151413', barrel: '#4d5a3d', bark: '#2c2620', pole: '#3b2f24', wire: '#1e1a16',
  wall: '#9a8d78', rubble: '#5d5245',
  // markeringar och gränssnitt
  paper: '#e9dfc9', rust: '#b5532a', ink: '#16120e',
};

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
// Delade geometrier: samma parametrar ger samma BufferGeometry. Disponeras aldrig.
const geoCache = new Map();
const GEO = {
  box: THREE.BoxGeometry, sphere: THREE.SphereGeometry, torus: THREE.TorusGeometry,
  cylinder: THREE.CylinderGeometry, ring: THREE.RingGeometry, plane: THREE.PlaneGeometry,
  dodeca: THREE.DodecahedronGeometry,
};
export function geo(kind, ...args) {
  const key = kind + ':' + args.join(',');
  let g = geoCache.get(key);
  if (!g) { g = new GEO[kind](...args); g.userData.shared = true; geoCache.set(key, g); }
  return g;
}
export const geoCacheSize = () => geoCache.size;
export const box = (w, h, d, m, x, y, z) => mesh(geo('box', w, h, d), m, x, y, z);
// Låda med slumpad storlek: delad enhetskub som skalas, så att cachen inte växer.
export function sbox(w, h, d, m, x, y, z) {
  const o = mesh(geo('box', 1, 1, 1), m, x, y, z);
  o.scale.set(w, h, d);
  return o;
}

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
    const h = mesh(geo('sphere', 0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(helmet), 0, 2.1, 0.03);
    h.scale.set(1.05, 0.8, 1.1); body.add(h);
  }
  return { root, body, hipL, hipR, shL, shR, head, torso };
}
