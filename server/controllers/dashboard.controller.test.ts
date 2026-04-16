import { describe, expect, test, vi, beforeEach } from 'vitest'

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
  $queryRaw: vi.fn(),
}))

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }))

import { getDashboardStats } from './dashboard.controller'

const createRes = () => {
  const res: { status?: any; json?: any } = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as any
}

describe('getDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('USER dashboard chart does not do per-day queries', async () => {
    prismaMock.attendance.findMany.mockResolvedValue([])
    prismaMock.attendance.groupBy.mockResolvedValue([])
    prismaMock.session.findMany.mockResolvedValue([])
    prismaMock.$queryRaw.mockResolvedValue([])

    const req = {
      user: { id: 'u1', role: 'USER' },
      query: { range: '30' },
    } as any
    const res = createRes()

    await getDashboardStats(req, res)

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1)
    expect(prismaMock.attendance.findMany).toHaveBeenCalledTimes(0)
  })
})
