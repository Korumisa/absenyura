import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { guardCron } from './guardInternal.js';

const createRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

const createReq = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    query: {},
    ...overrides,
  }) as Request;

describe('guardCron', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret-32chars-minimum!!';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  test('rejects spoofed x-vercel-cron header without secret', () => {
    const next = vi.fn() as NextFunction;
    const res = createRes();
    const req = createReq({ headers: { 'x-vercel-cron': '1' } });

    guardCron(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid X-Cron-Secret header', () => {
    const next = vi.fn() as NextFunction;
    const res = createRes();
    const req = createReq({
      headers: { 'x-cron-secret': process.env.CRON_SECRET! },
    });

    guardCron(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects invalid secret', () => {
    const next = vi.fn() as NextFunction;
    const res = createRes();
    const req = createReq({ headers: { 'x-cron-secret': 'wrong-secret' } });

    guardCron(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts Authorization Bearer CRON_SECRET (Vercel cron)', () => {
    const next = vi.fn() as NextFunction;
    const res = createRes();
    const req = createReq({
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    guardCron(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects query key even when it matches secret', () => {
    const next = vi.fn() as NextFunction;
    const res = createRes();
    const req = createReq({ query: { key: process.env.CRON_SECRET } });

    guardCron(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});
