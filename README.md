# Horde

Ett grusigt isometriskt tornförsvar med zombier. Du håller en vägspärr på E4 i dagsljus: ställ ut kulsprutor där de ser vägen (hus skymmer), lägg taggtråd och betongblock på vägen och stoppa horden innan den når basen. Varje dag har tre vågor. Förlorar du behåller du forskningen och kan köpa bättre vapen och hinder innan du försöker igen.

Version 0.6.0: två banor, E4 (dag 1 till 3) och Gnesta (dag 1 till 5, låses upp när E4 dag 3 är klar; basen är ishallens entré), ett köpflöde (välj i köpraden, ställ ut på kartan), befästa positioner, fri placering med siktlinjer, två vapen (M249 och M2 .50 cal), taggtråd och betongbarriär, tre sorters zombier (Walker, Runner, Brute), granatlådor, forskning mellan dagarna och en meny med paus. Framsteget sparas i webbläsaren.

Player text in English (owner decision 2026-10-15). Docs stay Swedish.

## Kör

```
python3 -m http.server 8141 --directory ~/Projects/horde
```

Öppna sedan http://localhost:8141/. Inget byggsteg: vanliga ES-moduler, Three.js 0.160 hämtas via importmap.

Tangenter: 1-0 tar upp en sak ur köpraden (klick ställer ut den, Shift behåller den i handen, Esc eller högerklick släpper den), Mellanslag startar vågen, F växlar fart, Enter går vidare från dagens intro, Esc stänger panelen.

Felsökning: med http://localhost:8141/?debug finns `window.__horde` i konsolen (simuleringen, renderaren med `renderer.info`, scenen och kameran).

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
| `src/data/` | Speldata: bana, vågor, vapen, hinder, zombier, forskning |
| `src/sim/` | Simuleringen (ingen grafik, ingen DOM): vägen, rutor, slump, stats, stegfunktionen |
| `src/meta/` | Framsteg mellan dagar och sparning i localStorage |
| `src/render/` | Three.js: scen och ljus, byggsats och palett (`kit.js`), modeller, hälsoringar (`rings.js`), värld, effekter, vyn och klick i scenen |
| `src/ui/` | HUD, paneler, skyltar, ikoner och format |
| `tests/` | Tester för simulering, sparning, balans och version |
| `scripts/balance.mjs` | Balanssimulering |
| `docs/balance-log.md` | Varje balansändring med skäl och mätning, samt prestanda |
| `docs/art-bible.md` | Stilbibeln |
| `docs/lookbook-0.2.2.png` | Skärmbild av visningssidan för den här versionen |
| `docs/playtests/` | Speltester |
| `mockups/` | Grafikprov och tidiga HUD-skisser |

## Grafik

Allt byggs i kod, inga bildfiler. Läs stilbibeln i [docs/art-bible.md](docs/art-bible.md) innan du lägger till något, och visa nya modeller på visningssidan (`lookbook.html`) först. Skärmbilden för 0.2.2 ligger i [docs/lookbook-0.2.2.png](docs/lookbook-0.2.2.png).

## Ändringar

Se [CHANGELOG.md](CHANGELOG.md).
