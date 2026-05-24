import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { fadeTransition } from '@/lib/motionPresets';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** [IxD] R1 — transisi antar halaman di area admin */
export function AdminRouteTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div key={location.pathname}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={fadeTransition(false, 0.2)}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
