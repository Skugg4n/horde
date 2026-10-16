import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, build, upgrade, moveGun, checkMove, evacOutcome, gunPos, CIV_HP } from '../src/sim/sim.js';
import { WEAPONS } from '../src/data/weapons.js';
import { MAPS } from '../src/data/maps.js';
import { gnesta } from '../src/data/gnesta.js';
import { e4Plan, gnestaPlan, daySpawns } from '../scripts/balance.mjs';

const DT = 1 / 30;
const run = (sim, secs, fn = () => {}) => { for (let i = 0; i < Math.round(secs / DT) && (sim.phase === 'wave' || sim.phase === 'build'); i++) { step(sim, DT); fn(sim.events); } };

// ---------- EPA-pillboxen (0.13.0, H135) ----------
test('pillboxen: liv per nivå, svetsas ihop innan den skjuter, ~90 graders glugg', () => {
  assert.equal(WEAPONS.epa.cone, 90);
  const sim = createSim({ map: MAPS.riksvagen, day: 1, cash: 5000, seed: 1 });
  const spot = e4Plan().spots[0];
  startWave(sim);
  const id = build(sim, spot, 'epa').id, g = sim.guns.find(x => x.id === id);
  assert.equal(g.hp, WEAPONS.epa.hp[0]); assert.equal(g.building, WEAPONS.epa.build);
  let firstShot = null, built = null;
  run(sim, 30, evs => { for (const e of evs) { if (e.t === 'built') built = sim.time; if (e.t === 'shot' && e.gunId === id && firstShot == null) firstShot = sim.time; } });
  assert.ok(built != null && Math.abs(built - WEAPONS.epa.build) < 0.05, `klar ${built}`);
  assert.ok(firstShot == null || firstShot >= built, 'inga skott under bygget');
  assert.equal(upgrade(sim, id).ok, true);
  assert.equal(g.maxHp, WEAPONS.epa.hp[1]);
  // före första vågen står den klar direkt
  const s2 = createSim({ map: MAPS.riksvagen, day: 1, cash: 5000, seed: 1 });
  assert.equal(s2.guns.length, 0);
  build(s2, spot, 'epa');
  assert.equal(s2.guns[0].building, undefined);
});

test('pillboxen tar stryk av zombier som når fram, och faller till slut', () => {
  const sim = createSim({ map: MAPS.riksvagen, day: 3, cash: 5000, seed: 2 });
  // tätt intill vägen, vänd bort så att den inte skjuter dem
  const p = sim.place, k = p.keyAt(4, 5);
  const id = build(sim, k, 'epa', { facing: Math.PI / 2 }).id, g = sim.guns.find(x => x.id === id);
  startWave(sim);
  let hit = 0, down = false;
  run(sim, 400, evs => { for (const e of evs) { if (e.t === 'vehicleHit' && e.gunId === id) hit++; if (e.t === 'vehicleDown' && e.gunId === id) down = true; } });
  assert.ok(hit > 0, 'zombierna slår på den');
  assert.ok(down || g.hp < g.maxHp, 'den tar skada');
});

test('pillboxen kryper till en ny plats i en fjärdedel av infanteriets fart', () => {
  const sim = createSim({ map: MAPS.riksvagen, day: 1, cash: 5000, seed: 1 });
  const [a, b] = e4Plan().spots;
  const id = build(sim, a, 'epa').id, g = sim.guns.find(x => x.id === id);
  startWave(sim);
  run(sim, 7);
  assert.equal(checkMove(sim, id, b).ok, true);
  moveGun(sim, id, b);
  assert.ok(Math.abs(g.move.speed - WEAPONS.inf.speed / 4) < 1e-9);
  run(sim, g.move.pack + 2);
  const p = gunPos(g);
  assert.ok(Math.hypot(p.x - g.move.from.x, p.z - g.move.from.z) < 2 * g.move.speed + 0.01, 'långsamt');
});

// ---------- evakueringen (0.13.0, H105) ----------
const evMap = (need, groups) => ({ ...gnesta, days: [{ ...gnesta.days[0], evac: { need, groups } }] });

test('de civila kommer ut ur husen och går till ishallen; dagen vinns när nog är framme', () => {
  const map = evMap(3, [{ house: 'B2-03', count: 3, at: 1, wave: 0 }]);
  const sim = createSim({ map, day: 1, cash: 0, seed: 1 });
  sim.dayCfg = { ...sim.dayCfg, waves: [{ groups: [] }], dormant: [] };
  assert.deepEqual(sim.evac, { total: 3, safe: 0, lost: 0, need: 3, out: 0 });
  startWave(sim);
  const out = [], safe = [];
  run(sim, 120, evs => { for (const e of evs) { if (e.t === 'civilianOut') out.push(e); if (e.t === 'civilianSafe') safe.push(e); } });
  assert.equal(out.length, 3);
  assert.equal(safe.length, 3);
  assert.equal(sim.phase, 'won');
  assert.equal(evacOutcome(sim.evac), 'won');
});

test('zombier som hinner ikapp slår ner de civila; för många nere och dagen är förlorad', () => {
  const map = evMap(4, [{ house: 'B4-13', count: 4, at: 0.5, wave: 0 }]);
  const sim = createSim({ map, day: 1, cash: 0, seed: 1 });
  sim.dayCfg = { ...sim.dayCfg, waves: [{ groups: [{ type: 'runner', count: 30, interval: 0.2, delay: 0, spawn: 'east1' }] }], dormant: [{ house: 'B2-02', count: 6, type: 'walker', wave: 0 }] };
  startWave(sim);
  let down = 0;
  run(sim, 200, evs => { for (const e of evs) if (e.t === 'civilianDown') down++; });
  assert.ok(down >= 1, `nere ${down}`);
  assert.equal(sim.phase, 'lost');
  assert.equal(sim.lostBy, 'civilians');
  assert.ok(CIV_HP > 0);
});

test('utfallet räknas rätt', () => {
  assert.equal(evacOutcome({ total: 10, need: 7, safe: 6, lost: 3 }), null);
  assert.equal(evacOutcome({ total: 10, need: 7, safe: 2, lost: 4 }), 'lost');
  assert.equal(evacOutcome({ total: 10, need: 7, safe: 7, lost: 3 }), 'won');
  assert.equal(evacOutcome(null), null);
});

test('Gnesta dag 1 är evakueringen och E4 har inget Hemvärn', () => {
  const d1 = gnesta.days[0];
  assert.equal(d1.intro.title, 'Day 1: Civilians');
  assert.match(d1.objective, /Hold until the civilians reach the ice rink\./);
  assert.ok(d1.evac.need <= d1.evac.groups.reduce((a, g) => a + g.count, 0));
  assert.ok(!MAPS.riksvagen.arsenal.includes('hv'));
  for (const t of ['inf', 'm249', 'm2', 'epa']) assert.ok(MAPS.riksvagen.arsenal.includes(t), t);
  assert.match(MAPS.riksvagen.outro.text, /The roadblock at E4 has fallen silent\. Gnesta has only its Home Guard\./);
  void gnestaPlan; void daySpawns;
});
