// Sparning i localStorage. En sparfil raderas aldrig: en trasig eller
// oläslig fil kopieras till 'horde.save.broken' och spelet startar om.
import { newProgress, migrateV1, migrateV2, SAVE_VERSION, clampDays } from './progress.js';
import { newCampaign, migrateToV4, syncOperation, needsPoolMerge } from './operation.js';
import { MAPS } from '../data/maps.js';
import { withLessons } from './lessons.js';
import { normalizeTable } from './table.js';
// Bara när fältet finns eller behövs: ett framsteg utan bord lämnas som det är tills bordet sparar något.
const withTable = p => (p.table === undefined ? p : { ...p, table: normalizeTable(p.table) });

const KEY = 'horde.save';
const BROKEN = 'horde.save.broken';
const V1_COPY = 'horde.save.v1';     // kopia av en v1-sparfil, sparas när den läses första gången
const V2_COPY = 'horde.save.v2';     // kopia av en v2-sparfil (0.4.x), likadant
const V3_COPY = 'horde.save.v3';     // kopia av en v3-sparfil (0.5.0 till 0.13.x), likadant (0.14.0)
const V4_COPY = 'horde.save.v4';     // 0.16.0: kopia av en v4-fil där Gnesta North var en egen sektor (Hagstumosse slås ihop)
const DAYS_COPY = 'horde.save.days';  // 0.20.0: kopia av en fil som stod längre fram på en bana än den nu har dagar (Mölnbo dag 4 och 5)

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
// v1 till v3 har forskningspoäng (intel), v4 rekvisitionspoäng (rp) och operationen (op).
const common = (p, v = 3) => isObject(p)
  && typeof p.mapId === 'string' && Object.hasOwn(MAPS, p.mapId)
  && (v >= 4 ? nonNegative(p.rp) : nonNegative(p.intel))
  && Array.isArray(p.research) && p.research.every(r => typeof r === 'string');
const validUnit = u => isObject(u) && Number.isInteger(u.uid) && typeof u.type === 'string' && Number.isInteger(u.level) && u.level >= 1
  && (u.sector === null || typeof u.sector === 'string') && Number.isInteger(u.wins) && nonNegative(u.spent) && (u.men == null || (Number.isInteger(u.men) && u.men >= 0));
const validOp = o => isObject(o) && Array.isArray(o.units) && o.units.every(validUnit) && Number.isInteger(o.nextUid)
  && Array.isArray(o.released) && Array.isArray(o.inbox) && isObject(o.pressure) && Array.isArray(o.closed);

function isValidV1(p) {
  return common(p) && p.v === 1 && validDay(p.unlockedDay) && validAttempts(p.attempts);
}
// v2 och v3: maps får innehålla banor som den här versionen inte känner (de behålls).
function isValidMaps(p, v) {
  return common(p, v) && p.v === v && isObject(p.maps) && (v < 4 || validOp(p.op))
    && Object.values(p.maps).every(m => isObject(m) && validDay(m.unlockedDay) && validAttempts(m.attempts));
}

export function loadProgress(storage) {
  const s = resolveStorage(storage);
  let raw;
  try {
    raw = s.getItem(KEY);
  } catch (err) {
    console.warn('Sparfilen gick inte att läsa. Spelet startar om.', err);
    return newCampaign();
  }
  if (raw == null) return newCampaign();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (isValidMaps(parsed, SAVE_VERSION)) {
    // 0.16.0: en sparfil utan lektioner räknar allt fram till den längst spelade dagen som sett (lessons.js)
    if (needsPoolMerge(parsed)) keepCopy(s, raw, V4_COPY);
    // 0.20.0 (H495): Mölnbo har tre dagar (förut fem). Stod filen på dag 4 eller 5 är Mölnbo klart; kopian behålls.
    const clamped = clampDays(parsed);
    if (clamped) keepCopy(s, raw, DAYS_COPY);
    const p = { ...newProgress(), lessons: undefined, ...(clamped ?? parsed) };
    // 0.21.0: kartbordets del (table.layout, table.log) är valfri; saknas den eller är den trasig blir bordet tomt
    return withTable(withLessons(syncOperation({ ...p, maps: { ...newProgress().maps, ...p.maps } })));
  }
  // Äldre versioner: kopian behålls som den var (horde.save.v1, .v2, .v3; skrivs aldrig över), och
  // framsteget flyttas steg för steg till v3 och sedan v4 (0.14.0, operation.js migrateToV4).
  let v3 = null;
  if (isValidMaps(parsed, 3)) { keepCopy(s, raw, V3_COPY); v3 = parsed; }
  else if (isValidMaps(parsed, 2)) { keepCopy(s, raw, V2_COPY); v3 = migrateV2(parsed); }
  else if (isValidV1(parsed)) { keepCopy(s, raw, V1_COPY); v3 = migrateV1(parsed); }
  if (v3) {
    const p = migrateToV4({ ...v3, maps: { ...newProgress().maps, ...v3.maps } });
    return withTable(withLessons({ ...p, lessons: undefined, maps: { ...newProgress().maps, ...p.maps } }));
  }
  console.warn('Sparfilen gick inte att läsa. Den sparas under horde.save.broken.');
  keepCopy(s, raw, BROKEN);
  return newCampaign();
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

// 0.12.2: debugmenyns "Reset save". Sparfilen kopieras först till 'horde.save.backup' (eller .1, .2 ...
// om en kopia redan finns, keepCopy skriver aldrig över), sedan sparas ett nytt framsteg. Inget raderas.
export const BACKUP = 'horde.save.backup';
export function resetSave(fresh, storage) {
  const s = resolveStorage(storage);
  let raw = null;
  try { raw = s.getItem(KEY); } catch { /* läses inte: inget att kopiera */ }
  if (raw != null) keepCopy(s, raw, BACKUP);
  return saveProgress(fresh, s);
}
