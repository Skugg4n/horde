// Tågklockan (0.17.0-molnbo): "Hold until the train leaves." 0.20.0: också hållklockan (Mölnbo dag 3, dayCfg.hold). En plåt uppe i mitten
// (samma plats som evakueringens ruta) med nedräkningen till avgången och en stapel. Klockan går från första
// vågens start (src/sim/sim.js runTrain).
const fmt = s => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
// Utseendet som evakueringens ruta (styles.css #evac), här så att styles.css inte behöver röras.
const CSS = `#train { position: fixed; top: 150px; left: 18px; width: 230px; box-sizing: border-box; padding: 8px 14px 9px; text-align: left; pointer-events: none; }
#train[hidden] { display: none; }
#train .t { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--paper-dim); }
#train .n { font-size: 15px; letter-spacing: 0.05em; margin-top: 3px; }
#train .n b { font: 600 20px 'IBM Plex Mono', monospace; color: #8fc0e8; }
#train .evbar { position: relative; height: 6px; margin: 6px 0 0; width: 100%; background: rgba(233,223,201,0.12); border-radius: 1px; }
#train .evbar .safe { position: absolute; left: 0; top: 0; bottom: 0; background: #8fc0e8; }`;
export function mountTrain(root) {
  if (!document.getElementById('train-css')) { const st = document.createElement('style'); st.id = 'train-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div');
  el.id = 'train'; el.className = 'plate'; el.hidden = true;
  el.innerHTML = '<div class="t"></div><div class="n"></div><div class="evbar"><i class="safe"></i></div>';
  root.appendChild(el);
  let key = '';
  return {
    el,
    update(sim, mode) {
      const tr = mode === 'play' ? sim?.train : null;
      el.hidden = !tr;
      if (!tr) return;
      const k = `${Math.ceil(tr.left)}|${tr.gone}|${sim.wavesStarted > 0}`;
      if (k === key) return;
      key = k;
      el.querySelector('.t').textContent = sim.dayCfg.objective ?? 'Hold until the train leaves.';
      // 0.20.0 (Mölnbo dag 3): hållklockan, sedan uttåget mot Gnesta
      el.querySelector('.n').innerHTML = tr.hold ? (tr.gone ? '<b>Pulling out.</b>'
        : sim.wavesStarted === 0 ? `Hold <b>${fmt(tr.at)}</b> from the first wave` : `Pull out in <b>${fmt(tr.left)}</b>`)
        : tr.gone ? '<b>The train is away.</b>'
          : sim.wavesStarted === 0 ? `${tr.last ? 'Last train' : 'Train'} leaves <b>${fmt(tr.at)}</b> after the first wave`
            : `${tr.last ? 'Last train' : 'Train'} leaves in <b>${fmt(tr.left)}</b>`;
      el.querySelector('.safe').style.width = (100 * (1 - tr.left / tr.at)).toFixed(2) + '%';
    },
    reset() { key = ''; },
  };
}
