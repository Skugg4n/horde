# Huvudlösa kontroller (för agenter)

Gäller alla som kör spelet i Chromium utan fönster: layout, placement, slice1, laddtid och speltest-skript (H547).

- Starta webbläsaren med `launch()` ur `scripts/headless.mjs`, aldrig `chromium.launch` direkt. Den ger låg
  prioritet (macOS bakgrundsläge + nice 19, ärvs av GPU- och renderarprocesserna), riktig GPU (Metal via ANGLE),
  `--mute-audio`, `?mute` på varje adress, deviceScaleFactor 1 och gles ritning (`?fps=2`).
- Kör en kontroll i taget: `npm run check:all` (tester, layout, placement, slice1 i följd mot en egen server från
  port 8281). Aldrig flera kontroller parallellt, aldrig port 8143 (Olas spel).
- Egen server: välj port från 8281 och uppåt, och döda server och webbläsare efteråt.
- Skärmbilder i 1024 eller 1440 px bredd; 1920 bara när kontrollen gäller just den storleken (layoutprovet).
- Spelet: `?fps=N` (med ?test/?debug) ritar 3D-scenen högst N gånger per sekund; simuleringen, HUD:en och
  kameran räknas varje bildruta. `__horde.setFps(n)` byter (0 = varje bildruta), `__horde.renderNow()` ritar en
  färsk bild (launch() gör det före varje `page.screenshot`).
- Reserv: `HORDE_GPU=0` (SwiftShader som förr), `HORDE_FPS=0` (rita varje bildruta), `HORDE_PRIO=normal`.
- Ett eget skript: `import { launch } from './headless.mjs'; const browser = await launch();`
