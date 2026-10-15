// Köpraden nere till vänster: allt som går att köpa, i snabbvalens ordning (1, 2, 3 ... 0).
// Nya saker läggs till sist så att snabbvalen för de gamla inte flyttar sig.
// kind: 'gun' ställs på mark bredvid vägen, 'obstacle' läggs på vägen.
export const SHOP = [
  { id: 'm249', kind: 'gun' },
  { id: 'm2', kind: 'gun' },
  { id: 'block', kind: 'obstacle' },
  { id: 'wire', kind: 'obstacle' },
  // 0.8.0: arsenalen (snabbval 5, 6, 7)
  { id: 'ksp58', kind: 'gun' },
  { id: 'ak5', kind: 'gun' },
  { id: 'psg90', kind: 'gun' },
];
export const shopItem = id => SHOP.find(s => s.id === id);
// Snabbvalet för plats i (0-baserad): 1-9 och sist 0.
export const hotkey = i => (i < 9 ? String(i + 1) : i === 9 ? '0' : '');
