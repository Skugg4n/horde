// Uttåget (0.20.0, Mölnbo dag 3, H495): när hållklockan gått ut tonar HUD:en och köpraden ut (allt i #ui utom
// skyltarna och raderna), och när flodvågen går ut på bron tonar bilden till svart (src/sim/sim.js runExodus).
// Resultatskylten kommer ovanpå det svarta. reset() tar bort allt (nästa dag, kartan, menyn). say(): banderollen över
// hela bredden ("Time. Pull out to Gnesta!").
const CSS = `#ui.exodus > :not(.sheet):not(.dim):not(#notes):not(#exodus-black):not(#exodus-band) { opacity: 0 !important; pointer-events: none !important; transition: opacity 1.4s ease; }
#exodus-black { position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none; transition: opacity 3s ease-in; }
#exodus-black.on { opacity: 1; }
#exodus-black[hidden] { display: none; }
#exodus-band { position: fixed; left: 0; right: 0; top: 34%; padding: 22px 16px; text-align: center; pointer-events: none;
  background: rgba(14, 10, 8, 0.82); border-top: 2px solid #c8402a; border-bottom: 2px solid #c8402a;
  font: 700 clamp(26px, 4.4vw, 54px)/1.1 Oswald, 'Arial Narrow', sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #f3e6c8;
  opacity: 0; transition: opacity 0.6s ease; }
#exodus-band.on { opacity: 1; }
#exodus-band[hidden] { display: none; }`;
export function mountExodus(root) {
  if (!document.getElementById('exodus-css')) { const st = document.createElement('style'); st.id = 'exodus-css'; st.textContent = CSS; document.head.appendChild(st); }
  const black = document.createElement('div');
  black.id = 'exodus-black'; black.hidden = true;
  root.prepend(black);
  // 0.20.1 (speltestet av 0.20.0: "Time. Pull out to Gnesta!" var en liten lapp): en banderoll över hela bredden
  const band = document.createElement('div');
  band.id = 'exodus-band'; band.hidden = true;
  root.appendChild(band);
  let bandT = null;
  return {
    get active() { return root.classList.contains('exodus'); },
    start() { root.classList.add('exodus'); black.hidden = false; },
    fade(secs = 3) { black.style.transitionDuration = `${secs}s`; black.hidden = false; requestAnimationFrame(() => black.classList.add('on')); },
    say(text, secs = 5) {
      band.textContent = text; band.hidden = false;
      requestAnimationFrame(() => band.classList.add('on'));
      clearTimeout(bandT); bandT = setTimeout(() => band.classList.remove('on'), secs * 1000);
    },
    reset() { root.classList.remove('exodus'); black.classList.remove('on'); black.hidden = true; clearTimeout(bandT); band.classList.remove('on'); band.hidden = true; },
  };
}
