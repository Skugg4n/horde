// Operation Södermanland (0.14.0): leveranser, rekvisition, kärntrupper, RP och trycket.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, finishDay, requisition, canRequisition, levelUp, refill, refillCost, returnUnit, reassign, releasedTypes, opStartConfig,
  rpForAttempt, attemptFactor, lossesOf, canReturn, stockOf, sectorStatus, buyUpgrade, upgradeState, unitsIn, vetOf, debugReach, syncOperation, PRESSURE_HP } from '../src/meta/operation.js';
import { mapState, mapUnlocked, abandonDay } from '../src/meta/progress.js';
import { UNIT_RP, LEVEL_RP, REFILL_RP, VET_WINS } from '../src/data/depot.js';
import { createSim, build, startWave, step, upgrade, sell, reinforce, dayReport, buySupply, checkSpot, gunStats, deployPhase, placeAcross } from '../src/sim/sim.js';
import { buyState } from '../src/sim/buy.js';
import { placementFor, KIND } from '../src/sim/placement.js';
import { MAPS } from '../src/data/maps.js';
import { STRAIGHT } from './fixtures/straight-road.js';
import { SUPPLIES, VETERAN } from '../src/data/weapons.js';

// E4 utan dagens förberedelser (infanteriet vid bommen, de markerade platserna, den sena Ksp 90): mekaniken för sig.
const E4_PLAIN = { ...MAPS.riksvagen, days: MAPS.riksvagen.days.map(d => ({ ...d, preset: undefined, late: undefined, spots: undefined })) };
// Två skilda platser aktiva samtidigt finns inte i kampanjen än (E4 tystnar innan Hagstumosse öppnar): proven för
// omplaceringen och trycket öppnar E4 igen med egna enheter, som en senare sektor (Mölnbo) skulle vara.
// e4Day: E4:s nästa dag (3: en dag kvar, så att trycket där står kvar; 4: klar men inte tillbakadragen, så att
// Hagstumosse samtidigt är öppen och enheter kan skickas mellan dem).
const twoPlaces = (p, e4Day = 4) => ({ ...p, maps: { ...p.maps, riksvagen: { ...p.maps.riksvagen, unlockedDay: e4Day } }, op: { ...p.op, closed: p.op.closed.filter(id => id !== 'riksvagen'),
  units: [...p.op.units, ...[0, 1, 2].map(i => ({ uid: 800 + i, type: 'm249', level: 1, sector: 'riksvagen', wins: 0, spent: 0, granted: true }))] } });
const win = (p, mapId, day, report = { units: [] }) => finishDay(p, { mapId, day, won: true, intelEarned: 50, report }).progress;
const openSpots = (map, n) => { const pl = placementFor(map), out = []; for (let k = 0; k < pl.n && out.length < n; k++) if (pl.kind[k] === KIND.open && Math.abs(pl.center(k).z) < 12 && Math.abs(pl.center(k).x) < 20 && out.every(q => Math.hypot(pl.center(q).x - pl.center(k).x, pl.center(q).z - pl.center(k).z) > 8)) out.push(k); return out; };

test('ny kampanj: Försvarsmakten ger vägspärren på E4, ett meddelande i inkorgen', () => {
  const p = newCampaign();
  assert.equal(p.v, 4);
  assert.deepEqual(unitsIn(p, 'riksvagen').map(u => u.type), ['inf', 'm249', 'm249']);
  assert.deepEqual(releasedTypes(p, 'riksvagen'), ['inf', 'm249']);
  assert.equal(p.op.inbox.length, 1);
  assert.equal(p.op.inbox[0].from, 'FM');
  assert.equal(p.rp, 0);
});

test('leveranserna kommer pö om pö: Ksp 88 och pillboxen dag 3, och vägspärren tystnar efter dag 3', () => {
  let p = newCampaign();
  p = win(p, 'riksvagen', 1);
  assert.ok(!unitsIn(p, 'riksvagen').some(u => u.type === 'epa'), '0.16.0: dag 2 är taggtråden, ingen ny trupp');
  p = win(p, 'riksvagen', 2);
  assert.ok(unitsIn(p, 'riksvagen').some(u => u.type === 'm2'));
  assert.ok(unitsIn(p, 'riksvagen').some(u => u.type === 'epa'));
  // 0.16.0: förrådet är inte öppet på E4 (det kommer efter South dag 2)
  assert.equal(requisition({ ...p, rp: 1000 }, 'inf', 'riksvagen').reason, 'locked');
  p = win(p, 'riksvagen', 3);
  assert.equal(sectorStatus(p, 'riksvagen'), 'silent');
  assert.equal(unitsIn(p, 'riksvagen').length, 0, 'armén drar sig tillbaka');
  assert.deepEqual(unitsIn(p, 'gnesta').map(u => u.type), ['civ', 'civ', 'civ']);
  assert.deepEqual(releasedTypes(p, 'gnesta'), ['civ']);
  assert.equal(canRequisition(p, 'inf', 'gnesta').reason, 'locked');
  assert.ok(p.op.inbox.some(m => m.from === 'MCF'));
});

// 0.16.0 (Olas tillägg: knapphet i rekvisitionen): RP är priset, leveransernas lager är taket. Förrådet öppnar
// i inlärningens takt: nivåer efter South dag 2, rekvisition efter dag 3, Return och omplacering efter dag 4.
test('rekvisition ur lagret, nivå, påfyllnad, tillbaka till förrådet (cirka 50 %) och omplacering', () => {
  let p = { ...debugReach(newCampaign(), 'gnesta', 3), rp: 2000 };
  assert.equal(canRequisition(p, 'm249', 'gnesta').reason, 'locked', 'efter South dag 2 bara nivåer');
  const hv = unitsIn(p, 'gnesta').find(x => x.type === 'hv');
  assert.equal(levelUp(p, hv.uid).ok, true);
  p = { ...debugReach(newCampaign(), 'gnesta', 4), rp: 2000 };
  assert.equal(stockOf(p, 'gnesta', 'm249'), 1, 'en Ksp 90 släppt dag 3');
  const r = requisition(p, 'm249', 'gnesta');
  assert.equal(r.ok, true);
  p = r.progress;
  assert.equal(p.rp, 2000 - UNIT_RP.m249);
  assert.equal(stockOf(p, 'gnesta', 'm249'), 0);
  assert.equal(canRequisition(p, 'm249', 'gnesta').reason, 'none', 'inget mer släppt, hur mycket RP som helst');
  assert.equal(canRequisition(p, 'ksp58', 'gnesta').ok, true, 'Ksp 58 släppt dag 4');
  const u = p.op.units.find(x => x.uid === r.uid);
  p = levelUp(p, u.uid).progress;
  assert.equal(p.op.units.find(x => x.uid === r.uid).level, 2);
  assert.equal(p.rp, 2000 - UNIT_RP.m249 - LEVEL_RP.m249[0]);
  assert.equal(returnUnit(p, r.uid).reason, 'locked', 'Return kommer med sektorerna');
  // efter South dag 4: Return (tillbaka i lagret) och omplacering
  p = debugReach(p, 'gnesta', 5);
  const back = returnUnit(p, r.uid);
  assert.equal(back.refund, Math.round((UNIT_RP.m249 + LEVEL_RP.m249[0]) * 0.5));
  assert.equal(stockOf(back.progress, 'gnesta', 'm249'), stockOf(p, 'gnesta', 'm249') + 1, 'en rekvirerad enhet går tillbaka till lagret');
  // gruppen: nivå 2 ger en femte man; stupade fylls på för RP
  const g = unitsIn(p, 'gnesta').find(x => x.type === 'hv');
  p = levelUp(p, g.uid).progress;
  assert.equal(p.op.units.find(x => x.uid === g.uid).men, 5);
  p = { ...p, op: { ...p.op, units: p.op.units.map(x => (x.uid === g.uid ? { ...x, men: 2 } : x)) } };
  assert.equal(refillCost(p, p.op.units.find(x => x.uid === g.uid)), 3 * REFILL_RP.hv);
  p = refill(p, g.uid).progress;
  assert.equal(p.op.units.find(x => x.uid === g.uid).men, 5);
  // 0.16.0 (Olas beslut): Ishallen och Vikingavägen är samma sektor, Hagstumosse; ingen omplacering mellan dem
  const civ = p.op.units.find(x => x.type === 'civ');
  assert.equal(reassign(p, civ.uid, 'gnesta-norr').reason, 'same');
  assert.equal(reassign(p, civ.uid, 'riksvagen').ok, false);
});

test('förluster följer bara med vid vinst; förlust börjar om med samma styrka och behåller RP', () => {
  let p = newCampaign();
  const inf = unitsIn(p, 'riksvagen').find(u => u.type === 'inf');
  const ksp = unitsIn(p, 'riksvagen').find(u => u.type === 'm249');
  const report = { units: [{ uid: inf.uid, alive: 2 }, { uid: ksp.uid, destroyed: true }], lostMen: 2, lostUnits: 1 };
  const lost = finishDay(p, { mapId: 'riksvagen', day: 1, won: false, intelEarned: 60, report });
  assert.equal(lost.progress.rp, 60, 'RP behålls');
  assert.deepEqual(lost.progress.op.units, p.op.units, 'styrkan orörd');
  assert.equal(mapState(lost.progress, 'riksvagen').attempts[1], 1);
  const won = finishDay(lost.progress, { mapId: 'riksvagen', day: 1, won: true, intelEarned: 40, report }).progress;
  assert.equal(won.op.units.find(u => u.uid === inf.uid).men, 2);
  assert.equal(won.op.units.some(u => u.uid === ksp.uid), false, 'förlorad pjäs är borta');
});

test('RP: avtagande efter tredje försöket och bonus för snabb seger, få förluster och oskadad bas', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(attemptFactor), [1, 1, 1, 0.6, 0.4, 0.25, 0.25]);
  const plain = rpForAttempt({ base: 100, attempt: 1, won: true, report: {} });
  assert.equal(plain.total, 125, 'dödade och vågor plus uppdraget');
  const all = rpForAttempt({ base: 100, attempt: 1, won: true, report: { fast: true, fewLosses: true, baseIntact: true } });
  assert.equal(all.bonuses.length, 3);
  assert.ok(all.total > plain.total * 1.4);
  assert.equal(rpForAttempt({ base: 100, attempt: 4, won: false }).total, 60);
  // de civila räknas till uppdraget
  assert.equal(rpForAttempt({ base: 0, attempt: 1, won: true, evac: { safe: 15 } }).objective, 25 + 30);
});

test('erfarenhet: en stjärna efter tre vunna dagar ute, blygsamt bättre träff och omladdning', () => {
  let p = newCampaign();
  const inf = unitsIn(p, 'riksvagen').find(u => u.type === 'inf');
  for (let i = 0; i < VET_WINS; i++) p = finishDay(p, { mapId: 'riksvagen', day: Math.min(3, i + 1), won: true, intelEarned: 0, report: { units: [{ uid: inf.uid, alive: 4 }] } }).progress;
  // E4 har tystnat: enheten är borta, men räknaren fungerade fram till dess
  assert.equal(vetOf({ wins: VET_WINS }), 1);
  assert.equal(vetOf({ wins: VET_WINS - 1 }), 0);
  const sim = createSim({ map: E4_PLAIN, day: 1, cash: 0, core: [{ uid: 1, type: 'm249', level: 1, vet: 1 }, { uid: 2, type: 'm249', level: 1 }] });
  const [a, b] = openSpots(E4_PLAIN, 2);
  assert.equal(build(sim, a, 'm249', { uid: 1 }).ok, true);
  assert.equal(build(sim, b, 'm249', { uid: 2 }).ok, true);
  const s1 = gunStats(sim, sim.guns[0]), s2 = gunStats(sim, sim.guns[1]);
  assert.ok(Math.abs(s1.accuracy - s2.accuracy - VETERAN.accuracy) < 1e-9);
  assert.ok(Math.abs(s1.rate / s2.rate - VETERAN.rate) < 1e-9);
});

test('uppställningen: kärntrupperna ur reserven gratis före första vågen, inte efter; ingen handel med trupp i striden', () => {
  const sim = createSim({ map: E4_PLAIN, day: 1, cash: 500, core: [{ uid: 7, type: 'inf', level: 2, men: 3 }, { uid: 8, type: 'm249', level: 2 }] });
  const [a, b, c] = openSpots(E4_PLAIN, 3);
  assert.equal(buyState(sim, 'm249').state, 'ok');
  assert.equal(buyState(sim, 'm249').cost, 0);
  assert.equal(buyState(sim, 'ksp58').state, 'absent', 'inget i reserven');
  assert.equal(build(sim, a, 'm249').ok, true);
  assert.equal(sim.cash, 500, 'gratis');
  assert.equal(sim.guns[0].weapon.level, 2);
  assert.equal(checkSpot(sim, b, 'm249').reason, 'reserv');
  assert.equal(build(sim, b, 'inf').ok, true);
  assert.equal(sim.guns[1].soldiers.length, 3, 'förlusterna följer med');
  // i striden: ingen uppgradering, försäljning eller påfyllnad för kärntrupperna
  assert.equal(upgrade(sim, sim.guns[0].id).reason, 'depå');
  assert.equal(sell(sim, sim.guns[0].id).ok, false);
  assert.equal(reinforce(sim, sim.guns[1].id).ok, false);
  startWave(sim);
  assert.equal(deployPhase(sim), false);
  const sim2 = createSim({ map: E4_PLAIN, day: 1, cash: 0, core: [{ uid: 1, type: 'm249', level: 1 }] });
  startWave(sim2);
  assert.equal(checkSpot(sim2, c, 'm249').reason, 'uppställd');
  assert.equal(buyState(sim2, 'm249').state, 'absent');
});

test('förnödenheter: ammunition, sandsäckar och skrotbilar köps med pengarna i striden', () => {
  const sim = createSim({ map: MAPS.gnesta, day: 2, cash: 1000, core: [{ uid: 1, type: 'hv', level: 1, men: 4 }, { uid: 2, type: 'm249', level: 1 }] });
  const pl = sim.place;
  let built = 0;
  for (let k = 0; k < pl.n && built < 2; k++) if (pl.kind[k] === KIND.open) for (const t of ['hv', 'm249']) if (!sim.guns.some(g => g.weapon.type === t) && build(sim, k, t).ok) { built++; break; }
  assert.equal(built, 2);
  const hv = sim.guns.find(g => g.squad), gun = sim.guns.find(g => !g.squad);
  assert.equal(buySupply(sim, gun.id, 'sandbags').ok, false, 'sandsäckar bara för grupperna');
  assert.equal(buySupply(sim, hv.id, 'sandbags').ok, true);
  const before = gunStats(sim, gun).rate;
  assert.equal(buySupply(sim, gun.id, 'ammo').ok, true);
  assert.ok(Math.abs(gunStats(sim, gun).rate - before * SUPPLIES.ammo.rate) < 1e-9);
  assert.equal(buySupply(sim, gun.id, 'ammo').reason, 'redan');
  assert.equal(sim.cash, 1000 - SUPPLIES.sandbags.cost - SUPPLIES.ammo.cost);
  assert.equal(buyState(sim, 'car').state, 'ok');
  const cell = sim.route.cellAt(-45, 24);
  assert.equal(placeAcross(sim, cell, 'car').ok, true);
});

test('dagens rapport: stupade, förlorade enheter och bonusunderlaget', () => {
  const sim = createSim({ map: STRAIGHT, day: 1, cash: 0, core: [{ uid: 1, type: 'inf', level: 1, men: 4 }, { uid: 2, type: 'm249', level: 1 }] });
  const [a, b] = openSpots(STRAIGHT, 2);
  build(sim, a, 'inf'); build(sim, b, 'm249');
  sim.guns[0].soldiers[0].down = true;
  sim.guns.splice(1, 1);
  const r = dayReport(sim);
  assert.deepEqual(r.units, [{ uid: 1, alive: 3 }, { uid: 2, destroyed: true }]);
  assert.equal(r.lostMen, 1); assert.equal(r.lostUnits, 1);
  assert.equal(r.fewLosses, false);
  assert.equal(r.baseIntact, true);
});

test('trycket: faserna i Hagstumosse delar trupp och har inget tryck mellan sig; en annan plats blir svårare men faller aldrig', async () => {
  const { openSectors, currentMap, reassignActive } = await import('../src/meta/operation.js');
  let p = debugReach(newCampaign(), 'gnesta', 5);
  assert.equal(mapUnlocked(p, 'gnesta-norr'), false, 'Vikingavägen öppnar efter Ishallen dag 5');
  assert.deepEqual(openSectors(p), ['gnesta']);
  assert.equal(reassignActive(p), false, 'en plats: ingen omplacering');
  const before = unitsIn(p, 'gnesta').map(u => u.uid);
  p = win(p, 'gnesta', 5);
  assert.equal(mapUnlocked(p, 'gnesta-norr'), true);
  assert.equal(currentMap(p, 'gnesta'), 'gnesta-norr');
  assert.deepEqual(p.op.pressure, {}, 'inget tryck mellan faserna');
  assert.equal(sectorStatus(p, 'gnesta'), 'holding');
  for (const uid of before) assert.ok(unitsIn(p, 'gnesta-norr').some(u => u.uid === uid), 'trupperna följer med');
  assert.equal(opStartConfig(p, 1, 'gnesta-norr').hpMul, 1);
  // två skilda platser: den man inte strider i blir svårare, hotad, men faller aldrig
  let q = twoPlaces(p, 3);
  assert.equal(reassignActive(q), true, 'två skilda platser med dagar kvar: då syns omplaceringen');
  for (let i = 0; i < 9; i++) q = finishDay(q, { mapId: 'gnesta-norr', day: 1, won: true, intelEarned: 0, report: { units: [] } }).progress;
  assert.equal(sectorStatus(q, 'riksvagen'), 'threatened');
  assert.ok(q.op.pressure.riksvagen <= 5);
  void PRESSURE_HP;
});

test('förrådets uppgraderingar: bara för det man har, i ledningens takt', () => {
  let p = { ...newCampaign(), rp: 5000 };
  assert.equal(upgradeState(p, 'm249Rate').reason, 'locked', 'inget förråd på E4');
  p = { ...debugReach(p, 'gnesta', 5), rp: 5000 };
  assert.equal(upgradeState(p, 'm249Rate').ok, true, 'Ksp 90 rate I släppt dag 4');
  assert.equal(upgradeState(p, 'wireTough').ok, true);
  assert.equal(upgradeState(p, 'psg90').reason, 'locked', 'Psg 90 II inte släppt än');
  assert.equal(upgradeState(p, 'hvVeterans').reason, 'locked', 'inte släppt');
  p = buyUpgrade(p, 'm249Rate').progress;
  assert.ok(p.research.includes('m249Rate.1'));
  assert.equal(upgradeState(p, 'm249Rate').reason, 'cap', 'nivå II väntar på ledningen');
  // North dag 2 släpper nivå II
  p = debugReach(p, 'gnesta-norr', 2);
  assert.equal(upgradeState(p, 'm249Rate').tier, 2);
  assert.equal(upgradeState(p, 'psg90').ok, true);
  // inga uppgraderingar för typer man inte har: Ak 5 utan Ak 5
  const q = { ...p, op: { ...p.op, units: p.op.units.filter(u => u.type !== 'ak5') } };
  assert.equal(upgradeState(q, 'ak5').reason, 'locked');
  // dagens start: kärntrupperna i sektorn, förnödenheterna och trycket
  const r = debugReach(newCampaign(), 'riksvagen', 3);
  const cfg = opStartConfig(r, 3, 'riksvagen');
  assert.deepEqual(cfg.core.map(u => u.type).sort(), ['epa', 'inf', 'm2', 'm249', 'm249']);
  assert.equal(cfg.hpMul, 1);
});

test('Esc stänger förrådet som det stängde forskningen; på operationskartan gör det ingenting', async () => {
  const { escapeAction } = await import('../src/sim/clock.js');
  assert.equal(escapeAction({ mode: 'depot' }), 'close-research');
  assert.equal(escapeAction({ mode: 'opmap' }), 'none');
});

// ---------- 0.14.1 ----------
test('RP-avtagandet räknar förluster, inte Restart day eller Main menu', () => {
  let p = newCampaign();
  p = abandonDay(p, { day: 1, mapId: 'riksvagen' });
  p = abandonDay(p, { day: 1, mapId: 'riksvagen' });
  assert.equal(mapState(p, 'riksvagen').attempts[1], 2, 'seeden räknar omstarterna');
  const lost = finishDay(p, { mapId: 'riksvagen', day: 1, won: false, intelEarned: 100 });
  assert.equal(lost.rp.factor, 1, 'två omstarter och en förlust: fullt');
  assert.equal(lost.attempt, 1);
  p = lost.progress;
  assert.equal(lossesOf(p, 'riksvagen', 1), 1);
  for (let i = 0; i < 2; i++) p = finishDay(p, { mapId: 'riksvagen', day: 1, won: false, intelEarned: 100 }).progress;
  for (let i = 0; i < 3; i++) p = abandonDay(p, { day: 1, mapId: 'riksvagen' });
  const fourth = finishDay(p, { mapId: 'riksvagen', day: 1, won: false, intelEarned: 100 });
  assert.equal(fourth.rp.factor, 0.6, 'fjärde riktiga försöket');
});

test('Return: en skänkt enhet som är sektorns sista nekas, annars säger svaret vad som händer', () => {
  let p = debugReach(newCampaign(), 'gnesta', 5);
  const [a, b] = unitsIn(p, 'gnesta').filter(u => u.type === 'civ');
  const n = unitsIn(p, 'gnesta').length;
  assert.deepEqual(canReturn(p, a.uid), { ok: true, refund: 0, left: n - 1, given: true });
  for (const u of unitsIn(p, 'gnesta').slice(1)) p = returnUnit(p, u.uid).progress;
  const lastU = unitsIn(p, 'gnesta')[0];
  const last = returnUnit(p, lastU.uid);
  assert.equal(last.ok, false);
  assert.equal(last.reason, 'last');
  assert.equal(unitsIn(last.progress, 'gnesta').length, 1, 'sektorn behåller sin sista enhet');
  // en köpt enhet ger RP tillbaka och får lämnas även om den är den sista
  p = { ...p, rp: 500 };
  const r = requisition(p, 'm249', 'gnesta'); p = r.progress;
  p = returnUnit(p, lastU.uid).progress;
  const c = canReturn(p, r.uid);
  assert.equal(c.ok, true); assert.equal(c.left, 0); assert.ok(c.refund > 0);
  void b;
});

test('avsändaren står en gång: inget meddelande börjar med sitt eget namn, och hela myndighetsnamnet', async () => {
  const { RELEASES, FROM_NAME } = await import('../src/data/depot.js');
  assert.equal(FROM_NAME.MCF, 'Myndigheten för civilt försvar');
  for (const r of RELEASES) {
    assert.ok(!r.text.startsWith(FROM_NAME[r.from]), r.id);
    assert.ok(!/\bMCF\b/.test(r.text), r.id);
  }
});

// 0.16.0 (Olas fråga om Reassign): förrådets rad om garnisonen säger exakt det trycket gör i finishDay.
test('garnisonen: under den rekommenderade stiger trycket dubbelt så fort, och förrådet säger just det', async () => {
  const { pressureGain, garrisonOf, garrisonLine, PRESSURE_UNDERMANNED } = await import('../src/meta/operation.js');
  let p = twoPlaces(debugReach(newCampaign(), 'gnesta', 5), 3);
  assert.equal(unitsIn(p, 'riksvagen').length, garrisonOf('riksvagen'));
  assert.equal(pressureGain(p, 'riksvagen'), 1);
  assert.equal(win(p, 'gnesta', 5).op.pressure.riksvagen, 1, 'full garnison: en punkt');
  // under garnisonen: lika många punkter som pressureGain säger, och som förrådets rad säger
  p = { ...p, op: { ...p.op, units: p.op.units.filter(u => u.uid !== 800) } };
  assert.equal(pressureGain(p, 'riksvagen'), PRESSURE_UNDERMANNED);
  assert.equal(win(p, 'gnesta', 5).op.pressure.riksvagen, PRESSURE_UNDERMANNED);
  assert.equal(garrisonLine('riksvagen'), `Below ${garrisonOf('riksvagen')}: pressure rises ${PRESSURE_UNDERMANNED} a day instead of 1.`);
});

// 0.16.0 (Olas speltest: skickade bort trupperna från sektorn som stred härnäst): ångra gratis före Deploy, och
// en varning när sektorn som strider har färre än garnisonen.
test('skicka och ta tillbaka gratis före Deploy; varningen när nästa strid har för få', async () => {
  const { sendUnit, bringBack, deployWarning, garrisonOf } = await import('../src/meta/operation.js');
  let p = { ...twoPlaces(debugReach(newCampaign(), 'gnesta', 5)), rp: 300 };
  const rp0 = p.rp, south = unitsIn(p, 'gnesta');
  assert.ok(south.length >= garrisonOf('gnesta'));
  assert.equal(deployWarning(p, 'gnesta'), null);
  // bara typer som är släppta på E4 går dit: Ksp 90-lagen
  const kspa = south.filter(u => u.type === 'm249');
  assert.ok(kspa.length >= 2);
  let log = [];
  for (const u of kspa) { const r = sendUnit(p, log, u.uid, 'riksvagen'); assert.equal(r.ok, true, r.reason); p = r.progress; log = r.log; }
  assert.equal(unitsIn(p, 'gnesta').length, south.length - kspa.length);
  assert.equal(p.rp, rp0, 'inget kostar');
  const back = bringBack(p, log, kspa[0].uid);
  assert.equal(back.ok, true);
  assert.equal(back.progress.op.units.find(u => u.uid === kspa[0].uid).sector, 'gnesta');
  assert.equal(back.log.length, log.length - 1);
  let q = p, l = log;
  for (const e of [...log]) { const r = bringBack(q, l, e.uid); q = r.progress; l = r.log; }
  assert.deepEqual(unitsIn(q, 'gnesta').map(u => u.uid).sort(), south.map(u => u.uid).sort(), 'alla tillbaka, ingen förlorad');
  assert.deepEqual(l, []);
  // varningen: nästa strid med färre än garnisonen
  const thin = { ...q, op: { ...q.op, units: q.op.units.filter(u => u.sector !== 'gnesta' || u.uid === south[0].uid) } };
  assert.equal(deployWarning(thin, 'gnesta-norr'), `Hagstumosse · Vikingavägen has 1 of ${garrisonOf('gnesta')} recommended units. Deploy anyway?`);
  const a = sendUnit(q, [], kspa[0].uid, 'riksvagen'), b = sendUnit(a.progress, a.log, kspa[0].uid, 'gnesta');
  assert.deepEqual(b.log, []);
});

// 0.16.4 (speltestet av 0.16.2: "kommandotexten lovar en Ksp 90 som inte går att rekvirera"): varje leverans som
// säger att något släpps eller kan rekvireras har det i lagret, och när meddelandet kommer går det att rekvirera.
// Omvänt: lager som en leverans ger går att rekvirera när leveransen kommer.
import { RELEASES } from '../src/data/depot.js';
import { WEAPONS as W_ALL } from '../src/data/weapons.js';
test('leveranserna: varje löfte om rekvisition motsvaras av lager som går att få när meddelandet kommer', () => {
  const nameOf = t => W_ALL[t]?.short ?? W_ALL[t]?.name ?? t;
  const typesIn = text => Object.keys(UNIT_RP).filter(t => new RegExp(`\\b${nameOf(t).replace(/ /g, '\\s')}\\b`, 'i').test(text));
  for (const r of RELEASES) {
    const promises = /requisition|releas/i.test(r.text);
    const stock = Object.keys(r.stock ?? {});
    if (!promises && !stock.length) continue;
    if (promises) {
      // meningen som lovar: typerna i den finns i leveransens lager
      const sentence = r.text.split(/(?<=\.)\s+/).filter(s => /requisition|releas/i.test(s)).join(' ');
      for (const t of typesIn(sentence)) assert.ok(stock.includes(t), `${r.id}: "${sentence}" lovar ${t} men lagret har ${JSON.stringify(r.stock)}`);
    }
    // när leveransen har kommit (dagen går att spela) går lagret att rekvirera
    let p = { ...debugReach(newCampaign(), r.map, r.day), rp: 100000 };
    assert.ok(p.op.released.includes(r.id), `${r.id} har kommit`);
    for (const t of stock) {
      const c = canRequisition(p, t, r.map);
      assert.equal(c.ok, true, `${r.id}: ${t} går inte att rekvirera (${c.reason})`);
    }
  }
});

// 0.16.4 (Olas: "man kan rekvirera mycket men bara ställa ut ett visst antal; oklart hur många"): taket som förrådet
// visar är samma som uppställningens, rekvisition över taket går (enheterna väntar i reserven), och den som ställer ut
// mer än taket nekas med skälet 'front'.
import { deployCap } from '../src/meta/operation.js';
import { frontage } from '../src/sim/sim.js';
test('taket per strid: förrådet och uppställningen säger samma sak, reserven tar resten', () => {
  for (const [m, d] of [['riksvagen', 2], ['gnesta', 4], ['gnesta-norr', 3]]) {
    const p = debugReach(newCampaign(), m, d);
    const sim = createSim(opStartConfig(p, d, m));
    assert.equal(deployCap(p, m), frontage(sim), `${m} dag ${d}`);
  }
  let p = { ...debugReach(newCampaign(), 'gnesta', 5), rp: 100000 };
  const cap = deployCap(p, 'gnesta');
  // fyll över taket med det som är släppt
  for (let i = 0; i < 20 && unitsIn(p, 'gnesta').length <= cap; i++) {
    const t = ['m249', 'ksp58'].find(x => canRequisition(p, x, 'gnesta').ok);
    if (!t) break;
    p = requisition(p, t, 'gnesta').progress;
  }
  if (unitsIn(p, 'gnesta').length <= cap) p = { ...p, op: { ...p.op, units: [...p.op.units, ...[0, 1, 2].map(i => ({ uid: 900 + i, type: 'm249', level: 1, sector: 'gnesta', wins: 0, spent: 0, granted: true }))] } };
  const have = unitsIn(p, 'gnesta').length;
  assert.ok(have > cap, `${have} enheter, taket ${cap}`);
  const sim = createSim({ ...opStartConfig(p, 5, 'gnesta'), cash: 0 });
  const pl = sim.place;
  let placed = 0, refused = null;
  for (let k = 0; k < pl.n && refused == null; k++) {
    if (pl.kind[k] !== KIND.open) continue;
    const u = sim.reserve.find(x => canDeployType(sim, x.type));
    if (!u) break;
    const r = build(sim, k, u.type);
    if (r.ok) placed++; else if (r.reason === 'front') refused = r.reason;
  }
  assert.equal(placed, cap, 'så många som taket säger får stå ute');
  assert.equal(refused, 'front');
  assert.ok(sim.reserve.length >= have - cap, 'resten väntar i reserven');
});
const canDeployType = (sim, t) => sim.reserve.some(u => u.type === t);
