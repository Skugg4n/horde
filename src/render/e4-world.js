// E4 vid Lästringe (0.15.0): målad mark (en canvas: gräs, åker, äng, skogsbotten, asfalt med
// vägmarkeringar), skog, högt gräs, stenblock, vägräcken, belysning, bilar, långtradaren och bussen i
// Gnesta-byggsatsens batch (några tiotal anrop), skyltarna som egna små meshar och spöklagret runt om.
// Samma sol, dis och gradering som Gnesta (scene.js gäller alla banor med rutnät).
import * as THREE from 'three';
import { mesh, canvasTex } from './kit.js';
import { GP, createBatch, frame, seeded, spruce, pine, birch } from './gnesta-kit.js';
import { EP, guardRail, highwayLamp, wreck, semiTruck, bus, boulder, grassTuft, roadSign } from './e4-kit.js';
import { pattern } from './gnesta-world.js';
import { buildSurroundings } from './gnesta-ghost.js';
import { createFortify } from './fortify.js';
import { distPolyline, inPoly } from '../data/gnesta.js';
import { offsetLine, FOREST_EDGE } from '../data/e4-lastringe.js';

const LINE = 'rgba(232,228,214,0.86)';

// Punkten s meter längs polylinjen, med riktning.
function along(pts, s) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az);
    if (acc + L >= s || i === pts.length - 1) { const t = L ? Math.min(1, (s - acc) / L) : 0; return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: (bx - ax) / (L || 1), dz: (bz - az) / (L || 1) }; }
    acc += L;
  }
  return null;
}
const lengthOf = pts => pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

function paintGround(map) {
  const { x0, x1, z0, z1 } = map.ground.bounds, PPM = map.ground.ppm;
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
    // åkern: vall som slagits, i rader
    field: pat(pattern(256, '#8e8b55', ['#7a7a45', '#a39d63', '#86834c', '#9a9560'], 2400, 1.4, (gg, s) => {
      gg.strokeStyle = 'rgba(70,72,38,0.28)'; gg.lineWidth = 3;
      for (let y = 0; y < s; y += 12) { gg.beginPath(); gg.moveTo(0, y); gg.lineTo(s, y + 4); gg.stroke(); }
    })),
    meadow: pat(pattern(256, '#8a8a52', ['#9c955c', '#6f7a40', '#a8a066', '#7e8649'], 3000, 1.8)),
    forest: pat(pattern(256, GP.forestFloor, ['#2f3524', '#4d5338', '#5a4a33', '#353d28', '#6b5a3c'], 3200, 2.0)),
    gravel: pat(pattern(128, GP.gravel, ['#7d7158', '#b0a283', '#8a7d62', '#6a604c', '#c2b597'], 2200, 1.1)),
    asphalt: pat(pattern(256, '#57534c', ['#2d2a25', '#5a554b', '#3a3630', '#6b6456', '#4b4740'], 6500, 1.2, (gg, s, r) => {
      gg.strokeStyle = 'rgba(20,18,14,0.45)'; gg.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { let x = r() * s, y = r() * s; gg.beginPath(); gg.moveTo(x, y); for (let k = 0; k < 5; k++) { x += r.range(-25, 25); y += r.range(-25, 25); gg.lineTo(x, y); } gg.stroke(); }
    })),
  };
  const poly = (pts, fill, blur = 0) => {
    g.save(); if (blur) g.filter = `blur(${blur}px)`;
    g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath();
    g.fillStyle = fill; g.fill(); g.restore();
  };
  const line = (pts, width, stroke, { cap = 'round', blur = 0, dash = null, alpha = 1 } = {}) => {
    g.save(); if (blur) g.filter = `blur(${blur}px)`;
    g.globalAlpha = alpha; g.lineCap = cap; g.lineJoin = 'round';
    if (dash) g.setLineDash(dash.map(d => d * PPM));
    g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.lineWidth = width * PPM; g.strokeStyle = stroke; g.stroke(); g.restore();
  };

  // gräs med fläckar, åkern, ängen och skogsbotten
  g.fillStyle = P.grass; g.fillRect(0, 0, W, H);
  const r = seeded(137);
  for (let i = 0; i < 120; i++) {
    const x = r() * W, y = r() * H, rad = r.range(40, 200);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r.pick(['rgba(120,115,70,0.2)', 'rgba(60,70,35,0.22)', 'rgba(140,130,90,0.14)']));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  poly(map.ground.field, P.field, 5);
  poly(map.ground.meadow, P.meadow, 8);
  for (const f of map.ground.forest) poly(f, P.forest, 12);

  const roads = map.roads.filter(rd => rd.paint !== false);
  // dikena: en mörkare, fuktig rand i vägrenen längs motorvägen och ramperna
  for (const rd of roads.filter(x => ['e4n', 'e4s', 'rampA', 'rampB'].includes(x.id))) for (const s of [-1, 1]) {
    line(offsetLine(rd.pts, s * (rd.width / 2 + 2.4)), 1.6, 'rgba(48,58,30,0.55)', { blur: 4 });
  }
  // vägrenen: grus under asfalten
  for (const rd of roads) line(rd.pts, rd.width + (rd.lines === 'motorway' ? 2.2 : 1.4), rd.surface === 'gravel' ? GP.gravelDark : '#8a8270', { blur: 2, alpha: 0.8 });
  // rastfickans plan vid hållplatsen
  const lay = map.roads.find(x => x.id === 'layby');
  if (lay) poly([...lay.pts, lay.pts[0]], P.asphalt, 1);
  for (const rd of roads) line(rd.pts, rd.width, rd.surface === 'gravel' ? P.gravel : P.asphalt);

  // ---------- vägmarkeringar ----------
  for (const rd of roads) {
    if (rd.lines === 'motorway') {
      for (const s of [-1, 1]) line(offsetLine(rd.pts, s * (rd.width / 2 - 0.45)), 0.2, LINE, { cap: 'butt' });
      line(rd.pts, 0.15, LINE, { dash: [3, 9], cap: 'butt' });
    } else if (rd.lines === 'ramp') {
      for (const s of [-1, 1]) line(offsetLine(rd.pts, s * (rd.width / 2 - 0.35)), 0.16, LINE, { cap: 'butt' });
    } else if (rd.lines === 'road') {
      line(rd.pts, 0.13, LINE, { dash: [3, 6], cap: 'butt' });
      for (const s of [-1, 1]) line(offsetLine(rd.pts, s * (rd.width / 2 - 0.3)), 0.12, LINE, { dash: [1, 2], cap: 'butt' });
    } else if (rd.lines === 'edge') {
      for (const s of [-1, 1]) line(offsetLine(rd.pts, s * (rd.width / 2 - 0.3)), 0.12, LINE, { cap: 'butt' });
    }
  }
  // spärrområdena (spärrlinjer i sicksack) där ramperna går ihop med motorvägen och vid stammens delning
  const chevrons = (ramp, main, dmin, dmax) => {
    const L = lengthOf(ramp.pts);
    for (let s = 0; s < L; s += 0.5) {
      const p = along(ramp.pts, s);
      const d = distPolyline(p.x, p.z, main.pts);
      const gap = d - ramp.width / 2 - main.width / 2;
      if (gap < dmin || gap > dmax) continue;
      if (Math.round(s * 2) % 6) continue;
      // från rampens kant mot huvudvägens kant, snett
      const nx = -p.dz, nz = p.dx;
      const side = distPolyline(p.x + nx, p.z + nz, main.pts) < d ? 1 : -1;
      const ax = p.x + side * nx * (ramp.width / 2), az = p.z + side * nz * (ramp.width / 2);
      const bx = p.x + side * nx * (ramp.width / 2 + gap) + p.dx * 1.6, bz = p.z + side * nz * (ramp.width / 2 + gap) + p.dz * 1.6;
      line([[ax, az], [bx, bz]], 0.32, LINE, { cap: 'butt' });
    }
  };
  const rd = id => map.roads.find(x => x.id === id);
  chevrons(rd('rampA'), rd('e4n'), -0.5, 3.2);
  chevrons(rd('rampB'), rd('e4n'), -0.5, 3.2);
  chevrons(rd('rampA'), rd('rampB'), -0.5, 2.6);
  // "800" och pilar på väg 800 före korsningen (gatubilderna), och en pil på stammen
  const paint = (x, z, ang, draw) => { g.save(); g.translate(X(x), Z(z)); g.rotate(ang); g.fillStyle = LINE; draw(); g.restore(); };
  const text = (x, z, ang, t) => paint(x, z, ang, () => { g.font = `bold ${2.4 * PPM}px "Arial Narrow", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.scale(0.7, 1.6); g.fillText(t, 0, 0); });
  const arrow = (x, z, ang) => paint(x, z, ang, () => {
    const u = PPM;
    g.beginPath(); g.moveTo(2.4 * u, 0); g.lineTo(0.6 * u, -0.9 * u); g.lineTo(0.6 * u, -0.25 * u); g.lineTo(-2.4 * u, -0.25 * u);
    g.lineTo(-2.4 * u, 0.25 * u); g.lineTo(0.6 * u, 0.25 * u); g.lineTo(0.6 * u, 0.9 * u); g.closePath(); g.fill();
  });
  const r800 = rd('r800'), stem = rd('stem');
  for (const [s, side] of [[94, 1], [108, -1]]) {
    const p = along(r800.pts, s);
    // texten läses av den som kör mot korsningen: botten mot föraren
    const ang = Math.atan2(p.dz, p.dx) + Math.PI / 2 * side;
    text(p.x - p.dz * side * 1.7, p.z + p.dx * side * 1.7, ang, '800');
    arrow(p.x - p.dz * side * 1.7 + p.dx * side * 6, p.z + p.dx * side * 1.7 + p.dz * side * 6, Math.atan2(p.dz, p.dx) + (side > 0 ? 0 : Math.PI));
  }
  { const p = along(stem.pts, 3); arrow(p.x, p.z, Math.atan2(-p.dz, -p.dx)); }
  // hållplatsens skylt och plattform: ljus kant
  if (lay) line(lay.pts.slice(2, 5), 0.5, 'rgba(200,196,182,0.8)', { cap: 'butt' });

  // kanterna tonar mot spöklagrets mark
  const F = 14 * PPM, col = 'rgba(125,130,83,';
  const edge = (x, y, w, h, gx0, gy0, gx1, gy1) => {
    const gr = g.createLinearGradient(gx0, gy0, gx1, gy1);
    gr.addColorStop(0, col + '1)'); gr.addColorStop(1, col + '0)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  };
  edge(0, 0, W, F, 0, 0, 0, F); edge(0, H - F, W, F, 0, H, 0, H - F); edge(0, 0, F, H, 0, 0, F, 0); edge(W - F, 0, F, H, W, 0, W - F, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

export function buildE4(scene, map) {
  const { x0, x1, z0, z1 } = map.ground.bounds;
  const ground = mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: paintGround(map), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); ground.castShadow = false;
  scene.add(ground);
  const ghosts = buildSurroundings(scene, map);

  const b = createBatch();
  const r = seeded(1370);
  const roads = map.roads.filter(rd => rd.paint !== false);
  const crisp = map.surroundings.crisp;
  const inCrisp = (x, z, m = 6) => x >= crisp.x0 - m && x <= crisp.x1 + m && z >= crisp.z0 - m && z <= crisp.z1 + m;
  const roadGap = (x, z) => Math.min(...roads.map(o => distPolyline(x, z, o.pts) - o.width / 2));

  // ---------- vägräcken och belysning ----------
  for (const pts of map.rails) guardRail(b, pts.filter(([x, z]) => inCrisp(x, z, 20)));
  b.tag = null;
  for (const rd of roads) {
    if (!rd.lamps) continue;
    const L = lengthOf(rd.pts);
    for (let s = rd.lamps.step * 0.5; s < L; s += rd.lamps.step) {
      const p = along(rd.pts, s);
      if (!inCrisp(p.x, p.z, 10)) continue;
      const nx = -p.dz * rd.lamps.side, nz = p.dx * rd.lamps.side, off = rd.width / 2 + 1.2;
      const x = p.x + nx * off, z = p.z + nz * off;
      if (roadGap(x, z) < 0.6) continue;
      highwayLamp(b, frame(null, x, 0, z, Math.atan2(nz, -nx)));
    }
  }
  for (const [x, z] of map.lamps) highwayLamp(b, frame(null, x, 0, z, Math.atan2(z - map.junction[1], map.junction[0] - x)));

  // ---------- fordon ----------
  for (const p of map.props) {
    const M = frame(null, p.x, 0, p.z, p.ry);
    if (p.kind === 'car') { b.tag = { kind: 'car', x: p.x, z: p.z, ry: p.ry }; wreck(b, M, GP.car[p.color % GP.car.length], p); }
    else if (p.kind === 'truck') { b.tag = null; semiTruck(b, M, p.jack); }
    else if (p.kind === 'bus') { b.tag = null; bus(b, M); }
  }
  b.tag = null;

  // ---------- stenar ----------
  for (const k of map.rocks) boulder(b, k.x, k.z, k.s, r);

  // ---------- skog: gran och tall, björk i brynet ----------
  let trees = 0;
  map.ground.forest.forEach(poly => {
    const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
    const gx0 = Math.max(x0 - 6, Math.min(...xs)), gx1 = Math.min(x1 + 6, Math.max(...xs));
    const gz0 = Math.max(z0 - 6, Math.min(...zs)), gz1 = Math.min(z1 + 6, Math.max(...zs));
    const step = 3.2;
    for (let z = gz0; z < gz1; z += step) for (let x = gx0; x < gx1; x += step) {
      const tx = x + r.range(-1.3, 1.3), tz = z + r.range(-1.3, 1.3);
      if (!inPoly(tx, tz, poly) || !inCrisp(tx, tz)) continue;
      const dr = roadGap(tx, tz);
      if (dr < 4) continue;
      // lägre träd nära vägarna, så att skogen inte döljer horden från kameran (sydost)
      const hk = Math.min(1, Math.max(0.42, (dr - 2.5) / 16));
      const edgeTree = dr < FOREST_EDGE + 1.5;
      if (edgeTree) b.tag = { kind: 'tree', x: tx, z: tz };
      const k = r();
      if (edgeTree && k < 0.4) birch(b, tx, tz, r.range(7, 11) * hk, r);
      else if (k < 0.62) spruce(b, tx, tz, r.range(10, 16) * hk, r);
      else if (k < 0.92) pine(b, tx, tz, r.range(11, 17) * hk, r);
      else birch(b, tx, tz, r.range(8, 12) * hk, r);
      b.tag = null;
      trees++;
    }
  });
  // ensamma björkar och tallar i ängen och längs ramperna
  for (let i = 0; i < 70; i++) {
    const x = r.range(crisp.x0, crisp.x1), z = r.range(crisp.z0, crisp.z1);
    if (!inPoly(x, z, map.ground.meadow) && !inPoly(x, z, map.ground.field)) continue;
    if (inPoly(x, z, map.ground.field) && r() < 0.85) continue;
    if (roadGap(x, z) < 5 || map.rocks.some(k => Math.hypot(k.x - x, k.z - z) < 3)) continue;
    b.tag = { kind: 'tree', x, z };
    (r() < 0.6 ? birch : pine)(b, x, z, r.range(6, 11), r);
    b.tag = null; trees++;
  }

  // ---------- högt gräs i vägrenarna och ängen ----------
  let tufts = 0;
  for (let i = 0; i < 2600 && tufts < 1500; i++) {
    const x = r.range(crisp.x0, crisp.x1), z = r.range(crisp.z0, crisp.z1);
    const dr = roadGap(x, z);
    const verge = dr > 1.2 && dr < 6;
    if (!verge && !inPoly(x, z, map.ground.meadow)) continue;
    if (map.ground.forest.some(f => inPoly(x, z, f)) && dr > 6) continue;
    grassTuft(b, x, z, r.range(0.5, 1.1), r); tufts++;
  }

  const meshes = b.flush(scene);
  scene.userData.fortify = createFortify(scene, { tagged: b.tagged });

  // ---------- skyltarna ----------
  const signs = new THREE.Group(); signs.name = 'signs';
  for (const s of map.signs) signs.add(roadSign(s));
  scene.add(signs);

  // ---------- damm och pollen i luften ----------
  const dustN = 500, dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = r.range(crisp.x0, crisp.x1); dustPos[i * 3 + 1] = r.range(0.3, 10); dustPos[i * 3 + 2] = r.range(crisp.z0, crisp.z1); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustTex = canvasTex(32, (gg, s) => { const rg = gg.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = rg; gg.fillRect(0, 0, s, s); });
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.35, map: dustTex, color: '#efe2c4', transparent: true, opacity: 0.4, depthWrite: false })));
  const update = (dt, time) => {
    for (let i = 0; i < dustN; i++) {
      dustPos[i * 3] += dt * 0.8; dustPos[i * 3 + 1] += Math.sin(time + i) * dt * 0.05;
      if (dustPos[i * 3] > crisp.x1) dustPos[i * 3] = crisp.x0;
    }
    dustGeo.attributes.position.needsUpdate = true;
  };
  void EP;
  return { ground, update, ghosts, stats: { instancedMeshes: meshes.length, instances: meshes.reduce((n, m) => n + m.count, 0), trees, tufts } };
}
