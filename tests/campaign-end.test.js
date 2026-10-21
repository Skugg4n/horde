// 0.25.1 (speltestet av 0.25.0, H561 och H563): kampanjens slut tills vidare (slutbladet, datadrivet av den sista byggda
// dagen), rullans förslag natten efter en dag (de utvilade före de trötta), platsens namn i HUD:en och introt, och
// kartbladets etiketter vid Gnesta (pennraderna och DAY n).
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { CAMPAIGN_MAPS } from '../src/meta/campaign-day.js';
import { newCampaign, debugReach, finishDay, lanes, unitsIn } from '../src/meta/operation.js';
import { campaignEnd, lastBuiltMap, tableState, restedFirst, whereOf, nextBattle, cardZones } from '../src/meta/table.js';
import { penSpots, sectorXY, dayLabelSpot } from '../src/ui/table.js';
import { SECTORS } from '../src/data/depot.js';

const ID = 'gnesta-vastra-rondell';
const won = (p, mapId, day) => finishDay(p, { mapId, day, won: true, intelEarned: 10, report: { units: [] } }).progress;
const words = s => s.trim().split(/\s+/).length;

test('kampanjens slut: efter den sista byggda dagen ligger slutbladet på bordet, med en knapp', () => {
  const before = debugReach(newCampaign(), ID, 1);
  assert.equal(campaignEnd(before), null);
  assert.ok(!tableState(before).end);
  const q = won(before, ID, 1);
  assert.equal(nextBattle(q), null);
  const e = campaignEnd(q);
  assert.ok(e);
  assert.equal(e.text, 'Campaign continues in a later version. Thank you for holding Gnesta.');
  assert.equal(e.button, 'To menu');
  assert.ok(words(e.text) <= 12);
  assert.doesNotMatch(e.text + e.head, /—/);
  const st = tableState(q);
  assert.deepEqual(st.end, e);
  assert.ok(st.objects.includes('end'));
  assert.ok(!st.clipboard?.next);
});

test('kampanjens slut är datadrivet: en byggd dag efter rondellen tar bort det', () => {
  const q = won(debugReach(newCampaign(), ID, 1), ID, 1);
  assert.equal(lastBuiltMap(), ID);
  CAMPAIGN_MAPS.push('vasterkarv');
  try {
    // i kampanjens ordning men inte byggd: slutet står kvar
    assert.equal(lastBuiltMap(), ID);
    assert.ok(campaignEnd(q));
    MAPS.vasterkarv = { id: 'vasterkarv', name: 'Västerkärv', days: [{ n: 1 }] };
    // byggd: rondellen är inte längre sista dagen, slutet försvinner
    assert.equal(lastBuiltMap(), 'vasterkarv');
    assert.equal(campaignEnd(q), null);
  } finally { CAMPAIGN_MAPS.pop(); delete MAPS.vasterkarv; }
  assert.ok(campaignEnd(q));
});

test('rullan natten efter en dag: de utvilade går in före de trötta från slaget', () => {
  let p = debugReach(newCampaign(), ID, 1);
  const here = unitsIn(p, ID), cap = lanes(p, ID).cap;
  assert.ok(here.length > cap);
  // de första cap enheterna stred och är trötta, resten vilade
  const fought = new Set(here.slice(0, cap).map(u => u.uid));
  p = { ...p, op: { ...p.op, units: p.op.units.map(u => (u.sector === ID ? { ...u, lane: fought.has(u.uid) ? 'battle' : 'rest', ...(fought.has(u.uid) ? { fatigue: 1 } : {}) } : u)) } };
  const restedFit = here.filter(u => !fought.has(u.uid) && (u.men == null || u.men > 0)).length;
  const q = restedFirst(p, ID), L = lanes(q, ID);
  assert.equal(L.battle.length, cap);
  // så många utvilade som finns står i striden, och ingen trött står där medan en utvilad vilar
  assert.equal(L.battle.filter(u => !u.fatigue).length, Math.min(cap, restedFit));
  if (L.rest.some(u => !u.fatigue && (u.men == null || u.men > 0))) assert.ok(L.battle.every(u => !u.fatigue));
  // skälet står på raden
  const z = cardZones(q, ID);
  assert.ok(z.battle.some(c => c.moved?.long === 'Moved into battle: rested'));
  assert.ok(z.rest.some(c => c.moved?.long === 'Moved to reserve: tired'));
  // ingen utvilad i reserven: inget ändras
  const allTired = { ...p, op: { ...p.op, units: p.op.units.map(u => (u.sector === ID ? { ...u, fatigue: 1 } : u)) } };
  assert.equal(restedFirst(allTired, ID), allTired);
});

test('platsen i HUD:en och introt: endagsbanan med hela namnet och kampanjens dag, annars kortnamnet och banans dag', () => {
  assert.equal(whereOf(ID, 1), 'Gnesta · Västra rondellen · Day 13');
  assert.equal(whereOf('molnbo', 2), 'Mölnbo · 2');
  // ett namn per yta: bordet och kartan säger Västra rondellen
  assert.equal(SECTORS.find(s => s.id === ID).short, 'Västra rondellen');
  assert.match(MAPS[ID].outro.summary, /^Västra rondellen held\./);
});

test('kartbladet efter rondellen: varje pennrad ligger närmast sin egen markör, ingen över en annan', () => {
  const q = won(debugReach(newCampaign(), ID, 1), ID, 1);
  const spots = penSpots(tableState(q));
  const marks = [...spots.keys()].map(k => [k, sectorXY(k)]);
  for (const [k, sp] of spots) {
    const b = sp.box, near = ([x, y]) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
    const own = near(sectorXY(k));
    for (const [o, xy] of marks) if (o !== k && Math.hypot(xy[0] - sectorXY(k)[0], xy[1] - sectorXY(k)[1]) >= 16) assert.ok(near(xy) > own, `${k}: "${sp.text}" ligger närmare ${o}`);
  }
  const all = [...spots.values()];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i].box, b = all[j].box;
    assert.ok(!(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1), `${all[i].text} över ${all[j].text}`);
  }
});

test('DAY n hamnar bredvid det som ligger över kartan (klämbrädan)', () => {
  const nb = nextBattle(debugReach(newCampaign(), ID, 1));
  assert.equal(dayLabelSpot(nb).far, false);
  const [x, y] = sectorXY(nb.sector);
  // klämbrädan i 1440 x 900 och i 1024 x 614 (kartans bildpunkter)
  for (const av of [{ x0: 270, y0: 178, x1: 900, y1: 900 }, { x0: 332, y0: 57, x1: 900, y1: 900 }]) {
    const s = dayLabelSpot(nb, [av]);
    assert.ok(s.far);
    const b = { x0: x + s.dx - 4, y0: y + s.dy - 20, x1: x + s.dx + 132, y1: y + s.dy + 28 };
    assert.ok(!(b.x0 < av.x1 && av.x0 < b.x1 && b.y0 < av.y1 && av.y0 < b.y1), JSON.stringify(s));
  }
});
