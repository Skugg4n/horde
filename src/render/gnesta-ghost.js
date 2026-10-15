// Spöklagret runt Gnesta: omgivningen utanför spelytan (map.surroundings) som skissartade,
// avmättade hus som sjunker ner i diset. Billigt: en målad mark (en canvas), husen som två
// InstancedMesh (kroppar och tak), konturerna som ett enda LineSegments, och en dimskiva över
// marken som tonar ut allt utanför den skarpa ytan. Bara den skarpa spelytan är tydlig.
import * as THREE from 'three';
import { UNIT } from './gnesta-kit.js';
import { PALETTE } from './kit.js';

const PPM = 2;                     // markens pixlar per meter (lågupplöst med flit)
const EXTENT = { x0: -230, x1: 250, z0: -190, z1: 200 };
const HAZE = new THREE.Color(PALETTE.haze);
const WALL = new THREE.Color('#b9b4a6'), ROOF = new THREE.Color('#77766f'), LINE = new THREE.Color('#ece4cf');

// Avstånd utanför den skarpa rektangeln (0 inuti).
const outside = (c, x, z) => Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1));

// Gemensam skuggning för spökhusen: mot diset med avståndet från spelytan och nära marken.
function ghostMaterial(crisp, fade, base) {
  const m = new THREE.MeshLambertMaterial(base);
  m.onBeforeCompile = sh => {
    sh.uniforms.uHaze = { value: HAZE };
    sh.uniforms.uCrisp = { value: new THREE.Vector4(crisp.x0, crisp.z0, crisp.x1, crisp.z1) };
    sh.uniforms.uFade = { value: fade };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGhostW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 gw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          gw = instanceMatrix * gw;
        #endif
        vGhostW = (modelMatrix * gw).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vGhostW;
        uniform vec3 uHaze;
        uniform vec4 uCrisp;
        uniform float uFade;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        vec2 o = max(max(uCrisp.xy - vGhostW.xz, vGhostW.xz - uCrisp.zw), vec2(0.0));
        float far = smoothstep(0.0, uFade * 1.6, length(o));
        float low = 1.0 - smoothstep(0.0, 5.5, vGhostW.y);
        float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 grey = mix(gl_FragColor.rgb, vec3(l), 0.65);
        gl_FragColor.rgb = mix(grey, uHaze, clamp(0.5 + 0.42 * far + 0.3 * low, 0.0, 0.94));`);
  };
  m.customProgramCacheKey = () => 'ghost';
  return m;
}

function paintGhostGround(sur) {
  const W = Math.round((EXTENT.x1 - EXTENT.x0) * PPM), H = Math.round((EXTENT.z1 - EXTENT.z0) * PPM);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const X = x => (x - EXTENT.x0) * PPM, Z = z => (z - EXTENT.z0) * PPM;
  g.fillStyle = '#7d8253'; g.fillRect(0, 0, W, H);
  // stora mjuka fläckar: gräs, åker, skogsdunkel
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 160; i++) {
    const x = rnd() * W, y = rnd() * H, r = 30 + rnd() * 120;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, ['rgba(60,70,40,0.35)', 'rgba(150,140,95,0.3)', 'rgba(95,105,62,0.3)'][i % 3]);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // vägarna: ljusa, lite ojämna streck (skiss)
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const d of sur.districts) for (const rd of d.roads) {
    for (const [wd, col, a] of [[rd.width + 1.4, '#8e8a78', 0.5], [rd.width, '#a9a493', 0.9]]) {
      g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = wd * PPM;
      g.beginPath(); rd.pts.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke();
    }
  }
  g.globalAlpha = 1;
  // husens fotavtryck och tomter
  for (const d of sur.districts) for (const b of d.buildings) {
    g.save(); g.translate(X(b.x), Z(b.z)); g.rotate(-b.ry);
    g.fillStyle = 'rgba(140,150,100,0.5)'; g.fillRect(-(b.w / 2 + 3) * PPM, -(b.d / 2 + 3) * PPM, (b.w + 6) * PPM, (b.d + 6) * PPM);
    g.fillStyle = 'rgba(70,72,62,0.35)'; g.fillRect(-b.w / 2 * PPM, -b.d / 2 * PPM, b.w * PPM, b.d * PPM);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Dimskivan: genomskinlig inne i den skarpa ytan, tätnar utåt till nästan helt dis.
function fogSheet(crisp, fade) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uHaze: { value: HAZE }, uCrisp: { value: new THREE.Vector4(crisp.x0, crisp.z0, crisp.x1, crisp.z1) }, uFade: { value: fade } },
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uHaze; uniform vec4 uCrisp; uniform float uFade; varying vec3 vW;
      void main() {
        vec2 o = max(max(uCrisp.xy - vW.xz, vW.xz - uCrisp.zw), vec2(0.0));
        float d = length(o);
        float a = smoothstep(-4.0, uFade, d) * 0.62 + smoothstep(uFade, uFade * 2.6, d) * 0.33;
        gl_FragColor = vec4(uHaze, a);
        #include <colorspace_fragment>
      }`,
  });
  const w = EXTENT.x1 - EXTENT.x0, h = EXTENT.z1 - EXTENT.z0;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((EXTENT.x0 + EXTENT.x1) / 2, 0.08, (EXTENT.z0 + EXTENT.z1) / 2);
  mesh.renderOrder = 2;
  return mesh;
}

export function buildSurroundings(scene, map) {
  const sur = map.surroundings;
  const group = new THREE.Group();
  group.name = 'ghosts';

  // mark under allt (den skarpa marken ligger ovanpå inne i spelytan)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(EXTENT.x1 - EXTENT.x0, EXTENT.z1 - EXTENT.z0),
    new THREE.MeshLambertMaterial({ map: paintGhostGround(sur) }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((EXTENT.x0 + EXTENT.x1) / 2, -0.04, (EXTENT.z0 + EXTENT.z1) / 2);
  ground.receiveShadow = false;
  group.add(ground);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshBasicMaterial({ color: HAZE }));
  far.rotation.x = -Math.PI / 2; far.position.y = -0.08;
  group.add(far);

  // hus: kropp + tak, färg per instans (lite variation), allt i två anrop
  const all = sur.districts.flatMap(d => d.buildings);
  const bodies = new THREE.InstancedMesh(UNIT.box, ghostMaterial(sur.crisp, sur.fade, {}), all.length);
  const gables = all.filter(b => b.roof !== 'flat');
  const roofs = new THREE.InstancedMesh(UNIT.prism, ghostMaterial(sur.crisp, sur.fade, { side: THREE.DoubleSide }), Math.max(1, gables.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  let ri = 0;
  const lines = [], lineCols = [];
  all.forEach((b, i) => {
    q.setFromEuler(e.set(0, b.ry, 0));
    m4.compose(p.set(b.x, b.h / 2, b.z), q, s.set(b.w, b.h, b.d));
    bodies.setMatrixAt(i, m4);
    bodies.setColorAt(i, col.copy(WALL).offsetHSL(0, 0, ((i * 37) % 9 - 4) * 0.012));
    if (b.roof !== 'flat') {
      const rh = Math.min(b.w, b.d) * 0.32;
      m4.compose(p.set(b.x, b.h, b.z), q, s.set(b.w + 0.5, rh, b.d + 0.5));
      roofs.setMatrixAt(ri, m4);
      roofs.setColorAt(ri++, col.copy(ROOF).offsetHSL(0, 0, ((i * 53) % 7 - 3) * 0.015));
    }
    // konturer: takfot och hörn, tonade mot diset med avståndet
    const fadeK = Math.min(1, outside(sur.crisp, b.x, b.z) / (sur.fade * 1.6));
    const lc = col.copy(LINE).lerp(HAZE, 0.35 + 0.5 * fadeK);
    const cs = Math.cos(b.ry), sn = Math.sin(b.ry);
    const corner = (lx, lz, y) => [b.x + lx * cs + lz * sn, y, b.z - lx * sn + lz * cs];
    const cn = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => [a * b.w / 2, c * b.d / 2]);
    for (let k = 0; k < 4; k++) {
      const [ax, az] = cn[k], [bx, bz] = cn[(k + 1) % 4];
      lines.push(...corner(ax, az, b.h), ...corner(bx, bz, b.h));
      lines.push(...corner(ax, az, 0.05), ...corner(ax, az, b.h));
      for (let n = 0; n < 4; n++) lineCols.push(lc.r, lc.g, lc.b);
    }
  });
  roofs.count = ri;
  for (const im of [bodies, roofs]) {
    im.castShadow = false; im.receiveShadow = false;
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  lg.setAttribute('color', new THREE.Float32BufferAttribute(lineCols, 3));
  const outline = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false }));
  group.add(outline);

  group.add(fogSheet(sur.crisp, sur.fade));
  scene.add(group);
  return { group, stats: { buildings: all.length, calls: 6 } };
}
