// HUD: dag, våg, kvar, pengar, basen, knappen som startar vågen och raden under vågen
// (kvar och Snabbare). Plus det som visas när något händer: basen tar skada, horden kommer,
// vad vågen består av.
import { money } from './format.js';
import { ZOMBIES } from '../data/zombies.js';
import { earlyBonus, hasNextWave, waveLeft } from '../sim/sim.js';

// Plural för vågens innehåll: "10 walkers, 6 runners, 1 brute".
const PLURAL = { walker: ['walker', 'walkers'], runner: ['runner', 'runners'], brute: ['brute', 'brutes'] };
export function waveText(dayCfg, index) {
  const wave = dayCfg.waves[index];
  if (!wave) return '';
  const counts = new Map();
  for (const g of wave.groups) counts.set(g.type, (counts.get(g.type) || 0) + g.count);
  const parts = [...counts].map(([t, n]) => {
    const w = PLURAL[t] || [ZOMBIES[t]?.name.toLowerCase() ?? t, ZOMBIES[t]?.name.toLowerCase() ?? t];
    return `${n} ${n === 1 ? w[0] : w[1]}`;
  });
  return `Wave ${index + 1}: ${parts.join(', ')}`;
}

// Under en våg: den senast startade vågen, och kvar/totalt för alla vågor som är igång
// (flera när nästa kallats tidigt). Annars: nästa våg som startar.
export function waveCounts(sim) {
  const waves = sim.dayCfg.waves;
  const size = k => waves[k].groups.reduce((a, g) => a + g.count, 0);
  const running = sim.phase === 'wave' || sim.phase === 'lost';
  const i = Math.min(running ? sim.wavesStarted - 1 : sim.waveIndex, waves.length - 1);
  let total = size(i), left = total;
  if (running) {
    total = 0;
    for (let k = 0; k < sim.wavesStarted; k++) if (!sim.cleared[k]) total += size(k);
    left = sim.spawnQueue.length + sim.zombies.filter(z => !z.dead).length;
  } else if (sim.phase === 'won') left = 0;
  return { wave: i + 1, of: waves.length, total, left };
}

export function mountHud(root, { onStart, onSpeed, onNext } = {}) {
  root.insertAdjacentHTML('beforeend', `
  <div id="day" class="plate">
    <div class="lbl">DAY</div>
    <div class="big" data-k="day">01</div>
    <div class="row"><span data-k="wave">Wave 1 of 3</span><span data-k="left">0 left</span></div>
    <div class="bar"><i data-k="bar"></i></div>
  </div>
  <div id="res" class="plate">
    <div class="cash-box"><div class="k">CASH</div><div class="v" data-k="cash">$ 0</div><div class="delta" data-k="delta"></div></div>
    <div><div class="k">BASE</div><div class="v hp" data-k="hp">0</div></div>
  </div>
  <div id="hint" class="plate" hidden><ol></ol></div>
  <button id="go" class="plate" type="button"><span data-k="go">Start wave</span><kbd data-k="key">Space</kbd><span class="cd" data-k="cd" hidden></span></button>
  <div id="wavebar" class="plate" hidden><span class="left"><b data-k="wleft">0</b> left</span><button type="button" class="next" data-k="next"><span data-k="nextlbl">Next wave</span><kbd data-k="nextkey">Space</kbd><span class="cd" data-k="nextcd"></span></button></div>
  <button type="button" id="speedcd" class="plate speed" hidden>Speed <b data-k="speedx2">1x</b><kbd>F</kbd></button>
  <div id="banner" class="plate" hidden></div>
  <div id="entry" class="entry" hidden><div class="chev"><i></i><i></i><i></i></div><div class="txt">Horde incoming</div></div>`);
  // Röd puls i skärmkanten när basen tar skada. Ligger under gränssnittet.
  const hurt = document.createElement('div');
  hurt.className = 'hurt';
  root.prepend(hurt);
  const $ = k => root.querySelector(`[data-k="${k}"]`);
  const el = { day: $('day'), wave: $('wave'), left: $('left'), bar: $('bar'), cash: $('cash'), delta: $('delta'), hp: $('hp'), go: $('go'), key: $('key'), cd: $('cd'), next: $('next'), nextCd: $('nextcd'), nextLbl: $('nextlbl'), nextKey: $('nextkey') };
  const goBtn = root.querySelector('#go');
  goBtn.addEventListener('click', () => onStart && onStart());
  // 0.10.2 (speltestet av 0.10.1: SPEED dolde sig bakom "Next wave: still 36 left" medan F fungerade):
  // en enda fartknapp nere till höger, synlig under hela dagen (bygg, nedräkning och våg).
  const waveBar = root.querySelector('#wavebar'), wLeft = $('wleft'), speedBtn2 = root.querySelector('#speedcd');
  speedBtn2.addEventListener('pointerdown', e => e.preventDefault());   // ta inte fokus från mellanslag
  speedBtn2.addEventListener('click', () => onSpeed && onSpeed());
  el.next.addEventListener('pointerdown', e => e.preventDefault());
  el.next.addEventListener('click', () => onNext && onNext());
  // Bonusen för att stapla visas bara när den gäller: Shift hålls ner eller pekaren står på knappen.
  let shiftDown = false, nextHover = false;
  el.next.addEventListener('pointerenter', () => { nextHover = true; });
  el.next.addEventListener('pointerleave', () => { nextHover = false; });
  const shift = on => { shiftDown = !!on; };
  const resPlate = root.querySelector('#res');

  let last = { cash: null, hp: null };
  let deltaTimer = 0;
  const set = (node, text) => { if (node.textContent !== text) node.textContent = text; };

  // Ändring av pengarna från en handling (köp, uppgradering, sälj, ta bort). Visar exakt
  // den handlingens belopp; nästa handling ersätter siffran i stället för att lägga ihop.
  function cashDelta(d) {
    if (!d) return;
    el.delta.textContent = (d > 0 ? '+' : '−') + money(Math.abs(d));
    el.delta.className = 'delta show ' + (d > 0 ? 'up' : 'down');
    clearTimeout(deltaTimer);
    deltaTimer = setTimeout(() => { el.delta.className = 'delta'; }, 1400);
  }

  // Pengar från dödade zombier: liten "+$ N" som stiger där zombien föll. Flera döda nära
  // varandra inom en kort stund slås ihop till en siffra, så att horden inte blir en textvägg.
  const floats = [];
  const FLOAT_LIFE = 900, FLOAT_MERGE = 250, FLOAT_NEAR = 70, FLOAT_MAX = 14;
  function bounty(x, y, amount) {
    if (!amount) return;
    const now = performance.now();
    for (let i = floats.length - 1; i >= 0; i--) if (now - floats[i].t0 > FLOAT_LIFE) floats.splice(i, 1);
    const near = floats.find(f => now - f.t0 < FLOAT_MERGE && Math.hypot(f.x - x, f.y - y) < FLOAT_NEAR);
    if (near) { near.sum += amount; near.node.textContent = '+' + money(near.sum); return; }
    if (floats.length >= FLOAT_MAX) return;
    const node = document.createElement('div');
    node.className = 'bounty';
    node.textContent = '+' + money(amount);
    node.style.left = x + 'px'; node.style.top = y + 'px';
    root.appendChild(node);
    floats.push({ node, x, y, t0: now, sum: amount });
    setTimeout(() => node.remove(), FLOAT_LIFE);
  }
  function clearFloats() { for (const f of floats) f.node.remove(); floats.length = 0; }

  function update(sim) {
    const c = waveCounts(sim);
    set(el.day, String(sim.day).padStart(2, '0'));
    set(el.wave, `Wave ${c.wave} of ${c.of}`);
    // Efter en förlust säger räknaren inget säkert (en del gick in i basen), så den döljs.
    set(el.left, sim.phase === 'lost' ? '' : `${c.left} left`);
    el.bar.style.width = (c.total ? (c.left / c.total) * 100 : 0) + '%';

    const cash = Math.round(sim.cash);
    if (cash !== last.cash) { set(el.cash, money(cash)); last.cash = cash; }

    const hp = Math.max(0, sim.baseHp);
    if (hp !== last.hp) { set(el.hp, String(hp)); last.hp = hp; }
    el.hp.classList.toggle('low', hp <= sim.map.baseHp / 4);

    const build = sim.phase === 'build', wave = sim.phase === 'wave';
    goBtn.hidden = !build;
    waveBar.hidden = !wave;
    set(wLeft, String(c.left));
    // Nedräkning till nästa våg: "Next wave (Space) 4s · +$ 20". Före våg 1: "Start wave".
    const counting = build && sim.nextWaveIn != null;
    set(el.go, counting ? 'Next wave' : 'Start wave');
    el.cd.hidden = !counting;
    speedBtn2.hidden = !(build || wave);
    goBtn.classList.toggle('counting', counting);
    if (counting) set(el.cd, `${Math.max(0, Math.ceil(sim.nextWaveIn - 1e-6))}s · +${money(earlyBonus(sim))}`);
    // Mitt i en våg går nästa att kalla tidigt så länge det finns en, men bara uttryckligen:
    // klick på knappen eller Shift+Space. Knappen säger hur många som är kvar och är dämpad.
    const canCall = wave && hasNextWave(sim);
    el.next.hidden = !canCall;
    if (canCall) {
      const n = waveLeft(sim), still = n > 0;
      // Överlapp (Gnesta Norr): nästa våg kommer av sig själv medan den här fortfarande är på väg.
      const secs = sim.nextWaveIn != null ? Math.max(0, Math.ceil(sim.nextWaveIn - 1e-6)) : null;
      // kort form när raden inte ryms (layoutBottom): antalet står redan i dagens plåt
      nextText = { long: secs != null ? `Next wave in ${secs}s` : still ? `Next wave: still ${n} left` : 'Next wave',
        short: secs != null ? `Next in ${secs}s` : 'Next wave' };
      set(el.nextLbl, waveBar.classList.contains('narrow') ? nextText.short : nextText.long);
      set(el.nextKey, still ? 'Shift+Space' : 'Space');
      el.next.classList.toggle('still', still);
      const showBonus = !still || shiftDown || nextHover;
      el.nextCd.hidden = !showBonus;
      if (showBonus) set(el.nextCd, '+' + money(earlyBonus(sim)) + ' early');
    }
    layoutBottom();
  }

  // Knappen och vågens rad nere i mitten (0.10.2): mitt i fönstret om de ryms där, annars mellan
  // köpraden (--bar-r) och fartknappen. Ryms vågens rad inte ens då döljs dess "N left" (dagens
  // plåt uppe till vänster säger samma sak), så att ingenting hamnar utanför fönstret.
  let layoutKey = '', nextText = { long: '', short: '' };
  function layoutBottom() {
    const barR = parseFloat(document.documentElement.style.getPropertyValue('--bar-r')) || 0;
    const sp = speedBtn2.hidden ? 0 : speedBtn2.offsetWidth;
    const k = [innerWidth, barR, sp, goBtn.hidden, waveBar.hidden, el.go.textContent, el.cd.textContent, nextText.long, el.nextCd.hidden, el.next.hidden].join('|');
    if (k === layoutKey) return;
    layoutKey = k;
    const lo = barR ? barR + 14 : 14, hi = innerWidth - (sp ? sp + 32 : 14);
    for (const node of [goBtn, waveBar]) {
      if (node.hidden) continue;
      node.classList.remove('narrow');
      if (node === waveBar) set(el.nextLbl, nextText.long);
      let w = node.offsetWidth;
      if (w > hi - lo) { node.classList.add('narrow'); if (node === waveBar) set(el.nextLbl, nextText.short); w = node.offsetWidth; }
      const c = Math.min(Math.max(innerWidth / 2, lo + w / 2), hi - w / 2);
      node.style.left = Math.round(Math.max(lo + w / 2, c)) + 'px';
    }
  }
  addEventListener('resize', () => { layoutKey = ''; });

  // Bonus för tidigt kall: "+$ 20 early" under kassan.
  function early(amount) {
    if (!amount) return;
    el.delta.textContent = '+' + money(amount) + ' early';
    el.delta.className = 'delta show up';
    clearTimeout(deltaTimer);
    deltaTimer = setTimeout(() => { el.delta.className = 'delta'; }, 2200);
  }

  // Fart 1x, 2x eller 3x. Lyser rost när den är över 1x.
  const speedX2 = $('speedx2');
  function setSpeed(x) {
    set(speedX2, x + 'x');
    speedBtn2.classList.toggle('on', x > 1);
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

  // Pil vid skärmkanten där horden kommer in. at: { x, y, angle, text? } i px och radianer, en
  // lista av sådana (en per ingång), eller null.
  const entryEl = root.querySelector('#entry');
  const entries = [entryEl];
  function place(el, at) {
    el.hidden = false;
    const txt = at.text ?? 'Horde incoming';
    const t = el.querySelector('.txt');
    if (t.textContent !== txt) t.textContent = txt;
    // Hela pilen och texten ska rymmas i bild, med 12 px marginal, och inte under plåtarna uppe
    // eller köpraden och knapparna nere (0.10.2).
    const w = el.offsetWidth / 2 + 12, h = el.offsetHeight / 2 + 12;
    el.style.left = Math.min(innerWidth - w, Math.max(w, at.x)) + 'px';
    el.style.top = Math.min(innerHeight - h - 96, Math.max(h + 130, at.y)) + 'px';
    el.querySelector('.chev').style.transform = `rotate(${at.angle}rad)`;
    el.classList.toggle('next', !!at.next);
  }
  function entry(at) {
    const list = !at ? [] : Array.isArray(at) ? at : [at];
    while (entries.length < list.length) {
      const el = entryEl.cloneNode(true);
      el.removeAttribute('id'); el.classList.add('entry');
      entryEl.after(el); entries.push(el);
    }
    entries.forEach((el, i) => { if (list[i]) place(el, list[i]); else el.hidden = true; });
  }

  // Stegen för första dagen (banans egna rader). done: antal klara steg, null döljer rutan.
  const hintEl = root.querySelector('#hint'), hintList = hintEl.querySelector('ol');
  let hintKey = '';
  function hint(done, lines = []) {
    hintEl.hidden = done == null;
    if (done == null) return;
    const k = lines.join('|');
    if (k !== hintKey) { hintKey = k; hintList.innerHTML = lines.map((t, i) => `<li data-h="${i}"></li>`).join(''); hintList.querySelectorAll('li').forEach((li, i) => { li.textContent = lines[i]; }); }
    for (const li of hintList.querySelectorAll('li')) {
      const i = Number(li.dataset.h);
      li.classList.toggle('done', i < done);
      li.classList.toggle('now', i === done);
    }
  }

  // Nollställ så att en ny dag inte visar en stor minus-ruta.
  function reset() {
    last = { cash: null, hp: null }; el.delta.className = 'delta';
    clearTimeout(deltaTimer);
    clearFloats();
    banner(null); entry(null);
  }

  return { update, reset, hint, setSpeed, baseHit, banner, entry, cashDelta, early, bounty, shift };
}
