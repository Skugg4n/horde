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
import { tableState, placeOf, moveObject, tidy, tableOf, bringToTop, closedSheet, frameFor, cardSlots, releasedCards, storeList, spendNudge } from '../meta/table.js';
import { unitOf, levelCost, refillCost, returnValue, canReturn, unitName } from '../meta/operation.js';
import { metaFeatures } from '../meta/unlocks.js';
import { ROMAN } from '../data/research.js';
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
      s += pen(x, y + 50, `${pl.status === 'silent' ? 'secure' : 'held'}, ${c.days} days`, 'middle');
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
  // 0.21.3: ögonblicket står en gång, på remsan överst på kartbladet (.tb-moment)
  const sub = 'SHEET 1 · SÖDERMANLAND';
  return `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" class="tb-mapsvg"><defs><filter id="tbrf"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="4"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0.35 -0.08"/></filter><pattern id="tbrelief" width="${MAP_W}" height="${MAP_H}" patternUnits="userSpaceOnUse"><rect width="${MAP_W}" height="${MAP_H}" filter="url(#tbrf)"/></pattern></defs>${s}<text x="26" y="44" class="ttl">Operation Södermanland</text><text x="27" y="60" class="sub">${sub}</text></svg>`;
}
// Gnesta-inzoomningen (ritfilm, mockupens .sheet.overlay) byggs senare. Kroken: returnera ett ark här när det finns
// (src/data/table.js INSET), så läggs det på kartan som föremålet 'inset'.
export function insetSheet() { return ''; }

// ---------- bladen ----------
const orderHtml = (o, { deploy = false, stamp = false, top = true } = {}) => `
  <div class="hd"${top ? '' : ' data-read'}><span>${esc(o.from.toUpperCase())}</span><span>ORDER ${two(o.n)}</span></div>
  <div class="meta">TO: ${esc(o.to)}<br>VALID: ${esc(o.valid)}</div>
  <div class="txt" data-read>${esc(o.text)}</div>
  ${o.sig ? `<div class="sig">${esc(o.sig)}</div>` : ''}
  ${deploy ? `<button type="button" class="tb-kbd" data-a="go">DEPLOY DAY ${o.n} · ENTER</button>` : ''}
  ${stamp ? `<div class="tb-stamp" style="right:12px;bottom:10px;transform:rotate(-3deg)">RECEIVED</div>` : ''}`;
// top: bladet ligger överst (texten ska gå att läsa); under ett annat blad räcker rubriken
const reportHtml = (r, top = true) => `${top ? '' : '<div class="tb-l2" data-read aria-hidden="true"></div>'}
  <div class="h"${top ? '' : ' data-read'}>Situation · night ${r.n}</div>
  <div class="txt"${top ? ' data-read' : ''}>${r.lead ? `<b>${esc(r.lead)}</b> ` : ''}${esc(r.text)}</div>
  <div class="sig">${esc(r.from)}</div>`;
const closedHtml = c => `
  <div class="hd"><span>${esc(c.name.toUpperCase())}</span><span>${c.days} DAYS</span></div>
  <div class="txt" data-read>${esc(c.text)}</div>
  <div class="tb-stamp olive" style="right:12px;bottom:10px;transform:rotate(-3deg)">${esc(c.stamp)}</div>`;
// Bara rubrikraden syns (ett blad under ett annat)
const edgeHead = sh => sh.kind === 'order' ? `<span>ORDER ${two(sh.n)}</span>`
  : sh.kind === 'report' ? `<span>SITUATION · NIGHT ${sh.n}</span>` : sh.kind === 'lost' ? `<span>DAY ${sh.n} · LOST</span>` : `<span>${esc(sh.name?.toUpperCase() ?? '')} · HELD</span>`;
// 0.21.1 (speltestet, fynd 5): en förlorad dag
const lostHtml = (l, deploy, top = true) => `
  <div class="hd"><span>DAY ${l.n}</span><span>LOST</span></div>
  <div class="txt" data-read><b>${esc(l.lead)}</b> ${esc(l.text)}</div>
  <div class="out"${top ? ' data-read' : ''}>${esc(l.outcome)}</div>
  ${deploy ? `<button type="button" class="tb-kbd" data-a="go">DEPLOY DAY ${l.n} · ENTER</button>` : ''}
  <div class="tb-stamp" style="right:12px;bottom:10px;transform:rotate(-3deg)">${esc(l.stamp)}</div>`;
function sheetHtml(sh, { x, y, r, z, full, deploy = false, stamp = false, w = null, top = true, old = false, current = false }) {
  const pos = `--x:${x};--y:${y};--r:${r};--z:${z}`, age = `${old ? ' old' : ''}${current ? ' cur' : ''}`;
  if (!full) return `<div class="tb-obj tb-paper tb-report tb-edge${age}" data-sheet="${sh.id}" style="${pos};--w:${w ?? 224};--h:110"><div class="hd" data-read>${edgeHead(sh)}</div></div>`;
  if (sh.kind === 'order') return `<div class="tb-obj tb-paper tb-order${top ? '' : ' under'}${age}${stamp ? ' stamped' : ''}" data-sheet="${sh.id}" style="${pos};--w:${w ?? 290}">${current ? '<span class="tb-newtab">NEW</span>' : ''}${orderHtml(sh, { deploy, stamp, top })}<div class="tb-clip" data-clip></div></div>`;
  if (sh.kind === 'report') return `<div class="tb-obj tb-paper tb-lined${age}" data-sheet="${sh.id}" style="${pos};--w:${w ?? 304};--h:338">${reportHtml(sh, top)}</div>`;
  if (sh.kind === 'lost') return `<div class="tb-obj tb-paper tb-report tb-lost${age}" data-sheet="${sh.id}" style="${pos};--w:${w ?? 270};padding-bottom:${deploy ? 14 : 40}px">${lostHtml(sh, deploy, top)}</div>`;
  return `<div class="tb-obj tb-paper tb-report${age}" data-sheet="${sh.id}" style="${pos};--w:${w ?? 232};padding-bottom:40px">${closedHtml(sh)}</div>`;
}
// En hupplagd hög: det översta bladet helt; på nästa strids hög sticker gårdagens rapport fram under ordern;
// äldre blad syns som kanter.
function pileHtml(pl, place, { deploy, spreadSrc = false }) {
  const edge = k => [-0.7, 0.5, -0.4][k % 3];
  let html = '';
  if (pl.current) {
    // 0.21.3 (Ola: "rörigt vad som är aktuellt och gammalt", H530): EN aktuell lapp. Nästa order ligger överst, rak och
    // ljus med en röd NEW-flik, och inget ligger över den. Gårdagens rapport (eller den förlorade dagen) ligger gulnad och
    // sned under, bara rubriken och första raden syns. Äldre än två nätter: bara kanter, gråa.
    const ti = pl.sheets.map(x => x.kind).lastIndexOf('order'), top = pl.sheets[ti];
    const rest = pl.sheets.filter((_, i) => i !== ti), last = rest.at(-1);
    const under = last && (last.kind === 'report' || last.kind === 'lost') ? last : null;
    // kanterna ligger ovanför högen; så många som ryms under bordets överkant (resten när man breder ut)
    const fit = Math.max(0, Math.min(2, Math.floor((place.y - 8) / 36)));
    const older = fit ? rest.slice(0, under ? -1 : undefined).slice(-fit) : [];
    older.forEach((o, k) => { const d = older.length - k; html += sheetHtml(o, { x: -10 * d, y: -36 * d, r: edge(k), z: k + 1, full: false, old: true }); });
    if (under) html += sheetHtml(under, { x: 0, y: 0, r: -2.5, z: 5, full: true, top: false, old: true });
    html += sheetHtml(top, { x: under ? 24 : 0, y: under ? (under.kind === 'report' ? 92 : 80) : 0, r: 0, z: 6, full: true, deploy, stamp: !deploy, current: true });
  } else {
    const sh = pl.sheets, n = sh.length, top = sh[n - 1];
    const older = sh.slice(Math.max(0, n - 3), n - 1);
    older.forEach((o, k) => { const d = older.length - k; html += sheetHtml(o, { x: 14 + 6 * (d - 1), y: -36 * d, r: edge(k), z: k + 1, full: false, old: true }); });
    html += sheetHtml(top, { x: 0, y: 0, r: 1.2, z: 6, full: true, deploy, old: true });
  }
  return `<div class="tb-pile${pl.current ? ' current' : ''}${spreadSrc ? ' spreadsrc' : ''}" data-obj="${pl.id}" data-sector="${pl.sector}" style="--x:${place.x};--y:${place.y};--z:${pl.current ? 20 : 9}" title="Click to spread">${html}</div>`;
}
// 0.21.3 (H530): klara sektorer i en arkivhög i hörnet. Det senast klara slutbladet (HELD) överst, de andra som kanter.
// Hela historien breds ut vid klick.
function archiveHtml(ar, place, spreadSrc) {
  const tops = ar.tops, n = tops.length;
  let html = '';
  tops.slice(0, -1).slice(-3).forEach((o, k, a) => { const d = a.length - k; html += sheetHtml(o, { x: 6 * d, y: -36 * d, r: [-0.6, 0.5, -0.4][k % 3], z: k + 1, full: false, old: true, w: 214 }); });
  html += sheetHtml(tops[n - 1], { x: 0, y: 0, r: -0.8, z: 6, full: true, old: true, w: 220 });
  return `<div class="tb-pile tb-archive${spreadSrc ? ' spreadsrc' : ''}" data-obj="archive" style="--x:${place.x};--y:${place.y};--z:8" title="Archive. Click to spread">${html}</div>`;
}
// Utbredd hög: bladen i rader över bordet, nyast först (högst åtta)
function spreadHtml(pl, fr) {
  // skalan så att texten är minst 11 px (bordets skala gånger bladets), så många blad som ryms
  const cw = 330, rh = 300, sc = Math.min(1, Math.max(0.82, 11.2 / (13.75 * fr.scale)));
  const cols = Math.max(1, Math.min(4, Math.floor((fr.W - 40) / (cw * sc)))), rows = Math.max(1, Math.floor((fr.H - 110) / (rh * sc)));
  const list = [...pl.sheets].reverse().slice(0, Math.min(8, cols * rows));
  const x0 = (fr.W - cols * cw * sc) / 2 + 8, y0 = 40;
  const cells = list.map((sh, i) => {
    const x = x0 + (i % cols) * cw * sc, y = y0 + Math.floor(i / cols) * rh * sc;
    return `<div class="tb-cell" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;transform:scale(${sc}) rotate(${[-1, 0.8, -0.5, 1.2][i % 4]}deg)">${sheetHtml(sh, { x: 0, y: 0, r: 0, z: 1, full: true })}</div>`;
  }).join('');
  const older = pl.sheets.length - list.length;
  return `<div class="tb-spread" data-spread="${pl.id}"><div class="tb-shade"></div>${cells}<div class="tb-spreadhint" data-read>${older > 0 ? `${older} older sheets in the pile · ` : ''}Click to stack</div></div>`;
}

// ---------- radion ----------
function radioHtml(strips, order, place) {
  const list = order.map(id => strips.find(s => s.id === id)).filter(Boolean).slice(-3);
  const n = list.length;
  const html = list.map((s, k) => {
    const top = k === n - 1;
    return `<div class="tb-obj tb-strip${top ? '' : ' under'}" data-strip="${s.id}" style="--x:${k * 5};--y:${k * 28};--w:246;--r:${[-2, 1.2, -1][k % 3]};--z:${k + 1}">
      <div class="h" data-read><span>RADIO</span><i>${esc(s.at)}</i><span>${esc(s.from.toUpperCase())}</span></div>${top ? `<div class="txt" data-read>${esc(s.text)}</div>` : ''}</div>`;
  }).join('');
  return `<div class="tb-pile tb-radio" data-obj="radio" style="--x:${place.x};--y:${place.y};--z:8">${html}</div>`;
}

// ---------- fiendehögen ----------
function enemyHtml(pile, order, intel, place, fr) {
  const list = order.map(id => pile.sheets.find(s => s.id === id)).filter(Boolean);
  const n = list.length, H = 196, STEP = 30;
  const html = list.map((e, k) => {
    const top = k === n - 1, grey = e.status === 'REPORTED';
    const tab = `<div class="tab" data-read><b>${esc(e.name)}</b>${e.status === 'NEW' ? `<i>${two(e.no)} · NEW</i>` : `<span>${two(e.no)} · ${e.status}</span>`}</div>`;
    if (!top) return `<div class="tb-obj tb-paper tb-enemy${grey ? ' grey' : ''}" data-enemy="${e.id}" style="--x:${[6, 0, 8, 2][k % 4]};--y:${k * STEP};--w:236;--h:${H};--r:${[0.6, -0.5, 0.4, -0.6][k % 4]};--z:${k + 1}">${tab}</div>`;
    return `<div class="tb-obj tb-paper tb-enemy top${grey ? ' grey' : ''}" data-enemy="${e.id}" style="--x:4;--y:${k * STEP + 2};--w:236;--h:${H};--r:0.8;--z:${k + 1}">${tab}
      <div class="body"><div class="t" data-read>${esc(e.text)}</div><span class="fig">${FOE_ICONS[e.type] ?? FOE_ICONS.unknown}</span></div>
      <div class="stats"${intel ? '' : ' data-read'}>${e.stats.map(([k2, v]) => `<span>${k2}<b>${esc(v)}</b></span>`).join('')}</div></div>`;
  }).join('');
  const topY = (n - 1) * STEP + 2 + H;
  // lappen ligger på fiendebladets nedre del; räcker inte höjden (litet fönster, många fiender) läggs den på bordet
  // ovanför korten, till vänster om klämbrädan, så att klämbrädans rubrik syns
  const low = fr && place.y + topY - 58 + 150 > fr.clipY + 36;
  const nx = low ? Math.round(fr.clipX - 226 - place.x) : 30, ny = low ? Math.round(fr.zoneY - 158 - place.y) : topY - 58;
  const note = intel ? `<div class="tb-obj tb-postit" data-intel style="--x:${nx};--y:${ny};--w:206;--r:-3;--z:${n + 2}"><div class="h">${esc(intel.head)}</div><div class="txt" data-read>${esc(intel.text)}</div></div>` : '';
  return `<div class="tb-pile tb-enemies" data-obj="enemies" style="--x:${place.x};--y:${place.y};--z:14">${html}${note}</div>`;
}

// ---------- personalrullan (0.21.7, Ola: korten blev rörigt, H544, mockup docs/mockups/kontrollrum-4b) ----------
// Klämbrädan vid kanten är trupplistan: en maskinskriven rad per enhet med två blyertsrutor, Battle och Res. Ett klick
// på en ruta kryssar den och flyttar enheten (den andra rutan töms); förrådets tak och trötthet gäller som förut. 20 rader
// per blad, fler enheter på nästa blad som sticker ut under. Ledningens släppta enheter är ett eget blad (BUY-ruta per
// rad). Inget på bordet rullar (H542): det som inte ryms läggs på ett blad till.
export const ROSTER_ROWS = 20;
const STATE_CLS = f => (f == null ? 'ok' : f === 0 ? 'ok' : f === 1 ? 'tired' : 'bad');
function rosterRows(z, wide, menuOn) {
  const all = [...z.battle.map(c => ({ ...c, lane: 'battle' })), ...z.rest.map(c => ({ ...c, lane: 'rest' }))];
  return all;
}
// Raderna i fast ordning (typ, nummer): de hoppar inte när en ruta kryssas
const TYPE_ORDER = ['hv', 'civ', 'inf', 'm249', 'm2', 'ksp58', 'ak5', 'psg90', 'epa'];
export function rosterOrder(rows) {
  return [...rows].sort((a, b) => ((TYPE_ORDER.indexOf(a.type) + 1 || 99) - (TYPE_ORDER.indexOf(b.type) + 1 || 99)) || a.uid - b.uid);
}
function rowHtml(c, wide, pencil) {
  const box = (lane, on) => `<button type="button" class="tb-box${on ? ' on' : ''}" data-box="${lane}" data-uid="${c.uid}" aria-label="${lane === 'battle' ? 'Into battle' : 'Reserve'}"><i>${on ? '✕' : ''}</i></button>`;
  const st = c.moved ? `<span class="mv" title="${esc(c.moved.long)}">Moved</span>` : `<span class="${STATE_CLS(c.fatigue)}">${esc(c.state)}</span>`;
  const stars = '★'.repeat(Math.max(1, Math.min(3, c.level)));
  return `<div class="tb-row" data-uid="${c.uid}">${box('battle', c.lane === 'battle')}${box('rest', c.lane === 'rest')}
    <span class="un" data-read data-name>${esc(c.name)}</span>${wide ? `<span class="ty">${esc(c.role)}</span>` : ''}
    <span class="mn">${c.max ? `${c.men}/${c.max}` : '1/1'}</span><span class="sv" data-read data-fat>${st}</span>
    <span class="lvl" title="Level ${c.level}${c.vet ? ', veteran' : ''}">${stars}</span>${pencil ? `<button type="button" class="tb-pm" data-pm data-a="lvl" data-uid="${c.uid}" aria-label="Train, refill or return" title="Train, refill or return">✎</button>` : ''}</div>`;
}
// pages: rullans blad (20 rader var) och bladet med släppta enheter; page: det som ligger överst
function rosterHtml(state, place, fr, { page, note, cm, nudge = null }) {
  const z = state.zones, nb = state.next, p = state._p;
  const wide = fr.rosterW >= 470, pencil = true;
  const rows = rosterOrder(rosterRows(z));
  const sheets = [];
  for (let i = 0; i < Math.max(1, Math.ceil(rows.length / ROSTER_ROWS)); i++) sheets.push({ kind: 'roster', i, rows: rows.slice(i * ROSTER_ROWS, (i + 1) * ROSTER_ROWS) });
  const rel = metaFeatures(p).has('requisition') ? releasedCards(p, z.sector) : null;
  if (rel) sheets.push({ kind: 'released', rows: rel });
  // 0.23.1 (speltestet av 0.23.0: efter ett köp hoppade bladet till rullans blad 2 och nästa klick missade): 'rel' är
  // bladet med släppta enheter var det än hamnar när rullan får ett blad till
  const relAt = sheets.findIndex(x => x.kind === 'released');
  const top = page === 'rel' ? (relAt >= 0 ? relAt : 0) : Math.min(page, sheets.length - 1), cur = sheets[top];
  const title = nb ? `${esc(nb.place)} · Day ${nb.n}` : 'Personnel';
  const head = cur.kind === 'roster'
    ? `<div class="th"><b data-read>${title}</b><span class="rq" data-read>REQUISITION <i>${p.rp}</i></span></div><div class="sub" data-read>Personnel roster${sheets.filter(x => x.kind === 'roster').length > 1 ? ` · sheet ${cur.i + 1}` : ''}${nb?.title ? ` · ${esc(nb.title.toLowerCase())}` : ''}</div>
       <div class="tb-row hd"><span class="bx" title="Into battle">BTL</span><span class="bx" title="Reserve">RES</span><span class="un">UNIT</span>${wide ? '<span class="ty">TYPE</span>' : ''}<span class="mn">MEN</span><span class="sv">STATE</span><span class="lvl">LVL</span>${pencil ? '<span class="tb-pm sp"></span>' : ''}</div>
       ${cur.rows.map(c => rowHtml(c, wide, pencil)).join('')}`
    : `<div class="th"><b data-read>Released by command</b><span class="rq" data-read>REQUISITION <i>${p.rp}</i></span></div><div class="sub" data-read>New units for ${esc(nb?.place ?? '')}</div>
       <div class="tb-row hd rel"><span class="un">UNIT</span><span class="ty">TYPE</span><span class="mn">MEN</span><span class="pr">PRICE</span><span class="bx">BUY</span></div>
       ${cur.rows.length ? cur.rows.map(c => `<div class="tb-row rel${c.ok ? '' : ' off'}"><span class="un" data-read>${esc(c.name)}</span><span class="ty">${esc(c.role)}</span><span class="mn">${c.max ? `${c.max}/${c.max}` : '1/1'}</span><span class="pr" data-read>${c.ok ? `${c.cost} RP` : c.reason === 'rp' ? `Need ${c.cost}` : 'Not now'}</span><button type="button" class="tb-box buy" data-req="${c.type}" ${c.ok ? '' : 'disabled'} aria-label="Buy"><i></i></button></div>`).join('')
         : '<p class="none" data-read>Nothing released here yet.</p>'}`;
  const tabs = sheets.map((sh, k) => (k === top ? '' : `<button type="button" class="tb-tab" data-page="${k}"${sh.kind === 'released' ? ' data-rel="1"' : ''}>${sh.kind === 'roster' ? (sheets.filter(x => x.kind === 'roster').length > 1 ? `Roster · sheet ${sh.i + 1}` : 'Roster') : `Released by command${sh.rows.some(r => r.ok) ? ` · ${sh.rows.length} new` : ''}`}</button>`)).join('');
  const foot = `<div class="ft" data-read><span>BATTLE <b>${z.battle.length} of ${z.cap}</b></span><span>RESERVE <b>${z.rest.length}</b></span></div>
    <div class="note" data-read>${esc(note ?? '')}</div>`;
  const under = sheets.length > 1 ? sheets.map((_, k) => (k === top ? '' : `<div class="tb-under" style="--k:${Math.min(2, k + 1)}"></div>`)).join('') : '';
  return `<div class="tb-obj tb-roster" data-obj="clipboard" style="--x:${place.x};--y:${place.y};--w:${fr.rosterW};--h:${fr.rosterH};--r:0.6;--z:45"><div class="jaw"></div>
    ${under}<div class="pg ${cur.kind}">${head}${cur.kind === 'roster' ? foot : `<div class="note" data-read>${esc(note ?? '')}</div>`}
      ${nudge ? `<div class="tb-nudge" data-read><p>You have ${nudge.rp} RP. Spend it?</p><button type="button" class="tb-btn" data-a="spend">Open requisition</button><button type="button" class="tb-btn main" data-a="go" data-read><span class="one">Deploy anyway</span><kbd>Enter</kbd></button></div>`
        : nb ? `<button type="button" class="tb-btn main" data-a="go" data-read><span class="one">Deploy day ${nb.n}</span><kbd>Enter</kbd></button>` : ''}</div>
    <div class="tabs">${tabs}</div></div>`;
}
// Förrådet: två (eller fler) blad med hundöra, så många rader som ryms, inget rullar
function storesHtml(ups, rp, fr, sheet) {
  const per = Math.max(1, Math.floor((fr.storesH - 82) / 64)), n = Math.max(1, Math.ceil(ups.length / per)), s0 = sheet % n;
  const list = ups.slice(s0 * per, (s0 + 1) * per);
  const under = Array.from({ length: Math.min(2, n - 1) }, (_, k) => `<div class="tb-under" style="--k:${k + 1}"></div>`).join('');
  return `<div class="tb-obj tb-stores" data-obj="stores" style="--x:${Math.round(fr.storesX)};--y:${Math.round(fr.storesY)};--w:${fr.storesW};--h:${fr.storesH};--r:-0.8;--z:12">${under}
    <div class="pg"><div class="h" data-read>Stores <i>${rp} RP</i><span>${n > 1 ? `sheet ${s0 + 1} of ${n}` : ''}</span></div>
    ${list.map(u => `<button type="button" class="tb-up${u.bought ? ' done' : u.ok ? '' : ' off'}" data-up="${u.id}" ${u.bought ? 'disabled' : ''}><b data-read>${u.bought ? '✓ ' : ''}${esc(u.name)} ${ROMAN[u.tier] ?? ''}</b><span data-read>${esc(u.effect)}</span><i data-read>${u.bought ? 'Bought' : u.ok ? `${u.cost} RP` : `Need ${u.cost}`}</i></button>`).join('')}
    ${n > 1 ? `<button type="button" class="tb-dog" data-dog aria-label="Next sheet"><span>sheet ${(s0 + 1) % n + 1} →</span></button>` : ''}</div></div>`;
}
// Tröttheten flyttade någon efter dagen: en rad på rullan
function movedNote(z) {
  const m = [...z.battle, ...z.rest].filter(c => c.moved);
  return m.length ? m.map(c => `${c.name}: ${c.moved.long.toLowerCase()}`).join('. ') + '.' : '';
}
const WEAPONS_NAME = type => unitName({ type });
// Liten meny på ett kort (⋯): nästa nivå, påfyllnad och tillbaka, med pris
function cardMenuHtml(p, uid) {
  const u = unitOf(p, uid);
  if (!u) return '';
  const m = metaFeatures(p), lc = levelCost(u), rc = refillCost(p, u), rv = returnValue(u), cr = canReturn(p, uid);
  const item = (a, label, price, ok, why = '') => `<button type="button" class="tb-cm${ok ? '' : ' off'}" data-cm="${a}" ${ok ? '' : 'disabled'}><span data-read>${label}</span><i>${ok ? price : why}</i></button>`;
  const rows = [];
  if (m.has('levels')) rows.push(lc != null ? item('level', `Level ${ROMAN[u.level + 1]}`, `${lc} RP`, p.rp >= lc, `Need ${lc} RP`) : item('level', 'Max level', '', false, ''));
  if (u.men != null) rows.push(rc ? item('refill', 'Refill', `${rc} RP`, p.rp >= rc, `Need ${rc} RP`) : item('refill', 'Full strength', '', false, ''));
  if (m.has('return')) rows.push(item('return', 'Return', rv ? `+${rv} RP` : 'No RP back', cr.ok, 'Last unit'));
  return rows.join('');
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
  let p = progress, sel = selected, spread = null, laneNote = null, enemyOrder = null, radioOrder = null, zTop = 20, page = 0, storeSheet = 0, cmenu = null, confirmReturn = null;
  // 0.22.1: påminnelsen om osparade RP (en gång per gång bordet visas)
  let nudge = null, nudged = false;
  const zOf = {};
  // ---------- skalan: designrummet till fönstret ----------
  // 0.21.1: bordets yta följer fönstret (src/meta/table.js frameFor): skalan minst MIN_SCALE, ytan W x H
  let scale = 1, ox = 0, oy = 0, fr = frameFor(TABLE_W, TABLE_H);
  const fit = (first = false) => {
    const W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight;
    const f = frameFor(W, H), changed = f.W !== fr.W || f.H !== fr.H;
    fr = f; scale = f.scale;
    ox = (W - f.W * scale) / 2; oy = (H - f.H * scale) / 2;
    view.style.width = f.W + 'px'; view.style.height = f.H + 'px';
    view.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
    if (changed && !first) render(); else drawStrings();
  };
  const toTable = (cx, cy) => { const r = el.getBoundingClientRect(); return [(cx - r.left - ox) / scale, (cy - r.top - oy) / scale]; };

  function render() { renderNow(); }
  function renderNow() {
    const state = tableState(p, { sector: sel });
    state._p = p;
    if (sel == null || !state.piles.some(x => x.sector === sel)) sel = state.next?.sector ?? sel;
    const place = id => placeOf(p, state, id, fr);
    enemyOrder = state.enemies ? keepOrder(enemyOrder, state.enemies.sheets.map(s => s.id), state.enemies.top) : null;
    radioOrder = keepOrder(radioOrder, state.radio.map(s => s.id), state.radio[state.radio.length - 1]?.id);
    const mp = place('map');
    const deployOnNote = !state.clipboard;
    let html = `<div class="tb-obj tb-paper tb-map" data-obj="map" style="--x:${mp.x};--y:${mp.y};--w:880;--h:600;--r:${mp.r};--s:${fr.mapS.toFixed(3)};--z:${zOf.map ?? 2}">
      ${mapSvg(state, sel)}<div class="crease v"></div><div class="crease h"></div>
      <div class="marg l">LANTMÄTERIET · 1:250 000 · SÖDERMANLAND</div><div class="marg r">${state.next && state.next.n > 1 ? `CORRECTED NIGHT ${state.next.n - 1}` : 'FIRST ISSUE'}</div>
      ${state.next ? `<div class="tb-moment" data-read>${state.next.n > 1 ? `Night ${state.next.n - 1} → Day ${state.next.n}` : `Day ${state.next.n}`}</div>` : ''}
      ${pinMarks(state)}</div>${insetSheet()}`;
    for (const pl of state.piles) {
      if (pl.closed) continue;
      const pp = place(pl.id);
      html += pileHtml(pl, pp, { deploy: deployOnNote && pl.current, spreadSrc: spread === pl.id });
    }
    if (state.archive) html += archiveHtml(state.archive, place('archive'), spread === 'archive');
    if (state.radio.length) html += radioHtml(state.radio, radioOrder, place('radio'));
    if (state.enemies) html += enemyHtml(state.enemies, enemyOrder, state.intel, place('enemies'), null);
    // 0.21.7: personalrullan på klämbrädan och förrådets blad (H544, H542)
    const rosterOn = !!(state.clipboard && state.zones);
    if (rosterOn) html += rosterHtml(state, place('clipboard'), fr, { page, note: laneNote?.text ?? movedNote(state.zones), nudge });
    const ups = rosterOn ? storeList(p) : [];
    if (ups.length) html += storesHtml(ups, p.rp, fr, storeSheet);
    const moved = Object.keys(tableOf(p).layout).length > 0;
    html += `<div class="tb-ring" style="left:1060px;top:60px;width:92px;height:92px;opacity:.7"></div>`;
    html += rosterOn ? `<div class="tb-pencil" style="left:${Math.round(fr.clipX - 60)}px;top:${Math.round(fr.H - 120)}px;width:150px;transform:rotate(-58deg)"><i></i></div>`
      : `<div class="tb-pencil" style="left:1030px;top:780px;width:170px;transform:rotate(-14deg)"><i></i></div>`;
    if (moved) html += `<button type="button" class="tb-tidy" data-a="tidy">Tidy the table <kbd>T</kbd></button>`;
    if (spread) { const pl = spread === 'archive' ? state.archive : state.piles.find(x => x.id === spread); if (pl) html += spreadHtml(pl, fr); else spread = null; }
    html += '<svg class="tb-strings"></svg>';
    view.innerHTML = html;
    view.dataset.objects = state.objects.join(' ');
    view.classList.toggle('briefing', state.briefing);
    // rullan ligger på bordet: roten får .roster (förrådets lektioner pekar också på .hub.roster [data-a="lvl"], [data-req], [data-up], [data-fat])
    el.classList.toggle('roster', rosterOn);
    view.querySelector('.tb-roster')?.classList.toggle('lifted', !!nudge);
    // z-ordningen: senast flyttade överst
    for (const [id, z] of Object.entries(zOf)) { const o = view.querySelector(`[data-obj="${id}"]`); if (o) o.style.setProperty('--z', z); }
    // kortets meny (⋯) intill kortet
    const mc = cmenu != null && view.querySelector(`.tb-row[data-uid="${cmenu}"] .tb-pm`);
    if (mc) {
      const r = mc.getBoundingClientRect(), [cx, cy] = toTable(r.right, r.top), [lx] = toTable(r.left, r.top);
      const m = document.createElement('div');
      m.className = 'tb-cmenu'; m.innerHTML = cardMenuHtml(p, cmenu) + (confirmReturn === cmenu ? '<p class="ask" data-read>Return it? Click Return again.</p>' : '');
      const right = cx + 8 + 230 < fr.W;
      m.style.left = `${Math.round(right ? cx + 8 : lx - 238)}px`; m.style.top = `${Math.round(Math.max(8, Math.min(cy, fr.H - 170)))}px`;
      view.appendChild(m);
    } else cmenu = null;
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
    // dag 1 (bara kartan och lappen) har inget snöre, som i mockupen
    if (!clip || !pin || spread || view.classList.contains('briefing')) { svg.innerHTML = ''; return; }
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
  // 0.22.1 (speltestet av 0.22.0, fynd 5): räcker RP till något när spelaren trycker Deploy lyfts klämbrädan en gång
  // med en rad och två val, Deploy anyway och Open requisition
  function go() {
    const st = tableState(p, { sector: sel }), nb = st.next;
    if (!nb) return;
    if (!nudged && st.clipboard && st.zones) { const n = spendNudge(p, st.zones.sector); if (n) { nudged = true; nudge = n; render(); return; } }
    nudge = null; handlers.onGo?.(nb.sector);
  }
  // R: bladet med släppta enheter överst (eller tillbaka till rullan)
  function requisition(on = null) {
    const st = tableState(p, { sector: sel });
    if (!st.clipboard || !st.zones) return;
    const rosterSheets = Math.max(1, Math.ceil((st.zones.battle.length + st.zones.rest.length) / ROSTER_ROWS));
    const relPage = metaFeatures(p).has('requisition') ? rosterSheets : -1;
    if (relPage < 0) return;
    page = (on ?? page !== 'rel') ? 'rel' : 0; cmenu = null; render();
  }
  function toggleSpread(id) { spread = spread === id ? null : id; render(); }
  // en ruta: enheten flyttas (förrådets regler: taket, tomma grupper)
  function lane(uid, to) {
    const r = handlers.act?.('lane', uid, to);
    if (!r) return;
    if (r.ok) { if (r.progress) p = r.progress; laneNote = null; } else laneNote = { lane: to, text: STATE_TEXT[r.reason] ?? 'Not possible.' };
    render();
  }
  function buy(type) {
    const st = tableState(p, { sector: sel }), sector = st.zones?.sector ?? st.next?.sector;
    const r = handlers.act?.('buy', type, sector, null, null);
    if (!r) return;
    if (!r.ok) { laneNote = { lane: 'rest', text: r.reason === 'rp' ? `Need ${r.cost} RP.` : 'Not released here.' }; render(); return; }
    p = r.progress;
    const u = p.op.units.find(x => x.uid === r.uid);
    laneNote = { lane: 'rest', text: `${u ? (WEAPONS_NAME(u.type)) : 'Unit'} added to the roster, in reserve.` };
    render();
  }
  function doTidy() { save(tidy(p)); for (const k of Object.keys(zOf)) delete zOf[k]; render(); }

  // ---------- pekaren: dra föremål och kort, klick ----------
  function wire() {
    for (const b of view.querySelectorAll('[data-up]')) b.addEventListener('click', e => { e.stopPropagation(); const r = handlers.act?.('upgrade', b.dataset.up); if (r?.ok) p = r.progress; render(); });
    for (const b of view.querySelectorAll('[data-pm]')) b.addEventListener('click', e => { e.stopPropagation(); const uid = Number(b.dataset.uid); cmenu = cmenu === uid ? null : uid; confirmReturn = null; render(); });
    for (const b of view.querySelectorAll('[data-box]')) b.addEventListener('click', e => { e.stopPropagation(); if (!b.classList.contains('on')) lane(Number(b.dataset.uid), b.dataset.box); });
    for (const b of view.querySelectorAll('[data-req]')) b.addEventListener('click', e => { e.stopPropagation(); buy(b.dataset.req); });
    for (const b of view.querySelectorAll('[data-page]')) b.addEventListener('click', e => { e.stopPropagation(); page = b.dataset.rel ? 'rel' : Number(b.dataset.page); cmenu = null; laneNote = null; render(); });
    view.querySelector('[data-dog]')?.addEventListener('click', e => { e.stopPropagation(); storeSheet++; render(); });
    for (const b of view.querySelectorAll('[data-cm]')) b.addEventListener('click', e => {
      e.stopPropagation();
      const kind = b.dataset.cm, uid = cmenu;
      if (kind === 'return' && confirmReturn !== uid) { confirmReturn = uid; render(); return; }
      const r = handlers.act?.(kind, uid);
      if (r?.ok) { p = r.progress; if (kind === 'return') cmenu = null; }
      confirmReturn = null; render();
    });
    for (const b of view.querySelectorAll('[data-a="go"]')) b.addEventListener('click', e => { e.stopPropagation(); go(); });
    view.querySelector('[data-a="spend"]')?.addEventListener('click', e => { e.stopPropagation(); nudge = null; page = 0; laneNote = { lane: 'rest', text: 'Train units with ✎, or buy in Stores.' }; render(); });
    view.querySelector('[data-a="tidy"]')?.addEventListener('click', e => { e.stopPropagation(); doTidy(); });
    view.querySelector('.tb-spread')?.addEventListener('click', () => { spread = null; render(); });
  }
  let drag = null;
  view.addEventListener('pointerdown', e => {
    if (backdrop || e.button !== 0 || e.target.closest('button, .tb-spread')) return;
    // en öppen kortmeny eller lyft klämbräda stängs av ett klick bredvid
    if (cmenu != null && !e.target.closest('.tb-cmenu')) { cmenu = null; confirmReturn = null; render(); return; }
    const t = e.target.closest('[data-obj]');
    if (!t) return;
    const [x, y] = toTable(e.clientX, e.clientY);
    drag = { t, id: t.dataset.obj, x0: x, y0: y, moved: false, target: e.target,
      ox: Number(getComputedStyle(t).getPropertyValue('--x')) || 0, oy: Number(getComputedStyle(t).getPropertyValue('--y')) || 0 };
    t.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  view.addEventListener('pointermove', e => {
    if (!drag) return;
    const [x, y] = toTable(e.clientX, e.clientY), dx = x - drag.x0, dy = y - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) { drag.moved = true; drag.t.classList.add('dragging'); zOf[drag.id] = ++zTop; drag.t.style.setProperty('--z', zTop); }
    drag.t.style.setProperty('--x', Math.round(drag.ox + dx));
    drag.t.style.setProperty('--y', Math.round(drag.oy + dy));
    drawStrings();
  });
  view.addEventListener('pointerup', e => {
    const d = drag; drag = null;
    if (!d) return;
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
    if (d.id.startsWith('pile:') || d.id === 'archive') toggleSpread(d.id);
  });
  view.addEventListener('pointercancel', () => { drag = null; render(); });
  // 0.21.2 (speltestet av 0.21.1, fynd 1: Deploy utanför bild efter att fönstret krympts): ny layout när fönstret
  // ändras, en gång när storleken stått still en stund
  let resizeT = 0;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(() => fit(false), 120); };
  addEventListener('resize', onResize);
  fit(true);
  render();
  // typsnitten kan komma efter första ritningen: snöret ritas om
  document.fonts?.ready?.then(() => drawStrings());
  return {
    el,
    close: () => { clearTimeout(resizeT); removeEventListener('resize', onResize); el.remove(); },
    selected: () => sel,
    progress: () => p,
    // Esc: en utbredd hög läggs ihop; annars false (spelmenyn öppnas)
    escape: () => { if (nudge) { nudge = null; render(); return true; } if (cmenu != null) { cmenu = null; render(); return true; } if (page) { page = 0; laneNote = null; render(); return true; } if (spread) { spread = null; render(); return true; } return false; },
    // förrådets lektioner (main.js lessonCond 'depot'): rullan ligger på bordet
    lifted: () => el.classList.contains('roster'),
    page: () => page,
    requisition, tidy: doTidy, go,
    spread: id => { spread = id; render(); },
  };
}
