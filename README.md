# Horde

Ett grusigt isometriskt tornförsvar med zombier. Du håller en vägspärr vid E4:s avfart i Lästringe i dagsljus: ställ ut kulsprutor där de ser vägen (hus skymmer), lägg taggtråd och betongblock på vägen och stoppa horden innan den når basen. Varje dag har tre vågor. Förlorar du behåller du forskningen och kan köpa bättre vapen och hinder innan du försöker igen.

Version 0.15.0: tre banor, E4 vid trafikplats Lästringe (dag 1 till 3; horden kommer längs motorvägen och upp för avfarten), Gnesta (dag 1 till 5, låses upp när E4 dag 3 är klar; basen är ishallens entré) och Gnesta Norr (dag 1 till 5, låses upp när Gnesta dag 5 är klar; horden kommer norrifrån förbi radhusen), ett köpflöde (välj i köpraden, ställ ut på kartan), befästa positioner, fri placering med siktlinjer, Försvarsmaktens vapen (Ksp 90, Ksp 58, Ksp 88, Ak 5 med granattillsats och Psg 90, som också kan ligga på hustak), Hemvärnet (en grupp som själv tar skydd, med egen forskning), taggtråd och betongbarriär, tre sorters zombier (Walker, Runner, Brute), granatlådor, forskning mellan dagarna och en meny med paus. Framsteget sparas i webbläsaren.

Player text in English (owner decision 2026-10-15). Docs stay Swedish.

## Kör

```
python3 -m http.server 8141 --directory ~/Projects/horde
```

Öppna sedan http://localhost:8141/. Inget byggsteg: vanliga ES-moduler, Three.js 0.160 hämtas via importmap.

Tangenter: två siffror tar upp en sak ur köpraden, först kategorin (1 Defenses, 2 Units) och sedan saken (2-2 Ksp 90; Esc eller samma kategori igen backar; klick ställer ut den, Shift behåller den i handen, Esc eller högerklick släpper den), Mellanslag startar vågen, F växlar fart, Enter går vidare från dagens intro, R visar och döljer hordens väg (Gnesta), Esc gör en sak per tryck (släpper kortet, stänger panelen, sist pausmenyn).

Felsökning: med http://localhost:8141/?debug finns `window.__horde` i konsolen (simuleringen, renderaren med `renderer.info`, scenen och kameran). Med ?test finns bara `__horde.advance(sekunder)` och läget, för speltestare som vill driva klockan utan att låsa upp något (0.14.1).

## Testa

```
npm test          # alla tester (node --test)
npm run balance   # simulerar dagarna och skriver ut kurvan
```

Simuleringen körs utan grafik, så både tester och balanssimulering går i Node.

## Filkarta

| Sökväg | Innehåll |
|---|---|
| `index.html`, `styles.css` | Spelets sida och utseende på skyltar och HUD |
| `lookbook.html` | Visningssida med alla modeller i spelets ljus |
| `soundboard.html` | Ljudbord: varje ljud och musikläge går att spela upp |
| `src/audio/` | Ljud och musik, syntetiserade (mix.js ren logik, voices.js, music.js, audio.js) |
| `src/main.js` | Spelet: meny, dagar, vågor, klick och bildrutor |
| `src/version.js` | Versionsnumret som syns i hörnet |
| `src/data/` | Speldata: banorna (`maps.js`, `e4-lastringe.js`, `gnesta.js`, `gnesta-norr.js`), vågor, vapen, hinder, zombier, forskning |
| `src/sim/` | Simuleringen (ingen grafik, ingen DOM): vägen, rutor, slump, stats, stegfunktionen |
| `src/meta/` | Framsteg mellan dagar och sparning i localStorage |
| `src/render/` | Three.js: scen och ljus, byggsats och palett (`kit.js`), modeller, hälsoringar (`rings.js`), värld (`e4-world.js` och `e4-kit.js` för E4, `gnesta-world.js` och `gnesta-kit.js` för Gnesta), effekter, vyn och klick i scenen |
| `src/ui/` | HUD, paneler, skyltar, ikoner och format |
| `tests/` | Tester för simulering, sparning, balans och version; `tests/fixtures/straight-road.js` är den gamla raka E4-vägen som simuleringens prov mäter på |
| `scripts/balance.mjs` | Balanssimulering |
| `docs/balance-log.md` | Varje balansändring med skäl och mätning, samt prestanda |
| `docs/art-bible.md` | Stilbibeln |
| `docs/lookbook-0.2.2.png` | Skärmbild av visningssidan (0.2.2) |
| `docs/e4-lastringe-*.png` | Skärmbilder av E4 vid Lästringe (0.15.0): översikten, vägspärren, dag 1 till 3, visningssidan |
| `docs/norr-*.png` | Skärmbilder av Gnesta Norr (0.10.0): radhusen, spärren, horden, skytten på taket, Hemvärnet vid muren, visningssidan |
| `docs/playtests/` | Speltester |
| `mockups/` | Grafikprov och tidiga HUD-skisser |

## Grafik

Allt byggs i kod, inga bildfiler. Läs stilbibeln i [docs/art-bible.md](docs/art-bible.md) innan du lägger till något, och visa nya modeller på visningssidan (`lookbook.html`) först. Skärmbilden för 0.2.2 ligger i [docs/lookbook-0.2.2.png](docs/lookbook-0.2.2.png).

## Kartdata

Björnlunda (`bjornlunda.html`, förhandsvisning) bygger på OpenStreetMap: Map data © OpenStreetMap contributors (ODbL), https://www.openstreetmap.org/copyright. `scripts/osm-to-map.mjs <plats>` gör om en plan.json ur `~/Projects/horde-refs/<plats>/` till en kartmodul i `src/data/` (inställningarna i `scripts/osm-places/`).

Gnesta centrum (`gnesta-centrum.html`, förhandsvisning) bygger på samma konverterare och OpenStreetMap: Map data © OpenStreetMap contributors (ODbL). En stor karta i fyra delar (1-4 hoppar till en del, 0 visar hela); husens karaktär efter Gnesta kommuns kulturmiljöanalys (2023) och Commons-fotona i `~/Projects/horde-refs/gnesta-centrum/`.

Laxne (`laxne.html`, förhandsvisning) bygger på samma konverterare och OpenStreetMap: Map data © OpenStreetMap contributors (ODbL). Byn vid Klämmingen norr om Björnlunda: horden kommer längs väg 223 från norr, utgångarna går söderut (223 förbi skolan och Hebyvägen), skolan är basen och sjön en stängd flank. OSM har 71 hus; 42 till är tillagda för hand (`extraBuildings` i `scripts/osm-places/laxne.mjs`, läge och storlek avlästa ur en kartbild i `~/Projects/horde-refs/laxne/`, aldrig bilden själv) och har `added: true` i kartmodulen. Sjösidan (0.20.0): skogen som OSM saknar mellan byn och sjön, strandkanten (vass och stenar, `shore` i inställningarna) och fyra bryggor. Skärmbilder: `docs/laxne-preview-oversikt.png`, `docs/laxne-preview-sjon.png`, `docs/laxne-preview-norr.png`.

## Ändringar

Se [CHANGELOG.md](CHANGELOG.md).
