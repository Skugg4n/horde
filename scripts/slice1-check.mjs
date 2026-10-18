// Skiva 1 (0.18.0) spelad huvudlöst: sex scener ur uppdraget, med en skärmbild var (docs/slice1-*.png) och inga fel i
// konsolen. Spelet går med ?mute&debug&test och --mute-audio, i Chromium utan fönster.
//   1 garrison    en grupp i ett hus på Hagstumosse (Vikingavägen dag 5)
//   2 crossfire   korseldens zon med en Ksp 90 i handen (Ishallen dag 2)
//   3 armored     pansrade mot småkaliber (Mölnbo dag 2)
//   4 rout        en grupp frivilliga bryts av bjässar (Mölnbo dag 1)
//   5 overrun     en Ksp 90 blir överränd och bemannas igen med Recrew (Mölnbo dag 5)
//   6 fatigue     tröttheten i förrådet och rekvisitionens streck
//
//   node scripts/slice1-check.mjs [--port 8154] [--only rout]
//
// Kräver en server som serverar repot (python3 -m http.server 8154) och playwright (PW_PATH eller
// ~/Projects/zombie-high-rise/node_modules/playwright). Skärmbilderna krymps med sips till högst 250 kB.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = arg('port', '8154'), ONLY = arg('only', null);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? homedir() + '/Projects/zombie-high-rise/node_modules/playwright');
const OUT = new URL('../docs/', import.meta.url).pathname;
const MAX_BYTES = 250 * 1024;

const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.addInitScript(() => { try { localStorage.clear(); } catch { /* ingen lagring */ } });
await page.goto(`http://localhost:${PORT}/?mute&debug&test`);
await page.waitForFunction(() => window.__hordeReady && window.__horde?.jump, null, { timeout: 30000 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
// tipsen av: lektionerna och fiendekorten provas i inlärningens prov, här ska inget pausa striden
await page.evaluate(() => { const H = window.__horde; H.setProgress({ ...H.progress, lessons: { ...H.progress.lessons, mode: 'off' } }); });
const frames = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

async function shot(name, clip = { x: 220, y: 110, width: 840, height: 560 }) {
  await frames(); await sleep(150);
  const file = OUT + 'slice1-' + name + '.png';
  await page.screenshot({ path: file, clip });
  // större än 250 kB: 256 färger (Pillow), sedan mindre
  for (const w of [0, 720, 600]) {
    if (statSync(file).size <= MAX_BYTES) break;
    execFileSync('python3', ['-c', `import sys\nfrom PIL import Image\nim = Image.open(sys.argv[1]).convert('RGB')\nw = int(sys.argv[2])\nif w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)\nim.quantize(colors=256, method=2).save(sys.argv[1], optimize=True)`, file, String(w)], { stdio: 'ignore' });
  }
  return { file: 'docs/slice1-' + name + '.png', kb: Math.round(statSync(file).size / 1024) };
}
// Dagen utan lektionsplåtar (de spelas i inlärningens prov), i uppställningen
async function day(map, d) {
  await page.evaluate(async ([m, d]) => {
    const H = window.__horde;
    await H.jump(m, d);
    for (let i = 0; i < 12 && H.lesson; i++) H.release();
  }, [map, d]);
  await frames();
}
const clearLessons = () => page.evaluate(() => { const H = window.__horde; for (let i = 0; i < 12 && H.lesson; i++) H.release(); });

const results = {};
const scenes = {
  // 1. En grupp i huset som ser mest av hordens väg på Vikingavägen dag 5, resten ut med balansens policy
  async garrison() {
    await day('gnesta-norr', 5);
    const r = await page.evaluate(async () => {
      const H = window.__horde, sim = H.sim, B = await import('./scripts/balance.mjs'), S = await import('./src/sim/sim.js');
      const type = ['inf', 'hv', 'civ'].find(t => sim.reserve.some(u => u.type === t));
      const best = B.housePlan(sim, type)[0];
      const b = H.actions.build(best.key, type);
      B.autoDeploy(sim);
      S.startWave(sim);
      const g = sim.guns.find(q => q.house);
      let shots = 0;
      for (let t = 0; t < 150 && (sim.phase === 'wave' || sim.phase === 'build') && !g.soldiers.some(s => s.targetId != null); t += 0.5) H.advance(0.5);
      shots = g.soldiers.filter(s => s.targetId != null).length;
      H.rig.skipTour(); H.rig.focus(g.house.x, g.house.z, 22);
      return { ok: b.ok && !!g?.house, type, house: best.id, door: Math.round(g.house.door), sanity: Math.round(g.sanity), men: g.soldiers.length, aiming: shots, kills: sim.kills };
    });
    return { ...r, shot: await shot('garrison') };
  },
  // 2. Korselden: en Ksp 90 ute, en till i handen över platsen där zonen blir störst
  async crossfire() {
    await day('gnesta', 2);
    const r = await page.evaluate(async () => {
      const H = window.__horde, sim = H.sim, S = await import('./src/sim/sim.js'), B = await import('./scripts/balance.mjs');
      B.autoDeploy(sim);
      const keep = sim.guns.find(g => g.weapon.type === 'm249');
      // den andra Ksp 90 tillbaka i handen: bästa platsen för korseld inom 24 m från den första
      for (const g of sim.guns.filter(q => q !== keep)) { sim.guns.splice(sim.guns.indexOf(g), 1); sim.reserve.push({ uid: g.weapon.uid, type: g.weapon.type, level: g.weapon.level, ...(g.squad ? { men: g.soldiers.length } : {}) }); }
      sim.squadPlan = null;
      const p = sim.place;
      let best = null;
      for (let k = 0; k < p.n; k++) {
        const c = p.center(k);
        if (p.kind[k] !== 0 || Math.hypot(c.x - keep.x, c.z - keep.z) > 30 || !S.checkSpot(sim, k, 'm249').ok) continue;
        const n = S.crossfirePreview(sim, k, 'm249').length;
        if (!best || n > best.n) best = { k, n, x: c.x, z: c.z };
      }
      if (!best) return { ok: false, why: S.checkSpot(sim, keep.cell + 3, 'm249'), reserve: sim.reserve.map(u => u.type), guns: sim.guns.length };
      H.rig.skipTour(); H.rig.focus((best.x + keep.x) / 2, (best.z + keep.z) / 2, 30);
      H.startPlacing('m249');
      return { ok: best.n > 0, tiles: best.n, at: [best.x, best.z] };
    });
    if (!r.ok) return r;
    await frames();
    const xy = await page.evaluate(([x, z]) => { const H = window.__horde; const v = H.camera.position.clone().set(x, 0, z).project(H.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, r.at);
    await page.mouse.move(xy[0], xy[1]);
    await frames(); await page.mouse.move(xy[0] + 1, xy[1]); await frames();
    const shown = await page.evaluate(() => window.__horde.scene.getObjectByName('crossfire')?.count ?? 0);
    const out = { ...r, shown, shot: await shot('crossfire') };
    await page.evaluate(() => window.__horde.stopPlacing());
    return out;
  },
  // 3. Pansrade mot småkaliber: Mölnbo dag 2, balansens uppställning, tills de pansrade är framme
  async armored() {
    await page.evaluate(async () => { await window.__horde.quickJump('molnbo', 2); });
    await clearLessons();
    const r = await page.evaluate(async () => {
      const H = window.__horde, sim = H.sim, S = await import('./src/sim/sim.js');
      let hits = 0, armorHits = 0, seen = null;
      const orig = S.step;
      for (let t = 0; t < 400 && (sim.phase === 'wave' || sim.phase === 'build') && !seen; t += 1) {
        H.advance(1);
        const a = sim.zombies.filter(z => !z.dead && z.type === 'armored' && z.hp < z.maxHp);
        if (a.length >= 2) seen = a;
      }
      void orig; void hits; void armorHits;
      if (!seen) return { ok: false };
      const z = seen[0], p = S.zombiePos(sim, z);
      H.rig.skipTour(); H.rig.focus(p.x, p.z, 22);
      const heavy = sim.guns.find(g => g.weapon.type === 'm2');
      return { ok: true, armored: seen.length, hpLeft: seen.map(q => Math.round(q.hp / q.maxHp * 100)), m2Target: heavy?.tgt ?? null, armoredKilledByNow: sim.zombies.filter(q => q.dead && q.type === 'armored').length };
    });
    return { ...r, shot: await shot('armored') };
  },
  // 4. Frivilliga bryts av bjässar: Mölnbo dag 1, sex bjässar till, gruppen närmast deras väg
  async rout() {
    await day('molnbo', 1);
    const r = await page.evaluate(async () => {
      const H = window.__horde, sim = H.sim, S = await import('./src/sim/sim.js'), B = await import('./scripts/balance.mjs');
      // de frivilliga ställs vid gatan där bjässarna kommer in, resten med balansens uppställning
      // en punkt på hordens väg från dagens första ingång, en bit in i den skarpa ytan
      const spId = sim.dayCfg.waves[0].groups[0].spawn ?? sim.route.spawns[0].id, sp = sim.route.spawns.find(q => q.id === spId) ?? sim.route.spawns[0];
      const cr = sim.map.surroundings?.crisp, inCrisp = q => !cr || (q.x > cr.x0 + 6 && q.x < cr.x1 - 6 && q.z > cr.z0 + 6 && q.z < cr.z1 - 6);
      const pathCells = sim.route.paths([sp.id])[0].cells.map(k => sim.route.cellCenter(k)).filter(inCrisp);
      const c0 = pathCells[Math.floor(pathCells.length * 0.25)], p = sim.place;
      let at = null, bd = Infinity;
      for (let k = 0; k < p.n; k++) { const c = p.center(k), d = Math.hypot(c.x - c0.x, c.z - c0.z); if (d < 9 && d < bd && p.kind[k] === 0 && S.checkSpot(sim, k, 'civ').ok) { bd = d; at = k; } }
      if (at == null) return { ok: false, why: 'ingen plats' };
      const b = S.build(sim, at, 'civ');
      const civ = sim.guns.find(g => g.id === b.id);
      B.autoDeploy(sim);
      for (let i = 0; i < 12 && H.lesson; i++) H.release();
      S.startWave(sim);
      S.debugSpawn(sim, { type: 'brute', count: 8, spawn: sp.id });
      H.rig.skipTour(); H.rig.focus(c0.x, c0.z, 30);
      let broke = null;
      for (let t = 0; t < 240 && (sim.phase === 'wave' || sim.phase === 'build') && !broke; t += 0.25) {
        H.advance(0.25);
        broke = sim.guns.find(g => g.retreat?.kind === 'rout') ?? null;
      }
      if (!broke) return { ok: false, civSanity: Math.round(civ.sanity), sanity: sim.guns.map(g => Math.round(g.sanity ?? -1)) };
      const q = S.unitPos(broke);
      H.rig.skipTour(); H.rig.focus(q.x, q.z, 26);
      H.advance(0.5);
      return { ok: true, type: broke.weapon.type, time: Math.round(sim.time), sanity: Math.round(broke.sanity), brutesNear: sim.zombies.filter(z => !z.dead && z.type === 'brute').length };
    });
    const out = { ...r, shot: await shot('rout') };
    const back = await page.evaluate(() => { const H = window.__horde, sim = H.sim; for (let t = 0; t < 40 && (sim.phase === 'wave' || sim.phase === 'build'); t += 1) H.advance(1); return sim.reserve.filter(u => u.rallied).map(u => ({ type: u.type, men: u.men, sanity: u.sanity, ready: u.readyAt <= sim.time })); });
    return { ...out, inReserve: back };
  },
  // 5. En Ksp 90 nära gatan blir överränd, står tyst och bemannas igen med Recrew
  async overrun() {
    await day('molnbo', 5);
    const r = await page.evaluate(async () => {
      const H = window.__horde, sim = H.sim, S = await import('./src/sim/sim.js'), B = await import('./scripts/balance.mjs');
      sim.cash = 2000;
      // en Ksp 90 ställs vid gatan där horden kommer in, vänd bort från den (den skjuter inte; laget slås ner)
      const sp = sim.route.spawns[0], c0 = sim.route.cellCenter(sp.key), p = sim.place;
      let at = null;
      for (let k = 0; k < p.n && at == null; k++) {
        const c = p.center(k), d = Math.hypot(c.x - c0.x, c.z - c0.z);
        if (d < 12 || d > 30 || p.kind[k] !== 0) continue;
        const i = k % p.w, j = Math.floor(k / p.w);
        const byRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => p.walk[(j + b) * p.w + i + a]);
        if (byRoad && S.checkSpot(sim, k, 'm249').ok) at = k;
      }
      if (at == null) return { ok: false, why: 'ingen plats' };
      const c = p.center(at);
      const bres = S.build(sim, at, 'm249', { facing: Math.atan2(c.z - c0.z, c.x - c0.x) });
      if (!bres.ok) return { ok: false, why: bres.reason };
      const gun = sim.guns.find(g => g.id === bres.id);
      B.autoDeploy(sim);
      for (let i = 0; i < 12 && H.lesson; i++) H.release();
      S.startWave(sim);
      S.debugSpawn(sim, { type: 'walker', count: 30, spawn: sp.id });
      let g = null;
      for (let t = 0; t < 300 && (sim.phase === 'wave' || sim.phase === 'build') && !g; t += 0.25) { H.advance(0.25); g = sim.guns.find(q => q.silent === 'overrun') ?? null; }
      if (!g) return { ok: false, why: 'inget lag nere', crew: gun.crew };
      H.rig.skipTour(); H.rig.focus(g.x, g.z, 20);
      H.advance(0.3);
      return { ok: true, id: g.id, type: g.weapon.type, time: Math.round(sim.time) };
    });
    if (!r.ok) return r;
    const silent = await shot('overrun-silent');
    const after = await page.evaluate(id => {
      const H = window.__horde, sim = H.sim;
      const g = sim.guns.find(q => q.id === id);
      // de närmaste skjuts av de andra innan laget går fram
      for (const z of sim.zombies) if (!z.dead && Math.hypot(z.x - g.x, z.z - g.z) < 6) z.hp = 0.01;
      H.advance(0.5);
      const rc = H.actions.recrew(id);
      for (let t = 0; t < 8 && g.silent; t += 0.5) H.advance(0.5);
      H.open({ kind: 'gun', id });
      return { recrew: rc.ok, reason: rc.reason ?? null, mannedAgain: !g.silent };
    }, r.id);
    return { ...r, silentShot: silent, ...after, shot: await shot('overrun-recrewed') };
  },
  // 6. Tröttheten i förrådet (och rekvisitionens streck och skadeklasser)
  async fatigue() {
    await day('gnesta-norr', 5);
    const r = await page.evaluate(() => {
      const H = window.__horde, p = H.progress;
      const units = p.op.units.map((u, i) => ({ ...u, fatigue: i % 3 }));
      H.setProgress({ ...p, rp: 900, op: { ...p.op, units, stock: { ...p.op.stock, gnesta: { ...(p.op.stock?.gnesta ?? {}), m2: 1, ksp58: 1 } } } });
      H.showDepot('gnesta');
      const rows = [...document.querySelectorAll('.depot [data-fat]')].map(n => n.textContent.trim());
      const bars = document.querySelectorAll('.depot .req .bars').length;
      return { ok: rows.length > 0, rows: rows.slice(0, 6), reqCardsWithBars: bars };
    });
    await sleep(300);
    return { ...r, shot: await shot('fatigue-depot', { x: 0, y: 0, width: 1280, height: 800 }) };
  },
};
for (const [k, fn] of Object.entries(scenes)) {
  if (ONLY && ONLY !== k) continue;
  try { results[k] = await fn(); } catch (e) { results[k] = { ok: false, error: String(e).slice(0, 300) }; }
}
await browser.close();
console.log(JSON.stringify({ results, errors }, null, 1));
process.exit(errors.length ? 1 : 0);
