import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/types/common';
import { cn } from '@/lib/utils/utils';

type TablePaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  itemLabel?: string;
  className?: string;
};

function buildPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const range = (start: number, end: number): number[] =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const leftSibling = Math.max(current - 1, 2);
  const rightSibling = Math.min(current + 1, total - 1);

  const showLeftDots = leftSibling > 3;
  const showRightDots = rightSibling < total - 2;

  if (!showLeftDots && showRightDots) return [...range(1, 5), 'ellipsis', total];
  if (showLeftDots && !showRightDots) return [1, 'ellipsis', ...range(total - 4, total)];
  return [1, 'ellipsis', ...range(leftSibling, rightSibling), 'ellipsis', total];
}

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
  const pages = buildPageRange(meta.page, meta.totalPages);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
      aria-label="Paginasi tabel"
    >
      {/* Item count */}
      <span className="text-sm text-muted-foreground">
        Menampilkan {start}–{end} dari {meta.total} {itemLabel}
      </span>

      {/* Page controls */}
      <nav className="flex items-center gap-1" aria-label="Navigasi halaman">
        {/* Prev */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={disabled || meta.page <= 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Numbers + ellipsis */}
        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-8 w-8 select-none items-center justify-center text-sm text-muted-foreground"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={page === meta.page ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page)}
              disabled={disabled}
              aria-label={`Halaman ${page}`}
              aria-current={page === meta.page ? 'page' : undefined}
            >
              {page}
            </Button>
          )
        )}

        {/* Next */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={disabled || meta.page >= meta.totalPages}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}
