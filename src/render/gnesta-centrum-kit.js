// Byggsats för Gnesta centrum (förhandsvisning). Husen ur Commons-fotona och kommunens kulturmiljöanalys (2023):
// brandstationen (vagnhall med röda portar, slangtorn), samlingslokalen och kommunhuset från 1960 (ljus sten med
// mörk plåtkrön och skärmtak, tegellänga i två våningar), stationshuset från 1907 (rött tegel, skiffertak, mittpaviljong
// med svängd gavel och tre rundbågefönster), stenstaden vid Stora torget (puts, tornhuv, mansardtak), Tingshuset (gul
// puts, valmat tak), vattentornet från 1914 (putsat torn med plåthuv), skolan och idrottshallen på höjden, bryggeriet
// (rött tegel, rundbågar, gul skorsten), Bryggeriholmens 2000-talshus, bryggor och båtar. Generiska hus efter ålder och
// användning: centrumhus med butiker, lamellhus, 1960-talets platta centrumhus. Gatulivet: bilar (också boxiga
// Volvokombi), cykelställ, bänkar, planteringar. Inga riktiga företagsnamn på skyltarna.
//
// Samma batch som de andra (gnesta-kit.js createBatch: varje geometri och materialsort blir en InstancedMesh).
// Lokal ram: framsidan mot +z, w längs x, d längs z. Funktioner som har textskyltar returnerar dem.
import { GP, UNIT, frame, villa, forskola, sportHall, car } from './gnesta-kit.js';
import { MP, signMesh, placeIn, platform, shelter } from './molnbo-kit.js';
import { bus } from './e4-kit.js';
import { walls, gableRoof, win, windowRow, flagpole, BP } from './bjornlunda-kit.js';

// Gnesta centrums palett: avmättad som resten. Puts i ockra, gräddvitt och rosa, rött och gult tegel.
export const CP = {
  facade: {
    ochre: '#c6a463', cream: '#d6cba9', pink: '#c49a8c', white: '#d9d4c6', brick: '#8a4f3c', grey: '#a8a69e',
    yellowBrick: '#c2aa70', beige: '#c4b48f', red: '#7c3a2c', yellow: '#cdb06a', green: '#8f9f86',
  },
  roof: { tile: '#6a3f2e', black: '#3e3e3e', sheet: '#4a4d4f', copper: '#4f6a5e', slate: '#4e5458', brown: '#5a3a2e' },
  trim: '#e6e1d4', plinth: '#5e5a52', stone: '#c9bc9a', fascia: '#3f4a47', glass: '#26313a', frameDark: '#3a3a36',
  fireRed: '#a8322a', fireDoor: '#b03a2e', fireYellow: '#d8b23a', plasterLight: '#dcd8cc',
  awning: ['#3f5f4a', '#7a2e24', '#2f4a6a', '#6b5a3a', '#4a4a4a', '#8a6a2a'],
  signBand: ['#2f4a35', '#7a2e24', '#2f3f5a', '#e6e1d4', '#3a3a3a', '#8a6a2a'],
  green: '#2f5a3c', boat: ['#e6e3da', '#d9d6cc', '#c9c6bc', '#8a2a24', '#2f4a6a', '#e6e3da'], deck: '#8a7356', post: '#4f4235',
  volvo: ['#8a2a24', '#2e3b4e', '#c9c4b6', '#3e4a3c', '#6b6e70', '#1f2124', '#7a6a4a'],
  granite: '#8a5a50', bronze: '#4a5a4e', planter: '#8a8c88',
};
const F = k => CP.facade[k] ?? GP.facade[k] ?? k ?? CP.facade.cream;

// ---------- byggdelar ----------
function flatRoof(b, M, W, D, top, color = CP.roof.sheet, parapet = '#6c6a64', ph = 0.45) {
  b.box(M, 0, top + 0.08, 0, W + 0.1, 0.16, D + 0.1, color);
  for (const s of [-1, 1]) { b.box(M, 0, top + ph / 2, s * (D / 2 + 0.04), W + 0.2, ph, 0.14, parapet); b.box(M, s * (W / 2 + 0.04), top + ph / 2, 0, 0.14, ph, D + 0.2, parapet); }
}
function hipRoof(b, M, W, D, top, rh, color) {
  // ryggen längs den längre sidan
  const R = W >= D ? M : frame(M, 0, 0, 0, Math.PI / 2), L = Math.max(W, D), S = Math.min(W, D);
  b.put(UNIT.hip, R, 0, top, 0, L + 0.7, rh, S + 0.7, color);
}
// Taket efter sort: gable, hip, flat, mansard (brant nedre del och flackt valmat överst).
export function roofOf(b, M, W, D, top, kind, color, gableColor) {
  if (kind === 'flat') { flatRoof(b, M, W, D, top); return top + 0.5; }
  if (kind === 'hip') { const rh = Math.min(W, D) * 0.32; hipRoof(b, M, W, D, top, rh, color); return top + rh; }
  if (kind === 'mansard') {
    const h1 = 2.4, i = 0.7;
    b.box(M, 0, top + h1 / 2, 0, W + 0.3, h1, D + 0.3, CP.roof.black);
    for (const s of [-1, 1]) b.box(M, 0, top + h1 / 2, s * (D / 2 + 0.18), W - 0.2, h1 * 0.95, 0.4, CP.roof.slate, 'matte', 0, -s * 0.35);
    // takkupor i den branta delen
    for (let x = -W / 2 + 2; x < W / 2 - 1.5; x += 3) for (const s of [-1, 1]) { b.box(M, x, top + h1 * 0.55, s * (D / 2 + 0.25), 1.2, 1.2, 0.6, CP.trim); b.box(M, x, top + h1 * 0.55, s * (D / 2 + 0.56), 0.8, 0.85, 0.04, CP.glass, 'glass'); }
    const rh = Math.min(W, D) * 0.16; hipRoof(b, M, W - i * 2, D - i * 2, top + h1, rh, CP.roof.black);
    return top + h1 + rh;
  }
  const ridgeX = W >= D, span = ridgeX ? D : W, rh = span * 0.36;
  gableRoof(b, M, W, D, top, rh, color, gableColor, ridgeX, 0.35);
  return top + rh;
}
// Butiksfasad i bottenvåningen mot +z: skyltfönster i mörk ram, dörrar, skyltband och ibland markis.
function shopfront(b, M, W, D, PL, r) {
  const n = Math.max(1, Math.round(W / 6));
  for (let i = 0; i < n; i++) {
    const u = -W / 2 + (i + 0.5) * W / n, sw = W / n - 1.2;
    b.box(M, u, PL + 1.35, D / 2 + 0.04, sw, 2.2, 0.06, CP.frameDark, 'metal');
    b.box(M, u + 0.3, PL + 1.4, D / 2 + 0.08, sw - 1.6, 1.9, 0.04, CP.glass, 'glass');
    b.box(M, u - sw / 2 + 0.6, PL + 1.1, D / 2 + 0.08, 0.95, 2.2, 0.04, '#4a4f52', 'glass');
    b.box(M, u, PL + 2.75, D / 2 + 0.08, sw, 0.5, 0.06, r.pick(CP.signBand), 'paint');
    if (r() < 0.45) b.box(M, u, PL + 2.3, D / 2 + 0.75, sw, 0.08, 1.4, r.pick(CP.awning), 'matte', 0, 0.32);
  }
}
const seeded = s => { let a = s >>> 0; const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; r.pick = a => a[(r() * a.length) | 0]; r.range = (a0, a1) => a0 + r() * (a1 - a0); return r; };

// Generiska skyltord (inga riktiga företag). Ett textplan per butik kostar ett ritanrop: bara de första N får text.
const SHOP_WORDS = [['BAGERI', 'kaffe & bröd'], ['KAFÉ', null], ['BLOMMOR', null], ['SKOR', null], ['BOKHANDEL', null], ['APOTEK', null], ['FRISÖR', null],
  ['PIZZERIA', null], ['JÄRN & FÄRG', null], ['OPTIK', null], ['KIOSK', 'tidningar'], ['RESTAURANG', null], ['BANK', null], ['MÄKLARE', null], ['ELEKTRONIK', null], ['GULDSMED', null]];
let shopSigns = 0;
export const SIGN_BUDGET = { max: 22 };
function shopSign(M, W, D, PL, r) {
  if (shopSigns >= SIGN_BUDGET.max) return [];
  const [t, sub] = SHOP_WORDS[shopSigns % SHOP_WORDS.length]; shopSigns++;
  const s = signMesh(t, Math.min(4.2, W * 0.5), 0.5, { bg: '#ece6d6', fg: r.pick(['#2a2622', '#5a2a1e', '#1f3a2a', '#1f2a44']), sub });
  return [placeIn(s, M, -W * 0.18, PL + 2.75, D / 2 + 0.12)];
}

// ---------- centrumhus i två-tre våningar (puts eller tegel), butiker i bottenvåningen mot gatan ----------
export function townBlock(b, M, o) {
  const r = seeded(o.seed ?? 1), W = o.w, D = Math.min(o.d, 13), n = o.storeys ?? 2, fh = 3.0, PL = 0.4, wallH = n * fh, top = PL + wallH;
  const c = F(o.facade), brick = ['brick', 'yellowBrick'].includes(o.facade);
  walls(b, M, W, D, wallH, c, { plinth: PL, corner: brick ? null : CP.trim, plinthC: CP.plinth });
  // våningsband (äldre puts) och fönster i jämn rytm
  if (!brick) for (let f = 1; f < n; f++) b.box(M, 0, PL + f * fh, 0, W + 0.12, 0.16, D + 0.12, CP.trim);
  const nw = Math.max(3, Math.round(W / 2.6));
  for (const s of ['+z', '-z']) for (let f = 0; f < n; f++) {
    if (f === 0 && s === '+z' && o.shop) continue;
    windowRow(b, M, W, D, s, PL + f * fh + 1.55, nw, { wh: 1.35, ww: 1.05, frame: brick ? CP.trim : '#ece8dc', skip: u => f === 0 && s === '+z' && Math.abs(u) < 1 });
  }
  for (const s of ['+x', '-x']) for (let f = 1; f < n; f++) windowRow(b, M, W, D, s, PL + f * fh + 1.55, Math.max(1, Math.round(D / 4)), { wh: 1.3 });
  let signs = [];
  if (o.shop) { shopfront(b, M, W, D, PL, r); signs = shopSign(M, W, D, PL, r); }
  else { b.box(M, 0, PL + 1.15, D / 2 + 0.05, 1.3, 2.3, 0.06, r.pick(GP.door)); b.box(M, 0, PL + 2.5, D / 2 + 0.45, 1.8, 0.1, 0.9, CP.roof.sheet); }
  const ridge = roofOf(b, M, W, D, top, o.roof ?? 'gable', o.roof === 'flat' ? CP.roof.sheet : r() < 0.6 ? CP.roof.tile : CP.roof.black, c);
  if (o.roof !== 'flat') for (const x of [-W * 0.25, W * 0.3]) b.box(M, x, ridge - 0.3, 0, 0.6, 1.4, 0.6, '#6a5246');
  return signs;
}
export const shopBlock = (b, M, o) => townBlock(b, M, { ...o, shop: true });

// ---------- stenstaden vid Stora torget (1890-1910) ----------
// Puts i grädde eller rosa, rusticerad bottenvåning, gesimser, smårutade fönster i tät rytm, små balkonger,
// mansard- eller valmat tak. tower: runt hörntorn ett halvt plan högre med röd spetsig huv (Stora Hotellet).
export function stenstad(b, M, o) {
  const r = seeded(o.seed ?? 3), W = o.w, D = Math.min(o.d, 13), n = o.storeys ?? 3, fh = 3.1, PL = 0.5, wallH = n * fh, top = PL + wallH;
  const c = F(o.facade);
  walls(b, M, W, D, wallH, c, { plinth: PL, corner: null, plinthC: '#6e6658' });
  b.box(M, 0, PL + fh / 2, 0, W + 0.1, fh, D + 0.1, o.facade === 'pink' ? '#b48a7e' : '#c4b896');   // rusticerad bottenvåning
  for (let f = 1; f <= n; f++) b.box(M, 0, PL + f * fh - (f === n ? 0.1 : 0), 0, W + 0.24, 0.22, D + 0.24, CP.trim);
  const nw = Math.max(4, Math.round(W / 2.2));
  for (const s of ['+z', '-z']) for (let f = 1; f < n; f++) {
    windowRow(b, M, W, D, s, PL + f * fh + 1.55, nw, { wh: 1.6, ww: 0.95, frame: CP.trim });
    for (let i = 0; i < nw; i++) b.box(M, -W / 2 + (i + 0.5) * W / nw, PL + f * fh + 2.5, (s === '+z' ? 1 : -1) * (D / 2 + 0.07), 1.25, 0.2, 0.08, CP.trim);   // fönsteröverstycken
  }
  // små balkonger med smide mitt på framsidan
  for (let f = 1; f < n; f++) { b.box(M, 0, PL + f * fh + 0.08, D / 2 + 0.45, 2.6, 0.14, 0.9, CP.trim); b.box(M, 0, PL + f * fh + 0.55, D / 2 + 0.88, 2.6, 0.75, 0.05, '#2a2b2c', 'metal'); }
  let signs = [];
  if (o.shop) { shopfront(b, M, W, D, PL, r); signs = shopSign(M, W, D, PL, r); }
  else windowRow(b, M, W, D, '+z', PL + 1.5, Math.max(2, Math.round(W / 3.4)), { wh: 1.6, frame: CP.trim });
  roofOf(b, M, W, D, top, o.roof ?? 'mansard', CP.roof.black, c);
  for (const x of [-W * 0.3, W * 0.1, W * 0.35]) b.box(M, x, top + 3.0, -D * 0.1, 0.7, 1.8, 0.7, '#6a5246');
  if (o.tower) {
    const tx = W / 2 - 1.6, tz = D / 2 - 1.6, R = 3.6, th = wallH + 3.2;
    b.put(UNIT.cyl, M, tx, PL + th / 2, tz, R, th, R, c, 'matte', Math.PI / 8);
    for (let f = 1; f <= n; f++) b.put(UNIT.cyl, M, tx, PL + f * fh, tz, R + 0.25, 0.2, R + 0.25, CP.trim, 'matte', Math.PI / 8);
    for (let f = 1; f < n + 1; f++) for (const a of [0.3, 1.1, -0.5]) b.box(M, tx + Math.sin(a) * (R / 2 + 0.03), PL + f * fh + 1.5, tz + Math.cos(a) * (R / 2 + 0.03), 0.8, 1.3, 0.06, CP.glass, 'glass', a);
    b.put(UNIT.cone, M, tx, PL + th + 2.0, tz, R + 0.5, 4.0, R + 0.5, '#9a3a2c', 'matte', Math.PI / 7);
    b.box(M, tx, PL + th + 4.6, tz, 0.08, 1.4, 0.08, '#3a3a36', 'metal');
    // det andra tornet på hotellets andra hörn: lägre, med kupolhuv
    const ux = -W / 2 + 1.5;
    b.put(UNIT.cyl, M, ux, PL + (wallH + 1.6) / 2, tz, 3.0, wallH + 1.6, 3.0, c, 'matte', Math.PI / 8);
    b.put(UNIT.ball, M, ux, PL + wallH + 1.6, tz, 3.2, 3.0, 3.2, '#8a7a4e', 'metal');
  }
  return signs;
}

// ---------- lamellhus 1950-70 ----------
// Tre våningar i gult eller rött tegel eller ljus puts, trapphusentréer med skärmtak, balkonger i kolumner mot
// gården (-z), lågt sadeltak eller platt tak.
export function lamell(b, M, o) {
  const r = seeded(o.seed ?? 5), W = o.w, D = Math.min(o.d, 12), n = o.storeys ?? 3, fh = 2.8, PL = 0.45, wallH = n * fh, top = PL + wallH;
  const c = F(o.facade);
  walls(b, M, W, D, wallH, c, { plinth: PL, corner: null, plinthC: CP.plinth });
  const nw = Math.max(4, Math.round(W / 2.4)), ne = Math.max(1, Math.round(W / 14));
  const door = i => -W / 2 + (i + 0.5) * W / ne;
  let signs = [];
  if (o.shop) { shopfront(b, M, W, D, PL, r); signs = shopSign(M, W, D, PL, r); }
  for (const s of ['+z', '-z']) for (let f = 0; f < n; f++) {
    if (o.shop && f === 0 && s === '+z') continue;
    windowRow(b, M, W, D, s, PL + f * fh + 1.45, nw, { wh: 1.25, ww: 1.2, frame: '#e4e0d4', skip: u => s === '+z' && Array.from({ length: ne }, (_, i) => door(i)).some(d => Math.abs(u - d) < 1.0) });
  }
  for (let i = 0; i < ne; i++) {
    const u = door(i);
    if (!o.shop) { b.box(M, u, PL + 1.1, D / 2 + 0.05, 1.4, 2.2, 0.06, '#4a3a2c'); b.box(M, u, PL + 2.45, D / 2 + 0.55, 2.2, 0.12, 1.1, CP.roof.sheet); }
    for (let f = 1; f < n; f++) win(b, M, W, D, '+z', u, PL + f * fh + 0.4, 0.9, 1.0, '#e4e0d4');    // trapphusfönster
  }
  // balkonger mot gården
  for (let i = 0; i < nw; i += 2) for (let f = 0; f < n; f++) {
    const u = -W / 2 + (i + 0.5) * W / nw;
    b.box(M, u, PL + f * fh + 0.3, -D / 2 - 0.7, 2.6, 0.14, 1.4, MP.concreteLight);
    b.box(M, u, PL + f * fh + 0.85, -D / 2 - 1.38, 2.6, 0.95, 0.06, r() < 0.5 ? '#d8d3c4' : '#7a6a52', 'paint');
  }
  roofOf(b, M, W, D, top, o.roof ?? 'gable', o.roof === 'flat' ? CP.roof.sheet : CP.roof.tile, c);
  return signs;
}

// ---------- 1960-70-talets centrumhus (posthuset, biblioteket) ----------
// Platt tak med mörkbrunt krön, fönsterband, ljus panel eller gult tegel, butiker med gröna markiser i bottenvåningen.
export function centrumhus(b, M, o) {
  const r = seeded(o.seed ?? 7), W = o.w, D = o.d, n = o.storeys ?? 2, fh = 3.1, PL = 0.2, wallH = n * fh, top = PL + wallH;
  const c = F(o.facade);
  walls(b, M, W, D, wallH, c, { plinth: PL, corner: null, plinthC: CP.plinth });
  b.box(M, 0, top - 0.45, 0, W + 0.12, 0.9, D + 0.12, '#5a3e30');             // mörkt krön
  b.box(M, 0, top + 0.1, 0, W, 0.2, D, CP.roof.sheet);
  for (const s of [-1, 1]) for (let f = 1; f < n; f++) {
    b.box(M, 0, PL + f * fh + 1.5, s * (D / 2 + 0.04), W - 1.2, 1.25, 0.05, CP.glass, 'glass');   // fönsterband
    for (let x = -W / 2 + 1.5; x < W / 2 - 1; x += 1.8) b.box(M, x, PL + f * fh + 1.5, s * (D / 2 + 0.07), 0.12, 1.3, 0.05, '#ded8c8');
  }
  for (const s of [-1, 1]) for (let f = 1; f < n; f++) { b.box(M, s * (W / 2 + 0.04), PL + f * fh + 1.5, 0, 0.05, 1.25, D - 1.2, CP.glass, 'glass'); }
  // bottenvåningen: glas runt om, gröna markiser på framsidan, plåtlådor på taket
  for (const s of [-1, 1]) b.box(M, 0, PL + 1.5, s * (D / 2 + 0.04), W - 1.5, 2.4, 0.05, CP.glass, 'glass');
  for (let x = -W / 2 + 2; x < W / 2 - 1; x += 5) b.box(M, x + 1.8, PL + 2.9, D / 2 + 0.8, 4.2, 0.08, 1.5, '#2f5a3c', 'matte', 0, 0.3);
  for (let i = 0; i < 3; i++) b.box(M, -W * 0.3 + i * W * 0.3, top + 0.7, 0, 1.8, 1.0, 1.4, BP.sheet, 'metal');
  return o.shop || r() < 0.5 ? shopSign(M, W, D, PL + 0.3, r) : [];
}

// ---------- livsmedelsbutiken (stor låg låda) ----------
export function supermarket(b, M, o) {
  const W = o.w, D = o.d, H = 5.0, PL = 0.2;
  walls(b, M, W, D, H, '#bdb7aa', { plinth: PL, corner: null, plinthC: CP.plinth });
  flatRoof(b, M, W, D, PL + H, CP.roof.sheet, '#8a857a');
  b.box(M, 0, PL + H - 0.6, D / 2 + 0.06, W, 0.8, 0.06, '#3f6a4a');
  const gw = Math.min(W * 0.5, 18);
  b.box(M, -W * 0.15, PL + 1.5, D / 2 + 0.05, gw, 2.7, 0.06, CP.glass, 'glass');
  for (let x = -W * 0.15 - gw / 2; x <= -W * 0.15 + gw / 2 + 0.01; x += gw / 8) b.box(M, x, PL + 1.5, D / 2 + 0.08, 0.1, 2.8, 0.08, '#6c6a64', 'metal');
  b.box(M, -W * 0.15, PL + 3.1, D / 2 + 1.4, gw + 1, 0.18, 2.8, '#6c6a64', 'metal');
  // kundvagnskur och lastkaj
  b.box(M, W / 2 - 3, 2.2, D / 2 + 3.4, 3.8, 0.1, 2.2, '#3f6a4a');
  for (let i = 0; i < 6; i++) b.box(M, W / 2 - 4.2 + i * 0.45, 0.55, D / 2 + 3.4, 0.4, 0.8, 1.6, '#9da3a5', 'metal');
  b.box(M, W * 0.25, 0.6, -D / 2 - 1.6, 7, 1.2, 3.2, MP.concrete);
  b.box(M, W * 0.25, PL + 1.9, -D / 2 - 0.04, 3.4, 3.2, 0.06, BP.sheetDark, 'metal');
  for (let i = 0; i < 3; i++) b.box(M, -W * 0.3 + i * W * 0.3, PL + H + 0.6, -D * 0.15, 1.6, 1.0, 1.2, BP.sheet, 'metal');
  const s = signMesh('LIVS', 3.6, 1.1, { bg: '#3f6a4a', fg: '#f1ede2', font: 'Arial, sans-serif', weight: 800 });
  return [placeIn(s, M, -W * 0.15, PL + H + 0.75, D / 2 + 0.12)];
}

// ---------- brandstationen ----------
// Vagnhallen mot gatan (+z): ljus putsad bottenvåning med fem röda vikportar, ovanvåning med mörkt inramade
// fönsterband, rött tegel i gavlarna, platt tak, slangtorn i tegel på ena gaveln, uppställningsplatta i betong.
// Generisk: skylten säger BRANDSTATION, inga namn eller emblem.
export function fireStation(b, M, o) {
  const W = o.w, D = o.d, PL = 0.25, g = 4.6, up = 3.2, top = PL + g + up;
  b.box(M, 0, PL / 2, 0, W + 0.2, PL, D + 0.2, CP.plinth);
  b.box(M, 0, PL + g / 2, 0, W, g, D, CP.plasterLight);
  b.box(M, 0, PL + g + up / 2, 0, W, up, D, '#d4d0c4');
  b.box(M, 0, PL + g + 0.08, 0, W + 0.1, 0.16, D + 0.1, '#b8b2a4');
  for (const s of [-1, 1]) b.box(M, s * (W / 2 - 2.2), PL + (g + up) / 2, 0, 4.4, g + up + 0.02, D + 0.04, BP.brick);   // tegelgavlar
  flatRoof(b, M, W, D, top, CP.roof.sheet, '#7a776f', 0.4);
  // portarna
  const nb = Math.max(3, Math.min(5, Math.round((W - 9) / 4.6))), bw = (W - 9) / nb;
  for (let i = 0; i < nb; i++) {
    const u = -W / 2 + 4.5 + (i + 0.5) * bw;
    b.box(M, u, PL + 1.95, D / 2 + 0.04, bw - 0.9, 3.9, 0.06, '#f0ece2');
    b.box(M, u, PL + 1.9, D / 2 + 0.08, bw - 1.3, 3.75, 0.05, CP.fireDoor, 'paint');
    for (let k = 0; k < 6; k++) b.box(M, u, PL + 0.45 + k * 0.62, D / 2 + 0.11, bw - 1.3, 0.04, 0.03, '#8a2a22', 'paint');
    b.box(M, u, PL + 2.9, D / 2 + 0.12, bw - 1.6, 0.6, 0.03, CP.glass, 'glass');
  }
  // fönsterband på ovanvåningen i mörka ramar
  b.box(M, 0, PL + g + 1.6, D / 2 + 0.04, W - 9.6, 1.5, 0.05, CP.glass, 'glass');
  for (let x = -W / 2 + 4.8; x < W / 2 - 4.6; x += 1.6) b.box(M, x, PL + g + 1.6, D / 2 + 0.07, 0.12, 1.6, 0.06, CP.frameDark, 'metal');
  windowRow(b, M, W, D, '-z', PL + g + 1.6, Math.round(W / 2.4), { frame: CP.frameDark });
  windowRow(b, M, W, D, '-z', PL + 1.6, Math.round(W / 4), { frame: CP.frameDark });
  // sirener och lampor vid portarna
  for (const x of [-W / 2 + 3.4, W / 2 - 3.4]) { b.box(M, x, PL + 3.4, D / 2 + 0.25, 0.5, 0.35, 0.4, '#3a3a36', 'metal'); b.box(M, x, PL + 3.2, D / 2 + 0.47, 0.35, 0.1, 0.05, GP.lampGlow, 'glow'); }
  // slangtornet
  const tx = -W / 2 + 1.8, tz = -D / 2 + 1.8, th = top + 6.5;
  b.box(M, tx, th / 2, tz, 3.4, th, 3.4, BP.brick);
  for (const s of [-1, 1]) { b.box(M, tx, th - 1.6, tz + s * 1.72, 0.7, 1.6, 0.05, CP.glass, 'glass'); b.box(M, tx + s * 1.72, th - 1.6, tz, 0.05, 1.6, 0.7, CP.glass, 'glass'); }
  flatRoof(b, M, 3.4, 3.4, th, CP.roof.sheet, '#6e4536', 0.3);
  b.box(M, tx, th + 1.6, tz, 0.08, 3.0, 0.08, '#6f716e', 'metal');
  // uppställningsplattan och en övningsdocka av pallar
  b.box(M, 0, 0.03, D / 2 + 6, W, 0.06, 12, '#8e8a80', 'matte', 0, 0, 0, { noShadow: true });
  for (let i = 0; i < nb; i++) b.box(M, -W / 2 + 4.5 + (i + 0.5) * bw, 0.065, D / 2 + 6, 0.12, 0.01, 11, '#d8d3c6', 'matte', 0, 0, 0, { noShadow: true });
  flagpole(b, frame(M, W / 2 - 1, 0, D / 2 + 11), 9, [BP.flagBlue, BP.flagYellow]);
  // släckbilen utdragen på plattan framför första porten, ledningsbilen vid den sista
  fireTruck(b, frame(M, -W / 2 + 4.5 + bw / 2, 0, D / 2 + 4.6, -Math.PI / 2));
  fireTruck(b, frame(M, -W / 2 + 4.5 + (nb - 0.5) * bw, 0, D / 2 + 3.2, -Math.PI / 2 + 0.15), true);
  const s = signMesh('BRANDSTATION', 6.4, 0.7, { bg: '#f0ece2', fg: '#8a2a22', font: 'Arial, sans-serif', weight: 800 });
  return [placeIn(s, M, 0, PL + g + up - 0.5, D / 2 + 0.1)];
}
// Brandbilen (släckbil): röd hytt och skåp, gult rutmönster längs sidan, blåljusramp. Längd längs x.
export function fireTruck(b, M, small = false) {
  if (small) {
    // ledningsbil: pickup med kåpa
    b.box(M, 0, 0.75, 0, 5.2, 0.8, 1.9, CP.fireRed, 'paint');
    b.box(M, 0.7, 1.45, 0, 2.0, 0.7, 1.8, CP.fireRed, 'paint');
    b.box(M, 0.7, 1.45, 0, 1.8, 0.55, 1.84, '#1d1c1a', 'glass');
    b.box(M, -1.4, 1.55, 0, 2.2, 0.9, 1.85, '#d8d3c6', 'paint');
    b.box(M, 0.7, 1.86, 0, 0.3, 0.12, 1.4, '#2f63c8', 'glow');
    for (const s of [-1, 1]) b.box(M, 0, 0.85, s * 0.96, 5.0, 0.22, 0.03, CP.fireYellow, 'paint');
    for (const [wx, wz] of [[-1.6, 0.9], [1.7, 0.9], [-1.6, -0.9], [1.7, -0.9]]) b.put(UNIT.wheel, M, wx, 0.4, wz, 0.8, 0.28, 0.8, GP.tire, 'matte', 0, Math.PI / 2);
    return;
  }
  b.box(M, 2.9, 1.65, 0, 2.2, 2.3, 2.5, CP.fireRed, 'paint');
  b.box(M, 3.6, 2.05, 0, 0.8, 1.0, 2.46, '#1d1c1a', 'glass');
  b.box(M, -1.1, 1.85, 0, 5.8, 2.7, 2.5, CP.fireRed, 'paint');
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) b.box(M, -3.7 + i * 0.75, 1.15, s * 1.26, 0.37, 0.3, 0.03, i % 2 ? CP.fireYellow : CP.fireRed, 'paint');
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.box(M, -3.2 + i * 1.7, 2.1, s * 1.27, 1.5, 1.3, 0.03, '#c9c4b6', 'metal');
  b.box(M, 2.9, 2.95, 0, 0.5, 0.18, 2.0, '#2f63c8', 'glow');
  b.box(M, -1.1, 3.3, 0, 5.2, 0.12, 0.5, '#9a9c98', 'metal');       // stegen
  for (const [wx, wz] of [[2.8, 1.15], [-1.0, 1.15], [-2.6, 1.15], [2.8, -1.15], [-1.0, -1.15], [-2.6, -1.15]]) b.put(UNIT.wheel, M, wx, 0.55, wz, 1.1, 0.4, 1.1, GP.tire, 'matte', 0, Math.PI / 2);
}

// ---------- Elektron (samlingslokalen, 1960) ----------
// Ljus sandstensfasad, mörk patinerad plåtkrön, stort skärmtak över entrén med runda lampor, stort fönster, och
// skulpturen ovanför entrén: en ring med tre färgade kulor (fotot). Ingen namnskylt.
export function elektron(b, M, o) {
  const W = o.w, D = o.d, PL = 0.25, H = 6.4, top = PL + H;
  walls(b, M, W, D, H, '#cdbf9c', { plinth: PL, corner: null, plinthC: CP.plinth });
  for (let y = PL + 1; y < top - 1.4; y += 1.0) for (const s of [-1, 1]) b.box(M, 0, y, s * (D / 2 + 0.02), W, 0.03, 0.03, '#b8aa88');   // stenskift
  b.box(M, 0, top - 0.75, 0, W + 0.3, 1.5, D + 0.3, CP.fascia);                 // plåtkrönet
  for (let x = -W / 2; x < W / 2; x += 1.2) for (const s of [-1, 1]) b.box(M, x, top - 0.75, s * (D / 2 + 0.17), 0.04, 1.5, 0.04, '#55605c', 'metal');
  b.box(M, 0, top + 0.05, 0, W, 0.2, D, CP.roof.sheet);
  // entrén med skärmtaket
  const ex = -W * 0.18;
  b.box(M, ex, PL + 3.6, D / 2 + 2.2, 7.5, 0.5, 4.4, '#2f3433');
  for (const [dx, dz] of [[-2.5, 1.2], [0, 1.6], [2.5, 1.0], [-1.2, 3.0], [1.4, 3.2]]) b.put(UNIT.disc, M, ex + dx, PL + 3.33, D / 2 + dz, 0.6, 0.05, 0.6, GP.lampGlow, 'glow');
  b.box(M, ex, PL + 1.3, D / 2 + 0.05, 3.4, 2.6, 0.06, '#d6d0c0', 'metal');
  b.box(M, ex, PL + 1.25, D / 2 + 0.09, 3.0, 2.3, 0.04, '#4a5054', 'glass');
  b.box(M, W * 0.22, PL + 2.6, D / 2 + 0.05, 6, 2.6, 0.06, CP.glass, 'glass');
  for (const x of [W * 0.22 - 1, W * 0.22 + 1]) b.box(M, x, PL + 2.6, D / 2 + 0.08, 0.1, 2.6, 0.06, '#e6e1d4');
  b.box(M, 0, PL + 0.2, D / 2 + 3.5, 9, 0.4, 3, MP.concreteLight);                 // trappan
  // skulpturen: ring och tre kulor
  const S = frame(M, ex + 1.6, PL + 5.2, D / 2 + 2.2);
  b.put(UNIT.ring, S, 0, 0, 0, 3.2, 3.2, 3.2, '#8a8c88', 'metal', 0, Math.PI / 2);
  for (const [a, col] of [[0.4, '#a8322a'], [2.3, '#3f7a4a'], [4.2, '#c9a33a']]) b.put(UNIT.ball, S, Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0, 0.5, 0.5, 0.5, col, 'paint');
}

// ---------- kommunhuset (1960) ----------
// Lång länga i två våningar av rött tegel, jämn fönsterrytm, platt tak med plåtkrön, entré med skärmtak och två
// flaggstänger på gräsmattan framför.
export function kommunhus(b, M, o) {
  const W = o.w, D = Math.min(o.d, 12), PL = 0.35, fh = 3.1, H = 2 * fh, top = PL + H;
  walls(b, M, W, D, H, '#8a4a38', { plinth: PL, corner: null, plinthC: CP.plinth });
  for (const s of ['+z', '-z']) for (let f = 0; f < 2; f++) windowRow(b, M, W, D, s, PL + f * fh + 1.6, Math.round(W / 2.2), { wh: 1.45, ww: 1.05, frame: '#e4e0d4', skip: u => s === '+z' && f === 0 && Math.abs(u + W * 0.2) < 1.3 });
  for (const s of ['+x', '-x']) windowRow(b, M, W, D, s, PL + fh + 1.6, 3, { frame: '#e4e0d4' });
  flatRoof(b, M, W, D, top, CP.roof.sheet, '#4f4a44', 0.5);
  const ex = -W * 0.2;
  b.box(M, ex, PL + 1.2, D / 2 + 0.05, 1.8, 2.4, 0.06, '#3a3f42', 'glass');
  b.box(M, ex, PL + 2.7, D / 2 + 0.9, 3.0, 0.14, 1.8, '#d6d0c0');
  b.box(M, ex, PL + fh + 1.4, D / 2 + 0.06, 1.4, 0.9, 0.06, '#2f6a5a', 'paint');      // den gröna skylten (utan text)
  for (const k of [0, 1]) flagpole(b, frame(M, W * 0.2 + k * 3, 0, D / 2 + 5), 10, k ? [BP.flagWhite, BP.flagRed] : [BP.flagBlue, BP.flagYellow]);
}

// ---------- stationshuset (1907) ----------
// Rött tegel, mörka skiffertak (valmade), högre mittpaviljong med svängd gavel mot gatan (+z), sköld och en skylt
// GNESTA, tre höga rundbågefönster, lägre flyglar med vita spröjsade fönster, gröna dörrar, skorstenar.
export function gnestaStation(b, M, o) {
  const W = o.w, D = Math.min(o.d, 11), PL = 0.4, H = 4.4, top = PL + H, brick = '#8e4a38', slate = '#4a4f52';
  walls(b, M, W, D, H, brick, { plinth: PL, corner: null, plinthC: '#5e5a52' });
  b.box(M, 0, top - 0.15, 0, W + 0.2, 0.3, D + 0.2, '#6e3a2c');
  hipRoof(b, M, W, D, top, 3.0, slate);
  for (const x of [-W * 0.32, W * 0.34]) b.box(M, x, top + 2.6, 0, 0.7, 1.8, 0.7, '#7a3a2c');
  // flyglarnas fönster och dörrar
  for (const s of [-1, 1]) for (const fx of [0.18, 0.3, 0.42]) {
    const u = s * W * fx;
    win(b, M, W, D, '+z', u, PL + 1.7, 1.4, 1.8, '#ece8dc');
    win(b, M, W, D, '-z', u, PL + 1.7, 1.4, 1.8, '#ece8dc');
  }
  for (const u of [-W * 0.24, W * 0.36]) b.box(M, u, PL + 1.2, D / 2 + 0.05, 1.1, 2.4, 0.06, '#2f5a4a', 'paint');
  // mittpaviljongen
  const PW = Math.min(9, W * 0.32), PD = D + 1.2, PH = 6.6;
  b.box(M, 0, PL + PH / 2, 0.6, PW, PH, PD, brick);
  b.box(M, 0, PL + PH + 1.2, 0.6 + PD / 2 - 0.3, PW * 0.62, 2.4, 0.6, brick);           // svängda gaveln (förenklad)
  for (const s of [-1, 1]) b.box(M, s * PW * 0.36, PL + PH + 0.5, 0.6 + PD / 2 - 0.3, PW * 0.2, 1.0, 0.6, brick, 'matte', 0, 0, s * 0.5);
  b.box(M, 0, PL + PH + 2.45, 0.6 + PD / 2 - 0.3, PW * 0.66, 0.2, 0.7, '#6e3a2c');
  hipRoof(b, M, PW, PD, PL + PH, 3.6, slate);
  b.put(UNIT.disc, M, 0, PL + PH + 1.1, 0.6 + PD / 2 + 0.02, 1.0, 0.06, 1.2, '#b8b2a4', 'matte', 0, Math.PI / 2);   // skölden
  for (const k of [-1, 0, 1]) {
    const u = k * PW * 0.3;
    b.box(M, u, PL + 2.7, 0.6 + PD / 2 + 0.04, 1.9, 3.6, 0.05, '#ece8dc');
    b.box(M, u, PL + 2.7, 0.6 + PD / 2 + 0.07, 1.6, 3.4, 0.04, CP.glass, 'glass');
    b.put(UNIT.disc, M, u, PL + 4.5, 0.6 + PD / 2 + 0.05, 1.9, 0.05, 1.9, '#ece8dc', 'matte', 0, Math.PI / 2);
    b.put(UNIT.disc, M, u, PL + 4.5, 0.6 + PD / 2 + 0.08, 1.6, 0.04, 1.6, CP.glass, 'glass', 0, Math.PI / 2);
  }
  b.box(M, 0, PL + 1.2, 0.6 + PD / 2 + 0.1, 1.5, 2.4, 0.05, '#2f5a4a', 'paint');
  windowRow(b, M, PW, PD, '-z', PL + 2.4, 3, { wh: 2.4, ww: 1.4 });
  const s = signMesh('GNESTA', 3.2, 0.55, { bg: '#f1ede2', fg: '#1d1d1b', font: 'Arial, sans-serif', weight: 700 });
  return [placeIn(s, M, 0, PL + PH - 0.3, 0.6 + PD / 2 + 0.1)];
}

// ---------- Tingshuset ----------
// Gul puts, vita hörnlisener, natursten i sockeln, rundbågade fönster nertill, valmat plåttak i brunt med kupor
// och en mittrisalit med triangulär fronton.
export function tingshus(b, M, o) {
  const W = o.w, D = o.d, PL = 0.7, fh = 3.2, H = 2 * fh, top = PL + H, c = '#d6b878';
  walls(b, M, W, D, H, c, { plinth: PL, corner: CP.trim, plinthC: '#6e6a62' });
  for (const s of ['+z', '-z']) {
    windowRow(b, M, W, D, s, PL + 1.6, Math.round(W / 2.6), { wh: 1.6, frame: '#5a3a2c', skip: u => s === '+z' && Math.abs(u) < 1.2 });
    windowRow(b, M, W, D, s, PL + fh + 1.6, Math.round(W / 2.6), { wh: 1.5, frame: '#5a3a2c' });
  }
  b.box(M, 0, PL + fh + 0.2, 0, W + 0.14, 0.18, D + 0.14, CP.trim);
  hipRoof(b, M, W, D, top, Math.min(W, D) * 0.34, CP.roof.brown);
  for (const x of [-W * 0.28, W * 0.28]) { b.box(M, x, top + 1.2, D / 2 - 0.4, 1.4, 1.3, 1.2, CP.roof.brown); b.box(M, x, top + 1.15, D / 2 + 0.22, 0.8, 0.9, 0.04, CP.glass, 'glass'); }
  // mittrisaliten
  b.box(M, 0, PL + H / 2, D / 2 + 0.3, 4.4, H, 0.6, c);
  for (const s of [-1, 1]) b.box(M, s * 2.2, PL + H / 2, D / 2 + 0.62, 0.35, H, 0.06, CP.trim);
  b.put(UNIT.prism, frame(M, 0, 0, D / 2 + 0.3, Math.PI / 2), 0, top, 0, 0.8, 1.4, 4.8, c);
  b.box(M, 0, PL + 1.2, D / 2 + 0.62, 1.3, 2.4, 0.05, '#5a3a2c');
  for (const x of [-W * 0.3, W * 0.25]) b.box(M, x, top + 2.8, 0, 0.7, 1.6, 0.7, '#6a4a3c');
}

// ---------- vattentornet (1914) ----------
// Putsat runt torn, bredare vattenkista överst med små fönster, mörk plåthuv med lanternin. Synligt från hela stan.
export function waterTower(b, M, o) {
  const R = Math.max(6.5, Math.min(o.w, o.d)), H = 17, PL = 0.8, c = '#d4cbb2';
  b.put(UNIT.cyl, M, 0, PL / 2, 0, R + 1.2, PL, R + 1.2, '#7b766b', 'matte', Math.PI / 8);
  b.put(UNIT.taper, M, 0, PL + H / 2, 0, R, H, R, c, 'matte', Math.PI / 6);
  for (let y = PL + 2.5; y < PL + H - 2; y += 3.2) b.box(M, 0, y, R * 0.42, 0.5, 1.4, 0.06, CP.glass, 'glass');
  b.box(M, 0, PL + 1.2, R * 0.47, 1.3, 2.4, 0.06, '#5a4a3c');
  const top = PL + H;
  b.put(UNIT.cyl, M, 0, top + 0.2, 0, R + 1.4, 0.4, R + 1.4, CP.trim, 'matte', Math.PI / 8);
  b.put(UNIT.cyl, M, 0, top + 2.8, 0, R + 1.0, 5.0, R + 1.0, c, 'matte', Math.PI / 8);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; b.box(M, Math.sin(a) * (R + 1.0) / 2 * 0.98, top + 3.0, Math.cos(a) * (R + 1.0) / 2 * 0.98, 0.7, 1.1, 0.06, CP.glass, 'glass', a); }
  b.put(UNIT.cyl, M, 0, top + 5.4, 0, R + 1.8, 0.3, R + 1.8, CP.trim, 'matte', Math.PI / 8);
  b.put(UNIT.cone, M, 0, top + 7.0, 0, R + 1.9, 3.2, R + 1.9, CP.roof.copper, 'metal', Math.PI / 8);
  b.put(UNIT.cyl, M, 0, top + 9.0, 0, 1.4, 1.4, 1.4, CP.roof.copper, 'metal');
  b.put(UNIT.cone, M, 0, top + 10.2, 0, 1.7, 1.2, 1.7, CP.roof.copper, 'metal');
  b.box(M, 0, top + 11.4, 0, 0.08, 1.4, 0.08, '#3a3a36', 'metal');
}

// ---------- skolan (Frejaskolan) ----------
// Lång 1950-60-talsskola i gult tegel, två våningar, fönsterband i vita ramar, lågt sadeltak, entré med skärmtak.
// Skolgården framför: cykelställ, basketkorg, bänkar.
export function school(b, M, o) {
  const W = o.w, D = Math.min(o.d, 16), PL = 0.4, fh = 3.4, n = o.w * o.d > 600 ? 2 : 2, H = n * fh, top = PL + H, c = '#c2a46a';
  walls(b, M, W, D, H, c, { plinth: PL, corner: null, plinthC: CP.plinth });
  for (const s of [-1, 1]) for (let f = 0; f < n; f++) {
    b.box(M, 0, PL + f * fh + 1.8, s * (D / 2 + 0.04), W - 2, 1.7, 0.05, '#e6e1d4');
    for (let x = -W / 2 + 1.5; x < W / 2 - 1; x += 1.5) b.box(M, x, PL + f * fh + 1.8, s * (D / 2 + 0.07), 1.25, 1.45, 0.04, CP.glass, 'glass');
  }
  roofOf(b, M, W, D, top, 'gable', CP.roof.tile, c);
  const ex = W * 0.15;
  b.box(M, ex, PL + 1.3, D / 2 + 0.1, 3.2, 2.6, 0.08, '#3a4248', 'glass');
  b.box(M, ex, PL + 2.9, D / 2 + 1.6, 6, 0.2, 3.2, CP.roof.sheet);
  for (const x of [ex - 2.8, ex + 2.8]) b.box(M, x, PL + 1.4, D / 2 + 3.0, 0.15, 2.9, 0.15, '#6c6a64', 'metal');
  // skolgården
  for (let i = 0; i < 6; i++) bikeRack(b, frame(M, -W * 0.35 + i * 1.1, 0, D / 2 + 3.5));
  const Y = frame(M, -W * 0.1, 0, D / 2 + 13);
  b.box(Y, 0, 1.6, 0, 0.14, 3.2, 0.14, '#6c6a64', 'metal'); b.box(Y, 0, 3.3, 0.5, 1.2, 0.8, 0.06, '#e6e1d4'); b.put(UNIT.ring, Y, 0, 3.05, 0.95, 0.5, 0.5, 0.5, '#c4502a', 'metal');
  for (const x of [W * 0.3, W * 0.38]) bench(b, frame(M, x, 0, D / 2 + 6, Math.PI));
}
// Idrottshallen (Frejahallen): gnesta-kit sportHall.
export function gymHall(b, M, o) { sportHall(b, M, { len: o.w, wid: o.d, wallH: 8 }); }
export function kindergarten(b, M, o) { return forskola(b, M, { ...o, facade: 'yellow', roofColor: 'tile', seed: o.seed }); }

// ---------- bryggeriet (ca 1903) och banvaktsstugan (1862) ----------
// Rött fasadtegel, vita putsade detaljer och tandsnittsfris, rundbågiga spröjsade fönster, svart plåttak, murad
// skorsten i gult tegel (kulturmiljöanalysen).
export function brewery(b, M, o) {
  const W = o.w, D = o.d, PL = 0.5, fh = 3.3, n = 2, H = n * fh, top = PL + H, c = '#8a4434';
  walls(b, M, W, D, H, c, { plinth: PL, corner: null, plinthC: '#4f4b45' });
  b.box(M, 0, top - 0.3, 0, W + 0.18, 0.35, D + 0.18, CP.trim);              // tandsnittsfrisen
  for (let x = -W / 2; x < W / 2; x += 0.5) for (const s of [-1, 1]) b.box(M, x, top - 0.6, s * (D / 2 + 0.06), 0.25, 0.22, 0.06, CP.trim);
  for (const s of ['+z', '-z']) for (let f = 0; f < n; f++) {
    const k = s === '+z' ? 1 : -1, nw = Math.max(3, Math.round(W / 2.8));
    for (let i = 0; i < nw; i++) {
      const u = -W / 2 + (i + 0.5) * W / nw, y = PL + f * fh + 1.5;
      b.box(M, u, y, k * (D / 2 + 0.04), 1.2, 1.6, 0.05, CP.trim);
      b.box(M, u, y, k * (D / 2 + 0.07), 1.0, 1.45, 0.04, CP.glass, 'glass');
      b.put(UNIT.disc, M, u, y + 0.8, k * (D / 2 + 0.05), 1.2, 0.05, 1.2, CP.trim, 'matte', 0, Math.PI / 2);
      b.put(UNIT.disc, M, u, y + 0.8, k * (D / 2 + 0.08), 1.0, 0.04, 1.0, CP.glass, 'glass', 0, Math.PI / 2);
    }
  }
  gableRoof(b, M, W, D, top, Math.min(W, D) * 0.38, '#2c2d2e', c, W >= D, 0.3);
  b.put(UNIT.taper, M, W * 0.3, top + 4, -D * 0.2, 1.4, 14, 1.4, '#c9a85a', 'matte', Math.PI / 4);
  b.box(M, W * 0.3, top + 11.2, -D * 0.2, 1.1, 0.4, 1.1, '#8a7a4e');
}
export function redCottage(b, M, o) { villa(b, M, { ...o, facade: 'red', roofColor: 'tile', storeys: 1.5, roof: 'gable', chimney: true, veranda: o.w > 9, garage: 0, solar: false }); }

// ---------- Bryggeriholmens flerbostadshus (2000-tal) ----------
// Tre våningar, sadeltak med gaveln mot sjön, stående panel i vitt, rött eller gult, inglasade balkonger.
export function holmenApt(b, M, o) {
  const W = o.w, D = Math.min(o.d, 12), PL = 0.4, fh = 2.9, n = 3, H = n * fh, top = PL + H;
  const c = { white: '#dcd8cc', red: '#8a3a2c', yellow: '#cfb56e' }[o.facade] ?? '#dcd8cc';
  walls(b, M, W, D, H, c, { plinth: PL, corner: '#ece8dc', plinthC: CP.plinth });
  const groove = { white: '#c4c0b4', red: '#6e2c22', yellow: '#b39a58' }[o.facade] ?? '#c4c0b4';
  for (let x = -W / 2 + 0.4; x < W / 2; x += 0.9) for (const s of [-1, 1]) b.box(M, x, PL + H / 2, s * (D / 2 + 0.02), 0.05, H, 0.03, groove);
  for (const s of ['+z', '-z']) for (let f = 0; f < n; f++) windowRow(b, M, W, D, s, PL + f * fh + 1.45, Math.round(W / 2.3), { wh: 1.4, ww: 1.1, frame: '#ece8dc' });
  for (let f = 0; f < n; f++) for (const u of [-W * 0.25, W * 0.25]) {
    b.box(M, u, PL + f * fh + 0.25, -D / 2 - 0.8, 3.2, 0.14, 1.6, MP.concreteLight);
    b.box(M, u, PL + f * fh + 1.3, -D / 2 - 1.58, 3.2, 2.1, 0.05, '#8fa6ad', 'glass');
  }
  gableRoof(b, M, W, D, top, D * 0.4, CP.roof.black, c, true, 0.4);
}

// ---------- hamnen ----------
// Brygga från at till to (ramen: lokal x längs bryggan från 0 till L): trädäck på stolpar, pollare, och båtar som
// ligger förtöjda på båda sidor. Returnerar inget.
export function pier(b, M, L, r, wide = 2.2) {
  b.box(M, L / 2, 0.55, 0, L, 0.18, wide, CP.deck);
  for (let x = 0.6; x < L; x += 0.5) b.box(M, x, 0.65, 0, 0.04, 0.02, wide - 0.1, '#6e5a42', 'matte', 0, 0, 0, { noShadow: true });
  for (let x = 1.2; x < L; x += 3.2) for (const s of [-1, 1]) b.put(UNIT.cyl, M, x, 0.25, s * (wide / 2 - 0.1), 0.24, 1.3, 0.24, CP.post);
  for (let x = 3; x < L - 1; x += 3.4) for (const s of [-1, 1]) {
    if (r() < 0.32) continue;
    const len = r.range(4.2, 6.5), col = r.pick(CP.boat);
    boat(b, frame(M, x, 0, s * (wide / 2 + 1.25 + len * 0.02), s > 0 ? -Math.PI / 2 : Math.PI / 2), len, col, r);
  }
  b.box(M, L - 0.2, 1.2, 0, 0.12, 1.2, 0.12, '#6f716e', 'metal');
  b.box(M, L - 0.2, 1.85, 0, 0.3, 0.2, 0.3, GP.lampHead, 'metal');
}
// Båt: skrov längs x (fören mot +x), vattenlinjen vid y = 0.15; ibland en ruff eller kapell.
export function boat(b, M, len, color, r) {
  const w = len * 0.36;
  b.box(M, -len * 0.08, 0.35, 0, len * 0.84, 0.5, w, color, 'paint');
  b.box(M, len * 0.38, 0.35, 0, len * 0.2, 0.5, w * 0.6, color, 'paint', 0, 0, 0);
  b.box(M, -len * 0.08, 0.62, 0, len * 0.8, 0.06, w - 0.12, '#cfc9b8');
  const k = r();
  if (k < 0.4) b.box(M, len * 0.02, 1.0, 0, len * 0.3, 0.7, w * 0.8, '#e6e3da', 'paint');
  else if (k < 0.7) b.box(M, -len * 0.15, 0.95, 0, len * 0.4, 0.55, w * 0.9, r.pick(['#2f4a6a', '#3e4a3c', '#7a6a4a']), 'matte');
  b.box(M, -len * 0.48, 0.55, 0, 0.3, 0.5, 0.4, '#2a2b2c', 'metal');
}

// ---------- gatulivet ----------
// Volvokombi (240/740-stil): lång låda, nästan rakt bakparti, platt huv. Längd längs x.
export function volvo(b, M, color) {
  b.box(M, 0, 0.62, 0, 4.8, 0.7, 1.74, color, 'paint');
  b.box(M, -0.5, 1.26, 0, 3.2, 0.6, 1.62, color, 'paint');
  b.box(M, -0.5, 1.26, 0, 3.0, 0.48, 1.66, GP.carGlass, 'glass');
  b.box(M, 1.12, 1.22, 0, 0.18, 0.5, 1.56, GP.carGlass, 'glass', 0, 0, -0.45);
  b.box(M, 2.42, 0.66, 0, 0.06, 0.32, 1.3, '#2a2b2c', 'metal');
  for (const s of [-1, 1]) b.box(M, 0, 0.44, s * 0.88, 4.82, 0.14, 0.03, '#2a2b2c', 'matte');
  b.box(M, -0.5, 1.6, 0, 2.4, 0.06, 1.2, '#2a2b2c', 'metal');
  for (const [wx, wz] of [[-1.45, 0.82], [1.45, 0.82], [-1.45, -0.82], [1.45, -0.82]]) b.put(UNIT.wheel, M, wx, 0.35, wz, 0.7, 0.24, 0.7, GP.tire, 'matte', 0, Math.PI / 2);
}
export function parkedCar(b, M, r) { if (r() < 0.38) volvo(b, M, r.pick(CP.volvo)); else car(b, M, r.pick(GP.car)); }
export function bikeRack(b, M) {
  b.box(M, 0, 0.05, 0, 0.6, 0.1, 1.8, '#6c6a64', 'metal');
  for (const s of [-1, 1]) b.box(M, 0, 0.45, s * 0.6, 0.06, 0.8, 0.06, '#8a8c88', 'metal');
}
export function bike(b, M, color) {
  for (const x of [-0.5, 0.5]) b.put(UNIT.ring, M, x, 0.35, 0, 0.7, 0.7, 0.7, '#2a2b2c', 'metal', 0, 0);
  b.box(M, 0, 0.55, 0, 1.0, 0.06, 0.06, color, 'paint', 0, 0, 0.2);
  b.box(M, 0.4, 0.85, 0, 0.06, 0.5, 0.06, '#2a2b2c', 'metal');
}
export function bench(b, M) {
  b.box(M, 0, 0.45, 0, 1.8, 0.08, 0.5, '#6b5a45');
  b.box(M, 0, 0.8, -0.24, 1.8, 0.45, 0.06, '#6b5a45', 'matte', 0, -0.15);
  for (const s of [-1, 1]) b.box(M, s * 0.75, 0.22, 0, 0.08, 0.44, 0.5, '#2a2b2c', 'metal');
}
export function planter(b, M, r) {
  b.box(M, 0, 0.35, 0, 2.2, 0.7, 1.0, CP.planter, 'metal');
  for (let i = 0; i < 5; i++) b.put(UNIT.blob, M, -0.8 + i * 0.4, 0.8, r.range(-0.2, 0.2), 0.5, 0.35, 0.5, r.pick(['#6a7a45', '#c9a33a', '#6a5a8a', '#e6e1d4', '#56723a']), 'matte', r() * 6);
}
// Gatuträd: rak stam, rundad krona (lind eller lönn).
export function streetTree(b, x, z, r) {
  const M = frame(null, x, 0, z, r() * 6), h = r.range(6.5, 9);
  b.put(UNIT.taper, M, 0, h * 0.25, 0, 0.32, h * 0.5, 0.32, GP.bark);
  b.put(UNIT.blob, M, 0, h * 0.68, 0, h * 0.55, h * 0.6, h * 0.55, r.pick(GP.leaf), 'matte', r() * 6);
  b.put(UNIT.blob, M, h * 0.12, h * 0.8, -h * 0.08, h * 0.38, h * 0.38, h * 0.38, r.pick(GP.leaf), 'matte', r() * 6);
}
// Statyn på Stora torget: röd granitsockel, bronsfigur.
export function statue(b, M) {
  b.box(M, 0, 0.8, 0, 1.2, 1.6, 1.2, CP.granite);
  b.put(UNIT.taper, M, 0, 2.4, 0, 0.45, 1.6, 0.35, CP.bronze, 'metal');
  b.put(UNIT.ball, M, 0, 3.4, 0, 0.32, 0.36, 0.32, CP.bronze, 'metal');
  b.put(UNIT.ball, M, 0.3, 2.9, 0.1, 0.4, 0.4, 0.4, CP.bronze, 'metal');
}
// Perrongerna vid stationen: M på järnvägens mittlinje (lokal x längs spåret). Sidoperronger utanför båda spåren,
// väntkurer, lampor och ortsskyltar; en buss eller två vid busstationen läggs separat.
export function stationPlatforms(b, M, L, tracks = [-2.25, 2.25]) {
  const signs = [];
  for (const s of [-1, 1]) {
    const v0 = s * (Math.abs(tracks[s > 0 ? 1 : 0]) + 1.45), v1 = s * (Math.abs(tracks[s > 0 ? 1 : 0]) + 5.2);
    platform(b, M, { u0: -L / 2, u1: L / 2, v0: Math.min(v0, v1), v1: Math.max(v0, v1), h: 0.75 }, { edge: s > 0 ? -1 : 1 });
    for (const u of [-L * 0.18, L * 0.12]) shelter(b, frame(M, u, 0, (v0 + v1) / 2 + s * 0.4, s > 0 ? 0 : Math.PI), 0.75);
    for (const u of [-L * 0.38, L * 0.38]) {
      const P = frame(M, u, 0, (v0 + v1) / 2 + s * 0.8);
      for (const dx of [-0.9, 0.9]) b.box(P, dx, 1.9, 0, 0.08, 2.4, 0.08, '#2e3133', 'metal');
      const sg = signMesh('Gnesta', 2.0, 0.42, { bg: '#2f5a8a', fg: '#f1ede2', font: 'Arial, sans-serif', weight: 700 });
      signs.push(placeIn(sg, P, 0, 2.9, 0.06 * s, s > 0 ? Math.PI : 0));
    }
  }
  return signs;
}
export { bus };
