import { cn } from '@/lib/utils';

const LABELS = ['Scan QR', 'Lokasi', 'Foto'] as const;

export function AttendStepIndicator({
  currentStep,
  className,
}: {
  /** 1 = QR, 2 = lokasi, 3 = foto, 4 = siap kirim */
  currentStep: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const displayStep = Math.min(currentStep, 3);

  return (
    <nav aria-label="Progres check-in" className={cn('mb-6', className)}>
      <ol className="flex items-center gap-2">
        {LABELS.map((label, i) => {
          const step = i + 1;
          const done = step < displayStep;
          const active = step === displayStep;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold sm:text-sm',
                  active && 'bg-brand text-white',
                  done && 'text-brand',
                  !active && !done && 'text-muted-foreground',
                )}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    active && 'bg-white/25',
                    done && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50',
                    !active && !done && 'bg-muted',
                  )}
                >
                  {step}
                </span>
                <span className="truncate">{label}</span>
              </div>
              {i < LABELS.length - 1 ? (
                <span className="hidden h-px w-4 shrink-0 bg-border sm:block" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">
        Langkah {Math.min(displayStep, 3)}/3 · estimasi ±1 menit
        {currentStep >= 4 ? ' · siap kirim' : ''}
      </p>
    </nav>
  );
}
