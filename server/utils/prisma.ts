import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './databaseUrl.js';
import { withTransientDbRetry } from './prismaTransient.js';

declare global {
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

const databaseUrl = resolveDatabaseUrl();
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
} else if (process.env.NODE_ENV === 'production') {
  console.error(
    '[FATAL] DATABASE_URL must be set in production (Supabase pooler :6543 with pgbouncer=true).'
  );
  process.exit(1);
}

if (!(process.env.DATABASE_URL || '').startsWith('prisma://')) {
  process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
}

function createPrismaClient() {
  const base = new PrismaClient();
  return base.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const t0 = performance.now();
        const result = await withTransientDbRetry(() => query(args), { retries: 2, delayMs: 200 });
        const durationMs = Math.round(performance.now() - t0);
        if (durationMs > 500) {
          console.warn(
            JSON.stringify({
              type: 'slow_db_query_ms',
              value: durationMs,
              model: model ?? 'unknown',
              op: operation,
            })
          );
        }
        return result;
      },
    },
  });
}

const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
