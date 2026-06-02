import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/utils';

const BAR_HEIGHTS = ['45%', '70%', '55%', '85%', '40%', '65%', '50%', '75%', '60%', '48%'] as const;

/** Placeholder bentuk grafik batang (lazy load & area kosong) */
export function AttendanceChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex h-[320px] flex-col justify-end gap-3 px-2 pt-8', className)}
      aria-hidden
    >
      <div className="flex h-[240px] items-end justify-between gap-1.5 sm:gap-2">
        {BAR_HEIGHTS.map((height, i) => (
          <Skeleton
            key={i}
            className="w-full max-w-[28px] flex-1 rounded-t-md"
            style={{ height }}
          />
        ))}
      </div>
      <div className="flex justify-between gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 max-w-[48px]" />
        ))}
      </div>
    </div>
  );
}
