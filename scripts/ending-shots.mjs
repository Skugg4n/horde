// 0.27.0: bilder av v1:s slutscen för Ola (docs/slutscen/): trådarna mitt i, slutläget med stämpeln och slutbladet,
// och menyn efteråt. Huvudlöst (scripts/headless.mjs), ljudet av.
//   node scripts/ending-shots.mjs [--port 8146] [--out docs/slutscen] [--w 1440 --h 900]
// Kräver en server som serverar repot (python3 -m http.server 8146).
import { launch } from './headless.mjs';
import { mkdirSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = arg('port', '8146'), OUT = arg('out', 'docs/slutscen'), W = Number(arg('w', 1440)), H = Number(arg('h', 900));
mkdirSync(OUT, { recursive: true });
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* ingen lagring */ } });
  await page.goto(`http://localhost:${PORT}/?mute&debug&test`);
  await page.waitForFunction(() => window.__hordeReady && window.__horde?.jump && window.__horde.mode === 'menu', null, { timeout: 90000 });
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const H = window.__horde, O = await import('/src/meta/operation.js'), T = await import('/src/meta/table.js'), L = await import('/src/data/lessons.js');
    let p = O.debugReach(O.newCampaign(), 'vasterkarv', 1);
    p = O.finishDay(p, { mapId: 'vasterkarv', day: 1, won: true, intelEarned: 10, report: { units: [] } }).progress;
    p = T.finishCampaign(p);
    p = { ...p, lessons: { ...p.lessons, seen: [...Object.values(L.LESSONS).flat().map(l => l.id), ...Object.keys(L.ENEMIES).map(t => 'enemy:' + t)] } };
    H.setHub('table'); H.setProgress(p); H.showEnding();
  });
  await page.waitForFunction(() => !!document.querySelector('#hub .tb-map'), null, { timeout: 15000 });
  await page.mouse.move(2, 200);
  const shot = async (t, name) => { await page.evaluate(s => window.__horde.endingSeek(s), t); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${name}` }); };
  await shot(7.5, '1-tradarna.png');
  await shot(17.1, '2-stampeln.png');
  await page.evaluate(() => window.__horde.sheet?.skipEnding?.()); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/3-slutbladet.png` });
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/4-menyn.png` });
  console.log(errs.length ? errs.join('\n') : 'inga konsolfel');
} finally { await browser.close(); }
