import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from '../src/version.js';
import { render, moduleFiles } from '../scripts/importmap.mjs';

// index.html laddar hela modulgrafen med ?v=VERSION (scripts/importmap.mjs). Byts versionen eller
// läggs en modul till utan att kartan görs om, säger det här provet till.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('import-kartan i index.html är aktuell (kör node scripts/importmap.mjs)', () => {
  assert.equal(html, render(html));
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  for (const f of moduleFiles()) assert.equal(map.imports[f], `${f}?v=${VERSION}`, f);
  assert.match(html, new RegExp(`src="src/main\\.js\\?v=${VERSION.replace(/\./g, '\\.')}"`));
});

test('felvakten står före huvudmodulen och erbjuder omladdning', () => {
  const guard = html.indexOf('id="stale-guard"'), main = html.indexOf('src="src/main.js');
  assert.ok(guard > 0 && guard < main);
  assert.match(html, /A new version was loaded\./);
  assert.match(html, /unhandledrejection/);
});

test('laddningsmätaren väntar på rätt antal filer (kör node scripts/importmap.mjs)', async () => {
  const { PREVIEWS, renderPreview } = await import('../scripts/importmap.mjs');
  assert.match(html, /<script src="loadbar\.js\?v=[^"]+" data-name="Horde" data-modules="\d+"><\/script>/);
  for (const p of PREVIEWS) {
    const h = readFileSync(new URL('../' + p, import.meta.url), 'utf8');
    assert.equal(h, renderPreview(h), p);
    assert.ok(h.indexOf('loadbar.js') < h.indexOf('<script type="module">'), p + ': mätaren före modulerna');
  }
});
