import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { randomUUID } from 'crypto';

const PROFILE_KEY = 'PUBLIC_SITE_PROFILE';
const PROGRAMS_KEY = 'PUBLIC_SITE_PROGRAMS';
const EVENTS_KEY = 'PUBLIC_SITE_EVENTS';
const GALLERIES_KEY = 'PUBLIC_SITE_GALLERIES';
const RECRUITMENTS_KEY = 'PUBLIC_SITE_RECRUITMENTS';
const STRUCTURE_KEY = 'PUBLIC_SITE_STRUCTURE';

type PublicProfile = {
  orgName: string;
  campusName: string;
  heroKicker: string;
  heroTitleTop: string;
  heroTitleBottom: string;
  heroSubtitle: string;
  youtubeEmbedUrl?: string;
  aboutTitle: string;
  aboutParagraphs: string[];
  address: string;
  email: string;
  phone: string;
  social: { label: string; url: string }[];
};

type PublicProgram = {
  id: string;
  title: string;
  dateRange: string;
  description: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

type PublicEvent = {
  id: string;
  title: string;
  type: 'KEGIATAN' | 'BERITA' | 'LOMBA' | 'PENGUMUMAN';
  dateLabel: string;
  status?: 'Buka' | 'Tutup';
  excerpt: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

type PublicGalleryAlbum = {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  items: { id: string; imageUrl: string; caption: string }[];
  createdAt: string;
  updatedAt: string;
};

type PublicRecruitment = {
  id: string;
  title: string;
  dateRange: string;
  description: string;
  formUrl: string;
  isPublished: boolean;
  committee: { id: string; name: string; role: string }[];
  createdAt: string;
  updatedAt: string;
};

type PublicStructureGroup = {
  title: string;
  people: { name: string; role: string }[];
};

const DEFAULT_PROFILE: PublicProfile = {
  orgName: 'Himpunan Mahasiswa SDP',
  campusName: 'Undiksha Kampus Denpasar',
  heroKicker: 'Kabinet',
  heroTitleTop: 'Kabinet',
  heroTitleBottom: 'Elaborasi',
  heroSubtitle: 'Wadah kolaborasi lintas prodi di SDP Undiksha Kampus Denpasar.',
  youtubeEmbedUrl: '',
  aboutTitle: 'Tentang Himpunan',
  aboutParagraphs: [
    'Himpunan Mahasiswa SDP Undiksha Kampus Denpasar merupakan organisasi kemahasiswaan yang menghimpun mahasiswa lintas program studi untuk berkolaborasi, berkegiatan, dan berprestasi.',
    'Fokus kegiatan mencakup pengembangan penalaran, minat-bakat, pengabdian masyarakat, serta kesejahteraan mahasiswa melalui program kerja yang berkelanjutan dan inklusif.',
  ],
  address: 'Denpasar, Bali',
  email: 'hm.sdp@undiksha.ac.id',
  phone: '+62-8xx-xxxx-xxxx',
  social: [
    { label: 'Instagram', url: 'https://instagram.com/' },
    { label: 'YouTube', url: 'https://www.youtube.com/' },
  ],
};

const DEFAULT_PROGRAMS: PublicProgram[] = [
  {
    id: 'seed-program-agem-akaswa',
    title: 'AGEM AKASWA',
    dateRange: 'Mei 2025',
    description: 'Aktivitas gemilang akademik mahasiswa sebagai ruang pengembangan potensi dan kreativitas mahasiswa.',
    isPublished: true,
    createdAt: '2025-05-05T00:00:00.000Z',
    updatedAt: '2025-05-05T00:00:00.000Z',
  },
];
const DEFAULT_EVENTS: PublicEvent[] = [
  {
    id: 'seed-berita-rektor-lantik',
    title: 'Rektor Undiksha Lantik Pengurus Himpunan Mahasiswa di Denpasar',
    type: 'BERITA',
    dateLabel: '16 April 2025',
    excerpt: 'Pengukuhan pengurus menjadi penguatan wadah kolaborasi lintas prodi dan dorongan prestasi mahasiswa di Kampus Denpasar.',
    content: 'Himpunan mahasiswa di lingkungan SDP Kampus Denpasar dibentuk untuk mendorong kolaborasi, kegiatan kemahasiswaan yang berkelanjutan, serta prestasi lintas bidang.',
    isPublished: true,
    createdAt: '2025-04-16T00:00:00.000Z',
    updatedAt: '2025-04-16T00:00:00.000Z',
  },
  {
    id: 'seed-kegiatan-piodalan',
    title: 'Kegiatan Menyambut Piodalan: Penjor, Ngelawar, dan Gebogan',
    type: 'KEGIATAN',
    dateLabel: '3 Oktober 2025',
    excerpt: 'Rangkaian kegiatan bernuansa budaya dan kebersamaan untuk menyambut piodalan di lingkungan kampus.',
    content: 'Kegiatan internal yang menekankan gotong royong dan pelestarian budaya, sekaligus mempererat kebersamaan mahasiswa.',
    isPublished: true,
    createdAt: '2025-10-07T00:00:00.000Z',
    updatedAt: '2025-10-07T00:00:00.000Z',
  },
];
const DEFAULT_GALLERIES: PublicGalleryAlbum[] = [];
const DEFAULT_RECRUITMENTS: PublicRecruitment[] = [];
const DEFAULT_STRUCTURE: PublicStructureGroup[] = [
  { title: 'INTI', people: [] },
  { title: 'BIDANG', people: [] },
  { title: 'DIVISI', people: [] },
];

async function getSettingJson<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row?.value) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

async function setSettingJson(key: string, value: unknown, updatedBy?: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value), updated_by: updatedBy },
    create: { key, value: JSON.stringify(value), updated_by: updatedBy },
  });
}

function nowIso() {
  return new Date().toISOString();
}

export const getPublicProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await getSettingJson<PublicProfile>(PROFILE_KEY, DEFAULT_PROFILE);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const all = await getSettingJson<PublicProgram[]>(PROGRAMS_KEY, DEFAULT_PROGRAMS);
    const published = all.filter((p) => p.isPublished);
    res.status(200).json({ success: true, data: published });
  } catch (error) {
    console.error('Error fetching public programs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const all = await getSettingJson<PublicEvent[]>(EVENTS_KEY, DEFAULT_EVENTS);
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const published = all.filter((e) => e.isPublished);
    const filtered = type ? published.filter((e) => e.type === type) : published;
    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error fetching public events:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicGalleries = async (req: Request, res: Response): Promise<void> => {
  try {
    const all = await getSettingJson<PublicGalleryAlbum[]>(GALLERIES_KEY, DEFAULT_GALLERIES);
    const published = all.filter((a) => a.isPublished);
    res.status(200).json({ success: true, data: published });
  } catch (error) {
    console.error('Error fetching public galleries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicRecruitments = async (req: Request, res: Response): Promise<void> => {
  try {
    const all = await getSettingJson<PublicRecruitment[]>(RECRUITMENTS_KEY, DEFAULT_RECRUITMENTS);
    const published = all.filter((r) => r.isPublished);
    res.status(200).json({ success: true, data: published });
  } catch (error) {
    console.error('Error fetching public recruitments:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPublicStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await getSettingJson<PublicStructureGroup[]>(STRUCTURE_KEY, DEFAULT_STRUCTURE);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching public structure:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getAdminProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await getSettingJson<PublicProfile>(PROFILE_KEY, DEFAULT_PROFILE);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const data = req.body?.data;
    if (!data || typeof data !== 'object') {
      res.status(400).json({ success: false, error: 'Data tidak valid' });
      return;
    }
    await setSettingJson(PROFILE_KEY, data, user?.id);
    res.status(200).json({ success: true, message: 'Profil publik berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getAdminStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await getSettingJson<PublicStructureGroup[]>(STRUCTURE_KEY, DEFAULT_STRUCTURE);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching admin structure:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const data = req.body?.data;
    if (!Array.isArray(data)) {
      res.status(400).json({ success: false, error: 'Data tidak valid' });
      return;
    }
    await setSettingJson(STRUCTURE_KEY, data, user?.id);
    res.status(200).json({ success: true, message: 'Struktur organisasi berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating admin structure:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getAdminPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const all = await getSettingJson<PublicProgram[]>(PROGRAMS_KEY, DEFAULT_PROGRAMS);
    res.status(200).json({ success: true, data: all });
  } catch (error) {
    console.error('Error fetching admin programs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAdminProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const payload = req.body;
    const all = await getSettingJson<PublicProgram[]>(PROGRAMS_KEY, DEFAULT_PROGRAMS);
    const createdAt = nowIso();
    const item: PublicProgram = {
      id: randomUUID(),
      title: String(payload?.title ?? '').trim(),
      dateRange: String(payload?.dateRange ?? '').trim(),
      description: String(payload?.description ?? '').trim(),
      isPublished: Boolean(payload?.isPublished ?? false),
      createdAt,
      updatedAt: createdAt,
    };
    if (!item.title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    await setSettingJson(PROGRAMS_KEY, [item, ...all], user?.id);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating admin program:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const payload = req.body;
    const all = await getSettingJson<PublicProgram[]>(PROGRAMS_KEY, DEFAULT_PROGRAMS);
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) {
      res.status(404).json({ success: false, error: 'Program kerja tidak ditemukan' });
      return;
    }
    const updated: PublicProgram = {
      ...all[idx],
      title: String(payload?.title ?? all[idx].title).trim(),
      dateRange: String(payload?.dateRange ?? all[idx].dateRange).trim(),
      description: String(payload?.description ?? all[idx].description).trim(),
      isPublished: typeof payload?.isPublished === 'boolean' ? payload.isPublished : all[idx].isPublished,
      updatedAt: nowIso(),
    };
    if (!updated.title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    const next = [...all];
    next[idx] = updated;
    await setSettingJson(PROGRAMS_KEY, next, user?.id);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating admin program:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAdminProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const all = await getSettingJson<PublicProgram[]>(PROGRAMS_KEY, DEFAULT_PROGRAMS);
    const next = all.filter((p) => p.id !== id);
    await setSettingJson(PROGRAMS_KEY, next, user?.id);
    res.status(200).json({ success: true, message: 'Program kerja berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting admin program:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getAdminEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const all = await getSettingJson<PublicEvent[]>(EVENTS_KEY, DEFAULT_EVENTS);
    res.status(200).json({ success: true, data: all });
  } catch (error) {
    console.error('Error fetching admin events:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAdminEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const payload = req.body;
    const all = await getSettingJson<PublicEvent[]>(EVENTS_KEY, DEFAULT_EVENTS);
    const createdAt = nowIso();
    const item: PublicEvent = {
      id: randomUUID(),
      title: String(payload?.title ?? '').trim(),
      type: (payload?.type as any) ?? 'KEGIATAN',
      dateLabel: String(payload?.dateLabel ?? '').trim(),
      status: payload?.status === 'Buka' || payload?.status === 'Tutup' ? payload.status : undefined,
      excerpt: String(payload?.excerpt ?? '').trim(),
      content: String(payload?.content ?? '').trim(),
      isPublished: Boolean(payload?.isPublished ?? false),
      createdAt,
      updatedAt: createdAt,
    };
    if (!item.title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    await setSettingJson(EVENTS_KEY, [item, ...all], user?.id);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating admin event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const payload = req.body;
    const all = await getSettingJson<PublicEvent[]>(EVENTS_KEY, DEFAULT_EVENTS);
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) {
      res.status(404).json({ success: false, error: 'Konten tidak ditemukan' });
      return;
    }
    const updated: PublicEvent = {
      ...all[idx],
      title: String(payload?.title ?? all[idx].title).trim(),
      type: (payload?.type as any) ?? all[idx].type,
      dateLabel: String(payload?.dateLabel ?? all[idx].dateLabel).trim(),
      status: payload?.status === 'Buka' || payload?.status === 'Tutup' ? payload.status : all[idx].status,
      excerpt: String(payload?.excerpt ?? all[idx].excerpt).trim(),
      content: String(payload?.content ?? all[idx].content).trim(),
      isPublished: typeof payload?.isPublished === 'boolean' ? payload.isPublished : all[idx].isPublished,
      updatedAt: nowIso(),
    };
    if (!updated.title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    const next = [...all];
    next[idx] = updated;
    await setSettingJson(EVENTS_KEY, next, user?.id);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating admin event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAdminEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const all = await getSettingJson<PublicEvent[]>(EVENTS_KEY, DEFAULT_EVENTS);
    const next = all.filter((p) => p.id !== id);
    await setSettingJson(EVENTS_KEY, next, user?.id);
    res.status(200).json({ success: true, message: 'Konten berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting admin event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getAdminGalleries = async (req: Request, res: Response): Promise<void> => {
  try {
    const all = await getSettingJson<PublicGalleryAlbum[]>(GALLERIES_KEY, DEFAULT_GALLERIES);
    res.status(200).json({ success: true, data: all });
  } catch (error) {
    console.error('Error fetching admin galleries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAdminGallery = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const payload = req.body;
    const all = await getSettingJson<PublicGalleryAlbum[]>(GALLERIES_KEY, DEFAULT_GALLERIES);
    const createdAt = nowIso();
    const item: PublicGalleryAlbum = {
      id: randomUUID(),
      title: String(payload?.title ?? '').trim(),
      description: String(payload?.description ?? '').trim(),
      isPublished: Boolean(payload?.isPublished ?? false),
      items: Array.isArray(payload?.items)
        ? payload.items.map((x: any) => ({
            id: String(x?.id ?? randomUUID()),
            imageUrl: String(x?.imageUrl ?? '').trim(),
            caption: String(x?.caption ?? '').trim(),
          }))
        : [],
      createdAt,
      updatedAt: createdAt,
    };
    if (!item.title) {
      res.status(400).json({ success: false, error: 'Judul album wajib diisi' });
      return;
    }
    await setSettingJson(GALLERIES_KEY, [item, ...all], user?.id);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating admin gallery:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminGallery = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const payload = req.body;
    const all = await getSettingJson<PublicGalleryAlbum[]>(GALLERIES_KEY, DEFAULT_GALLERIES);
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) {
      res.status(404).json({ success: false, error: 'Album tidak ditemukan' });
      return;
    }
    const items = Array.isArray(payload?.items)
      ? payload.items.map((x: any) => ({
          id: String(x?.id ?? randomUUID()),
          imageUrl: String(x?.imageUrl ?? '').trim(),
          caption: String(x?.caption ?? '').trim(),
        }))
      : all[idx].items;
    const updated: PublicGalleryAlbum = {
      ...all[idx],
      title: String(payload?.title ?? all[idx].title).trim(),
      description: String(payload?.description ?? all[idx].description).trim(),
      isPublished: typeof payload?.isPublished === 'boolean' ? payload.isPublished : all[idx].isPublished,
      items,
      updatedAt: nowIso(),
    };
    if (!updated.title) {
      res.status(400).json({ success: false, error: 'Judul album wajib diisi' });
      return;
    }
    const next = [...all];
    next[idx] = updated;
    await setSettingJson(GALLERIES_KEY, next, user?.id);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating admin gallery:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAdminGallery = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const all = await getSettingJson<PublicGalleryAlbum[]>(GALLERIES_KEY, DEFAULT_GALLERIES);
    const next = all.filter((p) => p.id !== id);
    await setSettingJson(GALLERIES_KEY, next, user?.id);
    res.status(200).json({ success: true, message: 'Album berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting admin gallery:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getAdminRecruitments = async (req: Request, res: Response): Promise<void> => {
  try {
    const all = await getSettingJson<PublicRecruitment[]>(RECRUITMENTS_KEY, DEFAULT_RECRUITMENTS);
    res.status(200).json({ success: true, data: all });
  } catch (error) {
    console.error('Error fetching admin recruitments:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAdminRecruitment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const payload = req.body;
    const all = await getSettingJson<PublicRecruitment[]>(RECRUITMENTS_KEY, DEFAULT_RECRUITMENTS);
    const createdAt = nowIso();
    const item: PublicRecruitment = {
      id: randomUUID(),
      title: String(payload?.title ?? '').trim(),
      dateRange: String(payload?.dateRange ?? '').trim(),
      description: String(payload?.description ?? '').trim(),
      formUrl: String(payload?.formUrl ?? '').trim(),
      isPublished: Boolean(payload?.isPublished ?? false),
      committee: Array.isArray(payload?.committee)
        ? payload.committee.map((x: any) => ({
            id: String(x?.id ?? randomUUID()),
            name: String(x?.name ?? '').trim(),
            role: String(x?.role ?? '').trim(),
          }))
        : [],
      createdAt,
      updatedAt: createdAt,
    };
    if (!item.title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    await setSettingJson(RECRUITMENTS_KEY, [item, ...all], user?.id);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating admin recruitment:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAdminRecruitment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const payload = req.body;
    const all = await getSettingJson<PublicRecruitment[]>(RECRUITMENTS_KEY, DEFAULT_RECRUITMENTS);
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) {
      res.status(404).json({ success: false, error: 'Open recruitment tidak ditemukan' });
      return;
    }
    const committee = Array.isArray(payload?.committee)
      ? payload.committee.map((x: any) => ({
          id: String(x?.id ?? randomUUID()),
          name: String(x?.name ?? '').trim(),
          role: String(x?.role ?? '').trim(),
        }))
      : all[idx].committee;
    const updated: PublicRecruitment = {
      ...all[idx],
      title: String(payload?.title ?? all[idx].title).trim(),
      dateRange: String(payload?.dateRange ?? all[idx].dateRange).trim(),
      description: String(payload?.description ?? all[idx].description).trim(),
      formUrl: String(payload?.formUrl ?? all[idx].formUrl).trim(),
      isPublished: typeof payload?.isPublished === 'boolean' ? payload.isPublished : all[idx].isPublished,
      committee,
      updatedAt: nowIso(),
    };
    if (!updated.title) {
      res.status(400).json({ success: false, error: 'Judul wajib diisi' });
      return;
    }
    const next = [...all];
    next[idx] = updated;
    await setSettingJson(RECRUITMENTS_KEY, next, user?.id);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating admin recruitment:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAdminRecruitment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const all = await getSettingJson<PublicRecruitment[]>(RECRUITMENTS_KEY, DEFAULT_RECRUITMENTS);
    const next = all.filter((p) => p.id !== id);
    await setSettingJson(RECRUITMENTS_KEY, next, user?.id);
    res.status(200).json({ success: true, message: 'Open recruitment berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting admin recruitment:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

