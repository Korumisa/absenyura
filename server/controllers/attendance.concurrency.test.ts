import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import crypto from 'crypto';

const prismaMock = vi.hoisted(() => {
  return {
    challengeNonce: {
      delete: vi.fn(),
    },
    classEnrollment: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
    attendance: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
});

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }));
vi.mock('../jobs/cron.js', () => ({ triggerSessionCronLazy: vi.fn() }));
vi.mock('../utils/checkinLogger.js', () => ({ logCheckinStep: vi.fn() }));

// Import checkIn after mocking
import { checkIn } from './attendance.controller';

const createRes = () => {
  const res: { status?: any; json?: any } = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as any;
};

const fixedNow = new Date('2026-06-04T02:00:00.000Z');

const createNonceExpiredError = () => {
  const err = new Error('Record not found');
  (err as any).code = 'P2025';
  return err;
};

const createSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-id',
  status: 'ACTIVE',
  qr_mode: 'NONE',
  session_start: new Date(fixedNow.getTime() - 60 * 60000),
  late_threshold_minutes: 15,
  session_end: new Date(fixedNow.getTime() + 60 * 60000),
  check_in_open_at: new Date(fixedNow.getTime() - 10 * 60000),
  check_in_close_at: new Date(fixedNow.getTime() + 30 * 60000),
  location: {
    radius: 100,
    latitude: -6.2,
    longitude: 106.8,
    wifi_bssid: null,
  },
  class_id: 'class-id',
  session_classes: [],
  ...overrides,
});

const createReq = (nonce = 'test-nonce') => {
  const expiresAt = new Date(fixedNow.getTime() + 3600000);
  const body = {
    nonce,
    session_id: 'session-id',
    latitude: '-6.2001',
    longitude: '106.8001',
    accuracy: '10',
    ip_address: '127.0.0.1',
    device_fingerprint: 'device-1',
    photo_size: '1234',
    photo_type: 'image/jpeg',
    signature: '',
  };
  const secret = process.env.ATTENDANCE_PROOF_SECRET || 'test-attendance-proof-secret-123456';
  const payloadToSign = [
    'v2',
    'user-1',
    body.session_id,
    'checkin',
    '-',
    Number(body.latitude).toFixed(6),
    Number(body.longitude).toFixed(6),
    Number(body.accuracy).toFixed(2),
    body.photo_size,
    body.photo_type,
    body.nonce,
    expiresAt.toISOString(),
  ].join(':');
  body.signature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

  return {
    body,
    file: { path: 'tmp-attendance.jpg', size: 1234, mimetype: 'image/jpeg' },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    user: { id: 'user-1', role: 'USER' },
  } as any;
};

beforeEach(() => {
  process.env.ATTENDANCE_PROOF_SECRET = 'test-attendance-proof-secret-123456';
  vi.useFakeTimers();
  vi.setSystemTime(fixedNow);

  prismaMock.challengeNonce.delete.mockReset();
  prismaMock.challengeNonce.delete.mockResolvedValue({
    id: 'nonce-id',
    nonce: 'test-nonce',
    expires_at: new Date(fixedNow.getTime() + 3600000),
  });
  prismaMock.classEnrollment.findFirst.mockReset();
  prismaMock.classEnrollment.findFirst.mockResolvedValue({ id: 'enroll-id' });
  prismaMock.user.findUnique.mockReset();
  prismaMock.user.findUnique.mockResolvedValue({ device_fingerprint: 'device-1' });
  prismaMock.session.findUnique.mockReset();
  prismaMock.session.findUnique.mockResolvedValue(createSession());
  prismaMock.attendance.findFirst.mockReset();
  prismaMock.attendance.findFirst.mockResolvedValue(null);
  prismaMock.attendance.findUnique.mockReset();
  prismaMock.attendance.findUnique.mockResolvedValue(null);
  prismaMock.attendance.create.mockReset();
  prismaMock.attendance.create.mockImplementation(({ data }) =>
    Promise.resolve({
      id: 'attendance-id',
      ...data,
      user: { name: 'Student', nim_nip: '12345' },
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkIn Concurrency Nonce Test', () => {
  test('Two parallel check-in requests with the same nonce: one succeeds, one returns 400', async () => {
    const req1 = createReq();
    const req2 = createReq();

    const res1 = createRes();
    const res2 = createRes();

    prismaMock.challengeNonce.delete
      .mockResolvedValueOnce({
        id: 'nonce-id',
        nonce: 'test-nonce',
        expires_at: new Date(fixedNow.getTime() + 3600000),
      })
      .mockRejectedValueOnce(createNonceExpiredError());

    // Run both concurrently
    await Promise.all([checkIn(req1, res1), checkIn(req2, res2)]);

    const status1 = res1.status.mock.calls[0]?.[0];
    const status2 = res2.status.mock.calls[0]?.[0];

    const results = [status1, status2];
    expect(results).toContain(201);
    expect(results).toContain(400);

    const failedRes = status1 === 400 ? res1 : res2;
    expect(failedRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error:
          'Waktu pengambilan foto Anda telah habis demi keamanan. Mari ambil foto ulang untuk melanjutkan.',
      })
    );
  });
});

describe('checkIn attendance window and late status', () => {
  test('rejects an overridden ACTIVE session before check-in opens', async () => {
    prismaMock.session.findUnique.mockResolvedValue(
      createSession({
        check_in_open_at: new Date(fixedNow.getTime() + 5 * 60000),
        check_in_close_at: new Date(fixedNow.getTime() + 30 * 60000),
      })
    );

    const res = createRes();
    await checkIn(createReq('early-nonce'), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Waktu absensi belum dimulai.' })
    );
    expect(prismaMock.attendance.create).not.toHaveBeenCalled();
  });

  test('rejects an overridden ACTIVE session after check-in closes', async () => {
    prismaMock.session.findUnique.mockResolvedValue(
      createSession({
        check_in_open_at: new Date(fixedNow.getTime() - 30 * 60000),
        check_in_close_at: new Date(fixedNow.getTime() - 1),
        session_end: new Date(fixedNow.getTime() + 60 * 60000),
      })
    );

    const res = createRes();
    await checkIn(createReq('closed-nonce'), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Batas waktu absensi telah ditutup'),
      })
    );
    expect(prismaMock.attendance.create).not.toHaveBeenCalled();
  });

  test('records PRESENT inside the check-in window before late tolerance ends', async () => {
    prismaMock.session.findUnique.mockResolvedValue(
      createSession({
        session_start: new Date(fixedNow.getTime() - 60 * 60000),
        check_in_open_at: new Date(fixedNow.getTime() - 10 * 60000),
        check_in_close_at: new Date(fixedNow.getTime() + 30 * 60000),
        late_threshold_minutes: 15,
      })
    );

    const res = createRes();
    await checkIn(createReq('present-nonce'), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prismaMock.attendance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PRESENT' }),
      })
    );
  });

  test('records LATE only after late tolerance and before check-in closes', async () => {
    prismaMock.session.findUnique.mockResolvedValue(
      createSession({
        check_in_open_at: new Date(fixedNow.getTime() - 20 * 60000),
        check_in_close_at: new Date(fixedNow.getTime() + 10 * 60000),
        late_threshold_minutes: 15,
      })
    );

    const res = createRes();
    await checkIn(createReq('late-nonce'), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prismaMock.attendance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'LATE' }),
      })
    );
  });
});
