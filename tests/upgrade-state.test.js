import test from 'node:test';
import assert from 'node:assert/strict';
import { upgradeState } from '../src/ui/panels.js';

// 0.12.2 (speltestet): Ksp 88 nivå 1, Upgrade $ 450 grå med $ 1 264 i kassan mitt i en våg på North.
// Knappens läge ska alltid vara ett riktigt true/false (classList.toggle med undefined växlar
// klassen varje bildruta), och när den inte går ska skälet stå på knappen.
const gun = (type, level, extra = {}) => ({ weapon: { type, level }, ...extra });

test('Ksp 88 nivå 1 med $ 1 264 mitt i en våg går att uppgradera', () => {
  const st = upgradeState({ phase: 'wave', cash: 1264 }, gun('m2', 1));
  assert.equal(st.ok, true);
  assert.equal(typeof st.ok, 'boolean');
  assert.equal(st.text, '$ 450');
});

test('ok är alltid true eller false, aldrig undefined', () => {
  for (const g of [gun('m2', 1), gun('m249', 2), gun('hv', 1, { squad: true }), gun('m2', 3)])
    for (const phase of ['build', 'wave', 'won'])
      for (const cash of [0, 449, 450, 5000]) {
        const st = upgradeState({ phase, cash }, g, { noRoom: false });
        assert.equal(typeof st.ok, 'boolean');
        assert.equal(typeof st.max, 'boolean');
      }
});

test('skälet står på knappen när den inte går', () => {
  assert.equal(upgradeState({ phase: 'wave', cash: 400 }, gun('m2', 1)).text, 'Need $ 50 more');
  assert.equal(upgradeState({ phase: 'wave', cash: 9999 }, gun('m2', 3)).text, 'Max level');
  assert.equal(upgradeState({ phase: 'won', cash: 9999 }, gun('m2', 1)).text, 'Day over');
  assert.equal(upgradeState({ phase: 'build', cash: 9999 }, gun('hv', 1, { squad: true }), { noRoom: true }).text, 'No room');
  assert.equal(upgradeState({ phase: 'build', cash: 9999 }, gun('hv', 1, { squad: true }), { noRoom: true }).ok, false);
});
