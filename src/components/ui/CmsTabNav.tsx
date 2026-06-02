import { cn } from '@/lib/utils/utils';

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
    <nav
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2 border-b border-border pb-3 border-border"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
            value === tab.id
              ? 'bg-brand text-white'
              : 'bg-slate-100 text-muted-foreground hover:bg-slate-200 bg-muted dark:text-zinc-300 dark:hover:bg-zinc-700'
          )}
          aria-current={value === tab.id ? 'true' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
