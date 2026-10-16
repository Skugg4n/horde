// Spelkameran: samma vinkel på alla banor. Banor med map.camera.pan går att panorera (dra,
// WASD, piltangenter) och zooma (hjulet) inom gränser; E4 står still som förut.
// Skakningen (basen tar skada, granater) läggs ovanpå som en förskjutning.
import * as THREE from 'three';

export const OFFSET = new THREE.Vector3(40, 46, 40);
const R = new THREE.Vector3(1, 0, -1).normalize(), D = new THREE.Vector3(1, 0, 1).normalize();
const PITCH = Math.sin(Math.atan2(46, Math.hypot(40, 40)));
const DRAG_START = 6;          // px innan en nedtryckning räknas som panorering (annars klick)
const PAN = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };

// Zoomen (vyns höjd i meter) som får med hela rektangeln c ({ x0, x1, z0, z1 }) vid bildformatet a.
export function crispView(c, a, pad = 4) {
  let need = 0;
  const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
  for (const [x, z] of [[c.x0, c.z0], [c.x1, c.z0], [c.x1, c.z1], [c.x0, c.z1]]) {
    const dx = x - cx, dz = z - cz;
    const sx = Math.abs(dx * R.x + dz * R.z) + pad, sy = Math.abs((dx * D.x + dz * D.z) * PITCH) + pad;
    need = Math.max(need, (2 * sx) / a, 2 * sy);
  }
  return Math.ceil(need);
}
export function createRig({ camera, map, fill, dom }) {
  const cam = map.camera;
  const canPan = !!cam.pan;
  const home = new THREE.Vector3(cam.target[0], 0, cam.target[1]);
  const target = home.clone();
  let view = cam.view;
  const [zMin, zMax0] = cam.zoom ?? [view, view];
  // 0.12.0 (H117, speltestet av 0.11.0: "ser aldrig ingången och ishallen samtidigt"): längst ut ryms
  // hela den aktiva kartan (den skarpa ytan) på en skärm i 16:10 (1440 x 900), med 4 m marginal.
  const zMax = map.surroundings?.crisp ? Math.max(zMax0, crispView(map.surroundings.crisp, 1440 / 900)) : zMax0;
  const shake = new THREE.Vector3();

  function apply() {
    if (canPan) {
      target.x = Math.min(cam.pan.x1, Math.max(cam.pan.x0, target.x));
      target.z = Math.min(cam.pan.z1, Math.max(cam.pan.z0, target.z));
    }
    const a = innerWidth / innerHeight, v = a < 1 ? view * 1.5 : view;
    camera.left = -v * a / 2; camera.right = v * a / 2; camera.top = v / 2; camera.bottom = -v / 2;
    camera.position.copy(target).add(OFFSET).add(shake);
    camera.lookAt(target.x + shake.x, shake.y, target.z + shake.z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    if (fill) { fill.position.copy(target).add(OFFSET); fill.target.position.copy(target); }
  }

  // ---------- inmatning (bara banor som går att panorera) ----------
  let drag = null, dragged = false, active = true;
  const keys = new Set();
  const onDown = e => { if (!canPan || !active || e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, moved: false }; dragged = false; };
  const onUp = () => { if (drag?.moved) dom.style.cursor = ''; drag = null; };
  const onMove = e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_START) return;
    if (!drag.moved) { drag.moved = true; dragged = true; dom.style.cursor = 'grabbing'; }
    const k = view / innerHeight;
    target.addScaledVector(R, -dx * k).addScaledVector(D, -dy * k / PITCH);
    drag.x = e.clientX; drag.y = e.clientY;
    apply();
  };
  const onWheel = e => {
    if (!canPan || !active) return;
    e.preventDefault();
    view = Math.min(zMax, Math.max(zMin, view * Math.exp(e.deltaY * 0.001)));
    apply();
  };
  const onKey = e => {
    if (!canPan || !PAN[e.code] || e.metaKey || e.ctrlKey) return;
    if (e.type === 'keydown') { if (!active) return; keys.add(e.code); e.preventDefault(); } else keys.delete(e.code);
  };
  const onBlur = () => keys.clear();
  dom.addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp);
  addEventListener('pointermove', onMove);
  dom.addEventListener('wheel', onWheel, { passive: false });
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);
  addEventListener('blur', onBlur);
  addEventListener('resize', apply);

  // Introsvep (0.10.1): kameran glider från ingången till basen; ett klick, hjul eller en tangent
  // hoppar till slutet.
  let tour = null;
  function endTour() { if (!tour) return; const t = tour; tour = null; target.set(t.to.x, 0, t.to.z); view = t.to.view; apply(); t.done?.(); }
  const onSkip = () => { if (tour && active) endTour(); };
  dom.addEventListener('pointerdown', onSkip, true);
  dom.addEventListener('wheel', onSkip, true);
  addEventListener('keydown', onSkip, true);

  function update(dt) {
    if (tour) {
      tour.t = Math.min(1, tour.t + dt / tour.dur);
      const k = tour.t < 0.15 ? 0 : (tour.t - 0.15) / 0.85, e = k * k * (3 - 2 * k);
      target.set(tour.from.x + (tour.to.x - tour.from.x) * e, 0, tour.from.z + (tour.to.z - tour.from.z) * e);
      view = tour.from.view + (tour.to.view - tour.from.view) * e;
      apply();
      if (tour.t >= 1) endTour();
      return;
    }
    if (!keys.size) return;
    let ux = 0, uy = 0;
    for (const k of keys) { ux += PAN[k][0]; uy += PAN[k][1]; }
    const sp = view * 0.9 * dt;
    target.addScaledVector(R, ux * sp).addScaledVector(D, uy * sp / PITCH);
    apply();
  }
  function setShake(x, z) { shake.set(x, 0, z); apply(); }
  // Mitten och zoomen som får med alla punkter (världens x, z) med pad meter marginal, inom
  // zoomgränserna. Får de inte plats blir det största zoomen runt mitten.
  function fit(points, pad = 8) {
    const cx = points.reduce((a, p) => a + p[0], 0) / points.length, cz = points.reduce((a, p) => a + p[1], 0) / points.length;
    const a = innerWidth / innerHeight;
    let need = zMin;
    for (const [x, z] of points) {
      const dx = x - cx, dz = z - cz;
      const sx = Math.abs(dx * R.x + dz * R.z) + pad, sy = Math.abs((dx * D.x + dz * D.z) * PITCH) + pad;
      need = Math.max(need, (2 * sx) / a, 2 * sy);
    }
    const want = a < 1 ? need / 1.5 : need;
    if (want <= zMax || points.length < 2) return { x: cx, z: cz, view: Math.max(zMin, want) };
    // får inte plats: mitten flyttas mot den första punkten (basen) så att den syns helt, och den
    // andra ligger åt rätt håll ut mot kanten
    const f = 0.5 * zMax / want, [bx, bz] = points[0];
    return { x: bx + (cx - bx) * 2 * f, z: bz + (cz - bz) * 2 * f, view: zMax };
  }
  function goHome() { target.copy(home); view = cam.view; apply(); }
  function dispose() {
    dom.removeEventListener('pointerdown', onDown);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointermove', onMove);
    dom.removeEventListener('wheel', onWheel);
    removeEventListener('keydown', onKey);
    removeEventListener('keyup', onKey);
    removeEventListener('blur', onBlur);
    removeEventListener('resize', apply);
    dom.removeEventListener('pointerdown', onSkip, true);
    dom.removeEventListener('wheel', onSkip, true);
    removeEventListener('keydown', onSkip, true);
  }
  apply();
  return {
    update, setShake, goHome, dispose, apply, canPan,
    // true en gång efter en panorering, så att släppet inte räknas som ett klick
    takeDrag() { const d = dragged; dragged = false; return d; },
    set active(v) { active = v; if (!v) { keys.clear(); drag = null; } },
    get target() { return target; },
    get view() { return view; },
    focus(x, z, v) { target.set(x, 0, z); if (v) view = Math.min(zMax, Math.max(zMin, v)); apply(); },
    fit,
    // Svep från from till to ({ x, z, view }) på dur sekunder; done när det är klart eller överhoppat.
    tour(from, to, dur, done) { tour = { from, to, t: 0, dur, done }; target.set(from.x, 0, from.z); view = from.view; apply(); },
    get touring() { return !!tour; },
    skipTour: endTour,
  };
}

// Skuggkameran täcker hela spelytan (map.shadowBounds eller rutnätet) i ljusets riktning.
export function fitShadow(sun, bounds, height = 16) {
  const { x0, x1, z0, z1 } = bounds;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const dir = sun.position.clone().sub(sun.target.position).normalize();
  sun.target.position.set(cx, 0, cz);
  sun.position.set(cx, 0, cz).addScaledVector(dir, 120);
  sun.target.updateMatrixWorld();
  sun.updateMatrixWorld();
  const view = new THREE.Matrix4().lookAt(sun.position, sun.target.position, new THREE.Vector3(0, 1, 0));
  view.setPosition(sun.position);
  const inv = view.clone().invert();
  let l = Infinity, r = -Infinity, b = Infinity, t = -Infinity, n = Infinity, f = -Infinity;
  const p = new THREE.Vector3();
  for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [0, height]) {
    p.set(x, y, z).applyMatrix4(inv);
    l = Math.min(l, p.x); r = Math.max(r, p.x); b = Math.min(b, p.y); t = Math.max(t, p.y);
    n = Math.min(n, -p.z); f = Math.max(f, -p.z);
  }
  Object.assign(sun.shadow.camera, { left: l, right: r, bottom: b, top: t, near: Math.max(0.5, n - 5), far: f + 5 });
  sun.shadow.camera.updateProjectionMatrix();
}
