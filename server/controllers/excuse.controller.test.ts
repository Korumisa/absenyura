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
  $transaction: vi.fn(),
}));

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }));
vi.mock('../utils/sessionAccess.js', () => ({ assertAdminSessionScope: vi.fn() }));

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

    const err = new Error('unique constraint');
    (err as any).code = 'P2002';
    prismaMock.excuseRequest.create.mockRejectedValue(err);

    const req = {
      body: { session_id: 'session-1', reason: 'SICK', description: 'Demam' },
      user: { id: 'user-1', role: 'USER' },
      file: undefined,
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
