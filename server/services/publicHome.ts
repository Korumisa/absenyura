import prisma from '../utils/prisma.js';

export const PUBLIC_STRUCTURE_EMPTY = {
  data: [] as unknown[],
  cabinet: null,
  allCabinets: [] as unknown[],
};

const structureGroupsSelect = {
  orderBy: [{ sort_order: 'asc' as const }],
  select: {
    id: true,
    title: true,
    description: true,
    sort_order: true,
    is_core: true,
    members: {
      orderBy: [{ sort_order: 'asc' as const }, { created_at: 'asc' as const }],
      select: {
        id: true,
        name: true,
        role: true,
        photo_url: true,
        is_spotlight: true,
        sort_order: true,
      },
    },
  },
};

const postListSelect = {
  id: true,
  type: true,
  title: true,
  slug: true,
  date_label: true,
  status: true,
  form_url: true,
  excerpt: true,
  cover_image_url: true,
  category_id: true,
  is_published: true,
  published_at: true,
  created_at: true,
  updated_at: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

function parseDateRangeServer(dateRangeStr: string | null | undefined): {
  start?: Date;
  end?: Date;
} {
  if (!dateRangeStr) return {};
  const parts = String(dateRangeStr)
    .split(' - ')
    .map((s) => s.trim());
  const start = parts[0] ? new Date(parts[0]) : undefined;
  const end = parts[1] ? new Date(parts[1]) : undefined;
  return {
    start: start && !Number.isNaN(start.getTime()) ? start : undefined,
    end: end && !Number.isNaN(end.getTime()) ? end : undefined,
  };
}

export function isRecruitmentOpenServer(r: { date_range: string | null }): boolean {
  const { start, end } = parseDateRangeServer(r.date_range);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start) {
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    if (today < s) return false;
  }
  if (end) {
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
    if (today > e) return false;
  }
  return true;
}

export async function loadPublicStructure(cabinetId?: string) {
  const requestedId = typeof cabinetId === 'string' ? cabinetId.trim() : '';

  const allCabinets = await prisma.publicStructureCabinet.findMany({
    orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }, { created_at: 'desc' }],
    select: {
      id: true,
      name: true,
      period: true,
      is_active: true,
      sort_order: true,
    },
  });

  const targetId =
    (requestedId && allCabinets.some((c) => c.id === requestedId) ? requestedId : null) ||
    allCabinets.find((c) => c.is_active)?.id ||
    allCabinets[0]?.id ||
    null;

  const activeCabinet = targetId
    ? await prisma.publicStructureCabinet.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          name: true,
          period: true,
          is_active: true,
          sort_order: true,
          groups: structureGroupsSelect,
        },
      })
    : null;

  return {
    data: activeCabinet ? activeCabinet.groups : [],
    cabinet: activeCabinet,
    allCabinets,
  };
}

async function loadPostList(type: 'BERITA' | 'LOMBA', pageSize: number) {
  const where = { is_published: true, type };
  const [total, items] = await Promise.all([
    prisma.publicPost.count({ where }),
    prisma.publicPost.findMany({
      where,
      select: postListSelect,
      orderBy: [{ published_at: 'desc' }, { updated_at: 'desc' }],
      skip: 0,
      take: pageSize,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page: 1, pageSize, totalPages };
}

async function loadPublicGalleries() {
  const albums = await prisma.publicGalleryAlbum.findMany({
    where: { is_published: true },
    orderBy: [{ updated_at: 'desc' }],
    select: {
      id: true,
      title: true,
      description: true,
      is_published: true,
      created_at: true,
      updated_at: true,
      items: {
        take: 1,
        orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
        select: { id: true, image_url: true, caption: true, sort_order: true },
      },
      _count: { select: { items: true } },
    },
  });

  return albums.map(({ _count, ...album }) => ({
    ...album,
    item_count: _count.items,
  }));
}

export async function loadPublicHome(cabinetId?: string) {
  const [profile, programs, structure, latest, lomba, galleries, recruitments] = await Promise.all([
    prisma.publicSiteProfile.findFirst({ orderBy: { created_at: 'asc' } }),
    prisma.publicProgram.findMany({
      where: { is_published: true },
      orderBy: [{ updated_at: 'desc' }],
    }),
    loadPublicStructure(cabinetId),
    loadPostList('BERITA', 3),
    loadPostList('LOMBA', 6),
    loadPublicGalleries(),
    prisma.publicRecruitment
      .findMany({
        where: { is_published: true },
        orderBy: [{ updated_at: 'desc' }],
        include: {
          committee: { orderBy: [{ sort_order: 'asc' }] },
          contacts: { orderBy: [{ sort_order: 'asc' }] },
        },
      })
      .then((items) => items.filter((r) => isRecruitmentOpenServer(r))),
  ]);

  return {
    profile,
    programs,
    structure,
    latest,
    lomba,
    galleries,
    recruitments,
  };
}
