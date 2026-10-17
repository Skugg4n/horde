// Alla spelets modeller, byggda i kod av byggsatsen. Visas i lookbook.html innan de används i spelet.
import * as THREE from 'three';
import { rnd, pick, mat, mesh, box, sbox, geo, humanoid, canvasTex, PALETTE as P } from './kit.js';
import { ZOMBIES } from '../data/zombies.js';

const METAL = { metalness: 0.55, roughness: 0.45 };
const TAU = Math.PI * 2;

// ---------- värn ----------

// En båge av sandsäckar runt origo, öppen bakåt (-x). Varannan rad förskjuten ett halvt steg.
// skip(a): true där säcken inte läggs (0.12.0, H098: där det redan finns skydd). R: slumptal 0..1
// (ett frö per ruta, så att samma plats alltid ser likadan ut).
function sandbagArc(g, { r, layers, n, arc, size = 1, y0 = 0 }, { skip = null, R = Math.random } = {}) {
  const bags = P.sandbag.map(c => mat(c));
  const rr0 = (a, b) => a + R() * (b - a);
  const step = (2 * arc) / (n - 1);
  for (let layer = 0; layer < layers; layer++) {
    const rr = r - layer * 0.1 * size;
    const odd = layer % 2;
    for (let i = 0; i < n - odd; i++) {
      const a = -arc + i * step + odd * step / 2 + rr0(-0.03, 0.03);
      const j0 = rr0(0.94, 1.06), j1 = rr0(-0.06, 0.06), j2 = rr0(-0.08, 0.08), j3 = rr0(-0.05, 0.05), pk = bags[Math.floor(R() * bags.length)];
      if (skip?.(a)) continue;
      const s = mesh(geo('sphere', 0.5, 7, 5), pk,
        Math.cos(a) * rr, y0 + (0.28 + layer * 0.36) * size, Math.sin(a) * rr);
      s.scale.set(0.95 * size * j0, 0.42 * size, 0.55 * size);
      s.rotation.set(j1, -a + j2, j3);
      g.add(s);
    }
  }
}
// Frö till slumptal 0..1 (mulberry32).
const seededR = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

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

// Vapnen själva. Varje funktion bygger på pivot (vrids med siktet) med pipan längs +x och
// returnerar mynningens x. Lågpoly, närmare de riktiga vapnen sedan 0.8.0.

// Ksp 88 (M2HB, 12,7 mm): fyrkantig låda, spadgrepp, perforerad pipmantel, konisk flamdämpare,
// ammunitionslåda på vänster sida.
function ksp88Gun(pivot, metal) {
  pivot.add(box(1.1, 0.32, 0.3, metal, 0.1, 0, 0));                      // låda
  pivot.add(box(0.5, 0.05, 0.31, mat(P.gunDark), 0.25, 0.18, 0));        // matarlock
  for (const z of [-0.09, 0.09]) pivot.add(box(0.06, 0.16, 0.04, metal, -0.55, 0.02, z)); // spadgrepp
  pivot.add(box(0.06, 0.04, 0.24, metal, -0.6, 0.08, 0));
  pivot.add(box(0.36, 0.26, 0.2, mat(P.ammo), 0.15, -0.1, -0.3));        // ammolåda, vänster
  pivot.add(box(0.14, 0.04, 0.12, mat(P.brass), 0.15, 0.06, -0.2));      // bandet in i lådan
  pivot.add(box(0.08, 0.14, 0.04, metal, 0.45, 0.24, 0));                 // sikte
  const jacket = mesh(geo('cylinder', 0.09, 0.09, 0.42, 7), metal, 0.83, 0.03, 0);
  jacket.rotation.z = Math.PI / 2; pivot.add(jacket);
  for (const x of [0.7, 0.83, 0.96]) pivot.add(box(0.03, 0.2, 0.2, mat(P.gunDark), x, 0.03, 0)); // hål i manteln
  const barrel = mesh(geo('cylinder', 0.05, 0.055, 1.6, 6), metal, 1.42, 0.03, 0);
  barrel.rotation.z = Math.PI / 2; pivot.add(barrel);
  const hider = mesh(geo('cylinder', 0.09, 0.06, 0.22, 7), metal, 2.28, 0.03, 0);
  hider.rotation.z = Math.PI / 2; pivot.add(hider);
  return 2.4;
}

// Ksp 90 (FN Minimi, 5,56 mm): kort, bärhandtag, patronlåda under, skjutbar kolv, tvåbensstöd.
function ksp90Gun(pivot, metal) {
  pivot.add(box(0.72, 0.2, 0.15, metal, 0, 0, 0));                       // låda
  pivot.add(box(0.42, 0.05, 0.16, mat(P.gunDark), 0.02, 0.12, 0));       // matarlock
  pivot.add(box(0.36, 0.06, 0.05, metal, -0.55, 0.04, 0));                // skjutbar kolv: rör
  pivot.add(box(0.06, 0.2, 0.1, mat(P.gunDark), -0.74, -0.02, 0));       // kolvplatta
  pivot.add(box(0.05, 0.14, 0.05, mat(P.gunDark), -0.2, -0.15, 0));      // pistolgrepp
  pivot.add(box(0.26, 0.22, 0.2, mat(P.ammo), 0.08, -0.2, 0.06));        // patronlåda (200 skott)
  pivot.add(box(0.26, 0.05, 0.05, metal, 0.12, 0.17, 0));                 // bärhandtag
  pivot.add(box(0.3, 0.12, 0.14, mat(P.gunDark), 0.5, -0.02, 0));        // handskydd
  const barrel = mesh(geo('cylinder', 0.03, 0.034, 0.72, 6), metal, 0.95, 0.01, 0);
  barrel.rotation.z = Math.PI / 2; pivot.add(barrel);
  const hider = mesh(geo('cylinder', 0.04, 0.034, 0.1, 6), metal, 1.33, 0.01, 0);
  hider.rotation.z = Math.PI / 2; pivot.add(hider);
  for (const side of [-1, 1]) {                                           // bipod
    const leg = mesh(geo('cylinder', 0.02, 0.02, 0.42, 4), metal, 0.74, -0.18, side * 0.1);
    leg.rotation.x = side * 0.45; pivot.add(leg);
  }
  return 1.38;
}

// Ksp 58 (FN MAG, 7,62 mm): lång låda, svart kolv, bärhandtag på pipan, gasrör under, tvåben
// långt fram och ett patronband som hänger ut på vänster sida.
function ksp58Gun(pivot, metal) {
  pivot.add(box(0.62, 0.22, 0.16, metal, 0, 0, 0));                      // låda
  pivot.add(box(0.48, 0.05, 0.17, mat(P.gunDark), 0.04, 0.13, 0));       // matarlock
  const stock = box(0.5, 0.18, 0.11, mat(P.gunDark), -0.55, -0.04, 0);   // kolv, smalnar bakåt
  stock.rotation.z = 0.08; pivot.add(stock);
  pivot.add(box(0.05, 0.15, 0.05, mat(P.gunDark), -0.16, -0.15, 0));     // pistolgrepp
  const barrel = mesh(geo('cylinder', 0.032, 0.038, 0.95, 6), metal, 0.78, 0.03, 0);
  barrel.rotation.z = Math.PI / 2; pivot.add(barrel);
  const gas = mesh(geo('cylinder', 0.022, 0.022, 0.6, 5), metal, 0.62, -0.05, 0);
  gas.rotation.z = Math.PI / 2; pivot.add(gas);
  pivot.add(box(0.2, 0.04, 0.04, mat(P.gunDark), 0.55, 0.14, 0));       // bärhandtag
  pivot.add(box(0.03, 0.08, 0.03, mat(P.gunDark), 0.5, 0.1, 0));
  pivot.add(box(0.03, 0.08, 0.03, mat(P.gunDark), 0.6, 0.1, 0));
  const hider = mesh(geo('cylinder', 0.045, 0.038, 0.12, 6), metal, 1.3, 0.03, 0);
  hider.rotation.z = Math.PI / 2; pivot.add(hider);
  for (const side of [-1, 1]) {                                           // tvåben vid gasblocket
    const leg = mesh(geo('cylinder', 0.02, 0.02, 0.46, 4), metal, 0.92, -0.2, side * 0.1);
    leg.rotation.x = side * 0.42; pivot.add(leg);
  }
  for (let i = 0; i < 6; i++) {                                           // patronbandet
    const l = box(0.06, 0.03, 0.09, mat(i % 2 ? P.brass : P.gunDark), 0.02 - i * 0.015, -0.02 - i * 0.07, -0.13 - i * 0.012);
    l.rotation.x = 0.3; pivot.add(l);
  }
  return 1.37;
}

// Ak 5 (Ak 5C) med granattillsats: kort gevär med rödpunktsikte, böjt magasin och ett 40 mm-rör
// under pipan.
function ak5Gun(pivot, metal) {
  pivot.add(box(0.38, 0.12, 0.08, metal, 0, 0, 0));                      // låda
  pivot.add(box(0.36, 0.09, 0.06, mat(P.gunDark), -0.36, -0.03, 0));     // kolv
  pivot.add(box(0.06, 0.13, 0.08, mat(P.gunDark), -0.54, -0.04, 0));     // kolvplatta
  const mag = box(0.08, 0.2, 0.05, mat(P.gunDark), 0.08, -0.14, 0);      // magasin, böjt framåt
  mag.rotation.z = 0.28; pivot.add(mag);
  pivot.add(box(0.05, 0.11, 0.05, mat(P.gunDark), -0.1, -0.11, 0));      // pistolgrepp
  const sight = mesh(geo('cylinder', 0.03, 0.03, 0.12, 6), metal, 0.02, 0.1, 0);
  sight.rotation.z = Math.PI / 2; pivot.add(sight);                       // rödpunktsikte
  pivot.add(box(0.26, 0.09, 0.08, mat(P.gunDark), 0.31, 0.0, 0));        // handskydd
  const barrel = mesh(geo('cylinder', 0.018, 0.02, 0.34, 6), metal, 0.56, 0.02, 0);
  barrel.rotation.z = Math.PI / 2; pivot.add(barrel);
  const tube = mesh(geo('cylinder', 0.04, 0.04, 0.3, 7), mat(P.grenade, METAL), 0.33, -0.08, 0);
  tube.rotation.z = Math.PI / 2; pivot.add(tube);                         // granattillsatsen
  pivot.add(box(0.06, 0.07, 0.05, metal, 0.2, -0.13, 0));                 // avtryckare till röret
  return 0.74;
}

// Psg 90 (prickskyttegevär, 7,62 mm): lång pipa med mynningsbroms, stort kikarsikte, kindstöd
// och tvåben.
function psg90Gun(pivot, metal) {
  const stockM = mat('#3a3d2c');
  pivot.add(box(0.3, 0.11, 0.08, metal, 0, 0, 0));                       // låda
  pivot.add(box(0.48, 0.12, 0.08, stockM, -0.38, -0.02, 0));             // kolv
  pivot.add(box(0.2, 0.06, 0.07, stockM, -0.4, 0.07, 0));                 // kindstöd
  pivot.add(box(0.06, 0.18, 0.08, stockM, -0.64, -0.03, 0));             // kolvplatta
  pivot.add(box(0.06, 0.1, 0.04, mat(P.gunDark), 0.08, -0.1, 0));        // magasin
  const scope = mesh(geo('cylinder', 0.035, 0.035, 0.36, 7), mat(P.gunDark), 0.0, 0.12, 0);
  scope.rotation.z = Math.PI / 2; pivot.add(scope);
  for (const x of [-0.18, 0.18]) {
    const bell = mesh(geo('cylinder', 0.048, 0.04, 0.06, 7), mat(P.gunDark), x, 0.12, 0);
    bell.rotation.z = Math.PI / 2; pivot.add(bell);
  }
  pivot.add(box(0.36, 0.06, 0.07, stockM, 0.32, -0.01, 0));              // framstock
  const barrel = mesh(geo('cylinder', 0.02, 0.024, 0.7, 6), metal, 0.8, 0.01, 0);
  barrel.rotation.z = Math.PI / 2; pivot.add(barrel);
  pivot.add(box(0.08, 0.05, 0.06, metal, 1.17, 0.01, 0));                 // mynningsbroms
  for (const side of [-1, 1]) {
    const leg = mesh(geo('cylinder', 0.014, 0.014, 0.3, 4), metal, 0.42, -0.13, side * 0.07);
    leg.rotation.x = side * 0.35; pivot.add(leg);
  }
  return 1.22;
}

// Ghillie: trasor i jordfärger över ryggen, benen och hjälmen, så att skytten blir en kulle.
const GHILLIE = ['#4f5530', '#5f5a3a', '#3e4428', '#6b6440', '#55502f'];
function ghillie(gunner) {
  const ms = GHILLIE.map(c => mat(c));
  const tuft = (parent, n, w, h, y0, y1, spread) => {
    for (let i = 0; i < n; i++) {
      const t = box(rnd(0.05, 0.09), rnd(0.18, 0.32), rnd(0.03, 0.06), pick(ms), rnd(-w, w), rnd(y0, y1), -spread + rnd(-0.04, 0.04));
      t.rotation.set(rnd(-0.9, 0.9), rnd(-1, 1), rnd(-0.9, 0.9));
      parent.add(t);
    }
  };
  tuft(gunner.spine, 14, 0.24, 0.05, 0.6, 0.15);
  tuft(gunner.head, 6, 0.14, 0.14, 0.38, 0.05);
  tuft(gunner.hipL, 4, 0.08, -0.45, -0.05, 0.09);
  tuft(gunner.hipR, 4, 0.08, -0.45, -0.05, 0.09);
  // en rygg av säckväv över bålen
  gunner.spine.add(box(gunner.build.chestW + 0.12, gunner.build.torsoH + 0.1, 0.08, pick(ms), 0, gunner.build.torsoH / 2, -0.16));
}

// Typ till byggsätt: säckringen (nivå 1-2, nivå 3 en rad till), pivotens höjd, vapnet, skyttens
// ställning, skölden på nivå 2, yttre vallen på nivå 3, ammolådornas och granatlådans plats.
const KINDS = {
  m249: { ring: { r: 2.0, layers: 2, n: 11, arc: 1.9, size: 0.92 }, pile: true, y: 0.95, gun: ksp90Gun, pose: 'kneel',
    shield: { x: 0.45, w: 0.95, h: 0.75, y: 0.12 }, outer: { r: 2.85, layers: 2, n: 13, arc: 1.2, size: 0.92 }, crate: 2.4, kit: [-0.6, -1.35] },
  ksp58: { ring: { r: 2.2, layers: 2, n: 12, arc: 1.9, size: 0.95 }, pile: true, y: 0.95, gun: ksp58Gun, pose: 'kneel',
    shield: { x: 0.5, w: 1.05, h: 0.8, y: 0.14 }, outer: { r: 3.05, layers: 2, n: 14, arc: 1.2, size: 0.95 }, crate: 2.6, kit: [-0.7, -1.45] },
  m2: { ring: { r: 2.5, layers: 3, n: 13, arc: 1.95, size: 1 }, tripod: true, y: 1.15, gun: ksp88Gun, pose: 'stand',
    shield: { x: 0.75, w: 1.3, h: 1.1, y: 0.2 }, outer: { r: 3.45, layers: 2, n: 15, arc: 1.25, size: 1 }, crate: 2.9, kit: [-0.85, -1.6] },
  ak5: { ring: { r: 1.8, layers: 3, n: 11, arc: 1.85, size: 0.9 }, y: 1.44, gun: ak5Gun, pose: 'rifle',
    shield: { x: 0.35, w: 0.8, h: 0.55, y: -0.32 }, outer: { r: 2.65, layers: 2, n: 12, arc: 1.2, size: 0.9 }, crate: 2.2, kit: [-0.5, -1.2] },
  psg90: { ring: { r: 1.9, layers: 1, n: 11, arc: 1.5, size: 0.85 }, y: 0.3, gun: psg90Gun, pose: 'prone',
    shield: { x: 0.95, w: 0.7, h: 0.32, y: -0.08 }, outer: { r: 2.7, layers: 1, n: 12, arc: 1.1, size: 0.85 }, crate: 2.3, kit: [-0.9, -1.0] },
};
export const weaponKinds = () => Object.keys(KINDS);

function pose(gunner, how, kind) {
  const g = gunner;
  if (how === 'stand') {
    // står bakom spadgreppen, lutar in i vapnet
    g.root.position.set(-1.0, -1.15, 0);
    g.spine.rotation.x = 0.28; g.head.rotation.x = -0.25;
    g.hipL.rotation.x = -0.25; g.kneeL.rotation.x = 0.35; g.hipR.rotation.x = 0.15; g.kneeR.rotation.x = 0.1;
    g.shL.rotation.set(-1.0, 0, 0.12); g.shR.rotation.set(-1.0, 0, -0.12);
    g.elL.rotation.x = -0.55; g.elR.rotation.x = -0.55;
  } else if (how === 'kneel') {
    // på ett knä bakom kulsprutan
    g.root.position.set(kind === 'ksp58' ? -1.05 : -1.0, -0.95, 0);
    g.body.position.y = -0.47;
    g.hipL.rotation.x = -1.45; g.kneeL.rotation.x = 1.5;
    g.hipR.rotation.x = 0.25; g.kneeR.rotation.x = 1.75;
    g.spine.rotation.x = 0.45; g.head.rotation.x = -0.45;
    g.shL.rotation.set(-1.15, 0, 0.1); g.shR.rotation.set(-1.05, 0, -0.1);
    g.elL.rotation.x = -0.45; g.elR.rotation.x = -0.6;
  } else if (how === 'rifle') {
    // står bakom vallen med geväret mot axeln
    g.root.position.set(-0.5, -1.44, 0.1);
    g.spine.rotation.x = 0.1; g.head.rotation.set(0.05, 0, 0);
    g.hipL.rotation.x = -0.2; g.kneeL.rotation.x = 0.25; g.hipR.rotation.x = 0.25;
    g.shR.rotation.set(-1.75, 0, -0.35); g.elR.rotation.x = -1.2;    // bakre handen vid greppet, armbågen ut
    g.shL.rotation.set(-1.5, 0, 0.3); g.elL.rotation.x = -0.15;      // främre handen under handskyddet
  } else if (how === 'prone') {
    // ligger på magen bakom geväret; huvudet vid kindstödet
    g.root.rotation.set(Math.PI / 2, 0, 0);
    g.root.position.set(0, -0.17, -1.95);
    g.head.rotation.x = -1.15;
    g.hipL.rotation.z = 0.18; g.hipR.rotation.z = -0.18;
    g.kneeL.rotation.x = 0.1; g.kneeR.rotation.x = 0.25;
    g.shL.rotation.set(-2.65, 0, 0.42); g.shR.rotation.set(-2.75, 0, -0.3);
    g.elL.rotation.x = -0.35; g.elR.rotation.x = -0.6;
  }
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

// 0.10.2 (speltestet av 0.10.1: "skytten själv är svår att se"): skytten på taket ligger på en orange
// signalduk, med en ljus ring runt som ritas ovanpå taket (ingen djuptest), så att platsen syns i
// spelets zoom även på ett mörkt tak.
// H094 (0.11.0): djuptest igen (ringen låg ovanpå grannarnas tak), med förskjutning mot kameran.
const ROOF_RING = new THREE.MeshBasicMaterial({ color: 0xf0d7a8, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const ROOF_RING_GEO = (() => { const g = new THREE.RingGeometry(1.35, 1.55, 28); g.rotateX(-Math.PI / 2); return g; })();
function roofMarker(group) {
  const tarp = box(1.9, 0.03, 1.3, mat(0xc8642a), -0.1, 0.02, 0);
  tarp.receiveShadow = true; tarp.name = 'roof-tarp'; group.add(tarp);
  const ring = new THREE.Mesh(ROOF_RING_GEO, ROOF_RING);
  ring.position.y = 0.06; ring.renderOrder = 5; ring.castShadow = false; ring.name = 'roof-ring';
  group.add(ring);
}

// kit: positionen har en granatlåda (ritas bredvid skytten). roof: pjäsen ligger på ett hustak
// (Psg 90): ingen säckring, bara en säck under tvåbenet; gruppen ställs på takets höjd av vyn.
// emplace (0.12.0, H098): { face, cover[8] } ur src/sim/emplace.js. Värnet vänds mot face (gruppens
// lokala +x) och säckar läggs inte i riktningar där det redan står skydd. seed: rutan (samma bild).
export function weaponModel(type, level = 1, { kit = false, roof = false, emplace = null, seed = null } = {}) {
  if (type === 'epa') {
    const R0 = seed == null ? seededR(7) : seededR(seed * 2654435761 + 3);
    const m = epaModel(level, R0);
    m.group.userData = { kind: 'weapon', type, level, kit, roof };
    if (kit) grenadeCrate(m.group, -2.4, -0.6, 0.35);
    return m;
  }
  const K = KINDS[type] ?? KINDS.m249;
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  const muzzle = new THREE.Object3D();
  const metal = mat(P.gunMetal, METAL);
  // 0.12.0: säckarna och lådorna i en egen grupp (de packas ihop och ställs upp när pjäsen flyttas)
  const bags = new THREE.Group();
  group.add(bags);

  const R = seed == null ? Math.random : seededR(seed * 2654435761 + level);
  // en säck i lokal vinkel a ligger i världens riktning a + face; där det står skydd läggs ingen
  const skip = emplace ? a => !!emplace.cover[(((Math.round((a + emplace.face) / (Math.PI / 4)) % 8) + 8) % 8)] : null;
  if (!roof) sandbagArc(bags, { ...K.ring, layers: K.ring.layers + (level >= 3 ? 1 : 0) }, { skip, R });
  else {
    const bag = mesh(geo('sphere', 0.5, 7, 5), mat(P.sandbag[0]), 0.4, 0.12, 0);
    bag.scale.set(0.6, 0.26, 0.4); group.add(bag);
    roofMarker(group);
  }

  if (K.tripod) {
    for (let i = 0; i < 3; i++) {                                         // trefot
      const l = mesh(geo('cylinder', 0.04, 0.04, 1.3, 5), metal);
      const a = i * 2.1; l.position.set(Math.cos(a) * 0.35, 0.55, Math.sin(a) * 0.35);
      l.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); group.add(l);
    }
  } else if (K.pile) sandbagPile(group, 0.25, 0);
  pivot.position.set(0, K.y, 0);
  muzzle.position.set(K.gun(pivot, metal), type === 'm2' ? 0.03 : 0.01, 0);
  group.add(pivot); pivot.add(muzzle);

  // skytten följer med när vapnet vrids. Liggande skytt: i en hållare vriden mot +x.
  const gunner = soldier();
  if (K.pose === 'prone') {
    const holder = new THREE.Group(); holder.rotation.y = Math.PI / 2;
    holder.add(gunner.root); pivot.add(holder);
    ghillie(gunner);
  } else {
    gunner.root.rotation.y = Math.PI / 2;
    pivot.add(gunner.root);
  }
  pose(gunner, K.pose, type);

  // nivå 2: sköld framför (inte på taket)
  if (level >= 2 && !roof) gunShield(pivot, K.shield);

  // nivå 3: yttre säckvall framåt och ammolådor bakom (på taket: en låda bredvid skytten)
  if (level >= 3) {
    if (!roof) {
      sandbagArc(bags, K.outer, { skip, R });
      const cr = K.crate;
      crate(bags, -cr, 0, cr * 0.42, 0.4);
      crate(bags, -cr - 0.1, 0.45, cr * 0.42 + 0.05, 0.3);
      crate(bags, -cr + 0.2, 0, cr * 0.42 + 0.6, 0.5);
      crate(bags, -cr + 0.1, 0, -cr * 0.5, -0.3);
    } else crate(group, -1.2, 0, 0.75, 0.3);
  }
  if (kit) grenadeCrate(group, K.kit[0], K.kit[1], 0.35);
  group.userData = { kind: 'weapon', type, level, kit, roof };
  return { group, pivot, muzzle, gunner, bags };
}

// ---------- EPA-pillboxen (0.13.0, H135) ----------
// En gammal A-traktor (en nedkortad bil) med svetsade plåtar i olika färger, rost, svetsfogar,
// skottgluggar runt hytten och en Ksp 58 i takluckan med skytten upp till midjan. LGF-triangeln sitter
// kvar bak. Origo mitt under bilen, fronten mot +x (pjäsens lokala riktning, som de andra). R: frö.
function epaModel(level, R) {
  const group = new THREE.Group(), body = new THREE.Group(), bags = new THREE.Group();
  group.add(body, bags);
  const plate = () => mat(P.epaBody[Math.floor(R() * P.epaBody.length)]);
  const rust = mat(P.rust), weld = mat(P.weld), dark = mat(P.gunDark), metal = mat(P.gunMetal, METAL);
  // chassi och hjul
  body.add(box(3.9, 0.3, 1.5, dark, 0, 0.5, 0));
  for (const [x, z, r] of [[1.25, 0.82, 0.36], [1.25, -0.82, 0.36], [-1.2, 0.82, 0.42], [-1.2, -0.82, 0.42]]) {
    const w = mesh(geo('cylinder', r, r, 0.26, 10), mat(P.tire), x, r, z); w.rotation.x = Math.PI / 2; body.add(w);
    const hub = mesh(geo('cylinder', r * 0.45, r * 0.45, 0.28, 6), metal, x, r, z); hub.rotation.x = Math.PI / 2; body.add(hub);
  }
  // nedre skrovet: plåtar sida vid sida, olika färger, lite förskjutna
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
    const x = -1.55 + i * 1.0 + (R() - 0.5) * 0.06;
    body.add(box(0.98, 0.72 + (R() - 0.5) * 0.08, 0.06, plate(), x, 0.98, side * 0.86));
  }
  body.add(box(3.7, 0.08, 1.7, plate(), 0, 1.36, 0));                                   // skrovets tak
  // motorhuven framåt, sluttande, och en plåt för grillen
  const hood = box(1.3, 0.12, 1.6, plate(), 1.45, 1.45, 0); hood.rotation.z = -0.18; body.add(hood);
  body.add(box(0.08, 0.72, 1.62, plate(), 2.0, 1.0, 0));
  for (const z of [-0.3, 0, 0.3]) body.add(box(0.03, 0.06, 0.22, dark, 2.05, 1.12, z));  // gluggar i grillplåten
  // hytten: plåtlåda med skottgluggar på alla sidor
  const cab = new THREE.Group(); cab.position.set(-0.35, 1.4, 0); body.add(cab);
  cab.add(box(1.9, 0.78, 1.62, plate(), 0, 0.39, 0));
  cab.add(box(1.95, 0.07, 1.68, plate(), 0, 0.8, 0));
  for (const [x, z, ry] of [[0.96, 0, 0], [-0.96, 0, 0], [0, 0.82, Math.PI / 2], [0, -0.82, Math.PI / 2], [0.5, 0.82, Math.PI / 2], [-0.5, -0.82, Math.PI / 2]]) {
    const slit = box(0.04, 0.07, 0.42, dark, x, 0.5, z); slit.rotation.y = ry; cab.add(slit);
  }
  // svetsfogar och rost
  for (let i = 0; i < 9; i++) { const f = sbox(0.03, 0.04, 0.5 + R() * 0.6, weld, -1.6 + R() * 3.2, 0.7 + R() * 0.9, (R() < 0.5 ? -1 : 1) * 0.89); f.rotation.x = (R() - 0.5) * 0.3; f.castShadow = false; body.add(f); }
  for (let i = 0; i < 10; i++) { const r0 = sbox(0.12 + R() * 0.3, 0.08 + R() * 0.2, 0.012, rust, -1.7 + R() * 3.4, 0.7 + R() * 0.6, (R() < 0.5 ? -1 : 1) * 0.895); r0.castShadow = false; body.add(r0); }
  // LGF-skylten bak: orange triangel med röd kant, spetsen uppåt
  const tri = (r, m, x) => { const t = new THREE.Mesh(new THREE.CircleGeometry(r, 3), m); t.position.set(x, 1.2, 0); t.rotation.set(0, -Math.PI / 2, Math.PI / 2); body.add(t); };
  tri(0.34, mat(P.lgfRim), -1.98); tri(0.26, mat(P.lgf), -1.99);
  body.add(box(0.06, 0.9, 1.62, plate(), -1.92, 0.95, 0));
  // takluckan och kulsprutan med skytten upp till midjan
  const ring = mesh(geo('cylinder', 0.42, 0.42, 0.1, 10), metal, -0.35, 2.25, 0); body.add(ring);
  const pivot = new THREE.Group(); pivot.position.set(-0.35, 2.55, 0);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(ksp58Gun(pivot, metal), 0.03, 0);
  pivot.add(muzzle);
  gunShield(pivot, { x: 0.55, w: 0.9, h: 0.5, y: 0.08 });
  const gunner = soldier();
  gunner.root.rotation.y = Math.PI / 2; gunner.root.position.set(-0.55, -1.2, 0);
  gunner.shL.rotation.set(-1.15, 0, 0.1); gunner.shR.rotation.set(-1.05, 0, -0.1); gunner.elL.rotation.x = -0.45; gunner.elR.rotation.x = -0.6;
  pivot.add(gunner.root);
  group.add(pivot);
  // nivå 2: sandsäckar på motorhuven; nivå 3: extra plåt på sidorna och en ammolåda på taket
  if (level >= 2) sandbagArc(bags, { r: 0.55, layers: 1, n: 5, arc: 0.9, size: 0.6, y0: 1.45 }, { R });
  if (level >= 3) { for (const side of [-1, 1]) body.add(box(2.4, 0.5, 0.05, plate(), 0, 1.0, side * 0.93)); crate(body, -1.3, 1.4, 0.3, 0.2); }
  return { group, pivot, muzzle, gunner, bags, body };
}

// ---------- laget på väg (0.13.0, H134) ----------
// Laget som bär sin pjäs när den flyttas: man nummer ett bär vapnet över axeln, de andra lådorna.
// Samma soldat som infanteriet (eller prickskytten med ghillie). Vyn sätter springposen (hvRun) och
// flyttar männen längs vägen.
export function crewCarryModel(type, n = 2, seed = 1) {
  const K = KINDS[type] ?? KINDS.m249;
  const men = [];
  for (let i = 0; i < Math.max(1, n); i++) {
    const m = hvSoldierModel(seed * 7 + i, 'inf');
    m.rifle.visible = i > 0 && type !== 'psg90';
    if (i === 0) {
      // vapnet över höger axel, pipan framåt och lite uppåt
      const carry = new THREE.Group();
      K.gun(carry, mat(P.gunMetal, METAL));
      carry.scale.setScalar(0.85);
      carry.position.set(0.22, m.build.torsoH + 0.05, -0.15); carry.rotation.set(0, -Math.PI / 2, 0.25);
      m.spine.add(carry);
      if (type === 'psg90') ghillie(m);
    } else {
      const c = new THREE.Group(); crate(c, 0, 0, 0, 0); c.scale.setScalar(0.7);
      c.position.set(-0.3, m.build.torsoH * 0.35, 0.05); c.rotation.set(0, Math.PI / 2, 0);
      m.spine.add(c);
    }
    men.push(m);
  }
  const root = new THREE.Group();
  for (const m of men) root.add(m.root);
  return { root, men };
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

// 0.14.0: skrotbilar tvärs över gatan (förnödenheter). Två vrak på en bred gata, ett på en smal; rost,
// olikfärgad lack, krossade rutor, utan hjul på ena sidan. Slitet lutar vraken och mörknar plåten.
const WRECK = ['#5b3a2a', '#4a4f46', '#6b5a3a', '#3f4650', '#6d2f22'];
function carObstacle(span = 9) {
  const g = new THREE.Group();
  const narrow = span < 6, bodies = [];
  const rust = new THREE.MeshStandardMaterial({ color: '#5a3422', roughness: 0.95, metalness: 0.15, flatShading: true });
  rust.userData.own = true;
  const glass = mat('#1a1d1c'), tyre = mat(P.ink);
  for (const [i, z] of (narrow ? [0] : [-2.3, 2.3]).entries()) {
    const paint = new THREE.MeshStandardMaterial({ color: WRECK[(i * 3 + Math.floor(rnd(0, 5))) % WRECK.length], roughness: 0.9, metalness: 0.2, flatShading: true });
    paint.userData.own = true;
    const c = new THREE.Group();
    c.add(box(1.8, 0.62, 4.1, paint, 0, 0.55, 0));                    // karossen
    c.add(box(1.6, 0.5, 2.0, paint, 0, 1.1, -0.2));                   // kupén
    c.add(box(1.62, 0.36, 1.9, glass, 0, 1.12, -0.2));                // rutorna (svarta, krossade)
    c.add(box(1.82, 0.18, 4.12, rust, 0, 0.3, 0));                     // rost längs tröskeln
    for (const [wx, wz] of [[0.86, 1.35], [0.86, -1.35], [-0.86, 1.35]]) {
      const w = mesh(geo('cylinder', 0.32, 0.32, 0.22, 10), tyre, wx, 0.32, wz); w.rotation.z = Math.PI / 2; c.add(w);
    }
    c.position.set(rnd(-0.25, 0.25), 0, z + rnd(-0.2, 0.2));
    // en ruta på stadsbanornas rutnät (2 m): vraket står med längden längs gatan, sida vid sida över den
    c.rotation.y = (narrow ? Math.PI / 2 : 0) + rnd(-0.18, 0.18);
    c.rotation.z = -0.06;                                              // vilar på fälgen där hjulet saknas
    c.userData = { ry: c.rotation.y, tilt: rnd(0.15, 0.3), paint, base: paint.color.clone() };
    g.add(c); bodies.push(c);
  }
  g.userData = { kind: 'obstacle', type: 'car', bodies, rust };
  return g;
}

export function obstacleModel(type, { span = 9 } = {}) {
  const g = type === 'block' ? blockObstacle(span) : type === 'car' ? carObstacle(span) : wireObstacle(span);
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
  } else if (u.type === 'car') {
    const w = 1 - f;
    for (const c of u.bodies) {
      c.rotation.z = -0.06 - w * c.userData.tilt;
      c.rotation.y = c.userData.ry + w * 0.25;
      c.userData.paint.color.copy(c.userData.base).lerp(C_CRACK, w * 0.6);
    }
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

// 0.16.4 (Olas bonus): löparen snubblar. u 0..1 genom snubblet (src/sim/sim.js stumbleOf): faller framåt med armarna
// ut (till 0,3), kryper på alla fyra med armarna som paddlar (till 0,7) och reser sig in i löpsteget igen.
export function zombieStumble(z, u, phase, t = 0) {
  zombieWalk(z, phase, t);
  const r = Math.min(1, Math.max(0, (u - 0.7) / 0.3));
  const k = u < 0.3 ? Math.sin(u / 0.3 * Math.PI / 2) : u < 0.7 ? 1 : 1 - r * r * (3 - 2 * r);
  const crawl = u >= 0.3 && u < 0.7 ? Math.sin((u - 0.3) / 0.4 * Math.PI * 4) : 0;
  const mix = (a, b) => a + (b - a) * k;
  z.body.rotation.x = mix(z.body.rotation.x, 1.15);
  z.body.position.y = mix(z.body.position.y, 0.08);
  z.body.position.z = mix(z.body.position.z, 0.15);
  z.spine.rotation.x = mix(z.spine.rotation.x, 0.25);
  z.head.rotation.x = mix(z.head.rotation.x, -0.9);
  z.hipL.rotation.x = mix(z.hipL.rotation.x, -1.5 + crawl * 0.3); z.kneeL.rotation.x = mix(z.kneeL.rotation.x, 1.7);
  z.hipR.rotation.x = mix(z.hipR.rotation.x, -1.5 - crawl * 0.3); z.kneeR.rotation.x = mix(z.kneeR.rotation.x, 1.7);
  z.shL.rotation.x = mix(z.shL.rotation.x, -1.25 - crawl * 0.45); z.elL.rotation.x = mix(z.elL.rotation.x, -0.25);
  z.shR.rotation.x = mix(z.shR.rotation.x, -1.25 + crawl * 0.45); z.elR.rotation.x = mix(z.elR.rotation.x, -0.25);
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

// ---------- Hemvärnet (0.9.0) ----------
// Soldat i m/90: samma människa som de andra, uniform i splittermönster (små vinklade lappar i
// fyra färger på bål, ben, armar och hjälmöverdrag), stridsväst och Ak 4 (trästock, rakt
// magasin, lång pipa med flamdämpare). Geväret sitter på ryggen (spine) och följer bålen.
// Ritas som instanser (horde.js, samma väg som zombierna): alla lappar delar enhetskuben.
// Ansiktet mot +z. Delar: humanoidens leder plus rifle (geväret) och muzzle (mynningen, +x längs
// pipan som pjäsernas, för fx.flash).
const seededRnd = seed => { let x = (seed * 2654435761) >>> 0 || 1; return (a, b) => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return a + (x / 4294967296) * (b - a); }; };
function ak4(metal) {
  const g = new THREE.Group();
  const wood = mat(P.hvWood);
  g.add(box(0.07, 0.11, 0.3, wood, 0, -0.02, 0.15));                       // kolv
  g.add(box(0.06, 0.09, 0.32, metal, 0, 0.01, 0.43));                       // låda
  g.add(box(0.05, 0.16, 0.06, mat(P.gunDark), 0, -0.1, 0.48));               // rakt magasin
  g.add(box(0.04, 0.09, 0.04, mat(P.gunDark), 0, -0.08, 0.33));              // pistolgrepp
  g.add(box(0.065, 0.07, 0.24, wood, 0, 0.0, 0.7));                          // handskydd
  const barrel = mesh(geo('cylinder', 0.014, 0.016, 0.3, 5), metal, 0, 0.02, 0.95);
  barrel.rotation.x = Math.PI / 2; g.add(barrel);
  const hider = mesh(geo('cylinder', 0.022, 0.018, 0.07, 5), metal, 0, 0.02, 1.12);
  hider.rotation.x = Math.PI / 2; g.add(hider);
  g.add(box(0.02, 0.05, 0.02, metal, 0, 0.07, 1.02));                        // korn
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, 1.16); muzzle.rotation.y = -Math.PI / 2;
  g.add(muzzle);
  return { g, muzzle };
}
// 0.13.0: Ak 5C (infanteriet): svart, kort, rödpunktsikte och ett böjt magasin. Samma mått som Ak 4 så
// att ställningarna håller.
function ak5c(metal) {
  const g = new THREE.Group(), blk = mat(P.ak5);
  g.add(box(0.06, 0.1, 0.26, blk, 0, -0.01, 0.13));                        // kolv
  g.add(box(0.065, 0.1, 0.34, metal, 0, 0.01, 0.43));                      // låda
  const mag = box(0.05, 0.16, 0.07, blk, 0, -0.1, 0.5); mag.rotation.x = -0.25; g.add(mag);   // böjt magasin
  g.add(box(0.04, 0.09, 0.04, blk, 0, -0.08, 0.33));                       // pistolgrepp
  g.add(box(0.07, 0.08, 0.24, blk, 0, 0.0, 0.7));                          // handskydd med skenor
  g.add(box(0.05, 0.06, 0.09, blk, 0, 0.09, 0.42));                        // rödpunktsikte
  const barrel = mesh(geo('cylinder', 0.014, 0.016, 0.26, 5), metal, 0, 0.02, 0.93);
  barrel.rotation.x = Math.PI / 2; g.add(barrel);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, 1.08); muzzle.rotation.y = -Math.PI / 2;
  g.add(muzzle);
  return { g, muzzle };
}
// 0.13.0: de civilas vapen: jaktstudsare med kikarsikte, eller hagelbössa med dubbla pipor.
function huntingGun(metal, shotgun) {
  const g = new THREE.Group(), wood = mat(P.civWood);
  g.add(box(0.06, 0.12, 0.34, wood, 0, -0.03, 0.15));                      // kolv
  g.add(box(0.055, 0.07, 0.22, metal, 0, 0.01, 0.42));                     // låda
  g.add(box(0.06, 0.06, 0.3, wood, 0, -0.01, 0.66));                       // framstock
  if (shotgun) for (const x of [-0.015, 0.015]) { const b = mesh(geo('cylinder', 0.014, 0.014, 0.5, 5), metal, x, 0.025, 0.85); b.rotation.x = Math.PI / 2; g.add(b); }
  else {
    const b = mesh(geo('cylinder', 0.012, 0.014, 0.46, 5), metal, 0, 0.02, 0.86); b.rotation.x = Math.PI / 2; g.add(b);
    const sc = mesh(geo('cylinder', 0.024, 0.024, 0.26, 6), mat(P.gunDark), 0, 0.085, 0.42); sc.rotation.x = Math.PI / 2; g.add(sc);
  }
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, 1.1); muzzle.rotation.y = -Math.PI / 2;
  g.add(muzzle);
  return { g, muzzle };
}
// Soldaten i en grupp. kind: 'hv' (Hemvärnet: m/90, Ak 4 med trästock, ljust hjälmband), 'inf'
// (infanteriet: m/90, skyddsväst med plattor, hjälm 18, knäskydd, svart Ak 5C) eller 'civ' (civila:
// jaktjacka eller flanell, jeans, keps eller mössa, ibland orange jaktväst, jaktstudsare eller hagel).
// Hemvärnet och infanteriet ska gå att skilja på håll: bandet och trästocken mot den mörka västen och
// den svarta Ak 5:an. armed: false ger en civil utan vapen (de som evakueras).
export function hvSoldierModel(seed = 1, kind = 'hv', { armed = true } = {}) {
  const r = seededRnd(seed + 11);
  const civ = kind === 'civ', inf = kind === 'inf';
  const cam = P.m90.map(c => mat(c));
  const base = P.m90[0];
  const pickC = arr => arr[Math.floor(r(0, arr.length - 0.001))];
  const coat = civ ? pickC(P.civCoat) : base, pants = civ ? pickC(P.civPants) : base;
  const s = humanoid({ skin: P.soldierSkin, shirt: coat, pants, helmet: civ ? null : inf ? P.infHelmet : P.m90[0],
    build: { chestW: 0.45, waistW: 0.37, shX: 0.26, armW: 0.115, foreW: 0.1, legW: 0.16, shinW: 0.13 } });
  const b = s.build;
  const dark = () => cam[1 + Math.floor(r(0, 2.999))];
  const patch = (parent, x, y, z, ry, sx, sy) => {
    const m = sbox(sx, sy, 0.012, dark(), x, y, z);
    m.rotation.set(0, ry, r(-0.9, 0.9)); m.castShadow = false; parent.add(m);
  };
  // Bålen som en rak låda (jackan), så att mönstret ligger på plana sidor.
  s.spine.remove(s.torso);
  s.torso = box(b.chestW, b.torsoH, b.chestD, mat(coat), 0, b.torsoH / 2, 0);
  s.spine.add(s.torso);
  const tw = () => b.chestW / 2, td = () => b.chestD / 2;
  const headTop = 0.07 + b.head * 0.72;
  const metal = mat(P.gunMetal, METAL);
  if (civ) {
    // 0.14.2 (speltestet av 0.14.1: "de frivilliga är nästan osynliga på kartan"): de frivilliga (armed) bär
    // alla en gul varselväst med två reflexband (banden lyser svagt i skugga som Hemvärnets hjälmband,
    // squad-view.js glow). De civila som evakueras (unarmed) har kvar jaktvästen på var tredje.
    if (armed) {
      s.spine.add(box(b.chestW + 0.05, b.torsoH * 0.74, b.chestD + 0.06, mat(P.hiVis), 0, b.torsoH * 0.55, 0));
      for (const y of [0.3, 0.44]) s.spine.add(sbox(b.chestW + 0.07, 0.04, b.chestD + 0.08, mat(P.hvBand), 0, b.torsoH * y + 0.06, 0));
    } else if (r(0, 1) < 0.35) s.spine.add(box(b.chestW + 0.04, b.torsoH * 0.7, b.chestD + 0.05, mat(P.civOrange), 0, b.torsoH * 0.55, 0));
    else for (const y of [0.18, 0.34]) s.spine.add(sbox(b.chestW + 0.01, 0.035, b.chestD + 0.01, mat(P.civCoat[2]), 0, y, 0));
    // keps (med skärm) eller stickad mössa
    const cap = mat(pickC(P.civCap));
    if (r(0, 1) < 0.55) { s.head.add(box(b.head * 0.8, b.head * 0.3, b.head * 0.92, cap, 0, headTop + 0.06, 0.03)); s.head.add(box(b.head * 0.7, 0.025, b.head * 0.45, cap, 0, headTop + 0.0, 0.03 + b.head * 0.55)); }
    else { const k = mesh(geo('sphere', b.head * 0.56, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), cap, 0, headTop - 0.02, 0.03); k.scale.set(1, 1.05, 1.08); s.head.add(k); }
    const gun = huntingGun(metal, r(0, 1) < 0.4);
    if (!armed) gun.g.visible = false;
    s.spine.add(gun.g);
    return { ...s, rifle: gun.g, muzzle: gun.muzzle, seed, kind };
  }
  // splittermönster: tunna vinklade lappar i de tre mörka färgerna på alla fyra sidor av bålen
  // och på benens och armarnas utsidor. Bålen smalnar mot midjan, så lapparna följer ytan.
  const wrap = (parent, hw, hd, y0, y1, n, sz = 1, cz = 0) => {
    for (let i = 0; i < n; i++) {
      const y = r(Math.min(y0, y1), Math.max(y0, y1)), side = i % 4, sx = r(0.5, 1) * sz, sy = r(0.45, 0.9) * sz;
      if (side < 2) { const sg = side ? -1 : 1; patch(parent, r(-0.75, 0.75) * hw, y, cz + sg * (hd + 0.007), side ? Math.PI : 0, sx * hw * 1.1, sy * 0.22); }
      else { const sg = side === 2 ? 1 : -1; patch(parent, sg * (hw + 0.007), y, cz + r(-0.7, 0.7) * hd, sg * Math.PI / 2, sx * hd * 1.4, sy * 0.22); }
    }
  };
  wrap(s.spine, tw(), td(), 0.04, b.torsoH - 0.04, 28, 0.8);
  for (const hip of [s.hipL, s.hipR]) wrap(hip, b.legW / 2, b.legW * 0.55, -0.06, -b.thigh + 0.04, 8, 1.1);
  for (const knee of [s.kneeL, s.kneeR]) wrap(knee, b.shinW / 2, b.shinW * 0.625, -0.06, -b.shin + 0.1, 6, 1.1, 0.015);
  for (const sh of [s.shL, s.shR]) wrap(sh, b.armW / 2, b.armW * 0.55, -0.04, -b.upper + 0.04, 6, 1.1);
  for (const el of [s.elL, s.elR]) wrap(el, b.foreW / 2, b.foreW * 0.525, -0.03, -b.fore + 0.04, 4, 1.1);
  if (inf) {
    // skyddsväst med plattor fram och bak, magasinsfickor och radio; knäskydd; hjälm 18 med fäste fram
    const vest = mat(P.infVest);
    s.spine.add(box(b.chestW + 0.07, b.torsoH * 0.62, b.chestD + 0.1, vest, 0, b.torsoH * 0.6, 0));
    for (const x of [-0.12, 0, 0.12]) s.spine.add(box(0.08, 0.12, 0.05, mat(P.infKit), x, b.torsoH * 0.42, b.chestD / 2 + 0.07));
    s.spine.add(box(0.1, 0.18, 0.07, mat(P.infKit), 0.14, b.torsoH * 0.7, -b.chestD / 2 - 0.07));
    for (const knee of [s.kneeL, s.kneeR]) knee.add(box(b.shinW + 0.03, 0.09, 0.05, mat(P.infKit), 0, -0.04, b.shinW * 0.65));
    s.head.add(box(0.05, 0.05, 0.04, mat(P.infKit), 0, headTop + b.head * 0.3, 0.03 + b.head * 0.6));
    const rifle = ak5c(metal);
    s.spine.add(rifle.g);
    return { ...s, rifle: rifle.g, muzzle: rifle.muzzle, seed, kind };
  }
  // Hemvärnet: stridssele med bälte, magasinsfickor och två axelremmar (uniformen syns runt dem)
  const belt = mat(P.hvVest);
  s.spine.add(box(b.chestW + 0.03, 0.09, b.chestD + 0.04, belt, 0, 0.06, 0));
  s.spine.add(box(0.26, 0.12, 0.07, mat(P.ammo), 0, 0.12, b.chestD / 2 + 0.05));
  for (const x of [-0.11, 0.11]) {
    const strap = box(0.05, b.torsoH * 0.95, 0.02, belt, x, b.torsoH / 2, td(b.torsoH / 2) + 0.012);
    strap.rotation.x = -0.06; s.spine.add(strap);
    s.spine.add(box(0.05, b.torsoH * 0.8, 0.02, belt, x, b.torsoH / 2, -td(b.torsoH / 2) - 0.012));
  }
  // H094 (0.11.0): ett ljust band runt hjälmen, som lyser svagt (squad-view.js glow), så att gruppen
  // syns i skugga utan ringar som ritas ovanpå taken
  // 0.14.2 (speltestet av 0.14.1: Hemvärnet syns knappt): bandet är bredare (0,04 till 0,07 m) och varje man
  // har ett ljust armbindel på överarmarna, så att gruppen läses som Hemvärnet i skugga och på håll.
  const band = mesh(geo('cylinder', b.head * 0.65, b.head * 0.65, 0.07, 12, 1, true), mat(P.hvBand), 0, headTop + 0.03, 0.03);
  band.castShadow = false; s.head.add(band);
  for (const sh of [s.shL, s.shR]) { const arm = box(b.armW + 0.035, 0.08, b.armW + 0.035, mat(P.hvBand), 0, -b.upper * 0.32, 0); arm.castShadow = false; sh.add(arm); }
  // hjälmöverdraget: lappar ovanpå hjälmen
  for (let i = 0; i < 4; i++) { const t = sbox(r(0.07, 0.11), 0.012, r(0.05, 0.09), cam[1 + (i % 3)], r(-0.06, 0.06), headTop + b.head * 0.62 * 0.85 - 0.012, 0.03 + r(-0.06, 0.06)); t.rotation.y = r(0, 3); t.castShadow = false; s.head.add(t); }
  const rifle = ak4(metal);
  s.spine.add(rifle.g);
  return { ...s, rifle: rifle.g, muzzle: rifle.muzzle, seed, kind };
}
// Ställningar. stance: 'crouch' (på huk vid husknut eller bil, lutar sig ut), 'kneel' (på knä
// bakom häck, staket eller säckar) eller 'prone' (ligger i diket eller på gräset). lean: -1..1
// åt vilket håll han lutar sig ut (bara crouch). recoil 0..1: geväret stöts bakåt.
function hvReset(s) {
  s.body.position.set(0, 0, 0); s.body.rotation.set(0, 0, 0);
  const js = s._joints ??= [s.hipL, s.hipR, s.kneeL, s.kneeR, s.shL, s.shR, s.elL, s.elR, s.spine, s.head];
  for (let i = 0; i < js.length; i++) js[i].rotation.set(0, 0, 0);
}
function aimArms(s) {
  s.shR.rotation.set(-1.25, 0, -0.35); s.elR.rotation.x = -1.15;      // bakre handen vid greppet
  s.shL.rotation.set(-1.45, 0, 0.32); s.elL.rotation.x = -0.35;       // främre handen under handskyddet
}
// 0.12.2 (speltestet: "de ligger och snurrar på marken"): mer liv i ställningarna, bara bild.
//   twist   radianer: överkroppen vrids först mot målet, benen (roten) följer efter (knä, huk)
//   crawl   fas eller -1: den liggande kryper runt höften när han vänder sig (benen saxar, armarna drar)
//   breath  fas: andningen lyfter bröstet lite
//   sway    -1..1: liten svajning och viktförskjutning mellan benen
//   scan    radianer: huvudet spanar åt sidorna när han inte skjuter
//   reload  0..1: omladdning (geväret tippas, vänsterhanden till magasinet), 0 = ingen
// opts återanvänds av squad-view.js (ingen ny allokering per bildruta).
export function hvPose(s, stance, { lean = 0, recoil = 0, twist = 0, crawl = -1, breath = 0, sway = 0, scan = 0, reload = 0 } = {}) {
  hvReset(s);
  const rf = s.rifle;
  const br = Math.sin(breath) * 0.025;
  if (stance === 'prone') {
    // på magen, huvudet framåt, geväret framför huvudet på höger sida. Kroppen ligger bakåt från
    // roten; squad-view.js flyttar roten så att höften är vridpunkten.
    s.body.rotation.x = Math.PI / 2; s.body.position.set(0, 0.16 + br * 0.4, -0.95);
    s.head.rotation.set(-1.1, scan * 0.6, 0);
    s.hipL.rotation.z = 0.16; s.hipR.rotation.z = -0.2; s.kneeR.rotation.x = 0.3;
    s.shL.rotation.set(-2.7, 0, 0.35); s.elL.rotation.x = -0.25;
    s.shR.rotation.set(-2.45, 0, -0.45); s.elR.rotation.x = -0.9;
    rf.position.set(0.1, 0.42 - recoil * 0.06, -0.18); rf.rotation.set(-Math.PI / 2 + 0.06, 0, 0);
    if (crawl >= 0) {
      // kryper: benen saxar, armbågarna drar, bålen rullar lite
      const c = Math.sin(crawl), d = Math.cos(crawl);
      s.hipL.rotation.z = 0.16 + 0.35 * Math.max(0, c); s.hipR.rotation.z = -0.2 - 0.35 * Math.max(0, -c);
      s.kneeL.rotation.x = 0.5 * Math.max(0, c); s.kneeR.rotation.x = 0.3 + 0.5 * Math.max(0, -c);
      s.shL.rotation.z = 0.35 + 0.25 * d; s.shR.rotation.z = -0.45 + 0.25 * d;
      s.body.rotation.y = 0.08 * c;
    } else {
      s.hipL.rotation.z += sway * 0.05; s.hipR.rotation.z += sway * 0.05;
    }
    if (reload > 0) {
      const k = Math.sin(Math.PI * Math.min(1, reload));
      rf.rotation.z = -0.7 * k; s.shL.rotation.set(-2.7 + 0.9 * k, 0, 0.35 - 0.4 * k); s.elL.rotation.x = -0.25 - 1.0 * k;
    }
    return;
  }
  if (stance === 'kneel') {
    s.body.position.y = -0.47;
    s.hipL.rotation.x = -1.45; s.kneeL.rotation.x = 1.5;
    s.hipR.rotation.x = 0.25; s.kneeR.rotation.x = 1.75;
    s.spine.rotation.x = 0.12 + br; s.head.rotation.x = -0.05;
  } else {
    // på huk, lutar sig ut runt hörnet
    s.body.position.y = -0.44;
    s.hipL.rotation.set(-1.5, 0, 0.12); s.kneeL.rotation.x = 1.6;
    s.hipR.rotation.set(-1.2, 0, -0.1); s.kneeR.rotation.x = 1.75;
    s.body.position.z = -0.12;
    s.spine.rotation.set(0.35 + br, 0, -lean * 0.42); s.head.rotation.set(-0.3, 0, lean * 0.3);
  }
  // viktförskjutning och svaj: bäckenet i sidled, ryggen motvikt
  s.body.position.x = sway * 0.035; s.body.rotation.z = sway * 0.03; s.spine.rotation.z -= sway * 0.05;
  // överkroppen först (benen följer i squad-view.js), huvudet spanar
  s.spine.rotation.y = twist; s.head.rotation.y = scan;
  aimArms(s);
  // kolven vid axeln, pipan rakt fram (ryggens lutning tas bort så att den ligger vågrätt)
  rf.position.set(0.1, 0.46, 0.02 - recoil * 0.06);
  rf.rotation.set(-s.spine.rotation.x - recoil * 0.12, 0, 0);
  if (reload > 0) {
    // geväret ner och vridet, vänsterhanden till magasinet och tillbaka
    const k = Math.sin(Math.PI * Math.min(1, reload));
    rf.position.y -= 0.12 * k; rf.rotation.x += 0.55 * k; rf.rotation.z = -0.6 * k;
    s.shL.rotation.set(-1.45 + 0.75 * k, 0, 0.32 - 0.2 * k); s.elL.rotation.x = -0.35 - 1.1 * k;
    s.head.rotation.x += 0.35 * k; s.head.rotation.y = scan * (1 - k);
  }
}
// Springer ut till sin plats, geväret snett över bröstet. phase växer med sträckan.
export function hvRun(s, phase) {
  hvReset(s);
  const sn = Math.sin(phase), c = Math.cos(phase);
  s.body.position.y = Math.abs(c) * 0.05 - 0.04;
  s.hipL.rotation.x = sn * 0.8 - 0.2; s.hipR.rotation.x = -sn * 0.8 - 0.2;
  s.kneeL.rotation.x = 0.2 + 1.1 * Math.max(0, -c); s.kneeR.rotation.x = 0.2 + 1.1 * Math.max(0, c);
  s.spine.rotation.x = 0.22;
  s.shR.rotation.set(-0.55, 0, -0.25); s.elR.rotation.x = -1.4;
  s.shL.rotation.set(-1.0, 0, 0.45); s.elL.rotation.x = -1.2;
  s.rifle.position.set(0.02, 0.32, 0.2); s.rifle.rotation.set(-0.5, 0.9, 0);
}
// Stupad: på rygg, geväret bredvid. t 0..1 (fallet).
export function hvDown(s, t) {
  hvPose(s, 'kneel');
  s.body.rotation.x = -Math.PI / 2 * t; s.body.position.set(0, 0.12 * t + (1 - t) * -0.47, 0);
  s.hipL.rotation.x *= 1 - t; s.kneeL.rotation.x *= 1 - t * 0.7; s.hipR.rotation.x *= 1 - t; s.kneeR.rotation.x *= 1 - t * 0.6;
  s.shL.rotation.set(-2.4 * t, 0, 0.5 * t); s.shR.rotation.set(-0.3, 0, -0.7 * t); s.elL.rotation.x = -0.3; s.elR.rotation.x = -0.2;
  s.spine.rotation.x = -0.05; s.head.rotation.set(-0.3 * t, 0.4 * t, 0);
  s.rifle.position.set(0.45, 0.2, -0.1 * t); s.rifle.rotation.set(0, 0.6, 0.1);
}
// Markeringen i handen: en ring med gruppens radie och en liten platta där varje soldat skulle
// ligga. Samma gröna och röda spökmaterial som pjäserna. setSquadGhost flyttar plattorna.
export function squadGhost(radius, max = 6) {
  const g = new THREE.Group();
  // H094 (0.11.0, speltestet av 0.10.2: ringarna ritades ovanpå hustaken): djuptest med förskjutning
  // mot kameran, så att husen skymmer ringen som allt annat på marken.
  const m = new THREE.MeshBasicMaterial({ color: GHOST_OK, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.userData.own = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.14, radius, 72), m);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.07; g.add(ring);
  const fillM = new THREE.MeshBasicMaterial({ color: GHOST_OK, transparent: true, opacity: 0.08, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  fillM.userData.own = true;
  const fill = new THREE.Mesh(new THREE.CircleGeometry(radius, 72), fillM);
  fill.rotation.x = -Math.PI / 2; fill.position.y = 0.06; g.add(fill);
  const dot = new THREE.Mesh(geo('ring', 0.35, 0.6, 4, 1, Math.PI / 4), m);
  dot.rotation.x = -Math.PI / 2; dot.position.y = 0.09; g.add(dot);
  const men = [];
  for (let i = 0; i < max; i++) {
    const t = new THREE.Mesh(geo('ring', 0.55, 0.85, 16), m);
    t.rotation.x = -Math.PI / 2; t.visible = false; g.add(t);
    men.push(t);
  }
  g.userData.ghost = { m, ok: true, fillM, men };
  xrayGhost(g, g.userData.ghost);
  g.renderOrder = 4;
  return g;
}
export function setSquadGhost(group, cx, cz, spots) {
  const u = group.userData.ghost;
  u.fillM.color.copy(u.m.color);
  u.men.forEach((t, i) => {
    const sp = spots[i];
    t.visible = !!sp;
    if (sp) t.position.set(sp.x - cx, 0.09, sp.z - cz);
  });
}

// ---------- placeringens spöke ----------
// Vapnets modell (nivå 1) i en enda genomskinlig färg: grön där pjäsen får stå, röd där den inte
// får. Följer pekaren i placeringsläget. Ett eget material, delad geometri med vapnet.
export const GHOST_OK = '#7fbf5a', GHOST_BAD = '#c8452f';
export function weaponGhost(type, { roof = false } = {}) {
  const model = weaponModel(type, 1, { roof });
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
  xrayGhost(model.group, model.group.userData.ghost);
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
  xrayGhost(g, g.userData.ghost);
  g.renderOrder = 4;
  return g;
}
export function setGhostTone(group, ok) {
  const u = group.userData.ghost;
  if (u.ok === ok) return;
  u.ok = ok;
  u.m.color.set(ok ? GHOST_OK : GHOST_BAD);
  u.m.opacity = ok ? 0.5 : 0.42;
  if (u.x) u.x.color.set(ok ? GHOST_OK : GHOST_BAD);
}
// 0.12.0 (H113, speltestet av 0.11.0: "spöket göms bakom taken"): de delar av spöket som skyms av hus
// och tak ritas ändå, svagare, genom det som står framför (ett röntgenpass: djuptest 'större än').
// Spöket själv skriver inget djup, så bara riktiga föremål framför det räknas.
function xrayGhost(group, u) {
  const x = new THREE.MeshBasicMaterial({ color: GHOST_OK, transparent: true, opacity: 0.28, depthWrite: false, depthFunc: THREE.GreaterDepth });
  x.userData.own = true;
  const meshes = [];
  group.traverse(o => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const c = new THREE.Mesh(o.geometry, x);
    c.renderOrder = 6; c.castShadow = false; c.receiveShadow = false;
    o.add(c);
  }
  u.x = x;
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
// ---------- vägspärren vid Lästringe (E4:s bas, 0.15.0) ----------
// Origo mitt i avfartens stam där bommen går, +x nedför stammen mot horden, z tvärs över vägen (stammen
// är 9 m bred). Betongsuggor i sicksack framför bommen, sandsäckar på sidorna, vaktkur, en lastbil och
// en pansarbandvagn bakom. Fotavtrycken står också i src/data/e4-lastringe.js ROADBLOCK_PARTS (där
// går det inte att ställa ut något).
const MIL = { green: '#4f5a3d', dark: '#38412c', canvas: '#5d6247', black: '#1e1f1c' };
function jerseyMesh(len = 3) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.55, 0); shape.lineTo(0.55, 0); shape.lineTo(0.3, 0.35); shape.lineTo(0.18, 1.05);
  shape.lineTo(-0.18, 1.05); shape.lineTo(-0.3, 0.35); shape.lineTo(-0.55, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2);
  return mesh(g, mat(P.concrete));
}
function milTruck() {
  const g = new THREE.Group(), body = mat(MIL.green, { roughness: 0.85 }), dark = mat(MIL.dark), tire = mat(P.tire);
  g.add(box(1.9, 1.7, 2.3, body, 2.3, 1.55, 0));
  g.add(box(0.05, 0.6, 2.0, mat(P.carGlass, { roughness: 0.3, metalness: 0.4 }), 3.27, 1.95, 0));
  g.add(box(6.6, 0.3, 2.3, dark, -0.4, 0.85, 0));
  g.add(box(4.4, 1.9, 2.4, mat(MIL.canvas, { roughness: 1 }), -1.2, 2.05, 0));
  for (const wx of [2.4, -0.8, -2.2]) for (const sz of [-1, 1]) {
    const w = mesh(geo('cylinder', 0.55, 0.55, 0.4, 12), tire, wx, 0.55, sz * 1.0); w.rotation.x = Math.PI / 2; g.add(w);
  }
  return g;
}
function apc() {
  const g = new THREE.Group(), body = mat(MIL.green, { roughness: 0.8, metalness: 0.15 }), dark = mat(MIL.dark), tire = mat(P.tire);
  g.add(box(5.6, 1.2, 2.7, body, 0, 1.25, 0));
  const nose = box(1.2, 1.0, 2.7, body, 3.1, 1.05, 0); nose.rotation.z = -0.45; g.add(nose);
  g.add(box(4.6, 0.5, 2.3, body, -0.4, 2.05, 0));
  g.add(box(1.3, 0.5, 1.2, dark, 0.3, 2.55, 0));
  g.add(box(1.4, 0.12, 0.12, mat(P.gunMetal), 1.3, 2.62, 0));
  for (const wx of [2.0, 0.7, -0.7, -2.0]) for (const sz of [-1, 1]) {
    const w = mesh(geo('cylinder', 0.6, 0.6, 0.45, 12), tire, wx, 0.6, sz * 1.25); w.rotation.x = Math.PI / 2; g.add(w);
  }
  return g;
}
export function roadblockModel() {
  const g = new THREE.Group();
  // betongsuggor: en rad framför bommen med lucka i mitten, och längs sidorna
  for (const [x, z, ry, len] of [[1.4, -3.0, 0, 3], [1.4, 3.0, 0, 3], [3.6, -1.2, 0.35, 2.4], [1.5, -6.6, 0, 3.2], [1.5, 6.6, 0, 3.2]]) {
    const j = jerseyMesh(len); j.position.set(x, 0, z); j.rotation.y = ry; g.add(j);
  }
  sandbagWall(g, -0.6, -4.8, -7.6, 3);
  sandbagWall(g, -0.6, 4.8, 7.6, 3);
  sandbagWall(g, -1.2, -4.9, -7.3, 2);
  // bommen tvärs över stammen
  const postM = mat(P.gunMetal, { metalness: 0.4, roughness: 0.6 });
  g.add(box(0.34, 1.25, 0.34, postM, 0.2, 0.62, -4.4));
  g.add(box(0.5, 0.4, 0.5, mat(P.concreteDark), 0.2, 0.2, -4.4));
  g.add(box(0.28, 0.28, 0.6, postM, 0.2, 1.12, -4.9));
  const stripes = [mat(P.paper), mat(P.rust)];
  for (let i = 0; i < 14; i++) g.add(box(0.12, 0.12, 0.6, stripes[i % 2], 0.2, 1.12, -4.0 + i * 0.6));
  g.add(box(0.2, 0.9, 0.2, postM, 0.2, 0.45, 4.4));
  // vaktkuren
  const booth = new THREE.Group();
  const wall = mat(P.wall), roof = mat(P.concreteDark), glass = mat(P.carGlass, { roughness: 0.3, metalness: 0.4 });
  booth.add(box(2.0, 2.3, 2.0, wall, 0, 1.15, 0));
  booth.add(box(2.4, 0.18, 2.4, roof, 0, 2.39, 0));
  booth.add(box(1.5, 0.55, 0.04, glass, 0, 1.6, 1.01));
  booth.add(box(0.04, 0.55, 1.3, glass, 1.01, 1.6, 0));
  booth.add(box(0.7, 1.5, 0.04, mat(P.crateDark), -0.55, 0.75, -1.01));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.6), new THREE.MeshStandardMaterial({ map: signTexture('STOPP'), roughness: 0.9 }));
  sign.material.map.repeat.set(1, 0.35); sign.material.map.offset.set(0, 0.325);
  sign.position.set(1.03, 2.05, 0); sign.rotation.y = Math.PI / 2; booth.add(sign);
  booth.position.set(-3.2, 0, -8.2);
  g.add(booth);
  g.add(mesh(geo('cylinder', 0.05, 0.06, 4.6, 6), postM, -1.6, 2.3, -9.4));
  const flag = box(1.1, 0.7, 0.03, mat(P.soldierShirt), -1.02, 4.15, -9.4);
  g.add(flag);
  // fordonen bakom spärren, på väg 800
  const truck = milTruck(); truck.position.set(-7.5, 0, 7.5); truck.rotation.y = 0.15; g.add(truck);
  const pbv = apc(); pbv.position.set(-8.8, 0, -2); pbv.rotation.y = -0.2; g.add(pbv);
  // lådor och tunnor innanför
  for (const [x, z, ry] of [[-1.6, 3.8, 0.2], [-1.9, 4.6, -0.3], [-2.4, -4.2, 0.6]]) {
    const c = new THREE.Group();
    c.add(box(0.78, 0.36, 0.42, mat(P.crate), 0, 0.18, 0));
    c.add(box(0.82, 0.07, 0.46, mat(P.crateDark), 0, 0.38, 0));
    c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  }
  for (const [x, z] of [[-3.0, 5.4], [-3.5, 5.9]]) g.add(mesh(geo('cylinder', 0.45, 0.45, 1.2, 12), mat(P.barrel, { roughness: 0.8, metalness: 0.2 }), x, 0.6, z));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
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
