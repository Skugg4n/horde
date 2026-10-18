import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { advance, escapeAction } from '../src/sim/clock.js';

const DT = 1 / 30;
const mk = () => createSim({ map: MAPS.riksvagen, day: 1, cash: 500, research: [], seed: 1 });
const frames = (sim, st, n, opts) => { let steps = 0; for (let i = 0; i < n; i++) steps += advance(st, 1 / 60, { dt: DT, ...opts }, () => step(sim, DT)); return steps; };
const snap = s => JSON.stringify([s.time, s.nextWaveIn, s.spawnQueue.length, s.zombies.map(z => [z.id, z.dist ?? z.d ?? z.x, z.hp])]);

test('pausad: simuleringen går inte framåt, varken zombier, tid eller spawn', () => {
  const sim = mk(); const st = { acc: 0 };
  startWave(sim);
  assert.ok(frames(sim, st, 120, { playing: true, paused: false }) > 0);
  const before = snap(sim);
  assert.equal(frames(sim, st, 600, { playing: true, paused: true, mul: 3 }), 0);
  assert.equal(snap(sim), before);
});

test('efter pausen fortsätter tiden där den slutade, utan hopp', () => {
  const sim = mk(); const st = { acc: 0 };
  startWave(sim);
  frames(sim, st, 60, { playing: true, paused: false });
  const t = sim.time;
  frames(sim, st, 300, { playing: true, paused: true });
  assert.equal(sim.time, t);
  frames(sim, st, 60, { playing: true, paused: false });
  assert.ok(sim.time > t && sim.time - t < 1.2);
});

test('nedräkningen till nästa våg står också still', () => {
  const sim = mk(); const st = { acc: 0 };
  startWave(sim);
  sim.nextWaveIn = 10;
  // simuleringen räknar ner själv i step; pausad ändras ingenting
  frames(sim, st, 300, { playing: true, paused: true });
  assert.equal(sim.nextWaveIn, 10);
});

test('utanför play går ingen tid', () => {
  const sim = mk(); const st = { acc: 0 };
  startWave(sim);
  assert.equal(frames(sim, st, 100, { playing: false, paused: false }), 0);
  assert.equal(sim.time, 0);
});

test('Esc-prioritet: meny, forskning, placering, panel, och sist öppna menyn', () => {
  const base = { menuOpen: false, mode: 'play', placing: false, panel: false };
  assert.equal(escapeAction({ ...base, menuOpen: true, placing: true, panel: true }), 'menu-back');
  assert.equal(escapeAction({ ...base, mode: 'research' }), 'close-research');
  assert.equal(escapeAction({ ...base, placing: true, panel: true }), 'cancel-placing');
  assert.equal(escapeAction({ ...base, panel: true }), 'close-panel');
  assert.equal(escapeAction(base), 'open-menu');
  assert.equal(escapeAction({ ...base, mode: 'intro' }), 'none');
  assert.equal(escapeAction({ ...base, mode: 'result' }), 'none');
  assert.equal(escapeAction({ ...base, mode: 'menu' }), 'none');
});

// 0.10.1 (speltestet): ett tryck gör exakt en sak. En markering utan panel avmarkeras i stället för
// att menyn öppnas, och en upprepning medan tangenten hålls nere gör ingenting.
test('Esc gör en sak per tryck: markering först, ingen upprepning', () => {
  const base = { menuOpen: false, mode: 'play', placing: false, panel: false };
  assert.equal(escapeAction({ ...base, selected: true }), 'close-panel');
  assert.equal(escapeAction({ ...base, placing: true, repeat: true }), 'none');
  assert.equal(escapeAction({ ...base, repeat: true }), 'none');
  // två tryck i rad med en placering: först avbryts den, sedan (nytt läge) öppnas menyn
  const first = escapeAction({ ...base, placing: true, selected: true });
  assert.equal(first, 'cancel-placing');
  assert.equal(escapeAction({ ...base, selected: true }), 'close-panel');
  assert.equal(escapeAction(base), 'open-menu');
});

// 0.11.0: köpradens öppna kategori stängs först i spelet, och ett Esc strax efter ett köp (H095)
// öppnar inte pausmenyn.
// 0.17.1: det man håller går före kategorin (en ordning: det man håller, panelen, menyn)
test('Esc: öppen kategori stängs, inget pausmeny strax efter ett köp', () => {
  const base = { menuOpen: false, mode: 'play', placing: false, panel: false };
  assert.equal(escapeAction({ ...base, category: true, placing: true }), 'cancel-placing');
  assert.equal(escapeAction({ ...base, category: true }), 'close-category');
  assert.equal(escapeAction({ ...base, category: true, menuOpen: true }), 'menu-back');
  assert.equal(escapeAction({ ...base, justPlaced: true }), 'none');
  assert.equal(escapeAction({ ...base, justPlaced: true, placing: true }), 'cancel-placing');
  assert.equal(escapeAction({ ...base, justPlaced: true, panel: true }), 'close-panel');
  assert.equal(escapeAction(base), 'open-menu');
});

// 0.12.1 (speltestet av 0.12.0): Esc direkt efter att basen fallit öppnade pausmenyn ovanpå
// resultatskylten. På resultat, intro och huvudmenyn gör Esc ingenting; forskningen stängs.
test('Esc gör ingenting på resultat- och introskylten, stänger bara forskningen', () => {
  const base = { menuOpen: false, placing: false, panel: false };
  for (const mode of ['result', 'intro', 'menu']) {
    assert.equal(escapeAction({ ...base, mode }), 'none', mode);
    assert.equal(escapeAction({ ...base, mode, selected: true }), 'none', mode + ' med markering kvar');
    assert.equal(escapeAction({ ...base, mode, justPlaced: true }), 'none', mode + ' strax efter ett köp');
  }
  assert.equal(escapeAction({ ...base, mode: 'research' }), 'close-research');
  assert.equal(escapeAction({ ...base, mode: 'play' }), 'open-menu');
});

// 0.17.1 (speltestet av 0.17.0: "ibland lägger Esc tillbaka kortet, ibland öppnar den pausmenyn"): en ordning.
// Varje tryck gör en sak: först läggs det man håller tillbaka, sedan stängs panelen, sedan lektionsraden, sist menyn.
test('Esc: det man håller, sedan panelen, sedan menyn, alltid i den ordningen', () => {
  let st = { menuOpen: false, mode: 'play', placing: true, panel: true, selected: true, category: true, lesson: true, justPlaced: false };
  const order = [];
  for (let i = 0; i < 6; i++) {
    const what = escapeAction(st);
    order.push(what);
    if (what === 'cancel-placing') st = { ...st, placing: false };
    else if (what === 'close-category') st = { ...st, category: false };
    else if (what === 'close-panel') st = { ...st, panel: false, selected: false };
    else if (what === 'skip-lesson') st = { ...st, lesson: false };
    else if (what === 'open-menu') st = { ...st, menuOpen: true };
    else break;
  }
  assert.deepEqual(order, ['cancel-placing', 'close-category', 'close-panel', 'skip-lesson', 'open-menu', 'menu-back']);
  // en lektionsrad tar aldrig Esc från kortet i handen
  assert.equal(escapeAction({ mode: 'play', placing: true, lesson: true }), 'cancel-placing');
  assert.equal(escapeAction({ mode: 'play', panel: true, lesson: true }), 'close-panel');
});
