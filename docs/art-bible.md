# Horde · stilbibel

Gäller från version 0.1.7. Förlagan är det godkända provet `mockups/prov-1-3d.html`. Allt nytt ska se ut som att det hör hemma där.

## Grundregel

Nya modeller visas i `lookbook.html` innan de används i spelet. Lägg till dem i visningssidan, titta på dem i spelets ljus och på spelets avstånd (knappen "Spelets avstånd"), först därefter in i spelet.

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

Tonen: dammig eftermiddag, avmättat, varmt. Inga rena eller mättade färger utom rosten på vald markering och mynningsflammor.

## Ljus

Samma i spel, prov och visningssida (`src/render/scene.js`):

- Sol: riktat ljus `#ffdcae`, styrka 2.6, från position (-34, 30, 26) mot origo. Låg eftermiddagssol, långa skuggor mot +x och -z.
- Skuggor: PCF mjuka, karta 2048, bias -0.0006, normalBias 0.04.
- Fyllnad: halvklotsljus himmel `#d6dbe0`, mark `#5b4a35`, styrka 0.75.
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
