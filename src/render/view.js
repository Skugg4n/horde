// Vyn: läser simuleringens tillstånd och händelser och visar dem i scenen.
// consume(events) anropas efter varje steg, sync(dt) en gång per bildruta.
import * as THREE from 'three';
import { rnd, geo, PALETTE } from './kit.js';
import { createFx } from './fx.js';
import { weaponModel, obstacleModel, setObstacleWear, zombieModel, zombieWalk, slotMarker, setSlotMarkerState, disposeModel, baseModel, setBaseGlow } from './models.js';
import { ZOMBIES } from '../data/zombies.js';
import { CELL_LEN } from '../sim/sim.js';

const FALL_TIME = 0.3;
// Högst så många liggande kroppar visas; de äldsta tas bort först. Simuleringen behåller
// sina döda i 20 s oavsett, det här styr bara hur mycket som ritas.
const MAX_CORPSES = 24;
const STEP_PHASE = 2.6;          // gångfas per meter
// Osynlig träffskiva under varje position (delad, städas aldrig).
const HIT_GEO = new THREE.CircleGeometry(2.4, 24);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });

// Punkt längs vägen med sidoförskjutning, utan att skapa nya objekt.
function placeOnPath(out, path, d, off) {
  let rest = Math.max(0, d);
  for (let i = 1; i < path.length; i++) {
    const ax = path[i - 1][0], az = path[i - 1][1], bx = path[i][0], bz = path[i][1];
    const seg = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / seg, dz = (bz - az) / seg;
    if (rest <= seg || i === path.length - 1) {
      const k = Math.min(rest, seg);
      out.x = ax + dx * k - dz * off; out.z = az + dz * k + dx * off; out.dirX = dx; out.dirZ = dz;
      return out;
    }
    rest -= seg;
  }
  return out;
}

const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function createView(scene, initialSim) {
  let sim = initialSim;
  const fx = createFx(scene);
  const zombies = new Map();      // id → { z: modelldelar, x, z, phase, fall, ry }
  let corpses = [];               // id på liggande kroppar, äldst först
  const slots = new Map();        // id → { key, group, model, angle }
  const cells = new Map();        // index → { type, group, frac }
  const slotObjects = new Map(), cellObjects = new Map();
  const lastChip = new Map();
  const P = { x: 0, z: 0, dirX: 0, dirZ: 0 };
  const from = new THREE.Vector3(), to = new THREE.Vector3();
  let frame = 0, clock = 0;

  // ---------- zombier ----------
  function addZombie(z) {
    const parts = zombieModel(z.type);
    placeOnPath(P, sim.map.path, z.d, z.off);
    parts.root.position.set(P.x, 0, P.z);
    const e = { parts, x: P.x, z: P.z, phase: z.wob * STEP_PHASE, fall: 0, ry: Math.atan2(P.dirX, P.dirZ), seen: frame, chop: rnd(0, 6) };
    parts.root.rotation.y = e.ry;
    scene.add(parts.root);
    zombies.set(z.id, e);
    return e;
  }
  function removeZombie(id, e) {
    disposeModel(e.parts.root);
    zombies.delete(id);
  }
  function syncZombies(dt) {
    const k = 1 - Math.exp(-dt * 22);
    for (const z of sim.zombies) {
      if (z.breached) continue;
      let e = zombies.get(z.id);
      if (!e) { if (z.dead) continue; e = addZombie(z); }
      e.seen = frame;
      const parts = e.parts;
      placeOnPath(P, sim.map.path, z.d, z.off);
      e.x += (P.x - e.x) * k; e.z += (P.z - e.z) * k;
      parts.root.position.set(e.x, 0, e.z);
      if (z.dead) {
        // faller bakåt och ligger kvar
        if (e.fall < 1) {
          e.fall = Math.min(1, e.fall + dt / FALL_TIME);
          if (e.fall === 1) {
            // ligger still: ingen skugga behövs (halverar kostnaden i skuggpasset)
            parts.root.traverse(o => { o.castShadow = false; });
            corpses.push(z.id);
            while (corpses.length > MAX_CORPSES) {
              const old = corpses.shift(), oe = zombies.get(old);
              if (oe) removeZombie(old, oe);
            }
          }
          const t = e.fall * e.fall;
          parts.body.rotation.x = parts.lean + (-Math.PI / 2 - parts.lean) * t;
          parts.body.rotation.z *= 0.8;
          parts.body.position.y = -0.22 * t;
          parts.hipL.rotation.x *= 0.7; parts.hipR.rotation.x *= 0.7;
          parts.shL.rotation.x += (-2.6 - parts.shL.rotation.x) * t * 0.5;
          parts.shR.rotation.x += (-2.4 - parts.shR.rotation.x) * t * 0.5;
        }
        continue;
      }
      e.ry = Math.atan2(P.dirX, P.dirZ);
      parts.root.rotation.y = e.ry;
      e.phase += (z.wob * STEP_PHASE - e.phase) * k;
      if (z.attacking) {
        // slår med armarna mot hindret
        e.chop += dt * 11;
        zombieWalk(parts, 0);
        parts.body.rotation.x = parts.lean + 0.15;
        parts.shL.rotation.x = -1.9 + Math.sin(e.chop) * 0.8;
        parts.shR.rotation.x = -1.9 + Math.sin(e.chop + Math.PI) * 0.8;
      } else {
        zombieWalk(parts, e.phase);
      }
    }
    for (const [id, e] of zombies) if (e.seen !== frame) removeZombie(id, e);
    if (corpses.length && corpses.some(id => !zombies.has(id))) corpses = corpses.filter(id => zombies.has(id));
  }

  // ---------- positioner och vapen ----------
  // Varje positionsgrupp får userData.pick och en osynlig träffskiva, så att den går att klicka
  // på även när en liten pjäs står där. Byggs om när vapen eller nivå ändras.
  function slotKey(s) { return s.weapon ? s.weapon.type + ':' + s.weapon.level : s.locked ? 'locked' : 'free'; }
  function buildSlot(s, old) {
    if (old) disposeModel(old.group);
    let e;
    if (s.weapon) {
      const model = weaponModel(s.weapon.type, s.weapon.level);
      e = { key: slotKey(s), group: model.group, model, angle: old?.angle ?? s.weapon.angle, state: null };
      model.pivot.rotation.y = -e.angle;
    } else {
      const group = slotMarker(s.locked ? 'locked' : 'free');
      e = { key: slotKey(s), group, model: null, angle: old?.angle ?? 0, state: s.locked ? 'locked' : 'free' };
    }
    const hit = new THREE.Mesh(HIT_GEO, HIT_MAT);
    hit.rotation.x = -Math.PI / 2; hit.position.y = 0.1;
    e.group.add(hit);
    e.group.userData.pick = { kind: 'slot', id: s.id };
    e.group.position.set(s.x, 0, s.z);
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
  function syncSlots(dt) {
    const k = 1 - Math.exp(-dt * 12);
    const alive = new Set();
    for (const s of sim.slots) {
      alive.add(s.id);
      let e = slots.get(s.id);
      if (!e || e.key !== slotKey(s)) e = buildSlot(s, e);
      if (!e.model) {
        const want = isSel('slot', s.id) ? 'selected' : isHov('slot', s.id) ? 'hover' : s.locked ? 'locked' : 'free';
        if (e.state !== want) { e.state = want; setSlotMarkerState(e.group, want); }
        continue;
      }
      const w = s.weapon;
      if (w.targetId != null) e.angle += angleDiff(e.angle, w.angle) * k;
      e.model.pivot.rotation.y = -e.angle;
    }
    for (const id of [...slots.keys()]) if (!alive.has(id)) removeSlot(id);
  }

  // ---------- rutor på vägen (streckade rektanglar, syns i byggläget) ----------
  const cellMarks = [];
  function buildCellMarks() {
    for (const c of cellMarks) disposeModel(c.group);
    cellMarks.length = 0;
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
    const open = sim.phase === 'build' || sim.phase === 'wave';
    const calm = sim.phase === 'build';
    for (let i = 0; i < cellMarks.length; i++) {
      const c = cellMarks[i];
      const want = !open ? 'hidden' : isSel('cell', i) ? 'selected' : isHov('cell', i) ? 'hover' : calm ? 'idle' : 'quiet';
      if (c.state === want) continue;
      c.state = want;
      for (const ch of c.group.children) ch.visible = want !== 'hidden';
      c.m.color.set(want === 'selected' ? PALETTE.rust : PALETTE.paper);
      c.m.opacity = { selected: 0.9, hover: 0.7, idle: 0.32, quiet: 0.16 }[want] ?? 0;
      c.fillM.color.set(want === 'selected' ? PALETTE.rust : PALETTE.paper);
      c.fillM.opacity = { selected: 0.18, hover: 0.12, idle: 0.05, quiet: 0.025 }[want] ?? 0;
    }
  }

  // ---------- markering, pekare och räckvidd ----------
  let ui = { selected: null, hover: null, range: null };
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
    const ringFor = ui.selected?.kind === 'slot' ? ui.selected : ui.hover?.kind === 'slot' ? ui.hover : null;
    const e = ringFor && slots.get(ringFor.id);
    selRing.visible = !!(e && e.model);
    if (selRing.visible) {
      selRing.position.x = e.group.position.x; selRing.position.z = e.group.position.z;
      const sel = ringFor === ui.selected;
      ringM.color.set(sel ? PALETTE.rust : PALETTE.paper); ringM.opacity = sel ? 0.85 : 0.5;
    }
    range.visible = !!ui.range;
    if (ui.range) { range.position.set(ui.range.x, 0, ui.range.z); range.scale.setScalar(ui.range.r); }
  }
  function setUi(next) { ui = { selected: null, hover: null, range: null, ...next }; }
  function pickTargets() {
    const out = [];
    for (const [id, e] of slots) out.push({ kind: 'slot', id, object: e.group });
    cellMarks.forEach((c, i) => out.push({ kind: 'cell', id: i, object: c.group }));
    for (const [i, e] of cells) out.push({ kind: 'cell', id: i, object: e.group });
    return out;
  }
  // Det som strålen ska träffa: positionerna och hindren (de står upp ur marken). Tomma rutor
  // räknas fram ur markpunkten i stället, se cellAt.
  function rayTargets() {
    const out = [];
    for (const [id, e] of slots) out.push({ kind: 'slot', id, object: e.group });
    for (const [i, e] of cells) out.push({ kind: 'cell', id: i, object: e.group });
    return out;
  }

  // ---------- hinder ----------
  function cellCenter(i) {
    return placeOnPath(P, sim.map.path, sim.map.cells[i] + CELL_LEN / 2, 0);
  }
  function removeCell(i) {
    const e = cells.get(i); if (!e) return;
    disposeModel(e.group);
    cells.delete(i); cellObjects.delete(i);
  }
  function syncCells() {
    for (let i = 0; i < sim.map.cells.length; i++) {
      const ob = sim.obstacles[i];
      let e = cells.get(i);
      if (!ob) { if (e) removeCell(i); continue; }
      if (!e || e.type !== ob.type) {
        if (e) removeCell(i);
        const group = obstacleModel(ob.type);
        const c = cellCenter(i);
        group.position.set(c.x, 0, c.z);
        group.rotation.y = Math.atan2(c.dirZ, -c.dirX);   // modellens +x mot horden
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
    const path = sim.map.path, n = path.length;
    const [ex, ez] = path[n - 1], [px, pz] = path[n - 2];
    const len = Math.hypot(ex - px, ez - pz), dx = (ex - px) / len, dz = (ez - pz) / len;
    base = baseModel();
    // Grindlinjen 0,6 m före vägens slut, modellens +x mot horden.
    baseHome.set(ex - dx * 0.6, 0, ez - dz * 0.6);
    base.position.copy(baseHome);
    base.rotation.y = Math.atan2(dz, -dx);
    scene.add(base);
  }
  function baseHit() { baseHitT = BASE_HIT; }
  function syncBase(dt) {
    if (!base) return;
    base.userData.flag.rotation.y = Math.sin(clock * 2.3) * 0.25;
    if (baseHitT <= 0) return;
    baseHitT = Math.max(0, baseHitT - dt);
    const k = baseHitT / BASE_HIT;
    setBaseGlow(base, k * (0.6 + 0.4 * Math.sin(clock * 40)));
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
    // Positioner som byggts i samma bildruta måste finnas innan skotten ritas.
    if (events.length) syncSlots(0);
    for (const ev of events) {
      switch (ev.t) {
        case 'shot': {
          const e = slots.get(ev.slotId); if (!e || !e.model) break;
          const sc = zombieScale(ev.targetId);
          e.model.muzzle.getWorldPosition(from);
          const spread = ev.hit ? 0.3 : 1.4;
          to.set(ev.x + rnd(-spread, spread), (ev.hit ? 1.2 : rnd(0.4, 2.2)) * sc, ev.z + rnd(-spread, spread));
          if (!ev.hit) to.sub(from).multiplyScalar(1.4).add(from);   // missar flyger förbi
          fx.tracer(from, to);
          fx.flash(e.model.muzzle, ev.slotId);
          fx.casing(e.model.muzzle);
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
        case 'obstacleHit': {
          if (clock - (lastChip.get(ev.cell) ?? -1) < 0.3) break;
          lastChip.set(ev.cell, clock);
          const c = cellCenter(ev.cell);
          fx.chips(c.x - c.dirX * 0.7, rnd(0.5, 1), c.z + rnd(-3.5, 3.5), 3);
          break;
        }
        case 'obstacleBroken': {
          const c = cellCenter(ev.cell);
          for (let k = 0; k < 4; k++) fx.puff(c.x, c.z + rnd(-3.5, 3.5), 4);
          if (ev.type === 'block') for (let k = 0; k < 5; k++) fx.chips(c.x, 0.8, c.z + rnd(-4, 4), 4);
          removeCell(ev.cell);
          break;
        }
      }
    }
  }

  function sync(dt) {
    frame++; clock += dt;
    syncZombies(dt);
    syncSlots(dt);
    syncCells();
    syncCellMarks();
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
    if (remap) { buildCellMarks(); buildBase(); }
    baseHitT = 0; if (base) { setBaseGlow(base, 0); base.position.copy(baseHome); }
    for (const c of cellMarks) c.state = null;
    ui = { selected: null, hover: null, range: null };
  }

  buildCellMarks();
  buildBase();
  return { sync, consume, setSim, setUi, pickTargets, rayTargets, slotObjects, cellObjects, fx };
}
