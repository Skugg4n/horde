// Vägarnas avståndsfält för rutnäten (0.20.0, H502, laddtiden). Rutnäten frågade förut varje ruta om avståndet
// till varje väg (hela väglinjen, alla punkter): för Gnesta Norr och Mölnbo över en halv sekund vid varje start.
// Här räknar varje vägbit bara rutorna i sin egen omskrivna rektangel (plus vägens halva bredd och reach), och
// för varje väg i tur och ordning (samma ordning som listan) får fn varje ruta den når och det minsta avståndet
// från rutans mitt till väglinjen. Samma tal som distPolyline (samma distSeg, minimum över bitarna), så
// rutnäten blir bit för bit desamma. Rutor längre från vägen än halva bredden plus reach får inget anrop.
export function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function eachRoadCell(roads, { x0, z0, gw, gh, cellSize }, reach, fn, key = 'pts') {
  const tmp = new Float64Array(gw * gh).fill(Infinity), touched = [];
  roads.forEach((r, ri) => {
    const pts = r[key], pad = r.width / 2 + reach;
    for (let k = 1; k < pts.length; k++) {
      const [ax, az] = pts[k - 1], [bx, bz] = pts[k];
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - pad - x0) / cellSize) - 1), i1 = Math.min(gw - 1, Math.floor((Math.max(ax, bx) + pad - x0) / cellSize) + 1);
      const j0 = Math.max(0, Math.floor((Math.min(az, bz) - pad - z0) / cellSize) - 1), j1 = Math.min(gh - 1, Math.floor((Math.max(az, bz) + pad - z0) / cellSize) + 1);
      for (let j = j0; j <= j1; j++) {
        const z = z0 + (j + 0.5) * cellSize;
        for (let i = i0; i <= i1; i++) {
          const c = j * gw + i, d = distSeg(x0 + (i + 0.5) * cellSize, z, ax, az, bx, bz);
          if (d < tmp[c]) { if (tmp[c] === Infinity) touched.push(c); tmp[c] = d; }
        }
      }
    }
    for (const c of touched) { fn(ri, c, tmp[c]); tmp[c] = Infinity; }
    touched.length = 0;
  });
}
// Ligger punkten närmare väglinjen än thr? Samma svar som distPolyline(px, pz, pts) < thr (minsta avståndet till
// någon bit är under thr precis när någon bit är det), men bitar vars omskrivna rektangel ligger längre bort än thr
// hoppas över, och svaret ges vid första träffen.
export function nearLine(px, pz, pts, thr) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (px < Math.min(a[0], b[0]) - thr || px > Math.max(a[0], b[0]) + thr || pz < Math.min(a[1], b[1]) - thr || pz > Math.max(a[1], b[1]) + thr) continue;
    if (distSeg(px, pz, a[0], a[1], b[0], b[1]) < thr) return true;
  }
  return false;
}
// Samma för distPolyline(px, pz, pts) - sub < thr (avståndet till vägkanten), räknat exakt som så.
export function nearEdge(px, pz, pts, sub, thr) {
  const m = sub + thr + 1;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (px < Math.min(a[0], b[0]) - m || px > Math.max(a[0], b[0]) + m || pz < Math.min(a[1], b[1]) - m || pz > Math.max(a[1], b[1]) + m) continue;
    if (distSeg(px, pz, a[0], a[1], b[0], b[1]) - sub < thr) return true;
  }
  return false;
}
