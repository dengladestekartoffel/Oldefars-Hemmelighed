// Skrivebordet – spillets hovedskærm. Alt er fysiske ting, der kan flyttes,
// stables, drejes, åbnes og lægges i papirkurven eller skuffen.
//
// Under træk ændres DOM'en direkte (transform), så det kører flydende;
// først når fingeren slippes, gemmes den nye tilstand (og kan fortrydes).

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { sag } from '../data/indhold';
import { lysFraKlokken, tokens } from '../grafik/stil';
import { kontorGulv, skrivebordsplade } from '../grafik/ting';
import { svgTilDataUrl } from '../grafik/foto';
import { Knap } from '../ui/Knap';
import { foel, laasLydOp } from '../system/foel';
import { indstillinger, lyt, reducerBevaegelse, saetIndstillinger, type Tekststoerrelse } from '../system/indstillinger';
import { forsinketGem } from '../system/lager';
import { AabenVisning, type Plads } from './AabenVisning';
import { Historik } from './historik';
import { indholdFor, type Fund } from './indhold';
import { begraens, graenser, standardKamera, tilBord, viserKontor, zoomOm, type Kamera } from './kamera';
import { Lup } from './Lup';
import {
  find,
  flyt,
  fremme,
  hentFraKurv,
  hoejesteZ,
  indeholder,
  kanKasseres,
  kasser,
  klamp,
  klampDrejning,
  lagISkuffe,
  rydOp,
  saetData,
  tagFraSkuffe,
  tilfoej,
  tilTop,
  type Bord,
  type Ting,
} from './model';
import { tingUrl } from './tingGrafik';
import './skrivebord.css';

interface AabenPost {
  id: string;
  plads: Plads;
  fra: DOMRect | null;
}

type Gestus =
  | { art: 'ingen' }
  | { art: 'bord'; t0: number; p0: Pt }
  | { art: 'fast'; id: string; t0: number; p0: Pt }
  | { art: 'ting'; id: string; el: HTMLElement; start: { x: number; y: number; rot: number }; nu: { x: number; y: number; rot: number }; p0: Pt; t0: number; flyttet: boolean }
  | { art: 'drej'; id: string; el: HTMLElement; start: { x: number; y: number; rot: number }; nu: { x: number; y: number; rot: number }; v0: number; c0: Pt }
  | { art: 'kamera'; k0: Kamera; d0: number; c0: Pt };

interface Pt {
  x: number;
  y: number;
}

export interface SkrivebordProps {
  start: Bord;
  /** Nøgle til at gemme opstillingen (pr. sag). */
  gemNoegle: string;
}

// Kontoret rundt om bordet (i bordenheder)
const KONTOR = { x: -1300, y: -1500, w: 3600, h: 4600 };

function transform(x: number, y: number, rot: number, loeftet = false) {
  return `translate(${x}px, ${y}px) rotate(${rot}deg)${loeftet ? ' scale(1.05)' : ''}`;
}

export function Skrivebord({ start, gemNoegle }: SkrivebordProps) {
  const [bord, setBordState] = useState<Bord>(start);
  const bordRef = useRef(bord);
  const historik = useRef(new Historik<Bord>(60));
  const [kanFortryde, setKanFortryde] = useState(false);
  const rammeRef = useRef<HTMLDivElement>(null);
  const verdenRef = useRef<HTMLDivElement>(null);
  const kam = useRef<Kamera>({ x: 0, y: 0, z: 0.4 });
  const [kontor, setKontor] = useState(false);
  const [aabne, setAabne] = useState<AabenPost[]>([]);
  const [panel, setPanel] = useState<null | 'kurv' | 'skuffe' | 'indstillinger'>(null);
  const [besked, setBesked] = useState<string | null>(null);
  const [lup, setLup] = useState<Pt | null>(null);
  const [hintNr, setHintNr] = useState(0);
  const [, setInd] = useState(indstillinger());
  const spor = useRef(new Map<number, Pt>());
  const g = useRef<Gestus>({ art: 'ingen' });
  const sidsteBordTryk = useRef(0);
  const gem = useMemo(() => forsinketGem(500), []);
  const tema = useMemo(() => tokens({ lys: indstillinger().dagNat ? lysFraKlokken() : 'dag', hoejKontrast: indstillinger().hoejKontrast }), []);
  const pladeUrl = useMemo(() => svgTilDataUrl(skrivebordsplade(tema, bord.w, bord.h, 1)), [tema, bord.w, bord.h]);
  const kontorUrl = useMemo(() => svgTilDataUrl(kontorGulv(tema, KONTOR.w, KONTOR.h, 1)), [tema]);

  useEffect(() => lyt((i) => setInd(i)), []);

  // ---------- tilstand
  const opdater = (nyt: Bord, fortrydelig = true) => {
    if (nyt === bordRef.current) return;
    if (fortrydelig) {
      historik.current.gem(bordRef.current);
      setKanFortryde(true);
    }
    bordRef.current = nyt;
    setBordState(nyt);
    gem(gemNoegle, nyt);
  };

  const fortryd = () => {
    const forrige = historik.current.fortryd();
    if (!forrige) return;
    bordRef.current = forrige;
    setBordState(forrige);
    setKanFortryde(historik.current.antal > 0);
    gem(gemNoegle, forrige);
    foel('papir', 'klik');
    vis('Fortrudt');
  };

  const vis = (tekst: string) => {
    setBesked(tekst);
    clearTimeout((vis as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (vis as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(() => setBesked(null), 2200);
  };

  // ---------- kamera
  const udsnit = () => {
    const r = rammeRef.current!;
    return { w: r.clientWidth, h: r.clientHeight, top: 8, bund: 72 };
  };
  const anvendKamera = (k: Kamera, anim = false) => {
    kam.current = k;
    const v = verdenRef.current;
    if (!v) return;
    v.style.transition = anim && !reducerBevaegelse() ? 'transform 280ms ease-out' : 'none';
    v.style.transform = `translate(${k.x}px, ${k.y}px) scale(${k.z})`;
    rammeRef.current?.style.setProperty('--zoom', String(k.z));
  };
  const nulstilKamera = (anim = true) => {
    const k = standardKamera(udsnit(), bordRef.current.w, bordRef.current.h);
    anvendKamera(k, anim);
    setKontor(false);
  };

  useLayoutEffect(() => {
    nulstilKamera(false);
    const ro = new ResizeObserver(() => {
      anvendKamera(begraens(kam.current, udsnit(), bordRef.current.w, bordRef.current.h));
    });
    ro.observe(rammeRef.current!);
    // iOS Safari: stop browserens egen knib-zoom
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop);
    document.addEventListener('gesturechange', stop);
    // langt tryk må ikke åbne browserens menu (vi bruger det til at fastgøre)
    const menu = (e: Event) => {
      if (!(e.target as Element).closest?.('textarea, input')) e.preventDefault();
    };
    document.addEventListener('contextmenu', menu);
    return () => {
      ro.disconnect();
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('gesturechange', stop);
      document.removeEventListener('contextmenu', menu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- hjælpere
  const tingEl = (id: string) => rammeRef.current?.querySelector(`.ting[data-id="${CSS.escape(id)}"]`) as HTMLElement | null;
  const lokal = (e: PointerEvent): Pt => {
    const r = rammeRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const slipMaal = (p: Pt, id: string): Ting | undefined => {
    const b = tilBord(kam.current, p.x, p.y);
    return fremme(bordRef.current).find(
      (t) => t.id !== id && (t.slags === 'papirkurv' || t.slags === 'skuffe') && indeholder({ ...t, w: t.w + 40, h: t.h + 40, x: t.x - 20, y: t.y - 20 }, b.x, b.y),
    );
  };
  const markerMaal = (m: Ting | undefined) => {
    rammeRef.current?.querySelectorAll('.ting.maal').forEach((el) => el.classList.remove('maal'));
    if (m) tingEl(m.id)?.classList.add('maal');
  };

  // ---------- åbn og luk
  const aaben = (t: Ting) => {
    if (t.kanAabnes === false) {
      foel(null, 'klik');
      vis(t.beskrivelse ?? '');
      return;
    }
    if (aabne.some((a) => a.id === t.id)) return;
    const fra = tingEl(t.id)?.getBoundingClientRect() ?? null;
    setAabne((liste) => {
      const top = liste.find((a) => a.plads === 'top');
      const bund = liste.find((a) => a.plads === 'bund');
      if (top && !bund) return [...liste, { id: t.id, plads: 'bund', fra }];
      if (bund && !top) return [...liste, { id: t.id, plads: 'top', fra }];
      if (top && bund) return [...liste.filter((a) => a !== bund), { id: t.id, plads: 'bund', fra }];
      return [{ id: t.id, plads: 'fuld', fra }];
    });
  };
  const lukket = (id: string) => {
    setAabne((l) => {
      const rest = l.filter((a) => a.id !== id);
      if (rest.length === 0) setLup(null);
      return rest;
    });
  };
  const saetPlads = (id: string, plads: Plads) => {
    setAabne((l) => {
      const andre = l.filter((a) => a.id !== id);
      if (plads === 'fuld') return [{ ...l.find((a) => a.id === id)!, plads, fra: null }];
      const modsat: Plads = plads === 'top' ? 'bund' : 'top';
      return [...andre.map((a) => ({ ...a, plads: modsat, fra: null })).slice(0, 1), { ...l.find((a) => a.id === id)!, plads, fra: null }];
    });
  };

  const fastgoer = (tekst: string, kilde: string) => {
    const nb = bordRef.current.ting.find((t) => t.slags === 'notesblok');
    if (!nb) return;
    const fund = ((nb.data?.fund as Fund[]) ?? []).filter((f) => f.tekst !== tekst);
    opdater(saetData(bordRef.current, nb.id, { fund: [...fund, { tekst, kilde }] }));
    vis('Fastgjort i notesblokken');
  };

  const udtag = (mappeId: string, side: number) => {
    const b = bordRef.current;
    const m = find(b, mappeId);
    if (!m) return;
    const ark = [...((m.data?.ark as string[]) ?? [])];
    if (ark.length < 2) return;
    const [arkId] = ark.splice(side, 1);
    let nyt = saetData(b, mappeId, { ark, side: 0 });
    const s = String(m.data?.sag ?? 'sag1');
    nyt = tilfoej(nyt, {
      id: `ark-${arkId}-${Date.now().toString(36)}`,
      slags: 'ark',
      x: m.x + 60,
      y: m.y + 80,
      w: 260,
      h: 340,
      rot: 4,
      z: 0,
      etiket: arkId === 'kunde' ? sag(s).kunde.navn : undefined,
      beskrivelse: 'Løst ark fra mappen',
      data: arkId === 'kunde' ? { sag: s, kundeark: 'ja' } : { sag: s, dokument: arkId },
    });
    opdater(nyt);
    setAabne((l) => l.filter((a) => a.id !== mappeId));
    foel('papir', 'laeg');
    vis('Arket ligger nu på bordet');
  };

  // ---------- bevægelser på bordet
  const ned = (e: PointerEvent) => {
    laasLydOp();
    if ((e.target as Element).closest('.ui')) return;
    rammeRef.current!.setPointerCapture(e.pointerId);
    const p = lokal(e);
    spor.current.set(e.pointerId, p);
    const gg = g.current;
    if (spor.current.size === 1) {
      const el = (e.target as Element).closest('.ting') as HTMLElement | null;
      const t = el ? find(bordRef.current, el.dataset.id!) : undefined;
      if (el && t) {
        if (t.fast) {
          g.current = { art: 'fast', id: t.id, t0: performance.now(), p0: p };
        } else {
          const z = hoejesteZ(bordRef.current) + 1;
          el.style.zIndex = String(z);
          opdater(tilTop(bordRef.current, t.id), false);
          const st = { x: t.x, y: t.y, rot: t.rot };
          g.current = { art: 'ting', id: t.id, el, start: st, nu: { ...st }, p0: p, t0: performance.now(), flyttet: false };
        }
      } else {
        g.current = { art: 'bord', t0: performance.now(), p0: p };
      }
    } else if (spor.current.size === 2) {
      const [a, b] = [...spor.current.values()];
      if (gg.art === 'ting' || gg.art === 'drej') {
        const nu = gg.nu;
        gg.el.classList.add('loeftet');
        g.current = {
          art: 'drej',
          id: gg.id,
          el: gg.el,
          start: { ...nu },
          nu: { ...nu },
          v0: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
          c0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        };
      } else {
        g.current = { art: 'kamera', k0: { ...kam.current }, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, c0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      }
    }
  };

  const bevaeg = (e: PointerEvent) => {
    if (!spor.current.has(e.pointerId)) return;
    const p = lokal(e);
    spor.current.set(e.pointerId, p);
    const gg = g.current;
    const b = bordRef.current;
    switch (gg.art) {
      case 'ting': {
        const dx = p.x - gg.p0.x;
        const dy = p.y - gg.p0.y;
        if (!gg.flyttet) {
          if (Math.hypot(dx, dy) < 7) return;
          gg.flyttet = true;
          gg.el.classList.add('loeftet');
          foel('papir', null);
        }
        const t = find(b, gg.id)!;
        const pos = klamp(b, t, gg.start.x + dx / kam.current.z, gg.start.y + dy / kam.current.z);
        gg.nu = { ...pos, rot: gg.start.rot };
        gg.el.style.transform = transform(pos.x, pos.y, gg.start.rot, true);
        markerMaal(slipMaal(p, gg.id));
        break;
      }
      case 'drej': {
        const [a, c] = [...spor.current.values()];
        if (!c) return;
        const t = find(b, gg.id)!;
        const v = (Math.atan2(c.y - a.y, c.x - a.x) * 180) / Math.PI;
        let dv = v - gg.v0;
        if (dv > 180) dv -= 360;
        if (dv < -180) dv += 360;
        const centrum = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
        const pos = klamp(b, t, gg.start.x + (centrum.x - gg.c0.x) / kam.current.z, gg.start.y + (centrum.y - gg.c0.y) / kam.current.z);
        gg.nu = { ...pos, rot: klampDrejning(gg.start.rot + dv) };
        gg.el.style.transform = transform(pos.x, pos.y, gg.nu.rot, true);
        break;
      }
      case 'kamera': {
        const [a, c] = [...spor.current.values()];
        if (!c) return;
        const d = Math.hypot(a.x - c.x, a.y - c.y);
        const centrum = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
        const u = udsnit();
        const gr = graenser(u, b.w, b.h);
        const z = Math.max(gr.min, Math.min(gr.max, (gg.k0.z * d) / gg.d0));
        const k1 = zoomOm(gg.k0, z, gg.c0.x, gg.c0.y);
        const k2 = { z, x: k1.x + centrum.x - gg.c0.x, y: k1.y + centrum.y - gg.c0.y };
        anvendKamera(begraens(k2, u, b.w, b.h));
        rammeRef.current!.classList.toggle('viser-kontor', viserKontor(kam.current, u, b.w, b.h));
        break;
      }
    }
  };

  const slip = (e: PointerEvent) => {
    if (!spor.current.has(e.pointerId)) return;
    spor.current.delete(e.pointerId);
    const annulleret = e.type === 'pointercancel';
    const gg = g.current;
    const p = lokal(e);
    const tryk = (t0: number, p0: Pt) => !annulleret && performance.now() - t0 < 450 && Math.hypot(p.x - p0.x, p.y - p0.y) < 10;
    switch (gg.art) {
      case 'ting': {
        gg.el.classList.remove('loeftet');
        markerMaal(undefined);
        if (!gg.flyttet) {
          if (tryk(gg.t0, gg.p0)) {
            const t = find(bordRef.current, gg.id);
            if (t) aaben(t);
          }
          break;
        }
        const maal = annulleret ? undefined : slipMaal(p, gg.id);
        const t = find(bordRef.current, gg.id)!;
        if (maal?.slags === 'papirkurv') {
          if (kanKasseres(t)) {
            opdater(kasser(flyt(bordRef.current, gg.id, gg.nu.x, gg.nu.y, gg.nu.rot), gg.id));
            foel('kurv', 'laeg');
            vis('Lagt i papirkurven. Tryk på Fortryd for at hente den igen.');
            break;
          }
          vis('Den skal ikke i papirkurven.');
        } else if (maal?.slags === 'skuffe') {
          opdater(lagISkuffe(flyt(bordRef.current, gg.id, gg.nu.x, gg.nu.y, gg.nu.rot), gg.id));
          foel('skuffe', 'laeg');
          vis('Lagt i skuffen');
          break;
        } else if (t.slags === 'lup' && !annulleret && document.elementsFromPoint(e.clientX, e.clientY).some((el) => el.classList.contains('aaben-flade'))) {
          // luppen trukket hen over et åbent dokument
          setLup({ x: e.clientX, y: e.clientY });
          gg.el.style.transform = transform(t.x, t.y, t.rot);
          break;
        }
        opdater(flyt(bordRef.current, gg.id, gg.nu.x, gg.nu.y, gg.nu.rot));
        foel(null, 'laeg');
        break;
      }
      case 'drej':
        if (spor.current.size === 0 || spor.current.size === 1) {
          gg.el.classList.remove('loeftet');
          opdater(flyt(bordRef.current, gg.id, gg.nu.x, gg.nu.y, gg.nu.rot));
          foel(null, 'laeg');
          g.current = { art: 'ingen' };
        }
        break;
      case 'fast':
        if (tryk(gg.t0, gg.p0)) trykPaaFast(gg.id);
        break;
      case 'bord': {
        if (tryk(gg.t0, gg.p0)) {
          const nu = performance.now();
          if (nu - sidsteBordTryk.current < 330) {
            nulstilKamera();
            sidsteBordTryk.current = 0;
          } else sidsteBordTryk.current = nu;
        }
        break;
      }
      case 'kamera':
        if (spor.current.size < 2) {
          const u = udsnit();
          setKontor(viserKontor(kam.current, u, bordRef.current.w, bordRef.current.h));
          g.current = { art: 'ingen' };
        }
        break;
    }
    if (spor.current.size === 0) g.current = { art: 'ingen' };
  };

  const hjul = (e: WheelEvent) => {
    e.preventDefault();
    const r = rammeRef.current!.getBoundingClientRect();
    const u = udsnit();
    const gr = graenser(u, bordRef.current.w, bordRef.current.h);
    const z = Math.max(gr.min, Math.min(gr.max, kam.current.z * Math.exp(-e.deltaY * 0.0015)));
    anvendKamera(begraens(zoomOm(kam.current, z, e.clientX - r.left, e.clientY - r.top), u, bordRef.current.w, bordRef.current.h));
    setKontor(viserKontor(kam.current, u, bordRef.current.w, bordRef.current.h));
  };
  useEffect(() => {
    const r = rammeRef.current!;
    r.addEventListener('wheel', hjul, { passive: false });
    return () => r.removeEventListener('wheel', hjul);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trykPaaFast = (id: string) => {
    const t = find(bordRef.current, id);
    if (!t) return;
    foel(t.slags === 'skuffe' ? 'skuffe' : null, 'klik');
    switch (t.slags) {
      case 'papirkurv':
        setPanel('kurv');
        break;
      case 'skuffe':
        setPanel('skuffe');
        break;
      case 'lampe': {
        const hints = sag('sag1').hints;
        vis(hints[Math.min(hintNr, hints.length - 1)]);
        setHintNr((n) => Math.min(n + 1, hints.length - 1));
        break;
      }
      case 'indbakke':
        vis('Indbakken er tom lige nu.');
        break;
    }
  };

  // ---------- visning
  const synlige = fremme(bord);
  const harLup = synlige.some((t) => t.slags === 'lup');
  const nb = bord.ting.find((t) => t.slags === 'notesblok');
  const ktx = {
    fund: (nb?.data?.fund as Fund[]) ?? [],
    noter: (nb?.data?.noter as string) ?? '',
    erindringer: (nb?.data?.erindringer as string[]) ?? [],
    saetNoter: (s: string) => nb && opdater(saetData(bordRef.current, nb.id, { noter: s }), false),
  };
  const fuld = aabne.some((a) => a.plads === 'fuld');
  const kassede = bord.ting.filter((t) => t.kassert);
  const iSkuffe = bord.ting.filter((t) => t.iSkuffe);

  return (
    <div
      ref={rammeRef}
      class={`skrivebord ${kontor ? 'viser-kontor' : ''} ${aabne.length ? 'har-aaben' : ''} ${fuld ? 'har-fuld' : ''}`}
      onPointerDown={ned}
      onPointerMove={bevaeg}
      onPointerUp={slip}
      onPointerCancel={slip}
    >
      <div ref={verdenRef} class="verden">
        <img class="kontor" src={kontorUrl} alt="" draggable={false} style={{ left: `${KONTOR.x}px`, top: `${KONTOR.y}px`, width: `${KONTOR.w}px`, height: `${KONTOR.h}px` }} />
        <img class="plade" src={pladeUrl} alt="" draggable={false} style={{ width: `${bord.w}px`, height: `${bord.h}px` }} />
        {synlige.map((t) => (
          <div
            key={t.id}
            class={`ting slags-${t.slags} ${t.fast ? 'fast' : ''} ${t.form === 'rund' ? 'rund' : ''} ${aabne.some((a) => a.id === t.id) ? 'er-aaben' : ''}`}
            data-id={t.id}
            role="button"
            aria-label={t.beskrivelse ?? t.etiket ?? t.slags}
            style={{ width: `${t.w}px`, height: `${t.h}px`, transform: transform(t.x, t.y, t.rot), zIndex: String(t.fast ? 1 : t.z + 2) }}
          >
            <img src={tingUrl(t, tema)} alt="" draggable={false} />
            {t.etiket && <span class="etiket">{t.etiket}</span>}
          </div>
        ))}
      </div>

      {/* knapper */}
      <div class="ui knapper-bund">
        <Knap class="rund-knap" onTryk={fortryd} disabled={!kanFortryde} aria-label="Fortryd" title="Fortryd">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H4V2" /><path d="M4.5 7A8 8 0 1 1 6 18" /></svg>
        </Knap>
        <Knap
          class="tekst-knap"
          onTryk={() => {
            opdater(rydOp(bordRef.current));
            foel('papir', 'laeg');
          }}
        >
          Ryd op
        </Knap>
        <span class="fyld" />
        <Knap class="rund-knap" onTryk={() => setPanel(panel === 'indstillinger' ? null : 'indstillinger')} aria-label="Indstillinger" title="Indstillinger">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
          </svg>
        </Knap>
      </div>

      {/* åbne ting */}
      {aabne.length > 0 && (
        <div class={`ui aaben-lag ${fuld ? 'daempet' : 'delt'}`}>
          {fuld && <div class="daemper" />}
          {aabne.map((a) => {
            const t = find(bord, a.id);
            if (!t) return null;
            const ind =
              t.slags === 'ark' && t.data?.kundeark
                ? indholdFor({ ...t, slags: 'mappe', data: { sag: t.data.sag, ark: ['kunde'] } }, ktx)
                : indholdFor(t, ktx);
            return (
              <AabenVisning
                key={a.id}
                ting={t}
                indhold={ind}
                plads={a.plads}
                fra={a.fra}
                tilRect={() => tingEl(a.id)?.getBoundingClientRect() ?? null}
                startSide={Number(t.data?.side ?? 0)}
                onSide={(s) => {
                  if (Number(find(bordRef.current, a.id)?.data?.side ?? 0) !== s) opdater(saetData(bordRef.current, a.id, { side: s }), false);
                }}
                onLukket={() => lukket(a.id)}
                onPlads={(pl) => saetPlads(a.id, pl)}
                onFastgoer={fastgoer}
                onUdtag={t.slags === 'mappe' ? (s) => udtag(t.id, s) : undefined}
                harLup={harLup}
                lupAktiv={!!lup}
                onLup={() => {
                  if (lup) setLup(null);
                  else {
                    const r = rammeRef.current!.querySelector(`.aaben-panel[data-ting="${CSS.escape(a.id)}"] .aaben-flade`)!.getBoundingClientRect();
                    setLup({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                    foel('lup', 'laeg');
                  }
                }}
              />
            );
          })}
          {lup && <Lup x={lup.x} y={lup.y} onFlyt={(x, y) => setLup({ x, y })} />}
        </div>
      )}

      {/* papirkurv, skuffe, indstillinger */}
      {panel && (
        <div class="ui ark-lag" onClick={(e) => e.target === e.currentTarget && setPanel(null)}>
          <section class="ark-panel" role="dialog" aria-label={panel === 'kurv' ? 'Papirkurven' : panel === 'skuffe' ? 'Skuffen' : 'Indstillinger'}>
            <header>
              <h2>{panel === 'kurv' ? 'Papirkurven' : panel === 'skuffe' ? 'Skuffen' : 'Indstillinger'}</h2>
              <Knap class="ikon-knap" onTryk={() => setPanel(null)} aria-label="Luk">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </Knap>
            </header>
            {panel === 'indstillinger' ? (
              <IndstillingerPanel />
            ) : (
              <ul class="beholder">
                {(panel === 'kurv' ? kassede : iSkuffe).length === 0 && <li class="tom">{panel === 'kurv' ? 'Papirkurven er tom.' : 'Skuffen er tom.'}</li>}
                {(panel === 'kurv' ? kassede : iSkuffe).map((t) => (
                  <li>
                    <img src={tingUrl(t, tema)} alt="" />
                    <span>{t.beskrivelse ?? t.etiket}</span>
                    <Knap
                      class="tekst-knap"
                      onTryk={() => {
                        opdater(panel === 'kurv' ? hentFraKurv(bordRef.current, t.id) : tagFraSkuffe(bordRef.current, t.id));
                        foel(panel === 'skuffe' ? 'skuffe' : 'papir', 'laeg');
                        setPanel(null);
                      }}
                    >
                      Læg på bordet
                    </Knap>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {besked && (
        <div class="ui besked" role="status" aria-live="polite">
          {besked}
        </div>
      )}
    </div>
  );
}


function IndstillingerPanel() {
  const [i, setI] = useState(indstillinger());
  useEffect(() => lyt(setI), []);
  const knap = (navn: keyof typeof i, tekst: string) => (
    <label class="kontakt">
      <input type="checkbox" id={`ind-${navn}`} checked={Boolean(i[navn])} onChange={(e) => saetIndstillinger({ [navn]: (e.target as HTMLInputElement).checked })} />
      <span>{tekst}</span>
    </label>
  );
  return (
    <div class="indstillinger">
      <fieldset>
        <legend>Tekststørrelse</legend>
        {(['normal', 'stor', 'ekstra_stor'] as Tekststoerrelse[]).map((s) => (
          <label class="valg">
            <input type="radio" name="tekst" id={`tekst-${s}`} checked={i.tekststoerrelse === s} onChange={() => saetIndstillinger({ tekststoerrelse: s })} />
            <span>{{ normal: 'Normal', stor: 'Stor', ekstra_stor: 'Ekstra stor' }[s]}</span>
          </label>
        ))}
      </fieldset>
      {knap('hoejKontrast', 'Høj kontrast')}
      {knap('laesevenligSkrift', 'Læsevenlig skrifttype')}
      {knap('reducerBevaegelse', 'Reducer bevægelse')}
      {knap('vibration', 'Vibration')}
      {knap('dagNat', 'Dag og nat')}
      {knap('effekter', 'Lydeffekter')}
      {knap('musik', 'Musik')}
    </div>
  );
}
