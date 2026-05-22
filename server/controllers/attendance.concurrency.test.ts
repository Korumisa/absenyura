import { describe, expect, test, vi } from 'vitest'
import crypto from 'crypto'

const prismaMock = vi.hoisted(() => {
  let callCount = 0;
  return {
    challengeNonce: {
      delete: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount > 1) {
          const err = new Error('Record not found');
          (err as any).code = 'P2025';
          throw err;
        }
        return Promise.resolve({ 
          id: 'nonce-id', 
          nonce: 'test-nonce',
          expires_at: new Date(Date.now() + 3600000) // 1 hour in the future
        });
      }),
    },
    classEnrollment: {
      findFirst: vi.fn().mockResolvedValue({ id: 'enroll-id' }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ device_fingerprint: 'device-1' }),
    },
    session: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'session-id',
        status: 'ACTIVE',
        qr_mode: 'NONE',
        session_start: new Date(Date.now() - 3600000), // 1 hour ago
        late_threshold_minutes: 15,
        session_end: new Date(Date.now() + 3600000), // in the future
        check_in_open_at: new Date(Date.now() - 3600000), // in the past
        check_in_close_at: new Date(Date.now() + 1800000), // in the future
        location: {
          radius: 100,
          latitude: -6.2,
          longitude: 106.8,
          wifi_bssid: null,
        },
        class_id: 'class-id',
      }),
    },
    attendance: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'attendance-id',
        user: { name: 'Student', nim_nip: '12345' },
      }),
    },
  };
});

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }));

// Import checkIn after mocking
import { checkIn } from './attendance.controller';

const createRes = () => {
  const res: { status?: any; json?: any } = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as any
}

describe('checkIn Concurrency Nonce Test', () => {
  test('Two parallel check-in requests with the same nonce: one succeeds, one returns 400', async () => {
    const req1 = {
      body: {
        nonce: 'test-nonce',
        session_id: 'session-id',
        latitude: '-6.2001',
        longitude: '106.8001',
        accuracy: '10',
        ip_address: '127.0.0.1',
        device_fingerprint: 'device-1',
        signature: '',
      },
      user: { id: 'user-1', role: 'USER' },
    } as any;

    const req2 = {
      body: {
        nonce: 'test-nonce',
        session_id: 'session-id',
        latitude: '-6.2001',
        longitude: '106.8001',
        accuracy: '10',
        ip_address: '127.0.0.1',
        device_fingerprint: 'device-1',
        signature: '',
      },
      user: { id: 'user-1', role: 'USER' },
    } as any;

    const res1 = createRes();
    const res2 = createRes();

    const secret = 'absenyura-secure-2026';
    const payloadToSign = `test-nonce:-6.2001:106.8001:${secret}`;
    const expectedSignature = crypto.createHash('sha256').update(payloadToSign).digest('hex');

    req1.body.signature = expectedSignature;
    req2.body.signature = expectedSignature;

    // Run both concurrently
    await Promise.all([
      checkIn(req1, res1),
      checkIn(req2, res2)
    ]);

    const status1 = res1.status.mock.calls[0]?.[0];
    const status2 = res2.status.mock.calls[0]?.[0];

    const results = [status1, status2];
    expect(results).toContain(201);
    expect(results).toContain(400);

    const failedRes = status1 === 400 ? res1 : res2;
    expect(failedRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Waktu pengambilan foto Anda telah habis demi keamanan. Mari ambil foto ulang untuk melanjutkan.'
    }));
  });
});
