// Framsteg mellan dagar: forskning, upplåsta dagar och försök. Alla funktioner
// returnerar nya objekt och muterar aldrig indata.
import { RESEARCH } from '../data/research.js';
import { MAPS } from '../data/maps.js';

export function newProgress() {
  return { v: 1, mapId: 'riksvagen', unlockedDay: 1, intel: 0, research: [], attempts: {} };
}

// Returnerar null om dagen inte finns på kartan (kampanjen klar).
// Anropare måste hantera null.
export function startConfig(progress, day) {
  const map = MAPS[progress.mapId];
  const d = map.days.find(x => x.n === day) || map.days[day - 1];
  if (!d) return null;
  const bonus = progress.research.includes('budget') ? 150 : 0;
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

export function canBuyResearch(progress, id) {
  const item = RESEARCH.find(r => r.id === id);
  if (!item) return { ok: false, reason: 'kräver' };
  if (progress.research.includes(id)) return { ok: false, reason: 'redan' };
  if (!item.requires.every(req => progress.research.includes(req))) return { ok: false, reason: 'kräver' };
  if (progress.intel < item.cost) return { ok: false, reason: 'forskning' };
  return { ok: true };
}

export function buyResearch(progress, id) {
  const check = canBuyResearch(progress, id);
  if (!check.ok) throw new Error(`Kan inte köpa forskning ${id}: ${check.reason}`);
  const item = RESEARCH.find(r => r.id === id);
  return { ...progress, intel: progress.intel - item.cost, research: [...progress.research, id] };
}
