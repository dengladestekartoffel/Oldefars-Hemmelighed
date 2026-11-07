// Tegninger af tingene på skrivebordet, set lige ovenfra.
// Hver funktion returnerer en komplet SVG i tingens egne enheder (w × h).
// Titler o.l. er IKKE tegnet ind – de lægges ovenpå som rigtig tekst.

import { haandtegnetFilter, papirFilter } from './foto';
import { bland, type Tokens } from './stil';

const svg = (w: number, h: number, id: string, indhold: string, defs = '', uro = 1.6) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${haandtegnetFilter(
    `${id}-h`,
    uro,
    7,
  )}${defs}</defs><g filter="url(#${id}-h)">${indhold}</g></svg>`;

const ink = (t: Tokens, w = 3) => `stroke="${t.blaek}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

export function skrivebordsplade(t: Tokens, w: number, h: number, trin = 1): string {
  const planker = 5;
  const pw = w / planker;
  const aarer: string[] = [];
  for (let i = 0; i < planker; i++) {
    const x0 = i * pw;
    const tone = bland(t.trae, i % 2 ? t.traeLys : t.traeMoerk, 0.18 + (i % 3) * 0.05);
    aarer.push(`<rect x="${x0}" y="0" width="${pw}" height="${h}" fill="${tone}"/>`);
    for (let j = 0; j < 7; j++) {
      const ax = x0 + pw * (0.12 + j * 0.12) + ((i * 13 + j * 7) % 9);
      const b = 8 + ((i + j) % 4) * 4;
      aarer.push(
        `<path d="M ${ax},0 C ${ax + b},${h * 0.25} ${ax - b},${h * 0.5} ${ax + b * 0.6},${h * 0.75} S ${ax - b * 0.4},${h} ${ax},${h}" fill="none" stroke="${t.traeAare}" stroke-width="${
          1.2 + (j % 3) * 0.6
        }" opacity="0.35"/>`,
      );
    }
    // knaster
    const ky = (h * ((i * 37) % 90)) / 100 + 60;
    aarer.push(
      `<ellipse cx="${x0 + pw * 0.6}" cy="${ky}" rx="14" ry="22" fill="none" stroke="${t.traeAare}" stroke-width="2" opacity="0.5"/><ellipse cx="${
        x0 + pw * 0.6
      }" cy="${ky}" rx="6" ry="10" fill="${t.traeMoerk}" opacity="0.4"/>`,
    );
    aarer.push(`<path d="M ${x0},0 L ${x0},${h}" stroke="${t.traeMoerk}" stroke-width="3" opacity="0.7"/>`);
  }
  const slid =
    trin === 1
      ? `<path d="M ${w * 0.3},${h * 0.4} q 40,10 90,-4 M ${w * 0.62},${h * 0.62} q 30,8 70,0" stroke="${t.traeLys}" stroke-width="4" opacity="0.5" fill="none"/><circle cx="${
          w * 0.7
        }" cy="${h * 0.3}" r="34" fill="none" stroke="${t.traeMoerk}" stroke-width="3" opacity="0.25"/>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none">
    <defs>${papirFilter('plade-stoej', 0.5)}
      <radialGradient id="plade-vignet" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.35"/></radialGradient>
    </defs>
    ${aarer.join('')}${slid}
    <rect width="${w}" height="${h}" filter="url(#plade-stoej)" opacity="0.25"/>
    <rect width="${w}" height="${h}" fill="url(#plade-vignet)"/>
    <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="18" fill="none" stroke="${t.blaek}" stroke-width="8" opacity="0.85"/>
  </svg>`;
}

/** Kontoret set ovenfra – ses rundt om bordet, når man zoomer helt ud. */
export function kontorGulv(t: Tokens, w: number, h: number, trin = 1): string {
  const brædder: string[] = [];
  for (let y = 0; y < h; y += 70) {
    const tone = bland('#8b5e3c', '#6f4a2f', ((y / 70) % 3) * 0.3);
    brædder.push(`<rect x="0" y="${y}" width="${w}" height="70" fill="${tone}"/><path d="M 0,${y} L ${w},${y}" stroke="#4a2f1c" stroke-width="3"/>`);
    for (let x = ((y / 70) % 2) * 260; x < w; x += 520) brædder.push(`<path d="M ${x},${y} L ${x},${y + 70}" stroke="#4a2f1c" stroke-width="3"/>`);
  }
  const reol = (x: number, y: number, n: number) =>
    `<rect x="${x}" y="${y}" width="${n * 70 + 20}" height="120" fill="#5b3a24" ${ink(t, 5)}/>` +
    Array.from({ length: n }, (_, i) =>
      trin >= 2 || i < 2
        ? `<rect x="${x + 14 + i * 70}" y="${y + 14}" width="58" height="92" rx="4" fill="${['#7b2f2a', '#2f4f6b', '#4f6b3a', '#8a6d3b', '#5a4a6b'][i % 5]}" ${ink(t, 3)}/>`
        : '',
    ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    ${brædder.join('')}
    <rect x="${w * 0.08}" y="${h * 0.62}" width="${w * 0.84}" height="${h * 0.3}" rx="30" fill="${trin >= 2 ? '#8e3b34' : '#7a6a58'}" opacity="0.85" ${ink(t, 5)}/>
    <rect x="${w * 0.12}" y="${h * 0.64}" width="${w * 0.76}" height="${h * 0.26}" rx="22" fill="none" stroke="#e8d3a6" stroke-width="6" stroke-dasharray="18 12" opacity="0.6"/>
    <rect x="0" y="0" width="${w}" height="${h * 0.07}" fill="#d9cdb4" ${ink(t, 6)}/>
    <rect x="${w * 0.36}" y="0" width="${w * 0.28}" height="${h * 0.07}" fill="${t.himmelBund}" ${ink(t, 6)}/>
    <path d="M ${w * 0.5},0 L ${w * 0.5},${h * 0.07}" ${ink(t, 6)}/>
    <path d="M ${w * 0.36},${h * 0.07} L ${w * 0.3},${h * 0.3} L ${w * 0.7},${h * 0.3} L ${w * 0.64},${h * 0.07} Z" fill="${t.lysFarve}" opacity="0.25"/>
    ${reol(w * 0.05, h * 0.09, trin >= 3 ? 5 : 3)}
    ${trin >= 2 ? reol(w * 0.68, h * 0.09, 4) : `<rect x="${w * 0.72}" y="${h * 0.1}" width="160" height="120" fill="#b08d5c" ${ink(t, 4)}/><rect x="${w * 0.78}" y="${h * 0.12}" width="140" height="110" fill="#c9a26b" ${ink(t, 4)}/>`}
    <circle cx="${w * 0.5}" cy="${h * 0.86}" r="${w * 0.07}" fill="#3f3f46" ${ink(t, 5)}/>
    ${trin >= 3 ? `<rect x="${w * 0.08}" y="${h * 0.4}" width="${w * 0.12}" height="${w * 0.12}" rx="24" fill="#6b4f3a" ${ink(t, 5)}/>` : ''}
  </svg>`;
}

export function mappe(t: Tokens, w = 300, h = 380, farve = '#d9a85a'): string {
  const id = 'mappe';
  return svg(
    w,
    h,
    id,
    `<rect x="18" y="14" width="${w - 40}" height="${h - 30}" rx="4" fill="${t.papir}" ${ink(t, 2)} transform="rotate(2 ${w / 2} ${h / 2})"/>
     <rect x="12" y="20" width="${w - 30}" height="${h - 32}" rx="4" fill="${t.papirMoerk}" ${ink(t, 2)} transform="rotate(-1.5 ${w / 2} ${h / 2})"/>
     <path d="M 6,40 L 6,${h - 6} L ${w - 6},${h - 6} L ${w - 6},40 L ${w * 0.62},40 L ${w * 0.56},14 L ${w * 0.2},14 L ${w * 0.15},40 Z" fill="${farve}" ${ink(t)}/>
     <path d="M 20,60 L ${w - 20},60" stroke="${bland(farve, '#000', 0.2)}" stroke-width="2"/>
     <rect x="${w * 0.18}" y="${h * 0.36}" width="${w * 0.64}" height="${h * 0.2}" rx="4" fill="${t.papir}" ${ink(t, 2)}/>
     <path d="M ${w - 40},${h - 6} q 10,-20 34,-24" fill="none" stroke="${bland(farve, '#000', 0.25)}" stroke-width="2"/>`,
  );
}

export function bog(t: Tokens, w = 280, h = 360, farve = '#6b2f2a'): string {
  const id = 'bog';
  const moerk = bland(farve, '#000', 0.3);
  return svg(
    w,
    h,
    id,
    `<rect x="14" y="10" width="${w - 20}" height="${h - 16}" rx="6" fill="${t.papir}" ${ink(t, 2)}/>
     <path d="M ${w - 8},18 L ${w - 8},${h - 12}" stroke="${t.papirKant}" stroke-width="3" stroke-dasharray="2 3"/>
     <rect x="6" y="6" width="${w - 22}" height="${h - 14}" rx="8" fill="${farve}" ${ink(t)}/>
     <rect x="6" y="6" width="34" height="${h - 14}" rx="8" fill="${moerk}" ${ink(t, 2)}/>
     <path d="M 40,${h * 0.12} L ${w - 16},${h * 0.12} M 40,${h * 0.88} L ${w - 16},${h * 0.88}" stroke="${t.messing}" stroke-width="4" opacity="0.8"/>
     <rect x="${w * 0.24}" y="${h * 0.3}" width="${w * 0.6}" height="${h * 0.24}" rx="6" fill="${t.papir}" ${ink(t, 2)}/>
     <path d="M 12,${h * 0.3} l 24,0 M 12,${h * 0.7} l 24,0" stroke="${t.messing}" stroke-width="3"/>`,
  );
}

export function ark(t: Tokens, w = 260, h = 340, medStempel = false): string {
  const id = 'ark';
  const linjer = Array.from({ length: 12 }, (_, i) => {
    const y = 70 + i * ((h - 110) / 12);
    const l = w - 50 - ((i * 37) % 60);
    return `<path d="M 26,${y} L ${l},${y}" stroke="${t.blaekBlød}" stroke-width="3" opacity="0.35" stroke-linecap="round"/>`;
  }).join('');
  return svg(
    w,
    h,
    id,
    `<path d="M 6,6 L ${w - 6},8 L ${w - 8},${h - 6} L 8,${h - 8} Z" fill="${t.papir}" ${ink(t, 2.5)}/>
     <path d="M 26,36 L ${w * 0.6},36" stroke="${t.blaek}" stroke-width="5" opacity="0.6" stroke-linecap="round"/>
     ${linjer}
     ${medStempel ? `<circle cx="${w - 60}" cy="${h - 60}" r="30" fill="none" stroke="${t.accentBlaa}" stroke-width="4" opacity="0.6"/>` : ''}`,
  );
}

export function kartotekskort(t: Tokens, w = 260, h = 160): string {
  return svg(
    w,
    h,
    'kk',
    `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="4" fill="#fbf6ea" ${ink(t, 2.5)}/>
     <path d="M 12,34 L ${w - 12},34" stroke="${t.accentRoed}" stroke-width="2.5"/>
     ${[56, 78, 100, 122, 144].filter((y) => y < h - 10).map((y) => `<path d="M 12,${y} L ${w - 12},${y}" stroke="${t.accentBlaa}" stroke-width="1.5" opacity="0.5"/>`).join('')}`,
  );
}

export function notesblok(t: Tokens, w = 240, h = 320): string {
  const spiral = Array.from({ length: 9 }, (_, i) => {
    const x = 26 + i * ((w - 52) / 8);
    return `<path d="M ${x},6 q 8,-2 8,12 q 0,10 -8,10" fill="none" stroke="#6b6b6b" stroke-width="4" stroke-linecap="round"/>`;
  }).join('');
  return svg(
    w,
    h,
    'nb',
    `<rect x="6" y="18" width="${w - 12}" height="${h - 24}" rx="6" fill="#f3e08a" ${ink(t)}/>
     <rect x="6" y="18" width="${w - 12}" height="30" rx="6" fill="#d9b44a" ${ink(t, 2)}/>
     ${Array.from({ length: 10 }, (_, i) => `<path d="M 18,${80 + i * 24} L ${w - 18},${80 + i * 24}" stroke="#a7c3d6" stroke-width="2"/>`).join('')}
     <path d="M 42,56 L 42,${h - 10}" stroke="${t.accentRoed}" stroke-width="2" opacity="0.6"/>
     ${spiral}`,
  );
}

export function lup(t: Tokens, s = 200): string {
  return svg(
    s,
    s,
    'lup',
    `<g transform="rotate(-35 ${s / 2} ${s / 2})">
       <rect x="${s / 2 - 14}" y="${s * 0.62}" width="28" height="${s * 0.36}" rx="12" fill="#5a3a24" ${ink(t)}/>
       <circle cx="${s / 2}" cy="${s * 0.36}" r="${s * 0.3}" fill="#dfeef5" fill-opacity="0.55" stroke="${t.messing}" stroke-width="12"/>
       <circle cx="${s / 2}" cy="${s * 0.36}" r="${s * 0.3}" fill="none" ${ink(t, 3)}/>
       <path d="M ${s * 0.36},${s * 0.24} a ${s * 0.18},${s * 0.18} 0 0 1 ${s * 0.14},-${s * 0.08}" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>
     </g>`,
  );
}

export function stempel(t: Tokens, w = 130, h = 160): string {
  return svg(
    w,
    h,
    'st',
    `<rect x="10" y="${h * 0.55}" width="${w - 20}" height="${h * 0.38}" rx="8" fill="#7a4b2a" ${ink(t)}/>
     <rect x="18" y="${h * 0.86}" width="${w - 36}" height="14" rx="3" fill="${t.accentRoed}" ${ink(t, 2)}/>
     <path d="M ${w / 2 - 14},${h * 0.56} L ${w / 2 - 10},${h * 0.2} L ${w / 2 + 10},${h * 0.2} L ${w / 2 + 14},${h * 0.56} Z" fill="#9a6b40" ${ink(t, 2.5)}/>
     <ellipse cx="${w / 2}" cy="${h * 0.16}" rx="30" ry="24" fill="#b0804e" ${ink(t)}/>
     <ellipse cx="${w / 2 - 8}" cy="${h * 0.12}" rx="10" ry="6" fill="#d9ad7a" opacity="0.8"/>`,
  );
}

export function roedblyant(t: Tokens, w = 320, h = 44): string {
  return svg(
    w,
    h,
    'rb',
    `<path d="M 40,8 L ${w - 20},8 L ${w - 20},${h - 8} L 40,${h - 8} Z" fill="${t.accentRoed}" ${ink(t, 2.5)}/>
     <path d="M 40,8 L 6,${h / 2} L 40,${h - 8} Z" fill="#e7c49a" ${ink(t, 2.5)}/>
     <path d="M 6,${h / 2} L 16,${h / 2 - 5} L 16,${h / 2 + 5} Z" fill="${t.accentRoed}"/>
     <path d="M 40,${h / 2} L ${w - 20},${h / 2}" stroke="${bland(t.accentRoed, '#000', 0.25)}" stroke-width="2"/>
     <rect x="${w - 22}" y="6" width="16" height="${h - 12}" rx="3" fill="${t.messing}" ${ink(t, 2)}/>`,
  );
}

export function kaffekop(t: Tokens, s = 150): string {
  const c = s / 2;
  return svg(
    s,
    s,
    'kop',
    `<circle cx="${c}" cy="${c}" r="${s * 0.46}" fill="#f2ede4" ${ink(t)}/>
     <circle cx="${c}" cy="${c}" r="${s * 0.3}" fill="#f7f3ec" ${ink(t)}/>
     <circle cx="${c}" cy="${c}" r="${s * 0.24}" fill="#5b3a26"/>
     <ellipse cx="${c - 8}" cy="${c - 8}" rx="${s * 0.08}" ry="${s * 0.05}" fill="#8a6446" opacity="0.8"/>
     <path d="M ${c + s * 0.3},${c - 8} q ${s * 0.14},0 ${s * 0.14},10 q 0,10 -${s * 0.14},10" fill="none" ${ink(t, 6)}/>
     <path d="M ${c + s * 0.3},${c - 8} q ${s * 0.14},0 ${s * 0.14},10 q 0,10 -${s * 0.14},10" fill="none" stroke="#f2ede4" stroke-width="3"/>`,
  );
}

export function telefon(t: Tokens, w = 170, h = 300): string {
  return svg(
    w,
    h,
    'tlf',
    `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="24" fill="#2b2b30" ${ink(t)}/>
     <rect x="16" y="30" width="${w - 32}" height="${h - 60}" rx="8" fill="#3d4f63"/>
     <path d="M 24,40 L ${w * 0.5},40" stroke="#9fb6cc" stroke-width="6" stroke-linecap="round" opacity="0.5"/>
     <rect x="${w / 2 - 20}" y="14" width="40" height="7" rx="3" fill="#18181b"/>`,
  );
}

export function papirkurv(t: Tokens, s = 170): string {
  const c = s / 2;
  const flet = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return `<path d="M ${c + Math.cos(a) * s * 0.3},${c + Math.sin(a) * s * 0.3} L ${c + Math.cos(a) * s * 0.46},${c + Math.sin(a) * s * 0.46}" stroke="#7a5a33" stroke-width="3"/>`;
  }).join('');
  return svg(
    s,
    s,
    'kurv',
    `<circle cx="${c}" cy="${c}" r="${s * 0.46}" fill="#c99a5b" ${ink(t)}/>${flet}
     <circle cx="${c}" cy="${c}" r="${s * 0.3}" fill="#5e4122" ${ink(t, 2.5)}/>
     <circle cx="${c}" cy="${c}" r="${s * 0.46}" fill="none" stroke="#a87b44" stroke-width="7"/>
     <circle cx="${c}" cy="${c}" r="${s * 0.46}" fill="none" ${ink(t)}/>`,
  );
}

export function skuffe(t: Tokens, w = 360, h = 80): string {
  return svg(
    w,
    h,
    'sk',
    `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="8" fill="${t.traeMoerk}" ${ink(t)}/>
     <rect x="16" y="14" width="${w - 32}" height="${h - 28}" rx="5" fill="${t.trae}" ${ink(t, 2)}/>
     <rect x="${w / 2 - 44}" y="${h / 2 - 9}" width="88" height="18" rx="9" fill="${t.messing}" ${ink(t, 2.5)}/>`,
  );
}

export function lampe(t: Tokens, s = 240): string {
  const c = s / 2;
  return svg(
    s,
    s,
    'lampe',
    `<circle cx="${c}" cy="${c}" r="${s * 0.44}" fill="#2f4a3a" ${ink(t)}/>
     <circle cx="${c}" cy="${c}" r="${s * 0.34}" fill="#3c5c49" ${ink(t, 2)}/>
     <circle cx="${c}" cy="${c}" r="${s * 0.16}" fill="${t.messing}" ${ink(t, 2.5)}/>
     <ellipse cx="${c - s * 0.12}" cy="${c - s * 0.16}" rx="${s * 0.14}" ry="${s * 0.06}" fill="#ffffff" opacity="0.25" transform="rotate(-30 ${c} ${c})"/>`,
  );
}

/** Pæren på lampen (hint). */
export function paere(t: Tokens, s = 90, taendt = false): string {
  return svg(
    s,
    s,
    'paere',
    `${taendt ? `<circle cx="${s / 2}" cy="${s * 0.42}" r="${s * 0.46}" fill="${t.accentGul}" opacity="0.35"/>` : ''}
     <path d="M ${s * 0.3},${s * 0.56} C ${s * 0.12},${s * 0.42} ${s * 0.18},${s * 0.1} ${s / 2},${s * 0.1} C ${s * 0.82},${s * 0.1} ${s * 0.88},${s * 0.42} ${s * 0.7},${s * 0.56} L ${s * 0.66},${s * 0.68} L ${s * 0.34},${s * 0.68} Z" fill="${taendt ? '#ffe9a6' : '#f6efd9'}" ${ink(t)}/>
     <rect x="${s * 0.34}" y="${s * 0.68}" width="${s * 0.32}" height="${s * 0.18}" rx="3" fill="#9a9a9a" ${ink(t, 2.5)}/>
     <path d="M ${s * 0.42},${s * 0.56} L ${s * 0.46},${s * 0.4} L ${s * 0.54},${s * 0.4} L ${s * 0.58},${s * 0.56}" fill="none" stroke="${t.blaekBlød}" stroke-width="2"/>`,
    '',
    0.8,
  );
}

export function indbakke(t: Tokens, w = 320, h = 240): string {
  return svg(
    w,
    h,
    'ind',
    `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="10" fill="#8a6a3e" ${ink(t)}/>
     <rect x="22" y="22" width="${w - 44}" height="${h - 44}" rx="6" fill="#6f532f" ${ink(t, 2)}/>
     <path d="M 22,${h - 50} L ${w - 22},${h - 50}" stroke="#5a4226" stroke-width="3"/>`,
  );
}

export function arvestykke(t: Tokens, slags: string, w = 220, h = 220): string {
  switch (slags) {
    case 'lommeur':
      return svg(
        w,
        h,
        'ur',
        `<path d="M ${w * 0.62},${h * 0.2} q 40,-30 60,10 q 10,30 -14,50" fill="none" stroke="#9a9a9a" stroke-width="5" stroke-dasharray="6 4"/>
         <circle cx="${w * 0.42}" cy="${h * 0.58}" r="${w * 0.3}" fill="#cfcfcf" ${ink(t)}/>
         <circle cx="${w * 0.42}" cy="${h * 0.58}" r="${w * 0.24}" fill="#f7f2e6" ${ink(t, 2)}/>
         <path d="M ${w * 0.42},${h * 0.58} L ${w * 0.42},${h * 0.42} M ${w * 0.42},${h * 0.58} L ${w * 0.52},${h * 0.62}" ${ink(t, 3)}/>
         <circle cx="${w * 0.42}" cy="${h * 0.24}" r="12" fill="#bdbdbd" ${ink(t, 2.5)}/>`,
      );
    case 'salmebog':
      return bog(t, w, h, '#1f1c1a');
    case 'postkort':
      return svg(w, h, 'pk', `<rect x="6" y="${h * 0.2}" width="${w - 12}" height="${h * 0.62}" rx="4" fill="#efe3c8" ${ink(t, 2.5)}/><rect x="16" y="${h * 0.26}" width="${w * 0.55}" height="${h * 0.5}" fill="#b55a3c" opacity="0.6" ${ink(t, 2)}/><path d="M ${w * 0.3},${h * 0.72} L ${w * 0.3},${h * 0.36} L ${w * 0.34},${h * 0.3} L ${w * 0.38},${h * 0.36} L ${w * 0.38},${h * 0.72}" fill="#8a3b2a" ${ink(t, 2)}/>`);
    case 'soldaterbog':
      return ark(t, w, h, true);
    default:
      return ark(t, w, h);
  }
}
