import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build, upgrade, buyKit, moveGun, checkMove, movePhase, sell, soldierAt, gunPos, canMoveType } from '../src/sim/sim.js';
import { crewRoute, findPath, crewPassable, alongPath } from '../src/sim/crew-path.js';
import { WEAPONS } from '../src/data/weapons.js';
import { KIND } from '../src/sim/placement.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaPlan, daySpawns } from '../scripts/balance.mjs';

// Flytta (0.12.0, H102) längs riktiga vägar (0.13.0, H134 och H136).
const plan = gnestaPlan(gnesta, daySpawns(gnesta, 1));
// banans förråd per dag (0.13.0) gäller inte här: provet vill ha alla pjäser
const free = { ...gnesta, arsenal: null, days: gnesta.days.map(d => ({ ...d, arsenal: null, evac: null })) };
const fresh = (cash = 5000) => createSim({ map: free, day: 2, cash, research: ['grenade.1', 'm2.1', 'ksp58.1', 'psg90.1'], seed: 3 });
const DT = 1 / 30;
function runFor(sim, secs, onStep = () => {}) { for (let t = 0; t < Math.round(secs / DT); t++) { step(sim, DT); onStep(sim.events); } }
// Varje punkt längs vägen (var 0,25 m) ligger på en ruta en besättning får gå på.
function walkable(sim, path) {
  for (let d = 0; d <= path.len; d += 0.25) { const p = alongPath(path, d); if (!crewPassable(sim.place, sim.place.keyAt(p.x, p.z))) return false; }
  return true;
}

test('vägen går bara över gator och mark, aldrig genom ett hus, och hittar runt kvarteret', () => {
  const sim = fresh(), p = sim.place;
  const a = plan.guns[0], b = plan.guns[3];
  const keys = findPath(p, a, b);
  assert.ok(keys && keys[0] === a && keys[keys.length - 1] === b);
  for (const k of keys) assert.ok(p.kind[k] === KIND.open || p.kind[k] === KIND.road, `ruta ${k} är ${p.kind[k]}`);
  const r = crewRoute(p, p.center(a), b);
  assert.ok(r.len >= Math.hypot(p.center(a).x - p.center(b).x, p.center(a).z - p.center(b).z) - 1e-6);
  assert.ok(walkable(sim, r), 'uträtad väg utan genvägar genom hus');
  assert.deepEqual(crewRoute(p, p.center(a), b), r, 'deterministisk');
});

test('waypoints tas i ordning', () => {
  const sim = fresh(), p = sim.place;
  const a = plan.guns[0], wp = plan.guns[4], b = plan.guns[1];
  const direct = crewRoute(p, p.center(a), b), via = crewRoute(p, p.center(a), b, [wp]);
  assert.ok(via.len > direct.len, 'omvägen över waypointen är längre');
  // vägen passerar waypointens ruta innan den når målet
  const w = p.center(wp);
  let at = -1;
  for (let d = 0; d <= via.len; d += 0.25) { const q = alongPath(via, d); if (Math.hypot(q.x - w.x, q.z - w.z) < 1.5) { at = d; break; } }
  assert.ok(at > 0 && at < via.len, `waypointen nås på vägen (${at})`);
  const back = crewRoute(p, p.center(a), b, [b, wp]);
  assert.ok(back.len > via.len, 'annan ordning, annan väg');
});

test('Ksp 90-laget packar, springer längs vägen och ställs upp, och skjuter inte under tiden', () => {
  const sim = fresh();
  const id = build(sim, plan.guns[0], 'm249').id;
  startWave(sim);
  runFor(sim, 20);
  const g = sim.guns.find(x => x.id === id);
  assert.equal(moveGun(sim, id, plan.guns[2]).ok, true);
  const m = g.move, mi = WEAPONS.m249.move;
  assert.equal(m.pack, mi.pack); assert.equal(m.setup, mi.setup);
  assert.ok(Math.abs(m.travel - m.path.len / mi.speed) < 1e-9);
  assert.ok(walkable(sim, m.path));
  const phases = new Set(), shots = [];
  let done = null, t = 0, mid = null;
  runFor(sim, m.total + 1, evs => {
    t += DT;
    if (g.move) { phases.add(movePhase(g)); if (movePhase(g) === 'carry' && !mid) mid = gunPos(g); }
    for (const e of evs) {
      if (e.t === 'shot' && e.gunId === id && g.move) shots.push(e);
      if (e.t === 'moveDone' && e.gunId === id) done = t;
    }
  });
  assert.deepEqual([...phases], ['pack', 'carry', 'setup']);
  assert.equal(shots.length, 0, 'inga skott medan den flyttas');
  assert.ok(crewPassable(sim.place, sim.place.keyAt(mid.x, mid.z)), 'laget springer på marken');
  assert.ok(Math.abs(done - m.total) < 0.05, `klar efter ${done}, väntat ${m.total}`);
  assert.equal(g.cell, plan.guns[2]);
});

test('Ksp 88 är monterad och går inte att flytta, bara sälja', () => {
  const sim = fresh();
  const id = build(sim, plan.guns[0], 'm2').id;
  assert.equal(canMoveType('m2'), false);
  assert.equal(checkMove(sim, id, plan.guns[1]).reason, 'fast');
  assert.equal(moveGun(sim, id, plan.guns[1]).ok, false);
  assert.equal(sell(sim, id).ok, true);
});

test('uppgraderingar och granatlådan följer med; sälj ger fortfarande 60 %', () => {
  const sim = fresh();
  const id = build(sim, plan.guns[0], 'm249').id;
  assert.equal(upgrade(sim, id).ok, true);
  assert.equal(buyKit(sim, id).ok, true);
  startWave(sim);
  runFor(sim, 2);
  assert.equal(moveGun(sim, id, plan.guns[2]).ok, true);
  runFor(sim, sim.guns.find(x => x.id === id).move.total + 0.5);
  const g = sim.guns.find(x => x.id === id);
  assert.equal(g.move, undefined);
  assert.equal(g.weapon.level, 2);
  assert.equal(g.weapon.kit, true);
  const spent = g.weapon.spent, cash = sim.cash;
  assert.equal(sell(sim, id).refund, Math.round(spent * 0.6));
  assert.equal(sim.cash, cash + Math.round(spent * 0.6));
});

test('flytten följer placeringens regler, och före första vågen står pjäsen klar direkt', () => {
  const sim = fresh();
  const a = build(sim, plan.guns[0], 'm249').id;
  build(sim, plan.guns[1], 'm249');
  assert.equal(checkMove(sim, a, plan.guns[1]).reason, 'nära');
  const road = sim.route.cellAt(-3, 35);
  assert.equal(checkMove(sim, a, sim.place.keyAt(sim.route.cellCenter(road).x, sim.route.cellCenter(road).z)).ok, false);
  assert.equal(moveGun(sim, a, plan.guns[2]).ok, true);
  assert.equal(sim.guns.find(g => g.id === a).move, undefined, 'ingen tid går före vågen');
});

test('ett lag på väg kan slås ner av zombier; då är pjäsen förlorad', () => {
  const sim = fresh();
  const id = build(sim, plan.guns[0], 'm249').id;
  startWave(sim);
  runFor(sim, 1);
  assert.equal(moveGun(sim, id, plan.guns[2]).ok, true);
  const g = sim.guns.find(x => x.id === id);
  runFor(sim, g.move.pack + 1);
  // en zombie ställs mitt på lagets väg: den slår laget tills det faller
  const at = gunPos(g), z = sim.zombies.find(q => !q.dead);
  assert.ok(z, 'någon zombie finns');
  let lost = false;
  for (let i = 0; i < 30 * 30 && !lost; i++) {
    const p = gunPos(g); Object.assign(z, { x: p.x + 0.4, z: p.z, type: 'brute', hp: 1e9 });
    step(sim, DT);
    lost = sim.events.some(e => e.t === 'crewLost' && e.gunId === id) || !sim.guns.includes(g);
  }
  assert.ok(at && lost, 'laget föll och pjäsen är borta');
});

test('Hemvärnet springer sin väg till den nya platsen, skjuter inte på vägen och är framme till slut', () => {
  const sim = fresh();
  const id = build(sim, plan.squads[0], 'hv').id;
  startWave(sim);
  runFor(sim, 3);
  const g = sim.guns.find(x => x.id === id);
  const target = plan.squads.find(k => k !== plan.squads[0] && checkMove(sim, id, k).ok);
  assert.equal(moveGun(sim, id, target).ok, true);
  assert.ok(g.soldiers.every(s => s.path && s.run > 0 && s.from));
  for (const s of g.soldiers) assert.ok(walkable(sim, s.path), 'varje soldat går på marken');
  let shots = 0;
  runFor(sim, 1, evs => { for (const e of evs) if (e.t === 'shot' && e.gunId === id) shots++; });
  assert.equal(shots, 0);
  const mid = soldierAt(g.soldiers[0]);
  assert.ok(Math.hypot(mid.x - g.soldiers[0].x, mid.z - g.soldiers[0].z) > 0.1, 'på väg, inte framme');
  runFor(sim, Math.max(...g.soldiers.map(s => s.run)) + 0.5);
  assert.ok(g.soldiers.every(s => s.down || (s.run === 0 && !s.path && !s.from)));
});

test('psg 90 smyger och pillboxen kryper: farterna följer klassen', () => {
  const sp = t => WEAPONS[t].move?.speed ?? WEAPONS[t].speed;
  assert.ok(sp('inf') > sp('m249') && sp('m249') > sp('ksp58') && sp('ksp58') > sp('psg90'));
  assert.ok(Math.abs(sp('epa') - sp('inf') / 4) < 1e-9, 'pillboxen kryper i en fjärdedel av infanteriets fart');
  assert.equal(WEAPONS.m249.move.crew, 2, 'skytt och ammunitionsbärare');
  assert.equal(WEAPONS.ksp58.move.crew, 3, 'tre man');
  assert.equal(WEAPONS.psg90.move.crew, 2, 'skytt och observatör');
});
