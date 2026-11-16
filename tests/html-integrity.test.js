import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { htmlProblems } from '../scripts/importmap.mjs';

// 0.25.2 (H535): index.html och varje förhandsvisning (alla .html i roten) har inga konfliktmarkörer och exakt en
// importmap; ljudbordet har inga moduler från src/ och därför ingen karta, men får inte heller ha markörer.
const ROOT = new URL('../', import.meta.url);
const pages = readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const NO_MAP = new Set(['soundboard.html']);

test('sidorna finns', () => assert.ok(pages.includes('index.html') && pages.length > 3));

for (const p of pages) test(`${p}: inga konfliktmarkörer, ${NO_MAP.has(p) ? 'ingen' : 'exakt en'} importmap`, () => {
  const html = readFileSync(new URL(p, ROOT), 'utf8');
  assert.deepEqual(htmlProblems(html), []);
  assert.doesNotMatch(html, /^(<{7}|={7}|>{7})( |$)/m);
  const maps = (html.match(/<script type="importmap">/g) ?? []).length;
  assert.equal(maps, NO_MAP.has(p) ? 0 : 1);
  if (maps) JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
});

test('importmap.mjs känner igen markörer och dubbla kartor', () => {
  assert.equal(htmlProblems('<script type="importmap">{}</script>').length, 0);
  assert.equal(htmlProblems('a\n<<<<<<< HEAD\nb\n=======\nc\n>>>>>>> x\n').length, 1);
  assert.equal(htmlProblems('<script type="importmap">{}</script><script type="importmap">{}</script>').length, 1);
});
