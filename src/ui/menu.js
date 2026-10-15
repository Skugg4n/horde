// Spelmenyn: knappen uppe i hörnet och skylten med paus. Raderna är en lista av definitioner
// (MENU_ITEMS): en ny rad är en ny post i listan. ctx kommer från main.js.

// type: 'button' | 'choice' | 'volume'
// enabled(ctx): false gråar raden. confirm(ctx): ger { title, text, ok } om raden ska fråga först.
// run(ctx): utförs av button-rader (och efter bekräftelse).
export const MENU_ITEMS = [
  { id: 'resume', type: 'button', label: 'Resume', main: true, kbd: 'Esc', run: c => c.resume() },
  { id: 'speed', type: 'choice', label: 'Game speed', options: [1, 2, 3], format: n => n + 'x', kbd: 'F',
    enabled: c => c.canSpeed(), value: c => c.speed(), set: (c, n) => c.setSpeed(n) },
  { id: 'sound', type: 'volume', label: 'Sound', channel: 'sound' },
  { id: 'music', type: 'volume', label: 'Music', channel: 'music' },
  { id: 'restart', type: 'button', label: 'Restart day',
    enabled: c => c.mode() === 'play',
    confirm: c => ({ title: 'Restart day?', text: `Day ${c.day()} starts over from the beginning. Research is kept.`, ok: 'Restart' }),
    run: c => c.restart() },
  { id: 'main', type: 'button', label: 'Main menu',
    confirm: c => (c.mode() === 'play' ? { title: 'Leave the day?', text: 'Progress on this day will be lost. Research is kept.', ok: 'Main menu' } : null),
    run: c => c.toMain() },
];

const pct = v => Math.round(v * 100);

export function mountMenu(root, ctx, items = MENU_ITEMS) {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'menubtn'; btn.className = 'plate';
  btn.setAttribute('aria-label', 'Menu');
  btn.innerHTML = '<i></i><i></i><i></i>';
  const overlay = document.createElement('div');
  overlay.id = 'pausemenu'; overlay.hidden = true;
  root.append(btn, overlay);
  // Knapparna tar inte fokus (mellanslag ska inte trycka på dem); reglagen behöver sin dragning.
  overlay.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  let open = false, asking = null;

  const get = id => items.find(i => i.id === id);
  const enabled = i => !i.enabled || i.enabled(ctx);

  function render() {
    if (asking) { renderAsk(); return; }
    overlay.innerHTML = `<div class="sheet plate pausesheet"><div class="h">Paused</div><div class="rows"></div></div>`;
    const rows = overlay.querySelector('.rows');
    for (const i of items) {
      const row = document.createElement('div');
      row.className = 'mrow ' + i.type + (enabled(i) ? '' : ' off');
      row.dataset.item = i.id;
      if (i.type === 'button') {
        row.innerHTML = `<button type="button" class="act${i.main ? ' main' : ''}${enabled(i) ? '' : ' off'}"><span class="a">${i.label}</span>${i.kbd ? `<kbd>${i.kbd}</kbd>` : ''}</button>`;
        row.querySelector('button').addEventListener('click', () => { if (enabled(i)) choose(i); });
      } else if (i.type === 'choice') {
        row.innerHTML = `<span class="lab">${i.label}${i.kbd ? `<kbd>${i.kbd}</kbd>` : ''}</span><span class="seg">${i.options.map(o => `<button type="button" data-o="${o}">${i.format(o)}</button>`).join('')}</span>`;
        const mark = () => { for (const b of row.querySelectorAll('[data-o]')) b.classList.toggle('on', Number(b.dataset.o) === i.value(ctx)); };
        for (const b of row.querySelectorAll('[data-o]')) b.addEventListener('click', () => { if (enabled(i)) { i.set(ctx, Number(b.dataset.o)); mark(); } });
        mark();
      } else if (i.type === 'volume') {
        const s = ctx.settings();
        row.innerHTML = `<span class="lab">${i.label}</span>
          <span class="vol"><input type="range" min="0" max="100" step="1" aria-label="${i.label} volume"><b></b><button type="button" class="mute" aria-label="Mute ${i.label}"></button></span>`;
        const input = row.querySelector('input'), out = row.querySelector('b'), mute = row.querySelector('.mute');
        const paint = () => {
          const cur = ctx.settings();
          out.textContent = pct(cur[i.channel]) + '';
          mute.textContent = cur[i.channel + 'Muted'] ? 'Muted' : 'Mute';
          mute.classList.toggle('on', cur[i.channel + 'Muted']);
          row.classList.toggle('muted', cur[i.channel + 'Muted']);
        };
        input.value = pct(s[i.channel]);
        input.addEventListener('input', () => { ctx.setSetting(i.channel, Number(input.value) / 100); paint(); });
        mute.addEventListener('click', () => { ctx.setSetting(i.channel + 'Muted', !ctx.settings()[i.channel + 'Muted']); paint(); });
        paint();
      }
      rows.appendChild(row);
    }
  }
  function renderAsk() {
    overlay.innerHTML = `<div class="sheet plate pausesheet ask"><div class="h">${asking.title}</div><p class="lead">${asking.text}</p>
      <div class="acts"><button type="button" class="act main" data-a="ok"><span class="a">${asking.ok}</span></button><button type="button" class="act" data-a="back"><span class="a">Back</span><kbd>Esc</kbd></button></div></div>`;
    overlay.querySelector('[data-a="ok"]').addEventListener('click', () => { const i = asking.item; asking = null; close(); i.run(ctx); });
    overlay.querySelector('[data-a="back"]').addEventListener('click', () => { asking = null; render(); });
  }
  function choose(i) {
    const q = i.confirm ? i.confirm(ctx) : null;
    if (q) { asking = { ...q, item: i }; render(); return; }
    close();
    i.run(ctx);
  }
  function show() { if (open) return; open = true; asking = null; render(); overlay.hidden = false; ctx.onOpen(); }
  function close() { if (!open) return; open = false; asking = null; overlay.hidden = true; overlay.innerHTML = ''; ctx.onClose(); }
  // Esc: ur en fråga tillbaka till listan, annars stäng menyn.
  function back() { if (asking) { asking = null; render(); } else close(); }

  btn.addEventListener('click', () => (open ? close() : show()));
  return { show, close, back, toggle: () => (open ? close() : show()), isOpen: () => open, button: btn, item: get };
}
