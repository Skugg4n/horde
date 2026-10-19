// 0.19.2 (speltestet av 0.19.1, fynd 4): världens lappar undviker varandra på skärmen (src/ui/declutter.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { declutter } from '../src/ui/declutter.js';

const R = (left, top, w = 60, h = 16) => ({ left, top, right: left + w, bottom: top + h });
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const at = (r, d) => ({ ...r, top: r.top + d.dy, bottom: r.bottom + d.dy });

test('lappar som inte krockar står kvar', () => {
  const out = declutter([{ r: R(0, 0) }, { r: R(100, 0) }]);
  assert.deepEqual(out, [{ dy: 0, hidden: false }, { dy: 0, hidden: false }]);
});

test('tre lappar i en klump staplas utan att någon ligger på en annan, den viktigaste står kvar', () => {
  const items = [{ r: R(10, 100), prio: 1 }, { r: R(14, 104), prio: 3 }, { r: R(8, 98), prio: 2 }];
  const out = declutter(items, { maxNudge: 60 });
  assert.equal(out[1].dy, 0, 'högst prioritet flyttas inte');
  const placed = items.map((it, i) => (out[i].hidden ? null : at(it.r, out[i]))).filter(Boolean);
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) assert.ok(!overlap(placed[i], placed[j]), `lapp ${i} och ${j} krockar`);
});

test('en lapp som inte ryms inom knuffen döljs, en fast ruta flyttas aldrig', () => {
  const fixed = [R(0, 60, 200, 80)];
  const out = declutter([{ r: R(20, 90) }], { fixed, maxNudge: 10 });
  assert.equal(out[0].hidden, true);
  const kept = declutter([{ r: R(20, 90), hide: false, move: false }], { fixed, maxNudge: 10 });
  assert.deepEqual(kept[0], { dy: 0, hidden: false });
});

test('knuffen går upp när det inte finns plats under', () => {
  const out = declutter([{ r: R(0, 100), prio: 2 }, { r: R(0, 108), prio: 1 }], { bounds: { top: 0, bottom: 125 } });
  assert.ok(out[1].dy < 0 && !out[1].hidden);
});
