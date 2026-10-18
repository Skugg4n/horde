// Gesterna på kartan. Rent: bara beslut, ingen DOM. main.js och src/render/camera-rig.js frågar härifrån.
//
// 0.17.2 (H300, Olas beslut efter speltestet av 0.17.1: "alternativ 2 + håll-och-dra"):
//   1. Utan något i handen panorerar vänster-, höger- och mittknappen när man drar. Ett klick väljer.
//   2. Med något i handen (ett kort, en flytt, Rotate):
//      - ett vänsterklick ställer ut det, vänt mot hordens väg (riktningen väljs av sig själv),
//      - tryck, håll HOLD_MS och dra siktar; släppet ställer ut det där trycket var, vänt mot pekaren,
//      - höger-dra eller Alt-dra siktar direkt (utan att hålla),
//      - ett högerklick utan dragning lägger tillbaka det man håller,
//      - en vänsterdragning som börjar innan man hållit klart gör ingenting (ingen panorering, inget utställt),
//      - kameran flyttas med mittknappen, WASD och piltangenterna, eller med pekaren mot skärmens kant.
//   3. Sikte kräver att trycket landar på en giltig plats, att saken har en skjutvinkel och att siktet är upplåst.
//      Annars är det ett vanligt klick, och en dragning gör ingenting.
export const DRAG_PX = 8;
export const HOLD_MS = 200;
export const BUTTON = { left: 0, middle: 1, right: 2 };

// Vad ett tryck blir:
//   'pan'   dra panorerar, ett klick utan rörelse är ett klick (utan något i handen; mittknappen alltid)
//   'aim'   dra siktar direkt (höger eller Alt med något i handen, på en giltig plats)
//   'hold'  ett klick ställer ut; håll HOLD_MS och dra för att sikta (vänster med något i handen, giltig plats)
//   'hand'  något i handen men inget sikte här: ett klick ställer ut (eller säger varför), dra gör ingenting
//   'none'  annan knapp
export function pressKind({ button, holding = false, cone = false, aimUnlocked = false, validSpot = false, alt = false }) {
  if (button === BUTTON.middle) return 'pan';
  if (button !== BUTTON.left && button !== BUTTON.right) return 'none';
  if (!holding) return 'pan';
  const canAim = cone && aimUnlocked && validSpot;
  if (button === BUTTON.right) return canAim ? 'aim' : 'hand';
  if (!canAim) return 'hand';
  return alt ? 'aim' : 'hold';
}
// Har trycket rört sig så långt att det är en dragning?
export const isDrag = (dx, dy) => Math.hypot(dx, dy) >= DRAG_PX;
// Blir dragningen ett sikte? heldMs: hur länge knappen hölls innan pekaren rörde sig DRAG_PX.
export function dragAims(kind, heldMs = 0) {
  if (kind === 'aim') return true;
  if (kind === 'hold') return heldMs >= HOLD_MS;
  return false;
}
// Vad släppet gör: 'place-aimed' (ställ ut med vinkeln mot pekaren), 'click' (vanligt klick: ställ ut med
// riktningen mot vägen, eller välj), 'cancel' (lägg tillbaka det man håller) eller 'none'.
// aimed: dragningen blev ett sikte (dragAims).
export function releaseAction({ kind, button, moved, holding = false, aimed = false }) {
  if (moved) return aimed && (kind === 'aim' || kind === 'hold') ? 'place-aimed' : 'none';
  if (button === BUTTON.right) return holding ? 'cancel' : 'none';
  if (button === BUTTON.left && kind !== 'none') return 'click';
  return 'none';
}
// Panorerar kameran när man drar med den här knappen?
export const pans = (button, holding) => button === BUTTON.middle || (!holding && (button === BUTTON.left || button === BUTTON.right));
// Kantpanorering (bara med något i handen): riktningen [-1..1, -1..1] när pekaren är inom EDGE_PX från kanten.
export const EDGE_PX = 14;
export function edgeDir(x, y, w, h, edge = EDGE_PX) {
  const ux = x <= edge ? -1 : x >= w - 1 - edge ? 1 : 0;
  const uy = y <= edge ? -1 : y >= h - 1 - edge ? 1 : 0;
  return [ux, uy];
}
