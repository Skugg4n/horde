# Horde: design (arbetsnamn)

Version 0.1 · 2026-10-14 · status: utkast för Olas godkännande

## Idé i en mening

Gritty top-down tower defense i 2.5D: en dag i taget håller du en position mot zombiehorder med verkliga vapensystem, och när du faller börjar dagen om, men allt du har forskat fram följer med.

## Grafik (låst efter prov 1)

- **Three.js, fast isometrisk ortografisk kamera.** Godkänt i `mockups/prov-1-3d.html`.
- Bara dagsljus. Låg eftermiddagssol med långa skuggor, damm i luften, dis i horisonten och en gemensam färggradering. Varje bana får sin egen tid på dagen (morgondimma, middagshetta, skymningsljus), men aldrig natt.
- **Stilbibel** (`docs/art-bible.md`): palett, materialregler (matt, flatskuggat), proportioner och ljussättning. Alla modeller byggs i kod av en gemensam byggsats av delar. Inga bildfiler som sprites.
- **Visningssida** (`lookbook.html`): alla modeller och effekter uppställda under samma ljus. Bild före och efter varje version, så att stilen inte glider.
- Det som blir kvar på planen: lik, blod, sot, hylsor och kratrar ligger kvar dagen ut. Planen ska se ut som en strid har pågått.

## Kärnloop

1. **Förberedelse** (pausat): köp och placera vapen på **positioner** och hinder på vägen, och uppgradera.
2. **Våg**: horden går längs fasta vägar mot basen. Vapnen skjuter själva. Du kan pausa och köpa mellan vågor, inte under.
3. En **dag** = 3 till 6 vågor. Klarar du sista vågen är dagen vunnen och nästa dag låses upp.
4. Når horden basen så att den faller, börjar **dagen om** från våg 1.

## Två valutor

- **Pengar**: tjänas per död zombie, gäller bara inom dagen. Nollställs till dagens startkassa när dagen börjar om.
- **Forskning**: tjänas per död zombie och per klarad våg, även när du faller. Den är permanent och används i forskningsträdet: nya vapen, nya hindertyper, uppgraderingar, fler startpengar och fler positioner.

Det gör att ett misslyckat försök aldrig är bortkastat, eftersom du alltid kommer tillbaka starkare.

## Inlärningskurva

- Dag 1: en väg, en kulspruta, små vågor och en enda instruktion på skärmen.
- **Varje ny dag introducerar exakt en ny sak**: ett vapen, en hindertyp, en zombietyp eller en ny väg. Den visas på ett kort med en mening när dagen börjar.
- Svårigheten stiger i tre steg: fler zombier, snabbare och tåligare zombier, och sedan nya typer som kräver motmedel (till exempel bepansrade zombier som kräver grövre kaliber).
- Balansen räknas fram med en simulering innan den ändras i spelet.

## Vapen (verkliga system)

| Vapen | Roll | Låses upp |
|---|---|---|
| M249 (lätt kulspruta) | billig, snabb, svag | start |
| M2 .50 cal | allround, grov kaliber | forskning (första noden) |
| Barrett M82 | prickskytt, lång räckvidd, går igenom flera | forskning |
| Mk 19 granatspruta | ytskada mot klungor | forskning |
| M252 81 mm granatkastare | indirekt eld, lång räckvidd, har ett minsta avstånd | forskning |
| Carl-Gustaf M4 | mot stora och bepansrade | forskning |
| M134 Minigun | massiv eldhastighet, värms upp | sent |

Varje vapen har 3 uppgraderingsnivåer per placerad pjäs (till exempel eldhastighet, räckvidd och ammunitionstyp) som syns på modellen.

## Hinder (saktar ner eller stoppar)

- **Taggtråd**: saktar ner kraftigt och slits sönder med tiden.
- **Spikmatta / vägspärr**: skadar och saktar ner.
- **Betongblock / sandsäcksmur**: stoppar tills zombierna har slagit sönder dem, så att du kan styra flödet.
- **Oljefat**: antänds av skott och ger brand på en yta.
- **Claymore M18A1**: en engångsmina i en kon.

## Zombier

Vandrare (bas), Löpare (snabb, skör), Krypare (går under taggtråd), Bjässe (tålig, slår sönder hinder), Bepansrad (kravallutrustning, tål bara grov kaliber), Uppsvälld (exploderar mot hinder), Skrikare (gör närliggande snabbare). En ny typ införs i taget.

## Banor

Varje bana har 5 dagar. Förslag i ordning: **Riksvägen** (en väg, lärbana), **Bensinmacken** (korsning, två vägar), **Bron** (smal passage med vatten, granatkastaren lyser här), **Köpcentret** (många ingångar), **Hamnen** (slutbana).

## Gränssnitt

Samma stil som i proven: mörka plattor, stencilsiffror, kort för byggmenyn. Klicka på en position för att bygga eller uppgradera. Forskningsträdet nås mellan dagarna. Kortspråket är svenskt och klarspråk: en text per sak och inga interna ord.

## Teknik

- Vanilla JavaScript-moduler och Three.js via importmap med låst version. Inget byggsteg.
- **Simuleringen är skild från grafiken**: spelreglerna går att köra utan skärm, vilket ger balanssimulering och tester med `node --test`.
- Sparning i localStorage med versionsfält. En sparfil raderas aldrig vid fel (lärdom från Dead Horizon och RPI).
- Publiceras på GitHub Pages, och push till main betyder ny version. Versionen syns diskret i hörnet och höjs vid varje uppdatering.

## Första milstolpe (0.2): spelbar skiva

Riksvägen, dag 1 till 3, M249 + M2, taggtråd + betongblock, Vandrare + Löpare + Bjässe, forskningsträd med cirka 6 noder, omstart av dag med behållen forskning, stilbibel + visningssida. Ingen ljudsättning ännu.

En oberoende testare (en agent som spelar som en människa) ska säga ja innan jag kallar den spelbar.

## Utanför 0.2

Ljud, banorna 2 till 5, sena vapen, mobilanpassad styrning och berättelse.
