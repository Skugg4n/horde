import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH } from '../src/data/research.js';
import { WEAPONS } from '../src/data/weapons.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { MAPS } from '../src/data/maps.js';
import { BASE_GUNS, maxGuns } from '../src/sim/stats.js';
import { squadSize } from '../src/sim/squad.js';

// 0.10.2 (speltestet av 0.10.1: "More positions" och "Ksp 88" sade emot spelet): varje nivås text
// ska säga det nivåns siffror gör. Provet läser siffrorna och letar efter dem i texten.
const pct = m => `${Math.round((m - 1) * 100)} %`;
const times = m => (m === 2 ? 'twice' : m === 3 ? 'three times' : null);
const word = n => ['zero', 'one', 'two', 'three', 'four'][n];

for (const node of RESEARCH) {
  test(`forskningen ${node.name}: texten följer siffrorna på varje nivå`, () => {
    node.tiers.forEach((t, i) => {
      const e = t.effect, at = `${node.name} ${i + 1}: "${e}"`;
      assert.ok(e && !/\u2014/.test(e), at);
      // multiplikatorer: procent, eller "twice"/"three times" för hela gånger
      for (const [k, verb] of [['damage', 'harder'], ['rate', 'faster'], ['hp', null], ['durability', null], ['gDamage', 'harder'], ['gRadius', 'wider']]) {
        const m = t[k];
        if (m == null || node.id === 'grenade' && k === 'damage') continue;
        const ok = (times(m) && e.includes(times(m))) || e.includes(pct(m) + (verb ? ' ' + verb : ''));
        assert.ok(ok, `${at} saknar ${k} ${m}`);
      }
      if (node.id === 'grenade') {
        assert.ok(e.includes(`${t.damage} damage`) && e.includes(`${t.radius} m`), at);
        assert.equal(/two grenades/.test(e), t.count === 2, at);
      }
      if (t.cash != null) assert.ok(e.includes(`$ ${t.cash}`), at);
      if (t.gCooldown != null) assert.ok(e.includes(`${t.gCooldown} seconds`), at);
      if (t.pierce != null) assert.ok(e.includes(`pierces ${word(t.pierce)}`), at);
      if (t.men != null) assert.ok(e.toLowerCase().startsWith(`${word(t.men)} more`), at);
      if (node.id === 'positions') {
        const have = maxGuns(node.tiers.slice(0, i + 1).map((_, j) => `positions.${j + 1}`));
        assert.equal(t.guns, have, at);
        assert.ok(e.includes(`${have} instead of ${i ? node.tiers[i - 1].guns : BASE_GUNS}`), at);
      }
      // första nivån i en vapen- eller hindernod låser upp den, och säger det
      if (i === 0 && WEAPONS[node.id]) assert.match(e, /^New gun/, at);
      if (i === 0 && OBSTACLES[node.id]) assert.match(e, /^New obstacle/, at);
      // ger en bana saken utan forskning, säger texten det (och vad köpet ändå ger)
      if (i === 0 && Object.values(MAPS).some(m => m.unlocks?.includes(node.id))) assert.match(e, /Gnesta lends it anyway/, at);
    });
  });
}

test('Bigger squad: antalet man i texten är det gruppen får', () => {
  assert.equal(squadSize(1, ['hvSquad.1']), squadSize(1) + 1);
  assert.equal(squadSize(1, ['hvSquad.2']), squadSize(1) + 2);
});

// 0.10.2 (speltestet: Psg 90 kostade 420 i forskning, testaren tjänade ca 410 på 40 minuter): vägen dit
// från noll, med alla krav, kostar högst 300.
test('vägen till Psg 90 kostar högst 300 forskning', async () => {
  const { researchNode } = await import('../src/data/research.js');
  const cost = new Map();
  const need = req => { const [id, t] = req.split('.'); for (let i = 0; i < Number(t); i++) add(id, i); };
  const add = (id, i) => { const k = `${id}.${i + 1}`; if (cost.has(k)) return; const tier = researchNode(id).tiers[i]; cost.set(k, tier.cost); tier.requires.forEach(need); };
  need('psg90.1');
  const total = [...cost.values()].reduce((a, b) => a + b, 0);
  assert.ok(total <= 300, `Psg 90 kostar ${total} (${[...cost.keys()].join(', ')})`);
});
