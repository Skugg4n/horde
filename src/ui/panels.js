// Paneler för en position (vapen) och en ruta på vägen (hinder).
// Panelen byggs om när det som står på platsen ändras, och uppdaterar priser och
// gråa knappar varje bildruta. actions kommer från main.js och returnerar simuleringens svar.
import { WEAPONS, GRENADE_KIT } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { weaponStats, weaponUnlocked, obstacleUnlocked, upgradeCost, MAX_LEVEL, weaponRefund, obstacleRefund, obstacleWhole, grenadeStats, tierOf } from '../sim/stats.js';
import { RESEARCH, ROMAN, researchNode } from '../data/research.js';
import { MAPS } from '../data/maps.js';
import { canBuyResearch, nextTier, hasTier } from '../meta/progress.js';
import { ICONS } from './icons.js';
import { money } from './format.js';

const REASONS = {
  'pengar': 'Not enough cash.',
  'låst': 'Position locked.',
  'ej upplåst': 'Not researched yet.',
  'fel läge': 'The day is over.',
  'max': 'Already at max level.',
  'tom': 'No gun here.',
  'okänd': 'Can\'t do that.',
  'redan': 'This position already has a kit.',
};
// kind: 'slot' eller 'cell', så att texten säger Positionen eller Rutan.
export function reasonText(r, kind = 'slot') {
  if (r === 'upptagen') return kind === 'cell' ? 'Tile already taken.' : 'Position already taken.';
  return REASONS[r] || REASONS['okänd'];
}

function statLine(st) {
  return `<div class="st"><span>Damage <b>${Math.round(st.damage)}</b></span><span>Range <b>${Math.round(st.range)} m</b></span></div>`;
}
function card(id, icon, name, desc, extra) {
  return `<button type="button" class="card" data-id="${id}">${icon || ''}<div class="n">${name}</div><div class="d">${desc}</div>${extra || ''}<div class="p" data-price></div></button>`;
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

// Sätter pris/grått på ett kort: pris eller "Behöver $X". Uppdateras varje bildruta,
// så priset blir klickbart så fort pengarna räcker, även mitt i en våg.
function patchCard(btn, cost, sim) {
  const p = btn.querySelector('[data-price]');
  const poor = sim.cash < cost;
  const text = poor ? 'Need ' + money(cost) : money(cost);
  if (p.textContent !== text) p.textContent = text;
  btn.classList.toggle('off', poor);
}

export function slotPanel(root, slotId, sim, actions) {
  const ui = shell(root, actions);
  let key = null, cur = sim;
  const slotOf = s => s.slots.find(x => x.id === slotId);
  const keyOf = (s, slot) => slot.locked ? 'locked' : slot.weapon ? `w:${slot.weapon.type}:${slot.weapon.level}:${!!slot.weapon.kit}:${tierOf(s.research, 'grenade')}` : 'free:' + [...s.research].join(',');
  const showRange = (slot, r) => actions.range({ x: slot.x, z: slot.z, r });

  function render(s, slot) {
    if (slot.locked) {
      ui.head.innerHTML = '';
      ui.body.innerHTML = `<p class="info">Locked. Research more positions.</p>`;
      actions.range(null);
      return;
    }
    if (!slot.weapon) {
      ui.head.innerHTML = `<div class="t">Empty position</div>`;
      const types = Object.keys(WEAPONS).filter(t => weaponUnlocked(t, s.research));
      ui.body.innerHTML = `<div class="cards">${types.map(t => card(t, ICONS[t], WEAPONS[t].name, WEAPONS[t].desc, statLine(weaponStats(t, 1, s.research)))).join('')}</div>`;
      for (const b of ui.body.querySelectorAll('.card')) {
        const t = b.dataset.id;
        b.addEventListener('click', () => {
          const r = actions.build(slotId, t);
          if (!r.ok) ui.say(reasonText(r.reason, 'slot'));
        });
        b.addEventListener('mouseenter', () => showRange(slotOf(cur), weaponStats(t, 1, cur.research).range));
        b.addEventListener('mouseleave', () => actions.range(null));
      }
      actions.range(null);
      return;
    }
    const w = slot.weapon, def = WEAPONS[w.type];
    const gs = grenadeStats(s.research);
    ui.head.innerHTML = `<div class="t">${def.name}</div><div class="sub">Level ${w.level} of ${MAX_LEVEL}${w.kit ? ' · Grenade kit' : ''}</div>`;
    // Granatlådan: en rad till när Grenades är forskat. Med låda står det vad den gör i stället.
    const kitRow = !gs ? '' : w.kit
      ? `<p class="info kit">Throws a grenade when ${gs.minCount} or more come close, or a brute.</p>`
      : `<button type="button" class="act" data-a="kit"><span class="a">${GRENADE_KIT.name}</span><span class="p" data-p></span></button>`;
    ui.body.innerHTML = `${statLine(weaponStats(w.type, w.level, s.research))}
      <div class="acts">
        <button type="button" class="act" data-a="up"><span class="a">Upgrade</span><span class="p" data-p></span></button>
        <button type="button" class="act" data-a="sell"><span class="a">Sell</span><span class="p" data-p></span></button>
      </div>${kitRow ? `<div class="acts kitrow">${kitRow}</div>` : ''}`;
    const up = ui.body.querySelector('[data-a="up"]'), sell = ui.body.querySelector('[data-a="sell"]');
    const kit = ui.body.querySelector('[data-a="kit"]');
    if (kit) {
      kit.addEventListener('click', () => {
        const r = actions.kit(slotId);
        if (!r.ok) ui.say(reasonText(r.reason));
      });
      kit.addEventListener('mouseenter', () => { const sl = slotOf(cur); if (sl && gs) showRange(sl, gs.range); });
      kit.addEventListener('mouseleave', () => { const sl = slotOf(cur); if (sl?.weapon) showRange(sl, weaponStats(sl.weapon.type, sl.weapon.level, cur.research).range); });
    }
    up.addEventListener('click', () => {
      const r = actions.upgrade(slotId);
      if (!r.ok) ui.say(reasonText(r.reason));
    });
    sell.addEventListener('click', () => {
      const r = actions.sell(slotId);
      if (!r.ok) ui.say(reasonText(cur.phase === 'won' || cur.phase === 'lost' ? 'fel läge' : 'tom'));
    });
    const own = () => { const sl = slotOf(cur); if (sl?.weapon) showRange(sl, weaponStats(sl.weapon.type, sl.weapon.level, cur.research).range); };
    up.addEventListener('mouseenter', () => {
      const sl = slotOf(cur);
      if (sl?.weapon && sl.weapon.level < MAX_LEVEL) showRange(sl, weaponStats(sl.weapon.type, sl.weapon.level + 1, cur.research).range);
    });
    up.addEventListener('mouseleave', own);
    own();
  }

  function patch(s, slot) {
    if (slot.locked) return;
    if (!slot.weapon) {
      for (const b of ui.body.querySelectorAll('.card')) patchCard(b, WEAPONS[b.dataset.id].cost, s);
      return;
    }
    const w = slot.weapon;
    const up = ui.body.querySelector('[data-a="up"]'), sell = ui.body.querySelector('[data-a="sell"]');
    const cost = upgradeCost(w.type, w.level);
    const upText = cost == null ? 'Max level' : s.cash < cost ? 'Need ' + money(cost) : money(cost);
    const upP = up.querySelector('[data-p]');
    if (upP.textContent !== upText) upP.textContent = upText;
    up.classList.toggle('off', cost == null || s.cash < cost);
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
    const slot = slotOf(s);
    if (!slot) return;
    const k = keyOf(s, slot);
    if (k !== key) { key = k; ui.hush(); render(s, slot); }
    patch(s, slot);
  }
  update(sim);
  return { el: ui.el, update, close: ui.close, say: ui.say };
}

export function cellPanel(root, index, sim, actions) {
  const ui = shell(root, actions);
  let key = null;
  const keyOf = s => { const ob = s.obstacles[index]; return ob ? 'ob:' + ob.type : 'empty:' + [...s.research].join(','); };
  const frac = ob => (OBSTACLES[ob.type].kind === 'slow' ? ob.durability / ob.maxDurability : ob.hp / ob.maxHp);

  function render(s) {
    const ob = s.obstacles[index];
    if (!ob) {
      ui.head.innerHTML = `<div class="t">Road tile</div>`;
      const types = Object.keys(OBSTACLES).filter(t => obstacleUnlocked(t, s.research));
      ui.body.innerHTML = `<div class="cards">${types.map(t => card(t, ICONS[t], OBSTACLES[t].name, OBSTACLES[t].desc)).join('')}</div>`;
      for (const b of ui.body.querySelectorAll('.card')) {
        b.addEventListener('click', () => {
          const r = actions.place(index, b.dataset.id);
          if (!r.ok) ui.say(reasonText(r.reason, 'cell'));
        });
      }
      return;
    }
    ui.head.innerHTML = `<div class="t">${OBSTACLES[ob.type].name}</div><div class="sub" data-cond></div>`;
    ui.body.innerHTML = `<div class="acts"><button type="button" class="act" data-a="rm"><span class="a">Remove</span><span class="p" data-p></span></button></div>`;
    ui.body.querySelector('[data-a="rm"]').addEventListener('click', () => {
      const r = actions.remove(index);
      if (!r.ok) ui.say(reasonText('fel läge'));
    });
  }

  function patch(s) {
    const ob = s.obstacles[index];
    if (!ob) { for (const b of ui.body.querySelectorAll('.card')) patchCard(b, OBSTACLES[b.dataset.id].cost, s); return; }
    const f = frac(ob), whole = obstacleWhole(ob);
    const cond = ui.head.querySelector('[data-cond]');
    const condText = `Condition ${Math.max(0, Math.round(f * 100))} %`;
    if (cond.textContent !== condText) cond.textContent = condText;
    const rm = ui.body.querySelector('[data-a="rm"]');
    const t = whole ? '+' + money(obstacleRefund(ob)) : 'No refund';
    const p = rm.querySelector('[data-p]');
    if (p.textContent !== t) p.textContent = t;
  }

  function update(s) {
    const k = keyOf(s);
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
export function dayIntro(root, dayCfg, cash, onGo) {
  const p = plate(root, 'intro', `
    <div class="h">${dayCfg.intro.title}</div>
    <p class="lead">${dayCfg.intro.text}</p>
    <p class="note-line">New day: you start with ${money(cash)} and empty positions. Research carries over.</p>
    <button type="button" class="act main" data-a="go"><span class="a">To the line</span><kbd>Enter</kbd></button>`);
  on(p.el, '[data-a="go"]', onGo);
  return p;
}

// lastDay: sista dagen på banan; då leder vinsten till menyn.
// cashLeft: pengar kvar när dagen tog slut. De följer inte med, så det sägs ut på vinstskylten.
export function dayResultPanel(root, { won, intelEarned, totalIntel, day, kills, wavesCleared, waves, lastDay, cashLeft = 0 }, { onRetry, onNext, onResearch, onMenu }) {
  const head = won ? `Day ${day} cleared.` : 'The base fell.';
  const lead = won ? `You earned ${intelEarned} research points.` : `You keep ${intelEarned} research points.`;
  const done = won && lastDay ? `<p class="lead strong">${MAPS.riksvagen.name} cleared. More maps coming.</p>` : '';
  const main = won
    ? (lastDay ? `<button type="button" class="act main" data-a="menu"><span class="a">To menu</span></button>`
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
    ${won && lastDay ? '' : `<button type="button" class="link" data-a="menu">To menu</button>`}`);
  on(p.el, '[data-a="retry"]', onRetry);
  on(p.el, '[data-a="next"]', onNext);
  on(p.el, '[data-a="research"]', onResearch);
  for (const b of p.el.querySelectorAll('[data-a="menu"]')) b.addEventListener('click', onMenu);
  return p;
}

// Kravets namn: 'm2.1' blir "M2 .50 cal I".
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
function researchState(progress, node) {
  const next = nextTier(progress, node.id);
  if (!next) return { cls: 'bought', text: 'Done', effect: node.tiers[node.tiers.length - 1].effect };
  const c = canBuyResearch(progress, node.id);
  const effect = next.data.effect;
  const label = node.tiers.length > 1 ? `${ROMAN[next.tier]}: ` : '';
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

export function mainMenu(root, progress, { onDay, onResearch, version }) {
  const map = MAPS[progress.mapId];
  const days = map.days.map(d => {
    const n = d.n;
    const open = n <= progress.unlockedDay, done = n < progress.unlockedDay;
    const state = !open ? `Clear day ${n - 1} first` : done ? 'Cleared' : 'Play';
    const name = d.intro.title.includes(':') ? d.intro.title.split(':')[1].trim() : '';
    return `<button type="button" class="day ${open ? '' : 'locked'} ${done ? 'done' : ''}" data-day="${n}" ${open ? '' : 'disabled'}>
      <div class="lbl">DAY</div><div class="dn">${String(n).padStart(2, '0')}</div><div class="nm">${name}</div><div class="s">${state}</div></button>`;
  }).join('');
  const allDone = progress.unlockedDay > map.days.length;
  const p = plate(root, 'menu', `
    <div class="logo">HORDE</div>
    <div class="map">${map.name}</div>
    <div class="days">${days}</div>
    ${allDone ? `<p class="lead strong">${map.name} cleared. More maps coming.</p>` : ''}
    <div class="acts"><button type="button" class="act" data-a="research"><span class="a">Research</span><span class="p">You have ${progress.intel}</span></button></div>
    <div class="v">v${version}</div>`);
  for (const b of p.el.querySelectorAll('.day:not(.locked)')) b.addEventListener('click', () => onDay(Number(b.dataset.day)));
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
