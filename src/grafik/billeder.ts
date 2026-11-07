// Billeder fra manifestet: kodetegnet SVG – eller en fil i content/billeder/
// med samme id, som så bruges i stedet (overstyring uden kodeændringer).

import { manifestBillede } from '../data/indhold';
import { svgTilDataUrl } from './foto';
import { bryllupsfoto1925, gruppefoto1916 } from './fotos';
import { personFraManifest, portraetSvg } from './personer';
import { tokens as standardTokens, type Tokens } from './stil';
import { arvestykke } from './ting';

// Vite finder filerne ved bygning. Mangler mappen/filen, er listen bare tom.
const overstyringer = import.meta.glob('../../content/billeder/*.{png,svg,jpg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function overstyring(id: string): string | undefined {
  for (const [sti, url] of Object.entries(overstyringer)) {
    const navn = sti.split('/').pop()!.replace(/\.[a-z]+$/, '');
    if (navn === id) return url;
  }
  return undefined;
}

/** SVG-tekst for et billede i manifestet (uden overstyring). */
export function billedeSvg(id: string, t: Tokens = standardTokens()): string | undefined {
  switch (id) {
    case 'oldefar_bryllup_1925':
      return bryllupsfoto1925({ tokens: t });
    case 'sag4_gruppefoto_1916':
      return gruppefoto1916({ tokens: t });
    case 'arv_afklippet_foto':
      return gruppefoto1916({ tokens: t, udklippet: true });
    case 'oldefar_reference':
      return portraetSvg('oldefar', { tokens: t });
    case 'arv_lommeur':
      return arvestykke(t, 'lommeur');
    case 'arv_postkort':
      return arvestykke(t, 'postkort');
    case 'arv_salmebog':
      return arvestykke(t, 'salmebog', 200, 260);
    case 'arv_soldaterbog':
      return arvestykke(t, 'soldaterbog', 220, 280);
    case 'karen_marie_portraet':
      return portraetSvg('karen_marie', { tokens: t, foto: true });
  }
  const mb = manifestBillede(id);
  if (!mb) return undefined;
  const pv = personFraManifest(mb.tags);
  if (pv && (mb.format === 'portraet' || mb.kategori === 'karakter' || mb.kategori === 'kunde')) {
    return portraetSvg(pv.person, { version: pv.version, foto: mb.stil === 'foto', tokens: t });
  }
  return undefined;
}

const cache = new Map<string, string>();

/** URL til et billede (overstyring først, ellers kodetegnet). */
export function billedeUrl(id: string, t?: Tokens): string | undefined {
  const o = overstyring(id);
  if (o) return o;
  const n = `${id}`;
  if (!t && cache.has(n)) return cache.get(n);
  const s = billedeSvg(id, t);
  if (!s) return undefined;
  const url = svgTilDataUrl(s);
  if (!t) cache.set(n, url);
  return url;
}

/** Billedformat (bredde/højde) til at lægge et foto på bordet. */
export function billedeMaal(id: string): { w: number; h: number } {
  const mb = manifestBillede(id);
  const f = mb?.format;
  if (id === 'arv_afklippet_foto' || f === 'gruppe') return { w: 330, h: 230 };
  return { w: 200, h: 240 };
}
