// Gnesta västra rondell som bana (0.25.0, H559): kampanjens dag 13, "Försvar mot förtrupper" (kampanjplanen avsnitt 10),
// efter Björnlunda dag 11 och 12 (12 och 13 efter DEFEND LAXNE). Kartan ur OSM (src/data/gnesta-vastra-rondell.js,
// tests/gnesta-vastra-rondell.test.js), det spelbara i src/data/gnesta-vastra-rondell-play.js. Basen är villan på
// Barrstigen öster om rondellen, förtrupperna kommer längs väg 57 från Björnlunda och D 830 ur skogen. Västerkärv (dag 14)
// är inte byggd: kampanjen slutar här med "To be continued.". Balansen: docs/balance-log.md, Västra rondellen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAPS } from '../src/data/maps.js';
import { vastraRondellPlay as vr, PATHS, VILLA, SPAWNS, EXITS, SHAPES, CRISP, BASE_ID, PERCH_IDS } from '../src/data/gnesta-vastra-rondell-play.js';
import { setCameraYaw, screenAxes } from '../src/render/camera-eye.js';
import { distPolyline, gridPath } from '../src/data/osm-map.js';
import { rect, distRect, placementFor } from '../src/sim/placement.js';
import { routeFor } from '../src/sim/route.js';
import { createSim, build, checkSpot, housesFor } from '../src/sim/sim.js';
import { campaignDayOf, shownDay, setChoices, campaignDay as progressDay } from '../src/meta/campaign-day.js';
import { STAGES, featuresFor } from '../src/meta/unlocks.js';
import { LESSONS } from '../src/data/lessons.js';
import { SECTOR_TABLE, ADDRESSEE, PLACES } from '../src/data/table.js';
import { SECTORS, RELEASES } from '../src/data/depot.js';
import { newCampaign, debugReach, unitsIn, finishDay, sectorStatus, makeChoice } from '../src/meta/operation.js';
import { mapUnlocked, choiceOf } from '../src/meta/progress.js';
import { nextBattle, missionPiles, orderSheet } from '../src/meta/table.js';
import { ARRIVAL_TROOP } from '../src/data/arrival.js';
import { vastraRondellCampaign, vastraRondellArrival, vrAttempts, vrPrints } from '../scripts/balance.mjs';

const ID = 'gnesta-vastra-rondell';
const route = routeFor(vr), g = route.grid, p = placementFor(vr);
const daySpawns = d => [...new Set(d.waves.flatMap(w => w.groups.map(q => q.spawn)))].sort();
const road = id => vr.roads.find(r => r.id === id);
const words = s => s.trim().split(/\s+/).length;
const count = (d, type = null) => d.waves.reduce((a, w) => a + w.groups.filter(q => !type || q.type === type).reduce((b, q) => b + q.count, 0), 0);
const island = vr.props.find(q => q.kind === 'rondellIsland').at;
const win = (q, mapId, day) => finishDay(q, { mapId, day, won: true, intelEarned: 10, report: { units: [] } }).progress;
// Mölnbo dag 3 vunnen och Laxne-valet gjort (opt), Björnlunda (och Laxne) vunna: rondellen väntar
function afterBjornlunda(opt) {
  let q = win(debugReach(newCampaign(), 'molnbo', 3), 'molnbo', 3);
  q = makeChoice({ ...q, rp: 400 }, 'laxne', opt).progress;
  if (opt === 'defend') q = win(q, 'laxne', 1);
  for (const d of [1, 2]) q = win(q, 'bjornlunda', d);
  return q;
}

test('västra rondellen är en bana efter Björnlunda: en dag, kort intro som säger vägarna, slutet pekar mot Västerkärv', () => {
  assert.equal(MAPS[ID], vr);
  assert.equal(vr.days.length, 1);
  assert.deepEqual(vr.unlock, { map: 'bjornlunda', day: 2 });
  const d = vr.days[0];
  assert.match(d.intro.title, /^Day \d: /);
  // högst tolv ord, på engelska, och de säger vägarna (inte väderstrecken)
  assert.ok(words(d.intro.text) <= 12, d.intro.text);
  assert.match(d.intro.text, /väg 57/);
  assert.match(d.intro.text, /Björnlunda/);
  assert.match(d.intro.text, /D 830/);
  assert.doesNotMatch(d.intro.text, /\b(west|east|north|south)\b/i);
  assert.ok(words(d.order.text) <= 12, d.order.text);
  assert.match(d.order.text, /roundabout/);
  assert.match(d.order.text, /Barrstigen/);
  assert.equal(d.waves.length, 4, 'ungefär fyra vågor');
  assert.ok(!d.evac, 'försvar, ingen evakuering');
  // slutet läses som en vinst och pekar mot Västerkärv; kampanjen fortsätter senare
  assert.match(vr.outro.text, /held/);
  assert.match(vr.outro.text, /Västerkärv/);
  assert.match(vr.outro.text, /To be continued\.$/);
  assert.ok(!vr.outro.withdraw);
  for (const s of [JSON.stringify(d), JSON.stringify(vr.outro)]) assert.doesNotMatch(s, /—/);
});

test('förtrupperna: väg 57 och D 830 västerifrån, mindre än en hel hord, med springare och pansrade', () => {
  const d = vr.days[0];
  assert.deepEqual(SPAWNS.map(s => s.id), ['w57', 'd830']);
  assert.deepEqual(daySpawns(d), ['d830', 'w57']);
  for (const s of SPAWNS) {
    assert.ok(s.at[0] < CRISP.x0, `${s.id} väster om spelytan (i diset)`);
    assert.ok(s.at[0] < island[0] - 120, `${s.id} väster om rondellen`);
  }
  assert.ok(distPolyline(...SPAWNS[0].at, road('vag-57-23').pts) < 1, 'w57 på väg 57');
  assert.ok(distPolyline(...SPAWNS[1].at, road('vag-d-830-3').pts) < 1, 'd830 på D 830');
  assert.ok(SPAWNS[1].at[1] - SPAWNS[0].at[1] > 100, 'D 830 kommer in söder om 57');
  // mindre än en hel hord: färre än Björnlunda dag 11, och inga bjässar (de kommer med det stora anfallet)
  assert.ok(count(d) < count(MAPS.bjornlunda.days[0]), `${count(d)} mot ${count(MAPS.bjornlunda.days[0])}`);
  assert.equal(count(d, 'brute'), 0);
  assert.ok(count(d, 'runner') >= 30 && count(d, 'armored') >= 6, `${count(d, 'runner')} springare, ${count(d, 'armored')} pansrade`);
  // båda vägarna har springare och pansrade
  for (const id of ['w57', 'd830']) for (const t of ['runner', 'armored'])
    assert.ok(d.waves.some(w => w.groups.some(q => q.spawn === id && q.type === t)), `${id}: ${t}`);
});

test('basen: villan på Barrstigen öster om rondellen, där alla västliga vägar möts först', () => {
  assert.equal(vr.baseModel, 'rink');
  assert.equal(vr.iceRink, VILLA);
  assert.equal(vr.baseLabel, 'Barrstigen · Base');
  const h = vr.buildings.find(b => b.id === BASE_ID);
  assert.equal(h.kind, 'villa');
  assert.ok(Math.hypot(VILLA.x - h.x, VILLA.z - h.z) < 0.01);
  assert.ok(distPolyline(VILLA.x, VILLA.z, road('barrstigen-5').pts) < 12, 'vid Barrstigen');
  assert.ok(VILLA.x > island[0] + 30 && Math.hypot(VILLA.x - island[0], VILLA.z - island[1]) < 70, 'öster om rondellen, nära');
  // entrén mot gatan, basrutan på Barrstigen framför den
  assert.ok(Math.hypot(VILLA.entrance[0] - vr.base.at[0], VILLA.entrance[1] - vr.base.at[1]) < 4);
  const [bx, bz] = g.center(g.base[0]);
  assert.ok(Math.hypot(bx - vr.base.at[0], bz - vr.base.at[1]) < 4, 'basrutan på Barrstigen');
  assert.ok(distPolyline(bx, bz, road('barrstigen-5').pts) < 3);
});

test('vägarna: från båda ingångarna förbi rondellen till basen, och från basen österut in i Gnesta', () => {
  const sim = createSim({ map: vr, day: 1, cash: 0, seed: 1 });
  for (const id of ['w57', 'd830']) {
    const [ps] = sim.route.paths([id]);
    assert.ok(ps.reaches && ps.through == null, id);
    assert.ok(ps.cells.length > 90, `${id}: ${ps.cells.length} rutor`);
    assert.ok(ps.cells.some(k => { const [x, z] = g.center(k); return Math.hypot(x - island[0], z - island[1]) < 25; }), `${id} förbi rondellen`);
  }
  // utgångarna: Västra Storgatan mot centrum och 57 sydost, i östra halvan, nåbara från basen
  assert.deepEqual(EXITS.map(e => e.id), ['ne', 'se']);
  const grid = vr.grid;
  for (const e of EXITS) {
    assert.ok(e.at[0] > 100, e.id);
    const [i, j] = grid.cellOf(e.at), b = g.base[0];
    const path = gridPath(grid, [b % grid.w, Math.floor(b / grid.w)], [i, j]);
    assert.ok(path && path.length > 60, `basen till ${e.id}`);
  }
});

test('gångvägarna: smala grusstigar fria från husen, och spärrade gator ger omvägar på dem', () => {
  assert.deepEqual(PATHS.map(r => r.id), ['stigNorr', 'stigMitt', 'stigSyd']);
  const houses = vr.buildings.filter(b => !b.far).map(b => rect(b.x, b.z, b.ry, b.w, b.d));
  const sheds = vr.gardens.sheds.map(([x, z, ry, w, d]) => rect(x, z, ry, w, d));
  for (const r of PATHS) {
    assert.ok(r.walk && r.surface === 'gravel' && r.width < 3, r.id);
    assert.ok(distPolyline(...r.pts[0], road(r.from).pts) < 0.5 && distPolyline(...r.pts.at(-1), road(r.to).pts) < 0.5, r.id);
    for (let t = 0; t <= 1; t += 0.02) {
      const x = r.pts[0][0] + (r.pts[1][0] - r.pts[0][0]) * t, z = r.pts[0][1] + (r.pts[1][1] - r.pts[0][1]) * t;
      assert.ok(houses.every(h => distRect(h, x, z) > 1.2), `${r.id} vid ett hus`);
      assert.ok(sheds.every(h => distRect(h, x, z) > 1), `${r.id} vid en bod`);
      assert.ok(g.walkable(g.keyAt(x, z)), `${r.id} i rutnätet`);
    }
    for (const [x, z] of vr.gardens.trees) assert.ok(distPolyline(x, z, r.pts) > 1.8, `${r.id}: träd`);
  }
  const sim = createSim({ map: vr, day: 1, cash: 0, seed: 1 }), rt = sim.route;
  const blockAt = pts => { const o = {}; for (const [x, z] of pts) for (const k of rt.span(rt.cellAt(x, z))) o[k] = { type: 'block' }; return o; };
  const uses = (cells, id) => cells.filter(k => { const [x, z] = g.center(k); return distPolyline(x, z, PATHS.find(q => q.id === id).pts) < 1.2; }).length;
  const go = (pts, id) => { const [ps] = rt.paths([id], blockAt(pts)); assert.ok(ps.reaches && ps.through == null, `${id} når basen`); return ps.cells; };
  // Barrstigen spärrad mellan rondellen och basen: väg 57 runt via Västra Storgatan och stigen ned till Barrstigen
  assert.ok(uses(go([[-28, -21.5]], 'w57'), 'stigNorr') >= 8, 'stigNorr');
  // också stigen norrifrån spärrad: in i villorna från Furulundsvägen mellan husen öster om basen
  assert.ok(uses(go([[-28, -21.5], [5.5, -40]], 'd830'), 'stigMitt') >= 8, 'stigMitt');
  // och Furulundsvägen spärrad där 57 går ihop med den: från 57 sydost upp genom stigen söderifrån
  assert.ok(uses(go([[-28, -21.5], [5.5, -40], [4, 2.6]], 'd830'), 'stigSyd') >= 6, 'stigSyd');
});

test('husen: grupper i hus längs gamla landsvägen och Barrstigen, prickskyttelägen på radhusen och villan närmast rondellen', () => {
  const sim = createSim({ map: vr, day: 1, cash: 99999, depth: true });
  const hs = housesFor(sim);
  assert.ok(hs.length >= 40, `${hs.length} hus`);
  // villaraden längs gamla landsvägen (huvudvägen in före 57:s nya sträckning) och villorna på Barrstigen
  for (const [id, n0] of [['gamla-landsvagen-4', 8], ['barrstigen-5', 4]]) {
    const n = hs.filter(h => distPolyline(h.x, h.z, road(id).pts) < 16).length;
    assert.ok(n >= n0, `${id}: ${n} hus`);
  }
  assert.ok(!hs.some(h => h.id === BASE_ID), 'basen går inte att besätta');
  // en grupp i ett hus vid gamla landsvägen, och hordens vägar ändras inte av det
  const h = hs.filter(q => q.kind === 'villa').sort((a, b) => distPolyline(a.x, a.z, road('gamla-landsvagen-4').pts) - distPolyline(b.x, b.z, road('gamla-landsvagen-4').pts))[0];
  sim.maxSquads = 9;
  const before = sim.route.paths(['w57']).map(q => q.cells.join());
  assert.ok(build(sim, h.cells[0], 'inf').ok && sim.guns[0].house, 'gruppen i huset');
  assert.deepEqual(sim.route.paths(['w57']).map(q => q.cells.join()), before);
  // Psg 90 på villataket närmast rondellen och på radhusen
  for (const pick of [s => PERCH_IDS.has(s.id), s => s.kind === 'row']) {
    const i = SHAPES.findIndex(pick), k = [...Array(p.n).keys()].find(q => p.bldg[q] === i + 1 && p.perch[q]);
    assert.ok(k != null && p.roof[k] > 3, SHAPES[i].id);
    assert.ok(checkSpot(createSim({ map: vr, day: 1, cash: 99999 }), k, 'psg90').ok, `${SHAPES[i].id}: Psg 90`);
  }
});

test('kampanjens dag i båda grenarna av Laxne-valet: 13 efter FALL BACK, 14 efter DEFEND LAXNE', () => {
  assert.equal(campaignDayOf(ID, 1), 13);
  assert.equal(campaignDayOf(ID, 1, { laxne: 'fallback' }), 13);
  assert.equal(campaignDayOf(ID, 1, { laxne: 'defend' }), 14);
  assert.equal(campaignDayOf(ID, 2), null);
  try {
    setChoices({ laxne: 'defend' });
    assert.equal(shownDay(ID, 1), 14);
    setChoices({ laxne: 'fallback' });
    assert.equal(shownDay(ID, 1), 13);
  } finally { setChoices({}); }
  for (const [opt, n] of [['fallback', 13], ['defend', 14]]) {
    const q0 = afterBjornlunda(opt);
    assert.equal(sectorStatus(q0, 'bjornlunda'), 'held', opt);
    assert.equal(mapUnlocked(q0, ID), true, opt);
    const nb = nextBattle(q0);
    assert.deepEqual([nb.map, nb.day, nb.n], [ID, 1, n], opt);
    assert.equal(progressDay(q0, ID), n, opt);
    assert.equal(orderSheet(ID, 1, q0).valid, `Day ${n}`, opt);
    // truppen från Björnlunda följer med, och ledningens Ksp 88
    assert.ok(unitsIn(q0, ID).length >= 20, `${opt}: ${unitsIn(q0, ID).length} enheter`);
    assert.ok(unitsIn(q0, ID).some(u => u.type === 'm2' && u.rel === 'vr-1'), `${opt}: Ksp 88`);
    assert.equal(unitsIn(q0, 'bjornlunda').length, 0, `${opt}: ingen kvar i Björnlunda`);
  }
  // före Björnlunda dag 12 är rondellen stängd
  const early = debugReach(newCampaign(), 'bjornlunda', 2);
  assert.equal(mapUnlocked(early, ID), false);
  assert.equal(sectorStatus(early, ID), 'locked');
});

test('kampanjens slut tills Västerkärv finns: rondellen hållen, inget nästa slag, slutbladet säger "To be continued."', () => {
  const q = win(afterBjornlunda('fallback'), ID, 1);
  assert.equal(sectorStatus(q, ID), 'held');
  assert.equal(nextBattle(q), null);
  assert.ok(!MAPS[vr.outro.next], 'Västerkärv är inte byggd');
  assert.equal(vr.outro.next, 'vasterkarv');
  const pile = missionPiles(q).find(x => x.sector === ID);
  assert.ok(pile.closed);
  const end = pile.sheets.at(-1);
  assert.equal(end.kind, 'closed');
  assert.match(end.text, /To be continued\./);
  // ledningens meddelande när sektorn stängs är outrot
  assert.ok(q.op.inbox.some(m => m.id === 'closed-' + ID && /Västerkärv/.test(m.text)));
});

test('kopplingen: bordets markör och mottagare, sektorn, leveransen, inlärningen (inget nytt), Quick jump', () => {
  assert.ok(SECTOR_TABLE[ID]?.place === 'rondell' && PLACES.rondell);
  // markören strax väster om Gnesta
  assert.ok(PLACES.rondell[0] < PLACES.gnesta[0] && Math.abs(PLACES.rondell[1] - PLACES.gnesta[1]) < 0.01);
  assert.equal(ADDRESSEE[ID], 'Commander, Gnesta');
  assert.ok(SECTORS.find(s => s.id === ID)?.maps.includes(ID));
  const rel = RELEASES.filter(x => x.map === ID);
  assert.deepEqual(rel.map(r => r.id), ['vr-1']);
  for (const r of rel) { assert.ok(words(r.text) <= 20, r.id); assert.doesNotMatch(r.text, /—/); }
  assert.ok(rel[0].adopt);
  const i = STAGES.findIndex(s => s.id === 'vr-1');
  assert.ok(i > STAGES.findIndex(s => s.id === 'bl-2'));
  assert.deepEqual(STAGES[i].adds, []);
  assert.ok(!LESSONS['vr-1']);
  assert.deepEqual([...featuresFor(ID, 1)].sort(), [...featuresFor('bjornlunda', 2)].sort());
  assert.match(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /\['gnesta-vastra-rondell', 1\]/);
  assert.match(readFileSync(new URL('../src/ui/debug.js', import.meta.url), 'utf8'), /'gnesta-vastra-rondell': 'Rondell'/);
  // hoppet till rondellen utan val: FALL BACK, och truppen balansen räknar med
  const q = debugReach(newCampaign(), ID, 1);
  assert.equal(choiceOf(q, 'laxne'), 'fallback');
  assert.deepEqual(unitsIn(q, ID).map(u => [u.type, u.level]), ARRIVAL_TROOP[ID].units.map(([t, l]) => [t, l]));
  // src/ui/table.js och src/ui/choice.js rörs inte
  for (const f of ['../src/ui/table.js', '../src/ui/choice.js']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /rondell/i, f);
});

// 0.23.1 (Björnlunda): kameran i söder, väster till vänster på skärmen. Samma här: förtrupperna kommer från vänster.
test('kameran: väster till vänster, ingångarna till vänster om basen', () => {
  assert.equal(vr.camera.yaw, 0);
  try {
    setCameraYaw(0);
    const { right } = screenAxes();
    const sx = ([x, z]) => x * right[0] + z * right[2];
    for (const s of SPAWNS) assert.ok(sx(s.at) < sx(vr.base.at) - 100, s.id);
  } finally { setCameraYaw(45); }
});

// Balansen (docs/balance-log.md, Västra rondellen 0.25.0). Spelaren kommer med det kartläsaren har efter Björnlunda.
const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const run = (pol, choice) => SEEDS.map(s => vastraRondellCampaign(pol, { seedOffset: s, maxAttempts: 6, choice }));
const skilled = run('vrSkilled', 'fallback'), normal = run('vrNormal', 'fallback'), near = run('vrNear', 'fallback');
const dSkilled = run('vrSkilled', 'defend'), dNormal = run('vrNormal', 'defend');

test('balans: kartläsaren vinner på första försöket, den vanliga spelaren och den vid basen inom tre, i båda grenarna', () => {
  for (const [name, rs] of [['FALL BACK', skilled], ['DEFEND', dSkilled]]) for (const [i, r] of rs.entries()) {
    assert.equal(r.stuck, null, `vrSkilled ${name} seed ${i}`);
    assert.deepEqual(vrAttempts(r.log), [1], `vrSkilled ${name} seed ${i}`);
  }
  for (const [name, rs] of [['vrNormal FALL BACK', normal], ['vrNear FALL BACK', near], ['vrNormal DEFEND', dNormal]]) for (const [i, r] of rs.entries()) {
    const a = vrAttempts(r.log);
    assert.equal(r.stuck, null, `${name} seed ${i}: ${a}`);
    assert.ok(a[0] >= 1 && a[0] <= 3, `${name} seed ${i}: ${a}`);
  }
});

// En känselspröt, inte ett slag till sista man: kortare än Björnlunda (fem till sju minuter), högst cirka 120 levande och
// högst två vågor ute. Den vanliga spelaren känner av den (basen tar skada), kartläsaren knappt.
test('balans: dagen fem till sex minuter, högst cirka 120 levande, och basen tar skada för den vanliga spelaren', () => {
  const all = [skilled, normal, near, dSkilled, dNormal].flat().flatMap(r => r.log);
  for (const x of all) assert.ok(x.peakWaves <= 2 && x.peak <= 120, `${x.peakWaves} vågor, ${x.peak} levande`);
  for (const x of all.filter(q => q.won)) assert.ok(x.time >= 270 && x.time <= 380, `${x.time} s`);
  const firstWins = normal.map(r => r.log.find(x => x.won));
  assert.ok(firstWins.some(x => x.baseHp < vr.baseHp - 5), `basen efter vinsten: ${firstWins.map(x => x.baseHp)}`);
});

test('hoppet till rondellen (Quick jump) har truppen och forskningen balansen räknar med', () => {
  const a = vastraRondellArrival(0);
  assert.deepEqual(ARRIVAL_TROOP[ID].units, unitsIn(a, ID).map(u => [u.type, u.level, u.men ?? null, u.wins ?? 0]), 'kör om balansen och skriv in truppen i src/data/arrival.js');
  assert.deepEqual(ARRIVAL_TROOP[ID].research, a.research);
});

// Kvittot. Ett ändrat steg ska vara avsiktligt och förklarat i docs/balance-log.md (Västra rondellen).
// 0.25.0 (H559): första kvittot, hp 16, fart 1,3, ankomsten efter Björnlunda med kartläsaren (blSkilled) och Ksp 88 (vr-1).
const pr = rs => vrPrints([].concat(...rs.map((r, i) => r.log.map(x => ({ ...x, seed: i })))));
test('balans: fingeravtrycket (vrSkilled och vrNormal, båda grenarna)', () => {
  assert.deepEqual(pr(skilled), { [`${ID} 1`]: '173f0d61' });
  assert.deepEqual(pr(normal), { [`${ID} 1`]: '34385450' });
  assert.deepEqual(pr(dSkilled), { [`${ID} 1`]: 'b4a8a6b4' });
  assert.deepEqual(pr(dNormal), { [`${ID} 1`]: '0ccd55f4' });
});
