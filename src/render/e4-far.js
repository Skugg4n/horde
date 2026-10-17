// Omgivningen runt E4 vid Lästringe (0.16.3, H230): Sörmland fortsätter in i diset i stället för en suddig
// vägg. Bara att se på, inget går att klicka, gå eller bygga på. Billigt:
//   - marken: en canvas över hela utsträckningen (4 px/m), samma målning som spelytan under dess kanter
//   - allt som står (skog, gårdar, hus, hällar, kraftledningens stolpar, mitträcket, balar, virke): en egen
//     batch i en färg per instans och ett material per geometri (några få anrop), utan skuggor, med diset
//     inbakat i shadern efter avståndet från den skarpa ytan
//   - linorna: ett enda LineSegments
//   - dimskivan över marken med samma kurva (gnesta-ghost.js fogSheet)
// Data: src/data/e4-lastringe.js FAR och SURROUNDINGS.haze.
import * as THREE from 'three';
import { mesh, PALETTE } from './kit.js';
import { GP, createBatch, frame, seeded, spruce, pine, birch } from './gnesta-kit.js';
import { EP, guardRail, boulder, wreck, farmhouse, barn, shed, hayBale, timberStack, pylon, PYLON_ATTACH, PYLON_H } from './e4-kit.js';
import { fogSheet } from './gnesta-ghost.js';
import { distPolyline, inPoly } from '../data/gnesta.js';
import { offsetLine } from '../data/e4-lastringe.js';

const HAZE = new THREE.Color(PALETTE.haze);
// Hur långt ut (meter utanför den skarpa ytan) det ritas något som står. Längst ut, med kameran i ett hörn
// av panoreringen och längst utzoomad, syns marken ungefär 105 m ut i skärmens hörn.
const REACH = 125;

const outside = (c, x, z) => Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1));
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Material med diset inbakat: blandas mot diset efter avståndet från den skarpa ytan (samma kurva som
// dimskivan över marken), och lite avmättat. Klonas ur batchens material så att ljuset är detsamma.
function hazed(base, crisp, haze) {
  const m = base.clone();
  m.onBeforeCompile = sh => {
    sh.uniforms.uHazeCol = { value: HAZE };
    sh.uniforms.uCrisp = { value: new THREE.Vector4(crisp.x0, crisp.z0, crisp.x1, crisp.z1) };
    sh.uniforms.uCurve = { value: new THREE.Vector3(haze.start, haze.end, haze.max) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFarW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 fw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fw = instanceMatrix * fw;
        #endif
        vFarW = (modelMatrix * fw).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vFarW;
        uniform vec3 uHazeCol;
        uniform vec4 uCrisp;
        uniform vec3 uCurve;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        vec2 fo = max(max(uCrisp.xy - vFarW.xz, vFarW.xz - uCrisp.zw), vec2(0.0));
        float ff = smoothstep(uCurve.x, uCurve.y, length(fo)) * uCurve.z;
        float fl = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 hz = linearToOutputTexel(vec4(uHazeCol, 1.0)).rgb;
        gl_FragColor.rgb = mix(mix(gl_FragColor.rgb, vec3(fl), 0.35 * ff), hz, ff);`);
  };
  m.customProgramCacheKey = () => 'e4far';
  return m;
}

// Låg frekvens för kullarna: 0..1
function hills(x, z) {
  return 0.5 + 0.25 * Math.sin(x * 0.031 + 1.3) * Math.cos(z * 0.027 - 0.4) + 0.25 * Math.sin((x + z) * 0.017 + 2.1);
}

export function buildE4Far(scene, map, paintLand) {
  const sur = map.surroundings, far = sur.far, crisp = sur.crisp, haze = sur.haze, EXT = sur.extent;
  const group = new THREE.Group(); group.name = 'e4-far';

  // ---------- marken ----------
  const ground = mesh(new THREE.PlaneGeometry(EXT.x1 - EXT.x0, EXT.z1 - EXT.z0),
    new THREE.MeshStandardMaterial({ map: paintLand(map, { bounds: EXT, ppm: 4, far }), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set((EXT.x0 + EXT.x1) / 2, -0.04, (EXT.z0 + EXT.z1) / 2);
  // tar inte emot skuggor: skuggkameran täcker bara spelytan, och utanför den gav den långa falska skuggor
  ground.castShadow = false; ground.receiveShadow = false;
  group.add(ground);
  const beyond = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshBasicMaterial({ color: HAZE }));
  beyond.rotation.x = -Math.PI / 2; beyond.position.y = -0.1;
  group.add(beyond);

  // ---------- vad som är vad ----------
  const gb = map.ground.bounds;
  const nearRoads = map.roads.filter(r => r.paint !== false);
  const roads = [...nearRoads, ...far.roads];
  const roadGap = (x, z) => { let d = Infinity; for (const r of roads) d = Math.min(d, distPolyline(x, z, r.pts) - r.width / 2); return d; };
  const landAt = (x, z) => { for (let i = far.land.length - 1; i >= 0; i--) if (inPoly(x, z, far.land[i].pts)) return far.land[i].kind; return null; };
  const inBox = (x, z) => x > gb.x0 && x < gb.x1 && z > gb.z0 && z < gb.z1;
  const inCrisp = (x, z, m) => x >= crisp.x0 - m && x <= crisp.x1 + m && z >= crisp.z0 - m && z <= crisp.z1 + m;
  const { from: pf, to: pt, corridor } = far.power;
  const powerGap = (x, z) => distPolyline(x, z, [pf, pt]);
  const farmGap = (x, z) => Math.min(...far.farms.map(f => Math.hypot(f.x - x, f.z - z) - 16), ...far.houses.map(([hx, hz]) => Math.hypot(hx - x, hz - z) - 8));
  // skog: på spelytans mark där dess skogsytor ligger, utanför den överallt där inget annat markslag är
  const forestAt = (x, z) => inBox(x, z)
    ? map.ground.forest.some(f => inPoly(x, z, f)) && !inPoly(x, z, map.ground.field) && !inPoly(x, z, map.ground.meadow)
    : !landAt(x, z);

  const b = createBatch();
  // allt i omgivningen i samma material per geometri (färgen per instans räcker på det här avståndet)
  const put = b.put;
  b.put = (g, M, x, y, z, sx, sy, sz, color, kind, ry, rx, rz) => put(g, M, x, y, z, sx, sy, sz, color, 'matte', ry, rx, rz);
  const r = seeded(4242);
  let trees = 0;
  const tree = (x, z, h, edge) => {
    const k = r();
    if (edge && k < 0.35) birch(b, x, z, h * 0.75, r);
    else if (k < 0.6) spruce(b, x, z, h, r);
    else if (k < 0.9) pine(b, x, z, h * 1.05, r);
    else birch(b, x, z, h * 0.8, r);
    trees++;
  };

  // ---------- skogen ----------
  const X0 = Math.max(EXT.x0, crisp.x0 - REACH), X1 = Math.min(EXT.x1, crisp.x1 + REACH);
  const Z0 = Math.max(EXT.z0, crisp.z0 - REACH), Z1 = Math.min(EXT.z1, crisp.z1 + REACH);
  for (let z = Z0; z < Z1; z += 3.3) for (let x = X0; x < X1; x += 3.3) {
    const tx = x + r.range(-1.4, 1.4), tz = z + r.range(-1.4, 1.4);
    if (inCrisp(tx, tz, 6)) continue;
    const out = outside(crisp, tx, tz);
    // glesare längre ut, där diset ändå tar det mesta
    if (out > 50 && r() < Math.min(0.5, (out - 50) / 120)) continue;
    const dr = roadGap(tx, tz);
    if (dr < 4) continue;
    if (farmGap(tx, tz) < 0) continue;
    // kullarna: högre och lägre bestånd; nära vägarna lägre som på spelytan (e4-world.js), så att skogen
    // inte döljer vägen från kameran
    const hk = (0.82 + 0.36 * hills(tx, tz)) * Math.min(1, Math.max(0.42, (dr - 2.5) / 16));
    const pg = powerGap(tx, tz);
    if (pg < corridor) { if (r() < 0.12) birch(b, tx, tz, r.range(2.5, 4.5), r); continue; }
    const land = inBox(tx, tz) ? null : landAt(tx, tz);
    if (land === 'clearcut') {
      // hygget: fröträd (tall) och unga björkar
      const q = r();
      if (q < 0.035) { pine(b, tx, tz, r.range(13, 17), r); trees++; }
      else if (q < 0.12) birch(b, tx, tz, r.range(1.8, 3.5), r);
      continue;
    }
    if (!forestAt(tx, tz)) continue;
    // längre ut glesare men större kronor, så att taket ändå sluter sig
    tree(tx, tz, r.range(10, 16) * hk * (out > 50 ? 1.12 : 1), dr < 9 || pg < corridor + 3);
  }

  // ---------- vallen, diket, hagarna ----------
  // videbuskar och några björkar längs diket
  for (let i = 0; i < 26; i++) {
    const p = far.ditch[Math.floor(r() * far.ditch.length)];
    const x = p[0] + r.range(-2.5, 2.5), z = p[1] + r.range(-2.5, 2.5);
    if (inCrisp(x, z, 6) || powerGap(x, z) < 3) continue;
    birch(b, x, z, r() < 0.7 ? r.range(3, 5.5) : r.range(8, 12), r);
  }
  // ensamma lövträd i hagarna och på åkerholmarna
  for (const l of far.land.filter(l => l.kind === 'pasture')) {
    const xs = l.pts.map(p => p[0]), zs = l.pts.map(p => p[1]);
    for (let i = 0; i < 6; i++) {
      const x = r.range(Math.min(...xs), Math.max(...xs)), z = r.range(Math.min(...zs), Math.max(...zs));
      if (!inPoly(x, z, l.pts) || roadGap(x, z) < 4) continue;
      birch(b, x, z, r.range(9, 14), r);
    }
  }
  for (const [x, z] of far.bales) hayBale(b, x, z, r() * 6);

  // ---------- gårdarna och husen ----------
  for (const f of far.farms) {
    const M = frame(null, f.x, 0, f.z, f.ry);
    farmhouse(b, frame(M, -6, 0, 6, 0), { w: f.house[0], d: f.house[1] });
    barn(b, frame(M, 4, 0, -9, 0), { w: f.barn[0], d: f.barn[1] });
    f.sheds.forEach(([lx, lz, w, d, ry], i) => shed(b, frame(M, lx, 0, lz, ry), { w, d, color: i % 2 ? '#8b8a84' : EP.falu }));
    // vårdträdet och några björkar runt gården
    birch(b, f.x + Math.cos(f.ry) * -14, f.z + Math.sin(f.ry) * 14, 13, r);
    for (let i = 0; i < 4; i++) { const a = r() * 6; birch(b, f.x + Math.cos(a) * 19, f.z + Math.sin(a) * 19, r.range(9, 13), r); }
  }
  for (const [x, z, ry, color] of far.houses) {
    const M = frame(null, x, 0, z, ry);
    farmhouse(b, M, { w: 9, d: 6.5, color, porch: color !== 'white' });
    shed(b, frame(M, 7.5, 0, -5, 0.1), { w: 3.5, d: 3, color: color === 'red' ? EP.falu : '#8b8a84' });
    for (let i = 0; i < 3; i++) { const a = r() * 6; birch(b, x + Math.cos(a) * 9, z + Math.sin(a) * 9, r.range(8, 12), r); }
  }
  for (const [x, z, ry] of far.timber) timberStack(b, frame(null, x, 0, z, ry));

  // ---------- hällarna ----------
  for (const [x, z, s] of far.outcrops) {
    boulder(b, x, z, s, r);
    for (let i = 0; i < 3; i++) { const a = r() * 6; boulder(b, x + Math.cos(a) * s * 1.6, z + Math.sin(a) * s * 1.3, s * r.range(0.4, 0.7), r); }
  }

  // ---------- kraftledningen ----------
  const L = Math.hypot(pt[0] - pf[0], pt[1] - pf[1]), ux = (pt[0] - pf[0]) / L, uz = (pt[1] - pf[1]) / L;
  const towers = [];
  for (let s = 0; s <= L; s += far.power.step) {
    let x = pf[0] + ux * s, z = pf[1] + uz * s;
    // inte på en väg eller en gård: flytta längs ledningen
    for (let k = 0; k < 6 && (roadGap(x, z) < 6 || farmGap(x, z) < 0); k++) { x += ux * 4; z += uz * 4; }
    towers.push([x, z]);
    if (outside(crisp, x, z) < REACH + 30) pylon(b, frame(null, x, 0, z, Math.atan2(ux, uz)));
  }
  const wire = [], wireCol = [], wc = new THREE.Color('#3b3e3e'), c = new THREE.Color();
  const ax = -uz, az = ux;    // tvärs ledningen (bommens x i stolpens ram)
  for (let i = 1; i < towers.length; i++) {
    const [x0, z0] = towers[i - 1], [x1, z1] = towers[i];
    for (const [off, y] of PYLON_ATTACH) {
      // ramen roterad Math.atan2(ux, uz): bommens +x pekar mot (uz, -ux)
      const o = -off;
      const N = 10;
      for (let k = 0; k < N; k++) {
        for (const t of [k / N, (k + 1) / N]) {
          const x = x0 + (x1 - x0) * t + ax * o, z = z0 + (z1 - z0) * t + az * o;
          wire.push(x, y - 2.4 * 4 * t * (1 - t), z);
          const f = smoothstep(haze.start, haze.end, outside(crisp, x, z)) * haze.max;
          c.copy(wc).lerp(HAZE, f); wireCol.push(c.r, c.g, c.b);
        }
      }
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  lg.setAttribute('color', new THREE.Float32BufferAttribute(wireCol, 3));
  const wires = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }));
  group.add(wires);

  // ---------- E4: mitträcket och några bilar till i kön mot Södertälje ----------
  const rail = offsetLine(far.e4, 7.5);
  let run = [];
  const flushRun = () => { if (run.length > 1) guardRail(b, run); run = []; };
  for (const p of rail) {
    const o = outside(crisp, p[0], p[1]);
    if (!inCrisp(p[0], p[1], 20) && o < REACH) run.push(p); else flushRun();
  }
  flushRun();
  const along = (pts, s) => {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1], [x1, z1] = pts[i], l = Math.hypot(x1 - x0, z1 - z0);
      if (acc + l >= s) { const t = (s - acc) / l; return [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, Math.atan2(-(z1 - z0), x1 - x0)]; }
      acc += l;
    }
    return null;
  };
  const e4Len = far.e4.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - far.e4[i - 1][0], p[1] - far.e4[i - 1][1]) : 0), 0);
  // positioner längs E4 (meter från västra änden) och körfältets förskjutning: kön fortsätter österut
  for (const [s, off, dry, col, burnt] of [[395, -1.8, 0.1, 2, false], [404, 1.6, -0.2, 0, false], [418, -1.5, 0.05, 4, false], [433, 2.0, 0.6, 5, true], [455, -1.2, 0.1, 3, false], [120, 15 - 1.5, 0.15, 6, false]]) {
    if (s > e4Len) continue;
    const p = along(off > 7 ? offsetLine(far.e4, 15) : far.e4, s);
    if (!p || inCrisp(p[0], p[1], 8)) continue;
    const [x, z, ry] = p, nx = Math.sin(ry), nz = Math.cos(ry);
    const lo = off > 7 ? off - 15 : off;
    wreck(b, frame(null, x + nx * lo, 0, z + nz * lo, ry + dry), GP.car[col % GP.car.length], { burnt });
  }

  // ---------- ut i scenen ----------
  const meshes = b.flush(group);
  const mats = new Map();
  for (const m of meshes) {
    const key = m.material.uuid;
    if (!mats.has(key)) mats.set(key, hazed(m.material, crisp, haze));
    m.material = mats.get(key);
    m.castShadow = false; m.receiveShadow = false;
  }
  group.add(fogSheet(crisp, sur.fade, EXT, haze));
  scene.add(group);
  return { group, stats: { trees, instancedMeshes: meshes.length, instances: meshes.reduce((n, m) => n + m.count, 0), towers: towers.length, calls: meshes.length + 4 } };
}
