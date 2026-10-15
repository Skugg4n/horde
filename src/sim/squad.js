// Hemvärnet: en grupp soldater som själva väljer skydd runt en markering (0.9.0). Rent och
// deterministiskt: bara siffror, ingen DOM, ingen three.js.
//
// Spelaren släpper en markering (en ring på ungefär 8 m) på öppen mark. Gruppen väljer sina
// rutor inom ringen, en i taget (girigt), efter poäng:
//   skydd    rutans skydd (COVER): husknut, bil, vägg, sandsäckar, häck eller staket, dike.
//   sikt     hur mycket av gatan rutan ser inom geväret räckvidd, där hordens väg väger dubbelt.
//            Skalas mot den bästa kandidaten (0 till SIGHT_W), så att skyddet avgör mellan två
//            rutor som båda ser gatan.
//   utsatt   rutan ligger intill gatan (zombierna når dit): ett avdrag.
//   avstånd  ett litet avdrag per meter från markeringen.
//   samma    ett litet avdrag per soldat som redan valt samma sorts skydd (de sprider sig över
//            olika skydd när det finns: en vid husknuten, en vid bilen, en i diket).
// Minst SPACING meter mellan soldaterna (de klumpar inte ihop sig), och minst GUN_GAP meter
// till andra pjäser. Lika poäng: lägst rutnyckel. Taken används inte: där ligger Psg 90, och en
// grupp på ett sadeltak skulle se fel ut (mitt beslut).
//
// Ställningen följer skyddet: bakom en husknut, vägg eller bil sitter han på huk och lutar sig
// ut; i ett dike eller på öppen gräsmatta ligger han; bakom häck, staket eller säckar står han på
// knä. Varje soldat har sin egen sikt (placement.js) och väljer mål själv med samma regel som
// pjäserna (den zombie som kommit längst).
//
// Ingen flytt under dagen (mitt beslut): en soldats ruta kan inte bli upptagen (barrikader läggs
// bara på gatan, och en pjäs får inte stå närmare än GUN_GAP en soldat), och en soldat som springer
// när zombierna redan slår honom skulle se fel ut och göra skyddsvalet mindre värt. Han stannar och
// slåss; stupade ersätts från panelen. Gruppen väljer om när den köps eller uppgraderas.
import { KIND, sightFrom } from './placement.js';
import { WEAPONS } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';

export const SQUAD = {
  radius: 8,          // markeringens radie i meter
  spacing: 3,         // minst så många meter mellan två soldater
  gunGap: 3,          // minst så många meter från en soldat till en pjäs (sandsäckarna)
  size: [4, 5, 5],    // soldater per nivå (nivå 2 ger en femte)
  hp: [30, 40, 50],   // liv per soldat och nivå
  runSpeed: 5,        // m/s när de springer ut från markeringen
  runMin: 0.8, runMax: 2,   // sekunder: springet tar så lång tid (syns i bild, sim väntar ut det)
  reinforce: 60,      // pris per stupad soldat som ersätts mitt i dagen
};
export const SIGHT_W = 10;       // siktens högsta poäng
export const EXPOSED = 3;        // avdrag för en ruta intill gatan
export const DIST_W = 0.25;      // avdrag per meter från markeringen
export const SAME_COVER = 1.5;   // avdrag per soldat som redan valt samma sorts skydd

// Skyddstyper: poäng och ställning. car = bil, vrak, tunna, träd (allt lågt som står i vägen).
export const COVER = {
  corner: { score: 10, stance: 'crouch', name: 'house corner' },
  car: { score: 8, stance: 'crouch', name: 'car or tree' },
  wall: { score: 7, stance: 'crouch', name: 'wall' },
  sandbag: { score: 7, stance: 'kneel', name: 'sandbags' },
  ditch: { score: 7, stance: 'prone', name: 'ditch' },
  hedge: { score: 6, stance: 'kneel', name: 'hedge' },
  open: { score: 0, stance: 'prone', name: 'open grass' },
};

export const isSquad = type => !!WEAPONS[type]?.squad;
export const squadSize = level => SQUAD.size[Math.min(level, SQUAD.size.length) - 1];
export const soldierHp = level => SQUAD.hp[Math.min(level, SQUAD.hp.length) - 1];
export const runTime = d => Math.min(SQUAD.runMax, Math.max(SQUAD.runMin, d / SQUAD.runSpeed));

const N8 = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

// Rutans skydd. guns: pjäser som står ute (sandsäckar), obstacles: hinder på gatan (barrikad).
export function coverOf(p, k, { guns = [], obstacles = {} } = {}) {
  const w = p.w, h = p.h, i = k % w, j = (k - i) / w;
  const at = (di, dj) => { const a = i + di, b = j + dj; return a < 0 || b < 0 || a >= w || b >= h ? -1 : b * w + a; };
  const kind = (di, dj) => { const q = at(di, dj); return q < 0 ? -1 : p.kind[q]; };
  const house = (di, dj) => kind(di, dj) === KIND.house;
  // Husknut: ett hus snett intill men inte rakt intill på de två sidorna närmast hörnet
  // (ytterhörnet), eller vägg på en sida där väggen tar slut (sista rutan längs väggen).
  for (const [di, dj] of N8.slice(4)) if (house(di, dj) && !house(di, 0) && !house(0, dj)) return 'corner';
  for (const [di, dj] of N8.slice(0, 4)) {
    if (!house(di, dj)) continue;
    // väggen går längs den andra axeln: tar den slut åt något håll är det ett hörn
    const [ai, aj] = di ? [0, 1] : [1, 0];
    if (!house(di + ai, dj + aj) || !house(di - ai, dj - aj)) return 'corner';
  }
  if (N8.slice(0, 4).some(([di, dj]) => house(di, dj))) return 'wall';
  if (N8.some(([di, dj]) => kind(di, dj) === KIND.thing)) return 'car';
  const c = p.center(k);
  if (guns.some(g => !g.squad && !g.roof && Math.hypot(g.x - c.x, g.z - c.z) < 4.6)) return 'sandbag';
  for (const [di, dj] of N8) {
    const q = at(di, dj);
    if (q >= 0 && p.walk[q] && OBSTACLES[obstacles[q]?.type]?.kind === 'block') return 'sandbag';
  }
  if (p.hedge?.[k]) return 'hedge';
  if (p.ditch?.[k]) return 'ditch';
  return 'open';
}
// Ligger rutan så nära gatan att zombierna når dit?
export function exposed(p, k) {
  const w = p.w, h = p.h, i = k % w, j = (k - i) / w;
  for (const [di, dj] of N8) {
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < w && b < h && p.walk[b * w + a]) return true;
  }
  return false;
}

// Hordens väg som vikt per gångbar ruta: 2 på vägen dagens ingångar tar just nu, 1 på övriga
// gator. E4 har en enda väg, så där väger alla gångbara rutor 2. Sparas per hinderuppsättning.
export function hordeWeight(sim) {
  const sig = Object.keys(sim.obstacles).join(',');
  if (sim.hordeW?.sig === sig) return sim.hordeW.w;
  const p = sim.place, w = new Uint8Array(p.n);
  for (const k of p.walkKeys) w[k] = sim.route.paths ? 1 : 2;
  if (sim.route.paths) {
    const first = sim.route.spawns?.[0]?.id;
    const ids = [...new Set(sim.dayCfg.waves.flatMap(v => v.groups.map(g => g.spawn ?? first)))];
    for (const path of sim.route.paths(ids)) for (const c of path.cells) if (c >= 0 && c < p.n && p.walk[c]) w[c] = 2;
  }
  sim.hordeW = { sig, w };
  return w;
}

// Väljer rutor åt gruppen runt markeringens ruta key. count: hur många, fixed: soldater som
// redan står (en femte soldat väljs med de fyra på plats). Returnerar en lista i valordning:
// { cell, x, z, cover, stance, face, sight, score }. Kan bli kortare än count om ringen är trång.
export function planSquad(sim, key, { type = 'hv', count = squadSize(1), fixed = [], range = null } = {}) {
  const p = sim.place, c0 = p.center(key), R = SQUAD.radius;
  const def = WEAPONS[type];
  const reach = range ?? def.range;                     // sikten räknas för nivå 1
  const sightR = def.range * 1.2;                        // sikten sparas för högsta nivån (som pjäserna)
  const weight = hordeWeight(sim);
  const others = [];                                     // soldater i andra grupper
  for (const g of sim.guns) if (g.squad) for (const s of g.soldiers) others.push(s);
  const ctx = { guns: sim.guns, obstacles: sim.obstacles };
  const span = Math.ceil(R / p.size) + 1, ci = key % p.w, cj = (key - ci) / p.w;
  const cands = [];
  for (let j = Math.max(0, cj - span); j <= Math.min(p.h - 1, cj + span); j++) {
    for (let i = Math.max(0, ci - span); i <= Math.min(p.w - 1, ci + span); i++) {
      const k = j * p.w + i;
      if (p.kind[k] !== KIND.open || p.walk[k]) continue;
      const c = p.center(k), d = Math.hypot(c.x - c0.x, c.z - c0.z);
      if (d > R + 1e-9) continue;
      if (sim.guns.some(g => !g.squad && Math.hypot(g.x - c.x, g.z - c.z) < SQUAD.gunGap - 1e-9)) continue;
      if (others.some(s => Math.hypot(s.x - c.x, s.z - c.z) < SQUAD.spacing - 1e-9)) continue;
      const sight = sightFrom(p, k, sightR);
      let seen = 0, fx = 0, fz = 0;
      for (const q of sight.keys) {
        const qc = p.center(q);
        if (Math.hypot(qc.x - c.x, qc.z - c.z) > reach + p.size * 0.7072) continue;
        seen += weight[q]; fx += (qc.x - c.x) * weight[q]; fz += (qc.z - c.z) * weight[q];
      }
      if (!seen) continue;
      const cover = coverOf(p, k, ctx);
      cands.push({ cell: k, x: c.x, z: c.z, d, cover, stance: COVER[cover].stance, face: Math.atan2(fz, fx), sight, seen, exposed: exposed(p, k) });
    }
  }
  const maxSeen = Math.max(1, ...cands.map(c => c.seen));
  for (const c of cands) c.score = COVER[c.cover].score + SIGHT_W * c.seen / maxSeen - DIST_W * c.d - (c.exposed ? EXPOSED : 0);
  cands.sort((a, b) => b.score - a.score || a.cell - b.cell);
  // Girigt, en i taget: bästa poäng, minus SAME_COVER för varje soldat som redan tagit samma
  // sorts skydd (så att en tar husknuten, en bilen, en diket, som i Close Combat). Lika: först i
  // sorteringen (högst grundpoäng, sedan lägst rutnyckel).
  const picked = [], taken = fixed.map(s => ({ x: s.x, z: s.z })), used = {};
  for (const s of fixed) used[s.cover] = (used[s.cover] || 0) + 1;
  while (picked.length < count) {
    let best = null, bestScore = -Infinity;
    for (const c of cands) {
      if (picked.includes(c) || taken.some(s => Math.hypot(s.x - c.x, s.z - c.z) < SQUAD.spacing - 1e-9)) continue;
      const sc = c.score - (c.cover === 'open' ? 0 : SAME_COVER * (used[c.cover] || 0));
      if (sc > bestScore + 1e-9) { best = c; bestScore = sc; }
    }
    if (!best) break;
    picked.push(best); taken.push(best);
    used[best.cover] = (used[best.cover] || 0) + 1;
  }
  return picked;
}

// En soldat ur en vald ruta. from: markeringens mitt (han springer därifrån).
export function makeSoldier(c, i, level, from) {
  const hp = soldierHp(level);
  return { i, cell: c.cell, x: c.x, z: c.z, cover: c.cover, stance: c.stance, face: c.face, sight: c.sight,
    hp, maxHp: hp, down: false, run: runTime(Math.hypot(c.x - from.x, c.z - from.z)), cooldown: 0.13 * i, angle: c.face, targetId: null };
}

// Gruppens samlade sikt (för markeringen och panelen): unionen av soldaternas.
export function unionSight(p, soldiers) {
  const mask = new Uint8Array(p.n), keys = [];
  for (const s of soldiers) for (const k of s.sight.keys) if (!mask[k]) { mask[k] = 1; keys.push(k); }
  keys.sort((a, b) => a - b);
  return { mask, keys };
}
