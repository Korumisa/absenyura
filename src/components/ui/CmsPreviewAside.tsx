import type { ReactNode } from 'react';

/** Panel pratinjau sticky untuk halaman CMS */
export function CmsPreviewAside({
  title = 'Pratinjau',
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={`sticky top-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
      aria-label={title}
    >
      <div className="border-b border-slate-200 px-4 py-3 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </aside>
  );
}
