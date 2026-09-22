import { describe, expect, test, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { publicSiteCache } from './publicSiteCache.middleware.js';

function createRes(statusCode = 200) {
  const headers: Record<string, string> = {};
  const res: Partial<Response> & { statusCode: number; body?: unknown } = {
    statusCode,
    setHeader: vi.fn((k: string, v: string) => {
      headers[k] = v;
      return res as Response;
    }) as any,
    json: vi.fn(function (this: any, body: unknown) {
      this.body = body;
      return this;
    }) as any,
  };
  return { res: res as Response, headers };
}

describe('publicSiteCache', () => {
  test('sets public edge cache on 200 JSON responses', () => {
    const { res, headers } = createRes(200);
    const next = vi.fn() as NextFunction;
    publicSiteCache({} as Request, res, next);
    expect(next).toHaveBeenCalled();
    res.json({ success: true });
    expect(headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300');
    expect(headers['CDN-Cache-Control']).toBeUndefined();
  });

  test('sets no-store on 503 JSON responses so errors are not CDN-cached', () => {
    const { res, headers } = createRes(503);
    publicSiteCache({} as Request, res, vi.fn() as NextFunction);
    res.json({ success: false, error: 'Database unavailable' });
    expect(headers['Cache-Control']).toBe('private, no-store');
    expect(headers['CDN-Cache-Control']).toBe('no-store');
    expect(headers['Vercel-CDN-Cache-Control']).toBe('no-store');
  });
});
