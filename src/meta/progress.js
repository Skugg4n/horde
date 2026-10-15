// Framsteg mellan dagar: forskning, upplåsta dagar och försök. Alla funktioner
// returnerar nya objekt och muterar aldrig indata.
import { researchNode } from '../data/research.js';
import { MAPS } from '../data/maps.js';
import { tierOf, tierData } from '../sim/stats.js';

// Sparfil v2: forskningen och forskningspoängen delas av alla banor, upplåsta dagar och försök
// är per bana (maps). mapId är banan som spelas nu.
export const SAVE_VERSION = 2;
export function newProgress() {
  return { v: SAVE_VERSION, mapId: 'riksvagen', intel: 0, research: [], maps: { riksvagen: newMapState() } };
}
const newMapState = () => ({ unlockedDay: 1, attempts: {} });

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
  return mapState(progress, map.unlock.map).unlockedDay > map.unlock.day;
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

export function dayResult(progress, { day, won, intelEarned, mapId = progress.mapId }) {
  const st = mapState(progress, mapId);
  const maxDay = MAPS[mapId].days.length + 1;
  const unlockedDay = won ? Math.min(Math.max(st.unlockedDay, day + 1), maxDay) : st.unlockedDay;
  return {
    ...progress,
    intel: progress.intel + intelEarned,
    maps: { ...progress.maps, [mapId]: { ...st, unlockedDay, attempts: { ...st.attempts, [day]: (st.attempts[day] || 0) + 1 } } },
  };
}

// Sparfil v1 (före 0.4.0): en bana, unlockedDay och attempts på toppen. Blir v2 med banans
// framsteg under maps; övriga fält (seenHint m.m.) följer med.
export function migrateV1(p) {
  const { unlockedDay, attempts, v, ...rest } = p;
  void v;
  return { ...rest, v: SAVE_VERSION, research: migrateResearch(p.research), maps: { [p.mapId]: { unlockedDay, attempts: { ...attempts } } } };
}

// Gamla sparfiler (före 0.3.0) har platta id: 'm249Rate' blir 'm249Rate.1' osv. Nivåer under
// den högsta fylls i ('m2.3' ger även 'm2.1' och 'm2.2'). Okända id behålls som de är.
export function migrateResearch(list) {
  const out = [];
  const add = id => { if (!out.includes(id)) out.push(id); };
  for (const id of list) {
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
  if (progress.intel < next.data.cost) return { ok: false, reason: 'forskning' };
  return { ok: true };
}

export function buyResearch(progress, nodeId) {
  const check = canBuyResearch(progress, nodeId);
  if (!check.ok) throw new Error(`Kan inte köpa forskning ${nodeId}: ${check.reason}`);
  const next = nextTier(progress, nodeId);
  return { ...progress, intel: progress.intel - next.data.cost, research: [...progress.research, `${nodeId}.${next.tier}`] };
}
