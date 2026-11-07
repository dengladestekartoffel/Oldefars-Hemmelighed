// Luppen: trækkes hen over et åbent dokument eller foto og forstørrer det,
// der ligger under den. Bliver liggende, hvor man slipper.

import { useEffect, useRef } from 'preact/hooks';
import { foel } from '../system/foel';

export const LUP_FORSTOERRELSE = 2.4;

interface Props {
  x: number;
  y: number;
  onFlyt: (x: number, y: number) => void;
}

export function Lup({ x, y, onFlyt }: Props) {
  const ringRef = useRef<HTMLDivElement>(null);
  const indholdRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x, y });
  const kilde = useRef<{ flade: HTMLElement; klon: HTMLElement } | null>(null);
  const spor = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const diameter = () => ringRef.current?.offsetWidth ?? 160;

  /** Finder den åbne flade under luppens midte og laver en kopi af dens indhold. */
  const findKilde = (tving = false) => {
    const ring = ringRef.current;
    const ind = indholdRef.current;
    if (!ring || !ind) return;
    const { x: cx, y: cy } = pos.current;
    const flade = document
      .elementsFromPoint(cx, cy)
      .find((el) => el.classList.contains('aaben-flade')) as HTMLElement | undefined;
    if (!flade) {
      ind.replaceChildren();
      kilde.current = null;
      ring.classList.add('tom');
      return;
    }
    ring.classList.remove('tom');
    if (tving || kilde.current?.flade !== flade) {
      const ramme = flade.querySelector('.side-ramme') as HTMLElement;
      const klon = ramme.cloneNode(true) as HTMLElement;
      klon.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      klon.setAttribute('aria-hidden', 'true');
      const omslag = document.createElement('div');
      omslag.className = 'lup-omslag';
      omslag.style.width = `${flade.clientWidth}px`;
      omslag.style.height = `${flade.clientHeight}px`;
      omslag.appendChild(klon);
      ind.replaceChildren(omslag);
      kilde.current = { flade, klon: omslag };
    }
    placer();
  };

  const placer = () => {
    const k = kilde.current;
    const ring = ringRef.current;
    if (!ring) return;
    const { x: cx, y: cy } = pos.current;
    const d = diameter();
    ring.style.transform = `translate(${cx - d / 2}px, ${cy - d / 2}px)`;
    if (!k) return;
    const fr = k.flade.getBoundingClientRect();
    const r = d / 2;
    const s = LUP_FORSTOERRELSE;
    k.klon.style.transform = `translate(${r - (cx - fr.left) * s}px, ${r - (cy - fr.top) * s}px) scale(${s})`;
  };

  useEffect(() => {
    pos.current = { x, y };
    findKilde(true);
    const opdater = () => setTimeout(() => findKilde(true), 30);
    window.addEventListener('aaben-aendret', opdater);
    window.addEventListener('resize', opdater);
    return () => {
      window.removeEventListener('aaben-aendret', opdater);
      window.removeEventListener('resize', opdater);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ned = (e: PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    spor.current = { id: e.pointerId, dx: e.clientX - pos.current.x, dy: e.clientY - pos.current.y };
    ringRef.current?.classList.add('loeftet');
  };
  const flyt = (e: PointerEvent) => {
    const s = spor.current;
    if (!s || s.id !== e.pointerId) return;
    e.stopPropagation();
    pos.current = {
      x: Math.max(0, Math.min(window.innerWidth, e.clientX - s.dx)),
      y: Math.max(0, Math.min(window.innerHeight, e.clientY - s.dy)),
    };
    findKilde();
  };
  const op = (e: PointerEvent) => {
    const s = spor.current;
    if (!s || s.id !== e.pointerId) return;
    e.stopPropagation();
    spor.current = null;
    ringRef.current?.classList.remove('loeftet');
    onFlyt(pos.current.x, pos.current.y);
    foel('lup', 'laeg');
  };

  return (
    <div
      ref={ringRef}
      class="lup-ring"
      role="img"
      aria-label="Lup. Træk den hen over dokumentet for at forstørre."
      onPointerDown={ned}
      onPointerMove={flyt}
      onPointerUp={op}
      onPointerCancel={op}
    >
      <div ref={indholdRef} class="lup-glas" />
      <div class="lup-skaft" aria-hidden="true" />
    </div>
  );
}
