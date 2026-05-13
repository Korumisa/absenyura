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
import { Globe } from 'lucide-react';

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
    vision: string;
    mission: string;
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
    vision: '',
    mission: '',
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
      vision: profile.vision ?? '',
      mission: profile.mission ?? '',
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
  }, [profile]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{ light: boolean; dark: boolean; home: boolean }>({ light: false, dark: false, home: false });
  const [isResetOpen, setIsResetOpen] = useState(false);

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
      vision: profile.vision ?? '',
      mission: profile.mission ?? '',
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
  };

  return (
    <AdminPageShell title="Profil Publik" description="Atur identitas, deskripsi, logo, dan tautan sosial media." variant="plain" icon={<Globe size={22} />}>
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

      <AdminCard title="Pengaturan Profil" description="Data ini dipakai untuk halaman public, termasuk tombol WhatsApp." className="">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nama Organisasi</Label>
            <Input value={draft.orgName} onChange={(e) => setDraft((p) => ({ ...p, orgName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Nama Kampus</Label>
            <Input value={draft.campusName} onChange={(e) => setDraft((p) => ({ ...p, campusName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Nama Kabinet</Label>
            <Input value={draft.kabinetName} onChange={(e) => setDraft((p) => ({ ...p, kabinetName: e.target.value }))} placeholder="Contoh: Aksara Muda" />
          </div>
          <div className="space-y-2">
            <Label>Periode Kabinet</Label>
            <Input value={draft.kabinetPeriod} onChange={(e) => setDraft((p) => ({ ...p, kabinetPeriod: e.target.value }))} placeholder="Contoh: 2026/2027" />
          </div>
          <div className="space-y-2">
            <Label>Warna Utama</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={normalizeHexColor(draft.primaryColor)}
                onChange={(e) => setDraft((p) => ({ ...p, primaryColor: e.target.value }))}
                className="h-10 w-14 p-1"
              />
              <Input
                value={draft.primaryColor}
                onChange={(e) => setDraft((p) => ({ ...p, primaryColor: e.target.value }))}
                placeholder="#2563eb"
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Hero Subtitle</Label>
            <Textarea value={draft.heroSubtitle} onChange={(e) => setDraft((p) => ({ ...p, heroSubtitle: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>YouTube Embed URL</Label>
            <Input value={draft.youtubeEmbedUrl} onChange={(e) => setDraft((p) => ({ ...p, youtubeEmbedUrl: e.target.value }))} placeholder="https://www.youtube.com/embed/..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Judul “Tentang”</Label>
            <Input value={draft.aboutTitle} onChange={(e) => setDraft((p) => ({ ...p, aboutTitle: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Konten “Tentang”</Label>
            <Textarea value={draft.aboutContent} onChange={(e) => setDraft((p) => ({ ...p, aboutContent: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Visi</Label>
            <Textarea value={draft.vision} onChange={(e) => setDraft((p) => ({ ...p, vision: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Misi</Label>
            <Textarea value={draft.mission} onChange={(e) => setDraft((p) => ({ ...p, mission: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Footer Tagline</Label>
            <Input value={draft.footerTagline} onChange={(e) => setDraft((p) => ({ ...p, footerTagline: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Instagram URL</Label>
            <Input value={draft.instagramUrl} onChange={(e) => setDraft((p) => ({ ...p, instagramUrl: e.target.value }))} placeholder="https://instagram.com/..." />
          </div>
          <div className="space-y-2">
            <Label>TikTok URL</Label>
            <Input value={draft.tiktokUrl} onChange={(e) => setDraft((p) => ({ ...p, tiktokUrl: e.target.value }))} placeholder="https://tiktok.com/@..." />
          </div>
          <div className="space-y-2">
            <Label>YouTube URL</Label>
            <Input value={draft.youtubeUrl} onChange={(e) => setDraft((p) => ({ ...p, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/@..." />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Telepon</Label>
            <Input value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Alamat</Label>
            <Input value={draft.address} onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))} />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Logo (Light URL)</Label>
            <Input value={draft.logoLightUrl} onChange={(e) => setDraft((p) => ({ ...p, logoLightUrl: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Logo (Dark URL)</Label>
            <Input value={draft.logoDarkUrl} onChange={(e) => setDraft((p) => ({ ...p, logoDarkUrl: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Foto Anggota (URL)</Label>
            <Input value={draft.homeImageUrl} onChange={(e) => setDraft((p) => ({ ...p, homeImageUrl: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Upload Foto Anggota</Label>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="space-y-2">
                <input
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
                      setDraft((p) => ({ ...p, homeImageUrl: url }));
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
                  <Button asChild variant="outline" disabled={uploading.home || uploading.light || uploading.dark}>
                    <Label htmlFor="profile-home-image" className="cursor-pointer">
                      {uploading.home ? 'Uploading...' : draft.homeImageUrl ? 'Ganti Foto' : 'Upload Foto'}
                    </Label>
                  </Button>
                  {draft.homeImageUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDraft((p) => ({ ...p, homeImageUrl: '' }))}
                      disabled={uploading.home || uploading.light || uploading.dark}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400">PNG/JPG. Maks 4MB.</div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900/40">
                <div className="aspect-[4/3] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                  {draft.homeImageUrl ? (
                    <img src={draft.homeImageUrl} alt="Foto Anggota" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-slate-500 dark:text-zinc-300">
                      Belum ada foto
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Upload Logo Light</Label>
            <div className="space-y-2">
              <input
                id="profile-logo-light"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading.light || uploading.home || uploading.dark}
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  setUploading((x) => ({ ...x, light: true }));
                  try {
                    const url = await uploadImage(file);
                    setDraft((p) => ({ ...p, logoLightUrl: url }));
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
                <Button asChild variant="outline" disabled={uploading.light || uploading.home || uploading.dark}>
                  <Label htmlFor="profile-logo-light" className="cursor-pointer">
                    {uploading.light ? 'Uploading...' : draft.logoLightUrl ? 'Ganti Logo' : 'Upload Logo'}
                  </Label>
                </Button>
                {draft.logoLightUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDraft((p) => ({ ...p, logoLightUrl: '' }))}
                    disabled={uploading.light || uploading.home || uploading.dark}
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
              <input
                id="profile-logo-dark"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading.dark || uploading.home || uploading.light}
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  setUploading((x) => ({ ...x, dark: true }));
                  try {
                    const url = await uploadImage(file);
                    setDraft((p) => ({ ...p, logoDarkUrl: url }));
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
                <Button asChild variant="outline" disabled={uploading.dark || uploading.home || uploading.light}>
                  <Label htmlFor="profile-logo-dark" className="cursor-pointer">
                    {uploading.dark ? 'Uploading...' : draft.logoDarkUrl ? 'Ganti Logo' : 'Upload Logo'}
                  </Label>
                </Button>
                {draft.logoDarkUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDraft((p) => ({ ...p, logoDarkUrl: '' }))}
                    disabled={uploading.dark || uploading.home || uploading.light}
                  >
                    Hapus
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => setIsResetOpen(true)} disabled={saving}>
            Reset
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            Simpan
          </Button>
        </div>
      </AdminCard>
    </AdminPageShell>
  );
}

