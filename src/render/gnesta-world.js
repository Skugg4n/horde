// Gnesta-scenen: målad mark (en canvas), och allt annat i en batch (några tiotal anrop).
import * as THREE from 'three';
import { mat, mesh, canvasTex } from './kit.js';
import {
  GP, createBatch, frame, seeded, villa, preschool, shop, hedge, fence, mailbox, gardenTree, trampoline, furniture,
  car, trailer, lamp, curb, spruce, pine, birch, iceRink, rinkSign, roundaboutIsland, playground, tallLamp, sportHall,
  rowHouse, brickWall, plankFence, parkingLot, forskola, forskolaYard,
} from './gnesta-kit.js';
import { buildSurroundings } from './gnesta-ghost.js';
import { createFortify } from './fortify.js';
import { distPolyline, distPoly, inPoly, w as px2w, FOREST_EDGE } from '../data/gnesta.js';

const PPM_DEFAULT = 14;                  // markens pixlar per meter (en större bana kan ange färre)

// ---------- mönster för marken ----------
function pattern(size, base, specks, n, rMax, extra) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  const r = seeded(size + n);
  for (let i = 0; i < n; i++) {
    g.fillStyle = r.pick(specks); g.globalAlpha = r.range(0.12, 0.5);
    g.beginPath(); g.arc(r() * size, r() * size, r.range(0.4, rMax), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  if (extra) extra(g, size, r);
  return c;
}

function paintGround(map) {
  const { x0, x1, z0, z1 } = map.ground.bounds;
  const PPM = map.ground.ppm ?? PPM_DEFAULT;
  const W = Math.round((x1 - x0) * PPM), H = Math.round((z1 - z0) * PPM);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const X = x => (x - x0) * PPM, Z = z => (z - z0) * PPM;
  const pat = cv => g.createPattern(cv, 'repeat');
  const P = {
    grass: pat(pattern(256, GP.grass, ['#55602f', '#7b8549', '#5d6835', '#868a52', '#4a5429'], 2600, 1.6, (gg, s, r) => {
      gg.strokeStyle = 'rgba(40,50,20,0.25)'; gg.lineWidth = 1;
      for (let i = 0; i < 260; i++) { const x = r() * s, y = r() * s; gg.beginPath(); gg.moveTo(x, y); gg.lineTo(x + r.range(-2, 2), y - r.range(2, 5)); gg.stroke(); }
    })),
    lawn: pat(pattern(256, GP.lawnMown, ['#66733f', '#7d8a50', '#6a7843'], 1600, 1.3)),
    field: pat(pattern(256, GP.grassDry, ['#6f6e40', '#8c8a56', '#646436', '#9a9160'], 2600, 1.6)),
    forest: pat(pattern(256, GP.forestFloor, ['#2f3524', '#4d5338', '#5a4a33', '#353d28', '#6b5a3c'], 3200, 2.0)),
    gravel: pat(pattern(128, GP.gravel, ['#7d7158', '#b0a283', '#8a7d62', '#6a604c', '#c2b597'], 2200, 1.1)),
    dirt: pat(pattern(128, GP.dirtRoad, ['#6e6148', '#9c8c6c', '#5e5340', '#a89878'], 1800, 1.4)),
    asphalt: pat(pattern(256, GP.asphalt, ['#2d2a25', '#5a554b', '#3a3630', '#6b6456'], 6000, 1.2, (gg, s, r) => {
      gg.strokeStyle = 'rgba(20,18,14,0.5)'; gg.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { let x = r() * s, y = r() * s; gg.beginPath(); gg.moveTo(x, y); for (let k = 0; k < 5; k++) { x += r.range(-25, 25); y += r.range(-25, 25); gg.lineTo(x, y); } gg.stroke(); }
    })),
    paving: pat(pattern(64, GP.paving, ['#7a7468', '#a29c8e'], 160, 1, (gg, s) => {
      gg.strokeStyle = 'rgba(60,55,48,0.35)'; gg.lineWidth = 1;
      for (let k = 0; k <= s; k += 8) { gg.beginPath(); gg.moveTo(k, 0); gg.lineTo(k, s); gg.moveTo(0, k); gg.lineTo(s, k); gg.stroke(); }
    })),
    sand: pat(pattern(64, GP.sand, ['#a89870', '#d0c19a'], 300, 1)),
  };
  const poly = (pts, fill, blur = 0) => {
    g.save(); if (blur) g.filter = `blur(${blur}px)`;
    g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.closePath();
    g.fillStyle = fill; g.fill(); g.restore();
  };
  const line = (pts, width, stroke, { cap = 'round', blur = 0, dash = null, alpha = 1 } = {}) => {
    g.save(); if (blur) g.filter = `blur(${blur}px)`;
    g.globalAlpha = alpha; g.lineCap = cap; g.lineJoin = 'round';
    if (dash) g.setLineDash(dash.map(d => d * PPM));
    g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)));
    g.lineWidth = width * PPM; g.strokeStyle = stroke; g.stroke(); g.restore();
  };

  // gräs och fläckar
  g.fillStyle = P.grass; g.fillRect(0, 0, W, H);
  const r = seeded(7);
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H, rad = r.range(40, 220);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r.pick(['rgba(120,115,70,0.22)', 'rgba(60,70,35,0.22)', 'rgba(140,130,90,0.16)']));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  poly(map.ground.field, P.field, 6);
  poly(map.ground.gravelField, P.gravel, 3);
  for (const f of map.ground.forest) poly(f, P.forest, 10);

  // tomter: klippt gräs, uppfarter. Radhusens gårdar likaså.
  for (const p of map.lots.plots) poly(p.corners, P.lawn, 1.5);
  for (const y of map.yards?.yards ?? []) poly(y.front, P.lawn, 1.5);
  for (const p of map.lots.plots) if (p.drive) line([p.drive.a, p.drive.b], p.drive.width, p.drive.surface === 'paving' ? P.paving : P.gravel, { cap: 'butt' });

  // ishallens plan och parkeringen
  const hr = map.iceRink, cs = Math.cos(hr.ry), sn = Math.sin(hr.ry);
  const rinkPt = (lx, lz) => [hr.x + lx * cs + lz * sn, hr.z - lx * sn + lz * cs];
  poly([rinkPt(-hr.len / 2 - 4, -hr.wid / 2 - 4), rinkPt(hr.len / 2 + 13, -hr.wid / 2 - 6), rinkPt(hr.len / 2 + 13, hr.wid / 2 + 7), rinkPt(-hr.len / 2 - 4, hr.wid / 2 + 7)], P.asphalt, 1);
  poly(map.parking.poly, P.asphalt, 1);
  // sporthallens plan: asfalt runt hallen, uppfart från parkeringen
  if (map.sporthall) {
    const sh = map.sporthall, c2 = Math.cos(sh.ry), s2 = Math.sin(sh.ry);
    const hp = (lx, lz) => [sh.x + lx * c2 + lz * s2, sh.z - lx * s2 + lz * c2];
    const L = sh.len / 2 + 5, Wd = sh.wid / 2 + 5;
    poly([hp(-L - 12, -Wd), hp(L, -Wd), hp(L, Wd), hp(-L - 12, Wd)], P.asphalt, 2);
  }

  // vägar: grus och jord först, asfalt sist. Mörkare kant under.
  const order = { dirt: 0, gravel: 1, asphalt: 2 };
  const roads = map.roads.filter(rd => rd.paint !== false).sort((a, b) => order[a.surface] - order[b.surface]);
  for (const rd of roads) {
    if (rd.surface === 'asphalt') line(rd.pts, rd.width + 0.5, '#8d887a');
    else line(rd.pts, rd.width + 1.2, rd.surface === 'dirt' ? '#5e5541' : GP.gravelDark, { blur: 3, alpha: 0.55 });
  }
  // rondellen: asfaltring runt ön
  const R = map.roundabout;
  line([...R.island, R.island[0]], R.ring * 2 + 0.5, '#8d887a');
  for (const rd of roads) line(rd.pts, rd.width, rd.surface === 'asphalt' ? P.asphalt : rd.surface === 'dirt' ? P.dirt : P.gravel);
  line([...R.island, R.island[0]], R.ring * 2, P.asphalt);
  poly(R.island, P.lawn);
  // vändplaner där stickgatorna slutar
  for (const rd of map.roads.filter(x => x.turn || ['spur1', 'spur2', 'spur3'].includes(x.id))) {
    const [ex, ez] = rd.pts[rd.pts.length - 1];
    g.beginPath(); g.arc(X(ex), Z(ez), 3.6 * PPM, 0, 7); g.fillStyle = '#8d887a'; g.fill();
    g.beginPath(); g.arc(X(ex), Z(ez), 3.35 * PPM, 0, 7); g.fillStyle = P.asphalt; g.fill();
  }
  // blekt mittlinje på Sigtunavägen (och Dansutvägen)
  for (const sig of map.roads.filter(x => x.center)) line(sig.pts, 0.14, 'rgba(225,218,200,0.5)', { dash: [3, 6], cap: 'butt' });
  // parkeringsrutor
  g.save(); g.strokeStyle = 'rgba(225,218,200,0.55)'; g.lineWidth = 0.12 * PPM;
  for (const row of map.parking.bays) for (const [x, z] of row.lines) {
    g.beginPath(); g.moveTo(X(x), Z(z - row.depth / 2)); g.lineTo(X(x), Z(z + row.depth / 2)); g.stroke();
  }
  g.restore();
  // lekplatsens sand
  const [px, pz] = map.playground.center;
  g.save(); g.filter = 'blur(2px)'; g.fillStyle = P.sand; g.beginPath(); g.ellipse(X(px + 0.5), Z(pz + 1), 8.5 * PPM, 6.5 * PPM, -0.06, 0, 7); g.fill(); g.restore();

  // Kanterna tonar mot spöklagrets mark, så att den skarpa marken inte slutar i en rak linje.
  if (map.surroundings) {
    const F = 16 * PPM, col = 'rgba(125,130,83,';
    const edge = (x, y, w, h, x0, y0, x1, y1) => {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, col + '1)'); gr.addColorStop(1, col + '0)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    };
    edge(0, 0, W, F, 0, 0, 0, F);
    edge(0, H - F, W, F, 0, H, 0, H - F);
    edge(0, 0, F, H, 0, 0, F, 0);
    edge(W - F, 0, F, H, W, 0, W - F, 0);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

// ---------- hela scenen ----------
export function buildGnesta(scene, map) {
  const { x0, x1, z0, z1 } = map.ground.bounds;

  // mark
  const tex = paintGround(map);
  const ground = mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); ground.castShadow = false;
  scene.add(ground);
  // omgivningen utanför spelytan (spöklagret), eller en enkel mark om banan saknar den
  let ghosts = null;
  if (map.surroundings) ghosts = buildSurroundings(scene, map);
  else {
    const outer = mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: '#5a6236', roughness: 1 }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.03; outer.castShadow = false;
    scene.add(outer);
  }

  const b = createBatch();
  const r = seeded(4711);
  const roads = map.roads;
  const onOtherRoad = (x, z, self, pad = 0.3) => roads.some(o => o !== self && distPolyline(x, z, o.pts) < o.width / 2 + pad)
    || distPoly(x, z, map.roundabout.island) < map.roundabout.ring + pad
    || inPoly(x, z, map.parking.poly);

  // ---------- kantsten och gatlyktor ----------
  for (const rd of roads) {
    if (!rd.curbs) continue;
    for (const side of [-1, 1]) {
      const off = side * (rd.width / 2 + 0.08);
      for (let i = 1; i < rd.pts.length; i++) {
        const [ax, az] = rd.pts[i - 1], [bx, bz] = rd.pts[i];
        const L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L;
        const n = Math.max(1, Math.round(L / 1.2));
        for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n;
          const sx = ax + (bx - ax) * t0 + nx * off, sz = az + (bz - az) * t0 + nz * off;
          const ex = ax + (bx - ax) * t1 + nx * off, ez = az + (bz - az) * t1 + nz * off;
          if (onOtherRoad((sx + ex) / 2, (sz + ez) / 2, rd, 0.25)) continue;
          curb(b, sx, sz, ex, ez);
        }
      }
    }
  }
  for (const rd of roads) {
    if (!rd.lamps) continue;
    let acc = rd.lamps.step * 0.5;
    for (let i = 1; i < rd.pts.length; i++) {
      const [ax, az] = rd.pts[i - 1], [bx, bz] = rd.pts[i];
      const L = Math.hypot(bx - ax, bz - az);
      for (let s = acc; s < L; s += rd.lamps.step) {
        const dx = (bx - ax) / L, dz = (bz - az) / L, nlx = dz, nlz = -dx;
        const off = rd.width / 2 + 0.75, side = rd.lamps.side;
        const x = ax + dx * s + nlx * off * side, z = az + dz * s + nlz * off * side;
        if (x < x0 + 2 || x > x1 - 2 || z < z0 + 2 || z > z1 - 2) continue;
        if (onOtherRoad(x, z, rd, 1.4)) continue;
        const vx = -nlx * side, vz = -nlz * side;
        lamp(b, frame(null, x, 0, z, Math.atan2(-vz, vx)));
      }
      acc = ((acc - L) % rd.lamps.step + rd.lamps.step) % rd.lamps.step;
    }
  }

  // ---------- tomterna ----------
  for (const e of map.lots.edges) {
    if (e.kind === 'none') continue;
    const parts = [];
    if (e.gap) {
      const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]), g0 = Math.max(0, e.gap.t - e.gap.len / 2 / L), g1 = Math.min(1, e.gap.t + e.gap.len / 2 / L);
      const at = t => [e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t];
      if (g0 > 0.02) parts.push([e.a, at(g0)]);
      if (g1 < 0.98) parts.push([at(g1), e.b]);
    } else parts.push([e.a, e.b]);
    // taggarna: fortify.js hugger ner häckar och river staket runt pjäserna
    const fenceTag = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az) || 1; return { kind: 'fence', ax, az, dx: (bx - ax) / L, dz: (bz - az) / L }; };
    for (const [a, c] of parts) {
      b.tag = { kind: 'hedge' };
      if (e.kind === 'hedge' || e.kind === 'hedgeSlat') hedge(b, a[0], a[1], c[0], c[1], r, r.range(1.5, 2.1));
      b.tag = fenceTag(a[0], a[1], c[0], c[1]);
      if (e.kind === 'picket' || e.kind === 'slat') fence(b, a[0], a[1], c[0], c[1], r, e.kind);
      if (e.kind === 'hedgeSlat') {
        // spjälstaket på gatsidan av häcken
        const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz);
        const p = map.lots.plots.find(x => x.id === e.plot);
        let nx = -dz / L, nz = dx / L;
        if (p && (nx * p.f[0] + nz * p.f[1]) < 0) { nx = -nx; nz = -nz; }
        b.tag = fenceTag(a[0] + nx * 0.75, a[1] + nz * 0.75, c[0] + nx * 0.75, c[1] + nz * 0.75);
        fence(b, a[0] + nx * 0.75, a[1] + nz * 0.75, c[0] + nx * 0.75, c[1] + nz * 0.75, r, 'slat');
      }
      b.tag = null;
    }
  }
  const fronts = new Map();
  scene.userData.houseFronts = fronts;
  for (const p of map.lots.plots) {
    const h = p.house;
    if (h) {
      const M = frame(null, h.x, 0, h.z, h.ry);
      const front = h.kind === 'preschool' ? forskola(b, M, { ...h, w: Math.max(h.w, 13), d: Math.max(h.d, 7.5) })
        : h.kind === 'shop' ? shop(b, M, h) : villa(b, M, h);
      // 0.12.0 (H101): dörren och ett fönster i världen, för de vilande smittade (render/dormant.js)
      fronts.set(p.id, { x: h.x, z: h.z, ry: h.ry, ...front });
    }
    for (const x of p.extras) {
      const M = frame(null, x.x, 0, x.z, x.ry);
      b.tag = x.kind === 'car' ? { kind: 'car', x: x.x, z: x.z, ry: x.ry } : x.kind === 'tree' ? { kind: 'tree', x: x.x, z: x.z }
        : x.kind === 'mailbox' || x.kind === 'furniture' || x.kind === 'trailer' ? { kind: 'junk', what: x.kind, x: x.x, z: x.z } : null;
      if (x.kind === 'mailbox') mailbox(b, M, x.n, r);
      else if (x.kind === 'car') car(b, M, GP.car[x.color % GP.car.length]);
      else if (x.kind === 'trailer') trailer(b, M);
      else if (x.kind === 'trampoline') trampoline(b, M);
      else if (x.kind === 'furniture') furniture(b, M, r);
      else if (x.kind === 'tree') gardenTree(b, M, x.h, x.k, r);
      b.tag = null;
    }
  }
  playground(b, frame(null, map.playground.center[0], 0, map.playground.center[1], map.playground.ry));

  // ---------- Gnesta Norr: radhusen, gårdarnas murar och staket, parkeringarna, förskolans gård ----------
  for (const R of map.rows ?? []) {
    b.tag = null;
    rowHouse(b, frame(null, R.x, 0, R.z, R.ry), R);
  }
  for (const w of map.yards?.brick ?? []) { b.tag = { kind: 'junk', what: 'wall', x: (w.a[0] + w.b[0]) / 2, z: (w.a[1] + w.b[1]) / 2 }; brickWall(b, w.a[0], w.a[1], w.b[0], w.b[1], w.h); }
  for (const f of map.yards?.plank ?? []) {
    const L = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]) || 1;
    b.tag = { kind: 'fence', ax: f.a[0], az: f.a[1], dx: (f.b[0] - f.a[0]) / L, dz: (f.b[1] - f.a[1]) / L };
    plankFence(b, f.a[0], f.a[1], f.b[0], f.b[1], f.h);
  }
  b.tag = null;
  for (const L of map.parkingLots ?? []) parkingLot(b, frame(null, L.x, 0, L.z, L.ry), { ...L, rows: L.rows.length });
  if (map.forskolaYard) { const Y = map.forskolaYard; forskolaYard(b, frame(null, Y.center[0], 0, Y.center[1], Y.ry), Y); }

  // ---------- ishallen, rondellen och parkeringen ----------
  const hr = map.iceRink;
  const HM = frame(null, hr.x, 0, hr.z, hr.ry);
  iceRink(b, HM, hr);
  const signG = new THREE.Group(); signG.position.set(hr.x, 0, hr.z); signG.rotation.y = hr.ry;
  const sign = rinkSign(); sign.position.set(hr.len / 2 + 0.08, hr.wallH + 1.25, 0); sign.rotation.y = Math.PI / 2;
  signG.add(sign); scene.add(signG);
  roundaboutIsland(scene, b, map.roundabout);
  // parkerade bilar (parkeringen och vid ishallen): bandata, så att placeringen vet var de står
  for (const c of map.cars ?? []) { b.tag = { kind: 'car', x: c.x, z: c.z, ry: c.ry }; car(b, frame(null, c.x, 0, c.z, c.ry), GP.car[c.color % GP.car.length]); }
  b.tag = null;
  for (const [x, z] of map.parking.poles ?? []) tallLamp(b, frame(null, x, 0, z, 0));
  // sporthallen
  if (map.sporthall) {
    const sh = map.sporthall, c2 = Math.cos(sh.ry), s2 = Math.sin(sh.ry);
    const dx = sh.annex.x - sh.x, dz = sh.annex.z - sh.z;
    const annex = { ...sh.annex, local: [dx * c2 - dz * s2, dx * s2 + dz * c2] };
    sportHall(b, frame(null, sh.x, 0, sh.z, sh.ry), { ...sh, annex });
  }
  // ---------- skog ----------
  const blocked = (x, z) => roads.some(o => distPolyline(x, z, o.pts) < o.width / 2 + 3.2)
    || map.lots.blocks.some(B => inPoly(x, z, B.outer))
    || inPoly(x, z, map.parking.poly) || distPoly(x, z, map.roundabout.island) < 9
    || (map.clearings ?? []).some(poly => inPoly(x, z, poly))
    || Math.hypot(x - hr.x, z - hr.z) < hr.len / 2 + 9
    || (map.sporthall && Math.hypot(x - map.sporthall.x, z - map.sporthall.z) < map.sporthall.len / 2 + 12);
  let trees = 0;
  const crisp = map.surroundings?.crisp;
  map.ground.forest.forEach((poly, fi) => {
    const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
    const gx0 = Math.max(x0 - 6, Math.min(...xs)), gx1 = Math.min(x1 + 6, Math.max(...xs));
    const gz0 = Math.max(z0 - 6, Math.min(...zs)), gz1 = Math.min(z1 + 6, Math.max(...zs));
    const step = 3.3;
    for (let z = gz0; z < gz1; z += step) for (let x = gx0; x < gx1; x += step) {
      const tx = x + r.range(-1.3, 1.3), tz = z + r.range(-1.3, 1.3);
      if (!inPoly(tx, tz, poly) || blocked(tx, tz)) continue;
      // bara skarp skog inne i spelytan; utanför tar diset och spöklagret över
      if (crisp && (tx < crisp.x0 - 6 || tx > crisp.x1 + 6 || tz < crisp.z0 - 6 || tz > crisp.z1 + 6)) continue;
      // lägre träd nära gatorna, så att skogen inte döljer vägen från kameran
      // Ingen skog tätt inpå gatorna, och låga träd närmast: kameran står i sydost, så höga träd
      // söder om gatan skymmer horden.
      const dr = Math.min(...roads.filter(o => o.walk).map(o => distPolyline(tx, tz, o.pts) - o.width / 2));
      if (dr < 4.5) continue;
      const hk = Math.min(1, Math.max(0.38, (dr - 3) / 18));
      const k = r();
      const mix = fi === 2 ? [0.4, 0.75] : [0.55, 0.8];
      // 0.14.2: träden i brynet (där det går att ställa ut, data/gnesta.js FOREST_EDGE) fälls när något
      // ställs ut bredvid dem (fortify.js), som trädgårdsträden
      if (dr < FOREST_EDGE + 1.5) b.tag = { kind: 'tree', x: tx, z: tz };
      if (k < mix[0]) spruce(b, tx, tz, r.range(9, 15) * hk, r);
      else if (k < mix[1]) pine(b, tx, tz, r.range(11, 16) * hk, r);
      else birch(b, tx, tz, r.range(8, 12.5) * hk, r);
      b.tag = null;
      trees++;
    }
  });
  // lövträd vid fältet och i kanterna
  for (const [ppx, ppy, h] of [[495, 345, 8], [655, 300, 7], [662, 420, 6.5], [668, 520, 7], [650, 640, 6], [640, 700, 7.5], [580, 280, 6], [800, 770, 7], [1870, 330, 7], [1885, 470, 6], [1900, 640, 6.5], [1240, 880, 7]]) {
    const [x, z] = px2w(ppx, ppy);
    if (roads.some(o => distPolyline(x, z, o.pts) < o.width / 2 + 2.5) || distPoly(x, z, map.roundabout.island) < map.roundabout.ring + 2.5) continue;
    b.tag = { kind: 'tree', x, z };
    gardenTree(b, frame(null, x, 0, z, r() * 6), h, 2, r); trees++;
    b.tag = null;
  }

  const meshes = b.flush(scene);
  // Befästa positioner: röj runt pjäserna (bara bild). view.js hämtar den ur scenen.
  scene.userData.fortify = createFortify(scene, { tagged: b.tagged });

  // ---------- damm i luften ----------
  const dustN = 600, dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = r.range(x0, x1); dustPos[i * 3 + 1] = r.range(0.3, 10); dustPos[i * 3 + 2] = r.range(z0, z1); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustTex = canvasTex(32, (g, s) => { const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, s, s); });
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.35, map: dustTex, color: '#efe2c4', transparent: true, opacity: 0.4, depthWrite: false })));
  const update = (dt, time) => {
    for (let i = 0; i < dustN; i++) {
      dustPos[i * 3] += dt * 0.8; dustPos[i * 3 + 1] += Math.sin(time + i) * dt * 0.05;
      if (dustPos[i * 3] > x1) dustPos[i * 3] = x0;
    }
    dustGeo.attributes.position.needsUpdate = true;
  };
  void mat;
  return { ground, update, ghosts, stats: { instancedMeshes: meshes.length, instances: meshes.reduce((n, m) => n + m.count, 0), trees } };
}

// Rutnätet som genomskinlig ruta över marken (G).
export function gridOverlay(grid) {
  const S = 8;
  const c = document.createElement('canvas'); c.width = grid.w * S; c.height = grid.h * S;
  const g = c.getContext('2d');
  for (let j = 0; j < grid.h; j++) for (let i = 0; i < grid.w; i++) {
    if (!grid.walk[j * grid.w + i]) continue;
    g.fillStyle = 'rgba(233,223,201,0.38)'; g.fillRect(i * S + 1, j * S + 1, S - 2, S - 2);
  }
  const mark = ([i, j], color) => { g.fillStyle = color; g.fillRect(i * S, j * S, S, S); };
  for (const s of grid.spawns) mark(s.cell, 'rgba(224,96,60,0.95)');
  mark(grid.base, 'rgba(181,83,42,1)');
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.colorSpace = THREE.SRGBColorSpace;
  const W = grid.w * grid.cellSize, H = grid.h * grid.cellSize;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(grid.origin[0] + W / 2, 0.12, grid.origin[1] + H / 2);
  m.renderOrder = 5;
  return m;
}
