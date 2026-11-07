// Skrivebordets tilstand som rene data og rene funktioner.
// Alt, der ligger på bordet, er en "ting". Funktionerne returnerer altid et
// NYT bord, så fortryd kan gemme gamle udgaver uden at kopiere i hånden.

export type Slags =
  | 'mappe'
  | 'bog'
  | 'ark'
  | 'foto'
  | 'kartotekskort'
  | 'personkort'
  | 'stamtraeark'
  | 'notesblok'
  | 'ordbog'
  | 'lup'
  | 'stempel'
  | 'roedblyant'
  | 'kaffekop'
  | 'telefon'
  | 'papirkurv'
  | 'skuffe'
  | 'lampe'
  | 'indbakke'
  | 'arvestykke'
  | 'kort'
  | 'album'
  | 'frimaerkealbum'
  | 'tidslinje'
  | 'fritspilkasse'
  | 'arkivskab';

/** Hvilken bunke en ting lægges i, når man trykker "Ryd op". */
export type Bunke = 'kilder' | 'fotos' | 'kort' | 'vaerktoej' | 'egne' | 'fast';

export interface Ting {
  id: string;
  slags: Slags;
  /** Øverste venstre hjørne i bordets enheder. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Drejning i grader. */
  rot: number;
  /** Stakkens orden – højere ligger øverst. */
  z: number;
  /** Kan ikke flyttes (lampe, skuffe, papirkurv). */
  fast?: boolean;
  /** Ligger i papirkurven. */
  kassert?: boolean;
  /** Ligger i skuffen. */
  iSkuffe?: boolean;
  /** Må smides i papirkurven (standard: ja for kilder, nej for værktøj). */
  kanKasseres?: boolean;
  /** Åbner ved tryk (standard: ja). */
  kanAabnes?: boolean;
  /** Form til skyggen. */
  form?: 'rekt' | 'rund';
  /** Rigtig tekst ovenpå grafikken (titel på bog, mappe osv.). */
  etiket?: string;
  /** Tekst til skærmlæsere. */
  beskrivelse?: string;
  bunke?: Bunke;
  /** Indhold (hvilket dokument, hvilke sider …). Skal kunne gemmes som JSON. */
  data?: Record<string, unknown>;
}

export interface Bord {
  /** Bordets størrelse i bordenheder. */
  w: number;
  h: number;
  ting: Ting[];
}

export const BORD_BREDDE = 1000;
export const BORD_HOEJDE = 1500;

/** Hvor meget af en ting der mindst skal ligge på bordet (andel af bredde/højde). */
const MINDST_PAA_BORDET = 0.7;

export function nytBord(ting: Ting[] = [], w = BORD_BREDDE, h = BORD_HOEJDE): Bord {
  return { w, h, ting: ting.map((t) => ({ ...t })) };
}

export function find(b: Bord, id: string): Ting | undefined {
  return b.ting.find((t) => t.id === id);
}

function aendr(b: Bord, id: string, fn: (t: Ting) => Ting): Bord {
  let fundet = false;
  const ting = b.ting.map((t) => {
    if (t.id !== id) return t;
    fundet = true;
    return fn(t);
  });
  return fundet ? { ...b, ting } : b;
}

export function hoejesteZ(b: Bord): number {
  return b.ting.reduce((m, t) => Math.max(m, t.z), 0);
}

/** Ting, der ligger fremme på bordet (ikke i kurv eller skuffe). */
export function fremme(b: Bord): Ting[] {
  return b.ting.filter((t) => !t.kassert && !t.iSkuffe);
}

/** Den ting, man rører ved, kommer øverst. Faste ting bliver liggende i bunden. */
export function tilTop(b: Bord, id: string): Bord {
  const t = find(b, id);
  if (!t || t.fast) return b;
  const top = hoejesteZ(b);
  if (t.z === top && b.ting.filter((x) => x.z === top).length === 1) return b;
  return aendr(b, id, (x) => ({ ...x, z: top + 1 }));
}

/** Holder en position inden for bordet, så tingen ikke forsvinder ud over kanten. */
export function klamp(b: Bord, t: Pick<Ting, 'w' | 'h'>, x: number, y: number): { x: number; y: number } {
  const udX = t.w * (1 - MINDST_PAA_BORDET);
  const udY = t.h * (1 - MINDST_PAA_BORDET);
  return {
    x: Math.min(Math.max(x, -udX), b.w - t.w + udX),
    y: Math.min(Math.max(y, -udY), b.h - t.h + udY),
  };
}

export const MAKS_DREJNING = 60;

export function klampDrejning(rot: number): number {
  return Math.max(-MAKS_DREJNING, Math.min(MAKS_DREJNING, rot));
}

export function flyt(b: Bord, id: string, x: number, y: number, rot?: number): Bord {
  return aendr(b, id, (t) => {
    if (t.fast) return t;
    const p = klamp(b, t, x, y);
    return { ...t, ...p, rot: rot === undefined ? t.rot : klampDrejning(rot) };
  });
}

export function kanKasseres(t: Ting): boolean {
  if (t.fast) return false;
  if (t.kanKasseres !== undefined) return t.kanKasseres;
  return ['ark', 'kartotekskort', 'personkort', 'foto'].includes(t.slags);
}

export function kasser(b: Bord, id: string): Bord {
  const t = find(b, id);
  if (!t || !kanKasseres(t)) return b;
  return aendr(b, id, (x) => ({ ...x, kassert: true }));
}

/** Tager en ting op af papirkurven og lægger den ved siden af kurven. */
export function hentFraKurv(b: Bord, id: string, x?: number, y?: number): Bord {
  const kurv = b.ting.find((t) => t.slags === 'papirkurv');
  const z = hoejesteZ(b) + 1;
  return aendr(b, id, (t) => {
    const nx = x ?? (kurv ? kurv.x - t.w - 20 : b.w / 2 - t.w / 2);
    const ny = y ?? (kurv ? kurv.y - t.h * 0.4 : b.h / 2 - t.h / 2);
    return { ...t, kassert: false, z, ...klamp(b, t, nx, ny) };
  });
}

export function lagISkuffe(b: Bord, id: string): Bord {
  const t = find(b, id);
  if (!t || t.fast) return b;
  return aendr(b, id, (x) => ({ ...x, iSkuffe: true }));
}

/** Tager en ting op af skuffen og lægger den lige over skuffen. */
export function tagFraSkuffe(b: Bord, id: string): Bord {
  const skuffe = b.ting.find((t) => t.slags === 'skuffe');
  const z = hoejesteZ(b) + 1;
  return aendr(b, id, (t) => {
    const nx = skuffe ? skuffe.x + skuffe.w / 2 - t.w / 2 : b.w / 2 - t.w / 2;
    const ny = skuffe ? skuffe.y - t.h - 30 : b.h / 2;
    return { ...t, iSkuffe: false, z, rot: -3, ...klamp(b, t, nx, ny) };
  });
}

/** Lægger en ny ting på bordet (fx et ark taget ud af en mappe). */
export function tilfoej(b: Bord, t: Ting): Bord {
  const z = hoejesteZ(b) + 1;
  return { ...b, ting: [...b.ting, { ...t, z, ...klamp(b, t, t.x, t.y) }] };
}

export function fjern(b: Bord, id: string): Bord {
  return { ...b, ting: b.ting.filter((t) => t.id !== id) };
}

export function saetData(b: Bord, id: string, data: Record<string, unknown>): Bord {
  return aendr(b, id, (t) => ({ ...t, data: { ...(t.data ?? {}), ...data } }));
}

export function bunkeFor(t: Ting): Bunke {
  if (t.bunke) return t.bunke;
  if (t.fast) return 'fast';
  switch (t.slags) {
    case 'mappe':
    case 'bog':
    case 'ark':
    case 'stamtraeark':
      return 'kilder';
    case 'foto':
    case 'album':
    case 'frimaerkealbum':
      return 'fotos';
    case 'kartotekskort':
    case 'personkort':
      return 'kort';
    case 'lup':
    case 'stempel':
    case 'roedblyant':
      return 'vaerktoej';
    default:
      return 'egne';
  }
}

/** Hvor hver bunke lægges, i andele af bordets bredde/højde. */
const BUNKE_STED: Record<Exclude<Bunke, 'fast'>, { x: number; y: number; retning: 'ned' | 'hoejre' }> = {
  kilder: { x: 0.06, y: 0.22, retning: 'ned' },
  fotos: { x: 0.52, y: 0.22, retning: 'ned' },
  kort: { x: 0.52, y: 0.5, retning: 'hoejre' },
  vaerktoej: { x: 0.06, y: 0.74, retning: 'hoejre' },
  egne: { x: 0.52, y: 0.72, retning: 'hoejre' },
};

/**
 * Lægger alle løse ting pænt i bunker igen. Rækkefølgen inden for en bunke
 * følger den nuværende stak, så det øverste stadig ligger øverst.
 */
export function rydOp(b: Bord): Bord {
  const grupper = new Map<Bunke, Ting[]>();
  for (const t of [...fremme(b)].sort((a, c) => a.z - c.z)) {
    const g = bunkeFor(t);
    if (g === 'fast') continue;
    grupper.set(g, [...(grupper.get(g) ?? []), t]);
  }
  const nye = new Map<string, Partial<Ting>>();
  let z = 1;
  for (const [g, liste] of grupper) {
    const sted = BUNKE_STED[g as Exclude<Bunke, 'fast'>];
    let x = sted.x * b.w;
    const y = sted.y * b.h;
    liste.forEach((t, i) => {
      const forskud = sted.retning === 'ned' ? { dx: 8, dy: 10 } : { dx: 0, dy: 0 };
      const tx = sted.retning === 'hoejre' ? x : x + i * forskud.dx;
      const ty = sted.retning === 'hoejre' ? y : y + i * forskud.dy;
      const rot = ((i * 37) % 5) - 2; // lidt skævt, som rigtige bunker
      nye.set(t.id, { ...klamp(b, t, tx, ty), rot, z: z++ });
      if (sted.retning === 'hoejre') x += t.w + 16;
    });
  }
  return { ...b, ting: b.ting.map((t) => (nye.has(t.id) ? { ...t, ...nye.get(t.id)! } : t)) };
}

/** Er punktet (i bordenheder) inden for tingens (udrejede) rektangel? */
export function indeholder(t: Ting, px: number, py: number): boolean {
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const a = (-t.rot * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= t.w / 2 && Math.abs(ly) <= t.h / 2;
}

/** Øverste ting under et punkt. */
export function tingVed(b: Bord, px: number, py: number, undtagen?: string): Ting | undefined {
  return fremme(b)
    .filter((t) => t.id !== undtagen && indeholder(t, px, py))
    .sort((a, c) => c.z - a.z)[0];
}
