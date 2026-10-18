// Kamerans klipplan (0.17.2, H309, Olas speltest av 0.17.1: "hus längst ner på skärmen blir genomskinliga vid
// scroll"). Längst ut i zoomen låg skärmens nederkant bakom kameran och närplanet skar upp husen. Kameran står nu
// längre bort (src/render/camera-eye.js); här provas att allt i bild ligger mellan när- och fjärrplanet på varje
// bana, i liggande och stående format, för hus upp till 25 m.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps.js';
import { depthRange, maxView, NEAR, FAR, EYE_BACK } from '../src/render/camera-eye.js';

test('längst ut i zoomen ligger allt i bild framför närplanet och innanför fjärrplanet', () => {
  for (const map of Object.values(MAPS)) {
    const v = maxView(map);
    for (const aspect of [16 / 10, 21 / 9, 4 / 3, 9 / 16]) {
      const r = depthRange(v, aspect, 25);
      assert.ok(r.near > NEAR + 5, `${map.id} zoom ${v} format ${aspect.toFixed(2)}: närmast ${r.near.toFixed(1)} m`);
      assert.ok(r.far < FAR - 50, `${map.id}: längst bort ${r.far.toFixed(1)} m`);
    }
  }
});

test('felet fanns: med det gamla avståndet skar närplanet bilden på Mölnbo', () => {
  const r = depthRange(maxView(MAPS.molnbo), 16 / 10, 10, 1);
  assert.ok(r.near < 0, `förut ${r.near.toFixed(1)} m`);
  assert.ok(EYE_BACK > 1);
});
