// 0.20.0 (riktningarna, H496): kartornas ingångar följer kampanjbågen (docs/superpowers/specs/2026-10-18-kampanjplan.md
// avsnitt 10), och dagens intro säger varifrån de kommer.
//   E4 Lästringe   gruppen går norrut längs E4 från Nyköping; Södertälje är dag 2:s överraskning
//   Ishallen       fiender närmar sig östra Gnesta: alla ingångar ligger österut
//   Vikingavägen   större grupper samlar sig mot ishallen: väst, syd och nord, ingen österifrån
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { compass } from '../src/meta/intel.js';

const used = m => [...new Set(m.days.flatMap(d => d.waves.flatMap(w => w.groups.map(g => g.spawn))))];
const dirs = m => used(m).map(id => compass(m, id));
const words = t => t.split(/\s+/).filter(Boolean).length;
const DIR = /\b(north|south|east|west|north-east|south-east|south-west|north-west|Nyköping|Södertälje)\b/i;

test('E4: huvudgruppen kommer från Nyköping (sydväst, norrut längs E4), Södertälje först dag 2', () => {
  const m = MAPS.riksvagen;
  assert.deepEqual(m.days[0].waves.flatMap(w => w.groups.map(g => g.spawn)).filter((x, i, a) => a.indexOf(x) === i), ['nykoping']);
  assert.equal(compass(m, 'nykoping'), 'south-west');
  assert.ok(used(m).includes('sodertalje') && m.spawns.find(s => s.id === 'sodertalje').day === 2);
  assert.match(m.days[0].intro.text, /north/i);
  assert.match(m.days[0].intro.text, /224/);
  assert.match(m.outro.text, /224/);
  assert.match(m.outro.text, /eastern Gnesta/);
});

test('Ishallen: alla ingångar ligger österut från ishallen', () => {
  for (const d of dirs(MAPS.gnesta)) assert.match(d, /east/, d);
});

test('Vikingavägen: väst, syd och nord, ingen ingång österifrån', () => {
  const m = MAPS['gnesta-norr'], ds = dirs(m);
  for (const d of ds) assert.doesNotMatch(d, /east$/, `${d} (${ds})`);
  for (const want of ['west', 'south', 'north']) assert.ok(ds.some(d => d === want || d.startsWith(want + '-')), `${want} saknas: ${ds}`);
  // varje ingång i kartan används (ingen österingång står kvar och syns)
  assert.deepEqual(m.spawns.map(s => s.id).sort(), used(m).sort());
  // slutet: Järna har fallit, Mölnbo står på tur (inte "sista vägen norrut")
  assert.match(m.outro.text, /Järna/);
  assert.match(m.outro.text, /Mölnbo is next/);
  assert.doesNotMatch(m.outro.text, /last way north/);
});

test('dagens intro: högst 12 ord och säger varifrån de kommer (E4, Ishallen, Vikingavägen)', () => {
  for (const id of ['riksvagen', 'gnesta', 'gnesta-norr']) for (const d of MAPS[id].days) {
    assert.ok(words(d.intro.text) <= 12, `${id} ${d.n}: ${d.intro.text}`);
    assert.match(d.intro.text, DIR, `${id} ${d.n}: ${d.intro.text}`);
  }
});
