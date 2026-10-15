// Alla spelets modeller, byggda i kod av byggsatsen. Visas i lookbook.html innan de används i spelet.
import * as THREE from 'three';
import { rnd, pick, mat, mesh, box, sbox, geo, humanoid, canvasTex, PALETTE as P } from './kit.js';
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

// Soldaten: samma människa som zombierna, rak rygg, väst och hjälm. 16 meshar.
function soldier() {
  const s = humanoid({ skin: P.soldierSkin, shirt: P.soldierShirt, pants: P.soldierPants, helmet: P.helmet,
    build: { chestW: 0.46, waistW: 0.38, shX: 0.27, armW: 0.115, foreW: 0.1, legW: 0.16, shinW: 0.13 } });
  const b = s.build;
  s.spine.add(box(b.chestW + 0.06, 0.4, b.chestD + 0.08, mat(P.vest), 0, b.torsoH - 0.24, 0));
  s.spine.add(box(0.3, 0.12, 0.08, mat(P.ammo), 0, b.torsoH - 0.42, b.chestD / 2 + 0.06)); // magasinsfickor
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

// Granatlådan: öppen trälåda med gul rand och granater i facken. Står bredvid skytten. 12 meshar.
function grenadeCrate(g, x, z, ry) {
  const c = new THREE.Group();
  c.add(box(0.7, 0.3, 0.46, mat(P.crate), 0, 0.15, 0));
  c.add(box(0.72, 0.05, 0.08, mat(P.grenadeBand), 0, 0.22, 0.22));             // gul rand fram
  const lid = box(0.72, 0.05, 0.46, mat(P.crateDark), 0, 0.36, -0.36);
  lid.rotation.x = -1.1; c.add(lid);                                             // locket uppfällt
  const gm = mat(P.grenade, { roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const n = mesh(geo('sphere', 0.085, 7, 5), gm, -0.22 + (i % 3) * 0.22, 0.32, i < 3 ? -0.1 : 0.1);
    n.scale.y = 1.25; c.add(n);
  }
  c.add(box(0.03, 0.06, 0.03, mat(P.gunDark), -0.22, 0.43, -0.1));              // tändrör på en
  c.add(box(0.03, 0.06, 0.03, mat(P.gunDark), 0.22, 0.43, 0.1));
  c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  return c;
}
// En granat i luften eller i lådan (lookbook och fx delar formen).
export function grenadeModel() {
  const g = new THREE.Group();
  const body = mesh(geo('sphere', 0.11, 8, 6), mat(P.grenade, { roughness: 0.7 }));
  body.scale.y = 1.25; g.add(body);
  g.add(box(0.04, 0.07, 0.04, mat(P.gunDark), 0, 0.15, 0));
  return g;
}

// kit: positionen har en granatlåda (ritas bredvid skytten).
export function weaponModel(type, level = 1, { kit = false } = {}) {
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
    // står bakom spadgreppen, lutar in i vapnet
    gunner.root.position.set(-1.0, -1.15, 0);
    gunner.spine.rotation.x = 0.28; gunner.head.rotation.x = -0.25;
    gunner.hipL.rotation.x = -0.25; gunner.kneeL.rotation.x = 0.35; gunner.hipR.rotation.x = 0.15; gunner.kneeR.rotation.x = 0.1;
    gunner.shL.rotation.set(-1.0, 0, 0.12); gunner.shR.rotation.set(-1.0, 0, -0.12);
    gunner.elL.rotation.x = -0.55; gunner.elR.rotation.x = -0.55;
  } else {
    // på ett knä bakom kulsprutan
    gunner.root.position.set(-1.0, -0.95, 0);
    gunner.body.position.y = -0.47;
    gunner.hipL.rotation.x = -1.45; gunner.kneeL.rotation.x = 1.5;
    gunner.hipR.rotation.x = 0.25; gunner.kneeR.rotation.x = 1.75;
    gunner.spine.rotation.x = 0.45; gunner.head.rotation.x = -0.45;
    gunner.shL.rotation.set(-1.15, 0, 0.1); gunner.shR.rotation.set(-1.05, 0, -0.1);
    gunner.elL.rotation.x = -0.45; gunner.elR.rotation.x = -0.6;
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
  if (kit) grenadeCrate(group, heavy ? -0.85 : -0.6, heavy ? -1.6 : -1.35, 0.35);
  group.userData = { kind: 'weapon', type, level, kit };
  return { group, pivot, muzzle, gunner };
}

// ---------- hinder ----------
// Origo i rutans mitt. Rutan är 3 m längs x och täcker hela vägbredden (9 m) längs z.
// span: bredden längs z (Gnestas rutor är 2 m; en spärr över gatan är flera rutor bredvid varandra).

function wireObstacle(span = 9) {
  const g = new THREE.Group();
  const steel = mat(P.wireSteel, { metalness: 0.6, roughness: 0.5 });
  const coils = [], posts = [];
  const hz = span / 2 - 0.3, narrow = span < 4;
  for (const x of narrow ? [-0.45, 0.45] : [-0.8, 0.8]) {
    for (let z = -hz; z <= hz + 0.1; z += 0.55) {
      const t = mesh(geo('torus', 0.55, 0.025, 4, 18), steel, x + rnd(-0.1, 0.1), 0.55, z + rnd(-0.05, 0.05));
      t.rotation.set(rnd(-0.2, 0.2), Math.PI / 2 + rnd(-0.3, 0.3), 0);
      t.userData = { y: t.position.y, rx: t.rotation.x, cut: rnd(0.05, 0.85), fall: rnd(-1, 1) };
      g.add(t); coils.push(t);
    }
  }
  const wood = mat(P.post);
  for (let z = -hz; z <= hz + 0.1; z += narrow ? hz * 2 : 2.1) {
    for (const x of narrow ? [-0.45, 0.45] : [-0.8, 0.8]) {
      const p = box(0.1, 1.3, 0.1, wood, x + rnd(-0.08, 0.08), 0.65, z + rnd(-0.15, 0.15));
      p.rotation.z = rnd(-0.15, 0.15);
      p.userData = { rz: p.rotation.z, fall: Math.random() < 0.5 ? -1 : 1 };
      g.add(p); posts.push(p);
    }
  }
  // spänd tråd mellan stolparna
  for (const x of narrow ? [-0.45, 0.45] : [-0.8, 0.8]) {
    for (const y of [0.45, 1.05]) {
      const s = mesh(geo('cylinder', 0.012, 0.012, span - 0.4, 3), steel, x, y, 0);
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

function blockObstacle(span = 9) {
  const g = new THREE.Group();
  // egen materialkopia så att slitage kan mörka just det här hindret
  const concrete = new THREE.MeshStandardMaterial({ color: P.concrete, roughness: 0.95, metalness: 0, flatShading: true });
  const grime = new THREE.MeshStandardMaterial({ color: P.grime, roughness: 1, metalness: 0, flatShading: true });
  concrete.userData.own = true; grime.userData.own = true;
  const crackM = mat(P.crack);
  const narrow = span < 4;
  const len = narrow ? span - 0.08 : 2.8, blocks = [], cracks = [], debris = [];
  for (const z of narrow ? [0] : [-3, 0, 3]) {
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
        : sbox(0.02, rnd(0.3, 0.7), 0.05, crackM, 0.29 - 0.0, rnd(0.45, 0.8), rnd(-len * 0.43, len * 0.43));
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
    const d = mesh(geo('dodeca', 1, 0), concrete, rnd(0.6, 1.3), 0.08, rnd(-span / 2 + 0.3, span / 2 - 0.3));
    d.scale.setScalar(rnd(0.08, 0.2)); d.rotation.set(rnd(0, 3), rnd(0, 3), 0); d.castShadow = false;
    d.userData = { at: rnd(0.3, 0.75) }; d.visible = false;
    g.add(d); debris.push(d);
  }
  g.userData = { kind: 'obstacle', type: 'block', blocks, cracks, debris, concrete, grime };
  return g;
}

export function obstacleModel(type, { span = 9 } = {}) {
  const g = type === 'block' ? blockObstacle(span) : wireObstacle(span);
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
// Verkliga proportioner (stilbibeln, Proportioner): litet huvud, långa smala lemmar med
// armbågar och knän, krökt rygg och huvudet hängande framåt. Högst 16 meshar per zombie.

// Mått per typ, ovanpå BUILD i kit.js.
const BUILDS = {
  walker: { chestW: 0.4, waistW: 0.34, chestD: 0.24, shX: 0.22, armW: 0.1, foreW: 0.085, legW: 0.14, shinW: 0.11 },
  runner: { chestW: 0.37, waistW: 0.3, chestD: 0.21, shX: 0.21, armW: 0.09, foreW: 0.078, legW: 0.13, shinW: 0.1,
            thigh: 0.5, shin: 0.52, hipY: 1.02, upper: 0.31, fore: 0.29 },
  // stor och tung men mänsklig: bred bröstkorg, tjocka lemmar, litet huvud på framskjuten nacke
  brute:  { chestW: 0.58, waistW: 0.5, chestD: 0.36, shX: 0.33, armW: 0.16, foreW: 0.14, legW: 0.2, shinW: 0.16,
            hipX: 0.14, thigh: 0.46, shin: 0.48, hipY: 0.94, torsoH: 0.64, upper: 0.33, fore: 0.31, head: 0.24 },
};
// lean: ryggens krökning framåt (radianer). amp: höftens sving, knee: knäböj i svingen,
// arms: armsving, elbow: armbågen i vila, hang: hur långt huvudet hänger.
const GAIT = {
  walker: { lean: [0.22, 0.36], amp: 0.42, knee: 0.75, sway: 0.08, arms: 0.12, bob: 0.025, hang: [0.25, 0.55] },
  runner: { lean: [0.38, 0.48], amp: 0.85, knee: 1.55, sway: 0.04, arms: 0.95, bob: 0.07, hang: [-0.1, 0.1], sprint: true },
  brute:  { lean: [0.24, 0.34], amp: 0.32, knee: 0.5, sway: 0.12, arms: 0.1, bob: 0.04, hang: [0.1, 0.3] },
};

// Ryck: hur ofta och hur hårt, per typ. period = sekunder mellan möjliga ryck, chance = andel
// perioder med ryck, head/shoulder = utslag i radianer, stutter = andel av ett steg som hakar upp
// sig, lurch = hur långt kroppen kastas framåt, stomp = bjässens stöt i varje steg, shake = darr.
const TWITCH = {
  walker: { period: 1.7, chance: 0.75, head: 0.55, shoulder: 0.45, stutter: 0.9, lurch: 0.3, stomp: 0, shake: 0.02, snap: 0.5 },
  runner: { period: 0.8, chance: 0.8, head: 0.45, shoulder: 0.5, stutter: 0.4, lurch: 0.25, stomp: 0, shake: 0.06, snap: 0.25 },
  brute:  { period: 2.4, chance: 0.6, head: 0.35, shoulder: 0.3, stutter: 0.5, lurch: 0.15, stomp: 1, shake: 0.01, snap: 0.6 },
};

// Hash av två heltal till 0..1. Samma zombie-id ger alltid samma ryck (ingen Math.random).
function hash(a, b) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// Ett ryck: i vissa perioder (andel chance) en kort puls av längden len sekunder, snabb upp och
// långsammare ner, med tecken. Annars 0. salt skiljer olika slags ryck åt.
function jolt(seed, t, period, chance, len, salt) {
  const k = t / period + hash(seed, salt) * 9;
  const n = Math.floor(k);
  if (hash(seed, n * 31 + salt) > chance) return 0;
  const start = hash(seed, n * 17 + salt + 5) * (period - len);
  const x = ((k - n) * period - start) / len;
  if (x < 0 || x > 1) return 0;
  const shape = x < 0.2 ? x / 0.2 : 1 - (x - 0.2) / 0.8;
  return shape * shape * (hash(seed, n * 13 + salt + 9) < 0.5 ? -1 : 1);
}
// Sätter zombiens frö: fasförskjutning och olika utslag per ben och arm (asymmetri).
export function seedZombie(z, id) {
  z.seed = id | 0;
  z.legLag = (hash(id, 1) - 0.5) * 0.9;           // ena benet släpar i fas
  z.legAmp = [0.8 + hash(id, 2) * 0.4, 0.8 + hash(id, 3) * 0.4];
  z.armLag = (hash(id, 4) - 0.5) * 1.6;
  z.tw = TWITCH[z.type] ?? TWITCH.walker;
}

// Trasig fåll: smala trasor som hänger under tröjan, fram och bak. Platta, utan skugga.
function hem(h, color, n) {
  const b = h.build;
  for (let i = 0; i < n; i++) {
    const front = i % 2 === 0;
    const s = sbox(rnd(0.07, 0.13), rnd(0.12, 0.22), 0.02, mat(color),
      rnd(-b.waistW * 0.4, b.waistW * 0.4), -0.06, (front ? 1 : -1) * (b.chestD * 0.42));
    s.rotation.set(front ? 0.12 : -0.12, 0, rnd(-0.35, 0.35)); s.castShadow = false;
    h.spine.add(s);
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
  // bara underarmar: bjässen alltid, löparen ofta, vandraren ibland
  const bare = type === 'brute' ? [true, true]
    : type === 'runner' ? [Math.random() < 0.6, Math.random() < 0.4]
    : [Math.random() < 0.3, Math.random() < 0.3];
  const h = humanoid({ skin, shirt, pants: pick(P.zPants), build: BUILDS[type] ?? BUILDS.walker, bare });
  const b = h.build;

  // Armarna i vila, ojämnt: en sträcker sig, en hänger. [axel x, axel z, armbåge] per arm.
  let arms;
  if (type === 'runner') {
    arms = [[-0.3, -0.12, -1.35], [-0.3, 0.12, -1.35]];
  } else if (type === 'brute') {
    arms = [[-0.35 + rnd(-0.15, 0.1), -0.2, -0.35 + rnd(-0.2, 0.1)], [-0.6 + rnd(-0.2, 0.15), 0.22, -0.5 + rnd(-0.2, 0.1)]];
  } else {
    // [axel x, utåt, armbåge]; utåt speglas per sida nedan
    const reach = [-1.25 + rnd(-0.2, 0.2), 0.04, -0.25 + rnd(-0.2, 0.1)];
    const other = Math.random() < 0.45
      ? [reach[0] + rnd(-0.1, 0.35), 0.06, rnd(-0.5, -0.15)]       // båda armarna sträcks, ojämnt
      : [rnd(-0.15, 0.15), 0.1, rnd(-0.35, -0.1)];                  // den andra hänger
    arms = Math.random() < 0.5 ? [reach, other] : [other, reach];
    arms = [[arms[0][0], -arms[0][1], arms[0][2]], [arms[1][0], arms[1][1], arms[1][2]]];
  }
  h.shL.rotation.set(arms[0][0], 0, arms[0][1]); h.elL.rotation.x = arms[0][2];
  h.shR.rotation.set(arms[1][0], 0, arms[1][1]); h.elR.rotation.x = arms[1][2];

  // trasor, blod: 13 meshar i kroppen, högst 3 till
  if (type === 'runner') hem(h, shirt, 2);
  else if (type === 'brute') hem(h, shirt, 1);
  else if (Math.random() < 0.7) hem(h, shirt, 1 + (Math.random() < 0.5 ? 1 : 0));
  if (type === 'brute' || Math.random() < 0.65) stain(h.spine, rnd(0.12, 0.24) * b.chestW / 0.4, rnd(0.12, 0.26), rnd(-0.1, 0.1), rnd(0.25, 0.45), b.chestD / 2 + 0.012);

  const hang = rnd(gait.hang[0], gait.hang[1]);
  h.head.rotation.set(hang, rnd(-0.25, 0.25), rnd(-0.3, 0.3));
  if (type === 'brute') h.head.position.z += 0.06;
  const lean = rnd(gait.lean[0], gait.lean[1]);
  h.spine.rotation.x = lean;
  h.root.scale.setScalar(def.scale);
  const z = { ...h, scale: def.scale, type, lean, gait,
    arm0: [h.shL.rotation.x, h.shR.rotation.x], elbow0: [h.elL.rotation.x, h.elR.rotation.x],
    armZ0: [h.shL.rotation.z, h.shR.rotation.z], head0: [h.head.rotation.x, h.head.rotation.y, h.head.rotation.z] };
  seedZombie(z, (Math.random() * 1e6) | 0);   // vyn sätter om fröet till zombiens id
  return z;
}

// Gångcykel. phase växer med sträckan (ungefär 2.6 per meter för en vandrare).
// Knät böjs när benet svingar fram, ryggen gungar, armarna svänger från viloläget.
// t: vyns klocka i sekunder, driver ryckningarna (twitch). Benen och armarna går lite i otakt.
export function zombieWalk(z, phase, t = 0) {
  const g = z.gait, tw = z.tw;
  // Snubbelsteg: steget hakar upp sig en kort stund (fasen hålls tillbaka).
  const stutter = Math.abs(jolt(z.seed, t, tw.period * 1.9, tw.chance * 0.6, 0.35, 21));
  const ph = phase - stutter * tw.stutter;
  const s = Math.sin(ph), c = Math.cos(ph);
  const sR = Math.sin(ph + z.legLag), cR = Math.cos(ph + z.legLag);
  z.body.rotation.set(0, 0, s * g.sway);
  z.body.position.y = Math.abs(c) * g.bob - (g.sprint ? 0.05 : 0.02);
  z.body.position.z = 0;
  z.hipL.rotation.x = s * g.amp * z.legAmp[0] - (g.sprint ? 0.25 : 0.05);
  z.hipR.rotation.x = -sR * g.amp * z.legAmp[1] - (g.sprint ? 0.25 : 0.05);
  z.kneeL.rotation.x = 0.12 + g.knee * Math.max(0, -c);
  z.kneeR.rotation.x = 0.12 + g.knee * Math.max(0, cR);
  z.spine.rotation.x = z.lean + Math.abs(s) * 0.03;
  const sa = Math.sin(ph + z.armLag);
  if (g.sprint) {
    // armarna pumpar motsatt benen med armbågen böjd
    z.shL.rotation.x = -0.35 - s * g.arms; z.shR.rotation.x = -0.35 + sa * g.arms;
    z.elL.rotation.x = -1.35 - Math.max(0, s) * 0.4; z.elR.rotation.x = -1.35 - Math.max(0, -sa) * 0.4;
  } else {
    z.shL.rotation.x = z.arm0[0] - s * g.arms; z.shR.rotation.x = z.arm0[1] + sa * g.arms;
    z.elL.rotation.x = z.elbow0[0]; z.elR.rotation.x = z.elbow0[1];
  }
  // Bjässen: tung stöt i varje fotisättning (när benet når sitt ytterläge).
  if (tw.stomp) {
    const plant = Math.pow(Math.abs(s), 10) * tw.stomp;
    z.body.position.y -= plant * 0.07;
    z.spine.rotation.x += plant * 0.1;
  }
  // Ryck framåt: kroppen kastas fram en kort stund och fångas upp.
  const lurch = Math.abs(jolt(z.seed, t, tw.period * 2.3, tw.chance * 0.5, 0.3, 33));
  z.body.position.z = lurch * tw.lurch;
  z.spine.rotation.x += lurch * 0.35;
  twitchUpper(z, t);
}

// Huvud och axlar: oregelbundna ryck, darr, och ibland ett knyck upp mot basen som hålls kvar.
function twitchUpper(z, t) {
  const tw = z.tw, sd = z.seed;
  const jh = jolt(sd, t, tw.period, tw.chance, 0.16, 1);
  const jv = jolt(sd, t, tw.period * 1.3, tw.chance * 0.7, 0.14, 2);
  const shake = tw.shake ? Math.sin(t * 37 + sd) * tw.shake : 0;
  // Knycket mot basen: huvudet rycks upp och framåt och står still en stund.
  const k = t / (tw.period * 3.1) + hash(sd, 7) * 5, n = Math.floor(k), f = k - n;
  const snap = hash(sd, n * 7 + 3) < 0.5 && f > 0.4 && f < 0.62 ? Math.min(1, (f - 0.4) / 0.02) * tw.snap : 0;
  z.head.rotation.set(
    z.head0[0] + jv * tw.head * 0.6 + shake - snap * (z.head0[0] + 0.25),
    z.head0[1] * (1 - snap) + jh * tw.head,
    z.head0[2] * (1 - snap) + jh * tw.head * 0.7 + shake);
  const js = jolt(sd, t, tw.period * 0.9, tw.chance * 0.8, 0.12, 4);
  z.shL.rotation.z = z.armZ0[0] + js * tw.shoulder;
  z.shR.rotation.z = z.armZ0[1] - jolt(sd, t, tw.period * 1.1, tw.chance * 0.8, 0.12, 5) * tw.shoulder;
  z.spine.rotation.z = js * 0.12;
}

// Slår mot ett hinder: står still med böjda knän, armarna hackar växelvis över huvudet.
export function zombieAttack(z, chop, t = 0) {
  zombieWalk(z, 0, t);
  z.hipL.rotation.x = -0.35; z.kneeL.rotation.x = 0.5;
  z.hipR.rotation.x = 0.2; z.kneeR.rotation.x = 0.35;
  z.body.position.y = -0.05;
  z.spine.rotation.x = z.lean + 0.15 + Math.max(0, Math.sin(chop)) * 0.12;
  const a = Math.sin(chop), b = Math.sin(chop + Math.PI);
  z.shL.rotation.x = -2.0 + a * 0.75; z.elL.rotation.x = -0.35 - Math.max(0, a) * 0.8;
  z.shR.rotation.x = -2.0 + b * 0.75; z.elR.rotation.x = -0.35 - Math.max(0, b) * 0.8;
  z.body.position.z = 0;
}

// Faller bakåt. t 0..1 (redan kvadrerad av vyn). Knäna viker sig, ryggen rätas ut och armarna
// slängs upp och ut. Ligger på rygg vid t = 1, lyft så att kroppen inte sjunker genom marken.
export function zombieFall(z, t) {
  z.body.rotation.x = -Math.PI / 2 * t;
  z.body.position.z *= 1 - t;
  z.body.rotation.z *= 0.8;
  z.body.position.y = 0.12 * t + (1 - t) * z.body.position.y;
  z.spine.rotation.x = z.lean * (1 - t) - 0.1 * t;
  z.head.rotation.x += (-0.3 - z.head.rotation.x) * t * 0.3;
  z.hipL.rotation.x += (-0.6 - z.hipL.rotation.x) * t * 0.4; z.kneeL.rotation.x += (0.9 - z.kneeL.rotation.x) * t * 0.4;
  z.hipR.rotation.x += (-0.15 - z.hipR.rotation.x) * t * 0.4; z.kneeR.rotation.x += (0.3 - z.kneeR.rotation.x) * t * 0.4;
  z.shL.rotation.x += (-2.6 - z.shL.rotation.x) * t * 0.5; z.shL.rotation.z += (-0.6 - z.shL.rotation.z) * t * 0.4;
  z.shR.rotation.x += (-2.3 - z.shR.rotation.x) * t * 0.5; z.shR.rotation.z += (0.7 - z.shR.rotation.z) * t * 0.4;
  z.elL.rotation.x *= 1 - t * 0.3; z.elR.rotation.x *= 1 - t * 0.3;
}

// ---------- placeringens spöke ----------
// Vapnets modell (nivå 1) i en enda genomskinlig färg: grön där pjäsen får stå, röd där den inte
// får. Följer pekaren i placeringsläget. Ett eget material, delad geometri med vapnet.
export const GHOST_OK = '#7fbf5a', GHOST_BAD = '#c8452f';
export function weaponGhost(type) {
  const model = weaponModel(type, 1);
  const m = new THREE.MeshBasicMaterial({ color: GHOST_OK, transparent: true, opacity: 0.5, depthWrite: false });
  m.userData.own = true;
  model.group.traverse(o => {
    if (!o.isMesh) return;
    o.material = m; o.castShadow = false; o.receiveShadow = false;
  });
  // en platt ring under pjäsen: rutan den står på
  const ring = new THREE.Mesh(geo('ring', 0.9, 1.15, 4, 1, Math.PI / 4), m);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
  model.group.add(ring);
  model.group.userData.ghost = { m, ok: true };
  model.group.renderOrder = 4;
  return model.group;
}
// Spöket för ett hinder i handen: hindrets modell i samma genomskinliga grönt eller rött.
export function obstacleGhost(type, opts) {
  const g = obstacleModel(type, opts);
  const m = new THREE.MeshBasicMaterial({ color: GHOST_OK, transparent: true, opacity: 0.5, depthWrite: false });
  m.userData.own = true;
  g.traverse(o => { if (o.isMesh || o.isLine) { o.material = m; o.castShadow = false; o.receiveShadow = false; } });
  g.userData.ghost = { m, ok: true };
  g.renderOrder = 4;
  return g;
}
export function setGhostTone(group, ok) {
  const u = group.userData.ghost;
  if (u.ok === ok) return;
  u.ok = ok;
  u.m.color.set(ok ? GHOST_OK : GHOST_BAD);
  u.m.opacity = ok ? 0.5 : 0.42;
}

// ---------- basen ----------
// Vägspärr där vägen tar slut: sandsäcksvallar på båda sidor, en bom tvärs över vägen,
// en vaktkur med skylten BASEN och en flagga. Origo = grindlinjen mitt på vägen,
// +x mot horden. Alla material är egna, så att basen kan lysa rött utan att andra modeller gör det.
function sandbagWall(g, x, z0, z1, layers = 3) {
  const bags = P.sandbag.map(c => mat(c));
  const n = Math.max(2, Math.round(Math.abs(z1 - z0) / 0.62));
  for (let layer = 0; layer < layers; layer++) {
    const odd = layer % 2;
    for (let i = 0; i < n - odd; i++) {
      const z = z0 + (z1 - z0) * ((i + 0.5 + odd * 0.5) / n);
      const s = mesh(geo('sphere', 0.5, 7, 5), pick(bags), x + rnd(-0.04, 0.04), 0.26 + layer * 0.34, z);
      s.scale.set(0.62 * rnd(0.94, 1.06), 0.42, 0.72 * rnd(0.94, 1.06));
      s.rotation.y = rnd(-0.1, 0.1);
      g.add(s);
    }
  }
}
function signTexture(text) {
  return canvasTex(256, (g, s) => {
    g.fillStyle = P.stencil; g.fillRect(0, 0, s, s);
    g.fillStyle = P.ink;
    g.font = 'bold 84px Oswald, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, s / 2, s / 2 + 4);
  });
}
export function baseModel() {
  const g = new THREE.Group();
  // Vallar: lucka för vägen i mitten (bommen stänger den).
  sandbagWall(g, 0, -2.7, -6.2, 3);
  sandbagWall(g, 0, 2.7, 5.4, 3);
  sandbagWall(g, -0.62, -2.9, -5.6, 2);
  sandbagWall(g, -0.62, 2.9, 5.0, 2);
  // Bommen: stolpe med motvikt och randig stång tvärs över vägen.
  const postM = mat(P.gunMetal, { metalness: 0.4, roughness: 0.6 });
  g.add(box(0.34, 1.25, 0.34, postM, 0.15, 0.62, -2.75));
  g.add(box(0.5, 0.4, 0.5, mat(P.concreteDark), 0.15, 0.2, -2.75));
  g.add(box(0.28, 0.28, 0.6, postM, 0.15, 1.12, -3.25));
  const stripes = [mat(P.paper), mat(P.rust)];
  for (let i = 0; i < 9; i++) {
    g.add(box(0.12, 0.12, 0.58, stripes[i % 2], 0.15, 1.12, -2.4 + i * 0.58));
  }
  g.add(box(0.2, 0.9, 0.2, postM, 0.15, 0.45, 2.85));       // stöd där bommen vilar
  // Vaktkur bakom södra vallen, skylten mot vägen.
  const booth = new THREE.Group();
  const wall = mat(P.wall), roof = mat(P.concreteDark), glass = mat(P.carGlass, { roughness: 0.3, metalness: 0.4 });
  booth.add(box(2.0, 2.3, 2.0, wall, 0, 1.15, 0));
  booth.add(box(2.4, 0.18, 2.4, roof, 0, 2.39, 0));
  booth.add(box(1.5, 0.55, 0.04, glass, 0, 1.6, 1.01));          // fönster mot vägen
  booth.add(box(0.04, 0.55, 1.3, glass, 1.01, 1.6, 0));           // fönster mot horden
  booth.add(box(0.7, 1.5, 0.04, mat(P.crateDark), -0.55, 0.75, -1.01));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.6), new THREE.MeshStandardMaterial({ map: signTexture('BASE'), roughness: 0.9 }));
  sign.material.map.repeat.set(1, 0.35); sign.material.map.offset.set(0, 0.325);
  sign.position.set(0, 2.05, 1.03); booth.add(sign);
  booth.position.set(-2.4, 0, -6.4);
  g.add(booth);
  // Flaggstång vid kuren.
  g.add(mesh(geo('cylinder', 0.05, 0.06, 4.6, 6), postM, -0.9, 2.3, -7.3));
  const flag = box(1.1, 0.7, 0.03, mat(P.soldierShirt), -0.32, 4.15, -7.3);
  g.add(flag);
  // Lådor och en tunna innanför vallen.
  for (const [x, z, ry] of [[-1.4, 3.8, 0.2], [-1.6, 4.5, -0.3]]) {
    const c = new THREE.Group();
    c.add(box(0.78, 0.36, 0.42, mat(P.crate), 0, 0.18, 0));
    c.add(box(0.82, 0.07, 0.46, mat(P.crateDark), 0, 0.38, 0));
    c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  }
  // Egna material: varje mesh får en kopia som kan lysa rött.
  const mats = [];
  g.traverse(o => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    o.material.userData.own = true;
    if (o.material.emissive) mats.push(o.material);
  });
  g.userData = { kind: 'base', mats, flag };
  return g;
}
// Rött sken över hela basen. k 0..1.
export function setBaseGlow(group, k) {
  for (const m of group.userData.mats) { m.emissive.setRGB(0.9 * k, 0.08 * k, 0.04 * k); }
}

// ---------- ishallens entré (Gnestas bas) ----------
// Överlevarna är inne i ishallen och har spikat igen dörrarna. Origo = fasaden mitt för
// huvudingången, +x ut mot rondellen, z längs fasaden. doors: dörrarnas lägen (z) i samma ram,
// main: huvudingångens mitt. Skadan (setBaseDamage, 0 hel till 1 fallen) syns som plankor som
// buktar in och lossnar, sprickor och blod på fasaden. Bestämd ur ett frö: samma skada ser
// alltid likadan ut.
const seeded = seed => {
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (x, y) => x + r() * (y - x);
  return r;
};
const DECAL_W = 9, DECAL_H = 3.6, DECAL_STAGES = 5;
function drawDecal(g, W, H, stage, z0) {
  g.clearRect(0, 0, W, H);
  const r = seeded(9031);
  const X = z => (z - z0 + DECAL_W / 2) / DECAL_W * W, Y = y => H - y / DECAL_H * H;
  // Sprickor: tunna mörka linjer som grenar sig, fler för varje steg.
  const crack = (z, y, len, n) => {
    const pts = [[X(z), Y(y)]];
    for (let i = 0; i < n; i++) { const [px, py] = pts[pts.length - 1]; pts.push([px + r.range(-len, len), py + r.range(-len * 0.7, len * 0.9)]); }
    // ljus spricka (bar trä under färgen) med mörk skugga bredvid
    for (const [col, w, o] of [['rgba(14,8,6,0.85)', 3, 1.2], ['rgba(150,138,118,0.85)', 1.4, 0]]) {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px + o, py + o) : g.moveTo(px + o, py + o))); g.stroke();
    }
  };
  // Blod: utsmetade strimmor nedåt och handavtryck i zombiehöjd.
  const smear = (z, y, w, h, a) => {
    const x = X(z), yy = Y(y);
    const gr = g.createLinearGradient(x, yy, x, yy + h);
    gr.addColorStop(0, `rgba(100,13,8,${a})`); gr.addColorStop(1, 'rgba(90,10,6,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(x, yy + h / 2, w, h / 2, r.range(-0.2, 0.2), 0, 7); g.fill();
    for (let i = 0; i < 3; i++) { g.fillRect(x + r.range(-w, w), yy, r.range(1.5, 3.5), h * r.range(0.8, 1.6)); }
  };
  const hand = (z, y) => {
    const x = X(z), yy = Y(y); g.fillStyle = 'rgba(104,14,9,0.9)';
    g.beginPath(); g.ellipse(x, yy, 9, 11, 0, 0, 7); g.fill();
    for (let f = 0; f < 4; f++) { g.beginPath(); g.ellipse(x - 9 + f * 6, yy - 15, 2.5, 7, (f - 1.5) * 0.15, 0, 7); g.fill(); }
  };
  for (let s = 1; s <= stage; s++) {
    for (let i = 0; i < 2 + s * 2; i++) hand(z0 + r.range(-2.4, 2.4), r.range(0.9, 1.7));
    for (let i = 0; i < s * 2; i++) smear(z0 + r.range(-2.2, 2.2), r.range(0.6, 1.8), r.range(6, 14), r.range(30, 70) * (0.6 + s * 0.2), 0.45 + s * 0.1);
    for (let i = 0; i < s + 1; i++) crack(z0 + r.range(-4, 4), r.range(1.2, 3.2), 7 + s * 2, 3 + s);
    if (s >= 3) { g.fillStyle = 'rgba(96,12,8,0.75)'; g.fillRect(X(z0 - 1.9), Y(0.6), X(z0 + 1.9) - X(z0 - 1.9), Y(0) - Y(0.6)); }
  }
}
export function rinkEntranceModel({ doors, main = 0 }) {
  const g = new THREE.Group();
  const r = seeded(4423);
  const plankCols = ['#7a6146', '#6b5540', '#86704f', '#5e4b38'];
  const planks = [];
  const nail = mat(P.gunMetal, METAL);
  // Plankor tvärs över varje dörr; huvudingångens dubbeldörr får fler och ett snedstag.
  for (const z of doors) {
    const isMain = Math.abs(z - main) < 1.2;
    if (isMain && z > main) continue;          // dubbeldörren: en uppsättning över båda
    const zc = isMain ? main : z, w = isMain ? 3.6 : 1.9;
    const rows = isMain ? [0.45, 0.95, 1.45, 1.95] : [0.5, 1.2, 1.85];
    const add = (y, len, rx, ry2 = 0) => {
      const p = new THREE.Group();
      p.position.set(0.1, y, zc + r.range(-0.08, 0.08));
      p.rotation.set(rx, ry2, 0);
      const b = mesh(geo('box', 1, 1, 1), mat(plankCols[(r() * plankCols.length) | 0]), 0, 0, 0);
      b.scale.set(0.06, r.range(0.18, 0.24), len); p.add(b);
      for (const s of [-1, 1]) p.add(mesh(geo('box', 0.05, 0.05, 0.05), nail, 0.04, 0, s * (len / 2 - 0.12)));
      g.add(p);
      planks.push({ p, home: p.position.clone(), rot: p.rotation.clone(), len, k: r(), hang: r() < 0.5 ? -1 : 1, isMain });
    };
    for (const y of rows) add(y + r.range(-0.05, 0.05), w + r.range(0, 0.3), r.range(-0.12, 0.12));
    if (isMain) add(1.2, 3.4, 0.6);            // snedstag
  }
  // Sandsäckar på båda sidor om huvudingången, och några lådor som stöttar.
  sandbagWall(g, 0.55, main - 2.2, main - 4.4, 2);
  sandbagWall(g, 0.55, main + 2.2, main + 4.4, 2);
  // Sprickor och blod: en genomskinlig yta på fasaden, ritas om när skadan går upp ett steg.
  const c = document.createElement('canvas'); c.width = 512; c.height = 205;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(DECAL_W, DECAL_H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.rotation.y = Math.PI / 2; decal.position.set(0.05, DECAL_H / 2, main);
  decal.renderOrder = 1; decal.castShadow = false; decal.receiveShadow = false;
  g.add(decal);
  // Egna material så att plankorna kan lysa rött när horden tar sig in.
  const mats = [];
  g.traverse(o => {
    if (!o.isMesh || o === decal) return;
    o.material = o.material.clone(); o.material.userData.own = true;
    if (o.material.emissive) mats.push(o.material);
  });
  g.userData = { kind: 'base', mats, planks, decal: { c, tex, stage: -1, main }, damage: 0, shake: null };
  setBaseDamage(g, 0);
  return g;
}
// Skadan på entrén: 0 hel, 1 basen föll. Plankorna buktar in, vrider sig och lossnar en efter
// en; sprickor och blod i fem steg. Billigt: bara när skadan ändras.
export function setBaseDamage(group, frac) {
  const u = group.userData;
  if (!u.planks) return;
  const f = Math.max(0, Math.min(1, frac));
  u.damage = f;
  for (const pl of u.planks) {
    const { p, home, rot, k, hang, len } = pl;
    // inåt (mot dörren, -x) och lite snett; de svagaste lossnar i ena änden och hänger
    // (plankan får inte gå in i väggen: x hålls framför fasaden, bukten är en vridning)
    const give = Math.max(0, f - k * 0.5);
    p.position.set(Math.max(0.1, home.x - 0.04 * give), home.y, home.z);
    p.rotation.set(rot.x + hang * 0.25 * give, rot.y + hang * 0.03 * give, rot.z);
    const loose = f > 0.45 + k * 0.5;
    if (loose) {
      // hänger i en spik: vrids runt plankans ände
      const a = hang * Math.min(1.2, (f - 0.45 - k * 0.5) * 4);
      p.rotation.x = rot.x + a;
      p.position.y = home.y - Math.abs(Math.sin(a)) * len * 0.25;
    }
    if (f >= 0.999 && k > 0.6) { p.position.set(home.x + 0.5 + k, 0.08, home.z + hang * 0.6); p.rotation.set(Math.PI / 2, 0, k * 2); }
  }
  const stage = Math.min(DECAL_STAGES - 1, Math.floor(f * DECAL_STAGES));
  const d = u.decal;
  if (stage !== d.stage) {
    d.stage = stage;
    drawDecal(d.c.getContext('2d'), d.c.width, d.c.height, stage, d.main);
    d.tex.needsUpdate = true;
  }
}
