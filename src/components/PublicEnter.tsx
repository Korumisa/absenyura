import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { motionTransition } from '@/lib/motionPresets';

/** [IxD] P2 — masuk halaman login/publik ringan */
export default function PublicEnter({ children, className }: { children: React.ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTransition(false, { duration: 0.42, ease: 'easeOut' })}
    >
      {children}
    </motion.div>
  );
}
