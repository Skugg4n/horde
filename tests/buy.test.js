import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, build } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { SHOP, BUY_MENU, hotkeyOf, itemAt } from '../src/data/shop.js';
import { createChord, WINDOW } from '../src/ui/chord.js';
import { buyState, canPickUp } from '../src/sim/buy.js';

const e4 = (o = {}) => createSim({ map: MAPS.riksvagen, day: 1, cash: 500, research: [], seed: 1, ...o });

// 0.11.0 (Olas önskan): kategorier med tvåstegs snabbval, ordningen bara i BUY_MENU. Units från
// svagast och billigast till starkast, Hemvärnet först.
test('köpraden: Defenses och Units; snabbvalen 1-1 till 2-6', () => {
  assert.deepEqual(BUY_MENU.map(c => c.name), ['Defenses', 'Units']);
  assert.deepEqual(SHOP.map(s => s.id), ['block', 'wire', 'hv', 'm249', 'm2', 'ksp58', 'ak5', 'psg90']);
  assert.deepEqual(SHOP.map(s => hotkeyOf(s.id)), ['1-1', '1-2', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6']);
  assert.equal(itemAt(2, 2), 'm249'); assert.equal(itemAt(1, 3), null); assert.equal(itemAt(3, 1), null);
});

test('tvåstegsvalet: kategori, sak, Esc, och tidsgränsen är bara bild (0.12.0)', () => {
  const c = createChord();
  assert.deepEqual(c.press(2, 0), { t: 'category', cat: 2 });
  assert.equal(c.open, 2);
  assert.deepEqual(c.press(2, 0.5), { t: 'pick', id: 'm249' });
  assert.equal(c.open, null, 'kategorin stängs när saken är vald');
  c.press(1, 10); assert.deepEqual(c.press(1, 10.4), { t: 'pick', id: 'block' });
  // en plats som inte finns gör ingenting, kategorin står kvar
  c.press(1, 20); assert.deepEqual(c.press(4, 20.2), { t: 'none' }); assert.equal(c.open, 1);
  // Esc stänger kategorin och säger att den gjorde det
  assert.equal(c.escape(), true); assert.equal(c.open, null); assert.equal(c.escape(), false);
  // speltestet av 0.11.0: efter tidsgränsen väljer andra siffran fortfarande en sak, samma siffra också
  c.press(1, 30);
  assert.equal(c.armed(30 + WINDOW + 0.1), false, 'lugnare bild efter tidsgränsen');
  assert.equal(c.open, 1, 'men fortfarande öppen');
  assert.deepEqual(c.press(1, 30 + WINDOW + 5), { t: 'pick', id: 'block' }, '1, paus, 1 = barrikaden');
  c.press(2, 40);
  assert.deepEqual(c.press(3, 40 + WINDOW + 3), { t: 'pick', id: 'm2' }, '2, paus, 3 = Ksp 88');
  c.press(2, 60); assert.deepEqual(c.press(6, 60 + 30), { t: 'pick', id: 'psg90' });
  // siffror utan kategori gör ingenting
  assert.deepEqual(c.press(0, 50), { t: 'none' }); assert.deepEqual(c.press(3, 50), { t: 'none' }); assert.equal(c.open, null);
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

// 0.12.1 (speltestet av 0.12.0: 5 av 5 platser med $ 900 över): Hemvärnet räknas inte mot pjäserna och
// har ett eget tak (två grupper, More squads höjer). Gnesta South och North har fem pjäser från början.
test('Hemvärnet har eget tak och räknas inte mot pjäsernas platser', async () => {
  const { gunCount, squadCount } = await import('../src/sim/sim.js');
  const sim = e4({ cash: 1e5 });
  assert.equal(sim.maxGuns, 4);
  assert.equal(sim.maxSquads, 2);
  const open = [];
  for (let k = 0; k < sim.place.n; k++) if (sim.place.kind[k] === 0) open.push(k);
  let i = 0;
  const put = type => { for (; i < open.length; i++) if (build(sim, open[i], type).ok) return true; return false; };
  assert.ok(put('hv') && put('hv'));
  assert.equal(buyState(sim, 'hv').state, 'full', 'två grupper är taket');
  assert.equal(buyState(sim, 'm249').state, 'ok', 'grupperna tar inga pjäsplatser');
  for (let n = 0; n < 4; n++) assert.ok(put('m249'));
  assert.equal(gunCount(sim), 4);
  assert.equal(squadCount(sim), 2);
  assert.equal(buyState(sim, 'm249').state, 'full');
  const more = e4({ cash: 1e5, research: ['hvRifles.1', 'hvPlatoon.1'] });
  assert.equal(more.maxSquads, 3);
});

test('Gnesta South och North: fem pjäser från början, More positions ger en till', () => {
  for (const map of [MAPS.gnesta, MAPS['gnesta-norr']]) {
    assert.equal(createSim({ map, day: 1, cash: 0, research: [], seed: 1 }).maxGuns, 5, map.id);
    assert.equal(createSim({ map, day: 1, cash: 0, research: ['m2.1', 'positions.1'], seed: 1 }).maxGuns, 6, map.id);
  }
  assert.equal(createSim({ map: MAPS.riksvagen, day: 1, cash: 0, research: ['m2.1', 'positions.1'], seed: 1 }).maxGuns, 5);
});
