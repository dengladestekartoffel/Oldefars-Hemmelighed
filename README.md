# Oldefars Hemmelighed

Et tegneserieagtigt slægtsforskningsspil, der foregår på et skrivebord i Ribe. Installerbar web-app (PWA) bygget med Vite, TypeScript og Preact.

## Kom i gang

```sh
npm install
npm run dev      # udviklingsserver – grafikgalleriet ligger på /#galleri
npm test         # tests (indhold, ansigtsgenerator)
npm run build    # byg til dist/
```

## Mapper

- `content/` – indholdspakken: sager, fætre, ordbog, billedmanifest (JSON). Dialog og sager rettes her uden kodeændringer.
- `content/grafik/personer.json` – parametre til ansigtsgeneratoren for hver person og alder.
- `src/grafik/` – al grafik, tegnet som SVG i kode. `stil.ts` er stilguiden (farvetokens).
- `src/grafik/ansigt/` – den parametriske ansigtsgenerator.
- `src/data/` – typer og indlæsning af indholdet.
- `tests/` – Vitest-tests.

Udgives til GitHub Pages via `.github/workflows/deploy.yml` ved push til `main`.
