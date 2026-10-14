// Gemensamt gränssnitt för båda grafikproven. Bara utseende, ingen riktig ekonomi.
const ICONS = {
  m2: `<svg viewBox="0 0 120 34"><g fill="none" stroke="#e9dfc9" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 26 L30 14 M30 14 L46 26 M30 14 L30 27"/><rect x="26" y="8" width="30" height="9" rx="1"/>
    <path d="M56 12 H104"/><path d="M98 9 V15"/><rect x="34" y="17" width="10" height="7"/></g></svg>`,
  wire: `<svg viewBox="0 0 120 34"><g fill="none" stroke="#e9dfc9" stroke-width="2" stroke-linecap="round">
    <path d="M14 6 V30 M106 6 V30"/><path d="M14 12 C30 2 40 22 56 12 S82 2 106 12"/><path d="M14 22 C30 12 40 32 56 22 S82 12 106 22"/>
    <path d="M34 9 l4 4 M38 9 l-4 4 M74 15 l4 4 M78 15 l-4 4 M50 24 l4 4 M54 24 l-4 4"/></g></svg>`,
  mk19: `<svg viewBox="0 0 120 34"><g fill="none" stroke="#e9dfc9" stroke-width="2.4" stroke-linejoin="round">
    <path d="M18 28 L34 16 L50 28"/><rect x="24" y="7" width="34" height="13" rx="2"/><path d="M58 11 H92 V17 H58"/><circle cx="44" cy="25" r="4"/></g></svg>`,
  slot: `<svg viewBox="0 0 120 34"><g fill="none" stroke="#e9dfc9" stroke-width="2" stroke-dasharray="4 3">
    <ellipse cx="60" cy="18" rx="34" ry="12"/></g><path d="M60 11 V25 M53 18 H67" stroke="#e9dfc9" stroke-width="2.4"/></svg>`,
};

export function mountHud(tagText) {
  const html = `
  <div id="day" class="plate">
    <div class="lbl">DAG</div>
    <div class="big">03</div>
    <div class="row"><span>VÅG <b id="wave">2</b> / 5</span><span id="left">— KVAR</span></div>
    <div class="bar"><i id="wavebar"></i></div>
  </div>
  <div id="res" class="plate">
    <div><div class="k">PENGAR</div><div class="v" id="cash">$ 1 240</div></div>
    <div><div class="k">BASEN</div><div class="v hp" id="hp">100</div></div>
  </div>
  <div id="build" class="plate">
    <div class="card sel">${ICONS.m2}<div class="n">M2 .50 cal</div><div class="d">Tung kulspruta</div><div class="p">$ 600</div></div>
    <div class="card">${ICONS.wire}<div class="n">Taggtråd</div><div class="d">Saktar ner</div><div class="p">$ 120</div></div>
    <div class="card">${ICONS.mk19}<div class="n">Mk 19</div><div class="d">Granatspruta</div><div class="p">$ 1 800</div></div>
    <div class="card lock">${ICONS.slot}<div class="n">Ny position</div><div class="d">Låses upp dag 4</div><div class="p">$ 900</div></div>
  </div>
  <div id="tag" class="plate">${tagText}</div>
  <div class="vignette"></div>
  <div class="grain"></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  for (const c of document.querySelectorAll('.card:not(.lock)')) {
    c.addEventListener('click', () => {
      document.querySelectorAll('.card').forEach(x => x.classList.remove('sel'));
      c.classList.add('sel');
    });
  }
  const cash = document.getElementById('cash');
  const left = document.getElementById('left');
  const bar = document.getElementById('wavebar');
  let money = 1240;
  return {
    kill(n = 1) {
      money += 15 * n;
      cash.textContent = '$ ' + money.toLocaleString('sv-SE');
    },
    progress(killed, total) {
      left.textContent = Math.max(0, total - killed) + ' KVAR';
      bar.style.width = Math.min(100, (killed / total) * 100) + '%';
    },
  };
}
