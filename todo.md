# Horde todo

Format: `- [ ] id | område | sak`. Bocka av med [x] när det är gjort.

- [ ] H001 | balans | Dag 1 och 2 är för lätta, basen tar aldrig skada i speltesterna. Höj trycket utan att tappa lärandet.
- [ ] H002 | balans | Dag 3 har ett smalt fönster, bjässarnas hp avgör mycket. Speltesta med Ola.
- [ ] H003 | prestanda | M2 nivå 3 är 120 meshar. Slå ihop sandsäckarna (mål 60). Mät på Retina.
- [ ] H004 | ux | Panelens placering är bara testad på 1400x900 och 1100x720, inte mobilbredd.
- [ ] H005 | ux | Ingen väg tillbaka till menyn från intro eller mitt i en dag.
- [ ] H006 | grafik | Bjässar som bara tar 40 % av taggtrådens bromsning syns inte i grafiken.
- [ ] H007 | innehåll | Fler banor: Bensinmacken, Bron, Köpcentret, Hamnen (se design).
- [ ] H008 | innehåll | Sena vapen: Barrett M82, Mk 19, granatkastare 81 mm, Carl-Gustaf, Minigun. (0.8.0: svenska arsenalen i stället; Ksp 58, Ak 5 + granattillsats och Psg 90 gjorda, svenska motsvarigheter till resten kvar att välja.)
- [ ] H009 | innehåll | Fler zombietyper: krypare, bepansrad, uppsvälld, skrikare.
- [x] H010 | ljud | Ingen ljudsättning ännu. (0.7.0: syntetiserat ljud och musik, ljudbord i soundboard.html)
- [ ] H011 | publicering | Inget GitHub-repo. Fråga Ola innan något läggs ut.

## Olas feedback efter genomspelning 2026-10-15

- [x] H012 | grafik | Hälsoring under varje zombie (töms när den tar skada).
- [x] H013 | språk | Spelet på engelska, bara ett språk. Bana 1 heter E4 (Olas beslut 2026-10-15).
- [x] H014 | grafik | Mindre tecknat: zombier med verkliga proportioner.
- [x] H015 | forskning | Mer forskning i nivåer (t.ex. M249 I-II-III), så det alltid finns något nytt att ta fram.
- [x] H016 | vapen | Handgranater: värnen kastar automatiskt när zombier kommer nära (uppgradering/forskning, Olas beslut).
- [ ] H017 | banor | Från bana/dag 4: kameran zoomar ut ett steg, längre väg in, fler positioner.
- [x] H018 | banor | Zombier från flera håll och längs olika vägar.
- [x] H019 | banor | Barrikadera för att styra horden (rutnät + vägsökning, alltid minst en väg öppen).
- [x] H020 | banor | Bana 2 = Gnesta, Sigtunavägen: vi står vid rondellen utanför ishallen, horden kommer från öster, husen tvingar dem längs gatorna, barrikader styr. Moderna hela hus, inte postapokalyptiskt ännu.
- [ ] H021 | banor | Senare: binda ihop banorna (E4 och Gnesta) när kameran zoomat ut mer.
- [x] H022 | spel | Next wave-knapp + nedräkning (5 s efter klar våg) + bonus för tidigt kall (Olas idé 2026-10-15).
- [x] H023 | gnesta | Horden går bara på gator (tomter stängda). Barrikader fritt på gatornas rutnät, dyra att passera: horden går runt kvarteret, slår sig igenom närmaste om allt är stängt.
- [ ] H024 | gnesta | Vapenpositioner på tomter/i hus: skjuter, kastar granater, molotovs.
- [ ] H025 | gnesta | Senare överraskningar: nya spawns från annat håll; zombier bryter igenom en tomt/ett hus och skapar ny väg.

## Olas önskemål under 0.3.0

- [x] H026 | spel | Fart i tre steg (1x, 2x, 3x) med F.
- [x] H027 | grafik | Zombierna ryckigare och obehagligare (bara bild).
- [x] H028 | balans | Taggtråden biter för lite på dag 1 och 2.
- [ ] H029 | ux | Speltesta att granatlådans pris ($ 200) och nedräkningens bonus ($ 5 per sekund) känns rätt i händerna.

- [ ] H049 | verktyg | Ta bort horde/horde-gnesta ur nexus/.claude/launch.json när spelet körs från egna sessioner i ~/Projects/horde.

## Efter Gnesta 0.4.0

- [x] H045 | balans | Gnesta dag 1 till 5: balanspass med skriptet (policy som spärrar gator, flera ingångar). Siffrorna i 0.4.0 är första gissningar.
- [x] H046 | prestanda | Gnesta dag 5 har vågor på 200 zombier: instansera zombiernas kroppsdelar innan balansen (16 meshar per zombie i dag).
- [x] H047 | grafik | Horden går gärna i ett led längs ena trottoaren på Gnesta. Sprida ut den över gatans bredd.
- [x] H048 | ux | En spärr tvärs över Sigtunavägen kostar 4 x $ 150. Nu ett fast pris per spärr ($ 150), 0.4.2.
- [ ] H034 | balans | Gnesta: speltesta dag 5 (smal, 2 till 5 kvar för policyn) och om hp-faktorn känns rätt i händerna. (0.8.0: forskningen räcker nu förbi dag 5, 1780 poäng kvar efter dag 5; speltestet kvar.)
- [x] H042 | spel | Fri placering av vapen med siktlinjer (hus skymmer), placeringsläge med spöke och sikt, More positions I-III (0.5.0).
- [ ] H043 | balans | Gnesta dag 3: naive vinner med full bas medan smart förlorar första försöket. Speltesta om spärren vid rondellen är rätt när skogsvägen öppnar.
- [ ] H044 | ux | Placeringsläget är bara testat headless på 1400x900, inte på mobilbredd eller med pekskärm.
- [ ] H035 | publicering | GitHub Pages: JA (Olas beslut 2026-10-15). Repo + Pages efter sammanslagningen.
- [x] H036 | grafik | Rensa runt utplacerade pjäser: häckar huggs ner, staket rivs, bilar knuffas undan/trashas, stubbar. Ska se ut som en befäst position man byggt (gjort i 0.6.0).
- [x] H037 | ux | Ett enda köpflöde: välj först vad du köper (snabbval 1-0), saken följer muspekaren tills du klickar ut den där den får stå. Gäller vapen, barrikader och taggtråd. Klick på gata/ruta öppnar inte längre en köppanel (gjort i 0.6.0).
- [x] H038 | ux | Tydligt vad man har råd med: allt man inte har råd med just nu är gråat (gjort i 0.6.0).
- [x] H039 | gnesta | Basen = ishallens entré (överlevare inne i hallen), inte mitt i rondellen. Rondellen blir sista försvarslinjen framför porten; skadeeffekter på hallens fasad/port (gjort i 0.6.0).
- [x] H040 | gnesta | Söder om rondellen är det en stor parkering (och Gnesta sporthall), inte skog (gjort i 0.4.0).
- [x] H041 | gnesta | Ytterkanterna: dimma med skissiga spökhus; bara den aktiva kartan är skarp (gjort i 0.4.0). Grund för att expandera kartan senare.

## Arsenalen 0.8.0

- [ ] H050 | balans | Speltesta Psg 90 på taken: är 4 m död vinkel runt det egna huset rätt, och syns skytten tillräckligt på taket i spelets zoom?
- [ ] H051 | balans | Ksp 58 kommer sällan ut i policyn (platserna är fulla när den forskas). Speltesta om den behövs tidigare eller billigare.
- [ ] H052 | ljud | Ola väljer springarskrik A eller B i ljudbordet; B blir standard om han vill.
- [ ] H053 | ux | Köpraden med sju kort är bara testad headless på 1440x900; smal skärm och pekskärm kvar. (0.9.0: åtta kort, smalare, en rad i 1440 px.)

## Hemvärnet 0.9.0

- [x] H054 | balans | Hemvärnet är svagt på Gnesta (hp-faktorn och Faster Ksp 90): policyerna köper det bara på E4 dag 1. Speltesta om gruppen behöver forskning (bättre ammunition, fem man från början) eller lägre pris. (0.10.0: forskningen Better rifles I-III, Bigger squad I-II, Hemvärnet veterans I-II; priset oförändrat. Gnesta Norr-policyn använder gruppen alla dagar.)
- [ ] H055 | ux | Speltesta skyddsvalet: väljer gruppen platser som känns rätt (husknut, bil, häck, dike) i händerna, och syns soldaterna i Gnestas zoom bakom häckarna?
- [ ] H056 | grafik | Dikena på E4 och vid skogsvägen syns inte i marken; soldaterna ligger i vägrenen. Rita ett grunt dike om det behövs.
- [ ] H057 | spel | Soldaterna flyttar inte under dagen (beslut i src/sim/squad.js). Pröva om en soldat ska byta ruta när zombier når honom.

## Gnesta Norr 0.10.0

- [x] H058 | balans | Speltesta Gnesta Norr: dag 3 till 5 tar cirka 1000 s speltid och hp-faktorn är 7 till 9 (bjässarna blir mycket sega). Kortare vägar in eller färre men tuffare vågor? (0.10.1: takt 1,25, överlapp, hp 2,8 till 5,0, dagarna 4 till 7,5 minuter. Speltest i händerna kvar.)
- [ ] H059 | balans | Gnesta Norrs kurva har klippor i både hp och pengar (docs/balance-log.md 0.10.0). Speltesta dag 4 och 5 i händerna.
- [ ] H060 | gnesta-norr | De östligaste radhusen vid Östra Storgatan och garagelängorna finns inte än (spökhusen inne i spelytan togs bort). Lägg till som riktiga längor om det behövs.
- [x] H061 | sim | Fil-vakten (laneGuard i src/sim/route.js) gäller bara Gnesta Norr. Pröva den på Gnesta och E4 med nya kvitton. (0.10.1: global på alla rutnät, E4 har inget rutnät; prov tests/stuck.test.js.)
- [ ] H062 | ux | Valsvägen och Hambovägen är återvändsgator som horden aldrig använder. Speltesta om de ska få en roll (t.ex. en ingång senare).
- [ ] H063 | grafik | Radhusens framsida ligger i skugga under takfoten i spelets ljus; de vita dörrarna syns som grå. Pröva lite ljusare eller kortare takfot.
- [ ] H064 | balans | Gnesta Norr för den som köper Hemvärnet varje dag och forskar i gruppen först: dag 1 till 3 går, dag 4 förloras i alla sex försök (Östra Storgatan bakom linjen, köerna vid dörrarna når ingen). Ge gruppen något pjäserna inte har (granskningen av 0.10, Balance recommendations 1).
- [ ] H065 | balans | Klipporna i hp finns kvar men är mjukare: Gnesta Norr dag 3 vinns vid 3,9 och förloras vid 4,2 (docs/balance-log.md 0.10.1). Flytta tryck från hp till sammansättning före 0.11.
- [ ] H066 | ux | Speltesta 0.10.1 i händerna: ny spelare på Gnesta dag 1 (?debug&fresh), dörrarna, överlappet på Gnesta Norr och den nya köpraden.
- [ ] H070 | vapen | Svenska försvarets arsenal med svenska namn: Ksp 90, Ksp 88, Ksp 58, Ak 5 + granattillsats, Psg 90 (även på hustak), senare Ag 90, Grg m/48, Pskott 86 (pågår, 0.8.0).
- [ ] H071 | enheter | Hemvärnet som grupp (inte "milis"): släpps på en plats, varje soldat tar själv skydd i terrängen (husknut, bil, häck, dike) med egen sikt, knä/liggande. Close Combat-känsla (Olas önskan 2026-10-15).
- [ ] H072 | enheter | Senare: civila frivilliga (jaktgevär, hagel), billiga och svaga; en bana med bara civila innan militären kommer.
- [ ] H073 | banor | Gnesta Norr: Fornminnesvägen + Vikingavägen, horden norrifrån (Dansutvägen), radhuslängor i gult tegel + mörkbrun panel, basen kvar vid ishallen. Referenser lokalt i ~/Projects/horde-refs/gnesta-norr/.
- [ ] H074 | ljud | Skrikvariant B (lägre, hesare) att jämföra med; nuvarande skrik är standard (Ola: funkar bättre i livespelet).

## Speltestet av 0.10.1 (0.10.2)

- [x] H075 | balans | Gnesta dag 2 en vägg (bas 20 till 2 i våg 1): hp 5,0, mindre vågor, norra gruppen senare. Naive klarar våg 1 utan skada.
- [x] H076 | ux | "They come from here" visar vågens ingångar där vägen kommer in i bild, och "Next group · <ingång>".
- [x] H077 | grafik | Hordens väg som roströda pilar mot basen i stället för vita streck (lik vägmarkering). R kvar.
- [x] H078 | tempo | Första skottet 15 till 20 s (försprång, group.lead), nedräkning 15 s, raden om överlapp på Gnesta Norr.
- [x] H079 | ux | Köpraden på en rad ned till 1024 px, tips minst 13 px, "DMG · RNG · RATE" på alla vapen, fartknappen synlig under vågen.
- [x] H080 | grafik | Hemvärnets ringar genom trädkronorna, Psg 90 på taket med signalduk och ring.
- [x] H081 | forskning | Psg 90 via Ksp 88 I för 180 (vägen 280, var 420), texter som följer siffrorna med prov.
- [x] H082 | debug | ?debug på Gnesta Norr: ankomsten för den som vinner varje dag direkt (20 nivåer, fem platser).
- [x] H083 | balans | (0.11.0: öppningen söderifrån ger första skottet 11 till 13 s alla dagar.) Gnesta Norr dag 2 till 5 har fortfarande första skottet efter 30 till 42 s; försprång där gav klippor i policyn (docs/balance-log.md 0.10.2). Speltesta i händerna.
- [ ] H084 | balans | ?debug-ankomsten på Gnesta Norr har ändå Ksp 58 I och Ak 5 I: forskningen fram till Gnesta dag 5 räcker till alla vapen (ca 2 000 poäng). Ska den snålas in krävs ett beslut om forskningstakten.
- [ ] H085 | ux | Speltesta 0.10.2 i händerna: Gnesta dag 2, pilarna och nästa grupp, köpraden vid 1024 px.


## Efter speltest 0.10.2 (2026-10-16)
- [x] H090 | balans | Gnesta dag 2: en grupp tar en inre gata mellan villorna som inte syns före vågen; förhandsvisa varje grupps väg innan vågen.
- [x] H091 | ux | Ingångsetiketter hamnar på hustak eller fel plats; placera dem på gatan vid kartkanten.
- [x] H092 | ux | Ingen ledtråd om R (hordens väg); visa i HUD eller dagintro.
- [x] H093 | tempo | Gnesta Norr: första skottet ~50 s och våg 2 startar innan våg 1 nått vapnen (se H083).
- [x] H094 | grafik | Räckviddsringen och Hemvärnets ringar ritas ovanpå hustak.
- [x] H095 | ux | Esc efter ett köp öppnar pausmenyn; "On the road"-texten ligger kvar.
- [x] H096 | ux | Statistiken på köpkorten syns bara vid hovring.
- [x] H097 | ux | Köpraden i kategorier med tvåstegs-snabbval: 1 Defenses (1-1 Barrier, 1-2 Wire, 1-3 Mines senare), 2 Units (2-1 Hemvärnet, 2-2 Ksp 90, 2-3 Ksp 88, 2-4 Ksp 58, 2-5 Ak 5 + Grt, 2-6 Psg 90). Olas förslag 2026-10-16, reviderat samma dag.
- [x] H098 | grafik | Även pjäserna (Ksp m.fl.) anpassar sig efter miljön: värnet byggs mot befintligt skydd (husknut, mur, häck, bil), sandsäckar bara där det saknas skydd, skytten i skydd, riktat mot hordens väg.
- [x] H099 | ux | Trupper bakom höga hus: diskret markör (silhuett genom vägg eller liten flagga) som bara syns när enheten är skymd, klickbar. Får inte förstöra det realistiska utseendet.
- [x] H100 | ux | Minimap i stil med militär karta/GPS: aktiva kartan, var horden spawnar, hur grupperna rör sig (prickar), pjäser, barrikader, kamerans ruta; klick flyttar kameran.
- [x] H101 | spel | Vilande zombier i hus: förvarnade i dagintrot ("Intel: dormant infected reported on <gata>"), huset svagt markerat, dörren slås upp och 3-5 Z väller ut i våg 1. Senare dagar kan ha ett oförvarnat hus.
- [x] H102 | spel | Flytta (Move) i stället för att bara sälja: nedmontering + förflyttning + uppställning tar tid (Ksp 88 ~15 s, Hemvärnet några s), skjuter inte under tiden, Hemvärnet sårbart på vägen. Befästningen blir kvar på gamla platsen. Uppgraderingar/granatkit följer med. Sälj finns kvar (60 %).
- [x] H103 | framtid | (0.14.0: leveranserna från Försvarsmakten och MCF i förrådet, src/data/depot.js) Kampanjen börjar med bara Hemvärnet; riktiga trupper låses upp successivt: infanteri (Ak 5-grupp), kulsprutegrupp, fallskärmsjägare senare, m.fl. Riktiga trupper som grupper med skydds-AI som Hemvärnet.
- [x] H104 | kampanj | E4 = militär vägspärr med riktiga trupper (smak på full kraft). Gnesta = bara Hemvärnet som successivt får bättre försvar. Övergångstext: "The roadblock at E4 has fallen silent. Gnesta has only its Home Guard."
- [x] H105 | kampanj | Gnesta dag 1: civila (jaktgevär, hagel) med uppdrag "Hold until the civilians reach the ice rink" (går att lyckas/misslyckas, kort). Hemvärnet tar över dag 2. (0.13.0: evakueringen, 13 av 20 in i ishallen)
- [x] H106 | vapen | Psg 90: inga tak-genomskärningar; placeras på riktiga utsiktspunkter (platta tak, nock vid skorsten, torn/höga byggnader) i rätt vinkel.
- [x] H107 | vapen | Sikt med höjd: varje byggnad har höjd, siktlinjen räknas i höjdled (enplansvilla ser över låga hus nära, tvåvåningsradhus skymmer; högt tak/torn ser mer).
- [x] H108 | vapen | Prickskyttens skjutsektor: kon 60-90° som väljs/vrids vid placering; belönar att ligga längst bort på en gata och sikta längs den.

## Efter 0.11.0
- [x] H110 | tempo | Gnesta South: policyns första skott 52 till 54 s sedan ingångarna flyttade ut i diset (vägen inne på kartan är längre). Speltesta om en spelare ställer en pjäs vid kartkanten, annars kortare väg in eller fler löpare först.
- [ ] H111 | gnesta-norr | Öppningen kommer från Sigtunavägen väster om ishallen (närmaste gata söderut som når ur diset). Ola: är det "söderifrån" nog, eller en ny gata söder om sporthallen?
- [ ] H112 | balans | Dagarna är 8 till 9 minuter på Gnesta South och upp till 9 på Gnesta North (öppningen och längre vägar in). Speltesta tempot.

## Speltestet av 0.11.0 (måste rättas före publicering)
- [x] H113 | placering | Skälet vid pekaren (inte uppe i mitten), spöket syns ovanpå taken, hitta orsaken till var tredje misslyckad placering, tråd och spärr går att lägga på grus- och cykelvägar. Prov.
- [x] H114 | barrikad | Barrikadens hälsa syns (liten stapel när den tagit skada, sprickor), "Barricade failing" vid låg hälsa med ping på minikartan, och den nya vägen blinkar när den går sönder.
- [x] H115 | gnesta-norr | Södra gruppen dyker upp mitt på kartan vid ishallen. Ingångarna ska ligga utanför den aktiva kartan; provet täcker varje bana, ingång och våg.
- [x] H116 | ux | Tvåstegsvalet: när en kategori är öppen väljer nästa siffra alltid en sak. Bara Esc eller klick utanför stänger; tidsgränsen är bara visuell. Provet uppdateras.
- [x] H117 | kamera | Zooma ut så långt att hela den aktiva kartan ryms på 1440x900.
- [x] H118 | balans | Gnesta dag 2 vinns av en vettig människa inom två försök: de vilande husen ger tidig action, dagen mjukare, och köp mitt i vågen går smidigt (pengar som inte går att använda).

## Speltestet av 0.12.0 (docs/playtests/2026-10-16-0.12.0.md)
- [x] H119 | balans | 5 av 5 platser och $ 900 till $ 1 150 över: Hemvärnet har eget tak (2 grupper, More squads ger 3 och 4), fem pjäser från början på Gnesta South och North, U på pjäsen under pekaren.
- [x] H120 | prickskytt | Psg 90 siktad på ishallens tak hamnade på marken: spöket snäpper till byggnadens utsiktspunkt, ROOF/GROUND vid pekaren, skälet för branta tak.
- [x] H121 | prickskytt | Sektorn ritas på marken (taken skymmer den); uppdragsrutan fälls ihop och viker undan med något i handen.
- [x] H122 | vilande | Pulserande röd ram runt dörr och fönster och ett "!" ovanför huset (den svaga tonen syntes inte på normal zoom). Minikartans ping kvar.
- [x] H123 | etiketter | Etiketterna undviker gränssnittet även vid kanten och tonas ned över pjäser; fast ordning walkers, runners, brutes.
- [x] H124 | ux | Esc gör ingenting på resultat- och introskylten (bara forskningen stängs). Prov.
- [x] H125 | ux | Resultatet säger "Earned N this attempt" (stod "You keep N" efter att poängen spenderats).
- [x] H126 | barrikad | Varningen räknas på spärrens svagaste ruta (summan hoppade upp när en ruta gick sönder, så den kom aldrig). Händelse i simuleringen, prov, verifierat i webbläsaren.
- [ ] H127 | balans | Speltesta Gnesta dag 2 och North dag 1 i normal takt (testarens panel gick i 0,3x). Policyn tjänar inget på den femte platsen (dag 4 smart 4 till 7 kvar, var 9 till 11): den sprider pengar på fler billiga pjäser.
- [ ] H128 | ux | Små fel från speltestet: scrollhjulet vrider sektorn bara ~2° per hack i panelen, zoomen går mot mitten i stället för pekaren, forskningsrutans stängknapp syns dåligt, ?debug erbjuder More positions I fast den redan är given, svag spöktext kvar efter vågbanderollen.
- [x] H130 | kampanj | E4 utan Hemvärnet: riktig militär (infanterigrupp med Ak 5 m.m.) i stället. Del av H104.
- [x] H131 | grafik | Soldater som "spinner" liggande: vridning runt höften med begränsad fart, krypande, skjutvinkel ~120°, blandade ställningar (huk/knä/liggande), tomgångsliv (andas, spanar, laddar om). Gjort i 0.12.2 (dubblett av H129).
- [x] H132 | vapen | Skjutvinkel per vapenklass: infanteri/Hemvärnet flexibelt (per soldat), Ksp 90 ~180° snabb, Ksp 58 ~120°, Ksp 88 ~90° långsam vridning, Psg 90 60-90°. Placering: klicka-och-dra för att sikta, vanligt klick = auto mot hordens väg; Rotate-knapp i panelen; Move väljer riktning på nytt.
- [x] H133 | vapen | Bunker med kulspruta: fast befästning, ~90° skottglugg, tålig, dyr, lång byggtid, går ej att flytta. Passar E4-vägspärren. (0.13.0: ersatt av EPA-pillboxen, H135)
- [x] H134 | spel | Riktig förflyttning: besättningen springer synligt med vapnet längs vägsökningen och är sårbar på vägen. Infanteri/Hemvärnet (senare insatsstyrka MP5) snabbt; Ksp 90-lag (skytt + ammunitionsbärare) packar på några s och springer; Ksp 58 tre man, långsammare; Ksp 88 monterad kan EJ flyttas (bara säljas); Psg 90 skytt + observatör smyger.
- [x] H135 | vapen | "Bunker" = improviserad pillbox: EPA-traktor/gammal bil med svetsade plåtar, skottgluggar och Ksp i luckan (rost, olikfärgad plåt, LGF-skylt kvar). Snabb att bygga, tålig, ~90° skottglugg; kan krypa långsamt till ny plats. Ersätter betongbunker i H133.
- [x] H136 | ux | M = Move; minikartan flyttar till Tab. Waypoints: klick = flytta direkt (kortaste väg), Shift-klick lägger till waypoints (linje syns), slutpunkt + klicka-och-dra för riktning. Framtid: eld under förflyttning, språng skydd till skydd. (0.13.0: M, Tab, waypoints och riktning gjorda; framtiden kvar som H150)

## Efter speltestet av 0.12.1

- [x] H140 | bugg | Upgrade grå med pengar nog (Ksp 88, $ 450, $ 1 264): classList.toggle med undefined; skälet står nu på knappen (0.12.2).
- [x] H141 | banor | Gnesta North: en idé per dag, våg 1 från olika håll, lite svårare (0.12.2).
- [x] H129 | grafik | Hemvärnet "ligger och snurrar": vrider sig runt höften, båge 120 grader, överkropp före ben, variation, liv (0.12.2).
- [x] H142 | verktyg | Debugmeny: fem klick på versionen eller ?debug (0.12.2).
- [ ] H143 | balans | South dag 1 och E4 kändes för lätta i speltestet med mycket forskning. Inte ändrat i 0.12.2.
- [ ] H144 | balans | Speltesta North 0.12.2 i händerna: dag 3 (bjässar först) har en klippa i hp, dag 5 likaså (5,0 till 5,2).

## Efter kampanjpasset 0.13.0

- [ ] H150 | spel | Eld under förflyttning och språng från skydd till skydd (framtiden i H136).
- [ ] H151 | balans | Speltesta Gnesta dag 1 (de civila) i händerna: utan spärr dör de fort, policyn får in 16 av 20 med spärren vid rondellen. Ksp 88:s 90 grader är svag på stadsbanornas krokiga vägar (policyn köper Ksp 58 före den).
- [ ] H152 | ux | Speltesta dra-för-att-sikta, Rotate (R), Move (M) med Shift-waypoints och Tab för minikartan med mus och på pekskärm (bara provat headless).
- [ ] H153 | grafik | Laget som bär pjäsen och de civila på väg är små på normal zoom; överväg en tydligare markering medan de springer.

## Operation Södermanland 0.14.0

- [x] H160 | operation | Två valutor: RP mellan dagarna (avtagande efter tredje försöket, bonus för snabb seger, få förluster, oskadad bas) och förnödenheter i striden (hinder, skrotbilar, granatlådor, ammunition, sandsäckar).
- [x] H161 | operation | Förrådet ersätter forskningen: leveranser från Försvarsmakten och MCF, rekvisition per sektor, forskningens nivåer som uppgraderingar.
- [x] H162 | operation | Kärntrupper: följer med mellan dagarna, en stjärna efter tre vunna dagar, förluster bara vid vinst, påfyllnad och nivåer för RP, tillbaka till förrådet (50 %) och omplacering.
- [x] H163 | operation | Uppställningen före första vågen; köpraden har sedan bara förnödenheter.
- [x] H164 | operation | Operationskartan med sektorernas läge, tryck och inkorgen; flödet meny, karta, förråd, uppställning, strid, resultat, karta.
- [x] H165 | operation | Sparfil v4 med migrering och kopia av den gamla filen.
- [x] H166 | balans | Balansskriptet spelar hela kampanjen (skicklig och normal, fem seeds); fingeravtryck per kampanjsteg.
- [ ] H167 | balans | Speltesta frontbredden (E4 6, South 8, North 9): ny regel, inte i specen.
- [ ] H168 | balans | Gnesta North hp 7 / 4,4 / 4,4 / 7 / 12: bjässarna blir sega. Pröva fler zombier i stället för hp.
- [ ] H169 | balans | Gnesta South dag 3 till 5: den som spärrar vid rondellen vinner med full bas, den normala behöver tre försök. Speltesta gapet.
- [ ] H170 | ux | Speltesta operationskartan och förrådet i händerna (bara provat headless på 1200 x 760), och smal skärm.
- [ ] H171 | operation | Trycket märks bara när två sektorer är öppna (Gnesta North efter South dag 4). Fler sektorer (Mölnbo, Trosa, Nyköping) ger det mer att göra.
- [ ] H172 | operation | Kontrollera MCF:s namn mot en källa (Myndigheten för civilt försvar, ersatte MSB 2026-01-01) innan publicering.
- [ ] H173 | ux | Lookbook och gnesta.html visar inte skrotbilarna; lägg till dem.

## Efter speltest 0.14.1 (2026-10-16)
- [x] H174 | ux | Refill-köp krymper kortet så nästa klick missar; stabil layout i förrådet.
- [x] H175 | ux | "VICTORY" står bredvid "has fallen silent"; läses tvetydigt.
- [x] H176 | grafik | Civila och gula romber för små; "Civilian lost"-markör syns inte; ishallen ej i bild vid start på Gnesta dag 1.
- [x] H177 | balans | E4 dag 2 svänger för mycket (basen 17 till 0 på sekunder vs full bas med två uppgraderingar). Dag 3 våg 3: 82 fiender och $1 042 oanvända.
- [x] H178 | ux | "Outside arc"-flaggan är liten.
- [x] H179 | bugg | Minikartan visar förra försökets pjäser.
- [x] H180 | ux | Gnesta: ungefär hälften av placeringarna nekas (väg, hus, skog). Värst kvar. Tydligare var man FÅR stå (ljus markering av giltiga ytor när man håller en enhet).
- [x] H181 | grafik | De frivilliga syns knappt.
- [ ] H182 | balans | E4 dag 2: ett köp i förrådet ger fortfarande full bas (utan köp 7 till 9). Speltesta om steget känns rätt nu när en ny spelare vinner utan köp och förlusten tar över en minut.
- [ ] H183 | balans | South dag 2 kostar den skickliga inget längre (tre Ksp 90 efter E4:s fulla bas). Ta med i passet för North (H168).
- [ ] H184 | spel | Ett sätt att lägga förnödenheter mitt i striden (t.ex. laga spärren) i stället för att bara sänka överskottet. Bestäm med Ola först.
- [ ] H185 | ux | Uppställningens kort glider åt vänster när en typ är slut (speltestet av 0.14.1); fasta platser som i förrådet.

## Efter speltest 0.14.2 (2026-10-16)
- [ ] H190 | ux | Gnesta dag 2 startar med ishallen utanför bild; basen faller osedd. Kameran ska visa basen vid dagstart på alla dagar, och basens hälsa ska synas när den tar skada utanför bild (kantpil).
- [ ] H191 | ux | Vägetiketter står vid ishallen i stället för vid infarten, följer markören och täcker placerbar mark.
- [ ] H192 | balans | E4 dag 2 för lätt ($550 över), dag 3 våg 3 stup (82 fiender, 20 till 5).
- [ ] H193 | ux | VICTORY och "fallen silent" motsäger varandra fortfarande; felaktig text "Only on the road"; förrådets rullist klipper priser.
- [ ] H194 | grafik | Frivilliga och Hemvärnet fortfarande små och svåra att hitta.
- [ ] H200 | banor | Mölnbo: bas = Folkets hus (Olas beslut 2026-10-16). Bron över spåren som flaskhals, övergivet X60 vid perrongen. Referenser lokalt i ~/Projects/horde-refs/molnbo/ (beskrivning.md + bilder). Skiss först, sedan förhandsvisning.
- [ ] H201 | meta | Gnesta = EN sektor (South + North är samma stad, North vidgar kartan). En gemensam trupp-pool, ingen omplacering mellan dem. Omplacering bara mellan verkligt olika platser (E4, Gnesta, senare Mölnbo). Olas påpekande 2026-10-16. Pågår i onboarding-passet.
- [ ] H202 | kampanj | Sektorn heter Hagstumosse (Ishallen + Vikingavägen = samma sektor). Framtida sektorer: Gnesta Centrum, sedan längre norrut; Mölnbo. Olas besked 2026-10-16.
- [ ] H230 | e4 | Lästringe: bygg ut omgivningen så det "suddiga" utanför blir trovärdigt (mer skog, åkrar, vägar, gårdar som fortsätter ut i diset); dimma först långt ut.
- [ ] H231 | e4 | Skyltarna står mitt i gatan: flytta till vägkanten på riktiga stolpar/portaler.
- [ ] H232 | e4 | Ta bort gräs/tuvor som växer på vägbanan (tidigt i apokalypsen). Behåll bilkrocken (Ola: "NAJS!").
- [x] H240 | ux | Gnesta dag 2 startar med ishallen utanför bild; basen faller osedd. Kameran ska visa basen vid dagstart på alla dagar, och basens hälsa ska synas när den tar skada utanför bild (kantpil). (0.16.1: hela basen i bild, kantpil med hälsan, B/Home)
- [x] H241 | ux | Vägetiketter står vid ishallen i stället för vid infarten, följer markören och täcker placerbar mark. (0.16.0: står kvar på sin plats, gatunamnet vid hovring; 0.16.1: vid infarten i bildkanten, undviker placerbar mark, nedtonade med enhet i handen)
- [x] H242 | balans | E4 dag 2 för lätt ($550 över), dag 3 våg 3 stup (82 fiender, 20 till 5). (0.16.1: bjässarna delade mellan våg 2 och 3, sista vågorna jämnare, överskottet till trådar)
- [x] H243 | ux | VICTORY och "fallen silent" motsäger varandra fortfarande; felaktig text "Only on the road"; förrådets rullist klipper priser. (0.16.0: "Sector E4 is secure", "Only on the marked spots.", spelets rullister och fasta kort)
- [x] H244 | grafik | Frivilliga och Hemvärnet fortfarande små och svåra att hitta. (0.16.1: märke VOL/HV över gruppen, lyser när den skjuter)

## E4 vid Lästringe (0.15.0)
- [x] H195 | banor | Bana 1 som trafikplats 137 Lästringe: E4, avfarten och påfarten, väg 800 och 224, hållplatsen, vägspärren vid korsningen. Sörmland i stället för öken.
- [ ] H196 | balans | Speltesta E4 på den nya kartan: dag 1 håller full bas för båda policyerna (avsiktligt minst, onboardingen görs om), dag 3 4 till 13 för den normala.
- [ ] H197 | ux | Dag 2:s andra grupp (Södertälje) syns först i våg 2; dagens startkamera visar bara avfarten. Pröva att visa båda vägarna när dagen börjar.
- [ ] H198 | grafik | Skyltarnas text är svår att läsa längst ut; överväg större paneler eller en portal över motorvägen.


## Onboarding (0.16.0, docs/superpowers/specs/2026-10-16-onboarding-design.md)
- [x] H245 | onboarding | Upplåsningsschemat dag för dag som data (src/data/lessons.js): ett nytt begrepp per dag, resten dolt. E4 dag 1: en Ksp 90 på en markerad plats, starta vågen; ingen tråd, inga förnödenheter.
- [x] H246 | onboarding | Gradvis HUD: varje del syns först när den är upplåst, med en diskret animation första gången.
- [x] H247 | onboarding | Lektionsplåten: hård paus, en markering, högst ca 12 ord, Esc hoppar över, "fewer tips", Tips On / New only / Off och Reset tips i pausmenyn.
- [x] H203 | onboarding | Field manual på J: uppslag som fylls på, prick på nya, Show me.
- [x] H204 | onboarding | Sparfilen: allt fram till den längst spelade dagen räknas som sett och upplåst. Prov.
- [x] H205 | onboarding | Ny fiendetyp: hård paus med presentationsruta, porträtt renderat ur 3D-modellen, rapporttext och Continue (vandrare, löpare, bjässe).
- [x] H206 | ux | Köpraden: enkla siffror 1, 2, 3; tvåstegsval bara med fler än 9 kort (ersätter H097). Tips, intron, prov och chord.js.
- [x] H207 | operation | Knapphet: ledningen släpper ett bestämt antal per leverans, "1 available" / "None released"; RP är priset, leveranserna taket.
- [x] H208 | operation | Uppgraderingar bara för det man har eller fått släppt, och släpps pö om pö.
- [x] H209 | ux | Förrådets rullister i spelets stil, färre poster, stabil kortlayout.
- [x] H210 | text | Textgenomgången i designens avsnitt 6, med "(research More positions)" och "press U to upgrade".
- [x] H211 | balans | Balansskriptets policyer följer upplåsningen och förrådets lager; nya fingeravtryck med skäl i docs/balance-log.md.
- [x] H212 | operation | Gnesta South och North är sektorn Hagstumosse (Ishallen, Vikingavägen) med en trupp; sparfilen slås ihop med kopia; Gnesta Centrum som platshållare (Olas beslut 2026-10-16).
- [x] H213 | ux | Förrådet: nästa strid står i rubriken och fliken, Deploy säger sektorn, skicka frågar och går att ta tillbaka till Deploy, varning under garnisonen (vilande tills två skilda platser är aktiva).
- [ ] H214 | ux | Speltesta inlärningen i händerna med en ny spelare och en van tornförsvarsspelare (fewer tips): pausernas antal mitt i vågorna, plåtarnas placering, presentationsrutorna.
- [x] H215 | balans | Den skickliga har stort överskott av förnödenheter på South dag 3 och 4 (tidiga kall, förnödenheter på enheten först dag 5). Speltesta om det stör. (0.16.1: bounty 0,5 och 0,3, samma utfall, överskottet ungefär halverat)
- [x] H216 | ux | Show me i Field manual spelar bara om steg vars mål finns på skärmen; uppslag utan steg (Veterans, Losses) har ingen markering. (0.16.1: kameran flyttas till målet, bilder för Veterans och Losses)

## Efter speltest 0.16.0 (2026-10-17, docs/playtests/2026-10-17-0.16.0.md)
- [x] H217 | balans | Ishallen dag 1 gick inte att vinna för en ny spelare: farozoner (röda fläckar), föreslagna platser för de frivilliga, lektionen "Cover the crossing", våg 2:s löpare senare. (0.16.1)
- [x] H218 | ux | Ny ingång utan förvarning (E4 dag 2, Södertälje): rad före vågen, vägen blinkar, ping. (0.16.1)
- [x] H219 | ux | Förrådet hittades inte: grå rad på operationskartan om när det öppnar. (0.16.1)
- [x] H220 | ux | Lektionsplåtar under/över andra rutor; evakueringsrutan över stridszonen. (0.16.1)
- [x] H221 | ux | Tysta placeringsfel: varje nekat klick säger varför vid pekaren. (0.16.1)
- [x] H222 | text | Köpradens rubrik bytte mellan DEPLOY och SUPPLIES: DEPLOY före första vågen, DEFENCES under dagen. (0.16.1)
- [x] H223 | bugg | "Field manual: Evacuation" öppnade fel uppslag. (0.16.1)
- [ ] H224 | ux | E4 dag 3: första klicket efter Ksp 88-placeringen tappade valet av Ksp 90 (inte återskapat headless).
- [ ] H225 | text | Små saker från speltestet av 0.16.0: "Volunteers · Volunteers" i hovringen, röd BASE-siffra på full bas dag 3, Runner-porträttet bakifrån, fiendekortens samma första mening, "×3" på kartkortet oförklarat, SECTOR E4 krockar med vägnamnet E4, stjärnraden på VICTORY kryptisk, Space stänger ett tips i stället för att starta vågen.
- [ ] H226 | ux | Speltesta 0.16.1 med en ny spelare (Ishallen dag 1 med tipset, E4 dag 2 med den nya raden).

## E4-omgivningen och menyn (2026-10-17, Olas önskemål)
- [x] H248 | grafik | E4 Lästringe: omgivningen långt utanför spelytan (224 norrut, E4 åt båda hållen, vallen med dike och kraftledning, plöjd åker, grusvägar och gårdar, skog med hyggen och hällar), diset längre ut och mjukare. (0.16.3)
- [x] H249 | grafik | Skyltarna stod mitt i vägen: i vägrenen på stolpar, avfartsskylten på en portal. (0.16.3)
- [x] H250 | grafik | Inget gräs på asfalten (tidigt i apokalypsen). (0.16.3)
- [x] H233 | ux | Huvudmenyn trång och konstig: luftig plåt, Continue på en rad, statusrad, New operation som sekundär knapp, versionen i hörnet. (0.16.3)
- [x] H234 | grafik | Skyltarnas osynliga fotavtryck från 0.16.2 står kvar i placeringen (bl.a. på väg 800:s asfalt före korsningen). Flytta dem till de nya platserna när balansen ändå räknas om. (0.16.4)

## 0.16.4 (Olas feedback och speltestet av 0.16.2)

- [x] H251 | balans | E4 dag 2 orättvis: Södertälje förvarnad från början, Move (M) som dagens andra lektion, förstagångsspelaren som flyttar vinner första försöket.
- [x] H252 | ljud | Taggtråden: rivning och slitning, spänning och knäpp med piska, i ljudbordet.
- [x] H253 | balans | Ishallen dag 3 ett stup (49 / 94 / 190, sex-sju nyheter): 39 / 60 / 84, nyheterna spridda till dag 4, 5 och Vikingavägen.
- [x] H254 | operation | Förrådet lovade en Ksp 90 som inte gick att få; prov för varje löfte.
- [x] H255 | ux | Deploy-knappen klipptes; två rader. Layoutprov i tre bredder (npm run layout).
- [x] H256 | ux | Snabbvalen bytte mellan dagar; ett snabbval per sak (1 till 9, Z X C).
- [x] H257 | ux | NEXT WAVE före bonusen såg ut som en knapp; nu text.
- [x] H258 | ux | Tips över innehåll (RP på resultatskylten, Civilian down över VOL, "Gnesta is next" tre gånger).
- [x] H259 | ux | Tyst klick på gruppens etikett.
- [x] H260 | ux | Ny väg efter ett hinder sägs ("Horde rerouted") och blinkar.
- [x] H261 | grafik | Löparna snubblar (Olas bonus).
- [x] H262 | ux | Segerpaus före VICTORY.
- [x] H263 | text | Berättelsen: vinster är vinster, de civila ska in i ishallen.
- [x] H264 | ux | Skyltarna centrerade, en regel.
- [x] H265 | gnesta | Hagstumosse dag 1 med val: märkta hus, två omgångar, fyra korsningar, inga föreslagna platser.
- [x] H266 | operation | Taket per strid synligt från förrådet till uppställningen; reserven behålls.
- [ ] H267 | balans | Ishallen dag 4 kräver nu ett andra försök för normal i alla seeds (bjässarna och de vilande husen möts). Speltesta om det känns som en vägg.
- [ ] H268 | ux | Speltesta Hagstumosse dag 1 med en ny spelare: förstår hon "East first, then west" och att flytta grupperna?
- [ ] H269 | ux | Grå kort för saker som inte finns i dag (snabbvalets lucka syns inte än; bara siffran står still).
- [ ] H270 | ljud | Ola lyssnar på taggtråden i ljudbordet.

## Efter speltest 0.16.4 (2026-10-18)
<!-- H271-H278 hette H250-H257 på master (krockade med 0.16.3/0.16.4); omnumrerade vid sammanslagningen med Mölnbo -->
- [ ] H271 | balans | Ishallen dag 2: lektionens barriär leder horden in på villagatorna; taggtråd där får horden att byta tillbaka till huvudvägen förbi enheterna utan varning (bas 20 till 1). Lektionen ska leda till en bra spärr, och vägbyten ska alltid förvarnas.
- [ ] H272 | balans | Ishallen dag 3: vågor 39/60/84, vann med bas 4, för liten marginal.
- [ ] H273 | ux | "Sector quiet" visas fast 29 zombier fortfarande går (Ishallen dag 1).
- [ ] H274 | ux | "6 of 8 units deployed" läses som att 6 redan står ute; byt till "Deploy up to 8 · you have 6".
- [ ] H275 | ux | Tipsrutor täcker kortradens rubrik; etiketter krockar på Ishallen; "Base under attack!" ligger kvar efter vågen.
- [ ] H276 | ux | Korttext 8,5-10,5 px för liten; överstruken nolla ser ut som 6.
- [ ] H277 | ux | Pengar som blir över försvinner tyst; säg det.
- [ ] H278 | ux | Snabbval: siffrorna byter betydelse mellan kartor, 1-2 gör inget på E4, C syns på inget kort. Ett enda fast schema och grå kort för det som inte finns idag.

## Mölnbo (0.17.0)

- [ ] MB01 | speltest | Mölnbo dag 1 till 5 med Ola, särskilt bron dag 4 och sista tåget dag 5.
- [ ] MB02 | design | Olas svar på de öppna frågorna (gångbron, passager, Trollvägen, Kvarnvägen, perrongerna, finalen); antagandena i docs/superpowers/specs/2026-10-18-molnbo-build-notes.md.
- [ ] MB03 | spel | De civila från Folkets hus till tåget över gångbron (designens evakuering).
- [ ] MB04 | sim | Siktlinjer med brodäcket (simuleringen är platt, bara bilden lyfter).
- [ ] MB05 | balans | Dag 4 och 5 är knivseggar; mjuka upp efter speltestet.
- [ ] MB06 | ljud | Tåget, avgångsskylten och trafikljusen.

## Efter speltest 0.17.1 (2026-10-18)
- [x] H290 | ux | Dra i kartan med kort i handen placerar enheten (drag-för-sikte uppfattas som panorering). Beslut behövs: kräva kort håll innan drag blir sikte, eller sikte bara med höger/Alt.
- [x] H291 | ux | Esc: beteendet beror på om kortet ligger kvar efter förra placeringen. Släpp kortet efter varje placering (utom Shift) så Esc blir förutsägbar.
- [ ] H292 | ux | Hörnetiketter ritas över varandra; dagrutan skriver ihop rader ("1 cleared89 of 159 left").
- [ ] H293 | ux | Vågräknaren i dagrutan och resultatrutan visar olika våg (Mölnbo).
- [ ] H294 | molnbo | Dag 4 har ny tågklocka fast dag 3 hette "The last train". Berättelsen per dag måste hänga ihop.
- [ ] H295 | molnbo | Dag 4 svår (förlorad i speltest, policyn vinner med bas 1). Resultatrutan täcker tågets avgång. Över $1 000 kvar varje dag.

## Olas speltest av 0.17.1 (2026-10-18)
- [x] H300 | ux | Sikte: alternativ 2 + håll-och-dra. Klick med kort i handen = placera (auto-riktning). Tryck-håll-dra = sikta (Ola gillade det). Höger/Alt-dra siktar också. Vänster-dra utan kort = panorera.
- [x] H301 | molnbo | Prickskytt i klocktornet (missionskyrkan) och på andra höga byggnader (hyreshusen, Folkets hus, stationshuset).
- [x] H302 | grafik | Kartkanten: glest och konstigt, dimman känns som grafikfel. Prova mörk "fog of war" vs djupare grå dimma; kolla hur andra gör.
- [ ] H303 | design | STRATEGISKT DJUP: spelet är passivt (ställ ut längs rutten, vänta). Kill zones, långa kill corridors, trupper i hus, fler trupp- och fiendetyper med immuniteter, trupper som skadas (Close Combat), trötthet/vila. Fable-research pågår.
- [ ] H304 | ux | Rekvisition: mer stats för trupperna (eller medvetet vaga som i Close Combat?).
- [ ] H305 | ux | Panelen byter storlek fult när man köper granatkit; radbryt text i stället.
- [ ] H306 | bugg | Sandsäckar (ammo crate/sandbags) verkar inte göra något.
- [ ] H307 | molnbo | Hus och stenar ligger på vägen; stenmur korsar väg.
- [ ] H308 | molnbo | Fylligare: fler träd, trädgårdar, häckar (se refs/molnbo/satellit-vid-sodra.jpg).
- [ ] H309 | bugg | Hus längst ner på skärmen blir genomskinliga vid scroll (kamerans klipp/dimma).
- [ ] H310 | design | NATT ibland (bryter mot tidigt beslut "aldrig natt", Ola ändrade 2026-10-18). Lysraketer som förmåga, mynningsflammor och gatlyktor som ljus, begränsad sikt, sanity tar mer stryk i mörker. Måste testas fram så man ser lagom mycket och det blir snyggt. Prototyp först: en kvällsdag i skymning, sedan en natt.
- [ ] H320 | kampanj | Gnesta centrum: flera försvarspunkter som måste hållas: brandstationen (civila, fordon; Räddningstjänsten som röst, Ola jobbar där), Elektron/kommunhuset, Frejaskolan med gymnastiksal och stora ytor. Ledningsplats kanske på brandstationen eller Elektron. (Ola 2026-10-18)
- [ ] H330 | kartor | Idé (Ola 2026-10-18): bygg HELA Gnesta tätort som en sammanhängande karta från OSM, och skär ut skådeplatser (Hagstumosse, rondellen, centrum, Frösjön) som delar. Ger samma hus/gator överallt och fri sammanslagning. Utvärdera efter Gnesta centrum-förhandsvisningen (prestanda, skala).
- [ ] H400 | ux | Rekvisition: mer stats för trupperna (eller medvetet vaga som i Close Combat?). 0.17.2: kortens siffror läsbara (två rader); resten väntar på designen (strategiskt-djup).
- [x] H401 | ux | Panelen byter storlek fult när man köper granatkit; radbryt text i stället.
- [x] H402 | bugg | Sandsäckar (ammo crate/sandbags) verkar inte göra något.
- [x] H403 | molnbo | Hus och stenar ligger på vägen; stenmur korsar väg.
- [x] H404 | molnbo | Fylligare: fler träd, trädgårdar, häckar (se refs/molnbo/satellit-vid-sodra.jpg).
- [x] H405 | bugg | Hus längst ner på skärmen blir genomskinliga vid scroll (kamerans klipp/dimma).
- [x] H406 | ux | Reposition i uppställningen: lyft en utställd enhet och ställ den direkt och gratis (före vågen och mellan vågorna).
- [x] H311 | debug | Quick jump i debugmenyn med auto-deploy (balanspolicyn) och direkt start.
- [x] H312 | grafik | Pillboxen som A-traktor (Volvo, kapat flak, LGF-triangel) och Volvo-kombi bland bilarna.
- [ ] H313 | balans | Mölnbo efter prickskytteposterna: naive klarar dag 3 (fastnar dag 4). Avgörs med strategiskt djup.
- [ ] H314 | grafik | Kartans kant (fog of war / grå dis) finns bara i Mölnbo; ta till E4 och Hagstumosse om Ola gillar (b).
- [ ] H440 | ux | Förrådet: två banor 'Into battle x/10' och 'Reserve · resting' (dra-och-släpp + klick), tydlig trötthet per enhet, rekvisition och uppgraderingar som visuellt olika delar, INTEL-panel om nästa strid (kända/okända fiendetyper, antal, riktningar, ärligt 'Unknown'). Pågår i 0.18.1. (Ola 2026-10-18)
- [ ] H450 | molnbo | Hordens riktning: ska komma från Järna/Södertälje-hållet (väg 57 och banan mot nordost i verkligheten) PÅ VÄG MOT Gnesta (sydväst), inte från Gnesta. Gäller generellt: kontrollera att varje banas ingångar stämmer med berättelsen (horden rör sig mot Gnesta).
- [ ] H451 | molnbo | Utmaning: en mindre grupp söderifrån, och/eller ett utbrott i ett hus.
- [ ] H452 | molnbo | Tåghändelse: ett pendeltåg RULLAR IN mitt i striden, saktar in, stannar vid perrongen/gamla stationen och 50 zombier väller ut (dörrar uppbrutna, krossade fönster). Förvarning några sekunder innan; spelaren hinner flytta trupper. Alternativt: tåget vid perrongen har zombier som bryter sig ut vid ett tillfälle.
- [ ] H453 | ux | Förrådet och mellansnacket byggs runt ledningsplatsen: ett bord med "fysiska" lappar, symboler och kort som man läser och drar runt (trupper, underrättelser, order). Se 2026-10-18-mellansnack.md.
- [ ] H454 | zombier | Löparnas snubbel: för ofta och för jämnt (var 20-40 m, 60 %). Gör sällsynt och oregelbundet (~20 %, 40-90 m), helst utlöst av något (träff av tungt vapen, taggtråd, skrotbil, skarp sväng).
- [ ] H455 | zombier | Snubblets animation (Ola: "klonk, rakt ner, kryper på stället, plopp"): behåll farten framåt (glider/rullar i stället för att stanna), tre varianter (snavar och tar emot sig utan att falla = vanligast; faller och glider; kravlar upp medan den rör sig framåt), sned kropp och en arm först, ingen fast pose i mitten. Fallback om det inte blir bra: bara springa.
- [ ] H456 | spel | Bjässar och skrotbilar som regel (Ola 2026-10-18): bjässen går inte runt skrotbilar utan knuffar undan dem (snabbt); betongen respekterar den. Kortet: "Brutes shove them aside." Tips första gången det händer: "A brute shoved the cars aside. Concrete holds." Field manual. Balans + fingeravtryck.
- [ ] H457 | spel | Utred Olas fall på Mölnbo dag 2: spärr av skrotbilar, horden gick rätt bana, efter våg X krossade bjässar spärren och alla vände. Var det en ny ingång där bilarna låg på enda vägen, eller en bugg i flödesfältet (garnisonshus som "tjock" ruta som stängde den andra vägen)? Repro i sim.
- [ ] H458 | ui | Varning när man ställer spärren som stänger sista vägen ("This shuts every road. They will smash through.") och hela vägvyn visas då.
