import type { PagedResponse } from '@/types/api';

/** Helper render kondisional konten publik — sembunyikan section kosong */
export function hasText(value?: string | null): boolean {
  return Boolean(String(value ?? '').trim());
}

export function showPublicSection(...fields: (string | null | undefined)[]): boolean {
  return fields.some((f) => hasText(f));
}

/** Polymorphic safe-items extractor: menerima PagedResponse<T>, T[], atau unknown.
 *  Selalu mengembalikan array T[] (tidak pernah null/undefined/non-array). */
export function safeItems<T>(x: unknown, fallback: T[] = []): T[] {
  if (x === null || x === undefined) return fallback;
  if (Array.isArray(x)) return x as T[];
  if (typeof x === 'object') {
    const maybeItems = (x as Partial<PagedResponse<T>>).items;
    if (Array.isArray(maybeItems)) return maybeItems;
  }
  return fallback;
}

/** Safe relation array: relation fields (album.items, recruitment.contacts, etc)
 *  mungkin undefined / null / non-array — fallback ke array kosong. */
export function safeRelation<T>(x: T[] | undefined | null, fallback: T[] = []): T[] {
  return Array.isArray(x) ? x : fallback;
}

/** Build PagedResponse<T> dari flat array (untuk mock / testing). */
export function buildPagedResponse<T>(
  allItems: T[],
  page: number = 1,
  pageSize: number = 6
): PagedResponse<T> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const clampedPage = Math.min(safePage, totalPages);
  const start = (clampedPage - 1) * safeSize;
  const items = allItems.slice(start, start + safeSize);
  return { items, total, page: clampedPage, pageSize: safeSize, totalPages };
}
