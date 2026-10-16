// Debugmenyns inställningar (0.12.2) i localStorage under 'horde.debug', aldrig i sparfilen:
// reglarna (tweaks, se src/sim/sim.js) och vilka hjälplager som visas. Går lagringen inte att läsa
// gäller standard (identitet, inga lager).
import { normalizeTweaks } from '../sim/sim.js';

export const DEBUG_KEY = 'horde.debug';
export const VISUALS = ['los', 'grid', 'fps'];
const storeOf = storage => { try { return storage ?? globalThis.localStorage ?? null; } catch { return null; } };

export function loadDebug(storage) {
  let raw = null;
  try { raw = JSON.parse(storeOf(storage)?.getItem(DEBUG_KEY) ?? 'null'); } catch { raw = null; }
  const vis = {};
  for (const k of VISUALS) vis[k] = raw?.visuals?.[k] === true;
  return { tweaks: normalizeTweaks(raw?.tweaks), visuals: vis };
}
export function saveDebug(state, storage) {
  try { storeOf(storage)?.setItem(DEBUG_KEY, JSON.stringify({ tweaks: normalizeTweaks(state.tweaks), visuals: state.visuals })); return true; } catch { return false; }
}
