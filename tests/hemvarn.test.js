import test from 'node:test';
import assert from 'node:assert/strict';
import { gridFromAscii } from '../src/sim/grid.js';
import { buildPlace, placementFor, sightFrom, KIND } from '../src/sim/placement.js';
import { createSim, startWave, step, build, checkSpot, upgrade, sell, reinforce, reinforceCost, buyKit, squadPreview } from '../src/sim/sim.js';
import { SQUAD, COVER, planSquad, coverOf, squadSize } from '../src/sim/squad.js';
import { buyState } from '../src/sim/buy.js';
import { WEAPONS } from '../src/data/weapons.js';
import { MAPS } from '../src/data/maps.js';
import { gnesta } from '../src/data/gnesta.js';
import { newProgress, startConfig } from '../src/meta/progress.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';

// Provbana: gatan är rad 0 (från a i öster till basen B i väster). H = hus, C = bil, . = gräs.
function testMap(rows, waves = [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0 }] }]) {
  const grid = gridFromAscii(rows.map((r, j) => (j === 0 ? r : '#'.repeat(r.length))));
  const place = buildPlace({
    w: grid.w, h: grid.h, cellSize: 2, origin: [0, 0],
    classify(x, z) {
      const i = Math.floor(x / 2), j = Math.floor(z / 2), ch = rows[j][i];
      return j === 0 ? KIND.road : ch === 'H' ? KIND.house : ch === 'C' ? KIND.thing : KIND.open;
    },
  });
  return { id: 'hv-prov', grid, place, baseHp: 99, days: [{ n: 1, startCash: 0, waves }] };
}
const keyOf = (map, i, j) => j * map.grid.w + i;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const summary = g => g.soldiers.map(s => [s.cell, s.cover, s.stance, s.hp, Math.round(s.face * 1000)]);

// Ett hus mitt på gräset, långt från gatan: hörnen och väggarna ger skydd, resten är öppet.
const HOUSE = [
  'B.................a',
  '...................',
  '...................',
  '.......HHH.........',
  '.......HHH.........',
  '...................',
  '...................',
];

test('skyddet: hörn, vägg, bil och öppet gräs känns igen', () => {
  const map = testMap(['B.........a', '...........', '...HH......', '...HH...C..', '...........']), p = placementFor(map);
  assert.equal(coverOf(p, keyOf(map, 2, 1)), 'corner', 'snett utanför husets hörn');
  assert.equal(coverOf(p, keyOf(map, 5, 2)), 'corner', 'vid gaveln där väggen tar slut');
  assert.equal(coverOf(p, keyOf(map, 7, 3)), 'car', 'bredvid bilen');
  assert.equal(coverOf(p, keyOf(map, 9, 1)), 'open');
  for (const [id, c] of Object.entries(COVER)) assert.ok(['crouch', 'kneel', 'prone'].includes(c.stance), id);
  assert.equal(COVER.corner.stance, 'crouch');
  assert.equal(COVER.car.stance, 'crouch');
  assert.equal(COVER.hedge.stance, 'kneel');
  assert.equal(COVER.ditch.stance, 'prone');
  assert.equal(COVER.open.stance, 'prone');
});

test('valet är deterministiskt: samma bana och ruta ger samma grupp', () => {
  for (const map of [MAPS.riksvagen, gnesta]) {
    const a = createSim({ map, day: 1, cash: 9999, seed: 1 }), b = createSim({ map, day: 1, cash: 9999, seed: 7 });
    a.maxSquads = b.maxSquads = 99;   // 0.12.1: eget tak för grupperna; provet vill se många
    const p = a.place;
    let n = 0;
    for (let k = 0; k < p.n && n < 6; k += 53) {
      if (p.kind[k] !== KIND.open || !checkSpot(a, k, 'hv').ok) continue;
      const ra = build(a, k, 'hv'), rb = build(b, k, 'hv');
      assert.ok(ra.ok && rb.ok);
      assert.deepEqual(summary(a.guns.at(-1)), summary(b.guns.at(-1)), `${map.id} ruta ${k}`);
      n++;
    }
    assert.ok(n >= 4, `${map.id}: fick ${n} grupper`);
    // och planen räknad om från början ger samma rutor i samma ordning
    const fresh = createSim({ map, day: 1, cash: 9999, seed: 1 });
    const k0 = a.guns[0].cell;
    assert.deepEqual(planSquad(fresh, k0).map(c => c.cell), planSquad(fresh, k0).map(c => c.cell));
  }
});

test('gruppen sprider ut sig: minst 3 m mellan soldaterna, även mellan grupper och från pjäser', () => {
  for (const map of [MAPS.riksvagen, gnesta]) {
    const sim = createSim({ map, day: 1, cash: 1e6, seed: 1 });
    sim.maxGuns = 99; sim.maxSquads = 99;
    const p = sim.place;
    for (let k = 0; k < p.n; k += 11) if (p.kind[k] === KIND.open) build(sim, k, sim.guns.length % 3 ? 'hv' : 'm249');
    const all = sim.guns.filter(g => g.squad).flatMap(g => g.soldiers);
    assert.ok(all.length >= 20, `${map.id}: ${all.length} soldater`);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++)
      assert.ok(dist(all[i], all[j]) >= SQUAD.spacing - 1e-9, `${map.id}: ${dist(all[i], all[j])} m`);
    for (const g of sim.guns.filter(x => !x.squad)) for (const s of all) assert.ok(dist(g, s) >= SQUAD.gunGap - 1e-9);
    for (const g of sim.guns.filter(x => x.squad)) {
      assert.equal(g.soldiers.length, squadSize(1));
      for (const s of g.soldiers) {
        assert.ok(dist(g, s) <= SQUAD.radius + 1e-9, 'inom markeringen');
        assert.equal(p.kind[s.cell], KIND.open);
        assert.equal(p.walk[s.cell], 0);
        assert.equal(s.stance, COVER[s.cover].stance);
      }
    }
  }
});

test('skydd före öppet gräs när båda ser gatan', () => {
  const map = testMap(HOUSE), sim = createSim({ map, day: 1, cash: 9999, seed: 1 });
  const k = keyOf(map, 8, 5);
  const plan = planSquad(sim, k, { count: 4 });
  assert.equal(plan.length, 4);
  // Alla kandidater ser gatan; de två första valen är rutor med skydd vid huset.
  assert.notEqual(plan[0].cover, 'open');
  assert.notEqual(plan[1].cover, 'open');
  const covered = plan.filter(c => c.cover !== 'open');
  assert.ok(covered.length >= 2, plan.map(c => c.cover).join(','));
  // Varje vald skyddsruta har högre poäng än alla öppna rutor som ser lika mycket eller mindre.
  const all = planSquad(sim, k, { count: 99 });
  for (const c of covered) for (const o of all.filter(x => x.cover === 'open' && x.seen <= c.seen)) assert.ok(c.score > o.score);
});

test('varje soldat har sin egen sikt och skjuter bara på det han själv ser', () => {
  // Huset skymmer gatans östra del för soldater väster om det, men inte för de öster om det.
  const rows = [
    'B...................a',
    '.....................',
    '.........HHHH........',
    '.........HHHH........',
    '.....................',
    '.....................',
  ];
  const waves = [{ groups: [{ type: 'walker', count: 12, interval: 1, delay: 0 }] }];
  const map = testMap(rows, waves), sim = createSim({ map, day: 1, cash: 9999, seed: 3 });
  const r = build(sim, keyOf(map, 11, 4), 'hv');
  assert.ok(r.ok, r.reason);
  const g = sim.guns[0], p = sim.place;
  for (const s of g.soldiers) assert.deepEqual([...s.sight.mask], [...sightFrom(p, s.cell, WEAPONS.hv.range * 1.2).mask]);
  const masks = g.soldiers.map(s => s.sight.keys.join(','));
  assert.ok(new Set(masks).size > 1, 'soldaterna ser olika delar av gatan');
  startWave(sim);
  let shots = 0, private_ = 0;
  for (let i = 0; i < 30 * 90 && sim.phase === 'wave'; i++) {
    step(sim, 1 / 30);
    for (const ev of sim.events) {
      if (ev.t !== 'shot') continue;
      const k = p.keyAt(ev.x, ev.z), s = g.soldiers[ev.soldier];
      assert.equal(s.sight.mask[k], 1, 'skytten ser målet');
      assert.ok(Math.hypot(ev.x - s.x, ev.z - s.z) <= WEAPONS.hv.range + 1e-6);
      shots++;
      if (g.soldiers.some(o => o !== s && !o.sight.mask[k])) private_++;
    }
  }
  assert.ok(shots > 10, `${shots} skott`);
  assert.ok(private_ > 0, 'minst ett skott mot något som en annan i gruppen inte såg');
});

test('zombier slår soldater intill gatan, stupade skjuter inte och kan ersättas', () => {
  const rows = ['B.................a', '..................', '..................', '..................'];
  const waves = [{ groups: [{ type: 'walker', count: 30, interval: 0.4, delay: 0 }] }];
  const map = testMap(rows, waves), sim = createSim({ map, day: 1, cash: 2000, seed: 2 });
  const r = build(sim, keyOf(map, 9, 2), 'hv');
  assert.ok(r.ok, r.reason);
  const g = sim.guns[0];
  // Gruppen gör inget när zombierna inte når dem; flytta en soldat till kanten av gatan.
  const s = g.soldiers[0], c = sim.place.center(keyOf(map, 4, 1));
  Object.assign(s, { x: c.x, z: c.z, cell: keyOf(map, 4, 1), sight: sightFrom(sim.place, keyOf(map, 4, 1), 18) });
  for (const o of g.soldiers) o.run = 0;
  startWave(sim);
  let down = null, stopped = false, hits = 0;
  for (let i = 0; i < 30 * 120 && sim.phase === 'wave' && !down; i++) {
    step(sim, 1 / 30);
    if (sim.zombies.some(z => !z.dead && z.foe)) stopped = true;
    for (const ev of sim.events) { if (ev.t === 'soldierHit') hits++; if (ev.t === 'soldierDown') down = ev; }
  }
  assert.ok(hits > 0 && stopped, 'zombierna stannar och slår');
  assert.ok(down, 'soldaten stupar');
  assert.equal(down.soldier, 0);
  assert.equal(s.down, true);
  // stupad: skjuter inte längre
  for (let i = 0; i < 30 * 3; i++) { step(sim, 1 / 30); assert.ok(!sim.events.some(ev => ev.t === 'shot' && ev.soldier === 0)); }
  // ersätts från panelen: SQUAD.reinforce per stupad, fullt liv, springer ut igen
  const before = sim.cash, cost = reinforceCost(g);
  assert.equal(cost, g.soldiers.filter(x => x.down).length * SQUAD.reinforce);
  const rr = reinforce(sim, g.id);
  assert.ok(rr.ok);
  assert.equal(sim.cash, before - cost);
  assert.equal(s.down, false);
  assert.equal(s.hp, s.maxHp);
  assert.ok(s.run > 0);
  assert.equal(reinforce(sim, g.id).reason, 'hela');
  // nästa dag börjar alla om (ny simulering, ingen grupp följer med)
  assert.equal(createSim({ map, day: 1, cash: 0, seed: 2 }).guns.length, 0);
});

test('pjäserna förblir osårbara och står inte i en soldats ruta', () => {
  const map = testMap(HOUSE), sim = createSim({ map, day: 1, cash: 9999, seed: 1 });
  build(sim, keyOf(map, 8, 5), 'hv');
  const s = sim.guns[0].soldiers[0];
  const near = sim.place.keyAt(s.x + 2, s.z);
  const c = checkSpot(sim, near, 'm249');
  assert.equal(c.ok, false);
  assert.equal(c.reason, 'nära');
  assert.equal(buyKit(sim, sim.guns[0].id).ok, false, 'ingen granatlåda till gruppen');
});

test('uppgradering: nivå 2 ger en femte soldat och mer liv, sälj ger tillbaka som för pjäser', () => {
  const map = testMap(HOUSE), sim = createSim({ map, day: 1, cash: 9999, seed: 1 });
  build(sim, keyOf(map, 8, 5), 'hv');
  const g = sim.guns[0];
  assert.equal(g.soldiers.length, 4);
  assert.ok(upgrade(sim, g.id).ok);
  assert.equal(g.soldiers.length, 5);
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) assert.ok(dist(g.soldiers[i], g.soldiers[j]) >= SQUAD.spacing - 1e-9);
  assert.ok(g.soldiers.every(s => s.maxHp === SQUAD.hp[1] && s.hp === s.maxHp));
  assert.ok(upgrade(sim, g.id).ok);
  assert.equal(g.soldiers.length, 5);
  const cash = sim.cash, r = sell(sim, g.id);
  assert.ok(r.ok);
  assert.equal(sim.cash, cash + Math.round((250 + 200 + 300) * 0.6));
});

test('köpkortet: Hemvärnet finns från början, kostar en position och kräver rum', () => {
  const sim = createSim(startConfig(newProgress(), 1));
  assert.equal(buyState(sim, 'hv').state, 'ok');
  assert.ok(WEAPONS.hv.cost >= 200 && WEAPONS.hv.cost <= 300);
  // en ruta mitt i skogen eller inne bland husen utan sikt får ingen grupp
  const g = createSim({ map: gnesta, day: 1, cash: 9999, seed: 1 });
  const bad = [];
  for (let k = 0; k < g.place.n; k++) if (g.place.kind[k] === KIND.open && squadPreview(g, k).length < 4) bad.push(k);
  if (bad.length) assert.equal(checkSpot(g, bad[0], 'hv').reason, 'trångt');
});

test('sparfiler från 0.8.0 läses in oförändrade och raderas aldrig', () => {
  const m = new Map(), st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  const old = { v: 3, mapId: 'gnesta', intel: 340, research: ['m2.1', 'm2.2', 'grenade.1', 'psg90.1', 'ak5.1'], seenHint: true,
    maps: { riksvagen: { unlockedDay: 4, attempts: { 3: 2 } }, gnesta: { unlockedDay: 2, attempts: { 1: 1 } } } };
  const raw = JSON.stringify(old);
  st.setItem('horde.save', raw);
  const p = loadProgress(st);
  assert.deepEqual(p.research, old.research);
  assert.equal(p.intel, 340);
  assert.deepEqual(p.maps.gnesta, old.maps.gnesta);
  assert.equal(st.getItem('horde.save'), raw, 'läsningen skriver inte över');
  assert.equal(st.getItem('horde.save.broken'), null);
  // och spelet med den sparfilen kan köpa Hemvärnet
  const sim = createSim(startConfig(p, 1));
  assert.equal(buyState(sim, 'hv').state, 'ok');
  // sparas och läses tillbaka likadant
  saveProgress(p, st);
  assert.deepEqual(loadProgress(st), p);
  // en v2-sparfil (0.4.x) får en kopia och flyttas som förut
  const m2 = new Map(), st2 = { getItem: k => (m2.has(k) ? m2.get(k) : null), setItem: (k, v) => m2.set(k, String(v)) };
  const v2 = JSON.stringify({ ...old, v: 2, research: ['m2.1', 'slot4'] });
  st2.setItem('horde.save', v2);
  const p2 = loadProgress(st2);
  assert.deepEqual(p2.research, ['m2.1', 'positions.1']);
  assert.equal(st2.getItem('horde.save.v2'), v2);
});
