import { afterEach, expect, test, vi } from 'vitest';
import { createSingleFlightCache } from './singleFlightCache.js';

afterEach(() => vi.useRealTimers());

test('100 pembaca bersamaan hanya menjalankan satu operasi', async () => {
  const cache = createSingleFlightCache<number>(1000);
  const load = vi.fn(async () => 42);
  expect(await Promise.all(Array.from({ length: 100 }, () => cache.get('home', load)))).toEqual(
    Array(100).fill(42)
  );
  expect(load).toHaveBeenCalledTimes(1);
});

test('TTL berakhir dan kegagalan tidak tersimpan sebagai hasil sukses', async () => {
  vi.useFakeTimers();
  const cache = createSingleFlightCache<number>(1000);
  const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(1);
  await expect(cache.get('home', load)).rejects.toThrow('offline');
  await expect(cache.get('home', load)).resolves.toBe(1);
  await cache.get('home', load);
  expect(load).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(1001);
  await cache.get('home', load);
  expect(load).toHaveBeenCalledTimes(3);
});

test('invalidation tidak mengembalikan data lama dari operasi yang masih berlangsung', async () => {
  const cache = createSingleFlightCache<number>(1000);
  let resolve!: (value: number) => void;
  const pending = cache.get(
    'home',
    () =>
      new Promise<number>((done) => {
        resolve = done;
      })
  );
  await Promise.resolve();
  cache.clear();
  await expect(cache.get('home', async () => 2)).resolves.toBe(2);
  resolve(1);
  await pending;
  await expect(cache.get('home', async () => 3)).resolves.toBe(2);
});

test('jumlah key dibatasi dan pekerjaan aktif tidak digandakan', async () => {
  const cache = createSingleFlightCache<number>(1000, 1);
  let resolve!: (value: number) => void;
  const pending = cache.get(
    'a',
    () =>
      new Promise<number>((done) => {
        resolve = done;
      })
  );
  await Promise.resolve();
  await expect(cache.get('b', async () => 2)).rejects.toMatchObject({ code: 'SERVER_BUSY' });
  resolve(1);
  await pending;
  await expect(cache.get('b', async () => 2)).resolves.toBe(2);
  await expect(cache.get('a', async () => 3)).resolves.toBe(3);
});
