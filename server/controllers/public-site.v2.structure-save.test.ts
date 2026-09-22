import { describe, expect, test, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  publicStructureCabinet: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  publicStructureGroup: {
    create: vi.fn(),
  },
  publicStructureMember: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }));

import { getPublicStructure, replaceAdminStructure } from './public-site.v2.controller';

const createRes = () => {
  const res: { status?: any; json?: any } = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as any;
};

const STRUCTURE_FALLBACK = { cabinets: [], activeCabinetId: null, activeGroups: [] };

describe('replaceAdminStructure', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('mengembalikan 503 dengan retry_after_ms ketika prisma throw P1001 connection error', async () => {
    prismaMock.$transaction.mockRejectedValue({
      code: 'P1001',
      name: 'PrismaClientInitializationError',
      message: "Can't reach database server at `localhost`:`5432`",
    });

    const req = {
      user: { id: 'admin-1' },
      body: {
        cabinetName: 'Kabinet Test',
        cabinetPeriod: '2024/2025',
        data: [],
      },
      ip: '127.0.0.1',
    } as any;
    const res = createRes();

    await replaceAdminStructure(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Database unavailable',
        data: STRUCTURE_FALLBACK,
        retry_after_ms: 2000,
      })
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[admin-structure:save]'));
  });

  test('mengembalikan 500 ketika throw Error biasa (bukan connection error)', async () => {
    prismaMock.$transaction.mockRejectedValue(new Error('Something went wrong'));

    const req = {
      user: { id: 'admin-2' },
      body: {
        cabinetName: 'Kabinet XYZ',
        cabinetPeriod: '2025',
        data: [{ title: 'BPH', people: [] }],
      },
      ip: '10.0.0.1',
    } as any;
    const res = createRes();

    await replaceAdminStructure(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Internal server error',
        data: STRUCTURE_FALLBACK,
      })
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[admin-structure:save]'));
  });

  test('rollback dan mengembalikan error ketika tx.auditLog.create throw di dalam transaction', async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        publicStructureCabinet: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          create: vi.fn().mockResolvedValue({ id: 'cab-1', name: 'Kabinet Audit' }),
        },
        publicStructureGroup: {
          create: vi.fn().mockResolvedValue({ id: 'grp-1', title: 'BPH' }),
        },
        publicStructureMember: {
          create: vi.fn().mockResolvedValue({ id: 'mbr-1' }),
        },
        auditLog: {
          create: vi.fn().mockRejectedValue(new Error('Audit log insert failed')),
        },
      };
      return fn(tx);
    });

    const req = {
      user: { id: 'admin-3' },
      body: {
        cabinetName: 'Kabinet Audit',
        cabinetPeriod: '2024',
        data: [
          {
            title: 'BPH',
            people: [{ name: 'Budi', role: 'Ketua', photoUrl: '' }],
          },
        ],
      },
      ip: '192.168.1.1',
    } as any;
    const res = createRes();

    await replaceAdminStructure(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Internal server error',
        data: STRUCTURE_FALLBACK,
      })
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[admin-structure:save]'));
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Audit log insert failed')
    );
  });

  test('happy path: transaction berhasil dan mengembalikan 200', async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        publicStructureCabinet: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          create: vi.fn().mockResolvedValue({ id: 'cab-happy', name: 'Kabinet Bahagia' }),
        },
        publicStructureGroup: {
          create: vi.fn().mockResolvedValue({ id: 'grp-happy', title: 'Inti' }),
        },
        publicStructureMember: {
          create: vi.fn().mockResolvedValue({ id: 'mbr-happy' }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'log-1' }),
        },
      };
      return fn(tx);
    });

    const req = {
      user: { id: 'admin-happy' },
      body: {
        cabinetName: 'Kabinet Bahagia',
        cabinetPeriod: '2024/2025',
        data: [
          {
            title: 'Inti',
            isCore: true,
            people: [
              {
                name: 'Siti',
                role: 'Ketua Umum',
                photoUrl: 'https://example.com/siti.jpg',
                isSpotlight: true,
              },
              { name: 'Andi', role: 'Wakil Ketua', photoUrl: '' },
            ],
          },
          {
            title: 'Departemen A',
            people: [],
          },
        ],
      },
      ip: '127.0.0.1',
    } as any;
    const res = createRes();

    await replaceAdminStructure(req, res);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Struktur organisasi berhasil disimpan',
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe('getPublicStructure', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('mengembalikan 503 dengan shape publik saat prisma connection error', async () => {
    prismaMock.publicStructureCabinet.findMany.mockRejectedValue({
      code: 'P1001',
      name: 'PrismaClientInitializationError',
      message: "Can't reach database server",
    });

    const res = createRes();
    await getPublicStructure({} as any, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Database unavailable',
        data: [],
        cabinet: null,
        allCabinets: [],
        retry_after_ms: 2000,
      })
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[public-structure]'),
      expect.anything()
    );
  });

  test('mengembalikan kabinet aktif + allCabinets pada sukses', async () => {
    const cabinets = [
      {
        id: 'c1',
        name: 'Kabinet A',
        is_active: true,
        groups: [{ id: 'g1', title: 'Inti', members: [] }],
      },
      {
        id: 'c2',
        name: 'Kabinet B',
        is_active: false,
        groups: [],
      },
    ];
    prismaMock.publicStructureCabinet.findMany.mockResolvedValue(cabinets);

    const res = createRes();
    await getPublicStructure({} as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: cabinets[0].groups,
      cabinet: cabinets[0],
      allCabinets: cabinets,
    });
  });
});
