# Gnesta 0.1.0: kartscen (rapport)

Gren `gnesta/map` i `~/Projects/horde-gnesta`. Ingen spellogik, bara scenen.

## Gjort
- `src/data/gnesta.js`: kartan ritad ur karta.jpg/satellit.jpg i bildpixlar, 0.095 m/px (spelyta ca 155 x 95 m, x öster, z söder). Vägar som polylinjer med bredd och yta (Sigtunavägen med kurvan, östra grenen, tre stickgator som slutar i grusstigar upp till cykelvägen, cykelvägen som böjer ner till rondellen, Fornminnesvägen, skogsvägen, gångstigar). Droppformad rondell, ishallen, parkering, skog/fält, 7 kvarter med 35 tomter och 33 hus (fotavtryck och riktning från kartan, hus mot närmaste gata), häck/staket per tomtkant med lucka vid uppfarten, trädgårdssaker, lekplats, gatunamn, spawns (öst 1, norra vägen, skogsvägen) och bas.
- Rutnät: `gnesta.grid = { w: 81, h: 56, cellSize: 2, origin: [-82, -48], walk: Uint8Array, spawns, base }`. 4-sammanhängande (varje väglinje stämplas i 0.25 m-steg). Testat i `tests/gnesta.test.js` (alla spawns når basen, ett enda sammanhängande nät, inga hus på vägar).
- `src/render/gnesta-kit.js`: batch som gör en InstancedMesh per (geometri, materialsort) med färg per instans. Villor (sadel/valmat tak, 1 och 1,5 plan, balkong på gaveln, garage, uterum, skorsten, solceller), förskola, verkstad, häck, vitt och grått spjälstaket, brevlådor, lövträd, studsmatta, utemöbler, bil, släpkärra, gatlykta, kantsten, gran/tall/björk, ishallen med skylt "GNESTA ISHALL", rondellens gräsö med flaggstång, elskåp och märke, lekplats, parkeringsbelysning. Palett `GP`.
- `src/render/gnesta-world.js`: marken målas på en canvas (gräs, gräsmattor, uppfarter, asfalt, grus, jord, skog, parkeringsrutor, mittlinje), allt annat i en batch. Rutnätsöverlägg.
- `gnesta.html`: samma ljus, dis, gradering, vinjett, korn. Synfält 36 (E4 25), panorering med mus/WASD/pilar, hjul 18-72, L gatunamn, G rutnät, H hem. Skuggkameran följer målpunkten. Version i hörnet, renderer.info nere till höger.
- lookbook.html: ny rad "Gnesta" (4 villor, häck, två staket, lykta, brevlådor, lövträd). art-bible: avsnitt "Gnesta".

## Mått (renderer.info, 1400x900)
- 21-25 ritanrop, ca 218 000 trianglar. 20 InstancedMesh, ca 12 000 instanser, 1 560 träd.
- Inga konsolfel (bara drivrutinsvarningar om ReadPixels från skärmbilderna).

## Skärmbilder
docs/gnesta-0.1-rondellen.png, docs/gnesta-0.1-oversikt.png, docs/gnesta-0.1-gata.png (huvudlös Chromium efter koordinatorns besked).

## Att veta
- Ishallen: gaveln med skylten vetter mot rondellen och långsidan går längs Sigtunavägen, så som ishallen.jpg och kartan visar. Uppdraget sa "långsidan mot rondellen"; jag följde bilderna.
- Skalan är 0.095 m/px, inte exakt halva: 0.0875 gav kvarter som var för smala för hus och trädgård.
- Husen är något större än halv skala (ca 7.5-10 x 6.5-8 m) så att de läser som villor.
- Scenen är mörkare än E4 (gröna ytor och mörka tak i samma ljus). Ljuset är orört; färgerna är lyfta en gång.
- Parkeringen och vägen väster om ishallen är inte gångbara i rutnätet.
- Den skärmbild som ritas i headless-läge kör ca 20 fps i SwiftShader; ingen mätning på riktig GPU för fps (den synliga sessionen visade ca 118 fps).
