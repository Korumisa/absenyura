import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock('../utils/prisma.js', () => ({ default: db }));
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

test.each([{ rows: [{ idempotency_ready: false }] }, { rows: [] }])(
  'schema belum siap menghasilkan readiness gagal',
  async ({ rows }) => {
    db.$queryRaw.mockResolvedValue(rows);
    const { checkReadiness } = await import('./readiness.js');
    expect((await checkReadiness()).ready).toBe(false);
  }
);

test('gangguan database dicache singkat, lalu pemeriksaan pulih setelah TTL', async () => {
  db.$queryRaw
    .mockRejectedValueOnce({ code: 'P2024' })
    .mockResolvedValue([{ idempotency_ready: true }]);
  const { checkReadiness } = await import('./readiness.js');
  const burst = await Promise.all(Array.from({ length: 100 }, () => checkReadiness()));
  expect(burst.every((result) => !result.ready)).toBe(true);
  expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(5001);
  expect((await checkReadiness()).ready).toBe(true);
  expect(db.$queryRaw).toHaveBeenCalledTimes(2);
});
