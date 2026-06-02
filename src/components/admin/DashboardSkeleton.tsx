import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeletonList } from '@/components/admin/CardSkeleton';
import { cn } from '@/lib/utils/utils';

function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6', className)}>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-12 rounded-2xl" />
      </div>
      <Skeleton className="h-9 w-20" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

function UserStatCardSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <Skeleton className="mb-4 size-12 rounded-2xl" />
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="h-9 w-16" />
    </div>
  );
}

/** Skeleton admin — banner, stat, grafik, sesi terbaru */
export function DashboardAdminSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat dashboard">
      <Skeleton className="h-36 w-full rounded-3xl sm:h-40" />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm xl:col-span-2">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-7 w-40" />
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Skeleton className="h-10 w-full sm:w-[140px]" />
              <Skeleton className="h-10 w-full sm:w-[180px]" />
            </div>
          </div>
          <Skeleton className="h-[320px] w-full rounded-2xl" />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-6 py-5">
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="p-5">
            <CardSkeletonList count={3} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton mahasiswa — hero, stat, jadwal */
export function DashboardUserSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat dashboard">
      <Skeleton className="h-44 w-full rounded-3xl sm:h-48" />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <UserStatCardSkeleton key={i} />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="p-5">
          <CardSkeletonList count={3} />
        </div>
      </div>
    </div>
  );
}
