// Västerkärv (en gård sydväst om Gnesta): inställningar för scripts/osm-to-map.mjs (förhandsvisning, ingen spellogik).
// Koordinater här är plan.json-meter (x öster, y norr, origo mitt i rutan, 59.0425 N 17.285 E) från
// ~/Projects/horde-refs/vasterkarv/plan.json. Underlaget: beskrivning.md i samma mapp (aldrig i repot).
// Gården hålls anonym: inga ägarnamn, bara generiska namn (Gården, Ladan, Grannens gård).
// Kartdata © OpenStreetMap contributors (ODbL).
//
// Platsen i kampanjen (docs/superpowers/specs/2026-10-18-kampanjplan.md avsnitt 10): dag 14, "Zombier via småvägar.
// Civila, någon Ksp, en EPA. Stigar och specialregler för den här kartan." Horden kommer inte längs en huvudväg utan
// via småvägar och stigar ur väster och sydväst (skogsvägen, traktorspåret över åkern, den södra skogsvägen) och
// vill mot Gnesta: ut österut längs grusvägen mot väg 57 eller norrut längs grusvägen mot Kärvsvägen och västra
// rondellen.
//
// BASEN (Olas fråga om grinden och grannen är öppen; detta är ett förslag att byta): boningshuset 867826786 på
// gårdens västra sida. Skälet: (1) det är gårdens enda tvåvåningshus med vind, så garnisonen och prickskytten ser
// åkern åt väster och sydväst, alltså åt hållet där småvägarna kommer in; (2) gårdsplanen (20 till 30 m) mellan huset
// och ladan är sista linjen, och ladans gavel ger korseld över den; (3) grusvägen går i en båge precis norr om huset,
// så eskorten kommer ut åt både öster och norr utan att passera horden; (4) civila och något att försvara finns redan
// där (huset, ladan, dieseln, traktorn). Grannens gård i sydost är resursen (maskinhall, diesel) och ett vilande hot.
// Ladan är andra position med utsikt över grusvägen norrut och grannens gård.

// Hus som OSM saknar: OSM är nästan komplett här. Läge och storlek avlästa ur Olas Google-skärmbild (satellit.jpg,
// passad mot OSM:s hus, medelfel några meter): ett gammalt uthus väster om grannens bostadshus och ett litet skjul
// vid ridbanan. Bara läge och storlek, aldrig bilden. Rektanglar i plan.json-meter.
const ADDED = [
    { id: 900000001, h: 4.2, pts: [[100.5,-77.5],[112.0,-74.0],[114.5,-83.0],[103.0,-86.5]] },
    { id: 900000002, h: 2.8, pts: [[201.5,-116.5],[206.5,-116.5],[206.5,-121.5],[201.5,-121.5]] },
];

// Stengärdsgårdar längs åkrarnas gränser (satellitbildens raka fältkanter och OSM:s markpolygoner), som linjer i
// plan.json-meter. Varje led blir en rad av stenar i byggsatsen.
const WALLS = [
  [[-98, -8], [-60, -22], [-20, -37], [18, -49]],            // sydvästra åkerns nordöstra kant, ned mot betesmarken
  [[92, 28], [128, 50], [170, 80], [226, 127]],               // åkerkanten öster om gårdsplanen upp mot grusvägen
  [[-190, -99], [-150, -103], [-117, -107]],                  // skogsbrynet i sydväst, åkerns norra kant
  [[-62, 160], [-30, 150], [8, 128], [34, 120]],              // åkern norr om gården, mot stenrösena
  [[16, 18], [0, 12], [-22, 20], [-33, 33]],                  // hagen sydväst om gårdsplanen
];
const wallProps = WALLS.flatMap((w, k) => w.slice(1).map((q, i) => ({ kind: 'stoneWall', name: `Stengärdsgård ${k + 1}`, at: w[i], to: q })));

export default {
  place: 'vasterkarv',
  name: 'Västerkärv',
  out: 'src/data/vasterkarv.js',
  exportName: 'vasterkarv',
  version: '0.1.0',
  // Utsnittet: gården i mitten, åkrarna och skogsbrynen i väster och sydväst där småvägarna kommer in, grannens gård
  // i sydost och grusvägens båge norrut. Ca 315 x 290 m, halv skala som de andra.
  crop: { x0: -310, x1: 320, y0: -290, y1: 290 },
  scale: 0.5,
  buildingScale: 0.72,
  seed: 4171,
  home: [0, 35],
  view: 96,
  zoomMax: 380,
  // Hela utsnittet är landsbygd: grusvägar i två bredder med dike, inga gångstigar, åker under allt annat.
  rural: [{ name: 'Landet', poly: [[-420, -400], [440, -400], [440, 420], [-420, 420]] }],
  stub: 4,
  keep: { C: 0.8 },   // grusvägens båge går tätt förbi boningshuset (4 m från väggen till mittlinjen)
  noPois: true,   // OSM:s platsnamn pekar ut gården
  // Falurött och gult trä; svart plåt och tegel. (Husen här är landmärken och lantbruksbyggnader, men grannens
  // bostadshus tar villareglerna om OSM ger dem som bostäder.)
  facades: [['red', 50], ['yellow', 22], ['white', 22], ['grey', 6]],
  roofs: [['black', 40], ['tile', 34], ['charcoal', 16], ['slate', 10]],
  extraBuildings: ADDED,
  // Landsbygdens lantbruksbyggnader efter läge och storlek. Gården: boningshus, lada och uthus (landmärkena nedan);
  // grannen: stor ladugård och maskinhall; tredje husgruppen i söder: en större ladugård.
  classify: c => {
    if (c.area > 600 && c.px > 100) return 'ladugard';
    if (c.area > 280 && c.py < -250) return 'ladugard';
    if (c.area > 280 && c.px > 150 && c.py < -100) return 'maskinhall';
    return null;
  },
  sizes: {
    gard: [[8, 11], [6, 8.4]], ladan: [[14, 30], [6, 10]], uthus: [[3, 8], [3, 7]],
    ladugard: [[20, 34], [10, 15]], maskinhall: [[14, 28], [9, 15]],
  },
  minSizes: { gard: [7, 5.5], ladan: [12, 5], uthus: [3, 3], ladugard: [14, 8], maskinhall: [12, 8] },
  // Landmärkena: framsidan (plan-riktning) mot det som husen vetter åt. Satellitbilden: boningshuset mot gårdsplanen i
  // sydost, ladan mot gårdsplanen i söder, grannens ladugård och maskinhall öppna mot sin grusplan i söder.
  landmarks: [
    { osm: 867826786, kind: 'gard', name: 'Boningshuset', front: [1, -0.7], h: 7.2 },
    { osm: 867826784, kind: 'ladan', name: 'Ladan', front: [0.1, -1], h: 5.2 },
    { osm: 867826785, kind: 'uthus', name: 'Uthuset', front: [0.4, 1] },
    { osm: 867826783, kind: 'uthus', name: 'Redskapsboden', front: [-0.3, -1] },
    { osm: 867826780, kind: 'ladugard', name: 'Grannens ladugård', front: [0, -1], h: 8.5 },
    { osm: 867826770, kind: 'maskinhall', name: 'Grannens maskinhall', front: [0, -1], h: 6.2 },
  ],
  // Grusvägarna saknar namn i OSM; de får generiska namn (spawns och utgångar hänvisar till dem).
  roadNames: [
    { at: [-95, -290], name: 'Södra skogsvägen' },
    { at: [0, -290], name: 'Södra grusvägen' },
    { at: [60, -190], name: 'Södra grusvägen' },
    { at: [250, -90], name: 'Östra grusvägen' },
    { at: [-56, 150], name: 'Grusvägen' },
  ],
  // Småvägarna ur väster och sydväst saknas i OSM (satellitbilden visar fårade spår över åkern och en stig längs
  // skogsbrynet): skogsvägen från väster som möter grusvägen nordväst om gården, traktorspåret över sydvästra åkern
  // fram till gårdsplanens södra grind, och gårdsstigen från gårdsplanen mot grannen. Antagna linjer, avlästa i
  // grova drag.
  extraRoads: [
    { name: 'Skogsvägen', type: 'track', cls: 'D', width: 3, surface: 'gravel', pts: [[-352, 108], [-300, 108], [-250, 106], [-205, 111], [-160, 118], [-110, 120], [-80, 122], [-59, 123]] },
    { name: 'Traktorspåret', type: 'track', cls: 'D', width: 3, surface: 'gravel', pts: [[-352, -128], [-300, -118], [-250, -110], [-200, -103], [-150, -102], [-105, -98], [-70, -70], [-42, -38], [-20, -8], [-8, 18], [-0.2, 34.8]] },
    { name: 'Gårdsstigen', type: 'track', cls: 'D', width: 3, surface: 'gravel', pts: [[4.4, 38.9], [14, 22], [36, -16], [62, -42], [80, -60], [96, -70]] },
  ],
  // Ridbanan (satellitbilden): grusplan vid grannens gård.
  extraGround: {
    gravel: [[[203, -96], [241, -94], [242, -113], [202, -115]]],
  },
  lamps: {},
  labels: [
    { text: 'Gården', at: [10, 62] },
    { text: 'Gårdsplanen', at: [14, 28] },
    { text: 'Åkern i sydväst', at: [-110, -45] },
    { text: 'Skogsbrynet', at: [-135, -50] },
    { text: 'Grusvägens båge', at: [-18, 82] },
    { text: 'Grannens gård', at: [160, -95] },
    { text: 'Ridbanan', at: [222, -105] },
    { text: 'Stenrösena', at: [5, 150] },
    { text: 'Södra husgruppen', at: [-15, -230] },
  ],
  props: [
    ...wallProps,
    // saker på gården (satellitbilden): traktorn på grusvägens båge, dieseltanken vid ladan, halmbalar på hagen
    { kind: 'tractor', free: true, at: [-3, 69], ry: 0.15, name: 'Traktorn' },
    { kind: 'dieselTank', free: true, at: [48, 52], ry: 0, name: 'Dieseltanken' },
    { kind: 'balePile', free: true, at: [62, 63], ry: 0.3, name: 'Halmbalarna', n: 9 },
    { kind: 'balePile', free: true, at: [118, -20], ry: 0.1, name: 'Halmbalar, grannen', n: 6 },
    { kind: 'machine', free: true, at: [218, -138], ry: 2.6, name: 'Grannens upplag' },
    { kind: 'fieldGate', free: true, at: [-6, 26], ry: 1.0, name: 'Grinden mot traktorspåret' },
    { kind: 'cairn', free: true, at: [0, 136], ry: 0, name: 'Stenröse' },
    { kind: 'cairn', free: true, at: [80, 173], ry: 0, name: 'Stenröse' },
    { kind: 'cairn', free: true, at: [-25, 175], ry: 0, name: 'Stenröse' },
  ],
  // Skisser ur beskrivning.md (inte spellogik): ingångarna i väster och sydväst, utgångarna österut och norrut, basen
  // och försvarslägena.
  sketch: {
    spawns: [
      { id: 'w', name: 'Skogsvägen from the west', road: 'Skogsvägen', at: [-352, 108], note: 'Småvägen ur skogen i väster; möter grusvägen 70 m nordväst om gården. Horden kommer i en tunn rad, bakom träden.' },
      { id: 'sw', name: 'Tractor track from the south-west', road: 'Traktorspåret', at: [-352, -128], note: 'Fårat spår över åkern: helt öppet, horden syns 200 m bort men har inget som bromsar den. Slutar vid gårdsplanens södra grind.' },
      { id: 's', name: 'South forest road', road: 'Södra skogsvägen', at: [-108, -295], note: 'Ur skogen i söder, förbi den södra husgruppen och grannens gård; når gården längs grusvägen från sydost.' },
    ],
    exits: [
      { id: 'e', name: 'East gravel road towards road 57 and Gnesta', road: 'Östra grusvägen', at: [391, -12], note: 'Konvojens väg: ut förbi grannens gård och vidare mot väg 57 och Gnesta.' },
      { id: 'n', name: 'Gravel road north to Kärvsvägen', road: 'Grusvägen', at: [118, 317], note: 'Grinden ligger där grusvägen möter Kärvsvägen (ca 300 m). Vidare till västra rondellen.' },
    ],
    base: { at: [-16, 43], name: 'Farmhouse: the base' },
    links: [
      { a: [-16, 43], b: [24, 46], name: 'The yard between house and barn' },
      { a: [-16, 43], b: [-6, 26], name: 'The south gate to the field' },
    ],
    defence: [
      { kind: 'point', name: '1', at: [-6, 26], note: 'Grinden mot åkern i sydväst: traktorspåret slutar här, dödszon för den som står i övervåningen' },
      { kind: 'point', name: '2', at: [-16, 43], note: 'Basen: boningshuset, garnison i övervåningen ser åkern åt väster och söder' },
      { kind: 'point', name: '3', at: [24, 46], note: 'Ladan: andra position, ser grusvägen norrut och grannens gård' },
      { kind: 'sniper', at: [-18, 44], note: 'Jaktgevär i boningshusets vindsfönster' },
      { kind: 'squad-house', at: [24, 46], note: 'Ladans gavel: korseld över gårdsplanen' },
      { kind: 'mg', at: [10, 30], note: 'Gårdsplanens södra kant: korseld mellan huset och ladan' },
      { kind: 'block', at: [-3, 69], note: 'Traktorn och halmbalar spärrar grusvägens båge norr om gården' },
      { kind: 'block', at: [-59, 123], note: 'Där skogsvägen möter grusvägen: spärr som tvingar horden över diket' },
      { kind: 'block', at: [96, -70], note: 'Gårdsstigen vid grannens gård' },
      { kind: 'point', name: 'D', at: [58, 50], note: 'Dieseln som brand (strategiskt djup 3,7) på grusvägens båge i 40 s' },
    ],
  },
};
