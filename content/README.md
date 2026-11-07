# Oldefars Hemmelighed – indholdspakke til kapitel 1

Pakken indeholder alt indhold til kapitel 1, klar til at blive bygget ind i spillet. Pak den ud i repoet under `/content`, og giv Claude Code den fulde spilbeskrivelse som tekst.

## Indhold

| Fil | Hvad |
|---|---|
| `data/familie.json` | Rammehistoriens faste fakta: oldefar, hans to koner, morfar og de fem mødre |
| `data/faetre.json` | De fem fætre: personlighed, evne, arvestykke og faste replikker på dialekt |
| `data/ordbog.json` | 28 gamle ord med forklaringer |
| `data/sager/sag1.json` | **Ane Kirstine fra Hviding** – tutorial, krydstjek (1855–1880) |
| `data/sager/sag2.json` | **Smeden fra Gørding** – udelukkelse (1844–1869) |
| `data/sager/sag3.json` | **Slægten fra Bundgaard** – stamtræ tilbage til ca. 1750, og twistet |
| `data/sager/sag4.json` | **Manden fra Ballum** – fotogenkendelse, kapitlets finale |
| `billeder/manifest.json` | Tegneopgaveliste: 37 motiver med beskrivelse, tags og arvelige træk. Al grafik tegnes af Claude i SVG – feltet `reference` angiver blot, hvilke motiver der skal ligne hinanden. |

## Historien i kapitel 1

1. **Sag 1:** Bodil Kjær leder efter sin oldemor. Morfar: *»Far sagde, han var fra Vilslev – men han kendte ingen dér.«*
2. **Sag 2:** Linda fra Nebraska leder efter en udvandret smed. Morfar: *»Far talte tysk i søvne.«*
3. **Sag 3:** Karl Erik Bundgaard vil have sit stamtræ. Hans grandtante Karen Marie viser sig at være gift med »Jens Peder Iversen« – oldefar. Men Jens Peder Iversen døde i Vilslev i 1899, kun 2 år gammel.
4. **Sag 4:** Fætterens arvestykke peger mod Ballum. Bryllupsfotoet matches med et soldaterfoto fra 1916: oldefar er **Peter Asmus Hansen**, meldt savnet fra den tyske hær i 1917.

Cliffhanger: Hvem hjalp ham over Kongeåen, og fik hans mor nogensinde at vide, at han levede?

## Sådan er sagerne bygget op

Hver sag har:

- `kunde`: intro og noter, der kan fastgøres i notesblokken
- `dokumenter`: kilderne. `raekker` har stabile id'er, så de kan vælges.
- `trin`: hvad spilleren skal gøre. Typerne er `vaelg_raekke`, `udelukkelse`, `stamtrae` og `fotogenkendelse`. Hvert trin har en løsning og en venlig forklaring for hvert forkert valg, så der aldrig er straf.
- `hints`: fra vage til tydelige
- `morfar`: erindringen, der låses op bagefter
- `replikker`: start- og slutreplik pr. fætter på dialekt med rigsdansk ved siden af
- `oplaasninger`: hvad kontoret får af nye ting

`skjult_spor` markerer små detaljer, der først giver mening senere. I sag 1 står Iver Jensen fx allerede i folketællingen, og han er far til den dreng, hvis navn oldefar tager.

## Bemærk

- **Dialekterne** er mit bedste bud. Få dem læst igennem af en, der har dialekten som modersmål, især sønderjysk og vendelbomål.
- **Alle personer er fiktive.** Stednavne, kildetyper, Füsilier-Regiment Nr. 86 og de preussiske tabslister er historisk ægte.
- **Grafikken** tegnes af Claude i SVG ud fra `billeder/manifest.json`. Lægger man en `<id>.png` eller `<id>.svg` i `billeder/`, bruges den i stedet.
