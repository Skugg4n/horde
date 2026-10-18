// Gesterna på kartan (0.17.1, speltestet av 0.17.0: "dra för att panorera med ett kort i handen placerade enheten").
// Rent: bara beslut, ingen DOM. main.js och src/render/camera-rig.js frågar härifrån.
//
// Reglerna:
//   1. Höger- och mittknappen panorerar alltid när man drar. Ett högerklick utan dragning lägger tillbaka det man håller.
//   2. Vänsterknappen: ett tryck som rör sig mindre än DRAG_PX är ett klick (ställer ut det man håller, väljer annars).
//   3. Vänster-dra är att sikta bara när trycket landar på en giltig plats för det man håller, saken har en skjutvinkel
//      och siktet är upplåst. Släppet ställer då ut den med vinkeln mot pekaren.
//   4. All annan vänster-dragning panorerar, och släppet ställer aldrig ut något.
export const DRAG_PX = 8;
export const BUTTON = { left: 0, middle: 1, right: 2 };

// Vad ett tryck blir: 'aim' (dra för att sikta), 'pan' (dra panorerar, ett klick utan rörelse är ett klick) eller 'none'.
export function pressKind({ button, holding = false, cone = false, aimUnlocked = false, validSpot = false }) {
  if (button === BUTTON.middle || button === BUTTON.right) return 'pan';
  if (button !== BUTTON.left) return 'none';
  return holding && cone && aimUnlocked && validSpot ? 'aim' : 'pan';
}
// Har trycket rört sig så långt att det är en dragning?
export const isDrag = (dx, dy) => Math.hypot(dx, dy) >= DRAG_PX;
// Vad släppet gör: 'place-aimed' (ställ ut med vinkeln), 'click' (vanligt klick), 'cancel' (lägg tillbaka det man håller)
// eller 'none' (panoreringen är klar, inget annat händer).
export function releaseAction({ kind, button, moved, holding = false }) {
  if (kind === 'aim') return moved ? 'place-aimed' : 'click';
  if (kind !== 'pan' || moved) return 'none';
  if (button === BUTTON.left) return 'click';
  if (button === BUTTON.right && holding) return 'cancel';
  return 'none';
}
