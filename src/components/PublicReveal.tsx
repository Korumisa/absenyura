import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { REVEAL_VIEWPORT, motionTransition } from '@/lib/motionPresets';

/** [IxD] P2 — scroll reveal halaman publik; hormati prefers-reduced-motion */
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

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={shiftY ? { opacity: 0, y: shiftY } : { opacity: 0 }}
      whileInView={shiftY ? { opacity: 1, y: 0 } : { opacity: 1 }}
      viewport={REVEAL_VIEWPORT}
      transition={motionTransition(false, { duration: 0.45, ease: 'easeOut', delay })}
    >
      {children}
    </motion.div>
  );
}
