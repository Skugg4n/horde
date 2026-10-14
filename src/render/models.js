// Alla spelets modeller, byggda i kod av byggsatsen. Visas i lookbook.html innan de används i spelet.
import * as THREE from 'three';
import { rnd, pick, mat, mesh, box, sbox, geo, humanoid, PALETTE as P } from './kit.js';
import { ZOMBIES } from '../data/zombies.js';

const METAL = { metalness: 0.55, roughness: 0.45 };
const TAU = Math.PI * 2;

// ---------- värn ----------

// En båge av sandsäckar runt origo, öppen bakåt (-x). Varannan rad förskjuten ett halvt steg.
function sandbagArc(g, { r, layers, n, arc, size = 1, y0 = 0 }) {
  const bags = P.sandbag.map(c => mat(c));
  const step = (2 * arc) / (n - 1);
  for (let layer = 0; layer < layers; layer++) {
    const rr = r - layer * 0.1 * size;
    const odd = layer % 2;
    for (let i = 0; i < n - odd; i++) {
      const a = -arc + i * step + odd * step / 2 + rnd(-0.03, 0.03);
      const s = mesh(geo('sphere', 0.5, 7, 5), pick(bags),
        Math.cos(a) * rr, y0 + (0.28 + layer * 0.36) * size, Math.sin(a) * rr);
      s.scale.set(0.95 * size * rnd(0.94, 1.06), 0.42 * size, 0.55 * size);
      s.rotation.set(rnd(-0.06, 0.06), -a + rnd(-0.08, 0.08), rnd(-0.05, 0.05));
      g.add(s);
    }
  }
}

// Ett litet runt underlag av säckar (kulsprutan på bipod vilar på det).
function sandbagPile(g, x, z, size = 0.8) {
  const bags = P.sandbag.map(c => mat(c));
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU;
    const s = mesh(geo('sphere', 0.5, 7, 5), pick(bags), x + Math.cos(a) * 0.32, 0.22, z + Math.sin(a) * 0.32);
    s.scale.set(0.8 * size, 0.42 * size, 0.5 * size); s.rotation.y = -a + Math.PI / 2; g.add(s);
  }
  const top = mesh(geo('sphere', 0.5, 7, 5), pick(bags), x, 0.52, z);
  top.scale.set(0.9 * size, 0.4 * size, 0.6 * size); g.add(top);
}

// Ammolåda med lock och ljus stencilrand.
function crate(g, x, y, z, ry = 0) {
  const c = new THREE.Group();
  c.add(box(0.78, 0.36, 0.42, mat(P.crate), 0, 0.18, 0));
  c.add(box(0.82, 0.07, 0.46, mat(P.crateDark), 0, 0.38, 0));
  c.add(box(0.5, 0.08, 0.005, mat(P.stencil), 0, 0.2, 0.213));
  c.add(box(0.12, 0.05, 0.1, mat(P.gunDark), 0, 0.44, 0));
  c.position.set(x, y, z); c.rotation.y = ry; g.add(c);
  return c;
}

function soldier() {
  const s = humanoid({ skin: P.soldierSkin, shirt: P.soldierShirt, pants: P.soldierPants, helmet: P.helmet });
  s.body.add(box(0.8, 0.58, 0.5, mat(P.vest), 0, 1.4, 0));
  s.body.add(box(0.5, 0.14, 0.12, mat(P.ammo), 0, 1.0, 0.24)); // magasinsfickor
  return s;
}

function m2Gun(pivot, metal) {
  pivot.add(box(1.1, 0.32, 0.3, metal, 0.1, 0, 0));                      // låda
  pivot.add(box(0.18, 0.12, 0.2, metal, -0.55, 0.02, 0));                 // spadgrepp
  pivot.add(box(0.4, 0.25, 0.32, mat(P.ammo), -0.1, -0.25, 0.25));        // ammolåda
  pivot.add(box(0.08, 0.14, 0.04, metal, 0.45, 0.24, 0));                 // sikte
  const jacket = mesh(geo('cylinder', 0.09, 0.09, 0.4, 7), metal, 0.82, 0.03, 0);
  jacket.rotation.z = Math.PI / 2; pivot.add(jacket);
  const barrel = mesh(geo('cylinder', 0.05, 0.06, 1.6, 6), metal, 1.4, 0.03, 0);
  barrel.rotation.z = Math.PI / 2; pivot.add(barrel);
  pivot.add(box(0.22, 0.22, 0.22, metal, 2.2, 0.03, 0));                  // mynningsbroms
  return 2.35;
}

function m249Gun(pivot, metal) {
  pivot.add(box(0.75, 0.22, 0.17, metal, 0, 0, 0));                       // låda
  pivot.add(box(0.5, 0.2, 0.12, metal, -0.6, -0.04, 0));                  // kolv
  pivot.add(box(0.3, 0.2, 0.22, mat(P.ammo), 0.05, -0.2, 0.08));          // patronväska
  pivot.add(box(0.3, 0.06, 0.06, metal, 0.05, 0.16, 0));                  // bärhandtag
  pivot.add(box(0.32, 0.13, 0.15, mat(P.gunDark), 0.5, -0.01, 0));        // handskydd
  const barrel = mesh(geo('cylinder', 0.03, 0.035, 0.75, 6), metal, 0.95, 0.01, 0);
  barrel.rotation.z = Math.PI / 2; pivot.add(barrel);
  for (const side of [-1, 1]) {                                           // bipod
    const leg = mesh(geo('cylinder', 0.02, 0.02, 0.42, 4), metal, 0.72, -0.18, side * 0.1);
    leg.rotation.x = side * 0.45; pivot.add(leg);
  }
  return 1.34;
}

// Gevärssköld: platta med vinklade sidovingar, sitter på pivot och vrids med vapnet.
function gunShield(pivot, { x, w, h, y }) {
  const sm = mat(P.shield, METAL);
  pivot.add(box(0.06, h, w, sm, x, y, 0));
  for (const side of [-1, 1]) {
    const wing = box(0.06, h * 0.85, w * 0.38, sm, x - 0.12, y - h * 0.05, side * (w / 2 + w * 0.15));
    wing.rotation.y = side * 0.55; pivot.add(wing);
  }
  pivot.add(box(0.07, 0.06, w + 0.02, mat(P.gunDark), x, y + h / 2, 0)); // kantlist
}

export function weaponModel(type, level = 1) {
  const heavy = type === 'm2';
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  const muzzle = new THREE.Object3D();
  const metal = mat(P.gunMetal, METAL);

  const ring = heavy
    ? { r: 2.5, layers: level >= 3 ? 4 : 3, n: 13, arc: 1.95, size: 1 }
    : { r: 2.0, layers: level >= 3 ? 3 : 2, n: 11, arc: 1.9, size: 0.92 };
  sandbagArc(group, ring);

  if (heavy) {
    for (let i = 0; i < 3; i++) {                                         // trefot
      const l = mesh(geo('cylinder', 0.04, 0.04, 1.3, 5), metal);
      const a = i * 2.1; l.position.set(Math.cos(a) * 0.35, 0.55, Math.sin(a) * 0.35);
      l.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); group.add(l);
    }
    pivot.position.set(0, 1.15, 0);
    muzzle.position.set(m2Gun(pivot, metal), 0.03, 0);
  } else {
    sandbagPile(group, 0.25, 0);
    pivot.position.set(0, 0.95, 0);
    muzzle.position.set(m249Gun(pivot, metal), 0.01, 0);
  }
  group.add(pivot); pivot.add(muzzle);

  // skytten står bakom vapnet och följer med när det vrids
  const gunner = soldier();
  gunner.root.rotation.y = Math.PI / 2;
  if (heavy) {
    gunner.root.position.set(-0.9, -1.15, 0);
    gunner.shL.rotation.x = -1.2; gunner.shR.rotation.x = -1.2; gunner.body.rotation.x = 0.25;
  } else {
    gunner.root.position.set(-1.05, -1.2, 0);
    gunner.body.rotation.x = 0.5; gunner.hipL.rotation.x = -0.75; gunner.hipR.rotation.x = -0.2;
    gunner.shL.rotation.x = -0.85; gunner.shR.rotation.x = -0.95;
    gunner.head.rotation.x = -0.3;
  }
  pivot.add(gunner.root);

  // nivå 2: sköld framför
  if (level >= 2) gunShield(pivot, heavy ? { x: 0.75, w: 1.3, h: 1.1, y: 0.2 } : { x: 0.45, w: 0.95, h: 0.75, y: 0.12 });

  // nivå 3: yttre säckvall framåt och ammolådor bakom
  if (level >= 3) {
    sandbagArc(group, heavy
      ? { r: 3.45, layers: 2, n: 15, arc: 1.25, size: 1 }
      : { r: 2.85, layers: 2, n: 13, arc: 1.2, size: 0.92 });
    const cr = heavy ? 2.9 : 2.4;
    crate(group, -cr, 0, cr * 0.42, 0.4);
    crate(group, -cr - 0.1, 0.45, cr * 0.42 + 0.05, 0.3);
    crate(group, -cr + 0.2, 0, cr * 0.42 + 0.6, 0.5);
    crate(group, -cr + 0.1, 0, -cr * 0.5, -0.3);
  }
  group.userData = { kind: 'weapon', type, level };
  return { group, pivot, muzzle, gunner };
}

// ---------- hinder ----------
// Origo i rutans mitt. Rutan är 3 m längs x och täcker hela vägbredden (9 m) längs z.

function wireObstacle() {
  const g = new THREE.Group();
  const steel = mat(P.wireSteel, { metalness: 0.6, roughness: 0.5 });
  const coils = [], posts = [];
  for (const x of [-0.8, 0.8]) {
    for (let z = -4.2; z <= 4.3; z += 0.55) {
      const t = mesh(geo('torus', 0.55, 0.025, 4, 18), steel, x + rnd(-0.1, 0.1), 0.55, z + rnd(-0.05, 0.05));
      t.rotation.set(rnd(-0.2, 0.2), Math.PI / 2 + rnd(-0.3, 0.3), 0);
      t.userData = { y: t.position.y, rx: t.rotation.x, cut: rnd(0.05, 0.85), fall: rnd(-1, 1) };
      g.add(t); coils.push(t);
    }
  }
  const wood = mat(P.post);
  for (let z = -4.2; z <= 4.3; z += 2.1) {
    for (const x of [-0.8, 0.8]) {
      const p = box(0.1, 1.3, 0.1, wood, x + rnd(-0.08, 0.08), 0.65, z + rnd(-0.15, 0.15));
      p.rotation.z = rnd(-0.15, 0.15);
      p.userData = { rz: p.rotation.z, fall: Math.random() < 0.5 ? -1 : 1 };
      g.add(p); posts.push(p);
    }
  }
  // spänd tråd mellan stolparna
  for (const x of [-0.8, 0.8]) {
    for (const y of [0.45, 1.05]) {
      const s = mesh(geo('cylinder', 0.012, 0.012, 8.6, 3), steel, x, y, 0);
      s.rotation.x = Math.PI / 2; s.castShadow = false;
      s.userData = { y, cut: rnd(0.3, 0.7) };
      g.add(s); coils.push(s);
    }
  }
  g.userData = { kind: 'obstacle', type: 'wire', coils, posts };
  return g;
}

const jerseyCache = new Map();
function jerseyGeometry(len) {
  if (jerseyCache.has(len)) return jerseyCache.get(len);
  const shape = new THREE.Shape();
  shape.moveTo(-0.55, 0); shape.lineTo(0.55, 0); shape.lineTo(0.55, 0.08); shape.lineTo(0.3, 0.35); shape.lineTo(0.18, 1.05);
  shape.lineTo(-0.18, 1.05); shape.lineTo(-0.3, 0.35); shape.lineTo(-0.55, 0.08); shape.lineTo(-0.55, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2);
  g.userData.shared = true; jerseyCache.set(len, g);
  return g;
}

function blockObstacle() {
  const g = new THREE.Group();
  // egen materialkopia så att slitage kan mörka just det här hindret
  const concrete = new THREE.MeshStandardMaterial({ color: P.concrete, roughness: 0.95, metalness: 0, flatShading: true });
  const grime = new THREE.MeshStandardMaterial({ color: P.grime, roughness: 1, metalness: 0, flatShading: true });
  concrete.userData.own = true; grime.userData.own = true;
  const crackM = mat(P.crack);
  const len = 2.8, blocks = [], cracks = [], debris = [];
  for (const z of [-3, 0, 3]) {
    const b = new THREE.Group();
    b.add(mesh(jerseyGeometry(len), concrete));
    b.add(box(1.12, 0.12, len + 0.01, grime, 0, 0.06, 0));               // smutsrand nertill
    for (const dz of [-0.8, 0.8]) b.add(box(1.14, 0.1, 0.3, mat(P.ink), 0, 0.05, dz)); // gafflingshål
    const loop = mesh(geo('torus', 0.08, 0.02, 4, 8, Math.PI), mat(P.gunMetal, METAL), 0, 1.05, 0);
    loop.rotation.y = Math.PI / 2; b.add(loop);
    // sprickor på framsidan (+x, mot horden) och ovansidan, syns när blocket slits
    for (let i = 0; i < 5; i++) {
      const top = i === 4;
      const c = top
        ? sbox(0.2, 0.02, rnd(0.6, 1.2), crackM, rnd(-0.05, 0.05), 1.06, rnd(-0.9, 0.9))
        : sbox(0.02, rnd(0.3, 0.7), 0.05, crackM, 0.29 - 0.0, rnd(0.45, 0.8), rnd(-1.2, 1.2));
      if (!top) { c.rotation.z = -0.17; c.rotation.x = rnd(-0.6, 0.6); c.position.x = 0.25; }
      c.userData = { at: rnd(0.45, 0.9) }; c.visible = false; c.castShadow = false;
      b.add(c); cracks.push(c);
    }
    b.position.set(rnd(-0.08, 0.08), 0, z + rnd(-0.05, 0.05));
    b.rotation.y = rnd(-0.04, 0.04);
    b.userData = { x: b.position.x, ry: b.rotation.y, tilt: rnd(0.12, 0.3), skew: rnd(-0.18, 0.18) };
    g.add(b); blocks.push(b);
  }
  for (let i = 0; i < 12; i++) {                                          // lossade bitar framför blocken
    const d = mesh(geo('dodeca', 1, 0), concrete, rnd(0.6, 1.3), 0.08, rnd(-4.2, 4.2));
    d.scale.setScalar(rnd(0.08, 0.2)); d.rotation.set(rnd(0, 3), rnd(0, 3), 0); d.castShadow = false;
    d.userData = { at: rnd(0.3, 0.75) }; d.visible = false;
    g.add(d); debris.push(d);
  }
  g.userData = { kind: 'obstacle', type: 'block', blocks, cracks, debris, concrete, grime };
  return g;
}

export function obstacleModel(type) {
  const g = type === 'block' ? blockObstacle() : wireObstacle();
  setObstacleWear(g, 1);
  return g;
}

const C_TMP = new THREE.Color();
const C_CONC_DARK = new THREE.Color(P.concreteDark), C_CRACK = new THREE.Color(P.crack);

// Städar en modell som tas bort: bara material och geometrier som är modellens egna.
// Delade (mat()-cachen och geo()-cachen) rörs aldrig.
export function disposeModel(group) {
  const done = new Set();
  group.traverse(o => {
    const g = o.geometry;
    if (g && g.userData.own && !g.userData.shared && !done.has(g)) { done.add(g); g.dispose(); }
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) if (m.userData.own && !done.has(m)) { done.add(m); m.dispose(); }
  });
  group.removeFromParent();
}
// fraction 1 = helt, 0 = borta
export function setObstacleWear(group, fraction) {
  const f = Math.max(0, Math.min(1, fraction));
  const u = group.userData;
  group.visible = f > 0.001;
  if (u.type === 'wire') {
    for (const c of u.coils) {
      c.visible = f > c.userData.cut * 0.9 || f >= 0.999;
      c.position.y = c.userData.y * (0.45 + 0.55 * f);
      if (c.userData.rx !== undefined) {
        c.scale.y = 0.65 + 0.35 * f;
        c.rotation.x = c.userData.rx + (1 - f) * c.userData.fall * 0.5;
      }
    }
    for (const p of u.posts) p.rotation.z = p.userData.rz + (1 - f) * p.userData.fall * 0.45;
  } else if (u.type === 'block') {
    const w = 1 - f;
    for (const b of u.blocks) {
      b.rotation.z = w * b.userData.tilt;
      b.rotation.y = b.userData.ry + w * b.userData.skew;
      b.position.x = b.userData.x - w * 0.35;
    }
    for (const c of u.cracks) c.visible = f < c.userData.at;
    for (const d of u.debris) d.visible = f < d.userData.at;
    u.concrete.color.copy(C_TMP.set(P.concrete).lerp(C_CONC_DARK, w * 0.65));
    u.grime.color.copy(C_TMP.set(P.grime).lerp(C_CRACK, w * 0.5));
  }
}

// ---------- zombier ----------

const GAIT = {
  walker: { lean: [0.05, 0.14], amp: 0.55, sway: 0.08, arms: 0.1, bob: 0.02 },
  runner: { lean: [0.17, 0.2], amp: 0.85, sway: 0.05, arms: 0.6, bob: 0.06 },
  brute:  { lean: [0.08, 0.16], amp: 0.38, sway: 0.13, arms: 0.12, bob: 0.04 },
};

// Trasor och fläckar: små platta lådor på kroppen.
function tatter(h, color, n) {
  for (let i = 0; i < n; i++) {
    const s = sbox(rnd(0.08, 0.16), rnd(0.12, 0.3), 0.03, mat(color), rnd(-0.3, 0.3), 0.8, pick([-0.2, 0.2]));
    s.rotation.z = rnd(-0.3, 0.3); s.castShadow = false; h.body.add(s);
  }
}
function stain(parent, w, hgt, x, y, z) {
  const s = sbox(w, hgt, 0.02, mat(pick([P.blood, P.bloodDark])), x, y, z);
  s.castShadow = false; parent.add(s);
}

export function zombieModel(type = 'walker') {
  const def = ZOMBIES[type] ?? ZOMBIES.walker;
  const gait = GAIT[type] ?? GAIT.walker;
  const skin = pick(type === 'brute' ? P.zBruteSkin : P.zSkin);
  const shirt = pick(type === 'runner' ? P.zRunnerShirt : type === 'brute' ? P.zBruteShirt : P.zShirt);
  const h = humanoid({ skin, shirt, pants: pick(P.zPants) });
  const sleeveL = h.shL.children[0], sleeveR = h.shR.children[0];

  if (type === 'runner') {
    h.torso.scale.set(0.8, 1, 0.85);
    for (const hip of [h.hipL, h.hipR]) hip.children[0].scale.set(0.82, 1, 0.85);
    for (const sh of [h.shL, h.shR]) sh.children.forEach(c => c.scale.set(0.8, 1, 0.8));
    h.shL.position.x = -0.4; h.shR.position.x = 0.4;
    h.head.position.z = 0.1; h.head.rotation.x = -0.25;
    h.shL.rotation.x = 0.5 + rnd(-0.2, 0.2); h.shR.rotation.x = -0.3 + rnd(-0.2, 0.2);
    tatter(h, P.zRunnerShirt[0], 5);
    if (Math.random() < 0.6) sleeveL.material = mat(skin);
  } else if (type === 'brute') {
    h.torso.scale.set(1.32, 1.1, 1.3);
    h.shL.position.x = -0.62; h.shR.position.x = 0.62;
    for (const sh of [h.shL, h.shR]) { sh.scale.set(1.5, 1.12, 1.45); }
    sleeveL.material = mat(skin); sleeveR.material = mat(skin);       // bara armar
    h.head.scale.setScalar(0.9); h.head.position.set(0, 1.97, 0.08);
    for (const hip of [h.hipL, h.hipR]) hip.children[0].scale.set(1.25, 1, 1.2);
    h.shL.rotation.x = -0.4 + rnd(-0.2, 0.2); h.shR.rotation.x = -0.9 + rnd(-0.3, 0.2);
    h.shL.rotation.z = -0.15; h.shR.rotation.z = 0.15;
    stain(h.body, 0.4, 0.3, rnd(-0.2, 0.2), rnd(1.1, 1.5), 0.28);
    tatter(h, shirt, 3);
  } else {
    h.shL.rotation.x = -1.3 + rnd(-0.2, 0.2); h.shR.rotation.x = Math.random() < 0.25 ? rnd(-0.2, 0.1) : -1.2 + rnd(-0.3, 0.2);
    if (Math.random() < 0.3) pick([sleeveL, sleeveR]).material = mat(skin);
    if (Math.random() < 0.5) tatter(h, shirt, 2 + (Math.random() * 2 | 0));
  }
  if (type !== 'brute' && Math.random() < 0.65) stain(h.body, rnd(0.15, 0.35), rnd(0.15, 0.4), rnd(-0.2, 0.2), rnd(1.05, 1.5), 0.22);
  if (Math.random() < 0.5) stain(h.head, 0.2, 0.12, rnd(-0.1, 0.1), rnd(-0.15, 0), 0.22);

  h.head.rotation.y = rnd(-0.2, 0.2);
  h.head.rotation.z = rnd(-0.35, 0.35);
  if (type !== 'runner') h.head.rotation.x = rnd(-0.1, 0.3);
  const lean = rnd(gait.lean[0], gait.lean[1]);
  h.body.rotation.x = lean;
  h.root.scale.setScalar(def.scale);
  return { ...h, root: h.root, scale: def.scale, type, lean, gait, arm0: [h.shL.rotation.x, h.shR.rotation.x] };
}

// Gångcykel. phase växer med sträckan (ungefär 2.6 per meter för en vandrare).
export function zombieWalk(z, phase) {
  const g = z.gait, s = Math.sin(phase);
  z.hipL.rotation.x = s * g.amp; z.hipR.rotation.x = -s * g.amp;
  z.body.rotation.z = s * g.sway;
  z.body.rotation.x = z.lean;
  z.body.position.y = Math.abs(Math.cos(phase)) * g.bob;
  z.shL.rotation.x = z.arm0[0] - s * g.arms; z.shR.rotation.x = z.arm0[1] + s * g.arms;
}

// ---------- positionsmarkör ----------

export function slotMarker(state = 'free') {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: P.paper, transparent: true, opacity: 0.35, depthWrite: false });
  const lockM = new THREE.MeshBasicMaterial({ color: P.paper, transparent: true, opacity: 0.5, depthWrite: false });
  const holeM = new THREE.MeshBasicMaterial({ color: P.ink, transparent: true, opacity: 0.6, depthWrite: false });
  m.userData.own = lockM.userData.own = holeM.userData.own = true;
  const ring = new THREE.Group();
  const dashes = 28, len = TAU / dashes;
  for (let i = 0; i < dashes; i++) {
    const d = new THREE.Mesh(geo('ring', 2.1, 2.3, 4, 1, i * len, len * 0.62), m);
    d.rotation.x = -Math.PI / 2; ring.add(d);
  }
  ring.position.y = 0.05;
  const plus = new THREE.Group();
  for (const rz of [0, Math.PI / 2]) {
    const p = new THREE.Mesh(geo('plane', 0.25, 1.4), m);
    p.rotation.set(-Math.PI / 2, 0, rz); plus.add(p);
  }
  plus.position.y = 0.06;
  // hänglås platt på marken, toppen pekar uppåt i bild
  const lock = new THREE.Group();
  const lockFlat = new THREE.Group();
  lockFlat.add(new THREE.Mesh(geo('plane', 0.95, 0.75), lockM));
  const shackle = new THREE.Mesh(geo('ring', 0.22, 0.36, 12, 1, 0, Math.PI), lockM);
  shackle.position.y = 0.375; lockFlat.add(shackle);
  for (const x of [-0.29, 0.29]) { const leg = new THREE.Mesh(geo('plane', 0.14, 0.12), lockM); leg.position.set(x, 0.43, 0); lockFlat.add(leg); }
  const hole = new THREE.Mesh(geo('plane', 0.1, 0.24), holeM);
  hole.position.set(0, -0.06, 0.001); lockFlat.add(hole);
  lockFlat.rotation.x = -Math.PI / 2;
  lock.add(lockFlat); lock.rotation.y = Math.PI / 4; lock.position.y = 0.06;
  g.add(ring, plus, lock);
  g.userData = { kind: 'slot', m, lockM, ring, plus, lock };
  setSlotMarkerState(g, state);
  return g;
}

// state: 'free' | 'locked' | 'hover' | 'selected'. En låst position behåller hänglåset även när
// den är markerad eller pekas på.
export function setSlotMarkerState(group, state) {
  const u = group.userData;
  if (state === 'locked') u.locked = true;
  else if (state === 'free') u.locked = false;
  u.state = state;
  u.lock.visible = !!u.locked;
  u.plus.visible = !u.locked;
  const sel = state === 'selected', hov = state === 'hover';
  u.m.color.set(sel ? P.rust : P.paper);
  u.lockM.color.set(sel ? P.rust : P.paper);
  u.m.opacity = sel ? 0.85 : hov ? (u.locked ? 0.32 : 0.6) : u.locked ? 0.16 : 0.35;
  u.lockM.opacity = sel ? 0.85 : hov ? 0.7 : 0.5;
  u.ring.scale.setScalar(sel ? 1.04 : hov ? 1.02 : 1);
}
