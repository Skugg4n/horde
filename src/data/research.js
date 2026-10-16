// Forskning i noder med nivåer (I, II, III). Varje nivå har pris, krav och en rad som säger
// vad den gör. Köpt nivå sparas som 'nod.nivå', t.ex. 'm249Rate.2'. Krav pekar på en nivå
// i en annan nod. Effekternas siffror läses av src/sim/stats.js och src/meta/progress.js.
export const RESEARCH = [
  // id 'm2' och 'm249Rate' behålls (sparfilerna), namnen är Försvarsmaktens sedan 0.8.0.
  { id: 'm2', name: 'Ksp 88', tiers: [
    { cost: 100, requires: [], effect: 'New gun: heavy 12.7 mm machine gun.' },
    { cost: 120, requires: [], effect: 'Ksp 88 hits 20 % harder.', damage: 1.2 },
    { cost: 170, requires: [], effect: 'Ksp 88 hits 40 % harder.', damage: 1.4 },
  ] },
  { id: 'm249Rate', name: 'Faster Ksp 90', tiers: [
    { cost: 40, requires: [], effect: 'Ksp 90 fires 25 % faster.', rate: 1.25 },
    { cost: 80, requires: [], effect: 'Ksp 90 fires 45 % faster.', rate: 1.45 },
    { cost: 130, requires: ['m2.1'], effect: 'Ksp 90 fires 65 % faster.', rate: 1.65 },
  ] },
  { id: 'wireTough', name: 'Heavy wire', tiers: [
    { cost: 50, requires: [], effect: 'Barbed wire lasts twice as long.', durability: 2 },
    { cost: 90, requires: [], effect: 'Barbed wire lasts three times as long.', durability: 3 },
  ] },
  { id: 'block', name: 'Concrete barrier', tiers: [
    { cost: 60, requires: ['wireTough.1'], effect: 'New obstacle that stops the horde. Gnesta has it from day 1.' },
    { cost: 70, requires: [], effect: 'Barriers take 50 % more blows.', hp: 1.5 },
    { cost: 120, requires: [], effect: 'Barriers take twice the blows.', hp: 2 },
  ] },
  { id: 'budget', name: 'Bigger budget', tiers: [
    { cost: 70, requires: [], effect: '$ 150 more cash every day.', cash: 150 },
    { cost: 110, requires: [], effect: '$ 250 more cash every day.', cash: 250 },
    { cost: 170, requires: ['positions.1'], effect: '$ 350 more cash every day.', cash: 350 },
  ] },
  // Hette 'slot4' (New position) före 0.5.0; en gammal sparfils slot4 blir positions.1.
  { id: 'positions', name: 'More positions', tiers: [
    { cost: 80, requires: ['m2.1'], effect: 'Room for one more gun: 5 in all.' },
    { cost: 140, requires: [], effect: 'Room for one more gun: 6 in all.' },
    { cost: 220, requires: [], effect: 'Room for one more gun: 7 in all.' },
    { cost: 320, requires: ['psg90.1'], effect: 'Room for one more gun: 8 in all.' },
  ] },
  { id: 'grenade', name: 'Grenades', tiers: [
    { cost: 60, requires: [], effect: 'Grenade kit for one position. It throws when they bunch up.', damage: 75, radius: 3, cooldown: 10, count: 1 },
    { cost: 100, requires: ['grenade.1'], effect: 'Kit grenades hit harder and wider.', damage: 95, radius: 3.5, cooldown: 10, count: 1 },
    { cost: 150, requires: ['m2.1'], effect: 'Kits throw two grenades at a time.', damage: 80, radius: 3.5, cooldown: 10, count: 2 },
  ] },
  // 0.8.0: arsenalen. Tre nya vapen med tre nivåer var, och en fjärde nivå i More positions,
  // så att forskningen räcker förbi Gnesta dag 5 (H034).
  { id: 'ksp58', name: 'Ksp 58', tiers: [
    { cost: 100, requires: ['m2.1'], effect: 'New gun: 7.62 mm machine gun, between Ksp 90 and Ksp 88.' },
    { cost: 150, requires: [], effect: 'Ksp 58 fires 25 % faster.', rate: 1.25 },
    { cost: 220, requires: [], effect: 'Ksp 58 fires 50 % faster.', rate: 1.5 },
  ] },
  { id: 'psg90', name: 'Psg 90', tiers: [
    { cost: 200, requires: ['m2.2'], effect: 'New gun: sniper rifle. Goes on rooftops and sees over houses.' },
    { cost: 240, requires: [], effect: 'Psg 90 hits 30 % harder.', damage: 1.3 },
    { cost: 320, requires: [], effect: 'Psg 90 pierces three in a line.', damage: 1.3, pierce: 3 },
  ] },
  { id: 'ak5', name: 'Ak 5 + granattillsats', tiers: [
    { cost: 100, requires: ['grenade.1'], effect: 'New gun: assault rifle with a 40 mm grenade launcher.' },
    { cost: 200, requires: [], effect: 'Launcher grenades hit 30 % harder and wider.', gDamage: 1.3, gRadius: 1.15 },
    { cost: 260, requires: [], effect: 'Launcher reloads in 3 seconds.', gDamage: 1.3, gRadius: 1.15, gCooldown: 3 },
  ] },
  // 0.10.0: Hemvärnet i forskningen (H054). Gruppen var för svag mot Gnestas hårdare vågor; nu
  // växer den med spelaren: bättre gevär, fler man och veteraner. Inga krav på andra vapen, så
  // den går att välja tidigt som billig täckning. Siffrorna läses av src/sim/stats.js (gevären)
  // och src/sim/squad.js (antal man och liv).
  { id: 'hvRifles', name: 'Better rifles', tiers: [
    { cost: 80, requires: [], effect: 'Hemvärnet Ak 4: 20 % harder, 10 % faster.', damage: 1.2, rate: 1.1 },
    { cost: 130, requires: [], effect: 'Hemvärnet Ak 4: 40 % harder, 20 % faster.', damage: 1.4, rate: 1.2 },
    { cost: 190, requires: [], effect: 'Hemvärnet Ak 4: 60 % harder, 30 % faster.', damage: 1.6, rate: 1.3 },
  ] },
  { id: 'hvSquad', name: 'Bigger squad', tiers: [
    { cost: 120, requires: ['hvRifles.1'], effect: 'One more rifleman in every Hemvärnet squad.', men: 1 },
    { cost: 200, requires: [], effect: 'Two more riflemen in every Hemvärnet squad.', men: 2 },
  ] },
  { id: 'hvVeterans', name: 'Hemvärnet veterans', tiers: [
    { cost: 100, requires: ['hvSquad.1'], effect: 'Riflemen take 50 % more before they go down.', hp: 1.5 },
    { cost: 160, requires: [], effect: 'Riflemen take twice as much before they go down.', hp: 2 },
  ] },
];

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
export const researchNode = id => RESEARCH.find(n => n.id === id);
