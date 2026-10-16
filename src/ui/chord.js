// Köpradens tvåstegs snabbval (0.11.0): ren tillståndsmaskin, ingen DOM, så att den går att testa.
//
//   första tangenten   väljer kategorin (1 Defenses, 2 Units); kategorin lyser, inget göms
//   andra tangenten    inom WINDOW sekunder väljer saken i kategorin ("2" sedan "2" = Ksp 90)
//   samma kategori     efter WINDOW: stänger kategorin igen
//   Esc                stänger en öppen kategori (main.js frågar escape() först)
//
// Efter WINDOW står kategorin kvar öppen men ingenting väljs av sig själv, och nästa siffra räknas
// som en första tangent igen: samma kategori stänger, en annan kategori byter. Inom WINDOW är "2"
// följt av "2" alltså Ksp 90, inte att stänga. Klick på ett kort väljer direkt (main.js).
import { BUY_MENU } from '../data/shop.js';

export const WINDOW = 2;

export function createChord({ menu = BUY_MENU, window: win = WINDOW } = {}) {
  let cat = null, at = -Infinity;
  const valid = n => Number.isInteger(n) && n >= 1 && n <= menu.length;
  return {
    get open() { return cat; },
    // n: siffran (1-9), now: sekunder. Svar: { t: 'category', cat } | { t: 'pick', id } |
    // { t: 'close' } | { t: 'none' }.
    press(n, now) {
      if (cat != null && now - at <= win) {
        const id = menu[cat - 1]?.items[n - 1]?.id ?? null;
        if (!id) return { t: 'none' };
        cat = null;
        return { t: 'pick', id };
      }
      if (!valid(n)) return { t: 'none' };
      if (cat === n) { cat = null; return { t: 'close' }; }
      cat = n; at = now;
      return { t: 'category', cat: n };
    },
    // Esc: true om en öppen kategori stängdes (då gör tangenten inget mer).
    escape() { if (cat == null) return false; cat = null; return true; },
    reset() { cat = null; },
    // Andra tangenten väntas fortfarande (för gränssnittet: kategorin lyser starkare).
    armed: now => cat != null && now - at <= win,
  };
}
