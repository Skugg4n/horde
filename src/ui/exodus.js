// Uttåget (0.20.0, Mölnbo dag 3, H495): när hållklockan gått ut tonar HUD:en och köpraden ut (allt i #ui utom
// skyltarna och raderna), och när flodvågen går ut på bron tonar bilden till svart (src/sim/sim.js runExodus).
// Resultatskylten kommer ovanpå det svarta. reset() tar bort allt (nästa dag, kartan, menyn).
const CSS = `#ui.exodus > :not(.sheet):not(.dim):not(#notes):not(#exodus-black) { opacity: 0 !important; pointer-events: none !important; transition: opacity 1.4s ease; }
#exodus-black { position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none; transition: opacity 3s ease-in; }
#exodus-black.on { opacity: 1; }
#exodus-black[hidden] { display: none; }`;
export function mountExodus(root) {
  if (!document.getElementById('exodus-css')) { const st = document.createElement('style'); st.id = 'exodus-css'; st.textContent = CSS; document.head.appendChild(st); }
  const black = document.createElement('div');
  black.id = 'exodus-black'; black.hidden = true;
  root.prepend(black);
  return {
    get active() { return root.classList.contains('exodus'); },
    start() { root.classList.add('exodus'); black.hidden = false; },
    fade(secs = 3) { black.style.transitionDuration = `${secs}s`; black.hidden = false; requestAnimationFrame(() => black.classList.add('on')); },
    reset() { root.classList.remove('exodus'); black.classList.remove('on'); black.hidden = true; },
  };
}
