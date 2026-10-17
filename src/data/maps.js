// Banor som data. E4 (Lästringe), Gnesta och Gnesta Norr bor i egna filer (e4-lastringe.js, gnesta.js,
// gnesta-norr.js).
import { gnesta } from './gnesta.js';
import { gnestaNorr } from './gnesta-norr.js';
import * as E4 from './e4-lastringe.js';

export const MAPS = {
  riksvagen: {
    id: 'riksvagen',
    // 0.11.0 (Olas önskan): sektornamnen i banvalet och på skyltarna; id:na är oförändrade.
    name: 'Sector E4',
    version: E4.E4_VERSION,
    // Sektorns slut (0.11.0): texten på vinstskylten efter sista dagen och banan den leder till.
    // 0.13.0 (H104): sektorsövergången. Vägspärren tystnar, Gnesta har bara sitt Hemvärn.
    // 0.16.0 (textgenomgången, speltestet av 0.14.2: VICTORY bredvid "fallen silent" lästes som en förlust)
    outro: { text: 'Sector E4 is secure. The horde is moving on Gnesta. Civilians are trapped in the Hagstumosse ice rink.', next: 'gnesta', withdraw: true },
    // 0.15.0 (Olas önskan: "känns som amerikansk öken, inte Sörmland"): banan är trafikplats 137 Lästringe
    // (src/data/e4-lastringe.js). Ett rutnät som Gnesta: kameran går att panorera och zooma, och längst ut
    // ryms hela trafikplatsen på en skärm i 1440 x 900 (camera-rig.js crispView).
    camera: { target: [-4, 4], view: 50, zoom: [24, 80], pan: { x0: -60, x1: 66, z0: -31, z1: 38 } },
    shadowBounds: { x0: -64, x1: 70, z0: -36, z1: 46 },
    roads: E4.ROADS, ground: E4.GROUND, spawns: E4.SPAWNS, base: E4.BASE, surroundings: E4.SURROUNDINGS,
    props: E4.PROPS, signs: E4.SIGNS, gantries: E4.GANTRIES, lamps: E4.LAMPS, rocks: E4.ROCKS, rails: E4.RAILS, junction: E4.JUNCTION,
    grid: E4.e4Grid(),
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
};
MAPS.riksvagen.place = E4.e4Placement(MAPS.riksvagen.grid);
