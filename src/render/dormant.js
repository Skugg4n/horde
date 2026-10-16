// Vilande smittade i husen (0.12.0, H101), bara bild. Ett förvarnat hus har en svag röd ton på dörren
// och ett fönster mot gatan. När vågen börjar slås dörren upp: den flyger ut och faller, flisor och
// damm, och zombierna kliver ut genom dörröppningen (view.js låter dem gå från dörren till gatan).
// Husens dörrar och fönster kommer från villans bygge (gnesta-world.js, scene.userData.houseFronts).
import * as THREE from 'three';
import { mat, PALETTE as P } from './kit.js';

const TINT = new THREE.Color('#e0341e');
const DOOR_GEO = new THREE.BoxGeometry(0.98, 2.08, 0.06);
const PLANE = new THREE.PlaneGeometry(1, 1);
// 0.12.1 (speltestet av 0.12.0: "den röda tonen på dörren såg jag inte på normal zoom"): en pulserande
// röd ram runt dörren och fönstret, och en liten "!" ovanför huset som syns från standardzoomen
// (samma storlek på skärmen oavsett zoom). Minikartans ping finns kvar.
const FRAME_W = 0.14;
function frameGeo(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - FRAME_W, -h / 2 - FRAME_W); s.lineTo(w / 2 + FRAME_W, -h / 2 - FRAME_W); s.lineTo(w / 2 + FRAME_W, h / 2 + FRAME_W); s.lineTo(-w / 2 - FRAME_W, h / 2 + FRAME_W);
  const hole = new THREE.Path();
  hole.moveTo(-w / 2, -h / 2); hole.lineTo(-w / 2, h / 2); hole.lineTo(w / 2, h / 2); hole.lineTo(w / 2, -h / 2);
  s.holes.push(hole);
  return new THREE.ShapeGeometry(s);
}
let PIP_TEX = null;
function pipTexture() {
  if (PIP_TEX) return PIP_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,12,8,0.75)'; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d8321c'; g.beginPath(); g.arc(32, 32, 25, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff1e6'; g.font = 'bold 40px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('!', 32, 34);
  PIP_TEX = new THREE.CanvasTexture(c);
  PIP_TEX.colorSpace = THREE.SRGBColorSpace;
  return PIP_TEX;
}
const PIP_SIZE = 0.034;      // andel av skärmens höjd
const PIP_Y = 8.5;           // meter över marken, ovanför villornas nock

export function createDormant(scene, fx) {
  const fronts = () => scene.userData.houseFronts ?? new Map();
  const tints = new Map();        // hus -> [mesh]
  const doors = [];               // flygande dörrar { mesh, vx, vy, vz, spin, t }
  let clock = 0;
  const tintM = new THREE.MeshBasicMaterial({ color: TINT, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const frameM = new THREE.MeshBasicMaterial({ color: '#ff3a1c', transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide });
  const pipM = new THREE.SpriteMaterial({ map: pipTexture(), transparent: true, depthTest: false, depthWrite: false, });

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
      const fr = new THREE.Mesh(frameGeo(w, h), frameM);
      fr.position.copy(at(f, lx, y, f.frontZ + 0.14));
      fr.rotation.y = f.ry;
      fr.renderOrder = 3; fr.userData.ownGeo = true;
      scene.add(fr); list.push(fr);
    };
    quad(f.doorX, f.doorY, 1.0, 2.1);
    if (f.winU != null) quad(f.winU, f.winY, 1.1, 1.1);
    const pip = new THREE.Sprite(pipM);
    pip.scale.set(PIP_SIZE * 40, PIP_SIZE * 40, 1);
    pip.position.set(f.x, PIP_Y, f.z);
    pip.renderOrder = 9; pip.userData.pip = true;
    scene.add(pip); list.push(pip);
    tints.set(house, list);
  }
  function clearTint(house) {
    for (const m of tints.get(house) ?? []) { scene.remove(m); if (m.userData.ownGeo) m.geometry.dispose(); }
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
  // viewH: kamerans synliga höjd i meter (ortografisk), så att "!" har samma storlek på skärmen
  function update(dt, viewH = 40) {
    clock += dt;
    tintM.opacity = 0.42 + 0.1 * Math.sin(clock * 1.7);
    const pulse = 0.5 + 0.5 * Math.sin(clock * 3.2);
    frameM.opacity = 0.45 + 0.5 * pulse;
    const ps = PIP_SIZE * viewH * (1 + 0.12 * pulse);
    for (const list of tints.values()) for (const m of list) if (m.userData.pip) { m.scale.set(ps, ps, 1); m.position.y = PIP_Y + 0.25 * pulse; }
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
