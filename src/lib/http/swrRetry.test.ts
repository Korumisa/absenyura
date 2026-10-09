import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { boundedSWRRetry } from './swrRetry';

const config = { errorRetryCount: 2, errorRetryInterval: 1000 } as Parameters<
  typeof boundedSWRRetry
>[2];
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('retry menunggu Retry-After dan tidak langsung mengulang', async () => {
  const retry = vi.fn();
  boundedSWRRetry(
    { response: { status: 503, data: { retry_after_ms: 30_000 } } },
    'home',
    config,
    retry,
    { retryCount: 1, dedupe: true }
  );
  expect(retry).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(29_999);
  expect(retry).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(retry).toHaveBeenCalledTimes(1);
});

test('batas percobaan tetap berlaku ketika memakai onErrorRetry kustom', async () => {
  const retry = vi.fn();
  boundedSWRRetry({ response: { status: 503 } }, 'home', config, retry, {
    retryCount: 3,
    dedupe: true,
  });
  await vi.runAllTimersAsync();
  expect(retry).not.toHaveBeenCalled();
});

test.each([
  { response: { status: 429 } },
  { response: { status: 401 } },
  { response: { status: 503 }, config: { _transientRetry: true } },
])('tidak menggandakan retry Axios atau mengulang error pengguna', async (error) => {
  const retry = vi.fn();
  boundedSWRRetry(error, 'home', config, retry, { retryCount: 1, dedupe: true });
  await vi.runAllTimersAsync();
  expect(retry).not.toHaveBeenCalled();
});
