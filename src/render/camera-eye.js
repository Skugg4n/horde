// Spelkamerans geometri utan three.js (testbar i node): riktningen, avståndet och klipplanen.
//
// 0.17.2 (H309, Olas speltest av 0.17.1: "hus längst ner på skärmen blir genomskinliga vid scroll"): orsaken var
// kamerans närplan. Den ortografiska kameran stod 73 m från blickpunkten (OFFSET), men längst ut i zoomen (Mölnbo
// ryms hela kartan, upp till 187 m höjd i bild, Gnesta Norr 211 m) ligger skärmens nederkant närmare kameran än
// så: marken där hamnade BAKOM kameran, och närplanet skar upp husen så att man såg in i dem. Avståndet spelar
// ingen roll för bilden i en ortografisk kamera, så kameran står nu EYE_BACK gånger längre bort längs samma
// riktning, och diset (THREE.Fog räknar på djupet från kameran) flyttas lika långt (FOG_SHIFT).
export const OFFSET = [40, 46, 40];
export const DIST = Math.hypot(...OFFSET);
export const EYE_BACK = 5;
export const EYE = OFFSET.map(v => v * EYE_BACK);
// 0.23.1 (speltestet av 0.23.0, Björnlunda: "from the west" kom uppifrån höger): en bana kan vrida kameran runt den
// lodräta axeln (map.camera.yaw, grader; 45 = som alla banor förut, kameran i sydost). 0 = kameran i söder: norr upp,
// väster till vänster. OFFSET och EYE ändras på plats; det som räknas ur dem (riggen, scenen, de civilas kryss, vyn)
// läser dem när banans värld byggs. Bara en bana i taget har värld i bild, och main.js sätter vinkeln före bygget och
// när en byggd bana visas igen.
const H_DIST = Math.hypot(40, 40);
export let YAW = 45;
const RX = [Math.SQRT1_2, -Math.SQRT1_2], DX = [Math.SQRT1_2, Math.SQRT1_2];
export function setCameraYaw(deg = 45) {
  YAW = deg;
  // 45 grader exakt som förut (inga avrundningsfel på de andra banorna)
  const r = deg * Math.PI / 180, s = deg === 45 ? Math.SQRT1_2 : Math.sin(r), c = deg === 45 ? Math.SQRT1_2 : Math.cos(r);
  OFFSET[0] = deg === 45 ? 40 : H_DIST * s; OFFSET[2] = deg === 45 ? 40 : H_DIST * c;
  for (let i = 0; i < 3; i++) EYE[i] = OFFSET[i] * EYE_BACK;
  RX[0] = c; RX[1] = -s; DX[0] = s; DX[1] = c;
}
// Skärmens högerriktning och nedåtriktning på marken (x, z) för vinkeln just nu
export const screenAxes = () => ({ right: [RX[0], 0, RX[1]], down: [DX[0], 0, DX[1]] });
export const FOG_SHIFT = DIST * (EYE_BACK - 1);
export const NEAR = 0.1;
export const FAR = 2000;
const TAN = OFFSET[1] / Math.hypot(OFFSET[0], OFFSET[2]);
const SIN = Math.sin(Math.atan(TAN));
// Djupet (avståndet längs kamerans blick) till närmaste och längsta punkt i bild vid zoomen view (vyns höjd i meter
// på skärmen), för saker upp till height meter höga. Porträtt (aspect < 1) visar 1,5 gånger mer, som camera-rig.js.
export function depthRange(view, aspect, height = 0, back = EYE_BACK) {
  const v = aspect < 1 ? view * 1.5 : view;
  const half = v / 2 / TAN;      // markens djup från mitten till skärmens kant (upp och ner)
  const d = DIST * back;
  return { near: d - half - height * SIN, far: d + half };
}

// Zoomen (vyns höjd i meter) som får med hela rektangeln c ({ x0, x1, z0, z1 }) vid bildformatet a.
export function crispView(c, a, pad = 4) {
  let need = 0;
  const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
  for (const [x, z] of [[c.x0, c.z0], [c.x1, c.z0], [c.x1, c.z1], [c.x0, c.z1]]) {
    const dx = x - cx, dz = z - cz;
    const sx = Math.abs(dx * RX[0] + dz * RX[1]) + pad, sy = Math.abs((dx * DX[0] + dz * DX[1]) * SIN) + pad;
    need = Math.max(need, (2 * sx) / a, 2 * sy);
  }
  return Math.ceil(need);
}
// Största zoomen på banan (camera-rig.js): map.camera.zoom, och längst ut ryms hela den skarpa ytan i 16:10 (H117).
export function maxView(map) {
  const cam = map.camera, z0 = cam.zoom?.[1] ?? cam.view;
  return map.surroundings?.crisp ? Math.max(z0, crispView(map.surroundings.crisp, 1440 / 900)) : z0;
}
