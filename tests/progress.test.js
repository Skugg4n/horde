import test from 'node:test';
import assert from 'node:assert/strict';
import { newProgress, startConfig, dayResult, buyResearch, canBuyResearch } from '../src/meta/progress.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';

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
  let p = { ...newProgress(), intel: 40 };
  assert.equal(canBuyResearch(p, 'block').reason, 'kräver');
  p = buyResearch(p, 'wireTough');
  assert.equal(p.intel, 28);
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
