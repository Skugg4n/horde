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

- [ ] H058 | balans | Speltesta Gnesta Norr: dag 3 till 5 tar cirka 1000 s speltid och hp-faktorn är 7 till 9 (bjässarna blir mycket sega). Kortare vägar in eller färre men tuffare vågor?
- [ ] H059 | balans | Gnesta Norrs kurva har klippor i både hp och pengar (docs/balance-log.md 0.10.0). Speltesta dag 4 och 5 i händerna.
- [ ] H060 | gnesta-norr | De östligaste radhusen vid Östra Storgatan och garagelängorna finns inte än (spökhusen inne i spelytan togs bort). Lägg till som riktiga längor om det behövs.
- [ ] H061 | sim | Fil-vakten (laneGuard i src/sim/route.js) gäller bara Gnesta Norr. Pröva den på Gnesta och E4 med nya kvitton.
- [ ] H062 | ux | Valsvägen och Hambovägen är återvändsgator som horden aldrig använder. Speltesta om de ska få en roll (t.ex. en ingång senare).
- [ ] H063 | grafik | Radhusens framsida ligger i skugga under takfoten i spelets ljus; de vita dörrarna syns som grå. Pröva lite ljusare eller kortare takfot.
