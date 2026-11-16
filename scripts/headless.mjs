// Gemensam start av huvudlös Chromium för alla kontroller (0.22.2, H547). Utan detta drog en kontroll ~900 % CPU:
// 3D-scenen ritades i mjukvara (SwiftShader) med full prioritet. Här:
//  - låg prioritet: processen själv sätts i macOS bakgrundsläge (taskpolicy -b) och nice 19, och webbläsaren,
//    GPU-processen och renderarna ärver det (barn ärver policyn). HORDE_PRIO=normal stänger av.
//  - riktig GPU: --use-angle=metal i headless-skalet (Apple-GPU via ANGLE). HORDE_GPU=0 ger SwiftShader som förr.
//  - --mute-audio, och ?mute läggs på varje adress som öppnas.
//  - deviceScaleFactor 1 om inget annat anges.
//  - glesare ritning: ?fps=N (standard 2, HORDE_FPS) ritar 3D-scenen högst N gånger per sekund medan sidan bara
//    väntar; simuleringen och HUD:en går som vanligt. page.screenshot ritar en färsk bild först.
//  - egen profil per körning (0.26.2, H565): varje launch() får en egen mapp (mkdtemp) under
//    $TMPDIR/horde-headless/, webbläsarens profil och temp-filer hamnar där, och mappens pids.json säger vilken
//    node-process som äger den och vilka webbläsarprocesser som är dess. browser.close() och processens slut
//    stänger bara de egna processerna och tar bort mappen. Två agenter kan köra kontroller samtidigt.
//    Städa övergivna körningar (ägaren död):  node scripts/headless.mjs cleanup   (rör aldrig andras levande)
// Använd:  import { launch } from './headless.mjs';  const browser = await launch();
import { createRequire } from 'node:module';
import { homedir, setPriority, platform, tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const playwright = require(process.env.PW_PATH ?? homedir() + '/Projects/zombie-high-rise/node_modules/playwright');
export const { chromium } = playwright;

export const GPU = process.env.HORDE_GPU !== '0';
export const FPS = process.env.HORDE_FPS != null ? Number(process.env.HORDE_FPS) : 2;
export const GPU_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];

let lowered = false;
export function lowPriority() {
  if (lowered || process.env.HORDE_PRIO === 'normal') return;
  lowered = true;
  try { setPriority(19); } catch {}
  if (platform() === 'darwin') { try { execFileSync('/usr/sbin/taskpolicy', ['-b', '-p', String(process.pid)], { stdio: 'ignore' }); } catch {} }
}

// ?mute (och ?fps=N om fps > 0) på en adress; befintliga parametrar och #-delen behålls
export function withParams(url, { fps = FPS } = {}) {
  if (!/^https?:/.test(url)) return url;
  const u = new URL(url), add = [];
  if (!u.searchParams.has('mute')) add.push('mute');
  if (fps > 0 && !u.searchParams.has('fps')) add.push('fps=' + fps);
  if (!add.length) return url;
  const [base, hash] = url.split(/(?=#)/);
  return base + (base.includes('?') ? (/[?&]$/.test(base) ? '' : '&') : '?') + add.join('&') + (hash ?? '');
}

function patchPage(page, fps) {
  if (page.__hordePatched) return page;
  page.__hordePatched = true;
  const goto = page.goto.bind(page);
  page.goto = (url, o) => goto(withParams(url, { fps }), o);
  const shot = page.screenshot.bind(page);
  // en färsk bild av scenen före varje skärmbild (scenen ritas annars bara fps gånger per sekund)
  page.screenshot = async o => { await page.evaluate(() => Promise.race([window.__horde?.renderNow?.(), new Promise(r => setTimeout(r, 3000))])).catch(() => {}); return shot(o); };
  return page;
}
function patchContext(ctx, fps) {
  const newPage = ctx.newPage.bind(ctx);
  ctx.newPage = async () => patchPage(await newPage(), fps);
  ctx.on('page', p => patchPage(p, fps));
  return ctx;
}

// ---------- egna processer (H565) ----------
export const RUNS_DIR = join(tmpdir(), 'horde-headless');
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// processerna vars kommandorad nämner mappen (webbläsaren har --user-data-dir i den) och alla deras barn
export function processesOf(dir) {
  let ps = '';
  try { ps = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch { return []; }
  const rows = ps.split('\n').map(l => l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean).map(m => ({ pid: +m[1], ppid: +m[2], cmd: m[3] }));
  const own = new Set(rows.filter(r => r.cmd.includes(dir) && r.pid !== process.pid).map(r => r.pid));
  for (let grew = true; grew;) { grew = false; for (const r of rows) if (own.has(r.ppid) && !own.has(r.pid)) { own.add(r.pid); grew = true; } }
  return [...own];
}
function killList(pids) { for (const pid of pids) { try { process.kill(pid, 'SIGKILL'); } catch { /* redan borta */ } } }
// stänger mappens processer (de som står i pids.json och de som nämner mappen) och tar bort mappen
export function cleanupRun(dir) {
  // bara processer som fortfarande nämner mappen (eller är deras barn): en gammal PID ur pids.json kan ha
  // återanvänts av något annat och dödas aldrig på nummer
  killList(processesOf(dir));
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* låst fil */ }
}
// övergivna körningar: mappar vars ägare (node-processen i pids.json) inte lever
export function cleanupOrphans() {
  let n = 0;
  let names = [];
  try { names = readdirSync(RUNS_DIR); } catch { return 0; }
  for (const name of names) {
    const dir = join(RUNS_DIR, name);
    let owner = null;
    try { owner = JSON.parse(readFileSync(join(dir, 'pids.json'), 'utf8')).owner; } catch { /* inte färdigstartad */ }
    if (owner != null && alive(owner)) continue;
    if (owner == null && processesOf(dir).length) continue;   // startar just nu
    cleanupRun(dir); n++;
  }
  return n;
}

// launch({ args, fps, gpu, ...playwrightOptions }); fps: 0 = rita varje bildruta (laddtidsmätningen)
export async function launch({ args = [], fps = FPS, gpu = GPU, ...opts } = {}) {
  lowPriority();
  const all = ['--mute-audio', ...(gpu ? GPU_ARGS : []), ...args];
  mkdirSync(RUNS_DIR, { recursive: true });
  const runDir = mkdtempSync(join(RUNS_DIR, 'run-'));
  // playwright lägger profilen (playwright_chromiumdev_profile-*) i os.tmpdir(): den pekar på körningens mapp medan
  // webbläsaren startar, och webbläsarens egna temp-filer hamnar där också
  const prevTmp = process.env.TMPDIR;
  process.env.TMPDIR = runDir;
  let browser;
  try { browser = await chromium.launch({ headless: true, ...opts, env: { ...process.env, ...(opts.env ?? {}), TMPDIR: runDir }, args: [...new Set(all)] }); }
  catch (e) { cleanupRun(runDir); throw e; }
  finally { if (prevTmp == null) delete process.env.TMPDIR; else process.env.TMPDIR = prevTmp; }
  writeFileSync(join(runDir, 'pids.json'), JSON.stringify({ owner: process.pid, pids: processesOf(runDir), started: new Date().toISOString() }));
  browser.runDir = runDir;
  let cleaned = false;
  const cleanup = () => { if (cleaned) return; cleaned = true; cleanupRun(runDir); };
  process.once('exit', cleanup);
  // Ctrl-C och kill: exit-händelsen körs bara om processen avslutas med process.exit
  for (const sig of ['SIGINT', 'SIGTERM']) if (!process.listenerCount(sig)) process.once(sig, () => process.exit(sig === 'SIGINT' ? 130 : 143));
  const close = browser.close.bind(browser);
  browser.close = async (...a) => { try { await close(...a); } finally { cleanup(); process.removeListener('exit', cleanup); } };
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (o = {}) => patchContext(await newContext({ deviceScaleFactor: 1, ...o }), fps);
  browser.newPage = async (o = {}) => {
    const ctx = await browser.newContext(o);
    const page = await ctx.newPage();
    page.close = (orig => async (...a) => { await orig(...a); await ctx.close(); })(page.close.bind(page));
    return page;
  };
  return browser;
}

// Vilken grafik sidan fick (för rapporter): 'ANGLE (Apple, ANGLE Metal Renderer ...)' eller SwiftShader
export const rendererName = page => page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return 'ingen webgl2';
  const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
});

// node scripts/headless.mjs cleanup: städa övergivna körningar (bara de vars ägare är död)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === 'cleanup') {
  console.log('städade', cleanupOrphans(), 'övergivna körningar i', RUNS_DIR);
}
