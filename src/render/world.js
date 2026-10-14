// Mark, väg, grus, rekvisita och damm. Rekvisita byggs ur map.props.
import * as THREE from 'three';
import { rnd, pick, mat, mesh, box, geo, canvasTex, speckle, PALETTE as P } from './kit.js';

let updateFn = () => {};
export function updateWorld(dt, time) { updateFn(dt, time); }

function car(p) {
  const g = new THREE.Group();
  const burnt = !!p.burnt;
  const b = mat(p.color, { roughness: burnt ? 1 : 0.7, metalness: burnt ? 0 : 0.25 });
  g.add(box(4.2, 0.9, 1.9, b, 0, 0.75, 0));
  g.add(box(2.2, 0.75, 1.75, b, -0.2, 1.55, 0));
  g.add(box(2.0, 0.55, 1.8, mat(P.carGlass, { roughness: 0.3, metalness: 0.4 }), -0.2, 1.55, 0));
  for (const [wx, wz] of [[-1.35, 0.95], [1.35, 0.95], [-1.35, -0.95], [1.35, -0.95]]) {
    const w = mesh(geo('cylinder', 0.42, 0.42, 0.3, 10), mat(P.tire), wx, 0.42, wz);
    w.rotation.x = Math.PI / 2; g.add(w);
  }
  if (burnt) g.children[0].scale.y = 0.85;
  g.position.set(p.x, burnt ? -0.12 : 0, p.z); g.rotation.set(0, p.ry, burnt ? 0.05 : 0);
  return g;
}

function jersey(p) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.55, 0); shape.lineTo(0.55, 0); shape.lineTo(0.3, 0.35); shape.lineTo(0.18, 1.05);
  shape.lineTo(-0.18, 1.05); shape.lineTo(-0.3, 0.35); shape.lineTo(-0.55, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
  geo.translate(0, 0, -1.5);
  g.add(mesh(geo, mat(P.concrete)));
  g.position.set(p.x, 0, p.z); g.rotation.y = p.ry;
  return g;
}

function barrel(p) {
  const b = mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12), mat(p.color ?? P.barrel, { roughness: 0.8, metalness: 0.2 }), p.x, p.tipped ? 0.45 : 0.6, p.z);
  if (p.tipped) b.rotation.set(Math.PI / 2, 0, rnd(0, 3));
  return b;
}

function deadTree(p) {
  const h = p.h;
  const g = new THREE.Group(); const bark = mat(P.bark);
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.32, h, 6), bark, 0, h / 2, 0));
  for (let i = 0; i < 5; i++) {
    const l = rnd(1, 2.4);
    const br = mesh(new THREE.CylinderGeometry(0.04, 0.1, l, 5), bark, 0, h * rnd(0.45, 0.95), 0);
    br.rotation.set(rnd(-1.1, 1.1), rnd(0, 6), rnd(-1.1, 1.1));
    br.translateY(l / 2); g.add(br);
  }
  g.position.set(p.x, 0, p.z);
  return g;
}

// telefonstolpar längs vägen, med hängande ledningar
function poles(p) {
  const g = new THREE.Group();
  const tops = [];
  for (let x = p.x0; x <= p.x1; x += p.step) {
    const pole = mesh(new THREE.CylinderGeometry(0.13, 0.17, 7, 6), mat(P.pole), x, 3.5, p.z);
    pole.rotation.z = rnd(-0.06, 0.06); g.add(pole);
    g.add(box(1.6, 0.12, 0.12, mat(P.pole), x, 6.6, p.z));
    tops.push(new THREE.Vector3(x, 6.55, p.z));
  }
  for (let i = 0; i < tops.length - 1; i++) {
    const a = tops[i], b = tops[i + 1], pts = [];
    for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y - Math.sin(t * Math.PI) * 0.9, a.z)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: P.wire })));
  }
  return g;
}

// raserat hus
function ruin(p) {
  const g = new THREE.Group(), wall = mat(P.wall), dark = mat(P.rubble);
  g.add(box(8, 3.2, 0.4, wall, 0, 1.6, -3));
  g.add(box(0.4, 2.4, 6, wall, -4, 1.2, 0));
  g.add(box(3.5, 1.4, 0.4, wall, -2.2, 0.7, 3));
  g.add(box(0.4, 3.8, 2.5, wall, 4, 1.9, -1.8));
  g.add(box(8, 0.2, 6, dark, 0, 0.1, 0));
  for (let i = 0; i < 14; i++) {
    const r = mesh(geo('box', 1, 1, 1), pick([wall, dark]), rnd(-3, 4), 0.25, rnd(-2, 3.5));
    r.scale.set(rnd(0.3, 1), rnd(0.2, 0.5), rnd(0.3, 0.8));
    r.rotation.set(rnd(0, 1), rnd(0, 3), rnd(0, 1)); g.add(r);
  }
  g.position.set(p.x, 0, p.z); g.rotation.y = p.ry;
  return g;
}

const BUILDERS = { car, jersey, barrel, tree: deadTree, poles, ruin };

// Markens och vägens texturer, målade på canvas.
export function dirtTexture() {
  return canvasTex(512, (g, s) => {
    g.fillStyle = P.dirt; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      const x = Math.random() * s, y = Math.random() * s, r = rnd(30, 110);
      g.save(); g.translate(x, y); g.scale(r, r * rnd(0.5, 1));
      grd.addColorStop(0, pick(['rgba(70,58,40,0.16)', 'rgba(150,135,100,0.18)', 'rgba(95,100,70,0.14)']));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore();
    }
    speckle(g, s, 5000, P.dirtSpeck, 2.2);
    g.strokeStyle = 'rgba(50,40,28,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      let x = Math.random() * s, y = Math.random() * s; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += rnd(-18, 18); y += rnd(-18, 18); g.lineTo(x, y); }
      g.stroke();
    }
  }, 7);
}

export function asphaltTexture() {
  return canvasTex(512, (g, s) => {
    g.fillStyle = P.asphalt; g.fillRect(0, 0, s, s);
    speckle(g, s, 7000, P.asphaltSpeck, 1.6);
    g.strokeStyle = 'rgba(20,18,14,0.6)'; g.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      let x = Math.random() * s, y = Math.random() * s; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += rnd(-30, 30); y += rnd(-10, 10); g.lineTo(x, y); }
      g.stroke();
    }
    // blekt mittlinje
    g.fillStyle = 'rgba(205,170,80,0.55)';
    for (let x = 0; x < s; x += 128) g.fillRect(x + 10, s / 2 - 5, 70, 10);
    speckle(g, s, 600, [P.asphalt], 3);
  });
}

export function buildWorld(scene, map) {
  // ---------- mark ----------
  const dirt = dirtTexture();
  const ground = mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: dirt, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
  scene.add(ground);

  const asphalt = asphaltTexture();
  asphalt.repeat.set(16, 1);
  const road = mesh(new THREE.PlaneGeometry(160, 9), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2; road.position.y = 0.02; road.castShadow = false;
  scene.add(road);

  // grus i vägkanten: en InstancedMesh per färg (tre anrop i stället för 260)
  const GRAVEL_N = 260;
  const stones = P.gravel.map(() => []);
  const tmp = new THREE.Object3D();
  for (let i = 0; i < GRAVEL_N; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    tmp.position.set(rnd(-70, 70), 0.05, side * rnd(4.4, 6.5));
    tmp.scale.setScalar(rnd(0.08, 0.28)); tmp.rotation.set(rnd(0, 3), rnd(0, 3), 0);
    tmp.updateMatrix();
    stones[Math.floor(Math.random() * stones.length)].push(tmp.matrix.clone());
  }
  P.gravel.forEach((color, c) => {
    const list = stones[c];
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo('dodeca', 1, 0), mat(color), list.length);
    list.forEach((m4, i) => im.setMatrixAt(i, m4));
    im.castShadow = false; im.receiveShadow = true;
    im.computeBoundingSphere();
    scene.add(im);
  });

  // ---------- rekvisita ur data ----------
  for (const p of map.props) {
    const build = BUILDERS[p.kind];
    if (build) scene.add(build(p));
  }

  // ---------- damm i luften ----------
  const dustN = 500, dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = rnd(-50, 70); dustPos[i * 3 + 1] = rnd(0.2, 9); dustPos[i * 3 + 2] = rnd(-40, 40); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustTex = canvasTex(32, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.35, map: dustTex, color: P.dust, transparent: true, opacity: 0.45, depthWrite: false })));

  const update = (dt, time = 0) => {
    for (let i = 0; i < dustN; i++) {
      dustPos[i * 3] += dt * 0.8; dustPos[i * 3 + 1] += Math.sin(time + i) * dt * 0.05;
      if (dustPos[i * 3] > 70) dustPos[i * 3] = -50;
    }
    dustGeo.attributes.position.needsUpdate = true;
  };
  updateFn = update;
  return { ground, update };
}
