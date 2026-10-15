// Flödesfält över rutnätet: Dijkstra från basrutorna. Rent och deterministiskt.
//
// dist[k]: billigaste kostnaden från ruta k till basen (heltal, Infinity = når inte fram).
// next[k]: rutan zombien ska gå till härnäst (-1 på basen och där ingen väg finns).
// Att gå från k till grannen m kostar costs[m], alltså kostnaden att gå in i rutan. En zombie
// som står i en barrikadruta betalar inte för den, bara de som är på väg in.
//
// 4-grannar, i fast ordning: väster, öster, norr, söder (-x, +x, -z, +z). 4-grannar gör att
// nuvarande och nästa ruta alltid delar en kant, så zombien kan inte skära genom ett tomthörn.
// Lika dyra grannar: den vars mitt ligger närmast basen (fågelvägen) vinner, och vid lika även
// där den första i ordningen. Över en öppen plan blir vägen då en trappa längs diagonalen i
// stället för ett L, och rutten jämnar ut trappan. Kön bryter lika avstånd på lägst nyckel.
export const NEIGHBOURS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function makeFlow(grid) {
  const { w, h, n } = grid;
  const dist = new Float64Array(n).fill(Infinity);
  const next = new Int32Array(n).fill(-1);
  const isBaseArr = new Uint8Array(n);
  for (const k of grid.base) isBaseArr[k] = 1;
  const nb = k => {
    const i = k % w, j = (k - i) / w, out = [];
    for (const [di, dj] of NEIGHBOURS) {
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < w && b < h) out.push(b * w + a);
    }
    return out;
  };
  const nbs = Array.from({ length: n }, (_, k) => nb(k));
  // fågelvägen (i kvadrat, rutor) från varje ruta till första basrutan
  const b0 = grid.base[0] ?? 0, bi = b0 % w, bj = (b0 - bi) / w;
  const bird = Float64Array.from({ length: n }, (_, k) => { const i = k % w, j = (k - i) / w; return (i - bi) ** 2 + (j - bj) ** 2; });

  function compute(costs) {
    dist.fill(Infinity); next.fill(-1);
    const heap = new Heap(dist);
    for (const k of grid.base) if (costs[k]) { dist[k] = 0; heap.push(k); }
    const done = new Uint8Array(n);
    while (heap.size) {
      const v = heap.pop();
      if (done[v]) continue;
      done[v] = 1;
      const step = dist[v] + costs[v];
      for (const u of nbs[v]) {
        if (!costs[u] || done[u] || isBaseArr[u]) continue;
        if (step < dist[u]) { dist[u] = step; heap.push(u); }
      }
    }
    for (let k = 0; k < n; k++) {
      if (isBaseArr[k] || !costs[k] || dist[k] === Infinity) continue;
      let best = Infinity, pick = -1, pickD = Infinity;
      for (const m of nbs[k]) {
        if (!costs[m] || dist[m] === Infinity) continue;
        const c = dist[m] + costs[m];
        if (c < best || (c === best && bird[m] < pickD)) { best = c; pick = m; pickD = bird[m]; }
      }
      next[k] = pick;
    }
  }
  return { dist, next, compute, isBase: k => isBaseArr[k] === 1 };
}

// Binär hög över nycklar, ordnad på (dist, nyckel). Samma post kan ligga flera gånger; den
// gamla hoppas över när den kommer upp (done).
class Heap {
  constructor(dist) { this.d = dist; this.a = []; this.p = []; }
  get size() { return this.a.length; }
  less(i, j) { return this.p[i] < this.p[j] || (this.p[i] === this.p[j] && this.a[i] < this.a[j]); }
  swap(i, j) { [this.a[i], this.a[j]] = [this.a[j], this.a[i]]; [this.p[i], this.p[j]] = [this.p[j], this.p[i]]; }
  push(k) {
    this.a.push(k); this.p.push(this.d[k]);
    let i = this.a.length - 1;
    while (i > 0) { const q = (i - 1) >> 1; if (!this.less(i, q)) break; this.swap(i, q); i = q; }
  }
  pop() {
    const top = this.a[0], last = this.a.length - 1;
    this.swap(0, last); this.a.pop(); this.p.pop();
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < this.a.length && this.less(l, m)) m = l;
      if (r < this.a.length && this.less(r, m)) m = r;
      if (m === i) break;
      this.swap(i, m); i = m;
    }
    return top;
  }
}
