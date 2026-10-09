import { expect, test } from 'vitest';
import { getErrorMessage } from './errorMessage';

test('503 menampilkan waktu tunggu dan trace tanpa membocorkan pesan internal', () => {
  const message = getErrorMessage(
    {
      response: {
        status: 503,
        data: {
          error: 'Prisma failed at /var/task/secret.ts',
          retry_after_ms: 30_000,
          trace_id: 'ABCDEF123456',
        },
      },
    },
    'Gagal'
  );
  expect(message).toContain('30 detik');
  expect(message).toContain('ABCDEF123456');
  expect(message).not.toMatch(/Prisma|secret|var\/task/);
});

test('500 menyarankan memeriksa hasil mutasi, bukan langsung mengirim ulang', () => {
  expect(
    getErrorMessage(
      { response: { status: 500, data: { error: { trace_id: 'trace-123' } } } },
      'Gagal'
    )
  ).toMatch(/Periksa riwayat.*trace-123/);
});

test('trace tidak valid tidak ikut ditampilkan', () => {
  expect(
    getErrorMessage({ response: { status: 503, data: { trace_id: '<secret>' } } }, 'Gagal')
  ).not.toContain('<secret>');
});

test('challenge firewall tidak disamakan dengan pembatasan percobaan login', () => {
  expect(
    getErrorMessage(
      { response: { status: 429, headers: { 'x-vercel-mitigated': 'challenge' } } },
      'Gagal'
    )
  ).toContain('pemeriksaan keamanan');
});
