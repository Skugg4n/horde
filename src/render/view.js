// Vyn: läser simuleringens tillstånd och händelser och visar dem i scenen.
// consume(events) anropas efter varje steg, sync(dt) en gång per bildruta.
import * as THREE from 'three';
import { rnd, geo, PALETTE } from './kit.js';
import { createFx } from './fx.js';
import { createHealthRings } from './rings.js';
import { createHorde } from './horde.js';
import { weaponModel, obstacleModel, setObstacleWear, zombieModel, zombieWalk, zombieAttack, zombieFall, seedZombie, weaponGhost, obstacleGhost, setGhostTone, disposeModel, baseModel, setBaseGlow, rinkEntranceModel, setBaseDamage } from './models.js';
import { ZOMBIES } from '../data/zombies.js';
import { CELL_LEN } from '../sim/sim.js';

const FALL_TIME = 0.3;
// Högst så många liggande kroppar visas; de äldsta tas bort först. Simuleringen behåller
// sina döda i 20 s oavsett, det här styr bara hur mycket som ritas.
const MAX_CORPSES = 24;
const STEP_PHASE = 2.6;          // gångfas per meter
// Osynlig träffskiva under varje pjäs (delad, städas aldrig).
const HIT_GEO = new THREE.CircleGeometry(2.4, 24);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });

// Zombiens läge och riktning frågas av rutten (E4: väglinjen, Gnesta: rutnätet).
function place(out, sim, z) {
  const p = sim.route.place(z);
  out.x = p.x; out.z = p.z; out.dirX = p.dirX; out.dirZ = p.dirZ;
  return out;
}

const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Hur skotten ser ut per vapen. Bara bild: eldhastigheten kommer från simuleringen.
// kick: rekyl bakåt i meter, rise: mynningen lyfts (radianer), back: hur fort pjäsen går tillbaka,
// rattle: skakning mellan skotten (lätt kulspruta).
const SHOT_LOOK = {
  m2: { tracer: 'heavy', flash: 'heavy', kick: 0.24, rise: 0.12, back: 9, rattle: 0, smoke: true },
  m249: { tracer: 'light', flash: 'light', kick: 0.05, rise: 0.025, back: 22, rattle: 0.012, smoke: false },
  ksp58: { tracer: 'light', flash: 'light', kick: 0.09, rise: 0.05, back: 16, rattle: 0.01, smoke: false },
  ak5: { tracer: 'light', flash: 'light', kick: 0.06, rise: 0.06, back: 18, rattle: 0, smoke: false },
  psg90: { tracer: 'heavy', flash: 'heavy', kick: 0.12, rise: 0.18, back: 5, rattle: 0, smoke: true },
};

export function createView(scene, initialSim) {
  let sim = initialSim;
  const fx = createFx(scene);
  const rings = createHealthRings(scene);
  // Zombierna ritas som instanser (horde.js): skelettet per zombie ligger utanför scenen.
  const horde = createHorde(scene);
  const zombies = new Map();      // id → { z: modelldelar, x, z, phase, fall, ry }
  let corpses = [];               // id på liggande kroppar, äldst först
  const slots = new Map();        // pjäsens id → { key, group, model, angle }
  const cells = new Map();        // index → { type, group, frac }
  const slotObjects = new Map(), cellObjects = new Map();
  const lastChip = new Map();
  const P = { x: 0, z: 0, dirX: 0, dirZ: 0 };
  const from = new THREE.Vector3(), to = new THREE.Vector3();
  let frame = 0, clock = 0;

  // ---------- zombier ----------
  function addZombie(z) {
    const parts = zombieModel(z.type);
    seedZombie(parts, z.id);
    place(P, sim, z);
    parts.root.position.set(P.x, 0, P.z);
    const e = { parts, x: P.x, z: P.z, phase: z.wob * STEP_PHASE, fall: 0, ry: Math.atan2(P.dirX, P.dirZ), seen: frame, chop: rnd(0, 6) };
    parts.root.rotation.y = e.ry;
    horde.attach(parts);
    zombies.set(z.id, e);
    return e;
  }
  function removeZombie(id, e) {
    horde.release(e.parts);
    disposeModel(e.parts.root);
    zombies.delete(id);
  }
  function syncZombies(dt) {
    const k = 1 - Math.exp(-dt * 22);
    rings.begin();
    horde.begin();
    for (const z of sim.zombies) {
      if (z.breached) continue;
      let e = zombies.get(z.id);
      if (!e) { if (z.dead) continue; e = addZombie(z); }
      e.seen = frame;
      const parts = e.parts;
      if (!z.dead) place(P, sim, z); else { P.x = e.x; P.z = e.z; }
      e.x += (P.x - e.x) * k; e.z += (P.z - e.z) * k;
      if (e.fling) {
        // Kastad av en smäll: glider ut, hoppar och landar. Bara bild, simuleringen rör sig inte.
        const f = e.fling;
        f.vy -= 22 * dt; f.oy = Math.max(0, f.oy + f.vy * dt);
        if (f.oy > 0 || f.vy > 0) { f.ox += f.vx * dt; f.oz += f.vz * dt; f.spin += dt * f.vr; }
        else { f.vy = 0; f.vx *= Math.exp(-dt * 8); f.vz *= Math.exp(-dt * 8); f.ox += f.vx * dt; f.oz += f.vz * dt; }
        parts.root.position.set(e.x + f.ox, f.oy, e.z + f.oz);
        parts.root.rotation.y = e.ry + f.spin;
      } else parts.root.position.set(e.x, 0, e.z);
      if (z.dead) {
        // faller bakåt och ligger kvar
        if (e.fall < 1) {
          e.fall = Math.min(1, e.fall + dt / FALL_TIME);
          zombieFall(parts, e.fall * e.fall);
          if (e.fall === 1) {
            // ligger still: frysta matriser i kroppsuppsättningen, utan skugga
            horde.freeze(parts);
            corpses.push(z.id);
            while (corpses.length > MAX_CORPSES) {
              const old = corpses.shift(), oe = zombies.get(old);
              if (oe) removeZombie(old, oe);
            }
          } else horde.draw(parts);
        } else if (e.fling && !e.fling.rest) {
          // en liggande kropp som kastas: frys om i varje bildruta tills den ligger still
          const f = e.fling;
          if (f.oy <= 0 && f.vy <= 0 && Math.abs(f.vx) + Math.abs(f.vz) < 0.02) f.rest = true;
          horde.freeze(parts);
        }
        continue;
      }
      // hälsoringen syns först när zombien tagit skada
      if (z.hp < z.maxHp) rings.add(e.x, e.z, z.hp / z.maxHp, Math.min(1.35, parts.scale));
      // vrider sig mjukt mot gångriktningen (rutnätets svängar blir inte ryck)
      e.ry += angleDiff(e.ry, Math.atan2(P.dirX, P.dirZ)) * Math.min(1, dt * 9);
      parts.root.rotation.y = e.ry;
      e.phase += (z.wob * STEP_PHASE - e.phase) * k;
      if (z.attacking) {
        // slår med armarna mot hindret
        e.chop += dt * 11;
        zombieAttack(parts, e.chop, clock);
      } else {
        zombieWalk(parts, e.phase, clock);
      }
      horde.draw(parts);
    }
    rings.end();
    for (const [id, e] of zombies) if (e.seen !== frame) removeZombie(id, e);
    if (corpses.length && corpses.some(id => !zombies.has(id))) corpses = corpses.filter(id => zombies.has(id));
    horde.end();
  }

  // ---------- utställda vapen ----------
  // Varje pjäs får userData.pick och en osynlig träffskiva, så att den går att klicka på även
  // när en liten pjäs står där. Byggs om när vapen, nivå eller låda ändras.
  function slotKey(s) { return s.weapon.type + ':' + s.weapon.level + (s.weapon.kit ? ':kit' : '') + (s.roof ? ':roof' : ''); }
  function buildSlot(s, old) {
    if (old) disposeModel(old.group);
    // En pjäs på ett tak (Psg 90) står på takets höjd (s.y, simuleringen räknar fram den).
    const model = weaponModel(s.weapon.type, s.weapon.level, { kit: !!s.weapon.kit, roof: !!s.roof });
    const e = { key: slotKey(s), group: model.group, model, angle: old?.angle ?? s.weapon.angle };
    model.pivot.rotation.y = -e.angle;
    e.pivotHome = model.pivot.position.clone();
    e.recoil = 0;
    e.look = SHOT_LOOK[s.weapon.type] || SHOT_LOOK.m249;
    const hit = new THREE.Mesh(HIT_GEO, HIT_MAT);
    hit.rotation.x = -Math.PI / 2; hit.position.y = 0.1;
    e.group.add(hit);
    e.group.userData.pick = { kind: 'gun', id: s.id };
    e.group.position.set(s.x, s.y ?? 0, s.z);
    scene.add(e.group);
    e.group.updateMatrixWorld(true);
    slots.set(s.id, e); slotObjects.set(s.id, e.group);
    return e;
  }
  function removeSlot(id) {
    const e = slots.get(id); if (!e) return;
    disposeModel(e.group);
    slots.delete(id); slotObjects.delete(id);
  }
  // Befästa positioner (fortify.js): varje ruta som haft en pjäs i dag röjs. En såld pjäs lämnar
  // skadan; en ny dag börjar med orörd rekvisita.
  const dug = new Map();          // rutans nyckel -> { x, z, key }
  const onRoad = (x, z) => { const k = sim.place.keyAt(x, z); return k >= 0 && sim.place.kind[k] === 1; };
  function syncDug() {
    let added = false;
    // Skyttar på taken röjer ingenting på marken.
    for (const s of sim.guns) if (!s.roof && !dug.has(s.cell)) { dug.set(s.cell, { x: s.x, z: s.z, key: s.cell }); added = true; }
    if (added) scene.userData.fortify?.setPositions([...dug.values()], { road: onRoad });
  }
  function syncSlots(dt) {
    const k = 1 - Math.exp(-dt * 12);
    const alive = new Set();
    syncDug();
    for (const s of sim.guns) {
      alive.add(s.id);
      let e = slots.get(s.id);
      if (!e || e.key !== slotKey(s)) e = buildSlot(s, e);
      const w = s.weapon;
      if (w.targetId != null) e.angle += angleDiff(e.angle, w.angle) * k;
      const pv = e.model.pivot;
      pv.rotation.y = -e.angle;
      // Rekyl: pjäsen stöts bakåt längs pipan och mynningen lyfts, sedan tillbaka.
      if (dt > 0) e.recoil *= Math.exp(-dt * e.look.back);
      const r = e.recoil < 0.01 ? 0 : e.recoil;
      // Pausad (dt 0): rekylen står still, inget jitter bakom menyn.
      const back = r * e.look.kick, jit = dt > 0 && r ? e.look.rattle : 0;
      pv.position.set(
        e.pivotHome.x - Math.cos(e.angle) * back + rnd(-jit, jit),
        e.pivotHome.y + rnd(-jit, jit),
        e.pivotHome.z - Math.sin(e.angle) * back + rnd(-jit, jit));
      pv.rotation.z = r * e.look.rise;
    }
    for (const id of [...slots.keys()]) if (!alive.has(id)) removeSlot(id);
  }

  // ---------- placering: spöket och sikten ----------
  // Spöket: vapnets modell i grönt eller rött, i rutan under pekaren. Sikten: de gångbara rutor
  // inom räckhåll som pjäsen ser, som ljusa plattor. Rutor bakom husen får ingen platta.
  const ghosts = new Map();       // typ → spökmodell (byggs en gång)
  let ghostOn = null;
  function syncGhost() {
    const g = ui.ghost;
    const gk = g ? g.type + (g.roof ? ':roof' : '') : null;
    if (ghostOn && (!g || ghostOn.key !== gk)) { ghostOn.group.visible = false; ghostOn = null; }
    if (!g) return;
    let e = ghosts.get(gk);
    if (!e) { e = { key: gk, group: weaponGhost(g.type, { roof: !!g.roof }) }; scene.add(e.group); ghosts.set(gk, e); }
    ghostOn = e;
    e.group.visible = true;
    e.group.position.set(g.x, g.y ?? 0, g.z);
    setGhostTone(e.group, g.ok);
  }
  // Hindret i handen: en spökmodell per ruta det skulle ta (en spärr över hela gatan på Gnesta).
  const obGhosts = new Map();     // typ -> [grupper]
  function syncObGhost() {
    const g = ui.obGhost;
    for (const [type, list] of obGhosts) list.forEach((e, i) => { e.visible = !!g && g.type === type && i < g.cells.length; });
    if (!g) return;
    let list = obGhosts.get(g.type);
    if (!list) { list = []; obGhosts.set(g.type, list); }
    const grid = sim.route.kind === 'grid';
    while (list.length < g.cells.length) {
      const e = obstacleGhost(g.type, grid ? { span: sim.route.grid.size } : undefined);
      scene.add(e); list.push(e);
    }
    g.cells.forEach((c, i) => {
      const e = list[i];
      e.visible = true;
      e.position.set(c.x, 0, c.z); e.rotation.y = c.ry;
      setGhostTone(e, g.ok);
    });
  }
  const tm = new THREE.Matrix4();
  const COVER_MAX = 1600;
  // Rutorna pjäsen ser: kraftig fyllning i en kall färg (syns på både E4:s asfalt och Gnestas
  // ljusa gräs och gator) plus en mörk kant runt varje ruta (0.5.2, speltestet såg dem knappt).
  const COVER_OK = '#2fc4e6';
  const coverM = new THREE.MeshBasicMaterial({ color: COVER_OK, transparent: true, opacity: 0.45, depthWrite: false });
  const coverGeo = new THREE.PlaneGeometry(1, 1); coverGeo.rotateX(-Math.PI / 2);
  const cover = new THREE.InstancedMesh(coverGeo, coverM, COVER_MAX);
  cover.count = 0; cover.frustumCulled = false; cover.renderOrder = 2; cover.castShadow = false;
  scene.add(cover);
  const edgeShape = new THREE.Shape([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)));
  edgeShape.holes.push(new THREE.Path([[-0.4, -0.4], [-0.4, 0.4], [0.4, 0.4], [0.4, -0.4]].map(([x, y]) => new THREE.Vector2(x, y))));
  const edgeGeo = new THREE.ShapeGeometry(edgeShape); edgeGeo.rotateX(-Math.PI / 2);
  const edgeM = new THREE.MeshBasicMaterial({ color: '#0d2a33', transparent: true, opacity: 0.7, depthWrite: false });
  const coverEdge = new THREE.InstancedMesh(edgeGeo, edgeM, COVER_MAX);
  coverEdge.count = 0; coverEdge.frustumCulled = false; coverEdge.renderOrder = 3; coverEdge.castShadow = false;
  scene.add(coverEdge);
  let coverKey = '';
  function syncCover() {
    const c = ui.cover;
    const key = c ? `${c.id}|${c.x},${c.z},${c.r}|${c.tone}` : '';
    if (key === coverKey) return;
    coverKey = key;
    let n = 0;
    if (c) {
      const p = sim.place, size = p.size;
      for (const k of c.keys) {
        const q = p.center(k);
        if (Math.hypot(q.x - c.x, q.z - c.z) > c.r) continue;
        if (n >= COVER_MAX) break;
        tm.makeScale(size * 0.92, 1, size * 0.92); tm.setPosition(q.x, 0.065, q.z);
        cover.setMatrixAt(n, tm);
        tm.setPosition(q.x, 0.07, q.z);
        coverEdge.setMatrixAt(n++, tm);
      }
      const bad = c.tone === 'bad';
      coverM.color.set(bad ? PALETTE.rust : COVER_OK);
      coverM.opacity = bad ? 0.3 : c.tone === 'ok' ? 0.5 : 0.4;
      edgeM.color.set(bad ? '#3a120a' : '#0d2a33');
      edgeM.opacity = bad ? 0.45 : 0.7;
    }
    cover.count = n; coverEdge.count = n;
    cover.instanceMatrix.needsUpdate = true;
    coverEdge.instanceMatrix.needsUpdate = true;
  }

  // ---------- rutor på vägen (streckade rektanglar, syns i byggläget) ----------
  const cellMarks = [];
  function buildCellMarks() {
    for (const c of cellMarks) disposeModel(c.group);
    cellMarks.length = 0;
    if (sim.route.kind !== 'path') return;     // rutnätet har för många rutor: se tiles nedan
    const W = 8.6, L = CELL_LEN - 0.3;
    for (let i = 0; i < sim.map.cells.length; i++) {
      const group = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.28, depthWrite: false });
      const fillM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.1, depthWrite: false });
      m.userData.own = fillM.userData.own = true;
      const dash = (x, z, len, along) => {
        const d = new THREE.Mesh(geo('plane', along ? len : 0.14, along ? 0.14 : len), m);
        d.rotation.x = -Math.PI / 2; d.position.set(x, 0.05, z); group.add(d);
      };
      for (let x = -L / 2; x < L / 2 - 0.1; x += 0.8) { const len = Math.min(0.5, L / 2 - x); dash(x + len / 2, -W / 2, len, true); dash(x + len / 2, W / 2, len, true); }
      for (let z = -W / 2; z < W / 2 - 0.1; z += 0.8) { const len = Math.min(0.5, W / 2 - z); dash(-L / 2, z + len / 2, len, false); dash(L / 2, z + len / 2, len, false); }
      const fill = new THREE.Mesh(geo('plane', L, W), fillM);
      fill.rotation.x = -Math.PI / 2; fill.position.y = 0.04;
      group.add(fill);
      const c = cellCenter(i);
      group.position.set(c.x, 0, c.z);
      group.rotation.y = Math.atan2(-c.dirZ, c.dirX);
      group.userData.pick = { kind: 'cell', index: i };
      scene.add(group);
      cellMarks.push({ group, m, fill, fillM, state: null });
    }
  }
  function syncCellMarks() {
    // Rutorna syns hela dagen (det går att bygga även under vågen), lite svagare medan
    // zombierna går. Varje ruta har en svag fyllning så att den läses som en platta och
    // vägen mellan rutorna inte ser ut som en egen ruta.
    // 0.6.0: rutorna syns bara när ett hinder är i handen (köpraden), annars bara den som pekas på
    // eller är vald (ett utlagt hinder).
    const open = (sim.phase === 'build' || sim.phase === 'wave') && ui.marks;
    const calm = sim.phase === 'build';
    for (let i = 0; i < cellMarks.length; i++) {
      const c = cellMarks[i];
      const want = isSel('cell', i) ? 'selected' : !open ? 'hidden' : isHov('cell', i) ? 'hover' : calm ? 'idle' : 'quiet';
      if (c.state === want) continue;
      c.state = want;
      for (const ch of c.group.children) ch.visible = want !== 'hidden';
      c.m.color.set(want === 'selected' ? PALETTE.rust : PALETTE.paper);
      c.m.opacity = { selected: 0.9, hover: 0.7, idle: 0.32, quiet: 0.16 }[want] ?? 0;
      c.fillM.color.set(want === 'selected' ? PALETTE.rust : PALETTE.paper);
      c.fillM.opacity = { selected: 0.18, hover: 0.12, idle: 0.05, quiet: 0.025 }[want] ?? 0;
    }
  }

  // ---------- rutor på rutnätet (Gnesta) ----------
  // Rutan under pekaren och rutorna en spärr tvärs över gatan skulle ta, som ljusa plattor.
  // En InstancedMesh, högst 24 plattor.
  const TILE_MAX = 24;
  const TILE_OK = '#7fd36b';
  const tileM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.3, depthWrite: false });
  const tileEdgeM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.75, depthWrite: false });
  const tileGeo = new THREE.PlaneGeometry(1, 1); tileGeo.rotateX(-Math.PI / 2);
  const tileEdgeGeo = new THREE.RingGeometry(0.62, 0.7, 4, 1, Math.PI / 4); tileEdgeGeo.rotateX(-Math.PI / 2);
  const tiles = new THREE.InstancedMesh(tileGeo, tileM, TILE_MAX), tileEdges = new THREE.InstancedMesh(tileEdgeGeo, tileEdgeM, TILE_MAX);
  for (const t of [tiles, tileEdges]) { t.count = 0; t.frustumCulled = false; t.renderOrder = 3; t.castShadow = false; scene.add(t); }
  let tileKey = '';
  function syncTiles() {
    const want = ui.tiles && sim.route.kind === 'grid' && (sim.phase === 'build' || sim.phase === 'wave') ? ui.tiles : null;
    const key = want ? want.cells.join(',') + '|' + want.tone : '';
    if (key === tileKey) return;
    tileKey = key;
    const n = want ? Math.min(TILE_MAX, want.cells.length) : 0;
    const size = sim.route.grid?.size ?? 2;
    for (let i = 0; i < n; i++) {
      const c = sim.route.cellCenter(want.cells[i]);
      tm.makeScale(size * 0.92, 1, size * 0.92); tm.setPosition(c.x, 0.07, c.z);
      tiles.setMatrixAt(i, tm);
      tm.makeScale(size * 1.36, 1, size * 1.36); tm.setPosition(c.x, 0.075, c.z);
      tileEdges.setMatrixAt(i, tm);
    }
    tiles.count = tileEdges.count = n;
    tiles.instanceMatrix.needsUpdate = tileEdges.instanceMatrix.needsUpdate = true;
    const tone = want?.tone;
    const col = tone === 'rust' || tone === 'bad' ? PALETTE.rust : tone === 'ok' ? TILE_OK : PALETTE.paper;
    tileM.color.set(col); tileEdgeM.color.set(col);
    tileM.opacity = tone === 'rust' || tone === 'bad' ? 0.32 : tone === 'ok' ? 0.3 : 0.2;
  }

  // ---------- markering, pekare och räckvidd ----------
  let ui = { selected: null, hover: null, range: null, tiles: null, ghost: null, cover: null, obGhost: null, marks: false };
  const isSel = (kind, id) => ui.selected?.kind === kind && ui.selected.id === id;
  const isHov = (kind, id) => ui.hover?.kind === kind && ui.hover.id === id;
  const ringM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.5, depthWrite: false });
  const selRing = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.3, 48), ringM);
  selRing.rotation.x = -Math.PI / 2; selRing.position.y = 0.06; selRing.visible = false;
  const rangeM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.45, depthWrite: false });
  const rangeFillM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.06, depthWrite: false });
  const range = new THREE.Group();
  const rangeEdge = new THREE.Mesh(new THREE.RingGeometry(0.988, 1, 128), rangeM);
  const rangeFill = new THREE.Mesh(new THREE.CircleGeometry(1, 96), rangeFillM);
  for (const r of [rangeEdge, rangeFill]) { r.rotation.x = -Math.PI / 2; range.add(r); }
  rangeEdge.position.y = 0.08; rangeFill.position.y = 0.07;
  range.visible = false;
  scene.add(selRing, range);
  function syncUi() {
    // ring under en byggd pjäs som är vald eller pekas på
    const ringFor = ui.selected?.kind === 'gun' ? ui.selected : ui.hover?.kind === 'gun' ? ui.hover : null;
    const e = ringFor && slots.get(ringFor.id);
    selRing.visible = !!e;
    if (selRing.visible) {
      selRing.position.x = e.group.position.x; selRing.position.z = e.group.position.z;
      const sel = ringFor === ui.selected;
      ringM.color.set(sel ? PALETTE.rust : PALETTE.paper); ringM.opacity = sel ? 0.85 : 0.5;
    }
    range.visible = !!ui.range;
    if (ui.range) { range.position.set(ui.range.x, 0, ui.range.z); range.scale.setScalar(ui.range.r); }
  }
  function setUi(next) { ui = { selected: null, hover: null, range: null, tiles: null, ghost: null, cover: null, obGhost: null, marks: false, ...next }; }
  function pickTargets() {
    const out = [];
    for (const [id, e] of slots) out.push({ kind: 'gun', id, object: e.group });
    cellMarks.forEach((c, i) => out.push({ kind: 'cell', id: i, object: c.group }));
    for (const [i, e] of cells) out.push({ kind: 'cell', id: i, object: e.group });
    return out;
  }
  // Det som strålen ska träffa: positionerna och hindren (de står upp ur marken). Tomma rutor
  // räknas fram ur markpunkten i stället, se cellAt.
  function rayTargets() {
    const out = [];
    for (const [id, e] of slots) out.push({ kind: 'gun', id, object: e.group });
    for (const [i, e] of cells) out.push({ kind: 'cell', id: i, object: e.group });
    return out;
  }

  // ---------- hinder ----------
  function cellCenter(i) {
    return sim.route.cellCenter(i);
  }
  function removeCell(i) {
    const e = cells.get(i); if (!e) return;
    disposeModel(e.group);
    cells.delete(i); cellObjects.delete(i);
  }
  function syncCells() {
    for (const i of [...cells.keys()]) if (!sim.obstacles[i]) removeCell(i);
    for (const key of Object.keys(sim.obstacles)) {
      const i = Number(key), ob = sim.obstacles[key];
      let e = cells.get(i);
      if (!e || e.type !== ob.type) {
        if (e) removeCell(i);
        const grid = sim.route.kind === 'grid';
        const group = obstacleModel(ob.type, grid ? { span: sim.route.grid.size } : undefined);
        const c = cellCenter(i);
        group.position.set(c.x, 0, c.z);
        // E4: modellens +x mot horden. Rutnätet: spärren ligger tvärs över gatan.
        group.rotation.y = grid ? (sim.route.axis(i) === 'x' ? 0 : Math.PI / 2) : Math.atan2(c.dirZ, -c.dirX);
        group.userData.pick = { kind: 'cell', index: i };
        scene.add(group);
        e = { type: ob.type, group, frac: 1 };
        cells.set(i, e); cellObjects.set(i, group);
      }
      const frac = ob.maxHp ? ob.hp / ob.maxHp : ob.durability / ob.maxDurability;
      if (Math.abs(frac - e.frac) > 0.004) { e.frac = frac; setObstacleWear(e.group, frac); }
    }
  }

  // ---------- basen ----------
  // Står där vägen tar slut. Lyser rött och skakar en kort stund när en zombie tar sig in.
  let base = null, baseHome = new THREE.Vector3(), baseHitT = 0;
  const BASE_HIT = 0.7;
  function buildBase() {
    if (base) disposeModel(base);
    const rink = sim.map.baseModel === 'rink' && sim.map.iceRink;
    base = rink ? rinkEntranceModel(rink) : baseModel();
    if (rink) {
      // Gnesta: överlevarna är inne i ishallen, basen är entrén (fasaden mot rondellen).
      const [x, z] = rink.at(rink.face, rink.main ?? 0);
      baseHome.set(x, 0, z);
      base.rotation.y = rink.ry;
    } else if (sim.map.basePlace) {
      // Banan säger var basen står (Gnesta: på rondellens ö, mot öster).
      const b = sim.map.basePlace;
      baseHome.set(b.x, 0, b.z);
      base.rotation.y = b.ry ?? 0;
      if (b.scale) base.scale.setScalar(b.scale);
    } else {
      const path = sim.map.path, n = path.length;
      const [ex, ez] = path[n - 1], [px, pz] = path[n - 2];
      const len = Math.hypot(ex - px, ez - pz), dx = (ex - px) / len, dz = (ez - pz) / len;
      // Grindlinjen 0,6 m före vägens slut, modellens +x mot horden.
      baseHome.set(ex - dx * 0.6, 0, ez - dz * 0.6);
      base.rotation.y = Math.atan2(dz, -dx);
    }
    base.position.copy(baseHome);
    scene.add(base);
  }
  function baseHit() { baseHitT = BASE_HIT; }
  let baseFrac = -1;
  function syncBase(dt) {
    if (!base) return;
    const u = base.userData;
    if (u.flag) u.flag.rotation.y = Math.sin(clock * 2.3) * 0.25;
    // Entrén: skadan följer basens liv (plankor, sprickor, blod).
    const frac = 1 - Math.max(0, sim.baseHp) / sim.map.baseHp;
    if (u.planks && frac !== baseFrac) { baseFrac = frac; setBaseDamage(base, frac); }
    if (baseHitT <= 0 || dt <= 0) return;
    baseHitT = Math.max(0, baseHitT - dt);
    const k = baseHitT / BASE_HIT;
    setBaseGlow(base, k * (0.6 + 0.4 * Math.sin(clock * 40)));
    if (u.planks) {
      // plankorna rycker inåt när någon tar sig in; fasaden står still
      setBaseDamage(base, frac);
      for (const pl of u.planks) pl.p.position.x -= rnd(0, 0.12) * k;
      if (baseHitT === 0) { setBaseGlow(base, 0); setBaseDamage(base, frac); }
      return;
    }
    const a = 0.12 * k;
    base.position.set(baseHome.x + rnd(-a, a), 0, baseHome.z + rnd(-a, a));
    if (baseHitT === 0) { setBaseGlow(base, 0); base.position.copy(baseHome); }
  }

  // ---------- händelser ----------
  function zombieScale(id) {
    const e = zombies.get(id);
    return e ? e.parts.scale : 1;
  }
  function consume(events) {
    // Pjäser som ställts ut i samma bildruta måste finnas innan skotten ritas.
    if (events.length) syncSlots(0);
    for (const ev of events) {
      switch (ev.t) {
        case 'shot': {
          const e = slots.get(ev.gunId); if (!e) break;
          const sc = zombieScale(ev.targetId);
          e.model.muzzle.getWorldPosition(from);
          const spread = ev.hit ? 0.3 : 1.4;
          to.set(ev.x + rnd(-spread, spread), (ev.hit ? 1.2 : rnd(0.4, 2.2)) * sc, ev.z + rnd(-spread, spread));
          if (!ev.hit) to.sub(from).multiplyScalar(1.4).add(from);   // missar flyger förbi
          fx.tracer(from, to, e.look.tracer);
          fx.flash(e.model.muzzle, ev.gunId, e.look.flash);
          fx.casing(e.model.muzzle);
          e.recoil = 1;
          if (e.look.smoke) fx.muzzleSmoke(from);
          break;
        }
        case 'hit': {
          const sc = zombieScale(ev.id);
          fx.gibs(ev.x, 1.2 * sc, ev.z, 5);
          if (Math.random() < 0.3) fx.splat(ev.x + rnd(0, 1.2), ev.z + rnd(-0.6, 0.6), rnd(0.6, 1.4));
          break;
        }
        case 'kill': {
          const sc = ZOMBIES[ev.type]?.scale ?? 1;
          fx.gibs(ev.x, 1.1 * sc, ev.z, 10);
          fx.splat(ev.x + 0.8 * sc, ev.z, rnd(1.6, 2.6) * sc);
          break;
        }
        case 'breach': fx.puff(ev.x, ev.z); baseHit(); break;
        case 'grenade': {
          const e = slots.get(ev.gunId); if (!e) break;
          e.model.gunner.root.getWorldPosition(from);
          from.y += 1.5;
          to.set(ev.x, 0.15, ev.z);
          fx.grenade(from, to, ev.flight);
          break;
        }
        case 'launch': {
          // granattillsatsen: granaten lämnar röret under pipan i en flack båge
          const e = slots.get(ev.gunId); if (!e) break;
          e.model.muzzle.getWorldPosition(from);
          to.set(ev.x, 0.15, ev.z);
          fx.grenade(from, to, ev.flight);
          fx.flash(e.model.muzzle, ev.gunId + 'g', 'light');
          e.recoil = 1;
          break;
        }
        case 'pierce': {
          const sc = zombieScale(ev.targetId);
          fx.gibs(ev.x, 1.2 * sc, ev.z, 6);
          break;
        }
        case 'blast': fx.blast(ev.x, ev.z, ev.r); blasts.push(ev); break;
        case 'obstacleHit': {
          if (clock - (lastChip.get(ev.cell) ?? -1) < 0.3) break;
          lastChip.set(ev.cell, clock);
          const c = cellCenter(ev.cell), sp = sim.route.kind === 'grid' ? 0.8 : 3.5;
          fx.chips(c.x - c.dirX * 0.7, rnd(0.5, 1), c.z + rnd(-sp, sp), 3);
          break;
        }
        case 'obstacleBroken': {
          const c = cellCenter(ev.cell), sp = sim.route.kind === 'grid' ? 0.9 : 3.5;
          for (let k = 0; k < (sp < 1 ? 2 : 4); k++) fx.puff(c.x, c.z + rnd(-sp, sp), 4);
          if (ev.type === 'block') for (let k = 0; k < (sp < 1 ? 3 : 5); k++) fx.chips(c.x, 0.8, c.z + rnd(-sp - 0.5, sp + 0.5), 4);
          removeCell(ev.cell);
          break;
        }
      }
    }
    flingCorpses();
  }

  // Kroppar nära en smäll kastas lite (de som dog i den och de som redan låg där).
  const blasts = [];
  function flingCorpses() {
    if (!blasts.length) return;
    const dead = new Set();
    for (const z of sim.zombies) if (z.dead && !z.breached) dead.add(z.id);
    for (const b of blasts) {
      for (const [id, e] of zombies) {
        if (!dead.has(id)) continue;
        const dx = e.x - b.x, dz = e.z - b.z, d = Math.hypot(dx, dz);
        if (d > b.r * 1.3) continue;
        const push = (1 - d / (b.r * 1.3)) * 4 + 1.5, nx = d > 0.01 ? dx / d : rnd(-1, 1), nz = d > 0.01 ? dz / d : rnd(-1, 1);
        const f = e.fling || (e.fling = { ox: 0, oy: 0, oz: 0, vx: 0, vy: 0, vz: 0, spin: 0, vr: 0 });
        f.rest = false;
        f.vx = nx * push; f.vz = nz * push; f.vy = 2 + push * 0.8; f.vr = rnd(-6, 6) / e.parts.scale;
      }
    }
    blasts.length = 0;
  }

  function sync(dt) {
    frame++; clock += dt;
    syncZombies(dt);
    syncSlots(dt);
    syncCells();
    syncCellMarks();
    syncTiles();
    syncGhost();
    syncObGhost();
    syncCover();
    syncUi();
    syncBase(dt);
    fx.update(dt);
  }

  function setSim(next) {
    for (const [id, e] of zombies) removeZombie(id, e);
    for (const e of slots.values()) disposeModel(e.group);
    slots.clear(); slotObjects.clear();
    for (const i of [...cells.keys()]) removeCell(i);
    lastChip.clear();
    fx.clear();
    const remap = next.map !== sim.map;
    sim = next;
    dug.clear(); scene.userData.fortify?.reset();
    if (remap) { buildCellMarks(); buildBase(); }
    baseHitT = 0; baseFrac = -1; if (base) { setBaseGlow(base, 0); base.position.copy(baseHome); }
    for (const c of cellMarks) c.state = null;
    ui = { selected: null, hover: null, range: null, tiles: null, ghost: null, cover: null, obGhost: null, marks: false };
    tileKey = '-'; coverKey = '-';
  }

  buildCellMarks();
  buildBase();
  // Display-läget för en zombie (för skott och siffror), eller null.
  const zombieAt = id => { const e = zombies.get(id); return e ? { x: e.x, z: e.z } : null; };
  return { sync, consume, setSim, setUi, pickTargets, rayTargets, slotObjects, cellObjects, fx, zombieAt, rings, horde, get dug() { return [...dug.values()]; } };
}
