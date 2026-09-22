import { describe, expect, test } from 'vitest';
import {
  INTERNAL_ONLY_PROD_BLOCKED_PATHS,
  isBlockedInProduction,
  shouldSkipCsrfPath,
} from './internalRoutes';

describe('internalRoutes', () => {
  test('prod-blocked paths are seed and flush-db only', () => {
    expect([...INTERNAL_ONLY_PROD_BLOCKED_PATHS]).toEqual(['/api/auth/seed', '/api/auth/flush-db']);
  });

  test('isBlockedInProduction only in production', () => {
    expect(isBlockedInProduction('/api/auth/seed', 'production')).toBe(true);
    expect(isBlockedInProduction('/api/auth/seed', 'development')).toBe(false);
    expect(isBlockedInProduction('/api/auth/flush-db', undefined)).toBe(false);
  });

  test('CSRF skip covers auth bootstrap, health, cron, and internal-only', () => {
    expect(shouldSkipCsrfPath('/api/auth/login')).toBe(true);
    expect(shouldSkipCsrfPath('/api/auth/refresh')).toBe(true);
    expect(shouldSkipCsrfPath('/api/auth/seed')).toBe(true);
    expect(shouldSkipCsrfPath('/api/auth/flush-db')).toBe(true);
    expect(shouldSkipCsrfPath('/api/health')).toBe(true);
    expect(shouldSkipCsrfPath('/api/cron/daily')).toBe(true);
    expect(shouldSkipCsrfPath('/api/auth/logout')).toBe(false);
    expect(shouldSkipCsrfPath('/api/excuses')).toBe(false);
  });
});
