import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** [UX] SK-02 — skeleton menyerupai layout kartu mobile */
export function CardSkeleton({ className, count = 1 }: { className?: string; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm', className)}
          aria-hidden
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </>
  );
}

export function CardSkeletonList({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Memuat data...">
      <CardSkeleton count={count} />
    </div>
  );
}
