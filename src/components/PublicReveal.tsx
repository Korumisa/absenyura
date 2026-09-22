import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';

/** Scroll reveal halaman publik (CSS + Intersection Observer; tanpa framer-motion) */
export default function PublicReveal({
  children,
  className,
  delay = 0,
  shiftY = 18,
  /** When true, content is visible immediately (use for above-the-fold blocks). */
  eager = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  shiftY?: number;
  eager?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(reducedMotion || eager);

  useEffect(() => {
    if (reducedMotion || eager) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -4% 0px', threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion, eager]);

  if (reducedMotion || eager) {
    return <div className={className}>{children}</div>;
  }

  const delaySec = `${delay}s`;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${shiftY}px)`,
        transitionProperty: 'opacity, transform',
        transitionDuration: '0.45s',
        transitionTimingFunction: 'ease-out',
        transitionDelay: `${delaySec}, ${delaySec}`,
      }}
    >
      {children}
    </div>
  );
}
