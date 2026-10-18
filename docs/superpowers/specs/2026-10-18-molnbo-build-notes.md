# Mölnbo: byggnoteringar (0.17.0-molnbo)

Första spelbara versionen av sektorn Mölnbo, byggd på grenen feature/molnbo ovanpå 0.16.3. Designen: docs/superpowers/specs/2026-10-17-molnbo-design.md (i huvudrepot). Referenserna ligger lokalt i ~/Projects/horde-refs/molnbo och har inte kopierats in.

## Antaganden (Olas frågor är obesvarade)

Det här är antaget för att kunna bygga. Varje punkt går att ändra i src/data/molnbo.js.

1. **Gångbron är en egen bro** väster om vägbron (cirka 13 m mellan dem), med ett trapptorn vid varje perrong. Den landar på Gnestavägens trottoar i söder och på stationsparkeringen i norr. Trappan ner till norra perrongen går från gångbron.
2. **Ingen annan passage** över eller under spåret. Mölnboån har ingen gångbar väg under banan.
3. **Trollvägen når Fagernäsvägen**, och **vägen förbi hyreshusen vid Kvarnen (Kvarnvägen) går igenom** till Gnestavägen. Kvarnvägen går in på Stenbyvägen söder om Kvarnen, i dimkanten, så att den är en omväg; men stängs Stenbyvägen vid Missionshuset tar horden från Gnestavägen den vägen. Spelaren behöver alltså två spärrar för att leda horden förbi stationen (det pussel designen beskrev).
4. **Basen är Folkets hus** (Olas beslut). Dörrarna och grusplanen vetter mot söder, mot kameran, så att entrén syns.
5. **Sektorns mål: håll tills sista tåget norrut gått.** Tågklockan dag 3 till 5 (dag 5 är det sista tåget). Tåget väntar vid södra perrongen (X60) och rullar ut när klockan når noll. Dag 1 och 2 är det samma X60, övergivet, som skydd.
6. **Mölnbo är inte kampanjens final.** Sektorn slutar med "The last train is through. Mölnbo station held long enough." och inget mer händer efter dag 5.
7. **Skalan:** avstånden ungefär halv skala som Gnesta, men järnvägens tvärsnitt (spår, perronger, tåget) och husen nära verklig storlek. Stationshuset och Fagernäs ligger i dimkanten, Kvarnen och Hembygdsgården i kanten av spelytan.
8. Vapenplatserna i designen (caféets parkering, Folkets hus grusplan, stationens grusplan, stationsparkeringen) är byggbar mark, inte gångbar.

## Gränser i den här versionen

- **Bron är platt i simuleringen.** Broarna är vanliga rutor i rutnätet; bara bilden lyfter zombierna, deras hälsoringar och hordens väg (map.groundY). Siktlinjerna räknas i 2D: en enhet på marken ser genom brodäcket, och en zombie på däcket kan träffas från marken under det. Ingen enhet kan stå under bron (spåren är stängda), så det märks mest vid ramperna.
- **Tåget tar inga civila.** Designens förslag (de civila från Folkets hus över gångbron till norra perrongen) är inte byggt; tågklockan är bara en klocka. Evakueringen går mot basen i simuleringen, och en väg bort från basen finns inte.
- **Södra perrongen går inte att gå på** (bara att stå på bakom tåget). Banvallen och norra perrongen är bara gångbara för dag 5:s överraskning.
- **Spärrarna i balansskriptet** stänger aldrig alla vägar (planeringen tillåter det inte), så "stäng båda broarna och låt dem slå sig igenom" är provat i webbläsaren men inte balanserat.
- **Dag 4 och 5 är knivseggar** (docs/balance-log.md, Mölnbo): ett par hp-steg skiljer "alla på första försöket" från "någon seed vinner aldrig". Rekvisitionen mellan försöken hjälper lite eftersom lagret är nästan tomt.
- Prickskyttarna vänds av sig själva mot den del av hordens väg de ser mest av; tornet i norr ser inget dag 1 (horden kommer söderifrån) och måste vändas eller flyttas av spelaren.
- Husen längs gatorna är generiska villor (utplacerade längs vägarna med ett fast frö), inte kopior av riktiga hem. Landmärkena är förenklade i spelets stil.
- Lookbook-sektionen ligger nedanför de andra (v -125), och modellerna står tätt.

## Så provar man

- `?debug&jump=molnbo:1` (till och med `:5`) hoppar direkt till dagen med truppen en spelare har där. Med `?mute` utan ljud.
- `node scripts/balance.mjs molnbo` (mbSmart och naive, fem seeds; tar cirka fyra minuter eftersom ankomsten räknas genom hela kampanjen).
- `npm run placement -- --map molnbo --day 1`.

## Nästa steg

1. Speltest med Ola: dag 1 till 5, särskilt bron dag 4 och sista tåget dag 5.
2. Olas svar på de öppna frågorna (gångbron, passager, Trollvägen, Kvarnvägen, perrongerna, finalen) och kartan efter dem.
3. De civila till tåget (designens evakuering över gångbron), om tågmålet blir kvar.
4. Siktlinjer med brodäcket (en höjd per ruta för däcket, eller en egen regel för rutor under bron).
5. Balansen efter speltestet: hp-faktorerna (12 till 32) är höga jämfört med Hagstumosse eftersom truppen är stor; dag 4 och 5 kan behöva mjukare kurvor.
6. Ljud: tåget, avgångsskylten och trafikljusen har inget eget ljud.
