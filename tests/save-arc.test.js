// 0.26.8 (NEW-16 i docs/v1-lista.md): sparfilen över hela bågen. Kampanjen går dag för dag så långt den är byggd (i dag
// till Västerkärv: dag 15 efter DEFEND LAXNE, dag 14 efter FALL BACK), med samma steg mellan dagarna som spelet (nightAfter,
// recordDay, Laxne-valet med makeChoice). Efter varje dag sparas filen och läses tillbaka: samma nästa strid, samma
// framsteg, och inga kopior eller trasiga filer. Sedan sparfiler skrivna av v0.25.1 (tests/fixtures/saves-0.25.1.json,
// gjorda med git archive v0.25.1, när kampanjen slutade efter rondellen): de läses, inget raderas och ingen fil räknas som
// trasig, kopieringsregeln håller (en kopia skrivs aldrig över), och kampanjen fortsätter från dem till dagens slut.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { newCampaign, nightAfter, makeChoice } from '../src/meta/operation.js';
import { nextBattle, recordDay, choiceSheet, campaignEnd } from '../src/meta/table.js';
import { SAVE_VERSION } from '../src/meta/progress.js';

const FIX = JSON.parse(readFileSync(new URL('./fixtures/saves-0.25.1.json', import.meta.url), 'utf8'));
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m }; };
const keys = st => [...st._m.keys()].sort();

// En natt som spelets: dagen vunnen, rullan föreslagen, bordets logg
function winDay(p, nb) {
  const q = nightAfter(p, { mapId: nb.map, day: nb.day, won: true, intelEarned: 10, report: { units: [] } }).progress;
  return recordDay(q, { mapId: nb.map, day: nb.day, kills: 100, waves: 3 });
}
// Från p till kampanjens slut. each(p, nb) efter varje vunnen dag. Svarar med framsteget och dagarna som spelades.
function playOut(p, choice, each = () => {}) {
  const days = [];
  for (let guard = 0; guard < 40; guard++) {
    const sh = choiceSheet(p);
    if (sh) { const r = makeChoice(p, sh.choice, choice); assert.ok(r.ok, `valet ${choice}: ${JSON.stringify(r)}`); p = r.progress; each(p, null); continue; }
    const nb = nextBattle(p);
    if (!nb) break;
    p = winDay(p, nb);
    days.push(nb.n);
    each(p, nb);
  }
  return { p, days };
}
// Spara, läs tillbaka, och samma sak en gång till: filen ska vara stabil
function roundTrip(p) {
  const st = mem();
  assert.equal(saveProgress(p, st), true);
  const q = loadProgress(st);
  saveProgress(q, st);
  const r = loadProgress(st);
  return { st, q, r };
}

for (const choice of ['defend', 'fallback']) {
  test(`NEW-16: hela bågen (${choice.toUpperCase()}), sparad och läst efter varje dag`, () => {
    let n = 0;
    const { p, days } = playOut(newCampaign(), choice, (p, nb) => {
      const { st, q, r } = roundTrip(p);
      const at = nb ? `dag ${nb.n} (${nb.map} ${nb.day})` : 'efter valet';
      assert.deepEqual(keys(st), ['horde.save'], `${at}: kopior eller trasig fil ${keys(st)}`);
      assert.equal(q.v, SAVE_VERSION);
      assert.deepEqual(nextBattle(q), nextBattle(p), `${at}: nästa strid ändrades av sparningen`);
      assert.deepEqual(r, q, `${at}: filen ändras vid andra sparningen`);
      // framsteget i sak: RP, banornas dagar, truppen, valen och bordets logg
      assert.equal(q.rp, p.rp, `${at}: RP`);
      for (const [id, m] of Object.entries(p.maps)) assert.equal(q.maps[id]?.unlockedDay, m.unlockedDay, `${at}: ${id}`);
      assert.deepEqual(q.op.units.map(u => [u.uid, u.type, u.level, u.sector, u.wins]), p.op.units.map(u => [u.uid, u.type, u.level, u.sector, u.wins]), `${at}: truppen`);
      assert.deepEqual(q.choices ?? {}, p.choices ?? {}, `${at}: valen`);
      assert.deepEqual(q.table?.log ?? {}, p.table?.log ?? {}, `${at}: bordets logg`);
      n++;
    });
    // dagarna i ordning, utan lucka, så långt bågen är byggd (i dag Västerkärv: 15 efter DEFEND, 14 efter FALL BACK;
    // en ny byggd dag kommer med av sig själv)
    assert.deepEqual(days, Array.from({ length: days.length }, (_, i) => i + 1), `dagarna i ordning: ${days}`);
    assert.ok(days.length >= (choice === 'defend' ? 15 : 14), `bara ${days.length} dagar`);
    assert.equal(n, days.length + 1);
    // slutet: slutbladet, också efter en läsning
    const end = campaignEnd(roundTrip(p).q);
    assert.ok(end, 'slutbladet efter sista dagen');
    assert.equal(end.days, days.length);
    assert.equal(nextBattle(roundTrip(p).q), null);
  });
}

test('NEW-16: sparfiler från v0.25.1 läses, inget raderas eller räknas som trasigt, kampanjen fortsätter till slutet', () => {
  assert.equal(FIX.version, '0.25.1');
  const DAYS = Object.fromEntries(['defend', 'fallback'].map(c => [c, playOut(newCampaign(), c).days.length]));
  for (const [name, raw] of Object.entries(FIX.saves)) {
    const choice = name.split(':')[0];
    const st = mem();
    st.setItem('horde.save', raw);
    const p = loadProgress(st);
    // filen står kvar som den var tills spelet sparar; ingen trasig kopia; varje kopia är filen själv
    assert.equal(st.getItem('horde.save'), raw, `${name}: filen ändrades vid läsningen`);
    assert.equal(st.getItem('horde.save.broken'), null, `${name}: räknades som trasig`);
    for (const k of keys(st)) if (k !== 'horde.save') assert.equal(st.getItem(k), raw, `${name}: kopian ${k} är inte filen`);
    const before = keys(st);
    const old = JSON.parse(raw);
    // framsteget följer med: RP, banornas dagar och truppen
    assert.equal(p.rp, old.rp, `${name}: RP`);
    for (const [id, m] of Object.entries(old.maps)) assert.equal(p.maps[id].unlockedDay, m.unlockedDay, `${name}: ${id}`);
    // (en fil från slutet får dessutom Västerkärvs förstärkning, leveranserna följer datan)
    const have = new Set(p.op.units.map(u => u.uid));
    for (const u of old.op.units) assert.ok(have.has(u.uid), `${name}: enheten ${u.uid} (${u.type}) försvann`);
    assert.deepEqual(p.choices ?? {}, old.choices ?? {}, `${name}: valen`);
    // spara och läs igen: kopiorna står kvar orörda, och läsningen ger samma sak
    assert.equal(saveProgress(p, st), true);
    const again = loadProgress(st);
    assert.deepEqual(again, loadProgress(st));
    for (const k of before) if (k !== 'horde.save') assert.equal(st.getItem(k), raw, `${name}: kopian ${k} skrevs över`);
    // en fil från kampanjens slut i 0.25.1 (efter rondellen) har nu Västerkärv kvar
    if (name.endsWith(':end')) {
      assert.equal(campaignEnd(p), null, `${name}: slutbladet ligger kvar fast Västerkärv är byggd`);
      assert.equal(nextBattle(p)?.map, 'vasterkarv', `${name}: nästa strid ${JSON.stringify(nextBattle(p))}`);
    }
    // och kampanjen går att spela härifrån till dagens slut, med sparning efter varje dag
    const { p: last } = playOut(again, choice, q => { const { st: s2 } = roundTrip(q); assert.deepEqual(keys(s2), ['horde.save'], `${name}: kopior efter en dag`); });
    const end = campaignEnd(last);
    assert.ok(end, `${name}: inget slutblad`);
    assert.equal(end.days, DAYS[choice], `${name}: slutet på dag ${end.days}`);
  }
});

test('NEW-16: kopieringsregeln, en äldre fil läst två gånger ger en kopia, och en annan äldre fil en kopia till', () => {
  const st = mem();
  const v3 = JSON.stringify({ v: 3, mapId: 'riksvagen', intel: 20, research: [], maps: { riksvagen: { unlockedDay: 2, attempts: { 1: 1 } } } });
  st.setItem('horde.save', v3);
  loadProgress(st); loadProgress(st);
  assert.deepEqual(keys(st), ['horde.save', 'horde.save.v3']);
  const v3b = JSON.stringify({ v: 3, mapId: 'riksvagen', intel: 40, research: [], maps: { riksvagen: { unlockedDay: 3, attempts: { 1: 1, 2: 1 } } } });
  st.setItem('horde.save', v3b);
  loadProgress(st);
  assert.deepEqual(keys(st), ['horde.save', 'horde.save.v3', 'horde.save.v3.1']);
  assert.equal(st.getItem('horde.save.v3'), v3);
  assert.equal(st.getItem('horde.save.v3.1'), v3b);
});
