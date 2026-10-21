// Björnlunda som bana (0.23.0, H545): sektorn efter Mölnbo, kampanjens dag 11 och 12 (kampanjplanen avsnitt 10). Kartan ur OSM
// (src/data/bjornlunda.js, tests/bjornlunda.test.js), det spelbara i src/data/bjornlunda-play.js. Basen Wattrangsborg på östra sidan, dag 1 från
// väster, dag 2 evakuering och från väster och söder. Balansen: docs/balance-log.md, Björnlunda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { bjornlundaPlay as bl, PATHS, WATT, SPAWNS, EVAC_HOMES, SHAPES } from '../src/data/bjornlunda-play.js';
import { RAIL } from '../src/data/bjornlunda.js';
import { CRISP } from '../src/data/bjornlunda-play.js';
import { setCameraYaw, screenAxes, OFFSET } from '../src/render/camera-eye.js';
import { distPolyline } from '../src/data/osm-map.js';
import { rect, distRect, placementFor, KIND } from '../src/sim/placement.js';
import { routeFor } from '../src/sim/route.js';
import { createSim, build, checkSpot, evacPath, houseDoor, housesFor } from '../src/sim/sim.js';
import { campaignDayOf } from '../src/meta/campaign-day.js';
import { STAGES, featuresFor } from '../src/meta/unlocks.js';
import { LESSONS } from '../src/data/lessons.js';
import { SECTOR_TABLE, ADDRESSEE } from '../src/data/table.js';
import { SECTORS, RELEASES } from '../src/data/depot.js';
import { newCampaign, debugReach, unitsIn, finishDay, sectorStatus, makeChoice } from '../src/meta/operation.js';
import { mapUnlocked } from '../src/meta/progress.js';
import { ARRIVAL_TROOP } from '../src/data/arrival.js';
import { bjornlundaCampaign, bjornlundaArrival, bjornlundaDayTroop, blAttempts, blPrints, playOpDay } from '../scripts/balance.mjs';

const route = routeFor(bl), g = route.grid, p = placementFor(bl);
const daySpawns = d => [...new Set(d.waves.flatMap(w => w.groups.map(q => q.spawn)))].sort();
const road = id => bl.roads.find(r => r.id === id);

test('Björnlunda är en bana efter Mölnbo: kampanjens dag 11 och 12, korta intron som säger varifrån de kommer', () => {
  assert.equal(MAPS.bjornlunda, bl);
  assert.equal(bl.days.length, 2);
  // 0.24.0 (H552): och Laxne-valet (tests/laxne-sector.test.js)
  assert.deepEqual(bl.unlock, { map: 'molnbo', day: 3, choice: 'laxne' });
  assert.equal(campaignDayOf('bjornlunda', 1), 11);
  assert.equal(campaignDayOf('bjornlunda', 2), 12);
  assert.equal(campaignDayOf('molnbo', 3), 10);
  for (const d of bl.days) {
    assert.match(d.intro.title, /^Day \d: /);
    // högst tolv ord, på engelska, och de säger varifrån horden kommer
    assert.ok(d.intro.text.split(/\s+/).length <= 12, d.intro.text);
    // 0.23.1 (speltestet av 0.23.0): gatorna, inte väderstrecken
    assert.doesNotMatch(d.intro.text, /\b(west|east|north|south)\b/i);
    assert.ok(d.order.text.split(/\s+/).length <= 12, d.order.text);
    assert.doesNotMatch(JSON.stringify(d), /—/);
  }
  assert.match(bl.days[0].intro.text, /Stjärnhov/);
  assert.match(bl.days[0].intro.text, /tracks/);
  assert.match(bl.days[1].intro.text, /Ekvägen over the level crossing/);
  // ordern dag 1 säger var man ska stå
  assert.match(bl.days[0].order.text, /Wattrangsborg/);
  assert.match(bl.days[0].order.text, /Stationsvägen and Villavägen/);
  // slutet läses som en vinst och pekar mot Gnesta västra rondell
  assert.match(bl.outro.text, /held/);
  assert.match(bl.outro.text, /roundabout in Gnesta/);
  assert.ok(!bl.outro.withdraw);
  assert.doesNotMatch(bl.outro.text, /—/);
});

test('dag 1 bara västerifrån (väg 57/223, spåret, Lokalvägen), dag 2 väster och söder med en större hord', () => {
  const [d1, d2] = bl.days;
  assert.deepEqual(daySpawns(d1), ['w1', 'w2', 'w3']);
  assert.deepEqual(daySpawns(d2), ['s1', 's2', 'w1', 'w2', 'w3']);
  assert.ok(d1.waves.length >= 4 && d2.waves.length >= 4);
  const count = d => d.waves.reduce((a, w) => a + w.groups.reduce((b, q) => b + q.count, 0), 0);
  assert.ok(count(d2) > count(d1), `${count(d2)} mot ${count(d1)}`);
  // ingångarna i väster ligger väster om byn, de i söder söder om spåret
  const at = id => SPAWNS.find(s => s.id === id).at;
  for (const id of ['w2', 'w3']) assert.ok(at(id)[0] < CRISP.x0, id);
  assert.ok(at('w1')[1] < CRISP.z0, 'väg 57/223 kommer in i nordväst');
  for (const id of ['s1', 's2']) assert.ok(at(id)[1] > 120 && distPolyline(...at(id), RAIL.pts) > 30, id);
  // och i dimkanten, utanför den skarpa ytan
  for (const s of SPAWNS) assert.ok(s.at[0] < CRISP.x0 || s.at[0] > CRISP.x1 || s.at[1] < CRISP.z0 || s.at[1] > CRISP.z1, s.id);
});

test('basen: Wattrangsborg på östra sidan, som horden västerifrån måste nå', () => {
  assert.equal(bl.baseModel, 'rink');
  assert.equal(bl.iceRink, WATT);
  assert.equal(bl.baseLabel, 'Wattrangsborg · Base');
  const wing = bl.buildings.find(b => b.kind === 'wattWing');
  assert.ok(Math.hypot(WATT.x - wing.x, WATT.z - wing.z) < 0.01);
  // öster om byns mitt och öster om alla ingångar i väster, med entrén mot planen och basrutan
  assert.ok(WATT.x > 60);
  for (const s of SPAWNS.filter(q => q.id !== 'w1')) assert.ok(WATT.x - s.at[0] > 100, s.id);
  assert.ok(WATT.x - SPAWNS.find(q => q.id === 'w1').at[0] > 50, 'w1');
  assert.ok(Math.hypot(WATT.entrance[0] - bl.base.at[0], WATT.entrance[1] - bl.base.at[1]) < 10);
  const [bx, bz] = g.center(g.base[0]);
  assert.ok(Math.hypot(bx - bl.base.at[0], bz - bl.base.at[1]) < 4, 'basrutan vid planen');
});

test('vägarna: från varje ingång till basen, och söderifrån bara över plankorsningen', () => {
  const crossing = bl.props.find(q => q.kind === 'levelCrossing').at;
  for (const day of [1, 2]) {
    const sim = createSim({ map: bl, day, cash: 0, seed: 1 });
    for (const id of daySpawns(bl.days[day - 1])) {
      const [ps] = sim.route.paths([id]);
      assert.ok(ps.reaches && ps.through == null, `dag ${day} ${id}`);
      assert.ok(ps.cells.length > 100, `${id}: ${ps.cells.length} rutor`);
    }
  }
  for (const id of ['s1', 's2']) {
    const [ps] = route.paths([id]);
    assert.ok(ps.cells.some(k => { const [x, z] = g.center(k); return Math.hypot(x - crossing[0], z - crossing[1]) < 8; }), `${id} över plankorsningen`);
  }
  // spåret är stängt utom vid plankorsningen: utan den når ingen söderifrån basen
  const seen = new Uint8Array(g.n), st = [];
  const shut = k => { const [x, z] = g.center(k); return Math.hypot(x - crossing[0], z - crossing[1]) < 10; };
  for (const s of g.spawns.filter(q => q.id === 's1' || q.id === 's2')) for (const k of s.starts) { seen[k] = 1; st.push(k); }
  while (st.length) {
    const k = st.pop(), i = k % g.w, j = (k - i) / g.w;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj, q = b * g.w + a;
      if (a < 0 || b < 0 || a >= g.w || b >= g.h || seen[q] || !g.walkable(q) || shut(q)) continue;
      seen[q] = 1; st.push(q);
    }
  }
  assert.ok(!g.base.some(k => seen[k]), 'söderifrån runt plankorsningen');
});

test('gångvägarna: smala grusstigar fria från husen, och en spärrad Villavägen ger omvägar på dem', () => {
  assert.deepEqual(PATHS.map(r => r.id), ['stigNorr', 'stigMitt', 'stigSyd']);
  const houses = bl.buildings.filter(b => !b.far).map(b => rect(b.x, b.z, b.ry, b.w, b.d));
  const sheds = bl.gardens.sheds.map(([x, z, ry, w, d]) => rect(x, z, ry, w, d));
  for (const r of PATHS) {
    assert.ok(r.walk && r.surface === 'gravel' && r.width < 3, r.id);
    // båda ändarna på sina gator
    assert.ok(distPolyline(...r.pts[0], road(r.from).pts) < 0.5 && distPolyline(...r.pts.at(-1), road(r.to).pts) < 0.5, r.id);
    for (let t = 0; t <= 1; t += 0.02) {
      const x = r.pts[0][0] + (r.pts[1][0] - r.pts[0][0]) * t, z = r.pts[0][1] + (r.pts[1][1] - r.pts[0][1]) * t;
      assert.ok(houses.every(h => distRect(h, x, z) > 1.2), `${r.id} vid ett hus`);
      assert.ok(sheds.every(h => distRect(h, x, z) > 1), `${r.id} vid en bod`);
      assert.ok(g.walkable(g.keyAt(x, z)), `${r.id} i rutnätet`);
    }
    // inget i trädgårdarna står på stigen
    for (const [x, z] of bl.gardens.trees) assert.ok(distPolyline(x, z, r.pts) > 1.8, `${r.id}: träd`);
  }
  const sim = createSim({ map: bl, day: 1, cash: 0, seed: 1 }), rt = sim.route;
  const blockAt = pts => { const o = {}; for (const [x, z] of pts) for (const k of rt.span(rt.cellAt(x, z))) o[k] = { type: 'block' }; return o; };
  const uses = (cells, id) => cells.filter(k => { const [x, z] = g.center(k); return distPolyline(x, z, PATHS.find(q => q.id === id).pts) < 1.2; }).length;
  const obs = blockAt([[56, 53]]);
  const [w1] = rt.paths(['w1'], obs), [w3] = rt.paths(['w3'], obs);
  assert.ok(w1.reaches && w1.through == null && uses(w1.cells, 'stigSyd') >= 10, 'väg 57/223 runt via stigen vid ICA');
  assert.ok(w3.reaches && w3.through == null, 'Lokalvägen når basen');
});

test('husen: grupper i hus längs huvudgatorna, prickskyttelägen på de stora taken, ingen placering på spåret', () => {
  const sim = createSim({ map: bl, day: 1, cash: 99999, depth: true });
  const hs = housesFor(sim);
  assert.ok(hs.length >= 60, `${hs.length} hus`);
  for (const id of ['stationsvagen-0', 'smedjevagen-15', 'villavagen-5']) {
    const n = hs.filter(h => distPolyline(h.x, h.z, road(id).pts) < 16).length;
    assert.ok(n >= 6, `${id}: ${n} hus`);
  }
  // en grupp i ett hus vid Stationsvägen
  const h = hs.filter(q => q.kind === 'villa').sort((a, b) => distPolyline(a.x, a.z, road('stationsvagen-0').pts) - distPolyline(b.x, b.z, road('stationsvagen-0').pts))[0];
  sim.maxSquads = 9;
  const before = sim.route.paths(['w2']).map(q => q.cells.join());
  assert.ok(build(sim, h.cells[0], 'inf').ok && sim.guns[0].house, 'gruppen i huset');
  // H457: ett hus med garnison ändrar inte hordens vägar
  assert.deepEqual(sim.route.paths(['w2']).map(q => q.cells.join()), before);
  // Psg 90 på ICA:s tak och det gula trevåningshuset
  for (const kind of ['ica', 'yellowBlock']) {
    const i = SHAPES.findIndex(s => s.kind === kind), k = [...Array(p.n).keys()].find(q => p.bldg[q] === i + 1 && p.perch[q]);
    assert.ok(k != null && p.roof[k] > 5, kind);
    assert.ok(checkSpot(createSim({ map: bl, day: 1, cash: 99999 }), k, 'psg90').ok, `${kind}: Psg 90`);
  }
  // spåret och basen är aldrig öppen mark
  for (let k = 0; k < p.n; k++) {
    const c = p.center(k);
    if (distPolyline(c.x, c.z, RAIL.pts) < RAIL.half - 0.5) assert.notEqual(p.kind[k], KIND.open, `spåret ${c.x} ${c.z}`);
  }
  assert.ok(!hs.some(q => q.kind === 'wattWing' || q.kind === 'wattHall'), 'basen går inte att besätta');
});

test('dag 2: de markerade husen går de gula linjerna till Wattrangsborg, först de närmast basen', () => {
  const d2 = bl.days[1], ev = d2.evac;
  assert.ok(ev.all && ev.need > 0 && ev.need <= ev.groups.reduce((a, q) => a + q.count, 0));
  assert.ok(!bl.days[0].evac, 'dag 1 är försvar');
  assert.equal(new Set(EVAC_HOMES).size, EVAC_HOMES.length);
  const sim = createSim({ map: bl, day: 2, cash: 99999, depth: true });
  const dist = id => { const h = bl.buildings.find(b => b.id === id); return Math.hypot(h.x - WATT.x, h.z - WATT.z); };
  for (const q of ev.groups) {
    const h = bl.lots.plots.find(x => x.id === q.house)?.house;
    assert.ok(h && h.kind === 'villa', q.house);
    const d = houseDoor(bl, q.house, sim.route);
    assert.ok(sim.route.validCell(d.cell), `${q.house}: dörren vid en gata`);
    const line = evacPath(sim, q.house), end = line.at(-1);
    assert.ok(line.length > 10 && Math.hypot(end[0] - bl.base.at[0], end[1] - bl.base.at[1]) < 6, `${q.house}: linjen till basen`);
    // huset går inte att besätta medan det töms
    const hh = housesFor(sim).find(x => x.id === q.house);
    if (hh) assert.equal(build(sim, hh.cells[0], 'inf').reason, 'hus evak');
  }
  const first = ev.groups.filter(q => q.wave === 0).map(q => dist(q.house)), last = ev.groups.filter(q => q.wave === 2).map(q => dist(q.house));
  assert.ok(Math.max(...first) < Math.min(...last), `${first} mot ${last}`);
  // 0.23.2 (omtestet av 0.23.1): husen ligger nära basen, så att den som håller basen täcker linjerna
  for (const q of ev.groups) assert.ok(dist(q.house) < 120, q.house);
});

test('kampanjen: Björnlunda öppnar efter Mölnbo dag 3 och FALL BACK, truppen följer med och byns jägare kommer till', () => {
  let p0 = debugReach(newCampaign(), 'molnbo', 3);
  assert.equal(mapUnlocked(p0, 'bjornlunda'), false);
  assert.equal(sectorStatus(p0, 'bjornlunda'), 'locked');
  const before = unitsIn(p0, 'molnbo').length;
  p0 = finishDay(p0, { mapId: 'molnbo', day: 3, won: true, intelEarned: 10, report: { units: [] } }).progress;
  // 0.24.0 (H552): först Laxne-valet på bordet
  assert.equal(mapUnlocked(p0, 'bjornlunda'), false);
  p0 = makeChoice(p0, 'laxne', 'fallback').progress;
  assert.equal(mapUnlocked(p0, 'bjornlunda'), true);
  assert.equal(sectorStatus(p0, 'bjornlunda'), 'holding');
  assert.equal(unitsIn(p0, 'bjornlunda').length, before + 2, 'truppen från Mölnbo och två grupper jägare');
  const msg = p0.op.inbox.find(m => m.id === 'bl-1');
  assert.ok(msg && /Björnlunda/.test(msg.text) && /No good troops/.test(msg.text), 'ledningen har inga bra trupper här');
  assert.ok(msg.text.split(/\s+/).length <= 20);
  for (const d of [1, 2]) p0 = finishDay(p0, { mapId: 'bjornlunda', day: d, won: true, intelEarned: 10, report: { units: [] } }).progress;
  assert.equal(sectorStatus(p0, 'bjornlunda'), 'held');
  // bordet, sektorn och leveranserna
  assert.ok(SECTOR_TABLE.bjornlunda?.place === 'bjornlunda' && ADDRESSEE.bjornlunda);
  assert.ok(SECTORS.find(s => s.id === 'bjornlunda')?.maps.includes('bjornlunda'));
  for (const r of RELEASES.filter(x => x.map === 'bjornlunda')) assert.ok(r.text.split(/\s+/).length <= 20, r.id);
});

test('inlärningen: Björnlunda lägger inget nytt begrepp, dag 12 pekar på basens vägar, Field manual orörd', () => {
  for (const id of ['bl-1', 'bl-2']) assert.deepEqual(STAGES.find(s => s.id === id).adds, [], id);
  // 0.23.2: dag 12 pekar på basens två vägar in (Villavägen, Stationsvägen); inget nytt begrepp
  assert.ok(!LESSONS['bl-1']);
  assert.deepEqual(LESSONS['bl-2'].map(l => l.target.world), ['route']);
  assert.match(LESSONS['bl-2'][0].text, /Villavägen and Stationsvägen/);
  assert.deepEqual([...featuresFor('bjornlunda', 1)].sort(), [...featuresFor('molnbo', 3)].sort());
});

// Balansen (docs/balance-log.md, Björnlunda). Spelaren kommer med det kartläsaren har efter Mölnbo.
const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const skilled = SEEDS.map(s => bjornlundaCampaign('blSkilled', { seedOffset: s, maxAttempts: 6 }));
const normal = SEEDS.map(s => bjornlundaCampaign('blNormal', { seedOffset: s, maxAttempts: 6 }));
// 0.23.1 (speltestet av 0.23.0): spelaren som ställer allt inom 40 m från basen (dag 1:s order), utan att läsa kartan
const nearBase = SEEDS.map(s => bjornlundaCampaign('blNear', { seedOffset: s, maxAttempts: 6 }));

test('balans: kartläsaren vinner båda dagarna på första försöket, den vanliga spelaren inom tre', () => {
  for (const [i, r] of skilled.entries()) { const a = blAttempts(r.log); assert.equal(r.stuck, null, `seed ${i}: ${a}`); assert.deepEqual(a, [1, 1], `blSkilled seed ${i}`); }
  for (const [i, r] of normal.entries()) { const a = blAttempts(r.log); assert.equal(r.stuck, null, `seed ${i}: ${a}`); for (const x of a) assert.ok(x >= 1 && x <= 3, `blNormal seed ${i}: ${a}`); }
  // dag 11 och 12 går att vinna genom att stå vid basen, där ordern säger, inom 1 till 3 försök
  for (const [i, r] of nearBase.entries()) { const a = blAttempts(r.log); assert.equal(r.stuck, null, `blNear seed ${i}: ${a}`); for (const x of a) assert.ok(x >= 1 && x <= 3, `blNear seed ${i}: ${a}`); }
});

test('balans: dag 2 får de civila in, högst cirka 250 levande och högst två vågor ute, dagarna sex till sju minuter', () => {
  for (const r of [...skilled, ...normal]) {
    const w = r.log.find(x => x.day === 2 && x.won);
    assert.ok(w.evac.safe >= bl.days[1].evac.need, `${w.evac.safe}`);
  }
  const all = [...skilled, ...normal].flatMap(r => r.log);
  assert.ok(Math.max(...all.map(x => x.peak)) <= 250, `${Math.max(...all.map(x => x.peak))}`);
  for (const x of all) assert.ok(x.peakWaves <= 2, `dag ${x.day} försök ${x.attempt}: ${x.peakWaves}`);
  // 0.23.1 (speltestet: åtta minuter): fem till sju minuter
  for (const x of all.filter(q => q.won)) assert.ok(x.time >= 300 && x.time <= 430, `dag ${x.day}: ${x.time} s`);
});

test('hoppet till Björnlunda (Quick jump) har truppen och forskningen balansen räknar med, dag 1 och 2', () => {
  const a = bjornlundaArrival(0);
  assert.deepEqual(ARRIVAL_TROOP.bjornlunda.units, a.op.units.map(u => [u.type, u.level, u.men ?? null, u.wins ?? 0]), 'kör om balansen och skriv in truppen i src/data/arrival.js');
  assert.deepEqual(ARRIVAL_TROOP.bjornlunda.research, a.research);
  const q = debugReach(newCampaign(), 'bjornlunda', 1);
  assert.deepEqual(unitsIn(q, 'bjornlunda').map(u => [u.type, u.level]), ARRIVAL_TROOP.bjornlunda.units.map(([t, l]) => [t, l]));
  const p2 = bjornlundaDayTroop(2), t = ARRIVAL_TROOP.bjornlunda.days[2];
  assert.deepEqual(t.units, unitsIn(p2, 'bjornlunda').map(u => [u.type, u.level, u.men ?? null, u.wins ?? 0]), 'dag 2: kör om balansen');
  assert.deepEqual(t.research, p2.research);
});

// Kvittot per dag. Ett ändrat steg ska vara avsiktligt och förklarat i docs/balance-log.md (Björnlunda).
// 0.23.0 (H545): första kvittot, dag 1 hp 10 och dag 2 hp 7 (docs/balance-log.md Björnlunda 0.23.0).
// 0.23.1 (speltestet av 0.23.0): alla nya, avsiktligt: mindre spelyta, kartläsaren vid basen dag 1, dag 1 hp 8 och dag 2
// hp 6, bounty 0,9 och 1, overlap 12, bjässarna mitt i sista vågen, söderifrån senare dag 2. docs/balance-log.md 0.23.1.
// 0.23.2 (omtestet av 0.23.1): dag 12 nytt, avsiktligt: husen nära basen, leveransen bl-2 (två Hemvärnsgrupper och en
// Ksp 90). docs/balance-log.md 0.23.2.
// 0.24.0 (H552): alla nya, avsiktligt: ankomsten är grenen FALL BACK (valets kostnad 150 RP, första vågen dag 11 en
// fjärdedel större) och dag 1 hp 7,5 (förut 8). Grenen DEFEND LAXNE provas i tests/laxne-sector.test.js.
// docs/balance-log.md Laxne 0.24.0.
const pr = rs => blPrints([].concat(...rs.map((r, i) => r.log.map(x => ({ ...x, seed: i })))));
test('balans: fingeravtrycket per dag (blSkilled och blNormal)', () => {
  assert.deepEqual(pr(skilled), { 'bjornlunda 1': '58ba2e3e', 'bjornlunda 2': 'a2b6e94b' });
  assert.deepEqual(pr(normal), { 'bjornlunda 1': '2a7d6889', 'bjornlunda 2': '09405b0a' });
});

// 0.23.1 (speltestet av 0.23.0: "from the west" kom uppifrån höger): kameran i söder, väster till vänster på skärmen
test('kameran: Björnlunda vrids så att väster är till vänster, de andra banorna står som förut', () => {
  assert.equal(bl.camera.yaw, 0);
  for (const id of ['riksvagen', 'gnesta', 'gnesta-norr', 'molnbo']) assert.equal(MAPS[id].camera.yaw ?? 45, 45, id);
  try {
    setCameraYaw(0);
    const { right, down } = screenAxes();
    assert.deepEqual(right.map(v => Math.round(v * 1e6) / 1e6 + 0), [1, 0, 0]);
    assert.deepEqual(down.map(v => Math.round(v * 1e6) / 1e6 + 0), [0, 0, 1]);
    assert.ok(Math.abs(OFFSET[0]) < 1e-9 && OFFSET[2] > 50, 'kameran söder om blickpunkten');
    // ingångarna i väster hamnar till vänster om basen på skärmen
    for (const id of ['w2', 'w3', 's2']) { const s = SPAWNS.find(q => q.id === id); assert.ok(s.at[0] * right[0] + s.at[1] * right[2] < bl.base.at[0] * right[0] + bl.base.at[1] * right[2] - 100, id); }
  } finally { setCameraYaw(45); }
  for (const [i, v] of [40, 46, 40].entries()) assert.ok(Math.abs(OFFSET[i] - v) < 1e-9, 'tillbaka till 45 grader');
});

// 0.23.1 (speltestet av 0.23.0, fynd 3): dag 2:s grupp söderifrån kommer efter att andra vågens civila gått förbi
test('dag 2: gruppen söderifrån väntar tills andra vågens civila har gått', () => {
  const d2 = bl.days[1], w = d2.waves[1];
  const south = w.groups.filter(q => q.spawn === 's1' || q.spawn === 's2');
  assert.ok(south.length && Math.min(...south.map(q => q.delay)) >= 18);
  for (const q of d2.evac.groups.filter(x => x.wave === 1)) assert.ok(q.at <= 4, q.house);
  // ingångarnas skyltar står där vägen kommer in i bild (main.js entryCells), inte där vägarna går ihop
  assert.ok(bl.entryAt >= 500);
});

// 0.23.2 (omtestet av 0.23.1: dag 12 gick inte att vinna med truppen man har efter dag 11). Mellan dagarna gäller bordets
// regler (src/meta/operation.js finishDay: tröttheten och att utmattade byts mot utvilade), samma funktion som spelet
// anropar efter en dag (main.js finishOpDay). Dag 11 vunnen av den som står vid basen, sedan bordets regler, sedan dag 12.
test('dag 12 med truppen efter dag 11 (bordets trötthet), den som står vid basen vinner inom tre försök', async () => {
  const { readFileSync } = await import('node:fs');
  // samma funktion i spelet och i balansen
  assert.match(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /finishDay as finishOpDay[^\n]*from '\.\/meta\/operation\.js'/);
  assert.match(readFileSync(new URL('../scripts/balance.mjs', import.meta.url), 'utf8'), /finishDay[^\n]*from '\.\.\/src\/meta\/operation\.js'/);
  for (const [i, s] of SEEDS.entries()) {
    let p = bjornlundaArrival(s);
    const d1 = playOpDay(p, 'bjornlunda', 1, 'blNear', { seedOffset: s });
    assert.ok(d1.won, `seed ${i}: dag 11`);
    p = finishDay(p, { mapId: 'bjornlunda', day: 1, won: true, intelEarned: d1.intelEarned, report: d1.report, evac: d1.evac }).progress;
    // de som slogs är trötta (bordets regel)
    assert.ok(unitsIn(p, 'bjornlunda').some(u => (u.fatigue ?? 0) >= 1), `seed ${i}: ingen trött`);
    let won = 0;
    for (let a = 1; a <= 3 && !won; a++) {
      const d2 = playOpDay(p, 'bjornlunda', 2, 'blNear', { seedOffset: s });
      p = finishDay(p, { mapId: 'bjornlunda', day: 2, won: d2.won, intelEarned: d2.intelEarned, report: d2.report, evac: d2.evac }).progress;
      if (d2.won) won = a;
    }
    assert.ok(won >= 1, `seed ${i}: dag 12 inom tre försök`);
  }
});
