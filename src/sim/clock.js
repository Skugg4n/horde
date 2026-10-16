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
export function escapeAction({ menuOpen, mode, placing, panel, selected = false, repeat = false, category = false, justPlaced = false }) {
  if (repeat) return 'none';
  if (menuOpen) return 'menu-back';
  // 0.14.0: förrådet stängs med Esc som forskningen gjorde
  if (mode === 'research' || mode === 'depot') return 'close-research';
  // 0.12.1 (speltestet): på resultatskylten, introt och huvudmenyn gör Esc ingenting (pausmenyn lade
  // sig över resultatet efter en förlust). Bara forskningen stängs med Esc (ovan).
  if (mode !== 'play') return 'none';
  if (category && mode === 'play') return 'close-category';
  if (placing) return 'cancel-placing';
  if (panel || selected) return 'close-panel';
  if (justPlaced && mode === 'play') return 'none';
  return 'open-menu';
}
