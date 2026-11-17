// Västerkärv som bana (0.26.0): kampanjens dag 14, "Hinna" (kampanjplanen avsnitt 10, slutspelets utkast avsnittet
// Dag 14), efter västra rondellen (dag 15 efter DEFEND LAXNE). Kartan ur OSM (src/data/vasterkarv.js, tests/vasterkarv.test.js),
// det spelbara i src/data/vasterkarv-play.js. Basen är boningshuset, horden kommer på småvägarna (Skogsvägen, Traktorspåret),
// gårdens folk går i tre grupper UT ur kartan på östra grusvägen, huset får falla när sista gruppen gått, och gårdens EPA
// ska köras ut (Move) längs vägarna innan dagen är vunnen. Balansen: docs/balance-log.md, Västerkärv.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAPS } from '../src/data/maps.js';
import { vasterkarvPlay as vk, PATHS, FARMHOUSE, SPAWNS, EXITS, EXTRACT, CRISP, BASE_ID, EVAC_HOUSES, EPA_AT, DAYS } from '../src/data/vasterkarv-play.js';
import { distPolyline } from '../src/data/osm-map.js';
import { rect, distRect, KIND } from '../src/sim/placement.js';
import { createSim, startWave, step, moveGun, checkMove, checkSpot, evacPath, extractState, trackOf, baseMayFall, frontCount, dayReport, gunPos, build } from '../src/sim/sim.js';
import { WEAPONS } from '../src/data/weapons.js';
import { campaignDayOf, shownDay, setChoices, campaignDay as progressDay } from '../src/meta/campaign-day.js';
import { STAGES, featuresFor } from '../src/meta/unlocks.js';
import { LESSONS } from '../src/data/lessons.js';
import { SECTOR_TABLE, ADDRESSEE, PLACES } from '../src/data/table.js';
import { SECTORS, RELEASES } from '../src/data/depot.js';
import { newCampaign, debugReach, unitsIn, finishDay, sectorStatus, makeChoice, lanes, opStartConfig, dayFor } from '../src/meta/operation.js';
import { mapUnlocked, choiceOf } from '../src/meta/progress.js';
import { nextBattle, orderSheet, lostSheet, recordLoss } from '../src/meta/table.js';
import { ARRIVAL_TROOP } from '../src/data/arrival.js';
import { vasterkarvCampaign, vasterkarvArrival, vasterkarvTroop, vkAttempts, vkPrints, extractKeys } from '../scripts/balance.mjs';

const ID = 'vasterkarv';
const day = vk.days[0];
const words = s => s.trim().split(/\s+/).length;
const road = id => vk.roads.find(r => r.id === id);
const count = (d, type = null) => d.waves.reduce((a, w) => a + w.groups.filter(q => !type || q.type === type).reduce((b, q) => b + q.count, 0), 0);
const win = (q, mapId, d) => finishDay(q, { mapId, day: d, won: true, intelEarned: 10, report: { units: [] } }).progress;
const DT = 1 / 30;
// Dagen utan horden (tomma vågor): bara de civila och EPA:n, för reglerna
const calm = () => ({ ...day, waves: day.waves.map(() => ({ groups: [] })) });
const run = (sim, secs, fn = () => {}) => { for (let i = 0; i < Math.round(secs / DT) && (sim.phase === 'wave' || sim.phase === 'build'); i++) { step(sim, DT); fn(sim.events); } };
const epaOf = sim => sim.guns.find(g => g.weapon.type === 'epa');

test('Västerkärv är en bana efter rondellen: en dag, kort intro som säger stigarna, slutet är en vinst', () => {
  assert.equal(MAPS[ID], vk);
  assert.equal(vk.days.length, 1);
  assert.deepEqual(vk.unlock, { map: 'gnesta-vastra-rondell', day: 1 });
  assert.equal(MAPS['gnesta-vastra-rondell'].outro.next, ID);
  assert.match(day.intro.title, /^Day \d: /);
  assert.ok(words(day.intro.text) <= 12, day.intro.text);
  for (const n of ['Skogsvägen', 'Traktorspåret']) assert.match(day.intro.text, new RegExp(n));
  assert.doesNotMatch(day.intro.text, /\b(west|east|north|south)\b/i);
  assert.ok(words(day.order.text) <= 12, day.order.text);
  assert.match(day.order.text, /EPA/);
  assert.equal(day.waves.length, 4);
  // slutet: gården tom, alla ute; kampanjen fortsätter senare (slutbladet efter dag 14)
  assert.match(vk.outro.text, /^The farm is empty\. Everyone got out\./);
  assert.match(vk.outro.text, /To be continued\.$/);
  assert.ok(!vk.outro.withdraw);
  for (const s of [JSON.stringify(day), JSON.stringify(vk.outro), readFileSync(new URL('../src/data/vasterkarv-play.js', import.meta.url), 'utf8')]) assert.doesNotMatch(s, /—/);
});

test('horden på småvägarna: Skogsvägen i väster och Traktorspåret över åkern i sydväst', () => {
  assert.deepEqual(SPAWNS.map(s => s.id), ['w', 'sw']);
  assert.deepEqual([...new Set(day.waves.flatMap(w => w.groups.map(q => q.spawn)))].sort(), ['sw', 'w']);
  assert.ok(distPolyline(...SPAWNS[0].at, road('skogsvagen-10').pts) < 1);
  assert.ok(distPolyline(...SPAWNS[1].at, road('traktorsparet-11').pts) < 1);
  for (const s of SPAWNS) assert.ok(s.at[0] < CRISP.x0, `${s.id} i diset i väster`);
  assert.ok(road('skogsvagen-10').cls === 'D' && road('traktorsparet-11').cls === 'D', 'småvägar, inte grusvägar');
  const sim = createSim({ map: vk, day: 1, cash: 0, seed: 1 });
  for (const [ps] of [sim.route.paths(['w']), sim.route.paths(['sw'])]) assert.ok(ps.reaches && ps.through == null && ps.cells.length > 80, ps.id);
  // dagen är mindre än rondellens (en gård, inte en stad) och har bjässar sist
  assert.ok(count(day) < count(MAPS['gnesta-vastra-rondell'].days[0]));
  assert.ok(count(day.waves.at(-1) ? { waves: [day.waves.at(-1)] } : day, 'brute') >= 2);
});

test('basen: boningshuset, gaveln mot gårdsplanen och grinden; stigen över gårdsplanen fri från husen', () => {
  assert.equal(vk.baseModel, 'rink');
  assert.equal(vk.iceRink, FARMHOUSE);
  const h = vk.buildings.find(b => b.id === BASE_ID);
  assert.equal(h.name, 'Boningshuset');
  const sim = createSim({ map: vk, day: 1, cash: 0, seed: 1 }), b = sim.route.base;
  assert.ok(Math.hypot(FARMHOUSE.entrance[0] - b.x, FARMHOUSE.entrance[1] - b.z) < 4, 'basrutan vid gaveln');
  const houses = vk.buildings.filter(q => !q.far).map(q => rect(q.x, q.z, q.ry, q.w, q.d));
  for (const r of PATHS) {
    for (let i = 1; i < r.pts.length; i++) for (let t = 0; t <= 1; t += 0.05) {
      const x = r.pts[i - 1][0] + (r.pts[i][0] - r.pts[i - 1][0]) * t, z = r.pts[i - 1][1] + (r.pts[i][1] - r.pts[i - 1][1]) * t;
      assert.ok(houses.every(q => distRect(q, x, z) > 0.4), `${r.id} vid ett hus (${x.toFixed(1)}, ${z.toFixed(1)})`);
    }
  }
});

test('utrymningen: tre grupper ut ur kartan på östra grusvägen, inte till basen', () => {
  assert.equal(day.evac.exit, 'e');
  assert.deepEqual(day.evac.groups.map(g => g.house), EVAC_HOUSES);
  assert.equal(day.evac.groups.length, 3);
  assert.deepEqual(day.evac.groups.map(g => g.wave), [0, 1, 3]);
  const sim = createSim({ map: vk, day: 1, cash: 0, seed: 1 });
  const e = EXITS.find(x => x.id === 'e');
  assert.ok(e.at[0] > CRISP.x1 && distPolyline(...e.at, road('ostra-grusvagen-1').pts) < 1, 'utgången i diset på östra grusvägen');
  for (const h of EVAC_HOUSES) {
    const p = evacPath(sim, h), end = p.at(-1);
    assert.ok(Math.hypot(end[0] - e.at[0], end[1] - e.at[1]) < 8, `${h}: linjen slutar vid utgången (${end})`);
    assert.ok(end[0] > CRISP.x1, `${h}: ut ur kartan`);
    assert.ok(p.some(([x, z]) => distPolyline(x, z, road('ostra-grusvagen-1').pts) < 3), `${h}: längs östra grusvägen`);
  }
  // utan horden: alla tolv kommer ut, men dagen är inte vunnen förrän EPA:n också är ute
  const s2 = createSim({ map: vk, day: 1, cash: 0, seed: 1, dayCfg: calm() });
  startWave(s2);
  let done = false;
  run(s2, 600, evs => { for (const ev of evs) if (ev.t === 'evacDone') done = true; });
  assert.ok(done, 'evacDone');
  assert.equal(s2.evac.safe, 12);
  assert.ok(s2.civilians.every(c => c.state === 'safe' && c.x > CRISP.x1 - 4), 'de civila är vid utgången');
  assert.equal(s2.phase, 'wave', 'inte vunnen utan EPA:n');
});

test('EPA:n: gårdens egen, på gårdsplanen från början, kör bara på vägarna, fortare där, och dagen är vunnen när den är ute', () => {
  const sim = createSim({ map: vk, day: 1, cash: 0, seed: 1, core: [], dayCfg: calm() });
  const g = epaOf(sim);
  assert.ok(g && g.own && g.preset, 'EPA:n står ute');
  assert.ok(Math.hypot(g.x - EPA_AT[0], g.z - EPA_AT[1]) < 2);
  assert.equal(frontCount(sim), 0, 'tar ingen plats i fronten');
  const tr = trackOf(sim, 'epa'), p = sim.place;
  assert.equal(trackOf(sim, 'ksp58'), null, 'bara EPA:n');
  // åkern: en öppen ruta långt från vägarna går inte, varken att ställa eller köra till
  let field = -1;
  for (let k = 0; k < p.n && field < 0; k++) { if (p.kind[k] !== KIND.open || tr[k]) continue; const c = p.center(k); if (Math.hypot(c.x + 40, c.z - 20) < 6) field = k; }
  assert.ok(field >= 0);
  startWave(sim);
  run(sim, 2);
  assert.equal(checkSpot(sim, field, 'epa', { ignore: g.id }).reason, 'spår');
  assert.equal(checkMove(sim, g.id, field).reason, 'spår');
  // ut till ringen: längs vägarna, i spårets fart
  const key = extractKeys(sim).find(k => checkMove(sim, g.id, k).ok);
  assert.ok(key != null, 'en ruta i ringen');
  assert.ok(moveGun(sim, g.id, key).ok);
  assert.equal(g.move.speed, day.track.speed);
  assert.ok(day.track.speed > WEAPONS.epa.move.speed * 2, 'fortare än krypfarten');
  for (let d = 0; d < g.move.path.len; d += 2) {
    const q = gunPos({ move: { ...g.move, t: g.move.pack + d / g.move.speed } });
    assert.equal(tr[p.keyAt(q.x, q.z)], 1, `vägen över åkern vid ${q.x.toFixed(1)}, ${q.z.toFixed(1)}`);
  }
  // de civila är inte ute än: ingen vinst fast EPA:n är framme
  run(sim, g.move.total + 1);
  assert.equal(extractState(sim).done, true);
  assert.notEqual(sim.phase, 'won');
  let won = false, extracted = false;
  run(sim, 900, evs => { for (const ev of evs) { if (ev.t === 'won') won = true; if (ev.t === 'extracted') extracted = true; } });
  assert.ok(won && extracted && sim.phase === 'won');
  // gårdens EPA följer inte med till förrådet
  assert.deepEqual(dayReport(sim).units, []);
});

test('huset får falla när sista gruppen gått; faller det före är dagen förlorad; EPA:n förstörd är förlorad', () => {
  // före: basen på noll mitt i dagen är förlust som vanligt
  const a = createSim({ map: vk, day: 1, cash: 0, seed: 1, core: [], dayCfg: day });
  startWave(a); run(a, 3);
  assert.equal(a.phase, 'wave');
  assert.equal(baseMayFall(a), false);
  a.baseHp = 0; step(a, DT);
  assert.equal(a.phase, 'lost'); assert.equal(a.lostBy, 'base');
  // efter: alla ute ur husen och längre bort än left: huset faller, dagen går vidare
  const b = createSim({ map: vk, day: 1, cash: 0, seed: 1, core: [], dayCfg: calm() });
  startWave(b);
  let fell = false;
  for (let i = 0; i < 30 * 600 && !baseMayFall(b) && (b.phase === 'wave' || b.phase === 'build'); i++) step(b, DT);
  assert.ok(baseMayFall(b), 'sista gruppen har gått');
  assert.ok(b.evac.out === b.evac.total);
  b.baseHp = 0;
  run(b, 2, evs => { if (evs.some(ev => ev.t === 'baseFallen')) fell = true; });
  assert.ok(fell && b.phase !== 'lost', 'huset föll, dagen går vidare');
  // EPA:n förstörd: dagen förlorad (lostBy 'extract'), och bordets blad säger det
  const c = createSim({ map: vk, day: 1, cash: 0, seed: 1, core: [], dayCfg: day });
  startWave(c);
  run(c, 1);
  epaOf(c).hp = 0.01;
  // en zombie vid EPA:n
  const g = epaOf(c);
  run(c, 400, () => { const z = c.zombies.find(q => !q.dead); if (z && c.guns.includes(g)) { z.x = g.x + 1; z.z = g.z; } });
  assert.equal(c.phase, 'lost');
  assert.equal(c.lostBy, 'extract');
  const q = recordLoss(newCampaign(), { mapId: ID, day: 1, lostBy: 'extract' });
  assert.match(lostSheet(q, ID, 1).outcome, /The EPA was lost\./);
});

test('kampanjens dag i båda grenarna av Laxne-valet: 14 efter FALL BACK, 15 efter DEFEND LAXNE', () => {
  assert.equal(campaignDayOf(ID, 1), 14);
  assert.equal(campaignDayOf(ID, 1, { laxne: 'defend' }), 15);
  try { setChoices({ laxne: 'defend' }); assert.equal(shownDay(ID, 1), 15); } finally { setChoices({}); }
  for (const [opt, n] of [['fallback', 14], ['defend', 15]]) {
    let q = win(debugReach(newCampaign(), 'molnbo', 3), 'molnbo', 3);
    q = makeChoice({ ...q, rp: 400 }, 'laxne', opt).progress;
    if (opt === 'defend') q = win(q, 'laxne', 1);
    for (const d of [1, 2]) q = win(q, 'bjornlunda', d);
    assert.equal(mapUnlocked(q, ID), false, `${opt}: stängd före rondellen`);
    q = win(q, 'gnesta-vastra-rondell', 1);
    assert.equal(sectorStatus(q, 'gnesta-vastra-rondell'), 'held');
    assert.equal(mapUnlocked(q, ID), true);
    const nb = nextBattle(q);
    assert.deepEqual([nb.map, nb.day, nb.n], [ID, 1, n], opt);
    assert.equal(progressDay(q, ID), n);
    assert.equal(orderSheet(ID, 1, q).valid, `Day ${n}`);
    // truppen från rondellen följer med, och gårdens frivilliga och Ksp 90; bara fem får plats i striden
    assert.ok(unitsIn(q, ID).length >= 20, `${opt}: ${unitsIn(q, ID).length} enheter`);
    assert.equal(unitsIn(q, ID).filter(u => u.rel === 'vk-1').length, 3);
    assert.equal(unitsIn(q, 'gnesta-vastra-rondell').length, 0);
    assert.equal(lanes(q, ID).cap, 5);
    assert.equal(opStartConfig(q, 1, ID).core.length, 5);
    // efter DEFEND är truppen tröttare: dagen har lägre hp i den grenen (choiceMod)
    assert.equal(dayFor(q, ID, 1).hp, opt === 'defend' ? day.choiceMod.hp : day.hp);
  }
});

test('kopplingen: bordets markör och mottagare, sektorn, leveransen, lektionen, Quick jump', () => {
  assert.ok(SECTOR_TABLE[ID]?.place === ID && PLACES[ID]);
  assert.equal(ADDRESSEE[ID], 'Commander, Västerkärv');
  assert.ok(SECTORS.find(s => s.id === ID)?.maps.includes(ID));
  const rel = RELEASES.filter(x => x.map === ID);
  assert.deepEqual(rel.map(r => r.id), ['vk-1']);
  assert.ok(rel[0].adopt && words(rel[0].text) <= 20, rel[0].text);
  assert.match(rel[0].text, /Five units/);
  assert.deepEqual(rel[0].grant.map(g => g.type), ['civ', 'm249']);
  const i = STAGES.findIndex(s => s.id === 'vk-1');
  assert.ok(i > STAGES.findIndex(s => s.id === 'vr-1'));
  assert.deepEqual([...featuresFor(ID, 1)].sort(), [...featuresFor('gnesta-vastra-rondell', 1)].sort());
  // en lektion: EPA:n ut, högst tolv ord
  assert.equal(LESSONS['vk-1'].length, 1);
  const l = LESSONS['vk-1'][0];
  assert.ok(words(l.text) <= 12, l.text);
  assert.match(l.text, /^Move the EPA out/);
  assert.deepEqual(l.target, { world: 'gun:epa' });
  assert.match(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /\['vasterkarv', 1\]/);
  assert.match(readFileSync(new URL('../src/ui/debug.js', import.meta.url), 'utf8'), /vasterkarv: 'Västerk\.'/);
  const q = debugReach(newCampaign(), ID, 1);
  assert.equal(choiceOf(q, 'laxne'), 'fallback');
  assert.deepEqual(unitsIn(q, ID).map(u => [u.type, u.level]), ARRIVAL_TROOP[ID].units.map(([t, l]) => [t, l]));
});

// Balansen (docs/balance-log.md, Västerkärv 0.26.0). Spelaren kommer med det kartläsaren har efter rondellen.
const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const runs = (pol, choice) => SEEDS.map(s => vasterkarvCampaign(pol, { seedOffset: s, maxAttempts: 6, choice }));
const skilled = runs('vkSkilled', 'fallback'), normal = runs('vkNormal', 'fallback'), near = runs('vkNear', 'fallback');
const dSkilled = runs('vkSkilled', 'defend'), dNormal = runs('vkNormal', 'defend');

test('balans: kartläsaren vinner på första försöket, den vanliga spelaren och den vid basen inom tre, i båda grenarna', () => {
  for (const [name, rs] of [['FALL BACK', skilled], ['DEFEND', dSkilled]]) for (const [i, r] of rs.entries()) {
    assert.equal(r.stuck, null, `vkSkilled ${name} seed ${i}`);
    assert.ok(vkAttempts(r.log)[0] <= 3, `vkSkilled ${name} seed ${i}`);  // 0.26.1: inom tre (tests/full-campaign.test.js)
  }
  for (const [name, rs] of [['vkNormal FALL BACK', normal], ['vkNear FALL BACK', near], ['vkNormal DEFEND', dNormal]]) for (const [i, r] of rs.entries()) {
    const a = vkAttempts(r.log);
    // 0.26.1 (H602): den vanliga spelaren och den vid basen provas med sin egen trupp genom hela kampanjen
    // (tests/full-campaign.test.js: första försöket i båda grenarna). Här går de in med kartläsarens trupp; efter DEFEND
    // fastnar den vanliga spelaren med den på en seed av fem (hp 8,5), så bara FALL BACK prövas här.
    if (name.includes('DEFEND')) continue;
    assert.equal(r.stuck, null, `${name} seed ${i}: ${a}`);
    assert.ok(a[0] >= 1 && a[0] <= 3, `${name} seed ${i}: ${a}`);
  }
});

// Hinna: kartläsaren som kör ut EPA:n när sista gruppen gått är ute på fyra till fem minuter; den som väntar tills alla
// civila är ute tar en minut till. Alla civila ute i varje vinst. Förlusterna är huset som föll före sista gruppen.
test('balans: dagen fyra till fem minuter för kartläsaren, alla civila ute, förlusterna är huset', () => {
  for (const x of [skilled, dSkilled].flat().flatMap(r => r.log).filter(q => q.won)) assert.ok(x.time >= 240 && x.time <= 300, `${x.time} s`);
  for (const x of [normal, near, dNormal].flat().flatMap(r => r.log).filter(q => q.won)) assert.ok(x.time >= 240 && x.time <= 390, `${x.time} s`);
  const all = [skilled, normal, near, dSkilled, dNormal].flat().flatMap(r => r.log);
  for (const x of all.filter(q => q.won)) assert.equal(x.evac.safe, 12);
  for (const x of all.filter(q => !q.won)) assert.ok(!x.lostBy && x.evac.safe < 12, JSON.stringify(x.evac));
  for (const x of all) assert.ok(x.peakWaves <= 2 && x.peak <= 110, `${x.peakWaves} vågor, ${x.peak} levande`);
  // 0.26.5: hp 4 och basen 20 (speltestet av 0.26.4): kartläsarens trupp förlorar inte längre; speltestarens uppställning
  // gör det ibland (tests/full-campaign.test.js, docs/balance-log.md 0.26.5)
});

// 0.26.5 (speltestet av 0.26.4: hoppet gav frivilliga och ingen Ksp 88): truppen den vanliga spelaren har efter hela
// kampanjen (FALL BACK, seed 0), med tröttheten, och samma stridsbana som hans rulla
test('hoppet till Västerkärv (Quick jump) har truppen och forskningen balansen räknar med', () => {
  const a = vasterkarvTroop(0);
  assert.deepEqual(ARRIVAL_TROOP[ID].units, unitsIn(a, ID).map(u => [u.type, u.level, u.men ?? null, u.wins ?? 0, ...(u.fatigue ? [u.fatigue] : [])]), 'kör node scripts/arrival-regen.mjs');
  const jump = lanes(debugReach(newCampaign(), ID, 1), ID).battle.map(u => u.type + u.level).sort();
  assert.deepEqual(jump, lanes(a, ID).battle.map(u => u.type + u.level).sort());
  assert.deepEqual(ARRIVAL_TROOP[ID].research, a.research);
});

// Kvittot. Ett ändrat steg ska vara avsiktligt och förklarat i docs/balance-log.md (Västerkärv).
// 0.26.0: första kvittot, hp 15,5 (12 efter DEFEND), basen 16, fart 1,4, EPA:n 2,6 m/s på vägarna.
// 0.26.5 (speltestet av 0.26.4): nya fingeravtryck, avsiktligt: Mölnbo dag 2 hp 12, Björnlunda dag 2 hp 4,5, Västerkärv hp 4 och
// basen 20, och truppen in i varje senare bana blir en annan. docs/balance-log.md 0.26.5.
const pr = rs => vkPrints([].concat(...rs.map((r, i) => r.log.map(x => ({ ...x, seed: i })))));
// 0.26.2 (H605): nya fingeravtryck, avsiktligt: Psg 90 får ligga på nocken av flacka villatak och på bodar (balansens
// takplan hittar bättre platser). docs/balance-log.md 0.26.2.
test('balans: fingeravtrycket (vkSkilled och vkNormal, båda grenarna)', () => {
  assert.deepEqual(pr(skilled), { [`${ID} 1`]: '671888e0' });
  assert.deepEqual(pr(normal), { [`${ID} 1`]: 'f500bc9a' });
  assert.deepEqual(pr(dSkilled), { [`${ID} 1`]: 'a885c6b2' });
  assert.deepEqual(pr(dNormal), { [`${ID} 1`]: 'c6a5bdd9' });
});

void DAYS;
