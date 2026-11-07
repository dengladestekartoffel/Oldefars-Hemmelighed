// Indlæser indholdspakken fra content/. Vite bundler JSON-filerne, så de
// også virker offline via service workeren.

import familieJson from '../../content/data/familie.json';
import faetreJson from '../../content/data/faetre.json';
import ordbogJson from '../../content/data/ordbog.json';
import manifestJson from '../../content/billeder/manifest.json';
import sag1 from '../../content/data/sager/sag1.json';
import sag2 from '../../content/data/sager/sag2.json';
import sag3 from '../../content/data/sager/sag3.json';
import sag4 from '../../content/data/sager/sag4.json';
import type {
  Dokument,
  Faetter,
  FaetterId,
  Familie,
  Manifest,
  ManifestBillede,
  Ordbogsord,
  Sag,
} from './typer';

export const familie = familieJson as unknown as Familie;
export const faetre = (faetreJson as unknown as { faetre: Faetter[] }).faetre;
export const ordbog = (ordbogJson as unknown as { ord: Ordbogsord[] }).ord;
export const manifest = manifestJson as unknown as Manifest;
export const sager: Sag[] = [sag1, sag2, sag3, sag4] as unknown as Sag[];

export function faetter(id: FaetterId): Faetter {
  const f = faetre.find((x) => x.id === id);
  if (!f) throw new Error(`Ukendt fætter: ${id}`);
  return f;
}

export function sag(id: string): Sag {
  const s = sager.find((x) => x.id === id);
  if (!s) throw new Error(`Ukendt sag: ${id}`);
  return s;
}

/** Alle dokumenter i en sag, inkl. ekstra dokumenter, der lægges frem undervejs. */
export function alleDokumenter(s: Sag): Dokument[] {
  return [...s.dokumenter, ...(s.ekstra_dokumenter ?? [])];
}

export function dokument(s: Sag, id: string): Dokument {
  const d = alleDokumenter(s).find((x) => x.id === id);
  if (!d) throw new Error(`Ukendt dokument ${id} i ${s.id}`);
  return d;
}

export function manifestBillede(id: string): ManifestBillede | undefined {
  return manifest.billeder.find((b) => b.id === id);
}
