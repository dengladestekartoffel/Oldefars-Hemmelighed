// Den parametriske ansigtsgenerator. Returnerer SVG som tekst, så samme
// tegning kan bruges inline, som billede (data-URL), på canvas og i tests.
//
// Koordinatsystem: et portræt er 200×240. Ansigtets midte er x = 100.
// Personens VENSTRE side er til HØJRE i billedet (x > 100).

import { bland, HAAR, HUD, STREG, type Tokens } from '../stil';
import { effektivHaarfarve } from './traek';
import type { AnsigtParam } from './typer';

const r1 = (n: number) => Math.round(n * 10) / 10;
/** Formaterer et punkt. */
const P = (x: number, y: number) => `${r1(x)},${r1(y)}`;

export interface Geometri {
  cx: number;
  hw: number; // halv bredde ved kindbenene
  jw: number; // halv bredde ved kæben
  chw: number; // halv bredde af hagen
  top: number;
  chinY: number;
  eyeY: number;
  eyeDx: number;
  browY: number;
  noseY: number;
  mouthY: number;
  nw: number; // halv halsbredde
}

export function geometri(p: AnsigtParam): Geometri {
  const F = {
    oval: { hw: 39, jw: 31, chw: 13, top: 50, chinY: 172 },
    rund: { hw: 45, jw: 40, chw: 21, top: 53, chinY: 167 },
    smal: { hw: 32, jw: 24, chw: 10, top: 47, chinY: 176 },
    kantet: { hw: 41, jw: 38, chw: 19, top: 50, chinY: 171 },
  }[p.form];
  const kvinde = p.koen === 'kvinde';
  const hw = F.hw - (kvinde ? 2 : 0);
  const jw = F.jw - (kvinde ? 4 : 0);
  const chw = F.chw - (kvinde ? 3 : 0);
  // ældre ansigter hænger en smule
  const sag = p.alder > 60 ? 2 : 0;
  const chinY = F.chinY + sag;
  const eyeY = F.top + (F.chinY - F.top) * 0.47;
  return {
    cx: 100,
    hw,
    jw,
    chw,
    top: F.top,
    chinY,
    eyeY,
    eyeDx: Math.max(14, hw * 0.43),
    browY: eyeY - 12,
    noseY: eyeY + 21,
    mouthY: eyeY + 38 + sag * 0.5,
    nw: Math.max(15, jw * 0.6),
  };
}

/** Spejler en sti-funktion om x = 100, så venstre og højre side bliver ens. */
function spejl(fn: (s: 1 | -1) => string): string {
  return fn(1) + fn(-1);
}

function hovedSti(g: Geometri, p: AnsigtParam): string {
  const { cx, hw, jw, chw, top, chinY, eyeY } = g;
  const kantet = p.form === 'kantet';
  const jawY = chinY - (kantet ? 20 : 28);
  const side = (s: number) => {
    const x = (d: number) => cx + s * d;
    return [
      `C ${P(x(hw * 0.62), top)} ${P(x(hw), top + 18)} ${P(x(hw), eyeY - 8)}`,
      `C ${P(x(hw + 0.5), eyeY + 18)} ${P(x(jw + 3), jawY - 10)} ${P(x(jw), jawY)}`,
      kantet
        ? `C ${P(x(jw - 2), jawY + 10)} ${P(x(chw + 4), chinY)} ${P(x(chw * 0.4), chinY)}`
        : `C ${P(x(jw - 4), jawY + 14)} ${P(x(chw + 5), chinY)} ${P(x(chw * 0.2), chinY)}`,
    ];
  };
  const h = side(1);
  const v = side(-1);
  // venstre halvdel tegnes baglæns: vend kurverne om
  const vBaglaens = baglaensKurver(`M ${P(cx, top)} ` + v.join(' '));
  return `M ${P(cx, top)} ${h.join(' ')} L ${vBaglaens} Z`;
}

/** Vender en sti af kubiske kurver (M + C...) om, så den kan sættes efter en anden. */
function baglaensKurver(sti: string): string {
  const tal = sti.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const pts: [number, number][] = [];
  for (let i = 0; i < tal.length; i += 2) pts.push([tal[i], tal[i + 1]]);
  // pts: start, (c1,c2,end)*
  const segs: [number, number][][] = [];
  for (let i = 1; i < pts.length; i += 3) segs.push([pts[i - 1 === 0 ? 0 : i - 1], pts[i], pts[i + 1], pts[i + 2]]);
  // fix start-punkter
  for (let i = 1; i < segs.length; i++) segs[i][0] = segs[i - 1][3];
  const ud: string[] = [P(...segs[segs.length - 1][3])];
  for (let i = segs.length - 1; i >= 0; i--) {
    const [a, c1, c2] = segs[i];
    ud.push(`C ${P(...c2)} ${P(...c1)} ${P(...a)}`);
  }
  return ud.join(' ');
}

interface Farver {
  hud: (typeof HUD)[keyof typeof HUD];
  haar: { flade: string; skygge: string };
  skaeg: { flade: string; skygge: string };
  blaek: string;
  bryn: string;
}

function farver(p: AnsigtParam, t: Tokens): Farver {
  const h = effektivHaarfarve(p.haarfarve, p.alder, p.farvetHaar);
  const base = HAAR[h.farve];
  const haar = {
    flade: h.graa ? bland(base.flade, HAAR.graa.flade, h.graa) : base.flade,
    skygge: h.graa ? bland(base.skygge, HAAR.graa.skygge, h.graa) : base.skygge,
  };
  const sk = effektivHaarfarve(p.skaegfarve ?? p.haarfarve, p.alder, p.farvetHaar);
  const sb = HAAR[sk.farve];
  const skaeg = {
    flade: sk.graa ? bland(sb.flade, HAAR.graa.flade, sk.graa) : sb.flade,
    skygge: sk.graa ? bland(sb.skygge, HAAR.graa.skygge, sk.graa) : sb.skygge,
  };
  return {
    hud: HUD[p.hud],
    haar,
    skaeg,
    blaek: t.blaek,
    bryn: bland(haar.skygge, t.blaek, h.farve === 'hvid' || h.farve === 'graa' ? 0.15 : 0.35),
  };
}

const ink = (f: Farver, w: number = STREG.kontur) =>
  `stroke="${f.blaek}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------------------------------------------------------------- ører
function oerer(g: Geometri, p: AnsigtParam, f: Farver): string {
  const mål = { smaa: { w: 6, h: 21 }, normale: { w: 10, h: 26 }, udstaaende: { w: 18, h: 31 } }[p.oerer];
  const y0 = g.eyeY - 5;
  const ud = spejl((s) => {
    const hx = g.cx + s * (g.hw - 4);
    const x = (d: number) => hx + s * d;
    const ydre = `M ${P(x(0), y0 + 1)} C ${P(x(mål.w * 0.6), y0 - 7)} ${P(x(mål.w + 4), y0 - 2)} ${P(
      x(mål.w + 1),
      y0 + mål.h * 0.4,
    )} C ${P(x(mål.w), y0 + mål.h * 0.8)} ${P(x(mål.w * 0.5), y0 + mål.h + 2)} ${P(x(1), y0 + mål.h)} Z`;
    const indre = `M ${P(x(mål.w * 0.3), y0 + 4)} C ${P(x(mål.w * 0.8), y0 + 1)} ${P(x(mål.w * 0.9), y0 + mål.h * 0.45)} ${P(
      x(mål.w * 0.45),
      y0 + mål.h * 0.62,
    )}`;
    return `<path d="${ydre}" fill="${f.hud.flade}" ${ink(f)}/>
      <path d="${indre}" fill="none" stroke="${f.hud.skygge}" stroke-width="${STREG.detalje + 0.6}" stroke-linecap="round"/>
      <path d="${indre}" fill="none" ${ink(f, STREG.fin)} opacity="0.55"/>`;
  });
  return `<g data-traek="oerer-${p.oerer}">${ud}</g>`;
}

// ---------------------------------------------------------------- hår
interface HaarDele {
  bag: string;
  for: string;
}

function haar(g: Geometri, p: AnsigtParam, f: Farver, id: string): HaarDele {
  const { cx, hw, top, eyeY } = g;
  let fris = p.frisure;
  if (p.skaldethed >= 0.5 && fris !== 'kroellet') fris = 'tyndt';
  const hairY = top + 19 + p.skaldethed * 18;
  const fill = `fill="${f.haar.flade}"`;
  const tempY = eyeY - 12;
  const vol: Record<string, number> = {
    kort: 7,
    kortklippet: 4,
    sideskilning: 9,
    midterskilning: 7,
    pjusket: 11,
    boelget: 11,
    kroellet: 16,
    langt: 9,
    knold: 4,
    tyndt: 0,
    pagehaar: 9,
  };
  const v = vol[fris];
  const L = cx - hw - 2;
  const R = cx + hw + 2;
  const kuppel = `M ${P(L, tempY)} C ${P(L - 3, top - v * 0.6)} ${P(cx - hw * 0.55, top - v)} ${P(cx, top - v)} C ${P(
    cx + hw * 0.55,
    top - v,
  )} ${P(R + 3, top - v * 0.6)} ${P(R, tempY)}`;
  const glans = `<path d="M ${P(cx - hw * 0.45, top - v + 7)} Q ${P(cx - hw * 0.1, top - v + 3)} ${P(cx + hw * 0.2, top - v + 6)}" fill="none" stroke="${bland(
    f.haar.flade,
    '#ffffff',
    0.45,
  )}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`;
  const streg = (d: string, w: number = STREG.fin, op = 0.6) =>
    `<path d="${d}" fill="none" stroke="${f.haar.skygge}" stroke-width="${w + 0.4}" stroke-linecap="round" opacity="${op}"/>`;
  const data = `data-traek="haar" data-haarfarve="${p.haarfarve}"`;
  let bag = '';
  let forSti = '';
  let ekstra = '';

  switch (fris) {
    case 'kort':
    case 'kortklippet': {
      const s = fris === 'kortklippet' ? 3 : 0;
      forSti = `${kuppel} L ${P(R - 3, eyeY - 6)} C ${P(R - 5, hairY + 6)} ${P(cx + hw * 0.5, hairY - 1 + s)} ${P(cx + 4, hairY + 2 + s)} C ${P(
        cx - hw * 0.3,
        hairY - 3 + s,
      )} ${P(L + 6, hairY + 3)} ${P(L + 3, eyeY - 6)} Z`;
      ekstra = streg(`M ${P(cx + 6, hairY + 1)} q 6,-7 14,-9`) + streg(`M ${P(cx - 10, hairY)} q 4,-6 12,-8`);
      break;
    }
    case 'sideskilning': {
      const sk = cx - hw * 0.42;
      forSti = `${kuppel} L ${P(R - 3, eyeY - 6)} C ${P(R - 4, hairY + 4)} ${P(cx + hw * 0.4, hairY + 7)} ${P(cx - 2, hairY + 3)} C ${P(
        sk + 6,
        hairY,
      )} ${P(sk, hairY - 6)} ${P(sk - 1, hairY - 9)} C ${P(sk - 6, hairY - 3)} ${P(L + 6, hairY + 2)} ${P(L + 3, eyeY - 6)} Z`;
      ekstra =
        streg(`M ${P(sk - 1, hairY - 9)} Q ${P(sk + 2, top - v + 14)} ${P(sk + 4, top - v + 4)}`, STREG.detalje, 0.9) +
        streg(`M ${P(sk + 8, hairY - 4)} Q ${P(cx + 10, top - v + 10)} ${P(cx + hw * 0.7, top - v + 12)}`) +
        streg(`M ${P(cx, hairY + 1)} Q ${P(cx + 16, hairY - 10)} ${P(R - 6, hairY - 4)}`);
      break;
    }
    case 'midterskilning':
    case 'knold': {
      forSti = `${kuppel} L ${P(R - 2, eyeY - 4)} C ${P(R - 3, hairY + 8)} ${P(cx + hw * 0.45, hairY - 1)} ${P(cx, hairY - 5)} C ${P(
        cx - hw * 0.45,
        hairY - 1,
      )} ${P(L + 3, hairY + 8)} ${P(L + 2, eyeY - 4)} Z`;
      ekstra =
        streg(`M ${P(cx, hairY - 5)} L ${P(cx, top - v + 3)}`, STREG.detalje, 0.9) +
        streg(`M ${P(cx - 4, hairY - 3)} Q ${P(cx - hw * 0.5, top)} ${P(L + 4, eyeY - 14)}`) +
        streg(`M ${P(cx + 4, hairY - 3)} Q ${P(cx + hw * 0.5, top)} ${P(R - 4, eyeY - 14)}`);
      if (fris === 'knold') {
        bag = `<ellipse cx="${cx + hw * 0.55}" cy="${top + 1}" rx="15" ry="12" ${fill} ${ink(f)}/>` +
          streg(`M ${P(cx + hw * 0.45, top - 8)} q 8,4 6,16`);
      }
      break;
    }
    case 'pjusket': {
      const pigge: string[] = [];
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const x = R - 4 - ((R - L - 8) * i) / n;
        const y = hairY + (i % 2 === 0 ? 7 : -1) + (i === 0 || i === n ? -4 : 0);
        pigge.push(P(x, y));
      }
      const top2 = `M ${P(L, tempY)} C ${P(L - 6, top - v)} ${P(cx - hw * 0.6, top - v - 6)} ${P(cx - 12, top - v - 2)} L ${P(
        cx - 6,
        top - v - 10,
      )} L ${P(cx + 2, top - v - 2)} L ${P(cx + 12, top - v - 8)} L ${P(cx + 16, top - v)} C ${P(cx + hw * 0.7, top - v - 3)} ${P(
        R + 6,
        top - v * 0.5,
      )} ${P(R, tempY)}`;
      forSti = `${top2} L ${P(R - 3, eyeY - 6)} L ${pigge.join(' L ')} L ${P(L + 3, eyeY - 6)} Z`;
      ekstra = streg(`M ${P(cx - 8, hairY - 4)} l 4,-12`) + streg(`M ${P(cx + 10, hairY - 2)} l -2,-12`);
      break;
    }
    case 'boelget': {
      const b = (x: number, y: number) => P(x, y);
      forSti = `${kuppel} L ${P(R - 2, eyeY - 6)} C ${P(R, hairY + 2)} ${b(cx + hw * 0.6, hairY + 8)} ${b(cx + hw * 0.35, hairY + 2)} Q ${b(
        cx + 10,
        hairY + 9,
      )} ${b(cx - 4, hairY)} Q ${b(cx - hw * 0.4, hairY + 9)} ${b(cx - hw * 0.6, hairY + 1)} Q ${b(L + 4, hairY + 4)} ${b(
        L + 3,
        eyeY - 6,
      )} Z`;
      ekstra =
        streg(`M ${P(cx - hw * 0.5, top - v + 8)} q 8,-4 14,2 q 8,6 16,0`, STREG.detalje) +
        streg(`M ${P(cx + 4, hairY - 6)} q 8,-6 16,-2`);
      break;
    }
    case 'kroellet': {
      const krl: string[] = [];
      const ring = (x: number, y: number, r: number) =>
        krl.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" ${fill} ${ink(f, STREG.detalje)}/>`);
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * (1.08 - (1.16 * i) / n);
        ring(cx + Math.cos(a) * (hw + 5), top + 22 - Math.sin(a) * (hw * 0.7 + 8), 10);
      }
      bag = krl.join('');
      forSti = `${kuppel} L ${P(R - 2, eyeY - 8)} C ${P(R - 6, hairY + 4)} ${P(cx + 10, hairY + 2)} ${P(cx, hairY + 4)} C ${P(
        cx - 10,
        hairY + 2,
      )} ${P(L + 6, hairY + 4)} ${P(L + 2, eyeY - 8)} Z`;
      for (let i = 0; i < 5; i++) {
        const x = cx - hw * 0.6 + i * hw * 0.3;
        ekstra += `<path d="M ${P(x - 5, hairY + 2)} a 5,5 0 1 1 9,-1" fill="none" stroke="${f.haar.skygge}" stroke-width="1.6" stroke-linecap="round"/>`;
      }
      break;
    }
    case 'langt': {
      // halvlangt hår, strøget bag ørerne og ned i nakken
      bag = `<path d="M ${P(L, tempY)} C ${P(L - 3, eyeY + 18)} ${P(L, g.chinY - 14)} ${P(L + 10, g.chinY - 2)} L ${P(
        R - 10,
        g.chinY - 2,
      )} C ${P(R, g.chinY - 14)} ${P(R + 3, eyeY + 18)} ${P(R, tempY)} Z" ${fill} ${ink(f)}/>` +
        streg(`M ${P(L + 2, eyeY + 26)} q 2,14 8,22`, STREG.detalje, 0.9) +
        streg(`M ${P(R - 2, eyeY + 26)} q -2,14 -8,22`, STREG.detalje, 0.9) +
        streg(`M ${P(L + 5, eyeY + 34)} q 1,8 5,12`, STREG.fin, 0.8) +
        streg(`M ${P(R - 5, eyeY + 34)} q -1,8 -5,12`, STREG.fin, 0.8);
      forSti = `${kuppel} L ${P(R - 1, eyeY - 4)} C ${P(R - 4, hairY + 8)} ${P(cx + hw * 0.4, hairY - 2)} ${P(cx + 2, hairY - 4)} C ${P(
        cx - hw * 0.5,
        hairY + 2,
      )} ${P(L + 4, hairY + 8)} ${P(L + 1, eyeY - 4)} Z`;
      ekstra =
        streg(`M ${P(cx + 2, hairY - 4)} L ${P(cx + 4, top - v + 4)}`, STREG.detalje, 0.9) +
        streg(`M ${P(cx - 8, hairY - 2)} Q ${P(cx - hw * 0.6, top)} ${P(L + 2, eyeY - 8)}`) +
        streg(`M ${P(cx + 10, hairY - 2)} Q ${P(cx + hw * 0.6, top)} ${P(R - 2, eyeY - 8)}`);
      break;
    }
    case 'pagehaar': {
      bag = `<path d="M ${P(L - 2, tempY)} C ${P(L - 10, g.mouthY)} ${P(L - 6, g.chinY - 6)} ${P(L + 2, g.chinY - 8)} L ${P(
        R - 2,
        g.chinY - 8,
      )} C ${P(R + 6, g.chinY - 6)} ${P(R + 10, g.mouthY)} ${P(R + 2, tempY)} Z" ${fill} ${ink(f)}/>`;
      forSti = `${kuppel} L ${P(R, eyeY + 6)} C ${P(R - 4, hairY + 10)} ${P(cx + hw * 0.4, hairY - 2)} ${P(cx - hw * 0.3, hairY - 4)} C ${P(
        cx - hw * 0.6,
        hairY + 2,
      )} ${P(L + 4, hairY + 10)} ${P(L, eyeY + 6)} Z`;
      break;
    }
    case 'tyndt': {
      // skaldet isse med tynde tjavser over ørerne
      const tot = spejl((s) => {
        const x = (d: number) => cx + s * d;
        return `<path d="M ${P(x(hw + 2), eyeY - 2)} C ${P(x(hw + 6), eyeY - 14)} ${P(x(hw + 2), top + 14)} ${P(x(hw - 10), top + 8)} C ${P(
          x(hw - 6),
          top + 16,
        )} ${P(x(hw - 2), eyeY - 14)} ${P(x(hw - 3), eyeY - 4)} Z" ${fill} ${ink(f, STREG.detalje)}/>`;
      });
      const haarStraa =
        p.skaldethed < 0.85
          ? `<path d="M ${P(cx - 14, top + 4)} q 10,-10 22,-4 M ${P(cx - 6, top + 2)} q 10,-8 18,-1 M ${P(cx - 18, top + 9)} q 8,-6 14,-5" fill="none" stroke="${f.haar.skygge}" stroke-width="1.6" stroke-linecap="round"/>`
          : '';
      return {
        bag: '',
        for: `<g ${data}>${tot}${haarStraa}</g>`,
      };
    }
  }
  const forHaar = `<path d="${forSti}" ${fill} ${ink(f)}/>`;
  return {
    bag: bag ? `<g data-del="haar-bag">${bag}</g>` : '',
    for: `<g ${data} clip-path="none" id="${id}-haar">${forHaar}${glans}${ekstra}</g>`,
  };
}

// ---------------------------------------------------------------- øjne og bryn
function oejne(g: Geometri, p: AnsigtParam, f: Farver): string {
  const { cx, eyeY, eyeDx } = g;
  const st = { runde: { rx: 3.5, ry: 4.1 }, mandel: { rx: 3.7, ry: 3.4 }, smalle: { rx: 3.3, ry: 2.5 } }[p.oejne];
  const blik = (p.blik ?? 0) * 1.6;
  const lys = '#ffffff';
  const iris = p.oejenfarve ?? f.blaek;
  const ud: string[] = [];
  for (const s of [-1, 1] as const) {
    const ex = cx + s * eyeDx;
    const ey = eyeY;
    switch (p.udtryk) {
      case 'griner':
        ud.push(`<path d="M ${P(ex - 6, ey + 1.5)} Q ${P(ex, ey - 6)} ${P(ex + 6, ey + 1.5)}" fill="none" ${ink(f, STREG.detalje + 0.4)}/>`);
        break;
      case 'overrasket':
        ud.push(
          `<ellipse cx="${ex}" cy="${ey}" rx="5.8" ry="6.4" fill="${lys}" ${ink(f, STREG.detalje)}/>`,
          `<circle cx="${r1(ex + blik)}" cy="${ey}" r="2.7" fill="${iris}"/>`,
        );
        break;
      default: {
        const op = p.udtryk === 'taenker' ? -1.6 : 0;
        const dx = p.udtryk === 'taenker' ? 1.6 * (p.blik ?? 1) : blik;
        const ry = p.udtryk === 'glad' ? st.ry * 0.8 : st.ry;
        ud.push(
          `<ellipse cx="${r1(ex + dx)}" cy="${r1(ey + op)}" rx="${st.rx}" ry="${r1(ry)}" fill="${iris}"/>`,
          `<circle cx="${r1(ex + dx + 1.2)}" cy="${r1(ey + op - 1.4)}" r="1.1" fill="${lys}"/>`,
        );
        // øvre øjenlåg
        const indre = p.udtryk === 'bekymret' ? -2.2 : 0;
        const ydre = p.udtryk === 'bekymret' ? 1 : 0;
        ud.push(
          `<path d="M ${P(ex - s * 6.5, ey - 3.5 + indre)} Q ${P(ex, ey - 7.5)} ${P(ex + s * 6.5, ey - 3 + ydre)}" fill="none" ${ink(
            f,
            STREG.detalje,
          )}/>`,
        );
        if (p.udtryk === 'glad') {
          ud.push(`<path d="M ${P(ex - 5, ey + 4.5)} Q ${P(ex, ey + 2)} ${P(ex + 5, ey + 4.5)}" fill="none" ${ink(f, STREG.fin)}/>`);
        }
        if (p.koen === 'kvinde') {
          ud.push(`<path d="M ${P(ex + s * 6.5, ey - 3)} l ${s * 2.6},-2" fill="none" ${ink(f, STREG.fin + 0.3)}/>`);
        }
      }
    }
  }
  return `<g data-del="oejne">${ud.join('')}</g>`;
}

function brynLinje(g: Geometri, p: AnsigtParam, s: 1 | -1): string {
  const { cx, eyeDx, browY } = g;
  const ex = cx + s * eyeDx;
  let indre = 0;
  let ydre = 0;
  switch (p.udtryk) {
    case 'overrasket':
      indre = -5;
      ydre = -4;
      break;
    case 'bekymret':
      indre = -4;
      ydre = 1.5;
      break;
    case 'taenker':
      if (s === 1) {
        indre = -4;
        ydre = -5;
      } else {
        indre = 1;
        ydre = 0;
      }
      break;
    case 'glad':
      indre = -1;
      ydre = -1;
      break;
    case 'griner':
      indre = -2;
      ydre = -2;
      break;
  }
  return `M ${P(ex - s * 7.5, browY + 1 + indre)} Q ${P(ex + s * 1, browY - 4 + (indre + ydre) / 2)} ${P(ex + s * 9.5, browY + 1.5 + ydre)}`;
}

function bryn(g: Geometri, p: AnsigtParam, f: Farver): string {
  const w = { tynde: 2.2, normale: 3.2, kraftige: 4.6 }[p.bryn];
  const ud = ([-1, 1] as const)
    .map(
      (s) =>
        `<path d="${brynLinje(g, p, s)}" fill="none" stroke="${f.blaek}" stroke-width="${w + 1.4}" stroke-linecap="round"/>` +
        `<path d="${brynLinje(g, p, s)}" fill="none" stroke="${f.bryn}" stroke-width="${w}" stroke-linecap="round"/>`,
    )
    .join('');
  return `<g data-del="bryn">${ud}</g>`;
}

// ---------------------------------------------------------------- ar
/** Arrets linje. Eksporteres så tests kan tjekke, hvilken side det sidder i. */
export function arLinje(g: Geometri, p: AnsigtParam): { x1: number; y1: number; x2: number; y2: number } | null {
  if (!p.ar) return null;
  const { cx, eyeDx, browY, mouthY, noseY, hw } = g;
  switch (p.ar) {
    case 'venstre_bryn': {
      const x = cx + eyeDx + 2.5; // personens venstre = billedets højre
      return { x1: x - 1.5, y1: browY - 8, x2: x + 2, y2: browY + 7 };
    }
    case 'hoejre_bryn': {
      const x = cx - eyeDx - 2.5;
      return { x1: x + 1.5, y1: browY - 8, x2: x - 2, y2: browY + 7 };
    }
    case 'overlaebe':
      return { x1: cx + 5, y1: mouthY - 12, x2: cx + 8, y2: mouthY - 3 };
    case 'kind':
      return { x1: cx + hw * 0.5, y1: noseY - 6, x2: cx + hw * 0.7, y2: noseY + 6 };
  }
}

function ar(g: Geometri, p: AnsigtParam, f: Farver): string {
  const l = arLinje(g, p);
  if (!l) return '';
  const d = `M ${P(l.x1, l.y1)} L ${P(l.x2, l.y2)}`;
  // hul i øjenbrynet + lys linje med mørke kanter
  return `<g data-traek="ar" data-ar="${p.ar}" data-x1="${r1(l.x1)}" data-x2="${r1(l.x2)}">
    <path d="${d}" stroke="${f.hud.flade}" stroke-width="5" stroke-linecap="round"/>
    <path d="${d}" stroke="${f.blaek}" stroke-width="2.9" stroke-linecap="round" opacity="0.55"/>
    <path d="${d}" stroke="#fbeee4" stroke-width="1.4" stroke-linecap="round"/>
  </g>`;
}

// ---------------------------------------------------------------- næse, mund, hage
function naese(g: Geometri, p: AnsigtParam, f: Farver): string {
  const { cx, eyeY, noseY } = g;
  let d = '';
  switch (p.naese) {
    case 'lille':
      d = `M ${P(cx + 1, noseY - 6)} Q ${P(cx + 4, noseY + 1)} ${P(cx, noseY + 2)} M ${P(cx - 4, noseY + 1)} q 1,1.5 2.5,1`;
      break;
    case 'lige':
      d = `M ${P(cx + 2.5, eyeY + 3)} L ${P(cx + 4.5, noseY + 1)} Q ${P(cx + 2.5, noseY + 5.5)} ${P(cx - 2, noseY + 4)} M ${P(
        cx - 6,
        noseY + 1.5,
      )} q 1.5,3 4,2.5`;
      break;
    case 'stor':
      d = `M ${P(cx + 3, eyeY + 2)} Q ${P(cx + 7, noseY - 3)} ${P(cx + 7.5, noseY + 2)} Q ${P(cx + 6, noseY + 8)} ${P(cx, noseY + 7)} Q ${P(
        cx - 6,
        noseY + 8,
      )} ${P(cx - 7.5, noseY + 2.5)}`;
      break;
    case 'krum':
      d = `M ${P(cx + 1, eyeY + 2)} Q ${P(cx + 9, noseY - 4)} ${P(cx + 6, noseY + 4)} Q ${P(cx + 3, noseY + 7)} ${P(cx - 2, noseY + 5)} M ${P(
        cx - 6,
        noseY + 2,
      )} q 1,3 4,2.5`;
      break;
  }
  return `<path data-del="naese" d="${d}" fill="none" ${ink(f, STREG.detalje)}/>`;
}

function mund(g: Geometri, p: AnsigtParam, f: Farver): string {
  const { cx, mouthY: my } = g;
  const mw = { smal: 7, normal: 9, fyldig: 10.5 }[p.mund];
  const laebe = p.koen === 'kvinde' && p.alder < 60 ? '#c96f6a' : f.hud.skygge;
  switch (p.udtryk) {
    case 'glad':
      return `<g data-del="mund"><path d="M ${P(cx - mw - 2, my - 2)} Q ${P(cx, my + 9)} ${P(cx + mw + 2, my - 2)}" fill="none" ${ink(
        f,
        STREG.detalje + 0.3,
      )}/><path d="M ${P(cx - mw - 4, my - 3.5)} q 1.5,1 2,2.5 M ${P(cx + mw + 4, my - 3.5)} q -1.5,1 -2,2.5" fill="none" ${ink(f, STREG.fin)}/></g>`;
    case 'griner':
      return `<g data-del="mund"><path d="M ${P(cx - mw - 4, my - 3)} Q ${P(cx, my)} ${P(cx + mw + 4, my - 3)} Q ${P(cx + mw, my + 14)} ${P(
        cx,
        my + 14,
      )} Q ${P(cx - mw, my + 14)} ${P(cx - mw - 4, my - 3)} Z" fill="#6e2b25" ${ink(f, STREG.detalje)}/>
        <path d="M ${P(cx - mw - 1, my - 1.5)} Q ${P(cx, my + 1.5)} ${P(cx + mw + 1, my - 1.5)} L ${P(cx + mw - 1, my + 3)} Q ${P(cx, my + 5)} ${P(
          cx - mw + 1,
          my + 3,
        )} Z" fill="#ffffff"/>
        <path d="M ${P(cx - 5, my + 12)} Q ${P(cx, my + 7)} ${P(cx + 5, my + 12)}" fill="#d9766f"/></g>`;
    case 'overrasket':
      return `<ellipse data-del="mund" cx="${cx}" cy="${my + 2}" rx="4" ry="5.4" fill="#6e2b25" ${ink(f, STREG.detalje)}/>`;
    case 'taenker':
      return `<path data-del="mund" d="M ${P(cx - 4, my + 1)} Q ${P(cx + 3, my - 0.5)} ${P(cx + mw, my - 3)}" fill="none" ${ink(f, STREG.detalje)}/>`;
    case 'bekymret':
      return `<path data-del="mund" d="M ${P(cx - mw, my + 2)} Q ${P(cx - mw / 2, my - 2)} ${P(cx, my)} Q ${P(cx + mw / 2, my + 2)} ${P(
        cx + mw,
        my + 1,
      )}" fill="none" ${ink(f, STREG.detalje)}/>`;
    default:
      return `<g data-del="mund"><path d="M ${P(cx - mw, my)} Q ${P(cx, my + 2.5)} ${P(cx + mw, my - 0.5)}" fill="none" ${ink(
        f,
        STREG.detalje,
      )}/><path d="M ${P(cx - 4, my + 5)} Q ${P(cx, my + 7)} ${P(cx + 4, my + 5)}" fill="none" stroke="${laebe}" stroke-width="1.8" stroke-linecap="round"/></g>`;
  }
}

function kloeft(g: Geometri, p: AnsigtParam, f: Farver): string {
  if (!p.kloeft) return '';
  const { cx, chinY } = g;
  return `<g data-traek="kloeft">
    <path d="M ${P(cx - 4, chinY - 6)} Q ${P(cx, chinY - 2)} ${P(cx + 4, chinY - 6)}" fill="none" stroke="${f.hud.skygge}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M ${P(cx, chinY - 11)} Q ${P(cx - 1.3, chinY - 6)} ${P(cx, chinY - 1.5)}" fill="none" ${ink(f, STREG.detalje + 0.2)}/>
  </g>`;
}

function rynker(g: Geometri, p: AnsigtParam, f: Farver): string {
  const { cx, eyeY, eyeDx, noseY, mouthY, top, browY } = g;
  const a = p.alder;
  const linjer: string[] = [];
  const st = `fill="none" stroke="${f.blaek}" stroke-linecap="round" stroke-width="${STREG.fin}" opacity="0.5"`;
  if (a >= 32) {
    // smilerynker ved næse og mund
    for (const s of [-1, 1]) linjer.push(`<path d="M ${P(cx + s * 9, noseY + 4)} Q ${P(cx + s * 15, mouthY - 4)} ${P(cx + s * 13, mouthY + 4)}" ${st}/>`);
  }
  if (a >= 44) {
    for (const s of [-1, 1]) {
      const ex = cx + s * (eyeDx + 9);
      linjer.push(`<path d="M ${P(ex, eyeY - 2)} l ${s * 4},-2 M ${P(ex, eyeY + 1)} l ${s * 4.5},0.5" ${st}/>`);
    }
    linjer.push(`<path d="M ${P(cx - 12, browY - 9)} Q ${P(cx, browY - 12)} ${P(cx + 12, browY - 9)}" ${st}/>`);
  }
  if (a >= 62) {
    linjer.push(`<path d="M ${P(cx - 15, browY - 15)} Q ${P(cx, browY - 18)} ${P(cx + 15, browY - 15)}" ${st}/>`);
    linjer.push(`<path d="M ${P(cx - 10, top + 22)} Q ${P(cx, top + 19)} ${P(cx + 10, top + 22)}" ${st}/>`);
    for (const s of [-1, 1]) {
      const ex = cx + s * eyeDx;
      linjer.push(`<path d="M ${P(ex - 5, eyeY + 6)} Q ${P(ex, eyeY + 9)} ${P(ex + 5, eyeY + 6)}" ${st}/>`);
      linjer.push(`<path d="M ${P(cx + s * 14, mouthY + 6)} q ${s * 2},6 ${s * 1},11" ${st}/>`);
    }
  }
  return linjer.length ? `<g data-del="rynker">${linjer.join('')}</g>` : '';
}

// ---------------------------------------------------------------- skæg
function skaeg(g: Geometri, p: AnsigtParam, f: Farver): string {
  if (p.skaeg === 'ingen') return '';
  const { cx, mouthY: my, noseY, jw, chinY, hw, eyeY } = g;
  const fill = `fill="${f.skaeg.flade}"`;
  // lyse overskæg får lidt mere farve, så de ikke ligner læber
  const ofill = `fill="${bland(f.skaeg.flade, f.skaeg.skygge, 0.55)}"`;
  const overskaeg = (bred: number, tyk: number) =>
    `<path d="M ${P(cx - bred, my - 3 + tyk * 0.3)} Q ${P(cx - bred * 0.55, my - 8 - tyk)} ${P(cx, my - 7 - tyk * 0.4)} Q ${P(
      cx + bred * 0.55,
      my - 8 - tyk,
    )} ${P(cx + bred, my - 3 + tyk * 0.3)} Q ${P(cx + bred * 0.5, my - 3)} ${P(cx, my - 4)} Q ${P(cx - bred * 0.5, my - 3)} Z" ${ofill} ${ink(
      f,
      STREG.detalje,
    )}/>`;
  const data = `data-traek="skaeg-${p.skaeg}"`;
  switch (p.skaeg) {
    case 'overskaeg':
      return `<g ${data}>${overskaeg(12, 2.2)}</g>`;
    case 'kraftigt_overskaeg':
      return `<g ${data}>${overskaeg(16, 4)}<path d="M ${P(cx - 10, my - 5)} l 3,-3 M ${P(cx + 10, my - 5)} l -3,-3" fill="none" stroke="${f.skaeg.skygge}" stroke-width="1.4"/></g>`;
    case 'kort_skaeg':
    case 'fuldskaeg': {
      const fuld = p.skaeg === 'fuldskaeg';
      const ned = fuld ? 26 : 5;
      const yS = fuld ? eyeY + 4 : noseY - 2; // hvor skægget starter ved kinden
      const ind = fuld ? 6 : 7;
      const sti = `M ${P(cx - hw + 1, yS)} C ${P(cx - hw + 2, noseY + 14)} ${P(cx - jw - 2, chinY - 8)} ${P(cx - 12, chinY + ned - 2)} Q ${P(
        cx,
        chinY + ned + 4,
      )} ${P(cx + 12, chinY + ned - 2)} C ${P(cx + jw + 2, chinY - 8)} ${P(cx + hw - 2, noseY + 14)} ${P(cx + hw - 1, yS)} L ${P(
        cx + hw - ind,
        yS + 3,
      )} C ${P(cx + hw - ind - 2, noseY + 10)} ${P(cx + 16, my)} ${P(cx + 10, my + 7)} Q ${P(cx, my + 11)} ${P(cx - 10, my + 7)} C ${P(
        cx - 16,
        my,
      )} ${P(cx - hw + ind + 2, noseY + 10)} ${P(cx - hw + ind, yS + 3)} Z`;
      const tekstur =
        p.skaeg === 'fuldskaeg'
          ? `<path d="M ${P(cx - 8, chinY + 4)} q 2,8 0,14 M ${P(cx + 6, chinY + 2)} q 2,8 -1,16 M ${P(cx - 20, chinY - 8)} q 2,6 2,12" fill="none" stroke="${f.skaeg.skygge}" stroke-width="1.5" stroke-linecap="round"/>`
          : '';
      return `<g ${data}><path d="${sti}" ${fill} ${ink(f, STREG.detalje)}/>${tekstur}${overskaeg(12, 2)}</g>`;
    }
  }
}

// ---------------------------------------------------------------- briller
function briller(g: Geometri, p: AnsigtParam, f: Farver): string {
  if (!p.briller) return '';
  const { cx, eyeY, eyeDx, hw } = g;
  const y = p.brillerPaaPanden ? g.top + 12 : eyeY;
  const ram = p.brillerPaaPanden ? '#5a4636' : f.blaek;
  const st = `fill="#ffffff" fill-opacity="0.18" stroke="${ram}" stroke-width="2.2"`;
  const glas =
    p.briller === 'runde'
      ? ([-1, 1] as const).map((s) => `<circle cx="${cx + s * eyeDx}" cy="${y}" r="9" ${st}/>`).join('')
      : ([-1, 1] as const)
          .map((s) => `<rect x="${r1(cx + s * eyeDx - 11)}" y="${r1(y - 7.5)}" width="22" height="15" rx="3.5" ${st}/>`)
          .join('');
  const r = p.briller === 'runde' ? 9 : 11;
  const bro = `<path d="M ${P(cx - eyeDx + r, y - 1)} Q ${P(cx, y - 5)} ${P(cx + eyeDx - r, y - 1)}" fill="none" stroke="${ram}" stroke-width="2"/>`;
  const stang = ([-1, 1] as const)
    .map((s) => `<path d="M ${P(cx + s * (eyeDx + r), y - 1)} L ${P(cx + s * (hw - 1), y - 3)}" stroke="${ram}" stroke-width="2"/>`)
    .join('');
  const glimt = ([-1, 1] as const)
    .map((s) => `<path d="M ${P(cx + s * eyeDx - 4, y - 3)} l 3,-3" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>`)
    .join('');
  const kaede = p.brillekaede
    ? ([-1, 1] as const)
        .map(
          (s) =>
            `<path d="M ${P(cx + s * (hw - 1), y - 2)} Q ${P(cx + s * (hw + 6), g.chinY + 10)} ${P(cx + s * (hw - 2), g.chinY + 40)}" fill="none" stroke="#b08d3c" stroke-width="1.3" stroke-dasharray="1.5 1.5"/>`,
        )
        .join('')
    : '';
  return `<g data-traek="briller-${p.briller}">${kaede}${glas}${bro}${stang}${glimt}</g>`;
}

// ---------------------------------------------------------------- hovedbeklædning
function hovedbeklaedning(g: Geometri, p: AnsigtParam, f: Farver): { bag: string; for: string } {
  const { cx, hw, top, eyeY, chinY } = g;
  switch (p.hovedbeklaedning) {
    case 'feltmuetze': {
      // tysk Feldmütze: rund, uden skygge, rødt bånd og to kokarder
      const graa = '#7c8470';
      const graaS = '#5f6656';
      const bY1 = top + 3;
      const bY2 = top + 15;
      const krone = `M ${P(cx - hw - 3, bY1 + 2)} C ${P(cx - hw - 10, top - 10)} ${P(cx - hw * 0.4, top - 20)} ${P(cx, top - 19)} C ${P(
        cx + hw * 0.4,
        top - 20,
      )} ${P(cx + hw + 10, top - 10)} ${P(cx + hw + 3, bY1 + 2)} Z`;
      const baand = `M ${P(cx - hw - 3, bY1)} Q ${P(cx, bY1 - 5)} ${P(cx + hw + 3, bY1)} L ${P(cx + hw + 2, bY2)} Q ${P(cx, bY2 - 4)} ${P(
        cx - hw - 2,
        bY2,
      )} Z`;
      const kokarde = (y: number, r: number, a: string, b: string, c: string) =>
        `<circle cx="${cx}" cy="${r1(y)}" r="${r}" fill="${a}" ${ink(f, STREG.fin)}/><circle cx="${cx}" cy="${r1(y)}" r="${r1(r * 0.62)}" fill="${b}"/><circle cx="${cx}" cy="${r1(y)}" r="${r1(r * 0.28)}" fill="${c}"/>`;
      // hår, der stikker frem under kasketten: tindinger og lille pandehår
      const haarkant = `<path d="M ${P(cx - hw - 2, bY2 - 4)} L ${P(cx + hw + 2, bY2 - 4)} C ${P(cx + hw + 3, eyeY - 18)} ${P(cx + hw + 1, eyeY - 6)} ${P(
        cx + hw - 1,
        eyeY - 2,
      )} L ${P(cx + hw - 7, eyeY - 6)} C ${P(cx + hw - 8, bY2 + 6)} ${P(cx + hw * 0.4, bY2 + 6)} ${P(cx, bY2 + 8)} C ${P(cx - hw * 0.4, bY2 + 6)} ${P(
        cx - hw + 8,
        bY2 + 6,
      )} ${P(cx - hw + 7, eyeY - 6)} L ${P(cx - hw + 1, eyeY - 2)} C ${P(cx - hw - 1, eyeY - 6)} ${P(cx - hw - 3, eyeY - 18)} ${P(cx - hw - 2, bY2 - 4)} Z" fill="${
        f.haar.flade
      }" ${ink(f, STREG.detalje)} data-traek="haar-under-kasket"/>` +
        ([-1, 1] as const)
          .map((s) => `<path d="M ${P(cx + s * (hw - 1), bY2 - 2)} q ${s * 1},8 ${s * -1},14 M ${P(cx + s * (hw - 4), bY2)} q ${s * 0.5},6 ${s * -1},10" fill="none" stroke="${f.haar.skygge}" stroke-width="1.6" stroke-linecap="round"/>`)
          .join('');
      return {
        bag: '',
        for: `<g data-del="feltmuetze">${haarkant}<path d="${krone}" fill="${graa}" ${ink(f)}/>
          <path d="M ${P(cx - hw * 0.6, top - 8)} Q ${P(cx, top - 14)} ${P(cx + hw * 0.6, top - 8)}" fill="none" stroke="${graaS}" stroke-width="2" stroke-linecap="round"/>
          <path d="${baand}" fill="#a8473b" ${ink(f)}/>
          ${kokarde(top - 6, 3.6, '#2b2522', '#f3efe6', '#a8473b')}
          ${kokarde((bY1 + bY2) / 2 - 1.5, 4, '#a8473b', '#f3efe6', '#2b2522')}</g>`,
      };
    }
    case 'toerklaede': {
      const farve = '#4a3b33';
      const sti = `M ${P(cx - hw - 6, eyeY + 4)} C ${P(cx - hw - 10, top - 4)} ${P(cx - hw * 0.4, top - 12)} ${P(cx, top - 12)} C ${P(
        cx + hw * 0.4,
        top - 12,
      )} ${P(cx + hw + 10, top - 4)} ${P(cx + hw + 6, eyeY + 4)} C ${P(cx + hw + 6, chinY - 6)} ${P(cx + 18, chinY + 8)} ${P(cx + 6, chinY + 14)} L ${P(
        cx - 6,
        chinY + 14,
      )} C ${P(cx - 18, chinY + 8)} ${P(cx - hw - 6, chinY - 6)} ${P(cx - hw - 6, eyeY + 4)} Z`;
      const indre = `M ${P(cx - hw + 1, eyeY + 6)} C ${P(cx - hw - 2, top + 6)} ${P(cx - hw * 0.5, top + 8)} ${P(cx, top + 9)} C ${P(
        cx + hw * 0.5,
        top + 8,
      )} ${P(cx + hw + 2, top + 6)} ${P(cx + hw - 1, eyeY + 6)}`;
      return {
        bag: `<path d="${sti}" fill="${farve}" ${ink(f)}/>`,
        for: `<path d="M ${P(cx - hw - 4, eyeY + 2)} C ${P(cx - hw - 4, top - 2)} ${P(cx - hw * 0.4, top - 10)} ${P(cx, top - 10)} C ${P(
          cx + hw * 0.4,
          top - 10,
        )} ${P(cx + hw + 4, top - 2)} ${P(cx + hw + 4, eyeY + 2)} L ${P(cx + hw - 1, eyeY + 6)} ${indre.replace(/^M [^C]+/, '').length ? '' : ''} C ${P(
          cx + hw + 2,
          top + 6,
        )} ${P(cx + hw * 0.5, top + 8)} ${P(cx, top + 9)} C ${P(cx - hw * 0.5, top + 8)} ${P(cx - hw - 2, top + 6)} ${P(cx - hw + 1, eyeY + 6)} Z" fill="${farve}" ${ink(
          f,
        )}/><path d="M ${P(cx - 4, chinY + 12)} l -6,14 M ${P(cx + 4, chinY + 12)} l 7,12" stroke="${farve}" stroke-width="6" stroke-linecap="round"/>`,
      };
    }
    case 'sloer': {
      const sloer = `M ${P(cx - hw * 0.6, top - 4)} C ${P(cx - hw - 30, top + 10)} ${P(cx - hw - 34, chinY + 30)} ${P(cx - hw - 40, 245)} L ${P(
        cx + hw + 40,
        245,
      )} C ${P(cx + hw + 34, chinY + 30)} ${P(cx + hw + 30, top + 10)} ${P(cx + hw * 0.6, top - 4)} Z`;
      const krans = Array.from({ length: 7 }, (_, i) => {
        const x = cx - hw * 0.75 + (i * hw * 1.5) / 6;
        const y = top + 2 - Math.sin((i / 6) * Math.PI) * 8;
        return `<circle cx="${r1(x)}" cy="${r1(y)}" r="3.6" fill="#fbf6ec" ${ink(f, STREG.fin)}/><circle cx="${r1(x)}" cy="${r1(y)}" r="1.1" fill="#e2c46a"/>`;
      }).join('');
      return {
        bag: `<path d="${sloer}" fill="#fbf7ef" fill-opacity="0.75" ${ink(f, STREG.detalje)}/>`,
        for: `<g data-del="sloer">${krans}</g>`,
      };
    }
    default:
      return { bag: '', for: '' };
  }
}

// ---------------------------------------------------------------- tøj
function toej(g: Geometri, p: AnsigtParam, f: Farver, id: string): string {
  const { cx, chinY, nw } = g;
  const sh = p.koen === 'kvinde' ? 72 : 82;
  const y0 = chinY + 8;
  const krop = (bred = sh) =>
    `M ${P(cx - nw - 2, y0 + 4)} C ${P(cx - nw - 14, y0 + 14)} ${P(cx - bred + 6, y0 + 16)} ${P(cx - bred, y0 + 40)} L ${P(cx - bred - 8, 420)} L ${P(
      cx + bred + 8,
      420,
    )} L ${P(cx + bred, y0 + 40)} C ${P(cx + bred - 6, y0 + 16)} ${P(cx + nw + 14, y0 + 14)} ${P(cx + nw + 2, y0 + 4)} Z`;
  const kropFyld = (farve: string, extra = '') => `<path d="${krop()}" fill="${farve}" ${ink(f)} ${extra}/>`;
  const vHals = (dybde: number, farve: string) =>
    `<path d="M ${P(cx - nw - 1, y0 + 2)} L ${P(cx, y0 + dybde)} L ${P(cx + nw + 1, y0 + 2)} Z" fill="${farve}" ${ink(f, STREG.detalje)}/>`;
  const skjorteKrave = (farve = '#f6f1e6') =>
    `<path d="M ${P(cx - nw - 2, y0 - 2)} L ${P(cx - 3, y0 + 14)} L ${P(cx - nw - 10, y0 + 12)} Z M ${P(cx + nw + 2, y0 - 2)} L ${P(cx + 3, y0 + 14)} L ${P(
      cx + nw + 10,
      y0 + 12,
    )} Z" fill="${farve}" ${ink(f, STREG.detalje)}/>`;
  const revers = (farve: string) =>
    `<path d="M ${P(cx - nw - 4, y0 + 4)} L ${P(cx - 4, y0 + 50)} L ${P(cx - 22, y0 + 30)} L ${P(cx - 30, y0 + 22)} Z M ${P(cx + nw + 4, y0 + 4)} L ${P(
      cx + 4,
      y0 + 50,
    )} L ${P(cx + 22, y0 + 30)} L ${P(cx + 30, y0 + 22)} Z" fill="${farve}" ${ink(f, STREG.detalje)}/>`;
  const knapper = (n: number, farve: string, start = y0 + 30, afst = 16) =>
    Array.from({ length: n }, (_, i) => `<circle cx="${cx}" cy="${start + i * afst}" r="2.6" fill="${farve}" ${ink(f, STREG.fin)}/>`).join('');
  const c = p.toejFarve;
  const skygge = (farve: string) => bland(farve, '#000000', 0.25);
  let ud = '';

  switch (p.toej) {
    case 'feltgraa': {
      const graa = c ?? '#7c8470';
      ud =
        kropFyld(graa) +
        // skulderstropper
        `<path d="M ${P(cx - 58, y0 + 20)} l 24,-6 l 2,7 l -24,6 Z M ${P(cx + 58, y0 + 20)} l -24,-6 l -2,7 l 24,6 Z" fill="${skygge(graa)}" ${ink(f, STREG.fin)}/>` +
        // ståkrave med rød kant
        `<path d="M ${P(cx - nw - 4, y0 - 6)} Q ${P(cx, y0 + 2)} ${P(cx + nw + 4, y0 - 6)} L ${P(cx + nw + 6, y0 + 8)} Q ${P(cx, y0 + 16)} ${P(
          cx - nw - 6,
          y0 + 8,
        )} Z" fill="${skygge(graa)}" ${ink(f, STREG.detalje)}/>` +
        `<path d="M ${P(cx - nw - 4, y0 - 5)} Q ${P(cx, y0 + 3)} ${P(cx + nw + 4, y0 - 5)}" fill="none" stroke="#a8473b" stroke-width="1.6"/>` +
        `<path d="M ${P(cx, y0 + 14)} L ${P(cx, 420)}" stroke="${skygge(graa)}" stroke-width="1.6"/>` +
        knapper(4, '#c9a24a', y0 + 26, 17);
      break;
    }
    case 'jakkesaet': {
      const farve = c ?? '#3a3c46';
      ud =
        kropFyld(farve) +
        vHals(56, '#f6f1e6') +
        `<path d="M ${P(cx - 4, y0 + 10)} L ${P(cx + 4, y0 + 10)} L ${P(cx + 6, y0 + 52)} L ${P(cx, y0 + 60)} L ${P(cx - 6, y0 + 52)} Z" fill="#6b4a5a" ${ink(
          f,
          STREG.fin,
        )}/>` +
        `<path d="M ${P(cx - 4, y0 + 10)} L ${P(cx + 4, y0 + 10)} L ${P(cx + 3, y0 + 16)} L ${P(cx - 3, y0 + 16)} Z" fill="#5a3d4b" ${ink(f, STREG.fin)}/>` +
        skjorteKrave() +
        revers(skygge(farve)) +
        `<path d="M ${P(cx + 34, y0 + 36)} l 10,-2 l -1,5 l -9,1 Z" fill="#f6f1e6" ${ink(f, STREG.fin)}/>`;
      break;
    }
    case 'soendagstoej_mand': {
      const farve = c ?? '#3b3530';
      ud =
        kropFyld(farve) +
        vHals(44, '#f6f1e6') +
        `<path d="M ${P(cx - nw - 1, y0 - 10)} L ${P(cx + nw + 1, y0 - 10)} L ${P(cx + nw + 2, y0 + 4)} L ${P(cx - nw - 2, y0 + 4)} Z" fill="#fbf8f0" ${ink(
          f,
          STREG.detalje,
        )}/>` +
        `<path d="M ${P(cx - 10, y0 + 2)} L ${P(cx, y0 + 7)} L ${P(cx - 10, y0 + 12)} Z M ${P(cx + 10, y0 + 2)} L ${P(cx, y0 + 7)} L ${P(
          cx + 10,
          y0 + 12,
        )} Z" fill="#2a2420" ${ink(f, STREG.fin)}/>` +
        revers(skygge(farve)) +
        knapper(2, '#2a2420', y0 + 52, 14);
      break;
    }
    case 'soendagstoej_kvinde':
    case 'bondetoej_kvinde':
    case 'toej_1940_kvinde': {
      const farve = c ?? (p.toej === 'toej_1940_kvinde' ? '#6d7f9a' : '#3d3433');
      ud = kropFyld(farve);
      if (p.toej === 'soendagstoej_kvinde') {
        ud +=
          `<path d="M ${P(cx - nw - 1, y0 - 12)} L ${P(cx + nw + 1, y0 - 12)} L ${P(cx + nw + 4, y0 + 6)} Q ${P(cx, y0 + 10)} ${P(cx - nw - 4, y0 + 6)} Z" fill="#f2ebdc" ${ink(
            f,
            STREG.detalje,
          )}/>` +
          `<path d="M ${P(cx - nw, y0 - 6)} L ${P(cx + nw, y0 - 6)} M ${P(cx - nw, y0)} L ${P(cx + nw, y0)}" stroke="#d6cbb4" stroke-width="1"/>` +
          `<circle cx="${cx}" cy="${y0 + 10}" r="4.5" fill="#c9a24a" ${ink(f, STREG.fin)}/><circle cx="${cx}" cy="${y0 + 10}" r="2" fill="#7d3c3c"/>` +
          knapper(3, '#2a2420', y0 + 28, 14);
      } else if (p.toej === 'bondetoej_kvinde') {
        ud +=
          `<path d="M ${P(cx - nw - 2, y0 + 2)} Q ${P(cx, y0 + 30)} ${P(cx + nw + 2, y0 + 2)}" fill="#2a2420" ${ink(f, STREG.detalje)}/>` +
          `<path d="M ${P(cx - 40, y0 + 40)} L ${P(cx + 40, y0 + 40)} L ${P(cx + 46, 420)} L ${P(cx - 46, 420)} Z" fill="#d8cdb6" ${ink(f, STREG.detalje)}/>` +
          `<path d="M ${P(cx - 40, y0 + 40)} Q ${P(cx - 60, y0 + 20)} ${P(cx - 60, y0 + 14)} M ${P(cx + 40, y0 + 40)} Q ${P(cx + 60, y0 + 20)} ${P(
            cx + 60,
            y0 + 14,
          )}" fill="none" stroke="#d8cdb6" stroke-width="4"/>`;
      } else {
        ud +=
          `<path d="M ${P(cx - nw - 2, y0 + 2)} Q ${P(cx, y0 + 26)} ${P(cx + nw + 2, y0 + 2)}" fill="${f.hud.flade}" ${ink(f, STREG.detalje)}/>` +
          `<path d="M ${P(cx - nw - 4, y0 + 2)} Q ${P(cx - 20, y0 + 26)} ${P(cx - 2, y0 + 24)} Q ${P(cx - 14, y0 + 14)} ${P(cx - nw - 4, y0 + 2)} Z M ${P(
            cx + nw + 4,
            y0 + 2,
          )} Q ${P(cx + 20, y0 + 26)} ${P(cx + 2, y0 + 24)} Q ${P(cx + 14, y0 + 14)} ${P(cx + nw + 4, y0 + 2)} Z" fill="#f6f1e6" ${ink(f, STREG.detalje)}/>`;
      }
      break;
    }
    case 'brudekjole': {
      ud =
        kropFyld(c ?? '#f1ebdf') +
        `<path d="M ${P(cx - nw - 6, y0 + 2)} Q ${P(cx, y0 + 34)} ${P(cx + nw + 6, y0 + 2)}" fill="${f.hud.flade}" ${ink(f, STREG.detalje)}/>` +
        Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          const x = cx - nw - 6 + t * (2 * nw + 12);
          const y = y0 + 2 + Math.sin(t * Math.PI) * 15;
          return `<circle cx="${r1(x)}" cy="${r1(y + 3)}" r="1.8" fill="#ffffff" ${ink(f, 0.6)}/>`;
        }).join('') +
        `<path d="M ${P(cx - 30, 260)} q 8,-40 0,-80 M ${P(cx + 30, 260)} q -8,-40 0,-80" fill="none" stroke="#d9d0c0" stroke-width="1.4"/>`;
      break;
    }
    case 'bondetoej_mand':
    case 'toej_1940_mand': {
      const skjorte = p.toej === 'bondetoej_mand' ? '#ece2cc' : '#e6e0d2';
      const vest = c ?? (p.toej === 'bondetoej_mand' ? '#5a4535' : '#6a6458');
      ud =
        kropFyld(skjorte) +
        (p.toej === 'bondetoej_mand'
          ? `<path d="M ${P(cx - nw - 1, y0 - 4)} Q ${P(cx, y0 + 6)} ${P(cx + nw + 1, y0 - 4)} L ${P(cx + nw + 2, y0 + 4)} Q ${P(cx, y0 + 14)} ${P(
              cx - nw - 2,
              y0 + 4,
            )} Z" fill="${skjorte}" ${ink(f, STREG.detalje)}/><path d="M ${P(cx, y0 + 10)} L ${P(cx, y0 + 34)}" stroke="${f.blaek}" stroke-width="1.2"/>` +
            knapper(2, '#f6f1e6', y0 + 18, 10)
          : skjorteKrave('#f6f1e6')) +
        `<path d="M ${P(cx - 52, y0 + 22)} L ${P(cx - 10, y0 + 40)} L ${P(cx - 4, 420)} L ${P(cx - 66, 420)} Z M ${P(cx + 52, y0 + 22)} L ${P(cx + 10, y0 + 40)} L ${P(
          cx + 4,
          420,
        )} L ${P(cx + 66, 420)} Z" fill="${vest}" ${ink(f, STREG.detalje)}/>`;
      break;
    }
    case 'strik': {
      const farve = c ?? '#2f3e5c';
      const s = skygge(farve);
      ud =
        kropFyld(farve) +
        `<path d="M ${P(cx - nw - 4, y0 + 2)} Q ${P(cx, y0 + 20)} ${P(cx + nw + 4, y0 + 2)} L ${P(cx + nw + 8, y0 - 4)} Q ${P(cx, y0 + 12)} ${P(
          cx - nw - 8,
          y0 - 4,
        )} Z" fill="${s}" ${ink(f, STREG.detalje)}/>` +
        [-30, -14, 14, 30]
          .map((dx) => `<path d="M ${P(cx + dx, y0 + 24)} q 4,8 0,16 q -4,8 0,16 q 4,8 0,16 q -4,8 0,16" fill="none" stroke="${s}" stroke-width="2"/>`)
          .join('');
      break;
    }
    case 'flannel': {
      const farve = c ?? '#a8432f';
      ud =
        `<defs><pattern id="${id}-ternet" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${farve}"/><rect width="16" height="5" y="5" fill="${skygge(
          farve,
        )}" opacity="0.7"/><rect width="5" height="16" x="5" fill="${skygge(farve)}" opacity="0.6"/><rect width="16" height="1" y="13" fill="#f2d9a8" opacity="0.6"/></pattern></defs>` +
        kropFyld(`url(#${id}-ternet)`) +
        vHals(40, '#e9e2d3') +
        `<path d="M ${P(cx - nw - 2, y0 + 2)} L ${P(cx - 10, y0 + 44)} L ${P(cx - 34, y0 + 18)} Z M ${P(cx + nw + 2, y0 + 2)} L ${P(cx + 10, y0 + 44)} L ${P(
          cx + 34,
          y0 + 18,
        )} Z" fill="url(#${id}-ternet)" ${ink(f, STREG.detalje)}/>`;
      break;
    }
    case 'hoodie': {
      const farve = c ?? '#5f7d6e';
      ud =
        `<path d="M ${P(cx - nw - 18, y0 + 14)} Q ${P(cx - nw - 10, y0 - 22)} ${P(cx, y0 - 14)} Q ${P(cx + nw + 10, y0 - 22)} ${P(cx + nw + 18, y0 + 14)} Z" fill="${skygge(
          farve,
        )}" ${ink(f)}/>` +
        kropFyld(farve) +
        `<path d="M ${P(cx - nw - 2, y0 + 2)} Q ${P(cx, y0 + 18)} ${P(cx + nw + 2, y0 + 2)}" fill="${skygge(farve)}" ${ink(f, STREG.detalje)}/>` +
        `<path d="M ${P(cx - 8, y0 + 12)} l -2,30 M ${P(cx + 8, y0 + 12)} l 2,28" stroke="#efe8da" stroke-width="2.2" stroke-linecap="round"/>` +
        // kuglepen i kraven
        `<g transform="translate(${cx + 30},${y0 + 4}) rotate(8)"><rect x="0" y="0" width="4.5" height="26" rx="1.5" fill="#3f5e9c" ${ink(
          f,
          STREG.fin,
        )}/><rect x="-1" y="2" width="1.6" height="12" fill="#c9cdd6" ${ink(f, 0.6)}/></g>`;
      break;
    }
    case 'fløjlsjakke': {
      const farve = c ?? '#8a5a3a';
      ud =
        kropFyld(farve) +
        vHals(40, '#ddd4c2') +
        [-56, -44, -32, 32, 44, 56].map((dx) => `<path d="M ${P(cx + dx, y0 + 30)} L ${P(cx + dx * 1.05, 420)}" stroke="${skygge(farve)}" stroke-width="1.4"/>`).join('') +
        revers(skygge(farve));
      break;
    }
    case 'vest_polo': {
      const polo = '#e9e4d6';
      const vest = c ?? '#3d4a3a';
      ud =
        kropFyld(vest) +
        `<path d="M ${P(cx - nw - 6, y0 + 2)} L ${P(cx, y0 + 46)} L ${P(cx + nw + 6, y0 + 2)} Z" fill="${polo}" ${ink(f, STREG.detalje)}/>` +
        `<path d="M ${P(cx - nw - 3, y0 - 2)} L ${P(cx - 2, y0 + 12)} L ${P(cx - nw - 12, y0 + 10)} Z M ${P(cx + nw + 3, y0 - 2)} L ${P(cx + 2, y0 + 12)} L ${P(
          cx + nw + 12,
          y0 + 10,
        )} Z" fill="${polo}" ${ink(f, STREG.detalje)}/>` +
        knapper(2, '#f6f1e6', y0 + 18, 9) +
        `<path d="M ${P(cx, y0 + 46)} L ${P(cx, 420)}" stroke="${skygge(vest)}" stroke-width="2"/>` +
        [0, 1, 2, 3]
          .map(
            (i) =>
              `<path d="M ${P(cx - 70, y0 + 44 + i * 15)} L ${P(cx - 6, y0 + 52 + i * 15)} M ${P(cx + 70, y0 + 44 + i * 15)} L ${P(cx + 6, y0 + 52 + i * 15)}" stroke="${skygge(
                vest,
              )}" stroke-width="1.5"/>`,
          )
          .join('');
      break;
    }
    case 'cardigan': {
      const farve = c ?? '#8d8a85';
      ud =
        `<defs><pattern id="${id}-tern" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#e8e1d2"/><rect width="10" height="3" fill="#9fb3c4" opacity="0.7"/><rect width="3" height="10" fill="#9fb3c4" opacity="0.6"/></pattern></defs>` +
        kropFyld(`url(#${id}-tern)`) +
        skjorteKrave(`url(#${id}-tern)`) +
        `<path d="M ${P(cx - nw - 8, y0 + 6)} L ${P(cx - 12, y0 + 70)} L ${P(cx - 10, 420)} L ${P(cx - 92, 420)} L ${P(cx - sh, y0 + 40)} C ${P(cx - sh + 6, y0 + 16)} ${P(
          cx - nw - 18,
          y0 + 12,
        )} ${P(cx - nw - 8, y0 + 6)} Z M ${P(cx + nw + 8, y0 + 6)} L ${P(cx + 12, y0 + 70)} L ${P(cx + 10, 420)} L ${P(cx + 92, 420)} L ${P(cx + sh, y0 + 40)} C ${P(
          cx + sh - 6,
          y0 + 16,
        )} ${P(cx + nw + 18, y0 + 12)} ${P(cx + nw + 8, y0 + 6)} Z" fill="${farve}" ${ink(f, STREG.detalje)}/>` +
        `<circle cx="${cx - 14}" cy="${y0 + 74}" r="2.4" fill="#e8e1d2" ${ink(f, STREG.fin)}/>`;
      break;
    }
    case 'denim': {
      const farve = c ?? '#5c7fa8';
      ud =
        kropFyld(farve) +
        vHals(36, '#f2ece0') +
        `<path d="M ${P(cx - nw - 2, y0)} L ${P(cx - 8, y0 + 36)} L ${P(cx - 36, y0 + 16)} Z M ${P(cx + nw + 2, y0)} L ${P(cx + 8, y0 + 36)} L ${P(cx + 36, y0 + 16)} Z" fill="${skygge(
          farve,
        )}" ${ink(f, STREG.detalje)}/>` +
        `<path d="M ${P(cx - 54, y0 + 50)} L ${P(cx - 20, y0 + 50)} M ${P(cx + 54, y0 + 50)} L ${P(cx + 20, y0 + 50)}" stroke="#e8b84a" stroke-width="1.2" stroke-dasharray="3 2"/>` +
        // lille dansk flag-nål
        `<g transform="translate(${cx + 32},${y0 + 30})"><rect width="11" height="8" fill="#c8102e" ${ink(f, STREG.fin)}/><rect x="3" width="1.8" height="8" fill="#fff"/><rect y="3.1" width="11" height="1.8" fill="#fff"/></g>`;
      break;
    }
    case 'tweed': {
      const farve = c ?? '#7d6a4a';
      ud =
        `<defs><pattern id="${id}-tweed" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${farve}"/><circle cx="1.5" cy="1.5" r="0.9" fill="${bland(
          farve,
          '#ffffff',
          0.3,
        )}"/><circle cx="4.5" cy="4" r="0.8" fill="${skygge(farve)}"/></pattern></defs>` +
        kropFyld(`url(#${id}-tweed)`) +
        vHals(44, '#eee8da') +
        `<path d="M ${P(cx - 3, y0 + 10)} L ${P(cx + 3, y0 + 10)} L ${P(cx + 5, y0 + 46)} L ${P(cx, y0 + 52)} L ${P(cx - 5, y0 + 46)} Z" fill="#6b3b30" ${ink(f, STREG.fin)}/>` +
        skjorteKrave('#eee8da') +
        revers(`url(#${id}-tweed)`);
      break;
    }
    case 'smedeforklaede': {
      ud =
        kropFyld('#d9cdb4') +
        `<path d="M ${P(cx - nw - 1, y0 - 4)} Q ${P(cx, y0 + 6)} ${P(cx + nw + 1, y0 - 4)} L ${P(cx + nw + 2, y0 + 4)} Q ${P(cx, y0 + 14)} ${P(cx - nw - 2, y0 + 4)} Z" fill="#d9cdb4" ${ink(
          f,
          STREG.detalje,
        )}/>` +
        `<path d="M ${P(cx - 34, y0 + 30)} L ${P(cx + 34, y0 + 30)} L ${P(cx + 44, 420)} L ${P(cx - 44, 420)} Z" fill="#7a4a2c" ${ink(f, STREG.detalje)}/>` +
        `<path d="M ${P(cx - 34, y0 + 30)} L ${P(cx - 50, y0 + 6)} M ${P(cx + 34, y0 + 30)} L ${P(cx + 50, y0 + 6)}" stroke="#5a3520" stroke-width="4" stroke-linecap="round"/>`;
      break;
    }
  }
  const hals = `<path d="M ${P(cx - nw, chinY - 22)} L ${P(cx - nw - 1, y0 + 8)} Q ${P(cx, y0 + 16)} ${P(cx + nw + 1, y0 + 8)} L ${P(cx + nw, chinY - 22)} Z" fill="${
    f.hud.flade
  }" ${ink(f)}/><path d="M ${P(cx - nw + 2, chinY - 4)} Q ${P(cx, chinY + 8)} ${P(cx + nw - 2, chinY - 4)}" fill="none" stroke="${f.hud.skygge}" stroke-width="5" opacity="0.8"/>`;
  return `<g data-del="toej" data-toej="${p.toej}">${hals}${ud}</g>`;
}

// ---------------------------------------------------------------- rekvisitter
function rekvisit(p: AnsigtParam, f: Farver): string {
  const fl = HUD[p.hud].flade;
  const haand = (x: number, y: number) =>
    `<path d="M ${P(x - 9, y)} q 0,-8 8,-8 l 6,0 q 6,0 6,6 l 0,6 q 0,6 -6,6 l -8,0 q -6,0 -6,-6 Z" fill="${fl}" ${ink(f, STREG.detalje)}/>`;
  switch (p.rekvisit) {
    case 'kaffekop':
      return `<g data-del="kaffekop"><path d="M 132,206 l 32,0 l -3,30 q -13,6 -26,0 Z" fill="#f2ede4" ${ink(f)}/><path d="M 162,212 q 12,0 10,10 q -2,8 -12,8" fill="none" ${ink(
        f,
      )}/><ellipse cx="148" cy="206" rx="16" ry="4" fill="#5b3a26" ${ink(f, STREG.detalje)}/><path d="M 140,196 q -4,-6 0,-12 M 150,194 q -4,-6 0,-12" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M 140,224 l 14,0" stroke="#4f7896" stroke-width="3"/>${haand(
        128,
        226,
      )}</g>`;
    case 'mappe':
      return `<g data-del="mappe" transform="rotate(-8 100 220)"><rect x="54" y="198" width="92" height="56" rx="3" fill="#d79a4a" ${ink(f)}/><rect x="60" y="192" width="80" height="10" fill="#f4ead4" ${ink(
        f,
        STREG.fin,
      )}/><path d="M 54,212 l 92,0" stroke="#a8722f" stroke-width="2"/>${haand(60, 222)}${haand(140, 222)}</g>`;
    case 'bibel':
      return `<g data-del="bibel" transform="rotate(6 100 220)"><rect x="62" y="196" width="76" height="56" rx="4" fill="#3b2a24" ${ink(f)}/><path d="M 100,206 l 0,30 M 90,216 l 20,0" stroke="#c9a24a" stroke-width="3"/>${haand(
        66,
        226,
      )}${haand(136, 226)}</g>`;
    case 'kasse':
      return `<g data-del="kasse"><path d="M 46,206 l 108,0 l 6,40 l -120,0 Z" fill="#c9a26b" ${ink(f)}/><path d="M 46,206 l 54,-10 l 54,10" fill="#b48c55" ${ink(f, STREG.detalje)}/><rect x="70" y="200" width="18" height="10" fill="#f4ead4" ${ink(
        f,
        STREG.fin,
      )}/><rect x="98" y="198" width="22" height="12" fill="#efe2c6" ${ink(f, STREG.fin)}/>${haand(52, 226)}${haand(150, 226)}</g>`;
    case 'baby':
      return `<g data-del="baby"><ellipse cx="100" cy="222" rx="46" ry="22" fill="#f4efe6" ${ink(f)}/><circle cx="76" cy="214" r="13" fill="${fl}" ${ink(
        f,
        STREG.detalje,
      )}/><path d="M 71,214 q 2,-2 4,0 M 79,214 q 2,-2 4,0 M 74,220 q 2,2 4,0" fill="none" ${ink(f, STREG.fin)}/><path d="M 63,206 q 13,-12 28,0" fill="#f4efe6" ${ink(
        f,
        STREG.detalje,
      )}/><path d="M 96,214 q 20,6 40,0 M 98,226 q 20,6 40,0" fill="none" stroke="#d8cfc0" stroke-width="2"/>${haand(140, 222)}</g>`;
    case 'buket':
      return `<g data-del="buket">${[
        [92, 208],
        [104, 204],
        [114, 212],
        [98, 218],
        [110, 222],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#f6efe2" ${ink(f, STREG.detalje)}/><circle cx="${x}" cy="${y}" r="2.4" fill="#e2c46a"/>`)
        .join('')}<path d="M 96,226 l 8,20 l 8,-20" fill="#7a9a5a" ${ink(f, STREG.detalje)}/>${haand(104, 236)}</g>`;
    default:
      return '';
  }
}

// ---------------------------------------------------------------- samlet person
export interface PersonTegning {
  /** <defs>-indhold (filtre, mønstre). Id'er er præfikset. */
  defs: string;
  /** Selve personen som <g>. */
  krop: string;
}

/**
 * Tegner en person. `id` bruges som præfiks for interne id'er, så flere
 * personer kan stå i samme SVG (fx gruppefotoet).
 */
export function tegnPerson(p: AnsigtParam, t: Tokens, id = 'p'): PersonTegning {
  const g = geometri(p);
  const f = farver(p, t);
  const hoved = hovedSti(g, p);
  const hb = hovedbeklaedning(g, p, f);
  const h = haar(g, p, f, id);
  const skyggeSide = `<g clip-path="url(#${id}-hovedklip)"><path d="M ${P(g.cx - g.hw - 10, g.top)} C ${P(g.cx - g.hw + 8, g.eyeY)} ${P(g.cx - g.jw + 6, g.chinY - 14)} ${P(
    g.cx - 4,
    g.chinY + 4,
  )} L ${P(g.cx - g.hw - 20, g.chinY + 10)} Z" fill="${f.hud.skygge}" opacity="0.55"/></g>`;
  const kinder = ([-1, 1] as const)
    .map(
      (s) =>
        `<ellipse cx="${r1(g.cx + s * (g.eyeDx + 3))}" cy="${r1(g.noseY + 5)}" rx="7.5" ry="4.5" fill="${f.hud.kind}" opacity="${
          p.udtryk === 'glad' || p.udtryk === 'griner' ? 0.55 : 0.32
        }"/>`,
    )
    .join('');
  const fregner = p.fregner
    ? ([-1, 1] as const)
        .map((s) =>
          [0, 1, 2, 3]
            .map((i) => `<circle cx="${r1(g.cx + s * (g.eyeDx - 2 + i * 3))}" cy="${r1(g.noseY - 1 + (i % 2) * 3)}" r="0.9" fill="${f.hud.skygge}"/>`)
            .join(''),
        )
        .join('')
    : '';

  const defs = `<clipPath id="${id}-hovedklip"><path d="${hoved}"/></clipPath>`;
  const tilt = p.haeldning ?? 0;
  const krop = `<g data-person="${id}">
    ${toej(g, p, f, id)}
    <g transform="rotate(${tilt} ${g.cx} ${r1(g.chinY + 10)})">
    ${hb.bag}
    ${h.bag}
    ${oerer(g, p, f)}
    <path data-del="hoved" d="${hoved}" fill="${f.hud.flade}" ${ink(f)}/>
    ${skyggeSide}
    ${kinder}${fregner}
    ${rynker(g, p, f)}
    ${bryn(g, p, f)}
    ${oejne(g, p, f)}
    ${naese(g, p, f)}
    ${skaeg(g, p, f)}
    ${mund(g, p, f)}
    ${kloeft(g, p, f)}
    ${ar(g, p, f)}
    ${p.hovedbeklaedning === 'toerklaede' ? '' : h.for}
    ${hb.for}
    ${briller(g, p, f)}
    </g>
    ${rekvisit(p, f)}
  </g>`;
  return { defs, krop };
}
