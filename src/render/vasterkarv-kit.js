// Byggsats för Västerkärv (förhandsvisning): gårdens byggnader (tvåvånings boningshus med altan, lång lada med solceller,
// uthus), grannens ladugård och maskinhall, och sakerna på gården och åkrarna (stengärdsgård, traktor, dieseltank,
// halmbalar, upplag, grind, stenrös). Husen, vägarna, åkrarna och marken ritas av osm-world.js; de vanliga lantbruks-
// husen (barn, farm) kommer från e4-kit.js. Samma stil och batch som Björnlunda (gnesta-kit.js createBatch).
// Lokal ram: framsidan mot +z, w längs x, d längs z. Fria saker (props med free eller to): +x längs sakens riktning.
// Gården är anonym: inga skyltar, inga namn.
import { UNIT, frame } from './gnesta-kit.js';
import { walls, gableRoof, windowRow } from './bjornlunda-kit.js';
import { barn, boulder, EP } from './e4-kit.js';
import { distPolyline } from '../data/osm-map.js';

export const VK = {
  falu: '#7a2e22', faluDark: '#5a231a', white: '#e4dfd2', trim: '#d8d2c2', plinth: '#6a665e',
  roofDark: '#3b3d40', roofRusty: '#5b3a2c', solar: '#1f2a3a', solarFrame: '#9aa0a6',
  board: '#6f3a2c', door: '#3b3027', glass: '#22272a', deck: '#a9967a',
  steel: '#7d8a90', steelDark: '#5a666c', hall: '#8d9496',
  tractor: '#4f6b3a', tractorDark: '#2c3b22', tyre: '#242525', rust: '#8a4a2a',
  tank: '#a8322a', tankStripe: '#e4dfd2', stone: ['#8c8a82', '#7a7972', '#9a978d', '#6e6d67', '#857f73'],
  straw: '#c9b87a', gate: '#6c7173', cont: ['#2f5d8a', '#a8402f', '#6a6f5a'], pallet: '#a08560',
};

// Boningshuset: tvåvånings trähus i faluröd panel med vita knutar och fönsterfoder, svart plåttak, skorsten, vindsfönster
// i gaveln och en ljus tillbyggnad med altan mot sydväst (lokal -x, bak). Färgen är en gissning (öppen fråga).
export function gard(b, M, o) {
  const W = Math.max(o.w, 9), D = Math.min(o.d, 9), PL = 0.5, fh = 2.7, H = 2 * fh, top = PL + H;
  walls(b, M, W, D, H, VK.falu, { plinth: PL, corner: VK.white, plinthC: VK.plinth });
  for (const s of ['+z', '-z']) for (let f = 0; f < 2; f++) windowRow(b, M, W, D, s, PL + f * fh + 1.5, Math.max(3, Math.round(W / 2.6)), { ww: 1.0, wh: 1.4, frame: VK.white, skip: u => s === '+z' && f === 0 && Math.abs(u) < 0.9 });
  const rh = D * 0.42;
  gableRoof(b, M, W, D, top, rh, VK.roofDark, VK.falu, W >= D, 0.45);
  b.box(M, 0, PL + 1.1, D / 2 + 0.06, 1.2, 2.2, 0.06, VK.door);                 // ytterdörren
  b.box(M, 0, PL + 0.14, D / 2 + 0.8, 2.2, 0.28, 1.4, '#8a8478');               // trappan
  b.box(M, W * 0.28, top + rh - 0.3, 0, 0.7, 1.7, 0.7, '#5a4a40');              // skorstenen
  // vindsfönster i gavlarna
  for (const s of [-1, 1]) { b.box(M, s * (W / 2 + 0.05), top + 0.9, 0, 0.06, 0.9, 0.7, VK.white); b.box(M, s * (W / 2 + 0.08), top + 0.9, 0, 0.04, 0.7, 0.5, VK.glass, 'glass'); }
  // tillbyggnaden: ljus låg länga bakom huset på västra gaveln med glasad altan och trädäck
  const ex = -W / 2 - 1.6;
  b.box(M, ex, PL + 1.3, -D * 0.12, 3.2, 2.6, D * 0.64, VK.white);
  b.box(M, ex, PL + 2.7, -D * 0.12, 3.5, 0.16, D * 0.64 + 0.3, VK.roofDark);
  b.box(M, ex, 0.2, D * 0.42, 4.6, 0.2, 3.2, VK.deck);
  for (const dz of [0.1, 1.5]) b.box(M, ex - 1.9, 1.0, D * 0.42 + dz, 0.07, 1.4, 0.07, VK.white);
  b.box(M, ex - 2.2, 0.9, D * 0.42 + 1.6, 0.05, 0.08, 3.1, VK.white);
  b.box(M, ex, 1.6, -D * 0.12 + D * 0.32 + 0.04, 2.4, 1.3, 0.04, VK.glass, 'glass');
}

// Ladan: lång lada i rödbrun panel med mörkt plåttak, solceller på södra taksidan (mot gårdsplanen) och öppen mot gården:
// bågar med stolpar och mörkt innanför. Ett par portar i gavlarna.
export function ladan(b, M, o) {
  const W = o.w, D = Math.min(o.d, 9), PL = 0.4, H = 3.7, top = PL + H, rh = D * 0.34, ov = 0.5;
  b.box(M, 0, PL / 2, 0, W + 0.2, PL, D + 0.2, VK.plinth);
  b.box(M, 0, PL + H / 2, -D / 2 + 0.1, W, H, 0.2, VK.board);                          // bakre väggen
  for (const s of [-1, 1]) b.box(M, s * (W / 2 - 0.1), PL + H / 2, 0, 0.2, H, D, VK.board);   // gavlarna
  b.box(M, 0, PL + H / 2, 0, W - 0.5, H - 0.2, D - 0.5, '#1c1a18');                      // mörkt innanför
  const bays = Math.max(3, Math.round(W / 4.4));
  for (let i = 0; i <= bays; i++) b.box(M, -W / 2 + 0.2 + i * (W - 0.4) / bays, PL + H / 2, D / 2 - 0.15, 0.3, H, 0.3, VK.board);   // stolparna
  b.box(M, 0, top - 0.25, D / 2 - 0.15, W, 0.5, 0.3, VK.board);                          // bjälken över öppningen
  gableRoof(b, M, W, D, top, rh, VK.roofDark, VK.board, true, ov);
  // solceller: rader på +z-taksidan (samma plan som taket), något ovanför
  const pitch = Math.atan2(rh, D / 2), Ls = (D / 2 + ov) / Math.cos(pitch), zc = (D / 2 + ov) / 2, yc = top + rh - zc * Math.tan(pitch), t = 0.16;
  const cx = 0, cy = yc + Math.cos(pitch) * (t / 2 + 0.1), cz = zc + Math.sin(pitch) * (t / 2 + 0.1);
  const n = Math.max(2, Math.floor((W - 2) / 1.7));
  for (let i = 0; i < n; i++) {
    const x = cx - ((n - 1) * 1.7) / 2 + i * 1.7;
    b.box(M, x, cy, cz - 0.2, 1.6, 0.05, Ls * 0.62, VK.solar, 'glass', 0, pitch);
    b.box(M, x, cy + 0.02, cz - 0.2, 1.66, 0.03, Ls * 0.62 + 0.06, VK.solarFrame, 'metal', 0, pitch);
  }
}

// Uthus: litet rödmålat redskapsskjul eller bod med sadeltak, dörr mot gården.
export function uthus(b, M, o) {
  const W = Math.max(o.w, 3.2), D = Math.max(Math.min(o.d, 7), 3), PL = 0.3, H = 2.7, top = PL + H;
  walls(b, M, W, D, H, o.seed % 2 ? VK.board : VK.faluDark, { plinth: PL, corner: VK.white, plinthC: VK.plinth });
  gableRoof(b, M, W, D, top, D * 0.3, VK.roofRusty, VK.board, W >= D, 0.3);
  b.box(M, 0, PL + 1.0, D / 2 + 0.05, 1.3, 2.0, 0.06, VK.door);
}

// Grannens ladugård: den vanliga lantbruksladan (e4-kit) med en lägre tillbyggnad på baksidan och plåt på tillbyggnaden.
export function ladugard(b, M, o) {
  barn(b, M, { w: o.w, d: o.d });
  b.box(M, 0, 1.6, -o.d / 2 - 1.8, o.w * 0.7, 3.2, 3.6, VK.hall, 'metal');
  b.box(M, 0, 3.35, -o.d / 2 - 1.8, o.w * 0.7 + 0.3, 0.18, 3.9, VK.roofDark);
}

// Grannens maskinhall: plåthall i grått med flackt sadeltak, öppen vägg mot gårdsplanen med stora portar och en traktor
// som skymtar inne i hallen.
export function maskinhall(b, M, o) {
  const W = o.w, D = Math.min(o.d, 13), H = Math.max(4.4, Math.min(6, o.h ?? 5.5)), PL = 0.3, top = PL + H;
  b.box(M, 0, PL / 2, 0, W + 0.2, PL, D + 0.2, VK.plinth);
  b.box(M, 0, PL + H / 2, -D / 2 + 0.05, W, H, 0.1, VK.hall, 'metal');
  for (const s of [-1, 1]) b.box(M, s * (W / 2 - 0.05), PL + H / 2, 0, 0.1, H, D, VK.hall, 'metal');
  for (let x = -W / 2 + 1; x < W / 2; x += 1.3) b.box(M, x, PL + H / 2, -D / 2 - 0.03, 0.1, H, 0.06, VK.steelDark, 'metal');
  b.box(M, 0, PL + H / 2, 0, W - 0.3, H - 0.1, D - 0.3, '#1c1d1e');                      // mörkt innanför
  for (const x of [-W * 0.34, 0, W * 0.34]) b.box(M, x, PL + H / 2, D / 2 - 0.1, 0.3, H, 0.3, VK.steelDark, 'metal');
  b.box(M, 0, top - 0.35, D / 2 - 0.1, W, 0.7, 0.3, VK.steel, 'metal');
  gableRoof(b, M, W, D, top, D * 0.16, VK.roofDark, VK.hall, true, 0.4);
  tractor(b, frame(M, W * 0.12, PL, D * 0.1, -Math.PI / 2));
}

// ---------- fria saker ----------
// Traktor: gammal, grön, +x är framåt. Stora bakhjul, små framhjul, motorhuv, hytt med glas och avgasrör.
export function tractor(b, M) {
  const R = 0.78, r = 0.48;
  b.box(M, 0, 0.9, 0, 3.2, 0.35, 1.1, VK.tractorDark, 'metal');
  b.box(M, 0.75, 1.35, 0, 1.7, 0.85, 0.95, VK.tractor, 'paint');                         // motorhuven
  b.box(M, -0.85, 1.25, 0, 1.05, 0.6, 1.5, VK.tractor, 'paint');                         // bakstycket
  b.box(M, -0.9, 2.35, 0, 1.2, 1.5, 1.3, VK.glass, 'glass');                              // hytten
  b.box(M, -0.9, 3.15, 0, 1.4, 0.12, 1.5, VK.tractor, 'paint');
  for (const z of [-1, 1]) {
    b.put(UNIT.wheel, M, -0.95, R, z * 0.98, R * 2, 0.55, R * 2, VK.tyre, 'matte', 0, 0, Math.PI / 2);
    b.put(UNIT.wheel, M, -0.95, R, z * 0.98 + z * 0.3, R * 1.1, 0.05, R * 1.1, VK.rust, 'metal', 0, 0, Math.PI / 2);
    b.put(UNIT.wheel, M, 1.25, r, z * 0.8, r * 2, 0.3, r * 2, VK.tyre, 'matte', 0, 0, Math.PI / 2);
  }
  b.put(UNIT.cyl, M, 1.6, 1.95, 0.25, 0.1, 1.1, 0.1, VK.steelDark, 'metal');           // avgasröret
}

// Stengärdsgård: rad av grova stenar, två skift, med små glapp. p.at till p.to.
export function stoneWall(b, M, p, { r, map }) {
  const L = Math.hypot(p.to[0] - p.at[0], p.to[1] - p.at[1]), ux = (p.to[0] - p.at[0]) / L, uz = (p.to[1] - p.at[1]) / L;
  // luckor där en väg eller ett spår går igenom
  const gap = x => map.roads.some(rd => distPolyline(p.at[0] + ux * x, p.at[1] + uz * x, rd.pts) < rd.width / 2 + 1.2);
  for (let x = 0.4; x < L; x += r.range(0.7, 1.15)) {
    if (gap(x)) continue;
    const h = r.range(0.45, 0.8), w = r.range(0.7, 1.2), d = r.range(0.5, 0.8);
    b.box(M, x, h / 2, r.range(-0.08, 0.08), w, h, d, r.pick(VK.stone), 'matte', r.range(-0.25, 0.25), r.range(-0.06, 0.06), r.range(-0.06, 0.06));
    if (r() < 0.55) b.box(M, x + r.range(-0.2, 0.2), h + 0.14, r.range(-0.06, 0.06), w * 0.7, 0.3, d * 0.8, r.pick(VK.stone), 'matte', r.range(-0.4, 0.4));
  }
}

// Dieseltank: liggande röd tank på stålfötter, vit rand, pump och slang.
export function dieselTank(b, M) {
  b.put(UNIT.cyl, M, 0, 1.35, 0, 1.3, 3.2, 1.3, VK.tank, 'metal', 0, 0, Math.PI / 2);
  b.put(UNIT.cyl, M, 0, 1.35, 0, 1.34, 0.4, 1.34, VK.tankStripe, 'metal', 0, 0, Math.PI / 2);
  for (const x of [-1.1, 1.1]) b.box(M, x, 0.4, 0, 0.18, 0.8, 1.1, VK.steelDark, 'metal');
  b.box(M, 1.9, 0.8, 0.5, 0.5, 1.2, 0.4, VK.steel, 'metal');
  b.box(M, 0, 0.1, 0, 3.6, 0.2, 1.8, '#85817a');
}

// Halmbalar: rundbalar i en hög (trerad, tvåraders, enkel), p.n antal. Vit plast och gul halm blandat.
export function balePile(b, M, p, { r }) {
  const n = p.n ?? 6;
  let placed = 0;
  for (let row = 0; row < 3 && placed < n; row++) {
    const cnt = 3 - row;
    for (let i = 0; i < cnt && placed < n; i++) {
      const x = (i - (cnt - 1) / 2) * 1.35, y = 0.62 + row * 1.05;
      b.put(UNIT.cyl, M, x + r.range(-0.05, 0.05), y, row * 0.15, 1.3, 1.2, 1.3, r() < 0.7 ? EP.bale : VK.straw, 'matte', 0, 0, Math.PI / 2);
      placed++;
    }
  }
  for (let i = 0; placed < n; i++, placed++) b.put(UNIT.cyl, M, -3 - i * 1.4, 0.62, r.range(-0.2, 0.3), 1.3, 1.2, 1.3, r() < 0.7 ? EP.bale : VK.straw, 'matte', 0, 0, Math.PI / 2);
}

// Grannens upplag: två containrar, pallar och ett par däck på grusplanen.
export function machine(b, M, p, { r }) {
  b.box(M, 0, 1.3, 0, 6, 2.6, 2.4, VK.cont[0], 'metal');
  b.box(M, 0.4, 1.3, 2.9, 6, 2.6, 2.4, VK.cont[1], 'metal');
  b.box(M, 0.4, 3.9, 1.4, 6, 2.6, 2.4, VK.cont[2], 'metal');
  for (let i = 0; i < 4; i++) b.box(M, -5 - (i % 2) * 0.1, 0.1 + i * 0.16, -1, 1.2, 0.14, 1.0, VK.pallet);
  for (let i = 0; i < 3; i++) b.put(UNIT.wheel, M, -4 + i * 1.0, 0.45, 3.8, 0.9, 0.35, 0.9, VK.tyre, 'matte', 0, 0, Math.PI / 2);
}

// Grind: två stolpar och en halvt öppen stålgrind (+x längs grinden).
export function fieldGate(b, M) {
  for (const x of [-1.6, 1.6]) b.box(M, x, 0.8, 0, 0.18, 1.6, 0.18, '#5a4632');
  b.box(M, 0.2, 1.3, 0.8, 2.9, 0.07, 0.07, VK.gate, 'metal', 0.7);
  b.box(M, 0.2, 0.7, 0.8, 2.9, 0.07, 0.07, VK.gate, 'metal', 0.7);
  b.box(M, -1.3, 1.0, 0.45, 0.07, 1.0, 0.07, VK.gate, 'metal');
}

// Stenröse på åkern: tre fyra stora stenar och mossa (e4-kit boulder).
export function cairn(b, M, p, { r }) {
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.3; boulder(b, p.at[0] + Math.cos(a) * 1.8, p.at[1] + Math.sin(a) * 1.8, r.range(1.0, 1.7), r); }
}
