# Horde · stilbibel

Gäller från version 0.1.7. Förlagan är det godkända provet `mockups/prov-1-3d.html`. Allt nytt ska se ut som att det hör hemma där.

## Grundregel

Nya modeller visas i `lookbook.html` innan de används i spelet. Lägg till dem i visningssidan, titta på dem i spelets ljus och på spelets avstånd (knappen "Spelets avstånd"), först därefter in i spelet. Det gäller även HUD-delar som hör till scenen, som pilen där horden kommer in.

Skärmbild av visningssidan per version: varje version som ändrar grafiken får en skärmbild av `lookbook.html` (översikten, 1440 x 900) i `docs/lookbook-<version>.png`, till exempel `docs/lookbook-0.2.0.png`. Jämför med förra bilden innan versionen släpps.

Inga bildfiler. Allt byggs i kod med byggsatsen i `src/render/kit.js` (`mat`, `mesh`, `box`, `canvasTex`, `humanoid`). Modellerna bor i `src/render/models.js`.

## Palett

Alla färger finns i `PALETTE` i `src/render/kit.js`. Färgsträngar skrivs inte direkt i modeller, värld eller ljus; lägg till ett namn i paletten i stället. (Banornas rekvisita i `src/data/maps.js` får ange bilfärg och tunnfärg som data.)

| Grupp | Namn | Färg |
|---|---|---|
| Luft | dis (`haze`) | `#b9aa8c` |
| | himmelsljus / markljus | `#d6dbe0` / `#5b4a35` |
| | sol | `#ffdcae` |
| Mark | jord (`dirt`) | `#8c7b5c` |
| | asfalt | `#45413a` |
| Värn | sandsäckar | `#8f8160`, `#7f7254`, `#9a8c6a`, `#867a5b` |
| | vapenmetall | `#2a2b28` |
| | sköld | `#8a8b64` |
| | ammolåda | `#55603f` med lock `#3d4530` |
| Soldat | hy, skjorta, byxor, hjälm, väst | `#a58467`, `#55593f`, `#4a4d38`, `#4f5438`, `#43472f` |
| Hinder | taggtråd, stolpe | `#3c3a36`, `#4a3a2a` |
| | betong, sliten betong | `#a59f90`, `#6f695d` |
| Zombier | hy | gröngrå `#6f7962` till `#9b9477` |
| | kläder | dova blå, bruna, gröna, en rostig röd |
| | blod | `#4f120d`, `#3a0e0a` |
| Markering | papper, rost | `#e9dfc9`, `#b5532a` |
| Basen | vallar, bom, kur, flagga | sandsäckarna, bommen randig papper/rost, kur `#9a8d78` med tak `#6f695d`, flagga `#55593f` |
| HUD | pilen där horden kommer | `#e0603c`, text `#f0a07a` (i `styles.css`) |

Tonen: dammig eftermiddag, avmättat, varmt. Inga rena eller mättade färger utom rosten på vald markering och mynningsflammor.

## Ljus

Samma i spel, prov och visningssida (`src/render/scene.js`):

- Sol: riktat ljus `#ffdcae`, styrka 2.6, från position (-34, 30, 26) mot origo. Låg eftermiddagssol, långa skuggor mot +x och -z.
- Skuggor: PCF mjuka, karta 2048, bias -0.0006, normalBias 0.04.
- Fyllnad: halvklotsljus himmel `#d6dbe0`, mark `#5b4a35`, styrka 0.75.
- Fyllnadsljus: riktat ljus `#c9d2dc` (`fill`), styrka 0.6, från kamerans håll (+40, 46, +40 från målpunkten), utan skugga. Lyfter zombiernas ryggar och pjäsernas skuggsidor så att de inte blir svarta.
- Dis: bakgrund och dimma `#b9aa8c`, dimma från 70 till 120 m från kameran.
- Tonmappning: ACES Filmic, exponering 1.05, sRGB ut.
- Gradering i CSS på scenen (`.grade`): contrast 1.08, saturate 0.82, sepia 0.10.
- Kamera: ortografisk, förskjuten (+40, 46, +40) från målpunkten, synfält 25 m på höjden.
- Alltid dagsljus. Aldrig natt.

Följd av ljuset: zombier går mot -x och kameran ser dem bakifrån, så deras ryggar ligger i skugga. Det är avsiktligt; läs dem på silhuetten.

## Material

- Matt: `MeshStandardMaterial`, roughness 0.92, metalness 0, `flatShading: true` (standard i `mat()`).
- Metall bara på vapen och vapendelar: metalness 0.55, roughness 0.45. Taggtråd 0.6/0.5 är enda undantaget.
- Metall utan miljökarta blir mörk; ge metalldelar som ska synas (som skölden) en ljusare grundfärg i stället för mindre metall.
- Allt kastar och tar emot skugga (`mesh()` gör det), utom tunna detaljer som tråd, sprickor och fläckar.
- Markeringar på marken är `MeshBasicMaterial`, genomskinliga, utan djupskrivning.
- Ett hinder som ska kunna slitas får egna materialkopior så att det kan mörkna utan att påverka andra.

## Proportioner

- 1 enhet = 1 meter. x längs vägen (horden kommer från +x), z tvärs, y upp.
- Människa: cirka 2.2 m inklusive huvud (`humanoid()`): ben 0.85, bål 0.85, huvud 0.45. Spelet är lite överdrivet så att figurer läses på avstånd.
- Zombie lutar framåt 0.05 till 0.2 rad. Vandrare 0.05 till 0.14, löpare 0.17 till 0.2 med huvudet framskjutet, bjässe 0.08 till 0.16.
- Löpare: skala 0.95, smalare bål och lemmar, trasigare kläder, armarna svänger.
- Bjässe: skala 1.45 (från `ZOMBIES.brute.scale`), bål 1.3 gånger bredare, grova bara armar, litet huvud.
- Värn: M2 har en säckring med radie 2.5 m, M249 2.0 m och lägre. En position är en ring med radie 2.3 m.
- Hinderruta: 3 m längs vägen, 9 m tvärs.

## Nivåer på vapen

Ska gå att skilja på spelets avstånd:

1. Grundvärn: säckring, vapen, skytt.
2. Sköld framför vapnet (vrids med vapnet).
3. Ett lager säckar till, en yttre vall framåt och ammolådor bakom.

## Slitage på hinder

`setObstacleWear(grupp, andel)`, 1 = hel, 0 = borta.

- Taggtråd: rullarna sjunker och plattas till, några försvinner, stolparna lutar.
- Betongblock: blocken lutar och vrids bakåt, sprickor och lösa bitar syns, betongen mörknar.

## Budget för meshar och anrop

Antalet meshar avgör om stilen håller när fler typer och större vågor kommer. Varje mesh som kastar skugga ritas två gånger (skuggpass och huvudpass). Räkna med `renderer.info.render.calls` (öppna spelet med `?debug`, `window.__horde.renderer.info`).

| Modell | Högst | Idag (0.2.0) |
|---|---|---|
| Zombie | 15 | vandrare 9 till 13, löpare 14 till 15, bjässe 12 till 13 |
| Pjäs nivå 1 till 2 | 65 | M249 46 och 50, M2 59 och 63 |
| Pjäs nivå 3 | 120, mål 60 | M249 102, M2 120 |
| Hinder | 50 | taggtråd 46, betongblock 42 |
| Basen | 70 | 65 |

Hela bilden på dag 3 våg 3: högst 1 200 anrop. Uppmätt 1 124 i 0.2.0 (se `docs/balance-log.md`, Prestanda).

Regler:
- Många likadana småsaker (grus, hylsor, blodstänk, köttbitar) ritas som `InstancedMesh`, aldrig som enskilda meshar.
- Liggande kroppar kastar ingen skugga, och högst 24 ligger kvar i bild.
- Nästa steg när budgeten trängs: slå ihop pjäsernas sandsäckar till en geometri per pjäs (de står still), så kommer nivå 3 ner mot 60.
