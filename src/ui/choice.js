// Kampanjens val på bordet (0.24.0, H552): ordern från MCF med två blyertsrutor, ovanpå kartbordet (eller
// operationskartan). Bladets innehåll är src/meta/table.js choiceSheet; valet görs av src/meta/operation.js makeChoice.
// Ett klick på en ruta kryssar den (den andra töms) och visar vad det betyder; SIGN (eller Enter) skriver under.
// Valet går inte att ångra, därför två steg. 0.24.1 (H555): priset står under varje ruta från början, i siffror.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const two = n => String(n).padStart(2, '0');

export function choiceHtml(sh, picked = null) {
  const rows = sh.options.map(o => `<button type="button" class="ch-row${picked === o.id ? ' on' : ''}" data-pick="${o.id}" aria-pressed="${picked === o.id}">
      <span class="ch-box" aria-hidden="true">${picked === o.id ? '✕' : ''}</span><span class="ch-col"><span class="ch-lbl">${esc(o.label)}</span>${o.cost ? `<span class="ch-cost" data-read>${esc(o.cost)}</span>` : ''}</span></button>`).join('');
  const means = sh.options.find(o => o.id === picked)?.means ?? 'Tick one box, then sign.';
  return `<div class="hd"><span>${esc(sh.from.toUpperCase())}</span><span>ORDER ${two(sh.n)}</span></div>
    <div class="meta">TO: ${esc(sh.to)}<br>VALID: ${esc(sh.valid)}</div>
    <div class="txt" data-read>${esc(sh.text)}</div>
    <div class="ch-rows">${rows}</div>
    <div class="ch-means" data-read>${esc(means)}</div>
    <button type="button" class="tb-kbd ch-sign" data-a="sign"${picked ? '' : ' disabled'}>SIGN · ENTER</button>`;
}

// root: bordets element (sheet.el). onPick(optionId) gör valet. Returnerar { el, close }.
export function choiceOverlay(root, sh, { onPick }) {
  const el = document.createElement('div');
  el.className = 'tb-choicewrap';
  el.innerHTML = `<div class="tb-choiceshade"></div><div class="tb-paper tb-order cur tb-choice" data-sheet="${sh.id}"></div>`;
  root.appendChild(el);
  const paper = el.querySelector('.tb-choice');
  let picked = null;
  const render = () => {
    paper.innerHTML = choiceHtml(sh, picked);
    for (const b of paper.querySelectorAll('[data-pick]')) b.addEventListener('click', e => { e.stopPropagation(); picked = b.dataset.pick; render(); });
    paper.querySelector('[data-a="sign"]').addEventListener('click', e => { e.stopPropagation(); sign(); });
  };
  const sign = () => { if (picked) onPick(picked); };
  const onKey = e => {
    if (e.key === 'Enter' && picked) { e.preventDefault(); e.stopPropagation(); sign(); }
    // inget annat på bordet medan valet väntar (Deploy, Requisition)
    else if (e.key === 'Enter' || e.key === ' ' || e.code === 'KeyR') { e.preventDefault(); e.stopPropagation(); }
  };
  addEventListener('keydown', onKey, true);
  el.addEventListener('pointerdown', e => e.stopPropagation());
  render();
  return { el, close: () => { removeEventListener('keydown', onKey, true); el.remove(); } };
}
