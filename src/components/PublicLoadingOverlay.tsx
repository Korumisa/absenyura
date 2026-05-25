import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeTransition } from '@/lib/motionPresets';
import { useReducedMotion } from '@/lib/useReducedMotion';

export default function PublicLoadingOverlay({
  show,
  label = 'Memuat data...',
  className,
}: {
  show: boolean;
  label?: string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="loading-overlay"
          className={cn(
            'fixed inset-0 z-[60] flex items-center justify-center bg-white/25 backdrop-blur-md bg-card/30',
            className,
          )}
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeTransition(reducedMotion, 0.2)}
          aria-busy="true"
          aria-live="polite"
        >
          <motion.div
            className="flex flex-col items-center gap-3 rounded-3xl border border-black/10 bg-white/75 px-8 py-7 text-slate-800 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.7)] backdrop-blur dark:border-white/10 bg-card/70 dark:text-slate-100 dark:shadow-[0_30px_90px_-60px_rgba(0,0,0,0.9)]"
            initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
            transition={fadeTransition(reducedMotion, 0.22)}
          >
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 animate-spin rounded-full border-[4px] border-border border-t-[var(--public-primary)] border-border" />
              <div className="absolute inset-2 rounded-full bg-[var(--public-primary)]/10" />
            </div>
            <div className="text-sm font-medium">{label}</div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--public-primary)] [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--public-primary)] [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--public-primary)]" />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
