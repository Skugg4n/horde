// Paneler för en utställd pjäs och en ruta på vägen (hinder), och vapenkorten som startar
// placeringen.
// Panelen byggs om när det som står på platsen ändras, och uppdaterar priser och
// gråa knappar varje bildruta. actions kommer från main.js och returnerar simuleringens svar.
import { WEAPONS, GRENADE_KIT } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { weaponStats, upgradeCost, MAX_LEVEL, weaponRefund, lineRefund, grenadeStats, tierOf } from '../sim/stats.js';
import { RESEARCH, ROMAN, researchNode } from '../data/research.js';
import { MAPS } from '../data/maps.js';
import { canBuyResearch, nextTier, hasTier, mapState, mapUnlocked } from '../meta/progress.js';
import { ICONS } from './icons.js';
import { SHOP, BUY_MENU, shopItem, hotkeyOf } from '../data/shop.js';
import { buyState } from '../sim/buy.js';
import { COVER, SQUAD, squadSize } from '../sim/squad.js';
import { money } from './format.js';
import { MOVE_TIME, movePhase } from '../sim/sim.js';

const REASONS = {
  'pengar': 'Not enough cash.',
  // placeringen (korta, de står vid pekaren)
  'gata': 'On the road',
  'hus': 'Inside a house',
  'kant': 'Not on the roof, too close to the edge',
  'nära': 'Too close to another gun',
  'fullt': 'Max guns reached (research more)',
  'skog': 'In the forest',
  'vatten': 'In the water',
  'hinder': 'Something in the way',
  'bas': 'On the base',
  'utanför': 'Outside the map',
  'ej upplåst': 'Not researched yet.',
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
};
export function reasonText(r) {
  return REASONS[r] || REASONS['okänd'];
}

function statLine(st) {
  return `<div class="st"><span>Damage <b>${Math.round(st.damage)}</b></span><span>Range <b>${Math.round(st.range)} m</b></span></div>`;
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
  return `DMG ${Math.round(st.damage)}${w.squad ? ' ×' + squadSize(1, research) : ''} · RNG ${Math.round(st.range)} m · RATE ${num(st.rate)}/s`;
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
  if (it.kind !== 'gun') { const o = OBSTACLES[it.id]; return o.kind === 'block' ? 'Holds' : `Slow ${Math.round((1 - o.slow) * 100)}%`; }
  const st = weaponStats(it.id, 1, research), w = WEAPONS[it.id];
  const rate = st.rate >= 2 ? String(Math.round(st.rate)) : st.rate.toFixed(1).replace(/^0/, '');
  return `${Math.round(st.damage)}${w.squad ? '×' + squadSize(1, research) : ''}·${Math.round(st.range)}m·${rate}/s`;
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
  let key = null, barR = -1;
  const cards = new Map();      // id -> { btn, price, why, state }
  // Köpradens högerkant till CSS (--bar-r): vågens knapp och rad ställer sig till höger om den.
  function measure() {
    if (el.hidden) return;
    const r = Math.round(el.getBoundingClientRect().right);
    if (r !== barR) { barR = r; document.documentElement.style.setProperty('--bar-r', r + 'px'); }
  }
  addEventListener('resize', () => { barR = -1; measure(); });
  function render(sim) {
    // 0.10.1: en smal rad med små kort (namn och pris); pekaren över ett kort fäller ut det uppåt
    // med vad saken gör, skada och räckvidd, och varför det inte går (speltestet: raden tog en
    // fjärdedel av kartan).
    // 0.11.0: korten i kategorier (BUY_MENU) med små rubriker, snabbvalet "2-1" på varje kort.
    el.innerHTML = `<div class="k">BUY <span class="guns">GUNS <b data-n></b></span></div><div class="groups">${BUY_MENU.map((c, ci) => `
      <div class="grp" data-cat="${ci + 1}"><div class="gh"><kbd>${ci + 1}</kbd>${c.name}</div><div class="cards">${c.items.map(x => {
      const it = shopItem(x.id), [role, stats] = cardLines(it, sim.research);
      return `
      <button type="button" class="card buy" data-id="${it.id}" aria-label="${itemDesc(it, sim)}">
        <kbd>${hotkeyOf(it.id)}</kbd>${ICONS[it.id] || ''}<div class="n">${itemShort(it)}</div>
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
    const k = [...sim.research].join(',') + '|' + sim.map.id;
    if (k !== key || barR < 0) { key = k; render(sim); catKey = ''; measure(); }
    const ck = openCat + ':' + armed;
    if (ck !== catKey) {
      catKey = ck;
      el.classList.toggle('choosing', openCat != null);
      for (const gEl of el.querySelectorAll('.grp')) { gEl.classList.toggle('open', Number(gEl.dataset.cat) === openCat); gEl.classList.toggle('armed', armed && Number(gEl.dataset.cat) === openCat); }
    }
    set(el.querySelector('[data-n]'), `${sim.guns.length} / ${sim.maxGuns}`);
    for (const [id, c] of cards) {
      const st = buyState(sim, id);
      const sk = st.state + ':' + st.need + ':' + (holding === id);
      if (c.state === sk) continue;
      c.state = sk;
      const b = c.btn;
      b.classList.toggle('on', holding === id);
      b.classList.toggle('poor', st.state === 'poor');
      b.classList.toggle('locked', st.state === 'locked');
      b.classList.toggle('full', st.state === 'full');
      b.classList.toggle('off', st.state !== 'ok');
      if (st.state === 'locked') {
        c.price.innerHTML = LOCK + ' Locked';
        set(c.why, 'Research: ' + (researchNode(st.research)?.name ?? itemName(shopItem(id))));
      } else {
        // för dyrt: beloppet som fattas syns på det lilla kortet också
        set(c.price, st.state === 'poor' ? `Need ${money(st.need)}` : st.state === 'full' ? 'Full' : money(st.cost));
        set(c.why, st.state === 'poor' ? `Need ${money(st.need)} more` : st.state === 'full' ? 'All positions taken' : '');
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

// Panelen för en utställd pjäs: uppgradera, granatlåda, sälj. Sikten visas av main.js.
export function gunPanel(root, gunId, sim, actions) {
  const ui = shell(root, actions);
  let key = null, cur = sim, noRoom = false;
  const gunOf = s => s.guns.find(x => x.id === gunId);
  const keyOf = (s, g) => `w:${g.weapon.type}:${g.weapon.level}:${!!g.weapon.kit}:${tierOf(s.research, 'grenade')}` + (g.squad ? ':' + g.soldiers.map(m => (m.down ? 'd' : 'u')).join('') : '') + (g.move ? ':mv' + movePhase(g) + Math.ceil(g.move.total - g.move.t) : '');
  const showRange = (g, r) => actions.range({ x: g.x, z: g.z, r, id: g.id });

  function render(s, g) {
    if (g.squad) { renderSquad(s, g); return; }
    const w = g.weapon, def = WEAPONS[w.type];
    const gs = grenadeStats(s.research);
    ui.head.innerHTML = `<div class="t">${def.name}</div><div class="sub">Level ${w.level} of ${MAX_LEVEL}${w.kit ? ' · Grenade kit' : ''}</div>`;
    // Granatlådan: en rad till när Grenades är forskat. Med låda står det vad den gör i stället.
    const kitRow = !gs ? '' : w.kit
      ? `<p class="info kit">Throws a grenade when ${gs.minCount} or more come close, or a brute, where it can see.</p>`
      : `<button type="button" class="act" data-a="kit"><span class="a">${GRENADE_KIT.name}</span><span class="p" data-p></span></button>`;
    ui.body.innerHTML = `${statLine(weaponStats(w.type, w.level, s.research))}
      <div class="acts">
        <button type="button" class="act" data-a="up"><span class="a">Upgrade</span><span class="p" data-p></span></button>
        <button type="button" class="act" data-a="move" title="Pack up, carry and set up somewhere else. No fire while moving."><span class="a">Move</span><span class="p">${moveText(w.type)}</span></button>
        <button type="button" class="act" data-a="sell"><span class="a">Sell</span><span class="p" data-p></span></button>
      </div>${movingRow(g)}${kitRow ? `<div class="acts kitrow">${kitRow}</div>` : ''}`;
    const up = ui.body.querySelector('[data-a="up"]'), sell = ui.body.querySelector('[data-a="sell"]');
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
    ui.body.querySelector('[data-a="move"]').addEventListener('click', () => {
      const gg = gunOf(cur);
      if (gg?.move) { ui.say(reasonText('flyttar')); return; }
      actions.startMove(gunId);
    });
    up.addEventListener('click', () => {
      const r = actions.upgrade(gunId);
      if (!r.ok) ui.say(reasonText(r.reason));
    });
    sell.addEventListener('click', () => {
      const r = actions.sell(gunId);
      if (!r.ok) ui.say(reasonText(cur.phase === 'won' || cur.phase === 'lost' ? 'fel läge' : 'tom'));
      else actions.close();
    });
    up.addEventListener('mouseenter', () => {
      const gg = gunOf(cur);
      if (gg && gg.weapon.level < MAX_LEVEL) showRange(gg, weaponStats(gg.weapon.type, gg.weapon.level + 1, cur.research).range);
    });
    up.addEventListener('mouseleave', own);
    own();
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
    ui.head.innerHTML = `<div class="t">${WEAPONS[w.type].name}</div><div class="sub">Squad · Level ${w.level} of ${MAX_LEVEL} · ${standing} of ${g.soldiers.length} standing</div>`;
    ui.body.innerHTML = `<div class="st"><span>Damage <b>${Math.round(st.damage)}</b></span><span>Range <b>${Math.round(st.range)} m</b></span><span>Ak 4 <b>×${g.soldiers.length}</b></span></div>
      <ul class="men">${men}</ul>
      <div class="acts">
        <button type="button" class="act" data-a="up" title="${next}"><span class="a">Upgrade</span><span class="p" data-p></span></button>
        <button type="button" class="act" data-a="move" title="The squad runs to a new spot. They can be caught on the way."><span class="a">Move</span><span class="p">Run</span></button>
        <button type="button" class="act" data-a="sell"><span class="a">Sell</span><span class="p" data-p></span></button>
      </div>${standing < g.soldiers.length ? `<div class="acts kitrow"><button type="button" class="act" data-a="reinforce"><span class="a">Reinforce</span><span class="p" data-p></span></button></div>` : ''}`;
    const upB = ui.body.querySelector('[data-a="up"]'), sellB = ui.body.querySelector('[data-a="sell"]'), rf = ui.body.querySelector('[data-a="reinforce"]');
    upB.addEventListener('click', () => { const r = actions.upgrade(gunId); if (!r.ok) ui.say(reasonText(r.reason)); });
    sellB.addEventListener('click', () => {
      const r = actions.sell(gunId);
      if (!r.ok) ui.say(reasonText(cur.phase === 'won' || cur.phase === 'lost' ? 'fel läge' : 'tom'));
      else actions.close();
    });
    if (rf) rf.addEventListener('click', () => { const r = actions.reinforce(gunId); if (!r.ok) ui.say(reasonText(r.reason)); });
    ui.body.querySelector('[data-a="move"]').addEventListener('click', () => actions.startMove(gunId));
    actions.range({ x: g.x, z: g.z, r: SQUAD.radius, id: g.id });
  }

  function patch(s, g) {
    const w = g.weapon;
    const rf = ui.body.querySelector('[data-a="reinforce"]');
    if (rf) {
      const cost = g.soldiers.filter(m => m.down).length * SQUAD.reinforce, poor = s.cash < cost;
      const t = poor ? 'Need ' + money(cost) : money(cost), rp = rf.querySelector('[data-p]');
      if (rp.textContent !== t) rp.textContent = t;
      rf.classList.toggle('off', poor);
    }
    const up = ui.body.querySelector('[data-a="up"]'), sell = ui.body.querySelector('[data-a="sell"]');
    const cost = upgradeCost(w.type, w.level);
    const upText = cost == null ? 'Max level' : s.cash < cost ? 'Need ' + money(cost) : money(cost);
    const upP = up.querySelector('[data-p]');
    if (upP.textContent !== upText) upP.textContent = upText;
    up.classList.toggle('off', cost == null || s.cash < cost || (g.squad && noRoom));
    up.classList.toggle('max', cost == null);
    const sellText = '+' + money(weaponRefund(w));
    const sellP = sell.querySelector('[data-p]');
    if (sellP.textContent !== sellText) sellP.textContent = sellText;
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
    const condText = `Condition ${Math.max(0, Math.round(f * 100))} %${line.length > 1 ? ` · ${line.length} tiles` : ''}`;
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
const moveText = type => `${MOVE_TIME[type] ?? 8} s`;
function movingRow(g) {
  const ph = movePhase(g);
  if (!ph) return '';
  const left = Math.max(0, Math.ceil(g.move.total - g.move.t));
  return `<p class="info moving">${{ pack: 'Packing up', carry: 'On the move', setup: 'Setting up' }[ph]} · ${left} s · not firing</p>`;
}
// 0.12.0 (H101): förvarningen om vilande smittade i husen (en rad per gata; överraskningen syns inte).
export function intelLine(dayCfg) {
  const streets = [...new Set((dayCfg.dormant ?? []).filter(d => d.intel !== false).map(d => d.street).filter(Boolean))];
  return streets.length ? `<p class="lead intel">Intel: dormant infected reported on ${streets.join(' and ')}.</p>` : '';
}
export function dayIntro(root, dayCfg, cash, onGo) {
  const p = plate(root, 'intro', `
    <div class="h">${dayCfg.intro.title}</div>
    <p class="lead">${dayCfg.intro.text}</p>${intelLine(dayCfg)}
    <p class="note-line">New day: you start with ${money(cash)} and no guns out. Research carries over.</p>
    <button type="button" class="act main" data-a="go"><span class="a">To the line</span><kbd>Enter</kbd></button>`);
  on(p.el, '[data-a="go"]', onGo);
  return p;
}

// lastDay: sista dagen på banan; då leder vinsten till menyn.
// cashLeft: pengar kvar när dagen tog slut. De följer inte med, så det sägs ut på vinstskylten.
// outro (0.11.0): sektorns slut, { text, nextName } när sista dagen är vunnen; nextName leder
// direkt till nästa sektors dag 1 (onNextMap).
export function dayResultPanel(root, { won, intelEarned, lesson = 0, totalIntel, day, kills, wavesCleared, waves, lastDay, cashLeft = 0, outro = null }, { onRetry, onNext, onNextMap, onResearch, onMenu }) {
  const head = won ? `Day ${day} cleared.` : 'The base fell.';
  // 0.10.1: överlevarnas lärdom fyller på en förlust så att den räcker till en nivå i forskningen
  const lead = won ? `You earned ${intelEarned} research points.`
    : `You keep ${intelEarned} research points${lesson ? `, ${lesson} of them from what the survivors learned` : ''}. Spend them before you try again.`;
  const done = won && lastDay && outro ? `<p class="lead strong sector">${outro.text}</p>` : '';
  const main = won
    ? (lastDay ? (outro?.nextName ? `<button type="button" class="act main" data-a="nextmap"><span class="a">On to ${outro.nextName}</span><kbd>Enter</kbd></button>`
                                  : `<button type="button" class="act main" data-a="menu"><span class="a">To menu</span></button>`)
               : `<button type="button" class="act main" data-a="next"><span class="a">Next day</span></button>`)
    : `<button type="button" class="act main" data-a="retry"><span class="a">Try again</span></button>`;
  const p = plate(root, 'result' + (won ? ' won' : ' lost'), `
    <div class="h">${head}</div>
    <p class="lead">${lead}</p>
    ${done}
    ${won && !lastDay && cashLeft > 0 ? `<p class="note-line">Left in the cash box: ${money(cashLeft)}. It does not carry over.</p>` : ''}
    <div class="facts">
      <div><span>Kills</span><b>${kills}</b></div>
      <div><span>Waves cleared</span><b>${wavesCleared} of ${waves}</b></div>
      <div><span>Research points</span><b>${totalIntel}</b></div>
    </div>
    <div class="acts">${main}<button type="button" class="act" data-a="research"><span class="a">Research</span></button></div>
    ${won && lastDay && !outro?.nextName ? '' : `<button type="button" class="link" data-a="menu">To menu</button>`}`);
  on(p.el, '[data-a="retry"]', onRetry);
  on(p.el, '[data-a="next"]', onNext);
  on(p.el, '[data-a="nextmap"]', onNextMap);
  on(p.el, '[data-a="research"]', onResearch);
  for (const b of p.el.querySelectorAll('[data-a="menu"]')) b.addEventListener('click', onMenu);
  return p;
}

// Kravets namn: 'm2.1' blir "Ksp 88 I".
const reqName = req => { const [id, t] = req.split('.'); return `${researchNode(id).name} ${ROMAN[Number(t || 1)]}`; };
// Noder som kräver en annan nod (vilken nivå som helst) ligger till höger om den.
function researchRows() {
  const deps = n => [...new Set(n.tiers.flatMap(t => t.requires).map(r => r.split('.')[0]).filter(id => id !== n.id))];
  const roots = RESEARCH.filter(n => !n.tiers[0].requires.length);
  const rows = roots.map(n => [n]);
  for (const n of RESEARCH.filter(n => n.tiers[0].requires.length)) {
    const row = rows.find(rw => rw.some(x => deps(n).includes(x.id)));
    if (row) row.push(n); else rows.push([n]);
  }
  return rows.sort((a, b) => b.length - a.length);
}
// 0.10.1 (speltestet): nivån som köps härnäst skrivs "Level 2", inte "II", som lästes som nivån man
// redan har (och verkade hoppa mellan I och II på samma kort). Pricken visar vad som är köpt.
export function researchState(progress, node) {
  const next = nextTier(progress, node.id);
  if (!next) return { cls: 'bought', text: 'Maxed', effect: node.tiers[node.tiers.length - 1].effect };
  const c = canBuyResearch(progress, node.id);
  const effect = next.data.effect;
  const label = node.tiers.length > 1 ? `Level ${next.tier}: ` : '';
  if (c.ok) return { cls: 'buy', text: `${label}Buy (${next.data.cost})`, effect };
  if (c.reason === 'kräver') {
    const need = next.data.requires.filter(r => !hasTier(progress, r)).map(reqName);
    return { cls: 'locked', text: 'Requires ' + need.join(', '), effect };
  }
  return { cls: 'poor', text: `${label}${next.data.cost}, need ${next.data.cost - progress.intel} more`, effect };
}
// Nivåprickar: fyllda för köpta nivåer. Bara för noder med fler än en nivå.
function pips(progress, node) {
  if (node.tiers.length < 2) return '';
  const t = tierOf(progress.research, node.id);
  return `<span class="pips">${node.tiers.map((_, i) => `<i class="${i < t ? 'on' : ''}"></i>`).join('')}</span>`;
}

// onBuy(id) returnerar det nya framsteget. update(progress) ritar om.
export function researchPanel(root, progress, onBuy, onClose) {
  const p = plate(root, 'research', `
    <div class="h">Research</div>
    <p class="lead" data-have></p>
    <div class="tree" data-tree></div>
    <div class="acts"><button type="button" class="act main" data-a="close"><span class="a">Done</span><kbd>Esc</kbd></button></div>`);
  const tree = p.el.querySelector('[data-tree]'), have = p.el.querySelector('[data-have]');
  function render(pr) {
    have.textContent = `You have ${pr.intel} research points.`;
    tree.innerHTML = researchRows().map(row => `<div class="row">${row.map((node, i) => {
      const st = researchState(pr, node);
      return `${i ? '<i class="arrow">→</i>' : ''}<button type="button" class="node ${st.cls}" data-id="${node.id}">
        <div class="n">${node.name}${pips(pr, node)}</div><div class="d">${st.effect}</div><div class="s">${st.text}</div></button>`;
    }).join('')}</div>`).join('');
    for (const b of tree.querySelectorAll('.node.buy')) b.addEventListener('click', () => render(onBuy(b.dataset.id)));
  }
  render(progress);
  on(p.el, '[data-a="close"]', onClose);
  return { ...p, update: render };
}

// Menyn: banorna överst (E4 och Gnesta, Gnesta låst tills E4 dag 3 är klar), sedan banans dagar.
// debug: alla banor går att välja (?debug).
export function mainMenu(root, progress, { onDay, onResearch, onMap, version, debug = false }) {
  const map = MAPS[progress.mapId];
  const st = mapState(progress);
  const maps = Object.values(MAPS).map(m => {
    const open = mapUnlocked(progress, m.id, { debug }), on = m.id === map.id;
    const sub = open ? `Days 1-${m.days.length}` : `Clear ${MAPS[m.unlock.map].name} day ${m.unlock.day} first`;
    return `<button type="button" class="maptab ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-map="${m.id}" ${open ? '' : 'disabled'}>
      <div class="n">${m.name}</div><div class="s">${sub}</div></button>`;
  }).join('');
  const days = map.days.map(d => {
    const n = d.n;
    const open = n <= st.unlockedDay, done = n < st.unlockedDay;
    const state = !open ? `Clear day ${n - 1} first` : done ? 'Cleared' : 'Play';
    const name = d.intro.title.includes(':') ? d.intro.title.split(':')[1].trim() : '';
    return `<button type="button" class="day ${open ? '' : 'locked'} ${done ? 'done' : ''}" data-day="${n}" ${open ? '' : 'disabled'}>
      <div class="lbl">DAY</div><div class="dn">${String(n).padStart(2, '0')}</div><div class="nm">${name}</div><div class="s">${state}</div></button>`;
  }).join('');
  const allDone = st.unlockedDay > map.days.length;
  const p = plate(root, 'menu', `
    <div class="logo">HORDE</div>
    <div class="maps">${maps}</div>
    <div class="days ${map.days.length > 3 ? 'five' : ''}">${days}</div>
    ${allDone && map.outro ? `<p class="lead strong">${map.outro.text}</p>` : ''}
    <div class="acts"><button type="button" class="act" data-a="research"><span class="a">Research</span><span class="p">You have ${progress.intel}</span></button></div>
    <div class="v">v${version}</div>`);
  for (const b of p.el.querySelectorAll('.day:not(.locked)')) b.addEventListener('click', () => onDay(Number(b.dataset.day)));
  // Banbytet bygger en ny scen, vilket kan ta en stund: kortet markeras direkt ("Loading") och
  // bytet görs först efter nästa målning, så att klicket syns (speltestet 0.5.1 trodde att
  // första klicket gick förlorat). Fler klick under tiden gör ingenting.
  let switching = false;
  for (const b of p.el.querySelectorAll('.maptab:not(.locked)')) b.addEventListener('click', () => {
    if (switching || b.dataset.map === map.id) return;
    switching = true;
    for (const t of p.el.querySelectorAll('.maptab')) t.classList.toggle('on', t === b);
    b.classList.add('loading');
    const sub = b.querySelector('.s'); if (sub) sub.textContent = 'Loading';
    setTimeout(() => onMap?.(b.dataset.map), 40);
  });
  on(p.el, '[data-a="research"]', onResearch);
  return p;
}

// Liten notis som försvinner av sig själv.
export function note(root, text, cls = '') {
  const el = document.createElement('div');
  el.className = 'note plate ' + cls;
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
