// Framsteg mellan dagar: forskning, upplåsta dagar och försök. Alla funktioner
// returnerar nya objekt och muterar aldrig indata.
import { researchNode } from '../data/research.js';
import { MAPS } from '../data/maps.js';
import { tierOf, tierData } from '../sim/stats.js';

export function newProgress() {
  return { v: 1, mapId: 'riksvagen', unlockedDay: 1, intel: 0, research: [], attempts: {} };
}

// Returnerar null om dagen inte finns på kartan (kampanjen klar).
// Anropare måste hantera null.
export function startConfig(progress, day) {
  const map = MAPS[progress.mapId];
  const d = map.days.find(x => x.n === day) || map.days[day - 1];
  if (!d) return null;
  const bonus = tierData(progress.research, 'budget')?.cash ?? 0;
  return {
    map,
    day,
    cash: d.startCash + bonus,
    research: [...progress.research],
    seed: 1000 * day + (progress.attempts[day] || 0),
  };
}

export function dayResult(progress, { day, won, intelEarned }) {
  const maxDay = MAPS[progress.mapId].days.length + 1;
  const unlockedDay = won ? Math.min(Math.max(progress.unlockedDay, day + 1), maxDay) : progress.unlockedDay;
  return {
    ...progress,
    intel: progress.intel + intelEarned,
    unlockedDay,
    attempts: { ...progress.attempts, [day]: (progress.attempts[day] || 0) + 1 },
  };
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
