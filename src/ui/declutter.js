// Världens lappar på skärmen (0.19.2, speltestet av 0.19.1, fynd 4: "CARS SHOVED ASIDE" över vågskylten vid bron,
// "FROM WAVE 2 / FROM WAVE 2 / FROM WAVE 3" staplade på Stenbyvägen, vågskylten över kyrktornet och skyttens stapel,
// IN HOUSE, TIRED och EXHAUSTED i en klump vid korsningen). En regel för alla lappar och plåtar som står i världen:
// den med högst prioritet står kvar där den är; en lägre flyttas en bit ner eller upp (staplas intill den den krockade
// med), och ryms den ändå inte döljs den om den får döljas. Fasta rutor (fixed) flyttas aldrig och tar plats först.
//
//   declutter(items, { fixed, maxNudge, gap, bounds }) -> [{ dy, hidden }] i items ordning
//   items: [{ r: { left, top, right, bottom }, prio, move = true, hide = true }]
//
// Ren funktion av rutorna (provas i tests/declutter.test.js).
const hits = (a, b, gap = 0) => a.left < b.right + gap && b.left < a.right + gap && a.top < b.bottom + gap && b.top < a.bottom + gap;
const shift = (r, dy) => ({ left: r.left, right: r.right, top: r.top + dy, bottom: r.bottom + dy });

export function declutter(items, { fixed = [], maxNudge = 44, gap = 2, bounds = null } = {}) {
  const placed = fixed.map(r => ({ ...r }));
  const out = items.map(() => ({ dy: 0, hidden: false }));
  const order = items.map((_, i) => i).sort((i, j) => (items[j].prio ?? 0) - (items[i].prio ?? 0) || i - j);
  const inside = r => !bounds || (r.top >= bounds.top && r.bottom <= bounds.bottom);
  const free = r => inside(r) && !placed.some(p => hits(r, p, gap));
  for (const i of order) {
    const it = items[i], r = it.r;
    if (!r || !(r.right > r.left) || !(r.bottom > r.top)) continue;
    if (free(r)) { placed.push(r); continue; }
    if (it.move !== false) {
      // kandidaterna: precis under eller precis över var och en som står i vägen, närmast först
      const cands = [];
      for (const p of placed) {
        if (p.left >= r.right + gap || r.left >= p.right + gap) continue;
        cands.push(p.bottom + gap - r.top + 0.5, p.top - gap - r.bottom - 0.5);
      }
      cands.sort((a, b) => Math.abs(a) - Math.abs(b));
      const dy = cands.find(d => Math.abs(d) <= maxNudge && free(shift(r, d)));
      if (dy != null) { out[i].dy = dy; placed.push(shift(r, dy)); continue; }
    }
    if (it.hide !== false) { out[i].hidden = true; continue; }
    placed.push(r);
  }
  return out;
}

// Rutan för ett element på skärmen (getBoundingClientRect) som en vanlig ruta.
export const rectOf = el => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; };
// Två rutors union (en grupps lapp och dess stapel flyttas ihop).
export const union = (a, b) => (!a ? b : !b ? a : { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) });
