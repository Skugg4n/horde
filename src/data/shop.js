// Köpraden nere till vänster: allt som går att köpa, i kategorier med tvåstegs snabbval (0.11.0,
// Olas önskan): första tangenten väljer kategorin, andra saken. "2-1" är Ksp 90.
// BUY_MENU är det enda stället där ordningen bestäms. Nya saker läggs sist i sin kategori, så att
// de gamla snabbvalen inte flyttar sig (minor blir 1-3, civila 3-2).
// kind: 'gun' ställs på mark bredvid vägen, 'obstacle' läggs på vägen.
// role (0.10.1, speltestet): vad saken gör i tre till fem ord på engelska, efter det svenska namnet
// på kortet ("Ksp 58 · General MG · 7.62"), så att en utlänning förstår koderna.
export const BUY_MENU = [
  { id: 'defenses', name: 'Defenses', items: [
    { id: 'block', kind: 'obstacle', role: 'Blocks the street' },
    { id: 'wire', kind: 'obstacle', role: 'Slows them down' },
  ] },
  { id: 'guns', name: 'Guns', items: [
    { id: 'm249', kind: 'gun', role: 'Light MG · 5.56' },
    { id: 'm2', kind: 'gun', role: 'Heavy MG · 12.7' },
    { id: 'ksp58', kind: 'gun', role: 'General MG · 7.62' },
    { id: 'ak5', kind: 'gun', role: 'Rifle, grenade launcher' },
    { id: 'psg90', kind: 'gun', role: 'Rooftop sniper rifle' },
  ] },
  { id: 'units', name: 'Units', items: [
    { id: 'hv', kind: 'gun', role: 'Rifle squad · Ak 4' },
  ] },
];
// Alla saker i radens ordning, med kategorin (cat, 1-baserad) och platsen i den (slot, 1-baserad).
export const SHOP = BUY_MENU.flatMap((c, ci) => c.items.map((it, si) => ({ ...it, cat: ci + 1, slot: si + 1, catId: c.id })));
export const shopItem = id => SHOP.find(s => s.id === id);
// Snabbvalet som det skrivs på kortet och i tipsen: "2-1".
export const hotkeyOf = id => { const it = shopItem(id); return it ? `${it.cat}-${it.slot}` : ''; };
// Saken på snabbvalet (kategori, plats), eller null.
export const itemAt = (cat, slot) => BUY_MENU[cat - 1]?.items[slot - 1]?.id ?? null;
