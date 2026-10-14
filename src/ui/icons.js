// Streckikoner för korten. Samma stil som mockups/hud.js.
const S = 'fill="none" stroke="#e9dfc9" stroke-linecap="round" stroke-linejoin="round"';
export const ICONS = {
  m249: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.4">
    <path d="M22 28 L34 17 L46 28"/><rect x="28" y="11" width="26" height="8" rx="1"/><path d="M54 14 H96"/>
    <path d="M28 15 L16 19 L16 13 Z"/><rect x="38" y="19" width="9" height="6"/><path d="M90 11 V17"/></g></svg>`,
  m2: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.4">
    <path d="M14 26 L30 14 M30 14 L46 26 M30 14 L30 27"/><rect x="26" y="8" width="30" height="9" rx="1"/>
    <path d="M56 12 H104"/><path d="M98 9 V15"/><rect x="34" y="17" width="10" height="7"/></g></svg>`,
  wire: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2">
    <path d="M14 6 V30 M106 6 V30"/><path d="M14 12 C30 2 40 22 56 12 S82 2 106 12"/><path d="M14 22 C30 12 40 32 56 22 S82 12 106 22"/>
    <path d="M34 9 l4 4 M38 9 l-4 4 M74 15 l4 4 M78 15 l-4 4 M50 24 l4 4 M54 24 l-4 4"/></g></svg>`,
  block: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.2">
    <path d="M22 30 L30 8 H50 L58 30 Z"/><path d="M62 30 L70 8 H90 L98 30 Z"/><path d="M14 30 H106"/>
    <path d="M38 14 L42 20 L39 25"/></g></svg>`,
};
