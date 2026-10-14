// HUD: dag, våg, kvar, pengar, basen och knappen som startar vågen.
import { money } from './format.js';

export function waveCounts(sim) {
  const waves = sim.dayCfg.waves;
  const i = Math.min(sim.waveIndex, waves.length - 1);
  const total = waves[i].groups.reduce((a, g) => a + g.count, 0);
  let left = total;
  if (sim.phase === 'wave' || sim.phase === 'lost') left = sim.spawnQueue.length + sim.zombies.filter(z => !z.dead).length;
  else if (sim.phase === 'won') left = 0;
  return { wave: i + 1, of: waves.length, total, left };
}

export function mountHud(root, { onStart } = {}) {
  root.insertAdjacentHTML('beforeend', `
  <div id="day" class="plate">
    <div class="lbl">DAG</div>
    <div class="big" data-k="day">01</div>
    <div class="row"><span data-k="wave">Våg 1 av 3</span><span data-k="left">0 kvar</span></div>
    <div class="bar"><i data-k="bar"></i></div>
  </div>
  <div id="res" class="plate">
    <div class="cash-box"><div class="k">PENGAR</div><div class="v" data-k="cash">$ 0</div><div class="delta" data-k="delta"></div></div>
    <div><div class="k">BASEN</div><div class="v hp" data-k="hp">0</div></div>
  </div>
  <div id="hint" class="plate" hidden><ol><li data-h="0">Klicka på en position.</li><li data-h="1">Bygg en M249.</li><li data-h="2">Starta vågen.</li></ol></div>
  <button id="go" class="plate" type="button"><span data-k="go">Starta våg</span><kbd data-k="key">Mellanslag</kbd></button>`);
  const $ = k => root.querySelector(`[data-k="${k}"]`);
  const el = { day: $('day'), wave: $('wave'), left: $('left'), bar: $('bar'), cash: $('cash'), delta: $('delta'), hp: $('hp'), go: $('go'), key: $('key') };
  const goBtn = root.querySelector('#go');
  goBtn.addEventListener('click', () => onStart && onStart());

  let last = { cash: null, hp: null };
  let deltaSum = 0, deltaTimer = 0;
  const set = (node, text) => { if (node.textContent !== text) node.textContent = text; };

  function showDelta(d) {
    deltaSum += d;
    el.delta.textContent = (deltaSum > 0 ? '+' : '−') + money(Math.abs(deltaSum));
    el.delta.className = 'delta show ' + (deltaSum > 0 ? 'up' : 'down');
    el.cash.classList.remove('up', 'down');
    void el.cash.offsetWidth;            // starta om animationen
    el.cash.classList.add(d > 0 ? 'up' : 'down');
    clearTimeout(deltaTimer);
    deltaTimer = setTimeout(() => { el.delta.className = 'delta'; deltaSum = 0; }, 1100);
  }

  function update(sim) {
    const c = waveCounts(sim);
    set(el.day, String(sim.day).padStart(2, '0'));
    set(el.wave, `Våg ${c.wave} av ${c.of}`);
    set(el.left, `${c.left} kvar`);
    el.bar.style.width = (c.total ? (c.left / c.total) * 100 : 0) + '%';

    const cash = Math.round(sim.cash);
    if (last.cash !== null && cash !== last.cash) showDelta(cash - last.cash);
    if (cash !== last.cash) { set(el.cash, money(cash)); last.cash = cash; }

    const hp = Math.max(0, sim.baseHp);
    if (last.hp !== null && hp < last.hp) {
      el.hp.classList.remove('hit'); void el.hp.offsetWidth; el.hp.classList.add('hit');
    }
    if (hp !== last.hp) { set(el.hp, String(hp)); last.hp = hp; }

    const build = sim.phase === 'build', wave = sim.phase === 'wave';
    goBtn.hidden = !(build || wave);
    goBtn.disabled = !build;
    set(el.go, build ? 'Starta våg' : 'Våg pågår');
    el.key.hidden = !build;
  }

  // Tre steg för första dagen. done: antal klara steg, null döljer rutan.
  const hintEl = root.querySelector('#hint');
  function hint(done) {
    hintEl.hidden = done == null;
    if (done == null) return;
    for (const li of hintEl.querySelectorAll('li')) li.classList.toggle('done', Number(li.dataset.h) < done);
  }

  // Nollställ så att en ny dag inte visar en stor minus-ruta.
  function reset() { last = { cash: null, hp: null }; deltaSum = 0; el.delta.className = 'delta'; }

  return { update, reset, hint };
}
