// Lektionernas sparade läge (0.16.0): vad som är sett, tipsens läge och vilka uppslag i Field manual som är
// lästa. progress.lessons = { seen: [id], mode: 'on' | 'new' | 'off', read: [uppslag] }. Rena funktioner.
//   seen  stegens och tipsens id, 'enemy:TYP' för fiendernas presentationsruta och 'hud:DEL' för HUD:ens
//         animation första gången
//   mode  On: steg, bildtexter och tips. New only ("I know tower defence: fewer tips"): bara stegen för nya
//         begrepp och fienderna, inga bildtexter och inga upprepade tips. Off: inga steg, bildtexter, tips
//         eller presentationsrutor; upplåsningen går ändå i kampanjens takt (src/meta/unlocks.js).
//   read  uppslagen som öppnats (nya har en rostfärgad prick tills dess)
// Sparfilen (avsnitt 5.4): ett framsteg utan lessons (äldre sparfil) räknar allt fram till och med den längst
// spelade dagen som sett, så att en spelare mitt i kampanjen inte får dag 1-stegen igen.
import { LESSONS, TIPS, ENEMIES, REVEALS, MANUAL } from '../data/lessons.js';
import { STAGES, stageIndex, furthestPlayed, metaFeatures } from './unlocks.js';

export const MODES = ['on', 'new', 'off'];
export const emptyLessons = () => ({ seen: [], mode: 'on', read: [] });
const stageOfTip = t => STAGES.findIndex(s => s.adds.includes(t.needs ?? '')) ;

// Alla id som hör till steget med index i (och tidigare steg): stegen, fienderna, HUD-delarna.
function idsUpTo(i) {
  const out = [];
  STAGES.slice(0, i + 1).forEach(s => {
    for (const l of LESSONS[s.id] ?? []) out.push(l.id);
    for (const [type, e] of Object.entries(ENEMIES)) if (e.stage === s.id) out.push('enemy:' + type);
    for (const r of REVEALS) if (s.adds.includes(r.feature)) out.push(r.id);
  });
  // tipsen som hör till ett begrepp som redan är förbi
  for (const t of TIPS) { const k = t.needs ? stageOfTip(t) : 0; if (k >= 0 && k <= i) out.push(t.id); }
  return out;
}
// Migreringen: ett framsteg utan lessons får allt fram till den längst spelade dagen som sett. Uppslagen
// som det låser upp räknas som lästa (ingen prick på allt en gammal spelare redan kan).
export function lessonsFor(p) {
  if (p.lessons && Array.isArray(p.lessons.seen)) return { ...emptyLessons(), ...p.lessons };
  const i = furthestPlayed(p);
  if (i < 0) return emptyLessons();
  const seen = idsUpTo(i);
  const tmp = { ...p, lessons: { ...emptyLessons(), seen } };
  return { ...emptyLessons(), seen, read: manualUnlocked(tmp) };
}
export const withLessons = p => (p.lessons && Array.isArray(p.lessons.seen) && MODES.includes(p.lessons.mode) ? p : { ...p, lessons: lessonsFor(p) });

export const lessonsOf = p => p.lessons ?? emptyLessons();
export const isSeen = (p, id) => lessonsOf(p).seen.includes(id);
export function markSeen(p, ...ids) {
  const l = lessonsOf(p), add = ids.filter(id => !l.seen.includes(id));
  return add.length ? { ...p, lessons: { ...l, seen: [...l.seen, ...add] } } : p;
}
export const tipsMode = p => lessonsOf(p).mode;
export function setMode(p, mode) {
  if (!MODES.includes(mode)) return p;
  return { ...p, lessons: { ...lessonsOf(p), mode } };
}
// Reset tips (pausmenyn, frågar först): allt visas igen; läget och upplåsningen står kvar.
export const resetTips = p => ({ ...p, lessons: { ...lessonsOf(p), seen: [], read: [] } });
// Mark all seen (debugmenyn): varje steg, tips, fiende och HUD-del.
export const markAllSeen = p => markSeen(p, ...idsUpTo(STAGES.length - 1), ...(LESSONS.any ?? []).map(l => l.id));

// Ska ett steg av slaget visas i det här läget? Fienderna räknas som steg.
export function shows(p, kind) {
  const m = tipsMode(p);
  if (m === 'off') return false;
  if (m === 'new') return kind === 'step' || kind === 'show' || kind === 'enemy';
  return true;
}

// Field manual: ett uppslag är upplåst när ett steg eller tips som pekar på det är sett, eller fienden setts,
// eller (för de som saknar steg) när begreppet är upplåst i kampanjen.
const MANUAL_FEATURE = { base: 'base', place: 'place', start: 'start' };
export function manualUnlocked(p) {
  const seen = new Set(lessonsOf(p).seen), meta = metaFeatures(p);
  const out = new Set();
  for (const ls of Object.values(LESSONS)) for (const l of ls) if (l.manual && seen.has(l.id)) out.add(l.manual);
  for (const t of TIPS) if (t.manual && seen.has(t.id)) out.add(t.manual);
  for (const type of Object.keys(ENEMIES)) if (seen.has('enemy:' + type)) out.add(type);
  for (const [id, f] of Object.entries(MANUAL_FEATURE)) if (meta.has(f) && meta.has('manual')) out.add(id);
  return MANUAL.filter(m => out.has(m.id)).map(m => m.id);
}
export const manualNew = p => manualUnlocked(p).filter(id => !lessonsOf(p).read.includes(id));
export function markRead(p, id) {
  const l = lessonsOf(p);
  return l.read.includes(id) ? p : { ...p, lessons: { ...l, read: [...l.read, id] } };
}
export { stageIndex };
