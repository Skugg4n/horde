# Kartbordet: vad som byggdes (0.21.0 till 0.21.2, 2026-10-19)

Efter mockupen docs/mockups/kontrollrum-3.html och mellansnack avsnitt 10 och 11. Skärmbilder: docs/hub-0.21-start.png (dag 1), docs/hub-0.21-day8.png (kampanjens dag 8 = Ishallen dag 5, efter en riktig dag 7 med Quick jump och Auto-deploy) och docs/hub-0.21-molnbo.png (mockupens läge, Mölnbo dag 1).

## Filer
- src/ui/table.js: bordet (DOM i ett designrum på 1440 x 900 som skalas till fönstret), kartbladet som SVG, högarna, korten, dra och släpp.
- src/meta/table.js: vad som ligger på bordet som rena funktioner (tableState, missionPiles, enemyPile, radioStrips, cardZones, swapCards, moveObject, tidy, campaignDay).
- src/data/table.js: geografin (från mockupen), sektorernas platser och högarnas startlägen (SECTOR_TABLE), radioremsor, fiendebladens rad, kortens rollrad.
- Inställningen hub: 'table' (standard) eller 'classic' (src/meta/settings.js), i spelmenyn som Between days. Classic är operationskartan och förrådet som förut.

## Hur det fungerar
- En sak i taget. Dag 1: kartan och en lapp (dagens order) med Deploy på lappen. Fiendehögen kommer efter första mötet, radion med första remsan, korten och klämbrädan (Next battle, RP, Requisition, Deploy) med förrådet (efter Ishallen dag 2). Sektorernas lägen på kartan, rapporterade fiender och lappen What we face kommer med operationskartan (efter E4 dag 3). Grindarna är src/meta/unlocks.js, oförändrade.
- Uppdragshögar: en per sektor, order och lägesrapport per dag i tidsordning, nyast överst. Nästa strids hög har gårdagens rapport under ordern och ett snöre till platsen. En klar sektor får ett slutblad med stämpeln HELD. Klick breder ut högen (de åtta nyaste bladen), klick eller Esc lägger ihop den.
- Fiendehögen: ett blad per mött typ (ENEMIES i src/data/lessons.js, siluetten från FOE_ICONS). Klick på en kant lägger bladet överst.
- Korten: förrådets två banor (lanes, setLane) som två fält. Klick flyttar ett kort till andra fältet, dra till fältet eller släpp på ett kort i andra fältet för att byta (swapCards = två setLane). Taket, tomma grupper och skälen är förrådets. 0.21.1: korten överlappar inte; ryms de inte i en rad blir de mindre i två till fyra rader, alltid med namn, styrka och trötthet.
- Requisition (R eller knappen) är förrådets skylt som en klämbräda över bordet; Esc går tillbaka till bordet, Enter ställer upp.
- 0.21.2: valet i Into battle/Reserve står kvar mellan dagarna (u.lane); efter en vunnen dag byts bara en utmattad i striden mot en mindre trött i reserven (u.moved, raden på kortet). Spelmenyn mellan dagarna heter Map table. Layouten görs om när fönstret ändras.
- Tangenter: Enter Deploy, Esc lägger ihop en utbredd hög eller öppnar menyn, R Requisition, T Tidy.
- Deploy på bordet startar dagen direkt. Första gången förrådet har ett steg som inte setts (nivåer, rekvisition, uppgraderingar, tröttheten) går Deploy via Requisition, så att lektionerna kommer där de hör hemma.
- Dagens nummer på bordet är banans egen dag (0.21.1, speltestet: två nummer förvirrade), som introt, HUD:en och menyn: "Ishallen · Day 3", ORDER 03. day.campaignDay går före när en bana har det.
- Bordets yta (0.21.1, src/meta/table.js frameFor): skalan minst 0,8 så att texten blir minst 11 px; i mindre fönster blir ytan mindre och kartbladet krymper. Korten och klämbrädan står mot nederkanten, fiendehögen och klämbrädan mot högerkanten.
- En förlorad dag (0.21.1) lägger ett blad överst i högen med utfallet (table.log['lost:bana:dag']). Radion har en remsa bara natten efter en dag med sändning. Operationskartans tips visas inte på bordet.

## Sparfilen
progress.table = { layout: { id: { x, y } }, log: { 'bana:dag': { kills, waves, lost, saved, total } } }. Valfritt fält i v4 (ingen ny version, ingen sparfil raderas); saknas eller är trasigt blir bordet tomt (normalizeTable, i loadProgress). log skrivs när en dag vinns och är det lägesrapporten skrivs ur när banan saknar egen text.

## Datafält som andra grenar fyller (alla valfria, med standard i läsande kod)
- day.report = { from: 'MCF' | 'Försvarsmakten' | 'P4 Sörmland', text, at? }: lägesrapporten efter dagen, 40 till 60 ord. from 'P4 Sörmland' blir en radioremsa natten efter dagen (högst 40 ord, at = klockslag "04:40"). Saknas den skrivs en kort rapport ur dagens siffror.
- day.order = { from, text }: ordern för dagen, högst 12 ord. Saknas den används intro.text och leveransens from (RELEASES).
- day.campaignDay: kampanjens dagnummer på bordet (t.ex. Mölnbo dag 1 = 8 när bågen är byggd). Saknas det står banans egen dag.
- map.outro.summary: slutbladets rad (annars första meningen i outro.text).
- Ny sektor: en rad i SECTOR_TABLE (place, current, closed, day) i src/data/table.js; utan den får högen en ledig plats och ingen markör.
- Radio utan banans fält: RADIO i src/data/table.js (after: [bana, dag]); dagens egen P4-rapport går före.

## Krokar och sådant som inte byggdes
- Gnesta-inzoomningen (ritfilmen): insetSheet() i src/ui/table.js och INSET i src/data/table.js.
- Garnisonsvarningen före Deploy (vilande regel, bara med två aktiva platser) visas bara i Classic.
- Ett ark för stora högar (fler än åtta blad) i utbrett läge: de äldre syns inte, raden säger hur många.

## Prov
tests/table.test.js (dag 1 och dag 8, högarnas ordning, rapporten, radion, textgränserna, dra och släpp med Tidy, korten med förrådets regler, en v4-sparfil utan table), tests/settings.test.js (hub), och layoutprovet (npm run layout): table-day1, -day2, -day8, -molnbo-1, -spread och -requisition i 1024, 1440 och 1920. Högarna får ligga på varandra; det som ska läsas ([data-read]) får inte vara täckt av något annat föremål.
