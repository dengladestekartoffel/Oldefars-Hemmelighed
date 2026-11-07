// En åben ting: fylder det meste af skærmen (eller den øverste/nederste halvdel).
// Bevægelser: bladr (swipe vandret), luk (swipe ned / knib sammen / ✕),
// zoom (knib) og panorér (træk, når der er zoomet ind), vend foto (dobbelttryk),
// fastgør (tryk og hold på en linje).

import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Knap } from '../ui/Knap';
import { foel } from '../system/foel';
import { reducerBevaegelse } from '../system/indstillinger';
import type { AabenIndhold } from './indhold';
import type { Ting } from './model';

export type Plads = 'fuld' | 'top' | 'bund';

export interface AabenProps {
  ting: Ting;
  indhold: AabenIndhold;
  plads: Plads;
  /** Hvor tingen lå på skærmen, da den blev åbnet (til animationen). */
  fra: DOMRect | null;
  /** Hvor tingen ligger nu (til lukke-animationen). */
  tilRect: () => DOMRect | null;
  startSide?: number;
  onSide?: (side: number) => void;
  onLukket: () => void;
  onPlads: (p: Plads) => void;
  onFastgoer: (tekst: string, kilde: string) => void;
  onUdtag?: (side: number) => void;
  harLup: boolean;
  lupAktiv: boolean;
  onLup: () => void;
}

const HOLD_MS = 550;
const TAERSKEL = 8;

/** Fortæller luppen, at indholdet har ændret sig (side, zoom, vending). */
export function meldAendring(): void {
  window.dispatchEvent(new CustomEvent('aaben-aendret'));
}

interface Zoom {
  s: number;
  x: number;
  y: number;
}

type Art = 'ingen' | 'vent' | 'pan' | 'blad' | 'luk' | 'knib' | 'holdt';

export function AabenVisning(p: AabenProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fladeRef = useRef<HTMLDivElement>(null);
  const rammeRef = useRef<HTMLDivElement>(null);
  const antal = p.indhold.sider.length;
  const [side, setSide] = useState(Math.min(p.startSide ?? 0, antal - 1));
  const [flip, setFlip] = useState<{ retning: 1 | -1; p: number; anim: boolean } | null>(null);
  const [vendt, setVendt] = useState(false);
  const [lukker, setLukker] = useState(false);
  const zoom = useRef<Zoom>({ s: 1, x: 0, y: 0 });
  const kortSpor = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{
    art: Art;
    p0: { x: number; y: number };
    t0: number;
    z0: Zoom;
    d0: number;
    c0: { x: number; y: number };
    maal: Element | null;
    holdTimer?: ReturnType<typeof setTimeout>;
    sidsteTryk?: { t: number; x: number; y: number };
    knibStart?: number;
  }>({ art: 'ingen', p0: { x: 0, y: 0 }, t0: 0, z0: { s: 1, x: 0, y: 0 }, d0: 1, c0: { x: 0, y: 0 }, maal: null });
  const reduceret = reducerBevaegelse();
  const varighed = reduceret ? 90 : 220;

  // ---------- åbne-animation (FLIP fra tingens plads på bordet)
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (!p.fra || reduceret) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: varighed, easing: 'ease-out' });
      return;
    }
    const til = el.getBoundingClientRect();
    const sx = p.fra.width / til.width;
    const sy = p.fra.height / til.height;
    const dx = p.fra.left - til.left;
    const dy = p.fra.top - til.top;
    el.animate(
      [
        { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.4 },
        { transformOrigin: '0 0', transform: 'none', opacity: 1 },
      ],
      { duration: varighed + 40, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    foel(p.indhold.art === 'bog' ? 'bog_aaben' : 'papir', 'klik');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- luk med animation tilbage til bordet
  const luk = () => {
    if (lukker) return;
    setLukker(true);
    const el = panelRef.current;
    const til = p.tilRect();
    foel(p.indhold.art === 'bog' ? 'bog_luk' : 'papir', 'laeg');
    if (!el) return p.onLukket();
    const fra = el.getBoundingClientRect();
    const start = el.style.transform || 'none';
    const slut =
      til && !reduceret
        ? `translate(${til.left - fra.left}px, ${til.top - fra.top}px) scale(${til.width / fra.width}, ${til.height / fra.height})`
        : start;
    const a = el.animate(
      [
        { transformOrigin: '0 0', transform: start, opacity: Number(el.style.opacity || 1) },
        { transformOrigin: '0 0', transform: slut, opacity: 0 },
      ],
      { duration: varighed, easing: 'ease-in', fill: 'forwards' },
    );
    a.onfinish = () => p.onLukket();
  };

  // ---------- zoom og panorering
  const maal = () => {
    const f = fladeRef.current!;
    const r = rammeRef.current!;
    return { W: f.clientWidth, H: f.clientHeight, cw: r.offsetWidth, ch: r.offsetHeight };
  };
  const klampZoom = (z: Zoom, blid = false): Zoom => {
    const { W, H, cw, ch } = maal();
    const bw = cw * z.s;
    const bh = ch * z.s;
    const kx = bw <= W ? (W - bw) / 2 : Math.min(0, Math.max(W - bw, z.x));
    const ky = bh <= H ? (z.s < 1 ? (H - bh) / 2 : 0) : Math.min(0, Math.max(H - bh, z.y));
    return blid ? { s: z.s, x: z.x, y: z.y } : { s: z.s, x: kx, y: ky };
  };
  const anvendZoom = (z: Zoom, anim = false) => {
    zoom.current = z;
    const r = rammeRef.current;
    if (!r) return;
    r.style.transition = anim ? `transform ${varighed}ms ease-out` : 'none';
    r.style.transform = `translate(${z.x}px, ${z.y}px) scale(${z.s})`;
  };
  const nulstilZoom = () => anvendZoom({ s: 1, x: 0, y: 0 });

  useEffect(() => {
    nulstilZoom();
    p.onSide?.(side);
    meldAendring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side]);
  useEffect(() => meldAendring(), [vendt, p.plads]);

  // ---------- sidevending
  const gaaTil = (ny: number) => {
    if (ny === side || ny < 0 || ny >= antal) return;
    const retning: 1 | -1 = ny > side ? 1 : -1;
    foel('side', 'side');
    if (reduceret) {
      setSide(ny);
      return;
    }
    setFlip({ retning, p: 0, anim: false });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setFlip({ retning, p: 1, anim: true });
        setTimeout(() => {
          setSide(ny);
          setFlip(null);
        }, varighed);
      }),
    );
  };

  const slutFlip = (fp: { retning: 1 | -1; p: number }, hurtig: boolean) => {
    const igennem = fp.p > 0.3 || (hurtig && fp.p > 0.08);
    setFlip({ ...fp, p: igennem ? 1 : 0, anim: true });
    if (igennem) foel('side', 'side');
    setTimeout(() => {
      if (igennem) setSide((s) => Math.max(0, Math.min(antal - 1, s + fp.retning)));
      setFlip(null);
    }, varighed);
  };

  // ---------- bevægelser på fladen
  const ned = (e: PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    kortSpor.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const gg = g.current;
    if (kortSpor.current.size === 1) {
      gg.art = 'vent';
      gg.p0 = { x: e.clientX, y: e.clientY };
      gg.t0 = performance.now();
      gg.z0 = { ...zoom.current };
      gg.maal = e.target as Element;
      clearTimeout(gg.holdTimer);
      gg.holdTimer = setTimeout(() => {
        if (gg.art !== 'vent') return;
        const el = gg.maal?.closest('[data-fastgoer]') as HTMLElement | null;
        if (!el) return;
        gg.art = 'holdt';
        el.classList.add('fastgjort');
        setTimeout(() => el.classList.remove('fastgjort'), 900);
        p.onFastgoer(el.dataset.fastgoer || el.textContent || '', p.indhold.titel);
        foel('papir', 'fastgoer');
      }, HOLD_MS);
    } else if (kortSpor.current.size === 2) {
      clearTimeout(gg.holdTimer);
      if (flip) return;
      const [a, b] = [...kortSpor.current.values()];
      const fr = fladeRef.current!.getBoundingClientRect();
      gg.art = 'knib';
      gg.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      gg.c0 = { x: (a.x + b.x) / 2 - fr.left, y: (a.y + b.y) / 2 - fr.top };
      gg.z0 = { ...zoom.current };
    }
  };

  const flyt = (e: PointerEvent) => {
    if (!kortSpor.current.has(e.pointerId)) return;
    e.stopPropagation();
    kortSpor.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const gg = g.current;
    const dx = e.clientX - gg.p0.x;
    const dy = e.clientY - gg.p0.y;
    if (gg.art === 'vent' && Math.hypot(dx, dy) > TAERSKEL) {
      clearTimeout(gg.holdTimer);
      const { H, ch } = maal();
      const z = zoom.current;
      if (z.s > 1.02) gg.art = 'pan';
      else if (Math.abs(dx) > Math.abs(dy) && antal > 1 && p.indhold.art !== 'foto') gg.art = 'blad';
      else if (dy > 0 && Math.abs(dy) > Math.abs(dx) && z.y >= -1) gg.art = 'luk';
      else if (ch * z.s > H + 1) gg.art = 'pan';
      else gg.art = 'ingen';
      if ((window as unknown as { __dbg?: boolean }).__dbg) console.log('gestus', gg.art, Math.round(dx), Math.round(dy));
    }
    switch (gg.art) {
      case 'pan':
        anvendZoom(klampZoom({ s: gg.z0.s, x: gg.z0.x + dx, y: gg.z0.y + dy }));
        break;
      case 'blad': {
        const W = fladeRef.current!.clientWidth;
        const retning: 1 | -1 = dx < 0 ? 1 : -1;
        if ((retning === 1 && side >= antal - 1) || (retning === -1 && side <= 0)) {
          setFlip(null);
          break;
        }
        setFlip({ retning, p: Math.min(1, Math.abs(dx) / W), anim: false });
        break;
      }
      case 'luk': {
        const el = panelRef.current!;
        const y = Math.max(0, dy);
        el.style.transform = `translateY(${y}px) scale(${1 - Math.min(0.12, y / 2000)})`;
        el.style.opacity = String(1 - Math.min(0.5, y / 600));
        break;
      }
      case 'knib': {
        const [a, b] = [...kortSpor.current.values()];
        if (!b) break;
        const fr = fladeRef.current!.getBoundingClientRect();
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const c = { x: (a.x + b.x) / 2 - fr.left, y: (a.y + b.y) / 2 - fr.top };
        const s = Math.max(0.45, Math.min(4, (gg.z0.s * d) / gg.d0));
        // punktet under fingrene bliver liggende og følger fingrene
        const x = c.x - ((gg.c0.x - gg.z0.x) * s) / gg.z0.s;
        const y = c.y - ((gg.c0.y - gg.z0.y) * s) / gg.z0.s;
        anvendZoom(s >= 1 ? klampZoom({ s, x, y }) : { s, x, y });
        if (s < 0.95 && gg.z0.s <= 1.05) panelRef.current!.style.opacity = String(Math.max(0.4, s));
        break;
      }
    }
  };

  const op = (e: PointerEvent) => {
    if (!kortSpor.current.has(e.pointerId)) return;
    e.stopPropagation();
    kortSpor.current.delete(e.pointerId);
    const gg = g.current;
    clearTimeout(gg.holdTimer);
    const dx = e.clientX - gg.p0.x;
    const dy = e.clientY - gg.p0.y;
    const dt = performance.now() - gg.t0;
    const annulleret = e.type === 'pointercancel';
    switch (gg.art) {
      case 'vent': {
        if (annulleret || kortSpor.current.size > 0) break;
        const nu = performance.now();
        const s = gg.sidsteTryk;
        if (s && nu - s.t < 330 && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 30) {
          gg.sidsteTryk = undefined;
          dobbeltTryk(e.clientX, e.clientY);
        } else {
          gg.sidsteTryk = { t: nu, x: e.clientX, y: e.clientY };
        }
        break;
      }
      case 'blad':
        if (flip) slutFlip(flip, Math.abs(dx) / Math.max(dt, 1) > 0.6);
        break;
      case 'luk': {
        const el = panelRef.current!;
        if (!annulleret && (dy > 110 || (dy > 40 && dy / Math.max(dt, 1) > 0.6))) {
          luk();
        } else {
          el.animate([{ transform: el.style.transform, opacity: el.style.opacity || '1' }, { transform: 'none', opacity: '1' }], {
            duration: varighed,
            easing: 'ease-out',
          });
          el.style.transform = '';
          el.style.opacity = '';
        }
        break;
      }
      case 'knib': {
        if (kortSpor.current.size > 0) {
          // én finger er stadig nede: fortsæt som panorering, afslut zoomen når den løftes
          const [rest] = [...kortSpor.current.values()];
          gg.knibStart = gg.knibStart ?? gg.z0.s;
          gg.art = 'pan';
          gg.p0 = { ...rest };
          gg.z0 = { ...zoom.current };
          return;
        }
        afslutKnib(gg.z0.s);
        break;
      }
      case 'pan':
        if (kortSpor.current.size === 0 && gg.knibStart !== undefined) afslutKnib(gg.knibStart);
        else meldAendring();
        break;
    }
    if (kortSpor.current.size === 0) {
      gg.art = 'ingen';
      gg.knibStart = undefined;
    }
  };

  /** Efter et knib: luk ved stort knib sammen, ellers ret zoomen til (mindst 100 %). */
  const afslutKnib = (startSkala: number) => {
    const z = zoom.current;
    if (z.s < 0.8 && startSkala <= 1.05) {
      luk();
      return;
    }
    if (panelRef.current) panelRef.current.style.opacity = '';
    // tæt på 100 %: ret helt til, så swipe til at bladre og lukke virker igen
    const s2 = z.s < 1.12 ? 1 : z.s;
    anvendZoom(klampZoom(s2 === 1 ? { s: 1, x: 0, y: z.s < 1 ? 0 : Math.min(0, z.y) } : { ...z, s: s2 }), true);
    setTimeout(meldAendring, varighed + 10);
  };

  const dobbeltTryk = (cx: number, cy: number) => {
    if (p.indhold.art === 'foto' && p.indhold.bagside) {
      setVendt((v) => !v);
      foel('papir', 'klik');
      return;
    }
    const fr = fladeRef.current!.getBoundingClientRect();
    const z = zoom.current;
    if (z.s > 1.05) anvendZoom({ s: 1, x: 0, y: 0 }, true);
    else {
      const s = 2.2;
      const lx = cx - fr.left;
      const ly = cy - fr.top;
      anvendZoom(klampZoom({ s, x: lx - ((lx - z.x) * s) / z.s, y: ly - ((ly - z.y) * s) / z.s }), true);
    }
    setTimeout(meldAendring, varighed + 10);
  };

  // ---------- træk i overskriften: læg øverst / nederst
  const hovedSpor = useRef<{ id: number; y0: number; t0: number } | null>(null);
  const hovedNed = (e: PointerEvent) => {
    if ((e.target as Element).closest('button')) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    hovedSpor.current = { id: e.pointerId, y0: e.clientY, t0: performance.now() };
  };
  const hovedFlyt = (e: PointerEvent) => {
    const h = hovedSpor.current;
    if (!h || h.id !== e.pointerId) return;
    e.stopPropagation();
    panelRef.current!.style.transform = `translateY(${e.clientY - h.y0}px)`;
  };
  const hovedOp = (e: PointerEvent) => {
    const h = hovedSpor.current;
    if (!h || h.id !== e.pointerId) return;
    e.stopPropagation();
    hovedSpor.current = null;
    const el = panelRef.current!;
    const dy = e.clientY - h.y0;
    if (Math.abs(dy) < 10) {
      el.style.transform = '';
      return;
    }
    const r = el.getBoundingClientRect();
    const midt = (r.top + r.bottom) / 2 / window.innerHeight;
    el.style.transform = '';
    if (p.plads === 'bund' && dy > 80 && midt > 0.9) return luk();
    if (p.plads !== 'bund' && dy > 0 && midt > 0.92) return luk();
    const ny: Plads = midt < 0.36 ? 'top' : midt > 0.64 ? 'bund' : 'fuld';
    if (ny !== p.plads) {
      p.onPlads(ny);
      foel('papir', 'laeg');
    }
  };

  // ---------- visning af sider
  const Side = (i: number) => p.indhold.sider[i]?.indhold();
  const fl = flip;
  const flipStil = (vinkel: number, anim: boolean) => ({
    transform: `rotateY(${-vinkel}deg)`,
    transition: anim ? `transform ${varighed}ms ease-in-out` : 'none',
  });

  let sideIndhold;
  if (p.indhold.art === 'foto') {
    sideIndhold = (
      <div class={`vend-kort ${vendt ? 'vendt' : ''}`}>
        <div class="vend-for" aria-hidden={vendt}>{Side(0)}</div>
        <div class="vend-bag" aria-hidden={!vendt}>{p.indhold.bagside?.()}</div>
      </div>
    );
  } else if (fl && fl.retning === 1) {
    sideIndhold = (
      <div class="sider">
        <div class="side under">{Side(side + 1)}</div>
        <div class="side over" style={flipStil(fl.p * 100, fl.anim)}>
          {Side(side)}
          <div class="side-skygge" style={{ opacity: String(fl.p * 0.5) }} />
        </div>
      </div>
    );
  } else if (fl && fl.retning === -1) {
    sideIndhold = (
      <div class="sider">
        <div class="side under">{Side(side)}</div>
        <div class="side over" style={flipStil((1 - fl.p) * 100, fl.anim)}>
          {Side(side - 1)}
        </div>
      </div>
    );
  } else {
    sideIndhold = (
      <div class="sider">
        <div class="side">{Side(side)}</div>
      </div>
    );
  }

  const pladsNavn = { fuld: 'hele skærmen', top: 'øverst', bund: 'nederst' };
  const naestePlads: Plads = p.plads === 'fuld' ? 'top' : p.plads === 'top' ? 'bund' : 'fuld';

  return (
    <div
      ref={panelRef}
      class={`aaben-panel plads-${p.plads} art-${p.indhold.art}`}
      role="dialog"
      aria-label={p.indhold.titel}
      data-ting={p.ting.id}
    >
      <header class="aaben-hoved" onPointerDown={hovedNed} onPointerMove={hovedFlyt} onPointerUp={hovedOp} onPointerCancel={hovedOp}>
        <span class="greb" aria-hidden="true" />
        <h2>{p.indhold.titel}</h2>
        <div class="knapper">
          {p.harLup && (
            <Knap class={`ikon-knap ${p.lupAktiv ? 'aktiv' : ''}`} onTryk={p.onLup} aria-pressed={p.lupAktiv} aria-label="Lup" title="Lup">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="M15 15 L21 21" /></svg>
            </Knap>
          )}
          {p.indhold.art === 'foto' && p.indhold.bagside && (
            <Knap class="ikon-knap" onTryk={() => setVendt((v) => !v)} aria-label={vendt ? 'Vis forsiden' : 'Vend fotoet'} title="Vend">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" /><path d="M18 3v4h-4M6 21v-4h4" /></svg>
            </Knap>
          )}
          {p.indhold.kanUdtages && p.onUdtag && (
            <Knap class="ikon-knap" onTryk={() => p.onUdtag!(side)} aria-label="Tag arket ud og læg det på bordet" title="Læg arket på bordet">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="16" rx="1" /><path d="M12 21v-6M9 18l3 3 3-3" /></svg>
            </Knap>
          )}
          <Knap
            class="ikon-knap"
            onTryk={() => p.onPlads(naestePlads)}
            aria-label={`Flyt til ${pladsNavn[naestePlads]}`}
            title={`Flyt til ${pladsNavn[naestePlads]}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 12h16" /></svg>
          </Knap>
          <Knap class="ikon-knap luk" onTryk={luk} aria-label="Luk" title="Luk">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </Knap>
        </div>
      </header>
      <div class="aaben-krop">
        <div
          ref={fladeRef}
          class="aaben-flade"
          onPointerDown={ned}
          onPointerMove={flyt}
          onPointerUp={op}
          onPointerCancel={op}
        >
          <div ref={rammeRef} class="side-ramme">
            {sideIndhold}
          </div>
        </div>
        {p.indhold.faneblade && antal > 1 && (
          <nav class="faneblade" aria-label="Faneblade">
            {p.indhold.faneblade.map((f) => (
              <Knap class={`faneblad ${f.side === side ? 'aktiv' : ''}`} onTryk={() => gaaTil(f.side)} aria-current={f.side === side}>
                {f.navn}
              </Knap>
            ))}
          </nav>
        )}
      </div>
      {antal > 1 && (
        <footer class="aaben-fod">
          <Knap class="ikon-knap" onTryk={() => gaaTil(side - 1)} disabled={side === 0} aria-label="Forrige side">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </Knap>
          <span class="side-tal" aria-live="polite">
            Side {side + 1} af {antal}
          </span>
          <Knap class="ikon-knap" onTryk={() => gaaTil(side + 1)} disabled={side >= antal - 1} aria-label="Næste side">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </Knap>
        </footer>
      )}
    </div>
  );
}
