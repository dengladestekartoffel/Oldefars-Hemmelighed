import { describe, expect, it } from 'vitest';
import {
  find,
  flyt,
  fremme,
  hentFraKurv,
  kasser,
  klamp,
  lagISkuffe,
  nytBord,
  rydOp,
  tagFraSkuffe,
  tilfoej,
  tilTop,
  tingVed,
  type Ting,
} from '../src/skrivebord/model';
import { Historik } from '../src/skrivebord/historik';
import { begraens, graenser, standardKamera, tilBord, tilSkaerm, zoomOm } from '../src/skrivebord/kamera';

const ting = (id: string, slags: Ting['slags'], x = 100, y = 100, z = 1, ekstra: Partial<Ting> = {}): Ting => ({
  id,
  slags,
  x,
  y,
  w: 200,
  h: 260,
  rot: 0,
  z,
  ...ekstra,
});

const bord = () =>
  nytBord([
    ting('a', 'ark', 100, 100, 1),
    ting('b', 'bog', 150, 150, 2),
    ting('c', 'foto', 600, 300, 3),
    ting('lup', 'lup', 700, 900, 4),
    ting('kurv', 'papirkurv', 820, 1320, 0, { fast: true, w: 150, h: 150 }),
    ting('skuffe', 'skuffe', 350, 1410, 0, { fast: true, w: 300, h: 90 }),
  ]);

describe('skrivebordets model', () => {
  it('lægger den ting, man rører ved, øverst', () => {
    const b = tilTop(bord(), 'a');
    expect(find(b, 'a')!.z).toBeGreaterThan(Math.max(...b.ting.filter((t) => t.id !== 'a').map((t) => t.z)));
  });

  it('flytter ikke faste ting og lægger dem ikke øverst', () => {
    const b0 = bord();
    expect(flyt(b0, 'kurv', 10, 10)).toEqual(b0);
    expect(tilTop(b0, 'kurv')).toBe(b0);
  });

  it('holder tingene på bordet', () => {
    const b = flyt(bord(), 'a', -5000, 99999);
    const a = find(b, 'a')!;
    expect(a.x).toBeGreaterThanOrEqual(-a.w * 0.3 - 0.001);
    expect(a.y + a.h * 0.7).toBeLessThanOrEqual(b.h + 0.001);
    const p = klamp(b, a, 5000, -5000);
    expect(p.x + a.w * 0.7).toBeLessThanOrEqual(b.w + 0.001);
    expect(p.y).toBeGreaterThanOrEqual(-a.h * 0.3 - 0.001);
  });

  it('begrænser drejningen', () => {
    expect(find(flyt(bord(), 'a', 100, 100, 400), 'a')!.rot).toBe(60);
  });

  it('smider ark i papirkurven og tager dem op igen', () => {
    let b = kasser(bord(), 'a');
    expect(fremme(b).map((t) => t.id)).not.toContain('a');
    b = hentFraKurv(b, 'a');
    expect(fremme(b).map((t) => t.id)).toContain('a');
  });

  it('smider ikke værktøj i papirkurven', () => {
    const b0 = bord();
    expect(kasser(b0, 'lup')).toBe(b0);
  });

  it('lægger ting i skuffen og tager dem ud', () => {
    let b = lagISkuffe(bord(), 'c');
    expect(find(b, 'c')!.iSkuffe).toBe(true);
    b = tagFraSkuffe(b, 'c');
    expect(find(b, 'c')!.iSkuffe).toBe(false);
    expect(find(b, 'c')!.y).toBeLessThan(1410);
  });

  it('rydder op uden at flytte faste ting, og alt ligger på bordet bagefter', () => {
    const b = rydOp(bord());
    expect(find(b, 'kurv')).toEqual(find(bord(), 'kurv'));
    for (const t of fremme(b)) {
      expect(klamp(b, t, t.x, t.y)).toEqual({ x: t.x, y: t.y });
    }
    // ark og bog havner i samme bunke, i stakkens rækkefølge
    const a = find(b, 'a')!;
    const bog = find(b, 'b')!;
    expect(Math.abs(a.x - bog.x)).toBeLessThan(20);
    expect(bog.z).toBeGreaterThan(a.z);
  });

  it('finder den øverste ting under et punkt, også når den er drejet', () => {
    const b = flyt(bord(), 'b', 150, 150, 30);
    expect(tingVed(b, 250, 280)!.id).toBe('b');
    expect(tingVed(b, 250, 280, 'b')!.id).toBe('a');
    expect(tingVed(b, 5, 5)).toBeUndefined();
  });

  it('tilføjer en ny ting øverst og inden for bordet', () => {
    const b = tilfoej(bord(), ting('ny', 'ark', 5000, 5000, 0));
    const ny = find(b, 'ny')!;
    expect(ny.z).toBe(5);
    expect(ny.x).toBeLessThan(b.w);
  });
});

describe('fortryd', () => {
  it('kan fortryde mindst 20 trin, også et kasseret ark', () => {
    const h = new Historik<ReturnType<typeof bord>>();
    let b = bord();
    const start = b;
    h.gem(b);
    b = kasser(b, 'a');
    for (let i = 0; i < 25; i++) {
      h.gem(b);
      b = flyt(b, 'c', 600 + i, 300);
    }
    for (let i = 0; i < 25; i++) b = h.fortryd()!;
    expect(find(b, 'c')!.x).toBe(600);
    b = h.fortryd()!;
    expect(b).toBe(start);
    expect(find(b, 'a')!.kassert).toBeFalsy();
    expect(h.fortryd()).toBeUndefined();
  });
});

describe('kamera', () => {
  const u = { w: 390, h: 700 };
  it('viser hele bordet fra start', () => {
    const k = standardKamera(u, 1000, 1500);
    const o = tilSkaerm(k, 0, 0);
    const n = tilSkaerm(k, 1000, 1500);
    expect(o.x).toBeGreaterThanOrEqual(-0.001);
    expect(n.x).toBeLessThanOrEqual(u.w + 0.001);
    expect(n.y).toBeLessThanOrEqual(u.h + 0.001);
  });
  it('holder bordpunktet under fingrene ved zoom', () => {
    const k = standardKamera(u, 1000, 1500);
    const før = tilBord(k, 200, 300);
    const k2 = zoomOm(k, k.z * 2, 200, 300);
    const efter = tilBord(k2, 200, 300);
    expect(efter.x).toBeCloseTo(før.x);
    expect(efter.y).toBeCloseTo(før.y);
  });
  it('begrænser zoom og panorering', () => {
    const g = graenser(u, 1000, 1500);
    const k = begraens({ x: 99999, y: -99999, z: 100 }, u, 1000, 1500);
    expect(k.z).toBe(g.max);
    expect(k.x).toBeLessThanOrEqual(u.w * 0.15 + 0.001);
    const ud = begraens({ x: 0, y: 0, z: 0.0001 }, u, 1000, 1500);
    expect(ud.z).toBe(g.min);
  });
});
