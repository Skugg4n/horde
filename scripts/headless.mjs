// Gemensam start av huvudlös Chromium för alla kontroller (0.22.2, H547). Utan detta drog en kontroll ~900 % CPU:
// 3D-scenen ritades i mjukvara (SwiftShader) med full prioritet. Här:
//  - låg prioritet: processen själv sätts i macOS bakgrundsläge (taskpolicy -b) och nice 19, och webbläsaren,
//    GPU-processen och renderarna ärver det (barn ärver policyn). HORDE_PRIO=normal stänger av.
//  - riktig GPU: --use-angle=metal i headless-skalet (Apple-GPU via ANGLE). HORDE_GPU=0 ger SwiftShader som förr.
//  - --mute-audio, och ?mute läggs på varje adress som öppnas.
//  - deviceScaleFactor 1 om inget annat anges.
//  - glesare ritning: ?fps=N (standard 2, HORDE_FPS) ritar 3D-scenen högst N gånger per sekund medan sidan bara
//    väntar; simuleringen och HUD:en går som vanligt. page.screenshot ritar en färsk bild först.
// Använd:  import { launch } from './headless.mjs';  const browser = await launch();
import { createRequire } from 'node:module';
import { homedir, setPriority, platform } from 'node:os';
import { execFileSync } from 'node:child_process';

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

// launch({ args, fps, gpu, ...playwrightOptions }); fps: 0 = rita varje bildruta (laddtidsmätningen)
export async function launch({ args = [], fps = FPS, gpu = GPU, ...opts } = {}) {
  lowPriority();
  const all = ['--mute-audio', ...(gpu ? GPU_ARGS : []), ...args];
  const browser = await chromium.launch({ headless: true, ...opts, args: [...new Set(all)] });
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
