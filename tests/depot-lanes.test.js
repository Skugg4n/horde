// 0.18.1 (Olas skärmbild av förrådet): banorna Into battle / Reserve · resting och INTEL-rutan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, debugReach, lanes, setLane, canSetLane, opStartConfig, unitsIn, deployCap, finishDay } from '../src/meta/operation.js';
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

test('förslaget: de utvilade först vid samma värde, och valet följer inte med till nästa dag', () => {
  let p = mb();
  const L = lanes(p, 'molnbo');
  // trötta ned den bästa: den ska åka ut ur förslaget före en utvilad av samma typ och nivå
  const best = L.battle[0], twin = L.rest.find(u => u.type === best.type && u.level === best.level);
  if (twin) {
    p = { ...p, op: { ...p.op, units: p.op.units.map(u => (u.uid === best.uid ? { ...u, fatigue: 2 } : u)) } };
    const L2 = lanes(p, 'molnbo');
    assert.ok(L2.battle.some(u => u.uid === twin.uid), 'den utvilade går in');
  }
  p = setLane(p, lanes(p, 'molnbo').battle[0].uid, 'rest').progress;
  assert.ok(unitsIn(p, 'molnbo').every(u => u.lane));
  const won = finishDay(p, { mapId: 'molnbo', day: 1, won: true, intelEarned: 10, report: { units: [] } }).progress;
  assert.ok(unitsIn(won, 'molnbo').every(u => !u.lane), 'nästa dag föreslår förrådet igen');
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
  const L = lanes(p, 'molnbo'), tired = new Set(L.battle.map(u => u.uid));
  p = { ...p, op: { ...p.op, units: p.op.units.map(u => (tired.has(u.uid) ? { ...u, fatigue: 2 } : u)) } };
  const L2 = lanes(p, 'molnbo');
  const exhaustedIn = L2.battle.filter(u => u.fatigue === 2);
  assert.ok(exhaustedIn.length <= tired.size / 2, `${exhaustedIn.length} utmattade av ${tired.size} kvar i striden`);
});
