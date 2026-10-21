// npm run check:all (0.22.2, H547): enhetstesterna och de huvudlösa kontrollerna en i taget, aldrig parallellt,
// mot en egen server (första lediga port från 8281, eller PORT=...). Kontrollerna startar webbläsaren via
// scripts/headless.mjs (låg prioritet, GPU). Avslutar med kod 1 om någon kontroll fallerar.
//   npm run check:all [-- layout slice1]     (bara de namngivna)
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { lowPriority } from './headless.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHECKS = {
  test: () => ['node', ['--test', 'tests/*.test.js']],
  layout: port => ['node', ['scripts/layout-check.mjs', '--port', port]],
  placement: port => ['node', ['scripts/placement-harness.mjs', '--port', port]],
  slice1: port => ['node', ['scripts/slice1-check.mjs', '--port', port]],
};
const want = process.argv.slice(2).filter(a => CHECKS[a]);
const names = want.length ? want : Object.keys(CHECKS);

const free = p => new Promise(r => { const s = createServer().once('error', () => r(false)).listen(p, '127.0.0.1', () => s.close(() => r(true))); });
let port = process.env.PORT ? Number(process.env.PORT) : 8281;
if (!process.env.PORT) { while (port === 8143 || !(await free(port))) port++; }

lowPriority();   // servern och kontrollerna ärver låg prioritet
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143));
for (let i = 0; i < 50; i++) { if (!(await free(port))) break; await new Promise(r => setTimeout(r, 100)); }

const results = [];
for (const name of names) {
  const [cmd, args] = CHECKS[name](String(port));
  const t0 = Date.now();
  console.log(`\n== ${name} (${[cmd, ...args].join(' ')})`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  results.push({ name, ok: r.status === 0, s: Math.round((Date.now() - t0) / 1000) });
}
stop();
console.log('\n' + results.map(r => `${r.ok ? 'ok  ' : 'FEL '} ${r.name} (${r.s} s)`).join('\n'));
process.exit(results.every(r => r.ok) ? 0 : 1);
