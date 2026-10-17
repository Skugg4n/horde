// Mölnbo (0.17.0-molnbo): kartan, bron som enda passagen, perrongen och banvallen, prickskyttelägena, tåget som
// skydd, tågklockan, kampanjens krok och balansen. docs/superpowers/specs/2026-10-17-molnbo-design.md,
// docs/superpowers/specs/2026-10-18-molnbo-build-notes.md och docs/balance-log.md (Mölnbo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { molnbo, R, toRail, groundY, DECK_H, RAIL, TOWERS, X60, FOOT, BRIDGE } from '../src/data/molnbo.js';
import { routeFor } from '../src/sim/route.js';
import { placementFor, KIND } from '../src/sim/placement.js';
import { createSim, startWave, step, build } from '../src/sim/sim.js';
import { newCampaign, debugReach, unitsIn, finishDay, sectorStatus } from '../src/meta/operation.js';
import { mapUnlocked } from '../src/meta/progress.js';
import { molnboCampaign, mbAttempts, mbPrints } from '../scripts/balance.mjs';

const route = routeFor(molnbo), g = route.grid, p = placementFor(molnbo);
const keyAtRail = (u, v) => { const [x, z] = R(u, v); return g.keyAt(x, z); };
const uOn = (br, v) => br.a[0] + (br.a[1] - v) * (br.b[0] - br.a[0]) / (br.a[1] - br.b[1]);

test('Mölnbo är en bana efter Hagstumosse, med fem dagar och korta intron', () => {
  assert.equal(MAPS.molnbo, molnbo);
  assert.equal(molnbo.days.length, 5);
  assert.deepEqual(molnbo.unlock, { map: 'gnesta-norr', day: 5 });
  for (const d of molnbo.days) {
    assert.match(d.intro.title, /^Day \d: /);
    assert.ok(d.intro.text.split(/\s+/).length <= 12, d.intro.text);
    assert.doesNotMatch(JSON.stringify(d), /—/);
  }
  // tågklockan från dag 3, det sista tåget dag 5
  assert.deepEqual(molnbo.days.map(d => !!d.train), [false, false, true, true, true]);
  assert.equal(molnbo.days[4].train.last, true);
});

test('varje ingång når Folkets hus, och järnvägen är stängd utom broarna, perrongen och banvallen', () => {
  for (const pa of route.paths(molnbo.spawns.map(s => s.id))) assert.ok(pa.reaches, pa.id);
  // spåren och södra perrongen är stängda för horden
  for (const v of RAIL.tracks) for (const u of [-60, -30, 40, 80]) assert.equal(g.walkable(keyAtRail(u, v)), false, `spår ${u} ${v}`);
  assert.equal(g.walkable(keyAtRail(-50, 8.2)), false, 'södra perrongen');
  // norra perrongen och båda broarna är gångbara
  assert.equal(g.walkable(keyAtRail(-50, -10.5)), true, 'norra perrongen');
  for (const br of [BRIDGE, FOOT]) for (const v of [-6, 0, 6]) assert.equal(g.walkable(keyAtRail(uOn(br, v), v)), true, `bro vid ${v}`);
});

test('norr om spåret: enda vägen är bron. Stängs båda broarna slår horden sig igenom', () => {
  const span = (u, v) => { const [x, z] = R(u, v); return route.span(route.cellAt(x, z)); };
  const obs = {};
  for (const k of span(uOn(BRIDGE, 22), 22)) obs[k] = { type: 'block' };
  // bara vägbron stängd: Krokvägen går över gångbron
  let pa = route.paths(['s4'], obs)[0];
  assert.ok(pa.reaches && pa.through == null);
  assert.ok(pa.cells.some(k => { const [u, v] = toRail(...g.center(k)); return Math.abs(v) < 5 && Math.abs(u - uOn(FOOT, v)) < 3; }), 'över gångbron');
  // båda stängda: ingen öppen väg, de går genom en spärr
  for (const k of span(uOn(FOOT, 22), 22)) obs[k] = { type: 'block' };
  pa = route.paths(['s4'], obs)[0];
  assert.ok(pa.through != null, 'genom en spärr');
  // banvallen (S5) når bara resten genom trappan till gångbron
  const s5 = route.paths(['s5'])[0];
  assert.ok(s5.cells.some(k => { const [u, v] = toRail(...g.center(k)); return u > RAIL.platformN.u0 && v < RAIL.platformN.v1 + 0.5 && v > RAIL.platformN.v0 - 0.5; }), 'över perrongen');
});

test('höjden i bilden: däcket, ramperna och perrongen', () => {
  assert.equal(groundY(...R(uOn(BRIDGE, 0), 0)), DECK_H);
  assert.equal(groundY(...R(uOn(FOOT, 0), 0)), DECK_H);
  assert.equal(groundY(...R(-6, 34)), 0, 'korsningen vid caféet');
  const mid = groundY(...R(uOn(BRIDGE, 22), 22));
  assert.ok(mid > 0.5 && mid < DECK_H - 0.5, `rampen ${mid}`);
  assert.equal(groundY(...R(-50, -10.5)), RAIL.platformN.h);
});

test('prickskyttelägen: trapptornen, stationstaket och tågtaket. Gruppen har skydd bakom tåget', () => {
  const sim = createSim({ map: { ...molnbo, days: [{ n: 1, startCash: 99999, waves: [{ groups: [] }] }] }, day: 1, cash: 99999, research: ['psg90.1'] });
  const roofKey = (u, v) => keyAtRail(u, v);
  for (const t of TOWERS) {
    const k = roofKey(...t.at);
    assert.ok(p.perch[k] && p.roof[k] >= t.h - 0.05, `${t.id}`);
    assert.equal(build(sim, k, 'psg90').ok, true, `Psg 90 på ${t.id}`);
  }
  assert.ok(p.perch[roofKey(-51, X60.v)] && p.roof[roofKey(-51, X60.v)] > 3.5, 'X60-taket');
  assert.ok(p.perch[roofKey(92, 16.5)], 'stationstaket');
  // tåget skymmer (ett hus med höjd), och södra perrongen bakom det är skydd för grupperna
  assert.equal(p.kind[roofKey(-51, X60.v)], KIND.house);
  let brick = 0;
  for (let u = -76; u < -26; u += 2) { const k = keyAtRail(u, 6.8); if (p.brick[k] && p.kind[k] === KIND.open) brick++; }
  assert.ok(brick >= 15, `${brick} rutor bakom tåget`);
});

test('tågklockan: dagen vinns när tåget går, också med zombier kvar, och väntar på tåget när vågorna är klara', () => {
  const day = { n: 1, startCash: 0, train: { at: 30 }, waves: [{ groups: [{ type: 'walker', count: 30, interval: 0.5, delay: 0, spawn: 's1' }] }] };
  const sim = createSim({ map: { ...molnbo, baseHp: 999, days: [day] }, day: 1, cash: 0 });
  startWave(sim);
  let gone = null;
  while (sim.phase !== 'won' && sim.time < 60) { step(sim, 0.1); if (sim.events.some(e => e.t === 'trainGone')) gone = sim.time; }
  assert.equal(sim.phase, 'won');
  assert.ok(Math.abs(gone - 30) < 0.15, `tåget gick ${gone}`);
  assert.ok(sim.zombies.some(z => !z.dead), 'zombier kvar när tåget gick');
  // en dag där vågorna är slut före tåget: den väntar
  const d2 = { n: 1, startCash: 0, train: { at: 40 }, waves: [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0, spawn: 's1' }] }] };
  const s2 = createSim({ map: { ...molnbo, baseHp: 999, days: [d2] }, day: 1, cash: 0 });
  startWave(s2);
  while (!s2.zombies.length) step(s2, 0.1);
  for (const z of s2.zombies) z.dead = true;
  for (let i = 0; i < 100; i++) step(s2, 0.1);
  assert.notEqual(s2.phase, 'won', 'väntar på tåget');
  while (s2.phase !== 'won' && s2.time < 60) step(s2, 0.1);
  assert.ok(s2.phase === 'won' && s2.time >= 40 - 1e-6);
});

test('kampanjen: Mölnbo öppnar efter Vikingavägen dag 5 och truppen följer med', () => {
  let p0 = debugReach(newCampaign(), 'gnesta-norr', 5);
  assert.equal(mapUnlocked(p0, 'molnbo'), false);
  assert.equal(sectorStatus(p0, 'molnbo'), 'locked');
  const before = p0.op.units.length;
  p0 = finishDay(p0, { mapId: 'gnesta-norr', day: 5, won: true, intelEarned: 10 }).progress;
  assert.equal(mapUnlocked(p0, 'molnbo'), true);
  assert.equal(sectorStatus(p0, 'molnbo'), 'holding');
  // alla enheter står i Mölnbo (Hagstumosse är klar), plus ledningens Psg 90
  assert.equal(unitsIn(p0, 'molnbo').length, before + 1);
  assert.ok(p0.op.inbox.some(m => /Mölnbo station is the last way north/.test(m.text)), 'övergången');
  assert.ok(p0.op.inbox.some(m => m.id === 'mb-1'));
});

// Balansen (docs/balance-log.md, Mölnbo). Spelaren kommer med det en vanlig spelare har efter Hagstumosse.
const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const smart = SEEDS.map(s => molnboCampaign('mbSmart', { seedOffset: s, maxAttempts: 6 }));
const naive = SEEDS.map(s => molnboCampaign('naive', { seedOffset: s, maxAttempts: 4 }));

test('balans: kartläsaren vinner dag 1 till 3 inom 2 försök och dag 4 och 5 inom 4', () => {
  for (const [i, r] of smart.entries()) {
    const a = mbAttempts(r.log);
    assert.equal(r.stuck, null, `seed ${i}: ${a}`);
    for (let d = 0; d < 3; d++) assert.ok(a[d] <= 2, `seed ${i} dag ${d + 1}: ${a}`);
    for (let d = 3; d < 5; d++) assert.ok(a[d] <= 4, `seed ${i} dag ${d + 1}: ${a}`);
  }
  // dag 4 kostar försök i de flesta seeds (bron är svår)
  assert.ok(smart.filter(r => mbAttempts(r.log)[3] >= 2).length >= 3);
});

test('balans: den som aldrig spärrar förlorar från dag 3', () => {
  for (const [i, r] of naive.entries()) {
    const a = mbAttempts(r.log);
    assert.deepEqual(a.slice(0, 2), [1, 1], `seed ${i}`);
    assert.deepEqual(r.stuck, { mapId: 'molnbo', day: 3 }, `seed ${i}: ${a}`);
  }
});

test('balans: högst cirka 250 levande zombier samtidigt', () => {
  const peak = Math.max(...[...smart, ...naive].flatMap(r => r.log.map(x => x.peak)));
  assert.ok(peak <= 250, `${peak}`);
});

// Kvittot per dag. Ett ändrat steg ska vara avsiktligt och förklarat i docs/balance-log.md (Mölnbo).
// 0.17.0-molnbo: första kvittot.
const pr = rs => mbPrints([].concat(...rs.map((r, i) => r.log.map(x => ({ ...x, seed: i })))));
test('balans: fingeravtrycket per dag (mbSmart och naive)', () => {
  assert.deepEqual(pr(smart), { 'molnbo 1': 'c73550b3', 'molnbo 2': '70afde53', 'molnbo 3': 'b912da3c', 'molnbo 4': '343da59a', 'molnbo 5': '9da35399' });
  assert.deepEqual(pr(naive), { 'molnbo 1': '9d65b52a', 'molnbo 2': '21c4a23b', 'molnbo 3': '6da351cb', 'molnbo 4': '741638a5', 'molnbo 5': '741638a5' });
});
