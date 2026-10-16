// Värnet anpassar sig efter miljön (0.12.0, H098). Rent och deterministiskt: samma ruta, sikt och
// vikter ger samma värn. Återanvänder Hemvärnets syn på skydd (squad.js): husknut och vägg, bil,
// tegelmur, häck och staket.
//
//   face    pjäsen och säckringen vänds mot hordens väg: viktad riktning till de gångbara rutor
//           pjäsen ser (hordens väg väger dubbelt, hordeWeight), annars västerut som förut (Math.PI)
//   cover   vad som står i de åtta grannrutorna (DIRS8, öst först och sedan medurs i bilden: +z är
//           söderut): 'house', 'brick', 'car', 'hedge' eller null. Säckarna läggs bara där det saknas.
//   nestle  pjäsen trycker sig mot det starkaste skyddet framför eller vid sidan (meter, x och z)
//   kneel   skyddet står framför pjäsen (skytten tar betäckning bakom det)
import { KIND } from './placement.js';

export const DIRS8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const RANK = { house: 4, brick: 3, car: 2, hedge: 1 };
export const NESTLE = 0.45;

export function coverAt(p, key, di, dj) {
  const i = (key % p.w) + di, j = Math.floor(key / p.w) + dj;
  if (i < 0 || j < 0 || i >= p.w || j >= p.h) return null;
  const k = j * p.w + i;
  if (p.kind[k] === KIND.house) return 'house';
  if (p.brick?.[k]) return 'brick';
  if (p.kind[k] === KIND.thing) return 'car';
  if (p.hedge?.[k]) return 'hedge';
  return null;
}
// Sektorns index (0..7) för en riktning (radianer, atan2(dz, dx)).
export const sectorOf = a => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
const diff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function emplacement(p, key, sightKeys = [], weight = null) {
  const c = p.center(key);
  let fx = 0, fz = 0;
  for (const k of sightKeys) {
    const q = p.center(k), wt = weight ? weight[k] : 1;
    fx += (q.x - c.x) * wt; fz += (q.z - c.z) * wt;
  }
  const face = Math.hypot(fx, fz) > 1e-9 ? Math.atan2(fz, fx) : Math.PI;
  const cover = DIRS8.map(([di, dj]) => coverAt(p, key, di, dj));
  let best = -1, bestRank = 0;
  cover.forEach((cv, s) => {
    if (!cv || diff(s * Math.PI / 4, face) > Math.PI / 2 + 1e-9) return;
    const r = RANK[cv] * 10 - diff(s * Math.PI / 4, face);
    if (r > bestRank) { bestRank = r; best = s; }
  });
  const nestle = best < 0 ? [0, 0] : [Math.cos(best * Math.PI / 4) * NESTLE, Math.sin(best * Math.PI / 4) * NESTLE];
  const kneel = cover.some((cv, s) => cv && diff(s * Math.PI / 4, face) <= Math.PI / 4 + 1e-9);
  return { face, cover, nestle, kneel };
}
