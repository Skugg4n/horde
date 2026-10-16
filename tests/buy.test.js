import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, build } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { SHOP, BUY_MENU, hotkeyOf, itemAt } from '../src/data/shop.js';
import { createChord, WINDOW } from '../src/ui/chord.js';
import { buyState, canPickUp } from '../src/sim/buy.js';

const e4 = (o = {}) => createSim({ map: MAPS.riksvagen, day: 1, cash: 500, research: [], seed: 1, ...o });

// 0.11.0 (Olas önskan): kategorier med tvåstegs snabbval, ordningen bara i BUY_MENU.
test('köpraden: Defenses, Guns, Units; snabbvalen 1-1 till 3-1', () => {
  assert.deepEqual(BUY_MENU.map(c => c.name), ['Defenses', 'Guns', 'Units']);
  assert.deepEqual(SHOP.map(s => s.id), ['block', 'wire', 'm249', 'm2', 'ksp58', 'ak5', 'psg90', 'hv']);
  assert.deepEqual(SHOP.map(s => hotkeyOf(s.id)), ['1-1', '1-2', '2-1', '2-2', '2-3', '2-4', '2-5', '3-1']);
  assert.equal(itemAt(2, 1), 'm249'); assert.equal(itemAt(1, 3), null); assert.equal(itemAt(4, 1), null);
});

test('tvåstegsvalet: kategori, sak, Esc, samma kategori och tidsgränsen', () => {
  const c = createChord();
  assert.deepEqual(c.press(2, 0), { t: 'category', cat: 2 });
  assert.equal(c.open, 2);
  assert.deepEqual(c.press(1, 0.5), { t: 'pick', id: 'm249' });
  assert.equal(c.open, null, 'kategorin stängs när saken är vald');
  // inom tidsgränsen är samma siffra en sak: 2 2 = Ksp 88
  c.press(2, 10); assert.deepEqual(c.press(2, 10.4), { t: 'pick', id: 'm2' });
  // en plats som inte finns gör ingenting, kategorin står kvar
  c.press(3, 20); assert.deepEqual(c.press(4, 20.2), { t: 'none' }); assert.equal(c.open, 3);
  // Esc stänger kategorin och säger att den gjorde det
  assert.equal(c.escape(), true); assert.equal(c.open, null); assert.equal(c.escape(), false);
  // efter tidsgränsen: kategorin står kvar öppen, ingenting väljs, och nästa siffra är en ny kategori
  c.press(1, 30);
  assert.equal(c.armed(30 + WINDOW + 0.1), false);
  assert.equal(c.open, 1);
  assert.deepEqual(c.press(1, 30 + WINDOW + 0.5), { t: 'close' }, 'samma kategori igen backar');
  c.press(1, 40);
  assert.deepEqual(c.press(2, 40 + WINDOW + 0.5), { t: 'category', cat: 2 }, 'en annan kategori byter');
  assert.deepEqual(c.press(5, 40 + WINDOW + 0.6), { t: 'pick', id: 'psg90' });
  // siffror utan kategori gör ingenting
  assert.deepEqual(c.press(0, 50), { t: 'none' }); assert.deepEqual(c.press(7, 50), { t: 'none' }); assert.equal(c.open, null);
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
