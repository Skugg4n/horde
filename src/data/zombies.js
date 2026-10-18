export const ZOMBIES = {
  walker: { id: 'walker', name: 'Walker', hp: 30, speed: 1.6, bounty: 10, intel: 1, baseDamage: 1, hitDamage: 8, scale: 1 },
  // 0.16.4 (Olas bonus): löparen snubblar ibland, faller framåt, kryper på alla fyra och reser sig (src/sim/sim.js stumble).
  // every: meter mellan försöken, chance: att det blir ett snubbel, time: sekunder, slow: farten i de tre stegen.
  runner: { id: 'runner', name: 'Runner', hp: 18, speed: 3.4, bounty: 6, intel: 1, baseDamage: 1, hitDamage: 6, scale: 0.95,
    stumble: { every: [20, 40], chance: 0.6, time: 1.2, steps: [0.3, 0.7], slow: [0.45, 0.1, 0.55] } },
  brute:  { id: 'brute', name: 'Brute', hp: 560, speed: 1.0, bounty: 60, intel: 5, baseDamage: 1, hitDamage: 30, scale: 1.45, slowTaken: 0.4 },
};
