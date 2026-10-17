// Köpraden nere till vänster: allt som går att köpa, i kategorier (0.11.0, Olas önskan). 0.16.0: snabbvalen är
// enkla siffror tills raden har fler än 9 kort; då väljer första tangenten kategorin och andra saken ("2-2").
// BUY_MENU är det enda stället där ordningen bestäms. Nya saker läggs sist i sin kategori, så att
// de gamla snabbvalen inte flyttar sig (minor blir 1-3).
// kind: 'gun' ställs på mark bredvid vägen, 'obstacle' läggs på vägen.
// role (0.10.1, speltestet): vad saken gör i tre till fem ord på engelska, efter det svenska namnet
// på kortet ("Ksp 58 · General MG · 7.62"), så att en utlänning förstår koderna.
// Olas ändring samma dag: två kategorier. 1 Defenses är det passiva på gatan; 2 Units är allt som
// skjuter, Hemvärnet med, från svagast och billigast till starkast. Ordningen i Units (Olas tre
// första, resten efter pris och tyngd): Hemvärnet ($ 250, 26 skada/s för hela gruppen), Ksp 90
// ($ 250, 32/s), Ksp 88 ($ 600, 88/s, Olas plats), Ksp 58 ($ 400, 70/s), Ak 5 + Grt ($ 450,
// 18/s plus granater), Psg 90 ($ 700, 90 per skott på 34 m från ett tak).
// 0.13.0 (H104, H105): förrådet per sektor och dag (src/sim/stats.js inArsenal) bestämmer vad som syns, och
// snabbvalen räknas på det som syns den dagen (dayMenu): E4 "2-1" är infanteriet, Gnesta dag 1 "2-1" de
// civila. Units från svagast till starkast: de civila, Hemvärnet, infanteriet, Ksp 90, Ksp 88, pillboxen,
// Ksp 58, Ak 5 + Grt och Psg 90 (Olas tre första står kvar i samma ordning).
export const BUY_MENU = [
  { id: 'defenses', name: 'Defenses', items: [
    { id: 'block', kind: 'obstacle', role: 'Blocks the street' },
    { id: 'wire', kind: 'obstacle', role: 'Slows them down' },
    // 0.14.0: förnödenheter, skrotbilar tvärs över gatan
    { id: 'car', kind: 'obstacle', role: 'Cheap roadblock' },
  ] },
  { id: 'units', name: 'Units', items: [
    { id: 'civ', kind: 'gun', role: 'Volunteers · hunting rifles' },
    { id: 'hv', kind: 'gun', role: 'Rifle squad · Ak 4' },
    { id: 'inf', kind: 'gun', role: 'Army squad · Ak 5' },
    { id: 'm249', kind: 'gun', role: 'Light MG · 5.56' },
    { id: 'm2', kind: 'gun', role: 'Heavy MG · 12.7' },
    { id: 'epa', kind: 'gun', role: 'Welded pillbox · 7.62' },
    { id: 'ksp58', kind: 'gun', role: 'General MG · 7.62' },
    { id: 'ak5', kind: 'gun', role: 'Rifle, grenade launcher' },
    { id: 'psg90', kind: 'gun', role: 'Rooftop sniper rifle' },
  ] },
];
// Alla saker i radens ordning, med kategorin (cat, 1-baserad) och platsen i den (slot, 1-baserad).
export const SHOP = BUY_MENU.flatMap((c, ci) => c.items.map((it, si) => ({ ...it, cat: ci + 1, slot: si + 1, catId: c.id })));
export const shopItem = id => SHOP.find(s => s.id === id);
// Dagens köprad: bara det som finns i förrådet (has(id)), tomma kategorier bort. Snabbvalen följer den.
export const dayMenu = (has = () => true) => BUY_MENU.map(c => ({ ...c, items: c.items.filter(it => has(it.id)) })).filter(c => c.items.length);
// 0.16.0 (Olas beslut 3, ersätter H097 tills vidare): köpraden har enkla siffror, ett tryck väljer kortet.
// 0.16.4 (speltestet av 0.16.2: "Ksp 90 är 2 på E4 dag 1, 3 dag 2, 4 på Ishallen dag 2, 6 dag 3; snabbvalen går inte
// att lära sig"): varje sak har ETT snabbval i hela kampanjen. Enheterna siffrorna 1 till 9 i Units ordning,
// hindren bokstäverna Z, X och C (raden under, vänsterhanden ligger kvar). En siffra som inte finns i dag gör
// ingenting. Tvåstegsvalet behövs inte längre (högst 9 enheter); det står kvar i chord.js men används inte.
export const FIXED_KEYS = { civ: '1', hv: '2', inf: '3', m249: '4', m2: '5', epa: '6', ksp58: '7', ak5: '8', psg90: '9', block: 'Z', wire: 'X', car: 'C' };
export const CHORD_OVER = Infinity;
export const flatItems = (menu = BUY_MENU) => menu.flatMap(c => c.items);
export const usesChords = (menu = BUY_MENU) => flatItems(menu).length > CHORD_OVER;
// Snabbvalet som det skrivs på kortet och i tipsen. menu används inte längre (samma tangent varje dag).
export const hotkeyOf = id => FIXED_KEYS[id] ?? '';
// Saken på en tangent ('4', 'X') i dagens köprad, eller null.
export const itemForKey = (key, menu = BUY_MENU) => flatItems(menu).find(it => FIXED_KEYS[it.id] === String(key).toUpperCase())?.id ?? null;
// Saken på snabbvalet (kategori, plats), eller null (tvåstegsvalet).
export const itemAt = (cat, slot, menu = BUY_MENU) => menu[cat - 1]?.items[slot - 1]?.id ?? null;
