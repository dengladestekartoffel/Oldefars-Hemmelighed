// Følelse: vibration og lydeffekter. Manglende lydfiler giver ingen fejl.

import manifest from '../../content/lyd/manifest.json';
import { indstillinger } from './indstillinger';

export type Vibration = 'laeg' | 'stempel' | 'side' | 'klik' | 'fastgoer' | 'forkert';

const MOENSTER: Record<Vibration, number | number[]> = {
  laeg: 12,
  stempel: [30, 40, 20],
  side: 8,
  klik: 18,
  fastgoer: [10, 30, 10],
  forkert: [15, 60, 15],
};

export function vibrer(v: Vibration): void {
  if (!indstillinger().vibration) return;
  try {
    navigator.vibrate?.(MOENSTER[v]);
  } catch {
    /* ikke understøttet */
  }
}

type LydId = keyof typeof manifest.lyde;
interface LydInfo {
  type: string;
  fil: string;
}

// Find de lydfiler, der faktisk ligger i content/lyd/
const filer = import.meta.glob('../../content/lyd/*.{mp3,ogg,m4a,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function lydUrl(id: string): string | undefined {
  const info = (manifest.lyde as Record<string, LydInfo>)[id];
  if (!info) return undefined;
  for (const [sti, url] of Object.entries(filer)) {
    if (sti.split('/').pop()!.replace(/\.[a-z0-9]+$/, '') === info.fil) return url;
  }
  return undefined;
}

let laastOp = false;
const lyde = new Map<string, HTMLAudioElement>();

/** Kaldes ved første tryk – browsere tillader først lyd efter en handling. */
export function laasLydOp(): void {
  laastOp = true;
}

export function spil(id: LydId | string): void {
  if (!laastOp) return;
  const info = (manifest.lyde as Record<string, LydInfo>)[id];
  if (!info) return;
  if (info.type === 'effekt' && !indstillinger().effekter) return;
  if (info.type === 'musik' && !indstillinger().musik) return;
  const url = lydUrl(id);
  if (!url) return;
  let a = lyde.get(id);
  if (!a) {
    a = new Audio(url);
    lyde.set(id, a);
  }
  try {
    a.currentTime = 0;
    void a.play().catch(() => undefined);
  } catch {
    /* ignorér */
  }
}

/** Typisk kombination: lyd + vibration. */
export function foel(lyd: LydId | string | null, v: Vibration | null): void {
  if (lyd) spil(lyd);
  if (v) vibrer(v);
}
