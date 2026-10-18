// Gnesta centrum: inställningar för scripts/osm-to-map.mjs (förhandsvisning, ingen spellogik).
// Koordinater här är plan.json-meter (x öster, y norr, origo ungefär vid Tingshuset) från
// ~/Projects/horde-refs/gnesta-centrum/plan.json. Underlaget: beskrivning.md, Commons-fotona och kommunens
// kulturmiljöanalys (2023) och planbeskrivning för Centrumkvarteret (2026), allt i samma mapp (aldrig i repot).
// Kartdata © OpenStreetMap contributors (ODbL).
//
// En stor karta i fyra delar (spelbara var för sig, senare en enda karta): A brandstationen och kommunhuskvarteret,
// B stationen och Storgatan, C Frejaskolan på höjden vid vattentornet, D hamnen vid Bryggeriholmen och Frösjöns strand.

// Kvarteren och deras karaktär (kulturmiljöanalysen): centrum 2-3 våningar i puts och tegel med butiker i
// bottenvåningen; stenstaden kring Stora torget 1890-1910 med tornhuvar; 1950-70-talens lamellhus längs Torggatan
// och Thulegatan; villastaden på Gnestahöjden i träpanel, ljusa kulörer eller rött, lertegeltak; Bryggeriholmen
// med 2000-talets flerbostadshus och bryggeriets tegelhus.
const inRect = (x, y, [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const CENTRE = [-480, 40, 150, 240];         // Storgatsbandet söder om spåret, ICA-sidan norr om det
const TORGET = [20, 95, 150, 150];           // Stora torget och Östra Storgatans stenstad
const HOLMEN = [240, 150, 360, 240];         // Bryggeriholmen
const SHOP_STREETS = new Set(['Västra Storgatan', 'Östra Storgatan', 'Stora Torget', 'Marieströmsgatan', 'Kullagatan']);

// Husens utseende per id där fotona säger något särskilt
const BY_ID = {
  165807616: { storeys: 4, facade: 'beige' },        // posthuset vid Strömmentorget (1969, fyra våningar, ljus)
  661267995: { storeys: 3, facade: 'beige' },
  165807629: { storeys: 2, facade: 'beige' },        // biblioteket
  54613725: { storeys: 3, facade: 'pink', roof: 'mansard' },
};

export default {
  place: 'gnesta-centrum',
  name: 'Gnesta centrum',
  out: 'src/data/gnesta-centrum.js',
  exportName: 'gnestaCentrum',
  version: '0.1.0',
  // Utsnittet: alla fyra punkterna med marginal (beskrivning.md: ca 800 x 650 m). Halv skala som de andra.
  crop: { x0: -480, x1: 405, y0: -350, y1: 305 },
  scale: 0.5,
  buildingScale: 0.58,
  // tät stad: husen står vid trottoaren, gångvägarna genom kvarteren viker för husen
  keep: { A: 2.5, B: 1.4, C: 1.1, D: 0.2, E: 0.1 },
  footwaysYield: true,
  serviceYield: true,
  neighbourPad: 0.5,
  seed: 1924,              // stadsplanen från 1924
  home: [-40, 150],        // Stora torget och stationen: mitten av triangeln
  view: 70,
  zoomMax: 480,
  stub: 10,
  paveFootways: true,
  // Villastaden: panel i ljusa kulörer eller rött, lertegeltak (kulturmiljöanalysen)
  facades: [['white', 28], ['yellow', 24], ['red', 14], ['beige', 10], ['grey', 8], ['blueGrey', 10], ['brick', 3]],
  roofs: [['tile', 55], ['black', 18], ['charcoal', 15], ['slate', 12]],
  lamps: { 'Västra Storgatan': 18, 'Östra Storgatan': 20, 'Torggatan': 24, 'Skolgatan': 26, 'Tingshusgatan': 26, 'Bryggargränd': 20, 'Stora Torget': 16 },
  faceStreets: ['Västra Storgatan', 'Östra Storgatan', 'Stora Torget', 'Torggatan'],
  curbs: ['Västra Storgatan', 'Östra Storgatan', 'Torggatan', 'Stora Torget', 'Marieströmsgatan', 'Kullagatan'],
  // gatulivet: kantstensparkering, gatuträd, bänkar och cykelställ (osm-world ritar det)
  streets: {
    'Västra Storgatan': { parking: 0.55, trees: 22, benches: 40, bikes: 60 },
    'Östra Storgatan': { parking: 0.45, trees: 26, benches: 50 },
    'Torggatan': { parking: 0.35, trees: 30 },
    'Stora Torget': { benches: 18, bikes: 30 },
    'Skolgatan': { parking: 0.2, trees: 34 },
    'Thulegatan': { parking: 0.25 },
    'Tingshusgatan': { parking: 0.15 },
  },
  landuse: { school: 'lawn', kindergarten: 'lawn', bicycle_parking: 'paved' },
  landuseByName: { 'Strömmentorget': 'square' },
  sizes: { townBlock: [[10, 22], [7, 11]], stenstad: [[11, 22], [8, 12]], shopBlock: [[9, 26], [7, 12]], holmenApt: [[12, 22], [8, 11]] },
  minSizes: { townBlock: [6.5, 5.5], shopBlock: [6.5, 5.5], stenstad: [7, 6], lamell: [10, 7], centrumhus: [9, 7] },
  attempts: 8,
  // centrum är tätt: där står husen i nästan verklig skala (0,52 mot avståndens 0,5) för att rymmas i kvarteren
  buildingScaleAt: c => (inRect(c.px, c.py, CENTRE) ? 0.53 : null),

  classify(c) {
    const { type, area, px, py } = c;
    if (inRect(px, py, HOLMEN) && type === 'apartments') return 'holmenApt';
    if (type === 'school') return 'school';
    if (type === 'sports_hall') return 'gymHall';
    if (type === 'kindergarten') return 'kindergarten';
    if (type === 'garage' || type === 'shed' || type === 'roof') return area > 60 ? 'commercial' : 'shed';
    if (inRect(px, py, TORGET) && area > 120) return 'stenstad';
    if (type === 'apartments') return area > 600 ? 'lamell' : (inRect(px, py, CENTRE) ? 'townBlock' : 'lamell');
    if (type === 'retail' && area > 800) return 'supermarket';
    if (inRect(px, py, CENTRE)) {
      if (area < 38) return 'shed';
      if (area > 650) return 'centrumhus';
      if (area > 110) return [...SHOP_STREETS].some(n => c.roadGap(n) < 14) ? 'shopBlock' : 'townBlock';
      return null;
    }
    if (type === 'yes' && area > 600) return 'lamell';
    return null;
  },
  style(o, c, r) {
    Object.assign(o, BY_ID[o.osm] ?? {});
    // butiker i bottenvåningen där huset står vid en affärsgata (framsidan vänds mot närmaste gata)
    const shopStreet = [...SHOP_STREETS].some(n => c.roadGap(n) < 6);
    if (['shopBlock', 'townBlock', 'stenstad', 'centrumhus', 'lamell'].includes(o.kind) && shopStreet) o.shop = true;
    if (o.kind === 'shopBlock' || o.kind === 'townBlock') {
      // två till tre våningar, puts i ljusa kulörer eller tegel; 1930-tal till 60-tal, några äldre trähus
      o.storeys ??= c.hReal >= 9 ? 3 : r() < 0.6 ? 2 : 3;
      o.facade ??= r.weighted?.([['ochre', 4], ['cream', 5], ['pink', 2], ['white', 3], ['brick', 4], ['grey', 2], ['yellowBrick', 2]]) ?? 'cream';
      o.roof ??= r() < 0.55 ? 'gable' : r() < 0.6 ? 'hip' : 'flat';
    }
    if (o.kind === 'stenstad') {
      o.storeys ??= 3; o.facade ??= r() < 0.5 ? 'cream' : 'pink'; o.roof ??= r() < 0.5 ? 'mansard' : 'hip';
      o.tower = o.osm === 501056262;
    }
    if (o.kind === 'lamell') { o.storeys ??= c.hReal >= 12 ? 3 : 2; o.facade ??= r() < 0.5 ? 'yellowBrick' : r() < 0.5 ? 'brick' : 'cream'; o.roof ??= r() < 0.6 ? 'gable' : 'flat'; }
    if (o.kind === 'centrumhus') { o.storeys ??= 2; o.facade ??= r() < 0.6 ? 'beige' : 'yellowBrick'; }
    if (o.kind === 'holmenApt') { o.storeys = 3; o.facade = ['white', 'red', 'yellow'][o.osm % 3]; }
  },

  // Landmärken: OSM-byggnad (id). kind väljer modell i gnesta-centrum-kit.js.
  landmarks: [
    { osm: 661267998, kind: 'fireStation', name: 'Brandstationen' },
    { osm: 661268000, kind: 'elektron', name: 'Elektron' },
    { osm: 165807610, kind: 'kommunhus', name: 'Kommunhuset' },
    { osm: 54612996, kind: 'gnestaStation', name: 'Gnesta station', front: [0, -1] },
    { osm: 501056262, kind: 'stenstad', name: 'Stora Hotellet' },
    { osm: 256601475, kind: 'tingshus', name: 'Tingshuset' },
    { osm: 509504680, kind: 'waterTower', name: 'Vattentornet' },
    { osm: 7412149, kind: 'school', name: 'Frejaskolan' },
    { osm: 509504683, kind: 'school', name: 'Frejaskolan (norra)' },
    { osm: 509504677, kind: 'gymHall', name: 'Frejahallen' },
    { osm: 256882586, kind: 'brewery', name: 'Bryggeriet' },
    { osm: 256609763, kind: 'holmenApt', name: 'Bryggeriholmen (hus 1)' },
    { osm: 256609764, kind: 'holmenApt', name: 'Bryggeriholmen (hus 2)' },
    { osm: 256609765, kind: 'holmenApt', name: 'Bryggeriholmen (hus 3)' },
    { osm: 165807629, kind: 'centrumhus', name: 'Biblioteket' },
    { osm: 165807616, kind: 'centrumhus', name: 'Posthuset' },
    { osm: 256882587, kind: 'redCottage', name: 'Banvaktsstugan' },
    { osm: 256637541, kind: 'redCottage', name: 'Frösjö Wärdshus' },
    { osm: 256645774, kind: 'supermarket', name: 'Livsmedelsbutiken vid torget' },
    { osm: 510000307, kind: 'supermarket', name: 'Stormarknaden' },
  ],
  // Saker som inte är byggnader i OSM: perrongerna vid stationen, bryggorna och båtarna i hamnen, statyn på torget.
  props: [
    { kind: 'platforms', free: true, at: [-30, 200], length: 80, name: 'Perrongerna' },
    { kind: 'pier', at: [168, 189], to: [171, 238], name: 'Brygga 1' },
    { kind: 'pier', at: [200, 195], to: [204, 236], name: 'Brygga 2' },
    { kind: 'pier', at: [250, 247], to: [252, 290], name: 'Brygga 3' },
    { kind: 'pier', at: [300, 231], to: [316, 268], name: 'Brygga 4' },
    { kind: 'bus', free: true, at: [36, 158], ry: 0.12, name: 'Bussen vid busstationen' },
    { kind: 'statue', free: true, at: [10, 112], name: 'Statyn på Stora torget' },
  ],
  labels: [
    { text: 'Brandstationen', at: [-296, 112] },
    { text: 'Elektron', at: [-361, 135] },
    { text: 'Kommunhuset', at: [-400, 195] },
    { text: 'Stationen', at: [-49, 172] },
    { text: 'Stora torget', at: [10, 100] },
    { text: 'Strömmentorget', at: [-128, 92] },
    { text: 'Tingshuset', at: [-19, -100] },
    { text: 'Vattentornet', at: [269, -125] },
    { text: 'Frejaskolan', at: [244, -280] },
    { text: 'Frejahallen', at: [196, -335] },
    { text: 'Bryggeriholmen', at: [300, 205] },
    { text: 'Småbåtshamnen', at: [205, 255] },
    { text: 'Frösjön', at: [60, 285] },
    { text: 'Västra stambanan', at: [-300, 268] },
  ],
  // Fyra delar, spelbara var för sig: gränser [x0, y0, x1, y1] och kamerahem i plan.json-meter.
  parts: [
    { id: 'a', key: '1', name: 'A · Brandstationen och kommunhuset', bounds: [-480, 50, -200, 305], home: [-330, 160], view: 64 },
    { id: 'b', key: '2', name: 'B · Stationen och Storgatan', bounds: [-210, -120, 150, 260], home: [-40, 130], view: 76 },
    { id: 'c', key: '3', name: 'C · Frejaskolan och vattentornet', bounds: [80, -350, 405, -40], home: [235, -195], view: 72 },
    { id: 'd', key: '4', name: 'D · Hamnen vid Bryggeriholmen', bounds: [110, 60, 405, 305], home: [240, 200], view: 62 },
  ],
  // Skisser ur beskrivning.md (inte spellogik): ingångar, basen, triangeln A-B-C med D bakom B, försvarslägen.
  sketch: {
    spawns: [
      { id: 'w', name: 'Västra Storgatan from the west', road: 'Västra Storgatan', at: [-640, 250], note: 'Från rondellen rakt mot A. Huvudvägen.' },
      { id: 'nw', name: 'Margretedalsvägen along the tracks', road: 'Margretedalsvägen', at: [-560, 420], note: 'Mariefredsvägen från NV längs spåret, in vid ICA mot A.' },
      { id: 'sw', name: 'Dagagatan through the villas', road: 'Dagagatan', at: [-580, -280], note: 'Genom villastaden mot Torggatan och C.' },
      { id: 's', name: 'Down from Gnestahöjden (night)', road: 'Tingshusgatan', at: [-50, -410], note: 'Natten: jägare ner från höjden.' },
      { id: 'e', name: 'Östra Storgatan from the south-east', road: 'Östra Storgatan', at: [486, -43], note: 'Längs sjöns utlopp mot stationen.' },
    ],
    base: { at: [-30, 150], name: 'Station: holds the retreat to D' },
    links: [
      { a: [-330, 150], b: [-30, 160], name: 'A-B Storgatan, the long fire lane' },
      { a: [-30, 160], b: [245, -195], name: 'B-C Tingshusgatan, uphill' },
      { a: [-330, 150], b: [245, -195], name: 'A-C through the villas' },
      { a: [-30, 160], b: [240, 210], name: 'B-D over Bryggargränd bridge' },
    ],
    defence: [
      { kind: 'point', name: 'A', at: [-330, 150], note: 'Brandstationen, Elektron och kommunhuset: ledningsplats' },
      { kind: 'point', name: 'B', at: [-30, 160], note: 'Stationen och Stora torget' },
      { kind: 'point', name: 'C', at: [245, -195], note: 'Frejaskolan och Frejahallen på höjden' },
      { kind: 'point', name: 'D', at: [240, 210], note: 'Småbåtshamnen, evakuering över sjön' },
      { kind: 'sniper', at: [269, -139], note: 'Vattentornet' },
      { kind: 'sniper', at: [62, 116], note: 'Stora Hotellets torn' },
      { kind: 'sniper', at: [-387, 177], note: 'Kommunhusets tak' },
      { kind: 'squad-house', at: [-165, 150], note: 'Centrumhusen längs Storgatan' },
      { kind: 'squad-house', at: [-49, 156], note: 'Stationshuset' },
      { kind: 'squad-house', at: [240, -171], note: 'Frejaskolans fönster mot Skolgatan' },
      { kind: 'mg', at: [-270, 150], note: 'Korseld vid Kullagatan' },
      { kind: 'mg', at: [-135, 150], note: 'Korseld vid Marieströmsgatan' },
      { kind: 'mg', at: [-123, 92], note: 'Strömmentorget mot Stora torget' },
      { kind: 'block', at: [140, -70], note: 'Spärr och tråd vid Skolgatan' },
      { kind: 'block', at: [258, 150], note: 'Bryggargränds bro' },
      { kind: 'block', at: [-75, 199], note: 'Gångtunneln vid stationen' },
      { kind: 'block', at: [187, 184], note: 'Gångbron' },
    ],
  },
};
