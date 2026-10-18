// Gemensamt för kartor som scripts/osm-to-map.mjs skriver (Björnlunda först): rutnätet ur vägarna, mjuka kurvor och
// en enkel väg genom rutnätet för förhandsvisningens skisser. Ren data, ingen three.js, testbar i node.
// Kartdata i de kartorna: © OpenStreetMap contributors (ODbL).

export function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function distPolyline(px, pz, pts) {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(px, pz, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  return d;
}
export function inPoly(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > pz) !== (zj > pz) && px < (xj - xi) * (pz - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
// Mjuk kurva genom punkterna (Catmull-Rom), ungefär en punkt per step meter (som gnesta.js smooth).
export function smooth(pts, step = 1.5) {
  if (pts.length < 3) return pts.map(p => [...p]);
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([...pts[pts.length - 1]]);
  return out;
}

// Rutnätet: 2 m-rutor, gångbart där en väg ligger (bredd/2 + 0,25 m) och en sammanhängande kedja längs varje väglinje
// (samma regler som Gnesta och Mölnbo). Vägarnas mjuka linjer läggs på map.roads (rd.line) för ritningen.
// Järnvägen och husen är aldrig väg; plankorsningen är gångbar för att vägen går över.
export function osmGrid(map, bounds, cellSize = 2) {
  for (const rd of map.roads) rd.line ??= rd.smoothed || rd.pts.length <= 2 ? rd.pts.map(p => [...p]) : smooth(rd.pts);
  const { x0, z0, x1, z1 } = bounds;
  const gw = Math.round((x1 - x0) / cellSize), gh = Math.round((z1 - z0) / cellSize);
  const walk = new Uint8Array(gw * gh), terrain = new Uint8Array(gw * gh);
  const cx = i => x0 + (i + 0.5) * cellSize, cz = j => z0 + (j + 0.5) * cellSize;
  const roads = map.roads.filter(r => r.walk !== false);
  for (const r of roads) {
    const xs = r.line.map(p => p[0]), zs = r.line.map(p => p[1]), pad = r.width / 2 + 0.25;
    const i0 = Math.max(0, Math.floor((Math.min(...xs) - pad - x0) / cellSize)), i1 = Math.min(gw - 1, Math.ceil((Math.max(...xs) + pad - x0) / cellSize));
    const j0 = Math.max(0, Math.floor((Math.min(...zs) - pad - z0) / cellSize)), j1 = Math.min(gh - 1, Math.ceil((Math.max(...zs) + pad - z0) / cellSize));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * gw + i;
      if (distPolyline(cx(i), cz(j), r.line) > pad) continue;
      walk[k] = 1;
      if (!terrain[k] || r.surface === 'asphalt') terrain[k] = r.surface === 'gravel' ? 2 : 1;
    }
    for (let k = 1; k < r.line.length; k++) {
      const [ax, az] = r.line[k - 1], [bx, bz] = r.line[k], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
      for (let t = 0; t <= n; t++) {
        const i = Math.floor((ax + (bx - ax) * t / n - x0) / cellSize), j = Math.floor((az + (bz - az) * t / n - z0) / cellSize);
        if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
        const c = j * gw + i; if (!walk[c]) { walk[c] = 1; terrain[c] = r.surface === 'gravel' ? 2 : 1; }
      }
    }
  }
  const cellOf = ([x, z]) => [Math.min(gw - 1, Math.max(0, Math.floor((x - x0) / cellSize))), Math.min(gh - 1, Math.max(0, Math.floor((z - z0) / cellSize)))];
  const nearestWalk = p => {
    let best = null, bd = Infinity;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) if (walk[j * gw + i]) { const d = Math.hypot(cx(i) - p[0], cz(j) - p[1]); if (d < bd) { bd = d; best = [i, j]; } }
    return best;
  };
  const sk = map.sketch ?? {};
  return {
    w: gw, h: gh, cellSize, origin: [x0, z0], walk, terrain,
    spawns: (sk.spawns ?? []).map(s => ({ id: s.id, cell: nearestWalk(s.at) })),
    base: sk.base ? nearestWalk(sk.base.at) : null,
    cellOf, center: (i, j) => [cx(i), cz(j)],
  };
}

// Kortaste väg genom rutnätet (åtta grannar, inga hörn genom stängda rutor), som en lista med rutor. Bara för skisserna.
export function gridPath(grid, from, to) {
  const { w, h, walk } = grid, N = w * h, prev = new Int32Array(N).fill(-1), dist = new Float64Array(N).fill(Infinity);
  const s = from[1] * w + from[0], t = to[1] * w + to[0];
  // Dijkstra med en enkel binär hög
  const heap = [[0, s]]; dist[s] = 0;
  const push = it => { heap.push(it); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [d, k] = pop();
    if (k === t) break;
    if (d > dist[k]) continue;
    const i = k % w, j = (k / w) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= h || !walk[nj * w + ni]) continue;
      if (di && dj && (!walk[j * w + ni] || !walk[nj * w + i])) continue;
      const nk = nj * w + ni, nd = d + (di && dj ? Math.SQRT2 : 1);
      if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; push([nd, nk]); }
    }
  }
  if (prev[t] < 0 && s !== t) return null;
  const out = [];
  for (let k = t; k >= 0; k = k === s ? -1 : prev[k]) out.push([k % w, (k / w) | 0]);
  return out.reverse();
}
