// Mölnbo (0.17.0-molnbo): kartan, bron som enda passagen, perrongen och banvallen, prickskyttelägena, tåget som
// skydd, tågklockan, kampanjens krok och balansen. docs/superpowers/specs/2026-10-17-molnbo-design.md,
// docs/superpowers/specs/2026-10-18-molnbo-build-notes.md och docs/balance-log.md (Mölnbo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { molnbo, R, toRail, groundY, deckY, underDeck, DECK_H, RAIL, TOWERS, X60, FOOT, BRIDGE, SHAPES } from '../src/data/molnbo.js';
import { liftedHit } from '../src/render/lift.js';
import { reasonText } from '../src/ui/panels.js';
import { placeAcross, checkSpot, removeObstacle } from '../src/sim/sim.js';
import { routeFor } from '../src/sim/route.js';
import { placementFor, KIND } from '../src/sim/placement.js';
import { crewPassable } from '../src/sim/crew-path.js';
import { rerouteStreet, streetAt } from '../src/sim/streets.js';
import { createSim, startWave, step, build } from '../src/sim/sim.js';
import { newCampaign, debugReach, unitsIn, finishDay, sectorStatus } from '../src/meta/operation.js';
import { mapUnlocked } from '../src/meta/progress.js';
import { molnboCampaign, mbAttempts, mbPrints, molnboArrival } from '../scripts/balance.mjs';
import { ARRIVAL_TROOP } from '../src/data/arrival.js';

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
    assert.doesNotMatch(JSON.stringify(d), /\u2014/);
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

// 0.17.1 (speltestet av 0.17.0: spärrarna på bron syntes inte, och en Psg 90 hamnade under gångbron)
test('bron: spärren ligger på däcket, och ingen enhet kan stå under det', () => {
  const sim = createSim({ map: { ...molnbo, days: [{ n: 1, startCash: 99999, waves: [{ groups: [] }] }] }, day: 1, cash: 99999, research: ['psg90.1'] });
  // en spärr mitt på varje bro: alla rutor står på däckets höjd (bilden lyfter hindren med map.groundY)
  for (const br of [BRIDGE, FOOT]) {
    const [x, z] = R(uOn(br, 0), 0);
    const r = placeAcross(sim, route.cellAt(x, z), 'block');
    assert.ok(r.ok, JSON.stringify(r));
    for (const k of r.cells) assert.equal(groundY(...g.center(k)), DECK_H, `ruta ${k} på däcket`);
  }
  // pekaren mot däcket uppifrån som kameran: punkten ligger på däcket, inte på marken bakom
  const [bx, bz] = R(uOn(BRIDGE, 0), 0), dir = [-40, -46, -40], L = Math.hypot(...dir);
  const ray = { origin: { x: bx + 40, y: DECK_H + 46, z: bz + 40 }, direction: { x: dir[0] / L, y: dir[1] / L, z: dir[2] / L } };
  const hit = liftedHit(ray, molnbo.groundY);
  assert.ok(Math.hypot(hit.x - bx, hit.z - bz) < 0.5, `träffen ${hit.x} ${hit.z}`);
  // under däcket: inga öppna rutor, skälet "Under the bridge", men soldaterna kan gå där
  let under = 0;
  for (let k = 0; k < p.n; k++) {
    const c = p.center(k);
    if (p.walk[k] || !underDeck(c.x, c.z)) continue;
    under++;
    assert.notEqual(p.kind[k], KIND.open, `ruta ${k} under bron är öppen`);
    assert.ok(crewPassable(p, k) || p.kind[k] === KIND.house, `ruta ${k}`);
  }
  assert.ok(under > 30, `${under} rutor under broarna`);
  // södra perrongen under gångbron (där Psg 90 hamnade i speltestet)
  let k0 = -1;
  // utanför järnvägen (förut öppen mark) och med däcket mer än 2 m över sig
  for (let k = 0; k < p.n && k0 < 0; k++) { const c = p.center(k), [, v] = toRail(c.x, c.z); if (Math.abs(v) > RAIL.corridor[1] + 1 && !p.walk[k] && deckY(c.x, c.z) > 2) k0 = k; }
  assert.ok(k0 >= 0, 'en ruta under bron utanför järnvägen');
  const r0 = checkSpot(sim, k0, 'psg90');
  assert.deepEqual(r0, { ok: false, reason: 'bro' });
  assert.equal(reasonText('bro'), 'Under the bridge');
  // och spärren går att riva med halva priset tillbaka, som på de andra banorna
  const [fx, fz] = R(uOn(FOOT, 0), 0), cash = sim.cash;
  const rm = removeObstacle(sim, route.cellAt(fx, fz));
  assert.ok(rm.ok && rm.refund === 75 && sim.cash === cash + 75, JSON.stringify(rm));
});

// 0.17.1 (speltestet av 0.17.0, dag 4: basen tömdes medan vägbrons spärr stod hel). Ingen väg från norr går förbi två
// spärrar på broarna, var på däcken de än står (ramperna inräknade, inte korsningarna vid brofästena där gatan är
// bredare än spärren). Horden norrifrån måste alltså slå sig igenom en spärr.
test('broarna: med båda broarna spärrade finns ingen väg från norr runt spärrarna', () => {
  const span = (br, v) => { const [x, z] = R(uOn(br, v), v); return route.span(route.cellAt(x, z)); };
  let n = 0;
  for (let vb = -28; vb <= 28; vb += 2) for (let vf = -26; vf <= 26; vf += 2) {
    const obs = {};
    for (const k of span(BRIDGE, vb)) obs[k] = { type: 'block' };
    for (const k of span(FOOT, vf)) obs[k] = { type: 'block' };
    // banvallen (dag 5) når gångbron genom trappan från norra perrongen, söder om LINK (v -9,4)
    const north = vf > -8 ? ['s4', 's4n', 's5'] : ['s4', 's4n'];
    for (const pa of route.paths(north, obs)) { assert.ok(pa.through != null, `${pa.id} förbi spärrarna (vägbron ${vb}, gångbron ${vf})`); n++; }
  }
  assert.ok(n > 1500, `${n} fall`);
});

test('broarna: en lucka i spärren märks, och raden säger gatan horden tar', () => {
  // bara gångbron spärrad, en ruta slås sönder: resten av spärren märks genombruten
  const day = { n: 1, startCash: 0, waves: [{ groups: [{ type: 'brute', count: 6, interval: 0.3, delay: 0, spawn: 's4' }] }] };
  const sim = createSim({ map: { ...molnbo, baseHp: 999, days: [day] }, day: 1, cash: 1000 });
  for (const br of [BRIDGE, FOOT]) { const [x, z] = R(uOn(br, 0), 0); assert.ok(placeAcross(sim, route.cellAt(x, z), 'block').ok); }
  startWave(sim);
  let broken = null;
  while (!broken && sim.time < 400) { step(sim, 0.1); broken = sim.events.find(e => e.t === 'obstacleBroken'); }
  assert.ok(broken, 'en ruta gick sönder');
  const rest = Object.values(sim.obstacles).filter(o => o.line === broken.line);
  assert.ok(rest.length >= 1 && rest.every(o => o.breached), 'resten av spärren är genombruten');
  assert.ok(Object.values(sim.obstacles).filter(o => o.line !== broken.line).every(o => !o.breached), 'den andra spärren står');
  const c = route.cellCenter(broken.cell);
  assert.match(streetAt(molnbo, c.x, c.z), /^(Gångbron|Väg 57)$/);
  // Stenbyvägen spärrad vid Missionshuset: horden från Gnestavägen tar Kvarnvägen, och raden säger det
  const before = route.paths(['s1'])[0].cells, obs = {};
  { const [x, z] = R(-1.5, 56); for (const k of route.span(route.cellAt(x, z))) obs[k] = { type: 'block' }; }
  const after = route.paths(['s1'], obs)[0].cells;
  assert.equal(rerouteStreet(molnbo, k => g.center(k), before, after), 'Kvarnvägen');
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

// 0.17.2 (H301, Olas speltest av 0.17.1): prickskytt i missionskyrkans klocktorn och på de höga husen (hyreshusen,
// Folkets hus, stationshuset). Tornen är perch 3 (TOWER i spöket), taken perch 1 (ROOF); höjden ger sikten.
test('prickskyttelägen: klocktornet och de höga husen, och tornets höjd ser längre än marken', () => {
  const sim = createSim({ map: { ...molnbo, days: [{ n: 1, startCash: 99999, waves: [{ groups: [] }] }] }, day: 1, cash: 99999, research: ['psg90.1'] });
  const ids = SHAPES.map(s => s.id), cells = id => { const out = []; for (let k = 0; k < p.w * p.h; k++) if (p.perch[k] && p.bldg[k] === ids.indexOf(id) + 1) out.push(k); return out; };
  const tower = cells('mission');
  assert.ok(tower.length >= 1 && tower.every(k => p.perch[k] === 3 && p.roof[k] >= 10), `klocktornet: ${tower.map(k => [p.perch[k], p.roof[k]])}`);
  for (const t of TOWERS) assert.ok(cells(t.id).every(k => p.perch[k] === 3), t.id);
  for (const id of ['apt1', 'apt2', 'folkets', 'station']) assert.ok(cells(id).length >= 4 && cells(id).every(k => p.perch[k] === 1), id);
  const k = tower[0];
  assert.equal(build(sim, k, 'psg90').ok, true, 'Psg 90 i klocktornet');
  const gun = sim.guns.at(-1);
  assert.ok(gun.roof && gun.y >= 10, `står ${gun.y} m upp`);
  // samma pjäs på marken bredvid kyrkan ser mindre av gatorna
  const sim2 = createSim({ map: { ...molnbo, days: [{ n: 1, startCash: 99999, waves: [{ groups: [] }] }] }, day: 1, cash: 99999, research: ['psg90.1'] });
  const c = p.center(k);
  let ground = -1;
  for (let r = 6; r < 16 && ground < 0; r += 2) for (let a = 0; a < 16 && ground < 0; a++) {
    const q = p.keyAt(c.x + Math.cos(a * Math.PI / 8) * r, c.z + Math.sin(a * Math.PI / 8) * r);
    if (q >= 0 && p.kind[q] === KIND.open && build(sim2, q, 'psg90').ok) ground = q;
  }
  assert.ok(ground >= 0, 'en markplats nära kyrkan');
  const seen = s => s.guns.at(-1).fullSight?.keys.length ?? s.guns.at(-1).sight.keys.length;
  assert.ok(seen(sim) > seen(sim2) * 1.3, `tornet ser ${seen(sim)} rutor, marken ${seen(sim2)}`);
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

// 0.17.1 (efter speltestet av 0.17.0): dag 5 inom 3 försök (var 4), och dag 1 till 3 inom 2.
test('balans: kartläsaren vinner dag 1 till 3 inom 2 försök, dag 4 inom 2 och dag 5 inom 3', () => {
  for (const [i, r] of smart.entries()) {
    const a = mbAttempts(r.log);
    assert.equal(r.stuck, null, `seed ${i}: ${a}`);
    for (let d = 0; d < 3; d++) assert.ok(a[d] <= 2, `seed ${i} dag ${d + 1}: ${a}`);
    assert.ok(a[3] <= 2, `seed ${i} dag 4: ${a}`);
    assert.ok(a[4] <= 3, `seed ${i} dag 5: ${a}`);
  }
  // 0.17.2 (H301): med tornen och de höga husen vinner kartläsaren på första försöket, men dag 4 (bron) kostar basen
  // (MB05, H295: dag 4 och 5 var knivseggar, Ola förlorade dag 4; dag 4 hp 31 till 36, docs/balance-log.md 0.17.2)
  for (const [i, r] of smart.entries()) {
    const d4 = r.log.filter(x => x.mapId === 'molnbo' && x.day === 4 && x.won)[0];
    assert.ok(d4 && d4.baseHp <= 12, `seed ${i}: dag 4 bas ${d4?.baseHp}`);
  }
});

// 0.17.2 (H301): prickskyttarna i tornen och på de höga husen bär den som inte spärrar genom dag 3; bron dag 4 stoppar
// honom (i minst fyra av fem seeds). Förut: förlorade från dag 3.
test('balans: den som aldrig spärrar förlorar senast på dag 4', () => {
  let stuck = 0;
  for (const [i, r] of naive.entries()) {
    const a = mbAttempts(r.log);
    assert.deepEqual(a.slice(0, 2), [1, 1], `seed ${i}`);
    if (r.stuck && r.stuck.day <= 4) stuck++;
  }
  assert.ok(stuck >= 4, `${stuck} av 5 fastnar`);
});

test('balans: högst cirka 250 levande zombier samtidigt', () => {
  const peak = Math.max(...[...smart, ...naive].flatMap(r => r.log.map(x => x.peak)));
  assert.ok(peak <= 250, `${peak}`);
});

// 0.17.1 (speltestet av 0.17.0 hoppade dit med truppen på nivå 1): hoppet till Mölnbo ger balansens ankomst.
test('hoppet till Mölnbo (?debug&jump) har truppen och forskningen balansen räknar med', () => {
  const a = molnboArrival(0);
  assert.deepEqual(ARRIVAL_TROOP.molnbo.units, a.op.units.map(u => [u.type, u.level, u.men ?? null, u.wins ?? 0]), 'kör om balansen och skriv in truppen i src/data/arrival.js');
  assert.deepEqual(ARRIVAL_TROOP.molnbo.research, a.research);
  const p = debugReach(newCampaign(), 'molnbo', 1);
  assert.deepEqual(unitsIn(p, 'molnbo').map(u => [u.type, u.level]), ARRIVAL_TROOP.molnbo.units.map(([t, l]) => [t, l]));
  assert.ok(ARRIVAL_TROOP.molnbo.research.every(id => p.research.includes(id)));
});

// Kvittot per dag. Ett ändrat steg ska vara avsiktligt och förklarat i docs/balance-log.md (Mölnbo).
// 0.17.0-molnbo: första kvittot.
// 0.17.0 (sammanslagen med 0.16.4): alla steg nya, avsiktligt. Löparnas snubbel och 0.16.4:s ändringar i simuleringen
// flyttar varje dag; dag 3 till 5 omtrimmade (docs/balance-log.md, Mölnbo 0.17.0).
// 0.17.1 (speltestet av 0.17.0): alla dagar nya, avsiktligt. Dag 1 jämnare vågor och ingen överlapp dag 1 och 2,
// trapptornen 7,2 m, ingen enhet under broarna, dag 5 hp 16 till 15 (docs/balance-log.md, Mölnbo 0.17.1).
// 0.17.2: alla dagar nya, avsiktligt. Prickskyttarna i tornen, på hyreshusen, Folkets hus gavel och stationen (H301),
// husen och bilarna av vägarna (H307), trädgårdarnas bodar (H308), dag 4 hp 31 till 36 (docs/balance-log.md 0.17.2).
// 0.18.0: alla dagar nya, avsiktligt (skiva 1): ankomsten från Hagstumosse med sanity, korseld och trötthet, routed och
// Fall back från dag 1, de pansrade dag 2, kryparna dag 2 till 5, husen, Håll eld dag 4 och överrända pjäser dag 5;
// kartläsaren vilar de utmattade, ställer Ksp 88 på Strongest, bemannar tysta pjäser och ställer en grupp i ett hus.
// Dag 4 hp 36 till 34 och färre vandrare i dag 4:s och 5:s sista vågor (toppen under 250). docs/balance-log.md 0.18.0.
const pr = rs => mbPrints([].concat(...rs.map((r, i) => r.log.map(x => ({ ...x, seed: i })))));
test('balans: fingeravtrycket per dag (mbSmart och naive)', () => {
  assert.deepEqual(pr(smart), { 'molnbo 1': '56c5cd8e', 'molnbo 2': 'e2543d9b', 'molnbo 3': 'f7cf1b9c', 'molnbo 4': '13dece00', 'molnbo 5': '71682133' });
  assert.deepEqual(pr(naive), { 'molnbo 1': 'b67298aa', 'molnbo 2': '595148d1', 'molnbo 3': '60aeead0', 'molnbo 4': 'f27ce50b', 'molnbo 5': '741638a5' });
});
