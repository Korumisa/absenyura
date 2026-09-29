import { useCallback, useEffect, useRef, useState } from 'react';
import type { WheelEvent as ReactWheelEvent } from 'react';

/**
 * Remap vertical mouse-wheel (and dominant vertical trackpad) to horizontal scroll.
 * Uses a non-passive listener so preventDefault actually works.
 */
export default function useHorizontalWheelScroll(enabled: boolean) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const rafId = useRef<number | null>(null);
  const targetLeft = useRef<number>(0);
  const velocity = useRef<number>(0);
  const lastEl = useRef<HTMLElement | null>(null);

  const stop = () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    velocity.current = 0;
  };

  const animateToTarget = useCallback(() => {
    const el = lastEl.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) {
      stop();
      return;
    }
    const target = Math.min(max, Math.max(0, targetLeft.current));
    const cur = el.scrollLeft;
    const diff = target - cur;
    if (Math.abs(diff) < 0.4) {
      el.scrollLeft = target;
      stop();
      return;
    }
    const nextVel = velocity.current * 0.88 + diff * 0.2;
    velocity.current = nextVel;
    el.scrollLeft = cur + nextVel;
    rafId.current = requestAnimationFrame(animateToTarget);
  }, []);

  const handle = useCallback(
    (
      el: HTMLElement,
      deltaX: number,
      deltaY: number,
      deltaMode: number,
      preventDefault: () => void,
      stopPropagation: () => void
    ) => {
      if (!enabled) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;

      // Normalize LINE/PAGE deltas to ~pixels
      const scale = deltaMode === 1 ? 16 : deltaMode === 2 ? el.clientWidth : 1;
      const dx = deltaX * scale;
      const dy = deltaY * scale;

      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax === 0 && ay === 0) return;

      // Dominant horizontal → leave to native overflow-x
      if (ax > ay * 1.2) return;

      // Vertical (or mostly vertical) mouse wheel → horizontal pan
      const delta = ay >= ax ? dy : dx;
      if (!delta) return;

      preventDefault();
      stopPropagation();

      lastEl.current = el;
      // Seed target from current position if animation was idle
      if (!rafId.current) {
        targetLeft.current = el.scrollLeft;
      }
      targetLeft.current = Math.min(max, Math.max(0, targetLeft.current + delta));
      if (!rafId.current) rafId.current = requestAnimationFrame(animateToTarget);
    },
    [enabled, animateToTarget]
  );

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLElement>) => {
      handle(
        e.currentTarget,
        e.deltaX,
        e.deltaY,
        e.deltaMode,
        () => e.preventDefault(),
        () => e.stopPropagation()
      );
    },
    [handle]
  );

  useEffect(() => {
    if (!enabled || !node) return;
    const listener = (e: WheelEvent) => {
      handle(
        node,
        e.deltaX,
        e.deltaY,
        e.deltaMode,
        () => e.preventDefault(),
        () => e.stopPropagation()
      );
    };
    node.addEventListener('wheel', listener, { passive: false });
    return () => node.removeEventListener('wheel', listener);
  }, [enabled, handle, node]);

  useEffect(() => {
    if (!enabled) stop();
    return () => stop();
  }, [enabled]);

  const ref = useCallback((el: HTMLElement | null) => setNode(el), []);

  return { ref, onWheel };
}
