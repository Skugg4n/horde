// Sanity (0.18.0, strategiskt djup skiva 1, Olas beslut 2026-10-18): truppernas psykiska motståndskraft mot att
// bli rädda och fly. Inte "är det värt att försvara" utan "vågar de stå emot". Rena siffror och funktioner; själva
// förloppet (när den sjunker, viket, korselden) bor i src/sim/sim.js.
//
// Varje grupp och varje pjäslag har sanity 0 till 100 (pillboxen har ingen: den står och tar stryk).
//   sjunker   av zombier nära (inom NEAR m, närmare = mer, värre typer mer: ZOMBIES[typ].fear), när en kamrat stupar
//             (DOWN_OWN i den egna gruppen, DOWN_NEAR för enheter inom NEAR_UNITS m) och när ett pjäslag slås ner.
//   delas     med motståndet: typens nerve (civila 0,6, Hemvärnet 1, infanteriet 1,5, pjäslagen 1,2 till 1,4), en
//             veteranstjärna (VETERAN.nerve) och tröttheten (FATIGUE.drain). Ett hus ger skydd (HOUSE).
//   återhämtas RECOVER per sekund när ingen zombie är inom CALM m.
//   verkar   under EFFECT_AT: sämre träff och långsammare eld, ner till EFFECT_MIN vid 0.
//   bryts    under ROUT: enheten flyr (routed) om viket är upplåst (allow 'rout'), annars står den kvar och skjuter dåligt.
import { WEAPONS, VETERAN } from '../data/weapons.js';
import { ZOMBIES } from '../data/zombies.js';

export const SANITY = {
  max: 100,
  near: 8,           // meter: zombier närmare än så tär
  drain: 1.6,        // per sekund och fear-enhet, på 0 m (linjärt ned till 0 vid near)
  calm: 12,          // meter: ingen zombie så nära, så återhämtar de sig
  recover: 3,        // per sekund
  downOwn: 22,       // en man i gruppen stupar
  downNear: 8,       // en man i en grupp intill stupar (inom nearUnits)
  crewLost: 14,      // ett pjäslag i närheten slås ner
  nearUnits: 14,     // meter
  house: 0.5,        // i ett hus tär det hälften så fort
  effectAt: 60,      // under så mycket börjar det märkas
  effectMin: 0.65,   // träffen vid sanity 0 (andel)
  rateMin: 0.75,     // eldtakten vid sanity 0 (andel)
  waver: 35,         // varningen: "wavering"
  rout: 18,          // under så mycket flyr de
  rallied: 55,       // så mycket har en flydd enhet när den samlats igen
  breakIn: 30,       // ett hus där dörren slås in
};
// Tröttheten (0.18.0): 0 Rested, 1 Tired, 2 Exhausted (src/meta/operation.js). Träff, eldtakt och hur fort sanity tär.
export const FATIGUE = {
  names: ['Rested', 'Tired', 'Exhausted'],
  accuracy: [1, 0.92, 0.8],
  rate: [1, 1, 0.88],
  drain: [1, 1.2, 1.5],
};
export const fatigueName = f => FATIGUE.names[Math.max(0, Math.min(2, f | 0))];
// Pillboxen och skyttar utan lag har ingen sanity.
export const hasSanity = g => !WEAPONS[g.weapon.type]?.vehicle;
// Motståndet: typens nerve gånger stjärnan, delat med tröttheten.
export function resilience(w) {
  const base = WEAPONS[w.type]?.nerve ?? 1;
  return base * (w.vet ? VETERAN.nerve : 1) / FATIGUE.drain[Math.max(0, Math.min(2, w.fatigue | 0))];
}
// Hur mycket en zombie på avståndet d tär per sekund (före motståndet).
export const fearAt = (type, d) => (d >= SANITY.near ? 0 : (ZOMBIES[type]?.fear ?? 1) * SANITY.drain * (1 - d / SANITY.near));
// Verkan på träff och eldtakt (1 = ingen).
export function sanityFactor(s) {
  if (s == null || s >= SANITY.effectAt) return { accuracy: 1, rate: 1 };
  const k = Math.max(0, s) / SANITY.effectAt;
  return { accuracy: SANITY.effectMin + (1 - SANITY.effectMin) * k, rate: SANITY.rateMin + (1 - SANITY.rateMin) * k };
}
// Läget i ord för panelen och märket.
export function sanityState(s) {
  if (s == null) return null;
  if (s < SANITY.rout) return 'breaking';
  if (s < SANITY.waver) return 'wavering';
  if (s < SANITY.effectAt) return 'shaken';
  return 'steady';
}
