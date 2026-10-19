// Laddningsmätaren (0.20.0, H502, Olas "kartorna känns långsamma att ladda"). Ett vanligt skript, inte en modul:
// det körs direkt, innan modulerna hämtats, och visar skylten "Loading ..." med en mätare som följer det som
// faktiskt händer. Först filerna: varje hämtad .js-fil flyttar mätaren (förväntat antal ur sidans import-karta,
// eller data-modules på skripttaggen), fram till data-share av mätaren. Sedan tar sidan över med
// __loadbar.step(text, andel) för sina egna steg (rutnätet, världen, shaderprogrammen) och __loadbar.done() när
// första bildrutan är ritad. Spelet (src/main.js) använder samma skylt (#loading) för senare banbyten.
(function () {
  var me = document.currentScript, d = (me && me.dataset) || {};
  var el = document.createElement('div');
  el.id = 'loading'; el.className = 'plate';
  el.innerHTML = '<div class="t"></div><div class="bar"><i></i></div><div class="s"></div>';
  var expected = +d.modules || 0;
  if (!expected) { try { expected = Object.keys(JSON.parse(document.querySelector('script[type=importmap]').textContent).imports).length; } catch (e) { expected = 20; } }
  var share = d.share ? +d.share : 0.4, seen = {}, n = 0, own = false;
  function set(frac, text) { el.querySelector('.bar i').style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%'; if (text != null) el.querySelector('.s').textContent = text; }
  el.querySelector('.t').textContent = 'Loading ' + (d.name || '');
  set(0.02, 'Fetching the code');
  (document.getElementById('ui') || document.body).appendChild(el);
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { if (/\.js(\?|$)/.test(e.name) && !/loadbar\.js/.test(e.name) && !seen[e.name]) { seen[e.name] = 1; n++; } });
      if (!own) set(share * Math.min(1, n / expected), 'Fetching the code: ' + Math.min(n, expected) + ' of ' + expected + ' files');
    }).observe({ type: 'resource', buffered: true });
  } catch (e) { /* utan PerformanceObserver står mätaren still tills sidan tar över */ }
  window.__loadbar = {
    el: el, share: share,
    // sidans egna steg: frac 0 till 1 av resten av mätaren
    step: function (text, frac) { own = true; el.hidden = false; set(share + (1 - share) * frac, text); },
    done: function () { own = true; el.hidden = true; },
  };
})();
