/**
 * Paths that must never run in production (seed / destructive helpers).
 * Shared by CSRF skip-list and authService prod guards so adding a route
 * only requires updating this module.
 */
export const INTERNAL_ONLY_PROD_BLOCKED_PATHS = ['/api/auth/seed', '/api/auth/flush-db'] as const;

export type InternalOnlyProdBlockedPath = (typeof INTERNAL_ONLY_PROD_BLOCKED_PATHS)[number];

export function isInternalOnlyProdBlockedPath(pathname: string): boolean {
  return (INTERNAL_ONLY_PROD_BLOCKED_PATHS as readonly string[]).includes(pathname);
}

export function isBlockedInProduction(
  pathname: InternalOnlyProdBlockedPath,
  nodeEnv: string | undefined
): boolean {
  return nodeEnv === 'production' && isInternalOnlyProdBlockedPath(pathname);
}

/** CSRF-exempt mutating paths (login/refresh bootstrap + health/cron + internal-only). */
export const CSRF_SKIP_EXACT_PATHS = [
  '/api/auth/login',
  '/api/auth/refresh',
  ...INTERNAL_ONLY_PROD_BLOCKED_PATHS,
  '/api/health',
  '/api/health/db',
  '/api/status',
] as const;

export const CSRF_SKIP_PREFIXES = ['/api/cron'] as const;

export function shouldSkipCsrfPath(pathname: string): boolean {
  if ((CSRF_SKIP_EXACT_PATHS as readonly string[]).includes(pathname)) return true;
  return CSRF_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
