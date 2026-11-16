// En sak i taget (0.26.2, H604; helspeltestet: Mölnbo dag 9 drog tåget kameran till perrongen medan basen föll, samtidigt
// kom krypar-kortet, "Base under attack" och farten gick till 1X). Mölnbo dag 2 huvudlöst, med fart 3:
//   1 tåget signalerar medan basen tar skada: kameran står still, farten är kvar på 3, inget fiendekort
//   2 basen får lugn i 5 s: kameran glider till perrongen, en gång (en flyttad kamera dras inte tillbaka)
//   3 fiendekortet kommer först när basen haft lugn och ingen stor banderoll står
//   node scripts/one-thing-check.mjs [--port 8461]
import { launch } from './headless.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = arg('port', '8461');
const browser = await launch({ fps: 4 });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.addInitScript(() => { try { localStorage.clear(); } catch { /* ingen lagring */ } });
await page.goto(`http://127.0.0.1:${PORT}/?debug&test`);
await page.waitForFunction(() => window.__hordeReady && window.__horde?.quickJump, null, { timeout: 60000 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = [];
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FEL  ') + msg); if (!c) fails.push(msg); };

await page.evaluate(async () => {
  const H = window.__horde;
  H.setProgress({ ...H.progress, lessons: { ...H.progress.lessons, mode: 'off' } });
  await H.quickJump('molnbo', 2);
  // lektionerna sedda utom krypar-kortet, läget 'new' (fiendekorten visas)
  const L = await import('./src/data/lessons.js');
  const ids = [...Object.values(L.LESSONS).flat().map(l => l.id), ...L.TIPS.map(t => t.id), ...Object.keys(L.ENEMIES).map(t => 'enemy:' + t)].filter(id => id !== 'enemy:crawler');
  H.setProgress({ ...H.progress, lessons: { ...H.progress.lessons, mode: 'new', seen: ids } });
  H.setSpeed(3);
  // fram förbi dagens riktiga tågsignal (provet ger sin egen) och till en levande krypare
  let until = null;
  for (let i = 0; i < 1600; i++) {
    if (H.platform && until == null) until = H.platform.untilSim;
    if (until != null && H.sim.time > until + 20 && H.sim.zombies.some(z => !z.dead && z.type === 'crawler')) break;
    H.advance(0.5);
  }
});
const crawler = await page.evaluate(() => window.__horde.sim.zombies.some(z => !z.dead && z.type === 'crawler'));
ok(crawler, 'en krypare finns i vågen');

// 1: basen tar skada var sekund, tåget signalerar mitt i
await page.waitForFunction(() => !window.__horde.rig.touring, null, { timeout: 10000 }).catch(() => {});
const before = await page.evaluate(() => { const H = window.__horde; H.setSpeed(3); return { x: H.rig.target.x, z: H.rig.target.z }; });
const hit = () => page.evaluate(() => { const H = window.__horde, z = H.sim.zombies.find(q => !q.dead); H.debugEvents([{ t: 'breach', id: z?.id ?? 0 }]); });
await hit();
await page.evaluate(() => window.__horde.trainWarned({ t: 'trainWarn', in: 200 }));
let moved = false, card = false, speedOk = true;
for (let i = 0; i < 8; i++) {
  await sleep(500);
  if (i % 2 === 0) await hit();
  const s = await page.evaluate(([bx, bz]) => { const H = window.__horde; return { moved: H.rig.touring || Math.hypot(H.rig.target.x - bx, H.rig.target.z - bz) > 0.5, card: H.lesson === 'enemy:crawler', speed: H.playSpeed }; }, [before.x, before.z]);
  moved ||= s.moved; card ||= s.card; if (s.speed !== 3) speedOk = false;
}
ok(!moved, 'kameran står still medan basen tar skada');
ok(!card, 'inget fiendekort medan basen tar skada');
ok(speedOk, 'farten är kvar på 3X när tåget signalerar');

// 2: lugn i 5 s, kameran glider till perrongen en gång
let tourAt = null;
for (let i = 0; i < 50 && tourAt == null; i++) {
  await sleep(500);
  const s = await page.evaluate(([bx, bz]) => { const H = window.__horde; return H.rig.touring || Math.hypot(H.rig.target.x - bx, H.rig.target.z - bz) > 0.5; }, [before.x, before.z]);
  if (s) tourAt = (i + 1) * 0.5;
}
ok(tourAt != null && tourAt >= 4, `kameran gled till perrongen efter lugnet (${tourAt} s efter sista träffen)`);
await page.waitForFunction(() => !window.__horde.rig.touring, null, { timeout: 15000 }).catch(() => {});
const away = await page.evaluate(() => { const H = window.__horde; H.rig.focus(H.rig.target.x + 40, H.rig.target.z); return { x: H.rig.target.x, z: H.rig.target.z }; });
await sleep(5000);
const stay = await page.evaluate(([x, z]) => { const H = window.__horde; return !H.rig.touring && Math.hypot(H.rig.target.x - x, H.rig.target.z - z) < 0.5; }, [away.x, away.z]);
ok(stay, 'kameran flyttas bara en gång per signal');
ok(await page.evaluate(() => window.__horde.playSpeed === 3), 'farten fortfarande 3X');

// 3: fiendekortet när basen haft lugn och banderollerna gått (tågets står 11 s)
let cardAt = null;
for (let i = 0; i < 30 && cardAt == null; i++) {
  await sleep(500);
  const s = await page.evaluate(() => ({ card: window.__horde.lesson === 'enemy:crawler', big: !!document.querySelector('#notes .note.big') }));
  if (s.card) { cardAt = i; ok(!s.big, 'ingen stor banderoll när kortet kommer'); }
}
ok(cardAt != null, 'krypar-kortet kom när det var lugnt');
ok(!errors.length, 'inga fel i sidan ' + errors.slice(0, 2).join(' | '));
await browser.close();
console.log(fails.length ? `${fails.length} FEL` : 'allt ok');
process.exit(fails.length ? 1 : 0);
