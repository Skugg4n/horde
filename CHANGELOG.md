# Ändringslogg

## 0.16.0 (2026-10-16)

Inlärningen steg för steg (docs/superpowers/specs/2026-10-16-onboarding-design.md, Olas beslut och tilläggen), och Hagstumosse som en sektor (Olas beslut samma dag).

- Ett nytt begrepp per dag (src/meta/unlocks.js). E4 dag 1: infanteriet står vid bommen, en Ksp 90 ställs på en av de markerade platserna och vågen startas; ingen tråd, inga förnödenheter. Den andra Ksp 90 kommer efter våg 1. Dag 2 förnödenheterna och taggtråden, fartknappen efter våg 1. Dag 3 sikta och Rotate, och pillboxen står svetsad från början. Kartan efter E4, minikartan och evakueringen South dag 1, barrikaderna och hordens väg (V) dag 2, vilande hus och Next wave med bonus dag 3, Move dag 4, förnödenheter på enheten dag 5, frontbredden och reserven Vikingavägen dag 3. Det som inte är upplåst finns inte: simuleringen nekar det också, så att balansens policyer spelar samma spel.
- Gradvis HUD: förnödenhetsmätaren, fartknappen, minikartan, V-etiketten, Next wave, Field manual-knappen och enhetspanelens knappar kommer när de är upplåsta, med en diskret animation första gången. Före E4 dag 3 visar enhetspanelen bara namn och hälsa.
- Lektionsplåten (src/ui/coach.js): hård paus, skärmen dämpas utom målet, rostfärgade hörnvinklar, en plåt med ledlinje, högst 12 ord, tangenter som tangentkåpor, PAUSED längst ned. Esc hoppar över steget, två Esc resten av dagen. "I know tower defence: fewer tips" på första plåten. Pausmenyn: Tips On / New only / Off, Field manual och Reset tips. Högst två hårda pauser per våg, 20 s emellan. Tips i stunden (basen tar skada, civil faller, mål utanför vinkeln, förnödenheter över, alla vägar stängda, prickskytten, monterad pjäs, stjärnan, de stupade).
- Field manual på J: uppslag i fem grupper som fylls på när lektionerna körts, prick på nya, Show me, och ett förslag efter en förlust.
- Ny fiendetyp: hård paus med en presentationsruta, porträttet renderat ur zombiens 3D-modell (src/render/portrait.js), en rapporttext och Continue. Vandrare, löpare och bjässar.
- Köpraden: enkla siffror 1, 2, 3 ...; kategorierna och tvåstegsvalet bara med fler än 9 kort (ersätter H097).
- Förrådet i steg: RP och nivåer efter South dag 2, rekvisitionen efter dag 3, uppgraderingarna och Return efter dag 4. Knappheten: ledningen släpper ett bestämt antal per leverans, korten visar "1 available" eller "None released", och det som inte är släppt går inte att rekvirera hur mycket RP man än har. Uppgraderingar bara för det man har eller fått släppt, släppta pö om pö. Spelets rullister (smala, mörka, rostfärgad tumme), korten med fast höjd och plats.
- Nästa strid står i förrådet ("Next battle · Hagstumosse · Ishallen · Day 5"), förrådet öppnar på den sektorn och Deploy-knappen säger sektorn och dagen. Att skicka enheter till en annan sektor frågar först om de lämnar sektorn som strider härnäst, går att ta tillbaka gratis (Bring back) tills Deploy, och Deploy varnar när sektorn har färre än den rekommenderade garnisonen. Allt detta syns bara när två skilda platser är aktiva samtidigt.
- Hagstumosse: Gnesta South och North är samma plats och en sektor, med faserna Hagstumosse · Ishallen och Hagstumosse · Vikingavägen och en gemensam trupp. Vikingavägen öppnar efter Ishallen dag 5. Omplaceringen, garnisonen och trycket mellan dem är borta (vilande i koden). Gnesta Centrum står som grå platshållare på kartan. Sparfilen slår ihop trupperna, lagret och trycket (inga enheter förloras) och sparar en kopia under horde.save.v4.
- Textgenomgången: introna är en rubrik och en rad, ledningens meddelande bara på kartan, resultatskylten utan RP före förrådet, E4 "secure" i stället för "fallen silent" och utan kryss, "Frontage full." i stället för "(research More positions)", raden om U är borta, "Only on the marked spots." på E4, "Next wave · 14 still out", vägetiketterna står kvar vid infarten med gatunamnet vid hovring, Return frågar "Return it? No RP back.", kartan visar enheterna som ikoner med antal och bara senaste meddelandet.
- Balansen följer upplåsningen och förrådets lager: nya siffror för E4 dag 1 till 3 och South dag 1 och 2, nya fingeravtryck och kvitton (docs/balance-log.md, 0.16.0). Prov: tests/onboarding.test.js (schemat, texterna, sparfilens migrering, E4 dag 1, sammanslagningen) och nya prov i tests/operation.test.js (lagret, uppgraderingarna, garnisonen, skicka och ta tillbaka, varningen).
- Skärmbilder: docs/onboarding-*.png.

## 0.15.0 (2026-10-16)

Bana 1, Sector E4, är trafikplats 137 Lästringe i Södermanland (Olas önskan: "känns som amerikansk öken, inte Sörmland").

- Kartan (src/data/e4-lastringe.js) är ritad ur karta, satellitbild och gatubilder: E4:s två körbanor diagonalt genom skogen, avfarten och påfarten som går ihop i en stam upp till T-korsningen med väg 800, väg 224 norrut, busshållplatsen med rastfickan och en skogsväg. Horden kommer längs motorvägen ur diset från Nyköping och går upp för avfarten. Vägspärren står där stammen möter väg 800.
- Banan är ett rutnät som Gnesta. Dag 1 har en enda väg (en knäckt långtradare och en bilkö står tvärs över motorvägen mellan ramperna); dag 2 kommer en andra grupp från Södertälje uppför påfarten; dag 3 kommer bjässarna från båda hållen. Ingångarna ligger i diset längs E4. Kameran går att panorera och zooma, och längst ut ryms hela trafikplatsen i 1440 x 900.
- Sörmland i stället för öken: samma sol, dis, gradering och spöklager som Gnesta. Tät gran- och tallskog med björk i brynet, åkern i väster, äng med högt gräs, stenblock, diken. Vägräcken, höga belysningsstolpar, vita kantlinjer, spärrområden i sicksack där ramperna går ihop, "800" och pilar på väg 800. Gröna skyltar för motorvägen (HELSINGBORG, NYKÖPING, SÖDERTÄLJE, 137 S LÄSTRINGE), blå för övriga vägar (GNESTA, S LÄSTRINGE, SÖDERTÄLJE 45, VÄSTERLJUNG, GRANLUND) och 110. Övergivna bilar, utbrända och en på taket, långtradaren och en buss vid hållplatsen.
- Vägspärren (basen): betongsuggor, bom, sandsäckar, vaktkur, en lastbil och en pansarbandvagn (render/models.js roadblockModel).
- Ställa ut: vägrenarna, skogsbrynet, åkern, ängen, rastfickan och asfalten på väg 800 och 224, runt korsningen och längs rampen. Rampen och stammen är där taggtråd och betong läggs. Infanteriet tar skydd i diket och bakom vägräcket.
- Balansen räknad om för den längre vägen: hp dag 1 3,2 (var 3,0), dag 2 3,6 (var 4,0), dag 3 1,2. Nya fingeravtryck för hela kampanjen och nytt kvitto för E4 dag 2 (docs/balance-log.md, 0.15.0).
- Visningssidan har vägspärren, vägräcket, belysningsstolpen, skyltarna, bilarna, långtradaren, bussen, granen, tallen, björken, stenblocket och det höga gräset, på gräs i stället för ökendamm. Den gamla öknens byggare (jord, döda träd, ruinen, telefonstolparna) är borta.
- Proven för vägen, hindren och vapnen mäter på den gamla raka vägen, nu en provbana (tests/fixtures/straight-road.js).
- Skärmbilder: docs/e4-lastringe-*.png.

## 0.14.2 (2026-10-16)

Efter speltestet av 0.14.1 (docs/playtests/2026-10-16-0.14.1.md, "SPELBART: JA" med irritationer kvar), todo H174 till H181.

- Placeringen i Gnesta (H180). Medan en enhet hålls i handen ligger ett svagt ljus på marken där just den typen får stå, inom 20 m från pekaren. Står pekaren på en ruta som inte går snäpper spöket till närmaste ruta som går inom 3 m (var 2,3), och en platt pil går från pekaren dit. Skogsbrynet går att stå i: tät skog börjar 6,5 m från gatukanten (var 3,5). Träden ritas först 4,5 m in och är låga där, så den första glesa raden är bryn och inte skog; de fälls i bilden när något ställs ut bredvid dem. Djupare in är det stängt som förut (beslutet i src/data/gnesta.js och docs/balance-log.md).
- Förrådet (H174). Enhetsraderna har fast höjd och fasta platser för Level, Refill och Return; där Refill var står "Full" efter köpet, så att nästa klick hamnar på samma knapp. Omplaceringen ligger uppe till höger i raden. Varje kolumn rullar för sig och behåller sin rullning när något köps. Knapparna har förrådets egen storlek igen (de ärvde 16 px).
- Sektorns slut (H175). VICTORY står ensam, sedan siffrorna, sist sektorns berättelse som ett radiomeddelande i en egen ruta ("Radio · Försvarsmakten to all units ... Out."). En evakueringsdag visar "Civilians safe 15 of 20" i stället för "Waves cleared 1 of 3".
- Evakueringen (H176). Rombens storlek skuggades i koden av en annan variabel, så den växte aldrig med zoomen; nu gör den det (ungefär tre gånger så stor på normal zoom), har en mörk kant och starkare gul färg. De civila är en fjärdedel större och ringen under dem växer med zoomen. En civil som faller får ett rött kryss som står kvar dagen ut och syns genom husen. Märket "Civilian lost" syns från första bildrutan och står i 5 s (det började genomskinligt och hann aldrig tona in med låg bildtakt). Dagens kamera tar med ishallens hörn, så att hallen och de civilas väg syns vid start.
- De frivilliga och Hemvärnet (H181). De frivilliga bär gul varselväst med två reflexband och har en större varselgul ring under sig; de civila som evakueras ser ut som förut. Hemvärnets hjälmband är bredare och varje man har ljusa armbindlar.
- R-flaggan (H178) för mål utanför vinkeln är ungefär tre gånger så stor, med en vridpil och mörk kant, och försvinner direkt när pjäsen vrids.
- Minikartan (H179) ritas om med den nya simuleringen när en dag eller ett nytt försök börjar; förra försökets pjäser, horde och pingar syns inte längre. Prov: tests/minimap.test.js.
- E4 (H177). Spärren släpper in en i taget (3,2 s, som ishallens dörrar): de som når fram står vid bommen och går att skjuta, och en förlust tar minst en minut. Dag 2:s löpare kommer i fler och mindre klungor och hp är 4,0 (var 4,4): utan köp i förrådet vinner man nu med skada (förut förlorade man på sekunder). Dag 3 ger hälften så mycket förnödenheter per dödad (förut över 1 000 dollar som inte gick att använda) och hp 1,2. Nya fingeravtryck och nytt kvitto för E4 dag 2, prov för E4:s tempo (docs/balance-log.md, 0.14.2).
- `__horde.jump(bana, dag)` med ?debug, som Jump to i debugmenyn.

## 0.14.1 (2026-10-16)

Rättningarna efter granskningen av 0.14 (docs/reports/review-0.14.md, Must fix 1 till 6) och speltestet av 0.14.0 (docs/playtests/2026-10-16-0.14.0.md, "SPELBART: NEJ").

Granskningen:
- Gnesta dag 1 kunde låsa sig bakom spelarens egna spärrar. När flödet går genom en spärr (ingen öppen väg finns) klättrar de civila över på 5 s, när de står vid den; med en öppen väg runt spärren klättrar ingen och spärren vid rondellen beter sig som förut. Första klättringen säger till ("No way round: civilians are climbing over your barricade."). Prov: en ring av betong runt ishallen avgörs alltid, också med dagens riktiga vågor.
- Simuleringens kvitto (tests/sim-receipt.test.js): fast styrka, forskning, rutor och spärrar på E4 dag 2, Gnesta South dag 3 och Gnesta North dag 2, utan RP och utan balansskriptets policy. Det rör sig bara när simuleringen gör det. Vakterna i balance-op-normal är tillbaka: gradvis fall (minst 60 s), högst 250 levande, första skottet inom 60 s, dagens längd.
- RP-avtagandet räknar bara riktiga förluster (losses per dag i sparfilen). Restart day och Main menu byter fortfarande seed men kostar ingen RP. En sparfil från 0.14.0 börjar med noll förluster.
- Return i förrådet frågar först och säger vad som händer ("Return Infantry L1? Given by command, so no RP back. Sector E4 keeps 2 units."). Sektorns sista enhet nekas om den var skänkt (0 RP tillbaka): "Last unit".
- En pjäs med mål utanför vinkeln säger det: efter 3 s sysslolös med zombier i sikte men utanför vinkeln (simuleringens idleOutside) står en gul flagga "R" över pjäsen, panelen säger "Target outside arc. Press R to rotate.", och minikartan pingar första gången. Klick på flaggan väljer pjäsen.
- Myndigheten för civilt försvar (ersatte MSB 2026-01-01, kontrollerat mot regeringen.se) skrivs ut med hela namnet; förkortningen är inte kontrollerad och används inte. Ledningens meddelanden börjar inte längre med avsändarens namn ("Försvarsmakten: Försvarsmakten holds..." blev "Försvarsmakten: We hold...").

Speltestet:
- Evakueringen syns. Dagen börjar med kameran över hela de civilas väg, från husen till ishallen; vägen är en gul pillinje; varje civil har en gul romb över huvudet som syns genom husen; en civil som faller får ett märke där det hände ("Civilian lost", vid skärmkanten om det är utanför bild) och en gul ping på minikartan. Rutan nere i mitten: "Evacuated 7 / 13 needed · Lost 2 / 7" med en stapel. Husen B4-13 och B4-02 långt österut är bytta mot B3-03 och B3-02 närmare rondellen, så att vägen ryms i bild (docs/balance-log.md, 0.14.1).
- Spelarens frivilliga heter Volunteers (var Civilian volunteers / Civilians), så att de inte blandas ihop med de civila som evakueras. Introt för Gnesta dag 1 är kortare.
- E4:s tempo: dag 1 längre och lite tyngre, dag 2:s löpare i tre klungor i stället för ett stup på 74 fiender i våg 3, dag 3 en aning lättare. Nya fingeravtryck (docs/balance-log.md, 0.14.1).
- Sikta-dra: tryck är pjäsens punkt, drag är riktningen, släpp bekräftar. Det var redan tänkt så, men rutan togs från den senaste bildrutans pekarläge; i låg bildtakt eller med tryck i samma bildruta som pekaren flyttades var den gammal eller saknades, och då ställde släppets klick pjäsen där man släppte. Nu tas rutan från själva trycket. Medan man drar står "Unit here" vid pjäsens punkt och en linje går därifrån till pekaren.
- Flödet: operationskartan, Requisition (förrådet för sektorn, ett steg med "Operations map › Requisition › Deploy day N"), Deploy, introt (knappen heter To the line) och linjen. Bara en knapp leder till uppställningen. Try again går genom förrådet, där RP:n från förlusten kan användas.
- Förrådet står fast upptill och dess kolumner har fast höjd, så att ingenting hoppar under pekaren när listan ändras; rubriken ger plats åt menyknappen.
- Sista dagen i en sektor: rubriken VICTORY, "Day 3 held. Sector E4 is done." och sektorns berättelse för sig under resultatet, med att armén drar tillbaka det som är kvar och att RP:n lämnas tillbaka.
- Enter på förlustskylten är Try again (den markerade knappen).
- Notiserna staplas i en kolumn och köas (högst tre åt gången, samma text visas en gång).
- Skälet vid pekaren ("Tile already taken") står där pekaren var när det hände; pekaren följs i hela fönstret.
- Vågens rad och räknaren räknar samma zombier: de vilande i husen ingår i vågen de slås upp i, räknaren säger "8 of 12 left" under vågen och "14 coming" före. Prov för varje våg på varje bana.
- Minikartan ritar den nya banan direkt (E4:s karta syntes de första sekunderna i Gnesta).
- `__horde.advance` finns också med ?test (bara klockan och läget, inget låses upp).

## 0.14.0 (2026-10-16)

Operation Södermanland (docs/superpowers/specs/2026-10-16-operation-design.md, godkänd av Ola 2026-10-16). Forskningen och köpen av trupp i striden är borta; ledningen släpper trupp och materiel pö om pö, och man bygger upp en styrka som följer med mellan dagarna.

- Två valutor. Rekvisitionspoäng (RP) är permanenta: dödade, klarade vågor och uppdraget (25, och 2 per räddad civil). Fjärde försöket på samma dag ger 60 %, femte 40 %, sedan 25 %. Bonus vid vinst: snabb seger (nästa våg kallad tidigt minst hälften av gångerna) +15 %, få förluster +15 %, oskadad bas +20 %. Förnödenheterna är pengarna i striden, en egen summa per dag och hälften så mycket per dödad som förut. De köper barrikader, taggtråd, skrotbilar (nya: billigare och svagare än betongen, vrak tvärs över gatan), granatlådor, ammunitionslådor (+20 % eld resten av dagen) och sandsäckar (grupperna tar 35 % mindre skada).
- Förrådet ersätter forskningen. Försvarsmakten och MCF (Myndigheten för civilt försvar) skickar meddelanden när en dag blir spelbar: E4:s vägspärr med infanteriet och två Ksp 90, pillboxen dag 2, Ksp 88 dag 3; Gnesta South de civila dag 1, Hemvärnet och Ksp 90 dag 2 (och handgranaterna), Ksp 58 och Ak 5 dag 3, pillboxen och Psg 90 dag 4, Ksp 88 dag 5; Gnesta North sina egna och infanteriet från dag 3. Det som är släppt i en sektor går att rekvirera dit med RP. Forskningens nivåer finns kvar som förrådets uppgraderingar (samma siffror och priser), Bigger budget heter Supply budget; More positions och More squads finns inte längre.
- Kärntrupper. Det man rekvirerar följer med mellan dagarna. Erfarenhet: en stjärna efter tre vunna dagar ute (+5 % träff, 8 % snabbare omladdning). Förluster följer bara med vid vinst: stupade är borta, en förlorad pjäs är borta, och påfyllnad kostar RP. Vid förlust börjar dagen om med den styrka man gick in med, och RP:n behålls. Tillbaka till förrådet ger hälften av det som lagts; omplacering mellan sektorer är gratis där typen är släppt. När E4 tystnar drar armén sig tillbaka och RP som lagts där lämnas tillbaka; när Gnesta South håller blir dess trupper fria att omplacera.
- Uppställningen. Före första vågen ställs kärntrupperna ut med samma placering som förut (bågar, klicka och dra för att sikta). Köpraden visar då reserven ("×2 ready", gratis) och förnödenheterna, sedan bara förnödenheterna. Frontbredden (6 på E4, 8 på Gnesta South, 9 på Gnesta North) säger hur många enheter som får stå ute; resten väntar. Ett första tryck på Start wave med enheter kvar i reserven säger till. Under striden finns Move, Rotate, granatlådan, ammunitionen och sandsäckarna; ingen uppgradering, försäljning eller påfyllnad.
- Uppgraderingarnas pris (beslutat i bygget): enheternas nivåer (nivå 2 och 3) kostar RP mellan dagarna i förrådet; granatlådor, ammunition och sandsäckar kostar förnödenheter i striden.
- Operationskartan. Menyn leder till en mörk lägeskarta över Södermanland i minikartans stil: E4, Gnesta South och Gnesta North med läge (håller, hotad, tystnad, håller ut) och tryck, Mölnbo, Trosa och Nyköping gråa. Inkorgen med ledningens meddelanden ligger där, liksom vägen till förrådet och nästa dag. Gnesta North öppnar efter South dag 4: en sektor man inte spelar i får en tryckpunkt per vunnen dag någon annanstans (+6 % hp per punkt, högst 5) men faller aldrig; en vunnen dag där tar bort två. Inget svårighetsval.
- Flödet: meny, operationskartan, förrådet, introt (leveransens meddelande, förnödenheterna, reserven och trycket), uppställningen, striden, resultatet (RP rad för rad, förlusterna) och tillbaka till kartan, eller Try again med samma styrka.
- Sparfil v4. En äldre sparfil (v1 till v3) kopieras först till horde.save.v1, .v2 eller .v3 (skrivs aldrig över). Forskningspoängen blir RP ett till ett; nivåerna följer med; More positions, More squads och vapnens första nivå (nu leveranser) lämnas tillbaka som RP till samma pris. Kärntrupperna fylls i efter hur långt spelaren kommit (leveranserna fram till dagen). Inget raderas.
- Debugmenyn: RP i stället för intel, förrådets förval (None, Arrival, All) i stället för forskningens, och Jump to räknar sektorerna före som klara så att trupperna finns där.
- Balans: scripts/balance.mjs spelar hela kampanjen med försök, RP, kärntrupper, leveranser och rekvisition för en skicklig och en normal spelare över fem seeds. Den skickliga klarar varje dag på första försöket, den normala inom 1 till 3. Nya hp per dag och fingeravtryck per kampanjsteg (docs/balance-log.md, 0.14.0).

## 0.13.0 (2026-10-16)

Kampanjpasset (H104, H105, H130 till H136). Byggs före operationskartan (docs/superpowers/specs/2026-10-16-operation-design.md), och forskningen finns kvar tills dess.

- Skjutvinklar (H132): Ksp 90 skjuter inom 180 grader och vrider snabbt, Ksp 58 120, Ksp 88 90 och vrider långsamt, Psg 90 75, pillboxen 90. Infanteriet, Hemvärnet och de civila är rörliga per soldat. Ett mål utanför vinkeln skjuts inte, och pipan vrids i vapnets fart innan den skjuter. Vid placeringen: klicka och dra för att sikta (vinkeln syns medan man drar), ett vanligt klick vänder pjäsen mot hordens väg. Rotate i panelen eller R vrider vinkeln dit pekaren pekar; pjäsen vrids i sin egen fart och skjuter inte under tiden. Hordens väg slås av och på med V (var R).
- Riktig förflyttning (H134, H136): M flyttar pjäsen eller gruppen under pekaren (minikartan slås av och på med Tab, var M). Laget går en riktig väg över gator, tomter och gräs, aldrig genom hus. Vanligt klick tar kortaste vägen, Shift-klick lägger till waypoints (vägen ritas som en streckad linje), och vid slutpunkten ger klicka och dra riktningen. Ksp 90-laget (skytt och ammunitionsbärare) packar på 3 s, springer med pjäsen och lådorna och ställer upp på 3 s; Ksp 58 är tre man och långsammare; Psg 90 skytt och observatör smyger; infanteriet, Hemvärnet och de civila springer. Ksp 88 är monterad och kan inte flyttas ("Mounted, can't move"), bara säljas. Den som flyttar skjuter inte, syns springa med vapnet och kan slås ner av zombier (laget har liv; faller det är pjäsen förlorad). Befästningen ligger kvar på den gamla platsen.
- Infanterigruppen (H130): fyra man med Ak 5, bättre skytte och mer liv än Hemvärnet, dyrare ($ 450). Samma skydd, ställningar och tomgångsliv. Uniformen är m/90 med skyddsväst, hjälm 18, knäskydd och svart Ak 5C; Hemvärnet behåller det ljusa hjälmbandet och Ak 4 med trästock.
- EPA-pillboxen (H135, ersätter betongbunkern i H133): en gammal A-traktor med svetsade plåtar i olika färger, rost, skottgluggar, Ksp 58 i takluckan och LGF-triangeln kvar bak. Tålig, zombierna slår på den (pansaret står i panelen, röken kommer när det är lågt), 90 graders glugg, svetsas ihop på 6 s innan den skjuter, kryper i en fjärdedel av infanteriets fart. I lookbooken med infanteriet, de civila och lagen som bär sina pjäser.
- E4 är den militära vägspärren (H104): inget Hemvärn; infanteriet, Ksp 90, Ksp 88 och pillboxen från början, som en övning. Sektorns slut: "The roadblock at E4 has fallen silent. Gnesta has only its Home Guard."
- Gnesta dag 1, de civila (H105): frivilliga med jaktgevär och hagelbössor (billiga, svaga, samma skydds-AI), barrikader och tråd. Uppdraget "Hold until the civilians reach the ice rink.": 20 civila kommer ut ur fem villor och går hordens väg till ishallen; 13 måste in. Rutan nere i mitten räknar framme, på väg och förlorade. Hemvärnet kommer dag 2, sedan armén pö om pö (Ksp 58 och Ak 5 dag 3, Psg 90 och pillboxen dag 4, Ksp 88 dag 5, infanteriet på Gnesta North från dag 3). Köpraden visar bara det som finns i förrådet, och snabbvalen räknas på det; introt säger vad som kommit i dag.
- Balans: alla tre sektorerna omgjorda för vinklarna och förrådet, policyerna vrider sysslolösa pjäser, nya kvitton (docs/balance-log.md, 0.13.0).

## 0.12.2 (2026-10-16)

Efter Olas speltest av 0.12.1.

- Upgrade grå fast pengarna räckte (Ksp 88 nivå 1, $ 450 med $ 1 264 mitt i en våg på North): knappens grå läge sattes med classList.toggle('off', villkor) där villkoret blev undefined för alla pjäser utom Hemvärnet. toggle utan sant/falskt växlar klassen, så knappen blinkade grå och vit varje bildruta och såg grå ut. Klicket gick hela tiden igenom. Nu räknas läget i en ren funktion (upgradeState) som alltid ger sant eller falskt, och när knappen inte går står skälet på den: "Need $ 50 more", "Max level", "No room" eller "Day over". Prov i tests/upgrade-state.test.js.
- Gnesta North: varje dag har en egen idé och en rad i intro, och våg 1 kommer från olika håll. Dag 1 norrifrån (väster först, löpare i ryggen sist), dag 2 kniptången (två kolonner samtidigt, löparsvärm), dag 3 bjässarna först (husen på Valsvägen och förskolan), dag 4 flanken genom radhusen från Östra Storgatan (och ett oannonserat hus vid ishallen sent i sista vågen), dag 5 hela stan (alla håll, löpare, bjässar, ett oannonserat hus och väster i ryggen). Vilande hus kan slås upp sent i en våg (delay), och en grupp kan säga till när den kommer ("Behind you, from the west!"). Lite svårare; mätt med policyerna vid balansens och den realistiska ankomstens forskning (docs/balance-log.md, 0.12.2).
- Hemvärnet ser riktigt ut: den liggande vrider sig runt höften (högst 90 grader i sekunden) och kryper medan han vänder, i stället för att snurra. Han skjuter bara inom 120 grader runt sitt skydd; ett mål utanför får honom att resa sig på knä och vända sig, eller tar en annan man det (simuleringen, med prov). På knä och huk vrids överkroppen först och benen följer. Ställningarna varierar inom gruppen (huk, knä, liggande efter skyddet), aldrig en klonad grupp. När de inte skjuter andas de, svajar, flyttar vikten, spanar med huvudet och laddar om ibland.
- Debugmenyn (Olas önskan): fem snabba klick på versionsnumret, eller knappen DEBUG med ?debug. Läget (intel, forskning: none, arrival, all, kassan, basen, god mode, hoppa till bana, dag och våg, lås upp alla banor, Reset save med kopia i horde.save.backup), reglarna (zombiernas hp och fart, antal, pengar och forskning per död, nedräkningen; sparas i horde.debug, aldrig i sparfilen), spawn (vandrare, löpare eller bjässar vid en ingång, slå upp ett hus) och bilden (sikten, rutnätet, horden väg, fps och ritanrop, minikartan). "DEBUG TWEAKS ON" står uppe i mitten så länge någon regel är ändrad. Simuleringen tar emot reglarna som ett objekt som är identitet som standard; balansproven kör utan dem, och ett prov visar att identiteten inte ändrar något.
- Balans: nya kvitton för Gnesta North (omgjorda dagar) och Gnesta South (Hemvärnets båge), E4 oförändrad (docs/balance-log.md, 0.12.2).

## 0.12.1 (2026-10-16)

Rättningarna efter speltestet av 0.12.0 (docs/playtests/2026-10-16-0.12.0.md, "SPELBART: NEJ"). Testarens panel gick i ungefär 0,3 gånger normal takt, så svårighetsomdömet är osäkert; buggarna var riktiga.

- Pengar som inte gick att använda (H119): Hemvärnet räknas inte längre mot pjäsernas platser utan har ett eget tak, två grupper, och den nya forskningen More squads ger tre och fyra. Taggtråd och barrikader har inget tak. Gnesta South och Gnesta North har fem pjäser från början (var fyra); More positions ger en till per nivå på varje bana. Köpraden räknar bara pjäserna ("GUNS 2 / 6"), Hemvärnets kort säger "All squads out" när taket är nått.
- U uppgraderar pjäsen under pekaren utan att panelen öppnas (annars den valda), och svaret står vid pekaren ("Ksp 90 level 2"). Panelens Upgrade visar U.
- Psg 90 på tak (H120): pekaren på en byggnad ger byggnadens bästa utsiktspunkt närmast pekaren, aldrig marken bakom. Vid pekaren står ROOF eller GROUND (och "ridge by the chimney" eller "flat part" när spöket snäppte), och spöket har takets ställning (signalduken) eller markens (säckringen). Ett tak utan utsiktspunkt säger varför: "Roof too steep, try the ridge by the chimney".
- Sektorn ritas på marken (H121), så att husen och taken skymmer den som allt annat på marken.
- Uppdragsrutan (H121) går att fälla ihop (–), visar bara steget som gäller nu medan något hålls i handen och tonas bort när pekaren står över den.
- Vilande hus (H122): en pulserande röd ram runt dörren och fönstret och ett litet "!" ovanför huset, lika stort på skärmen på varje zoom. Minikartans ping finns kvar.
- Etiketterna (H123): ingångarnas etiketter undviker pjäserna och soldaterna, tonas ned om de ändå hamnar över en, och reserven vid kanten undviker också gränssnittet (uppdragsrutan, minikartan). Ordningen är alltid walkers, runners, brutes.
- Esc (H124) gör ingenting på resultat- och introskylten; bara forskningen stängs med Esc.
- Resultatet efter en förlust (H125) säger "Earned 141 research points this attempt" i stället för "You keep 141", som stod kvar när poängen var spenderade.
- Barrikaden (H126): "Barricade failing" räknas på spärrens svagaste ruta. Förut räknades summan av rutorna, och när den första rutan gick sönder hoppade summan upp igen, så varningen kom sällan eller aldrig. Stapeln visar den svagaste rutan. Varningen är en händelse i simuleringen (barricadeFailing), med prov, och verifierad i webbläsaren med en tvingad spärr.
- Balans: nya kvitton för Gnesta och Gnesta North, E4 oförändrad (docs/balance-log.md, 0.12.1).

## 0.12.0 (2026-10-16)

Nya mekaniker (H098 till H102, H106 till H108) och rättningarna efter speltestet av 0.11.0 (docs/playtests/2026-10-16-0.11.0.md, "SPELBART: NEJ").

- Vilande smittade i husen (H101): en dag kan ha hus med 3 till 5 smittade. Dagintrot säger "Intel: dormant infected reported on Sigtunavägen.", huset har en svag röd ton på dörren och ett fönster och en ping på minikartan. När vågen börjar slås dörren upp (ljud, flisor, dörren flyger ut) och de kliver ut på gatan och följer horden. Gnesta South dag 1 och 2 och Gnesta North dag 1 har förvarnade hus, så första skottet kommer inom 10 till 15 s (H110); dag 3 på Gnesta South har ett hus utan förvarning i våg 2 ("Infected breaking out of a house!").
- Flytta (H102): Move i panelen. Pjäsen packas ihop, bärs och ställs upp (Ksp 88 15 s, Ksp 90 och Ksp 58 8 s, Ak 5 5 s, Psg 90 10 s) och skjuter inte under tiden; Hemvärnet springer och kan slås ner på vägen. Uppgraderingar och granatlådan följer med, den gamla befästningen ligger kvar och den nya platsen befästs. Samma spöke och regler som ett köp. Sälj ger fortfarande 60 %.
- Värnet anpassar sig (H098): pjäserna och säckringen vänds mot hordens väg, säckar läggs bara där det saknas skydd (husknut, vägg, tegelmur, häck, staket, bil) och pjäsen trycker sig mot skyddet framför sig. Samma plats ger alltid samma värn. Före och efter: docs/0.12.0-varn.jpg.
- Skymda enheter (H099): en pjäs eller grupp bakom ett högre hus får en tunn siluett i lagets färg (bara där den skyms) och en liten flagga som går att klicka på. Syns enheten ritas inget extra.
- Prickskytten (H106 till H108): Psg 90 ligger bara på riktiga utsiktspunkter: platta tak (garagen, förskolan, ishallen med tillbyggnaden, sporthallen) och nocken intill en skorsten (villor och radhus). Skytten följer takets lutning och inget går genom taket. Sikten räknas med husens höjd för alla pjäser: från ett lågt tak ser man över låga villor nära, en tvåvåningslänga skymmer, ett högt tak ser längre; på marken är ögat 1,5 m upp. Psg 90 har en skjutsektor på 75 grader som vrids med hjulet eller Q/E när den ställs ut (och när den flyttas), och skjuter bara inom den. Inget vattentorn eller kyrktorn: inget sådant finns inom kartan.
- Taktisk minikarta (H100): uppe till höger under kassan. Gatorna, ett rutnät med koordinater, den aktiva kartans kant, ingångarnas pilar, horden som röda prickar med svans, pingar för förvarnade hus och barrikader som går sönder, pjäserna som små NATO-lika tecken, basen och kamerans ruta. Klick eller drag flyttar kameran; M slår av och på.
- Placeringen (speltestet, H113): skälet står vid pekaren, också efter ett nekat klick. Orsaken till var tredje misslyckad placering: gatan ritas med sin riktiga bredd men rutnätet har 2 m-rutor, så pekaren på den synliga vägytan låg i ungefär var sjätte fall i en ruta som inte var gata (och en pjäs vid gatukanten i en gaturuta). Nu tas närmaste ruta inom 2,3 m som går. Tråd och barrikad går att lägga på grus- och cykelvägar. Spöket syns genom tak och hus (svagare där det skyms).
- Barrikaderna (H114): en skadad spärr har en liten stapel, "Barricade failing" vid en fjärdedel kvar (med ping på minikartan), och när den går sönder "Barricade down. They are taking another way." och den nya vägen blinkar.
- Gnesta Norths öppning kommer ur diset (H115): Sigtunavägen fortsätter västerut ut i dimman och ingången heter "Sigtunavägen west". Provet täcker nu varje bana, ingång och våg.
- Tvåstegsvalet (H116): en öppen kategori väntar alltid på andra siffran ("1", paus, "1" ger barrikaden). Bara Esc eller ett klick utanför köpraden stänger.
- Zoomen (H117): längst ut ryms hela den aktiva kartan på 1440 x 900.
- Pengar över (H118): U uppgraderar den valda pjäsen, och när alla platser är tagna och kassan räcker säger spelet det en gång.
- ?mute: spelet startar helt tyst (inget ljud skapas alls) utan att röra de sparade inställningarna.
- Balans: Gnesta dag 2 mjukare (hp 5,7) och dag 5 4,0; Gnesta North omvägd för sikten, sektorn och flytten. Nya kvitton för Gnesta och Gnesta North, E4 oförändrad (docs/balance-log.md, 0.12.0).

## 0.11.0 (2026-10-16)

Efter speltestet av 0.10.2 (docs/playtests/2026-10-16-0.10.2.md) och Olas önskemål samma dag.

- Hordens väg före vågen (H090): under bygget och nedräkningen lyser vägen från varje ingång som nästa våg använder starkare, och varje ingång har en etikett med vad som kommer: "30 walkers · 50 runners" och ingångens namn. Vägen räknas om direkt när en barrikad läggs eller rivs. Under vågen är linjen svagare igen.
- Etiketterna står på gatan (H091): på första punkten längs hordens väg där de ryms i bild utan att täcka gränssnittet eller varandra, inte klistrade mot skärmkanten på ett hustak.
- R syns (H092): "R Horde route ON/OFF" nere till höger på stadsbanorna, och Gnesta dag 1 säger det i introt.
- Ingångarna ligger i diset igen (Olas krav): vägarna fortsätter ut i dimkanten utanför den skarpa ytan och horden kommer ur diset längs gatan, inte mitt i en korsning. I diset går de 2,75 gånger fortare och saktar mjukt in över de sista 8 m, så den första syns i kartkanten inom 10 s. Inget går att bygga i dimkanten.
- Zoomen ut till 84 m igen (som i 0.4); utzoomade ritas zombierna upp till 30 % större.
- Gnesta North öppnar söderifrån (Olas idé, H093): våg 1 varje dag är en liten grupp eftersläntrare på Sigtunavägen förbi ishallen, så det finns något att skjuta på inom 10 till 15 s. När våg 2 börjar: "They're coming from the north now."
- Sektorerna (Olas önskan): banorna heter Sector E4, Gnesta South och Gnesta North (id:na är desamma). Vinsten på sektorns sista dag visar en kort text om vart horden är på väg, och knappen leder rakt in i nästa sektors dag 1 (Enter).
- Köpraden i två kategorier med tvåstegsval (Olas önskan, H097): 1 Defenses (1-1 Barrier, 1-2 Wire), 2 Units från svagast till starkast (2-1 Hemvärnet, 2-2 Ksp 90, 2-3 Ksp 88, 2-4 Ksp 58, 2-5 Ak 5 + Grt, 2-6 Psg 90). Första siffran tänder kategorin, andra tar saken; Esc eller samma kategori igen backar; klick på kortet som förut. Ordningen bor på ett ställe (BUY_MENU).
- Korten visar alltid en kort statistikrad, hela raden vid hovring (H096).
- Esc strax efter ett köp öppnar inte pausmenyn, och "On the road" försvinner när placeringen är slut (H095).
- Räckviddsringarna och Hemvärnets ringar skyms av husen (H094); gruppen syns i skugga på ett ljust hjälmband som lyser svagt.
- Balans: Gnesta och Gnesta North omvägda för de nya ingångarna och öppningen, nya kvitton (docs/balance-log.md, 0.11.0).

## 0.10.2 (2026-10-16)

Putspass efter speltestet av 0.10.1 (docs/playtests/2026-10-16-0.10.1.md).

- Gnesta dag 2 är ett steg upp från dag 1, inte en vägg: hp-faktorn 5,0 (var 5,8), våg 1 46 vandrare med norra gruppen först efter 10 s (var 60), våg 2 30 löpare (var 40), våg 3 130 (var 160).
- Pilarna "They come from here" visar ingångarna som används i vågen som är igång eller kommer härnäst, en pil per ingång, där hordens väg kommer in i bild och i gångriktningen. Ingången som nästa grupp kommer från står med namn: "Next group · Sigtunavägen öst".
- Hordens väg är roströda pilar som flyter mot basen, svagt, från varje ingång som används nu. Förhandsvisningen när en spärr hålls över gatan är orange streck. R slår av och på som förut.
- Tempo: de första i dagens första grupp har redan gått en bit när vågen startar, så första skottet kommer efter 15 till 20 s (var 35 till 45) på Gnesta och på Gnesta Norr dag 1. Nedräkningen mellan vågorna är 15 s (var 10); bonusen 2 per sekund som är kvar, så Next wave tidigt är fortfarande det snabba valet.
- Gnesta Norr: första gången nästa våg räknas ned medan den förra fortfarande går står det "Waves overlap here. Keep the line."
- Köpraden ryms på en rad ned till 1024 px (smalare kort). Tipset är minst 13 px och varje vapen har en statistikrad i samma form: "DMG 10 · RNG 19 m · RATE 7/s".
- Fartknappen står nere till höger under hela dagen, även under vågen. Knappen och vågens rad ställer sig mellan köpraden och fartknappen och kortar sin text när de inte ryms.
- Hemvärnets ringar syns genom trädkronorna, ljusare och med mörk kant. Psg 90 på ett tak ligger på en orange signalduk med en ljus ring runt.
- Forskning: Psg 90 kräver Ksp 88 I (var II) och kostar 180 (var 200), vägen dit 280 i stället för 420. Texterna säger vad nivån gör: More positions "One more gun on every map: 5 instead of 4", Ksp 88 och betongbarriären att Gnesta lånar ut dem men att köpet gäller alla banor, granaternas skada och radie, budgetens "was $ 150". Ett nytt prov läser varje nivås siffror och kräver dem i texten.
- ?debug på Gnesta Norr ger forskningen för en spelare som vinner varje dag på första försöket (20 nivåer, fem platser), inte smart policy med alla förluster (23 nivåer, sex platser).
- Balans: nya kvitton för E4, Gnesta och Gnesta Norr, se docs/balance-log.md (0.10.2).

## 0.10.1 (2026-10-16)

Rättningarna från granskningen av 0.10 (docs/reports/review-0.10.md) och speltestet av 0.10.0 (docs/playtests/2026-10-16-0.10.0.md), före publiceringen.

- Hemvärnet: gruppen blir aldrig mindre än spelaren betalar för. Kollen vid placeringen räknar med Bigger squad (en grupp på sex man får inte läggas där bara fem får plats), och en uppgradering som ger en man till nekas när han inte får plats ("No room for one more rifleman here"), utan att något dras.
- Fil-vakten gäller alla rutnät (Gnesta också): ingen zombie väljer en siktpunkt uppströms, och ett nytt prov säger till om en levande zombie står still i 10 s utan att slå på något.
- Laddningsskydd: hela modulgrafen laddas med ?v=VERSION genom en import-karta i index.html (scripts/importmap.mjs skriver den, ett prov säger till när den inte stämmer), och ett fel när sidan laddas visar "A new version was loaded." med en knapp som laddar om.
- Skärmbilderna i docs krympta till högst 1200 px och under 250 kB, med samma namn. De stora originalen är borttagna även ur grenens opublicerade historik.
- Kortare dagar: nedräkningen mellan vågorna är 10 s (var 5), med bonus 3 per sekund som är kvar. Gnestas ingångar ligger längre in längs vägarna och första vågen börjar med fem löpare, så första skottet kommer efter knappt 40 s (var 110). Dag 4 och 5 på Gnesta och alla dagar på Gnesta Norr låter nästa våg börja medan den förra fortfarande är på väg. Zombierna på Gnesta Norr går en fjärdedel fortare (vägen är 400 m). En dag är nu 4 till 8 minuter vid 1x (var 7 till 20).
- Ishallens dörrar: de som når entrén tar sig in en i taget (en per 3,2 s) och går att skjuta medan de bankar på dörrarna. Basen faller aldrig på några sekunder.
- En förlust lär något: ett förlorat försök ger alltid minst 60 forskningspoäng (resultatskylten säger hur mycket som kom från det de överlevande lärde sig), nog för en nyttig nivå.
- Gnesta har Ksp 88 från dag 1, som barrikaden. En spelare utan forskning (?debug&fresh) vinner dag 1 på andra eller tredje försöket.
- Gnesta Norr är balanserad mot en spelare som inte köper Hemvärnet, med mjukare hp-faktorer (2,8 till 5,0, var 3,7 till 9,0). Den som köper gruppen varje dag klarar dag 1 till 3; dag 4 är svår för den spelaren (todo H064).
- ?debug ger forskningen en typisk spelare har när banan låses upp (src/data/arrival.js), så att Gnesta och Gnesta Norr spelas som de är balanserade. ?debug&fresh behåller noll forskning.
- Vägen horden tar ligger kvar på kartan hela dagen från varje ingång, tydligare än förut. R slår av och på den.
- Kameran börjar dagen med ishallens entré och vägen från dagens första ingång i bild. På Gnesta Norr sveper den från ingången i norr ner till basen när spelaren går till linjen (klick, hjul eller tangent hoppar över).
- Köpraden är en smal rad med små kort (ikon, namn, pris eller "Need $ X"); pekaren fäller ut kortet med vad saken gör, skada och räckvidd: "Ksp 58 · General MG · 7.62", "Damage 10 · Range 19 m".
- Hemvärnets soldater har en svag ring på marken under sig, så att de syns på Gnestas gräs. Kamouflaget är kvar.
- Forskningen skriver nästa nivå "Level 2: 80" i stället för "II: 80", som lästes som nivån man redan har.
- Esc gör en sak per tryck: kortet i handen, sedan en markering, sedan menyn. Att hålla tangenten nere gör ingenting mer.
- Nya zombier kliver upp ur marken (ingångarna ligger inne i staden nu, inte vid dimkanten).
- Balans: nya kvitton för E4, Gnesta och Gnesta Norr, med siffror, prövade varianter och skäl i docs/balance-log.md (0.10.1).

## 0.10.0 (2026-10-16)

Bana 3: Gnesta Norr. Samma stad som Gnesta, dimman har dragit sig undan norrut. Basen är kvar vid ishallens entré, men horden kommer mest norrifrån.

- Kartan (src/data/gnesta-norr.js) är ritad ur Olas kart- och satellitbild över norra Gnesta, i samma halva skala som Gnesta, med en affin passning mot elva punkter som finns i båda bilderna (felet under 1 m). Allt från Gnesta är med i söder. Nytt i norr: Dansutvägen längs kanten, Vikingavägen från Dansutvägen ner till Fornminnesvägen med fyra stickgator, Fornminnesvägens norra stickgata och förskolans slinga med parkering, Gångvägen (den raka asfaltsgången förbi radhusen ner till Sigtunavägens norra gren), gångarna mellan radhuslängorna, två grusstigar mellan villatomterna, Valsvägen och Hambovägen i nordväst (återvändsgator med villor) och skogsbacken väster om Vikingavägen (sluten skog, ingen stig syns i bilderna). Omkring ligger spökhus i dimman som förut.
- Radhusen öster om Vikingavägen: tio längor på kartbildens platser, en eller två våningar, gult tegel nertill, mörkbrun stående panel upptill och i gavlarna, bruna tegeltak med en skorsten per lägenhet, vita dörrar under takfoten, låga gula tegelmurar mellan förgårdarna, plankstaket mellan baksidorna, gavelträdgårdar och parkeringar med vita vinklar framför längorna mot Gångvägen. Radhustaken går att ligga på med Psg 90.
- Villorna mellan Vikingavägen och Fornminnesvägen och vid Valsvägen och Hambovägen: generiska villor på fotavtryckens platser, var och en på sin tomt med häckar och staket.
- Förskola Ringleken: Gnestas förskola fick färgade skivor vid fönstren och en barnvagnsbod (på båda banorna), och på Gnesta Norr en inhägnad lekgård med lekstuga, gungor, klätterställning med rutschkana och sandlåda.
- Ingångarna: Vikingavägen norr (dag 1), Dansutvägen väster (från dag 2), Östra Storgatan genom radhusen (överraskningen dag 4, bakom den norra linjen) och Sigtunavägen öst (dag 5). Dag 1 lär ut att horden kommer norrifrån: spärra Vikingavägen så tar den Gångvägen förbi radhusen.
- Menyn har tre banor: E4, Gnesta och Gnesta Norr (dag 1 till 5). Gnesta Norr låses upp när Gnesta dag 5 är klar; ?debug låser upp allt. Sparfilen har samma format (v3): en sparfil från 0.9.0 läses som den är, banans framsteg läggs till när den spelas, inget raderas (prov i tests/progress-norr.test.js).
- Hemvärnet i forskningen (H054): Better rifles I till III (Ak 4 hårdare och snabbare), Bigger squad I och II (en femte och en sjätte man) och Hemvärnet veterans I och II (mer liv). Gruppen blir ett riktigt val: med forskningen håller den Gnesta dag 4 i alla seeds, men en pjäs till på samma plats är fortfarande bättre per position. Tegelmurarna är ett eget skydd (på huk, bättre än häck).
- Simuleringen: en fil-vakt för Gnesta Norr där smala gångar möts (zombier kunde pendla mellan två rutor för alltid). Gnesta och E4 påverkas inte.
- Byggsatsen (gnesta-kit.js) har radhuslängan, tegelmuren, plankstaketet, parkeringen och förskolans gård, allt instansierat i samma batch som Gnesta. Visningssidan har en ny rad med radhus i en och två våningar, parkering, förskolan och lekgården.
- Balans: smart och naiv policy för Gnesta Norr över fem seeds, med kvitto. Smart spärrar Vikingavägen, ställer pjäserna i en dödszon vid radhusen och en sista linje vid entrén, en Psg 90 på radhustaket och Hemvärnet vid murarna. Dag 1 vinner smart direkt med full bas och naiv tar skada, dag 2 till 4 vinner smart inom två försök och naiv förlorar, dag 5 är svårast. E4 och Gnesta har samma kvitton som i 0.9.0. Siffror, prövade varianter och skäl i docs/balance-log.md (0.10.0).
- Prestanda (headless, Metal, 1440 x 900): banan byggs på 0,16 s och shaders kompileras på 0,2 s (första besöket 0,39 s, återbesök 6 ms). 44 anrop och 389 000 trianglar med 180 levande zombier, 120 bildrutor per sekund även med strypt processor (4x).
- Skärmbilder i docs/norr-*.png.

## 0.9.0 (2026-10-16)

Hemvärnet: en grupp soldater som själva tar skydd, med Close Combat som förebild. På kortet och i panelen heter de Hemvärnet; den engelska raden förklarar vad de gör.

- Köp: kort 8 i köpraden, $ 250, finns från början. Spelaren släpper en markering (en ring på 8 m) på mark bredvid gatan. Gruppen är fyra soldater med Ak 4 (låg skada per skott, måttlig eld, räckvidd 15 m). Nivå 2 ger en femte soldat och mer liv, nivå 3 bättre gevär. Gruppen tar en position och säljs och uppgraderas som en pjäs; klick på vilken soldat som helst öppnar gruppens panel.
- Skyddet (src/sim/squad.js, deterministiskt): varje ruta inom ringen får poäng för skydd (husknut, bil eller träd, vägg, sandsäckar vid en pjäs eller barrikad, häck eller staket, dike), för hur mycket av gatan den ser (hordens väg väger dubbelt), minus ett avdrag intill gatan och per meter från markeringen. Rutorna väljs en i taget med minst 3 m mellan soldaterna, och olika skydd föredras (en vid husknuten, en vid bilen, en i diket). Inga tak (där ligger Psg 90).
- Ställningar efter skyddet: på huk och lutar sig ut vid husknut, vägg eller bil; på knä bakom häck, staket eller säckar; på magen i diket och på öppet gräs. Varje soldat har sin egen sikt och väljer mål själv. De springer ut från markeringen (1 till 2 s) och skjuter när de är framme.
- Zombierna kan skada soldaterna (bara dem, pjäserna är osårbara som förut): en zombie i en ruta intill en soldat stannar och slår honom. Stupade skjuter inte och ersätts i panelen för $ 60 per man; nästa dag börjar alla om.
- Nya kartdata: diken längs E4 (rutorna närmast asfalten) och längs skogsvägen på Gnesta, häckar och staket längs Gnestas tomter. De påverkar bara skyddet, inte sikten.
- Bild: soldater i m/90 (splittermönster i ljusgrönt, mörkgrönt, brunt och svart, hjälmöverdrag, stridssele), Ak 4 med trästock och rakt magasin. Ritas som instanser som horden. Spöket är ringen med en platta där varje man skulle ta skydd, plus gruppens samlade sikt. Vald grupp: ring under varje man, hans siktlinje svagt och gruppens rutor. Mynningsflammor och hylsor från varje gevär.
- Ljud: Ak 4 är en skarp 7,62-knall med överljudssmäll och längre klang, skild från Ak 5. Egen röstbudget. Ljudbordet har Ak 4 enkelt och en salva.
- Köpraden har åtta kort, smalare så att raden ryms på en rad i 1440 px.
- Balans: E4-policyn köper en grupp dag 1 (utfallen som förut), Gnesta-policyn fyller luckor med en grupp när planen saknar fler pjäsplatser (händer inte i de fem seedsen). Gruppen är svag på Gnesta; prövade varianter och skäl i docs/balance-log.md (0.9.0). Nya kvitton för båda banorna.
- Lookbook: Hemvärnet i alla ställningar (huk åt båda håll, knä, liggande, springer, stupad) och en grupp vid en husknut före och efter. Skärmbilder i docs/hemvarn-*.png.
- Tester: skyddsvalet är deterministiskt, gruppen sprider sig, skydd före öppet gräs, egen sikt per soldat, zombier slår och stupade ersätts, sparfiler från 0.8.0 läses oförändrade och raderas aldrig.

## 0.8.0 (2026-10-16)

Den svenska arsenalen: Försvarsmaktens vapen under svenska beteckningar, med en kort engelsk rad om vad varje vapen gör. Spelets text i övrigt är engelsk.

- Ksp 90 (förut M249): "Light machine gun. Cheap and fast." Ksp 88 (förut M2 .50 cal): "Heavy 12.7 mm machine gun. Chews through brutes." Samma siffror och samma id som förut, så sparfiler och forskning gäller som de är (testat med en gammal sparfil). Modellerna närmare de riktiga vapnen: Ksp 90 med patronlåda, bärhandtag och skjutbar kolv, Ksp 88 med perforerad pipmantel, flamdämpare och ammunitionslåda på sidan.
- Ksp 58 (ny, forskning efter Ksp 88 I): allmän kulspruta 7,62 mm, mitt emellan Ksp 90 och Ksp 88 i pris, räckvidd och eld. Lång pipa med bärhandtag, tvåben och patronband.
- Ak 5 + granattillsats (ny, forskning efter Grenades I): jämna enstaka skott och en 40 mm-granat var 4,5 sekund mot den tätaste klungan, med ytskada. Skytten står med geväret mot axeln, röret under pipan. Beteckningen följer Försvarsmakten ("Ak 5 med granattillsats"); ingen egen modellbeteckning hittades, så ingen hittades på.
- Psg 90 (ny, forskning efter Ksp 88 II): prickskyttegevär, långsamt men dödligt, mycket lång räckvidd, går igenom två i en linje (tre med Psg 90 III). Får ligga på hustak på Gnesta: pekaren hittar taket under sig och skytten hamnar på takets topp. Från taket ser skytten över alla hus utom marken inom 4 m från det egna huset (död vinkel under takfoten); regeln står i src/sim/placement.js och är testad. På marken fungerar den som de andra. Skytten ligger på magen med ghillie, utan säckring på taket.
- Forskning: tre nya noder med tre nivåer var och More positions IV (8 pjäser). Forskningen är nu 4240 poäng mot 2130, så den räcker förbi Gnesta dag 5 (H034).
- Ljud: varje nytt vapen har en egen syntetiserad röst. Ksp 58 ligger mellan Ksp 90 och Ksp 88, Ak 5 är ett torrt skarpt skott, granattillsatsen ett ihåligt "thoonk" och en mindre smäll, Psg 90 en skarp knall med ett långt eko. Röstbudget och takt för alla, stresstestet håller taket.
- Springarens skrik: en andra variant, B "torn" (lägre, hesare, sönderriven strupe, nästan ingen ton). A är kvar som standard. Välj i ljudbordet (A/B) eller med inställningen `shriek` ('classic' eller 'torn').
- Köpraden har sju kort (Ak 5 heter "Ak 5 + Grt" på kortet, hela namnet i tipset). Vågens knapp ställer sig till höger om köpraden, och raden bryts i två när fönstret är smalt.
- Balans: Gnesta-policyn bemannar tak med Psg 90 där de ser den tvingade vägen över fältet (två villor vid rondellen), Ak 5 och Ksp 58 när de finns. Gnesta dag 4 hp 6,0 (var 5,6) och dag 5 hp 5,1 (var 4,6). E4 oförändrad. Nytt kvitto för Gnesta, skälen i docs/balance-log.md.
- Lookbook: en ny rad med Ksp 58, Ak 5 och Psg 90 i tre nivåer, Ak 5 med granatlåda, Psg 90 på ett villatak och spöket på taket. Ljudbordet har alla nya ljud. Skärmbilder i docs/arsenal-*.png.

## 0.7.0 (2026-10-15)

Ljud och musik, helt syntetiserade i webbläsaren (Web Audio), utan ljudfiler.

- Vapen: M249 är ett lätt, snabbt smatter där varje skott låter lite olika; M2 .50 cal är en tung duns med lågt bas-slag, långsammare och tydligt annorlunda. Hylsor klingar svagt ibland.
- Granater: kastet är ett sus, smällen en tung knall med knaster av bråte och en kort klang. Musiken duckar under smällen.
- Zombier: horden hörs som ett avlägset, tätt mummel som växer med antalet, och enskilda stön kommer från zombier nära bildens mitt. Springare skriker, bjässar vrålar. Träffar och döda är blöta dunsar.
- Hinder och bas: barriären som slås på ger en knackning och spricker med ett krasch, taggtråden knarrar metalliskt och brister med ett kling. Basen tar smällar som en tung dörr, och när basen har en fjärdedel kvar pulserar en låg varning.
- Gränssnitt: mjukt klick när något tas upp och ställs ut, en nekande ton för "har inte råd" och ogiltig plats, ett diskret kassatick för tidig bonus, en siren när vågen börjar och en stinger när dagen vinns eller förloras.
- Musik: mörk bädd som spelas fram live (drön, vind, långsamma ackord, gles puls). Lugn i bygg och nedräkning, spänd under vågen (mer puls, filtret öppnas), hjärtslag när basen nästan är slut, tyst i menyerna. E4 går i d-moll med grövre vind, Gnesta i h-frygisk med luftigare klang.
- Mix: röstbudget per ljud (till exempel högst 6 M249 samtidigt), takt och gallring vid 2x och 3x i stället för tätare ljud, kompressor och limiter sist, svag panorering och dämpning efter läget på skärmen. Pausmenyn och en dold flik dämpar allt med ett filter och tonar ut i stället för att klippa; reglaget för ljud hörs medan man drar i det. Mätt: 250 zombier i 3x håller taken, och ljudet kostar i snitt under 0,2 ms per bildruta.
- Inställningarna Sound och Music styr ljudet direkt och sparas; tipset "(no audio yet)" är borta.
- Ljudbord: soundboard.html (länk från lookbooken) spelar varje ljud, byter musikläge och stämning och har ett stresstest.
- Simuleringen är orörd: ljudet läser bara händelserna och läget (src/audio/). Nya tester för röstbudget, gallring och nivåer.

## 0.6.0 (2026-10-15)

Ett köpflöde, befästa positioner och ishallen som bas.

- Ett köpflöde (H037): köpraden nere till vänster visar allt som går att köpa i en rad (M249, M2 .50 cal, betongbarriär, taggtråd) med snabbval 1-0, ikon och pris. Välj först vad du köper (siffra eller klick), sedan var: vapen står på mark bredvid vägen med sikten som förut, barrikader och taggtråd ligger på vägen över hela gatans bredd, med hordens nya väg i förhandsvisningen. Klick ställer ut, Shift nedtryckt behåller saken i handen för flera, Esc eller högerklick släpper den. Klick på en gata öppnar ingen köppanel längre; klick på en pjäs, barrikad eller tråd öppnar dess panel (uppgradera, granatlåda, sälj, riv). Barrikaden syns nu i köpraden från början (speltestet hittade den inte).
- Tydligt vad du har råd med (H038): kort du inte har råd med är gråade med priset i rött och "Need $ X more", låsta kort har ett lås och "Research: <nod>", och alla positioner upptagna säger "All positions taken". Läget följer pengarna direkt utan att raden ritas om. Ett kort som inte går att ta upp skakar.
- Tipsen första dagen är per bana. Gnesta dag 1: "Pick the barricade (3). Block Sigtunavägen. Watch them walk around the block." E4 dag 1: "Pick the M249 (1). Place it by the road. Start the wave." Steget som gäller nu är fetat.
- Befästa positioner (H036): där en pjäs ställs ut röjs omgivningen inom ungefär 4 m, bara i bilden. Häckar huggs ner till stubbar, staket rivs eller trycks omkull, trädgårdsträd fälls (stubbe och liggande stam), bilar knuffas undan och blir vrak (mörkare, lutande, utan rutor), brevlådor och möbler välts, och sandsäckar och bråte ligger i en bruten vall. Samma positioner ger alltid samma bild; en såld pjäs lämnar skadan. Gjort på batchens instanser (fyra nya anrop för bråten). Lookbooken visar före och efter.
- Basen är ishallens entré på Gnesta (H039): överlevarna är inne i Gnesta ishall och horden ska fram till huvudingången, inte till rondellen. Dörrarna är igenspikade; när basen tar skada buktar plankorna och lossnar, och sprickor och blod på fasaden växer i fem steg. Rondellens ö går att bygga på (sista försvarslinjen framför porten). Den norra gruppen tar nu cykelvägen till entrén, så dag 2 har två riktiga ingångar.
- Balans för den nya vägen: Gnesta dag 1 hp-faktor 3,6 (var 3,8), dag 2 startkassa $ 1100 (var $ 900) och hp 5,0 (var 4,6). Nytt kvitto för Gnesta, skälen i docs/balance-log.md.
- Betongbarriären finns på Gnesta från dag 1 utan forskning (banans upplåsningar), eftersom dag 1 lär ut barrikader. På E4 kräver den forskningen som förut. Testat.
- Laddning: mätt var tiden går när Gnesta byggs. Kartans CPU-del (rutnät, placering, mark, instanser) är 0,06 till 0,13 s; resten var GPU:ns första bildruta, där shaderprogrammen länkas (20 till 30 s med mjukvaru-GL, 0,1 till 0,3 s med GPU). Banorna byggs nu en gång och sparas, shaders kompileras i förväg medan en laddningsskylt visar stegen, och sidan fryser inte under bygget. Gnesta tar 0,16 s första gången och 0,08 s tillbaka med GPU.
- Vågens knapp och rad flyttas åt höger när fönstret inte räcker, så att köpraden inte täcks.

## 0.5.2 (2026-10-15)

Rättningar efter granskningen av 0.5 och speltestet av 0.5.1.

- En betongbarriär kan inte längre läggas på rutor där levande zombier står ("Zombies in the way"). Förut låstes de in i betongen. Gatupanelen säger det på kortet medan zombierna står där.
- Betongbarriären kräver forskningen Concrete barrier även på Gnesta. Gatupanelen visar alla hinder; ett låst kort är streckat och säger "Needs research".
- Next wave mitt i en våg: mellanslaget ensamt gör ingenting medan zombier är kvar. Knappen är dämpad och säger "Next wave: still N left". Vågor staplas bara med ett klick på knappen eller Shift+Space, och "+$X early" syns bara då (Shift nere eller pekaren på knappen).
- Basen tar skada: skärmkantens röda puls är kraftigare och "Base under attack!" är en tydlig röd skylt. Kontrollerat på båda banorna (basen lyser, plåten blinkar, notisen och pulsen syns).
- Rutorna en pjäs ser lyser i en kall blå färg med mörk kant, så att de syns på Gnestas ljusa gräs och gator.
- Gnesta zoomar ut högst till 68 m (var 84), så att zombierna går att skilja åt.
- Pausen fryser även kameraskakningen, pjäsernas rekyljitter och basens skakning.
- Restart day och Main menu mitt i en dag räknar försöket, så att dagen får en ny seed som efter Try again.
- Farten (1x, 2x, 3x) sparas i inställningarna och följer med vid Try again, Restart day och nästa dag.
- Bankortet i menyn markeras direkt vid klick ("Loading") innan den nya banan byggs, så att klicket inte verkar försvinna.
- Gnestas balans har ett fingeravtryck (`tests/route-gnesta.test.js`), samma disciplin som E4.

## 0.5.1 (2026-10-15)

Meny med paus.

- Menyknappen (tre streck) ligger uppe till höger; pengar- och basplåten har flyttats ett steg åt vänster. Esc öppnar menyn också, men först avbryts placeringen eller stängs en öppen panel. Knappen syns inte på huvudmenyn.
- Medan menyn är öppen står spelet helt still: inga simuleringssteg, ingen nedräkning till nästa våg, inga spawn-timers, inga tangenter. Scenen ritas ändå (dammet rör sig). Fungerar i alla lägen: intro, spel, resultat och forskning.
- Rader: Resume, Game speed (1x, 2x, 3x, samma som F), Sound, Music, Restart day (frågar först, samma väg som Try again så forskningen behålls) och Main menu (frågar om en dag pågår). Raderna är en lista av definitioner i `src/ui/menu.js`.
- Sound och Music är riktiga inställningar med reglage och Mute, sparade i `horde.settings` (skilt från sparfilen). Spelet har inget ljud än, så raderna visar "(no audio yet)" tills `AUDIO_READY` sätts.
- Ny logik som går att testa utan webbläsare: `src/sim/clock.js` (tidsstegning med paus, Esc-prioritet) och `src/meta/settings.js`.

## 0.5.0 (2026-10-15)

Fri placering och siktlinjer, på båda banorna.

- Positionerna är borta. Vapenkorten nere till vänster (eller 1 och 2) startar placeringen: ett spöke av pjäsen följer pekaren i 2 m-rutor, grönt där den får stå och rött med skälet där den inte får ("On the road", "Inside a house", "Too close to another gun", "Max guns reached (research more)", "In the forest", "Something in the way"). Räckvidden syns, och gatrutorna inom den som pjäsen ser lyser; gata bakom hus förblir mörk. Klick ställer ut, Esc eller högerklick avbryter.
- Pjäser får stå överallt där zombier inte går: tomter, gräs, parkeringen, uppfarter, vägkanten. Inte på gatan, i hus (en meter runt väggarna räknas till huset), på rondellens ö, i den täta skogen eller på bilar och liknande. Minst 5 m mellan två pjäser.
- Högst fyra pjäser. New position heter More positions och har tre nivåer, en pjäs till per nivå (80, 140, 220).
- Siktlinjer: hus skymmer, häckar, staket, bilar och barrikader är låga och skymmer inte. Sikten räknas en gång när pjäsen ställs ut (rutvis stråle mot husrutor), siktet och granatlådan tar bara zombier i rutor pjäsen ser. Prioriteten är som förut: minst kvar att gå.
- Klick på en utställd pjäs öppnar panelen (uppgradera, granatlåda, sälj) och visar vad den ser.
- E4 har fått ett eget placeringsrutnät ur bandata (vägen, ruinen, bilar och betongsuggor). Gnestas bilar på parkeringen är bandata, så att placeringen vet var de står.
- Dag 1-tipset: Pick the M249. Place it by the road. Start the wave.
- Sparfil v3: en gammal New position blir More positions I. En v2-sparfil sparas oförändrad som `horde.save.v2` när den läses. Ingen sparfil raderas.
- Balans: E4 dag 2 och 3 och Gnesta dag 1 till 5 har nya hp-faktorer, och balanspolicyerna ställer pjäserna där de ser mest av hordens väg. Gnestas smarta policy spärrar nu Sigtunavägen vid rondellen, så att horden går över fältet. Detaljer och skäl i `docs/balance-log.md`. E4:s balanskvitto är nytt, avsiktligt.

## 0.4.2 (2026-10-15)

Gnesta balanserad dag 1 till 5, och barrikaden kostar ett fast pris per spärr.

- En spärr tvärs över gatan kostar hindrets pris en gång, hur bred gatan än är: barrikad $ 150, taggtråd $ 80 (förut per ruta, $ 600 för en barrikad över Sigtunavägen). Hel spärr ger halva priset tillbaka. Panelen visar priset och "One price for the whole width".
- Gnestas dagar har en hp-faktor (`hp` i dagens data, 2,8 till 4,6), nya vågor och lägre startpengar. Detaljer och skäl i `docs/balance-log.md`.
- Balansskriptet har två Gnesta-policyer: `smart` spärrar Sigtunavägen så att horden går runt kvarteret förbi pjäserna, `naive` bygger samma vapen men aldrig en barrikad. Tio tester i `tests/balance-gnesta.test.js`: dag 1 vinns direkt och naiv tar mer skada, naiv förlorar dag 2, forskning och granatlådor spelar roll dag 4, dag 5 är svårast, förluster rasar gradvis, högst ca 250 levande.
- Introtexterna för dag 1 och 4 säger vad som är nytt.
- E4 spelar som förut: balanskvittot är oförändrat.

## 0.4.1 (2026-10-15)

Horden går att rita i hundratal, och den sprider sig över gatan på Gnesta.

- Zombierna ritas som instanser: en `InstancedMesh` per kroppsdel och typ, med färgen per zombie och samma proportioner, gång, ryck, slag- och fallposer som förut. Liggande kroppar fryses i en egen uppsättning utan skugga, högst 24 som förut. 250 zombier på Gnesta: 365 anrop i stället för 2 553, och med processorn strypt 4 gånger 96 fps i stället för 27 (`docs/balance-log.md`, Prestanda). Visningssidan använder fortfarande vanliga meshar.
- Varje zombie på Gnesta har en fast fil tvärs över gatan och håller den hela vägen, över gatans hela bredd (0,6 m från kanten). Filerna delas ut i följd efter zombiens nummer så att zombier som kommer efter varandra hamnar isär. Nära basen och vid barrikader styr de som förut. Deterministiskt, test i `tests/lanes.test.js`.
- E4 går som förut: balanskvittot är oförändrat.

## 0.4.0 (2026-10-15)

Bana 2, Gnesta, går att spela i spelet (inte bara på visningssidan).

- Menyn har banval: E4 (dag 1 till 3) och Gnesta (dag 1 till 5). Gnesta låses upp när E4 dag 3 är klar; med `?debug` i adressen går alla banor att välja.
- Sparfil v2: upplåsta dagar och försök per bana, forskningen och forskningspoängen delas. En v1-sparfil flyttas över när den läses och sparas oförändrad som `horde.save.v1`. Ingen sparfil raderas.
- Gnesta: världen och kameran byggs ur bandata. Kameran går att panorera (dra, WASD, piltangenterna) och zooma (hjulet) inom gränser, och skuggan täcker hela spelytan.
- Horden går på gatorna från ingångarna med samma ryckiga gång som på E4. Den siktar mot en punkt upp till tre rutor fram längs flödet när vägen dit är fri, så diagonaler blir raka i stället för trappsteg, och flödesfältet bryter lika vägar på fågelvägen till basen.
- Vapenpositioner A till F på tomterna och vid husen enligt skissen, G och H kräver New position.
- Concrete barrier och Barbed wire läggs tvärs över gatan där man klickar (alla rutor över gatans bredd, betalt per ruta) och rivs tillsammans. Barrikaden är fri på Gnesta, dag 1 lär ut den.
- Pekaren på en gata visar hordens nya väg som ett rostfärgat band ("de går runt kvarteret"); vägen som gäller nu syns som ett svagt band. Rutorna spärren skulle ta lyser.
- En pil vid skärmkanten per ingång: före vågen var de kommer ifrån, under vågen "Horde incoming".
- Siktet väljer zombien med kortast gångväg kvar till basen, utan barrikadens straff, så en zombie som slår sig igenom en barrikad nära basen prioriteras rätt (test).
- Fem dagar enligt designen: dag 1 bara Sigtunavägen öst, dag 2 norra vägen, dag 3 skogsvägen, dag 4 bjässar, dag 5 allt. Första siffror, balansen görs i ett eget pass.
- Söder om rondellen ligger nu den stora parkeringen (fyra rader, bilar, belysningsstolpar) och längre söderut Gnesta sporthall, inte skog.
- Utanför spelytan syns omgivningen ur karta-vid och satellit-vid som disiga spökhus: Östra Storgatan, Vikingavägen och Fornminnesvägen norrut, radhusen i nordost och sporthallens omgivning. Grått och avmättat, sjunker i diset; bara spelytan är skarp. Lagret är data (`gnesta.surroundings`) så att ett kvarter kan bli riktigt senare.
- E4 spelar som förut: balanskvittot är oförändrat.

## 0.3.2 (2026-10-15)

Grunden för vägsökningen på bana 2, Gnesta. Bara simuleringen, ingen ny grafik.

- Rutten är ett eget gränssnitt (`src/sim/route.js`). Simuleringen frågar rutten om spawn, gång, läge, framsteg och hinderrutor i stället för att räkna på E4:s väglinje. E4 går som förut: hela balansloggen är identisk med 0.3.1 och ligger som test.
- Hinder nycklas på rutans nyckel, och rutten räknas om när ett hinder läggs, rivs eller slås sönder.
- Vågdata kan välja ingång per grupp (`spawn`).
- Rutnät och flödesfält för Gnesta (`grid.js`, `flow.js`, `gridRoute`): horden går bara på gator och cykelvägar, följer billigaste vägen mot rondellen (Dijkstra, 4-grannar i fast ordning), styr mot nästa rutas mitt med en egen sidoförskjutning och skär aldrig genom en tomt. Gata kostar 1, cykelväg 1,1, barrikad 400 och taggtråd 1,5 rutor. En barrikad på huvudgatan skickar horden runt kvarteret; är allt stängt går den till närmaste barrikad och slår sig igenom. Taggtråden bromsar som på E4.
- Gnesta-rutnätet har terräng (gata eller cykelväg), kartdata 0.1.1.
- Balansskriptet kör en rök-körning på Gnesta: tre vandrare per ingång når basen på 96 till 130 s, ingen utanför gatan.

## 0.3.1 (2026-10-15)

Rättningar efter granskningen av 0.3.0.

- Fartknappen syns även under nedräkningen, så en dold 2x eller 3x finns inte längre.
- Start wave och Next wave går samma väg för händelser som resten av spelet (en gemensam händelseloop i main.js).
- Gamla sparfiler: ett känt forsknings-id med trasig nivå behålls i stället för att tappas.
- Banan hämtas ur sparfilens `mapId`, och resultatskylten visar banans namn.
- Texter: "Faster M249" och "Maxed".
- Granatens ledning räknar med zombiens verkliga fart (taggtråd, bjässar).

## 0.3.0 (2026-10-15)

Granater, forskning i nivåer och nästa våg med bonus (H015, H016, H022), plus tre önskemål från Olas speltest.

- Forskning i nivåer: M2 (upplåsning, sedan skada I och II), M249 rate I till III, Heavy wire I och II, Concrete barrier (upplåsning, sedan hp I och II), Bigger budget I till III, New position och Grenades I till III. Varje nod visar prickar för köpta nivåer, vad nästa nivå gör och vad den kostar. Krav kan peka på en nivå i en annan nod.
- Gamla sparfiler fungerar: platta forsknings-id (t.ex. `m249Rate`) blir nivå I när sparfilen läses.
- Granatlåda: när Grenades är forskat köps den för $ 200 i positionens panel, bredvid Upgrade. Bara positioner med låda kastar, och de gör det själva när horden klumpar ihop sig eller en bjässe kommer nära. Lådan står bredvid skytten.
- Granaten flyger i en båge och smäller: eldklot, jord och skräp, damm, rök, ett kort starkt ljus, ett brännmärke på vägen, kroppar som kastas undan och en liten skakning av kameran. Visningssidan visar lådan, granaten och smällen.
- Next wave: efter en klarad våg räknar knappen ner 5 s och startar nästa våg själv. Mellanslag eller knappen kallar den tidigt, även mitt i en våg, och ger en bonus som syns som "+$ 20 early". Knappen visar "Next wave (Space) 4s · +$ 20".
- Fart i tre steg: 1x, 2x och 3x. F eller knappen stegar runt. Gäller även under nedräkningen.
- Zombierna rör sig mer obehagligt: ryck i huvud och axlar, snubbelsteg och korta kast framåt, ben och armar i otakt, huvudet som knycker upp mot basen. Löparna darrar och fäktar, bjässarna stöter tungt i varje steg. Bara bild, simuleringen är oförändrad, och varje zombie rycker likadant varje gång (styrt av dess id).
- Taggtråden biter mer: zombierna går i 40 % av farten (förut 50 %) och tråden håller 60 s (förut 40). Dag 2 och 3 fick fler löpare och bjässen lite mer hp så att kurvan håller. Se balansloggen.

## 0.2.2 (2026-10-15)

Tre av Olas beslut efter första genomspelningen (H012, H013, H014). Inga balanssiffror ändrade.

- Hela spelet på engelska, ett språk. Bana 1 heter E4 (id `riksvagen` kvar, gamla sparfiler fungerar). Vapen, hinder, zombier, forskning, HUD, skyltar, notiser och visningssidan är översatta.
- Hälsoring under varje zombie som tagit skada: tunn båge på marken som töms, benvit som blir rost när den är låg. Bjässen har en lite större ring. Hela horden ritas i ett anrop.
- Zombierna har verkliga proportioner: mindre huvud, långa smala lemmar med armbågar och knän, krökt rygg, hängande huvud, ojämna armar, trasiga fållar och bara underarmar. Löparen sprintar, bjässen är stor men mänsklig. Gång, slag mot hindret och fall är omgjorda för de nya lederna.
- Skyttarna i värnen har samma proportioner: M249-skytten på ett knä, M2-skytten vid spadgreppen.
- Visningssidan visar ringen vid 100, 60 och 20 %, en zombie som slår mot ett hinder och en som faller. Skärmbild i `docs/lookbook-0.2.2.png`.

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
