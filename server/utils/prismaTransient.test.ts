import { describe, expect, test, vi } from 'vitest';
import { isPrismaConnectionError, withTransientDbRetry } from './prismaTransient.js';

describe('isPrismaConnectionError', () => {
  test('mengenali kode P1001 / P2024', () => {
    expect(isPrismaConnectionError({ code: 'P1001', message: 'unreachable' })).toBe(true);
    expect(isPrismaConnectionError({ code: 'P2024', message: 'pool timeout' })).toBe(true);
  });

  test('mengenali pesan koneksi tanpa kode Prisma', () => {
    expect(isPrismaConnectionError(new Error("Can't reach database server"))).toBe(true);
    expect(isPrismaConnectionError(new Error('Connection timed out'))).toBe(true);
  });

  test('tidak menganggap error schema sebagai connection error', () => {
    expect(
      isPrismaConnectionError({
        code: 'P2021',
        message: 'The table does not exist in the current database',
      })
    ).toBe(false);
  });
});

describe('withTransientDbRetry', () => {
  test('sukses di percobaan pertama tanpa delay', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withTransientDbRetry(fn, { retries: 2, delayMs: 10 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retry saat P1001 lalu sukses', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ code: 'P1001', message: "Can't reach database server" })
      .mockResolvedValueOnce('recovered');

    const promise = withTransientDbRetry(fn, { retries: 2, delayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    await expect(promise).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  test('melempar ulang jika bukan connection error', async () => {
    const err = { code: 'P2002', message: 'Unique constraint failed' };
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withTransientDbRetry(fn, { retries: 2, delayMs: 10 })).rejects.toEqual(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
