// Debugmenyn (0.12.2, Olas önskan). Öppnas med fem snabba klick på versionsnumret, eller med knappen
// DEBUG som syns med ?debug (och efter fem klick). En kompakt plåt med fyra delar: läget, reglarna,
// spawn och bilden. Allt den gör går genom api (main.js); reglarna lagras i 'horde.debug', aldrig i
// sparfilen. Märket "DEBUG TWEAKS ON" står kvar så länge någon regel inte är 1, så att ett ändrat spel
// aldrig tas för riktig balans.
import { tweaksActive, IDENTITY_TWEAKS } from '../sim/sim.js';
import { money } from './format.js';

const CLICKS = 5, CLICK_WINDOW = 1600;   // fem klick inom 1,6 s
const RULES = [
  ['hp', 'Zombie hp ×'], ['speed', 'Zombie speed ×'], ['count', 'Spawn count ×'],
  ['cash', 'Supplies income ×'], ['intel', 'RP income ×'],
];

export function versionClicks(el, onOpen, now = () => performance.now()) {
  let times = [];
  el.addEventListener('click', () => {
    const t = now();
    times = times.filter(x => t - x < CLICK_WINDOW);
    times.push(t);
    if (times.length >= CLICKS) { times = []; onOpen(); }
  });
}

export function mountDebug(root, api) {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'debugbtn'; btn.className = 'plate'; btn.textContent = 'DEBUG';
  btn.hidden = true;
  const badge = document.createElement('div');
  badge.id = 'tweakbadge'; badge.textContent = 'DEBUG TWEAKS ON'; badge.hidden = true;
  const fps = document.createElement('div');
  fps.id = 'debugfps'; fps.className = 'plate'; fps.hidden = true;
  const el = document.createElement('div');
  el.id = 'debug'; el.className = 'plate'; el.hidden = true;
  root.append(btn, badge, fps, el);

  const sel = (name, opts) => `<select data-k="${name}">${opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`;
  function render() {
    const maps = api.maps(), m = api.map();
    const spawns = api.spawns(), houses = api.houses();
    el.innerHTML = `
      <div class="dh"><b>Debug</b><span data-k="where"></span><button type="button" class="x" data-a="close" aria-label="Close">×</button></div>
      <section><h4>State</h4>
        <div class="row"><label>RP</label><input data-k="intel" type="number" step="50"><button data-a="intel-set">Set</button><button data-a="intel-add">Add</button></div>
        <div class="row"><label>Depot</label><button data-a="res-none">None</button><button data-a="res-arrival">Arrival</button><button data-a="res-all">All</button></div>
        <div class="row"><label>Cash</label><input data-k="cash" type="number" step="100"><button data-a="cash-set">Set</button><button data-a="cash-add">Add</button></div>
        <div class="row"><label>Base hp</label><input data-k="hp" type="number" step="1" min="1"><button data-a="hp-set">Set</button><label class="ck"><input type="checkbox" data-k="god"> God mode</label></div>
        <div class="row"><label>Jump to</label>${sel('map', maps.map(x => [x.id, x.name]))}<input data-k="day" type="number" min="1" max="5" value="${api.day()}" title="Day"><input data-k="wave" type="number" min="1" value="1" title="Wave"><button data-a="jump">Go</button></div>
        <div class="row"><button data-a="unlock">Unlock all maps</button><button data-a="reset-save" class="warn">Reset save</button></div>
        <div class="row"><label>Lessons</label><button data-a="tips-reset">Reset tips</button><button data-a="tips-seen">Mark all seen</button></div>
      </section>
      <section><h4>Rules</h4>
        ${RULES.map(([k, t]) => `<div class="row"><label>${t}</label><input data-t="${k}" type="number" step="0.1" min="0.1"></div>`).join('')}
        <div class="row"><label>Countdown s</label><input data-t="countdown" type="number" step="1" min="0" placeholder="15"></div>
        <div class="row"><button data-a="tweaks-reset">Reset tweaks</button></div>
      </section>
      <section><h4>Spawn</h4>
        <div class="row"><input data-k="n" type="number" min="1" max="500" value="10">${sel('type', [['walker', 'Walkers'], ['runner', 'Runners'], ['brute', 'Brutes']])}${spawns.length ? sel('spawn', spawns.map(s => [s.id, s.name])) : ''}<button data-a="spawn">Spawn</button></div>
        <div class="row">${houses.length ? sel('house', houses.map(h => [h.id, h.label])) + '<button data-a="burst">Open house</button>' : '<span class="muted">No houses on this map</span>'}</div>
      </section>
      <section><h4>Visuals</h4>
        <div class="row wrap">
          <label class="ck"><input type="checkbox" data-v="los"> LOS</label>
          <label class="ck"><input type="checkbox" data-v="grid"> Walk grid</label>
          <label class="ck"><input type="checkbox" data-v="routes"> Routes</label>
          <label class="ck"><input type="checkbox" data-v="fps"> FPS</label>
          <label class="ck"><input type="checkbox" data-v="minimap"> Minimap</label>
        </div>
      </section>
      <div class="dmsg"></div>`;
    el.querySelector('[data-k="map"]').value = m.id;
    const t = api.tweaks();
    for (const [k] of RULES) el.querySelector(`[data-t="${k}"]`).value = t[k];
    el.querySelector('[data-t="countdown"]').value = t.countdown ?? '';
    el.querySelector('[data-k="god"]').checked = t.god;
    const v = api.visuals();
    for (const cb of el.querySelectorAll('[data-v]')) cb.checked = !!v[cb.dataset.v];
    fresh = true;
  }
  let fresh = false, msgTimer = 0;
  const num = k => Number(el.querySelector(`[data-k="${k}"]`)?.value);
  const val = k => el.querySelector(`[data-k="${k}"]`)?.value;
  function say(text) {
    const m = el.querySelector('.dmsg');
    m.textContent = text; m.classList.add('show');
    clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('show'), 2400);
  }
  const ok = (r, good) => say(r === false || r?.ok === false ? `Not now${r?.reason ? ` (${r.reason})` : ''}` : good);
  const ACT = {
    close: () => close(),
    'intel-set': () => ok(api.setIntel(num('intel')), 'RP set'),
    'intel-add': () => ok(api.setIntel(api.progress().rp + num('intel')), 'RP added'),
    'res-none': () => ok(api.setResearch('none'), 'Depot: no upgrades'),
    'res-arrival': () => ok(api.setResearch('arrival'), 'Depot: arrival upgrades for ' + api.map().name),
    'res-all': () => ok(api.setResearch('all'), 'Depot: all upgrades'),
    'cash-set': () => ok(api.setCash(num('cash')), 'Cash set'),
    'cash-add': () => ok(api.setCash((api.sim()?.cash ?? 0) + num('cash')), 'Cash added'),
    'hp-set': () => ok(api.setBaseHp(num('hp')), 'Base hp set'),
    jump: () => { api.jump(val('map'), num('day'), num('wave')); close(); },
    unlock: () => ok(api.unlockAll(), 'All maps unlocked'),
    'reset-save': () => {
      if (!confirm('Reset save? A backup is kept under horde.save.backup.')) return;
      ok(api.resetSave(), 'Save reset (backup kept)');
    },
    // 0.16.0: lektionerna (designen avsnitt 3, Debugmenyn)
    'tips-reset': () => ok(api.resetTips?.(), 'Tips reset'),
    'tips-seen': () => ok(api.markAllSeen?.(), 'All lessons marked seen'),
    'tweaks-reset': () => { api.setTweaks({ ...IDENTITY_TWEAKS }); render(); badgeNow(); say('Tweaks reset'); },
    spawn: () => ok(api.spawn(val('type'), num('n'), val('spawn')), 'Spawned'),
    burst: () => ok(api.burst(val('house')), 'House opened'),
  };
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (b && ACT[b.dataset.a]) ACT[b.dataset.a]();
  });
  el.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.t) {
      const tw = { ...api.tweaks() };
      tw[t.dataset.t] = t.dataset.t === 'countdown' ? (t.value === '' ? null : Number(t.value)) : Number(t.value);
      api.setTweaks(tw);
    } else if (t.dataset.k === 'god') api.setTweaks({ ...api.tweaks(), god: t.checked });
    else if (t.dataset.v) api.setVisual(t.dataset.v, t.checked);
    badgeNow();
  });
  const badgeNow = () => { badge.hidden = !tweaksActive(api.tweaks()); };
  // tangenterna i fälten ska inte styra spelet (main.js hoppar över händelser härifrån)
  el.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('click', () => toggle());

  function open() { btn.hidden = false; el.hidden = false; render(); update(); }
  function close() { el.hidden = true; }
  function toggle() { if (el.hidden) open(); else close(); }
  let acc = 0;
  // läget i rubriken, märket och fps; fälten fylls bara när menyn öppnas (så att det man skriver står kvar)
  function update(dt = 1) {
    badgeNow();
    acc += dt;
    if (el.hidden || acc < 0.25) return;
    acc = 0;
    const s = api.sim(), p = api.progress();
    el.querySelector('[data-k="where"]').textContent = s ? `${api.map().name} · day ${api.day()} · ${s.phase} · ${money(Math.round(s.cash))} · hp ${Math.max(0, s.baseHp)} · RP ${p.rp}` : '';
    if (fresh) {
      fresh = false;
      el.querySelector('[data-k="intel"]').value = p.rp;
      el.querySelector('[data-k="cash"]').value = s ? Math.round(s.cash) : 0;
      el.querySelector('[data-k="hp"]').value = s ? Math.max(1, s.baseHp) : 1;
    }
  }
  function showFps(on, text = '') { fps.hidden = !on; if (on) fps.textContent = text; }
  return { open, close, toggle, update, showFps, reveal: () => { btn.hidden = false; }, isOpen: () => !el.hidden, el, render };
}
