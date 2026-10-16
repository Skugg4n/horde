// Köpraden nere till vänster: allt som går att köpa, i snabbvalens ordning (1, 2, 3 ... 0).
// Nya saker läggs till sist så att snabbvalen för de gamla inte flyttar sig.
// kind: 'gun' ställs på mark bredvid vägen, 'obstacle' läggs på vägen.
// role (0.10.1, speltestet): vad saken gör i tre till fem ord på engelska, efter det svenska namnet
// på kortet ("Ksp 58 · General MG · 7.62"), så att en utlänning förstår koderna.
export const SHOP = [
  { id: 'm249', kind: 'gun', role: 'Light MG · 5.56' },
  { id: 'm2', kind: 'gun', role: 'Heavy MG · 12.7' },
  { id: 'block', kind: 'obstacle', role: 'Blocks the street' },
  { id: 'wire', kind: 'obstacle', role: 'Slows them down' },
  // 0.8.0: arsenalen (snabbval 5, 6, 7)
  { id: 'ksp58', kind: 'gun', role: 'General MG · 7.62' },
  { id: 'ak5', kind: 'gun', role: 'Rifle, grenade launcher' },
  { id: 'psg90', kind: 'gun', role: 'Rooftop sniper rifle' },
  // 0.9.0: Hemvärnet (snabbval 8)
  { id: 'hv', kind: 'gun', role: 'Rifle squad · Ak 4' },
];
export const shopItem = id => SHOP.find(s => s.id === id);
// Snabbvalet för plats i (0-baserad): 1-9 och sist 0.
export const hotkey = i => (i < 9 ? String(i + 1) : i === 9 ? '0' : '');
