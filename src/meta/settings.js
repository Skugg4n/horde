// Inställningar (ljud, musik och spelets fart) i localStorage, skilda från sparfilen med framsteg.
// Läsning och skrivning kastar aldrig: utan lagring gäller standardvärdena.
const KEY = 'horde.settings';

export const SPEEDS = [1, 2, 3];
// Springarens skrik (0.8.0): 'classic' (det tonala skriket från 0.7.0, standard) eller 'torn'
// (lägre, hesare, mer sönderriven strupe). Väljs i ljudbordet (A/B) eller med nyckeln shriek.
export const SHRIEKS = ['classic', 'torn'];
// 0.21.0 (kartbordet): mellan dagarna visas kartbordet ('table', standard) eller de gamla skyltarna, operationskartan
// och förrådet ('classic'), för jämförelse. Väljs i spelmenyn (Between days).
export const HUBS = ['table', 'classic'];
export const DEFAULT_SETTINGS = Object.freeze({ sound: 0.8, music: 0.6, soundMuted: false, musicMuted: false, speed: 1, shriek: 'classic', hub: 'table' });

const level = (x, fallback) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : fallback);

// Okända eller trasiga fält ersätts av standardvärden; nivåerna hålls mellan 0 och 1.
export function normalizeSettings(raw) {
  const r = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    sound: level(r.sound, DEFAULT_SETTINGS.sound),
    music: level(r.music, DEFAULT_SETTINGS.music),
    soundMuted: r.soundMuted === true,
    musicMuted: r.musicMuted === true,
    // Farten följer med mellan dagarna och omstarterna (0.5.2).
    speed: SPEEDS.includes(r.speed) ? r.speed : DEFAULT_SETTINGS.speed,
    shriek: SHRIEKS.includes(r.shriek) ? r.shriek : DEFAULT_SETTINGS.shriek,
    hub: HUBS.includes(r.hub) ? r.hub : DEFAULT_SETTINGS.hub,
  };
}

function resolve(storage) {
  if (storage) return storage;
  try {
    const ls = globalThis.localStorage;
    if (ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function') return ls;
  } catch {
    // Åtkomst nekad: behandlas som saknad lagring.
  }
  return null;
}

export function loadSettings(storage) {
  try {
    const s = resolve(storage);
    const raw = s ? s.getItem(KEY) : null;
    return normalizeSettings(raw == null ? null : JSON.parse(raw));
  } catch {
    return normalizeSettings(null);
  }
}

// Returnerar false om inställningarna inte gick att spara.
export function saveSettings(settings, storage) {
  try {
    const s = resolve(storage);
    if (!s) return false;
    s.setItem(KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

// Verklig nivå som ljudet ska spela med (0 när det är avstängt).
export const effectiveVolume = (settings, channel) => (settings[channel + 'Muted'] ? 0 : settings[channel]);
