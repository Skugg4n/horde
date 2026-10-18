// Gesterna på kartan (0.17.1, speltestet av 0.17.0: "dra för att panorera med ett kort i handen placerade enheten").
// Reglerna i src/ui/gesture.js; scripts/placement-harness.mjs provar dem med riktiga pekarhändelser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pressKind, releaseAction, isDrag, DRAG_PX, BUTTON } from '../src/ui/gesture.js';

test('höger- och mittknappen panorerar alltid, också med något i handen på en giltig plats', () => {
  for (const button of [BUTTON.right, BUTTON.middle]) {
    assert.equal(pressKind({ button, holding: true, cone: true, aimUnlocked: true, validSpot: true }), 'pan');
    assert.equal(releaseAction({ kind: 'pan', button, moved: true, holding: true }), 'none');
  }
  // ett högerklick utan dragning lägger tillbaka det man håller; utan något i handen gör det ingenting
  assert.equal(releaseAction({ kind: 'pan', button: BUTTON.right, moved: false, holding: true }), 'cancel');
  assert.equal(releaseAction({ kind: 'pan', button: BUTTON.right, moved: false, holding: false }), 'none');
});

test('vänster-dra siktar bara på en giltig plats, med en skjutvinkel och siktet upplåst', () => {
  const ok = { button: BUTTON.left, holding: true, cone: true, aimUnlocked: true, validSpot: true };
  assert.equal(pressKind(ok), 'aim');
  for (const k of ['holding', 'cone', 'aimUnlocked', 'validSpot']) assert.equal(pressKind({ ...ok, [k]: false }), 'pan', k);
  assert.equal(releaseAction({ kind: 'aim', button: BUTTON.left, moved: true }), 'place-aimed');
  assert.equal(releaseAction({ kind: 'aim', button: BUTTON.left, moved: false }), 'click');
});

test('en panorering ställer aldrig ut något: bara ett tryck utan rörelse är ett klick', () => {
  for (const holding of [true, false]) {
    assert.equal(releaseAction({ kind: 'pan', button: BUTTON.left, moved: true, holding }), 'none');
    assert.equal(releaseAction({ kind: 'pan', button: BUTTON.left, moved: false, holding }), 'click');
  }
  assert.equal(isDrag(DRAG_PX - 1, 0), false);
  assert.equal(isDrag(DRAG_PX, 0), true);
  assert.equal(isDrag(6, 6), true);
});
