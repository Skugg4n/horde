# Bana 2: Gnesta, Sigtunavägen (design)

Version 0.2 · 2026-10-15 · status: godkänd i chatten ("Go!"), byggs efter 0.3. Skiss och referensbilder ligger lokalt utanför repot (Google Maps-bilder, publiceras inte): `~/Projects/horde-refs/`.

## Idé

E4 var en plats och en väg. Gnesta är en riktig stadsdel med gator, stickgator och cykelvägar. Horden kommer från öster och går mot oss vid rondellen utanför ishallen. Spelaren styr den med barrikader så att den tvingas runt kvarteren, förbi vapenpositionerna. Moderna, hela villor en vanlig sommardag som just börjat gå åt skogen.

## Plats och skala

- Utsnitt: från den droppformade rondellen utanför Gnesta ishall (väster) till östra delen av Sigtunavägen, och från Fornminnesvägen (norr) till Sigtunavägen (söder).
- Verklig bredd ungefär 280 m. I spelet ungefär hälften. Gatornas form och husens placering följer kartan; husen är generiska moderna villor, inte kopior av riktiga hem. Gatunamn och ishallen används.
- Kameran är ett steg mer utzoomad än E4 och går att panorera.

## Vägnätet (Olas beslut 2026-10-15)

- **Horden går bara på gator och cykelvägar.** Tomterna är stängda: häckar, staket och hus i blandning.
- Stickgatorna från Sigtunavägen går upp till cykelvägen i norr, och zombierna tar gärna den vägen. Varje kvarter blir alltså ett varv.
- Gatorna är ett osynligt rutnät (2 m-rutor). Horden följer ett flödesfält mot basen som räknas om varje gång något byggs eller rivs. Deterministiskt, så balanssimuleringen fungerar.
- **Barrikader** sätts fritt i rutnätet på gatorna. De är mycket dyra att passera i vägsökningen, så horden väljer att gå runt kvarteret. Är alla vägar stängda går den mot närmaste barrikad och slår sig igenom. Ingen regel om att lämna en väg öppen behövs.
- **Taggtråd** läggs fritt på gatorna och bromsar.

## Vapenpositioner

- På tomter och vid husen, med skottfält över gatorna (A-F öppna, G-H via forskning).
- Fokus är skjutande pjäser (M249, M2 och senare SMG/MG-varianter).
- **Granatkit** är ett tillval per position som köps för pengar när forskningen Grenades är upplåst. Bara positioner med kit kastar, automatiskt. Molotov kan bli en senare variant av samma tillval.

## Vågor

Next wave-knapp med 5 s nedräkning och bonus för tidigt kall (byggs i 0.3 och gäller alla banor).

## Dagar (förslag)

| Dag | Nytt | Ingång |
|---|---|---|
| 1 | Lär dig barrikader | Öst 1: Sigtunavägen |
| 2 | Andra ingången | Öst 2: norra vägen |
| 3 | Skogsvägen öppnas | Sydost genom skogen |
| 4 | Bjässar slår sönder barrikader snabbare | alla |
| 5 | Allt på en gång | alla |

## Senare överraskningar

1. Nya spawns: horden kommer plötsligt från ett annat håll.
2. Zombier bryter sig igenom en tomt och ett hus och skapar en ny väg.

## Grafik

Samma ljus, sol och dis som E4. Nytt i byggsatsen: villor med mörka sadeltak och ljusa eller träpanelfasader, häckar, spjälstaket, gatlyktor, parkerade bilar och släpvagnar, Gnesta ishall (röd med vit gavel), den droppformade rondellen med gräsö och flaggstång, cykelväg i grus, skogskant. Allt in i visningssidan först.

## Öppet

- Koppla E4 till Gnesta senare (till exempel att E4-horden är den som kommer in från öster).
