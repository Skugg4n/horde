// Framsteg mellan dagar: forskning, upplåsta dagar och försök. Alla funktioner
// returnerar nya objekt och muterar aldrig indata.
import { researchNode } from '../data/research.js';
import { MAPS } from '../data/maps.js';
import { tierOf, tierData } from '../sim/stats.js';
import { ARRIVAL } from '../data/arrival.js';

// Sparfil v4 (0.14.0, Operation Södermanland): rekvisitionspoäng (rp) i stället för forskningspoäng
// (intel), research är förrådets ägda nivåer (uppgraderingar och leveransernas upplåsningar), och op är
// operationens läge (kärntrupperna, leveranserna, inkorgen, trycket per sektor; src/meta/operation.js).
// v3 (0.5.0): som v2, forskningen New position (slot4) heter More positions (positions).
// v2: forskningen och forskningspoängen delas av alla banor, upplåsta dagar och försök
// är per bana (maps). mapId är banan som spelas nu.
export const SAVE_VERSION = 4;
export const emptyOp = () => ({ units: [], nextUid: 1, released: [], inbox: [], seq: 0, pressure: {}, closed: [], stock: {} });
// Ett tomt framsteg utan leveranser. Ett nytt spel är src/meta/operation.js newCampaign (leveranserna för E4 dag 1).
export function newProgress() {
  return { v: SAVE_VERSION, mapId: 'riksvagen', rp: 0, research: [], maps: { riksvagen: newMapState() }, op: emptyOp(), lessons: { seen: [], mode: 'on', read: [] } };
}
const newMapState = () => ({ unlockedDay: 1, attempts: {} });
// 0.20.0 (H495): en bana kan få färre dagar (Mölnbo fem till tre). En sparfil som stod längre fram på banan än den nu
// har dagar räknas som klar med banan: unlockedDay sätts till sista dagen + 1 (src/meta/operation.js syncOperation
// stänger då sektorn). Inget annat ändras; försöken på dagarna som inte finns längre står kvar. null = inget att ändra.
export function clampDays(progress) {
  let maps = null;
  for (const [id, st] of Object.entries(progress.maps ?? {})) {
    const max = MAPS[id] ? MAPS[id].days.length + 1 : null;
    if (max == null || !(st?.unlockedDay > max)) continue;
    (maps ??= { ...progress.maps })[id] = { ...st, unlockedDay: max };
  }
  return maps ? { ...progress, maps } : null;
}

// Banans del av framsteget (en tom om banan inte spelats än).
export function mapState(progress, mapId = progress.mapId) {
  return progress.maps?.[mapId] ?? newMapState();
}
// Banan går att välja: den har inget krav, eller kravet (en dag klar på en annan bana) är
// uppfyllt. debug låser upp allt (?debug i adressen).
export function mapUnlocked(progress, mapId, { debug = false } = {}) {
  const map = MAPS[mapId];
  if (!map) return false;
  if (!map.unlock || debug) return true;
  // 0.16.0: en bana som redan spelats under den gamla regeln står öppen (Vikingavägen öppnade efter dag 4 före
  // 0.16.0, map.legacyUnlock), så att ingen sparfil tappar en dag den redan spelat
  const own = progress.maps?.[mapId];
  if (map.legacyUnlock != null && own && (own.unlockedDay > 1 || Object.keys(own.attempts ?? {}).length)
    && mapState(progress, map.unlock.map).unlockedDay > map.legacyUnlock) return true;
  return mapState(progress, map.unlock.map).unlockedDay > map.unlock.day;
}
// ?debug (0.10.1): framsteget med forskningen en typisk spelare har när banan låses upp
// (src/data/arrival.js) tillagd, för en dag som spelas. Sparas inte. fresh: ingenting läggs till.
export function debugArrival(progress, mapId = progress.mapId, { fresh = false } = {}) {
  const add = fresh ? [] : (ARRIVAL[mapId] ?? []).filter(id => !progress.research.includes(id));
  return add.length ? { ...progress, research: [...progress.research, ...add] } : progress;
}
// Första dagens tips per bana (0.6.0). seenHints: banor där tipsen visats klart. Ett äldre
// seenHint: true gällde bara E4 (det var den enda banan med tips). Fältet följer med i sparfilen
// som de andra extra fälten.
export function hintSeen(progress, mapId) {
  return !!progress.seenHints?.includes(mapId) || (mapId === 'riksvagen' && progress.seenHint === true);
}
export function markHintSeen(progress, mapId) {
  if (hintSeen(progress, mapId)) return progress;
  return { ...progress, seenHints: [...(progress.seenHints ?? []), mapId] };
}
export function selectMap(progress, mapId) {
  if (!MAPS[mapId]) throw new Error('okänd bana ' + mapId);
  return { ...progress, mapId, maps: { ...progress.maps, [mapId]: mapState(progress, mapId) } };
}

// Returnerar null om dagen inte finns på kartan (kampanjen klar).
// Anropare måste hantera null.
export function startConfig(progress, day, mapId = progress.mapId) {
  const map = MAPS[mapId];
  if (!map) return null;
  const d = map.days.find(x => x.n === day) || map.days[day - 1];
  if (!d) return null;
  const bonus = tierData(progress.research, 'budget')?.cash ?? 0;
  return {
    map,
    day,
    cash: d.startCash + bonus,
    research: [...progress.research],
    seed: 1000 * day + (mapState(progress, mapId).attempts[day] || 0),
  };
}

// rpEarned: rekvisitionspoängen försöket gav (src/meta/operation.js rpForAttempt). intelEarned är det gamla
// namnet och gäller om rpEarned saknas.
export function dayResult(progress, { day, won, rpEarned, intelEarned = 0, mapId = progress.mapId }) {
  const st = mapState(progress, mapId);
  const maxDay = MAPS[mapId].days.length + 1;
  const unlockedDay = won ? Math.min(Math.max(st.unlockedDay, day + 1), maxDay) : st.unlockedDay;
  return {
    ...progress,
    rp: (progress.rp ?? 0) + (rpEarned ?? intelEarned),
    maps: { ...progress.maps, [mapId]: { ...st, unlockedDay, attempts: { ...st.attempts, [day]: (st.attempts[day] || 0) + 1 } } },
  };
}

// Dagen lämnas mitt i (Restart day eller Main menu): försöket räknas, så att nästa start får
// en ny seed som efter Try again. Ingen forskning, inget upplåst.
export function abandonDay(progress, { day, mapId = progress.mapId }) {
  return dayResult(progress, { day, won: false, rpEarned: 0, mapId });
}

// Sparfil v1 (före 0.4.0): en bana, unlockedDay och attempts på toppen. Blir v3 med banans
// framsteg under maps; övriga fält (seenHint m.m.) följer med.
export function migrateV1(p) {
  const { unlockedDay, attempts, v, ...rest } = p;
  void v;
  return { ...rest, v: 3, research: migrateResearch(p.research), maps: { [p.mapId]: { unlockedDay, attempts: { ...attempts } } } };
}

// Sparfil v2 (0.4.x) blir v3: forskningen flyttas (slot4 blir positions.1), allt annat följer med.
export function migrateV2(p) {
  return { ...p, v: 3, research: migrateResearch(p.research) };
}

// Sparfil v3 (0.5.0 till 0.13.x) blir v4 (0.14.0). Forskningspoängen blir RP ett till ett. Forskningen
// blir förrådets nivåer: noder som inte finns längre (More positions, More squads) och vapnens första
// nivå (en upplåsning, nu en leverans) lämnas tillbaka som RP till samma pris (retired, unlockTiers).
// Allt annat följer med. Kärntrupperna och leveranserna fylls i av operation.js syncOperation, efter
// hur långt spelaren kommit på varje bana.
export function migrateV3(p, { retired = [], unlockTiers = [] } = {}) {
  const { intel = 0, v, ...rest } = p;
  void v;
  let rp = intel;
  const research = [];
  for (const id of migrateResearch(p.research ?? [])) {
    const [node, t] = id.split('.');
    const back = retired.includes(node) || unlockTiers.includes(id);
    if (back) { rp += researchNode(node)?.tiers[Number(t) - 1]?.cost ?? 0; continue; }
    research.push(id);
  }
  return { ...rest, v: SAVE_VERSION, rp, research, op: emptyOp() };
}

// Noder som bytt namn. Gamla New position (slot4) hade en nivå och blir More positions I,
// vilken nivå den gamla sparfilen än säger.
const RENAMED = { slot4: 'positions' };

// Gamla sparfiler (före 0.3.0) har platta id: 'm249Rate' blir 'm249Rate.1' osv. Nivåer under
// den högsta fylls i ('m2.3' ger även 'm2.1' och 'm2.2'). Okända id behålls som de är.
export function migrateResearch(list) {
  const out = [];
  const add = id => { if (!out.includes(id)) out.push(id); };
  for (const id of list) {
    const renamed = RENAMED[id.split('.')[0]];
    if (renamed) { add(`${renamed}.1`); continue; }
    const node = researchNode(id.split('.')[0]);
    if (!node) { add(id); continue; }
    const t0 = tierOf([id], node.id);
    if (t0 === 0) { add(id); continue; }
    const t = Math.min(tierOf([id], node.id), node.tiers.length);
    for (let k = 1; k <= t; k++) add(`${node.id}.${k}`);
  }
  return out;
}

// Nästa nivå att forska i en nod: { node, tier (1-baserad), data } eller null om allt är köpt.
export function nextTier(progress, nodeId) {
  const node = researchNode(nodeId);
  if (!node) return null;
  const t = tierOf(progress.research, nodeId);
  return t >= node.tiers.length ? null : { node, tier: t + 1, data: node.tiers[t] };
}
// Kravet 'nod.nivå' är uppfyllt.
export function hasTier(progress, req) {
  const [node, t] = req.split('.');
  return tierOf(progress.research, node) >= Number(t || 1);
}

// Köper nästa nivå i noden.
export function canBuyResearch(progress, nodeId) {
  const node = researchNode(nodeId);
  if (!node) return { ok: false, reason: 'kräver' };
  const next = nextTier(progress, nodeId);
  if (!next) return { ok: false, reason: 'redan' };
  if (!next.data.requires.every(req => hasTier(progress, req))) return { ok: false, reason: 'kräver' };
  if ((progress.rp ?? 0) < next.data.cost) return { ok: false, reason: 'forskning' };
  return { ok: true };
}

export function buyResearch(progress, nodeId) {
  const check = canBuyResearch(progress, nodeId);
  if (!check.ok) throw new Error(`Kan inte köpa forskning ${nodeId}: ${check.reason}`);
  const next = nextTier(progress, nodeId);
  return { ...progress, rp: progress.rp - next.data.cost, research: [...progress.research, `${nodeId}.${next.tier}`] };
}
