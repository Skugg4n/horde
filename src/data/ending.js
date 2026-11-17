// v1:s slutscen på kartbordet (0.27.0). Kampanjen tar slut tills vidare efter Västerkärv (dag 14 efter FALL BACK,
// dag 15 efter DEFEND LAXNE). Fortsättningen (dag 15 till 21, Björnlunda och det som växer på spåret) står i
// docs/superpowers/specs/2026-10-18-kampanjplan.md avsnitt 10 och docs/superpowers/specs/2026-10-21-slutspelet-design.md.
// Scenen ritas av src/ui/table.js (endingScene i tableSheet); när den visas och vad som sparas: src/meta/table.js.
//
// ---------- TEXTERNA ----------
// PLATSHÅLLARE: Olas egna texter kommer senare. Fyll i avsnittet SLUTET i docs/ola/texter-mall.md, så byts de här.
// Måtten: radion högst 30 ord (som bordets andra remsor), stämpeln högst 18 tecken, slutbladet högst 20 ord.
export const ENDING_TEXT = {
  // radioremsan som kommer sist i scenen och sedan ligger kvar på bordet
  radio: {
    at: '06:40', from: 'Västerkärv',
    text: 'Västerkärv is clear. Everyone is out. A rail patrol reports something on the line west of Björnlunda station. It is not moving. It is growing.',
  },
  // stämpeln som landar på kartan
  stamp: 'TO BE CONTINUED',
  // slutbladet (rubrik, text och knappen)
  sheet: { head: 'Operation Södermanland', text: 'Campaign continues in a later version. Thank you for holding Gnesta.', button: 'To menu' },
  // den lilla raden medan scenen går
  skip: 'Click or Esc to skip',
  // länken i huvudmenyn när kampanjen är slut
  replay: 'Replay ending',
};

// ---------- tidslinjen (sekunder från scenens början) ----------
// 0 till 2,5 kartan: det som hölls och det som gick förlorat. 2,5 till 12 trådarna ritar sig från väster mot Björnlunda.
// 12,5 radion. 16,5 stämpeln. 18,3 slutbladet. 19,6 klart.
export const ENDING_TIME = { threads: 2.5, mass: 9, radio: 12.5, stamp: 16.5, sheet: 18.3, done: 19.6 };

// ---------- trådarna (bild, inte regler) ----------
// Målet: banvallen strax väster om Björnlunda station (src/data/table.js RAILS, mellan 17.163 och 17.0 öst).
export const ENDING_TARGET = [17.146, 59.0738];
// Varje tråd: punkter (longitud, latitud) från kartans västra kant mot målet; w = tjocklek; d = när den börjar (s).
export const THREADS = [
  // längs järnvägen från Flen
  { w: 3.4, d: 0, pts: [[16.35, 59.036], [16.48, 59.052], [16.6, 59.063], [16.72, 59.062], [16.86, 59.078], [17.0, 59.083], [17.09, 59.076]] },
  // från nordväst, förbi Laxne
  { w: 2.6, d: 0.6, pts: [[16.35, 59.215], [16.52, 59.2], [16.7, 59.175], [16.86, 59.15], [16.99, 59.13], [17.07, 59.104], [17.12, 59.085]] },
  // från sydväst, över Båven
  { w: 2.8, d: 1.1, pts: [[16.35, 58.94], [16.5, 58.965], [16.66, 59.0], [16.8, 59.02], [16.94, 59.045], [17.06, 59.06], [17.12, 59.07]] },
  // längre söderifrån
  { w: 2.0, d: 1.8, pts: [[16.35, 58.8], [16.44, 58.88], [16.58, 58.96], [16.78, 59.03], [16.98, 59.06], [17.1, 59.072]] },
  // en tunn från norr, längs väg 53
  { w: 1.6, d: 2.4, pts: [[16.77, 59.28], [16.84, 59.22], [16.93, 59.17], [17.03, 59.12], [17.11, 59.088]] },
];
