// Effekter: spårljus, mynningsflamma, hylsor, köttbitar, damm, blodstänk, granater och smällar.
// Allt ligger i fasta förråd (instanser och ringbuffertar), så inget skapas per skott.
import * as THREE from 'three';
import { rnd, pick, canvasTex, PALETTE as P } from './kit.js';

const TRACER_CAP = 48, HEAVY_CAP = 24, CASING_CAP = 140, BIT_CAP = 420, SPLAT_CAP = 150, FLASH_N = 4;
// Granater: i luften, eldklot, brännmärken. BOOM_N ljus läggs sist i mynningsförrådet när det
// byggs, så att antalet ljus är fast från start och shadern aldrig byggs om.
const GRENADE_CAP = 12, FIRE_CAP = 24, SCORCH_CAP = 30, BOOM_N = 2;
// Två sorters spårljus: lätt (M249, tunt och snabbt) och tungt (M2, tjockt och ljust).
const TRACER_KIND = {
  light: { speed: 110, len: 1.2, w: 0.045, color: P.tracer, cap: TRACER_CAP },
  heavy: { speed: 80, len: 2.6, w: 0.17, color: '#fff2c8', cap: HEAVY_CAP },
};
// Mynningsflammans storlek, styrka och hur fort den slocknar, per vapen.
const FLASH_KIND = {
  light: { size: 0.75, light: 45, fade: 80 },
  heavy: { size: 2.1, light: 140, fade: 40 },
  boom: { size: 0, light: 260, fade: 12, distance: 18 },
};
const X_AXIS = new THREE.Vector3(1, 0, 0);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// Färger på småbitar: blod, betong, damm.
const BIT_COLORS = { blood: new THREE.Color(P.gib), concrete: new THREE.Color(P.concreteDark), dust: new THREE.Color(P.dust), smoke: new THREE.Color('#5d5a52'),
  dirt: P.dirtSpeck.map(c => new THREE.Color(c)), soot: new THREE.Color('#4a453e') };
const FIRE_HOT = new THREE.Color('#ffd27a'), FIRE_MID = new THREE.Color(P.fireball), FIRE_END = new THREE.Color('#5a1e08'), BLACK = new THREE.Color(0, 0, 0);

export function createFx(scene) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler(), tmpC = new THREE.Color();
  const splatGeoFor = () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

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
  const pools = {};
  for (const [k, def] of Object.entries(TRACER_KIND)) {
    const im = instanced(new THREE.BoxGeometry(def.len, def.w, def.w), new THREE.MeshBasicMaterial({ color: def.color }), def.cap);
    pools[k] = { def, im, next: 0, list: Array.from({ length: def.cap }, () => ({ on: false, from: new THREE.Vector3(), to: new THREE.Vector3(), q: new THREE.Quaternion(), t: 0, len: 1 })) };
  }
  function tracer(from, to, kind = 'light') {
    const pool = pools[kind] || pools.light;
    const t = pool.list[pool.next]; pool.next = (pool.next + 1) % pool.def.cap;
    t.on = true; t.from.copy(from); t.to.copy(to); t.t = 0;
    t.len = Math.max(0.01, from.distanceTo(to));
    t.q.setFromUnitVectors(X_AXIS, v.subVectors(to, from).normalize());
  }

  // ---------- mynningsflamma: fast antal ljus så att shadern aldrig byggs om ----------
  const flashMat = new THREE.MeshBasicMaterial({ color: P.muzzleFlash, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const flashGeo = new THREE.PlaneGeometry(1.2, 0.7);
  const flashes = [];
  for (let i = 0; i < FLASH_N + BOOM_N; i++) {
    const light = new THREE.PointLight(P.muzzle, 0, 14, 1.6);
    const mat = flashMat.clone();
    const plane = new THREE.Mesh(flashGeo, mat);
    plane.visible = false;
    scene.add(light, plane);
    flashes.push({ light, plane, mat, k: 0, kind: FLASH_KIND.light });
  }
  // Ljuset hör till pjäsen (gunId), inte till modellen: en uppgradering bygger en ny
  // modell med ny mynning, men samma pjäs ska fortsätta lysa med sitt eget ljus.
  let flashOwner = new Map(), flashNext = 0;
  function flash(muzzle, key, kind = 'light') {
    let i = flashOwner.get(key);
    if (i === undefined) { i = flashNext; flashNext = (flashNext + 1) % FLASH_N; flashOwner.set(key, i); }
    const f = flashes[i];
    f.kind = FLASH_KIND[kind] || FLASH_KIND.light;
    muzzle.getWorldPosition(f.light.position);
    muzzle.getWorldQuaternion(f.plane.quaternion);
    muzzle.localToWorld(f.plane.position.set(0.42 * f.kind.size, 0, 0));
    f.plane.rotateX(rnd(0, 3));
    f.plane.scale.set(f.kind.size * rnd(0.85, 1.15), f.kind.size * rnd(0.8, 1.2), 1);
    f.k = 1;
  }

  // Smällens ljus: de två sista platserna i förrådet, turvis. Starkt men kort.
  let boomNext = 0;
  function boomLight(x, z) {
    const f = flashes[FLASH_N + boomNext]; boomNext = (boomNext + 1) % BOOM_N;
    f.kind = FLASH_KIND.boom;
    f.light.position.set(x, 1.6, z);
    f.light.distance = FLASH_KIND.boom.distance;
    f.plane.visible = false;
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

  // Krutrök vid mynningen på en tung pjäs: två små grå moln som stiger.
  function muzzleSmoke(at) {
    for (let i = 0; i < 2; i++) {
      const d = bit(at.x + rnd(-0.15, 0.15), at.y + 0.1, at.z + rnd(-0.15, 0.15), BIT_COLORS.smoke, rnd(0.1, 0.16), rnd(0.4, 0.6), -0.8);
      d.v.set(rnd(-0.3, 0.3), rnd(0.6, 1.2), rnd(-0.3, 0.3)); d.grow = 0.6;
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

  // ---------- granater i luften ----------
  const grenadeIM = instanced(new THREE.SphereGeometry(0.11, 8, 6).scale(1, 1.25, 1), new THREE.MeshStandardMaterial({ color: P.grenade, roughness: 0.7 }), GRENADE_CAP);
  const flying = Array.from({ length: GRENADE_CAP }, () => ({ on: false, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, dur: 1, h: 2, spin: 0 }));
  let grenadeNext = 0;
  // Bågen: från kastaren till nedslaget på dur sekunder, högre ju längre kastet är.
  function grenade(from, to, dur) {
    const g = flying[grenadeNext]; grenadeNext = (grenadeNext + 1) % GRENADE_CAP;
    g.on = true; g.from.copy(from); g.to.copy(to); g.t = 0; g.dur = Math.max(0.1, dur);
    g.h = 1.8 + from.distanceTo(to) * 0.28; g.spin = rnd(0, 6);
  }

  // ---------- smällen: eldklot, jord och skräp, rök, ljus, brännmärke ----------
  const fireIM = instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), FIRE_CAP, { color: true });
  const fires = Array.from({ length: FIRE_CAP }, () => ({ on: false, p: new THREE.Vector3(), t: 0, life: 0.4, r0: 0.3, r1: 1 }));
  let fireNext = 0;
  // alphaMap läser gråskalan (grön kanal), så märket ritas i grått på svart, inte med alfa.
  const scorchTex = canvasTex(128, (g, sz) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, sz, sz);
    g.strokeStyle = 'rgb(120,120,120)'; g.lineCap = 'round';
    for (let i = 0; i < 14; i++) {                               // sotstrålar ut från mitten
      const a = rnd(0, 7), l = rnd(30, 60); g.lineWidth = rnd(2, 6);
      g.beginPath(); g.moveTo(sz / 2, sz / 2); g.lineTo(sz / 2 + Math.cos(a) * l, sz / 2 + Math.sin(a) * l); g.stroke();
    }
    const grad = g.createRadialGradient(sz / 2, sz / 2, 2, sz / 2, sz / 2, sz / 2);
    grad.addColorStop(0, 'rgb(215,215,215)'); grad.addColorStop(0.3, 'rgb(130,130,130)'); grad.addColorStop(0.7, 'rgb(35,35,35)'); grad.addColorStop(1, '#000');
    g.globalCompositeOperation = 'lighten';
    g.fillStyle = grad; g.fillRect(0, 0, sz, sz);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#000';                                          // hål: trasig kant
    for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(sz / 2 + rnd(-56, 56), sz / 2 + rnd(-56, 56), rnd(3, 10), 0, 7); g.fill(); }
  });
  scorchTex.colorSpace = THREE.NoColorSpace;
  const scorchIM = instanced(splatGeoFor(), new THREE.MeshStandardMaterial({
    color: P.scorch, alphaMap: scorchTex, transparent: true, opacity: 0.85, roughness: 1, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1,
  }), SCORCH_CAP, { shadow: true });
  let scorchNext = 0;
  function scorch(x, z, size) {
    const i = scorchNext; scorchNext = (scorchNext + 1) % SCORCH_CAP;
    q.setFromEuler(e.set(0, rnd(0, 7), 0));
    m4.compose(v.set(x, 0.025 + (i % 20) * 0.0003, z), q, s.set(size, 1, size));
    scorchIM.setMatrixAt(i, m4); scorchIM.instanceMatrix.needsUpdate = true;
  }
  function blast(x, z, r = 3) {
    for (let k = 0; k < 3; k++) {
      const f = fires[fireNext]; fireNext = (fireNext + 1) % FIRE_CAP;
      f.on = true; f.t = 0; f.life = rnd(0.3, 0.45);
      f.p.set(x + rnd(-0.5, 0.5), 0.5 + k * 0.35, z + rnd(-0.5, 0.5));
      f.r0 = r * 0.1; f.r1 = r * rnd(0.28, 0.38);
    }
    for (let i = 0; i < 26; i++) {                                // jord som kastas upp och ut
      const a = rnd(0, 7), sp = rnd(2, 7);
      bit(x, 0.3, z, pick(BIT_COLORS.dirt), rnd(0.07, 0.16), rnd(1.0, 1.6), 18).v.set(Math.cos(a) * sp, rnd(4, 10), Math.sin(a) * sp);
    }
    for (let i = 0; i < 8; i++) {                                 // skräp: asfalt- och betongflisor
      const a = rnd(0, 7), sp = rnd(3, 8);
      bit(x, 0.4, z, BIT_COLORS.concrete, rnd(0.06, 0.12), 1.2, 20).v.set(Math.cos(a) * sp, rnd(3, 7), Math.sin(a) * sp);
    }
    for (let i = 0; i < 9; i++) {                                 // dammring längs marken
      const a = i / 9 * 7;
      const d = bit(x + Math.cos(a) * 0.6, 0.3, z + Math.sin(a) * 0.6, BIT_COLORS.dust, rnd(0.14, 0.2), rnd(0.6, 0.9), -0.3);
      d.v.set(Math.cos(a) * rnd(2, 3.5), rnd(0.2, 0.6), Math.sin(a) * rnd(2, 3.5)); d.grow = 0.45;
    }
    for (let i = 0; i < 4; i++) {                                 // svart rök som stiger
      const d = bit(x + rnd(-0.4, 0.4), 0.9, z + rnd(-0.4, 0.4), BIT_COLORS.soot, rnd(0.2, 0.3), rnd(0.8, 1.1), -1.2);
      d.v.set(rnd(-0.3, 0.3), rnd(1.2, 2), rnd(-0.3, 0.3)); d.grow = 0.5;
    }
    boomLight(x, z);
    scorch(x, z, r * rnd(1.0, 1.25));
  }

  // ---------- bildruta ----------
  function update(dt) {
    for (const f of flashes) {
      if (f.k <= 0) continue;
      f.light.intensity = f.kind.light * f.k; f.mat.opacity = f.k; f.plane.visible = f.kind.size > 0;
      f.k *= Math.pow(0.5, dt * f.kind.fade);
      if (f.k < 0.02) { f.k = 0; f.light.intensity = 0; f.plane.visible = false; }
    }

    for (const pool of Object.values(pools)) {
      for (let i = 0; i < pool.def.cap; i++) {
        const t = pool.list[i]; if (!t.on) continue;
        t.t += dt * pool.def.speed;
        const k = Math.min(1, t.t / t.len);
        if (k >= 1) { t.on = false; pool.im.setMatrixAt(i, ZERO); continue; }
        m4.compose(v.lerpVectors(t.from, t.to, k), t.q, s.set(1, 1, 1));
        pool.im.setMatrixAt(i, m4);
      }
      pool.im.instanceMatrix.needsUpdate = true;
    }

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

    for (let i = 0; i < GRENADE_CAP; i++) {
      const g = flying[i]; if (!g.on) continue;
      g.t += dt;
      const k = g.t / g.dur;
      if (k >= 1) { g.on = false; grenadeIM.setMatrixAt(i, ZERO); continue; }
      v.lerpVectors(g.from, g.to, k); v.y += g.h * 4 * k * (1 - k);
      q.setFromEuler(e.set(g.spin + g.t * 9, 0, g.t * 6));
      m4.compose(v, q, s.set(1, 1, 1));
      grenadeIM.setMatrixAt(i, m4);
    }
    grenadeIM.instanceMatrix.needsUpdate = true;

    let fireColor = false;
    for (let i = 0; i < FIRE_CAP; i++) {
      const f = fires[i]; if (!f.on) continue;
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) { f.on = false; fireIM.setMatrixAt(i, ZERO); continue; }
      const r = f.r0 + (f.r1 - f.r0) * (1 - (1 - k) * (1 - k));
      m4.compose(v.copy(f.p).setY(f.p.y + k * 0.8), q.identity(), s.set(r, r * 0.85, r));
      fireIM.setMatrixAt(i, m4);
      tmpC.copy(k < 0.3 ? FIRE_HOT : FIRE_MID).lerp(k < 0.3 ? FIRE_MID : FIRE_END, k < 0.3 ? k / 0.3 : (k - 0.3) / 0.7).lerp(BLACK, Math.max(0, k - 0.6) / 0.4);
      fireIM.setColorAt(i, tmpC); fireColor = true;
    }
    fireIM.instanceMatrix.needsUpdate = true;
    if (fireColor) fireIM.instanceColor.needsUpdate = true;
  }

  function clear() {
    for (const pool of Object.values(pools)) {
      for (let i = 0; i < pool.def.cap; i++) { pool.list[i].on = false; pool.im.setMatrixAt(i, ZERO); }
      pool.im.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < CASING_CAP; i++) { casings[i].on = false; casingIM.setMatrixAt(i, ZERO); }
    for (let i = 0; i < BIT_CAP; i++) { bits[i].on = false; bitIM.setMatrixAt(i, ZERO); }
    for (let i = 0; i < SPLAT_CAP; i++) splatIM.setMatrixAt(i, ZERO);
    for (let i = 0; i < GRENADE_CAP; i++) { flying[i].on = false; grenadeIM.setMatrixAt(i, ZERO); }
    for (let i = 0; i < FIRE_CAP; i++) { fires[i].on = false; fireIM.setMatrixAt(i, ZERO); }
    for (let i = 0; i < SCORCH_CAP; i++) scorchIM.setMatrixAt(i, ZERO);
    for (const im of [casingIM, bitIM, splatIM, grenadeIM, fireIM, scorchIM]) im.instanceMatrix.needsUpdate = true;
    for (const f of flashes) { f.k = 0; f.light.intensity = 0; f.plane.visible = false; }
    flashOwner = new Map(); flashNext = 0;
  }

  return { tracer, flash, muzzleSmoke, casing, gibs, chips, puff, splat, grenade, blast, update, clear };
}
