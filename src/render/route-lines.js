// Hordens väg på gatan (Gnesta). Två lager: vägen som gäller nu och förhandsvisningen när pekaren
// står på en gata: "de går runt kvarteret".
// 0.10.2 (speltestet av 0.10.1: de vita strecken såg ut som vägmarkering): vägen som gäller nu är
// roströda pilar (chevroner) som flyter mot basen, svagt; förhandsvisningen orange streck.
// Varje lager är en enda mesh som byggs om bara när vägen ändras.
import * as THREE from 'three';

// 0.10.1: vägen som gäller nu bredare och tydligare (den ligger kvar hela dagen)
// 0.10.2: bredare igen, så att pilarna syns som pilar i spelets zoom
// 0.16.1: danger, farozonerna där de civilas väg går in på hordens (src/sim/evac-danger.js), röda fläckar på den gula
const WIDTH = { now: 1.8, preview: 0.6, evac: 1.1, danger: 3.4 };
const Y = { now: 0.09, preview: 0.1, evac: 0.115, danger: 0.125 };

// Rutnätets trappsteg tas bort (Ramer-Douglas-Peucker), sedan rundas hörnen av (Chaikin), så
// att bandet följer gatan i stället för att slingra sig ruta för ruta.
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, az] = pts[0], [bx, bz] = pts[pts.length - 1];
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
  let worst = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / L;
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)];
}
function soften(pts, rounds = 3) {
  let p = simplify(pts, 1.6);
  for (let r = 0; r < rounds && p.length > 2; r++) {
    const out = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i], [bx, bz] = p[i + 1];
      out.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}

// Band längs en linje: två hörn per punkt, v längs bandet (för streckningen i skuggningen).
function ribbon(lines, width, y) {
  const pos = [], uv = [], idx = [];
  let base = 0;
  for (const pts of lines) {
    if (pts.length < 2) continue;
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x, z] = pts[i];
      const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)];
      let dx = bx - ax, dz = bz - az; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      if (i) acc += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
      pos.push(x - dz * width / 2, y, z + dx * width / 2, x + dz * width / 2, y, z - dx * width / 2);
      uv.push(0, acc, 1, acc);
      if (i) idx.push(base + 2 * i - 2, base + 2 * i - 1, base + 2 * i, base + 2 * i - 1, base + 2 * i + 1, base + 2 * i);
    }
    base += pts.length * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function material(color, opacity, dash) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uDash: { value: dash }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uDash; uniform float uTime; varying vec2 vUv;
      void main() {
        float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
        float d = uDash > 0.0 ? smoothstep(0.35, 0.5, fract(vUv.y / uDash - uTime)) * smoothstep(1.0, 0.85, fract(vUv.y / uDash - uTime)) : 1.0;
        gl_FragColor = vec4(uColor, uOpacity * edge * mix(0.35, 1.0, d));
        #include <colorspace_fragment>
      }`,
  });
}
// Pilar längs bandet: v (meter längs vägen) ökar från ingången mot basen, så spetsen pekar mot
// basen och mönstret flyter dit med uTime. Ett svagt band under binder ihop pilarna.
function chevrons(color, opacity, period) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uPeriod: { value: period }, uTime: { value: 0 }, uFloor: { value: 0.22 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uPeriod; uniform float uTime; uniform float uFloor; varying vec2 vUv;
      void main() {
        float cx = abs(vUv.x - 0.5) * 2.0;
        float t = fract(vUv.y / uPeriod - uTime) + cx * 0.42;
        float arm = smoothstep(0.44, 0.5, t) * (1.0 - smoothstep(0.66, 0.72, t));
        float edge = 1.0 - smoothstep(0.82, 1.0, cx);
        float a = max(arm, uFloor) * edge;
        gl_FragColor = vec4(uColor, uOpacity * a);
        #include <colorspace_fragment>
      }`,
  });
}

// 0.14.1 (speltestet av 0.14.0: "jag såg aldrig en enda civil"): de civilas väg till ishallen, gula pilar
const THREAT = 0xc2321c, PREVIEW = 0xe8823a, EVAC = 0xf2c46b, DANGER = 0xff4a22;
export function createRouteLines(scene) {
  const layers = {
    now: new THREE.Mesh(new THREE.BufferGeometry(), chevrons(THREAT, 0.55, 2.6)),
    preview: new THREE.Mesh(new THREE.BufferGeometry(), material(PREVIEW, 0.85, 2.0)),
    evac: new THREE.Mesh(new THREE.BufferGeometry(), chevrons(EVAC, 0.8, 2.2)),
    danger: new THREE.Mesh(new THREE.BufferGeometry(), material(DANGER, 0.95, 0)),
  };
  for (const [k, m] of Object.entries(layers)) { m.renderOrder = 4; m.frustumCulled = false; m.visible = false; m.name = 'route-' + k; scene.add(m); }
  const keys = { now: '', preview: '', evac: '', danger: '' };
  layers.evac.renderOrder = 5; layers.danger.renderOrder = 6;
  // paths: [{ cells: [x, z][] }] i världskoordinater. key: ändras när vägen ändras.
  function set(layer, paths, key) {
    const m = layers[layer];
    if (!paths) { m.visible = false; keys[layer] = ''; return; }
    m.visible = true;
    if (key === keys[layer]) return;
    keys[layer] = key;
    m.geometry.dispose();
    m.geometry = ribbon(paths.map(p => soften(p)), WIDTH[layer], Y[layer]);
  }
  function update(dt) { for (const m of Object.values(layers)) m.material.uniforms.uTime.value += dt * 0.6; }
  // 0.11.0 (H090, speltestet av 0.10.2: en inre gata syntes knappt före vågen): 1 före vågen, då
  // vägarna är förhandsvisningen spelaren bygger efter; lägre under vågen, då horden själv syns.
  function strength(k) {
    const u = layers.now.material.uniforms;
    u.uOpacity.value = 0.55 + 0.35 * k; u.uFloor.value = 0.22 + 0.2 * k;
  }
  return { set, update, strength, layers };
}
