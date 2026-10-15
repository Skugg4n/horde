# Granskning: Horde 0.3.1 till 0.5.1 (43abbb2..01fd95e)

Granskare: senior reviewer, 2026-10-15. Läst: diffen (476 KB, data- och bildhunkar skummade), de tre stegrapporterna, granskningen av 0.3, och nuvarande src/sim, src/meta, src/ui, src/main.js, src/render/{view,horde,camera-rig,route-lines,picking}.js, scripts/balance.mjs (struktur) samt alla testfiler. `npm test` kört lokalt på 01fd95e: 160 av 160 gröna (52 s). Ingen em-dash i spårade textfiler. Inga `three`-, `document`-, `window`-, `Math.random`-, `Date.now`- eller `performance`-referenser i src/sim, src/data, src/meta. Inga skrivningar till `sim` eller zombieobjekt från src/render eller src/ui (bara vyns egna fält `seed`, `legLag` m.m. på modelldelar i models.js). Arbetsträdet är orört.

Alla fyra tvingande regler hålls: simuleringen är ren och deterministisk, vyn muterar inte, ingen sparfil raderas, spelartexten är engelska.

## Strengths

- **Rutt-abstraktionen är rätt skuren** (route.js). Samma `step(sim, dt)` driver E4 och Gnesta; `pathRoute` återger E4 exakt (kvittot `3fbfe043` höll genom hela refaktorn och byttes avsiktligt först i 0.5.0 med motivering i testfilen). Hinder nycklas på heltal, händelser bär `cell`, och allt vyn behöver (läge, riktning, rutmitt, bas, spawns) går genom rutten.
- **Flödesfältet är exakt och deterministiskt** (flow.js, grid.js). Heltalskostnader, fast grannordning, kön bryter lika på nyckel, fågelvägen bryter lika kostnad. 4-grannar så att två rutor i följd alltid delar kant: zombien kan inte skära ett tomthörn. Barrikaden är passerbar till kostnad 4000 (Olas beslut), så fältet har alltid en väg och "alla vägar stängda" ger genombrott vid närmaste barrikad, testat.
- **Omräkningen vid sönderslagen barrikad är korrekt placerad** (sim.js:389-412): `obstacleEffect` river hindret, `route.rebuild` höjer `version`, och varje zombies siktpunkt räknas om lat nästa gång den frågas (route.js:184-191). Zombier som slog på en annan ruta i samma spärr får `blockContact` null nästa steg och går sidledes till luckan. Testerna "barrikaden räknas om när den rivs och när den slås sönder" och "båda vägarna stängda" täcker det.
- **Fast fil per zombie** (`laneFor`, gyllene snittet) i stället för slump per steg: horden sprider sig över gatan deterministiskt, och lanes.test.js kontrollerar både spridningen och att varje zombie håller sin fil inom 0,6 m. Siktpunkten sparas på zombien så att `ahead()` räknar exakt samma väg som `advance()`.
- **Instanseringen är gjord som den borde** (horde.js). Skelettet per zombie ligger utanför scenen, en `InstancedMesh` per delgeometri, färg per instans, liggande kroppar i en egen uppsättning med frysta matriser. Inga allokeringar per bildruta i modulen. Mätningen i balance-log.md (0.4.1) är gjord och visar 2 553 till 365 anrop och 17,9 till 4,6 ms CPU-arbete vid 4x strypning. Det var den största risken i granskningen av 0.3, och den är löst.
- **Siktlinjerna räknas en gång** (placement.js). Rutvis DDA med heltalsjämförelser (`(2nx+1)*aj` mot `(2nz+1)*ai`), så hörnfallet är exakt, symmetriskt (testat) och fritt från flyttalsgränser. Sikten lagras som mask plus lista på pjäsen; siktet och granaterna slår bara upp `mask[k]`. Noll strålar per bildruta.
- **Sparfilen migreras i tre steg och raderas aldrig** (save.js, progress.js). v1 och v2 kopieras oförändrade under egna nycklar innan de flyttas, trasiga under `horde.save.broken`, identiska kopior dubbleras inte, okända banor i `maps` behålls, och `migrateResearch` behåller nu kända noder med ogiltig nivå (rättningen från 0.3). Testerna täcker v1, v2, trasig, dubblett och skrivfel.
- **Pausen är sim-ren** (clock.js). `advance` stegar ingenting när menyn är öppen, `acc` nollas utanför play, nedräkning och spawn-timers ligger i `sim.time`. Allt detta är testat utan webbläsare (pause.test.js), liksom Esc-prioriteten.
- **En enda väg för händelser** (main.js:211-225). `go()` kör samma `handleEvents` som bildrutan, så ljud på `waveStart` kommer att höras oavsett vem som startade vågen. Det var punkt 2 i förra granskningen och det är precis det ljudet behöver.
- Menyn är en datalista (`MENU_ITEMS`), inställningarna är skilda från sparfilen, och `effectiveVolume` finns redan.
- Spelartexten är genomgående kort engelska. Introtexterna för Gnesta förklarar mekaniken ("Shut every road and they smash a barricade in seconds, so leave them a way round.").

## Issues

### Critical

Inga. Det jag särskilt letade efter och inte hittade:
- Fastnade eller pendlande zombier: `advance` (route.js:261-280) har vakt för noll framsteg, byter ruta bara till öppna rutor, och flödet är en DAG så inga cykler finns. Siktpunkten ligger alltid minst en ruta fram (för i = 0 är målet i grannrutans rad, för i > 0 två eller fler rutor fram), så fallet "mål i egen ruta" som koden försvarar sig mot i rad 272-277 kan i praktiken bara nås genom avrundning. Rökkörningen (alla zombier från alla ingångar framme, aldrig utanför gatan) och determinismtestet täcker helheten.
- Flyttal i determinismen: alla kostnader är heltal, alla tie-breaks är nycklade, `Object.keys` på heltalsnycklar har definierad ordning, och rng-anropen i `spawn` ligger i fast ordning.
- Placering på kantrutor: `keyAt` ger -1 utanför, `spotFor` och `placementUi` hanterar det, DDA:n håller sig inom rutnätet eftersom båda ändpunkterna ligger i det.
- Sparfil: ingen väg i `loadProgress` skriver över eller tar bort något; den enda skrivningen är `saveProgress` på `horde.save`.

### Important

1. **En spärr som läggs på zombier låser in dem i barrikaden** (route.js:305-306, sim.js:233-241, 265-275). `blockContact` ger `{ crosses: false }` när `z.cell === key`, så en zombie som står i rutan när spärren läggs stannar inuti och slår sig ut från insidan med `mul = 0`. En spelare som lägger en spärr tvärs över Sigtunavägen mitt i horden ser zombier stå inne i betongen och spärren gå sönder från fel sida, medan resten går runt kvarteret. Steg 1-rapporten noterade det som "kan hända", men med fri placering mitt i vågen och fyra rutors spärrar är det ett vanligt läge. Fix: `canPlace` ger `{ ok: false, reason: 'zombier' }` om någon levande zombie står i någon av spärrens rutor (`acrossCells`), med texten "Zombies in the way" i `REASONS`, och förhandsvisningens plattor i rost när så är. Alternativ om Ola vill tillåta det: låt zombier inuti gå ut i gångriktningen (behandla `z.cell === key` som fritt), då blir spärren bara en spärr för dem som kommer efter.

2. **Kameraskakningen fortsätter under pausen** (main.js:266-272). `shakeCamera(vdt)` får dt 0 när menyn är öppen, men `shakeT` är då oförändrad och `rig.setShake(random)` anropas varje bildruta så länge `shakeT > 0`. Pausar man inom 0,35 s efter ett genombrott (eller 0,25 s efter en granat) skakar kameran bakom menyn tills man fortsätter. Fix: `if (dt <= 0) return;` först i `shakeCamera`. Samma mönster i view.js:174-180: rekylens `rnd(-jit, jit)` fortsätter när `dt === 0` eftersom `e.recoil` inte avtar; sätt `jit = dt > 0 && r ? e.look.rattle : 0`.

3. **Restart day ger samma seed, Try again en ny** (main.js:574, progress.js:46, 450-462). `startConfig` seedar med `1000 * day + attempts[day]`, och `attempts` räknas bara upp i `finishDay`. Via menyns Restart day (eller Main menu och sedan samma dag) startar dagen om med identiska vågor, filer och träffar; via resultatskyltens Try again blir det en ny seed. Med en deterministisk sim går det alltså att lära sig exakt var varje löpare kommer genom att starta om via menyn. Fix: räkna upp `attempts[day]` (utan `intel`, utan `unlockedDay`) i `restart` och `toMain` när `mode === 'play'`, dvs. en `dayResult(progress, { day, won: false, intelEarned: 0 })`-variant, och spara. Då stämmer också menytexten "Progress on this day will be lost".

4. **Gnestas balans är inte pinnad** (tests/balance-gnesta.test.js, jfr tests/route-e4.test.js:17). E4 har ett fingeravtryck av hela balansloggen; Gnesta har bara intervall ("vinner inom 3 försök", "högst 250 levande"). En ändring i flödet, filerna eller siktpunkten som flyttar Gnesta inom intervallen passerar tyst, och det är just den sortens ändringar nästa steg (ljud) inte ska råka göra. Fix: `tests/route-gnesta.test.js` med samma mönster som E4: `JSON.stringify` av `gnestaCampaign('smart')` över de fem seed-förskjutningarna plus naiv dag 1 till 5, FNV-hash, dokumenterat värde och en kommentar om varför det byts när det byts. Kostnaden är noll extra körtid om loggarna delas med balance-gnesta.test.js (exportera dem från en gemensam fixturfil).

5. **HUD-timrar går på väggklockan** (hud.js:84, 104, 146, 175; panels.js:405). Bannern "Wave 1: 8 walkers" (4,5 s), bounty-flytarna, kassadeltat och notiserna är `setTimeout`. Pausar man precis efter vågstarten är bannern borta när man fortsätter, och flytarna stiger genom pausmenyn. Simuleringen är opåverkad, så det är bara bild, men det är den synligaste pausläckan tillsammans med punkt 2. Fix: ge `hud.update(sim, dt)` spelets `vdt` och räkna ner banner och delta där; flytarna kan få `animation-play-state: paused` via en klass på `#ui` när menyn är öppen. Notiserna kan vara kvar på väggklockan.

6. **Förhandsvisningens geometri allokeras varje bildruta** (main.js:356-363). `nowPaths.map(p => p.cells.map(cellWorld))` körs före `routeLines.set`, som sedan kastar resultatet när nyckeln är oförändrad; dessutom `Object.keys(sim.obstacles).join` och `daySpawns()` (flatMap + Set) varje bildruta. Med 100 till 300 rutor per väg är det några hundra små arrayer per bildruta, hela dagen, på Gnesta. Fix: lagra de omräknade världskoordinaterna i `routeKeys` tillsammans med `nowPaths` och räkna `daySpawns` en gång per dag (den beror bara på `dayCfg`).

### Minor

Simulering och prestanda:
- sim.js:392, route.js:303: `obstacleKeys(sim.obstacles)` allokerar `Object.keys(...).map(Number)` per zombie per steg. Med 240 zombier vid 3x är det 3 600 arrayer per bildruta. Räkna listan en gång per steg i `moveZombies` och skicka in den.
- sim.js:291-295: `zombieCells` bygger en `Map` och ett objekt per zombie per steg; sim.js:90 `ageCorpses` filtrerar till ny array varje steg. Billigt var för sig, men det är GC-tryck på exakt den dag (Gnesta dag 5) där det märks. Behåll `p` och `k` på zombien (`z.px, z.pz, z.pk`) i stället för en Map.
- route.js:192-197: `progress(z)` anropas per pjäs per zombie i `fireWeapons` (sim.js:304) och räknar `target()` plus `hypot` varje gång. Cacha `left` per zombie per steg (nollställ i `moveZombies`).
- models.js:412 och horde.js:72-85: varje zombie får egna `MeshStandardMaterial`-objekt som bara används för att läsa färgen in i `rgb`, och kastas i `disposeModel` vid döden. Vid spawnstötar (48 löpare på 15 s vid 3x) är det hundratals material. Cacha materialen per färg i byggsatsen (`mat()`), eller läs färgen direkt ur paletten i `zombieModel`.
- horde.js:124-131: `needsUpdate = true` laddar upp hela instansbufferten (cap x 16 floats) per del per bildruta, även när 20 av 512 används. three 0.160 har `instanceMatrix.addUpdateRange(0, count * 16)` (eller `updateRange`), som halverar uppladdningen på en liten våg. Ingen synlig effekt idag, en rad.
- main.js:334: `sim.route.paths([sp.id])` anropas varje bildruta för en synlig ingång under vågen. `trace` är billig men allokerar en array per bildruta; cacha per `nowKey`.
- main.js:95: `sightCache` växer med en `Uint8Array(4536)` per ruta pekaren passerat under placeringen (ca 5 KB per ruta). Rensas per dag, så det är högst några MB; nämner det för att masken bara behövs för spöket.
- flow.js: omräkningen är 4 536 rutor med binär hög, under en millisekund. `rebuildAll` sorterar dessutom `order` (route.js:209) vid varje omräkning; det går att undvika genom att samla ordningen direkt ur Dijkstra-poppen. Inte nödvändigt.
- tests: hela sviten tar 52 s, nästan allt i balance-gnesta.test.js (fem seeds, fem dagar, upp till fyra försök, plus naiva och forskningslösa omspel). Dela upp i `npm test` (snabba) och `npm run test:balance`, eller låt båda balanstesterna läsa en gemensam körning (se Important 4).

Korrekthet i kanten:
- save.js:69-88: en sparfil med `v: 4` (från en nyare bygge) behandlas som trasig: kopieras till `horde.save.broken` och ersätts av nytt spel vid första sparningen. Regeln hålls (ingen radering), men det vore vänligare att inte skriva över `horde.save` alls när `parsed.v > SAVE_VERSION`. Två rader.
- main.js:447 `onMap` och 54-69 `loadMap`: `disposeScene` disposar även delade cachade geometrier och material (`geo()`-cachen, `HIT_GEO`); three laddar upp dem igen vid nästa användning så det fungerar, men banbytet gör mer GPU-arbete än det behöver. Hoppa över `userData.shared`.
- menu.js:42: rubriken "Paused" visas även när menyn öppnas på intro-, resultat- och forskningsskylten där ingenting går. "Menu" när `mode !== 'play'`.
- view.js:131: `corpses.some(...)` per bildruta; harmlöst.

Text (engelska, en text per sak):
- menu.js:58 `(no audio yet)`: bra att den styrs av `AUDIO_READY`; glöm inte att ta bort flaggan när ljudet finns, inte bara sätta true.
- panels.js: `'Can\'t do that.'` för `okänd` är rätt ton. REASONS saknar nyckeln `'zombier'` tills Important 1 görs.
- README.md:5 säger "Version 0.3.1"; paketet är 0.5.1. Samma anmärkning som förra gången.
- todo.md: `H029` finns två gånger (ux och verktyg) sedan 0.3; blir en tredje kollision när build/0.3 mergas (se mergeplanen).

## Must fix before merge

1. Spärr på rutor med levande zombier: neka med skäl "Zombies in the way" (eller låt zombier inuti gå ut), med test (Important 1).
2. Kameraskak och rekyljitter står still när `dt` är 0 (Important 2).
3. Restart day och Main menu mitt i en dag räknar upp försöket, så att seeden byts som vid Try again (Important 3).
4. Fingeravtryck för Gnestas balanslogg, samma disciplin som E4 (Important 4).
5. Hela sviten grön efteråt, versionen till 0.5.2, README:s versionsrad rättad.

Rekommenderat men inte blockerande: HUD-timrar på spelets klocka (Important 5), förhandsvisningens allokering (Important 6), `obstacleKeys` en gång per steg.

## Audio architecture proposal

Målet är ljud för vapen, granater, zombier, bas och musik, styrt av menyns Sound och Music, utan att röra simuleringen eller determinismen. Allt ljud är bild: det läser händelser och tillstånd, skriver aldrig.

**En modul: `src/audio/audio.js`** (ca 200 rader), plus en manifestfil `src/data/sounds.js` och filer i `assets/sfx/` och `assets/music/` (ogg, korta loopar och enskott).

```
createAudio({ settings }) -> {
  unlock(),                       // skapa AudioContext vid första pointerdown/keydown (autoplay-regeln)
  consume(events, sim, toScreen), // en gång per handleEvents, samma lista som vyn får
  update(dt, sim, paused),        // en gång per bildruta med vdt: musikläge, ambiens, ducking
  setSettings(settings),          // från menyn: effectiveVolume per kanal på två GainNodes
  ui(id),                         // 'build', 'upgrade', 'sell', 'deny' från actions-wrappern
}
```

**Krokar i main.js** (fyra rader, inga nya vägar):
- `handleEvents()`: `audio.consume(evs, sim, toScreen)` före `sim.events = []`. `toScreen(x, z)` är den projektion som redan finns för bounty (main.js:220).
- `tick()`: `audio.update(vdt, sim, paused)` bredvid `view.sync(vdt)`.
- `menu.setSetting`: `audio.setSettings(settings)` efter `saveSettings`.
- `withCash`-wrappern: `audio.ui(r.ok ? name : 'deny')`.
- `settings.js`: `AUDIO_READY = true` och ta bort tipset i menyn.

**Händelse till ljud** (manifestet, inte kod): `shot` (per `gunId`: m249 lätt, m2 tung; `hit` styr träffljud), `grenade` (kast), `blast` (smäll, plus kort ducking av musiken), `kill` (per `type`: brute djupare), `breach` (basen, plus `hud.baseHit`-pulsen), `obstacleHit`/`obstacleBroken` (betong), `waveStart`/`waveCleared`/`won`/`lost` (stingers), `earlyBonus` (kassa). Ambiens och zombieläten kommer inte från händelser utan från `update`: antal levande zombier styr en grundloop, och var 1 till 3 s spelas ett stön från en slumpad levande zombies läge (vyns `Math.random`, inte simens rng).

**Mixer**: `ctx -> master -> { sfx, music } -> destination`. `sfx.gain = effectiveVolume(settings, 'sound')`, `music.gain = effectiveVolume(settings, 'music')`, ramper på 50 ms så reglaget inte knastrar. Positionella ljud får en `StereoPannerNode` ur skärm-x och en avståndsdämpning ur avståndet till kamerans mål (`rig.target`), så att en utzoomad Gnesta-kamera hör horden som en massa och en inzoomad hör enskilda skott.

**Pooling och tak**: `AudioBufferSourceNode` är enskott och kan inte återanvändas, så poolen är en röstbudget: högst N samtidiga röster per ljud (shot 6, kill 4, hit 3) och en ratelimiter per ljud och bildruta (högst ett nytt skott per 40 ms per vapentyp, med tonhöjdsjitter plus eller minus 4 % så 10 skott i sekunden inte låter som en maskin). Händelser som faller utanför budgeten tystas, inte köas. Kill-ljud slås ihop per bildruta som bounty-flytarna redan gör. Detta är viktigt vid 3x: 15 steg per bildruta kan ge 30 skotthändelser i en enda `consume`.

**Musik**: tre loopstammar (build, wave, danger när `baseHp <= baseHp/4`) som alltid spelar men tonas mellan 0 och 1 efter `sim.phase` och bas-hp, med 1,5 s ramp. Dagsslutet: stinger plus fade. Paus: `update(dt, sim, paused = true)` duckar musiken till 30 % och spelar inga nya enskott; redan startade enskott får klinga ut (de är under en sekund). Inget `ctx.suspend()`, för det gör reglagen i menyn tysta medan man drar i dem.

**Tester**: `tests/audio.test.js` mot en falsk kontext (ett objekt med `createGain`, `createBufferSource`, `currentTime`): röstbudget och ratelimiter, att `setSettings` ger rätt gain för mute, att `consume` på en lista med 30 `shot` startar högst 6 röster. Mixern och manifestet är ren logik; Web Audio behövs inte i node.

**Vad som inte ändras**: sim, events, vy. Ljudet lägger inget i `sim.events` och frågar aldrig rutten; det får sina lägen ur händelserna (`x, z`) och ur `sim.zombies` i `update`.

## Merge plan

Läget i `/Users/olabelin/Projects/horde` (kontrollerat 2026-10-15):
- `master` = 088f3b1 (tre commits: designutkast, grafikprov, byggplan). Den är förfader till `build/0.3`, så den kan fast-forwardas.
- `build/0.2` = 37394e4, redan helt inne i `build/0.3`.
- `build/0.3` = ea70374. **Bara en commit saknas i `gnesta/map`**, inte två: `336abfb` (launch.json, todo H029) kom in via mergen `eeff369`. Det som saknas är `ea70374` (två referensbilder i `docs/refs/gnesta/` och två rader i todo.md).
- `gnesta/map` = 01fd95e (0.5.1), 16 commits efter mergen. `git merge-tree` ger inga konflikter mot `build/0.3`, men todo.md får då **dubbla id**: ea70374 lägger till H030 (parkeringen) och H031 (spökhus i dimman) medan gnesta/map redan har H030 (balans) och H031 (instansering). Båda de gamla är dessutom gjorda i 0.4.0 (parkeringen och sporthallen, gnesta-ghost.js).
- Arbetsträdet i `horde` är inte rent: `.claude/launch.json` är omformaterad (bara radbrytningar, samma innehåll) och tre `docs/playtests/0.3.0-*.png` är ospårade (`/*.png` i .gitignore gäller bara roten). `horde-gnesta` har fyra ospårade rapporter (`.superpowers-*.md`, `gnesta-map-report.md`); `.superpowers/sdd` är ignorerad. Worktree `horde-play` står på 01fd95e, ren.
- Inget remote är satt. Olas regel är att commits ska pushas; det går inte förrän ett remote finns.

Ordning, varje steg grönt innan nästa:

1. **Städa `horde` först.** `git status` och `git stash list` rapporteras till Ola (checklistan). `.claude/launch.json`: `git checkout -- .claude/launch.json` (ren omformatering). Speltestbilderna: `git add docs/playtests && git commit -m "Speltestbilder 0.3.0"` på `build/0.3`, eller flytta dem till `docs/` i gnesta/map; de hör till dokumentationen och ska inte ligga lösa.
2. **Rättningarna ovan i `gnesta/map`** som 0.5.2 (Must fix 1 till 5), tester gröna, CHANGELOG.
3. **Merge `build/0.3` in i `gnesta/map`**: `git merge build/0.3` i `/Users/olabelin/Projects/horde-gnesta`. Ingen kodkonflikt. Rätta todo.md i samma commit: de två nya raderna från ea70374 numreras om till H035 och H036 och bockas av (gjorda i 0.4.0), och den dubbla H029 (verktyg) blir H037. Rapporterna `.superpowers-*.md` och `gnesta-map-report.md` flyttas till `docs/reports/` och committas, eller tas bort; inget ospårat ska ligga kvar i roten när grenen är klar.
4. **Fast-forward `master`**: i `horde`, `git checkout master && git merge --ff-only gnesta/map`. Eftersom master är förfader blir det ingen mergecommit och historiken är linjär från designutkastet till 0.5.2. Tagga: `git tag v0.3.1 43abbb2`, `git tag v0.5.2 <ny tipp>`. `build/0.2` och `build/0.3` kan då tas bort (allt finns i master och taggarna); `gnesta/map` tas bort efter mergen.
5. **Worktrees**: `git worktree remove ../horde-play` (ren, detached). Behåll `horde-gnesta` som arbetsplats för nästa gren (`audio/0.6`) eller ta bort den och arbeta i `horde` på master; en gren per worktree, som hittills. launch.json i `horde` pekar redan på båda portarna (8141, 8142).
6. **Remote**: skapa `Skugg4n/horde` på GitHub, `git remote add origin ...`, `git push -u origin master --tags`. Först då gäller "pusha alltid". Lägg det som en egen rad i todo så det inte glöms.
7. **Verifiering efter merge**: `npm test` på master (160 plus de nya), `grep` på em-dash, `python3 -m http.server 8141` och klicka igenom E4 dag 1 och Gnesta dag 1 (meny, paus, Restart day, placering, spärr) i en riktig webbläsare, inte bara headless. Pekskärm och mobilbredd är fortfarande otestade (todo H026); det är inte ett mergehinder men ska stå kvar som öppet.

## Assessment

0.3.1 till 0.5.1 är ett stort och välbyggt steg. De fyra reglerna hålls utan undantag, och det nya ligger på rätt sida om gränsen: rutt, rutnät, flöde, placering och sikt är ren matte med egna tester, vyn läser bara, menyn och klockan är testbara utan webbläsare. Två saker som förra granskningen pekade på som de stora riskerna är lösta på det sätt som föreslogs: instanseringen (mätt, 7 gånger färre anrop) och en enda händelseväg (som gör ljudet till ett rent tillägg).

Det jag hittade är ingen arkitekturskuld utan kantfall: en spärr lagd på zombier ser trasig ut, kameran skakar bakom pausmenyn, Restart day ger exakt samma dag en gång till, och Gnestas balans saknar det kvitto E4 har. Alla fyra går att rätta på en förmiddag, och det bör göras i grenen innan den blir master så att 0.5.2 är det som taggas.

Arkitekturen är redo för ljud. main.js har vuxit till 617 rader och bär nu placeringsläget, ingångspilarna, panelplaceringen och förhandsvisningen av vägen utöver dagcykeln; när ljudet läggs till bör de fyra lyftas ut (`ui/placing.js`, `ui/entry-arrows.js`, `ui/panel-spot.js`, `render/route-preview.js`) så att main.js blir den koppling den är tänkt att vara. Ljudmodulen själv ska inte behöva mer än fyra rader i main.js.

Rekommendation: rätta "Must fix before merge" som 0.5.2 i `gnesta/map`, merga `build/0.3` (en commit) med omnumrerad todo, fast-forwarda master, tagga, sätt upp remote. Börja ljudet på en ny gren från master.
