import { beforeEach, describe, expect, test, vi } from 'vitest';

const prismaMock = vi.hoisted(() => {
  return {
    attendance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    challengeNonce: {
      delete: vi.fn(),
    },
  };
});

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }));

import { checkOut } from './attendance.controller';

const createRes = () => {
  const res: { status?: any; json?: any } = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as any;
};

describe('checkOut proof validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('rejects missing signature/nonce', async () => {
    prismaMock.attendance.findUnique.mockResolvedValue({
      id: 'attendance-1',
      user_id: 'user-1',
      check_out_time: null,
      session: {
        id: 'session-1',
        status: 'ACTIVE',
        qr_mode: 'NONE',
        qr_token: null,
        qr_secret: null,
        session_end: new Date(Date.now() + 60 * 60000),
        location: { latitude: -6.2, longitude: 106.8, radius: 100, wifi_bssid: null },
      },
    });

    const req = {
      params: { id: 'attendance-1' },
      body: {
        latitude: '-6.2001',
        longitude: '106.8001',
        accuracy: '10',
        device_fingerprint: 'device-1',
        photo_size: '1234',
        photo_type: 'image/jpeg',
        nonce: 'nonce-1',
        signature: '',
      },
      file: { path: 'tmp-attendance.jpg', size: 1234, mimetype: 'image/jpeg' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      user: { id: 'user-1', role: 'USER' },
    } as any;

    const res = createRes();
    await checkOut(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Security proof (nonce/signature) tidak valid'),
      })
    );
    expect(prismaMock.attendance.update).not.toHaveBeenCalled();
    expect(prismaMock.challengeNonce.delete).not.toHaveBeenCalled();
  });
});
