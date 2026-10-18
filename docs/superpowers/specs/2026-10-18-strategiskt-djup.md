# Horde: strategiskt djup (design, utkast)

Version 0.1 · 2026-10-18 · status: UTKAST (Fable), väntar på Olas beslut (avsnitt 6). Bara design, ingen kod. Svarar på H303 och H304 i todo.md.

Underlag: README.md, CHANGELOG.md (0.17.1), todo.md, specarna för operationen, inlärningen, berättelsen och Mölnbo, speltesterna 0.16.4 till 0.17.1, samt src/sim (sim.js, squad.js, flow.js, route.js, placement.js, stats.js) och src/data (weapons.js, zombies.js, obstacles.js, depot.js, lessons.js, unlocks.js).

Olas feedback som designen svarar på (0.17.1, 2026-10-18): "Det är mest att klicka ut massor av trupper längs en väg och sen vänta. Inga riktiga val. Svårt att bygga kill zones och långa korridorer för vi kan inte ha trupper i hus. Kanske trötthet så man väljer om man kastar in allt dag 1 eller håller hälften tillbaka. I rekvisitionen behöver man veta mer om trupperna, eller medvetet vagt som i Close Combat?"

---

## 1. Diagnos: varför Horde känns passivt

Jag har läst simuleringen som den ser ut i 0.17.1. Rotorsakerna, viktigast först:

1. **Placering är det enda verbet.** Spelaren gör allt före första vågen (uppställningen), och under dagen finns bara Move (långsamt, sällan värt det), taggtråd, spärrar och tre förnödenheter per enhet. Inga order, inga förmågor, ingen eld att leda. När vågen går är spelaren åskådare. Jämför Kingdom Rush, där rally points och hjälten är verb mitt i vågen, och Into the Breach, där spelaren svarar på ett förvarnat hot varje tur.
2. **Skadan är enhetlig.** Alla vapen gör samma sorts skada mot alla zombier; skillnaden är bara skada per sekund, räckvidd och båge. Bjässen har mer hp och tar 40 % av trådens bromsning, det är allt. Ingen fiende kräver ett visst vapen, så det bästa köpet är alltid mest skada per RP. BTD6 bygger hela sitt djup på att camo, lead och ceramic kräver olika verktyg; utan sådana lås finns ingen anledning att blanda trupp.
3. **Pjäserna kan inte förlora.** Ksp 90, Ksp 58, Ksp 88, Ak 5 och Psg 90 är osårbara utom under flytt. Bara grupperna och pillboxen kan ta skada, och grupperna står still tills de dör. Horden kan därför aldrig hota linjen, bara passera den. Det finns ingen "linjen håller inte, dra er tillbaka"-stund, vilket är hela Close Combats och Company of Heroes dramaturgi (suppression, pinning, retreat).
4. **Ingen avvägning mellan dagar.** Kärntrupperna följer med och blir bara starkare (stjärnor). Att ställa ut alla 10 kostar inget i morgon. Reserven finns, men bara som "de som inte fick plats". XCOM 2: War of the Chosen införde trötthet just för att tvinga rotation och ge rostern mening.
5. **Horden går alltid kortaste vägen, och spelaren ser den.** Det är bra för läsbarheten (pilarna, "Horde rerouting"), men inget händer med vägnätet under dagen utom när spelaren själv spärrar. Horden byter aldrig plan, inget öppnas eller stängs av sig självt, och kartorna har få alternativa slingor. Mölnbo-bron är det enda stället där omdirigeringen är ett riktigt pussel.
6. **Siktlinjerna skapar inte korridorer.** Husen skymmer, men enheterna får bara stå på öppen mark och tak. Längs en gata ser en pjäs 15 till 22 m. Det finns inget sätt att låta en gata bli en 60 m lång eldgata med eld från fönster på båda sidor (Company of Heroes garrison), så spelaren klumpar allt vid basen i stället.
7. **Pengar mitt i striden saknar bra utlopp.** Speltesterna visar $1 000 till $1 600 över varje dag på Mölnbo. När det inte finns något att köpa finns inget att besluta. Mindustry och Riftbreaker håller spelaren upptagen med försörjning (ammunition, kraft); Horde saknar en motsvarande kran.
8. **Ingen osäkerhet värd namnet.** Allt syns: hordens väg, hur många, varifrån, "From wave N". Into the Breach visar att perfekt information fungerar bara om spelaren har verktyg att svara med. Här finns informationen men inte svaren.

Sammanfattat: Horde har ett bra brädspel (rutnät, flöde, sikt, skydd) men nästan inga pjäser att dra under spelet, och alla motståndarens pjäser är samma pjäs i tre storlekar.

---

## 2. Forskningen: vad spelen gör som skapar val

| Spel | Mekanik | Valet den skapar | Källa |
|---|---|---|---|
| Kingdom Rush | Barracks blockerar; rally point flyttas när som helst; hjälten styrs direkt | Var ska infanteriet stå så att bågskyttarna hinner skjuta? Flytta flaggan mitt i vågen när en annan väg hotas. Inga tärningar: misslyckas du är det din plan | [AOL tips](https://www.aol.com/news/2014-07-30-kingdom-rush-tips-and-tricks.html), [AV Club](https://www.avclub.com/kingdom-rush-review-pc), [MobyGames](https://www.mobygames.com/game/54588) |
| Bloons TD 6 | Camo (kräver spaning), Lead (immun mot vasst, svag mot explosivt), Ceramic (flera lager), Purple (immun mot energi); targeting Strong/First/Last | Varje våg ställer frågan "har jag rätt sorts skada där de kommer?" Runda 59 (camo lead) och 78 (camo ceramic) är kända stup just därför. Targeting är mikroval per torn | [Bloon immunity](https://www.bloonswiki.com/Bloon_immunity), [Strategy](https://www.bloonswiki.com/Strategy:Bloons_TD_6), [Damage types](https://breezewiki.discard.no/bloons/wiki/Damage_Types) |
| Defense Grid | Torn byggs på rutor som också är vägen: tornen formar labyrinten; kärnor som bärs tillbaka ger en andra chans | Varje torn är både skada och väg. Hidden Path: "a game that everyone can pass, but that still has a ton of depth" | [PC Gamer](https://www.pcgamer.com/defense-grid-the-beer-game-that-changed-a-genre), [Game Developer](https://www.gamedeveloper.com/game-platforms/feature-how-i-defense-grid-i-went-from-bleak-to-beautiful) |
| Sanctum / Sanctum 2 | Block först, torn ovanpå; fienderna har svaga punkter; spelaren skjuter själv | Labyrinten byggs av spelaren och spelaren väljer mål själv ("solves a TD weakness where you are not in control of which enemy gets the focus") | [Indie Game Reviewer](https://indiegamereviewer.com/?p=4474), [Destructoid](https://destructoid.com/?p=80111), [Game Informer](https://gameinformer.com/games/sanctum_2/b/xbox360/archive/2013/05/16/sanctum-2-review-.aspx) |
| They Are Billions | Murar i lager med luckor; torn minst fyra rutor från muren; ljud drar till sig fler; lockbeten (Wasp-piketter) splittrar svärmen | Var är chokepointen, hur många lager, vad får låta. Felet "en obevakad ingång" kostar kolonin | [PC Gamer guide](https://pcgamer.com/they-are-billions-guide-5-essential-tips), [Steam](https://steamcommunity.com/app/644930/discussions/0/1620599015873017384), [kosgames](https://kosgames.com/?p=8732) |
| Mindustry | Ammunition på band till tornen; fulla band stannar | Försörjningen är en andra front; en bruten linje tystar tornen | [itch devlog](https://anuke.itch.io/mindustry/devlog/8406/15) |
| Infested Planet | Fienden muterar när spelaren lyckas (snabbare, spore-torn, skal) | Den taktik som vann förra striden slutar fungera; spelaren byter vapenmix | [Sprites and Dice](https://spritesanddice.com/reviews/infested-planet-great-theme-great-game/), [Destructoid](https://destructoid.com/?p=142674) |
| Tooth and Tail | Befälhavaren är den enda direktstyrda enheten och kameran | Uppmärksamheten är resursen: du kan bara vara på ett ställe | [NoobFeed](https://www.noobfeed.com/reviews/1347/tooth-and-tail-pc-review), [GodisaGeek](https://godisageek.com/reviews/tooth-and-tail-review/) |
| The Riftbreaker | Fiender med resistenser kräver blandade torn; kraft och ammunitionsfabriker; utposter lockar delar av vågen | Mineral mot kraft mot ammunition; lasrar mot stora, kulsprutor mot spam | [Steam](https://steamcommunity.com/app/780310/discussions/0/5073860311966687730/), [Tech-Gaming](https://www.tech-gaming.com/the-riftbreaker/) |
| Close Combat | Soldater med moral, Winded/Fatigued, Panicked; soldater som inte gör som du sa; fiendens info beror på hur länge du observerat; vapenverkan som grön/gul/röd i stället för siffror; force morale avslutar striden | Du leder människor, inte torn. Du vet ungefär, inte exakt | [Soldier List](https://www.magicgameworld.com/close-combat-the-bloody-first-the-soldier-list/), [Unit Information](https://www.magicgameworld.com/?p=40889), [Steam force morale](https://steamcommunity.com/app/811880/discussions/0/3104640984522857320) |
| Company of Heroes | Garrison i hus (bättre än tungt skydd, räckvidd från höjden, huset slits); suppression, pinned; riktat skydd (grönt/gult/rött); Retreat | Hus är positioner värda att slåss om; en pinnad grupp måste dras tillbaka eller dö; flankering lönar sig | [coh2.org glossary](https://www.coh2.org/guides/5732/company-of-heroes-2-basic-concepts-and-glossary), [Blendo Games om Retreat](https://blendogames.com/news/post/2017-05-25-on-company-of-heroes) |
| XCOM 2: War of the Chosen | Tired efter uppdrag, sänker Will; trötta kan skickas men presterar sämre; tvingar rotation | "Skickar jag A-laget igen eller vilar jag dem?" | [Gameranx](https://gameranx.com/features/id/118314/article/xcom-2-war-of-the-chosen-dont-like-fatigue-heres-how-to-remove-it/), [Cyberpost](https://cyberpost.co/?p=176855) |
| Into the Breach | Fienden visar sitt drag; spelaren knuffar fienden så att attacken träffar en annan fiende; deterministiskt | Perfekt information + ett verktyg att svara med = pussel varje tur | [PC Gamer](https://www.pcgamer.com/into-the-breach-preview), [Game Developer](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-) |
| Plants vs Zombies | Fem filer; zombietyper med egna motmedel (Screen Door, Zomboni, Gargantuar); mazing förkastades för att det var "awkward" | Vilken fil, vilken planta, i vilken ordning; lanes före labyrint för tydlighetens skull | [Wikipedia](https://en.wikipedia.org/wiki/Plants_vs._Zombies_(video_game)), [PC Gamer, Fans tidiga skisser](https://pcgamer.com/uk/plants-vs-zombies-turns-10-creator-shows-original-designs/) |

**Osäkerheter.** Jag fann inga utvecklarkällor för Close Combat 3/4:s exakta regler för suppression och trötthet; raderna bygger på Bloody Firsts guider (Winded, Fatigued, Panicked, färgade vapenverkan) och min kännedom om serien. Into the Breach-postmortem (GDC 2019) ligger bakom inloggning; citaten är ur förhandsvisningen. BTD6-siffror är från fan-wikis.

**Mönstren som räcker för Horde:**
- Fienden som kräver ett svar (BTD6, PvZ, Infested Planet).
- Positionen som är värd något (CoH garrison, TAB chokepoints, Defense Grid).
- Enheter som kan brytas och räddas (CoH retreat, CC moral).
- En resurs som spelaren förvaltar över tid (XCOM trötthet, Mindustry ammunition).
- Ett verb mitt i vågen med förvarning (Kingdom Rush rally, Into the Breach).

---

## 3. Mekaniker, rangordnade

Rangen väger hur mycket känslan ändras mot byggkostnaden och risken. S = en session, M = två till fyra, L = en vecka eller mer. Alla siffror är startgissningar som balansskriptet ska mäta.

### 3.1 Trupper i hus (garnison) och eldgator

**Vad.** En grupp (frivilliga, Hemvärnet, infanteri) eller en lätt kulspruta (Ksp 90, Ksp 58) kan ställas i ett hus som gränsar till en gata. Soldaterna syns i fönstren och på trappan; sikten räknas från husets fönstersidor (en siktkälla per fasad mot gata) och över husets egen höjd, som Psg 90 på tak men utan den döda vinkeln. Huset ger skydd som "wall" (soldaterna kan skadas bara av zombier som slår in dörren) och huset har egen hållfasthet: horden slår på dörren om gruppen skjuter på dem och ingen annan väg lockar (samma regel som spärrar). Hus med garnison blir en "tjock" ruta i flödesfältet (kostnad som junk cars), så horden helst går förbi.

**Varför det är ett val.** Två hus mitt emot varandra längs Stenbyvägen ger en 40 m eldgata där horden går under eld från båda sidor utan att nå någon. Det är precis Olas "långa kill corridor". Men huset är en fälla: en grupp i ett hus kan inte Move förrän den gått ut (3 s), och om horden väljer att slå in dörren står den ensam. Spelaren väljer mellan eldgatan (hög skada, hög risk) och klumpen vid basen (säkert, passivt). Company of Heroes bygger hela sin infanteristrid på detta.

**Passar.** Mölnbo och Hagstumosse är fulla av villor längs gatorna som i dag bara är hinder. placement.js har redan bldg[k] per ruta och roof-logik för Psg 90; squad.js har COVER och sikt per soldat. Hus med garnison = en ny COVER-typ ('window', score 11, stance 'kneel') plus en höjd i sightFrom. Flödesfältet tar husrutan som dyr i stället för stängd.

**Kostnad.** M. Placering (klick på hus = garnison om huset har en gatuvägg), sikt från fasad, hållfasthet och dörren, modell med soldater i fönster, Move ut ur hus, balanspolicy som använder hus.

**Risker.** Sikten från fönster kan bli för stark (hela gatan synlig): begränsa till fasadens 120 grader och husets räckvidd. Ola måste se att det finns folk i huset (H099-markören). Kulsprutor i hus bör vara bara Ksp 90 och Ksp 58; Ksp 88 och pillboxen står utanför.

### 3.2 Fiender med egenskaper som kräver svar

**Vad.** Fem nya typer, en per sektor i kampanjordning, varje med ett lås och en nyckel som redan finns i arsenalen:

| Typ | Egenskap | Nyckel | Intro |
|---|---|---|---|
| **Krypare** | Under taggtråden (ingen bromsning), låg (skyms av bilar och häckar för pjäser på marken), långsam | Grupper (de ser lågt), tak och hus (Psg 90, garnison), granater | Hagstumosse dag 4 (med de vilande husen, de kryper ut) |
| **Pansrad** (kravallutrustning, hjälm, sköld) | Tar 20 % skada från 5,56 och 7,62 (Ksp 90, Ak 5, Ksp 58, gevär), full skada från 12,7 mm (Ksp 88), granater, Psg 90 | Ksp 88, Ak 5:s granattillsats, granatlådor, senare Grg m/48 | Vikingavägen dag 3 (när Ksp 88 funnits två dagar) |
| **Uppsvälld** | Långsam, spricker vid död: 2,6 m radie, skadar spärrar (120), tråd (slits ut) och soldater (20), smittar inte pjäser | Döda den långt från spärren: Psg 90, Ak 5 på håll; eller låt den gå in i tomma rutor | Vikingavägen dag 5 |
| **Skrikare** | Skriker var 12 s: zombier inom 10 m går 40 % fortare i 4 s, och närmaste grupp (inom 14 m) får suppression (3.3). Prioriterar att hålla sig mitt i klungan | Psg 90 (Strong-targeting), granater i klungan, snabb Ksp 90 | Mölnbo dag 2 |
| **Jägare** (ex-soldat, går i skydd) | Går mot närmaste grupp eller pjäslag i stället för basen när den är inom 25 m, snabb, 60 hp. Hotar trupper, inte basen | Grupper i hus (dörren), pillboxen, Ksp 90:s snabba vridning | Mölnbo dag 4 (bron) |

Och Bjässen får en egenskap i stället för bara hp: den slår sönder spärrar fortare (3x) och knuffar undan junk cars på 8 s. Löparen snubblar redan (0.16.4), det räcker.

**Varför det är ett val.** Varje våg ställer frågan "har jag rätt vapen där de kommer?" i stället för "har jag nog?". Pansrade på Stenbyvägen och krypare på Gnestavägen samtidigt tvingar fram två olika försvar och gör rekvisitionens valfrihet verklig: Ksp 88 blir nödvändig, inte dyr. Det här är BTD6:s runda 59 och 78 på svenska.

**Passar.** zombies.js är ett objekt per typ; sim.js har redan slowTaken och hitDamage per typ. Skadeklasser kräver ett fält damageClass på vapnen ('small', 'heavy', 'blast', 'precision') och en tabell per zombietyp. Vågorna i src/data/*.js väljer typ per grupp redan. Presentationsrutan för ny fiende finns (0.16.0).

**Kostnad.** M för alla fem inklusive modeller (byggsatsen), S per typ därefter. Skrikaren och jägaren kräver 3.3 för full effekt men fungerar utan.

**Risker.** För många typer för tidigt bryter inlärningen; därför en per sektor. Immunitet som är absolut (0 skada) frustrerar; använd 20 % som BTD6:s ceramic-lager, inte lead-immunitet. Pansrad kräver att Ksp 88 går att rekvirera när typen kommer (löftes-provet från 0.16.4).

### 3.3 Trupper som påverkas: suppression, moral och reträtt (Close Combat-stil)

**Vad.** Tre lager på grupperna och pjäslagen, inget på själva pjäsen:

- **Tryck** (0 till 100) per grupp: stiger när zombier är inom 8 m (fler = fortare), när en soldat stupar (+30), när en skrikare skriker (+25), när basen tar skada i sikte (+10). Sjunker 8 per sekund när ingen zombie är inom 12 m. Över 50: eldhastighet 70 %, träff 85 %. Över 80: gruppen **viker** av sig själv (nedan). Infanteri tål mer (stiger 60 %), frivilliga mindre (140 %). Veteranstjärnan ger 85 %.
- **Vik** (Fall back): en order (tangent B, eller knapp i panelen) och det gruppen gör själv över 80. Gruppen springer bakåt längs sin egen väg till närmaste skyddsruta minst 15 m från horden och tar skydd igen, skjuter inte under språnget (3 till 6 s), är sårbar som vid Move. En grupp som vikit en gång kan inte vika igen på 20 s. Jämför CoH:s Retreat, som utvecklare kallar spelets bästa beslut för att det "räddar karaktärer, inte för evigt, men längre".
- **Pjäser kan bli överrända.** En pjäs (utom pillboxen) har ett lag med crewHp som i dag bara gäller vid flytt. Zombier inom 1,6 m slår på laget alltid. Laget på 0: pjäsen tystnar, står kvar som "abandoned" och kan tas tillbaka av en grupp som når rutan (8 s) eller rekvireras på nytt. Ksp 88 (mounted) kan inte vika, bara övergivas. Det ger Ola "pjäser som kan bli överkörda" utan att de försvinner spårlöst.

**Varför det är ett val.** Linjen kan brytas och räddas. Spelaren måste titta på grupperna, inte bara på basen: en röd gruppflagga är ett beslut (vik nu och förlora eldkraft, eller håll och riskera folk). Taggtråd och spärrar får en ny roll: hålla horden utanför 8 m så trycket aldrig stiger. Det här är den enda mekaniken som gör dagen aktiv utan att spelaren klickar mer än någon gång i minuten.

**Passar.** squad.js har redan ställningar, PRONE_ARC, RISE_TIME, skyddsval och per-soldat-sikt. hitSoldier och exposedUnits finns i sim.js. Move-vägsökningen (crew-path.js) kan återanvändas för språnget. Operationens förluster (dayReport) räknar redan stupade.

**Kostnad.** M. Tryckvariabeln och dess effekter är S; viket med vägsökning och animering är M; övergivna pjäser S.

**Risker.** Automatiskt vik kan kännas som att spelet tar över (Close Combats största klagomål: "soldater som inte gör som du sa"). Därför: autovik bara över 80, med 3 s varning ("HV 2 wavering") och tydlig flagga. Trycket får inte stiga av eld på långt håll; bara närhet och förluster. Balansen flyttar sig överallt där grupper står nära gatan; policyerna behöver "håll avstånd"-regel.

### 3.4 Trötthet och vila över dagar

**Vad.** Varje kärnenhet har ett vilovärde: Rested, Tired, Exhausted. En dag ute gör Rested till Tired; två i rad gör Tired till Exhausted. En dag i reserven ger ett steg tillbaka. Tired: träff 90 %, trycket (3.3) stiger 125 %. Exhausted: träff 80 %, eldhastighet 85 %, trycket 150 %, kan inte få stjärna den dagen. Förlorade försök räknas inte (dagen börjar om med samma styrka, som i dag). Vilan syns på kortet som tre små streck, inte som siffror.

**Varför det är ett val.** Olas egen formulering: "kastar jag in allt dag 1 eller håller jag hälften tillbaka?" Med 12 enheter och frontbredd 8 blir reserven ett rotationsschema, inte en parkeringsplats. En Exhausted Ksp 88 på dag 5 är ett pris man betalade dag 3. XCOM: WotC visade att det räcker med ett mjukt straff för att göra rostern levande; ett hårt (kan inte skickas) skapar bara irritation.

**Passar.** Kärntrupperna har redan uid, vet, men, level i src/meta/operation.js; dayReport vet vem som var ute. Uppställningens kort och förrådets enhetskolumn visar stjärnan, så ett vilostreck får plats. Frontbredden gör rotationen möjlig.

**Kostnad.** S till M. Datan och effekterna S; UI i förråd och uppställning plus en lektion M.

**Risker.** För liten styrka tidigt (E4 har 3 till 4 enheter): trötthet ska komma först när spelaren har fler enheter än frontbredd, det vill säga Vikingavägen dag 3 (frontbreddslektionen). Stapla inte straffen med 3.3 utan mätning.

### 3.5 Eldzoner: korseld och överlappande bågar

**Vad.** En zombie som är i sikte för minst två enheter från riktningar som skiljer sig 60 grader eller mer tar 20 % mer skada ("caught in crossfire"), och trycket på grupper runt en sådan zon stiger hälften så fort (de ser varandra). Zonen ritas på marken när man håller en enhet i handen: rutor som redan ses från en annan båge får en svag varm ton, rutor som skulle få korseld lyser. Taggtråd i en korseldszon håller 50 % längre (horden kommer inte åt att slita i den).

**Varför det är ett val.** Spelaren får ett skäl att sprida enheterna i vinkel i stället för att lägga dem i rad vid basen, och att läsa kartan: en korsning är värd mer än en rak gata. Det är They Are Billions chokepoint som belöning i stället för som straff, och det gör 3.1 (hus på båda sidor) till den naturliga eldzonen.

**Passar.** Sikten per ruta finns (sightFrom), bågarna finns (cone, facing). Korseld = per zombie räkna antalet enheter med sikt och vinkelspridning; görs redan en liknande iteration för målval.

**Kostnad.** S för regeln, S för ritningen. Billigast av alla.

**Risker.** Kan bli osynlig matte om ritningen inte är tydlig; då är den bara en skjuten balanssiffra. Måste ha en bildtext första gången ("Crossfire: two arcs, more damage.") och en ikon på zombien som är fångad.

### 3.6 Aktiva förmågor med nedkylning

**Vad.** Tre till fyra order som spelaren ger mitt i vågen, från ledningen eller enheterna, med förvarning och nedkylning. Alla kostar förnödenheter, så överskottet får ett utlopp:

| Order | Vad | Förvarning | Nedkylning | Pris |
|---|---|---|---|---|
| **Grk 81 mm** (granatkastarpluton utanför kartan, från Vikingavägen) | Klicka en ruta: 3 granater landar 6 till 8 s senare i 5 m radie, 120 skada var, river tråd och skadar spärrar och hus | Ett rökmoln på rutan, pipan hörs | 60 s | $250 |
| **Lysraket** (nattlös, så i stället **Rök**: handgranater m/rök) | Rök på 3 rutor i 20 s: horden i röken ser inte grupperna (trycket stiger inte), och grupperna skjuter inte igenom | Ingen | 40 s | $80 |
| **Håll eld** (Hold fire) | Markerade enheter skjuter inte förrän horden är inom 8 m eller ordern släpps. Horden följer då sin plan utan att dras mot gruppen (jägare, skrikare), och första salvan får 2x skada på zombier under 10 m (bakhåll) | Ingen | Ingen, men trycket stiger 150 % medan de håller | 0 |
| **Vik** (Fall back, se 3.3) | Gruppen springer till nästa skydd bakåt | Ingen | 20 s per grupp | 0 |

**Varför det är ett val.** Spelaren har något att göra när det brinner och måste välja var och när: granatkastaren river också den egna tråden. "Håll eld" ger bakhåll och är den enda mekanik som gör att spelaren vill ha horden nära. Kingdom Rush lever på sina två till tre aktiva knappar; utan dem är det ett klickspel före vågen.

**Passar.** Köpraden under dagen ("DEFENCES") har plats för ordrar; förnödenheterna behöver utlopp (speltest 0.17.1: $1 000+ över). Granater finns (launcher, GRENADE_KIT) med flygtid och radie. Ledningens leveranser (depot.js RELEASES) kan släppa Grk-stödet som ett meddelande.

**Kostnad.** M. Håll eld S, Vik ingår i 3.3, Grk M (ljud, krater, modell av nedslag), Rök M (siktregel).

**Risker.** För mycket att klicka bryter "en sak i taget"; högst två ordrar synliga per dag. Granatkastaren får inte bli lösningen på allt: lång förvarning och nedkylning, och den dödar inte bjässar (120 x 3 mot 560 hp).

### 3.7 Vägar som öppnas och stängs, och eld som spärrar

**Vad.** Tre saker som ändrar flödesfältet under dagen utan att spelaren lägger spärrar:
- **Riva ett hus** (Demolish): ett markerat hus kan rivas före dagen (sprängladdning, $300, 20 s) och öppnar en ny gång för horden, eller stängas (plank för fönster och dörr, så att vilande inte kan komma ut). Rivningen är spelarens pushing: man kan öppna en omväg som leder horden genom en eldgata.
- **Brand**: en junk car som skjuts sönder (eller en molotov från de frivilliga, $60) brinner i 40 s; brinnande rutor är stängda för horden (kostnad som en spärr) men skadar inte. Eld sprider sig inte (för förutsägbarhetens skull).
- **Hordens plan B**: när horden slår sönder en spärr öppnar den inte bara luckan; den väljer också, med 30 % per våg från dag 3, att "trycka" genom en tomt vid spärren (en häck eller ett staket faller, en ny 1-ruts gång öppnas för resten av dagen). Förvarnat: "They are breaking through the hedge on Trollvägen." 12 s innan, som i Into the Breach, så spelaren kan möta det.

**Varför det är ett val.** Vägnätet blir levande. Att öppna en väg själv är ett nytt sorts beslut (TAB:s spelare bygger lockbeten; Defense Grid formar labyrinten med tornen). Branden ger de frivilliga en roll pjäserna inte har (H064).

**Passar.** gridRoute.rebuild(obstacles) räknar om flödet redan när hinder ändras; en riven husruta blir walk = 1, en brinnande ruta en tillfällig obstacle. Hordens plan B är en ny obstacle-typ "gap" som läggs av simuleringen, inte spelaren.

**Kostnad.** M för plan B och brand, L för rivning (modeller, markrutor, placering efteråt).

**Risker.** Rivning kan förstöra kartans läsbarhet; begränsa till markerade hus (två per bana). Plan B måste vara deterministiskt per seed för fingeravtrycken. Eld som spärr kan göra spärrar onödiga om den är för billig.

### 3.8 Försörjning under striden

**Vad.** Pjäsernas eldhastighet kräver ammunition: varje pjäs har ett band (Ksp 90 90 s eld, Ksp 88 60 s, Ksp 58 75 s) och laddar om 6 s när det är slut (tyst). En **ammunitionsbärare** (en förnödenhet, $120, från uppställningen) står vid en pjäs och fyller på; en bärare täcker pjäser inom 10 m. Grupperna har ammunition för hela dagen. Pillboxen har egen. Kulsprutor i hus (3.1) kräver bärare i huset.

**Varför det är ett val.** Överskottet får ett bra utlopp och klumpen vid basen får en kostnad: många pjäser nära varandra delar en bärare, men pjäser utspridda i korseld (3.5) behöver var sin. Mindustry och Riftbreaker visar att försörjning är den naturliga "andra fronten" i ett försvarsspel. Taggtråd som slits ut är redan en försörjningsregel; detta är samma tanke på pjäserna.

**Passar.** gunStats har rate; en ammunitionsräknare per pjäs är en variabel. Ammo crate (SUPPLIES.ammo) blir bäraren i stället för en engångsbonus.

**Kostnad.** S till M (siffror S, bärarens modell och ruta M).

**Risker.** Kan kännas som micromanagement; därför ingen manuell omladdning, bara var bäraren står. Risk att den normala spelaren inte märker tystnaden: en tydlig "RELOADING" över pjäsen.

### 3.9 Rekvisitionens stats: kvalitativt, inte siffror

**Vad.** Två alternativ:
- **A, siffror:** DMG/RNG/RATE som i dag plus hp, cone, move-tid och skadeklass på varje kort.
- **B, Close Combat:** fyra fält med tre till fem streck: **Firepower**, **Reach**, **Toughness**, **Mobility**, plus ikoner för skadeklass (5,56 · 7,62 · 12,7 · HE · precision), skjutbåge som en liten sektor, och enhetens egna rader: stjärnor, vila (3.4), man kvar. Siffrorna finns kvar i Field manual för den som vill, aldrig på kortet.

**Rekommendation: B.** Skälen: (1) spelartexten ska läsas på en blick (inlärningsdesignen, 8 till 12 ord), och fem siffror per kort är varken läsbart eller jämförbart över klasser (grupper har fyra siktlinjer, pjäser en). (2) Siffror lovar precision balansen inte kan hålla; varje balanspass ändrar dem och gör Field manual fel. Close Combat visar vapenverkan som grönt/gult/rött och låter spelaren lära sig resten genom att se. (3) Med skadeklasser (3.2) är **vilken** skada viktigare än **hur mycket**, och det är en ikon, inte en siffra. (4) Ola frågade själv om det vaga; det passar fiktionen (en befälhavare vet att Ksp 88 "biter på allt", inte att den gör 22 per skott).

Det som däremot ska vara exakt: antal man, stjärnor, vila, pris, lager ("1 available"), och vad som kommer i morgon (fiendekortet säger "Armoured. Small arms barely bite. Heavy MG or grenades."). Osäkerheten ska ligga i vapnens verkan, aldrig i vad spelaren äger.

**Kostnad.** S (kortlayout) + S (Field manual-tabell).

**Risker.** Strecken måste vara konsekventa mellan klasser; en regel ("Firepower = skada/s mot walkers i tre steg om 30/s") i balansloggen. Ola kan vilja ha siffror på hovring; då hovring, aldrig på kortet.

### 3.10 Målprioritet per enhet

**Vad.** Varje pjäs och grupp har ett mål-läge: **Nearest** (standard i dag: den som kommit längst), **Strongest** (bjässar, pansrade, skrikare först), **Weakest** (löpare och krypare först). Byts i panelen eller med T. Psg 90 standard Strongest.

**Varför det är ett val.** BTD6:s Strong/First/Last är det billigaste mikrovalet som finns, och med 3.2 blir det nödvändigt: en Ksp 88 som slösar 12,7 mm på walkers medan den pansrade går förbi är spelarens fel, inte spelets. Det ger Olas "fler trupptyper som påverkar olika" utan en enda ny modell.

**Passar.** Målvalet är en funktion i sim.js (progress störst); tre lägen är en switch. Panelen har plats.

**Kostnad.** S.

**Risker.** Ännu en knapp före inlärningen hunnit dit; introduceras med den pansrade (Vikingavägen dag 3).

### 3.11 Vilande hus som spelaren väljer att röja

**Vad.** Ett markerat hus med vilande kan **röjas** före vågen av en grupp (Clear house: gruppen går in, 15 s, dödar de vilande, tar 0 till 2 förluster beroende på antal, får sedan huset som garnison gratis) eller **plankas** ($100, de vilande sitter kvar i 2 vågor). Alternativt lämnas det och exploderar i vågen som i dag.

**Varför det är ett val.** Ett riktigt litet taktiskt beslut per vilande hus, med förluster som pris. Knyter 3.1 till befintligt innehåll.

**Kostnad.** S till M (gruppen in i hus = 3.1:s rörelse).

**Risker.** Bara om 3.1 byggs.

### 3.12 Lockbete och ljud

**Vad.** Horden styrs 10 % av ljud: en pjäs som skjuter höjer kostnaden för rutor i ett band framför sig... Nej, hellre tvärtom och enklare: ett **lockbete** (billarm, siren från en bil, $90, 30 s) gör att zombier inom 20 m som inte ser en soldat går dit först. Det är TAB:s Wasp-piketter.

**Varför.** Ett sätt att köpa tid och dela en våg i två. Men det överlappar 3.6 och 3.7, och ljudstyrning av flödet gör vägarna mindre läsbara, vilket är spelets stolthet. Lägst rang; tas bara om 3.7 inte räcker.

**Kostnad.** S. **Risk.** Förutsägbarheten.

### Rangen i korthet

| # | Mekanik | Känsla | Kostnad | Risk |
|---|---|---|---|---|
| 1 | 3.2 Fiender med egenskaper och skadeklasser | Stor | M | Låg |
| 2 | 3.3 Tryck, vik och överrända pjäser | Stor | M | Medel |
| 3 | 3.1 Trupper i hus, eldgator | Stor | M | Medel |
| 4 | 3.6 Aktiva ordrar (Håll eld, Grk, Rök) | Stor | M | Medel |
| 5 | 3.5 Korseld | Medel | S | Låg |
| 6 | 3.10 Målprioritet | Medel | S | Låg |
| 7 | 3.4 Trötthet och vila | Medel | S till M | Låg |
| 8 | 3.9 Kvalitativa stats i rekvisitionen | Liten men billig | S | Låg |
| 9 | 3.7 Vägar som ändras, brand, hordens plan B | Medel | M till L | Hög |
| 10 | 3.8 Ammunitionsförsörjning | Medel | S till M | Medel |
| 11 | 3.11 Röja vilande hus | Liten | S | Låg (kräver 3.1) |
| 12 | 3.12 Lockbete | Liten | S | Hög (läsbarhet) |

---

## 4. Rekommenderad första skiva

Fyra mekaniker som tillsammans byter spelets fråga från "har jag nog?" till "har jag rätt sak på rätt plats, och håller den?":

1. **Skadeklasser och två nya fiender** (3.2): Pansrad och Krypare först. De två räcker för att göra Ksp 88, granater, grupper och tak till olika verktyg.
2. **Tryck och Vik** (3.3), utan övergivna pjäser i första steget. Grupperna blir människor.
3. **Trupper i hus** (3.1) för grupper, inte kulsprutor i första steget. Eldgatan och den sårbara positionen.
4. **Korseld** (3.5) + **Håll eld** (3.6): billiga och gör 1 till 3 läsbara. Håll eld ger den första riktiga ordern mitt i vågen.

Målprioritet (3.10) följer med fiende 1 som en knapp, och den kvalitativa rekvisitionen (3.9) görs samtidigt som skadeklassikonerna, eftersom korten ändå ritas om. Trötthet (3.4) i skiva två när styrkan är större än frontbredden.

### Så spelas Mölnbo dag 2 ("Stenbyvägen") efter skivan

I dag: spelaren ställer alla 10 vid korsningen framför Folkets hus, klickar Start, väntar. Vinner på andra försöket med $1 400 över (speltest 0.17.1).

Efter skivan: Intro: **"Armoured ones on Stenbyvägen. Small arms barely bite."** Spelaren ser två vägar in (Gnestavägen, Stenbyvägen). Hon sätter infanterigruppen i villan på Stenbyvägens östra sida och Hemvärnet i huset mitt emot: en eldgata på 35 m där Kvarnen-horden går under korseld från två fönsterrader. Ksp 88 vid Missionshuset vänd längs gatan, Strongest-läge för de pansrade. Ksp 90 och frivilliga vid caféet mot Gnestavägen. Hon ger de frivilliga Håll eld så att Gnestavägens walkers går förbi hörnet och får bakhållets dubbla salva vid 10 m.

Våg 2: tre pansrade kommer upp Stenbyvägen med walkers runt. Ksp 90-eld gör nästan ingenting på dem (ikonen "armoured" blinkar grått på träffarna), Ksp 88 tar dem i korseld med husen, men den fjärde går förbi Missionshuset. Trycket på Hemvärnet i huset stiger (walkers slår på dörren). Spelaren väljer: Vik Hemvärnet ut bakvägen till staketet vid Folkets hus (förlorar eldgatans ena sida), eller håll och lita på att infanteriet tvärs över gatan skjuter loss dem. Hon håller; infanteriet i korseld halverar trycket, dörren håller. Den pansrade når grusplanen framför Folkets hus och tas där av Ksp 88 som fått svänga 60 grader.

Våg 3: Kryparna under tråden på Gnestavägen. De frivilliga på caféets veranda ser dem (grupper ser lågt), Ksp 90 ser dem inte bakom bilarna förrän 6 m. Spelaren flyttar Psg 90 från norra tornet till stationstaket mitt i vågen (hon hade vänt den fel dag 1, som i dag). Dagen vinns med bas 14, $300 över (Håll eld kostar inget, men hon köpte ammunition och sandsäckar till huset). Hon förlorade två man i Hemvärnet och fick välja att fylla på eller rekvirera en Ksp 58 till huset i morgon.

Skillnaden: fyra beslut under vågen (hålla eller vika, flytta Psg, var eldgatan ligger, vem som håller eld) och två mellan dagarna (fylla på eller köpa, vem i hus), i stället för noll.

### Hagstumosse dag 4 ("Vilande hus, Ksp 58") efter skivan

Kryparna introduceras här: de vilande husen släpper ut krypare som går under tråden på Sigtunavägen. Lektionen är en: **"Crawlers. Wire does nothing. Squads see them; guns don't."** Spelaren som lagt all tråd och två Ksp 90 vid rondellen ser kryparna gå rakt igenom; hon flyttar Hemvärnet fram till häcken vid korsningen (Move finns sedan E4 dag 2) och sätter Ksp 58 i Strongest-läge mot bjässarna. Trycket på Hemvärnet syns första gången här (en gul flagga), med captionen **"Pressure. Too close for too long and they fall back."**

---

## 5. Inlärningen, balansen och fingeravtrycken

### 5.1 Ett begrepp per dag

Varje mekanik ovan är ett begrepp i STAGES (src/meta/unlocks.js) och en eller två rader i LESSONS (src/data/lessons.js). Förslag till placering, med hänsyn till det som redan ligger på dagarna (0.16.4-tabellen):

| Dag | Finns redan | Nytt begrepp ur skiva 1 | Lektion (högst 12 ord) |
|---|---|---|---|
| E4 dag 1 till 3 | ställa ut, tråd, Move, sikta | ingenting nytt (E4 är övningen) | |
| Ishallen dag 1 | evakuering | | |
| Ishallen dag 2 | spärrar, hordens väg | | |
| Ishallen dag 3 | Hemvärnet, Norra vägen | **Tryck** (bara mätaren, inget vik än) | caption: "Pressure. Keep them off your squads." |
| Ishallen dag 4 | vilande hus, Ksp 58 | **Krypare** (fiendekort) + Strongest/Weakest (T) | "Crawlers. Wire does nothing. Squads see them." |
| Ishallen dag 5 | Next wave, Ksp 88, Ak 5 | **Korseld** (ritas med enhet i handen) | caption: "Crossfire: two arcs, more damage." |
| Vikingavägen dag 1 | förnödenheter på enheten, Psg 90 | **Vik** (B) | step: "A squad can fall back. Select it, press B." |
| Vikingavägen dag 2 | pingar, skrotbilar | | |
| Vikingavägen dag 3 | frontbredd och reserv | **Pansrad** (fiendekort) | "Armoured. Small arms barely bite. Heavy MG, grenades." |
| Vikingavägen dag 4 | | **Trupper i hus** | step: "Click a house by the street. The squad takes the windows." |
| Vikingavägen dag 5 | provet | | |
| Mölnbo dag 1 | höjd (torn) | **Håll eld** | step: "Hold fire. They walk into the ambush." |
| Mölnbo dag 2 | tåget som skydd | **Skrikare** | fiendekort |
| Mölnbo dag 3 | tågklockan | **Trötthet** (skiva 2; visas i förrådet före dagen) | depot: "Rested units fight better. Rotate them." |
| Mölnbo dag 4 | bron | **Jägare** | fiendekort |
| Mölnbo dag 5 | | **Grk 81 mm** (ledningens leverans) | step: "Mortar support. Click where it should land." |

Ishallen dag 3 får två saker (Hemvärnet + tryckmätaren), men mätaren är en tyst upplåsning (caption, 6 ord) och hör ihop med Hemvärnet, så den bryter inte regeln. Vikingavägen dag 4 saknar begrepp i dag och får hus. Dag 5 på Ishallen har redan tre saker; korseld är en caption utan handling och kan flyttas till Vikingavägen dag 2 om det blir tungt.

Regeln "det som inte är upplåst finns inte" gäller: inga pansrade före Ksp 88 funnits två dagar, inget Vik före trycket funnits två dagar, inga hus före Move och Hemvärnet suttit länge.

### 5.2 Balansen och fingeravtrycken

- **Varje mekanik är en flagga i `allow`** (sim.allow, som 'wire', 'move' i dag), så att balansskriptets policyer spelar samma spel som spelaren på varje dag. Fiendetyperna styrs av vågdatan per dag, inte av allow.
- **Fingeravtrycken flyttar sig överallt** från första dagen som får något nytt. Det är avsiktligt och ska loggas som i 0.16.x: ett balanspass per skiva med skäl i docs/balance-log.md, kvitton per kampanjsteg i balance-op-skilled och -normal, och "simuleringens kvitto" (sim-receipt.test.js) för fasta scenarion som inte går genom ekonomin. Mekanikproven (hemvarn, squad-arc, move, stuck) ska vara orörda tills mekaniken själv ändras.
- **Policyerna behöver nya regler**, annars mäter skriptet fel spel: hålla grupper 10 m från gatan när trycket finns, välja Ksp 88 när pansrade är annonserade, sätta grupper i hus på gator horden faktiskt går, Håll eld på en grupp vid ett hörn. Den naive policyn gör inget av detta och ska förlora de dagar där mekaniken är nyckeln (som "dag 3 förloras helt utan forskning" i 0.1.6). Målen står kvar: normal 1 till 4 försök, skicklig 1, ingen dag över 6.
- **Determinism.** Tryck, vik, korseld, hordens plan B och skrikarens skrik räknas ur sim.rng eller ur fasta id, aldrig ur klockan. Fingeravtrycken kräver det.
- **Mät innan tre lager staplas.** Tryck (3.3) och trötthet (3.4) och skadeklasser (3.2) sänker alla spelarens effekt; inför ett åt gången i skriptet och mät hp-faktorerna. Balansloggens regel "flytta tryck från hp till sammansättning" (H065) blir äntligen möjlig: dagar kan bli svårare med en pansrad i stället för hp 12.
- **Speltest före "spelbart".** Varje skiva går genom human-ux-tester (ja/nej) och sedan Ola, enligt regeln från RPI. Särskilt viket: känns det som att spelet tar över?

---

## 6. Öppna frågor till Ola

1. **Skiva 1 som föreslagen** (skadeklasser + två fiender, tryck och vik, grupper i hus, korseld + håll eld)? Eller vill du ha trötthet (3.4) redan i första skivan eftersom det var din egen idé?
2. **Kulsprutor i hus:** bara grupper i första steget, eller Ksp 90 och Ksp 58 också? (Min rekommendation: grupper först; kulsprutor när vi sett att husen fungerar.)
3. **Autovik över 80 tryck**, eller bara manuellt vik (gruppen står tills den dör, som i dag, men skjuter sämre)? Close Combat-känslan säger auto; kontrollen säger manuellt.
4. **Pjäser som kan bli överrända** (laget slås ner, pjäsen står tyst och kan tas tillbaka): vill du ha det i skiva 1 eller 2? Det ändrar E4 dag 1:s känsla också, om walkers kan nå Ksp 90.
5. **Stats i rekvisitionen:** B (streck och ikoner, siffror bara i Field manual) som jag rekommenderar, eller siffror på hovring?
6. **Immunitet eller motstånd:** pansrad tar 20 % av småkaliber (mitt förslag) eller 0 %? BTD6:s lead är 0 %, och det är läsbart men hårt.
7. **Fiendernas ordning:** krypare (Ishallen dag 4), pansrad (Vikingavägen dag 3), skrikare (Mölnbo dag 2), jägare (Mölnbo dag 4), uppsvälld (Vikingavägen dag 5). Byt gärna; det enda villkoret är att nyckeln funnits två dagar.
8. **Granatkastaren** är den första förmågan "utanför kartan" och bryter lite mot "det du ser är det du har". Vill du ha den, eller hellre bara ordrar till egna enheter (Håll eld, Vik, Rök)?
9. **Rivning av hus och brand** (3.7) är dyrast och mest riskabel för kartans läsbarhet. Parkera till efter skiva 2?
10. **Trötthet:** ska ett förlorat försök räknas som en dag ute (hårdare, mer Close Combat) eller inte (mitt förslag: inte, som dagens regel att förluster inte följer med)?
