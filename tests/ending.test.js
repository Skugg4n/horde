// 0.27.0: v1:s slut. Båda Laxne-grenarna (DEFEND: dag 15, FALL BACK: dag 14) når slutet efter Västerkärv; sparfilen
// skriver att kampanjen är slutförd utan att något annat ändras; scenen spelas en gång och kan ses igen; texterna står på
// ett ställe (src/data/ending.js) och håller måtten; trådarna slutar vid spåret väster om Björnlunda station.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { newCampaign, nightAfter, makeChoice } from '../src/meta/operation.js';
import { nextBattle, recordDay, choiceSheet, campaignEnd, finishCampaign, markEndingSeen, endingOf, endingPending, endingReplayable, tableState } from '../src/meta/table.js';
import { ENDING_TEXT, ENDING_TIME, ENDING_TARGET, THREADS } from '../src/data/ending.js';
import { PLACES } from '../src/data/table.js';
import { fleshSvg, mapSvg } from '../src/ui/table.js';

const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m }; };
const words = s => s.trim().split(/\s+/).length;
const roundTrip = p => { const st = mem(); assert.equal(saveProgress(p, st), true); return { st, q: loadProgress(st) }; };

// Kampanjen dag för dag som spelet (nightAfter, recordDay, valet); finishCampaign efter varje vunnen dag, som main.js
function playOut(choice) {
  let p = newCampaign(), last = null;
  for (let guard = 0; guard < 40; guard++) {
    const sh = choiceSheet(p);
    if (sh) { p = makeChoice(p, sh.choice, choice).progress; continue; }
    const nb = nextBattle(p);
    if (!nb) break;
    assert.equal(endingOf(p), null, `dag ${nb.n}: slutförd före slutet`);
    p = nightAfter(p, { mapId: nb.map, day: nb.day, won: true, intelEarned: 10, report: { units: [] } }).progress;
    p = recordDay(p, { mapId: nb.map, day: nb.day, kills: 100, waves: 3 });
    p = finishCampaign(p);
    last = nb;
  }
  return { p, last };
}

for (const [choice, day] of [['defend', 15], ['fallback', 14]]) {
  test(`v1:s slut (${choice.toUpperCase()}): Västerkärv dag ${day}, slutförd i sparfilen, scenen en gång`, () => {
    const { p, last } = playOut(choice);
    assert.equal(last.map, 'vasterkarv');
    assert.equal(last.n, day);
    assert.ok(campaignEnd(p));
    assert.deepEqual(endingOf(p), { finished: true, day, seen: false });
    assert.ok(endingPending(p) && endingReplayable(p));
    // sparad och läst: fältet följer med, och inget annat i filen ändras av det
    const { q } = roundTrip(p);
    assert.deepEqual(endingOf(q), { finished: true, day, seen: false });
    const { ending, ...rest } = q;
    const { q: without } = roundTrip({ ...p, ending: undefined });
    assert.deepEqual(rest, Object.fromEntries(Object.entries(without).filter(([k]) => k !== 'ending')));
    // scenen sedd: bara seen ändras; finishCampaign en gång till skriver inget
    const seen = markEndingSeen(q);
    assert.deepEqual(endingOf(seen), { finished: true, day, seen: true });
    assert.ok(!endingPending(seen) && endingReplayable(seen));
    assert.equal(finishCampaign(seen), seen);
    const { ending: e2, ...rest2 } = roundTrip(seen).q;
    assert.deepEqual(rest2, rest);
    assert.equal(e2.seen, true);
    // bordet: slutbladet, slutscenens radioremsa, trådarna och stämpeln på kartan
    const st = tableState(seen);
    assert.ok(st.end);
    assert.deepEqual(st.radio.map(r => r.id), ['radio:ending']);
    const svg = mapSvg(st, null);
    assert.match(svg, /class="tb-flesh"/);
  });
}

test('en fil från 0.26.8:s slut (utan fältet) får scenen en gång; en fil mitt i kampanjen inte', () => {
  const { p } = playOut('fallback');
  const old = { ...p }; delete old.ending;
  assert.equal(endingOf(old), null);
  assert.ok(endingPending(old));
  assert.deepEqual(endingOf(markEndingSeen(old)), { finished: true, day: 14, seen: true });
  const mid = newCampaign();
  assert.equal(finishCampaign(mid), mid);
  assert.ok(!endingPending(mid) && !endingReplayable(mid));
  assert.equal(markEndingSeen(mid), mid);
  // trasigt fält: räknas som inget
  assert.equal(endingOf({ ...old, ending: 'yes' }), null);
  assert.equal(endingOf({ ...old, ending: { finished: 1 } }), null);
});

test('slutscenens texter: ett ställe, måtten, inga tankstreck', () => {
  assert.ok(words(ENDING_TEXT.radio.text) <= 30, `radion ${words(ENDING_TEXT.radio.text)} ord`);
  assert.ok(ENDING_TEXT.stamp.length <= 18);
  assert.ok(words(ENDING_TEXT.sheet.text) <= 20);
  for (const t of [ENDING_TEXT.radio.text, ENDING_TEXT.radio.from, ENDING_TEXT.stamp, ENDING_TEXT.sheet.text, ENDING_TEXT.skip, ENDING_TEXT.replay]) assert.doesNotMatch(t, /—|–/);
  assert.match(ENDING_TEXT.radio.text, /Björnlunda/);
});

test('slutscenen: 15 till 25 sekunder, i ordning; trådarna från väster till spåret vid Björnlunda', () => {
  const T = ENDING_TIME;
  assert.ok(T.done >= 15 && T.done <= 25, `${T.done} s`);
  assert.ok(T.threads < T.mass && T.mass < T.radio && T.radio < T.stamp && T.stamp < T.sheet && T.sheet < T.done);
  // målet ligger strax väster om stationen, på järnvägen
  const [blo, bla] = PLACES.bjornlunda;
  assert.ok(ENDING_TARGET[0] < blo && blo - ENDING_TARGET[0] < 0.04);
  assert.ok(Math.abs(ENDING_TARGET[1] - bla) < 0.006);
  for (const t of THREADS) {
    const [lo0] = t.pts[0], [lo1] = t.pts.at(-1);
    assert.ok(lo0 < lo1 && lo1 < ENDING_TARGET[0], 'tråden går från väster mot målet');
    // trådarna är ritade när massan växer, med marginal till radion
    assert.ok(T.threads + t.d + (6.5 - t.d * 0.6) <= T.radio);
  }
  assert.equal((fleshSvg().match(/class="fl"/g) ?? []).length, THREADS.length);
  assert.equal((fleshSvg().match(/class="fl halo"/g) ?? []).length, THREADS.length);
});
