import { cn } from '@/lib/utils/utils';

const LABELS = ['Scan QR', 'Foto & Lokasi', 'Kirim'] as const;

export function AttendStepIndicator({
  currentStep,
  className,
}: {
  currentStep: 1 | 2 | 3;
  className?: string;
}) {
  const activeIdx = Math.min(Math.max(currentStep, 1), LABELS.length) - 1;

  return (
    <nav aria-label="Progres check-in" className={cn('mb-6', className)}>
      <ol className="flex items-center gap-2">
        {LABELS.map((label, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold sm:text-sm',
                  active && 'bg-brand text-white',
                  done && 'text-brand',
                  !active && !done && 'text-muted-foreground'
                )}
                aria-current={active ? 'step' : undefined}
              >
                <span className="truncate">{label}</span>
              </div>
              {i < LABELS.length - 1 ? (
                <span className="hidden h-px w-4 shrink-0 bg-border sm:block" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
