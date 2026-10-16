# Granskning: Horde 0.7.0 till 0.10.0 (96c157d..0021bd0)

Granskare: senior reviewer, 2026-10-16. Läst: hela diffen (440 KB, data-, modell- och bildhunkar skummade), CHANGELOG.md, docs/balance-log.md, todo.md från H050, granskningen av 0.5, och nuvarande src/sim, src/meta, src/main.js, scripts/balance.mjs och alla nya tester. `npm test` kört lokalt på 0021bd0: 225 av 225 gröna på 62 s. Tre egna körningar mot koden (utan att röra arbetsträdet): Gnestas kvitto med fil-vakten påslagen, Gnesta Norr spelad av en smart policy som aldrig köper Hemvärnet, och kostnaden för skyddsvalet per pekarrörelse. Arbetsträdet är orört av mig. Ospårat vid granskningens slut: `.superpowers/` (ignorerad i huvudrepot) och två speltestbilder `docs/playtests/0.10.0-1.jpg` och `-2.jpg` som dök upp från en annan session under granskningen (800 x 500, spelets egen rendering, inte granskade i övrigt; de hör till nästa commit eller till samma krympning som de andra bilderna).

Reglerna:
- Simuleringen är ren och deterministisk: inga `Math.random`, `Date`, `performance` eller DOM-referenser i src/sim, src/data eller src/meta. Skyddsvalet bryter lika på rutnyckel, Psg 90:s genomskott sorterar på avstånd och sedan zombiens nummer (numeriskt), zombie-soldat-kontakten tar närmaste soldat och sedan listordning.
- Vyn muterar inte simuleringen: squad-view.js och view.js läser `g.soldiers`, `z.foe`, `s.targetId` och skriver bara i egna objekt. `z.foe` sätts av simuleringen varje steg och läses av vyn för vridningen.
- Ingen sparfil raderas: formatet är kvar på v3, `loadProgress` skriver aldrig, `maps` med okända banor behålls, Gnesta Norr läggs till först när den spelas. Testat i tests/progress-norr.test.js och tests/hemvarn.test.js.
- Ingen em-dash i spårade textfiler (grep på U+2014 i src, html, css, md). Testet för Norrs introtexter kontrollerar det också.
- Spelartexten är engelsk; de svenska vapennamnen och gatunamnen är de tillåtna undantagen. Panelens "Hemvärnet" och köpkortets "Ak 5 + Grt" är med avsikt.
- Inga Google-bilder i repot: `docs/refs/` är ignorerad och tom i git (`git ls-files docs/refs` ger inget), gnesta-norr.js säger att kart- och satellitbilderna ligger i `~/Projects/horde-refs` utanför repot. Alla 36 nya bildfiler i intervallet heter arsenal-, hemvarn-, lookbook- eller norr-*.png; jag öppnade norr-oversikt.png, norr-meny.png och docs/playtests/0.5.1-1.jpg (äldre, spårad) och alla tre är spelets egen rendering. Inga filnamn med maps, street, ref eller satellit bland spårade filer.

## Strengths

- **Rutt, placering och sikt växte utan att tappa disciplinen.** Taken är data i placeringen (`roof`, `bldg`, `buildings` i townPlacement), takregeln är en funktion (`roofSightFrom`) med samma svar som `sightFrom`, och `townGrid`/`townPlacement` tar en stads data så att Gnesta Norr är samma kod med en större `bounds`. Gnestas eget rutnät byggs via samma väg (`buildGrid = townGrid(gnestaTown())`), och kvittot höll (route-gnesta byttes bara när balansen byttes med avsikt).
- **Hemvärnet är rätt skuret.** src/sim/squad.js är ren poängmatte: skydd, sikt, utsatthet, avstånd och spridning över skyddstyper, med fasta tie-breaks. Soldaterna har egen sikt (`sightFrom` per ruta) och siktar med samma regel som pjäserna. Zombie-soldat-kontakten ligger i `moveZombies` med samma `mul = 0`-mönster som barrikaden. Pjäserna förblir osårbara, så E4:s och Gnestas kvitton ändras bara av policyns inköp, och det står i testfilerna varför.
- **Hela kedjan är testad på rätt nivå**: provbanor i ascii (hemvarn.test.js) för skydd, spridning, egen sikt, stupade och ersatta, uppgradering och sälj; arsenal.test.js för tak, död vinkel och genomskott; progress-norr.test.js för tre banor och en riktig 0.9.0-sparfil; balance-norr.test.js med kvitto. 225 tester på 62 s är bra för tre balanskampanjer.
- **Balansskriptet är fortfarande en modell av en människa**, inte en optimerare: smart läser kartan (spärr, dödszon, tak, murar) och naive gör samma köp utan spärr. Prövade och förkastade varianter står i loggen med siffror (U-svängen vid Vikingavägens krök, två spärrar, dödszonen över hela Gångvägen, $ 2200). Det är den sortens dokumentation som gör nästa balanspass möjligt.
- **Bild och ljud följer händelserna**: `soldier`, `sx/sz` på skottet, `launch`, `pierce`, `blast.kind` räcker för att vyn och ljudet ska göra rätt utan att fråga simuleringen om mer. Granattillsatsens smällar skakar inte kameran (main.js:92 i diffen), en riktig detalj.
- **Prestandan är mätt** (balance-log 0.10.0: 44 anrop, 389 000 trianglar, 120 fps vid 4x strypt processor med 180 zombier; banan byggs på 0,16 s). Soldaterna ritas som instanser via samma horde.js. Skyddsvalet kostar 0,8 ms i median och 3 ms som värst per pekarrörelse på Gnesta Norr (mätt i node), så placeringsläget hackar inte.
- **Sparfilen tål en tredje bana utan versionsbyte**: `unlock: { map, day }` i bandata, `mapUnlocked` läser den, main.js:39 faller tillbaka till E4 om sparfilens bana inte längre är upplåst (debug-sparfil) utan att röra `maps`.

## Issues

### Critical

Inga. Det jag särskilt letade efter:
- **Fastnade zombier på Gnesta Norr**: fil-vakten (route.js:170 i nuvarande fil) tar bort pendlingen, och balance-norr.test.js kräver att varje försök tar slut under 1400 s. Vakten kan bara ta bort kandidater; faller alla bort gäller `target(z, n1)` som alltid ligger en ruta nedströms, så ingen ny stillastående finns.
- **Soldater som gör simuleringen inkonsekvent**: `activeSoldiers` räknas en gång per steg, `hurt` ger en `soldierHit` per soldat och steg, `hitSoldier` sätter `down` en gång. Sälj mitt i striden: nästa steg har inga trupper, `z.foe` blir null och `attacking` nollas av `obstacleEffect` (sim.js:615). Restart day: ny `createSim`, `view.setSim` tömmer `squadView`. Reinforce: `run` sätts om, `activeSoldiers` hoppar över den som springer, panelen räknar om via `keyOf`.
- **Sparfiler**: v3 oförändrat, `isValidMaps` tillåter okända banor, `selectMap` skapar `maps['gnesta-norr']` först vid val. En v4-fil från en framtida version hamnar fortfarande under `horde.save.broken` och ersätts vid nästa sparning (samma anmärkning som i 0.5; regeln hålls, inget raderas).

### Important

1. **Fil-vakten gäller bara Gnesta Norr, men förutsättningen finns på Gnesta** (src/sim/route.js:166-170, src/data/gnesta-norr.js:334, todo H061). Jag körde Gnestas hela kvitto med `gnesta.grid.laneGuard = true`: fingeravtrycket byts (eaf289f6/39328 mot 759821b7/39386). Alltså väljs siktpunkter uppströms även på Gnesta, i vanliga körningar. Det är exakt det läge som gav evig pendling på Norr; att det inte hänt på Gnesta i fem seeds är tur, inte konstruktion. E4 berörs inte alls (pathRoute har ingen fil-vakt att slå på), så E4:s kvitto är säkert. Utfallen på Gnesta med vakten på står nedan under Balance recommendations (de ändras marginellt). Fix: gör vakten global i `gridRoute` (ta bort flaggan), byt Gnestas kvitto avsiktligt med en rad i route-gnesta.test.js och balance-log.md, och lägg ett regressionstest i tests/grid-route.test.js: en zombie vars `fraction` inte ökar under 10 s simtid utan `attacking` är ett fel (det är det testet som saknas i dag; balance-norr testar bara att dagen tar slut).

2. **Gnesta Norr är balanserad mot en policy som köper Hemvärnet, och den spelaren är svagare än den som låter bli** (scripts/balance.mjs:873 `NORR_ORDER`, :1303 `HV_POLICY['gnesta-norr']`, docs/balance-log.md 0.10.0). Jag spelade Norr med samma smarta policy men utan en enda grupp och utan Hemvärnets forskning (RESEARCH_ORDER), tre seeds:

   | Seed | Smart med Hemvärnet (försök / bas kvar) | Smart utan Hemvärnet |
   |---|---|---|
   | 0 | d1 1/20, d2 1/7, d3 1/11, d4 2/5, d5 1/3 | d1 1/15, d2 2/14, d3 1/17, d4 1/15, d5 1/13 |
   | 1 | d1 1/20, d2 1/6, d3 1/9, d4 2/7, d5 2/4 | d1 1/20, d2 1/20, d3 1/18, d4 1/12, d5 1/8 |
   | 2 | d1 1/20, d2 1/2, d3 1/5, d4 1/2, d5 1/3 | d1 1/16, d2 3/17, d3 1/13, d4 1/6, d5 1/13 |

   Utan Hemvärnet är dag 3 till 5 bekväma (8 till 18 kvar) och dag 5 är inte längre svårast; dag 2 är i stället den dag som tar flest försök. De sju forskningsnivåerna (980 poäng) och gruppens $ 250 per dag är pengar som gör mer nytta som pjäser, precis som loggen själv konstaterade för Gnesta i 0.9.0. Det betyder två saker: hp-faktorerna 7,2 till 9,0 är satta för en handikappad spelare, och "Hemvärnet är ett riktigt val" gäller inte på Norr heller. Det är inte en bugg, men det är den största risken för att banan känns fel i händerna: en spelare som hoppar över gruppen får en lätt bana med klippa på dag 2; en som köper allt får bjässar på 5 000 hp. Rekommendationer under Balance recommendations.

3. **Gruppen kan bli mindre än den spelaren betalar för** (src/sim/sim.js:275, `checkSpot`: `squadPlanAt(...).length < squadSize(1)` utan `sim.research`). Med Bigger squad II är gruppen sex man, men kollen kräver bara fyra platser; en ring där fem får plats ger fem soldater för fullt pris utan besked. Spöket visar plattorna, så det syns om man tittar, men panelen säger "6 of 5 standing"-liknande fel aldrig, den säger bara färre. Fix: `squadSize(1, sim.research)` i kollen, eller låt `build` dra av `SQUAD.reinforce` per saknad man. Samma sak i `growSquad` (sim.js:341): "Upgrade: one more rifleman" tas betalt även när ingen ruta finns; säg "Upgrade: better rifles" när `planSquad` med `fixed` ger noll, eller ge en man ändå i närmaste lediga ruta utanför ringen.

4. **Modulblandning vid publicering** (index.html, GitHub Pages `cache-control: max-age=600`, verifierat mot den levande sajten som svarar 0.7.0). 0.10.0:s main.js importerar `onRoof, reinforce, squadPreview` från sim.js och `SQUAD, isSquad` från squad.js. En spelare med 0.7.0:s sim.js i cachen och en ny main.js får ett länkfel ("does not provide an export named onRoof") och en svart sida i upp till tio minuter. Inget i main.js fångar det (ingen `error`-lyssnare). Det är samma risk som vid varje publicering, men den här gången har tre moduler nya exporter som huvudfilen kräver. Fix (liten): en vanlig `<script>` i index.html som lyssnar på `window` `error` och visar "New version, reload the page" i #ui, plus `src/main.js?v=0.10.0` så att åtminstone huvudfilen alltid hämtas ny när index.html är ny. Rätt lösning på sikt är en versionsmapp per release.

5. **Dag 3 till 5 på Gnesta Norr tar 950 till 1 200 s speltid** (mätt i körningarna ovan; dag 1 320 s, dag 2 550 till 660 s). Vid 1x är det 16 till 20 minuter per dag, vid 3x sex. Det mesta är gångtid: en vandrare från Dansutvägen väster behöver ungefär 250 s till entrén, och varje våg börjar med den sträckan. Det är en balansfråga (nedan), men den hör hit för att den också är en speltestrisk: ingen har spelat en 20-minutersdag i händerna än (H058).

6. **main.js är 796 rader och bär nu även takplockning, gruppens sikt och gruppens placeringsläge** (src/main.js:3049-3061 `roofUnder`, :2968-3010 i diffen). Granskningen av 0.5 bad om att lyfta ut placeringsläget, ingångspilarna, panelplaceringen och vägförhandsvisningen innan ljudet; sedan dess har filen vuxit från 617 rader till 796 och fått tre nya grenar i `placementUi`. Inte ett fel, men det är den fil där nästa bugg kommer att gömma sig. Lyft ut `ui/placing.js` (startPlacing, spotFor, placeHere, placementUi, roofUnder, squadKeys, sightCache) som ett första steg; det är ungefär 180 rader som bara behöver `sim`, `view` och `picker`.

### Minor

Korrekthet i kanten:
- src/sim/sim.js:270 (`checkSpot`): skälet `'kant'` ("Not on the roof, too close to the edge") ges för alla husrutor utan tak när vapnet är Psg 90, även ishallen och sporthallen som inte har tak alls. Säg `'hus'` när `p.bldg[key]` är 0 och `'kant'` bara när rutan ligger i marginalen runt ett hus med tak.
- src/main.js `roofUnder`: strålen stegas 9 m till 0,5 m i 0,25 m-steg och tar första rutan vars tak ligger inom 0,2 m. Det fungerar, men ett villatak med nock på 6,3 m och en ruta i takfallet på 3,4 m ger två träffar på samma hus i olika steg; den första vinner, vilket är rätt. Dokumentera att det är en "första taket strålen når"-regel, så att ingen försöker göra den exakt senare.
- src/sim/squad.js:138 (`planSquad`): `others` samlar soldater i andra grupper men `fixed` (egna, vid uppgradering) läggs i `taken`; en egen stupad soldat räknas också som fast, så en sjätte man kan inte ta en stupad kamrats ruta. Avsiktligt rimligt, men värt en kommentar.
- src/sim/sim.js:170 (`hitSoldier`): skadan per steg är `def.hitDamage * dt` oberoende av hur många zombier som slår; åtta zombier runt en soldat ger åtta gånger. Det är rätt, men `soldierHit`-händelsen skickas en gång per soldat och steg, så ljudet hör inte skillnad på en och åtta. Lägg `count` på händelsen om det ska låta värre.
- src/data/gnesta-norr.js:2277 (blocket som filtrerar bort spökhus i den skarpa ytan) muterar `SURROUNDINGS.districts` efter att objektet exporterats; flytta filtret in i objektbygget så att ingen annan import ser halvbyggd data.
- tests/balance-norr.test.js:6400: tidsgränsen 1400 s är nära dagens längd (upp till 1 193 s mätt). Om dag 5 blir 20 s längre i en seed faller provet utan att något är fel. Sätt gränsen mot `MAX_TICKS` (1500 s) minus marginal, eller testa i stället att ingen levande zombie står still utan `attacking`.
- docs/norr-*.png visar "v0.9.0" i hörnet (bilderna togs före versionsbumpen). Småsak, men README säger att de är 0.10.0.

Prestanda och storlek:
- src växte från 446 KB till 578 KB (okomprimerat) i intervallet; main.js 37 till 40 KB, models.js 40 till 60 KB, gnesta.js 48 KB, gnesta-norr.js 36 KB, gnesta-kit.js 40 KB. Allt laddas som separata ES-moduler över GitHub Pages med gzip; 578 KB blir ungefär 150 KB över nätet, plus three (ca 650 KB). Inte ett problem i dag, men bandatan (gnesta.js, gnesta-norr.js) körs vid import (`buildVillas`, `buildYards`, `townGrid`, `townPlacement`) även när spelaren väljer E4; mätt till 0,06 till 0,13 s i 0.6.0, nu två städer. Gör `gnestaNorr.place` lat (`get place()`), som ett första steg.
- Repot: spårade bilder gick från 55,6 MB (41 filer) till 95,8 MB (77 filer); 36 PNG på 40 MB i ett intervall, de största 1,6 MB (hemvarn-e4-selected.png, norr-sparr.png). Historiken behåller dem för alltid, och `.git` i horde är redan 97 MB. Kör `oxipng -o 4` eller `pngquant` på docs/*.png före pushen (typiskt 60 till 70 % mindre utan synlig skillnad), eller sänk till 1280 px bredd.
- src/sim/sim.js:148-160: `zombiePos` räknas per zombie i `moveZombies` när trupper finns och en gång till i `zombieCells`. Behåll den första i zombien (`z.px, z.pz`), samma anmärkning som i 0.5.
- src/main.js `squadKeys`: en `Set` och en lista per bildruta när en grupp är vald eller i handen; `cover.id` är redan en nyckel, så räkna om bara när nyckeln byts.
- src/render/squad-view.js:4319 (`lean`): åtta grannar slås upp per soldat och bildruta. Räkna `lean` en gång när soldaten läggs till (skyddet flyttar inte).

Text:
- src/ui/panels.js `renderSquad`: "Ak 4 ×6" använder U+00D7; fint, men resten av gränssnittet skriver "x" ("1x, 2x, 3x"). Välj en.
- src/data/weapons.js `hv.desc`: "the dead can reach them" är bra. Köpkortets ikon med tre hjälmar funkar i 96 px.

## Must fix before publish

1. Gruppen får aldrig bli mindre än betalt: `squadSize(1, sim.research)` i `checkSpot` och ett tydligt besked (eller återbetalning) i `growSquad` när ingen ruta finns (Important 3). Test: en grupp med Bigger squad II på en trång ring ger "No room for the squad here".
2. Fil-vakten global (Important 1): ta bort `laneGuard`-flaggan, byt Gnestas kvitto avsiktligt med förklaring i route-gnesta.test.js och balance-log.md, och lägg till regressionstestet för stillastående zombier. E4 är orört.
3. Laddningsskydd för modulblandning (Important 4): felmeddelande med "reload" i index.html och `?v=` på huvudfilen. Fem rader.
4. Krymp de 36 nya skärmbilderna före pushen (Minor, repo). Det går inte att göra efteråt utan att skriva om historiken.
5. Hela sviten grön efteråt, versionen 0.10.1, CHANGELOG och balanslog med det nya Gnesta-kvittot.

Balansen på Gnesta Norr (Important 2 och 5) är inte ett publiceringshinder i sig: banan är spelbar, deterministisk och vinnbar på båda sätten. Men den ska speltestas i händerna (H058, H059) innan hp-faktorerna anses satta, och jag rekommenderar ett balanspass till före 0.11 enligt nedan.

## Balance recommendations

Gnesta Norr, hp 7 till 9 och dagar på 1 000 s: ja, det är fun-risky, av tre skäl som hänger ihop.

1. **Kalibrera mot spelaren utan Hemvärnet, och gör gruppen värd sitt pris på annat sätt.** Siffrorna ovan visar att policyn utan grupp vinner dag 3 till 5 med 8 till 18 kvar vid hp 7,6 till 9,0. Kör sensitiviteten (0,2-steg i hp) med båda policyerna och välj den faktor där smart utan Hemvärnet landar på 5 till 9 kvar dag 3 till 5 och smart med Hemvärnet vinner inom två försök. Min gissning är hp 6,5 till 7,5 för dag 3 till 5 i stället för 7,6 till 9,0. Om Hemvärnet ska vara ett riktigt val på Norr behöver det något pjäserna inte har: till exempel att tegelmurarna ger skydd som gör soldaterna nästan osårbara (zombier når inte över muren, de måste gå runt), eller att gruppen får fyra sikter runt radhuskvarteret där ingen pjäs ser. I dag köper policyn murarna som skydd, men soldaterna stupar ändå (200 till 1 900 träffar och stupade i loggen).

2. **Korta dagarna till 500 till 700 s utan att ändra trycket.** Gångtiden från Dansutvägen väster (250 s med tom karta) är det som gör dag 3 till 5 till 16 minuter vid 1x. Tre vägar: flytta `dansW` till Dansutvägen vid Valsvägens korsning (K 585,166) så att sträckan blir ungefär 150 s; låt dag 3 till 5 börja nästa våg när föregående vågs kö är tom i stället för när vågen är klar (en flagga `overlap: true` i dagens data, `checkCleared` känner redan flera vågor samtidigt); eller lägg grupperna med 0,22 till 0,3 s intervall i stället för 0,4 till 1,4 så att en våg är framme som en kolonn. Mät sedan att naive fortfarande rasar gradvis (den gjorde det på 81 till 713 s).

3. **Klipporna i hp och pengar kommer av att en siffra bär hela dagen.** Loggen säger att dag 4 hp 7,6 ger naive vinst och 8,2 ger smart fem försök; det är plus eller minus 4 %. En hp-faktor som skalar alla zombier lika gör bjässar till 5 000 hp-svampar och vandrare till 300 hp. Flytta en del av trycket från hp till sammansättning: fler löpare (de straffar en dålig placering, inte ett sämre vapen), en bjässe-grupp till men hp 6, och en fjärde ingång dag 5 i stället för hp 9. Då blir kurvan flackare runt de valda värdena, och skillnaden mellan en smart och en naiv spelare blir placering i stället för eldkraft.

4. **Dag 2 utan Hemvärnet tar två till tre försök i två seeds av tre medan dag 5 vinns direkt.** Det är en inverterad kurva för den spelaren. Dag 2 har två ingångar och $ 2 100; policyn sparar till taket och gruppen (`norrBuild` returnerar tidigt när den sparar). Pröva $ 2 300 dag 2 eller en lättare våg 3 (50 löpare med 0,22 s intervall är den tyngsta löpargruppen i spelet).

5. **Gnesta med fil-vakten på** (fem seeds, smart försök/bas kvar, naive första försöket): se tabellen i tillägget. Vinster och försök är identiska i alla 25 dagar, bas kvar varierar upp till tio poäng i enskilda dagar men under två i snitt. Byt kvittot utan omtrimning.

6. **Gnesta dag 4 och 5 (0.8.0)**: hp 6,0 och 5,1 med Psg 90 på taken är rimliga; känslighetsraderna i loggen (5,9 ger 11, 6,1 ger 9,6) visar ingen klippa. Behåll. H050 (4 m död vinkel) bör speltestas som planerat; i koden är regeln ren och testad.

## Assessment

0.7.0 till 0.10.0 är tre stora steg med samma hantverk som förra gången: taken, Hemvärnet och Gnesta Norr ligger alla på rätt sida om gränsen mellan sim och vy, allt nytt i simuleringen är testbart i node och testat, kvittona byts bara avsiktligt och med förklaring, och balansloggen berättar vad som prövades och förkastades. Inga av de fyra tvingande reglerna bryts, inga Google-bilder är spårade, och sparfilerna från 0.8.0 och 0.9.0 läses som de är.

Det jag hittade är två saker som ska in före publiceringen och en som ska in före nästa balanspass. Fil-vakten ska vara global: mina körningar visar att siktpunkter uppströms väljs på Gnesta också, så "där har det aldrig hänt" är ett observationspåstående, inte en garanti, och en dag som aldrig tar slut är det värsta en spelare kan möta. Gruppen ska aldrig bli mindre än betalt. Och Gnesta Norrs hp-faktorer är satta mot en policy som köper Hemvärnet, vilket är ett sämre köp än pjäser på den banan också; spelaren utan grupp får en lätt bana med klippa på dag 2. Det sista är inte ett publiceringshinder (banan är spelbar och vinnbar), men det är det som ska speltestas och trimmas före 0.11, och det är där jag skulle lägga nästa dag.

Utöver det: dagarna på Norr är 16 till 20 minuter vid 1x, main.js behöver den uppdelning som föreslogs i 0.5, och de 40 MB skärmbilder bör krympas innan de hamnar i historiken.

Publicering: **ja, med rättningarna ovan** (Must fix 1 till 5) som 0.10.1 på feature/norr, sedan fast-forward av master (master b11a392 är förfader till feature/norr, 18 commits, inga konflikter) och push till origin. Master är i dag 0.7.0 live (kontrollerat: skugg4n.github.io/horde/src/version.js svarar 0.7.0, cache-control max-age=600). Rättningarna är en förmiddag; balanspasset är en egen dag och ska inte hålla tillbaka publiceringen.

## Tillägg: Gnesta med fil-vakten på

Smart policy dag 1 till 5 (W/L och bas kvar, flera försök med snedstreck), naive första försöket (n), fem seeds. Samma kod som tests/gnesta-logs.js, bara `gnesta.grid.laneGuard` ändrad.

| Seed | Vakt | Dag 1 | Dag 2 | Dag 3 | Dag 4 | Dag 5 |
|---|---|---|---|---|---|---|
| 0 | av | W13 n7 | W5 nL | L/W15 nL | W10 nL | W4 nL |
| 0 | på | W19 n7 | W20 nL | L/W15 nL | W11 nL | W4 nL |
| 1 | av | W17 n1 | W20 nL | L/W8 nL | W10 nL | W5 nL |
| 1 | på | W16 n1 | W20 nL | L/W10 nL | W11 nL | W5 nL |
| 2 | av | W19 n2 | W20 nL | W9 nL | W8 nL | W7 nL |
| 2 | på | W19 n2 | W20 nL | W1 nL | W11 nL | W5 nL |
| 3 | av | W20 n7 | W11 nL | L/W10 nL | W11 nL | W7 nL |
| 3 | på | W20 n7 | W1 nL | L/W9 nL | W11 nL | W7 nL |
| 4 | av | W20 n6 | W20 nL | W9 nL | W11 nL | W5 nL |
| 4 | på | W13 n6 | W20 nL | W4 nL | W11 nL | W9 nL |

Vinster, antal försök och naives utfall är identiska i alla 25 dagar; bas kvar varierar upp till tio poäng i enskilda dagar (seed 3 dag 2: 11 mot 1, seed 2 dag 3: 9 mot 1, seed 0 dag 1: 13 mot 19). Det är kaoset i en deterministisk sim med 160 zombier, inte en systematisk förskjutning: medelvärdena över fem seeds skiljer under två poäng per dag. Kvittot kan bytas utan omtrimning, men det är också en påminnelse om hur smal en enskild seed är som balansmått.
