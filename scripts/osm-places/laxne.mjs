// Laxne: inställningar för scripts/osm-to-map.mjs (förhandsvisning, ingen spellogik).
// Koordinater här är plan.json-meter (x öster, y norr, origo mitt i rutan, 59.165 N 17.190 E) från
// ~/Projects/horde-refs/laxne/plan.json. Underlaget: beskrivning.md i samma mapp (aldrig i repot).
// Kartdata © OpenStreetMap contributors (ODbL).
//
// Olas beslut (2026-10-18): horden kommer från norr längs väg 223 (Laxnevägen från Mariefred) och vill söderut mot
// Gnesta via Björnlunda. Tills Ola svarat på de öppna frågorna gäller: båda utgångarna söderut är öppna (223 förbi
// skolan och Hebyvägen åt sydost), skolan är sista försvarspunkten, och byn kompletteras med hus som OSM saknar.
// Sjön Klämmingen är en flank i öster som inget går över (vägnätet slutar vid stranden).

// Hus som OSM saknar (OSM har 71). Läge och storlek är avlästa ur Olas skärmbild av Google Maps (karta.jpg, husen som
// grå rutor) efter att bilden passats mot OSM:s vägar och hus (medelfel under 2 m), ett hus ur satellitbilden.
// Bara läge och storlek, aldrig bilden. Rektanglar i plan.json-meter; små blir bodar, de andra villor.
const ADDED = [
    { id: 900000001, pts: [[-109.0,344.0],[-116.5,338.5],[-110.5,331.0],[-103.0,337.0]] },
    { id: 900000002, pts: [[-61.5,330.5],[-51.0,318.5],[-43.0,325.5],[-54.0,337.5]] },
    { id: 900000003, pts: [[-113.0,328.0],[-101.0,311.5],[-90.0,319.0],[-102.0,335.5]] },
    { id: 900000004, pts: [[-44.0,314.5],[-34.5,303.0],[-27.0,309.0],[-36.5,320.5]] },
    { id: 900000005, pts: [[-33.0,287.5],[-18.5,276.5],[-12.5,285.0],[-26.5,296.0]] },
    { id: 900000006, pts: [[-46.0,285.5],[-40.5,280.0],[-34.0,286.5],[-39.5,292.0]] },
    { id: 900000007, pts: [[-97.5,269.5],[-84.5,275.0],[-90.5,289.0],[-103.0,284.0]] },
    { id: 900000008, pts: [[-89.5,259.0],[-85.5,250.5],[-77.0,254.5],[-81.5,263.0]] },
    { id: 900000009, pts: [[-11.5,254.5],[-19.5,252.0],[-17.0,245.0],[-9.5,247.0]] },
    { id: 900000010, pts: [[-144.5,245.5],[-138.5,236.5],[-130.5,242.0],[-136.5,251.0]] },
    { id: 900000011, pts: [[-53.0,237.5],[-58.5,246.5],[-69.0,240.5],[-64.0,231.5]] },
    { id: 900000012, pts: [[-164.0,238.5],[-169.5,232.5],[-167.0,230.0],[-161.0,235.5]] },
    { id: 900000013, pts: [[-261.5,222.5],[-256.0,213.5],[-252.5,215.5],[-257.5,224.5]] },
    { id: 900000014, pts: [[-95.0,208.0],[-89.0,196.5],[-80.5,201.0],[-86.0,212.0]] },
    { id: 900000015, pts: [[-50.0,212.0],[-49.0,202.5],[-44.5,203.0],[-45.0,212.0]] },
    { id: 900000016, pts: [[-82.0,193.5],[-78.0,197.5],[-82.0,201.5],[-86.0,197.5]] },
    { id: 900000017, pts: [[-159.0,176.5],[-163.0,186.0],[-171.0,182.5],[-167.0,173.0]] },
    { id: 900000018, pts: [[-232.0,179.5],[-224.0,168.0],[-218.5,172.0],[-226.5,183.0]] },
    { id: 900000019, pts: [[-208.5,132.5],[-202.5,141.5],[-208.0,145.0],[-214.0,136.0]] },
    { id: 900000020, pts: [[-220.5,92.0],[-226.5,94.5],[-228.5,89.0],[-222.5,87.0]] },
    { id: 900000021, pts: [[-233.5,73.5],[-219.5,59.0],[-210.5,68.0],[-224.0,82.5]] },
    { id: 900000022, pts: [[-254.0,58.5],[-251.0,51.5],[-245.5,53.5],[-248.5,60.5]] },
    { id: 900000023, pts: [[-385.0,38.0],[-374.5,41.5],[-376.0,45.5],[-386.5,42.0]] },
    { id: 900000024, pts: [[-137.5,42.0],[-146.0,38.5],[-144.5,33.5],[-135.5,36.5]] },
    { id: 900000025, pts: [[-338.0,21.5],[-332.0,15.0],[-329.0,17.5],[-335.0,24.0]] },
    { id: 900000026, pts: [[-115.5,14.5],[-110.5,0.0],[-104.0,2.5],[-109.0,17.0]] },
    { id: 900000027, pts: [[-335.5,9.0],[-333.5,1.5],[-329.5,2.5],[-331.5,10.0]] },
    { id: 900000028, pts: [[-353.5,-10.0],[-347.5,-8.0],[-349.0,-2.5],[-355.5,-4.5]] },
    { id: 900000029, pts: [[-44.5,-70.5],[-48.0,-65.0],[-54.0,-68.5],[-50.5,-74.0]] },
    { id: 900000030, pts: [[215.0,-79.0],[203.5,-71.5],[199.0,-78.0],[210.5,-85.5]] },
    { id: 900000031, pts: [[-232.0,-92.0],[-225.5,-88.0],[-230.0,-80.5],[-236.5,-84.5]] },
    { id: 900000032, pts: [[227.0,-97.5],[234.5,-104.5],[241.0,-98.0],[234.0,-91.0]] },
    { id: 900000033, pts: [[48.0,-168.5],[53.5,-163.0],[48.5,-158.0],[42.5,-163.5]] },
    { id: 900000034, pts: [[53.5,-179.5],[62.0,-171.0],[57.5,-166.0],[49.0,-174.5]] },
    { id: 900000035, pts: [[-152.0,-184.0],[-162.0,-184.0],[-162.0,-192.5],[-152.0,-192.5]] },
    { id: 900000036, pts: [[-157.5,-205.5],[-150.0,-204.5],[-150.5,-199.5],[-158.0,-200.5]] },
    { id: 900000037, pts: [[-327.0,-223.0],[-316.0,-225.5],[-314.5,-218.5],[-325.5,-216.0]] },
    { id: 900000038, pts: [[-332.0,-230.0],[-335.5,-222.5],[-341.0,-225.0],[-337.0,-232.5]] },
    { id: 900000039, pts: [[-298.5,-308.0],[-296.5,-314.5],[-290.5,-312.5],[-292.5,-306.0]] },
    { id: 900000040, pts: [[201.0,-331.5],[199.5,-320.0],[192.5,-320.5],[193.5,-332.5]] },
    { id: 900000041, pts: [[-335.0,-358.5],[-323.0,-358.5],[-323.0,-354.0],[-335.0,-354.0]] },
    { id: 900000042, pts: [[-238,193],[-228,193],[-228,201],[-238,201]] },   // bara i satellitbilden
];

export default {
  place: 'laxne',
  name: 'Laxne',
  out: 'src/data/laxne.js',
  exportName: 'laxne',
  version: '0.1.0',
  // Utsnittet: från bussvändslingan och Skottvångsvägen i norr (remsan mellan skog och sjö) ner till Laxne skola och
  // Hebyvägens början i söder; sjön tar östra kanten. Ca 700 x 1070 m, halv skala som de andra.
  crop: { x0: -430, x1: 270, y0: -470, y1: 600 },
  scale: 0.5,
  buildingScale: 0.72,
  seed: 1886,
  home: [-90, 40],          // gaffeln 223/Hebyvägen och villorna norr om den
  view: 84,
  zoomMax: 320,
  // Röda och gula trähus på stora tomter, några vita; lertegel och svart plåt.
  facades: [['red', 40], ['yellow', 24], ['white', 20], ['beige', 6], ['grey', 4], ['blueGrey', 6]],
  roofs: [['tile', 40], ['black', 30], ['charcoal', 18], ['slate', 12]],
  lamps: { 'Laxnevägen': 30 },
  extraBuildings: ADDED,
  // Badstranden är sand utan lekplats; skolans tomt gräs.
  landuse: { beach: 'beach', school: 'lawn' },
  // De långa husen vid 223 i norr och vid åkern i väster är ladugårdar och uthus (satellitbilden), inte längor.
  classify: c => (c.area > 280 && (c.py > 200 || c.px < -250) ? 'barn' : null),
  // Vägen från nordväst som möter 223 vid hållplatserna Skottvångsvägen saknar namn i OSM; hållplatsen ger det.
  roadNames: [{ at: [-400, 640], name: 'Skottvångsvägen' }],
  // Bollplanen: grusplanen vid stranden (satellitbilden), bussens hållplats Laxne Bollplan ligger vid Hebyvägen nedanför.
  extraGround: { gravel: [[[35, 44], [70, 39], [67, -2], [30, 2]]] },
  landmarks: [
    { osm: 529544672, kind: 'laxneSchool', name: 'Laxne skola' },
    { osm: 529544710, kind: 'laxnegarden', name: 'Laxnegården' },
    // Fjäderfabriken: OSM har bara hållplatserna. Antaget läge: den långa byggnaden vid 223-hörnet (Laxne loppis i Google).
    { osm: 529544718, kind: 'fjaderfabriken', name: 'Fjäderfabriken (antaget läge)' },
  ],
  props: [
    { kind: 'pier', at: [100, 65], to: [114, 81], name: 'Bryggan vid badplatsen' },
    { kind: 'pier', at: [161, 15], to: [176, 25], name: 'Brygga 2' },
    { kind: 'pier', at: [179, -20], to: [189, -13], name: 'Brygga 3' },
    // målen i planens kortändar (planen går nord-syd); ry i spelets ram, nätet bakåt
    { kind: 'goal', free: true, at: [52, 39], ry: 0, name: 'Målet (norr)' },
    { kind: 'goal', free: true, at: [49, 4], ry: Math.PI, name: 'Målet (söder)' },
    { kind: 'busStop', at: [-337, -303], name: 'Laxne skola (buss)' },
    { kind: 'busStop', at: [-208, -126], name: 'Fjäderfabriken (buss)' },
    { kind: 'busStop', at: [16, -98], name: 'Laxne Bollplan (buss)' },
    { kind: 'busStop', at: [-74, 198], name: 'Laxne (buss)' },
  ],
  labels: [
    { text: 'Laxne skola', at: [-212, -425] },
    { text: 'Laxnegården', at: [-103, 120] },
    { text: 'Laxne Bollplan', at: [50, 52] },
    { text: 'Badplatsen', at: [70, 90] },
    { text: 'Fjäderfabriken', at: [-147, -50] },
    { text: 'Klämmingen', at: [150, 300] },
    { text: 'Spårbacken', at: [208, -285] },
  ],
  // Skisser ur beskrivning.md (inte spellogik): ingångarna i norr, utgångarna söderut, basen och försvarslägena.
  sketch: {
    spawns: [
      { id: 'n', name: 'Road 223 from Mariefred', road: 'Laxnevägen', at: [-279, 683], note: 'Huvudvägen. Horden i en lång rad i remsan mellan skog och sjö; man ser den långt före centrum.' },
      { id: 'nw', name: 'Skottvångsvägen from the north-west', road: 'Skottvångsvägen', at: [-625, 728], note: 'Ur skogen, mynnar i 223 vid hållplatserna. Samma remsa, ett andra flöde.' },
    ],
    exits: [
      { id: 's', name: 'Road 223 south, past the school', road: '223', at: [-508, -703], note: 'Mot Björnlunda och vidare mot Gnesta. Konvojens väg.' },
      { id: 'se', name: 'Hebyvägen south-east', road: 'Hebyvägen', at: [601, -774], note: 'Längs sjön in i skogen. Andra utgången, öppen tills Ola säger annat.' },
    ],
    base: { at: [-240, -350], name: 'Laxne skola: the last stand' },
    links: [
      { a: [-215, 470], b: [-39, -7], name: 'The strip to the fork' },
      { a: [-39, -7], b: [-240, -350], name: 'The fork to the school' },
    ],
    defence: [
      { kind: 'point', name: '1', at: [-215, 470], note: 'Remsan: 223 mellan skogen och sjön, första eldfältet' },
      { kind: 'point', name: '2', at: [-39, -7], note: 'Gaffeln 223/Hebyvägen: avgör vilken utgång horden pressar mot' },
      { kind: 'point', name: '3', at: [-240, -350], note: 'Skolan: sista bastionen och konvojens lastplats' },
      { kind: 'mg', at: [-185, 400], note: 'Kulspruta vid husen norr om Uppvägen: längs 223 norrut' },
      { kind: 'squad-house', at: [-168, 296], note: 'De långa husen vid 223 i norr: korseld över remsan' },
      { kind: 'squad-house', at: [-103, 102], note: 'Laxnegården: ser norrut längs Laxnevägen' },
      { kind: 'squad-house', at: [-67, 60], note: 'Villorna längs 223 norr om gaffeln' },
      { kind: 'block', at: [0, -40], note: 'Bil eller spärr vid Hebyvägens avfart: styr horden mot ett håll' },
      { kind: 'mg', at: [50, 20], note: 'Bollplanen: samlingsplats, öppet skottfält mot gaffeln' },
      { kind: 'squad-house', at: [-147, -71], note: 'Fjäderfabriken (antaget läge) vid 223 mellan gaffeln och skolan' },
      { kind: 'sniper', at: [-212, -391], note: 'Skolans tak' },
      { kind: 'block', at: [-300, -250], note: 'Laxnetopsvägen: bakvägen in mot skolan' },
      { kind: 'block', at: [125, -215], note: 'Hebyvägen vid Spårbacksvägen' },
    ],
  },
};
