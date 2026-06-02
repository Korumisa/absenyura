import { AnimatePresence, m } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { fadeTransition } from '@/lib/perf/motionPresets';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';

/** [IxD] R1 — transisi antar halaman di area admin */
export function AdminRouteTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div key={location.pathname}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={fadeTransition(false, 0.2)}
        className="min-h-full"
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
