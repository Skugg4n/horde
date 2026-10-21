// Byggsats för Gnesta västra rondell (förhandsvisning): gräsön i rondellen (kantsten, tre träd, vägvisare),
// busshållplatsen Vackerby och tornkranen på byggarbetsplatsen vid Granbackavägen. Husen, vägarna och marken
// ritas av osm-world.js. Samma stil och batch som Björnlunda (gnesta-kit.js createBatch). Funktionerna med
// textskyltar returnerar dem.
import { UNIT } from './gnesta-kit.js';
import { MP, signMesh, placeIn } from './molnbo-kit.js';

export const VR = {
  island: '#85915a', curb: '#a8a49a', post: '#6f716e', signBlue: '#2f5d8a', crane: '#d9a73a', craneDark: '#8a6a22',
  container: '#2f5d8a', container2: '#a8402f', fence: '#b8b4a8', gravel: '#9b9588',
};

// Gräsön: skiva med kantsten runt, tre ungträd och en vägvisare. p.r är ögats radie i spelmeter.
export function rondellIsland(b, M, p, { r }) {
  const R = p.r ?? 4.2;
  b.put(UNIT.disc, M, 0, 0.09, 0, R * 2, 0.18, R * 2, VR.island);
  b.put(UNIT.ring, M, 0, 0.12, 0, R * 2, 0.5, R * 2, VR.curb, 'matte', 0, Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.4, x = Math.cos(a) * R * 0.45, z = Math.sin(a) * R * 0.45, h = r.range(3.6, 5);
    b.put(UNIT.cyl, M, x, h * 0.2, z, 0.2, h * 0.4, 0.2, '#5a4632');
    b.put(UNIT.blob, M, x, h * 0.62, z, 2.4, h * 0.7, 2.4, r.pick(['#4c6835', '#5b7a3f', '#52703a']));
  }
  // vägvisare (blå skylt) i öns östra kant, vänd mot västerut där horden kommer
  b.put(UNIT.cyl, M, R * 0.7, 1.2, 0, 0.08, 2.4, 0.08, VR.post, 'metal');
  b.box(M, R * 0.7, 2.3, 0, 0.06, 0.7, 1.4, VR.signBlue, 'metal');
}

// Vackerby: glasat väntskjul på Västra Storgatan med skylt.
export function vackerby(b, M) {
  const W = 3.4, D = 1.4, H = 2.3;
  b.box(M, 0, H + 0.08, 0, W + 0.3, 0.16, D + 0.3, MP.shelterRoof);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(M, dx * W / 2, H / 2, dz * D / 2, 0.08, H, 0.08, MP.shelterFrame, 'metal');
  b.box(M, 0, H / 2 + 0.1, -D / 2, W, H - 0.2, 0.04, MP.glass, 'glass');
  b.box(M, 0, 0.45, -D / 2 + 0.3, W - 0.4, 0.08, 0.45, MP.bench);
  b.box(M, W / 2 + 1.2, 1.4, D / 2, 0.08, 2.8, 0.08, VR.post, 'metal');
  const s = signMesh('Vackerby', 0.9, 0.9, { bg: VR.signBlue, fg: '#f4f0e4', font: 'Arial, sans-serif', weight: 700, sub: 'buss' });
  return [placeIn(s, M, W / 2 + 1.2, 2.6, D / 2 + 0.06)];
}

// Byggarbetsplatsen: tornkran (mast, motvikt, bom), två bodar och ett grusat område med bygghägn.
export function crane(b, M, p, { r }) {
  const H = 17;
  b.box(M, 0, 0.2, 0, 7, 0.4, 7, VR.gravel);
  b.box(M, 0, H / 2, 0, 0.9, H, 0.9, VR.crane, 'metal');
  for (let y = 1; y < H; y += 1.4) b.box(M, 0, y, 0, 1.0, 0.08, 1.0, VR.craneDark, 'metal');
  b.box(M, 0, H + 0.6, 0, 1.3, 1.2, 1.3, '#3a3b3c', 'metal');                   // förarhytten
  b.box(M, 7, H + 1.0, 0, 17, 0.35, 0.5, VR.crane, 'metal');                    // bommen
  b.box(M, -3.2, H + 0.9, 0, 3.4, 0.35, 0.5, VR.crane, 'metal');                // motviktsarmen
  b.box(M, -4.4, H + 0.2, 0, 1.4, 1.2, 1.2, '#7d776b');                         // motvikten
  b.put(UNIT.cyl, M, 11, H - 3, 0, 0.03, 4, 0.03, '#3a3b3c', 'metal');          // lyftlinan
  b.box(M, 11, H - 5.1, 0, 0.5, 0.4, 0.5, '#3a3b3c', 'metal');
  b.box(M, 6, 1.3, 5.5, 6, 2.6, 2.4, VR.container, 'metal');
  b.box(M, 6, 1.3, 8.2, 6, 2.6, 2.4, VR.container2, 'metal');
  for (let x = -4; x <= 12; x += 2) b.box(M, x, 1.0, -4.5, 0.06, 2.0, 0.06, VR.fence, 'metal');
  b.box(M, 4, 1.8, -4.5, 17, 0.05, 0.04, VR.fence, 'metal');
  b.box(M, 4, 0.9, -4.5, 17, 0.05, 0.04, VR.fence, 'metal');
}
