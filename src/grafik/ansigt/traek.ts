// Oversættelse mellem ansigtsparametre og de træk, sagerne taler om
// (fx "kløft i hagen", "ar gennem venstre øjenbryn"), plus en tekst til skærmlæsere.

import { LYSE_HAARFARVER, MOERKE_HAARFARVER, type HaarFarve } from '../stil';
import type { AnsigtParam } from './typer';

/** Hårfarve efter alder (grånende hår). Arvelige træk ændres aldrig. */
export function effektivHaarfarve(farve: HaarFarve, alder: number, farvet = false): { farve: HaarFarve; graa: number } {
  if (farvet) return { farve, graa: 0 };
  if (farve === 'graa' || farve === 'hvid') return { farve, graa: 0 };
  if (alder >= 72) return { farve: 'hvid', graa: 0 };
  if (alder >= 60) return { farve: 'graa', graa: 0 };
  if (alder >= 44) return { farve, graa: Math.min(0.65, (alder - 42) / 26) };
  return { farve, graa: 0 };
}

/** De træk, en tegnet person viser – med samme ordlyd som i sagerne. */
export function traekFraParametre(p: AnsigtParam): string[] {
  const t: string[] = [];
  if (p.kloeft) t.push('kløft i hagen');
  if (p.oerer === 'udstaaende') t.push('udstående ører');
  if (p.oerer === 'smaa') t.push('små ører');
  const haar = effektivHaarfarve(p.haarfarve, p.alder, p.farvetHaar);
  if (p.skaldethed < 0.9) {
    if (LYSE_HAARFARVER.includes(haar.farve) && haar.graa < 0.5) t.push('lyst hår');
    if (MOERKE_HAARFARVER.includes(haar.farve) && haar.graa < 0.5) t.push('mørkt hår');
    if (haar.farve === 'graa' || haar.graa >= 0.5) t.push('gråt hår');
    if (haar.farve === 'hvid') t.push('hvidt hår');
  }
  if (p.ar === 'venstre_bryn') t.push('ar gennem venstre øjenbryn');
  if (p.ar === 'hoejre_bryn') t.push('ar gennem højre øjenbryn');
  if (p.ar === 'overlaebe') t.push('ar over overlæben');
  if (p.ar === 'kind') t.push('ar på kinden');
  const harOverskaeg = p.skaeg !== 'ingen';
  if (harOverskaeg) {
    if (p.skaeg === 'overskaeg' || p.skaeg === 'kraftigt_overskaeg') t.push('overskæg');
    if (p.skaeg === 'kort_skaeg' || p.skaeg === 'fuldskaeg') t.push('skæg', 'overskæg');
    const sf = effektivHaarfarve(p.skaegfarve ?? p.haarfarve, p.alder).farve;
    if (MOERKE_HAARFARVER.includes(sf)) t.push('mørkt overskæg');
  }
  if (p.briller === 'runde') t.push('runde briller');
  if (p.briller === 'firkantede') t.push('firkantede briller');
  if (p.form === 'smal') t.push('smalt ansigt');
  if (p.form === 'rund') t.push('rundt ansigt');
  if (p.form === 'kantet') t.push('kantet ansigt');
  return t;
}

const FORM: Record<AnsigtParam['form'], string> = {
  rund: 'rundt ansigt',
  oval: 'ovalt ansigt',
  smal: 'smalt ansigt',
  kantet: 'kantet ansigt',
};

const HAARORD: Record<HaarFarve, string> = {
  lysblond: 'lyst',
  blond: 'lyst',
  moerkblond: 'mørkblondt',
  lysbrun: 'lysebrunt',
  brun: 'brunt',
  moerkbrun: 'mørkebrunt',
  sort: 'sort',
  roed: 'rødt',
  graa: 'gråt',
  hvid: 'hvidt',
};

const TOEJ: Record<AnsigtParam['toej'], string> = {
  bondetoej_mand: 'bondetøj',
  bondetoej_kvinde: 'mørk kjole med forklæde',
  soendagstoej_mand: 'søndagstøj med høj flip',
  soendagstoej_kvinde: 'søndagskjole med høj krave',
  feltgraa: 'tysk feltgrå uniform',
  jakkesaet: 'mørkt jakkesæt',
  brudekjole: 'lys brudekjole',
  toej_1940_mand: 'skjorte og vest',
  toej_1940_kvinde: 'kjole med lille krave',
  strik: 'strikket sweater',
  flannel: 'ternet skjorte',
  hoodie: 'hættetrøje',
  fløjlsjakke: 'fløjlsjakke',
  vest_polo: 'vatteret vest',
  cardigan: 'cardigan',
  denim: 'cowboyjakke',
  tweed: 'tweedjakke',
  smedeforklaede: 'læderforklæde',
};

const UDTRYK: Record<AnsigtParam['udtryk'], string> = {
  neutral: 'roligt udtryk',
  glad: 'smiler',
  overrasket: 'ser overrasket ud',
  taenker: 'tænker',
  bekymret: 'ser bekymret ud',
  griner: 'griner',
};

/** Tekst til skærmlæsere: beskriver ansigtets træk. */
export function beskrivAnsigt(p: AnsigtParam, navn?: string): string {
  const dele: string[] = [];
  const hvem = p.koen === 'mand' ? (p.alder < 30 ? 'Ung mand' : 'Mand') : p.alder < 30 ? 'Ung kvinde' : 'Kvinde';
  dele.push(`${navn ? navn + ': ' : ''}${hvem}, ca. ${p.alder} år`);
  dele.push(FORM[p.form]);
  const haar = effektivHaarfarve(p.haarfarve, p.alder, p.farvetHaar);
  if (p.skaldethed >= 0.9) dele.push('skaldet');
  else dele.push(`${HAARORD[haar.farve]} hår${haar.graa > 0.3 ? ', grånende' : ''}`);
  const traek = traekFraParametre(p).filter(
    (t) => !['lyst hår', 'mørkt hår', 'gråt hår', 'hvidt hår', 'smalt ansigt', 'rundt ansigt', 'kantet ansigt'].includes(t),
  );
  dele.push(...traek);
  if (p.skaeg === 'ingen' && p.koen === 'mand') dele.push('glatbarberet');
  if (p.hovedbeklaedning === 'feltmuetze') dele.push('rund soldaterkasket');
  if (p.hovedbeklaedning === 'toerklaede') dele.push('tørklæde');
  if (p.hovedbeklaedning === 'sloer') dele.push('brudeslør');
  dele.push(TOEJ[p.toej]);
  dele.push(UDTRYK[p.udtryk]);
  const s = dele.join(', ') + '.';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
