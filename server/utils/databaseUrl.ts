/**
 * Normalizes Supabase pooler URLs for Prisma.
 * - Transaction pooler (:6543, serverless/Vercel): needs pgbouncer mode, defaults to 1 connection.
 * - Session pooler (pooler host :5432, long-running VPS): keeps prepared statements, which saves
 *   round trips per query; only the timeouts are capped.
 */
function capTimeoutSeconds(url: URL, param: string, maxSeconds: number): void {
  const raw = url.searchParams.get(param);
  const value = raw == null || raw === '' ? NaN : Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > maxSeconds) {
    url.searchParams.set(param, String(maxSeconds));
  }
}

export function normalizeDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const isTransactionPooler = url.port === '6543';
    const isSessionPooler = !isTransactionPooler && url.hostname.includes('.pooler.supabase.com');

    if (isSessionPooler) {
      capTimeoutSeconds(url, 'connect_timeout', 5);
      // A persistent process can queue a check-in burst; stay well under the 20 s browser timeout.
      capTimeoutSeconds(url, 'pool_timeout', 10);
      return url.toString();
    }
    if (!isTransactionPooler) return raw;

    if (!url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true');
    }
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '1');
    }
    if (!url.searchParams.has('statement_cache_size')) {
      url.searchParams.set('statement_cache_size', '0');
    }
    // Keep pool waits below the browser deadline, including operation-level retries.
    capTimeoutSeconds(url, 'connect_timeout', 5);
    capTimeoutSeconds(url, 'pool_timeout', 5);

    return url.toString();
  } catch {
    return raw;
  }
}

export function resolveDatabaseUrl(): string | undefined {
  const direct = process.env.DIRECT_URL?.trim();
  let database = process.env.DATABASE_URL?.trim();

  if (!database && direct && process.env.NODE_ENV !== 'production') {
    database = direct;
  }

  if (!database) return undefined;

  return normalizeDatabaseUrl(database);
}
