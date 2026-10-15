# Ändringslogg

## 0.2.1 (2026-10-15)

Putsning efter speltestet av 0.2.0. Inga balanssiffror ändrade.

- Bygg- och hinderpanelen läggs där den inte täcker någon position, ruta eller plåt, oftast nere till vänster, och står still mellan klicken. Klick på en annan position eller ruta byter panel direkt, utan Esc.
- Esc tar bort markeringen helt: ingen vit ram eller räckviddscirkel ligger kvar.
- Dagens intro säger hur mycket pengar dagen börjar med och att positionerna är tomma men forskningen följer med.
- Siffran under pengarna visar bara det senaste köpet eller sälj, med exakt belopp. Pengar från dödade zombier syns som en liten "+$" där de föll.
- Efter en förlust visas ingen "kvar"-siffra längre.
- M2 syns skjuta: tjockare och ljusare spårljus, större mynningsflamma, krutrök och kraftig rekyl. M249 har tunnare spårljus, kort flamma och ett lätt skak. Samma eldhastighet som förut.
- Vinstskylten säger hur mycket som fanns kvar i kassan och att det försvinner till nästa dag.
- "Basen tar skada!" försvinner när dagens skylt kommer. Ingen favicon-404 i konsolen.

## 0.2.0 (2026-10-15)

Riksvägen dag 1 till 3 går att spela från början till slut.

- Sparfilen tål konstiga värden: dag och försök måste vara heltal, annars sparas filen undan som trasig och spelet startar nytt.
- Resultatskylten säger "Forskning att använda" i stället för "Forskning totalt".
- Mynningsflamman lyser på rätt pjäs även efter uppgraderingar.
- Snabbare bild: gruset ritas i tre anrop i stället för 260, liggande kroppar kastar ingen skugga och högst 24 kroppar ligger kvar i bild.
- Större text på korten i bygg- och forskningspanelen. Versionen står bara en gång i menyn.
- Visningssidan visar basen och pilen där horden kommer in. Stilbibeln har fyllnadsljuset, en budget för antal delar per modell och regeln om en skärmbild per version.
- README och ändringslogg.

## 0.1.12
- Kortare väg så att basen syns, rutor som sitter ihop, jämnare svårighet över dagarna.

## 0.1.11
- Bygg och sälj även medan vågen pågår. Basen syns och skakar när den tar skada. Säkrare klick på vägens rutor.

## 0.1.10
- Dagcykel med meny, intro, resultat och forskning mellan dagarna.

## 0.1.9
- Bygga och spela en hel dag.

## 0.1.8
- Grafiken kopplad till simuleringen.

## 0.1.7
- Modeller byggda i kod, visningssida och stilbibel.

## 0.1.6
- Balanssimulering och trimmad kurva. Hinderrutor inom räckvidd.

## 0.1.5
- Forskning, framsteg mellan dagar och sparning som aldrig raderar. Robustare sparning och hinder.

## 0.1.4
- Taggtråd och betongblock.

## 0.1.3
- Vapen som byggs, siktar och skjuter.

## 0.1.2
- Simuleringskärna med vågor och bas.

## 0.1.1
- Speldata, slumptal och vägen.

## 0.1.0
- Grundstomme med scenen från prov 1, `npm test`.
