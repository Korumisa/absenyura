import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AttendanceChartLoadingOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl',
        'bg-background/75 backdrop-blur-[2px]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Memperbarui grafik"
    >
      <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">Memperbarui grafik…</p>
    </div>
  );
}
