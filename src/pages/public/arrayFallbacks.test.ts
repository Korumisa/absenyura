import { describe, expect, test } from 'vitest';

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
