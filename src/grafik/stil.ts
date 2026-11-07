// Stilguide i kode: farvetokens, stregtykkelser og skygger.
// Dag/nat og høj kontrast skifter TOKENS – aldrig tegningerne.

export type Lys = 'morgen' | 'dag' | 'eftermiddag' | 'aften';

export interface Tokens {
  // papir og blæk
  papir: string;
  papirMoerk: string;
  papirKant: string;
  blaek: string;
  blaekBlød: string;
  blyant: string;
  roedBlyant: string;
  // træ (skrivebord, møbler)
  trae: string;
  traeLys: string;
  traeMoerk: string;
  traeAare: string;
  // sepia-skala til gamle fotos (lys → mørk)
  sepia: [string, string, string, string, string];
  // accenter
  accentRoed: string;
  accentGroen: string;
  accentBlaa: string;
  accentGul: string;
  messing: string;
  // lys
  lysFarve: string;
  lysStyrke: number; // 0..1 hvor kraftig lampens kegle er
  skygge: string;
  himmelTop: string;
  himmelBund: string;
  // tekst-papir (dokumenter)
  tekstPapir: string;
  tekstFarve: string;
  teksturStyrke: number; // 0..1 papirstøj bag tekst
}

/** Hudtoner. Navnene bruges i personer.json. */
export const HUD = {
  lys: { flade: '#f6d6bd', skygge: '#e3b597', kind: '#efa9a0' },
  lys_rosa: { flade: '#f7cfbf', skygge: '#e5ab98', kind: '#f19c95' },
  lys_varm: { flade: '#f1c8a2', skygge: '#d9a57d', kind: '#e8977f' },
  mellem: { flade: '#d9a479', skygge: '#bb845a', kind: '#cf7f63' },
  vejrbidt: { flade: '#e6b68f', skygge: '#c9926a', kind: '#dc8a70' },
  brun: { flade: '#9c6644', skygge: '#7f4f33', kind: '#9a5640' },
} as const;
export type HudTone = keyof typeof HUD;

/** Hårfarver. 'graa' og 'hvid' bruges også automatisk, når en person ældes. */
export const HAAR = {
  lysblond: { flade: '#f0d48a', skygge: '#cfa95a' },
  blond: { flade: '#dcb56a', skygge: '#b48c43' },
  moerkblond: { flade: '#b98e55', skygge: '#8f6a39' },
  lysbrun: { flade: '#9a6b3f', skygge: '#744d2a' },
  brun: { flade: '#6f4a2c', skygge: '#4f331d' },
  moerkbrun: { flade: '#4a3020', skygge: '#311f14' },
  sort: { flade: '#2f2622', skygge: '#1c1613' },
  roed: { flade: '#b5582e', skygge: '#8b3f1e' },
  graa: { flade: '#a9a39b', skygge: '#837d75' },
  hvid: { flade: '#ece8e1', skygge: '#c8c2b9' },
} as const;
export type HaarFarve = keyof typeof HAAR;

/** Hår, der tæller som "lyst" i sagernes træklister. */
export const LYSE_HAARFARVER: HaarFarve[] = ['lysblond', 'blond'];
export const MOERKE_HAARFARVER: HaarFarve[] = ['brun', 'moerkbrun', 'sort', 'lysbrun'];

/** Stregtykkelser (i viewBox-enheder for et 200×240 portræt). */
export const STREG = {
  kontur: 2.6,
  detalje: 1.7,
  fin: 1.1,
  haarfin: 0.8,
} as const;

const DAG: Tokens = {
  papir: '#f4ead4',
  papirMoerk: '#e6d6b5',
  papirKant: '#cdb88f',
  blaek: '#2a1e16',
  blaekBlød: '#5a4636',
  blyant: '#6b6259',
  roedBlyant: '#c0392b',
  trae: '#a86f42',
  traeLys: '#c48a57',
  traeMoerk: '#7a4b2a',
  traeAare: '#8c5833',
  sepia: ['#f3e3c3', '#dcc199', '#b8946a', '#8a6646', '#4e3826'],
  accentRoed: '#c4473a',
  accentGroen: '#5d8a5a',
  accentBlaa: '#4f7896',
  accentGul: '#e8b84a',
  messing: '#c9a24a',
  lysFarve: '#fff4d6',
  lysStyrke: 0.15,
  skygge: 'rgba(40, 24, 12, 0.35)',
  himmelTop: '#9cc7e4',
  himmelBund: '#dcecf3',
  tekstPapir: '#f7efdc',
  tekstFarve: '#2a1e16',
  teksturStyrke: 0.5,
};

const LYS_JUSTERING: Record<Lys, Partial<Tokens>> = {
  morgen: {
    lysFarve: '#ffe9c4',
    lysStyrke: 0.1,
    himmelTop: '#f2c9a5',
    himmelBund: '#fbe8cf',
    skygge: 'rgba(60, 30, 20, 0.28)',
  },
  dag: {},
  eftermiddag: {
    lysFarve: '#ffd98f',
    lysStyrke: 0.25,
    himmelTop: '#e7b46b',
    himmelBund: '#f6dca8',
    trae: '#b0703d',
    skygge: 'rgba(70, 35, 10, 0.4)',
  },
  aften: {
    lysFarve: '#ffcf7a',
    lysStyrke: 0.75,
    himmelTop: '#1f2747',
    himmelBund: '#47466a',
    trae: '#7e5232',
    traeLys: '#94623c',
    traeMoerk: '#55351f',
    traeAare: '#6a4227',
    papir: '#eadcbd',
    skygge: 'rgba(15, 8, 4, 0.55)',
  },
};

const HOEJ_KONTRAST: Partial<Tokens> = {
  blaek: '#000000',
  blaekBlød: '#1e1712',
  tekstPapir: '#fffaf0',
  tekstFarve: '#000000',
  teksturStyrke: 0.05,
  papirKant: '#6b5530',
};

export interface TemaValg {
  lys: Lys;
  hoejKontrast: boolean;
}

export function tokens(valg: TemaValg = { lys: 'dag', hoejKontrast: false }): Tokens {
  return {
    ...DAG,
    ...LYS_JUSTERING[valg.lys],
    ...(valg.hoejKontrast ? HOEJ_KONTRAST : {}),
  };
}

/** Lys ud fra klokkeslæt (bruges af dag/nat). */
export function lysFraKlokken(d: Date = new Date()): Lys {
  const t = d.getHours();
  if (t >= 5 && t < 9) return 'morgen';
  if (t >= 9 && t < 15) return 'dag';
  if (t >= 15 && t < 19) return 'eftermiddag';
  return 'aften';
}

/** Blander to hex-farver; t=0 giver a, t=1 giver b. */
export function bland(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const mix = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return '#' + ((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0');
}
