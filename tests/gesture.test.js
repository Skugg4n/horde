// Gesterna på kartan. 0.17.2 (H300, Olas beslut): med kort i handen ställer ett klick ut (riktningen mot vägen),
// tryck-håll-dra siktar, höger- och Alt-dra siktar direkt; utan kort panorerar vänster-dra.
// Reglerna i src/ui/gesture.js; scripts/placement-harness.mjs provar dem med riktiga pekarhändelser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pressKind, releaseAction, dragAims, pans, edgeDir, isDrag, DRAG_PX, HOLD_MS, BUTTON } from '../src/ui/gesture.js';

const aimable = { holding: true, cone: true, aimUnlocked: true, validSpot: true };

test('utan kort: vänster, höger och mitten panorerar, ett vänsterklick väljer', () => {
  for (const button of [BUTTON.left, BUTTON.right, BUTTON.middle]) {
    assert.equal(pressKind({ button }), 'pan');
    assert.equal(pans(button, false), true);
    assert.equal(releaseAction({ kind: 'pan', button, moved: true }), 'none');
  }
  assert.equal(releaseAction({ kind: 'pan', button: BUTTON.left, moved: false }), 'click');
  assert.equal(releaseAction({ kind: 'pan', button: BUTTON.right, moved: false, holding: false }), 'none');
});

test('med kort: bara mittknappen panorerar', () => {
  assert.equal(pans(BUTTON.middle, true), true);
  assert.equal(pans(BUTTON.left, true), false);
  assert.equal(pans(BUTTON.right, true), false);
  assert.equal(pressKind({ button: BUTTON.middle, ...aimable }), 'pan');
});

test('med kort: ett klick ställer ut (vinkeln mot vägen), också där siktet inte går', () => {
  assert.equal(pressKind({ button: BUTTON.left, ...aimable }), 'hold');
  assert.equal(releaseAction({ kind: 'hold', button: BUTTON.left, moved: false, holding: true }), 'click');
  for (const k of ['cone', 'aimUnlocked', 'validSpot']) {
    const kind = pressKind({ button: BUTTON.left, ...aimable, [k]: false });
    assert.equal(kind, 'hand', k);
    assert.equal(releaseAction({ kind, button: BUTTON.left, moved: false, holding: true }), 'click', k);
  }
});

test('tryck, håll och dra siktar; dra utan att hålla gör ingenting', () => {
  assert.equal(dragAims('hold', HOLD_MS), true);
  assert.equal(dragAims('hold', HOLD_MS + 400), true);
  assert.equal(dragAims('hold', HOLD_MS - 1), false);
  assert.equal(dragAims('hold', 0), false);
  assert.equal(releaseAction({ kind: 'hold', button: BUTTON.left, moved: true, holding: true, aimed: true }), 'place-aimed');
  // för tidig dragning: varken utställd eller panorering
  assert.equal(releaseAction({ kind: 'hold', button: BUTTON.left, moved: true, holding: true, aimed: false }), 'none');
  // ingen sikte-plats: dragningen gör ingenting
  assert.equal(dragAims('hand', 5000), false);
  assert.equal(releaseAction({ kind: 'hand', button: BUTTON.left, moved: true, holding: true, aimed: false }), 'none');
});

test('höger-dra och Alt-dra siktar direkt; högerklick lägger tillbaka', () => {
  assert.equal(pressKind({ button: BUTTON.right, ...aimable }), 'aim');
  assert.equal(pressKind({ button: BUTTON.left, ...aimable, alt: true }), 'aim');
  assert.equal(dragAims('aim', 0), true);
  assert.equal(releaseAction({ kind: 'aim', button: BUTTON.right, moved: true, holding: true, aimed: true }), 'place-aimed');
  assert.equal(releaseAction({ kind: 'aim', button: BUTTON.left, moved: true, holding: true, aimed: true }), 'place-aimed');
  // högerklick utan dragning: lägg tillbaka, både där siktet går och där det inte gör det
  assert.equal(releaseAction({ kind: 'aim', button: BUTTON.right, moved: false, holding: true }), 'cancel');
  assert.equal(pressKind({ button: BUTTON.right, ...aimable, cone: false }), 'hand');
  assert.equal(releaseAction({ kind: 'hand', button: BUTTON.right, moved: false, holding: true }), 'cancel');
  assert.equal(releaseAction({ kind: 'hand', button: BUTTON.right, moved: true, holding: true }), 'none');
  // Alt-klick utan dragning är ett vanligt klick
  assert.equal(releaseAction({ kind: 'aim', button: BUTTON.left, moved: false, holding: true }), 'click');
});

test('dragningens tröskel och kantpanoreringen', () => {
  assert.equal(isDrag(DRAG_PX - 1, 0), false);
  assert.equal(isDrag(DRAG_PX, 0), true);
  assert.equal(isDrag(6, 6), true);
  assert.deepEqual(edgeDir(500, 400, 1000, 800), [0, 0]);
  assert.deepEqual(edgeDir(2, 400, 1000, 800), [-1, 0]);
  assert.deepEqual(edgeDir(998, 799, 1000, 800), [1, 1]);
  assert.deepEqual(edgeDir(500, 0, 1000, 800), [0, -1]);
});
