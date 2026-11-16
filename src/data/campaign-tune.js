// Kampanjens kurva (0.26.1, H602, helspeltestet 2026-11-16: väggar dag 7, 9 och 13 med lätta dagar emellan). Balansen
// räknar nu hela kampanjen i följd med samma spelare (scripts/balance.mjs full), och dagarnas svårighet och förnödenheter
// sätts här, på ett ställe, ovanpå banornas data (src/data/maps.js applyTune). Banornas filer beskriver dagen (vågornas
// sammansättning, ingångarna, texterna); här står det som balansen vrider på:
//   hp      zombiernas hp-faktor för dagen
//   budget  dagens förnödenheter i dollar: startkassan plus allt de dödade ger (src/meta/operation.js bountyFor, H605)
//   ramp    högsta kvoten mellan en vågs antal och föregående vågs (vågorna jämnas ut, summan står kvar)
//   count   faktor på alla gruppers antal
//   cap     vågorna jämnas ut genom att de senare kapas (se rampWaves)
// Varje ändring och kurvan före och efter: docs/balance-log.md, 0.26.1.
export const RAMP_MAX = 1.6;
export const TUNE = {
  // Ishallen dag 1 (kampanjens dag 4): evakueringen är klar i våg 2; en större första våg dödade de civila vid dörrarna
  gnesta: { 1: { cap: true }, 2: { hp: 2.3 } },
  'gnesta-norr': { 1: { hp: 2.8, budget: 1050 } },
  molnbo: { 1: { hp: 24, budget: 790 }, 2: { hp: 15, budget: 990 }, 3: { hp: 6.5 } },
  laxne: { 1: { hp: 8.5 } },
  bjornlunda: { 1: { hp: 4 } },
};

// Vågornas antal jämnas ut bakifrån: varje våg minst nästa delat med r, sedan skalas allt så att summan står kvar (avrundat
// per grupp, minst 1 i en grupp som hade någon). Gruppernas inbördes andel i vågen behålls.
// cap: i stället kapas de senare vågorna framifrån (första vågen står kvar, summan blir mindre): för en dag där första
// vågen är lektionen eller evakueringen hinner ut under den.
export function rampWaves(waves, r = RAMP_MAX - 0.1, cap = false) {
  const n = waves.map(w => w.groups.reduce((a, g) => a + g.count, 0));
  if (n.every((x, i) => !i || x <= n[i - 1] * RAMP_MAX)) return waves;
  const m = [...n];
  if (cap) for (let i = 1; i < m.length; i++) m[i] = Math.min(m[i], m[i - 1] * r);
  else for (let i = m.length - 2; i >= 0; i--) m[i] = Math.max(m[i], m[i + 1] / r);
  const k = cap ? 1 : n.reduce((a, b) => a + b, 0) / m.reduce((a, b) => a + b, 0);
  return waves.map((w, i) => {
    const f = (m[i] * k) / Math.max(1, n[i]);
    return { ...w, groups: w.groups.map(g => ({ ...g, count: g.count ? Math.max(1, Math.round(g.count * f)) : 0 })) };
  });
}
export function applyTune(maps) {
  for (const [id, days] of Object.entries(TUNE)) {
    const map = maps[id];
    if (!map) continue;
    for (const [n, t] of Object.entries(days)) {
      const d = map.days[Number(n) - 1];
      if (!d) continue;
      if (t.hp != null) d.hp = t.hp;
      if (t.budget != null) d.budget = t.budget;
      if (t.count != null) d.waves = d.waves.map(w => ({ ...w, groups: w.groups.map(g => ({ ...g, count: Math.max(1, Math.round(g.count * t.count)) })) }));
    }
  }
  // varje kampanjdag ramper (ingen våg mer än RAMP_MAX gånger den förra)
  for (const map of Object.values(maps)) for (const d of map.days ?? []) if (d.waves?.length > 1) d.waves = rampWaves(d.waves, (TUNE[map.id]?.[d.n]?.ramp ?? RAMP_MAX) - 0.1, !!TUNE[map.id]?.[d.n]?.cap);
  return maps;
}
