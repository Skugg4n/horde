// Strategiskt djup, skiva 1 (0.18.0): skadeklasser, de två nya fienderna, sanity, vik och flykt, överrända pjäser,
// trupper i hus, korseld, håll eld, mål-läget och tröttheten. Provbanor med en gata (rad 0) och ett hus.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gridFromAscii } from '../src/sim/grid.js';
import { buildPlace, KIND } from '../src/sim/placement.js';
import { zombiePos, createSim, startWave, step, build, checkSpot, gunStats, fallBack, recrew, holdFire, setTarget, crossfirePreview, canDeploy, dayReport, RALLY_TIME, RECREW, HOLD, DEPTH_FLAGS, allowed, moveGun, checkMove, housesFor } from '../src/sim/sim.js';
import { SANITY, FATIGUE, resilience } from '../src/sim/sanity.js';
import { ZOMBIES, takeOf } from '../src/data/zombies.js';
import { WEAPONS } from '../src/data/weapons.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { newCampaign, finishDay, opStartConfig, unitsIn } from '../src/meta/operation.js';
import { featuresFor } from '../src/meta/unlocks.js';

// Gatan är rad 0 (a i öster, basen B i väster). H = hus (ett hus i lots), . = gräs.
function testMap(rows, waves, { house = null } = {}) {
  const grid = gridFromAscii(rows.map((r, j) => (j === 0 ? r : '#'.repeat(r.length))));
  const place = buildPlace({
    w: grid.w, h: grid.h, cellSize: 2, origin: [0, 0],
    classify(x, z) { const i = Math.floor(x / 2), j = Math.floor(z / 2), ch = rows[j][i]; return j === 0 ? KIND.road : ch === 'H' ? KIND.house : ch === 'T' ? KIND.thing : KIND.open; },
  });
  const lots = house ? { plots: [{ id: 'h1', house }], edges: [], blocks: [] } : null;
  return { id: 'depth-prov', grid, place, baseHp: 99, lots, unlocks: ['m2', 'inf', 'ksp58', 'psg90', 'ak5', 'epa'], days: [{ n: 1, startCash: 0, waves }] };
}
const ROAD = 'B.......................................a';
const wave = (type, count = 1, interval = 1) => [{ groups: [{ type, count, interval, delay: 0 }] }];
const run = (sim, secs, dt = 1 / 30) => { const ev = []; for (let t = 0; t < secs && sim.phase !== 'won' && sim.phase !== 'lost'; t += dt) { step(sim, dt); ev.push(...sim.events); } return ev; };
const key = (map, i, j) => j * map.grid.w + i;

test('skadeklasserna: den pansrade tar 20 % av småkaliber, fullt av 12,7 mm och granater', () => {
  assert.equal(takeOf('armored', 'small'), 0.2);
  assert.equal(takeOf('armored', 'heavy'), 1);
  assert.equal(takeOf('armored', 'explosive'), 1);
  assert.equal(takeOf('walker', 'small'), 1);
  assert.equal(WEAPONS.m2.dmg, 'heavy');
  for (const t of ['m249', 'ksp58', 'psg90', 'hv', 'inf', 'civ']) assert.equal(WEAPONS[t].dmg, 'small', t);
  // samma pjäs, samma våg: Ksp 90 biter knappt på pansrade, Ksp 88 tar dem
  const rows = [ROAD, '.'.repeat(ROAD.length), '.'.repeat(ROAD.length)];
  const kills = type => {
    const map = testMap(rows, wave('armored', 4, 2));
    const sim = createSim({ map, day: 1, cash: 9999, seed: 3 });
    assert.ok(build(sim, key(map, 12, 1), type).ok);
    startWave(sim);
    run(sim, 150);
    return { kills: sim.kills, base: sim.baseHp };
  };
  const small = kills('m249'), heavy = kills('m2');
  assert.ok(heavy.kills > small.kills, `Ksp 88 ${heavy.kills} mot Ksp 90 ${small.kills}`);
  assert.ok(small.base < 99, 'pansrade går förbi Ksp 90');
});

test('kryparen går under taggtråden utan att bromsas och utan att slita den', () => {
  const rows = [ROAD, '.'.repeat(ROAD.length)];
  const time = (type) => {
    const map = testMap(rows, wave(type));
    const sim = createSim({ map, day: 1, cash: 9999, seed: 1 });
    sim.obstacles[key(map, 20, 0)] = { type: 'wire', durability: 50, maxDurability: 50 };
    sim.route.rebuild(sim.obstacles);
    startWave(sim);
    const ev = run(sim, 120);
    return { t: sim.time, wire: sim.obstacles[key(map, 20, 0)]?.durability, breach: ev.some(e => e.t === 'breach') };
  };
  const c = time('crawler');
  assert.ok(c.breach);
  assert.equal(c.wire, 50, 'tråden orörd');
  assert.ok(ZOMBIES.crawler.speed < ZOMBIES.walker.speed);
  assert.ok(ZOMBIES.crawler.perchHit < 1);
  assert.ok(OBSTACLES.wire.slow < 1);
});

test('djupet är av utan allow (mekanikproven räknar som förut), och depth slår på det', () => {
  const map = testMap([ROAD, '.'.repeat(ROAD.length)], wave('walker'));
  const off = createSim({ map, day: 1, cash: 0 }), on = createSim({ map, day: 1, cash: 0, depth: true });
  for (const f of DEPTH_FLAGS) { assert.equal(allowed(off, f), false, f); assert.equal(allowed(on, f), true, f); }
  // 0.18.0: varje mekanik kommer på en dag i kampanjen (src/meta/unlocks.js); E4 och Ishallen dag 1 har inget av det
  for (const f of DEPTH_FLAGS) assert.equal(featuresFor('riksvagen', 3).has(f), false, f);
  assert.equal(featuresFor('gnesta', 1).has('crossfire'), false);
  for (const f of DEPTH_FLAGS) assert.equal(featuresFor('molnbo', 5).has(f), true, f);
});

test('sanity: tär nära horden, civila fortare än infanteriet, återhämtas i lugn, sänker träffen', () => {
  const rows = [ROAD, '.'.repeat(ROAD.length), '.'.repeat(ROAD.length), '.'.repeat(ROAD.length)];
  const after = type => {
    const map = testMap(rows, wave('walker', 12, 0.4));
    const sim = createSim({ map, day: 1, cash: 9999, seed: 2, allow: ['sanity'] });
    sim.maxSquads = 9;
    assert.ok(build(sim, key(map, 30, 2), type).ok);
    const g = sim.guns[0];
    startWave(sim);
    let low = 100;
    for (let t = 0; t < 40; t += 1 / 30) { step(sim, 1 / 30); low = Math.min(low, g.sanity); }
    return { low, g, sim };
  };
  const civ = after('civ'), inf = after('inf');
  assert.ok(civ.low < 100 && inf.low < 100);
  assert.ok(civ.low < inf.low, `civila ${civ.low.toFixed(1)}, infanteriet ${inf.low.toFixed(1)}`);
  assert.ok(resilience({ type: 'civ' }) < resilience({ type: 'hv' }) && resilience({ type: 'hv' }) < resilience({ type: 'inf' }));
  assert.ok(resilience({ type: 'hv', vet: 1 }) > resilience({ type: 'hv' }), 'stjärnan ger motstånd');
  assert.ok(resilience({ type: 'hv', fatigue: 2 }) < resilience({ type: 'hv' }), 'trött ger mindre');
  const g = civ.g, sim = civ.sim;
  const full = gunStats(sim, { ...g, sanity: 100 }).accuracy;
  assert.ok(gunStats(sim, { ...g, sanity: 10 }).accuracy < full);
  // lugnt: återhämtar sig
  sim.zombies.length = 0; sim.spawnQueue.length = 0;
  sim.phase = 'build'; sim.nextWaveIn = 100;
  g.sanity = 30;
  for (let t = 0; t < 5; t += 1 / 30) step(sim, 1 / 30);
  assert.ok(g.sanity > 30 + SANITY.recover * 4, `${g.sanity}`);
});

// En kärntrupp på en provbana (core) med rout upplåst
function coreSim(rows, waves, units, allow, house = null) {
  const map = testMap(rows, waves, { house });
  return { map, sim: createSim({ map, day: 1, cash: 500, seed: 4, core: units, allow: ['move', ...allow] }) };
}

test('routed: en grupp under gränsen flyr mot basen, samlas i reserven och går att ställa ut igen', () => {
  const rows = [ROAD, '.'.repeat(ROAD.length), '.'.repeat(ROAD.length), '.'.repeat(ROAD.length)];
  // 0.19.1: sex bjässar (var tre): med högst fem kvar skyndar vågens svans förbi gruppen innan den hinner brytas
  const { map, sim } = coreSim(rows, wave('brute', 6, 1), [{ uid: 1, type: 'civ', level: 1, men: 4 }], ['sanity', 'rout']);
  assert.ok(build(sim, key(map, 30, 2), 'civ').ok);
  const g = sim.guns[0];
  startWave(sim);
  const ev = run(sim, 60);
  const routed = ev.find(e => e.t === 'routed');
  assert.ok(routed, 'gruppen bröts');
  const back = ev.find(e => e.t === 'unitBack');
  assert.ok(back && back.kind === 'rout', 'och kom tillbaka till reserven');
  const u = sim.reserve.find(x => x.uid === 1);
  assert.ok(u?.rallied);
  assert.equal(u.sanity, SANITY.rallied);
  assert.ok(!sim.guns.includes(g));
  // dagens rapport räknar dem som levande
  const rep = dayReport(sim);
  assert.equal(rep.units[0].destroyed, undefined);
  // efter RALLY_TIME går den att ställa ut mitt i dagen
  if (sim.phase === 'wave' || sim.phase === 'build') {
    sim.time = u.readyAt - 1; assert.equal(canDeploy(sim, u), false);
    sim.time = u.readyAt; assert.equal(canDeploy(sim, u), true);
  }
  assert.ok(RALLY_TIME > 0);
});

test('Fall back: gruppen viker i ordning och behåller sin sanity', () => {
  const rows = [ROAD, '.'.repeat(ROAD.length), '.'.repeat(ROAD.length), '.'.repeat(ROAD.length)];
  const { map, sim } = coreSim(rows, wave('walker', 1, 1), [{ uid: 7, type: 'hv', level: 1, men: 4 }], ['sanity', 'rout']);
  assert.ok(build(sim, key(map, 25, 3), 'hv').ok);
  const g = sim.guns[0];
  startWave(sim);
  g.sanity = 70;
  assert.ok(fallBack(sim, g.id).ok);
  const ev = run(sim, 20);
  assert.ok(ev.some(e => e.t === 'unitBack' && e.kind === 'fallback'));
  const u = sim.reserve.find(x => x.uid === 7);
  assert.ok(u.sanity >= 70 - 1e-9 && u.readyAt <= sim.time);
});

test('överrända pjäser: laget slås ner, pjäsen tystnar och står kvar; Recrew kostar och bemannar', () => {
  const rows = [ROAD, '.'.repeat(ROAD.length), '.'.repeat(ROAD.length)];
  const map = testMap(rows, wave('brute', 1, 1));
  const sim = createSim({ map, day: 1, cash: 500, seed: 5, allow: ['overrun'] });
  // pjäsen vänd bort från gatan: den skjuter inte, bjässen går fram och slår laget
  assert.ok(build(sim, key(map, 20, 1), 'm249', { facing: Math.PI / 2 }).ok);
  const g = sim.guns[0];
  startWave(sim);
  const ev = run(sim, 90);
  assert.ok(ev.some(e => e.t === 'gunSilent' && e.why === 'overrun'), 'tystnade');
  assert.ok(sim.guns.includes(g), 'står kvar');
  assert.equal(g.silent, 'overrun');
  const cash = sim.cash;
  if (sim.phase !== 'wave' && sim.phase !== 'build') return;
  sim.zombies.forEach(z => { z.dead = true; });
  assert.ok(recrew(sim, g.id).ok);
  assert.equal(sim.cash, cash - RECREW.cost);
  run(sim, RECREW.time + 0.5);
  assert.equal(g.silent, null);
});

const HOUSE_ROWS = [
  'B.......................................a',
  '..........HHH...........................',
  '..........HHH...........................',
  '........................................',
  '........................................',
];
const HOUSE = { x: 23, z: 4, ry: 0, w: 6, d: 4 };

test('trupper i hus: gruppen tar fönstren, skjuter därifrån; dörren stormas och slås in', () => {
  const map = testMap(HOUSE_ROWS.map(r => r.padEnd(41, '.').slice(0, 41)), wave('brute', 2, 2), { house: HOUSE });
  const sim = createSim({ map, day: 1, cash: 500, seed: 6, allow: ['garrison', 'sanity'] });
  sim.maxSquads = 4;
  const k = key(map, 11, 1);
  const ok = checkSpot(sim, k, 'hv');
  assert.ok(ok.ok && ok.house === 'h1', JSON.stringify(ok));
  assert.equal(checkSpot(sim, k, 'm2').ok, false, 'Ksp 88 får inte gå in');
  assert.ok(build(sim, k, 'hv').ok);
  const g = sim.guns[0];
  assert.equal(g.house.id, 'h1');
  assert.ok(g.soldiers.every(s => s.cover === 'window'));
  assert.equal(checkSpot(sim, k, 'm249').reason, 'hus upptaget');
  startWave(sim);
  const ev = run(sim, 120);
  assert.ok(ev.some(e => e.t === 'shot' && e.gunId === g.id), 'skjuter från fönstren');
  assert.ok(ev.some(e => e.t === 'houseHit'), 'stormar dörren');
});

// 0.18.1 (H426, Olas speltest): mitt i en våg springer gruppen till husets dörr, går in och skjuter från fönstren.
test('trupper i hus mitt i en våg: gruppen springer till dörren, går in och skjuter från fönstren', () => {
  const map = testMap(HOUSE_ROWS.map(r => r.padEnd(41, '.').slice(0, 41)), wave('walker', 6, 3), { house: HOUSE });
  const sim = createSim({ map, day: 1, cash: 500, seed: 6, allow: ['garrison', 'sanity', 'move'] });
  sim.maxSquads = 4;
  assert.ok(build(sim, key(map, 4, 3), 'hv').ok);
  const g = sim.guns[0];
  run(sim, 3);
  startWave(sim);
  run(sim, 2);
  assert.equal(sim.phase, 'wave');
  const k = key(map, 11, 1);
  assert.ok(checkMove(sim, g.id, k).ok, JSON.stringify(checkMove(sim, g.id, k)));
  const r = moveGun(sim, g.id, k);
  assert.ok(r.ok && r.entering === 'h1', JSON.stringify(r));
  assert.ok(!g.house, 'inte inne än: de springer');
  assert.ok(g.soldiers.some(s => s.path), 'på väg längs en väg');
  const ev = run(sim, 60);
  assert.equal(g.house?.id, 'h1', 'inne i huset');
  assert.ok(ev.some(e => e.t === 'enteredHouse' && e.gunId === g.id));
  assert.ok(g.soldiers.every(s => s.down || s.cover === 'window'));
  const at = ev.findIndex(e => e.t === 'enteredHouse');
  assert.ok(ev.slice(at).some(e => e.t === 'shot' && e.gunId === g.id), 'skjuter från fönstren');
});

// 0.19.0 (speltestet av 0.18.1: "No way there on foot" utan skäl): flytten in i ett hus säger varför den inte går, redan
// när platsen provas (checkMove), och samma skäl som flytten själv
test('in i ett hus mitt i en våg: skälet när det inte går (ingen väg till dörren, de döda vid dörren)', () => {
  const rows = [...HOUSE_ROWS, '', '', '', '', ''].map(r => r.padEnd(41, '.').slice(0, 41));
  // gruppen står i en inhägnad ficka (T = föremål runt om)
  const put = (j, t) => { rows[j] = rows[j].slice(0, 2) + t + rows[j].slice(2 + t.length); };
  put(4, 'TTTTTTT'); put(5, 'T.....T'); put(6, 'T.....T'); put(7, 'T.....T'); put(8, 'TTTTTTT');
  const map = testMap(rows, wave('walker', 6, 3), { house: HOUSE });
  const sim = createSim({ map, day: 1, cash: 500, seed: 6, allow: ['garrison', 'sanity', 'move'] });
  sim.maxSquads = 4;
  assert.ok(build(sim, key(map, 5, 6), 'hv').ok, JSON.stringify(build(sim, key(map, 5, 6), 'hv')));
  const g = sim.guns[0];
  run(sim, 3);
  startWave(sim);
  run(sim, 1);
  const k = key(map, 11, 1);
  assert.equal(checkMove(sim, g.id, k).reason, 'hus ingen väg');
  assert.equal(moveGun(sim, g.id, k).reason, 'hus ingen väg');
  // de döda vid dörren
  const open = createSim({ map: testMap(HOUSE_ROWS.map(r => r.padEnd(41, '.').slice(0, 41)), wave('walker', 1, 1), { house: HOUSE }), day: 1, cash: 500, seed: 6, allow: ['garrison', 'move'] });
  open.maxSquads = 4;
  assert.ok(build(open, key(open.map, 4, 3), 'hv').ok);
  run(open, 3);
  startWave(open);
  run(open, 0.5);
  const z = open.zombies[0];
  const door = [...housesFor(open).find(h => h.id === 'h1').touch][0], c = open.place.center(door);
  open.route.advance(z, 0);
  Object.assign(z, open.route.spawnAt(open.rng, open.route.nearestCell(c.x, c.z), z.id));
  assert.equal(checkMove(open, open.guns[0].id, key(open.map, 11, 1)).reason, 'hus anfall');
});

test('korseld: två bågar som skiljer minst 60 grader ger mer skada, och förhandsvisningen visar zonen', () => {
  const rows = [ROAD, '.'.repeat(ROAD.length), '.'.repeat(ROAD.length), '.'.repeat(ROAD.length)];
  const map = testMap(rows, wave('walker', 1, 1));
  const sim = createSim({ map, day: 1, cash: 9999, seed: 1, allow: ['crossfire'] });
  assert.ok(build(sim, key(map, 14, 3), 'm249').ok);
  const pv = crossfirePreview(sim, key(map, 26, 3), 'm249');
  assert.ok(pv.length > 0, 'zonen mellan dem');
  assert.ok(build(sim, key(map, 26, 3), 'm249').ok);
  startWave(sim);
  const ev = run(sim, 40);
  assert.ok(sim.xf !== undefined);
  assert.ok(ev.some(e => e.t === 'kill'));
  // utan korselden: samma bana, ingen zon
  const off = createSim({ map, day: 1, cash: 9999, seed: 1 });
  assert.ok(build(off, key(map, 14, 3), 'm249').ok);
  assert.deepEqual(crossfirePreview(off, key(map, 26, 3), 'm249'), []);
});

test('håll eld: ingen eld förrän horden är nära eller ordern släpps, sedan bakhåll och nedkylning', () => {
  const rows = [ROAD, '.'.repeat(ROAD.length), '.'.repeat(ROAD.length)];
  const map = testMap(rows, wave('walker', 1, 1));
  const sim = createSim({ map, day: 1, cash: 9999, seed: 1, allow: ['holdFire'] });
  assert.ok(build(sim, key(map, 10, 2), 'm249').ok);
  const g = sim.guns[0];
  assert.ok(holdFire(sim, g.id, true).ok);
  startWave(sim);
  const ev = [];
  let firstShot = null, released = null;
  let again = null;
  for (let t = 0; t < 60 && sim.phase === 'wave'; t += 1 / 30) {
    step(sim, 1 / 30);
    for (const e of sim.events) { ev.push(e); if (e.t === 'shot' && firstShot == null) firstShot = sim.time; if (e.t === 'ambush') { released = { t: sim.time, why: e.why }; again = holdFire(sim, g.id, true); } }
  }
  assert.ok(released && released.why === 'close', 'släpps när de är nära');
  assert.ok(firstShot >= released.t - 1e-9, 'inget skott före');
  assert.ok(g.holdCd > released.t);
  assert.equal(again.reason, 'nedkylning', 'nedkylning efter bakhållet');
  assert.equal(HOLD.mul, 2);
});

test('mål-läget: Strongest tar bjässen först, First in line den som kommit längst', () => {
  const R = 'B..............a', rows = [R, '.'.repeat(R.length), '.'.repeat(R.length)];
  const waves = [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0 }, { type: 'brute', count: 1, interval: 1, delay: 0.6 }] }];
  const first = mode => {
    const map = testMap(rows, waves);
    const sim = createSim({ map, day: 1, cash: 9999, seed: 1, allow: ['target', 'aim'] });
    assert.ok(build(sim, key(map, 8, 2), 'm2', { facing: Math.atan2(-4, 10) }).ok);
    const g = sim.guns[0];
    assert.ok(setTarget(sim, g.id, mode).ok);
    startWave(sim);
    for (let t = 0; t < 30; t += 1 / 30) {
      step(sim, 1 / 30);
      const s = sim.events.find(e => e.t === 'shot');
      if (s && sim.zombies.filter(z => !z.dead).length >= 2) return sim.zombies.find(z => z.id === s.targetId).type;
    }
    return null;
  };
  assert.equal(first('strongest'), 'brute');
  assert.equal(first('first'), 'walker');
});

test('tröttheten: en dag ute gör trött, en dag i reserven vilar, ett förlorat försök räknas inte', () => {
  let p = newCampaign();
  const units = unitsIn(p, 'riksvagen');
  assert.ok(units.length >= 2);
  const out = units[0], rest = { ...units[1] };
  const report = { units: [{ uid: out.uid }], lostMen: 0, lostUnits: 0 };
  // E4 har ingen trötthet (den kommer före Mölnbo, 0.22.0; förut efter Vikingavägen dag 3)
  const q = finishDay(p, { mapId: 'riksvagen', day: 1, won: true, intelEarned: 10, report }).progress;
  assert.equal(unitsIn(q, 'riksvagen').find(u => u.uid === out.uid).fatigue ?? 0, 0);
  // med tröttheten: den som var ute blir Tired, två dagar Exhausted; vila tar ett steg; förlust ändrar inget
  const op = { ...p, op: { ...p.op, units: p.op.units.map(u => ({ ...u, sector: 'molnbo' })) } };
  const fin = (pp, won) => finishDay(pp, { mapId: 'molnbo', day: 1, won, intelEarned: 10, report: { units: [{ uid: out.uid }], lostMen: 0, lostUnits: 0 } }).progress;
  let r = fin(op, true);
  const f = id => r.op.units.find(u => u.uid === id).fatigue ?? 0;
  assert.equal(f(out.uid), 1);
  r = fin(r, false);
  assert.equal(f(out.uid), 1, 'förlorat försök');
  r = fin(r, true);
  assert.equal(f(out.uid), 2);
  assert.equal(f(rest.uid), 0);
  r = finishDay(r, { mapId: 'molnbo', day: 1, won: true, intelEarned: 10, report: { units: [{ uid: rest.uid }], lostMen: 0, lostUnits: 0 } }).progress;
  assert.equal(f(out.uid), 1, 'vilade en dag');
  assert.deepEqual(FATIGUE.names, ['Rested', 'Tired', 'Exhausted']);
  void opStartConfig;
});

// 0.18.0 (uppdraget): en spelare som struntar i skadeklasserna förlorar mot pansrade vågor. Samma våg (14 pansrade och
// 20 vandrare), samma bana. Den som köper mest eld per krona (fem Ksp 90, 1 250) släpper igenom dem; den som tar en
// Ksp 88 på Strongest och två Ksp 90 (1 100) håller.
test('balans: den som struntar i skadeklasserna förlorar mot pansrade vågor', () => {
  const rows = [ROAD, '.'.repeat(ROAD.length), '.'.repeat(ROAD.length), '.'.repeat(ROAD.length)];
  const waves = [{ groups: [{ type: 'armored', count: 14, interval: 1.2, delay: 0 }, { type: 'walker', count: 20, interval: 0.6, delay: 0 }] }];
  const play = loadout => {
    const map = { ...testMap(rows, waves), baseHp: 8 };
    const sim = createSim({ map, day: 1, cash: 99999, seed: 3, allow: ['target', 'aim'] });
    sim.maxGuns = 9;
    let cost = 0;
    for (const [t, i, j] of loadout) { const r = build(sim, key(map, i, j), t); assert.ok(r.ok, t); cost += WEAPONS[t].cost; if (t === 'm2') setTarget(sim, r.id, 'strongest'); }
    startWave(sim);
    for (let k = 0; k < 30 * 400 && sim.phase === 'wave'; k++) step(sim, 1 / 30);
    return { phase: sim.phase, base: sim.baseHp, cost };
  };
  const blind = play([['m249', 8, 2], ['m249', 14, 2], ['m249', 20, 2], ['m249', 26, 2], ['m249', 32, 2]]);
  const aware = play([['m2', 8, 3], ['m249', 16, 2], ['m249', 24, 2]]);
  assert.ok(blind.cost > aware.cost, 'den blinda betalar mer');
  assert.equal(blind.phase, 'lost', JSON.stringify(blind));
  assert.equal(aware.phase, 'won', JSON.stringify(aware));
});
