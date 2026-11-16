# Speltest 0.25.1: hela kampanjen i följd, dag 1 till 14 (2026-11-16)

Huvudlös Playwright (chromium_headless_shell, `lowPriority()` och GPU-flaggorna ur `scripts/headless.mjs`, --mute-audio, ?mute), egen server på port 8411 ur ~/Projects/horde-play (0.25.1, c1538fb), egen driver på 8412, 1440x900, `?test`. Ny sparning (localStorage tömd), sedan bara vanligt spel: bordet, rullan, förrådet, kort, placeringar, spärrar, flytt och bemanning. Spelets SPEED 2X när den fanns; jag tittade på läget var 8 till 12:e sekund (ungefär 15 till 25 s speltid mellan blickar, i lugna partier mer). Ett debug-ingrepp: dag 13 efter tre förluster (god-läge via `__horde.sim.tweaks`), enligt regeln. Skärmbilder i `2026-11-16-bilder/`.

Valet efter Mölnbo: DEFEND LAXNE. Kampanjen nådde slutbladet ("Campaign continues in a later version").

## Svar: NEJ

Kampanjen hänger ihop som berättelse och som karta, och slutet finns nu. Men som en sammanhängande upplevelse håller den inte än: en mjuklåsning (dag 13), tre väggar där jag förlorade tre gånger (dag 7, 9 och 13) med lätta dagar emellan, och pengar som hopar sig med 700 till 1 100 $ oanvända per dag från dag 8. Tröttheten styr rullan på ett sätt som gör den förvalda truppen för svag på dag 13.

## Dagslogg

Minuter = speltid (sim) för vinstförsöket; förlorade försök inom parentes.

| Dag | Bana | Försök | Bas kvar | $ kvar | RP före/efter | Enheter i strid | Trötthet | Min | Hur det kändes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E4 · 1 | 1 | 20 | 0 | 0 / 134 | 3 | ingen | 4,5 | Ren lektion, inga pengar alls. |
| 2 | E4 · 2 | 1 | 16 | 281 | 134 / 308 | 3 + 4 tråd | ingen | 4,6 | Södertälje-läckan ger första bastträffen, tydlig banderoll. |
| 3 | E4 · 3 | 1 | 4 | 213 | 308 / 596 | 5 + tråd | ingen | 6,4 | Våg 3 (72 st) är ett stup efter två snälla vågor. |
| 4 | Ishallen · 1 | 1 | 10 | 72 | 596 / 675 | 3 frivilliga | ingen | 3,8 | E4-armén är borta, bara jägare. Tre civila dör vid huset längst bort. |
| 5 | Ishallen · 2 | 1 | 17 | 305 | 675 / 859 | 5 | ingen | 9,3 | Lång. Spärr + "Horde rerouting via Cykelvägen" fungerar fint. |
| 6 | Ishallen · 3 | 1 | 8 | 237 | 859 (475 efter köp) / 684 | 6 | ingen | 9,1 | Första förrådet; HV 5 → 1 man i våg 3. |
| 7 | Vikingavägen | 3 | 7 | 572 | 684 (8 efter köp) / 586 | 9 | ingen | 11,0 (5,0 + 5,2) | Vägg. Två förluster på ~50 s bastapp; spärr på norra cykelvägen löste det. |
| 8 | Mölnbo · 1 | 1 | 20 | 749 | 586 (176) / 423 | 10 | alla "Rested" | 3,6 | För lätt, aldrig behövt köpa något. |
| 9 | Mölnbo · 2 | 3 | 9 | 1 091 | 423 (107) / 326 | 10 | 8 flyttade | 7,9 (4,1 + 4,5) | Vägg. Tåget drar kameran till perrongen medan basen faller. |
| 10 | Mölnbo · 3 | 1 | 17 | 715 | 326 (6) / 130 | 10 | 14 flyttade, 5 Exhausted | 6,4 | Klockan räddar; 79 kills mot utlovade 210 till 360 gående. |
| val | Laxne | DEFEND | | | 130 / 130 (−130 visas, inget drogs vid DEFEND) | | | | Siffror före kryss, lätt att förstå. |
| 11 | Laxne | 1 (+1 krasch) | 20 | 1 121 | 130 (106) / 488 | 10 | 10 flyttade | 7,8 | Lätt trots mest trötta och frivilliga. |
| 12 | Björnlunda · 1 | 1 | 15 | 1 121 | 488 (168) / 396 | 10 | 20 flyttade | 6,0 | Lätt; Psg 90 utan tak. |
| 13 | Björnlunda · 2 | 3 + hopp | 0 / 0 / 0, sedan god | 0 till 731 | 396 / 571 | 10 | 18 flyttade, alla MG "Tired" | (4,5 + 6,5 + 13,3) | Vägg + mjuklåsning. Förvalda rullan för svag. |
| 14 | Västra rondellen | 2 | 17 | 308 | 571 (251) / 568 | 10 | 7 flyttade (snedvridet av god-hoppet) | ~7 (5,0) | Första försöket föll på pjäser som tystnar; andra höll med 3 bemanningar à 150 $. |

Total speltid ungefär 3 h 15 min inklusive förluster och tre omspel efter krascher.

## Svårighetskurvan

Försök per dag: `1 1 1 | 1 1 1 3 | 1 3 1 | 1 1 4 2`
Bas kvar vid vinst: `20 16 4 | 10 17 8 7 | 20 9 17 | 20 15 – 17`

Sågtand, inte en kurva: E4 stiger lagom (20 → 16 → 4), Ishallen börjar om lätt, Vikingavägen (dag 7) är en mur, Mölnbo 1 är en paus (bas 20 utan köp), Mölnbo 2 en mur, Mölnbo 3, Laxne och Björnlunda 1 lätta, Björnlunda 2 en mur igen, rondellen svår men rättvis. Väggarna har samma form: allt ser bra ut i två vågor, sedan går basen 20 → 0 på 50 till 70 s i våg 3 eller 4. Med en blick var tionde sekund hinner man se det, men inte förstå varifrån läckan kommer innan det är över.

## Pengar och RP

- RP hopar sig först: 859 RP innan förrådet ens finns (natt 5). Natt 1 till 4 visar inget sätt att använda dem och RP-mätaren syns inte; man vet inte att man sparar.
- RP tar slut två gånger: natt 6 (684 → 8 efter nivåer och uppgraderingar) och natt 9 (326 → 6, en ny Ksp 58 för 200). Annars räcker de gott.
- Supplies hopar sig från dag 8: 749, 1 091, 715, 1 121, 1 121 $ oanvända. Det enda som tömmer kassan är taggtråd och bemanning (150 $ per tyst pjäs, ett pris man ser först när man klickar på den tysta pjäsen och får "Not enough cash").
- Psg 90 är dåliga köp: nästan alla hustak ger "Roof too steep" (Mölnbo dag 8, Björnlunda, rondellen). Psg 90 III för 320 RP inför dag 14 gav inget; prickskyttarna fick stå långt bort eller bänkas.
- Natt 7 står "Psg 90 II" och "Better rifles II" redan som Bought, fast jag aldrig köpt rifles I. Ankomstgåvor antar jag, men inget säger det.

## Tröttheten över sektorerna

- Dag 1 till 7: ingen trötthet alls.
- Natt 7: tipset "Units that fought are tired. Rest some in reserve." visas, men varje rad står "Rested", även de som slogs på Vikingavägen (bild 09).
- Natt 8 och framåt: "N moved by fatigue. Hover a row for why." Bra mekanik, men förvalet blir till slut fel: inför dag 13 valde rullan fyra Hemvärnsgrupper, tre Ksp 90 och frivilliga, och lade alla Ksp 58 och Ksp 88 (Tired) i reserv. Försök 1 gav 70 kills på 270 s. Med trötta MG inbytta höll jag mycket längre.
- Inför dag 14 står förstärkningen "Ksp 88 2" (Rested, NEW, "A Ksp 88 joins you") i reserven medan frivilliga står i strid.

## Berättelsens röda tråd på bordet

Bra: varje order säger varför man är där, radion binder ihop (Järna faller, Mölnbo nästa, Laxne ber om hjälp, "Next: Västerkärv. To be continued."). Dagnumren stämmer överallt efter DEFEND (Laxne 11, Björnlunda 12 och 13, rondellen 14). Slutbladet finns.

Glapp:
- Dag 4: hela E4-styrkan (infanteri, Ksp 90, Ksp 88, pansarvärnet) försvinner utan ett ord; man har bara tre jaktlag. Den kommer tillbaka natt 6 ("Hemvärnet arrives").
- Natt 4: "10 infected down in 3 waves" fast dagen tog slut i våg 2 av 3. "We lost 3 men" när det var 3 civila som föll.
- Natt 12: resultatkortet säger "Losses stand: Volunteers lost", lägesrapporten "No losses".
- Dag 10: WHAT WE FACE lovar "Walkers 210 to 360, runners 80 to 140"; klockan tog slut i våg 3 av 6 med 79 kills. Segerkortet säger "Wave 3 of 6 · 2 cleared".
- Slutbladet: E4- och Hagstumosse-korten har fallit ur högen till vänster; "held, 4 days" svävar över Klämmingen långt från Ishallen och "held, 1 day" (rondellen) ligger ute i Sillen (bild 22). Slutbladet har ingen summering (dagar, förluster, civila räddade), bara "Thank you for holding Gnesta".

## Tråkigast och bäst

- Tråkigast: dag 8, Mölnbo 1. Bas 20, 749 $ som aldrig behövdes, slut på 3,6 min. Tätt följd av dag 11 och 12 som också vanns med 1 121 $ över.
- Bäst: dag 9 tredje försöket. Barriärens förhandsvisning "This sends them down Trollvägen" med den nya orange rutten (bild 12) gjorde att jag förstod kartan, och kyrktornet tog en Psg 90. Det var första gången spärrar kändes som ett eget verktyg och inte gissning. Dag 7 tredje försöket har samma känsla.

## Dagar som upprepar varandra

- Ishallen 1 till 3 och Vikingavägen (dag 4 till 7) är samma isrink-plan med samma entré; fyra dagar på samma plats.
- Mölnbo 1 till 3: samma karta, dag 9 och 10 nästan samma uppställning (spärren vid kyrkan, allt i fältet framför Folkets hus).
- Björnlunda 1 och 2: samma korsning vid Wattrangsborg.

## Problem, rangordnade

1. **Mjuklåsning på dag 13 (blockerare).** Skrotbilar vid hyreshuset fick fem zombier (gående, bjässe, pansrad) att stå stilla på samma punkt i över tre minuter (blockedBy null, attacking false). "5 LEFT · NEXT WAVE AFTER 2 MORE" ändrades aldrig, ingen seger, ingen förlust. Det löstes först när jag klickade på bilarna och valde "Remove all 5" (bild 19). Ingenting i spelet pekar dit.
2. **Tre väggar med samma mönster** (dag 7, 9, 13): två lugna vågor, sedan bas 20 → 0 på 50 till 70 s. Dag 13 krävde debug efter tre förluster. Mellan väggarna är dagarna lätta, så kurvan blir sågtand i stället för en stigning.
3. **Rullans förval efter trötthet gör truppen för svag** (dag 13), och natt 7:s trötthetstips stämmer inte med "Rested" på varje rad. Förstärkningen Ksp 88 hamnar i reserven dag 14.
4. **Tåget på Mölnbo 2 flyttar kameran till perrongen mitt i våg 3** medan basen faller, samtidigt som Crawlers-kortet, "Base under attack" och "GOT THROUGH: FOLKETS HUS" kommer och SPEED går tillbaka till 1X (bild 11). Jag förlorade två gånger utan att se basen.
5. **Ekonomin hopar sig**: 700 till 1 100 $ över per dag från dag 8; 859 RP innan förrådet öppnar; Psg 90-köp blir värdelösa när taken är för branta; bemanningspriset (150 $) syns först i nödläget.
6. **Krascher**: den huvudlösa webbläsaren dog tre gånger på ~3 h (dag 3, natt 5, mitt i Laxne). Profilen höll och Continue tog mig tillbaka till rätt bord, men Laxne fick spelas om. Minnet låg och sågtandade mellan 330 och 690 MB, så jag kan inte säga om det är spelet eller miljön (GPU i bakgrundsläge). Värt att kolla i en vanlig webbläsare över lång tid.
7. **Evakueringens regler skiljer sig**: Ishallen 1 slutar med seger så fort 21 av 24 är inne (våg 2 av 3). Björnlunda 2 fortsätter efter 24/24 inne och förloras när basen faller. Målrutan säger samma sak båda gångerna ("Get the marked houses to ...").
8. **Text som inte stämmer**: rapport mot resultatkort (losses, antal vågor), WHAT WE FACE mot verkligheten dag 10, riktningsetiketter ("DANSUTVÄGEN WEST" i högerkanten dag 7, "VÄG 57 NORTH" nere till höger efter B på dag 9).
9. **Inmatning**: Esc utan kort i handen öppnar pausmenyn (tre gånger mitt i strid); Space startade inte vågen dag 9 (klick på knappen gjorde det); klick på START WAVE med ett kort i handen gör ingenting utan besked; håll-dra-sikte gav tyst "ignored-aim" två gånger; R-plåtar ("utanför sektor") på Ksp 88 i nästan varje dag utan att det framgår var de borde peka.
10. **Slutet är tunt**: slutbladet saknar summering, två sektorkort har försvunnit ur högen, "held"-etiketterna sitter på fel ställe på kartan. Huvudmenyn efteråt säger "Gnesta · Västra rondellen · 568 RP" och Continue leder till samma blad.

## Funkar bra

- Bordet bär berättelsen: order, lägesrapport, radio, hotblad och fiendekort ger en tydlig kedja natt för natt; dagnumren stämmer i DEFEND-grenen.
- Spärrens förhandsvisning ("This sends them down Trollvägen") och banderollen "Horde rerouting via ..." gör omvägar begripliga.
- Laxne-valet: siffrorna syns före kryss, "One day. Your troops tire." mot "−130 RP. Bigger first wave".
- Trötthetsmarkeringen på kartan (TIRED-lappar på pjäserna) och "N moved by fatigue. Hover a row for why." på rullan.
- Bemanning: klick på den tysta pjäsen visar "Silent: the crew is down", priset och N; "Crew on the way · MANNING 4" ger bra återkoppling.
- Förrådets "Released by command" (nya enheter, utvilade) räddade dag 10 och 14.
- Slutet finns: radion "To be continued", bladet "Campaign continues in a later version" och TO MENU.

## Värst

Mjuklåsningen dag 13: zombier som fryser vid skrotbilar och en våg som aldrig tar slut. Allt annat går att spela sig förbi; den här går bara att lösa genom att gissa att man ska riva sina egna bilar.

## Bilder

01 bord dag 1 · 02 natt 1 · 03 natt 3 utan rulla · 04 Ishallen evak · 05 omvägsbanderoll · 06 första rekvisitionen · 07 dag 7 förlust · 08 läcka Cykelvägen · 09 natt 7 tips mot "Rested" · 10 natt 8 trötthet · 11 dag 9 tåg + krypare + bas samtidigt · 12 spärrens förhandsvisning · 13 etikett "VÄG 57 NORTH" · 14 dag 10 seger "Wave 3 of 6" · 15 Laxne-valet · 16 Laxne-rullan · 17 Laxne · 18 kort i handen vid START WAVE · 19 frysta zombier vid skrotbilarna · 20 bemanning 150 $ · 21 tysta pjäser dag 14 · 22 slutbladet
