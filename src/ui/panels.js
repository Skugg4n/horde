// Paneler för en position (vapen) och en ruta på vägen (hinder).
// Panelen byggs om när det som står på platsen ändras, och uppdaterar priser och
// gråa knappar varje bildruta. actions kommer från main.js och returnerar simuleringens svar.
import { WEAPONS } from '../data/weapons.js';
import { OBSTACLES } from '../data/obstacles.js';
import { weaponStats, weaponUnlocked, obstacleUnlocked, upgradeCost } from '../sim/stats.js';
import { ICONS } from './icons.js';

const money = n => '$ ' + Math.round(n).toLocaleString('sv-SE');
const MAX_LEVEL = 3;
const BETWEEN = 'Mellan vågorna';

const REASONS = {
  'pengar': 'Pengarna räcker inte.',
  'låst': 'Positionen är låst.',
  'upptagen': 'Platsen är redan upptagen.',
  'ej upplåst': 'Det är inte framforskat än.',
  'fel läge': 'Det går bara mellan vågorna.',
  'max': 'Det här är högsta nivån.',
  'tom': 'Här står inget vapen.',
  'okänd': 'Det gick inte.',
};
export const reasonText = r => REASONS[r] || REASONS['okänd'];

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
      ui.head.innerHTML = `<div class="t">Låst</div>`;
      ui.body.innerHTML = `<p class="info">Forska fram Ny position.</p>`;
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
          if (!r.ok) ui.say(reasonText(r.reason));
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
    const sellText = wave ? BETWEEN : '+' + money(Math.round(w.spent * 0.6));
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
  let key = null, cur = sim;
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
          if (!r.ok) ui.say(reasonText(r.reason));
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
    const f = frac(ob), whole = f >= 1;
    const cond = ui.head.querySelector('[data-cond]');
    const condText = `Skick ${Math.max(0, Math.round(f * 100))} %`;
    if (cond.textContent !== condText) cond.textContent = condText;
    const wave = s.phase !== 'build';
    const rm = ui.body.querySelector('[data-a="rm"]');
    const t = wave ? BETWEEN : whole ? '+' + money(Math.round(OBSTACLES[ob.type].cost * 0.5)) : '';
    const p = rm.querySelector('[data-p]');
    if (p.textContent !== t) p.textContent = t;
    rm.classList.toggle('off', wave);
  }

  function update(s) {
    cur = s;
    const k = keyOf(s);
    if (k !== key) { key = k; ui.hush(); render(s); }
    patch(s);
  }
  update(sim);
  return { el: ui.el, update, close: ui.close, say: ui.say };
}
