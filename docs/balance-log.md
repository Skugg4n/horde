# Balansloggen

Mätt med `npm run balance` (girig policy, fast seed per dag och försök).

## 0.1.6

Policyn (scripts/balance.mjs): minst ett vapen först (M2 om den är upplåst och går att köpa, annars M249), betongblock i ruta 0 om upplåst och råd kvar för ett vapen, taggtråd i ruta 1 och 2, sedan fler vapen, sedan uppgraderingar. Forskning köps strikt i ordningen m2, wireTough, budget, block, m249Rate, slot4 och sparas till nästa om en inte går att köpa.

Avvikelse från uppgiften: taggtråd ligger i ruta 1 och 2 (inte 2, 3, 4). Rutorna räknas från basen, och ruta 2 till 4 ligger vid x 22 till 34, utanför alla vapens räckvidd, så tråden gjorde ingen nytta. Betongblock ingick inte i policyn men måste vara med, annars är forskningen "block" värdelös.

Ändringar:
- Forskningspriser: m2 15 till 120, m249Rate 10 till 40, wireTough 12 till 40, block 20 till 60, budget 20 till 60, slot4 25 till 80. Skäl: dag 1 och 2 ger ca 90 forskning, så M2 hamnar först efter första förlusten på dag 3 och ett försök ger en eller två köp.
- M2 skada 14 till 22. Skäl: M249 gav mer skada per krona än M2 (22 mot 42 skada/s för 250 mot 600), så ingen hade valt M2. Nu ca 66 skada/s. Avviker från "rör inte vapenstatistik", men utan den vänder inte forskningen dag 3.
- Bjässe hp 220 till 450. Skäl: ska kräva grov kaliber.
- Dag 3 start 800 till 1000 pengar. Skäl: M2 (600) plus ett vapen till ryms då.
- Dag 3 våg 2: bjässar 1 till 2 (intervall 5). Våg 3: löpare 10 till 12 (intervall 0.8), bjässar 2 till 10 (intervall 2.5, start 8 s). Skäl: första försöket ska förloras utan M2.
- tests/progress.test.js läser nu pris ur RESEARCH i stället för hårdkodat 12.

Resultat: dag 1 vinns direkt (bas 11), dag 2 vinns direkt (bas 20), dag 3 förloras (bas 0, våg 3), vinns på försök 2 efter m2 och wireTough.
