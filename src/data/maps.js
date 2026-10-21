// Banor som data. E4 (Lästringe), Gnesta och Gnesta Norr bor i egna filer (e4-lastringe.js, gnesta.js,
// gnesta-norr.js).
import { gnesta } from './gnesta.js';
import { gnestaNorr } from './gnesta-norr.js';
import * as E4 from './e4-lastringe.js';
// 0.17.0-molnbo: sektorn Mölnbo (src/data/molnbo.js), efter Hagstumosse
import { molnbo } from './molnbo.js';
// 0.23.0 (H545): sektorn Björnlunda (src/data/bjornlunda-play.js), kampanjens dag 11 och 12, efter Mölnbo
import { bjornlundaPlay } from './bjornlunda-play.js';
// 0.24.0 (H552): sektorn Laxne (src/data/laxne-play.js), den valfria dagen mellan Mölnbo och Björnlunda
import { laxnePlay } from './laxne-play.js';
// 0.25.0 (H559): sektorn Gnesta västra rondell (src/data/gnesta-vastra-rondell-play.js), kampanjens dag 13 efter Björnlunda
import { vastraRondellPlay } from './gnesta-vastra-rondell-play.js';
import { timed } from '../meta/load-timing.js';
import { lazy } from './lazy.js';

export const MAPS = {
  riksvagen: {
    id: 'riksvagen',
    // 0.11.0 (Olas önskan): sektornamnen i banvalet och på skyltarna; id:na är oförändrade.
    name: 'Sector E4',
    version: E4.E4_VERSION,
    // Sektorns slut (0.11.0): texten på vinstskylten efter sista dagen och banan den leder till.
    // 0.13.0 (H104): sektorsövergången. Vägspärren håller och armén stannar där; du skickas till Gnesta.
    // 0.16.0 (textgenomgången, speltestet av 0.14.2: VICTORY bredvid "fallen silent" lästes som en förlust)
    // 0.16.4 (Olas rättelse: "vi VANN vid E4", och de civila ska IN i ishallen, de sitter inte fast där): en vinst
    // läses som en vinst, och befälhavaren skickas dit det behövs. Ingen reträtt.
    // 0.20.0 (kampanjbågen): de nådde aldrig väg 224, och nästa grupp kommer österifrån mot Gnesta
    outro: { text: 'E4 holds. They never reached väg 224. A group is closing on eastern Gnesta. Command is sending you to Hagstumosse. Get the civilians into the ice rink.', next: 'gnesta', withdraw: true },
    // 0.15.0 (Olas önskan: "känns som amerikansk öken, inte Sörmland"): banan är trafikplats 137 Lästringe
    // (src/data/e4-lastringe.js). Ett rutnät som Gnesta: kameran går att panorera och zooma, och längst ut
    // ryms hela trafikplatsen på en skärm i 1440 x 900 (camera-rig.js crispView).
    camera: { target: [-4, 4], view: 50, zoom: [24, 80], pan: { x0: -60, x1: 66, z0: -31, z1: 38 } },
    shadowBounds: { x0: -64, x1: 70, z0: -36, z1: 46 },
    roads: E4.ROADS, ground: E4.GROUND, spawns: E4.SPAWNS, base: E4.BASE, surroundings: E4.SURROUNDINGS,
    props: E4.PROPS, signs: E4.SIGNS, gantries: E4.GANTRIES, lamps: E4.LAMPS, rocks: E4.ROCKS, rails: E4.RAILS, junction: E4.JUNCTION,
    // Vägspärren vid stammens ände (render/models.js roadblockModel), vänd nedför stammen.
    basePlace: E4.BASE.place, baseModel: 'roadblock',
    baseHp: 20,
    // 0.14.0: frontbredden, så många kärntrupper får stå ute samtidigt (src/sim/sim.js frontage)
    frontage: 6,
    // 0.14.2 (speltestet av 0.14.1: "basen från 17 till 0 på några sekunder"): spärren tar dem en i taget, som
    // ishallens dörrar på Gnesta (src/sim/sim.js doorBreak). De som når fram står vid spärren och går att
    // skjuta; en släpps igenom var 3,2 s, så att 20 i bas räcker minst en minut från första skadan.
    door: { gap: 3.2 },
    // 0.13.0 (H104, H130): E4 är den militära vägspärren, en smak av riktig militär kraft. Inget Hemvärn
    // här: infanteriet, Ksp 90, Ksp 88 och EPA-pillboxen finns från början (utan forskning), plus tråd och
    // betong som förut. Lite som en övning: dag 1 lär ut pjäsen och vinkeln, dag 2 tråden och pillboxen,
    // dag 3 den tunga pjäsen mot bjässarna.
    arsenal: ['block', 'wire', 'inf', 'm249', 'm2', 'epa'],
    unlocks: ['inf', 'm2', 'epa'],
    days: E4.DAYS,
  },
  gnesta,
  'gnesta-norr': gnestaNorr,
  molnbo,
  // 0.24.0 (H552): Laxne före Björnlunda (kampanjens ordning, menyn)
  laxne: laxnePlay,
  bjornlunda: bjornlundaPlay,
  'gnesta-vastra-rondell': vastraRondellPlay,
};
// 0.20.0 (H502): rutnätet och placeringen räknas när banan behöver dem (src/data/lazy.js)
lazy(MAPS.riksvagen, 'grid', () => timed('riksvagen:rutnät', () => E4.e4Grid()));
lazy(MAPS.riksvagen, 'place', () => timed('riksvagen:placering', () => E4.e4Placement(MAPS.riksvagen.grid)));
