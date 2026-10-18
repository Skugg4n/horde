export const ZOMBIES = {
  walker: { id: 'walker', name: 'Walker', fear: 1, hp: 30, speed: 1.6, bounty: 10, intel: 1, baseDamage: 1, hitDamage: 8, scale: 1 },
  // 0.16.4 (Olas bonus): löparen snubblar ibland, faller framåt, kryper på alla fyra och reser sig (src/sim/sim.js stumble).
  // every: meter mellan försöken, chance: att det blir ett snubbel, time: sekunder, slow: farten i de tre stegen.
  runner: { id: 'runner', name: 'Runner', fear: 1.2, hp: 18, speed: 3.4, bounty: 6, intel: 1, baseDamage: 1, hitDamage: 6, scale: 0.95,
    stumble: { every: [20, 40], chance: 0.6, time: 1.2, steps: [0.3, 0.7], slow: [0.45, 0.1, 0.55] } },
  brute:  { id: 'brute', name: 'Brute', fear: 3, hp: 560, speed: 1.0, bounty: 60, intel: 5, baseDamage: 1, hitDamage: 30, scale: 1.45, slowTaken: 0.4 },
  // 0.18.0 (strategiskt djup, skiva 1). fear: hur mycket Sanity zombien kostar en trupp på nära håll (src/sim/sanity.js).
  // take: andel av skadan per skadeklass (src/data/weapons.js DMG_CLASSES); saknas klassen biter allt.
  // Den pansrade (kravallutrustning, hjälm, sköld): småkalibrigt biter knappt, 12,7 mm och granater fullt.
  armored: { id: 'armored', name: 'Armoured', fear: 2, hp: 95, speed: 1.35, bounty: 25, intel: 2, baseDamage: 1, hitDamage: 12, scale: 1.05,
    take: { small: 0.2 } },
  // Kryparen: låg och långsam. Kryper under taggtråden utan att bromsas (och sliter den inte), och är svår att träffa
  // uppifrån (perchHit: träffchansen från tak, torn och hus). fear högre än vandrarens: den syns inte förrän den är där.
  crawler: { id: 'crawler', name: 'Crawler', fear: 1.6, hp: 40, speed: 0.95, bounty: 12, intel: 1, baseDamage: 1, hitDamage: 9, scale: 1,
    slowTaken: 0, underWire: true, low: true, perchHit: 0.35 },
};
// Skadan som biter på zombien av en klass (1 = allt).
export const takeOf = (type, cls) => ZOMBIES[type]?.take?.[cls] ?? 1;
