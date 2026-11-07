// Fælles SVG-byggesten: håndtegnet kant, papirstruktur og "gammelt foto".

import type { Tokens } from './stil';

/**
 * Let "håndtegnet" uro i stregerne. Bruges med måde: et filter pr. tegning.
 * Skalaen er i brugerenheder, så den følger tegningens størrelse.
 */
export function haandtegnetFilter(id: string, styrke = 2.2, seed = 3): string {
  return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}" result="st"/>
    <feDisplacementMap in="SourceGraphic" in2="st" scale="${styrke}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
}

/** Papirstøj, der kan lægges oven på en flade med lav opacitet. */
export function papirFilter(id: string, frekvens = 0.8): string {
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${frekvens}" numOctaves="3" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 -1.6 1.15"/>
  </filter>`;
}

/** Sepia-filter: gør farvetegningen brun og en anelse falmet. */
export function sepiaFilter(id: string): string {
  // gråtoner → brun skala fra mørk umbra til creme, en anelse falmet
  return `<filter id="${id}" color-interpolation-filters="sRGB">
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer>
      <feFuncR type="table" tableValues="0.17 0.36 0.6 0.8 0.93 0.97"/>
      <feFuncG type="table" tableValues="0.11 0.25 0.45 0.66 0.84 0.92"/>
      <feFuncB type="table" tableValues="0.07 0.15 0.3 0.47 0.68 0.8"/>
    </feComponentTransfer>
  </filter>`;
}

/** Sti for et fotopapir med lidt slidte, skæve hjørner. */
function slidtRamme(w: number, h: number, seed: number): string {
  const j = (i: number) => ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1;
  const r = 7;
  return `M ${r + j(1) * 3},${j(2) * 1.5}
    L ${w - r - j(3) * 3},${j(4) * 1.2}
    Q ${w - j(5)},${j(6)} ${w - j(7) * 1.4},${r + j(8) * 3}
    L ${w - j(9) * 1.2},${h - r - j(10) * 3}
    Q ${w - j(11)},${h - j(12)} ${w - r - j(13) * 3},${h - j(14) * 1.4}
    L ${r + j(15) * 3},${h - j(16)}
    Q ${j(17)},${h - j(18)} ${j(19) * 1.4},${h - r - j(20) * 3}
    L ${j(21) * 1.3},${r + j(22) * 3}
    Q ${j(23)},${j(24)} ${r + j(1) * 3},${j(2) * 1.5} Z`;
}

export interface FotoValg {
  /** Bredde og højde af selve billedet (uden kant). */
  w: number;
  h: number;
  /** Hvid kant rundt om billedet. */
  kant?: number;
  seed?: number;
  /** Indhold er allerede i sepia (fx tegnet direkte i brune toner). */
  udenSepia?: boolean;
  tokens: Tokens;
  id: string;
  /** Lag oven på fotoet, uden sepia (fx et udklippet hul). Koordinater er inden for billedet. */
  overlag?: string;
}

/**
 * Pakker en tegning ind som et gammelt foto: sepia, falmet, vignet, korn
 * og fotopapir med slidte hjørner. Returnerer en komplet <svg>.
 */
export function somFoto(defs: string, indhold: string, v: FotoValg): string {
  const k = v.kant ?? Math.round(Math.min(v.w, v.h) * 0.06);
  const W = v.w + 2 * k;
  const H = v.h + 2 * k;
  const id = v.id;
  const seed = v.seed ?? 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    ${defs}
    ${sepiaFilter(`${id}-sepia`)}
    ${papirFilter(`${id}-korn`, 0.9)}
    ${haandtegnetFilter(`${id}-haand`, 2, seed)}
    <radialGradient id="${id}-vignet" cx="50%" cy="45%" r="75%">
      <stop offset="60%" stop-color="#6b4a2c" stop-opacity="0"/>
      <stop offset="88%" stop-color="#6b4a2c" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#4e3826" stop-opacity="0.6"/>
    </radialGradient>
    <clipPath id="${id}-billede"><rect x="${k}" y="${k}" width="${v.w}" height="${v.h}" rx="2"/></clipPath>
  </defs>
  <path d="${slidtRamme(W, H, seed)}" fill="#efe3c8" stroke="#b79d74" stroke-width="1.2"/>
  <g clip-path="url(#${id}-billede)">
    <g transform="translate(${k},${k})" ${v.udenSepia ? '' : `filter="url(#${id}-sepia)"`}>
      <g filter="url(#${id}-haand)">${indhold}</g>
    </g>
    <rect x="${k}" y="${k}" width="${v.w}" height="${v.h}" fill="url(#${id}-vignet)"/>
    <rect x="${k}" y="${k}" width="${v.w}" height="${v.h}" filter="url(#${id}-korn)" opacity="0.35"/>
  </g>
  <rect x="${k}" y="${k}" width="${v.w}" height="${v.h}" rx="2" fill="none" stroke="#8a6646" stroke-width="0.8" opacity="0.6"/>
  ${v.overlag ? `<g transform="translate(${k},${k})">${v.overlag}</g>` : ''}
  <path d="M ${W * 0.7},${H - 2} q ${W * 0.08},-${k * 0.4} ${W * 0.22},-${k * 0.2}" stroke="#d6c39e" stroke-width="1" fill="none"/>
</svg>`;
}

/** Pakker en tegning ind i en almindelig (farve) SVG med håndtegnet kant. */
export function somTegning(defs: string, indhold: string, w: number, h: number, id: string, seed = 2): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>${defs}${haandtegnetFilter(`${id}-haand`, 2.2, seed)}</defs>
  <g filter="url(#${id}-haand)">${indhold}</g>
</svg>`;
}

/** Gør en SVG-tekst til en data-URL, der kan bruges i <img> eller på canvas. */
export function svgTilDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
