import test from 'node:test';
import assert from 'node:assert/strict';
import { newProgress, startConfig, dayResult, abandonDay, buyResearch, canBuyResearch, migrateResearch, nextTier, mapState, mapUnlocked, selectMap, migrateV1 } from '../src/meta/progress.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { newCampaign } from '../src/meta/operation.js';
import { MAPS } from '../src/data/maps.js';
import { RESEARCH } from '../src/data/research.js';
const cost = (id, tier = 1) => RESEARCH.find(r => r.id === id).tiers[tier - 1].cost;

// En sparfil i det gamla formatet (före 0.4.0).
const v1 = (o = {}) => ({ v: 1, mapId: 'riksvagen', unlockedDay: 1, intel: 0, research: [], attempts: {}, ...o });
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), _m: m }; };

test('förlust behåller forskning, låser inte upp', () => {
  const p = dayResult(newProgress(), { day: 1, won: false, intelEarned: 7 });
  assert.equal(p.rp, 7);
  assert.equal(mapState(p).unlockedDay, 1);
  assert.equal(mapState(p).attempts[1], 1);
});
test('vinst låser upp nästa dag', () => {
  assert.equal(mapState(dayResult(newProgress(), { day: 1, won: true, intelEarned: 10 })).unlockedDay, 2);
});
test('köpa forskning drar poäng och kräver förutsättning', () => {
  let p = { ...newProgress(), rp: 200 };
  assert.equal(canBuyResearch(p, 'block').reason, 'kräver');
  p = buyResearch(p, 'wireTough');
  assert.equal(p.rp, 200 - cost('wireTough'));
  assert.deepEqual(p.research, ['wireTough.1']);
  assert.equal(canBuyResearch(p, 'block').ok, true);
});
test('forskning i nivåer: nästa nivå kostar mer, sista nivån är slut', () => {
  let p = { ...newProgress(), rp: 1000 };
  p = buyResearch(p, 'wireTough');
  assert.equal(nextTier(p, 'wireTough').tier, 2);
  assert.ok(cost('wireTough', 2) > cost('wireTough', 1));
  p = buyResearch(p, 'wireTough');
  assert.deepEqual(p.research, ['wireTough.1', 'wireTough.2']);
  assert.equal(p.rp, 1000 - cost('wireTough', 1) - cost('wireTough', 2));
  assert.equal(nextTier(p, 'wireTough'), null);
  assert.equal(canBuyResearch(p, 'wireTough').reason, 'redan');
});
test('varje nod kostar mer per nivå', () => {
  for (const n of RESEARCH) for (let i = 1; i < n.tiers.length; i++) assert.ok(n.tiers[i].cost > n.tiers[i - 1].cost, `${n.id} nivå ${i + 1}`);
});
test('krav kan peka på en nivå i en annan nod', () => {
  let p = { ...newProgress(), rp: 1000 };
  p = buyResearch(p, 'grenade');
  p = buyResearch(p, 'grenade');
  assert.equal(canBuyResearch(p, 'grenade').reason, 'kräver');   // nivå III kräver M2 I
  p = buyResearch(p, 'm2');
  assert.equal(canBuyResearch(p, 'grenade').ok, true);
});
test('budget i nivåer ger mer pengar', () => {
  assert.equal(startConfig({ ...newProgress(), research: ['budget.1', 'budget.2'] }, 1).cash, MAPS.riksvagen.days[0].startCash + 250);
});
test('gamla platta forsknings-id flyttas till nivå I', () => {
  assert.deepEqual(migrateResearch(['m2', 'm249Rate', 'wireTough', 'block', 'budget', 'slot4']),
    ['m2.1', 'm249Rate.1', 'wireTough.1', 'block.1', 'budget.1', 'positions.1']);
  assert.deepEqual(migrateResearch(['m2.2']), ['m2.1', 'm2.2']);
  assert.deepEqual(migrateResearch(['m2', 'm2.1', 'okänd']), ['m2.1', 'okänd']);
  assert.deepEqual(migrateResearch(['slot4.3']), ['positions.1']);
});
test('gammal v1-sparfil läses in som v4: nivåerna följer med, upplåsningarna blir RP', () => {
  const st = mem();
  st.setItem('horde.save', JSON.stringify({ v: 1, mapId: 'riksvagen', unlockedDay: 3, intel: 500, research: ['m2', 'm249Rate', 'wireTough', 'block'], attempts: { 1: 1, 2: 1 } }));
  const p = loadProgress(st);
  assert.equal(p.v, 4);
  // Ksp 88 I var en upplåsning (100), nu en leverans: tillbaka som RP; E4 dag 3 är spelbar, så leveransen ger den igen
  assert.equal(p.rp, 600);
  assert.deepEqual([...p.research].sort(), ['block.1', 'm249Rate.1', 'm2.1', 'wireTough.1'].sort());
  assert.equal(mapState(p).unlockedDay, 3);
  assert.equal(st.getItem('horde.save.broken'), null);
  assert.equal(st.getItem('horde.save.v1') != null, true);
});
test('större budget ger mer startpengar (utan operationen)', () => {
  const p = { ...newProgress(), research: ['budget'] };
  assert.equal(startConfig(p, 1).cash, MAPS.riksvagen.days[0].startCash + 150);
});
test('spara och läsa', () => {
  const st = mem();
  const p = { ...newCampaign(), rp: 5 };
  saveProgress(p, st);
  assert.deepEqual(loadProgress(st), p);
});
test('trasig sparfil raderas inte', () => {
  const st = mem();
  st.setItem('horde.save', '{trasig');
  const p = loadProgress(st);
  assert.equal(p.rp, 0);
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
  assert.deepEqual(loadProgress(st), newCampaign());
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
  assert.deepEqual(loadProgress(st), newCampaign());
});
test('utan tillgänglig lagring används minne och spara lyckas', () => {
  const p = { ...newCampaign(), rp: 3 };
  assert.equal(saveProgress(p), true);
  assert.equal(loadProgress().rp, 3);
});
test('extra fält i sparfilen (seenHint) följer med', () => {
  const st = mem();
  const p = { ...newCampaign(), seenHint: true };
  saveProgress(p, st);
  assert.equal(loadProgress(st).seenHint, true);
  assert.equal(st.getItem('horde.save.broken'), null);
});
test('sparfil med unlockedDay som inte är heltal räknas som trasig', () => {
  const st = mem();
  const raw = JSON.stringify(v1({ unlockedDay: 1.5 }));
  st.setItem('horde.save', raw);
  assert.deepEqual(loadProgress(st), newCampaign());
  assert.equal(st.getItem('horde.save.broken'), raw);
  assert.equal(st.getItem('horde.save'), raw);
});
test('sparfil med försök som inte är heltal räknas som trasig', () => {
  for (const bad of [1.5, '2', -1, null]) {
    const st = mem();
    const raw = JSON.stringify(v1({ attempts: { 1: 2, 2: bad } }));
    st.setItem('horde.save', raw);
    assert.deepEqual(loadProgress(st), newCampaign(), `attempts ${bad}`);
    assert.equal(st.getItem('horde.save.broken'), raw);
  }
});
test('giltiga heltal i försök läses in', () => {
  const st = mem();
  const p = { ...newCampaign(), maps: { riksvagen: { unlockedDay: 1, attempts: { 1: 0, 3: 4 } } } };
  saveProgress(p, st);
  assert.deepEqual(loadProgress(st), p);
});
test('startConfig ger null för en dag som inte finns, så att main.js måste vakta', () => {
  assert.equal(startConfig(newProgress(), 1.5), null);
  assert.ok(startConfig(newProgress(), 1));
});
test('migrateResearch behåller känd nod med trasig nivå', () => {
  assert.deepEqual(migrateResearch(['m2.x']), ['m2.x']);
  assert.deepEqual(migrateResearch(['m2.0', 'm2.1']), ['m2.0', 'm2.1']);
});

// ---------- äldre sparfiler blir v4, inget raderas ----------
test('v1-sparfil flyttas till v4: framsteget under banan, inget raderas', () => {
  const st = mem();
  const old = v1({ unlockedDay: 4, intel: 120, research: ['m2', 'block.2'], attempts: { 1: 2, 3: 1 }, seenHint: true });
  const raw = JSON.stringify(old);
  st.setItem('horde.save', raw);
  const p = loadProgress(st);
  assert.equal(p.v, 4);
  assert.equal(p.mapId, 'riksvagen');
  assert.deepEqual(p.maps.riksvagen, { unlockedDay: 4, attempts: { 1: 2, 3: 1 } });
  assert.equal(p.unlockedDay, undefined);
  assert.equal(p.attempts, undefined);
  assert.equal(p.rp, 220, '120 och Ksp 88 I (100) tillbaka');
  assert.ok(p.research.includes('block.2'));
  assert.equal(p.seenHint, true);
  // E4 är klar: vägspärren har tystnat, Gnesta South har de civila
  assert.ok(p.op.closed.includes('riksvagen'));
  assert.deepEqual(p.op.units.map(u => `${u.type}@${u.sector}`), ['civ@gnesta', 'civ@gnesta', 'civ@gnesta']);
  assert.equal(st.getItem('horde.save'), raw, 'läsningen skriver inte över sparfilen');
  assert.equal(st.getItem('horde.save.v1'), raw, 'kopia av den gamla sparfilen');
  assert.equal(st.getItem('horde.save.broken'), null);
  saveProgress(p, st);
  assert.deepEqual(loadProgress(st), p);
  assert.equal(st.getItem('horde.save.v1'), raw);
});
test('v1-kopian skrivs aldrig över av en annan v1-sparfil', () => {
  const st = mem();
  st.setItem('horde.save', JSON.stringify(v1({ intel: 1 })));
  loadProgress(st);
  st.setItem('horde.save', JSON.stringify(v1({ intel: 2 })));
  loadProgress(st);
  assert.equal(JSON.parse(st.getItem('horde.save.v1')).intel, 1);
  assert.equal(JSON.parse(st.getItem('horde.save.v1.1')).intel, 2);
});
test('migrateV1 ger samma frö för E4 (balanskvittot)', () => {
  const p = migrateV1(v1({ unlockedDay: 2, attempts: { 1: 3 } }));
  assert.equal(startConfig(p, 1).seed, 1003);
  assert.equal(startConfig(p, 2).seed, 2000);
});
test('framsteg per bana: E4 och Gnesta räknas var för sig', () => {
  let p = { ...newProgress(), research: ['budget.1'] };
  p = dayResult(p, { day: 1, won: true, rpEarned: 5 });
  p = selectMap(p, 'gnesta');
  assert.equal(mapState(p).unlockedDay, 1, 'Gnesta börjar på dag 1');
  p = dayResult(p, { day: 1, won: false, rpEarned: 3 });
  assert.equal(mapState(p).attempts[1], 1);
  assert.equal(mapState(p, 'riksvagen').unlockedDay, 2);
  assert.equal(mapState(p, 'riksvagen').attempts[1], 1);
  assert.equal(p.rp, 8);
  const cfg = startConfig(p, 1);
  assert.equal(cfg.map.id, 'gnesta');
  assert.equal(cfg.seed, 1001);
  assert.equal(startConfig(p, 6), null, 'Gnesta har fem dagar');
  assert.ok(startConfig(p, 5));
});
test('Gnesta låses upp när E4 dag 3 är klar, eller med debug', () => {
  let p = newProgress();
  assert.equal(mapUnlocked(p, 'riksvagen'), true);
  assert.equal(mapUnlocked(p, 'gnesta'), false);
  assert.equal(mapUnlocked(p, 'gnesta', { debug: true }), true);
  for (const day of [1, 2]) p = dayResult(p, { day, won: true, rpEarned: 0 });
  assert.equal(mapUnlocked(p, 'gnesta'), false);
  p = dayResult(p, { day: 3, won: true, rpEarned: 0 });
  assert.equal(mapUnlocked(p, 'gnesta'), true);
  assert.equal(mapUnlocked(p, 'okänd'), false);
});
test('v4-sparfil med okänd bana i maps behålls; trasig bana gör filen trasig', () => {
  const st = mem();
  const p = { ...newCampaign(), maps: { riksvagen: { unlockedDay: 1, attempts: {} }, framtida: { unlockedDay: 1, attempts: {} } } };
  saveProgress(p, st);
  assert.deepEqual(loadProgress(st).maps.framtida, { unlockedDay: 1, attempts: {} });
  const bad = JSON.stringify({ ...newCampaign(), maps: { gnesta: { unlockedDay: 0, attempts: {} } } });
  st.setItem('horde.save', bad);
  assert.deepEqual(loadProgress(st), newCampaign());
  assert.equal(st.getItem('horde.save'), bad);
  assert.equal(st.getItem('horde.save.broken'), bad);
});
const v2 = (o = {}) => ({ v: 2, mapId: 'gnesta', intel: 40, research: ['m2.1', 'slot4.1', 'budget.1', 'budget.2', 'budget.3'], maps: { riksvagen: { unlockedDay: 4, attempts: { 3: 2 } }, gnesta: { unlockedDay: 2, attempts: { 1: 1 } } }, seenHint: true, ...o });
test('v2-sparfil flyttas till v4: More positions och Ksp 88 I blir RP, allt annat följer med, inget raderas', () => {
  const st = mem();
  const raw = JSON.stringify(v2());
  st.setItem('horde.save', raw);
  const p = loadProgress(st);
  assert.equal(p.v, 4);
  // 40 + Ksp 88 I (100) + More positions I (80)
  assert.equal(p.rp, 220);
  for (const t of ['budget.1', 'budget.2', 'budget.3']) assert.ok(p.research.includes(t));
  assert.ok(!p.research.includes('positions.1'));
  assert.equal(p.mapId, 'gnesta');
  assert.deepEqual(p.maps.riksvagen, { unlockedDay: 4, attempts: { 3: 2 } });
  assert.deepEqual(p.maps.gnesta, { unlockedDay: 2, attempts: { 1: 1 } });
  assert.equal(p.seenHint, true);
  // Gnesta dag 2 är spelbar: de civila och Hemvärnet med två Ksp 90 står i sektorn
  assert.deepEqual(p.op.units.filter(u => u.sector === 'gnesta').map(u => u.type).sort(), ['civ', 'civ', 'civ', 'hv', 'm249', 'm249']);
  assert.equal(st.getItem('horde.save'), raw, 'läsningen skriver inte över sparfilen');
  assert.equal(st.getItem('horde.save.v2'), raw, 'kopia av den gamla sparfilen');
  assert.equal(st.getItem('horde.save.broken'), null);
  saveProgress(p, st);
  assert.deepEqual(loadProgress(st), p);
  assert.equal(st.getItem('horde.save.v2'), raw);
  st.setItem('horde.save', JSON.stringify(v2({ intel: 7 })));
  loadProgress(st);
  assert.equal(st.getItem('horde.save.v2'), raw);
  assert.equal(JSON.parse(st.getItem('horde.save.v2.1')).intel, 7);
});
test('More positions I till IV: en pjäs till per nivå (utan operationen)', async () => {
  const { maxGuns } = await import('../src/sim/stats.js');
  assert.equal(maxGuns([]), 4);
  assert.equal(maxGuns(['positions.1']), 5);
  assert.equal(maxGuns(['positions.1', 'positions.2', 'positions.3', 'positions.4']), 8);
});

test('Restart day och Main menu mitt i en dag räknar försöket: ny seed, inget annat ändras', () => {
  const p0 = { ...newProgress(), rp: 12 };
  const before = startConfig(p0, 1).seed;
  const p1 = abandonDay(p0, { day: 1 });
  assert.equal(mapState(p1).attempts[1], 1);
  assert.notEqual(startConfig(p1, 1).seed, before);
  assert.equal(startConfig(p1, 1).seed, startConfig(dayResult(p0, { day: 1, won: false, rpEarned: 0 }), 1).seed, 'samma seed som efter Try again');
  assert.equal(p1.rp, 12);
  assert.equal(mapState(p1).unlockedDay, 1);
  assert.deepEqual(p1.research, p0.research);
});
