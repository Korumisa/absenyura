import prisma from '../utils/prisma.js';
import { createSingleFlightCache } from '../utils/singleFlightCache.js';

const cache = createSingleFlightCache<{ ready: boolean; checked_at: string }>(5_000, 1);

export function checkReadiness() {
  return cache.get('readiness', async () => {
    let ready = false;
    try {
      const rows = await prisma.$queryRaw<Array<{ idempotency_ready: boolean }>>`
        SELECT to_regclass('public."IdempotencyKey"') IS NOT NULL AS idempotency_ready
      `;
      ready = rows[0]?.idempotency_ready === true;
      if (!ready)
        console.error(JSON.stringify({ type: 'readiness_failure', reason: 'schema_missing' }));
    } catch (error) {
      console.error(
        JSON.stringify({
          type: 'readiness_failure',
          reason: 'database_unavailable',
          error_code: (error as { code?: string })?.code ?? 'UNKNOWN',
        })
      );
    }
    // Cache failures too, so every browser polling during an outage does not add a DB query.
    return { ready, checked_at: new Date().toISOString() };
  });
}
