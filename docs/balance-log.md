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
