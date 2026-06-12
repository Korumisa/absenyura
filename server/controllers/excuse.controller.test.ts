import { beforeEach, describe, expect, test, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  session: {
    findUnique: vi.fn(),
  },
  classEnrollment: {
    findFirst: vi.fn(),
  },
  excuseRequest: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
  challengeNonce: {
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }));
vi.mock('../utils/sessionAccess.js', () => ({ assertAdminSessionScope: vi.fn() }));
vi.mock('../utils/excuseProof.js', () => ({
  getExcuseProofSecret: vi.fn().mockReturnValue('test-secret'),
  buildExcuseProofPayload: vi.fn().mockReturnValue('test-payload'),
  signExcuseProof: vi.fn().mockReturnValue('test-signature'),
  isTimingSafeMatch: vi.fn().mockReturnValue(true),
}));
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    promises: {
      rename: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { assertAdminSessionScope } from '../utils/sessionAccess.js';
import { createExcuse, reviewExcuse } from './excuse.controller';

const createRes = () => {
  const res: { status?: any; json?: any } = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as any;
};

describe('excuse controller tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('createExcuse handles P2002 (unique constraint) and returns 400', async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'session-1',
      class_id: null,
      session_classes: [],
    });
    prismaMock.classEnrollment.findFirst.mockResolvedValue({ id: 'enroll-1' });
    prismaMock.excuseRequest.findFirst.mockResolvedValue(null);
    prismaMock.challengeNonce.delete.mockResolvedValue({
      expires_at: new Date(Date.now() + 100000),
    });

    const err = new Error('unique constraint');
    (err as any).code = 'P2002';
    prismaMock.excuseRequest.create.mockRejectedValue(err);

    const req = {
      body: {
        session_id: 'session-1',
        reason: 'SICK',
        description: 'Demam',
        nonce: 'test-nonce',
        signature: 'test-signature',
        photo_size: '100',
        photo_type: 'image/jpeg',
      },
      user: { id: 'user-1', role: 'USER' },
      file: { path: 'test-path', originalname: 'test.jpg', mimetype: 'image/jpeg' },
    } as any;
    const res = createRes();

    await createExcuse(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Anda sudah mengajukan izin untuk sesi ini',
      })
    );
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  test('reviewExcuse rejects when excuse is not PENDING', async () => {
    (assertAdminSessionScope as any).mockResolvedValue(true);
    prismaMock.excuseRequest.findUnique.mockResolvedValue({
      id: 'excuse-1',
      session_id: 'session-1',
      user_id: 'user-1',
      reason: 'SICK',
      status: 'APPROVED',
    });

    const req = {
      params: { id: 'excuse-1' },
      body: { status: 'REJECTED' },
      user: { id: 'admin-1', role: 'ADMIN' },
    } as any;
    const res = createRes();

    await reviewExcuse(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Pengajuan izin ini sudah diproses dan tidak dapat diubah lagi.',
      })
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
