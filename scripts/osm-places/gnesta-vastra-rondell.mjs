// Gnesta västra rondell: inställningar för scripts/osm-to-map.mjs (förhandsvisning, ingen spellogik).
// Koordinater här är plan.json-meter (x öster, y norr, origo mitt i rutan, 59.0475 N 17.285 E) från
// ~/Projects/horde-refs/gnesta-vastra-rondell/plan.json. Underlaget: beskrivning.md i samma mapp (aldrig i repot).
// Kartdata © OpenStreetMap contributors (ODbL).
//
// Platsen i kampanjen (docs/superpowers/specs/2026-10-18-kampanjplan.md avsnitt 10): dag 13 försvar mot framskjutna
// grupper, dag 15 vi blir överrännda, dag 19 spår av något främmande (köttiga trådar på marken som leder västerut).
// Horden kommer från väster längs väg 57 från Björnlunda (och längs D 830 ur skogen i sydväst) och vill in mot
// Gnesta: ut genom Västra Storgatan åt nordost (till centrum, ca 2 km), längs 57 åt sydost och, som reträttväg
// dag 15, Kärvsvägen söderut mot Västerkärv.
//
// BASEN (Olas fråga 1 i beskrivning.md är öppen; detta är ett förslag att byta): villan 660806495 på Barrstigens norra
// sida, ca 90 m öster om rondellen. Skälet: (1) den ligger öster om rondellen, alltså bakom den punkt där alla
// västliga vägar möts, så horden måste först ut i rondellen; (2) Barrstigen, Furulundsvägen och 57 sydost ligger
// inom några steg, så konvojen kommer ut åt både Västra Storgatan (via Furulundsvägens början) och Helenebergsvägen;
// (3) grannvillan 660806494 närmast rondellen ger prickskyttetaket som beskrivningen pekar ut (-100, 45); (4) det är
// glest och öppet kring huset, så det finns plats för lastning och stängsel. Radhusen vid Dansbanestigen är en bättre
// sista bastion men ligger 250 m bort och ser inte rondellen.

// Hus som OSM saknar: OSM har bara husen öster om x = -100, hela villaraden längs gamla landsvägen väster om rondellen
// (och några enstaka) saknas. Läge och storlek är avlästa ur Olas Google-skärmbild (satellit.jpg, passad mot OSM:s
// vägar, medelfel några meter). Bara läge och storlek, aldrig bilden. Rektanglar i plan.json-meter; små blir bodar.
const ADDED = [
    { id: 900000001, pts: [[-439.3,173.2],[-421.3,169.3],[-424.3,155.4],[-442.2,159.2]] },
    { id: 900000002, pts: [[-403.3,169.2],[-389.3,166.2],[-391.6,155.2],[-405.6,158.2]] },
    { id: 900000003, pts: [[-381.3,168.0],[-363.3,164.2],[-367.1,146.2],[-385.1,150.0]] },
    { id: 900000004, pts: [[-364.3,166.0],[-356.3,164.3],[-358.4,154.3],[-366.4,156.0]] },
    { id: 900000005, pts: [[-344.2,159.5],[-330.2,156.5],[-332.4,146.6],[-346.3,149.5]] },
    { id: 900000006, pts: [[-324.9,158.5],[-315.9,156.6],[-317.4,149.6],[-326.4,151.5]] },
    { id: 900000007, pts: [[-295.7,154.1],[-279.7,150.7],[-282.1,139.7],[-298.0,143.1]] },
    { id: 900000008, pts: [[-264.3,144.3],[-249.3,141.1],[-252.3,127.1],[-267.3,130.3]] },
    { id: 900000009, pts: [[-259.6,129.5],[-249.6,127.4],[-252.1,115.4],[-262.1,117.5]] },
    { id: 900000010, pts: [[-240.3,139.8],[-229.3,137.5],[-231.4,127.5],[-242.4,129.8]] },
    { id: 900000011, pts: [[-201.9,137.8],[-190.9,135.4],[-193.0,125.5],[-204.0,127.8]] },
    { id: 900000012, pts: [[-232.4,180.2],[-224.2,180.2],[-224.2,173.7],[-232.4,173.7]] },
    { id: 900000013, pts: [[-454.1,155.3],[-447.1,153.8],[-448.2,148.8],[-455.2,150.3]] },
    { id: 900000014, pts: [[-450.9,164.5],[-446.4,164.5],[-446.4,160.0],[-450.9,160.0]] },
    { id: 900000015, pts: [[115.2,126.4],[129.5,126.4],[129.5,117.2],[115.2,117.2]] },
    { id: 900000016, pts: [[142.7,14.3],[157.0,14.3],[157.0,-2.1],[142.7,-2.1]] },
    { id: 900000017, pts: [[168.2,-29.6],[180.5,-29.6],[180.5,-43.9],[168.2,-43.9]] },
];

export default {
  place: 'gnesta-vastra-rondell',
  name: 'Gnesta västra rondell',
  out: 'src/data/gnesta-vastra-rondell.js',
  exportName: 'vastraRondell',
  version: '0.1.0',
  // Utsnittet: villaraden längs gamla landsvägen i väster, rondellen, åkern i norr, skogen söder om 57, villaområdet
  // öster om rondellen med Barrstigen och Furulundsvägen, Dansbanestigens radhus och Helenebergsvägen i sydost.
  // Ca 368 x 290 m, halv skala som de andra.
  crop: { x0: -405, x1: 330, y0: -290, y1: 290 },
  scale: 0.5,
  buildingScale: 0.72,
  seed: 5701,
  home: [-110, 50],
  view: 84,
  zoomMax: 320,
  // 1950- till 80-talsvillor i trä: rött, gult, vitt; tegel och svart plåt. Radhusen är bruna och vita.
  facades: [['red', 38], ['yellow', 22], ['white', 26], ['beige', 6], ['brown', 4], ['grey', 4]],
  roofs: [['tile', 44], ['black', 28], ['charcoal', 16], ['slate', 12]],
  lamps: { 'Västra Storgatan': 34, 'Furulundsvägen': 40 },
  extraBuildings: ADDED,
  // Radhuslängorna vid Dansbanestigen och Hagstigen (Folkparken) är långsmala och stora.
  classify: c => (c.px > 100 && c.py > -70 && c.py < 70 && c.area > 95 ? 'row' : null),
  // Den gamla landsvägen väster om rondellen (före 57:s nya sträckning) saknar namn i OSM.
  roadNames: [{ at: [-300, 120], name: 'Gamla landsvägen' }],
  landmarks: [],
  props: [
    // gräsön i rondellen: radie r i spelmeter, mitt i ringvägen
    { kind: 'rondellIsland', free: true, at: [-164, 41], ry: 0, name: 'Rondellen', r: 5.4 },
    { kind: 'vackerby', at: [123, 183], name: 'Vackerby (buss)' },
    // byggarbetsplatsen vid Granbackavägen (huset under uppförande i satellitbilden)
    { kind: 'crane', free: true, at: [80, -30], ry: 0.6, name: 'Byggarbetsplatsen' },
  ],
  labels: [
    { text: 'Rondellen', at: [-150, 68] },
    { text: 'Villaraden', at: [-330, 175] },
    { text: 'Åkern', at: [-190, 200] },
    { text: 'Granskogen', at: [-230, -60] },
    { text: 'Radhusen', at: [215, 30] },
    { text: 'Byggarbetsplatsen', at: [80, -45] },
    { text: 'Vackerby', at: [123, 195] },
    { text: 'Folkparkstigen (OSM: Granbackavägen)', at: [112, 70] },
  ],
  // Skisser ur beskrivning.md (inte spellogik): ingångarna i väster, utgångarna österut, basen och försvarslägena.
  sketch: {
    spawns: [
      { id: 'w57', name: 'Road 57 from Björnlunda (west)', road: '57', at: [-475, 152], note: 'Huvudvägen: rak bred väg rakt in i rondellen. Horden i en lång rad, synlig långt före rondellen.' },
      { id: 'd830', name: 'D 830 from the south-west', road: 'D 830', at: [-470, -205], note: 'Ur skogen i sydväst, in i rondellen från söder. Framskjutna grupper kommer hit först (dag 13).' },
    ],
    exits: [
      { id: 'ne', name: 'Västra Storgatan to Gnesta centre', road: 'Västra Storgatan', at: [449, 310], note: 'Ca 2 km till centrum. Konvojens huvudväg; öppen åker i norr, villor och skog i söder.' },
      { id: 'se', name: 'Road 57 south-east', road: '57', at: [342, -385], note: 'Raksträckan förbi Helenebergsvägen, vidare förbi Gnesta.' },
      { id: 'kv', name: 'Kärvsvägen south (towards Västerkärv)', road: 'Kärvsvägen', at: [448, -338], note: 'Reträttväg dag 15, via Helenebergsvägen.' },
    ],
    base: { at: [-73, 53], name: 'Villa on Barrstigen: the base' },
    links: [
      { a: [-164, 41], b: [-73, 53], name: 'The roundabout to the base' },
      { a: [-73, 53], b: [73, -13], name: 'Furulundsvägen to Helenebergsvägen' },
    ],
    defence: [
      { kind: 'point', name: '1', at: [-164, 41], note: 'Rondellen: alla västliga vägar möts här, eldfält 150 m västerut längs 57' },
      { kind: 'point', name: '2', at: [-73, 53], note: 'Basen på Barrstigen' },
      { kind: 'point', name: '3', at: [73, -13], note: 'Furulundsvägen/Helenebergsvägen: reträtt mot Västerkärv' },
      { kind: 'sniper', at: [-98, 50], note: 'Villataket närmast rondellen: ser in i rondellen (beskrivning.md, -100, 45)' },
      { kind: 'squad-house', at: [-98, 50], note: 'Första huset på Barrstigen: bakhåll, mynningen mot rondellen (dag 12)' },
      { kind: 'mg', at: [-41, 59], note: 'Kulspruta på Barrstigens västra ände' },
      { kind: 'mg', at: [-80, -4], note: 'Kulspruta vid skogsbrynet söder om 57: 60 graders skillnad mot rondellen' },
      { kind: 'block', at: [-130, 77], note: 'Spärr vid Västra Storgatans början: tvingar horden att välja 57 sydost' },
      { kind: 'block', at: [-30, -25], note: 'Spärr på 57 sydost' },
      { kind: 'squad-house', at: [-12, 58], note: 'Villorna längs Barrstigen: korseld' },
      { kind: 'sniper', at: [190, 5], note: 'Radhustaken vid Dansbanestigen: ser Västra Storgatan och åkern' },
      { kind: 'mortar', at: [-20, 30], note: 'Granatkastarläge öster om Furulundsvägen (dag 13), mål rondellen och 57 västerut' },
      { kind: 'block', at: [300, 255], note: 'Västra Storgatan vid Vackerby: reträttens spärr mot stan' },
    ],
  },
};
