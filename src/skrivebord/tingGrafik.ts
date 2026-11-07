// Billede (data-URL) for hver ting på bordet. Tegnes én gang og gemmes,
// så skrivebordet ikke tegner SVG'er om under træk.

import { billedeUrl } from '../grafik/billeder';
import { svgTilDataUrl } from '../grafik/foto';
import * as G from '../grafik/ting';
import type { Tokens } from '../grafik/stil';
import type { Ting } from './model';

const cache = new Map<string, string>();

function noegle(t: Ting, tema: string): string {
  return `${tema}|${t.slags}|${t.w}x${t.h}|${JSON.stringify(t.data ?? {})}`;
}

function tegn(t: Ting, k: Tokens): string | undefined {
  const d = (t.data ?? {}) as Record<string, string>;
  switch (t.slags) {
    case 'mappe':
      return G.mappe(k, t.w, t.h, d.farve);
    case 'bog':
      return G.bog(k, t.w, t.h, d.farve);
    case 'ordbog':
      return G.bog(k, t.w, t.h, '#2f4a3a');
    case 'ark':
    case 'stamtraeark':
      return G.ark(k, t.w, t.h, d.stempel === 'ja');
    case 'kartotekskort':
    case 'personkort':
      return G.kartotekskort(k, t.w, t.h);
    case 'notesblok':
      return G.notesblok(k, t.w, t.h);
    case 'lup':
      return G.lup(k, t.w);
    case 'stempel':
      return G.stempel(k, t.w, t.h);
    case 'roedblyant':
      return G.roedblyant(k, t.w, t.h);
    case 'kaffekop':
      return G.kaffekop(k, t.w);
    case 'telefon':
      return G.telefon(k, t.w, t.h);
    case 'papirkurv':
      return G.papirkurv(k, t.w);
    case 'skuffe':
      return G.skuffe(k, t.w, t.h);
    case 'lampe':
      return G.lampe(k, t.w);
    case 'indbakke':
      return G.indbakke(k, t.w, t.h);
    case 'arvestykke':
      return undefined; // bruger billedet fra manifestet
    default:
      return G.ark(k, t.w, t.h);
  }
}

export function tingUrl(t: Ting, k: Tokens, tema = 'dag'): string {
  // fotos og arvestykker bruger manifestets billeder (med overstyring)
  if ((t.slags === 'foto' || t.slags === 'arvestykke') && t.data?.billede) {
    const u = billedeUrl(String(t.data.billede));
    if (u) return u;
  }
  const n = noegle(t, tema);
  let u = cache.get(n);
  if (!u) {
    const s = tegn(t, k) ?? G.ark(k, t.w, t.h);
    u = svgTilDataUrl(s);
    cache.set(n, u);
  }
  return u;
}
