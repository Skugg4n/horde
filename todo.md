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
- [ ] H103 | framtid | Kampanjen börjar med bara Hemvärnet; riktiga trupper låses upp successivt: infanteri (Ak 5-grupp), kulsprutegrupp, fallskärmsjägare senare, m.fl. Riktiga trupper som grupper med skydds-AI som Hemvärnet.
- [ ] H104 | kampanj | E4 = militär vägspärr med riktiga trupper (smak på full kraft). Gnesta = bara Hemvärnet som successivt får bättre försvar. Övergångstext: "The roadblock at E4 has fallen silent. Gnesta has only its Home Guard."
- [ ] H105 | kampanj | Gnesta dag 1: civila (jaktgevär, hagel) med uppdrag "Hold until the civilians reach the ice rink" (går att lyckas/misslyckas, kort). Hemvärnet tar över dag 2.
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
- [ ] H130 | kampanj | E4 utan Hemvärnet: riktig militär (infanterigrupp med Ak 5 m.m.) i stället. Del av H104.
- [ ] H131 | grafik | Soldater som "spinner" liggande: vridning runt höften med begränsad fart, krypande, skjutvinkel ~120°, blandade ställningar (huk/knä/liggande), tomgångsliv (andas, spanar, laddar om). Pågår i 0.12.2.
- [ ] H132 | vapen | Skjutvinkel per vapenklass: infanteri/Hemvärnet flexibelt (per soldat), Ksp 90 ~180° snabb, Ksp 58 ~120°, Ksp 88 ~90° långsam vridning, Psg 90 60-90°. Placering: klicka-och-dra för att sikta, vanligt klick = auto mot hordens väg; Rotate-knapp i panelen; Move väljer riktning på nytt.
- [ ] H133 | vapen | Bunker med kulspruta: fast befästning, ~90° skottglugg, tålig, dyr, lång byggtid, går ej att flytta. Passar E4-vägspärren.
- [ ] H134 | spel | Riktig förflyttning: besättningen springer synligt med vapnet längs vägsökningen och är sårbar på vägen. Infanteri/Hemvärnet (senare insatsstyrka MP5) snabbt; Ksp 90-lag (skytt + ammunitionsbärare) packar på några s och springer; Ksp 58 tre man, långsammare; Ksp 88 monterad kan EJ flyttas (bara säljas); Psg 90 skytt + observatör smyger.
- [ ] H135 | vapen | "Bunker" = improviserad pillbox: EPA-traktor/gammal bil med svetsade plåtar, skottgluggar och Ksp i luckan (rost, olikfärgad plåt, LGF-skylt kvar). Snabb att bygga, tålig, ~90° skottglugg; kan krypa långsamt till ny plats. Ersätter betongbunker i H133.
- [ ] H136 | ux | M = Move; minikartan flyttar till Tab. Waypoints: klick = flytta direkt (kortaste väg), Shift-klick lägger till waypoints (linje syns), slutpunkt + klicka-och-dra för riktning. Framtid: eld under förflyttning, språng skydd till skydd.
