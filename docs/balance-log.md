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

## 0.3.0: forskning i nivåer, granatlåda, next wave med bonus, starkare taggtråd

Nya system:
- Forskning i noder med nivåer (src/data/research.js). Pris stiger per nivå: M2 100/120/170, M249 rate 40/80/130, Heavy wire 50/90, Concrete barrier 60/70/120, Bigger budget 70/110/170, New position 80, Grenades 60/100/150. Krav pekar på en nivå: barriär kräver Heavy wire I, M249 rate III och Grenades III kräver M2 I, Budget III kräver New position. Skäl: alltid något nytt att forska, och de dyra topparna hamnar efter dag 3.
- Effekter: M249 rate x1,25/1,45/1,65, M2 skada x1,2/1,4, tråd x2/x3, barriärens hp x1,5/x2, budget +150/+250/+350.
- Granatlåda (Olas beslut): köps per position för $ 200 när Grenades är forskat. Kastar när minst 4 zombier, eller en bjässe, är inom 13 m. Flygtid 0,8 s, skadan avtar till 40 % vid kanten. Nivå I 75 skada, radie 3 m, 10 s mellan kasten. II 95 skada, 3,5 m. III två granater per kast med 80 skada. Lådan kostade först $ 300: policyn hann bara köpa den sent på dag 3 och fick 0 till 7 kast, ingen skillnad. Med $ 200 blir det 8 till 17 kast.
- Next wave: 5 s nedräkning efter en klarad våg, sedan startar nästa själv. Tidigt kall ger $ 5 per sekund som sparas (under nedräkningen sekunderna kvar, mitt i en våg 5 s plus högst 5 s återstående spawn). Först $ 10 per sekund: girig policy fick $ 100 extra på dag 2 och 3 och dag 3 vanns på första försöket i 3 av 5 seeds. Med $ 5 håller kurvan.
- Policyerna (greedy, strong) kallar tidigt när basen är hel och ingen levande zombie är förbi halva vägen, mitt i en våg bara när allt i vågen kommit och högst 3 lever. Utan gränsen på 3 levande förlorade girig dag 2 i 3 av 5 seeds (vågorna staplades). Lådan köps på den pjäs som når mest väg (C, D, B, A), högst en per dag.

Starkare taggtråd (Olas önskan efter speltest):
- Tråd: farten 0,5 till 0,4 (zombierna går i 40 % av sin fart), hållbarhet 40 till 60 s. Skäl: tråden märktes knappt på dag 1 och 2.
- Det gjorde dag 2 och 3 för lätta (dag 2 bas 20 i alla seeds, dag 3 vanns på första försöket). Motvikt: dag 2 våg 2 löpare 12 till 18, våg 3 löpare 32 (0,45 s) till 48 (0,32 s), dag 3 våg 3 löpare 12 (0,8 s) till 24 (0,5 s), bjässens hp 500 till 560.

Resultat (girig, fem seeds): dag 1 vinns med 20 kvar (minimal en M249: A 13, B 17, C 20). Dag 2 vinns på första försöket med 5, 17, 20, 20, 15 kvar (snitt 15,4). Dag 3 förloras på försök 1 och 2 och vinns på försök 3 i alla fem (och i alla åtta i balansskriptet). Ras på 41 till 45 s. Utan forskning förloras dag 3 i alla.

Granater på dag 3, girig, med M2, Heavy wire, budget, barriär och M249 rate I (bas kvar över fem seeds):

| Granater | Bas kvar | Kast per dag |
|---|---|---|
| ingen | 2 till 6 | 0 |
| I | 5 till 8 | 8 till 9 |
| II | 8 till 14 | 8 till 9 |
| III | 9 till 18 | 15 till 17 |

Ett stöd, inte huvudsaken: nivå I ger några liv, III gör dag 3 bekväm men aldrig orörd.

## 0.4.2: Gnesta dag 1 till 5, barrikadpris

Mätt med `npm run balance` (sista delen) och `tests/balance-gnesta.test.js`, fem seed-förskjutningar. Spelaren kommer från E4 med forskningen en girig E4-körning slutar med (M2 II, M249 rate II, Heavy wire I, budget I, barriär I, granater I, New position) och köper forskning mellan Gnesta-dagarna i samma ordning som på E4.

Policyer (scripts/balance.mjs):
- `smart`: spärrar Sigtunavägen mellan första och andra stickgatan, så att horden går runt kvarteret (upp en stickgata, längs cykelvägen, ner den första) förbi positionerna i kvarteret. En väg hålls alltid öppen, så ingen barrikad behöver slås sönder. Vapen byggs på de positioner som når flest rutor av hordens väg (räknat med M2:s räckvidd), taggtråd där flest av de fyra första pjäserna når, granatlådor när första vågen är klar (1, 1, 2, 3, 3 per dag), sedan uppgraderingar. Köpordning: vapen, barrikad, vapen, tråd, fler vapen, resten av tråden.
- `naive`: samma vapenval (efter sin egen väg), tråd, lådor och uppgraderingar, aldrig en barrikad.
- Vågkall och köp mitt i vågen som `greedy` på E4 (samma kod, `runDay`).
- Först valde smart sina spärrar girigt efter täckning (bästa fyra positionernas rutor inom räckhåll). Den valde gärna en spärr längst österut och en på norra stigen: längre väg, men i simuleringen förlorade den dag 2 och 3 oftare än varvet runt kvarteret närmast basen. Skäl: längre väg betyder att första pengarna kommer senare, och pjäserna hamnar utspridda. Varvet runt kvarteret höll bäst alla dagar, och det är den spärr designen beskriver.

Barrikadpris (Olas H033): en spärr tvärs över gatan kostade per ruta, så Sigtunavägen (4 rutor) kostade $ 600 för en barrikad och $ 320 för en taggtråd. Nu kostar en spärr hindrets pris en gång, hur bred gatan än är: barrikad $ 150, taggtråd $ 80, samma som en ruta på E4. Hel spärr ger halva priset tillbaka. Skäl: ett vapen kostar $ 250 till $ 600, så en spärr för $ 150 är ett riktigt val (ungefär en halv M249) men går att ha råd med dag 1. Per ruta straffade det breda gator, som är de man helst vill spärra. E4 påverkas inte (en ruta = en spärr). Panelen visar priset på kortet och "One price for the whole width".

Ny regel i data: `day.hp` i banans dagar (hp-faktor för alla zombier den dagen, standard 1, läses när en zombie skapas). Skäl: spelaren kommer med E4:s forskning, och första försöken visade att inga zombiemängder under ca 250 levande ens skadade basen, inte ens för en naiv spelare med två pjäser (två M2 dödade 170 vandrare per dag utan läckor). Fler zombier ryms inte i prestandabudgeten, så de måste tåla mer. Bounty är oförändrad, så pengarna växer inte med svårigheten. E4 har ingen faktor och kvittot är oförändrat.

Dagarna (src/data/gnesta.js, kartdata 0.2.1):
- Dag 1: start $ 800 (950 till 800), hp 2,8. Vågor 30, 50 och 70 vandrare plus 30 löpare (förut 20, 32, 52 vandrare). Skäl: smart ska vinna direkt och naiv ta klart mer skada. hp 2,6 gav ingen skada för någon, 3,0 fick naiv att förlora.
- Dag 2: start $ 900 (1050), hp 3,8. Vågor 60, 80 och 160 (norra vägen från våg 1). Skäl: vid 3,5 förlorade naiv 4 av 5, vid 3,8 alla, smart vinner direkt med 14 till 20 kvar.
- Dag 3: start $ 1000 (1200), hp 4,2. Våg 1 lätt (46 vandrare), våg 3 tung (70 vandrare, 70 löpare, 50 vandrare). Skäl: en tung första våg straffade den som byggt barrikad (pengarna kommer senare på den längre vägen) och naiv klarade sig bättre än smart. Med en sågtand i dagen vinner smart med 8 till 20 kvar och naiv förlorar.
- Dag 4: start $ 1100 (1400), hp 4,6, fler bjässar (6, 8, 20). Skäl: 4,4 till 4,75 ger 4 till 10 kvar, 5,0 ger 2 till 4 och 5,4 förlorar alltid (bjässarna tål då 3 000). Utan forskningen efter E4 förloras dagen i alla seeds; granatlådorna ger 1 till 3 liv.
- Dag 5: start $ 1200 (1600), hp 4,0, något färre zombier än första gissningen (flest levande 255 blev 231). Skäl: dagen ska vara svårast (2 till 5 kvar) men gå att vinna; 4,2 gav förlust i två av tre försök och omförsöken hjälper knappt eftersom forskningen nästan är slut vid dag 5.
- Introtexter: dag 1 säger att zombierna här tål mer, dag 4 att bjässarna slår sönder en barrikad på sekunder bara om alla vägar är stängda (horden slår bara på barrikader då).

Resultat (smart: försök till vinst / bas kvar, naiv första försöket):

| Dag | Smart | Naiv | Flest levande |
|---|---|---|---|
| 1 | 1 / 15 till 20 | vinner med 1 till 12 | 95 |
| 2 | 1 / 14 till 20 | förlorar i alla fem | 160 |
| 3 | 1 / 8 till 20 | förlorar i alla fem | 190 |
| 4 | 1 / 5 till 9 | förlorar | 154 |
| 5 | 1 / 2 till 5 | förlorar | 231 |

Förluster rasar gradvis: 87 till 470 s från första skadan till noll (naiv, och smart dag 5 med bara E4:s forskning).

Att speltesta: smart vinner alla dagar på första försöket, så "kan förlora dag 5 första gången" sker bara med svagare spel än policyn. Dag 5 är smal (2 till 5 kvar): en sämre spelare förlorar, och omförsök ger lite eftersom forskningen tar slut runt dag 4. Granatlådorna är fortfarande ett stöd (1 till 3 liv), inte huvudsaken.

## 0.5.0: fri placering och siktlinjer

Positionerna är borta. En pjäs ställs i valfri 2 m-ruta där zombierna inte går (minst 5 m mellan pjäserna, högst fyra plus More positions I till III), och den skjuter bara mot zombier i gatrutor den ser: husen skymmer, häckar, staket, bilar och barrikader gör det inte. Det ändrade allt i balansen, eftersom en pjäs nu kan stå precis vid vägkanten där den ser mest.

Policyerna (scripts/balance.mjs):
- `coveragePlan`: varje öppen ruta får sin täckning, hordens vägrutor inom räckvidden som syns därifrån. Pjäserna väljs en i taget efter det de lägger till; en vägruta som redan ses av k valda pjäser väger 0,5^k på E4 och 0,7^k på Gnesta, så att pjäserna sprids men ändå hjälps åt. Skäl: utan avtagande står alla pjäser i en klunga och ser samma bit (starkast i simuleringen, men ingen människa gör så och den gav inga skillnader mellan policyerna); med 0,5 på Gnesta hamnade pjäserna utspridda längs hela slingan och sköt en och en.
- E4 `greedy`: planen över hela vägen med M249:ns räckvidd. Pjäserna hamnar vid (5, -5), (11, -5), (5, 5), (11, 5): tätt intill vägen mitt på sträckan. Policyn `strong` (fasta positioner C, B, D, A) togs bort, den har inget att välja mellan längre.
- E4 `minimal`: en M249 på tre platser en förstagångsspelare gärna väljer (A tätt intill vägen, B snett framför basen, C långt från vägen bakom basen), ingen av dem den bästa.
- Gnesta `smart`: spärren flyttad från Sigtunavägen mellan stickgata 1 och 2 till Sigtunavägen strax öster om rondellen (-45, 24). Horden måste upp första stickgatan, längs cykelvägen och ner över det öppna fältet till rondellen. Vägrutorna närmast basen väger dubbelt mot ingången. Skäl: prov med samma pjäser och olika spärrar (3 seeds, dag 1): varvet runt kvarteret gick mellan husen där pjäserna såg 25 till 30 vägrutor, och smart var inte bättre än naive (bas kvar 6, 7, 14 mot 6, 9, 6 med naives egna platser). Vid rondellen ser bästa platsen 42 rutor över fältet, och smart vann med 16, 16, 20 mot naives 6, 9, 8. Två spärrar (rondellen och stickgatorna) var sämre än en.
- Gnesta `naive`: som förut, men pjäserna efter täckning av sin egen väg.

E4 (fem seeds):
- Dag 2 hp-faktor 1,5 (ny). Skäl: med pjäserna vid vägkanten vann girig dag 2 utan skada (bas 20 i alla seeds); målet är snitt 4 till 17. Nu 10, 11, 7, 11, 14.
- Dag 3 hp-faktor 1,15 (ny). Skäl: girig vann dag 3 på första försöket (bas 2 till 5) trots målet att första försöket ska förloras. Med 1,08 vann en seed direkt och en på andra försöket, med 1,15 förloras försök 1 och 2 i alla seeds (basen faller på 39 till 45 s) och försök 3 vinns med bas 6 till 15 efter m2, wireTough, budget, block, grenade, m249Rate och More positions I. Dag 3 utan forskning förloras fortfarande.
- Dag 1 orörd: girig vinner utan skada, en M249 ensam vinner med snittskada 3,7 till 5,3 över A, B, C (mål 1 till 6).
- Fyra pjäser i stället för tre utan forskning: E4 hade A, B, C öppna och D bakom New position. Nu fyra, fem med More positions I.
- Kvittot i tests/route-e4.test.js är nytt (3a2cb567, 7663 tecken). Skäl: fri placering, policyn strong borta, nya hp-faktorer. Det byts avsiktligt en gång här.

Gnesta (fem seeds, efter E4 med girig policy):
- Startforskningen från E4 är större än förut (E4 dag 3 tar tre försök i stället för två): m2.1, wireTough.1, budget.1, block.1, grenade.1, m249Rate.1, positions.1, m2.2, m249Rate.2.
- hp-faktorer dag 1 till 5: 2,8 / 3,8 / 4,2 / 4,6 / 4,0 till 3,8 / 4,6 / 4,8 / 5,6 / 4,6. Skäl: fri placering gjorde alla dagar lätta (smart vann dag 1 till 5 direkt med bas 15 till 20, naive likaså). Varje dag trimmades för sig i ordning med samma mål som 0.4.2.
- Resultat: dag 1 smart vinner direkt med bas 16 till 20 (snitt 17,4), naive 4 till 12 (snitt 7,8). Dag 2 smart direkt (snitt 12,6), naive förlorar i tre av fem. Dag 3 smart på försök 1 eller 2 (förlust faller på 135 s). Dag 4 smart direkt med snitt 7, med bara E4:s forskning förloras den, granatlådorna ger lika eller mer bas kvar i varje seed. Dag 5 smart på försök 1 eller 2 med snitt 4,4, lägst av alla dagar. Flest levande 239 (gräns 250).
- Märkt: naive vinner dag 3 med full bas medan smart förlorar första försöket. Skogsvägen öppnar då, och med spärren vid rondellen går alla tre ingångarna över fältet i en lång kö; naive möter dem på Sigtunavägen där pjäserna ser lika långt. Testerna kräver inget om naive dag 3, men det är värt ett speltest: kanske ska spärren läggas på ett annat ställe när skogsvägen öppnar.

Ny kostnad i forskningen: More positions I 80 (kräver M2 I, som förut), II 140, III 220. Balanspolicyn köper II sist i ordningen; ingen körning kom dit än.

## 0.5.2: kvitto för Gnesta

- Gnestas balanslogg har ett fingeravtryck som E4 (`tests/route-gnesta.test.js`, '2cf5b351', 39527 tecken): smart policy dag 1 till 5 över fem seeds plus naiv dag 1 till 5. Körningen delas med `tests/balance-gnesta.test.js` via `tests/gnesta-logs.js`.
- Ingen balansändring. Barrikaden kräver nu forskningen även på Gnesta och en spärr får inte läggas på levande zombier; båda kvittona (E4 och Gnesta) är oförändrade, eftersom E4-spelaren redan har block.1 och policyerna aldrig spärrar där zombier står.
- Gnestas längsta zoom är 68 m (var 84).

## 0.6.0: basen är ishallens entré

- Basen (hordens mål) flyttad från rondellens mitt till ishallens huvudingång, framför dörrarna i tillbyggnaden mot rondellen (H039). En kort gångbar förplan går från rondellen till dörrarna. Tillbyggnaden är nu hus i placeringen (förut gick det att ställa en pjäs inne i den), och rondellens ö går att bygga på (sista försvarslinjen, utom vid flaggstången och elskåpen).
- Vägarna: Sigtunavägen öst blir 9 rutor längre (runt rondellen till entrén), smarts väg över fältet 3 rutor kortare (fältet slutar vid rondellens spets, som ligger närmast entrén). Den norra gruppen (dag 2, 3 och 5) tar nu cykelvägen bakom husen hela vägen till entrén i stället för Sigtunavägen: cykelvägen är 21 kostnadsenheter (två rutor) billigare till den nya basen. Dag 2 har alltså två riktiga ingångar.
- Det krävde balans. Med 0.5.2:s siffror blev dag 1 svårare för smart (bas kvar 2 till 20, snitt 12 mot 17,4) och naiv förlorade alla dagar; naiv dag 2 föll på 7 till 10 s (två pjäser räcker inte för två ingångar, kolonnen från öst gick rakt in), vilket bröt "en förlorad dag rasar gradvis".
- Dag 1 hp-faktor 3,8 till 3,6: smart vinner direkt med bas 13 till 20 (snitt 17,8, förut 17,4), naiv vinner med 1 till 7 (snitt 4,6, förut 7,8).
- Dag 2 startkassa $ 900 till $ 1100 och hp 4,6 till 5,0: pengar till en pjäs vid den andra ingången, samma tryck. Smart vinner direkt med bas 5 till 20 (snitt 15,2, förut 12,6), naiv förlorar alla fem och basen faller på 140 s i stället för 8.
- Dag 3 till 5 orörda: smart dag 3 på försök 1 eller 2, dag 4 direkt med bas 7 till 9, dag 5 direkt med bas 5 till 8 (lägst av dagarna). Flest levande 238.
- Kvittot i tests/route-gnesta.test.js byttes avsiktligt: '38b664c', 37245 tecken.
- Betongbarriären finns på Gnesta från dag 1 utan forskning (banans upplåsningar, `unlocks`). Policyn hade redan block.1 från E4, så det ändrar inget i loggen.

## 0.8.0: arsenalen (Ksp 90, Ksp 58, Ksp 88, Ak 5 + granattillsats, Psg 90)

Vapnen (src/data/weapons.js), skada per sekund på nivå 1 utan forskning (eld x skada x träff):

| Vapen | Pris | Räckvidd | Eld/s | Skada | Träff | Per sekund | Särskilt |
|---|---|---|---|---|---|---|---|
| Ksp 90 (förut M249) | 250 | 16 | 8 | 4 | 0,70 | 22 | oförändrad |
| Ksp 58 | 400 | 19 | 7 | 10 | 0,72 | 50 | mitt emellan |
| Ksp 88 (förut M2) | 600 | 22 | 4 | 22 | 0,75 | 66 | oförändrad |
| Ak 5 + granattillsats | 450 | 17 | 2,5 | 7 | 0,85 | 15 | 40 mm-granat var 4,5 s, 55 skada, radie 2,6 m |
| Psg 90 | 700 | 34 | 0,6 | 90 | 0,95 | 51 | går igenom två, får ligga på tak |

- Ksp 90 och Ksp 88 har samma siffror och samma id (m249, m2) som förut, så E4:s kvitto (`3a2cb567`) är oförändrat. E4-kampanjen når aldrig de nya noderna.
- Ksp 58 började på 6 x 9 (39 per sekund). En Ksp 90 med Faster III gör 37 för 250, så Ksp 58 var inte värd sina 400; nu 7 x 10.
- Psg 90 började på 0,7 skott per sekund. Med två skyttar på taken blev Gnesta dag 5 lättare än dag 3 och 4; 0,6.

Forskningen (H034): tre nya noder med tre nivåer (Ksp 58 kräver Ksp 88 I, Psg 90 kräver Ksp 88 II, Ak 5 kräver Grenades I) och More positions IV (320, kräver Psg 90 I). Totalt 4240 poäng mot 2130 förut. Den smarta policyn hade förut köpt nästan allt inför Gnesta dag 4; nu har den 2710 kvar att lägga vid dag 4 och 1780 efter dag 5.

Policyerna (scripts/balance.mjs):
- Ordningen: Psg 90 direkt efter Ksp 88 III, Ksp 58 och Ak 5 efter Grenades III och Bigger budget III, sedan nivåerna. Smart har Psg 90 från dag 4 och Ak 5 dag 5 i tre seeds av fem.
- Taken: `roofPlan` väljer takrutor som ser mest av hordens väg med takets sikt (allt inom räckvidd utom inom 4 m från det egna huset). Med spärren vid rondellen blir det två villor vid rondellen, (-41, 3) och (-39, -5), som ser 80 och 81 rutor av vägen över fältet. Ett tak bemannas dag 1 till 4, två dag 5. Policyn sparar till skytten: inga fler pjäser på marken och inga granatlådor förrän taken är bemannade.
- Ak 5: högst en, på nästa lediga plats i planen. Ksp 58 i stället för Ksp 90 på marken när den är forskad (Ksp 88 först om den går att köpa).
- Prövat och förkastat: Ksp 58 före dag 4 (efter Grenades II). Granatlådorna blev då sämre än pengarna i alla fem seeds dag 4 (bas kvar med lådor 1 till 3 lägre än utan), vilket bryter målet att lådorna spelar roll. Att köpa lådan efter uppgraderingarna eller göra Grenades II starkare räckte inte.

Gnesta (fem seeds, efter E4 med girig policy):
- Dag 1 till 3 orörda (hp 3,6 / 5,0 / 4,8), resultaten likaså: dag 1 smart direkt med 13 till 20, dag 2 direkt med 5 till 20, dag 3 på försök 1 eller 2.
- Dag 4 hp 5,6 till 6,0. Skäl: Psg 90 på taket gjorde dag 4 lättare (snitt 12,4, målet högst 12). Nu direkt med 8 till 11 (snitt 10). Granatlådorna: med 8 till 11, utan 7 till 10, lika eller bättre i varje seed. Med bara E4:s forskning förloras dagen.
- Dag 5 hp 4,6 till 5,1. Skäl: två skyttar på taken gav snitt 10,6, högre än dag 3 och 4. Nu direkt med 4 till 7 (snitt 5,6), lägst av dagarna. Flest levande 241 (gräns 250).
- Naiv: oförändrad bild, vinner dag 1 med 1 till 7, förlorar dag 2 till 5.
- Känslighet: dag 4 hp 5,9 ger snitt 11, 6,1 ger 9,6. Dag 5 hp 5,0 ger 7,8, 5,2 ger 3,6. Ingen klippa runt de valda värdena. (Med Ksp 58 före dag 4 var dag 3 en klippa: hp 5,1 gav snitt 14, 5,2 gav 6, 5,4 förlust i alla seeds.)
- Kvittot i tests/route-gnesta.test.js byttes avsiktligt: 'cb76292', 38121 tecken.

## 0.9.0: Hemvärnet

Gruppen (src/data/weapons.js `hv`, src/sim/squad.js): fyra soldater med Ak 4 för $ 250, en position. Siffrorna gäller per soldat. Nivå 2 ($ 200) ger en femte soldat och mer liv, nivå 3 ($ 300) bättre gevär (skadan som andra vapen, 30 % per nivå). Finns från början, ingen forskning.

| | Pris | Räckvidd | Eld/s | Skada | Träff | Per sekund | Liv per man |
|---|---|---|---|---|---|---|---|
| Hemvärnet nivå 1 (4 man) | 250 | 15 | 1,3 | 5 | 0,72 | 19 | 30 |
| Hemvärnet nivå 3 (5 man), allt som lagts 750 | | 18 | 1,7 | 8 | 0,72 | 49 | 50 |
| Ksp 90 nivå 1 | 250 | 16 | 8 | 4 | 0,70 | 22 | osårbar |
| Ksp 90 nivå 3 med Faster III, 800 | | 19 | 17 | 6,4 | 0,70 | 77 | osårbar |

- Svagare per krona än Ksp 90 och mycket svagare mot bjässarna, men fyra siktlinjer i stället för en: gruppen ser runt ett hus eller ett kvarter där en pjäs bara ser åt ett håll.
- Zombier som står i en ruta intill en soldats ruta stannar och slår honom (zombiens hitDamage per sekund, vandraren 8, bjässen 30). Stupade skjuter inte. De ersätts i panelen för $ 60 per man och springer ut igen; nästa dag börjar alla om ändå (inget följer med mellan dagarna). Pjäserna är osårbara som förut: att göra dem sårbara skulle ändra alla dagar på båda banorna, och det är gruppens svaghet som gör skyddet värt att tänka på.
- Skyddsvalet är deterministiskt (lägst rutnyckel vid lika) och ändrar ingen slump: en dag utan grupp ger exakt samma förlopp som i 0.8.0.

Policyerna (scripts/balance.mjs, `HV_POLICY`):
- E4: girig policy köper en grupp dag 1 direkt efter första Ksp 90, på nästa lediga plats i planen (billig täckning tidigt). Gruppen tar skydd vid bilen och vid pjäsens sandsäckar och ingen stupar. Utfallen är desamma som i 0.8.0 (dag 1 direkt med full bas i alla seeds, dag 2 och 3 som förut); kassan efter vågorna dag 1 ändras.
- Gnesta: planen har egna platser för gruppen (`plan.squads`, där gevären med 15 m räckvidd ser mest av hordens väg). Från dag 2 köps en grupp när en position står tom efter första vågen och planen inte har fler platser för pjäser; policyn sparar då till gruppen före uppgraderingarna. I de fem seedsen händer det aldrig (planens platser räcker), så smart och naiv spelar som i 0.8.0.
- Prövat och förkastat:
  - E4, en grupp varje dag efter första pjäsen: dag 2 blev för svår, bas kvar snitt 3,2 (1, 6, 5, 1, 3), målet 4 till 17. Gruppen tar pengarna som annars blir taggtråd mot löparna.
  - Gnesta, en grupp dag 1 efter barrikaden: smart bas kvar dag 1 3 till 15 (förut 13 till 20), naiv förlorar dag 1 i alla seeds (förut vann med 1 till 7). Gruppen tar pengarna till andra pjäsen.
  - Gnesta, gruppen som tredje position dag 1: smart förlorar dag 1 två gånger i seed 0 och en gång i seed 1.
  - Gnesta, en grupp i en lucka dag 2 till 5 före fler pjäser och uppgraderingar: gruppen köps (2 av 4 man stupar oftast, de närmast gatan), men dag 3 tar tre försök i tre seeds och granatlådorna slutar spela roll dag 4 (seed 3: med lådor 9, utan 11). Bara dag 2 och 3 eller 2, 3 och 5: dag 3 tar fler försök, policyn får mer forskning och dag 4 blir för lätt (bas kvar 12 till 13, målet högst 12).
- Slutsatsen: på Gnesta är gruppen sämre än alla alternativ för policyerna. Zombiernas hp-faktor (3,6 till 6) och forskningen för Ksp 90 (Faster III ger 37 per sekund mot gruppens 19 för samma pris) gör att en position med gruppen kostar mer än den ger. Om Hemvärnet ska ha en roll på Gnesta behövs forskning för gruppen (bättre ammunition, större grupp från början) eller ett lägre pris; det är en fråga för speltest (todo.md H054), inte gissat här.
- Kvittona byttes avsiktligt: E4 'f322422c' (7658 tecken), Gnesta '759821b7' (39386 tecken; planens nya fält ligger i naiv-körningarnas resultat).

## 0.10.0: Gnesta Norr och Hemvärnets forskning

Ny bana (src/data/gnesta-norr.js): Gnesta med dimman bortdragen norrut. Horden kommer mest norrifrån, Dansutvägen väster (dag 1 Vikingavägen norr, dag 2 också Dansutvägen väster), genom radhusen från Östra Storgatan (dag 4, överraskningen) och Sigtunavägen öst igen dag 5. Vägen från norr till entrén är lång: en vandrare från Dansutvägen väster är framme efter cirka 250 s med tom karta (Gnesta: 100 till 130 s).

Hemvärnet (H054), tre forskningsnoder utan krav på andra vapen:

| Nod | Nivåer (pris) | Effekt |
|---|---|---|
| Better rifles | 80, 130, 190 | Ak 4 skada x1,2/1,4/1,6, eld x1,1/1,2/1,3 |
| Bigger squad | 120 (kräver Better rifles I), 200 | en eller två man till i varje grupp |
| Hemvärnet veterans | 100 (kräver Bigger squad I), 160 | liv per man x1,5 / x2 |

- Per krona blir gruppen med full forskning ungefär lika bra som Ksp 88 nivå 3, men per plats svagare (positionerna är det som tar slut), och den är sårbar. Prov: tests/hemvarn-research.test.js.
- På Gnesta dag 4 (fem seeds, smart policy, en grupp direkt): med forskningen vinner gruppen alla fem (bas kvar 6 till 9, summa 33), utan forskningen förloras en och resten slutar på 2 till 4 (summa 13). En pjäs till i stället ger summa 50. Gruppen är alltså ett riktigt val, inte bättre än pjäserna. Gnestas och E4:s policyer köper fortfarande inte forskningen (RESEARCH_ORDER är orörd), så deras kvitton är oförändrade.
- Tegelmurarna mellan radhusens förgårdar är ett eget skydd ('brick wall', poäng 9, på huk). Prövat 8: gruppen valde bilarna på parkeringen framför och husknutarna i stället, ingen tog muren.

Policyerna för Gnesta Norr (scripts/balance.mjs, `TOWN['gnesta-norr']`, `norrBuild`):
- smart: spärrar Vikingavägen söder om den andra stigen till Gångvägen, så att horden går hela Gångvägen förbi radhusen. Dödszonen är Gångvägens södra del (längorna E, G och H): pjäserna ställs varannan i dödszonen, varannan i sista linjen framför entrén (sista fjärdedelen av vägen), gruppen vid tegelmurarna, första Psg 90 på det radhustak som ser mest och de andra på vilket tak som helst. Köpordningen: spärren, ett tak, Hemvärnet, pjäser, taggtråd, fler tak efter två pjäser, granatlådor efter första vågen, uppgraderingar först när planen inte har fler lediga platser. Hemvärnets forskning köps först (NORR_ORDER), sedan resten som förut. Dag 5 spärras också Sigtunavägen vid rondellen.
- naive: samma köp, allt ställt efter sin egen väg (vilket tak, vilken plats), aldrig en spärr.
- Prövat och förkastat:
  - Spärren söder om Gångvägens början, utan stigarna: horden från Dansutvägen gjorde en U-sväng vid Vikingavägens krök (Dansutvägen och Vikingavägen möts bara vid länken i nordost), och den U-svängen var en bättre dödszon än Gångvägen. Naive vann med full bas där smart förlorade. Stigarna mellan stickgatornas vändplaner och Gångvägen (tomtgränserna i kartbilden) tog bort U-svängen.
  - Två spärrar (Gångvägens början och Vikingavägen) genom radhuskvarteret: 281 rutor för Dansutvägen men pjäserna ser lite mellan längorna, sämre än en spärr.
  - Dödszonen över hela Gångvägen: sämre för smart. Psg 90 bara på radhustak: dag 3 lika många läckor som naive (13 mot 13 vid hp 8). Alla skyttar på villatak: bäst för smart (2 mot 17) men då spelar radhusens tak ingen roll; mitt beslut blev första skytten på radhustaket.
  - Mer pengar dag 3 ($ 2200 i stället för 2000): sämre för smart (en Ksp 88 i stället för en Ksp 58 och en plats till), så $ 2000.
- Vågorna har gruppernas löpare och de östra ingångarna utspridda (0,4 till 1,4 s mellan zombierna) och bjässarna efter de andra: annars kom en klump fram samtidigt och basen föll på 7 till 27 s.
- Fil-vakten (src/sim/route.js, `laneGuard`, bara Gnesta Norr): där två smala gångar möts (radhusgången och tvärgången i öster) kunde filens siktpunkt hamna uppströms i den andra gången, och zombien pendlade mellan två rutor för alltid. Dagen tog aldrig slut. Med vakten godtas ingen siktpunkt längre från basen än zombiens egen ruta. Gnesta och E4 har ingen vakt och samma kvitton.

Dagarna (hp-faktor, startkassa; spelaren har Gnestas forskning och Bigger budget III, $ 350 till):

| Dag | hp | Kassa | Smart, försök till vinst / bas kvar (fem seeds) | Naive |
|---|---|---|---|---|
| 1 | 3,7 | 2100 | 1/20 i alla | vinner med 1 till 10 (snitt 5,2) |
| 2 | 7,2 | 2100 | 1 till 2 / 1 till 7 | förlorar alla |
| 3 | 7,6 | 2000 | 1 / 5 till 11 | förlorar alla |
| 4 | 7,9 | 2200 | 1 till 2 / 2 till 7 | förlorar alla |
| 5 | 9,0 | 1800 | 1 till 2 / 3 till 4 (lägst) | förlorar alla |

- hp-faktorn är högre än på Gnesta (3,6 till 6): spelaren har mer forskning, mer pengar och en längre väg att skjuta längs. Dag 1 är lägre: alla kommer från ett håll och en klump som läcker förbi går hela vägen till dörrarna.
- Förlorade försök rasar på 81 till 713 s. Flest levande 163. Hemvärnet används alla dagar i alla seeds (200 till 1900 träffar per försök).
- Känslighet: kurvan har klippor, både i hp och i pengar. Dag 4 hp 7,6 ger naive vinst i två seeds, 8,2 ger smart fem försök i en seed; dag 5 hp 9,4 ger sex försök i en seed. Dagens längd: 300 s (dag 1) till 1000 s (dag 3 till 5) speltid.
- Kvittot för Gnesta Norr: tests/balance-norr.test.js, '6f86b22c' (65389 tecken). E4 och Gnesta oförändrade.

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

### 0.4.1: instansierade zombier (Gnesta, 250 zombier)

Mätt 2026-10-15 headless (Chrome for Testing via Playwright, `headless: true`, Metal, 1440 x 900, pixeltäthet 1, inget fönster). Skript: Gnesta dag 5 med `?debug`, 280 zombier i kön (vandrare, löpare och bjässar i förhållandet 3:2:1, jämnt över de tre ingångarna), 45 s framåt så att horden fyller gatorna, sedan 30 dödade (24 kroppar ligger kvar) och var tredje skadad (hälsoringar). Kameran utzoomad över hela östra delen (vy 84 m). Mätt 6 s: anrop = `renderer.info.render.calls` (skuggpass och huvudpass), arbete = tiden i spelets bildrutefunktion (CPU), plus en körning med processorn strypt 4 gånger (CDP `Emulation.setCPUThrottlingRate`) som ersättning för en långsammare laptop. Headless-läget går i 120 Hz, så 120 fps är taket.

| 233 levande, 30 döda | Före (0.4.0) | Efter (0.4.1) |
|---|---|---|
| Anrop medel / högsta | 2 553 / 2 604 | 365 / 365 |
| Trianglar | 202 000 | 223 000 |
| Arbete per bildruta medel / 95 % / högsta | 3,5 / 7,4 / 8,5 ms | 1,2 / 2,6 / 3,1 ms |
| fps (tak 120) / längsta bildruta | 120 / 9,6 ms | 120 / 10,6 ms |
| CPU strypt 4x: fps | 27 | 96 |
| CPU strypt 4x: arbete medel / högsta | 17,9 / 39,5 ms | 4,6 / 12,4 ms |

Ändrat i 0.4.1:
- Varje zombie behåller sitt skelett (leder och delar från `zombieModel`) men det ligger utanför scenen. Vyn ställer posen som förut, `src/render/horde.js` räknar varje dels världsmatris på processorn och skriver den till en `InstancedMesh` per delgeometri, med zombiens färg per instans. Zombierna är nu 25 anrop (8 delar per typ och en delad enhetskub för trasor och fläckar) plus skuggpasset, hur många de än är. Före var det upp till 16 meshar per zombie, två gånger.
- Liggande kroppar har en egen uppsättning utan skugga (25 till). Matriserna fryses när fallet är klart och skrivs om bara när en kropp läggs till, tas bort eller kastas av en smäll. Taket 24 kroppar och städningen är som förut.
- Trianglarna ökar lite, eftersom instanserna inte sorteras bort utanför bild (frustum culling är av för hordens anrop). Det kostar mindre än de sparade anropen.

Slutsats: anropen är nu oberoende av hordens storlek, och med strypt processor håller 250 zombier över 60 fps (96 mot 27). Kvar att mäta: Retina (täthet 2) på en riktig laptop med integrerad grafik.

### 0.6.0: laddningstid för Gnesta

Mätt 2026-10-15 headless (Chrome for Testing via Playwright, 1440 x 900, inget fönster), två renderare: Metal (Apple M4 Max) och mjukvaru-GL (SwiftShader, som en dator utan GPU). Mått: klick på Gnesta i menyn till två ritade bildrutor med den nya banan, och tillbaka till Gnesta efter ett besök på E4. Delarna mätta med CPU-profil (CDP) och genom att rita delar av scenen för sig.

| | Före (0.5.2) | Efter (0.6.0) |
|---|---|---|
| CPU: banans bygge (rutnät, placering, mark, instanser) | 0,06-0,13 s | samma |
| Metal: Gnesta första gången | 0,29-0,31 s | 0,16-0,27 s, ingen bildruta över 60 ms |
| Metal, CPU strypt 4x: Gnesta första gången | 0,51 s | 0,45 s |
| Metal: tillbaka till Gnesta | 0,23-0,25 s | 0,08 s |
| SwiftShader: Gnesta första gången | 17,8 s (25-38 s i tidigare körningar) | 16,2 s |
| SwiftShader: tillbaka till Gnesta | 17,0 s | 0,6 s |

- Tiden gick inte till en CPU-slinga. Markens canvas (3332 x 2156) målas på 23 ms, rutnätet och placeringen räknas på cirka 70 ms vid import, batchen på cirka 70 ms. Med mjukvaru-GL gick nästan allt till första bildrutan: 26 shaderprogram länkas när de först används, ungefär 0,5 s styck. Mindre skuggkarta (1024 i stället för 4096) och inga skuggor ändrade inget.
- Ändrat: varje bana byggs en gång och sparas (programmen ligger kvar, så ett återbesök är omedelbart). Bygget görs i steg bakom en laddningsskylt, och `renderer.compileAsync` kompilerar programmen parallellt (KHR_parallel_shader_compile) innan banan visas, så sidan fryser inte och första spelbildrutan hackar inte.
- Kvar: mjukvaru-GL har inte KHR_parallel_shader_compile, så första besöket där tar fortfarande cirka 16 s (en bildruta). Att få ner det kräver färre shadervarianter (Gnesta lägger till cirka 11 program utöver E4:s 15). Målet under 2 s på en vanlig laptop med GPU nås med god marginal i mätningarna, men en riktig laptop med integrerad grafik är inte mätt.

## 0.10.1: granskningen av 0.10 och speltestet av 0.10.0

Uppdraget: rättningarna före publiceringen (fil-vakten, gruppens storlek) och speltestets värsta fynd: Gnesta och Gnesta Norr dag 1 gick inte att vinna för en ny spelare, dagarna var 7 till 20 minuter, första skottet kom efter 40 till 55 s (på 2x), nästa våg efter 5 s, och basen föll "från 20 till 0 på ett par sekunder".

Fil-vakten (src/sim/route.js) gäller nu alla rutnät. Gnestas kvitto byttes avsiktligt i ett eget steg (eaf289f6/39328, granskningens siffror): vinster och försök som förut, bas kvar inom kaoset. Nytt prov tests/stuck.test.js: ingen levande zombie som inte slår på något står still i 10 s på Gnesta eller Norr, med och utan spärrar och alla sorter. Med vakten avslagen fastnar 100 till 220 zombier på Norr.

Regler (alla banor):
- Nedräkningen mellan vågorna 10 s (var 5). Bonusen 3 per sekund kvar (var 5), så en hel nedräkning är värd 30 i stället för 25.
- Överlevarnas lärdom: ett förlorat försök ger minst 60 i forskning (LESSON_MIN). Prövat 50 och 80: 50 räckte inte till Grenades I, 80 ändrade ingenting för den nya spelaren (dödade och vågor gav redan över 80). Restart day ger fortfarande ingenting.
- Överlapp (dayCfg.overlap): nästa våg startar så många sekunder efter att föregående kommit ut helt, även om den är på väg. Klaras vågen före får spelaren minst 10 s.
- Dörrarna (map.door, bara stadsbanorna): de som når ishallens entré tar sig in en per 3,2 s och går att skjuta medan de står där. Basen faller aldrig på mindre än en minut från första skadan, och "rasar gradvis"-proven blev en egenskap i stället för tur. Prövat utan: med kortare vägar och överlapp föll naive på 5 till 10 s i hälften av seedsen.
- map.pace (Gnesta Norr 1,25): alla sorter går en fjärdedel fortare. Vägen från norr till entrén är 400 m; utan takten tar en bjässe sex och en halv minut på sig.
- Prövat och förkastat: bjässar 1,3 m/s överallt (E4 dag 3 tog fyra försök i två seeds, Gnesta dag 4 blev inte kortare än 520 s).

Gnesta:
- Ingångarna flyttade in längs vägen (världskoordinater i gnesta.js): east1 [37, 37] (220 m till entrén med spärren, var 268), east2 [49, -39] (180 m, var 214), forest [43, 51] (280 m, var 320). Prövat east1 vid 190 m och 170 m: första skottet kom inte tidigare (pjäserna står vid fältet), men naive fick så kort väg att den föll på 8 s, och spärren slutade skilja smart från naive.
- Ksp 88 finns från dag 1 (unlocks), som barrikaden. E4-spelaren har den redan; den nya spelaren behöver den.
- Dag 1: fem löpare först i våg 1 (första skottet efter 38 s, var 110), våg 1 och 2 mindre (20 och 36 vandrare), våg 3 60 vandrare och 40 löpare. hp 3,6 till 4,3, start $ 800 till $ 900.
- Dag 2 och 3: start $ 1 300 (var 1 100 och 1 000), hp 5,8 (var 5,0 och 4,8). Med kortare vägar tjänar pjäserna mindre under vågen; med $ 1 100 hade två seeds av fem bara två pjäser dag 2 och föll på 120 s, hur låg hp-faktorn än var (en klippa i forskningen: Bigger budget II eller inte).
- Dag 4 och 5: bjässarna från Norra vägen (den kortaste), överlapp 100 s, start $ 1 800 och $ 1 600, hp 5,1 och 4,0 (var 6,0 och 5,1). Dag 5 våg 3 något mindre (flest levande 238 till 242, var över 250).
- Smart (bas kvar, försök; naive första försöket): dag 1 20 i alla (naive 7 till 16), dag 2 20 (naive förlorar alla), dag 3 6 till 20 (seed 0 andra försöket), dag 4 7 till 13, dag 5 4 till 10. Dagarna 364 till 464 s (6 till 7,7 minuter, var 430 till 820).
- Ny spelare utan forskning (freshCampaign, FRESH_ORDER: Bigger budget, Faster Ksp 90, Grenades först): vinner dag 1 på andra eller tredje försöket i alla fem seeds; förlusterna gav 93 till 120 i forskning.

Gnesta Norr (balanserad mot smart UTAN Hemvärnet, granskningen av 0.10):
- Dansutvägen väster in längs vägen till [-7, -159] (420 m, var 506). Vikingavägen norr och Östra Storgatan som förut: längre in delar sig vägen förbi radhusen och Vikingavägen, och spärren skulle inte längre spela roll.
- Överlapp 60 s alla dagar, takt 1,25, dörrarna. hp 2,8 / 3,8 / 4,0 / 5,0 / 4,3 (var 3,7 / 7,2 / 7,6 / 7,9 / 9,0).
- Smart utan grupp: dag 1 20 i alla (naive förlorar eller 1 till 6 kvar), dag 2 6 till 14, dag 3 7 till 20, dag 4 6 till 8 (en seed andra försöket), dag 5 3 till 11. Naive förlorar dag 2 till 5 i alla seeds. Dagarna 236 till 452 s (4 till 7,5 minuter, var 460 till 1 050).
- Smart som köper gruppen varje dag och forskar i den först (hv: true): dag 1 till 3 vinns direkt (10 till 20 kvar), men dag 4 förloras i alla sex försök (basen faller vid 256 s när Östra Storgatan kommer in bakom linjen). Det är granskningens fynd i skarpare form: gruppen och dess forskning är ett sämre köp än pjäserna. Provet kräver dag 1 till 3; dag 4 för den spelaren hör till nästa balanspass (H058, H059).

E4: nedräkningen och bonusen ändrar kassan; dag 1 och 2 som förut, dag 3 vinns på tredje försöket i alla fem seeds (var andra eller tredje). Nytt kvitto f3366f27/7775.

Kvitton: E4 f3366f27/7775, Gnesta a2051b10/38970, Gnesta Norr f98cc27a/54733.

## 0.10.2: putspasset efter speltestet av 0.10.1

Speltestet (docs/playtests/2026-10-16-0.10.1.md): Gnesta dag 2 föll på två minuter (basen 20 till 2 i våg 1), första skottet kom efter 35 till 45 s, nedräkningen räckte till ett köp, Psg 90 kostade 420 forskning medan testaren tjänade ca 410 på 40 minuter, och ?debug gav alla vapen på Gnesta Norr.

Regler (alla banor):
- Nedräkningen 15 s (var 10). Bonusen 2 per sekund (var 3), så en hel nedräkning är värd 30 som förut.
- group.lead (src/sim/sim.js): gruppen har redan gått så många sekunder när vågen startar och kliver upp ur diket längre in längs vägen, högst halva vägen (LEAD_MAX). Dagens första grupp delas: de första går före.
- Psg 90 I kräver Ksp 88 I (var II) och kostar 180 (var 200). Vägen dit från noll: 280 (var 420). Med testarens takt (ca 10 i minuten) är det 25 till 30 minuter.
- maxGuns läser antalet ur More positions (guns), samma siffror som förut.

Gnesta:
- Försprång: dag 1 de fem löparna 20 s, dag 2 till 5 de sex första vandrarna 62 s. Smart första skottet 14 till 19 s alla dagar (var 38 dag 1, 56 till 76 dag 2 till 5). Naive ser de första direkt.
- Dag 2: hp 5,8 till 5,0; våg 1 6 + 24 vandrare från Sigtunavägen öst och 16 från Norra vägen efter 10 s (var 40 och 20 efter 4 s); våg 2 30 löpare (var 40); våg 3 50 + 30 vandrare och 50 löpare (var 60 + 40 och 60). Prövat: hp 4,6 (naive vann alla fem, 3 till 10 kvar), våg 3 med 40 löpare (naive vann alla fem), med 56 vandrare (naive förlorade två). Valt: naive klarar våg 1 med full bas i alla seeds och vinner dagen med 2 till 5 kvar i fyra av fem, smart 20 kvar. Dag 1 naive 9 till 20 kvar, så dag 2 är ett steg upp.
- Dag 1 hp 4,3 orörd. Prövat 4,6 och 4,9 för att ge naive mindre kvar efter försprånget: smart föll till 2 till 6 kvar i en seed (klippa). Provet "naiv tar klart mer skada" kräver nu <= per seed och fortfarande minst 5 i snitt (smart 20, naive 13,2).
- Smart (bas kvar, försök; naive första försöket): dag 1 20 (naive 9 till 20), dag 2 20 (naive 2 till 5, en förlust), dag 3 3 till 20 (seed 2 andra försöket; naive vinner fyra av fem med 1 till 3), dag 4 6 till 14 (naive förlorar), dag 5 4 till 9 (naive vinner två med 3). Dagarna 338 till 466 s.

Gnesta Norr:
- Försprång bara dag 1: de sex första från Vikingavägen norr 25 s. Första skottet 11 till 19 s (var 36 till 40). Prövat och förkastat: Dansutvägen väster 30 till 60 s (dag 4 ovinnbar för smart i fyra seeds av fem), dag 2 och 5 på Vikingavägen (pengarna kommer tidigare: dag 5 vanns med full bas i alla seeds och var inte längre svårast), dag 3 (bas kvar 17 i snitt mot gränsen 14; hp 4,2 och 4,4 i stället gav förluster i flera försök). Dag 2 till 5 har första skottet efter 30 till 42 s, som i 0.10.1.
- Smart: dag 1 19 till 20 (naive förlorar alla), dag 2 7 till 20, dag 3 7 till 20, dag 4 6 till 8 (seed 1 andra försöket), dag 5 1 till 11. Oförändrat från 0.10.1 utom dag 1, inom kaoset.
- ?debug-tabellen (src/data/arrival.js, norrArrival i scripts/balance.mjs): forskningen från de vunna försöken på E4 och Gnesta (2 050 poäng i seed 0), köpt i ordning från noll. 20 nivåer: Psg 90 I, Ksp 58 I och Ak 5 I, fem platser, Bigger budget III. Förut 23 nivåer med sex platser och Ksp 58 II. Smart vinner dag 1 med den. Prövat lägre: utan Psg 90 (60 % av poängen) förlorar smart dag 1 i alla seeds, så banan bärs av taket. Med Gnestas tabell (bara E4) förlorar smart dag 1 i alla seeds.

E4: nedräkningen och bonusen ändrar kassan; dag 1 och 2 direkt, dag 3 på tredje försöket i alla fem seeds, som förut.

Kvitton: E4 4d617fb6/7775, Gnesta 342091db/38829, Gnesta Norr bfdb2e9f/54742.

## 0.11.0: vägarna före vågen, ingångarna i diset och Gnesta Norrs öppning

Uppdraget: speltestet av 0.10.2 (Gnesta dag 2 förlorades på en väg som inte syntes före vågen; Gnesta Norr gav första skottet efter 50 s) och Olas krav samma dag: ingångarna ska ligga i dimkanten, inte mitt i en korsning, och tiden till första skottet ska ändå vara kort.

Regler (stadsbanorna):
- Ingångarna ligger minst 6 m utanför den skarpa ytan (SURROUNDINGS.crisp), på vägar som fortsätter ut i diset (sigtunaFog, eastFog, forestFog på Gnesta; dansN, vikFog, c3fog och Sigtunavägen väster på Gnesta Norr). Provet tests/fog-spawns.test.js.
- fogFactor (src/sim/sim.js): utanför den skarpa ytan går horden FOG_SPEED = 2,75 gånger fortare, med en mjuk övergång (smoothstep) över de sista FOG_RAMP = 8 m. Dagens första zombie syns i kartkanten inom 10 s på varje dag. Försprånget (lead) stannar i diset, så ingen dyker upp mitt på kartan.
- Barrikader och pjäser går inte att lägga i dimkanten.
- Prövat: att bara backa 0.10.1:s flytt (Gnestas gamla ingångar) räckte inte, de låg också inne i den skarpa ytan.
- Kvar: vägen inne på kartan är längre än i 0.10.2 (Sigtunavägen från x 84 i stället för 37), så policyns första skott på Gnesta kommer efter 52 till 54 s (var 14 till 19), eftersom dess pjäser står vid fältet. Den som ställer en pjäs i kartkanten skjuter efter några sekunder. Provet kräver nu policyns första skott inom 60 s och att horden syns inom 10 s.

Gnesta (South):
- De första i dagens första grupp är fem löpare alla dagar (var sex vandrare dag 2 till 5): med längre väg in kom vandrarnas första skott efter 95 till 110 s.
- Dag 2: hp 5,9 (var 5,0). Med vägarna synliga före vågen och längre väg in blev dagen lättare än dag 1 för naive (snitt 9,2 mot 8,4). Prövat 5,6: naive vann alla fem. Nu: smart 20 kvar på första försöket i alla seeds, naive 2 till 5 kvar i fyra och en förlust; dag 1 naive 6 till 10. Prövat och förkastat: våg 2 med 24 löpare efter 12 s (naive tog lika mycket skada).
- Dag 4: hp 4,85 (var 5,1). Vid 4,9 förlorade gruppen med Hemvärnets forskning dag 4 i en seed, vid 4,8 var gruppen bättre än en pjäs till (61 mot 53). 4,85: smart 10 till 12 kvar, gruppen vinner alla fem med 6 till 13.
- Dag 5: hp 4,3 (var 4,0), våg 3 40 + 34 + 34 vandrare (var 44 + 38 + 38): flest levande var 259 med längre vägar. Prövat 4,6 (fyra till sex försök). Smart vinner på 1 till 4 försök med 1 till 8 kvar.
- Dagarna är 490 till 520 s (8 till 9 minuter, var 6 till 8).

Gnesta Norr (North):
- Öppningen: våg 1 varje dag är 8 till 10 vandrare och 2 till 4 löpare från Sigtunavägen väster (sigW, ingångens namn "Sigtunavägen south"), med dag 1:s hp-faktor 2,8 alla dagar (group.hp, ny i sim.js) så att en Ksp 90 vid ishallen räcker. Våg 2 har raden "They're coming from the north now." (wave.toast). Första skottet 11 till 13 s alla dagar (var 11 till 19 dag 1 och 30 till 42 dag 2 till 5).
- Policyn ställer en Ksp 90 där den ser öppningens väg (parkeringen söder om Sigtunavägen) och säljer den när öppningen är slut och norr har börjat. Prövat: en Ksp 88 där åt upp pengarna till linjen i norr (dag 5 förlorades i alla försök); att behålla Ksp 90 kostade dag 4 i alla seeds; att välja en av planens första platser gick inte, ishallen skymmer vägen från dem.
- Startkassan +250 alla dagar (pjäsen till öppningen).
- Vikingavägen norr kommer ur diset rakt norrifrån (vikFog). Prövat: Dansutvägen österut nådde Radhusgången först och horden tog den vägen.
- hp: 2,8 / 4,6 / 5,0 / 5,15 / 6,7 (var 2,8 / 3,8 / 4,0 / 5,0 / 4,3), dag 4:s första våg norrifrån 36 + 30 vandrare (var 50 + 40). Klippor: dag 3 vid 4,8 (19 till 20 kvar) mot 5,4 (förlust i alla), dag 4 vid 5,3 (fyra försök) och dag 5 vid 7,0 (sex försök).
- Smart: dag 1 20 kvar (naive förlorar), dag 2 3 till 19 (1 till 2 försök), dag 3 6 till 20 (1 till 3), dag 4 1 till 15 (1 till 2), dag 5 2 till 6 (1 till 3). Naive förlorar dag 2 till 5 i alla seeds. Dagarna 263 till 528 s (provet tillåter nu 9 minuter: öppningen är en våg till).

E4: oförändrad (ingen dimma, kvittot detsamma).

Kvitton: E4 4d617fb6/7775, Gnesta 1d49e790/44538, Gnesta Norr e96d3147/74040.

## 0.12.0: vilande hus, flytt, sikt med höjd och prickskyttens sektor

Uppdraget: H098 till H102, H106 till H108 och speltestet av 0.11.0 (Gnesta dag 2 gick inte att vinna på två försök, första skottet efter 45 till 56 s).

Regler (alla banor):
- Sikten räknas med husens höjd (src/sim/placement.js lineOfSightH): ögat 1,5 m över marken för pjäserna och Hemvärnet, 0,6 m över utsiktspunkten för Psg 90 på ett tak, målet 1,0 m. Varje husruta har byggnadens höjd (det högsta av byggnaden i rutan; för marginalen runt huset takfoten). E4 har inga höjder och samma regel som förut, så E4:s kvitto är oförändrat.
- Psg 90: bara utsiktspunkter (platta tak, nocken vid en skorsten, ishallen och sporthallen) och en sektor på 75 grader. Policyn väljer utsiktspunkt och riktning efter hur mycket av hordens väg sektorn ser (scripts/balance.mjs roofPlan, 48 riktningar). Taken ser nu 20 till 24 rutor av vägen (var över 40 med sikt över alla hus).
- Flytten: Ksp 88 15 s, Ksp 90 och Ksp 58 8 s, Ak 5 5 s, Psg 90 10 s (40 % packa, 20 % bära, 40 % ställa upp). Före första vågen står pjäsen klar direkt.
- Vilande smittade: de kommer ut 0,4 s efter vågens start, en per 0,45 s, på närmaste gata framför huset.

Gnesta (South):
- Dag 1: villorna B2-00 och B2-12, tre vandrare var. Första skottet 14 s för smart (var 52 till 54) och 9 s för naive. Prövat: ett hus (B2-12 ensam gav smart 48 s, policyns pjäser står vid fältet), B2-01 och B2-02 (smart 20 till 30 s).
- Dag 2: B2-00 och B2-02, fyra var. Första skottet 10 s. hp 5,7 (var 5,9; först 6,1 med husen, men H118: dagen ska gå för en människa inom två försök). Smart 20 kvar i alla seeds, naive vinner alla fem med 3 till 7 (var 2 till 5 och en förlust). Prövat 5,4 (naive 7 till 10, för likt dag 1).
- Dag 3: överraskningen B1-10 (fyra vandrare) när våg 2 börjar, utan förvarning. Prövat dag 4: gruppen med Hemvärnets forskning förlorade dag 4 i en seed.
- Dag 5: hp 4,0 (var 4,3): med sektorn och utsiktspunkterna tog dag 5 tre till fem försök. Nu 1 till 2 försök med 2 till 8 kvar, fortfarande svårast.
- Smart (försök/bas kvar): dag 1 1/14 till 19, dag 2 1/20, dag 3 1/8 till 13, dag 4 1/9 till 11, dag 5 1 till 2/2 till 8. Dagarna 490 till 520 s.

Gnesta North:
- Öppningen ur diset: ingången 66 m ut på Sigtunavägen västerut (var 15 m utanför den skarpa ytan), med 8 s försprång i diset. Första skottet 14 till 15 s alla dagar.
- Dag 1: N-16 på Vikingavägen, fyra vandrare med öppningen.
- Smart flyttar öppningens Ksp 90 till den sista lediga platsen i planen (var: sälja den). Naive säljer som förut (läser inte kartan). Prövat: flytta till planens första lediga plats (dag 5 ovinnbar i fyra seeds: en Ksp 90 tog platsen för en tyngre pjäs), och att naive också flyttar (naive vann dag 1 med 15 kvar i alla seeds).
- hp 2,8 / 3,1 / 4,05 / 4,1 / 5,45 (var 2,8 / 4,6 / 5,0 / 5,15 / 6,7): taken bar banan, och med sektorn ser de mindre. Dag 2 är brantast (två ingångar, Psg 90 ännu inte forskad i alla seeds). Klippor: dag 3 vid 4,15 (5 kvar i snitt) och 4,4 till 4,7 (förlust i alla), dag 5 vid 5,6 (fem försök i en seed).
- Smart: dag 1 1/20, dag 2 1 till 3/4 till 13, dag 3 1/9 till 16, dag 4 1/6 till 9, dag 5 1 till 2/1 till 8. Naive förlorar alla dagar. Dagarna 290 till 550 s.

E4: oförändrad (kvittot detsamma).

Kvitton: E4 4d617fb6/7775, Gnesta 94964f8b/41808, Gnesta Norr 3d553082/66951.

## 0.12.1: Hemvärnet utanför pjäsernas tak, fem pjäser på Gnesta

Uppdraget: speltestet av 0.12.0. Gnesta dag 2 och Gnesta North dag 1 föll med 5 av 5 platser tagna och $ 918 till $ 1 150 i kassan som bara gick att lägga på uppgraderingar, en pjäs i taget. Testarens panel gick i ungefär 0,3 gånger normal takt, så förlusterna är delvis fördröjning; att pengarna inte hade någonstans att ta vägen är en regelsak.

Regler (alla banor):
- Hemvärnet räknas inte mot pjäserna (src/sim/stats.js maxGuns, maxSquads; sim.js capFull). Eget tak: två grupper, More squads I och II ger tre och fyra (90 och 150, kräver Better rifles I). Skäl: gruppen är billig täckning som tog en hel pjäsplats, så en spelare med pengar valde mellan en grupp och en pjäs i stället för att lägga till.
- More positions ger en plats till per nivå på varje bana (var: 5, 6, 7, 8 i alla). Banan har sitt antal från början (map.guns, annars 4).
- Gnesta South och Gnesta North: fem pjäser från början (var fyra), i stället för att flytta More positions tidigare i forskningen: det hade bara hjälpt den som forskar rätt, och testaren hade redan nivå I genom ?debug och satt ändå på 5 av 5.
- Inga hp-faktorer ändrade.

Utfall (smart: försök/bas kvar; naive dagens första försök):
- E4: kvittot oförändrat (4d617fb6/7775): taket band aldrig den giriga policyn i de fem seedsen, varken före eller efter.
- Gnesta South: dag 1 1/14 till 19 (naive vinner med 8 till 13), dag 2 1/20 (naive 4 till 7, var 3 till 7), dag 3 1/8 till 13, dag 4 1/4 till 7 (var 9 till 11), dag 5 1/2 till 7 (var 1 till 2 försök). Dag 4 tappar för policyn: den köper en femte och sjätte billig pjäs före uppgraderingarna och sprider pengarna. En människa som uppgraderar med U får mer av platsen; speltestet får avgöra (H127).
- Gnesta North: dag 1 1/17 till 20, dag 2 1 till 2/1 till 15, dag 3 1/2 till 17, dag 4 1/4 till 8, dag 5 1 till 2/1 till 6. Naive förlorar alla dagar, som förut.
- Alla balansprov håller (vinster, försök, naive tar mer skada, tempo).

Kvitton: E4 4d617fb6/7775, Gnesta eee09f27/39187, Gnesta Norr 4d717aee/60032.

## 0.12.2: Gnesta North, en idé per dag och lite svårare

Speltestet av 0.12.1: "varje dag är några från väster, sedan alla norrifrån", och North (liksom South dag 1 och E4) kändes lite för lätt med mycket forskning. Dagarna är omgjorda med verktygen som finns (vilande hus, oannonserade hus, flera ingångar, kniptång, flank, bjässar först, löparsvärm, vändning sent i en våg). Våg 1 kommer från ett nytt håll varje dag.

| Dag | Idé | Våg 1 | Resten |
|---|---|---|---|
| 1 | Norrifrån | Sigtunavägen väster (öppningen) och huset på Vikingavägen | Vikingavägen; sista vågen får löpare i ryggen efter 22 s ("Runners coming up behind them!") |
| 2 | Kniptången | Vikingavägen rakt ner och huset på Fornminnesvägen | två kolonner samtidigt, en löparsvärm (60), sista vågen löpare på båda vägarna; huset på Gångvägen i våg 2, Fornminnesvägen 25 s in i sista vågen |
| 3 | Bjässarna först | husen på Valsvägen, förskolan och Fornminnesvägen, och en grupp på Dansutvägen | bjässar först med de andra bakom, sista vågen bjässar först i båda kolonnerna, två bjässar ur ett oannonserat hus 40 s in |
| 4 | Flanken | Östra Storgatan genom radhusen och huset på Gångvägen | norr och öster samtidigt, löpare genom radhusen, ett oannonserat hus vid ishallen 35 s in i sista vågen |
| 5 | Hela stan | Sigtunavägen öst och huset vid rondellen | alla ingångar, löpare från tre håll, bjässar först, ett oannonserat hus 45 s in och en grupp från väster i ryggen 55 s in |

Nytt i simuleringen (bara data som använder det ändras): `dormant.delay` (dörren slås upp så många sekunder in i vågen) och `group.toast` (en rad när gruppens första kommer). Policyn (scripts/balance.mjs): öppningspjäsen möter dagens första grupp (`norrOpener`). Kommer den norr- eller österifrån ställs pjäsen där den ser första tredjedelen av vägen, som en människa som möter dem vid dimkanten; söderifrån som förut.

Prövat och förkastat:
- Våg 1 från Dansutvägen eller Vikingavägen utan öppningspjäs: första skottet efter 37 till 60 s, inga pengar den första minuten, och dagen förlorades i våg 2 i alla seeds. Vilande hus nära linjen hjälpte inte: husen skymmer och de gick ut ur sikten.
- Bjässar först med dagens hp (4,05): dag 3 förlorades i våg 2 i alla seeds och med båda ankomsterna. Formen är tyngre än siffran, så hp sänktes till 3,25.
- Dag 5 med 5,2 till 5,45: alla förlorade i våg 2 (en klippa mellan 5,0 och 5,2). Vald 5,1.

hp: 2,8 / 3,1 / 3,25 / 4,6 / 5,1 (var 2,8 / 3,1 / 4,05 / 4,1 / 5,45). Dag 4 upp eftersom öppningspjäsen vid radhusen tar flanken tidigt.

Resultat, smart över fem seeds (försök till vinst, bas kvar), före och efter:

| | Dag 1 | Dag 2 | Dag 3 | Dag 4 | Dag 5 |
|---|---|---|---|---|---|
| balansens ankomst, 0.12.1 | 1, 17 till 20 | 1 till 2, 1 till 15 | 1, 2 till 17 | 1, 4 till 8 | 1 till 2, 1 till 6 |
| balansens ankomst, 0.12.2 | 1, 15 till 16 | 1 till 2, 2 till 15 | 1, 2 till 11 | 1 till 2, 3 till 12 | 1 till 2, 1 till 5 |
| realistisk ankomst (ARRIVAL), 0.12.1 | 1, 20 | 1 till 3, 1 till 5 | 1 till 2, 2 till 11 | 1, 4 till 7 | 1 till 2, 1 till 7 |
| realistisk ankomst (ARRIVAL), 0.12.2 | 1, 12 till 16 | 2 till 3, 8 till 12 | 1, 2 till 11 | 1 till 2, 3 till 12 | 1 till 2, 1 till 5 |

Naive förlorar varje dag. Dag 5 har lägst bas kvar i snitt (3,2 mot 6,2 till 7,4). Första skottet inom 15 s varje dag, dagarna tar 320 till 532 s, flest levande 169. Kurvmålen i tests/balance-norr.test.js gäller oförändrade. Kvittot bytt avsiktligt: b4f7c1a4 / 60476 (var 4d717aee / 60032). E4 och Gnesta South är orörda.

Öppet: South dag 1 och E4 kändes också för lätta i speltestet. De är inte ändrade här.

### 0.12.2: Hemvärnets båge

Liggande soldater skjuter bara inom 120 grader runt sin skyddsriktning. Ett mål utanför: han reser sig på knä på 0,8 s och vänder sig (skjuter inte under tiden), eller tar en annan man målet; utan mål utanför bågen i 3 s lägger han sig igen. Ställningen varierar deterministiskt per ruta inom skyddets två (huk eller knä vid husknut, bil och mur, knä eller huk bakom häck och säckar, liggande eller knä på öppet gräs, alltid liggande i diket). Bilden ändras mest; i simuleringen är det bara bågen.

Effekt: E4 orörd. Gnesta South: seed 1 dag 4 bas 4 till 5, dag 5 2 till 4, allt annat lika; kvittot f36af1a6 / 39183 (var eee09f27 / 39187). Gnesta North (smart köper ingen grupp, naive gör det): kvittot 2dd1da63 / 60500 (var b4f7c1a4 / 60476 efter omgörningen ovan). Kurvmålen gäller.

## 0.13.0: kampanjpasset (H104, H105, H130 till H136)

Mätt med scripts/balance.mjs, fem seeds (0, 7919, 15838, 23757, 31676), smart och naiv på Gnesta och Gnesta North, girig på E4.

Vad som ändrade förutsättningarna:
- Skjutvinklar och vridfart (H132): Ksp 90 180 grader, Ksp 58 120, Ksp 88 90 och långsam, pillboxen 90, Psg 90 75 som förut. Ett mål utanför vinkeln skjuts inte, och pipan vrids i vapnets fart innan den skjuter. Det är en stor försvagning av Ksp 88 på stadsbanorna: med 90 grader ser den en bit av en krokig väg. Prövat på Gnesta dag 5 (seed 0, 1, 2): med Ksp 88 vann policyn aldrig (hp 2,6), utan den på försök 4; utan vinklar alls på första försöket.
- Förrådet per sektor och dag (H104, H105): E4 har infanteriet, Ksp 90, Ksp 88 och pillboxen utan forskning, inget Hemvärn. Gnesta dag 1 bara de civila, barrikader och tråd; Hemvärnet och Ksp 90 dag 2, Ksp 58 och Ak 5 dag 3, Psg 90 och pillboxen dag 4, Ksp 88 dag 5. Gnesta lånar ut dem (map.unlocks), forskningens senare nivåer gäller. North har allt, infanteriet från dag 3.
- Gnesta dag 1 är evakueringen: 20 civila ur fem villor öster om rondellen, 13 måste in i ishallen. De går hordens väg (också runt en spärr), så att de går där spelarens skyttar ser. Prövat och förkastat: att de klättrar över spelarens egna spärrar och går raka vägen. Då gick de längs Sigtunavägen före horden, där smart inte har några skyttar, och smart förlorade dag 1 i alla fem seeds (0 till 5 framme).

Policyerna:
- Köper bara det som finns i dagens förråd. Gruppen är den sektorn har: infanteriet på E4 (dag 1, som Hemvärnet förut), de civila på Gnesta dag 1 (så många grupper som taket tillåter, fyra den dagen), Hemvärnet därefter.
- Smart lägger spärren före första pjäsen, så att pjäsens vinkel vänds mot vägen horden tar med spärren.
- Ksp 58 före Ksp 88 när den finns (se ovan). På E4 finns ingen Ksp 58, där köps Ksp 88 som förut.
- Alla policyer vrider en pjäs som stått sysslolös i 3 s medan zombier går förbi inom räckvidd men utanför vinkeln (Rotate). Utan det fastnade North dag 1 med tabellens forskning: 20 zombier stod utanför alla vinklar i en minut och läckte in en i taget (bas 11 till 0).

E4 (vägspärren): dag 1 vågor 8, 12, 20 vandrare som förut (10, 16, 26 gav minimal C förlust med vinklarna), dag 2 hp 1,9 (1,6 gav ingen skada alls, 2,2 tre försök: en klippa), dag 3 hp 1,2. Startkassor 700, 800, 1 200. Resultat: dag 1 och 2 direkt i alla seeds, dag 2 bas kvar 6 till 13, dag 3 på tredje försöket, en förlorad dag 3 faller på 35 till 44 s. En Ksp 90 på A, B, C vinner dag 1 med 20, 18 till 20, 6 till 9 kvar. Utan forskning förloras dag 3.

Gnesta South: dag 1 hp 2,2, dag 2 2,4 (var 5,7), dag 3 4,3 (5,8), dag 4 3,6 (4,85), dag 5 2,5 (4,0) och dag 5:s sista löpargrupp 48 (var 60, toppen 254 levande). Resultat smart: dag 1 direkt med 16 till 17 civila framme (på 253 till 261 s), dag 2 direkt utan skada, dag 3 direkt, dag 4 inom tre försök (bas 3 till 10), dag 5 inom tre (bas 2 till 14). Naiv: dag 1 förloras i fyra av fem (6 till 13 framme), dag 2 vinns i alla (bas 8 till 13, våg 1 17 till 20), dag 4 och 5 förloras. Vilande dag 1 i B2-02 (förut B2-00 och B2-12): första skottet inom 40 s med de frivilligas korta räckvidd.

Gnesta North: hp 2,8 / 2,4 / 2,1 / 3,8 / 3,9 (var 2,8 / 3,1 / 3,25 / 4,6 / 5,1) och dag 1:s sista våg 66 vandrare och 30 löpare (var 80 och 35). Dag 5 är en klippa mellan 3,9 (bas 5, första försöket) och 4,05 (förlust i fyra av fem). Resultat smart: alla dagar inom två försök, dag 5 bas 5. Naiv förlorar varje dag. Med Hemvärnet (hv): dag 1 till 3 inom två försök.

Kvitton: E4 71d06ab8 / 7943, Gnesta 41231870 / 45379, Gnesta North cf67c451 / 59164. ?debug-tabellerna (src/data/arrival.js) omräknade: E4-kampanjen vinns nu med färre förluster, så spelaren kommer till Gnesta med åtta nivåer (var nio) och till North med 18 (var 20).

Osäkert och värt ett speltest: Gnesta dag 1 i händerna (de civila dör fort utan spärr), Ksp 88:s smala vinkel på stadsbanorna, och om dag 2 på Gnesta är för lätt för den som spärrar (smart tar ingen skada).

## 0.14.0: Operation Södermanland (rekvisition, kärntrupper, operationskartan)

Mätt med `npm run balance` (eller `node scripts/balance.mjs skilled|normal`): hela kampanjen E4, Gnesta South och Gnesta North dag för dag, med försök, RP, kärntrupper, leveranser och rekvisition mellan försöken (src/meta/operation.js). Fem seeds (0, 7919, ... 31676). Ett varv för en spelare tar cirka 8 s.

Spelarna (scripts/balance.mjs POLICIES):
- skilled: läser kartan. Gnesta South: spärren vid rondellen och pjäserna där de ser den tvingade vägen (0.13:s smart). Gnesta North: spärren på Vikingavägen och pjäserna där de ser hordens väg (0.13:s smarta plan med dödszonen och radhustaken var sämre än så med kärntrupperna, prövat nedan). Kallar vågor tidigt när det är lugnt, köper ammunition och sandsäckar.
- normal: lägger spärren som introt lär ut men ställer pjäserna där de ser sin egen väg (utan spärren), väntar ut nedräkningarna och köper inga extra förnödenheter. E4 har ingen spärr att välja; där skiljer bara tidiga vågor och förnödenheter.
- Båda ställer ut allt de har i reserven, tyngst först, på planens platser (deployAll) och rekvirerar i samma ordning (REQUISITION): ett mål i taget per sektor, sparar till nästa när RP inte räcker, påfyllnad först.
- Prövat och förkastat som normal: naive (aldrig en barrikad). Den klarar inte Gnesta South dag 2 på åtta försök, hur mycket RP den än samlar (grind räcker inte över det strukturella gapet). En normal människa lägger spärren som dag 1 lär ut.

Ekonomin:
- RP = dödade (som förut forskningen: vandrare och löpare 1, bjässar 5) och 2 per klarad våg, plus uppdraget vid vinst (25, och 2 per räddad civil). Försök 1 till 3 ger fullt, fjärde 60 %, femte 40 %, sedan 25 %. Bonus vid vinst: snabb seger (nästa våg kallad tidigt minst hälften av gångerna) +15 %, få förluster (ingen enhet förlorad, högst en man) +15 %, oskadad bas +20 %. En förlust ger fortfarande minst 60 (överlevarnas lärdom).
- Rekvisition (src/data/depot.js): ungefär halva 0.13:s pris i pengar, i RP. Ksp 90 130, Hemvärnet 130, infanteriet 220, Ksp 58 200, Ak 5 220, Psg 90 330, Ksp 88 300, pillboxen 270, de civila 60. Nivå 2 och 3 för RP (Ksp 90 80 och 140 osv). Påfyllnad 8 till 25 per man. Tillbaka till förrådet: hälften av det som lagts. Förrådets uppgraderingar har forskningens priser. Prövat: en tredjedel av priset (styrkan på North blev 20 enheter), två tredjedelar (normal fastnade på South dag 2).
- Förnödenheter: egen summa per dag (supplies: E4 300 / 350 / 400, Gnesta South 350 / 450 / 500 / 600 / 600, Gnesta North 600), hälften så mycket per dödad som 0.13:s pengar (SUPPLY_BOUNTY 0,5). Supply budget (förut Bigger budget) ger 40 % av den gamla summan.
- Frontbredden (map.frontage): E4 6, Gnesta South 8, Gnesta North 9 enheter ute samtidigt. Utan den växte styrkan till 16 enheter på North (kärntrupperna följer med och South:s trupper omplaceras dit), och North vanns med full bas även vid hp 5,5. Med taket går RP till kvalitet (nivåer, uppgraderingar) i stället för mängd.
- Trycket: Gnesta North öppnar efter South dag 4. Varje vunnen dag i en sektor ger de andra öppna en tryckpunkt (+6 % hp per punkt, högst 5) och tar bort två i den egna. Kampanjen spelas i ordning, så North börjar med tryck 2 (+12 %).

hp per dag (var i 0.13.0): E4 1,8 / 3,2 / 1,2 (1 / 1,9 / 1,2), Gnesta South 2,8 / 3,3 / 3,5 / 2,2 / 2,4 (2,2 / 2,4 / 4,3 / 3,6 / 2,5), Gnesta North 7 / 4,4 / 4,4 / 7 / 12 (2,8 / 2,4 / 2,1 / 3,8 / 3,9). Skälen: kärntrupperna står ute från första vågen (förut köptes pjäserna under dagen för bounty), styrkan växer mellan dagarna, och leveranserna ger dagens nya vapen gratis. North:s höga siffror är där styrkan är som störst.

Resultat, försök till vinst per kampanjsteg (E = E4, S = Gnesta South, N = Gnesta North):

```
skilled  E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
seed 0-4  1  1  1  1  1  1  1  1  1  1  1  1  1   (alla fem seeds)

normal   E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
seed 0    1  1  1  1  1  3  1  3  1  2  1  1  1
seed 1    1  1  1  1  1  3  2  2  1  1  1  1  1
seed 2    1  1  1  1  1  3  1  3  1  2  1  1  1
seed 3    1  1  1  1  1  3  1  3  1  2  1  1  1
seed 4    1  1  1  1  1  3  1  3  1  1  2  1  1
```

Målen: den skickliga klarar varje dag på första försöket, den normala inom 1 till 4 (högst 3), ingen dag kräver mer än cirka 6. Ribban: den skickliga tar skada på E4 dag 2 och 3 (bas 6 till 18), South dag 2 (bas 7 till 13) och hela North (bas 8 till 16). Den normala vinner med 1 till 9 kvar på de flesta dagar och behöver grinda på South dag 3 och 5 och ibland North dag 2 och 3: förlusterna ger 270 till 470 RP, som köper en nivå eller en Ksp 58 före nästa försök.

Seed 0, skilled, i korthet: E4 dag 1 bas 20 (+107 RP), dag 2 bas 10, dag 3 bas 6 med Ksp 88 och infanteriet nivå 2. South dag 1 15 av 20 civila, dag 2 bas 8 (Hemvärnet och två Ksp 90), dag 3 till 5 bas 20 (spärren vid rondellen bär). North dag 1 bas 16 med tryck 2, dag 4 bas 8, dag 5 bas 13.

Fingeravtryck: per kampanjsteg och spelare i tests/balance-op-skilled.test.js och tests/balance-op-normal.test.js (ett ändrat steg pekas ut med namn). De gamla kvittona per bana (E4, Gnesta, Gnesta North) och proven som köpte forskning är borta; mekanikproven ligger kvar.

Osäkert och värt ett speltest:
- Gnesta South dag 3 till 5 är lätta för den som spärrar vid rondellen (bas 20 i alla seeds); den normala behöver tre försök på dag 3 och 5. Gapet mellan att läsa kartan och inte göra det är stort på South.
- Gnesta North hp 7 och 12: bjässarna blir sega (12 x 560). Fler zombier i stället för hp kan kännas bättre.
- Frontbredden är ny och inte i specen. Den håller styrkan i schack; speltesta om 8 och 9 känns rätt.
- E4 dag 1 är lätt för alla (bas 20). Den är övningen.

## 0.14.1: E4:s tempo, de civilas hus, simuleringens kvitto och vakterna

Efter granskningen av 0.14 (docs/reports/review-0.14.md) och speltestet av 0.14.0 (docs/playtests/2026-10-16-0.14.0.md).

Ändringar:
- E4 dag 1 (speltestet: under två minuter, basen orörd): hp 1,8 till 3,0, vågorna 8 / 12 / 20 till 14 / 22 / 22 + 18 vandrare (den andra klungan 18 s in i våg 3). Fortfarande bara vandrare: dagen lär ut pjäsen och vinkeln.
- E4 dag 2 (speltestet: våg 3 ett stup från 34 till 74 fiender, basen 20 till 0 på sekunder): hp 3,2 till 4,4, och löparna fördelade. Våg 1 får 6 löpare (en förvarning), våg 2 14 vandrare och 26 löpare (intervall 0,6), våg 3 20 vandrare och 48 löpare i tre klungor om 16 (3, 20 och 38 s in, intervall 0,6) i stället för 56 med 0,3 s mellanrum. Prövat och förkastat: hp 3,6 (ingen skada alls, löparna i strömmar dödas lätt), 4,7 och 4,9 (förlusterna kommer tillbaka med fall på 4 till 8 s, samma stup), 5,2 (den skickliga förlorar).
- E4 dag 3: hp 1,2 till 1,15. Med 1,2 och de nya dagarna före förlorade den normala dag 3 i en seed med fall på 28 s (bjässarna i våg 3); 1,1 var för lätt för alla.
- Gnesta South dag 1, de civila (speltestet: familjerna dog utanför bild långt österut): husen B4-13 och B4-02 (60 och 43 m öster om rondellen, 168 och 152 m att gå) byts mot B3-03 och B3-02 (12 och 13 m, 102 och 116 m att gå). Hela vägen ryms nu i dagens kamera (main.js dayFrame ramar in husen och ishallen). Den skickliga räddar 18 av 20 (var 15 till 16), den normala 14 till 16 (var 16 till 17); de vilande i B2-02 kliver ut närmare deras väg. need 13 står kvar.
- Gnesta South dag 2: hp 3,7 prövades för att den skickliga ska ta skada igen (se nedan) och förkastades: den normala förlorade då första försöket i tre seeds av fem.

Resultat, försök till vinst per kampanjsteg (E = E4, S = Gnesta South, N = Gnesta North):

```
skilled  E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
seed 0-4  1  1  1  1  1  1  1  1  1  1  1  1  1   (alla fem seeds)

normal   E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
seed 0    1  1  1  1  1  3  1  3  1  2  1  1  1
seed 1    1  1  1  1  1  3  2  2  1  1  1  1  1
seed 2    1  1  1  2  1  3  2  3  1  1  1  1  1
seed 3    1  1  1  1  1  3  1  3  1  2  1  1  1
seed 4    1  1  1  1  1  3  1  3  1  1  1  1  1
```

E4 per våg (bas efter våg 1, 2, 3), den normala: dag 1 20 / 20 / 13 till 19 (var 20 / 20 / 20), dag 2 20 / 20 / 8 till 15 (var 20 / 20 / 3 till 6), dag 3 20 / 20 / 3 till 6. Dagarna tar 140, 145 och 189 s (var 83, 115 och 190). Den skickliga: dag 1 bas 18 till 20, dag 2 17 till 20, dag 3 9 till 20. Skadan kommer fortfarande i våg 3 (kurvan inom dagen), men ingen dag faller på några sekunder.

Fingeravtrycken per kampanjsteg (balance-op-skilled och balance-op-normal) är alla nya, avsiktligt: E4:s tempo och de civilas hus ändrades, och kampanjen bär RP, enheter och erfarenhet vidare, så varje steg efter rör sig också. Därför finns nu ett kvitto som inte går genom ekonomin:

- tests/sim-receipt.test.js (granskningen, Critical 2a): fast styrka (kärntrupper med nivåer), fast forskning, fasta rutor och spärrar, en dag per bana (E4 dag 2, Gnesta South dag 3, Gnesta North dag 2), utan RP och utan policy, hashat på utfall, bas, vågor, dödade, tid, pengar, toppen och räknade händelser. Första kvittot togs före E4:s nya tempo; E4 dag 2 bytte avsiktligt från 39a99c7f till a773fa93 när vågorna ändrades, och South dag 3 och North dag 2 stod kvar genom hela 0.14.1 (också genom de civilas klättring, RP-räknaren och idleOutside). Den fasta styrkan förlorar E4 dag 2 och North dag 2 och vinner South dag 3; det är ett kvitto, inte ett mål.
- Vakterna tillbaka i balance-op-normal (Critical 2b): en förlorad dag rasar gradvis (minst 60 s från första skadan till fallet; nu 142 till 256 s), högst 250 levande samtidigt (nu högst 219, North dag 5), första skottet inom 60 s (nu högst 18 s), en vunnen dag 200 till 600 s i staden och 120 till 600 s på E4 (övningen; nu 139 till 575 s).

Ändrat i proven: den skickliga tar inte längre alltid skada på E4 dag 2 och 3 (den kan hålla övningen orörd när stupet är borta; kurvan där mäts på den normala), och South dag 2 kostar den skickliga något i två seeds av fem (var fem av fem): E4:s längre dagar och fler räddade civila ger henne mer RP in i Gnesta. North dag 4 kostar fortfarande alltid något.

Balansskriptet: loggens rader har basen efter varje våg (waveBase), som inte räknas in i fingeravtrycket.

Osäkert och värt ett speltest:
- E4 dag 2 i en människas händer: stupet var en klunga på 56 löpare med 0,3 s mellanrum. Nu tre klungor; policyerna föll aldrig, men en spelare som står i en meny när klungan kommer kan fortfarande tappa mycket på kort tid.
- E4 dag 1 hp 3,0 ligger nära en tröskel: 2,8 gav ingen skada alls, 3,2 tog den normala till 9 till 11.
- Den skickliga på South dag 2 (se ovan). Nästa balanspass bör ta Norths hp-faktorer (granskningens rekommendation 1) och South dag 2 tillsammans.

## 0.14.2: spärren på E4, dag 2 och 3, skogsbrynet

Efter speltestet av 0.14.1 (docs/playtests/2026-10-16-0.14.1.md): "basen gick från 17 till 0 på några sekunder", "med två uppgraderingar blev samma dag en promenad" och "1 042 dollar som jag inte hann eller kunde använda" på dag 3.

Mätt först (nytt skript i skissmappen, samma policy som balansskriptets normala spelare): E4 dag 2 med styrkan efter dag 1 och olika köp i förrådet, fem seeds.

```
före (0.14.1)       bas efter dagen (L = förlorad, f = sekunder från första skadan till fallet)
inga köp            L f64 till f72 (alla fem)
Faster Ksp 90 I     L f6 till f8 i tre seeds, L f60 till f69 i två
infanteriet nivå 2  L f6 i en seed, annars 3 till 9
båda                10 till 19
```

Stupet var en klunga på 16 löpare som nådde basen samtidigt: varje löpare som kom fram tog en poäng direkt. Med en köpt nivå klarade pjäserna klungan precis eller inte alls.

Ändringar:
- E4 har en spärr som släpper in en i taget (map.door, gap 3,2 s, samma regel som ishallens dörrar på Gnesta). De som når fram står vid spärren och går att skjuta. 20 i bas räcker då minst 64 s från första skadan. Prövat: gap 1,0, 1,5, 2,0, 2,5 och 3,2; när infanteriet faller tar fallet 20 x gap sekunder, så bara 3,2 håller det över en minut (2,5 gav 47 s).
- E4 dag 2: löparna i våg 2 i två klungor om 13 (4 och 22 s in, intervall 0,8) i stället för en ström om 26, och i våg 3 sex klungor om 8 (3, 14, 25, 36, 47 och 58 s in, intervall 0,8) i stället för tre om 16. hp 4,4 till 4,0. Prövat med de nya klungorna: 3,9 (inga köp 9 till 14), 4,2 (inga köp förlorar i två seeds av fem, en köpt nivå 15 till 19), 4,5 (inga köp förlorar i fyra av fem) och 5,0 (inga köp förlorar alltid). Med de gamla klungorna och spärren: 3,6 gav inga köp 2 till 11 och två förluster.
- E4 dag 3: hp 1,15 till 1,2 (med spärren dog bjässarna där för lätt, den skickliga höll 20 i alla seeds) och halva förnödenheterna per dödad (dagens bounty 0,5, ny nyckel i src/meta/operation.js opStartConfig). 0,35 prövades och gav ojämna summor.
- Gnesta South och North (placeringen, inte balansen): skogsbrynet går att stå i. Tät skog börjar 6,5 m från gatukanten (var 3,5, src/data/gnesta.js FOREST_EDGE). Träden ritas först 4,5 m från gatan och är låga där, så den första glesa raden är brynet. 262 rutor på South och 372 på North blev öppna. Balansskriptets pjäser väljer bland öppna rutor, så de kan hamna i brynet.

Efter, E4 dag 2 med samma styrkor:

```
inga köp            7 till 9 (vinst alla fem)
Faster Ksp 90 I     20
Heavy wire          5 till 10
infanteriet nivå 2  20
```

En ny spelare vinner nu dag 2 utan köp, med skada, och en förlust tar över en minut. Ett köp ger fortfarande full bas: steget från 8 till 20 är kvar, men det går från vinst till vinst i stället för från förlust till vinst.

E4 i kampanjen (bas efter dagen, förnödenheter kvar):

```
skilled   dag 1 18 till 20   dag 2 20 ($ 190)   dag 3 17 till 20 ($ 111 till 156, var 392 till 1 022)
normal    dag 1 13 till 19   dag 2 20 ($ 590)   dag 3 1 till 5 ($ 121 till 331, var 302 till 832)
```

Den normala köper inga förnödenheter, så dag 2:s $ 590 är hans egna; den skickliga lägger dem på ammunition och sandsäckar.

Resultat, försök till vinst per kampanjsteg:

```
skilled  E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
seed 0-4  1  1  1  1  1  1  1  1  1  1  1  1  1   (alla fem seeds)

normal   E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
seed 0    1  1  1  1  1  2  1  3  1  2  1  1  1
seed 1    1  1  1  1  1  2  1  3  1  1  1  1  1
seed 2    1  1  1  1  1  2  1  3  1  2  1  1  1
seed 3    1  1  1  1  1  2  2  2  1  2  1  1  1
seed 4    1  1  1  1  1  2  1  3  1  1  1  1  1
```

Fingeravtrycken per kampanjsteg (balance-op-skilled och balance-op-normal) är alla nya, avsiktligt: E4 och skogsbrynet ändrades och kampanjen bär resten vidare. Simuleringens kvitto: E4 dag 2 a773fa93 till e007577b (den fasta styrkan vinner nu med full bas, förut förlorade den); Gnesta South dag 3 och North dag 2 står kvar, så skogsbrynet rör inte simuleringen för fasta rutor. Balansskriptets logg har förnödenheterna kvar per försök (cashEnd), utanför fingeravtrycket som waveBase.

Ändrat i proven:
- Nytt: tests/e4-tempo.test.js. E4 dag 2 med styrkan efter dag 1 och inga köp vinner med skada i tre seeds, och basen tappar aldrig mer än 4 på 10 s.
- Nytt i balance-op-skilled: E4 dag 3 slutar med under $ 500 kvar i varje seed.
- Borttaget: South dag 2 ska kosta den skickliga något i minst två seeds. Nu kostar den inget i någon. E4 dag 2 hålls nu med full bas, bonusen för oskadad bas ger mer RP, och hon har tre Ksp 90 före Gnesta i stället för två; med tre håller spärren vid rondellen. hp 3,4 och 3,6 på South dag 2 ändrade inte det. I stället: E4 dag 3 kostar henne något i minst tre seeds (nu fyra).

Osäkert och värt ett speltest:
- E4 dag 2 för en människa: en köpt nivå ger fortfarande full bas. Ett mellansteg (ett köp ger 12 till 16) kräver ett fall till mitten av förlusterna för den som inte köpt något, och det var det speltestet klagade på.
- Spärren på E4 gör att horden står och slår vid basen en stund; det syns och känns annorlunda än förut (de sprang in och försvann).
- South dag 2 och den skickliga: tas med i passet för North (granskningens rekommendation 1).
- Överskottet sänktes i stället för att få ett nytt sätt att lägga pengar mitt i striden. En ny sak att köpa (reparera spärren eller liknande) behöver bestämmas med Ola först.

## 0.15.0: E4 blir trafikplatsen vid Lästringe

Olas önskan: "Bana 1 känns som amerikansk öken, inte Sörmland." E4 är nu trafikplats 137 Lästringe (src/data/e4-lastringe.js) i stället för en rak väg på 39 m. Banan är ett rutnät som Gnesta: horden kommer längs motorvägen ur diset från Nyköping och går upp för avfarten till spärren vid väg 800. Dag 2 kommer en andra grupp från Södertälje uppför påfarten, fel håll. Mellan ramperna står en knäckt långtradare tvärs över motorvägen och där är inte gångbart, så dag 1 har bara en väg. Vägen från spärren ut till dimkanten är 120 m från Nyköping (168 m med diset) och 110 m från Södertälje; förut var den 39 m.

Skäl till omräkningen: med den längre vägen hinner pjäserna mer, så samma vågor blev lättare (den normala spelaren höll full bas dag 1, den skickliga tappade bara något dag 2 och 3). Vågorna står kvar som förut, gruppernas ingångar är nya.

Balansskriptet (scripts/balance.mjs): E4 spelas av den giriga policyn som förut, men på rutnätet. Planen (e4Plan) täcker dagens vägar inne i den skarpa ytan. Betongen läggs tvärs över stammen 5 m nedanför spärren och taggtråden 9, 13 och 17 m ned längs vägen (förut rutorna 0, 1 och 2 på den raka vägen). Vilka banor som spelas som stad avgörs av TOWN-tabellen, inte av om banan har ett rutnät.

Prövat (bas efter dagen, fem seeds; L = förlorad):

```
hp dag 1 / 2 / 3     normal dag 1   normal dag 2   normal dag 3   skilled dag 1   skilled dag 2   skilled dag 3
3,0 / 4,0 / 1,2      20             5 till 16      4 till 6       20              17 till 19      14 till 16
3,5 / 3,7 / 1,2      13 till 20     11 till 18     4 till 6       15 till 18      15 till 19      7 till 16
3,4 / 3,6 / 1,2      18 till 20     13 till 20     4 till 13      16 till 18      15 till 18      14 till 16
3,2 / 3,6 / 1,2      20             13 till 20     4 till 13      19 till 20      17 till 20      14 till 16
```

Med 3,4 dag 1 förlorade den skickliga Gnesta North dag 3 en gång (seed 2): E4 gav henne 50 RP mindre än i 0.14.2 (dag 1 utan full bas ger ingen basbonus), och North dag 3 är redan tät (4 till 15 kvar). 3,2 ger tillbaka bonusen, och dag 1 ska ändå vara den minsta dagen (onboardingen görs om separat). Dag 2 med 3,3 gjorde den svaga spelaren (inga köp efter dag 1) för stark (12 till 18); 3,6 ger 6 till 10, som 0.14.2:s 7 till 9. Dag 3 med 1,1 och 1,3 ändrade inte North, så 1,2 står kvar.

Ändringar:
- E4 dag 1 hp 3,0 till 3,2, dag 2 4,0 till 3,6, dag 3 1,2 (oförändrad). Förnödenheterna och vågornas storlek oförändrade.
- Dag 2 och 3: varannan klunga löpare kommer från Södertälje (påfarten); dag 3:s bjässar växlar mellan ingångarna.

Efter, E4 i kampanjen (bas efter dagen, fem seeds):

```
skilled   dag 1 19 till 20   dag 2 17 till 20   dag 3 14 till 16 ($ 96 till 201 kvar)
normal    dag 1 20           dag 2 13 till 20   dag 3 4 till 13
svag dag 2 (inga köp efter dag 1): vinst med 6 till 10, högst 4 förlorade på 10 s
```

Resultat, försök till vinst per kampanjsteg:

```
skilled  E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
seed 0-4  1  1  1  1  1  1  1  1  1  1  1  1  1   (alla fem seeds)

normal   E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
seed 0    1  1  1  1  1  3  1  2  1  2  1  2  1
seed 1    1  1  1  1  1  3  1  2  1  1  1  1  1
seed 2    1  1  1  1  1  3  1  2  1  2  1  2  1
seed 3    1  1  1  1  1  3  2  1  1  3  3  1  1
seed 4    1  1  1  1  1  3  1  2  1  1  1  2  1
```

Kampanjens mål håller: den normala klarar varje dag inom 1 till 4 försök (som mest 3), den skickliga allt på första försöket, första skottet inom 60 s, högst 250 levande. Fingeravtrycken per kampanjsteg (balance-op-skilled och balance-op-normal) är alla nya, avsiktligt: E4 ritades om och kampanjen bär RP:n vidare in i Gnesta. Simuleringens kvitto: E4 dag 2 e007577b till be6e026f (pjäsernas rutor är e4Plan(2) på den nya kartan; den fasta styrkan vinner med 13 kvar). Gnesta South dag 3 och North dag 2 står kvar.

Proven: simuleringens prov av vägen, hindren, vapnen, granaterna och reglarna (sim-core, sim-waves, sim-weapons, sim-obstacles, sim-grenades, cells, route-e4, barricade-failing, tweaks och delar av arsenal, epa-evac och operation) mäter på den raka vägen som förut, nu en provbana i tests/fixtures/straight-road.js, så att de inte rör sig när banan ritas om. Placeringsprovet för E4 är nytt (rampen är gata, vägrenen går, bilen och skogen står i vägen, motorvägen mellan ramperna är inte gångbar), och dis-provet kollar att E4:s ingångar ligger i diset.

## 0.16.0: inlärningen steg för steg, knappheten i förrådet och Hagstumosse som en sektor

Underlag: docs/superpowers/specs/2026-10-16-onboarding-design.md (med Olas beslut och tilläggen) och Olas beslut samma dag att Gnesta South och North är samma plats (Hagstumosse). Policyerna i scripts/balance.mjs spelar nu det spel en ny spelare får, så att fingeravtrycken mäter det riktiga spelet.

Vad policyerna följer (src/meta/unlocks.js, simuleringens sim.allow):
- E4 dag 1 har inga förnödenheter (kassan 0, dödade ger inget), infanteriet står vid bommen (preset), första Ksp 90 ställs på en markerad plats och den andra först efter våg 1 (late). Policyn ställer ut den sena enheten när den kommit fram. De markerade platserna är e4Plan(1):s fyra första, så att policyn och spelaren ser samma platser.
- Taggtråd från E4 dag 2, barrikader först från South dag 2 (smart spärrar inte dag 1, planen räknas utan spärr), skrotbilar efter South dag 2, Rotate och sikta-dra från E4 dag 3, Move från South dag 4, förnödenheter på enheten (ammunition, sandsäckar, granatlådor) från South dag 5, Next wave med bonus från South dag 3 (skilled kallar inte tidigt före det).
- Förrådet: inget att köpa på E4 och South dag 1 och 2. Nivåer och påfyllnad efter South dag 2, rekvisition efter dag 3, uppgraderingar och Return efter dag 4. Rekvisitionen hoppar över mål som inte är släppta (lagret tomt, 'none') eller inte upplåsta ('locked') i stället för att spara RP till dem.
- Knappheten: varje leverans har ett lager (stock) och uppgraderingarna släpps upp till en nivå (ups), North-uppgraderingarna fördelade över dag 1 till 5.
- Hagstumosse: Vikingavägen (förut Gnesta North) öppnar efter Ishallen dag 5 (förut dag 4) och har samma trupp; trycket mellan dem är borta.

Ändrade siffror och varför:
- E4 dag 1 hp 3,2 till 2,8. Med en Ksp 90 i våg 1 och infanteriet vid bommen tappade båda policyerna 5 i bas; dagen ska vara den lättaste (nu 19 till 20).
- E4 dag 2 hp 3,6 till 3,2, förnödenheter 350 till 250 och halva per dödad (bounty 0,6). Utan förrådets köp efter dag 1 föll basen till 9; överskottet (550 dollar) gick inte att lägga på något utom tråd.
- E4 dag 3 hp 1,2 till 1,0, förnödenheter 400 till 200, bounty 0,5 till 0,4. Utan förrådet förlorade normal i en seed av fem (bas 3 i de andra); nu 7 till 11, överskottet under 500.
- South dag 1 hp 2,8 till 1,9. Utan barrikaden vid rondellen (kommer dag 2) dog de civila på 44 s; nu 14 av 20 framme och 5 till 6 förlorade, båda policyerna, alla seeds.
- South dag 2 hp 3,3 till 1,8 och våg 3 från 130 till 98 (40 + 24 vandrare, 34 löpare). Utan förrådet före dagen (förut en tredje Ksp 90 och nivå 2 på allt) var den en vägg: alla försök förlorade. Nu vinner normal på första försöket med 7 till 11 kvar, skilled med full bas.
- De vilande husen flyttade från South dag 1 och 2 till dag 3 (designen); dag 3 har nu det förvarnade huset vid stickgatan i våg 1 och överraskningen i våg 2.

Resultat (fem seeds, försök per dag E1 E2 E3 S1..S5 N1..N5):
```
normal  seed 0  1 1 1 1 1 1 1 3 1 1 2 1 1
        seed 1  1 1 1 1 1 1 1 2 1 2 1 1 1
        seed 2  1 1 1 1 1 1 1 3 1 1 2 1 1
        seed 3  1 1 1 1 1 1 1 3 1 2 1 1 1
        seed 4  1 1 1 1 1 1 1 3 1 1 1 1 1
skilled alla seeds 1 på varje dag
```
Kampanjens mål håller: normal inom 1 till 4 försök (som mest 3, South dag 5), skilled allt på första försöket. Fingeravtrycken per kampanjsteg är alla nya, avsiktligt. Simuleringens kvitto: E4 dag 2 be6e026f till cf609061 (infanteriet står vid bommen från början, hp 3,2), South dag 3 3b601645 till db5f4217 (de vilande husen); North dag 2 står kvar.

Kvar att speltesta: överskottet av förnödenheter på South dag 3 och 4 för den skickliga (tidiga kall ger bonus, men förnödenheter på enheten kommer först dag 5); South dag 5 är nu den svåraste för normal (2 till 3 försök).

## 0.16.1: E4:s sista vågor, Ishallen dag 1 och överskottet på Ishallen dag 3 och 4

Underlag: speltesterna av 0.14.2 och 0.16.0 (docs/playtests/2026-10-17-0.16.0.md) och todo H192, H215. Uppmätt per våg med policyerna i scripts/balance.mjs, fem seeds.

E4 före (normal och skilled spelar E4 lika):
- Dag 1: 14 / 22 / 40 fiender, basen 19 till 20.
- Dag 2: 20 / 40 / 68, basen 20, 20, 13 till 16 (all skada i våg 3), 283 till 289 dollar över.
- Dag 3: 26 / 20 / 82 (36 bjässar), basen 20, 20, 7 till 11 (all skada i våg 3, 9 till 13 på en våg), 420 till 470 dollar över.

Ändrat och varför:
- Dag 1 våg 3: 22 + 18 till 20 + 12 vandrare (32). Sista vågen var nästan dubbla den näst sista, och tre minuter utan något att göra.
- Dag 2: våg 2 löparna 13 till 15 per grupp (44), våg 3 sex klungor löpare till fem (60). Nu 20, 18, 16: skadan kommer i två vågor i stället för en.
- Dag 3: våg 2 får två klungor bjässar (7 från Nyköping vid 10 s, 6 från Södertälje vid 28 s) och 16 löpare från påfarten; våg 3 26 bjässar i fyra klungor (7, 7, 6, 6) i stället för 36 i fem. Basen 20, 18 till 20, 10 till 13. Ingen våg tar mer än 10.
- Dag 3 bounty 0,4 till 0,3, och policyn lägger pengarna på två trådar till längre ned i stammen (21 och 25 m) när det finns mer än tre trådars pengar (det en människa gör mitt i vågen). Kvar efter dagen 170 till 200 dollar. Trådarna är sänkan; de ger lite (basen ungefär densamma), men pengarna har något att gå till.

Ishallen dag 1 (evakueringen):
- Uppmätt: med de frivilliga utställda där tipset säger (de föreslagna platserna i src/sim/evac-danger.js, en per korsning och en på den långa biten mot ishallen) dog sista gruppen (B3-12) i våg 2 när löparna kom ikapp den vid ishallen: 13 till 14 av 20 framme, en seed av fem på gränsen.
- Våg 2:s löpare kommer 22 s in i vågen i stället för 10. Den som följer tipset får in 17 till 18 av 20 i alla seeds; den som ställer alla frivilliga vid ishallen förlorar fortfarande (avsikten står kvar: de frivilliga ska täcka korsningen).

Ishallen dag 3 och 4 (H215):
- Förnödenheterna på enheten kommer först dag 5, så dag 3 och 4 har bara hindren att lägga pengar på. Skilled slutade med 1 185 till 1 265 och 2 225 dollar, normal med 750 till 830 och 1 335 till 1 395.
- Bounty dag 3 0,5 och dag 4 0,3. Utfallen är oförändrade i alla seeds (försök, bas och förluster); överskottet skilled 478 till 558 och 702, normal 69 till 151 och 167 till 229.

Resultat (fem seeds, försök per dag E1 E2 E3 S1..S5 N1..N5):
```
normal  seed 0  1 1 1 1 1 1 1 3 1 1 2 1 1
        seed 1  1 1 1 1 1 1 1 2 1 2 1 1 1
        seed 2  1 1 1 1 1 1 1 3 1 1 2 1 1
        seed 3  1 1 1 1 1 1 1 3 1 2 1 1 1
        seed 4  1 1 1 1 1 1 1 3 1 1 1 1 1
skilled alla seeds 1 på varje dag
```
Kampanjens mål håller. Fingeravtrycken per kampanjsteg är alla nya, avsiktligt (E4 dag 1 till 3 och Ishallen dag 1 ändrade, resten bärs vidare via RP). Simuleringens kvitto: E4 dag 2 cf609061 till bfc5d385; South dag 3 och North dag 2 står kvar.

## 0.16.2: Ishallen dag 2 en sak i taget

Underlag: speltestet av 0.16.1 (docs/playtests/2026-10-17-0.16.1.md). Testaren förlorade dag 2 två gånger (45 / 70 / 98 fiender, basen 20) och förrådet öppnade aldrig. Dagen hade fem nyheter före första vågen: barrikaden, Hemvärnet, en ny ingång (Norra vägen), hordens väg och omdirigeringen.

Uppmätt före (fem seeds, försök 1): normal 4 till 7 kvar efter dag 2; naive (ingen spärr, närmast en förstagångsspelare) förlorade alla fyra försök i alla seeds, basen 7 till 12 efter våg 1 och 0 i våg 2.

Ändrat och varför:
- Dag 2 lär ut barrikaderna och hordens väg (pilarna och omdirigeringen hör ihop). En ingång, Sigtunavägen öst. Vågorna 4 + 26 / 30 + 14 / 36 + 22 (30 / 44 / 58), samma trappa som dag 1 (19 / 32 / 60). hp 1,8 som förut.
- Hemvärnets grupp (MCF:s leverans) och Norra vägen flyttar till dag 3; skogsvägen till dag 4, där den är nyheten tillsammans med bjässarna. Dag 2:s leverans: två Ksp 90 och granaterna.
- Dag 3 hp 3,5 till 4,0: utan skogsvägen blev dagen lättare (normal 11 till 13 kvar mot 6 till 9 förut). Nu 6 till 9 igen.
- North dag 3 hp 4,4 till 4,2: en kortare dag 2 ger mindre RP (skilled 160 i stället för 293), och skilled behövde två försök på North dag 3 i två seeds av fem. Nu första försöket i alla.
- Balansskriptet: spärren dag 2 ligger vid första stickgatan (DAY2_BLOCKS, -25, 31). Vid rondellen (SMART_BLOCKS) har dag 2:s enda väg ingen omväg nära pjäserna. Ny policy hints: lägger spärren och ställer pjäserna längs den nya vägen som pilarna visar (förstagångsspelaren som följer tipsen).

Resultat dag 2 (fem seeds, försök 1, basen efter våg 1 / 2 / 3):
```
hints   20/20/17  20/20/18  20/20/15  20/20/14  20/20/15
naive   20/20/20  20/20/18  20/20/16  20/20/18  20/20/18
normal  20/20/17  20/20/18  20/20/15  20/20/14  20/20/15
```
Kampanjen (försök per dag E1 E2 E3 S1..S5 N1..N5):
```
normal  seed 0  1 1 1 1 1 1 1 3 1 1 2 1 1
        seed 1  1 1 1 1 1 1 1 3 1 1 1 1 1
        seed 2  1 1 1 1 1 1 1 3 1 1 2 1 1
        seed 3  1 1 1 1 1 1 2 1 1 2 1 2 1
        seed 4  1 1 1 1 1 1 1 3 1 1 1 1 1
skilled alla seeds 1 på varje dag
```
Kampanjens mål håller. Fingeravtrycken: E4 och Ishallen dag 1 står kvar, Ishallen dag 2 och allt efter är nya, avsiktligt. Simuleringens kvitto: South dag 3 db5f4217 till cab7334b (Norra vägen i stället för skogsvägen, hp 4,0); E4 dag 2 och North dag 2 står kvar.

Kvar att se: dag 2 är nu lätt för en spelare som läser kartan (skilled 14 till 18 kvar). Avsikten är att en ny spelare ska ta sig förbi dagen och se förrådet; ribban höjs igen dag 3.


## 0.16.4: E4 dag 2 rättvis, Ishallen dag 1 med val, dag 3 utan stup, löparna snubblar

Underlag: Olas feedback (E4 dag 2 orättvis, Hagstumosse dag 1 utan agens) och speltestet av 0.16.2 (docs/playtests/2026-10-17-0.16.2.md: Ishallen dag 3 med 49 / 94 / 190 och sex-sju nyheter på en gång, förrådet lovade en Ksp 90 som inte gick att få).

Ändrat och varför:
- E4 dag 2: båda ingångarna syns från början (Södertälje förvarnad, etiketten "From wave 2" och vägen därifrån), raden före våg 2 varnar, och Move (M) är dagens andra lektion (förut Ishallen dag 4). Fartknappen flyttade till dag 3. Vågorna och hp är oförändrade. Ny policy firstTimer: ställer båda Ksp 90 mot Nyköping och flyttar en mot Södertälje vid varningen. Den vinner dag 2 på första försöket i alla fem seeds med basen hel (20/20/20). Samma spelare utan flytt (firstStatic) vinner med 15 till 16 kvar. Skälet till att välja Move i stället för en tredje pjäs: det är det intressantare begreppet, och det behövs igen på Ishallen dag 1.
- Ishallen dag 1: två omgångar hus på olika gator (våg 1 i öster, våg 2 i väster), fyra korsningar och tre grupper frivilliga, need 18 av 24 (var 13 av 20). Inga föreslagna platser i spelet längre. Policyn hints (och skilled) läser farokartan (evacDeploy, evacReposition: grupperna vid korsningarna i tur och ordning, flyttar när omgången byter gata): vinner på första försöket med 20 till 23 framme. Tre grupper vid ishallen förlorar.
- Ishallen dag 3: Hemvärnet och Norra vägen är dagens två saker. De vilande husen flyttade till dag 4, Next wave med bonus till dag 5, Ksp 58 och pillboxen till dag 4, Ak 5 och Ksp 88 dag 5, Psg 90 till Vikingavägen dag 1, förnödenheterna på enheten till Vikingavägen dag 1 och skrotbilarna till Vikingavägen dag 2. Vågorna 39 / 60 / 84 (var 49 / 94 / 190), hp 4,0 till 2,7: utan Ksp 58 och Ak 5 är styrkan svagare. hints vinner på första försöket i alla seeds (8 till 9 kvar), normal 9 till 13, skilled 8 till 9.
- Ishallen dag 4 hp 2,2 till 1,3 och dag 5 hp 2,4 till 2,1: utan Psg 90 och Ak 5 föll normal i våg 2 i alla försök (bas 14 till 0) vid 2,2. Nu vinner normal dag 4 på andra försöket (6 till 8 kvar) och dag 5 på 2 till 3; skilled vinner båda på första.
- Förrådet: den extra Ksp 90 släpps med leveransen dag 4 (förut dag 3, där rekvisitionen inte hade öppnat). Nytt prov: varje löfte i ledningens text motsvaras av lager som går att rekvirera när meddelandet kommer.
- H234: skyltarnas fotavtryck i placeringen står där skyltarna står (förut frysta där de stod i 0.16.2, bland annat på väg 800:s asfalt). Placeringens fingeravtryck 92004483 till 3790515640. Simuleringens kvitto för E4 dag 2 rörs inte av det (samma rutor).
- Löparna snubblar (Olas bonus): var 20 till 40 m ett försök, chansen 0,6, ur zombiens id och simuleringens frö (inte sim.rng). Snubblet tar 1,2 s (faller 0,45, kryper 0,1, reser sig 0,55 av farten), cirka 0,8 s förlorad gångtid. Inte i diset. Mätbart men litet: normal snitt bas kvar 11,78 till 11,95 och 88 till 83 försök totalt, skilled 13,42 till 14,00. Ingen omtrimning för det.

Kampanjen (försök per dag E1 E2 E3 S1..S5 N1..N5):
```
normal  seed 0  1 1 1 1 1 1 2 2 1 2 1 1 1
        seed 1  1 1 1 1 1 1 2 3 1 1 1 1 1
        seed 2  1 1 1 1 1 1 2 3 1 1 2 1 1
        seed 3  1 1 1 2 1 1 2 1 1 2 2 1 1
        seed 4  1 1 1 1 1 1 2 3 1 1 2 1 1
skilled alla seeds 1 på varje dag
```
Kampanjens mål håller. Fingeravtrycken: alla steg utom E4 dag 1 nya, avsiktligt (ovan). Simuleringens kvitto: E4 dag 2 bfc5d385 till c6ff18ea och North dag 2 b50f3d9a till d4dc66ed (snubblet; utan det står båda kvar), South dag 3 cab7334b till 1b4eff89 (nya vågor, inga vilande hus).

Kvar att se: dag 4 kräver nu ett andra försök för normal i alla seeds (förut första). Speltesta om det känns som en vägg; det är där bjässarna och de vilande husen möts.

## Mölnbo (0.17.0-molnbo)

Ny sektor efter Hagstumosse (src/data/molnbo.js). Mätt med `node scripts/balance.mjs molnbo` över fem seeds. Spelaren kommer med det en vanlig spelare har efter Hagstumosse: `opCampaign('normal')` hela vägen genom E4, Ishallen och Vikingavägen, med trupperna (20 enheter), nivåerna, förrådets uppgraderingar och RP (`molnboArrival`). Därifrån spelas Mölnbo dag för dag med försök och rekvisition mellan försöken (`molnboCampaign`, REQUISITION.molnbo). Frontbredden är 10.

Policyerna:
- mbSmart (kartläsaren): spärrar Stenbyvägen vid Missionshuset och Kvarnvägen förbi hyreshusen, så att horden från Gnestavägen måste förbi stationen och runt genom rutnätet söder om spåret (Fagernäsvägen, Genvägen, Skolvägen). Med bara Stenbyvägen spärrad går horden Kvarnvägen söder om Folkets hus och aldrig förbi trapptornen (prickskyttarna sköt inte ett skott i webbläsarens speltest dag 1). Dag 4 och 5 spärrar hon också gångbrons södra ramp, så att allt norrifrån måste över vägbron. Psg 90 på tak (trapptornen, stationen, tåget), pjäserna där de ser mest av den tvingade vägen, ammunition och sandsäckar.
- naive: samma trupper och köp, allt efter sin egen väg, aldrig en spärr.

Kartan ändrades under passet (det ändrade allt):
- Parkeringarna och grusplanerna (stationsparkeringen, caféets parkering, Folkets hus plan, stationens grusplan) var gångbara ytor. Nu är de byggbara (vapenplatserna A, B, D och E i designen) med en körgata genom stationsparkeringen. Skäl: prickskyttarna på trapptornen vändes mot den stora gångbara parkeringen i stället för mot hordens väg (placement.js bestFacing väger alla gångbara rutor), och i speltestet i webbläsaren sköt de inte ett skott dag 1.
- Kvarnvägen (förbi hyreshusen) gick in på Stenbyvägen norr om Folkets hus och var en genväg: horden från Gnestavägen gick aldrig förbi stationen. Nu går den in söder om Kvarnen, i dimkanten, och är en omväg.

Prövat och förkastat:
- Spärren på vägbron (horden norrifrån tar gångbron) i stället för på gångbron: dag 4 med hp 15 förlorades i alla fem seeds, sämre än naive. Med spärren på gångbron vann hon med bas 2 till 3.
- En tyngd på pjäserna vid broarna (focus) dag 4: drog bort pjäserna från rutnätet i söder.
- Båda broarna stängda (horden slår sig igenom): planen i balansskriptet tillåter inte en stängd väg (gnestaPlan), så det är inte mätt. En människa kan göra det; det är dödszonen i designen.
- Första gissningen (hp 4,6 till 5,6) var alldeles för lätt: kartläsaren vann allt på första försöket med full bas.
- Dag 4 och 5 med fler zombier och högre hp: topparna gick över 250 (260 till 273). Vågorna dag 4 och 5 är nu 72 % av första gissningen (bjässarna orörda) och hp högre.

Siffrorna (hp-faktor per dag):
- dag 1 hp 18, dag 2 hp 12, dag 3 hp 16,5 (tåget efter 330 s), dag 4 hp 32 (340 s), dag 5 hp 15 (360 s, det sista tåget).
- Dag 2 och 3 avgör naive: dag 2 hp 14 förlorade naive i fyra seeds av fem (för tidigt), dag 3 hp 14 vann naive i fyra seeds (för sent).
- Dag 4 och 5 är knivseggar. Rekvisitionen mellan försöken hjälper lite (lagret är nästan tomt, nivåerna köpta, en förlust ger cirka 60 RP), så kurvan per försök är platt: ett par hp-steg mellan "alla på första försöket" och "någon seed vinner aldrig". Före Kvarnvägens spärr: dag 4 hp 36 alla på första, hp 40 2 till 6 försök; dag 5 hp 28 1 till 2, hp 30 en seed som aldrig vinner.

Resultat (försök till vinst per dag, seed 0 till 4):

    mbSmart  M1 M2 M3 M4 M5   topp
    0         1  1  1  1  2   191
    1         1  1  1  2  3   183
    2         1  1  1  1  2   194
    3         1  1  1  1  4   188
    4         1  1  1  2  1   195

    naive    M1 M2 M3 M4 M5
    alla      1  1  x  -  -   (fast på dag 3 efter fyra försök, topp 152 till 160)

Målen: kartläsaren vinner dag 1 till 3 inom 2 försök (alla på första) och dag 4 och 5 inom 4 (dag 4 1 till 2, dag 5 1 till 4). Naive vinner dag 1 och 2 och förlorar från dag 3. Flest levande zombier samtidigt 195 (målet under cirka 250).

Kampanjen: när Vikingavägen dag 5 är vunnen räknade finishDay Mölnbo som öppen och underbemannad, så sektorn började med tryck 2 (hp gånger 1,12). Ledningens första leverans till Mölnbo (mb-1, adopt) flyttar truppen dit och nollställer trycket: en ny sektor börjar utan tryck.

Fingeravtrycken per dag: tests/molnbo.test.js. Hela kampanjens kvitto (tests/balance-op-*.test.js) är oförändrat: Mölnbo spelas inte i opCampaign:s standardordning (SECTOR_ORDER).

Kvar: speltest med Ola. Hp-faktorerna här är höga jämfört med Hagstumosse (12 där) eftersom truppen är stor; en människa som inte spärrar Stenbyvägen förlorar dag 3, vilket är meningen. Dag 4 och 5 kan behöva mjukas upp efter speltestet.

## Mölnbo 0.17.0: sammanslagen med 0.16.4

Varför: 0.16.4 ändrade simuleringen (löparna snubblar, cirka 0,8 s förlorad gångtid per snubbel) och kampanjen före Mölnbo (E4 dag 2, Ishallen dag 1 och 3 till 5, taket per strid med reserven). Ankomsten till Mölnbo (`molnboArrival`, opCampaign('normal')) är därför en annan trupp, och varje Mölnbodag fick ett nytt kvitto. Utan omtrimning: kartläsaren behövde 3 försök på dag 4 i en seed (målet 1 till 2), och naive vann dag 3 på fjärde försöket i en seed (målet: fast från dag 3).

Ändrat, bara i Mölnbos data (src/data/molnbo.js):
- dag 3 hp 16,5 till 17,5: naive fast på dag 3 i alla seeds. Med 17 vann kartläsaren dag 3 med bas 1 i en seed; med 17,5 bas 2 till 10.
- dag 4 hp 32 till 31: kartläsaren vinner dag 4 inom 2 försök. 32 gav 1 till 3, 31,5 och 31 1 till 2.
- dag 5 hp 15 till 16: med dag 4 lättare kostade dag 5 för få försök; minst tre seeds ska kosta ett extra försök på dag 4 eller 5 (provet). 17 gav upp till 4 försök, 18 upp till 6.

Prövat: dag 3 16,5 och 17 (naive vann i en seed respektive smal marginal), dag 4 31,5 och 32, dag 5 15 till 18.

Resultat (försök till vinst per dag, seed 0 till 4):

    mbSmart  M1 M2 M3 M4 M5   topp
    0         1  1  1  2  1   192
    1         1  1  1  1  2   182
    2         1  1  1  1  1   189
    3         1  1  1  1  3   188
    4         1  1  1  1  1   195

    naive    M1 M2 M3 M4 M5
    alla      1  1  x  -  -   (fast på dag 3 efter fyra försök, topp 161 till 169)

Målen håller: kartläsaren vinner dag 1 till 3 på första försöket, dag 4 inom 2, dag 5 inom 3 (målet 4). Naive vinner dag 1 och 2 och fastnar på dag 3. Topp 195 levande zombier (målet under cirka 250). Provet skärpt: dag 4 inom 2 försök (var 4).

Fingeravtrycken (tests/molnbo.test.js), alla nya avsiktligt: mbSmart e1b56ac5, 6b6b4e1d, 2d092c0b, 5aabef35, 95c03dc5; naive 33af5c85, 8eeb29b5, 4da49be3 (dag 4 och 5 oförändrade, naive når dem inte). Dag 1 och 2 ändrades bara av ankomsten och snubblet, inte av datan. E4:s och Hagstumosses kvitto (tests/balance-op-*.test.js) är 0.16.4:s, orört.

## Mölnbo 0.17.1: efter speltestet av 0.17.0

Varför: speltestet (docs/playtests/2026-10-18-0.17.0.md) vann inte dag 1 på två försök. Vågorna var 14, 56 och 88 med överlapp 60 s, så våg 2 och 3 låg på varandra inom ett par minuter. Policyerna vann ändå dag 1 på första försöket, eftersom de varken staplar vågor av misstag eller lägger en spärr som leder horden runt hela försvaret.

Ändrat, bara i Mölnbos data (src/data/molnbo.js):
- dag 1: vågorna 14, 30 och 43 (var 14, 56 och 88), med 1 bjässe i stället för 2. Ingen överlapp: nästa våg väntar tills den förra är klar.
- dag 2: ingen överlapp (var 60 s). Överlappen kommer dag 3 med tåget, och dag 3:s första rad varnar ("From today the next wave will not wait for this one.").
- dag 5 hp 16 till 15: med de andra ändringarna behövde kartläsaren 5 försök på dag 5 i seed 0 (målet högst 3).

Ändrat i kartan, som också flyttar kvittot: trapptornen är 7,2 m höga (var 5,6, prickskytten ser längre från taket), och rutor under broarnas däck går inte att ställa något på (KIND.bridge).

Prövat: dag 5 hp 16 (seed 0 behövde 5 försök).

Resultat (försök till vinst per dag, seed 0 till 4):

    mbSmart  M1 M2 M3 M4 M5   topp
    0         1  1  1  1  2   187
    1         1  1  1  1  1   187
    2         1  1  1  1  1   193
    3         1  1  1  1  2   190
    4         1  1  1  1  1   191

    naive    M1 M2 M3 M4 M5
    alla      1  1  x  -  -   (fast på dag 3 efter fyra försök, topp 163 till 166)

Målen håller: kartläsaren vinner dag 1 till 3 på första försöket, dag 4 på första och dag 5 inom 2 (målen 1 till 2, 1 till 2 och högst 3). Naive vinner dag 1 med basen hel och dag 2, och fastnar på dag 3. Topp 193 levande zombier (målet under cirka 250). Dag 4 är fortfarande en knivsegg: seed 0 vinner med bas 1.

Fingeravtrycken (tests/molnbo.test.js), alla nya avsiktligt: mbSmart fc06f1e8, 2a41adb3, 6b126d51, f7e1072b, 0feb3169; naive 014058cf, aa17bc8e, 7aba3768 (dag 4 och 5 oförändrade, naive når dem inte). E4:s och Hagstumosses kvitto (tests/balance-op-*.test.js) är orört.

## 0.17.2: prickskytteposterna, vägarna och trädgårdarna

Varför: Olas speltest av 0.17.1. H301 ville ha prickskytt i missionskyrkans klocktorn och på de höga husen (hyreshusen, Folkets hus, stationshuset, trapptornen). H307 tog bort det som stod på vägarna, H308 gav trädgårdarna bodar.

Ändrat:
- Mölnbo: klocktornet (10,6 m) och trapptornen är torn (perch 3) med 15 % längre räckvidd för Psg 90 (src/sim/sim.js TOWER_RANGE); hyreshusen och stationshuset hela taket; Folkets hus bara gaveln mot grusplanen (hela taket gjorde dag 3 till 5 för lätta, också för den som aldrig spärrar).
- Mölnbo: Hembygdsgården och gärdsgården öster om Kvarnvägen (vägen gick genom huset), missionskyrkan, gula huset och kedjehusen en bit från gatorna, bergskärningen bruten där Genvägen går igenom, bilarna som stod på en gata borttagna. Att i stället dra om Kvarnvägen gav seed 0 tre försök på dag 4, så vägen ligger kvar.
- Bodarna och studsmattorna i trädgårdarna är saker (ingen pjäs i en bod).
- Dag 4 hp 31 till 36.
- Ishallen: bilen vid ishallens sidodörr 2 m in från gatan. Vikingavägen: villor som stod på en gångväg backar, radhus G kortare.

Mölnbo, fem seeds:

    mbSmart  M1 M2 M3 M4 M5
    alla      1  1  1  1  1   bas dag 4: 5 till 8 (förut 1 till 3)

    naive    M1 M2 M3 M4 M5
    0         1  1  1  x  -
    1         1  1  1  x  -
    2         1  1  1  4  1
    3         1  1  1  x  -
    4         1  1  1  x  -

Målen ändrade: kartläsaren vinner varje dag på första försöket och dag 4 kostar basen (högst 12 kvar); den som aldrig spärrar klarar dag 3 med prickskyttarna men fastnar på bron dag 4 i fyra av fem seeds (förut dag 3). Dag 4 och 5 var knivseggar och Ola förlorade dag 4 (MB05, H295); de är mjukare nu. Designens strategiska djup (docs/superpowers/specs/2026-10-18-strategiskt-djup.md) får avgöra om naive ska fastna tidigare igen.

Fingeravtrycken, alla nya avsiktligt: mbSmart e3366e99, c9a25d00, ea3c29de, 98f2872d, e730f02a; naive 4e087429, 2065fc1c, c70477a5, 0641acc9, 2df44d12. Kvittona i tests/balance-op-*.test.js: Vikingavägen dag 1 till 5 nya (normal och skilled), Ishallen dag 1 till 5 nya (skilled), E4 orört.

## 0.18.0: strategiskt djup, skiva 1

Varför: Olas feedback på 0.17.1 ("klicka ut trupper längs en väg och vänta, inga riktiga val") och besluten i strategiskt djup avsnitt 7 och kampanjplanen. Skiva 1: skadeklasser och två fiender, sanity med routed, överrända pjäser, Fall back, hus, korseld, Håll eld, trötthet, kvalitativ rekvisition och mål-läget.

Var mekanikerna kommer (allow i src/meta/unlocks.js; kampanjplanens dagar flyttade till dagarna som finns):

| Begrepp | Dag i spelet | Kampanjplanens dag | Varför där |
|---|---|---|---|
| Korseld | Ishallen dag 2 | 5 (Ishallen 2) | samma |
| Sanity (mätaren och verkan) | Ishallen dag 3 | 6 (Ishallen 3) | samma, med Hemvärnet |
| Trötthet (förrådet) | efter Vikingavägen dag 3 | mellan 9 och 10 | första gången styrkan är större än frontbredden |
| Krypare + mål-läget (T) | Vikingavägen dag 4 | 7 (The pincer) | Psg 90 har funnits sedan Vikingavägen dag 1 |
| Trupper i hus | Vikingavägen dag 5 | 10 (Björnlunda) | Björnlunda finns inte; Vikingavägens villagator är närmast. Kräver bara Move och Hemvärnet |
| Routed och Fall back (G) | Mölnbo dag 1 | 8 (Mölnbo) | samma plats; sanity har funnits i sex dagar |
| Pansrad (Strongest) | Mölnbo dag 2 | 9 (Mölnbo, sista tåget) | Ksp 88 har funnits sedan E4 dag 3 |
| Håll eld (H) | Mölnbo dag 4 | 12 (rondellen) | bron är bakhållet |
| Överrända pjäser och Recrew (N) | Mölnbo dag 5 | 16 (centrum) | sista dagen, hela styrkan ute |

Siffrorna (startgissningar, mätta nedan):
- Pansrad: hp 95, fart 1,35, 20 % av småkaliber. Krypare: hp 40, fart 0,95, tråden bromsar inte och slits inte, träff från tak, torn och hus 35 %.
- Sanity: tär 1,0 per sekund och fear-enhet på 0 m, linjärt till 0 vid 8 m (vandrare 1, löpare 1,2, krypare 1,6, pansrad 2, bjässe 3), delat med nerve (civila 0,6, Hemvärnet 1, pjäslagen 1,2 till 1,4, infanteriet 1,5; stjärnan 1,25). Pjäslag bakom sina säckar 60 %, grupper med sandsäckar 75 %, i hus 50 %. En man stupar: 22 i gruppen, 8 för enheter inom 14 m; ett lag nere: 14. Tillbaka 3 per sekund utan zombie inom 12 m. Under 60 sämre träff (ned till 65 %) och eldtakt (ned till 75 %), varning under 35, routed under 18; en flydd grupp är tillbaka i reserven med 55 efter 20 s.
- Pjäslaget: 30 liv per man (Ksp 90 två, Ksp 58 tre, Ksp 88 två). Recrew 150 i förnödenheter, 4 s; en grupp inom 10 m gratis på 8 s; ett flytt lag kommer tillbaka efter 30 s om det är lugnt.
- Hus: kapacitet yta/11 m² (4 till 8 soldater) eller en pjäs, dörren 260, 30 % av de som går förbi stormar (bjässar och pansrade alltid), inslagen dörr tar 45 % av livet på varje soldat.
- Korseld +20 % vid minst 60 grader. Håll eld: släpps inom 6 m, 1,2 s dubbel skada, 15 s nedkylning.
- Trötthet: träff 100, 95, 88 %; eldtakt 100, 100, 94 %; sanity tär 100, 112, 130 %. Först prövat 92/80 % träff och 88 % eldtakt: kartläsaren fastnade på Mölnbo dag 3 i fem seeds av fem (alla dagar ute gör alla utmattade), också med vila i policyn.
- Rekvisitionens streck: Firepower efter skada per sekund mot vandrare på nivå 1 (trösklar 15, 25, 38, 50), Range (14, 16, 18, 22 m), Resilience efter nerve (0,8, 1,1, 1,3, 1,45; pillboxen fem), Armour-piercing 5 för tung, 3 med granattillsats, annars 1 (src/ui/statbars.js).

Policyerna (scripts/balance.mjs): rest (skilled, normal, mbSmart) fyller frontbredden med de enheter som är värda mest (rekvisitionspris och nivå gånger 1, 0,95 eller 0,75 för trötthet), resten vilar. depth: true (skilled, mbSmart) ställer Ksp 88 på Strongest när dagen har pansrade eller bjässar, bemannar tysta pjäser med Recrew och ställer en grupp i huset som ser flest rutor av hordens väg (minst 30). depth: 'recrew' (normal) bara Recrew. naive gör inget av det. Första husvalet räknade alla gator och valde ett hus horden aldrig gick förbi; den skickliga förlorade då Vikingavägen dag 5 i tre seeds av fem. Med bara hordens väg vinner hon på första försöket. HORDE_OFF=sanity,fatigue slår av mekaniker vid mätning.

Mätt (fem seeds), med mekanikerna en i taget: utan trötthet vann kartläsaren hela Mölnbo, utan sanity fastnade han på dag 4, utan korseld fastnade han på dag 3. Tröttheten var det tyngsta lagret.

Hagstumosse (tests/balance-op-*.test.js):

    skilled  alla dagar på första försöket i alla seeds

    normal   E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
    0         1  1  1  1  1  1  2  1  1  1  3  1  1
    1         1  1  1  1  1  1  2  2  1  1  3  1  1
    2         1  1  1  1  1  1  2  2  1  1  2  1  1
    3         1  1  1  2  1  1  2  1  1  2  2  1  1
    4         1  1  1  1  1  1  2  2  1  1  2  1  1

Mölnbo (ankomsten är den vanliga spelarens framsteg, src/data/arrival.js omräknad):

    mbSmart  M1 M2 M3 M4 M5
    alla      1  1  1  1  1   bas dag 4: 1 till 11, topp 205 till 250

    naive    M1 M2 M3 M4 M5
    0         1  1  x  -  -
    1         1  1  2  x  -
    2         1  1  x  -  -
    3         1  1  x  -  -
    4         1  1  4  x  -

Ändrat för att hålla målen: Mölnbo dag 4 hp 36 till 34 (35 gav tre försök i två seeds, 33 lät basen stå över 12), dag 4:s sista våg 58 till 46 vandrare, dag 5:s fjärde våg 43 till 36 och femte 43 och 36 till 34 och 30 (toppen var 270 levande, målet 250).

Målen håller: den vanliga spelaren klarar varje dag inom 1 till 3 försök, den skickliga på första, kartläsaren i Mölnbo på första och dag 4 kostar basen, den som aldrig spärrar fastnar på dag 3 eller 4 (förut dag 4), ingen dag över 6. Nytt prov (tests/depth.test.js): den som köper mest eld per krona (fem Ksp 90) förlorar mot 14 pansrade där en Ksp 88 på Strongest och två Ksp 90, billigare, håller.

Fingeravtrycken, alla nya avsiktligt utom E4 dag 1 till 3 och Ishallen dag 1 (de rör sig inte, som kampanjplanen sa):
- skilled: gnesta 2 1f306f99, gnesta 3 ce96f7c9, gnesta 4 be55cf8c, gnesta 5 3f05462b, gnesta-norr 1 6c0f73e7, gnesta-norr 2 91754a0f, gnesta-norr 3 c44fb2a7, gnesta-norr 4 958c38e2, gnesta-norr 5 8697e30f
- normal: gnesta 2 30e441d4, gnesta 3 174fceb0, gnesta 4 0989ad13, gnesta 5 2cb68445, gnesta-norr 1 07d6004f, gnesta-norr 2 0e7ad74e, gnesta-norr 3 bac421f0, gnesta-norr 4 a5ab6f92, gnesta-norr 5 6a048183
- mbSmart: 56c5cd8e, e2543d9b, f7cf1b9c, 13dece00, 71682133; naive: b67298aa, 595148d1, 60aeead0, f27ce50b, 741638a5

## 0.18.1: vågornas grind, förrådets banor och speltestet av 0.18.0

Varför: speltestet av 0.18.0 (docs/playtests/2026-10-18-0.18.0.md) sa NEJ. På Mölnbo dag 5 var alla fem vågor ute inom fyra minuter och på Vikingavägen dag 4 gick 310 zombier samtidigt; förut startade nästa våg dayCfg.overlap sekunder efter att den förra kommit ut, hur det än gick för försvaret. Då spelar Recrew, Fall back, Håll eld och husen ingen roll, allt tystnar bara.

Regeln (src/sim/sim.js overlapGate): på en dag med överlapp kommer nästa våg av sig själv först när (1) alla äldre vågor är klara, (2) den senaste har kommit ut helt och (3) 70 % av den är nere, eller dayCfg.overlap sekunder har gått sedan den kom ut (den långa klockan, samma tal som förut: 50 i Mölnbo, 60 på Vikingavägen, 100 på Ishallen dag 4 och 5). Sedan 12 s nedräkning. Zombier som står vid basens dörr (Mölnbo och ishallen tar in dem en i taget) räknas som ute. Utan tidigt kall är högst två vågor ute samtidigt; ett nytt prov (tests/wave-overlap.test.js) kör varje dag på varje bana och policyernas loggar har peakWaves (inte i fingeravtrycket).

Förrådets banor (src/meta/operation.js lanes): bara stridsbanan går ut i striden. Förslaget är det policyerna redan valde (rekvisitionspris och nivå gånger 1, 0,95 eller 0,75 för trötthet); en vunnen dag nollställer valen. Det flyttar alla dagar där styrkan är större än taket.

Funnet under passet: på Mölnbo dag 4 stod 57 zombier i sju minuter och slog på ett hus där hela gruppen redan låg (attackHouse gjorde ingenting och de gick aldrig vidare). Ett hus stormas nu bara så länge någon är kvar inne. Utan rättelsen fastnade kartläsaren på våg 3 med grinden.

Tåget i Mölnbo: med grinden kommer vågorna ungefär var 75:e till 90:e sekund (dag 3: 0, 73, 177, 261, 356 s för kartläsaren). Med de gamla avgångarna (330, 340, 360 s) gick tåget innan sista vågen kom, och dag 3 till 5 blev för lätta (bas 18 till 20). Nu 420, 380 och 420 s.

Ändrat för att hålla målen:
- Vikingavägen dag 2 hp 4,4 till 3,5: med grinden och banorna förlorade den skickliga första försöket i en seed av fem (4,2, 4,0 och 3,8 flyttade bara förlusten till en annan seed).
- Vikingavägen dag 3 hp 4,2 till 3,9: den skickliga förlorade första försöket i två seeds av fem med banorna.
- Mölnbo dag 4 hp 34 till 38: med det senare tåget stod basen kvar på 13 till 15 i två seeds; dag 4 ska kosta basen (högst 12). 36 gav 13 i en seed.
- Dagens längd för den vanliga spelaren: taket 600 till 760 s. Vikingavägen dag 3 till 5 tar nu 580 till 750 s, eftersom vågorna väntar på försvaret. Det är avsikten (varje våg ett andetag), inte ett segt försvar.

Mätt (fem seeds):

    skilled  alla dagar på första försöket i alla seeds

    normal   E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
    0         1  1  1  1  1  1  2  3  1  1  1  1  1
    1         1  1  1  1  1  1  2  3  1  1  1  1  1
    2         1  1  1  1  1  1  2  2  1  1  1  1  1
    3         1  1  1  2  1  1  2  1  1  1  1  3  1
    4         1  1  1  1  1  1  2  3  1  1  1  1  1

    mbSmart  alla dagar på första försöket; bas dag 4: 4, 5, 8, 10, 11; topp 170 till 177 levande
    naive    M1 M2 M3 klarade, fast på dag 4 i alla seeds; topp 137 till 169

Flest vågor ute samtidigt utan tidigt kall: 2 på varje dag, alla policyer. Toppen i Mölnbo sjönk från 205 till 250 (0.18.0) till 170 till 177.

Ishallen dag 1 (speltestet: vunnen med 5 dödade): mätt utan att ändra. Utan trupp faller sju civila (need 18 av 24) och dagen förloras; med de frivilliga vid ishallens dörr likaså. Den vanliga spelaren skjuter 14 till 15 och räddar 19 till 20, kartläsaren 10 till 12 och räddar 21 till 23. Dagen kräver alltså försvar av korsningarna; få dödade betyder att de frivilliga stod rätt, inte att dagen är gratis. Nytt prov: tests/evac-defence.test.js.

Huvudlöst (scripts/slice1-check.mjs, speltestet hann inte se dem): pansrade tar 23 % av småkaliberns skada per träff jämfört med vandrare och 104 % av Ksp 88:s; kryparna går genom tråden i full fart (vandrarna i 40 %) och sliter den inte; Mölnbo dag 1 till 4 med balansens uppställning vinns med högst två vågor ute; tröttheten och banorna syns i förrådet.

Fingeravtrycken, alla nya avsiktligt utom E4 dag 1 till 3 (skilled även Ishallen dag 1 till 3; naive Mölnbo dag 5 nås inte):
- skilled: gnesta 4 1b2ae109, gnesta 5 61416be7, gnesta-norr 1 3a26659c, gnesta-norr 2 fa0dc529, gnesta-norr 3 47608c3d, gnesta-norr 4 0f97d49f, gnesta-norr 5 628271bd
- normal: gnesta 1 5c904291, gnesta 4 39099584, gnesta 5 88f88ce5, gnesta-norr 1 dbfddd7d, gnesta-norr 2 b1e0a44e, gnesta-norr 3 edf6aaf4, gnesta-norr 4 9cb081a4, gnesta-norr 5 58cf1d44
- mbSmart: 85aa38eb, 9f8c075d, 5472293e, 2fba89fd, 78964c6b; naive: cfe6db7e, fcf87131, 0054e104, 01cd0974, 741638a5
- simuleringens kvitto Gnesta North day 2: f734013e (Vikingavägen dag 2:s hp och grinden)

## 0.19.0: Mölnbo-passet

Varför: Olas Mölnbo-lista (H450 till H459) och speltestet av 0.18.1 (docs/playtests/2026-10-18-0.18.1.md).

Ändringar i simuleringen som flyttar alla dagar:
- Löparnas snubbel (H454, H455): chansen 0,6 var 20 till 40 m blev 0,2 var 40 till 90 m plus utlöst snubbel (tung träff 0,5, taggtråd 0,35, skarp sväng 0,25), tre varianter som behåller farten. Förut kostade snubblet cirka 1 s var 50:e meter, ungefär 6 % av löparens tempo; nu nästan inget. Löparens fart 3,4 till 3,22 för att hålla tempot. Utan sänkningen förlorade naive Ishallen dag 1 två gånger i en seed (evakueringen).
- Tärningen i snubblet och i stormningen av hus var trasig (ett tal 0..1 i en heltalshash, så det inre anropet blev 0): alla zombier fick samma tal. Stormningen gav 0,26 under ASSAULT 0,3, så varje zombie som gick förbi ett hus med garnison stormade det. Nu stormar 30 % som tänkt (bjässar och pansrade alltid).
- Vågens svans (speltestet, fynd 5): när inget mer ska ut och högst 5 lever i 15 s går krypare och de som har mer än 40 % av vägen kvar 2,5 gånger fortare. Inte bjässar och pansrade: med dem i svansen bröts inte gruppen i provet för routed.
- Bjässarna knuffar undan skrotbilar på 2 s (H456) och har ett eget flöde där en bilruta bara är en liten omväg.

Mölnbo (H450 till H452):
- Ingångarna vända: väg 57 norrifrån (S1), Fagernäsvägen österifrån (S3), Norrbacken (S4), en mindre grupp söderifrån (S2, dag 2 våg 2: 18 i stället för 36, resten från S1), banvallen västerifrån dag 5. Gruppernas storlekar är desamma, bara ingångarna bytta.
- Kartläsaren spärrar inte längre Kvarnvägen (spärren var mot horden från Gnestavägen). Den flyttar en grupp, eller en Ksp 58, mot gångbrons södra fot när pendeltåget signalerar; naive håller.
- Pendeltåget med 50 (34 vandrare, 10 löpare, 6 krypare) i tredje vågen med hp 38 tog basen i alla fem seeds för kartläsaren (före 330 s). Prövat: utan tåget vinner kartläsaren med bas 2 till 10; hp 30 med tåget i tredje vågen och hp 32 med 40 i tåget förlorade båda försök 1 i en seed. Valt: tåget 30 s in i fjärde vågen ("Brutes at the bridge!"). Med hp 34 vann kartläsaren (bas 6 till 11), men balansens uppställning utan policyns ordrar (Quick jump, scripts/slice1-check.mjs) förlorade dag 4 också utan tåget; med hp 32 vinner den med bas 3. Valt hp 38 till 32. Kartläsarens bas dag 4: 9, 10, 14, 6, 11; provets gräns 12 till 14.
- Vikingavägen dag 4 tog 762 s i ett försök för den vanliga spelaren (löparna långsammare); dagens tak i provet 760 till 780 s.

Mätt (fem seeds):

    skilled  alla dagar på första försöket i alla seeds

    normal   E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
    0         1  1  1  1  1  1  2  1  1  1  2  2  1
    1         1  1  1  1  1  1  2  3  1  1  1  1  1
    2         1  1  1  1  1  1  2  2  1  1  1  1  1
    3         1  1  1  1  1  1  2  1  1  1  1  2  1
    4         1  1  1  1  1  1  2  2  1  1  1  1  1

    mbSmart  alla dagar på första försöket; bas dag 4: 9, 10, 14, 6, 11; topp 179 till 183 levande
    naive    M1 M2 klarade i alla, fast på dag 3 (två seeds) eller dag 4 (tre); topp 157 till 205

H457 (Olas Mölnbo dag 2): ingen bugg i flödesfältet; husen ingår aldrig i flödets kostnader. Gruppen söderifrån kommer ut söder om Kvarnvägens korsning, så med Kvarnvägen stängd var skrotbilarna på Stenbyvägen söder om Folkets hus dess enda väg (reproducerat i 0.18.1:s simulering med kartläsarens spärrar). Provet i tests/molnbo.test.js.

Fingeravtrycken, alla nya avsiktligt utom E4 dag 1 (och naive Mölnbo dag 5 som inte nås):
- skilled: riksvagen 2 986b0d39, riksvagen 3 317daa74, gnesta 1 37f66ccc, gnesta 2 5d91f1c0, gnesta 3 d24affa8, gnesta 4 75fcf705, gnesta 5 6fa8785c, gnesta-norr 1 43503f5f, gnesta-norr 2 487c969f, gnesta-norr 3 3e37492a, gnesta-norr 4 05ff05d0, gnesta-norr 5 71752939
- normal: riksvagen 2 986b0d39, riksvagen 3 317daa74, gnesta 1 96f58429, gnesta 2 5951f597, gnesta 3 fcbce262, gnesta 4 720b0848, gnesta 5 e9668299, gnesta-norr 1 106cddff, gnesta-norr 2 bc6d5c4b, gnesta-norr 3 de320769, gnesta-norr 4 eb822697, gnesta-norr 5 cc3c2361
- mbSmart: 9dc4609e, 59bca231, b8d99010, f7072057, 40f8ba59; naive: c4418990, 8cb11324, b8edeaab, 839ed928, 741638a5
- simuleringens kvitto: E4 day 2 a4f9fd50, Gnesta South day 3 7007da68, Gnesta North day 2 5a8260b6

## 0.19.1: speltestet av 0.19.0

Speltestet sa NEJ (docs/playtests/2026-10-19-0.19.0.md): Mölnbo dag 3 och 4 var en mur, testaren förlorade två och fem gånger, och pendeltåget kom när basen hade 3 till 4 kvar.

Orsaken (H462): grinden höll "högst två vågor ute", men den långa klockan (dayCfg.overlap, 50 s på Mölnbo) släppte nästa våg 50 s efter att den senaste kommit ut, hur många av den som än levde. Spårat i balansen (naive, seed 0): dag 4 kom våg 4 vid 240 s med 63 av 73 i våg 3 kvar, och tågets 50 räknades in i våg 4 ovanpå (156 i vågen); dag 3 kom våg 4 (154) med våg 3 knappt rörd. På Mölnbos långa vägar har en våg knappt nått försvaret efter 50 s. Tåget räknades inte utanför grinden: dess 50 ligger i vågens kö och håller grinden stängd tills de klivit ur.

Ändringar:
- dayCfg.overlapMin (src/sim/sim.js overlapGate): den långa klockan släpper bara om så stor del av den senaste vågen är nere; annars väntar nästa våg på 70 % som förut, eller på OVERLAP_STALL (3) gånger klockan så att dagen aldrig står still. Mölnbo dag 3 till 5: 0,4. Vikingavägen och Ishallen dag 4 och 5 har inget overlapMin och räknar som förut (speltestade med den gamla klockan).
- Mölnbo dag 3: våg 3 99 till 77 (30 löpare, 36 vandrare, 8 krypare, 3 bjässar), våg 4 154 till 110 (44 + 36 vandrare, 26 löpare, 4 bjässar). hp 17,5 till 18.
- Mölnbo dag 4: pendeltåget i tredje vågen (var fjärde), 35 s in och förvarningen 12 s före (var 30 och 9); tredje vågen 73 till 43 (22 + 16 vandrare, 3 pansrade, 2 bjässar), fjärde 101 till 89 (30 löpare, 30 + 24 vandrare, 5 bjässar). Avgången 380 till 420 s (med grinden hinner tåget annars inte in före avgången). hp 32 till 38.
- Mölnbo dag 5: hp 15 till 19 (grinden gör dagen lättare).
- Prövat dag 4: hp 32 och 37 gav naive bas 5 till 12 på första försöket utan förlust, hp 40 gav naive fast i en seed och vinst med 2 till 3 i två; 36 vann alla med 6 till 12. Valt 38.

Spelet utanför Mölnbo:
- Snubblet (H466): minst 60 m mellan två snubbel för samma löpare (var 12), utlösarna en liten chans (sväng 0,25 till 0,04: varje gathörn var en sväng; taggtråd 0,35 till 0,15; tung träff 0,5 till 0,3), slumpsnubblet var 70 till 130 m med chansen 0,06 (var 40 till 90 m, 0,2), och inget snubbel inom 4 m och 10 s från ett annat. Över Mölnbo utan försvar: dag 1 5 till 6 av 24 löpare (var 20), dag 4 13 till 17 av 62 (var 55), nästan ingen två gånger. Löparnas fart står kvar på 3,22.
- Vågens svans (H464) gäller alla typer, också bjässar och pansrade: tre bjässar på väg 57 191 till 148 s.
- Dörren in i ett hus (H465) är närmaste ruta trupperna går på. Påverkar bara flytten mitt i en våg.
- Förrådets förslag (H467) väger tröttheten hårdare (0,4 för utmattad i stället för 0,75), så att utvilade går före. Påverkar vilka som går ut i varje kampanj.

Mätt (fem seeds):

    skilled  alla dagar på första försöket i alla seeds

    normal   E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
    0         1  1  1  1  1  1  2  3  1  1  1  1  1
    1         1  1  1  1  1  1  2  3  1  1  1  1  1
    2         1  1  1  1  1  1  2  1  1  1  1  2  1
    3         1  1  1  1  1  1  2  1  1  1  1  3  1
    4         1  1  1  1  1  1  2  1  1  1  1  3  1

    mbSmart  alla dagar på första försöket; bas vid tågets signal dag 4: 20 i alla; bas dag 3: 20, 20, 9, 20, 20; dag 4: 18, 20,
             20, 20, 20; dag 5: 14, 15, 10, 13, 15
    naive    M1 till M4 på första försöket i alla seeds, M5 på första eller andra; bas vid tågets signal dag 4: 20 i alla; bas dag 3:
             17, 17, 2, 14, 11; dag 4: 10, 9, 1, 7, 2; dag 5: 7, 2, 11, 1, 11

Naive är den som ställer ut förnuftigt men aldrig spärrar. Han når nu dag 5, och tåget dag 4 kostar honom: han håller, kartläsaren flyttar en grupp mot perrongen och klarar sig med 18 till 20. Provet i tests/molnbo.test.js: basen minst 15 vid signalen för båda, kartläsaren minst 12 efter dag 4, naive högst 12 när han håller.

Fingeravtrycken, alla nya avsiktligt utom E4 dag 1:
- skilled: riksvagen 2 d8e825ab, riksvagen 3 64696f50, gnesta 1 a63420bf, gnesta 2 aa76c39f, gnesta 3 2cf1cf0c, gnesta 4 9704aede, gnesta 5 79d1335f, gnesta-norr 1 c06849ef, gnesta-norr 2 d8a5ca05, gnesta-norr 3 ebe37682, gnesta-norr 4 5041e265, gnesta-norr 5 0184be22
- normal: riksvagen 2 d8e825ab, riksvagen 3 64696f50, gnesta 1 92dfca36, gnesta 2 a532570f, gnesta 3 1f38a7e5, gnesta 4 c2e3bc83, gnesta 5 a1838b44, gnesta-norr 1 b6376170, gnesta-norr 2 3ddf1905, gnesta-norr 3 f25586bc, gnesta-norr 4 4689acb8, gnesta-norr 5 bc908954
- mbSmart: d71cc6d9, c73e046d, 92e246da, 0c272f1e, 03a530a8; naive: 579bb76c, 972a565c, a84d179d, cf77065c, 2d2e2051
- simuleringens kvitto: E4 day 2 5d0128c1 (vinner med 18, var 20), Gnesta South day 3 8a57a9a2, Gnesta North day 2 dabfdccd
- Ankomsten till Mölnbo (src/data/arrival.js) omräknad: wireTough.1 med i forskningen, infanterigruppen på nivå 1 saknas, M2 och Ak 5 på nivå 2.

## 0.19.2: speltestet av 0.19.1

Speltestet sa NEJ, men nära (docs/playtests/2026-10-19-0.19.1.md). Dag 4: "vandrare med cirka 1 140 hp gick förbi mitt kluster till basen från cirka 270 s, tre försök i rad", och det syntes inte var.

Läckorna mätta med läckmarkeringen (src/ui/leaks.js, samma regel som i spelet: förbi de sista försvararna, ingen enhet täcker resten av vägen) över naive dag 4, seed 0 till 2, hp 38:

    seed 0  288 s Stenbyvägen (38, 91), 310 till 369 s Folkets hus (59, 103) fyra gånger, 410 s Stenbyvägen
    seed 1  291 s Stenbyvägen (36, 91), 329 och 374 s Folkets hus, 408 s Stenbyvägen (fyra på en gång)
    seed 2  408 och 417 s Skolvägen (70, 58)

Läckan är den sista biten av Stenbyvägen fram till Folkets hus, där alla tre ingångarna (väg 57, Fagernäsvägen och Norrbacken) går ihop. Täckningen längs vägarna vid 200 s (enheter som har rutan inom räckvidd och sikt, var femte ruta, de sista fjorton):

    naive    Stenbyvägen 1 till 4, Folkets hus 1, 1, 0
    mbSmart  Stenbyvägen 0 till 7, Folkets hus 1, 1, 0

Vägen går alltså att täcka med en vanlig uppställning (naive har 2 till 4 enheter på den), och kartläsaren har inte mer vid Folkets hus än naive; skillnaden är att han samlar elden längs Stenbyvägen. Det är ingen väg som inte går att försvara, men trycket när pendeltåget signalerar (dagens hp 38: en vandrare tål 38 gånger sin grund) var för högt för den som håller. Nu när läckan syns ska det gå att se och flytta mot den.

Ändringar:
- Mölnbo dag 4: hp 38 till 36. Prövat i 0.19.1: 36 vann alla med 6 till 12 för naive. Inget annat ändrat.

Mätt (fem seeds), bas vid dagens slut:

    mbSmart  dag 4: 19, 19, 20, 20, 20 (var 18, 20, 20, 20, 20); dag 5: 14, 15, 10, 13, 15 (oförändrat)
    naive    dag 4: 9, 12, 11, 12, 6 (var 10, 9, 1, 7, 2); dag 5: 7, 6, 11, 7, 11 (var 7, 2, 11, 1, 11)
             alla dagar på första försöket; basen vid tågets signal 20 i alla

Den som håller betalar fortfarande (naive högst 12 dag 4, provet i tests/molnbo.test.js), men ingen seed slutar på 1 eller 2. Fingeravtrycken dag 4 och 5 nya, avsiktligt: mbSmart a7c97377, a447e4e0; naive 06a2f8c6, 6b3b70bd. Dag 1 till 3 orörda.

## 0.20.0 (riktningarna)

Varför: kampanjbågen (kampanjplanen avsnitt 10, H496 och H497). Kartornas ingångar ska följa berättelsen, och Move kommer med radion dag 6.

Ändringar som flyttar balansen:
- Move och Rotate låses upp Ishallen dag 3 (förut E4 dag 2 och 3). Policyerna flyttar i uppställningen (Reposition, direkt och gratis när ingen zombie lever) före det: Ishallen dag 1 mellan vågorna och E4 dag 2 före Södertälje-vågen. Policyns vridning av sysslolösa pjäser (reaim) nekas på E4 dag 3 och Ishallen dag 1 och 2. E4 dag 3 slutar med bas 12 till 14 (var 10 till 11) för båda policyerna; skillnaden är vridningen, orsaken i detalj inte utredd.
- Vikingavägen: Östra Storgatan (dag 4 och 5) och Sigtunavägen öst (dag 5) ersatta av skogsvägen söderifrån (samma grupper, samma storlekar och tider). Rutnätet når skogsvägens dimkant (z 64 till 88). Skogsvägen är 137 rutor till ishallen (Östra Storgatan 131, Sigtunavägen öst 118), men den går inte förbi radhusen och dödszonen vid Gångvägen som policyerna bevakar.
- Första försöket bytte Sigtunavägen öst mot Sigtunavägen väst (sigW) dag 5: väster är 84 rutor och ingen av policyerna står där dag 5, så 25 vandrare och 25 löpare tog basen 20 till 0 i alla seeds. De gick till skogsvägen i stället; väster har bara "Behind you, from the west!" (15 vandrare) som förut.
- Vikingavägen dag 4 hp 7 till 9. Med 7 vann den vanliga spelaren dag 4 på första försöket i alla seeds (flanken söderifrån träffar inte dödszonen vid radhusen som Östra Storgatan gjorde) och provet "grind spelar roll" fick 7 förlorade försök av minst 10. Prövat: hp 8 gav samma, hp 10 gav den skickliga 2 till 3 försök i tre seeds. Dag 5 hp 13 prövat och förkastat (den skickliga bas 1 till 6).

Mätt (fem seeds), försök per dag och bas kvar:

    skilled  alla dagar på första försöket i alla seeds
             bas N4: 4, 5, 7, 6, 4 (var 14, 14, 14, 14, 15); N5: 9, 8, 7, 9, 8 (var 14, 14, 14, 13, 14)

    normal   E1 E2 E3 S1 S2 S3 S4 S5 N1 N2 N3 N4 N5
    0         1  1  1  1  1  1  2  1  1  1  1  1  1
    1         1  1  1  1  1  1  2  3  1  1  1  1  1
    2         1  1  1  1  1  1  2  1  1  1  1  2  1
    3         1  1  1  1  1  1  2  1  1  1  1  2  1
    4         1  1  1  1  1  1  2  1  1  1  1  2  1
             bas N4: 5, 14, 2, 3, 1; N5: 4, 9, 10, 10, 8 (var 14, 14, 14, 14, 14 och 17, 17, 14, 14, 14)

Slutet av Vikingavägen kostar mer än förut för båda: dag 5 var den lätta avslutningen (14 till 17 kvar), nu är den tät (4 till 10). Ett speltest får visa om skogsvägen bakom linjen känns rättvis; den syns från dag 4:s intro och INTEL ("south").

Mölnbo: inget i Mölnbo ändrat, men ankomsten (src/data/arrival.js, skilled seed 0) är omräknad. Truppen är något svagare (Ksp 88 och Ak 5 nivå 1, två Ksp 58 nivå 2, färre forskningar: wireTough.1 och budget.2 saknas).

    mbSmart  alla dagar på första försöket; bas dag 3: 18, 20, 12, 12, 20 (var 20, 20, 9, 20, 20); dag 4: 19, 20, 20, 20, 20;
             dag 5: 15, 9, 12, 7, 15 (var 14, 15, 10, 13, 15)
    naive    dag 4 på andra försöket i två seeds (var första i alla), bas dag 4: 2, 11, 7, 4, 4; dag 5: 9, 6, 11, 2, 3

Mölnbo-ombygget (parallell gren) behöver räkna om ankomsten och sina fingeravtryck efter sammanslagningen.

Fingeravtrycken, alla nya avsiktligt utom E4 dag 1 och 2:
- skilled: riksvagen 3 68ec2156, gnesta 1 d96cbf0f, gnesta 2 5f4a1c00, gnesta 3 80c5a52c, gnesta 4 e92cbac4, gnesta 5 7f63db14, gnesta-norr 1 51c1bd54, gnesta-norr 2 e11d5c87, gnesta-norr 3 121f1e3b, gnesta-norr 4 7de0a2a9, gnesta-norr 5 1acdea9f
- normal: riksvagen 3 68ec2156, gnesta 1 fd3928f0, gnesta 2 e241945c, gnesta 3 36ccafe6, gnesta 4 6d5430d7, gnesta 5 74f7cd97, gnesta-norr 1 b09c19db, gnesta-norr 2 8a2bce69, gnesta-norr 3 f7edf9aa, gnesta-norr 4 c16098c9, gnesta-norr 5 cac14819
- mbSmart: f2206923, 93f0f3c1, 302de2ca, f8da80b0, d3449bdf; naive: bf232dc6, 9d10cad9, 1d769ec2, aaf25304, cc8a9d61
- simuleringens kvitto (tests/sim-receipt.test.js) oförändrat

## Mölnbo 0.20.0: kartan efter satellitbilden och tre dagar efter kampanjbågen

Kartan är omritad (en bro, vägnätet efter satellitbilden, Folkets hus vid Kvarnvägen) och dagarna är nya, så alla tre fingeravtrycken är nya avsiktligt. Sammanslagen med riktningarna och laddtiden; ankomsten (src/data/arrival.js) är riktningarnas, oförändrad av Mölnbo-ombygget.

Spelarna:
- mbSmart som förut, plus evakueringens karta dag 1 (evacMap) och vägrutorna norr om spåret som tyngd dag 1 (focus). Spärren ligger på Stenbyvägen vid Missionskyrkan (horden går runt via Trollvägen); gångbrons spärr finns inte längre.
- mbNaive (ny): naive som följer evakueringens tips dag 1. Utan tipsen dog de civila uppe vid Järna-vägen och dag 1 förlorades varje gång; spelet visar farozonerna och platserna, så den spelaren är den som räknas. Dag 1 ställer också han sig norr om bron.
- Pendeltågets reaktion: kartläsaren flyttar en grupp till korsningen vid brons södra fot (trappan går nu upp på vägbron).

Värden och skäl:
- Dag 1: hp 16, evakueringen 24 civila i sex hus, need 19. Husen går i ordning från Norrängsvägen och väg 57 (längst upp, innan horden är där) till Skogstorpsvägen; i omvänd ordning dog de civila i hordens väg. Första vågen 2 s efter start (dimprovet: den första ur diset inom 10 s). Med need 20 kom kartläsaren in med exakt 20 i tre seeds.
- Dag 2: hp 13 (prövat 20, 16, 15: den som aldrig spärrar fastnade på dag 2 i en seed, och basen var 9 till 10 vid tågets signal), sista vågen mindre (52 vandrare i stället för 70).
- Dag 3: hp 10 och våg 2 till 4 mindre (prövat 18, 16, 14, 13, 12, 11: den som aldrig spärrar dog runt 300 s, strax före klockan, i alla eller de flesta seeds; vid 16 vann han direkt med debugReach-truppen men inte efter dag 2:s trötthet). Flodvågen 112 (förut 228; med vågornas rester blev det 351 levande).
- Toppen och vågorna räknas inte under uttåget (balance.mjs, slice1-check.mjs): flodvågen är ett manus efter striden.

Mätt (fem seeds), försök per dag och bas kvar:

    mbSmart  alla dagar på första försöket; dag 1 civila över 21 till 23; bas dag 2: 18, 20, 20, 20, 20; dag 3: 20 i alla
    mbNaive  alla dagar på första försöket; dag 1 civila 21 till 24; bas dag 2: 16, 11, 17, 17, 17; dag 3: 10, 20, 8, 14, 6
    toppen   116 levande, högst två vågor ute

Kartläsaren vinner för lätt (basen hel dag 3); det är ett känt glapp mellan spelarna på den här kartan: Stenbyvägen och Trollvägen är nästan lika långa, så en spärr leder om horden utan omväg, och kartläsaren ställer allt längs den väg han valt. Den som inte spärrar betalar dag 2 och 3. Ett speltest får visa om dag 3 behöver mer tryck för den som läser kartan.

Fingeravtrycken: mbSmart 3eb447c8, c6df086e, a987d15d; mbNaive c395415f, 724a4294, 8c95da16.

Andra prov som ändrades med kartan (inte balans): bilspärren i tests/shove.test.js ligger på Kvarnvägen med gruppen söderifrån (vid Missionskyrkan finns nu en lika kort väg runt), snubblets prov mäter dag 2 och tillåter upp till 0,36 (vägen från Järna är längre, fler meter att snubbla på), svansens bjässar får 200 s (cirka 180 med svansen).

## Mölnbo 0.20.1: speltestet av 0.20.0

Dag 1 och 2 nya, dag 3 ny; alla tre fingeravtrycken nya avsiktligt.

- Dag 1: husen i omvänd ordning, närmast bron först (speltestet: de första husen låg på väg 57 där horden kom in). Kartläsaren och den som aldrig spärrar får 20 till 23 över (need 19).
- Dag 2: overlap 50 till 30 s och overlapMin 0,4 till 0,3 (nästa våg tidigare), svansen n 8, after 6 s, mul 4 (dayCfg.tail), hp 13 till 12. Prövat: fortare takt (dayCfg.pace 1,45, hp 10) gav samma längd men fler dubbla snubbel; hp 10 utan takt gjorde dagen för lätt för den som aldrig spärrar (snittbas 14,2). Längd 1x: mbSmart 392 till 412 s, mbNaive 471 till 554 s (var 515 till 612). Basen: mbSmart 19 till 20, mbNaive 13 till 17.
- Dag 3: flodvågen 207 (var 112), vågornas rester tas bort vid uttåget, bilden tonar ut tidigast 18 s in. Ingen påverkan på strid före klockan. Toppen räknas inte under uttåget.
- Vikingavägen dag 4 (speltestet, fynd 5): npm run balance på 0.20.1: skilled vinner N4 på första försöket i alla seeds (bas seed 0: 4), normal inom 1 till 2. Ingen ändring; skillnaden mot speltestet är Quick jump-truppen (todo H526).

    mbSmart  alla dagar första försöket; civila dag 1: 20 till 22; bas dag 2: 19, 20, 20, 20, 20; dag 3: 20
    mbNaive  alla dagar första försöket; civila dag 1: 20 till 23; bas dag 2: 15, 13, 16, 13, 17; dag 3: 10, 20, 8, 14, 6

Fingeravtrycken: mbSmart a1c2727c, 5ded47d4, a68be77c; mbNaive c7e13ad7, d3390930, edc96eaf.
Snubblet (tests/stumble.test.js): dag 2 med tidigare vågor 6 av 52 två gånger, gränsen 12 % (todo H528).

## Mölnbo 0.21.3: vägnätet och trapporna efter Olas bilder (H532)

Alla tre fingeravtrycken nya avsiktligt (sammanslagen med master 0.21.2; ankomsten oförändrad).

- Vägnätet: horden österifrån (S2) går nu Fagernäsvägens båge i diset och Dvärgvägen mot Folkets hus (förut längs spåret till korsningen vid caféet). Gruppen söderifrån (S4) kommer på Kvarnvägen. Trapptornen är ett vilplan i däckets höjd (prickskytt) med lopp ner till södra perrongen.
- Dag 2 blev åtta minuter för kartläsaren (456 till 486 s): bjässarna i sista vågen gick från Norrängsvägen, den längsta vägen, i bjässens fart. Nu i tredje vågen från väg 57, och overlap 30 till 20 s. Längd 1x: mbSmart 406 till 413 s, mbNaive 432 till 443 s.
- Dag 3 hp 10 till 12: med nya vägarna blev dag 3 lättare för den som aldrig spärrar (snittbas 14,8). Nu 10,6.

    mbSmart  alla dagar första försöket; civila dag 1: 20 till 22; bas dag 2 och 3: 20
    mbNaive  alla dagar första försöket; civila dag 1: 20; bas dag 2: 8, 13, 17, 17, 12; dag 3: 15, 2, 11, 14, 11
    toppen   123 levande, högst två vågor ute

Fingeravtrycken: mbSmart 8825ffd1, 6cf643e4, 68cbbdd9; mbNaive c9feaad2, 49010fe3, 2ae5842b.
Snubblet (tests/stumble.test.js): provet går nu högst 600 s (med god mode stod de kvar och snubblade vid dörren efter att dagen i spel varit slut); andelen 22 av 52, gränsen 0,45 (H528).

Tillägg (H538, samma version): dag 2 bara från Järnasidan. Gruppen söderifrån (14 vandrare på Kvarnvägen) ersatt av ett utbrott i en villa vid Trollvägen i tredje vågen (6 vandrare, 6 s in; med 10 fick den som aldrig spärrar 3 till 5 kvar och förlorade två gånger). Bas dag 2: mbSmart 20 i alla seeds, 401 till 410 s; mbNaive 3 till 8 (seed 0 på andra försöket), 391 till 445 s. Dag 3 orörd i data, ny i fingeravtrycket genom truppen efter dag 2: mbNaive 15, 2, 11, 14, 13.
Fingeravtrycken: mbSmart 8825ffd1, 0b8451cf, b1d3eefb; mbNaive c9feaad2, bade259c, dd0727a8.

Tillägg (H540, H541, samma version): stigarna och bergväggen. Bergväggen skymmer inte längre (förut stenblock som en byggnad 3,2 m söder om Fagernäsvägen), och den som aldrig spärrar fick hela basen dag 2 och 3 (20 i alla seeds med hp 12). Prövat: hp 16/16 (bas 13 till 20), 20/22 (dag 3 snitt 14,4). Valt dag 2 hp 20, dag 3 hp 27.

    mbSmart  alla dagar första försöket; bas dag 2: 17, 18, 18, 18, 19 (421 till 441 s); dag 3: 20
    mbNaive  alla dagar första försöket; bas dag 2: 13, 19, 13, 13, 8 (396 till 426 s); dag 3: 9, 11, 6, 10, 6
    toppen   137 levande, högst två vågor ute

Kartläsaren tar nu dag 2 på cirka sju minuter (provet tillåter 450 s). Spärren vid kyrkan ger ingen omväg (Trollvägen är lika lång); spärren vid caféet ger 46 rutor (tests/molnbo.test.js).
Fingeravtrycken: mbSmart 8825ffd1, 6beb5b36, a9a37bd9; mbNaive c9feaad2, 7c19cc08, 6b81a740.

## 0.22.0: Hagstumosse efter kampanjbågen (H539)

Kampanjplanen avsnitt 10: Hagstumosse är kampanjens dag 4 till 7. Ishallen har tre dagar (förut fem), Vikingavägen en (förut fem). Mölnbo dag 1 är dag 8. Alla fingeravtryck från Ishallen dag 3 och framåt är nya avsiktligt; E4 och Ishallen dag 1 och 2 är orörda för den normala spelaren och den skickliga.

**Ishallen dag 3:** de första bjässarna, tre nerför Norra vägen 14 s in i sista vågen (förut Ishallen dag 4). Next wave med bonus kommer här (förut dag 5), så den skickliga kallar tidigt redan dag 3.

**Vikingavägen:** gamla dag 5 ("Hela stan", väst, syd och nord) utan kryparna (de kommer på Mölnbo dag 2) och med gruppen västerifrån i sista vågen 15 till 30: 428 i vågorna plus de vilande husen, mer än någon av de gamla dagarna. Truppen är tio enheter, nio får stå ute (förut 14 till 16 på dag 5): de frivilliga, Hemvärnets två Ksp 90 och grupp, leveransens Ksp 58, Ksp 88 och pillbox, och en Ksp 58 till som RP räcker till. Prövat hp: 5 (den skickliga förlorade första försöket i alla seeds, normal vann på andra med 1 kvar), 4,5 (båda förlorade första), 4 (skilled förlorade en seed), 3,5 och 3,75 (alla på första). Valt 3,75. Dagen tar 11 minuter i 1x för båda (658 till 687 s; provet tillåter 780), toppen 186 levande.

**Mölnbo:** truppen från Hagstumosse är 10 enheter (förut 19) med fem veteraner (förut 14) och utan Psg 90 II. Med den gamla balansen (dag 2 hp 20, dag 3 hp 27) förlorade båda spelarna dag 2 i varje försök. Tre saker:
- Ledningens leverans till Mölnbo dag 1 är större: två Psg 90 på nivå II, två Ksp 58 på nivå III och infanteriet på nivå II (förut en Psg 90), och nivåerna Psg 90 II, Ksp 90 rate I, granater II och Hemvärnets gevär II som spelaren köpte förut. Dag 2 en Ksp 90 på nivå II med Hemvärnet. Uppgraderingarna som kom på Vikingavägen dag 2 till 5 är fördelade på Mölnbos tre dagar. Utan Psg 90 II gratis räckte RP inte till lagrets tredje Psg 90 och kartläsarens dag 2 blev 3 till 19 över seeds; med en Ksp 58 på nivå II i stället för två på nivå III höll inte Quick jump-truppen dag 3.
- Dag 2 hp 20 till 15 och dag 3 27 till 25 (src/data/molnbo.js, två rader). Prövat dag 2: 12, 13, 14, 15, 16, 17, 20; dag 3: 18, 20, 22, 23, 25, 25,5, 26, 27. Dag 3 är ett stup: Quick jump-truppen utan handpåläggning (scripts/slice1-check.mjs molnbo) håller klockan med 6 kvar på 25 men faller 13 s före klockan på 25,5; den som aldrig spärrar får 11,6 i snitt på 26 och 12,6 på 25. Provet för dag 3 säger högst 13 (förut 12).
- Quick jump till dag 2 och 3 har nu kartläsarens trupp den dagen (src/data/arrival.js ARRIVAL_TROOP.molnbo.days, scripts/balance.mjs molnboDayTroop), med förrådets köp och vinsterna dagarna före (utvilad: med tröttheten låg en TIRED-lapp under minikartan i 1024 px). Förut fick hoppet dag 1:s ankomst. Dag 2:s trupp rättade också layoutprovet i 1024 px: med dag 1:s ankomst stod nio kort i köpraden på två rader, och nästa grupps skylt fick ingen fri plats medan perrongens bildtext syntes.

    skilled  alla dagar första försöket; Ishallen dag 3 bas 10 till 15, Vikingavägen 5 till 9
    normal   alla dagar första försöket; Ishallen dag 3 bas 10 till 11, Vikingavägen 7 till 11
    mbSmart  alla dagar första försöket; dag 2 bas 18 till 19 (437 till 446 s), dag 3 9 till 20
    mbNaive  alla dagar första försöket; dag 2 bas 13 till 18, dag 3 11 till 14 (snitt 12,6)
    slice1   Quick jump Mölnbo dag 1 20 kvar, dag 2 14, dag 3 20 (klockan hålls)
    toppen   186 levande (Vikingavägen), högst två vågor ute

Proven: den normala spelaren ska klara varje dag inom 1 till 3 försök (förut 4, Olas mål för bågen). Kravet på minst två förlorade försök per seed är borttaget: med sju dagar fram till Mölnbo förlorar den normala policyn inte längre någon dag. Det är en öppen fråga om dagarna nu är för lätta för en ny spelare; policyn lägger spärren som lektionen säger, vilket en förstagångsspelare inte alltid gör. Den skickligas krav på dagar med skada är fyra per seed (förut fem).

Fingeravtrycken:
- normal: gnesta 3 7a23499b, gnesta-norr 1 986341cb (övriga oförändrade)
- skilled: gnesta 3 c772668d, gnesta-norr 1 795bf800 (övriga oförändrade)
- mbSmart bd69454f, e33f91c4, d496490c; mbNaive 8bae3ad7, 6d627559, 429ae660
- simuleringens kvitto: Gnesta South day 3 63fd5a37 (bjässarna; den fasta styrkan vinner med full bas), Gnesta North day 1 4393a798 (förut day 2 dabfdccd; förlorar i första vågen som förut)

## Björnlunda 0.23.0: sektorn efter Mölnbo (H545)

Kampanjplanen avsnitt 10: Björnlunda är kampanjens dag 11 (försvar från väst) och 12 (evakuering och försvar från väst och syd). Basen Wattrangsborg i byns sydöstra hörn. Spelaren kommer från Mölnbo med det kartläsaren har efter uttåget (`bjornlundaArrival`: `molnboCampaign('mbSmart')`), 18 enheter plus byns två grupper jägare (leveransen bl-1); tio får stå ute. `npm run balance -- bjornlunda`.

**Spelarna.** blSkilled läser kartan: dag 1 möter den horden tidigt på gatorna (planens `near` -0,3), dag 2 håller den förbifarten öster om byn som en egen flank (`focus` x > 30, vikt 2) och linjen närmare basen (`near` 0,3), och täcker de civilas väg (evacMap). blNormal är `normal` med evakueringens tips. Mätt: den vanliga `skilled` (förnödenheterna och djupets verb fullt ut, garnisonen och sikta på de starkaste) förlorade dag 1 i fyra av fem seeds där `normal` vann; utan förnödenheterna vann den alla, med bemanna igen i stället för hela djupet likaså. Med samma trupp kostar ammunitionen och sandsäckarna här mer än de ger, och planens `lastLine` (linjen framför basen) lät horden från fyra håll komma fram samtidigt. Kartläsaren här köper inte förnödenheterna och bemannar tysta pjäser igen.

**Banan.** Vägarna in är långa (191 till 262 rutor, Mölnbo 56 till 206), så `pace` 1,5 (Mölnbo 1,15) och `overlap` 20 s. Med 1,15 tog dag 1 elva minuter. Spärrar styr knappt här: tre parallella gator (Stationsvägen, Smedjevägen, Villavägen) och stigarna gör att en spärr ger 0 till 34 rutors omväg, så kartläsaren spärrar inte (BL_BLOCKS tom). En spärrad Villavägen skickar väg 57/223 över stigen vid ICA och Korsbacksvägen över stigen i norr (provet).

**Dag 1:** hp prövat 8, 9, 10, 11, 12, 14. Stupet ligger mellan 11 och 12 (alla förlorar på 12). På 10 vinner kartläsaren alla fem seeds direkt, den vanliga spelaren fyra direkt och en på andra försöket i provkörningen utan rekvisition mellan försöken; med kampanjens rekvisition alla direkt.

**Dag 2:** hp prövat 7, 8, 11. På 11 förlorar alla. På 8 förlorade båda spelarna enstaka seeds i tredje och fjärde vågen: allt kommer samtidigt (sista vågen från fem ingångar) och förbifarten (väg 57/223) står obevakad. Sista vågen lättad (walkers 36 och 30 till 30 och 26, löparna Korsbacksvägen i stället för väg 57/223, de pansrade längs spåret), hp 7, need 18 av 24 (kartläsaren tappar fyra i varje seed, den vanliga noll till två).

    blSkilled  båda dagarna första försöket; dag 1 bas 15 till 19 (496 till 512 s), dag 2 bas 14 till 18 (491 till 498 s), civila 20 av 24
    blNormal   båda dagarna första försöket; dag 1 bas 6 till 15 (524 till 557 s), dag 2 bas 1 till 19 (424 till 487 s), civila 22 till 24
    toppen     119 levande, högst två vågor ute

Dagarna är långa (åtta till nio minuter); provet tillåter tio. Kortare vägar kräver en mindre spelyta (förhandsvisningens CRISP) och ingick inte.

Fingeravtrycken: blSkilled 0f487cd8, a685d10a; blNormal b01f7c53, dcfb02cd. Quick jump-truppen (src/data/arrival.js ARRIVAL_TROOP.bjornlunda, dag 2 `bjornlundaDayTroop`). Mölnbos fingeravtryck är oförändrade.
## 0.22.1: förnödenheterna dag 7 och 8 (speltestet av 0.22.0, fynd 5)

Testaren hade 2 412 och 2 537 $ över på Vikingavägen. Förnödenheterna per dödad: Vikingavägen bounty 0,25 (var 1), Mölnbo dag 1 bounty 0,5 (var 1).

    Vikingavägen  skilled 374 till 382 $ över (var 2 102), normal 537 till 622 (var 2 367); utfallen oförändrade (seed 0 till 2)
    Mölnbo dag 1  mbSmart 99 $ över (var 107), mbNaive 469 (var 717); utfallen oförändrade

Fingeravtrycken: Hagstumosse oförändrade (överskottet räknas inte in). mbSmart nya avsiktligt: 5dfecc8d, d825f47f, 6b02e86f (samma baser och försök, sekunder skiljer). mbNaive oförändrade.
