// Operationskartan och förrådet (0.14.0, Operation Södermanland). Två skyltar mellan dagarna:
//   opMapSheet  en mörk lägeskarta över Södermanland i minikartans stil: sektorerna med läge (håller,
//               hotad, tystnad, håller ut) och tryck, senare sektorer gråa, inkorgen med ledningens
//               meddelanden, och vägen vidare till förrådet och nästa dag.
//   depotSheet  förrådet: kärntrupperna per sektor (nivå, påfyllnad, tillbaka till förrådet, omplacering),
//               rekvisitionen av det som är släppt i sektorn och förrådets uppgraderingar. Allt med RP.
// Bara bild och knappar: reglerna är src/meta/operation.js, och varje handling går genom handlers (main.js)
// som returnerar det nya framsteget.
import { MAPS } from '../data/maps.js';
import { WEAPONS } from '../data/weapons.js';
import { SECTORS, UNIT_RP, FROM_NAME, SUPPLY_BUDGET } from '../data/depot.js';
import { ROMAN } from '../data/research.js';
import { mapState } from '../meta/progress.js';
import { sectorStatus, pressureOf, PRESSURE_MAX, PRESSURE_HP, unitsIn, releasedTypes, maxMen, vetOf, levelCost, refillCost, returnValue,
  upgradeList, canRequisition, sectorOpen, openSectors, canReassign } from '../meta/operation.js';
import { shopItem } from '../data/shop.js';

const STATUS = {
  holding: { text: 'Holding', color: '#9fc46a' },
  threatened: { text: 'Threatened', color: '#e0603c' },
  silent: { text: 'Fallen silent', color: '#8a8070' },
  held: { text: 'Held', color: '#8fc4e8' },
  locked: { text: 'No contact yet', color: '#6d6655' },
  placeholder: { text: 'Later', color: '#4f4a3f' },
};
const name = type => WEAPONS[type]?.short ?? WEAPONS[type]?.name ?? type;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rp = n => `${n} RP`;

// Nästa dag i en sektor (den första som inte är vunnen), eller null när sektorn är klar eller låst.
export function nextDay(p, id) {
  if (!sectorOpen(p, id)) return null;
  const d = mapState(p, id).unlockedDay;
  return d <= MAPS[id].days.length ? d : null;
}

// ---------- kartan ----------
// Stiliserad Södermanland (0..1 över ytan): sjöar, kusten, E4, väg 57 och stambanan. Ingen exakt geografi,
// bara läget mellan orterna så som spelet berättar det.
const SEA = [[0.70, 1], [0.74, 0.86], [0.83, 0.78], [0.86, 0.66], [0.94, 0.6], [1, 0.52], [1, 1]];
const LAKES = [
  [[0.08, 0.5], [0.16, 0.44], [0.27, 0.47], [0.3, 0.56], [0.2, 0.63], [0.1, 0.6]],      // Båven
  [[0.5, 0.36], [0.55, 0.34], [0.57, 0.38], [0.52, 0.41]],                               // Sillen
  [[0.25, 0.74], [0.31, 0.71], [0.35, 0.76], [0.29, 0.8]],                               // Yngaren
  [[0.38, 0.3], [0.42, 0.28], [0.43, 0.32], [0.39, 0.34]],                               // Frösjön
];
const ROADS = [
  { pts: [[1, 0.2], [0.82, 0.33], [0.7, 0.44], [0.6, 0.52], [0.5, 0.64], [0.43, 0.78], [0.3, 0.92], [0.18, 1]], label: 'E4', at: [0.73, 0.4] },
  { pts: [[0.47, 0.3], [0.53, 0.42], [0.6, 0.52]], label: '57', at: [0.53, 0.46] },
  { pts: [[0.6, 0.53], [0.7, 0.63], [0.78, 0.72]], label: '218', at: [0.69, 0.66] },
];
const RAIL = [[1, 0.06], [0.78, 0.1], [0.62, 0.15], [0.47, 0.3], [0.3, 0.38], [0, 0.42]];
const TOWNS = [{ n: 'Södertälje', x: 0.93, y: 0.18 }, { n: 'Järna', x: 0.66, y: 0.48 }, { n: 'Flen', x: 0.12, y: 0.36 }];

function drawMap(cv, p, sel, t) {
  const g = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const X = x => 14 + x * (W - 28), Y = y => 14 + y * (H - 28);
  g.fillStyle = '#14160f'; g.fillRect(0, 0, W, H);
  // rutnät med koordinater
  g.strokeStyle = 'rgba(160,170,130,0.08)'; g.lineWidth = 1; g.font = '9px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(200,205,170,0.35)';
  for (let i = 0; i <= 8; i++) { const x = X(i / 8); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); if (i < 8) g.fillText(String.fromCharCode(65 + i), x + 3, 10); }
  for (let i = 0; i <= 6; i++) { const y = Y(i / 6); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); if (i < 6) g.fillText(String(i + 1), 3, y + 11); }
  const poly = (pts, fill, stroke) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); } };
  poly(SEA, 'rgba(70,90,95,0.35)', 'rgba(143,196,232,0.25)');
  for (const l of LAKES) poly(l, 'rgba(70,90,95,0.45)', 'rgba(143,196,232,0.2)');
  const line = (pts, color, w, dash = []) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash); g.stroke(); g.setLineDash([]); };
  line(RAIL, 'rgba(205,200,175,0.25)', 1, [5, 4]);
  for (const r of ROADS) {
    line(r.pts, r.label === 'E4' ? 'rgba(217,164,65,0.55)' : 'rgba(205,200,175,0.4)', r.label === 'E4' ? 2.2 : 1.3);
    g.fillStyle = 'rgba(217,164,65,0.8)'; g.font = '600 10px "IBM Plex Mono", monospace'; g.fillText(r.label, X(r.at[0]) + 4, Y(r.at[1]));
  }
  g.font = '10px Oswald, sans-serif'; g.fillStyle = 'rgba(200,205,170,0.45)';
  for (const tw of TOWNS) { g.fillRect(X(tw.x) - 1.5, Y(tw.y) - 1.5, 3, 3); g.fillText(tw.n.toUpperCase(), X(tw.x) + 5, Y(tw.y) + 3); }
  // sektorerna
  for (const s of SECTORS) {
    const st = sectorStatus(p, s.id), c = STATUS[st].color, x = X(s.x), y = Y(s.y), on = s.id === sel;
    const pr = pressureOf(p, s.id);
    if (st === 'threatened') { g.beginPath(); g.arc(x, y, 14 + 4 * Math.abs(Math.sin(t * 2.4)), 0, Math.PI * 2); g.strokeStyle = 'rgba(224,96,60,0.45)'; g.lineWidth = 2; g.stroke(); }
    g.beginPath(); g.arc(x, y, on ? 11 : 9, 0, Math.PI * 2);
    g.fillStyle = st === 'placeholder' || st === 'locked' ? 'rgba(20,22,15,0.9)' : c + '55'; g.fill();
    g.strokeStyle = c; g.lineWidth = on ? 2.5 : 1.5; g.setLineDash(st === 'placeholder' ? [3, 3] : []); g.stroke(); g.setLineDash([]);
    if (st === 'silent') { g.beginPath(); g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y + 6); g.moveTo(x + 6, y - 6); g.lineTo(x - 6, y + 6); g.strokeStyle = c; g.lineWidth = 1.5; g.stroke(); }
    g.font = `${on ? 600 : 500} 12px Oswald, sans-serif`; g.fillStyle = st === 'placeholder' ? 'rgba(200,205,170,0.35)' : '#e9dfc9';
    g.fillText(s.name.toUpperCase(), x + 15, y - 2);
    // trycket: fem romber, fyllda per tryckpunkt
    if (st === 'holding' || st === 'threatened') for (let i = 0; i < PRESSURE_MAX; i++) {
      const px = x + 19 + i * 9, py = y + 9;
      g.save(); g.translate(px, py); g.rotate(Math.PI / 4);
      g.strokeStyle = 'rgba(233,223,201,0.5)'; g.lineWidth = 1; g.strokeRect(-2.5, -2.5, 5, 5);
      if (i < pr) { g.fillStyle = '#e0603c'; g.fillRect(-2.5, -2.5, 5, 5); }
      g.restore();
    }
  }
}
const hitSector = (cv, ex, ey) => {
  const r = cv.getBoundingClientRect(), W = r.width, H = r.height;
  let best = null, bd = 22;
  for (const s of SECTORS) { const d = Math.hypot(ex - r.left - (14 + s.x * (W - 28)), ey - r.top - (14 + s.y * (H - 28))); if (d < bd) { bd = d; best = s.id; } }
  return best;
};

function sectorCard(p, id) {
  const s = SECTORS.find(x => x.id === id), st = sectorStatus(p, id), pr = pressureOf(p, id);
  const map = MAPS[id], day = map ? nextDay(p, id) : null;
  const units = map ? unitsIn(p, id) : [];
  const lines = [];
  if (st === 'placeholder') lines.push('No reports yet. More sectors coming.');
  else if (st === 'locked') lines.push(`Opens when ${MAPS[map.unlock.map].name} day ${map.unlock.day} is held.`);
  else if (st === 'silent' || st === 'held') lines.push(st === 'silent' ? map.outro?.text ?? '' : 'Every day here is held.');
  else {
    lines.push(`Day ${day} of ${map.days.length}: ${esc(map.days[day - 1].intro.title.split(':').slice(1).join(':').trim())}.`);
    lines.push(pr ? `Pressure ${pr} of ${PRESSURE_MAX}: they are ${Math.round(pr * PRESSURE_HP * 100)} % tougher here. Win a day here to ease it.` : 'Pressure none. Neglect it and it gets harder.');
    lines.push(units.length ? `${units.length} unit${units.length > 1 ? 's' : ''} assigned: ${units.map(u => name(u.type)).join(', ')}.` : 'No units assigned. Requisition or reassign at the depot.');
  }
  return `<div class="sc-h"><b>${esc(s.name)}</b><span class="tag" style="color:${STATUS[st].color}">${STATUS[st].text}</span></div>
    ${lines.map(l => `<p>${l}</p>`).join('')}
    ${day ? `<button type="button" class="act main" data-a="go"><span class="a">Day ${day}: to deployment</span><kbd>Enter</kbd></button>` : ''}`;
}

// handlers: { onGo(mapId), onDepot(mapId), onMenu(), onSeen() }
export function opMapSheet(root, progress, handlers) {
  const el = document.createElement('div');
  el.className = 'sheet plate opmap';
  root.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  const open = openSectors(progress).filter(id => nextDay(progress, id));
  let sel = open.includes(progress.mapId) ? progress.mapId : open[0] ?? progress.mapId;
  const inbox = [...progress.op.inbox].sort((a, b) => b.seq - a.seq);
  el.innerHTML = `
    <div class="oh"><div class="h">Operation Södermanland</div><div class="rp"><span>Requisition points</span><b>${progress.rp}</b></div></div>
    <div class="ob">
      <div class="mapwrap"><canvas></canvas><div class="legend">${['holding', 'threatened', 'held', 'silent'].map(k => `<span><i style="border-color:${STATUS[k].color}"></i>${STATUS[k].text}</span>`).join('')}<span><i class="pr"></i>Pressure</span></div></div>
      <div class="side">
        <div class="card sector" data-card></div>
        <div class="inbox"><div class="ih">Command <span>${inbox.filter(m => m.unread).length ? `${inbox.filter(m => m.unread).length} new` : ''}</span></div>
          <ul>${inbox.map(m => `<li class="${m.unread ? 'new' : ''}"><b>${esc(FROM_NAME[m.from] ?? m.from)}</b>${esc(m.text)}</li>`).join('') || '<li>No messages.</li>'}</ul></div>
      </div>
    </div>
    <div class="acts"><button type="button" class="act" data-a="depot"><span class="a">Depot</span><span class="p">Requisition · units · upgrades</span></button>
      <button type="button" class="act" data-a="menu"><span class="a">Main menu</span></button></div>`;
  const cv = el.querySelector('canvas'), card = el.querySelector('[data-card]');
  const renderCard = () => {
    card.innerHTML = sectorCard(progress, sel);
    card.querySelector('[data-a="go"]')?.addEventListener('click', () => handlers.onGo(sel));
  };
  renderCard();
  cv.addEventListener('click', e => { const id = hitSector(cv, e.clientX, e.clientY); if (id) { sel = id; renderCard(); } });
  el.querySelector('[data-a="depot"]').addEventListener('click', () => handlers.onDepot(sectorOpen(progress, sel) ? sel : null));
  el.querySelector('[data-a="menu"]').addEventListener('click', () => handlers.onMenu());
  let raf = 0, alive = true;
  const frame = now => { if (!alive) return; drawMap(cv, progress, sel, now / 1000); raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  handlers.onSeen?.();
  return { el, close: () => { alive = false; cancelAnimationFrame(raf); el.remove(); }, selected: () => sel };
}

// ---------- förrådet ----------
const STATE_TEXT = { rp: 'Not enough RP', closed: 'Sector closed', 'not released': 'Not released here', max: 'Max level', full: 'At full strength', locked: 'Not released yet' };
const upgradeText = (st) => {
  const t = st.node.tiers[(st.tier ?? st.node.tiers.length) - 1];
  if (st.id === 'budget') return `Every day starts with $ ${Math.round(t.cash * SUPPLY_BUDGET)} more supplies.`;
  return t.effect;
};
const upgradeName = id => ({ budget: 'Supply budget' })[id] ?? null;

// handlers: { act(kind, ...args) -> { ok, reason, progress }, onDone() }. sector: sektorn som visas först.
export function depotSheet(root, progress0, sector0, handlers) {
  const el = document.createElement('div');
  el.className = 'sheet plate depot';
  root.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('button, select')) e.stopPropagation(); });
  let p = progress0;
  const tabs = () => [...openSectors(p), ...(p.op.units.some(u => u.sector == null) ? [null] : [])];
  let sector = sector0 !== undefined && tabs().includes(sector0) ? sector0 : tabs()[0] ?? null;
  let msg = '', msgGood = false;
  function act(kind, ...args) {
    const r = handlers.act(kind, ...args);
    if (r.progress) p = r.progress;
    msg = r.ok ? (r.text ?? 'Done.') : (STATE_TEXT[r.reason] ?? 'Not possible.');
    msgGood = !!r.ok;
    render();
  }
  function unitRow(u) {
    const max = maxMen(u, p.research), lc = levelCost(u), rc = refillCost(p, u);
    const others = openSectors(p).filter(s => s !== u.sector && canReassign(p, u.uid, s).ok);
    return `<div class="urow" data-uid="${u.uid}">
      <div class="un"><b>${esc(name(u.type))}</b> <span class="lv">L${u.level}</span>${vetOf(u) ? '<span class="star" title="Veteran: slightly better aim and reload">★</span>' : ''}
        <span class="men">${u.men != null ? `${u.men} of ${max} men` : 'crew'}${u.wins ? ` · ${u.wins} day${u.wins > 1 ? 's' : ''} held` : ''}</span></div>
      <div class="ua">
        ${lc != null ? `<button type="button" class="mini ${p.rp < lc ? 'off' : ''}" data-a="lvl">Level ${ROMAN[u.level + 1]} <i>${rp(lc)}</i></button>` : '<span class="mini max">Max level</span>'}
        ${rc ? `<button type="button" class="mini ${p.rp < rc ? 'off' : ''}" data-a="refill">Refill <i>${rp(rc)}</i></button>` : ''}
        <button type="button" class="mini" data-a="return" title="${u.granted && !u.spent ? 'Send it back to command. It was given, so no RP back.' : 'Back to the depot for about half of the RP spent on it'}">Return${returnValue(u) ? ` <i>+${returnValue(u)}</i>` : ''}</button>
        ${others.length ? `<select data-a="move"><option value="">Reassign…</option>${others.map(s => `<option value="${s}">${esc(MAPS[s].name)}</option>`).join('')}</select>` : ''}
      </div></div>`;
  }
  function render() {
    const here = p.op.units.filter(u => u.sector === sector);
    const types = sector ? releasedTypes(p, sector) : [];
    const ups = upgradeList(p).filter(Boolean).filter(st => st.reason !== 'locked');
    el.innerHTML = `
      <div class="oh"><div class="h">Depot</div><div class="rp"><span>Requisition points</span><b>${p.rp}</b></div></div>
      <div class="tabs">${tabs().map(s => `<button type="button" class="tab ${s === sector ? 'on' : ''}" data-tab="${s ?? ''}">${s ? esc(MAPS[s].name) : 'Unassigned'} <span>${p.op.units.filter(u => u.sector === s).length}</span></button>`).join('')}</div>
      <div class="cols">
        <section><h4>${sector ? 'Units in ' + esc(MAPS[sector].name) : 'Unassigned units'}</h4>${here.map(unitRow).join('') || '<p class="muted">None. Requisition below, or reassign from another sector.</p>'}
          <p class="muted small">Units carry over between days. Losses only stand when you win. Levels are bought here, between days.</p></section>
        <section><h4>Requisition${sector ? ' for ' + esc(MAPS[sector].name) : ''}</h4>${sector ? types.map(t => {
          const c = canRequisition(p, t, sector), w = WEAPONS[t];
          return `<button type="button" class="req ${c.ok ? '' : 'off'}" data-req="${t}" title="${esc(w.desc)}"><b>${esc(name(t))}</b><span>${esc(shopItem(t)?.role ?? '')}</span><i>${rp(UNIT_RP[t])}</i></button>`;
        }).join('') || '<p class="muted">Nothing released here yet.</p>' : '<p class="muted">Pick a sector to requisition for it.</p>'}</section>
        <section><h4>Depot upgrades</h4>${ups.map(st => `<button type="button" class="req ${st.ok ? '' : 'off'}" data-up="${st.id}" ${st.tier == null ? 'disabled' : ''}>
          <b>${esc(upgradeName(st.id) ?? st.node.name)}${st.tier ? ` ${ROMAN[st.tier]}` : ''}</b><span>${esc(st.tier == null ? 'Maxed.' : upgradeText(st))}</span><i>${st.tier == null ? 'Max' : rp(st.cost)}</i></button>`).join('')}</section>
      </div>
      <div class="dmsg ${msg ? 'show' : ''} ${msgGood ? 'good' : ''}">${esc(msg)}</div>
      <div class="acts"><button type="button" class="act main" data-a="done"><span class="a">Done</span><kbd>Esc</kbd></button></div>`;
    for (const b of el.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { sector = b.dataset.tab || null; msg = ''; render(); });
    for (const r of el.querySelectorAll('.urow')) {
      const uid = Number(r.dataset.uid);
      r.querySelector('[data-a="lvl"]')?.addEventListener('click', () => act('level', uid));
      r.querySelector('[data-a="refill"]')?.addEventListener('click', () => act('refill', uid));
      r.querySelector('[data-a="return"]')?.addEventListener('click', () => act('return', uid));
      r.querySelector('[data-a="move"]')?.addEventListener('change', e => { if (e.target.value) act('reassign', uid, e.target.value); });
    }
    for (const b of el.querySelectorAll('[data-req]')) b.addEventListener('click', () => act('requisition', b.dataset.req, sector));
    for (const b of el.querySelectorAll('[data-up]')) b.addEventListener('click', () => act('upgrade', b.dataset.up));
    el.querySelector('[data-a="done"]').addEventListener('click', () => handlers.onDone());
  }
  render();
  return { el, close: () => el.remove(), progress: () => p };
}
