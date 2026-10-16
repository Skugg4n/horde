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
export function escapeAction({ menuOpen, mode, placing, panel, selected = false, repeat = false }) {
  if (repeat) return 'none';
  if (menuOpen) return 'menu-back';
  if (mode === 'research') return 'close-research';
  if (placing) return 'cancel-placing';
  if (panel || selected) return 'close-panel';
  if (mode === 'menu') return 'none';
  return 'open-menu';
}
