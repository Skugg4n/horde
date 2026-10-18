// Skiva 1 (0.18.0) spelad huvudlöst: sex scener ur uppdraget, med en skärmbild var (docs/slice1-*.png) och inga fel i
// konsolen. Spelet går med ?mute&debug&test och --mute-audio, i Chromium utan fönster.
//   1 garrison    en grupp i ett hus på Hagstumosse (Vikingavägen dag 5)
//   2 crossfire   korseldens zon med en Ksp 90 i handen (Ishallen dag 2)
//   3 armored     pansrade mot småkaliber (Mölnbo dag 2)
//   4 rout        en grupp frivilliga bryts av bjässar (Mölnbo dag 1)
//   5 overrun     en Ksp 90 blir överränd och bemannas igen med Recrew (Mölnbo dag 5)
//   6 fatigue     tröttheten i förrådet och rekvisitionens streck
// 0.18.1 (speltestet av 0.18.0 hann inte se dem):
//   7 classes     pansrade mot lätta och tunga vapen: skada per träff per skadeklass (Mölnbo dag 2)
//   8 crawlers    krypare under taggtråden: farten i trådens rutor och trådens slitage (Mölnbo dag 4)
//   9 molnbo      Mölnbo dag 1 till 4 spelade med balansens uppställning: utfall, flest vågor ute samtidigt
//  10 readable    korseldens zoner utan kort i handen, "+20 %" i striden, sanity-stapeln och banderollen när en enhet bryts
//  11 depot       förrådets banor (Into battle / Reserve · resting) och INTEL
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
      // 0.18.1: förrådets banor (de frivilliga vilar ofta i reserven): scenen ger dagen en grupp frivilliga
      if (!sim.reserve.some(u => u.type === 'civ')) sim.reserve.push({ uid: 9001, type: 'civ', level: 1, vet: 0, men: 4 });
      const sq = 'civ';
      for (let k = 0; k < p.n; k++) { const c = p.center(k), d = Math.hypot(c.x - c0.x, c.z - c0.z); if (d < 9 && d < bd && p.kind[k] === 0 && S.checkSpot(sim, k, sq).ok) { bd = d; at = k; } }
      if (at == null) return { ok: false, why: 'ingen plats' };
      const b = S.build(sim, at, sq);
      const civ = sim.guns.find(g => g.id === b.id);
      B.autoDeploy(sim);
      for (let i = 0; i < 12 && H.lesson; i++) H.release();
      S.startWave(sim);
      // 0.18.1: stridsbanan är truppens starkaste, så bjässarna får fyra gånger hp (bara i scenen) för att nå fram
      sim.tweaks.hp = 4;
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
      // 0.18.1: förrådets banor (en Ksp 90 kan vila i reserven): scenen ger dagen en
      if (!sim.reserve.some(u => u.type === 'm249')) sim.reserve.push({ uid: 9002, type: 'm249', level: 1, vet: 0 });
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
  // 7. Skadeklasserna mot pansrade: Mölnbo dag 2 med balansens uppställning, skada per träff på pansrade per klass
  async classes() {
    await page.evaluate(async () => { await window.__horde.quickJump('molnbo', 2); });
    await clearLessons();
    const r = await page.evaluate(async () => {
      const H = window.__horde, sim = H.sim, S = await import('./src/sim/sim.js');
      // fler pansrade direkt, så att både Ksp 88 och småkalibern hinner träffa dem
      if (sim.phase === 'build') S.startWave(sim);
      S.debugSpawn(sim, { type: 'armored', count: 10, spawn: 's2' });
      S.debugSpawn(sim, { type: 'walker', count: 20, spawn: 's2' });
      const per = {}, walker = {};
      for (let i = 0; i < 30 * 240 && sim.phase === 'wave'; i++) {
        S.step(sim, 1 / 30);
        for (const e of sim.events) if (e.t === 'hit' && e.dmg != null) {
          const z = sim.zombies.find(q => q.id === e.id), b = z?.type === 'armored' ? per : z?.type === 'walker' ? walker : null;
          if (b) { (b[e.cls] ??= { n: 0, dmg: 0 }); b[e.cls].n++; b[e.cls].dmg += e.dmg; }
        }
        sim.events = [];
        if (per.small?.n > 40 && (per.heavy?.n > 10 || per.explosive?.n > 5) && walker.small?.n > 40) break;
      }
      const avg = b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, { hits: v.n, perHit: Math.round(v.dmg / v.n * 10) / 10 }]));
      const A = avg(per), Wk = avg(walker);
      const ratio = k => (A[k] && Wk[k] ? Math.round(A[k].perHit / Wk[k].perHit * 100) / 100 : null);
      return { ok: !!A.small && (!!A.heavy || !!A.explosive), armored: A, walker: Wk, smallVsWalker: ratio('small'), heavyVsWalker: ratio('heavy') };
    });
    return r;
  },
  // 8. Krypare under taggtråden: Mölnbo dag 4, tråd tvärs över vägen, krypare och vandrare genom den
  async crawlers() {
    await day('molnbo', 4);
    const r = await page.evaluate(async () => {
      const H = window.__horde, sim = H.sim, S = await import('./src/sim/sim.js'), { ZOMBIES } = await import('./src/data/zombies.js');
      sim.cash = 5000;
      const sp = sim.route.spawns.find(q => q.id === 's1'), cells = sim.route.paths(['s1'])[0].cells;
      const cr = sim.map.surroundings?.crisp, inCrisp = q => q.x > cr.x0 + 8 && q.x < cr.x1 - 8 && q.z > cr.z0 + 8 && q.z < cr.z1 - 8;
      let laid = null;
      for (const k of cells.slice(Math.floor(cells.length * 0.2))) { const c = sim.route.cellCenter(k); if (!inCrisp(c)) continue; const res = S.placeAcross(sim, sim.place.keyAt(c.x, c.z), 'wire'); if (res.ok) { laid = c; break; } }
      if (!laid) return { ok: false, why: 'ingen tråd' };
      const wires = Object.entries(sim.obstacles).filter(([, o]) => o.type === 'wire');
      const dur = () => wires.map(([k]) => Math.round((sim.obstacles[k]?.durability ?? 0) * 10) / 10);
      const hp0 = dur();
      sim.guns.length = 0;
      S.startWave(sim);
      sim.spawnQueue.length = 0;
      S.debugSpawn(sim, { type: 'crawler', count: 6, spawn: 's1' });
      const minRatio = { crawler: Infinity, walker: Infinity };
      let afterCrawlers = null;
      for (let i = 0; i < 30 * 200 && sim.phase === 'wave'; i++) {
        // först bara kryparna (trådens slitage), sedan vandrarna
        if (i === 30 * 90) { afterCrawlers = dur(); S.debugSpawn(sim, { type: 'walker', count: 6, spawn: 's1' }); }
        S.step(sim, 1 / 30); sim.events = [];
        for (const z of sim.zombies) {
          if (z.dead || !(z.type in minRatio)) continue;
          const p = S.zombiePos(sim, z);
          if (Math.hypot(p.x - laid.x, p.z - laid.z) > 4 || z.attacking) continue;
          const base = ZOMBIES[z.type].speed * (sim.map.pace ?? 1);
          minRatio[z.type] = Math.min(minRatio[z.type], z.v / base);
        }
      }
      const hp1 = dur();
      return { ok: minRatio.crawler > 0.9 && minRatio.walker < 0.9 && JSON.stringify(afterCrawlers) === JSON.stringify(hp0), slowest: { crawler: Math.round(minRatio.crawler * 100) / 100, walker: Math.round(minRatio.walker * 100) / 100 }, wireBefore: hp0, wireAfterCrawlers: afterCrawlers, wireAfterWalkers: hp1 };
    });
    return r;
  },
  // 9. Mölnbo dag 1 till 4, var för sig: balansens uppställning (Quick jump) och sedan bara klockan
  async molnbo() {
    const out = {};
    for (const d of [1, 2, 3, 4]) {
      await page.evaluate(async d => { await window.__horde.quickJump('molnbo', d); }, d);
      await clearLessons();
      out['day' + d] = await page.evaluate(async () => {
        const H = window.__horde, sim = H.sim, S = await import('./src/sim/sim.js');
        if (sim.phase === 'build' && sim.nextWaveIn == null) S.startWave(sim);
        let most = 0, routs = 0, silent = 0, xf = 0;
        for (let i = 0; i < 30 * 900 && (sim.phase === 'wave' || sim.phase === 'build'); i++) {
          if (sim.phase === 'build' && sim.nextWaveIn == null) S.startWave(sim);
          S.step(sim, 1 / 30);
          for (const e of sim.events) { if (e.t === 'routed') routs++; else if (e.t === 'gunSilent') silent++; else if (e.t === 'crossfire') xf++; }
          sim.events = [];
          if (i % 15 === 0) most = Math.max(most, S.wavesOnRoad(sim).size);
        }
        return { phase: sim.phase, base: Math.max(0, sim.baseHp), waves: sim.waveIndex, of: sim.dayCfg.waves.length, time: Math.round(sim.time), wavesOutAtOnce: most, routs, silent, crossfire: xf, kills: sim.kills };
      });
      await page.evaluate(() => { const H = window.__horde; if (H.mode !== 'play') return; });
    }
    return { ok: Object.values(out).every(x => x.wavesOutAtOnce <= 2 && x.phase === 'won'), ...out };
  },
  // 10. Det som ska synas: korseldens zoner utan kort i handen, "+20 %", sanity-stapeln och banderollen vid flykt
  async readable() {
    await day('gnesta', 2);
    const zones = await page.evaluate(async () => {
      const H = window.__horde, sim = H.sim, B = await import('./scripts/balance.mjs');
      B.autoDeploy(sim);
      return true;
    });
    await frames(); await sleep(200); await frames();
    const z = await page.evaluate(() => { const H = window.__horde; const m = H.scene.getObjectByName('crossfire-zones'); const g = H.sim.guns[0]; H.rig.skipTour(); if (g) H.rig.focus(g.x, g.z, 40); return { zoneTiles: m?.count ?? 0, held: !!H.placing }; });
    const zshot = await shot('crossfire-zones');
    const flash = await page.evaluate(async () => {
      const H = window.__horde, S = await import('./src/sim/sim.js');
      S.startWave(H.sim);
      // "+20 %" kommer ur händelsen crossfire (main.js handleEvents, som advance går genom); räkna raderna i DOM
      let seen = 0, text = null;
      const mo = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('xf')) { seen++; text ??= n.textContent; } });
      mo.observe(document.querySelector('#ui') ?? document.body, { childList: true, subtree: true });
      for (let t = 0; t < 120 && H.sim.phase === 'wave' && !seen; t += 2) { H.advance(2); await new Promise(r => setTimeout(r, 0)); }
      mo.disconnect();
      return { flashes: seen, text };
    });
    // sanity och flykten: Mölnbo dag 1, bjässar mot en grupp frivilliga
    await day('molnbo', 1);
    const rout = await page.evaluate(async () => {
      const H = window.__horde, sim = H.sim, S = await import('./src/sim/sim.js'), B = await import('./scripts/balance.mjs');
      // som scenen rout: de frivilliga vid gatan där bjässarna kommer in
      const spId = sim.dayCfg.waves[0].groups[0].spawn ?? sim.route.spawns[0].id;
      const cr = sim.map.surroundings?.crisp, inCrisp = q => !cr || (q.x > cr.x0 + 6 && q.x < cr.x1 - 6 && q.z > cr.z0 + 6 && q.z < cr.z1 - 6);
      const pathCells = sim.route.paths([spId])[0].cells.map(k => sim.route.cellCenter(k)).filter(inCrisp);
      const c0 = pathCells[Math.floor(pathCells.length * 0.25)], p = sim.place;
      let at = null, bd = Infinity;
      // 0.18.1: förrådets banor (de frivilliga vilar ofta i reserven): scenen ger dagen en grupp frivilliga
      if (!sim.reserve.some(u => u.type === 'civ')) sim.reserve.push({ uid: 9001, type: 'civ', level: 1, vet: 0, men: 4 });
      const sq = 'civ';
      for (let k = 0; k < p.n; k++) { const c = p.center(k), d = Math.hypot(c.x - c0.x, c.z - c0.z); if (d < 9 && d < bd && p.kind[k] === 0 && S.checkSpot(sim, k, sq).ok) { bd = d; at = k; } }
      if (at != null) S.build(sim, at, sq);
      B.autoDeploy(sim);
      for (let i = 0; i < 12 && H.lesson; i++) H.release();
      S.startWave(sim);
      sim.tweaks.hp = 4;
      S.debugSpawn(sim, { type: 'brute', count: 8, spawn: spId });
      H.rig.skipTour(); H.rig.focus(c0.x, c0.z, 30);
      let banner = null, bar = null;
      for (let t = 0; t < 240 && sim.phase === 'wave' && !banner; t += 0.5) {
        H.advance(0.5);
        const b = document.querySelector('#banner'); if (b && !b.hidden && /breaks!/.test(b.textContent)) banner = b.textContent;
        if (!bar && t % 4 === 0) { await new Promise(r => requestAnimationFrame(() => r())); const s = document.querySelector('.ustat .sbar:not([hidden])'); if (s) { const r = s.getBoundingClientRect(); bar = { w: Math.round(r.width), h: Math.round(r.height), color: getComputedStyle(s.firstChild).backgroundColor }; } }
      }
      const red = [...document.querySelectorAll('.ustat .sbar[data-st="wavering"], .ustat .sbar[data-st="breaking"]')].length;
      return { banner, bar, redBars: red, pings: true };
    });
    const rshot = await shot('rout-banner');
    return { ok: z.zoneTiles > 0 && !z.held && flash.flashes > 0 && !!rout.banner && rout.bar?.w >= 40, zones: z, zshot, flash, rout, rshot };
  },
  // 11. Förrådet: banorna och INTEL (Mölnbo dag 4, fler enheter än taket)
  async depot() {
    await day('molnbo', 4);
    const r = await page.evaluate(() => {
      const H = window.__horde, p = H.progress;
      const units = p.op.units.map((u, i) => ({ ...u, fatigue: i % 3 }));
      H.setProgress({ ...p, rp: 300, op: { ...p.op, units } });
      H.showDepot('molnbo', 'opmap', { day: 4 });
      const q = s => document.querySelectorAll(s).length;
      const lanes = { battle: q('.depot .lane.battle .ucard'), rest: q('.depot .lane.rest .ucard'), cnt: document.querySelector('.depot .lane.battle .cnt')?.textContent };
      // klick: en från reserven till striden när banan är full ger ett skäl
      document.querySelector('.depot .lane.rest .ucard [data-a="lane"]')?.click();
      const refusal = document.querySelector('.depot .dmsg')?.textContent.trim();
      document.querySelector('.depot .lane.battle .ucard [data-a="lane"]')?.click();
      const after = { battle: q('.depot .lane.battle .ucard'), rest: q('.depot .lane.rest .ucard') };
      const intel = [...document.querySelectorAll('.depot .intel .foe-row b')].map(n => n.textContent);
      const fat = [...document.querySelectorAll('.depot .fatb')].slice(0, 3).map(n => n.textContent);
      return { ok: lanes.battle > 0 && lanes.battle <= 10 && /full/.test(refusal ?? '') && after.battle === lanes.battle - 1 && intel.length > 0, lanes, refusal, after, intel, fatigue: fat, quality: document.querySelector('.depot .intel .iq')?.textContent };
    });
    await sleep(300);
    return { ...r, shot: await shot('depot-lanes', { x: 0, y: 0, width: 1280, height: 800 }) };
  },
};
for (const [k, fn] of Object.entries(scenes)) {
  if (ONLY && ONLY !== k) continue;
  try { results[k] = await fn(); } catch (e) { results[k] = { ok: false, error: String(e).slice(0, 300) }; }
}
await browser.close();
console.log(JSON.stringify({ results, errors }, null, 1));
process.exit(errors.length ? 1 : 0);
