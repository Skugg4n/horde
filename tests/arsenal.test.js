import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build, spotAt, checkSpot, sightFor, onRoof } from '../src/sim/sim.js';
import { weaponStats, launcherStats, weaponUnlocked } from '../src/sim/stats.js';
import { placementFor, lineOfSight, sightFrom, roofSightFrom, distRect, ROOF_DEAD, KIND } from '../src/sim/placement.js';
import { WEAPONS } from '../src/data/weapons.js';
import { RESEARCH, researchNode } from '../src/data/research.js';
import { SHOP } from '../src/data/shop.js';
import { MAPS } from '../src/data/maps.js';
import { gnesta } from '../src/data/gnesta.js';
import { loadProgress } from '../src/meta/save.js';

const ALL = ['m2.1', 'ksp58.1', 'ak5.1', 'psg90.1', 'grenade.1'];
const dps = (t, r = []) => { const s = weaponStats(t, 1, new Set(r)); return s.rate * s.damage * s.accuracy; };

test('svenska beteckningar, stabila id', () => {
  assert.equal(WEAPONS.m249.name, 'Ksp 90');
  assert.equal(WEAPONS.m249.desc, 'Light machine gun. Cheap and fast.');
  assert.equal(WEAPONS.m2.name, 'Ksp 88');
  assert.equal(WEAPONS.m2.desc, 'Heavy 12.7 mm machine gun. Chews through brutes.');
  assert.equal(WEAPONS.ak5.name, 'Ak 5 + granattillsats');
  assert.equal(WEAPONS.psg90.name, 'Psg 90');
  for (const w of Object.values(WEAPONS)) assert.ok(w.desc.length > 10 && !/[åäö]/.test(w.desc), `${w.id}: engelsk beskrivning`);
  // köpradens fyra första snabbval är orörda, de nya kommer sist (0.9.0: Hemvärnet på 8)
  assert.deepEqual(SHOP.map(s => s.id), ['m249', 'm2', 'block', 'wire', 'ksp58', 'ak5', 'psg90', 'hv']);
  assert.equal(WEAPONS.hv.name, 'Hemvärnet');
  assert.ok(!/militia/i.test(WEAPONS.hv.desc + WEAPONS.hv.name), 'aldrig "militia"');
});

test('en gammal sparfil med M2 och M249-forskning behåller allt (id oförändrade)', () => {
  const m = new Map([['horde.save', JSON.stringify({ v: 3, mapId: 'riksvagen', intel: 5, research: ['m2.1', 'm2.2', 'm249Rate.1'], maps: { riksvagen: { unlockedDay: 3, attempts: {} } } })]]);
  const st = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  const p = loadProgress(st);
  assert.deepEqual(p.research, ['m2.1', 'm2.2', 'm249Rate.1']);
  assert.equal(weaponUnlocked('m2', p.research), true);
  assert.equal(m.has('horde.save.broken'), false);
});

test('Ksp 58 ligger mellan Ksp 90 och Ksp 88 i pris, räckvidd och eld', () => {
  const [a, b, c] = ['m249', 'ksp58', 'm2'].map(t => WEAPONS[t]);
  assert.ok(a.cost < b.cost && b.cost < c.cost);
  assert.ok(a.range < b.range && b.range < c.range);
  assert.ok(dps('m249') < dps('ksp58') && dps('ksp58') < dps('m2'));
});

test('de nya vapnen låses upp av forskning, med krav', () => {
  for (const id of ['ksp58', 'ak5', 'psg90']) {
    assert.equal(weaponUnlocked(id, []), false, id);
    assert.equal(weaponUnlocked(id, [`${id}.1`]), true, id);
    assert.equal(researchNode(id).tiers.length, 3);
  }
  assert.deepEqual(researchNode('ksp58').tiers[0].requires, ['m2.1']);
  assert.deepEqual(researchNode('psg90').tiers[0].requires, ['m2.2']);
  assert.deepEqual(researchNode('ak5').tiers[0].requires, ['grenade.1']);
  // forskningen är djupare än förut: över 2000 poäng mer att lägga
  const total = RESEARCH.reduce((a, n) => a + n.tiers.reduce((b, t) => b + t.cost, 0), 0);
  assert.ok(total >= 4000, `forskning totalt ${total}`);
});

test('Psg 90: långsam, dödlig, lång räckvidd, går igenom två', () => {
  const p = weaponStats('psg90', 1, new Set()), m = weaponStats('m2', 1, new Set());
  assert.ok(p.range > m.range * 1.4 && p.damage > m.damage * 3 && p.rate < 1);
  assert.equal(p.pierce, 2);
  assert.equal(weaponStats('psg90', 1, new Set(['psg90.1', 'psg90.2', 'psg90.3'])).pierce, 3);
});

// Två zombier i rad på E4:s väg framför en Psg 90: båda träffas av samma skott.
test('Psg 90 går igenom: två zombier i linje tar skada av ett skott', () => {
  const map = MAPS.riksvagen;
  const sim = createSim({ map, day: 1, cash: 5000, research: ['m2.1', 'm2.2', 'psg90.1'], seed: 2 });
  // nästan i vägens linje (vid basen), så att kön av zombier står i skottlinjen
  const r = build(sim, spotAt(sim, -7, 5), 'psg90');
  assert.equal(r.ok, true, r.reason);
  startWave(sim);
  sim.spawnQueue = Array.from({ length: 10 }, (_, i) => ({ at: i * 0.25, type: 'brute', wave: 0 }));
  let pierced = 0, shots = 0;
  for (let i = 0; i < 30 * 60 && sim.phase === 'wave'; i++) {
    step(sim, 1 / 30);
    pierced += sim.events.filter(e => e.t === 'pierce').length;
    shots += sim.events.filter(e => e.t === 'shot' && e.hit).length;
  }
  assert.ok(pierced > 0 && pierced <= shots, `träffar ${shots}, genomskott ${pierced}`);
});

test('Ak 5: enstaka skott hela tiden plus en 40 mm-granat med ytskada', () => {
  const map = MAPS.riksvagen;
  const sim = createSim({ map, day: 1, cash: 5000, research: ['grenade.1', 'ak5.1'], seed: 4 });
  assert.equal(build(sim, spotAt(sim, 2, 8), 'ak5').ok, true);
  startWave(sim);
  sim.spawnQueue = Array.from({ length: 12 }, (_, i) => ({ at: i * 0.3, type: 'walker', wave: 0 }));
  const ev = { shot: 0, launch: 0, grt: 0 };
  for (let i = 0; i < 30 * 40 && sim.phase === 'wave'; i++) {
    step(sim, 1 / 30);
    for (const e of sim.events) { if (e.t === 'shot') ev.shot++; if (e.t === 'launch') ev.launch++; if (e.t === 'blast' && e.kind === 'grt') ev.grt++; }
  }
  assert.ok(ev.shot > ev.launch * 4, `skott ${ev.shot}, granater ${ev.launch}`);
  assert.ok(ev.launch >= 2 && ev.grt === ev.launch, `granater ${ev.launch}, smällar ${ev.grt}`);
  const ls = launcherStats('ak5', 1, new Set(['ak5.1']));
  assert.ok(ls.cooldown >= 3 && ls.cooldown <= 6 && ls.radius > 2);
  assert.ok(launcherStats('ak5', 1, new Set(['ak5.1', 'ak5.2', 'ak5.3'])).cooldown < ls.cooldown);
  assert.equal(launcherStats('m2', 1, new Set()), null);
});

// ---------- tak ----------
const gp = placementFor(gnesta);
const roofKeys = [];
for (let k = 0; k < gp.n; k++) if (gp.roof[k] > 0) roofKeys.push(k);
const mkG = () => createSim({ map: gnesta, day: 1, cash: 9000, research: ALL.concat('m2.2'), seed: 1 });

test('Gnesta har tak att ligga på, bara på husen', () => {
  assert.ok(roofKeys.length > 200, `takrutor ${roofKeys.length}`);
  for (const k of roofKeys) {
    assert.equal(gp.kind[k], KIND.house);
    assert.ok(gp.roof[k] > 2.5 && gp.roof[k] < 9, `höjd ${gp.roof[k]}`);
    assert.ok(gp.bldg[k] > 0);
  }
  // E4 har inga tak (ruinen är en ruin)
  assert.equal(placementFor(MAPS.riksvagen).roof, null);
});

test('bara Psg 90 får stå på ett tak; den hamnar på takets höjd', () => {
  const sim = mkG();
  const k = roofKeys[Math.floor(roofKeys.length / 2)];
  assert.equal(checkSpot(sim, k, 'm2').reason, 'hus');
  assert.equal(checkSpot(sim, k, 'ksp58').reason, 'hus');
  assert.equal(checkSpot(sim, k, 'psg90').ok, true);
  assert.equal(onRoof(sim, k, 'psg90'), true);
  const r = build(sim, k, 'psg90');
  assert.equal(r.ok, true);
  const g = sim.guns[0];
  assert.equal(g.roof, true);
  assert.equal(g.y, gp.roof[k]);
  // marginalen runt huset (husruta utan tak) går inte, inte heller för Psg 90
  const pad = [...Array(gp.n).keys()].find(q => gp.kind[q] === KIND.house && !gp.roof[q]);
  assert.equal(checkSpot(sim, pad, 'psg90').reason, 'kant');
  // på marken fungerar den som de andra
  const open = [...Array(gp.n).keys()].find(q => gp.kind[q] === KIND.open && Math.hypot(gp.center(q).x - g.x, gp.center(q).z - g.z) > 8);
  assert.equal(build(sim, open, 'psg90').ok, true);
  assert.equal(sim.guns[1].roof, false);
  assert.equal(sim.guns[1].y, 0);
});

test('sikt från taket: över alla hus, utom närmast det egna huset (ROOF_DEAD)', () => {
  assert.equal(ROOF_DEAD, 4);
  const sim = mkG();
  const range = weaponStats('psg90', 3, sim.research).range;
  let overHouses = 0, checked = 0;
  for (const k of roofKeys.filter((_, i) => i % 25 === 0)) {
    const own = gp.buildings[gp.bldg[k] - 1], c = gp.center(k);
    const roof = roofSightFrom(gp, k, range), ground = sightFrom(gp, k, range);
    assert.deepEqual(sightFor(sim, k, 'psg90').keys, roof.keys, 'sightFor använder takregeln');
    for (const q of gp.walkKeys) {
      const d = gp.center(q);
      if (Math.hypot(d.x - c.x, d.z - c.z) > range) continue;
      const dead = own.some(r => distRect(r, d.x, d.z) < ROOF_DEAD);
      assert.equal(!!roof.mask[q], !dead, `tak ${k} ruta ${q}`);
      if (roof.mask[q] && !lineOfSight(gp, k, q)) overHouses++;
      checked++;
    }
    // en rad markrutor bakom husen syns från taket men inte från marken i samma ruta
    assert.ok(roof.keys.length >= ground.keys.length * 0.5);
  }
  assert.ok(checked > 1000 && overHouses > 100, `ser över hus: ${overHouses} av ${checked}`);
});

test('Psg 90 på ett tak skjuter över husen på Gnesta', () => {
  const sim = mkG();
  // taket som ser flest vägrutor som inte syns från marken på samma plats
  let best = null;
  for (const k of roofKeys.filter((_, i) => i % 7 === 0)) {
    const roof = roofSightFrom(gp, k, 34).keys.filter(q => !lineOfSight(gp, k, q)).length;
    if (!best || roof > best.n) best = { k, n: roof };
  }
  assert.equal(build(sim, best.k, 'psg90').ok, true);
  const g = sim.guns[0];
  startWave(sim);
  let hidden = 0;
  for (let i = 0; i < 30 * 200 && sim.phase === 'wave'; i++) {
    step(sim, 1 / 30);
    for (const e of sim.events) if (e.t === 'shot') {
      const q = gp.keyAt(e.x, e.z);
      if (q >= 0 && !lineOfSight(gp, g.cell, q)) hidden++;
    }
    if (hidden > 3) break;
  }
  assert.ok(hidden > 3, `skott mot rutor bakom hus: ${hidden}`);
});
