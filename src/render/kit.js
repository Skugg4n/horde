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
  grenade: '#4a5232', grenadeBand: '#c9a23a', fireball: '#ffb347', scorch: '#14110d',
  // soldat
  hvBand: '#f4eed6', soldierSkin: '#a58467', soldierShirt: '#55593f', soldierPants: '#4a4d38', helmet: '#4f5438', vest: '#43472f',
  // Hemvärnet (0.9.0): m/90-kamouflage, splittermönster i ljusgrönt, mörkgrönt, brunt och svart
  // (avmättat som resten), stridsväst och Ak 4 med trästock.
  m90: ['#7a8655', '#3b4a2c', '#5c4630', '#1f211b'], hvVest: '#4a5236', hvWood: '#5a4128',
  // 0.13.0 (H130): infanteriet. Samma m/90 men skarpare, en mörk skyddsväst med plattor och fickor,
  // hjälm 18 (rundare, med fäste fram), knäskydd och en svart Ak 5C med rödpunktsikte.
  infVest: '#2f3527', infHelmet: '#3e4632', infKit: '#262a22', ak5: '#1b1c1a',
  // 0.13.0 (H105): de civila. Jaktjackor, flanell, jeans och orange jaktväst; kepsar och mössor.
  civCoat: ['#4f5a3a', '#6b4a32', '#7a2f28', '#3c4652', '#5c5a4a'], civPants: ['#38465a', '#4a4338', '#2f3238', '#55503f'],
  civOrange: '#d0612a', hiVis: '#cfe23a', civCap: ['#3a3f2c', '#7a2a24', '#2a3140', '#c25a26'], civWood: '#6b4a2c',
  // 0.13.0 (H135): EPA-pillboxen. Gammal traktorbil i olika plåtar (grön, rödbrun, grå primer, blå),
  // rost, svetsfogar, LGF-triangeln bak.
  epaBody: ['#54613f', '#7a3b2b', '#6f6f66', '#3e4f5c', '#8a7a52'], epaPaint: ['#8a2f25', '#2f4a63', '#b8ab86', '#5f6b4a', '#7b7f80'], rust: '#6e3b1f', weld: '#9a8f78', lgf: '#d0542a', lgfRim: '#8e1f17',
  // hinder
  wireSteel: '#3c3a36', post: '#4a3a2a', concrete: '#a59f90', concreteDark: '#6f695d', grime: '#7d7768', crack: '#3a3630',
  // zombier
  zSkin: ['#7e8a69', '#8b8f73', '#6f7962', '#9b9477', '#7a7f6c'],
  zShirt: ['#4a4f5a', '#5e4a3a', '#6b6455', '#3d4a3f', '#7a3b2e', '#8a8577', '#2f3b52'],
  zPants: ['#3b4050', '#4a4336', '#5a5342', '#34373c'],
  zRunnerShirt: ['#4b4740', '#5c4c3e', '#6a6152', '#3f454b'],
  zBruteSkin: ['#7f8770', '#8a8b74', '#767e68'],
  zBruteShirt: ['#5a4c3b', '#4d4a42', '#6a5a44'],
  blood: '#4f120d', bloodDark: '#3a0e0a',
  // 0.18.0: den pansrade (kravallutrustning: mörk overall, svart hjälm med visir, skölden) och kryparen (lera, trasor)
  zRiot: ['#23262b', '#2c3036', '#1f2a33'], zRiotHelmet: '#14161a', zVisor: '#4d5a63', zShield: '#2a2f34', zShieldRim: '#7c8790',
  zCrawlSkin: ['#6d7458', '#7b7a60', '#5f6650'], zMud: ['#3d362b', '#4a4234', '#352f27'],
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

// Människa med verkliga proportioner (stilbibeln, Proportioner): huvudet ungefär 1/7,5 av
// längden, lemmar i två delar med armbågar och knän. Origo mellan fötterna, ansiktet mot +z.
// Leden: body (hela kroppen, för fall och gungning) > pelvis, hipL/R > kneeL/R,
// spine (ryggen, lutar framåt) > torso, head (nacken, huvudet hänger) och shL/R > elL/R.
// build ändrar mått per typ; samma mått ger samma delade geometri.
export const BUILD = {
  hipY: 0.98, hipX: 0.11, thigh: 0.48, shin: 0.5, legW: 0.15, shinW: 0.12,
  torsoH: 0.6, chestW: 0.44, waistW: 0.36, chestD: 0.25, shX: 0.25,
  upper: 0.32, fore: 0.3, armW: 0.11, foreW: 0.095, head: 0.26,
};
export function humanoid({ skin, shirt, pants, helmet, build = {}, bare = [false, false] }) {
  const b = { ...BUILD, ...build };
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const pelvis = box(b.waistW, 0.2, b.chestD * 0.92, mat(pants), 0, b.hipY + 0.02, 0);
  body.add(pelvis);
  const legs = [-1, 1].map(side => {
    const hip = new THREE.Group(); hip.position.set(side * b.hipX, b.hipY - 0.04, 0);
    hip.add(box(b.legW, b.thigh, b.legW * 1.1, mat(pants), 0, -b.thigh / 2, 0));
    const knee = new THREE.Group(); knee.position.y = -b.thigh;
    // skenbenet räcker ner till marken, lite framåt nertill där foten sitter
    knee.add(box(b.shinW, b.shin, b.shinW * 1.25, mat(pants), 0, -b.shin / 2, 0.015));
    hip.add(knee); body.add(hip);
    return { hip, knee };
  });
  const spine = new THREE.Group(); spine.position.y = b.hipY + 0.08; body.add(spine);
  // Bålen smalnar mot midjan: fyrkantig cylinder, vriden så att sidorna står rakt.
  const r = Math.SQRT1_2;
  const torso = mesh(geo('cylinder', b.chestW * r, b.waistW * r, b.torsoH, 4), mat(shirt), 0, b.torsoH / 2, 0);
  torso.rotation.y = Math.PI / 4; torso.scale.set(1, 1, b.chestD / b.chestW);
  spine.add(torso);
  const head = new THREE.Group(); head.position.set(0, b.torsoH + 0.02, 0.02); spine.add(head);
  const skull = box(b.head * 0.76, b.head, b.head * 0.88, mat(skin), 0, 0.07 + b.head / 2, 0.03);
  head.add(skull);
  const arms = [-1, 1].map((side, i) => {
    const sh = new THREE.Group(); sh.position.set(side * b.shX, b.torsoH - 0.06, 0);
    sh.add(box(b.armW, b.upper, b.armW * 1.1, mat(shirt), 0, -b.upper / 2, 0));
    const el = new THREE.Group(); el.position.y = -b.upper;
    el.add(box(b.foreW, b.fore, b.foreW * 1.05, mat(bare[i] ? skin : shirt), 0, -b.fore / 2, 0));
    el.add(box(b.foreW * 0.85, 0.11, b.foreW * 1.15, mat(skin), 0, -b.fore - 0.05, 0));
    sh.add(el); spine.add(sh);
    return { sh, el };
  });
  if (helmet) {
    const h = mesh(geo('sphere', b.head * 0.62, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(helmet), 0, 0.07 + b.head * 0.72, 0.03);
    h.scale.set(1.05, 0.85, 1.12); head.add(h);
  }
  return {
    root, body, pelvis, spine, torso, head, skull, build: b,
    hipL: legs[0].hip, hipR: legs[1].hip, kneeL: legs[0].knee, kneeR: legs[1].knee,
    shL: arms[0].sh, shR: arms[1].sh, elL: arms[0].el, elR: arms[1].el,
  };
}
