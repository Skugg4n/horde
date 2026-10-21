import test from 'node:test';
import assert from 'node:assert/strict';
import { newProgress, startConfig, dayResult, mapState, mapUnlocked, selectMap, SAVE_VERSION } from '../src/meta/progress.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { MAPS } from '../src/data/maps.js';

// Gnesta Norr (0.10.0): tredje banan, upplåst när Gnesta dag 5 är klar. Sparfilen behåller sitt
// format (v3): en sparfil från 0.9.0 läses som den är, och banans framsteg läggs till under maps
// första gången den spelas. Inget raderas och inget skrivs över vid läsning.
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m }; };

test('menyn har banorna i ordning: E4, Gnesta, Gnesta Norr med en dag (0.22.0)', () => {
  // 0.11.0: sektornamnen (Olas önskan), id:na oförändrade
  // 0.16.0 (Olas beslut): Gnesta South och North är faserna Ishallen och Vikingavägen av sektorn Hagstumosse
  // 0.17.0-molnbo: Mölnbo efter Hagstumosse (tests/molnbo.test.js)
  // 0.23.0 (H545): Björnlunda efter Mölnbo (tests/bjornlunda-sector.test.js)
  assert.deepEqual(Object.values(MAPS).map(m => m.name), ['Sector E4', 'Hagstumosse · Ishallen', 'Hagstumosse · Vikingavägen', 'Mölnbo · Stationen', 'Björnlunda · Wattrangsborg']);
  assert.deepEqual(Object.keys(MAPS), ['riksvagen', 'gnesta', 'gnesta-norr', 'molnbo', 'bjornlunda']);
  // 0.22.0 (H539, kampanjbågen dag 7): Vikingavägen är en dag
  assert.equal(MAPS['gnesta-norr'].days.length, 1);
  for (const d of MAPS['gnesta-norr'].days) {
    assert.match(d.intro.title, /^Day \d: /);
    // 0.16.0 (inlärningen, designen avsnitt 2.2): en rad, högst 12 ord
    assert.ok(d.intro.text.length > 10 && d.intro.text.split(/\s+/).length <= 12, d.intro.text);
    assert.doesNotMatch(d.intro.text + d.intro.title, /\u2014/, 'inget tankstreck');
  }
});

// 0.16.0 (Olas beslut, "Gnesta = en sektor"): Vikingavägen är fas två av Hagstumosse. 0.22.0 (H539, kampanjbågen):
// Ishallen har tre dagar och Vikingavägen öppnar när dag 3 är klar.
test('Hagstumosse · Vikingavägen låses upp när Ishallen dag 3 är klar, eller med debug', () => {
  let p = newProgress();
  assert.equal(mapUnlocked(p, 'gnesta-norr'), false);
  assert.equal(mapUnlocked(p, 'gnesta-norr', { debug: true }), true);
  p = selectMap(p, 'gnesta');
  for (const day of [1, 2]) p = dayResult(p, { day, won: true, rpEarned: 0 });
  assert.equal(mapUnlocked(p, 'gnesta-norr'), false, 'dag 2 räcker inte');
  p = dayResult(p, { day: 3, won: false, rpEarned: 0 });
  assert.equal(mapUnlocked(p, 'gnesta-norr'), false, 'en förlorad dag 3 räcker inte');
  p = dayResult(p, { day: 3, won: true, rpEarned: 0 });
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
  p = dayResult(p, { day: 1, won: true, rpEarned: 6 });
  assert.equal(mapState(p).unlockedDay, 2);
  assert.equal(mapState(p, 'gnesta').unlockedDay, 1, 'Gnesta orörd');
  assert.equal(startConfig(p, 2), null);
});

// En riktig sparfil från 0.9.0: E4 och Gnesta klara, forskning, tips sedda.
const save090 = () => ({ v: 3, mapId: 'gnesta', intel: 310, research: ['m2.1', 'm2.2', 'm2.3', 'wireTough.1', 'budget.1', 'block.1', 'psg90.1', 'positions.1'],
  maps: { riksvagen: { unlockedDay: 4, attempts: { 1: 1, 2: 1, 3: 3 } }, gnesta: { unlockedDay: 6, attempts: { 1: 1, 2: 2, 3: 1, 4: 2, 5: 4 } } },
  seenHints: ['riksvagen', 'gnesta'] });

test('sparfil från 0.9.0: läses som v4, Gnesta Norr öppen, inget raderas eller skrivs över', () => {
  assert.equal(SAVE_VERSION, 4, '0.14.0: v4');
  const st = mem(), raw = JSON.stringify(save090());
  st.setItem('horde.save', raw);
  const p = loadProgress(st);
  assert.equal(st.getItem('horde.save'), raw, 'läsningen skriver inte över sparfilen');
  assert.equal(st.getItem('horde.save.v3'), raw, 'kopia');
  assert.equal(st.getItem('horde.save.broken'), null);
  assert.deepEqual(p.maps.riksvagen, save090().maps.riksvagen);
  assert.deepEqual(p.maps.gnesta, save090().maps.gnesta);
  for (const t of ['m2.2', 'm2.3', 'wireTough.1', 'budget.1', 'block.1']) assert.ok(p.research.includes(t), t);
  // Psg 90 I och More positions I tillbaka som RP; Ksp 88 I kommer med leveranserna
  assert.equal(p.rp, 310 + 180 + 80 + 100);
  assert.deepEqual(p.seenHints, ['riksvagen', 'gnesta']);
  assert.equal(mapUnlocked(p, 'gnesta-norr'), true, 'Gnesta dag 5 var klar i 0.9.0');
  // 0.16.0: Hagstumosse är en sektor: Ishallen är klar och trupperna följer med till Vikingavägen
  assert.ok(p.op.units.some(u => u.sector === 'gnesta'));
  assert.ok(!p.op.units.some(u => u.sector === 'gnesta-norr' || u.sector === null));
  let q = selectMap(p, 'gnesta-norr');
  q = dayResult(q, { day: 1, won: true, rpEarned: 6 });
  assert.equal(saveProgress(q, st), true);
  const back = loadProgress(st);
  // 0.22.0 (H539): Ishallen har tre dagar; filen som stod efter dag 5 räknas som klar med Ishallen (4), försöken står kvar
  assert.deepEqual(back.maps.gnesta, { ...save090().maps.gnesta, unlockedDay: 4 });
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

// 0.10.1: ?debug ger forskningen en typisk spelare har när banan låses upp; ?debug&fresh ingenting.
test('debugArrival: forskningen vid ankomsten läggs till för dagen, sparfilen rörs inte', async () => {
  const { debugArrival } = await import('../src/meta/progress.js');
  const { ARRIVAL } = await import('../src/data/arrival.js');
  const p = selectMap(newProgress(), 'gnesta');
  const d = debugArrival(p, 'gnesta');
  assert.deepEqual(d.research, ARRIVAL.gnesta);
  assert.deepEqual(p.research, [], 'framsteget är orört');
  assert.equal(debugArrival(p, 'gnesta', { fresh: true }), p);
  assert.equal(startConfig(d, 1, 'gnesta').cash, MAPS.gnesta.days[0].startCash + 150, 'Bigger budget I ingår');
  // det spelaren redan har behålls, inget dubbelt
  const q = { ...p, research: ['m2.1', 'm2.2', 'm2.3'] };
  const r = debugArrival(q, 'gnesta-norr').research;
  assert.equal(new Set(r).size, r.length);
  assert.ok(ARRIVAL['gnesta-norr'].every(id => r.includes(id)));
  assert.equal(debugArrival(newProgress(), 'riksvagen').research.length, 0);
});
