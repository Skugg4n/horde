// Musiken: en mörk bädd som spelas fram live. Lager: drön (låga sågtänder och sub), vind (filtrerat
// brus), pad (ackord som tonar in och ut, filtret följer spänningen) och puls (låg trumma och
// svaga tickande slag under vågen). setIntensity(0..1) tonar lagren mjukt; update(now) lägger ut
// pulsen en kort bit framåt i tiden. E4 och Gnesta har olika tonart och textur.
import { musicLayers } from './mix.js';

const MOODS = {
  // E4: d-moll, grov vind, sågtänder.
  riksvagen: { root: 73.42, wind: 0.22, padWave: 'sawtooth', bpm: 64,
    chords: [[0, 7, 15, 22], [-4, 3, 12, 19], [-2, 5, 14, 17], [0, 5, 15, 24]] },
  // Gnesta: h-frygisk, luftigare, mer klang och mindre brus.
  gnesta: { root: 61.74, wind: 0.11, padWave: 'triangle', bpm: 58,
    chords: [[0, 7, 15, 24], [1, 8, 13, 20], [-2, 5, 15, 22], [0, 3, 10, 19]] },
};
const semi = n => Math.pow(2, n / 12);
const TC = 1.5;   // tidskonstant för övertoningar (s)

export function createMusic(A, out) {
  const { ctx } = A;
  let mood = MOODS.riksvagen, moodId = 'riksvagen', intensity = 0, layers = musicLayers(0);
  const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(out);
  const mk = v => { const g = ctx.createGain(); g.gain.value = v; g.connect(bus); return g; };
  const droneG = mk(0), windG = mk(0), padG = mk(0), pulseG = mk(0), tickG = mk(0);

  // Drön: två sågtänder nära varandra och en sub, genom ett lågpass som andas långsamt.
  const droneLp = ctx.createBiquadFilter(); droneLp.type = 'lowpass'; droneLp.frequency.value = 200; droneLp.Q.value = 2;
  droneLp.connect(droneG);
  const drones = [[1, 'sawtooth', 0.18], [1.004, 'sawtooth', 0.18], [0.5, 'sine', 0.5], [1.5, 'triangle', 0.05]].map(([k, type, lvl]) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = mood.root * k;
    const g = ctx.createGain(); g.gain.value = lvl; o.connect(g); g.connect(droneLp); o.start();
    return { o, k };
  });
  const lfo = (f, depth, param) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); return o; };
  lfo(0.047, 70, droneLp.frequency);

  // Vind: brunt brus i ett bandpass som vandrar.
  const wind = ctx.createBufferSource(); wind.buffer = A.buf.brown; wind.loop = true;
  const windBp = ctx.createBiquadFilter(); windBp.type = 'bandpass'; windBp.frequency.value = 420; windBp.Q.value = 0.8;
  wind.connect(windBp); windBp.connect(windG); wind.start();
  lfo(0.031, 220, windBp.frequency);

  // Pad: delat filter, ett nytt ackord var 12:e till 16:e sekund som tonar över det förra.
  const padLp = ctx.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = layers.cutoff; padLp.Q.value = 1.2;
  padLp.connect(padG);
  lfo(0.07, 90, padLp.frequency);
  let nextChord = ctx.currentTime + 0.1, chordIx = 0;
  function playChord(t) {
    const ch = mood.chords[chordIx++ % mood.chords.length], len = 14 + Math.random() * 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 4.5);
    g.gain.setValueAtTime(0.07, t + len - 5); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(padLp);
    for (const n of ch) for (const det of [-6, 7]) {
      const o = ctx.createOscillator(); o.type = mood.padWave;
      o.frequency.value = mood.root * 2 * semi(n); o.detune.value = det + (Math.random() * 4 - 2);
      o.connect(g); o.start(t); o.stop(t + len + 0.1);
    }
    nextChord = t + len - 5;   // nästa börjar medan detta tonar ut
  }

  // Puls: låg trumma på slagen, svaga tick på mellanslagen när spänningen är hög.
  let nextBeat = ctx.currentTime + 0.2, beat = 0;
  function kick(t, peak) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(pulseG); o.start(t); o.stop(t + 0.55);
  }
  function tick(t, peak) {
    const s = ctx.createBufferSource(); s.buffer = A.buf.white;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(f); f.connect(g); g.connect(tickG); s.start(t, Math.random(), 0.06);
  }

  function apply(now) {
    const L = layers;
    droneG.gain.setTargetAtTime(L.drone * 0.5, now, TC);
    windG.gain.setTargetAtTime(mood.wind * (0.6 + intensity * 0.6), now, TC);
    padG.gain.setTargetAtTime(L.pad, now, TC);
    pulseG.gain.setTargetAtTime(L.pulse * 0.5, now, TC * 0.7);
    tickG.gain.setTargetAtTime(L.tick * 0.06, now, TC * 0.7);
    padLp.frequency.setTargetAtTime(L.cutoff, now, TC * 2);
  }
  apply(ctx.currentTime);

  return {
    setIntensity(i) {
      if (Math.abs(i - intensity) < 1e-3) return;
      intensity = i; layers = musicLayers(i); apply(ctx.currentTime);
    },
    get intensity() { return intensity; },
    setMood(id) {
      const m = MOODS[id] ?? (id && id !== 'riksvagen' ? MOODS.gnesta : MOODS.riksvagen);
      if (m === mood) return;
      mood = m; moodId = id;
      const now = ctx.currentTime;
      for (const d of drones) d.o.frequency.setTargetAtTime(mood.root * d.k, now, 2.5);
      apply(now);
    },
    get mood() { return moodId; },
    // Lägger ut ackord och slag som ska börja inom den närmaste kvartssekunden.
    update(now) {
      const ahead = now + 0.25;
      if (nextChord < now - 1) nextChord = now;   // efter paus: fortsätt härifrån
      if (nextBeat < now - 0.5) nextBeat = now + 0.05;
      while (nextChord < ahead) playChord(Math.max(now, nextChord));
      const spb = 60 / mood.bpm;
      while (nextBeat < ahead) {
        const t = nextBeat, b = beat++;
        // Lugnt: var fjärde slag. Spänt: varje slag, i fara med ett eko som ett hjärtslag.
        if (layers.pulse > 0) {
          if (layers.pulse > 0.6 || b % 4 === 0) kick(t, b % 4 === 0 ? 0.9 : 0.6);
          if (intensity >= 1) kick(t + 0.2, 0.4);
        }
        if (layers.tick > 0) { tick(t + spb / 2, 0.5); if (Math.random() < 0.4) tick(t + spb * 0.75, 0.3); }
        nextBeat += spb;
      }
    },
  };
}
