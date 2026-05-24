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
      className={`sticky top-4 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card ${className}`}
      aria-label={title}
    >
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </aside>
  );
}
