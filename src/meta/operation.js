// Operation Södermanland (0.14.0): reglerna mellan dagarna. Rena funktioner som tar ett framsteg (v4,
// src/meta/progress.js) och returnerar ett nytt; inget muteras. Datat bor i src/data/depot.js.
//
//   Leveranser   ledningen släpper trupp och materiel pö om pö (RELEASES), med ett meddelande i inkorgen.
//   Rekvisition  RP köper enheter till en sektor bland det som är släppt där, nivåer, påfyllnad och
//                förrådets uppgraderingar. Allt mellan dagarna (Olas beslut 2026-10-16).
//   Kärntrupper  enheterna följer med mellan dagarna. Förluster följer bara med vid VINST; vid förlust
//                börjar dagen om med styrkan man gick in med, och RP som tjänats behålls. Tillbaka till
//                förrådet ger RETURN_RATE av det som lagts; omplacering till en annan sektor är gratis.
//   Erfarenhet   en stjärna efter VET_WINS vunna dagar ute: lite bättre träff och omladdning.
//   Sektorer     en sektor man inte spelar i blir svårare (pressure) men faller aldrig (Olas beslut).
//   RP           dödade, klarade vågor och uppdrag, avtagande efter tredje försöket samma dag, bonus för
//                snabb seger, få förluster och oskadad bas. Inget svårighetsval (Olas beslut).
import { MAPS } from '../data/maps.js';
import { WEAPONS } from '../data/weapons.js';
import { RELEASES, UNIT_RP, LEVEL_RP, REFILL_RP, RETURN_RATE, VET_WINS, UPGRADES, SUPPLY_BUDGET, SECTORS, RETIRED_NODES, UNLOCK_TIERS } from '../data/depot.js';
import { researchNode } from '../data/research.js';
import { newProgress, emptyOp, mapState, mapUnlocked, startConfig, dayResult, migrateV3 } from './progress.js';
import { tierOf, tierData, MAX_LEVEL } from '../sim/stats.js';
import { squadSize } from '../sim/squad.js';

// ---------- konstanter ----------
export const PRESSURE_HP = 0.06;      // zombiernas hp per tryckpunkt i en sektor
export const PRESSURE_MAX = 5;
export const PRESSURE_THREAT = 2;     // från så många punkter är sektorn hotad
export const PRESSURE_RELIEF = 2;     // en vunnen dag i sektorn tar bort så många
// Avtagande avkastning: försök 1 till 3 ger fullt, sedan mindre (index = försöket, 1-baserat).
export const ATTEMPT_RP = [1, 1, 1, 1, 0.6, 0.4, 0.25];
export const attemptFactor = n => ATTEMPT_RP[Math.min(n, ATTEMPT_RP.length - 1)];
export const BONUS = { fast: 0.15, losses: 0.15, base: 0.2 };
export const OBJECTIVE_RP = 25;       // ett uppdrag som klaras (dagens vinst), plus EVAC_RP per räddad civil
export const EVAC_RP = 2;
// Förnödenheter per dödad zombie jämfört med 0.13:s pengar: trupperna köps inte längre i striden.
export const SUPPLY_BOUNTY = 0.5;

const isSquadType = type => !!WEAPONS[type]?.squad;
const withOp = p => (p.op ? p : { ...p, op: emptyOp() });
const copyOp = p => ({ ...p.op, units: p.op.units.map(u => ({ ...u })), released: [...p.op.released], inbox: [...p.op.inbox], pressure: { ...p.op.pressure }, closed: [...p.op.closed] });

// ---------- enheter ----------
// { uid, type, level, men (bara grupper), sector (null = otilldelad), wins, spent (RP), granted }
export const maxMen = (u, research = []) => (isSquadType(u.type) ? squadSize(u.level, research, u.type) : null);
export const vetOf = u => (u.wins >= VET_WINS ? 1 : 0);
function newUnit(uid, type, level, sector, research, { granted = false, spent = 0 } = {}) {
  const u = { uid, type, level, sector, wins: 0, spent, granted };
  if (isSquadType(type)) u.men = squadSize(level, research, type);
  return u;
}
export const unitOf = (p, uid) => p.op.units.find(u => u.uid === uid) ?? null;
export const unitsIn = (p, sector) => p.op.units.filter(u => u.sector === sector);
export const unitName = u => WEAPONS[u.type]?.short ?? WEAPONS[u.type]?.name ?? u.type;

// ---------- sektorer ----------
export const sectorClosed = (p, id) => !!p.op?.closed.includes(id);
export const sectorOpen = (p, id) => !!MAPS[id] && mapUnlocked(p, id) && !sectorClosed(p, id);
export const openSectors = p => SECTORS.filter(s => sectorOpen(p, s.id)).map(s => s.id);
// 'holding' | 'threatened' | 'silent' (E4 efter sista dagen) | 'held' (klar) | 'locked' | 'placeholder'
export function sectorStatus(p, id) {
  const s = SECTORS.find(x => x.id === id);
  if (!s || s.placeholder || !MAPS[id]) return 'placeholder';
  if (sectorClosed(p, id)) return MAPS[id].outro?.withdraw ? 'silent' : 'held';
  if (!mapUnlocked(p, id)) return 'locked';
  return (p.op.pressure[id] ?? 0) >= PRESSURE_THREAT ? 'threatened' : 'holding';
}
export const pressureOf = (p, id) => p.op?.pressure[id] ?? 0;
export const hpFromPressure = n => 1 + PRESSURE_HP * n;

// ---------- leveranser ----------
export const releaseDue = (p, r) => !!MAPS[r.map] && mapUnlocked(p, r.map) && mapState(p, r.map).unlockedDay >= r.day;
function applyRelease(p, r) {
  const op = copyOp(p);
  const research = [...p.research];
  for (const t of r.tiers ?? []) if (!research.includes(t)) research.push(t);
  const sector = op.closed.includes(r.map) ? null : r.map;
  for (const g of r.grant ?? []) for (let i = 0; i < (g.count ?? 1); i++) op.units.push(newUnit(op.nextUid++, g.type, g.level ?? 1, sector, research, { granted: true }));
  op.released.push(r.id);
  op.inbox.push({ id: r.id, from: r.from, text: r.text, seq: op.seq++, unread: true });
  return { ...p, research, op };
}
// Sektorn är klar (sista dagen vunnen). E4 (outro.withdraw): armén drar sig tillbaka med det som är kvar,
// och RP som lagts på enheterna där lämnas tillbaka. Andra sektorer håller: enheterna blir otilldelade
// och kan omplaceras.
function closeSector(p, id) {
  const op = copyOp(p);
  op.closed.push(id);
  delete op.pressure[id];
  const map = MAPS[id];
  let rp = p.rp;
  if (map.outro?.withdraw) {
    const here = op.units.filter(u => u.sector === id);
    const back = here.reduce((a, u) => a + u.spent, 0);
    op.units = op.units.filter(u => u.sector !== id);
    rp += back;
    op.inbox.push({ id: 'closed-' + id, from: 'FM', seq: op.seq++, unread: true,
      text: `${map.outro.text} What was left of the roadblock has been pulled back to Strängnäs.${back ? ` ${back} RP returned to the depot.` : ''}` });
  } else {
    for (const u of op.units) if (u.sector === id) u.sector = null;
    op.inbox.push({ id: 'closed-' + id, from: 'FM', seq: op.seq++, unread: true, text: `${map.outro?.text ?? map.name + ' holds.'} Its units are free to reassign.` });
  }
  return { ...p, rp, op };
}
// Leveranser som är framme och sektorer som är klara, tills inget mer händer. Anropas efter varje dag,
// för ett nytt spel och för en flyttad sparfil (då får spelaren trupperna för hur långt den kommit).
export function syncOperation(p) {
  let q = withOp(p);
  for (let guard = 0; guard < 50; guard++) {
    const r = RELEASES.find(x => !q.op.released.includes(x.id) && releaseDue(q, x));
    if (r) { q = applyRelease(q, r); continue; }
    const done = Object.keys(MAPS).find(id => !sectorClosed(q, id) && mapState(q, id).unlockedDay > MAPS[id].days.length);
    if (done) { q = closeSector(q, done); continue; }
    break;
  }
  return q;
}
export const newCampaign = () => syncOperation(newProgress());
// Det som går att rekvirera i en sektor: typerna i leveranserna dit.
export function releasedTypes(p, sector) {
  const out = [];
  for (const r of RELEASES) if (r.map === sector && p.op.released.includes(r.id)) for (const t of r.unlock ?? []) if (!out.includes(t)) out.push(t);
  return out;
}
const releasedAnywhere = (p, type) => SECTORS.some(s => releasedTypes(p, s.id).includes(type));
export const unreadCount = p => p.op.inbox.filter(m => m.unread).length;
export function markRead(p) {
  if (!unreadCount(p)) return p;
  const op = copyOp(p);
  op.inbox = op.inbox.map(m => (m.unread ? { ...m, unread: false } : m));
  return { ...p, op };
}

// ---------- rekvisition (mellan dagarna) ----------
const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });
const poor = (p, cost) => fail('rp', { cost, need: cost - p.rp });
export function canRequisition(p, type, sector) {
  if (!sectorOpen(p, sector)) return fail('closed');
  if (!releasedTypes(p, sector).includes(type)) return fail('not released');
  const cost = UNIT_RP[type];
  if (p.rp < cost) return poor(p, cost);
  return { ok: true, cost };
}
export function requisition(p, type, sector) {
  const c = canRequisition(p, type, sector);
  if (!c.ok) return { ...c, progress: p };
  const op = copyOp(p);
  const u = newUnit(op.nextUid++, type, 1, sector, p.research, { spent: c.cost });
  op.units.push(u);
  return { ok: true, uid: u.uid, cost: c.cost, progress: { ...p, rp: p.rp - c.cost, op } };
}
// Nästa nivå för en enhet: pris, eller null vid högsta nivån.
export const levelCost = u => (u.level >= MAX_LEVEL ? null : LEVEL_RP[u.type]?.[u.level - 1] ?? null);
export function canLevelUp(p, uid) {
  const u = unitOf(p, uid);
  if (!u) return fail('unknown');
  const cost = levelCost(u);
  if (cost == null) return fail('max');
  if (p.rp < cost) return poor(p, cost);
  return { ok: true, cost };
}
// En nivå till: gruppen får nivåns nya man (nivå 2 ger en femte), förlusterna står kvar.
export function levelUp(p, uid) {
  const c = canLevelUp(p, uid);
  if (!c.ok) return { ...c, progress: p };
  const op = copyOp(p), u = op.units.find(x => x.uid === uid);
  const before = maxMen(u, p.research);
  u.level++; u.spent += c.cost;
  if (u.men != null) u.men += maxMen(u, p.research) - before;
  return { ok: true, cost: c.cost, progress: { ...p, rp: p.rp - c.cost, op } };
}
export function refillCost(p, u) {
  if (u.men == null) return 0;
  return Math.max(0, maxMen(u, p.research) - u.men) * (REFILL_RP[u.type] ?? 15);
}
export function canRefill(p, uid) {
  const u = unitOf(p, uid);
  if (!u) return fail('unknown');
  const cost = refillCost(p, u);
  if (!cost) return fail('full');
  if (p.rp < cost) return poor(p, cost);
  return { ok: true, cost };
}
export function refill(p, uid) {
  const c = canRefill(p, uid);
  if (!c.ok) return { ...c, progress: p };
  const op = copyOp(p), u = op.units.find(x => x.uid === uid);
  u.men = maxMen(u, p.research); u.spent += c.cost;
  return { ok: true, cost: c.cost, progress: { ...p, rp: p.rp - c.cost, op } };
}
export const returnValue = u => Math.round(u.spent * RETURN_RATE);
export function returnUnit(p, uid) {
  const u = unitOf(p, uid);
  if (!u) return fail('unknown');
  const back = returnValue(u), op = copyOp(p);
  op.units = op.units.filter(x => x.uid !== uid);
  return { ok: true, refund: back, progress: { ...p, rp: p.rp + back, op } };
}
export function canReassign(p, uid, sector) {
  const u = unitOf(p, uid);
  if (!u) return fail('unknown');
  if (u.sector === sector) return fail('same');
  if (sector != null) {
    if (!sectorOpen(p, sector)) return fail('closed');
    if (!releasedTypes(p, sector).includes(u.type)) return fail('not released');
  }
  return { ok: true };
}
export function reassign(p, uid, sector) {
  const c = canReassign(p, uid, sector);
  if (!c.ok) return { ...c, progress: p };
  const op = copyOp(p);
  op.units.find(x => x.uid === uid).sector = sector;
  return { ok: true, progress: { ...p, op } };
}

// ---------- förrådets uppgraderingar ----------
// { id, node, tier (1-baserad), cost, ok, reason } för nästa nivå i varje uppgradering, eller null när allt är köpt.
export function upgradeState(p, id) {
  const up = UPGRADES.find(x => x.id === id), node = researchNode(id);
  if (!up || !node) return null;
  const t = Math.max(tierOf(p.research, id), up.from - 1);
  if (t >= node.tiers.length) return { id, node, tier: null, cost: null, ok: false, reason: 'max' };
  const tier = t + 1, cost = node.tiers[t].cost;
  const needs = up.needs;
  if (needs?.startsWith('tier:')) { if (!p.research.includes(needs.slice(5))) return { id, node, tier, cost, ok: false, reason: 'locked' }; }
  else if (needs && !releasedAnywhere(p, needs)) return { id, node, tier, cost, ok: false, reason: 'locked' };
  if (p.rp < cost) return { id, node, tier, cost, ok: false, reason: 'rp', need: cost - p.rp };
  return { id, node, tier, cost, ok: true };
}
export const upgradeList = p => UPGRADES.map(u => upgradeState(p, u.id));
export function buyUpgrade(p, id) {
  const st = upgradeState(p, id);
  if (!st?.ok) return { ok: false, reason: st?.reason ?? 'unknown', progress: p };
  // nivåerna under den köpta fylls i (en vapennivå 2 förutsätter leveransens nivå 1)
  const research = [...p.research];
  for (let k = 1; k <= st.tier; k++) if (!research.includes(`${id}.${k}`)) research.push(`${id}.${k}`);
  let q = { ...p, rp: p.rp - st.cost, research };
  // Bigger squad: gruppernas nya platser fylls direkt (det är en organisationsändring, ingen påfyllnad)
  if (id === 'hvSquad') {
    const op = copyOp(q);
    for (const u of op.units) if (u.type === 'hv' && u.men != null) u.men += maxMen(u, research) - maxMen(u, p.research);
    q = { ...q, op };
  }
  return { ok: true, cost: st.cost, progress: q };
}
// Förnödenheter per dag: dagens supplies plus Supply budget.
export const supplyBonus = research => Math.round((tierData(research, 'budget')?.cash ?? 0) * SUPPLY_BUDGET);

// ---------- dagen ----------
// Simuleringens start: kärntrupperna i sektorn (reserven att ställa ut), dagens förnödenheter och
// trycket i sektorn som hp-faktor. null om dagen inte finns.
export function opStartConfig(p, day, mapId = p.mapId) {
  const base = startConfig(p, day, mapId);
  if (!base) return null;
  const d = base.map.days[day - 1];
  const core = unitsIn(p, mapId).filter(u => u.men == null || u.men > 0)
    .map(u => ({ uid: u.uid, type: u.type, level: u.level, vet: vetOf(u), ...(u.men != null ? { men: u.men } : {}) }));
  return { ...base, cash: (d.supplies ?? d.startCash) + supplyBonus(p.research), core, hpMul: hpFromPressure(pressureOf(p, mapId)), bountyMul: SUPPLY_BOUNTY };
}
// RP för ett försök. base: det simuleringen räknade (dödade, vågor, lärdomen vid förlust). report:
// src/sim/sim.js dayReport. Bonusarna bara vid vinst.
export function rpForAttempt({ base, attempt = 1, won = false, report = null, evac = null }) {
  const objective = won ? OBJECTIVE_RP + (evac ? EVAC_RP * evac.safe : 0) : 0;
  const factor = attemptFactor(attempt);
  const earned = Math.round((base + objective) * factor);
  const bonuses = [];
  if (won && report) {
    if (report.fast) bonuses.push({ id: 'fast', label: 'Fast win', rp: Math.round(earned * BONUS.fast) });
    if (report.fewLosses) bonuses.push({ id: 'losses', label: 'Few losses', rp: Math.round(earned * BONUS.losses) });
    if (report.baseIntact) bonuses.push({ id: 'base', label: 'Base untouched', rp: Math.round(earned * BONUS.base) });
  }
  return { base, objective, factor, earned, bonuses, total: earned + bonuses.reduce((a, b) => a + b.rp, 0) };
}
// Dagen är slut. Förlust: bara RP och försöket räknas, styrkan är orörd. Vinst: förlusterna följer med
// (stupade soldater, förlorade pjäser), de som var ute får en vunnen dag till (erfarenheten), trycket
// flyttas, och leveranser och sektorernas slut följer (syncOperation).
export function finishDay(p, { mapId = p.mapId, day, won, intelEarned, report = null, evac = null }) {
  const attempt = (mapState(p, mapId).attempts[day] || 0) + 1;
  const rp = rpForAttempt({ base: intelEarned, attempt, won, report, evac });
  let q = dayResult(withOp(p), { day, won, rpEarned: rp.total, mapId });
  if (won) {
    const op = copyOp(q);
    for (const d of report?.units ?? []) {
      const u = op.units.find(x => x.uid === d.uid);
      if (!u) continue;
      if (d.destroyed) { op.units = op.units.filter(x => x !== u); continue; }
      if (u.men != null && d.alive != null) u.men = d.alive;
      u.wins++;
    }
    op.units = op.units.filter(u => u.men == null || u.men > 0);
    // tryck: sektorn man försvarade lättar, de andra öppna sektorerna blir svårare
    for (const s of openSectors(q)) {
      if (s === mapId) op.pressure[s] = Math.max(0, (op.pressure[s] ?? 0) - PRESSURE_RELIEF);
      else op.pressure[s] = Math.min(PRESSURE_MAX, (op.pressure[s] ?? 0) + 1);
    }
    for (const s of Object.keys(op.pressure)) if (!op.pressure[s]) delete op.pressure[s];
    q = { ...q, op };
  }
  return { progress: syncOperation(q), rp, attempt };
}

// ---------- sparfil v3 till v4 ----------
export const migrateToV4 = p3 => syncOperation(migrateV3(p3, { retired: RETIRED_NODES, unlockTiers: UNLOCK_TIERS }));

// ---------- ?debug ----------
// Förrådet som förval: 'none' (bara leveransernas nivåer), 'arrival' (src/data/arrival.js för banan, de
// som är uppgraderingar här) eller 'all' (allt). RP rörs inte.
export function debugDepot(p, preset, list = []) {
  const keep = p.research.filter(id => RELEASES.some(r => r.tiers?.includes(id) && p.op.released.includes(r.id)));
  if (preset === 'none') return { ...p, research: keep };
  const ups = UPGRADES.flatMap(u => researchNode(u.id).tiers.map((_, i) => `${u.id}.${i + 1}`));
  const add = preset === 'all' ? ups : list.filter(id => ups.includes(id));
  return { ...p, research: [...new Set([...keep, ...add])] };
}
// Hoppa till en sektor och dag (debugmenyn): banorna före räknas som klara och sektorns dagar före
// som vunna, så att leveranserna och trupperna är där en spelare som kommit dit har dem.
export function debugReach(p, mapId, day) {
  const order = ['riksvagen', 'gnesta', 'gnesta-norr'];
  const maps = { ...p.maps };
  for (const id of order) {
    if (id === mapId) break;
    const st = mapState(p, id);
    maps[id] = { ...st, unlockedDay: Math.max(st.unlockedDay, MAPS[id].days.length + 1) };
  }
  const st = mapState(p, mapId);
  maps[mapId] = { ...st, unlockedDay: Math.max(st.unlockedDay, Math.min(day, MAPS[mapId].days.length)) };
  return syncOperation({ ...p, mapId, maps });
}
