// Vyn: läser simuleringens tillstånd och händelser och visar dem i scenen.
// consume(events) anropas efter varje steg, sync(dt) en gång per bildruta.
import * as THREE from 'three';
import { rnd } from './kit.js';
import { createFx } from './fx.js';
import { weaponModel, obstacleModel, setObstacleWear, zombieModel, zombieWalk, slotMarker, setSlotMarkerState, disposeModel } from './models.js';
import { ZOMBIES } from '../data/zombies.js';
import { CELL_LEN } from '../sim/sim.js';

const FALL_TIME = 0.3;
const STEP_PHASE = 2.6;          // gångfas per meter

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
  }

  // ---------- positioner och vapen ----------
  function slotKey(s) { return s.weapon ? s.weapon.type + ':' + s.weapon.level : s.locked ? 'locked' : 'free'; }
  function buildSlot(s, old) {
    if (old) disposeModel(old.group);
    let e;
    if (s.weapon) {
      const model = weaponModel(s.weapon.type, s.weapon.level);
      e = { key: slotKey(s), group: model.group, model, angle: old?.angle ?? 0 };
      model.pivot.rotation.y = -e.angle;
    } else {
      const group = slotMarker(s.locked ? 'locked' : 'free');
      e = { key: slotKey(s), group, model: null, angle: old?.angle ?? 0 };
    }
    e.group.position.set(s.x, 0, s.z);
    scene.add(e.group);
    slots.set(s.id, e); slotObjects.set(s.id, e.group);
    return e;
  }
  function syncSlots(dt) {
    const k = 1 - Math.exp(-dt * 12);
    for (const s of sim.slots) {
      let e = slots.get(s.id);
      if (!e || e.key !== slotKey(s)) e = buildSlot(s, e);
      if (!e.model) continue;
      const w = s.weapon;
      if (w.targetId != null) e.angle += angleDiff(e.angle, w.angle) * k;
      e.model.pivot.rotation.y = -e.angle;
    }
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
        scene.add(group);
        e = { type: ob.type, group, frac: 1 };
        cells.set(i, e); cellObjects.set(i, group);
      }
      const frac = ob.maxHp ? ob.hp / ob.maxHp : ob.durability / ob.maxDurability;
      if (Math.abs(frac - e.frac) > 0.004) { e.frac = frac; setObstacleWear(e.group, frac); }
    }
  }

  // ---------- händelser ----------
  function zombieScale(id) {
    const e = zombies.get(id);
    return e ? e.parts.scale : 1;
  }
  function consume(events) {
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
          fx.flash(e.model.muzzle);
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
        case 'breach': fx.puff(ev.x, ev.z); break;
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
    fx.update(dt);
  }

  function setSim(next) {
    for (const [id, e] of zombies) removeZombie(id, e);
    for (const e of slots.values()) disposeModel(e.group);
    slots.clear(); slotObjects.clear();
    for (const i of [...cells.keys()]) removeCell(i);
    lastChip.clear();
    fx.clear();
    sim = next;
  }

  return { sync, consume, setSim, slotObjects, cellObjects, fx };
}
