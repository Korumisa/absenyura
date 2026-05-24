import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/types/common';
import { cn } from '@/lib/utils';

type TablePaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  itemLabel?: string;
  className?: string;
};

/** Footer paginasi standar untuk tabel admin */
export function TablePagination({
  meta,
  onPageChange,
  disabled = false,
  itemLabel = 'data',
  className,
}: TablePaginationProps) {
  if (meta.total === 0 || meta.totalPages <= 1) return null;

  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      aria-label="Paginasi tabel"
    >
      <span className="text-sm text-muted-foreground">
        Menampilkan {start}–{end} dari {meta.total} {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, meta.page - 1))}
          disabled={disabled || meta.page <= 1}
          aria-label="Halaman sebelumnya"
        >
          Sebelumnya
        </Button>
        <span className="min-w-[4rem] text-center text-sm text-muted-foreground" aria-live="polite">
          {meta.page} / {meta.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(meta.totalPages, meta.page + 1))}
          disabled={disabled || meta.page >= meta.totalPages}
          aria-label="Halaman berikutnya"
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
