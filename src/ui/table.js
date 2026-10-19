// Kartbordet (0.21.0): skylten mellan dagarna som ett bord i brandstationen i Gnesta, byggd efter mockupen
// docs/mockups/kontrollrum-3.html. Ersätter operationskartan och förrådet (src/ui/operation.js finns kvar bakom
// inställningen hub: 'classic'). Spec: docs/superpowers/specs/2026-10-19-kartbordet-bygge.md.
//
// Bordet ritas i ett designrum på 1440 x 900 bildpunkter som skalas till fönstret; varje föremål är en DOM-del placerad
// med CSS-variablerna --x --y --w --r --z (som mockupens .obj). Föremålen går att dra; läget sparas per id i
// progress.table.layout (src/meta/table.js moveObject), och Tidy lägger tillbaka allt.
//   kartan      operationskartan, större: E4, E20, 57, 223, 224, järnvägarna, sjöarna, Mälaren, Östersjön, orterna.
//               Sektorerna med läge; ett klick väljer en sektor (som förut). DAY n står vid nästa strid.
//   högarna     en uppdragshög per sektor (order överst, gårdagens rapport under). Klick breder ut högen; klick igen
//               lägger ihop den. Klara sektorer har stämpeln HELD.
//   radion      remsor från P4 Sörmland, den nyaste överst; klick på en kant lägger den överst.
//   fiendehögen ett blad per mött typ; klick på en kant lägger det överst. Gula lappen är nästa strids INTEL.
//   korten      förrådets två banor som två fält vid bordskanten: dra mellan dem, eller klicka för att byta.
//   klämbrädan  nästa strid, RP, Requisition (R) och Deploy (Enter). Före förrådet står Deploy på ordern.
// Bara bild och handlingar: reglerna är src/meta/operation.js (banorna) och src/meta/table.js (vad som ligger där).
import { MAPS } from '../data/maps.js';
import { SECTORS } from '../data/depot.js';
import { TABLE_W, TABLE_H, MAP_W, MAP_H, gx, gy, PLACES, SEA, MALAREN, LAKES, ISLANDS, ROADS, RAILS, TOWNS, SECTOR_TABLE } from '../data/table.js';
import { tableState, placeOf, moveObject, tidy, tableOf, bringToTop, closedSheet } from '../meta/table.js';
import { intelFor, compass } from '../meta/intel.js';
import { FOE_ICONS } from './icons.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const two = n => String(n).padStart(2, '0');
const STATE_TEXT = { laneFull: 'Into battle is full. Rest a unit first.', noMen: 'No men left. Refill at Requisition.', same: 'Already there.' };

// ---------- kartbladet ----------
const SM = pts => {
  const n = pts.length, q = pts.map(([lo, la]) => [gx(lo), gy(la)]);
  let d = `M${q[0][0].toFixed(1)} ${q[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = q[(i - 1 + n) % n], p1 = q[i], p2 = q[(i + 1) % n], p3 = q[(i + 2) % n];
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
};
const PL = pts => pts.map(([lo, la], i) => (i ? 'L' : 'M') + gx(lo).toFixed(1) + ' ' + gy(la).toFixed(1)).join(' ');
export const sectorXY = id => { const k = SECTOR_TABLE[id]?.place, c = k && PLACES[k]; return c ? [gx(c[0]), gy(c[1])] : null; };
const DIR = { north: [0, -1], 'north-east': [0.7, -0.7], east: [1, 0], 'south-east': [0.7, 0.7], south: [0, 1], 'south-west': [-0.7, 0.7], west: [-1, 0], 'north-west': [-0.7, -0.7] };

// Kartans geografi (fast) och lägesbilden (sektorerna, nästa strid). sel: den valda sektorn.
export function mapSvg(state, sel) {
  let s = `<rect width="${MAP_W}" height="${MAP_H}" fill="#151710"/><rect width="${MAP_W}" height="${MAP_H}" fill="url(#tbrelief)" opacity=".5"/>`;
  for (let i = 0; i <= 10; i++) { const x = i * MAP_W / 10; s += `<line x1="${x}" y1="0" x2="${x}" y2="${MAP_H}" class="gl"/>`; if (i < 10) s += `<text x="${x + 4}" y="12" class="grid">${String.fromCharCode(65 + i)}</text>`; }
  for (let i = 0; i <= 7; i++) { const y = i * MAP_H / 7; s += `<line x1="0" y1="${y}" x2="${MAP_W}" y2="${y}" class="gl"/>`; if (i < 7) s += `<text x="4" y="${y + 13}" class="grid">${i + 1}</text>`; }
  s += `<path d="${SM(SEA)}" class="water sea"/><path d="${SM(MALAREN)}" class="water sea"/>`;
  for (const [x, y, rx, ry] of ISLANDS) s += `<ellipse cx="${gx(x)}" cy="${gy(y)}" rx="${rx}" ry="${ry}" fill="#151710" stroke="rgba(143,196,232,.22)"/>`;
  for (const l of LAKES) {
    s += `<path d="${SM(l.pts)}" class="water"/>`;
    if (l.label !== false) { const cx = l.pts.reduce((a, p) => a + p[0], 0) / l.pts.length, cy = l.pts.reduce((a, p) => a + p[1], 0) / l.pts.length; s += `<text x="${gx(cx)}" y="${gy(cy) + 3}" class="lake" text-anchor="middle">${l.n}</text>`; }
  }
  s += `<text x="${gx(17.27)}" y="${gy(59.266)}" class="lake big" text-anchor="middle">MÄLAREN</text><text x="${gx(17.42)}" y="${gy(58.765)}" class="lake big" text-anchor="middle">ÖSTERSJÖN</text>`;
  for (const r of RAILS) s += `<path d="${PL(r)}" class="rail1"/><path d="${PL(r)}" class="rail2"/>`;
  for (const r of ROADS) s += `<path d="${PL(r.pts)}" class="${r.e ? 'road e' : 'road'}"/>`;
  for (const r of ROADS) { const x = gx(r.at[0]), y = gy(r.at[1]); s += `<rect x="${x - 12}" y="${y - 7}" width="24" height="13" rx="2" class="${r.e ? 'shield e' : 'shield'}"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" class="rd${r.e ? ' e' : ''}">${r.n}</text>`; }
  for (const [n, k, big, dx, dy] of TOWNS) { const x = gx(PLACES[k][0]), y = gy(PLACES[k][1]); s += big ? `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" class="tw"/>` : `<circle cx="${x}" cy="${y}" r="2.6" class="tw"/>`; s += `<text x="${x + dx}" y="${y + dy}" class="town${big ? ' big' : ''}">${n}</text>`; }
  // ---------- lägesbilden ----------
  const pen = (x, y, t, a = 'start', cls = 'pen') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${a}" class="${cls}">${esc(t)}</text>`;
  const nb = state.next;
  for (const pl of state.piles) {
    const xy = sectorXY(pl.sector);
    if (!xy || pl.sector === nb?.sector) continue;
    if (!state.opmap) continue;
    const [x, y] = xy;
    if (pl.closed) {
      const c = closedSheet(null, SECTORS.find(q => q.id === pl.sector));
      const blue = pl.status === 'held';
      s += `<g class="sec st-${pl.status}" data-sector="${pl.sector}"><circle cx="${x}" cy="${y}" r="18" class="hit"/><circle cx="${x}" cy="${y}" r="8.5" fill="${blue ? 'rgba(143,196,232,.30)' : 'rgba(138,128,112,.35)'}" stroke="${blue ? '#8fc4e8' : '#8a8070'}" stroke-width="1.5"/></g>`;
      s += pen(x, y + 50, `${pl.status === 'silent' ? 'secure' : 'held'}, days ${c.days[0]} to ${c.days[1]}`, 'middle');
    } else {
      const thr = pl.status === 'threatened';
      s += `<g class="sec st-${pl.status}" data-sector="${pl.sector}"><circle cx="${x}" cy="${y}" r="18" class="hit"/>${thr ? `<circle cx="${x}" cy="${y}" r="16" class="pulse"/>` : ''}<circle cx="${x}" cy="${y}" r="9" fill="${thr ? 'rgba(224,96,60,.3)' : 'rgba(159,196,106,.28)'}" stroke="${thr ? '#e0603c' : '#9fc46a'}" stroke-width="1.6"/></g>`;
      s += pen(x + 14, y + 20, thr ? 'threatened' : 'holding');
    }
    if (sel === pl.sector) s += `<circle cx="${x}" cy="${y}" r="24" class="selring"/>`;
  }
  if (nb) {
    const xy = sectorXY(nb.sector);
    if (xy) {
      const [x, y] = xy, it = intelFor(MAPS[nb.map], nb.day), e = it?.entries?.[0];
      const dir = DIR[e?.dir ?? compass(MAPS[nb.map], e?.id)] ?? null;
      // horden: en pil från dagens första kända ingång mot platsen
      if (dir) {
        const ax = x + dir[0] * 92, ay = y + dir[1] * 92, bx = x + dir[0] * 20, by = y + dir[1] * 20;
        const mx = (ax + bx) / 2 - dir[1] * 12, my = (ay + by) / 2 + dir[0] * 12;
        const ux = bx - mx, uy = by - my, ul = Math.hypot(ux, uy) || 1, nx = ux / ul, ny = uy / ul;
        s += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}" class="arrow"/>`;
        s += `<path d="M${(bx - nx * 11 - ny * 6).toFixed(1)} ${(by - ny * 11 + nx * 6).toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)} L${(bx - nx * 11 + ny * 6).toFixed(1)} ${(by - ny * 11 - nx * 6).toFixed(1)}" class="arrowhead"/>`;
      }
      s += `<g class="sec st-next" data-sector="${nb.sector}"><circle cx="${x}" cy="${y}" r="22" class="hit"/><circle cx="${x}" cy="${y}" r="11" fill="none" stroke="#e0603c" stroke-width="2"/><circle cx="${x}" cy="${y}" r="20" fill="none" stroke="rgba(224,96,60,.45)" stroke-width="2"/></g>`;
      // DAY n: pennstreck och siffran där kartan har plats (src/data/table.js SECTOR_TABLE day), dagens titel under
      const [dx, dy] = SECTOR_TABLE[nb.sector]?.day ?? [24, -38];
      const lx = x + dx, ly = y + dy;
      s += `<path d="M${(x + Math.sign(dx || 1) * 12).toFixed(1)} ${(y - 14).toFixed(1)} Q ${(lx + 6).toFixed(1)} ${(ly + 12).toFixed(1)} ${(lx + 70).toFixed(1)} ${(ly + 6).toFixed(1)}" class="penline"/>`;
      s += pen(lx, ly, `DAY ${nb.n}`, 'start', 'pen big');
      if (nb.title) s += pen(lx + 2, ly + 22, nb.title.toLowerCase());
    }
  }
  const sub = !nb ? 'SHEET 1' : nb.n <= 1 ? 'SHEET 1 · DAY 1' : `SHEET 1 · NIGHT ${nb.n - 1} TO DAY ${nb.n}`;
  return `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" class="tb-mapsvg"><defs><filter id="tbrf"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="4"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0.35 -0.08"/></filter><pattern id="tbrelief" width="${MAP_W}" height="${MAP_H}" patternUnits="userSpaceOnUse"><rect width="${MAP_W}" height="${MAP_H}" filter="url(#tbrf)"/></pattern></defs>${s}<text x="26" y="44" class="ttl">Operation Södermanland</text><text x="27" y="60" class="sub">${sub}</text></svg>`;
}
// Gnesta-inzoomningen (ritfilm, mockupens .sheet.overlay) byggs senare. Kroken: returnera ett ark här när det finns
// (src/data/table.js INSET), så läggs det på kartan som föremålet 'inset'.
export function insetSheet() { return ''; }

// ---------- bladen ----------
const orderHtml = (o, { deploy = false, stamp = false } = {}) => `
  <div class="hd"><span>${esc(o.from.toUpperCase())}</span><span>ORDER ${two(o.n)}</span></div>
  <div class="meta">TO: ${esc(o.to)}<br>VALID: ${esc(o.valid)}</div>
  <div class="txt" data-read>${esc(o.text)}</div>
  ${o.sig ? `<div class="sig">${esc(o.sig)}</div>` : ''}
  ${deploy ? `<button type="button" class="tb-kbd" data-a="go">DEPLOY DAY ${o.n} · ENTER</button>` : ''}
  ${stamp ? `<div class="tb-stamp" style="right:10px;bottom:-12px;transform:rotate(-7deg);font-size:15px">RECEIVED<small>GNESTA</small></div>` : ''}`;
const reportHtml = r => `
  <div class="h">Situation · night ${r.n}</div>
  <div class="txt" data-read>${r.lead ? `<b>${esc(r.lead)}</b> ` : ''}${esc(r.text)}</div>
  <div class="sig">${esc(r.from)}</div>`;
const closedHtml = c => `
  <div class="hd"><span>${esc(c.name.toUpperCase())}</span><span>DAYS ${c.days[0]} TO ${c.days[1]}</span></div>
  <div class="txt" data-read>${esc(c.text)}</div>
  <div class="tb-stamp olive" style="right:12px;bottom:6px;transform:rotate(-5deg);font-size:14px">${esc(c.stamp)}</div>`;
// Bara rubrikraden syns (ett blad under ett annat)
const edgeHead = sh => sh.kind === 'order' ? `<span>ORDER ${two(sh.n)}</span><span>${esc(sh.from.toUpperCase())}</span>`
  : sh.kind === 'report' ? `<span>SITUATION · NIGHT ${sh.n}</span><span></span>` : `<span>${esc(sh.name?.toUpperCase() ?? '')}</span><span>HELD</span>`;
function sheetHtml(sh, { x, y, r, z, full, deploy = false, stamp = false, w = null }) {
  const pos = `--x:${x};--y:${y};--r:${r};--z:${z}`;
  if (!full) return `<div class="tb-obj tb-paper tb-report tb-edge" data-sheet="${sh.id}" style="${pos};--w:${w ?? 224};--h:110"><div class="hd" data-read>${edgeHead(sh)}</div></div>`;
  if (sh.kind === 'order') return `<div class="tb-obj tb-paper tb-order" data-sheet="${sh.id}" style="${pos};--w:${w ?? 290}">${orderHtml(sh, { deploy, stamp })}<div class="tb-clip" data-clip></div></div>`;
  if (sh.kind === 'report') return `<div class="tb-obj tb-paper tb-lined" data-sheet="${sh.id}" style="${pos};--w:${w ?? 304};--h:338">${reportHtml(sh)}</div>`;
  return `<div class="tb-obj tb-paper tb-report" data-sheet="${sh.id}" style="${pos};--w:${w ?? 232};padding-bottom:34px">${closedHtml(sh)}</div>`;
}
// En hupplagd hög: det översta bladet helt; på nästa strids hög sticker gårdagens rapport fram under ordern;
// äldre blad syns som kanter.
function pileHtml(pl, place, { deploy }) {
  const sh = pl.sheets, n = sh.length, top = sh[n - 1], under = sh[n - 2];
  const rot = k => [-1.8, 1.6, -3, 2.2, -1.2][k % 5];
  let html = '';
  if (pl.current && under?.kind === 'report') {
    const older = sh.slice(Math.max(0, n - 4), n - 2);
    older.forEach((o, k) => { const d = older.length - k; html += sheetHtml(o, { x: -10 * d, y: -24 * d, r: rot(k + 2), z: k + 1, full: false }); });
    html += sheetHtml(under, { x: 0, y: 0, r: -1.8, z: 5, full: true });
    html += sheetHtml(top, { x: 34, y: 92, r: 1.6, z: 6, full: true, deploy, stamp: !deploy });
  } else {
    const older = sh.slice(Math.max(0, n - 3), n - 1);
    older.forEach((o, k) => { const d = older.length - k; html += sheetHtml(o, { x: 14 + 6 * (d - 1), y: -26 * d, r: rot(k), z: k + 1, full: false }); });
    html += sheetHtml(top, { x: 0, y: 0, r: pl.closed ? 1.4 : 2.2, z: 6, full: true, deploy });
  }
  const more = n > 4 ? `<span class="tb-more">${n} sheets</span>` : '';
  return `<div class="tb-pile${pl.current ? ' current' : ''}${pl.closed ? ' closed' : ''}" data-obj="${pl.id}" data-sector="${pl.sector}" style="--x:${place.x};--y:${place.y};--z:${pl.current ? 12 : 9}" title="Click to spread">${html}${more}</div>`;
}
// Utbredd hög: bladen i rader över bordet, nyast först (högst åtta)
function spreadHtml(pl) {
  const list = [...pl.sheets].reverse().slice(0, 8), cols = 4, cw = 330, rh = 360, sc = 0.78;
  const x0 = (TABLE_W - cols * cw * sc) / 2 + 8, y0 = 70;
  const cells = list.map((sh, i) => {
    const x = x0 + (i % cols) * cw * sc, y = y0 + Math.floor(i / cols) * rh * sc;
    return `<div class="tb-cell" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;transform:scale(${sc}) rotate(${[-1, 0.8, -0.5, 1.2][i % 4]}deg)">${sheetHtml(sh, { x: 0, y: 0, r: 0, z: 1, full: true })}</div>`;
  }).join('');
  const older = pl.sheets.length - list.length;
  return `<div class="tb-spread" data-spread="${pl.id}"><div class="tb-shade"></div>${cells}<div class="tb-spreadhint">${older > 0 ? `${older} older sheets in the pile · ` : ''}Click to stack</div></div>`;
}

// ---------- radion ----------
function radioHtml(strips, order, place) {
  const list = order.map(id => strips.find(s => s.id === id)).filter(Boolean).slice(-3);
  const n = list.length;
  const html = list.map((s, k) => {
    const top = k === n - 1;
    return `<div class="tb-obj tb-strip${top ? '' : ' under'}" data-strip="${s.id}" style="--x:${k * 5};--y:${k * 28};--w:226;--r:${[-2, 1.2, -1][k % 3]};--z:${k + 1}">
      <div class="h" data-read><span>RADIO</span><i>${esc(s.at)}</i><span>${esc(s.from.toUpperCase())}</span></div>${top ? `<div class="txt" data-read>${esc(s.text)}</div>` : ''}</div>`;
  }).join('');
  return `<div class="tb-pile tb-radio" data-obj="radio" style="--x:${place.x};--y:${place.y};--z:8">${html}</div>`;
}

// ---------- fiendehögen ----------
function enemyHtml(pile, order, intel, place) {
  const list = order.map(id => pile.sheets.find(s => s.id === id)).filter(Boolean);
  const n = list.length, H = 252;
  const html = list.map((e, k) => {
    const top = k === n - 1, grey = e.status === 'REPORTED';
    const tab = `<div class="tab" data-read><b>${esc(e.name)}</b>${e.status === 'NEW' ? `<i>${two(e.no)} · NEW</i>` : `<span>${two(e.no)} · ${e.status}</span>`}</div>`;
    if (!top) return `<div class="tb-obj tb-paper tb-enemy${grey ? ' grey' : ''}" data-enemy="${e.id}" style="--x:${[6, 0, 8, 2][k % 4]};--y:${k * 27};--w:210;--h:${H};--r:${[1.4, -1.6, 1.2, -1.2][k % 4]};--z:${k + 1}">${tab}</div>`;
    return `<div class="tb-obj tb-paper tb-enemy top${grey ? ' grey' : ''}" data-enemy="${e.id}" style="--x:4;--y:${k * 27 + 2};--w:210;--h:${H};--r:0.8;--z:${k + 1}">${tab}
      <div class="body"><div class="t" data-read>${esc(e.text)}</div><span class="fig">${FOE_ICONS[e.type] ?? FOE_ICONS.unknown}</span></div>
      <div class="stats" data-read>${e.stats.map(([k2, v]) => `<span>${k2}<b>${esc(v)}</b></span>`).join('')}</div></div>`;
  }).join('');
  const topY = (n - 1) * 27 + 2 + H;
  const note = intel ? `<div class="tb-obj tb-postit" data-intel style="--x:26;--y:${topY - 6};--w:184;--r:-3.5;--z:${n + 2}"><div class="h">${esc(intel.head)}</div><div class="txt" data-read>${esc(intel.text)}</div></div>` : '';
  return `<div class="tb-pile tb-enemies" data-obj="enemies" style="--x:${place.x};--y:${place.y};--z:11">${html}${note}</div>`;
}

// ---------- korten ----------
const menHtml = c => (c.max ? `<div class="men">${Array.from({ length: c.max }, (_, i) => `<s class="${i < c.men ? 'on' : 'dead'}"></s>`).join('')}</div>` : '');
function cardHtml(c, x, z, lane) {
  const bad = c.fatigue != null ? c.fatigue > 0 : c.men === 0;
  const tail = `${c.vet ? '<b class="star">★</b>' : ''}L${c.level}`;
  return `<div class="tb-obj tb-card${c.fresh ? ' fresh' : ''}" data-uid="${c.uid}" data-lane="${lane}" style="--x:${x.toFixed(0)};--y:0;--w:128;--r:${[0.8, -1, 0.4, -0.6, 1.1][c.uid % 5]};--z:${z}">
    <div class="spine" data-read>${esc(c.tag)}<i class="f${c.fatigue ?? 0}"></i></div>
    <div class="k"><span>${c.fresh ? 'NEW' : esc(c.tag)}</span>${c.max ? `<i>${c.men}/${c.max}</i>` : ''}</div>
    <div class="n">${esc(c.name)}</div><div class="rl">${esc(c.role)}</div>${menHtml(c)}
    <div class="ft"><span class="${bad ? 'bad' : 'ok'}">${esc(c.state)}</span><span>${tail}</span></div></div>`;
}
const ZONE_Y = 676, ZONE_H = 206, ZONE_X0 = 92, ZONE_X1 = 1196, CARD_W = 128;
// Fältens bredd: båda får plats för sina kort bredvid varandra om det går. Annars får varje fält sitt minsta (korten
// överlappar så att ryggen syns: 44 px i striden, 30 px i reserven) och resten delas efter hur mycket som saknas.
export function zoneGeometry(cap, nRest) {
  const avail = ZONE_X1 - ZONE_X0 - 18;
  const span = (k, step) => 16 + CARD_W + Math.max(0, k - 1) * step;
  const nb = Math.max(1, Number.isFinite(cap) ? cap : 1), nr = Math.max(1, nRest);
  const wb = span(nb, CARD_W + 8), wr = Math.max(200, span(nr, CARD_W + 8));
  let battle, rest;
  if (wb + wr <= avail) { battle = wb; rest = avail - wb; }
  else {
    const mb = span(nb, 44), mr = Math.max(200, span(nr, 30)), extra = Math.max(0, avail - mb - mr);
    const gb = Math.max(0, wb - mb), gr = Math.max(0, wr - mr), k = gb + gr ? extra / (gb + gr) : 0;
    battle = Math.min(wb, mb + gb * k); rest = avail - battle;
  }
  return { battle: { x: ZONE_X0, w: Math.round(battle) }, rest: { x: Math.round(ZONE_X0 + battle + 18), w: Math.round(rest) } };
}
const cardStep = (n, w) => (n <= 1 ? 0 : Math.min(CARD_W + 8, (w - 16 - CARD_W) / (n - 1)));
function zonesHtml(z, note) {
  const g = zoneGeometry(z.cap, z.rest.length);
  const row = (list, geo, lane) => { const st = cardStep(list.length, geo.w); return list.map((c, i) => cardHtml(c, geo.x + 8 + i * st, i + 1, lane)).join(''); };
  const nb = note ? `<span class="tb-znote">${esc(note.text)}</span>` : '';
  return `<div class="tb-zone battle" data-zone="battle" style="--x:${g.battle.x};--y:${ZONE_Y};--w:${g.battle.w};--h:${ZONE_H}"><div class="lbl" data-read><b>INTO BATTLE</b> · ${z.battle.length} of ${Number.isFinite(z.cap) ? z.cap : z.battle.length}</div>${note?.lane === 'battle' ? nb : ''}</div>
    <div class="tb-zone rest" data-zone="rest" style="--x:${g.rest.x};--y:${ZONE_Y};--w:${g.rest.w};--h:${ZONE_H}"><div class="lbl" data-read><b>RESERVE</b> · ${z.rest.length}</div>${note?.lane === 'rest' ? nb : ''}</div>
    <div class="tb-cards" style="--y:${ZONE_Y + 10}">${row(z.battle, g.battle, 'battle')}${row(z.rest, g.rest, 'rest')}</div>`;
}

// ---------- klämbrädan ----------
function clipboardHtml(cb, place) {
  const nb = cb.next;
  return `<div class="tb-obj tb-clipboard" data-obj="clipboard" style="--x:${place.x};--y:${place.y};--w:208;--h:376;--r:${place.r};--z:13"><div class="jaw"></div><div class="pg">
    <div class="h">Next battle</div>
    <div class="nb" data-read>${nb ? `${esc(SECTORS.find(x => x.id === nb.sector)?.short ?? MAPS[nb.map].name)} · Day ${nb.n}<small>${esc(nb.title)}</small>` : 'Nothing planned<small>Every sector is held</small>'}</div>
    ${cb.rp != null ? `<div class="rp" data-read><span>REQUISITION</span><b>${cb.rp}</b></div>` : ''}
    <div class="grow"></div>
    <button type="button" class="tb-btn" data-a="req">Requisition<span class="p">Units and upgrades · R</span></button>
    ${nb ? `<button type="button" class="tb-btn main" data-a="go">Deploy day ${nb.n}<br><kbd>Enter</kbd></button>` : ''}
  </div></div>`;
}

// handlers: { onGo(sectorId), onRequisition(sectorId), act(kind, ...args) -> { ok, reason, progress }, save(progress) }
// opts.selected: sektorn som är vald från början. opts.backdrop: bara bild (bakom Requisition-klämbrädan).
export function tableSheet(root, progress, handlers = {}, { selected = null, backdrop = false } = {}) {
  const el = document.createElement('div');
  el.id = backdrop ? 'hubback' : 'hub';
  el.className = 'opmap hub' + (backdrop ? ' backdrop' : '');
  el.innerHTML = '<div class="tb-view"></div><div class="tb-rail"></div>';
  root.appendChild(el);
  const view = el.querySelector('.tb-view');
  let p = progress, sel = selected, spread = null, laneNote = null, enemyOrder = null, radioOrder = null, zTop = 20;
  const zOf = {};
  // ---------- skalan: designrummet till fönstret ----------
  let scale = 1, ox = 0, oy = 0;
  const fit = () => {
    const W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight;
    scale = Math.min(W / TABLE_W, H / TABLE_H);
    ox = (W - TABLE_W * scale) / 2; oy = (H - TABLE_H * scale) / 2;
    view.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
    drawStrings();
  };
  const toTable = (cx, cy) => { const r = el.getBoundingClientRect(); return [(cx - r.left - ox) / scale, (cy - r.top - oy) / scale]; };

  function render() {
    const state = tableState(p, { sector: sel });
    if (sel == null || !state.piles.some(x => x.sector === sel)) sel = state.next?.sector ?? sel;
    const place = id => placeOf(p, state, id);
    enemyOrder = state.enemies ? keepOrder(enemyOrder, state.enemies.sheets.map(s => s.id), state.enemies.top) : null;
    radioOrder = keepOrder(radioOrder, state.radio.map(s => s.id), state.radio[state.radio.length - 1]?.id);
    const mp = place('map');
    const deployOnNote = !state.clipboard;
    let html = `<div class="tb-obj tb-paper tb-map" data-obj="map" style="--x:${mp.x};--y:${mp.y};--w:880;--h:600;--r:${mp.r};--z:${zOf.map ?? 2}">
      ${mapSvg(state, sel)}<div class="crease v"></div><div class="crease h"></div>
      <div class="marg l">LANTMÄTERIET · 1:250 000 · SÖDERMANLAND</div><div class="marg r">${state.next && state.next.n > 1 ? `CORRECTED NIGHT ${state.next.n - 1}` : 'FIRST ISSUE'}</div>
      ${pinMarks(state)}</div>${insetSheet()}`;
    for (const pl of state.piles) {
      const pp = place(pl.id);
      html += pileHtml(pl, pp, { deploy: deployOnNote && pl.current });
    }
    if (state.radio.length) html += radioHtml(state.radio, radioOrder, place('radio'));
    if (state.enemies) html += enemyHtml(state.enemies, enemyOrder, state.intel, place('enemies'));
    if (state.clipboard) html += clipboardHtml(state.clipboard, place('clipboard'));
    if (state.zones) html += zonesHtml(state.zones, laneNote);
    const moved = Object.keys(tableOf(p).layout).length > 0;
    html += `<div class="tb-ring" style="left:1060px;top:60px;width:92px;height:92px;opacity:.7"></div>`;
    html += state.zones ? `<div class="tb-pencil" style="left:40px;top:640px;width:150px;transform:rotate(-58deg)"><i></i></div>`
      : `<div class="tb-pencil" style="left:1030px;top:780px;width:170px;transform:rotate(-14deg)"><i></i></div>`;
    if (moved) html += `<button type="button" class="tb-tidy" data-a="tidy">Tidy the table <kbd>T</kbd></button>`;
    if (spread) { const pl = state.piles.find(x => x.id === spread); if (pl) html += spreadHtml(pl); else spread = null; }
    html += '<svg class="tb-strings"></svg>';
    view.innerHTML = html;
    view.dataset.objects = state.objects.join(' ');
    // z-ordningen: senast flyttade överst
    for (const [id, z] of Object.entries(zOf)) { const o = view.querySelector(`[data-obj="${id}"]`); if (o) o.style.setProperty('--z', z); }
    wire();
    drawStrings();
  }
  // Ordningen i en hög som spelaren lagt om: nya blad kommer överst, klickade blad står kvar överst
  function keepOrder(cur, ids, top) {
    let out = cur ? cur.filter(id => ids.includes(id)) : [];
    for (const id of ids) if (!out.includes(id)) out.push(id);
    if (!cur && top) out = [...out.filter(id => id !== top), top];
    return out;
  }
  // Osynliga nålar i kartbladet där snöret fäster (de följer bladets vridning)
  function pinMarks(state) {
    const nb = state.next, xy = nb && sectorXY(nb.sector);
    return xy ? `<i class="tb-pin" data-pin="${nb.sector}" style="left:${10 + xy[0]}px;top:${10 + xy[1]}px"></i>` : '';
  }
  // Snöret från nästa strids order (gemet) till platsen på kartan
  function drawStrings() {
    const svg = view.querySelector('.tb-strings');
    if (!svg) return;
    const clip = view.querySelector('.tb-pile.current [data-sheet^="order"] [data-clip]'), pin = view.querySelector('.tb-pin');
    if (!clip || !pin || spread) { svg.innerHTML = ''; return; }
    // gemet sitter på den sida av ordern som vetter mot platsen (snöret går inte över texten)
    const sheetR = clip.parentElement.getBoundingClientRect(), q = pin.getBoundingClientRect();
    clip.classList.toggle('side', q.left < sheetR.left && q.top > sheetR.top - 40);
    const c = clip.getBoundingClientRect();
    const [x1, y1] = toTable(c.left + c.width / 2, c.top + c.height / 2), [x2, y2] = toTable(q.left, q.top);
    const sag = Math.min(60, Math.hypot(x2 - x1, y2 - y1) * 0.12);
    svg.innerHTML = `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q ${((x1 + x2) / 2).toFixed(1)} ${((y1 + y2) / 2 + sag).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" class="str"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="5.5" class="pinhead"/>`;
  }

  // ---------- handlingar ----------
  const save = q => { p = q; handlers.save?.(p); };
  function go() { const nb = tableState(p, { sector: sel }).next; if (nb) handlers.onGo?.(nb.sector); }
  function requisition() { const st = tableState(p, { sector: sel }); if (st.clipboard) handlers.onRequisition?.(st.next?.sector ?? sel); }
  function toggleSpread(id) { spread = spread === id ? null : id; render(); }
  function toLane(uid, lane) {
    const r = handlers.act?.('lane', uid, lane);
    if (!r) return;
    if (r.ok) { if (r.progress) p = r.progress; laneNote = null; } else laneNote = { lane, text: STATE_TEXT[r.reason] ?? 'Not possible.' };
    render();
  }
  function swap(a, b) {
    const r = handlers.act?.('swap', a, b);
    if (!r) return;
    if (r.ok) { if (r.progress) p = r.progress; laneNote = null; } else laneNote = { lane: 'battle', text: STATE_TEXT[r.reason] ?? 'Not possible.' };
    render();
  }
  function doTidy() { save(tidy(p)); for (const k of Object.keys(zOf)) delete zOf[k]; render(); }

  // ---------- pekaren: dra föremål och kort, klick ----------
  function wire() {
    for (const b of view.querySelectorAll('[data-a="go"]')) b.addEventListener('click', e => { e.stopPropagation(); go(); });
    view.querySelector('[data-a="req"]')?.addEventListener('click', e => { e.stopPropagation(); requisition(); });
    view.querySelector('[data-a="tidy"]')?.addEventListener('click', e => { e.stopPropagation(); doTidy(); });
    view.querySelector('.tb-spread')?.addEventListener('click', () => { spread = null; render(); });
  }
  let drag = null;
  view.addEventListener('pointerdown', e => {
    if (backdrop || e.button !== 0 || e.target.closest('button, .tb-spread')) return;
    const card = e.target.closest('.tb-card'), obj = e.target.closest('[data-obj]');
    const t = card ?? obj;
    if (!t) return;
    const [x, y] = toTable(e.clientX, e.clientY);
    drag = { t, card: !!card, id: card ? Number(card.dataset.uid) : obj.dataset.obj, x0: x, y0: y, moved: false, target: e.target,
      ox: Number(getComputedStyle(t).getPropertyValue('--x')) || 0, oy: Number(getComputedStyle(t).getPropertyValue('--y')) || 0 };
    t.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  view.addEventListener('pointermove', e => {
    if (!drag) return;
    const [x, y] = toTable(e.clientX, e.clientY), dx = x - drag.x0, dy = y - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) { drag.moved = true; drag.t.classList.add('dragging'); if (!drag.card) zOf[drag.id] = ++zTop; drag.t.style.setProperty('--z', drag.card ? 90 : zTop); }
    drag.t.style.setProperty('--x', Math.round(drag.ox + dx));
    drag.t.style.setProperty('--y', Math.round(drag.oy + dy));
    if (!drag.card) drawStrings();
    else for (const z of view.querySelectorAll('.tb-zone')) z.classList.toggle('over', hitZone(e, drag) === z);
  });
  // under pekaren, utom kortet som dras (d)
  const under = (e, d) => document.elementsFromPoint(e.clientX, e.clientY).filter(n => !(d && (n === d.t || d.t.contains(n))));
  const hitZone = (e, d) => under(e, d).map(n => n.closest?.('.tb-zone')).find(Boolean) ?? null;
  const hitCard = (e, d) => under(e, d).map(n => n.closest?.('.tb-card')).find(Boolean) ?? null;
  view.addEventListener('pointerup', e => {
    const d = drag; drag = null;
    if (!d) return;
    if (d.card) {
      const lane = d.t.dataset.lane;
      if (!d.moved) { toLane(d.id, lane === 'battle' ? 'rest' : 'battle'); return; }
      const other = hitCard(e, d), zone = hitZone(e, d);
      if (other && other.dataset.lane !== lane) { swap(d.id, Number(other.dataset.uid)); return; }
      if (zone && zone.dataset.zone !== lane) { toLane(d.id, zone.dataset.zone); return; }
      render();
      return;
    }
    if (d.moved) {
      const x = Number(d.t.style.getPropertyValue('--x')), y = Number(d.t.style.getPropertyValue('--y'));
      save(moveObject(p, d.id, x, y));
      render();
      return;
    }
    // ett klick
    if (d.id === 'map') {
      const s = d.target.closest?.('[data-sector]');
      if (s) { sel = s.dataset.sector; laneNote = null; render(); }
      return;
    }
    if (d.id === 'enemies') { const s = d.target.closest('[data-enemy]'); if (s && !s.classList.contains('top')) { enemyOrder = bringToTop(enemyOrder.map(id => ({ id })), s.dataset.enemy).map(x => x.id); render(); } return; }
    if (d.id === 'radio') { const s = d.target.closest('[data-strip]'); if (s) { radioOrder = bringToTop(radioOrder.map(id => ({ id })), s.dataset.strip).map(x => x.id); render(); } return; }
    if (d.id.startsWith('pile:')) toggleSpread(d.id);
  });
  view.addEventListener('pointercancel', () => { drag = null; render(); });
  addEventListener('resize', fit);
  render();
  fit();
  // typsnitten kan komma efter första ritningen: snöret ritas om
  document.fonts?.ready?.then(() => drawStrings());
  return {
    el,
    close: () => { removeEventListener('resize', fit); el.remove(); },
    selected: () => sel,
    progress: () => p,
    // Esc: en utbredd hög läggs ihop; annars false (spelmenyn öppnas)
    escape: () => { if (spread) { spread = null; render(); return true; } return false; },
    requisition, tidy: doTidy, go,
    spread: id => { spread = id; render(); },
  };
}
