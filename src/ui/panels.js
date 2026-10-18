// Paneler för en utställd pjäs och en ruta på vägen (hinder), och vapenkorten som startar
// placeringen.
// Panelen byggs om när det som står på platsen ändras, och uppdaterar priser och
// gråa knappar varje bildruta. actions kommer från main.js och returnerar simuleringens svar.
import { WEAPONS, GRENADE_KIT, SUPPLIES } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { weaponStats, upgradeCost, MAX_LEVEL, weaponRefund, lineRefund, grenadeStats, tierOf } from '../sim/stats.js';
import { researchNode } from '../data/research.js';
import { ICONS } from './icons.js';
import { SHOP, BUY_MENU, shopItem, hotkeyOf, dayMenu, usesChords } from '../data/shop.js';
import { inArsenal } from '../sim/stats.js';
import { buyState, inBar } from '../sim/buy.js';
import { COVER, SQUAD, squadSize } from '../sim/squad.js';
import { money } from './format.js';
import { waveLabel } from './hud.js';
import { movePhase, gunCount, canMoveType, frontage, allowed, gunStats, TARGET_NAME, HOLD, RECREW } from '../sim/sim.js';
import { SANITY, FATIGUE, hasSanity, sanityState } from '../sim/sanity.js';

const REASONS = {
  'pengar': 'Not enough cash.',
  // placeringen (korta, de står vid pekaren)
  'gata': 'On the road',
  'hus': 'Inside a house',
  'kant': 'No vantage point: flat roof, ridge by a chimney, or a tall building',
  // 0.12.1: taket under pekaren har ingen utsiktspunkt (spöket stannar på taket och säger varför)
  'brant': 'Roof too steep. Try a flat roof or the ridge by a chimney',
  'brant-skorsten': 'Roof too steep, try the ridge by the chimney',
  'nära': 'Too close to another gun',
  // 0.16.0 (textgenomgången): forskningen finns inte längre
  // 0.16.4 (Olas: taket ska vara en synlig regel): samma ord som förrådet och räknaren
  'fullt': 'Sector full: every place to fight is taken.',
  'fulltHv': 'Sector full: every place to fight is taken.',
  'skog': 'In the forest',
  'vatten': 'In the water',
  'hinder': 'Something in the way',
  'bas': 'On the base',
  // 0.17.1: Mölnbos broar (enheten skulle stå under däcket och inte synas)
  'bro': 'Under the bridge',
  'utanför': 'Outside the map',
  'ej upplåst': 'Not released yet.',
  'fel läge': 'The day is over.',
  'max': 'Already at max level.',
  'tom': 'No gun here.',
  'upptagen': 'Tile already taken.',
  'okänd': 'Can\'t do that.',
  'redan': 'This position already has a kit.',
  'zombier': 'Zombies in the way',
  'ingen gata': 'Only on the road',
  // Hemvärnet (0.9.0)
  'trångt': 'No room for the squad here',
  'trångt-man': 'No room for one more rifleman here',
  'hela': 'Nobody is down.',
  // Flytta (0.12.0)
  'flyttar': 'Already on the move',
  'samma': 'Already here',
  // 0.13.0
  'ej här': 'Not available in this sector today',
  'fast': "Mounted, can't move",
  'bygger': 'Still being welded',
  'ingen väg': 'No way there on foot',
  'flexibel': 'Turns by itself, no arc to rotate',
  // 0.14.0 (Operation Södermanland)
  'reserv': 'None of those left in reserve',
  // 0.16.2: kortet för en typ där alla är utställda, och ett klick med något i handen på gränssnittet
  'ute': 'All of these are on the map',
  'gränssnitt': 'Not on the map',
  'i handen': 'Already in hand. Esc puts it back',
  'uppställd': 'Units deploy before the first wave',
  'front': 'Sector full: every place to fight is taken.',
  // 0.16.0 (inlärningen)
  'markerad': 'Only on the marked spots.',
  'markerad-hinder': 'Only on the marked spots.',
  'låst': 'Not yet.',
  'depå': 'Between days, at the depot',
  // 0.18.0 (skiva 1): hus, ordrar och tysta pjäser
  'hus upptaget': 'Someone already holds that house',
  'hus litet': 'Too small for the whole squad',
  'hus vilande': 'Infected inside',
  'hus evak': 'Civilians are leaving that house',
  'hus flytt': 'Into a house before the wave, or from reserve',
  'viker': 'Already falling back',
  'tyst': 'The gun is silent',
  'nedkylning': 'Not yet. The men need a moment',
  'bemannad': 'The gun is manned',
  'bemannas': 'A crew is on the way',
};
export function reasonText(r) {
  return REASONS[r] || REASONS['okänd'];
}

// 0.17.2 (H306): eldtakten står med, och med ammolådan syns den högre takten (gunStats)
const rateText = r => (r >= 2 ? String(Math.round(r)) : r.toFixed(1));
function statLine(st, boosted = false) {
  return `<div class="st"><span>Damage <b>${Math.round(st.damage)}</b></span><span>Range <b>${Math.round(st.range)} m</b></span><span>Rate <b${boosted ? ' class="up"' : ''}>${rateText(st.rate)}/s</b></span></div>`;
}
// 0.17.2 (H306, Olas speltest: "sandsäckarna och ammolådan verkar inte göra något"): det köpta står som en rad med
// effekten, så länge dagen varar
const AMMO_PCT = () => Math.round((SUPPLIES.ammo.rate - 1) * 100), BAGS_PCT = () => Math.round((1 - SUPPLIES.sandbags.take) * 100);
function suppliedRows(w) {
  return (w.ammo ? `<p class="info sup">${SUPPLIES.ammo.name}: fires ${AMMO_PCT()} % faster today</p>` : '')
    + (w.sandbags ? `<p class="info sup">${SUPPLIES.sandbags.name}: ${BAGS_PCT()} % less damage to the men today</p>` : '');
}

// Gemensamt skal: plåt, rubrik, innehåll, meddelanderad.
function shell(root, actions) {
  const el = document.createElement('div');
  el.className = 'panel plate';
  el.innerHTML = `<button type="button" class="x" aria-label="Close">×</button><div class="head"></div><div class="body"></div><div class="msg"></div>`;
  root.appendChild(el);
  const head = el.querySelector('.head'), body = el.querySelector('.body'), msg = el.querySelector('.msg');
  el.querySelector('.x').addEventListener('click', () => actions.close());
  // Knapparna ska inte ta fokus: då skulle mellanslag trycka på dem i stället för att starta vågen.
  el.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  let msgTimer = 0;
  function say(text, good = false) {
    msg.textContent = text;
    msg.className = 'msg show' + (good ? ' good' : '');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msg.className = 'msg'; }, 2600);
  }
  function hush() { clearTimeout(msgTimer); msg.className = 'msg'; }
  function close() { hush(); actions.range(null); el.remove(); }
  return { el, head, body, say, hush, close };
}


// Köpraden nere till vänster: ett kort per sak som går att köpa (SHOP), i snabbvalens ordning.
// Välj först vad du köper (klick eller siffertangent), ställ sedan ut det på kartan.
// Kortet visar snabbval, ikon, namn och pris. För dyrt: gråat, priset i rött och "Need $ X more".
// Låst: ett lås och "Research: <nod>". Fullt: "All positions taken". Läget räknas varje bildruta
// men kortet skrivs bara om när läget eller beloppet ändras (raden byggs om bara när forskningen
// ändras). pick(id) från main.js; shake(id) skakar ett kort som inte går att ta upp.
const LOCK = '<svg class="lock" viewBox="0 0 16 16"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="7" width="10" height="7.5" rx="1" fill="currentColor"/></svg>';
const itemName = (it) => (it.kind === 'gun' ? WEAPONS[it.id].name : OBSTACLES[it.id].name);
// Kortets namn: kort form där den finns (Ak 5 + Grt), hela namnet i tipset och panelen.
const itemShort = (it) => { const d = it.kind === 'gun' ? WEAPONS[it.id] : OBSTACLES[it.id]; return d.short ?? d.name; };
// Kortets rader (0.10.1): "Ksp 58 · General MG · 7.62" och statistiken (med forskningen).
// 0.10.2 (speltestet: "jag vet inte om 4 är mycket"): samma form för varje vapen så att korten går
// att jämföra, "DMG 10 · RNG 19 m · RATE 7/s". Hemvärnet: skada per soldat gånger antalet.
const num = x => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));
export function cardStats(type, research = []) {
  const st = weaponStats(type, 1, research), w = WEAPONS[type];
  return `DMG ${Math.round(st.damage)}${w.squad ? ' ×' + squadSize(1, research, type) : ''} · RNG ${Math.round(st.range)} m · RATE ${num(st.rate)}/s`;
}
export function cardLines(it, research = []) {
  const head = `${itemShort(it)} · ${it.role}`;
  if (it.kind === 'gun') return [head, cardStats(it.id, research)];
  const o = OBSTACLES[it.id];
  return [head, o.kind === 'block' ? 'Takes blows, then breaks' : `Slows by ${Math.round((1 - o.slow) * 100)} %, wears out`];
}
// H096 (0.11.0, speltestet av 0.10.2: statistiken syntes bara vid hovring): en kort rad som alltid
// står på kortet, "26·22m·4/s" (skada, räckvidd, eld per sekund). Hela raden vid hovring.
export function cardCompact(it, research = []) {
  if (it.kind !== 'gun') { const o = OBSTACLES[it.id]; return `<span>${o.kind === 'block' ? 'Holds' : `Slow ${Math.round((1 - o.slow) * 100)}%`}</span>`; }
  // 0.17.2 (H304: korten ska gå att läsa och stämma med panelen): raden klipptes ("6×4·12m·…", ".6/s"); nu två rader,
  // skada och räckvidd, sedan takten, med samma tal som hela raden (num)
  const st = weaponStats(it.id, 1, research), w = WEAPONS[it.id];
  return `<span>${Math.round(st.damage)}${w.squad ? '×' + squadSize(1, research, it.id) : ''} · ${Math.round(st.range)}m</span><span>${num(st.rate)}/s</span>`;
}
const itemDesc = (it, sim) => {
  if (it.kind === 'gun') { const w = WEAPONS[it.id], st = weaponStats(it.id, 1, sim.research); return `${w.short ? w.name + '. ' : ''}${w.desc} Damage ${Math.round(st.damage)}, range ${Math.round(st.range)} m.`; }
  const o = OBSTACLES[it.id];
  return (o.short ? o.name + '. ' : '') + o.desc + (sim.route.kind === 'grid' ? ' Spans the whole street.' : '');
};
export function buildBar(root, actions) {
  const el = document.createElement('div');
  el.id = 'buildbar';
  el.className = 'plate';
  el.hidden = true;
  root.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  let key = null, barR = -1, barH = -1;
  const cards = new Map();      // id -> { btn, price, why, state }
  // Köpradens högerkant till CSS (--bar-r): vågens knapp och rad ställer sig till höger om den.
  function measure() {
    if (el.hidden) return;
    // 0.17.1: korten kan gå utanför radens ruta i ett smalt fönster; högerkanten är det som står längst till höger
    const b = el.getBoundingClientRect();
    let right = b.right;
    for (const c of el.querySelectorAll('.card')) right = Math.max(right, c.getBoundingClientRect().right + 7);
    const r = Math.round(right);
    if (r !== barR) { barR = r; document.documentElement.style.setProperty('--bar-r', r + 'px'); }
    // 0.17.1: och höjden (--bar-h), så att knappen och fartknappen kan ställa sig ovanför raden när de inte ryms bredvid
    const h = Math.round(innerHeight - b.top);
    if (h !== barH) { barH = h; document.documentElement.style.setProperty('--bar-h', h + 'px'); }
  }
  addEventListener('resize', () => { barR = -1; measure(); });
  function render(sim) {
    // 0.10.1: en smal rad med små kort (namn och pris); pekaren över ett kort fäller ut det uppåt
    // med vad saken gör, skada och räckvidd, och varför det inte går (speltestet: raden tog en
    // fjärdedel av kartan).
    // 0.11.0: korten i kategorier (BUY_MENU) med små rubriker, snabbvalet "2-1" på varje kort.
    // 0.13.0: bara det sektorn har i förrådet i dag, snabbvalen räknade på det
    // 0.14.0: med kärntrupperna är Units reserven att ställa ut (bara i uppställningen), Defenses förnödenheterna
    const menu = dayMenu(id => inBar(sim, id));
    const deploy = sim.core && menu.some(c => c.id === 'units');
    // 0.16.0 (Olas beslut 3): en rad kort med en siffra var; kategorierna och tvåstegsvalet bara med fler än 9
    // kort. Frontbreddens räknare kommer med frontbredden (North dag 3).
    // 0.16.4 (Olas: "oklart hur många man kan ställa ut"): räknaren "DEPLOYED 5 / 8" syns i varje uppställning
    const chords = usesChords(menu), counter = !sim.core || deploy || allowed(sim, 'frontage');
    el.classList.toggle('deploy', deploy);
    el.classList.toggle('flat', !chords);
    // 0.16.1 (speltestet av 0.16.0: rubriken bytte mellan DEPLOY och SUPPLIES när enheterna tog slut, och Supplies
    // är också pengarnas namn): en rubrik per skede, DEPLOY före första vågen, DEFENCES under dagen (utom när
    // raden bara har enheter som kommit fram, E4 dag 1)
    // 0.18.0 (speltestet av 0.17.2: "samma ruta, olika ord"): en rubrik hela dagen. Enheter går att ställa ut mitt i
    // dagen också (de som kommer fram och de som samlats efter ett vik), så DEPLOY och UNITS står kvar.
    const head = !sim.core ? 'BUY' : 'DEPLOY';
    el.innerHTML = `<div class="k">${head}${counter ? ` <span class="guns">${sim.core ? 'UNITS' : 'GUNS'} <b data-n></b></span>` : ''}</div><div class="groups">${menu.map((c, ci) => `
      <div class="grp" data-cat="${ci + 1}">${chords ? `<div class="gh"><kbd>${ci + 1}</kbd>${c.name}</div>` : ''}<div class="cards">${c.items.map(x => {
      const it = shopItem(x.id), [role, stats] = cardLines(it, sim.research);
      return `
      <button type="button" class="card buy" data-id="${it.id}" aria-label="${itemDesc(it, sim)}">
        <kbd>${hotkeyOf(it.id)}</kbd>${ICONS[it.id] || ''}<div class="n${itemShort(it).length > 8 ? ' long' : ''}">${itemShort(it)}</div>
        <div class="p" data-price></div><div class="cs">${cardCompact(it, sim.research)}</div>
        <div class="more"><div class="r">${role}</div><div class="st">${stats}</div><div class="why" data-why></div></div></button>`;
    }).join('')}</div></div>`).join('')}</div>`;
    cards.clear();
    for (const b of el.querySelectorAll('.card')) {
      cards.set(b.dataset.id, { btn: b, price: b.querySelector('[data-price]'), why: b.querySelector('[data-why]'), state: null });
      b.addEventListener('click', () => actions.pick(b.dataset.id));
    }
  }
  const set = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  // openCat: kategorin som tvåstegsvalet har öppnat (1-baserad) eller null; armed: andra tangenten väntas.
  let catKey = '';
  function update(sim, holding, show, openCat = null, armed = false) {
    el.hidden = !show;
    if (!show) return;
    const k = [...sim.research].join(',') + '|' + sim.map.id + '|' + sim.day + '|' + (sim.core ? sim.wavesStarted > 0 : '') + '|' + dayMenu(id => inBar(sim, id)).flatMap(c => c.items.map(i => i.id)).join(',');
    if (k !== key || barR < 0) { key = k; render(sim); catKey = ''; measure(); }
    // 0.16.0: en tom köprad (E4 dag 1 efter uppställningen) syns inte
    if (!cards.size) { el.hidden = true; return; }
    const ck = openCat + ':' + armed;
    if (ck !== catKey) {
      catKey = ck;
      el.classList.toggle('choosing', openCat != null);
      for (const gEl of el.querySelectorAll('.grp')) { gEl.classList.toggle('open', Number(gEl.dataset.cat) === openCat); gEl.classList.toggle('armed', !!armed && Number(gEl.dataset.cat) === openCat); }
    }
    const nEl = el.querySelector('[data-n]');
    if (nEl) set(nEl, sim.core ? `${sim.guns.length} / ${Number.isFinite(frontage(sim)) ? frontage(sim) : '-'}` : `${gunCount(sim)} / ${sim.maxGuns}`);
    for (const [id, c] of cards) {
      const st = buyState(sim, id);
      const sk = st.state + ':' + st.need + ':' + (holding === id) + ':' + (st.count ?? '');
      if (c.state === sk) continue;
      c.state = sk;
      const b = c.btn;
      b.classList.toggle('on', holding === id);
      b.classList.toggle('poor', st.state === 'poor');
      b.classList.toggle('locked', st.state === 'locked');
      b.classList.toggle('full', st.state === 'full');
      b.classList.toggle('out', st.state === 'out');
      b.classList.toggle('off', st.state !== 'ok');
      if (st.state === 'locked') {
        c.price.innerHTML = LOCK + ' Locked';
        set(c.why, 'Research: ' + (researchNode(st.research)?.name ?? itemName(shopItem(id))));
      } else {
        // för dyrt: beloppet som fattas syns på det lilla kortet också
        // 0.14.0: en kärntrupp kostar inget; kortet säger hur många som väntar i reserven
        const unit = st.count != null;
        // 0.16.2: alla utställda: kortet står kvar grått med samma siffra
        set(c.price, st.state === 'poor' ? `Need ${money(st.need)}` : st.state === 'full' ? 'Full' : st.state === 'out' ? 'All out' : unit ? `×${st.count} ready` : money(st.cost));
        set(c.why, st.state === 'poor' ? `Need ${money(st.need)} more` : st.state === 'full' ? REASONS.front : st.state === 'out' ? REASONS.ute : unit ? 'Your unit. Place it on the map.' : '');
      }
    }
  }
  function shake(id) {
    const c = cards.get(id);
    if (!c) return;
    c.btn.classList.remove('shake'); void c.btn.offsetWidth; c.btn.classList.add('shake');
  }
  return { el, update, shake };
}

// 0.12.2 (speltestet: "Upgrade $ 450 grå fast kassan är $ 1 264"): knappens läge i en ren funktion.
// Felet var classList.toggle('off', a || b || (g.squad && noRoom)): för en pjäs som inte är Hemvärnet
// blev sista ledet undefined, och toggle utan sant/falskt växlar klassen varje bildruta (knappen
// blinkade grå/vit och såg grå ut). Nu är ok alltid true/false, och när knappen inte går står skälet
// på den: "Max level", "Need $ X more", "No room", "Moving" eller "Day over".
export function upgradeState(s, g, { noRoom = false } = {}) {
  const w = g.weapon, cost = upgradeCost(w.type, w.level);
  if (cost == null) return { ok: false, max: true, cost: null, text: 'Max level', why: REASONS.max };
  const base = { max: false, cost };
  if (s.phase !== 'build' && s.phase !== 'wave') return { ...base, ok: false, text: 'Day over', why: REASONS['fel läge'] };
  if (s.cash < cost) { const need = Math.ceil(cost - s.cash); return { ...base, ok: false, text: `Need ${money(need)} more`, why: `Costs ${money(cost)}. ${REASONS.pengar}` }; }
  if (g.squad && noRoom) return { ...base, ok: false, text: 'No room', why: REASONS['trångt-man'] };
  return { ...base, ok: true, text: money(cost), why: '' };
}

// 0.17.2: Reposition i uppställningen (före vågen och mellan vågorna): lyft enheten och ställ den någon annanstans
const REPOS_BTN = '<button type="button" class="act" data-a="repos" title="Pick it up and set it down somewhere else. Free and instant until the wave comes. Or drag the unit."><span class="a">Reposition</span><span class="p">Free</span><kbd>M</kbd></button>';
// 0.18.0 (skiva 1): enhetens order och läge. Ordrarna kommer när de är upplåsta (allow).
function ordersHtml(s, g) {
  const can = f => allowed(s, f), w = g.weapon, def = WEAPONS[w.type];
  if (g.retreat) return '';
  const b = [];
  if (g.silent) b.push(`<button type="button" class="act" data-a="recrew" title="A new crew for supplies. A squad close by does it for free, slower."><span class="a">Recrew</span><span class="p" data-p></span><kbd>N</kbd></button>`);
  else {
    if (can('holdFire')) b.push(`<button type="button" class="act" data-a="hold" title="No fire until released or they come close. The first volley hits twice as hard."><span class="a">${g.hold ? 'Open fire' : 'Hold fire'}</span><span class="p" data-holdp></span><kbd>H</kbd></button>`);
    if (can('target')) b.push(`<button type="button" class="act" data-a="target" title="Who it shoots first: First in line, Nearest, Strongest, Weakest."><span class="a">Target</span><span class="p">${TARGET_NAME[g.tgt ?? 'first']}</span><kbd>T</kbd></button>`);
    if (can('rout') && w.uid != null && (g.squad || (def.move && !def.mounted && !def.vehicle))) b.push(`<button type="button" class="act" data-a="fallback" title="Withdraw in order to the base. Back in reserve with their nerve intact."><span class="a">Fall back</span><span class="p">To reserve</span><kbd>G</kbd></button>`);
  }
  return b.length ? `<div class="acts orders">${b.join('')}</div>` : '';
}
function wireOrders(ui, actions, gunId) {
  const say = r => { if (!r.ok) ui.say(reasonText(r.reason)); };
  ui.body.querySelector('[data-a="hold"]')?.addEventListener('click', () => say(actions.hold(gunId)));
  ui.body.querySelector('[data-a="target"]')?.addEventListener('click', () => say(actions.target(gunId)));
  ui.body.querySelector('[data-a="fallback"]')?.addEventListener('click', () => say(actions.fallBack(gunId)));
  ui.body.querySelector('[data-a="recrew"]')?.addEventListener('click', () => say(actions.recrew(gunId)));
}
// Läget i en rad: sanity, trötthet, hus, tyst, på väg bakåt.
export function unitStateText(s, g) {
  if (g.retreat) return g.retreat.kind === 'rout' ? 'Broken. Running for the base.' : 'Falling back to the base.';
  if (g.silent) return g.recrew ? `Manning the gun · ${Math.ceil(g.recrew.t)} s` : g.silent === 'routed' ? 'Silent: the crew ran.' : 'Silent: the crew is down.';
  const parts = [];
  if (allowed(s, 'sanity') && hasSanity(g) && g.sanity != null) parts.push(`Sanity ${Math.round(g.sanity)} · ${sanityState(g.sanity)}`);
  if (allowed(s, 'fatigue') && g.weapon.fatigue) parts.push(FATIGUE.names[g.weapon.fatigue]);
  if (g.house) parts.push(g.house.broken ? 'In a house · door broken' : `In a house · door ${Math.max(0, Math.round(g.house.door / g.house.max * 100))} %`);
  if (g.hold) parts.push('Holding fire');
  else if (g.ambushUntil > s.time) parts.push('Ambush');
  return parts.join(' · ');
}
// Panelen för en utställd pjäs: uppgradera, granatlåda, sälj. Sikten visas av main.js.
export function gunPanel(root, gunId, sim, actions) {
  const ui = shell(root, actions);
  // 0.17.2 (H305): fast bredd, texten radbryts (förut växte panelen när granatlådan köptes)
  ui.el.classList.add('unit');
  let key = null, cur = sim, noRoom = false;
  const gunOf = s => s.guns.find(x => x.id === gunId);
  // 0.18.0: orderna (håll eld, mål-läget, fall back, recrew) och läget (tyst, på väg bakåt, i hus) byter knapparna
  const keyOf = (s, g) => `o:${!!g.hold}:${g.tgt ?? ''}:${g.silent ?? ''}:${!!g.recrew}:${g.retreat?.kind ?? ''}:${g.house ? 'h' : ''}:` + (actions.canReposition?.() ? 'rp:' : '') + `w:${g.weapon.type}:${g.weapon.level}:${!!g.weapon.kit}:${!!g.weapon.ammo}:${!!g.weapon.sandbags}:${tierOf(s.research, 'grenade')}` + (g.squad ? ':' + g.soldiers.map(m => (m.down ? 'd' : 'u')).join('') : '') + (g.move ? ':mv' + movePhase(g) + Math.ceil(g.move.total - g.move.t) : '') + (g.building > 0 ? ':b' + Math.ceil(g.building) : '') + (g.turn ? ':turn' : '') + (g.idleOutside ? ':out' : '');
  const showRange = (g, r) => actions.range({ x: g.x, z: g.z, r, id: g.id });

  function render(s, g) {
    if (g.squad) { renderSquad(s, g); return; }
    const w = g.weapon, def = WEAPONS[w.type];
    // 0.16.0 (inlärningen): panelens knappar kommer när de är upplåsta. Före E4 dag 3 bara namn och hälsa.
    const can = f => allowed(s, f);
    const gs = can('unitSupplies') ? grenadeStats(s.research) : null;
    ui.head.innerHTML = `<div class="t">${def.name}${w.vet ? ' <span class="star" title="Veteran: slightly better aim and reload">★</span>' : ''}</div><div class="sub">Level ${w.level} of ${MAX_LEVEL}${w.kit ? ' · Grenade kit' : ''}${w.ammo ? ' · Extra ammo' : ''}${def.cone && can('rotate') ? ` · ${def.cone}° arc` : ''}</div>`;
    // Granatlådan: en rad till när Grenades är forskat. Med låda står det vad den gör i stället.
    // 0.18.0 (speltestet av 0.17.2: panelen bytte höjd och knapparna gled vid köp): det köpta står kvar som en avbockad knapp
    const kitRow = !gs ? '' : w.kit
      ? `<button type="button" class="act done" disabled title="Throws a grenade when ${gs.minCount} or more come close, or a brute, where it can see."><span class="a">${GRENADE_KIT.name}</span><span class="p">In use</span></button>`
      : `<button type="button" class="act" data-a="kit"><span class="a">${GRENADE_KIT.name}</span><span class="p" data-p></span></button>`;
    // 0.14.0: en kärntrupp uppgraderas i förrådet mellan dagarna och säljs inte; förnödenheterna köps här
    const core = w.uid != null;
    // 0.14.1 (granskningen av 0.14, Important 5): målen står utanför vinkeln (simuleringens idleOutside)
    const outside = g.idleOutside ? '<p class="info outside">Target outside arc. Press R to rotate.</p>' : '';
    const minimal = core && !can('rotate');
    const acts = [
      core ? '' : `<button type="button" class="act" data-a="up"><span class="a">Upgrade</span><span class="p" data-p></span><kbd>U</kbd></button>`,
      // 0.17.2: i uppställningen flyttas enheten fritt och direkt (Reposition), annars Move med väg och tid
      actions.canReposition?.() ? REPOS_BTN : canMoveType(w.type) && can('move') ? `<button type="button" class="act" data-a="move" title="${def.vehicle ? 'Crawls along the roads and grass. No fire while moving.' : 'Pack up, carry it along the way you show and set up. No fire while moving; the team can be caught.'}"><span class="a">Move</span><span class="p">${moveText(w.type)}</span><kbd>M</kbd></button>` : '',
      def.cone && can('rotate') ? `<button type="button" class="act" data-a="rotate" title="Turn the ${def.cone}° arc. It turns at its own speed and does not fire meanwhile."><span class="a">Rotate</span><kbd>R</kbd></button>` : '',
      core ? '' : `<button type="button" class="act" data-a="sell"><span class="a">Sell</span><span class="p" data-p></span></button>`,
    ].join('');
    ui.el.classList.toggle('full', !minimal);
    ui.body.innerHTML = minimal ? `${def.vehicle ? '<p class="info armour" data-armour></p>' : ''}${actions.canReposition?.() ? `<div class="acts">${REPOS_BTN}</div>` : ''}`
      : `${can('rotate') ? outside : ''}${statLine(gunStats(s, g), !!w.ammo)}${suppliedRows(w)}<p class="info ustate" data-state></p>${ordersHtml(s, g)}
      ${acts ? `<div class="acts">${acts}</div>` : ''}${def.mounted && (!core || can('move')) ? `<p class="info mounted">${core ? "Mounted, can't move." : "Mounted, can't move. Sell it to free the spot."}</p>` : ''}${def.vehicle ? `<p class="info armour" data-armour></p>` : ''}${movingRow(g)}${can('unitSupplies') ? `<div class="acts kitrow">${kitRow}${supplyRow(w, false)}</div>` : ''}`;
    const up = ui.body.querySelector('[data-a="up"]'), sell = ui.body.querySelector('[data-a="sell"]');
    wireSupplies();
    wireOrders(ui, actions, gunId);
    ui.body.querySelector('[data-a="repos"]')?.addEventListener('click', () => actions.startReposition?.(gunId));
    const kit = ui.body.querySelector('[data-a="kit"]');
    const own = () => { const gg = gunOf(cur); if (gg) showRange(gg, weaponStats(gg.weapon.type, gg.weapon.level, cur.research).range); };
    if (kit) {
      kit.addEventListener('click', () => {
        const r = actions.kit(gunId);
        if (!r.ok) ui.say(reasonText(r.reason));
      });
      kit.addEventListener('mouseenter', () => { const gg = gunOf(cur); if (gg && gs) showRange(gg, gs.range); });
      kit.addEventListener('mouseleave', own);
    }
    ui.body.querySelector('[data-a="move"]')?.addEventListener('click', () => {
      const gg = gunOf(cur);
      if (gg?.move) { ui.say(reasonText('flyttar')); return; }
      actions.startMove(gunId);
    });
    ui.body.querySelector('[data-a="rotate"]')?.addEventListener('click', () => actions.startRotate?.(gunId));
    up?.addEventListener('click', () => {
      const r = actions.upgrade(gunId);
      if (!r.ok) ui.say(reasonText(r.reason));
    });
    sell?.addEventListener('click', () => {
      const r = actions.sell(gunId);
      if (!r.ok) ui.say(reasonText(cur.phase === 'won' || cur.phase === 'lost' ? 'fel läge' : 'tom'));
      else actions.close();
    });
    up?.addEventListener('mouseenter', () => {
      const gg = gunOf(cur);
      if (gg && gg.weapon.level < MAX_LEVEL) showRange(gg, weaponStats(gg.weapon.type, gg.weapon.level + 1, cur.research).range);
    });
    up?.addEventListener('mouseleave', own);
    own();
  }
  // 0.14.0: förnödenheterna till enheten: ammunition (alla) och sandsäckar (grupperna), en gång per dag
  function supplyRow(w, squad) {
    const one = (id, label, title) => (w[id] ? `<button type="button" class="act done" disabled title="${title}"><span class="a">${label}</span><span class="p">In use</span></button>` : `<button type="button" class="act" data-sup="${id}" title="${title}"><span class="a">${label}</span><span class="p" data-p></span></button>`);
    return one('ammo', SUPPLIES.ammo.name, `Fires ${AMMO_PCT()} % faster for the rest of the day.`)
      + (squad ? one('sandbags', SUPPLIES.sandbags.name, `The men dig in: they take ${BAGS_PCT()} % less damage.`) : '');
  }
  function wireSupplies() {
    for (const b of ui.body.querySelectorAll('[data-sup]')) b.addEventListener('click', () => { const r = actions.supply(gunId, b.dataset.sup); if (!r.ok) ui.say(reasonText(r.reason)); });
  }

  // Hemvärnet: en rad per soldat (skydd och ställning), uppgradera, ersätt stupade, sälj.
  const STANCE = { crouch: 'crouching', kneel: 'kneeling', prone: 'prone' };
  function renderSquad(s, g) {
    const w = g.weapon, st = weaponStats(w.type, w.level, s.research);
    const room = actions.squadRoom ? actions.squadRoom(gunId) : { want: 0, fit: 0 };
    noRoom = room.fit < room.want;
    const next = w.level < MAX_LEVEL ? (noRoom ? REASONS['trångt-man'] : room.want ? 'Upgrade: one more rifleman' : 'Upgrade: better rifles') : 'Upgrade';
    const men = g.soldiers.map(m => `<li class="${m.down ? 'down' : ''}">${m.down ? 'Down' : `${COVER[m.cover].name}, ${STANCE[m.stance]}`}</li>`).join('');
    const standing = g.soldiers.filter(m => !m.down).length;
    const core = w.uid != null;
    ui.head.innerHTML = `<div class="t">${WEAPONS[w.type].name}${w.vet ? ' <span class="star" title="Veteran: slightly better aim and reload">★</span>' : ''}</div><div class="sub">Squad · Level ${w.level} of ${MAX_LEVEL} · ${standing} of ${g.soldiers.length} standing${w.sandbags ? ' · Dug in' : ''}</div>`;
    const gunName = { hv: 'Ak 4', inf: 'Ak 5', civ: 'Rifles' }[w.type] ?? 'Rifles';
    // 0.16.0 (textgenomgången): förklaringen om de stupade står inte i stridspanelen längre (tips när det
    // händer första gången, och Field manual); knapparna kommer när de är upplåsta
    const can = f => allowed(s, f), minimal = core && !can('rotate');
    const acts = [
      core ? '' : `<button type="button" class="act" data-a="up" title="${next}"><span class="a">Upgrade</span><span class="p" data-p></span><kbd>U</kbd></button>`,
      actions.canReposition?.() ? REPOS_BTN : can('move') ? '<button type="button" class="act" data-a="move" title="The squad runs to a new spot along the way you show. They can be caught on the way."><span class="a">Move</span><span class="p">Run</span><kbd>M</kbd></button>' : '',
      core ? '' : `<button type="button" class="act" data-a="sell"><span class="a">Sell</span><span class="p" data-p></span></button>`,
    ].join('');
    const gst = gunStats(s, g);
    ui.el.classList.toggle('full', !minimal);
    ui.body.innerHTML = minimal ? (actions.canReposition?.() ? `<div class="acts">${REPOS_BTN}</div>` : '') : `<div class="st"><span>Damage <b>${Math.round(st.damage)}</b></span><span>Range <b>${Math.round(st.range)} m</b></span><span>Rate <b${w.ammo ? ' class="up"' : ''}>${rateText(gst.rate)}/s</b></span><span>${gunName} <b>×${g.soldiers.length}</b></span></div>${suppliedRows(w)}
      <p class="info ustate" data-state></p><ul class="men">${men}</ul>${ordersHtml(s, g)}
      ${acts ? `<div class="acts">${acts}</div>` : ''}${!core && standing < g.soldiers.length ? `<div class="acts kitrow"><button type="button" class="act" data-a="reinforce"><span class="a">Reinforce</span><span class="p" data-p></span></button></div>` : ''}${can('unitSupplies') ? `<div class="acts kitrow">${supplyRow(w, true)}</div>` : ''}`;
    const upB = ui.body.querySelector('[data-a="up"]'), sellB = ui.body.querySelector('[data-a="sell"]'), rf = ui.body.querySelector('[data-a="reinforce"]');
    wireSupplies();
    wireOrders(ui, actions, gunId);
    ui.body.querySelector('[data-a="repos"]')?.addEventListener('click', () => actions.startReposition?.(gunId));
    upB?.addEventListener('click', () => { const r = actions.upgrade(gunId); if (!r.ok) ui.say(reasonText(r.reason)); });
    sellB?.addEventListener('click', () => {
      const r = actions.sell(gunId);
      if (!r.ok) ui.say(reasonText(cur.phase === 'won' || cur.phase === 'lost' ? 'fel läge' : 'tom'));
      else actions.close();
    });
    if (rf) rf.addEventListener('click', () => { const r = actions.reinforce(gunId); if (!r.ok) ui.say(reasonText(r.reason)); });
    ui.body.querySelector('[data-a="move"]')?.addEventListener('click', () => actions.startMove(gunId));
    actions.range({ x: g.x, z: g.z, r: SQUAD.radius, id: g.id });
  }

  function patch(s, g) {
    const w = g.weapon;
    const stEl = ui.body.querySelector('[data-state]');
    if (stEl) { const t = unitStateText(s, g); if (stEl.textContent !== t) stEl.textContent = t; stEl.classList.toggle('low', g.sanity != null && g.sanity < SANITY.waver && allowed(s, 'sanity')); }
    const rc = ui.body.querySelector('[data-a="recrew"]');
    if (rc) { const poor = s.cash < RECREW.cost, t = poor ? 'Need ' + money(RECREW.cost) : money(RECREW.cost), rp = rc.querySelector('[data-p]'); if (rp.textContent !== t) rp.textContent = t; rc.classList.toggle('off', poor); }
    const hb = ui.body.querySelector('[data-holdp]');
    if (hb) { const cd = !g.hold && g.holdCd > s.time ? Math.ceil(g.holdCd - s.time) : 0, t = g.hold ? 'Ambush ready' : cd ? `Wait ${cd} s` : 'Ambush'; if (hb.textContent !== t) hb.textContent = t; hb.parentElement.classList.toggle('off', !!cd); }
    const arm = ui.body.querySelector('[data-armour]');
    if (arm) { const t = g.building > 0 ? `Welding · ${Math.ceil(g.building)} s · not firing` : `Armour ${Math.max(0, Math.round(g.hp))} of ${g.maxHp}`; if (arm.textContent !== t) arm.textContent = t; arm.classList.toggle('low', g.hp < g.maxHp * 0.35); }
    const rf = ui.body.querySelector('[data-a="reinforce"]');
    if (rf) {
      const cost = g.soldiers.filter(m => m.down).length * SQUAD.reinforce, poor = s.cash < cost;
      const t = poor ? 'Need ' + money(cost) : money(cost), rp = rf.querySelector('[data-p]');
      if (rp.textContent !== t) rp.textContent = t;
      rf.classList.toggle('off', poor);
    }
    const up = ui.body.querySelector('[data-a="up"]'), sell = ui.body.querySelector('[data-a="sell"]');
    if (up) {
      const us = upgradeState(s, g, { noRoom });
      const upP = up.querySelector('[data-p]');
      if (upP.textContent !== us.text) upP.textContent = us.text;
      up.classList.toggle('off', !us.ok);
      up.classList.toggle('max', us.max);
      up.title = us.why || (g.squad ? up.title : '');
    }
    if (sell) {
      const sellText = '+' + money(weaponRefund(w));
      const sellP = sell.querySelector('[data-p]');
      if (sellP.textContent !== sellText) sellP.textContent = sellText;
    }
    for (const b of ui.body.querySelectorAll('[data-sup]')) {
      const cost = SUPPLIES[b.dataset.sup].cost, poor = s.cash < cost, t = poor ? 'Need ' + money(cost) : money(cost), bp = b.querySelector('[data-p]');
      if (bp.textContent !== t) bp.textContent = t;
      b.classList.toggle('off', poor);
    }
    const kit = ui.body.querySelector('[data-a="kit"]');
    if (kit) {
      const poor = s.cash < GRENADE_KIT.cost;
      const t = poor ? 'Need ' + money(GRENADE_KIT.cost) : money(GRENADE_KIT.cost);
      const kp = kit.querySelector('[data-p]');
      if (kp.textContent !== t) kp.textContent = t;
      kit.classList.toggle('off', poor);
    }
  }

  function update(s) {
    cur = s;
    const g = gunOf(s);
    if (!g) { actions.close(); return; }
    const k = keyOf(s, g);
    if (k !== key) { key = k; ui.hush(); render(s, g); }
    patch(s, g);
  }
  update(sim);
  return { el: ui.el, update, close: ui.close, say: ui.say };
}

// Panelen för ett utlagt hinder: skick och Remove. På rutnätet (Gnesta) hör spärrens rutor ihop
// och Remove river hela spärren. Hinder köps från köpraden, inte här (0.6.0).
export function cellPanel(root, index, sim, actions) {
  const ui = shell(root, actions);
  let key = null;
  const frac = ob => (OBSTACLES[ob.type].kind === 'slow' ? ob.durability / ob.maxDurability : ob.hp / ob.maxHp);
  const lineOf = s => { const ob = s.obstacles[index]; return ob?.line != null ? Object.values(s.obstacles).filter(o => o.line === ob.line) : ob ? [ob] : []; };

  function render(s) {
    const ob = s.obstacles[index];
    const n = lineOf(s).length;
    ui.head.innerHTML = `<div class="t">${OBSTACLES[ob.type].name}</div><div class="sub" data-cond></div>`;
    ui.body.innerHTML = `<div class="acts"><button type="button" class="act" data-a="rm"><span class="a">${n > 1 ? `Remove all ${n}` : 'Remove'}</span><span class="p" data-p></span></button></div>`;
    ui.body.querySelector('[data-a="rm"]').addEventListener('click', () => {
      const r = actions.remove(index);
      if (!r.ok) ui.say(reasonText('fel läge'));
      else actions.close();
    });
  }

  function patch(s) {
    const line = lineOf(s);
    const f = Math.min(...line.map(frac));
    const cond = ui.head.querySelector('[data-cond]');
    // 0.17.1: en ruta har gått sönder och horden går genom luckan
    const condText = line.some(o => o.breached) ? 'Breached: they walk through the gap' : `Condition ${Math.max(0, Math.round(f * 100))} %${line.length > 1 ? ` · ${line.length} tiles` : ''}`;
    if (cond.textContent !== condText) cond.textContent = condText;
    const rm = ui.body.querySelector('[data-a="rm"]');
    const refund = lineRefund(line);
    const t = refund ? '+' + money(refund) : 'No refund';
    const p = rm.querySelector('[data-p]');
    if (p.textContent !== t) p.textContent = t;
  }

  function update(s) {
    const ob = s.obstacles[index];
    if (!ob) { actions.close(); return; }
    const k = 'ob:' + ob.type + ':' + (ob.line ?? '');
    if (k !== key) { key = k; ui.hush(); render(s); }
    patch(s);
  }
  update(sim);
  return { el: ui.el, update, close: ui.close, say: ui.say };
}

// ---------- dagcykelns skyltar ----------
// Alla skyltar ligger mitt på skärmen ovanpå den dämpade kartan. De returnerar { el, close }.

function plate(root, cls, html) {
  const el = document.createElement('div');
  el.className = 'sheet plate ' + cls;
  el.innerHTML = html;
  root.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  return { el, close: () => el.remove() };
}
function on(el, sel, fn) {
  const b = el.querySelector(sel);
  if (b) b.addEventListener('click', fn);
}

// cash: pengarna dagen börjar med (dagens kassa plus forskningen Större budget).
// 0.12.0 (H102): hur lång tid en flytt tar, och raden medan den pågår.
const moveText = type => { const m = WEAPONS[type]?.move; return m ? `${Math.round(m.pack + m.setup)} s + walk` : ''; };
function movingRow(g) {
  const ph = movePhase(g);
  if (!ph) return '';
  const left = Math.max(0, Math.ceil(g.move.total - g.move.t));
  const crew = g.move.crewMax ? ` · team ${Math.max(0, Math.round(g.move.crewHp / g.move.crewMax * 100))} %` : '';
  return `<p class="info moving">${{ pack: 'Packing up', carry: 'On the move', setup: 'Setting up' }[ph]} · ${left} s · not firing${crew}</p>`;
}
// 0.12.0 (H101): förvarningen om vilande smittade i husen (en rad per gata; överraskningen syns inte).
export function intelLine(dayCfg) {
  const streets = [...new Set((dayCfg.dormant ?? []).filter(d => d.intel !== false).map(d => d.street).filter(Boolean))];
  return streets.length ? `<p class="lead intel">Intel: dormant infected reported on ${streets.join(' and ')}.</p>` : '';
}
// 0.13.0 (H104): det som kommit till förrådet i dag (jämfört med i går), en rad i introt.
export function arrivedLine(map, day) {
  const list = d => map.days[d - 1]?.arsenal ?? map.arsenal ?? null;
  const now = list(day), before = day > 1 ? list(day - 1) : null;
  if (!now || !before) return '';
  const fresh = now.filter(id => !before.includes(id)).map(id => WEAPONS[id]?.name ?? OBSTACLES[id]?.name).filter(Boolean);
  return fresh.length ? `<p class="lead arrived">New today: ${fresh.join(', ')}.</p>` : '';
}
// 0.16.0 (inlärningen, designen avsnitt 2.2 och 6): introt är en rubrik och en rad, högst 12 ord. Ledningens
// meddelande står bara på kartan, förnödenheterna och reserven i HUD:en, och lektionerna lär ut resten.
export function dayIntro(root, dayCfg, cash, onGo) {
  void cash;
  const p = plate(root, 'intro', `
    <div class="h">${dayCfg.intro.title}</div>
    <p class="lead">${dayCfg.intro.text}</p>
    <div class="acts"><button type="button" class="act main" data-a="go"><span class="a">To the line</span><kbd>Enter</kbd></button></div>`);
  on(p.el, '[data-a="go"]', onGo);
  return p;
}

// Resultatet (0.14.0): RP för försöket (dödade och vågor, uppdraget, faktorn för försöket och bonusarna),
// och vad som händer med styrkan: vid vinst står förlusterna kvar, vid förlust börjar dagen om med den
// styrka man gick in med. rp: src/meta/operation.js rpForAttempt. losses: [{ name, men, destroyed }].
// outro: sektorns slut när sista dagen är vunnen.
// 0.16.0 (inlärningen): RP syns först när förrådet öppnar (showRp), på E4 bara VICTORY och radion. next: knappen
// efter en vunnen dag ('Operations map', eller 'Next day' innan kartan är upplåst). manualHint: efter en förlust
// ett uppslag ur Field manual som hör till dagen (designen avsnitt 5.3), en rad.
export function dayResultPanel(root, { won, rp = null, attempt = 1, totalRp = 0, day, kills, wavesCleared, waves, wave = null, lastDay, outro = null, lostBy = null, evac = null, losses = [], showRp = true, depot = true, next = 'Operations map', manualHint = null }, { onRetry, onOpMap, onMenu, onManual }) {
  // 0.14.1 (speltestet av 0.14.0: "Day 3 held." direkt över "has fallen silent" lästes som en förlust): sista
  // dagen i en sektor får rubriken VICTORY, och sektorns berättelse står för sig under resultatet.
  const sectorDone = won && lastDay && outro;
  const head = sectorDone ? 'Victory' : won ? `Day ${day} held.` : lostBy === 'civilians' ? 'Too many civilians fell.' : 'The line broke.';
  const evacLine = evac ? `<p class="lead strong">${evac.safe} of ${evac.total} civilians reached the ice rink${evac.lost ? `, ${evac.lost} fell` : ''}.</p>` : '';
  const rows = [];
  if (rp) {
    rows.push(['Kills and waves', rp.base]);
    if (rp.objective) rows.push(['Objective', rp.objective]);
    if (rp.factor < 1) rows.push([`Attempt ${attempt}: ×${rp.factor}`, rp.earned - rp.base - rp.objective]);
    for (const b of rp.bonuses) rows.push([b.label, b.rp]);
  }
  if (!showRp) rows.length = 0;
  const rpTable = rp && showRp ? `<div class="rptab">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v >= 0 ? '+' : ''}${v}</b></div>`).join('')}<div class="tot"><span>Requisition points</span><b>+${rp.total}</b></div></div>` : '';
  const lost = losses.filter(l => l.men || l.destroyed);
  const lossLine = won
    ? (!depot ? '' : lost.length ? `<p class="note-line">Losses stand: ${lost.map(l => (l.destroyed ? `${l.name} lost` : `${l.name} -${l.men}`)).join(', ')}. Refill at the depot.</p>` : '')
    : `<p class="note-line">The day starts over with the force you went in with.${showRp && depot ? ' Spend your RP at the depot first.' : ''}</p>${manualHint ? `<button type="button" class="link mhint" data-a="manual">Field manual: ${manualHint.title}</button>` : ''}`;
  // 0.14.2 (speltestet av 0.14.1: "VICTORY" följt av "The roadblock at E4 has fallen silent" lästes fortfarande
  // som en förlust): rubriken står ensam, sedan siffrorna, och sist sektorns berättelse som ett radiomeddelande
  // från ledningen i en egen ruta, tydligt skild från resultatet.
  const done = sectorDone ? `<p class="lead strong">Day ${day} held. ${outro.name ?? 'The sector'} is done.</p>` : '';
  const story = sectorDone ? `<div class="radio"><div class="rh"><i></i>Radio · ${outro.from ?? 'Försvarsmakten'} to all units</div>
      <p>${outro.text}</p><div class="rf">Out.</div></div>` : '';
  // 0.14.2 (speltestet: "Waves cleared 1 of 3" på Gnesta trots "Day 1 held"): en evakueringsdag tar slut när
  // de civila är inne, så vågorna räknas inte där; i stället hur många som kom fram.
  const waveFact = evac && won ? `<div><span>Civilians safe</span><b>${evac.safe} of ${evac.total}</b></div>`
    : wave != null ? `<div><span>Reached</span><b>${waveLabel({ wave, of: waves }, wavesCleared)}</b></div>`
    : `<div><span>Waves cleared</span><b>${wavesCleared} of ${waves}</b></div>`;
  const main = won
    ? `<button type="button" class="act main" data-a="opmap"><span class="a">${next}</span><kbd>Enter</kbd></button>`
    : `<button type="button" class="act main" data-a="retry"><span class="a">Try again</span><kbd>Enter</kbd></button><button type="button" class="act" data-a="opmap"><span class="a">Operations map</span></button>`;
  const p = plate(root, 'result' + (won ? ' won' : ' lost') + (sectorDone ? ' victory' : ''), `
    <div class="h">${head}</div>
    ${evacLine}
    ${done}
    ${rpTable}
    ${lossLine}
    ${sectorDone && !showRp ? '' : `<div class="facts">
      <div><span>Kills</span><b>${kills}</b></div>
      ${waveFact}
      ${showRp ? `<div><span>RP to spend</span><b>${totalRp}</b></div>` : ''}
    </div>`}
    ${story}
    <div class="acts">${main}</div>
    <button type="button" class="link" data-a="menu">To menu</button>`);
  on(p.el, '[data-a="retry"]', onRetry);
  on(p.el, '[data-a="opmap"]', onOpMap);
  on(p.el, '[data-a="menu"]', onMenu);
  on(p.el, '[data-a="manual"]', () => onManual?.(manualHint?.id));
  return p;
}

// Menyn (0.14.0): operationen fortsätter på operationskartan; dagarna och banorna väljs där.
// 0.16.3 (Olas "trångt och konstigt"): luftig skylt, knappen på en rad ("Continue"), statusraden under den
// (var operationen står: plats, dag och RP), New operation som en riktig sekundär knapp, versionen i hörnet.
// status: { place, day } eller null.
export function mainMenu(root, { started, rp, status, onContinue, onNew, version }) {
  const rpText = `${String(Math.round(rp)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')} RP`;
  const where = status?.place ? status.place + (status.day ? `, day ${status.day}` : '') : null;
  const line = [where, rpText].filter(Boolean).join(' · ');
  const p = plate(root, 'menu', `
    <div class="logo">HORDE</div>
    <div class="map">Operation Södermanland</div>
    <div class="menu-main">
      <button type="button" class="act main" data-a="continue"><span class="a">${started ? 'Continue' : 'Start the operation'}</span><kbd>Enter</kbd></button>
      ${started ? `<p class="menu-status">${line}</p>` : ''}
    </div>
    ${started ? '<button type="button" class="act menu-new" data-a="new"><span class="a">New operation</span></button>' : ''}
    <div class="v">v${version}</div>`);
  on(p.el, '[data-a="continue"]', onContinue);
  on(p.el, '[data-a="new"]', () => { if (confirm('Start a new operation? Your current one is kept as a backup copy.')) onNew(); });
  return p;
}

// Liten notis som försvinner av sig själv.
// 0.14.1 (speltestet av 0.14.0: "Barricade do..." och "Barricade failing" ovanpå varandra): notiserna
// staplas i en kolumn uppe i mitten, högst NOTE_MAX åt gången; fler väntar i kö och kommer när en går.
// Samma text som redan syns visas inte två gånger (den står kvar lite längre i stället).
const NOTE_MAX = 3, NOTE_MS = 3200;
const noteQueue = [];
function noteStack(root) {
  let st = root.querySelector('#notes');
  if (!st) { st = document.createElement('div'); st.id = 'notes'; root.appendChild(st); }
  return st;
}
function showNote(root, text, cls, ms = NOTE_MS) {
  const st = noteStack(root);
  const el = document.createElement('div');
  el.className = 'note plate ' + cls;
  el.textContent = text;
  st.appendChild(el);
  el._t = setTimeout(() => dropNote(root, el), ms);
}
function dropNote(root, el) {
  el.remove();
  const st = noteStack(root);
  while (noteQueue.length && st.querySelectorAll('.note').length < NOTE_MAX) { const q = noteQueue.shift(); showNote(root, q.text, q.cls, q.ms); }
}
// 0.16.1: prio (en ny ingång) tar plats direkt, den äldsta raden får gå. 0.16.2: ms, hur länge raden står
export function note(root, text, cls = '', { prio = false, ms = NOTE_MS } = {}) {
  const st = noteStack(root);
  if (prio && st.querySelectorAll('.note').length >= NOTE_MAX && !noteQueue.some(q => q.text === text)) { const old = st.querySelector('.note'); if (old) { clearTimeout(old._t); old.remove(); } }
  const same = [...st.querySelectorAll('.note')].find(n => n.textContent === text);
  if (same) { clearTimeout(same._t); same._t = setTimeout(() => dropNote(root, same), ms); return; }
  if (noteQueue.some(q => q.text === text)) return;
  if (st.querySelectorAll('.note').length >= NOTE_MAX) { noteQueue.push({ text, cls, ms }); if (noteQueue.length > 6) noteQueue.shift(); return; }
  showNote(root, text, cls, ms);
}
// Tömmer kön (skyltarna täcker skärmen, main.js setMode).
export function clearNoteQueue() { noteQueue.length = 0; }
