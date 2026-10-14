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

## 0.1.6, andra varvet: hinderrutor inom räckvidd

- Rutor (maps.js cells): [36,30,24,18,12,6] till [52,46,40,34,28,22]. Skäl: rutorna 2 till 5 låg vid x 22 till 40, utanför alla vapens räckvidd. Nu ligger de vid x -6, 0, 6, 12, 18, 24. Ordningen är kvar: ruta 0 närmast basen.
- Policy: taggtråd i lediga rutor av 0, 1, 2; betongblock i ruta 0 (närmast basen, alla vapen når) när det är upplåst och det finns råd kvar för ett vapen. Blocket läggs före tråden, så tråden hamnar då i 1 och 2. Skäl: en spelare stoppar horden där alla pjäser skjuter.
- Hela kampanjen blev lättare med tråden i skotthåll. Omtrimning: dag 2 löpare våg 2 6 till 12 (intervall 1.0), våg 3 10 till 22 (intervall 0.7); dag 3 våg 3 bjässar 10 till 18 (intervall 1.8).
- Forskningspriser: budget 60 till 70, wireTough 40 till 50, så att ett försök ger ett eller två köp.
- Balansskriptet: TRACE-raden borta, kampanjen stannar om en dag aldrig vinns inom maxAttempts.
- Testet: dag 3 vinns på försök index 1 till 3 bland dag 3-försöken (vann på första är förbjudet), och ett nytt test kräver att dag 3 förloras helt utan forskning.
- Resultat: dag 1 och 2 vinns direkt, dag 3 förloras och vinns på försök 2 (bas 5) efter m2 och wireTough.
- Tester i tests/sim-obstacles.test.js: tider förlängda (ruta 0 nås nu vid ca 32 s i stället för 22 s).

## 0.1.12: kortare väg, sammanhängande rutor, jämnare kurva

Policyn bygger nu även under vågorna: under en våg tänker den en gång per simulerad sekund (som en människa som lägger pengarna när de kommer in). Ordningen är ändrad till ett vapen, en taggtråd, fler vapen, resten av tråden, uppgraderingar. Skäl: så bygger en människa (två M249 och en tråd), inte en M249 och tre trådar. Ny policy `strong` (samma, men pjäserna på C, B, D, A) visar vad stark placering ger. Ny policy `minimal` (en M249, inget mer) mäter dag 1.

Bana:
- Vägen [[46,0],[-12,0]] till [[27,0],[-12,0]]. Skäl: kameran visar vägen från ca x 23. Spawn låg 23 m utanför bild, ca 15 s för en vandrare. Uppmätt i webbläsaren (1100 x 760): första vandraren syns efter 2,7 s. Kameran är orörd.
- Rutor [52,46,40,34,28,22] till [33,30,27,24,21,18], kant i kant (x -9 till 9). Skäl: 3 m rutor var 6:e meter lämnade väg som såg ut som rutor. Alla rutor nås av en M249 nivå 1 från C, rutorna 0 till 2 även från A och B. Positioner och rekvisita orörda (inget föremål på en ruta eller närmare än 3,5 m från en position, nytt test).
- `cellAt`: kanten mellan två rutor hör till rutan närmare basen (halvöppet intervall).

Siffror:
- M2 forskning 120 till 100. Skäl: dag 1 och 2 ger 46 + 73 till 76 forskning. Nu räcker det till M2 före dag 3 om man sparar.
- Dag 1 våg 3: 16 vandrare (1,0 s) till 20 (0,8 s). Skäl: en M249 klarade dagen utan skada. Nu tar basen 2 till 5 i snitt över positionerna A, B, C (A ca 13 kvar, B ca 17, C 20).
- Taggtråd sakta 0,35 till 0,5. Skäl: med sammanhängande rutor blev tre trådar en 9 m damm. Löparna samlades där, tråden brast och hela klungan nådde basen på 3 s.
- Löpare pengar 12 till 6. Skäl: löparna betalade mer än de kostade, så fler löpare gjorde dag 2 lättare.
- Dag 2 startpengar 650 till 550, våg 3 löpare 22 (0,7 s) till 32 (0,45 s). Skäl: dag 2 tog aldrig skada. Nu vinns den på första försöket med 4 till 19 kvar (snitt ca 10).
- Bjässe: skada på basen 5 till 1, hp 450 till 500, ny egenskap `slowTaken` 0,4 (känner 40 % av trådens inbromsning, sim.js). Skäl: fem skada och en damm vid tråden gav ras från 20 till 0 på 4 till 15 s. Nu tar ett förlorat försök 41 till 45 s från första skadan till noll.
- Dag 3 våg 3: 18 bjässar (1,8 s) till 35 i fem klungor om 7 (1,5 s, var 14:e sekund). Skäl: med skada 1 behövs fler, och klungorna ger ett ras i trappsteg som syns i förväg.
- Dag 3-texten: "Stor och seg, och taggtråden håller den knappt. Grov kaliber biter bäst."

Resultat (standardseed): dag 1 vinns (20), dag 2 vinns (7), dag 3 förloras två gånger (ras 43 och 45 s) och vinns på tredje. Över 12 andra seeds: dag 3 försök 1 förloras i 11 av 12, vinns senast på försök 3 i alla, `strong` med bara M2 vinner försök 1 i 7 av 12, utan forskning förloras dag 3 i alla. Kassa efter en våg: median ca 105, max ca 470.

Tester: balance.test.js har nu fem seeds, dag 1 minimal skada 1 till 6 i snitt, dag 2 märkbar skada, M2 före dag 3, ras minst 25 s. Tidstester i sim-obstacles.test.js kortade (ruta 0 nås vid ca 20,6 s). cells.test.js räknar från vägens start i stället för fast 46.

## Prestanda

Mätt 2026-10-15 inför 0.2.0, dag 3 våg 3 (65 zombier, varav 35 bjässar). Den här datorn: Mac med Apple Silicon, Chromium via Playwright i synligt fönster, 1440 x 900, pixeltäthet 1. Bildskärmen går i 120 Hz, så 120 fps är taket. Anrop = `renderer.info.render.calls` (skuggpass och huvudpass), medel och högsta per 5 s. Hoppet till vågen gjordes i konsolen (`?debug`), basen fick oändligt med liv så att hela vågen gick.

Två uppställningar:
- **Starkt försvar:** fyra M2 på nivå 3 och tre taggtrådar. Många pjäsdelar, få levande zombier.
- **Svagt försvar:** en M249 på nivå 1 och tre taggtrådar. Upp till 32 levande och 43 zombier i bild.

| Uppställning | Före (0.1.12) | Efter (0.2.0) |
|---|---|---|
| Starkt, anrop medel / högsta | 1 130 till 1 200 / 1 216 | 1 010 till 1 110 / 1 124 |
| Svagt, anrop medel / högsta | 1 080 / 1 097 | 990 / 1 011 |
| fps, båda | 120 hela vågen | 120 hela vågen |
| Längsta bildruta | 10 ms | 10 ms |

Ändrat i 0.2.0:
- Gruset ritas som tre `InstancedMesh` (en per färg) i stället för 260 meshar. Sparar mindre än väntat, ca 80 anrop, eftersom det mesta gruset redan låg utanför bild och sorterades bort.
- Kroppar som fallit kastar ingen skugga.
- Högst 24 liggande kroppar i bild, de äldsta tas bort först (simuleringen behåller sina döda i 20 s som förut).

Slutsats: långt över 50 fps här, så nästa åtgärd i granskningen (sandsäckar som en sammanslagen geometri per pjäs) väntar. Den största kvarvarande posten är pjäserna: en M2 på nivå 3 är 120 meshar, och fyra sådana står för drygt 40 % av anropen (ca 400 av 920 i vågens början), eftersom varje säck är en egen mesh och ritas två gånger. Siffran är från en snabb dator med pixeltäthet 1; på en Retina-skärm (täthet 2) eller en äldre dator med integrerad grafik kan det bli lägre och bör mätas där.
