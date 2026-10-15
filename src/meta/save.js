// Sparning i localStorage. En sparfil raderas aldrig: en trasig eller
// oläslig fil kopieras till 'horde.save.broken' och spelet startar om.
import { newProgress, migrateResearch } from './progress.js';
import { MAPS } from '../data/maps.js';

const KEY = 'horde.save';
const BROKEN = 'horde.save.broken';

let fallback = null;
let warnedNoStorage = false;

// Utan tillgänglig localStorage (nekad åtkomst, privat läge, Node) sparas i minnet.
function resolveStorage(storage) {
  if (storage) return storage;
  try {
    const ls = globalThis.localStorage;
    if (ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function') return ls;
  } catch {
    // Åtkomst nekad: används som saknad lagring nedan.
  }
  if (!warnedNoStorage) {
    warnedNoStorage = true;
    console.warn('localStorage finns inte. Framsteget sparas bara under den här sessionen.');
  }
  if (!fallback) {
    const m = new Map();
    fallback = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
  }
  return fallback;
}

const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonNegative = x => Number.isFinite(x) && x >= 0;

function isValidV1(p) {
  return isObject(p) && p.v === 1
    && typeof p.mapId === 'string' && Object.hasOwn(MAPS, p.mapId)
    && Number.isInteger(p.unlockedDay) && p.unlockedDay >= 1
    && nonNegative(p.intel)
    && Array.isArray(p.research) && p.research.every(r => typeof r === 'string')
    && isObject(p.attempts) && Object.values(p.attempts).every(n => Number.isInteger(n) && n >= 0);
}

export function loadProgress(storage) {
  const s = resolveStorage(storage);
  let raw;
  try {
    raw = s.getItem(KEY);
  } catch (err) {
    console.warn('Sparfilen gick inte att läsa. Spelet startar om.', err);
    return newProgress();
  }
  if (raw == null) return newProgress();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!isValidV1(parsed)) {
    console.warn('Sparfilen gick inte att läsa. Den sparas under horde.save.broken.');
    keepBroken(s, raw);
    return newProgress();
  }
  return { ...newProgress(), ...parsed, research: migrateResearch(parsed.research) };
}

// Returnerar false om framsteget inte gick att spara; kastar aldrig.
export function saveProgress(progress, storage) {
  try {
    resolveStorage(storage).setItem(KEY, JSON.stringify(progress));
    return true;
  } catch (err) {
    console.warn('Framsteget kunde inte sparas.', err);
    return false;
  }
}

// Befintlig trasig kopia skrivs aldrig över, och identisk kopia läggs inte till igen.
function keepBroken(storage, raw) {
  try {
    let key = BROKEN;
    for (let n = 1; ; n++) {
      const existing = storage.getItem(key);
      if (existing == null) break;
      if (existing === raw) return;
      key = `${BROKEN}.${n}`;
    }
    storage.setItem(key, raw);
  } catch (err) {
    console.warn('Den trasiga sparfilen kunde inte kopieras.', err);
  }
}
