// Versionerade moduladresser utan byggsteg (0.10.1, granskningen av 0.10, Must fix 3).
// GitHub Pages cachar varje fil i tio minuter. Efter en publicering kan en spelare få nya main.js och
// gamla sim.js ur cachen, och då saknas en export: svart sida. Import-kartan i index.html pekar varje
// modul i src/ på samma adress med ?v=VERSION, så att hela modulgrafen hämtas om när versionen byts
// (relativa importer inne i modulerna går också genom kartan). Huvudfilen laddas som
// src/main.js?v=VERSION. Kör `node scripts/importmap.mjs` efter versionsbytet och när en modul
// läggs till; tests/importmap.test.js säger till om index.html inte stämmer.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../src/version.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const THREE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function moduleFiles(dir = join(ROOT, 'src')) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...moduleFiles(p));
    else if (name.endsWith('.js')) out.push('./' + relative(ROOT, p).split('\\').join('/'));
  }
  return out;
}

export function importMap(version = VERSION) {
  const imports = { three: THREE };
  for (const f of moduleFiles()) imports[f] = `${f}?v=${version}`;
  return { imports };
}

// Laddningsmätaren (0.20.0, H502) räknar hämtade filer mot hur många sidan faktiskt laddar: modulerna som nås
// från startfilerna genom statiska importer (inte allt i src/), plus three om någon av dem tar den.
export function reachable(entries) {
  const seen = new Set(); let three = false;
  const visit = f => {
    if (seen.has(f)) return; seen.add(f);
    for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(/^\s*import\s[^'"]*?['"]([^'"]+)['"]/gm)) {
      if (m[1] === 'three') { three = true; continue; }
      if (m[1].startsWith('.')) visit(relative(ROOT, join(dirname(join(ROOT, f)), m[1])).split('\\').join('/'));
    }
  };
  for (const e of entries) visit(e);
  return seen.size + (three ? 1 : 0);
}
// Sidans egna importer i det inbäddade modulskriptet (förhandsvisningarna): filerna de pekar på.
export function inlineImports(html) {
  const mod = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  return mod ? [...mod[1].matchAll(/^import\s[^'"]*?['"]\.\/([^'"]+)['"]/gm)].map(m => m[1]) : [];
}
export const PREVIEWS = ['bjornlunda.html', 'gnesta-centrum.html', 'laxne.html'];
const MODS = /(<script src="loadbar\.js[^"]*"[^>]*?) data-modules="\d+"/;
export function renderPreview(html) {
  const imports = inlineImports(html), n = reachable(imports) + (/from 'three'/.test(html) && !imports.length ? 1 : 0);
  return html.replace(MODS, `$1 data-modules="${n}"`);
}
const BLOCK = /<script type="importmap">[\s\S]*?<\/script>/;
const MAIN = /<script type="module" src="src\/main\.js(\?v=[^"]*)?"><\/script>/;
// laddningsmätaren (0.20.0): ett vanligt skript utanför src, samma ?v=VERSION
const LOADBAR = /src="loadbar\.js(\?v=[^"]*)?"/;
export function render(html, version = VERSION) {
  const json = JSON.stringify(importMap(version), null, 1).replace(/\n\s*/g, ' ');
  return html.replace(BLOCK, `<script type="importmap">${json}</script>`)
    .replace(MAIN, `<script type="module" src="src/main.js?v=${version}"></script>`)
    .replace(LOADBAR, `src="loadbar.js?v=${version}"`)
    .replace(MODS, `$1 data-modules="${reachable(['src/main.js']) + 1}"`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = join(ROOT, 'index.html');
  const before = readFileSync(file, 'utf8'), after = render(before);
  if (after !== before) writeFileSync(file, after);
  console.log(after === before ? 'index.html stämmer' : `index.html: ${moduleFiles().length} moduler med ?v=${VERSION}`);
  for (const p of PREVIEWS) { const f = join(ROOT, p), b = readFileSync(f, 'utf8'), a = renderPreview(b); if (a !== b) { writeFileSync(f, a); console.log(`${p}: laddningsmätarens filantal`); } }
}
