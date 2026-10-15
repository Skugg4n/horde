// Ljuden själva, syntetiserade med Web Audio: brus, oscillatorer, filter, kuvert och mättning.
// Inga ljudfiler. Varje röst är { group, dur, play(A, t, o, out) }: group är röstbudgetens typ
// (mix.js), dur hur länge rösten låter, out noden den spelar in i (panorering och nivå är redan
// gjorda). A = { ctx, buf, reverb } från audio.js. o.j är en slumpfaktor nära 1 per skott.
const R = (a, b) => a + Math.random() * (b - a);

// ---------- byggstenar ----------
export function makeBuffers(ctx) {
  const sr = ctx.sampleRate, mk = (secs, fill, ch = 1) => {
    const b = ctx.createBuffer(ch, Math.floor(sr * secs), sr);
    for (let c = 0; c < ch; c++) fill(b.getChannelData(c), sr);
    return b;
  };
  const white = mk(2, d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
  const brown = mk(2, d => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
  // Knaster: glesa knäppar av olika styrka (bråte, grus, splitter).
  const crackle = mk(1.5, d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() < 0.004 ? (Math.random() * 2 - 1) * R(0.3, 1) : d[i - 1] * 0.6 || 0; });
  return { white, brown, crackle };
}
// Rumsklang ur brus: stereo, exponentiell avklingning, mörkare mot slutet.
export function makeImpulse(ctx, secs = 2.2, decay = 3) {
  const sr = ctx.sampleRate, n = Math.floor(sr * secs), b = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, a = 0.15 + 0.85 * k;
      lp += a * ((Math.random() * 2 - 1) - lp);
      d[i] = (i < sr * 0.012 ? 0 : lp) * Math.pow(1 - k, decay);
    }
  }
  return b;
}
const curves = new Map();
export function shaper(ctx, k = 2) {
  const key = k.toFixed(2);
  if (!curves.has(key)) {
    const c = new Float32Array(1024);
    for (let i = 0; i < c.length; i++) { const x = (i / (c.length - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    curves.set(key, c);
  }
  const s = ctx.createWaveShaper(); s.curve = curves.get(key); s.oversample = 'none';
  return s;
}
// Kuvert: snabb attack till peak, exponentiell avklingning till tystnad på d sekunder.
function env(ctx, t, a, peak, d) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + Math.max(0.001, a));
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  return g;
}
function noise(A, buf, t, dur) {
  const s = A.ctx.createBufferSource(); s.buffer = A.buf[buf];
  s.start(t, Math.random() * (s.buffer.duration - dur - 0.05 > 0 ? s.buffer.duration - dur - 0.05 : 0), dur + 0.05);
  return s;
}
function filt(ctx, type, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
// Brusskott: buffert -> filter -> kuvert -> ut.
function burst(A, t, out, { buf = 'white', type = 'bandpass', f = 1000, q = 0.7, f2, glide = 0.1, a = 0.001, peak = 0.5, d = 0.1, delay = 0 }) {
  const { ctx } = A, t0 = t + delay;
  const src = noise(A, buf, t0, a + d), fl = filt(ctx, type, f, q), g = env(ctx, t0, a, peak, d);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + glide);
  chain(src, fl, g, out);
  return g;
}
// Ton med tonhöjdsfall (knall, duns, dörr).
function thump(A, t, out, { f = 120, f2 = 40, glide = 0.1, type = 'sine', a = 0.002, peak = 0.6, d = 0.2, delay = 0 }) {
  const { ctx } = A, t0 = t + delay;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + glide);
  const g = env(ctx, t0, a, peak, d);
  chain(o, g, out); o.start(t0); o.stop(t0 + a + d + 0.05);
  return g;
}
function send(A, node, amt) { if (amt > 0 && A.reverb) { const g = A.ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(A.reverb); } }
function sat(A, out, k, gain = 1) { const s = shaper(A.ctx, k), g = A.ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(out); return { in: s, out: g }; }

// ---------- vapen ----------
const m249 = { group: 'm249', dur: 0.16, play(A, t, o, out) {
  const j = o.j ?? R(0.9, 1.1), s = sat(A, out, 3, 0.45);
  burst(A, t, s.in, { type: 'bandpass', f: 1500 * j, q: 0.9, peak: 0.9, d: 0.065 * j });
  burst(A, t, s.in, { type: 'highpass', f: 3200, peak: 0.45, d: 0.022 });
  thump(A, t, s.in, { f: 190 * j, f2: 75, glide: 0.04, peak: 0.55, d: 0.06 });
  send(A, s.out, 0.12);
} };
const m2 = { group: 'm2', dur: 0.55, play(A, t, o, out) {
  const j = o.j ?? R(0.92, 1.08), s = sat(A, out, 2.4, 0.7);
  thump(A, t, s.in, { f: 95 * j, f2: 36, glide: 0.18, peak: 1, d: 0.38 });
  burst(A, t, s.in, { buf: 'brown', type: 'lowpass', f: 1200 * j, f2: 300, glide: 0.2, peak: 1.1, d: 0.22 });
  burst(A, t, s.in, { type: 'bandpass', f: 2300 * j, q: 1, peak: 0.55, d: 0.045 });
  send(A, s.out, 0.32);
} };
// Ksp 58 (7,62): mellan Ksp 90:s smatter och Ksp 88:s duns, tätare kropp än Ksp 90.
const ksp58 = { group: 'ksp58', dur: 0.26, play(A, t, o, out) {
  const j = o.j ?? R(0.92, 1.08), s = sat(A, out, 2.7, 0.55);
  burst(A, t, s.in, { type: 'bandpass', f: 1050 * j, q: 0.85, peak: 0.95, d: 0.09 * j });
  burst(A, t, s.in, { type: 'highpass', f: 2700, peak: 0.4, d: 0.025 });
  thump(A, t, s.in, { f: 140 * j, f2: 55, glide: 0.08, peak: 0.75, d: 0.12 });
  send(A, s.out, 0.2);
} };
// Ak 5: ett enda torrt, skarpt skott, kort klang.
const ak5 = { group: 'ak5', dur: 0.22, play(A, t, o, out) {
  const j = o.j ?? R(0.94, 1.06), s = sat(A, out, 3.2, 0.42);
  burst(A, t, s.in, { type: 'highpass', f: 2900 * j, peak: 1, d: 0.028 });
  burst(A, t, s.in, { type: 'bandpass', f: 1800 * j, q: 1.1, peak: 0.7, d: 0.05 });
  thump(A, t, s.in, { f: 210 * j, f2: 90, glide: 0.03, peak: 0.45, d: 0.05 });
  send(A, s.out, 0.18);
} };
// Granattillsatsen: ett ihåligt "thoonk" ur röret.
const thoonk = { group: 'thoonk', dur: 0.32, play(A, t, o, out) {
  const j = R(0.95, 1.05), g = A.ctx.createGain(); g.gain.value = 0.7; g.connect(out);
  thump(A, t, g, { f: 165 * j, f2: 92, glide: 0.07, peak: 0.85, d: 0.16 });
  thump(A, t, g, { type: 'triangle', f: 330 * j, f2: 250, glide: 0.06, peak: 0.25, d: 0.09 });
  burst(A, t, g, { type: 'bandpass', f: 420 * j, q: 4, peak: 0.55, d: 0.08 });
  burst(A, t, g, { buf: 'brown', type: 'lowpass', f: 700, peak: 0.4, d: 0.12, delay: 0.01 });
} };
// 40 mm-granatens smäll: en mindre, torrare variant av granatlådans.
const pop = { group: 'pop', dur: 0.9, play(A, t, o, out) {
  const s = sat(A, out, 2.2, 0.7);
  thump(A, t, s.in, { f: 100, f2: 36, glide: 0.35, peak: 1, d: 0.45 });
  burst(A, t, s.in, { buf: 'brown', type: 'lowpass', f: 1500, f2: 300, glide: 0.4, peak: 0.95, d: 0.42 });
  burst(A, t, s.in, { type: 'highpass', f: 1400, peak: 0.6, d: 0.05 });
  burst(A, t, s.in, { buf: 'crackle', type: 'bandpass', f: 2800, q: 0.7, a: 0.02, peak: 0.6, d: 0.4, delay: 0.03 });
  send(A, s.out, 0.35);
} };
// Psg 90: en skarp knall och ett långt eko som studsar mellan husen och dör bort.
const psg90 = { group: 'psg90', dur: 2.3, play(A, t, o, out) {
  const j = o.j ?? R(0.97, 1.03), s = sat(A, out, 3, 0.75);
  burst(A, t, s.in, { type: 'highpass', f: 3600 * j, peak: 1.3, d: 0.022 });
  burst(A, t, s.in, { type: 'bandpass', f: 2300 * j, q: 1.2, peak: 0.9, d: 0.06 });
  thump(A, t, s.in, { f: 125 * j, f2: 42, glide: 0.14, peak: 0.85, d: 0.2 });
  // ekot: mörkare och svagare för varje studs
  const echo = A.ctx.createGain(); echo.gain.value = 1; echo.connect(out);
  for (const [delay, f, p] of [[0.22, 1400, 0.42], [0.5, 1000, 0.28], [0.86, 760, 0.18], [1.3, 560, 0.1]])
    burst(A, t, echo, { buf: 'brown', type: 'lowpass', f, a: 0.03, peak: p, d: 0.5, delay });
  send(A, s.out, 0.7);
} };
const casing = { group: 'casing', dur: 0.32, play(A, t, o, out) {
  const j = R(0.9, 1.15), g = A.ctx.createGain(); g.gain.value = 0.05; g.connect(out);
  for (const [k, delay, p] of [[1, 0, 1], [1.02, 0.09, 0.55], [0.99, 0.15, 0.3]])
    for (const f of [3900, 5350, 7100]) thump(A, t, g, { f: f * j * k, f2: f * j * k * 0.98, glide: 0.05, peak: p * 0.4, d: R(0.04, 0.09), delay });
} };

// ---------- granater ----------
const toss = { group: 'throw', dur: 0.55, play(A, t, o, out) {
  const src = noise(A, 'white', t, 0.55), fl = filt(A.ctx, 'bandpass', 380, 1.6), g = A.ctx.createGain();
  fl.frequency.setValueAtTime(380, t); fl.frequency.exponentialRampToValueAtTime(1700, t + 0.2); fl.frequency.exponentialRampToValueAtTime(520, t + 0.5);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.16); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);
  chain(src, fl, g, out);
} };
const blast = { group: 'blast', dur: 1.7, play(A, t, o, out) {
  const s = sat(A, out, 2, 0.9);
  thump(A, t, s.in, { f: 72, f2: 26, glide: 0.6, peak: 1.3, d: 0.95 });
  burst(A, t, s.in, { buf: 'brown', type: 'lowpass', f: 1000, f2: 180, glide: 1, peak: 1.2, d: 1.15 });
  burst(A, t, s.in, { type: 'highpass', f: 1100, peak: 0.7, d: 0.09 });
  burst(A, t, s.in, { buf: 'crackle', type: 'bandpass', f: 2600, q: 0.6, a: 0.04, peak: 0.9, d: 0.95, delay: 0.05 });
  send(A, s.out, 0.6);
} };

// ---------- träffar ----------
const hit = { group: 'hit', dur: 0.16, play(A, t, o, out) {
  const j = R(0.85, 1.15), g = A.ctx.createGain(); g.gain.value = 0.55; g.connect(out);
  burst(A, t, g, { buf: 'brown', type: 'lowpass', f: 420 * j, peak: 0.8, d: 0.08 });
  thump(A, t, g, { f: 115 * j, f2: 48, glide: 0.06, peak: 0.5, d: 0.07 });
  burst(A, t, g, { type: 'bandpass', f: 1400 * j, f2: 450, glide: 0.08, q: 4, peak: 0.28, d: 0.08 });
} };
const kill = { group: 'kill', dur: 0.34, play(A, t, o, out) {
  const big = o.type === 'brute', j = R(0.85, 1.12) * (big ? 0.65 : 1), g = A.ctx.createGain();
  g.gain.value = big ? 0.85 : 0.6; g.connect(out);
  burst(A, t, g, { buf: 'brown', type: 'lowpass', f: 320 * j, peak: 1, d: 0.18 });
  thump(A, t, g, { f: 85 * j, f2: 34, glide: 0.12, peak: 0.65, d: 0.15 });
  burst(A, t, g, { type: 'bandpass', f: 950 * j, f2: 240, glide: 0.2, q: 2.2, peak: 0.4, d: 0.2, delay: 0.03 });
} };

// ---------- zombier ----------
// Formantfiltrerad sågtand med darrande tonhöjd plus brus: stön, skrik och vrål.
function voiceTract(A, t, out, { f0, f1, len, form, wob = 5, depth = 6, k = 2, noiseAmt = 0.3, peak = 0.35, att = 0.15 }) {
  const { ctx } = A;
  const src = ctx.createOscillator(); src.type = 'sawtooth';
  src.frequency.setValueAtTime(f0, t);
  if (Array.isArray(f1)) { f1.forEach((f, i) => src.frequency.linearRampToValueAtTime(f, t + len * (i + 1) / f1.length)); }
  else src.frequency.exponentialRampToValueAtTime(f1, t + len);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = wob * R(0.8, 1.25); lg.gain.value = depth;
  lfo.connect(lg); lg.connect(src.frequency);
  const pre = ctx.createGain(); pre.gain.value = 1;
  src.connect(pre);
  const nz = noise(A, 'white', t, len + 0.1), ng = ctx.createGain(); ng.gain.value = noiseAmt; nz.connect(ng); ng.connect(pre);
  const sh = shaper(ctx, k), body = ctx.createGain();
  pre.connect(sh);
  for (const [f, q, a] of form) { const b = filt(ctx, 'bandpass', f * R(0.92, 1.08), q), bg = ctx.createGain(); bg.gain.value = a; sh.connect(b); b.connect(bg); bg.connect(body); }
  const lp = filt(ctx, 'lowpass', 2600), g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + att);
  g.gain.setValueAtTime(peak, t + len * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  chain(body, lp, g, out);
  src.start(t); src.stop(t + len + 0.05); lfo.start(t); lfo.stop(t + len + 0.05);
  return g;
}
const groan = { group: 'groan', dur: 1.8, play(A, t, o, out) {
  const type = o.type ?? 'walker';
  if (type === 'runner' && o.shriek === 'torn') {
    // Variant B (0.8.0): lägre och hesare, mest brus genom en sönderriven strupe, nästan ingen ton.
    const f = R(210, 290), len = R(0.5, 0.8);
    const g = voiceTract(A, t, out, { f0: f * 1.25, f1: [f * 1.55, f * 1.2, f * 0.95, f * 0.6], len, form: [[760, 2.4, 1], [1650, 3, 0.85], [3000, 5, 0.3]],
      wob: R(11, 16), depth: 34, k: 8, noiseAmt: 1.5, peak: 0.24, att: 0.03 });
    // raspet: brus som sveper nedåt, ojämnt fladdrande
    const rasp = A.ctx.createGain(); rasp.gain.value = 1;
    const fl = A.ctx.createOscillator(), fg = A.ctx.createGain(); fl.frequency.value = R(22, 34); fg.gain.value = 0.5;
    fl.connect(fg); fg.connect(rasp.gain); fl.start(t); fl.stop(t + len + 0.05);
    rasp.connect(out);
    burst(A, t, rasp, { buf: 'brown', type: 'bandpass', f: 1500, f2: 520, glide: len, q: 1.4, a: 0.04, peak: 0.55, d: len });
    send(A, g, 0.12);
  } else if (type === 'runner') {
    const f = R(360, 480), len = R(0.45, 0.7);
    voiceTract(A, t, out, { f0: f, f1: [f * 1.7, f * 1.45, f * 0.9], len, form: [[1100, 4, 1], [2500, 6, 0.7]], wob: 9, depth: 18, k: 5, noiseAmt: 0.55, peak: 0.22, att: 0.04 });
  } else if (type === 'brute') {
    const f = R(42, 58), len = R(1.1, 1.6);
    const g = voiceTract(A, t, out, { f0: f * 1.15, f1: f * 0.8, len, form: [[320, 3, 1.2], [680, 4, 0.8], [1200, 5, 0.3]], wob: 3.5, depth: 4, k: 4.5, noiseAmt: 0.6, peak: 0.6, att: 0.25 });
    send(A, g, 0.25);
  } else {
    const f = R(85, 140), len = R(0.8, 1.5), v = Math.random();
    // Vokalen varierar: "oo", "aa", "uh".
    const form = v < 0.33 ? [[420, 5, 1], [850, 6, 0.6]] : v < 0.66 ? [[700, 5, 1], [1150, 6, 0.55]] : [[560, 4, 1], [1000, 6, 0.5]];
    voiceTract(A, t, out, { f0: f, f1: f * R(0.75, 0.95), len, form, wob: R(3, 6), depth: R(4, 9), k: 2.5, noiseAmt: 0.35, peak: 0.3, att: 0.2 });
  }
} };

// ---------- hinder och bas ----------
const knock = { group: 'knock', dur: 0.24, play(A, t, o, out) {
  const j = R(0.9, 1.1), g = A.ctx.createGain(); g.gain.value = 0.5; g.connect(out);
  thump(A, t, g, { f: 170 * j, f2: 95, glide: 0.05, peak: 0.7, d: 0.11 });
  burst(A, t, g, { type: 'bandpass', f: 720 * j, q: 3, peak: 0.6, d: 0.06 });
  burst(A, t, g, { buf: 'brown', type: 'lowpass', f: 320, peak: 0.6, d: 0.13 });
} };
const crunch = { group: 'crunch', dur: 0.9, play(A, t, o, out) {
  if (o.type === 'wire') {
    // Tråden brister: metalliskt kling som faller, och ett snäpp.
    const g = A.ctx.createGain(); g.gain.value = 0.3; g.connect(out);
    for (const f of [880, 1330, 2210, 3170]) thump(A, t, g, { type: 'triangle', f: f * R(0.97, 1.03), f2: f * 0.82, glide: 0.6, peak: 0.25, d: 0.6 });
    burst(A, t, g, { type: 'highpass', f: 2500, peak: 0.7, d: 0.03 });
    return;
  }
  const s = sat(A, out, 2.5, 0.8);
  burst(A, t, s.in, { buf: 'brown', type: 'lowpass', f: 1600, f2: 260, glide: 0.5, peak: 1.1, d: 0.55 });
  burst(A, t, s.in, { buf: 'crackle', type: 'highpass', f: 1400, peak: 1, d: 0.65, a: 0.01 });
  thump(A, t, s.in, { f: 64, f2: 30, glide: 0.3, peak: 0.8, d: 0.32 });
  send(A, s.out, 0.3);
} };
const strain = { group: 'strain', dur: 0.75, play(A, t, o, out) {
  const { ctx } = A, g = ctx.createGain(), j = R(0.94, 1.08);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);
  const am = ctx.createOscillator(), amg = ctx.createGain(); am.frequency.value = R(14, 22); amg.gain.value = 0.03;
  am.connect(amg); amg.connect(g.gain); am.start(t); am.stop(t + 0.75);
  g.connect(out);
  for (const f of [1210, 1745, 2660]) {
    const o2 = ctx.createOscillator(); o2.type = 'triangle';
    o2.frequency.setValueAtTime(f * j, t); o2.frequency.linearRampToValueAtTime(f * j * 1.045, t + 0.6);
    o2.connect(g); o2.start(t); o2.stop(t + 0.75);
  }
  burst(A, t, g, { type: 'bandpass', f: 3100, q: 12, a: 0.1, peak: 1.5, d: 0.5 });
} };
const breach = { group: 'breach', dur: 1.1, play(A, t, o, out) {
  const s = sat(A, out, 2.2, 1);
  thump(A, t, s.in, { f: 58, f2: 30, glide: 0.4, peak: 1.3, d: 0.6 });
  burst(A, t, s.in, { buf: 'brown', type: 'lowpass', f: 650, peak: 1.1, d: 0.3 });
  burst(A, t, s.in, { type: 'bandpass', f: 270, f2: 210, glide: 0.4, q: 8, peak: 0.9, d: 0.45, delay: 0.02 });
  burst(A, t, s.in, { buf: 'crackle', type: 'bandpass', f: 1800, q: 0.8, peak: 0.6, d: 0.3, delay: 0.05 });
  send(A, s.out, 0.45);
} };
const alarm = { group: 'alarm', dur: 0.85, play(A, t, o, out) {
  const { ctx } = A, g = ctx.createGain(), lp = filt(ctx, 'lowpass', 520, 2);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  for (const f of [110, 116.5, 55]) { const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f; o2.connect(lp); o2.start(t); o2.stop(t + 0.85); }
  chain(lp, g, out);
} };

// ---------- gränssnitt ----------
const ui = { group: 'ui', dur: 0.22, play(A, t, o, out) {
  const g = A.ctx.createGain(); g.gain.value = 0.5; g.connect(out);
  const k = o.kind ?? 'click';
  if (k === 'deny') {
    const lp = filt(A.ctx, 'lowpass', 1100), gg = A.ctx.createGain(); gg.gain.value = 0.35; chain(lp, gg, g);
    thump(A, t, lp, { type: 'square', f: 240, f2: 230, peak: 0.22, d: 0.07 });
    thump(A, t, lp, { type: 'square', f: 170, f2: 160, peak: 0.22, d: 0.1, delay: 0.08 });
  } else if (k === 'place') {
    thump(A, t, g, { f: 230, f2: 110, glide: 0.05, peak: 0.45, d: 0.08 });
    burst(A, t, g, { type: 'bandpass', f: 1600, q: 1.5, peak: 0.25, d: 0.03 });
  } else {
    burst(A, t, g, { type: 'bandpass', f: k === 'pick' ? 3000 : 2400, q: 2, peak: 0.4, d: 0.02 });
    thump(A, t, g, { f: k === 'pick' ? 1100 : 850, f2: 700, glide: 0.02, peak: 0.12, d: 0.03 });
  }
} };
const bonus = { group: 'bonus', dur: 0.4, play(A, t, o, out) {
  const g = A.ctx.createGain(); g.gain.value = 0.25; g.connect(out);
  burst(A, t, g, { type: 'bandpass', f: 3400, q: 3, peak: 0.5, d: 0.025 });
  burst(A, t, g, { type: 'bandpass', f: 4100, q: 3, peak: 0.5, d: 0.025, delay: 0.06 });
  thump(A, t, g, { f: 1760, f2: 1755, glide: 0.2, peak: 0.12, d: 0.3, delay: 0.06 });
  thump(A, t, g, { f: 2640, f2: 2635, glide: 0.2, peak: 0.05, d: 0.2, delay: 0.06 });
} };
// Vågen börjar: en siren som sväller och sjunker, långt bort.
const horn = { group: 'horn', dur: 3.4, play(A, t, o, out) {
  const { ctx } = A, lp = filt(ctx, 'lowpass', 300, 1.5), g = ctx.createGain();
  lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(1500, t + 1.4); lp.frequency.exponentialRampToValueAtTime(350, t + 3.2);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 1.3); g.gain.setValueAtTime(0.22, t + 2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.3);
  const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 4.5; vg.gain.value = 2.5; vib.connect(vg); vib.start(t); vib.stop(t + 3.4);
  for (const [f, typ] of [[196, 'sawtooth'], [207.6, 'sawtooth'], [98, 'triangle']]) {
    const os = ctx.createOscillator(); os.type = typ;
    os.frequency.setValueAtTime(f * 0.86, t); os.frequency.exponentialRampToValueAtTime(f, t + 1.2); os.frequency.exponentialRampToValueAtTime(f * 0.8, t + 3.3);
    vg.connect(os.frequency); os.connect(lp); os.start(t); os.stop(t + 3.4);
  }
  chain(lp, g, out); send(A, g, 0.5);
} };
// Dagens slut: vunnen = mörk dur som lyfter, förlorad = dissonans som sjunker.
const stinger = { group: 'stinger', dur: 3.8, play(A, t, o, out) {
  const { ctx } = A, won = o.kind === 'won', lp = filt(ctx, 'lowpass', won ? 700 : 900, 1), g = ctx.createGain();
  if (won) lp.frequency.linearRampToValueAtTime(1500, t + 1.5); else lp.frequency.exponentialRampToValueAtTime(200, t + 3.2);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + (won ? 0.5 : 0.2)); g.gain.setValueAtTime(0.2, t + 1.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.7);
  const notes = won ? [73.4, 110, 146.8, 185] : [73.4, 103.8, 77.8, 146.8];
  for (const f of notes) for (const det of [-0.004, 0.004]) {
    const os = ctx.createOscillator(); os.type = 'sawtooth';
    os.frequency.setValueAtTime(f * (1 + det), t);
    os.frequency.exponentialRampToValueAtTime(f * (1 + det) * (won ? 1 : 0.88), t + 3.5);
    os.connect(lp); os.start(t); os.stop(t + 3.8);
  }
  if (!won) thump(A, t, g, { f: 50, f2: 28, glide: 1, peak: 0.8, d: 1.6 });
  chain(lp, g, out); send(A, g, 0.6);
} };

export const SOUNDS = { m249, m2, ksp58, ak5, psg90, thoonk, pop, casing, throw: toss, blast, hit, kill, groan, knock, crunch, strain, breach, alarm, ui, bonus, horn, stinger };
