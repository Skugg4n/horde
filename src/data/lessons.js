// Lektionerna (0.16.0, docs/superpowers/specs/2026-10-16-onboarding-design.md avsnitt 3 och 5): exakt
// spelartext på engelska, högst cirka 12 ord per steg. Ren data; upplåsningen bor i src/meta/unlocks.js,
// det sparade läget (sett, tipsens läge) i src/meta/lessons.js och plåten i src/ui/lessons.js.
//
// Ett steg: { id, kind, when, done, target, text, keys, manual }
//   kind    'step' hård paus, släpps när handlingen (done) är gjord
//           'show' hård paus, släpps med klick, Enter eller Space
//           'caption' ingen paus, tonas bort efter 4 s (bara Tips: On)
//   when    när steget börjar (main.js lessonCond): 'start' före första vågen, 'afterWave1' efter första
//           vågen, 'ready:TYP' en enhet av typen har kommit fram, 'placing:TYP' i handen, 'placed:TYP' utställd,
//           'obstacle:TYP' ett hinder av typen ligger ute, 'ping' första pingen på minikartan, 'chords'
//           köpraden har kategorier. Flera villkor med '&'.
//   done    villkoret som släpper ett 'step' (samma språk; '|' betyder eller). 'placed:TYP:N' minst N.
//   target  vad som markeras: { ui: väljare } i gränssnittet, eller { world: 'marked' | 'route' | 'evac' |
//           'dormant' | 'gun:TYP' | 'gun' } i världen
//   keys    tangenterna som ritas som tangentkåpor efter texten (räknas inte som ord)
//   manual  uppslaget i Field manual som steget låser upp
// Stegen körs i ordning per dag. Ett senare steg som redan är uppfyllt bockar av de före.
export const LESSONS = {
  'e4-1': [
    { id: 'e4-1.pick', kind: 'step', when: 'start', done: 'placing:m249|placed:m249', target: { ui: '#buildbar .card[data-id="m249"]' }, text: 'Your Ksp 90. Click it.', manual: 'place' },
    { id: 'e4-1.spot', kind: 'step', when: 'placing:m249', done: 'placed:m249', target: { world: 'marked' }, text: 'Click a marked spot by the road.' },
    { id: 'e4-1.start', kind: 'step', when: 'placed:m249', done: 'waveStarted', target: { ui: '#go' }, text: 'Ready. Start the wave.', keys: ['Space'], manual: 'start' },
    { id: 'e4-1.second', kind: 'step', when: 'ready:m249', done: 'placing:m249|placed:m249:2', target: { ui: '#buildbar .card[data-id="m249"]' }, text: 'A second Ksp 90. Place it too.' },
  ],
  'e4-2': [
    { id: 'e4-2.supplies', kind: 'show', when: 'start', target: { ui: '#res .cash-box' }, text: 'Supplies. Spend them on defences during the day.', manual: 'supplies' },
    { id: 'e4-2.wire', kind: 'step', when: 'start', done: 'obstacle:wire', target: { ui: '#buildbar .card[data-id="wire"]' }, text: 'Wire slows them. Lay it across the road.', manual: 'wire' },
    { id: 'e4-2.speed', kind: 'caption', when: 'afterWave1', target: { ui: '#speedcd' }, text: 'Faster:', keys: ['F'], manual: 'speed' },
  ],
  'e4-3': [
    { id: 'e4-3.aim', kind: 'step', when: 'start', done: 'placing:m2|placed:m2', target: { ui: '#buildbar .card[data-id="m2"]' }, text: 'The Ksp 88 covers a narrow arc. Aim it.', manual: 'arc' },
    { id: 'e4-3.drag', kind: 'caption', when: 'placing:m2', target: { world: 'pointer' }, text: 'Press, then drag toward the road to aim.' },
    { id: 'e4-3.rotate', kind: 'show', when: 'placed:m2', target: { world: 'gun:m2' }, text: 'Wrong way? Select it and press', keys: ['R'], manual: 'arc' },
  ],
  'after-e4': [
    { id: 'after-e4.map', kind: 'show', when: 'opmap', target: { ui: '.opmap [data-a="go"]' }, text: 'Gnesta is next. Open the sector.', manual: 'map' },
  ],
  'gn-1': [
    { id: 'gn-1.line', kind: 'show', when: 'start', target: { world: 'evac' }, text: 'Civilians walk this yellow line to the ice rink.', manual: 'evac' },
    { id: 'gn-1.goal', kind: 'show', when: 'start', target: { ui: '#evac' }, text: 'Get {need} of {total} inside. That wins the day.' },
    { id: 'gn-1.vol', kind: 'step', when: 'start', done: 'placing:civ|placed:civ', target: { ui: '#buildbar .card[data-id="civ"]' }, text: 'Volunteers. Place them where they can see the line.', manual: 'squads' },
    { id: 'gn-1.map', kind: 'caption', when: 'waveStarted', target: { ui: '#minimap' }, text: 'Map:', keys: ['Tab'], manual: 'minimap' },
  ],
  'gn-2': [
    { id: 'gn-2.arrows', kind: 'show', when: 'start', target: { world: 'route' }, text: 'Red arrows: the way the horde will walk.', manual: 'route' },
    { id: 'gn-2.block', kind: 'step', when: 'start', done: 'obstacle:block', target: { ui: '#buildbar .card[data-id="block"]' }, text: 'Block a street. They walk around the block.', manual: 'barricades' },
    { id: 'gn-2.reroute', kind: 'show', when: 'obstacle:block', target: { world: 'route' }, text: 'New route. Always leave them one way through.' },
    { id: 'gn-2.cover', kind: 'caption', when: 'placed:hv', target: { world: 'gun:hv' }, text: 'Squads find their own cover.' },
    { id: 'gn-2.v', kind: 'caption', when: 'waveStarted', target: { ui: '#routekey' }, text: 'Route:', keys: ['V'] },
  ],
  'after-gn-2': [
    { id: 'after-gn-2.rp', kind: 'show', when: 'result', target: { ui: '.result .rptab' }, text: 'RP: earned in battle, spent between days.', manual: 'rp' },
    { id: 'after-gn-2.depot', kind: 'show', when: 'opmap', target: { ui: '.opmap [data-a="go"]' }, text: 'The depot opens before the day. Spend your RP there.', manual: 'depot' },
    { id: 'after-gn-2.level', kind: 'show', when: 'depot', target: { ui: '.depot [data-a="lvl"]' }, text: 'Spend RP to train a unit one level.' },
  ],
  'gn-3': [
    { id: 'gn-3.door', kind: 'show', when: 'start', target: { world: 'dormant' }, text: 'Red door: infected inside. They burst out with the wave.', manual: 'dormant' },
    { id: 'gn-3.early', kind: 'caption', when: 'afterWave1', target: { ui: '#go' }, text: 'Call early: bonus supplies', manual: 'early' },
  ],
  'after-gn-3': [
    { id: 'after-gn-3.req', kind: 'show', when: 'depot', target: { ui: '.depot [data-req]' }, text: 'Command released new units. Requisition them with RP.', manual: 'requisition' },
  ],
  'gn-4': [
    { id: 'gn-4.move', kind: 'show', when: 'start', target: { world: 'gun' }, text: 'Select a unit and press M to move it.', keys: ['M'], manual: 'move' },
    { id: 'gn-4.where', kind: 'caption', when: 'moving', target: { world: 'pointer' }, text: 'Click where it goes. No fire while moving.' },
    { id: 'gn-4.via', kind: 'caption', when: 'moving', target: { world: 'pointer' }, text: 'Shift-click: waypoints' },
  ],
  'after-gn-4': [
    { id: 'after-gn-4.north', kind: 'show', when: 'opmap', target: { ui: '.opmap canvas' }, text: 'Two sectors now. The one you skip gets tougher.', manual: 'sectors' },
    { id: 'after-gn-4.up', kind: 'show', when: 'depot', target: { ui: '.depot [data-up]' }, text: 'Upgrades improve every unit of that type.', manual: 'upgrades' },
    { id: 'after-gn-4.reassign', kind: 'show', when: 'depot', target: { ui: '.depot [data-a="move"]' }, text: 'Reassign units between sectors here. It costs nothing.' },
  ],
  'gn-5': [
    { id: 'gn-5.sup', kind: 'show', when: 'start', target: { world: 'gun' }, text: 'Click a unit: ammo, sandbags or a grenade kit.', manual: 'unitSupplies' },
  ],
  'gnn-1': [
    { id: 'gnn-1.path', kind: 'caption', when: 'waveStarted', target: { world: 'route' }, text: 'Watch them take the footpath.' },
  ],
  'gnn-2': [
    { id: 'gnn-2.ping', kind: 'show', when: 'ping', target: { ui: '#minimap' }, text: 'A ping means trouble. Click it to look.', manual: 'pings' },
  ],
  'gnn-3': [
    { id: 'gnn-3.front', kind: 'show', when: 'start', target: { ui: '#buildbar .guns' }, text: 'Frontage: only {frontage} units fit here. Choose who goes.', manual: 'frontage' },
    { id: 'gnn-3.reserve', kind: 'caption', when: 'deployed', target: { ui: '#buildbar' }, text: 'The rest wait in reserve until tomorrow.' },
  ],
  // Tvåstegsvalet kommer bara när köpraden har fler än 9 kort (Olas beslut 3); steget följer det, inte dagen.
  any: [
    { id: 'any.chords', kind: 'show', when: 'chords', target: { ui: '#buildbar' }, text: 'Keys: first the group, then the item. Try', keys: ['1', '2'] },
  ],
};

// Tips i stunden (avsnitt 5.3): kommer när det händer, för det som är upplåst, en gång per kampanj (utom de med
// repeat: högst var femte minut). on: händelsen i main.js. kind 'show' är en hård paus, 'tip' en notis.
export const TIPS = [
  { id: 'tip.base', on: 'breach', kind: 'tip', text: 'Base hit. At zero the day is lost.', manual: 'base' },
  { id: 'tip.civ', on: 'civilianDown', kind: 'show', text: 'Civilian down. Too many lost and the day fails.', target: { world: 'civdown' }, manual: 'evac', needs: 'evac' },
  { id: 'tip.arc', on: 'idleOutside', kind: 'tip', text: 'Target outside arc. Press R to rotate.', repeat: true, needs: 'rotate' },
  { id: 'tip.spare', on: 'spare', kind: 'tip', text: 'Supplies to spare. Click a unit.', repeat: true, needs: 'unitSupplies' },
  { id: 'tip.shut', on: 'allShut', kind: 'tip', text: 'Every road shut: they smash a barricade.', repeat: true, needs: 'block' },
  { id: 'tip.roof', on: 'placing:psg90', kind: 'tip', text: 'Snipers go on flat roofs or ridges.', manual: 'roofs', needs: 'move' },
  { id: 'tip.mounted', on: 'mounted', kind: 'tip', text: "Mounted. It can't move.", needs: 'move' },
  { id: 'tip.star', on: 'star', kind: 'tip', text: 'Three days survived: a star. Better aim, faster reload.', manual: 'veterancy' },
  { id: 'tip.fallen', on: 'fallen', kind: 'tip', text: 'The fallen stay lost after a win. Refill at the depot.', manual: 'losses' },
];
export const tipOf = id => TIPS.find(t => t.id === id) ?? null;
export const REPEAT_GAP = 300;   // sekunder mellan två likadana tips som får upprepas

// Fienderna (Olas beslut 4): första gången en typ syns stannar allt och en presentationsruta visar porträttet,
// en kort rapport och Continue. stage: där typen först kommer i kampanjen (sparfilens migrering).
export const ENEMIES = {
  walker: { stage: 'e4-1', title: 'Walkers', report: 'We have reports of infected on the E4. Slow, but they keep coming.' },
  runner: { stage: 'e4-2', title: 'Runners', report: 'We have reports of a new type of enemy. It moves faster.' },
  brute: { stage: 'e4-3', title: 'Brutes', report: 'We have reports of a new type of enemy. Big, and very hard to stop.' },
};

// HUD:ens delar som dyker upp med en diskret animation första gången (avsnitt 4). feature: upplåsningen.
export const REVEALS = [
  { id: 'hud:supplies', feature: 'supplies', sel: '#res .cash-box' },
  { id: 'hud:speed', feature: 'speed', sel: '#speedcd' },
  { id: 'hud:minimap', feature: 'minimap', sel: '#minimap' },
  { id: 'hud:route', feature: 'route', sel: '#routekey' },
  { id: 'hud:manual', feature: 'manual', sel: '#manualbtn' },
  { id: 'hud:evac', feature: 'evac', sel: '#evac' },
];

// Field manual (avsnitt 5.5): ett uppslag per begrepp, högst 40 ord, tangenten, inga siffror som ändras med
// balansen. Upplåst när lektionen körts eller hoppats över (steget eller tipset med manual), eller när
// fienden setts. icon: köpradens ikon (src/ui/icons.js) eller 'enemy:TYP' (porträttet).
export const MANUAL_GROUPS = ['Basics', 'Defences', 'Units', 'Operation', 'Enemies'];
export const MANUAL = [
  { id: 'place', group: 'Basics', title: 'Place a unit', icon: 'm249', text: 'Pick a card in the bar at the bottom, or press its number. Click the ground to place it. Light ground shows where it may stand.', keys: ['1', '2', '3'] },
  { id: 'start', group: 'Basics', title: 'Start the wave', text: 'Build first: nothing moves until you start. After a wave the next one counts down by itself.', keys: ['Space'] },
  { id: 'base', group: 'Basics', title: 'The base', text: 'Every infected that reaches the base takes a point. At zero the day is lost and starts over with the force you went in with.' },
  { id: 'speed', group: 'Basics', title: 'Speed', text: 'Run the day at 1x, 2x or 3x. The world pauses whenever a tip or the menu is open.', keys: ['F'] },
  { id: 'supplies', group: 'Defences', title: 'Supplies', text: 'Each day brings supplies, and every kill adds a little. Spend them during the day on defences. They do not carry over.' },
  { id: 'wire', group: 'Defences', title: 'Wire', icon: 'wire', text: 'Lay wire across the road. Everything that walks through it slows down and the wire wears out. Brutes barely notice it.' },
  { id: 'barricades', group: 'Defences', title: 'Barricades', icon: 'block', text: 'Concrete across a street. The horde walks around the block instead. Shut every way and they smash through the weakest one.' },
  { id: 'route', group: 'Defences', title: 'Horde route', text: 'Red arrows show the way the horde will walk now. Hold a barricade over a street to see the new way first.', keys: ['V'] },
  { id: 'unitSupplies', group: 'Defences', title: 'Supplies on units', text: 'Click a unit: an ammo crate makes it fire faster for the day, sandbags dig a squad in, a grenade kit throws at crowds.' },
  { id: 'arc', group: 'Units', title: 'Arc and rotate', icon: 'm2', text: 'Each gun fires only inside its arc. Press and drag while placing to aim it. Select a gun and press R to turn it.', keys: ['R'] },
  { id: 'move', group: 'Units', title: 'Move', text: 'Select a unit and press M, then click where it goes. Shift-click adds waypoints. No fire while moving, and the team can be caught.', keys: ['M'] },
  { id: 'squads', group: 'Units', title: 'Squads', icon: 'hv', text: 'Squads drop on a spot and each man finds his own cover. Corners, cars, hedges and ditches.' },
  { id: 'roofs', group: 'Units', title: 'Snipers', icon: 'psg90', text: 'The Psg 90 goes on flat roofs, the ridge by a chimney, or tall buildings. Height lets it see over the houses.' },
  { id: 'veterancy', group: 'Units', title: 'Veterans', text: 'A unit that survives three won days earns a star: slightly better aim and reload.' },
  { id: 'losses', group: 'Units', title: 'Losses', text: 'Lose a day and it starts over with the force you went in with. Win, and the fallen stay lost until you refill them at the depot.' },
  { id: 'evac', group: 'Operation', title: 'Evacuation', text: 'Civilians walk the yellow line to the ice rink. Get enough of them inside and the day is won. Lose too many and it fails.' },
  { id: 'minimap', group: 'Operation', title: 'Map', text: 'The map shows your units, the horde and where they come in. Click it to look there.', keys: ['Tab'] },
  { id: 'map', group: 'Operation', title: 'Operations map', text: 'Between days you pick the sector and read what command has sent.' },
  { id: 'rp', group: 'Operation', title: 'RP', text: 'Requisition points. Earned in battle by kills, waves and objectives, spent at the depot between days.' },
  { id: 'depot', group: 'Operation', title: 'The depot', text: 'Train your units a level, refill the fallen, requisition what command has released, and buy upgrades. Only between days.' },
  { id: 'requisition', group: 'Operation', title: 'Requisition', text: 'Command releases a fixed number of units for each sector. RP is the price. What is not released cannot be bought.' },
  { id: 'upgrades', group: 'Operation', title: 'Upgrades', text: 'An upgrade improves every unit of that type you have. Command releases them a few at a time.' },
  { id: 'sectors', group: 'Operation', title: 'Sectors', text: 'Units can be reassigned between open sectors for free. A sector you neglect grows tougher.' },
  { id: 'pings', group: 'Operation', title: 'Pings', text: 'A ping on the map means trouble there: a barricade failing, a civilian down, a gun aimed wrong. Click it to look.' },
  { id: 'frontage', group: 'Operation', title: 'Frontage', text: 'Only so many units fit on the line in a sector. Choose who goes; the rest wait in reserve.' },
  { id: 'early', group: 'Operation', title: 'Call early', text: 'Call the next wave before the countdown ends for bonus supplies. Mid-wave it stacks the waves.', keys: ['Space'] },
  { id: 'walker', group: 'Enemies', title: 'Walkers', icon: 'enemy:walker', text: 'Slow and many. They keep coming until they are put down.' },
  { id: 'runner', group: 'Enemies', title: 'Runners', icon: 'enemy:runner', text: 'Fast and fragile. Keep them in the wire where your guns can reach them.' },
  { id: 'brute', group: 'Enemies', title: 'Brutes', icon: 'enemy:brute', text: 'Big and tough. Wire barely slows them. Heavy guns and grenades bring them down.' },
  { id: 'dormant', group: 'Enemies', title: 'Dormant houses', text: 'A red frame and a mark over a house: infected inside. The door bursts open when the wave comes.' },
];
export const manualEntry = id => MANUAL.find(m => m.id === id) ?? null;
