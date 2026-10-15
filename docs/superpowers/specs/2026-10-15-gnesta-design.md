# Bana 2: Gnesta, Sigtunavägen (design, utkast)

Version 0.1 · 2026-10-15 · status: utkast för Olas godkännande. Skiss: `docs/gnesta-skiss.html`. Referensbilder: `docs/refs/gnesta/`.

## Idé

E4 var en plats och en väg. Gnesta är en riktig stadsdel: horden kommer från öster och vill raka vägen genom trädgårdarna till oss vid ishallen. Spelaren barrikaderar glappen mellan husen så att horden tvingas ut på gatorna där vapnen står. Moderna, hela villor en vanlig sommardag som just börjat gå åt skogen.

## Plats och skala

- Utsnitt: från den droppformade rondellen utanför Gnesta ishall (väster) till östra delen av Sigtunavägen, och från Fornminnesvägen (norr) till Sigtunavägen (söder).
- Verklig bredd ungefär 280 m. I spelet ungefär hälften (cirka 140 x 85 m). Gatornas form och husens placering följer kartan; husen är generiska moderna villor, inte kopior av riktiga hem. Gatunamn och ishallen används.
- Kameran är ett steg mer utzoomad än E4 och går att panorera (dra, eller piltangenter). Hela banan ryms inte på en skärm, och det är meningen.

## Rutnät och vägsökning (ny grund)

- Banan är ett rutnät med 2 m-rutor. Varje ruta har en kostnad: gata 1, gräs 1.3, trädgård 2 (häckar och staket bromsar), hus och skog stängda, barrikad stängd, taggtråd hög kostnad (bromsar men går att gå igenom).
- Horden följer ett **flödesfält** mot basen som räknas om varje gång spelaren bygger eller river något. Det är billigt (en bredd-först-sökning över cirka 3 000 rutor) och helt deterministiskt, så balanssimuleringen fungerar som förut.
- **Regel:** en barrikad får inte stänga sista vägen. Försöker man blir platsen röd med texten "Must leave a way through".
- Bjässar kan slå sönder barrikader som på E4. Då öppnas glappet och flödet räknas om.

## Barrikadplatser

Fasta platser i glappen mellan husen (romberna i skissen), inte fri placering. Det gör det tydligt var man kan bygga och håller banan stabil. Taggtråd går fortfarande att lägga på gatorna i rutor.

## Positioner

A-F öppna från start: två vid rondellen, två vid Sigtunavägens stickgator, en på gräset vid ishallen, en vid norra grusvägen. G-H låses upp med forskning.

## Dagar (förslag)

| Dag | Nytt | Ingång |
|---|---|---|
| 1 | Lär dig barrikader | Öst 1: Sigtunavägen |
| 2 | Andra ingången | Öst 2: norra vägen |
| 3 | Skogsvägen öppnas | Sydost genom skogen |
| 4 | Bjässar slår sönder barrikader | alla |
| 5 | Allt på en gång | alla |

## Grafik

Samma ljus, sol och dis som E4. Nytt i byggsatsen: villor med svarta sadeltak och ljusa fasader, häckar, spjälstaket, gatlyktor, parkerade bilar, Gnesta ishall (röd med vit gavel), den droppformade rondellen med gräsö och flaggstång, skogskant. Allt in i visningssidan först.

## Öppna frågor till Ola

1. Fasta barrikadplatser (förslag) eller fri placering i rutnätet?
2. Ska E4 senare kopplas till Gnesta (t.ex. att horden från E4 är den som kommer in från öster)?
