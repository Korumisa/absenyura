import { z } from 'zod';

const sanitizedUrl = z.string().trim().nullable().optional();

export const PublicProfileData = z.object({
  orgName: z.string().trim().min(1, 'Nama organisasi wajib diisi'),
  campusName: z.string().trim().min(1, 'Nama kampus wajib diisi'),
  kabinetName: z.string().trim().nullable().optional(),
  kabinetPeriod: z.string().trim().nullable().optional(),
  heroSubtitle: z.string().trim().nullable().optional(),
  homeImageUrl: sanitizedUrl,
  youtubeEmbedUrl: z.string().trim().nullable().optional(),
  aboutTitle: z.string().trim().nullable().optional(),
  aboutContent: z.string().trim().nullable().optional(),
  homeCardLeftTitle: z.string().trim().nullable().optional(),
  homeCardLeftBody: z.string().trim().nullable().optional(),
  homeCardRightTitle: z.string().trim().nullable().optional(),
  homeCardRightBody: z.string().trim().nullable().optional(),
  vision: z.string().trim().nullable().optional(),
  mission: z.string().trim().nullable().optional(),
  visiPhotoUrl: sanitizedUrl,
  visiName: z.string().trim().nullable().optional(),
  visiRole: z.string().trim().nullable().optional(),
  misiPhotoUrl: sanitizedUrl,
  misiName: z.string().trim().nullable().optional(),
  misiRole: z.string().trim().nullable().optional(),
  footerTagline: z.string().trim().nullable().optional(),
  instagramUrl: sanitizedUrl,
  tiktokUrl: sanitizedUrl,
  youtubeUrl: sanitizedUrl,
  address: z.string().trim().nullable().optional(),
  email: z.string().trim().email('Format email tidak valid').nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  logoLightUrl: sanitizedUrl,
  logoDarkUrl: sanitizedUrl,
  primaryColor: z.string().trim().nullable().optional(),
});

export const UpsertPublicProfileBody = z.object({
  data: PublicProfileData,
});

const StructureMember = z.object({
  name: z.string().trim().min(1, 'Nama anggota wajib diisi'),
  role: z.string().trim().min(1, 'Peran anggota wajib diisi'),
  photoUrl: sanitizedUrl,
  isSpotlight: z.boolean().optional(),
  is_spotlight: z.boolean().optional(),
  sortOrder: z.union([z.string(), z.number()]).optional(),
});

const StructureGroup = z.object({
  title: z.string().trim().min(1, 'Judul kelompok wajib diisi'),
  isCore: z.boolean().optional(),
  is_core: z.boolean().optional(),
  sortOrder: z.union([z.string(), z.number()]).optional(),
  people: z.array(StructureMember).default([]),
});

export const ReplaceAdminStructureBody = z.object({
  cabinetName: z.string().trim().min(1, 'Nama kabinet wajib diisi'),
  cabinetPeriod: z.string().trim().min(1, 'Periode kabinet wajib diisi'),
  data: z.array(StructureGroup),
});

export const CreateProgramBody = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi'),
  dateRange: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  isPublished: z.boolean().default(false),
});

export const UpdateProgramBody = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').optional(),
  dateRange: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  isPublished: z.boolean().optional(),
});

export const CreateCategoryBody = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi'),
  slug: z.string().trim().optional(),
});

export const UpdateCategoryBody = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi').optional(),
  slug: z.string().trim().optional(),
});

export const CreatePostBody = z.object({
  type: z.enum(['BERITA', 'KEGIATAN', 'LOMBA', 'PENGUMUMAN']).default('BERITA'),
  title: z.string().trim().min(1, 'Judul wajib diisi'),
  slug: z.string().trim().optional(),
  dateLabel: z.string().trim().nullable().optional(),
  status: z.string().trim().nullable().optional(),
  formUrl: z.string().trim().nullable().optional(),
  excerpt: z.string().trim().nullable().optional(),
  content: z.string().trim().nullable().optional(),
  coverImageUrl: sanitizedUrl,
  categoryId: z.string().trim().uuid('Format category_id tidak valid').nullable().optional(),
  isPublished: z.boolean().default(false),
});

export const UpdatePostBody = z.object({
  type: z.enum(['BERITA', 'KEGIATAN', 'LOMBA', 'PENGUMUMAN']).optional(),
  title: z.string().trim().min(1, 'Judul wajib diisi').optional(),
  slug: z.string().trim().optional(),
  dateLabel: z.string().trim().nullable().optional(),
  status: z.string().trim().nullable().optional(),
  formUrl: z.string().trim().nullable().optional(),
  excerpt: z.string().trim().nullable().optional(),
  content: z.string().trim().nullable().optional(),
  coverImageUrl: sanitizedUrl,
  categoryId: z.string().trim().uuid('Format category_id tidak valid').nullable().optional(),
  isPublished: z.boolean().optional(),
});

const GalleryItem = z.object({
  imageUrl: sanitizedUrl,
  caption: z.string().trim().nullable().optional(),
  sortOrder: z.union([z.string(), z.number()]).optional(),
});

export const CreateGalleryBody = z.object({
  title: z.string().trim().min(1, 'Judul album wajib diisi'),
  description: z.string().trim().nullable().optional(),
  isPublished: z.boolean().default(false),
  items: z.array(GalleryItem).default([]),
});

export const UpdateGalleryBody = z.object({
  title: z.string().trim().min(1, 'Judul album wajib diisi').optional(),
  description: z.string().trim().nullable().optional(),
  isPublished: z.boolean().optional(),
  items: z.array(GalleryItem).optional(),
});

const RecruitmentMember = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  role: z.string().trim().min(1, 'Peran wajib diisi'),
  sortOrder: z.union([z.string(), z.number()]).optional(),
});

const RecruitmentContact = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  contact: z.string().trim().min(1, 'Kontak wajib diisi'),
  sortOrder: z.union([z.string(), z.number()]).optional(),
});

export const CreateRecruitmentBody = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi'),
  dateRange: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  formUrl: sanitizedUrl,
  posterImageUrl: sanitizedUrl,
  isPublished: z.boolean().default(false),
  committee: z.array(RecruitmentMember).default([]),
  contacts: z.array(RecruitmentContact).default([]),
});

export const UpdateRecruitmentBody = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').optional(),
  dateRange: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  formUrl: sanitizedUrl,
  posterImageUrl: sanitizedUrl,
  isPublished: z.boolean().optional(),
  committee: z.array(RecruitmentMember).optional(),
  contacts: z.array(RecruitmentContact).optional(),
});

export type UpsertPublicProfileBodyType = z.infer<typeof UpsertPublicProfileBody>;
export type ReplaceAdminStructureBodyType = z.infer<typeof ReplaceAdminStructureBody>;
export type CreateProgramBodyType = z.infer<typeof CreateProgramBody>;
export type UpdateProgramBodyType = z.infer<typeof UpdateProgramBody>;
export type CreateCategoryBodyType = z.infer<typeof CreateCategoryBody>;
export type UpdateCategoryBodyType = z.infer<typeof UpdateCategoryBody>;
export type CreatePostBodyType = z.infer<typeof CreatePostBody>;
export type UpdatePostBodyType = z.infer<typeof UpdatePostBody>;
export type CreateGalleryBodyType = z.infer<typeof CreateGalleryBody>;
export type UpdateGalleryBodyType = z.infer<typeof UpdateGalleryBody>;
export type CreateRecruitmentBodyType = z.infer<typeof CreateRecruitmentBody>;
export type UpdateRecruitmentBodyType = z.infer<typeof UpdateRecruitmentBody>;
