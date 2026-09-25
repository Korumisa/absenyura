import { describe, expect, test, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  publicSiteProfile: { findFirst: vi.fn() },
  publicProgram: { findMany: vi.fn() },
  publicStructureCabinet: { findMany: vi.fn(), findUnique: vi.fn() },
  publicPost: { count: vi.fn(), findMany: vi.fn() },
  publicGalleryAlbum: { findMany: vi.fn() },
  publicRecruitment: { findMany: vi.fn() },
}));

vi.mock('../utils/prisma.js', () => ({ default: prismaMock }));

import { getPublicHome } from '../controllers/public-site.v2.controller';
import { isRecruitmentOpenServer, loadPublicHome } from './publicHome';

const createRes = () => {
  const res: { status?: any; json?: any } = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as any;
};

describe('isRecruitmentOpenServer', () => {
  test('tanpa rentang tanggal dianggap terbuka', () => {
    expect(isRecruitmentOpenServer({ date_range: null })).toBe(true);
  });

  test('rentang yang sudah lewat tertutup', () => {
    expect(isRecruitmentOpenServer({ date_range: '2020-01-01 - 2020-01-31' })).toBe(false);
  });
});

describe('loadPublicHome / getPublicHome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.publicSiteProfile.findFirst.mockResolvedValue({ id: 'p1', org_name: 'HMSDP' });
    prismaMock.publicProgram.findMany.mockResolvedValue([{ id: 'prog-1' }]);
    prismaMock.publicStructureCabinet.findMany.mockResolvedValue([
      { id: 'c1', name: 'A', period: '2024', is_active: true, sort_order: 0 },
    ]);
    prismaMock.publicStructureCabinet.findUnique.mockResolvedValue({
      id: 'c1',
      name: 'A',
      period: '2024',
      is_active: true,
      sort_order: 0,
      groups: [],
    });
    prismaMock.publicPost.count.mockResolvedValue(2);
    prismaMock.publicPost.findMany.mockResolvedValue([{ id: 'post-1' }]);
    prismaMock.publicGalleryAlbum.findMany.mockResolvedValue([
      { id: 'g1', title: 'Album', items: [], _count: { items: 0 } },
    ]);
    prismaMock.publicRecruitment.findMany.mockResolvedValue([
      { id: 'r1', date_range: null, committee: [], contacts: [] },
    ]);
  });

  test('menggabungkan semua section beranda dalam satu payload', async () => {
    const data = await loadPublicHome();
    expect(data.profile).toEqual({ id: 'p1', org_name: 'HMSDP' });
    expect(data.programs).toHaveLength(1);
    expect(data.structure.cabinet?.id).toBe('c1');
    expect(data.latest.pageSize).toBe(3);
    expect(data.lomba.pageSize).toBe(6);
    expect(data.galleries[0]).toMatchObject({ id: 'g1', item_count: 0 });
    expect(data.recruitments).toHaveLength(1);
    expect(prismaMock.publicSiteProfile.findFirst).toHaveBeenCalledTimes(1);
  });

  test('GET handler 200 + 503 connection error', async () => {
    const resOk = createRes();
    await getPublicHome({ query: {} } as any, resOk);
    expect(resOk.status).toHaveBeenCalledWith(200);
    expect(resOk.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ profile: expect.any(Object), programs: expect.any(Array) }),
      })
    );

    prismaMock.publicSiteProfile.findFirst.mockRejectedValue({
      code: 'P1001',
      message: "Can't reach database server",
    });
    const resFail = createRes();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await getPublicHome({ query: { cabinetId: 'c1' } } as any, resFail);
    expect(resFail.status).toHaveBeenCalledWith(503);
  });
});
