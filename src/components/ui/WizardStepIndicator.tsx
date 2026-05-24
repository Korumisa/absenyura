import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** [IA] Stepper informatif — progres saja, navigasi lewat Lanjut/Sebelumnya (USWDS pattern) */
export function WizardStepIndicator({
  labels,
  currentStep,
  className,
}: {
  labels: readonly string[];
  currentStep: number;
  className?: string;
}) {
  return (
    <nav aria-label="Progres langkah" className={cn('border-b border-slate-200 pb-4 dark:border-zinc-800', className)}>
      <ol className="flex flex-wrap items-center gap-2 sm:gap-0">
        {labels.map((label, i) => {
          const step = i + 1;
          const done = step < currentStep;
          const active = step === currentStep;
          return (
            <li key={label} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium',
                  active && 'bg-indigo-600 text-white',
                  done && 'text-indigo-600 dark:text-indigo-400',
                  !active && !done && 'text-slate-500 dark:text-zinc-400',
                )}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    active && 'bg-white/20 text-white',
                    done && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
                    !active && !done && 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
                  )}
                  aria-hidden="true"
                >
                  {done ? <Check className="h-4 w-4" /> : step}
                </span>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{step}</span>
              </div>
              {i < labels.length - 1 ? (
                <span className="mx-1 hidden h-px w-6 bg-slate-200 sm:inline-block dark:bg-zinc-700" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
        Langkah {currentStep} dari {labels.length} — gunakan tombol Sebelumnya / Lanjut di bawah untuk berpindah.
      </p>
    </nav>
  );
}
