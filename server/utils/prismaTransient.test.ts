import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  isPrismaConnectionError,
  markDbUnavailable,
  resetDbAvailability,
  throwIfDbUnavailable,
  withTransientDbRetry,
} from './prismaTransient.js';

afterEach(() => {
  resetDbAvailability();
  vi.useRealTimers();
});

describe('isPrismaConnectionError', () => {
  test('hanya P2028 gagal memulai transaksi yang diklasifikasikan sementara', () => {
    expect(
      isPrismaConnectionError({
        code: 'P2028',
        message: 'Transaction API error: Unable to start a transaction in the given time.',
      })
    ).toBe(true);
    expect(isPrismaConnectionError({ code: 'P2028', message: 'Transaction already closed' })).toBe(
      false
    );
    expect(isPrismaConnectionError(null)).toBe(false);
  });
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
  test.each(['P1000', 'P1010', 'P1012', 'P2024', 'P2028', 'SERVER_BUSY'])(
    'tidak retry konfigurasi, pool penuh, atau transaksi ambigu: %s',
    async (code) => {
      const fn = vi.fn().mockRejectedValue({ code });
      await expect(withTransientDbRetry(fn)).rejects.toEqual({ code });
      expect(fn).toHaveBeenCalledTimes(1);
    }
  );
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

  test('instance menolak query baru selama jendela pool habis', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T00:53:00Z'));
    resetDbAvailability();
    expect(() => throwIfDbUnavailable()).not.toThrow();
    markDbUnavailable(10_000);
    try {
      throwIfDbUnavailable();
      throw new Error('expected SERVER_BUSY');
    } catch (error) {
      expect(error).toMatchObject({ code: 'SERVER_BUSY' });
    }
    vi.advanceTimersByTime(10_000);
    expect(() => throwIfDbUnavailable()).not.toThrow();
    resetDbAvailability();
    vi.useRealTimers();
  });

  test('melempar ulang jika bukan connection error', async () => {
    const err = { code: 'P2002', message: 'Unique constraint failed' };
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withTransientDbRetry(fn, { retries: 2, delayMs: 10 })).rejects.toEqual(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
