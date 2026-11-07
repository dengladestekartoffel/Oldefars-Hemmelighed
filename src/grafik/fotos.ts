// Sammensatte fotos: gruppefotoet fra Ballum 1916 og bryllupsfotoet fra Ribe 1925.

import { tegnPerson } from './ansigt/tegn';
import { geometri } from './ansigt/tegn';
import { somFoto } from './foto';
import { personParam } from './personer';
import { tokens as standardTokens, type Tokens } from './stil';

/** Soldaterne i den rækkefølge, sag 4 angiver (plads 1–6 fra venstre). */
export const SOLDATER_1916: { plads: number; person: string; version?: string }[] = [
  { plads: 1, person: 'nis_petersen' },
  { plads: 2, person: 'joergen_nissen' },
  { plads: 3, person: 'oldefar', version: '1916' },
  { plads: 4, person: 'christian_jessen' },
  { plads: 5, person: 'hp_lorenzen' },
  { plads: 6, person: 'andreas_schmidt' },
];

const GRUPPE = { w: 600, h: 400, skala: 0.86, ty: 96, afstand: 97, x0: 58 };
const LOEFT = [4, -2, 6, 0, -4, 2];

/** Hvor plads n's ansigt sidder i gruppefotoet (til det udklippede hul og til luppen). */
export function gruppeAnsigt(plads: number): { cx: number; cy: number; rx: number; ry: number } {
  const i = plads - 1;
  const { person, version } = SOLDATER_1916[i];
  const g = geometri(personParam(person, version));
  const s = GRUPPE.skala;
  const ox = GRUPPE.x0 + i * GRUPPE.afstand - 100 * s;
  const oy = GRUPPE.ty + LOEFT[i];
  return {
    cx: ox + 100 * s,
    cy: oy + ((g.top + g.chinY) / 2) * s,
    rx: (g.hw + 6) * s,
    ry: ((g.chinY - g.top) / 2 + 8) * s,
  };
}

function kirkemur(): string {
  const sten: string[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 9; c++) {
      const x = c * 70 + (r % 2) * 35 - 20;
      const y = 318 + r * 26;
      sten.push(`<rect x="${x}" y="${y}" width="66" height="23" rx="8" fill="#b9b2a4" stroke="#6f675b" stroke-width="1.4"/>`);
    }
  }
  return `<rect width="600" height="400" fill="#e9e3d4"/>
    <path d="M 0,40 L 600,52" stroke="#d3cab6" stroke-width="2"/>
    <path d="M 274,140 L 274,62 A 26,26 0 0 1 326,62 L 326,140 Z" fill="#d6cdb8" stroke="#7d7464" stroke-width="2.4"/>
    <path d="M 284,136 L 284,64 A 16,16 0 0 1 316,64 L 316,136 Z" fill="#5f594f" stroke="#3f3a33" stroke-width="2"/>
    <path d="M 300,50 L 300,136 M 284,94 L 316,94" stroke="#8a8272" stroke-width="2"/>
    <path d="M 60,20 q 20,30 0,60 M 300,60 q 10,14 4,30" fill="none" stroke="#cfc6b1" stroke-width="1.6"/>
    ${sten.join('')}
    <rect y="384" width="600" height="16" fill="#8f9a6a"/>`;
}

export interface GruppeValg {
  tokens?: Tokens;
  /** Klip plads 3 ud (JP's arvestykke). Hullet viser, hvad der ligger bagved. */
  udklippet?: boolean;
  bagved?: string;
  id?: string;
}

export function gruppefoto1916(valg: GruppeValg = {}): string {
  const t = valg.tokens ?? standardTokens();
  const id = valg.id ?? (valg.udklippet ? 'gruppe1916x' : 'gruppe1916');
  const defs: string[] = [];
  const figurer: string[] = [];
  SOLDATER_1916.forEach(({ person, version }, i) => {
    const p = personParam(person, version);
    const tg = tegnPerson(p, t, `${id}-s${i + 1}`);
    defs.push(tg.defs);
    const s = GRUPPE.skala;
    const x = GRUPPE.x0 + i * GRUPPE.afstand - 100 * s;
    const y = GRUPPE.ty + LOEFT[i];
    figurer.push(`<g transform="translate(${x},${y}) scale(${s})" data-plads="${i + 1}">${tg.krop}</g>`);
  });
  // tegn yderst først, så de midterste overlapper naturligt
  const orden = [0, 5, 1, 4, 2, 3];
  const indhold = kirkemur() + orden.map((i) => figurer[i]).join('');
  let overlag = '';
  if (valg.udklippet) {
    const a = gruppeAnsigt(3);
    const bag = valg.bagved ?? '#a86f42';
    overlag = `<ellipse cx="${a.cx}" cy="${a.cy}" rx="${a.rx}" ry="${a.ry}" fill="${bag}" stroke="#7a5a3a" stroke-width="2"/>
      <path d="M ${a.cx - a.rx + 3},${a.cy - 4} A ${a.rx - 3},${a.ry - 3} 0 0 1 ${a.cx + a.rx - 3},${a.cy - 4}" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="5"/>
      <ellipse cx="${a.cx}" cy="${a.cy}" rx="${a.rx + 1}" ry="${a.ry + 1}" fill="none" stroke="#f3e6c8" stroke-width="1.2"/>`;
  }
  return somFoto(defs.join(''), indhold, { w: GRUPPE.w, h: GRUPPE.h, tokens: t, id, seed: 16, overlag });
}

function atelier(): string {
  return `<defs><linearGradient id="atelier-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9b3a6"/><stop offset="1" stop-color="#8f897d"/></linearGradient></defs>
    <rect width="600" height="400" fill="url(#atelier-bg)"/>
    <path d="M 0,120 Q 150,60 300,110 T 600,90" fill="none" stroke="#a7a093" stroke-width="18" opacity="0.6"/>
    <g>
      <rect x="40" y="70" width="62" height="300" fill="#ddd6c6" stroke="#5c564c" stroke-width="2.4"/>
      <rect x="30" y="50" width="82" height="24" fill="#e6dfcf" stroke="#5c564c" stroke-width="2.4"/>
      <rect x="30" y="360" width="82" height="24" fill="#e6dfcf" stroke="#5c564c" stroke-width="2.4"/>
      <path d="M 56,80 L 56,356 M 72,80 L 72,356 M 88,80 L 88,356" stroke="#b8b0a0" stroke-width="2"/>
    </g>
    <path d="M 520,0 Q 500,120 540,260 Q 560,330 530,400 L 600,400 L 600,0 Z" fill="#6c5a4a" stroke="#3e3329" stroke-width="2.4"/>
    <path d="M 548,20 Q 530,140 566,280 M 572,40 Q 560,160 586,300" fill="none" stroke="#4f4135" stroke-width="2"/>
    <rect y="372" width="600" height="28" fill="#7d6e5c"/>`;
}

export function bryllupsfoto1925(valg: { tokens?: Tokens; id?: string } = {}): string {
  const t = valg.tokens ?? standardTokens();
  const id = valg.id ?? 'bryllup1925';
  const brudgom = tegnPerson(personParam('oldefar', '1925'), t, `${id}-gom`);
  const brud = tegnPerson(personParam('karen_marie', '1925_bryllup'), t, `${id}-brud`);
  const s = 1.12;
  const indhold =
    atelier() +
    `<g transform="translate(${370 - 100 * s},${48}) scale(${s})" data-person-rolle="brud">${brud.krop}</g>` +
    `<g transform="translate(${225 - 100 * s},${28}) scale(${s})" data-person-rolle="brudgom">${brudgom.krop}</g>`;
  return somFoto(brudgom.defs + brud.defs, indhold, { w: 600, h: 400, tokens: t, id, seed: 25 });
}
