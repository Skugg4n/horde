// Horden som instanser: en InstancedMesh per kroppsdel (delad geometri) i stället för 16 meshar
// per zombie. Varje zombie har kvar sitt skelett (modellen från zombieModel, med leder och delar)
// men det läggs aldrig i scenen. Vyn ställer posen som förut (zombieWalk, zombieAttack,
// zombieFall), och här räknas varje dels världsmatris ut på processorn och skrivs till sin
// instans, med zombiens egen färg per del (instanceColor).
//
// Anropen blir ungefär antalet olika delgeometrier (8 per typ plus en enhetskub för trasor och
// fläckar), gånger två för skuggpasset, oberoende av hur många zombier som går.
//
// Liggande kroppar ritas i en egen uppsättning utan skugga. Deras matriser fryses när fallet är
// klart och skrivs om bara när en kropp läggs till, tas bort eller kastas av en smäll.
//
// Inga allokeringar per bildruta: matriserna kopieras rakt in i instansbuffertarna.
import * as THREE from 'three';

const START = 256;   // instanser per del från början; växer med fördubbling vid behov

// Ett gemensamt material för alla delar. Färgen kommer per instans, så materialet är vitt.
// Samma värden som mat() i byggsatsen (matt, platt skuggning).
function hordeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, flatShading: true });
  m.userData.own = true;
  return m;
}

function makeBatch(scene, material, geometry, castShadow) {
  const b = { geometry, castShadow, mesh: null, cap: 0, count: 0 };
  grow(scene, material, b, START);
  return b;
}
function grow(scene, material, b, cap) {
  const old = b.mesh;
  const m = new THREE.InstancedMesh(b.geometry, material, cap);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  // Instanserna är utspridda över hela banan; geometrins egen sfär säger inget om dem.
  m.frustumCulled = false;
  m.castShadow = b.castShadow; m.receiveShadow = true;
  m.count = 0; m.visible = false;
  if (old) {
    m.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, b.cap * 16));
    m.instanceColor.array.set(old.instanceColor.array.subarray(0, b.cap * 3));
    old.removeFromParent(); old.dispose();
  }
  b.mesh = m; b.cap = cap;
  scene.add(m);
}

export function createHorde(scene) {
  const material = hordeMaterial();
  const live = new Map();     // geometri + skugga → batch (levande och fallande)
  const dead = new Map();     // geometri → batch (liggande kroppar, ingen skugga)
  let corpsesDirty = true;
  const corpseList = [];      // registrerade kroppar i ritordning

  function batchOf(map, geometry, shadow) {
    const key = shadow ? geometry.uuid + ':s' : geometry.uuid;
    let b = map.get(key);
    if (!b) { b = makeBatch(scene, material, geometry, shadow); map.set(key, b); }
    return b;
  }
  function push(b, matrix, rgb, j) {
    if (b.count >= b.cap) grow(scene, material, b, b.cap * 2);
    const i = b.count++;
    matrix.toArray(b.mesh.instanceMatrix.array, i * 16);
    const c = b.mesh.instanceColor.array;
    c[i * 3] = rgb[j]; c[i * 3 + 1] = rgb[j + 1]; c[i * 3 + 2] = rgb[j + 2];
  }

  // Skelettet: delarna (meshar) med geometri, skugga och färg. Anropas en gång per zombie.
  function attach(parts) {
    const meshes = [];
    parts.root.traverse(o => { if (o.isMesh) meshes.push(o); });
    const rgb = new Float32Array(meshes.length * 3);
    const liveB = [], deadB = [];
    meshes.forEach((o, i) => {
      const c = o.material.color;           // redan linjär (färghanteringen i three.js)
      rgb[i * 3] = c.r; rgb[i * 3 + 1] = c.g; rgb[i * 3 + 2] = c.b;
      liveB.push(batchOf(live, o.geometry, o.castShadow));
      deadB.push(batchOf(dead, o.geometry, false));
    });
    parts.inst = { meshes, rgb, liveB, deadB, frozen: null, corpse: false };
    return parts.inst;
  }

  function begin() { for (const b of live.values()) b.count = 0; }

  // Ritar zombien i sin nuvarande pose (levande, slår eller faller).
  function draw(parts) {
    const s = parts.inst;
    parts.root.updateMatrixWorld(true);
    for (let i = 0; i < s.meshes.length; i++) push(s.liveB[i], s.meshes[i].matrixWorld, s.rgb, i * 3);
  }

  // Kroppen ligger still: frys matriserna. Anropas igen när en smäll flyttar den.
  function freeze(parts) {
    const s = parts.inst;
    parts.root.updateMatrixWorld(true);
    if (!s.frozen) s.frozen = new Float32Array(s.meshes.length * 16);
    for (let i = 0; i < s.meshes.length; i++) s.meshes[i].matrixWorld.toArray(s.frozen, i * 16);
    if (!s.corpse) { s.corpse = true; corpseList.push(parts); }
    corpsesDirty = true;
  }
  function release(parts) {
    const s = parts.inst;
    if (!s || !s.corpse) return;
    s.corpse = false;
    const i = corpseList.indexOf(parts);
    if (i >= 0) corpseList.splice(i, 1);
    corpsesDirty = true;
  }

  const tmp = new THREE.Matrix4();
  function writeCorpses() {
    for (const b of dead.values()) b.count = 0;
    for (const parts of corpseList) {
      const s = parts.inst;
      for (let i = 0; i < s.meshes.length; i++) push(s.deadB[i], tmp.fromArray(s.frozen, i * 16), s.rgb, i * 3);
    }
    for (const b of dead.values()) finish(b);
    corpsesDirty = false;
  }
  function finish(b) {
    const m = b.mesh;
    m.count = b.count; m.visible = b.count > 0;
    if (b.count) {
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
    }
  }

  function end() {
    for (const b of live.values()) finish(b);
    if (corpsesDirty) writeCorpses();
  }

  function clear() {
    corpseList.length = 0;
    for (const b of live.values()) b.count = 0;
    for (const b of dead.values()) b.count = 0;
    for (const b of live.values()) finish(b);
    for (const b of dead.values()) finish(b);
    corpsesDirty = false;
  }

  // Antal anrop i huvudpasset om allt syns (felsökning).
  const batches = () => live.size + dead.size;
  const stats = () => ({ corpses: corpseList.length, live: [...live.values()].map(b => b.count), dead: [...dead.values()].map(b => b.count) });

  return { attach, begin, draw, freeze, release, end, clear, batches, stats, material };
}
