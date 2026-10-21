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
import { campaignDayOf, shownDay } from './campaign-day.js';
import { MAPS } from '../data/maps.js';
import { SECTORS, RELEASES, poolOf, releaseOf as releaseById } from '../data/depot.js';
import { ENEMIES } from '../data/lessons.js';
import { ZOMBIES } from '../data/zombies.js';
import { WEAPONS } from '../data/weapons.js';
import { SECTOR_TABLE, SPARE_SLOTS, RADIO, SENDERS, ADDRESSEE, ENEMY_SHEET, ROLE, TABLE_W, TABLE_H } from '../data/table.js';
import { mapState, mapUnlocked } from './progress.js';
import { STAGES, stageIndex, stageReached, furthestPlayed, metaFeatures } from './unlocks.js';
import { openSectors, currentMap, sectorStatus, lanes, setLane, unitsIn, maxMen, vetOf, unitName, unitOf, requisition, canRequisition, stockTypes, stockOf, upgradeList, levelUp } from './operation.js';
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
    for (const f of ['kills', 'waves', 'lost', 'saved', 'total', 'cleared']) if (num(v[f]) != null && v[f] >= 0) e[f] = Math.round(v[f]);
    if (v.by === 'civilians' || v.by === 'base') e.by = v.by;
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
// Tidy: allt tillbaka till sin plats. Kortens platser (slot:uid) står kvar: de är spelarens val, inte bordets ordning.
export function tidy(p) {
  const t = tableOf(p);
  return { ...p, table: { ...t, layout: Object.fromEntries(Object.entries(t.layout).filter(([k]) => k.startsWith('slot:'))) } };
}
// En vunnen dag: siffrorna som lägesrapporten skrivs av när dagen saknar egen text.
export function recordDay(p, { mapId, day, kills = 0, waves = 0, lost = 0, saved = null, total = null }) {
  const t = tableOf(p), e = { kills, waves, lost };
  if (saved != null) e.saved = saved;
  if (total != null) e.total = total;
  return { ...p, table: { ...t, log: { ...t.log, [`${mapId}:${day}`]: normalizeTable({ log: { x: e } }).log.x } } };
}

// 0.21.1 (speltestet, fynd 5): en förlorad dag får ett blad i högen. Siffrorna från det senaste försöket.
export function recordLoss(p, { mapId, day, kills = 0, cleared = 0, waves = 0, lostBy = null }) {
  const t = tableOf(p), e = normalizeTable({ log: { x: { kills, cleared, waves } } }).log.x;
  if (lostBy === 'civilians' || lostBy === 'base') e.by = lostBy;
  return { ...p, table: { ...t, log: { ...t.log, [`lost:${mapId}:${day}`]: e } } };
}

// ---------- kampanjens dagar ----------
// Kampanjens ordning är upplåsningsschemat (src/meta/unlocks.js STAGES).
// 0.21.1 (speltestet av 0.21.0, fynd 4: bordet sa dag 6 när introt, HUD:en och menyn sa dag 3): bordet visar banans egen
// dag, samma nummer som överallt. Kroken för kampanjbågens numrering: day.campaignDay går före när en bana har det.
export const CAMPAIGN = STAGES.filter(s => s.map).map(s => ({ map: s.map, day: s.day }));
// 0.21.3 (H539): kampanjens dag (src/meta/campaign-day.js), som HUD:en och introt; utanför kampanjen banans egen dag.
export const campaignDay = (mapId, day) => shownDay(mapId, day);
// Index i kampanjens ordning (för att sortera), -1 utanför schemat
export const campaignIndex = (mapId, day) => CAMPAIGN.findIndex(c => c.map === mapId && c.day === day);
// Dagen före i kampanjen (den senast vunna när (map, day) är nästa strid), eller null
export function dayBefore(mapId, day) {
  const i = campaignIndex(mapId, day);
  return i > 0 ? CAMPAIGN[i - 1] : null;
}
// Platsens namn på klämbrädan: fasen i Hagstumosse, annars sektorns korta namn (samma som menyn)
const PHASE = { gnesta: 'Ishallen', 'gnesta-norr': 'Vikingavägen' };
export const placeShort = map => PHASE[map] ?? SECTORS.find(s => s.maps?.includes(map))?.short ?? MAPS[map]?.name ?? map;
// Nästa strid: sektorn (den valda om den har en dag kvar), banan och dagen. null när inget återstår.
export function nextBattle(p, sector = null) {
  const open = openSectors(p).filter(id => currentMap(p, id));
  const want = sector != null ? poolOf(sector) : null;
  const id = want && open.includes(want) ? want : open.includes(poolOf(p.mapId)) ? poolOf(p.mapId) : open[0];
  if (!id) return null;
  const map = currentMap(p, id), day = mapState(p, map).unlockedDay;
  return { sector: id, map, day, n: campaignDay(map, day), title: titleOf(map, day), place: placeShort(map) };
}
const releaseOf = (map, day) => RELEASES.find(r => r.map === map && r.day === day) ?? null;
// "Day 3: Brutes" -> "Brutes"
export function titleOf(map, day) {
  const t = MAPS[map]?.days?.[day - 1]?.intro?.title ?? '';
  return t.includes(':') ? t.split(':').slice(1).join(':').trim() : t;
}
const sender = k => SENDERS[k] ?? k ?? 'Försvarsmakten';
// Platsens namn i rapporterna
const PLACE = { riksvagen: 'The roadblock', gnesta: 'The ice rink', 'gnesta-norr': 'Vikingavägen', molnbo: 'Mölnbo station', bjornlunda: 'Wattrangsborg' };
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
// Bladet för en förlorad dag (högst 12 ord i rubriken, utfallet under)
export function lostSheet(p, map, day) {
  const e = tableOf(p).log[`lost:${map}:${day}`], n = campaignDay(map, day);
  const out = [];
  if (e?.waves) out.push(`${e.cleared ?? 0} of ${e.waves} waves held.`);
  if (e?.kills) out.push(`${e.kills} infected down.`);
  out.push(e?.by === 'civilians' ? 'Too many civilians fell.' : 'The base fell.');
  return { id: `lost:${map}:${day}`, kind: 'lost', map, day, n, lead: `Day ${n} lost.`, text: 'Try again at dawn.', outcome: out.join(' '), stamp: 'LOST' };
}
// Slutbladet på en klar sektor: första meningen ur banans outro (eller outro.summary), dagarna och stämpeln.
export function closedSheet(p, s) {
  const maps = s.maps.filter(m => MAPS[m]);
  const last = maps[maps.length - 1], first = maps[0];
  const o = MAPS[last]?.outro;
  const text = o?.summary ?? (o?.text ? o.text.split(/(?<=\.)\s/)[0] : `${s.name} holds.`);
  const days = maps.reduce((a, m) => a + MAPS[m].days.length, 0);
  return { id: `closed:${s.id}`, kind: 'closed', sector: s.id, name: s.short ?? s.name, text, days, stamp: 'HELD' };
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
        // 0.23.1 (speltestet av 0.23.0: "Day 11 · Lost" låg kvar bredvid "held"): bara medan dagen inte är vunnen
        if (d >= st.unlockedDay && (st.losses?.[d] ?? 0) > 0 && tableOf(p).log[`lost:${m}:${d}`]) sheets.push(lostSheet(p, m, d));
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
// 0.21.1 (speltestet, fynd 7: samma remsa från dag 6 till 13): radion säger något bara natten efter en dag som har
// en sändning (dagen före nästa strid). Andra dagar ligger ingen remsa på bordet.
export function radioStrips(p, nb = nextBattle(p)) {
  const prev = nb ? dayBefore(nb.map, nb.day) : null;
  if (!prev || !stageReached(p, { after: [prev.map, prev.day] })) return [];
  const r = MAPS[prev.map]?.days?.[prev.day - 1]?.report;
  if (isObj(r) && r.from === 'P4 Sörmland' && typeof r.text === 'string')
    return [{ id: `radio:${prev.map}:${prev.day}`, at: r.at ?? '', from: 'P4 Sörmland', text: r.text.trim() }];
  const f = RADIO.find(x => x.after[0] === prev.map && x.after[1] === prev.day);
  return f ? [{ id: f.id, at: f.at ?? '', from: 'P4 Sörmland', text: f.text }] : [];
}

// ---------- truppkorten ----------
// 0.23.3 (H549): förstärkningen från ledningen (leveransen har reinforce) är NY tills dagen den kom till har spelats
// (vunnen eller förlorad). Svar: { by: 'Hemvärnet' } eller null.
export function reinforcementOf(p, u) {
  const r = u?.rel ? releaseById(u.rel) : null;
  if (!r?.reinforce) return null;
  const st = mapState(p, r.map);
  return st.unlockedDay <= r.day && !(st.attempts?.[r.day] > 0) ? { by: r.reinforce, release: r.id } : null;
}
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
    // 0.21.2: spelet flyttade enheten efter en vunnen dag (src/meta/operation.js finishDay)
    reinf: reinforcementOf(p, u),
    moved: u.moved === 'rest:exhausted' ? { long: 'Moved to reserve: exhausted', short: 'Moved: exhausted' } : u.moved === 'battle:rested' ? { long: 'Moved into battle: rested', short: 'Moved in: rested' } : null,
  };
}
// Korten i sektorn: förrådets banor (lanes) som de är, ett kort per enhet.
export function cardZones(p, sector) {
  const here = unitsIn(p, sector), L = lanes(p, sector), fatigueOn = metaFeatures(p).has('fatigue');
  const nth = new Map(), count = {};
  for (const u of [...here].sort((a, b) => a.uid - b.uid)) { count[u.type] = (count[u.type] ?? 0) + 1; nth.set(u.uid, count[u.type]); }
  const card = u => unitCard(p, u, nth.get(u.uid), count[u.type] > 1, fatigueOn);
  // 0.21.1 (speltestet, fynd 11: ordningen kastades om när ett kort flyttades): fast ordning, typ och nummer
  const TYPES = Object.keys(TAG), ord = (a, b) => (TYPES.indexOf(a.type) - TYPES.indexOf(b.type)) || a.uid - b.uid;
  return { sector: poolOf(sector), cap: L.cap, battle: [...L.battle].sort(ord).map(card), rest: [...L.rest].sort(ord).map(card) };
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

// ---------- kortens platser (0.21.4, Ola: korten ska vara fysiska kort med fasta platser, H536) ----------
// Into battle har exakt cap platser, Reserve en obegränsad rad platser (bordet visar dem på en bricka som rullar).
// Platsen sparas per enhet i table.layout['slot:uid'] = { x: platsens nummer, y: 0 striden | 1 reserven }. En enhet utan
// sparad plats (ny, eller flyttad av tröttheten) får första lediga platsen. En flytt rör bara kortet som flyttas och,
// vid ett byte, kortet på målplatsen; alla andra står kvar (pinSlots sparar allas platser före flytten).
const slotKey = uid => 'slot:' + uid;
export function cardSlots(p, sector) {
  const L = lanes(p, sector), lay = tableOf(p).layout;
  const cap = Number.isFinite(L.cap) ? L.cap : Math.max(1, L.battle.length);
  const ord = (a, b) => a.uid - b.uid;
  const out = { cap, battle: Array(cap).fill(null), rest: [] };
  const place = (zone, list) => {
    const arr = out[zone], pending = [];
    for (const u of [...list].sort(ord)) {
      const s = lay[slotKey(u.uid)], i = s && s.y === (zone === 'battle' ? 0 : 1) ? s.x : -1;
      if (i >= 0 && (zone === 'rest' || i < cap) && arr[i] == null) arr[i] = u.uid; else pending.push(u.uid);
    }
    for (const uid of pending) { let i = Array.from(arr, x => x ?? null).indexOf(null); if (i < 0) i = arr.length; arr[i] = uid; }
    out[zone] = Array.from(arr, x => x ?? null);
  };
  place('battle', L.battle);
  place('rest', L.rest);
  return out;
}
const setSlot = (p, uid, zone, i) => { const t = tableOf(p); return { ...p, table: { ...t, layout: { ...t.layout, [slotKey(uid)]: { x: i, y: zone === 'battle' ? 0 : 1 } } } }; };
// Allas nuvarande platser sparas, så att ingen flyttar när en annan gör det
export function pinSlots(p, sector) {
  const S = cardSlots(p, sector);
  let q = p;
  S.battle.forEach((uid, i) => { if (uid != null) q = setSlot(q, uid, 'battle', i); });
  S.rest.forEach((uid, i) => { if (uid != null) q = setSlot(q, uid, 'rest', i); });
  return q;
}
// Flytta ett kort till en plats. En upptagen plats byter de två korten (i samma fält bara platserna, mellan fälten också
// banorna, med förrådets regler). moved: korten som flyttade.
export function moveCardTo(p, uid, zone, idx) {
  const u = unitOf(p, uid);
  if (!u || u.sector == null || (zone !== 'battle' && zone !== 'rest') || !Number.isInteger(idx) || idx < 0) return { ok: false, reason: 'unknown' };
  let q = pinSlots(p, u.sector);
  const S = cardSlots(q, u.sector);
  if (zone === 'battle' && idx >= S.cap) return { ok: false, reason: 'unknown' };
  const from = S.battle.includes(uid) ? 'battle' : 'rest', fromIdx = S[from].indexOf(uid);
  const other = S[zone][idx] ?? null;
  if (other === uid) return { ok: true, same: true, progress: q, moved: [] };
  if (from !== zone) {
    const r = other != null ? swapCards(q, uid, other) : setLane(q, uid, zone);
    if (!r.ok) return r;
    q = r.progress;
  }
  q = setSlot(q, uid, zone, idx);
  if (other != null) q = setSlot(q, other, from, fromIdx);
  return { ok: true, progress: q, moved: other != null ? [uid, other] : [uid] };
}
// Ett klick gör samma sak som att dra: ett reservkort till första lediga platsen i striden, ett stridskort till första
// lediga platsen i reserven. Full strid: förrådets skäl (laneFull).
export function clickCard(p, uid) {
  const u = unitOf(p, uid);
  if (!u || u.sector == null) return { ok: false, reason: 'unknown' };
  const S = cardSlots(p, u.sector), inBattle = S.battle.includes(uid);
  if (inBattle) { const i = S.rest.indexOf(null); return moveCardTo(p, uid, 'rest', i < 0 ? S.rest.length : i); }
  const i = S.battle.indexOf(null);
  if (i < 0) return { ok: false, reason: 'laneFull' };
  return moveCardTo(p, uid, 'battle', i);
}

// ---------- Requisition som klämbräda (0.21.4, H537) ----------
// Klämbrädan har två saker: korten som ledningen släppt (ett kort per enhet i lagret, med pris) och förrådets
// uppgraderingar. Ett släppt kort dras till en plats i striden eller reserven (eller klickas: första lediga i reserven).
// Ingen annan enhet byter fält eller plats när ett kort köps.
export function releasedCards(p, sector) {
  if (!metaFeatures(p).has('requisition')) return [];
  const out = [];
  for (const type of stockTypes(p, sector)) {
    const n = stockOf(p, sector, type), c = canRequisition(p, type, sector);
    for (let i = 0; i < n; i++) out.push({ id: `${type}:${i}`, type, cost: c.cost ?? null, ok: c.ok, reason: c.reason ?? null, need: c.need ?? null,
      name: unitName({ type }), role: ROLE[type] ?? '', max: maxMen({ type, level: 1 }, p.research) });
  }
  return out;
}
// Lås allas fält (som förrådets setLane gör), så att ett nytt kort inte knuffar någon ur förslaget
function lockLanes(p, sector) {
  const L = lanes(p, sector), inB = new Set(L.battle.map(u => u.uid));
  return { ...p, op: { ...p.op, units: p.op.units.map(u => (u.sector === poolOf(sector) ? { ...u, lane: inB.has(u.uid) ? 'battle' : 'rest' } : u)) } };
}
export function buyCard(p, type, sector, zone = null, idx = null) {
  const c = canRequisition(p, type, sector);
  if (!c.ok) return c;
  let q = pinSlots(lockLanes(p, sector), sector);
  const r = requisition(q, type, sector);
  if (!r.ok) return r;
  q = { ...r.progress, op: { ...r.progress.op, units: r.progress.op.units.map(u => (u.uid === r.uid ? { ...u, lane: 'rest' } : u)) } };
  const S = cardSlots(q, sector);
  let z = zone, i = idx;
  if (z == null || i == null) { z = 'rest'; i = S.rest.indexOf(r.uid); }   // utan mål: första lediga platsen i reserven
  const m = moveCardTo(q, r.uid, z, i);
  if (m.ok) return { ok: true, uid: r.uid, cost: r.cost, progress: m.progress, moved: [...new Set([r.uid, ...(m.moved ?? [])])] };
  // platsen gick inte (full strid, tom grupp): kortet läggs på första lediga platsen i reserven
  return { ok: true, uid: r.uid, cost: r.cost, progress: q, moved: [r.uid], note: m.reason };
}
// Förrådet på andra arket: släppta uppgraderingar (köpbara eller för dyra) och köpta (bock). Effekten i en rad.
export function storeList(p) {
  if (!metaFeatures(p).has('upgrades')) return [];
  return upgradeList(p).filter(Boolean).filter(st => st.reason !== 'locked').map(st => {
    const bought = st.tier == null, tier = bought ? (st.have ?? st.node.tiers.length) : st.tier;
    const t = st.node.tiers[tier - 1] ?? {};
    return { id: st.id, name: st.id === 'budget' ? 'Supply budget' : st.node.name, tier, cost: st.cost, ok: !!st.ok, bought, need: st.need ?? null,
      effect: st.id === 'budget' ? 'More supplies every day.' : (t.effect ?? '') };
  });
}

// 0.22.1 (speltestet av 0.22.0, fynd 5: dag 6 spelades med 1 043 RP osparade): RP som räcker till det billigaste
// spelaren kan köpa mellan dagarna i sektorn (förrådets uppgraderingar och en nivå på en egen enhet). null = inget att
// påminna om (förrådet inte öppet, eller RP räcker inte till något).
export function spendNudge(p, sector) {
  if (!metaFeatures(p).has('levels')) return null;
  const costs = storeList(p).filter(u => u.ok).map(u => u.cost);
  for (const u of unitsIn(p, sector)) if (levelUp(p, u.uid).ok) costs.push(p.rp - levelUp(p, u.uid).progress.rp);
  if (!costs.length) return null;
  const cheapest = Math.min(...costs);
  return p.rp >= cheapest ? { rp: p.rp, cheapest } : null;
}

// ---------- bordet som helhet ----------
// Det som ligger på bordet (objektens id i ritordning) och var varje sak ligger från början.
export function tableState(p, { sector = null } = {}) {
  const meta = metaFeatures(p), nb = nextBattle(p, sector);
  const piles = missionPiles(p).map(pl => ({ ...pl, current: !pl.closed && nb?.sector === pl.sector }));
  const enemies = enemyPile(p, nb);
  const radio = radioStrips(p, nb);
  const depot = meta.has('depot');
  const state = {
    next: nb, opmap: meta.has('opmap'), piles, enemies, radio,
    intel: enemies && meta.has('opmap') ? intelNote(p, nb) : null,
    zones: depot && nb ? cardZones(p, nb.sector) : null,
    clipboard: depot ? { rp: meta.has('rp') ? p.rp : null, next: nb } : null,
    briefing: piles.length === 1 && piles[0].sheets.length === 1,
    // 0.21.3 (Ola: "rörigt vad som är aktuellt och gammalt", H530): klara sektorers högar flyttar till en arkivhög i
    // hörnet, med slutbladet (HELD) överst; den breds ut bara vid klick
    archive: piles.some(x => x.closed) ? { id: 'archive', sheets: piles.filter(x => x.closed).flatMap(x => x.sheets), tops: piles.filter(x => x.closed).map(x => x.sheets.at(-1)) } : null,
  };
  state.objects = ['map', ...piles.filter(x => !x.closed).map(x => x.id), ...(state.archive ? ['archive'] : []), ...(radio.length ? ['radio'] : []), ...(enemies ? ['enemies'] : []), ...(state.clipboard ? ['clipboard'] : []), ...(state.zones ? ['zones'] : [])];
  return state;
}
// 0.21.1 (speltestet, fynd 2 och 8: Deploy klipptes i 1024x614 och 1920x1080, text på 6 till 7 px): bordets yta följer
// fönstret. Skalan är minst MIN_SCALE (texten minst 11 px); är fönstret mindre än 1440 x 900 i den skalan blir bordet
// mindre, och kartbladet krymper för att ge plats åt korten. Klämbrädan och fiendehögen står mot högerkanten,
// korten och klämbrädan mot nederkanten.
export const MIN_SCALE = 0.8;
export function frameFor(vw = TABLE_W, vh = TABLE_H) {
  const scale = Math.max(MIN_SCALE, Math.min(vw / TABLE_W, vh / TABLE_H));
  const W = Math.max(960, vw / scale), H = Math.max(600, vh / scale);
  // 0.21.7 (H544): inga kortfält längre. Personalrullan står på klämbrädan till vänster om fiendehögen och förrådets
  // blad; den är smalare i smala fönster (typkolumnen faller bort) så att den inte går in i nästa strids hög.
  const zoneY = H, mapS = Math.max(0.55, Math.min(1, (zoneY - 46) / 600, (W - 560) / 880));
  const enemyX = W - 300, rosterW = Math.round(Math.max(380, Math.min(540, enemyX - 14 - 590))), rosterH = 640;
  const clipX = enemyX - 14 - rosterW, clipY = Math.max(24, H - rosterH - 16);
  const storesY = 440, storesH = Math.max(220, H - storesY - 24);
  return { scale, W, H, zoneY, mapS, mapX: 300, mapY: 30, clipX, clipY, enemyX, rosterW, rosterH, storesX: enemyX + 12, storesY, storesW: 270, storesH };
}
const F0 = frameFor();
// Startläget för ett föremål: { x, y, r }.
export function defaultPlace(state, id, fr = F0) {
  const onMap = ([x, y]) => [Math.round(fr.mapX + (x - 300) * fr.mapS), Math.round(fr.mapY + (y - 30) * fr.mapS)];
  if (id === 'map') return { x: fr.mapX, y: fr.mapY, r: -0.5 };
  if (id === 'radio') return { x: 22, y: 40, r: -2 };
  if (id === 'archive') return { x: 20, y: Math.round(Math.min(330, fr.zoneY - 190)), r: 0 };
  if (id === 'enemies') return { x: Math.round(fr.enemyX), y: 28, r: 0 };   // spelmenyns knapp står i hörnet uppe till höger
  if (id === 'clipboard') return { x: Math.round(fr.clipX), y: Math.round(fr.clipY), r: 0.6 };
  if (id.startsWith('pile:')) {
    const pl = state.piles.find(x => x.id === id), s = pl?.sector;
    const row = SECTOR_TABLE[s];
    let xy;
    if (row) xy = pl.closed ? onMap(row.closed) : row.current;
    else { const spare = state.piles.filter(x => !SECTOR_TABLE[x.sector]).findIndex(x => x.id === id); xy = onMap(SPARE_SLOTS[Math.max(0, spare) % SPARE_SLOTS.length]); }
    // nästa strids hög: så högt att den inte når ned i korten (högen är ca 390 hög med två blad), och inte in i klämbrädan
    let [x, y] = xy;
    if (pl.current) {
      const right = state.clipboard ? fr.clipX - 340 : fr.W - 350, bottom = fr.H - 420;
      if (x > fr.W / 2) x = Math.min(x, Math.round(right));
      y = Math.max(36, Math.min(y, Math.round(bottom)));
      // under fiendehögen: kanterna (72 över högen) får inte gå in i den; ryms den inte under flyttas högen åt vänster
      const eb = state.enemies ? 28 + (state.enemies.sheets.length - 1) * 30 + 2 + 196 + 8 : 0;
      if (state.enemies && x + 330 > fr.enemyX && y - 72 < eb) x = Math.round(fr.enemyX - 340);
    }
    return { x, y, r: 0 };
  }
  return { x: 0, y: 0, r: 0 };
}
// Var föremålet ligger: spelarens läge om det finns, annars startläget.
export function placeOf(p, state, id, fr = F0) {
  const d = defaultPlace(state, id, fr), s = tableOf(p).layout[id];
  return s ? { ...d, x: Math.min(s.x, Math.round(fr.W - 80)), y: Math.min(s.y, Math.round(fr.H - 60)), moved: true } : d;
}
