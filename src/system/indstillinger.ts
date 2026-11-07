// Spillerens indstillinger. Gemmes lokalt nu og senere også i skyen sammen med resten.

export type Tekststoerrelse = 'normal' | 'stor' | 'ekstra_stor';

export interface Indstillinger {
  tekststoerrelse: Tekststoerrelse;
  hoejKontrast: boolean;
  laesevenligSkrift: boolean;
  reducerBevaegelse: boolean;
  vibration: boolean;
  dagNat: boolean;
  musik: boolean;
  effekter: boolean;
  /** Vis replikker på rigsdansk i stedet for dialekt. */
  rigsdansk: boolean;
}

export const STANDARD: Indstillinger = {
  tekststoerrelse: 'normal',
  hoejKontrast: false,
  laesevenligSkrift: false,
  reducerBevaegelse: false,
  vibration: true,
  dagNat: true,
  musik: true,
  effekter: true,
  rigsdansk: false,
};

const NOEGLE = 'oldefar:indstillinger';
type Lytter = (i: Indstillinger) => void;
const lyttere = new Set<Lytter>();

function laes(): Indstillinger {
  try {
    const r = localStorage.getItem(NOEGLE);
    if (r) return { ...STANDARD, ...JSON.parse(r) };
  } catch {
    /* ingen lager – brug standard */
  }
  return { ...STANDARD };
}

let nu: Indstillinger = typeof localStorage === 'undefined' ? { ...STANDARD } : laes();

export function indstillinger(): Indstillinger {
  return nu;
}

export function saetIndstillinger(aendring: Partial<Indstillinger>): void {
  nu = { ...nu, ...aendring };
  try {
    localStorage.setItem(NOEGLE, JSON.stringify(nu));
  } catch {
    /* ignorér */
  }
  anvendPaaSiden();
  lyttere.forEach((l) => l(nu));
}

export function lyt(l: Lytter): () => void {
  lyttere.add(l);
  return () => lyttere.delete(l);
}

/** Reducer bevægelse: spillerens valg ELLER systemets indstilling. */
export function reducerBevaegelse(): boolean {
  const sys = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return nu.reducerBevaegelse || sys;
}

/** Sætter CSS-variabler og klasser på <html>, så alle visninger følger med. */
export function anvendPaaSiden(): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  const skala = { normal: 1, stor: 1.2, ekstra_stor: 1.45 }[nu.tekststoerrelse];
  r.style.setProperty('--tekst-skala', String(skala));
  r.classList.toggle('hoej-kontrast', nu.hoejKontrast);
  r.classList.toggle('laesevenlig', nu.laesevenligSkrift);
  r.classList.toggle('reducer-bevaegelse', reducerBevaegelse());
}
