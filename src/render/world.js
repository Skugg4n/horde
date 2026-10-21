// Banornas värld och visningssidans mark.
import { rnd, pick, canvasTex, speckle, PALETTE as P } from './kit.js';
import { buildGnesta } from './gnesta-world.js';
import { buildE4 } from './e4-world.js';
// 0.17.0-molnbo
import { buildMolnbo } from './molnbo-world.js';
// 0.23.0 (H545): Björnlunda, kartan ur OSM (src/data/bjornlunda-play.js)
import { buildBjornlunda } from './bjornlunda-world.js';
// 0.24.0 (H552): Laxne, kartan ur OSM (src/data/laxne-play.js)
import { buildLaxne } from './laxne-world.js';

let updateFn = () => {};
export function updateWorld(dt, time) { updateFn(dt, time); }

// Gräsmattan under visningssidan (lookbook.html): samma sommargräs som banorna (0.15.0; förut
// ökendamm). Banorna målar sin egen mark (gnesta-world.js, e4-world.js).
export function grassTexture() {
  return canvasTex(512, (g, s) => {
    g.fillStyle = '#7f8650'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      const x = Math.random() * s, y = Math.random() * s, r = rnd(30, 110);
      g.save(); g.translate(x, y); g.scale(r, r * rnd(0.5, 1));
      grd.addColorStop(0, pick(['rgba(60,70,35,0.2)', 'rgba(140,130,90,0.16)', 'rgba(95,105,62,0.18)']));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore();
    }
    speckle(g, s, 5000, ['#55602f', '#7b8549', '#5d6835', '#868a52', '#4a5429'], 2.2);
  }, 7);
}

export function asphaltTexture() {
  return canvasTex(512, (g, s) => {
    g.fillStyle = P.asphalt; g.fillRect(0, 0, s, s);
    speckle(g, s, 7000, P.asphaltSpeck, 1.6);
    g.strokeStyle = 'rgba(20,18,14,0.6)'; g.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      let x = Math.random() * s, y = Math.random() * s; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += rnd(-30, 30); y += rnd(-10, 10); g.lineTo(x, y); }
      g.stroke();
    }
    // blekt mittlinje
    g.fillStyle = 'rgba(205,170,80,0.55)';
    for (let x = 0; x < s; x += 128) g.fillRect(x + 10, s / 2 - 5, 70, 10);
    speckle(g, s, 600, [P.asphalt], 3);
  });
}

// Banornas värld: Gnesta och Gnesta Norr (tomter och gator) och E4 vid Lästringe (0.15.0).
export function buildWorld(scene, map) {
  const w = map.world === 'molnbo' ? buildMolnbo(scene, map) : map.world === 'osm' ? (map.id === 'laxne' ? buildLaxne(scene, map) : buildBjornlunda(scene, map)) : map.lots ? buildGnesta(scene, map) : buildE4(scene, map);
  updateFn = w.update;
  return w;
}
