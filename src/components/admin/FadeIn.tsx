import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { fadeTransition } from '@/lib/perf/motionPresets';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';
import { cn } from '@/lib/utils/utils';

/** [IxD] Fade-in ringan untuk error state, panel filter, dll. */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={cn(className)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fadeTransition(false, 0.18)}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </m.div>
  );
}
