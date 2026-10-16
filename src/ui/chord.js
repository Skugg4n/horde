// Köpradens tvåstegs snabbval (0.11.0, 0.12.0): ren tillståndsmaskin, ingen DOM, så att den går att testa.
//
//   första tangenten   väljer kategorin (1 Defenses, 2 Units); kategorin lyser, inget göms
//   andra tangenten    väljer ALLTID saken i den öppna kategorin ("2" sedan "2" = Ksp 90), hur lång
//                      tid som än gått (speltestet av 0.11.0: efter 2 s stängde "1" kategorin i stället
//                      för att ge barrikaden). En siffra utan sak gör ingenting, kategorin står kvar.
//   Esc                stänger en öppen kategori (main.js frågar escape() först); klick utanför likaså
//
// WINDOW är bara bild: så länge lyser kategorin starkare (armed), sedan lugnare men fortfarande öppen.
import { BUY_MENU } from '../data/shop.js';

export const WINDOW = 2;

// menu: köpraden, eller en funktion som ger dagens (0.13.0: förrådet per sektor och dag, shop.js dayMenu).
export function createChord({ menu: m = BUY_MENU, window: win = WINDOW } = {}) {
  let cat = null, at = -Infinity;
  const cur = () => (typeof m === 'function' ? m() : m);
  const valid = n => Number.isInteger(n) && n >= 1 && n <= cur().length;
  return {
    get open() { return cat; },
    // n: siffran (1-9), now: sekunder. Svar: { t: 'category', cat } | { t: 'pick', id } | { t: 'none' }.
    press(n, now) {
      if (cat != null) {
        const id = cur()[cat - 1]?.items[n - 1]?.id ?? null;
        if (!id) return { t: 'none' };
        cat = null;
        return { t: 'pick', id };
      }
      if (!valid(n)) return { t: 'none' };
      cat = n; at = now;
      return { t: 'category', cat: n };
    },
    // Esc: true om en öppen kategori stängdes (då gör tangenten inget mer).
    escape() { if (cat == null) return false; cat = null; return true; },
    reset() { cat = null; },
    // Nyss öppnad (för gränssnittet: kategorin lyser starkare de första WINDOW sekunderna).
    armed: now => cat != null && now - at <= win,
  };
}
