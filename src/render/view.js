// Vyn: läser simuleringens tillstånd och händelser och visar dem i scenen.
// consume(events) anropas efter varje steg, sync(dt) en gång per bildruta.
import * as THREE from 'three';
import { rnd, geo, PALETTE } from './kit.js';
import { createFx } from './fx.js';
import { createHealthRings } from './rings.js';
import { createHorde } from './horde.js';
import { crewCarryModel, hvRun, weaponModel, obstacleModel, setObstacleWear, zombieModel, zombieWalk, zombieAttack, zombieFall, zombieStumble, seedZombie, weaponGhost, obstacleGhost, setGhostTone, disposeModel, baseModel, roadblockModel, setBaseGlow, rinkEntranceModel, setBaseDamage } from './models.js';
import { ZOMBIES } from '../data/zombies.js';
import { CELL_LEN, movePhase, gunPos, stumbleOf, housesFor } from '../sim/sim.js';
import { WEAPONS } from '../data/weapons.js';
import { alongPath as alongPathAt } from '../sim/crew-path.js';
import { createSquadView } from './squad-view.js';
import { squadGhost, setSquadGhost, suppliesModel } from './models.js';
import { SQUAD, isSquad } from '../sim/squad.js';
import { createDormant } from './dormant.js';
import { createCivilians } from './civilians.js';
import { OFFSET as CAM_OFFSET } from './camera-eye.js';

const FALL_TIME = 0.3;
const OLD_VARN = typeof location !== 'undefined' && new URLSearchParams(location.search).has('oldvarn');
// Högst så många liggande kroppar visas; de äldsta tas bort först. Simuleringen behåller
// sina döda i 20 s oavsett, det här styr bara hur mycket som ritas.
const MAX_CORPSES = 24;
const STEP_PHASE = 2.6;          // gångfas per meter
// Osynlig träffskiva under varje pjäs (delad, städas aldrig).
const HIT_GEO = new THREE.CircleGeometry(2.4, 24);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const HIT_MAN = new THREE.CircleGeometry(1.1, 12);     // Hemvärnet: en träffskiva per soldat
const HIT_BOX = new THREE.BoxGeometry(1, 1, 1);        // 0.19.0: enheten i ett hus, huset självt

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
  epa: { tracer: 'light', flash: 'light', kick: 0.06, rise: 0.04, back: 16, rattle: 0.008, smoke: false },
  psg90: { tracer: 'heavy', flash: 'heavy', kick: 0.12, rise: 0.18, back: 5, rattle: 0, smoke: true },
};

// Nya zombier kliver upp ur marken: så många sekunder, från så djupt (meter, gånger storleken).
const RISE_TIME = 0.9, RISE_DEPTH = 1.9;

export function createView(scene, initialSim) {
  let sim = initialSim;
  const fx = createFx(scene);
  const rings = createHealthRings(scene);
  // Zombierna ritas som instanser (horde.js): skelettet per zombie ligger utanför scenen.
  const horde = createHorde(scene);
  // Hemvärnets soldater: egna instanser, samma väg som horden (squad-view.js).
  const squadView = createSquadView(scene);
  // 0.12.0 (H101): vilande smittade i husen (röd ton, dörren som slås upp)
  const dormant = createDormant(scene, fx);
  // 0.13.0 (H105): de civila på väg till ishallen
  const civilians = createCivilians(scene);
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
    // rise: kliver upp ur marken (0.10.1: ingångarna ligger inne i staden nu, inte vid dimkanten)
    const e = { parts, x: P.x, z: P.z, phase: z.wob * STEP_PHASE, fall: 0, ry: Math.atan2(P.dirX, P.dirZ), seen: frame, chop: rnd(0, 6), rise: z.dead ? 1 : 0 };
    // 0.12.0: en vilande kliver ut genom dörröppningen och går ut till gatan (i stället för att stiga ur marken)
    const door = z.house ? dormant.doorAt(z.house) : null;
    if (door) {
      e.rise = 1; e.x = door.x; e.z = door.z; e.ry = door.ry;
      e.pour = { t: 0, len: Math.max(0.5, Math.hypot(P.x - door.x, P.z - door.z) / 2.2), x0: door.x, z0: door.z };
      parts.root.position.set(door.x, 0, door.z);
    }
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
  // Längst ut (0.11.0, zoomen tillbaka till 84 m som i 0.4): levande zombier ritas upp till 30 % större
  // (bara bild), från vy 56 m och utåt. main.js sätter vyns höjd varje bildruta.
  let zoomBoost = 1;
  let viewH = 40;
  function setZoom(view) { viewH = view; zoomBoost = 1 + 0.3 * Math.min(1, Math.max(0, (view - 56) / 28)); }
  // 0.17.0-molnbo: banans höjd under zombien (map.groundY: Mölnbos bro, ramper och perrong), bara bild
  const liftAt = (x, z) => (sim.map.groundY ? sim.map.groundY(x, z) : 0);
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
      if (e.pour && !z.dead) {
        e.pour.t += dt;
        const u = Math.min(1, e.pour.t / e.pour.len);
        e.x = e.pour.x0 + (P.x - e.pour.x0) * u; e.z = e.pour.z0 + (P.z - e.pour.z0) * u;
        if (u >= 1) e.pour = null;
      } else { e.x += (P.x - e.x) * k; e.z += (P.z - e.z) * k; }
      if (e.fling) {
        // Kastad av en smäll: glider ut, hoppar och landar. Bara bild, simuleringen rör sig inte.
        const f = e.fling;
        f.vy -= 22 * dt; f.oy = Math.max(0, f.oy + f.vy * dt);
        if (f.oy > 0 || f.vy > 0) { f.ox += f.vx * dt; f.oz += f.vz * dt; f.spin += dt * f.vr; }
        else { f.vy = 0; f.vx *= Math.exp(-dt * 8); f.vz *= Math.exp(-dt * 8); f.ox += f.vx * dt; f.oz += f.vz * dt; }
        parts.root.position.set(e.x + f.ox, f.oy + liftAt(e.x, e.z), e.z + f.oz);
        parts.root.rotation.y = e.ry + f.spin;
      } else {
        if (e.rise < 1) e.rise = Math.min(1, e.rise + dt / RISE_TIME);
        const r = 1 - e.rise;
        parts.root.position.set(e.x, -RISE_DEPTH * r * r * (parts.scale ?? 1) + liftAt(e.x, e.z), e.z);
      }
      // 0.11.0: utzoomad är de levande lite större (zoomBoost), så att horden går att läsa
      if (!z.dead) parts.root.scale.setScalar((parts.scale ?? 1) * zoomBoost);
      else if (parts.root.scale.x !== (parts.scale ?? 1)) parts.root.scale.setScalar(parts.scale ?? 1);
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
      if (z.hp < z.maxHp) rings.add(e.x, e.z, z.hp / z.maxHp, Math.min(1.35, parts.scale), liftAt(e.x, e.z));
      // 0.18.0: fångad i korseld (src/sim/sim.js markCrossfire): en hel, vidare ring runt zombien
      if (!z.dead && z.xfT != null && sim.time - z.xfT < 0.4) rings.add(e.x, e.z, 1, 1.75, liftAt(e.x, e.z));
      // vrider sig mjukt mot gångriktningen (rutnätets svängar blir inte ryck)
      // en zombie som slår en soldat vänder sig mot honom
      const face = z.foe ? Math.atan2(z.foe[0] - e.x, z.foe[1] - e.z) : e.pour ? Math.atan2(P.x - e.x, P.z - e.z) : Math.atan2(P.dirX, P.dirZ);
      e.ry += angleDiff(e.ry, face) * Math.min(1, dt * 9);
      parts.root.rotation.y = e.ry;
      e.phase += (z.wob * STEP_PHASE - e.phase) * k;
      if (z.attacking) {
        // slår med armarna mot hindret
        e.chop += dt * 11;
        zombieAttack(parts, e.chop, clock);
      } else {
        // 0.16.4: snubblet, samma variant som simuleringen räknar med (0.19.0, H455)
        const sb = stumbleOf(z);
        if (sb) zombieStumble(parts, sb, e.phase, clock); else zombieWalk(parts, e.phase, clock);
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
  // 0.13.0: värnet byggs om när Rotate vänt det (emplace.face)
  function slotKey(s) { return s.weapon.type + ':' + s.weapon.level + (s.weapon.kit ? ':kit' : '') + (s.weapon.ammo ? ':ammo' : '') + (s.weapon.sandbags ? ':bags' : '') + (s.roof ? ':roof' : '') + (s.squad ? ':' + s.soldiers.length : '') + (s.emplace ? ':' + s.emplace.face.toFixed(2) : '') + (s.house ? ':h' + s.house.id : ''); }
  // Modellen byggs om när vapnet ändras, och efter en flytt när pjäsen ställs upp på den nya platsen
  // (medan den packas och bärs är det den gamla platsens värn).
  function wantKey(s, e) {
    const at = s.move && movePhase(s) !== 'setup' && e?.cellKey != null ? e.cellKey : s.cell;
    return slotKey(s) + '@' + at;
  }
  // 0.19.0 (H459): en enhet i ett hus ritas i fönstren (squad-view.js, house-windows.js). Här bara en osynlig
  // träffkropp över huset, så att ett klick på huset öppnar enhetens panel.
  function houseHit(group, s) {
    const h = s.house && sim.place ? housesFor(sim).find(q => q.id === s.house.id) : null;
    if (!h) return;
    const hit = new THREE.Mesh(HIT_BOX, HIT_MAT);
    hit.scale.set(h.w, Math.max(2, h.eave), h.d);
    hit.position.set(h.x - s.x, Math.max(2, h.eave) / 2, h.z - s.z);
    hit.rotation.y = h.ry;
    group.add(hit);
  }
  function buildSlot(s, old) {
    if (old) { dropCrew(old); disposeModel(old.group); }
    if (s.house && !s.squad && !s.move) {
      const group = new THREE.Group();
      group.position.set(s.x, 0, s.z);
      houseHit(group, s);
      group.userData.pick = { kind: 'gun', id: s.id };
      scene.add(group);
      group.updateMatrixWorld(true);
      const e = { key: wantKey(s, old), cellKey: s.cell, group, model: null, house: true, angle: 0, look: SHOT_LOOK[s.weapon.type] || SHOT_LOOK.m249 };
      slots.set(s.id, e); slotObjects.set(s.id, group);
      return e;
    }
    if (s.squad) {
      // Gruppen: ingen modell här (soldaterna ritas i squad-view.js), bara en träffskiva under
      // varje soldat, så att ett klick på vilken soldat som helst öppnar gruppens panel.
      const group = new THREE.Group();
      for (const m of s.soldiers) {
        const hit = new THREE.Mesh(HIT_MAN, HIT_MAT);
        hit.rotation.x = -Math.PI / 2; hit.position.set(m.x - s.x, 0.1, m.z - s.z);
        group.add(hit);
      }
      // 0.17.2 (H306): sandsäckarna framför varje soldat och ammolådorna mitt i gruppen (0.19.0: inte i ett hus)
      if (s.house) houseHit(group, s);
      else if (s.weapon.ammo || s.weapon.sandbags) group.add(suppliesModel({ ammo: !!s.weapon.ammo, at: [0, 0], sandbags: !!s.weapon.sandbags, seed: s.cell,
        men: s.soldiers.filter(m => !m.down).map(m => ({ x: m.x - s.x + Math.cos(m.face) * 0.55, z: m.z - s.z + Math.sin(m.face) * 0.55, face: m.face })) }));
      group.userData.pick = { kind: 'gun', id: s.id };
      group.position.set(s.x, 0, s.z);
      scene.add(group);
      group.updateMatrixWorld(true);
      const e = { key: slotKey(s), group, model: null, squad: true, angle: 0 };
      slots.set(s.id, e); slotObjects.set(s.id, group);
      return e;
    }
    // En pjäs på ett tak (Psg 90) står på takets höjd (s.y, simuleringen räknar fram den).
    // ?oldvarn (bara för jämförande skärmbilder): värnet som före 0.12.0, alltid österut och helt
    const emp = OLD_VARN ? null : s.emplace ?? null;
    const model = weaponModel(s.weapon.type, s.weapon.level, { kit: !!s.weapon.kit, roof: !!s.roof, emplace: emp, seed: s.cell });
    // 0.12.0 (H098): värnet vänt mot hordens väg (face) och tryckt mot skyddet (nestle)
    // 0.13.0 (H135): pillboxen vänds mot skjutvinkeln (facing); kulsprutan i luckan vrids för sig
    const veh = !!WEAPONS[s.weapon.type]?.vehicle;
    const face = veh ? (s.facing ?? 0) : emp?.face ?? 0, nest = emp?.nestle ?? [0, 0];
    const e = { key: wantKey(s, old), cellKey: s.cell, group: model.group, model, face, nest, veh, angle: old?.angle ?? s.facing ?? s.emplace?.face ?? s.weapon.angle };
    model.group.rotation.y = -face;
    model.pivot.rotation.y = face - e.angle;
    e.pivotHome = model.pivot.position.clone();
    addXray(e);
    e.recoil = 0;
    e.look = SHOT_LOOK[s.weapon.type] || SHOT_LOOK.m249;
    const hit = new THREE.Mesh(HIT_GEO, HIT_MAT);
    hit.rotation.x = -Math.PI / 2; hit.position.y = 0.1;
    e.group.add(hit);
    // 0.17.2 (H306): ammolådan syns bredvid pjäsen
    if (s.weapon.ammo) e.group.add(suppliesModel({ ammo: true, at: s.roof ? [-0.9, 0.6] : veh ? [-2.6, 1.4] : [-1.7, 1.2], seed: s.cell }));
    e.group.userData.pick = { kind: 'gun', id: s.id };
    e.group.position.set(s.x + nest[0], s.y ?? 0, s.z + nest[1]);
    // 0.12.0 (H106): skytten på taket ligger där taket bär honom (bredvid skorstenen på nocken), och
    // kroppen följer takets lutning i den riktning han siktar (perchPose varje bildruta).
    e.perch = s.roof ? perchFor(s) : null;
    if (e.perch?.chimney) { const t = e.group.getObjectByName('roof-tarp'); if (t) t.visible = false; }
    scene.add(e.group);
    e.group.updateMatrixWorld(true);
    slots.set(s.id, e); slotObjects.set(s.id, e.group);
    return e;
  }
  // 0.12.0 (H102), 0.13.0 (H134): flytten i bild. Packa: säckarna sjunker ihop på den gamla platsen. På
  // väg: pjäsen syns inte i sitt värn, laget springer längs vägen med vapnet och lådorna (pillboxen kryper
  // själv längs vägen). Ställa upp: säckarna växer upp igen på den nya platsen.
  function placeSlot(e, s, dt) {
    const m = s.move, bags = e.model.bags;
    if (!m) {
      if (e.moving) {
        e.moving = false; e.group.visible = true;
        e.group.position.set(s.x + e.nest[0], s.y ?? 0, s.z + e.nest[1]);
        if (e.veh) { e.face = s.facing ?? e.face; e.group.rotation.y = -e.face; }
        if (bags) { bags.visible = true; bags.scale.y = 1; }
      }
      dropCrew(e);
      return;
    }
    e.moving = true;
    const ph = movePhase(s), f = m.from;
    let bag = 1;
    if (ph === 'pack') { e.group.position.set(f.x + e.nest[0], f.y ?? 0, f.z + e.nest[1]); bag = 1 - m.t / Math.max(1e-6, m.pack); }
    else if (ph === 'carry') {
      const p = gunPos(s);
      if (e.veh) {
        e.group.visible = true;
        e.group.position.set(p.x, 0, p.z);
        e.face += angleDiff(e.face, p.dir) * Math.min(1, dt * 3);
        e.group.rotation.y = -e.face;
      } else { e.group.visible = false; runCrew(e, s, p, dt); }
      bag = 0;
    } else {
      dropCrew(e); e.group.visible = true;
      e.group.position.set(s.x + e.nest[0], s.y ?? 0, s.z + e.nest[1]);
      bag = (m.t - m.pack - m.travel) / Math.max(1e-6, m.setup);
    }
    if (bags && !e.veh) { bags.visible = bag > 0.02; bags.scale.y = Math.max(0.02, Math.min(1, bag)); }
  }
  // Laget på väg: männen i en rad längs vägen bakom den första, i springposen.
  function runCrew(e, s, p, dt) {
    if (!e.crew) {
      const n = Math.max(1, WEAPONS[s.weapon.type]?.move?.crew ?? 1);
      e.crew = crewCarryModel(s.weapon.type, n, hashId(s.id));
      e.crew.phase = 0;
      scene.add(e.crew.root);
    }
    const c = e.crew, m = s.move, d = (m.t - m.pack) * m.speed;
    c.phase += m.speed * dt * 2.4;
    c.men.forEach((man, i) => {
      const q = alongPathAt(m.path, d - i * 1.3);
      man.root.position.set(q.x, 0, q.z);
      man.root.rotation.y = Math.atan2(Math.cos(q.dir), Math.sin(q.dir));
      hvRun(man, c.phase + i * 1.7);
    });
  }
  function dropCrew(e) {
    if (!e.crew) return;
    disposeModel(e.crew.root);
    e.crew = null;
  }
  function perchFor(s) {
    const pa = sim.place.perchAt?.(s.x, s.z);
    if (!pa) return null;
    let x = s.x, z = s.z;
    if (pa.kind === 2 && pa.chimney) {
      // nocken: en meter vid sidan av skorstenen, på den sida som vetter mot rutans mitt
      const [cx, cz] = pa.chimney, dx = s.x - cx, dz = s.z - cz, L = Math.hypot(dx, dz) || 1;
      x = cx + dx / L * 1.05; z = cz + dz / L * 1.05;
    }
    return { x, z, h: pa.height, chimney: pa.chimney };
  }
  // Kroppen (från vapnet bakåt BODY meter) läggs efter taket: lutningen mellan vapnet och fötterna, och
  // höjden så att ingen del sjunker in i taket (prov längs kroppen och vid sidorna).
  const BODY = 1.95, SIDE = 0.28;
  function perchPose(e, angle) {
    const P0 = e.perch, ux = Math.cos(angle), uz = Math.sin(angle), px = -uz, pz = ux;
    const at = (t, sd) => P0.h(P0.x - ux * t + px * sd, P0.z - uz * t + pz * sd);
    const yGun = at(0, 0), yFeet = at(BODY, 0) || yGun;
    const pitch = Math.atan2(yGun - yFeet, BODY);
    let lift = 0;
    for (const t of [0, 0.5, 1, 1.5, BODY]) for (const sd of [-SIDE, 0, SIDE]) {
      const roofY = at(t, sd); if (!roofY) continue;
      lift = Math.max(lift, roofY - (yGun - Math.tan(pitch) * t));
    }
    e.group.position.set(P0.x, yGun + lift + 0.02, P0.z);
    return pitch;
  }
  // ---------- skymda enheter (0.12.0, H099) ----------
  // En enhet bakom ett högre hus (sett från kameran) får en tunn siluett i lagets färg, ritad bara där
  // den skyms (djuptest 'större än'), och main.js en liten klickbar flagga ovanför. Syns enheten
  // ritas inget extra. Om den skyms räknas med husens höjd (sim.place.height): en stråle från
  // enhetens huvud mot kameran som passerar under ett tak.
  const XRAY = new THREE.MeshBasicMaterial({ color: '#8fc4e8', transparent: true, opacity: 0.35, depthWrite: false, depthFunc: THREE.GreaterDepth });
  function addXray(e) {
    const list = [];
    e.model.pivot.traverse(o => { if (o.isMesh) list.push(o); });
    e.xray = list.map(o => { const c = new THREE.Mesh(o.geometry, XRAY); c.renderOrder = 8; c.visible = false; c.castShadow = false; o.add(c); return c; });
  }
  const camDir = new THREE.Vector3(...CAM_OFFSET).normalize();   // 0.23.1: banans vinkel (camera-eye.js)
  // Skyms punkten (x, y, z) av ett hus mellan den och kameran?
  function hidden(x, y, z) {
    const p = sim.place;
    if (!p.height) return false;
    for (let t = 1; t < 70; t += 0.7) {
      const px = x + camDir.x * t, py = y + camDir.y * t, pz = z + camDir.z * t;
      if (py > 14) return false;
      const k = p.keyAt(px, pz);
      if (k >= 0 && p.kind[k] === 2 && p.height[k] > py) return true;
    }
    return false;
  }
  let occT = 0;
  const occluded = new Map();      // id -> { x, y, z }
  function syncOcclusion(dt) {
    occT -= dt;
    if (occT > 0) return;
    occT = 0.1;
    occluded.clear();
    for (const g of sim.guns) {
      let hit = null;
      if (g.house) { /* 0.19.0: i huset syns de i fönstren, ingen siluett */ }
      else if (g.squad) {
        // gruppen: skymd när alla stående soldater skyms
        const men = g.soldiers.filter(s => !s.down);
        if (men.length && men.every(s => hidden(s.x, 1.3, s.z))) hit = { x: men.reduce((a, s) => a + s.x, 0) / men.length, y: 1.8, z: men.reduce((a, s) => a + s.z, 0) / men.length };
      } else {
        const y = (g.y ?? 0) + (g.roof ? 0.5 : 1.4);
        if (hidden(g.x, y, g.z)) hit = { x: g.x, y: y + 1.2, z: g.z };
      }
      if (hit) occluded.set(g.id, hit);
      const e = slots.get(g.id);
      if (e?.xray) { const on = !!hit; if (e.xrayOn !== on) { e.xrayOn = on; for (const m of e.xray) m.visible = on; } }
    }
  }
  function removeSlot(id) {
    const e = slots.get(id); if (!e) return;
    dropCrew(e);
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
    // 0.12.0 (H102): en pjäs som flyttas befäster den nya platsen först när den ställs upp där; den gamla
    // platsens skador ligger kvar.
    for (const s of sim.guns) if (!s.roof && !s.squad && !s.house && !dug.has(s.cell) && (!s.move || movePhase(s) === 'setup')) { dug.set(s.cell, { x: s.x, z: s.z, key: s.cell }); added = true; }
    if (added) scene.userData.fortify?.setPositions([...dug.values()], { road: onRoad });
  }
  function syncSlots(dt) {
    const k = 1 - Math.exp(-dt * 12);
    const alive = new Set();
    syncDug();
    for (const s of sim.guns) {
      alive.add(s.id);
      let e = slots.get(s.id);
      if (!e || e.key !== wantKey(s, e)) e = buildSlot(s, e);
      if (e.squad || e.house) continue;
      const w = s.weapon;
      placeSlot(e, s, dt);
      // 0.13.0: pipan följer simuleringens vridning (vridfarten), och Rotate vrider hela pjäsen
      if (w.targetId != null || s.turn) e.angle += angleDiff(e.angle, w.angle) * k;
      if (dt > 0 && s.building > 0 && Math.random() < dt * 14) fx.sparks(e.group.position.x + rnd(-1.6, 1.6), rnd(0.8, 2), e.group.position.z + rnd(-0.9, 0.9), 3);
      if (dt > 0 && e.veh && s.hp < s.maxHp * 0.5 && Math.random() < dt * (s.hp < s.maxHp * 0.25 ? 9 : 4)) fx.smoke(e.group.position.x + rnd(-0.8, 0.8), 1.8, e.group.position.z + rnd(-0.5, 0.5));
      const pv = e.model.pivot;
      pv.rotation.y = e.face - e.angle;
      // Rekyl: pjäsen stöts bakåt längs pipan och mynningen lyfts, sedan tillbaka.
      if (dt > 0) e.recoil *= Math.exp(-dt * e.look.back);
      const r = e.recoil < 0.01 ? 0 : e.recoil;
      // Pausad (dt 0): rekylen står still, inget jitter bakom menyn.
      const back = r * e.look.kick, jit = dt > 0 && r ? e.look.rattle : 0;
      const la = e.angle - e.face;
      pv.position.set(
        e.pivotHome.x - Math.cos(la) * back + rnd(-jit, jit),
        e.pivotHome.y + rnd(-jit, jit),
        e.pivotHome.z - Math.sin(la) * back + rnd(-jit, jit));
      pv.rotation.z = r * e.look.rise + (e.perch && !s.move ? perchPose(e, e.angle) : 0);
      // 0.18.0: en tyst pjäs (laget nere eller flytt) står kvar utan skytt, med pipan uppåt och åt sidan
      const silent = !!s.silent;
      if (e.model.gunner && e.model.gunner.root.visible === silent) e.model.gunner.root.visible = !silent;
      if (silent) { pv.rotation.z = 0.42; pv.rotation.x = 0.25; } else if (pv.rotation.x) pv.rotation.x = 0;
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
    const squad = isSquad(g.type);
    if (!e) { e = { key: gk, group: squad ? squadGhost(SQUAD.radius) : weaponGhost(g.type, { roof: !!g.roof }) }; scene.add(e.group); ghosts.set(gk, e); }
    ghostOn = e;
    e.group.visible = true;
    e.group.position.set(g.x, g.y ?? 0, g.z);
    // 0.13.0 (H132): spöket vänds dit skjutvinkeln pekar (dras med musen, eller mot hordens väg)
    e.group.rotation.y = g.facing != null && !squad ? -g.facing : 0;
    setGhostTone(e.group, g.ok);
    // Hemvärnet: ringen och en platta där varje soldat skulle ta skydd
    if (squad) setSquadGhost(e.group, g.x, g.z, g.men ?? []);
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
      e.position.set(c.x, liftAt(c.x, c.z), c.z); e.rotation.y = c.ry;
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
        const ly = liftAt(q.x, q.z);
        tm.makeScale(size * 0.92, 1, size * 0.92); tm.setPosition(q.x, 0.065 + ly, q.z);
        cover.setMatrixAt(n, tm);
        tm.setPosition(q.x, 0.07 + ly, q.z);
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
      const ly = liftAt(c.x, c.z);
      tm.makeScale(size * 0.92, 1, size * 0.92); tm.setPosition(c.x, 0.07 + ly, c.z);
      tiles.setMatrixAt(i, tm);
      tm.makeScale(size * 1.36, 1, size * 1.36); tm.setPosition(c.x, 0.075 + ly, c.z);
      tileEdges.setMatrixAt(i, tm);
    }
    tiles.count = tileEdges.count = n;
    tiles.instanceMatrix.needsUpdate = tileEdges.instanceMatrix.needsUpdate = true;
    const tone = want?.tone;
    const col = tone === 'rust' || tone === 'bad' ? PALETTE.rust : tone === 'ok' ? TILE_OK : PALETTE.paper;
    tileM.color.set(col); tileEdgeM.color.set(col);
    tileM.opacity = tone === 'rust' || tone === 'bad' ? 0.32 : tone === 'ok' ? 0.3 : 0.2;
  }

  // ---------- giltig mark i handen (0.14.2) ----------
  // Medan en enhet hålls i handen: en ljus, svag ton på rutorna där den får stå (main.js validTint), och en
  // tunn pil från pekaren till rutan spöket snäppte till. Tonen ligger under sikten (cover) och spöket.
  const VALID_MAX = 1400;
  // Ljuset läggs till marken (additivt), svagast mot kanten av cirkeln runt pekaren, så att det läses som
  // en mjuk ljus yta och inte som ett rutnät.
  const VALID_TONE = new THREE.Color(0.2, 0.24, 0.13), validC = new THREE.Color();
  const validM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const validGeo = new THREE.PlaneGeometry(1, 1); validGeo.rotateX(-Math.PI / 2);
  const valid = new THREE.InstancedMesh(validGeo, validM, VALID_MAX);
  valid.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(VALID_MAX * 3), 3);
  valid.count = 0; valid.frustumCulled = false; valid.renderOrder = 1; valid.castShadow = false; valid.name = 'valid-tint';
  scene.add(valid);
  let validKey = '';
  function syncValid() {
    const v = ui.valid;
    const key = v ? v.id : '';
    if (key === validKey) return;
    validKey = key;
    let n = 0;
    if (v) {
      // E4:s ljusa sand tål mindre ljus än Gnestas gräs
      const p = sim.place, size = p.size, bright = sim.route.kind === 'grid' ? 1 : 0.4;
      for (const k of v.keys) {
        if (n >= VALID_MAX) break;
        const q = p.center(k), y = (p.roof?.[k] ?? 0) + 0.05;
        const f = v.r ? Math.max(0, 1 - Math.hypot(q.x - v.x, q.z - v.z) / v.r) : 1;
        tm.makeScale(size, 1, size); tm.setPosition(q.x, y, q.z);
        valid.setMatrixAt(n, tm);
        valid.setColorAt(n++, validC.copy(VALID_TONE).multiplyScalar((0.35 + 0.65 * Math.sqrt(f)) * bright));
      }
    }
    valid.count = n; valid.instanceMatrix.needsUpdate = true; valid.instanceColor.needsUpdate = true;
  }
  // ---------- korselden i handen (0.18.0, skiva 1) ----------
  // Rutorna där enheten i handen skulle korsa en annan enhets båge (src/sim/sim.js crossfirePreview): en varm
  // guldton ovanpå sikten, så att eldgatan syns innan enheten ställs ut.
  // Ritas ovanpå sikten (den ljusa tonen) i guld, inte additivt: annars blir den vit där sikten redan är ljus.
  const XF_MAX = 900, XF_TONE = new THREE.Color('#e3a12f');
  const xfM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const xfMesh = new THREE.InstancedMesh(validGeo, xfM, XF_MAX);
  xfMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(XF_MAX * 3), 3);
  xfMesh.count = 0; xfMesh.frustumCulled = false; xfMesh.renderOrder = 6; xfMesh.castShadow = false; xfMesh.name = 'crossfire';
  scene.add(xfMesh);
  let xfKey = '';
  function syncXf() {
    const v = ui.xf, key = v ? v.id : '';
    if (key === xfKey) return;
    xfKey = key;
    let n = 0;
    if (v) {
      const p = sim.place, size = p.size;
      for (const k of v.keys) {
        if (n >= XF_MAX) break;
        const q = p.center(k);
        tm.makeScale(size * 0.86, 1, size * 0.86); tm.setPosition(q.x, 0.09 + liftAt(q.x, q.z), q.z);
        xfMesh.setMatrixAt(n, tm); xfMesh.setColorAt(n++, XF_TONE);
      }
    }
    xfMesh.count = n; xfMesh.instanceMatrix.needsUpdate = true; if (n) xfMesh.instanceColor.needsUpdate = true;
  }
  // ---------- korseldens zoner (0.18.1, speltestet av 0.18.0: "korselden såg jag aldrig") ----------
  // Rutorna där två utställda enheters bågar korsas (src/sim/sim.js crossfireZones), svagt guld i bygget och mellan
  // vågorna, utan att något hålls i handen. Samma ruta och ton som förhandsvisningen men mycket svagare.
  const xzM = new THREE.MeshBasicMaterial({ color: XF_TONE, transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const xzMesh = new THREE.InstancedMesh(validGeo, xzM, XF_MAX);
  xzMesh.count = 0; xzMesh.frustumCulled = false; xzMesh.renderOrder = 5; xzMesh.castShadow = false; xzMesh.name = 'crossfire-zones';
  scene.add(xzMesh);
  let xzKey = '';
  function syncXz() {
    const v = ui.xfZone, key = v ? v.id : '';
    if (key === xzKey) return;
    xzKey = key;
    let n = 0;
    if (v) {
      const p = sim.place, size = p.size;
      for (const k of v.keys) {
        if (n >= XF_MAX) break;
        const q = p.center(k);
        tm.makeScale(size * 0.8, 1, size * 0.8); tm.setPosition(q.x, 0.08 + liftAt(q.x, q.z), q.z);
        xzMesh.setMatrixAt(n++, tm);
      }
    }
    xzMesh.count = n; xzMesh.instanceMatrix.needsUpdate = true;
  }
  // Pilen: ett smalt platt skaft och en spets på marken, ovanpå allt (syns också över häckar och sandsäckar).
  const snapM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const shaftGeo = new THREE.PlaneGeometry(1, 0.3); shaftGeo.rotateX(-Math.PI / 2); shaftGeo.translate(0.5, 0, 0);
  const headGeo = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.55), new THREE.Vector2(0.9, 0), new THREE.Vector2(0, -0.55)])); headGeo.rotateX(-Math.PI / 2);
  const snapLine = new THREE.Group(), shaft = new THREE.Mesh(shaftGeo, snapM), head = new THREE.Mesh(headGeo, snapM);
  shaft.renderOrder = head.renderOrder = 8; shaft.frustumCulled = head.frustumCulled = false;
  snapLine.add(shaft, head); snapLine.visible = false; snapLine.name = 'snap-arrow';
  scene.add(snapLine);
  function syncSnap() {
    const a = ui.snap;
    snapLine.visible = !!a;
    if (!a) return;
    const [x0, z0] = a.from, [x1, z1] = a.to, d = Math.hypot(x1 - x0, z1 - z0);
    // spetsen slutar en bit före spökets mitt (sandsäckarna)
    const len = d - 0.8;
    if (len < 1.0) { snapLine.visible = false; return; }
    snapLine.position.set(x0, 0.22, z0);
    snapLine.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    shaft.scale.set(Math.max(0.01, len - 0.85), 1, 1);
    head.position.set(len - 0.9, 0, 0);
  }

  // ---------- markering, pekare och räckvidd ----------
  let ui = { selected: null, hover: null, range: null, tiles: null, ghost: null, cover: null, obGhost: null, marks: false, squadRange: null };
  const isSel = (kind, id) => ui.selected?.kind === kind && ui.selected.id === id;
  const isHov = (kind, id) => ui.hover?.kind === kind && ui.hover.id === id;
  const ringM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.5, depthWrite: false });
  const selRing = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.3, 48), ringM);
  selRing.rotation.x = -Math.PI / 2; selRing.position.y = 0.06; selRing.visible = false;
  const rangeM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const rangeFillM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.06, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const range = new THREE.Group();
  const rangeEdge = new THREE.Mesh(new THREE.RingGeometry(0.988, 1, 128), rangeM);
  const rangeFill = new THREE.Mesh(new THREE.CircleGeometry(1, 96), rangeFillM);
  for (const r of [rangeEdge, rangeFill]) { r.rotation.x = -Math.PI / 2; range.add(r); }
  rangeEdge.position.y = 0.08; rangeFill.position.y = 0.07;
  range.visible = false;
  scene.add(selRing, range);
  // 0.12.0 (H108): prickskyttens sektor, en kil på marken (i handen och när pjäsen är vald)
  // 0.12.1 (speltestet: "konen ritas ovanpå hustaken, jag ser inte vad den täcker"): kilen ligger på
  // marken med djuptest, så att husen och taken skymmer den som allt annat på marken.
  const sectorM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const sectorEdgeM = new THREE.LineBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.85 });
  const sector = new THREE.Group();
  let sectorKey = '';
  sector.visible = false; sector.renderOrder = 7;
  scene.add(sector);
  function syncSector() {
    const s = ui.sector;
    sector.visible = !!s;
    if (!s) return;
    const key = s.cone + '|' + s.r.toFixed(2);
    if (key !== sectorKey) {
      sectorKey = key;
      for (const c of [...sector.children]) { c.geometry.dispose(); sector.remove(c); }
      const half = s.cone / 2 * Math.PI / 180;
      const fan = new THREE.CircleGeometry(s.r, 40, -half, 2 * half); fan.rotateX(-Math.PI / 2);
      const fm = new THREE.Mesh(fan, sectorM); fm.renderOrder = 7; sector.add(fm);
      const pts = [new THREE.Vector3(0, 0, 0)];
      for (let i = 0; i <= 40; i++) { const a = -half + 2 * half * i / 40; pts.push(new THREE.Vector3(Math.cos(a) * s.r, 0, -Math.sin(a) * s.r)); }
      pts.push(new THREE.Vector3(0, 0, 0));
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), sectorEdgeM); ln.renderOrder = 7; sector.add(ln);
    }
    // kilen ligger på marken (också när skytten ligger på ett tak), vriden mot facing (atan2(dz, dx))
    sector.position.set(s.x, 0.09, s.z);
    sector.rotation.y = -s.facing;
    const bad = s.ok === false;
    sectorM.color.set(bad ? PALETTE.rust : PALETTE.paper); sectorEdgeM.color.set(bad ? PALETTE.rust : PALETTE.paper);
  }
  // ---------- flyttens väg (0.13.0, H136) ----------
  // Medan en flytt hålls i handen: vägen laget skulle springa (en streckad linje på marken) och en ring
  // vid varje waypoint. ui.route = { pts: [[x, z], ...], ok, via: [[x, z], ...] }.
  const ROUTE_MAX = 512;
  const routeGeo = new THREE.BufferGeometry();
  routeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ROUTE_MAX * 3), 3));
  const routeM = new THREE.LineDashedMaterial({ color: PALETTE.paper, dashSize: 0.9, gapSize: 0.5, transparent: true, opacity: 0.9, depthWrite: false });
  const routeLine = new THREE.Line(routeGeo, routeM);
  routeLine.frustumCulled = false; routeLine.renderOrder = 7; routeLine.visible = false;
  const wpGeo = new THREE.RingGeometry(0.55, 0.8, 20); wpGeo.rotateX(-Math.PI / 2);
  const wpM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.9, depthWrite: false });
  const wps = new THREE.InstancedMesh(wpGeo, wpM, 12);
  wps.count = 0; wps.frustumCulled = false; wps.renderOrder = 7;
  scene.add(routeLine, wps);
  let routeKey = '';
  function syncRoute() {
    const r = ui.route;
    const key = r ? r.pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(';') + '|' + r.ok + '|' + (r.via ?? []).length : '';
    if (key === routeKey) return;
    routeKey = key;
    routeLine.visible = !!r && r.pts.length > 1;
    wps.count = 0;
    if (!r) return;
    const pos = routeGeo.attributes.position, n = Math.min(ROUTE_MAX, r.pts.length);
    for (let i = 0; i < n; i++) pos.setXYZ(i, r.pts[i][0], 0.18, r.pts[i][1]);
    pos.needsUpdate = true; routeGeo.setDrawRange(0, n);
    routeLine.computeLineDistances();
    routeM.color.set(r.ok ? PALETTE.paper : PALETTE.rust); wpM.color.set(r.ok ? PALETTE.paper : PALETTE.rust);
    (r.via ?? []).slice(0, 12).forEach(([x, z], i) => { tm.makeTranslation(x, 0.12, z); wps.setMatrixAt(i, tm); wps.count = i + 1; });
    wps.instanceMatrix.needsUpdate = true;
  }
  // 0.19.0 (H459, speltestet av 0.18.1: "i flyttläget visar hovring över ett hus samma markspöke som på marken"): med
  // en enhet i handen över ett hus som går att besätta, och för en vald enhet i ett hus, lyser huset: en ram runt
  // huset och en ton över taket (grön går, röd går inte, ljus vald). ui.houseHi = { id, tone }.
  const HH_TONE = { ok: '#79e06c', bad: PALETTE.rust, paper: PALETTE.paper };
  const hhEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthTest: false }));
  const hhFill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false }));
  hhEdges.renderOrder = 9; hhFill.renderOrder = 8; hhEdges.visible = hhFill.visible = false; hhEdges.frustumCulled = hhFill.frustumCulled = false;
  scene.add(hhEdges, hhFill);
  let hhKey = '';
  function syncHouseHi() {
    const hi = ui.houseHi;
    const key = hi ? hi.id + ':' + hi.tone : '';
    if (key === hhKey) return;
    hhKey = key;
    const h = hi ? housesFor(sim).find(q => q.id === hi.id) : null;
    hhEdges.visible = hhFill.visible = !!h;
    if (!h) return;
    const top = Math.max(2.4, h.height) + 0.15;
    for (const m of [hhEdges, hhFill]) { m.scale.set(h.w + 0.5, top, h.d + 0.5); m.position.set(h.x, top / 2, h.z); m.rotation.set(0, h.ry, 0); m.material.color.set(HH_TONE[hi.tone] ?? HH_TONE.paper); }
  }
  function syncUi() {
    // ring under en byggd pjäs som är vald eller pekas på
    const ringFor = ui.selected?.kind === 'gun' ? ui.selected : ui.hover?.kind === 'gun' ? ui.hover : null;
    const e = ringFor && slots.get(ringFor.id);
    // Hemvärnet: en ring under varje soldat och hans siktlinje i stället för pjäsens ring
    const sq = e?.squad ? sim.guns.find(g => g.id === ringFor.id) : null;
    squadView.show(sq, sq ? ui.squadRange ?? 15 : 0, ringFor === ui.selected);
    selRing.visible = !!e && !e.squad && !e.house;
    syncHouseHi();
    if (selRing.visible) {
      selRing.position.x = e.group.position.x; selRing.position.z = e.group.position.z;
      const sel = ringFor === ui.selected;
      ringM.color.set(sel ? PALETTE.rust : PALETTE.paper); ringM.opacity = sel ? 0.85 : 0.5;
    }
    range.visible = !!ui.range;
    if (ui.range) { range.position.set(ui.range.x, 0, ui.range.z); range.scale.setScalar(ui.range.r); }
  }
  function setUi(next) { ui = { selected: null, hover: null, range: null, tiles: null, ghost: null, cover: null, obGhost: null, marks: false, squadRange: null, sector: null, route: null, valid: null, snap: null, houseHi: null, ...next }; }
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
    for (const i of [...cells.keys()]) if (!sim.obstacles[i]) { if (cells.get(i).home) shoveAway(i); else removeCell(i); }
    for (const key of Object.keys(sim.obstacles)) {
      const i = Number(key), ob = sim.obstacles[key];
      let e = cells.get(i);
      if (!e || e.type !== ob.type) {
        if (e) removeCell(i);
        const grid = sim.route.kind === 'grid';
        const group = obstacleModel(ob.type, grid ? { span: sim.route.grid.size } : undefined);
        const c = cellCenter(i);
        // 0.17.1 (speltestet av 0.17.0: spärren på bron ritades under däcket): på däckets höjd
        group.position.set(c.x, liftAt(c.x, c.z), c.z);
        // E4: modellens +x mot horden. Rutnätet: spärren ligger tvärs över gatan.
        group.rotation.y = grid ? (sim.route.axis(i) === 'x' ? 0 : Math.PI / 2) : Math.atan2(c.dirZ, -c.dirX);
        group.userData.pick = { kind: 'cell', index: i };
        scene.add(group);
        e = { type: ob.type, group, frac: 1 };
        cells.set(i, e); cellObjects.set(i, group);
      }
      // 0.17.1: en genombruten spärr (en ruta har gått sönder) ser sönderslagen ut i alla sina rutor
      const frac = ob.breached ? 0 : ob.maxHp ? ob.hp / ob.maxHp : ob.durability / ob.maxDurability;
      if (Math.abs(frac - e.frac) > 0.004) { e.frac = frac; setObstacleWear(e.group, frac); }
      // 0.19.0 (H456): bjässen knuffar undan bilarna: vraken glider undan längs gatan och vrids
      if (ob.shove) shoveCell(e, i, ob.shove);
    }
  }
  const wrecks = [];
  function shoveCell(e, i, k) {
    const c = cellCenter(i);
    if (!e.home) e.home = { x: e.group.position.x, z: e.group.position.z, ry: e.group.rotation.y, dx: c.dirX, dz: c.dirZ, side: (i & 1) ? 1 : -1 };
    // 0.19.1 (speltestet av 0.19.0: "knuffen syns knappt"): längre åt sidan och mer vriden
    const h = e.home, push = 1.4 * k, side = 1.4 * k * h.side;
    e.group.position.x = h.x + h.dx * push - h.dz * side; e.group.position.z = h.z + h.dz * push + h.dx * side;
    e.group.rotation.y = h.ry + h.side * 0.8 * k;
  }
  // En undanknuffad bilruta: modellen ligger kvar en stund vid sidan av gatan (glider klart), sedan bort.
  function shoveAway(i) {
    const e = cells.get(i); if (!e) return false;
    cells.delete(i); cellObjects.delete(i);
    shoveCell(e, i, 1);
    wrecks.push({ e, t: 0, from: { x: e.group.position.x, z: e.group.position.z }, d: { x: e.home.dx * 1.2 - e.home.dz * 2.2 * e.home.side, z: e.home.dz * 1.2 + e.home.dx * 2.2 * e.home.side } });
    return true;
  }
  function syncWrecks(dt) {
    for (let n = wrecks.length - 1; n >= 0; n--) {
      const w = wrecks[n];
      w.t += dt;
      const k = Math.min(1, w.t / 0.6), ease = 1 - (1 - k) * (1 - k);
      w.e.group.position.x = w.from.x + w.d.x * ease; w.e.group.position.z = w.from.z + w.d.z * ease;
      if (w.t > 8) { disposeModel(w.e.group); wrecks.splice(n, 1); }
    }
  }

  // ---------- basen ----------
  // Står där vägen tar slut. Lyser rött och skakar en kort stund när en zombie tar sig in.
  let base = null, baseHome = new THREE.Vector3(), baseHitT = 0;
  const BASE_HIT = 0.7;
  function buildBase() {
    if (base) disposeModel(base);
    const rink = sim.map.baseModel === 'rink' && sim.map.iceRink;
    base = rink ? rinkEntranceModel(rink) : sim.map.baseModel === 'roadblock' ? roadblockModel() : baseModel();
    if (rink) {
      // Gnesta: överlevarna är inne i ishallen, basen är entrén (fasaden mot rondellen).
      const [x, z] = rink.at(rink.face, rink.main ?? 0);
      baseHome.set(x, 0, z);
      base.rotation.y = rink.ry;
      // 0.25.0 (H559): en mindre fasad (villan på Barrstigen) ritar planket och sandsäckarna mindre
      if (rink.scale) base.scale.setScalar(rink.scale);
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
        // 0.18.1: ett pjäslag som bryts springer från pjäsen mot basen (en grupp springer redan själv)
        case 'routed': {
          const g = sim.guns.find(q => q.id === ev.gunId);
          if (g && !g.squad) { const b = sim.route.base ?? { x: 0, z: 0 }; squadView.flee(ev.x, ev.z, b.x, b.z, WEAPONS[ev.type]?.crew ?? 2); }
          break;
        }
        case 'shot': {
          if (ev.soldier != null) {
            // Hemvärnet: skottet går från soldatens gevär (Ak 4)
            const mz = squadView.fire(ev.gunId, ev.soldier); if (!mz) break;
            const sc = zombieScale(ev.targetId);
            mz.getWorldPosition(from);
            const spread = ev.hit ? 0.3 : 1.4;
            to.set(ev.x + rnd(-spread, spread), (ev.hit ? 1.2 : rnd(0.4, 2.2)) * sc, ev.z + rnd(-spread, spread));
            if (!ev.hit) to.sub(from).multiplyScalar(1.4).add(from);
            fx.tracer(from, to, 'light');
            fx.flash(mz, ev.gunId + ':' + ev.soldier, 'light');
            fx.casing(mz);
            break;
          }
          const e = slots.get(ev.gunId); if (!e) break;
          const sc = zombieScale(ev.targetId);
          if (e.house) {
            // 0.19.0 (H459): kulsprutan i huset skjuter ut genom fönstret
            const mz = squadView.fire(ev.gunId, 0); if (!mz) break;
            mz.getWorldPosition(from);
            const sp = ev.hit ? 0.3 : 1.4;
            to.set(ev.x + rnd(-sp, sp), (ev.hit ? 1.2 : rnd(0.4, 2.2)) * sc, ev.z + rnd(-sp, sp));
            if (!ev.hit) to.sub(from).multiplyScalar(1.4).add(from);
            fx.tracer(from, to, e.look.tracer); fx.flash(mz, ev.gunId, e.look.flash);
            break;
          }
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
        case 'dormantBurst': dormant.burst(ev.house); break;
        case 'soldierHit': {
          // en zombie slår en soldat: lite blod, högst var tredjedels sekund per soldat
          const k = 's' + ev.gunId + ':' + ev.soldier;
          if (clock - (lastChip.get(k) ?? -1) < 0.33) break;
          lastChip.set(k, clock);
          fx.gibs(ev.x, 0.6, ev.z, 3);
          break;
        }
        // 0.13.0: pillboxen tar stryk och faller, ett lag på väg slås ner
        case 'vehicleHit': {
          const kk = 'v' + ev.gunId;
          if (clock - (lastChip.get(kk) ?? -1) < 0.3) break;
          lastChip.set(kk, clock);
          fx.chips(ev.x + rnd(-1, 1), rnd(0.6, 1.4), ev.z + rnd(-0.8, 0.8), 3);
          break;
        }
        case 'vehicleDown': fx.blast(ev.x, ev.z, 2.4); for (let q = 0; q < 4; q++) fx.puff(ev.x + rnd(-1, 1), ev.z + rnd(-1, 1), 5); break;
        case 'crewHit': { const kk = 'c' + ev.gunId; if (clock - (lastChip.get(kk) ?? -1) < 0.33) break; lastChip.set(kk, clock); fx.gibs(ev.x, 0.7, ev.z, 3); break; }
        case 'crewLost': fx.gibs(ev.x, 0.7, ev.z, 10); fx.splat(ev.x, ev.z, rnd(1.4, 2)); break;
        case 'soldierDown': fx.gibs(ev.x, 0.7, ev.z, 8); fx.splat(ev.x + rnd(-0.4, 0.4), ev.z + rnd(-0.4, 0.4), rnd(1.2, 1.8)); break;
        case 'grenade': {
          const e = slots.get(ev.gunId); if (!e?.model) break;
          e.model.gunner.root.getWorldPosition(from);
          from.y += 1.5;
          to.set(ev.x, 0.15, ev.z);
          fx.grenade(from, to, ev.flight);
          break;
        }
        case 'launch': {
          // granattillsatsen: granaten lämnar röret under pipan i en flack båge
          const e = slots.get(ev.gunId); if (!e?.model) break;
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
        // 0.19.1 (H461): bjässen tar tag i bilarna: damm och plåtbitar när knuffen börjar, så att den syns
        case 'carShove': {
          const c = cellCenter(ev.cell);
          for (let k = 0; k < 3; k++) fx.puff(c.x + rnd(-0.6, 0.6), c.z + rnd(-0.6, 0.6), 4);
          fx.chips(c.x, 0.9, c.z, 6);
          break;
        }
        case 'obstacleBroken': {
          const c = cellCenter(ev.cell), sp = sim.route.kind === 'grid' ? 0.9 : 3.5;
          for (let k = 0; k < (sp < 1 ? 2 : 4); k++) fx.puff(c.x, c.z + rnd(-sp, sp), 4);
          if (ev.type === 'block' || ev.type === 'car') for (let k = 0; k < (sp < 1 ? 3 : 5) + (ev.shoved ? 4 : 0); k++) fx.chips(c.x, 0.8, c.z + rnd(-sp - 0.5, sp + 0.5), 4);
          if (ev.shoved) for (let k = 0; k < 4; k++) fx.puff(c.x + rnd(-1.2, 1.2), c.z + rnd(-1.2, 1.2), 5);
          if (!(ev.shoved && shoveAway(ev.cell))) removeCell(ev.cell);
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
    squadView.sync(sim, dt);
    civilians.sync(sim, dt, viewH);
    syncRoute();
    syncCells(); syncWrecks(dt);
    syncCellMarks();
    syncTiles();
    syncGhost();
    syncObGhost();
    syncCover();
    syncValid();
    syncXf();
    syncXz();
    syncSnap();
    syncUi();
    syncSector();
    syncOcclusion(dt);
    syncBase(dt);
    dormant.update(dt, viewH);
    fx.update(dt);
  }

  function setSim(next) {
    for (const [id, e] of zombies) removeZombie(id, e);
    for (const e of slots.values()) { dropCrew(e); disposeModel(e.group); }
    slots.clear(); slotObjects.clear();
    for (const i of [...cells.keys()]) removeCell(i);
    for (const w of wrecks.splice(0)) disposeModel(w.e.group);
    squadView.clear();
    civilians.clear();
    lastChip.clear();
    fx.clear();
    const remap = next.map !== sim.map;
    sim = next;
    dug.clear(); scene.userData.fortify?.reset();
    dormant.setSim(sim);
    if (remap) { buildCellMarks(); buildBase(); }
    baseHitT = 0; baseFrac = -1; if (base) { setBaseGlow(base, 0); base.position.copy(baseHome); }
    for (const c of cellMarks) c.state = null;
    ui = { selected: null, hover: null, range: null, tiles: null, ghost: null, cover: null, obGhost: null, marks: false };
    tileKey = '-'; coverKey = '-'; validKey = '-';
  }

  buildCellMarks();
  buildBase();
  // Display-läget för en zombie (för skott och siffror), eller null.
  const zombieAt = id => { const e = zombies.get(id); return e ? { x: e.x, z: e.z } : null; };
  dormant.setSim(sim);
  return { occluded, dormant, sync, consume, setSim, setUi, setZoom, pickTargets, rayTargets, slotObjects, cellObjects, fx, zombieAt, rings, horde, squadView, get dug() { return [...dug.values()]; } };
}

function hashId(id) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 100000;
}
