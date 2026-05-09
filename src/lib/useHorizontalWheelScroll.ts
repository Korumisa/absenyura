import { useCallback, useEffect, useRef, useState } from 'react';
import type { WheelEvent as ReactWheelEvent } from 'react';

export default function useHorizontalWheelScroll(enabled: boolean) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const rafId = useRef<number | null>(null);
  const targetLeft = useRef<number>(0);
  const lastEl = useRef<HTMLElement | null>(null);

  const stop = () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = null;
  };

  const animateToTarget = () => {
    const el = lastEl.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    const target = Math.min(max, Math.max(0, targetLeft.current));
    const cur = el.scrollLeft;
    const diff = target - cur;
    if (Math.abs(diff) < 0.75) {
      el.scrollLeft = target;
      stop();
      return;
    }
    el.scrollLeft = cur + diff * 0.22;
    rafId.current = requestAnimationFrame(animateToTarget);
  };

  const handle = useCallback(
    (
      el: HTMLElement,
      deltaX: number,
      deltaY: number,
      preventDefault: () => void,
      stopPropagation: () => void,
    ) => {
      if (!enabled) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;

      const ax = Math.abs(deltaX);
      const ay = Math.abs(deltaY);
      if (ax === 0 && ay === 0) return;

      if (ax > ay * 1.15) return;
      const delta = deltaY || deltaX;
      if (!delta) return;

      preventDefault();
      stopPropagation();

      lastEl.current = el;
      targetLeft.current = Math.min(max, Math.max(0, el.scrollLeft + delta * 0.9));
      if (!rafId.current) rafId.current = requestAnimationFrame(animateToTarget);
    },
    [enabled],
  );

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLElement>) => {
      handle(e.currentTarget, e.deltaX, e.deltaY, () => e.preventDefault(), () => e.stopPropagation());
    },
    [handle],
  );

  useEffect(() => {
    if (!enabled || !node) return;
    const listener = (e: WheelEvent) => {
      handle(node, e.deltaX, e.deltaY, () => e.preventDefault(), () => e.stopPropagation());
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

