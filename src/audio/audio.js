// Ljudet i spelet. Allt ljud är bild: det läser händelserna och simuleringens tillstånd, skriver
// aldrig. Kopplingen till main.js är fyra anrop: consume(events, sim, toScreen) i samma väg som
// vyn, update(dt, sim, läge) en gång per bildruta, setSettings(settings) från menyn och ui(id)
// för köpraden. Inga ljudfiler: allt syntetiseras (voices.js, music.js).
//
// Mixer: ljud -> panorering -> sfx --\
//                     klang -> sfx    +-> dämpfilter -> pausnivå -> master -> kompressor -> limiter -> ut
//                     musik -> duck --/                             ^
//                     gränssnitt (hörs även i pausmenyn) ----------/
import { createLimiter, gainsFor, musicIntensity, hordeLevel, groanGap, placeOnScreen } from './mix.js';
import { SOUNDS, makeBuffers, makeImpulse } from './voices.js';
import { createMusic } from './music.js';

const RAMP = 0.05;                 // reglagen knastrar inte
const OPEN_HZ = 18000, MUFFLE_HZ = 320;
const CASING_CHANCE = 0.12;
// Vapnets röst och nivå per skott. Hylsor klingar bara från kulsprutorna.
const SHOT = { m249: { v: 'm249', gain: 0.6, casing: true }, m2: { v: 'm2', gain: 0.9, casing: true }, ksp58: { v: 'ksp58', gain: 0.75, casing: true },
  ak5: { v: 'ak5', gain: 0.55 }, psg90: { v: 'psg90', gain: 0.95 }, hv: { v: 'ak4', gain: 0.5 } };
const ALARM_FRAC = 0.25, ALARM_GAP = 1.4;
const R = (a, b) => a + Math.random() * (b - a);

// muted (0.12.0, ?mute): inget AudioContext skapas alls, så att inget kan höras. Inställningarna rörs inte.
export function createAudio({ settings, muted = false } = {}) {
  let ctx = null, A = null, nodes = null, music = null, horde = null;
  let cur = settings, speed = 1, paused = false, hidden = false, mode = 'menu', mapId = 'riksvagen';
  let groanT = 0, alarmT = 0, suspendTimer = null, forced = null;
  const wear = new Map();          // taggtrådens slitage per ruta (för knarret)
  const limiter = createLimiter();
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;

  function build() {
    ctx = new Ctor({ latencyHint: 'interactive' });
    const buf = makeBuffers(ctx);
    const g = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.22;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
    const master = g(0.9), pauseG = g(1), muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass'; muffle.frequency.value = OPEN_HZ; muffle.Q.value = 0.5;
    const sfx = g(0), musicG = g(0), duck = g(1), uiG = g(0);
    const reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(ctx);
    const revG = g(0.5);
    sfx.connect(muffle); musicG.connect(duck); duck.connect(muffle);
    reverb.connect(revG); revG.connect(sfx);
    muffle.connect(pauseG); pauseG.connect(master); uiG.connect(master);
    master.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
    nodes = { master, pauseG, muffle, sfx, music: musicG, duck, ui: uiG, comp, lim };
    A = { ctx, buf, reverb };
    music = createMusic(A, musicG);
    music.setMood(mapId);
    horde = createHordeBed();
    applyGains(true);
    applyPause(true);
  }

  // Horden som massa: brus genom två vandrande formanter och tre låga sågtänder som darrar.
  function createHordeBed() {
    const g = ctx.createGain(); g.gain.value = 0; g.connect(nodes.sfx);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(g);
    const src = ctx.createBufferSource(); src.buffer = A.buf.brown; src.loop = true;
    const mix = ctx.createGain(); mix.gain.value = 1;
    src.connect(mix);
    for (const [f, q, rate, depth] of [[430, 3, 0.13, 90], [1050, 4, 0.21, 180]]) {
      const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q;
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = rate; lg.gain.value = depth; l.connect(lg); lg.connect(b.frequency); l.start();
      mix.connect(b); b.connect(lp);
    }
    for (const f of [72, 96, 118]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = R(0.3, 0.9); lg.gain.value = f * 0.06; l.connect(lg); lg.connect(o.frequency); l.start();
      const og = ctx.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(mix); o.start();
    }
    src.start();
    return g;
  }

  function applyGains(now) {
    if (!ctx) return;
    const gn = gainsFor(cur ?? { sound: 0.8, music: 0.6 }), t = ctx.currentTime, tc = now ? 0.001 : RAMP / 3;
    nodes.sfx.gain.setTargetAtTime(gn.sfx, t, tc);
    nodes.ui.gain.setTargetAtTime(gn.sfx, t, tc);
    nodes.music.gain.setTargetAtTime(gn.music, t, tc);
  }
  // Paus och dold flik: filtret sjunker och nivån tonar ut på under en sekund, ingen hård klippning.
  function applyPause(now) {
    if (!ctx) return;
    const quiet = paused || hidden, t = ctx.currentTime;
    nodes.muffle.frequency.cancelScheduledValues(t);
    nodes.pauseG.gain.cancelScheduledValues(t);
    if (now) { nodes.muffle.frequency.value = quiet ? MUFFLE_HZ : OPEN_HZ; nodes.pauseG.gain.value = quiet ? 0 : 1; return; }
    nodes.muffle.frequency.setTargetAtTime(quiet ? MUFFLE_HZ : OPEN_HZ, t, quiet ? 0.08 : 0.15);
    nodes.pauseG.gain.setTargetAtTime(quiet ? 0 : 1, t, quiet ? 0.3 : 0.12);
  }

  function unlock() {
    if (!Ctor || muted) return;
    try {
      if (!ctx) build();
      if (ctx.state !== 'running' && !hidden) ctx.resume();
    } catch (e) { console.warn('Audio unavailable', e); }
  }
  let attached = false;
  function attach(target = globalThis) {
    if (attached || !target?.addEventListener) return;
    attached = true;
    const go = () => unlock();
    for (const ev of ['pointerdown', 'keydown', 'touchend']) target.addEventListener(ev, go, { capture: true, passive: true });
    globalThis.document?.addEventListener?.('visibilitychange', () => setHidden(globalThis.document.hidden));
  }
  function setHidden(h) {
    hidden = !!h;
    if (!ctx) return;
    clearTimeout(suspendTimer);
    applyPause(false);
    // Dold flik: när ljudet tonat ut stängs kontexten av helt (ingen CPU i bakgrunden).
    if (hidden) suspendTimer = setTimeout(() => { if (hidden) ctx.suspend(); }, 1200);
    else if (ctx.state !== 'running') ctx.resume();
  }
  const live = () => ctx && ctx.state === 'running' && !paused && !hidden;

  // Spelar ett ljud. o.x/o.z: läget i världen (då panoreras det), o.sx/o.sy: läget på skärmen.
  function play(name, o = {}, toScreen) {
    const v = SOUNDS[name];
    if (!v || !ctx || ctx.state !== 'running') return false;
    const bypass = name === 'ui';
    if (!bypass && (paused || hidden)) return false;
    if (!limiter.thin(v.group, speed)) return false;
    let pan = 0, gain = 1;
    let sx = o.sx, sy = o.sy;
    if (sx == null && o.x != null && toScreen) { const s = toScreen(o.x, o.z); sx = s.sx; sy = s.sy; }
    if (sx != null) ({ pan, gain } = placeOnScreen(sx, sy, globalThis.innerWidth || 1, globalThis.innerHeight || 1));
    const at = limiter.tryStart(v.group, ctx.currentTime + (o.delay ?? 0), v.dur);
    if (at == null) return false;
    const g = ctx.createGain(); g.gain.value = gain * (o.gain ?? 1);
    let out = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(g); out = p; }
    g.connect(bypass ? nodes.ui : nodes.sfx);
    v.play(A, at, o, out);
    // Kopplas loss när rösten klingat ut så att grafen inte växer.
    setTimeout(() => { try { g.disconnect(); } catch { /* redan loss */ } }, (at - ctx.currentTime + v.dur + 0.3) * 1000);
    return true;
  }

  function duckMusic(depth = 0.45, back = 0.8) {
    if (!ctx) return;
    const t = ctx.currentTime, d = nodes.duck.gain;
    d.cancelScheduledValues(t); d.setTargetAtTime(depth, t, 0.02); d.setTargetAtTime(1, t + 0.15, back);
  }

  function consume(events, sim, toScreen) {
    if (!live() || !events.length) return;
    for (const ev of events) {
      switch (ev.t) {
        case 'shot': {
          const g = sim?.guns?.find(x => x.id === ev.gunId);
          const sh = SHOT[g?.weapon?.type] ?? SHOT.m249;
          // Hemvärnet: ljudet från soldaten som sköt (sx, sz), inte från markeringen
          const at = ev.sx != null ? { x: ev.sx, z: ev.sz } : g ? { x: g.x, z: g.z } : { x: ev.x, z: ev.z };
          if (play(sh.v, { ...at, gain: sh.gain }, toScreen) && sh.casing && Math.random() < CASING_CHANCE)
            play('casing', { ...at, delay: R(0.25, 0.45) }, toScreen);
          break;
        }
        case 'launch': {
          const g = sim?.guns?.find(x => x.id === ev.gunId);
          play('thoonk', g ? { x: g.x, z: g.z } : { x: ev.x, z: ev.z }, toScreen);
          break;
        }
        case 'hit': play('hit', { x: ev.x, z: ev.z }, toScreen); break;
        case 'soldierHit': play('hit', { x: ev.x, z: ev.z, gain: 0.7 }, toScreen); break;
        case 'soldierDown': play('kill', { x: ev.x, z: ev.z, type: 'walker' }, toScreen); break;
        case 'kill': play('kill', { x: ev.x, z: ev.z, type: ev.type }, toScreen); break;
        case 'grenade': {
          const g = sim?.guns?.find(x => x.id === ev.gunId);
          play('throw', g ? { x: g.x, z: g.z } : { x: ev.x, z: ev.z }, toScreen);
          break;
        }
        case 'blast':
          if (ev.kind === 'grt') play('pop', { x: ev.x, z: ev.z }, toScreen);
          else if (play('blast', { x: ev.x, z: ev.z }, toScreen)) duckMusic();
          break;
        case 'breach': play('breach', { x: ev.x, z: ev.z }, toScreen); break;
        case 'obstacleHit': {
          const c = sim?.route?.cellCenter?.(ev.cell);
          play('knock', c ? { x: c.x, z: c.z, gain: 0.8 } : {}, toScreen);
          break;
        }
        case 'obstacleBroken': {
          const c = sim?.route?.cellCenter?.(ev.cell);
          play('crunch', { ...(c ? { x: c.x, z: c.z } : {}), type: ev.type }, toScreen);
          wear.delete(ev.cell);
          break;
        }
        // 0.12.0 (H101): en dörr slås upp, vilande smittade väller ut
        case 'dormantBurst': play('knock', { x: ev.x, z: ev.z, gain: 1 }, toScreen); play('crunch', { x: ev.x, z: ev.z, type: 'wire' }, toScreen); break;
        case 'waveStart': play('horn', {}); break;
        case 'earlyBonus': play('bonus', {}); break;
        case 'won': case 'lost': play('stinger', { kind: ev.t }); duckMusic(0.2, 2); break;
      }
    }
  }

  // o: { paused, mode, mapId, speed, toScreen, zombiePos }
  function update(dt, sim, o = {}) {
    speed = o.speed ?? 1;
    if (o.mapId && o.mapId !== mapId) { mapId = o.mapId; music?.setMood(mapId); }
    mode = o.mode ?? mode;
    const p = !!o.paused;
    if (p !== paused) { paused = p; applyPause(false); }
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const playing = mode === 'play' && sim;
    const baseFrac = playing && sim.map?.baseHp ? sim.baseHp / sim.map.baseHp : 1;
    music.setIntensity(forced ?? musicIntensity({ mode, phase: sim?.phase, baseFrac }));
    if (!paused && !hidden) music.update(now);

    const alive = playing ? sim.zombies.filter(z => !z.dead) : [];
    horde.gain.setTargetAtTime(hordeLevel(alive.length) * 0.22, now, 0.6);
    if (paused || hidden || !playing || dt <= 0) return;

    // Enskilda stön: den av några slumpade zombier som står närmast bildens mitt.
    groanT += dt;
    if (alive.length && groanT >= groanGap(alive.length, speed)) {
      groanT = Math.random() * 0.4;
      const W = globalThis.innerWidth || 1, H = globalThis.innerHeight || 1;
      let best = null;
      for (let i = 0; i < 4; i++) {
        const z = alive[(Math.random() * alive.length) | 0];
        const pos = o.zombiePos ? o.zombiePos(z) : z;
        const s = o.toScreen ? o.toScreen(pos.x, pos.z) : { sx: W / 2, sy: H / 2 };
        const d = Math.hypot(s.sx - W / 2, s.sy - H / 2);
        if (!best || d < best.d) best = { d, s, type: z.type };
      }
      const pl = placeOnScreen(best.s.sx, best.s.sy, W, H);
      play('groan', { sx: best.s.sx, sy: best.s.sy, type: best.type, shriek: cur?.shriek, gain: pl.gain < 0.5 ? 0.6 : 1 });
    }
    // Basen nästan slut: en låg pulserande varning.
    if (sim.phase === 'wave' && baseFrac > 0 && baseFrac <= ALARM_FRAC) {
      alarmT += dt;
      if (alarmT >= ALARM_GAP) { alarmT = 0; play('alarm', {}); }
    } else alarmT = ALARM_GAP * 0.8;
    // Taggtråden knarrar när något sliter i den.
    for (const [k, ob] of Object.entries(sim.obstacles ?? {})) {
      if (ob.type !== 'wire' || ob.durability == null) continue;
      const prev = wear.get(k);
      wear.set(k, ob.durability);
      if (prev != null && ob.durability < prev && Math.random() < 0.08) {
        const c = sim.route?.cellCenter?.(Number(k));
        play('strain', c ? { x: c.x, z: c.z } : {}, o.toScreen);
      }
    }
  }

  return {
    attach, unlock, consume, update, play: (n, o, ts) => play(n, o, ts),
    setSettings(s) { cur = s; applyGains(false); },
    ui(kind) { play('ui', { kind }); },
    setHidden,
    duckMusic,
    get context() { return ctx; },
    // För ljudbordet: tvinga musikens läge (null = följ spelet) och stämning.
    music: { force: v => { forced = v; }, mood: id => { mapId = id; music?.setMood(id); } },
    stats() {
      const now = ctx ? ctx.currentTime : 0;
      return { state: ctx ? ctx.state : 'none', voices: limiter.counts(now), total: limiter.active(null, now), ...limiter.stats, intensity: music?.intensity ?? 0, paused, hidden };
    },
  };
}
