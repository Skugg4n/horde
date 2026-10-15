// Befästa positioner (H036): där en pjäs ställs ut röjs omgivningen, bara i bilden. Häckar huggs
// ner till stubbar, staket rivs eller trycks omkull, trädgårdsträd fälls (stubbe plus liggande
// stam), bilar knuffas undan och blir vrak (mörkare, lutande, utan rutor), brevlådor och
// trädgårdsmöbler välts. Sandsäckar och skräp läggs i en bruten vall runt platsen.
//
// Datadrivet: rekvisitan i Gnestas batch bär en tagg per sak (gnesta-world.js), och här ändras
// bara instansernas matriser och färger. Skräp och stubbar ligger i fyra egna InstancedMesh
// (fyra anrop till). Utseendet räknas ur mängden positioner (sorterade på rutans nyckel) med
// ett frö per ruta, så samma positioner ger alltid samma bild, i vilken ordning de än ställts ut.
// En såld pjäs lämnar skadan (positionen ligger kvar tills dagen börjar om).
import * as THREE from 'three';
import { mat, geo, PALETTE as P } from './kit.js';

export const FORTIFY_RADIUS = 3.8;     // meter från pjäsens mitt
const CAR_REACH = 1.6;                 // bilens mitt får ligga så mycket längre bort (bilen är lång)
const TREE_REACH = 0.8;                // trädets stam: kronan når ut över platsen
const HEDGE_REACH = 1.2;               // häckens bit mäts från mitten, biten är upp till 2,6 m lång
const DEBRIS_MAX = 1200;

const STUMP = new THREE.Color('#4e3f2c'), BURNT = new THREE.Color('#26221d');
const seeded = seed => {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
// Ett tal 0..1 per (ruta, instans): samma in ger samma ut.
const hash01 = (a, b) => seeded(Math.imul(a + 1, 0x9E3779B1) ^ Math.imul(b + 7, 0x85EBCA77))();

const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _t = new THREE.Matrix4(), _q = new THREE.Quaternion();
const _v = new THREE.Vector3(), _ax = new THREE.Vector3(), _c = new THREE.Color(), _box = new THREE.Box3();
// Vrid matrisen m runt en axel genom punkten (px, 0, pz): T(p) R T(-p) m.
function rotateAbout(m, px, pz, axis, angle) {
  _r.makeRotationAxis(axis, angle);
  _t.makeTranslation(px, 0, pz).multiply(_r).multiply(_m.makeTranslation(-px, 0, -pz));
  return m.premultiply(_t);
}
// Lägsta y för geometrins låda genom matrisen (så att en fälld sak kan läggas på marken).
const bboxOf = g => { if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox; };
function minY(geom, m) {
  const b = bboxOf(geom);
  let lo = Infinity;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(m);
    lo = Math.min(lo, _v.y);
  }
  return lo;
}

// tagged: [{ mesh, i, tag }] från batchen (gnesta-world.js). objects: E4:s rekvisita som egna
// objekt [{ kind, x, z, ry, object }].
export function createFortify(scene, { tagged = [], objects = [] } = {}) {
  // ---------- registret ----------
  const refs = tagged.map(({ mesh, i, tag }) => {
    const m0 = new THREE.Matrix4(); mesh.getMatrixAt(i, m0);
    const c0 = new THREE.Color(); if (mesh.instanceColor) mesh.getColorAt(i, c0);
    const p = new THREE.Vector3().setFromMatrixPosition(m0);
    return { mesh, i, tag, m0, c0, x: p.x, z: p.z, kind: mesh.userData.kind };
  });
  const byTag = new Map();
  for (const r of refs) { if (!byTag.has(r.tag)) byTag.set(r.tag, []); byTag.get(r.tag).push(r); }
  const groupTags = [...byTag.keys()].filter(t => t.kind === 'tree' || t.kind === 'car' || t.kind === 'junk');
  const objs = objects.map(o => ({ ...o, p0: o.object.position.clone(), r0: o.object.rotation.clone(), mats: null }));

  // ---------- skräpet ----------
  const debrisMat = mat('#ffffff');
  const pools = {
    bag: new THREE.InstancedMesh(geo('sphere', 0.5, 7, 5), debrisMat, DEBRIS_MAX),
    plank: new THREE.InstancedMesh(geo('box', 1, 1, 1), debrisMat, DEBRIS_MAX),
    rubble: new THREE.InstancedMesh(geo('dodeca', 0.5, 0), debrisMat, DEBRIS_MAX),
    stump: new THREE.InstancedMesh(geo('cylinder', 0.32, 0.5, 1, 6), debrisMat, DEBRIS_MAX),
  };
  for (const im of Object.values(pools)) {
    im.count = 0; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    im.setColorAt(0, _c.set('#ffffff'));
    scene.add(im);
  }
  const _o = new THREE.Object3D();
  let onRoad = () => false;      // bråte och säckar läggs inte på gatan (horden går där)
  function debris(kind, x, y, z, sx, sy, sz, color, ry = 0, rx = 0, rz = 0) {
    const im = pools[kind];
    if (im.count >= DEBRIS_MAX || onRoad(x, z)) return;
    _o.position.set(x, y, z); _o.rotation.set(rx, ry, rz, 'YXZ'); _o.scale.set(sx, sy, sz); _o.updateMatrix();
    im.setMatrixAt(im.count, _o.matrix); im.setColorAt(im.count, _c.set(color)); im.count++;
  }

  // ---------- ändringar ----------
  const touched = new Set(), dirty = new Set();
  const doneRef = new Set(), doneTag = new Set();
  function set(ref, m, color) {
    ref.mesh.setMatrixAt(ref.i, m);
    if (color && ref.mesh.instanceColor) ref.mesh.setColorAt(ref.i, color);
    touched.add(ref); dirty.add(ref.mesh);
  }
  const hide = ref => set(ref, _m.makeScale(0, 0, 0));

  // Häck: huggen till en stubbe (skalas ner mot marken), bruntonad där den kapats.
  function cutHedge(ref, key, rnd) {
    const k = 0.16 + 0.14 * hash01(key, ref.i);
    const m = new THREE.Matrix4().makeScale(1, k, 1).multiply(ref.m0);
    set(ref, m, _c.copy(ref.c0).lerp(STUMP, 0.5));
    if (rnd() < 0.35) debris('bag', ref.x + (rnd() - 0.5) * 0.8, 0.22, ref.z + (rnd() - 0.5) * 0.8, 0.85, 0.42, 0.55, P.sandbag[(rnd() * 4) | 0], rnd() * 6);
    if (rnd() < 0.3) debris('plank', ref.x + (rnd() - 0.5), 0.05, ref.z + (rnd() - 0.5), 0.9, 0.05, 0.08, '#5b6a3a', rnd() * 6);
  }
  // Staket: rivet (borta) eller nedtryckt, toppen bort från pjäsen.
  function knockFence(ref, key, gx, gz, rnd) {
    const t = ref.tag, h = hash01(key, ref.i);
    if (h < 0.38) { hide(ref); if (h < 0.12) debris('plank', ref.x + (rnd() - 0.5) * 1.2, 0.04, ref.z + (rnd() - 0.5) * 1.2, 0.08, 0.04, 0.9 + rnd() * 0.4, ref.c0.getHex(), rnd() * 6); return; }
    _ax.set(t.dx, 0, t.dz);
    const nx = -t.dz, nz = t.dx, side = Math.sign(nx * (ref.x - gx) + nz * (ref.z - gz)) || 1;
    const m = rotateAbout(ref.m0.clone(), t.ax, t.az, _ax, side * (1.38 + 0.14 * h));
    m.premultiply(_t.makeTranslation(0, 0.05, 0));
    set(ref, m, _c.copy(ref.c0).multiplyScalar(0.8));
  }
  // Träd: fällt bort från pjäsen (med lite slump), stammen och kronan ligger på marken; stubbe kvar.
  function fellTree(tag, list, key, gx, gz, rnd) {
    let dx = tag.x - gx, dz = tag.z - gz;
    const a = Math.atan2(dz, dx) + (rnd() - 0.5) * 1.0;
    dx = Math.cos(a); dz = Math.sin(a);
    _ax.set(dz, 0, -dx);
    const angle = 1.42 + rnd() * 0.12;
    for (const ref of list) {
      const m = rotateAbout(ref.m0.clone(), tag.x, tag.z, _ax, angle);
      const lift = -minY(ref.mesh.geometry, m) - 0.12;
      m.premultiply(_t.makeTranslation(0, lift, 0));
      set(ref, m, ref.mesh.geometry.type === 'DodecahedronGeometry' ? _c.copy(ref.c0).lerp(STUMP, 0.25) : null);
    }
    debris('stump', tag.x, 0.22, tag.z, 0.36, 0.44, 0.36, '#3a2f25', rnd() * 6);
    debris('stump', tag.x, 0.46, tag.z, 0.2, 0.08, 0.2, '#b59a72', rnd() * 6);   // ljus snittyta
    for (let i = 0; i < 3; i++) debris('plank', tag.x + dx * (1 + rnd() * 2) + (rnd() - 0.5), 0.05, tag.z + dz * (1 + rnd() * 2) + (rnd() - 0.5), 0.07, 0.07, 0.6 + rnd() * 0.8, '#3a2f25', rnd() * 6);
  }
  // Bil: knuffad bort från pjäsen, vriden, lutar på en sida, mörk och utan rutor.
  function wreckCar(tag, list, key, gx, gz, rnd) {
    let dx = tag.x - gx, dz = tag.z - gz;
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const push = 0.7 + rnd() * 0.7, yaw = (rnd() - 0.5) * 0.7;
    const roll = (rnd() < 0.5 ? -1 : 1) * (0.1 + rnd() * 0.1), pitch = (rnd() - 0.5) * 0.12;
    const lx = Math.cos(tag.ry ?? 0), lz = -Math.sin(tag.ry ?? 0);
    const lost = (rnd() * 4) | 0;                // ett hjul borta
    let wheel = 0;
    for (const ref of list) {
      if (ref.kind === 'glass') { hide(ref); continue; }
      const isWheel = ref.mesh.geometry.type === 'CylinderGeometry';
      if (isWheel && wheel++ === lost) { hide(ref); continue; }
      const m = ref.m0.clone();
      rotateAbout(m, tag.x, tag.z, _ax.set(lx, 0, lz), roll);
      rotateAbout(m, tag.x, tag.z, _ax.set(-lz, 0, lx), pitch);
      rotateAbout(m, tag.x, tag.z, _ax.set(0, 1, 0), yaw);
      m.premultiply(_t.makeTranslation(dx * push, -0.1, dz * push));
      set(ref, m, isWheel ? null : _c.copy(ref.c0).multiplyScalar(0.45).lerp(BURNT, 0.35));
    }
    for (let i = 0; i < 4; i++) debris('rubble', tag.x - dx * 0.8 + (rnd() - 0.5) * 2.5, 0.04, tag.z - dz * 0.8 + (rnd() - 0.5) * 2.5, 0.12 + rnd() * 0.12, 0.05, 0.12 + rnd() * 0.12, '#1d1c1a', rnd() * 6);
  }
  // Brevlåda, möbler, släpkärra: vält bort från pjäsen.
  function tipJunk(tag, list, key, gx, gz, rnd) {
    let dx = tag.x - gx, dz = tag.z - gz;
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    if (tag.what === 'trailer') {
      for (const ref of list) { const m = ref.m0.clone(); rotateAbout(m, tag.x, tag.z, _ax.set(0, 1, 0), (rnd() - 0.5) * 0.8); m.premultiply(_t.makeTranslation(dx * 0.9, 0, dz * 0.9)); set(ref, m); }
      return;
    }
    _ax.set(dz, 0, -dx);
    const angle = 1.3 + rnd() * 0.25;
    for (const ref of list) {
      const m = rotateAbout(ref.m0.clone(), tag.x, tag.z, _ax, angle);
      m.premultiply(_t.makeTranslation(0, Math.max(0, -minY(ref.mesh.geometry, m)), 0));
      set(ref, m);
    }
  }
  // Vallen: sandsäckar i en bruten båge med luckor, och lite bråte mellan säckarna.
  function rampart(gx, gz, key, rnd) {
    const a0 = rnd() * Math.PI * 2;
    for (let i = 0; i < 14; i++) {
      if (rnd() < 0.3) continue;
      const a = a0 + i / 14 * Math.PI * 2 + (rnd() - 0.5) * 0.2, r = 2.75 + rnd() * 0.45;
      const x = gx + Math.cos(a) * r, z = gz + Math.sin(a) * r;
      debris('bag', x, 0.22, z, 0.92, 0.42, 0.58, P.sandbag[(rnd() * 4) | 0], -a + Math.PI / 2 + (rnd() - 0.5) * 0.3);
      if (rnd() < 0.45) debris('bag', x + (rnd() - 0.5) * 0.2, 0.55, z + (rnd() - 0.5) * 0.2, 0.86, 0.4, 0.55, P.sandbag[(rnd() * 4) | 0], -a + Math.PI / 2 + (rnd() - 0.5) * 0.4);
      if (rnd() < 0.35) debris('plank', x + Math.cos(a) * 0.5, 0.06, z + Math.sin(a) * 0.5, 1.1 + rnd() * 0.6, 0.06, 0.16, rnd() < 0.5 ? '#6b5540' : '#7d776b', rnd() * 6, 0, (rnd() - 0.5) * 0.3);
      if (rnd() < 0.3) debris('rubble', x + (rnd() - 0.5) * 0.9, 0.08, z + (rnd() - 0.5) * 0.9, 0.25 + rnd() * 0.2, 0.18, 0.25 + rnd() * 0.2, rnd() < 0.5 ? '#6d6a62' : '#57534b', rnd() * 6);
    }
  }
  // E4: rekvisitan är egna objekt. Bilen knuffas och mörknar (egna material), träd och tunnor välts.
  function e4Object(o, gx, gz, rnd) {
    let dx = o.x - gx, dz = o.z - gz;
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const ob = o.object;
    if (o.kind === 'car') {
      ob.position.set(o.p0.x + dx * (0.7 + rnd() * 0.6), o.p0.y - 0.08, o.p0.z + dz * (0.7 + rnd() * 0.6));
      ob.rotation.set(o.r0.x + (rnd() - 0.5) * 0.1, o.r0.y + (rnd() - 0.5) * 0.6, o.r0.z + (rnd() < 0.5 ? -1 : 1) * (0.1 + rnd() * 0.08));
      if (!o.mats) {
        o.mats = [];
        ob.traverse(m => { if (!m.isMesh) return; const old = m.material; m.material = old.clone(); m.material.userData.own = true; o.mats.push([m, old]); });
      }
      for (const [m, old] of o.mats) { m.material.color.copy(old.color).multiplyScalar(0.45).lerp(BURNT, 0.35); if (old.roughness < 0.5) m.visible = false; }
    } else {
      // träd och tunnor: välta bort från pjäsen
      _q.setFromAxisAngle(_ax.set(dz, 0, -dx), 1.35 + rnd() * 0.2);
      ob.quaternion.premultiply(_q);
      if (o.kind === 'tree') debris('stump', o.x, 0.2, o.z, 0.4, 0.4, 0.4, '#2a221b', rnd() * 6);
      else ob.position.y = 0.45;
    }
  }

  function resetAll() {
    for (const ref of touched) { ref.mesh.setMatrixAt(ref.i, ref.m0); if (ref.mesh.instanceColor) ref.mesh.setColorAt(ref.i, ref.c0); dirty.add(ref.mesh); }
    touched.clear(); doneRef.clear(); doneTag.clear();
    for (const o of objs) {
      o.object.position.copy(o.p0); o.object.rotation.copy(o.r0);
      if (o.mats) for (const [m, old] of o.mats) { m.material.dispose(); m.material = old; m.visible = true; }
      o.mats = null; o.done = false;
    }
    for (const im of Object.values(pools)) im.count = 0;
  }
  function flush() {
    for (const im of dirty) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    dirty.clear();
    for (const im of Object.values(pools)) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }

  // positions: [{ x, z, key }] alla positioner som haft en pjäs i dag. Bilden räknas om från
  // grunden i nyckelordning: samma mängd ger samma bild.
  function setPositions(positions, { road = null } = {}) {
    onRoad = road ?? (() => false);
    resetAll();
    const R = FORTIFY_RADIUS;
    for (const { x: gx, z: gz, key } of [...positions].sort((a, b) => a.key - b.key)) {
      const rnd = seeded(Math.imul(key + 3, 0x2545F491));
      rampart(gx, gz, key, rnd);
      for (const ref of refs) {
        if (doneRef.has(ref)) continue;
        const k = ref.tag.kind;
        if (k !== 'hedge' && k !== 'fence') continue;
        const ddx = ref.x - gx, ddz = ref.z - gz, rr = k === 'hedge' ? R + HEDGE_REACH : R;
        if (ddx * ddx + ddz * ddz > rr * rr) continue;
        doneRef.add(ref);
        if (k === 'hedge') cutHedge(ref, key, rnd); else knockFence(ref, key, gx, gz, rnd);
      }
      for (const tag of groupTags) {
        if (doneTag.has(tag)) continue;
        const reach = R + (tag.kind === 'car' ? CAR_REACH : tag.kind === 'tree' ? TREE_REACH : 0);
        if (Math.hypot(tag.x - gx, tag.z - gz) > reach) continue;
        doneTag.add(tag);
        const list = byTag.get(tag);
        if (tag.kind === 'tree') fellTree(tag, list, key, gx, gz, rnd);
        else if (tag.kind === 'car') wreckCar(tag, list, key, gx, gz, rnd);
        else tipJunk(tag, list, key, gx, gz, rnd);
      }
      for (const o of objs) {
        if (o.done || Math.hypot(o.x - gx, o.z - gz) > R + (o.kind === 'car' ? CAR_REACH : 0)) continue;
        o.done = true;
        e4Object(o, gx, gz, rnd);
      }
    }
    flush();
  }
  function dispose() {
    for (const im of Object.values(pools)) { scene.remove(im); im.dispose(); }
  }
  return { setPositions, reset: () => { resetAll(); flush(); }, dispose, stats: { tagged: refs.length, tags: byTag.size, objects: objs.length } };
}
