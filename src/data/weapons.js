export const WEAPONS = {
  m249: { id: 'm249', name: 'M249', desc: 'Light machine gun. Cheap and fast.', cost: 250, range: 16, rate: 8, damage: 4, accuracy: 0.7, upgradeCost: [200, 350] },
  m2:   { id: 'm2', name: 'M2 .50 cal', desc: 'Heavy machine gun. Hurts the big ones.', cost: 600, range: 22, rate: 4, damage: 22, accuracy: 0.75, upgradeCost: [450, 700] },
};
// Granatlåda: köps till en byggd position när forskningen Grenades finns. Kastar själv när
// minst minCount zombier (eller en bjässe) är inom range. Skada, radie, nedkylning och antal
// per kast kommer från forskningens nivå (src/data/research.js).
// falloff: andel av skadan som försvinner ut mot kanten (0,6 = 40 % kvar vid kanten).
export const GRENADE_KIT = { name: 'Grenade kit', cost: 200, range: 13, minCount: 4, flight: 0.8, falloff: 0.6 };
