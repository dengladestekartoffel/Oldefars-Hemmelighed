// Typer for indholdspakken i content/. Felterne matcher JSON-filerne 1:1,
// så dialog og sager kan rettes i datafilerne uden kodeændringer.

export type FaetterId = 'mads' | 'jp' | 'kasper' | 'soeren' | 'anders';
export const FAETTER_IDER: FaetterId[] = ['mads', 'jp', 'kasper', 'soeren', 'anders'];

/** En replik på dialekt med rigsdansk oversættelse. */
export interface Replik {
  dialekt: string;
  rigsdansk: string;
}

// ---------- familie.json ----------
export interface Familie {
  _note?: string;
  oldefar: {
    rigtigt_navn: string;
    foedt: string;
    foedested: string;
    laant_navn: string;
    laant_navn_foedt: string;
    laant_navn_foedested: string;
    laant_navn_doed: string;
    laant_navn_foraeldre: string;
    tjeneste: string;
    desertering: string;
    arvelige_traek: string[];
    kendetegn: string[];
    doed: string;
  };
  oldemor_1: { navn: string; foedt: string; gift: string; doed: string; note?: string };
  oldemor_2: { navn: string; foedt: string; gift: string };
  morfar: {
    navn: string;
    foedt: string;
    alder_2026: number;
    tilstand: string;
    arvelige_traek: string[];
  };
  moedre: { navn: string; soen: FaetterId; bor: string }[];
}

// ---------- faetre.json ----------
export interface Faetter {
  id: FaetterId;
  navn: string;
  kaldenavn?: string;
  alder: number;
  by: string;
  dialekt: string;
  mor: string;
  personlighed: string;
  arvelige_traek: string[];
  evne: { id: string; navn: string; mekanik: string; beskrivelse: string };
  arvestykke: { id: string; navn: string; beskrivelse: string; billede: string; spor: string };
  replikker: { valg: Replik; fejl: Replik[]; hint: Replik; loest: Replik };
}

// ---------- ordbog.json ----------
export interface Ordbogsord {
  ord: string;
  forklaring: string;
  sager: string[];
}

// ---------- sager ----------
export interface Raekke {
  id: string;
  felter: string[];
  skjult_spor?: string;
}

export interface Husstand {
  sted: string;
  raekker: Raekke[];
}

export interface FotoPerson {
  id: string;
  navn: string;
  traek: string[];
  plads?: number;
  billede?: string;
}

export interface TyskRaekke {
  id: string;
  tysk: string;
  dansk: string;
}

/** Et dokument i en sag. Formen afgøres af hvilke felter der findes. */
export interface Dokument {
  id: string;
  type: string;
  titel: string;
  aar?: number;
  kolonner?: string[];
  raekker?: Raekke[] | TyskRaekke[];
  husstande?: Husstand[];
  tekst?: string;
  billede?: string;
  bagside?: string;
  personer?: FotoPerson[];
  oversaettelse?: Record<string, string>;
}

export type DokumentForm = 'tabel' | 'folketaelling' | 'tekst' | 'foto' | 'tysk';

export function dokumentForm(d: Dokument): DokumentForm {
  if (d.personer) return 'foto';
  if (d.husstande) return 'folketaelling';
  if (d.raekker && d.raekker.length > 0 && 'tysk' in d.raekker[0]) return 'tysk';
  if (d.raekker) return 'tabel';
  return 'tekst';
}

interface TrinFaelles {
  id: string;
  spoergsmaal: string;
  intro?: string;
  ekstra_dokumenter?: string[];
  feedback_rigtig: string;
}

export interface VaelgRaekkeTrin extends TrinFaelles {
  type: 'vaelg_raekke';
  dokument: string;
  kandidater: string[];
  loesning: string;
  feedback_forkert: Record<string, string>;
}

export interface UdelukkelseTrin extends TrinFaelles {
  type: 'udelukkelse';
  kandidater: { id: string; kort: string }[];
  loesning: string;
  udelukkelsesgrunde: Record<string, { ledetraad: string; tekst: string }>;
}

export interface StamtraeTrin extends TrinFaelles {
  type: 'stamtrae';
  loesning: Record<string, string>;
}

export interface FotogenkendelseTrin extends TrinFaelles {
  type: 'fotogenkendelse';
  reference: { dokument: string; person: string };
  dokument: string;
  kandidater: string[];
  loesning: string;
  feedback_forkert: Record<string, string>;
  evne_note?: string;
}

export type Trin = VaelgRaekkeTrin | UdelukkelseTrin | StamtraeTrin | FotogenkendelseTrin;
export type TrinType = Trin['type'];

export interface Stamtrae {
  start: { slot: string; navn: string; foedt: string };
  slots: { id: string; titel: string; barn: string; kildetype: string }[];
  personkort: {
    id: string;
    navn: string;
    info: string;
    korrekt_slot: string | null;
    bevis?: string;
    afvisning?: string;
  }[];
}

export interface Sag {
  id: string;
  kapitel: number;
  nummer: number;
  titel: string;
  undertitel: string;
  periode: string;
  mekanikker: string[];
  kunde: {
    navn: string;
    alder?: number;
    fra?: string;
    portraet: string;
    intro: string;
    kundens_noter?: string[];
  };
  opgave?: string;
  tutorial?: { trin: number; tekst: string }[];
  startspor?: Partial<Record<FaetterId, { arvestykke: string; tekst: string }>> & { _note?: string };
  faelles_noter?: string[];
  dokumenter: Dokument[];
  ekstra_dokumenter?: Dokument[];
  stamtrae?: Stamtrae;
  trin: Trin[];
  hints: string[];
  ordbog: string[];
  afslutning?: { kunde: string; beloenning: { billede: string; tekst: string } };
  afsloering?: { tekst: string[]; cliffhanger: string; naeste_kapitel: string };
  morfar: { scene: string; erindring: string; notesblok: string };
  replikker: Record<FaetterId, { start: Replik; slut: Replik }>;
  oplaasninger: string[];
}

// ---------- billeder/manifest.json ----------
export interface ManifestBillede {
  id: string;
  kategori: string;
  stil: 'tegning' | 'foto';
  format: 'portraet' | 'genstand' | 'baggrund' | 'gruppe';
  reference: string[];
  tags: {
    person?: string;
    aar?: number;
    alder?: number;
    koen?: 'mand' | 'kvinde';
    traek?: string[];
    faetter?: FaetterId;
    sted?: string;
    trin?: number;
  };
  beskrivelse: string;
}

export interface Manifest {
  _note?: string;
  billeder: ManifestBillede[];
}
