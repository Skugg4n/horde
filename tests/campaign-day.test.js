// Kampanjens dagnummer (0.21.3, H539): dagarna räknas i kampanjens ordning. 0.22.0 (kampanjbågen): E4 3, Ishallen 3,
// Vikingavägen 1, Mölnbo 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignDayOf, campaignDay, CAMPAIGN_MAPS } from '../src/meta/campaign-day.js';
import { campaignDay as tableDay, tableState } from '../src/meta/table.js';
import { MAPS } from '../src/data/maps.js';
import { newCampaign, debugReach } from '../src/meta/operation.js';

test('kampanjens dag: banornas dagar efter varandra efter kampanjbågen, Mölnbo dag 1 är dag 8', () => {
  assert.equal(campaignDayOf('riksvagen', 1), 1);
  assert.equal(campaignDayOf('riksvagen', 3), 3);
  assert.equal(campaignDayOf('gnesta', 1), 4);
  assert.equal(campaignDayOf('gnesta', 3), 6);
  assert.equal(campaignDayOf('gnesta', 4), null);
  assert.equal(campaignDayOf('gnesta-norr', 1), 7);
  assert.equal(campaignDayOf('gnesta-norr', 2), null);
  assert.equal(campaignDayOf('molnbo', 1), 8);
  assert.equal(campaignDayOf('molnbo', 2), 9);
  assert.equal(campaignDayOf('molnbo', 3), 10);
  // utanför kampanjen eller utanför banans dagar: inget nummer
  assert.equal(campaignDayOf('molnbo', 4), null);
  assert.equal(campaignDayOf('ingen-bana', 1), null);
  // ordningen följer banornas längd (när kampanjbågen kortar Hagstumosse följer numret)
  let n = 0;
  for (const id of CAMPAIGN_MAPS) { assert.equal(campaignDayOf(id, 1), n + 1, id); n += MAPS[id].days.length; }
});

test('kampanjens dag för framsteget: banan som spelas och dess nästa dag; bordet säger samma', () => {
  assert.equal(campaignDay(newCampaign()), 1);
  const p = debugReach(newCampaign(), 'molnbo', 2);
  assert.equal(campaignDay(p, 'molnbo'), 9);
  assert.equal(campaignDay(p, 'molnbo', 3), 10);
  assert.equal(tableDay('molnbo', 2), 9);
  const s = tableState(debugReach(newCampaign(), 'gnesta', 3));
  assert.equal(s.next.n, campaignDayOf('gnesta', 3));
  assert.equal(tableState(debugReach(newCampaign(), 'gnesta-norr', 1)).next.n, 7);
});

// 0.22.1 (speltestet av 0.22.0, fynd 1: resultatrutan sa "Day 1 held." under DAY 04): ett dagnummer, en källa
import { shownDay } from '../src/meta/campaign-day.js';
import { readFileSync } from 'node:fs';
test('dagnumret spelaren ser: kampanjens dag överallt, banans dag bara utanför kampanjen', () => {
  assert.equal(shownDay('gnesta', 1), 4);
  assert.equal(shownDay('gnesta-norr', 1), 7);
  assert.equal(shownDay('molnbo', 1), 8);
  assert.equal(shownDay('ingen-bana', 3), 3);
  assert.equal(tableDay('gnesta', 3), shownDay('gnesta', 3));
  // resultatet, introt, HUD:en och menyn får dagen ur shownDay (ingen banans dag i main.js resultat)
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /dayResultPanel\(uiRoot, \{ \.\.\.lastResult, day: shownDay\(/);
  assert.match(main, /day: \(\) => shownDay\(map\.id, day\)/);
  assert.match(readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8'), /shownDay\(sim\.map\.id, sim\.day\)/);
});

// 0.22.1 (fynd 5): påminnelsen om osparade RP när Deploy trycks
import { spendNudge } from '../src/meta/table.js';
test('påminnelsen om RP: bara när RP räcker till det billigaste i förrådet', () => {
  const p = debugReach(newCampaign(), 'gnesta-norr', 1);
  assert.equal(spendNudge({ ...p, rp: 0 }, 'gnesta'), null);
  const n = spendNudge({ ...p, rp: 2000 }, 'gnesta');
  assert.ok(n && n.rp === 2000 && n.cheapest > 0 && n.cheapest <= 2000);
  assert.equal(spendNudge({ ...p, rp: n.cheapest - 1 }, 'gnesta'), null);
  assert.equal(spendNudge({ ...newCampaign(), rp: 5000 }, 'riksvagen'), null, 'före förrådet ingen påminnelse');
});
