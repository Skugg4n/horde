import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build as buildAt, buyKit as buyKitAt, sell as sellAt, zombiePos, placeObstacle, spotAt } from '../src/sim/sim.js';
import { grenadeStats } from '../src/sim/stats.js';
import { MAPS } from '../src/data/maps.js';
import { STRAIGHT } from './fixtures/straight-road.js';
import { GRENADE_KIT } from '../src/data/weapons.js';
import { ZOMBIES } from '../src/data/zombies.js';
import { RESEARCH } from '../src/data/research.js';

const map = STRAIGHT;
const DT = 1 / 30;
const mk = (o = {}) => createSim({ map, day: 3, cash: 5000, research: [], seed: 4, ...o });
// Platsen C (nära den gamla positionen vid 2, 8). Vapnet där heter 'g1' när det är byggt först.
const C = [0, 8];
const build = (s, _name, type) => buildAt(s, spotAt(s, ...C), type);
const gunId = s => s.guns[0]?.id ?? 'saknas';
const buyKit = s => buyKitAt(s, gunId(s));
const sell = s => sellAt(s, gunId(s));

test('granatlådan kräver forskning, en byggd pjäs och pengar', () => {
  const s = mk();
  assert.equal(buyKit(s, 'C').reason, 'okänd');
  build(s, 'C', 'm249');
  assert.equal(buyKit(s, 'C').reason, 'ej upplåst');
  const t = mk({ research: ['grenade.1'], cash: 250 + GRENADE_KIT.cost - 1 });
  build(t, 'C', 'm249');
  assert.equal(buyKit(t, 'C').reason, 'pengar');
  t.cash += 1;
  assert.deepEqual(buyKit(t, 'C'), { ok: true });
  assert.equal(t.cash, 0);
  assert.equal(buyKit(t, 'C').reason, 'redan');
});
test('sälj ger tillbaka del av lådan också', () => {
  const s = mk({ research: ['grenade.1'] });
  build(s, 'C', 'm249'); buyKit(s, 'C');
  assert.equal(sell(s, 'C').refund, Math.round((250 + GRENADE_KIT.cost) * 0.6));
});
test('nivåerna gör granaten starkare', () => {
  const g = [1, 2, 3].map(t => grenadeStats(['grenade.' + t]));
  assert.equal(grenadeStats([]), null);
  assert.ok(g[1].damage > g[0].damage && g[1].radius > g[0].radius);
  assert.equal(g[2].count, 2);
  assert.equal(RESEARCH.find(n => n.id === 'grenade').tiers.length, 3);
});

// Spelar dag 3 med en M249 och låda på C och samlar händelserna.
function playWithKit(research, kit = true) {
  const s = mk({ research });
  build(s, 'C', 'm249');
  if (kit) buyKit(s, 'C');
  startWave(s);
  const log = [];
  for (let i = 0; i < 30 * 40; i++) { step(s, DT); log.push(...s.events.map(e => ({ ...e, at: s.time }))); }
  return { s, log };
}

test('bara positioner med låda kastar', () => {
  assert.equal(playWithKit(['grenade.1'], false).log.filter(e => e.t === 'grenade').length, 0);
  assert.ok(playWithKit(['grenade.1']).log.filter(e => e.t === 'grenade').length >= 1);
});
test('granaten flyger, landar som en smäll och skadar inom radien', () => {
  const { s, log } = playWithKit(['grenade.1']);
  const g = log.find(e => e.t === 'grenade');
  assert.equal(g.gunId, 'g1');
  assert.equal(g.flight, GRENADE_KIT.flight);
  const slot = s.guns[0];
  assert.ok(Math.hypot(g.x - slot.x, g.z - slot.z) <= GRENADE_KIT.range + 4);
  const b = log.find(e => e.t === 'blast');
  assert.ok(Math.abs(b.at - g.at - GRENADE_KIT.flight) < 0.05, 'landar efter flygtiden');
  assert.equal(b.x, g.x); assert.equal(b.z, g.z);
  assert.equal(b.r, grenadeStats(['grenade.1']).radius);
  const hits = log.filter(e => e.t === 'hit' && e.at === b.at && Math.hypot(e.x - b.x, e.z - b.z) <= b.r);
  assert.ok(hits.length >= 2, `minst två träffade av smällen, fick ${hits.length}`);
});
test('egen nedkylning: nästa kast tidigast efter cooldown', () => {
  const { log } = playWithKit(['grenade.1']);
  const t = log.filter(e => e.t === 'grenade').map(e => e.at);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] - t[i - 1] >= grenadeStats(['grenade.1']).cooldown - 0.05);
});
test('skadan avtar ut mot kanten', () => {
  const s = mk({ research: ['grenade.1'] });
  startWave(s);
  for (let i = 0; i < 30 * 8; i++) step(s, DT);
  const alive = s.zombies.filter(z => !z.dead);
  const p0 = zombiePos(s, alive[0]);
  const gs = grenadeStats(['grenade.1']);
  const hp = new Map(alive.map(z => [z.id, z.hp]));
  s.grenades.push({ gunId: 'g1', x: p0.x, z: p0.z, left: DT / 2, damage: gs.damage, r: gs.radius, falloff: gs.falloff });
  const before = new Map(s.zombies.map(z => [z.id, { p: zombiePos(s, z) }]));
  step(s, DT);
  assert.ok(s.events.some(e => e.t === 'blast'));
  const center = hp.get(alive[0].id) - Math.max(0, alive[0].hp);
  assert.ok(center >= gs.damage * 0.9 || alive[0].dead);
  for (const z of alive.slice(1)) {
    const d = Math.hypot(before.get(z.id).p.x - p0.x, before.get(z.id).p.z - p0.z);
    if (d > gs.radius + 0.3) assert.equal(z.hp, hp.get(z.id), 'utanför radien: ingen skada');
  }
});
test('två granater per kast på nivå III', () => {
  const { log } = playWithKit(['grenade.1', 'grenade.2', 'grenade.3', 'm2.1']);
  // Andra granaten tar nästa klunga; ett kast med bara en klunga inom räckhåll blir en granat.
  const at = [...new Set(log.filter(e => e.t === 'grenade').map(e => e.at))];
  const most = Math.max(...at.map(t => log.filter(e => e.t === 'grenade' && e.at === t).length));
  assert.equal(most, 2);
});
test('ledningen räknar med verklig fart i taggtråd', () => {
  const s = mk({ research: ['grenade.1'] });
  build(s, 'C', 'm249'); buyKit(s, 'C');
  placeObstacle(s, 0, 'wire');
  startWave(s);
  s.spawnQueue = [];
  s.zombies.push({ id: 900, type: 'brute', wave: 0, hp: 99999, maxHp: 99999, d: 33.5, off: 0, wob: 0, dead: false, deadT: 0, blockedBy: null, breached: false, attacking: false });
  const z = s.zombies[0], gs = grenadeStats(['grenade.1']);
  let ev = null;
  for (let i = 0; i < 30 * 10 && !ev; i++) { step(s, DT); ev = s.events.find(e => e.t === 'grenade'); }
  assert.ok(ev, 'en granat kastades');
  assert.ok(z.v < ZOMBIES.brute.speed, 'tråden saktar bjässen');
  const want = zombiePos(s, { ...z, d: z.d + z.v * gs.flight });
  assert.ok(Math.hypot(ev.x - want.x, ev.z - want.z) < 1e-6);
});
