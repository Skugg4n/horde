import test from 'node:test';
import assert from 'node:assert/strict';
import { newProgress, startConfig, dayResult, mapState, mapUnlocked, selectMap, SAVE_VERSION } from '../src/meta/progress.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { MAPS } from '../src/data/maps.js';

// Gnesta Norr (0.10.0): tredje banan, upplåst när Gnesta dag 5 är klar. Sparfilen behåller sitt
// format (v3): en sparfil från 0.9.0 läses som den är, och banans framsteg läggs till under maps
// första gången den spelas. Inget raderas och inget skrivs över vid läsning.
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m }; };

test('menyn har tre banor i ordning: E4, Gnesta, Gnesta Norr med fem dagar', () => {
  assert.deepEqual(Object.values(MAPS).map(m => m.name), ['E4', 'Gnesta', 'Gnesta Norr']);
  assert.equal(MAPS['gnesta-norr'].days.length, 5);
  for (const d of MAPS['gnesta-norr'].days) {
    assert.match(d.intro.title, /^Day \d: /);
    assert.ok(d.intro.text.length > 40);
    assert.doesNotMatch(d.intro.text + d.intro.title, /\u2014/, 'inget tankstreck');
  }
});

test('Gnesta Norr låses upp när Gnesta dag 5 är klar, eller med debug', () => {
  let p = newProgress();
  assert.equal(mapUnlocked(p, 'gnesta-norr'), false);
  assert.equal(mapUnlocked(p, 'gnesta-norr', { debug: true }), true);
  p = selectMap(p, 'gnesta');
  for (const day of [1, 2, 3, 4]) p = dayResult(p, { day, won: true, intelEarned: 0 });
  assert.equal(mapUnlocked(p, 'gnesta-norr'), false, 'dag 4 räcker inte');
  p = dayResult(p, { day: 5, won: false, intelEarned: 0 });
  assert.equal(mapUnlocked(p, 'gnesta-norr'), false, 'en förlorad dag 5 räcker inte');
  p = dayResult(p, { day: 5, won: true, intelEarned: 0 });
  assert.equal(mapUnlocked(p, 'gnesta-norr'), true);
});

test('framsteget på Gnesta Norr räknas för sig, forskningen delas', () => {
  let p = { ...newProgress(), research: ['budget.1', 'hvRifles.1'] };
  p = selectMap(p, 'gnesta-norr');
  assert.equal(mapState(p).unlockedDay, 1);
  const cfg = startConfig(p, 1);
  assert.equal(cfg.map.id, 'gnesta-norr');
  assert.equal(cfg.cash, MAPS['gnesta-norr'].days[0].startCash + 150);
  assert.ok(cfg.research.includes('hvRifles.1'));
  p = dayResult(p, { day: 1, won: true, intelEarned: 6 });
  assert.equal(mapState(p).unlockedDay, 2);
  assert.equal(mapState(p, 'gnesta').unlockedDay, 1, 'Gnesta orörd');
  assert.equal(startConfig(p, 6), null);
});

// En riktig sparfil från 0.9.0: E4 och Gnesta klara, forskning, tips sedda.
const save090 = () => ({ v: 3, mapId: 'gnesta', intel: 310, research: ['m2.1', 'm2.2', 'm2.3', 'wireTough.1', 'budget.1', 'block.1', 'psg90.1', 'positions.1'],
  maps: { riksvagen: { unlockedDay: 4, attempts: { 1: 1, 2: 1, 3: 3 } }, gnesta: { unlockedDay: 6, attempts: { 1: 1, 2: 2, 3: 1, 4: 2, 5: 4 } } },
  seenHints: ['riksvagen', 'gnesta'] });

test('sparfil från 0.9.0: läses som den är, Gnesta Norr öppen, inget raderas eller skrivs över', () => {
  assert.equal(SAVE_VERSION, 3, 'formatet är oförändrat');
  const st = mem(), raw = JSON.stringify(save090());
  st.setItem('horde.save', raw);
  const p = loadProgress(st);
  assert.equal(st.getItem('horde.save'), raw, 'läsningen skriver inte över sparfilen');
  assert.equal(st.getItem('horde.save.broken'), null);
  assert.deepEqual(p.maps.riksvagen, save090().maps.riksvagen);
  assert.deepEqual(p.maps.gnesta, save090().maps.gnesta);
  assert.deepEqual(p.research, save090().research);
  assert.equal(p.intel, 310);
  assert.deepEqual(p.seenHints, ['riksvagen', 'gnesta']);
  assert.equal(p.maps['gnesta-norr'], undefined, 'den nya banan finns inte i filen förrän den spelas');
  assert.equal(mapUnlocked(p, 'gnesta-norr'), true, 'Gnesta dag 5 var klar i 0.9.0');
  // spela Gnesta Norr dag 1, spara, läs tillbaka: allt det gamla är kvar
  let q = selectMap(p, 'gnesta-norr');
  q = dayResult(q, { day: 1, won: true, intelEarned: 6 });
  assert.equal(saveProgress(q, st), true);
  const back = loadProgress(st);
  assert.deepEqual(back, q);
  assert.deepEqual(back.maps.gnesta, save090().maps.gnesta);
  assert.deepEqual(back.maps['gnesta-norr'], { unlockedDay: 2, attempts: { 1: 1 } });
  assert.equal(st.getItem('horde.save.broken'), null);
});

test('sparfil från 0.9.0 där Gnesta inte är klar: Gnesta Norr låst, inget annat ändras', () => {
  const st = mem(), s = save090();
  s.maps.gnesta.unlockedDay = 3;
  st.setItem('horde.save', JSON.stringify(s));
  const p = loadProgress(st);
  assert.equal(mapUnlocked(p, 'gnesta-norr'), false);
  assert.deepEqual(p.maps.gnesta, s.maps.gnesta);
});

test('sparfil där Gnesta Norr är vald men inte upplåst (debug förut): läses, inget raderas', () => {
  const st = mem(), s = { ...save090(), mapId: 'gnesta-norr' };
  s.maps.gnesta.unlockedDay = 2;
  s.maps['gnesta-norr'] = { unlockedDay: 3, attempts: { 1: 1, 2: 1 } };
  const raw = JSON.stringify(s);
  st.setItem('horde.save', raw);
  const p = loadProgress(st);
  assert.equal(p.mapId, 'gnesta-norr');
  assert.deepEqual(p.maps['gnesta-norr'], { unlockedDay: 3, attempts: { 1: 1, 2: 1 } });
  assert.equal(mapUnlocked(p, 'gnesta-norr'), false, 'main.js byter till E4 i menyn, framsteget ligger kvar');
  assert.deepEqual(selectMap(p, 'riksvagen').maps['gnesta-norr'], p.maps['gnesta-norr']);
  assert.equal(st.getItem('horde.save'), raw);
});
