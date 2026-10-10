import { expect, test } from 'vitest';
import { normalizeDatabaseUrl } from './databaseUrl.js';

test('batas pool eksplisit dipertahankan; timeout default di bawah deadline browser', () => {
  const url = new URL(
    normalizeDatabaseUrl(
      'postgresql://test:test@sample.pooler.supabase.com:6543/postgres?connection_limit=4'
    )
  );
  expect(url.searchParams.get('connection_limit')).toBe('4');
  expect(url.searchParams.get('pool_timeout')).toBe('5');
  expect(url.searchParams.get('connect_timeout')).toBe('5');
  expect(url.searchParams.get('pgbouncer')).toBe('true');
});

test('URL direct dan timeout eksplisit di bawah batas tidak ditimpa', () => {
  const direct = 'postgresql://test:test@localhost:5432/test';
  expect(normalizeDatabaseUrl(direct)).toBe(direct);
  const url = new URL(
    normalizeDatabaseUrl(
      'postgresql://test:test@sample.pooler.supabase.com:6543/postgres?pool_timeout=2'
    )
  );
  expect(url.searchParams.get('pool_timeout')).toBe('2');
});

test('session pooler (VPS) tidak dipaksa ke mode pgbouncer', () => {
  const url = new URL(
    normalizeDatabaseUrl(
      'postgresql://test:test@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?connection_limit=10&pool_timeout=20'
    )
  );
  expect(url.searchParams.has('pgbouncer')).toBe(false);
  expect(url.searchParams.has('statement_cache_size')).toBe(false);
  expect(url.searchParams.get('connection_limit')).toBe('10');
  expect(url.searchParams.get('pool_timeout')).toBe('10');
  expect(url.searchParams.get('connect_timeout')).toBe('5');
});

test('pool_timeout produksi yang terlalu tinggi dipotong ke 5 detik', () => {
  const url = new URL(
    normalizeDatabaseUrl(
      'postgresql://test:test@sample.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10&connect_timeout=10'
    )
  );
  expect(url.searchParams.get('pool_timeout')).toBe('5');
  expect(url.searchParams.get('connect_timeout')).toBe('5');
  expect(url.searchParams.get('connection_limit')).toBe('1');
});
