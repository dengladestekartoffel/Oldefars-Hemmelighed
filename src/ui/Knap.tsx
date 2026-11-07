// En knap, der reagerer pålideligt på berøring.
// Browsere sluger nogle gange "click" for det første tryk efter et hurtigt
// swipe. Derfor reagerer knappen selv på et rent tryk (pointerup), og bruger
// kun click til tastatur og mus.

import type { ButtonHTMLAttributes } from 'preact';
import { useRef } from 'preact/hooks';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onTryk: () => void;
};

export function Knap({ onTryk, children, ...rest }: Props) {
  const start = useRef<{ id: number; x: number; y: number; t: number } | null>(null);
  const sidst = useRef(0);
  const udfoer = () => onTryk();
  return (
    <button
      type="button"
      {...rest}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.pointerType === 'mouse') return;
        start.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const s = start.current;
        start.current = null;
        if (!s || s.id !== e.pointerId || rest.disabled) return;
        if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 14 || performance.now() - s.t > 800) return;
        e.preventDefault();
        sidst.current = performance.now();
        udfoer();
      }}
      onPointerCancel={() => (start.current = null)}
      onClick={(e) => {
        e.stopPropagation();
        // klikket, som browseren sender efter et tryk, vi allerede har håndteret
        if (performance.now() - sidst.current < 700) {
          sidst.current = 0;
          return;
        }
        udfoer();
      }}
    >
      {children}
    </button>
  );
}
