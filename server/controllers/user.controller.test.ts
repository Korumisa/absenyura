import { describe, expect, test, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }));

import { getUsers } from './user.controller';

const createRes = () => {
  const res: { status?: any; json?: any } = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as any;
};

describe('getUsers controller tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('backward compatibility: returns all users when no page is passed', async () => {
    const mockUsers = [
      { id: '1', name: 'User 1' },
      { id: '2', name: 'User 2' },
    ];
    prismaMock.user.findMany.mockResolvedValue(mockUsers);

    const req = {
      query: {},
    } as any;
    const res = createRes();

    await getUsers(req, res);

    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.count).toHaveBeenCalledTimes(0);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockUsers });
  });

  test('paginated request: validates and caps parameters correctly', async () => {
    const mockUsers = [{ id: '1', name: 'User 1' }];
    prismaMock.user.findMany.mockResolvedValue(mockUsers);
    prismaMock.user.count.mockResolvedValue(100);

    const req = {
      query: {
        page: '2',
        limit: '99999', // should cap to 50
        search: 'Budi',
        role: 'USER',
        status: 'ACTIVE',
      },
    } as any;
    const res = createRes();

    await getUsers(req, res);

    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
    // verify take parameter is capped at 50
    const findManyCall = prismaMock.user.findMany.mock.calls[0][0];
    expect(findManyCall.take).toBe(50);
    expect(findManyCall.skip).toBe(50); // page=2, limit=50 -> skip=50
    expect(findManyCall.where.role).toBe('USER');
    expect(findManyCall.where.is_active).toBe(true);
    expect(findManyCall.where.OR).toBeDefined();

    expect(prismaMock.user.count).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockUsers,
      meta: {
        total: 100,
        page: 2,
        limit: 50,
        totalPages: 2,
      },
    });
  });

  test('invalid page and limit inputs fallback correctly', async () => {
    const mockUsers: unknown[] = [];
    prismaMock.user.findMany.mockResolvedValue(mockUsers);
    prismaMock.user.count.mockResolvedValue(0);

    const req = {
      query: {
        page: 'invalid-number',
        limit: 'invalid-limit',
      },
    } as any;
    const res = createRes();

    await getUsers(req, res);

    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
    const findManyCall = prismaMock.user.findMany.mock.calls[0][0];
    expect(findManyCall.take).toBe(10); // fallback limit default
    expect(findManyCall.skip).toBe(0); // page fallback 1 -> skip=0

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockUsers,
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    });
  });
});
