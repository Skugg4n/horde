// Operation Södermanland (0.14.0): leveranser, rekvisition, kärntrupper, RP och trycket.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, finishDay, requisition, canRequisition, levelUp, refill, refillCost, returnUnit, reassign, releasedTypes, opStartConfig,
  rpForAttempt, attemptFactor, lossesOf, canReturn, sectorStatus, buyUpgrade, upgradeState, unitsIn, vetOf, debugReach, syncOperation, PRESSURE_HP } from '../src/meta/operation.js';
import { mapState, mapUnlocked, abandonDay } from '../src/meta/progress.js';
import { UNIT_RP, LEVEL_RP, REFILL_RP, VET_WINS } from '../src/data/depot.js';
import { createSim, build, startWave, step, upgrade, sell, reinforce, dayReport, buySupply, checkSpot, gunStats, deployPhase, placeAcross } from '../src/sim/sim.js';
import { buyState } from '../src/sim/buy.js';
import { placementFor, KIND } from '../src/sim/placement.js';
import { MAPS } from '../src/data/maps.js';
import { STRAIGHT } from './fixtures/straight-road.js';
import { SUPPLIES, VETERAN } from '../src/data/weapons.js';

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

test('leveranserna kommer pö om pö: pillboxen dag 2, Ksp 88 dag 3, och vägspärren tystnar efter dag 3', () => {
  let p = newCampaign();
  p = win(p, 'riksvagen', 1);
  assert.ok(unitsIn(p, 'riksvagen').some(u => u.type === 'epa'));
  p = win(p, 'riksvagen', 2);
  assert.ok(unitsIn(p, 'riksvagen').some(u => u.type === 'm2'));
  const r = requisition({ ...p, rp: 0 }, 'inf', 'riksvagen');
  assert.equal(r.ok, false, 'inga RP');
  p = { ...p, rp: 1000 };
  p = requisition(p, 'inf', 'riksvagen').progress;
  const before = p.rp;
  p = win(p, 'riksvagen', 3);
  assert.equal(sectorStatus(p, 'riksvagen'), 'silent');
  assert.equal(unitsIn(p, 'riksvagen').length, 0, 'armén drar sig tillbaka');
  // det rekvirerade infanteriet ger tillbaka sina RP; dagens RP läggs till
  assert.ok(p.rp >= before + UNIT_RP.inf);
  // Gnesta South: de civila från MCF, inget infanteri att rekvirera där
  assert.deepEqual(unitsIn(p, 'gnesta').map(u => u.type), ['civ', 'civ', 'civ']);
  assert.deepEqual(releasedTypes(p, 'gnesta'), ['civ']);
  assert.equal(canRequisition(p, 'inf', 'gnesta').reason, 'not released');
  assert.ok(p.op.inbox.some(m => m.from === 'MCF'));
});

test('rekvisition, nivå, påfyllnad, tillbaka till förrådet (cirka 50 %) och omplacering', () => {
  let p = { ...newCampaign(), rp: 2000 };
  const r = requisition(p, 'm249', 'riksvagen');
  assert.equal(r.ok, true);
  p = r.progress;
  assert.equal(p.rp, 2000 - UNIT_RP.m249);
  const u = p.op.units.find(x => x.uid === r.uid);
  p = levelUp(p, u.uid).progress;
  assert.equal(p.op.units.find(x => x.uid === r.uid).level, 2);
  assert.equal(p.rp, 2000 - UNIT_RP.m249 - LEVEL_RP.m249[0]);
  const back = returnUnit(p, r.uid);
  assert.equal(back.refund, Math.round((UNIT_RP.m249 + LEVEL_RP.m249[0]) * 0.5));
  // gruppen: nivå 2 ger en femte man; stupade fylls på för RP
  const inf = unitsIn(p, 'riksvagen').find(x => x.type === 'inf');
  p = levelUp(p, inf.uid).progress;
  assert.equal(p.op.units.find(x => x.uid === inf.uid).men, 5);
  p = { ...p, op: { ...p.op, units: p.op.units.map(x => (x.uid === inf.uid ? { ...x, men: 2 } : x)) } };
  assert.equal(refillCost(p, p.op.units.find(x => x.uid === inf.uid)), 3 * REFILL_RP.inf);
  p = refill(p, inf.uid).progress;
  assert.equal(p.op.units.find(x => x.uid === inf.uid).men, 5);
  // omplacering: bara till en öppen sektor där typen är släppt
  assert.equal(reassign(p, inf.uid, 'gnesta').ok, false);
  p = debugReach(p, 'gnesta-norr', 3);
  const civ = p.op.units.find(x => x.type === 'civ');
  assert.equal(reassign(p, civ.uid, 'gnesta-norr').ok, true);
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
  const sim = createSim({ map: MAPS.riksvagen, day: 1, cash: 0, core: [{ uid: 1, type: 'm249', level: 1, vet: 1 }, { uid: 2, type: 'm249', level: 1 }] });
  const [a, b] = openSpots(MAPS.riksvagen, 2);
  assert.equal(build(sim, a, 'm249', { uid: 1 }).ok, true);
  assert.equal(build(sim, b, 'm249', { uid: 2 }).ok, true);
  const s1 = gunStats(sim, sim.guns[0]), s2 = gunStats(sim, sim.guns[1]);
  assert.ok(Math.abs(s1.accuracy - s2.accuracy - VETERAN.accuracy) < 1e-9);
  assert.ok(Math.abs(s1.rate / s2.rate - VETERAN.rate) < 1e-9);
});

test('uppställningen: kärntrupperna ur reserven gratis före första vågen, inte efter; ingen handel med trupp i striden', () => {
  const sim = createSim({ map: MAPS.riksvagen, day: 1, cash: 500, core: [{ uid: 7, type: 'inf', level: 2, men: 3 }, { uid: 8, type: 'm249', level: 2 }] });
  const [a, b, c] = openSpots(MAPS.riksvagen, 3);
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
  const sim2 = createSim({ map: MAPS.riksvagen, day: 1, cash: 0, core: [{ uid: 1, type: 'm249', level: 1 }] });
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

test('trycket: en sektor man inte försvarar blir svårare men faller aldrig', () => {
  let p = debugReach(newCampaign(), 'gnesta', 5);
  assert.equal(mapUnlocked(p, 'gnesta-norr'), true, 'Gnesta North öppnar efter South dag 4');
  assert.equal(sectorStatus(p, 'gnesta-norr'), 'holding');
  p = win(p, 'gnesta', 5);
  assert.equal(p.op.pressure['gnesta-norr'], 1);
  assert.equal(sectorStatus(p, 'gnesta'), 'held');
  assert.ok(Math.abs(opStartConfig(p, 1, 'gnesta-norr').hpMul - (1 + PRESSURE_HP)) < 1e-9);
  // många dagar på en annan sektor: hotad, men aldrig fallen
  let q = debugReach(newCampaign(), 'gnesta', 4);
  q = { ...q, maps: { ...q.maps, gnesta: { ...q.maps.gnesta, unlockedDay: 5 } } };
  q = syncOperation(q);
  for (let i = 0; i < 9; i++) q = finishDay(q, { mapId: 'gnesta-norr', day: 1, won: true, intelEarned: 0, report: { units: [] } }).progress;
  assert.equal(sectorStatus(q, 'gnesta'), 'threatened');
  assert.ok(q.op.pressure.gnesta <= 5);
  assert.equal(mapState(q, 'gnesta').unlockedDay, 5, 'sektorn står kvar');
});

test('förrådets uppgraderingar: forskningens nivåer köps med RP när typen är släppt', () => {
  let p = { ...newCampaign(), rp: 1000 };
  assert.equal(upgradeState(p, 'm249Rate').ok, true);
  assert.equal(upgradeState(p, 'psg90').reason, 'locked');
  assert.equal(upgradeState(p, 'm2').reason, 'locked');
  p = buyUpgrade(p, 'm249Rate').progress;
  assert.ok(p.research.includes('m249Rate.1'));
  p = debugReach(p, 'riksvagen', 3);
  assert.equal(upgradeState(p, 'm2').tier, 2, 'Ksp 88 I kommer med leveransen, förrådet säljer II');
  // dagens start: kärntrupperna i sektorn, förnödenheterna och trycket
  const cfg = opStartConfig(p, 3, 'riksvagen');
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
  let p = newCampaign();
  const [inf, a, b] = unitsIn(p, 'riksvagen');
  assert.deepEqual(canReturn(p, a.uid), { ok: true, refund: 0, left: 2, given: true });
  p = returnUnit(p, a.uid).progress;
  p = returnUnit(p, b.uid).progress;
  const last = returnUnit(p, inf.uid);
  assert.equal(last.ok, false);
  assert.equal(last.reason, 'last');
  assert.equal(unitsIn(last.progress, 'riksvagen').length, 1, 'sektorn behåller sin sista enhet');
  // en köpt enhet ger RP tillbaka och får lämnas även om den är den sista
  p = { ...p, rp: 500 };
  const r = requisition(p, 'm249', 'riksvagen'); p = r.progress;
  p = returnUnit(p, inf.uid).progress;
  const c = canReturn(p, r.uid);
  assert.equal(c.ok, true); assert.equal(c.left, 0); assert.ok(c.refund > 0);
});

test('avsändaren står en gång: inget meddelande börjar med sitt eget namn, och hela myndighetsnamnet', async () => {
  const { RELEASES, FROM_NAME } = await import('../src/data/depot.js');
  assert.equal(FROM_NAME.MCF, 'Myndigheten för civilt försvar');
  for (const r of RELEASES) {
    assert.ok(!r.text.startsWith(FROM_NAME[r.from]), r.id);
    assert.ok(!/\bMCF\b/.test(r.text), r.id);
  }
});
