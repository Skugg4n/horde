// Forskning i noder med nivåer (I, II, III). Varje nivå har pris, krav och en rad som säger
// vad den gör. Köpt nivå sparas som 'nod.nivå', t.ex. 'm249Rate.2'. Krav pekar på en nivå
// i en annan nod. Effekternas siffror läses av src/sim/stats.js och src/meta/progress.js.
export const RESEARCH = [
  { id: 'm2', name: 'M2 .50 cal', tiers: [
    { cost: 100, requires: [], effect: 'New gun: heavy machine gun.' },
    { cost: 120, requires: [], effect: 'M2 hits 20 % harder.', damage: 1.2 },
    { cost: 170, requires: [], effect: 'M2 hits 40 % harder.', damage: 1.4 },
  ] },
  { id: 'm249Rate', name: 'Faster M249', tiers: [
    { cost: 40, requires: [], effect: 'M249 fires 25 % faster.', rate: 1.25 },
    { cost: 80, requires: [], effect: 'M249 fires 45 % faster.', rate: 1.45 },
    { cost: 130, requires: ['m2.1'], effect: 'M249 fires 65 % faster.', rate: 1.65 },
  ] },
  { id: 'wireTough', name: 'Heavy wire', tiers: [
    { cost: 50, requires: [], effect: 'Barbed wire lasts twice as long.', durability: 2 },
    { cost: 90, requires: [], effect: 'Barbed wire lasts three times as long.', durability: 3 },
  ] },
  { id: 'block', name: 'Concrete barrier', tiers: [
    { cost: 60, requires: ['wireTough.1'], effect: 'New obstacle that stops the horde.' },
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
  ] },
  { id: 'grenade', name: 'Grenades', tiers: [
    { cost: 60, requires: [], effect: 'Grenade kit for one position. It throws when they bunch up.', damage: 75, radius: 3, cooldown: 10, count: 1 },
    { cost: 100, requires: ['grenade.1'], effect: 'Kit grenades hit harder and wider.', damage: 95, radius: 3.5, cooldown: 10, count: 1 },
    { cost: 150, requires: ['m2.1'], effect: 'Kits throw two grenades at a time.', damage: 80, radius: 3.5, cooldown: 10, count: 2 },
  ] },
];

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
export const researchNode = id => RESEARCH.find(n => n.id === id);
