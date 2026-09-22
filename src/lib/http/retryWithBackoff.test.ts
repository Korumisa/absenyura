import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from './retryWithBackoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test('retry 2 kali lalu sukses dengan delay eksponensial 400 dan 800ms', async () => {
    const fn = vi.fn();
    fn.mockRejectedValueOnce({
      response: { status: 503, data: {} },
      message: 'Service Unavailable',
    })
      .mockRejectedValueOnce({
        response: { status: 503, data: {} },
        message: 'Service Unavailable',
      })
      .mockResolvedValueOnce({ data: { success: true } });

    const promise = retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 400 });

    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(400);
    expect(fn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(800);
    expect(fn).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result).toEqual({ data: { success: true } });
  });

  test('menggunakan retry_after_ms dari response sebagai delay pertama jika > baseDelayMs', async () => {
    const fn = vi.fn();
    fn.mockRejectedValueOnce({
      response: { status: 503, data: { retry_after_ms: 2500 } },
      message: 'Service Unavailable',
    }).mockResolvedValueOnce({ data: { ok: true } });

    const promise = retryWithBackoff(fn, { maxRetries: 1, baseDelayMs: 400 });
    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2499);
    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    const result = await promise;
    expect(result).toEqual({ data: { ok: true } });
  });

  test('tidak retry untuk error 4xx (non-retryable)', async () => {
    const fn = vi.fn();
    fn.mockRejectedValue({
      response: { status: 400, data: { error: 'Data tidak valid' } },
      message: 'Bad Request',
    });

    const promise = retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 100 });

    await expect(promise).rejects.toBeDefined();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('tidak retry jika semua retry habis, lempar error terakhir', async () => {
    const fn = vi.fn();
    const lastErr = {
      response: { status: 500, data: {} },
      message: 'Internal',
    };
    fn.mockRejectedValue(lastErr);

    let caught: unknown;
    const promise = retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 100 }).then(
      (v) => v,
      (e) => {
        caught = e;
        throw e;
      }
    );
    void promise.catch(() => {}); // mark handled immediately to silence Node unhandled warning

    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(200);
    expect(fn).toHaveBeenCalledTimes(3);

    await vi.runAllTimersAsync();

    try {
      await promise;
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBe(lastErr);
    }
    expect(caught).toBe(lastErr);
  });

  test('onRetry callback dipanggil dengan attempt dan delayMs', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn();
    fn.mockRejectedValueOnce({
      response: { status: 502, data: {} },
    })
      .mockRejectedValueOnce({
        response: { status: 502, data: {} },
      })
      .mockResolvedValueOnce('done');

    const promise = retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 100, onRetry });

    await vi.advanceTimersByTimeAsync(100);
    expect(onRetry).toHaveBeenNthCalledWith(1, expect.anything(), 0, 100);

    await vi.advanceTimersByTimeAsync(200);
    expect(onRetry).toHaveBeenNthCalledWith(2, expect.anything(), 1, 200);

    await promise;
  });

  test('langsung sukses tanpa retry jika attempt pertama berhasil', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 100 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBe('ok');
  });
});
