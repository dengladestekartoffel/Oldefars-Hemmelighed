// Personerne fra content/grafik/personer.json og portrætter af dem.

import personerJson from '../../content/grafik/personer.json';
import { tegnPerson } from './ansigt/tegn';
import { beskrivAnsigt } from './ansigt/traek';
import type { AnsigtParam, PersonDefinition, Udtryk } from './ansigt/typer';
import { somFoto, somTegning } from './foto';
import { tokens as standardTokens, type Tokens } from './stil';

export const personer = (personerJson as unknown as { personer: Record<string, PersonDefinition> }).personer;

/** Parametre for en person, evt. i en bestemt alder/version og med et andet udtryk. */
export function personParam(id: string, version?: string, ekstra: Partial<AnsigtParam> = {}): AnsigtParam {
  const def = personer[id];
  if (!def) throw new Error(`Ukendt person: ${id}`);
  const v = version ? def.aldre?.[version] : undefined;
  if (version && !v) throw new Error(`Ukendt version ${version} af ${id}`);
  return { ...def.grund, ...(v ?? {}), ...ekstra };
}

export interface PortraetValg {
  version?: string;
  udtryk?: Udtryk;
  /** Tegn som gammelt foto (sepia, falmet) i stedet for farvetegning. */
  foto?: boolean;
  /** Vis ensfarvet baggrund (standard: ja). */
  baggrund?: boolean;
  tokens?: Tokens;
  /** Præfiks til interne id'er. */
  id?: string;
}

/** Komplet SVG (200×240) med en person i hoved-og-skulder-portræt. */
export function portraetSvg(personId: string, valg: PortraetValg = {}): string {
  const t = valg.tokens ?? standardTokens();
  const p = personParam(personId, valg.version, valg.udtryk ? { udtryk: valg.udtryk } : {});
  return portraetFraParam(p, { ...valg, tokens: t, id: valg.id ?? `${personId}-${valg.version ?? 'g'}-${p.udtryk}` });
}

export function portraetFraParam(p: AnsigtParam, valg: PortraetValg & { id: string }): string {
  const t = valg.tokens ?? standardTokens();
  const id = valg.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const { defs, krop } = tegnPerson(p, t, id);
  const bg = valg.baggrund === false ? '' : baggrund(p, valg.foto === true);
  if (valg.foto) {
    return somFoto(defs, bg + krop, { w: 200, h: 240, tokens: t, id, seed: hashTal(id) });
  }
  return somTegning(defs, bg + krop, 200, 240, id, hashTal(id));
}

function baggrund(p: AnsigtParam, foto: boolean): string {
  if (foto) {
    // fotografens lærred: lys plet bag hovedet
    return `<defs><radialGradient id="fotobg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#d8d0c2"/><stop offset="1" stop-color="#8c8476"/></radialGradient></defs><rect width="200" height="240" fill="url(#fotobg)"/>`;
  }
  const f = p.baggrund ?? '#e7dcc6';
  return `<rect width="200" height="240" fill="${f}"/><circle cx="100" cy="112" r="84" fill="#ffffff" opacity="0.22"/>`;
}

export function hashTal(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h % 97) + 1;
}

/** Skærmlæsertekst for en person. */
export function personBeskrivelse(personId: string, version?: string): string {
  return beskrivAnsigt(personParam(personId, version), personer[personId].navn);
}

/**
 * Finder person og version for et billede i manifestet ud fra dets tags
 * (fx sag4_soldat_3 → oldefar, 1916).
 */
export function personFraManifest(tags: { person?: string; aar?: number }): { person: string; version?: string } | null {
  if (!tags.person || !personer[tags.person]) return null;
  const def = personer[tags.person];
  const v = tags.aar !== undefined && def.aldre?.[String(tags.aar)] ? String(tags.aar) : undefined;
  return { person: tags.person, version: v };
}
