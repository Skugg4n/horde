# Horde: inlärning steg för steg (design, utkast)

Version 0.1 · 2026-10-16 · status: UTKAST, väntar på Olas beslut (avsnitt 7). Bara design, ingen kod.

Underlag: README.md, CHANGELOG.md (0.14.2), todo.md, speltesterna 0.14.0, 0.14.1 och 0.14.2 i docs/playtests/, docs/superpowers/specs/2026-10-16-operation-design.md, skärmbilderna docs/0.14.0-intro.jpg, -opmap.jpg och -depot.jpg, samt spelets nuvarande texter i src/data/ och src/main.js.

Olas feedback som designen svarar på:
- "Det är rörigt och mycket text. BOOM, en stor hög info på en gång. Tricket är att dosera kunskap över längre tid."
- "Redan på E4 dag 1 är det massor av val om trupper. Det måste komma senare, ett steg i taget. Paus, paus, info."
- "Kolla hur andra har gjort, så vi kan kommunicera med spelaren."

---

## 1. Forskningen i korthet

### Vad spelen gör

**Plants vs. Zombies** (George Fan, GDC 2012, "How I Got My Mom to Play Through Plants vs. Zombies"). Det tydligaste förebilden för Horde.
- Ny sak ungefär var femte bana, och första besöket i affären får man bara köpa en sak.
- Första banan lär ut att plantor skjuter åt höger och zombier går åt vänster utan att säga det.
- Cirka åtta ord på skärmen åt gången. "Click on a seed packet to pick it up" i stället för en välkomsttext.
- Tvinga fram en första handling: startresurserna räcker bara till en solros, och det som går att köpa lyser ("people will press the shiny button").
- Passiva meddelanden som inte kräver klick, och anpassade meddelanden som bara kommer när spelaren gör något relevant (och skärps om spelaren fastnar).
- Visuell regel 1: en enhet ska förstås på sikt. Regel 2: annars efter en användning.
- Det mest komplexa (Zen-trädgården) kommer nära slutet.

**Kingdom Rush** (Ironhide). En ny fiende per våg eller bana, med ett "New Enemy"-kort när den dyker upp första gången. Tips dyker upp under banorna och slumpas fram efter en förlust. Encyklopedin fylls på när torn och fiender blir kända, så att den fungerar som ett påminnelseregister.

**Bloons TD 6** (Ninja Kiwi). Första banan är en guidad match där en hjälpare låter spelaren placera en apa i en markerad cirkel innan första rundan, visar uppgraderingsmenyn först efter runda 2 och släpper hjälten i runda 3. Ett verktyg per moment, inne i en riktig match.

**Into the Breach** (Subset Games). Tydlighet före allt: utvecklaren har sagt att de hellre strök en idé än lade till något som inte gick att visa tydligt. Fiendernas nästa drag syns i förväg, så att gränssnittet är en del av pusslet. Recensenter noterar att reglerna lärs ut men inte strategin; den lär man sig genom att förlora.

**They Are Billions** (Numantian). Motexemplet. Recensenter och forum klagar på att det saknas handledning och förlåtande startbanor, att poängsystemen är oförklarade och att tidiga val är "nybörjarfällor". Utvecklarna sa själva att kampanjen testades av erfarna spelare på svår nivå. Lärdom för Horde: grind och hög ribba fungerar bara om reglerna är begripliga.

**Mindustry** (Anuke). Första kampanjbanan Ground Zero är handledningen: gruva, band, fabrik, sedan torn och mur, i den ordningen. Ledtrådar dyker upp vid skärmkanten när man upptäcker en ny mekanik. Spelare har klagat på att sidomekaniker saknar förklaring.

**Close Combat 3/4** (Atomic Games). Kärntrupper som följer med mellan striderna, erfarenhet från grön till veteran, vila, påfyllnad och uppgradering mellan striderna. En utvecklare på Battlefront skriver att kärntruppssystemet var ett av de största klagomålen på CC3:s kampanj och att det är svårt att balansera när nya enheter kommer in slumpvis. Lärdom: metalagret behöver en lugn och tydlig introduktion, inte allt på en gång.

**XCOM: Enemy Unknown / XCOM 2** (Firaxis). Enemy Unknowns valfria handledning "skalade av XCOM ett lager i taget" och tog cirka 1,5 timme; erfarna spelare kunde hoppa över den. I XCOM 2 öppnas basen (Avenger) efter första uppdraget med tvingade val: första forskningen är låst till ett alternativ och första befordran görs åt en.

**Frostpunk** (11 bit). Utvecklarna säger att spelet är svårt nog redan, och att gränssnittet därför ska vara så lättläst som möjligt (Frostpunk 2:s gränssnitt gjordes om efter betan). Tryck och tydlighet går ihop: hårt spel, men aldrig oklart vad som händer.

### Mönstren

| Mönster | Vad det betyder för Horde | Främst från |
|---|---|---|
| Ett nytt begrepp per bana | En ny sak per dag, resten är känt | PvZ, Kingdom Rush, Mindustry |
| Tvingad första handling | Ett kort lyser, allt annat är dämpat, ett klick krävs | PvZ, BTD6, XCOM 2 |
| Markera och pausa | Världen stannar, en sak lyses upp, en rad text | BTD6, Kingdom Rush (New Enemy) |
| Visa, säg inte | Skjutbågen syns när man placerar; texten förklarar inte den | PvZ regel 1 och 2, Into the Breach |
| Tips i stunden | Texten kommer när det händer (mål utanför bågen, första civila som faller) | PvZ (adaptiva meddelanden), Mindustry |
| Gradvis HUD | Knappar och mätare syns först när de går att använda | Game Developer: "introducera menyer när de låses upp" |
| Påminnelseregister | En "Field manual" som fylls på, öppnas när man vill | Kingdom Rush (encyklopedin), Game Developer tips 6 |
| Textgräns | Runt åtta ord i PvZ; här högst 12 per steg | PvZ |
| Metalagret sist | Kartan och förrådet först när kärnloopen sitter, och då ett val i taget | PvZ (affären), XCOM 2, CC3 som varning |
| Tips efter förlust | En relevant påminnelse när man förlorat samma dag | Kingdom Rush |

### Källor

- George Fan, "How I Got My Mom to Play Through Plants vs. Zombies", GDC 2012, anteckningar: https://notes.hamatti.org/Sources/Talks/How-I-got-my-mom-to-play-through-Plants-vs.-Zombies
- Filament Games, "10 Tips for Designing a Game Tutorial": https://www.filamentgames.com/blog/10-tips-designing-game-tutorial
- Game Developer, "6 Tips for Designing a Game Tutorial": https://www.gamedeveloper.com/game-platforms/6-tips-for-designing-a-game-tutorial
- Kingdom Rush Wiki, Encyclopedia: https://kingdomrushtd.fandom.com/wiki/Encyclopedia och Vez'nan's Tower: https://kingdomrushtd.fandom.com/wiki/Vez%27nan%27s_Tower
- Game Developer, "Kingdom Rush: the wonderful campaign level design": https://gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design
- Bloons TD 6 (wiki-spegel med handledningens förlopp): https://breezewiki.discard.no/bloons/wiki/Bloons_TD_6
- Into the Breach: Game Developer-video om designen https://gamedeveloper.com/design/video-how-subset-games-designed-i-into-the-breach-i- , GDC 2019-postmortem https://gdcvault.com/play/1025772/-Into-the-Breach-Design , recension https://www.nintendoworldreport.com/review/48016/into-the-breach-switch-review
- They Are Billions: https://gamecritics.com/daniel-weissenberger/they-are-billions-ps4-review/ och https://steamcommunity.com/app/644930/discussions/0/1645418448925398181
- Mindustry: https://steamcommunity.com/app/1127400/discussions/0/2992045158712949028
- Close Combat 3: https://www.gog.com/game/close_combat_3_the_russian_front och Battlefront-forumet https://community.battlefront.com/topic/11304-campaigns-what-they-are-and-arent/
- XCOM: https://gamedeveloper.com/design/how-i-xcom-enemy-unknown-i-overcame-the-accessibility-stigma och https://www.gameswelt.de/xcom-2/komplettloesung/mit-dieser-anleitung-schlagt-ihr-die-aliens-in-die-flucht-253164/3
- Frostpunk 2:s gränssnitt: https://www.pcgamesn.com/frostpunk-2/ui-improvements

**Osäkerheter.** Jag hittade ingen utvecklarkälla för Into the Breachs hovringsförhandsvisningar, Frostpunks egen handledning eller Close Combat 3:s rekvisition i detalj; de delarna bygger på recensioner, forum och min egen kännedom om spelen. XCOM 2:s förlopp kommer från en enda genomgång. Siffran "68 % slutar vid långa handledningar" som cirkulerar på nätet gick inte att kontrollera och används inte.

---

## 2. Principer för Horde

### 2.1 Ett begrepp per dag

- Varje dag har **ett** nytt begrepp med en eller flera **lektionssteg** (pausade, kräver handling).
- Därutöver får en dag ha högst **en tyst upplåsning**: något som dyker upp i HUD:en med en etikett på högst 6 ord, utan paus (till exempel fartknappen). Den lärs med att göra, inte läsa.
- **Tips i stunden** (avsnitt 5.3) kommer bara för saker som redan är upplåsta, och bara när de behövs.
- Dagens begrepp är det enda som syns i dagens intro. Inget annat nytt nämns.
- Det som inte är upplåst finns inte: inget grått kort, ingen låst knapp, ingen rad om det. (Undantag: operationskartans grå städer, som är bakgrund.)

### 2.2 Textgränser

| Yta | Gräns |
|---|---|
| Lektionssteg | Högst 12 ord, helst en mening, aldrig fler än två |
| Tyst upplåsning, etikett | Högst 6 ord |
| Notis (toast) | Högst 8 ord |
| Dagens intro | Rubrik högst 4 ord + en rad, högst 12 ord |
| Ledningens meddelande | Högst 20 ord, visas en gång (på kartan), inte igen i introt |
| Field manual, uppslag | Högst 40 ord + en bild + tangenten |
| Resultatskylten | Högst 5 rader siffror, radion i egen ruta |

Siffror och tangenter räknas inte som ord. Tangenter skrivs alltid som tangentkåpor (`R`, `Space`), aldrig "press the R key".

### 2.3 Paus och markering

- **Hård paus** (simuleringen står, farten går till 1x, världen dämpas utom det markerade) får bara användas:
  1. under bygget före första vågen (simuleringen står redan, så inget går förlorat),
  2. första gången en ny fiendetyp syns,
  3. första gången något avgörande händer (basen tar skada, en civil faller, en spärr ger vika).
- Högst två hårda pauser per våg och minst 20 s mellan dem. En tredje väntar till nästa lugna stund.
- Ett steg som kräver en handling släpper först när handlingen är gjord. Ett steg som bara visar något släpps med klick, `Enter` eller `Space`. Tangenten som släpper steget gör inget annat (`Space` startar inte vågen samtidigt).
- En sak markeras åt gången. Två plåtar på skärmen samtidigt är förbjudet.

### 2.4 Alltid synligt och upplåst

Alltid synligt från E4 dag 1: dagen och vågen (DAY-plåten), BASE, Start wave, menyknappen (paus), kameran (dra, scrolla). Allt annat låses upp enligt schemat i avsnitt 3 och 4.

Upplåsningen hör till kampanjen, inte till om tipsen är på. En spelare som stänger av tipsen får ändå HUD:en i samma takt (systemen kommer med kampanjen), bara utan pauser och text. Debugmenyns Jump to låser upp allt fram till den dagen.

---

## 3. Upplåsningsschema dag för dag

Läsanvisning: **Steg** är pausade lektionssteg med exakt spelartext (engelska). **Tyst** är en upplåsning utan paus. **Stunden** är tips som kan komma från och med den dagen när de behövs. Ordantalet står inom parentes.

Utgångspunkt för E4: den nya militära vägspärren vid trafikplats Lästringe. Jag antar markerade platser för pjäserna och en spärr med bom; layouten är inte klar, så platserna i stegen kan behöva justeras.

### Översikt

| Dag | Det enda nya | När det dyker upp i övrigt |
|---|---|---|
| E4 dag 1 | Ställ ut en pjäs, starta vågen | Infanteriet står redan vid bommen (visas, sägs inte) |
| E4 dag 2 | Förnödenheter och taggtråd | Tyst: fart (`F`) |
| E4 dag 3 | Sikta: båge, dra, `R` | Pillboxen står redan svetsad (visas, sägs inte) |
| mellan | Operationskartan, minsta form | |
| South dag 1 | Evakueringen | Tyst: minikartan (`Tab`) |
| South dag 2 | Barrikader som styr om horden | Tyst: hordens väg (`V`); grupperna tar skydd (bildtext) |
| mellan | RP och förrådet, bara nivåer på egna enheter | |
| South dag 3 | Vilande hus | Tyst: Next wave med bonus |
| mellan | Förrådet: rekvisition | |
| South dag 4 | Flytta (`M`) | Tyst: waypoints (`Shift`) |
| mellan | Förrådet: uppgraderingar | |
| South dag 5 | Förnödenheter på enheten (granatkit, ammunition, sandsäckar) | |
| mellan | Två sektorer: tryck, omplacering, Return | |
| North dag 1 | (vilodag: inget nytt i striden) | |
| North dag 2 | Två fronter: minikartans pingar | |
| North dag 3 | Uppställningen: frontbredd och reserv | |
| North dag 4 | Tvåstegsvalet i köpraden | |
| North dag 5 | Inget nytt: allt på en gång | Field manual påminns efter förlust |
| när det händer | Erfarenhet (stjärna), förluster som följer med | |

### Hela schemat

| Dag | Nytt begrepp | Så introduceras det (exakt text, högst ~12 ord per steg) | Blir synligt | Förblir dolt |
|---|---|---|---|---|
| **E4 dag 1** "The roadblock" | Ställ ut en pjäs och starta vågen | Intro: **"Hold the E4 at Lästringe."** (5)<br>Steg 1, hård paus, Ksp 90-kortet lyser: **"Your Ksp 90. Click it."** (4)<br>Steg 2, de markerade platserna pulserar: **"Click a marked spot by the road."** (7)<br>Steg 3, Start wave lyser: **"Ready. Start the wave."** `Space` (4)<br>Steg 4, första zombien, hård paus, spotlight: **"Walkers. Slow, but they keep coming."** (6)<br>Stunden, första träffen på basen: **"Base hit. At zero the day is lost."** (8)<br>Efter våg 1, kort nummer två lyser: **"A second Ksp 90. Place it too."** (6) | DAY-plåten, BASE, Start wave, en bricka med Ksp 90-kortet (inga kategorier, inga siffror), skjutbågen medan man placerar, nedräkningen till nästa våg (går av sig själv) | Förnödenheter och pengar, köpraden, fart, Next wave-knappen, minikartan, hordens väg, enhetspanelens knappar (bara namn och hälsa vid klick), operationskartan, förrådet, RP, Field manual (kommer på resultatskylten) |
| **E4 dag 2** "Runners" | Förnödenheter och taggtråd | Intro: **"Runners on the E4. Wire buys you time."** (8)<br>Steg 1, förnödenhetsmätaren tänds: **"Supplies. Spend them on defences during the day."** (8)<br>Steg 2, trådkortet lyser: **"Wire slows them. Lay it across the road."** (8)<br>Steg 3, första löparen, hård paus: **"Runners. Fast and fragile. Keep them in the wire."** (9)<br>Tyst efter våg 1: fartknappen, etikett **"Faster: F"** (2) | Förnödenhetsmätaren, köpraden med ett kort (Wire), fartknappen | Barrikader och skrotbilar, sikta-dra (vanligt klick riktar mot vägen), `R`, `M`, minikartan, väg-`V`, Next wave, kartan, förrådet, RP |
| **E4 dag 3** "Brutes" | Sikta: skjutbågen, dra för att sikta, `R` | Intro: **"Brutes tonight. The Ksp 88 hits hard."** (7)<br>Steg 1, Ksp 88-kortet lyser: **"The Ksp 88 covers a narrow arc. Aim it."** (8)<br>Steg 2, under placeringen: **"Press, then drag toward the road to aim."** (8)<br>Steg 3, efter placeringen, pjäsen markerad: **"Wrong way? Select it and press R."** `R` (6)<br>Steg 4, första bjässen, hård paus: **"Brutes. Tough. Wire barely slows them."** (6)<br>Stunden (finns redan): **"Target outside arc. Press R to rotate."** (7) | Enhetspanelen med Rotate, R-flaggan över pjäsen | `M`, barrikader, minikartan, `V`, Next wave, kartan, förrådet, RP |
| **mellan** E4 och South | Operationskartan, minsta form | Efter VICTORY och radion öppnas kartan för första gången. E4 är grå med texten "Withdrawn" (inte ett kryss). Gnesta South pulserar.<br>Steg: **"Gnesta is next. Open the sector."** (6)<br>Inkorgen visar ett meddelande, högst 20 ord. | Kartan, en sektor, en knapp till dagen, inkorgen (ett meddelande) | Depot-knappen, RP-mätaren, tryck och dess förklaring, Main menu-knappen flyttas till hamburgermenyn |
| **South dag 1** "Civilians" | Evakueringen | Före bygget: kameran glider längs den gula linjen från husen till ishallen (3 s, klick hoppar över).<br>Intro: **"Get the civilians to the ice rink."** (7)<br>Steg 1, gula linjen lyser: **"Civilians walk this yellow line to the ice rink."** (9)<br>Steg 2, evakueringsstapeln lyser: **"Get 13 of 20 inside. That wins the day."** (9)<br>Steg 3, Volunteers-kortet: **"Volunteers. Place them where they can see the line."** (9)<br>Stunden, första civila som faller, hård paus: **"Civilian down. Too many lost and the day fails."** (9)<br>Tyst: minikartan, etikett **"Map: Tab"** (2) | Evakueringsstapeln, minikartan | Barrikader (bara tråd, som är känd), vilande hus (tas bort från dagen), `V`, `M`, Next wave, förrådet, RP |
| **South dag 2** "The Home Guard" | Barrikader styr om horden | Intro: **"Block a street and they walk around."** (7)<br>Steg 1, de röda pilarna lyser: **"Red arrows: the way the horde will walk."** (8)<br>Steg 2, barrikadkortet: **"Block a street. They walk around the block."** (8)<br>Steg 3, när pilarna ritats om och blinkar: **"New route. Always leave them one way through."** (8)<br>Bildtext (ingen paus) när Hemvärnet ställts ut: **"Squads find their own cover."** (5)<br>Tyst: **"Route: V"** (2) | Barrikadkortet, V-etiketten | Vilande hus, `M`, Next wave, granatkit, förrådet (öppnas efter dagen), RP |
| **mellan** South 2 och 3 | RP och förrådet, steg 1 av 3 | Resultatskylten visar RP för första gången.<br>Steg: **"RP: earned in battle, spent between days."** (7)<br>På kartan pulserar Depot.<br>I förrådet syns bara kolumnen "Units in Gnesta South" och en Level II-knapp lyser: **"Spend RP to train a unit one level."** (8) | RP-mätaren, Depot-knappen, enhetskolumnen med Level | Requisition-kolumnen, Depot upgrades, Return, omplacering |
| **South dag 3** "The forest road" | Vilande hus | Intro: **"Intel: infected hiding in a house."** (6)<br>Steg, huset med röd ram lyser: **"Red door: infected inside. They burst out with the wave."** (10)<br>Tyst efter våg 1: Next wave-knappen, etikett **"Call early: bonus supplies"** (4) | Huset med röd ram och "!", Next wave med bonus | `M`, granatkit på enheten, förrådets två andra kolumner |
| **mellan** South 3 och 4 | Förrådet, steg 2 av 3: rekvisition | Requisition-kolumnen tänds, ett kort lyser: **"Command released new units. Requisition them with RP."** (8) | Requisition-kolumnen | Depot upgrades, Return, omplacering |
| **South dag 4** "Brutes" | Flytta (`M`) | Intro: **"Brutes. Move your guns to where they come."** (8)<br>Steg 1, en pjäs markerad: **"Select a unit and press M to move it."** `M` (9)<br>Steg 2: **"Click where it goes. No fire while moving."** (8)<br>Tyst under förflyttningen: **"Shift-click: waypoints"** (2)<br>Stunden, alla gator stängda: **"Every road shut: they smash a barricade."** (7)<br>Stunden, Psg 90 i handen: **"Snipers go on flat roofs or ridges."** (7) | Move i panelen, waypoint-linjen | Granatkit, ammunition och sandsäckar på enheten, Depot upgrades |
| **mellan** South 4 och 5 | Förrådet, steg 3 av 3: uppgraderingar | Depot upgrades tänds (bara för typer som finns i sektorn): **"Upgrades improve every unit of that type."** (7) | Depot upgrades | Return, omplacering |
| **South dag 5** "Everything" | Förnödenheter på enheten | Intro: **"Everything they have. Keep your units supplied."** (7)<br>Steg, en enhet markerad, panelens förnödenheter lyser: **"Click a unit: ammo, sandbags or a grenade kit."** (9)<br>Stunden (ersätter dagens lång notis): **"Supplies to spare. Click a unit."** (6)<br>Stunden: **"Mounted. It can't move."** (4) | Panelens förnödenhetsrad (Ammo, Sandbags, Grenade kit) | Return, omplacering, tryck |
| **mellan** South 5 och North | Två sektorer: tryck och omplacering | På kartan tänds Gnesta North och tryckets pips.<br>Steg 1: **"Two sectors now. The one you skip gets tougher."** (9)<br>I förrådet tänds omplacering och Return.<br>Steg 2: **"Reassign units between sectors here. It costs nothing."** (8) | Andra sektorn, tryckets pips, omplacering, Return | Inget (allt i metalagret är nu ute) |
| **North dag 1** "From the north" | Vilodag: inget nytt i striden | Intro: **"They come from the north today."** (6)<br>Inga steg. Nuvarande dag-1-tips om barrikaden och gångvägen tas bort eller blir en bildtext: **"Watch them take the footpath."** (5) | | |
| **North dag 2** "The pincer" | Två fronter: minikartans pingar | Intro: **"Two columns at once."** (4)<br>Steg, vid första pingen, hård paus, minikartan lyser: **"A ping means trouble. Click it to look."** (8) | Pingarna framhävda (de fanns förut, nu förklarade) | |
| **North dag 3** "Brutes in front" | Uppställningen: frontbredd och reserv | Intro: **"Infantry has arrived. Not everyone fits on the line."** (9)<br>Steg 1, reservbrickan lyser: **"Frontage: only 9 units fit here. Choose who goes."** (9)<br>Steg 2, efter första valet: **"The rest wait in reserve until tomorrow."** (7) | Frontbreddsräknaren ("6 / 9") i uppställningen | |
| **North dag 4** "The flank" | Tvåstegsvalet i köpraden | Intro: **"They break through behind your line."** (6)<br>Steg, köpraden visar kategorierna: **"Keys: first the group, then the item. Try 1, 2."** (9) | Kategorierna i köpraden med siffror | |
| **North dag 5** "The whole town" | Inget nytt: provet | Intro: **"Every road at once. Hold the doors."** (7)<br>Efter en förlust (som Kingdom Rush): ett relevant uppslag ur Field manual föreslås, en rad. | | |
| **när det händer** | Erfarenhet och förluster | Första stjärnan, på resultatskylten: **"Three days survived: a star. Better aim, faster reload."** (8)<br>Första vinsten med stupade: **"The fallen stay lost after a win. Refill at the depot."** (10) | Stjärnan på kortet | |

**Debugmenyn** ingår aldrig i inlärningen. Den ligger kvar bakom fem klick på versionen eller ?debug och nämns inte i Field manual. Den får en ny rad "Lessons": Reset tips, Mark all seen, Jump to lesson.

### Konsekvenser för speldata

- **E4 dag 1:** bara en Ksp 90 i handen från början och en till efter våg 1. Infanteriet står redan vid bommen. Ingen tråd, inga block, inga förnödenheter. Pillboxen kommer dag 3 i stället för dag 2, och står redan svetsad. Ksp 88 kommer dag 3 som i dag.
- **Barrikader** finns inte på E4 alls i inlärningen (E4 har inget rutnät och omdirigeringen kan inte visas där). Skrotbilarna på E4:s markerade platser kan komma senare som förnödenhet, efter South dag 2.
- **Vilande hus** flyttas från South dag 1 och 2 till South dag 3 (src/data/gnesta.js har dem i dag på dag 1, 2 och ett oförvarnat på dag 3).
- **Uppställningen** finns från dag 1 i den meningen att man ställer ut det man fått före vågen. Ordet "Deploy", reservbrickan och frontbredden blir synliga först North dag 3.
- **RP** tjänas från E4 dag 1 men visas inte förrän efter South dag 2. Det som tjänats ligger och väntar.
- Balansskriptets policyer och fingeravtrycken behöver respektera upplåsningarna (se risker).

---

## 4. HUD:ens upplåsning

| Del | Finns från | Hur den dyker upp |
|---|---|---|
| DAY-plåten (dag, våg, kvar) | E4 dag 1 | Alltid |
| BASE | E4 dag 1 | Alltid; röd bara när basen faktiskt tagit skada (rättar buggen med röd 20) |
| Start wave | E4 dag 1 | Alltid före våg 1 |
| Menyknappen (paus) | E4 dag 1 | Alltid |
| Kortbrickan (en rad kort, utan kategorier) | E4 dag 1 | Ett kort åt gången; nya kort glider in från höger och står på fast plats |
| Skjutbågen vid placering | E4 dag 1 | Visas utan text |
| Nedräkningen mellan vågor | E4 dag 1 | Går av sig själv, ingen knapp |
| Field manual-knappen | slutet av E4 dag 1 | Visas på resultatskylten med första uppslaget |
| SUPPLIES-mätaren | E4 dag 2 | Lektionssteg |
| Fartknappen (`F`) | E4 dag 2, efter våg 1 | Tyst |
| Enhetspanelen: Rotate och R-flaggan | E4 dag 3 | Lektionssteg; före dag 3 visar panelen bara namn och hälsa |
| Operationskartan | efter E4 dag 3 | Lektionssteg |
| Evakueringsstapeln | South dag 1 | Bara på evakueringsdagar |
| Minikartan (`Tab`) | South dag 1 | Tyst |
| Hordens väg, etiketten `V` | South dag 2 | Tyst; pilarna själva syns redan under bygget från dag 1 men utan etikett |
| RP-mätaren, Depot-knappen | efter South dag 2 | Lektionssteg |
| Next wave med bonus | South dag 3, efter våg 1 | Tyst |
| Move i panelen (`M`) | South dag 4 | Lektionssteg |
| Förnödenheter i panelen | South dag 5 | Lektionssteg |
| Tryckets pips, sektorlista | före North dag 1 | Lektionssteg |
| Minikartans pingar framhävda | North dag 2 | Lektionssteg |
| Frontbredd och reserv i uppställningen | North dag 3 | Lektionssteg |
| Köpradens kategorier och tvåstegssiffror | North dag 4 | Lektionssteg |
| Debugknappen | aldrig i inlärningen | Fem klick på versionen eller ?debug |

Kortbrickan: före North dag 4 har varje kort en siffra (1, 2, 3) och ett tryck väljer det. Kategorierna och tvåstegsvalet kommer när korten blir fler än fem. Det ändrar dagens tvåstegsval (H097) för tidiga dagar; se fråga 3.

---

## 5. Lektionssystemet

### 5.1 Stegets format

Varje lektion är data, en lista med steg per dag (ersätter fältet `hints` i src/data/maps.js och gnesta.js):

- `id`: unikt, till exempel `e4d1.pick`. Sparas när det är sett.
- `trigger`: när steget börjar: dagens start, efter föregående steg, en händelse i simuleringen (`firstSeen:runner`, `baseHit`, `civilianDown`, `idleOutside`, `routeChanged`, `ping`), eller ett läge i gränssnittet (`placing:ksp88`).
- `kind`: `step` (hård paus, kräver handling), `show` (hård paus, släpps med klick), `caption` (ingen paus, tonas bort efter 4 s), `tip` (stunden, ingen paus, notisplats).
- `target`: vad som markeras: ett gränssnittselement (väljare), en plats i världen (ruta, hus, zombie) eller en linje (gula linjen, pilarna).
- `text`: högst 12 ord (6 för caption). Tangenter som egna tokens så att de ritas som tangentkåpor.
- `done`: villkoret som släpper steget (till exempel att en pjäs står ute), som dagens `hintStepDone`.
- `manual`: vilket uppslag i Field manual steget låser upp.

Steg körs i ordning; ett senare steg som redan är uppfyllt bockar av de före (som i dag). Ett steg som väntar på en handling som inte går (till exempel inga förnödenheter) hoppas över och loggas.

### 5.2 Paus och utseende

- **Dämpning:** hela skärmen får ett lager med `--ink` på cirka 55 % utom ett hål runt målet (mjuk kant 12 px). Inget blänk, ingen studs.
- **Markeringen:** fyra hörnvinklar i `--rust`, 2 px, som registreringsmärken på en stencil, runt målet. De pulserar långsamt i opacitet (1,2 s). För mål i världen ritas samma vinklar på marken i skärmstorlek, som R-flaggan och de vilande husens ram.
- **Plåten:** samma `.plate` som HUD:en (mörk, tunn papperskant, 3 px hörn), placerad intill målet med en kort rak ledlinje i `--rust`. Texten i Oswald 15 px på `--paper`, tangenter som `kbd` i IBM Plex Mono. Ingen rubrik, ingen ikon, ingen stängknapp på stegplåtar.
- **Pil:** för mål utanför bild en platt chevron vid skärmkanten i samma stil som "HORDE INCOMING".
- **Under hård paus** visas en liten rad längst ned i mitten: `PAUSED` i Saira Stencil, 11 px, dämpad. Fartknappen går till 1x.
- **Ljud:** ett kort radioklick när ett steg öppnas (finns i ljudbordets stil); inget ljud för captions.
- Plåten undviker pekaren som uppdragsrutan gör i dag, men flyttar aldrig över målet.

### 5.3 Tips i stunden

- Kommer bara för upplåsta saker, en gång per kampanj (sedan bara via Field manual), utom tre som får upprepas med minst 5 minuter emellan: `Target outside arc`, `Supplies to spare`, `Every road shut`.
- Upptrappning som i PvZ: om samma problem händer tre gånger (till exempel tre nekade placeringar i rad med samma skäl) visas ett tydligare steg med markering av giltig mark.
- Efter en förlust på samma dag: resultatskylten föreslår ett uppslag ur Field manual som hör till dagens begrepp (en rad: "Field manual: Barricades").

### 5.4 Hoppa över och spela om

- `Esc` under ett steg: hoppar över just det steget (markerar det sett) och går vidare. Ett andra `Esc` inom 1 s hoppar över resten av dagens lektion.
- Pausmenyn: **Tips: On / New only / Off**. Standard On. Off tar bort steg, captions och tips men inte upplåsningen.
- Ny kampanj frågar ingenting. Första stegplåten har en liten länk under texten: "I know tower defence: fewer tips" som sätter New only (inga captions, inga upprepade tips).
- Varje uppslag i Field manual har **Show me**, som spelar om lektionens markering om målet finns på skärmen (annars bara uppslaget).
- Pausmenyn: **Reset tips** (frågar först).
- Sparfilen: `progress.lessons.seen` (id-lista) och `progress.lessons.mode`. En gammal sparfil räknar alla lektioner fram till den längst spelade dagen som sedda, så att en spelare mitt i kampanjen inte får dag 1-stegen igen.

### 5.5 Field manual

- Knapp nere till vänster (en liten bok, plåtstil) och tangenten `H`. Öppnas också från pausmenyn, kartan och förrådet. Öppen manual pausar spelet.
- Ett uppslag per begrepp, upplåst när lektionen körts (eller hoppats över). Nya uppslag har en rostfärgad prick tills de öppnats.
- Uppslaget: rubrik (1 till 3 ord), en bild (en skärmbild ur spelet eller en enkel ritning), högst 40 ord, tangenten. Inga siffror som ändras med balansen (inga hp, inga priser).
- Fyra grupper: **Basics** (place, start, base, speed), **Defences** (wire, barricades, route, supplies on units), **Units** (arc and rotate, move, squads, sniper roofs, veterancy, losses), **Operation** (map, RP, depot, sectors and pressure, frontage).
- Fiender (Walkers, Runners, Brutes) och de vilande husen får egna uppslag under **Enemies** när de setts första gången, som Kingdom Rushs encyklopedi.

---

## 6. Textgenomgång

Utgår från speltesterna 0.14.0 till 0.14.2 och spelets nuvarande strängar.

| Skärm eller text | Problem (källa) | Åtgärd |
|---|---|---|
| Dagens intro (docs/0.14.0-intro.jpg): rubrik, beskrivning, ledningens meddelande, förnödenheter och reserv | Fyra textblock; meddelandet står tre gånger (speltest 0.14.1); "Försvarsmakten: Försvarsmakten has…" | Rubrik + en rad, högst 12 ord. Meddelandet bara på kartan. Förnödenheter och reserv syns i HUD:en, inte i texten. |
| Introt för South dag 1 (src/data/gnesta.js): 45 ord om civila, frivilliga, gula linjen och att spärra gator | "Introt är en lång textvägg" (0.14.0); blandar dagens två begrepp | En rad + kameraturen längs linjen + tre steg (avsnitt 3). Spärrmeningen flyttas till South dag 2. |
| Introt för South dag 4: 26 ord om bjässar, prickskyttar, pillbox, granater och att lämna en väg | Fyra saker på en gång | En rad om dagens begrepp; prickskytten och "en väg öppen" blir tips i stunden. |
| Operationskartan (docs/0.14.0-opmap.jpg): sidopanel med tryckmening, enhetslista i text, "7 NEW" i inkorgen | Mycket att läsa före första dagen; "HOLDING" efter förlust (0.14.0) | Tryck som pips, enheterna som ikoner med antal, inkorgen visar bara senaste meddelandet. Allt utom en sektor och en knapp dolt tills schemat släpper det. |
| Förrådet (docs/0.14.0-depot.jpg): tre kolumner, uppgraderingar för vapen man inte har, rullist som klipper priser | "Uppgraderingar för Ksp 90 och Ksp 88 i Gnesta där jag bara har civila" (0.14.0, 0.14.2) | Kolumnerna tänds en i taget (avsnitt 3). Uppgraderingar visas bara för typer som finns i sektorn. |
| Instruktionsrutan (`#hint`, tre steg som en lista) | Täcker ishallen, nollställs efter varje placering (0.14.2) | Ersätts av lektionsplåten, ett steg åt gången, intill målet. |
| Resultatskylten: RP rad för rad, förluster, radio | Bra i sig (0.14.2), men för mycket före RP är upplåst | E4: bara VICTORY + radion. Från South dag 2: summa + högst fyra rader. |
| Notisen "Supplies to spare: click a unit for an ammo crate, sandbags or a grenade kit, or lay more wire." (src/main.js) | 18 ord, kommer mitt i en våg | **"Supplies to spare. Click a unit."** (6), först från South dag 5. |
| Notisen "Cash to spare: point at a gun and press U to upgrade it, or Move it…" (src/main.js) | Ser ut att vara kvar från forskningstiden; uppgraderingar köps nu i förrådet (osäkert om den fortfarande visas) | Kontrollera; ta bort om U inte längre gäller. |
| Placeringsskälet "All gun positions taken (research More positions)" (src/ui/panels.js) | Hänvisar till forskning som inte finns längre | **"Frontage full."** (2) |
| "Only on the road" på E4 när man står på vägen | Fel text (0.14.2) | **"Only on the marked spots."** (5) |
| Ingångsetiketten "16 WALKERS · 3 RUNNERS / SIGTUNAVÄGEN ÖST" | Står vid ishallen, följer pekaren, täcker mark (0.14.0 till 0.14.2) | Fast vid infarten, ikoner med antal, gatunamnet bara vid hovring. |
| "NEXT WAVE: STILL 14 LEFT" | Konstig formulering (0.14.2) | **"Next wave · 14 still out"** eller bara knappen med bonusen. |
| Return-bekräftelsen ("Return Infantry L1? Given by command, so no RP back. Sector E4 keeps 2 units.") | 15 ord, tre fakta | **"Return it? No RP back."** (5); resten i Field manual. |
| Panelens infotext "The fallen are replaced at the depot (RP), and only stay lost if you win the day." | 18 ord i en stridspanel | Bort ur panelen; tips i stunden första gången (avsnitt 3) + uppslag. |
| Reservvarningen "N units still in reserve. Deploy them (2), or press again to start." | Bra i sak, men före North dag 3 ska reserven inte finnas | Kvar från North dag 3: **"Units left in reserve. Start anyway?"** (6) |
| VICTORY + "has fallen silent" | Läses som förlust (0.14.0 till 0.14.2) | Kartans E4: "Withdrawn", grå, inget kryss. Radion: **"E4 withdrawn as ordered. Gnesta needs you."** (7) |

---

## 7. Risker och frågor till Ola

**Risker**
1. **Långsamt för erfarna spelare.** Tretton dagar för att få allt kan kännas segt för den som spelat Kingdom Rush. Motåtgärd: "fewer tips"-länken och att dagarna är korta (E4 cirka 2,5 till 3,5 min). Speltesta med en van tornförsvarsspelare.
2. **Balansen flyttar sig.** Utan tråd på E4 dag 1 och utan förrådet förrän efter South dag 2 ändras vad en ny spelare har. Balansskriptets policyer måste följa upplåsningen, annars mäter fingeravtrycken ett annat spel. South dag 2 är redan en vägg för nya spelare (speltest 0.14.2) och får nu också barrikadlektionen.
3. **E4 vid Lästringe är inte byggd.** Stegen för E4 antar markerade platser och en bom. Ändras layouten måste stegens mål och texter följa med.
4. **Pauser mitt i vågen kan irritera.** Gränsen två per våg och 20 s emellan är en gissning; mät i speltest.
5. **Sparfiler.** Spelare mitt i kampanjen får plötsligt dolda delar tillbaka om migreringen räknar fel. Regeln i 5.4 (allt fram till längst spelade dag räknas som sett och upplåst) måste ha prov.
6. **Det som inte syns kan inte felsökas.** Speltestare som använder Jump to måste få allt upplåst, annars ser de ett annat spel än vi tror.

**Frågor**
1. **E4 dag 1 utan tråd och utan förnödenheter alls?** Mitt förslag är ja: bara pjäs och start. Eller vill du ha tråden redan dag 1?
2. **När ska förrådet komma?** Förslaget: efter South dag 2, med bara nivåer på egna enheter. Alternativet är efter E4 dag 3, närmare kartan, men då kommer två metasaker samtidigt.
3. **Köpraden:** enkla siffror (1, 2, 3) fram till North dag 4 och tvåstegsvalet först därefter? Det bryter mot H097 för tidiga dagar, men tvåstegsvalet behövs inte med ett eller två kort.
4. **Vilande hus till South dag 3?** De ger tidig action på dag 1 och 2 (H118), så att flytta dem kan göra dagarna lugnare i början.
5. **Hård paus vid första löparen och bjässen:** vill du ha den, eller räcker en notis utan paus?
6. **Field manual på `H`?** `F`, `M`, `R`, `V` och `Tab` är upptagna. Annat förslag: `?` eller `J`.
7. **Ska RP synas redan på E4** (som en siffra som växer) fast den inte går att använda förrän senare? Förslaget är nej, den samlas och visas när förrådet öppnas.
8. **Erfarenhetsstjärnan och förluster** kommer som tips när de händer. Räcker det, eller vill du ha en egen dag för kärntrupperna?

## Beslut (Ola 2026-10-16)

1. E4 dag 1 helt utan tråd och förnödenheter: JA.
2. Förrådet kommer efter South dag 2.
3. Köpraden: ett steg (enkla siffror 1, 2, 3 ...). Tvåstegsval bara om korten blir fler än 9 (ersätter H097 för hela spelet tills vidare).
4. Ny fiendetyp första gången: HÅRD PAUS med en presentationsruta med bild (porträtt av den nya zombien i spelets stil), en kort rapporttext ("We have reports of a new type of enemy. It moves faster.") och Continue.
5-8: förslagen i dokumentet gäller (Field manual på J, RP visas först när förrådet öppnas, erfarenhet och förluster som tips när de händer).

## Tillägg: knapphet i rekvisitionen (Ola 2026-10-16)

Det ska INTE gå att rekvirera hur mycket som helst. Ola tyckte begränsningen var det coola. Ledningen släpper ett bestämt antal per leverans: varje post i förrådet har ett lager ("Försvarsmakten releases 1 infantry squad for Gnesta"), och det man inte fått släppt kan inte köpas hur mycket RP man än har. RP är priset, leveranserna är taket. Sektortaket ligger kvar. Förrådets kort visar "1 available" / "None released".

## Tillägg: uppgraderingar och förrådets utseende (Ola 2026-10-16)

- Uppgraderingar i förrådet visas bara för det man faktiskt HAR (eller har fått släppt). Inga "Ksp 58 II" om man inte har någon Ksp 58. Uppgraderingarna släpps också pö om pö av ledningen, precis som trupperna.
- Förrådets rullister ska vara i spelets stil: smala, mörka, plåtfärgade med rost/benvit tumme, inga vita systemlister. Hellre färre poster som får plats utan rullning än långa listor.
