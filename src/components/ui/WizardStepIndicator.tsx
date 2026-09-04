import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

/** [IA] Stepper — label langkah + penjelasan singkat fungsi langkah aktif */
export function WizardStepIndicator({
  labels,
  hints,
  currentStep,
  className,
}: {
  labels: readonly string[];
  /** Satu kalimat per langkah: apa yang diisi di langkah ini */
  hints?: readonly string[];
  currentStep: number;
  className?: string;
}) {
  const hint = hints?.[currentStep - 1];
  return (
    <nav aria-label="Progres langkah" className={cn('border-b border-border pb-4', className)}>
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
                  active && 'bg-brand text-white',
                  done && 'text-brand text-brand',
                  !active && !done && 'text-muted-foreground'
                )}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    active && 'bg-white/20 text-white',
                    done &&
                      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
                    !active &&
                      !done &&
                      'bg-slate-100 text-muted-foreground bg-muted text-muted-foreground'
                  )}
                  aria-hidden="true"
                >
                  {done ? <Check className="size-4" /> : step}
                </span>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{step}</span>
              </div>
              {i < labels.length - 1 ? (
                <span
                  className="mx-1 hidden h-px w-6 bg-slate-200 sm:inline-block bg-muted"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {hint ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="sr-only">
            Langkah {currentStep} dari {labels.length},{' '}
          </span>
          {hint}
        </p>
      ) : null}
    </nav>
  );
}
