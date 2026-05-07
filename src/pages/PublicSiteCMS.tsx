import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { PublicCategory, PublicGalleryAlbum, PublicPost, PublicProfile, PublicProgram, PublicRecruitment, PublicStructureGroup } from '@/types/publicSite';

type SectionKey = 'profile' | 'structure' | 'programs' | 'posts' | 'galleries' | 'recruitments';
type PageKey = 'home' | SectionKey;

const PAGES: Array<{ key: PageKey; label: string }> = [
  { key: 'home', label: 'Halaman Utama' },
  { key: 'profile', label: 'Profil' },
  { key: 'structure', label: 'Struktur' },
  { key: 'programs', label: 'Program Kerja' },
  { key: 'posts', label: 'Berita & Info' },
  { key: 'galleries', label: 'Galeri' },
  { key: 'recruitments', label: 'Open Recruitment' },
];

const fetcher = (url: string) => api.get(url).then((r) => r.data.data);

export default function PublicSiteCMS(props: { initial: PageKey; showSwitcher?: boolean }) {
  const { initial, showSwitcher = false } = props;
  const navigate = useNavigate();
  const [active, setActive] = useState<PageKey>(initial);
  useEffect(() => setActive(initial), [initial]);

  const { data: profile, mutate: mutateProfile } = useSWR<PublicProfile | null>('/public-site/admin/profile', fetcher, { revalidateOnFocus: false });
  const { data: structure, mutate: mutateStructure } = useSWR<PublicStructureGroup[]>('/public-site/admin/structure', fetcher, { revalidateOnFocus: false });
  const { data: programs = [], mutate: mutatePrograms } = useSWR<PublicProgram[]>('/public-site/admin/programs', fetcher, { revalidateOnFocus: false });
  const { data: categories = [], mutate: mutateCategories } = useSWR<PublicCategory[]>('/public-site/admin/categories', fetcher, { revalidateOnFocus: false });
  const { data: posts = [], mutate: mutatePosts } = useSWR<PublicPost[]>('/public-site/admin/posts', fetcher, { revalidateOnFocus: false });
  const { data: galleries = [], mutate: mutateGalleries } = useSWR<PublicGalleryAlbum[]>('/public-site/admin/galleries', fetcher, { revalidateOnFocus: false });
  const { data: recruitments = [], mutate: mutateRecruitments } = useSWR<PublicRecruitment[]>('/public-site/admin/recruitments', fetcher, { revalidateOnFocus: false });

  type ProfileDraft = {
    orgName: string;
    campusName: string;
    kabinetName: string;
    kabinetPeriod: string;
    heroSubtitle: string;
    youtubeEmbedUrl: string;
    aboutTitle: string;
    aboutContent: string;
    footerTagline: string;
    instagramUrl: string;
    tiktokUrl: string;
    youtubeUrl: string;
    address: string;
    email: string;
    phone: string;
    logoLightUrl: string;
    logoDarkUrl: string;
    primaryColor: string;
  };

  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    orgName: '',
    campusName: '',
    kabinetName: '',
    kabinetPeriod: '',
    heroSubtitle: '',
    youtubeEmbedUrl: '',
    aboutTitle: '',
    aboutContent: '',
    footerTagline: '',
    instagramUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    address: '',
    email: '',
    phone: '',
    logoLightUrl: '/3.%20HM%20SDP.png',
    logoDarkUrl: '/3.%20HM%20SDP.png',
    primaryColor: '#2563eb',
  });
  useEffect(() => {
    if (!profile) return;
    setProfileDraft({
      orgName: profile.org_name ?? '',
      campusName: profile.campus_name ?? '',
      kabinetName: profile.kabinet_name ?? '',
      kabinetPeriod: profile.kabinet_period ?? '',
      heroSubtitle: profile.hero_subtitle ?? '',
      youtubeEmbedUrl: profile.youtube_embed_url ?? '',
      aboutTitle: profile.about_title ?? '',
      aboutContent: profile.about_content ?? '',
      footerTagline: profile.footer_tagline ?? '',
      instagramUrl: profile.instagram_url ?? '',
      tiktokUrl: profile.tiktok_url ?? '',
      youtubeUrl: profile.youtube_url ?? '',
      address: profile.address ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      logoLightUrl: profile.logo_light_url ?? '/3.%20HM%20SDP.png',
      logoDarkUrl: profile.logo_dark_url ?? '/3.%20HM%20SDP.png',
      primaryColor: profile.primary_color ?? '#2563eb',
    });
  }, [profile]);

  const [structureJson, setStructureJson] = useState('');
  useEffect(() => {
    if (!structure) return;
    const mapped = structure.map((g) => ({
      title: g.title,
      sortOrder: g.sort_order,
      people: (g.members ?? []).map((m) => ({
        name: m.name,
        role: m.role,
        sortOrder: m.sort_order,
      })),
    }));
    setStructureJson(JSON.stringify(mapped, null, 2));
  }, [structure]);

  const [programForm, setProgramForm] = useState<{ id?: string; title?: string; dateRange?: string; description?: string; isPublished?: boolean }>({});
  const [categoryForm, setCategoryForm] = useState<{ id?: string; name?: string; slug?: string }>({});
  const [postType, setPostType] = useState<PublicPost['type']>('BERITA');
  const [postForm, setPostForm] = useState<{
    id?: string;
    type?: PublicPost['type'];
    title?: string;
    slug?: string;
    dateLabel?: string;
    status?: string;
    excerpt?: string;
    content?: string;
    coverImageUrl?: string;
    categoryId?: string;
    isPublished?: boolean;
  }>({ type: 'BERITA' });
  const [galleryForm, setGalleryForm] = useState<{ id?: string; title?: string; description?: string; isPublished?: boolean; itemsJson?: string }>({});
  const [recruitmentForm, setRecruitmentForm] = useState<{ id?: string; title?: string; dateRange?: string; description?: string; formUrl?: string; isPublished?: boolean; committeeJson?: string }>({});

  type DeleteKind = 'programs' | 'categories' | 'posts' | 'galleries' | 'recruitments';
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: DeleteKind; id: string } | null>(null);

  const openDelete = (kind: DeleteKind, id: string) => {
    setDeleteTarget({ kind, id });
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { kind, id } = deleteTarget;
      if (kind === 'programs') await api.delete(`/public-site/admin/programs/${id}`);
      if (kind === 'categories') await api.delete(`/public-site/admin/categories/${id}`);
      if (kind === 'posts') await api.delete(`/public-site/admin/posts/${id}`);
      if (kind === 'galleries') await api.delete(`/public-site/admin/galleries/${id}`);
      if (kind === 'recruitments') await api.delete(`/public-site/admin/recruitments/${id}`);
      toast.success('Berhasil dihapus');
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      if (kind === 'programs') mutatePrograms();
      if (kind === 'categories') mutateCategories();
      if (kind === 'posts') mutatePosts();
      if (kind === 'galleries') mutateGalleries();
      if (kind === 'recruitments') mutateRecruitments();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Gagal menghapus');
    }
  };

  const deleteDescription = useMemo(() => {
    if (!deleteTarget) return '';
    const name = {
      programs: 'program kerja',
      categories: 'kategori',
      posts: 'konten',
      galleries: 'album galeri',
      recruitments: 'open recruitment',
    }[deleteTarget.kind];
    return `Yakin ingin menghapus ${name} ini?`;
  }, [deleteTarget]);

  const saveProfile = async () => {
    try {
      await api.put('/public-site/admin/profile', { data: profileDraft });
      toast.success('Profil publik tersimpan');
      mutateProfile();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Gagal menyimpan');
    }
  };

  const saveStructure = async () => {
    try {
      const parsed = JSON.parse(structureJson);
      if (!Array.isArray(parsed)) {
        toast.error('Struktur harus berupa JSON array');
        return;
      }
      await api.put('/public-site/admin/structure', { data: parsed });
      toast.success('Struktur organisasi tersimpan');
      mutateStructure();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'JSON struktur tidak valid');
    }
  };

  const resetProgramForm = () => setProgramForm({});
  const resetCategoryForm = () => setCategoryForm({});
  const resetPostForm = () => setPostForm({ type: postType });
  const resetGalleryForm = () => setGalleryForm({});
  const resetRecruitmentForm = () => setRecruitmentForm({});

  const uploadImage = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/public-site/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data.url as string;
  };

  const [profileUploading, setProfileUploading] = useState<{ light: boolean; dark: boolean }>({ light: false, dark: false });
  const [galleryUploading, setGalleryUploading] = useState(false);

  const appendGalleryItemsFromFiles = async (files: FileList) => {
    const list = Array.from(files);
    if (!list.length) return;
    setGalleryUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of list) {
        uploaded.push(await uploadImage(f));
      }

      let current: any[] = [];
      try {
        const parsed = galleryForm.itemsJson ? JSON.parse(galleryForm.itemsJson) : [];
        current = Array.isArray(parsed) ? parsed : [];
      } catch {
        current = [];
      }

      const base = current.length;
      const next = [
        ...current,
        ...uploaded.map((url, idx) => ({
          imageUrl: url,
          caption: '',
          sortOrder: base + idx,
        })),
      ];
      setGalleryForm((p) => ({ ...p, itemsJson: JSON.stringify(next, null, 2) }));
      toast.success('Foto berhasil ditambahkan ke items');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Gagal upload foto');
    } finally {
      setGalleryUploading(false);
    }
  };

  const upsertProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (programForm.id) {
        await api.put(`/public-site/admin/programs/${programForm.id}`, {
          title: programForm.title,
          dateRange: programForm.dateRange,
          description: programForm.description,
          isPublished: programForm.isPublished ?? false,
        });
        toast.success('Program kerja diperbarui');
      } else {
        await api.post('/public-site/admin/programs', {
          title: programForm.title,
          dateRange: programForm.dateRange,
          description: programForm.description,
          isPublished: programForm.isPublished ?? false,
        });
        toast.success('Program kerja ditambahkan');
      }
      resetProgramForm();
      mutatePrograms();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Gagal menyimpan');
    }
  };

  const upsertCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (categoryForm.id) {
        await api.put(`/public-site/admin/categories/${categoryForm.id}`, {
          name: categoryForm.name,
          slug: categoryForm.slug,
        });
        toast.success('Kategori diperbarui');
      } else {
        await api.post('/public-site/admin/categories', {
          name: categoryForm.name,
          slug: categoryForm.slug,
        });
        toast.success('Kategori ditambahkan');
      }
      resetCategoryForm();
      mutateCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Gagal menyimpan kategori');
    }
  };

  const upsertPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        type: postForm.type ?? postType,
        title: postForm.title,
        slug: postForm.slug,
        dateLabel: postForm.dateLabel,
        status: postForm.status,
        excerpt: postForm.excerpt,
        content: postForm.content,
        coverImageUrl: postForm.coverImageUrl,
        categoryId: postForm.categoryId,
        isPublished: postForm.isPublished ?? false,
      };
      if (postForm.id) {
        await api.put(`/public-site/admin/posts/${postForm.id}`, payload);
        toast.success('Konten diperbarui');
      } else {
        await api.post('/public-site/admin/posts', payload);
        toast.success('Konten ditambahkan');
      }
      resetPostForm();
      mutatePosts();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Gagal menyimpan konten');
    }
  };

  const upsertGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const items = galleryForm.itemsJson ? JSON.parse(galleryForm.itemsJson) : undefined;
      if (galleryForm.id) {
        await api.put(`/public-site/admin/galleries/${galleryForm.id}`, {
          title: galleryForm.title,
          description: galleryForm.description,
          isPublished: galleryForm.isPublished ?? false,
          items,
        });
        toast.success('Album diperbarui');
      } else {
        await api.post('/public-site/admin/galleries', {
          title: galleryForm.title,
          description: galleryForm.description,
          isPublished: galleryForm.isPublished ?? false,
          items,
        });
        toast.success('Album ditambahkan');
      }
      resetGalleryForm();
      mutateGalleries();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'JSON item galeri tidak valid');
    }
  };

  const upsertRecruitment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const committee = recruitmentForm.committeeJson ? JSON.parse(recruitmentForm.committeeJson) : undefined;
      if (recruitmentForm.id) {
        await api.put(`/public-site/admin/recruitments/${recruitmentForm.id}`, {
          title: recruitmentForm.title,
          dateRange: recruitmentForm.dateRange,
          description: recruitmentForm.description,
          formUrl: recruitmentForm.formUrl,
          isPublished: recruitmentForm.isPublished ?? false,
          committee,
        });
        toast.success('Open recruitment diperbarui');
      } else {
        await api.post('/public-site/admin/recruitments', {
          title: recruitmentForm.title,
          dateRange: recruitmentForm.dateRange,
          description: recruitmentForm.description,
          formUrl: recruitmentForm.formUrl,
          isPublished: recruitmentForm.isPublished ?? false,
          committee,
        });
        toast.success('Open recruitment ditambahkan');
      }
      resetRecruitmentForm();
      mutateRecruitments();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'JSON panitia tidak valid');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Konten Website</h1>
          <p className="text-slate-500 dark:text-zinc-400">Kelola profil, struktur, berita, galeri, dan open recruitment.</p>
        </div>
        {showSwitcher ? (
          <div className="flex items-center gap-3">
            <Label className="text-sm">Pilih Halaman</Label>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              value={active}
              onChange={(e) => {
                const key = e.target.value as PageKey;
                setActive(key);
                navigate(key === 'home' ? '/public-site' : `/public-site/${key}`);
              }}
            >
              {PAGES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {active === 'home' ? (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4">
          <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Akses Cepat</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PAGES.filter((p) => p.key !== 'home').map((p) => (
              <Button
                key={p.key}
                variant="outline"
                className="justify-start"
                onClick={() => navigate(p.key === 'home' ? '/public-site' : `/public-site/${p.key}`)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {active === 'profile' ? (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-5">
          <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">Profil Publik</div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama Organisasi</Label>
              <Input value={profileDraft.orgName} onChange={(e) => setProfileDraft((p) => ({ ...p, orgName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nama Kampus</Label>
              <Input value={profileDraft.campusName} onChange={(e) => setProfileDraft((p) => ({ ...p, campusName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nama Kabinet</Label>
              <Input value={profileDraft.kabinetName} onChange={(e) => setProfileDraft((p) => ({ ...p, kabinetName: e.target.value }))} placeholder="Contoh: Aksara Muda" />
            </div>
            <div className="space-y-2">
              <Label>Periode Kabinet</Label>
              <Input value={profileDraft.kabinetPeriod} onChange={(e) => setProfileDraft((p) => ({ ...p, kabinetPeriod: e.target.value }))} placeholder="Contoh: 2026/2027" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Hero Subtitle</Label>
              <Textarea value={profileDraft.heroSubtitle} onChange={(e) => setProfileDraft((p) => ({ ...p, heroSubtitle: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>YouTube Embed URL</Label>
              <Input
                value={profileDraft.youtubeEmbedUrl}
                onChange={(e) => setProfileDraft((p) => ({ ...p, youtubeEmbedUrl: e.target.value }))}
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Judul “Tentang”</Label>
              <Input value={profileDraft.aboutTitle} onChange={(e) => setProfileDraft((p) => ({ ...p, aboutTitle: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Konten “Tentang” (teks, boleh pakai baris baru)</Label>
              <Textarea
                value={profileDraft.aboutContent}
                onChange={(e) => setProfileDraft((p) => ({ ...p, aboutContent: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Footer Tagline (singkat)</Label>
              <Input value={profileDraft.footerTagline} onChange={(e) => setProfileDraft((p) => ({ ...p, footerTagline: e.target.value }))} placeholder="Contoh: Ruang kolaborasi, karya, dan prestasi anak SDP." />
            </div>
            <div className="space-y-2">
              <Label>Instagram URL</Label>
              <Input value={profileDraft.instagramUrl} onChange={(e) => setProfileDraft((p) => ({ ...p, instagramUrl: e.target.value }))} placeholder="https://instagram.com/..." />
            </div>
            <div className="space-y-2">
              <Label>TikTok URL</Label>
              <Input value={profileDraft.tiktokUrl} onChange={(e) => setProfileDraft((p) => ({ ...p, tiktokUrl: e.target.value }))} placeholder="https://tiktok.com/@..." />
            </div>
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input value={profileDraft.youtubeUrl} onChange={(e) => setProfileDraft((p) => ({ ...p, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/@..." />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profileDraft.email} onChange={(e) => setProfileDraft((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input value={profileDraft.phone} onChange={(e) => setProfileDraft((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Alamat</Label>
              <Input value={profileDraft.address} onChange={(e) => setProfileDraft((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Logo (Light URL)</Label>
              <Input value={profileDraft.logoLightUrl} onChange={(e) => setProfileDraft((p) => ({ ...p, logoLightUrl: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Logo (Dark URL)</Label>
              <Input value={profileDraft.logoDarkUrl} onChange={(e) => setProfileDraft((p) => ({ ...p, logoDarkUrl: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Upload Logo Light (Cloudinary)</Label>
              <input
                type="file"
                accept="image/*"
                disabled={profileUploading.light}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setProfileUploading((x) => ({ ...x, light: true }));
                  try {
                    const url = await uploadImage(file);
                    setProfileDraft((p) => ({ ...p, logoLightUrl: url }));
                    toast.success('Upload logo light berhasil');
                  } catch (err: any) {
                    toast.error(err?.response?.data?.error || 'Gagal upload');
                  } finally {
                    setProfileUploading((x) => ({ ...x, light: false }));
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Upload Logo Dark (Cloudinary)</Label>
              <input
                type="file"
                accept="image/*"
                disabled={profileUploading.dark}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setProfileUploading((x) => ({ ...x, dark: true }));
                  try {
                    const url = await uploadImage(file);
                    setProfileDraft((p) => ({ ...p, logoDarkUrl: url }));
                    toast.success('Upload logo dark berhasil');
                  } catch (err: any) {
                    toast.error(err?.response?.data?.error || 'Gagal upload');
                  } finally {
                    setProfileUploading((x) => ({ ...x, dark: false }));
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Warna Utama (HEX)</Label>
              <Input value={profileDraft.primaryColor} onChange={(e) => setProfileDraft((p) => ({ ...p, primaryColor: e.target.value }))} placeholder="#2563eb" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (!profile) return;
                setProfileDraft({
                  orgName: profile.org_name ?? '',
                  campusName: profile.campus_name ?? '',
                  kabinetName: profile.kabinet_name ?? '',
                  kabinetPeriod: profile.kabinet_period ?? '',
                  heroSubtitle: profile.hero_subtitle ?? '',
                  youtubeEmbedUrl: profile.youtube_embed_url ?? '',
                  aboutTitle: profile.about_title ?? '',
                  aboutContent: profile.about_content ?? '',
                  footerTagline: profile.footer_tagline ?? '',
                  instagramUrl: profile.instagram_url ?? '',
                  tiktokUrl: profile.tiktok_url ?? '',
                  youtubeUrl: profile.youtube_url ?? '',
                  address: profile.address ?? '',
                  email: profile.email ?? '',
                  phone: profile.phone ?? '',
                  logoLightUrl: profile.logo_light_url ?? '/3.%20HM%20SDP.png',
                  logoDarkUrl: profile.logo_dark_url ?? '/3.%20HM%20SDP.png',
                  primaryColor: profile.primary_color ?? '#2563eb',
                });
              }}
            >
              Reset
            </Button>
            <Button onClick={saveProfile}>Simpan</Button>
          </div>
        </div>
      ) : null}

      {active === 'structure' ? (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-5">
          <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">Struktur Organisasi</div>
          <div className="space-y-2">
            <Label>JSON Struktur (array: [{'{'}title, people[{'{'}name, role{'}'}]{'}'}])</Label>
            <Textarea
              value={structureJson}
              onChange={(e) => setStructureJson(e.target.value)}
              placeholder='[{"title":"INTI","people":[{"name":"Nama","role":"Ketua"}]}]'
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const mapped = (structure ?? []).map((g) => ({
                  title: g.title,
                  sortOrder: g.sort_order,
                  people: (g.members ?? []).map((m) => ({ name: m.name, role: m.role, sortOrder: m.sort_order })),
                }));
                setStructureJson(JSON.stringify(mapped, null, 2));
              }}
            >
              Reset
            </Button>
            <Button onClick={saveStructure}>Simpan</Button>
          </div>
        </div>
      ) : null}

      {active === 'programs' ? (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-6">
          <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">Program Kerja</div>
          <form onSubmit={upsertProgram} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Judul</Label>
              <Input value={programForm.title ?? ''} onChange={(e) => setProgramForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rentang Tanggal</Label>
              <Input value={programForm.dateRange ?? ''} onChange={(e) => setProgramForm((p) => ({ ...p, dateRange: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Publik</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                value={(programForm.isPublished ?? false) ? 'true' : 'false'}
                onChange={(e) => setProgramForm((p) => ({ ...p, isPublished: e.target.value === 'true' }))}
              >
                <option value="false">Draft</option>
                <option value="true">Publish</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea value={programForm.description ?? ''} onChange={(e) => setProgramForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              {programForm.id ? <Button variant="outline" type="button" onClick={resetProgramForm}>Batal</Button> : null}
              <Button type="submit">{programForm.id ? 'Update' : 'Tambah'}</Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.date_range ?? '-'}</TableCell>
                  <TableCell>{p.is_published ? 'Publish' : 'Draft'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        setProgramForm({
                          id: p.id,
                          title: p.title,
                          dateRange: p.date_range ?? '',
                          description: p.description ?? '',
                          isPublished: p.is_published,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      type="button"
                      onClick={() => openDelete('programs', p.id)}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {active === 'posts' ? (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">Berita & Info</div>
            <div className="flex items-center gap-3">
              <Label className="text-sm">Tipe</Label>
              <select
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                value={postType}
                onChange={(e) => {
                  const next = e.target.value as any;
                  setPostType(next);
                  setPostForm((p) => ({ ...p, type: next }));
                }}
              >
                <option value="BERITA">BERITA</option>
                <option value="KEGIATAN">KEGIATAN</option>
                <option value="PENGUMUMAN">PENGUMUMAN</option>
                <option value="LOMBA">LOMBA</option>
              </select>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Kategori</div>
              <form onSubmit={upsertCategory} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nama</Label>
                  <Input value={categoryForm.name ?? ''} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Slug (opsional)</Label>
                  <Input value={categoryForm.slug ?? ''} onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))} placeholder="contoh: prestasi-mahasiswa" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  {categoryForm.id ? <Button variant="outline" type="button" onClick={resetCategoryForm}>Batal</Button> : null}
                  <Button type="submit">{categoryForm.id ? 'Update' : 'Tambah'}</Button>
                </div>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.slug}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setCategoryForm({ id: c.id, name: c.name, slug: c.slug })}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" type="button" onClick={() => openDelete('categories', c.id)}>
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Konten</div>
              <form onSubmit={upsertPost} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Judul</Label>
                  <Input value={postForm.title ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Slug (opsional)</Label>
                  <Input value={postForm.slug ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, slug: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Label</Label>
                  <Input value={postForm.dateLabel ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, dateLabel: e.target.value }))} placeholder="contoh: 7 Mei 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    value={postForm.categoryId ?? ''}
                    onChange={(e) => setPostForm((p) => ({ ...p, categoryId: e.target.value || undefined }))}
                  >
                    <option value="">-</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status (opsional)</Label>
                  <Input value={postForm.status ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, status: e.target.value }))} placeholder="contoh: Buka / Tutup" />
                </div>
                <div className="space-y-2">
                  <Label>Publik</Label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    value={(postForm.isPublished ?? false) ? 'true' : 'false'}
                    onChange={(e) => setPostForm((p) => ({ ...p, isPublished: e.target.value === 'true' }))}
                  >
                    <option value="false">Draft</option>
                    <option value="true">Publish</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Ringkas</Label>
                  <Textarea value={postForm.excerpt ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, excerpt: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Konten</Label>
                  <Textarea value={postForm.content ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, content: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Cover Image URL</Label>
                  <Input value={postForm.coverImageUrl ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, coverImageUrl: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Upload Cover (Cloudinary)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadImage(file);
                        setPostForm((p) => ({ ...p, coverImageUrl: url }));
                        toast.success('Upload berhasil');
                      } catch (err: any) {
                        toast.error(err?.response?.data?.error || 'Gagal upload');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  {postForm.id ? <Button variant="outline" type="button" onClick={resetPostForm}>Batal</Button> : null}
                  <Button type="submit">{postForm.id ? 'Update' : 'Tambah'}</Button>
                </div>
              </form>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.filter((p) => p.type === postType).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.category?.name ?? '-'}</TableCell>
                  <TableCell>{p.date_label ?? '-'}</TableCell>
                  <TableCell>{p.is_published ? 'Publish' : 'Draft'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setPostType(p.type);
                        setPostForm({
                          id: p.id,
                          type: p.type,
                          title: p.title,
                          slug: p.slug,
                          dateLabel: p.date_label ?? '',
                          status: p.status ?? '',
                          excerpt: p.excerpt ?? '',
                          content: p.content ?? '',
                          coverImageUrl: p.cover_image_url ?? '',
                          categoryId: p.category_id ?? '',
                          isPublished: p.is_published,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" type="button" onClick={() => openDelete('posts', p.id)}>
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {active === 'galleries' ? (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-6">
          <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">Galeri</div>
          <form onSubmit={upsertGallery} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Judul Album</Label>
              <Input value={galleryForm.title ?? ''} onChange={(e) => setGalleryForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Publik</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                value={(galleryForm.isPublished ?? false) ? 'true' : 'false'}
                onChange={(e) => setGalleryForm((p) => ({ ...p, isPublished: e.target.value === 'true' }))}
              >
                <option value="false">Draft</option>
                <option value="true">Publish</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea value={galleryForm.description ?? ''} onChange={(e) => setGalleryForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Items (JSON array: [{'{'}imageUrl, caption{'}'}])</Label>
              <Textarea
                value={galleryForm.itemsJson ?? ''}
                onChange={(e) => setGalleryForm((p) => ({ ...p, itemsJson: e.target.value }))}
                placeholder='[{"imageUrl":"https://...","caption":"..."},{"imageUrl":"https://...","caption":"..."}]'
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Upload Foto untuk Items (Cloudinary)</Label>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={galleryUploading}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || !files.length) return;
                  await appendGalleryItemsFromFiles(files);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              {galleryForm.id ? <Button variant="outline" type="button" onClick={resetGalleryForm}>Batal</Button> : null}
              <Button type="submit">{galleryForm.id ? 'Update' : 'Tambah'}</Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Album</TableHead>
                <TableHead>Jumlah Foto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {galleries.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.title}</TableCell>
                  <TableCell>{g.items?.length ?? 0}</TableCell>
                  <TableCell>{g.is_published ? 'Publish' : 'Draft'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        setGalleryForm({
                          id: g.id,
                          title: g.title,
                          description: g.description ?? '',
                          isPublished: g.is_published,
                          itemsJson: JSON.stringify(
                            (g.items ?? []).map((it) => ({
                              imageUrl: it.image_url,
                              caption: it.caption ?? '',
                              sortOrder: (it as any).sort_order ?? 0,
                            })),
                            null,
                            2
                          ),
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" type="button" onClick={() => openDelete('galleries', g.id)}>
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {active === 'recruitments' ? (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-6">
          <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">Open Recruitment</div>
          <form onSubmit={upsertRecruitment} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Judul</Label>
              <Input value={recruitmentForm.title ?? ''} onChange={(e) => setRecruitmentForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rentang Tanggal</Label>
              <Input value={recruitmentForm.dateRange ?? ''} onChange={(e) => setRecruitmentForm((p) => ({ ...p, dateRange: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Link Form</Label>
              <Input value={recruitmentForm.formUrl ?? ''} onChange={(e) => setRecruitmentForm((p) => ({ ...p, formUrl: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Publik</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                value={(recruitmentForm.isPublished ?? false) ? 'true' : 'false'}
                onChange={(e) => setRecruitmentForm((p) => ({ ...p, isPublished: e.target.value === 'true' }))}
              >
                <option value="false">Draft</option>
                <option value="true">Publish</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea value={recruitmentForm.description ?? ''} onChange={(e) => setRecruitmentForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Panitia (JSON array: [{'{'}name, role{'}'}])</Label>
              <Textarea
                value={recruitmentForm.committeeJson ?? ''}
                onChange={(e) => setRecruitmentForm((p) => ({ ...p, committeeJson: e.target.value }))}
                placeholder='[{"name":"Nama","role":"Ketua"},{"name":"Nama","role":"Sekretaris"}]'
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              {recruitmentForm.id ? <Button variant="outline" type="button" onClick={resetRecruitmentForm}>Batal</Button> : null}
              <Button type="submit">{recruitmentForm.id ? 'Update' : 'Tambah'}</Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recruitments.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.date_range ?? '-'}</TableCell>
                  <TableCell>{r.is_published ? 'Publish' : 'Draft'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        setRecruitmentForm({
                          id: r.id,
                          title: r.title,
                          dateRange: r.date_range ?? '',
                          description: r.description ?? '',
                          formUrl: r.form_url ?? '',
                          isPublished: r.is_published,
                          committeeJson: JSON.stringify((r.committee ?? []).map((x) => ({ name: x.name, role: x.role, sortOrder: (x as any).sort_order ?? 0 })), null, 2),
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" type="button" onClick={() => openDelete('recruitments', r.id)}>
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Hapus"
        description={deleteDescription}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}

