// Kartbordet (0.21.0): vad som ligger på bordet mellan dagarna, som rena funktioner av framsteget. Bilden ritas av
// src/ui/table.js; reglerna för enheterna är förrådets (src/meta/operation.js lanes, setLane), bordet lägger inget till.
// Spec: docs/superpowers/specs/2026-10-19-kartbordet-bygge.md.
//
//   Kartan        alltid. Sektorerna med läge, och DAY n på nästa strid.
//   Uppdragshögar en per sektor som nåtts: order och lägesrapport per dag, nyast överst (ordern för nästa dag ligger
//                 på rapporten från dagen före). En klar sektor får ett slutblad med stämpeln HELD.
//   Fiendehögen   ett blad per typ man mött, från första mötet. Rapporterade typer (i nästa strids underrättelser,
//                 inte mötta än) ligger grå underst. Lappen "What we face" är förrådets INTEL, från operationskartan.
//   Radion        remsor från P4 Sörmland: dagens report med from 'P4 Sörmland', annars RADIO i src/data/table.js.
//   Korten        förrådets två banor, Into battle och Reserve, från förrådet (depot i src/meta/unlocks.js).
//   Klämbrädan    nästa strid, RP, Requisition och Deploy, från förrådet. Före det står Deploy på ordern.
//
// Sparfilen: progress.table = { layout: { [objekt-id]: { x, y } }, log: { 'bana:dag': { kills, waves, lost, saved } } }.
// Fältet är valfritt (äldre v4-filer saknar det) och tvättas av normalizeTable; inget annat i sparfilen rörs.
import { MAPS } from '../data/maps.js';
import { SECTORS, RELEASES, poolOf } from '../data/depot.js';
import { ENEMIES } from '../data/lessons.js';
import { ZOMBIES } from '../data/zombies.js';
import { WEAPONS } from '../data/weapons.js';
import { SECTOR_TABLE, SPARE_SLOTS, RADIO, SENDERS, ADDRESSEE, ENEMY_SHEET, ROLE, TABLE_W, TABLE_H } from '../data/table.js';
import { mapState, mapUnlocked } from './progress.js';
import { STAGES, stageIndex, stageReached, furthestPlayed, metaFeatures } from './unlocks.js';
import { openSectors, currentMap, sectorStatus, lanes, setLane, unitsIn, maxMen, vetOf, unitName, unitOf } from './operation.js';
import { intelFor, TYPE_ORDER } from './intel.js';
import { isSeen } from './lessons.js';
import { FATIGUE } from '../sim/sanity.js';

// ---------- sparfilens del ----------
export const emptyTable = () => ({ layout: {}, log: {} });
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = x => (typeof x === 'number' && Number.isFinite(x) ? x : null);
// Lägena hålls på bordet: minst ett hörn av föremålet går att ta i.
export const clampPlace = (x, y) => ({ x: Math.round(Math.max(-240, Math.min(TABLE_W - 80, x))), y: Math.round(Math.max(-120, Math.min(TABLE_H - 60, y))) });
// Okända eller trasiga fält tas bort; inget kastar. En äldre sparfil utan table får ett tomt bord.
export function normalizeTable(t) {
  const out = emptyTable();
  if (!isObj(t)) return out;
  if (isObj(t.layout)) for (const [id, v] of Object.entries(t.layout)) {
    if (isObj(v) && num(v.x) != null && num(v.y) != null) out.layout[id] = clampPlace(v.x, v.y);
  }
  if (isObj(t.log)) for (const [k, v] of Object.entries(t.log)) {
    if (!isObj(v)) continue;
    const e = {};
    for (const f of ['kills', 'waves', 'lost', 'saved', 'total']) if (num(v[f]) != null && v[f] >= 0) e[f] = Math.round(v[f]);
    out.log[k] = e;
  }
  return out;
}
export const tableOf = p => normalizeTable(p?.table);
export const withTable = p => ({ ...p, table: normalizeTable(p.table) });

// Flytta ett föremål (dra och släpp). Läget sparas per id i designrummets bildpunkter (1440 x 900).
export function moveObject(p, id, x, y) {
  const t = tableOf(p);
  return { ...p, table: { ...t, layout: { ...t.layout, [id]: clampPlace(x, y) } } };
}
// Tidy: allt tillbaka till sin plats.
export function tidy(p) {
  const t = tableOf(p);
  return { ...p, table: { ...t, layout: {} } };
}
// En vunnen dag: siffrorna som lägesrapporten skrivs av när dagen saknar egen text.
export function recordDay(p, { mapId, day, kills = 0, waves = 0, lost = 0, saved = null, total = null }) {
  const t = tableOf(p), e = { kills, waves, lost };
  if (saved != null) e.saved = saved;
  if (total != null) e.total = total;
  return { ...p, table: { ...t, log: { ...t.log, [`${mapId}:${day}`]: normalizeTable({ log: { x: e } }).log.x } } };
}

// ---------- kampanjens dagar ----------
// Kampanjens ordning är upplåsningsschemat (src/meta/unlocks.js STAGES). En dag kan säga sitt eget nummer med
// day.campaignDay (när kampanjbågen kortar banorna), annars räknas dagarna i ordning.
export const CAMPAIGN = STAGES.filter(s => s.map).map(s => ({ map: s.map, day: s.day }));
export function campaignDay(mapId, day) {
  const own = MAPS[mapId]?.days?.[day - 1]?.campaignDay;
  if (Number.isInteger(own) && own > 0) return own;
  const i = CAMPAIGN.findIndex(c => c.map === mapId && c.day === day);
  return i >= 0 ? i + 1 : day;
}
// Nästa strid: sektorn (den valda om den har en dag kvar), banan och dagen. null när inget återstår.
export function nextBattle(p, sector = null) {
  const open = openSectors(p).filter(id => currentMap(p, id));
  const want = sector != null ? poolOf(sector) : null;
  const id = want && open.includes(want) ? want : open.includes(poolOf(p.mapId)) ? poolOf(p.mapId) : open[0];
  if (!id) return null;
  const map = currentMap(p, id), day = mapState(p, map).unlockedDay;
  return { sector: id, map, day, n: campaignDay(map, day), title: titleOf(map, day) };
}
const releaseOf = (map, day) => RELEASES.find(r => r.map === map && r.day === day) ?? null;
// "Day 3: Brutes" -> "Brutes"
export function titleOf(map, day) {
  const t = MAPS[map]?.days?.[day - 1]?.intro?.title ?? '';
  return t.includes(':') ? t.split(':').slice(1).join(':').trim() : t;
}
const sender = k => SENDERS[k] ?? k ?? 'Försvarsmakten';
// Platsens namn i rapporterna
const PLACE = { riksvagen: 'The roadblock', gnesta: 'The ice rink', 'gnesta-norr': 'Vikingavägen', molnbo: 'Mölnbo station' };
const placeName = map => PLACE[map] ?? MAPS[map]?.name ?? map;

// ---------- bladen ----------
// Ordern för en dag. Text: day.order.text om banan har en (högst 12 ord), annars introts rad. Avsändaren:
// day.order.from, leveransens from (src/data/depot.js RELEASES) eller Försvarsmakten. Underraden är leveransens rad.
export function orderSheet(map, day) {
  const d = MAPS[map]?.days?.[day - 1] ?? {}, rel = releaseOf(map, day), o = isObj(d.order) ? d.order : null;
  const n = campaignDay(map, day);
  return {
    id: `order:${map}:${day}`, kind: 'order', map, day, n,
    from: sender(o?.from ?? rel?.from ?? 'FM'), to: ADDRESSEE[poolOf(map)] ?? 'Commander, Gnesta', valid: `Day ${n}`,
    title: titleOf(map, day), text: (o?.text ?? d.intro?.text ?? '').trim(), sig: rel?.text ?? '',
  };
}
// Lägesrapporten efter en vunnen dag. day.report = { from, text } (40 till 60 ord) när banan har en; annars en kort
// rapport ur dagens siffror (table.log), så att bordet aldrig ser tomt ut. En report från P4 Sörmland är radio och
// blir en remsa (radioStrips); rapportbladet skrivs då ur siffrorna.
export function reportSheet(p, map, day) {
  const d = MAPS[map]?.days?.[day - 1] ?? {}, n = campaignDay(map, day);
  const r = isObj(d.report) && typeof d.report.text === 'string' && d.report.from !== 'P4 Sörmland' ? d.report : null;
  const base = { id: `report:${map}:${day}`, kind: 'report', map, day, n };
  if (r) return { ...base, from: sender(r.from), lead: '', text: r.text.trim(), written: true };
  const s = synthReport(p, map, day);
  return { ...base, from: releaseOf(map, day)?.from === 'MCF' ? 'MCF, Gnesta' : 'Staff, Gnesta', lead: s.lead, text: s.text, written: false };
}
export function synthReport(p, map, day) {
  const e = tableOf(p).log[`${map}:${day}`];
  const lead = `${placeName(map)} held.`;
  if (!e) return { lead, text: `The line stood through day ${campaignDay(map, day)}.` };
  const parts = [];
  if (e.kills) parts.push(`${e.kills} infected down${e.waves ? ` in ${e.waves} waves` : ''}.`);
  parts.push(e.lost ? `We lost ${e.lost} ${e.lost === 1 ? 'man' : 'men'}.` : 'No losses.');
  if (e.saved != null) parts.push(`${e.saved}${e.total ? ` of ${e.total}` : ''} civilians brought in.`);
  return { lead, text: parts.join(' ') };
}
// Slutbladet på en klar sektor: första meningen ur banans outro (eller outro.summary), dagarna och stämpeln.
export function closedSheet(p, s) {
  const maps = s.maps.filter(m => MAPS[m]);
  const last = maps[maps.length - 1], first = maps[0];
  const o = MAPS[last]?.outro;
  const text = o?.summary ?? (o?.text ? o.text.split(/(?<=\.)\s/)[0] : `${s.name} holds.`);
  const a = campaignDay(first, 1), b = campaignDay(last, MAPS[last].days.length);
  return { id: `closed:${s.id}`, kind: 'closed', sector: s.id, name: s.full ?? s.name, text, days: [a, b], stamp: 'HELD' };
}

// ---------- uppdragshögarna ----------
// En hög per sektor som nåtts, bladen i tidsordning (sist = överst).
export function missionPiles(p) {
  const nb = nextBattle(p);
  const out = [];
  for (const s of SECTORS) {
    if (!s.maps) continue;
    const sheets = [];
    for (const m of s.maps) {
      if (!MAPS[m] || !mapUnlocked(p, m)) continue;
      const st = mapState(p, m), last = Math.min(st.unlockedDay, MAPS[m].days.length);
      for (let d = 1; d <= last; d++) {
        sheets.push(orderSheet(m, d));
        if (d < st.unlockedDay) sheets.push(reportSheet(p, m, d));
      }
    }
    if (!sheets.length) continue;
    const status = sectorStatus(p, s.id);
    const closed = status === 'held' || status === 'silent';
    if (closed) sheets.push(closedSheet(p, s));
    out.push({ id: 'pile:' + s.id, sector: s.id, sheets, closed, current: !closed && nb?.sector === s.id, status });
  }
  return out;
}

// ---------- fiendehögen ----------
const dayStageOf = i => (STAGES[i]?.map ? i : -1);
export function metTypes(p) {
  const fp = furthestPlayed(p);
  return Object.keys(ENEMIES)
    .filter(t => isSeen(p, 'enemy:' + t) || (fp >= 0 && stageIndex(ENEMIES[t].stage) >= 0 && stageIndex(ENEMIES[t].stage) <= fp))
    .sort((a, b) => stageIndex(ENEMIES[a].stage) - stageIndex(ENEMIES[b].stage));
}
const speedWord = s => (s < 1.2 ? 'slow' : s < 2.2 ? 'steady' : 'fast');
const toughWord = hp => (hp < 25 ? 'low' : hp < 60 ? 'medium' : hp < 200 ? 'high' : 'very high');
export function enemySheet(type, i, status) {
  const z = ZOMBIES[type] ?? {}, e = ENEMIES[type] ?? {};
  return {
    id: 'enemy:' + type, type, no: i + 1, status, name: (ENEMY_SHEET[type]?.tag ?? z.name ?? type).toUpperCase(),
    text: e.report ?? '', stats: [['SPEED', speedWord(z.speed ?? 1.5)], ['TOUGH', toughWord(z.hp ?? 30)], ['STOPS IT', ENEMY_SHEET[type]?.stops ?? 'any gun']],
  };
}
// { sheets (underst först), top } eller null före första mötet. Den senast mötta är NEW när den kom den senast spelade dagen.
// De rapporterade (grå) kommer ur underrättelserna och ligger bara på bordet när de är upplåsta (operationskartan).
export function enemyPile(p, nb = nextBattle(p), { reports = metaFeatures(p).has('opmap') } = {}) {
  const met = metTypes(p);
  if (!met.length) return null;
  let lastDay = -1;
  const fp = furthestPlayed(p);
  for (let i = 0; i <= fp; i++) if (dayStageOf(i) >= 0) lastDay = i;
  const newest = met[met.length - 1];
  const reported = [];
  const it = nb ? intelFor(MAPS[nb.map], nb.day) : null;
  if (reports) for (const t of it?.types ?? []) if (ENEMIES[t.type] && !met.includes(t.type)) reported.push(t.type);
  const sheets = [
    ...reported.map((t, k) => enemySheet(t, met.length + k, 'REPORTED')),
    ...met.map((t, k) => enemySheet(t, k, t === newest && stageIndex(ENEMIES[t].stage) === lastDay ? 'NEW' : 'SEEN')),
  ];
  return { sheets, top: 'enemy:' + newest };
}
// Lägg ett blad överst (klick på dess kant). Returnerar en ny ordning; okänt id ändrar inget.
export function bringToTop(sheets, id) {
  const s = sheets.find(x => x.id === id);
  return s ? [...sheets.filter(x => x !== s), s] : sheets;
}

// ---------- "What we face" (förrådets INTEL, src/meta/intel.js) ----------
const plural = n => (/ed$/.test(n) ? n : n + 's');
const listJoin = xs => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1] : xs[0] ?? '');
export function intelNote(p, nb = nextBattle(p)) {
  if (!nb) return null;
  const it = intelFor(MAPS[nb.map], nb.day);
  if (!it) return null;
  const parts = [];
  if (it.entries.length) parts.push(`From ${listJoin(it.entries.slice(0, 3).map(e => e.name))}.`);
  if (it.quality === 'unknown') parts.push('Numbers and types unknown.');
  else {
    const ts = [...it.types].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)).slice(0, 3);
    const n = t => (t.count != null ? `${t.count}` : t.range ? `${t.range[0]} to ${t.range[1]}` : '');
    parts.push(ts.map((t, i) => `${i ? plural(t.name).toLowerCase() : plural(t.name)} ${n(t)}`.trim()).join(', ') + '.');
    if (it.later) parts.push('Later waves unconfirmed.');
  }
  return { id: 'intel', head: 'WHAT WE FACE', text: parts.join(' '), waves: it.waves, quality: it.quality };
}

// ---------- radion ----------
const afterKey = ([m, d]) => campaignDay(m, d);
export function radioStrips(p) {
  const out = [];
  for (const c of CAMPAIGN) {
    const st = mapState(p, c.map), r = MAPS[c.map]?.days?.[c.day - 1]?.report;
    if (MAPS[c.map] && mapUnlocked(p, c.map) && st.unlockedDay > c.day && isObj(r) && r.from === 'P4 Sörmland' && typeof r.text === 'string')
      out.push({ id: `radio:${c.map}:${c.day}`, at: r.at ?? '', from: 'P4 Sörmland', text: r.text.trim(), k: campaignDay(c.map, c.day) });
  }
  for (const r of RADIO) {
    if (!MAPS[r.after[0]] || !stageReached(p, { after: r.after })) continue;
    if (out.some(x => x.k === afterKey(r.after))) continue;   // dagens egen radio går före
    out.push({ id: r.id, at: r.at ?? '', from: 'P4 Sörmland', text: r.text, k: afterKey(r.after) });
  }
  return out.sort((a, b) => a.k - b.k);
}

// ---------- truppkorten ----------
const TAG = { hv: 'HV', inf: 'INF', civ: 'VOL', m249: 'KSP 90', m2: 'KSP 88', ksp58: 'KSP 58', ak5: 'AK 5', psg90: 'PSG 90', epa: 'EPA' };
export function unitCard(p, u, nth = 0, many = false, fatigueOn = false) {
  const max = maxMen(u, p.research), f = u.fatigue ?? 0;
  return {
    uid: u.uid, type: u.type, level: u.level,
    tag: `${TAG[u.type] ?? u.type.toUpperCase()}${many ? ' · ' + nth : ''}`,
    name: `${unitName(u)}${many ? ' ' + nth : ''}`,
    role: ROLE[u.type] ?? WEAPONS[u.type]?.short ?? '',
    men: u.men ?? null, max, vet: !!vetOf(u), fresh: (u.wins ?? 0) === 0,
    fatigue: fatigueOn ? f : null, state: fatigueOn ? FATIGUE.names[f] : (u.men === 0 ? 'No men' : 'Ready'),
  };
}
// Korten i sektorn: förrådets banor (lanes) som de är, ett kort per enhet.
export function cardZones(p, sector) {
  const here = unitsIn(p, sector), L = lanes(p, sector), fatigueOn = metaFeatures(p).has('fatigue');
  const nth = new Map(), count = {};
  for (const u of [...here].sort((a, b) => a.uid - b.uid)) { count[u.type] = (count[u.type] ?? 0) + 1; nth.set(u.uid, count[u.type]); }
  const card = u => unitCard(p, u, nth.get(u.uid), count[u.type] > 1, fatigueOn);
  return { sector: poolOf(sector), cap: L.cap, battle: L.battle.map(card), rest: L.rest.map(card) };
}
// Byt plats på två kort i var sin bana: den i striden vilar, den i reserven går in. Samma regler som förrådets banor
// (setLane): nekas något står framsteget orört.
export function swapCards(p, uidA, uidB) {
  const a = unitOf(p, uidA), b = unitOf(p, uidB);
  if (!a || !b || a.sector == null || a.sector !== b.sector) return { ok: false, reason: 'unknown' };
  const L = lanes(p, a.sector), inBattle = id => L.battle.some(u => u.uid === id);
  if (inBattle(uidA) === inBattle(uidB)) return { ok: false, reason: 'same' };
  const [out, inn] = inBattle(uidA) ? [uidA, uidB] : [uidB, uidA];
  const r1 = setLane(p, out, 'rest');
  if (!r1.ok) return r1;
  const r2 = setLane(r1.progress, inn, 'battle');
  if (!r2.ok) return r2;
  return { ok: true, progress: r2.progress };
}

// ---------- bordet som helhet ----------
// Det som ligger på bordet (objektens id i ritordning) och var varje sak ligger från början.
export function tableState(p, { sector = null } = {}) {
  const meta = metaFeatures(p), nb = nextBattle(p, sector);
  const piles = missionPiles(p).map(pl => ({ ...pl, current: !pl.closed && nb?.sector === pl.sector }));
  const enemies = enemyPile(p, nb);
  const radio = radioStrips(p);
  const depot = meta.has('depot');
  const state = {
    next: nb, opmap: meta.has('opmap'), piles, enemies, radio,
    intel: enemies && meta.has('opmap') ? intelNote(p, nb) : null,
    zones: depot && nb ? cardZones(p, nb.sector) : null,
    clipboard: depot ? { rp: meta.has('rp') ? p.rp : null, next: nb } : null,
    briefing: piles.length === 1 && piles[0].sheets.length === 1,
  };
  state.objects = ['map', ...piles.map(x => x.id), ...(radio.length ? ['radio'] : []), ...(enemies ? ['enemies'] : []), ...(state.clipboard ? ['clipboard'] : []), ...(state.zones ? ['zones'] : [])];
  return state;
}
// Startläget för ett föremål: { x, y, r }.
export function defaultPlace(state, id) {
  if (id === 'map') return { x: 300, y: 30, r: -0.5 };
  if (id === 'radio') return { x: 22, y: 40, r: -2 };
  if (id === 'enemies') return { x: 1158, y: 28, r: 0 };   // spelmenyns knapp står i hörnet uppe till höger
  if (id === 'clipboard') return { x: 1212, y: 516, r: 1.2 };
  if (id.startsWith('pile:')) {
    const pl = state.piles.find(x => x.id === id), s = pl?.sector;
    const row = SECTOR_TABLE[s];
    if (row) { const [x, y] = pl.closed ? row.closed : row.current; return { x, y, r: 0 }; }
    const spare = state.piles.filter(x => !SECTOR_TABLE[x.sector]).findIndex(x => x.id === id);
    const [x, y] = SPARE_SLOTS[Math.max(0, spare) % SPARE_SLOTS.length];
    return { x, y, r: 0 };
  }
  return { x: 0, y: 0, r: 0 };
}
// Var föremålet ligger: spelarens läge om det finns, annars startläget.
export function placeOf(p, state, id) {
  const d = defaultPlace(state, id), s = tableOf(p).layout[id];
  return s ? { ...d, x: s.x, y: s.y, moved: true } : d;
}
