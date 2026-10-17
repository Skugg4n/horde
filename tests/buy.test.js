import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, build } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { SHOP, BUY_MENU, hotkeyOf, itemAt, dayMenu } from '../src/data/shop.js';
import { inArsenal } from '../src/sim/stats.js';
import { createChord, WINDOW } from '../src/ui/chord.js';
import { buyState, canPickUp } from '../src/sim/buy.js';

const e4 = (o = {}) => createSim({ map: MAPS.riksvagen, day: 1, cash: 500, research: [], seed: 1, ...o });

// 0.11.0 (Olas önskan): kategorier med tvåstegs snabbval, ordningen bara i BUY_MENU. Units från
// svagast och billigast till starkast, Hemvärnet först.
// 0.13.0: de civila, infanteriet och pillboxen in i ordningen från svagast till starkast; snabbvalen räknas
// på dagens köprad (förrådet per sektor och dag).
test('köpraden: Defenses och Units; snabbvalen följer dagens förråd', () => {
  assert.deepEqual(BUY_MENU.map(c => c.name), ['Defenses', 'Units']);
  // 0.14.0: skrotbilarna (förnödenheter) sist i Defenses
  assert.deepEqual(SHOP.map(s => s.id), ['block', 'wire', 'car', 'civ', 'hv', 'inf', 'm249', 'm2', 'epa', 'ksp58', 'ak5', 'psg90']);
  // 0.16.0: tvåstegsvalet bara med fler än 9 kort (hela raden har 12)
  assert.deepEqual(SHOP.map(s => hotkeyOf(s.id)), ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7', '2-8', '2-9']);
  assert.equal(itemAt(2, 4), 'm249'); assert.equal(itemAt(1, 4), null); assert.equal(itemAt(3, 1), null);
  const e4 = dayMenu(id => inArsenal(id, MAPS.riksvagen, MAPS.riksvagen.days[0]));
  assert.deepEqual(e4[1].items.map(i => i.id), ['inf', 'm249', 'm2', 'epa'], 'E4: armén, inget Hemvärn');
  assert.equal(hotkeyOf('m249', e4), '4', '0.16.0: en siffra per kort när raden har högst 9');
  const g1 = dayMenu(id => inArsenal(id, MAPS.gnesta, MAPS.gnesta.days[0]));
  assert.deepEqual(g1.map(c => c.items.map(i => i.id)), [['block', 'wire'], ['civ']], 'Gnesta dag 1: civila, barrikader och tråd');
  assert.equal(itemAt(2, 1, g1), 'civ');
  const c = createChord({ menu: () => e4 });
  assert.equal(c.chords, false);
  assert.deepEqual(c.press(6, 0), { t: 'pick', id: 'epa' }, 'block, wire, inf, m249, m2, epa: 6');
  assert.deepEqual(c.press(9, 0), { t: 'none' });
  assert.equal(c.open, null);
});

// 0.16.0 (Olas beslut 3): enkla siffror 1, 2, 3; ett tryck väljer kortet.
test('köpradens siffror: ett tryck per kort, tvåstegsvalet först med fler än 9 kort', () => {
  const two = [{ id: 'units', name: 'Units', items: [{ id: 'inf' }, { id: 'm249' }] }];
  const c = createChord({ menu: () => two });
  assert.deepEqual(c.press(2, 0), { t: 'pick', id: 'm249' });
  assert.deepEqual(c.press(1, 0), { t: 'pick', id: 'inf' });
  assert.deepEqual(c.press(3, 0), { t: 'none' });
  assert.equal(hotkeyOf('m249', two), '2');
  const full = createChord();
  assert.equal(full.chords, true, 'hela raden har 12 kort');
  assert.deepEqual(full.press(2, 0), { t: 'category', cat: 2 });
});

test('tvåstegsvalet (fler än 9 kort): kategori, sak, Esc, och tidsgränsen är bara bild (0.12.0)', () => {
  const c = createChord();
  assert.deepEqual(c.press(2, 0), { t: 'category', cat: 2 });
  assert.equal(c.open, 2);
  assert.deepEqual(c.press(4, 0.5), { t: 'pick', id: 'm249' });
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
  assert.deepEqual(c.press(5, 40 + WINDOW + 3), { t: 'pick', id: 'm2' }, '2, paus, 5 = Ksp 88');
  c.press(2, 60); assert.deepEqual(c.press(9, 60 + 30), { t: 'pick', id: 'psg90' });
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

// 0.13.0 (H104): E4 är vägspärren med armén (Ksp 88, infanteriet och pillboxen utan forskning, inget
// Hemvärn); Gnesta dag 1 har bara de civila; forskningen gäller ovanpå förrådet.
test('förrådet per sektor och dag, och forskningen ovanpå', () => {
  const sim = e4();
  assert.equal(buyState(sim, 'm2').state, 'poor', 'E4 har Ksp 88 utan forskning');
  assert.equal(buyState(sim, 'inf').state, 'ok');
  assert.equal(buyState(sim, 'hv').state, 'absent', 'inget Hemvärn på E4');
  assert.equal(buyState(sim, 'block').state, 'locked');
  assert.equal(buyState(sim, 'wire').state, 'ok');
  assert.equal(build(sim, sim.place.walkKeys[0] + 2 * sim.place.w, 'hv').reason, 'ej här');
  const g = createSim({ map: MAPS.gnesta, day: 1, cash: 800, research: [], seed: 1 });
  assert.equal(buyState(g, 'block').state, 'ok');
  assert.equal(buyState(g, 'civ').state, 'ok');
  for (const t of ['hv', 'm249', 'm2', 'inf', 'psg90']) assert.equal(buyState(g, t).state, 'absent', `Gnesta dag 1: ${t}`);
  const g2 = createSim({ map: MAPS.gnesta, day: 2, cash: 800, research: [], seed: 1 });
  assert.equal(buyState(g2, 'hv').state, 'ok', 'Hemvärnet dag 2');
  assert.equal(buyState(g2, 'm2').state, 'absent', 'Ksp 88 först dag 5');
  const g5 = createSim({ map: MAPS.gnesta, day: 5, cash: 800, research: [], seed: 1 });
  assert.equal(buyState(g5, 'm2').state, 'ok');
  assert.equal(buyState(g5, 'psg90').state, 'ok', 'banan lånar ut Psg 90 från dag 4');
  assert.equal(buyState(createSim({ map: MAPS.gnesta, day: 3, cash: 800, research: [], seed: 1 }), 'psg90').state, 'absent', 'men inte före');
  const n3 = createSim({ map: MAPS['gnesta-norr'], day: 3, cash: 800, research: [], seed: 1 });
  assert.equal(buyState(n3, 'inf').state, 'ok', 'infanteriet på North från dag 3');
  assert.equal(buyState(createSim({ map: MAPS['gnesta-norr'], day: 1, cash: 800, research: [], seed: 1 }), 'inf').state, 'absent');
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
  const sim = createSim({ map: MAPS['gnesta-norr'], day: 1, cash: 1e5, research: [], seed: 1 });
  assert.equal(sim.maxGuns, 5);
  assert.equal(sim.maxSquads, 2);
  const open = [];
  for (let k = 0; k < sim.place.n; k++) if (sim.place.kind[k] === 0) open.push(k);
  let i = 0;
  const put = type => { for (; i < open.length; i++) if (build(sim, open[i], type).ok) return true; return false; };
  assert.ok(put('hv') && put('hv'));
  assert.equal(buyState(sim, 'hv').state, 'full', 'två grupper är taket');
  assert.equal(buyState(sim, 'm249').state, 'ok', 'grupperna tar inga pjäsplatser');
  for (let n = 0; n < 5; n++) assert.ok(put('m249'));
  assert.equal(gunCount(sim), 5);
  assert.equal(squadCount(sim), 2);
  assert.equal(buyState(sim, 'm249').state, 'full');
  const more = e4({ cash: 1e5, research: ['hvRifles.1', 'hvPlatoon.1'] });
  assert.equal(more.maxSquads, 3);
  assert.equal(createSim({ map: MAPS.gnesta, day: 1, cash: 0, research: [], seed: 1 }).maxSquads, 4, 'Gnesta dag 1: fyra grupper civila');
});

test('Gnesta South och North: fem pjäser från början, More positions ger en till', () => {
  for (const map of [MAPS.gnesta, MAPS['gnesta-norr']]) {
    assert.equal(createSim({ map, day: 1, cash: 0, research: [], seed: 1 }).maxGuns, 5, map.id);
    assert.equal(createSim({ map, day: 1, cash: 0, research: ['m2.1', 'positions.1'], seed: 1 }).maxGuns, 6, map.id);
  }
  assert.equal(createSim({ map: MAPS.riksvagen, day: 1, cash: 0, research: ['m2.1', 'positions.1'], seed: 1 }).maxGuns, 5);
});

// 0.16.2 (speltestet av 0.16.1: "kortraden hoppar", Ksp 90 gick från 5 till 4 när ett kort tog slut): en typ där
// alla är utställda står kvar i köpraden som 'out', och siffrorna på korten flyttar inte.
test('slutställda kort står kvar grå och siffrorna är stabila', async () => {
  const { opStartConfig, newCampaign } = await import('../src/meta/operation.js');
  const { inBar } = await import('../src/sim/buy.js');
  const sim = createSim(opStartConfig(newCampaign(), 1, 'riksvagen'));
  const keys = () => { const m = dayMenu(id => inBar(sim, id)); return m.flatMap(c => c.items).map(it => it.id + hotkeyOf(it.id, m)).join(' '); };
  const before = keys();
  assert.match(before, /m249/);
  assert.equal(build(sim, [...sim.marked][0], 'm249').ok, true);
  assert.equal(buyState(sim, 'm249').state, 'out', 'alla Ksp 90 ute: kortet står kvar');
  assert.equal(canPickUp(sim, 'm249'), false);
  assert.equal(keys(), before, 'samma kort, samma siffror');
});
