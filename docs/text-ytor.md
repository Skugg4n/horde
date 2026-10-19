# Textytor i Horde (v0.19.2)

Underlag för kampanjens berättartexter: order från ledningen, lägesrapporter, radio och TV. Alla bilder är 1440x900 och ligger i `docs/text-ytor-*.png`. Mått är uppmätta i en riktig körning (headless Chromium, skärm 1440 px bred). Alla texter är engelska i spelet. Tecken per rad är en uppskattning från uppmätt bredd och teckensnitt.

Ord räknas som i `tests/onboarding.test.js`: siffror och `{platshållare}` räknas som ett ord var.

## Översikt

| # | Yta | Datafält | Gräns idag | Längsta idag |
|---|---|---|---|---|
| 1 | Dagens introkort | `intro: { title, text }` per dag i `src/data/*.js` | text högst 12 ord (test i `molnbo.test.js`, `progress-norr.test.js`), rubrik ca 20 tecken per rad | 12 ord, 72 tecken |
| 2 | Sektorns slut (radiorutan) | `outro: { text, next, withdraw }` per bana | ingen gräns i test; rutan rymmer mycket | 24 ord, 134 tecken |
| 3 | Operationskartan, Command-rutan | `RELEASES[].text` i `src/data/depot.js` (plus `outro.text` när en sektor stängs) | högst 20 ord (kommentar i depot.js, ingen test hittad); visar bara det senaste meddelandet | 19 ord, 121 tecken |
| 4 | Requisition: NEXT BATTLE och INTEL | genereras av `src/meta/intel.js`, ingen fri text utom `note` | ingen fri text idag | Intel-rutan: en rad "Unknown numbers and types. No reports from the east, south or west." |
| 5 | Lektionsplattor, tips, fiendekort | `LESSONS`, `TIPS`, `ENEMIES` i `src/data/lessons.js` | steg och tips högst 12 ord (test); fiendekortets `report` utan test | steg 12 ord/72 tecken, tips 11 ord, fiendekort 20 ord/102 tecken |
| 6 | Field manual (J) | `MANUAL[].text` i `src/data/lessons.js` | högst 40 ord, inga tankstreck, `$`, `%`, `hp` (test) | 40 ord, 223 tecken |
| 7 | Banderoller och notiser | `waveText()` (genereras), `wave.toast`/`group.toast` i bandata, resten hårdkodat i `src/main.js` | inga | våg 66 tecken, replik 11 ord/52 tecken |

## 1. Dagens introkort

Bilder: `text-ytor-01-intro-e4.png` (E4 dag 1), `text-ytor-01b-intro-molnbo.png` (Mölnbo dag 3).

- Kod: `dayIntro()` i `src/ui/panels.js`. Rubriken (`.h`) i Saira Stencil 40 px, texten (`.lead`) i Oswald 17 px, knappen "To the line".
- Bredd: kortet är `max-width: min(460px, 100vw - 32px)`, textspalten ca 390 till 405 px, alltså ca 50 tecken per rad. Rubriken ca 20 tecken per rad och bryts till två rader om den är längre.
- Höjd: 198 px med en textrad (E4 dag 1), 223 px med två (Mölnbo dag 3). Varje extra rad kostar 25 px. Kortet växer nedåt från mitten (top 40 %), det finns plats för ca 5 rader innan det blir trångt över bilden.
- Gräns idag: 12 ord, i praktiken 72 tecken. Rubriken har formen `Day N: Namn` (längsta: "Day 5: Along the tracks", 23 tecken).
- Längsta text: "From Järna, and from the east along Fagernäsvägen. Hold until the train." (Mölnbo dag 3).
- Kortet visar bara rubrik och en rad. Funktionerna `intelLine()` och `arrivedLine()` finns i `panels.js` men används inte i kortet längre.

## 2. Sektorns slut (outro)

Bilder: `text-ytor-02-outro-e4.png` (E4), `text-ytor-02b-outro-norr.png` (Vikingavägen).

- Kod: `dayResultPanel()` i `src/ui/panels.js`, bara när sista dagen i en bana är vunnen. Texten står i en grön "radio"-ruta: rubrik "Radio · Försvarsmakten to all units", brödtext, "Out." Avsändare från `FROM_NAME` (`FM`, `MCF`) i `src/data/depot.js`.
- Brödtext: IBM Plex Mono 14 px, spalt 636 px, alltså ca 75 tecken per rad. Radioboxen är 666 px bred.
- Höjd: hela resultatkortet är 542 px med två textrader, och rutan växer 21 px per rad. Kortet har `max-height: 100vh - 32px` (868 px) och rullar efter det, så det rymmer ca 15 extra rader (ungefär 1000 tecken) innan rullning. Rimlig budget: 60 ord.
- Ingen test begränsar längden. Bara sista dagen i en bana får rutan. Dag 1 till 4 visar inget radiomeddelande.
- Längsta idag: "E4 holds. Reports of a smaller outbreak in eastern Gnesta. Command is sending you to Hagstumosse. Get the civilians into the ice rink." (23 ord). Lika långt: Vikingavägens "Hagstumosse holds and the ice rink is safe. Mölnbo station is the last way north for hundreds. Command is sending you to hold it." (24 ord, 129 tecken).
- Samma text hamnar också i Command-rutan på operationskartan (se 3), för `closeSector()` i `src/meta/operation.js` lägger `outro.text` i inkorgen.

## 3. Operationskartan mellan dagarna

Bild: `text-ytor-03-opmap.png` (Mölnbo dag 3, där senaste meddelandet är Vikingavägens outro).

- Kod: `opMapSheet()` i `src/ui/operation.js`. Det finns en meddelandeyta idag: rutan **Command** under sektorkortet, med avsändare (Försvarsmakten eller Myndigheten för civilt försvar), "NEW"-märke och texten.
- Datafält: `RELEASES[].text` och `from` i `src/data/depot.js`, en per dag och bana (18 st), plus outro-texten när en sektor stängs. Inkorgen sparas i `progress.op.inbox`.
- Begränsningar: **bara det senaste meddelandet visas** (`latest`), inte historiken. Rutan är 402 px bred, Oswald 13 px, alltså ca 60 tecken per rad, och `max-height: min(30vh, 250px)` med rullning, alltså ca 12 rader. Texterna är i praktiken högst 20 ord.
- Sektorkortet ovanför har bara fast text: bannamn, "day N of 5: titel", enhetsikoner och knappen. Titeln är den del av introrubriken som står efter kolon.
- Lediga ytor: högerspalten slutar vid ca y=527 medan kartan når ca y=640. Under Command-rutan finns alltså ca 110 px ledigt, och rutan kan växa till 250 px.
- Längsta idag: "You take command in Hagstumosse. Hunters and neighbours form three volunteer groups. Get the civilians into the ice rink." (gn-1, 19 ord).

## 4. Requisition: NEXT BATTLE och INTEL

Bilder: `text-ytor-04-requisition.png` (Mölnbo dag 3, partial), `text-ytor-04b-requisition-okand.png` (Mölnbo dag 2, unknown), `text-ytor-04c-requisition-vet-allt.png` (Mölnbo dag 5).

- Kod: `depotSheet()` i `src/ui/operation.js`.
- NEXT BATTLE: en rad, `Next battle` + `Bana · Fas · Day N`, i en orange list som är 1038 px bred (hela kortets bredd). Texten tar ca 250 px, så **ca 750 px på samma rad är oanvänt**. Ingen fri text idag.
- INTEL: rutan är 315 px bred och 358 px hög, 12 till 16 px text. Allt genereras i `src/meta/intel.js` ur vågdata (typer, spann, ingångar med kompassriktning). Det enda fria fältet är `it.note` (en rad, 12 px, 293 px bred, ca 45 tecken per rad). Intel-kvalitet styrs av `dayCfg.intel` (`known`, `partial`, `unknown`).
- Hela rekvisitionskortet är 868 px högt av 900 px: **det finns ingen lodrät plats kvar** utan att komprimera rostern eller uppgraderingarna.
- Längsta fria text idag: "Unknown numbers and types. No reports from the east, south or west." (intel-noten, 11 ord).

## 5. Lektionsplattor, tips och fiendekort

Bilder: `text-ytor-05-lektion-e4.png` (kort steg), `text-ytor-05b-lektion-molnbo.png` (längsta typ), `text-ytor-05c-fiendekort.png` (Crawlers), `text-ytor-05d-tips-och-basen.png` (tipset "Base hit" som notis).

- **Lektionsplatta** (`#coach .cplate`, `src/ui/coach.js`): `LESSONS[stage][].text`, högst 12 ord (test). Plattan är högst 320 px bred, Oswald 15 px, ca 40 tecken per rad. Ett steg på 12 ord blir 3 rader (105 px högt med "Click or Enter" och länken "I know tower defence: fewer tips"). Tangentkåpor (`keys`) räknas inte som ord. Längsta: "One road bridge, one footbridge. Close both and they must break through." (mb-4.bridge, 12 ord, 72 tecken).
- **Tips** (`TIPS[].text`, högst 12 ord, test): visas som liten notis uppe i mitten, Oswald 14 px, en rad (notisen får bli 940 px bred vid 1440 px). Längsta: "The fallen stay lost after a win. Refill at the depot." (11 ord) och "Snipers go on towers, flat roofs, ridges and tall buildings." (10 ord, 60 tecken).
- **Fiendekort** (`ENEMIES[typ].report`, `src/ui/coach.js` `enemyCard`): kort 520 px brett, rapportspalten 306 px bred bredvid porträttet i Oswald 16 px, alltså ca 38 tecken per rad. Crawlers-texten är 3 rader (70 px). Kortet är 338 px högt, och porträttet ger en golvhöjd på ca 180 px, så texten kan växa till ca 6 rader utan att kortet blir högre än idag. Ingen testgräns. Längsta: "Something moves low in the grass. Wire does not stop it. Squads see them; guns on the roofs hardly do." (20 ord, 102 tecken). Fem fiendetyper har kort: walker, runner, brute, crawler, armored.

## 6. Field manual (J)

Bilder: `text-ytor-06-faltmanual.png` (tidigt läge, 4 uppslag öppna), `text-ytor-06b-faltmanual-langt-uppslag.png` (alla 43 uppslag, "Sanity" öppen).

- Kod: `manualSheet()` i `src/ui/coach.js`, `MANUAL[]` i `src/data/lessons.js` med `id`, `group`, `title`, `icon`, `text`, `keys`.
- Gräns: 40 ord, inga tankstreck, `$`, `%` eller `hp` (test). Fem grupper: Basics, Defences, Units, Operation, Enemies.
- Mått: hela boken är 760x565 px, vänsterlistan 200 px, artikeln 506 px bred och 460 px hög. Brödtexten är Oswald 15 px, ca 62 tecken per rad, 4 rader för 223 tecken (68 px). Det finns plats för ca 15 rader under rubriken och ikonen.
- Längsta: "The blue bar under each unit; red means close to breaking. The dead close by, comrades falling and worse things wear it down. Shaken units shoot worse. Veterans and soldiers hold longer than volunteers. Calm brings it back." (sanity, 38 ord). Längst i ord: "place", 40 ord.
- Uppslag låses upp av lektionerna; en bok med 4 uppslag syns tidigt (bild 06).

## 7. Banderoller och notiser

Bilder: `text-ytor-07-banderoll-vag-och-replik.png` (våg-banderoll + replik), `07b-banderoll-rout-och-bas.png` (enhet bryts, basen under attack, tips), `07c-banderoll-taget.png` (tåget), `07d-banderoll-seger.png` (segerbanderoll).

- **Vågbanderoll** (`#banner`, `hud.banner`, texten från `waveText()` i `src/ui/hud.js`): genereras, "Wave N: 14 walkers, 6 runners". 16 px, en rad (`white-space: nowrap`), centrerad uppe, 4,5 s. Längsta idag: "Wave 5: 64 walkers, 10 crawlers, 29 runners, 6 armoured, 10 brutes" (66 tecken, ca 520 px). Under 760 px skärmbredd får den radbrytas. Ingen fri text, men samma element används för segerbanderollerna ("Sector quiet", "The train is through", `src/main.js` rad 2851).
- **Repliker** (`wave.toast` och `group.toast` i bandata, 24 st, visas som röd notis, Oswald 17 px): högst 11 ord, 52 tecken (längsta: "From today the next wave will not wait for this one."), 427 px bred. Notisen får bli 940 px bred (`max(260px, 100vw - 500px)`) och radbryts därefter. Detta är den yta som idag redan fungerar som en lägesröst under striden.
- **Notiser med underrad** (`note(..., { sub })`): "Train incoming. It's not empty." + "Move units to the platform, or hold the line." 265 px bred, två rader.
- **Enhet bryts** (`routBanner()`): "Hemvärnet squad breaks!" röd notis högst upp, 17 px, 225 px bred. Under den en mindre underrad ("A unit broke and ran.").
- **Basen angrips** (`onBreach()`): "Base under attack!" eller "Base under attack! From Stenbyvägen" (gatan sätts in när den är känd), 17 px, klickbar. Därefter tipset "Base hit. At zero the day is lost." i liten ruta.
- **Dagens mål** (tågklockan och evakueringen, `dayCfg.objective`): 230 px bred plåt uppe till vänster, 12 px versaler, ca 24 tecken per rad, rader som "Hold Folkets hus until the train leaves." Längsta: "Hold Folkets hus until the last train leaves." (45 tecken).

## Förslag: lägesrapport från ledningen mellan dagarna (2 till 4 meningar)

Idag finns två ytor som redan har rätt form men som är för små: **radiorutan** på resultatskärmen (bara efter sektorns sista dag) och **Command-rutan** på operationskartan (en rad om 20 ord, bara senaste meddelandet). Budget för en lägesrapport: ca 40 till 60 ord, 250 till 350 tecken.

**Alternativ A (rekommenderas): radiorutan efter varje vunnen dag, Command-rutan som logg.**
- Visa den gröna radiorutan på resultatskärmen efter varje vunnen dag (idag bara sista dagen i banan, `sectorDone` i `dayResultPanel`). Den rymmer 4 till 5 rader om 75 tecken utan att kortet växer så att det rullar (idag 497 till 542 px av 868 px).
- Samma text sparas i inkorgen och visas på operationskartan i Command-rutan, som får visa de två till tre senaste meddelandena i stället för bara det senaste (rutan har 250 px max-höjd, ca 12 rader). Då läser spelaren rapporten när det händer och har kvar den när nästa dag planeras.
- Texten kommer från ett nytt fält per dag (förslagsvis `report: { from, text }` bredvid `intro`), skilt från `RELEASES[].text` som fortsätter att vara leveransraden ("A Ksp 58 team and a welded pillbox for Gnesta"). Då blir introt kvar som en rad om 12 ord.

**Alternativ B: ett briefingblock på Requisition, i NEXT BATTLE-listen.**
- NEXT BATTLE-listen är 1038 px bred men texten tar bara ca 250 px. Listen kan bli en tvåraders brief: rad ett som idag, rad två eller en ruta under med lägesrapporten för kommande dag (2 till 4 meningar, ca 14 px).
- Fördel: rapporten hamnar där spelaren fattar sitt beslut och bredvid Intel-rutan. Nackdel: rekvisitionskortet är redan 868 px högt av 900 px, så rostern eller uppgraderingsrutan måste krympa, och Requisition öppnas först efter Ishallen dag 2 (`depot` i `src/meta/unlocks.js`, enligt `onboarding.test.js`), så de tidiga dagarna får ingen yta.

Radio och TV (korta utdrag från världen utanför) passar bäst som en andra avsändare i samma radiobox (`FROM_NAME` kan utökas, t.ex. med en radiokanal), eftersom rutans form (rubrikrad, brödtext, avslutning) redan bär en röst.
