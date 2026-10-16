// De civila på väg till ishallen (0.13.0, H105). Bara bild: läget och vilka som fallit kommer från
// simuleringen (sim.civilians). Ritas som instanser som horden (horde.js), utan vapen, i springposen;
// en varm ring under var och en så att de syns bland zombierna. De som fallit ligger kvar en stund, de
// som är framme försvinner in genom dörrarna.
import * as THREE from 'three';
import { createHorde } from './horde.js';
import { hvSoldierModel, hvRun, hvDown } from './models.js';

const MARK_MAX = 64, MARK_COLOR = '#f2c46b';
const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function createCivilians(scene) {
  const horde = createHorde(scene);
  const people = new Map();       // id -> { parts, x, z, ry, phase, down }
  const markGeo = new THREE.RingGeometry(0.36, 0.56, 20); markGeo.rotateX(-Math.PI / 2);
  const markM = new THREE.MeshBasicMaterial({ color: MARK_COLOR, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const marks = new THREE.InstancedMesh(markGeo, markM, MARK_MAX);
  marks.count = 0; marks.frustumCulled = false; marks.renderOrder = 6; marks.castShadow = false;
  scene.add(marks);
  const mm = new THREE.Matrix4();

  function sync(sim, dt) {
    horde.begin();
    const seen = new Set();
    let nm = 0;
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
      } else {
        const k = dt > 0 ? Math.min(1, dt * 10) : 0, px = e.x, pz = e.z;
        e.x += (c.x - e.x) * k; e.z += (c.z - e.z) * k;
        const mv = Math.hypot(e.x - px, e.z - pz);
        if (mv > 1e-4) e.ry += angleDiff(e.ry, Math.atan2(e.x - px, e.z - pz)) * Math.min(1, dt * 12);
        e.phase += mv * 2.6;
        hvRun(parts, e.phase);
        if (nm < MARK_MAX) { mm.makeTranslation(e.x, 0.06, e.z); marks.setMatrixAt(nm++, mm); }
      }
      parts.root.position.set(e.x, 0, e.z);
      parts.root.rotation.y = e.ry;
      horde.draw(parts);
    }
    for (const [id, e] of people) if (!seen.has(id)) { horde.release(e.parts); people.delete(id); }
    marks.count = nm; marks.instanceMatrix.needsUpdate = true;
    horde.end();
  }
  function clear() {
    for (const e of people.values()) horde.release(e.parts);
    people.clear(); horde.clear(); marks.count = 0;
  }
  return { sync, clear };
}
