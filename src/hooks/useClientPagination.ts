import { useEffect, useMemo, useRef, useState } from 'react';
import type { PaginationMeta } from '@/types/common';

function shallowDepsChanged(
  prev: readonly unknown[] | undefined,
  next: readonly unknown[]
): boolean {
  if (!prev || prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) {
    if (!Object.is(prev[i], next[i])) return true;
  }
  return false;
}

/** Paginasi client-side untuk data yang sudah difilter di frontend */
export function useClientPagination<T>(
  items: T[],
  options: { pageSize?: number; resetDeps?: readonly unknown[] } = {}
) {
  const pageSize = options.pageSize ?? 20;
  const [page, setPage] = useState(1);

  const externalResetDeps = options.resetDeps;
  const lastResetDepsRef = useRef<readonly unknown[] | undefined>(undefined);
  const [resetTick, setResetTick] = useState(0);
  useEffect(() => {
    if (shallowDepsChanged(lastResetDepsRef.current, externalResetDeps ?? [])) {
      lastResetDepsRef.current = externalResetDeps ? [...externalResetDeps] : [];
      setResetTick((t) => t + 1);
    }
  }, [externalResetDeps]);

  useEffect(() => {
    setPage(1);
  }, [items.length, resetTick]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  const meta: PaginationMeta = useMemo(
    () => ({
      total: items.length,
      page: safePage,
      limit: pageSize,
      totalPages,
    }),
    [items.length, safePage, pageSize, totalPages]
  );

  return { page: safePage, setPage, paginatedItems, meta };
}
