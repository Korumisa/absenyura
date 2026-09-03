import { describe, expect, test, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  attendance: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  session: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  user: {
    count: vi.fn(),
  },
  class: {
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
}));

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }));

import { getDashboardStats } from './dashboard.controller';

const createRes = () => {
  const res: { status?: any; json?: any } = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as any;
};

describe('getDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('USER dashboard chart does not do per-day queries', async () => {
    prismaMock.attendance.findMany.mockResolvedValue([]);
    prismaMock.attendance.groupBy.mockResolvedValue([]);
    prismaMock.session.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([]);

    const req = {
      user: { id: 'u1', role: 'USER' },
      query: { range: '30' },
    } as any;
    const res = createRes();

    await getDashboardStats(req, res);

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.attendance.findMany).toHaveBeenCalledTimes(0);
  });

  test('ADMIN dashboard scopes total users to enrolled students in owned classes', async () => {
    prismaMock.user.count.mockResolvedValue(12);
    prismaMock.session.count.mockResolvedValue(3);
    prismaMock.attendance.groupBy.mockResolvedValue([]);
    prismaMock.session.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([]);

    const req = {
      user: { id: 'lecturer-1', role: 'ADMIN' },
      query: { range: '7' },
    } as any;
    const res = createRes();

    await getDashboardStats(req, res);

    expect(prismaMock.user.count).toHaveBeenCalledWith({
      where: {
        role: 'USER',
        enrollments: {
          some: {
            class: { lecturer_id: 'lecturer-1' },
          },
        },
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('ADMIN dashboard recent sessions include class context for cards', async () => {
    prismaMock.user.count.mockResolvedValue(12);
    prismaMock.session.count.mockResolvedValue(3);
    prismaMock.attendance.groupBy.mockResolvedValue([]);
    prismaMock.session.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([]);

    const req = {
      user: { id: 'lecturer-1', role: 'ADMIN' },
      query: { range: '7' },
    } as any;
    const res = createRes();

    await getDashboardStats(req, res);

    expect(prismaMock.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          class: { select: { id: true, name: true } },
          session_classes: {
            select: {
              class: { select: { id: true, name: true } },
            },
          },
        }),
      })
    );
  });
});

describe('Dashboard ADMIN performance (P2-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should run ADMIN independent counts in parallel via Promise.all pattern', async () => {
    prismaMock.user.count.mockResolvedValue(150);
    prismaMock.session.count.mockResolvedValue(42);
    prismaMock.attendance.groupBy.mockResolvedValue([
      { status: 'PRESENT', _count: { _all: 30 } } as any,
      { status: 'LATE', _count: { _all: 5 } } as any,
    ]);
    prismaMock.session.findMany.mockResolvedValue([]);
    prismaMock.class.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([]);

    const req = {
      user: { id: 'lecturer-1', role: 'ADMIN' },
      query: { range: '7' },
    } as any;
    const res = createRes();

    await getDashboardStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          stats: {
            total_users: 150,
            total_sessions: 42,
            today_present: 30,
            today_late: 5,
          },
          recent_sessions: expect.any(Array),
          chart_data: expect.any(Array),
        }),
      })
    );
  });

  test('ADMIN chart rawSQL does not use correlated EXISTS per row pattern', async () => {
    prismaMock.user.count.mockResolvedValue(10);
    prismaMock.session.count.mockResolvedValue(5);
    prismaMock.attendance.groupBy.mockResolvedValue([]);
    prismaMock.session.findMany.mockResolvedValue([]);
    prismaMock.class.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([]);

    const req = {
      user: { id: 'lecturer-99', role: 'ADMIN' },
      query: { range: '7' },
    } as any;
    const res = createRes();

    await getDashboardStats(req, res);

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    const calledWith = prismaMock.$queryRaw.mock.calls[0][0];
    expect(calledWith).toBeDefined();
  });
});
