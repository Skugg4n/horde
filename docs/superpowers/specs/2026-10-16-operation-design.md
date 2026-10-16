# Operation Södermanland: rekvisition, kärntrupper och operationskarta (design, utkast)

Version 0.1 · 2026-10-16 · status: utkast för Olas läsning. Inget byggs innan Ola godkänt.

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

1. Ska trupper kunna rekvireras mitt i en dag, som en dyr nödleverans med fördröjning, eller bara mellan dagarna?
2. ~~Kan sektorer falla permanent?~~ BESLUT (Ola 2026-10-16): nej, de blir bara svårare.
3. Ska svårighetsgrad finnas som val (till exempel "Hemvärnet" eller "Fallskärmsjägare"), eller räcker grinden?
