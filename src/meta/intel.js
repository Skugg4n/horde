// Underrättelser inför nästa strid (0.18.1, förrådets INTEL-ruta). Ren funktion av dagens vågdata, så att rutan aldrig
// ljuger: det som står där finns i vågorna, och det som är okänt sägs vara okänt. Senare kopplas spaningen in här
// (docs/superpowers/specs/2026-10-18-mellansnack.md).
//
// Kvaliteten per dag: dayCfg.intel = 'known' | 'partial' | 'unknown' (standard 'partial').
//   known    alla typer med exakta antal, alla ingångar.
//   partial  typerna i dagens första hälft (vågorna) med ett spann som alltid rymmer det rätta talet; om de senare
//            vågorna sägs bara att de är obekräftade (grå siluett). Ingångarna från de två första vågorna.
//   unknown  bara att något kommer från första vågens ingång; inga typer ("Unknown"), övriga håll "No reports".
import { ZOMBIES } from '../data/zombies.js';

export const INTEL_QUALITY = ['known', 'partial', 'unknown'];
export const TYPE_ORDER = ['walker', 'runner', 'crawler', 'armored', 'brute'];

// Kompassriktningen från basen till en ingång (−z är norr i alla banor).
export function compass(map, spawnId) {
  const s = map.spawns?.find(x => x.id === spawnId), b = map.base?.at;
  if (!s?.at || !b) return null;
  // 0.20.0: en ingång kan ange sitt håll själv (Vikingavägens skogsväg kommer in i kartans södra kant)
  if (s.dir) return s.dir;
  const a = Math.atan2(s.at[0] - b[0], -(s.at[1] - b[1]));          // 0 = norr, medurs
  const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return names[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
}
// Ett spann runt n som alltid rymmer n: avrundat till femtal, ungefär ±25 %.
export function rangeOf(n) {
  if (n <= 3) return [Math.max(1, n - 1), n + 2];
  const lo = Math.max(1, Math.floor(n * 0.75 / 5) * 5), hi = Math.ceil(n * 1.25 / 5) * 5;
  return [Math.min(lo, n), Math.max(hi, n)];
}
const countTypes = waves => {
  const m = new Map();
  for (const w of waves) for (const g of w.groups) m.set(g.type, (m.get(g.type) ?? 0) + g.count);
  return m;
};
// { quality, waves, types: [{ type, name, count, range, known }], entries: [{ id, name, dir, known }], note }
export function intelFor(map, day) {
  const d = map.days?.[day - 1];
  if (!d) return null;
  const quality = INTEL_QUALITY.includes(d.intel) ? d.intel : 'partial';
  const waves = d.waves;
  const all = countTypes(waves);
  for (const dm of d.dormant ?? []) if (dm.intel !== false) all.set(dm.type ?? 'walker', (all.get(dm.type ?? 'walker') ?? 0) + dm.count);
  const seenTypes = quality === 'known' ? all : quality === 'partial' ? countTypes(waves.slice(0, Math.ceil(waves.length / 2))) : new Map();
  const order = t => (TYPE_ORDER.includes(t) ? TYPE_ORDER.indexOf(t) : TYPE_ORDER.length);
  const types = [...all.keys()].sort((a, b) => order(a) - order(b)).map(type => {
    const known = seenTypes.has(type), n = all.get(type);
    return { type, name: ZOMBIES[type]?.name ?? type, known, count: quality === 'known' ? n : null, range: quality === 'partial' && known ? rangeOf(n) : null };
  });
  // okänd dag: inga typer alls, bara en grå rad
  const shown = quality === 'unknown' ? [] : types;
  const ids = [];
  waves.forEach((w, i) => { for (const g of w.groups) if (!ids.some(x => x.id === (g.spawn ?? map.spawns?.[0]?.id))) ids.push({ id: g.spawn ?? map.spawns?.[0]?.id, wave: i }); });
  const seenWaves = quality === 'known' ? Infinity : quality === 'partial' ? 2 : 1;
  const entries = ids.map(({ id, wave }) => {
    const sp = map.spawns?.find(x => x.id === id);
    return { id, name: sp?.name ?? id, dir: compass(map, id), known: wave < seenWaves, wave: wave + 1 };
  });
  // Hållen utan rapport: de fyra väderstrecken som ingen känd ingång ligger åt. Säger inget om vad som finns där
  // (det vore en läcka), bara att ingen rapport kommit därifrån.
  const knownDirs = new Set(entries.filter(e => e.known && e.dir).flatMap(e => e.dir.split('-')));
  const quiet = ['north', 'east', 'south', 'west'].filter(x => !knownDirs.has(x));
  const silent = quiet.length ? `No reports from the ${quiet.length > 1 ? quiet.slice(0, -1).join(', ') + ' or ' + quiet[quiet.length - 1] : quiet[0]}.` : '';
  const note = quality === 'unknown' ? `Unknown numbers and types. ${silent}`.trim() : quality === 'partial' ? silent : '';
  // Det okända visas bara som okänt (en grå rad), aldrig som en namngiven typ eller ingång: det vore en läcka
  return { quality, waves: waves.length, types: shown.filter(t => t.known), later: quality === 'partial', entries: entries.filter(e => e.known), note };
}
