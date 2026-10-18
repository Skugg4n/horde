// Scenen för kartor ur scripts/osm-to-map.mjs (Björnlunda först): målad mark (skarp canvas för spelytan, grov för
// omgivningen), allt som står i en batch (instansat: varje geometri och materialsort är en InstancedMesh), och
// omgivningen i diset i en andra batch med diset inbakat i materialet och dimskivan över (samma dis som Mölnbo,
// molnbo-world.js). Byggnadernas modeller väljs efter kind: de vanliga här, landmärkena från opts.kit.
// Kartdata © OpenStreetMap contributors (ODbL).
import * as THREE from 'three';
import { mesh, PALETTE } from './kit.js';
import { GP, UNIT, createBatch, frame, seeded, villa, lamp, curb, car, spruce, pine, birch, hedge, fence, mailbox, playground } from './gnesta-kit.js';
import { MP, track, catenaryPortal, wires, meshFence } from './molnbo-kit.js';
import { farmhouse, barn, hayBale } from './e4-kit.js';
import { fogSheet } from './gnesta-ghost.js';
import { pattern } from './gnesta-world.js';
import { apartment } from './molnbo-kit.js';
import { rowBlock, commercial, industrial, shedK, fruitTree } from './bjornlunda-kit.js';
import { distPolyline, inPoly } from '../data/osm-map.js';

const HAZE = new THREE.Color(PALETTE.haze);
const REACH = 130;     // så långt ut i diset (meter utanför spelytan) det ritas något som står
const NEAR = 22;       // inom så många meter utanför spelytan hör sakerna till den skarpa batchen
const outsideD = (c, x, z) => Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1));

// Material med diset inbakat (samma kurva som dimskivan), som molnbo-world.js.
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
  m.customProgramCacheKey = () => 'osm-far';
  return m;
}

// ---------- marken ----------
function paintLand(map, { bounds, ppm, fadeEdges = false, detail = true }) {
  const { x0, x1, z0, z1 } = bounds;
  const W = Math.round((x1 - x0) * ppm), H = Math.round((z1 - z0) * ppm);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const X = x => (x - x0) * ppm, Z = z => (z - z0) * ppm;
  const pat = cv => { const p = g.createPattern(cv, 'repeat'); const s = ppm / 14; p.setTransform(new DOMMatrix().scaleSelf(s, s)); return p; };
  const furrows = (gg, s) => { gg.strokeStyle = 'rgba(70,60,35,0.22)'; gg.lineWidth = 2; for (let y = 0; y < s; y += 9) { gg.beginPath(); gg.moveTo(0, y); gg.lineTo(s, y + 3); gg.stroke(); } };
  const P = {
    grass: pat(pattern(256, GP.grass, ['#55602f', '#7b8549', '#5d6835', '#868a52', '#4a5429'], 2600, 1.6)),
    lawn: pat(pattern(256, GP.lawnMown, ['#66733f', '#7d8a50', '#6a7843'], 1600, 1.3)),
    field: pat(pattern(256, GP.grassDry, ['#6f6e40', '#8c8a56', '#646436', '#9a9160'], 2600, 1.6, furrows)),
    forest: pat(pattern(256, GP.forestFloor, ['#2f3524', '#4d5338', '#5a4a33', '#353d28', '#6b5a3c'], 3200, 2.0)),
    gravel: pat(pattern(128, GP.gravel, ['#7d7158', '#b0a283', '#8a7d62', '#6a604c', '#c2b597'], 2200, 1.1)),
    yard: pat(pattern(128, GP.dirtRoad, ['#6e6148', '#9c8c6c', '#5e5340', '#a89878'], 1800, 1.4)),
    ballast: pat(pattern(128, MP.ballast, ['#5a544b', '#8a8173', '#4d4740', '#9a9183'], 3000, 1.0)),
    asphalt: pat(pattern(256, GP.asphalt, ['#2d2a25', '#5a554b', '#3a3630', '#6b6456'], 6000, 1.2)),
    sand: pat(pattern(64, GP.sand, ['#a89870', '#d0c19a'], 300, 1)),
    pitch: '#6f8044',
  };
  const poly = (pts, fill, blur = 0) => {
    g.save(); if (blur) g.filter = `blur(${blur}px)`;
    g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath();
    g.fillStyle = fill; g.fill(); g.restore();
  };
  const line = (pts, width, stroke, { cap = 'round', dash = null, alpha = 1, blur = 0 } = {}) => {
    g.save(); if (blur) g.filter = `blur(${blur}px)`; g.globalAlpha = alpha; g.lineCap = cap; g.lineJoin = 'round';
    if (dash) g.setLineDash(dash.map(d => d * ppm));
    g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.lineWidth = width * ppm; g.strokeStyle = stroke; g.stroke(); g.restore();
  };
  g.fillStyle = P.grass; g.fillRect(0, 0, W, H);
  const r = seeded(53);
  for (let i = 0; i < 120; i++) {
    const x = r() * W, y = r() * H, rad = r.range(30, 200) * ppm / 10;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r.pick(['rgba(120,115,70,0.22)', 'rgba(60,70,35,0.22)', 'rgba(140,130,90,0.16)']));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const G = map.ground;
  for (const p of G.field) poly(p, P.field, 4);
  for (const p of G.yard) poly(p, P.yard, 2);
  for (const p of G.forest) poly(p, P.forest, 8);
  for (const p of G.lawn) poly(p, P.lawn, 2);
  for (const p of G.pitch) poly(p, P.pitch, 1);
  for (const p of G.sand) poly(p, P.sand, 2);
  for (const p of G.gravel) poly(p, P.gravel, 1);
  for (const p of G.paved) poly(p, P.asphalt, 1);
  // tomterna: klippt gräs runt villorna
  if (detail) for (const h of map.buildings) {
    if (h.kind !== 'villa') continue;
    const cs = Math.cos(h.ry), sn = Math.sin(h.ry), pw = h.w / 2 + 4, pd = h.d / 2 + 4;
    poly([[-pw, -pd], [pw, -pd], [pw, pd], [-pw, pd]].map(([lx, lz]) => [h.x + lx * cs + lz * sn, h.z - lx * sn + lz * cs]), P.lawn, 2);
  }
  // järnvägen: makadam, mörkare under spåren
  if (map.rail) {
    const R = map.rail;
    line(R.pts, R.half * 2 - 2, P.ballast, { cap: 'butt' });
    line(R.pts, R.half * 2 + 1, 'rgba(60,55,45,0.25)', { cap: 'butt', blur: 3 });
    for (const s of R.sidings) line(s, 4, P.ballast);
  }
  // vägarna: grus först, asfalt sist, mörkare kant under
  const order = { gravel: 0, asphalt: 1 };
  const roads = map.roads.filter(rd => rd.paint !== false).sort((a, b) => order[a.surface] - order[b.surface] || (a.cls < b.cls ? 1 : -1));
  for (const rd of roads) if (rd.surface === 'asphalt') line(rd.line, rd.width + 0.5, '#8d887a'); else line(rd.line, rd.width + 1.2, GP.gravelDark, { blur: 2, alpha: 0.5 });
  for (const rd of roads) line(rd.line, rd.width, rd.surface === 'asphalt' ? P.asphalt : P.gravel);
  // mittlinje, och kantlinjer på riksvägen (läses som den större vägen)
  for (const rd of map.roads.filter(x => x.center)) line(rd.line, 0.14, 'rgba(225,218,200,0.5)', { dash: [3, 6], cap: 'butt' });
  for (const rd of map.roads.filter(x => x.cls === 'A')) for (const side of [-1, 1]) line(offsetLine(rd.line, side * (rd.width / 2 - 0.35)), 0.14, 'rgba(225,218,200,0.55)', { cap: 'butt' });
  if (fadeEdges) {
    const F = 18 * ppm;
    g.globalCompositeOperation = 'destination-out';
    const edge = (x, y, w, h, gx0, gy0, gx1, gy1) => { const gr = g.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
    edge(0, 0, W, F, 0, 0, 0, F); edge(0, H - F, W, F, 0, H, 0, H - F); edge(0, 0, F, H, 0, 0, F, 0); edge(W - F, 0, F, H, W, 0, W - F, 0);
    g.globalCompositeOperation = 'source-over';
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
function offsetLine(pts, off) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] + (b[1] - a[1]) / L * off, p[1] - (b[0] - a[0]) / L * off];
  });
}

// ---------- hela scenen ----------
// opts.kit: { kind: (batch, M, o) => skyltar[] | void } för landmärkena.
export function buildOsmWorld(scene, map, opts = {}) {
  const sur = map.surroundings, crisp = sur.crisp, EXT = sur.extent;
  const gb = map.ground.bounds;
  const ground = mesh(new THREE.PlaneGeometry(gb.x1 - gb.x0, gb.z1 - gb.z0), new THREE.MeshStandardMaterial({ map: paintLand(map, { bounds: gb, ppm: map.ground.ppm, fadeEdges: true }), roughness: 1, transparent: true }));
  ground.rotation.x = -Math.PI / 2; ground.position.set((gb.x0 + gb.x1) / 2, 0, (gb.z0 + gb.z1) / 2); ground.castShadow = false;
  scene.add(ground);
  const outer = mesh(new THREE.PlaneGeometry(EXT.x1 - EXT.x0, EXT.z1 - EXT.z0), new THREE.MeshStandardMaterial({ map: paintLand(map, { bounds: EXT, ppm: 2.5, detail: false }), roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.set((EXT.x0 + EXT.x1) / 2, -0.04, (EXT.z0 + EXT.z1) / 2); outer.castShadow = false; outer.receiveShadow = false;
  scene.add(outer);
  const beyond = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: HAZE }));
  beyond.rotation.x = -Math.PI / 2; beyond.position.y = -0.1; scene.add(beyond);

  const b = createBatch(), fb = createBatch(), r = seeded(1953);
  const signs = new THREE.Group(); signs.name = 'osm-signs'; scene.add(signs);
  const addSigns = arr => { if (arr) for (const s of arr) signs.add(s); };
  const inC = (x, z, pad = 0) => x >= crisp.x0 - pad && x <= crisp.x1 + pad && z >= crisp.z0 - pad && z <= crisp.z1 + pad;
  const pickB = (x, z) => (outsideD(crisp, x, z) < NEAR ? b : fb);
  const reach = (x, z) => outsideD(crisp, x, z) <= REACH;
  const roads = map.roads;
  const rail = map.rail;
  const railD = (x, z) => (rail ? distPolyline(x, z, rail.pts) : Infinity);

  // ---------- järnvägen ----------
  if (rail) {
    const crossAt = (map.props ?? []).filter(p => p.kind === 'levelCrossing').map(p => p.at);
    const roadOver = (x, z) => roads.some(rd => distPolyline(x, z, rd.line) < rd.width / 2 + 1.2);
    const portals = [];
    let acc = 0, nextPortal = 15;
    for (let i = 1; i < rail.pts.length; i++) {
      const [ax, az] = rail.pts[i - 1], [bx, bz] = rail.pts[i], L = Math.hypot(bx - ax, bz - az);
      const ry = Math.atan2(-(bz - az), bx - ax), M = frame(null, ax, 0, az, ry);
      for (let u0 = 0; u0 < L; u0 += 20) {
        const u1 = Math.min(L, u0 + 20), mx = ax + (bx - ax) * (u0 + u1) / 2 / L, mz = az + (bz - az) * (u0 + u1) / 2 / L;
        if (!reach(mx, mz)) continue;
        const bb = pickB(mx, mz);
        for (const v of rail.tracks) track(bb, M, u0, u1, v, rail.gauge);
        // staketen, utom där en väg går över
        for (let s = u0; s < u1; s += 4) {
          const s1 = Math.min(u1, s + 4), sx = ax + (bx - ax) * (s + s1) / 2 / L, sz = az + (bz - az) * (s + s1) / 2 / L;
          if (roadOver(sx, sz) || crossAt.some(([cx, cz]) => Math.hypot(cx - sx, cz - sz) < 7)) continue;
          for (const v of [-(rail.half - 0.3), rail.half - 0.3]) meshFence(bb, M, s, s1, v, 1.4);
        }
      }
      while (nextPortal < acc + L) {
        const u = nextPortal - acc, x = ax + (bx - ax) * u / L, z = az + (bz - az) * u / L;
        if (reach(x, z) && !roadOver(x, z)) { catenaryPortal(pickB(x, z), M, u, [-4.6, 4.6]); portals.push({ x, z, ry, near: outsideD(crisp, x, z) < 70 }); }
        else portals.push(null);
        nextPortal += 34;
      }
      acc += L;
    }
    // linorna mellan stolparna (kontakttråd och bärlina över varje spår)
    const pairs = [];
    for (let i = 1; i < portals.length; i++) {
      const p = portals[i - 1], q = portals[i];
      if (!p || !q || !p.near || !q.near) continue;
      for (const v of rail.tracks) for (const y of [5.7, 6.9]) {
        const P = [p.x + Math.sin(p.ry) * v, y, p.z + Math.cos(p.ry) * v], Q = [q.x + Math.sin(q.ry) * v, y, q.z + Math.cos(q.ry) * v];
        pairs.push([P, Q]);
      }
    }
    scene.add(wires(new THREE.Matrix4(), pairs));
    // sidospåren vid gamla stationen
    for (const s of rail.sidings) for (let i = 1; i < s.length; i++) {
      const [ax, az] = s[i - 1], [bx, bz] = s[i], L = Math.hypot(bx - ax, bz - az);
      if (!reach((ax + bx) / 2, (az + bz) / 2)) continue;
      track(pickB(ax, az), frame(null, ax, 0, az, Math.atan2(-(bz - az), bx - ax)), 0, L, 0, rail.gauge);
    }
  }

  // ---------- husen ----------
  const BASE = {
    villa: (bb, M, h) => { villa(bb, M, h); },
    shed: (bb, M, h) => shedK(bb, M, h),
    row: (bb, M, h) => rowBlock(bb, M, h),
    apartment: (bb, M, h) => apartment(bb, M, { w: h.w, d: Math.min(h.d, 12) }),
    commercial: (bb, M, h) => commercial(bb, M, h),
    industrial: (bb, M, h) => industrial(bb, M, h),
    farm: (bb, M, h) => farmhouse(bb, M, { w: h.w, d: h.d, color: h.color }),
    barn: (bb, M, h) => barn(bb, M, { w: h.w, d: h.d }),
  };
  const KIT = { ...BASE, ...(opts.kit ?? {}) };
  let houses = 0;
  for (const h of map.buildings) {
    if (!reach(h.x, h.z)) continue;
    const M = frame(null, h.x, 0, h.z, h.ry), bb = pickB(h.x, h.z);
    const f = KIT[h.kind] ?? BASE.villa;
    if (bb === b) b.tag = { kind: 'house', id: h.id };
    addSigns(f(bb, M, h));
    b.tag = null; houses++;
  }

  // ---------- gatan: kantsten, gatlyktor ----------
  const onOther = (x, z, self, pad) => roads.some(o => o !== self && o.cls !== 'E' && distPolyline(x, z, o.line) < o.width / 2 + pad);
  for (const rd of roads) {
    if (rd.curbs) for (const side of [-1, 1]) {
      const pts = offsetLine(rd.line, side * (rd.width / 2 + 0.08));
      for (let i = 1; i < pts.length; i++) {
        const [sx, sz] = pts[i - 1], [ex, ez] = pts[i];
        if (!inC((sx + ex) / 2, (sz + ez) / 2, 8) || onOther((sx + ex) / 2, (sz + ez) / 2, rd, 0.25)) continue;
        curb(b, sx, sz, ex, ez);
      }
    }
    if (!rd.lamps) continue;
    let acc = rd.lamps.step * 0.5;
    for (let i = 1; i < rd.line.length; i++) {
      const [ax, az] = rd.line[i - 1], [bx, bz] = rd.line[i], L = Math.hypot(bx - ax, bz - az);
      for (let s = acc; s < L; s += rd.lamps.step) {
        const dx = (bx - ax) / L, dz = (bz - az) / L, nlx = dz, nlz = -dx, off = rd.width / 2 + 0.75, side = rd.lamps.side;
        const x = ax + dx * s + nlx * off * side, z = az + dz * s + nlz * off * side;
        if (!inC(x, z, 6) || onOther(x, z, rd, 1.4) || map.buildings.some(o => Math.abs(o.x - x) < 14 && Math.abs(o.z - z) < 14 && inRect(o, x, z, 0.6))) continue;
        lamp(b, frame(null, x, 0, z, Math.atan2(nlz * side, -nlx * side)));
      }
      acc = ((acc - L) % rd.lamps.step + rd.lamps.step) % rd.lamps.step;
    }
  }

  // ---------- trädgårdarna ----------
  const G = map.gardens;
  for (const [ax, az, bx, bz, hh] of G.hedges) hedge(pickB(ax, az), ax, az, bx, bz, r, hh);
  for (const [ax, az, bx, bz, kind] of G.fences) fence(pickB(ax, az), ax, az, bx, bz, r, kind === 'picket' ? 'picket' : 'slat');
  for (const [x, z, hh, kind] of G.trees) { const bb = pickB(x, z); if (bb === b) b.tag = { kind: 'tree', x, z }; fruitTree(bb, x, z, hh, kind, r); b.tag = null; }
  for (const [x, z, ry, w, d, color] of G.sheds) shedK(pickB(x, z), frame(null, x, 0, z, ry), { w, d, color });
  for (const [x, z, ry] of G.mailboxes) mailbox(pickB(x, z), frame(null, x, 0, z, ry), 1 + ((r() * 2) | 0), r);

  // ---------- platserna ----------
  for (const p of map.props ?? []) {
    const f = opts.kit?.[p.kind];
    if (!f) continue;
    const M = frame(null, p.at[0], 0, p.at[1], p.ry ?? 0);
    if (p.kind === 'levelCrossing') addSigns(f(b, M, p.road ?? 5, rail?.half ?? 6, rail?.tracks));
    else if (p.kind === 'oldStation') addSigns(f(b, frame(M, 0, 0, 0, p.side < 0 ? Math.PI : 0)));
    else addSigns(f(pickB(...p.at), frame(M, 0, 0, map.roads.find(x => x.id === p.road) ? (map.roads.find(x => x.id === p.road).width / 2 + 2.4) * -1 : 0, Math.PI)));
  }
  // lekplatserna (OSM leisure=playground) inne i spelytan
  for (const p of map.ground.sand) {
    const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cz = p.reduce((s, q) => s + q[1], 0) / p.length;
    if (inC(cx, cz)) playground(b, frame(null, cx, 0, cz, r() * 0.4));
  }
  // parkerade bilar på asfaltsytorna (ICA-parkeringen och de andra), fria från gator och hus
  const blockedCar = (x, z) => roads.some(o => distPolyline(x, z, o.line) < o.width / 2 + 1.6) || map.buildings.some(o => Math.abs(o.x - x) < 30 && Math.abs(o.z - z) < 30 && inRect(o, x, z, 1.4));
  let cars = 0;
  for (const p of map.ground.paved) {
    const xs = p.map(q => q[0]), zs = p.map(q => q[1]);
    if (!inC((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2)) continue;
    for (let z = Math.min(...zs) + 3; z < Math.max(...zs) - 2; z += 5.6) for (let x = Math.min(...xs) + 2; x < Math.max(...xs) - 1; x += 2.7) {
      if (r() > 0.32 || !inPoly(x, z, p) || !inPoly(x + 2.2, z, p) || !inPoly(x - 2.2, z, p) || blockedCar(x, z)) continue;
      b.tag = { kind: 'car', x, z }; car(b, frame(null, x, 0, z, Math.PI / 2 + (r() < 0.5 ? 0 : Math.PI)), GP.car[(r() * GP.car.length) | 0]); b.tag = null; cars++;
    }
  }

  // ---------- skog ----------
  const blocked = (x, z) => roads.some(o => distPolyline(x, z, o.line) < o.width / 2 + 2.5)
    || map.buildings.some(h => Math.abs(h.x - x) < 25 && Math.abs(h.z - z) < 25 && inRect(h, x, z, 2.5)) || railD(x, z) < (rail?.half ?? 0) + 2;
  let trees = 0;
  for (const poly of map.ground.forest) {
    const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
    for (let z = Math.min(...zs); z < Math.max(...zs); z += 3.8) for (let x = Math.min(...xs); x < Math.max(...xs); x += 3.8) {
      const px = x + r.range(-1.5, 1.5), pz = z + r.range(-1.5, 1.5);
      if (!reach(px, pz) || !inPoly(px, pz, poly) || blocked(px, pz)) continue;
      const o = outsideD(crisp, px, pz), bb = o < 6 ? b : fb, k = r(), hgt = r.range(9, 15);
      if (bb === b) b.tag = { kind: 'tree', x: px, z: pz };
      if (k < 0.45) spruce(bb, px, pz, hgt, r); else if (k < 0.75) pine(bb, px, pz, hgt, r); else birch(bb, px, pz, hgt * 0.85, r);
      b.tag = null; trees++;
    }
  }
  // balar på åkrarna i diset
  for (const p of map.ground.field) {
    const xs = p.map(q => q[0]), zs = p.map(q => q[1]);
    for (let i = 0; i < 5; i++) {
      const x = r.range(Math.min(...xs), Math.max(...xs)), z = r.range(Math.min(...zs), Math.max(...zs));
      if (inPoly(x, z, p) && !inC(x, z, 4) && reach(x, z) && !blocked(x, z)) hayBale(fb, x, z, r() * 3);
    }
  }

  // ---------- ut i scenen ----------
  const meshes = b.flush(scene);
  const farGroup = new THREE.Group(); farGroup.name = 'osm-far';
  const farMeshes = fb.flush(farGroup);
  const mats = new Map();
  for (const m of farMeshes) {
    const key = m.material.uuid;
    if (!mats.has(key)) mats.set(key, hazed(m.material, crisp, sur.haze));
    m.material = mats.get(key); m.castShadow = false; m.receiveShadow = false;
  }
  farGroup.add(fogSheet(crisp, sur.fade, EXT, sur.haze));
  scene.add(farGroup);
  return {
    ground, update() {},
    stats: { instancedMeshes: meshes.length + farMeshes.length, instances: meshes.reduce((n, m) => n + m.count, 0) + farMeshes.reduce((n, m) => n + m.count, 0), houses, trees, cars, signs: signs.children.length },
  };
}

function inRect(h, x, z, pad = 0) {
  const dx = x - h.x, dz = z - h.z, c = Math.cos(h.ry), s = Math.sin(h.ry);
  return Math.abs(dx * c - dz * s) <= h.w / 2 + pad && Math.abs(dx * s + dz * c) <= h.d / 2 + pad;
}

// Skisserna (R): ingångarna, vägen till basen genom rutnätet, basen och försvarslägena. Bara bild.
export function sketchOverlay(map, gridPath) {
  const grp = new THREE.Group(); grp.name = 'sketch';
  const g = map.grid, sk = map.sketch;
  const disc = (x, z, rad, color, y = 0.35) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 9; grp.add(m);
  };
  // band på marken (en linje i WebGL är en pixel bred)
  const poly = (pts, color, y = 0.45, w = 1.1) => {
    const pos = [];
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * w / 2, nz = (bx - ax) / L * w / 2;
      pos.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide, fog: false }));
    m.renderOrder = 10; grp.add(m);
  };
  const COLORS = ['#e0603c', '#d8b23a', '#c45ad0', '#4ab0d8', '#7fd06a'];
  const routes = [];
  sk.spawns.forEach((s, i) => {
    const c = COLORS[i % COLORS.length];
    const sc = g.spawns.find(q => q.id === s.id);
    const path = sc && g.base ? gridPath(g, sc.cell, g.base) : null;
    if (path) poly(path.map(([ci, cj]) => g.center(ci, cj)), c);
    if (s.field) { poly([s.field, s.at], c); disc(...s.field, 2.2, c); }
    disc(...s.at, 2.6, c);
    routes.push({ id: s.id, cells: path?.length ?? 0, metres: path ? Math.round(path.length * g.cellSize) : null });
  });
  if (sk.base) { disc(...sk.base.at, 4, '#b5532a'); }
  const DC = { sniper: '#e9dfc9', 'squad-house': '#7fd06a', mg: '#d8b23a', block: '#8a8c88', 'base-alt': '#b5532a' };
  for (const d of sk.defence) disc(...d.at, 1.6, DC[d.kind] ?? '#ffffff', 0.4);
  grp.visible = false;
  return { group: grp, routes };
}
