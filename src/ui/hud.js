// HUD: dag, våg, kvar, pengar, basen, knappen som startar vågen och raden under vågen
// (kvar och Snabbare). Plus det som visas när något händer: basen tar skada, horden kommer,
// vad vågen består av.
import { money } from './format.js';
import { ZOMBIES } from '../data/zombies.js';
import { earlyBonus, hasNextWave, waveLeft } from '../sim/sim.js';

// Plural för vågens innehåll: "10 walkers, 6 runners, 1 brute".
const PLURAL = { walker: ['walker', 'walkers'], runner: ['runner', 'runners'], brute: ['brute', 'brutes'] };
// 0.14.1 (speltestet av 0.14.0: "Wave 2: 13 walkers" medan räknaren sa "22 left"): de vilande i husen
// (dayCfg.dormant) hör till vågen de slås upp i, både i raden och i räknaren, så att siffrorna stämmer.
export function waveGroups(dayCfg, index) {
  const wave = dayCfg.waves[index];
  if (!wave) return [];
  return [...wave.groups.map(g => ({ type: g.type, count: g.count })),
    ...(dayCfg.dormant ?? []).filter(d => (d.wave ?? 0) === index).map(d => ({ type: d.type ?? 'walker', count: d.count }))];
}
export const waveSize = (dayCfg, index) => waveGroups(dayCfg, index).reduce((a, g) => a + g.count, 0);
export function waveText(dayCfg, index) {
  const wave = dayCfg.waves[index];
  if (!wave) return '';
  const counts = new Map();
  for (const g of waveGroups(dayCfg, index)) counts.set(g.type, (counts.get(g.type) || 0) + g.count);
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
  const size = k => waveSize(sim.dayCfg, k);
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
    <div class="cash-box"><div class="k">SUPPLIES</div><div class="v" data-k="cash">$ 0</div><div class="delta" data-k="delta"></div></div>
    <div><div class="k">BASE</div><div class="v hp" data-k="hp">0</div></div>
  </div>
  <div id="hint" class="plate" hidden><button type="button" class="fold" data-k="fold" aria-label="Fold the steps" title="Fold the steps">–</button><ol></ol></div>
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

  // 0.16.0 (inlärningen, designen avsnitt 4): HUD:ens delar syns när de är upplåsta. supplies: mätaren,
  // speed: fartknappen, early: Next wave med bonus (före det går nedräkningen av sig själv).
  let feat = { supplies: true, speed: true, early: true };
  const features = f => { feat = { ...feat, ...f }; };
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
    set(el.left, sim.phase === 'lost' ? '' : sim.phase === 'build' ? `${c.total} coming` : `${c.left} of ${c.total} left`);
    el.bar.style.width = (c.total ? (c.left / c.total) * 100 : 0) + '%';

    const cash = Math.round(sim.cash);
    if (cash !== last.cash) { set(el.cash, money(cash)); last.cash = cash; }
    const cashBox = resPlate.querySelector('.cash-box');
    if (cashBox.hidden === feat.supplies) cashBox.hidden = !feat.supplies;

    const hp = Math.max(0, sim.baseHp);
    if (hp !== last.hp) { set(el.hp, String(hp)); last.hp = hp; }
    el.hp.classList.toggle('low', hp <= sim.map.baseHp / 4);

    const build = sim.phase === 'build', wave = sim.phase === 'wave';
    goBtn.hidden = !build;
    waveBar.hidden = !wave;
    set(wLeft, String(c.left));
    // Nedräkning till nästa våg: "Next wave (Space) 4s · +$ 20". Före våg 1: "Start wave".
    const counting = build && sim.nextWaveIn != null;
    // 0.16.0: före Next wave med bonus (South dag 3) är nedräkningen bara en nedräkning, ingen knapp
    const passive = counting && !feat.early;
    set(el.go, counting ? (passive ? 'Next wave in' : 'Next wave') : 'Start wave');
    el.cd.hidden = !counting;
    el.key.hidden = passive;
    speedBtn2.hidden = !(build || wave) || !feat.speed;
    goBtn.classList.toggle('counting', counting);
    goBtn.classList.toggle('auto', passive);
    if (counting) set(el.cd, passive ? `${Math.max(0, Math.ceil(sim.nextWaveIn - 1e-6))}s` : `${Math.max(0, Math.ceil(sim.nextWaveIn - 1e-6))}s · +${money(earlyBonus(sim))}`);
    // Mitt i en våg går nästa att kalla tidigt så länge det finns en, men bara uttryckligen:
    // klick på knappen eller Shift+Space. Knappen säger hur många som är kvar och är dämpad.
    const canCall = wave && hasNextWave(sim) && feat.early;
    el.next.hidden = !canCall;
    if (canCall) {
      const n = waveLeft(sim), still = n > 0;
      // Överlapp (Gnesta Norr): nästa våg kommer av sig själv medan den här fortfarande är på väg.
      const secs = sim.nextWaveIn != null ? Math.max(0, Math.ceil(sim.nextWaveIn - 1e-6)) : null;
      // kort form när raden inte ryms (layoutBottom): antalet står redan i dagens plåt
      // 0.16.0 (textgenomgången, speltestet av 0.14.2: "NEXT WAVE: STILL 14 LEFT" lät konstigt)
      nextText = { long: secs != null ? `Next wave in ${secs}s` : still ? `Next wave · ${n} still out` : 'Next wave',
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

  // Etiketter där horden kommer in. at: en lista (en per ingång) av
  //   { cands: [{ x, y, angle }], fallback: { x, y, angle }, lines: ['30 walkers'], sub, next }
  // eller { x, y, angle, text } (E4: en pil vid skärmkanten), eller null.
  // 0.11.0 (H091, speltestet av 0.10.2: etiketten klistrades mot skärmkanten och hamnade på hustak):
  // kandidaterna är punkter på gatan längs hordens väg, från ingången och inåt. Etiketten ställs med
  // mitten på den första där hela rutan ryms i bild, inte täcker gränssnittet och inte en annan
  // etikett. Bara om ingen ryms används reserven vid kanten (vägen syns inte alls).
  const entryEl = root.querySelector('#entry');
  const entries = [entryEl];
  const UI_SEL = ['#day', '#res', '#buildbar', '#go', '#wavebar', '#speedcd', '#banner', '#hint', '#menubtn', '#routekey', '.panel', '#minimap:not(.off)', '#evac:not([hidden])'];
  const PADE = 8;
  function uiRects() {
    const out = [];
    for (const sel of UI_SEL) for (const n of root.querySelectorAll(sel)) {
      if (n.hidden) continue;
      const r = n.getBoundingClientRect();
      if (r.width) out.push({ x0: r.left - PADE, y0: r.top - PADE, x1: r.right + PADE, y1: r.bottom + PADE });
    }
    return out;
  }
  const hits = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  function setText(el, at) {
    const t = el.querySelector('.txt');
    const html = at.lines ? `<span class="what">${at.lines.join(' · ')}</span>${at.sub ? `<span class="sub">${at.sub}</span>` : ''}` : (at.text ?? 'Horde incoming');
    if (t.dataset.k !== html) { t.dataset.k = html; if (at.lines) t.innerHTML = html; else t.textContent = html; }
  }
  function placeAt(el, p, w, h) {
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    el.querySelector('.chev').style.transform = `rotate(${p.angle}rad)`;
    return { x0: p.x - w / 2, y0: p.y - h / 2, x1: p.x + w / 2, y1: p.y + h / 2 };
  }
  // 0.12.1 (speltestet av 0.12.0: etiketten lade sig över uppdragsrutan och över en Ksp 90): enheterna
  // (units, punkter på skärmen) undviks i första hand; hamnar etiketten ändå över en tonas den ned.
  // Reserven vid kanten undviker också gränssnittet, inte bara de andra etiketterna.
  const UNIT_PAD = 16;
  const coversUnit = (r, units) => units.some(u => u.x > r.x0 - UNIT_PAD && u.x < r.x1 + UNIT_PAD && u.y > r.y0 - UNIT_PAD && u.y < r.y1 + UNIT_PAD);
  // 0.16.0 (textgenomgången, speltestet av 0.14.2: "etiketten följer markören och täcker mark jag vill
  // placera på"): etiketten står kvar på sin plats vid infarten så länge platsen är fri, och gatunamnet syns
  // bara när pekaren står på etiketten.
  const stuck = new Map();
  const NEAR_ENTRY = 10;
  // 0.16.1 (H191): covers(rect) säger om rutan ligger över mark där enheter får stå; sådana platser tas bara om
  // inget annat finns. Medan spelaren håller en enhet (holding) tonas etiketterna ned och släpper igenom klick.
  function place(el, at, taken, ui, units = [], covers = null) {
    el.hidden = false;
    setText(el, at);
    el.classList.toggle('next', !!at.next);
    const w = el.offsetWidth, h = el.offsetHeight;
    const rectAt = c => ({ x0: c.x - w / 2, y0: c.y - h / 2, x1: c.x + w / 2, y1: c.y + h / 2 });
    const free = r => !(r.x0 < 12 || r.y0 < 12 || r.x1 > innerWidth - 12 || r.y1 > innerHeight - 12) && !ui.some(u => hits(r, u)) && !taken.some(u => hits(r, u));
    const key = at.sub ?? '', keep = stuck.get(key);
    if (keep && (at.cands ?? []).some(c => Math.hypot(c.x - keep.x, c.y - keep.y) < 6) && free(rectAt(keep)) && !keep.ground) {
      el.classList.remove('edge');
      return placeAt(el, keep, w, h);
    }
    // pass 0 bara nära infarten (de första kandidaterna): hellre över mark vid kanten än långt inne vid basen
    for (const pass of [0, 1, 2]) for (const [ci, c] of (at.cands ?? []).entries()) {
      if (!pass && ci >= NEAR_ENTRY) break;
      const r = rectAt(c);
      if (!free(r)) continue;
      const over = coversUnit(r, units);
      if (over && pass < 2) continue;
      if (!pass && covers?.(r)) continue;
      el.classList.remove('edge');
      el.classList.toggle('over', over);
      stuck.set(key, { ...c, ground: pass > 0 });
      return placeAt(el, c, w, h);
    }
    // Reserven: vid skärmkanten, inom gränssnittets ram (som före 0.11.0).
    el.classList.add('edge');
    const f = at.fallback ?? at, hw = w / 2 + 12, hh = h / 2 + 12;
    const p = { x: Math.min(innerWidth - hw, Math.max(hw, f.x)), y: Math.min(innerHeight - hh - 96, Math.max(hh + 130, f.y)), angle: f.angle };
    const blocked = () => { const r = rectAt(p); return taken.some(u => hits(r, u)) || ui.some(u => hits(r, u)); };
    for (let i = 0; i < 24 && blocked() && p.y + h < innerHeight - 96; i++) p.y += h / 2 + 6;
    for (let i = 0; i < 24 && blocked() && p.x + w < innerWidth - 12; i++) p.x += w / 3;
    el.classList.toggle('over', coversUnit(rectAt(p), units));
    return placeAt(el, p, w, h);
  }
  function entry(at, units = [], { covers = null, holding = false } = {}) {
    const list = !at ? [] : Array.isArray(at) ? at : [at];
    while (entries.length < list.length) {
      const el = entryEl.cloneNode(true);
      el.removeAttribute('id'); el.classList.add('entry');
      entryEl.after(el); entries.push(el);
    }
    const ui = list.length ? uiRects() : [], taken = [];
    // nästa grupp först, så att den får den bästa platsen
    const order = list.map((a, i) => i).sort((i, j) => (list[j].next ? 1 : 0) - (list[i].next ? 1 : 0));
    for (const i of order) taken.push(place(entries[i], list[i], taken, ui, units, covers));
    entries.forEach((el, i) => { if (!list[i]) el.hidden = true; el.classList.toggle('holding', holding); });
  }

  // H092 (0.11.0, speltestet av 0.10.2: ingen ledtråd om R): en liten rad nere till höger, ovanför
  // fartknappen, bara på stadsbanorna.
  const routeKeyEl = document.createElement('div');
  routeKeyEl.id = 'routekey'; routeKeyEl.className = 'plate'; routeKeyEl.hidden = true;
  // 0.13.0: V (view routes); R vrider nu en pjäs (Rotate)
  routeKeyEl.innerHTML = '<kbd>V</kbd><span>Horde route</span><b></b>';
  root.appendChild(routeKeyEl);
  function routeKey(show, on) {
    routeKeyEl.hidden = !show;
    if (!show) return;
    const t = on ? 'on' : 'off', b = routeKeyEl.querySelector('b');
    if (b.textContent !== t) { b.textContent = t; routeKeyEl.classList.toggle('off', !on); }
  }

  // Stegen för första dagen (banans egna rader). done: antal klara steg, null döljer rutan.
  const hintEl = root.querySelector('#hint'), hintList = hintEl.querySelector('ol');
  let hintKey = '', folded = false;
  // 0.12.1 (speltestet av 0.12.0: uppdragsrutan täckte prickskyttens kon): rutan går att fälla ihop
  // (–, bara steget som gäller nu), är ihopfälld medan något hålls i handen, och tonas bort när pekaren
  // med något i handen står över den (opts.compact, opts.pointer).
  const foldBtn = hintEl.querySelector('[data-k="fold"]');
  foldBtn.addEventListener('pointerdown', e => e.preventDefault());
  foldBtn.addEventListener('click', () => { folded = !folded; });
  function hint(done, lines = [], { compact = false, pointer = null } = {}) {
    hintEl.hidden = done == null;
    if (done == null) return;
    const small = folded || compact;
    if (hintEl.classList.contains('small') !== small) hintEl.classList.toggle('small', small);
    const fb = folded ? '+' : '–';
    if (foldBtn.textContent !== fb) { foldBtn.textContent = fb; foldBtn.setAttribute('aria-label', folded ? 'Show all steps' : 'Fold the steps'); foldBtn.title = foldBtn.getAttribute('aria-label'); }
    let dodge = false;
    if (compact && pointer) { const r = hintEl.getBoundingClientRect(); dodge = pointer.x > r.left - 24 && pointer.x < r.right + 24 && pointer.y > r.top - 24 && pointer.y < r.bottom + 24; }
    if (hintEl.classList.contains('dodge') !== dodge) hintEl.classList.toggle('dodge', dodge);
    const k = lines.join('|');
    if (k !== hintKey) { hintKey = k; hintList.innerHTML = lines.map((t, i) => `<li data-h="${i}"></li>`).join(''); hintList.querySelectorAll('li').forEach((li, i) => { li.textContent = lines[i]; }); }
    for (const li of hintList.querySelectorAll('li')) {
      const i = Number(li.dataset.h);
      li.classList.toggle('done', i < done);
      li.classList.toggle('now', i === done);
    }
  }

  // Nollställ så att en ny dag inte visar en stor minus-ruta.
  // Första gången en del dyker upp (designen avsnitt 4): en diskret animation (styles.css .reveal).
  function reveal(node) {
    if (!node) return;
    node.classList.remove('reveal'); void node.offsetWidth; node.classList.add('reveal');
    setTimeout(() => node.classList.remove('reveal'), 1600);
  }
  function reset() {
    stuck.clear();
    last = { cash: null, hp: null }; el.delta.className = 'delta';
    clearTimeout(deltaTimer);
    clearFloats();
    banner(null); entry(null);
  }

  return { update, reset, hint, setSpeed, baseHit, banner, entry, routeKey, cashDelta, early, bounty, shift, features, reveal };
}
