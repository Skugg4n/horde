// Laddtiden per karta (0.20.0, H502), huvudlöst: första bildrutan, interaktiv (tre bildrutor i rad under 50 ms),
// var tiden går (CPU-profil per kategori och mätpunkterna i globalThis.__hordeLoad), anrop och trianglar.
// Spelets banor laddas via ?debug&jump (sparfilen pekar på banan), sedan en ny laddning som börjar på banan.
// Kräver en server som serverar repot. Rapporten: docs/reports/2026-10-19-laddtid.md.
//   PORT=8201 RUNS=3 [ONLY=E4,laxne.html] [JSON=ut.json] node scripts/load-time.mjs
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? homedir() + '/Projects/zombie-high-rise/node_modules/playwright');
const PORT = process.env.PORT ?? 8146, RUNS = +(process.env.RUNS ?? 3);
const B = `http://localhost:${PORT}/`;
const PAGES = [
  { id: 'E4', game: 'riksvagen' }, { id: 'Ishallen', game: 'gnesta' }, { id: 'Vikingavägen', game: 'gnesta-norr' }, { id: 'Mölnbo', game: 'molnbo' },
  { id: 'bjornlunda.html', url: 'bjornlunda.html', g: '__bjornlunda' }, { id: 'gnesta-centrum.html', url: 'gnesta-centrum.html', g: '__gnesta' }, { id: 'laxne.html', url: 'laxne.html', g: '__laxne' },
].filter(p => !process.env.ONLY || process.env.ONLY.split(',').includes(p.id));
// Funktioner vars inklusiva tid räknas (namn: kategori)
const CATS = [
  [/^(townGrid|osmGrid|buildGrid|e4Grid|molnboGrid)$/, 'rutnät (data)'],
  [/^(townPlacement|buildPlacement|molnboPlacement|buildPlace|e4Placement|osmPlacement)$/, 'placering (data)'],
  [/^(paintLand|paintGround|pattern)$/, 'marken (canvas)'],
  [/^(spruce|pine|birch|fruitTree|gardenTree)$/, 'träd (instanser)'],
  [/^(villa|farmhouse|barn|apartment|rowBlock|commercial|industrial|shedK|row|lamell|townBlock|shopBlock)$/, 'hus (instanser)'],
  [/^flush$/, 'instansning (flush)'],
  [/^(compileAsync|compile|getProgram|onFirstUse|WebGLProgram)$/, 'shaderprogram'],
  [/^(render|WebGLRenderer\.render)$/, 'rendering'],
  [/^(buildE4|buildGnesta|buildMolnbo|buildOsmWorld|buildWorld)$/, 'världen totalt'],
];
const INIT = () => {
  window.__lt = { first: null, inter: null };
  const g = () => window.__laxne || window.__bjornlunda || window.__gnesta || (window.__horde?.scene && document.getElementById('loading')?.hidden && window.__horde);
  let seen = null, last = 0, calm = 0;
  const f = t => {
    const now = performance.now();
    if (!window.__lt.first && g()) { if (seen == null) seen = now; else { window.__lt.first = now; last = now; } }
    else if (window.__lt.first && !window.__lt.inter) { if (now - last < 50) { if (!calm++) window.__lt.calmFrom = last; } else calm = 0; last = now; if (calm >= 3) window.__lt.inter = window.__lt.calmFrom; }
    if (!window.__lt.inter) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
};
async function once(b, P, cold) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', P.id, e.message));
  await p.addInitScript(INIT);
  const url = P.game ? B + 'index.html?debug&mute' : B + P.url;
  if (P.game) {  // sparfilen pekar på banan: hopp dit en gång, sedan en ny laddning som börjar på banan
    await p.goto(B + `index.html?debug&mute&jump=${P.game}:1`);
    await p.waitForFunction(() => window.__hordeJump, null, { timeout: 120000 }); await p.evaluate(() => window.__hordeJump);
  } else if (!cold) { await p.goto(url); await p.waitForFunction(() => window.__lt.inter, null, { timeout: 120000 }); }
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); await cdp.send('Profiler.start');
  await p.goto(url);
  await p.waitForFunction(() => window.__lt.inter, null, { timeout: 120000 });
  const { profile } = await cdp.send('Profiler.stop');
  const r = await p.evaluate(({ G }) => {
    const res = performance.getEntriesByType('resource').filter(e => /\.js|three/.test(e.name));
    const mods = Math.max(0, ...res.map(e => e.responseEnd));
    const L = window.__hordeLoad ?? null;
    const R = G ? window[G].renderer : window.__horde.renderer;
    return { first: window.__lt.first, inter: window.__lt.inter, mods, nMods: res.length, L, calls: R.info.render.calls, tris: R.info.render.triangles, map: window.__horde?.worlds ? [...window.__horde.worlds.values()].map(w => w.map.id + ':' + JSON.stringify(w.timing)) : null };
  }, { G: P.g ?? null });
  // inklusiv tid per kategori (en gång per stack), och självtid i tre.js/egna filer
  const byId = new Map(profile.nodes.map(n => [n.id, n])), parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const cat = {}, other = {}; let total = 0, idle = 0;
  profile.samples.forEach((id, i) => {
    const dt = (profile.timeDeltas[i + 1] ?? 0) / 1000; total += dt;
    const fn = byId.get(id).callFrame.functionName; if (fn === '(idle)') { idle += dt; return; }
    const hit = new Set();
    for (let k = id; k != null; k = parent.get(k)) { const name = byId.get(k).callFrame.functionName; for (const [re, c] of CATS) if (re.test(name)) hit.add(c); }
    for (const c of hit) cat[c] = (cat[c] ?? 0) + dt;
    if (!hit.size) { cat['annat'] = (cat['annat'] ?? 0) + dt; const f = byId.get(id).callFrame; const k = (f.functionName || '(anon)') + ' ' + f.url.replace(/^.*\//, '') + ':' + (f.lineNumber + 1); other[k] = (other[k] ?? 0) + dt; }
  });
  await ctx.close();
  return { ...r, cat, other: Object.entries(other).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + ' ' + Math.round(v)), busy: total - idle };
}
const b = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=user-gesture-required'] });
const out = [];
for (const P of PAGES) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await once(b, P, false));
  runs.sort((a, b) => a.inter - b.inter);
  const m = runs[Math.floor(runs.length / 2)];
  out.push({ id: P.id, ...m, all: runs.map(r => [Math.round(r.first), Math.round(r.inter)]) });
  const c = Object.entries(m.cat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ');
  console.log(`${P.id}: moduler ${Math.round(m.mods)} ms (${m.nMods} filer), första bildrutan ${Math.round(m.first)} ms, interaktiv ${Math.round(m.inter)} ms, anrop ${m.calls}, tris ${(m.tris / 1000).toFixed(0)}k | ${c} | körningar ${JSON.stringify(out.at(-1).all)}${m.map ? ' | ' + m.map.join(' ') : ''}${m.L ? ' | ' + JSON.stringify(m.L) : ''}\n   annat: ${m.other.join(' · ')}`);
}
if (process.env.JSON) (await import('node:fs')).writeFileSync(process.env.JSON, JSON.stringify(out, null, 1));
await b.close();
