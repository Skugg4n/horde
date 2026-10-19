// Laddtiden (0.20.0, H502): mätpunkter och avsnitt i globalThis.__hordeLoad, som laddningsmätaren och
// provkörningen av laddtiden (docs/reports/2026-10-19-laddtid.md) läser. Rör ingenting i spelet; varje anrop
// kostar en performance.now. Fungerar i node (testerna).
const L = (globalThis.__hordeLoad ??= { marks: {}, ms: {} });
export const now = () => performance.now();
// en mätpunkt: tiden sedan sidan började laddas, första gången den nås
export function mark(name) { if (L.marks[name] == null) L.marks[name] = Math.round(now()); }
// lägg tiden sedan t0 till avsnittet name och ge tillbaka nu (för nästa avsnitt)
export function add(name, t0) { const t = now(); L.ms[name] = Math.round(((L.ms[name] ?? 0) + t - t0) * 10) / 10; return t; }
export function timed(name, fn) { const t0 = now(); try { return fn(); } finally { add(name, t0); } }
export const loadTimes = L;
