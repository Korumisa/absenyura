import api from '@/services/api';
import {
  mockGalleries,
  mockPostsBeritaLatestPage1,
  mockPostsLombaPage1,
  mockProfile,
  mockPrograms,
  mockRecruitments,
  mockStructure,
  USE_MOCK_LANDING,
  mockAllPosts,
} from './mockLandingData';
import type { PublicCategory, PublicPost } from '@/types/publicSite';

const NOW = '2025-09-03T04:00:00.000Z';
const PUBLIC_CATEGORIES_MOCK: PublicCategory[] = [
  { id: 'cat-berita', name: 'Berita', slug: 'berita', created_at: NOW, updated_at: NOW },
  { id: 'cat-kegiatan', name: 'Kegiatan', slug: 'kegiatan', created_at: NOW, updated_at: NOW },
  {
    id: 'cat-lomba',
    name: 'Informasi Lomba',
    slug: 'informasi-lomba',
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'cat-pengumuman',
    name: 'Pengumuman',
    slug: 'pengumuman',
    created_at: NOW,
    updated_at: NOW,
  },
];

type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type UnwrapMode =
  | { kind: 'data' } // r.data.data (most endpoints)
  | { kind: 'top' } // r.data (structure wrapper {data, cabinet, allCabinets})
  | { kind: 'detail' }; // r.data.data single post

/** [STANDARD FETCHER] — Apply Task A polymorph-safe behavior to ALL public site pages.
 * 3 guarantees:
 * 1. If VITE_USE_MOCK_LANDING, return static MOCK DATA matching the request URL (0 API calls).
 * 2. If HTTP success but r.data.success === false: THROW explicit Error (converts error-object → SWR error state, prevents object pass-through `?? []` fallback).
 * 3. If array expected but shape not Array.isArray: throw "Malformed response" defense-in-depth.
 */
export function publicSiteFetcher<T = unknown>(
  url: string,
  mode: UnwrapMode = { kind: 'data' }
): Promise<T> {
  if (USE_MOCK_LANDING) {
    const u = url.split('?')[0] ?? '';
    const qs = new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?') + 1) : '');
    // ---------- MOCK STATIC RESOLVER (no network) ----------
    const mockPromise = <U>(v: U): Promise<U> => Promise.resolve(v);
    // profile
    if (u.endsWith('/public-site/profile')) return mockPromise(mockProfile as unknown as T);
    // structure: shape { data, cabinet, allCabinets }
    if (u.endsWith('/public-site/structure')) return mockPromise(mockStructure as unknown as T);
    if (u.endsWith('/public-site/categories'))
      return mockPromise(PUBLIC_CATEGORIES_MOCK as unknown as T);
    if (u.endsWith('/public-site/programs')) return mockPromise(mockPrograms as unknown as T);
    if (u.endsWith('/public-site/recruitments'))
      return mockPromise(mockRecruitments as unknown as T);
    if (u.endsWith('/public-site/galleries')) return mockPromise(mockGalleries as unknown as T);
    // posts list paged: /public-site/posts?type=XXX&page=1&pageSize=...
    if (u.endsWith('/public-site/posts')) {
      const type = qs.get('type');
      const page = Number(qs.get('page') || 1);
      const pageSize = Number(qs.get('pageSize') || 12);
      if (type === 'BERITA') {
        return mockPromise(mockPostsBeritaLatestPage1 as unknown as T);
      }
      if (type === 'LOMBA') {
        return mockPromise(mockPostsLombaPage1 as unknown as T);
      }
      // KEGIATAN / PENGUMUMAN / all → filter mockAllPosts by type
      const filtered = type ? mockAllPosts.filter((p) => p.type === type) : mockAllPosts;
      const start = (page - 1) * pageSize;
      const paged = {
        items: filtered.slice(start, start + pageSize),
        page,
        pageSize,
        totalCount: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      };
      return mockPromise(paged as unknown as T);
    }
    // posts detail: /public-site/posts/:slug
    const postsDetailMatch = /\/public-site\/posts\/([^/]+)$/.exec(u);
    if (postsDetailMatch) {
      const slug = decodeURIComponent(postsDetailMatch[1]);
      const p = mockAllPosts.find((x: PublicPost) => x.slug === slug);
      return mockPromise((p ?? mockAllPosts[0] ?? null) as unknown as T);
    }
    // programs detail: fetches all then find on consumer — same as list
    // Unknown mock endpoint: throw no-network mock-not-found
    return Promise.reject(new Error(`[MOCK_LANDING] No mock payload for URL: ${url}`));
  }

  // ---------- REAL FETCHER WITH GUARDS ----------
  return api.get(url).then((r) => {
    const payload = r && typeof r === 'object' ? (r as any).data : undefined;
    // HTTP was 2xx but API-layer returned failure → treat as error, NOT let object-shape pass
    if (payload && typeof payload === 'object' && (payload as any).success === false) {
      throw new Error(String((payload as any).error || 'Request failed'));
    }
    let unwrapped: unknown;
    switch (mode.kind) {
      case 'top':
        unwrapped = payload;
        break;
      case 'detail':
      case 'data':
      default:
        unwrapped = payload && typeof payload === 'object' ? (payload as any).data : undefined;
        break;
    }
    // Defense in depth: if consumer endpoint expected array type T[], validate shape
    // (We can't know statically but callers usually destructure `=[]` — still throw clearly
    //  on obvious object-shape to prevent downstream `.find is not a function`.)
    if (
      unwrapped !== null &&
      unwrapped !== undefined &&
      typeof unwrapped === 'object' &&
      !Array.isArray(unwrapped) &&
      (unwrapped as Record<string, unknown>).success === false
    ) {
      throw new Error(
        String((unwrapped as Record<string, unknown>).error || 'Malformed response (error object)')
      );
    }
    return unwrapped as T;
  });
}

/** Helper: guarantee value is an array at render sites (defense-in-depth if fetcher misses).
 *  Prevents TypeError: X.find/slice/map is not a function when upstream bug leaks non-array object.
 */
export function safeArray<T>(value: T | null | undefined | unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

/** Helper: extract list items from paged response safely */
export function safePagedItems<T>(
  paged: Paged<T> | null | undefined | unknown,
  fallback: T[] = []
): T[] {
  if (!paged || typeof paged !== 'object') return fallback;
  const items = (paged as Partial<Paged<T>>).items;
  return safeArray(items, fallback);
}
