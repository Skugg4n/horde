# Operation Södermanland: rekvisition, kärntrupper och operationskarta (design, utkast)

Version 0.1 · 2026-10-16 · status: GODKÄND av Ola 2026-10-16. Byggs efter kampanjpasset.

## Varför

Köp-och-forska-ekonomin räcker inte när spelet ska kännas som att det pågår på riktigt. Inspiration: Close Combat 3/4. Någon måste prioritera mellan delar av landet, styrkor blir loss pö om pö, och förluster betyder något.

## Kärnloopen

1. **Mellan dagarna (operationskartan).** Läget i sektorerna, meddelanden från ledningen, rekvisition av trupp och materiel med rekvisitionspoäng (RP), och placering av kärntrupper i sektorer.
2. **Före striden (uppställning).** De rekvirerade styrkorna placeras ut på kartan. Ingen fri handel med trupp mitt i striden.
3. **Striden (dagen med vågor).** Lugnt först, sedan växer horden. Du använder det du har: flytta, rikta om, bygg förnödenheter.
4. **Efter striden.** RP för dödade zombier och klarade vågor. Vid seger följer förluster och erfarenhet med.

## Två valutor

- **Rekvisitionspoäng (RP).** De är permanenta och tjänas på dödade zombier, klarade vågor och mål. RP används mellan dagarna till trupp, tung materiel och uppgraderingar. RP ersätter dagens forskning för trupp och vapen.
- **Förnödenheter (pengar i striden).** De gäller bara inom dagen och tjänas under striden. De används till taggtråd, sandsäckar, barrikader, skrotbilar, ammunition och granatkit. Det är ungefär dagens pengar, fast utan trupper.

## Utrustning pö om pö

Ledningen bestämmer vad som är loss. Varje dag kan ett meddelande låsa upp något nytt i förrådet, till exempel:

- "Försvarsmakten has released an infantry platoon. Assign it to Gnesta or hold it for Trosa?"
- "MCF has secured fuel and two A-tractors. Your engineers can weld a pillbox."

Ordningen i förrådet styr inlärningskurvan. Spelaren kan inte köpa allt direkt, hur mycket RP den än har.

## Kärntrupper

- Rekvirerade trupper (infanteri, Ksp-lag, prickskyttar, Hemvärnet) följer med mellan dagarna.
- **Erfarenhet:** trupper som överlever får en stjärna med bättre träff och snabbare omladdning. Det ska vara blygsamt.
- **Förluster:** stupade soldater är borta vid **seger**. En grupp kan fyllas på med RP.
- **Felköp:** mellan dagarna kan trupp och materiel **lämnas tillbaka till förrådet** för cirka 50 % av RP, eller **omplaceras** till en annan sektor.

## När man blir överkörd

- Dagen börjar om med den styrka man gick in med. Inga förluster följer med.
- RP som tjänades under försöket behålls. Spelaren blir starkare av att försöka igen, vilket gör att grinden lönar sig.
- **Avtagande avkastning:** fjärde och femte försöket på samma dag ger mindre RP. Det gör att man inte kan farma i all evighet.
- **Bonus:** extra RP för snabb seger, få förluster eller oskadad bas. Det belönar skicklighet framför grind.

## Operationskartan

- Den visar Södermanland som en mörk lägeskarta i samma stil som minikartan, med sektorerna E4, Gnesta South och Gnesta North, och senare till exempel Trosa, Mölnbo och Nyköping.
- Varje sektor har ett läge: håller, hotad eller fallen. Sektorer man inte försvarar kan försämras över tid, så att det finns ett tryck att prioritera.
- Meddelanden kommer från Försvarsmakten (trupp) och Myndigheten för civilt försvar (MCF: evakuering, Hemvärnets resurser, civila). Det nuvarande namnet på MSB ska kontrolleras innan det står i spelet.
- Kampanjbågen enligt H104 och H105 är en militär vägspärr på E4, sedan Gnesta med civila och Hemvärnet, och sedan riktiga trupper som kommer pö om pö.

## Balans

- Ribban ligger högt hela tiden, och grind är en del av progressionen.
- Balansskriptet simulerar en kampanj med försök och RP. Mål:
  - En normal spelare klarar varje dag inom 1–4 försök.
  - En skicklig spelare klarar den på 1.
  - Ingen dag kräver fler än cirka 6 försök med de RP man har tjänat ihop.
- Fingeravtryckstesterna blir per kampanjsteg, inte per fristående dag.

## Vad som försvinner eller ändras

- Forskningsträdet blir förrådet och rekvisitionen. Dagens forskningsnoder blir leveranser och uppgraderingar.
- Köpraden i striden innehåller bara förnödenheter. Trupper ställs ut i uppställningsfasen.
- Sparfilen går till v4 med migrering: dagens forskning omvandlas till förråd och RP. Ingen sparning raderas.

## Öppna frågor till Ola

1. ~~Rekvisition mitt i en dag?~~ BESLUT (Ola 2026-10-16): bara mellan dagarna.
2. ~~Kan sektorer falla permanent?~~ BESLUT (Ola 2026-10-16): nej, de blir bara svårare.
3. ~~Svårighetsval?~~ BESLUT (Ola 2026-10-16): inget val i början; grind + bonusar räcker. Kan läggas till senare (multiplikatorer finns redan i debugmenyn).

## Byggt i 0.14.0 (beslut under bygget)

- Uppgraderingarnas pris: enheternas nivåer (2 och 3) kostar RP mellan dagarna i förrådet. Granatlådor, ammunitionslådor och sandsäckar kostar förnödenheter i striden.
- Frontbredd per sektor (E4 6, Gnesta South 8, Gnesta North 9 enheter ute samtidigt). Inte i specen: utan den växte styrkan för fort när kärntrupperna följer med. Värt ett speltest.
- E4:s vägspärr drar sig tillbaka när sektorn tystnar; RP som lagts på enheter där lämnas tillbaka. Gnesta South:s trupper blir fria att omplacera när sektorn håller.
- MCF: Myndigheten för civilt försvar ersatte MSB den 1 januari 2026. Kontrollerat mot min kunskap, inte mot en källa i dag.
- Gnesta North öppnar efter South dag 4 (förut 5), så att två sektorer är öppna samtidigt och trycket spelar roll.

## Gnesta = en sektor (Ola 2026-10-16)

Gnesta North:s karta innehåller Gnesta South (ishallen, rondellen, Sigtunavägen): det är samma plats, och det går inte att "skicka trupp" mellan dem. Beslut:
- Sektorn heter **Hagstumosse** ("Hagstumosse · Gnesta" där det finns plats): stadsdelen med ishallen, Sigtunavägen, Fornminnesvägen och Vikingavägen. Senare sektorer: Gnesta Centrum (grå platshållare på kartan) och längre norrut, Mölnbo.
- Två faser: **Hagstumosse · Ishallen** (förut South, dag 1 till 5) och **Hagstumosse · Vikingavägen** (förut North, dag 1 till 5). Vikingavägen öppnar när Ishallen dag 5 är vunnen; kartan vidgas norrut ("The fog lifts. They are circling north.").
- En gemensam trupp: enheterna följer med från Ishallen till Vikingavägen. Ingen omplacering, garnison eller tryck mellan faserna.
- Omplaceringen, garnisonen och trycket finns kvar i koden men är vilande. De visas bara när två skilda platser är aktiva samtidigt (E4, Hagstumosse, senare Mölnbo). Klarheten om nästa strid (NEXT BATTLE, Deploy-knappen med sektorn, skicka och ta tillbaka gratis till Deploy, varningen när sektorn som strider har färre än garnisonen) gäller generellt.
- Garnisonen (vilande): färre än 3 enheter i en öppen sektor gör att trycket där stiger 2 per vunnen dag någon annanstans i stället för 1 (src/meta/operation.js pressureGain; förrådet säger samma sak, prov i tests/operation.test.js).
- Interna id:n är oförändrade ('gnesta', 'gnesta-norr'). Sparfilen: enheter, lager och tryck i 'gnesta-norr' slås ihop med 'gnesta' (inga enheter förloras), en kopia sparas under horde.save.v4, och Vikingavägen står kvar öppen för den som redan spelat den efter South dag 4.

## Taket per strid (0.16.4, Olas fråga: "hur många kan jag ställa ut?")

En regel från förrådet till striden: sektorns tak per strid är banans frontbredd (E4 6, Ishallen 8, Vikingavägen 9).
- **Förrådet** visar taket under sektorns enheter: "Hagstumosse: 6 of 8 units deployed per battle." Varje rekvisitionskort säger vad det gör med taket ("→ 7 / 8", över taket "→ 9 / 8 · reserve"). Över taket står det rakt ut: "You have 10 units. Only 8 can fight. Choose at deployment; the rest wait in reserve."
- **Rekvisition över taket är tillåten.** Reserven har en uppgift: man väljer vilka som strider dag för dag (tunga pjäser mot bjässarna, grupper mot evakueringen) och ersätter förluster utan att vänta på nästa leverans. Ledningens knapphet (lagret per leverans) står kvar som taket för hur många som finns; frontbredden är taket för hur många som strider.
- **Uppställningen** visar "DEPLOYED 5 / 8" i köpradens rubrik i varje uppställning (förut först från Vikingavägen dag 3). Vid taket säger klicket varför vid pekaren: "Sector full: 8 / 8 deployed. The rest wait in reserve."
- Prov: tests/operation.test.js ("taket per strid").
