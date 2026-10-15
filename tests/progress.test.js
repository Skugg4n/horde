import test from 'node:test';
import assert from 'node:assert/strict';
import { newProgress, startConfig, dayResult, buyResearch, canBuyResearch, migrateResearch, nextTier } from '../src/meta/progress.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { MAPS } from '../src/data/maps.js';
import { RESEARCH } from '../src/data/research.js';
const cost = (id, tier = 1) => RESEARCH.find(r => r.id === id).tiers[tier - 1].cost;

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
  assert.deepEqual(p.research, ['wireTough.1']);
  assert.equal(canBuyResearch(p, 'block').ok, true);
});
test('forskning i nivåer: nästa nivå kostar mer, sista nivån är slut', () => {
  let p = { ...newProgress(), intel: 1000 };
  p = buyResearch(p, 'wireTough');
  assert.equal(nextTier(p, 'wireTough').tier, 2);
  assert.ok(cost('wireTough', 2) > cost('wireTough', 1));
  p = buyResearch(p, 'wireTough');
  assert.deepEqual(p.research, ['wireTough.1', 'wireTough.2']);
  assert.equal(p.intel, 1000 - cost('wireTough', 1) - cost('wireTough', 2));
  assert.equal(nextTier(p, 'wireTough'), null);
  assert.equal(canBuyResearch(p, 'wireTough').reason, 'redan');
});
test('varje nod kostar mer per nivå', () => {
  for (const n of RESEARCH) for (let i = 1; i < n.tiers.length; i++) assert.ok(n.tiers[i].cost > n.tiers[i - 1].cost, `${n.id} nivå ${i + 1}`);
});
test('krav kan peka på en nivå i en annan nod', () => {
  let p = { ...newProgress(), intel: 1000 };
  p = buyResearch(p, 'grenade');
  p = buyResearch(p, 'grenade');
  assert.equal(canBuyResearch(p, 'grenade').reason, 'kräver');   // nivå III kräver M2 I
  p = buyResearch(p, 'm2');
  assert.equal(canBuyResearch(p, 'grenade').ok, true);
});
test('budget i nivåer ger mer pengar', () => {
  assert.equal(startConfig({ ...newProgress(), research: ['budget.1', 'budget.2'] }, 1).cash, 750);
});
test('gamla platta forsknings-id flyttas till nivå I', () => {
  assert.deepEqual(migrateResearch(['m2', 'm249Rate', 'wireTough', 'block', 'budget', 'slot4']),
    ['m2.1', 'm249Rate.1', 'wireTough.1', 'block.1', 'budget.1', 'slot4.1']);
  assert.deepEqual(migrateResearch(['m2.2']), ['m2.1', 'm2.2']);
  assert.deepEqual(migrateResearch(['m2', 'm2.1', 'okänd']), ['m2.1', 'okänd']);
  assert.deepEqual(migrateResearch(['slot4.3']), ['slot4.1']);
});
test('gammal sparfil läses in med nivåer och kan forska vidare', () => {
  const st = mem();
  st.setItem('horde.save', JSON.stringify({ v: 1, mapId: 'riksvagen', unlockedDay: 3, intel: 500, research: ['m2', 'm249Rate', 'wireTough', 'block'], attempts: { 1: 1, 2: 1 } }));
  const p = loadProgress(st);
  assert.deepEqual(p.research, ['m2.1', 'm249Rate.1', 'wireTough.1', 'block.1']);
  assert.equal(p.unlockedDay, 3);
  assert.equal(st.getItem('horde.save.broken'), null);
  assert.equal(nextTier(p, 'm249Rate').tier, 2);
  assert.deepEqual(buyResearch(p, 'm249Rate').research.slice(-1), ['m249Rate.2']);
  assert.equal(canBuyResearch(p, 'm2').ok, true);
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
test('sparfil med unlockedDay som inte är heltal räknas som trasig', () => {
  const st = mem();
  const raw = JSON.stringify({ ...newProgress(), unlockedDay: 1.5 });
  st.setItem('horde.save', raw);
  assert.deepEqual(loadProgress(st), newProgress());
  assert.equal(st.getItem('horde.save.broken'), raw);
  assert.equal(st.getItem('horde.save'), raw);
});
test('sparfil med försök som inte är heltal räknas som trasig', () => {
  for (const bad of [1.5, '2', -1, null]) {
    const st = mem();
    const raw = JSON.stringify({ ...newProgress(), attempts: { 1: 2, 2: bad } });
    st.setItem('horde.save', raw);
    assert.deepEqual(loadProgress(st), newProgress(), `attempts ${bad}`);
    assert.equal(st.getItem('horde.save.broken'), raw);
  }
});
test('giltiga heltal i försök läses in', () => {
  const st = mem();
  const p = { ...newProgress(), unlockedDay: 3, attempts: { 1: 0, 3: 4 } };
  saveProgress(p, st);
  assert.deepEqual(loadProgress(st), p);
});
test('startConfig ger null för en dag som inte finns, så att main.js måste vakta', () => {
  assert.equal(startConfig(newProgress(), 1.5), null);
  assert.ok(startConfig(newProgress(), 1));
});
