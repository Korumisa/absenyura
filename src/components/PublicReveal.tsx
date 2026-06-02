import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';

/** Scroll reveal halaman publik (CSS + Intersection Observer; tanpa framer-motion) */
export default function PublicReveal({
  children,
  className,
  delay = 0,
  shiftY = 18,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  shiftY?: number;
}) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  if (reducedMotion) {
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
