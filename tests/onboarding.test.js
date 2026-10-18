// Inlärningen (0.16.0, docs/superpowers/specs/2026-10-16-onboarding-design.md): upplåsningen dag för dag,
// sparfilens migrering, E4 dag 1:s markerade platser och den sena Ksp 90, och att simuleringen nekar det som
// inte är upplåst.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, featuresFor, metaFeatures, furthestPlayed, stageIndex } from '../src/meta/unlocks.js';
import { lessonsFor, withLessons, markSeen, isSeen, shows, setMode, resetTips, manualUnlocked, manualNew, markRead, markAllSeen } from '../src/meta/lessons.js';
import { LESSONS, TIPS, ENEMIES, MANUAL } from '../src/data/lessons.js';
import { newCampaign, debugReach, finishDay, opStartConfig } from '../src/meta/operation.js';
import { loadProgress, saveProgress } from '../src/meta/save.js';
import { createSim, startWave, step, build, checkSpot, placeAcross, rotateGun, callNextWave, buySupply } from '../src/sim/sim.js';
import { buyState } from '../src/sim/buy.js';
import { MAPS } from '../src/data/maps.js';

const words = t => t.replace(/\{[a-z]+\}/g, 'N').split(/\s+/).filter(w => /[A-Za-z]/.test(w)).length;
const memory = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('ett nytt begrepp per dag: E4 dag 1 har bara pjäsen, starten och basen', () => {
  assert.deepEqual([...featuresFor('riksvagen', 1)].sort(), ['base', 'place', 'start']);
  const add = (m, d) => [...featuresFor(m, d)].filter(f => !featuresFor(...prev(m, d)).has(f));
  const prev = (m, d) => (d > 1 ? [m, d - 1] : ['riksvagen', 1]);
  // 0.16.4 (Olas feedback, E4 dag 2): Move kommer dag 2 när Södertälje är på väg, fartknappen dag 3
  assert.deepEqual(add('riksvagen', 2).sort(), ['manual', 'move', 'supplies', 'wire']);
  assert.deepEqual(add('riksvagen', 3).sort(), ['aim', 'rotate', 'speed']);
  assert.ok(featuresFor('gnesta', 1).has('evac') && !featuresFor('gnesta', 1).has('block'));
  assert.ok(featuresFor('gnesta', 2).has('block') && !featuresFor('gnesta', 2).has('depot'));
  assert.ok(featuresFor('gnesta', 3).has('levels') && !featuresFor('gnesta', 3).has('requisition'));
  // 0.16.4 (speltestet av 0.16.2): dag 3 utan nya funktioner, de vilande husen dag 4, Next wave med bonus dag 5,
  // förnödenheterna på enheten Vikingavägen dag 1
  // 0.18.0: sanity-mätaren kommer med Hemvärnet (kampanjplanens dag 6)
  assert.deepEqual([...featuresFor('gnesta', 3)].filter(f => !featuresFor('gnesta', 2).has(f)).sort(), ['depot', 'levels', 'rp', 'sanity']);
  // 0.18.0 (strategiskt djup, skiva 1): ett begrepp ur djupet per dag, i kampanjplanens ordning på dagarna som finns
  const fresh = (m, d, pm, pd) => [...featuresFor(m, d)].filter(f => !featuresFor(pm, pd).has(f)).sort();
  assert.ok(featuresFor('gnesta', 2).has('crossfire') && !featuresFor('gnesta', 1).has('crossfire'));
  assert.deepEqual(fresh('gnesta-norr', 4, 'gnesta-norr', 3), ['fatigue', 'target']);
  assert.deepEqual(fresh('gnesta-norr', 5, 'gnesta-norr', 4), ['garrison']);
  assert.deepEqual(fresh('molnbo', 1, 'gnesta-norr', 5), ['rout']);
  assert.deepEqual(fresh('molnbo', 2, 'molnbo', 1), []);
  assert.deepEqual(fresh('molnbo', 4, 'molnbo', 3), ['holdFire']);
  assert.deepEqual(fresh('molnbo', 5, 'molnbo', 4), ['overrun']);
  assert.ok(featuresFor('gnesta', 4).has('dormant') && featuresFor('gnesta', 4).has('requisition') && !featuresFor('gnesta', 4).has('upgrades'));
  assert.ok(featuresFor('gnesta', 5).has('early') && featuresFor('gnesta', 5).has('upgrades') && !featuresFor('gnesta', 5).has('unitSupplies'));
  assert.ok(featuresFor('gnesta-norr', 1).has('unitSupplies') && featuresFor('gnesta-norr', 2).has('car') && !featuresFor('gnesta-norr', 1).has('car'));
  assert.ok(featuresFor('gnesta-norr', 3).has('frontage') && !featuresFor('gnesta-norr', 2).has('frontage'));
  // en okänd bana (provbanorna) har allt
  assert.ok(featuresFor('straight', 1).has('move'));
  // dagarna i schemat står i kampanjens ordning, en per dag på varje bana
  for (const id of Object.keys(MAPS)) MAPS[id].days.forEach(d => assert.ok(STAGES.some(s => s.map === id && s.day === d.n), `${id} ${d.n}`));
});

test('mellan dagarna: kartan efter E4, förrådet efter South dag 2, och sedan en del i taget', () => {
  let p = newCampaign();
  assert.ok(!metaFeatures(p).has('opmap'));
  p = debugReach(p, 'gnesta', 1);
  assert.ok(metaFeatures(p).has('opmap') && !metaFeatures(p).has('depot'));
  p = debugReach(p, 'gnesta', 3);
  assert.ok(metaFeatures(p).has('depot') && metaFeatures(p).has('levels') && !metaFeatures(p).has('requisition'));
  p = debugReach(p, 'gnesta', 4);
  assert.ok(metaFeatures(p).has('requisition') && !metaFeatures(p).has('upgrades'));
  p = debugReach(p, 'gnesta', 5);
  assert.ok(metaFeatures(p).has('upgrades') && metaFeatures(p).has('return'));
  // 0.16.0 (Olas beslut, "Gnesta = en sektor"): omplaceringen mellan sektorer är vilande
  assert.ok(!metaFeatures(p).has('sectors'));
});

test('texterna: högst 12 ord per steg och tips, 40 per uppslag, inga tankstreck', () => {
  for (const ls of Object.values(LESSONS)) for (const l of ls) {
    // 0.19.0 (H443): också mb-2.houses (förut Olas text på 19 ord, med undantag)
    assert.ok(words(l.text) <= 12, `${l.id}: ${l.text}`);
    assert.doesNotMatch(l.text, /\u2014/);
    assert.ok(['step', 'show', 'caption'].includes(l.kind), l.id);
  }
  for (const t of TIPS) assert.ok(words(t.text) <= 12, t.id);
  for (const m of MANUAL) { assert.ok(words(m.text) <= 40, `${m.id} ${words(m.text)}`); assert.doesNotMatch(m.text, /\u2014|\$|%|\bhp\b/); }
  for (const e of Object.values(ENEMIES)) assert.ok(stageIndex(e.stage) >= 0);
  // varje uppslag som ett steg pekar på finns
  for (const ls of Object.values(LESSONS)) for (const l of ls) if (l.manual) assert.ok(MANUAL.some(m => m.id === l.manual), l.manual);
});

// Avsnitt 5.4 och risk 5: en spelare mitt i kampanjen får inte dag 1-stegen igen eller dolda delar tillbaka.
test('sparfilens migrering: allt fram till den längst spelade dagen räknas som sett och upplåst', () => {
  // en ny kampanj: inget sett
  assert.deepEqual(lessonsFor(newCampaign()).seen, []);
  // en gammal sparfil på South dag 3 (dag 3 spelad en gång och förlorad)
  let p = debugReach(newCampaign(), 'gnesta', 3);
  p = finishDay(p, { mapId: 'gnesta', day: 3, won: false, intelEarned: 60 }).progress;
  const { lessons, ...old } = p; void lessons;
  assert.equal(furthestPlayed(old), stageIndex('gn-3'));
  const l = lessonsFor(old);
  for (const id of ['e4-1.pick', 'e4-2.wire', 'e4-3.rotate', 'after-e4.map', 'gn-1.vol', 'gn-2.block', 'after-gn-2.level', 'gn-2.cover', 'enemy:walker', 'enemy:runner', 'enemy:brute', 'hud:supplies', 'hud:minimap', 'tip.base']) assert.ok(l.seen.includes(id), id);
  for (const id of ['after-gn-3.req', 'gn-3.door', 'gn-3.early', 'gn-5.sup', 'gnn-3.front']) assert.ok(!l.seen.includes(id), id);
  // det upplåsta följer kampanjen, inte tipsen
  assert.ok(metaFeatures(old).has('levels') && !metaFeatures(old).has('requisition'));
  // uppslagen som det låser upp räknas som lästa (ingen prick på allt en gammal spelare kan)
  assert.deepEqual(manualNew({ ...old, lessons: l }), []);
  // genom sparfilen: en v4-fil utan lessons får dem vid läsning, och de sparas sedan
  const s = memory();
  saveProgress(old, s);
  const loaded = loadProgress(s);
  assert.deepEqual(loaded.lessons.seen.sort(), [...l.seen].sort());
  assert.equal(loaded.lessons.mode, 'on');
  // en spelare som bara spelat E4 dag 1 (vunnen) har inte sett dag 2
  let q = finishDay(newCampaign(), { mapId: 'riksvagen', day: 1, won: true, intelEarned: 10 }).progress;
  const { lessons: _l, ...oldQ } = q; void _l;
  const lq = lessonsFor(oldQ);
  assert.ok(lq.seen.includes('e4-1.second') && !lq.seen.includes('e4-2.supplies') && !lq.seen.includes('enemy:runner'));
  // en sparfil med lessons behålls som den är
  assert.equal(withLessons(markSeen(newCampaign(), 'x')).lessons.seen[0], 'x');
});

test('tipsens läge: On, New only och Off; Reset tips; Field manual med nya uppslag', () => {
  let p = newCampaign();
  assert.ok(shows(p, 'caption') && shows(p, 'step') && shows(p, 'enemy'));
  p = setMode(p, 'new');
  assert.ok(!shows(p, 'caption') && !shows(p, 'tip') && shows(p, 'step') && shows(p, 'enemy'));
  p = setMode(p, 'off');
  assert.ok(!shows(p, 'step') && !shows(p, 'enemy'));
  p = setMode(p, 'bogus');
  assert.equal(p.lessons.mode, 'off');
  p = markSeen(p, 'e4-1.pick', 'enemy:walker');
  assert.ok(isSeen(p, 'e4-1.pick'));
  assert.deepEqual(manualUnlocked(p).sort(), ['place', 'walker']);
  assert.deepEqual(manualNew(p).sort(), ['place', 'walker']);
  p = markRead(p, 'walker');
  assert.deepEqual(manualNew(p), ['place']);
  p = resetTips(p);
  assert.ok(!isSeen(p, 'e4-1.pick'));
  assert.equal(p.lessons.mode, 'off', 'läget står kvar');
  assert.ok(isSeen(markAllSeen(p), 'gnn-3.front'));
});

test('E4 dag 1: infanteriet vid bommen, en Ksp 90 på en markerad plats, den andra efter första vågen, inga förnödenheter', () => {
  const cfg = opStartConfig(newCampaign(), 1, 'riksvagen');
  assert.equal(cfg.cash, 0);
  assert.equal(cfg.bountyMul, 0);
  const sim = createSim(cfg);
  assert.deepEqual(sim.guns.map(g => g.weapon.type), ['inf'], 'infanteriet står redan ute');
  assert.equal(buyState(sim, 'm249').count, 1, 'en Ksp 90 att ställa ut');
  assert.equal(buyState(sim, 'wire').state, 'absent');
  assert.equal(buyState(sim, 'block').state, 'absent');
  const marked = [...sim.marked];
  assert.ok(marked.length >= 3);
  const off = sim.place.keyAt(-20, 30);
  assert.equal(checkSpot(sim, off, 'm249').reason, 'markerad');
  assert.equal(build(sim, marked[0], 'm249').ok, true);
  assert.equal(buyState(sim, 'm249').state, 'out', 'den andra har inte kommit: kortet står kvar grått');
  assert.equal(placeAcross(sim, sim.route.cellAt(9, -10) ?? 0, 'wire').ok, false);
  assert.equal(rotateGun(sim, sim.guns[1].id, 0).reason, 'låst', 'Rotate kommer dag 3');
  startWave(sim);
  let arrived = false;
  for (let i = 0; i < 30 * 200 && sim.waveIndex < 1; i++) { step(sim, 1 / 30); if (sim.events.some(e => e.t === 'arrived')) arrived = true; }
  assert.equal(sim.waveIndex, 1);
  assert.ok(arrived, 'händelsen arrived när den andra är framme');
  assert.equal(buyState(sim, 'm249').count, 1);
  assert.equal(build(sim, marked[1], 'm249').ok, true, 'den andra ställs ut efter första vågen');
  assert.equal(callNextWave(sim).reason, 'låst', 'Next wave med bonus kommer South dag 5');
});

test('E4 dag 3: pillboxen står svetsad från början; Vikingavägen dag 1: förnödenheter på enheten', () => {
  const sim = createSim(opStartConfig(debugReach(newCampaign(), 'riksvagen', 3), 3, 'riksvagen'));
  const epa = sim.guns.find(g => g.weapon.type === 'epa');
  assert.ok(epa && !epa.building, 'svetsad');
  assert.ok(sim.guns.some(g => g.weapon.type === 'inf'));
  assert.equal(buySupply(sim, epa.id, 'ammo').reason, 'ej upplåst');
  const p5 = debugReach(newCampaign(), 'gnesta-norr', 1);
  const s5 = createSim({ ...opStartConfig(p5, 1, 'gnesta-norr'), cash: 1000 });
  const k = [...Array(s5.place.n).keys()].find(q => build(s5, q, 'm249').ok);
  assert.ok(k != null);
  assert.equal(buySupply(s5, s5.guns[0].id, 'ammo').ok, true);
});

// 0.16.0 (Olas beslut, "Gnesta = en sektor"): Gnesta South och North blir Hagstumosse med en gemensam trupp.
test('sparfilen: South och North slås ihop till Hagstumosse, ingen enhet förloras, kopian sparas', () => {
  let p = debugReach(newCampaign(), 'gnesta', 5);
  const units = p.op.units.map(u => ({ ...u }));
  // en sparfil från 0.15: hälften av trupperna omplacerade till North, lager och tryck per bana
  const old = { ...p, maps: { ...p.maps, 'gnesta-norr': { unlockedDay: 2, attempts: { 1: 1 } } },
    op: { ...p.op, units: units.map((u, i) => (u.sector === 'gnesta' && i % 2 ? { ...u, sector: 'gnesta-norr' } : u)), stock: { gnesta: { m249: 1 }, 'gnesta-norr': { ksp58: 2, m249: 1 } }, pressure: { 'gnesta-norr': 2, gnesta: 1 } } };
  delete old.lessons;
  const s = memory(), raw = JSON.stringify(old);
  s.setItem('horde.save', raw);
  const q = loadProgress(s);
  assert.equal(s.getItem('horde.save.v4'), raw, 'kopian av den gamla filen');
  assert.ok(q.op.units.length >= units.length, 'inga enheter förlorade (Vikingavägens leverans kommer till)');
  assert.ok(!q.op.units.some(u => u.sector === 'gnesta-norr'));
  for (const u of units) assert.ok(q.op.units.some(x => x.uid === u.uid), 'uid ' + u.uid);
  assert.equal(q.op.stock.gnesta.m249, 2);
  assert.ok(q.op.stock.gnesta.ksp58 >= 2);
  assert.equal(q.op.stock['gnesta-norr'], undefined);
  assert.equal(q.op.pressure['gnesta-norr'], undefined, 'inget tryck mellan faserna');
  // Vikingavägen spelades redan (öppnade efter dag 4 före 0.16.0): står kvar öppen
  assert.deepEqual(q.maps['gnesta-norr'], { unlockedDay: 2, attempts: { 1: 1 } });
  assert.equal(loadProgress(s).op.units.length, q.op.units.length, 'en andra läsning ändrar inget');
});

// 0.19.0 (speltestet av 0.18.1): Ishallen dag 2 lär ut korselden före våg 1 också när barriärsteget hoppas över med Esc:
// stegets efterföljare (gn-2.reroute, som väntar på en barriär) håller inte upp kön
test('Ishallen dag 2: korselden kommer även om barriären hoppas över', async () => {
  const { LESSONS } = await import('../src/data/lessons.js');
  const g2 = LESSONS['gn-2'], ids = g2.map(l => l.id);
  const re = g2.find(l => l.id === 'gn-2.reroute');
  assert.equal(re.wait, false);
  assert.ok(ids.indexOf('gn-2.xfask') > ids.indexOf('gn-2.reroute'));
  // inga andra steg mellan barriären och korselden som väntar på något spelaren kan hoppa över
  for (const l of g2.slice(ids.indexOf('gn-2.block') + 1, ids.indexOf('gn-2.xfask'))) assert.ok(l.kind === 'caption' || l.wait === false || !/^obstacle:|^placed:/.test(l.when), l.id);
});
