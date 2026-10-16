// Debugmenyns hjälplager (0.12.2): sikten (LOS) för alla pjäser och soldater som gröna rutor, och
// hordens gångbara rutnät som blå. Platta instanser strax över marken; byggs om bara när det de visar
// ändras (pjäserna, hindren, banan), inte varje bildruta.
import * as THREE from 'three';

export function createDebugOverlay(scene) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const make = (color, opacity, y, order) => {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false });
    const im = new THREE.InstancedMesh(geo, m, 1);
    im.count = 0; im.frustumCulled = false; im.renderOrder = order; im.userData.y = y; im.visible = false;
    scene.add(im);
    return im;
  };
  let los = make('#6fdc5a', 0.28, 0.12, 20), grid = make('#4aa8e8', 0.22, 0.1, 19);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  let keys = { los: null, grid: null };
  function fill(im, cells, place, scale = 0.92) {
    if (im.instanceMatrix.count < cells.length) {
      const old = im; scene.remove(old); old.dispose();
      const n = new THREE.InstancedMesh(geo, old.material, Math.max(cells.length, 64));
      n.frustumCulled = false; n.renderOrder = old.renderOrder; n.userData.y = old.userData.y; n.visible = old.visible;
      scene.add(n); im = n;
    }
    sc.set(place.size * scale, 1, place.size * scale);
    for (let i = 0; i < cells.length; i++) {
      const c = place.center(cells[i]);
      pos.set(c.x, im.userData.y, c.z);
      im.setMatrixAt(i, m4.compose(pos, q, sc));
    }
    im.count = cells.length; im.instanceMatrix.needsUpdate = true;
    return im;
  }
  function update(sim, { los: showLos = false, grid: showGrid = false } = {}) {
    los.visible = showLos && !!sim; grid.visible = showGrid && !!sim;
    if (!sim) return;
    const p = sim.place;
    if (showLos) {
      const k = sim.map.id + '|' + sim.guns.map(g => g.id + ':' + g.cell + (g.squad ? ':' + g.soldiers.map(s => s.cell).join('.') : '')).join(',');
      if (k !== keys.los) {
        keys.los = k;
        const set = new Set();
        for (const g of sim.guns) {
          if (g.squad) { for (const s of g.soldiers) for (const c of s.sight.keys) set.add(c); }
          else for (const c of g.sight?.keys ?? []) set.add(c);
        }
        los = fill(los, [...set], p);
      }
    }
    if (showGrid) {
      const k = sim.map.id + '|' + Object.keys(sim.obstacles).join(',');
      if (k !== keys.grid) {
        keys.grid = k;
        const cells = [];
        for (const c of p.walkKeys ?? []) if (!sim.obstacles[c]) cells.push(c);
        grid = fill(grid, cells, p, 0.7);
      }
    }
  }
  return { update, reset: () => { keys = { los: null, grid: null }; } };
}
