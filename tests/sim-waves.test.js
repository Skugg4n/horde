import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, callNextWave, waveLeft, earlyBonus, COUNTDOWN, EARLY_PER_SEC } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

const map = MAPS.riksvagen;
const DT = 1 / 30;
const run = (sim, secs, onStep) => { for (let i = 0; i < Math.round(secs * 30); i++) { step(sim, DT); if (onStep) onStep(sim.events); } };
const mk = (o = {}) => createSim({ map, day: 1, cash: 500, research: [], seed: 1, ...o });
// Tömmer vågen direkt: inga zombier kvar att vänta på.
const clearNow = s => { s.spawnQueue.length = 0; for (const z of s.zombies) z.dead = true; step(s, DT); };

test('före våg 1 startar inget av sig själv', () => {
  const s = mk();
  run(s, 30);
  assert.equal(s.phase, 'build');
  assert.equal(s.nextWaveIn, null);
  assert.equal(s.wavesStarted, 0);
  assert.equal(earlyBonus(s), 0);
});
test('efter en klarad våg räknar den ner och startar nästa vid 0', () => {
  const s = mk();
  startWave(s); clearNow(s);
  assert.equal(s.phase, 'build');
  assert.equal(s.nextWaveIn, COUNTDOWN);
  const starts = [];
  run(s, COUNTDOWN - 0.1, ev => starts.push(...ev.filter(e => e.t === 'waveStart')));
  assert.equal(s.phase, 'build');
  run(s, 0.2, ev => starts.push(...ev.filter(e => e.t === 'waveStart')));
  assert.equal(s.phase, 'wave');
  assert.deepEqual(starts.map(e => e.index), [1]);
  assert.equal(s.cash, 500, 'ingen bonus när nedräkningen gick ut');
});
test('Next wave under nedräkningen ger bonus per sekund kvar', () => {
  const s = mk();
  startWave(s); clearNow(s);
  run(s, COUNTDOWN - 3.5);           // 3,5 s kvar, räknas som 4
  assert.equal(earlyBonus(s), 4 * EARLY_PER_SEC);
  const r = callNextWave(s);
  assert.deepEqual(r, { ok: true, bonus: 4 * EARLY_PER_SEC, index: 1 });
  assert.equal(s.cash, 500 + 4 * EARLY_PER_SEC);
  assert.equal(s.phase, 'wave');
  assert.ok(s.events.some(e => e.t === 'earlyBonus' && e.amount === 4 * EARLY_PER_SEC));
});
test('Next wave mitt i en våg lägger ihop vågorna, och dagen vinns först när alla är klara', () => {
  const s = mk();
  startWave(s);
  run(s, 3);
  const left = s.spawnQueue[s.spawnQueue.length - 1].at - s.time;
  const want = Math.round((COUNTDOWN + Math.min(5, left)) * EARLY_PER_SEC);
  assert.equal(callNextWave(s).bonus, want);
  assert.equal(s.wavesStarted, 2);
  assert.ok(s.spawnQueue.some(q => q.wave === 0) && s.spawnQueue.some(q => q.wave === 1));
  assert.equal(callNextWave(s).ok, true);           // våg 3 också
  assert.equal(callNextWave(s).ok, false, 'ingen fjärde våg');
  // Allt utom våg 3 dör: dagen är inte vunnen än.
  s.spawnQueue = s.spawnQueue.filter(q => q.wave === 2);
  for (const z of s.zombies) if (z.wave !== 2) z.dead = true;
  const cleared = [];
  step(s, DT); cleared.push(...s.events.filter(e => e.t === 'waveCleared').map(e => e.index));
  assert.deepEqual(cleared, [0, 1]);
  assert.equal(s.phase, 'wave');
  assert.equal(s.waveIndex, 2);
  clearNow(s);
  assert.equal(s.phase, 'won');
  assert.equal(s.waveIndex, 3);
  assert.equal(s.intelEarned >= 6, true);
});
test('efter sista vågen startar inget och ingen bonus finns', () => {
  const s = mk();
  for (let w = 0; w < 3; w++) { if (s.phase === 'build' && s.nextWaveIn == null) startWave(s); else callNextWave(s); clearNow(s); }
  assert.equal(s.phase, 'won');
  assert.equal(s.nextWaveIn, null);
  assert.equal(earlyBonus(s), 0);
  assert.equal(callNextWave(s).ok, false);
});
test('samma seed och samma kall ger samma dag', () => {
  const play = () => {
    const s = mk({ day: 2, cash: 3000 });
    startWave(s);
    for (let i = 0; i < 30 * 200 && s.phase !== 'won' && s.phase !== 'lost'; i++) {
      if (i === 30 * 20) callNextWave(s);
      step(s, DT);
    }
    return [s.phase, s.baseHp, s.cash, s.kills, s.time.toFixed(3)].join();
  };
  assert.equal(play(), play());
});

test('Next wave utan stack mitt i en våg gör inget så länge zombier är kvar', () => {
  const s = mk();
  startWave(s);
  run(s, 3);
  const cash = s.cash, left = waveLeft(s);
  assert.ok(left > 0);
  assert.deepEqual(callNextWave(s, { stack: false }), { ok: false, bonus: 0, reason: 'kvar', left });
  assert.equal(s.wavesStarted, 1);
  assert.equal(s.cash, cash);
  // Under nedräkningen (inga kvar) går det utan stack, som förut.
  s.spawnQueue = []; for (const z of s.zombies) z.dead = true;
  step(s, DT);
  assert.equal(s.phase, 'build');
  assert.equal(callNextWave(s, { stack: false }).ok, true);
  // Uttryckligt staplande (knappen, Shift+Space) går mitt i vågen.
  run(s, 1);
  assert.equal(callNextWave(s, { stack: true }).ok, true);
  assert.equal(s.wavesStarted, 3);
});

test('nedräkningen mellan vågorna är 10 s, och en hel nedräkning är värd ungefär som förut', () => {
  assert.equal(COUNTDOWN, 10);
  assert.ok(COUNTDOWN * EARLY_PER_SEC >= 25 && COUNTDOWN * EARLY_PER_SEC <= 35);
});

// Överlapp (0.10.1): på en dag med overlap startar nästa våg så många sekunder efter att föregående
// kommit ut helt, även om den fortfarande är på väg; klaras den före får spelaren minst COUNTDOWN.
const overlapMap = ov => ({ ...map, days: [{ ...map.days[0], overlap: ov,
  waves: [{ groups: [{ type: 'walker', count: 3, interval: 1, delay: 0 }] }, { groups: [{ type: 'walker', count: 2, interval: 1, delay: 0 }] }, { groups: [{ type: 'walker', count: 1, interval: 1, delay: 0 }] }] }] });
test('overlap: nästa våg startar efter att vågen kommit ut, medan zombierna går', () => {
  const s = createSim({ map: overlapMap(6), day: 1, cash: 0, seed: 1 });
  startWave(s);
  while (s.spawnQueue.length) step(s, DT);
  assert.equal(s.nextWaveIn, 6, 'vågen har kommit ut: nedräkningen börjar');
  assert.equal(earlyBonus(s), 6 * EARLY_PER_SEC);
  run(s, 5.9);
  assert.equal(s.wavesStarted, 1);
  run(s, 0.3);
  assert.equal(s.wavesStarted, 2, 'våg 2 startade med våg 1 på vägen');
  assert.ok(s.zombies.some(z => !z.dead && z.wave === 0));
  assert.equal(s.nextWaveIn, null);
});
test('overlap: klaras vågen före nedräkningen är slut får spelaren minst COUNTDOWN', () => {
  const s = createSim({ map: overlapMap(3), day: 1, cash: 0, seed: 1 });
  startWave(s);
  while (s.spawnQueue.length) step(s, DT);
  assert.equal(s.nextWaveIn, 3);
  clearNow(s);
  assert.equal(s.phase, 'build');
  assert.ok(Math.abs(s.nextWaveIn - COUNTDOWN) < 1e-9);
});
