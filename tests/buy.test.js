import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, build } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { SHOP, hotkey } from '../src/data/shop.js';
import { buyState, canPickUp } from '../src/sim/buy.js';

const e4 = (o = {}) => createSim({ map: MAPS.riksvagen, day: 1, cash: 500, research: [], seed: 1, ...o });

test('köpraden: vapen först, sedan barrikad och taggtråd; snabbval 1-0', () => {
  assert.deepEqual(SHOP.map(s => s.id).slice(0, 4), ['m249', 'm2', 'block', 'wire']);
  assert.equal(hotkey(0), '1'); assert.equal(hotkey(2), '3'); assert.equal(hotkey(9), '0'); assert.equal(hotkey(10), '');
});

test('för dyrt: gråat med hur mycket som saknas, går inte att ta upp', () => {
  const sim = e4({ cash: 100 });
  assert.deepEqual(buyState(sim, 'm249'), { state: 'poor', cost: 250, need: 150 });
  assert.equal(canPickUp(sim, 'm249'), false);
  sim.cash = 250;
  assert.equal(buyState(sim, 'm249').state, 'ok');
  assert.equal(canPickUp(sim, 'm249'), true);
});

test('låst av forskningen: E4 kräver forskning för Ksp 88 och barrikaden, inte Gnesta (0.10.1: Ksp 88 också)', () => {
  const sim = e4();
  assert.equal(buyState(sim, 'm2').state, 'locked');
  assert.equal(buyState(sim, 'block').state, 'locked');
  assert.equal(buyState(sim, 'wire').state, 'ok');
  const g = createSim({ map: MAPS.gnesta, day: 1, cash: 800, research: [], seed: 1 });
  assert.equal(buyState(g, 'block').state, 'ok');
  assert.equal(buyState(g, 'm2').state, 'ok', 'Gnesta har Ksp 88 från dag 1 (0.10.1)');
  assert.equal(buyState(g, 'psg90').state, 'locked');
});

test('fullt: alla positioner upptagna', () => {
  const sim = e4({ cash: 5000 });
  const open = [];
  for (let k = 0; k < sim.place.n && open.length < 12; k++) if (sim.place.kind[k] === 0) open.push(k);
  let n = 0;
  for (const k of open) if (build(sim, k, 'm249').ok) n++;
  assert.equal(n, sim.maxGuns);
  assert.equal(buyState(sim, 'm249').state, 'full');
  assert.equal(buyState(sim, 'wire').state, 'ok', 'hinder räknas inte mot positionerna');
});
