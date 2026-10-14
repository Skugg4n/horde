// HUD: dag, våg, kvar, pengar, basen, knappen som startar vågen och raden under vågen
// (kvar och Snabbare). Plus det som visas när något händer: basen tar skada, horden kommer,
// vad vågen består av.
import { money } from './format.js';
import { ZOMBIES } from '../data/zombies.js';

// Plural för vågens innehåll: "10 vandrare, 6 löpare, 1 bjässe".
const PLURAL = { walker: ['vandrare', 'vandrare'], runner: ['löpare', 'löpare'], brute: ['bjässe', 'bjässar'] };
export function waveText(dayCfg, index) {
  const wave = dayCfg.waves[index];
  if (!wave) return '';
  const counts = new Map();
  for (const g of wave.groups) counts.set(g.type, (counts.get(g.type) || 0) + g.count);
  const parts = [...counts].map(([t, n]) => {
    const w = PLURAL[t] || [ZOMBIES[t]?.name.toLowerCase() ?? t, ZOMBIES[t]?.name.toLowerCase() ?? t];
    return `${n} ${n === 1 ? w[0] : w[1]}`;
  });
  return `Våg ${index + 1}: ${parts.join(', ')}`;
}

export function waveCounts(sim) {
  const waves = sim.dayCfg.waves;
  const i = Math.min(sim.waveIndex, waves.length - 1);
  const total = waves[i].groups.reduce((a, g) => a + g.count, 0);
  let left = total;
  if (sim.phase === 'wave' || sim.phase === 'lost') left = sim.spawnQueue.length + sim.zombies.filter(z => !z.dead).length;
  else if (sim.phase === 'won') left = 0;
  return { wave: i + 1, of: waves.length, total, left };
}

export function mountHud(root, { onStart, onSpeed } = {}) {
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
  <button id="go" class="plate" type="button"><span data-k="go">Starta våg</span><kbd data-k="key">Mellanslag</kbd></button>
  <div id="wavebar" class="plate" hidden><span class="left"><b data-k="wleft">0</b> kvar</span><button type="button" class="speed" data-k="speed" aria-pressed="false">Snabbare<kbd>F</kbd></button></div>
  <div id="banner" class="plate" hidden></div>
  <div id="entry" hidden><div class="chev"><i></i><i></i><i></i></div><div class="txt">Horden kommer</div></div>`);
  // Röd puls i skärmkanten när basen tar skada. Ligger under gränssnittet.
  const hurt = document.createElement('div');
  hurt.className = 'hurt';
  root.prepend(hurt);
  const $ = k => root.querySelector(`[data-k="${k}"]`);
  const el = { day: $('day'), wave: $('wave'), left: $('left'), bar: $('bar'), cash: $('cash'), delta: $('delta'), hp: $('hp'), go: $('go'), key: $('key') };
  const goBtn = root.querySelector('#go');
  goBtn.addEventListener('click', () => onStart && onStart());
  const waveBar = root.querySelector('#wavebar'), wLeft = $('wleft'), speedBtn = $('speed');
  speedBtn.addEventListener('pointerdown', e => e.preventDefault());   // ta inte fokus från mellanslag
  speedBtn.addEventListener('click', () => onSpeed && onSpeed());
  const resPlate = root.querySelector('#res');

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
    if (hp !== last.hp) { set(el.hp, String(hp)); last.hp = hp; }
    el.hp.classList.toggle('low', hp <= sim.map.baseHp / 4);

    const build = sim.phase === 'build', wave = sim.phase === 'wave';
    goBtn.hidden = !build;
    waveBar.hidden = !wave;
    set(wLeft, String(c.left));
  }

  function setSpeed(fast) {
    speedBtn.setAttribute('aria-pressed', fast ? 'true' : 'false');
    speedBtn.classList.toggle('on', fast);
  }

  // Basen tar skada: siffran blinkar rött och pulsar, plåten och skärmkanten lyser rött.
  const restart = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };
  function baseHit() {
    restart(el.hp, 'hit');
    restart(resPlate, 'hit');
    restart(hurt, 'pulse');
  }

  // Kort rad mitt upptill, t.ex. vad vågen består av.
  const bannerEl = root.querySelector('#banner');
  let bannerTimer = 0;
  function banner(text, secs = 4) {
    clearTimeout(bannerTimer);
    if (!text) { bannerEl.hidden = true; return; }
    bannerEl.textContent = text;
    bannerEl.hidden = false;
    restart(bannerEl, 'show');
    bannerTimer = setTimeout(() => { bannerEl.hidden = true; }, secs * 1000);
  }

  // Pil vid skärmkanten där vägen kommer in. at: { x, y, angle } i px och radianer, eller null.
  const entryEl = root.querySelector('#entry'), chev = entryEl.querySelector('.chev');
  function entry(at) {
    entryEl.hidden = !at;
    if (!at) return;
    // Hela pilen och texten ska rymmas i bild, med 12 px marginal.
    const w = entryEl.offsetWidth / 2 + 12, h = entryEl.offsetHeight / 2 + 12;
    entryEl.style.left = Math.min(innerWidth - w, Math.max(w, at.x)) + 'px';
    entryEl.style.top = Math.min(innerHeight - h, Math.max(h, at.y)) + 'px';
    chev.style.transform = `rotate(${at.angle}rad)`;
  }

  // Tre steg för första dagen. done: antal klara steg, null döljer rutan.
  const hintEl = root.querySelector('#hint');
  function hint(done) {
    hintEl.hidden = done == null;
    if (done == null) return;
    for (const li of hintEl.querySelectorAll('li')) li.classList.toggle('done', Number(li.dataset.h) < done);
  }

  // Nollställ så att en ny dag inte visar en stor minus-ruta.
  function reset() {
    last = { cash: null, hp: null }; deltaSum = 0; el.delta.className = 'delta';
    clearTimeout(deltaTimer);
    el.cash.classList.remove('up', 'down');
    banner(null); entry(null);
  }

  return { update, reset, hint, setSpeed, baseHit, banner, entry };
}
