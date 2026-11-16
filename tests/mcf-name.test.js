import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROM_NAME } from '../src/data/depot.js';
import { SENDERS } from '../src/data/table.js';

// 0.25.2 (H172): Myndigheten för civilt försvar (MCF) ersatte MSB 2026-01-01. Ingen text som spelaren ser säger MSB:
// ingen kodrad utanför kommentarerna i src/ och ingen rad i sidorna i roten.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const files = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? files(p) : n.endsWith('.js') ? [p] : []; });

test('avsändaren heter MCF och Myndigheten för civilt försvar', () => {
  assert.equal(FROM_NAME.MCF, 'Myndigheten för civilt försvar');
  assert.equal(SENDERS.MCF, 'MCF');
});

test('ingen spelartext säger MSB', () => {
  const hits = [];
  for (const f of [...files(join(ROOT, 'src')), ...readdirSync(ROOT).filter(n => n.endsWith('.html')).map(n => join(ROOT, n))]) {
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      const code = l.replace(/^\s*(\/\/|\*|<!--).*$/, '').replace(/\s\/\/\s.*$/, '');
      if (/\bMSB\b/.test(code)) hits.push(`${f.slice(ROOT.length)}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, []);
});
