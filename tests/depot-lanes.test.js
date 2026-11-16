// 0.18.1 (Olas skärmbild av förrådet): banorna Into battle / Reserve · resting och INTEL-rutan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, debugReach, lanes, setLane, canSetLane, opStartConfig, unitsIn, deployCap, nightAfter, suggestRoster, suggestTier } from '../src/meta/operation.js';
import { intelFor, rangeOf } from '../src/meta/intel.js';
import { MAPS } from '../src/data/maps.js';

const mb = () => debugReach(newCampaign(), 'molnbo', 1);

test('banorna: stridsbanan håller taket, och över taket vägrar den med ett skäl', () => {
  let p = mb();
  const cap = deployCap(p, 'molnbo'), all = unitsIn(p, 'molnbo');
  assert.ok(all.length > cap, `${all.length} enheter, tak ${cap}`);
  const L = lanes(p, 'molnbo');
  assert.equal(L.battle.length, cap);
  assert.equal(L.battle.length + L.rest.length, all.length);
  const out = L.rest.find(u => u.men == null || u.men > 0);
  const r = setLane(p, out.uid, 'battle');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'laneFull');
  // vila en, då går en annan in
  p = setLane(p, L.battle[0].uid, 'rest').progress;
  assert.equal(lanes(p, 'molnbo').battle.length, cap - 1);
  p = setLane(p, out.uid, 'battle').progress;
  const L2 = lanes(p, 'molnbo');
  assert.equal(L2.battle.length, cap);
  assert.ok(L2.battle.some(u => u.uid === out.uid));
  assert.ok(L2.rest.some(u => u.uid === L.battle[0].uid));
  assert.equal(canSetLane(p, L2.rest[0].uid, 'battle').reason, 'laneFull');
});

test('förslaget: de utvilade först vid samma värde, och valet står kvar tills dagen är vunnen (0.21.2, 0.26.1)', () => {
  let p = mb();
  const L = lanes(p, 'molnbo');
  // trötta ned den bästa: den ska åka ut ur förslaget före en utvilad av samma typ och nivå
  const best = L.battle[0], twin = L.rest.find(u => u.type === best.type && u.level === best.level);
  if (twin) {
    p = { ...p, op: { ...p.op, units: p.op.units.map(u => (u.uid === best.uid ? { ...u, fatigue: 2 } : u)) } };
    const L2 = lanes(p, 'molnbo');
    assert.ok(L2.battle.some(u => u.uid === twin.uid), 'den utvilade går in');
  }
  // spelarens val står kvar mellan försöken (en förlust ändrar inget)
  p = setLane(p, lanes(p, 'molnbo').battle[0].uid, 'rest').progress;
  assert.ok(unitsIn(p, 'molnbo').every(u => u.lane));
  const before = Object.fromEntries(unitsIn(p, 'molnbo').map(u => [u.uid, u.lane]));
  const lost = nightAfter(p, { mapId: 'molnbo', day: 1, won: false, intelEarned: 10, report: { units: [] } }).progress;
  for (const u of unitsIn(lost, 'molnbo')) assert.equal(u.lane, before[u.uid], `${u.uid}`);
});

test('H603: natten efter en vunnen dag föreslås rullan om, och varje flyttad rad säger varför', () => {
  let p = mb();
  const L = lanes(p, 'molnbo');
  for (const u of L.battle) p = setLane(p, u.uid, 'battle').progress;
  const out = L.battle[0];
  // en vunnen dag ute gör den utmattad (fatigue 1 före, +1 = 2)
  p = { ...p, op: { ...p.op, units: p.op.units.map(u => (u.uid === out.uid ? { ...u, fatigue: 1 } : u)) } };
  const won = nightAfter(p, { mapId: 'molnbo', day: 1, won: true, intelEarned: 10, report: { units: [{ uid: out.uid }] } }).progress;
  const u = unitsIn(won, 'molnbo').find(x => x.uid === out.uid);
  assert.equal(u.fatigue, 2);
  assert.ok(!lanes(won, 'molnbo').battle.some(x => x.uid === out.uid), 'den utmattade vilar');
  assert.equal(u.moved, 'rest:exhausted');
  assert.ok(unitsIn(won, 'molnbo').some(x => x.moved?.startsWith('battle:')));
  assert.equal(lanes(won, 'molnbo').battle.length, L.cap, 'taket står');
  // spelaren flyttar själv: raden försvinner
  const sub = lanes(won, 'molnbo').battle.find(x => x.moved);
  const again = setLane(won, sub.uid, 'rest').progress;
  assert.ok(!unitsIn(again, 'molnbo').find(x => x.uid === sub.uid).moved);
});

test('uppställningen erbjuder bara stridsbanans enheter', () => {
  let p = mb();
  const L = lanes(p, 'molnbo');
  p = setLane(p, L.battle[2].uid, 'rest').progress;
  const cfg = opStartConfig(p, 1, 'molnbo');
  const want = lanes(p, 'molnbo').battle.map(u => u.uid).sort((a, b) => a - b);
  assert.deepEqual(cfg.core.map(u => u.uid).sort((a, b) => a - b), want);
  assert.ok(!cfg.core.some(u => u.uid === L.battle[2].uid), 'den vilande går inte ut');
});

const truth = d => {
  const m = new Map();
  for (const w of d.waves) for (const g of w.groups) m.set(g.type, (m.get(g.type) ?? 0) + g.count);
  for (const dm of d.dormant ?? []) if (dm.intel !== false) m.set(dm.type ?? 'walker', (m.get(dm.type ?? 'walker') ?? 0) + dm.count);
  return m;
};
test('INTEL ljuger aldrig: känd dag visar bara typer som finns, med rätt antal; delvis med spann som rymmer talet', () => {
  for (const map of Object.values(MAPS)) for (const d of map.days) {
    const t = truth(d), where = `${map.id} dag ${d.n}`;
    for (const q of ['known', 'partial', 'unknown']) {
      const it = intelFor({ ...map, days: map.days.map(x => (x === d ? { ...x, intel: q } : x)) }, d.n);
      assert.equal(it.quality, q, where);
      for (const ty of it.types) {
        assert.ok(t.has(ty.type), `${where} ${q}: ${ty.type} finns inte i vågorna`);
        if (q === 'known') assert.equal(ty.count, t.get(ty.type), `${where}: ${ty.type}`);
        if (q === 'partial') assert.ok(ty.range[0] <= t.get(ty.type) && t.get(ty.type) <= ty.range[1], `${where}: ${ty.type} ${t.get(ty.type)} utanför ${ty.range}`);
      }
      if (q === 'known') assert.equal(it.types.length, t.size, `${where}: alla typer`);
      if (q === 'unknown') assert.equal(it.types.length, 0, where);
      const used = new Set(d.waves.flatMap(w => w.groups.map(g => g.spawn ?? map.spawns?.[0]?.id)));
      for (const e of it.entries) assert.ok(used.has(e.id), `${where}: ingången ${e.id}`);
    }
  }
  for (const n of [1, 2, 3, 7, 12, 50, 333]) { const [a, b] = rangeOf(n); assert.ok(a <= n && n <= b, `${n}`); }
});

// 0.19.1 (speltestet av 0.19.0, fynd 6: förslaget satte 8 utmattade i stridsbanan medan 12 vilade satt i reserven)
test('förslaget: när halva truppen är utmattad går de vilade in, inte de utmattade', () => {
  let p = mb();
  // 0.22.0 (H539): ankomsten till Mölnbo har 14 enheter (förut 20); fylls på till 20 med vilade av samma slag, så att
  // hälften går att byta ut som förut
  const extra = 20 - unitsIn(p, 'molnbo').length;
  p = { ...p, op: { ...p.op, units: [...p.op.units, ...Array.from({ length: Math.max(0, extra) }, (_, i) => ({ uid: 960 + i, type: 'ksp58', level: 2, sector: 'molnbo', wins: 0, spent: 0, granted: true }))] } };
  const L = lanes(p, 'molnbo'), tired = new Set(L.battle.map(u => u.uid));
  p = { ...p, op: { ...p.op, units: p.op.units.map(u => (tired.has(u.uid) ? { ...u, fatigue: 2 } : u)) } };
  const L2 = lanes(p, 'molnbo');
  const exhaustedIn = L2.battle.filter(u => u.fatigue === 2);
  assert.ok(exhaustedIn.length <= tired.size / 2, `${exhaustedIn.length} utmattade av ${tired.size} kvar i striden`);
});

// 0.26.1 (H603, helspeltestet 2026-11-16, och H607, speltestet av dag 14)
const unit = (uid, type, extra = {}) => ({ uid, type, level: 1, sector: 'molnbo', wins: 1, spent: 0, granted: true, ...extra });
function rig(units) {
  const p = mb();
  return { ...p, op: { ...p.op, units: [...p.op.units.filter(u => u.sector !== 'molnbo'), ...units] } };
}
test('H603: förstärkningen och de utvilade först, de trötta bara om taket inte är fyllt, de utmattade aldrig', () => {
  const cap = deployCap(mb(), 'molnbo');
  const units = [];
  let uid = 500;
  // cap - 2 utvilade frivilliga, två trötta kulsprutor, en ny Ksp 88 (förstärkning), och utmattade tunga
  for (let i = 0; i < cap - 2; i++) units.push(unit(uid++, 'civ', { men: 4 }));
  const tired = [unit(uid++, 'ksp58', { fatigue: 1 }), unit(uid++, 'ksp58', { fatigue: 1 })];
  const reinf = unit(uid++, 'm2', { wins: 0, rel: 'vr-1' });
  const worn = [unit(uid++, 'm2', { fatigue: 2, level: 3 }), unit(uid++, 'ksp58', { fatigue: 2, level: 3 })];
  const p = rig([...units, ...tired, reinf, ...worn]);
  const L = lanes(p, 'molnbo'), inB = new Set(L.battle.map(u => u.uid));
  assert.equal(L.battle.length, cap);
  assert.ok(inB.has(reinf.uid), 'förstärkningen går in');
  for (const u of units) assert.ok(inB.has(u.uid), 'de utvilade går in');
  assert.equal(tired.filter(u => inB.has(u.uid)).length, 1, 'en trött fyller sista platsen');
  for (const u of worn) assert.ok(!inB.has(u.uid), 'de utmattade vilar');
  // utan de utvilade: de trötta fyller, de utmattade fortfarande inte
  const q = rig([...tired, reinf, ...worn]), L2 = lanes(q, 'molnbo');
  assert.deepEqual(L2.battle.map(u => u.uid).sort(), [...tired, reinf].map(u => u.uid).sort());
  // bara utmattade: de går in hellre än en tom linje
  assert.equal(lanes(rig(worn), 'molnbo').battle.length, 2);
});

test('H607: en grupp med 2 av 5 man går inte in före förstärkningen och fulla utvilade grupper', () => {
  const cap = deployCap(mb(), 'molnbo');
  let uid = 600;
  const full = Array.from({ length: cap - 3 }, () => unit(uid++, 'civ', { men: 4 }));
  const thin = unit(uid++, 'hv', { men: 2, level: 3 });
  const reinf = [unit(uid++, 'civ', { wins: 0, rel: 'vk-1', men: 4 }), unit(uid++, 'civ', { wins: 0, rel: 'vk-1', men: 4 }), unit(uid++, 'm249', { wins: 0, rel: 'vk-1' })];
  const p = rig([...full, thin, ...reinf]);
  assert.equal(suggestTier(thin, p.research), 2);
  const inB = new Set(lanes(p, 'molnbo').battle.map(u => u.uid));
  for (const u of reinf) assert.ok(inB.has(u.uid), `förstärkningen ${u.type} går in`);
  assert.ok(!inB.has(thin.uid), 'den tunna gruppen vilar');
});

test('H603: förslaget efter en vunnen dag tar in den nya förstärkningen, också när spelaren låst banorna', () => {
  const cap = deployCap(mb(), 'molnbo');
  let uid = 700;
  const old = Array.from({ length: cap }, () => unit(uid++, 'civ', { men: 4, lane: 'battle' }));
  const reinf = unit(uid++, 'm2', { wins: 0, rel: 'vr-1' });
  const p = rig([...old, reinf]);
  assert.ok(!lanes(p, 'molnbo').battle.some(u => u.uid === reinf.uid), 'låst: utanför');
  const q = suggestRoster(p, 'molnbo'), u = unitsIn(q, 'molnbo').find(x => x.uid === reinf.uid);
  assert.ok(lanes(q, 'molnbo').battle.some(x => x.uid === reinf.uid));
  assert.equal(u.moved, 'battle:reinforcement');
});

test('H603: natt 7 säger tipset inte att någon är trött när alla rader står Rested', async () => {
  const { LESSONS } = await import('../src/data/lessons.js');
  const tip = (LESSONS?.['after-gnn-1'] ?? []).find(l => l.id === 'after-gnn-3.fatigue');
  assert.ok(tip, 'tipset finns');
  // Vikingavägen räknar ingen trötthet (fatigue kommer efter dagen): raderna är alla Rested
  const p = debugReach(newCampaign(), 'molnbo', 1);
  assert.ok(unitsIn(p, 'molnbo').every(u => !u.fatigue));
  assert.ok(!/\bare tired\b/i.test(tip.text), tip.text);
});
