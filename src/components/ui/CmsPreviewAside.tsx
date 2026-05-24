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
      className={`sticky top-4 overflow-hidden rounded-2xl border border-border bg-white shadow-sm border-border bg-card ${className}`}
      aria-label={title}
    >
      <div className="border-b border-border px-4 py-3 border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-muted-foreground">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </aside>
  );
}
