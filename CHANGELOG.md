# Ändringslogg

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
