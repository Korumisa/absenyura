import { cn } from '@/lib/utils';

export type CmsTabItem<T extends string> = { id: T; label: string };

/** Tab navigasi reusable untuk panel CMS — temuan #14 */
export function CmsTabNav<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = 'Bagian konten',
}: {
  tabs: readonly CmsTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-zinc-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
            value === tab.id
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
          )}
          aria-current={value === tab.id ? 'true' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
