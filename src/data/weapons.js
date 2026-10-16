// Svenska Försvarsmaktens beteckningar (Olas beslut 0.8.0), med en kort engelsk rad om vad
// vapnet gör. id är stabila (sparfiler och forskningen pekar på dem): m249 är Ksp 90 och m2 är
// Ksp 88 sedan 0.8.0, med samma siffror som förut.
//   pierce: hur många zombier ett skott högst träffar i en linje (Psg 90).
//   roof:   får stå på ett hustak (placeringen tillåter byggnadsrutor med tak, se placement.js).
//   launcher: granattillsatsen (Ak 5): kastar en 40 mm-granat var cooldown:e sekund mot den
//             tätaste klungan inom range. Skada, radie och nedkylning kan höjas av forskningen.
export const WEAPONS = {
  m249:  { id: 'm249', name: 'Ksp 90', desc: 'Light machine gun. Cheap and fast.', cost: 250, range: 16, rate: 8, damage: 4, accuracy: 0.7, upgradeCost: [200, 350] },
  m2:    { id: 'm2', name: 'Ksp 88', desc: 'Heavy 12.7 mm machine gun. Chews through brutes.', cost: 600, range: 22, rate: 4, damage: 22, accuracy: 0.75, upgradeCost: [450, 700] },
  ksp58: { id: 'ksp58', name: 'Ksp 58', desc: 'General-purpose 7.62 mm machine gun. The middle road.', cost: 400, range: 19, rate: 7, damage: 10, accuracy: 0.72, upgradeCost: [300, 500] },
  // Svensk benämning enligt Försvarsmakten: "Ak 5 med granattillsats" (en modifierad M203).
  // Ingen egen modellbeteckning hittad, så ingen hittas på.
  ak5:   { id: 'ak5', name: 'Ak 5 + granattillsats', short: 'Ak 5 + Grt', desc: 'Assault rifle with a 40 mm grenade launcher. Steady shots, a grenade every few seconds.',
           cost: 450, range: 17, rate: 2.5, damage: 7, accuracy: 0.85, upgradeCost: [350, 550],
           launcher: { range: 18, cooldown: 4.5, damage: 55, radius: 2.6, falloff: 0.6, flight: 0.6, minCount: 2 } },
  psg90: { id: 'psg90', name: 'Psg 90', desc: 'Sniper rifle. Slow, deadly, very long range. Pierces two in a line. Flat roofs, a ridge by a chimney or a tall building; aim its sector with the wheel or Q/E.',
           cost: 700, range: 34, rate: 0.6, damage: 90, accuracy: 0.95, pierce: 2, roof: true, cone: 75, upgradeCost: [500, 750] },
  // 0.12.0 (H108): cone: skjutsektorn i grader, vald när den ställs ut (placement.js CONE).
  // 0.9.0: Hemvärnet, en grupp soldater med Ak 4 (7,62 mm). Siffrorna gäller per soldat; gruppen
  // väljer själv skydd runt markeringen (src/sim/squad.js). Nivå 2 ger en femte soldat, nivå 3
  // bättre gevär (skadan som andra vapen, 30 % per nivå). Svagare per krona än Ksp 90, men
  // fyra siktlinjer i stället för en. Zombier som når fram kan slå ner en soldat.
  hv:    { id: 'hv', name: 'Hemvärnet', desc: 'Home Guard squad: four riflemen with Ak 4. Drop the marker and they find their own cover. Cheap and flexible, but the dead can reach them.',
           cost: 250, range: 15, rate: 1.3, damage: 5, accuracy: 0.72, squad: true, upgradeCost: [200, 300] },
};
// Kulans bredd när den går igenom (Psg 90): zombier inom så många meter från skottlinjen bakom
// målet träffas också, närmast först.
export const PIERCE_WIDTH = 0.7;
// Granatlåda: köps till en byggd position när forskningen Grenades finns. Kastar själv när
// minst minCount zombier (eller en bjässe) är inom range. Skada, radie, nedkylning och antal
// per kast kommer från forskningens nivå (src/data/research.js).
// falloff: andel av skadan som försvinner ut mot kanten (0,6 = 40 % kvar vid kanten).
export const GRENADE_KIT = { name: 'Grenade kit', cost: 200, range: 13, minCount: 4, flight: 0.8, falloff: 0.6 };
