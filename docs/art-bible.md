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
| Hemvärnet (0.9.0) | m/90: ljusgrön grund, mörkgrönt, brunt, svart; stridssele; Ak 4-stock | `#7a8655`, `#3b4a2c`, `#5c4630`, `#1f211b`; `#4a5236`; `#5a4128` |
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
Från 0.2.2 har människorna verkliga proportioner, inte tecknade (Olas beslut H014). Stilen är fortfarande lågpoly och platt skuggad.

- Människa (`humanoid()` och `BUILD` i `kit.js`): cirka 1.92 m vid skala 1. Huvudet 0.26 m högt, ungefär 1/7,5 av längden. Höften på 0.98 m, lårben 0.48, skenben 0.5, överarm 0.32, underarm 0.3 plus hand. Fingertopparna når mitten av låret.
- Leder: armar och ben i två delar med armbåge och knä, så att gången kan böjas. Leden heter `hipL/R`, `kneeL/R`, `shL/R`, `elL/R`, `spine` (ryggen) och `head` (nacken).
- Bålen smalnar mot midjan (fyrkantig kon). Axlarna på en vandrare sitter 0.22 m från mitten, smalare än soldatens 0.27.
- Ryggen kröker framåt (`spine`), benen står raka: vandrare 0.22 till 0.36 rad, löpare 0.38 till 0.48, bjässe 0.24 till 0.34. Huvudet hänger framåt 0.25 till 0.55 rad på vandrare.
- Armarna hänger eller sträcker sig ojämnt: en arm framåt, den andra hänger eller sträcks kortare. Ingen zombie har båda armarna exakt lika.
- Trasig fåll (smala trasor under tröjan) och bara underarmar på en del. Bjässen har alltid bara underarmar.
- Löpare: skala 0.95, smal, längre ben, sprintar: djupt knäböj, armarna pumpar med böjd armbåge.
- Bjässe: skala 1.45 (från `ZOMBIES.brute.scale`). Stor och tung men mänsklig: bred bröstkorg, tjocka lemmar, kortare ben, litet huvud på framskjuten nacke. Ingen gorilla.
- Soldaterna i värnen har samma proportioner, rak rygg, hjälm och väst. M249-skytten står på ett knä, M2-skytten står vid spadgreppen.
- Hemvärnets soldater (0.9.0) har samma proportioner men en rak låda som bål (jackan), så att splittermönstret ligger på plana sidor. Ställningen visar skyddet: på huk och lutar sig ut vid husknut och bil, på knä bakom häck och staket, på magen i diket och på gräset.
- Animationer (`models.js`): `zombieWalk` (gång med knän), `zombieAttack` (hackar växelvis mot hindret), `zombieFall` (faller bakåt, knäna viker sig).
- Läs på spelets avstånd: figuren ska synas på silhuetten, och kläderna ska gå att skilja i fyllnadsljuset. Byxorna är därför lite ljusare än förut.

## Hälsoring

En tunn ring på marken under varje levande zombie som tagit skada (`src/render/rings.js`). Bågen är hälsan, börjar uppe i bild och töms medsols; den tömda delen syns svagt. Färgen är papper (benvitt) och går mot rost när hälsan är låg. Radie 0.62 m, bjässen 0.84 m. Hela horden ritas i ett anrop (en `InstancedMesh`, bågen skärs i skuggningen). Ringen försvinner när zombien dör.
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
| Zombie | 16 delar | 0.2.2: kropp 13, plus högst 3 trasor och fläckar. Från 0.4.1 instanser: hela horden är 25 anrop plus 25 för kropparna, oavsett antal |
| Soldat | 16 | 0.2.2: 16 |
| Hemvärnets soldat | instanser | 0.9.0: cirka 105 delar (kropp, gevär, stridssele och 70 lappar i splittermönstret). Ritas som instanser (squad-view.js, samma väg som horden): lapparna delar enhetskuben, så anropen är ett tjugotal oavsett antal soldater |
| Pjäs nivå 1 till 2 | 65 | M249 46 och 50, M2 59 och 63 |
| Pjäs nivå 3 | 120, mål 60 | M249 102, M2 120 |
| Hinder | 50 | taggtråd 46, betongblock 42 |
| Basen | 70 | 65 |

Hela bilden på dag 3 våg 3: högst 1 200 anrop. Uppmätt 1 124 i 0.2.0 (se `docs/balance-log.md`, Prestanda).

Regler:
- Många likadana småsaker (grus, hylsor, blodstänk, köttbitar) ritas som `InstancedMesh`, aldrig som enskilda meshar.
- Liggande kroppar kastar ingen skugga, och högst 24 ligger kvar i bild.
- Zombierna ritas som instanser (`src/render/horde.js`): en `InstancedMesh` per delgeometri med färg per instans, matriserna räknas ur varje zombies skelett på processorn. Nya delar på zombierna ska använda byggsatsens delade geometrier (`geo`, `box`, `sbox`) och vanliga `mat()`-material, annars blir varje ny storlek ett eget anrop.
- Nästa steg när budgeten trängs: slå ihop pjäsernas sandsäckar till en geometri per pjäs (de står still), så kommer nivå 3 ner mot 60.

## Gnesta

Bana 2, Sigtunavägen i Gnesta (från Gnesta 0.1.0). Förhandsvisning i `gnesta.html`, byggsatsen i `src/render/gnesta-kit.js`, kartan som data i `src/data/gnesta.js`.

- Samma sol, dis, fyllnadsljus, gradering, vinjett och korn som E4. Dimman börjar längre bort (85 till 165 m) eftersom kameran står ett steg längre ut (synfält 36 m).
- Gnestas färger ligger i `GP` i `gnesta-kit.js`, inte i `PALETTE`. Samma ton: dammig sommareftermiddag, avmättat.
- **Husen är generiska.** De står där kartan har hus och har ungefär samma storlek och riktning, men de är inte kopior av riktiga hem. Inga husnummer, inga namn, inga detaljer som går att känna igen från ett visst hus. Gatunamnen och ishallen används.
- Villor: moderna och hela, en vanlig sommardag. Mörka sadeltak eller valmade tak (svart, grafit, skiffer, ibland tegelrött). Ljusa fasader: vit eller grå panel med vita hörnbrädor, ljust grått tegel, gul, någon falu röd eller brun. Vita fönsterramar, dörr med trappsten, ofta skärmtak och skorsten.
- Varianter: 1 plan, 1,5 plan med brantare tak och balkong på gaveln mot gatan, garage i husets förlängning, inglasat uterum på baksidan, solceller på något tak.
- Tomterna är stängda: häck (hög, kantig, grön), vitt spjälstaket eller grått tätt spjälstaket, ibland staket utanför häcken. Uppfart med grus eller plattor och en lucka i häcken. Brevlåda vid uppfarten.
- Trädgård: runda lövträd, någon studsmatta, utemöbler, parkerad bil, ibland släpkärra.
- Gata: asfalt med kantsten och gräsremsa, gatlyktor på en sida. Cykelvägen är grus och ljusare. Skogsvägen är jord.
- Skog: gran (två koner), tall (hög stam, platt krona) och björk (vit stam). Lägre träd närmast gatorna så att skogen inte döljer vägen från kameran.
- Budget: allt utom marken ritas som `InstancedMesh` med färg per instans, en per geometri och materialsort (createBatch). Hela banan är ungefär 25 anrop och 220 000 trianglar (0.1.0).

## E4 vid Lästringe

Bana 1 från 0.15.0: trafikplats 137 Lästringe i Södermanland, ritad ur kartan, satellitbilden och gatubilderna (lokalt i `~/Projects/horde-refs/e4-lastringe/`, aldrig i repot). Kartan som data i `src/data/e4-lastringe.js`, scenen i `src/render/e4-world.js`, motorvägens byggsats i `src/render/e4-kit.js`, vägspärren i `src/render/models.js` (`roadblockModel`). Alla nya delar står på visningssidan.

- Samma sol, dis, gradering och spöklager som Gnesta: Sörmland en sommareftermiddag, inte öken. Marken är gräs, åker, äng och skogsbotten; ingen jord, inga döda träd.
- Tät gran- och tallskog överallt utom vägarna, åkern väster om väg 224 och ängen i rampernas ögla. Björk i brynet och som ensamma träd i ängen. Låga träd närmast vägarna så att kameran ser horden.
- Högt gräs i vägrenarna och ängen (tuvor av smala strån), stenblock med mossa, ett fuktigt dike längs motorvägen och ramperna.
- Motorvägen: två körbanor med vita kantlinjer och streckad körfältslinje, mitträcke, vägräcke på rampernas ytterkurvor, höga belysningsstolpar, spärrområden i sicksack där ramperna går ihop med motorvägen och vid stammens delning. "800" och pilar målade på väg 800 före korsningen.
- Skyltarna är generiska men med svenska färger: grön botten för motorvägen (HELSINGBORG, NYKÖPING, SÖDERTÄLJE, avfart 137 S LÄSTRINGE), blå för övriga vägar (GNESTA, S LÄSTRINGE, SÖDERTÄLJE 45, VÄSTERLJUNG, GRANLUND), 110 rund med röd kant. De vänds mot kameran så att texten går att läsa.
- Apokalypsens början: övergivna bilar med öppen dörr, utbrända och en på taket, en knäckt långtradare tvärs över motorvägen mellan ramperna med en kö bakom, en buss som stannat vid hållplatsen.
- Vägspärren (basen) vid stammens ände mot väg 800: betongsuggor i sicksack, randig bom, sandsäckar, vaktkur med STOPP, en grön lastbil med kapell och en pansarbandvagn.

