import test from 'node:test';
import assert from 'node:assert/strict';
import { newProgress, startConfig, dayResult, buyResearch, canBuyResearch } from '../src/meta/progress.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { MAPS } from '../src/data/maps.js';
import { RESEARCH } from '../src/data/research.js';
const cost = id => RESEARCH.find(r => r.id === id).cost;

const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), _m: m }; };

test('förlust behåller forskning, låser inte upp', () => {
  const p = dayResult(newProgress(), { day: 1, won: false, intelEarned: 7 });
  assert.equal(p.intel, 7);
  assert.equal(p.unlockedDay, 1);
  assert.equal(p.attempts[1], 1);
});
test('vinst låser upp nästa dag', () => {
  assert.equal(dayResult(newProgress(), { day: 1, won: true, intelEarned: 10 }).unlockedDay, 2);
});
test('köpa forskning drar poäng och kräver förutsättning', () => {
  let p = { ...newProgress(), intel: 200 };
  assert.equal(canBuyResearch(p, 'block').reason, 'kräver');
  p = buyResearch(p, 'wireTough');
  assert.equal(p.intel, 200 - cost('wireTough'));
  assert.equal(canBuyResearch(p, 'wireTough').reason, 'redan');
  assert.equal(canBuyResearch(p, 'block').ok, true);
});
test('större budget ger mer startpengar', () => {
  const p = { ...newProgress(), research: ['budget'] };
  assert.equal(startConfig(p, 1).cash, 650);
});
test('spara och läsa', () => {
  const st = mem();
  const p = { ...newProgress(), intel: 5 };
  saveProgress(p, st);
  assert.deepEqual(loadProgress(st), p);
});
test('trasig sparfil raderas inte', () => {
  const st = mem();
  st.setItem('horde.save', '{trasig');
  const p = loadProgress(st);
  assert.equal(p.intel, 0);
  assert.equal(st.getItem('horde.save.broken'), '{trasig');
});
test('okänd dag ger null i stället för fel', () => {
  assert.equal(startConfig(newProgress(), MAPS.riksvagen.days.length + 1), null);
  assert.equal(startConfig(newProgress(), 0), null);
});
test('ogiltig form på v:1-sparfil behandlas som trasig', () => {
  const st = mem();
  const raw = JSON.stringify({ v: 1, research: 'x' });
  st.setItem('horde.save', raw);
  assert.deepEqual(loadProgress(st), newProgress());
  assert.equal(st.getItem('horde.save.broken'), raw);
  assert.equal(st.getItem('horde.save'), raw);
});
test('samma trasiga sparfil kopieras bara en gång', () => {
  const st = mem();
  st.setItem('horde.save', '{trasig');
  loadProgress(st);
  loadProgress(st);
  assert.deepEqual([...st._m.keys()].filter(k => k.startsWith('horde.save.broken')), ['horde.save.broken']);
});
test('skrivfel ger false utan att kasta', () => {
  const st = { getItem: () => null, setItem: () => { throw new Error('full'); } };
  assert.equal(saveProgress(newProgress(), st), false);
});
test('läsfel ger nytt spel utan att kasta', () => {
  const st = { getItem: () => { throw new Error('denied'); }, setItem() {} };
  assert.deepEqual(loadProgress(st), newProgress());
});
test('utan tillgänglig lagring används minne och spara lyckas', () => {
  const p = { ...newProgress(), intel: 3 };
  assert.equal(saveProgress(p), true);
  assert.equal(loadProgress().intel, 3);
});
test('extra fält i sparfilen (seenHint) följer med', () => {
  const st = mem();
  const p = { ...newProgress(), seenHint: true };
  saveProgress(p, st);
  assert.equal(loadProgress(st).seenHint, true);
  assert.equal(st.getItem('horde.save.broken'), null);
});
