# Horde: mellansnacket och ledningsplatsen (design, utkast)

Version 0.1 · 2026-10-18 · status: UTKAST (Fable), väntar på Olas beslut (avsnitt 9). Bara design, ingen kod.

Underlag: kampanjplanen (2026-10-18, med Olas beslut i avsnitt 9: blandad ordning, Västerkärv anonymt, kravet på mellansnack), strategiskt djup (2026-10-18), operationen (2026-10-16), inlärningen (2026-10-16), berättelsen (2026-10-16), stilbibeln, samt dagens skyltar i src/ui/operation.js (opMapSheet, depotSheet) och src/ui/panels.js (dayIntro, dayResultPanel), skärmbilderna docs/0.14.0-opmap.jpg, -depot.jpg, -intro.jpg, och porträttrenderaren src/render/portrait.js.

Olas krav som designen svarar på (2026-10-18): "I den nya helheten behöver vi mellansnack som är intressant, relevant och snyggt presenterat, så att man förstår vad som händer. Tänk ett komplett spel, inte kartor med en ruta på. Kanske egna miljöer så att det hänger ihop? Hur gör andra spel?" Senare samma dag: brandstationen i Gnesta (eller kommunhuset Elektron intill) som ledningsplats; Räddningstjänsten som återkommande röst; Gnesta centrum som slutstrid med flera försvarspunkter (brandstationen, Elektron, Frejaskolan). Inga riktiga personer vid namn.

Kort svar: **brandstationen i Gnesta som ledningsplats, i spelets egen 3D-stil, en enda scen, där kartbordet i vagnhallen, radiorummet, turlistetavlan och materialförrådet är sakerna i rummet.** Mellan dagarna är man där. Allt som i dag är plåtar över en nedtonad karta blir föremål på bordet och på väggen. Fem återkommande människor pratar i korta repliker, aldrig i stycken. Hela mellanspelet tar 60 till 90 sekunder om man inte dröjer i förrådet, och går att hoppa över. Och dag 16 till 17 står ledningsplatsen själv på stridskartan.

---

## 1. Forskningen: hur andra spel gör

### Spel för spel

| Spel | Vad skärmen ÄR | Hur mycket text | Vad som gör det levande | Stjäl | Undvik |
|---|---|---|---|---|---|
| **XCOM: EU / XCOM 2** | Basen i genomskärning ("myrstacken"), i XCOM 2 skeppet Avenger som flyger över Geoscape-globen. Bradford pratar i radion över landningsfilmen; Shen och Tygan levererar forskning som en talande bild plus ett kort. | Talade repliker på en till tre meningar. Forskningstexten ett kort stycke som går att hoppa över. | Små människor som går omkring. Fienden har egna projekt med synlig klocka (Avatar-stapeln, Dark Events): DeAngelis: "The geoscape is just way more alive and dynamic". | Motståndarens klocka på kartan. Trycket läses av skärmen, inte av text. | Solomon om 2012-basen: snygg men "functionally, I think there's something to be desired". En bas som bara är dekor bleknar. |
| **Frostpunk** | Staden själv är navet. Lagboken är en bok med sidor. Händelser som porträtt plus stycke med två till tre val och en klocka. Hopp och missnöje som två staplar. | Händelser cirka 50 till 120 ord (osäkert), lagsidor en rad effekt, en rad följd. | Lagar i kedjor där den första är mild och nästa hårdare; oåterkalleliga, med nedkylning. Ultimatum vid trösklar. | Boken som teknikträd: varje sida är en ståndpunkt med ett pris. | Ansiktslösa medborgare gör dilemman abstrakta (RPS). Samma skriptade slag varje gång. |
| **This War of Mine** | Skyddsrummet i genomskärning, kolteckning ("a mature comic book"). Radion är en sak i rummet. Morgonkortet säger vem som kom hem och vem som skadades. | Mycket lite: sinnesstämning som ett till tre ord, dagboksrader en till två meningar, radion en mening. | Hållning och tomgångsanimation bär tillståndet: teamet förbjöds göra folk "confident, clean, happy or rested". Dygnet, hungern, knackningar på dörren. | Morgonen-efter-kortet som rapporterar följderna av natten. | Oavbruten misär får spelare att sluta (recensioner). |
| **Darkest Dungeon** | Byn som en målad gata, husen är menyer. Förfadern (Wayne June) berättar allt: nav, strid, byte, byhändelser (ett kort med målning plus ny replik). | En mening per replik, många repliker, några längre brev. Afflictions-repliker på en rad som också stressar kamraterna: smak och mekanik är samma sak. | Sigman (GDC): inspirationen var "not games, really. It was more human experience"; systemet tar "agency away from players". Hjältar som vägrar order blir berättelsen. | En röst, en mening, utlöst av spelets tillstånd. | En berättare som kommenterar hela tiden blir brus; DD håller raderna sällsynta och korta. |
| **Into the Breach** | Platt ö-karta med tre till fyra uppdragsrutor. Före uppdraget ett litet kort: mål, fiendetyper, en rad från en pilot. Inga filmer. | Kotaku: dialogen är "scant". Pilotrepliker på en mening. | Avellone: ingen kanon, bara "possibilities and interpretations". Piloter pratar vid start, skada, död. Byggnader har folk i sig. | Repliken utlöst av brädets tillstånd är hela berättelsebudgeten, och det räcker. | Så lite text att fraktionerna blir utbytbara. |
| **The Banner Saga** | Sidoscrollad målad resa: karavanen går åt höger, en räknare visar dagar, mat, klanfolk, krigare, moral. Händelser som textpanel med två till fyra val. Stora porträtt, ingen röst. | Händelser ett till två stycken. Tre personer skrev "an ungodly amount". | Thomas: "It's King of Dragon Pass on the road"; besluten är "guidance rather than final orders"; folk dör permanent. Killscreen: porträttens "narrow eyes and curling beards speak louder than the script". | En synlig räknare som sakta ändras, så att själva resan är ett argument. | Val vars utfall känns godtyckliga. |
| **Valkyria Chronicles** | Allt är en bok, "On the Gallian Front": kapitel som uppslag, avsnitt som inramade bilder, bokmärkesflikar till HQ, skirmishes och ordlista. Briefingen är en karta med mål som officerare läser. | Tungt: 18 kapitel, 8 till 10 avsnitt var, mest röstsatta filmer. Själva orderpunkterna korta. | CANVAS-motorn: "a watercolor painting in motion". Bokramen gör att historien känns ihågkommen, inte pågående. | Boken som innehållsförteckning, med ordlistan och HQ som flikar. | Recension: "why the hell can't I just string all these scenes together": ramen avbryter flödet. |
| **Kingdom Rush** | Pergamentkarta med slingrande väg, varje bana en flagga. Kort textintro per bana som order till "the nameless General". Encyklopedi för torn och fiender. | Intron två till fyra meningar; encyklopedin ett stycke med ett skämt. | Humor, flaggor och rök på kartan, upplåsta hjältar står på den. | Encyklopedin som belöning (upplåsta uppslag) som också är regelboken. | En världskarta där det enda man gör är att välja nästa nod. |
| **Close Combat 3/4, Company of Heroes** | CC: strategisk karta med sektorer, sedan briefing med historisk karta, periodfoton och en textorder. CoH: filmer plus röstsatta briefingar "from a variety of voices", sedan kartan med målmarkörer. | CC ett stycke (läge, uppdrag, avsikt). CoH 30 till 60 s röst plus en kort mållista. | Foton, datum, riktiga kartor ger dokumentärkänsla. Brothers in Arms: en titelskylt, lågmäld berättarröst i jag-form, spaningsfoton som belöning. | Dokument som ram (foto, karta, datumstämpel): billigt och trovärdigt. | En briefing ingen läser för att kartan redan visar vart man ska. |
| **FTL** | Stjärnkarta med fyrar; varje hopp öppnar en ren textruta över skeppet med två till fyra val. Blå alternativ bara om man har rätt utrustning. | Två till fem meningar, val på en rad. | Rebellflottans röda våg rycker fram varje hopp. Blå val belönar tidigare investeringar synligt. | Det blå alternativet. | Text som upprepas blir överhoppad; kräver många varianter. |
| **Phoenix Point** | 3D-Geoscape med havens, fiendens strukturer och vandrande Behemoths. Lore som kodex, basen som rutnät av rum. | Tungt: tutorialen "boxing you in with incomprehensible detail" (PCGamesN). | Gollop: fraktionerna kör sina egna ekonomier, "trying to develop these havens, fortify them, protect them". | Fraktioner som gör saker vare sig du tittar eller inte. | Kampanjen blir "flabby and lacking in focus" utan "a more assertive creator's hand". |
| **Wartales, Battle Brothers** | Världskarta ovanifrån, händelsekort med målning och kort text, rostern som porträttlista. Wartales har ett läger man bygger (eld, gryta, tält) och sätter folk i. | Händelser ett stycke med två till tre val. BB:s gratis-DLC: "more than 50 new events". Enradsprat mellan bröderna. | Legosoldater som lämnar om de inte får mat och lön; BB:s ambitioner och bakgrunder. | Lägret som diegetisk roster: att tilldela är att placera. | Regioner som är "literally identical" och platser som bara är "a couple of conversation interactions". |
| **Papers, Please, Not Tonight** | Hela skärmen är båset: kön överst, skrivbordet med dokument, stämplar och regelbok. Natten är en gles familjeskärm. Not Tonight: klubbdörren och en sprucken mobil som nav. | Pope: "I worked hard to reduce the amount of dialog, keep things ambiguous". Familjen: "just a few dots with some text". | Jobbet är berättelsen: regeländringar, kön, tidningsrubriken, pengar mot värme och medicin. | En kanal i taget: Pope lade aldrig nya regler på dagar då någon pratar med dig, för "the bulletin is basically ignored when you've got someone to talk to". | Not Tonight blev "prettier yet clunkier": en diegetisk yta som slåss med handkontrollen. |
| **Liberation-briefingar** (DCS Liberation, WW2-konventionen) | Teaterkarta med kontrollpunkter; varje tur planeras paket, en genererad textbriefing och kneeboard skrivs ur spelets tillstånd; debriefen uppdaterar kriget. Klassikerna (Commandos, Steel Division): karta med pilar, datum och klockslag, ett periodfoto, en nykter röst. | Datadriven: enheter, mål, tider, hot. | Förluster följer med turen; kartan minns. | Genererade briefingar bevisar att trovärdig text går att göra ur tillståndet (namn, tider, antal). | Genererade briefingar är platta om inte en mall lägger till en mänsklig rad. |

### Mönstren som gäller Horde

1. **Navet är en plats, inte en meny.** En gata, ett skepp, ett skrivbord, en bok. Att klicka på en sak i världen ersätter ett menyträd (Hamlet, Avenger, Wartales läger, Valkyrias flikar).
2. **En mening slår ett stycke.** De starkaste leveranserna i hela listan (Into the Breach, Darkest Dungeon, Papers, Please) är enstaka rader utlösta av spelets tillstånd.
3. **En kanal i taget.** Popes regel; Bradford pratar bara över landningen; Breach-piloter bara på bestämda triggers.
4. **Motståndarens klocka syns på navet.** Avatar-stapeln, rebellvågen, mörkret i Banner Saga, hopp/missnöje. Trycket läses av skärmen, inte berättas.
5. **Morgonkortet.** Navet rapporterar vad ditt senaste val gjorde (This War of Mine, Frostpunks ultimatum, Banner Sagas räknare).
6. **Små människor som rör sig = liv.** Personalen i myrstacken, karavanen, byborna. Solomons varning: dekor utan funktion bleknar.
7. **Blå alternativ.** Val som låses upp av tidigare investeringar får metalagret att minnas dig.
8. **Dokument som ram.** Foton, kartor, datumstämplar, bulletiner, böcker: billigt, trovärdigt, hoppbart.
9. **Oåterkalleliga sidor väger mer än reglage** (Frostpunks lagar, Banner Sagas dödsfall).
10. **Ansiktslösa siffror gör inte ont; porträtt och namn gör det.**
11. **Funktion först, diegetik sedan.** Behåll en icke-diegetisk genväg där tempo spelar roll (Game Developer om Dead Space).
12. **Upprepad text dödar omspelning.** Variera, eller håll texten så sällsynt att upprepningen tål sig.

### Källor

- XCOM EU-postmortem (Solomon om basen): https://www.gamebanshee.com/dwk
- XCOM 2:s strategilager (DeAngelis): https://pcgamesn.com/xcom-2/xcom-2-declassified-firaxis-on-the-risky-shot-theyre-taking-with-a-new-strategy-layer
- XCOM 2 Avenger: https://gameinformer.com/games/xcom_2/b/pc/archive/2015/08/07/xcom-2-flips-the-series-strategy-choices-on-their-heads
- Frostpunk: https://en.wikipedia.org/wiki/Frostpunk ; lagar och nedkylning: https://twinfinite.net/pc/frostpunk-review och https://pcgamer.com/frostpunk-review ; utvecklarintervju (bakom betalvägg, bara ingressen kontrollerad): https://www.pcgamer.com/au/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws
- This War of Mine, konst och karaktärer (SIGGRAPH): https://www.siggraph.org/?p=1771 ; presentation: https://dailydot.com/this-war-of-mine-review
- Darkest Dungeon, berättaren (Bourassa): https://80.lv/articles/darkest-dungeon-creator-won-t-replace-late-narrator-with-ai-despite-his-permission/ ; byhändelser: https://www.siliconera.com/not-even-hamlet-safe-everything-burns-update-darkest-dungeon/ ; Sigman på GDC: https://www.pcgamer.com/uk/how-darkest-dungeon-got-inspiration-from-band-of-brothers-and-aliens
- Into the Breach, berättelse via karaktärer (Avellone): https://kotaku.com/into-the-breach-tells-its-story-through-its-characters-1824159682 ; ön och speltid (Davis, Ma): https://www.gamedeveloper.com/business/how-subset-games-made-the-jump-from-i-ftl-i-to-i-into-the-breach-i-
- Banner Saga, resan (Thomas): https://gameinformer.com/games/the_banner_saga/b/pc/archive/2013/12/30/chatting-the-banner-saga-design-with-ex-bioware-developer ; King of Dragon Pass-jämförelsen: https://gamebanshee.com/9r3k ; porträtten: https://www.killscreen.com/art-trumps-design-banner-saga/
- Valkyria Chronicles, boken: https://www.engadget.com/2008-11-17-ps3-fanboy-review-valkyria-chronicles.html och https://giantbomb.com/user-reviews/id/5490/valkyria-chronicles-review ; CANVAS: https://www.gamingnexus.com/News/7755/Valkyria-Chronicles-uses-SEGAs-proprietary-Canvas-engine
- Kingdom Rush: https://kingdomrushtd.fandom.com/wiki/Kingdom_Rush och https://www.mobygames.com/game/54588
- Close Combat, kampanjstruktur: https://en.wikipedia.org/wiki/Close_Combat:_A_Bridge_Too_Far ; Company of Heroes briefingar: https://gamespot.com/reviews/company-of-heroes-review/1900-6157430/ ; Brothers in Arms: https://www.gamespot.com/reviews/brothers-in-arms-road-to-hill-30-review/1900-6119853/
- FTL-postmortem: https://gamedeveloper.com/design/designing-without-a-pitch---an-em-ftl-em-postmortem ; händelserna: https://www.pcgamer.com/uk/ftl-faster-than-light-review
- Phoenix Point (Gollop): https://www.bit-tech.net/features/interview-julian-gollop-talks-phoenix-point-xcom-and-dynamic-systems/1 ; recension: https://pcgamesn.com/phoenix-point/review
- Wartales mot Battle Brothers: https://scientificgamer.com/thoughts-wartales/ ; Battle Brothers händelser: https://gamedeveloper.com/press-release/battle-brothers-free-dlc-of-flesh-and-faith-out-now
- Papers, Please (Pope): https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i- ; Not Tonight: https://www.cgmagonline.com/reviews/not_tonight_take_back_control_edition
- DCS Liberation: https://flyawaysimulation.com/ask/answers/dcs-briefing-room-vs-liberation/
- Diegetiskt gränssnitt (Game Developer): https://www.gamedeveloper.com/design/game-ui-discoveries-what-players-want ; https://indieklem.substack.com/p/19-the-diegetic-dilemma-benefits ; navområden: https://www.theseus.fi/handle/10024/798594 ; https://giantbomb.com/users/3378/articles/when-do-hubs-work

**Osäkerheter.** XCOM-rådgivarnas exakta struktur, This War of Mines radio och dagbok i detalj, Kingdom Rush-seriens serierutor (senare delar), Close Combats röstbriefing, Phoenix Points kodexformat, FTL:s ordantal och DCS Liberations briefingformat bygger på recensioner och min egen kännedom, inte på utvecklarkällor.

---

## 2. Kärnan: ledningsplatsen

### Vad som är fel i dag

Dagens mellanspel är tre plåtar i följd (resultat, operationskarta, förråd) över en nedtonad stridskarta, med ledningens meddelanden som en inkorg i ett hörn. Det fungerar som gränssnitt men saknar plats, människor och tid. Inget rör sig mellan dagarna, ingen säger något, och kartan är en bild man klickar på. Det är precis Kingdom Rush-fällan (en karta där det enda man gör är att välja nästa nod) och Solomons varning (ett metalager som inte är ett ställe).

### Förslaget: Brandstationen

**En enda 3D-scen i spelets egen stil: brandstationen i Gnesta, med vagnhallen som ledningsplats.** Kameran står snett ovanifrån som i spelet (samma ortografiska rigg, samma sol, samma dis), men närmare: vagnhallen är ett rum på ungefär 18 x 12 m med två till tre portar mot gatan, betonggolv med avrinning, slangar på vinda, en släckbil och en tankbil som fått backa ut på planen för att ge plats. Intill vagnhallen, synligt genom en glasvägg, ligger **radiorummet** (ledningscentralen med radioutrustning, skärmar som är släckta, en karta på väggen) och **omklädningen** med turlistetavlan. Stationen är generisk (stilbibelns regel): en svensk brandstation i rätt storlek, röda portar, en slangtorkningstorn, inga skyltar med ortnamn, inga detaljer från den riktiga byggnaden, inga riktiga personer.

Varje sak i rummet är en skylt i dag:

| Sak i rummet | Vad den är i dag | Vad den blir |
|---|---|---|
| **Kartbordet** (ett bord mitt i vagnhallen där släckbilen stod, en karta tejpad över det, en arbetslampa på stativ) | opMapSheet, canvasen med Södermanland | Lägeskartan i stor skala (avsnitt 4, steg 3): pilar, nålar, blyertsanteckningar. Skådeplatserna är nålar; den som är nästa har en röd tråd till en **skiss** av platsen (5.3). Briefingen spelas här. |
| **Radiorummet** (radioutrustning i ett rack, hörlurar, ett anteckningsblock, en bordslampa; glasvägg mot hallen) | Inkorgen "Command" och resultatets radioruta | Rapporterna från ledningen och nyhetsremsan från Sverige. Ledningens rader kommer på blocket, nyheterna som en lysande textrad i radions fönster. Blåljusnätet nämns bara som "the radio"; inga riktiga rutiner påstås. |
| **Turlistetavlan** (whiteboard i omklädningen, magneter med namn, som brandmännens egen turlista) | depotSheet:s enhetskolumn (stjärnor, man kvar, vila) | Rostern: en magnet per enhet, handskriven kolumn för vila (tre streck), stjärnor som tejpbitar. Trötthet och Sanity bor här. Att skriva sin styrka på en turlista är vad en brandstation gör varje dag. |
| **Materialförrådet** (slanghallen: hyllor, lådor med stencilerad text, pallar som kommit in genom porten, en A-traktor) | depotSheet:s rekvisition och uppgraderingar, senare utvecklingskolumnen | Rekvisitionen som kort som ligger på en pall; utvecklingen som en pärm på en hylla. |
| **Portarna** (de stora portarna mot gatan, en på glänt) | inget | Dag eller natt, rök över stan, lysraketer natt 17, tystnad dag 20. Släckbilen på planen utanför: hel i akt 1, sotig i akt 2, borta (ute) natt 17. Stationen berättar vilket läge kommunen är i utan ord. |
| **Människorna** | FROM_NAME: "Försvarsmakten", "Myndigheten för civilt försvar" | Fem återkommande personer som lågpolyfigurer vid sina platser (avsnitt 3). Repliker som pratbubblor i plåtstil vid figuren. |
| **Porten ut** | Deploy-knappen | "To the line": kameran går mot den öppna porten, klipp till uppställningen. |

Spelaren klickar på saken (eller trycker `1` till `5`) och kameran glider dit: kartbordet fyller skärmen vid kartbordet, tavlan vid tavlan. Plåtarna från i dag ligger kvar som lager ovanpå, men nu på saken: rekvisitionskorten ligger på pallen, inte i ett fönster över en karta. Icke-diegetisk genväg (mönster 11): `Enter` går alltid vidare till nästa steg i flödet (avsnitt 4), `Esc` hoppar till beslutet. Den som vill kan spela hela kampanjen med Enter och Deploy utan att gå runt.

**Stationen öppnar gradvis** (inlärningsprincipen: en ny sak per dag). Dag 1 till 3 (E4) finns inget rum: man är inte befälhavare ännu, radion i pansarbandvagnen (dagens resultatplåt) räcker. Efter dag 3, "You take command", öppnas vagnhallen med bara kartbordet och radiorummet tända; resten står i mörker (lampor släckta, föremål som silhuetter). Därefter:

| Efter dag | Tänds | Varför just då |
|---|---|---|
| 3 | Vagnhallen: kartbordet, radiorummet, porten. Två personer (MCF och Räddningstjänstens styrkeledare, utan namn). | Operationskartan öppnar efter E4 (inlärningsschemat) |
| 5 | Materialförrådet (lampan tänds, pallarna kommer in) | Förrådet öppnar efter Ishallen dag 2 i schemat (South dag 2 = kampanjdag 5) |
| 6 | Turlistetavlan, och Hemvärnets kompanichef kommer in | Hemvärnet anländer dag 6; rostern får mening när det finns fler än en sorts folk |
| 9 | Vila-kolumnen på tavlan | Trötthet visas i förrådet mellan dag 9 och 10 |
| 11 | Den stora lägeskartan rullas ut över kartbordet (Södermanland med Sverige i hörnet), spaningen öppnar, läkaren kommer in | Första ledtråden om varifrån de kommer (Björnlunda natt) |
| 13 | Pärmen på hyllan: utveckling | Utvecklingsrutan öppnar dag 13 |
| 15 | Stationen förbereds: portarna stängs, släckbilarna står tvärs över gatan utanför, madrasser på golvet i slanghallen (civila kommer in) | Dag 16 står stationen på stridskartan |
| 17 | Fallskärmsjägarnas stabsofficer kommer in i rummet (var förut bara en röst i radion) | Akt 2:s vändpunkt |
| 20 | Portarna öppnas, se avsnitt 6 | |

### Alternativen

| Alternativ | Känsla | Kostnad | Varför, varför inte |
|---|---|---|---|
| **A. Brandstationen** (vagnhallen, radiorummet, omklädningen) | Riktig krisledningskänsla: det är här kommunen faktiskt skulle leda. Vagnhallen är stor nog för fem personer och fyra stationer, radiorummet finns på riktigt, turlistetavlan finns på riktigt. Portarna ger stan. Räddningstjänsten blir en naturlig röst. Och dag 16 till 17 är byggnaden en försvarspunkt på stridskartan: spelaren försvarar rummet hon suttit i (Solomon: spelare brydde sig mer om 1994-basen för att den gick att angripa). | En låda med portar och en glasvägg, åtta till tio rekvisitamodeller ur byggsatsen (släckbil, tankbil, slangvinda, rack, pallar, tavla), inga nya material. Släckbilen återanvänds på stridskartan dag 16 till 17. Ungefär en session för rummet, en för kamerastoppen. Risk: den riktiga stationen är en plats Ola känner; byggnaden måste vara generisk nog att inte föreställa den. | **Rekommenderas.** |
| **B. Elektron, kommunhuset** (foajé eller sammanträdesrum, intill brandstationen) | Civilt och byråkratiskt: det är MCF:s och kommunens krisledning. Fönster mot torget. | Som A, färre fordon. | Ett sammanträdesrum är ett rum med bord och stolar: det saknar vagnhallens volym, slangarna, fordonen, allt som gör att man ser att något pågår. Bättre som **försvarspunkt** i centrum (avsnitt 6) och som platsen Lindkvist kommer ifrån. |
| **C. Gymnastiksalen** (Frejaskolan) | Civilt, improviserat, svenskt. Stort rum, fönster högt upp. | Som A, färre modeller. | Skolan behövs som försvarspunkt dag 16 till 17 (civila i gympasalen, öppna ytor runt). Att ledningen också sitter där gör centrumkartan trångt berättad. |
| **D. Fältstab i tält** (stabstält vid ishallen) | Mest militärt. Billigast. | Minst av alla. | Inga fönster. Känns som vilket krigsspel som helst, och kampanjen är civil i grunden. Kan inte tändas rum för rum. |
| **E. Stabsfordon** (stabsbuss eller pansarbandvagn 302) | Tätt, stämningsfullt. Kan följa med till varje skådeplats. | Liten modell, men trångt: allt får inte plats, människorna står utanför. | Ett rum man inte kan gå runt i blir en meny igen. Passar som **akt 3:s** nav om budgeten räcker (staben går ut i bandvagnen dag 18), inte som kampanjens. |
| **F. Skyddsrum** (källaren under Elektron) | Mest Cthulhu, bäst för natt 17. | Som A. | Inga fönster. Konstant mörker tar bort dygnet. Fel ton för akt 1. |

**Rekommendation: A, brandstationen, med Elektron och Frejaskolan som försvarspunkter i centrum (avsnitt 6) och E som akt 3:s variant om budgeten tillåter** (annars står stationen kvar och portarna berättar att vi går ut). Skälen: stationen är byggd för precis det här (radio, tavla, fordon, folk som jobbar i skift); portarna är det billigaste sättet att visa kommunens läge utan text; rummet tål att tändas en sak i taget; Räddningstjänsten får en plats i spelet som inte är påklistrad; och att ledningsplatsen själv hamnar på stridskartan dag 16 ger slutstriden i centrum något att förlora som spelaren redan känner.

### Ljus och ton i vagnhallen

Samma sol och dis som i spelet, men solen kommer in genom den öppna porten som ett ljust parallellogram på betongen, och det vandrar med dagen (morgon efter nattdagar: lågt ljus från andra hållet). Arbetslampan på stativ är ett varmt punktljus; radiorummets lampa, förrådets lysrör och omklädningens lampa tänds när stationen öppnar. Natt: porten på glänt blågrå, en lysraket i öppningen natt 17, kartbordet enda ljusa ytan. Dag 20: portarna öppna, vit himmel.

---

## 3. Människorna i rummet

Fem personer, varav fyra återkommande i rummet och en som bara är röst till dag 17. Reglerna (ur forskningen): **en replik är en mening**, högst 14 ord; **en kanal i taget** (bara en person pratar per steg); repliker utlöses av spelets tillstånd (förluster, civila, trötthet, vad spelaren valde), inte av dagnumret; **namnen lärs gradvis**: första gången visas bara rollen ("MCF"), namnet dyker upp på tavlan eller i en replik någon dag senare, och först sedan står det i bubblan.

| Person | Roll | Var i rummet | Röst | Därför pratar hen | Så lär man sig namnet |
|---|---|---|---|---|---|
| **Lindkvist** (MCF-samordnare, Länsstyrelsen Södermanland, sitter annars i Elektron tvärs över gatan) | Civila, evakuering, tåg och båtar, Hemvärnets resurser i akt 1. | Vid kartbordet med blocket; går över till Elektron och kommer tillbaka. | Trött, exakt, siffror och klockslag. "Fourteen inside. Six still on the road." | Efter varje evakuering: antal; när ett tåg eller en båt ska gå: tiden; när en skådeplats väntar: "They can't last another night." | Dag 4 "MCF"; dag 5 står "LINDKVIST" skrivet på tavlans hörn; dag 6 säger kompanichefen "Lindkvist says the rink is full." |
| **Berglund** (kompanichef, Hemvärnet, Gnestabo) | Trupperna: trötthet, Sanity, förluster, och vägarna (han känner varje grusväg). | Vid tavlan. | Torr, lokal, kort. "Second squad slept in a hedge. Give them a day." | Efter dagar med förluster; när en enhet är Exhausted; när spelaren skickar trötta ut igen (varning, en rad); i briefingen om vägen: "D830 is a gravel track. They'll come in a line." | Dag 6 "Home Guard"; dag 7 "Capt. Berglund" på tavlan; dag 8 i radion: "Berglund, three columns, over." |
| **Sahlin** (major, stabsofficer, Försvarsmakten, Strängnäs) | Förstärkningar, släpp i förrådet, underrättelser i stor skala, granatkastare, fallskärmsjägare. | Bara röst i radion till dag 17. Därefter står han vid kartbordet (ett uniformerat lågpolyhuvud i rummet är i sig en händelse). | Stel, formell, avslutar alltid. "Mortar platoon released. Use it. Out." | Varje leverans (RELEASES i depot.js blir hans rader), varje order om en fast dag, varje gång underrättelser skärper en pil. | Dag 3 "Försvarsmakten"; dag 8 "Sahlin, Strängnäs" i radions logg; namnet i bubblan från dag 12. |
| **Dr Nyman** (infektionsläkare, Nyköpings lasarett, sedan fältsjukhuset i ishallen) | Betten, de vilande husen, Sanity som medicinsk sak, och till sist massan i gropen. Cthulhu-nypan bor här, aldrig i radion. | Kommer dag 11. Står vid fönstret, inte vid någon station. | Lågmäld, aldrig en förklaring, alltid en iakttagelse. "The bitten don't run a fever. They just stop answering." Senare: "The men who stood nearest the pit still hear it." | Första gången en grupp blir routed; efter nattdagar; när spaningen pekar mot Björnlunda; vid varje steg närmare källan. Högst en replik per dag, ofta ingen. | Dag 11 "Doctor"; dag 14 "Dr Nyman" på en sjukjournal på kartbordet; aldrig förnamn. |
| **Ek** (styrkeledare, Räddningstjänsten Gnesta; det är hans station) | Räddning, bränder, stöd till evakueringen (bilar, stegar, slangar, belysning), stan. Den lokala rösten: han bor här. Brand-mekaniken dag 15 och lysraketerna dag 11 och 17 är hans område. | I radiorummet (det är hans radio) och vid porten. Går ut och in. | Lugn, praktisk, en rad i taget, säger aldrig att något är omöjligt. "Tank truck's at the rink. Water for two days, then it's the lake." | Varje dag i akt 1 och 2 en rad om stan (morgonkortet, avsnitt 4 steg 1); när något brinner på kartan; när civila ska in någonstans (stationen dag 16: "We've got forty on the floor in the hose hall."); dag 20 en rad om vattnet i gropen. | Dag 4 "the fire chief"; dag 5 "EK" på turlistetavlan; dag 6 när Berglund kommer in: "Ek. You've still got coffee." |

**Radio Sörmland** är ingen person: det är remsan i radions fönster (avsnitt 4 steg 2, 5.6). Ingen programledare med namn; rösten är anonym text, så att Sverige känns stort och fjärran.

**Räddningstjänstens radio.** Blåljusnätet finns i rummet som ljud och som rader på blocket, men kallas bara "the radio"; inga anropssignaler, inga procedurer som påstås vara riktiga. Det som hörs är generiskt: en anropston, sprak, en rad text. Eks rader om bilar och vatten är fiktion i rätt ton, inte en skildring av hur Räddningstjänsten arbetar.

**Inga riktiga personer.** Alla fem är påhittade med vanliga efternamn. Ingen av dem får ett utseende, ett namn eller en replik som pekar på någon som jobbar i Gnesta.

**Repliker utlösta av tillstånd, inte av dag.** Varje person har en liten tabell av triggers (losses > 0, exhausted > 0, evacSafe < evacTotal, routedToday, scoutingChosen, pressure på en hoppad skådeplats, nattdag i går) och en rad per trigger med två till tre varianter, så att samma rad sällan upprepas (mönster 12). Fasta dagar har därutöver en skriven rad var. Budget: cirka 120 rader för hela kampanjen, inget stycke längre än en mening. Det är Into the Breach-budgeten, inte Banner Sagas.

**Porträtt.** Personerna ritas som lågpolyfigurer i rummet (humanoid ur kit.js, som soldaterna och Hemvärnet) och som porträtt i bubblan, renderade ur samma modell med tekniken i portrait.js (en gång per session, sparad som bild). Inga bildfiler, inga handritade ansikten: samma regel som för fiendekorten.

---

## 4. Flödet mellan dagarna

Sju steg. Hela flödet 60 till 90 s utan dröjsmål i förrådet. `Enter` nästa steg, `Esc` till beslutet, klick på en sak i rummet går dit direkt. Det man hoppat över ligger kvar på sin plats (radions logg, blocket, tavlan) och går att läsa senare. Textgränserna är inlärningsdesignens (2.2): en replik högst 14 ord, en order högst 20, en nyhetsrad högst 10.

| # | Steg | Var | Vad som syns | Text, högst | Tid |
|---|---|---|---|---|---|
| 1 | **Efterspelet** | Vagnhallen, kameran kommer in genom porten | Dagens resultat som i dag (dayResultPanel: rubriken, siffrorna, förlusterna) men som ett papper på kartbordet; bakom det rummet i rätt ljus (natt efter natt, morgon annars). Sedan **en mänsklig rad** från en person: Lindkvist med antalet civila, Berglund om förlusterna, Ek om stan. En rad, en person. | Resultatet som i dag (5 rader siffror); raden 14 ord | 8 till 12 s |
| 2 | **Radion** | Radiorummet, i bakgrunden under steg 1 och 3 | Radions fönster lyser och tre nyhetsfragment från Sverige glider förbi, ett i taget, med sprak mellan. Lindkvists block får dagens rapport från ledningen (dagens inkorg) som en rad i handskrift. | 3 fragment à 10 ord; ledningens rad 20 ord | 6 s, parallellt |
| 3 | **Lägeskartan och spaningen** | Kartbordet, kameran rakt ovanifrån | Kartan över Södermanland (dagens drawMap som canvasTex på bordet), från dag 11 med Sverige som liten karta i hörnet. Hordens rörelser som **pilar med osäkerhet**: breda, suddiga, med "unconfirmed" i blyerts tidigt; smalare och svartare när rapporter kommer. Dagens rapport ritas in medan man tittar: en pil skärps, en ny nål sätts. Från dag 11 får spelaren **välja en spaning**: tre nålar att välja mellan (Hemvärnets patrull, polishelikoptern, en drönare), var och en med en rad om vad den kan ge; valet skärper en pil till i morgon och kan öppna en skådeplats (kampanjplanen avsnitt 8). Gnestas förberedelse från dag 12: en handritad stapel vid centrum, "20 %", som fylls per vunnen dag. | Pilarnas etiketter 3 ord; spaningsvalen 12 ord var | 15 till 25 s (5 s när inget val finns) |
| 4 | **Beslutet** | Kartbordet | **Fast dag:** en order ligger på bordet (Sahlins rad, stämplad, med dagens mål i en rad) och en nål är röd: "Deploy" är enda knappen. **Valfönster:** två eller tre nålar har var sitt litet kort på bordet (skådeplats, mål, vad som händer med den andra om man väntar: trycket som pips), spelaren drar den valda nålen, eller klickar. Trycket på den man hoppar över visas som ett blyertskryss till i morgon. | Ordern 20 ord; valkort 12 ord var | 5 till 15 s |
| 5 | **Rekvisition, utveckling och tavlan** | Materialförrådet och turlistetavlan | Dagens depotSheet, men delat på två platser: rostern på tavlan (magneter, vila-streck, stjärnor, man kvar, skicka och ta tillbaka), rekvisitionen och uppgraderingarna på pallen (korten som i dag, i Close Combat-format med streck), utvecklingen som pärmen. Berglund står vid tavlan och säger en rad om trötthet om det behövs. Frontbredden står skriven överst på tavlan: "ROUNDABOUT: 8 ON THE LINE". | Som i dag; en replik 14 ord | 20 till 40 s, eller 0 (Enter hoppar) |
| 6 | **Orderföredragningen** | Kartbordet, kameran dyker | Den korta animerade sekvensen: kameran går ner mot bordet, nålen för skådeplatsen fyller bilden, kartan växlar till **skissen av platsen** (dagens stridskarta renderad uppifrån i minikartans stil, som ett papper under lampan), och pilar ritas in med blyerts medan de dras: var horden kommer in, var basen är, var klockan sitter. Sedan ordern på en eller två rader (dagens intro.title och intro.text), stämplad med dag och klockslag. Personen vars dag det är säger en rad (Berglund om vägen, Lindkvist om tåget). | Rubrik 4 ord + rad 12 ord (som dayIntro i dag); replik 14 ord | 6 till 8 s, klick hoppar |
| 7 | **Deploy** | Porten | Kameran vänder mot den öppna porten, ljuset utanför, klipp till uppställningen. Inget nytt. | 0 | 2 s |

**Dag 11 (överfallet) hoppar över rummet helt**: efterspelet för dag 10 spelas, radion sprakar "they're in the village", klipp direkt till striden. Det är den enda dagen utan station, och det är poängen.

**Dag 15 (Västerkärv)** får ett kortare flöde: inget förråd (steg 5 hoppas), beslutet är "vilka tre åker" på tavlan.

**Dag 16 och 17 (centrum): stationen är på kartan.** Mellanspelet före dag 16 spelas i en stängd vagnhall: portarna nere, madrasser i slanghallen, Ek räknar civila. Briefingen (steg 6) visar centrumkartan med **flera försvarspunkter**, var och en med en rad om vad den rymmer: brandstationen (civila på golvet, släckbilarna), Elektron (kommunens ledning, MCF:s samband), Frejaskolan (civila i gympasalen, öppna ytor runt som horden kan korsa), och stationen vid järnvägen (basen, där tåget stod). Att förlora en punkt kostar något men avslutar inte dagen: civila i skolan faller, Räddningstjänstens bilar brinner (Ek tystnar i akt 3, ingen brand som spärr dag 18), Elektron tas (nästa dags rekvisition halveras: MCF:s samband är borta). Bara basen avgör. Efterspelet för dag 16 spelas i samma vagnhall, med det som hänt synligt: sotiga portar, en madrass mindre. Natt 17 är stationens egna portar en linje på kartan. Det här är det enda stället i kampanjen där rummet man planerar i och kartan man strider på är samma plats, och det ska kännas.

**Så lär man sig flödet.** Första gången (efter dag 3) finns bara steg 1, 2, 4 (fast dag), 6 och 7, och kameran gör allt själv: spelaren trycker Enter tre gånger. Steg 5 tillkommer efter dag 5, tavlan efter dag 6, steg 3:s val efter dag 11. Varje ny sak i rummet får ett lektionssteg på högst 12 ord ("The board. Your units, their rest. Click one."), aldrig fler än ett per dag.

**Vad som försvinner.** Inkorgen som lista (raderna bor på blocket och i radions logg), resultatplåtens egen radioruta (radion är ett föremål nu), "Operations map"-knappen (vagnhallen är kartan), och flödesraden "Operations map › Requisition › Deploy" (rummets ordning är flödet). Main menu bor kvar i hamburgermenyn.

---

## 5. Presentationen

### 5.1 Tempo

- Mål: 60 till 90 s från resultat till Deploy när spelaren inte dröjer i förrådet, mätt i speltest. Alla kameraglid 0,6 till 0,9 s, aldrig längre. Ingen replik står kvar längre än 4 s utan att spelaren kan gå vidare.
- `Enter` nästa steg, `Esc` till beslutet, `Space` gör inget här (Space startar vågen i striden; tangenten ska inte ha två jobb). Efter en **förlust** öppnas inte rummet: "Try again" ligger på resultatpappret som i dag, och förrådet nås med en knapp (det är redan regeln i 0.14.1).
- Allt steg 1 till 3 går i bakgrunden medan rummet laddas; den första bilden kommer inom 1 s. Rummet är cirka 30 anrop (en låda, instanser av pallar, lådor, stolar).

### 5.2 Typografi och plåtar

Dagens plåtar behålls men blir **saker**. Samma tre snitt (Oswald, Saira Stencil One för rubriker, IBM Plex Mono för siffror), samma papper- och rostfärger ur PALETTE. Tre nya ytor, alla ritade med canvasTex:
- **Papper på bordet:** resultat, order, valkort. Pappersfärgen `paper` med en svag skugga på kartan, stencilrubrik, monospace-siffror, en stämpel i rost (dag, klockslag, "MCF" eller "FM").
- **Tavlan:** mörkgrön eller vit tavla; text i ett handskriftssnitt (ett Google-snitt i stil med Caveat eller Kalam, bara här och på kartan; aldrig i HUD:en), magneter som färgade cirklar.
- **Radions fönster:** monospace i gulgrönt (som `.cd` i dag), en rad i taget, med ett blinkande tecken.
Pratbubblan är dagens plåt (mörk, 1 px papper-kant) med porträttet i vänsterkant och en rad text. Den står vid personen i rummet, inte i ett hörn.

### 5.3 Stillbilder eller vinjetter

Två sätt att visa platsen i briefingen: **fotoliknande stillbilder** (en renderad bild per skådeplats, gjord en gång) eller **lågpolyvinjetter** (en liten scen renderad i realtid). Stilbibeln säger inga bildfiler, och spelet har redan verktygen för det andra: portrait.js renderar en modell till en bild utanför skärmen, och minimap.js ritar varje karta uppifrån i rätt stil.

**Rekommendation: vinjetter ur de kartor som redan finns.** Briefingens "skiss" i steg 6 är stridskartan renderad uppifrån (minimap-stilen, högre upplösning) som en canvasTex på ett papper, och en liten snedvy av basen (samma rigg som spelet, 3 s, kameran står still) som ett "spaningsfoto" nålat bredvid, renderat vid första besöket och sparat för sessionen som porträtten. Det kostar ingen ny konst per skådeplats och ser ut som spelet, vilket är hela poängen: det spelaren ser på bordet är det hon strax ska spela. Riktiga stillbilder (en bild per karta) går att lägga till senare om vinjetterna blir för lika varandra.

### 5.4 Radions sprak

voices.js syntetiserar allt ljud ur brus och oscillatorer, och radion byggs på samma sätt: brunt brus genom ett bandpass kring 1,2 kHz, en squelch-klick när en rad börjar och slutar, en svag 50 Hz-ton som står under, och en liten "burst" av vitt brus mellan nyhetsfragmenten. Ledningens rader får en kort anropston. Ingen röst: text i fönstret, sprak i högtalaren. Volymen följer kameran: nära radiobordet hörs den tydligt, vid tavlan som ett surr. Det är det enda ljudet i rummet utöver fotsteg, en kaffebryggare, slangvindan och, genom portarna, det som pågår ute (släckbilen som startar, sirener dag 12 till 14, tystnad dag 20).

### 5.5 Handskrift på kartan

Kartan är ett papper som folk har ritat på i tjugo dagar. Varje dag lämnar spår: pilarna i blyerts (bredd och svärta efter osäkerhet), kryss över hoppade skådeplatser, en cirkel runt ishallen med "FULL" dag 7, Gnestas stapel i tusch från dag 12, kaffering dag 9, en pil mot Björnlunda som ritats om tre gånger. Allt ritas med canvasTex ovanpå drawMap, och lagren sparas i framsteget (en lista av "streck" med dag, typ och koordinater), så kartan på dag 20 bär hela kampanjen. Det är Banner Sagas räknare och Breachs brädminne i ett: ingen behöver berätta vad som hänt, det står på bordet.

### 5.6 Nyheter från Sverige utan förklaring

Regeln: **fragment, aldrig sammanhang**. Varje rad är högst tio ord, nämner en ort och en vardaglig detalj, och förklarar inget. Tre om dagen. Stegringen går per akt, inte per dag:

- **Akt 1:** störningar som låter som vilken nyhetsdag som helst. "Tåg inställda mellan Nyköping och Oxelösund." "Länsstyrelsen: undvik E4 söder om Södertälje." "Ica i Trosa stänger tidigt." Ordet zombie förekommer aldrig i radion.
- **Akt 2:** orterna blir större och fragmenten kortare. "Uppsala: militären tar över Fyrisån." "Göteborg stänger hamnen." "Regeringen sammanträder på okänd plats." Och mitt i: "Sörmland: Gnesta kommun ber om fler båtar."
- **Akt 3:** luckor. En rad är bara sprak. "P4 Sörmland sänder från Eskilstuna tills vidare." "Linköping: ingen kontakt sedan tisdag." Sista dagen: "Daga is quiet."

Ingen av raderna är en uppgift för spelaren, och ingen förklarar varför. Det är Pope: hålla det tvetydigt, lämna saker olösta. Dreaden byggs av att orterna är riktiga och detaljerna små. Raderna skrivs som data (src/data/radio.js, en lista per akt med vikter), tre dras per dag utan upprepning inom kampanjen.

---

## 6. Öppningen och slutet

### Öppningen (före dag 1, cirka 40 s, hoppbar)

1. Svart. Radions sprak. En rad i radions fönster: "E4 avstängd vid Lästringe. Militär på plats." Sedan dagens logotyp HORDE.
2. Kameran står vid E4:s vägspärr (dagens scen, utan HUD): soldater vid bommen, kön av bilar, en buss. Sol, dis. 4 s.
3. Pansarbandvagnens radio: Sahlins röst som text: "Roadblock 137. Hold until relieved. Out." Ingen person syns ännu.
4. Klipp: dag 1 börjar med dagens lektionssteg ("Your Ksp 90. Click it."). Ingen station, inga namn. Spelet lär ut striden först.
5. Efter dag 3: resultatet och radion som i dag ("Reports of a smaller outbreak in eastern Gnesta..."). Sedan, för första gången, porten till vagnhallen: kameran går in i ett mörkt rum där bara arbetslampan över kartbordet och radiorummet lyser; släckbilen står ute på planen. En person med ryggen mot oss vid kartbordet vänder sig om: "MCF. You're in command here now. The rink first." (Lindkvist, namnlös.) I radiorummet, utan att vända sig om, en man i mörkblått: "Fire service. Coffee's on the bench." (Ek, namnlös.)
6. Lektionssteg: "The map. Gnesta is next. Click the pin." Beslutet, briefingen, porten.

### Mitten (före dag 16, cirka 20 s, hoppbar)

Inte en egen sekvens utan ett läge i rummet: när kameran kommer in efter dag 15 är portarna nere för första gången, ljuset kommer från lysrören, madrasser ligger i slanghallen och folk sitter på dem (civila som instanser, som i ishallen). Ek: "Forty on the floor. Elektron's got sixty. The school has the rest." Briefingen visar de fyra punkterna med var sin rad. Det är den enda briefingen där spelaren ser ledningsplatsen själv som en nål på stridskartan.

### Slutet (efter dag 20, cirka 60 s, hoppbar men bara en gång)

1. Resultatpappret för dag 20 ligger på bordet, men rummet är annorlunda: portarna uppe, vit himmel, inga sirener, kaffebryggaren puttrar. Ek i porten: "Quiet out there. First time since the fourth."
2. Radion: "Daga is quiet." Sprak. Sedan en nyhetsrad till, från Sverige: "Uppsala: militären håller fortfarande Fyrisån." Det är inte över, bara här.
3. Kameran går ner i kartan: hela kampanjens blyerts syns på en gång, alla pilar, kryssen, stapeln vid centrum på 100 %, de fyra punkterna i centrum (de som höll inringade, den som föll överstruken) och en sista pil, kort och svart, mot grustaget, med ett kryss över.
4. Turlistetavlan: magneterna för de som är kvar, och en kolumn utan magneter med tejpbitar: de som föll, med dag. Berglund säger ingenting; han sätter en magnet tillbaka i lådan.
5. Dr Nyman i porten, en rad, den enda som pekar mot vad massan var: "It went quiet when the pit closed. Not before." Inget mer.
6. Sahlin: "Daga sector secure. Next orders follow. Out." En ny nål läggs på Sverigekartan i hörnet, utanför Sörmland. Vi ser inte var.
7. Kameran ut genom porten: släckbilen backar in på sin plats, Gnesta i dagsljus, rök som tunnat ut, båtar på väg tillbaka över Frösjön. Logotypen, versionen, "Operation Södermanland: 20 days".
8. Tillbaka i vagnhallen i fritt läge: extradagarna som nålar på kartan ("Hold the sector"), förrådet öppet, radion fortsätter med akt 3-fragment. Rummet är kvar; kampanjen är över.

---

## 7. Byggplan i tre skivor

Kostnad i sessioner (S = en, M = två till fyra, L = en vecka). Allt bygger på det som finns: drawMap och sektorlogiken i operation.js, depotSheet:s kolumner och handlers, dayResultPanel och dayIntro i panels.js, portrait.js, humanoid i kit.js, canvasTex, kamerariggen (camera-rig.js) och voices.js.

### Skiva 1: vagnhallen som en scen, med kartbordet, radiorummet och briefingen (M)

- Rummet: en låda med portar och glasvägg, betonggolv, slangvinda, kartbordet med arbetslampa, radiorummets rack, porten. Släckbilen på planen utanför (modellen återanvänds på centrumkartan). Mörker för det som inte tänts. Lookbook-sida först (stilbibelns grundregel). Generisk station: inga skyltar, inga igenkännbara detaljer.
- Kameran: fyra stopp (porten, bordet ovanifrån, radiorummet, "hallen"), glid 0,6 till 0,9 s, Enter/Esc/klick.
- Kartbordet: dagens drawMap som canvasTex på en plan, nålar som små meshar, klick på nål = sektorCard som papper. Blyertslagret med de streck som finns i dag (hordpilen per akt, kryss för tryck).
- Radion: inkorgens rader på blocket, resultatets radioruta i fönstret, sprak ur voices.js.
- Briefingen (steg 6): kameradyket, stridskartan som papper (minimap-renderaren i högre upplösning), pilar som ritas in, dayIntro som order på pappret.
- Efterspelet (steg 1): dayResultPanel som papper på bordet, utan mänsklig rad ännu.
- Return från striden: dayResultPanel → vagnhallen → Deploy ersätter dayResultPanel → opMapSheet → depotSheet → dag. Förrådet nås från vagnhallen via dagens depotSheet (oförändrad), så att inget går sönder.
- Återanvänds: allt i operation.js utom DOM-layouten; sectorCard, STATUS, nextDay, hitSector (blir raycast mot nålarna). Tester i tests/operation.test.js rörs inte.
- Speltest: human-ux-tester säger ja/nej på "förstår jag var jag är och vad jag ska göra härnäst" innan Ola ser det.

### Skiva 2: Människorna och nyhetsremsan (M)

- Fem personer som humanoid-figurer med egna färger (civila kläder för Lindkvist och Nyman; mörkblå stationskläder för Ek; m/90 för Berglund; m/90 med gradbeteckning för Sahlin), tomgångsanimation (vikt från fot till fot, Berglund skriver på tavlan, Ek med kaffekannan eller vid radion). Porträtt via portrait.js.
- Replikdatan: src/data/voices-hub.js (namn att bestämma), triggers och varianter, namnupplåsningen per dag.
- Pratbubblan i rummet, steg 1:s mänskliga rad, steg 5:s Berglund-rad, steg 6:s rad.
- Radio Sörmland: src/data/radio.js, tre fragment per dag, akt-stegring, sprak mellan.
- Portarna: dag, natt, rök, lysraket, grå himmel, stängda (sex lägen som data per dag), och släckbilen hel, sotig eller borta.
- Återanvänds: squad-view.js:s instansväg för figurer om de blir fler än fem; FROM_NAME och RELEASES blir Sahlins rader.

### Skiva 3: Hela rummet och slutet (L)

- Turlistetavlan: rostern ur depotSheet:s enhetskolumn som magneter och handskrift (vila, stjärnor, man kvar, skicka/ta tillbaka), frontbredden överst.
- Materialförrådet: rekvisitionen och uppgraderingarna som kort på pallen, utvecklingen som pärm. depotSheet:s handlers oförändrade; bara layouten flyttar.
- Lägeskartan i stor skala (steg 3): Sverige i hörnet, pilar med osäkerhet, spaningsvalet och dess effekt på pilar och öppnade skådeplatser (kräver kampanjplanens underrättelsesystem i src/meta).
- Centrum dag 16 till 17 som flerpunktsförsvar: försvarspunkter som mål i dagdatan (en per byggnad, med vad som förloras), stationen stängd i mellanspelet, efterspelet med spåren. Kräver centrumkartan (kampanjplanens skiva 2) med brandstationen, Elektron, Frejaskolan och järnvägsstationen utsatta.
- Dag 11:s hopp över rummet, dag 15:s korta flöde, Sahlin in i rummet dag 17.
- Öppningen, mitten och slutet (avsnitt 6), inklusive fritt läge med extradagarna.
- Eventuellt alternativ E (bandvagnen) som akt 3:s nav; annars portarna.

Ordningen betyder att kampanjen kan spelas med skiva 1 ensam (vagnhallen ersätter kartplåten, förrådet är som i dag), att skiva 2 gör rummet levande, och att skiva 3 tar bort de sista plåtarna. Kartorna för Björnlunda, rondellen, Västerkärv, centrum och källan byggs parallellt (kampanjplanens skiva 2); stationen behöver bara deras minimap-data, utom centrum som behöver försvarspunkterna.

### Att föra in i kampanjplanen (avsnitt 9, Olas beslut)

Det här dokumentet ändrar inte kampanjplanen, men tre saker ur Olas inspel hör hemma där:
1. **Centrum dag 16 till 17 blir ett flerpunktsförsvar**: brandstationen (civila, bilar), Elektron (kommunens ledning), Frejaskolan (civila i gympasalen, öppna ytor), järnvägsstationen (basen). Att förlora en punkt kostar (civila, Räddningstjänstens stöd i akt 3, nästa dags rekvisition) men avslutar inte dagen; bara basen avgör. Tabellen i kampanjplanens avsnitt 2 behöver en rad om det, och centrumkartan behöver platserna.
2. **Ledningsplatsen är brandstationen** (det här dokumentets avsnitt 2) och står på centrumkartan.
3. **Räddningstjänsten är en röst i kampanjen** (Ek), med brand dag 15 och lysraketer som hans område; inga riktiga personer, inga riktiga rutiner.

---

## 8. Risker

- **Rummet blir dekor** (Solomons varning). Motmedel: varje sak i rummet är en skylt som fanns förut; inget föremål utan funktion utom kaffebryggaren och ribbstolarna.
- **Tempot.** Ett rum frestar till långa kameraturer. Regeln 60 till 90 s mäts i varje speltest, och Enter går alltid vidare.
- **För många röster.** Fem personer, en kanal i taget, högst två repliker per mellanspel utöver briefingens. Nyman högst en om dagen.
- **Handskriftssnittet** kan bryta stilen. Bara på tavlan och kartan, aldrig i HUD:en, och provas i lookbooken mot Oswald innan det används.
- **Spelare som bara vill spela.** Esc och Enter gör rummet till tre tangenttryck; inget i rummet är obligatoriskt utom beslutet på valdagar.
- **Det personliga.** Brandstationen är Olas arbetsplats. Byggnaden i spelet ska vara en brandstation, inte den; inga riktiga personer, inga riktiga rutiner, inget som en kollega skulle känna igen som sig själv. Det är samma regel som för husen i Gnesta, bara viktigare här.

---

## 9. Öppna frågor till Ola

1. **Brandstationen** som ledningsplats (vagnhallen, radiorummet, turlistetavlan), med Elektron och Frejaskolan som försvarspunkter i centrum: rätt? Och ska bandvagnen tas in som akt 3:s nav, eller räcker portarna? Hur generisk måste stationen vara för att kännas rätt utan att vara din?
2. **Namnen.** Lindkvist, Berglund, Sahlin, Nyman, Ek: rätt ton? Behövs en sjätte civil röst utan mekanik (en vaktmästare på ishallen), eller täcker Ek stan?
3. **Språket i rummet.** Spelet är på engelska; radiofragmenten från Sverige är svenska ortnamn i engelska meningar i förslaget. Vill du att radion sänder på svenska (dubbel text) för att Sverige ska kännas som Sverige?
4. **Spaningen** (steg 3): ett val per dag mellan tre källor som skärper pilar och kan öppna skådeplatser, eller ska underrättelserna bara komma (ingen resurs, bara berättelse)?
5. **Handskriftsspåren på kartan** som sparas över kampanjen: ja, eller håll kartan ren och tydlig?
6. **Centrum som flerpunktsförsvar:** fyra punkter (brandstationen, Elektron, Frejaskolan, järnvägsstationen som bas) där bara basen avgör dagen och de andra kostar: rätt antal, och är priserna rätt sorts (civila, Räddningstjänstens stöd, nästa dags rekvisition)? Och Nymans enda rad om massan i slutet: rätt mängd sagt, eller ännu mindre?
