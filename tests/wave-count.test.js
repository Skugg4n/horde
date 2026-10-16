// 0.14.1 (speltestet av 0.14.0: "Wave 2: 12 walkers" mot "8 left", och i Gnesta "13 walkers" mot "22 left"):
// vågens rad och räknaren räknar samma zombier, också de vilande i husen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, startWave, debugJumpWave, waveLeft } from '../src/sim/sim.js';
import { MAPS } from '../src/data/maps.js';
import { waveText, waveSize, waveCounts } from '../src/ui/hud.js';

test('vågens rad, räknarens total och det som faktiskt släpps är samma tal, varje våg på varje bana', () => {
  for (const map of Object.values(MAPS)) for (const d of map.days) d.waves.forEach((w, i) => {
    const sim = createSim({ map, day: d.n, cash: 0, seed: 1 });
    if (i > 0) debugJumpWave(sim, i + 1);
    startWave(sim);
    const where = `${map.id} dag ${d.n} våg ${i + 1}`;
    assert.equal(waveLeft(sim), waveSize(d, i), where);
    const c = waveCounts(sim);
    assert.equal(c.total, waveSize(d, i), where);
    assert.equal(c.left, c.total, where);
    const inText = [...waveText(d, i).matchAll(/(\d+) \w+/g)].reduce((a, m) => a + Number(m[1]), 0);
    assert.equal(inText, waveSize(d, i), `${where}: ${waveText(d, i)}`);
  });
});
