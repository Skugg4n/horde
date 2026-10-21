// Laxne-valet och Laxne som bana (0.24.0, H552). Kampanjplanen avsnitt 10 och Olas beslut 2026-10-20: efter Mölnbo dag 10
// visar bordet en order från MCF med två rutor, DEFEND LAXNE eller FALL BACK. Försvara: Laxne är kampanjens dag 11 (en dag,
// horden norrifrån längs 223 och Skottvångsvägen, skolan är basen, Klämmingen går inte att gå över), Björnlunda dag 12 och
// 13. Släppa: ingen strid, truppen sparad, färre RP och en större första våg i Björnlunda dag 11. Kartan ur OSM
// (src/data/laxne.js, tests/laxne.test.js), det spelbara i src/data/laxne-play.js, valet i src/data/choices.js.
// Balansen: docs/balance-log.md, Laxne 0.24.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAPS } from '../src/data/maps.js';
import { laxnePlay as lx, SPAWNS, SCHOOL, EVAC_HOMES, CRISP, inLake } from '../src/data/laxne-play.js';
import { CHOICES } from '../src/data/choices.js';
import { distPolyline } from '../src/data/osm-map.js';
import { placementFor, KIND } from '../src/sim/placement.js';
import { routeFor } from '../src/sim/route.js';
import { createSim, build, evacPath, houseDoor, housesFor } from '../src/sim/sim.js';
import { campaignDayOf, shownDay, setChoices, campaignDay as progressDay } from '../src/meta/campaign-day.js';
import { STAGES, featuresFor } from '../src/meta/unlocks.js';
import { LESSONS } from '../src/data/lessons.js';
import { SECTOR_TABLE, ADDRESSEE } from '../src/data/table.js';
import { SECTORS, RELEASES } from '../src/data/depot.js';
import { newCampaign, debugReach, unitsIn, finishDay, sectorStatus, makeChoice, canChoose, dayFor, opStartConfig, syncOperation } from '../src/meta/operation.js';
import { mapUnlocked, choiceOf, choicePending, normalizeChoices } from '../src/meta/progress.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { nextBattle, choiceSheet, missionPiles, radioStrips, tableState } from '../src/meta/table.js';
import { ARRIVAL_TROOP } from '../src/data/arrival.js';
import { laxneCampaign, laxneArrival, lxAttempts, lxPrints, bjornlundaCampaign, blAttempts, blPrints } from '../scripts/balance.mjs';

const route = routeFor(lx), g = route.grid, p = placementFor(lx);
const daySpawns = d => [...new Set(d.waves.flatMap(w => w.groups.map(q => q.spawn)))].sort();
const words = s => s.trim().split(/\s+/).length;
// Mölnbo dag 3 vunnen: valet väntar på bordet
const atChoice = () => finishDay(debugReach(newCampaign(), 'molnbo', 3), { mapId: 'molnbo', day: 3, won: true, intelEarned: 10, report: { units: [] } }).progress;
const winDay = (q, mapId, day) => finishDay(q, { mapId, day, won: true, intelEarned: 10, report: { units: [] } }).progress;

test('Laxne är en valfri bana efter Mölnbo: en dag, kort intro som säger varifrån de kommer, slutet pekar mot Björnlunda', () => {
  assert.equal(MAPS.laxne, lx);
  assert.equal(lx.days.length, 1);
  assert.deepEqual(lx.unlock, { map: 'molnbo', day: 3, choice: ['laxne', 'defend'] });
  const d = lx.days[0];
  assert.match(d.intro.title, /^Day \d: /);
  assert.ok(words(d.intro.text) <= 12, d.intro.text);
  assert.match(d.intro.text, /223/);
  assert.match(d.intro.text, /Mariefred/);
  assert.match(d.intro.text, /Skottvångsvägen/);
  assert.doesNotMatch(d.intro.text, /\b(west|east|north|south)\b/i);
  assert.ok(words(d.order.text) <= 12, d.order.text);
  assert.match(d.order.text, /Laxne skola/);
  // ungefär fyra vågor, en evakuering till skolan
  assert.equal(d.waves.length, 4);
  assert.ok(d.evac?.all && d.evac.need > 0);
  // slutet läses som en vinst och pekar mot Björnlunda
  assert.match(lx.outro.text, /held/);
  assert.match(lx.outro.text, /Björnlunda/);
  assert.ok(!lx.outro.withdraw);
  for (const s of [JSON.stringify(d), lx.outro.text, JSON.stringify(CHOICES)]) assert.doesNotMatch(s, /—/);
  // Olas beslut: ingen Fjäderfabriken
  assert.ok(!lx.buildings.some(b => b.kind === 'fjaderfabriken'));
  assert.ok(!lx.labels.some(l => /Fjäderfabriken/.test(l.text)) && !lx.pois.some(q => /Fjäderfabriken/.test(q.name)));
});

test('ingångarna: väg 223 och Skottvångsvägen norrifrån, i dimkanten; skolan är basen längst söderut', () => {
  assert.deepEqual(SPAWNS.map(s => s.id), ['n', 'nw']);
  assert.deepEqual(daySpawns(lx.days[0]), ['n', 'nw']);
  for (const s of SPAWNS) {
    assert.ok(s.at[1] < CRISP.z0, `${s.id} i norr`);
    assert.ok(s.at[0] < CRISP.x0 || s.at[0] > CRISP.x1 || s.at[1] < CRISP.z0 || s.at[1] > CRISP.z1, `${s.id} i diset`);
  }
  assert.ok(distPolyline(...SPAWNS[0].at, lx.roads.find(r => r.id === 'laxnevagen-2').pts) < 1, 'n på Laxnevägen (223)');
  assert.ok(distPolyline(...SPAWNS[1].at, lx.roads.find(r => r.id === 'skottvangsvagen-3').pts) < 1, 'nw på Skottvångsvägen');
  assert.ok(Math.hypot(SPAWNS[0].at[0] - SPAWNS[1].at[0], SPAWNS[0].at[1] - SPAWNS[1].at[1]) > 25, 'två skilda ingångar');
  assert.equal(lx.baseModel, 'rink');
  assert.equal(lx.iceRink, SCHOOL);
  assert.equal(lx.baseLabel, 'Laxne skola · Base');
  const school = lx.buildings.find(b => b.kind === 'laxneSchool');
  assert.ok(Math.hypot(SCHOOL.x - school.x, SCHOOL.z - school.z) < 0.01);
  assert.ok(Math.hypot(SCHOOL.entrance[0] - lx.base.at[0], SCHOOL.entrance[1] - lx.base.at[1]) < 4, 'basen vid entrén');
  const [bx, bz] = g.center(g.base[0]);
  assert.ok(Math.hypot(bx - lx.base.at[0], bz - lx.base.at[1]) < 4, 'basrutan på skolgården');
  assert.ok(lx.base.at[1] - Math.max(...SPAWNS.map(s => s.at[1])) > 400, 'skolan i söder');
});

test('vägarna: från båda ingångarna till skolan, och Klämmingen går inte att gå över eller ställa något i', () => {
  const sim = createSim({ map: lx, day: 1, cash: 0, seed: 1 });
  for (const id of ['n', 'nw']) {
    const [ps] = sim.route.paths([id]);
    assert.ok(ps.reaches && ps.through == null, id);
    assert.ok(ps.cells.length > 200, `${id}: ${ps.cells.length} rutor`);
  }
  let lake = 0;
  for (let k = 0; k < p.n; k++) {
    const c = p.center(k);
    if (c.x < CRISP.x0 || c.x > CRISP.x1 || c.z < CRISP.z0 || c.z > CRISP.z1 || !inLake(c.x, c.z)) continue;
    lake++;
    assert.ok(!p.walk[k], `gångbart i sjön vid ${c.x} ${c.z}`);
    assert.equal(p.kind[k], KIND.water, `sjön vid ${c.x} ${c.z}`);
  }
  assert.ok(lake > 500, `${lake} rutor sjö på spelytan`);
  // en Ksp 90 går inte att ställa i sjön
  const k = [...Array(p.n).keys()].find(q => p.kind[q] === KIND.water);
  assert.equal(build(createSim({ map: lx, day: 1, cash: 99999 }), k, 'm249').ok, false);
});

test('husen och evakueringen: de markerade husen går de gula linjerna till skolan, alla inom cirka 100 m och isär', () => {
  const sim = createSim({ map: lx, day: 1, cash: 99999, depth: true });
  assert.ok(housesFor(sim).length >= 40, `${housesFor(sim).length} hus`);
  assert.ok(!housesFor(sim).some(h => h.kind === 'laxneSchool'), 'skolan går inte att besätta');
  const ev = lx.days[0].evac;
  // isär, så att lapparna ("Evacuates · wave N") inte hamnar på varandra (layoutprovet)
  const hs = EVAC_HOMES.map(id => lx.buildings.find(b => b.id === id));
  for (const a of hs) for (const b of hs) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 30, `${a.id} ${b.id}`);
  assert.equal(new Set(EVAC_HOMES).size, EVAC_HOMES.length);
  for (const q of ev.groups) {
    const h = lx.lots.plots.find(x => x.id === q.house)?.house;
    assert.ok(h && h.kind === 'villa', q.house);
    assert.ok(Math.hypot(h.x - SCHOOL.x, h.z - SCHOOL.z) < 105, q.house);
    assert.ok(sim.route.validCell(houseDoor(lx, q.house, sim.route).cell), `${q.house}: dörren vid en gata`);
    const line = evacPath(sim, q.house), end = line.at(-1);
    assert.ok(line.length > 10 && Math.hypot(end[0] - lx.base.at[0], end[1] - lx.base.at[1]) < 6, `${q.house}: linjen till skolan`);
  }
});

test('valet: efter Mölnbo dag 10 väntar ordern med två rutor på bordet; inget nästa slag förrän spelaren valt', () => {
  const before = debugReach(newCampaign(), 'molnbo', 3);
  assert.equal(choicePending(before, 'laxne'), false);
  assert.equal(canChoose(before, 'laxne', 'defend').reason, 'not yet');
  const q = atChoice();
  assert.equal(choicePending(q, 'laxne'), true);
  assert.equal(mapUnlocked(q, 'laxne'), false);
  assert.equal(mapUnlocked(q, 'bjornlunda'), false);
  assert.equal(nextBattle(q), null);
  const sh = choiceSheet(q);
  assert.equal(sh.text, 'Laxne asks for help. Defend it, or fall back to Björnlunda.');
  assert.equal(sh.from, 'MCF');
  assert.equal(sh.n, 10);
  assert.deepEqual(sh.options.map(o => o.label), ['DEFEND LAXNE', 'FALL BACK']);
  for (const o of sh.options) assert.ok(words(o.means) <= 16, o.means);
  // 0.24.1 (H555): priset under varje ruta från början, i siffror, högst 12 ord
  const cost = Object.fromEntries(sh.options.map(o => [o.id, o.cost]));
  assert.equal(cost.defend, 'One day. Your troops tire.');
  assert.equal(cost.fallback, `−${Math.min(q.rp, CHOICES.laxne.options[1].rp)} RP. Bigger first wave at Björnlunda.`);
  for (const o of sh.options) assert.ok(words(o.cost) <= 12, o.cost);
  assert.equal(choiceSheet({ ...q, rp: 0 }).options[1].cost, 'Bigger first wave at Björnlunda.', 'utan RP: ingen summa');
  assert.equal(canChoose(q, 'laxne', 'surrender').reason, 'unknown');
  // bordet ligger kvar under (kartan, högarna)
  assert.ok(tableState(q).objects.includes('map'));
});

test('DEFEND LAXNE: Laxne är dag 11 med truppen från Mölnbo och byns jägare, Björnlunda dag 12 och 13 efter Laxne', () => {
  const q0 = atChoice(), rp = q0.rp, n = q0.op.units.length;
  const r = makeChoice(q0, 'laxne', 'defend');
  assert.ok(r.ok && r.cost === 0);
  let q = r.progress;
  assert.equal(q.rp, rp, 'ingen kostnad');
  assert.equal(choiceOf(q, 'laxne'), 'defend');
  assert.equal(makeChoice(q, 'laxne', 'fallback').reason, 'chosen', 'valet går inte att ändra');
  assert.equal(mapUnlocked(q, 'laxne'), true);
  assert.equal(mapUnlocked(q, 'bjornlunda'), false, 'Björnlunda efter Laxne');
  assert.equal(choiceSheet(q), null);
  const nb = nextBattle(q);
  assert.deepEqual([nb.map, nb.day, nb.n], ['laxne', 1, 11]);
  assert.equal(unitsIn(q, 'laxne').length, n + 2, 'truppen och två grupper jägare');
  const msg = q.op.inbox.find(m => m.id === 'lx-1');
  assert.ok(msg && /Laxne skola/.test(msg.text) && words(msg.text) <= 20);
  q = winDay(q, 'laxne', 1);
  assert.equal(sectorStatus(q, 'laxne'), 'held');
  assert.equal(mapUnlocked(q, 'bjornlunda'), true);
  const nb2 = nextBattle(q);
  assert.deepEqual([nb2.map, nb2.day, nb2.n], ['bjornlunda', 1, 12]);
  // Laxnes Hemvärn följer med (två grupper och en Ksp 90, bara efter DEFEND), byns jägare i Björnlunda som förut
  assert.ok(q.op.released.includes('bl-lx') && q.op.released.includes('bl-1'));
  assert.equal(unitsIn(q, 'bjornlunda').length, n + 2 + 3 + 2);
  assert.equal(campaignDayOf('bjornlunda', 1, q.choices), 12);
  assert.equal(campaignDayOf('bjornlunda', 2, q.choices), 13);
  assert.equal(progressDay(q, 'bjornlunda'), 12);
  // ingen lägesrapport om Laxne och ingen radio om byn; dag 1 i Björnlunda som den är
  assert.ok(!missionPiles(q).flatMap(x => x.sheets).some(s => s.id === 'report:choice:laxne'));
  assert.deepEqual(radioStrips(q), []);
  assert.equal(dayFor(q, 'bjornlunda', 1), MAPS.bjornlunda.days[0]);
});

test('FALL BACK: ingen strid, truppen sparad, RP dras, lägesrapporten och radion, Björnlunda dag 11 med större första våg', () => {
  const q0 = { ...atChoice(), rp: 400 }, n = q0.op.units.length;
  const opt = CHOICES.laxne.options.find(o => o.id === 'fallback');
  assert.ok(opt.rp > 0);
  const r = makeChoice(q0, 'laxne', 'fallback');
  assert.ok(r.ok);
  const q = r.progress;
  assert.equal(q.rp, 400 - opt.rp, 'den angivna summan');
  assert.equal(q.choiceRp.laxne, opt.rp);
  assert.equal(mapUnlocked(q, 'laxne'), false, 'Laxne spelas aldrig');
  assert.equal(sectorStatus(q, 'laxne'), 'locked');
  const nb = nextBattle(q);
  assert.deepEqual([nb.map, nb.day, nb.n], ['bjornlunda', 1, 11]);
  assert.equal(unitsIn(q, 'bjornlunda').length, n + 2, 'hela truppen och byns jägare');
  assert.ok(!q.op.released.includes('bl-lx'));
  // lägesrapporten på Björnlundas hög, under ordern för dag 11
  const pile = missionPiles(q).find(x => x.sector === 'bjornlunda');
  assert.deepEqual(pile.sheets.map(s => s.id), ['report:choice:laxne', 'order:bjornlunda:1']);
  const rep = pile.sheets[0];
  assert.equal(rep.lead, 'Laxne is on its own.');
  // 0.24.1 (H556): kort, summan först, och den ligger bredvid ordern (beside), inte under
  assert.equal(`${rep.lead} ${rep.text}`, `Laxne is on its own. ${opt.rp} RP lost. Expect a bigger first wave.`);
  assert.equal(rep.beside, true);
  // kartan: Laxne kryssad ("lost"), bara i den här grenen
  assert.deepEqual(tableState(q).lost, ['laxne']);
  assert.deepEqual(tableState(makeChoice(atChoice(), 'laxne', 'defend').progress).lost, []);
  const radio = radioStrips(q);
  assert.equal(radio.length, 1);
  assert.match(radio[0].text, /Laxne/);
  assert.ok(words(radio[0].text) <= 40);
  // första vågen en fjärdedel större (dataflaggan), bara den
  const base = MAPS.bjornlunda.days[0], d = dayFor(q, 'bjornlunda', 1);
  assert.deepEqual([base.choiceMod.choice, base.choiceMod.firstWave], [['laxne', 'fallback'], 1.25]);
  // 0.24.1 (H556): introt i den grenen säger den större vågen (högst 12 ord, gatorna kvar), annars som förut
  assert.match(d.intro.text, /bigger first wave/);
  assert.match(d.intro.text, /Stjärnhov/);
  assert.ok(words(d.intro.text) <= 12, d.intro.text);
  assert.equal(d.intro.title, base.intro.title);
  assert.doesNotMatch(base.intro.text, /Laxne/);
  assert.deepEqual(d.waves[0].groups.map(x => x.count), base.waves[0].groups.map(x => Math.ceil(x.count * 1.25)));
  assert.deepEqual(d.waves.slice(1), base.waves.slice(1));
  assert.ok(opStartConfig(q, 1, 'bjornlunda').dayCfg, 'dagen som valet gjort den går till simuleringen');
  assert.equal(opStartConfig(q, 2, 'bjornlunda').dayCfg, undefined);
  const sim = createSim({ ...opStartConfig(q, 1, 'bjornlunda'), seed: 1 });
  assert.deepEqual(sim.dayCfg.waves[0].groups.map(x => x.count), d.waves[0].groups.map(x => x.count));
  assert.equal(dayFor(q, 'bjornlunda', 2), MAPS.bjornlunda.days[1]);
  assert.equal(campaignDayOf('bjornlunda', 1, q.choices), 11);
  assert.equal(campaignDayOf('bjornlunda', 2, q.choices), 12);
  // RP räcker inte: det som finns dras, aldrig under noll
  const poor = makeChoice({ ...atChoice(), rp: 40 }, 'laxne', 'fallback');
  assert.equal(poor.progress.rp, 0);
  assert.equal(poor.cost, 40);
});

test('kampanjens dag i båda grenarna (HUD, intro, bordet): Laxne 11; Björnlunda 11 och 12, eller 12 och 13 efter Laxne', () => {
  assert.equal(campaignDayOf('laxne', 1), 11);
  assert.equal(campaignDayOf('laxne', 2), null);
  assert.equal(campaignDayOf('molnbo', 3), 10);
  assert.equal(campaignDayOf('bjornlunda', 1, {}), 11);
  assert.equal(campaignDayOf('bjornlunda', 1, { laxne: 'fallback' }), 11);
  assert.equal(campaignDayOf('bjornlunda', 1, { laxne: 'defend' }), 12);
  assert.equal(campaignDayOf('bjornlunda', 2, { laxne: 'defend' }), 13);
  try {
    // spelets framsteg (main.js setChoices efter varje sparning): HUD:en och introt följer valet
    setChoices({ laxne: 'defend' });
    assert.equal(shownDay('bjornlunda', 1), 12);
    assert.equal(shownDay('laxne', 1), 11);
    setChoices({ laxne: 'fallback' });
    assert.equal(shownDay('bjornlunda', 2), 12);
  } finally { setChoices({}); }
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /function save\(\) \{\n {2}setChoices\(progress\.choices\);/);
});

test('sparfilen: valet sparas, tvättas och en gammal fil som redan stod i Björnlunda har inget val att göra', () => {
  const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  const s = mem(), q = makeChoice(atChoice(), 'laxne', 'defend').progress;
  saveProgress(q, s);
  const back = loadProgress(s);
  assert.equal(choiceOf(back, 'laxne'), 'defend');
  assert.equal(nextBattle(back).map, 'laxne');
  // trasiga värden tas bort, inget annat rörs
  const n = normalizeChoices({ ...q, choices: { laxne: 'maybe', other: 'x' }, choiceRp: { laxne: -5 } });
  assert.deepEqual(n.choices, {});
  assert.deepEqual(n.choiceRp, {});
  assert.deepEqual(n.maps, q.maps);
  const plain = newCampaign();
  assert.equal(normalizeChoices(plain), plain, 'en fil utan val lämnas som den är');
  // 0.23.x: Mölnbo vunnen och leveransen bl-1 redan given, inget val i filen. Björnlunda står öppen, inget val väntar,
  // Laxne öppnar inte, ingen kostnad.
  const old = atChoice();
  const legacy = syncOperation({ ...old, op: { ...old.op, released: [...old.op.released, 'bl-1'] } });
  assert.equal(choicePending(legacy, 'laxne'), false);
  assert.equal(mapUnlocked(legacy, 'bjornlunda'), true);
  assert.equal(mapUnlocked(legacy, 'laxne'), false);
  assert.equal(nextBattle(legacy).map, 'bjornlunda');
  assert.equal(nextBattle(legacy).n, 11);
  assert.equal(dayFor(legacy, 'bjornlunda', 1), MAPS.bjornlunda.days[0]);
});

test('kopplingen: bordets markör och mottagare, sektorn, leveranserna, inlärningen (inget nytt), Quick jump', () => {
  assert.ok(SECTOR_TABLE.laxne?.place === 'laxne' && ADDRESSEE.laxne === 'Commander, Laxne');
  assert.ok(SECTORS.find(s => s.id === 'laxne')?.maps.includes('laxne'));
  for (const r of RELEASES.filter(x => x.map === 'laxne' || x.id === 'bl-lx')) assert.ok(words(r.text) <= 20, r.id);
  assert.deepEqual(RELEASES.find(r => r.id === 'bl-lx').choice, ['laxne', 'defend']);
  const i = STAGES.findIndex(s => s.id === 'lx-1');
  assert.ok(i > STAGES.findIndex(s => s.id === 'mb-3') && i < STAGES.findIndex(s => s.id === 'bl-1'));
  assert.deepEqual(STAGES[i].adds, []);
  assert.ok(!LESSONS['lx-1']);
  assert.deepEqual([...featuresFor('laxne', 1)].sort(), [...featuresFor('molnbo', 3)].sort());
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /\['laxne', 1\]/);
  assert.match(readFileSync(new URL('../src/ui/debug.js', import.meta.url), 'utf8'), /laxne: 'Laxne'/);
  // hoppet till Laxne gör valet DEFEND och ger truppen balansen räknar med
  const q = debugReach(newCampaign(), 'laxne', 1);
  assert.equal(choiceOf(q, 'laxne'), 'defend');
  assert.deepEqual(unitsIn(q, 'laxne').map(u => [u.type, u.level]), ARRIVAL_TROOP.laxne.units.map(([t, l]) => [t, l]));
  // hoppet till Björnlunda utan val: FALL BACK (utan kostnaden)
  assert.equal(choiceOf(debugReach(newCampaign(), 'bjornlunda', 1), 'laxne'), 'fallback');
  // src/ui/table.js rörs inte: valet ritas av src/ui/choice.js
  assert.doesNotMatch(readFileSync(new URL('../src/ui/table.js', import.meta.url), 'utf8'), /choice/i);
});

// Balansen (docs/balance-log.md, Laxne 0.24.0). Spelaren kommer med det kartläsaren har efter Mölnbo och valde DEFEND.
const SEEDS = [0, 1, 2, 3, 4].map(o => o * 7919);
const lxSkilled = SEEDS.map(s => laxneCampaign('lxSkilled', { seedOffset: s, maxAttempts: 6 }));
const lxNormal = SEEDS.map(s => laxneCampaign('lxNormal', { seedOffset: s, maxAttempts: 6 }));
const blDefSkilled = SEEDS.map(s => bjornlundaCampaign('blSkilled', { seedOffset: s, maxAttempts: 6, choice: 'defend' }));
const blDefNormal = SEEDS.map(s => bjornlundaCampaign('blNormal', { seedOffset: s, maxAttempts: 6, choice: 'defend' }));
const blDefNear = SEEDS.map(s => bjornlundaCampaign('blNear', { seedOffset: s, maxAttempts: 6, choice: 'defend' }));

// Dagen: vägen är cirka 700 m (remsan och byn), och den som står vid skolan som ordern säger skjuter först när horden är
// nära; högst åtta minuter (den vanliga spelaren cirka sju). En fråga till speltestet.
test('balans Laxne: kartläsaren vinner på första försöket, den vanliga spelaren inom tre; de civila in, dagen högst 8 minuter', () => {
  for (const [i, r] of lxSkilled.entries()) { assert.equal(r.stuck, null, `lxSkilled seed ${i}`); assert.deepEqual(lxAttempts(r.log), [1], `lxSkilled seed ${i}`); }
  for (const [i, r] of lxNormal.entries()) { const a = lxAttempts(r.log); assert.equal(r.stuck, null, `lxNormal seed ${i}: ${a}`); assert.ok(a[0] >= 1 && a[0] <= 3, `lxNormal seed ${i}: ${a}`); }
  const all = [...lxSkilled, ...lxNormal].flatMap(r => r.log);
  for (const x of all.filter(q => q.won)) {
    assert.ok(x.evac.safe >= lx.days[0].evac.need, `${x.evac.safe}`);
    assert.ok(x.time <= 480, `${x.time} s`);
  }
  for (const x of all) assert.ok(x.peakWaves <= 2 && x.peak <= 250, `${x.peakWaves} vågor, ${x.peak} levande`);
});

test('balans Björnlunda efter DEFEND LAXNE (dag 12 och 13): kartläsaren på första försöket, den vanliga och den vid basen inom tre', () => {
  for (const [i, r] of blDefSkilled.entries()) { assert.equal(r.stuck, null, `seed ${i}`); assert.deepEqual(blAttempts(r.log), [1, 1], `blSkilled seed ${i}`); }
  for (const rs of [blDefNormal, blDefNear]) for (const [i, r] of rs.entries()) {
    const a = blAttempts(r.log);
    assert.equal(r.stuck, null, `seed ${i}: ${a}`);
    for (const x of a) assert.ok(x >= 1 && x <= 3, `seed ${i}: ${a}`);
  }
});

test('hoppet till Laxne (Quick jump) har truppen och forskningen balansen räknar med', () => {
  const a = laxneArrival(0);
  assert.deepEqual(ARRIVAL_TROOP.laxne.units, unitsIn(a, 'laxne').map(u => [u.type, u.level, u.men ?? null, u.wins ?? 0]), 'kör om balansen och skriv in truppen i src/data/arrival.js');
  assert.deepEqual(ARRIVAL_TROOP.laxne.research, a.research);
});

// Kvittot. Ett ändrat steg ska vara avsiktligt och förklarat i docs/balance-log.md (Laxne).
// 0.24.0 (H552, efter sammanslagningen med 0.23.3: bounty 0,75/0,7, bjässarnas svans, dag 1 hp 7,25): första kvittot, Laxne hp 7, fart 2,2; Björnlunda i grenen DEFEND LAXNE med Laxnes Hemvärn och en Ksp 90 (bl-lx).
const pr = (f, rs) => f([].concat(...rs.map((r, i) => r.log.map(x => ({ ...x, seed: i })))));
test('balans: fingeravtrycket (Laxne, och Björnlunda efter DEFEND LAXNE)', () => {
  assert.deepEqual(pr(lxPrints, lxSkilled), { 'laxne 1': '336fa851' });
  assert.deepEqual(pr(lxPrints, lxNormal), { 'laxne 1': '1926d646' });
  assert.deepEqual(pr(blPrints, blDefSkilled), { 'bjornlunda 1': 'd2d84a21', 'bjornlunda 2': 'b429b011' });
  assert.deepEqual(pr(blPrints, blDefNormal), { 'bjornlunda 1': '62de394f', 'bjornlunda 2': '4d87a09b' });
});
