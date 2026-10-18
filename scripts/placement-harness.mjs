// Placeringsprovet i låg bildtakt (0.16.2). Tre speltester i rad (0.14.2, 0.16.0, 0.16.1) rapporterade att
// ungefär vart tredje klick med en enhet i handen inte gav någonting. Testarnas panel gick i 1 till 1,5 bilder/s.
// Skriptet kör spelet huvudlöst i Chromium med requestAnimationFrame nedskruvat till FPS bilder per sekund,
// tar upp kort (klick på kortet eller siffertangenten), och klickar med riktiga pekarhändelser på kartan i
// flera följder: hovra och tryck direkt, tryck och släpp utan bildruta emellan, klick strax efter ett köp,
// klick medan ett kort är utfällt eller en plåt står, klick nära vägar, hus och träd.
// Varje försök loggas med utfallet: placed (enheten står), reason (ett skäl visades vid pekaren),
// silent (enheten i handen, inget hände, inget skäl). Invarianten: silent ska vara 0.
//
//   node scripts/placement-harness.mjs [--port 8144] [--fps 1.5] [--n 60] [--seed 1] [--verbose] [--map molnbo --day 1]
//
// Kräver en server som serverar repot (python3 -m http.server 8144) och playwright (PW_PATH eller
// ~/Projects/zombie-high-rise/node_modules/playwright).
import { createRequire } from 'node:module';
import { homedir } from 'node:os';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = arg('port', '8144'), FPS = Number(arg('fps', '1.5')), N = Number(arg('n', '60')), SEED = Number(arg('seed', '1'));
const VERBOSE = process.argv.includes('--verbose');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? homedir() + '/Projects/zombie-high-rise/node_modules/playwright');

let s = SEED >>> 0;
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
const pick = a => a[Math.floor(rnd() * a.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FRAME = 1000 / FPS;

// Banorna och dagarna som testarna fastnade på
const SCENES = [
  { map: 'riksvagen', day: 2 },
  { map: 'riksvagen', day: 3 },
  { map: 'gnesta', day: 1 },
  { map: 'gnesta', day: 2 },
];
// 0.17.0-molnbo: --map molnbo --day 1 provar en enda bana och dag i stället för listan ovan
if (arg('map', null)) SCENES.splice(0, SCENES.length, { map: arg('map'), day: Number(arg('day', '1')) });
const SEQS = ['hover-press', 'press-now', 'after-buy', 'card-hover', 'hotkey', 'near-edge', 'retry-near', 'nudge'];

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(frame => {
    // låg bildtakt: varje requestAnimationFrame väntar en hel bildruta
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => setTimeout(() => raf(cb), frame);
    try { localStorage.clear(); } catch {}
  }, FRAME);
  await page.goto(`http://localhost:${PORT}/?mute&debug&test`);
  await page.waitForFunction(() => window.__hordeReady && window.__horde?.jump, null, { timeout: 30000 });
  // varje försök i sidan: vad låg under pekaren vid trycket, hölls något, och vad hände sedan
  await page.evaluate(() => {
    const H = window.__horde;
    window.__pl = { log: [], cur: null };
    const tip = () => document.getElementById('ghosttip');
    addEventListener('pointerdown', e => {
      const c = window.__pl.cur; if (!c) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      c.target = t ? (t.id ? '#' + t.id : '') + (t.className && typeof t.className === 'string' ? '.' + t.className.split(' ').join('.') : '') + '<' + t.tagName.toLowerCase() : 'none';
      c.holding = H.placing?.type ?? null;
      c.lesson = H.lesson;
    }, true);
    const nm = t => t ? (t.id ? '#' + t.id : '') + (typeof t.className === 'string' && t.className ? '.' + t.className.split(' ').join('.') : '') + '<' + (t.tagName ?? 'doc').toLowerCase() : 'none';
    addEventListener('pointerup', e => { const c = window.__pl.cur; if (c) c.up = nm(e.target); }, true);
    addEventListener('click', e => { const c = window.__pl.cur; if (c) c.click = nm(e.target) + (e.target === H.renderer.domElement ? '(game)' : '(other:' + (e.target.parentElement?.id || e.target.parentElement?.className) + ')'); }, true);
    new MutationObserver(() => {
      const c = window.__pl.cur, g = tip();
      if (c && g && !g.hidden && g.textContent) c.tips.push(g.textContent);
    }).observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true });
  });

  const totals = { placed: 0, reason: 0, silent: 0, notHolding: 0 };
  const bySeq = {};
  for (let i = 0; i < N; i++) {
    const sc = SCENES[i % SCENES.length];
    await page.evaluate(async sc => {
      const H = window.__horde;
      if (H.sim?.map.id !== sc.map || H.sim?.day !== sc.day || H.sim.guns.length > 8 || H.mode !== 'play') await H.jump(sc.map, sc.day);
      H.stopPlacing();
      H.sim.cash = Math.max(H.sim.cash, 2000);
    }, sc);
    await sleep(FRAME * 2);
    const seq = SEQS[Math.floor(rnd() * SEQS.length)];
    // ett kort som går att ta upp, och en punkt på kartan (nära väg, hus eller träd när det går)
    const setup = await page.evaluate(({ r1, r2, r3 }) => {
      const H = window.__horde, sim = H.sim, cam = H.camera;
      const cards = [...document.querySelectorAll('#buildbar .card.buy')].filter(b => !b.classList.contains('off'));
      if (!cards.length) return null;
      const card = cards[Math.floor(r1 * cards.length)], cr = card.getBoundingClientRect();
      const p = sim.place, keys = [];
      for (let k = 0; k < p.w * p.h; k++) {
        const c = p.center(k), v = cam.position.clone().set(c.x, 0, c.z).project(cam);
        const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
        if (!(sx > 40 && sx < innerWidth - 40 && sy > 60 && sy < innerHeight - 140)) continue;
        // bara punkter där kartan syns: inte under HUD:ens fasta delar (dag, kassa, knappar, minikartan, köpraden)
        const el = document.elementFromPoint(sx, sy);
        if (el !== H.renderer.domElement && el?.closest('#day, #res, #go, #wavebar, #speedcd, #minimap, #buildbar, #hint, .panel, button, #evac, #menubtn')) continue;
        keys.push([sx, sy]);
      }
      const [sx, sy] = keys[Math.floor(r2 * keys.length)];
      // en punkt där just den här saken inte får stå, för retry-near och nudge
      const bad = keys.filter(([x, y]) => { const g = H.groundAt(x, y), k = g ? p.keyAt(g.x, g.z) : -1; return k >= 0 && p.kind[k] !== 0; });
      const [bx, by] = bad.length ? bad[Math.floor(r3 * bad.length)] : [sx, sy];
      const kbd = card.querySelector('kbd')?.textContent;
      return { id: card.dataset.id, kbd, cx: cr.x + cr.width / 2, cy: cr.y + cr.height / 2, sx: sx + (r3 - 0.5) * 6, sy, bx, by };
    }, { r1: rnd(), r2: rnd(), r3: rnd() });
    if (!setup) continue;
    const before = await page.evaluate(() => { const s = window.__horde.sim; return s.guns.length + Object.keys(s.obstacles).filter(k => s.obstacles[k]).length; });
    // ta upp kortet (vad låg under pekaren, och vad hölls efteråt)
    await page.evaluate(() => { window.__pl.cur = { tips: [] }; });
    // 0.17.0: snabbvalen är fasta (0.16.4: enheterna 1 till 9, Z X C), en tangent per kort; ett gammalt ackord
    // ('2-8') trycks tangent för tangent
    if (seq === 'hotkey') for (const k of setup.kbd.split('-')) await page.keyboard.press(k);
    else await page.mouse.click(setup.cx, setup.cy);
    if (seq === 'after-buy') {
      // ett köp först, sedan samma kort igen och ett klick direkt
      await page.mouse.click(setup.sx, setup.sy);
      await page.mouse.click(setup.cx, setup.cy);
    }
    if (seq !== 'press-now' && seq !== 'card-hover') await sleep(FRAME * (seq === 'hover-press' ? 0.3 : 1.2));
    const pickUp = await page.evaluate(() => { const c = window.__pl.cur; window.__pl.cur = { tips: [], t0: performance.now() }; return { target: c.target ?? 'key', held: window.__horde.placing?.type ?? null, tips: c.tips }; });
    if (seq === 'card-hover') {
      // pekaren går från det utfällda kortet rakt upp till kartan, och trycker utan att vänta på en bildruta
      await page.mouse.move(setup.cx, setup.cy - 60, { steps: 2 });
    }
    if (seq === 'near-edge') await page.mouse.move(setup.sx + 40, setup.sy + 30);
    if (seq === 'retry-near' || seq === 'nudge') {
      // på en ruta som inte går (väg, hus, skog): klicka (retry-near) eller hovra (nudge) där, och sedan strax
      // nedanför till höger, där skälet står vid pekaren, utan att vänta på en ny bildruta
      await page.mouse.move(setup.bx, setup.by);
      if (seq === 'retry-near') { await page.mouse.down(); await page.mouse.up(); }
      await sleep(FRAME * 2.2);
      await page.evaluate(() => { window.__pl.cur = { tips: [], t0: performance.now() }; });
      setup.sx = setup.bx + 24; setup.sy = setup.by + 20;
    }
    await page.mouse.move(setup.sx, setup.sy);
    await page.mouse.down(); await page.mouse.up();
    await sleep(FRAME * 2.5);
    const out = await page.evaluate(() => {
      const s = window.__horde.sim, c = window.__pl.cur; window.__pl.cur = null;
      return { n: s.guns.length + Object.keys(s.obstacles).filter(k => s.obstacles[k]).length, ...c, log: (window.__horde.placeLog ?? []).filter(e => e.t >= c.t0).map(e => e.out + (e.reason ? ':' + e.reason : '')) };
    });
    const extra = seq === 'after-buy' ? 1 : 0;
    let res;
    if (out.n > before + extra) res = 'placed';
    // kortet gick inte att ta upp och sa varför (alla utställda): ett skäl, inget tyst
    else if (!out.holding && !pickUp.held && pickUp.tips.length) res = 'reason';
    else if (!out.holding) res = 'notHolding';
    else if (out.tips.length) res = 'reason';
    else res = 'silent';
    // notHolding: kortet togs upp i försöket men inget var i handen vid klicket på kartan (spelarens bild: kortet valt)
    totals[res]++;
    (bySeq[seq] ??= { placed: 0, reason: 0, silent: 0, notHolding: 0 })[res]++;
    if (VERBOSE || res === 'silent' || res === 'notHolding') console.log(`#${i} ${sc.map} d${sc.day} ${seq} ${setup.id} -> ${res} card=${pickUp.target}/${pickUp.held} lesson=${out.lesson} target=${out.target} holding=${out.holding} tips=${out.tips.slice(-1)} log=${out.log} up=${out.up} click=${out.click}`);
  }
  await browser.close();
  const fails = totals.silent + totals.notHolding;
  console.log(JSON.stringify({ fps: FPS, n: N, ...totals, failures: fails, bySeq }, null, 1));
  if (errors.length) console.log('console errors:', errors.slice(0, 5));
  process.exit(fails || errors.length ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(2); });
