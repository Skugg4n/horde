// Byggsats för Björnlunda (förhandsvisning): ICA Nära Jarbells, det gula trevåningshuset vid Stationsvägen,
// Wattrangsborg (mintgrön panel, hallen och flygeln), sparbanksvillan, Sternersborgs choklad, pastorsexpeditionen,
// de låga längorna, affärs- och industrilådor, bodar i fyra färger, fruktträd, flaggstänger, plankorsningen med
// bommar och kryssmärken, busshållplatsen och gamla stationens perrongkant med namnskylten. Samma stil och batch som
// Gnesta och Mölnbo (gnesta-kit.js createBatch: varje (geometri, materialsort) blir en InstancedMesh). Skyltar med
// text är egna plan (molnbo-kit.js signMesh). Lokal ram som de andra: framsidan mot +z, w längs x, d längs z.
import { GP, UNIT, frame, villa } from './gnesta-kit.js';
import { MP, signMesh, placeIn } from './molnbo-kit.js';
import { EP, shed as e4Shed } from './e4-kit.js';

// Björnlundas palett: avmättad som resten. Wattrangsborgs mintgröna panel, ICA:s röda, den gula putsen.
export const BP = {
  mint: '#8fae9b', mintDark: '#6f8d7c', mintTrim: '#d9ddd2', doorRed: '#9a2f26',
  icaRed: '#a8292a', icaWall: '#c8c2b4', icaBand: '#8e8a80', icaGlass: '#2a3338', post: '#d7b23a',
  yellow: '#cdb06a', yellowDark: '#a88e50', plaster: '#cfc4a8', brick: '#8a5644', panel: '#b5ab93',
  sheet: '#8d9496', sheetDark: '#6c7375', sheetBlue: '#6d7f8a', roofSheet: '#4a4d4f', roofTile: '#7a4430',
  shed: { red: '#7a2e22', grey: '#8a8c86', brown: '#6a5240', green: '#5d6b4a' },
  flagBlue: '#2f5a8a', flagYellow: '#d8b23a', flagWhite: '#e8e4d8', flagRed: '#a8322a',
  boom: '#d8d3c6', boomRed: '#a8322a', signal: '#2a2b2c',
  fruit: ['#56723a', '#5f7c3f', '#4f6a35', '#668341'], apple: '#9a3a2a', cherry: '#7c2a2a', lilac: '#6a7a45',
};

// ---------- hjälpare (samma regler som molnbo-kit.js husen) ----------
export function walls(b, M, W, D, wallH, color, { plinth = 0.4, corner = MP.white, plinthC = MP.stone } = {}) {
  b.box(M, 0, plinth / 2, 0, W + 0.2, plinth, D + 0.2, plinthC);
  b.box(M, 0, plinth + wallH / 2, 0, W, wallH, D, color);
  if (corner) for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(M, cx * (W / 2 + 0.02), plinth + wallH / 2, cz * (D / 2 + 0.02), 0.2, wallH, 0.2, corner);
  b.box(M, 0, plinth + wallH - 0.1, 0, W + 0.1, 0.2, D + 0.1, corner ?? color);
}
export function gableRoof(b, M, W, D, top, rh, color, gableColor, ridgeX = true, ov = 0.4) {
  const R = ridgeX ? M : frame(M, 0, 0, 0, Math.PI / 2);
  const len = ridgeX ? W : D, span = ridgeX ? D : W, pitch = Math.atan2(rh, span / 2), t = 0.16;
  b.put(UNIT.prism, R, 0, top, 0, len, rh, span, gableColor);
  const L = (span / 2 + ov) / Math.cos(pitch);
  for (const side of [-1, 1]) {
    const zc = side * (span / 2 + ov) / 2, yc = top + rh - ((span / 2 + ov) / 2) * Math.tan(pitch);
    b.box(R, 0, yc + Math.cos(pitch) * t / 2, zc + Math.sin(pitch) * side * t / 2, len + ov * 1.4, t, L, color, 'matte', 0, side * pitch);
  }
  b.box(R, 0, top + rh + 0.05, 0, len + ov * 1.4, 0.1, 0.22, color);
}
export function win(b, M, W, D, side, u, y, ww = 1.0, wh = 1.3, frameC = MP.white, glass = GP.glass) {
  const k = side[0] === '+' ? 1 : -1, onZ = side[1] === 'z';
  const px = onZ ? u : k * (W / 2 + 0.03), pz = onZ ? k * (D / 2 + 0.03) : u;
  b.box(M, px, y, pz, onZ ? ww : 0.06, wh, onZ ? 0.06 : ww, frameC);
  b.box(M, onZ ? u : k * (W / 2 + 0.06), y, onZ ? k * (D / 2 + 0.06) : u, onZ ? ww - 0.2 : 0.04, wh - 0.2, onZ ? 0.04 : ww - 0.2, glass, 'glass');
}
export function windowRow(b, M, W, D, side, y, n, opts = {}) {
  const along = side[1] === 'z' ? W : D;
  for (let i = 0; i < n; i++) { const u = -along / 2 + (i + 0.5) * along / n; if (opts.skip?.(u)) continue; win(b, M, W, D, side, u, y, opts.ww, opts.wh, opts.frame, opts.glass); }
}
const flatRoof = (b, M, W, D, top, color = BP.roofSheet, parapet = BP.icaBand) => {
  b.box(M, 0, top + 0.08, 0, W + 0.2, 0.16, D + 0.2, color);
  for (const s of [-1, 1]) { b.box(M, 0, top + 0.35, s * (D / 2 + 0.05), W + 0.3, 0.5, 0.15, parapet); b.box(M, s * (W / 2 + 0.05), top + 0.35, 0, 0.15, 0.5, D + 0.3, parapet); }
};

// ---------- ICA Nära Jarbells ----------
// Låg butikslänga med platt tak, glasparti och entré mot gatan (+z), skärmtak, röd ICA-skylt, postens gula
// ombudsskylt, kundvagnskur och lastkaj med rulljalusi på baksidan (konvojens lastplats). Returnerar skyltarna.
export function icaStore(b, M, o) {
  const W = o.w, D = o.d, H = Math.max(4.2, Math.min(5.6, (o.h ?? 5) * 0.65)), PL = 0.3;
  walls(b, M, W, D, H, BP.icaWall, { plinth: PL, corner: null, plinthC: GP.plinth });
  flatRoof(b, M, W, D, PL + H);
  b.box(M, 0, PL + H - 0.55, D / 2 + 0.06, W, 0.7, 0.06, BP.icaRed);          // rött band under taket
  // glaspartiet och entrén
  const gw = Math.min(W * 0.55, 16), gx = -W * 0.12;
  b.box(M, gx, PL + 1.45, D / 2 + 0.05, gw, 2.6, 0.06, BP.icaGlass, 'glass');
  for (let x = gx - gw / 2; x <= gx + gw / 2 + 0.01; x += gw / 8) b.box(M, x, PL + 1.45, D / 2 + 0.08, 0.1, 2.7, 0.08, BP.icaBand, 'metal');
  b.box(M, gx, PL + 1.2, D / 2 + 0.1, 2.2, 2.3, 0.05, '#46525a', 'glass');
  // skärmtaket på stolpar
  b.box(M, gx, PL + 3.0, D / 2 + 1.4, gw + 1, 0.18, 2.8, BP.icaBand, 'metal');
  for (const s of [-1, 1]) b.box(M, gx + s * (gw / 2 + 0.2), PL + 1.5, D / 2 + 2.6, 0.14, 3.0, 0.14, BP.icaBand, 'metal');
  // kundvagnskuren och returglas
  const kx = W / 2 - 3;
  b.box(M, kx, 2.2, D / 2 + 3.2, 3.6, 0.1, 2.2, BP.icaRed);
  for (const [dx, dz] of [[-1.7, -1], [1.7, -1], [-1.7, 1], [1.7, 1]]) b.box(M, kx + dx, 1.1, D / 2 + 3.2 + dz, 0.08, 2.2, 0.08, BP.icaBand, 'metal');
  for (let i = 0; i < 6; i++) b.box(M, kx - 1.2 + i * 0.45, 0.55, D / 2 + 3.2, 0.4, 0.8, 1.6, '#9da3a5', 'metal');
  // lastkajen på baksidan
  const lx = W * 0.25;
  b.box(M, lx, 0.6, -D / 2 - 1.6, 7, 1.2, 3.2, MP.concrete);
  b.box(M, lx, PL + 1.9, -D / 2 - 0.04, 3.4, 3.2, 0.06, BP.sheetDark, 'metal');
  for (let k = 0; k < 7; k++) b.box(M, lx, PL + 0.6 + k * 0.45, -D / 2 - 0.08, 3.3, 0.04, 0.03, BP.sheet, 'metal');
  b.box(M, lx, PL + 3.8, -D / 2 - 1.2, 4.4, 0.12, 2.4, BP.roofSheet);
  // fönsterlösa sidor: stuprör och ventilation på taket
  for (const s of [-1, 1]) b.box(M, s * (W / 2 + 0.08), PL + H / 2, D / 2 - 0.3, 0.1, H, 0.1, GP.sheet, 'metal');
  for (let i = 0; i < 3; i++) b.box(M, -W * 0.3 + i * W * 0.3, PL + H + 0.6, -D * 0.15, 1.6, 1.0, 1.2, BP.sheet, 'metal');
  const ica = signMesh('ICA', 4.4, 1.5, { bg: BP.icaRed, fg: '#f4efe4', font: 'Arial Black, Arial, sans-serif', weight: 900 });
  const nara = signMesh('Nära', 2.6, 0.75, { bg: '#f4efe4', fg: BP.icaRed, font: 'Arial, sans-serif', weight: 700 });
  const post = signMesh('Ombud', 1.8, 0.6, { bg: BP.post, fg: '#1f2a44', font: 'Arial, sans-serif', weight: 700 });
  const name = signMesh('JARBELLS VARUHUS', 6, 0.55, { bg: BP.icaWall, fg: '#2a2622' });
  return [placeIn(ica, M, gx, PL + H + 1.1, D / 2 + 0.12), placeIn(nara, M, gx + 3.7, PL + H + 0.75, D / 2 + 0.12), placeIn(post, M, W / 2 - 1.6, PL + 2.6, D / 2 + 0.1), placeIn(name, M, gx, PL + 3.45, D / 2 + 2.82)];
}

// ---------- det gula trevåningshuset ----------
// Gul puts, rött tegeltak, balkonger mot gatan, butiksfönster i bottenvåningen och tre flaggstänger framför
// (Commons-fotot Stationsgatan).
export function yellowBlock(b, M, o) {
  const W = o.w, D = Math.min(o.d, 12), floors = 3, fh = 2.9, PL = 0.4, wallH = floors * fh, top = PL + wallH;
  walls(b, M, W, D, wallH, BP.yellow, { plinth: PL, corner: null, plinthC: '#8a8173' });
  gableRoof(b, M, W, D, top, 2.6, BP.roofTile, BP.yellow);
  const n = Math.max(4, Math.round(W / 3.2));
  for (const s of ['+z', '-z']) for (let f = 1; f < floors; f++) windowRow(b, M, W, D, s, PL + f * fh + 1.4, n, { wh: 1.3, ww: 1.1 });
  windowRow(b, M, W, D, '-z', PL + 1.4, n, { wh: 1.3 });
  // butiksfönstren och en markis
  windowRow(b, M, W, D, '+z', PL + 1.4, Math.max(2, Math.round(n / 2)), { wh: 2.0, ww: 2.4, frame: '#3a3a36' });
  b.box(M, -W * 0.25, PL + 2.75, D / 2 + 0.6, W * 0.4, 0.08, 1.2, '#5a3a2c', 'matte', 0, 0.25);
  // balkongerna: betongplatta, räcke i plåt
  for (let i = 0; i < n; i += 2) for (let f = 1; f < floors; f++) {
    const u = -W / 2 + (i + 0.5) * W / n;
    b.box(M, u, PL + f * fh + 0.05, D / 2 + 0.65, 2.6, 0.14, 1.3, MP.concreteLight);
    b.box(M, u, PL + f * fh + 0.55, D / 2 + 1.28, 2.6, 0.9, 0.05, '#e6e1d4', 'paint');
  }
  // skorstenar och tre flaggstänger mot gatan
  for (const x of [-W * 0.25, W * 0.25]) b.box(M, x, top + 2.0, 0, 0.7, 1.6, 0.7, '#7a3a2c');
  [[BP.flagBlue, BP.flagYellow], [BP.flagWhite, BP.flagRed], [BP.flagBlue, BP.flagYellow]].forEach((c, i) => flagpole(b, frame(M, -W * 0.3 + i * W * 0.3, 0, D / 2 + 3.4), 9, c));
}

// Flaggstång: vit stång, knopp, flagga (två färger: duken och korset/bården) som hänger lite.
export function flagpole(b, M, h = 9, [cloth, cross] = [BP.flagBlue, BP.flagYellow]) {
  b.put(UNIT.taper, M, 0, h / 2, 0, 0.14, h, 0.14, '#e6e2d8');
  b.put(UNIT.ball, M, 0, h + 0.1, 0, 0.22, 0.22, 0.22, '#c9a23a', 'metal');
  b.box(M, 1.0, h - 0.75, 0, 1.9, 1.2, 0.03, cloth, 'matte', 0, 0, -0.12);
  b.box(M, 0.75, h - 0.72, 0.01, 0.25, 1.2, 0.035, cross, 'matte', 0, 0, -0.12);
  b.box(M, 1.0, h - 0.72, 0.01, 1.9, 0.25, 0.035, cross, 'matte', 0, 0, -0.12);
}

// ---------- Wattrangsborg ----------
// Hallen: den högre delen med avfasade hörn (en åttakant), mintgrön liggande panel, lågt tak, fönsterband nertill
// och glasdörrar mot planen (Commons-fotot). Flygeln: lång envåningsdel i samma panel med pulpettak och röda dörrar.
export function wattHall(b, M, o) {
  const W = o.w, D = o.d, H = Math.max(5.5, Math.min(7.5, (o.h ?? 9) * 0.7));
  b.put(UNIT.cyl, M, 0, 0.2, 0, W + 0.3, 0.4, D + 0.3, MP.stone, 'matte', Math.PI / 8);
  b.put(UNIT.cyl, M, 0, 0.4 + H / 2, 0, W, H, D, BP.mint, 'matte', Math.PI / 8);
  for (let y = 1.1; y < H; y += 0.55) b.put(UNIT.cyl, M, 0, 0.4 + y, 0, W + 0.05, 0.04, D + 0.05, BP.mintDark, 'matte', Math.PI / 8);
  b.put(UNIT.cyl, M, 0, 0.4 + H + 0.12, 0, W + 0.8, 0.25, D + 0.8, BP.mintTrim, 'matte', Math.PI / 8);
  b.put(UNIT.cone, M, 0, 0.4 + H + 0.55, 0, W + 0.6, 0.7, D + 0.6, MP.roofSheet, 'matte', Math.PI / 7);
  // fönsterbandet och glasdörrarna mot +z
  for (let i = -2; i <= 2; i++) win(b, M, W * 0.82, D * 0.98, '+z', i * W * 0.15, 1.6, 1.4, 1.6, BP.mintTrim);
  b.box(M, 0, 1.45, D * 0.49 + 0.06, 2.4, 2.4, 0.06, BP.mintTrim);
  b.box(M, 0, 1.4, D * 0.49 + 0.1, 2.0, 2.2, 0.05, MP.glass, 'glass');
}
export function wattWing(b, M, o) {
  const W = o.w, D = o.d, H = 3.0, PL = 0.35;
  walls(b, M, W, D, H, BP.mint, { plinth: PL, corner: BP.mintTrim, plinthC: MP.stone });
  for (let y = PL + 0.5; y < PL + H; y += 0.5) for (const s of [-1, 1]) b.box(M, 0, y, s * (D / 2 + 0.02), W, 0.03, 0.03, BP.mintDark);
  // pulpettak: lutar mot baksidan
  const rise = 1.2;
  b.box(M, 0, PL + H + rise / 2, 0, W + 0.8, 0.16, Math.hypot(D + 0.8, rise), MP.roofSheet, 'matte', 0, Math.atan2(rise, D + 0.8));
  b.box(M, 0, PL + H + rise / 2, D / 2 - 0.02, W, rise, 0.1, BP.mint);
  b.box(M, W / 2 - 0.02, PL + H + rise / 2, 0, 0.1, rise * 0.9, D * 0.9, BP.mint);
  b.box(M, -W / 2 + 0.02, PL + H + rise / 2, 0, 0.1, rise * 0.9, D * 0.9, BP.mint);
  windowRow(b, M, W, D, '+z', PL + 1.6, Math.max(2, Math.round(W / 3.4)), { wh: 1.4, ww: 1.6, frame: BP.mintTrim, skip: u => Math.abs(u - W * 0.3) < 1.6 });
  windowRow(b, M, W, D, '-z', PL + 1.6, Math.max(2, Math.round(W / 4)), { frame: BP.mintTrim });
  for (const dx of [-0.6, 0.6]) b.box(M, W * 0.3 + dx, PL + 1.1, D / 2 + 0.06, 1.05, 2.2, 0.06, BP.doorRed, 'paint');
  b.box(M, -W / 2 - 0.1, PL + H / 2, D / 2 + 0.1, 0.1, H, 0.1, GP.sheet, 'metal');
  const s = signMesh('WATTRANGSBORG', 5, 0.55, { bg: BP.mintTrim, fg: '#2f3d36' });
  return [placeIn(s, M, -W * 0.15, PL + H - 0.45, D / 2 + 0.08)];
}

// ---------- sparbanksvillan ----------
// Vit tvåvåningsvilla i trä, rött tegeltak, frontespis och veranda med balkong ovanpå (Commons-fotot).
export function sparbank(b, M, o) {
  const W = o.w, D = o.d, wallH = 5.4, PL = 0.6, top = PL + wallH;
  walls(b, M, W, D, wallH, MP.white, { plinth: PL, corner: '#f0ece0' });
  for (let y = PL + 0.3; y < top; y += 0.32) for (const s of [-1, 1]) b.box(M, 0, y, s * (D / 2 + 0.02), W, 0.025, 0.025, '#cfcabd');
  gableRoof(b, M, W, D, top, 2.9, BP.roofTile, MP.white);
  for (const s of ['+z', '-z']) { windowRow(b, M, W, D, s, PL + 1.5, 4, { wh: 1.5, skip: u => s === '+z' && Math.abs(u) < 1.4 }); windowRow(b, M, W, D, s, PL + 4.1, 4, { wh: 1.4 }); }
  // frontespisen
  b.box(M, 0, top + 0.8, D / 2 - 0.8, 3.6, 1.6, 1.6, MP.white);
  gableRoof(b, frame(M, 0, 0, D / 2 - 0.8), 3.6, 3.0, top + 1.6, 1.4, BP.roofTile, MP.white, false, 0.2);
  // verandan med balkong
  const vw = 3.6, vd = 2.2;
  b.box(M, 0, 0.3, D / 2 + vd / 2, vw + 0.3, 0.6, vd + 0.3, MP.stone);
  for (const dx of [-vw / 2, vw / 2]) for (const dz of [vd - 0.1]) b.put(UNIT.cyl6, M, dx, 1.8, D / 2 + dz, 0.16, 2.4, 0.16, MP.white);
  b.box(M, 0, 3.05, D / 2 + vd / 2, vw + 0.3, 0.2, vd + 0.3, MP.white);
  for (let x = -vw / 2; x <= vw / 2; x += 0.25) b.box(M, x, 3.5, D / 2 + vd + 0.05, 0.05, 0.7, 0.05, MP.white);
  b.box(M, 0, 3.85, D / 2 + vd + 0.05, vw, 0.07, 0.07, MP.white);
  for (let x = -vw / 2 + 0.2; x <= vw / 2; x += 0.25) if (Math.abs(x) > 0.6) b.box(M, x, 1.0, D / 2 + vd - 0.1, 0.05, 0.8, 0.05, MP.white);
  b.box(M, 0, PL + 1.15, D / 2 + 0.05, 1.1, 2.3, 0.06, '#7a3a2c');
  b.box(M, W * 0.25, top + 2.2, 0, 0.6, 1.6, 0.6, '#7a3a2c');
}

// Villa med skylt (Sternersborgs choklad och glassbar, pastorsexpeditionen). Returnerar skylten.
export function signedVilla(b, M, o, text, sub, colors) {
  const f = villa(b, M, { ...o, storeys: 1.5, garage: 0, solar: false, veranda: false, chimney: true });
  const s = signMesh(text, 3.4, 0.8, { bg: colors.bg, fg: colors.fg, sub });
  return [placeIn(s, M, f.winU ?? 0, f.winY + 0.95, o.d / 2 + 0.1)];
}

// ---------- längor, affärer och industri ----------
// Låg länga i två våningar (lägenheter mellan Stationsvägen och Smedjevägen): tegel, puts eller panel, flackt
// sadeltak, entréer med skärmtak mot gatan.
export function rowBlock(b, M, o) {
  const W = o.w, D = Math.min(o.d, 11), floors = 2, fh = 2.8, PL = 0.35, wallH = floors * fh, top = PL + wallH;
  const c = o.wall === 'brick' ? BP.brick : o.wall === 'panel' ? BP.panel : BP.plaster;
  walls(b, M, W, D, wallH, c, { plinth: PL, corner: null, plinthC: '#7d776b' });
  gableRoof(b, M, W, D, top, 1.6, o.wall === 'brick' ? MP.roofSheet : BP.roofTile, c);
  const n = Math.max(3, Math.round(W / 2.8)), ne = Math.max(1, Math.round(W / 12));
  const doorU = i => -W / 2 + (i + 0.5) * W / ne;
  for (const s of ['+z', '-z']) for (let f = 0; f < floors; f++) windowRow(b, M, W, D, s, PL + f * fh + 1.45, n, { wh: 1.25, skip: u => s === '+z' && f === 0 && Array.from({ length: ne }, (_, i) => doorU(i)).some(d => Math.abs(u - d) < 1.3) });
  for (let i = 0; i < ne; i++) {
    const u = doorU(i);
    b.box(M, u, PL + 1.1, D / 2 + 0.05, 1.2, 2.2, 0.06, '#3b3027');
    b.box(M, u, PL + 2.5, D / 2 + 0.6, 2.0, 0.12, 1.2, MP.roofSheet);
  }
}
// Affärslåda: en våning, platt tak med kant, skyltfönster eller plåtport mot gatan.
export function commercial(b, M, o) {
  const W = o.w, D = o.d, H = Math.max(3.4, Math.min(5.5, (o.h ?? 5) * 0.75)), PL = 0.25;
  const c = o.wall === 'brick' ? BP.brick : o.wall === 'panel' ? BP.sheet : BP.plaster;
  walls(b, M, W, D, H, c, { plinth: PL, corner: null, plinthC: GP.plinth });
  flatRoof(b, M, W, D, PL + H, BP.roofSheet, o.wall === 'brick' ? '#6e4536' : BP.sheetDark);
  if (o.seed % 2) windowRow(b, M, W, D, '+z', PL + 1.4, Math.max(1, Math.round(W / 4)), { ww: 2.6, wh: 1.9, frame: '#3a3a36' });
  else { b.box(M, -W * 0.2, PL + 1.6, D / 2 + 0.04, 3.2, 3.0, 0.06, BP.sheetDark, 'metal'); windowRow(b, M, W, D, '+z', PL + 1.6, 2, { skip: u => u < 0 }); }
}
// Industrihall: plåt med stående profiler, flackt sadeltak, två portar.
export function industrial(b, M, o) {
  const W = o.w, D = o.d, H = Math.max(5, Math.min(8, (o.h ?? 8) * 0.8));
  b.box(M, 0, H / 2, 0, W, H, D, BP.sheetBlue);
  for (let x = -W / 2; x <= W / 2; x += 1.2) for (const s of [-1, 1]) b.box(M, x, H / 2, s * (D / 2 + 0.03), 0.12, H, 0.06, BP.sheet, 'metal');
  gableRoof(b, M, W, D, H, 1.4, BP.roofSheet, BP.sheetBlue, true, 0.3);
  for (const x of [-W * 0.25, W * 0.15]) { b.box(M, x, 2.2, D / 2 + 0.06, 4.2, 4.4, 0.06, BP.sheetDark, 'metal'); b.box(M, x, 4.6, D / 2 + 0.5, 4.8, 0.12, 1.0, BP.roofSheet); }
}
// Bod: liten, i någon av fyra färger (röd med vita knutar som på gårdarna).
export function shedK(b, M, o) {
  e4Shed(b, M, { w: o.w, d: o.d, color: BP.shed[o.color] ?? BP.shed.red, roof: o.color === 'grey' ? BP.roofSheet : EP.farmRoof });
}

// ---------- trädgården ----------
// Fruktträd: kort stam, bred krona. kind 0 äpple (röda prickar), 1 körsbär/plommon (mörka prickar, högre),
// 2 syren (låg buske i flera klumpar), 3 rönn (smal, hög).
export function fruitTree(b, x, z, h, kind, r) {
  const M = frame(null, x, 0, z, r() * 6);
  if (kind === 2) {
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + r(), d = r.range(0.3, 1.0); b.put(UNIT.blob, M, Math.cos(a) * d, h * 0.42, Math.sin(a) * d, h * 0.55, h * 0.75, h * 0.55, r.pick([BP.lilac, ...BP.fruit]), 'matte', r() * 6); }
    return;
  }
  const trunk = kind === 3 ? h * 0.45 : h * 0.3, R = kind === 3 ? h * 0.24 : h * 0.4;
  b.put(UNIT.taper, M, 0, trunk / 2, 0, 0.26, trunk, 0.26, GP.bark, 'matte', 0, 0, r.range(-0.08, 0.08));
  const c = r.pick(BP.fruit);
  b.put(UNIT.blob, M, 0, trunk + R * 0.6, 0, R * 2.2, R * (kind === 3 ? 2.2 : 1.4), R * 2.2, c, 'matte', r() * 6);
  b.put(UNIT.blob, M, R * 0.5, trunk + R * 0.4, -R * 0.3, R * 1.3, R * 0.9, R * 1.3, r.pick(BP.fruit), 'matte', r() * 6);
  if (kind <= 1) for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2, rr = R * r.range(0.6, 1.05), y = trunk + R * r.range(0.2, 1.0);
    b.put(UNIT.ball, M, Math.cos(a) * rr, y, Math.sin(a) * rr, 0.22, 0.22, 0.22, kind === 0 ? BP.apple : BP.cherry, 'matte', 0, 0, 0, { noShadow: true });
  }
}

// ---------- järnvägen ----------
// Plankorsningen: ramen på spårets mittlinje, lokal x längs spåret, vägen tvärs (lokal z). roadW: vägens bredd,
// half: halva järnvägens bredd. Gummipaneler mellan rälerna, fällda bommar uppfällda (rödvita), kryssmärken
// och blinkljus på var sida.
export function levelCrossing(b, M, roadW, half, tracks = [-2.25, 2.25]) {
  // vägbanan över spåren (täcker sliprarna, rälerna sticker upp) och gummipaneler mellan rälerna
  b.box(M, 0, 0.13, 0, roadW + 0.4, 0.26, half * 2 - 2.4, GP.asphalt, 'matte', 0, 0, 0, { noShadow: true });
  for (const v of tracks) b.box(M, 0, 0.265, v, roadW + 0.6, 0.03, 1.3, '#2c2b29', 'matte', 0, 0, 0, { noShadow: true });
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const x = sx * (roadW / 2 + 0.9), z = sz * (half - 0.4);
    // bomstolpen med motorlåda och uppfälld bom
    b.box(M, x, 0.6, z, 0.4, 1.2, 0.4, BP.signal, 'paint');
    for (let k = 0; k < 6; k++) b.box(M, x, 1.3 + k * 0.6, z, 0.14, 0.6, 0.14, k % 2 ? BP.boomRed : BP.boom, 'paint');
    if (sx !== sz) continue;
    // kryssmärket och blinkljusen
    const P = frame(M, x + sx * 1.1, 0, z);
    b.box(P, 0, 1.6, 0, 0.1, 3.2, 0.1, '#6f716e', 'metal');
    for (const a of [0.6, -0.6]) b.box(P, 0, 2.9, 0, 1.6, 0.26, 0.05, '#e8e4d8', 'paint', Math.PI / 2, 0, a);
    for (const a of [0.6, -0.6]) b.box(P, 0, 2.9, 0.03, 1.5, 0.1, 0.03, BP.flagRed, 'paint', Math.PI / 2, 0, a);
    b.box(P, 0, 2.15, 0, 0.9, 0.12, 0.12, BP.signal, 'metal', Math.PI / 2);
    for (const k of [-0.38, 0.38]) b.put(UNIT.disc, P, sz * 0.08, 2.15, k, 0.3, 0.04, 0.3, k > 0 ? '#ff5a3c' : '#5a2a24', k > 0 ? 'glow' : 'matte', 0, 0, Math.PI / 2);
  }
}
// Gamla stationens perrongkant (lokal x längs spåret, +z bort från spåret) med namnskylten och en gammal lykta.
// Returnerar skylten.
export function oldStation(b, M, L = 34) {
  b.box(M, 0, 0.35, 1.4, L, 0.7, 2.8, MP.stone);
  b.box(M, 0, 0.71, 0.15, L, 0.04, 0.3, MP.platformEdge, 'matte', 0, 0, 0, { noShadow: true });
  for (let x = -L / 2 + 1; x < L / 2; x += 2.3) b.box(M, x, 0.73, 1.5, 0.05, 0.02, 2.6, '#6e695e', 'matte', 0, 0, 0, { noShadow: true });
  for (const s of [-1, 1]) b.box(M, s * 1.6, 1.9, 2.4, 0.12, 2.4, 0.12, '#2e3133', 'metal');
  for (const x of [-L * 0.3, L * 0.3]) { b.box(M, x, 2.3, 2.4, 0.12, 3.2, 0.12, '#2e3133', 'metal'); b.box(M, x, 3.9, 2.4, 0.5, 0.35, 0.5, GP.lampHead, 'metal'); b.box(M, x, 3.72, 2.4, 0.4, 0.05, 0.4, GP.lampGlow, 'glow'); }
  const s = signMesh('BJÖRNLUNDA', 3.6, 0.6, { bg: '#f1ede2', fg: '#1d1d1b', font: 'Arial, sans-serif', weight: 700 });
  return [placeIn(s, M, 0, 2.9, 2.47)];
}
// Busshållplatsen: väntkur (som Mölnbo) och hållplatsskylten på en stolpe. Returnerar skylten.
export function busStop(b, M) {
  const W = 3.4, D = 1.4, H = 2.3;
  b.box(M, 0, H + 0.08, 0, W + 0.3, 0.16, D + 0.3, MP.shelterRoof);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(M, dx * W / 2, H / 2, dz * D / 2, 0.08, H, 0.08, MP.shelterFrame, 'metal');
  b.box(M, 0, H / 2 + 0.1, -D / 2, W, H - 0.2, 0.04, MP.glass, 'glass');
  b.box(M, 0, 0.45, -D / 2 + 0.3, W - 0.4, 0.08, 0.45, MP.bench);
  b.box(M, W / 2 + 1.2, 1.4, D / 2, 0.08, 2.8, 0.08, '#6f716e', 'metal');
  const s = signMesh('Björnlunda', 0.9, 0.9, { bg: '#2f5d8a', fg: '#f4f0e4', font: 'Arial, sans-serif', weight: 700, sub: 'buss' });
  return [placeIn(s, M, W / 2 + 1.2, 2.6, D / 2 + 0.06)];
}
