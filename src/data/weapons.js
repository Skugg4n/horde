// Svenska Försvarsmaktens beteckningar (Olas beslut 0.8.0), med en kort engelsk rad om vad
// vapnet gör. id är stabila (sparfiler och forskningen pekar på dem): m249 är Ksp 90 och m2 är
// Ksp 88 sedan 0.8.0, med samma siffror som förut.
//   pierce: hur många zombier ett skott högst träffar i en linje (Psg 90).
//   roof:   får stå på ett hustak (placeringen tillåter byggnadsrutor med tak, se placement.js).
//   launcher: granattillsatsen (Ak 5): kastar en 40 mm-granat var cooldown:e sekund mot den
//             tätaste klungan inom range. Skada, radie och nedkylning kan höjas av forskningen.
export const WEAPONS = {
  // 0.13.0 (H132): cone = skjutvinkeln i grader runt facing (vald vid placeringen, Rotate vrider den),
  // traverse = hur fort pipan vrids inom vinkeln (rad/s). Ett mål utanför vinkeln skjuts inte.
  // move (H134): packa (s), ställa upp (s), fart på vägen (m/s) och laget som bär (man, kan slås ner).
  m249:  { id: 'm249', name: 'Ksp 90', desc: 'Light machine gun. Cheap and fast, turns quickly over a wide arc.', cost: 250, range: 16, rate: 8, damage: 4, accuracy: 0.7, upgradeCost: [200, 350],
           cone: 180, traverse: 3.5, move: { pack: 3, setup: 3, speed: 3.4, crew: 2 } },
  m2:    { id: 'm2', name: 'Ksp 88', desc: 'Heavy 12.7 mm machine gun on a mount. Chews through brutes, turns slowly, cannot move.', cost: 600, range: 22, rate: 4, damage: 22, accuracy: 0.75, upgradeCost: [450, 700],
           cone: 90, traverse: 0.9, mounted: true },
  ksp58: { id: 'ksp58', name: 'Ksp 58', desc: 'General-purpose 7.62 mm machine gun. The middle road.', cost: 400, range: 19, rate: 7, damage: 10, accuracy: 0.72, upgradeCost: [300, 500],
           cone: 120, traverse: 2, move: { pack: 4, setup: 4, speed: 2.6, crew: 3 } },
  // Svensk benämning enligt Försvarsmakten: "Ak 5 med granattillsats" (en modifierad M203).
  // Ingen egen modellbeteckning hittad, så ingen hittas på.
  ak5:   { id: 'ak5', name: 'Ak 5 + granattillsats', short: 'Ak 5 + Grt', desc: 'Assault rifle with a 40 mm grenade launcher. Steady shots, a grenade every few seconds.',
           cost: 450, range: 17, rate: 2.5, damage: 7, accuracy: 0.85, upgradeCost: [350, 550],
           launcher: { range: 18, cooldown: 4.5, damage: 55, radius: 2.6, falloff: 0.6, flight: 0.6, minCount: 2 }, traverse: 3, move: { pack: 1.5, setup: 1.5, speed: 3.8, crew: 1 } },
  psg90: { id: 'psg90', name: 'Psg 90', desc: 'Sniper rifle. Slow, deadly, very long range. Pierces two in a line. Flat roofs, a ridge by a chimney or a tall building; click and drag to aim its sector.',
           cost: 700, range: 34, rate: 0.6, damage: 90, accuracy: 0.95, pierce: 2, roof: true, cone: 75, traverse: 1.2, upgradeCost: [500, 750], move: { pack: 2, setup: 2, speed: 1.6, crew: 2 } },
  // 0.12.0 (H108): cone: skjutsektorn i grader, vald när den ställs ut (placement.js CONE).
  // 0.9.0: Hemvärnet, en grupp soldater med Ak 4 (7,62 mm). Siffrorna gäller per soldat; gruppen
  // väljer själv skydd runt markeringen (src/sim/squad.js). Nivå 2 ger en femte soldat, nivå 3
  // bättre gevär (skadan som andra vapen, 30 % per nivå). Svagare per krona än Ksp 90, men
  // fyra siktlinjer i stället för en. Zombier som når fram kan slå ner en soldat.
  // 0.13.0: men = soldater per nivå, hp = liv per soldat och nivå, speed = springfart (m/s) när gruppen
  // flyttas (H134). Hemvärnets siffror är desamma som förut (src/sim/squad.js SQUAD).
  hv:    { id: 'hv', name: 'Hemvärnet', desc: 'Home Guard squad: four riflemen with Ak 4. Drop the marker and they find their own cover. Cheap and flexible, but the dead can reach them.',
           cost: 250, range: 15, rate: 1.3, damage: 5, accuracy: 0.72, squad: true, upgradeCost: [200, 300], men: [4, 5, 5], hp: [30, 40, 50], speed: 4.5 },
  // 0.13.0 (H130): infanterigruppen, den riktiga armén. Fyra man med Ak 5, bättre skytte och mer liv än
  // Hemvärnet, dyrare. Samma skydds-AI, ställningar och tomgångsliv.
  inf:   { id: 'inf', name: 'Infantry squad', short: 'Infantry', desc: 'Regular army: four soldiers with Ak 5. Better shots and tougher than the Home Guard, and they cost more. Drop the marker and they find cover.',
           cost: 450, range: 17, rate: 1.6, damage: 7, accuracy: 0.84, squad: true, upgradeCost: [300, 400], men: [4, 5, 5], hp: [45, 60, 75], speed: 4.5 },
  // 0.13.0 (H105): civila frivilliga, jaktgevär och hagelbössor. Billiga och svaga, samma skydds-AI.
  civ:   { id: 'civ', name: 'Volunteers', short: 'Volunteers', desc: 'Hunters and neighbours with rifles and shotguns. Cheap and brave, but they are not soldiers.',
           cost: 120, range: 12, rate: 0.9, damage: 6, accuracy: 0.6, squad: true, upgradeCost: [90, 140], men: [4, 4, 5], hp: [18, 22, 26], speed: 3.6 },
  // 0.13.0 (H135): improviserad pillbox. En EPA-traktor med svetsade plåtar och en Ksp 58 i luckan.
  // hp per nivå (zombierna slår på den), build = sekunder innan den skjuter, kryper i en fjärdedel av
  // infanteriets fart på vägar och gräs.
  epa:   { id: 'epa', name: 'EPA pillbox', short: 'Pillbox', desc: 'An old A-tractor with welded plates and a Ksp 58 in the hatch. Tough: the dead have to tear it open. Short build, crawls to a new spot.',
           cost: 550, range: 18, rate: 6, damage: 9, accuracy: 0.72, upgradeCost: [350, 500], cone: 90, traverse: 1.2, vehicle: true, hp: [700, 900, 1100], build: 6,
           move: { pack: 1, setup: 1, speed: 1.125, crew: 0 } },
};
// Hur nära (meter från pjäsens mitt) en zombie måste vara för att slå på en pillbox.
export const VEHICLE_REACH = 3.2;
// Kulans bredd när den går igenom (Psg 90): zombier inom så många meter från skottlinjen bakom
// målet träffas också, närmast först.
export const PIERCE_WIDTH = 0.7;
// Granatlåda: köps till en byggd position när forskningen Grenades finns. Kastar själv när
// minst minCount zombier (eller en bjässe) är inom range. Skada, radie, nedkylning och antal
// per kast kommer från forskningens nivå (src/data/research.js).
// falloff: andel av skadan som försvinner ut mot kanten (0,6 = 40 % kvar vid kanten).
export const GRENADE_KIT = { name: 'Grenade kit', cost: 200, range: 13, minCount: 4, flight: 0.8, falloff: 0.6 };

// 0.14.0 (Operation Södermanland): förnödenheter i striden till en utställd enhet, en gång per dag.
// ammo: fortare eld resten av dagen (alla). sandbags: grupperna gräver ner sig, soldaterna tar mindre skada.
export const SUPPLIES = {
  ammo: { id: 'ammo', name: 'Ammo crate', cost: 120, rate: 1.2 },
  sandbags: { id: 'sandbags', name: 'Sandbags', cost: 100, take: 0.65 },
};
// Erfarenhet (src/data/depot.js VET_WINS): en stjärna ger lite bättre träff och omladdning.
export const VETERAN = { accuracy: 0.05, rate: 1.08, maxAccuracy: 0.97 };
