# Horde v1: sorterad todo

Läget 2026-11-16, master 0.25.1. Sorterat ur todo.md (161 öppna rader). Inget är ändrat i koden eller bockat i todo.md.

**v1 =** hela bågen dag 1 till 21 spelbar från start till slut med Olas texter, inga blockerande buggar, ett riktigt slut med eftertexter (inklusive OpenStreetMap, ODbL), ljud till de nya delarna och en sparfil som håller hela vägen.

Spelbart i dag: dag 1 till 13 (E4, Hagstumosse, Mölnbo, Laxne-valet, Björnlunda, Västra rondellen). Dag 14 till 21 finns bara som utkast (docs/superpowers/specs/2026-10-21-slutspelet-design.md). Det är det som gör v1 stort: åtta dagar med fem nya mekaniker.

Om beläggen: "CHANGELOG" betyder att changeloggen säger att det är gjort. Det är inte provat i spelet nu; bocka av först efter en titt. Sådant som kunde kontrolleras i koden har kontrollerats och står med fil.

## 1. Redan gjort men inte avbockat (41)

- H005: Esc öppnar menyn mitt i en dag (CHANGELOG 0.21.0, Esc-ordningen i 0.17.x).
- H011: repot finns, `origin` = github.com/Skugg4n/horde (git remote).
- H035: GitHub Pages är live och publicerat (CHANGELOG 0.21.2).
- H071: Hemvärnet som grupp som tar skydd (src/sim/squad.js, CHANGELOG 0.10 till 0.13).
- H072: civila frivilliga finns som typ i spelet (CHANGELOG 0.13.0, Hagstumosse dag 1).
- H073: Hagstumosse med Vikingavägen och Dansutvägen är byggd (CHANGELOG 0.22.0).
- H190: kameran visar basen vid dagstart (CHANGELOG 0.16.1).
- H191: vägetiketterna omgjorda (CHANGELOG 0.16.1).
- H192: E4 dag 2 och 3 omtrimmade (CHANGELOG 0.16.1).
- H193: VICTORY och "fallen silent" samt rullisten (CHANGELOG 0.16.1).
- H194: Frivilliga och Hemvärnet större och lättare att hitta (CHANGELOG 0.16.1).
- H214: inlärningen speltestad, pausernas antal och plåtarna (CHANGELOG 0.16.1, lektionsplåten).
- H200: Mölnbo byggt med Folkets hus som bas (CHANGELOG 0.17.0).
- H201: Gnesta som en sektor, gemensam trupp-pool (CHANGELOG 0.22.0, Hagstumosse en sektor).
- H202: sektorn heter Hagstumosse (CHANGELOG 0.22.0, kartbordet).
- H230: Lästringes omgivning utbyggd (CHANGELOG 0.16.3).
- H231: skyltarna flyttade till vägkanten (CHANGELOG 0.16.3).
- H232: gräs på vägbanan borta (CHANGELOG 0.16.3).
- H305: panelens fasta bredd, text radbryts (CHANGELOG 0.17.2).
- H306: ammolåda och sandsäckar syns nu (CHANGELOG 0.17.2).
- H307: hus och stenar på vägen rättade (CHANGELOG 0.17.2).
- H308: Mölnbo fylligare, träd och häckar (CHANGELOG 0.17.2).
- H309: genomskinliga hus vid scroll (CHANGELOG 0.17.2).
- H439: taggtråd säger inte längre "Horde rerouting" (CHANGELOG 0.19.2, H482).
- H500: kartbordet v3 (CHANGELOG 0.21.0).
- H504: startmenyn saknades i layoutprovet, läget heter nu "loading" (CHANGELOG 0.24.1).
- H505: valets konsekvenser står på ordern före krysset (CHANGELOG 0.24.1).
- H506: lägesrapporten och märket "lost" efter FALL BACK (CHANGELOG 0.24.1).
- H507: tyst nej vid sikta på ogiltig plats borta, skäl vid pekaren (CHANGELOG 0.24.1).
- H508: hotbladet nämner alla typer, "1 day", etiketter, tipsrutor (CHANGELOG 0.24.1).
- H529: layoutprovet väntar på bordets första ritning (CHANGELOG 0.21.3).
- H530: hierarki på bordet, en aktuell lapp (CHANGELOG 0.21.3).
- H531: stämplarna hålls inom arket (CHANGELOG 0.21.3).
- H533: Fjäderfabriken-etiketten bort i spelet (CHANGELOG 0.24.0). Kvar som text i förhandsvisningens data (src/data/laxne.js rad 458); rör inte spelet.
- H536: truppkorten med fasta platser (CHANGELOG 0.21.4, sedan ersatta av rullan, H544).
- H537: Requisition-rutan omgjord (CHANGELOG 0.21.4).
- H538: Mölnbo dag 2 från Järna-sidan (CHANGELOG 0.21.5).
- H540: fler stigar att leda horden genom (CHANGELOG 0.21.5).
- H541: bergskärningen i stället för stenarna (CHANGELOG 0.21.5).
- H544: personalrullan (CHANGELOG 0.21.7).
- H559: Västra rondellen spelbar som dag 13 (CHANGELOG 0.25.0, src/data/gnesta-vastra-rondell-play.js).

## 2. Måste för v1 (48 gamla rader plus 17 nya)

### Spel och balans
- H003: prestanda, slå ihop sandsäckarna, mät på Retina. Sluttbanorna blir tyngre; mät i NEW-14.
- H267: Ishallen dag 4 kräver andra försöket i alla seeds, känns det som en vägg?
- H271: Ishallen dag 2, lektionens barriär leder horden in på villagatorna utan förvarning (bas 20 till 1).
- H272: Ishallen dag 3, marginalen för liten (bas 4).
- H294: Mölnbo dag 3 "The last train" och dag 4:s tågklocka motsäger varandra, berättelsen per dag ska hänga ihop.
- H295: Mölnbo dag 4 för svår, resultatrutan täcker tågets avgång, över $ 1 000 kvar.
- H488: $ 700 till 1 300 oanvänt varje dag; något att köpa eller mindre i kassan.
- H490: tågmarkeringen pekar på perrongen men det som lönar sig är södra trappans fot; peka rätt och ge längre tid.
- H526: Quick jump-truppen för Vikingavägen svagare än balansens; ge hoppet balansens ankomst.
- H528: snubblet på Mölnbo, var tredje löpare, speltesta om det är för ofta.
- H498: slutet i Björnlunda (dag 20 och 21): spec finns som utkast i slutspelet-design, kräver Olas ja per avsnitt.
- H499: nya mekaniker som behöver spec: reträtt dag 16, pushback dag 18, spår dag 19. Utkast finns; fråga Ola de fyra frågorna längst ner i slutspelet-design.
- MB01: speltesta Mölnbo dag 1 till 5 med Ola, särskilt bron dag 4 och sista tåget.
- MB02: Olas svar på de öppna Mölnbo-frågorna (de flesta besvarade 2026-10-20 i docs/ola/svar-2026-10-20.md; stäm av resten).
- MB05: Mölnbo dag 4 och 5 knivseggar, mjuka upp efter speltestet.
- H425: speltesta autovik och sanity-stapeln med human-ux-tester, sedan Ola.
- H268: speltesta Hagstumosse dag 1 med en ny spelare ("East first, then west").
- NEW-1: dag 14 Västerkärv spelbar (karta efter förhandsvisningen H510, stigar, civila, en Ksp 90, EPA).
- NEW-2: rörlig EPA under våg (Move; behövs dag 14 och 21).
- NEW-3: dag 15 överkörning: tredje resultatet "Withdrawn", samlingsruta med nedräkning.
- NEW-4: dag 16 reträtt i tre steg: flera baser och linjer, röda zoner som flyttar (återanvänd Mölnbo dag 3).
- NEW-5: dag 17 last stand: två baser samtidigt (brandstationen, Elektron), båtar vid bryggan till Prästön, civila i kö.
- NEW-6: dag 18 pushback: granatkastare m/84 med markerat mål (8 s laddning), Ksp 88 i antal, pansarskott; linjen flyttas fram våg för våg (Olas beslut A).
- NEW-7: dag 19 spåren: trådar på marken, den avvikande zombien som drar andra med sig.
- NEW-8: dag 20 monstret som växande zon i flödesfältet plus spridaren (ny zombietyp). Störst enskilda bygget, egen plan.
- NEW-9: dag 21 eskorten: EPA med sprängämnen, lugna stunder, 10 sekunders nedräkning, smällen.
- NEW-10: ett balanspass över dag 14 till 21 i balansskriptet (alla seeds, 1 till 3 försök för vanlig spelare) och ett helspeltest dag 1 till 21 med ny spelare, sedan Ola.

### Kartbord
- H493: ledningscentralens texter per dag (order, lägesrapport, radio och TV-inslag) med en anledning per dag. Dag 14 till 21 saknas helt.
- H170: speltesta operationskartan och förrådet i händerna på dator.
- NEW-11: bordet för dag 14 till 21: markörer, lappar, rapporter, Laxne-krysset som minne, nya sektorer på kartbladet.
- NEW-12: det riktiga slutet i stället för slutbladet "Campaign continues in a later version" (H561): slutrapport, trådarna slocknar en i taget på bordets karta, "The source is gone. The herd has no head. We hold."
- [x] NEW-13 (GJORT 0.26.8: src/ui/credits.js, från menyn och slutbladet): eftertexter: tack, Ola och medverkande, och kartdata (c) OpenStreetMap contributors under ODbL med länk till openstreetmap.org/copyright. I dag står ODbL bara som kodkommentar (src/render/osm-world.js, src/data/*.js), ingen text syns för spelaren. Nåbar från menyn och efter slutet.

### UI
- H225: smårester: "Volunteers · Volunteers", röd BASE-siffra på full bas, Runner-porträttet bakifrån, "×3" oförklarat, SECTOR E4 krockar med vägnamnet, stjärnraden på VICTORY, Space stänger tips i stället för att starta vågen. Kolla vilka som redan åtgärdats.
- H273: "Sector quiet" visas fast 29 zombier går (src/main.js rad 3205).
- H274: "6 of 8 units deployed" byt till "Deploy up to 8 · you have 6" (finns inte i koden).
- H275: tipsrutor täcker kortradens rubrik, etiketter krockar på Ishallen, "Base under attack!" kvar efter vågen.
- H276: korttext 8,5 till 10,5 px för liten, överstruken nolla ser ut som 6.
- H277: pengar som blir över försvinner tyst; säg det.
- H278: snabbvalen byter betydelse mellan kartor; ett fast schema (delvis 0.16.4, kolla rest).
- H292: hörnetiketter ritas över varandra, dagrutan skriver ihop rader.
- H293: vågräknaren visar olika våg i dagrutan och resultatrutan (Mölnbo).
- H407: "To reserve" i panelen, "18 needed" bredvid "Get 18 of 24".
- H436: huset lyser grönt för kort som inte får gå in.
- H437: "Start wave" kändes död, "Units left in reserve. Start anyway?" ska stå på knappen.
- H438: samma tips pausar om och om igen.
- H441: Jump to dag 5 startar kameran inzoomad på en tom väg.
- H473: "SECTOR E4" på operationskartan ligger över sig själv.
- H485: "Väg 57." och "Väg 57 again." förstås inte ensamma.
- H486: underrättelsernas riktningar ("north north", "from the east" fast söderifrån).
- H487: Mölnbo dag 5 startar kameran på tomt fält, enhetspanelen klipps vid 800 px, hovringsrutor kvar.
- H489: dag 3 "The train is away with everyone on board" med 30 zombier kvar; vilka är "everyone"?
- H491: kvarvarande lappöverlapp (plattformslappen, enhetslapp över DEPLOY, hovringstips över vågskylt).
- H492: "Horde rerouting ... remove it" och "Every road shut" säger emot varandra.
- H527: operationskartans "Same district, wider map." före Mölnbo dag 2, SECTOR E4 mot rutnätsnummer, Walkers-kortet säger "E4" på Mölnbo, dag 2:s resultat om norra sidan.

### Kartor
- H320: Gnesta centrum: brandstationen, Elektron och Frejaskolan som försvarspunkter (dag 16 till 18). Förhandsvisningen finns (gnesta-centrum.html); spelbar karta saknas.
- H510: Västerkärv, förhandsvisning via OSM-pipelinen inför dag 14.
- NEW-14: Björnlunda dag 20 och 21 med vagnen strax väster om stationen, bara en del av kartan placerbar (östra tredjedelen, sedan två tredjedelar).

### Ljud
- H052: Ola väljer springarskrik A eller B (en uppgift för Ola).
- H270: Ola lyssnar på taggtråden i ljudbordet.
- MB06: ljud för tåget, avgångsskylten och trafikljusen.
- NEW-15: ljud för de nya delarna: granatkastare (avfyring och nedslag), båt och brygga, trådarna och monstret (puls, andning), spridaren, EPA:ns motor och smällen, slutmusik och eftertexter.

### Verktyg och publicering
- H172: kontrollera MCF:s namn mot källa (Myndigheten för civilt försvar, ersatte MSB 2026-01-01) innan publicering.
- H535: prov som läser index.html och kräver exakt en importmap och inga konfliktmarkörer, plus curl mot live efter varje publicering. Finns inte: tests/importmap.test.js jämför bara mot render(), kontrollerar inte markörer, och inget script kör curl.
- [x] NEW-16 (GJORT 0.26.8 så långt bågen är byggd, dag 15 och 14: tests/save-arc.test.js och tests/fixtures/saves-0.25.1.json; provet följer datan och tar med nya dagar av sig självt): sparfilen över hela bågen: ett prov som spelar dag 1 till 21, sparar efter varje dag och läser tillbaka; migrering från 0.25.x-filer när dag 14 till 21 tillkommer (src/meta/save.js, progress.clampDays, kampanjens slut följer datan via campaignEnd i src/meta/table.js, och försvinner av sig självt när dag 14 byggs).
- NEW-17: versionen 1.0.0, ändringslogg, README och en publiceringskontroll (npm run check:all grönt, curl mot live) före lansering.

## 3. Efter v1 (38)

- Balans och speltest av gamla dagar: H001, H002, H050, H051, H055, H196, H427, H029.
- Mobil och pekskärm (beslut: v1 är dator): H004, H044, H053, H152.
- Grafik: H006, H056, H063, H153, H314.
- UI och skärmläge: H128, H173, H197, H198, H224, H472, H474.
- Innehåll och spel: H008 (fler vapen utöver granatkastaren), H009 (uppsvälld och skrikare; spridaren är NEW-8), H025, H057, H150, H184, H442, H471.
- Kartor och design: H310 (natt, prototyp först), H330 (hela Gnesta från OSM), MB03 (civila till tåget över gångbron), MB04 (siktlinjer med brodäcket).
- Verktyg: H049 (launch.json i nexus), H546 (placeringsprovet kraschar vid längd 60).

## 4. Stryk (34)

- H007: ersatt av bågens kartor, ingen Bensinmack, Bro eller Hamn i planen.
- H017: kameran zoomar ut och banorna är större sedan Mölnbo (0.20.1), inget kvarvarande.
- H021: E4 och Gnesta binds inte ihop, de är skådeplatser i bågen.
- H024: huspositioner finns (grupp i hus), granater och molotovs finns inte i planen.
- H034, H043, H059, H064, H065, H084, H111, H112, H127, H144, H151, H167, H168, H169, H183: gamla Gnesta South och North-balansen och öppningen, bort sedan Hagstumosse byggdes om efter bågen (0.22.0).
- H060: gamla North-radhusen, kartan är omgjord.
- H062: Valsvägen och Hambovägen på gamla North-kartan.
- H066, H085, H226: speltester av 0.10 och 0.16, ersatta av NEW-10.
- H070: dubblett av H008, arsenalen finns (Ksp 58, Ksp 88, Ak 5, Psg 90).
- H074: dubblett av H052.
- H143, H182: E4 dag 1 och 2 balans från före 0.16.1, ersatt av H196 och NEW-10.
- H171: fler sektorer (Trosa, Nyköping), bågen har fast antal skådeplatser.
- H185: korten glider åt vänster, korten är borta sedan personalrullan (H544).
- H269: dubblett av H278 (grå kort för det som inte finns).
- H453: förrådet som bord med lappar och kort, ersatt av personalrullan.
- H534: beslutslogg (pushback A, Laxne-valet, dag 19, vagnen), redan inskriven i kampanjplanen och slutspelet-design, kvarstår som NEW-6 till NEW-9.
- H543: korten tänks om, avgjort av H544 (personalrullan).

## 5. Sammanfattning

| Grupp | Gamla rader | Nya (NEW) |
|---|---|---|
| Redan gjort men inte avbockat | 41 | 0 |
| Måste för v1 | 48 | 17 |
| Efter v1 | 38 | 0 |
| Stryk | 34 | 0 |
| Summa | 161 | 17 |

Måste per område (gamla plus nya): spel och balans 17 + 10, kartbord 2 + 3, UI 22 + 0, kartor 2 + 1, ljud 3 + 1, verktyg 2 + 2.

## Öppna beslut som styr v1

1. Är dator tillräckligt för v1 (mobil och pekskärm efter)? Lista 3 utgår från det.
2. Slutspelet-design: Olas fyra frågor (Withdrawn dag 15, vad mer dag 18, brandstationen som hubbens vagnhall, monstret som rutor eller varelse) avgör NEW-3 till NEW-8.
3. Ordning: NEW-8 (monstret) är det största bygget och bör planeras först; dag 14 till 17 går att leverera i omgångar.
