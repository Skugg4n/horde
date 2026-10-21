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
import { GARRISON, poolOf, RELEASES, UNIT_RP, LEVEL_RP, REFILL_RP, RETURN_RATE, VET_WINS, UPGRADES, SUPPLY_BUDGET, SECTORS, RETIRED_NODES, UNLOCK_TIERS } from '../data/depot.js';
import { researchNode } from '../data/research.js';
import { ARRIVAL_TROOP } from '../data/arrival.js';
import { newProgress, emptyOp, mapState, mapUnlocked, startConfig, dayResult, migrateV3, choiceOf, choicePending, withChoice } from './progress.js';
import { CHOICES, choiceOption } from '../data/choices.js';
import { tierOf, tierData, MAX_LEVEL } from '../sim/stats.js';
import { squadSize } from '../sim/squad.js';
import { hasMeta, featuresFor } from './unlocks.js';

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
// 0.16.0: en sparfil från före knappheten får sitt lager, och en med Gnesta North som egen sektor får sina
// enheter, sitt lager och sitt tryck flyttade till Hagstumosse (en sektor, Olas beslut). Inga enheter går förlorade.
const withOp = p => (p.op ? mergePools(p.op.stock ? p : { ...p, op: { ...p.op, stock: stockFromReleases(p) } }) : { ...p, op: emptyOp() });
export const needsPoolMerge = p => !!p.op && (p.op.units.some(u => u.sector != null && poolOf(u.sector) !== u.sector)
  || Object.keys(p.op.stock ?? {}).some(k => poolOf(k) !== k) || Object.keys(p.op.pressure ?? {}).some(k => poolOf(k) !== k));
function mergePools(p) {
  if (!needsPoolMerge(p)) return p;
  const units = p.op.units.map(u => (u.sector != null && poolOf(u.sector) !== u.sector ? { ...u, sector: poolOf(u.sector) } : u));
  const stock = {};
  for (const [k, v] of Object.entries(p.op.stock ?? {})) { const t = stock[poolOf(k)] ??= {}; for (const [ty, n] of Object.entries(v)) t[ty] = (t[ty] ?? 0) + n; }
  // trycket mellan faserna av samma sektor finns inte längre: bara sektorernas eget tryck står kvar
  const pressure = Object.fromEntries(Object.entries(p.op.pressure ?? {}).filter(([k]) => poolOf(k) === k));
  return { ...p, op: { ...p.op, units, stock, pressure } };
}
const copyOp = p => ({ ...p.op, units: p.op.units.map(u => ({ ...u })), released: [...p.op.released], inbox: [...p.op.inbox], pressure: { ...p.op.pressure }, closed: [...p.op.closed],
  stock: Object.fromEntries(Object.entries(p.op.stock ?? {}).map(([k, v]) => [k, { ...v }])) });
// 0.16.0: lagret för en sparfil från före knappheten: leveransernas lager minus det som redan rekvirerats
// (enheter som inte var givna) i varje sektor.
function stockFromReleases(p) {
  const out = {};
  for (const r of RELEASES) if (r.stock && p.op.released.includes(r.id) && !p.op.closed.includes(r.map)) {
    const s = out[poolOf(r.map)] ??= {};
    for (const [t, n] of Object.entries(r.stock)) s[t] = (s[t] ?? 0) + n;
  }
  for (const u of p.op.units) if (!u.granted && u.sector && out[u.sector]?.[u.type] != null) out[u.sector][u.type] = Math.max(0, out[u.sector][u.type] - 1);
  return out;
}
// Förrådets delar i inlärningens takt (src/meta/unlocks.js): nivåer och påfyllnad, rekvisition, uppgraderingar,
// omplacering och Return. Ett framsteg utan den delen nekas med 'locked' (förrådet visar den inte).
const depotOpen = (p, f) => hasMeta(p, f);

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
// sector: sektorns id eller en av dess banor ('gnesta-norr' är Hagstumosse, 'gnesta')
export const unitsIn = (p, sector) => p.op.units.filter(u => u.sector === poolOf(sector));
export const unitName = u => WEAPONS[u.type]?.short ?? WEAPONS[u.type]?.name ?? u.type;

// ---------- sektorer ----------
export const sectorClosed = (p, id) => !!p.op?.closed.includes(id);
export const sectorOpen = (p, id) => !!MAPS[id] && mapUnlocked(p, id) && !sectorClosed(p, id);
// Sektorer (inte banor) med en öppen bana: Hagstumosse är öppen så länge Ishallen eller Vikingavägen är det.
export const poolOpen = (p, id) => !!SECTORS.find(s => s.id === poolOf(id))?.maps?.some(m => sectorOpen(p, m));
export const openSectors = p => SECTORS.filter(s => s.maps && poolOpen(p, s.id)).map(s => s.id);
// Banan sektorn strider på nu (den första öppna i ordning), och dess nästa dag. null när sektorn är klar.
export function currentMap(p, sectorId) {
  const s = SECTORS.find(x => x.id === poolOf(sectorId));
  return s?.maps?.find(m => sectorOpen(p, m) && mapState(p, m).unlockedDay <= MAPS[m].days.length) ?? null;
}
// Omplaceringen syns bara när två skilda platser är aktiva samtidigt (Olas beslut: Hagstumosse är en plats).
export const reassignActive = p => openSectors(p).filter(id => currentMap(p, id)).length >= 2;
// 'holding' | 'threatened' | 'silent' (E4 efter sista dagen) | 'held' (klar) | 'locked' | 'placeholder'
export function sectorStatus(p, id) {
  const s = SECTORS.find(x => x.id === poolOf(id));
  if (!s || s.placeholder || !s.maps) return 'placeholder';
  if (!s.maps.some(m => mapUnlocked(p, m))) return 'locked';
  if (s.maps.every(m => sectorClosed(p, m))) return MAPS[s.maps[0]].outro?.withdraw ? 'silent' : 'held';
  if (!poolOpen(p, s.id)) return 'locked';
  return (p.op.pressure[s.id] ?? 0) >= PRESSURE_THREAT ? 'threatened' : 'holding';
}
// 0.16.4 (Olas: "man kan rekvirera hur mycket som helst men bara ställa ut ett visst antal, det är oklart hur många"):
// sektorns tak per strid är banans frontbredd (samma som src/sim/sim.js frontage i uppställningen), för banan sektorn
// strider på härnäst. Rekvisition över taket är tillåten: de som inte får plats väntar i reserven och väljs bort
// eller in vid uppställningen (byta mellan dagar, ersätta förluster). docs/superpowers/specs/2026-10-16-operation-design.md.
export function deployCap(p, sector) {
  const m = currentMap(p, sector) ?? SECTORS.find(s => s.id === poolOf(sector))?.maps?.[0];
  return MAPS[m]?.frontage ?? Infinity;
}
export const pressureOf = (p, id) => p.op?.pressure[poolOf(id)] ?? 0;

// ---------- banorna i förrådet (0.18.1, Olas skärmbild av förrådet: "oklart vilka som går ut och vilka som vilar") ----------
// Varje enhet i sektorn står i en av två banor: "Into battle" (högst deployCap) och "Reserve · resting". Spelaren
// flyttar dem (setLane, u.lane = 'battle' | 'rest'); utan val föreslår förrådet banan som balansens policy väljer:
// de som är värda mest, där tröttheten drar ned (unitWorth, utvilade först vid lika). Bara stridsbanan går ut i
// striden (opStartConfig). En vunnen dag nollställer valen, så att nästa dags förslag följer den nya tröttheten.
export const FATIGUE_WORTH = [1, 0.95, 0.75];
export const unitWorth = u => (UNIT_RP[u.type] ?? 100) * (1 + 0.6 * (u.level - 1)) * (vetOf(u) ? 1.1 : 1) * FATIGUE_WORTH[u.fatigue ?? 0];
const fit = u => u.men == null || u.men > 0;
// 0.19.1 (speltestet av 0.19.0, fynd 6: förslaget inför Mölnbo dag 3 satte 8 utmattade i stridsbanan medan 12 vilade satt i
// reserven, 14 klick att byta): förslaget väger tröttheten hårdare (SUGGEST_FATIGUE), så att en utvilad enhet av
// ungefär samma värde går före en utmattad. En utmattad Ksp 58 på nivå 3 går fortfarande före utvilade frivilliga.
export const SUGGEST_FATIGUE = [1, 0.9, 0.4];
const suggestWorth = u => unitWorth({ ...u, fatigue: 0 }) * SUGGEST_FATIGUE[u.fatigue ?? 0];
const suggestOrder = (a, b) => suggestWorth(b) - suggestWorth(a) || (a.fatigue ?? 0) - (b.fatigue ?? 0) || b.level - a.level || a.uid - b.uid;
export function lanes(p, sector) {
  const here = unitsIn(p, sector), cap = deployCap(p, sector);
  const battle = here.filter(u => u.lane === 'battle' && fit(u)).slice(0, cap);
  const open = here.filter(u => !u.lane && fit(u)).sort(suggestOrder);
  while (battle.length < cap && open.length) battle.push(open.shift());
  const inBattle = new Set(battle.map(u => u.uid));
  return { battle, rest: here.filter(u => !inBattle.has(u.uid)), cap };
}
export function canSetLane(p, uid, lane) {
  const u = unitOf(p, uid);
  if (!u || u.sector == null) return { ok: false, reason: 'unknown' };
  if (lane !== 'battle' && lane !== 'rest') return { ok: false, reason: 'unknown' };
  const L = lanes(p, u.sector);
  if (lane === 'battle') {
    if (L.battle.some(x => x.uid === uid)) return { ok: true, same: true };
    if (!fit(u)) return { ok: false, reason: 'noMen' };
    if (L.battle.length >= L.cap) return { ok: false, reason: 'laneFull', cap: L.cap };
  }
  return { ok: true };
}
export function setLane(p, uid, lane) {
  const c = canSetLane(p, uid, lane);
  if (!c.ok) return c;
  const sector = unitOf(p, uid).sector, L = lanes(p, sector);
  const q = withOp(p), op = copyOp(q);
  // de föreslagna låses i sin bana när spelaren väljer, så att förslaget inte flyttar någon annan i stället
  const inBattle = new Set(L.battle.map(u => u.uid));
  for (const x of op.units) if (x.sector === sector) x.lane = inBattle.has(x.uid) ? 'battle' : 'rest';
  const mv = op.units.find(x => x.uid === uid);
  mv.lane = lane; delete mv.moved;
  return { ok: true, progress: { ...q, op } };
}
// 0.16.0: garnisonen. Tryckpunkter som en öppen sektor får för en vunnen dag någon annanstans: 1, eller
// PRESSURE_UNDERMANNED om färre än GARRISON enheter står där. Förrådet visar samma regel (garrisonLine).
export const PRESSURE_UNDERMANNED = 2;
export const garrisonOf = () => GARRISON;
export const pressureGain = (p, id) => (unitsIn(p, id).length < garrisonOf(id) ? PRESSURE_UNDERMANNED : 1);
export const garrisonLine = id => `Below ${garrisonOf(id)}: pressure rises ${PRESSURE_UNDERMANNED} a day instead of 1.`;
export const hpFromPressure = n => 1 + PRESSURE_HP * n;

// ---------- leveranser ----------
// 0.24.0 (H552): r.choice = [id, opt]: leveransen kommer bara efter det valet (src/data/choices.js)
export const releaseDue = (p, r) => !!MAPS[r.map] && mapUnlocked(p, r.map) && mapState(p, r.map).unlockedDay >= r.day
  && (!r.choice || choiceOf(p, r.choice[0]) === r.choice[1]);
function applyRelease(p, r) {
  const op = copyOp(p);
  const research = [...p.research];
  for (const t of r.tiers ?? []) if (!research.includes(t)) research.push(t);
  const sector = op.closed.includes(r.map) ? null : poolOf(r.map);
  for (const g of r.grant ?? []) for (let i = 0; i < (g.count ?? 1); i++) op.units.push(newUnit(op.nextUid++, g.type, g.level ?? 1, sector, research, { granted: true }));
  if (sector && r.stock) { const st = op.stock[sector] ??= {}; for (const [t, n] of Object.entries(r.stock)) st[t] = (st[t] ?? 0) + n; }
  // 0.17.0-molnbo: adopt, enheterna utan sektor följer med till den nya sektorn
  // (också enheter i en sektor vars alla banor är spelade: sektorn stängs strax efter i syncOperation)
  if (sector && r.adopt) {
    const done = id => !!SECTORS.find(x => x.id === id)?.maps?.every(m => MAPS[m] && mapState(p, m).unlockedDay > MAPS[m].days.length);
    for (const u of op.units) if (u.sector == null || (u.sector !== sector && done(u.sector))) u.sector = sector;
    // en ny sektor börjar utan tryck (finishDay har just räknat den som öppen och under garnisonen)
    delete op.pressure[sector];
  }
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
      text: `${map.outro.text}${back ? ` ${back} RP returned to the depot.` : ''}` });
  } else {
    // 0.16.0: en fas av en sektor (Hagstumosse · Ishallen) lämnar enheterna kvar när nästa fas tar vid
    const pool = poolOf(id), q = { ...p, op };
    const next = SECTORS.find(x => x.id === pool)?.maps?.some(m => m !== id && !op.closed.includes(m) && mapUnlocked(q, m));
    if (!next) for (const u of op.units) if (u.sector === pool) u.sector = null;
    op.inbox.push({ id: 'closed-' + id, from: 'FM', seq: op.seq++, unread: true, text: map.outro?.text ?? map.name + ' holds.' });
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
  for (const r of RELEASES) if (poolOf(r.map) === poolOf(sector) && p.op.released.includes(r.id)) for (const t of r.unlock ?? []) if (!out.includes(t)) out.push(t);
  return out;
}
// 0.16.0: lagret, så många av typen som ledningen släppt för rekvisition i sektorn och som inte tagits än.
export const stockOf = (p, sector, type) => p.op.stock?.[poolOf(sector)]?.[type] ?? 0;
// Typerna förrådet visar under Requisition för sektorn: de som någon leverans haft lager av, i köpradens ordning.
export function stockTypes(p, sector) {
  const out = [];
  for (const r of RELEASES) if (poolOf(r.map) === poolOf(sector) && r.stock && p.op.released.includes(r.id)) for (const t of Object.keys(r.stock)) if (!out.includes(t)) out.push(t);
  return out;
}
// Uppgraderingarna som ledningen släppt: högsta nivån per uppgradering.
export function releasedUps(p) {
  const out = {};
  for (const r of RELEASES) if (r.ups && p.op.released.includes(r.id)) for (const [id, n] of Object.entries(r.ups)) out[id] = Math.max(out[id] ?? 0, n);
  return out;
}
// Har spelaren typen: en enhet någonstans, eller lager att rekvirera i en öppen sektor.
const hasType = (p, type) => p.op.units.some(u => u.type === type) || SECTORS.some(s => poolOpen(p, s.id) && stockOf(p, s.id, type) > 0);
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
  if (!depotOpen(p, 'requisition')) return fail('locked');
  if (!poolOpen(p, sector)) return fail('closed');
  if (!releasedTypes(p, sector).includes(type) || stockOf(p, sector, type) < 1) return fail('none');
  const cost = UNIT_RP[type];
  if (p.rp < cost) return poor(p, cost);
  return { ok: true, cost };
}
export function requisition(p, type, sector) {
  const c = canRequisition(p, type, sector);
  if (!c.ok) return { ...c, progress: p };
  const op = copyOp(p);
  const u = newUnit(op.nextUid++, type, 1, poolOf(sector), p.research, { spent: c.cost });
  op.units.push(u);
  op.stock[poolOf(sector)][type]--;
  return { ok: true, uid: u.uid, cost: c.cost, progress: { ...p, rp: p.rp - c.cost, op } };
}
// Nästa nivå för en enhet: pris, eller null vid högsta nivån.
export const levelCost = u => (u.level >= MAX_LEVEL ? null : LEVEL_RP[u.type]?.[u.level - 1] ?? null);
export function canLevelUp(p, uid) {
  const u = unitOf(p, uid);
  if (!u) return fail('unknown');
  if (!depotOpen(p, 'levels')) return fail('locked');
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
  if (!depotOpen(p, 'levels')) return fail('locked');
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
// 0.14.1 (granskningen av 0.14, Important 4): vad Return gör, så att förrådet kan fråga först. refund: RP
// tillbaka; left: enheter kvar i sektorn efteråt. En enhet som ger 0 RP tillbaka och är sektorns sista
// nekas (reason 'last'): sektorn stod annars utan trupp och utan RP att köpa för.
export function canReturn(p, uid) {
  const u = unitOf(p, uid);
  if (!u) return fail('unknown');
  if (!depotOpen(p, 'return')) return fail('locked');
  const refund = returnValue(u), left = u.sector == null ? null : unitsIn(p, u.sector).length - 1;
  if (refund === 0 && left === 0) return fail('last', { refund, left });
  return { ok: true, refund, left, given: refund === 0 };
}
export function returnUnit(p, uid) {
  const c = canReturn(p, uid);
  if (!c.ok) return { ...c, progress: p };
  const back = c.refund, op = copyOp(p), u = unitOf(p, uid);
  op.units = op.units.filter(x => x.uid !== uid);
  // 0.16.0: en rekvirerad enhet går tillbaka till sektorns lager (en given går tillbaka till ledningen)
  if (!u.granted && u.sector && op.stock[u.sector]?.[u.type] != null) op.stock[u.sector][u.type]++;
  return { ok: true, refund: back, progress: { ...p, rp: p.rp + back, op } };
}
export function canReassign(p, uid, sector) {
  const u = unitOf(p, uid);
  if (!u) return fail('unknown');
  if (sector != null && u.sector === poolOf(sector)) return fail('same');
  if (u.sector === sector) return fail('same');
  if (sector != null) {
    if (!poolOpen(p, sector)) return fail('closed');
    if (!releasedTypes(p, sector).includes(u.type)) return fail('not released');
  }
  return { ok: true };
}
// 0.16.0 (Olas speltest: "jag skickade bort trupper jag behövde, jag trodde nästa strid var North"): att skicka
// en enhet går att ångra gratis tills man trycker Deploy. log: förrådets lista över skickade enheter i det här
// besöket, [{ uid, from }]. Inget kostar och inget låses förrän dagen ställs upp.
export function sendUnit(p, log, uid, to) {
  const u = unitOf(p, uid), r = reassign(p, uid, to);
  if (!r.ok) return { ...r, log };
  const prior = log.find(x => x.uid === uid);
  return { ok: true, progress: r.progress, log: prior ? (prior.from === to ? log.filter(x => x !== prior) : log) : [...log, { uid, from: u.sector }] };
}
export function bringBack(p, log, uid) {
  const e = log.find(x => x.uid === uid);
  if (!e) return { ok: false, reason: 'unknown', progress: p, log };
  const op = copyOp(p);
  op.units.find(x => x.uid === uid).sector = e.from;
  return { ok: true, progress: { ...p, op }, log: log.filter(x => x !== e) };
}
// Varningen före Deploy: sektorn som strider har färre enheter än den rekommenderade garnisonen.
export function deployWarning(p, sector) {
  const n = unitsIn(p, sector).length, g = garrisonOf(sector);
  return n < g ? `${MAPS[sector].name} has ${n} of ${g} recommended units. Deploy anyway?` : null;
}
export function reassign(p, uid, sector) {
  const c = canReassign(p, uid, sector);
  if (!c.ok) return { ...c, progress: p };
  const op = copyOp(p);
  op.units.find(x => x.uid === uid).sector = sector == null ? null : poolOf(sector);
  return { ok: true, progress: { ...p, op } };
}

// ---------- förrådets uppgraderingar ----------
// { id, node, tier (1-baserad), cost, ok, reason } för nästa nivå i varje uppgradering, eller null när allt är köpt.
// 0.16.0 (Olas tillägg): bara det man har eller fått släppt, och bara de nivåer ledningen släppt. Det som inte
// syns i förrådet har reason 'locked' (förrådet visar det inte; balansens policy hoppar över det).
export function upgradeState(p, id) {
  const up = UPGRADES.find(x => x.id === id), node = researchNode(id);
  if (!up || !node) return null;
  const t = Math.max(tierOf(p.research, id), up.from - 1);
  if (t >= node.tiers.length) return { id, node, tier: null, cost: null, ok: false, reason: 'max' };
  const tier = t + 1, cost = node.tiers[t].cost;
  const needs = up.needs;
  const hidden = { id, node, tier, cost, ok: false, reason: 'locked' };
  if (!depotOpen(p, 'upgrades')) return hidden;
  if (needs?.startsWith('tier:')) { if (!p.research.includes(needs.slice(5))) return hidden; }
  else if (needs && !hasType(p, needs)) return hidden;
  const cap = releasedUps(p)[id] ?? 0;
  if (tier > cap) return t >= up.from && t > 0 ? { id, node, tier: null, cost: null, ok: false, reason: 'cap', have: t } : hidden;
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
// 0.14.2: en dag kan ha en egen faktor på förnödenheterna per dödad (d.bounty, E4 dag 3: bjässarna gav
// över 1 000 dollar som inte gick att lägga på något).
export function opStartConfig(p, day, mapId = p.mapId) {
  const base = startConfig(p, day, mapId);
  if (!base) return null;
  // 0.24.0 (H552): dagen som valet gjort den (Björnlunda dag 1 efter FALL BACK: första vågen större)
  const d = dayFor(p, mapId, day);
  if (d !== base.map.days[day - 1]) base.dayCfg = d;
  // 0.18.1: bara stridsbanan (lanes) går ut; resten vilar i förrådet
  const core = lanes(p, mapId).battle
    .map(u => ({ uid: u.uid, type: u.type, level: u.level, vet: vetOf(u), ...(u.men != null ? { men: u.men } : {}), ...(u.fatigue ? { fatigue: u.fatigue } : {}) }));
  // 0.16.0: det som är upplåst i dag (src/meta/unlocks.js). Utan förnödenheter (E4 dag 1) är kassan tom och
  // de dödade ger inget.
  const allow = [...featuresFor(mapId, day)], supplies = allow.includes('supplies');
  return { ...base, cash: supplies ? (d.supplies ?? d.startCash) + supplyBonus(p.research) : 0, core, hpMul: hpFromPressure(pressureOf(p, mapId)),
    bountyMul: supplies ? SUPPLY_BOUNTY * (d.bounty ?? 1) : 0, allow };
}
// ---------- kampanjens val (0.24.0, H552, src/data/choices.js) ----------
// Dagen som den spelas: banans dag, eller en kopia som ett val ändrat. day.choiceMod = { choice: [id, opt], firstWave }:
// när valet är gjort blir varje grupp i första vågen firstWave gånger större (avrundat uppåt).
export function dayFor(p, mapId, day) {
  const d = MAPS[mapId]?.days?.[day - 1];
  const m = d?.choiceMod;
  if (!m || choiceOf(p, m.choice[0]) !== m.choice[1]) return d;
  const k = m.firstWave ?? 1;
  return { ...d, waves: d.waves.map((w, i) => (i ? w : { ...w, groups: w.groups.map(q => ({ ...q, count: Math.ceil(q.count * k) })) })) };
}
// Spelaren väljer på bordet. Kostnaden (option.rp) dras direkt, högst det som finns; leveranserna och sektorerna följer
// (syncOperation: defend öppnar Laxne, fallback Björnlunda). Ett val går inte att ändra.
export function canChoose(p, id, opt) {
  if (!CHOICES[id] || !choiceOption(id, opt)) return { ok: false, reason: 'unknown' };
  if (choiceOf(p, id)) return { ok: false, reason: 'chosen' };
  if (!choicePending(p, id)) return { ok: false, reason: 'not yet' };
  return { ok: true };
}
export function makeChoice(p, id, opt) {
  const c = canChoose(p, id, opt);
  if (!c.ok) return c;
  const o = choiceOption(id, opt), cost = Math.min(p.rp ?? 0, o.rp ?? 0);
  const q = { ...withChoice(p, id, opt), rp: (p.rp ?? 0) - cost, ...(o.rp ? { choiceRp: { ...(p.choiceRp ?? {}), [id]: cost } } : {}) };
  return { ok: true, cost, progress: syncOperation(q) };
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
// 0.14.1 (granskningen av 0.14, Important 3): avtagandet räknar bara riktiga förluster (losses[day], som
// bara finishDay ökar). Restart day och Main menu (abandonDay) ökar attempts, som styr seeden, men kostar
// ingen RP. attempt i svaret är försöket som avtagandet räknar med (förlusterna före plus ett).
export const lossesOf = (p, mapId, day) => mapState(p, mapId).losses?.[day] || 0;
export function finishDay(p, { mapId = p.mapId, day, won, intelEarned, report = null, evac = null }) {
  const attempt = lossesOf(p, mapId, day) + 1;
  const rp = rpForAttempt({ base: intelEarned, attempt, won, report, evac });
  let q = dayResult(withOp(p), { day, won, rpEarned: rp.total, mapId });
  if (!won) {
    const st = mapState(q, mapId);
    q = { ...q, maps: { ...q.maps, [mapId]: { ...st, losses: { ...(st.losses ?? {}), [day]: lossesOf(p, mapId, day) + 1 } } } };
  }
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
    // 0.18.0 (tröttheten, Olas beslut): en vunnen dag ute gör enheten tröttare (Rested, Tired, Exhausted), en dag i
    // reserven vilar den ett steg. Ett förlorat försök räknas inte. Bara när tröttheten är upplåst (src/meta/unlocks.js).
    if (featuresFor(mapId, day).has('fatigue')) {
      const out = new Set((report?.units ?? []).map(d => d.uid));
      for (const u of op.units) {
        if (u.sector !== poolOf(mapId)) continue;
        const f = Math.max(0, Math.min(2, (u.fatigue ?? 0) + (out.has(u.uid) ? 1 : -1)));
        if (f) u.fatigue = f; else delete u.fatigue;
      }
    }
    // tryck: sektorn man försvarade lättar, de andra öppna sektorerna blir svårare
    for (const s of openSectors(q)) {
      if (s === poolOf(mapId)) op.pressure[s] = Math.max(0, (op.pressure[s] ?? 0) - PRESSURE_RELIEF);
      else op.pressure[s] = Math.min(PRESSURE_MAX, (op.pressure[s] ?? 0) + pressureGain(q, s));
    }
    for (const s of Object.keys(op.pressure)) if (!op.pressure[s]) delete op.pressure[s];
    // 0.21.2 (speltestet av 0.21.1, fynd 2: valet nollställdes efter en vunnen dag utan besked): spelarens val står kvar
    // mellan dagarna. Bara tröttheten flyttar: en utmattad i striden byts mot en mindre trött i reserven, och båda får en
    // rad om varför (u.moved, visas på kortet tills spelaren flyttar enheten eller nästa dag vinns).
    const pool = poolOf(mapId), here = op.units.filter(u => u.sector === pool);
    for (const u of here) delete u.moved;
    if (featuresFor(mapId, day).has('fatigue')) {
      const spare = here.filter(u => u.lane === 'rest' && (u.fatigue ?? 0) < 2 && fit(u)).sort((a, b) => (a.fatigue ?? 0) - (b.fatigue ?? 0) || b.level - a.level || a.uid - b.uid);
      for (const u of here.filter(x => x.lane === 'battle' && (x.fatigue ?? 0) >= 2)) {
        const sub = spare.shift();
        if (!sub) break;
        u.lane = 'rest'; u.moved = 'rest:exhausted';
        sub.lane = 'battle'; sub.moved = 'battle:rested';
      }
    }
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
// 0.24.0 (H552): ett hopp till Laxne gör valet DEFEND LAXNE, ett hopp till Björnlunda utan val FALL BACK (balansens
// ankomst, utan kostnaden); ett gjort val står kvar.
export function debugReach(p, mapId, day, fresh = false) {
  const order = ['riksvagen', 'gnesta', 'gnesta-norr', 'molnbo', 'laxne', 'bjornlunda'];
  if (mapId === 'laxne' && !choiceOf(p, 'laxne')) p = withChoice(p, 'laxne', 'defend');
  if (mapId === 'bjornlunda' && !choiceOf(p, 'laxne')) p = withChoice(p, 'laxne', 'fallback');
  const maps = { ...p.maps };
  for (const id of order) {
    if (id === mapId) break;
    if (id === 'laxne' && choiceOf(p, 'laxne') !== 'defend') continue;
    const st = mapState(p, id);
    maps[id] = { ...st, unlockedDay: Math.max(st.unlockedDay, MAPS[id].days.length + 1) };
  }
  const st = mapState(p, mapId);
  maps[mapId] = { ...st, unlockedDay: Math.max(st.unlockedDay, Math.min(day, MAPS[mapId].days.length)) };
  let q = syncOperation({ ...p, mapId, maps });
  const pool = poolOf(mapId);
  // 0.17.1: en sektor med en känd ankomst (src/data/arrival.js ARRIVAL_TROOP) får den truppen och forskningen, så att
  // ett hopp dit spelas som balansen räknar (förut nivå 1 rakt igenom)
  // 0.18.0 (speltestet av 0.17.2: Quick jump till Ishallen efter ett hopp till Mölnbo gav ingen trupp): ett hopp byter
  // bara truppen i sektorn man hoppar till (förut tog ett hopp till Mölnbo alla andra sektorers trupper). Har sektorn
  // ingen trupp (leveranserna har redan getts i sparfilen) får den truppen en ny kampanj har där den dagen.
  // 0.22.0 (H539): en dag kan ha en egen trupp (days[dag]), truppen en spelare går in med den dagen
  const t = ARRIVAL_TROOP[mapId]?.days?.[day] ?? ARRIVAL_TROOP[mapId];
  let uid = q.op.nextUid ?? 1;
  const others = q.op.units.filter(u => u.sector !== pool);
  if (!t) {
    if (fresh || unitsIn(q, mapId).length) return q;
    const f = debugReach(newCampaign(), mapId, day, true);
    const units = unitsIn(f, mapId).map(u => ({ ...u, uid: uid++ }));
    return { ...q, op: { ...q.op, units: [...others, ...units], nextUid: uid } };
  }
  const units = t.units.map(([type, level, men, wins]) => ({ uid: uid++, type, level, sector: mapId, wins, spent: 0, granted: true, ...(men != null ? { men } : {}) }));
  q = { ...q, research: [...new Set([...q.research, ...t.research])], op: { ...q.op, units: [...others, ...units], nextUid: uid } };
  return q;
}
