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
import { SECTORS, UNIT_RP, FROM_NAME, SUPPLY_BUDGET, poolOf } from '../data/depot.js';
import { ROMAN } from '../data/research.js';
import { mapState } from '../meta/progress.js';
import { sectorStatus, pressureOf, PRESSURE_MAX, PRESSURE_HP, unitsIn, maxMen, vetOf, levelCost, refillCost, returnValue,
  upgradeList, canRequisition, sectorOpen, openSectors, canReassign, canReturn, stockOf, stockTypes, garrisonOf, garrisonLine, PRESSURE_UNDERMANNED, deployWarning, currentMap, reassignActive } from '../meta/operation.js';
import { shopItem, SHOP } from '../data/shop.js';
import { metaFeatures } from '../meta/unlocks.js';
import { ICONS } from './icons.js';

const STATUS = {
  holding: { text: 'Holding', color: '#9fc46a' },
  threatened: { text: 'Threatened', color: '#e0603c' },
  // 0.16.0 (textgenomgången, speltestet av 0.14.2: VICTORY bredvid "fallen silent" och ett kryss lästes som
  // en förlust): E4 är tillbakadragen på order, grå utan kryss
  silent: { text: 'Secure', color: '#8a8070' },
  held: { text: 'Held', color: '#8fc4e8' },
  locked: { text: 'No contact yet', color: '#6d6655' },
  placeholder: { text: 'Later', color: '#4f4a3f' },
};
const name = type => WEAPONS[type]?.short ?? WEAPONS[type]?.name ?? type;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rp = n => `${n} RP`;

// Nästa dag i en sektor (den första som inte är vunnen), eller null när sektorn är klar eller låst.
export function nextDay(p, id) {
  if (!MAPS[id] || !sectorOpen(p, id)) return null;
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

function drawMap(cv, p, sel, t, meta = metaFeatures(p)) {
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
    g.font = `${on ? 600 : 500} 12px Oswald, sans-serif`; g.fillStyle = st === 'placeholder' ? 'rgba(200,205,170,0.35)' : st === 'silent' ? 'rgba(233,223,201,0.5)' : '#e9dfc9';
    g.fillText(s.name.toUpperCase(), x + 15, y - 2);
    // trycket: fem romber, fyllda per tryckpunkt
    // 0.16.0: trycket syns när två sektorer är öppna (inlärningen, efter South dag 4)
    if ((st === 'holding' || st === 'threatened') && reassignActive(p)) for (let i = 0; i < PRESSURE_MAX; i++) {
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

// 0.16.0 (textgenomgången, designen avsnitt 6): kortet säger dagen, trycket som en kort rad när sektorerna är
// upplåsta, och enheterna som ikoner med antal. Knappen går till förrådet när det är öppet, annars till dagen.
function unitIcons(units) {
  const n = {};
  for (const u of units) n[u.type] = (n[u.type] ?? 0) + 1;
  return Object.entries(n).map(([t, k]) => `<span class="uic" title="${esc(name(t))}">${ICONS[t] ?? ''}<b>${k > 1 ? '×' + k : ''}</b><i>${esc(name(t))}</i></span>`).join('');
}
function sectorCard(p, id, meta) {
  // 0.16.0 (Olas beslut, "Gnesta = en sektor"): Hagstumosse är en sektor med två faser; kortet visar fasen
  // som strider nu (Ishallen eller Vikingavägen) och dess dag.
  const s = SECTORS.find(x => x.id === id), st = sectorStatus(p, id), pr = pressureOf(p, id);
  const mid = s?.maps ? currentMap(p, id) ?? s.maps[0] : null, map = mid ? MAPS[mid] : null, day = map ? nextDay(p, mid) : null;
  const units = map ? unitsIn(p, id) : [];
  const lines = [];
  if (st === 'placeholder') lines.push('No reports yet.');
  else if (st === 'locked') lines.push(`Opens when ${MAPS[map.unlock.map].name} day ${map.unlock.day} is held.`);
  else if (st === 'silent') lines.push('Secure. The army has moved on.');
  else if (st === 'held') lines.push('Every day here is held.');
  else {
    lines.push(`${esc(map.name)}, day ${day} of ${map.days.length}: ${esc(map.days[day - 1].intro.title.split(':').slice(1).join(':').trim())}.`);
    if (reassignActive(p)) lines.push(pr ? `Pressure: ${Math.round(pr * PRESSURE_HP * 100)} % tougher here.` : 'No pressure.');
  }
  const icons = units.length && (st === 'holding' || st === 'threatened') ? `<div class="uics">${unitIcons(units)}</div>` : '';
  return `<div class="sc-h"><b>${esc(s.full ?? s.name)}</b><span class="tag" style="color:${STATUS[st].color}">${STATUS[st].text}</span></div>
    ${lines.map(l => `<p>${l}</p>`).join('')}${icons}
    ${day ? `<button type="button" class="act main" data-a="go"><span class="a">Day ${day}${meta.has('depot') ? ': Requisition' : ''}</span><kbd>Enter</kbd></button>` : ''}`;
}

// handlers: { onGo(mapId), onDepot(mapId), onMenu(), onSeen() }
// 0.16.0 (inlärningen): kartan i minsta form först (en sektor, en knapp, ledningens senaste meddelande); RP,
// förrådet och trycket kommer i schemats takt (src/meta/unlocks.js). Main menu ligger i menyn uppe i hörnet.
export function opMapSheet(root, progress, handlers) {
  const el = document.createElement('div');
  el.className = 'sheet plate opmap';
  root.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  const meta = metaFeatures(progress);
  const open = openSectors(progress).filter(id => currentMap(progress, id));
  let sel = open.includes(poolOf(progress.mapId)) ? poolOf(progress.mapId) : open[0] ?? poolOf(progress.mapId);
  const latest = [...progress.op.inbox].sort((a, b) => b.seq - a.seq)[0];
  const multi = reassignActive(progress);
  const legend = ['holding', ...(multi ? ['threatened'] : []), 'held', 'silent'];
  el.innerHTML = `
    <div class="oh"><div class="h">Operation Södermanland</div>${meta.has('rp') ? `<div class="rp"><span>Requisition points</span><b>${progress.rp}</b></div>` : ''}</div>
    <div class="ob">
      <div class="mapwrap"><canvas></canvas><div class="legend">${legend.map(k => `<span><i style="border-color:${STATUS[k].color}"></i>${STATUS[k].text}</span>`).join('')}${multi ? '<span><i class="pr"></i>Pressure</span>' : ''}</div></div>
      <div class="side">
        <div class="card sector" data-card></div>
        ${latest ? `<div class="inbox"><div class="ih">Command <span>${latest.unread ? 'new' : ''}</span></div>
          <ul><li class="${latest.unread ? 'new' : ''}"><b>${esc(FROM_NAME[latest.from] ?? latest.from)}</b>${esc(latest.text)}</li></ul></div>` : ''}
      </div>
    </div>
    <div class="flow"><span class="on">Operations map</span><i>›</i>${meta.has('depot') ? '<span>Requisition</span><i>›</i>' : ''}<span>Deploy</span></div>
    ${meta.has('depot') ? '<div class="acts"><button type="button" class="act" data-a="depot"><span class="a">Depot</span><span class="p">Units and upgrades</span></button></div>' : ''}`;
  const cv = el.querySelector('canvas'), card = el.querySelector('[data-card]');
  const renderCard = () => {
    card.innerHTML = sectorCard(progress, sel, meta);
    card.querySelector('[data-a="go"]')?.addEventListener('click', () => handlers.onGo(sel));
  };
  renderCard();
  cv.addEventListener('click', e => { const id = hitSector(cv, e.clientX, e.clientY); if (id) { sel = id; renderCard(); } });
  el.querySelector('[data-a="depot"]')?.addEventListener('click', () => handlers.onDepot(currentMap(progress, sel) ?? null));
  let raf = 0, alive = true;
  const frame = now => { if (!alive) return; drawMap(cv, progress, sel, now / 1000, meta); raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  handlers.onSeen?.();
  return { el, close: () => { alive = false; cancelAnimationFrame(raf); el.remove(); }, selected: () => sel };
}

// ---------- förrådet ----------
const STATE_TEXT = { rp: 'Not enough RP', closed: 'Sector closed', 'not released': 'Not released here', none: 'None released', max: 'Max level', full: 'At full strength', locked: 'Not yet', cap: 'Not released yet',
  last: 'The last unit here was given by command: returning it leaves the sector empty with no RP back.' };
const upgradeText = (st) => {
  const t = st.node.tiers[(st.tier ?? st.node.tiers.length) - 1];
  if (st.id === 'budget') return `Every day starts with $ ${Math.round(t.cash * SUPPLY_BUDGET)} more supplies.`;
  return t.effect;
};
const upgradeName = id => ({ budget: 'Supply budget' })[id] ?? null;

// handlers: { act(kind, ...args) -> { ok, reason, progress }, onDone(), onDeploy() }. sector: sektorn som visas först.
// 0.14.1 (speltestet av 0.14.0: förrådet var lätt att gå förbi): deploy = { day } när förrådet är steget
// mellan kartan och dagen; då är huvudknappen Deploy (Enter) och Operations map går tillbaka (Esc).
export function depotSheet(root, progress0, sector0, handlers, { deploy = null } = {}) {
  const el = document.createElement('div');
  el.className = 'sheet plate depot';
  root.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('button, select')) e.stopPropagation(); });
  let p = progress0;
  // 0.16.0 (inlärningen): förrådet i tre steg. Nivåer och påfyllnad efter South dag 2, rekvisitionen efter dag 3,
  // uppgraderingarna, omplaceringen och Return efter dag 4 (src/meta/unlocks.js).
  const meta = () => metaFeatures(p);
  // 0.16.0 (Olas beslut, "Gnesta = en sektor"): flikarna är sektorer (Hagstumosse är en, med båda faserna);
  // omplaceringen och garnisonen syns bara när två skilda platser är aktiva samtidigt (multi).
  const multi = () => reassignActive(p);
  const tabs = () => (multi() ? [...openSectors(p), ...(p.op.units.some(u => u.sector == null) ? [null] : [])] : openSectors(p));
  const pool0 = sector0 == null ? null : poolOf(sector0);
  let sector = pool0 != null && tabs().includes(pool0) ? pool0 : tabs()[0] ?? null;
  const sname = id => SECTORS.find(x => x.id === id)?.name ?? MAPS[id]?.name ?? id;
  // 0.16.0 (Olas fråga om Reassign: "behöver jag ingen kvar i South? Ska jag flytta alla?"): nästa strid står i
  // rubriken, varje annan sektor får en rad om sitt läge och sin garnison, och enheterna skickas med en knapp
  // som visar vad det gör med garnisonen. Regeln är simuleringens (src/meta/operation.js pressureGain).
  // nextBattle: { id: sektorn, map: banan, day }
  const nextBattle = () => {
    if (deploy && sector0) return { id: pool0, map: sector0, day: deploy.day };
    const open = openSectors(p).filter(id => currentMap(p, id));
    const id = open.includes(poolOf(p.mapId)) ? poolOf(p.mapId) : open[0];
    const map = id ? currentMap(p, id) : null;
    return map ? { id, map, day: nextDay(p, map) } : null;
  };
  // 0.16.0 (Olas speltest): förrådet öppnar på sektorn som strider härnäst
  if (sector0 == null && nextBattle() && tabs().includes(nextBattle().id)) sector = nextBattle().id;
  // enheterna som skickats i det här besöket: går att ta tillbaka gratis tills Deploy (operation.js sendUnit)
  let sendLog = [];
  const short = id => SECTORS.find(x => x.id === id)?.short ?? sname(id);
  const count = id => p.op.units.filter(u => u.sector === id).length;
  function sectorLine(id) {
    const n = count(id), g = garrisonOf(id), pr = p.op.pressure[id] ?? 0;
    const state = pr ? `pressure ${pr} of ${PRESSURE_MAX}, ${Math.round(pr * PRESSURE_HP * 100)} % tougher` : 'holding, no pressure';
    return `<p class="sline ${n < g ? 'under' : ''}"><b>${esc(sname(id))}:</b> ${state}. Garrison ${n} / ${g} recommended.${n < g ? ` ${esc(garrisonLine(id))}` : ''}</p>`;
  }
  let msg = '', msgGood = false, confirm = null;
  function act(kind, ...args) {
    const r = handlers.act(kind, ...args);
    if (r.progress) p = r.progress;
    msg = r.ok ? (r.text ?? 'Done.') : (STATE_TEXT[r.reason] ?? 'Not possible.');
    msgGood = !!r.ok;
    confirm = null;
    render();
  }
  // 0.14.1 (granskningen av 0.14, Important 4): Return frågar först och säger vad som händer.
  function askReturn(uid) {
    const u = p.op.units.find(x => x.uid === uid), c = canReturn(p, uid);
    if (!u) return;
    if (!c.ok) { msg = STATE_TEXT[c.reason] ?? 'Not possible.'; msgGood = false; confirm = null; render(); return; }
    const where = u.sector ? sname(u.sector) : null;
    // 0.16.0 (textgenomgången): en kort fråga; resten står i Field manual
    void where;
    confirm = { kind: 'return', uid, ok: 'Return', no: 'Keep', text: c.given ? 'Return it? No RP back.' : `Return it? +${c.refund} RP back.` };
    msg = ''; render();
  }
  function unitRow(u) {
    const max = maxMen(u, p.research), lc = levelCost(u), rc = refillCost(p, u);
    const others = multi() ? openSectors(p).filter(s => s !== u.sector && canReassign(p, u.uid, s).ok) : [];
    const from = u.sector, n = from ? count(from) : 0;
    const ret = meta().has('return');
    return `<div class="urow" data-uid="${u.uid}">
      <div class="un"><b>${esc(name(u.type))}</b> <span class="lv">L${u.level}</span>${vetOf(u) ? '<span class="star" title="Veteran: slightly better aim and reload">★</span>' : ''}
        <span class="men">${u.men != null ? `${u.men} of ${max} men` : 'crew'}${u.wins ? ` · ${u.wins} day${u.wins > 1 ? 's' : ''} held` : ''}</span></div>
      <div class="ua">
        ${lc != null ? `<button type="button" class="mini ${p.rp < lc ? 'off' : ''}" data-a="lvl">Level ${ROMAN[u.level + 1]} <i>${rp(lc)}</i></button>` : '<span class="mini max">Max level</span>'}
        ${rc ? `<button type="button" class="mini ${p.rp < rc ? 'off' : ''}" data-a="refill">Refill <i>${rp(rc)}</i></button>` : u.men != null ? '<span class="mini max">Full</span>' : '<span class="mini gap"></span>'}
        ${!ret ? '' : canReturn(p, u.uid).ok ? `<button type="button" class="mini ${confirm?.uid === u.uid ? 'sel' : ''}" data-a="return" title="${u.granted && !u.spent ? 'Send it back to command. It was given, so no RP back.' : 'Back to the depot for about half of the RP spent on it'}">Return${returnValue(u) ? ` <i>+${returnValue(u)}</i>` : ''}</button>` : '<span class="mini max" title="The last unit here was given by command.">Last unit</span>'}
      </div>
      ${others.length ? `<div class="send">${others.map(s => `<button type="button" class="mini sendb" data-a="send" data-to="${s}">Send to ${esc(sname(s))}</button><span class="pv ${from && n - 1 < garrisonOf(from) ? 'under' : ''}">${from ? `${esc(short(from))} garrison ${n} → ${n - 1}` : ''}</span>`).join('')}</div>` : ''}</div>`;
  }
  // 0.14.2 (speltestet av 0.14.1: "när Refill köps krymper kortet och mitt nästa klick hamnade fel"): varje
  // enhetsrad har fast höjd och fasta platser för sina knappar (nivå, påfyllnad, tillbaka; omplaceringen uppe
  // till höger), "Full" står kvar där Refill var, och varje kolumn behåller sin rullning när förrådet ritas om.
  let scrollKey = null;
  // 0.16.0 (Olas tillägg: knapphet): rekvisitionens kort visar ledningens lager, "1 available" eller "None released";
  // korten har fast höjd och fast plats (köpradens ordning), så att inget hoppar när något köps.
  const reqCard = (t, sector) => {
    const c = canRequisition(p, t, sector), w = WEAPONS[t], n = stockOf(p, sector, t);
    return `<button type="button" class="req ${c.ok ? '' : 'off'} ${n ? '' : 'none'}" data-req="${t}" title="${esc(w.desc)}"><span class="ri">${ICONS[t] ?? ''}</span><b>${esc(name(t))}</b><span class="rs">${n ? `${n} available` : 'None released'}</span><i>${n ? rp(UNIT_RP[t]) : ''}</i></button>`;
  };
  // Skicka: fråga först om enheten lämnar sektorn som strider härnäst. Allt går att ta tillbaka till Deploy.
  function askSend(uid, to) {
    const u = p.op.units.find(x => x.uid === uid);
    if (u?.sector && u.sector === nextBattle()?.id) {
      confirm = { kind: 'send', uid, to, ok: 'Send', no: 'Keep', text: `${sname(u.sector)} fights next. Send anyway?` }; msg = ''; render(); return;
    }
    doSend(uid, to);
  }
  function doSend(uid, to) {
    const r = handlers.act('send', uid, to, sendLog);
    if (r.ok) { p = r.progress; sendLog = r.log; msg = `Sent to ${sname(to)}. Bring it back any time before Deploy.`; msgGood = true; }
    else { msg = STATE_TEXT[r.reason] ?? 'Not possible.'; msgGood = false; }
    render();
  }
  // Deploy: varna när sektorn som strider har färre än garnisonen; andra trycket ställer upp ändå
  function tryDeploy() {
    const w = multi() ? deployWarning(p, sector0) : null;
    if (w && confirm?.kind !== 'deploy') { confirm = { kind: 'deploy', ok: 'Deploy', no: 'Back', text: w }; msg = ''; render(); return; }
    handlers.onDeploy?.(sector0);
  }
  // "Send all but the recommended garrison": från en sektor som inte har nästa strid till den som har den
  function bulkList() {
    const nb = nextBattle();
    if (!multi() || !nb || sector === nb.id) return [];
    const here = p.op.units.filter(u => u.sector === sector && canReassign(p, u.uid, nb.id).ok);
    const send = Math.max(0, count(sector) - (sector ? garrisonOf(sector) : 0));
    return here.sort((a, b) => b.level - a.level || (b.wins ?? 0) - (a.wins ?? 0)).slice(0, send);
  }
  // Enheter som skickats bort härifrån i det här besöket, med Bring back (gratis tills Deploy)
  function sentRows() {
    const gone = sendLog.filter(e => e.from === sector).map(e => p.op.units.find(u => u.uid === e.uid)).filter(Boolean);
    return gone.length ? `<div class="sent">${gone.map(u => `<div class="srow"><span>${esc(name(u.type))} L${u.level} sent to ${esc(u.sector ? sname(u.sector) : '')}</span><button type="button" class="mini" data-a="back" data-uid="${u.uid}">Bring back</button></div>`).join('')}</div>` : '';
  }
  function bulk() {
    const list = bulkList(), nb = nextBattle();
    return list.length ? `<button type="button" class="mini bulk" data-a="bulk">Send all but the garrison to ${esc(sname(nb.id))} <i>${list.length}</i></button>` : '';
  }
  function render() {
    const keep = scrollKey === sector ? [...el.querySelectorAll('.cols section')].map(x => x.scrollTop) : null;
    scrollKey = sector;
    const m = meta();
    const here = p.op.units.filter(u => u.sector === sector);
    const order = SHOP.map(x => x.id);
    const types = sector && m.has('requisition') ? stockTypes(p, sector).sort((a, b) => order.indexOf(a) - order.indexOf(b)) : [];
    // 0.16.0 (Olas tillägg): bara uppgraderingar för det man har eller fått släppt, och de ledningen släppt; inga maxade
    const ups = m.has('upgrades') ? upgradeList(p).filter(Boolean).filter(st => st.tier != null && st.reason !== 'locked' && st.reason !== 'cap') : [];
    const cols = [
      `<section class="${sector && sector === nextBattle()?.id ? 'next' : ''}">${sector && sector === nextBattle()?.id ? `<div class="nbtag">Next battle · ${esc(MAPS[nextBattle().map].name)} · Day ${nextBattle().day}</div>` : ''}<h4>${sector ? 'Units in ' + esc(sname(sector)) : 'Unassigned units'}${sector && multi() ? ` <span class="gar ${count(sector) < garrisonOf(sector) ? 'under' : ''}">Garrison ${count(sector)} / ${garrisonOf(sector)}</span>` : ''}</h4>${bulk()}${sentRows()}${here.map(unitRow).join('') || '<p class="muted">None.</p>'}</section>`,
      m.has('requisition') ? `<section><h4>Requisition${sector ? ' for ' + esc(sname(sector)) : ''}</h4>${sector ? types.map(t => reqCard(t, sector)).join('') || '<p class="muted">Nothing released here yet.</p>' : '<p class="muted">Pick a sector.</p>'}</section>` : '',
      m.has('upgrades') ? `<section><h4>Depot upgrades</h4>${ups.map(st => `<button type="button" class="req up ${st.ok ? '' : 'off'}" data-up="${st.id}">
          <b>${esc(upgradeName(st.id) ?? st.node.name)} ${ROMAN[st.tier]}</b><span class="rs">${esc(upgradeText(st))}</span><i>${rp(st.cost)}</i></button>`).join('') || '<p class="muted">Nothing released yet.</p>'}</section>` : '',
    ].filter(Boolean);
    el.innerHTML = `
      <div class="oh"><div class="h">${deploy ? 'Requisition' : 'Depot'}</div><div class="rp"><span>Requisition points</span><b>${p.rp}</b></div></div>
      ${deploy ? `<div class="flow"><span>Operations map</span><i>›</i><span class="on">Requisition</span><i>›</i><span>Deploy day ${deploy.day}</span></div>` : ''}
      ${nextBattle() && m.has('depot') ? `<div class="nextb"><span>Next battle</span><b>${esc(MAPS[nextBattle().map].name)} · Day ${nextBattle().day}</b></div>` : ''}
      ${multi() ? `<div class="slines">${openSectors(p).filter(id => id !== nextBattle()?.id).map(sectorLine).join('')}</div>` : ''}
      ${tabs().length > 1 ? `<div class="tabs">${tabs().map(s => `<button type="button" class="tab ${s === sector ? 'on' : ''}" data-tab="${s ?? ''}">${s ? esc(sname(s)) : 'Unassigned'} <span>${p.op.units.filter(u => u.sector === s).length}</span>${s && s === nextBattle()?.id ? '<em>Next battle</em>' : ''}</button>`).join('')}</div>` : ''}
      <div class="cols n${cols.length}">${cols.join('')}</div>
      <div class="dmsg ${msg || confirm ? 'show' : ''} ${msgGood ? 'good' : ''} ${confirm ? 'ask' : ''}">${confirm ? `<span>${esc(confirm.text)}</span><button type="button" class="mini warn" data-a="yes">${confirm.ok}</button><button type="button" class="mini" data-a="no">${confirm.no}</button>` : esc(msg)}</div>
      <div class="acts">${deploy ? `<button type="button" class="act main" data-a="deploy"><span class="a">Deploy · ${esc(MAPS[sector0].name)} · Day ${deploy.day}</span><kbd>Enter</kbd></button><button type="button" class="act" data-a="done"><span class="a">Operations map</span><kbd>Esc</kbd></button>`
        : '<button type="button" class="act main" data-a="done"><span class="a">Done</span><kbd>Esc</kbd></button>'}</div>`;
    for (const b of el.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { sector = b.dataset.tab || null; msg = ''; render(); });
    for (const r of el.querySelectorAll('.urow')) {
      const uid = Number(r.dataset.uid);
      r.querySelector('[data-a="lvl"]')?.addEventListener('click', () => act('level', uid));
      r.querySelector('[data-a="refill"]')?.addEventListener('click', () => act('refill', uid));
      r.querySelector('[data-a="return"]')?.addEventListener('click', () => askReturn(uid));
      for (const b of r.querySelectorAll('[data-a="send"]')) b.addEventListener('click', () => askSend(uid, b.dataset.to));
    }
    el.querySelector('[data-a="bulk"]')?.addEventListener('click', () => {
      const nb = nextBattle(), list = bulkList();
      void sname;
      for (const u of list) { const r = handlers.act('send', u.uid, nb.id, sendLog); if (r.ok) { p = r.progress; sendLog = r.log; } }
      msg = `${list.length} sent to ${sname(nb.id)}.`; msgGood = true; render();
    });
    for (const b of el.querySelectorAll('[data-req]')) b.addEventListener('click', () => act('requisition', b.dataset.req, sector));
    for (const b of el.querySelectorAll('[data-up]')) b.addEventListener('click', () => act('upgrade', b.dataset.up));
    el.querySelector('[data-a="done"]').addEventListener('click', () => handlers.onDone());
    el.querySelector('[data-a="deploy"]')?.addEventListener('click', () => tryDeploy());
    el.querySelector('[data-a="yes"]')?.addEventListener('click', () => {
      const c = confirm;
      if (c.kind === 'return') act('return', c.uid);
      else if (c.kind === 'send') { confirm = null; doSend(c.uid, c.to); }
      else if (c.kind === 'deploy') handlers.onDeploy?.(sector0);
    });
    for (const b of el.querySelectorAll('[data-a="back"]')) b.addEventListener('click', () => {
      const r = handlers.act('back', Number(b.dataset.uid), sendLog);
      if (r.ok) { p = r.progress; sendLog = r.log; msg = 'Brought back.'; msgGood = true; } confirm = null; render();
    });
    el.querySelector('[data-a="no"]')?.addEventListener('click', () => { confirm = null; render(); });
    if (keep) [...el.querySelectorAll('.cols section')].forEach((x, i) => { x.scrollTop = keep[i] ?? 0; });
  }
  render();
  return { el, close: () => el.remove(), progress: () => p };
}
