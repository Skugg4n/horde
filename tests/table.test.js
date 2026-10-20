// 0.21.0: kartbordet (src/meta/table.js). Vad som ligger på bordet dag 1 och dag 8, högarnas ordning, dra och släpp med
// Tidy, korten med förrådets regler, och att en sparfil från före bordet läses som förut.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, debugReach, finishDay, lanes, setLane, unitsIn, deployCap } from '../src/meta/operation.js';
import { tableState, campaignDay, missionPiles, moveObject, tidy, placeOf, defaultPlace, tableOf, normalizeTable, recordDay,
  reportSheet, orderSheet, radioStrips, enemyPile, swapCards, cardZones, bringToTop, nextBattle, recordLoss, campaignIndex, frameFor, MIN_SCALE } from '../src/meta/table.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { MAPS } from '../src/data/maps.js';
import { RADIO } from '../src/data/table.js';
import { markSeen } from '../src/meta/lessons.js';

const words = s => s.trim().split(/\s+/).filter(Boolean).length;
const fake = () => { const m = new Map(); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } }; };
// Kampanjens dag 6 (0.22.0, kampanjbågen): E4 dag 1 till 3, Ishallen dag 1 till 3 (dag 6 = Ishallen dag 3). Förut dag 8 = Ishallen dag 5.
const day6 = () => debugReach(newCampaign(), 'gnesta', 3);

test('dag 1: bara kartan och en lapp (ordern för dag 1)', () => {
  const s = tableState(newCampaign());
  assert.deepEqual(s.objects, ['map', 'pile:riksvagen']);
  assert.equal(s.briefing, true);
  assert.equal(s.next.n, 1);
  const [pile] = s.piles;
  assert.equal(pile.sheets.length, 1);
  assert.equal(pile.sheets[0].kind, 'order');
  assert.equal(pile.sheets[0].text, MAPS.riksvagen.days[0].intro.text);
  assert.equal(s.enemies, null);
  assert.equal(s.zones, null);
  assert.equal(s.clipboard, null);
  assert.deepEqual(s.radio, []);
});

test('dag 6: högar per uppdrag, fiendehögen, radion, korten och klämbrädan', () => {
  const p = day6(), s = tableState(p);
  // 0.21.1: bordet visar samma dag som introt, HUD:en och menyn. 0.21.3 (H539): kampanjens dag (Ishallen dag 3 = dag 6)
  assert.equal(s.next.n, 6);
  assert.equal(s.next.place, 'Ishallen');
  for (const id of ['map', 'archive', 'pile:gnesta', 'enemies', 'clipboard', 'zones']) assert.ok(s.objects.includes(id), id);
  const e4 = s.piles.find(x => x.sector === 'riksvagen'), gn = s.piles.find(x => x.sector === 'gnesta');
  assert.equal(e4.closed, true);
  // 0.21.3 (H530): en klar sektor ligger i arkivhögen i hörnet, inte som egen hög på kartan
  assert.ok(!s.objects.includes('pile:riksvagen'));
  assert.deepEqual(s.archive.tops.map(x => x.id), ['closed:riksvagen']);
  assert.equal(e4.sheets.at(-1).kind, 'closed');
  assert.equal(e4.sheets.at(-1).stamp, 'HELD');
  assert.equal(gn.current, true);
  assert.equal(gn.sheets.at(-1).id, 'order:gnesta:3');
  assert.equal(gn.sheets.at(-2).id, 'report:gnesta:2', 'gårdagens rapport ligger under ordern');
  assert.deepEqual(s.enemies.sheets.filter(x => x.status !== 'REPORTED').map(x => x.type), ['walker', 'runner', 'brute']);
  assert.ok(s.intel?.text, 'What we face');
  assert.ok(!s.objects.includes('radio'), 'ingen sändning natten före Ishallen dag 3');
  assert.equal(s.zones.cap, deployCap(p, 'gnesta'));
  assert.equal(s.zones.battle.length + s.zones.rest.length, unitsIn(p, 'gnesta').length, 'ett kort per enhet');
});

test('saker kommer i kampanjens takt: fiendehögen efter första mötet, korten med förrådet', () => {
  const p1 = newCampaign();
  assert.equal(enemyPile(p1), null);
  const p2 = finishDay(p1, { mapId: 'riksvagen', day: 1, won: true, intelEarned: 0, report: { units: [] } }).progress;
  assert.deepEqual(enemyPile(p2).sheets.map(x => x.type), ['walker'], 'före operationskartan inga rapporterade typer');
  assert.equal(tableState(p2).zones, null);
  // Ishallen dag 2 vunnen: förrådet (depot) öppnar, korten och klämbrädan kommer
  const before = debugReach(newCampaign(), 'gnesta', 2), after = debugReach(newCampaign(), 'gnesta', 3);
  assert.equal(tableState(before).zones, null);
  assert.ok(tableState(after).zones);
  assert.ok(tableState(after).clipboard);
  // fiendens ruta sedd räknas som mött
  assert.ok(enemyPile(markSeen(newCampaign(), 'enemy:runner')).sheets.some(x => x.type === 'runner'));
});

test('högarnas ordning: order och rapport per dag i tidsordning, nyast överst', () => {
  const p = day6();
  for (const pl of missionPiles(p)) {
    let last = -1;
    for (const sh of pl.sheets) {
      if (sh.kind === 'closed') { assert.equal(sh, pl.sheets.at(-1), 'slutbladet ligger överst'); continue; }
      const k = campaignIndex(sh.map, sh.day) * 3 + ({ order: 0, lost: 1, report: 2 })[sh.kind];
      assert.ok(k > last, `${pl.id}: ${sh.id} i fel ordning`);
      last = k;
    }
  }
  // klick på en kant lägger bladet överst, resten behåller ordningen
  const order = ['a', 'b', 'c', 'd'].map(id => ({ id }));
  assert.deepEqual(bringToTop(order, 'b').map(x => x.id), ['a', 'c', 'd', 'b']);
  assert.deepEqual(bringToTop(order, 'zz').map(x => x.id), ['a', 'b', 'c', 'd']);
});

test('lägesrapporten: dagens egen text när den finns, annars ur dagens siffror', () => {
  let p = day6();
  const auto = reportSheet(p, 'gnesta', 2);
  assert.equal(auto.written, false);
  assert.ok(auto.lead && auto.text);
  p = recordDay(p, { mapId: 'gnesta', day: 2, kills: 212, waves: 5, lost: 3, saved: 9, total: 10 });
  const r = reportSheet(p, 'gnesta', 2);
  assert.match(r.text, /212 infected down in 5 waves/);
  assert.match(r.text, /We lost 3 men/);
  assert.match(r.text, /9 of 10 civilians/);
  assert.ok(words(`${r.lead} ${r.text}`) <= 60);
  const d = MAPS.gnesta.days[1];
  try {
    d.report = { from: 'MCF', text: 'The ice rink is safe and Vikingavägen is quiet.' };
    assert.equal(reportSheet(p, 'gnesta', 2).text, d.report.text);
    assert.equal(reportSheet(p, 'gnesta', 2).from, 'MCF');
    // radio blir en remsa, och rapportbladet skrivs ur siffrorna
    d.report = { from: 'P4 Sörmland', text: 'Roads east of Gnesta are closed.' };
    assert.equal(reportSheet(p, 'gnesta', 2).written, false);
    assert.ok(radioStrips(p).some(x => x.id === 'radio:gnesta:2'));
  } finally { delete d.report; }
});

test('radion: en remsa bara natten efter en dag med sändning, annars ingen (0.21.1)', () => {
  assert.deepEqual(radioStrips(newCampaign()), []);
  for (const r of RADIO) {
    const i = campaignIndex(...r.after) + 1;
    // dagen efter sändningen
    const p = debugReach(newCampaign(), ...nextOf(i));
    assert.deepEqual(radioStrips(p).map(x => x.id), [r.id], r.id);
  }
  // två dagar senare: ingen remsa
  assert.deepEqual(radioStrips(debugReach(newCampaign(), 'gnesta', 2)), []);
  assert.deepEqual(radioStrips(debugReach(newCampaign(), 'molnbo', 2)), []);
});
import { CAMPAIGN } from '../src/meta/table.js';
const nextOf = i => [CAMPAIGN[i].map, CAMPAIGN[i].day];

test('en förlorad dag får ett blad i högen med utfallet (0.21.1)', () => {
  let p = debugReach(newCampaign(), 'gnesta', 3);
  p = finishDay(p, { mapId: 'gnesta', day: 3, won: false, intelEarned: 0 }).progress;
  p = recordLoss(p, { mapId: 'gnesta', day: 3, kills: 120, cleared: 2, waves: 5, lostBy: 'base' });
  const pile = missionPiles(p).find(x => x.sector === 'gnesta');
  const top = pile.sheets.at(-1);
  assert.equal(top.kind, 'lost');
  assert.equal(top.lead, 'Day 6 lost.');   // 0.21.3 (H539): kampanjens dag (Ishallen dag 3 = dag 6)
  assert.equal(top.text, 'Try again at dawn.');
  assert.match(top.outcome, /2 of 5 waves held\. 120 infected down\. The base fell\./);
  assert.equal(pile.sheets.at(-2).id, 'order:gnesta:3');
  // vinner man dagen ligger förlustbladet kvar i historien, under rapporten
  const won = finishDay(p, { mapId: 'gnesta', day: 3, won: true, intelEarned: 0, report: { units: [] } }).progress;
  const ids = missionPiles(won).find(x => x.sector === 'gnesta').sheets.map(x => x.id);
  assert.ok(ids.indexOf('lost:gnesta:3') < ids.indexOf('report:gnesta:3'));
});

test('bordets yta: skalan minst MIN_SCALE, klämbrädan och korten inne i ytan (0.21.1)', () => {
  for (const [w, h] of [[1024, 614], [1440, 900], [1920, 1080], [1280, 720]]) {
    const f = frameFor(w, h);
    assert.ok(f.scale >= MIN_SCALE, `${w}x${h}`);
    assert.ok(f.W * f.scale <= w + 0.5 && f.H * f.scale <= h + 0.5, `${w}x${h}: ytan ryms`);
    assert.ok(f.clipY + 376 <= f.H - 12 && f.clipX + 212 <= f.W, `${w}x${h}: klämbrädan`);
    assert.ok(f.zoneY + 286 <= f.H - 12, `${w}x${h}: korten`);
  }
});

test('ordern: högst 12 ord, rapport och radio inom sina gränser, inga tankstreck', () => {
  for (const m of Object.values(MAPS)) for (const d of m.days) {
    const o = orderSheet(m.id, d.n ?? m.days.indexOf(d) + 1);
    assert.ok(words(o.text) <= 12, `${m.id} dag ${d.n}: ${o.text}`);
    if (d.report) assert.ok(words(d.report.text) <= 60, `${m.id} dag ${d.n}: rapporten`);
  }
  for (const r of RADIO) { assert.ok(words(r.text) <= 40, r.id); assert.doesNotMatch(r.text, /[—–]/); }
});

test('dra och släpp: läget sparas per föremål, hålls på bordet, och Tidy lägger tillbaka allt', () => {
  let p = day6();
  const s = tableState(p);
  assert.deepEqual(placeOf(p, s, 'pile:gnesta'), defaultPlace(s, 'pile:gnesta'));
  p = moveObject(p, 'pile:gnesta', 412.4, 90.6);
  assert.deepEqual(tableOf(p).layout['pile:gnesta'], { x: 412, y: 91 });
  assert.equal(placeOf(p, s, 'pile:gnesta').x, 412);
  assert.equal(placeOf(p, s, 'pile:gnesta').moved, true);
  // utanför bordet: hålls kvar så att det går att ta i
  p = moveObject(p, 'enemies', 99999, -99999);
  assert.ok(tableOf(p).layout.enemies.x < 1440 && tableOf(p).layout.enemies.y > -200);
  // sparas och läses tillbaka
  const st = fake();
  saveProgress(p, st);
  const q = loadProgress(st);
  assert.deepEqual(tableOf(q).layout, tableOf(p).layout);
  const t = tidy(q);
  assert.deepEqual(tableOf(t).layout, {});
  assert.deepEqual(placeOf(t, s, 'pile:gnesta'), defaultPlace(s, 'pile:gnesta'));
});

test('korten följer förrådets regler: taket, tomma enheter och bytet', () => {
  let p = debugReach(newCampaign(), 'molnbo', 1);
  const z = cardZones(p, 'molnbo'), L = lanes(p, 'molnbo');
  const ids = xs => xs.map(x => x.uid).sort((a, b) => a - b);
  assert.deepEqual(ids(z.battle), ids(L.battle));
  assert.deepEqual(ids(z.rest), ids(L.rest));
  assert.equal(new Set([...z.battle, ...z.rest].map(c => c.uid)).size, unitsIn(p, 'molnbo').length, 'ett kort per enhet, aldrig ×2');
  // full stridsbana: ett reservkort in nekas med förrådets skäl
  const out = L.rest.find(u => u.men == null || u.men > 0);
  assert.equal(setLane(p, out.uid, 'battle').reason, 'laneFull');
  // bytet: den i striden vilar, den i reserven går in, taket står
  const inn = L.battle[0];
  const r = swapCards(p, out.uid, inn.uid);
  assert.equal(r.ok, true);
  const L2 = lanes(r.progress, 'molnbo');
  assert.ok(L2.battle.some(u => u.uid === out.uid));
  assert.ok(L2.rest.some(u => u.uid === inn.uid));
  assert.equal(L2.battle.length, L.cap);
  // samma bana: inget byte
  assert.equal(swapCards(p, L.battle[0].uid, L.battle[1].uid).ok, false);
  // en grupp utan män går inte in, och framsteget står orört
  const squad = L.rest.find(u => u.men != null) ?? L.battle.find(u => u.men != null);
  p = { ...p, op: { ...p.op, units: p.op.units.map(u => (u.uid === squad.uid ? { ...u, men: 0, lane: 'rest' } : u)) } };
  const L3 = lanes(p, 'molnbo');
  const r2 = swapCards(p, squad.uid, L3.battle[0].uid);
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'noMen');
});

test('en sparfil från före bordet (v4 utan table) läses som förut och får ett tomt bord', () => {
  const old = debugReach(newCampaign(), 'molnbo', 2);
  delete old.table;
  const st = fake();
  st.setItem('horde.save', JSON.stringify(old));
  const p = loadProgress(st);
  assert.equal(p.v, 4);
  assert.deepEqual(p.maps, old.maps);
  assert.deepEqual(p.op.units, old.op.units);
  assert.equal(p.rp, old.rp);
  assert.deepEqual(tableOf(p), { layout: {}, log: {} });
  assert.equal(st.getItem('horde.save.broken'), null, 'ingen sparfil räknas som trasig');
  assert.equal(nextBattle(p).sector, 'molnbo');
  // trasigt bord: tvättas, resten av filen står
  st.setItem('horde.save', JSON.stringify({ ...old, table: { layout: { map: { x: 'a' }, 'pile:molnbo': { x: 10, y: 20 } }, log: 7 } }));
  const q = loadProgress(st);
  assert.deepEqual(q.table, { layout: { 'pile:molnbo': { x: 10, y: 20 } }, log: {} });
  assert.deepEqual(q.maps, old.maps);
  assert.deepEqual(normalizeTable('trasigt'), { layout: {}, log: {} });
});

// 0.21.3 (H539): kampanjens dag (src/meta/campaign-day.js) i stället för banans egen
test('dagens nummer: kampanjens dag, eller dagens eget campaignDay (kroken för kampanjbågen)', () => {
  assert.equal(campaignDay('riksvagen', 1), 1);
  assert.equal(campaignDay('gnesta', 1), 4);
  assert.equal(campaignDay('molnbo', 1), 14);
  const d = MAPS.molnbo.days[0];
  try { d.campaignDay = 8; assert.equal(campaignDay('molnbo', 1), 8); } finally { delete d.campaignDay; }
});

// ---------- 0.21.4 (H536, H537): fasta platser, flytt och byte, köp från klämbrädan ----------
import { cardSlots, moveCardTo, clickCard, buyCard, releasedCards, storeList, pinSlots } from '../src/meta/table.js';
const at = (S, uid) => (S.battle.includes(uid) ? ['battle', S.battle.indexOf(uid)] : ['rest', S.rest.indexOf(uid)]);

test('platserna: striden har exakt cap platser, varje enhet en plats, och de står still när ingen flyttar (0.21.4)', () => {
  const p = debugReach(newCampaign(), 'molnbo', 1), S = cardSlots(p, 'molnbo');
  assert.equal(S.battle.length, S.cap);
  const all = [...S.battle, ...S.rest].filter(x => x != null).sort((a, b) => a - b);
  assert.deepEqual(all, unitsIn(p, 'molnbo').map(u => u.uid).sort((a, b) => a - b));
  assert.deepEqual(cardSlots(pinSlots(p, 'molnbo'), 'molnbo'), S, 'sparade platser = samma bild');
});

test('en flytt rör bara kortet som flyttas; en upptagen plats byter de två (0.21.4)', () => {
  let p = debugReach(newCampaign(), 'molnbo', 1);
  const S0 = cardSlots(p, 'molnbo');
  // stridskort till en tom plats i reserven: alla andra står kvar
  const a = S0.battle[0], free = S0.rest.length;
  let r = moveCardTo(p, a, 'rest', free);
  assert.equal(r.ok, true);
  const S1 = cardSlots(r.progress, 'molnbo');
  assert.deepEqual(at(S1, a), ['rest', free]);
  for (const uid of [...S0.battle, ...S0.rest].filter(x => x != null && x !== a)) assert.deepEqual(at(S1, uid), at(S0, uid), `${uid} flyttade`);
  assert.equal(S1.battle[0], null, 'platsen står tom');
  // reservkort till den tomma platsen i striden
  const b = S1.rest[0];
  r = moveCardTo(r.progress, b, 'battle', 0);
  assert.equal(r.ok, true);
  assert.deepEqual(at(cardSlots(r.progress, 'molnbo'), b), ['battle', 0]);
  // byte i samma fält: bara platserna
  const S2 = cardSlots(r.progress, 'molnbo'), c = S2.battle[1], d = S2.battle[2];
  const r2 = moveCardTo(r.progress, c, 'battle', 2);
  assert.deepEqual(r2.moved.sort(), [c, d].sort());
  const S3 = cardSlots(r2.progress, 'molnbo');
  assert.deepEqual(at(S3, c), ['battle', 2]); assert.deepEqual(at(S3, d), ['battle', 1]);
  // byte mellan fälten: banorna byts, taket står
  const e = S3.rest.find(x => x != null), f = S3.battle[3];
  const r3 = moveCardTo(r2.progress, e, 'battle', 3);
  assert.equal(r3.ok, true);
  const S4 = cardSlots(r3.progress, 'molnbo');
  assert.deepEqual(at(S4, e), ['battle', 3]);
  assert.equal(at(S4, f)[0], 'rest');
  assert.equal(lanes(r3.progress, 'molnbo').battle.length, S4.cap);
  // platsen står kvar till nästa dag
  const won = finishDay(r3.progress, { mapId: 'molnbo', day: 1, won: true, intelEarned: 0, report: { units: [] } }).progress;
  // (nästa dags leverans kan lägga till ett kort på en ledig plats)
  const S5 = cardSlots(won, 'molnbo');
  for (const uid of [...S4.battle, ...S4.rest].filter(x => x != null)) assert.deepEqual(at(S5, uid), at(S4, uid), `${uid} efter dagen`);
});

test('klick = drag: reserv till första lediga i striden, strid till första lediga i reserven; full strid säger nej (0.21.4)', () => {
  let p = debugReach(newCampaign(), 'molnbo', 1);
  const S = cardSlots(p, 'molnbo'), r0 = S.rest.find(x => x != null);
  assert.equal(clickCard(p, r0).reason, 'laneFull');
  const b = S.battle[4];
  const r = clickCard(p, b);
  assert.deepEqual(at(cardSlots(r.progress, 'molnbo'), b), ['rest', S.rest.indexOf(null) < 0 ? S.rest.length : S.rest.indexOf(null)]);
  const r2 = clickCard(r.progress, r0);
  assert.deepEqual(at(cardSlots(r2.progress, 'molnbo'), r0), ['battle', 4]);
});

test('klämbrädan: släppta kort med pris, köp till en plats, ingen annan rör sig; förrådet med bock (0.21.4)', () => {
  let p = { ...debugReach(newCampaign(), 'molnbo', 1), rp: 0 };
  const cards = releasedCards(p, 'molnbo');
  assert.ok(cards.length > 0 && cards.every(c => !c.ok && c.reason === 'rp'), 'utan RP gråa');
  p = { ...p, rp: 2000 };
  const S0 = cardSlots(p, 'molnbo'), type = releasedCards(p, 'molnbo')[0].type, rp0 = p.rp;
  const r = buyCard(p, type, 'molnbo');
  assert.equal(r.ok, true);
  assert.ok(r.progress.rp < rp0);
  const S1 = cardSlots(r.progress, 'molnbo');
  assert.equal(at(S1, r.uid)[0], 'rest');
  for (const uid of [...S0.battle, ...S0.rest].filter(x => x != null)) assert.deepEqual(at(S1, uid), at(S0, uid));
  // köp rakt till en plats i striden (ett byte med kortet där)
  const type2 = releasedCards(r.progress, 'molnbo')[0]?.type;
  if (type2) {
    const old = S1.battle[0], r2 = buyCard(r.progress, type2, 'molnbo', 'battle', 0);
    assert.equal(r2.ok, true);
    const S2 = cardSlots(r2.progress, 'molnbo');
    assert.deepEqual(at(S2, r2.uid), ['battle', 0]);
    assert.equal(at(S2, old)[0], 'rest');
  }
  const ups = storeList(r.progress);
  assert.ok(ups.length > 0 && ups.every(u => u.name && u.effect));
});
