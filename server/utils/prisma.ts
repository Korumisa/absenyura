import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './databaseUrl.js';

declare global {
  var prisma: PrismaClient | undefined;
}

const databaseUrl = resolveDatabaseUrl();
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
} else if (process.env.NODE_ENV === 'production') {
  console.error(
    '[FATAL] DATABASE_URL must be set in production (Supabase pooler :6543 with pgbouncer=true).',
  );
  process.exit(1);
}

if (!(process.env.DATABASE_URL || '').startsWith('prisma://')) {
  process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
}

const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
