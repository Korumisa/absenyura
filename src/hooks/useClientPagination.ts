import { useEffect, useMemo, useState } from 'react';
import type { PaginationMeta } from '@/types/common';

/** Paginasi client-side untuk data yang sudah difilter di frontend */
export function useClientPagination<T>(
  items: T[],
  options: { pageSize?: number; resetDeps?: readonly unknown[] } = {},
) {
  const pageSize = options.pageSize ?? 20;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [items.length, ...(options.resetDeps ?? [])]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  const meta: PaginationMeta = useMemo(
    () => ({
      total: items.length,
      page: safePage,
      limit: pageSize,
      totalPages,
    }),
    [items.length, safePage, pageSize, totalPages],
  );

  return { page: safePage, setPage, paginatedItems, meta };
}
