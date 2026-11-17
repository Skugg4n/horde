// Eftertexterna (0.26.8, NEW-13 i docs/v1-lista.md): tack, Ola som upphovsman, kartdatan (© OpenStreetMap contributors,
// ODbL, med länk till openstreetmap.org/copyright), Three.js (MIT) och typsnitten. Ett pappersblad i bordets stil (som
// ordern på kartbordet), en sida i taget med bläddring i stället för rullning. Nås från huvudmenyn och från kampanjens
// slutblad (src/ui/table.js). Pilarna eller knapparna bläddrar, Enter går framåt (på sista sidan tillbaka), Esc tillbaka.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// En sida: rubrik och rader. En rad är text, eller { text, small } (mindre, grå), eller { link, href }.
export const CREDIT_PAGES = [
  { head: 'HORDE', lines: [{ text: 'A game by Ola Belin.' }, { text: 'Idea, story, design and direction.', small: true }, { text: 'Made with Claude.' }, { text: 'Operation Södermanland.', small: true }] },
  { head: 'MAP DATA', lines: [{ text: 'Map data © OpenStreetMap contributors.' }, { text: 'Available under the Open Database License (ODbL).', small: true }, { link: 'openstreetmap.org/copyright', href: 'https://www.openstreetmap.org/copyright' }, { text: 'The roads and houses of Laxne, Björnlunda, Gnesta and Västerkärv come from it.', small: true }] },
  { head: 'SOFTWARE', lines: [{ text: 'Three.js © three.js authors.' }, { text: 'MIT License.', small: true }, { text: 'Oswald, Saira Stencil One and IBM Plex Mono.' }, { text: 'SIL Open Font License.', small: true }] },
  { head: 'THANKS', lines: [{ text: 'To the people who map Södermanland.' }, { text: 'And to you, for holding Gnesta.' }] },
];

export function creditsSheet(root, { onBack, pages = CREDIT_PAGES } = {}) {
  const el = document.createElement('div');
  el.className = 'sheet credits';
  root.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  let page = 0;
  const line = l => (l.link ? `<p class="cr-l"><a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.link)}</a></p>` : `<p class="cr-l${l.small ? ' small' : ''}">${esc(l.text)}</p>`);
  function render() {
    const p = pages[page], last = page === pages.length - 1;
    el.innerHTML = `<div class="hd"><span>CREDITS</span><span>${page + 1} / ${pages.length}</span></div>
      <div class="cr-page" data-page="${page}"><div class="cr-h">${esc(p.head)}</div>${p.lines.map(line).join('')}</div>
      <div class="cr-nav">
        <button type="button" class="cr-btn" data-a="prev"${page ? '' : ' disabled'}>‹ Back a page</button>
        <button type="button" class="cr-btn${last ? '' : ' main'}" data-a="next"${last ? ' disabled' : ''}>Next page ›</button>
      </div>
      <button type="button" class="cr-btn back${last ? ' main' : ''}" data-a="back">Close<kbd>Esc</kbd></button>`;
    el.querySelector('[data-a="prev"]').addEventListener('click', prev);
    el.querySelector('[data-a="next"]').addEventListener('click', next);
    el.querySelector('[data-a="back"]').addEventListener('click', () => onBack?.());
  }
  function next() { if (page < pages.length - 1) { page++; render(); } }
  function prev() { if (page > 0) { page--; render(); } }
  render();
  return {
    el, close: () => el.remove(), next, prev,
    page: () => page, pages: pages.length,
    // Enter: nästa sida, på sista sidan tillbaka
    enter: () => { if (page < pages.length - 1) next(); else onBack?.(); },
    back: () => onBack?.(),
  };
}
