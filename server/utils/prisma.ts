import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './databaseUrl.js';
import {
  isPrismaConnectionError,
  markDbUnavailable,
  throwIfDbUnavailable,
} from './prismaTransient.js';

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
        throwIfDbUnavailable();
        const t0 = performance.now();
        let errorCode: string | undefined;
        try {
          // Retry belongs to the operation owner, not every query (including transaction writes).
          return await query(args);
        } catch (error) {
          errorCode = String((error as { code?: string })?.code ?? 'UNKNOWN');
          if (errorCode !== 'SERVER_BUSY' && isPrismaConnectionError(error)) {
            markDbUnavailable();
          }
          throw error;
        } finally {
          const durationMs = Math.round(performance.now() - t0);
          if (durationMs > 500 || errorCode) {
            console.warn(
              JSON.stringify({
                type: 'db_operation',
                duration_ms: durationMs,
                model: model ?? 'unknown',
                op: operation,
                error_code: errorCode,
              })
            );
          }
        }
      },
    },
  });
}

const prisma = global.prisma ?? createPrismaClient();

global.prisma = prisma;

export default prisma;
