# Horde todo

Format: `- [ ] id | område | sak`. Bocka av med [x] när det är gjort.

- [ ] H001 | balans | Dag 1 och 2 är för lätta, basen tar aldrig skada i speltesterna. Höj trycket utan att tappa lärandet.
- [ ] H002 | balans | Dag 3 har ett smalt fönster, bjässarnas hp avgör mycket. Speltesta med Ola.
- [ ] H003 | prestanda | M2 nivå 3 är 120 meshar. Slå ihop sandsäckarna (mål 60). Mät på Retina.
- [ ] H004 | ux | Panelens placering är bara testad på 1400x900 och 1100x720, inte mobilbredd.
- [ ] H005 | ux | Ingen väg tillbaka till menyn från intro eller mitt i en dag.
- [ ] H006 | grafik | Bjässar som bara tar 40 % av taggtrådens bromsning syns inte i grafiken.
- [ ] H007 | innehåll | Fler banor: Bensinmacken, Bron, Köpcentret, Hamnen (se design).
- [ ] H008 | innehåll | Sena vapen: Barrett M82, Mk 19, granatkastare 81 mm, Carl-Gustaf, Minigun.
- [ ] H009 | innehåll | Fler zombietyper: krypare, bepansrad, uppsvälld, skrikare.
- [ ] H010 | ljud | Ingen ljudsättning ännu.
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
- [ ] H034 | balans | Gnesta: speltesta dag 5 (smal, 2 till 5 kvar för policyn) och om hp-faktorn känns rätt i händerna. Forskningen tar slut runt dag 4, så omförsök hjälper lite.
- [x] H042 | spel | Fri placering av vapen med siktlinjer (hus skymmer), placeringsläge med spöke och sikt, More positions I-III (0.5.0).
- [ ] H043 | balans | Gnesta dag 3: naive vinner med full bas medan smart förlorar första försöket. Speltesta om spärren vid rondellen är rätt när skogsvägen öppnar.
- [ ] H044 | ux | Placeringsläget är bara testat headless på 1400x900, inte på mobilbredd eller med pekskärm.
- [ ] H035 | publicering | GitHub Pages: JA (Olas beslut 2026-10-15). Repo + Pages efter sammanslagningen.
- [ ] H036 | grafik | Rensa runt utplacerade pjäser: häckar huggs ner, staket rivs, bilar knuffas undan/trashas, stubbar. Ska se ut som en befäst position man byggt.
- [ ] H037 | ux | Ett enda köpflöde: välj först vad du köper (snabbval 1-0), saken följer muspekaren tills du klickar ut den där den får stå. Gäller vapen, barrikader och taggtråd. Klick på gata/ruta öppnar inte längre en köppanel.
- [ ] H038 | ux | Tydligt vad man har råd med: allt man inte har råd med just nu är gråat.
- [ ] H039 | gnesta | Basen = ishallens entré (överlevare inne i hallen), inte mitt i rondellen. Rondellen blir sista försvarslinjen framför porten; skadeeffekter på hallens fasad/port.
- [x] H040 | gnesta | Söder om rondellen är det en stor parkering (och Gnesta sporthall), inte skog (gjort i 0.4.0).
- [x] H041 | gnesta | Ytterkanterna: dimma med skissiga spökhus; bara den aktiva kartan är skarp (gjort i 0.4.0). Grund för att expandera kartan senare.
