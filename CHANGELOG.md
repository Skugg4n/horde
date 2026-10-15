# Ändringslogg

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
