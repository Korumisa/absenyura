import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Empty state terstandar untuk halaman admin */
export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-3xl border border-slate-200 bg-white text-center dark:border-zinc-800 dark:bg-zinc-900',
        compact ? 'p-8' : 'p-12',
        className,
      )}
      role="status"
    >
      <Icon size={compact ? 40 : 48} className="mb-4 text-slate-300 dark:text-zinc-600" aria-hidden="true" />
      <h3 className="text-lg font-bold text-slate-800 dark:text-white sm:text-xl">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-zinc-400">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
