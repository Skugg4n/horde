// Byggsats för Laxne (förhandsvisning): Laxne skola (lång skolbyggnad i ljusgul panel, två våningar, fönsterband,
// skylt), Laxnegården (stor faluröd gård i två våningar med vita knutar), Fjäderfabriken (lång faluröd fabrikslänga
// med lastportar och skylt; antaget läge) och målen på bollplanen. Bryggor och båtar från gnesta-centrum-kit.js.
// Samma stil och batch som Björnlunda (gnesta-kit.js createBatch). Lokal ram: framsidan mot +z, w längs x, d längs z.
// Funktioner med textskyltar returnerar dem.
import { frame } from './gnesta-kit.js';
import { signMesh, placeIn } from './molnbo-kit.js';
import { walls, gableRoof, windowRow, flagpole } from './bjornlunda-kit.js';

export const LP = {
  schoolPanel: '#cdb983', schoolTrim: '#ece6d4', red: '#7c3226', redDark: '#5e261d', white: '#e6e1d4',
  roofTile: '#6a3f2e', roofBlack: '#3a3b3c', door: '#3b3027', goal: '#e8e4d8', net: '#c9c4b6',
};

// Laxne skola: lång länga i två våningar, gul panel med vita knutar, lertegeltak, entré med skärmtak mot skolgården.
export function laxneSchool(b, M, o) {
  const W = o.w, D = Math.min(o.d, 14), PL = 0.45, fh = 3.3, H = 2 * fh, top = PL + H;
  walls(b, M, W, D, H, LP.schoolPanel, { plinth: PL, corner: LP.schoolTrim, plinthC: '#5e5a52' });
  for (const s of ['+z', '-z']) for (let f = 0; f < 2; f++) windowRow(b, M, W, D, s, PL + f * fh + 1.7, Math.max(4, Math.round(W / 2.2)), { ww: 1.3, wh: 1.5, frame: LP.schoolTrim });
  gableRoof(b, M, W, D, top, D * 0.32, LP.roofTile, LP.schoolPanel, W >= D, 0.4);
  b.box(M, 0, PL + 1.2, D / 2 + 0.06, 2.4, 2.4, 0.06, LP.door);
  b.box(M, 0, PL + 2.8, D / 2 + 1.2, 4.2, 0.16, 2.4, LP.roofBlack);
  flagpole(b, frame(M, W / 2 - 2, 0, D / 2 + 6), 9);
  const s = signMesh('LAXNE SKOLA', 4.2, 0.7, { bg: LP.schoolTrim, fg: '#2a3a52' });
  return [placeIn(s, M, 0, PL + 3.35, D / 2 + 0.1)];
}

// Laxnegården: stor faluröd gård, två våningar, vita knutar och fönsterfoder, svart tegel.
export function laxnegarden(b, M, o) {
  const W = Math.max(o.w, 11), D = Math.min(o.d, 10), PL = 0.5, fh = 2.9, H = 2 * fh, top = PL + H;
  walls(b, M, W, D, H, LP.red, { plinth: PL, corner: LP.white, plinthC: '#6a665e' });
  for (const s of ['+z', '-z']) for (let f = 0; f < 2; f++) windowRow(b, M, W, D, s, PL + f * fh + 1.5, Math.round(W / 2.2), { ww: 1.0, wh: 1.4, frame: LP.white });
  gableRoof(b, M, W, D, top, D * 0.42, LP.roofBlack, LP.red, true, 0.45);
  b.box(M, 0, PL + 1.15, D / 2 + 0.06, 1.3, 2.3, 0.06, LP.door);
  b.box(M, 0, PL + 0.15, D / 2 + 0.9, 2.6, 0.3, 1.6, '#8a8478');   // trappan
  b.box(M, W * 0.3, top + D * 0.42 - 0.2, 0, 0.7, 1.6, 0.7, '#5a4a40');   // skorstenen
}

// Fjäderfabriken: lång länga i rött trä, en och en halv våning, två lastportar och lastkaj mot gatan, skylt.
export function fjaderfabriken(b, M, o) {
  const W = Math.max(o.w, 14), D = Math.min(o.d, 10), PL = 0.4, H = 4.6, top = PL + H;
  walls(b, M, W, D, H, LP.red, { plinth: PL, corner: LP.white, plinthC: '#5e5a52' });
  for (let x = -W / 2 + 0.5; x < W / 2; x += 0.7) for (const s of [-1, 1]) b.box(M, x, PL + H / 2, s * (D / 2 + 0.02), 0.05, H, 0.03, LP.redDark);
  windowRow(b, M, W, D, '-z', PL + 2.4, Math.round(W / 2.6), { ww: 1.1, wh: 1.2, frame: LP.white });
  windowRow(b, M, W, D, '+z', PL + 3.4, Math.round(W / 2.6), { ww: 1.0, wh: 0.9, frame: LP.white, skip: u => Math.abs(u + W * 0.22) < 2 || Math.abs(u - W * 0.18) < 2 });
  for (const u of [-W * 0.22, W * 0.18]) {
    b.box(M, u, PL + 1.5, D / 2 + 0.05, 2.8, 3.0, 0.06, LP.redDark);
    b.box(M, u, PL + 1.5, D / 2 + 0.08, 0.08, 3.0, 0.04, LP.white);
  }
  b.box(M, 0, 0.5, D / 2 + 1.1, W * 0.7, 1.0, 2.0, '#7d776b');   // lastkajen
  gableRoof(b, M, W, D, top, D * 0.34, LP.roofBlack, LP.red, true, 0.4);
  const s = signMesh('FJÄDERFABRIKEN', 5.4, 0.8, { bg: LP.white, fg: LP.redDark });
  return [placeIn(s, M, 0, top - 0.7, D / 2 + 0.1)];
}

// Fotbollsmål: vita stolpar och ribba, nätets ram bakåt (-z) i tunna rör. Lokal x längs ribban.
export function goal(b, M) {
  const W = 5, H = 2, d = 1.5, t = 0.05;
  for (const s of [-1, 1]) {
    b.box(M, s * W / 2, H / 2, 0, 0.12, H, 0.12, LP.goal);
    b.box(M, s * W / 2, t, -d / 2, t, t, d, LP.net, 'matte', 0, 0, 0, { noShadow: true });
    b.box(M, s * W / 2, H / 2, -d / 2, t, t, Math.hypot(H, d), LP.net, 'matte', 0, -Math.atan2(H, d), 0, { noShadow: true });
  }
  b.box(M, 0, H, 0, W + 0.12, 0.12, 0.12, LP.goal);
  b.box(M, 0, t, -d, W, t, t, LP.net, 'matte', 0, 0, 0, { noShadow: true });
}
