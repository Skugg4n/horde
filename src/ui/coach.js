// Lektionsplåten, fiendernas presentationsruta och Field manual (0.16.0, designen avsnitt 5). Bara bild och
// knappar: vad som visas och när bestämmer main.js (lektionerna i src/data/lessons.js, det sparade läget i
// src/meta/lessons.js).
//
// Plåten (avsnitt 5.2): skärmen dämpas med --ink utom ett hål runt målet (mjuk kant), fyra hörnvinklar i rost
// runt målet som pulserar långsamt, och plåten intill målet med en kort rak ledlinje. Ingen rubrik, ingen ikon,
// ingen stängknapp. Under en hård paus står PAUSED längst ned i mitten. Ett mål utanför bild får en chevron
// vid skärmkanten. Ett 'show'-steg släpps med klick, Enter eller Space; ett 'step' när handlingen är gjord.
import { MANUAL, MANUAL_GROUPS } from '../data/lessons.js';
import { ICONS } from './icons.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const keysHtml = keys => (keys ?? []).map(k => `<kbd>${esc(k)}</kbd>`).join(' ');

export function createCoach(root, { onRelease, onFewer }) {
  const el = document.createElement('div');
  el.id = 'coach'; el.hidden = true;
  el.innerHTML = `<div class="catch"></div><div class="hole"></div><div class="marks"><i></i><i></i><i></i><i></i></div><div class="lead"></div>
    <div class="cplate plate"><div class="ct"></div><button type="button" class="fewer" hidden>I know tower defence: fewer tips</button></div>
    <div class="edge"><i></i><i></i><i></i></div><div class="paused">PAUSED</div>`;
  root.appendChild(el);
  const hole = el.querySelector('.hole'), marks = el.querySelector('.marks'), lead = el.querySelector('.lead');
  const plate = el.querySelector('.cplate'), text = el.querySelector('.ct'), fewer = el.querySelector('.fewer'), edge = el.querySelector('.edge'), pausedEl = el.querySelector('.paused');
  plate.addEventListener('pointerdown', e => e.preventDefault());
  fewer.addEventListener('click', e => { e.stopPropagation(); onFewer?.(); fewer.hidden = true; });
  // Ett 'show'-steg släpps med ett klick var som helst (hålet fångar inte klicket: det dämpade lagret gör det)
  el.querySelector('.catch').addEventListener('click', () => { if (cur?.kind === 'show') onRelease?.(); });
  plate.addEventListener('click', () => { if (cur?.kind === 'show') onRelease?.(); });
  let cur = null, fadeT = 0;

  // step: { id, kind, text, keys, dim, pause, fewer }. rect: målets ruta på skärmen eller null (utanför bild: off).
  function show(step) {
    cur = step;
    el.hidden = false;
    el.className = 'k-' + step.kind + (step.dim ? ' dim' : '') + (step.pause ? ' pausing' : '');
    text.innerHTML = `${esc(step.text)}${step.keys?.length ? ' ' + keysHtml(step.keys) : ''}`;
    fewer.hidden = !step.fewer;
    pausedEl.hidden = !step.pause;
    fadeT = step.kind === 'caption' ? 4 : 0;
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  }
  function hide() { cur = null; el.hidden = true; }
  const PAD = 8;
  // Varje bildruta: målets ruta (rect), eller off: { x, y, angle } vid kanten när målet är utanför bild.
  function place(rect, { off = null, avoid = null } = {}) {
    if (!cur) return;
    const vw = innerWidth, vh = innerHeight;
    const r = rect ? { x0: rect.x0 - PAD, y0: rect.y0 - PAD, x1: rect.x1 + PAD, y1: rect.y1 + PAD } : null;
    hole.hidden = marks.hidden = !r;
    edge.hidden = !off;
    if (r) {
      Object.assign(hole.style, { left: r.x0 + 'px', top: r.y0 + 'px', width: (r.x1 - r.x0) + 'px', height: (r.y1 - r.y0) + 'px' });
      Object.assign(marks.style, { left: r.x0 + 'px', top: r.y0 + 'px', width: (r.x1 - r.x0) + 'px', height: (r.y1 - r.y0) + 'px' });
    }
    if (off) { edge.style.left = off.x + 'px'; edge.style.top = off.y + 'px'; edge.style.transform = `translate(-50%, -50%) rotate(${off.angle}rad)`; }
    // plåten: under, ovanför, till höger eller vänster om målet, där den ryms; aldrig över målet
    const pw = plate.offsetWidth, ph = plate.offsetHeight, g = 26;
    const t = r ?? (off ? { x0: off.x - 20, y0: off.y - 20, x1: off.x + 20, y1: off.y + 20 } : { x0: vw / 2 - 1, y0: vh / 2 - 1, x1: vw / 2 + 1, y1: vh / 2 + 1 });
    const cx = (t.x0 + t.x1) / 2, cy = (t.y0 + t.y1) / 2;
    const clampX = x => Math.max(12, Math.min(vw - pw - 12, x)), clampY = y => Math.max(12, Math.min(vh - ph - 40, y));
    const cands = [
      { x: clampX(cx - pw / 2), y: t.y1 + g, side: 'b' },
      { x: clampX(cx - pw / 2), y: t.y0 - g - ph, side: 't' },
      { x: t.x1 + g, y: clampY(cy - ph / 2), side: 'r' },
      { x: t.x0 - g - pw, y: clampY(cy - ph / 2), side: 'l' },
    ];
    const fits = c => c.x >= 8 && c.y >= 8 && c.x + pw <= vw - 8 && c.y + ph <= vh - 36;
    const hits = (c, a) => a && c.x < a.x1 && a.x0 < c.x + pw && c.y < a.y1 && a.y0 < c.y + ph;
    const best = cands.find(c => fits(c) && !hits(c, avoid)) ?? cands.find(fits) ?? { x: clampX(cx - pw / 2), y: clampY(cy + 40), side: 'b' };
    plate.style.left = Math.round(best.x) + 'px'; plate.style.top = Math.round(best.y) + 'px';
    // ledlinjen: från plåtens kant till målets kant, rak
    const L = { b: [best.x + pw / 2, best.y, cx, t.y1], t: [best.x + pw / 2, best.y + ph, cx, t.y0], r: [best.x, best.y + ph / 2, t.x1, cy], l: [best.x + pw, best.y + ph / 2, t.x0, cy] }[best.side];
    const len = Math.hypot(L[2] - L[0], L[3] - L[1]);
    lead.hidden = len < 4;
    Object.assign(lead.style, { left: L[0] + 'px', top: L[1] + 'px', width: len + 'px', transform: `rotate(${Math.atan2(L[3] - L[1], L[2] - L[0])}rad)` });
  }
  // Bildtexterna tonas bort efter 4 s; svar true när de är klara.
  function tick(dt) {
    if (!cur || cur.kind !== 'caption') return false;
    fadeT -= dt;
    if (fadeT < 0.6) el.style.opacity = Math.max(0, fadeT / 0.6);
    if (fadeT <= 0) { el.style.opacity = ''; return true; }
    return false;
  }
  return { el, show, hide, place, tick, get current() { return cur; }, plateRect: () => plate.getBoundingClientRect() };
}

// Fiendernas presentationsruta (Olas beslut 4): hård paus, porträttet, rapporten och Continue.
export function enemyCard(root, { title, report, portrait, onContinue }) {
  const el = document.createElement('div');
  el.id = 'enemycard';
  el.innerHTML = `<div class="sheet plate ecard"><div class="eh"><i></i>New enemy</div>
    <div class="eb">${portrait ? `<img alt="${esc(title)}" src="${portrait}">` : '<div class="noimg"></div>'}<div class="etext"><div class="h">${esc(title)}</div><p class="radio-l">${esc(report)}</p></div></div>
    <div class="acts"><button type="button" class="act main" data-a="continue"><span class="a">Continue</span><kbd>Enter</kbd></button></div></div>
    <div class="paused">PAUSED</div>`;
  root.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  el.querySelector('[data-a="continue"]').addEventListener('click', () => onContinue());
  return { el, close: () => el.remove() };
}

// Field manual (avsnitt 5.5): ett uppslag per begrepp i fem grupper, nya med en rostfärgad prick tills de
// öppnats, Show me spelar om lektionens markering. entries: upplåsta id, fresh: nya id, portrait(type).
export function manualSheet(root, { entries, fresh, portrait, onOpen, onShowMe, onClose, canShow }) {
  const el = document.createElement('div');
  el.id = 'manual';
  const have = MANUAL.filter(m => entries.includes(m.id));
  let sel = have.find(m => fresh.includes(m.id))?.id ?? have[0]?.id ?? null;
  function icon(m) {
    if (m.icon?.startsWith('enemy:')) { const src = portrait(m.icon.slice(6)); return src ? `<img class="mimg" alt="" src="${src}">` : ''; }
    return m.icon && ICONS[m.icon] ? `<div class="micon">${ICONS[m.icon]}</div>` : '';
  }
  function render() {
    const m = MANUAL.find(x => x.id === sel);
    el.innerHTML = `<div class="sheet plate msheet"><div class="mh"><div class="h">Field manual</div><button type="button" class="act" data-a="close"><span class="a">Close</span><kbd>J</kbd></button></div>
      <div class="mb"><nav>${MANUAL_GROUPS.map(g => { const list = have.filter(x => x.group === g); return list.length ? `<div class="mg"><div class="mgh">${g}</div>${list.map(x => `<button type="button" class="mi ${x.id === sel ? 'on' : ''} ${fresh.includes(x.id) ? 'fresh' : ''}" data-id="${x.id}">${esc(x.title)}</button>`).join('')}</div>` : ''; }).join('') || '<p class="muted">Nothing yet. Entries are added as you learn.</p>'}</nav>
      <article>${m ? `${icon(m)}<div class="h2">${esc(m.title)}</div><p>${esc(m.text)}</p>${m.keys?.length ? `<p class="mkeys">${keysHtml(m.keys)}</p>` : ''}${canShow?.(m.id) ? '<button type="button" class="act" data-a="show"><span class="a">Show me</span></button>' : ''}` : ''}</article></div></div>`;
    for (const b of el.querySelectorAll('[data-id]')) b.addEventListener('click', () => { sel = b.dataset.id; onOpen?.(sel); fresh = fresh.filter(id => id !== sel); render(); });
    el.querySelector('[data-a="close"]').addEventListener('click', () => onClose());
    el.querySelector('[data-a="show"]')?.addEventListener('click', () => onShowMe?.(sel));
  }
  root.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  if (sel) onOpen?.(sel);
  fresh = fresh.filter(id => id !== sel);
  render();
  return { el, close: () => el.remove() };
}
