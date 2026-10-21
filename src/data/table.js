// Kartbordet (0.21.0, docs/superpowers/specs/2026-10-19-kartbordet-bygge.md): data som bordet ritar efter.
// Geografin är mockupens (docs/mockups/kontrollrum-3.html): ungefärliga lägen efter koordinater, inte Lantmäteriets
// karta. Allt här är bild; reglerna bor i src/meta/operation.js och src/meta/table.js.

// ---------- bordets mått (designrummet; bordet skalas till fönstret i src/ui/table.js) ----------
export const TABLE_W = 1440, TABLE_H = 900;

// ---------- kartan: longitud/latitud till kartbladets bildpunkter (innerytan 860 x 580) ----------
export const MAP_W = 860, MAP_H = 580;
const LON0 = 16.35, LAT0 = 59.28, KX = MAP_W / 1.6, KY = KX * 1.942;
export const gx = lon => (lon - LON0) * KX;
export const gy = lat => (LAT0 - lat) * KY;

export const PLACES = {
  sodertalje: [17.63, 59.196], jarna: [17.567, 59.093], molnbo: [17.418, 59.048], gnesta: [17.311, 59.049],
  bjornlunda: [17.163, 59.071], laxne: [17.10, 59.122], nykoping: [17.007, 58.753], trosa: [17.55, 58.897],
  flen: [16.588, 59.058], mariefred: [17.22, 59.262], vagnharad: [17.49, 58.946], lastringe: [17.36, 58.862],
  hagstumosse: [17.33, 59.054], stjarnhov: [16.99, 59.075],
};
export const SEA = [[17.64, 59.19], [17.68, 59.15], [17.66, 59.08], [17.72, 59.02], [17.78, 59.06], [17.80, 59.14], [17.86, 59.17], [17.96, 59.15], [17.96, 58.70], [16.98, 58.70], [17.05, 58.745], [17.12, 58.772], [17.25, 58.80], [17.35, 58.832], [17.45, 58.865], [17.55, 58.888], [17.62, 58.93], [17.70, 58.985], [17.67, 59.05], [17.62, 59.12]];
export const MALAREN = [[16.95, 59.30], [17.05, 59.262], [17.15, 59.268], [17.22, 59.256], [17.30, 59.252], [17.42, 59.246], [17.52, 59.232], [17.60, 59.214], [17.635, 59.204], [17.66, 59.222], [17.72, 59.252], [17.80, 59.30]];
// label: false = sjön ritas utan namn (för liten)
export const LAKES = [
  { n: 'KLÄMMINGEN', pts: [[17.295, 59.058], [17.26, 59.076], [17.20, 59.098], [17.15, 59.118], [17.115, 59.136], [17.098, 59.126], [17.135, 59.104], [17.19, 59.084], [17.25, 59.062], [17.28, 59.050]] },
  { n: 'SILLEN', pts: [[17.26, 59.025], [17.30, 59.02], [17.33, 58.99], [17.32, 58.95], [17.29, 58.925], [17.25, 58.935], [17.24, 58.97], [17.23, 59.0]] },
  { n: 'BÅVEN', pts: [[16.84, 59.07], [16.92, 59.09], [17.02, 59.08], [17.06, 59.04], [17.0, 59.0], [16.93, 58.985], [16.86, 59.0], [16.82, 59.04]] },
  { n: 'YNGAREN', pts: [[16.52, 58.95], [16.60, 58.96], [16.66, 58.93], [16.62, 58.90], [16.54, 58.905], [16.50, 58.925]] },
  { n: 'LÅNGHALSEN', pts: [[16.70, 58.89], [16.80, 58.885], [16.88, 58.87], [16.86, 58.855], [16.76, 58.865], [16.69, 58.875]] },
  { n: 'FRÖSJÖN', label: false, pts: [[17.30, 59.06], [17.325, 59.064], [17.335, 59.056], [17.31, 59.052]] },
  { n: 'HALLBOSJÖN', label: false, pts: [[17.455, 59.115], [17.49, 59.12], [17.50, 59.105], [17.465, 59.10]] },
];
export const ISLANDS = [[17.73, 58.95, 7, 4], [17.80, 58.90, 10, 5], [17.66, 58.86, 6, 3], [17.88, 59.0, 12, 6], [17.35, 58.79, 5, 3], [17.20, 58.74, 6, 3]];
// e: europaväg (gul). at: där skölden står.
export const ROADS = [
  { n: 'E4', e: 1, pts: [[17.96, 59.245], [17.70, 59.205], [17.625, 59.17], [17.585, 59.12], [17.56, 59.06], [17.515, 58.985], [17.47, 58.93], [17.38, 58.872], [17.30, 58.842], [17.18, 58.80], [17.05, 58.772], [16.90, 58.762], [16.70, 58.745], [16.35, 58.72]], at: [17.6, 59.15] },
  { n: 'E20', e: 1, pts: [[17.625, 59.20], [17.50, 59.235], [17.36, 59.258], [17.22, 59.27], [17.10, 59.285]], at: [17.52, 59.23] },
  { n: '57', pts: [[17.585, 59.10], [17.567, 59.090], [17.49, 59.06], [17.418, 59.044], [17.36, 59.042], [17.311, 59.045], [17.23, 59.058], [17.163, 59.066], [17.0, 59.064], [16.85, 59.052], [16.72, 59.054], [16.588, 59.054], [16.35, 59.02]], at: [17.47, 59.045] },
  { n: '223', pts: [[17.22, 59.262], [17.18, 59.21], [17.13, 59.16], [17.10, 59.122], [17.13, 59.09], [17.163, 59.07]], at: [17.15, 59.19] },
  { n: '224', pts: [[17.36, 58.862], [17.335, 58.905], [17.33, 58.95], [17.345, 59.0], [17.32, 59.04]], at: [17.345, 58.93] },
  { n: '218', pts: [[17.55, 58.897], [17.49, 58.946], [17.44, 58.99]], at: [17.52, 58.925] },
  { n: '53', pts: [[17.0, 58.758], [16.96, 58.85], [16.95, 58.95], [16.90, 59.06], [16.82, 59.18], [16.76, 59.28]], at: [16.93, 58.88] },
];
// Västra stambanan, Nyköpingsbanan, Svealandsbanan
export const RAILS = [
  [[17.72, 59.21], [17.625, 59.175], [17.58, 59.12], [17.567, 59.093], [17.49, 59.066], [17.418, 59.050], [17.36, 59.049], [17.311, 59.052], [17.24, 59.064], [17.163, 59.073], [17.0, 59.08], [16.85, 59.075], [16.70, 59.066], [16.588, 59.060], [16.35, 59.04]],
  [[17.567, 59.093], [17.53, 59.02], [17.49, 58.946], [17.40, 58.89], [17.25, 58.822], [17.06, 58.762], [16.9, 58.75]],
  [[17.625, 59.19], [17.45, 59.25], [17.25, 59.272], [17.10, 59.29]],
];
// [namn, plats, stor, etikettens dx, dy]
export const TOWNS = [['SÖDERTÄLJE', 'sodertalje', 1, 8, -6], ['NYKÖPING', 'nykoping', 1, 8, 4], ['FLEN', 'flen', 0, 6, 4], ['TROSA', 'trosa', 0, 7, 4], ['MARIEFRED', 'mariefred', 0, -70, 14], ['VAGNHÄRAD', 'vagnharad', 0, 7, 4], ['JÄRNA', 'jarna', 0, 7, -6], ['MÖLNBO', 'molnbo', 0, -14, -12], ['GNESTA', 'gnesta', 1, -30, 18], ['BJÖRNLUNDA', 'bjornlunda', 0, -44, 16], ['LAXNE', 'laxne', 0, 7, -4], ['STJÄRNHOV', 'stjarnhov', 0, -24, -9], ['LÄSTRINGE', 'lastringe', 0, 8, 12]];

// ---------- sektorerna på kartan ----------
// place: orten markören står på. current/closed: högens plats när sektorn strider härnäst och när den är klar, som
// övre vänstra hörn på bordet. En hög spelaren flyttat står där spelaren lade den (table.layout). day: var "DAY n"
// skrivs, från markören (kartans bildpunkter), där inga ortnamn står.
export const SECTOR_TABLE = {
  riksvagen: { place: 'lastringe', current: [1010, 392], closed: [880, 456], day: [44, -38] },
  gnesta: { place: 'hagstumosse', current: [248, 318], closed: [588, 360], day: [22, -46] },
  molnbo: { place: 'molnbo', current: [248, 318], closed: [960, 168], day: [-14, -52] },
  // 0.23.0 (H545)
  bjornlunda: { place: 'bjornlunda', current: [248, 318], closed: [300, 120], day: [-30, -44] },
};
// en sektor utan rad ovan (en ny bana från en annan gren) får en ledig plats i tur och ordning
export const SPARE_SLOTS = [[340, 96], [760, 470], [600, 120]];

// Gnesta-inzoomningen (ritfilm över kartan, mockupens .sheet.overlay) byggs inte nu. Kroken: src/ui/table.js insetSheet().
export const INSET = null;

// ---------- avsändarna ----------
export const SENDERS = { FM: 'Försvarsmakten', MCF: 'MCF', 'Försvarsmakten': 'Försvarsmakten', 'P4 Sörmland': 'P4 Sörmland' };
// mottagaren på ordern, per sektor
export const ADDRESSEE = { riksvagen: 'Commander, roadblock E4', gnesta: 'Commander, Gnesta', molnbo: 'Commander, Gnesta', bjornlunda: 'Commander, Björnlunda' };

// ---------- radion (P4 Sörmland) ----------
// Radioremsor som bordet visar när steget är nått, tills dagarnas eget fält finns (day.report med from 'P4 Sörmland').
// after: [bana, dag] = efter att dagen är vunnen. Högst 40 ord.
export const RADIO = [
  // 0.21.2: natten efter E4 dag 2 (speltestet av 0.21.1 såg aldrig radion)
  { id: 'radio:after-e4-2', after: ['riksvagen', 2], at: '05:20',
    text: 'Trains between Södertälje and Nyköping are cancelled. People along the E4 are told to stay indoors and keep off the roads.' },
  { id: 'radio:after-e4', after: ['riksvagen', 3], at: '06:10',
    text: 'The E4 south of Södertälje is closed. Drivers are asked to stay in their cars. Gnesta asks families east of the ice rink to come in.' },
  // 0.22.0 (H539): Vikingavägen är en dag
  { id: 'radio:after-gnn', after: ['gnesta-norr', 1], at: '04:40',
    text: 'Trains between Södertälje and Gnesta are cancelled. People in Järna are told to stay indoors. In Mölnbo, Folkets hus is open for anyone heading west. Bring water.' },
];

// ---------- fiendehögen ----------
// En rad per typ: vad som stoppar den (högst tre ord). Texten överst är ENEMIES[typ].report (src/data/lessons.js).
export const ENEMY_SHEET = {
  walker: { stops: 'any gun', tag: 'Walker' },
  runner: { stops: 'wire, MG', tag: 'Runner' },
  brute: { stops: 'heavy MG', tag: 'Brute' },
  crawler: { stops: 'squads', tag: 'Crawler' },
  armored: { stops: 'Ksp 88, grenades', tag: 'Armoured' },
};

// ---------- truppkorten ----------
// Rollraden på kortet (högst fem ord).
// 0.21.4: korten har fast storlek; rollen är kort (högst ca 12 tecken)
export const ROLE = {
  m249: 'Light MG', m2: 'Heavy MG', ksp58: 'General MG', ak5: 'Grenadier',
  psg90: 'Sniper', hv: 'Rifle squad', inf: 'Rifle squad', civ: 'Hunters',
  epa: 'Pillbox', atractor: 'Carrier',
};
