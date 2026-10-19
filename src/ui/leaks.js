// Läckorna (0.19.2, speltestet av 0.19.1, fynd 2: "vandrare gick förbi mitt kluster till basen från cirka 270 s, tre
// försök i rad, men det syntes inte vilken väg som läckte förrän basen tog skada"). Läser simuleringen, ändrar inget i
// den. En zombie läcker när den
//   - har varit inom någon enhets räckvidd och sikt, är utom allas sedan LEAK.hold s, har kommit närmare basen och
//     ingen enhet täcker resten av dess väg till basen (ahead): den har tagit sig förbi de sista försvararna. Läckan är
//     där den sist var under eld. (Utan ahead räcker de två första villkoren.)
//   - aldrig varit under eld och är LEAK.near m från basen (vägen var tom): läckan är där den är.
// Läckor på samma gata inom LEAK.gap s slås ihop till en. where(id) säger varifrån en zombie som når basen kom.
export const LEAK = { sample: 0.25, hold: 1.2, near: 34, gap: 8 };

export function createLeakWatch() {
  const st = new Map();          // zombiens id -> { ever, last, out, told, leak, far }
  const told = new Map();        // gata -> när den senast sades
  let acc = 0, sim = null;
  function reset() { st.clear(); told.clear(); acc = 0; sim = null; }
  // covered(z, p): är zombien i p under eld just nu; ahead(z): täcker någon enhet resten av zombiens väg (true/false,
  // eller null när vägen inte är känd); base: { x, z }; streetOf(x, z): gatans namn eller null.
  // Returnerar de nya läckorna: [{ x, z, street, n }].
  function update(s, dt, { covered, ahead = null, base, streetOf, time = 0 }) {
    if (s !== sim) { reset(); sim = s; }
    acc += dt;
    if (acc < LEAK.sample) return [];
    const step = acc; acc = 0;
    const dBase = p => Math.hypot(p.x - base.x, p.z - base.z);
    const fresh = [];
    const alive = new Set();
    for (const z of s.zombies) {
      if (z.dead) continue;
      alive.add(z.id);
      const p = s.route.place(z);
      let q = st.get(z.id);
      if (!q) { q = { ever: false, last: null, out: 0, told: false, far: null }; st.set(z.id, q); }
      const d = dBase(p);
      if (d > LEAK.near) q.far = { x: p.x, z: p.z };
      if (q.told) continue;
      if (covered(z, p)) { q.ever = true; q.last = { x: p.x, z: p.z }; q.out = 0; continue; }
      if (q.ever) {
        q.out += step;
        if (q.out >= LEAK.hold && d < dBase(q.last) - 2 && ahead?.(z) !== true) { q.told = true; q.leak = q.last; fresh.push(q.last); }
      } else if (d < LEAK.near) { q.told = true; q.leak = { x: p.x, z: p.z }; fresh.push(q.leak); }
    }
    // de som dött eller nått basen sedan förra provet (where läses i handleEvents, före nästa prov)
    for (const id of [...st.keys()]) if (!alive.has(id)) st.delete(id);
    // en rad per gata och stund
    const out = [];
    for (const p of fresh) {
      const street = streetOf(p.x, p.z);
      const key = street ?? `${Math.round(p.x / 20)},${Math.round(p.z / 20)}`;
      const same = out.find(o => o.key === key);
      if (same) { same.n++; continue; }
      if (time - (told.get(key) ?? -Infinity) < LEAK.gap) continue;
      told.set(key, time);
      out.push({ key, x: p.x, z: p.z, street, n: 1 });
    }
    return out;
  }
  // Varifrån zombien kom: läckans plats om den läckte, annars den sista platsen långt från basen.
  function where(id) { const q = st.get(id); return q ? q.leak ?? q.far : null; }
  return { update, where, reset };
}
// ahead för update: täcker covers(x, z) någon ruta (var annan) på zombiens väg härifrån till basen? En gång per ruta
// och prov. null på banor utan rutnät (E4), där räcker de andra villkoren.
export function aheadOf(sim, covers) {
  const cache = new Map();
  return z => {
    if (!sim.route.pathFrom || z.cell == null) return null;
    if (cache.has(z.cell)) return cache.get(z.cell);
    const cells = sim.route.pathFrom(z.cell);
    let hit = false;
    for (let i = 0; i < cells.length && !hit; i += 2) { const c = sim.route.cellCenter(cells[i]); hit = covers(c.x, c.z); }
    cache.set(z.cell, hit);
    return hit;
  };
}
