export const ZOMBIES = {
  walker: { id: 'walker', name: 'Walker', fear: 1, hp: 30, speed: 1.6, bounty: 10, intel: 1, baseDamage: 1, hitDamage: 8, scale: 1 },
  // 0.16.4 (Olas bonus): löparen snubblar ibland (src/sim/sim.js stumble).
  // 0.19.0 (H454, H455): sällsynt och oregelbundet, helst utlöst. every: meter mellan försöken, chance: att det blir
  // ett snubbel, gap: minst så många meter mellan två, trigger: chansen vid en tung träff, i taggtråden och i en skarp
  // sväng (turn: grader på en meter). variants: w vikten, time sekunder, speed farten genom snubblet [u, fart] (aldrig
  // noll: farten framåt behålls), fall: varianten faller (en tung träff fäller).
  runner: { id: 'runner', name: 'Runner', fear: 1.2, hp: 18, speed: 3.4, bounty: 6, intel: 1, baseDamage: 1, hitDamage: 6, scale: 0.95,
    stumble: { every: [40, 90], chance: 0.2, gap: 12, turn: 55, trigger: { heavy: 0.5, wire: 0.35, turn: 0.25 },
      variants: [
        { id: 'trip', w: 0.6, time: 0.6, speed: [[0, 1], [0.35, 0.55], [1, 1]] },
        { id: 'slide', w: 0.25, time: 1.1, fall: true, speed: [[0, 1], [0.2, 0.85], [0.6, 0.18], [0.8, 0.3], [1, 0.85]] },
        { id: 'scramble', w: 0.15, time: 1.3, fall: true, speed: [[0, 0.9], [0.2, 0.5], [0.75, 0.45], [1, 0.9]] },
      ] } },
  // 0.19.0 (H456, Ola): bjässen går inte runt skrotbilar, den knuffar undan dem på shove sekunder (betongen håller som förut)
  brute:  { id: 'brute', name: 'Brute', fear: 3, hp: 560, speed: 1.0, bounty: 60, intel: 5, baseDamage: 1, hitDamage: 30, scale: 1.45, slowTaken: 0.4, shove: 2 },
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
