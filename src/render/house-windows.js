// Trupperna i husen i bild (0.19.0, H459 och H428). Speltesten av 0.18.0 och 0.18.1: soldaterna "i huset" stod ute
// vid fasaden och i trädgården, med ringar på gräset och en Ksp 58 med sandsäckar på gräsmattan. Nu syns de I huset:
// en mörk fönsteröppning i fasaden och en halvkropp i karmen (bröstkorg, hjälm och vapen ut genom fönstret). Fönstret
// lyser upp och mynningen blixtrar när just den skytten skjuter. Bara bild: fönstrens platser kommer från
// simuleringen (src/sim/houses.js pickWindows), här flyttas de ut i husets riktiga fasad.
//
// Billigt: fem instansbuffertar för alla fönster på kartan (öppningen, ljuset, kroppen, huvudet, vapnet), inga nya
// objekt per bildruta. Mynningen för fx.flash är ett tomt Object3D som flyttas till pipans spets vid varje skott.
import * as THREE from 'three';

const CAP = 96;
const OPEN_W = 1.25, OPEN_H = 1.35;    // fönsteröppningen (m)
const LIT_DECAY = 7;                  // ljuset i fönstret ebbar ut så här fort efter ett skott
const IDLE_LIT = 0.22;                 // ett besatt fönster lyser svagt även när ingen skjuter
const AIM_MAX = 1.05;                 // vapnet vrids högst så här långt från fasadens normal (rad)
const KIND_COLOR = { hv: '#4d5a3d', inf: '#566048', civ: '#b9c63a', mg: '#4d5a3d' };
const HEAD_COLOR = { hv: '#3a4231', inf: '#3c4434', civ: '#a77e62', mg: '#3a4231' };
const LIT = new THREE.Color('#ffb25a');

// Punkten i husets fasad närmast (x, z): { x, z, nx, nz } med normalen ut ur huset. h: { x, z, ry, w, d }.
export function facadePoint(h, x, z, margin = 0.7) {
  const c = Math.cos(h.ry), s = Math.sin(h.ry), dx = x - h.x, dz = z - h.z;
  let lx = dx * c - dz * s, lz = dx * s + dz * c;
  const hw = h.w / 2, hd = h.d / 2;
  let nlx = 0, nlz = 0;
  if (Math.abs(lx) / hw >= Math.abs(lz) / hd) { nlx = Math.sign(lx) || 1; lx = nlx * hw; lz = Math.max(-hd + margin, Math.min(hd - margin, lz)); }
  else { nlz = Math.sign(lz) || 1; lz = nlz * hd; lx = Math.max(-hw + margin, Math.min(hw - margin, lx)); }
  return { x: h.x + lx * c + lz * s, z: h.z - lx * s + lz * c, nx: nlx * c + nlz * s, nz: -nlx * s + nlz * c };
}
// Fönstrets mitt över marken: under takfoten, ungefär i ögonhöjd för en som står inne.
export const windowY = h => Math.max(1.35, Math.min((h.eave ?? 3) - 0.85, (h.eye ?? 3) - 0.55));

export function createHouseWindows(scene) {
  const mk = (geo, mat, name, color = false) => {
    const m = new THREE.InstancedMesh(geo, mat, CAP);
    if (color) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3);
    m.count = 0; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.name = name;
    scene.add(m);
    return m;
  };
  const openM = mk(new THREE.PlaneGeometry(OPEN_W, OPEN_H), new THREE.MeshBasicMaterial({ color: '#120f0c', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 'win-open');
  const litM = mk(new THREE.PlaneGeometry(OPEN_W * 0.86, OPEN_H * 0.86), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 'win-lit', true);
  litM.renderOrder = 4;
  const bodyM = mk(new THREE.BoxGeometry(0.6, 0.62, 0.36), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), 'win-body', true);
  const headM = mk(new THREE.IcosahedronGeometry(0.2, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), 'win-head', true);
  const gunGeo = new THREE.BoxGeometry(1, 1, 1); gunGeo.translate(0.5, 0, 0);
  const gunM = mk(gunGeo, new THREE.MeshStandardMaterial({ color: '#1c1d1a', roughness: 0.6, metalness: 0.3 }), 'win-gun');
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const lit = new Map();               // nyckel -> ljusets styrka 0..1
  const tips = new Map();              // nyckel -> { x, y, z, a } pipans spets och riktning (för skottet)
  // mynningen har en förälder (fx.casing räknar hylsan från förälderns läge), som aldrig ritas
  const muzzle = new THREE.Object3D(), holder = new THREE.Object3D();
  holder.add(muzzle);
  let n = 0;

  function begin() { n = 0; tips.clear(); }
  // Ett fönster med en skytt. w: { key, x, z, nx, nz, y, aim (sim-vinkel, null = ut), kind, firing }
  function add(w) {
    if (n >= CAP) return;
    const ry = Math.atan2(w.nx, w.nz);                  // planets normal (0, 0, 1) ut ur fasaden
    q.setFromEuler(e.set(0, ry, 0));
    m4.compose(v.set(w.x + w.nx * 0.03, w.y, w.z + w.nz * 0.03), q, sc.set(1, 1, 1)); openM.setMatrixAt(n, m4);
    const k = lit.get(w.key) ?? 0;
    m4.compose(v.set(w.x + w.nx * 0.04, w.y, w.z + w.nz * 0.04), q, sc.set(1, 1, 1)); litM.setMatrixAt(n, m4);
    litM.setColorAt(n, col.copy(LIT).multiplyScalar(Math.max(IDLE_LIT, k)));
    // kroppen lutar sig ut genom öppningen; sikten vrids mot målet, högst AIM_MAX från fasaden
    const out = Math.atan2(w.nz, w.nx);
    let a = w.aim == null ? out : w.aim;
    const d = Math.atan2(Math.sin(a - out), Math.cos(a - out));
    a = out + Math.max(-AIM_MAX, Math.min(AIM_MAX, d));
    const sill = w.y - OPEN_H / 2 + 0.1, bx = w.x + w.nx * 0.24, bz = w.z + w.nz * 0.24;
    q.setFromEuler(e.set(0, -a, 0));
    m4.compose(v.set(bx, sill + 0.3, bz), q, sc.set(1, 1, 1)); bodyM.setMatrixAt(n, m4);
    bodyM.setColorAt(n, col.set(KIND_COLOR[w.kind] ?? KIND_COLOR.hv));
    m4.compose(v.set(bx - Math.cos(a) * 0.02, sill + 0.8, bz - Math.sin(a) * 0.02), q, sc.set(1, 1, 1)); headM.setMatrixAt(n, m4);
    headM.setColorAt(n, col.set(HEAD_COLOR[w.kind] ?? HEAD_COLOR.hv));
    // vapnet: från axeln ut genom fönstret (kulsprutan längre och grövre)
    const mg = w.kind === 'mg', len = mg ? 1.4 : 1.0, th = mg ? 0.13 : 0.08;
    const gx = bx + Math.cos(a) * 0.1, gy = sill + 0.5 + (k > 0.5 ? 0.03 : 0), gz = bz + Math.sin(a) * 0.1;
    m4.compose(v.set(gx, gy, gz), q, sc.set(len, th, th)); gunM.setMatrixAt(n, m4);
    tips.set(w.key, { x: gx + Math.cos(a) * len, y: gy, z: gz + Math.sin(a) * len, a });
    n++;
  }
  function end(dt) {
    for (const [key, k] of lit) { const nk = k * Math.exp(-LIT_DECAY * dt); if (nk < 0.01) lit.delete(key); else lit.set(key, nk); }
    for (const m of [openM, litM, bodyM, headM, gunM]) { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
  // Skottet från fönstret key: ljuset tänds och mynningen (för fx.flash, fx.tracer) står vid pipans spets. null om
  // fönstret inte ritades i den senaste bildrutan.
  function fire(key) {
    const t = tips.get(key);
    if (!t) return null;
    lit.set(key, 1);
    muzzle.position.set(t.x, t.y, t.z);
    muzzle.rotation.set(0, -t.a, 0);
    holder.updateMatrixWorld(true);
    return muzzle;
  }
  function clear() { n = 0; lit.clear(); tips.clear(); end(0); }
  return { begin, add, end, fire, clear, meshes: [openM, litM, bodyM, headM, gunM] };
}
