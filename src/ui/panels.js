// Paneler för en position (vapen) och en ruta på vägen (hinder).
// Panelen byggs om när det som står på platsen ändras, och uppdaterar priser och
// gråa knappar varje bildruta. actions kommer från main.js och returnerar simuleringens svar.
import { WEAPONS } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { weaponStats, weaponUnlocked, obstacleUnlocked, upgradeCost, MAX_LEVEL, weaponRefund, obstacleRefund, obstacleWhole } from '../sim/stats.js';
import { RESEARCH } from '../data/research.js';
import { MAPS } from '../data/maps.js';
import { canBuyResearch } from '../meta/progress.js';
import { ICONS } from './icons.js';
import { money } from './format.js';

const BETWEEN = 'Mellan vågorna';

const REASONS = {
  'pengar': 'Pengarna räcker inte.',
  'låst': 'Positionen är låst.',
  'ej upplåst': 'Det är inte framforskat än.',
  'fel läge': 'Det går bara mellan vågorna.',
  'max': 'Det här är högsta nivån.',
  'tom': 'Här står inget vapen.',
  'okänd': 'Det gick inte.',
};
// kind: 'slot' eller 'cell', så att texten säger Positionen eller Rutan.
export function reasonText(r, kind = 'slot') {
  if (r === 'upptagen') return kind === 'cell' ? 'Rutan är redan upptagen.' : 'Positionen är redan upptagen.';
  return REASONS[r] || REASONS['okänd'];
}

function statLine(st) {
  return `<div class="st"><span>Skada <b>${Math.round(st.damage)}</b></span><span>Räckvidd <b>${Math.round(st.range)} m</b></span></div>`;
}
function card(id, icon, name, desc, extra) {
  return `<button type="button" class="card" data-id="${id}">${icon || ''}<div class="n">${name}</div><div class="d">${desc}</div>${extra || ''}<div class="p" data-price></div></button>`;
}

// Gemensamt skal: plåt, rubrik, innehåll, meddelanderad.
function shell(root, actions) {
  const el = document.createElement('div');
  el.className = 'panel plate';
  el.innerHTML = `<button type="button" class="x" aria-label="Stäng">×</button><div class="head"></div><div class="body"></div><div class="msg"></div>`;
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

// Sätter pris/grått på ett kort: pris, "Behöver $X" eller "Mellan vågorna".
function patchCard(btn, cost, sim) {
  const p = btn.querySelector('[data-price]');
  const wave = sim.phase !== 'build';
  const poor = sim.cash < cost;
  const text = wave ? BETWEEN : poor ? 'Behöver ' + money(cost) : money(cost);
  if (p.textContent !== text) p.textContent = text;
  btn.classList.toggle('off', wave || poor);
}

export function slotPanel(root, slotId, sim, actions) {
  const ui = shell(root, actions);
  let key = null, cur = sim;
  const slotOf = s => s.slots.find(x => x.id === slotId);
  const keyOf = (s, slot) => slot.locked ? 'locked' : slot.weapon ? `w:${slot.weapon.type}:${slot.weapon.level}` : 'free:' + [...s.research].join(',');
  const showRange = (slot, r) => actions.range({ x: slot.x, z: slot.z, r });

  function render(s, slot) {
    if (slot.locked) {
      ui.head.innerHTML = '';
      ui.body.innerHTML = `<p class="info">Låst. Forska fram fler positioner.</p>`;
      actions.range(null);
      return;
    }
    if (!slot.weapon) {
      ui.head.innerHTML = `<div class="t">Ledig position</div>`;
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
    ui.head.innerHTML = `<div class="t">${def.name}</div><div class="sub">Nivå ${w.level} av ${MAX_LEVEL}</div>`;
    ui.body.innerHTML = `${statLine(weaponStats(w.type, w.level, s.research))}
      <div class="acts">
        <button type="button" class="act" data-a="up"><span class="a">Uppgradera</span><span class="p" data-p></span></button>
        <button type="button" class="act" data-a="sell"><span class="a">Sälj</span><span class="p" data-p></span></button>
      </div>`;
    const up = ui.body.querySelector('[data-a="up"]'), sell = ui.body.querySelector('[data-a="sell"]');
    up.addEventListener('click', () => {
      const r = actions.upgrade(slotId);
      if (!r.ok) ui.say(reasonText(r.reason));
    });
    sell.addEventListener('click', () => {
      const r = actions.sell(slotId);
      if (!r.ok) ui.say(reasonText(cur.phase !== 'build' ? 'fel läge' : 'tom'));
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
    const w = slot.weapon, wave = s.phase !== 'build';
    const up = ui.body.querySelector('[data-a="up"]'), sell = ui.body.querySelector('[data-a="sell"]');
    const cost = upgradeCost(w.type, w.level);
    const upText = cost == null ? 'Högsta nivån' : wave ? BETWEEN : s.cash < cost ? 'Behöver ' + money(cost) : money(cost);
    const upP = up.querySelector('[data-p]');
    if (upP.textContent !== upText) upP.textContent = upText;
    up.classList.toggle('off', cost == null || wave || s.cash < cost);
    up.classList.toggle('max', cost == null);
    const sellText = wave ? BETWEEN : '+' + money(weaponRefund(w));
    const sellP = sell.querySelector('[data-p]');
    if (sellP.textContent !== sellText) sellP.textContent = sellText;
    sell.classList.toggle('off', wave);
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
      ui.head.innerHTML = `<div class="t">Ruta på vägen</div>`;
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
    ui.body.innerHTML = `<div class="acts"><button type="button" class="act" data-a="rm"><span class="a">Ta bort</span><span class="p" data-p></span></button></div>`;
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
    const condText = `Skick ${Math.max(0, Math.round(f * 100))} %`;
    if (cond.textContent !== condText) cond.textContent = condText;
    const wave = s.phase !== 'build';
    const rm = ui.body.querySelector('[data-a="rm"]');
    const t = wave ? BETWEEN : whole ? '+' + money(obstacleRefund(ob)) : 'Ingen återbetalning';
    const p = rm.querySelector('[data-p]');
    if (p.textContent !== t) p.textContent = t;
    rm.classList.toggle('off', wave);
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

export function dayIntro(root, dayCfg, onGo) {
  const p = plate(root, 'intro', `
    <div class="h">${dayCfg.intro.title}</div>
    <p class="lead">${dayCfg.intro.text}</p>
    <button type="button" class="act main" data-a="go"><span class="a">Till försvaret</span><kbd>Enter</kbd></button>`);
  on(p.el, '[data-a="go"]', onGo);
  return p;
}

// lastDay: sista dagen på banan; då leder vinsten till menyn.
export function dayResultPanel(root, { won, intelEarned, totalIntel, day, kills, wavesCleared, waves, lastDay }, { onRetry, onNext, onResearch, onMenu }) {
  const head = won ? `Dag ${day} klarad.` : 'Basen föll.';
  const lead = won ? `Du fick ${intelEarned} forskning.` : `Du behåller ${intelEarned} forskning.`;
  const done = won && lastDay ? `<p class="lead strong">Riksvägen klarad. Fler banor kommer.</p>` : '';
  const main = won
    ? (lastDay ? `<button type="button" class="act main" data-a="menu"><span class="a">Till menyn</span></button>`
               : `<button type="button" class="act main" data-a="next"><span class="a">Nästa dag</span></button>`)
    : `<button type="button" class="act main" data-a="retry"><span class="a">Försök igen</span></button>`;
  const p = plate(root, 'result' + (won ? ' won' : ' lost'), `
    <div class="h">${head}</div>
    <p class="lead">${lead}</p>
    ${done}
    <div class="facts">
      <div><span>Döda zombier</span><b>${kills}</b></div>
      <div><span>Vågor klarade</span><b>${wavesCleared} av ${waves}</b></div>
      <div><span>Forskning totalt</span><b>${totalIntel}</b></div>
    </div>
    <div class="acts">${main}<button type="button" class="act" data-a="research"><span class="a">Forskning</span></button></div>
    ${won && lastDay ? '' : `<button type="button" class="link" data-a="menu">Till menyn</button>`}`);
  on(p.el, '[data-a="retry"]', onRetry);
  on(p.el, '[data-a="next"]', onNext);
  on(p.el, '[data-a="research"]', onResearch);
  for (const b of p.el.querySelectorAll('[data-a="menu"]')) b.addEventListener('click', onMenu);
  return p;
}

// Djup i trädet: 0 för rötter, 1 för det som kräver en rot osv.
function depthOf(item) {
  if (!item.requires.length) return 0;
  return 1 + Math.max(...item.requires.map(id => depthOf(RESEARCH.find(r => r.id === id))));
}
// Rader: varje rot med det som bygger på den till höger.
function researchRows() {
  const roots = RESEARCH.filter(r => depthOf(r) === 0);
  const rows = roots.map(r => [r]);
  for (const item of RESEARCH.filter(r => depthOf(r) > 0)) {
    const row = rows.find(rw => rw.some(x => item.requires.includes(x.id)));
    if (row) row.push(item); else rows.push([item]);
  }
  // Grenar först så att träden syns överst.
  return rows.sort((a, b) => b.length - a.length);
}
function researchState(progress, item) {
  if (progress.research.includes(item.id)) return { cls: 'bought', text: 'Köpt' };
  const c = canBuyResearch(progress, item.id);
  if (c.ok) return { cls: 'buy', text: `Köp (${item.cost})` };
  if (c.reason === 'kräver') {
    const need = item.requires.filter(id => !progress.research.includes(id)).map(id => RESEARCH.find(r => r.id === id).name);
    return { cls: 'locked', text: 'Kräver: ' + need.join(', ') };
  }
  return { cls: 'poor', text: `Behöver ${item.cost - progress.intel} till` };
}

// onBuy(id) returnerar det nya framsteget. update(progress) ritar om.
export function researchPanel(root, progress, onBuy, onClose) {
  const p = plate(root, 'research', `
    <div class="h">Forskning</div>
    <p class="lead" data-have></p>
    <div class="tree" data-tree></div>
    <div class="acts"><button type="button" class="act main" data-a="close"><span class="a">Klar</span><kbd>Esc</kbd></button></div>`);
  const tree = p.el.querySelector('[data-tree]'), have = p.el.querySelector('[data-have]');
  function render(pr) {
    have.textContent = `Du har ${pr.intel} forskning.`;
    tree.innerHTML = researchRows().map(row => `<div class="row">${row.map((item, i) => {
      const st = researchState(pr, item);
      return `${i ? '<i class="arrow">→</i>' : ''}<button type="button" class="node ${st.cls}" data-id="${item.id}">
        <div class="n">${item.name}</div><div class="d">${item.desc}</div><div class="s">${st.text}</div></button>`;
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
    const state = !open ? `Klara dag ${n - 1} först` : done ? 'Klarad' : 'Spela';
    const name = d.intro.title.includes(':') ? d.intro.title.split(':')[1].trim() : '';
    return `<button type="button" class="day ${open ? '' : 'locked'} ${done ? 'done' : ''}" data-day="${n}" ${open ? '' : 'disabled'}>
      <div class="lbl">DAG</div><div class="dn">${String(n).padStart(2, '0')}</div><div class="nm">${name}</div><div class="s">${state}</div></button>`;
  }).join('');
  const allDone = progress.unlockedDay > map.days.length;
  const p = plate(root, 'menu', `
    <div class="logo">HORDE</div>
    <div class="map">${map.name}</div>
    <div class="days">${days}</div>
    ${allDone ? '<p class="lead strong">Riksvägen klarad. Fler banor kommer.</p>' : ''}
    <div class="acts"><button type="button" class="act" data-a="research"><span class="a">Forskning</span><span class="p">Du har ${progress.intel}</span></button></div>
    <div class="v">v${version}</div>`);
  for (const b of p.el.querySelectorAll('.day:not(.locked)')) b.addEventListener('click', () => onDay(Number(b.dataset.day)));
  on(p.el, '[data-a="research"]', onResearch);
  return p;
}

// Liten notis som försvinner av sig själv.
export function note(root, text) {
  const el = document.createElement('div');
  el.className = 'note plate';
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
