import { cn } from '@/lib/utils';

/** Empty state situs publik — global (belum ada data) atau search (filter kosong) */
export function PublicEmptyState({
  variant = 'global',
  title,
  description,
  className,
}: {
  variant?: 'global' | 'search';
  title?: string;
  description?: string;
  className?: string;
}) {
  const resolvedTitle =
    title ?? (variant === 'search' ? 'Tidak ada hasil' : 'Belum ada data');
  const resolvedDescription =
    description ??
    (variant === 'search'
      ? 'Coba ubah kata kunci atau filter pencarian Anda.'
      : 'Konten akan tampil di sini setelah ditambahkan dari panel admin.');

  if (variant === 'search') {
    return (
      <div
        className={cn(
          'mt-6 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-muted-foreground',
          className,
        )}
        role="status"
      >
        <div className="text-base font-extrabold tracking-tight text-slate-900">{resolvedTitle}</div>
        <p className="mt-2">{resolvedDescription}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-muted-foreground sm:p-10',
        className,
      )}
      role="status"
    >
      <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
      <div className="relative">
        <div className="text-base font-extrabold tracking-tight text-slate-900">{resolvedTitle}</div>
        <div className="mt-2 max-w-2xl">{resolvedDescription}</div>
      </div>
    </div>
  );
}
