import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDebug, saveDebug, DEBUG_KEY } from '../src/meta/debug-store.js';
import { resetSave, saveProgress, loadProgress, BACKUP } from '../src/meta/save.js';
import { newProgress } from '../src/meta/progress.js';
import { IDENTITY_TWEAKS, createSim, startWave, step, debugSpawn, debugBurst, debugJumpWave } from '../src/sim/sim.js';
import { versionClicks } from '../src/ui/debug.js';
import { MAPS } from '../src/data/maps.js';

const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), keys: () => [...m.keys()], m }; };

test('reglarna i horde.debug: identitet utan lagring, sparas och läses, aldrig i sparfilen', () => {
  const s = mem();
  assert.deepEqual(loadDebug(s).tweaks, { ...IDENTITY_TWEAKS });
  saveDebug({ tweaks: { hp: 2, countdown: 5 }, visuals: { los: true } }, s);
  const d = loadDebug(s);
  assert.equal(d.tweaks.hp, 2); assert.equal(d.tweaks.countdown, 5); assert.equal(d.visuals.los, true); assert.equal(d.visuals.grid, false);
  assert.deepEqual(s.keys(), [DEBUG_KEY]);
  s.setItem(DEBUG_KEY, '{trasig');
  assert.deepEqual(loadDebug(s).tweaks, { ...IDENTITY_TWEAKS });
});

test('Reset save: sparfilen kopieras till horde.save.backup, och en äldre kopia skrivs aldrig över', () => {
  const s = mem();
  const a = { ...newProgress(), rp: 123 };
  saveProgress(a, s);
  assert.equal(resetSave(newProgress(), s), true);
  assert.equal(JSON.parse(s.getItem(BACKUP)).rp, 123);
  assert.equal(loadProgress(s).rp, 0);
  saveProgress({ ...newProgress(), rp: 456 }, s);
  resetSave(newProgress(), s);
  assert.equal(JSON.parse(s.getItem(BACKUP)).rp, 123);
  assert.equal(JSON.parse(s.getItem(BACKUP + '.1')).rp, 456);
});

test('fem snabba klick på versionen öppnar menyn, långsamma gör det inte', () => {
  let t = 0, opened = 0, handler = null;
  const el = { addEventListener: (_, f) => { handler = f; } };
  versionClicks(el, () => opened++, () => t);
  for (let i = 0; i < 5; i++) { handler(); t += 200; }
  assert.equal(opened, 1);
  for (let i = 0; i < 5; i++) { handler(); t += 900; }
  assert.equal(opened, 1);
});

test('spawn, hus och hopp till våg: bara när det går, och vågen väntar på de nya', () => {
  const sim = createSim({ map: MAPS['gnesta-norr'], day: 2, cash: 0, seed: 1 });
  assert.equal(debugSpawn(sim, { type: 'runner', count: 5 }).ok, false);
  assert.equal(debugJumpWave(sim, 3).ok, true);
  startWave(sim);
  assert.equal(sim.wavesStarted, 3);
  const q = sim.spawnQueue.length;
  assert.equal(debugSpawn(sim, { type: 'runner', count: 5, spawn: 'vikN' }).ok, true);
  assert.equal(sim.spawnQueue.length, q + 5);
  assert.ok(sim.spawnQueue.filter(x => x.type === 'runner' && x.spawn === 'vikN').every(x => x.wave === 2));
  assert.equal(debugBurst(sim, 'N-19').ok, true);
  assert.ok(sim.burst.includes('N-19'));
  for (let i = 0; i < 30 * 5; i++) step(sim, 1 / 30);
  assert.ok(sim.zombies.some(z => z.house === 'N-19'));
});
