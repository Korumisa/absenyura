import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PublicProfile } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/errorMessage';
import { prepareImageForUpload } from '@/lib/imageUpload';
import { ConfirmModal } from '@/components/ConfirmModal';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import { AdminCardActions } from '@/components/admin/AdminCardActions';
import PublicSiteProfilePreview from '@/components/publicSiteAdmin/PublicSiteProfilePreview';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CmsTabNav, type CmsTabItem } from '@/components/ui/CmsTabNav';
import { CmsEditorLayout } from '@/components/cms/CmsEditorLayout';
import { AdminContentTransition } from '@/components/admin/AdminContentTransition';

type ProfileTab = 'identity' | 'home' | 'visimisi' | 'contact';

const PROFILE_TABS: readonly CmsTabItem<ProfileTab>[] = [
  { id: 'identity', label: 'Identitas' },
  { id: 'home', label: 'Beranda' },
  { id: 'visimisi', label: 'Visi & Misi' },
  { id: 'contact', label: 'Kontak & Sosial' },
];

export default function PublicSiteProfile() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile, mutate } = useSWR<PublicProfile | null>('/public-site/admin/profile', fetcher, { revalidateOnFocus: false });

  type Draft = {
    orgName: string;
    campusName: string;
    kabinetName: string;
    kabinetPeriod: string;
    heroSubtitle: string;
    youtubeEmbedUrl: string;
    aboutTitle: string;
    aboutContent: string;
    homeCardLeftTitle: string;
    homeCardLeftBody: string;
    homeCardRightTitle: string;
    homeCardRightBody: string;
    vision: string;
    mission: string;
    visiPhotoUrl: string;
    visiName: string;
    visiRole: string;
    misiPhotoUrl: string;
    misiName: string;
    misiRole: string;
    footerTagline: string;
    instagramUrl: string;
    tiktokUrl: string;
    youtubeUrl: string;
    address: string;
    email: string;
    phone: string;
    logoLightUrl: string;
    logoDarkUrl: string;
    homeImageUrl: string;
    primaryColor: string;
  };

  const normalizeHexColor = (input: string) => {
    const raw = String(input ?? '').trim();
    if (!raw) return '#2563eb';
    const hex = raw.startsWith('#') ? raw : `#${raw}`;
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : '#2563eb';
  };

  const [draft, setDraft] = useState<Draft>({
    orgName: '',
    campusName: '',
    kabinetName: '',
    kabinetPeriod: '',
    heroSubtitle: '',
    youtubeEmbedUrl: '',
    aboutTitle: '',
    aboutContent: '',
    homeCardLeftTitle: '',
    homeCardLeftBody: '',
    homeCardRightTitle: '',
    homeCardRightBody: '',
    vision: '',
    mission: '',
    visiPhotoUrl: '',
    visiName: '',
    visiRole: '',
    misiPhotoUrl: '',
    misiName: '',
    misiRole: '',
    footerTagline: '',
    instagramUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    address: '',
    email: '',
    phone: '',
    logoLightUrl: '',
    logoDarkUrl: '',
    homeImageUrl: '',
    primaryColor: '#2563eb',
  });

  const [dirty, setDirty] = useState(false);
  const updateDraft = (updater: React.SetStateAction<Draft>) => {
    setDirty(true);
    setDraft(updater);
  };

  useEffect(() => {
    if (!profile) return;
    setDraft({
      orgName: profile.org_name ?? '',
      campusName: profile.campus_name ?? '',
      kabinetName: profile.kabinet_name ?? '',
      kabinetPeriod: profile.kabinet_period ?? '',
      heroSubtitle: profile.hero_subtitle ?? '',
      youtubeEmbedUrl: profile.youtube_embed_url ?? '',
      aboutTitle: profile.about_title ?? '',
      aboutContent: profile.about_content ?? '',
      homeCardLeftTitle: (profile as any).home_card_left_title ?? '',
      homeCardLeftBody: (profile as any).home_card_left_body ?? '',
      homeCardRightTitle: (profile as any).home_card_right_title ?? '',
      homeCardRightBody: (profile as any).home_card_right_body ?? '',
      vision: profile.vision ?? '',
      mission: profile.mission ?? '',
      visiPhotoUrl: (profile as any).visi_photo_url ?? '',
      visiName: (profile as any).visi_name ?? '',
      visiRole: (profile as any).visi_role ?? '',
      misiPhotoUrl: (profile as any).misi_photo_url ?? '',
      misiName: (profile as any).misi_name ?? '',
      misiRole: (profile as any).misi_role ?? '',
      footerTagline: profile.footer_tagline ?? '',
      instagramUrl: profile.instagram_url ?? '',
      tiktokUrl: profile.tiktok_url ?? '',
      youtubeUrl: profile.youtube_url ?? '',
      address: profile.address ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      logoLightUrl: profile.logo_light_url ?? '',
      logoDarkUrl: profile.logo_dark_url ?? '',
      homeImageUrl: profile.home_image_url ?? '',
      primaryColor: normalizeHexColor(profile.primary_color ?? ''),
    });
    setDirty(false);
  }, [profile]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{ light: boolean; dark: boolean; home: boolean; visi: boolean; misi: boolean }>({
    light: false,
    dark: false,
    home: false,
    visi: false,
    misi: false,
  });
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<ProfileTab>('identity');

  const uploadImage = async (file: File) => {
    const prepared = await prepareImageForUpload(file, { maxBytes: 4 * 1024 * 1024, maxWidth: 1920, quality: 0.82 });
    const form = new FormData();
    form.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data.url as string;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/public-site/admin/profile', { data: draft });
      toast.success('Profil publik tersimpan');
      setDirty(false);
      mutate();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Gagal menyimpan'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!profile) return;
    setDraft({
      orgName: profile.org_name ?? '',
      campusName: profile.campus_name ?? '',
      kabinetName: profile.kabinet_name ?? '',
      kabinetPeriod: profile.kabinet_period ?? '',
      heroSubtitle: profile.hero_subtitle ?? '',
      youtubeEmbedUrl: profile.youtube_embed_url ?? '',
      aboutTitle: profile.about_title ?? '',
      aboutContent: profile.about_content ?? '',
      homeCardLeftTitle: (profile as any).home_card_left_title ?? '',
      homeCardLeftBody: (profile as any).home_card_left_body ?? '',
      homeCardRightTitle: (profile as any).home_card_right_title ?? '',
      homeCardRightBody: (profile as any).home_card_right_body ?? '',
      vision: profile.vision ?? '',
      mission: profile.mission ?? '',
      visiPhotoUrl: (profile as any).visi_photo_url ?? '',
      visiName: (profile as any).visi_name ?? '',
      visiRole: (profile as any).visi_role ?? '',
      misiPhotoUrl: (profile as any).misi_photo_url ?? '',
      misiName: (profile as any).misi_name ?? '',
      misiRole: (profile as any).misi_role ?? '',
      footerTagline: profile.footer_tagline ?? '',
      instagramUrl: profile.instagram_url ?? '',
      tiktokUrl: profile.tiktok_url ?? '',
      youtubeUrl: profile.youtube_url ?? '',
      address: profile.address ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      logoLightUrl: profile.logo_light_url ?? '',
      logoDarkUrl: profile.logo_dark_url ?? '',
      homeImageUrl: profile.home_image_url ?? '',
      primaryColor: normalizeHexColor(profile.primary_color ?? ''),
    });
    setDirty(false);
  };

  return (
    <AdminPageShell
      title="Profil Publik"
      description="Atur identitas, deskripsi, logo, dan tautan sosial media."
      variant="plain"
      icon={<Globe size={22} />}
    >
      <ConfirmModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={() => {
          handleReset();
          setIsResetOpen(false);
        }}
        title="Reset perubahan?"
        description="Semua perubahan yang belum disimpan akan dikembalikan ke data terakhir yang tersimpan."
        confirmText="Reset"
        cancelText="Batal"
        variant="primary"
      />

      <AdminCard title="Pengaturan Profil" description="Data ini dipakai untuk halaman public, footer, dan kontak organisasi." className="">
        <CmsEditorLayout
          preview={<PublicSiteProfilePreview draft={draft} />}
        >
          <div className="min-w-0 space-y-6">
            <CmsTabNav<ProfileTab> tabs={PROFILE_TABS} value={profileTab} onChange={setProfileTab} ariaLabel="Bagian profil" />

        <AdminContentTransition contentKey={profileTab}>
        <div className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'identity' && 'hidden')}>
          <div className="space-y-2">
            <Label>Nama Organisasi</Label>
            <Input value={draft.orgName} onChange={(e) => updateDraft((p) => ({ ...p, orgName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Nama Kampus</Label>
            <Input value={draft.campusName} onChange={(e) => updateDraft((p) => ({ ...p, campusName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Nama Kabinet</Label>
            <Input value={draft.kabinetName} onChange={(e) => updateDraft((p) => ({ ...p, kabinetName: e.target.value }))} placeholder="Contoh: Aksara Muda" />
          </div>
          <div className="space-y-2">
            <Label>Periode Kabinet</Label>
            <Input value={draft.kabinetPeriod} onChange={(e) => updateDraft((p) => ({ ...p, kabinetPeriod: e.target.value }))} placeholder="Contoh: 2026/2027" />
          </div>
          <div className="space-y-2">
            <Label>Warna Utama</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={normalizeHexColor(draft.primaryColor)}
                onChange={(e) => updateDraft((p) => ({ ...p, primaryColor: e.target.value }))}
                className="h-10 w-14 p-1"
              />
              <Input
                value={draft.primaryColor}
                onChange={(e) => updateDraft((p) => ({ ...p, primaryColor: e.target.value }))}
                placeholder="#2563eb"
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Hero Subtitle</Label>
            <Textarea value={draft.heroSubtitle} onChange={(e) => updateDraft((p) => ({ ...p, heroSubtitle: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Embed URL (YouTube / TikTok / Instagram)</Label>
            <Input
              value={draft.youtubeEmbedUrl}
              onChange={(e) => updateDraft((p) => ({ ...p, youtubeEmbedUrl: e.target.value }))}
              placeholder="Link post / link embed"
            />
          </div>
        </div>

        <div className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'home' && 'hidden')}>
          <div className="space-y-2 md:col-span-2">
            <Label>Judul “Tentang”</Label>
            <Input value={draft.aboutTitle} onChange={(e) => updateDraft((p) => ({ ...p, aboutTitle: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Konten “Tentang”</Label>
            <Textarea value={draft.aboutContent} onChange={(e) => updateDraft((p) => ({ ...p, aboutContent: e.target.value }))} />
            <div className="text-xs text-muted-foreground">Pisahkan paragraf dengan baris baru (Enter).</div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Beranda: Paragraf Kiri</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={draft.homeCardLeftTitle}
                onChange={(e) => updateDraft((p) => ({ ...p, homeCardLeftTitle: e.target.value }))}
                placeholder="Judul paragraf kiri"
              />
              <Input
                value={draft.homeCardRightTitle}
                onChange={(e) => updateDraft((p) => ({ ...p, homeCardRightTitle: e.target.value }))}
                placeholder="Judul paragraf kanan"
              />
              <Textarea
                value={draft.homeCardLeftBody}
                onChange={(e) => updateDraft((p) => ({ ...p, homeCardLeftBody: e.target.value }))}
                placeholder="Isi paragraf kiri"
                className="min-h-[110px]"
              />
              <Textarea
                value={draft.homeCardRightBody}
                onChange={(e) => updateDraft((p) => ({ ...p, homeCardRightBody: e.target.value }))}
                placeholder="Isi paragraf kanan"
                className="min-h-[110px]"
              />
            </div>
            <div className="text-xs text-muted-foreground">Ini akan tampil sebagai 2 kartu paragraf di beranda.</div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Foto Anggota (URL)</Label>
            <Input value={draft.homeImageUrl} onChange={(e) => updateDraft((p) => ({ ...p, homeImageUrl: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Upload Foto Anggota</Label>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="space-y-2">
                <Input
                  id="profile-home-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading.home || uploading.light || uploading.dark}
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    setUploading((x) => ({ ...x, home: true }));
                    try {
                      const url = await uploadImage(file);
                      updateDraft((p) => ({ ...p, homeImageUrl: url }));
                      toast.success('Upload foto anggota berhasil');
                    } catch (err: any) {
                      toast.error(String(getErrorMessage(err, 'Gagal upload')));
                    } finally {
                      setUploading((x) => ({ ...x, home: false }));
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" disabled={uploading.home || uploading.light || uploading.dark || uploading.visi || uploading.misi}>
                    <Label htmlFor="profile-home-image" className="cursor-pointer">
                      {uploading.home ? 'Uploading...' : draft.homeImageUrl ? 'Ganti Foto' : 'Upload Foto'}
                    </Label>
                  </Button>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-slate-50 border-border">
                {draft.homeImageUrl ? (
                  <img src={draft.homeImageUrl} alt="Pratinjau foto anggota" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-xs text-muted-foreground">Belum ada foto</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'visimisi' && 'hidden')}>
          <div className="space-y-2 md:col-span-2">
            <Label>Visi</Label>
            <Textarea value={draft.vision} onChange={(e) => updateDraft((p) => ({ ...p, vision: e.target.value }))} />
            <div className="text-xs text-muted-foreground">Gunakan paragraf singkat, bisa dipisah dengan baris baru.</div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Misi</Label>
            <Textarea value={draft.mission} onChange={(e) => updateDraft((p) => ({ ...p, mission: e.target.value }))} />
            <div className="text-xs text-muted-foreground">Satu baris = satu poin misi.</div>
          </div>
          <div className="space-y-3 md:col-span-2">
            <Label>Beranda: Foto Visi</Label>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="space-y-3">
                <Input value={draft.visiRole} onChange={(e) => updateDraft((p) => ({ ...p, visiRole: e.target.value }))} placeholder="Jabatan (contoh: Ketua Umum)" />
                <Input value={draft.visiName} onChange={(e) => updateDraft((p) => ({ ...p, visiName: e.target.value }))} placeholder="Nama" />
                <Input value={draft.visiPhotoUrl} onChange={(e) => updateDraft((p) => ({ ...p, visiPhotoUrl: e.target.value }))} placeholder="URL Foto" />
                <Input
                  id="profile-visi-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading.visi || uploading.home || uploading.light || uploading.dark || uploading.misi}
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    setUploading((x) => ({ ...x, visi: true }));
                    try {
                      const url = await uploadImage(file);
                      updateDraft((p) => ({ ...p, visiPhotoUrl: url }));
                      toast.success('Upload foto visi berhasil');
                    } catch (err: any) {
                      toast.error(String(getErrorMessage(err, 'Gagal upload')));
                    } finally {
                      setUploading((x) => ({ ...x, visi: false }));
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" disabled={uploading.visi || uploading.home || uploading.light || uploading.dark || uploading.misi}>
                    <Label htmlFor="profile-visi-photo" className="cursor-pointer">
                      {uploading.visi ? 'Uploading...' : draft.visiPhotoUrl ? 'Ganti Foto' : 'Upload Foto'}
                    </Label>
                  </Button>
                  {draft.visiPhotoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateDraft((p) => ({ ...p, visiPhotoUrl: '' }))}
                      disabled={uploading.visi || uploading.home || uploading.light || uploading.dark || uploading.misi}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">PNG/JPG. Maks 4MB.</div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                <div className="aspect-[4/3] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                  {draft.visiPhotoUrl ? (
                    <img src={draft.visiPhotoUrl} alt="Foto Visi" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground dark:text-zinc-300">
                      Belum ada foto
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3 md:col-span-2">
            <Label>Beranda: Foto Misi</Label>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="space-y-3">
                <Input value={draft.misiRole} onChange={(e) => updateDraft((p) => ({ ...p, misiRole: e.target.value }))} placeholder="Jabatan (contoh: Wakil Ketua)" />
                <Input value={draft.misiName} onChange={(e) => updateDraft((p) => ({ ...p, misiName: e.target.value }))} placeholder="Nama" />
                <Input value={draft.misiPhotoUrl} onChange={(e) => updateDraft((p) => ({ ...p, misiPhotoUrl: e.target.value }))} placeholder="URL Foto" />
                <Input
                  id="profile-misi-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading.misi || uploading.home || uploading.light || uploading.dark || uploading.visi}
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    setUploading((x) => ({ ...x, misi: true }));
                    try {
                      const url = await uploadImage(file);
                      updateDraft((p) => ({ ...p, misiPhotoUrl: url }));
                      toast.success('Upload foto misi berhasil');
                    } catch (err: any) {
                      toast.error(String(getErrorMessage(err, 'Gagal upload')));
                    } finally {
                      setUploading((x) => ({ ...x, misi: false }));
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" disabled={uploading.misi || uploading.home || uploading.light || uploading.dark || uploading.visi}>
                    <Label htmlFor="profile-misi-photo" className="cursor-pointer">
                      {uploading.misi ? 'Uploading...' : draft.misiPhotoUrl ? 'Ganti Foto' : 'Upload Foto'}
                    </Label>
                  </Button>
                  {draft.misiPhotoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateDraft((p) => ({ ...p, misiPhotoUrl: '' }))}
                      disabled={uploading.misi || uploading.home || uploading.light || uploading.dark || uploading.visi}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">PNG/JPG. Maks 4MB.</div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                <div className="aspect-[4/3] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                  {draft.misiPhotoUrl ? (
                    <img src={draft.misiPhotoUrl} alt="Foto Misi" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground dark:text-zinc-300">
                      Belum ada foto
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'contact' && 'hidden')}>
          <div className="space-y-2 md:col-span-2">
            <Label>Footer Tagline</Label>
            <Input value={draft.footerTagline} onChange={(e) => updateDraft((p) => ({ ...p, footerTagline: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Instagram URL</Label>
            <Input value={draft.instagramUrl} onChange={(e) => updateDraft((p) => ({ ...p, instagramUrl: e.target.value }))} placeholder="https://instagram.com/..." />
          </div>
          <div className="space-y-2">
            <Label>TikTok URL</Label>
            <Input value={draft.tiktokUrl} onChange={(e) => updateDraft((p) => ({ ...p, tiktokUrl: e.target.value }))} placeholder="https://tiktok.com/@..." />
          </div>
          <div className="space-y-2">
            <Label>YouTube URL</Label>
            <Input value={draft.youtubeUrl} onChange={(e) => updateDraft((p) => ({ ...p, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/@..." />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={draft.email} onChange={(e) => updateDraft((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Telepon</Label>
            <Input value={draft.phone} onChange={(e) => updateDraft((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Alamat</Label>
            <Input value={draft.address} onChange={(e) => updateDraft((p) => ({ ...p, address: e.target.value }))} />
          </div>
        </div>

        <div className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'identity' && 'hidden')}>
          <div className="space-y-2">
            <Label>Logo (Light URL)</Label>
            <Input value={draft.logoLightUrl} onChange={(e) => updateDraft((p) => ({ ...p, logoLightUrl: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Logo (Dark URL)</Label>
            <Input value={draft.logoDarkUrl} onChange={(e) => updateDraft((p) => ({ ...p, logoDarkUrl: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Upload Logo Light</Label>
            <div className="space-y-2">
              <Input
                id="profile-logo-light"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading.light || uploading.home || uploading.dark || uploading.visi || uploading.misi}
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  setUploading((x) => ({ ...x, light: true }));
                  try {
                    const url = await uploadImage(file);
                    updateDraft((p) => ({ ...p, logoLightUrl: url }));
                    toast.success('Upload logo light berhasil');
                  } catch (err: any) {
                    toast.error(String(getErrorMessage(err, 'Gagal upload')));
                  } finally {
                    setUploading((x) => ({ ...x, light: false }));
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" disabled={uploading.light || uploading.home || uploading.dark || uploading.visi || uploading.misi}>
                  <Label htmlFor="profile-logo-light" className="cursor-pointer">
                    {uploading.light ? 'Uploading...' : draft.logoLightUrl ? 'Ganti Logo' : 'Upload Logo'}
                  </Label>
                </Button>
                {draft.logoLightUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => updateDraft((p) => ({ ...p, logoLightUrl: '' }))}
                    disabled={uploading.light || uploading.home || uploading.dark || uploading.visi || uploading.misi}
                  >
                    Hapus
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Upload Logo Dark</Label>
            <div className="space-y-2">
              <Input
                id="profile-logo-dark"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading.dark || uploading.home || uploading.light || uploading.visi || uploading.misi}
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  setUploading((x) => ({ ...x, dark: true }));
                  try {
                    const url = await uploadImage(file);
                    updateDraft((p) => ({ ...p, logoDarkUrl: url }));
                    toast.success('Upload logo dark berhasil');
                  } catch (err: any) {
                    toast.error(String(getErrorMessage(err, 'Gagal upload')));
                  } finally {
                    setUploading((x) => ({ ...x, dark: false }));
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" disabled={uploading.dark || uploading.home || uploading.light || uploading.visi || uploading.misi}>
                  <Label htmlFor="profile-logo-dark" className="cursor-pointer">
                    {uploading.dark ? 'Uploading...' : draft.logoDarkUrl ? 'Ganti Logo' : 'Upload Logo'}
                  </Label>
                </Button>
                {draft.logoDarkUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => updateDraft((p) => ({ ...p, logoDarkUrl: '' }))}
                    disabled={uploading.dark || uploading.home || uploading.light || uploading.visi || uploading.misi}
                  >
                    Hapus
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        </AdminContentTransition>

        <AdminCardActions>
          <Button variant="outline" type="button" onClick={() => setIsResetOpen(true)} disabled={saving} className="min-h-11 w-full sm:w-auto">
            Reset
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !dirty} className="min-h-11 w-full sm:w-auto" aria-busy={saving}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </AdminCardActions>
          </div>
        </CmsEditorLayout>
      </AdminCard>
    </AdminPageShell>
  );
}

