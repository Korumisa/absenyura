import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AuthRequest } from '../types/index.js';
import { idempotency } from './idempotency.js';

const db = vi.hoisted(() => ({
  idempotencyKey: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('../utils/prisma.js', () => ({ default: db }));

type Entry = {
  key: string;
  user_id: string;
  endpoint: string;
  consumed_at: Date;
  response_status: number | null;
  response_body: string | null;
};
const rows = new Map<string, Entry>();
let mutations = 0;
let server: Server;
let url: string;

beforeAll(async () => {
  const app = express();
  app.use((req: AuthRequest, _res, next) => {
    req.user = { id: req.header('test-user') ?? 'student', role: 'USER' };
    next();
  });
  app.post(['/submit', '/other'], idempotency, (_req, res) => {
    mutations++;
    res.status(201).json({ success: true, sequence: mutations });
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
  vi.resetAllMocks();
  rows.clear();
  mutations = 0;
  db.idempotencyKey.create.mockImplementation(async ({ data }: { data: Entry }) => {
    if (rows.has(data.key)) throw { code: 'P2002' };
    const row = { ...data, response_status: null, response_body: null };
    rows.set(data.key, row);
    return row;
  });
  db.idempotencyKey.findUnique.mockImplementation(async ({ where }: { where: { key: string } }) =>
    rows.get(where.key)
  );
  db.idempotencyKey.update.mockImplementation(
    async ({ where, data }: { where: { key: string }; data: Partial<Entry> }) => {
      Object.assign(rows.get(where.key)!, data);
      return rows.get(where.key);
    }
  );
  db.idempotencyKey.deleteMany.mockImplementation(
    async ({ where }: { where: { key: string; consumed_at: { lt: Date } } }) => {
      const row = rows.get(where.key);
      if (row && row.consumed_at < where.consumed_at.lt) {
        rows.delete(where.key);
        return { count: 1 };
      }
      return { count: 0 };
    }
  );
});

const submit = (key = 'same-key', path = '/submit', user = 'student') =>
  fetch(url + path, { method: 'POST', headers: { 'X-Idempotency-Key': key, 'test-user': user } });

test('100 kiriman dengan key sama hanya menjalankan satu mutasi', async () => {
  const results = await Promise.all(Array.from({ length: 100 }, () => submit()));
  for (const result of results) {
    expect([201, 409]).toContain(result.status);
    await result.arrayBuffer();
  }
  expect(mutations).toBe(1);
  expect(db.idempotencyKey.update).toHaveBeenCalledTimes(1);
});

test('respons lengkap disimpan sebelum sukses dan dapat diputar ulang', async () => {
  const first = await submit();
  const body = await first.json();
  expect(rows.get('same-key')?.response_body).toBe(JSON.stringify(body));
  const second = await submit();
  expect(await second.json()).toEqual(body);
  expect(mutations).toBe(1);
});

test.each(['P2021', 'P2024'])(
  'gagal tertutup tanpa mutasi ketika database gagal %s',
  async (code) => {
    db.idempotencyKey.create.mockRejectedValue({ code });
    const response = await submit();
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
    expect((await response.json()).trace_id).toMatch(/^[A-F0-9]{12}$/);
    expect(mutations).toBe(0);
  }
);

test('tidak memutar ulang data milik user atau endpoint lain', async () => {
  await (await submit()).arrayBuffer();
  expect((await submit('same-key', '/submit', 'other-student')).status).toBe(409);
  expect((await submit('same-key', '/other')).status).toBe(409);
  expect(mutations).toBe(1);
});

test('key kedaluwarsa diambil kembali sekali meskipun ada request bersamaan', async () => {
  rows.set('same-key', {
    key: 'same-key',
    user_id: 'student',
    endpoint: 'POST /submit',
    consumed_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
    response_status: 201,
    response_body: '{}',
  });
  const results = await Promise.all(Array.from({ length: 20 }, () => submit()));
  await Promise.all(results.map((r) => r.arrayBuffer()));
  expect(mutations).toBe(1);
});

test('gagal menyimpan respons tidak mengizinkan mutasi ganda', async () => {
  db.idempotencyKey.update.mockRejectedValue({ code: 'P2024' });
  const failed = await submit();
  expect(failed.status).toBe(503);
  await failed.arrayBuffer();
  const repeated = await submit();
  expect(repeated.status).toBe(409);
  expect(mutations).toBe(1);
});

test('key terlalu panjang ditolak sebelum query database', async () => {
  expect((await submit('a'.repeat(129))).status).toBe(400);
  expect(db.idempotencyKey.create).not.toHaveBeenCalled();
});
