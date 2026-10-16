// Vilande smittade i husen (0.12.0, H101), bara bild. Ett förvarnat hus har en svag röd ton på dörren
// och ett fönster mot gatan. När vågen börjar slås dörren upp: den flyger ut och faller, flisor och
// damm, och zombierna kliver ut genom dörröppningen (view.js låter dem gå från dörren till gatan).
// Husens dörrar och fönster kommer från villans bygge (gnesta-world.js, scene.userData.houseFronts).
import * as THREE from 'three';
import { mat, PALETTE as P } from './kit.js';

const TINT = new THREE.Color('#e0341e');
const DOOR_GEO = new THREE.BoxGeometry(0.98, 2.08, 0.06);
const PLANE = new THREE.PlaneGeometry(1, 1);

export function createDormant(scene, fx) {
  const fronts = () => scene.userData.houseFronts ?? new Map();
  const tints = new Map();        // hus -> [mesh]
  const doors = [];               // flygande dörrar { mesh, vx, vy, vz, spin, t }
  let clock = 0;
  const tintM = new THREE.MeshBasicMaterial({ color: TINT, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

  // Lokal punkt på husets framsida till världen.
  function at(f, lx, y, lz) {
    const c = Math.cos(f.ry), s = Math.sin(f.ry);
    return new THREE.Vector3(f.x + lx * c + lz * s, y, f.z - lx * s + lz * c);
  }
  // Dörrens mitt vid marken i världen (där zombierna kliver ut), eller null.
  function doorAt(house) {
    const f = fronts().get(house);
    if (!f) return null;
    const p = at(f, f.doorX, 0, f.frontZ + 0.5);
    return { x: p.x, z: p.z, ry: f.ry };
  }
  function addTint(house) {
    const f = fronts().get(house);
    if (!f || tints.has(house)) return;
    const list = [];
    const quad = (lx, y, w, h) => {
      const m = new THREE.Mesh(PLANE, tintM);
      m.scale.set(w, h, 1);
      m.position.copy(at(f, lx, y, f.frontZ + 0.12));
      m.rotation.y = f.ry;
      m.renderOrder = 3;
      scene.add(m); list.push(m);
    };
    quad(f.doorX, f.doorY, 1.0, 2.1);
    if (f.winU != null) quad(f.winU, f.winY, 1.1, 1.1);
    tints.set(house, list);
  }
  function clearTint(house) {
    for (const m of tints.get(house) ?? []) scene.remove(m);
    tints.delete(house);
  }
  function clear() {
    for (const h of [...tints.keys()]) clearTint(h);
    for (const d of doors) scene.remove(d.mesh);
    doors.length = 0;
  }
  // Dagens hus: förvarnade och ännu inte uppslagna får tonen.
  function setSim(sim) {
    clear();
    for (const d of sim.dayCfg.dormant ?? []) if (d.intel !== false && !sim.burst.includes(d.house)) addTint(d.house);
  }
  function burst(house) {
    clearTint(house);
    const f = fronts().get(house);
    if (!f) return;
    const mesh = new THREE.Mesh(DOOR_GEO, mat(P.crateDark ?? '#5a4632'));
    mesh.castShadow = true;
    mesh.position.copy(at(f, f.doorX, f.doorY, f.frontZ + 0.1));
    mesh.rotation.y = f.ry;
    scene.add(mesh);
    const out = 3.2 + Math.random();
    doors.push({ mesh, vx: Math.sin(f.ry) * out, vz: Math.cos(f.ry) * out, vy: 2.2, spin: 3.5 + Math.random() * 2, t: 0, ry: f.ry });
    const p = at(f, f.doorX, 0, f.frontZ + 0.4);
    for (let i = 0; i < 4; i++) fx.chips(p.x, 1 + Math.random(), p.z, 4);
    fx.puff(p.x, p.z, 3);
  }
  function update(dt) {
    clock += dt;
    tintM.opacity = 0.42 + 0.1 * Math.sin(clock * 1.7);
    for (let i = doors.length - 1; i >= 0; i--) {
      const d = doors[i], m = d.mesh;
      d.t += dt;
      if (m.position.y > 0.05 || d.vy > 0) {
        d.vy -= 18 * dt;
        m.position.x += d.vx * dt; m.position.z += d.vz * dt;
        m.position.y = Math.max(0.05, m.position.y + d.vy * dt);
        // fäller framåt (överkanten mot gatan) tills den ligger platt
        d.rx = Math.min(Math.PI / 2, (d.rx ?? 0) + d.spin * dt);
        m.rotation.set(d.rx, d.ry, 0, 'YXZ');
      } else { d.vx = d.vz = 0; m.rotation.set(Math.PI / 2, d.ry, 0, 'YXZ'); m.position.y = 0.05; }
      if (d.t > 30) { scene.remove(m); doors.splice(i, 1); }
    }
  }
  return { setSim, burst, update, doorAt, clear, tinted: () => [...tints.keys()] };
}
