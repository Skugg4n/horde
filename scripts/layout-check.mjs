// Layoutprovet (0.16.4, Olas skärmbilder: text ovanpå text på resultatskylten och Deploy-knappen som flöt ut i
// nästa knapp; samma sorts fel har kommit tillbaka flera gånger). Kör spelet huvudlöst i Chromium i tre bredder
// (1024, 1440, 1920) och går igenom skyltarna: menyn, dagens intro, pausmenyn, resultatet (med RP-tipset),
// operationskartan och förrådet. På varje skylt och knapp:
//   - ingen textrad går utanför sin knapp eller sin skylt (avrundat 1 px),
//   - inga två textrutor som inte är förälder och barn överlappar (syskon, kusiner, tips över innehåll),
//   - knapparna i en rad (.acts) överlappar inte varandra.
// Utfallet: en rad per fel, och exit-kod 1 om något fel finns.
//
//   node scripts/layout-check.mjs [--port 8146] [--shots katalog]
//
// Kräver en server som serverar repot (python3 -m http.server 8146) och playwright (PW_PATH eller
// ~/Projects/zombie-high-rise/node_modules/playwright).
import { createRequire } from 'node:module';
import { homedir } from 'node:os';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = arg('port', '8146'), SHOTS = arg('shots', null);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH ?? homedir() + '/Projects/zombie-high-rise/node_modules/playwright');
const WIDTHS = [1024, 1440, 1920];

// Körs i sidan: alla textrutor i skyltarna, och felen.
function audit(scope) {
  const out = [];
  const roots = [...document.querySelectorAll('.sheet, #coach .cplate')].filter(n => !n.closest('[hidden]') && getComputedStyle(n).display !== 'none');
  const vis = n => { const s = getComputedStyle(n); return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const textBoxes = [];
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.textContent.trim()) continue;
      const el = t.parentElement;
      if (!el || !vis(el) || el.closest('[hidden]')) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      const r = range.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      textBoxes.push({ el, r, text: t.textContent.trim().slice(0, 40) });
    }
  }
  const name = el => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')).slice(0, 60);
  // 1. text utanför sin knapp eller skylt
  for (const b of textBoxes) {
    const box = b.el.closest('button, .act, .sheet');
    if (!box) continue;
    // en rullande yta (skylten eller en kolumn i den): texten får ligga under kanten (den rullas fram), men inte
    // utanför i sidled
    let scroll = false;
    for (let a = b.el; a && a !== box.parentElement; a = a.parentElement) if (a.scrollHeight > a.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(a).overflowY)) scroll = true;
    const c = box.getBoundingClientRect();
    const outX = b.r.left < c.left - 1 || b.r.right > c.right + 1;
    const outY = !scroll && (b.r.top < c.top - 1 || b.r.bottom > c.bottom + 1);
    if (outX || outY) out.push(`${scope}: "${b.text}" går utanför ${name(box)} (${Math.round(b.r.left)}..${Math.round(b.r.right)} mot ${Math.round(c.left)}..${Math.round(c.right)})`);
  }
  // 2. textrutor som överlappar (inte förälder och barn, inte samma element)
  const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  // radens luft över och under tecknen räknas inte (en stor rubrik har hög radhöjd)
  const glyphs = r => ({ left: r.left, right: r.right, top: r.top + r.height * 0.2, bottom: r.bottom - r.height * 0.2 });
  const clipped = b => { for (let a = b.el.parentElement; a; a = a.parentElement) { if (/auto|scroll|hidden/.test(getComputedStyle(a).overflowY)) { const c = a.getBoundingClientRect(); if (b.r.bottom < c.top || b.r.top > c.bottom) return true; } } return false; };
  for (let i = 0; i < textBoxes.length; i++) for (let j = i + 1; j < textBoxes.length; j++) {
    const a = textBoxes[i], b = textBoxes[j];
    if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el) || clipped(a) || clipped(b)) continue;
    if (hit(glyphs(a.r), glyphs(b.r))) out.push(`${scope}: "${a.text}" (${name(a.el)}) överlappar "${b.text}" (${name(b.el)})`);
  }
  // 3. knappar i samma rad överlappar inte
  for (const acts of document.querySelectorAll('.sheet .acts')) {
    const bs = [...acts.children].filter(n => n.getClientRects().length).map(n => n.getBoundingClientRect());
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (hit(bs[i], bs[j])) out.push(`${scope}: knappar i ${name(acts)} överlappar`);
  }
  return { errors: out, texts: textBoxes.length };
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
  let errors = [], checked = 0;
  for (const W of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: W, height: Math.round(W * 0.6) } });
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });
    await page.addInitScript(() => { try { localStorage.clear(); } catch { /* ingen lagring */ } });
    await page.goto(`http://localhost:${PORT}/?mute&debug&test`);
    // första banan ska ha laddat klart innan provet hoppar (annars kan två banor laddas samtidigt)
    await page.waitForFunction(() => window.__hordeReady && window.__horde?.jump && window.__horde.mode === 'menu', null, { timeout: 30000 });
    await page.waitForTimeout(2000);
    const check = async scope => {
      await page.waitForTimeout(600);
      const r = await page.evaluate(audit, `${scope} @${W}`);
      errors = errors.concat(r.errors); checked++;
      if (!r.texts) errors.push(`${scope} @${W}: ingen skylt hittades`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${scope}-${W}.png` });
    };
    const ev = s => page.evaluate(s);
    const skipLessons = async () => { for (let i = 0; i < 6; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(120); if (!(await ev('window.__horde.lesson'))) break; } await ev(`document.querySelector('#menu .sheet') && window.__horde.sheetAction?.('continue')`); };
    await check('menu');
    await ev(`(async () => { const H = window.__horde; await H.jump('gnesta', 1); H.startDay(1); })()`);
    await check('intro');
    // pausmenyn mitt i dagen
    await ev(`window.__horde.sheetAction('go')`);
    await page.waitForTimeout(400);
    await skipLessons();
    // resultatet efter Ishallen dag 2 (RP-tipset står i skylten)
    await ev(`(async () => { const H = window.__horde; await H.jump('gnesta', 2); })()`);
    await page.waitForTimeout(400);
    for (let i = 0; i < 8 && await ev('window.__horde.lesson'); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
    // ?debug sparar inte dagens utfall: tiden efter dag 2 räknas som nådd, så att RP och tipset visas
    await ev(`(() => { const H = window.__horde, p = H.progress; H.setProgress({ ...p, maps: { ...p.maps, gnesta: { ...p.maps.gnesta, unlockedDay: 3 } } }); H.sim.phase = 'won'; })()`);
    await page.waitForFunction(() => window.__horde.mode === 'result', null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(900);
    await check('result');
    await ev(`window.__horde.sheetAction('opmap')`);
    await check('opmap');
    await ev(`(async () => { const H = window.__horde; await H.jump('gnesta', 5); H.showDepot('gnesta', 'opmap', { day: 5 }); })()`);
    await check('depot');
    if (pageErrors.length) errors.push(...pageErrors.map(e => `@${W} konsolfel: ${e}`));
    await page.close();
  }
  await browser.close();
  for (const e of errors) console.log(e);
  console.log(`${checked} skyltar i ${WIDTHS.length} bredder, ${errors.length} fel`);
  process.exit(errors.length ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(2); });
