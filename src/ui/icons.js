// Streckikoner för korten. Samma stil som mockups/hud.js.
const S = 'fill="none" stroke="#e9dfc9" stroke-linecap="round" stroke-linejoin="round"';
export const ICONS = {
  m249: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.4">
    <path d="M22 28 L34 17 L46 28"/><rect x="28" y="11" width="26" height="8" rx="1"/><path d="M54 14 H96"/>
    <path d="M28 15 L16 19 L16 13 Z"/><rect x="38" y="19" width="9" height="6"/><path d="M90 11 V17"/></g></svg>`,
  m2: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.4">
    <path d="M14 26 L30 14 M30 14 L46 26 M30 14 L30 27"/><rect x="26" y="8" width="30" height="9" rx="1"/>
    <path d="M56 12 H104"/><path d="M98 9 V15"/><rect x="34" y="17" width="10" height="7"/></g></svg>`,
  // Ksp 58: lång pipa med bärhandtag, kolv, tvåben, band som hänger
  ksp58: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.3">
    <path d="M10 18 L30 14 V21 L12 24 Z"/><rect x="30" y="11" width="24" height="9" rx="1"/><path d="M54 15 H106"/>
    <path d="M66 15 V11 H78 V15"/><path d="M84 15 L78 28 M84 15 L90 28"/><path d="M38 20 Q36 27 41 31"/></g></svg>`,
  // Ak 5 med granattillsats: kort gevär, böjt magasin, rör under pipan
  ak5: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.3">
    <path d="M14 14 H34 V22 H16 Z"/><rect x="34" y="11" width="22" height="8" rx="1"/><path d="M56 14 H96"/>
    <rect x="58" y="19" width="22" height="6" rx="2"/><path d="M48 19 Q50 27 46 31"/><path d="M40 8 H48"/></g></svg>`,
  // Psg 90: lång pipa, kikarsikte, tvåben
  psg90: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.2">
    <path d="M8 22 L30 16 V23 L10 27 Z"/><rect x="30" y="15" width="18" height="7" rx="1"/><path d="M48 18 H112"/>
    <rect x="30" y="7" width="22" height="5" rx="2.5"/><path d="M36 12 V15 M46 12 V15"/><path d="M80 18 L74 30 M80 18 L86 30"/></g></svg>`,
  // Hemvärnet: tre hjälmar i rad och ett gevär (Ak 4) under
  hv: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.2">
    <path d="M28 16 a10 9 0 0 1 20 0 Z"/><path d="M50 14 a10 9 0 0 1 20 0 Z"/><path d="M72 16 a10 9 0 0 1 20 0 Z"/>
    <path d="M22 26 L38 23 V28 L24 30 Z"/><path d="M38 24 H96"/><path d="M58 27 V31"/></g></svg>`,
  // 0.13.0: de civila (keps, mössa och hatt, ett jaktgevär), infanteriet (tre moderna hjälmar och Ak 5),
  // pillboxen (traktorn med plåt, skottglugg och kulsprutan i luckan, triangeln bak)
  civ: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.2">
    <path d="M28 17 a9 8 0 0 1 18 0 Z M28 17 H52"/><path d="M52 15 a8 8 0 0 1 16 0 V17 H52 Z"/><path d="M70 17 a9 7 0 0 1 18 0 M66 17 H92"/>
    <path d="M20 27 L36 24 V29 L22 31 Z"/><path d="M36 25 H100"/></g></svg>`,
  inf: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.2">
    <path d="M27 17 a10 10 0 0 1 20 0 L45 17"/><path d="M49 15 a10 10 0 0 1 20 0 L67 15"/><path d="M71 17 a10 10 0 0 1 20 0 L89 17"/>
    <path d="M20 25 H40 V30 H22 Z"/><rect x="40" y="23" width="18" height="6" rx="1"/><path d="M58 26 H98"/><path d="M50 29 Q51 33 48 34"/></g></svg>`,
  epa: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.2">
    <path d="M18 26 V12 H62 L72 18 H96 V26 Z"/><path d="M30 18 H48"/><path d="M50 12 V7 H58 V12"/><path d="M58 9 H82"/>
    <circle cx="32" cy="27" r="5"/><circle cx="86" cy="28" r="4"/><path d="M8 26 L13 17 L18 26 Z"/></g></svg>`,
  wire: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2">
    <path d="M14 6 V30 M106 6 V30"/><path d="M14 12 C30 2 40 22 56 12 S82 2 106 12"/><path d="M14 22 C30 12 40 32 56 22 S82 12 106 22"/>
    <path d="M34 9 l4 4 M38 9 l-4 4 M74 15 l4 4 M78 15 l-4 4 M50 24 l4 4 M54 24 l-4 4"/></g></svg>`,
  block: `<svg viewBox="0 0 120 34"><g ${S} stroke-width="2.2">
    <path d="M22 30 L30 8 H50 L58 30 Z"/><path d="M62 30 L70 8 H90 L98 30 Z"/><path d="M14 30 H106"/>
    <path d="M38 14 L42 20 L39 25"/></g></svg>`,
};
