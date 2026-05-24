import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** [UX] ES-02 — empty state terstandar halaman admin */
export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
  hasFilters,
}: {
  icon: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
  hasFilters?: boolean;
}) {
  const resolvedTitle =
    title ??
    (hasFilters ? 'Tidak ada hasil' : 'Belum ada data');
  const resolvedDescription =
    description ??
    (hasFilters
      ? 'Coba ubah filter pencarian.'
      : undefined);

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-border bg-card text-center shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10',
        compact ? 'p-8' : 'p-12',
        className,
      )}
      role="status"
    >
      <Icon size={compact ? 40 : 48} className="mb-4 text-muted-foreground/50" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-foreground">{resolvedTitle}</h3>
      {resolvedDescription ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{resolvedDescription}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
