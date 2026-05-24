import { AnimatePresence, motion } from 'framer-motion';
import { fadeTransition } from '@/lib/motionPresets';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** [IxD] R1 — transisi halus antar tab/mode di halaman admin */
export function AdminContentTransition({
  contentKey,
  children,
  className,
}: {
  contentKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={contentKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={fadeTransition(false, 0.18)}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
