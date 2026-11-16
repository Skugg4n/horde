import test from 'node:test';
import assert from 'node:assert/strict';
import { cardLines } from '../src/ui/panels.js';
import { SHOP, shopItem } from '../src/data/shop.js';
import { ENEMIES } from '../src/data/lessons.js';

// 0.25.2 (UI-genomgången inför v1): små textfel som speltesten hittat.
test('H225/H407: kortets rubrik upprepar inte namnet ("Volunteers · Volunteers")', () => {
  assert.ok(SHOP.length > 5);
  for (const it of SHOP) {
    const parts = cardLines(it)[0].split(' · ');
    assert.equal(new Set(parts).size, parts.length, cardLines(it)[0]);
  }
  assert.equal(cardLines(shopItem('civ'))[0], 'Volunteers · hunting rifles');
});

test('H225/H527: fiendekorten börjar olika och nämner ingen plats', () => {
  const first = Object.values(ENEMIES).map(e => e.report.split('.')[0]);
  assert.equal(new Set(first).size, first.length);
  for (const e of Object.values(ENEMIES)) assert.doesNotMatch(e.report, /\bE4\b/);
});

test('H527: Mölnbo dag 2 säger att norra sidan är förlorad', async () => {
  const { lostNext, synthReport } = await import('../src/meta/table.js');
  const { newCampaign } = await import('../src/meta/operation.js');
  assert.equal(lostNext('molnbo', 2), 'The north side is lost');
  assert.equal(lostNext('molnbo', 1), null);
  assert.equal(lostNext('molnbo', 3), null);
  assert.match(synthReport(newCampaign(), 'molnbo', 2).lead, /The north side is lost\.$/);
});

test('H486: underrättelserna räknar inte upp väderstreck utan rapport', async () => {
  const { MAPS } = await import('../src/data/maps.js');
  const { intelFor } = await import('../src/meta/intel.js');
  for (const m of Object.values(MAPS)) (m.days ?? []).forEach((d, i) => {
    const it = intelFor(m, i + 1);
    if (it) assert.doesNotMatch(it.note, /No reports from the/, `${m.id} dag ${i + 1}`);
  });
});
