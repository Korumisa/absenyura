import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { loadPublicHome, invalidatePublicHome } from './publicHome.js';
import { checkReadiness } from './readiness.js';
import { runLoadTest } from '../../scripts/load-test.js';

const db = vi.hoisted(() => ({
  publicSiteProfile: { findFirst: vi.fn() },
  publicProgram: { findMany: vi.fn() },
  publicStructureCabinet: { findMany: vi.fn(), findUnique: vi.fn() },
  publicPost: { count: vi.fn(), findMany: vi.fn() },
  publicGalleryAlbum: { findMany: vi.fn() },
  publicRecruitment: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock('../utils/prisma.js', () => ({ default: db }));

let server: Server;
let url: string;
beforeAll(async () => {
  const latency = async <T>(value: T) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return value;
  };
  db.publicSiteProfile.findFirst.mockImplementation(() => latency({ title: 'Test' }));
  db.publicProgram.findMany.mockImplementation(() => latency([]));
  db.publicStructureCabinet.findMany.mockImplementation(() => latency([{ id: 'cabinet' }]));
  db.publicStructureCabinet.findUnique.mockImplementation(() => latency({ groups: [] }));
  db.publicPost.count.mockImplementation(() => latency(0));
  db.publicPost.findMany.mockImplementation(() => latency([]));
  db.publicGalleryAlbum.findMany.mockImplementation(() => latency([]));
  db.publicRecruitment.findMany.mockImplementation(() => latency([]));
  db.$queryRaw.mockImplementation(() => latency([{ idempotency_ready: true }]));
  const app = express();
  app.get('/home', async (_req, res) => {
    res.json({ success: true, data: await loadPublicHome() });
  });
  app.get('/status', async (_req, res) => {
    const result = await checkReadiness();
    res.status(result.ready ? 200 : 503).json({ success: result.ready });
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

test('beban HTTP lokal: 500 request beranda, 50 pengguna bersamaan, satu pengambilan data', async () => {
  invalidatePublicHome();
  const result = await runLoadTest(`${url}/home`, 50, 500);
  console.info('LOAD_RESULT_PUBLIC_HOME_MOCK_DB', JSON.stringify(result));
  expect(result.failures).toBe(0);
  expect(result.p95_ms).toBeLessThan(2000);
  expect(db.publicSiteProfile.findFirst).toHaveBeenCalledTimes(1);
  expect(db.publicPost.count).toHaveBeenCalledTimes(2);
  expect(db.publicStructureCabinet.findUnique).toHaveBeenCalledTimes(1);
}, 15_000);

test('500 probe bersamaan tidak membuat 500 query database', async () => {
  const result = await runLoadTest(`${url}/status`, 50, 500);
  console.info('LOAD_RESULT_READINESS_MOCK_DB', JSON.stringify(result));
  expect(result.failures).toBe(0);
  expect(db.$queryRaw).toHaveBeenCalledTimes(1);
}, 15_000);

test('tidak menjalankan load test remote tanpa persetujuan eksplisit', async () => {
  vi.stubEnv('ALLOW_REMOTE_LOAD_TEST', '');
  await expect(runLoadTest('https://example.test/home')).rejects.toThrow('explicit approval');
  vi.unstubAllEnvs();
});
