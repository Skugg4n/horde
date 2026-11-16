// 0.26.1 (H602, helspeltestet 2026-11-16: väggar dag 7, 9 och 13, lätta dagar emellan, och 700 till 1 100 $ oanvända):
// hela kampanjen i följd med EN spelare (scripts/balance.mjs fullCampaign): samma trupp, RP, förråd och trötthet som en
// spelare bär med sig, och samma regler mellan dagarna som spelet (nightAfter). Ersätter banornas egna balansprov där de
// räknade från kartläsarens ankomst. docs/balance-log.md 0.26.1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fullCampaign, fullCurve } from '../scripts/balance.mjs';
import { MAPS } from '../src/data/maps.js';
import { RAMP_MAX } from '../src/data/campaign-tune.js';

const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const CAMPAIGN = ['riksvagen', 'gnesta', 'gnesta-norr', 'molnbo', 'laxne', 'bjornlunda', 'gnesta-vastra-rondell', 'vasterkarv'];

test('H602: ingen våg är mer än RAMP_MAX gånger den förra, på någon kampanjdag', () => {
  for (const id of CAMPAIGN) for (const d of MAPS[id].days) {
    const n = d.waves.map(w => w.groups.reduce((a, g) => a + g.count, 0));
    for (let i = 1; i < n.length; i++) assert.ok(n[i] <= n[i - 1] * RAMP_MAX + 1e-9, `${id} dag ${d.n}: ${n.join(' ')}`);
  }
});

test('H602: den vanliga spelaren klarar varje dag inom tre försök, hela kampanjen, fem seeds (DEFEND LAXNE)', () => {
  for (const [i, s] of SEEDS.entries()) {
    const r = fullCampaign('normal', { seedOffset: s, choice: 'defend' });
    assert.equal(r.stuck, null, `seed ${i}: fast ${JSON.stringify(r.stuck)}`);
    const c = fullCurve(r.log);
    assert.equal(c.length, 15, `seed ${i}: 15 dagar`);
    for (const d of c) assert.ok(d.tries !== 'x' && d.tries <= 3, `seed ${i} dag ${d.day} (${d.map} ${d.mapDay}): ${d.tries} försök`);
  }
});

test('H602: också i grenen FALL BACK, och spelaren vid basen tar sig igenom (två seeds)', () => {
  for (const s of SEEDS.slice(0, 2)) {
    for (const [fam, choice, days] of [['normal', 'fallback', 14], ['near', 'defend', 15]]) {
      const r = fullCampaign(fam, { seedOffset: s, choice });
      assert.equal(r.stuck, null, `${fam} ${choice} seed ${s}: fast ${JSON.stringify(r.stuck)}`);
      const c = fullCurve(r.log);
      assert.equal(c.length, days);
      for (const d of c) assert.ok(d.tries <= 6, `${fam} ${choice} dag ${d.day}: ${d.tries} försök`);
    }
  }
});

test('H605: kassan räcker men hopar sig inte (den vanliga spelaren, dag 5 och framåt under 700 $ kvar)', () => {
  const c = fullCurve(fullCampaign('normal', { seedOffset: 0, choice: 'defend' }).log);
  for (const d of c.filter(x => x.day >= 5)) assert.ok(d.cash < 700, `dag ${d.day}: ${d.cash} $ kvar`);
});
