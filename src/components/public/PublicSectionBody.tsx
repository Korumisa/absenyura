import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicSlowLoadingHint } from '@/components/public/PublicSlowLoadingHint';

/** Loading / slow / empty / content untuk section halaman publik */
export function PublicSectionBody({
  isPending,
  showSlowLoadingHint,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyDescription,
  skeletonClassName = 'mt-10 h-40',
  children,
}: {
  isPending: boolean;
  showSlowLoadingHint?: boolean;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  skeletonClassName?: string;
  children: ReactNode;
}) {
  if (showSlowLoadingHint && onRetry) {
    return (
      <div className="mt-10">
        <PublicSlowLoadingHint onRetry={onRetry} />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className={skeletonClassName} aria-busy="true" aria-label="Memuat konten">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-muted-foreground">
        <div className="text-base font-extrabold tracking-tight text-slate-900">{emptyTitle}</div>
        <div className="mt-2 max-w-2xl">{emptyDescription}</div>
      </div>
    );
  }

  return <>{children}</>;
}
