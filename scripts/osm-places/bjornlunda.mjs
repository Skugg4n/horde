// Björnlunda: inställningar för scripts/osm-to-map.mjs (förhandsvisning, ingen spellogik).
// Koordinater här är plan.json-meter (x öster, y norr, origo mitt i byn) från
// ~/Projects/horde-refs/bjornlunda/plan.json. Underlaget: beskrivning.md i samma mapp.
// Kartdata © OpenStreetMap contributors (ODbL).
export default {
  place: 'bjornlunda',
  name: 'Björnlunda',
  out: 'src/data/bjornlunda.js',
  exportName: 'bjornlunda',
  version: '0.2.0',
  // Utsnittet: bykärnan med Stationsvägen, Villavägen, Smedjevägen, Gästgivarevägen, ICA, gamla stationsläget,
  // järnvägen och väg 57/223 i öster. Pastorsexpeditionen (kyrkans roll) ryms i sydväst.
  crop: { x0: -310, x1: 250, y0: -330, y1: 345 },
  scale: 0.5,           // avstånden: halv verklig skala, som Gnesta och Mölnbo
  buildingScale: 0.72,  // husen krymps mindre än avstånden så att de läses bredvid zombierna
  seed: 1953,
  // Östra sidan av väg 57/223 hör till spelytan (norra ingången går förbi där, åkrarna ger lång sikt), men som en
  // lugn landsbygdskant: åker, gårdar och grusvägar. Gränsen följer riksvägen 16 m öster om den, sedan norr om väg 57.
  rural: [{ name: 'Östra kanten', poly: [[-54, 377.5], [132, 7.5], [250, -228.5], [570, -228.5], [570, 607.5], [-54, 607.5]] }],
  // Hur villorna ser ut: 1950- till 70-tal, faluröda, gula och vita, några ljusa putsade och tegel.
  facades: [['red', 30], ['yellow', 24], ['white', 24], ['beige', 7], ['grey', 5], ['brick', 6], ['blueGrey', 4]],
  roofs: [['black', 30], ['charcoal', 20], ['tile', 35], ['slate', 15]],
  // Gatlyktor (steg i meter i spelet) och kantsten per gata.
  lamps: { 'Stationsvägen': 22, 'Villavägen': 26, 'Smedjevägen': 30, 'Gästgivarevägen': 24 },
  curbs: ['Stationsvägen', 'Gästgivarevägen'],
  // Landmärken: OSM-byggnad (id). kind väljer modell i bjornlunda-kit.js; front: framsidans riktning i planen (annars mot gatan).
  landmarks: [
    { osm: 255752724, kind: 'ica', name: 'ICA Nära Jarbells', front: [1, 0] },   // entrén mot parkeringen i öster
    { osm: 255752678, kind: 'yellowBlock', name: 'Gula huset vid Stationsvägen', h: 10.5 },
    { osm: 255752681, kind: 'wattHall', name: 'Wattrangsborg' },
    { osm: 255752680, kind: 'wattWing', name: 'Wattrangsborg' },
    { osm: 255752718, kind: 'sternersborg', name: 'Sternersborgs choklad' },
    { osm: 255752695, kind: 'sparbank', name: 'Daga härads sparbank (antaget läge)' },
    { osm: 255752742, kind: 'pastor', name: 'Pastorsexpeditionen' },
  ],
  // Saker som inte är byggnader i OSM: gamla stationsläget, busshållplatsen, plankorsningen.
  props: [
    { kind: 'oldStation', at: [-300, -51], name: 'Björnlunda (gamla stationen)' },
    { kind: 'busStop', at: [-36, -196], name: 'Busshållplatsen' },
    { kind: 'levelCrossing', at: [-201, -117], name: 'Plankorsningen vid Ekvägen' },
  ],
  labels: [
    { text: 'ICA', at: [-73, -100] },
    { text: 'Wattrangsborg', at: [150, -205] },
    { text: 'Plankorsningen', at: [-215, -140] },
    { text: 'Gamla stationen', at: [-300, -30] },
    { text: 'Västra stambanan', at: [60, -330] },
  ],
  // Skisser ur beskrivning.md (inte spellogik): ingångar i dimkanten, basen och försvarslägen.
  // road: gatans namn eller ref; at: en punkt i plan.json nära den yttre änden.
  sketch: {
    spawns: [
      // field: ingen väg ut i dimman; horden går rakt över åkern från den punkten till gatans ände
      { id: 'w', name: 'From the west, over the field', road: 'Stationsvägen', at: [-267, 268], field: [-430, 235], note: 'Kampanjens riktning från grustaget. Lång synlig anmarsch över åkern, sedan Kvarnvägen in i villorna.' },
      { id: 'sw', name: 'Level crossing at Ekvägen', road: 'Ekvägen', at: [-281, -556], note: 'Ur skogen söder om spåret, över plankorsningen, ut på Stationsvägen vid ICA. Farligast för konvojen.' },
      { id: 'n', name: 'Road 57/223 from the north', road: '57;223', at: [-527, 558], note: 'Via Korsbacksvägen och Stationsvägens norra ände.' },
      { id: 's', name: 'Over the 223 bridge from the south', road: '223', at: [187, -561], note: 'Mot Wattrangsborg och Stationsvägens södra utfart, där konvojen ska ut.' },
    ],
    base: { at: [-60, -150], name: 'ICA parking, convoy loading' },
    defence: [
      { kind: 'base-alt', at: [150, -235], note: 'Wattrangsborg, alternativ bas närmare utfarten' },
      { kind: 'sniper', at: [-73, -118], note: 'ICA-taket: ser plankorsningen och Stationsvägen söderut' },
      { kind: 'sniper', at: [-29, -156], note: 'Gula trevåningshuset vid Stationsvägen' },
      { kind: 'squad-house', at: [-150, -45], note: 'Villorna vid Stationsvägen/Gästgivarevägen: eldgata norrut' },
      { kind: 'squad-house', at: [-185, 0], note: 'Villorna på västra sidan av Stationsvägen' },
      { kind: 'mg', at: [-175, -70], note: 'Kulspruta vid Gästgivarevägens/gångvägens mynning mot Stationsvägen' },
      { kind: 'mg', at: [40, -10], note: 'Kulspruta i hus vid Gästgivarevägen/Villavägen: korseld' },
      { kind: 'block', at: [-201, -117], note: 'Spärr och taggtråd vid plankorsningen' },
      { kind: 'block', at: [-45, -125], note: 'Bilar på ICA-parkeringen' },
    ],
  },
};
