import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Horizontal scroll rail with momentum wheel scrolling (feels less stiff than lerp-to-target).
 */
export function HorizontalSnapRail({
  children,
  ariaLabel,
  setScroller,
  onScroll,
  onUserInteract,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  setScroller?: (el: HTMLDivElement | null) => void;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  onUserInteract?: () => void;
}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const setScrollerRef = useRef(setScroller);
  const interactRef = useRef(onUserInteract);
  const velocity = useRef(0);
  const rafId = useRef<number | null>(null);
  const drag = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
    lastX: 0,
    lastT: 0,
  });

  useEffect(() => {
    setScrollerRef.current = setScroller;
  }, [setScroller]);

  useEffect(() => {
    interactRef.current = onUserInteract;
  }, [onUserInteract]);

  const stopCoast = () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    velocity.current = 0;
  };

  useEffect(() => () => stopCoast(), []);

  const bindRef = useCallback((el: HTMLDivElement | null) => {
    setNode(el);
    setScrollerRef.current?.(el);
  }, []);

  const coast = useCallback(() => {
    if (!node) {
      rafId.current = null;
      return;
    }
    const max = node.scrollWidth - node.clientWidth;
    if (max <= 0 || Math.abs(velocity.current) < 0.08) {
      velocity.current = 0;
      rafId.current = null;
      return;
    }

    let next = node.scrollLeft + velocity.current;
    if (next <= 0) {
      next = 0;
      velocity.current = 0;
    } else if (next >= max) {
      next = max;
      velocity.current = 0;
    } else {
      // Soft friction — keeps motion fluid after wheel notches
      velocity.current *= 0.94;
    }
    node.scrollLeft = next;
    rafId.current = requestAnimationFrame(coast);
  }, [node]);

  const kickCoast = useCallback(() => {
    if (!rafId.current) rafId.current = requestAnimationFrame(coast);
  }, [coast]);

  useEffect(() => {
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      const max = node.scrollWidth - node.clientWidth;
      if (max <= 4) return;

      const scale = e.deltaMode === 1 ? 14 : e.deltaMode === 2 ? node.clientWidth * 0.85 : 1;
      const dx = e.deltaX * scale;
      const dy = e.deltaY * scale;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax < 0.4 && ay < 0.4) return;

      // Remap vertical mouse wheel → horizontal momentum
      if (ay >= ax * 0.7) {
        e.preventDefault();
        e.stopPropagation();
        // Impulse (not hard jump) — multiple notches blend smoothly
        velocity.current += dy * 0.42;
        // Cap so a fast flick doesn't feel violent
        velocity.current = Math.max(-48, Math.min(48, velocity.current));
        kickCoast();
        interactRef.current?.();
        return;
      }

      interactRef.current?.();
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [node, kickCoast]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!node) return;
    stopCoast();
    interactRef.current?.();
    drag.current = {
      active: true,
      startX: e.clientX,
      startScroll: node.scrollLeft,
      moved: false,
      lastX: e.clientX,
      lastT: performance.now(),
    };
    try {
      node.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || !node) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    if (!drag.current.moved) return;

    const now = performance.now();
    const dt = Math.max(8, now - drag.current.lastT);
    const frameDx = e.clientX - drag.current.lastX;
    velocity.current = (-frameDx / dt) * 12;
    drag.current.lastX = e.clientX;
    drag.current.lastT = now;

    node.scrollLeft = drag.current.startScroll - dx;
    e.preventDefault();
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    try {
      node?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (drag.current.moved && Math.abs(velocity.current) > 0.25) {
      kickCoast();
    } else {
      velocity.current = 0;
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div
      ref={bindRef}
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      className="min-w-0 w-full cursor-grab overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 active:cursor-grabbing scrollbar-hide"
      style={{
        touchAction: 'pan-x pinch-zoom',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'auto',
      }}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
