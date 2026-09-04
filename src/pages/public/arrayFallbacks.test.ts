import { describe, expect, test } from 'vitest';
import { safeRelation, safeItems, buildPagedResponse } from '../../lib/utils/publicContent';
import type { PagedResponse } from '../../types/api';

type PolyData<T> = T[] | { success: false; error?: string } | null | undefined;

const safeArray = <T,>(x: { data?: PolyData<T> } | undefined | null): T[] => {
  const data = x?.data;
  return Array.isArray(data) ? (data as T[]) : [];
};

describe('PublicHome Task A: Array.isArray fallback for polymorphic API responses', () => {
  test('programsState.data = valid array → returns same array (no .slice TypeError)', () => {
    const programsState = {
      data: [
        { id: 'p1', title: 'A' },
        { id: 'p2', title: 'B' },
      ],
    };
    const result = safeArray<{ id: string; title: string }>(programsState as any);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(() => result.slice(0, 1)).not.toThrow();
    expect(result.slice(0, 1).map((x) => x.id)).toEqual(['p1']);
  });

  test('programsState.data = {error:"ISE"} (non-array object) → falls back to [] without throwing', () => {
    const programsState = {
      data: { success: false as const, error: 'Internal Server Error' },
    };
    const result = safeArray<any>(programsState as any);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    expect(() => result.slice(0, 1)).not.toThrow();
  });

  test('recruitmentsState.data = null → falls back to empty array', () => {
    const recruitmentsState = { data: null };
    const result = safeArray<any>(recruitmentsState);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    expect(() => result.map((x: any) => x)).not.toThrow();
  });

  test('galleriesState.data = undefined → falls back to empty array', () => {
    const galleriesState = {};
    const result = safeArray<any>(galleriesState);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  test('mixed array fallback correctness — no silent TypeError downstream', () => {
    const samples: PolyData<number>[] = [
      [1, 2, 3],
      { success: false, error: 'ISE' },
      null,
      undefined,
      [],
      [42],
    ];
    for (const s of samples) {
      const state = { data: s };
      const arr = safeArray<number>(state);
      expect(Array.isArray(arr)).toBe(true);
      expect(typeof arr.slice).toBe('function');
      expect(typeof arr.map).toBe('function');
      expect(() => arr.slice(0, 5)).not.toThrow();
    }
  });
});

describe('T6 SafeRelation — polymorphic relation fallback (Galeri / OpenRecruitment / Fungsionaris)', () => {
  test('safeRelation: input = valid array → return reference same array (no slice/clone)', () => {
    const members = [{ id: 'm1', name: 'A' }, { id: 'm2', name: 'B' }];
    const out = safeRelation(members);
    expect(out).toBe(members);
    expect(out.length).toBe(2);
    expect(out.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  test('safeRelation: input = undefined → fallback [] tanpa throw', () => {
    expect(safeRelation(undefined)).toEqual([]);
    expect(() => safeRelation(undefined).map((x) => x)).not.toThrow();
    expect(() => safeRelation(undefined).length).not.toThrow();
  });

  test('safeRelation: input = null → fallback custom fallback array (bukan [] default)', () => {
    const customFb = [{ id: 'fb1', name: 'Fallback' }];
    expect(safeRelation(null, customFb)).toEqual(customFb);
    expect(safeRelation(null)).toEqual([]);
  });

  test('safeRelation: input = non-array primitive / object → fallback [] (defensive polymorphic)', () => {
    const samples = ['string-salah', 42, { foo: 'bar' }, true, BigInt(0)];
    for (const s of samples) {
      const out = safeRelation(s as any);
      expect(Array.isArray(out)).toBe(true);
      expect(out).toEqual([]);
      expect(() => out.filter(() => true)).not.toThrow();
    }
  });
});

describe('T6 SafeItems — polymorphic items extractor (Berita / InformasiLomba / Kegiatan PagedResponse)', () => {
  test('safeItems: input = null → fallback []', () => {
    expect(safeItems<number>(null)).toEqual([]);
    expect(safeItems<number>(undefined)).toEqual([]);
  });

  test('safeItems: input = raw array T[] → return array sama', () => {
    const arr = [1, 2, 3, 4];
    expect(safeItems<number>(arr)).toEqual([1, 2, 3, 4]);
    expect(safeItems<number>(arr)).toBe(arr);
  });

  test('safeItems: input = PagedResponse<T> {items:[...]} → extract .items', () => {
    const paged: PagedResponse<string> = {
      items: ['a', 'b', 'c'],
      total: 20, page: 2, pageSize: 6, totalPages: 4,
    };
    expect(safeItems<string>(paged)).toEqual(['a', 'b', 'c']);
  });

  test('safeItems: input = error object {error:"500"} (non .items) → fallback [] tanpa TypeError', () => {
    const errObj = { error: 'ISE 500', success: false };
    expect(safeItems<unknown>(errObj)).toEqual([]);
    const primitives = [0, 'hello', false, Symbol('x'), BigInt(1)];
    for (const p of primitives) expect(safeItems(p as any)).toEqual([]);
  });
});

describe('T6 buildPagedResponse — clamp pagination edge cases (page<1, page>total, pageSize 0)', () => {
  const items13 = Array.from({ length: 13 }, (_, i) => ({ id: `item-${i}`, idx: i }));

  test('buildPagedResponse: page < 1 (page=0 / negatif) → clamp ke page=1', () => {
    const r0 = buildPagedResponse(items13, 0, 5);
    expect(r0.page).toBe(1);
    expect(r0.items.length).toBe(5);
    expect(r0.items[0].idx).toBe(0);
    const rNeg = buildPagedResponse(items13, -99, 5);
    expect(rNeg.page).toBe(1);
    expect(rNeg.items[0].idx).toBe(0);
  });

  test('buildPagedResponse: page > totalPages → clamp ke halaman TERAKHIR', () => {
    // 13 items, pageSize 5 → totalPages 3
    const rLast = buildPagedResponse(items13, 999, 5);
    expect(rLast.page).toBe(3);
    expect(rLast.totalPages).toBe(3);
    expect(rLast.items.length).toBe(3);
    expect(rLast.items[0].idx).toBe(10);
    expect(rLast.items[rLast.items.length - 1].idx).toBe(12);
  });

  test('buildPagedResponse: pageSize = 0 / negatif → clamp ke pageSize ≥ 1 (default behavior)', () => {
    const r0 = buildPagedResponse(items13, 1, 0);
    expect(r0.pageSize).toBeGreaterThanOrEqual(1);
    expect(r0.items.length).toBe(r0.pageSize);
    const rNeg = buildPagedResponse(items13, 1, -7);
    expect(rNeg.pageSize).toBeGreaterThanOrEqual(1);
  });

  test('buildPagedResponse: totalPages calc + slice correctness untuk page tengah', () => {
    const rMid = buildPagedResponse(items13, 2, 5);
    expect(rMid.total).toBe(13);
    expect(rMid.totalPages).toBe(3);
    expect(rMid.page).toBe(2);
    expect(rMid.items.length).toBe(5);
    expect(rMid.items[0].idx).toBe(5);
    expect(rMid.items[4].idx).toBe(9);
  });
});
