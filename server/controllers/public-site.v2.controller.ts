import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { upload } from '../utils/upload.js';
import { v2 as cloudinary } from 'cloudinary';

type PublicRoleRequest = Request & { user?: { id: string; role: string } };

function toInt(value: unknown, fallback: number) {
  const n = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeYoutubeEmbedUrl(input: string): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  const directId = raw.match(/^[a-zA-Z0-9_-]{6,}$/)?.[0];
  if (directId) return `https://www.youtube.com/embed/${directId}`;

  if (raw.includes('youtube.com/embed/') || raw.includes('youtube-nocookie.com/embed/')) {
    return raw.startsWith('http://') ? raw.replace(/^http:\/\//, 'https://') : raw;
  }

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, '');
    let id = '';

    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host.endsWith('youtube.com')) {
      if (url.pathname === '/watch') {
        id = url.searchParams.get('v') || '';
      } else if (url.pathname.startsWith('/shorts/')) {
        id = url.pathname.split('/')[2] || '';
      } else if (url.pathname.startsWith('/embed/')) {
        id = url.pathname.split('/')[2] || '';
      } else if (url.pathname.startsWith('/live/')) {
        id = url.pathname.split('/')[2] || '';
      }
    }

    id = id.trim();
    if (!id) return null;
    if (!/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

async function ensureUniquePostSlug(base: string) {
  const clean = base || 'post';
  let slug = clean;
  let i = 2;
  while (true) {
    const exists = await prisma.publicPost.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${clean}-${i}`;
    i += 1;
  }
}

async function ensureUniqueCategorySlug(base: string) {
  const clean = base || 'kategori';
  let slug = clean;
  let i = 2;
  while (true) {
    const exists = await prisma.publicCategory.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${clean}-${i}`;
    i += 1;
  }
}

export const getPublicProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await prisma.publicSiteProfile.findFirst({ orderBy: { created_at: 'asc' } });
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const upsertAdminProfile = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const data = req.body?.data;
    if (!data || typeof data !== 'object') {
      res.status(400).json({ success: false, error: 'Data tidak valid' });
      return;
    }

    const existing = await prisma.publicSiteProfile.findFirst({ orderBy: { created_at: 'asc' } });
    const payload = {
      org_name: String((data as any).orgName ?? '').trim(),
      campus_name: String((data as any).campusName ?? '').trim(),
      kabinet_name: String((data as any).kabinetName ?? '').trim() || null,
      kabinet_period: String((data as any).kabinetPeriod ?? '').trim() || null,
      hero_subtitle: String((data as any).heroSubtitle ?? '').trim() || null,
      home_image_url: String((data as any).homeImageUrl ?? '').trim() || null,
      youtube_embed_url:
        typeof (data as any).youtubeEmbedUrl === 'string'
          ? normalizeYoutubeEmbedUrl((data as any).youtubeEmbedUrl)
          : (existing?.youtube_embed_url ?? null),
      about_title: String((data as any).aboutTitle ?? '').trim() || null,
      about_content: String((data as any).aboutContent ?? '').trim() || null,
      footer_tagline: String((data as any).footerTagline ?? '').trim() || null,
      instagram_url: String((data as any).instagramUrl ?? '').trim() || null,
      tiktok_url: String((data as any).tiktokUrl ?? '').trim() || null,
      youtube_url: String((data as any).youtubeUrl ?? '').trim() || null,
      address: String((data as any).address ?? '').trim() || null,
      email: String((data as any).email ?? '').trim() || null,
      phone: String((data as any).phone ?? '').trim() || null,
      logo_light_url: String((data as any).logoLightUrl ?? '').trim() || null,
      logo_dark_url: String((data as any).logoDarkUrl ?? '').trim() || null,
      primary_color:
        typeof (data as any).primaryColor === 'string'
          ? String((data as any).primaryColor ?? '').trim() || null
          : (existing?.primary_color ?? null),
    };

    if (!payload.org_name || !payload.campus_name) {
      res.status(400).json({ success: false, error: 'Nama organisasi dan nama kampus wajib diisi' });
      return;
    }

    const saved = existing
      ? await prisma.publicSiteProfile.update({ where: { id: existing.id }, data: payload })
      : await prisma.publicSiteProfile.create({ data: payload });

    res.status(200).json({ success: true, data: saved });
  } catch (error) {
    console.error('Error upserting public profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await prisma.publicStructureGroup.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      include: { members: { orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] } },
    });
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    console.error('Error fetching public structure:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getAdminStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await prisma.publicStructureGroup.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      include: { members: { orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] } },
    });
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    console.error('Error fetching admin structure:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const replaceAdminStructure = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const data = req.body?.data;
    if (!Array.isArray(data)) {
      res.status(400).json({ success: false, error: 'Data tidak valid' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.publicStructureMember.deleteMany({});
      await tx.publicStructureGroup.deleteMany({});

      for (let gi = 0; gi < data.length; gi += 1) {
        const g = data[gi] ?? {};
        const title = String(g.title ?? '').trim();
        if (!title) continue;
        const group = await tx.publicStructureGroup.create({
          data: { title, sort_order: toInt(g.sortOrder, gi) },
        });
        const people = Array.isArray(g.people) ? g.people : [];
        for (let pi = 0; pi < people.length; pi += 1) {
          const p = people[pi] ?? {};
          const name = String(p.name ?? '').trim();
          const role = String(p.role ?? '').trim();
          if (!name || !role) continue;
          await tx.publicStructureMember.create({
            data: { group_id: group.id, name, role, sort_order: toInt(p.sortOrder, pi) },
          });
        }
      }
    });

    res.status(200).json({ success: true, message: 'Struktur organisasi berhasil disimpan' });
  } catch (error) {
    console.error('Error replacing structure:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.publicProgram.findMany({
      where: { is_published: true },
      orderBy: [{ updated_at: 'desc' }],
    });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching public programs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const listAdminPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.publicProgram.findMany({ orderBy: [{ updated_at: 'desc' }] });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching admin programs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAdminProgram = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const payload = req.body ?? {};
    const title = String(payload.title ?? '').trim();
    if (!title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    const row = await prisma.publicProgram.create({
      data: {
        title,
        date_range: String(payload.dateRange ?? '').trim() || null,
        description: String(payload.description ?? '').trim() || null,
        is_published: Boolean(payload.isPublished ?? false),
      },
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Error creating program:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminProgram = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const payload = req.body ?? {};
    const existing = await prisma.publicProgram.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Program kerja tidak ditemukan' });
      return;
    }
    const title = String(payload.title ?? existing.title).trim();
    if (!title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    const row = await prisma.publicProgram.update({
      where: { id },
      data: {
        title,
        date_range: typeof payload.dateRange === 'string' ? payload.dateRange.trim() || null : existing.date_range,
        description: typeof payload.description === 'string' ? payload.description.trim() || null : existing.description,
        is_published: typeof payload.isPublished === 'boolean' ? payload.isPublished : existing.is_published,
      },
    });
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('Error updating program:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAdminProgram = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.publicProgram.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Program kerja berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const listPublicCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.publicCategory.findMany({ orderBy: [{ name: 'asc' }] });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const listAdminCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.publicCategory.findMany({ orderBy: [{ name: 'asc' }] });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAdminCategory = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) {
      res.status(400).json({ success: false, error: 'Nama kategori wajib diisi' });
      return;
    }
    const requestedSlug = String(req.body?.slug ?? '').trim();
    const baseSlug = slugify(requestedSlug || name);
    const slug = await ensureUniqueCategorySlug(baseSlug);
    const row = await prisma.publicCategory.create({ data: { name, slug } });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminCategory = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.publicCategory.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Kategori tidak ditemukan' });
      return;
    }
    const name = String(req.body?.name ?? existing.name).trim();
    if (!name) {
      res.status(400).json({ success: false, error: 'Nama kategori wajib diisi' });
      return;
    }
    const requestedSlug = String(req.body?.slug ?? existing.slug).trim();
    const baseSlug = slugify(requestedSlug || name);
    let slug = baseSlug;
    if (slug !== existing.slug) {
      slug = await ensureUniqueCategorySlug(baseSlug);
    }
    const row = await prisma.publicCategory.update({ where: { id }, data: { name, slug } });
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAdminCategory = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.publicCategory.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const listPublicPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(24, Math.max(3, toInt(req.query.pageSize, 6)));
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const categorySlug = typeof req.query.categorySlug === 'string' ? req.query.categorySlug : undefined;

    const where: any = { is_published: true };
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (type) where.type = type;
    if (categorySlug) where.category = { slug: categorySlug };

    const [total, items] = await prisma.$transaction([
      prisma.publicPost.count({ where }),
      prisma.publicPost.findMany({
        where,
        include: { category: true },
        orderBy: [{ published_at: 'desc' }, { updated_at: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.status(200).json({
      success: true,
      data: { items, total, page, pageSize, totalPages },
    });
  } catch (error) {
    console.error('Error listing public posts:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicPostBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const row = await prisma.publicPost.findFirst({
      where: { slug, is_published: true },
      include: { category: true },
    });
    if (!row) {
      res.status(404).json({ success: false, error: 'Konten tidak ditemukan' });
      return;
    }
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('Error fetching public post:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const listAdminPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const where: any = {};
    if (type) where.type = type;
    const items = await prisma.publicPost.findMany({
      where,
      include: { category: true },
      orderBy: [{ updated_at: 'desc' }],
    });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error listing admin posts:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAdminPost = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const payload = req.body ?? {};
    const title = String(payload.title ?? '').trim();
    if (!title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    const requestedSlug = String(payload.slug ?? '').trim();
    const baseSlug = slugify(requestedSlug || title);
    const slug = await ensureUniquePostSlug(baseSlug);
    const isPublished = Boolean(payload.isPublished ?? false);
    const now = new Date();
    const row = await prisma.publicPost.create({
      data: {
        type: payload.type ?? 'BERITA',
        title,
        slug,
        date_label: String(payload.dateLabel ?? '').trim() || null,
        status: String(payload.status ?? '').trim() || null,
        excerpt: String(payload.excerpt ?? '').trim() || null,
        content: String(payload.content ?? '').trim() || null,
        cover_image_url: String(payload.coverImageUrl ?? '').trim() || null,
        category_id: String(payload.categoryId ?? '').trim() || null,
        is_published: isPublished,
        published_at: isPublished ? now : null,
        created_by: req.user?.id ?? null,
      },
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminPost = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const payload = req.body ?? {};
    const existing = await prisma.publicPost.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Konten tidak ditemukan' });
      return;
    }
    const title = String(payload.title ?? existing.title).trim();
    if (!title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    const requestedSlug = typeof payload.slug === 'string' ? payload.slug.trim() : existing.slug;
    const baseSlug = slugify(requestedSlug || title);
    let slug = baseSlug;
    if (slug !== existing.slug) {
      slug = await ensureUniquePostSlug(baseSlug);
    }

    const nextIsPublished = typeof payload.isPublished === 'boolean' ? payload.isPublished : existing.is_published;
    const publishedAt = nextIsPublished
      ? existing.published_at ?? new Date()
      : null;

    const row = await prisma.publicPost.update({
      where: { id },
      data: {
        type: payload.type ?? existing.type,
        title,
        slug,
        date_label: typeof payload.dateLabel === 'string' ? payload.dateLabel.trim() || null : existing.date_label,
        status: typeof payload.status === 'string' ? payload.status.trim() || null : existing.status,
        excerpt: typeof payload.excerpt === 'string' ? payload.excerpt.trim() || null : existing.excerpt,
        content: typeof payload.content === 'string' ? payload.content.trim() || null : existing.content,
        cover_image_url: typeof payload.coverImageUrl === 'string' ? payload.coverImageUrl.trim() || null : existing.cover_image_url,
        category_id: typeof payload.categoryId === 'string' ? payload.categoryId.trim() || null : existing.category_id,
        is_published: nextIsPublished,
        published_at: publishedAt,
      },
    });
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAdminPost = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.publicPost.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Konten berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicGalleries = async (req: Request, res: Response): Promise<void> => {
  try {
    const albums = await prisma.publicGalleryAlbum.findMany({
      where: { is_published: true },
      orderBy: [{ updated_at: 'desc' }],
      include: { items: { orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] } },
    });
    res.status(200).json({ success: true, data: albums });
  } catch (error) {
    console.error('Error fetching public galleries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const listAdminGalleries = async (req: Request, res: Response): Promise<void> => {
  try {
    const albums = await prisma.publicGalleryAlbum.findMany({
      orderBy: [{ updated_at: 'desc' }],
      include: { items: { orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] } },
    });
    res.status(200).json({ success: true, data: albums });
  } catch (error) {
    console.error('Error fetching admin galleries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAdminGallery = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const payload = req.body ?? {};
    const title = String(payload.title ?? '').trim();
    if (!title) {
      res.status(400).json({ success: false, error: 'Judul album wajib diisi' });
      return;
    }
    const items = Array.isArray(payload.items) ? payload.items : [];
    const row = await prisma.publicGalleryAlbum.create({
      data: {
        title,
        description: String(payload.description ?? '').trim() || null,
        is_published: Boolean(payload.isPublished ?? false),
        items: {
          create: items
            .map((x: any, idx: number) => ({
              image_url: String(x?.imageUrl ?? '').trim(),
              caption: String(x?.caption ?? '').trim() || null,
              sort_order: toInt(x?.sortOrder, idx),
            }))
            .filter((x: any) => Boolean(x.image_url)),
        },
      },
      include: { items: true },
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Error creating gallery:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminGallery = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.publicGalleryAlbum.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Album tidak ditemukan' });
      return;
    }
    const payload = req.body ?? {};
    const title = String(payload.title ?? existing.title).trim();
    if (!title) {
      res.status(400).json({ success: false, error: 'Judul album wajib diisi' });
      return;
    }
    const items = Array.isArray(payload.items) ? payload.items : null;

    const row = await prisma.publicGalleryAlbum.update({
      where: { id },
      data: {
        title,
        description: typeof payload.description === 'string' ? payload.description.trim() || null : existing.description,
        is_published: typeof payload.isPublished === 'boolean' ? payload.isPublished : existing.is_published,
        items: items
          ? {
              deleteMany: {},
              create: items
                .map((x: any, idx: number) => ({
                  image_url: String(x?.imageUrl ?? '').trim(),
                  caption: String(x?.caption ?? '').trim() || null,
                  sort_order: toInt(x?.sortOrder, idx),
                }))
                .filter((x: any) => Boolean(x.image_url)),
            }
          : undefined,
      },
      include: { items: true },
    });
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('Error updating gallery:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAdminGallery = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.publicGalleryAlbum.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Album berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting gallery:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicRecruitments = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.publicRecruitment.findMany({
      where: { is_published: true },
      orderBy: [{ updated_at: 'desc' }],
      include: { committee: { orderBy: [{ sort_order: 'asc' }] } },
    });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching public recruitments:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const listAdminRecruitments = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.publicRecruitment.findMany({
      orderBy: [{ updated_at: 'desc' }],
      include: { committee: { orderBy: [{ sort_order: 'asc' }] } },
    });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching admin recruitments:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAdminRecruitment = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const payload = req.body ?? {};
    const title = String(payload.title ?? '').trim();
    if (!title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    const committee = Array.isArray(payload.committee) ? payload.committee : [];
    const row = await prisma.publicRecruitment.create({
      data: {
        title,
        date_range: String(payload.dateRange ?? '').trim() || null,
        description: String(payload.description ?? '').trim() || null,
        form_url: String(payload.formUrl ?? '').trim() || null,
        is_published: Boolean(payload.isPublished ?? false),
        committee: {
          create: committee
            .map((x: any, idx: number) => ({
              name: String(x?.name ?? '').trim(),
              role: String(x?.role ?? '').trim(),
              sort_order: toInt(x?.sortOrder, idx),
            }))
            .filter((x: any) => Boolean(x.name) && Boolean(x.role)),
        },
      },
      include: { committee: true },
    });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Error creating recruitment:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminRecruitment = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.publicRecruitment.findUnique({ where: { id }, include: { committee: true } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Open recruitment tidak ditemukan' });
      return;
    }
    const payload = req.body ?? {};
    const title = String(payload.title ?? existing.title).trim();
    if (!title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    const committee = Array.isArray(payload.committee) ? payload.committee : null;
    const row = await prisma.publicRecruitment.update({
      where: { id },
      data: {
        title,
        date_range: typeof payload.dateRange === 'string' ? payload.dateRange.trim() || null : existing.date_range,
        description: typeof payload.description === 'string' ? payload.description.trim() || null : existing.description,
        form_url: typeof payload.formUrl === 'string' ? payload.formUrl.trim() || null : existing.form_url,
        is_published: typeof payload.isPublished === 'boolean' ? payload.isPublished : existing.is_published,
        committee: committee
          ? {
              deleteMany: {},
              create: committee
                .map((x: any, idx: number) => ({
                  name: String(x?.name ?? '').trim(),
                  role: String(x?.role ?? '').trim(),
                  sort_order: toInt(x?.sortOrder, idx),
                }))
                .filter((x: any) => Boolean(x.name) && Boolean(x.role)),
            }
          : undefined,
      },
      include: { committee: true },
    });
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('Error updating recruitment:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAdminRecruitment = async (req: PublicRoleRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.publicRecruitment.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Open recruitment berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting recruitment:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const uploadPublicAsset = [
  upload.single('file'),
  async (req: PublicRoleRequest, res: Response): Promise<void> => {
    try {
      if (!process.env.CLOUDINARY_URL) {
        res.status(500).json({ success: false, error: 'Cloudinary belum dikonfigurasi' });
        return;
      }
      if (!req.file || !(req.file as any).buffer) {
        res.status(400).json({ success: false, error: 'File tidak ditemukan' });
        return;
      }
      const b64 = Buffer.from((req.file as any).buffer).toString('base64');
      const dataURI = `data:${(req.file as any).mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, { folder: 'public-site' });
      res.status(200).json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
    } catch (error) {
      console.error('Error uploading public asset:', error);
      res.status(500).json({ success: false, error: 'Gagal mengunggah file' });
    }
  },
];

