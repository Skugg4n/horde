// Mölnbo: kartan, bron som enda passagen, perrongen, prickskyttelägena, tåget som skydd, kampanjens krok och balansen.
// docs/superpowers/specs/2026-10-17-molnbo-design.md, docs/superpowers/specs/2026-10-18-molnbo-build-notes.md och
// docs/balance-log.md (Mölnbo). 0.20.0 (H494, H495): kartan efter Olas satellitbild, en bro, och tre dagar efter
// kampanjbågen (kampanjplanen avsnitt 10): håll bron medan norra sidan evakueras, norra sidan faller, uttåget.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { molnbo, R, toRail, groundY, deckY, underDeck, DECK_H, RAIL, STAIRS, X60, BRIDGE, SHAPES, LINK, NORTH_SIDE } from '../src/data/molnbo.js';
import { distPolyline } from '../src/data/gnesta.js';
import { inPoly } from '../src/data/gnesta.js';
import { liftedHit } from '../src/render/lift.js';
import { reasonText } from '../src/ui/panels.js';
import { placeAcross, checkSpot, checkObstacle, removeObstacle, createSim, startWave, step, build } from '../src/sim/sim.js';
import { routeFor } from '../src/sim/route.js';
import { placementFor, KIND } from '../src/sim/placement.js';
import { crewPassable } from '../src/sim/crew-path.js';
import { rerouteStreet, streetAt } from '../src/sim/streets.js';
import { newCampaign, debugReach, unitsIn, finishDay, sectorStatus } from '../src/meta/operation.js';
import { mapUnlocked, mapState } from '../src/meta/progress.js';
import { loadProgress } from '../src/meta/save.js';
import { molnboCampaign, mbAttempts, mbPrints, molnboArrival, molnboDayTroop } from '../scripts/balance.mjs';
import { ARRIVAL_TROOP } from '../src/data/arrival.js';

const route = routeFor(molnbo), g = route.grid, p = placementFor(molnbo);
const keyAtRail = (u, v) => { const [x, z] = R(u, v); return g.keyAt(x, z); };
const uOn = v => BRIDGE.a[0] + (BRIDGE.a[1] - v) * (BRIDGE.b[0] - BRIDGE.a[0]) / (BRIDGE.a[1] - BRIDGE.b[1]);
const NORTH = ['s1', 's3', 's5', 's6'];
const bareDay = (o = {}) => ({ n: 1, startCash: 99999, waves: [{ groups: [] }], ...o });

// 0.20.1 (speltestet av 0.20.0): dag 1 säger var man ska stå, kameran börjar på rätt ställe och basen har ett namn
test('dag 1 säger var man ska stå, kameran börjar vid bron och basen, och Folkets hus har en etikett', () => {
  const [d1, d2, d3] = molnbo.days;
  assert.match(d1.intro.text, /Cover the north side/);
  assert.match(d1.intro.text, /cross the bridge behind you/);
  assert.equal(molnbo.baseLabel, 'Folkets hus · Base');
  // dag 1: norra sidan; dag 2 och 3: bron och basen (Folkets hus entré) i bild
  assert.ok(d1.view?.view > 0 && toRail(d1.view.x, d1.view.z)[1] < RAIL.corridor[0]);
  for (const d of [d2, d3]) {
    assert.ok(d.view.pts.some(([x, z]) => Math.hypot(x - molnbo.folkets.entrance[0], z - molnbo.folkets.entrance[1]) < 1), `dag ${d.n}: basen`);
    assert.ok(d.view.pts.some(([x, z]) => Math.abs(toRail(x, z)[1]) < 40 && groundY(x, z) > 0), `dag ${d.n}: bron`);
  }
  // de första husen ligger närmast bron
  const dist = id => { const h = molnbo.buildings.find(b => b.id === id); return Math.hypot(h.u - BRIDGE.b[0], h.v - BRIDGE.b[1]); };
  const first = d1.evac.groups.filter(q => q.wave === 0).map(q => dist(q.house)), last = d1.evac.groups.filter(q => q.wave === 2).map(q => dist(q.house));
  assert.ok(Math.max(...first) < Math.min(...last), `${first} mot ${last}`);
});

// 0.21.3 (H538): dag 2 kommer bara från Järnasidan; andra fronten söder om spåret är ett hus vid Trollvägen
test('dag 2: bara från Järna (väg 57, Norrängsvägen, längs spåret österifrån), och ett hus vid Trollvägen', () => {
  const d2 = molnbo.days[1];
  assert.deepEqual([...new Set(d2.waves.flatMap(w => w.groups.map(q => q.spawn)))].sort(), ['s1', 's2', 's3']);
  assert.equal(d2.intro.text, 'From Järna, both sides of the tracks.');
  const h = molnbo.buildings.find(b => b.id === d2.dormant[0].house);
  assert.ok(h.road === 'troll' && h.v > RAIL.corridor[1], 'huset vid Trollvägen');
});

test('Mölnbo är en bana efter Hagstumosse, med tre dagar efter kampanjbågen och korta intron', () => {
  assert.equal(MAPS.molnbo, molnbo);
  assert.equal(molnbo.days.length, 3);
  // 0.22.0 (H539): Vikingavägen är en dag
  assert.deepEqual(molnbo.unlock, { map: 'gnesta-norr', day: 1 });
  for (const d of molnbo.days) {
    assert.match(d.intro.title, /^Day \d: /);
    // H443: högst tolv ord, på engelska, och de säger varifrån horden kommer (Järna)
    assert.ok(d.intro.text.split(/\s+/).length <= 12, d.intro.text);
    assert.match(d.intro.text, /Järna/);
    assert.doesNotMatch(JSON.stringify(d), /\u2014/);
  }
  const [d1, d2, d3] = molnbo.days;
  // dag 1: evakueringen av norra sidan, vinst först när också vågorna är hållna
  assert.ok(d1.evac?.all && d1.evac.need > 0 && d1.evac.safeZone);
  // dag 2: pendeltåget rullar in
  assert.ok(d2.arrival && !d2.train && !d2.hold);
  // dag 3: norra sidan förlorad, hållklockan och uttåget
  assert.ok(d3.lost?.poly && d3.hold?.at > 0 && d3.hold.exodus);
  assert.ok(molnbo.days.every(d => !d.train), 'inget tåg som går');
});

test('kartan: väg 57 från Järna i nordost över bron mot Gnesta i sydväst, och landmärkena där de ligger', () => {
  const road = id => molnbo.roads.find(r => r.id === id);
  for (const id of ['v57', 'v57n', 'gnestavagen', 'stenby', 'troll', 'kvarn', 'fagernas', 'backv', 'norrang', 'skogstorp', 'station', 'mjolnar']) assert.ok(road(id), id);
  // väg 57: norra delen går mot nordost (x växer, z minskar), Gnestavägen mot sydväst
  const n = road('v57n').ptsRaw, w = road('gnestavagen').ptsRaw;
  assert.ok(n.at(-1)[0] > n[0][0] && n.at(-1)[1] < n[0][1] - 50, 'väg 57 mot nordost');
  assert.ok(w.at(-1)[0] < w[0][0] - 100 && w.at(-1)[1] > w[0][1], 'Gnestavägen mot sydväst');
  // norra sidan: Backvägen, Norrängsvägen, Skogstorpsvägen och parkeringen ligger norr om spåret
  for (const id of ['backv', 'norrang', 'skogstorp', 'station']) assert.ok(road(id).rail.every(([, v]) => v < RAIL.corridor[0]), id);
  assert.ok(RS(molnbo.areas.parking).every(([, v]) => v < RAIL.corridor[0]), 'parkeringen');
  // södra sidan: Stenbyvägen, Trollvägen, Kvarnvägen, Fagernäsvägen och Mjölnarstigen
  for (const id of ['stenby', 'troll', 'kvarn', 'fagernas', 'mjolnar']) assert.ok(road(id).rail.every(([, v]) => v > RAIL.corridor[1]), id);
  const at = id => { const h = molnbo.buildings.find(b => b.id === id); return [h.u, h.v]; };
  // caféet vid brofästet, öster om Stenbyvägen; missionskyrkan söder om Trollvägen; stationshuset vid spåret i öster
  assert.ok(Math.hypot(at('cafe')[0] - BRIDGE.a[0], at('cafe')[1] - BRIDGE.a[1]) < 25, 'caféet vid brofästet');
  assert.ok(at('mission')[1] > 60 && at('mission')[0] > -9, 'missionskyrkan');
  assert.ok(at('station')[0] > 60 && at('station')[1] > RAIL.corridor[1] && at('station')[1] < 30, 'stationshuset');
  // Folkets hus vid Kvarnvägen, radhusen vid Mjölnarstigen i sydväst, kvarnen längre söderut
  const F = molnbo.folkets;
  assert.ok(Math.min(...road('kvarn').rail.map(([u, v]) => Math.hypot(u - F.u, v - F.v))) < 30, 'Folkets hus vid Kvarnvägen');
  const rows = molnbo.buildings.filter(b => b.kind === 'chain');
  assert.ok(rows.length >= 4 && rows.every(b => b.u < -20 && b.v > 90), 'radhusen vid Mjölnarstigen');
  assert.ok(at('kvarn')[1] > F.v + 15, 'kvarnen söder om Folkets hus');
});
function RS(poly) { return poly.map(([x, z]) => toRail(x, z)); }

// 0.21.3 (H532, Olas karta 2026-10-20): vägnätet på södra sidan
test('södra sidan: Fagernäsvägens båge, Trollvägen som slinga, Dvärgvägen emellan, Kvarnvägen hela vägen', () => {
  const road = id => molnbo.roads.find(r => r.id === id);
  const touch = (a, b, d = 4) => road(a).pts.some(([x, z]) => distPolyline(x, z, road(b).pts) < d);
  // Fagernäsvägen går österut längs spåret och viker sedan söderut i en båge
  const fr = road('fagernas').rail;
  assert.ok(Math.max(...fr.map(([u]) => u)) > 100 && fr.at(-1)[1] > 150, 'bågen söderut');
  // den möter inte Trollvägen; Dvärgvägen binder ihop dem
  assert.ok(!touch('fagernas', 'troll', 6), 'Fagernäsvägen rör inte Trollvägen');
  assert.ok(touch('dvarg', 'troll') && touch('dvarg', 'fagernas'), 'Dvärgvägen');
  // Kvarnvägen från Trollvägen förbi Folkets hus, över Stenbyvägen, till Mjölnarstigen
  assert.ok(touch('kvarn', 'troll') && touch('kvarn', 'stenby') && touch('kvarn', 'mjolnar'), 'Kvarnvägen');
  for (const id of ['myr', 'skull', 'kvse', 'fagost', 'trollspur']) assert.ok(road(id), id);
  // stationshuset: öster om bron, mellan spåret och Fagernäsvägen (Redmond Muay Thai)
  const st = molnbo.buildings.find(b => b.id === 'station');
  assert.ok(st.u > uOn(st.v) + 20 && st.v > RAIL.corridor[1] && st.v < 28, `stationshuset ${st.u} ${st.v}`);
  // caféet i hörnet Fagernäsvägen/Stenbyvägen, rött villahus med veranda väster om Stenbyvägen vid väg 57
  const cafe = molnbo.buildings.find(b => b.id === 'cafe'), rv = molnbo.buildings.find(b => b.id === 'redvilla');
  assert.ok(cafe.u > -8 && cafe.v < 50, 'caféet');
  assert.ok(rv && rv.facade === 'red' && rv.veranda && rv.u < -12 && rv.v < 55, 'röda villan');
});

// 0.21.3 (H540, Ola: "för få vägar att leda horden genom"): gång- och cykelvägar och stigar som horden och flödet går på
test('gångvägarna: smala grusstigar i rutnätet, och en spärr ger en annan väg', () => {
  const paths = molnbo.roads.filter(r => r.path);
  assert.deepEqual(paths.map(r => r.id).sort(), ['banstig', 'gangA', 'gangB', 'gangC', 'gangD']);
  for (const r of paths) {
    assert.ok(r.walk && r.surface === 'gravel' && r.width < 3, r.id);
    const [x, z] = r.pts[Math.floor(r.pts.length / 2)];
    assert.ok(g.walkable(g.keyAt(x, z)), `${r.id} i rutnätet`);
  }
  const sim = createSim({ map: molnbo, day: 2, cash: 0 });
  const rt = sim.route, blockAt = pts => { const o = {}; for (const [u, v] of pts) { const [x, z] = R(u, v); for (const k of rt.span(rt.cellAt(x, z))) o[k] = { type: 'block' }; } return o; };
  const open = rt.paths(['s1'])[0], usesStenby = cells => cells.some(k => { const [u, v] = toRail(...g.center(k)); return v > 66 && v < 110 && Math.abs(u + 9.5) < 2; });
  assert.ok(usesStenby(open.cells), 'öppet går horden Stenbyvägen förbi kyrkan');
  // spärrad vid kyrkan: horden tar Trollvägen (lika lång i verkligheten, en annan gata)
  const church = rt.paths(['s1'], blockAt([[-9, 66]]))[0];
  assert.ok(church.reaches && church.through == null && !usesStenby(church.cells), 'runt via Trollvägen');
  assert.ok(church.cells.length >= open.cells.length, `${church.cells.length} mot ${open.cells.length}`);
  // spärrad vid caféet (norr om Trollvägen): en riktig omväg, Fagernäsvägen och stigen till Trollvägen, minst 30 rutor
  const cafe = rt.paths(['s1'], blockAt([[-9.5, 47]]))[0];
  assert.ok(cafe.reaches && cafe.through == null && cafe.cells.length >= open.cells.length + 30, `${cafe.cells.length} mot ${open.cells.length}`);
});

// 0.21.3 (H541): bergskärningen är en låg vägg norr om Fagernäsvägen (mot spåret), skymmer ingen sikt från trädgårdarna
test('bergskärningen: norr om Fagernäsvägen, låg, och den skymmer inte', () => {
  const rock = molnbo.rock, fag = molnbo.roads.find(r => r.id === 'fagernas').rail;
  assert.ok(rock.segs.length >= 1 && rock.h <= 1.5);
  for (const [u0, u1] of rock.segs) {
    const um = (u0 + u1) / 2, roadV = fag.reduce((best, [u, v]) => (Math.abs(u - um) < Math.abs(best[0] - um) ? [u, v] : best))[1];
    assert.ok(rock.v < roadV - 2 && rock.v > RAIL.corridor[1], `vid u ${um}: vägen ${roadV}, berget ${rock.v}`);
  }
  assert.ok(!SHAPES.some(b => b.kind === 'rock'), 'ingen byggnad i placeringen (skymmer inte)');
  const [x, z] = R((rock.segs[0][0] + rock.segs[0][1]) / 2, rock.v), k = p.keyAt(x, z);
  assert.notEqual(p.kind[k], KIND.open, 'går inte att ställa något på');
  assert.equal(p.height[k], 0, 'ingen höjd som skymmer');
});

test('EN väg över spåret: bron. Varje ingång når Folkets hus, och järnvägen är stängd utom bron och perrongen', () => {
  for (const pa of route.paths(molnbo.spawns.map(s => s.id))) assert.ok(pa.reaches, pa.id);
  // spåren och södra perrongen är stängda för horden
  for (const v of RAIL.tracks) for (const u of [-60, -30, 40, 80]) assert.equal(g.walkable(keyAtRail(u, v)), false, `spår ${u} ${v}`);
  assert.equal(g.walkable(keyAtRail(-50, 8.2)), false, 'södra perrongen');
  assert.equal(g.walkable(keyAtRail(-50, -10.5)), true, 'norra perrongen');
  for (const v of [-6, 0, 6]) assert.equal(g.walkable(keyAtRail(uOn(v), v)), true, `bron vid ${v}`);
  // varje gångbar ruta i spårets mitt ligger på bron: ingen annan passage
  let mid = 0;
  for (let k = 0; k < g.n; k++) {
    if (!g.walkable(k)) continue;
    const [u, v] = toRail(...g.center(k));
    if (v < -7 || v > RAIL.corridor[1]) continue;
    mid++;
    assert.ok(Math.abs(u - uOn(v)) <= BRIDGE.width / 2 + 1.5, `passage vid ${u.toFixed(0)}, ${v.toFixed(0)}`);
  }
  assert.ok(mid > 20, `${mid} rutor på bron`);
});

test('bron: med vägbron spärrad, var på däcket som helst, finns ingen väg från norr runt spärren', () => {
  let n = 0;
  for (let v = -28; v <= 28; v += 2) {
    const obs = {}, [x, z] = R(uOn(v), v);
    for (const k of route.span(route.cellAt(x, z))) obs[k] = { type: 'block' };
    for (const pa of route.paths(NORTH, obs)) { assert.ok(pa.through != null, `${pa.id} förbi spärren vid ${v}`); n++; }
    // pendeltågets folk (perrongen, trappan upp på däcket) möter samma spärr när den ligger söder om trappan
    if (v > LINK.v + 2) {
      const door = route.nearestCell(...molnbo.inbound.doors[0]);
      assert.ok(route.pathFrom(door).length > 0);
    }
  }
  assert.ok(n >= 100, `${n} fall`);
  // trappan från norra perrongen går upp på vägbrons däck (dit pendeltågets folk går)
  assert.ok(Math.abs(LINK.u1 - (uOn(LINK.v) - BRIDGE.width / 2)) < 1.5, 'trappan når vägbron');
});

test('höjden i bilden: däcket, ramperna, trappan och perrongen', () => {
  assert.equal(groundY(...R(uOn(0), 0)), DECK_H);
  assert.equal(groundY(...R(BRIDGE.a[0], BRIDGE.a[1] + 2)), 0, 'korsningen vid caféet');
  const mid = groundY(...R(uOn(22), 22));
  assert.ok(mid > 0.5 && mid < DECK_H - 0.5, `rampen ${mid}`);
  assert.equal(groundY(...R(-50, -10.5)), RAIL.platformN.h);
  assert.ok(groundY(...R(LINK.u1 - 1, LINK.v)) > DECK_H - 0.6, 'trappans topp vid däcket');
});

// 0.17.1 (speltestet av 0.17.0: spärrarna på bron syntes inte, och en Psg 90 hamnade under gångbron)
test('bron: spärren ligger på däcket, och ingen enhet kan stå under det', () => {
  const sim = createSim({ map: { ...molnbo, days: [bareDay()] }, day: 1, cash: 99999, research: ['psg90.1'] });
  const [x, z] = R(uOn(0), 0);
  const r = placeAcross(sim, route.cellAt(x, z), 'block');
  assert.ok(r.ok, JSON.stringify(r));
  for (const k of r.cells) assert.equal(groundY(...g.center(k)), DECK_H, `ruta ${k} på däcket`);
  // pekaren mot däcket uppifrån som kameran: punkten ligger på däcket, inte på marken bakom
  const dir = [-40, -46, -40], L = Math.hypot(...dir);
  const ray = { origin: { x: x + 40, y: DECK_H + 46, z: z + 40 }, direction: { x: dir[0] / L, y: dir[1] / L, z: dir[2] / L } };
  const hit = liftedHit(ray, molnbo.groundY);
  assert.ok(Math.hypot(hit.x - x, hit.z - z) < 0.5, `träffen ${hit.x} ${hit.z}`);
  // under däcket: inga öppna rutor, skälet "Under the bridge", men soldaterna kan gå där
  let under = 0;
  for (let k = 0; k < p.n; k++) {
    const c = p.center(k);
    if (p.walk[k] || !underDeck(c.x, c.z)) continue;
    under++;
    assert.notEqual(p.kind[k], KIND.open, `ruta ${k} under bron är öppen`);
    assert.ok(crewPassable(p, k) || p.kind[k] === KIND.house, `ruta ${k}`);
  }
  assert.ok(under > 20, `${under} rutor under bron`);
  let k0 = -1;
  for (let k = 0; k < p.n && k0 < 0; k++) { const c = p.center(k), [, v] = toRail(c.x, c.z); if (Math.abs(v) > RAIL.corridor[1] + 1 && !p.walk[k] && deckY(c.x, c.z) > 2) k0 = k; }
  assert.ok(k0 >= 0, 'en ruta under bron utanför järnvägen');
  assert.deepEqual(checkSpot(sim, k0, 'psg90'), { ok: false, reason: 'bro' });
  assert.equal(reasonText('bro'), 'Under the bridge');
  // och spärren går att riva med halva priset tillbaka, som på de andra banorna
  const cash = sim.cash, rm = removeObstacle(sim, route.cellAt(x, z));
  assert.ok(rm.ok && rm.refund === 75 && sim.cash === cash + 75, JSON.stringify(rm));
});

test('bron: en lucka i spärren märks, och raden säger gatan horden tar', () => {
  const day = { n: 1, startCash: 0, waves: [{ groups: [{ type: 'brute', count: 6, interval: 0.3, delay: 0, spawn: 's3' }] }] };
  const sim = createSim({ map: { ...molnbo, baseHp: 999, days: [day] }, day: 1, cash: 1000 });
  { const [x, z] = R(uOn(0), 0); assert.ok(placeAcross(sim, route.cellAt(x, z), 'block').ok); }
  startWave(sim);
  let broken = null;
  while (!broken && sim.time < 400) { step(sim, 0.1); broken = sim.events.find(e => e.t === 'obstacleBroken'); }
  assert.ok(broken, 'en ruta gick sönder');
  const rest = Object.values(sim.obstacles).filter(o => o.line === broken.line);
  assert.ok(rest.length >= 1 && rest.every(o => o.breached), 'resten av spärren är genombruten');
  const c = route.cellCenter(broken.cell);
  assert.equal(streetAt(molnbo, c.x, c.z), 'Väg 57');
  // Stenbyvägen spärrad vid Missionskyrkan: horden från bron tar Trollvägen, och raden säger det
  const before = route.paths(['s1'])[0].cells, obs = {};
  { const [x, z] = R(-9, 66); for (const k of route.span(route.cellAt(x, z))) obs[k] = { type: 'block' }; }
  const after = route.paths(['s1'], obs)[0].cells;
  assert.equal(after.length > 0 && route.paths(['s1'], obs)[0].through, null, 'en öppen väg runt');
  assert.match(rerouteStreet(molnbo, k => g.center(k), before, after) ?? '', /Trollvägen|Kvarnvägen/);
});

// 0.21.3 (H532, Olas foton): inga trapptorn; trappans vilplan vid brons västra kant söder om spåret är prickskyttens läge
test('prickskyttelägen: trappans vilplan vid vägbron, stationstaket och tågtaket. Gruppen har skydd bakom tåget', () => {
  const sim = createSim({ map: { ...molnbo, days: [bareDay()] }, day: 1, cash: 99999, research: ['psg90.1'] });
  {
    const k = keyAtRail((STAIRS.u0 + STAIRS.u1) / 2, (STAIRS.v0 + STAIRS.v1) / 2);
    assert.ok(p.perch[k] && p.roof[k] >= DECK_H - 0.05, `vilplanet ${p.perch[k]} ${p.roof[k]}`);
    assert.equal(build(sim, k, 'psg90').ok, true, 'Psg 90 på vilplanet');
    // vid vägbrons västra kant, söder om spåren, över perrongen
    assert.ok(Math.abs(STAIRS.u1 - (uOn(STAIRS.v1) - BRIDGE.width / 2)) < 1, 'vid bron');
    assert.ok(STAIRS.v0 > RAIL.tracks[2] && STAIRS.v1 <= RAIL.corridor[1], 'söder om spåren');
    assert.equal(molnbo.towers, undefined, 'inga trapptorn');
  }
  assert.ok(p.perch[keyAtRail(-51, X60.v)] && p.roof[keyAtRail(-51, X60.v)] > 3.5, 'X60-taket');
  const st = molnbo.buildings.find(b => b.id === 'station');
  assert.ok(p.perch[keyAtRail(st.u, st.v)], 'stationstaket');
  assert.equal(p.kind[keyAtRail(-51, X60.v)], KIND.house);
  let brick = 0;
  for (let u = -76; u < -26; u += 2) { const k = keyAtRail(u, 6.8); if (p.brick[k] && p.kind[k] === KIND.open) brick++; }
  assert.ok(brick >= 15, `${brick} rutor bakom tåget`);
});

// 0.17.2 (H301, Olas speltest av 0.17.1): prickskytt i missionskyrkans klocktorn och på de höga husen.
test('prickskyttelägen: klocktornet och de höga husen, och tornets höjd ser längre än marken', () => {
  const sim = createSim({ map: { ...molnbo, days: [bareDay()] }, day: 1, cash: 99999, research: ['psg90.1'] });
  const ids = SHAPES.map(s => s.id), cells = id => { const out = []; for (let k = 0; k < p.w * p.h; k++) if (p.perch[k] && p.bldg[k] === ids.indexOf(id) + 1) out.push(k); return out; };
  const tower = cells('mission');
  assert.ok(tower.length >= 1 && tower.every(k => p.perch[k] === 3 && p.roof[k] >= 10), `klocktornet: ${tower.map(k => [p.perch[k], p.roof[k]])}`);
  assert.ok(cells('stairs').length >= 1 && cells('stairs').every(k => p.perch[k] === 1), 'trappans vilplan');
  for (const id of ['apt1', 'folkets', 'station']) assert.ok(cells(id).length >= 4 && cells(id).every(k => p.perch[k] === 1), id);
  const k = tower[0];
  assert.equal(build(sim, k, 'psg90').ok, true, 'Psg 90 i klocktornet');
  const gun = sim.guns.at(-1);
  assert.ok(gun.roof && gun.y >= 10, `står ${gun.y} m upp`);
  const sim2 = createSim({ map: { ...molnbo, days: [bareDay()] }, day: 1, cash: 99999, research: ['psg90.1'] });
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

test('tågklockan (motorn kvar): dagen vinns när tåget går, också med zombier kvar, och väntar när vågorna är klara', () => {
  const day = { n: 1, startCash: 0, train: { at: 30 }, waves: [{ groups: [{ type: 'walker', count: 30, interval: 0.5, delay: 0, spawn: 's1' }] }] };
  const sim = createSim({ map: { ...molnbo, baseHp: 999, days: [day] }, day: 1, cash: 0 });
  startWave(sim);
  let gone = null;
  while (sim.phase !== 'won' && sim.time < 60) { step(sim, 0.1); if (sim.events.some(e => e.t === 'trainGone')) gone = sim.time; }
  assert.equal(sim.phase, 'won');
  assert.ok(Math.abs(gone - 30) < 0.15, `tåget gick ${gone}`);
  assert.ok(sim.zombies.some(z => !z.dead), 'zombier kvar när tåget gick');
});

// 0.20.0 (H495, dag 1): de civila på norra sidan går över bron i grupper; i säkerhet när de är över (safeZone).
test('dag 1: de civila är i säkerhet över bron, och dagen vinns först när också vågorna är hållna', () => {
  const d1 = molnbo.days[0];
  // husen ligger på norra sidan och deras väg går över bron
  for (const q of d1.evac.groups) {
    const h = molnbo.buildings.find(b => b.id === q.house);
    assert.ok(h && h.v < RAIL.corridor[0], q.house);
  }
  // en enda grupp, inga zombier att tala om: de går över bron och är i säkerhet söder om den, långt före basen
  const ev = { need: 2, all: true, safeZone: d1.evac.safeZone, groups: [{ house: d1.evac.groups[0].house, count: 2, at: 0, wave: 0 }] };
  const day = { n: 1, startCash: 0, evac: ev, waves: [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0, spawn: 's4' }] }, { groups: [{ type: 'walker', count: 1, interval: 1, delay: 0, spawn: 's4' }] }] };
  const sim = createSim({ map: { ...molnbo, baseHp: 999, days: [day] }, day: 1, cash: 0 });
  startWave(sim);
  let safeAt = null;
  while (sim.phase !== 'won' && sim.time < 400) {
    step(sim, 0.1);
    for (const e of sim.events) if (e.t === 'civilianSafe') { const c = sim.civilians.find(q => q.id === e.id); safeAt = toRail(c.x, c.z); }
    // de civila är framme men vågorna är inte hållna: dagen går vidare
    if (sim.evac.safe === 2 && sim.waveIndex < 2) assert.notEqual(sim.phase, 'won', 'vinner inte före vågorna');
    if (sim.phase === 'build' && sim.nextWaveIn != null) sim.nextWaveIn = Math.min(sim.nextWaveIn, 1);
    for (const z of sim.zombies) if (!z.dead && sim.time > 40) z.dead = true;
  }
  assert.equal(sim.phase, 'won');
  assert.equal(sim.evac.safe, 2);
  assert.ok(safeAt && safeAt[1] > BRIDGE.ramp && safeAt[1] < 50, `i säkerhet vid ${safeAt}`);
});

// 0.20.0 (H495, dag 3): norra sidan är förlorad, ingen placering där. Dag 1 och 2 går det.
test('dag 3: norra sidan är förlorad, ingen enhet och ingen spärr där', () => {
  const north = [-20, -50], key = keyAtRail(...north);
  assert.ok(inPoly(...R(...north), NORTH_SIDE));
  const s3 = createSim({ map: molnbo, day: 3, cash: 99999 });
  let open = -1;
  for (let k = 0; k < p.n && open < 0; k++) { const c = p.center(k); if (p.kind[k] === KIND.open && inPoly(c.x, c.z, NORTH_SIDE) && toRail(c.x, c.z)[1] < -30) open = k; }
  assert.ok(open >= 0);
  assert.deepEqual(checkSpot(s3, open, 'hv'), { ok: false, reason: 'förlorad' });
  assert.equal(reasonText('förlorad'), 'Lost to the horde');
  const [rx, rz] = R(20, -60);
  assert.equal(checkObstacle(s3, route.cellAt(rx, rz), 'block').reason, 'förlorad');
  // bron över spåret går fortfarande att spärra, och söder om spåret går det att ställa ut
  { const [x, z] = R(uOn(0), 0); assert.ok(checkObstacle(s3, route.cellAt(x, z), 'block').ok); }
  const s2 = createSim({ map: molnbo, day: 2, cash: 99999 });
  assert.notEqual(checkSpot(s2, open, 'hv').reason, 'förlorad');
  void key;
});

// 0.20.0 (H495, dag 3): klockan går ut, menyerna tonar, trupperna packar och springer sydväst ut, flodvågen väller in
// från norr, och när den går ut på bron tonar bilden ut och dagen är vunnen. Deterministiskt.
test('dag 3: uttåget. Klockan går ut, trupperna packar, flodvågen når bron, bilden tonar ut och dagen är vunnen', () => {
  const run = () => {
    const d3 = molnbo.days[2], day = { ...d3, hold: { ...d3.hold, at: 40 } };
    const sim = createSim({ map: { ...molnbo, baseHp: 999, days: [day] }, day: 1, cash: 99999, research: ['psg90.1'] });
    // en grupp och en Ksp 90 söder om bron
    for (const [u, v, t] of [[-24, 46, 'hv'], [-2, 60, 'm249']]) {
      const [x, z] = R(u, v);
      let ok = false;
      for (let r = 0; r < 8 && !ok; r++) for (let a = 0; a < 16 && !ok; a++) { const k = p.keyAt(x + Math.cos(a) * r * 2, z + Math.sin(a) * r * 2); ok = checkSpot(sim, k, t).ok && build(sim, k, t).ok; }
      assert.ok(ok, t);
    }
    startWave(sim);
    const log = [];
    let shotsAfter = 0;
    while (sim.phase !== 'won' && sim.phase !== 'lost' && sim.time < 300) {
      step(sim, 1 / 30);
      for (const e of sim.events) if (/^exodus|^won$/.test(e.t)) log.push([e.t, Math.round(sim.time * 10) / 10]);
      if (sim.phase === 'exodus') shotsAfter += sim.events.filter(e => e.t === 'shot').length;
    }
    return { sim, log, shotsAfter };
  };
  const a = run(), b = run();
  assert.equal(a.sim.phase, 'won');
  assert.deepEqual(a.log.map(([t]) => t), ['exodusStart', 'exodusFade', 'exodusDone', 'won']);
  const at = t => a.log.find(x => x[0] === t)[1];
  assert.ok(Math.abs(at('exodusStart') - 40) < 0.1, 'klockan');
  assert.ok(at('exodusFade') > at('exodusStart') + 3, 'flodvågen når bron en stund efter uttåget');
  assert.ok(Math.abs(at('exodusDone') - at('exodusFade') - molnbo.days[2].hold.exodus.fade) < 0.1, 'bilden tonar ut');
  assert.equal(a.shotsAfter, 0, 'ingen skjuter under uttåget');
  // trupperna har packat och är på väg mot utgången i sydväst (Gnestavägen)
  const exit = molnbo.days[2].hold.exodus.exit;
  assert.ok(a.sim.exodus.packed >= 2);
  for (const gun of a.sim.guns) assert.ok(gun.leaving && Math.hypot(gun.x - exit[0], gun.z - exit[1]) < 4, gun.weapon.type);
  // flodvågen kom från norr och gick ut på bron. 0.20.1 (speltestet av 0.20.0: "ett trettiotal som strosar"): 150 till 250
  // under cirka 20 s, och vågornas rester är borta när uttåget börjar (bara flodvågen lever)
  const flood = a.sim.zombies.filter(z => z.flood);
  assert.ok(flood.length >= 150 && flood.length <= 250, `${flood.length} i flodvågen`);
  assert.ok(a.sim.zombies.every(z => z.flood || z.dead), 'bara flodvågen lever');
  assert.ok(at('exodusFade') - at('exodusStart') >= molnbo.days[2].hold.exodus.min - 0.05, 'vågen hinner välla in');
  const spawnedBy = Math.max(...flood.map(z => z.bornAt ?? 0));
  assert.ok(spawnedBy - at('exodusStart') <= 22, `sista ur dimman efter ${(spawnedBy - at('exodusStart')).toFixed(1)} s`);
  assert.ok(flood.some(z => inPoly(z.x, z.z, molnbo.days[2].hold.exodus.trigger)), 'på bron');
  // deterministiskt
  assert.deepEqual(a.log, b.log);
});

test('kampanjen: Mölnbo öppnar efter Vikingavägen (en dag, 0.22.0) och truppen följer med', () => {
  let p0 = debugReach(newCampaign(), 'gnesta-norr', 1);
  assert.equal(mapUnlocked(p0, 'molnbo'), false);
  assert.equal(sectorStatus(p0, 'molnbo'), 'locked');
  const before = p0.op.units.length;
  p0 = finishDay(p0, { mapId: 'gnesta-norr', day: 1, won: true, intelEarned: 10 }).progress;
  assert.equal(mapUnlocked(p0, 'molnbo'), true);
  assert.equal(sectorStatus(p0, 'molnbo'), 'holding');
  // alla enheter står i Mölnbo (Hagstumosse är klar), plus ledningens förstärkning (0.22.0: två Psg 90, två Ksp 58 och infanteriet)
  assert.equal(unitsIn(p0, 'molnbo').length, before + 5);
  assert.ok(p0.op.inbox.some(m => /Järna/.test(m.text) && /Mölnbo is next/.test(m.text)), 'övergången');
  assert.ok(p0.op.inbox.some(m => m.id === 'mb-1'));
  // efter dag 3 är Mölnbo klart (sektorn stängd)
  for (const d of [1, 2, 3]) p0 = finishDay(p0, { mapId: 'molnbo', day: d, won: true, intelEarned: 10, report: { units: [] } }).progress;
  assert.equal(sectorStatus(p0, 'molnbo'), 'held');
});

// 0.20.0 (H495): en sparfil som stod på Mölnbo dag 4 eller 5 räknas som klar med Mölnbo. Sparfilen raderas aldrig.
test('sparfilen: Mölnbo dag 4 och 5 från före 0.20.0 räknas som Mölnbo klart, och kopian behålls', () => {
  let base = debugReach(newCampaign(), 'molnbo', 3);
  for (const day of [4, 5, 6]) {
    const old = { ...base, maps: { ...base.maps, molnbo: { unlockedDay: day, attempts: { 1: 1, 2: 1, 3: 1, 4: 2, ...(day > 4 ? { 5: 1 } : {}) } } } };
    const m = new Map([['horde.save', JSON.stringify(old)]]);
    const st = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
    const q = loadProgress(st);
    assert.equal(mapState(q, 'molnbo').unlockedDay, 4, `dag ${day}`);
    assert.equal(sectorStatus(q, 'molnbo'), 'held', `dag ${day}`);
    assert.equal(mapState(q, 'molnbo').attempts[4], 2, 'försöken står kvar');
    assert.equal(m.get('horde.save'), JSON.stringify(old), 'filen skrivs inte över vid läsningen');
    if (day > 4) assert.equal(m.get('horde.save.days'), JSON.stringify(old), 'kopian');
    // 0.23.0 (H545): med Mölnbo klart öppnar Björnlunda och byns jägare (leveransen bl-1) kommer till
    assert.ok(q.op.units.length >= old.op.units.length, 'inga enheter försvinner');
    for (const u of old.op.units) assert.ok(q.op.units.some(x => x.uid === u.uid), 'inga enheter försvinner');
  }
});

// Balansen (docs/balance-log.md, Mölnbo). Spelaren kommer med det en vanlig spelare har efter Hagstumosse.
const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const smart = SEEDS.map(s => molnboCampaign('mbSmart', { seedOffset: s, maxAttempts: 6 }));
const naive = SEEDS.map(s => molnboCampaign('mbNaive', { seedOffset: s, maxAttempts: 4 }));

// 0.20.0: kartläsaren vinner varje dag inom 2 försök
test('balans: kartläsaren vinner dag 1 till 3 inom 2 försök', () => {
  for (const [i, r] of smart.entries()) {
    const a = mbAttempts(r.log);
    assert.equal(r.stuck, null, `seed ${i}: ${a}`);
    for (let d = 0; d < 3; d++) assert.ok(a[d] <= 2, `seed ${i} dag ${d + 1}: ${a}`);
  }
});

// 0.20.0 (dag 1): de civila kommer över bron; med evakueringens tips klarar också den som aldrig spärrar dagen
test('balans: dag 1 får de civila över, båda spelarna, på första försöket', () => {
  for (const [name, rs] of [['mbSmart', smart], ['mbNaive', naive]]) for (const [i, r] of rs.entries()) {
    const w = r.log.find(x => x.mapId === 'molnbo' && x.day === 1 && x.won);
    assert.ok(w && w.attempt === 1, `${name} seed ${i}`);
    assert.ok(w.evac.safe >= molnbo.days[0].evac.need, `${name} seed ${i}: ${w.evac.safe}`);
  }
});

// 0.19.1 (speltestet av 0.19.0, fynd 4): båda spelarna har en hel bas när tåget signalerar (0.20.0: dag 2), och tåget är
// ett val. Kartläsaren flyttar en grupp mot korsningen och klarar sig med god marginal.
test('balans: pendeltåget dag 2 kommer till en hel bas', () => {
  for (const [name, rs] of [['mbSmart', smart], ['mbNaive', naive]]) for (const [i, r] of rs.entries()) {
    const d2 = r.log.filter(x => x.mapId === 'molnbo' && x.day === 2);
    for (const x of d2) assert.ok(x.trainBase != null && x.trainBase >= 15, `${name} seed ${i} försök ${x.attempt}: basen ${x.trainBase} vid signalen`);
  }
  for (const [i, r] of smart.entries()) {
    const w = r.log.find(x => x.mapId === 'molnbo' && x.day === 2 && x.won);
    assert.ok(w && w.baseHp >= 12, `mbSmart seed ${i}: dag 2 bas ${w?.baseHp}`);
  }
});

// 0.20.0: den som aldrig spärrar klarar Mölnbo, men dag 2 och 3 kostar
test('balans: den som aldrig spärrar klarar Mölnbo inom fyra försök per dag, men dag 2 och 3 kostar', () => {
  for (const [i, r] of naive.entries()) {
    const a = mbAttempts(r.log);
    assert.equal(r.stuck, null, `seed ${i}: ${a}`);
    for (const d of [1, 2]) assert.ok(a[d] >= 1 && a[d] <= 4, `seed ${i} dag ${d + 1}: ${a}`);
  }
  // dag 3 (uttågets dag) kostar mest; dag 2 kostar en del av basen
  const won = d => naive.flatMap(r => r.log.filter(x => x.mapId === 'molnbo' && x.day === d && x.won));
  // 0.22.0 (H539): snittet högst 13 (förut 12). Med den mindre truppen från kampanjbågen är dag 3 ett stup: hp 26 ger 11,6
  // för den som aldrig spärrar men då förlorar Quick jump-truppen utan handpåläggning klockan (scripts/slice1-check.mjs
  // molnbo); hp 25 ger 12,6. docs/balance-log.md 0.22.0.
  assert.ok(won(3).reduce((s, x) => s + x.baseHp, 0) / won(3).length <= 13, `dag 3 snitt bas ${won(3).map(x => x.baseHp)}`);
  assert.ok([...won(2), ...won(3)].reduce((s, x) => s + x.baseHp, 0) / (won(2).length + won(3).length) <= 14, `snitt bas ${won(2).map(x => x.baseHp)}`);
});

// 0.20.1 (speltestet av 0.20.0: dag 2 tog tolv minuter i 1x): sex till sju minuter för den som läser kartan (0.21.3: högst
// sju och en halv); den som inte
// spärrar dödar långsammare och får högst cirka nio
test('balans: dag 2 tar sex till sju minuter', () => {
  for (const [i, r] of smart.entries()) { const w = r.log.find(x => x.mapId === 'molnbo' && x.day === 2 && x.won); assert.ok(w.time >= 330 && w.time <= 450, `mbSmart seed ${i}: ${w.time.toFixed(0)} s`); }
  for (const [i, r] of naive.entries()) for (const x of r.log.filter(q => q.mapId === 'molnbo' && q.day === 2 && q.won)) assert.ok(x.time <= 560, `mbNaive seed ${i}: ${x.time.toFixed(0)} s`);
});

test('balans: högst cirka 250 levande zombier samtidigt, och högst två vågor ute', () => {
  const all = [...smart, ...naive].flatMap(r => r.log);
  assert.ok(Math.max(...all.map(x => x.peak)) <= 250, `${Math.max(...all.map(x => x.peak))}`);
  for (const x of all) assert.ok(x.peakWaves <= 2, `dag ${x.day} försök ${x.attempt}: ${x.peakWaves}`);
});

// 0.17.1 (speltestet av 0.17.0 hoppade dit med truppen på nivå 1): hoppet till Mölnbo ger balansens ankomst.
test('hoppet till Mölnbo (?debug&jump) har truppen och forskningen balansen räknar med', () => {
  const a = molnboArrival(0);
  assert.deepEqual(ARRIVAL_TROOP.molnbo.units, a.op.units.map(u => [u.type, u.level, u.men ?? null, u.wins ?? 0]), 'kör om balansen och skriv in truppen i src/data/arrival.js');
  assert.deepEqual(ARRIVAL_TROOP.molnbo.research, a.research);
  const q = debugReach(newCampaign(), 'molnbo', 1);
  assert.deepEqual(unitsIn(q, 'molnbo').map(u => [u.type, u.level]), ARRIVAL_TROOP.molnbo.units.map(([t, l]) => [t, l]));
  assert.ok(ARRIVAL_TROOP.molnbo.research.every(id => q.research.includes(id)));
});

// 0.22.0 (H539): hoppet till dag 2 och 3 har truppen kartläsaren går in med där (förrådets köp och vinsterna dagarna före)
test('hoppet till Mölnbo dag 2 och 3 har kartläsarens trupp den dagen', () => {
  for (const day of [2, 3]) {
    const p = molnboDayTroop(day), t = ARRIVAL_TROOP.molnbo.days[day];
    assert.deepEqual(t.units, unitsIn(p, 'molnbo').map(u => [u.type, u.level, u.men ?? null, u.wins ?? 0]), `dag ${day}: kör om balansen och skriv in truppen i src/data/arrival.js`);
    assert.deepEqual(t.research, p.research);
    const q = debugReach(newCampaign(), 'molnbo', day);
    assert.deepEqual(unitsIn(q, 'molnbo').map(u => [u.type, u.level]), t.units.map(([ty, l]) => [ty, l]));
  }
});

// Kvittot per dag. Ett ändrat steg ska vara avsiktligt och förklarat i docs/balance-log.md (Mölnbo).
// 0.20.0: alla dagar nya, avsiktligt: kartan omritad efter satellitbilden (en bro, vägnätet, Folkets hus vid Kvarnvägen)
// och tre dagar efter kampanjbågen (evakueringen, norra sidan faller, uttåget), sammanslagen med riktningarna (ankomsten
// omräknad). Den andra spelaren är mbNaive (naive som följer evakueringens tips). docs/balance-log.md 0.20.0 (Mölnbo).
// 0.20.1 (speltestet av 0.20.0): alla dagar nya, avsiktligt: dag 1 husen närmast bron först, dag 2 nästa våg tidigare,
// hårdare svans och hp 13 till 12, dag 3 den täta flodvågen. docs/balance-log.md Mölnbo 0.20.1.
// 0.21.3 (H532, Olas kartbilder): alla dagar nya, avsiktligt: vägnätet på södra sidan (Fagernäsvägens båge, Dvärgvägen,
// Kvarnvägen till Mjölnarstigen), trappan i stället för trapptornen, dag 2 overlap 20 och bjässarna i tredje vågen, dag 3
// hp 10 till 12; dag 2 bara från Järnasidan med ett utbrott vid Trollvägen (H538); gångvägarna och bergväggen som inte
// skymmer (H540, H541), dag 2 hp 12 till 20 och dag 3 till 27. docs/balance-log.md Mölnbo 0.21.3.
// 0.22.0 (H539, kampanjbågen): alla dagar nya, avsiktligt: ankomsten kommer från fyra dagar på Hagstumosse (förut tio),
// 15 enheter med få veteraner; ledningens förstärkning dag 1 (två Psg 90, två Ksp 58 på nivå III, infanteriet, Psg 90 II
// med flera), dag 2 hp 20 till 15 och dag 3 27 till 25. docs/balance-log.md 0.22.0.
const pr = rs => mbPrints([].concat(...rs.map((r, i) => r.log.map(x => ({ ...x, seed: i })))));
test('balans: fingeravtrycket per dag (mbSmart och mbNaive)', () => {
  // 0.22.1: mbSmart nytt avsiktligt (dag 1 halva förnödenheterna per dödad, bounty 0,5); utfallen som förut
  assert.deepEqual(pr(smart), { 'molnbo 1': '5dfecc8d', 'molnbo 2': 'd825f47f', 'molnbo 3': '6b02e86f' });
  assert.deepEqual(pr(naive), { 'molnbo 1': '8bae3ad7', 'molnbo 2': '6d627559', 'molnbo 3': '429ae660' });
});

// 0.19.0 (H457): ett hus med garnison ingår aldrig i flödets kostnader (bara hindren), så ett hus kan inte stänga en väg.
test('H457: ett hus med garnison ändrar inte hordens vägar', () => {
  const sim = createSim({ map: molnbo, day: 2, cash: 9999, depth: true });
  sim.maxSquads = 9;
  const r = sim.route, before = r.paths(['s1', 's4']).map(q => q.cells.join());
  const h = sim.map.lots.plots.find(q => q.house.kind === 'villa' && q.house.v > 40 && q.house.road === 'stenby');
  assert.ok(h);
  const k = p.keyAt(h.house.x, h.house.z);
  assert.ok(build(sim, k, 'inf').ok && sim.guns[0].house, 'gruppen i huset');
  assert.deepEqual(r.paths(['s1', 's4']).map(q => q.cells.join()), before);
});
