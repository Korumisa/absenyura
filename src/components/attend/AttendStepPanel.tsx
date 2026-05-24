import { AnimatePresence, motion } from 'framer-motion';
import type { AttendStep } from './AttendWizardHeader';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** Menyelesaikan A-05, P2 — transisi antar langkah absensi */
export function AttendStepPanel({
  step,
  children,
}: {
  step: AttendStep;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className="flex w-full flex-1 flex-col items-center justify-center">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex w-full flex-1 flex-col items-center justify-center"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
