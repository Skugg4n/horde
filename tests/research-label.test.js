import test from 'node:test';
import assert from 'node:assert/strict';
import { researchState } from '../src/ui/panels.js';
import { newProgress, buyResearch } from '../src/meta/progress.js';
import { researchNode } from '../src/data/research.js';

// 0.10.1 (speltestet av 0.10.0): kortet Faster Ksp 90 visade "II: 80" direkt efter köpet och senare
// "I: 80". Etiketten är nivån som köps härnäst, skriven "Level 2", och den är densamma vilket
// framsteg (samma köpta nivåer) den än ritas från.
const node = researchNode('m249Rate');

test('nästa nivå skrivs Level N och följer det köpta', () => {
  let p = { ...newProgress(), intel: 1000 };
  assert.match(researchState(p, node).text, /^Level 1: Buy \(40\)$/);
  p = buyResearch(p, 'm249Rate');
  const a = researchState(p, node).text;
  assert.match(a, /^Level 2: Buy \(80\)$/);
  // samma köpta nivåer i annan ordning, med en gammal platt post eller dubbletter: samma etikett
  for (const research of [[...p.research].reverse(), [...p.research, 'm249Rate'], [...p.research, ...p.research], ['m249Rate']]) {
    assert.equal(researchState({ ...p, research }, node).text, a, research.join(','));
  }
  // utan råd: samma nivå i texten
  assert.match(researchState({ ...p, intel: 10 }, node).text, /^Level 2: 80, need 70 more$/);
  p = buyResearch(buyResearch({ ...p, research: [...p.research, 'm2.1'] }, 'm249Rate'), 'm249Rate');
  assert.equal(researchState(p, node).text, 'Maxed');
});

// 0.10.1 (speltestet): köpkorten säger vad saken gör, på engelska efter det svenska namnet.
test('köpkorten: svenskt namn, vad den gör, skada och räckvidd', async () => {
  const { cardLines } = await import('../src/ui/panels.js');
  const { SHOP, shopItem } = await import('../src/data/shop.js');
  for (const it of SHOP) {
    const [head, stats] = cardLines(it);
    const words = it.role.split(/[\s·,]+/).filter(Boolean).length;
    assert.ok(words >= 2 && words <= 5, `${it.id}: "${it.role}"`);
    assert.ok(head.includes(' · '), head);
    // 0.10.2: samma form för varje vapen, så att korten går att jämföra
    if (it.kind === 'gun') assert.match(stats, /^DMG \d+( ×\d)? · RNG \d+ m · RATE \d+(\.\d)?\/s$/, it.id);
  }
  assert.equal(cardLines(shopItem('ksp58'))[0], 'Ksp 58 · General MG · 7.62');
  assert.equal(cardLines(shopItem('ksp58'))[1], 'DMG 10 · RNG 19 m · RATE 7/s');
  assert.equal(cardLines(shopItem('psg90'))[1], 'DMG 90 · RNG 34 m · RATE 0.6/s');
  assert.ok(!/\\u2014/.test(JSON.stringify(SHOP)));
});
