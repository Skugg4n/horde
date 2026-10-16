// Hemvärnet i bild (0.9.0): soldaterna ritas som instanser, på samma sätt som horden (horde.js).
// Varje soldat har sitt skelett utanför scenen; här ställs posen (spring, ställning, stupad) och
// matriserna skrivs till instansbuffertarna. Bara bild: läget, sikten och liven kommer från
// simuleringen (src/sim/squad.js).
//
// Springet: när en grupp ställs ut (eller stupade ersätts) springer soldaterna från markeringen
// till sina rutor, 1 till 2 sekunder. Sedan går de ner i sin ställning: på huk och lutar sig ut
// vid en husknut eller bil, på knä bakom häck och staket, på magen i diket och på gräset.
import * as THREE from 'three';
import { createHorde } from './horde.js';
import { hvSoldierModel, hvPose, hvRun, hvDown } from './models.js';
import { PALETTE } from './kit.js';
import { KIND } from '../sim/placement.js';
import { runTime } from '../sim/squad.js';
import { soldierAt } from '../sim/sim.js';

const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
// 0.12.2 (speltestet: "de ligger och snurrar på marken"): den liggande vrider sig runt höften, högst
// PRONE_TURN rad/s, och kryper medan han vänder. På knä och huk vrids överkroppen först (högst TWIST_MAX
// från benen, TORSO_RATE) och benen följer (LEGS_RATE). Andning, svaj, viktförskjutning, huvudet som
// spanar och en omladdning ibland när han inte skjuter. Allt deterministiskt per soldat, inga nya
// objekt per bildruta (po återanvänds).
const PRONE_TURN = Math.PI / 2, TORSO_RATE = 9, TWIST_MAX = 0.7, LEGS_RATE = 2.4;
const HIP_BACK = 0.95;               // den liggandes höft ligger så långt bakom roten (hvPose)
const RELOAD_TIME = 2.2, MAG = 20;   // Ak 4: 20 skott i magasinet
const po = { lean: 0, recoil: 0, twist: 0, crawl: -1, breath: 0, sway: 0, scan: 0, reload: 0 };
const rnd = e => { e.r = (Math.imul(e.r, 1664525) + 1013904223) >>> 0; return e.r / 4294967296; };
const DOWN_TIME = 0.45;
const LINES_MAX = 12;

// 0.10.1 (speltestet: m/90 på Gnestas gräs syns knappt): en svag ring i gruppens färg under varje
// soldat som står, oavsett markering. Kamouflaget är kvar; ringen säger "här ligger en av våra".
const MARK_MAX = 96, MARK_COLOR = '#b9d3dc';

export function createSquadView(scene) {
  const horde = createHorde(scene, { glow: true });
  const squads = new Map();         // gunId -> { men: Map(i -> e) }
  let sim = null;
  // 0.10.2 (speltestet av 0.10.1: soldaterna försvann i trädskugga): ringen ritades ovanpå allt.
  // H094 (0.11.0, speltestet av 0.10.2: ringarna syntes ovanpå hustaken): djuptest igen, med en liten
  // förskjutning mot kameran så att den inte flimrar mot marken; i skugga syns gruppen på hjälmbandet.
  const markGeo = new THREE.RingGeometry(0.42, 0.62, 24); markGeo.rotateX(-Math.PI / 2);
  const markM = new THREE.MeshBasicMaterial({ color: MARK_COLOR, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const marks = new THREE.InstancedMesh(markGeo, markM, MARK_MAX);
  marks.count = 0; marks.frustumCulled = false; marks.renderOrder = 6; marks.castShadow = false; marks.name = 'hv-marks';
  const edgeGeo = new THREE.RingGeometry(0.32, 0.74, 24); edgeGeo.rotateX(-Math.PI / 2);
  const edgeM = new THREE.MeshBasicMaterial({ color: 0x0c0d0b, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const edges = new THREE.InstancedMesh(edgeGeo, edgeM, MARK_MAX);
  edges.count = 0; edges.frustumCulled = false; edges.renderOrder = 5; edges.castShadow = false; edges.name = 'hv-marks-edge';
  scene.add(edges, marks);
  const mm = new THREE.Matrix4();

  function lean(e, p, s) {
    // åt vilket håll han lutar sig ut: bort från huset eller bilen bredvid (sett från hans håll)
    let vx = 0, vz = 0;
    const w = p.w, i = s.cell % w, j = (s.cell - i) / w;
    for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= w || b >= p.h) continue;
      const k = p.kind[b * w + a];
      if (k === KIND.house || k === KIND.thing) { vx += di; vz += dj; }
    }
    const lx = vx * Math.cos(e.ry) - vz * Math.sin(e.ry);      // modellens +x i världen: (cos ry, -sin ry)
    return lx > 0.01 ? -1 : lx < -0.01 ? 1 : 0;
  }
  function addMan(g, s) {
    // 0.13.0: infanteriet och de civila har sina egna modeller (models.js hvSoldierModel)
    const kind = g.weapon.type === 'inf' ? 'inf' : g.weapon.type === 'civ' ? 'civ' : 'hv';
    const parts = hvSoldierModel(hashId(g.id) * 7 + s.i, kind);
    horde.attach(parts);
    const ry = Math.atan2(Math.cos(s.face), Math.sin(s.face));
    const seed = hashId(g.id) * 7 + s.i;
    const e = { parts, x: g.x, z: g.z, ry, aim: ry, t: (seed % 97) * 0.37, r: seed >>> 0, shots: 0, quiet: 0, rl: 0, nextIdle: 10 + (seed % 13), scan: 0, crawl: 0, run: { t: 0, dur: s.run > 0 ? s.run : runTime(Math.hypot(s.x - g.x, s.z - g.z)) }, phase: 0, down: s.down ? 1 : 0, wasDown: s.down, recoil: 0, mv: s.mv };
    if (s.down) { e.run = null; e.x = s.x; e.z = s.z; }
    return e;
  }
  function sync(next, dt) {
    sim = next;
    horde.begin();
    const alive = new Set();
    let nm = 0;
    for (const g of sim.guns) {
      if (!g.squad) continue;
      alive.add(g.id);
      let sq = squads.get(g.id);
      if (!sq) { sq = { men: new Map() }; squads.set(g.id, sq); }
      for (const s of g.soldiers) {
        let e = sq.men.get(s.i);
        if (!e) { e = addMan(g, s); sq.men.set(s.i, e); }
        // ersatt: springer ut från markeringen igen
        if (e.wasDown && !s.down) { e.down = 0; e.x = g.x; e.z = g.z; e.run = { t: 0, dur: runTime(Math.hypot(s.x - g.x, s.z - g.z)) }; }
        e.wasDown = s.down;
        // 0.12.0 (H102): gruppen flyttas; varje soldat springer från där han står till sin nya plats
        if ((s.mv ?? 0) !== (e.mv ?? 0)) { e.mv = s.mv; if (!s.down && !s.path) e.run = { t: 0, dur: s.runTotal ?? s.run, x0: e.x, z0: e.z }; }
        const parts = e.parts;
        if (s.down) {
          e.run = null;
          // en stupad ligger kvar där han föll (gruppen kan ha flyttats sedan dess)
          if (e.down === 0) { e.x = s.x; e.z = s.z; }
          e.down = Math.min(1, e.down + dt / DOWN_TIME);
          hvDown(parts, e.down * e.down);
        } else if (s.path) {
          // 0.13.0 (H134): på väg längs sin väg (simuleringen flyttar honom), i springposen med vapnet
          e.run = null;
          const p = soldierAt(s), px = e.x, pz = e.z;
          e.x = p.x; e.z = p.z;
          const mv = Math.hypot(e.x - px, e.z - pz);
          if (mv > 1e-4) e.ry += angleDiff(e.ry, Math.atan2(e.x - px, e.z - pz)) * Math.min(1, dt * 14);
          e.phase += mv * 2.4;
          hvRun(parts, e.phase);
        } else if (e.run) {
          const r = e.run;
          r.t += dt;
          const k = Math.min(1, r.t / r.dur), ease = k * k * (3 - 2 * k);
          const px = e.x, pz = e.z;
          const x0 = r.x0 ?? g.x, z0 = r.z0 ?? g.z;
          e.x = x0 + (s.x - x0) * ease; e.z = z0 + (s.z - z0) * ease;
          const mv = Math.hypot(e.x - px, e.z - pz);
          if (mv > 1e-4) e.ry += angleDiff(e.ry, Math.atan2(e.x - px, e.z - pz)) * Math.min(1, dt * 14);
          e.phase += mv * 2.4;
          hvRun(parts, e.phase);
          if (k >= 1) e.run = null;
        } else {
          // ställningen: den liggande som rest sig för ett mål utanför bågen står på knä (sim)
          const stance = s.stance === 'prone' && s.risen ? 'kneel' : s.stance;
          const firing = s.targetId != null;
          e.t += dt;
          // siktar mot målet, annars mot gatan han vaktar
          const want = firing ? s.angle : s.face, wantRy = Math.atan2(Math.cos(want), Math.sin(want));
          po.crawl = -1; po.twist = 0;
          if (stance === 'prone') {
            // runt höften, högst PRONE_TURN rad/s; kryper medan han vänder
            const d = angleDiff(e.ry, wantRy), step = Math.sign(d) * Math.min(Math.abs(d), PRONE_TURN * dt);
            e.ry += step;
            if (Math.abs(d) > 0.03) { e.crawl += Math.abs(step) * 9; po.crawl = e.crawl; }
            e.aim = e.ry;
          } else {
            // överkroppen först, benen efter
            e.aim += angleDiff(e.aim, wantRy) * Math.min(1, dt * TORSO_RATE);
            const tw = angleDiff(e.ry, e.aim);
            if (Math.abs(tw) > TWIST_MAX) e.ry += tw - Math.sign(tw) * TWIST_MAX;
            e.ry += angleDiff(e.ry, e.aim) * Math.min(1, dt * LEGS_RATE);
            po.twist = angleDiff(e.ry, e.aim);
          }
          // den liggandes höft står still på hans ruta; roten (huvudänden) ligger framför den
          const tx = stance === 'prone' ? s.x + Math.sin(e.ry) * HIP_BACK : s.x, tz = stance === 'prone' ? s.z + Math.cos(e.ry) * HIP_BACK : s.z;
          const k = dt > 0 ? Math.min(1, dt * 8) : 0;
          e.x += (tx - e.x) * k; e.z += (tz - e.z) * k;
          // tyst: omladdning efter ett magasin eller ibland av vana
          e.quiet = firing ? 0 : e.quiet + dt;
          if (e.rl > 0) e.rl = e.rl + dt / RELOAD_TIME >= 1 ? 0 : e.rl + dt / RELOAD_TIME;
          else if ((e.shots >= MAG && e.quiet > 0.6) || (!firing && e.t > e.nextIdle)) { e.rl = 1e-3; e.shots = 0; e.nextIdle = e.t + 14 + rnd(e) * 16; }
          if (firing) e.nextIdle = Math.max(e.nextIdle, e.t + 6);
          e.scan += ((firing ? 0 : Math.sin(e.t * 0.55 + e.r % 7) * 0.55) - e.scan) * Math.min(1, dt * 3);
          if (dt > 0) e.recoil *= Math.exp(-dt * 18);
          po.lean = stance === 'crouch' ? lean(e, sim.place, s) : 0;
          po.recoil = e.recoil < 0.02 || e.rl > 0 ? 0 : e.recoil;
          po.breath = e.t * (firing ? 3.2 : 2.1);
          po.sway = (Math.sin(e.t * 0.37 + (e.r % 5)) * 0.7 + Math.sin(e.t * 0.11) * 0.3) * (firing ? 0.3 : 1);
          po.scan = e.scan;
          po.reload = e.rl;
          hvPose(parts, stance, po);
        }
        parts.root.position.set(e.x, 0, e.z);
        parts.root.rotation.y = e.ry;
        horde.draw(parts);
        if (!s.down && nm < MARK_MAX) { mm.makeTranslation(e.x, 0.06, e.z); edges.setMatrixAt(nm, mm); marks.setMatrixAt(nm++, mm); }
      }
    }
    marks.count = edges.count = nm; marks.instanceMatrix.needsUpdate = true; edges.instanceMatrix.needsUpdate = true;
    for (const [id, sq] of squads) if (!alive.has(id)) { for (const e of sq.men.values()) horde.release(e.parts); squads.delete(id); }
    horde.end();
  }
  const man = (gunId, i) => squads.get(gunId)?.men.get(i) ?? null;
  // Mynningen för skottet (världsmatrisen är från förra bildrutans pose) och en stöt bakåt.
  function fire(gunId, i) {
    const e = man(gunId, i);
    if (!e || e.run || e.down) return null;
    e.recoil = 1; e.shots++; e.rl = 0;
    e.parts.root.updateMatrixWorld(true);
    return e.parts.muzzle;
  }
  const position = (gunId, i) => { const e = man(gunId, i); return e ? { x: e.x, z: e.z } : null; };

  // Gruppens sikt när den är vald eller pekas på: en svag linje per soldat ut längs det han
  // vaktar (eller mot målet), lika lång som räckvidden, och en liten ring under varje man.
  const lineGeo = new THREE.BufferGeometry();
  const linePos = new Float32Array(LINES_MAX * 6);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lineM = new THREE.LineBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.32, depthWrite: false });
  const lines = new THREE.LineSegments(lineGeo, lineM);
  lines.frustumCulled = false; lines.renderOrder = 3; lines.visible = false;
  const ringGeo = new THREE.RingGeometry(0.7, 0.86, 20); ringGeo.rotateX(-Math.PI / 2);
  const ringM = new THREE.MeshBasicMaterial({ color: PALETTE.paper, transparent: true, opacity: 0.7, depthWrite: false });
  const rings = new THREE.InstancedMesh(ringGeo, ringM, LINES_MAX);
  rings.count = 0; rings.frustumCulled = false; rings.renderOrder = 3; rings.castShadow = false;
  scene.add(lines, rings);
  const tm = new THREE.Matrix4();
  function show(g, range, selected) {
    if (!g?.squad) { lines.visible = false; rings.count = 0; return; }
    let n = 0;
    for (const s of g.soldiers) {
      if (n >= LINES_MAX) break;
      const e = man(g.id, s.i);
      const x = e?.x ?? s.x, z = e?.z ?? s.z;
      tm.makeTranslation(x, 0.075, z);
      rings.setMatrixAt(n, tm);
      const a = s.targetId != null ? s.angle : s.face;
      const len = s.down ? 0 : range;
      linePos.set([x, 0.3, z, x + Math.cos(a) * len, 0.3, z + Math.sin(a) * len], n * 6);
      n++;
    }
    rings.count = n; rings.instanceMatrix.needsUpdate = true;
    lineGeo.setDrawRange(0, n * 2); lineGeo.attributes.position.needsUpdate = true;
    lines.visible = n > 0;
    ringM.color.set(selected ? PALETTE.rust : PALETTE.paper);
  }
  function clear() {
    for (const sq of squads.values()) for (const e of sq.men.values()) horde.release(e.parts);
    squads.clear();
    horde.clear();
    lines.visible = false; rings.count = 0; marks.count = 0; edges.count = 0;
  }
  return { sync, fire, position, show, clear, horde, marks };
}

function hashId(id) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 100000;
}
