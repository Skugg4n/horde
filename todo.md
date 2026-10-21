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
- [ ] H009 | innehåll | Fler zombietyper: krypare, bepansrad, uppsvälld, skrikare. (0.18.0: krypare och pansrad gjorda; uppsvälld och skrikare i skiva 2.)
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
- [x] H303 | design | (0.18.0: skiva 1 byggd, skiva 2 och 3 kvar enligt kampanjplanen) STRATEGISKT DJUP: spelet är passivt (ställ ut längs rutten, vänta). Kill zones, långa kill corridors, trupper i hus, fler trupp- och fiendetyper med immuniteter, trupper som skadas (Close Combat), trötthet/vila. Fable-research pågår.
- [x] H304 | ux | (0.18.0: streck och skadeklasser på korten, siffrorna i Field manual) Rekvisition: mer stats för trupperna (eller medvetet vaga som i Close Combat?).
- [ ] H305 | ux | Panelen byter storlek fult när man köper granatkit; radbryt text i stället.
- [ ] H306 | bugg | Sandsäckar (ammo crate/sandbags) verkar inte göra något.
- [ ] H307 | molnbo | Hus och stenar ligger på vägen; stenmur korsar väg.
- [ ] H308 | molnbo | Fylligare: fler träd, trädgårdar, häckar (se refs/molnbo/satellit-vid-sodra.jpg).
- [ ] H309 | bugg | Hus längst ner på skärmen blir genomskinliga vid scroll (kamerans klipp/dimma).
- [ ] H310 | design | NATT ibland (bryter mot tidigt beslut "aldrig natt", Ola ändrade 2026-10-18). Lysraketer som förmåga, mynningsflammor och gatlyktor som ljus, begränsad sikt, sanity tar mer stryk i mörker. Måste testas fram så man ser lagom mycket och det blir snyggt. Prototyp först: en kvällsdag i skymning, sedan en natt.
- [ ] H320 | kampanj | Gnesta centrum: flera försvarspunkter som måste hållas: brandstationen (civila, fordon; Räddningstjänsten som röst, Ola jobbar där), Elektron/kommunhuset, Frejaskolan med gymnastiksal och stora ytor. Ledningsplats kanske på brandstationen eller Elektron. (Ola 2026-10-18)
- [ ] H330 | kartor | Idé (Ola 2026-10-18): bygg HELA Gnesta tätort som en sammanhängande karta från OSM, och skär ut skådeplatser (Hagstumosse, rondellen, centrum, Frösjön) som delar. Ger samma hus/gator överallt och fri sammanslagning. Utvärdera efter Gnesta centrum-förhandsvisningen (prestanda, skala).
- [x] H400 | ux | (0.18.0: streck och skadeklasser) Rekvisition: mer stats för trupperna (eller medvetet vaga som i Close Combat?). 0.17.2: kortens siffror läsbara (två rader); resten väntar på designen (strategiskt-djup).
- [x] H401 | ux | Panelen byter storlek fult när man köper granatkit; radbryt text i stället.
- [x] H402 | bugg | Sandsäckar (ammo crate/sandbags) verkar inte göra något.
- [x] H403 | molnbo | Hus och stenar ligger på vägen; stenmur korsar väg.
- [x] H404 | molnbo | Fylligare: fler träd, trädgårdar, häckar (se refs/molnbo/satellit-vid-sodra.jpg).
- [x] H405 | bugg | Hus längst ner på skärmen blir genomskinliga vid scroll (kamerans klipp/dimma).
- [x] H406 | ux | Reposition i uppställningen: lyft en utställd enhet och ställ den direkt och gratis (före vågen och mellan vågorna).
- [x] H311 | debug | Quick jump i debugmenyn med auto-deploy (balanspolicyn) och direkt start.
- [x] H312 | grafik | Pillboxen som A-traktor (Volvo, kapat flak, LGF-triangel) och Volvo-kombi bland bilarna.
- [x] H313 | balans | Mölnbo efter prickskytteposterna: naive klarar dag 3 (fastnar dag 4). Avgörs med strategiskt djup. (0.18.0: naive fastnar på dag 3 eller 4 igen.)
- [ ] H314 | grafik | Kartans kant (fog of war / grå dis) finns bara i Mölnbo; ta till E4 och Hagstumosse om Ola gillar (b).
- [x] H440 | ux | Förrådet: två banor 'Into battle x/10' och 'Reserve · resting' (dra-och-släpp + klick), tydlig trötthet per enhet, rekvisition och uppgraderingar som visuellt olika delar, INTEL-panel om nästa strid (kända/okända fiendetyper, antal, riktningar, ärligt 'Unknown'). Pågår i 0.18.1. (Ola 2026-10-18)
- [x] H450 | molnbo | Hordens riktning: ska komma från Järna/Södertälje-hållet (väg 57 och banan mot nordost i verkligheten) PÅ VÄG MOT Gnesta (sydväst), inte från Gnesta. Gäller generellt: kontrollera att varje banas ingångar stämmer med berättelsen (horden rör sig mot Gnesta).
- [x] H451 | molnbo | Utmaning: en mindre grupp söderifrån, och/eller ett utbrott i ett hus.
- [x] H452 | molnbo | Tåghändelse: ett pendeltåg RULLAR IN mitt i striden, saktar in, stannar vid perrongen/gamla stationen och 50 zombier väller ut (dörrar uppbrutna, krossade fönster). Förvarning några sekunder innan; spelaren hinner flytta trupper. Alternativt: tåget vid perrongen har zombier som bryter sig ut vid ett tillfälle.
- [ ] H453 | ux | Förrådet och mellansnacket byggs runt ledningsplatsen: ett bord med "fysiska" lappar, symboler och kort som man läser och drar runt (trupper, underrättelser, order). Se 2026-10-18-mellansnack.md.
- [x] H454 | zombier | Löparnas snubbel: för ofta och för jämnt (var 20-40 m, 60 %). Gör sällsynt och oregelbundet (~20 %, 40-90 m), helst utlöst av något (träff av tungt vapen, taggtråd, skrotbil, skarp sväng).
- [x] H455 | zombier | Snubblets animation (Ola: "klonk, rakt ner, kryper på stället, plopp"): behåll farten framåt (glider/rullar i stället för att stanna), tre varianter (snavar och tar emot sig utan att falla = vanligast; faller och glider; kravlar upp medan den rör sig framåt), sned kropp och en arm först, ingen fast pose i mitten. Fallback om det inte blir bra: bara springa.
- [x] H456 | spel | Bjässar och skrotbilar som regel (Ola 2026-10-18): bjässen går inte runt skrotbilar utan knuffar undan dem (snabbt); betongen respekterar den. Kortet: "Brutes shove them aside." Tips första gången det händer: "A brute shoved the cars aside. Concrete holds." Field manual. Balans + fingeravtryck.
- [x] H457 | spel | Utred Olas fall på Mölnbo dag 2: spärr av skrotbilar, horden gick rätt bana, efter våg X krossade bjässar spärren och alla vände. Var det en ny ingång där bilarna låg på enda vägen, eller en bugg i flödesfältet (garnisonshus som "tjock" ruta som stängde den andra vägen)? Repro i sim.
- [x] H458 | ui | Varning när man ställer spärren som stänger sista vägen ("This shuts every road. They will smash through.") och hela vägvyn visas då.
- [x] H459 | spel | (skärper H428) Soldaterna "in house" står UTANFÖR huset vid fasaden och i trädgården (Olas skärmbild Mölnbo 2026-10-18), Ksp 58 med sandsäckar på gräsmattan. De ska synas I huset: halvkroppar i fönsterkarmarna, mynningsflammor och ljus i fönstret som skjuter, inga ringar på gräset, trupplappen på taket.
- [x] H460 | karta | (preview klar 2026-10-19: laxne.html, src/data/laxne.js, docs/laxne-preview-*.png; spelbar karta och Olas svar på kampanjplanens Laxne-frågor kvar) Battle for Laxne (Ola 2026-10-18): byn norr om Gnesta vid väg 223. Horden från norr (223/Laxnevägen), vill söderut mot Gnesta (223 förbi skolan, Hebyvägen). Sjön som flank. Underlag i horde-refs/laxne (OSM, plan, Olas karta + satellit, beskrivning). Placera i kampanjplanen (docs/superpowers/specs/2026-10-18-kampanjplan.md) och bygg förhandsvisning som Björnlunda.

## Skiva 1 och speltestet av 0.17.2 (2026-10-18)

- [x] H410 | spel | Skadeklasser (small, heavy, explosive) och två fiender: pansrad (20 % av småkaliber) och krypare (under tråden, svår uppifrån).
- [x] H411 | spel | Sanity på grupper och pjäslag: tär nära horden och vid förluster, verkar på träff och eldtakt; routed under gränsen.
- [x] H412 | spel | Överrända pjäser (laget slås ner, pjäsen står tyst) och Recrew (N) eller en grupp intill.
- [x] H413 | spel | Fall back (G): ordnat vik till reserven, sanity behålls.
- [x] H414 | spel | Trupper i hus: grupper, Ksp 90 och Ksp 58; fönstrens sikt, skydd, stormning och inslagen dörr.
- [x] H415 | spel | Korseld (+20 % vid två bågar minst 60 grader isär) med förhandsvisning i guld.
- [x] H416 | spel | Håll eld (H): bakhållets dubbla salva, nedkylning.
- [x] H417 | spel | Trötthet över dagarna (Rested, Tired, Exhausted) i förrådet; förlorat försök räknas inte.
- [x] H418 | spel | Mål-läget (T): First in line, Nearest, Strongest, Weakest.
- [x] H419 | bugg | Quick jump till Ishallen gav ingen trupp (ett hopp till Mölnbo tog alla sektorers trupper).
- [x] H420 | bugg | Quick jump utan Auto-deploy startade vågen med 0 utställda; nu väntar dagen på Start wave.
- [x] H421 | ux | Enhetspanelen över dagrutan och tågklockan, och höjden bytte vid köp; nu fast höjd och HUD:en är ett hårt krav.
- [x] H422 | ux | Ammolådan syntes inte på enheten (större lådor och märket AMMO).
- [x] H423 | ux | Köpradens rubrik bytte mellan DEPLOY och DEFENCES; nu DEPLOY och UNITS hela dagen.
- [x] H424 | ux | Zoomen går mot pekaren.
- [ ] H425 | speltest | Skiva 1 genom human-ux-tester och sedan Ola: känns autovik som att spelet tar över? Läses sanity-stapeln? Hittar man husen?
- [x] H426 | spel | Move in i ett hus mitt i en våg (0.18.1: gruppen eller laget springer till dörren och går in).
- [ ] H427 | balans | Kryparna gör lite på Vikingavägen dag 4 och 5; mät om de ska vara fler eller ha ett eget hot.
- [x] H428 | spel | Soldaterna i husen syns dåligt (de står vid fasaden); fönster med mynningsflammor vore tydligare.


## Speltestet av 0.18.0 (docs/playtests/2026-10-18-0.18.0.md)

- [x] H429 | ux | Korselden syns utan kort i handen (zoner i bygget, "+20 %" i striden), Ishallen dag 2 före våg 1. (0.18.1)
- [x] H430 | ux | Sanity läsbar: större blå stapel, rött nära gränsen, "Sanity 62 / Holds above 18", banderoll, ping och flykt; tipset pekar på rätt enhet. (0.18.1)
- [x] H431 | balans | Vågorna staplades: grinden (70 % nere eller lång klocka, högst två ute utan tidigt kall). (0.18.1)
- [x] H432 | ux | Enhetspanelen över tågklockan; "1 cleared216 of 255". (0.18.1)
- [x] H433 | balans | Ishallen dag 1 med 5 dödade: mätt, dagen kräver försvar (prov). (0.18.1)
- [x] H434 | ux | Förrådet i zoner: banorna Into battle / Reserve · resting, Requisition, Upgrades, INTEL. (0.18.1)
- [x] H435 | ux | Mölnbo dag 2: husen längs Stenbyvägen i stället för "tåget är skydd". (0.18.1)
- [ ] H436 | ux | Huset lyser grönt för ett kort som inte får gå in (Vikingavägen 4) och inte för Ksp 90 när det får (speltestet punkt 6).
- [ ] H437 | ux | Start wave kändes död: "Units left in reserve. Start anyway?" ska stå på knappen (punkt 7).
- [ ] H438 | ux | Samma tips pausar om och om igen (överkörd pjäs, punkt 8).
- [ ] H439 | ux | Taggtråd ger "Horde rerouting via ..." fast den bara bromsar (punkt 9).
- [ ] H407 | text | Fall back heter "To reserve" i panelen; "Volunteers · Volunteers"; "18 needed" bredvid "Get 18 of 24" (punkt 10).
- [ ] H441 | ux | Jump to dag 5 startar kameran inzoomad på en tom väg (punkt 11).
- [ ] H442 | spel | Reserven går inte att sätta in mitt i en våg ("All out", punkt 12). (0.19.1: kortet säger "3 in reserve" och varför, inte "All out"; själva insättningen kvar.)
- [x] H443 | ux | Lektionstexterna mb-2.houses (19 ord) och Mölnbo dag 2:s intro (20 ord) är längre än tolv ord, Olas exakta text; provet har undantag.

## Speltestet av 0.19.0 (docs/playtests/2026-10-19-0.19.0.md)

- [x] H461 | ux | Bjässens knuff-tips kom aldrig (barrikadgrenen i main.js tog händelsen först); knuffen syns knappt. Tipset första gången, "Cars shoved aside" där det sker, vraken glider längre undan, damm och plåt. (0.19.1)
- [x] H462 | balans | Mölnbo dag 3 och 4 är en mur: våg 3 och 4 ovanpå varandra (150 till 200 ute), basen 3-4 när tåget kommer. Orsaken: grindens långa klocka släppte nästa våg 50 s efter att den senaste kommit ut, oavsett hur många av den som levde (dag 4: 70 av 73 kvar, tågets 50 ovanpå). Nu overlapMin 0,4 dag 3 till 5; tåget i tredje vågen dag 4, våg 3 och 4 mindre. (0.19.1)
- [x] H463 | ux | Tre röda banderoller samtidigt (tåget, basen, bjässarna). En stor röd banderoll i taget, rank tåget 3 > flykt 2 > resten 1; en ny med högre rank tar platsen, de andra står små under. (0.19.1)
- [x] H464 | balans | Vågens svans: 1 till 3 bjässar sist gav 90 till 150 s väntan utan något i bild. Svansregeln för alla typer (tre bjässar på väg 57: 191 till 148 s), och plåten "3 left: brutes, Stenbyvägen" vid skärmkanten som flyttar kameran dit. (0.19.1)
- [x] H465 | spel | Move in i hus mitt i vågen nekas nästan överallt (1 av 13): "Door blocked" utan synlig orsak. Orsaken: dörren valdes bara bland gatrutorna intill huset, och en villa på sin tomt har ingen. Nu närmaste ruta trupperna går på; en soldat i en ficka nekar inte hela gruppen; bodarna säger "This building can't be entered". Prov över alla hus på Mölnbo och Vikingavägen. (0.19.1)
- [x] H466 | zombier | Snubblet klumpar sig: 10 av 16 löpare dag 4, flera gånger, samma ruta vid brofästet. Minst 60 m mellan två för samma löpare, utlösarna en liten chans (svängen 0,04, var 0,25 i varje gathörn), inget snubbel inom 4 m och 10 s från ett annat; cirka 1 av 4 till 5 löpare över Mölnbo, prov dag 1 och 4. (0.19.1)
- [x] H467 | ux | Förrådet föreslår utmattade enheter för striden fast vilade finns i reserven. Förslaget väger tröttheten hårdare (0,4 för utmattad). (0.19.1)
- [x] H468 | ux | "+20 %" och "+$" ritas över köpraden. Raderna hålls ovanför köpraden och under plåtarna uppe, takets lappar döljs under dagrutan och SUPPLIES. (0.19.1)
- [x] H469 | text | Kommandotexten om "the empty X60" som skydd står kvar (struket i 0.18.1). Nu: "They come over the bridge and up Stenbyvägen. Hold the houses on both sides." (0.19.1)
- [x] H470 | text | Introna dag 2 och 3 säger inte varifrån horden kommer. Dag 2 "From Järna and from the south. Squads in houses along Stenbyvägen.", dag 3 "The train" med Järna och Fagernäsvägen i öster. (0.19.1)
- [ ] H471 | spel | En villa på sin tomt kan inte stormas: stormningen (sim.js, assaults) läser husets touch (gatrutorna intill), och villorna har ingen. Avgör med Ola om villorna ska gå att storma (dörren i doorCells), räkna om balansen.
- [ ] H472 | ux | Esc stängde både kortet i handen och korsellektionen på Ishallen dag 2 (lektionen kom när kortet släpptes). Speltestet av 0.19.0, smått.
- [ ] H473 | ux | "SECTOR E4" på operationskartan har en text som ligger över sig själv.
- [ ] H474 | ux | Enhetslapparna döljs medan ett kort är i handen, så man ser inte var de egna står när man placerar nästa.
- [x] H475 | ux | Pendeltåget dag 4: en kantpil eller kameran mot perrongen vid signalen, så att valet (flytta mot perrongen eller hålla) syns. (0.19.2: H476)

## Speltestet av 0.19.1 (docs/playtests/2026-10-19-0.19.1.md)

- [x] H476 | ux | Tåget dag 4 är inget val. Vid signalen lyser perrongen och trapptornen (pulserande kontur), etiketten "Platform: they come out here", pilar från de två närmaste enheterna, banderollen på två rader ("Move units to the platform, or hold the line.") som flyttar kameran dit, 1x i sex sekunder utan paus, bildtexten mb-4.platform första gången. (0.19.2)
- [x] H477 | ux | Läckan syns inte förrän basen tar skada. Där de tar sig förbi de sista försvararna: röd ring på kartan och minikartan, en rad med gatan, en röd pil vid kanten; "Base under attack! From Stenbyvägen" är klickbar. (0.19.2)
- [x] H478 | ux | Knufftipset tystnar om spärren redan tappat en ruta. Knuffen räknas för sig. (0.19.2)
- [x] H479 | ux | Världens lappar ovanpå varandra ("CARS SHOVED ASIDE" över vågskylten, FROM WAVE-skyltar staplade, vågskylten över tornets skytt, IN HOUSE/TIRED i en klump). En regel: src/ui/declutter.js (knuffa eller dölj den lägre). (0.19.2)
- [x] H480 | ux | Lektionsrutan täcker köpraden Mölnbo dag 2 och 4. Plåten flyttas av köpraden, knappen och plåtarna uppe; layoutprovet säger till. (0.19.2)
- [x] H481 | ux | Farten hoppar till 1x efter fiendens ruta och tips som pausar. Spelarens fart gäller när de stängs. (0.19.2)
- [x] H482 | text | Taggtråd ger "Horde rerouting via ...". Bara spärrar som stänger säger omvägen. (0.19.2)
- [x] H483 | ux | Ett gammalt "−$ 120" står kvar under SUPPLIES när en ny dag börjar. En ny dag tar bort raden. (0.19.2)
- [x] H484 | balans | Mölnbo dag 4 läckte vid Folkets hus från cirka 270 s. Läckan mätt (sista biten av Stenbyvägen, går att täcka), hp 38 till 36. (0.19.2)
- [ ] H485 | text | Vågens rad "Väg 57." och "Väg 57 again." förstås inte ensamma (speltestet av 0.19.1, punkt 7).
- [ ] H486 | text | Underrättelserna: "Väg 57 north north", "Fagernäsvägen east north-east", och dag 2 "No reports from the east, south or west" fast de kommer söderifrån.
- [ ] H487 | ux | Mölnbo dag 5 startar kameran på ett tomt fält; enhetspanelen för frivilliga klipps vid 800 px; hovringsrutor blir kvar efter att pekaren flyttats.
- [ ] H488 | balans | Varje dag slutar med $700 till $1 300 oanvänt (speltestet av 0.19.1). Något att köpa, eller mindre i kassan.
- [ ] H489 | text | Dag 3: "The train is away with everyone on board." med 30 zombier kvar ute; vilka är "everyone"?
- [ ] H490 | molnbo | Tåget (speltest 0.19.2): märkningen "Platform: they come out here" och pilarna pekar på perrongen, men det som lönar sig är foten av södra trappan och bara inom några sekunder. Peka dit det lönar sig, och ge längre tid (markeringen försvinner efter ~26 s speltid, 13 s i 2X).
- [ ] H491 | ui | Kvarvarande överlapp: plattformslappen under tågbanderollen, en enhetslapp över DEPLOY-raden, hovringstips över en vågskylt.
- [ ] H492 | ui | "Horde rerouting ... remove it" och "Every road shut" säger emot varandra; en röd läckring stod en gång på Stenbyvägen före dag 2 (ej återskapad).
- [ ] H493 | kampanj | Olas kampanjbåge dag 0 till 21 (kampanjplan avsnitt 10) är nu bärande plan. Skriv ledningscentralens texter per dag (order, lägesrapport, radio/TV-inslag) och koppla varje dag till sin anledning.
- [x] H494 | molnbo | Rätta Mölnbo-kartan efter satellitbilden: EN väg över spåret (bron, väg 57), vägnätet (Stenbyvägen, Trollvägen, Kvarnvägen, Fagernäsvägen), Folkets hus läge. Ref horde-refs/molnbo/satellit-ola-2026-10-19.jpg.
- [x] H495 | molnbo | Mölnbo dag 1 till 3 enligt bågen: dag 1 hålla bron så folk hinner över, dag 2 norrsidan förloras (ingen placering där efteråt) + tåget, dag 3 hålla en tid, sedan uttåg mot Gnesta och flodvåg över bron (menyerna försvinner, trupperna packar, bilden tonar ut).
- [x] H496 | kampanj | Rätta E4 (norrut längs E4) och Hagstumosse (österifrån) spawns efter bågen, inte tvärtom. (0.20.0 riktningarna: E4 var rätt, texterna rättade; Ishallen österut; Vikingavägen väst, syd och nord)
- [x] H497 | kampanj | Move låses upp dag 6 eller 7 med "radio till enheterna". (0.20.0: Move och Rotate Ishallen dag 3)
- [ ] H498 | kampanj | Slutet i Björnlunda (Ola 2026-10-19): kraschad smittotransport på spåret i Björnlunda, köttiga nervtrådar ur tåget, dag 20 hålla, dag 21 eskortera EPA med sprängämnen in i monstret. Grustaget utgår. Egen spec.
- [ ] H499 | kampanj | Nya mekaniker som behöver spec: reträtt dag 16, pushback dag 18 (victory locations?), dag 19 spår av något konstigt, Laxne som valfri skådeplats.
- [ ] H500 | hub | Kartbordet v3 efter Olas beslut (mellansnack avsnitt 11): ingen tejp, fysisk känsla, en sak i taget (karta + en lapp först), lappar staplade per uppdrag, egen hög för fiendeinfo, ett kort per enhet (ingen ×2), bättre översiktskarta (stor + inzoomad Gnesta senare), snören som detalj. Mockup kontrollrum-3.
- [x] H501 | laxne | Sjösidan är tom: fyll med skog efter kartöversikten (kontrollera mot OSM wood och satellitbilden), bryggor och strandkant. Skog längs stranden norr och söder om badplatsen och söder om Spårbacken, vass och stenar i vattenbrynet, en fjärde brygga. (0.20.0)
- [x] H502 | prestanda | Kartorna känns långsamma att ladda (Ola). Mät laddtid per karta (trädgenerering, modeller, importmap), visa laddningsmätare, cacha genererade träd, sänk polygoner där det inte syns. Laxne: 1,3 M trianglar, 223 anrop, 120 fps på Olas dator. Mätt (docs/reports/2026-10-19-laddtid.md): rutnäten för alla banor vid start, skogens gränser per provpunkt och vägavstånden per ruta; nu 0,4 till 0,7 s i spelet (var 1,9 till 2,1), mätare som följer stegen. Gnesta centrums shaderprogram (1,2 s) kvar. (0.20.0)
- [x] H520 | molnbo | Speltestet av 0.20.0, fynd 1: dag 1 "Hold the bridge" skickade spelaren till bron, de civila dog vid de första husen. Introt säger var man ska stå, första lektionen pekar på husen och linjerna, kameran börjar på norra sidan, husen närmast bron går först (0.20.1).
- [x] H521 | molnbo | Speltestet av 0.20.0, fynd 2 och 7: dag 2 tog tolv minuter; sex till sju nu (tidigare vågor, hårdare svans). Kameran glider till perrongen när tåget signalerar (0.20.1).
- [x] H522 | molnbo | Speltestet av 0.20.0, fynd 3: flodvågen dag 3 var tunn; cirka 200 under 20 s ur dimman och husen, vågornas rester borta, banderoll över hela bredden (0.20.1).
- [x] H523 | molnbo | Speltestet av 0.20.0, fynd 4: kameran börjar rätt alla tre dagarna (dag 2 och 3 bron och basen), Folkets hus har en etikett (0.20.1).
- [x] H524 | ui | Speltestet av 0.20.0, fynd 6: UNITS 6 / 9 när alla kort sa All out; talet efter snedstrecket är nu det som går att ha ute (0.20.1).
- [x] H525 | e4 | Speltestet av 0.20.0: E4 dag 2:s intro avslöjade Södertälje; introt neutralt, raden "Runners from Södertälje, behind you!" när de kommer (0.20.1). Kvar att avgöra: lektionen "Two roads in. Södertälje joins from wave 2." och etiketten From wave 2 avslöjar fortfarande (Olas rättvisebeslut 0.16.4).
- [ ] H526 | gnesta-norr | Speltestet av 0.20.0, fynd 5: Vikingavägen dag 4 förlorades med Quick jump och auto-deploy, men balansskriptet (0.20.1) vinner dag 4 i alla seeds (skilled bas 4 till 9, normal inom 1 till 2 försök). Hoppets trupp (debugReach utan ARRIVAL_TROOP för gnesta-norr) är svagare än balansens; ge hoppet balansens ankomst som Mölnbo har.
- [ ] H527 | text | Speltestet av 0.20.0, småsaker: operationskartans "Same district, wider map." före Mölnbo dag 2, etiketten SECTOR E4 krockar med ett rutnätsnummer, fiendekortet för Walkers säger "infected on the E4" på Mölnbo, dag 2:s resultat säger inte att norra sidan är förlorad.
- [ ] H528 | molnbo | Snubblet på Mölnbo: vägarna är längre på den nya kartan, så var tredje löpare snubblar (tests/stumble.test.js tillåter 0,4). Speltest: för ofta?
- [ ] H529 | test | Layoutkontrollen: table-day1 @1920 gav "inget kartbord" en gång av två (flaky, troligen tajming vid första laddningen). Vänta på bordets första ritning i stället för fast tid.
- [ ] H530 | hub | Bordet (Ola 2026-10-20): rörigt vad som är aktuellt och gammalt. Tydlig hierarki: EN aktuell lapp (nästa order) överst, ljus och rak, med "NEW"-märke; gamla lappar nedtonade (gulnade, lite mindre, mer snett), äldre än två dagar bara som kanter; klara sektorer flyttas till en arkivhög i hörnet med HELD-stämpel; max en läsbar lägesrapport åt gången.
- [ ] H531 | hub | Stämpeln RECEIVED hänger utanför pappret (Olas skärmbild). Stämplar hålls inom arket.
- [x] H532 | molnbo | Rätta efter Olas kartbilder och foton 2026-10-20 (kampanjplan avsnitt 10, beslut): Fagernäsvägens båge till Epoken, Trollvägen som slinga, Dvärgvägen, Kvarnvägen hela vägen; stationshuset vid Redmond Muay Thai; trapptornen ersätts av öppna betongtrappor med stålräcke på brons västsida; caféet i hörnet Fagernäsvägen/Stenbyvägen med parkering; rött villahus med glasveranda väster om Stenbyvägen vid 57.
- [ ] H533 | laxne | Ta bort etiketten Fjäderfabriken. Bollplanen = grusplanen vid badet (bekräftat).
- [ ] H534 | kampanj | Pushback dag 18 = linjen flyttas fram våg för våg (beslut A). Laxne-valet mellan dag 10 och 11. Dag 19 köttiga trådar + avvikande zombie. Vagnen väster om Björnlunda station.
- [x] H408 | hub | Bordet (Ola 2026-10-20): rörigt vad som är aktuellt och gammalt. Tydlig hierarki: EN aktuell lapp (nästa order) överst, ljus och rak, med "NEW"-märke; gamla lappar nedtonade (gulnade, lite mindre, mer snett), äldre än två dagar bara som kanter; klara sektorer flyttas till en arkivhög i hörnet med HELD-stämpel; max en läsbar lägesrapport åt gången.
- [x] H409 | hub | Stämpeln RECEIVED hänger utanför pappret (Olas skärmbild). Stämplar hålls inom arket.
- [ ] H535 | verktyg | Publiceringen 0.21.2 gick ut med konfliktmarkörer i index.html (två importmaps) och spelet laddade inte på GitHub Pages i ~1 h. scripts/importmap.mjs ska vägra skriva om filen har markörer, och npm test ska ha ett prov som läser index.html och kräver exakt en importmap och inga markörer. Publicering ska alltid följas av en curl mot live som kontrollerar samma sak.
- [ ] H536 | hub | Truppkorten (Ola 2026-10-20): de hoppar, byter storlek och ordning när man flyttar ett kort. Ska vara fysiska kort/pjäser: fast storlek alltid (som mockupens stående kort), fasta platser (10 rutor i Into battle, ett fack för reserven), kortet GLIDER till sin nya plats med animation i stället för att allt ritas om, övriga kort står stilla, dra och släpp eller klick.
- [ ] H537 | hub | Requisition-rutan (Ola 2026-10-20): stor, rörig, bryter det fysiska. Den upprepar banorna och intel som redan ligger på bordet. Ska vara ett skrivunderlägg på bordet med BARA två saker: nya enheter från ledningen som kort man drar av underlägget till reserven (RP dras), och uppgraderingar som en kort lista på ett andra ark. Ingen roster, ingen intel, inga Rest/Battle-knappar där. Level III/Full/Return hör till kortet på bordet (högerklick eller litet menyfält på kortet).
- [ ] H538 | molnbo | Mölnbo dag 2 (Ola 2026-10-20): zombier från tre håll (Norrängsvägen, Fagernäsvägen öst, Stenbyvägen syd) känns tokigt när berättelsen är att norrsidan faller. Ingångarna ska vara Järna-sidan: väg 57 norr och Norrängsvägen på norrsidan, plus längs spåret österifrån på södra sidan. Stenbyvägen syd bort från dag 2 (eventuellt ett vilande hus i stället).
- [x] H539 | kampanj | Dagnumret: HUD, introkort och bord visar banans dag ("Day 2") men Ola väntar sig kampanjens dag (Mölnbo dag 2 = dag 9 i bågen). Visa kampanjdagen stort (löpande räkning) och banans dag litet ("Mölnbo · 2"). Eget pass efter 0.21.4: Hagstumosse kortas till bågens 4 dagar (kampanjplan avsnitt 10): Ishallen dag 4 bara civila under evakuering, dag 5-6 Hemvärnet 1-2 enheter + radio/Move dag 6, Vikingavägen dag 7 EN dag från väst/syd/nord. Balans och fingeravtryck om, sparfil migreras (aldrig radera). Då blir Mölnbo dag 1 = dag 8. Klart i 0.22.0: Ishallen 3 dagar, Vikingavägen 1, Mölnbo dag 1 = dag 8; sparfilen migreras med kopia (horde.save.arc).
- [ ] H540 | molnbo | Efter omritningen finns för få alternativa vägar att styra horden genom (Ola 2026-10-20). Lägg in gång- och cykelvägar och stigar som zombier kan ta: längs spåret på södra sidan, genomgångar mellan tomterna mellan Stenbyvägen och Trollvägen, en stig från Kvarnvägen mot Mjölnarstigen, så att barrikader ger riktiga omvägar. Stigar ritas som grus/upptrampat.
- [ ] H541 | molnbo | De stora stenarna längs Fagernäsvägen blockerar skottfält och ser slumpmässiga ut. Beskrivningen säger bergskärning i granit på andra sidan Fagernäsvägen: gör det till en låg bergvägg på vägens norra sida (mot spåret) som inte skymmer sikten från tomterna, eller ta bort stenarna.
- [x] H444 | hub | Truppkorten (Ola 2026-10-20): de hoppar, byter storlek och ordning när man flyttar ett kort. Ska vara fysiska kort/pjäser: fast storlek alltid (som mockupens stående kort), fasta platser (10 rutor i Into battle, ett fack för reserven), kortet GLIDER till sin nya plats med animation i stället för att allt ritas om, övriga kort står stilla, dra och släpp eller klick.
- [x] H445 | hub | Requisition (Ola 2026-10-20): den stora panelen bröt det fysiska bordet. En klämbräda med två saker: släppta enheter som kort med prislapp (dra till en plats, klick till reserven) och förrådets uppgraderingar som kort lista. Nivå, påfyllnad och Return på kortets meny (⋯).
- [x] H446 | molnbo | Dag 2 bara från Järnasidan (väg 57, Norrängsvägen, längs spåret österifrån); ingången söderifrån borta, i stället ett utbrott i ett hus vid Trollvägen (0.21.3).
- [x] H447 | ui | Kampanjens dag i HUD:en, introt och bordet (src/meta/campaign-day.js: E4 3, Ishallen 5, Vikingavägen 5, Mölnbo 3; Mölnbo dag 2 = dag 15), banans dag smått under ("Mölnbo · 2") (0.21.3).
- [x] H448 | molnbo | Fler vägar att leda horden genom: gång- och cykelvägar och stigar (längs spåret, mellan trädgårdarna, mot Mjölnarstigen, Trollvägen till Fagernäsvägen) i flödet (0.21.3).
- [x] H449 | molnbo | Stenblocken i trädgårdarna vid Fagernäsvägen bort; bergskärningen en låg vägg norr om vägen som inte skymmer (0.21.3).
- [x] H542 | hub | Aldrig native scrollbars på bordet (Ola 2026-10-20). Stores-listan och reserven: flera blad eller ett längre blad som man bläddrar (flik/hörn att vända), aldrig en rullist. Om rullning måste finnas: egen, i bordets stil.
- [ ] H543 | hub | Truppkorten: tänk om (Ola). Oklart vad de föreställer och de får inte plats. Alternativ att mocka: A) spelmarker/brickor (trä eller papp, NATO-liknande symbol + nummer) som ställs på kartan vid sektorn = i strid, och i en trälåda vid kanten = reserv; detaljer på en personalrulla; B) personalrulla: ett maskinskrivet blad med en rad per enhet och en kryssruta Battle/Reserve, blyertskryss; C) kortlåda (register) med flikar. Mockup kontrollrum-4 med A och B.
- [ ] H544 | hub | BESLUT (Ola 2026-10-20): trupperna som personalrulla (mockup kontrollrum-4b). Korten tas bort från bordet. Rullan på underlägget: en rad per enhet, kryssrutor Battle/Reserve i blyerts, trötthet som färgat ord, nivå som stjärnor, 20 rader per blad, fler blad clipsade under. Deploy kvar på underlägget. Released by command som rader på ett eget blad med pris. Inga native scrollbars (H542).
- [x] H545 | bjornlunda | Björnlunda spelbar som kampanjdag 11 till 12 (kampanjplan avsnitt 10): dag 1 försvar från väst, dag 2 evakuering och försvar från väst och syd. Bas, spawns, vågor, hus för garnison, balans och fingeravtryck, operation/table-rader, kampanjdag. Byggs efter Hagstumosse-passet (H539). Sedan Laxne-valet. GJORT 0.23.0: basen Wattrangsborg, dag 1 väst, dag 2 evakuering väst och syd, stigar, Quick jump, balans (docs/balance-log.md Björnlunda 0.23.0). Laxne-valet kvar (krok i src/data/bjornlunda-play.js).
- [ ] H546 | prov | Placeringsprovet (scripts/placement-harness.mjs) kraschar sidan vid längd 60 på Mölnbo dag 2 och Björnlunda dag 2 (omladdningen före gesterna, "Target page closed"). Fanns före Björnlunda-grenen (Mölnbo dag 2 kraschar likadant). Kort längd (--n 20) är grön. Layoutprovet kraschade en gång likadant (bordet, direkt efter placeringsproven i samma körning); ensamt grönt.
- [x] H503 | hub | BESLUT (Ola 2026-10-20): trupperna som personalrulla (mockup kontrollrum-4b). Korten tas bort från bordet. Rullan på underlägget: en rad per enhet, kryssrutor Battle/Reserve i blyerts, trötthet som färgat ord, nivå som stjärnor, 20 rader per blad, fler blad clipsade under. Deploy kvar på underlägget. Released by command som rader på ett eget blad med pris. Inga native scrollbars (H542).
- [x] H547 | verktyg | Huvudlösa kontroller (layout, placement, slice1, speltest) drar 900 % CPU: utan grafikkort ritas 3D-scenen i mjukvara (SwiftShader). Kör alla huvudlösa körningar med låg prioritet (taskpolicy -b / nice 20) via ett gemensamt startskript, prova --use-angle=metal i headless för riktig GPU, och sänk upplösning/fps i kontrollerna (t.ex. 1024 px och pausad renderloop mellan skärmbilder). Agentbriefar ska kräva lågprioritetskörning. KLART 0.22.2 (gren feature/lowprio): scripts/headless.mjs (taskpolicy -b + nice 19, Metal-GPU, ?mute, ?fps=2), npm run check:all. CPU-sekunder: slice1 976 -> 48, placement 2 411 -> 46, layout >3 400 (kraschade) -> 114; snitt 550-890 % -> 13-74 %.
- [x] H548 | hub | Tips-lappar på bordet äter första klicket var man än klickar (speltest 0.23.2); kvittera bara vid klick PÅ lappen eller Enter, andra klick går igenom till det man siktade på. Lappen får inte täcka fiendekortet. GJORT 0.23.3: mellan dagarna fångar bara lappen själv klicket (src/ui/coach.js through), fiendekortet och klämbrädans knappar och flikar täcks aldrig (COACH_HARD); layoutprovet table-tip-through: klick på en ruta går igenom, Deploy med lappen uppe startar dagen.
- [x] H549 | hub | Förstärkningar från ledningen (t.ex. Björnlunda dag 12) markeras på rullan: egen rubrikrad "Reinforcement · Hemvärnet" och raderna märkta NEW tills dagen spelats; skilj från "Released by command" (köp). GJORT 0.23.3: leveransen bl-2 har reinforce: 'Hemvärnet' (src/data/depot.js releaseKind), enheterna minns leveransen (rel), överst på rullan under rubriken med NEW i nivåkolumnen tills dagen spelats; fliken heter "Released by command · N to buy".
- [x] H550 | balans | Björnlunda: för mycket pengar kvar (805 $ dag 11, 1 258 $ dag 12) och 60-70 s svans med 2-4 bjässar. Trimma inkomst och svansregeln. GJORT 0.23.3: bounty 0,75 och 0,7, tail.brutes 4 (bjässarna skyndar genast när högst fyra lever). blNear kvar 682 och 465-599 $; lägre dag 11 fäller blNormal. docs/balance-log.md Björnlunda 0.23.3.
- [x] H551 | ui | "held, 4 days" och "held, 3 days" överlappar vid Gnesta på kartbladet; Smedjevägen-varningen visar ingen ny rutt; en taggtrådsplacering nekades tyst. GJORT 0.23.3: pennraderna ställs fritt (src/ui/table.js penSpots), förhandsvisningen ritar bara de ändrade vägarna, bredare (layoutprovet hud-bjornlunda-detour), ett klick som rördes lite säger "Moved while clicking. Click again to place." (hud-bjornlunda-wire).
- [x] H552 | kampanj | Laxne-valet (kampanjplan avsnitt 10, beslut 2026-10-20): mellan dag 10 och 11 erbjuds valet på bordet: försvara Laxne (en dag, horden från norr, skolan som bas) eller släppa byn (ingen strid, sparad trupp, färre RP, Björnlunda dag 11 tyngre). Laxne spelbar som valfri dag. GJORT 0.24.0 (gren feature/laxne-choice): ordern med två rutor över bordet (src/ui/choice.js), Laxne en dag (src/data/laxne-play.js, skolan bas, 223 och Skottvångsvägen, evakuering), FALL BACK -150 RP, rapport, radio och första vågen +25 %, dagnumret i båda grenarna, balans båda grenarna (docs/balance-log.md Laxne 0.24.0).
- [x] H553 | karta | Gnesta västra rondell: förhandsvisning via OSM-pipelinen (refs i horde-refs/gnesta-vastra-rondell), inför dag 13, 15 och 19. Klart som preview (gnesta-vastra-rondell.html 0.1.0, 2026-10-21): spawns väster, utgångar österut, bas på Barrstigen (förslag), villaraden tillagd ur satellitbilden. Spelbana (dag 13, 15, 19) återstår.
- [ ] H554 | test | Layoutkontrollens scen "menu: ingen skylt hittades": startmenyn saknas 2 till 5 gånger av 8 laddningar (master och grenar). Hitta orsaken (laddningsmätaren? importmap-cache?) i stället för att köra om.
- [ ] H555 | laxne | Valets order (speltest 0.24.0): konsekvenserna ska stå på arket före krysset, i siffror: "Defend: one day, your troops tire. Fall back: −150 RP, bigger first wave at Björnlunda."
- [ ] H556 | laxne | Efter FALL BACK: lägesrapporten med "150 RP lost" och större våg hamnar under nästa order; ska ligga synlig. Laxne får ett märke på kartan (kryss, "lost"). Björnlundas intro nämner den större vågen.
- [ ] H557 | ui | Håll och dra för att sikta på ogiltig plats gör ingenting tyst; ge samma orsak vid pekaren som ett klick.
- [ ] H558 | laxne | Hotbladet nämner bara vandrare och löpare; lägg till bjässar och pansrade. "1 DAYS" → "1 day". Hordeetiketter staplas mitt upptill. 970 till 1 130 $ oanvänt per dag. Tipsrutor täcker förrådet.
- [ ] H559 | karta | Gnesta västra rondell spelbar som kampanjdag 13 (försvar mot förtrupper från väst, bågen avsnitt 10). Dag 15 (överkörda) och dag 19 (spår) senare, egna specar.
- [x] H560 | karta | Västerkärv: förhandsvisning via OSM-pipelinen (refs i horde-refs/vasterkarv) inför dag 14 (stigar, EPA, civila, någon Ksp). Klart som preview (vasterkarv.html 0.1.0, 2026-10-21): spawns på småvägar i väster och sydväst (extraRoads, antagna), utgångar österut och norrut, bas i boningshuset (förslag), stengärdsgårdar, traktor, grannens gård. Spelbana (dag 14) återstår.
