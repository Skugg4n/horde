// Effekter: spårljus, mynningsflamma, hylsor, köttbitar, damm och blodstänk.
// Allt ligger i fasta förråd (instanser och ringbuffertar), så inget skapas per skott.
import * as THREE from 'three';
import { rnd, pick, canvasTex, PALETTE as P } from './kit.js';

const TRACER_CAP = 48, CASING_CAP = 140, BIT_CAP = 260, SPLAT_CAP = 150, FLASH_N = 4;
const TRACER_SPEED = 90;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// Färger på småbitar: blod, betong, damm.
const BIT_COLORS = { blood: new THREE.Color(P.gib), concrete: new THREE.Color(P.concreteDark), dust: new THREE.Color(P.dust) };

export function createFx(scene) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();

  function instanced(geo, material, cap, { shadow = false, color = false } = {}) {
    const im = new THREE.InstancedMesh(geo, material, cap);
    im.frustumCulled = false; im.castShadow = false; im.receiveShadow = shadow;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < cap; i++) im.setMatrixAt(i, ZERO);
    if (color) { im.setColorAt(0, BIT_COLORS.blood); for (let i = 1; i < cap; i++) im.setColorAt(i, BIT_COLORS.blood); }
    scene.add(im);
    return im;
  }

  // ---------- spårljus ----------
  const tracerIM = instanced(new THREE.BoxGeometry(1.6, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: P.tracer }), TRACER_CAP);
  const tracers = Array.from({ length: TRACER_CAP }, () => ({ on: false, from: new THREE.Vector3(), to: new THREE.Vector3(), q: new THREE.Quaternion(), t: 0, len: 1 }));
  let tracerNext = 0;
  function tracer(from, to) {
    const t = tracers[tracerNext]; tracerNext = (tracerNext + 1) % TRACER_CAP;
    t.on = true; t.from.copy(from); t.to.copy(to); t.t = 0;
    t.len = Math.max(0.01, from.distanceTo(to));
    t.q.setFromUnitVectors(X_AXIS, v.subVectors(to, from).normalize());
  }

  // ---------- mynningsflamma: fast antal ljus så att shadern aldrig byggs om ----------
  const flashMat = new THREE.MeshBasicMaterial({ color: P.muzzleFlash, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const flashGeo = new THREE.PlaneGeometry(1.2, 0.7);
  const flashes = [];
  for (let i = 0; i < FLASH_N; i++) {
    const light = new THREE.PointLight(P.muzzle, 0, 14, 1.6);
    const mat = flashMat.clone();
    const plane = new THREE.Mesh(flashGeo, mat);
    plane.visible = false;
    scene.add(light, plane);
    flashes.push({ light, plane, mat, k: 0 });
  }
  // Ljuset hör till positionen (slotId), inte till modellen: en uppgradering bygger en ny
  // modell med ny mynning, men samma pjäs ska fortsätta lysa med sitt eget ljus.
  let flashOwner = new Map(), flashNext = 0;
  function flash(muzzle, key) {
    let i = flashOwner.get(key);
    if (i === undefined) { i = flashNext; flashNext = (flashNext + 1) % FLASH_N; flashOwner.set(key, i); }
    const f = flashes[i];
    muzzle.getWorldPosition(f.light.position);
    muzzle.getWorldQuaternion(f.plane.quaternion);
    muzzle.localToWorld(f.plane.position.set(0.5, 0, 0));
    f.plane.rotateX(rnd(0, 3));
    f.k = 1;
  }

  // ---------- hylsor ----------
  const casingIM = instanced(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 5), new THREE.MeshStandardMaterial({ color: P.brass, metalness: 0.8, roughness: 0.35 }), CASING_CAP);
  const casings = Array.from({ length: CASING_CAP }, () => ({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), rx: 0, ry: 0, rest: false, life: 0 }));
  let casingNext = 0;
  function casing(muzzle) {
    const c = casings[casingNext]; casingNext = (casingNext + 1) % CASING_CAP;
    muzzle.parent.localToWorld(c.p.set(0.1, 0.2, 0));
    c.v.set(rnd(-1.5, 1.5), rnd(3, 4.5), rnd(-1.5, 1.5));
    c.on = true; c.rest = false; c.life = 8; c.rx = 0; c.ry = rnd(0, 6);
  }

  // ---------- småbitar: kött, betongflisor, damm ----------
  const bitIM = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), BIT_CAP, { color: true });
  const bits = Array.from({ length: BIT_CAP }, () => ({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, size: 0.09, grav: 18, grow: 0 }));
  let bitNext = 0, bitColorDirty = false;
  function bit(x, y, z, color, size, life, grav) {
    const b = bits[bitNext];
    bitIM.setColorAt(bitNext, color); bitColorDirty = true;
    bitNext = (bitNext + 1) % BIT_CAP;
    b.on = true; b.p.set(x, y, z); b.life = life; b.size = size; b.grav = grav; b.grow = 0;
    return b;
  }
  function gibs(x, y, z, n = 6) {
    for (let i = 0; i < n; i++) bit(x, y, z, BIT_COLORS.blood, rnd(0.06, 0.11), 1.2, 18).v.set(rnd(1, 4), rnd(1, 4), rnd(-2, 2));
  }
  function chips(x, y, z, n = 4) {
    for (let i = 0; i < n; i++) bit(x, y, z, BIT_COLORS.concrete, rnd(0.05, 0.12), 1.0, 18).v.set(rnd(0.5, 3), rnd(1.5, 4), rnd(-1.5, 1.5));
    const d = bit(x, y * 0.5, z, BIT_COLORS.dust, 0.25, 0.7, -0.5); d.v.set(rnd(0.2, 0.8), rnd(0.3, 0.8), rnd(-0.4, 0.4)); d.grow = 1.2;
  }
  function puff(x, z, n = 7) {
    for (let i = 0; i < n; i++) {
      const d = bit(x + rnd(-0.6, 0.6), rnd(0.2, 0.8), z + rnd(-0.6, 0.6), BIT_COLORS.dust, rnd(0.2, 0.4), rnd(0.6, 1.0), -0.6);
      d.v.set(rnd(-1, 1), rnd(0.4, 1.2), rnd(-1, 1)); d.grow = 1.5;
    }
  }

  // ---------- blodstänk på marken ----------
  const splatTex = canvasTex(128, (g, sz) => {
    g.translate(sz / 2, sz / 2);
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill();
    for (let i = 0; i < 26; i++) {
      const a = rnd(0, 7), d = rnd(18, 58), r = rnd(2, 10) * (1 - d / 70);
      g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(1, r), 0, 7); g.fill();
    }
  });
  splatTex.wrapS = splatTex.wrapT = THREE.ClampToEdgeWrapping;
  const splatGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const splatIM = instanced(splatGeo, new THREE.MeshStandardMaterial({
    color: '#ffffff', alphaMap: splatTex, transparent: true, roughness: 0.35, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2,
  }), SPLAT_CAP, { shadow: true, color: true });
  const splatColors = P.splat.map(c => new THREE.Color(c));
  let splatNext = 0;
  function splat(x, z, size) {
    const i = splatNext; splatNext = (splatNext + 1) % SPLAT_CAP;
    q.setFromEuler(e.set(0, rnd(0, 7), 0));
    m4.compose(v.set(x, 0.03 + (i % 40) * 0.0004, z), q, s.set(size, 1, size));
    splatIM.setMatrixAt(i, m4);
    splatIM.setColorAt(i, pick(splatColors));
    splatIM.instanceMatrix.needsUpdate = true; splatIM.instanceColor.needsUpdate = true;
  }

  // ---------- bildruta ----------
  function update(dt) {
    const fade = Math.pow(0.5, dt * 60);
    for (const f of flashes) {
      if (f.k <= 0) continue;
      f.light.intensity = 60 * f.k; f.mat.opacity = f.k; f.plane.visible = true;
      f.k *= fade;
      if (f.k < 0.02) { f.k = 0; f.light.intensity = 0; f.plane.visible = false; }
    }

    for (let i = 0; i < TRACER_CAP; i++) {
      const t = tracers[i]; if (!t.on) continue;
      t.t += dt * TRACER_SPEED;
      const k = Math.min(1, t.t / t.len);
      if (k >= 1) { t.on = false; tracerIM.setMatrixAt(i, ZERO); continue; }
      m4.compose(v.lerpVectors(t.from, t.to, k), t.q, s.set(1, 1, 1));
      tracerIM.setMatrixAt(i, m4);
    }
    tracerIM.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < CASING_CAP; i++) {
      const c = casings[i]; if (!c.on) continue;
      if (!c.rest) {
        c.v.y -= 22 * dt; c.p.addScaledVector(c.v, dt); c.rx += dt * 14;
        if (c.p.y < 0.04) {
          c.p.y = 0.04; c.v.multiplyScalar(0.3); c.v.y *= -1;
          if (Math.abs(c.v.y) < 0.4) { c.rest = true; c.rx = Math.PI / 2; }
        }
      }
      c.life -= dt;
      if (c.life <= 0) { c.on = false; casingIM.setMatrixAt(i, ZERO); continue; }
      q.setFromEuler(e.set(c.rx, c.ry, 0));
      m4.compose(c.p, q, s.set(1, 1, 1));
      casingIM.setMatrixAt(i, m4);
    }
    casingIM.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < BIT_CAP; i++) {
      const b = bits[i]; if (!b.on) continue;
      b.v.y -= b.grav * dt; b.p.addScaledVector(b.v, dt);
      if (b.p.y < 0.05) { b.p.y = 0.05; b.v.set(0, 0, 0); }
      b.size += b.grow * dt;
      b.life -= dt;
      if (b.life <= 0) { b.on = false; bitIM.setMatrixAt(i, ZERO); continue; }
      const sz = b.grow ? b.size * Math.min(1, b.life * 2) : b.size;
      q.identity();
      m4.compose(b.p, q, s.set(sz, sz, sz));
      bitIM.setMatrixAt(i, m4);
    }
    bitIM.instanceMatrix.needsUpdate = true;
    if (bitColorDirty) { bitIM.instanceColor.needsUpdate = true; bitColorDirty = false; }
  }

  function clear() {
    for (let i = 0; i < TRACER_CAP; i++) { tracers[i].on = false; tracerIM.setMatrixAt(i, ZERO); }
    for (let i = 0; i < CASING_CAP; i++) { casings[i].on = false; casingIM.setMatrixAt(i, ZERO); }
    for (let i = 0; i < BIT_CAP; i++) { bits[i].on = false; bitIM.setMatrixAt(i, ZERO); }
    for (let i = 0; i < SPLAT_CAP; i++) splatIM.setMatrixAt(i, ZERO);
    for (const im of [tracerIM, casingIM, bitIM, splatIM]) im.instanceMatrix.needsUpdate = true;
    for (const f of flashes) { f.k = 0; f.light.intensity = 0; f.plane.visible = false; }
    flashOwner = new Map(); flashNext = 0;
  }

  return { tracer, flash, casing, gibs, chips, puff, splat, update, clear };
}
