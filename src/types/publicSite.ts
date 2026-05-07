export type PublicProfile = {
  id: string;
  org_name: string;
  campus_name: string;
  kabinet_name: string | null;
  kabinet_period: string | null;
  hero_subtitle: string | null;
  youtube_embed_url: string | null;
  about_title: string | null;
  about_content: string | null;
  footer_tagline: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  primary_color: string | null;
};

export type PublicProgram = {
  id: string;
  title: string;
  date_range: string | null;
  description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicPostType = 'BERITA' | 'KEGIATAN' | 'LOMBA' | 'PENGUMUMAN';

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type PublicPost = {
  id: string;
  type: PublicPostType;
  title: string;
  slug: string;
  date_label: string | null;
  status: string | null;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  category: PublicCategory | null;
  category_id: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicGalleryAlbum = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  items: { id: string; image_url: string; caption: string | null; sort_order?: number }[];
  created_at: string;
  updated_at: string;
};

export type PublicRecruitment = {
  id: string;
  title: string;
  date_range: string | null;
  description: string | null;
  form_url: string | null;
  is_published: boolean;
  committee: { id: string; name: string; role: string; sort_order?: number }[];
  created_at: string;
  updated_at: string;
};

export type PublicStructureGroup = {
  id: string;
  title: string;
  sort_order: number;
  members: { id: string; name: string; role: string; sort_order: number }[];
};

