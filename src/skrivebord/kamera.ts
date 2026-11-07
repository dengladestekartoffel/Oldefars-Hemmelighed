// Kameraet over skrivebordet: panorering og zoom.
// Skærmpunkt = bordpunkt * z + (x, y).

export interface Kamera {
  x: number;
  y: number;
  z: number;
}

export interface Udsnit {
  /** Skærmens (bordområdets) størrelse i CSS-pixels. */
  w: number;
  h: number;
  /** Plads til knapper foroven/forneden, som bordet helst ikke skal ligge under. */
  top?: number;
  bund?: number;
}

const fri = (u: Udsnit) => ({ y0: u.top ?? 0, h: u.h - (u.top ?? 0) - (u.bund ?? 0) });

/** Zoom, hvor hele bordets bredde (og højde) kan ses. */
export function tilpasZoom(u: Udsnit, bordW: number, bordH: number): number {
  return Math.min(u.w / bordW, fri(u).h / bordH);
}

export function graenser(u: Udsnit, bordW: number, bordH: number): { min: number; max: number; tilpas: number } {
  const tilpas = tilpasZoom(u, bordW, bordH);
  // helt udzoomet ses kontoret rundt om bordet; indzoomet kan man læse etiketter
  return { min: tilpas * 0.42, max: tilpas * 3.2, tilpas };
}

/** Kamera, der viser hele bordet centreret. */
export function standardKamera(u: Udsnit, bordW: number, bordH: number): Kamera {
  const z = tilpasZoom(u, bordW, bordH);
  const f = fri(u);
  return { z, x: (u.w - bordW * z) / 2, y: f.y0 + (f.h - bordH * z) / 2 };
}

export function tilBord(k: Kamera, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - k.x) / k.z, y: (sy - k.y) / k.z };
}

export function tilSkaerm(k: Kamera, bx: number, by: number): { x: number; y: number } {
  return { x: bx * k.z + k.x, y: by * k.z + k.y };
}

/** Zoomer om et skærmpunkt, så bordpunktet under fingrene bliver liggende. */
export function zoomOm(k: Kamera, nyZ: number, sx: number, sy: number): Kamera {
  const b = tilBord(k, sx, sy);
  return { z: nyZ, x: sx - b.x * nyZ, y: sy - b.y * nyZ };
}

/** Holder kameraet inden for graenserne, så bordet ikke kan forsvinde. */
export function begraens(k: Kamera, u: Udsnit, bordW: number, bordH: number): Kamera {
  const g = graenser(u, bordW, bordH);
  const z = Math.min(g.max, Math.max(g.min, k.z));
  const bw = bordW * z;
  const bh = bordH * z;
  const placer = (start: number, skaerm: number, bord: number, pos: number) => {
    if (bord <= skaerm) {
      // bordet er mindre end skærmen: hold det centreret
      return start + (skaerm - bord) / 2;
    }
    // bordet er større: ingen tom kant ud over en lille margen
    const margen = skaerm * 0.15;
    return Math.min(start + margen, Math.max(start + skaerm - bord - margen, pos));
  };
  const f = fri(u);
  return { z, x: placer(0, u.w, bw, k.x), y: placer(f.y0, f.h, bh, k.y) };
}

/** Er vi zoomet så langt ud, at kontoret ses? */
export function viserKontor(k: Kamera, u: Udsnit, bordW: number, bordH: number): boolean {
  return k.z < tilpasZoom(u, bordW, bordH) * 0.8;
}
