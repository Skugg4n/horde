// Mölnbo-scenen (0.17.0-molnbo): målad mark (en canvas för spelytan, en lågupplöst för omgivningen), allt som
// står i en batch (bron, perrongerna, husen, träden), tåget i en egen batch (det kan gå), och omgivningen i
// diset i en tredje batch med diset inbakat i materialet (som E4, e4-far.js). Data: src/data/molnbo.js.
import * as THREE from 'three';
import { mesh, PALETTE } from './kit.js';
import { GP, UNIT, createBatch, frame, seeded, villa, lamp, curb, car, gardenTree, spruce, pine, birch, hedge, fence, furniture, trampoline } from './gnesta-kit.js';
import { farmhouse, barn, hayBale, shed } from './e4-kit.js';
import { fogSheet } from './gnesta-ghost.js';
import { createFortify } from './fortify.js';
import { pattern } from './gnesta-world.js';
import { distPolyline, inPoly } from '../data/gnesta.js';
import { R, toRail, RAIL, RAIL_RY, DECK_H, ROCK, FOLKETS, X60 as X60D, TOWERS } from '../data/molnbo.js';
import {
  MP, seg, bridge, stairTower, track, platform, shelter, departureSign, catenaryPortal, wires, meshFence, x60, folketsHus, stationHouse,
  cafeHarmoni, missionHouse, yellowHouse, whiteHouse, chainHouses, hembygdsgard, logFence, kvarnen, apartment, trafficLight, rockCut, roadRail, signMesh, placeIn,
} from './molnbo-kit.js';

const HAZE = new THREE.Color(PALETTE.haze);
const REACH = 120;     // så långt ut i diset (meter utanför spelytan) det ritas något som står
const outsideD = (c, x, z) => Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1));
const RM = frame(null, 0, 0, 0, RAIL_RY);     // järnvägens ram: lokal x = u, lokal z = v

// 0.17.2 (H302, Olas speltest: "kanten är gles och dimman ser ut som ett grafikfel"): två sätt att avsluta kartan, att
// jämföra i debugmenyn (Visuals, Edge). 'haze': djupare grå dis i lager, högre saker tonar in som siluetter (höjden
// tunnar ut diset). 'dark': mörker bortom den aktiva ytan som en vinjett, landskapet dämpas mot nästan svart.
// Båda med riktigt landskap i kanten (skog, trädgårdar, hus), aldrig tomt.
export const EDGE_MODES = {
  haze: { col: '#8d918c', curve: [6, 120, 0.97], hfall: 0.32, layers: 0.42, bg: '#8d918c' },
  dark: { col: '#121512', curve: [2, 64, 0.97], hfall: 0, layers: 0, bg: '#121512' },
};
export const EDGE_DEFAULT = 'dark';
// Gemensamma uniforms för allt i diset (materialen i omgivningen läser dem, setEdge ändrar dem)
function edgeUniforms() {
  return { col: { value: new THREE.Color(EDGE_MODES[EDGE_DEFAULT].col) }, curve: { value: new THREE.Vector3(...EDGE_MODES[EDGE_DEFAULT].curve) }, hfall: { value: EDGE_MODES[EDGE_DEFAULT].hfall } };
}

// Material med diset inbakat (samma kurva som dimskivan), som e4-far.js.
function hazed(base, crisp, haze, U) {
  const m = base.clone();
  m.onBeforeCompile = sh => {
    sh.uniforms.uHazeCol = U.col;
    sh.uniforms.uCrisp = { value: new THREE.Vector4(crisp.x0, crisp.z0, crisp.x1, crisp.z1) };
    sh.uniforms.uCurve = U.curve;
    sh.uniforms.uHFall = U.hfall;
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
        uniform vec3 uCurve;
        uniform float uHFall;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        vec2 fo = max(max(uCrisp.xy - vFarW.xz, vFarW.xz - uCrisp.zw), vec2(0.0));
        float ff = smoothstep(uCurve.x, uCurve.y, length(fo)) * uCurve.z * (1.0 - uHFall * smoothstep(1.0, 14.0, vFarW.y));
        float fl = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 hz = linearToOutputTexel(vec4(uHazeCol, 1.0)).rgb;
        gl_FragColor.rgb = mix(mix(gl_FragColor.rgb, vec3(fl), 0.35 * ff), hz, ff);`);
  };
  m.customProgramCacheKey = () => 'molnbo-far';
  return m;
}

// ---------- marken ----------
// bounds, ppm: utsnittet och upplösningen. Samma målning för spelytan (skarp) och omgivningen (grov).
function paintLand(map, { bounds, ppm, fadeEdges = false }) {
  const { x0, x1, z0, z1 } = bounds;
  const W = Math.round((x1 - x0) * ppm), H = Math.round((z1 - z0) * ppm);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const X = x => (x - x0) * ppm, Z = z => (z - z0) * ppm;
  const pat = cv => { const p = g.createPattern(cv, 'repeat'); const s = ppm / 14; p.setTransform(new DOMMatrix().scaleSelf(s, s)); return p; };
  const P = {
    grass: pat(pattern(256, GP.grass, ['#55602f', '#7b8549', '#5d6835', '#868a52', '#4a5429'], 2600, 1.6)),
    lawn: pat(pattern(256, GP.lawnMown, ['#66733f', '#7d8a50', '#6a7843'], 1600, 1.3)),
    field: pat(pattern(256, GP.grassDry, ['#6f6e40', '#8c8a56', '#646436', '#9a9160'], 2600, 1.6, (gg, s) => { gg.strokeStyle = 'rgba(70,60,35,0.22)'; gg.lineWidth = 2; for (let y = 0; y < s; y += 9) { gg.beginPath(); gg.moveTo(0, y); gg.lineTo(s, y + 3); gg.stroke(); } })),
    forest: pat(pattern(256, GP.forestFloor, ['#2f3524', '#4d5338', '#5a4a33', '#353d28', '#6b5a3c'], 3200, 2.0)),
    gravel: pat(pattern(128, GP.gravel, ['#7d7158', '#b0a283', '#8a7d62', '#6a604c', '#c2b597'], 2200, 1.1)),
    ballast: pat(pattern(128, MP.ballast, ['#5a544b', '#8a8173', '#4d4740', '#9a9183'], 3000, 1.0)),
    asphalt: pat(pattern(256, GP.asphalt, ['#2d2a25', '#5a554b', '#3a3630', '#6b6456'], 6000, 1.2)),
    water: '#4d5f63',
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
  const rail = (pts) => pts.map(([u, v]) => R(u, v));
  g.fillStyle = P.grass; g.fillRect(0, 0, W, H);
  const r = seeded(31);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H, rad = r.range(30, 200) * ppm / 10;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r.pick(['rgba(120,115,70,0.22)', 'rgba(60,70,35,0.22)', 'rgba(140,130,90,0.16)']));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  poly(map.ground.field, P.field, 4); poly(map.ground.field2, P.field, 4);
  for (const f of map.ground.forest) poly(f, P.forest, 8);
  poly(map.ground.lake, P.water, 2);
  line([...map.ground.lake, map.ground.lake[0]], 2.5, '#6a7550', { alpha: 0.6, blur: 2 });
  // tomterna: klippt gräs runt husen
  for (const h of map.buildings) {
    const cs = Math.cos(h.ry), sn = Math.sin(h.ry), pw = h.w / 2 + 4, pd = h.d / 2 + 4;
    poly([[-pw, -pd], [pw, -pd], [pw, pd], [-pw, pd]].map(([lx, lz]) => [h.x + lx * cs + lz * sn, h.z - lx * sn + lz * cs]), P.lawn, 2);
  }
  // järnvägen: makadam över hela bredden, mörkare under spåren
  line(rail([[-400, -2.5], [400, -2.5]]), 27, P.ballast, { cap: 'butt' });
  for (const v of RAIL.tracks) line(rail([[-400, v], [400, v]]), 3.2, 'rgba(50,45,40,0.35)', { cap: 'butt' });
  // ytor: parkeringen (asfalt), grusplanerna
  poly(map.areas.parking, P.gravel, 1); poly(map.areas.cafePark, P.asphalt, 1); poly(map.areas.plaza, P.gravel, 1); poly(map.areas.stationYard, P.gravel, 1);
  // vägarna (broarna ritas av byggsatsen)
  const order = { dirt: 0, gravel: 1, asphalt: 2 };
  const roads = map.roads.filter(rd => rd.paint !== false && !rd.bridge).sort((a, b) => order[a.surface] - order[b.surface]);
  for (const rd of roads) if (rd.surface === 'asphalt') line(rd.pts, rd.width + 0.5, '#8d887a'); else line(rd.pts, rd.width + 1.2, GP.gravelDark, { blur: 2, alpha: 0.5 });
  for (const rd of roads) line(rd.pts, rd.width, rd.surface === 'asphalt' ? P.asphalt : P.gravel);
  // brofästenas asfalt på marken (där ramperna når marken) och folkets hus plan
  for (const id of ['v57', 'foot']) {
    const rd = map.roads.find(x => x.id === id), [a, b] = rd.rail;
    for (const [s, e] of [[a, [a[0] + (b[0] - a[0]) * 0.07, a[1] + (b[1] - a[1]) * 0.07]], [b, [b[0] + (a[0] - b[0]) * 0.07, b[1] + (a[1] - b[1]) * 0.07]]]) line(rail([s, e]), rd.width, P.asphalt);
  }
  for (const rd of map.roads.filter(x => x.center)) line(rd.pts, 0.14, 'rgba(225,218,200,0.5)', { dash: [3, 6], cap: 'butt' });
  // övergångsställen vid korsningen
  for (const [u, v, a] of [[-12, 31.5, 0], [0, 40, Math.PI / 2], [6, 32, Math.PI / 2]]) {
    const [x, z] = R(u, v);
    g.save(); g.translate(X(x), Z(z)); g.rotate(-RAIL_RY + a); g.fillStyle = 'rgba(225,218,200,0.6)';
    for (let k = -3; k <= 3; k++) g.fillRect(k * 0.9 * ppm - 0.25 * ppm, -2.2 * ppm, 0.5 * ppm, 4.4 * ppm);
    g.restore();
  }
  if (fadeEdges) {
    // kanterna tonar ut (genomskinligt) mot omgivningens mark
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

// ---------- hela scenen ----------
export function buildMolnbo(scene, map) {
  const sur = map.surroundings, crisp = sur.crisp, EXT = sur.extent;
  const gb = map.ground.bounds;
  // mark: spelytan skarp, omgivningen grov under, och diset bortom
  const ground = mesh(new THREE.PlaneGeometry(gb.x1 - gb.x0, gb.z1 - gb.z0), new THREE.MeshStandardMaterial({ map: paintLand(map, { bounds: gb, ppm: map.ground.ppm, fadeEdges: true }), roughness: 1, transparent: true }));
  ground.rotation.x = -Math.PI / 2; ground.position.set((gb.x0 + gb.x1) / 2, 0, (gb.z0 + gb.z1) / 2); ground.castShadow = false;
  scene.add(ground);
  const outer = mesh(new THREE.PlaneGeometry(EXT.x1 - EXT.x0, EXT.z1 - EXT.z0), new THREE.MeshStandardMaterial({ map: paintLand(map, { bounds: EXT, ppm: 2.5 }), roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.set((EXT.x0 + EXT.x1) / 2, -0.04, (EXT.z0 + EXT.z1) / 2); outer.castShadow = false; outer.receiveShadow = false;
  scene.add(outer);
  const beyond = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshBasicMaterial({ color: HAZE }));
  beyond.rotation.x = -Math.PI / 2; beyond.position.y = -0.1; scene.add(beyond);

  const b = createBatch(), fb = createBatch(), r = seeded(1018);
  const U = edgeUniforms();
  const signs = new THREE.Group(); signs.name = 'molnbo-signs'; scene.add(signs);
  const inC = (x, z, pad = 0) => x >= crisp.x0 - pad && x <= crisp.x1 + pad && z >= crisp.z0 - pad && z <= crisp.z1 + pad;
  const near = (x, z) => outsideD(crisp, x, z) < 22;
  const pickB = (x, z) => (near(x, z) ? b : fb);
  // u-intervallet av järnvägen som ligger inom räckhåll (i bitar om 20 m)
  const railChunks = [];
  for (let u = -320; u < 320; u += 20) {
    const [x, z] = R(u + 10, -1);
    const o = outsideD(crisp, x, z);
    if (o < REACH) railChunks.push({ u0: u, u1: u + 20, near: o < 22 });
  }

  // ---------- järnvägen ----------
  for (const ch of railChunks) {
    const bb = ch.near ? b : fb;
    for (const v of RAIL.tracks) track(bb, RM, ch.u0, ch.u1, v, RAIL.gauge);
    for (const fv of [RAIL.fences[0], RAIL.fences[2]]) meshFence(bb, RM, ch.u0, ch.u1, fv);
    meshFence(bb, RM, ch.u0, ch.u1, RAIL.fences[1], 1.2);
  }
  // kontaktledningen: portaler var 30:e meter, linorna i ett anrop
  const wirePairs = [];
  // portalerna står var 30:e meter, men inte på broarna: en på var sida (u -38 och 32), och linorna går
  // inte genom däcken (glappet mellan dem)
  const portalUs = [];
  for (let u = -300; u <= 300; u += 30) portalUs.push(u === -30 ? -38 : u === 30 ? 32 : u);
  let lastU = null;
  for (const u of portalUs) {
    if (u === 0) { lastU = null; continue; }
    const [x, z] = R(u, -1); const o = outsideD(crisp, x, z);
    if (o > REACH) { lastU = null; continue; }
    catenaryPortal(o < 22 ? b : fb, RM, u, [-14.2, 11.4]);
    if (lastU != null && o < 60 && !(lastU === -38 && u === 32)) for (const v of RAIL.tracks) { wirePairs.push([[lastU, 5.7, v], [u, 5.7, v]]); wirePairs.push([[lastU, 6.9, v], [u, 6.9, v]]); }
    lastU = u === 32 || u !== 0 ? u : null;
  }
  scene.add(wires(RM, wirePairs));
  // perrongerna, väntkurerna, avgångsskylten och namnskylten
  platform(b, RM, RAIL.platformN, { edge: 1, back: true });
  platform(b, RM, RAIL.platformS, { edge: -1 });
  for (const s of map.shelters) shelter(b, frame(RM, s.u, 0, s.v), s.v < 0 ? RAIL.platformN.h : RAIL.platformS.h);
  signs.add(departureSign(b, frame(RM, map.sign.u, 0, map.sign.v), RAIL.platformN.h));
  signs.add(departureSign(b, frame(RM, -46, 0, 7.6, Math.PI), RAIL.platformS.h, '41 Södertälje C  6 min'));
  for (const [u, v, ry] of [[-50, -12.3, 0], [-40, 9.8, Math.PI]]) {
    const M = frame(RM, u, 0, v, ry);
    b.box(M, -1.4, 2.1, 0, 0.12, 2.6, 0.12, MP.shelterFrame, 'metal'); b.box(M, 1.4, 2.1, 0, 0.12, 2.6, 0.12, MP.shelterFrame, 'metal');
    signs.add(placeIn(signMesh('Mölnbo', 3.2, 0.7, { bg: '#2c3033', fg: '#e8e6df', font: 'Arial, sans-serif', weight: 600 }), M, 0, 3.1, 0.08));
  }
  // broarna och trapptornen
  bridge(b, RM, map.bridge, DECK_H, {});
  bridge(b, RM, map.foot, DECK_H, { foot: true, pillars: [-3.25, 1.4] });
  // 0.17.1: trappan på sidan bort från spåren, gångbryggan i däckets höjd mot gångbron
  for (const t of TOWERS) {
    const fu = map.foot.a[0] + (map.foot.a[1] - t.at[1]) * (map.foot.b[0] - map.foot.a[0]) / (map.foot.a[1] - map.foot.b[1]);
    stairTower(b, frame(RM, t.at[0], 0, t.at[1]), t.size, t.h, { side: t.at[1] < 0 ? -1 : 1, deck: DECK_H, link: fu - map.foot.width / 2 - t.at[0] });
  }
  // trappan ner från gångbron till norra perrongen
  for (let k = 0; k < 9; k++) b.box(RM, -12.2 + k * 0.85, RAIL.platformN.h + 0.2 + k * (DECK_H - RAIL.platformN.h) / 9, -9.4, 0.85, 0.25, 2.3, MP.concreteLight);
  // 0.17.1: bröstning och ledstång längs trappan, som trapptornens lopp
  {
    const y0 = RAIL.platformN.h + 0.2, y1 = RAIL.platformN.h + 0.2 + 8 * (DECK_H - RAIL.platformN.h) / 9;
    for (const v of [-10.6, -8.2]) {
      seg(b, RM, [-12.6, y0 + 0.35, v], [-5.0, y1 + 0.35, v], 0.14, 0.9, MP.concrete);
      seg(b, RM, [-12.6, y0 + 1.0, v], [-5.0, y1 + 1.0, v], 0.06, 0.06, MP.steel, 'metal');
    }
  }
  // räcket och bergskärningen längs Fagernäsvägen
  roadRail(b, RM, 20, 78, 25.3); roadRail(b, RM, 106, 118, 25.6);
  for (const [u0, u1] of ROCK.segs) rockCut(b, frame(RM, (u0 + u1) / 2, 0, ROCK.v + 0.6), u1 - u0, ROCK.depth, ROCK.h, r);
  // slänten ner mot spåret söder om perrongen: buskar
  for (let u = -110; u < 60; u += 4.2) { const [x, z] = R(u + r.range(-1, 1), 13.5 + r.range(0, 2)); if (inC(x, z, 10)) b.put(UNIT.blob, null, x, 0.6, z, r.range(1.6, 2.6), r.range(1.0, 1.7), r.range(1.6, 2.6), r.pick(GP.hedge), 'matte', r() * 6); }

  // ---------- tåget ----------
  const tb = createBatch();
  x60(tb, null, X60D);
  const train = new THREE.Group(); train.name = 'x60';
  tb.flush(train);
  const [tx, tz] = [X60D.x, X60D.z];
  train.position.set(tx, 0, tz); train.rotation.y = X60D.ry;
  scene.add(train);

  // ---------- husen ----------
  const fronts = new Map();
  scene.userData.houseFronts = fronts;
  const KIT = { station: stationHouse, mission: missionHouse, yellow: yellowHouse, white: whiteHouse, chain: chainHouses, hembygd: hembygdsgard, kvarn: kvarnen, apartment };
  for (const h of map.buildings) {
    const M = frame(null, h.x, 0, h.z, h.ry), bb = pickB(h.x, h.z);
    if (h.kind === 'villa') {
      bb.tag = null;
      const f = villa(bb, M, h);
      fronts.set(h.id, { x: h.x, z: h.z, ry: h.ry, ...f });
    } else if (h.kind === 'cafe') { for (const s of cafeHarmoni(bb, M, h)) signs.add(s); fronts.set(h.id, { x: h.x, z: h.z, ry: h.ry, doorX: 0, doorY: 1.4, frontZ: h.d / 2, winU: -h.w * 0.3, winY: 1.8 }); }
    else if (KIT[h.kind]) { KIT[h.kind](bb, M, h); fronts.set(h.id, { x: h.x, z: h.z, ry: h.ry, doorX: 0, doorY: 1.1, frontZ: h.d / 2, winU: h.w * 0.3, winY: 1.8 }); }
  }
  {
    const F = FOLKETS;
    signs.add(folketsHus(b, frame(null, F.x, 0, F.z, F.ry), F));
  }
  // gärdsgården runt Hembygdsgården
  { const hb = map.buildings.find(h => h.id === 'hembygd'); logFence(pickB(hb.x, hb.z), frame(null, hb.x, 0, hb.z, hb.ry), [[-11, -8], [11, -8], [11, 8], [-11, 8], [-11, -2]]); }
  // trafikljusen vid korsningen, vända mot korsningens mitt
  {
    const [jx, jz] = R(-6, 34);
    map.lights.forEach(([x, z], i) => trafficLight(b, frame(null, x, 0, z, Math.atan2(-(jz - z), jx - x)), i % 3));
  }
  // kantsten och gatlyktor (som Gnesta)
  const roads = map.roads.filter(rd => !rd.bridge);
  const onOther = (x, z, self, pad) => roads.some(o => o !== self && o.walk && distPolyline(x, z, o.pts) < o.width / 2 + pad);
  for (const rd of roads) {
    if (!rd.curbs) continue;
    for (const side of [-1, 1]) {
      const off = side * (rd.width / 2 + 0.08);
      for (let i = 1; i < rd.pts.length; i++) {
        const [ax, az] = rd.pts[i - 1], [bx, bz] = rd.pts[i];
        const L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L;
        const n = Math.max(1, Math.round(L / 1.2));
        for (let k = 0; k < n; k++) {
          const sx = ax + (bx - ax) * k / n + nx * off, sz = az + (bz - az) * k / n + nz * off, ex = ax + (bx - ax) * (k + 1) / n + nx * off, ez = az + (bz - az) * (k + 1) / n + nz * off;
          if (!inC((sx + ex) / 2, (sz + ez) / 2, 8) || onOther((sx + ex) / 2, (sz + ez) / 2, rd, 0.25)) continue;
          curb(b, sx, sz, ex, ez);
        }
      }
    }
    if (!rd.lamps) continue;
    let acc = rd.lamps.step * 0.5;
    for (let i = 1; i < rd.pts.length; i++) {
      const [ax, az] = rd.pts[i - 1], [bx, bz] = rd.pts[i], L = Math.hypot(bx - ax, bz - az);
      for (let s = acc; s < L; s += rd.lamps.step) {
        const dx = (bx - ax) / L, dz = (bz - az) / L, nlx = dz, nlz = -dx, off = rd.width / 2 + 0.75, side = rd.lamps.side;
        const x = ax + dx * s + nlx * off * side, z = az + dz * s + nlz * off * side;
        if (!inC(x, z, 6) || onOther(x, z, rd, 1.4)) continue;
        lamp(b, frame(null, x, 0, z, Math.atan2(nlz * side, -nlx * side)));
      }
      acc = ((acc - L) % rd.lamps.step + rd.lamps.step) % rd.lamps.step;
    }
  }
  // parkerade bilar
  for (const c of map.cars) { b.tag = { kind: 'car', x: c.x, z: c.z, ry: c.ry }; car(b, frame(null, c.x, 0, c.z, c.ry), GP.car[c.color % GP.car.length]); }
  b.tag = null;

  // ---------- träd ----------
  const roadsW = map.roads.filter(o => o.walk || o.paint !== false);
  const blocked = (x, z, pad = 3.5) => roadsW.some(o => distPolyline(x, z, o.pts) < o.width / 2 + pad)
    || map.buildings.some(h => Math.hypot(h.x - x, h.z - z) < Math.max(h.w, h.d) / 2 + 3)
    || inRailBand(x, z) || inPoly(x, z, map.ground.lake) || Math.hypot(x - FOLKETS.x, z - FOLKETS.z) < 16;
  let trees = 0;
  map.ground.forest.forEach(poly => {
    const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
    for (let z = Math.min(...zs); z < Math.max(...zs); z += 3.6) for (let x = Math.min(...xs); x < Math.max(...xs); x += 3.6) {
      const px = x + r.range(-1.4, 1.4), pz = z + r.range(-1.4, 1.4);
      if (!inPoly(px, pz, poly) || blocked(px, pz)) continue;
      const o = outsideD(crisp, px, pz);
      if (o > REACH) continue;
      const bb = o < 6 ? b : fb, k = r(), hgt = r.range(9, 15);
      if (o < 6) b.tag = { kind: 'tree', x: px, z: pz };
      if (k < 0.5) spruce(bb, px, pz, hgt, r); else if (k < 0.8) pine(bb, px, pz, hgt, r); else birch(bb, px, pz, hgt * 0.85, r);
      b.tag = null; trees++;
    }
  });
  // trädgårdsträd runt husen och lövträd i kanterna
  for (const h of map.buildings) {
    if (h.kind === 'x60') continue;
    const n = h.kind === 'villa' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.max(h.w, h.d) / 2 + r.range(3, 6), x = h.x + Math.cos(a) * d, z = h.z + Math.sin(a) * d;
      if (inRailBand(x, z) || roadsW.some(o => distPolyline(x, z, o.pts) < o.width / 2 + 2) || map.buildings.some(o => Math.hypot(o.x - x, o.z - z) < Math.max(o.w, o.d) / 2 + 1.2)) continue;
      const bb = pickB(x, z);
      if (bb === b) b.tag = { kind: 'tree', x, z };
      gardenTree(bb, frame(null, x, 0, z, r() * 6), r.range(5, 8.5), (r() * 3) | 0, r); trees++;
      b.tag = null;
    }
  }
  // häckar längs gatan framför villorna
  for (const h of map.buildings.filter(x => x.kind === 'villa' && near(x.x, x.z))) {
    const cs = Math.cos(h.ry), sn = Math.sin(h.ry), fz = h.d / 2 + 3.2, hw = h.w / 2 + 2.5;
    const a = [h.x - hw * cs + fz * sn, h.z + hw * sn + fz * cs], c = [h.x + hw * cs + fz * sn, h.z - hw * sn + fz * cs];
    if (roadsW.some(o => distPolyline(a[0], a[1], o.pts) < o.width / 2 + 0.8 || distPolyline(c[0], c[1], o.pts) < o.width / 2 + 0.8)) continue;
    b.tag = { kind: 'hedge' };
    hedge(b, a[0], a[1], c[0], c[1], r, r.range(1.2, 1.7));
    b.tag = null;
  }

  // ---------- trädgårdarna (0.17.2, H308) ----------
  // Bodar, möbler, studsmattor, fruktträd, häckar, staket och lövträdsdungar ur src/data/molnbo.js GARDEN.
  const SHED = { falu: '#8e2f22', grey: '#7d7a72', green: '#4f5e45' };
  for (const g of map.garden ?? []) {
    const bb = pickB(g.x, g.z);
    if (g.kind === 'shed') shed(bb, frame(null, g.x, 0, g.z, g.ry), { w: g.w, d: g.d, color: SHED[g.color] });
    else if (g.kind === 'table') furniture(bb, frame(null, g.x, 0, g.z, g.ry), r);
    else if (g.kind === 'tramp') trampoline(bb, frame(null, g.x, 0, g.z, g.ry));
    else if (g.kind === 'hedge') { bb.tag = bb === b ? { kind: 'hedge' } : null; hedge(bb, g.a[0], g.a[1], g.b[0], g.b[1], r, r.range(1.1, 1.6), 0.85); bb.tag = null; }
    else if (g.kind === 'fence') fence(bb, g.a[0], g.a[1], g.b[0], g.b[1], r, g.style);
    else if (g.kind === 'tree') {
      if (bb === b) b.tag = { kind: 'tree', x: g.x, z: g.z };
      if (g.grove && g.shape === 2) birch(bb, g.x, g.z, g.h, r);
      else gardenTree(bb, frame(null, g.x, 0, g.z, g.ry), g.h, g.shape, r);
      b.tag = null; trees++;
    }
  }

  // ---------- kanten (0.17.2, H302) ----------
  // Ringen närmast utanför den aktiva ytan fylls med skog i klungor, trädgårdsträd och buskar, så att kanten aldrig
  // är tom: tätare ju längre ut, glesare vid vägarna (de går vidare in i diset).
  {
    const bumpE = (x, z) => Math.sin(x * 0.053 + 1.3) * Math.cos(z * 0.047) + 0.6 * Math.sin((x - z) * 0.031);
    for (let z = crisp.z0 - 70; z < crisp.z1 + 70; z += 4.2) for (let x = crisp.x0 - 70; x < crisp.x1 + 70; x += 4.2) {
      const px = x + r.range(-1.6, 1.6), pz = z + r.range(-1.6, 1.6), o = outsideD(crisp, px, pz);
      if (o < 2 || o > 66) continue;
      if (r() > 0.25 + o / 70 + 0.25 * bumpE(px, pz)) continue;
      if (blocked(px, pz, 4) || map.far.some(f => Math.hypot(f.x - px, f.z - pz) < Math.max(f.w, f.d) / 2 + 3)) continue;
      if (inPoly(px, pz, map.ground.field) || inPoly(px, pz, map.ground.field2)) { if (r() > 0.08) continue; }
      const bb = o < 22 ? b : fb, k = r(), hgt = r.range(8, 15);
      if (bb === b) b.tag = { kind: 'tree', x: px, z: pz };
      if (k < 0.35) spruce(bb, px, pz, hgt, r); else if (k < 0.55) pine(bb, px, pz, hgt, r); else if (k < 0.75) birch(bb, px, pz, hgt * 0.85, r);
      else gardenTree(bb, frame(null, px, 0, pz, r() * 6), r.range(6, 10), (r() * 3) | 0, r);
      b.tag = null; trees++;
      if (r() < 0.3) bb.put(UNIT.blob, null, px + r.range(-2, 2), 0.6, pz + r.range(-2, 2), r.range(1.6, 2.8), r.range(1.0, 1.6), r.range(1.6, 2.8), r.pick(GP.hedge), 'matte', r() * 6);
    }
  }

  // ---------- omgivningen i diset ----------
  for (const f of map.far) {
    if (outsideD(crisp, f.x, f.z) > REACH) continue;
    const M = frame(null, f.x, 0, f.z, f.ry);
    if (f.roof === 'flat') apartment(fb, M, { w: f.w, d: f.d });
    else if (f.w > 18) barn(fb, M, { w: f.w, d: f.d });
    else farmhouse(fb, M, { w: f.w, d: f.d, color: r() < 0.7 ? 'red' : r() < 0.5 ? 'yellow' : 'white' });
  }
  for (let i = 0; i < 26; i++) {
    const [u, v] = [r.range(-250, -120), r.range(45, 110)];
    const [x, z] = R(u, v);
    if (inPoly(x, z, map.ground.field) && outsideD(crisp, x, z) < REACH) hayBale(fb, x, z, r() * 3);
  }

  // ---------- ut i scenen ----------
  const meshes = b.flush(scene);
  scene.userData.fortify = createFortify(scene, { tagged: b.tagged });
  const farGroup = new THREE.Group(); farGroup.name = 'molnbo-far';
  const farMeshes = fb.flush(farGroup);
  const mats = new Map();
  for (const m of farMeshes) {
    const key = m.material.uuid;
    if (!mats.has(key)) mats.set(key, hazed(m.material, crisp, sur.haze, U));
    m.material = mats.get(key); m.castShadow = false; m.receiveShadow = false;
  }
  const sheet = fogSheet(crisp, sur.fade, EXT, sur.haze);
  farGroup.add(sheet);
  // 'haze': tre tunnare lager ovanför marken, så att diset har djup och höga saker sticker upp ur det
  const layers = [2.5, 6, 11].map((y, i) => { const l = fogSheet(crisp, sur.fade, EXT, { start: 16 + i * 14, end: 130, max: 0.4 }); l.position.y = y; l.renderOrder = 3 + i; farGroup.add(l); return l; });
  scene.add(farGroup);
  // Kanten (H302): läget byts i debugmenyn och sparas i webbläsaren ('horde.edge')
  function setEdge(mode) {
    const E = EDGE_MODES[mode] ?? EDGE_MODES[EDGE_DEFAULT], col = new THREE.Color(E.col);
    U.col.value.copy(col); U.curve.value.set(...E.curve); U.hfall.value = E.hfall;
    sheet.material.uniforms.uHaze.value = col.clone(); sheet.material.uniforms.uCurve.value.set(...E.curve);
    layers.forEach((l, i) => { l.visible = E.layers > 0; l.material.uniforms.uHaze.value = col.clone(); l.material.uniforms.uCurve.value.set(16 + i * 14, 130, E.layers); });
    beyond.material.color.set(E.bg);
    scene.background = new THREE.Color(E.bg);
    if (scene.fog) scene.fog.color.set(E.bg);
    scene.userData.edgeMode = mode in EDGE_MODES ? mode : EDGE_DEFAULT;
  }
  scene.userData.setEdge = setEdge;
  setEdge(EDGE_DEFAULT);

  // ---------- tåget som går (dag 3 till 5) ----------
  // depart(): tåget rullar ut österut (mot Järna och Stockholm), accelererar och försvinner i diset.
  let dep = null;
  const home = new THREE.Vector3(tx, 0, tz), dir = new THREE.Vector3(Math.cos(RAIL_RY), 0, -Math.sin(RAIL_RY));
  scene.userData.molnbo = {
    depart() { if (!dep) dep = { t: 0 }; },
    reset() { dep = null; train.position.copy(home); train.visible = true; },
    get departed() { return !!dep; },
  };
  const update = dt => {
    if (!dep) return;
    dep.t += dt;
    const s = 0.9 * dep.t * dep.t;
    train.position.copy(home).addScaledVector(dir, s);
    if (s > 420) train.visible = false;
  };
  return { ground, update, stats: { instancedMeshes: meshes.length + farMeshes.length, instances: meshes.reduce((n, m) => n + m.count, 0), trees } };
}

function inRailBand(x, z) { const [, v] = toRail(x, z); return v > RAIL.corridor[0] - 1 && v < RAIL.corridor[1] + 1; }
