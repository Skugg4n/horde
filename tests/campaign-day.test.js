// Kampanjens dagnummer (0.21.3, H539): dagarna räknas i kampanjens ordning, E4 3, Ishallen 5, Vikingavägen 5, Mölnbo 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignDayOf, campaignDay, CAMPAIGN_MAPS } from '../src/meta/campaign-day.js';
import { campaignDay as tableDay, tableState } from '../src/meta/table.js';
import { MAPS } from '../src/data/maps.js';
import { newCampaign, debugReach } from '../src/meta/operation.js';

test('kampanjens dag: banornas dagar efter varandra, Mölnbo dag 2 är dag 15', () => {
  assert.equal(campaignDayOf('riksvagen', 1), 1);
  assert.equal(campaignDayOf('riksvagen', 3), 3);
  assert.equal(campaignDayOf('gnesta', 1), 4);
  assert.equal(campaignDayOf('gnesta-norr', 5), 13);
  assert.equal(campaignDayOf('molnbo', 2), 15);
  assert.equal(campaignDayOf('molnbo', 3), 16);
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
  assert.equal(campaignDay(p, 'molnbo'), 15);
  assert.equal(campaignDay(p, 'molnbo', 3), 16);
  assert.equal(tableDay('molnbo', 2), 15);
  const s = tableState(debugReach(newCampaign(), 'gnesta', 5));
  assert.equal(s.next.n, campaignDayOf('gnesta', 5));
});
