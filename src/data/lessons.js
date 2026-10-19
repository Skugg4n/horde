// Lektionerna (0.16.0, docs/superpowers/specs/2026-10-16-onboarding-design.md avsnitt 3 och 5): exakt
// spelartext på engelska, högst cirka 12 ord per steg. Ren data; upplåsningen bor i src/meta/unlocks.js,
// det sparade läget (sett, tipsens läge) i src/meta/lessons.js och plåten i src/ui/lessons.js.
//
// Ett steg: { id, kind, when, done, target, text, keys, manual }
//   kind    'step' hård paus, släpps när handlingen (done) är gjord
//           'show' hård paus, släpps med klick, Enter eller Space
//           'caption' ingen paus, tonas bort efter 4 s (bara Tips: On)
//   when    när steget börjar (main.js lessonCond): 'start' före första vågen, 'afterWave1' efter första
//           vågen, 'arrived:TYP' en sen enhet av typen har kommit fram, 'placing:TYP' i handen, 'placed:TYP' utställd,
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
    { id: 'e4-1.second', kind: 'step', when: 'arrived:m249', done: 'placing:m249|placed:m249:2', target: { ui: '#buildbar .card[data-id="m249"]' }, text: 'A second Ksp 90. Place it too.' },
  ],
  // 0.16.4 (Olas feedback: "dag 2 är orättvis"): båda ingångarna sägs före första vågen. Fartknappen flyttade till dag 3.
  // 0.20.0 (H497): Move (M) kom här efter våg 1; nu Ishallen dag 3 med radion. Mellan vågorna flyttas allt fritt.
  'e4-2': [
    { id: 'e4-2.two', kind: 'show', when: 'start', target: { world: 'entry:sodertalje' }, text: 'Two roads in. Södertälje joins from wave 2.' },
    { id: 'e4-2.supplies', kind: 'show', when: 'start', target: { ui: '#res .cash-box' }, text: 'Supplies. Spend them on defences during the day.', manual: 'supplies' },
    { id: 'e4-2.wire', kind: 'step', when: 'start', done: 'obstacle:wire', target: { ui: '#buildbar .card[data-id="wire"]' }, text: 'Wire slows them. Lay it across the road.', manual: 'wire' },
  ],
  'e4-3': [
    { id: 'e4-3.aim', kind: 'step', when: 'start', done: 'placing:m2|placed:m2', target: { ui: '#buildbar .card[data-id="m2"]' }, text: 'The Ksp 88 covers a narrow arc. Aim it.', manual: 'arc' },
    { id: 'e4-3.drag', kind: 'caption', when: 'placing:m2', target: { world: 'pointer' }, text: 'Click places it. Hold, then drag toward the road to aim.' },
    { id: 'e4-3.speed', kind: 'caption', when: 'afterWave1', target: { ui: '#speedcd' }, text: 'Faster:', keys: ['F'], manual: 'speed' },
  ],
  'after-e4': [
    { id: 'after-e4.map', kind: 'show', when: 'opmap', target: { ui: '.opmap [data-a="go"]' }, text: 'Hagstumosse is next. Open the sector.', manual: 'map' },
  ],
  // 0.16.4 (Olas feedback: "dag 1 har ingen agens"): kartan visar husen, de civilas vägar, hordens väg och
  // korsningarna; spelaren väljer själv var de frivilliga står (inga föreslagna platser längre).
  'gn-1': [
    { id: 'gn-1.line', kind: 'show', when: 'start', target: { world: 'evac' }, text: 'Marked houses evacuate along the yellow lines to the ice rink.', manual: 'evac' },
    { id: 'gn-1.goal', kind: 'show', when: 'start', target: { ui: '#evac' }, text: 'Get {need} of {total} inside. That wins the day.' },
    { id: 'gn-1.cross', kind: 'show', when: 'start', target: { world: 'danger' }, text: 'Red: their lines cross the horde. East first, then west.', manual: 'evac' },
    { id: 'gn-1.vol', kind: 'step', when: 'start', done: 'placed:civ', target: { world: 'danger' }, text: 'Protect the routes. Place your volunteers.', manual: 'squads' },
    { id: 'gn-1.map', kind: 'caption', when: 'waveStarted', target: { ui: '#minimap' }, text: 'Map:', keys: ['Tab'], manual: 'minimap' },
  ],
  'gn-2': [
    { id: 'gn-2.arrows', kind: 'show', when: 'start', target: { world: 'route' }, text: 'Red arrows: the way the horde will walk.', manual: 'route' },
    { id: 'gn-2.block', kind: 'step', when: 'start', done: 'obstacle:block', target: { ui: '#buildbar .card[data-id="block"]' }, text: 'Block a street. They walk around the block.', manual: 'barricades' },
    // 0.19.0 (speltestet av 0.18.1: den som hoppade över barriären med Esc fick aldrig korselden före våg 1): väntar inte
    // i kön (wait: false), så att stegen efter kommer ändå
    { id: 'gn-2.reroute', kind: 'show', when: 'obstacle:block', wait: false, target: { world: 'route' }, text: 'New route. Always leave them one way through.' },
    { id: 'gn-2.v', kind: 'caption', when: 'waveStarted', target: { ui: '#routekey' }, text: 'Route:', keys: ['V'] },
    // 0.18.0 (skiva 1, kampanjplanens dag 5): korselden
    // 0.18.1 (speltestet av 0.18.0: "korselden såg jag aldrig", bildtexten kom bara med ett kort i handen efter våg 1):
    // före första vågen, medan spelaren ställer ut. Finns redan en korseld pekar lektionen på den; annars ber den om en
    // andra enhet från en annan vinkel. Guldrutorna syns alltid i bygget (main.js xfZones).
    { id: 'gn-2.xfask', kind: 'show', when: 'start&units:1', done: 'xfZone|waveStarted', target: { world: 'route' }, text: 'Cover one street from two angles. Place a second unit.', manual: 'crossfire' },
    { id: 'gn-2.xf', kind: 'show', when: 'build&xfZone', target: { world: 'xfzone' }, text: 'Two angles on one street: they take more damage.', manual: 'crossfire' },
  ],
  'after-gn-2': [
    { id: 'after-gn-2.rp', kind: 'show', when: 'result', target: { ui: '.result .rptab' }, text: 'RP: earned in battle, spent between days.', manual: 'rp' },
    { id: 'after-gn-2.depot', kind: 'show', when: 'opmap', target: { ui: '.opmap [data-a="go"]' }, text: 'The depot opens before the day. Spend your RP there.', manual: 'depot' },
    { id: 'after-gn-2.level', kind: 'show', when: 'depot', target: { ui: '.depot [data-a="lvl"]' }, text: 'Spend RP to train a unit one level.' },
  ],
  // 0.16.4 (speltestet av 0.16.2: Ishallen dag 3 hade sex-sju nyheter på en gång): dag 3 är Hemvärnet och Norra
  // vägen (en andra väg in, känd från E4), de vilande husen dag 4, Next wave med bonus dag 5
  'gn-3': [
    { id: 'gn-2.cover', kind: 'caption', when: 'placed:hv', target: { world: 'gun:hv' }, text: 'Squads find their own cover.' },
    // 0.20.0 (H497, kampanjbågens dag 6): Hemvärnet har radio till enheterna. Move (M) och Rotate (R) mitt i striden,
    // förut E4 dag 2 och 3. Olas text. wait: false, så att sanity-plåten inte väntar på våg 1.
    { id: 'gn-3.move', kind: 'show', when: 'afterWave1', wait: false, target: { world: 'gun' }, text: 'Radios for every unit. Press M to move them mid-fight.', manual: 'move' },
    { id: 'gn-3.where', kind: 'caption', when: 'moving', target: { world: 'pointer' }, text: 'Click where it goes. No fire while moving.' },
    { id: 'gn-3.rotate', kind: 'caption', when: 'afterWave1', target: { world: 'gun' }, text: 'Turn an arc: select a unit, press', keys: ['R'], manual: 'arc' },
    // 0.18.0 (skiva 1, kampanjplanens dag 6): sanity-mätaren kommer med Hemvärnet, bara mätaren och dess verkan
    // 0.18.1 (speltestet av 0.18.0: tipset kom mitt i våg 1 och pekade på en annan enhet än den som vacklade): en paus
    // första gången en enhets sanity verkligen sjunker, och den pekar på just den enheten
    { id: 'gn-3.sanity', kind: 'show', when: 'sanityLow', target: { world: 'sanityLow' }, text: 'Blue bar: Sanity. This unit is shaken. Keep the dead off it.', manual: 'sanity' },
  ],
  'after-gn-3': [
    { id: 'after-gn-3.req', kind: 'show', when: 'depot', target: { ui: '.depot [data-req]' }, text: 'Command released new units. Requisition them with RP.', manual: 'requisition' },
    // 0.18.0 (Olas beslut: streck och skadeklasser på korten, siffrorna bara i Field manual)
    { id: 'after-gn-3.bars', kind: 'caption', when: 'depot', target: { ui: '.depot [data-req]' }, text: 'Bars compare units. Exact numbers: Field manual.', keys: ['J'], manual: 'numbers' },
  ],
  'gn-4': [
    { id: 'gn-3.door', kind: 'show', when: 'start', target: { world: 'dormant' }, text: 'Red door: infected inside. They burst out with the wave.', manual: 'dormant' },
    { id: 'gn-4.via', kind: 'caption', when: 'moving', target: { world: 'pointer' }, text: 'Shift-click: waypoints' },
  ],
  'after-gn-4': [
    { id: 'after-gn-4.up', kind: 'show', when: 'depot', target: { ui: '.depot [data-up]' }, text: 'Upgrades improve every unit of that type.', manual: 'upgrades' },
  ],
  // 0.16.0 (Olas beslut, "Gnesta = en sektor"): samma plats, kartan vidgas, trupperna följer med
  'after-gn-5': [
    { id: 'after-gn-5.north', kind: 'show', when: 'opmap', target: { ui: '.opmap [data-a="go"]' }, text: 'Same district, wider map. Your units carry over.', manual: 'sectors' },
  ],
  'gn-5': [
    { id: 'gn-3.early', kind: 'caption', when: 'afterWave1', target: { ui: '#go' }, text: 'Call early: bonus supplies', manual: 'early' },
  ],
  'gnn-1': [
    { id: 'gn-5.sup', kind: 'show', when: 'start', target: { world: 'gun' }, text: 'Click a unit: ammo, sandbags or a grenade kit.', manual: 'unitSupplies' },
    { id: 'gnn-1.path', kind: 'caption', when: 'waveStarted', target: { world: 'route' }, text: 'Watch them take the footpath.' },
  ],
  'gnn-2': [
    { id: 'gnn-2.ping', kind: 'show', when: 'ping', target: { ui: '#minimap' }, text: 'A ping means trouble. Click it to look.', manual: 'pings' },
  ],
  'gnn-3': [
    { id: 'gnn-3.front', kind: 'show', when: 'start', target: { ui: '#buildbar .guns' }, text: 'Frontage: only {frontage} units fit here. Choose who goes.', manual: 'frontage' },
    { id: 'gnn-3.reserve', kind: 'caption', when: 'deployed', target: { ui: '#buildbar' }, text: 'The rest wait in reserve until tomorrow.' },
  ],
  // 0.18.0 (skiva 1): tröttheten i förrådet, när styrkan är större än frontbredden
  'after-gnn-3': [
    { id: 'after-gnn-3.fatigue', kind: 'show', when: 'depot', target: { ui: '.depot [data-fat]' }, text: 'Units that fought are tired. Rest some in reserve.', manual: 'fatigue' },
  ],
  'gnn-4': [
    { id: 'gnn-4.target', kind: 'show', when: 'afterWave1', target: { world: 'gun' }, text: 'Target priority: select a unit and press', keys: ['T'], manual: 'target' },
  ],
  // 0.18.0 (skiva 1): trupper i hus (kampanjplanens Björnlunda dag 10, som inte är byggd; Vikingavägens villagator)
  'gnn-5': [
    { id: 'gnn-5.house', kind: 'show', when: 'start', target: { world: 'route' }, text: 'Click a house with a squad card. They hold the windows.', manual: 'garrison' },
  ],
  // 0.17.0-molnbo: Mölnbo, en ny idé per dag (platsen: tornen, tåget, tågklockan, bron, spåret)
  'mb-1': [
    // 0.20.0 (H495): dag 1 evakueras norra sidan över bron (Hagstumosses evakuering). 0.20.1 (speltestet av 0.20.0: testaren
    // ställde allt vid bron): först i listan, och den pekar på de gula linjerna och de första husen
    { id: 'mb-1.evac', kind: 'show', when: 'start', target: { world: 'evac' }, text: 'They leave these houses. Cover the yellow lines, north of the bridge.', manual: 'evac' },
    // 0.18.0 (skiva 1, kampanjplanens dag 8): routed och Fall back
    { id: 'mb-1.rout', kind: 'show', when: 'afterWave1', target: { world: 'gun' }, text: 'Broken units flee. Pull one back yourself: select it, press', keys: ['G'], manual: 'rout' },
    { id: 'mb-1.tower', kind: 'step', when: 'start', done: 'placing:psg90|placed:psg90', target: { ui: '#buildbar .card[data-id="psg90"]' }, text: 'High ground. Put a Psg 90 on a stair tower.', manual: 'roofs' },
    { id: 'mb-1.roofs', kind: 'caption', when: 'placing:psg90', target: { world: 'pointer' }, text: 'Towers, station roof, train roof.' },
  ],
  // 0.20.0 (kampanjbågen, H495): dag 2 tappar vi norra sidan. Pendeltåget rullar in (förut dag 4), bron och Håll eld.
  'mb-2': [
    // 0.19.2 (speltestet av 0.19.1, fynd 1: tåget lästes som en klocka, inte som ett val): första gången pendeltåget
    // signalerar pekar en bildtext på perrongen. Ingen paus (caption); först i listan så att inget steg håller upp den.
    { id: 'mb-2.platform', kind: 'caption', when: 'trainWarn', target: { world: 'platform' }, text: 'They get off here, climb to the bridge. Meet them or hold.' },
    { id: 'mb-2.bridge', kind: 'show', when: 'start', target: { world: 'route' }, text: 'One bridge over the tracks. Close it and they must break through.', manual: 'barricades' },
    // 0.18.0 (skiva 1, kampanjplanens rondell dag 12): Håll eld vid bron
    { id: 'mb-2.hold', kind: 'show', when: 'afterWave1', target: { world: 'gun' }, text: 'Hold fire: they walk into the ambush. Select a unit, press', keys: ['H'], manual: 'holdFire' },
  ],
  // 0.20.0: dag 3, håll tills klockan gått ut, sedan uttåget
  'mb-3': [
    { id: 'mb-3.clock', kind: 'show', when: 'start', target: { ui: '#train' }, text: 'Hold until the clock runs out. Then we pull out.', manual: 'train' },
    // 0.18.0 (skiva 1, kampanjplanens centrum dag 16): överrända pjäser
    { id: 'mb-3.overrun', kind: 'show', when: 'silent', target: { world: 'silent' }, text: 'A gun crew is down. Recrew it, or send a squad.', keys: ['N'], manual: 'overrun' },
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
  { id: 'tip.roof', on: 'placing:psg90', kind: 'tip', text: 'Snipers go on towers, flat roofs, ridges and tall buildings.', manual: 'roofs', needs: 'move' },
  { id: 'tip.mounted', on: 'mounted', kind: 'tip', text: "Mounted. It can't move.", needs: 'move' },
  { id: 'tip.star', on: 'star', kind: 'tip', text: 'Three days survived: a star. Better aim, faster reload.', manual: 'veterancy' },
  { id: 'tip.fallen', on: 'fallen', kind: 'tip', text: 'The fallen stay lost after a win. Refill at the depot.', manual: 'losses' },
  // 0.18.0 (skiva 1): i stunden
  { id: 'tip.armor', on: 'armorHit', kind: 'tip', text: 'Small arms barely bite. Ksp 88 and grenades do.', manual: 'armored' },
  { id: 'tip.waver', on: 'waver', kind: 'tip', text: 'A unit is wavering. Thin the dead around it.', manual: 'sanity', needs: 'sanity', repeat: true },
  { id: 'tip.routed', on: 'routed', kind: 'tip', text: 'A unit broke and ran. It regroups in reserve.', manual: 'rout', needs: 'rout' },
  { id: 'tip.breach', on: 'houseBreached', kind: 'tip', text: 'They broke into the house. Heavy losses inside.', manual: 'garrison', needs: 'garrison' },
  // 0.19.0 (H456): bjässen knuffar undan skrotbilarna
  { id: 'tip.shove', on: 'carShoved', kind: 'tip', text: 'A brute shoved the cars aside. Concrete holds.', manual: 'cars', needs: 'car' },
];
export const tipOf = id => TIPS.find(t => t.id === id) ?? null;
export const REPEAT_GAP = 300;   // sekunder mellan två likadana tips som får upprepas

// Fienderna (Olas beslut 4): första gången en typ syns stannar allt och en presentationsruta visar porträttet,
// en kort rapport och Continue. stage: där typen först kommer i kampanjen (sparfilens migrering).
export const ENEMIES = {
  walker: { stage: 'e4-1', title: 'Walkers', report: 'We have reports of infected on the E4. Slow, but they keep coming.' },
  runner: { stage: 'e4-2', title: 'Runners', report: 'We have reports of a new type of enemy. It moves faster.' },
  brute: { stage: 'e4-3', title: 'Brutes', report: 'We have reports of a new type of enemy. Big, and very hard to stop.' },
  // 0.18.0 (skiva 1): kampanjplanens ordning, kryparna med mål-läget och de pansrade med Strongest
  crawler: { stage: 'gnn-4', title: 'Crawlers', report: 'Something moves low in the grass. Wire does not stop it. Squads see them; guns on the roofs hardly do.' },
  armored: { stage: 'mb-2', title: 'Armoured', report: 'Riot police from Södertälje. Still in their gear. Small arms barely bite. Heavy MG, grenades.' },
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
  { id: 'place', group: 'Basics', title: 'Place a unit', icon: 'm249', text: 'Pick a card at the bottom or press its key; each card keeps its key. Click the ground to place it. Right-click or Esc puts it back. Holding a card, pan with WASD, the middle button or the screen edge.', keys: ['4', 'X'] },
  { id: 'start', group: 'Basics', title: 'Start the wave', text: 'Build first: nothing moves until you start. After a wave the next one counts down by itself.', keys: ['Space'] },
  // 0.20.0: klockan på Mölnbo dag 3 (förut tåget som gick)
  { id: 'train', group: 'Basics', title: 'The clock', text: 'Some days have a clock. Hold the base until it runs out and the day is won, even with infected still on the streets.' },
  { id: 'base', group: 'Basics', title: 'The base', text: 'Every infected that reaches the base takes a point. At zero the day is lost and starts over with the force you went in with.' },
  { id: 'speed', group: 'Basics', title: 'Speed', text: 'Run the day at 1x, 2x or 3x. The world pauses whenever a tip or the menu is open.', keys: ['F'] },
  { id: 'supplies', group: 'Defences', title: 'Supplies', text: 'Each day brings supplies, and every kill adds a little. Spend them during the day on defences. They do not carry over.' },
  { id: 'wire', group: 'Defences', title: 'Wire', icon: 'wire', text: 'Lay wire across the road. Everything that walks through it slows down and the wire wears out.' },
  { id: 'barricades', group: 'Defences', title: 'Barricades', icon: 'block', text: 'Concrete across a street. The horde walks around the block instead. Shut every way and they smash through the weakest one.' },
  // 0.19.0 (H456)
  { id: 'cars', group: 'Defences', title: 'Junk cars', text: 'Wrecks pushed across a street, cheaper than concrete. The horde walks around them, but a brute shoves them aside in moments. Concrete holds against brutes.' },
  { id: 'route', group: 'Defences', title: 'Horde route', text: 'Red arrows show the way the horde will walk now. Hold a barricade over a street to see the new way first.', keys: ['V'] },
  { id: 'unitSupplies', group: 'Defences', title: 'Supplies on units', text: 'Click a unit: an ammo crate makes it fire faster for the day, sandbags dig a squad in, a grenade kit throws at crowds.' },
  { id: 'arc', group: 'Units', title: 'Arc and rotate', icon: 'm2', text: 'Each gun fires only inside its arc. A click faces it at the road. Press, hold and drag to aim it, or right-drag. Once units have radios, select a gun and press R to turn it.', keys: ['R'] },
  { id: 'move', group: 'Units', title: 'Move', text: 'Radios let units move mid-fight. Select one and press M, then click where it goes. Shift-click adds waypoints. No fire while moving, and the team can be caught.', keys: ['M'] },
  { id: 'squads', group: 'Units', title: 'Squads', icon: 'hv', text: 'Squads drop on a spot and each man finds his own cover. Corners, cars, hedges and ditches.' },
  { id: 'roofs', group: 'Units', title: 'Snipers', icon: 'psg90', text: 'The Psg 90 goes on flat roofs, the ridge by a chimney, tall buildings and towers. Height lets it see over the houses.' },
  { id: 'veterancy', group: 'Units', title: 'Veterans', icon: 'star', text: 'A unit that survives three won days earns a star: slightly better aim and reload.' },
  { id: 'losses', group: 'Units', title: 'Losses', icon: 'losses', text: 'Lose a day and it starts over with the force you went in with. Win, and the fallen stay lost until you refill them at the depot.' },
  { id: 'evac', group: 'Operation', title: 'Evacuation', text: 'Marked houses evacuate along the yellow lines to safety, a few at a time. Red patches show where the horde meets them. Choose which to cover, and shift your units between waves when the next houses go.' },
  { id: 'minimap', group: 'Operation', title: 'Map', text: 'The map shows your units, the horde and where they come in. Click it to look there.', keys: ['Tab'] },
  { id: 'map', group: 'Operation', title: 'Operations map', text: 'Between days you pick the sector and read what command has sent.' },
  { id: 'rp', group: 'Operation', title: 'RP', text: 'Requisition points. Earned in battle by kills, waves and objectives, spent at the depot between days.' },
  { id: 'depot', group: 'Operation', title: 'The depot', text: 'Train your units a level, refill the fallen, requisition what command has released, and buy upgrades. Only between days.' },
  { id: 'requisition', group: 'Operation', title: 'Requisition', text: 'Command releases a fixed number of units for each sector. RP is the price. What is not released cannot be bought.' },
  { id: 'upgrades', group: 'Operation', title: 'Upgrades', text: 'An upgrade improves every unit of that type you have. Command releases them a few at a time.' },
  { id: 'sectors', group: 'Operation', title: 'Sectors', text: 'A sector is one place with one force. Hagstumosse starts at the ice rink and widens north to Vikingavägen; your units carry over. Separate sectors, like E4, have their own.' },
  { id: 'pings', group: 'Operation', title: 'Pings', text: 'A ping on the map means trouble there: a barricade failing, a civilian down, a gun aimed wrong. Click it to look.' },
  { id: 'frontage', group: 'Operation', title: 'Frontage', text: 'Only so many units fit on the line in a sector. Choose who goes; the rest wait in reserve.' },
  { id: 'early', group: 'Operation', title: 'Call early', text: 'Call the next wave before the countdown ends for bonus supplies. Mid-wave it stacks the waves.', keys: ['Space'] },
  { id: 'walker', group: 'Enemies', title: 'Walkers', icon: 'enemy:walker', text: 'Slow and many. They keep coming until they are put down.' },
  { id: 'runner', group: 'Enemies', title: 'Runners', icon: 'enemy:runner', text: 'Fast and fragile. Keep them in the wire where your guns can reach them.' },
  { id: 'brute', group: 'Enemies', title: 'Brutes', icon: 'enemy:brute', text: 'Big and tough. Wire barely slows them. Heavy guns and grenades bring them down.' },
  { id: 'dormant', group: 'Enemies', title: 'Dormant houses', text: 'A red frame and a mark over a house: infected inside. The door bursts open when the wave comes.' },
  // 0.18.0 (strategiskt djup, skiva 1)
  { id: 'crawler', group: 'Enemies', title: 'Crawlers', icon: 'enemy:crawler', text: 'Low and slow. They slip under the wire without slowing. Hard to hit from roofs, towers and windows; squads and guns on the ground see them.' },
  { id: 'armored', group: 'Enemies', title: 'Armoured', icon: 'enemy:armored', text: 'Riot gear on the dead. Small arms barely bite. The 12.7 mm Ksp 88 and grenades go through. Set the heavy gun to Strongest.' },
  { id: 'crossfire', group: 'Defences', title: 'Crossfire', text: 'The dead caught in two arcs that meet at an angle take more damage. Faint gold tiles show where your arcs already cross; holding a unit, bright gold shows where it would.' },
  { id: 'sanity', group: 'Units', title: 'Sanity', icon: 'sanity', text: 'The blue bar under each unit; red means close to breaking. The dead close by, comrades falling and worse things wear it down. Shaken units shoot worse. Veterans and soldiers hold longer than volunteers. Calm brings it back.' },
  { id: 'rout', group: 'Units', title: 'Broken and fall back', text: 'Below the white line a unit breaks and runs for the base; it regroups in reserve and can be placed again. Fall back pulls a unit out in order, nerves intact.', keys: ['G'] },
  { id: 'target', group: 'Units', title: 'Target priority', text: 'First in line shoots whoever is closest to the base. Nearest, Strongest and Weakest pick by distance or toughness. Select a unit and cycle.', keys: ['T'] },
  { id: 'garrison', group: 'Units', title: 'Squads in houses', text: 'Click a house by the street with a squad, Ksp 90 or Ksp 58 card. They fire from the windows and take cover. If the dead break the door, losses are heavy.' },
  { id: 'holdFire', group: 'Units', title: 'Hold fire', text: 'The unit waits until you release it or the dead come close. The first volley hits twice as hard. Then a pause before it can wait again.', keys: ['H'] },
  { id: 'overrun', group: 'Units', title: 'Overrun guns', text: 'The dead can reach a gun crew. A silent gun stays where it stood. A squad close by mans it again, or Recrew sends a new crew for supplies. The pillbox stands its ground.', keys: ['N'] },
  { id: 'fatigue', group: 'Operation', title: 'Fatigue', text: 'Rested, Tired, Exhausted. A won day at the front tires a unit; a day in reserve rests it. Tired units shoot and hold a little worse. A lost attempt does not count.' },
  { id: 'numbers', group: 'Units', title: 'Weapon numbers', table: 'weapons', text: 'The exact numbers behind the bars, at level 1.' },
];
export const manualEntry = id => MANUAL.find(m => m.id === id) ?? null;
