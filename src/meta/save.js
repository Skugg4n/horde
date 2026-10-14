// Sparning i localStorage. En sparfil raderas aldrig: en trasig eller
// oläslig fil kopieras till 'horde.save.broken' och spelet startar om.
import { newProgress } from './progress.js';

const KEY = 'horde.save';
const BROKEN = 'horde.save.broken';

export function loadProgress(storage = globalThis.localStorage) {
  const raw = storage.getItem(KEY);
  if (raw === null) return newProgress();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== 'object' || parsed.v !== 1) {
    console.warn('Sparfilen gick inte att läsa. Den sparas under horde.save.broken.');
    keepBroken(storage, raw);
    return newProgress();
  }
  return { ...newProgress(), ...parsed };
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  storage.setItem(KEY, JSON.stringify(progress));
}

// Befintlig trasig kopia skrivs aldrig över.
function keepBroken(storage, raw) {
  let key = BROKEN;
  for (let n = 1; storage.getItem(key) !== null; n++) key = `${BROKEN}.${n}`;
  storage.setItem(key, raw);
}
