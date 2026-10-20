// Kampanjbågens Hagstumosse (0.22.0, H539, kampanjplanen avsnitt 10): Ishallen tre dagar (kampanjens dag 4 till 6),
// Vikingavägen en (dag 7), Mölnbo dag 1 är dag 8. En sparfil från före stod kanske på en dag som inte finns längre: den
// räknas som klar med banan, en kopia behålls och inget raderas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { RELEASES } from '../src/data/depot.js';
import { newCampaign, debugReach, unitsIn, sectorStatus, currentMap } from '../src/meta/operation.js';
import { mapUnlocked, mapState } from '../src/meta/progress.js';
import { loadProgress, saveProgress, ARC_MIGRATION } from '../src/meta/save.js';
import { campaignDayOf } from '../src/meta/campaign-day.js';
import { featuresFor } from '../src/meta/unlocks.js';

const memory = () => { const m = new Map(); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const load = old => { const s = memory(), raw = JSON.stringify(old); s.setItem('horde.save', raw); return { s, raw, q: loadProgress(s) }; };

test('bågen: Ishallen tre dagar, Vikingavägen en, Mölnbo dag 1 är kampanjens dag 8', () => {
  assert.equal(MAPS.gnesta.days.length, 3);
  assert.equal(MAPS['gnesta-norr'].days.length, 1);
  assert.deepEqual(MAPS['gnesta-norr'].unlock, { map: 'gnesta', day: 3 });
  assert.equal(campaignDayOf('gnesta', 1), 4);
  assert.equal(campaignDayOf('gnesta-norr', 1), 7);
  assert.equal(campaignDayOf('molnbo', 1), 8);
  // dag 4: bara de frivilliga, inget Hemvärn
  const gn = id => RELEASES.find(r => r.id === id);
  assert.deepEqual(gn('gn-1').grant.map(g => g.type), ['civ']);
  assert.ok(!MAPS.gnesta.days[0].arsenal.includes('hv') && !MAPS.gnesta.days[0].arsenal.includes('m249'));
  // dag 5 och 6: Hemvärnet, en eller två enheter per dag
  assert.ok(gn('gn-2').grant.reduce((n, g) => n + (g.count ?? 1), 0) <= 2);
  assert.ok(gn('gn-3').grant.reduce((n, g) => n + (g.count ?? 1), 0) <= 2);
  // dag 6: radion (Move och Rotate), inte före
  assert.ok(featuresFor('gnesta', 3).has('move') && !featuresFor('gnesta', 2).has('move'));
  // dag 7: väst, syd och nord, och betongen och skrotbilarna
  const spawns = new Set(MAPS['gnesta-norr'].days[0].waves.flatMap(w => w.groups.map(g => g.spawn)));
  for (const id of ['dansW', 'forest', 'vikN']) assert.ok(spawns.has(id), id);
  assert.ok(featuresFor('gnesta-norr', 1).has('car') && !featuresFor('gnesta', 3).has('car'));
  // större än någon av de gamla dagarna (gamla dag 5 hade 405 i vågorna)
  const count = d => d.waves.flatMap(w => w.groups).reduce((n, g) => n + g.count, 0);
  assert.ok(count(MAPS['gnesta-norr'].days[0]) > 405);
  // introna: högst 12 ord och säger varifrån
  for (const d of [...MAPS.gnesta.days, ...MAPS['gnesta-norr'].days]) assert.ok(d.intro.text.split(/\s+/).length <= 12, d.intro.text);
  assert.match(MAPS['gnesta-norr'].days[0].intro.text, /West, south and north/);
});

test('sparfilen: Ishallen dag 4 eller 5 blir Ishallen klar och Vikingavägen öppen; kopian behålls, inget raderas', () => {
  const base = debugReach(newCampaign(), 'gnesta', 3);
  for (const day of [4, 5]) {
    const old = { ...base, maps: { ...base.maps, gnesta: { unlockedDay: day, attempts: { 1: 1, 2: 1, 3: 1, 4: 2, ...(day > 4 ? { 5: 1 } : {}) } } },
      op: { ...base.op, released: [...base.op.released, 'gn-4', ...(day > 4 ? ['gn-5'] : [])] } };
    const { s, raw, q } = load(old);
    assert.equal(s.getItem('horde.save'), raw, 'filen skrivs inte över vid läsningen');
    assert.equal(s.getItem('horde.save.arc'), raw, 'kopian');
    assert.equal(mapState(q, 'gnesta').unlockedDay, 4, `dag ${day}`);
    assert.equal(mapState(q, 'gnesta').attempts[4], 2, 'försöken står kvar');
    assert.equal(mapUnlocked(q, 'gnesta-norr'), true);
    assert.equal(currentMap(q, 'gnesta'), 'gnesta-norr');
    assert.equal(sectorStatus(q, 'gnesta'), 'holding');
    assert.ok(q.op.released.includes('gnn-1'), 'leveransen till Vikingavägen');
    for (const u of old.op.units) assert.ok(q.op.units.some(x => x.uid === u.uid), `enhet ${u.uid} kvar`);
    assert.ok(q.migrations.includes(ARC_MIGRATION));
    // nästa läsning: ingen ny kopia, inget ändras
    saveProgress(q, s);
    const again = loadProgress(s);
    assert.equal(s.getItem('horde.save.arc.1'), null);
    assert.equal(mapState(again, 'gnesta').unlockedDay, 4);
    assert.equal(again.op.units.length, q.op.units.length);
  }
});

test('sparfilen: Vikingavägen dag 2 till 5 blir Vikingavägen klar och Mölnbo öppen; kopian behålls, inget raderas', () => {
  const base = debugReach(newCampaign(), 'gnesta-norr', 1);
  for (const day of [2, 3, 4, 5]) {
    const extra = ['gn-4', 'gn-5', 'gnn-2', 'gnn-3', 'gnn-4', 'gnn-5'].slice(0, 2 + day - 1);
    const old = { ...base, maps: { ...base.maps, gnesta: { unlockedDay: 6, attempts: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 } }, 'gnesta-norr': { unlockedDay: day, attempts: { 1: 1, ...(day > 2 ? { 2: 3 } : {}) } } },
      op: { ...base.op, released: [...base.op.released, ...extra] } };
    const { s, raw, q } = load(old);
    assert.equal(s.getItem('horde.save.arc'), raw, `dag ${day}: kopian`);
    assert.equal(s.getItem('horde.save.days'), null, 'bara bågens kopia');
    assert.equal(mapState(q, 'gnesta-norr').unlockedDay, 2, `dag ${day}`);
    assert.equal(mapState(q, 'gnesta').unlockedDay, 4);
    assert.equal(mapUnlocked(q, 'molnbo'), true);
    assert.equal(sectorStatus(q, 'gnesta'), 'held');
    assert.equal(sectorStatus(q, 'molnbo'), 'holding');
    if (day > 2) assert.equal(mapState(q, 'gnesta-norr').attempts[2], 3, 'försöken står kvar');
    for (const u of old.op.units) assert.ok(q.op.units.some(x => x.uid === u.uid), `enhet ${u.uid} kvar`);
    assert.equal(unitsIn(q, 'molnbo').length, q.op.units.length, 'truppen följer med till Mölnbo');
  }
});

test('sparfilen: en fil från 0.22.0 (eller en gammal på Ishallen dag 1 till 3) ändras inte och kopieras inte', () => {
  for (const [m, d] of [['gnesta', 2], ['gnesta', 3], ['gnesta-norr', 1], ['molnbo', 2]]) {
    const p = debugReach(newCampaign(), m, d);
    const { s, q } = load(p);
    assert.equal(s.getItem('horde.save.arc'), null, `${m} ${d}`);
    assert.deepEqual(q.maps, { ...q.maps, ...p.maps });
    assert.equal(q.migrations, undefined);
  }
});
