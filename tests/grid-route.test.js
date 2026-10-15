import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, placeObstacle, removeObstacle } from '../src/sim/sim.js';
import { gridFromAscii, makeGrid, BARRICADE_COST } from '../src/sim/grid.js';
import { makeFlow } from '../src/sim/flow.js';
import { gridRoute } from '../src/sim/route.js';
import { makeRng } from '../src/sim/rng.js';

// Ett kvarter: huvudgatan (rad 3) rakt mot basen B, och en slinga runt kvarteret (rad 1).
// Slingan är 4 rutor längre. Zombierna kommer in vid a.
const BLOCK = [
  '###########',
  '#.........#',
  '#.#######.#',
  'B.........a',
  '###########',
];
const data = gridFromAscii(BLOCK);
const key = (i, j) => j * data.w + i;
const DT = 1 / 30;
const mapWith = (groups, extra = {}) => ({
  id: 'test', grid: data, baseHp: 20, slots: [], ...extra,
  days: [{ n: 1, startCash: 0, waves: [{ groups }] }],
});
const one = (type = 'walker') => mapWith([{ type, count: 1, interval: 1, delay: 0 }]);
const mk = (map, o = {}) => createSim({ map, day: 1, cash: 5000, research: ['block'], seed: 7, ...o });

// Kör tills vågen är slut eller tiden tar slut. Loggar rutorna zombierna går genom.
function play(sim, secs = 300, each = null) {
  const visited = new Set();
  startWave(sim);
  for (let t = 0; t < secs * 30 && sim.phase === 'wave'; t++) {
    step(sim, DT);
    for (const z of sim.zombies) if (!z.dead) {
      visited.add(z.cell);
      if (each) each(sim, z);
    }
  }
  return visited;
}
const row = (visited, j) => [...visited].filter(k => Math.floor(k / data.w) === j);

test('flödesfältet: kortaste vägen, fast grannordning, samma fält varje gång', () => {
  const g = makeGrid(data), f = makeFlow(g);
  f.compute(g.costs({}));
  assert.equal(f.dist[key(10, 3)], 100);       // tio gatrutor in till basen
  assert.equal(f.next[key(9, 3)], key(8, 3));
  assert.equal(f.next[key(0, 3)], -1);          // basen
  assert.equal(f.dist[key(0, 0)], Infinity);    // stängd ruta
  const again = makeFlow(g); again.compute(g.costs({}));
  assert.deepEqual([...again.next], [...f.next]);
});

test('cykelväg kostar lite mer än gata', () => {
  const g = makeGrid(gridFromAscii(['B..a', 'B::a'].map(r => r), {}));
  assert.equal(g.terrainOf(1), 1);
  assert.equal(g.terrainOf(5), 2);
  assert.ok(g.costs({})[5] > g.costs({})[1]);
});

test('tom gata: horden tar huvudgatan och når basen', () => {
  const sim = mk(one());
  const visited = play(sim, 60);
  assert.equal(sim.phase, 'won');
  assert.equal(sim.baseHp, 19);
  assert.equal(row(visited, 1).length, 0, 'ingen gick slingan');
});

test('barrikad på huvudgatan: horden går runt kvarteret', () => {
  const sim = mk(one());
  assert.equal(placeObstacle(sim, key(5, 3), 'block').ok, true);
  const visited = play(sim, 60);
  assert.equal(sim.baseHp, 19, 'zombien kom fram');
  assert.ok(row(visited, 1).length >= 8, 'gick slingan');
  assert.equal(visited.has(key(5, 3)), false);
  assert.equal(sim.obstacles[key(5, 3)].hp, sim.obstacles[key(5, 3)].maxHp, 'barrikaden orörd');
});

test('båda vägarna stängda: horden slår sig igenom närmaste barrikaden', () => {
  const sim = mk(one('brute'));
  placeObstacle(sim, key(5, 3), 'block');
  placeObstacle(sim, key(5, 1), 'block');
  const hits = [];
  let stood = null;
  startWave(sim);
  for (let t = 0; t < 120 * 30 && sim.phase === 'wave'; t++) {
    step(sim, DT);
    for (const e of sim.events) if (e.t === 'obstacleHit' || e.t === 'obstacleBroken') hits.push(e);
    const z = sim.zombies[0];
    if (z && z.attacking && !stood) stood = { x: z.x, z: z.z, cell: z.cell };
  }
  assert.ok(hits.length && hits.every(e => e.cell === key(5, 3)), 'bara huvudgatans barrikad');
  assert.ok(hits.some(e => e.t === 'obstacleBroken'));
  assert.equal(stood.cell, key(6, 3), 'stod framför barrikaden');
  assert.ok(stood.x >= 12 + 0.25 && stood.x <= 12 + 0.6 + 1e-9, `vid kanten, x ${stood.x}`);
  assert.ok(sim.obstacles[key(5, 1)], 'slingans barrikad står kvar');
  assert.equal(sim.baseHp, 19, 'kom fram efter genombrottet');
});

test('en zombie som skulle passera barrikaden i ett enda steg stannar framför den', () => {
  const sim = mk(one());
  placeObstacle(sim, key(5, 3), 'block');
  placeObstacle(sim, key(5, 1), 'block');
  startWave(sim);
  step(sim, DT);
  const z = sim.zombies[0];
  Object.assign(z, { x: 13.5, z: 7, cell: key(6, 3) });
  step(sim, 1);
  assert.equal(z.cell, key(6, 3));
  assert.ok(z.x >= 12 && z.attacking);
});

test('taggtråd bromsar men styr inte om; mycket taggtråd gör det', () => {
  const plain = mk(one()), wired = mk(one()), heavy = mk(one());
  placeObstacle(wired, key(5, 3), 'wire');
  for (const i of [4, 5, 6]) placeObstacle(heavy, key(i, 3), 'wire');
  const arrive = sim => { const v = play(sim, 60); return { v, t: sim.time }; };
  const a = arrive(plain), b = arrive(wired), c = arrive(heavy);
  assert.equal(row(b.v, 1).length, 0, 'en tråd: samma väg');
  assert.ok(b.t > a.t + 0.5, `tråden bromsar (${a.t.toFixed(1)} s mot ${b.t.toFixed(1)} s)`);
  assert.ok(row(c.v, 1).length >= 8, 'tre trådar: slingan är billigare');
});

test('barrikaden räknas om när den rivs och när den slås sönder', () => {
  const sim = mk(one());
  const r = sim.route;
  placeObstacle(sim, key(5, 3), 'block');
  assert.equal(r.flow.next[key(9, 3)], key(9, 2), 'runt kvarteret');
  assert.ok(r.flow.dist[key(10, 3)] < BARRICADE_COST);
  removeObstacle(sim, key(5, 3));
  assert.equal(r.flow.next[key(9, 3)], key(8, 3), 'rakt igen');
  assert.deepEqual(placeObstacle(sim, key(0, 3), 'block'), { ok: false, reason: 'okänd' }, 'inte på basen');
  assert.deepEqual(placeObstacle(sim, key(0, 0), 'block'), { ok: false, reason: 'okänd' }, 'inte på en tomt');
});

test('flera spawns: group.spawn väljer ingång', () => {
  const two = gridFromAscii([
    '#####b#',
    '#.....#',
    '#.###.#',
    'B.....a',
  ]);
  const map = { id: 't', grid: two, baseHp: 20, slots: [],
    days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count: 1, interval: 1, delay: 0, spawn: 'b' }, { type: 'walker', count: 1, interval: 1, delay: 0 }] }] }] };
  const sim = createSim({ map, day: 1, cash: 0, seed: 1 });
  startWave(sim); step(sim, DT);
  assert.deepEqual(sim.zombies.map(z => z.spawn).sort(), ['a', 'b']);
  for (let t = 0; t < 60 * 30 && sim.phase === 'wave'; t++) step(sim, DT);
  assert.equal(sim.phase, 'won');
  assert.equal(sim.baseHp, 18);
});

test('sidoförskjutning: horden går inte på ett led, och står alltid på gångbar mark', () => {
  const wide = gridFromAscii([
    '#########',
    '.........',
    'B...a....',
    '.........',
    '#########',
  ], { baseRadius: 2, spawnRadius: 2 });
  const map = { id: 't', grid: wide, baseHp: 99, slots: [],
    days: [{ n: 1, startCash: 0, waves: [{ groups: [{ type: 'walker', count: 20, interval: 0.3, delay: 0 }] }] }] };
  const sim = createSim({ map, day: 1, cash: 0, seed: 3 });
  const g = sim.route.grid, zs = new Set();
  startWave(sim);
  for (let t = 0; t < 60 * 30 && sim.phase === 'wave'; t++) {
    step(sim, DT);
    for (const z of sim.zombies) if (!z.dead) {
      assert.ok(g.walkable(g.keyAt(z.x, z.z)), `zombie ${z.id} på stängd mark`);
      zs.add(Math.round(z.z * 10));
    }
  }
  assert.ok(zs.size > 10, `spridning i sidled: ${zs.size} olika z`);
});

test('determinism: samma seed ger samma förlopp, annan seed ett annat', () => {
  const map = mapWith([{ type: 'walker', count: 10, interval: 0.5, delay: 0 }, { type: 'runner', count: 6, interval: 0.7, delay: 2 }]);
  const trace = seed => {
    const sim = mk(map, { seed });
    placeObstacle(sim, key(5, 3), 'wire');
    const out = [];
    play(sim, 60, (s, z) => out.push(z.id, z.x.toFixed(6), z.z.toFixed(6)));
    return out.join(',');
  };
  assert.equal(trace(11), trace(11));
  assert.notEqual(trace(11), trace(12));
});

test('gridRoute.ahead gissar samma läge som zombien sedan når', () => {
  const r = gridRoute({ grid: data });
  const z = r.spawn(makeRng(2));
  const guess = r.ahead(z, 5);
  r.advance(z, 5);
  assert.ok(Math.hypot(guess.x - z.x, guess.z - z.z) < 1e-9);
});
