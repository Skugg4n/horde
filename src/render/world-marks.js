// Markeringar i världen (0.19.2, speltestet av 0.19.1): en pulserande kontur (perrongen och trapptornen när
// pendeltåget signalerar), en röd ring som vidgar sig där horden tog sig förbi (läckan) och en pil på marken från de
// närmaste enheterna mot perrongen. Ritas ovanpå allt (depthTest av), så att de syns också bakom hus och tåg.
//
//   const marks = createWorldMarks(scene)
//   marks.set(id, { kind: 'outline', polys: [[[x, z], ...]], y, color })   konturer (y: höjd, en per polygon eller ett tal)
//   marks.set(id, { kind: 'ring', x, z, r, y, color })                       en ring som vidgar sig och pulserar
//   marks.set(id, { kind: 'arrow', from: [x, z], to: [x, z], y, color })     en pil på marken
//   marks.clear(id), marks.clearAll(), marks.update(time)
import * as THREE from 'three';

const BAND = 0.9;    // konturens bredd i meter

// Ett band längs polygonens kanter (en fyrhörning per kant och en ruta i varje hörn), platt på höjden y.
function outlineGeo(polys, ys) {
  const pos = [], idx = [];
  const quad = (a, b, c, d) => { const n = pos.length / 3; pos.push(...a, ...b, ...c, ...d); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  polys.forEach((poly, pi) => {
    const y = Array.isArray(ys) ? ys[pi] ?? 0 : ys;
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
      const L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * BAND / 2, nz = (bx - ax) / L * BAND / 2;
      quad([ax + nx, y, az + nz], [bx + nx, y, bz + nz], [bx - nx, y, bz - nz], [ax - nx, y, az - nz]);
      const h = BAND / 2;
      quad([ax - h, y, az - h], [ax + h, y, az - h], [ax + h, y, az + h], [ax - h, y, az + h]);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
function arrowGeo(from, to, y) {
  const [x0, z0] = from, [x1, z1] = to, L = Math.hypot(x1 - x0, z1 - z0) || 1, ux = (x1 - x0) / L, uz = (z1 - z0) / L, nx = -uz, nz = ux;
  const head = Math.min(3.2, L * 0.4), w = 0.55, hw = 1.5, sx = x1 - ux * head, sz = z1 - uz * head;
  const pos = [
    x0 + nx * w, y, z0 + nz * w, sx + nx * w, y, sz + nz * w, sx - nx * w, y, sz - nz * w, x0 - nx * w, y, z0 - nz * w,
    sx + nx * hw, y, sz + nz * hw, x1, y, z1, sx - nx * hw, y, sz - nz * hw,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6]);
  return g;
}

export function createWorldMarks(scene) {
  const group = new THREE.Group();
  group.name = 'world-marks';
  scene.add(group);
  const items = new Map();
  const material = color => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  function clear(id) {
    const it = items.get(id);
    if (!it) return;
    group.remove(it.mesh); it.mesh.geometry.dispose(); it.mesh.material.dispose();
    items.delete(id);
  }
  function set(id, spec, time = 0) {
    clear(id);
    const color = spec.color ?? '#e8492c';
    let geo;
    if (spec.kind === 'outline') geo = outlineGeo(spec.polys, spec.y ?? 0.1);
    else if (spec.kind === 'ring') { geo = new THREE.RingGeometry(0.82, 1, 48); geo.rotateX(-Math.PI / 2); }
    else if (spec.kind === 'arrow') geo = arrowGeo(spec.from, spec.to, spec.y ?? 0.25);
    else return;
    const mesh = new THREE.Mesh(geo, material(color));
    mesh.renderOrder = 9; mesh.frustumCulled = false;
    if (spec.kind === 'ring') mesh.position.set(spec.x, spec.y ?? 0.2, spec.z);
    group.add(mesh);
    items.set(id, { spec, mesh, t0: time });
  }
  // Pulsen: konturen och pilen andas, ringen vidgar sig från halva radien till hela och tonar ut, om och om igen.
  function update(time) {
    for (const it of items.values()) {
      const t = time - it.t0, m = it.mesh;
      if (it.spec.kind === 'ring') {
        const k = (t % 1.1) / 1.1, r = (it.spec.r ?? 5) * (0.45 + 0.75 * k);
        m.scale.set(r, 1, r);
        m.material.opacity = 0.95 * (1 - k * k);
      } else m.material.opacity = 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.1));
    }
  }
  const has = id => items.has(id);
  function clearAll() { for (const id of [...items.keys()]) clear(id); }
  return { set, clear, clearAll, update, has, group };
}
