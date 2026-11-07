import type { HaarFarve, HudTone } from '../stil';

export type AnsigtsForm = 'rund' | 'oval' | 'smal' | 'kantet';
export type OereType = 'smaa' | 'normale' | 'udstaaende';
export type OejeType = 'runde' | 'mandel' | 'smalle';
export type BrynType = 'tynde' | 'normale' | 'kraftige';
/** Arrets placering. 'venstre_bryn' = personens EGET venstre øjenbryn = til HØJRE i billedet. */
export type ArPlacering = 'venstre_bryn' | 'hoejre_bryn' | 'overlaebe' | 'kind';
export type NaeseType = 'lille' | 'lige' | 'stor' | 'krum';
export type MundType = 'smal' | 'normal' | 'fyldig';
export type Frisure =
  | 'kort'
  | 'kortklippet'
  | 'sideskilning'
  | 'midterskilning'
  | 'pjusket'
  | 'boelget'
  | 'kroellet'
  | 'langt'
  | 'knold'
  | 'tyndt'
  | 'pagehaar';
export type Skaeg = 'ingen' | 'overskaeg' | 'kraftigt_overskaeg' | 'kort_skaeg' | 'fuldskaeg';
export type Briller = 'runde' | 'firkantede' | null;
export type Udtryk = 'neutral' | 'glad' | 'overrasket' | 'taenker' | 'bekymret' | 'griner';
export const UDTRYK: Udtryk[] = ['neutral', 'glad', 'overrasket', 'taenker', 'bekymret', 'griner'];

export type Toej =
  | 'bondetoej_mand'
  | 'bondetoej_kvinde'
  | 'soendagstoej_mand'
  | 'soendagstoej_kvinde'
  | 'feltgraa'
  | 'jakkesaet'
  | 'brudekjole'
  | 'toej_1940_mand'
  | 'toej_1940_kvinde'
  | 'strik'
  | 'flannel'
  | 'hoodie'
  | 'fløjlsjakke'
  | 'vest_polo'
  | 'cardigan'
  | 'denim'
  | 'tweed'
  | 'smedeforklaede';

export type Hovedbeklaedning = 'feltmuetze' | 'toerklaede' | 'sloer' | null;

export interface AnsigtParam {
  koen: 'mand' | 'kvinde';
  alder: number;
  form: AnsigtsForm;
  kloeft: boolean;
  oerer: OereType;
  oejne: OejeType;
  oejenfarve?: string;
  bryn: BrynType;
  ar: ArPlacering | null;
  naese: NaeseType;
  mund: MundType;
  haarfarve: HaarFarve;
  frisure: Frisure;
  /** 0 = fuldt hår, 1 = skaldet. Vokser ikke automatisk med alderen. */
  skaldethed: number;
  skaeg: Skaeg;
  skaegfarve?: HaarFarve;
  briller: Briller;
  /** Brillekæde (fx Bodil). */
  brillekaede?: boolean;
  /** Læsebriller skubbet op i panden (fx Karl Erik). */
  brillerPaaPanden?: boolean;
  /** Farvet hår gråner ikke med alderen. */
  farvetHaar?: boolean;
  hud: HudTone;
  /** Fregner – en lille ekstra variation. */
  fregner?: boolean;
  toej: Toej;
  toejFarve?: string;
  hovedbeklaedning: Hovedbeklaedning;
  udtryk: Udtryk;
  /** Hovedets hældning i grader (positiv = med uret). Giver liv. */
  haeldning?: number;
  /** Hvor personen kigger hen: -1 venstre i billedet, 0 lige ud, 1 højre. */
  blik?: number;
  /** Baggrundsfarve til portrætter. */
  baggrund?: string;
  /** Ting i hånden (kun til portrætter). */
  rekvisit?: 'kaffekop' | 'mappe' | 'bibel' | 'kasse' | 'baby' | 'buket' | null;
}

/** Sådan står en person i content/grafik/personer.json. */
export interface PersonDefinition {
  navn: string;
  note?: string;
  /** Hvem personen har arvet træk fra (kun til dokumentation og test). */
  arv_fra?: string[];
  grund: AnsigtParam;
  /** Aldre/versioner. Nøglen er typisk et årstal. Værdien overskriver grundparametre. */
  aldre?: Record<string, Partial<AnsigtParam>>;
}
