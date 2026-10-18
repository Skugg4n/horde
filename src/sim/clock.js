// Tidsstegningen per bildruta, utan webbläsare: pausen och Esc-prioriteten bor här så att de går att testa.

// Stegar simuleringen så många fasta steg som tiden räcker till. Pausad eller utanför play går
// ingen tid alls: ingen simulering, ingen nedräkning, inga spawn-timers (de ligger i sim.time).
// st = { acc }. Returnerar antal steg.
export function advance(st, frameDt, { playing, paused, mul = 1, dt, maxPerSpeed = 5 }, stepFn) {
  if (!playing) { st.acc = 0; return 0; }
  if (paused) return 0;
  st.acc += frameDt * mul;
  const maxSteps = maxPerSpeed * mul;
  let steps = 0;
  while (st.acc >= dt && steps < maxSteps) { stepFn(); st.acc -= dt; steps++; }
  if (steps === maxSteps) st.acc = Math.min(st.acc, dt);
  return steps;
}

// Vad Esc gör, i prioritetsordning: menyn (eller dess fråga) stängs först, sedan forskningsskylten,
// placeringen, en öppen panel eller en markering, och först därefter öppnas menyn. På huvudmenyn
// finns ingen meny. Ett tryck gör exakt en sak (0.10.1): en markering utan panel räknas som en panel,
// och en upprepning medan tangenten hålls nere gör ingenting (repeat).
// 0.11.0: en öppen kategori i köpradens tvåstegsval (category) stängs före placeringen, och ett
// Esc strax efter ett köp (justPlaced, H095: saken släpptes när den ställdes ut och tangenten var
// tänkt för den) öppnar inte menyn.
// 0.17.1 (speltestet av 0.17.0: "ibland lägger Esc tillbaka kortet, ibland öppnar den pausmenyn"): EN ordning i
// spelet. 1 det man håller (kortet, flytten, Rotate) läggs tillbaka, också när en kategori är utfälld eller en
// lektionsrad står, 2 en utfälld kategori, en panel eller en markering stängs, 3 lektionsraden hoppas över
// (lesson), 4 strax efter ett köp ingenting (justPlaced), 5 pausmenyn öppnas.
export function escapeAction({ menuOpen, mode, placing, panel, selected = false, repeat = false, category = false, justPlaced = false, lesson = false }) {
  if (repeat) return 'none';
  if (menuOpen) return 'menu-back';
  // 0.14.0: förrådet stängs med Esc som forskningen gjorde
  if (mode === 'research' || mode === 'depot') return 'close-research';
  // 0.12.1 (speltestet): på resultatskylten, introt och huvudmenyn gör Esc ingenting (pausmenyn lade
  // sig över resultatet efter en förlust). Bara forskningen stängs med Esc (ovan).
  if (mode !== 'play') return 'none';
  if (placing) return 'cancel-placing';
  if (category) return 'close-category';
  if (panel || selected) return 'close-panel';
  if (lesson) return 'skip-lesson';
  if (justPlaced) return 'none';
  return 'open-menu';
}
