import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AuthRequest } from '../types/index.js';
import { attendanceErrors } from '../middlewares/attendanceErrors.js';
import { verifyAttendanceQr } from './attendanceQr.controller.js';

const db = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  classEnrollment: { findFirst: vi.fn() },
}));
vi.mock('../utils/prisma.js', () => ({ default: db }));

let server: Server;
let url: string;
beforeAll(async () => {
  const app = express();
  app.use(attendanceErrors, express.json());
  app.post('/verify-qr', (req: AuthRequest, res) => {
    req.user = { id: 'student', role: 'USER' } as AuthRequest['user'];
    return verifyAttendanceQr(req, res);
  });
  app.post('/failure', (_req, res) => {
    res.status(503).json({ error: 'Prisma /var/task/private.ts', details: { password: 'secret' } });
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
);
beforeEach(() => {
  vi.clearAllMocks();
  db.session.findUnique.mockResolvedValue({
    id: 'session',
    status: 'ACTIVE',
    qr_mode: 'STATIC',
    qr_token: 'valid-token',
    qr_secret: null,
    class_id: 'class',
    session_classes: [],
    check_in_open_at: new Date(Date.now() - 60_000),
    check_in_close_at: new Date(Date.now() + 60_000),
  });
  db.classEnrollment.findFirst.mockResolvedValue({ id: 'enrollment' });
});
const verify = (token: string) =>
  fetch(`${url}/verify-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 'session', qr_token: token }),
  });

describe('QR verification HTTP contract', () => {
  it('accepts valid QR before a photo is submitted', async () => {
    const response = await verify('valid-token');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });
  it('rejects an invalid QR with safe guidance', async () => {
    const response = await verify('wrong-token');
    expect(response.status).toBe(400);
    expect((await response.json()).error_code).toBe('QR_INVALID');
  });
  it('rejects students outside the class', async () => {
    db.classEnrollment.findFirst.mockResolvedValue(null);
    const response = await verify('valid-token');
    expect(response.status).toBe(403);
    expect((await response.json()).error_code).toBe('NOT_ENROLLED');
  });
  it('strips internal fields even when error details are enabled', async () => {
    const response = await fetch(`${url}/failure`, { method: 'POST' });
    expect(response.headers.get('retry-after')).toBe('30');
    const body = await response.json();
    expect(body.retry_after_ms).toBe(30_000);
    expect(body.trace_id).toMatch(/^[A-F0-9]{12}$/);
    expect(JSON.stringify(body)).not.toMatch(/Prisma|private|password|secret|details/);
  });
});
