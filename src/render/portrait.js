// Porträtten till fiendernas presentationsruta (0.16.0, Olas beslut 4): zombien ur sin 3D-modell, i spelets
// ljus och färger, renderad en gång utanför skärmen och sparad som bild. En egen liten renderare med en egen
// scen (spelets renderare och scen rörs inte), som släpps när porträttet är klart.
import * as THREE from 'three';
import { zombieModel, zombieWalk } from './models.js';
import { PALETTE as P } from './kit.js';

const cache = new Map();
const W = 240, H = 300;

// Bild-URL (data:) för typen, eller null om WebGL inte finns. Samma bild varje gång under sessionen.
export function portraitOf(type) {
  if (cache.has(type)) return cache.get(type);
  let url = null;
  try { url = render(type); } catch (err) { console.warn('Porträttet gick inte att rendera.', err); }
  cache.set(type, url);
  return url;
}

function render(type) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2b241b');
  scene.fog = new THREE.Fog('#2b241b', 4.5, 9);
  // samma låga eftermiddagssol som spelet, och ett rostfärgat motljus som ger konturen
  scene.add(new THREE.HemisphereLight(P.hemiSky, P.hemiGround, 0.6));
  const sun = new THREE.DirectionalLight(P.sun, 2.4); sun.position.set(-2.5, 3, 3); scene.add(sun);
  const rim = new THREE.DirectionalLight('#c0602e', 1.6); rim.position.set(2, 2, -3); scene.add(rim);
  // marken: mörk asfalt med en blodfläck
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 24), new THREE.MeshLambertMaterial({ color: '#3a342b' }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const z = zombieModel(type);
  zombieWalk(z, 1.3, 0.4);
  z.root.rotation.y = -0.45;
  scene.add(z.root);
  const s = z.scale ?? 1, top = 1.75 * s;
  const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 30);
  cam.position.set(0.9 * s, top * 0.8, 3.1 * s);
  cam.lookAt(0, top * 0.62, 0);
  renderer.render(scene, cam);
  const url = canvas.toDataURL('image/png');
  // zombiens geometrier och material delas med spelet (kit.js): bara marken släpps
  ground.geometry.dispose(); ground.material.dispose();
  renderer.dispose();
  renderer.forceContextLoss?.();
  return url;
}
