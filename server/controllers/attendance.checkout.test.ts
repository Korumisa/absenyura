import { beforeEach, describe, expect, test, vi } from 'vitest';
import { buildAttendanceProofPayload, signAttendanceProof } from '../utils/attendanceValidation.js';

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
    vi.useRealTimers();
    process.env.ATTENDANCE_PROOF_SECRET = 'test-proof-secret-should-be-32-plus';
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

  test('allows checkout during the 2-minute grace window after session_end', async () => {
    const now = new Date('2026-06-28T10:01:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const nonce = 'nonce-grace-window';
    const expiresAt = new Date(now.getTime() + 60_000);
    const latitude = -6.2001;
    const longitude = 106.8001;
    const accuracy = 10;
    const photoSize = 1234;
    const photoType = 'image/jpeg';

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
        session_end: new Date(now.getTime() - 60_000),
        location: { latitude: -6.2, longitude: 106.8, radius: 100, wifi_bssid: null },
      },
    });
    prismaMock.challengeNonce.delete.mockResolvedValue({ expires_at: expiresAt });
    prismaMock.user.findUnique.mockResolvedValue({ device_fingerprint: null });
    prismaMock.attendance.update.mockResolvedValue({ id: 'attendance-1' });

    const proofSecret =
      process.env.ATTENDANCE_PROOF_SECRET ?? 'test-proof-secret-should-be-32-plus';
    const signature = signAttendanceProof(
      buildAttendanceProofPayload({
        userId: 'user-1',
        sessionId: 'session-1',
        action: 'checkout',
        attendanceId: 'attendance-1',
        latitude,
        longitude,
        accuracy,
        photoSize,
        photoType,
        nonce,
        expiresAt,
      }),
      proofSecret
    );

    const req = {
      params: { id: 'attendance-1' },
      body: {
        latitude: String(latitude),
        longitude: String(longitude),
        accuracy: String(accuracy),
        device_fingerprint: 'device-1',
        photo_size: String(photoSize),
        photo_type: photoType,
        nonce,
        signature,
      },
      file: {
        path: 'tmp-attendance.jpg',
        size: photoSize,
        mimetype: photoType,
        originalname: 'attendance.jpg',
        fieldname: 'photo',
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      user: { id: 'user-1', role: 'USER' },
    } as any;

    const res = createRes();
    await checkOut(req, res);

    expect(prismaMock.attendance.update).toHaveBeenCalledWith({
      where: { id: 'attendance-1' },
      data: { check_out_time: now },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
