import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PublicProfile } from '@/types/publicSite';

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
    });
  }, [profile]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{ light: boolean; dark: boolean }>({ light: false, dark: false });

  const uploadImage = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
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
      toast.error(e?.response?.data?.error || 'Gagal menyimpan');
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
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Profil Publik</h1>
        <p className="text-slate-500 dark:text-zinc-400">Atur identitas, deskripsi, logo, dan tautan sosial media.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 space-y-6">
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
            <Input
              type="file"
              accept="image/*"
              disabled={uploading.light || uploading.dark}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const url = await uploadImage(file);
                  setDraft((p) => ({ ...p, homeImageUrl: url }));
                  toast.success('Upload foto anggota berhasil');
                } catch (err: any) {
                  toast.error(err?.response?.data?.error || 'Gagal upload');
                } finally {
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Upload Logo Light</Label>
            <Input
              type="file"
              accept="image/*"
              disabled={uploading.light}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading((x) => ({ ...x, light: true }));
                try {
                  const url = await uploadImage(file);
                  setDraft((p) => ({ ...p, logoLightUrl: url }));
                  toast.success('Upload logo light berhasil');
                } catch (err: any) {
                  toast.error(err?.response?.data?.error || 'Gagal upload');
                } finally {
                  setUploading((x) => ({ ...x, light: false }));
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Upload Logo Dark</Label>
            <Input
              type="file"
              accept="image/*"
              disabled={uploading.dark}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading((x) => ({ ...x, dark: true }));
                try {
                  const url = await uploadImage(file);
                  setDraft((p) => ({ ...p, logoDarkUrl: url }));
                  toast.success('Upload logo dark berhasil');
                } catch (err: any) {
                  toast.error(err?.response?.data?.error || 'Gagal upload');
                } finally {
                  setUploading((x) => ({ ...x, dark: false }));
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={handleReset} disabled={saving}>
            Reset
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}

