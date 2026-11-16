// Minnet över många dagar i följd i EN sida (0.26.2, H606: webbläsaren kraschade tre gånger på tre timmars spel).
// Kampanjens dagar en efter en med Quick jump (auto-deploy), dagen spelas till slut med __horde.advance, sedan
// skräpsamling och mätning: JS-minnet, three.js geometrier/texturer/program, scenens objekt (aktuell bana och alla
// byggda banor), DOM-noder och lyssnare (CDP Memory.getDOMCounters) och levande ljudnoder (med --audio).
//   node scripts/memory-days.mjs [--port 8461] [--days 15] [--rounds 1] [--audio] [--out fil.json]
// --audio: sidan utan ?mute (Chromium med --mute-audio hörs ändå inte), ljudnoderna räknas med en FinalizationRegistry.
import { writeFileSync } from 'node:fs';
import { launch } from './headless.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = arg('port', '8461'), DAYS = Number(arg('days', 15)), ROUNDS = Number(arg('rounds', 1)), AUDIO = process.argv.includes('--audio'), OUT = arg('out', null);
const JUMPS = [['riksvagen', 1], ['riksvagen', 2], ['riksvagen', 3], ['gnesta', 1], ['gnesta', 2], ['gnesta', 3], ['gnesta-norr', 1],
  ['molnbo', 1], ['molnbo', 2], ['molnbo', 3], ['laxne', 1], ['bjornlunda', 1], ['bjornlunda', 2], ['gnesta-vastra-rondell', 1], ['vasterkarv', 1]];

const browser = await launch({ args: ['--js-flags=--expose-gc', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required'], fps: 4 });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('crash', () => errors.push('CRASH'));
await page.addInitScript(() => {
  try { localStorage.clear(); } catch { /* ingen lagring */ }
  // levande ljudnoder: varje create* registreras, räknaren går ned när noden samlats in
  const live = { made: 0, alive: 0 };
  window.__audioCount = live;
  const reg = new FinalizationRegistry(() => { live.alive--; });
  const P = (window.BaseAudioContext ?? window.AudioContext)?.prototype;
  if (P) for (const k of Object.getOwnPropertyNames(P)) {
    if (!/^create/.test(k) || typeof P[k] !== 'function') continue;
    const f = P[k];
    P[k] = function (...a) { const n = f.apply(this, a); if (n && typeof n === 'object') { live.made++; live.alive++; reg.register(n, 0); } return n; };
  }
});
const url = `http://127.0.0.1:${PORT}/?debug&test`;
if (AUDIO) await page.evaluate(u => { location.href = u; }, url + '&fps=4').catch(() => {}); else await page.goto(url);
await page.waitForFunction(() => window.__hordeReady && window.__horde?.quickJump, null, { timeout: 60000 });
await page.evaluate(() => { const H = window.__horde; H.setProgress({ ...H.progress, lessons: { ...H.progress.lessons, mode: 'off' } }); });
if (AUDIO) await page.mouse.click(640, 400);   // ljudet låses upp av en gest
const cdp = await page.context().newCDPSession(page);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function measure(label) {
  await page.evaluate(() => { for (let i = 0; i < 3; i++) window.gc?.(); });
  await sleep(300);
  await page.evaluate(() => window.gc?.());
  const dom = await cdp.send('Memory.getDOMCounters');
  const m = await page.evaluate(async () => {
    const kit = await import('./src/render/kit.js');
    const H = window.__horde, r = H.renderer, count = sc => { let n = 0; sc?.traverse(() => n++); return n; };
    let all = 0; for (const w of H.worlds.values()) all += count(w.scene);
    return { heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), geometries: r.info.memory.geometries, textures: r.info.memory.textures,
      programs: r.info.programs?.length ?? 0, sceneObjs: count(H.scene), worlds: H.worlds.size, allWorldObjs: all,
      audioAlive: window.__audioCount?.alive ?? 0, audioMade: window.__audioCount?.made ?? 0, geoCache: kit.geoCacheSize(), mode: H.mode };
  });
  return { label, ...m, domNodes: dom.nodes, listeners: dom.jsEventListeners, documents: dom.documents };
}

async function playDay(mapId, d) {
  await page.evaluate(async ([m, d]) => { await window.__horde.quickJump(m, d); }, [mapId, d]);
  let out = null;
  for (let i = 0; i < 160 && !out; i++) {
    out = await page.evaluate(() => {
      const H = window.__horde, s = H.sim;
      if (H.lesson) H.release();
      if (H.mode === 'play' && s.phase === 'build' && s.nextWaveIn == null) H.go();
      H.advance(5);
      return s.phase === 'won' || s.phase === 'lost' ? s.phase : null;
    });
    await sleep(40);   // bildrutor ritas (fps 4) så att GPU-sidan också används
  }
  await sleep(1500);   // finishDay i nästa bildruta, resultatbladet
  return out ?? 'timeout';
}

const rows = [];
rows.push(await measure('start'));
console.log(JSON.stringify(rows[0]));
const t0 = Date.now();
for (let r = 0; r < ROUNDS; r++) for (let i = 0; i < DAYS; i++) {
  const [m, d] = JUMPS[i % JUMPS.length];
  const res = await playDay(m, d);
  const row = await measure(`${r * DAYS + i + 1} ${m}:${d} ${res}`);
  rows.push(row); console.log(JSON.stringify(row));
}
console.log('tid', Math.round((Date.now() - t0) / 1000), 's', 'fel', errors.slice(0, 5));
if (OUT) writeFileSync(OUT, JSON.stringify({ rows, errors }, null, 1));
await browser.close();
