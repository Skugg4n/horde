// 0.14.2 (speltestet av 0.14.1: "minikartan visar förra försökets pjäser i början av ett nytt försök"):
// minikartan ritas om med den nya simuleringen när dagen börjar (reset), utan förra försökets svansar.
// En liten låtsas-DOM räcker: minikartan ritar bara på en 2D-canvas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMinimap } from '../src/ui/minimap.js';
import { createSim, startWave, step } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

function fakeDom() {
  const noop = () => {};
  const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  const el = () => ({
    style: {}, width: 0, height: 0, innerHTML: '', className: '', id: '',
    classList: { toggle: noop, add: noop, remove: noop },
    addEventListener: noop, appendChild: noop, setPointerCapture: noop, releasePointerCapture: noop,
    getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, top: 0, width: 236, height: 168 }),
    querySelector() { return this._canvas ??= el(); },
  });
  globalThis.document = { createElement: el };
  return { root: el() };
}

test('minikartan börjar om med den nya simuleringen (reset)', () => {
  const { root } = fakeDom();
  const mm = createMinimap(root, { visible: true });
  const map = MAPS.riksvagen;
  const a = createSim({ map, day: 1, cash: 9999, seed: 1 });
  startWave(a);
  for (let i = 0; i < 30 * 20; i++) step(a, 1 / 30);
  assert.ok(a.zombies.some(z => !z.dead), 'zombier ute i första försöket');
  mm.update(0.2, { sim: a, view: null, spawns: [], alerts: [] });
  assert.equal(mm.state.sim, a);
  assert.ok(mm.state.trails > 0, 'svansar från första försöket');
  // nytt försök: samma bana, ny simulering
  const b = createSim({ map, day: 1, cash: 9999, seed: 2 });
  mm.reset(b);
  assert.equal(mm.state.sim, b, 'den nya simuleringen är den som ritades');
  assert.equal(mm.state.trails, 0, 'inga svansar kvar från förra försöket');
  delete globalThis.document;
});
