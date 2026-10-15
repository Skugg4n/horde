import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, build, upgrade, squadPreview } from '../src/sim/sim.js';
import { SQUAD, COVER, coverOf, squadSize, soldierHp } from '../src/sim/squad.js';
import { weaponStats } from '../src/sim/stats.js';
import { WEAPONS } from '../src/data/weapons.js';
import { RESEARCH } from '../src/data/research.js';
import { newProgress, canBuyResearch, buyResearch } from '../src/meta/progress.js';
import { gnesta } from '../src/data/gnesta.js';
import { gnestaNorr } from '../src/data/gnesta-norr.js';
import { placementFor, KIND } from '../src/sim/placement.js';

// Hemvärnet i forskningen (1.0.0, H054): bättre gevär, fler man och veteraner.

test('forskningen: tre noder, gevären först, fler man och veteraner efter', () => {
  const ids = RESEARCH.map(n => n.id);
  for (const id of ['hvRifles', 'hvSquad', 'hvVeterans']) assert.ok(ids.includes(id), id);
  let p = { ...newProgress(), intel: 5000 };
  assert.equal(canBuyResearch(p, 'hvSquad').reason, 'kräver');
  p = buyResearch(p, 'hvRifles');
  assert.equal(canBuyResearch(p, 'hvVeterans').reason, 'kräver');
  p = buyResearch(buyResearch(p, 'hvSquad'), 'hvVeterans');
  assert.deepEqual(p.research, ['hvRifles.1', 'hvSquad.1', 'hvVeterans.1']);
});

test('Better rifles: varje soldat skjuter hårdare och fortare', () => {
  const base = weaponStats('hv', 1, []);
  const tiers = [1, 2, 3].map(t => weaponStats('hv', 1, Array.from({ length: t }, (_, i) => `hvRifles.${i + 1}`)));
  let prev = base;
  for (const st of tiers) {
    assert.ok(st.damage > prev.damage && st.rate > prev.rate);
    prev = st;
  }
  assert.ok(Math.abs(tiers[2].damage - WEAPONS.hv.damage * 1.6) < 1e-9);
  // andra vapen påverkas inte
  assert.deepEqual(weaponStats('m249', 1, ['hvRifles.3']), weaponStats('m249', 1, []));
});

test('Bigger squad och veteraner: en femte och sjätte man, mer liv, redan när gruppen köps', () => {
  assert.equal(squadSize(1, []), 4);
  assert.equal(squadSize(1, ['hvSquad.1']), 5);
  assert.equal(squadSize(1, ['hvSquad.1', 'hvSquad.2']), 6);
  assert.equal(soldierHp(1, ['hvVeterans.2']), SQUAD.hp[0] * 2);
  const research = ['hvRifles.1', 'hvSquad.1', 'hvSquad.2', 'hvVeterans.1'];
  const sim = createSim({ map: gnesta, day: 1, cash: 5000, research, seed: 1 });
  const p = sim.place;
  let k = -1;
  for (let i = 0; i < p.n; i += 7) if (p.kind[i] === KIND.open && squadPreview(sim, i).length === 6 && build(sim, i, 'hv').ok) { k = i; break; }
  assert.ok(k >= 0);
  const g = sim.guns[0];
  assert.equal(g.soldiers.length, 6);
  assert.ok(g.soldiers.every(s => s.maxHp === SQUAD.hp[0] * 1.5));
  // nivå 2 ger som förut en man till, ovanpå forskningen
  assert.equal(upgrade(sim, g.id).ok, true);
  assert.ok(g.soldiers.length >= 6 && g.soldiers.length <= 7);
  assert.ok(g.soldiers.every(s => s.maxHp === SQUAD.hp[1] * 1.5));
});

test('gruppen med full forskning är inte bättre än pjäserna per plats', () => {
  // Per plats (positionerna är det som tar slut) ska Ksp 88 på nivå 3 med full forskning vara
  // starkare än en full grupp med full forskning; per krona är gruppen billigare. Sårbar är den alltid.
  const all = ['m2.1', 'm2.2', 'm2.3', 'hvRifles.1', 'hvRifles.2', 'hvRifles.3', 'hvSquad.1', 'hvSquad.2'];
  const dps = (type, lvl, men = 1) => { const s = weaponStats(type, lvl, all); return s.damage * s.rate * s.accuracy * men; };
  const hv = dps('hv', 3, squadSize(3, all)), heavy = dps('m2', 3);
  assert.ok(hv < heavy, `grupp ${hv.toFixed(0)} mot Ksp 88 ${heavy.toFixed(0)} per sekund`);
  const spentHv = WEAPONS.hv.cost + WEAPONS.hv.upgradeCost[0] + WEAPONS.hv.upgradeCost[1];
  const spentM2 = WEAPONS.m2.cost + WEAPONS.m2.upgradeCost[0] + WEAPONS.m2.upgradeCost[1];
  assert.ok(hv / spentHv > heavy / spentM2 * 0.8, 'per krona är gruppen nära eller bättre');
});

test('Gnesta Norr: radhusens tegelmurar är skydd, och en grupp vid längorna tar dem', () => {
  const p = placementFor(gnestaNorr);
  assert.ok(p.brick, 'banan har tegelmurar');
  const cells = [];
  for (let k = 0; k < p.n; k++) if (p.brick[k]) cells.push(k);
  assert.ok(cells.length > 40, `${cells.length} rutor med mur`);
  assert.equal(COVER.brick.stance, 'crouch');
  assert.ok(COVER.brick.score > COVER.hedge.score);
  const brick = cells.filter(k => coverOf(p, k) === 'brick');
  assert.ok(brick.length > 20, `${brick.length} rutor där muren är skyddet`);
  // en grupp med markeringen mitt bland murarna tar minst två murar
  const sim = createSim({ map: gnestaNorr, day: 1, cash: 9999, seed: 1 });
  let best = null;
  for (const k of brick) { const r = build(sim, k, 'hv'); if (r.ok) { best = sim.guns.at(-1); break; } }
  assert.ok(best, 'en grupp går att ställa vid murarna');
  assert.ok(best.soldiers.some(s => s.cover === 'brick'), best.soldiers.map(s => s.cover).join(', '));
  assert.ok(best.soldiers.every(s => s.stance === COVER[s.cover].stance));
});
