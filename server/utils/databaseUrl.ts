/**
 * Normalizes Supabase pooler URLs for Prisma on serverless (PgBouncer transaction mode).
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
    const isPooler = url.port === '6543' || url.hostname.includes('.pooler.supabase.com');

    if (!isPooler) return raw;

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
