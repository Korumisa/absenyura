/**
 * Shared helpers for transient Prisma/Postgres connection failures
 * (P1001, pool timeout, etc.) on serverless + Supabase pooler.
 */

export const PRISMA_CONNECTION_ERROR_CODES = new Set([
  'P1000',
  'P1001',
  'P1002',
  'P1003',
  'P1008',
  'P1009',
  'P1010',
  'P1011',
  'P1012',
  'P1013',
  'P1014',
  'P1015',
  'P1016',
  'P1017',
  'P2024',
]);

export function isPrismaConnectionError(err: unknown): boolean {
  const e = (err ?? {}) as { code?: unknown; name?: unknown; message?: unknown };
  if (e.code === 'SERVER_BUSY') return true;
  if (isTransactionStartTimeout(e)) return true;
  if (typeof e.code === 'string' && PRISMA_CONNECTION_ERROR_CODES.has(e.code)) return true;
  const name = typeof e.name === 'string' ? e.name : '';
  const msg = typeof e.message === 'string' ? e.message : '';
  // Avoid matching schema messages like "does not exist in the current database".
  if (
    /(?:can't reach|cannot reach|connection (?:timed out|refused|reset)|econnrefused|etimedout|epipe|connection pool|timed out fetching|server has closed the connection)/i.test(
      `${name} ${msg}`
    )
  ) {
    return true;
  }
  return false;
}

export function isTransactionStartTimeout(err: unknown): boolean {
  const e = (err ?? {}) as { code?: unknown; message?: unknown };
  return (
    e.code === 'P2028' && /unable to start a transaction in the given time/i.test(String(e.message))
  );
}

// Do not retry P2024: the pool is already full, so extra waits amplify stampede latency.
const RETRYABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

const DB_BUSY_MS = 10_000;
let dbBusyUntil = 0;

export function markDbUnavailable(durationMs = DB_BUSY_MS): void {
  dbBusyUntil = Math.max(dbBusyUntil, Date.now() + durationMs);
}

export function resetDbAvailability(): void {
  dbBusyUntil = 0;
}

export function throwIfDbUnavailable(): void {
  if (Date.now() < dbBusyUntil) {
    throw Object.assign(new Error('Database busy'), { code: 'SERVER_BUSY' });
  }
}

export type TransientRetryOptions = {
  /** Extra attempts after the first failure (default 2 → 3 total tries). */
  retries?: number;
  /** Initial backoff in ms; doubles each retry (default 200). */
  delayMs?: number;
};

export async function withTransientDbRetry<T>(
  fn: () => Promise<T>,
  opts: TransientRetryOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const delayMs = opts.delayMs ?? 200;

  try {
    return await fn();
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (retries > 0 && (code ? RETRYABLE_CODES.has(code) : isPrismaConnectionError(err))) {
      await new Promise((r) => setTimeout(r, delayMs));
      return withTransientDbRetry(fn, { retries: retries - 1, delayMs: delayMs * 2 });
    }
    throw err;
  }
}
