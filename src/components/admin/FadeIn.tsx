import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeTransition } from '@/lib/motionPresets';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cn } from '@/lib/utils';

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
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fadeTransition(false, 0.18)}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </motion.div>
  );
}
