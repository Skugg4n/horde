// Kampanjens val (0.24.0, H552): ett vägskäl som spelaren avgör på bordet mellan två dagar. Ren data; reglerna bor i
// src/meta/progress.js (choiceOf, mapUnlocked) och src/meta/operation.js (makeChoice), bladet i src/meta/table.js
// (choiceSheet) och src/ui/choice.js.
//
// Laxne (kampanjplanen avsnitt 10, Olas beslut 2026-10-20): valet erbjuds mellan Mölnbo dag 10 och Björnlunda dag 11.
//   defend    Laxne blir nästa strid (en dag, kampanjens dag 11); Björnlunda är sedan dag 12 och 13.
//   fallback  ingen strid, truppen sparad. Byns folk lämnas: färre RP (rp), och Björnlunda dag 1 blir tyngre (horden
//             närmare, första vågen större: bjornlunda-play.js DAYS[0].choiceMod). Lägesrapporten och radion säger det.
// Sparfilen: progress.choices = { laxne: 'defend' | 'fallback' } och progress.choiceRp = { laxne: RP som drogs }. Ett
// val går inte att ändra. legacy: en sparfil som fick leveransen före valet fanns (0.23.x stod i Björnlunda) har inget
// val att göra: Björnlunda står öppen som förut, utan kostnad.
export const CHOICES = {
  laxne: {
    after: ['molnbo', 3],
    from: 'MCF',
    to: 'Commander, Gnesta',
    text: 'Laxne asks for help. Defend it, or fall back to Björnlunda.',
    legacy: 'bl-1',
    options: [
      { id: 'defend', label: 'DEFEND LAXNE', map: 'laxne', means: 'One more day. Laxne skola is the base.' },
      { id: 'fallback', label: 'FALL BACK', rp: 150, pile: 'bjornlunda', means: 'No battle, troops saved. Laxne is lost: fewer RP, a bigger first wave at Björnlunda.',
        // lägesrapporten på Björnlundas hög (natten efter Mölnbo) och radion samma natt
        report: { from: 'MCF', lead: 'Laxne is on its own.', text: 'The troops are coming to Björnlunda whole. Laxne is not: the village was left to the horde, and the people who stayed are lost. The horde is closer now. Expect more of them in the first wave.' },
        radio: { at: '05:50', text: 'Nobody is coming to Laxne. People along road 223 are told to drive south towards Björnlunda and Gnesta now. Buses to Laxne are cancelled.' } },
    ],
  },
};
export const choiceOption = (id, opt) => CHOICES[id]?.options.find(o => o.id === opt) ?? null;
