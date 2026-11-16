// Kontroll efter publicering (0.25.2, H535): hämtar den publicerade sidan och kräver att src/version.js säger samma
// version som package.json, att index.html har exakt en importmap och inga konfliktmarkörer, och att huvudmodulen
// laddas med samma ?v=VERSION. GitHub Pages kan ta någon minut på sig; --wait N försöker igen i N sekunder.
//
//   node scripts/check-live.mjs [--url https://skugg4n.github.io/horde/] [--wait 180]
import { readFileSync } from 'node:fs';
import { htmlProblems } from './importmap.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('url', 'https://skugg4n.github.io/horde/').replace(/\/?$/, '/');
const WAIT = Number(arg('wait', 0));
const want = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

async function get(path) {
  const r = await fetch(BASE + path + '?nocache=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.text();
}
async function check() {
  const errors = [];
  const ver = (await get('src/version.js')).match(/VERSION\s*=\s*'([^']+)'/)?.[1];
  if (ver !== want) errors.push(`src/version.js säger ${ver ?? '(ingen version)'}, package.json ${want}`);
  const html = await get('index.html');
  errors.push(...htmlProblems(html).map(e => 'index.html: ' + e));
  const maps = (html.match(/<script type="importmap">/g) ?? []).length;
  if (maps !== 1) errors.push(`index.html: ${maps} importmaps`);
  if (!html.includes(`src="src/main.js?v=${want}"`)) errors.push(`index.html: huvudmodulen har inte ?v=${want}`);
  return errors;
}

const until = Date.now() + WAIT * 1000;
for (;;) {
  let errors;
  try { errors = await check(); } catch (e) { errors = [e.message]; }
  if (!errors.length) { console.log(`${BASE}: ${want}, en importmap, inga markörer`); process.exit(0); }
  if (Date.now() >= until) { for (const e of errors) console.error(e); process.exit(1); }
  await new Promise(r => setTimeout(r, 15000));
}
