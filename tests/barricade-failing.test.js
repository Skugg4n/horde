import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, step, placeObstacle, placeAcross, BARRICADE_FAILING } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';

// 0.12.1 (speltestet av 0.12.0: barrikadernas stapel och "Barricade failing" syntes aldrig): en spärr
// varnar en gång (barricadeFailing) när dess svagaste ruta har mindre än en fjärdedel kvar, före
// obstacleBroken. Tvingat läge: en spärr som horden måste slå sig igenom.
function runUntilBroken(sim, maxSecs = 400) {
  const seen = [];
  startWave(sim);
  for (let i = 0; i < maxSecs * 30 && !seen.some(e => e.t === 'obstacleBroken' && e.type === 'block'); i++) {
    // horden ska nå spärren: inga pjäser, och kassan räcker inte till något annat
    step(sim, 1 / 30);
    for (const e of sim.events) if (e.t === 'barricadeFailing' || e.t === 'obstacleBroken') seen.push({ ...e, at: sim.time, hp: e.t === 'barricadeFailing' ? sim.obstacles[e.cell]?.hp / sim.obstacles[e.cell]?.maxHp : null });
  }
  return seen;
}

test('E4: betongblocket varnar en gång under en fjärdedel, före det går sönder', () => {
  const sim = createSim({ map: MAPS.riksvagen, day: 1, cash: 2000, research: ['block'], seed: 5 });
  assert.ok(placeObstacle(sim, 0, 'block').ok);
  const seen = runUntilBroken(sim);
  const warn = seen.filter(e => e.t === 'barricadeFailing');
  const broke = seen.find(e => e.t === 'obstacleBroken');
  assert.ok(broke, 'blocket gick sönder');
  assert.equal(warn.length, 1, 'en varning');
  assert.ok(warn[0].at <= broke.at, 'varningen före brottet');
  assert.ok(warn[0].hp > 0 && warn[0].hp < BARRICADE_FAILING, `kvar ${warn[0].hp}`);
});

test('Gnesta: en spärr tvärs över gatan varnar en gång, på sin svagaste ruta', () => {
  const map = MAPS.gnesta, sim = createSim({ map, day: 1, cash: 5000, research: [], seed: 3 });
  // varje väg in spärras nära basen: allt är stängt, så horden slår sig igenom den närmaste (H023)
  for (let n = 0; n < 8; n++) {
    const open = sim.route.paths(sim.route.spawns.map(q => q.id), sim.obstacles).filter(p => p.cells.length && !p.cells.some(c => sim.obstacles[c]));
    if (!open.length) break;
    const c = open[0].cells;
    let ok = false;
    for (let i = c.length - 4; i > 0 && !ok; i--) ok = placeAcross(sim, c[i], 'block').ok;
    assert.ok(ok, 'en spärr till');
  }
  const seen = runUntilBroken(sim, 600);
  const warn = seen.filter(e => e.t === 'barricadeFailing');
  const broke = seen.find(e => e.t === 'obstacleBroken');
  assert.ok(broke, 'horden slog sig igenom');
  assert.equal(warn.length, 1);
  assert.ok(warn[0].line != null, 'spärrens id');
  assert.ok(warn[0].at <= broke.at);
});
