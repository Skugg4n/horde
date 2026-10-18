// Layoutprovet (0.16.4, Olas skärmbilder: text ovanpå text på resultatskylten och Deploy-knappen som flöt ut i
// nästa knapp; samma sorts fel har kommit tillbaka flera gånger). Kör spelet huvudlöst i Chromium i tre bredder
// (1024, 1440, 1920) och går igenom skyltarna: menyn, dagens intro, pausmenyn, resultatet (med RP-tipset),
// operationskartan och förrådet, och samma skyltar på Mölnbo (0.17.0). På varje skylt och knapp:
//   - ingen textrad går utanför sin knapp eller sin skylt (avrundat 1 px),
//   - inga två textrutor som inte är förälder och barn överlappar (syskon, kusiner, tips över innehåll),
//   - knapparna i en rad (.acts) överlappar inte varandra.
// 0.17.1: och gränssnittet i striden (auditHud): köpraden, plåtarna, lektionsplåten med PAUSED, ingångarnas etiketter
// och raderna, på Mölnbo dag 1 och 4 och E4 dag 2.
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

// 0.17.1 (speltestet av 0.17.0: text på text på tre ställen, "PAUSED" över köpradens Ksp 58, vågens etikett bakom
// tågets ruta, lektionsraden över DAY-rutan och över "UNITS 2/6"): gränssnittet i striden. Varje synlig plåt i HUD:en
// är en ägare; en textrad får inte överlappa en textrad hos en annan ägare och inte ligga över en annan ägares plåt,
// och korten i köpraden håller sin text inne i kortet.
function auditHud(scope) {
  const out = [];
  const OWNERS = ['#day', '#res', '#train', '#evac', '#buildbar', '#go', '#wavebar', '#speedcd', '#minimap', '#banner', '.entry', '#coach .cplate', '#coach .paused', '#notes .note', '.panel', '#routekey', '#hint'];
  const vis = n => { if (n.closest('[hidden]')) return false; for (let a = n; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false; } return true; };
  const owners = [];
  for (const sel of OWNERS) for (const n of document.querySelectorAll(sel)) if (vis(n) && !owners.some(o => o.el.contains(n))) { const r = n.getBoundingClientRect(); if (r.width && r.height) owners.push({ sel, el: n, r }); }
  const texts = [];
  for (const o of owners) {
    const w = document.createTreeWalker(o.el, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      if (!t.textContent.trim() || !vis(t.parentElement)) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) texts.push({ o, el: t.parentElement, r, text: t.textContent.trim().slice(0, 30) });
    }
  }
  const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const glyphs = r => ({ left: r.left, right: r.right, top: r.top + r.height * 0.2, bottom: r.bottom - r.height * 0.2 });
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.o === b.o) continue;
    if (hit(glyphs(a.r), glyphs(b.r))) out.push(`${scope}: "${a.text}" (${a.o.sel}) över "${b.text}" (${b.o.sel})`);
  }
  // text över en annan ägares plåt (etiketten bakom tågets ruta, raden över DAY-rutan)
  for (const t of texts) for (const o of owners) {
    if (o === t.o || o.el.contains(t.el) || t.o.el.contains(o.el)) continue;
    if (['#notes .note', '#banner'].includes(t.o.sel) && ['#notes .note', '#banner'].includes(o.sel)) continue;
    if (hit(glyphs(t.r), o.r)) out.push(`${scope}: "${t.text}" (${t.o.sel}) ligger över ${o.sel}`);
  }
  // köpradens kort: texten inne i kortet
  for (const c of document.querySelectorAll('#buildbar .card')) {
    if (!vis(c)) continue;
    const cr = c.getBoundingClientRect();
    // en rad som klipps med ellips (kortets värden, hela står när pekaren är över kortet) räknas inte
    for (const t of texts) if (c.contains(t.el) && getComputedStyle(t.el).textOverflow !== 'ellipsis' && (t.r.left < cr.left - 1 || t.r.right > cr.right + 1 || t.r.top < cr.top - 1 || t.r.bottom > cr.bottom + 1)) out.push(`${scope}: "${t.text}" går utanför kortet ${c.dataset.id ?? ''}`);
  }
  return { errors: [...new Set(out)], texts: texts.length };
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
    // 0.17.0: Mölnbo (tågklockans dag 3): introt med målet, resultatet, operationskartan och förrådet med sektorns tak
    await ev(`(async () => { const H = window.__horde; await H.jump('molnbo', 3); H.startDay(3); })()`);
    await check('molnbo-intro');
    await ev(`window.__horde.sheetAction('go')`);
    await page.waitForTimeout(400);
    await skipLessons();
    await ev(`(() => { window.__horde.sim.phase = 'won'; })()`);
    await page.waitForFunction(() => window.__horde.mode === 'result', null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(900);
    await check('molnbo-result');
    await ev(`window.__horde.sheetAction('opmap')`);
    await check('molnbo-opmap');
    await ev(`(async () => { const H = window.__horde; await H.jump('molnbo', 4); H.showDepot('molnbo', 'opmap', { day: 4 }); })()`);
    await check('molnbo-depot');
    // 0.17.1: gränssnittet i striden (auditHud): lektionsplåten med PAUSED över köpraden, raden vid pekaren nära
    // DAY-rutan, tågets ruta med ingångarnas etiketter, mitt i en våg, och E4 med lektionsplåten vid köpraden
    // lektionsplåtarna bort med Esc tills ingen står kvar; öppnade ett Esc pausmenyn stängs den (Resume)
    const clearLessons = async () => {
      for (let i = 0; i < 8 && await ev('!!window.__horde.lesson'); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
      await ev(`(() => { const b = document.querySelector('.pausesheet [data-item="resume"] button'); if (b) b.click(); })()`);
      await page.waitForTimeout(200);
    };
    const checkHud = async scope => {
      await page.waitForTimeout(700);
      const r = await page.evaluate(auditHud, `${scope} @${W}`);
      errors = errors.concat(r.errors); checked++;
      if (!r.texts) errors.push(`${scope} @${W}: ingen text i HUD:en`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${scope}-${W}.png` });
    };
    await ev(`window.__horde.setProgress({ ...window.__horde.progress, lessons: undefined })`);
    await ev(`(async () => { const H = window.__horde; await H.jump('molnbo', 1); })()`);
    await checkHud('hud-molnbo-1-lesson');
    await clearLessons();
    // raden vid pekaren när Psg 90 är i handen (lessons.js mb-1.roofs) ska komma igen
    await ev(`(() => { const H = window.__horde, p = H.progress; H.setProgress({ ...p, lessons: { ...p.lessons, seen: (p.lessons?.seen ?? []).filter(id => id !== 'mb-1.roofs') } }); })()`);
    await ev(`window.__horde.startPlacing('psg90')`);
    await page.mouse.move(Math.round(W * 0.2), 190);
    await checkHud('hud-molnbo-1-psg90');
    await ev(`window.__horde.stopPlacing()`);
    await ev(`(async () => { const H = window.__horde; await H.jump('molnbo', 4); })()`);
    await clearLessons();
    await checkHud('hud-molnbo-4-build');
    // första trycket säger till om enheter i reserven, nästa startar vågen
    for (let i = 0; i < 4 && await ev('window.__horde.sim.phase') !== 'wave'; i++) { await clearLessons(); await ev('window.__horde.go()'); await page.waitForTimeout(300); }
    await page.waitForTimeout(2500);
    await clearLessons();
    if (await ev('window.__horde.sim.phase') !== 'wave') errors.push(`hud-molnbo-4-wave @${W}: vågen startade inte`);
    await checkHud('hud-molnbo-4-wave');
    await ev(`(async () => { const H = window.__horde; await H.jump('riksvagen', 2); })()`);
    await checkHud('hud-e4-2-lesson');
    if (pageErrors.length) errors.push(...pageErrors.map(e => `@${W} konsolfel: ${e}`));
    await page.close();
  }
  await browser.close();
  for (const e of errors) console.log(e);
  console.log(`${checked} skyltar i ${WIDTHS.length} bredder, ${errors.length} fel`);
  process.exit(errors.length ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(2); });
