// Sparning i localStorage. En sparfil raderas aldrig: en trasig eller
// oläslig fil kopieras till 'horde.save.broken' och spelet startar om.
import { newProgress, migrateResearch, migrateV1, SAVE_VERSION } from './progress.js';
import { MAPS } from '../data/maps.js';

const KEY = 'horde.save';
const BROKEN = 'horde.save.broken';
const V1_COPY = 'horde.save.v1';     // kopia av en v1-sparfil, sparas när den läses första gången

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

const validDay = d => Number.isInteger(d) && d >= 1;
const validAttempts = a => isObject(a) && Object.values(a).every(n => Number.isInteger(n) && n >= 0);
const common = p => isObject(p)
  && typeof p.mapId === 'string' && Object.hasOwn(MAPS, p.mapId)
  && nonNegative(p.intel)
  && Array.isArray(p.research) && p.research.every(r => typeof r === 'string');

function isValidV1(p) {
  return common(p) && p.v === 1 && validDay(p.unlockedDay) && validAttempts(p.attempts);
}
// v2: maps får innehålla banor som den här versionen inte känner (de behålls).
function isValidV2(p) {
  return common(p) && p.v === SAVE_VERSION && isObject(p.maps)
    && Object.values(p.maps).every(m => isObject(m) && validDay(m.unlockedDay) && validAttempts(m.attempts));
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
  if (isValidV2(parsed)) {
    const p = { ...newProgress(), ...parsed, research: migrateResearch(parsed.research) };
    return { ...p, maps: { ...newProgress().maps, ...p.maps } };
  }
  if (isValidV1(parsed)) {
    // Gamla sparfilen behålls som den var under horde.save.v1 (skrivs aldrig över).
    keepCopy(s, raw, V1_COPY);
    const p = migrateV1(parsed);
    return { ...newProgress(), ...p, maps: { ...newProgress().maps, ...p.maps } };
  }
  console.warn('Sparfilen gick inte att läsa. Den sparas under horde.save.broken.');
  keepCopy(s, raw, BROKEN);
  return newProgress();
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

// Kopia av en sparfil (trasig eller gammal version) under base, base.1, base.2 ...
// En befintlig kopia skrivs aldrig över, och en identisk kopia läggs inte till igen.
function keepCopy(storage, raw, base) {
  try {
    let key = base;
    for (let n = 1; ; n++) {
      const existing = storage.getItem(key);
      if (existing == null) break;
      if (existing === raw) return;
      key = `${base}.${n}`;
    }
    storage.setItem(key, raw);
  } catch (err) {
    console.warn('Sparfilen kunde inte kopieras.', err);
  }
}
