// Ren logik för ljudet, utan Web Audio: röstbudget, takt, gallring vid hög fart, nivåer och
// panorering. Allt tar tiden som argument (ljudklockan i spelet, en falsk klocka i testerna).
import { effectiveVolume } from '../meta/settings.js';

// Per ljud: cap = högst så många samtidiga röster, gap = minsta tid mellan två starter (s),
// lag = hur långt fram en start får skjutas när det är trångt (s), sedan tystas den.
// thin: ljudet glesas ut vid 2x och 3x i stället för att spelas tätare.
export const VOICES = {
  m249:     { cap: 6, gap: 0.045, lag: 0.06, thin: true },
  m2:       { cap: 4, gap: 0.11, lag: 0.08, thin: true },
  ksp58:    { cap: 5, gap: 0.07, lag: 0.07, thin: true },
  ak5:      { cap: 4, gap: 0.09, lag: 0.05, thin: true },
  ak4:      { cap: 4, gap: 0.07, lag: 0.05, thin: true },
  psg90:    { cap: 2, gap: 0.3, lag: 0.1 },
  thoonk:   { cap: 2, gap: 0.2, lag: 0.1 },
  pop:      { cap: 3, gap: 0.12, lag: 0.12 },
  casing:   { cap: 3, gap: 0.09, lag: 0, thin: true },
  hit:      { cap: 4, gap: 0.07, lag: 0, thin: true },
  kill:     { cap: 4, gap: 0.09, lag: 0.05, thin: true },
  groan:    { cap: 3, gap: 0.5, lag: 0 },
  throw:    { cap: 2, gap: 0.15, lag: 0.1 },
  blast:    { cap: 3, gap: 0.12, lag: 0.15 },
  knock:    { cap: 2, gap: 0.22, lag: 0, thin: true },
  crunch:   { cap: 2, gap: 0.15, lag: 0.1 },
  // 0.16.4 (Olas feedback: taggtråd ska riva): zombier som fastnar i tråden, glest och få samtidigt
  snag:     { cap: 2, gap: 0.14, lag: 0, thin: true },
  strain:   { cap: 1, gap: 0.6, lag: 0 },
  breach:   { cap: 2, gap: 0.35, lag: 0 },
  alarm:    { cap: 1, gap: 1.0, lag: 0 },
  ui:       { cap: 3, gap: 0.04, lag: 0 },
  bonus:    { cap: 1, gap: 0.3, lag: 0 },
  horn:     { cap: 1, gap: 2.0, lag: 0 },
  stinger:  { cap: 1, gap: 2.0, lag: 0 },
  // 0.18.0: en enhet vacklar eller bryts (sanity), sällan och en i taget
  dread:    { cap: 1, gap: 3.0, lag: 0 },
};
export const TOTAL_CAP = 40;

// Röstbudgeten. tryStart(type, now, dur) ger starttiden (now eller lite senare) eller null om
// ljudet ska tystas. Tystat köas aldrig.
export function createLimiter(table = VOICES, totalCap = TOTAL_CAP) {
  const live = new Map();     // type -> [sluttider]
  const next = new Map();     // type -> tidigaste nästa start
  const thinAcc = new Map();
  const stats = { started: 0, dropped: 0 };
  let total = 0;
  function prune(type, now) {
    const arr = live.get(type);
    if (!arr) return [];
    let i = 0;
    while (i < arr.length) { if (arr[i] <= now) { arr.splice(i, 1); total--; } else i++; }
    return arr;
  }
  function pruneAll(now) { for (const t of live.keys()) prune(t, now); }
  return {
    // Gallring vid hög fart: av speed händelser släpps en igenom (räknare, inte slump).
    thin(type, speed = 1) {
      const d = table[type];
      if (!d?.thin || speed <= 1) return true;
      const a = (thinAcc.get(type) ?? 0) + 1 / speed;
      if (a >= 1 - 1e-9) { thinAcc.set(type, a - 1); return true; }
      thinAcc.set(type, a);
      return false;
    },
    tryStart(type, now, dur) {
      const d = table[type] ?? { cap: 2, gap: 0.05, lag: 0 };
      pruneAll(now);
      const arr = live.get(type) ?? [];
      const at = Math.max(now, next.get(type) ?? -Infinity);
      if (at - now > d.lag + 1e-9) { stats.dropped++; return null; }
      // Röster som låter eller väntar på sin start räknas båda mot taket.
      if (arr.length >= d.cap || total >= totalCap) { stats.dropped++; return null; }
      arr.push(at + dur); live.set(type, arr); total++;
      next.set(type, at + d.gap);
      stats.started++;
      return at;
    },
    active(type, now) { pruneAll(now); return type ? (live.get(type)?.length ?? 0) : total; },
    counts(now) { pruneAll(now); const o = {}; for (const [k, v] of live) if (v.length) o[k] = v.length; return o; },
    stats,
    reset() { live.clear(); next.clear(); thinAcc.clear(); total = 0; stats.started = stats.dropped = 0; },
  };
}

// Reglaget till förstärkning: kvadraten följer örat bättre än en rak linje. Avstängt eller
// pausat ger 0 (pausen dämpas med filtret, se audio.js).
export const curve = v => v * v;
export const MUSIC_TRIM = 0.55;   // musiken ligger under effekterna
export function gainsFor(settings) {
  return {
    sfx: curve(effectiveVolume(settings, 'sound')),
    music: curve(effectiveVolume(settings, 'music')) * MUSIC_TRIM,
  };
}

// Läget i spelet till musikens intensitet (0 meny, 0,3 bygg, 0,7 våg, 1 basen nästan slut).
export function musicIntensity({ mode, phase, baseFrac = 1 }) {
  if (mode !== 'play') return mode === 'result' ? 0.15 : 0;
  if (phase === 'wave') return baseFrac <= 0.25 ? 1 : 0.7;
  if (phase === 'build') return 0.3;
  return 0.15;
}
// Nivåerna för musikens lager vid en intensitet.
export function musicLayers(i) {
  return {
    drone: 0.55 + 0.25 * i,
    pad: i === 0 ? 0.35 : 0.5 + 0.2 * i,
    pulse: i < 0.2 ? 0 : Math.min(1, (i - 0.2) * 1.4),
    tick: i < 0.6 ? 0 : (i - 0.6) * 2,
    cutoff: 380 + 1600 * i * i,       // padens filter stiger med spänningen
  };
}

// Horden som massa: fler zombier hörs mer, men långt ifrån linjärt.
export const hordeLevel = n => (n <= 0 ? 0 : Math.min(1, Math.sqrt(n / 250)));
// Tid till nästa enskilda stön: tätare med fler zombier, glesare vid hög fart.
export const groanGap = (n, speed = 1) => (n <= 0 ? Infinity : (3.2 / (1 + Math.sqrt(n) * 0.35)) * Math.max(1, speed * 0.75));

// Panorering och dämpning ur skärmläget: lite åt sidan, lite svagare ut mot kanterna.
export function placeOnScreen(sx, sy, w, h) {
  if (!(w > 0 && h > 0) || !Number.isFinite(sx) || !Number.isFinite(sy)) return { pan: 0, gain: 1 };
  const nx = (sx / w - 0.5) * 2, ny = (sy / h - 0.5) * 2;
  const pan = Math.max(-0.6, Math.min(0.6, nx * 0.5));
  const d = Math.hypot(nx, ny);
  const gain = d <= 1 ? 1 - 0.3 * d : Math.max(0.25, 0.7 - 0.25 * (d - 1));
  return { pan, gain };
}
