import test from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter, VOICES, TOTAL_CAP, gainsFor, curve, MUSIC_TRIM, musicIntensity, musicLayers, hordeLevel, groanGap, placeOnScreen } from '../src/audio/mix.js';
import { normalizeSettings } from '../src/meta/settings.js';

// Falsk klocka: tiden går bara när testet säger det.
const clock = () => { let t = 0; return { now: () => t, tick: dt => { t += dt; } }; };

test('30 M249-skott i samma bildruta: högst 6 röster, resten tystas och köas inte', () => {
  const L = createLimiter(), c = clock();
  let ok = 0;
  for (let i = 0; i < 30; i++) if (L.tryStart('m249', c.now(), 0.25) != null) ok++;
  assert.ok(ok >= 1 && ok <= VOICES.m249.cap, `startade ${ok}`);
  assert.ok(L.active('m249', c.now()) <= 6);
  assert.equal(L.stats.started + L.stats.dropped, 30);
});

test('en trång start skjuts fram högst lag sekunder, med gap mellan', () => {
  const L = createLimiter({ x: { cap: 10, gap: 0.05, lag: 0.12 } }), c = clock();
  const at = [];
  for (let i = 0; i < 5; i++) at.push(L.tryStart('x', c.now(), 0.1));
  assert.deepEqual(at.slice(0, 3).map(v => +v.toFixed(3)), [0, 0.05, 0.1]);
  assert.equal(at[3], null);
  c.tick(1);
  assert.equal(L.tryStart('x', c.now(), 0.1), 1);
});

test('röster som klingat ut frigör plats', () => {
  const L = createLimiter({ y: { cap: 2, gap: 0, lag: 0 } }), c = clock();
  assert.notEqual(L.tryStart('y', 0, 0.3), null);
  assert.notEqual(L.tryStart('y', 0, 0.3), null);
  assert.equal(L.tryStart('y', 0, 0.3), null);
  c.tick(0.31);
  assert.notEqual(L.tryStart('y', c.now(), 0.3), null);
  assert.equal(L.active('y', c.now()), 1);
});

test('taket för alla ljud tillsammans håller', () => {
  const table = {}; for (let i = 0; i < 60; i++) table['t' + i] = { cap: 5, gap: 0, lag: 0 };
  const L = createLimiter(table);
  for (let i = 0; i < 60; i++) for (let k = 0; k < 5; k++) L.tryStart('t' + i, 0, 1);
  assert.equal(L.active(null, 0), TOTAL_CAP);
});

test('250 zombier i 3x: varje bildruta 15 steg med skott, träffar och döda, taken håller hela tiden', () => {
  const L = createLimiter(), c = clock();
  let peak = 0, peakType = {};
  for (let frame = 0; frame < 600; frame++) {
    for (let s = 0; s < 15; s++) {
      for (const t of ['m249', 'm249', 'm2', 'hit', 'hit', 'kill', 'casing']) {
        if (!L.thin(t, 3)) continue;
        L.tryStart(t, c.now(), t === 'm2' ? 0.6 : 0.3);
      }
    }
    const counts = L.counts(c.now());
    for (const [k, v] of Object.entries(counts)) { peakType[k] = Math.max(peakType[k] ?? 0, v); assert.ok(v <= VOICES[k].cap, k + ' ' + v); }
    peak = Math.max(peak, L.active(null, c.now()));
    c.tick(1 / 60);
  }
  assert.ok(peak <= TOTAL_CAP);
  assert.equal(peakType.m249, 6);
});

test('gallring vid hög fart: 1x släpper allt, 3x var tredje, ljud utan thin släpps alltid', () => {
  const L = createLimiter();
  const pass = (t, sp, n) => { let k = 0; for (let i = 0; i < n; i++) if (L.thin(t, sp)) k++; return k; };
  assert.equal(pass('hit', 1, 30), 30);
  assert.equal(pass('kill', 3, 30), 10);
  assert.equal(pass('m249', 2, 30), 15);
  assert.equal(pass('groan', 3, 30), 30);
});

test('inställningarna till förstärkning: kvadratkurva, avstängt ger 0, musiken under effekterna', () => {
  assert.deepEqual(gainsFor(normalizeSettings({ sound: 1, music: 1 })), { sfx: 1, music: MUSIC_TRIM });
  const g = gainsFor(normalizeSettings({ sound: 0.5, music: 0.5, musicMuted: true }));
  assert.equal(g.sfx, 0.25); assert.equal(g.music, 0);
  assert.equal(gainsFor(normalizeSettings({ sound: 0.9, soundMuted: true })).sfx, 0);
  assert.equal(curve(0), 0);
});

test('musikens intensitet följer läget, och lagren följer intensiteten', () => {
  assert.equal(musicIntensity({ mode: 'menu' }), 0);
  assert.equal(musicIntensity({ mode: 'play', phase: 'build' }), 0.3);
  assert.equal(musicIntensity({ mode: 'play', phase: 'wave', baseFrac: 0.8 }), 0.7);
  assert.equal(musicIntensity({ mode: 'play', phase: 'wave', baseFrac: 0.2 }), 1);
  const calm = musicLayers(0.3), tense = musicLayers(0.7);
  assert.ok(tense.pulse > calm.pulse && tense.cutoff > calm.cutoff);
  assert.equal(musicLayers(0).pulse, 0);
  assert.equal(calm.tick, 0);
});

test('horden: nivån växer med antalet men stannar vid 1, stönen tätare med fler', () => {
  assert.equal(hordeLevel(0), 0);
  assert.ok(hordeLevel(20) < hordeLevel(100));
  assert.equal(hordeLevel(1000), 1);
  assert.equal(groanGap(0), Infinity);
  assert.ok(groanGap(100) < groanGap(5));
  assert.ok(groanGap(100, 3) > groanGap(100, 1));
});

test('skärmläget ger svag panorering och dämpning ut mot kanterna', () => {
  const mid = placeOnScreen(500, 400, 1000, 800);
  assert.equal(mid.pan, 0); assert.equal(mid.gain, 1);
  const right = placeOnScreen(1000, 400, 1000, 800);
  assert.equal(right.pan, 0.5); assert.ok(right.gain < 1 && right.gain >= 0.7);
  const far = placeOnScreen(5000, 400, 1000, 800);
  assert.equal(far.pan, 0.6); assert.equal(far.gain, 0.25);
  assert.deepEqual(placeOnScreen(NaN, 0, 1000, 800), { pan: 0, gain: 1 });
});

test('arsenalen: varje vapen har en egen röst med tak och takt i röstbudgeten', async () => {
  const { SOUNDS } = await import('../src/audio/voices.js');
  for (const id of ['m249', 'm2', 'ksp58', 'ak5', 'psg90', 'thoonk', 'pop']) {
    assert.ok(SOUNDS[id], id);
    assert.equal(SOUNDS[id].group, id);
    assert.ok(VOICES[id].cap >= 1 && VOICES[id].gap > 0, id);
  }
  for (const v of Object.values(SOUNDS)) assert.ok(VOICES[v.group], 'röstbudget för ' + v.group);
  // Ksp 58 ligger mellan Ksp 90 och Ksp 88 i tak och takt
  assert.ok(VOICES.m249.cap > VOICES.ksp58.cap && VOICES.ksp58.cap > VOICES.m2.cap);
  assert.ok(VOICES.m249.gap < VOICES.ksp58.gap && VOICES.ksp58.gap < VOICES.m2.gap);
  // Psg 90:s eko är långt, men högst två samtidigt
  assert.ok(SOUNDS.psg90.dur >= 2 && VOICES.psg90.cap <= 2);
  const L = createLimiter(), c = { t: 0 };
  let ok = 0;
  for (let i = 0; i < 20; i++) if (L.tryStart('psg90', c.t, SOUNDS.psg90.dur) != null) ok++;
  assert.equal(ok, 1, 'samma ögonblick: ett skott, resten tystas');
});
