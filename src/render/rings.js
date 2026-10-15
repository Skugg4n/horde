// Hälsoring på marken under zombierna. En InstancedMesh med en platt fyrkant per zombie;
// skuggningen ritar ringen och skär bågen efter hälsan, så ingen geometri skapas per bildruta.
// Färgen går från benvitt till rost när hälsan är låg. Bågen börjar uppe i bild och töms medsols.
import * as THREE from 'three';
import { PALETTE as P } from './kit.js';

const RADIUS = 0.62;          // meter vid skala 1
const BAND = 0.075;           // ringens bredd i meter vid skala 1

const vertex = /* glsl */`
  attribute vec2 aRing;       // x: hälsa 0..1, y: synlig (0/1)
  varying vec2 vUv;
  varying vec2 vRing;
  void main() {
    vUv = uv * 2.0 - 1.0;
    vRing = aRing;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }`;
const fragment = /* glsl */`
  uniform vec3 uBone;
  uniform vec3 uRust;
  uniform float uInner;
  uniform float uStart;
  varying vec2 vUv;
  varying vec2 vRing;
  void main() {
    if (vRing.y < 0.5) discard;
    float r = length(vUv);
    float edge = fwidth(r);
    float band = smoothstep(uInner - edge, uInner, r) * (1.0 - smoothstep(1.0 - edge, 1.0, r));
    if (band <= 0.0) discard;
    // vinkel 0..1 medsols från uStart
    float a = fract((uStart - atan(vUv.y, vUv.x)) / 6.2831853);
    float frac = clamp(vRing.x, 0.0, 1.0);
    float on = step(a, frac);
    vec3 col = mix(uRust, uBone, smoothstep(0.2, 0.6, frac));
    // den tömda delen syns svagt, så att man ser hur mycket som är borta
    gl_FragColor = vec4(mix(vec3(0.08), col, on), band * mix(0.22, 0.9, on));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// startAngle: var bågen börjar, i ringens eget plan (radianer, 0 = +x). Standard: uppe i bild
// för spelets kamera (kameran står vid +x +z och ser mot -x -z, upp i bild är -x -z på marken).
export function createHealthRings(scene, capacity = 256) {
  const geometry = new THREE.PlaneGeometry(2, 2);
  geometry.rotateX(-Math.PI / 2);
  const ring = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
  ring.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aRing', ring);
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment,
    uniforms: {
      uBone: { value: new THREE.Color(P.paper) },
      uRust: { value: new THREE.Color(P.rust) },
      uInner: { value: 1 - BAND / RADIUS },
      // plan efter rotateX(-90°): uv.x längs +x, uv.y längs -z. Uppe i bild = riktning (-1, 0, -1).
      uStart: { value: Math.atan2(1, -1) },
    },
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.renderOrder = 1;
  scene.add(mesh);

  const m = new THREE.Matrix4();
  let n = 0;
  // Varje bildruta: begin(), sedan add() för varje ring som ska synas, sist end().
  function begin() { n = 0; }
  function add(x, z, frac, scale = 1) {
    if (n >= capacity) return;
    const r = RADIUS * scale;
    m.makeScale(r, 1, r); m.setPosition(x, 0.045, z);
    mesh.setMatrixAt(n, m);
    ring.array[n * 2] = frac; ring.array[n * 2 + 1] = 1;
    n++;
  }
  function end() {
    mesh.count = n;
    if (n) { mesh.instanceMatrix.needsUpdate = true; ring.needsUpdate = true; }
  }
  function dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); }
  return { mesh, begin, add, end, dispose };
}
