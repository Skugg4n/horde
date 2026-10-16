// De civila på väg till ishallen (0.13.0, H105). Bara bild: läget och vilka som fallit kommer från
// simuleringen (sim.civilians). Ritas som instanser som horden (horde.js), utan vapen, i springposen;
// en varm ring under var och en så att de syns bland zombierna. De som fallit ligger kvar en stund, de
// som är framme försvinner in genom dörrarna.
import * as THREE from 'three';
import { createHorde } from './horde.js';
import { hvSoldierModel, hvRun, hvDown } from './models.js';
import { OFFSET } from './camera-rig.js';

const MARK_MAX = 64, MARK_COLOR = '#f7b928';
const CIV_SCALE = 1.25;
// Krysset för en civil som fallit: två platta balkar i kors (en geometri).
function mergeCross() {
  const a = new THREE.BoxGeometry(1.1, 0.26, 0.06), b = a.clone();
  a.rotateZ(Math.PI / 4); b.rotateZ(-Math.PI / 4);
  const pos = [...a.attributes.position.array, ...b.attributes.position.array];
  const idx = [...a.index.array, ...[...b.index.array].map(i => i + a.attributes.position.count)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}
const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function createCivilians(scene) {
  const horde = createHorde(scene);
  const people = new Map();       // id -> { parts, x, z, ry, phase, down }
  const markGeo = new THREE.RingGeometry(0.36, 0.56, 20); markGeo.rotateX(-Math.PI / 2);
  const markM = new THREE.MeshBasicMaterial({ color: MARK_COLOR, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const marks = new THREE.InstancedMesh(markGeo, markM, MARK_MAX);
  marks.count = 0; marks.frustumCulled = false; marks.renderOrder = 6; marks.castShadow = false;
  scene.add(marks);
  // 0.14.1 (speltestet av 0.14.0: "jag såg aldrig en enda civil"): en gul romb över huvudet som syns genom
  // husen och mellan zombierna, så att man ser var de civila går.
  // 0.14.2 (speltestet av 0.14.1: "de gula romberna är så små att jag inte hittade dem"): romben är ungefär
  // tre gånger så stor på skärmen och har en mörk kant (en större mörk romb bakom), de civila är en fjärdedel
  // större, och ringen under dem växer med zoomen. En civil som fallit får ett rött kryss som står kvar dagen
  // ut och syns genom husen (förut bara ett märke på skärmen i 2,6 s).
  const tagGeo = new THREE.OctahedronGeometry(0.34, 0); tagGeo.scale(1, 1.5, 1);
  const tagM = new THREE.MeshBasicMaterial({ color: MARK_COLOR, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 });
  const tags = new THREE.InstancedMesh(tagGeo, tagM, MARK_MAX);
  tags.count = 0; tags.frustumCulled = false; tags.renderOrder = 9; tags.castShadow = false; tags.name = 'civ-tags';
  const edgeM = new THREE.MeshBasicMaterial({ color: '#2a1c06', depthTest: false, depthWrite: false, transparent: true, opacity: 0.85 });
  const tagEdges = new THREE.InstancedMesh(tagGeo, edgeM, MARK_MAX);
  tagEdges.count = 0; tagEdges.frustumCulled = false; tagEdges.renderOrder = 8; tagEdges.castShadow = false;
  scene.add(tagEdges, tags);
  const crossGeo = mergeCross();
  const crossM = new THREE.MeshBasicMaterial({ color: '#e0341e', depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 });
  const crosses = new THREE.InstancedMesh(crossGeo, crossM, MARK_MAX);
  crosses.count = 0; crosses.frustumCulled = false; crosses.renderOrder = 9; crosses.castShadow = false; crosses.name = 'civ-lost';
  const crossEdges = new THREE.InstancedMesh(crossGeo, edgeM, MARK_MAX);
  crossEdges.count = 0; crossEdges.frustumCulled = false; crossEdges.renderOrder = 8; crossEdges.castShadow = false;
  scene.add(crossEdges, crosses);
  // krysset vänt mot kameran (den står alltid åt samma håll, camera-rig.js OFFSET)
  const mq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(OFFSET, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)));
  const mv = new THREE.Vector3(), ms = new THREE.Vector3();
  const mm = new THREE.Matrix4();
  let bob = 0;

  // viewH: kamerans höjd i meter (view.js setZoom); romben hålls ungefär lika stor på skärmen på varje zoom.
  function sync(sim, dt, viewH = 52) {
    const k = Math.max(1.3, viewH / 30), ring = Math.min(2.2, Math.max(1, viewH / 45));
    horde.begin();
    const seen = new Set();
    let nm = 0, nx = 0;
    for (const c of sim.civilians ?? []) {
      if (c.state === 'safe') continue;
      seen.add(c.id);
      let e = people.get(c.id);
      if (!e) {
        const parts = hvSoldierModel(500 + c.id * 13, 'civ', { armed: false });
        horde.attach(parts);
        e = { parts, x: c.door?.x ?? c.x, z: c.door?.z ?? c.z, ry: 0, phase: 0, down: 0 };
        people.set(c.id, e);
      }
      const parts = e.parts;
      if (c.state === 'down') {
        e.down = Math.min(1, e.down + dt / 0.45);
        hvDown(parts, e.down * e.down);
        if (nx < MARK_MAX) {
          // en bit ovanför kroppen
          mm.compose(mv.set(e.x, 1.2 + 0.3 * k, e.z), mq, ms.set(k * 0.8, k * 0.8, k * 0.8)); crosses.setMatrixAt(nx, mm);
          mm.compose(mv, mq, ms.multiplyScalar(1.3)); crossEdges.setMatrixAt(nx++, mm);
        }
      } else {
        // 0.14.2: lerp-faktorn hette också k och skuggade rombens storlek, så romben blev aldrig större än
        // 1 (den var liten på varje zoom, speltestet av 0.14.1)
        const lerp = dt > 0 ? Math.min(1, dt * 10) : 0, px = e.x, pz = e.z;
        e.x += (c.x - e.x) * lerp; e.z += (c.z - e.z) * lerp;
        const moved = Math.hypot(e.x - px, e.z - pz);
        if (moved > 1e-4) e.ry += angleDiff(e.ry, Math.atan2(e.x - px, e.z - pz)) * Math.min(1, dt * 12);
        e.phase += moved * 2.6;
        hvRun(parts, e.phase);
        if (nm < MARK_MAX) {
          mm.makeScale(ring, 1, ring).setPosition(e.x, 0.06, e.z); marks.setMatrixAt(nm, mm);
          const y = 2.4 + 0.5 * k + 0.12 * k * Math.sin(bob * 4 + c.id);
          mm.makeScale(k, k, k).setPosition(e.x, y, e.z); tags.setMatrixAt(nm, mm);
          mm.makeScale(k * 1.32, k * 1.25, k * 1.32).setPosition(e.x, y, e.z); tagEdges.setMatrixAt(nm, mm);
          nm++;
        }
      }
      parts.root.position.set(e.x, 0, e.z);
      parts.root.scale.setScalar(CIV_SCALE);
      parts.root.rotation.y = e.ry;
      horde.draw(parts);
    }
    for (const [id, e] of people) if (!seen.has(id)) { horde.release(e.parts); people.delete(id); }
    marks.count = nm; marks.instanceMatrix.needsUpdate = true;
    tags.count = tagEdges.count = nm; tags.instanceMatrix.needsUpdate = tagEdges.instanceMatrix.needsUpdate = true;
    crosses.count = crossEdges.count = nx; crosses.instanceMatrix.needsUpdate = crossEdges.instanceMatrix.needsUpdate = true;
    bob += dt;
    horde.end();
  }
  function clear() {
    for (const e of people.values()) horde.release(e.parts);
    people.clear(); horde.clear(); marks.count = 0; tags.count = tagEdges.count = 0; crosses.count = crossEdges.count = 0;
  }
  return { sync, clear };
}
