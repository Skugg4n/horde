// Renderer, kamera och ljus. Samma sol, dis och tonmappning som prov 1.
// En renderare räcker för hela spelet: byts banan byggs bara scenen, kameran och ljuset om
// (opts.renderer). Banor med rutnät (Gnesta) får längre dis och en skuggkamera över hela ytan.
import * as THREE from 'three';
import { PALETTE as P } from './kit.js';
import { fitShadow } from './camera-rig.js';

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createScene(container, map, opts = {}) {
  const renderer = opts.renderer ?? createRenderer(container);

  const HAZE = new THREE.Color(P.haze);
  const scene = new THREE.Scene();
  scene.background = HAZE;
  scene.fog = new THREE.Fog(HAZE, 70, 120);

  const [tx, tz] = map.camera.target;
  const VIEW = map.camera.view;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  camera.position.set(tx + 40, 46, tz + 40);
  camera.lookAt(tx, 0, tz);

  function resize() {
    const w = innerWidth, h = innerHeight, a = w / h;
    renderer.setSize(w, h);
    const v = a < 1 ? VIEW * 1.5 : VIEW;
    camera.left = -v * a / 2; camera.right = v * a / 2; camera.top = v / 2; camera.bottom = -v / 2;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  const dispose = () => removeEventListener('resize', resize);

  // Låg eftermiddagssol: långa skuggor över vägen
  scene.add(new THREE.HemisphereLight(P.hemiSky, P.hemiGround, 0.75));
  const sun = new THREE.DirectionalLight(P.sun, 2.6);
  sun.position.set(-34, 30, 26);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 160 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  // Svag kall fyllning från kamerans håll: zombiernas ryggar ligger i skugga, så kläderna
  // behöver lite ljus för att synas. Inga skuggor.
  const fill = new THREE.DirectionalLight(P.fill, 0.6);
  fill.position.set(tx + 40, 46, tz + 40);
  fill.target.position.set(tx, 0, tz);
  scene.add(fill, fill.target);

  // Stor bana: längre dis (kameran står längre ut) och skuggan över hela spelytan.
  if (map.grid) {
    scene.fog.near = 95; scene.fog.far = 210;
    camera.far = 600; camera.updateProjectionMatrix();
    sun.shadow.mapSize.set(4096, 4096);
    const g = map.grid, x0 = g.origin[0], z0 = g.origin[1];
    fitShadow(sun, map.shadowBounds ?? { x0, x1: x0 + g.w * g.cellSize, z0, z1: z0 + g.h * g.cellSize });
  }

  return { renderer, scene, camera, sun, fill, resize, dispose };
}
