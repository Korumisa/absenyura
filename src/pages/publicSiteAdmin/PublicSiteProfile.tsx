import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import type { PublicProfile } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/http/errorMessage';
import { prepareImageForUpload } from '@/lib/media/imageUpload';
import { ConfirmModal } from '@/components/ConfirmModal';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import { AdminCardActions } from '@/components/admin/AdminCardActions';
import PublicSiteProfilePreview from '@/components/publicSiteAdmin/PublicSiteProfilePreview';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { CmsTabNav, type CmsTabItem } from '@/components/ui/CmsTabNav';
import { CmsEditorLayout } from '@/components/cms/CmsEditorLayout';
import { AdminContentTransition } from '@/components/admin/AdminContentTransition';
import { useMutationToast } from '@/hooks/useMutationToast';

type ProfileTab = 'identity' | 'home' | 'visimisi' | 'contact';

const PROFILE_TABS: readonly CmsTabItem<ProfileTab>[] = [
  { id: 'identity', label: 'Identitas' },
  { id: 'home', label: 'Beranda' },
  { id: 'visimisi', label: 'Visi & Misi' },
  { id: 'contact', label: 'Kontak & Sosial' },
];

export default function PublicSiteProfile() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile, mutate } = useSWR<PublicProfile | null>(
    '/public-site/admin/profile',
    fetcher,
    { revalidateOnFocus: false }
  );

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
  const [uploading, setUploading] = useState<{
    light: boolean;
    dark: boolean;
    home: boolean;
    visi: boolean;
    misi: boolean;
  }>({
    light: false,
    dark: false,
    home: false,
    visi: false,
    misi: false,
  });
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<ProfileTab>('identity');

  const uploadImage = async (file: File) => {
    const prepared = await prepareImageForUpload(file, {
      maxBytes: 4 * 1024 * 1024,
      maxWidth: 1920,
      quality: 0.82,
    });
    const form = new FormData();
    form.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.url as string;
  };

  const CMS_SECTIONS: readonly { id: string; label: string; validate: (d: Draft) => boolean }[] = [
    {
      id: 'identity',
      label: 'Identitas',
      validate: (d) => d.orgName.trim().length > 0,
    },
    {
      id: 'home',
      label: 'Beranda',
      validate: (d) => d.heroSubtitle.trim().length > 0 || d.aboutTitle.trim().length > 0,
    },
    {
      id: 'homeCards',
      label: 'Kartu Beranda',
      validate: () => true,
    },
    {
      id: 'visimisi',
      label: 'Visi & Misi',
      validate: (d) => d.vision.trim().length > 0 || d.mission.trim().length > 0,
    },
    {
      id: 'contact',
      label: 'Kontak',
      validate: (d) =>
        d.email.trim().length > 0 || d.phone.trim().length > 0 || d.address.trim().length > 0,
    },
    {
      id: 'logo',
      label: 'Logo',
      validate: () => true,
    },
  ] as const;

  const handleSave = async () => {
    setSaving(true);
    try {
      const sectionResults = await Promise.allSettled(
        CMS_SECTIONS.map(
          (section) =>
            new Promise<string>((resolve, reject) => {
              window.setTimeout(() => {
                if (section.validate(draft)) {
                  resolve(section.label);
                } else {
                  reject(new Error(section.label));
                }
              }, 0);
            })
        )
      );

      const successes = sectionResults.filter((r) => r.status === 'fulfilled');
      const failures = sectionResults.filter((r) => r.status === 'rejected');
      const failedLabels = failures
        .map((r) => (r as PromiseRejectedResult).reason?.message)
        .filter(Boolean) as string[];

      if (failures.length > 0) {
        const failureMsg = `${successes.length} bagian tersimpan, ${failures.length} gagal: ${failedLabels.join(', ')}`;
        toast.error(failureMsg);
        return;
      }

      await api.put('/public-site/admin/profile', { data: draft });
      toast.success(
        `${successes.length} bagian tersimpan, ${failures.length} gagal${failedLabels.length ? `: ${failedLabels.join(', ')}` : ''}`
      );
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

      <AdminCard
        title="Pengaturan Profil"
        description="Data ini dipakai untuk halaman public, footer, dan kontak organisasi."
        className=""
      >
        <CmsEditorLayout preview={<PublicSiteProfilePreview draft={draft} />}>
          <div className="min-w-0 space-y-6">
            <CmsTabNav<ProfileTab>
              tabs={PROFILE_TABS}
              value={profileTab}
              onChange={setProfileTab}
              ariaLabel="Bagian profil"
            />

            <AdminContentTransition contentKey={profileTab}>
              <div
                className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'identity' && 'hidden')}
              >
                <FormField id="psp-orgname" label="Nama Organisasi">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.orgName}
                      onChange={(e) => updateDraft((p) => ({ ...p, orgName: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="psp-campusname" label="Nama Kampus">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.campusName}
                      onChange={(e) => updateDraft((p) => ({ ...p, campusName: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-kabinetname"
                  label="Nama Kabinet"
                  description="Contoh: Aksara Muda"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.kabinetName}
                      onChange={(e) => updateDraft((p) => ({ ...p, kabinetName: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-kabinetperiod"
                  label="Periode Kabinet"
                  description="Contoh: 2026/2027"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.kabinetPeriod}
                      onChange={(e) =>
                        updateDraft((p) => ({ ...p, kabinetPeriod: e.target.value }))
                      }
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="psp-primarycolor" label="Warna Utama">
                  {({ 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <div
                      className="flex items-center gap-3"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    >
                      <Input
                        type="color"
                        value={normalizeHexColor(draft.primaryColor)}
                        onChange={(e) =>
                          updateDraft((p) => ({ ...p, primaryColor: e.target.value }))
                        }
                        className="h-10 w-14 p-1"
                      />
                      <Input
                        value={draft.primaryColor}
                        onChange={(e) =>
                          updateDraft((p) => ({ ...p, primaryColor: e.target.value }))
                        }
                        placeholder="#2563eb"
                      />
                    </div>
                  )}
                </FormField>
                <FormField id="psp-herosubtitle" label="Hero Subtitle" className="md:col-span-2">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Textarea
                      id={id}
                      value={draft.heroSubtitle}
                      onChange={(e) => updateDraft((p) => ({ ...p, heroSubtitle: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-embedurl"
                  label="Embed URL (YouTube / TikTok / Instagram)"
                  description="Link post / link embed"
                  className="md:col-span-2"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.youtubeEmbedUrl}
                      onChange={(e) =>
                        updateDraft((p) => ({ ...p, youtubeEmbedUrl: e.target.value }))
                      }
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
              </div>

              <div className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'home' && 'hidden')}>
                <FormField id="psp-abouttitle" label="Judul “Tentang”" className="md:col-span-2">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.aboutTitle}
                      onChange={(e) => updateDraft((p) => ({ ...p, aboutTitle: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-aboutcontent"
                  label="Konten “Tentang”"
                  description="Pisahkan paragraf dengan baris baru (Enter)."
                  className="md:col-span-2"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Textarea
                      id={id}
                      value={draft.aboutContent}
                      onChange={(e) => updateDraft((p) => ({ ...p, aboutContent: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-homecards"
                  label="Beranda: Paragraf Kiri & Kanan"
                  description="Ini akan tampil sebagai 2 kartu paragraf di beranda."
                  className="md:col-span-2"
                >
                  {({ 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <div
                      className="grid gap-3 md:grid-cols-2"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    >
                      <Input
                        value={draft.homeCardLeftTitle}
                        onChange={(e) =>
                          updateDraft((p) => ({ ...p, homeCardLeftTitle: e.target.value }))
                        }
                        placeholder="Judul paragraf kiri"
                      />
                      <Input
                        value={draft.homeCardRightTitle}
                        onChange={(e) =>
                          updateDraft((p) => ({ ...p, homeCardRightTitle: e.target.value }))
                        }
                        placeholder="Judul paragraf kanan"
                      />
                      <Textarea
                        value={draft.homeCardLeftBody}
                        onChange={(e) =>
                          updateDraft((p) => ({ ...p, homeCardLeftBody: e.target.value }))
                        }
                        placeholder="Isi paragraf kiri"
                        className="min-h-[110px]"
                      />
                      <Textarea
                        value={draft.homeCardRightBody}
                        onChange={(e) =>
                          updateDraft((p) => ({ ...p, homeCardRightBody: e.target.value }))
                        }
                        placeholder="Isi paragraf kanan"
                        className="min-h-[110px]"
                      />
                    </div>
                  )}
                </FormField>
                <FormField
                  id="psp-homeimageurl"
                  label="Foto Anggota (URL)"
                  description="https://..."
                  className="md:col-span-2"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.homeImageUrl}
                      onChange={(e) => updateDraft((p) => ({ ...p, homeImageUrl: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-homeimageupload"
                  label="Upload Foto Anggota"
                  className="md:col-span-2"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <div
                      className="grid gap-3 md:grid-cols-[1fr_220px]"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    >
                      <div className="space-y-2">
                        <Input
                          id={id}
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
                          <Button
                            asChild
                            variant="outline"
                            disabled={
                              uploading.home ||
                              uploading.light ||
                              uploading.dark ||
                              uploading.visi ||
                              uploading.misi
                            }
                          >
                            <Label htmlFor={id} className="cursor-pointer">
                              {uploading.home
                                ? 'Uploading...'
                                : draft.homeImageUrl
                                  ? 'Ganti Foto'
                                  : 'Upload Foto'}
                            </Label>
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-border bg-slate-50 border-border">
                        {draft.homeImageUrl ? (
                          <img
                            src={draft.homeImageUrl}
                            alt="Pratinjau foto anggota"
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center text-xs text-muted-foreground">
                            Belum ada foto
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </FormField>
              </div>

              <div
                className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'visimisi' && 'hidden')}
              >
                <FormField
                  id="psp-vision"
                  label="Visi"
                  description="Gunakan paragraf singkat, bisa dipisah dengan baris baru."
                  className="md:col-span-2"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Textarea
                      id={id}
                      value={draft.vision}
                      onChange={(e) => updateDraft((p) => ({ ...p, vision: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-mission"
                  label="Misi"
                  description="Satu baris = satu poin misi."
                  className="md:col-span-2"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Textarea
                      id={id}
                      value={draft.mission}
                      onChange={(e) => updateDraft((p) => ({ ...p, mission: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-visionphoto"
                  label="Beranda: Foto Visi"
                  description="PNG/JPG. Maks 4MB."
                  className="md:col-span-2"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <div
                      className="grid gap-3 md:grid-cols-[1fr_220px]"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    >
                      <div className="space-y-3">
                        <Input
                          value={draft.visiRole}
                          onChange={(e) => updateDraft((p) => ({ ...p, visiRole: e.target.value }))}
                          placeholder="Jabatan (contoh: Ketua Umum)"
                        />
                        <Input
                          value={draft.visiName}
                          onChange={(e) => updateDraft((p) => ({ ...p, visiName: e.target.value }))}
                          placeholder="Nama"
                        />
                        <Input
                          value={draft.visiPhotoUrl}
                          onChange={(e) =>
                            updateDraft((p) => ({ ...p, visiPhotoUrl: e.target.value }))
                          }
                          placeholder="URL Foto"
                        />
                        <Input
                          id={id}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={
                            uploading.visi ||
                            uploading.home ||
                            uploading.light ||
                            uploading.dark ||
                            uploading.misi
                          }
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
                          <Button
                            asChild
                            variant="outline"
                            disabled={
                              uploading.visi ||
                              uploading.home ||
                              uploading.light ||
                              uploading.dark ||
                              uploading.misi
                            }
                          >
                            <Label htmlFor={id} className="cursor-pointer">
                              {uploading.visi
                                ? 'Uploading...'
                                : draft.visiPhotoUrl
                                  ? 'Ganti Foto'
                                  : 'Upload Foto'}
                            </Label>
                          </Button>
                          {draft.visiPhotoUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => updateDraft((p) => ({ ...p, visiPhotoUrl: '' }))}
                              disabled={
                                uploading.visi ||
                                uploading.home ||
                                uploading.light ||
                                uploading.dark ||
                                uploading.misi
                              }
                            >
                              Hapus
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                        <div className="aspect-[4/3] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                          {draft.visiPhotoUrl ? (
                            <img
                              src={draft.visiPhotoUrl}
                              alt="Foto Visi"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground dark:text-zinc-300">
                              Belum ada foto
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </FormField>
                <FormField
                  id="psp-missionphoto"
                  label="Beranda: Foto Misi"
                  description="PNG/JPG. Maks 4MB."
                  className="md:col-span-2"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <div
                      className="grid gap-3 md:grid-cols-[1fr_220px]"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    >
                      <div className="space-y-3">
                        <Input
                          value={draft.misiRole}
                          onChange={(e) => updateDraft((p) => ({ ...p, misiRole: e.target.value }))}
                          placeholder="Jabatan (contoh: Wakil Ketua)"
                        />
                        <Input
                          value={draft.misiName}
                          onChange={(e) => updateDraft((p) => ({ ...p, misiName: e.target.value }))}
                          placeholder="Nama"
                        />
                        <Input
                          value={draft.misiPhotoUrl}
                          onChange={(e) =>
                            updateDraft((p) => ({ ...p, misiPhotoUrl: e.target.value }))
                          }
                          placeholder="URL Foto"
                        />
                        <Input
                          id={id}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={
                            uploading.misi ||
                            uploading.home ||
                            uploading.light ||
                            uploading.dark ||
                            uploading.visi
                          }
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
                          <Button
                            asChild
                            variant="outline"
                            disabled={
                              uploading.misi ||
                              uploading.home ||
                              uploading.light ||
                              uploading.dark ||
                              uploading.visi
                            }
                          >
                            <Label htmlFor={id} className="cursor-pointer">
                              {uploading.misi
                                ? 'Uploading...'
                                : draft.misiPhotoUrl
                                  ? 'Ganti Foto'
                                  : 'Upload Foto'}
                            </Label>
                          </Button>
                          {draft.misiPhotoUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => updateDraft((p) => ({ ...p, misiPhotoUrl: '' }))}
                              disabled={
                                uploading.misi ||
                                uploading.home ||
                                uploading.light ||
                                uploading.dark ||
                                uploading.visi
                              }
                            >
                              Hapus
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                        <div className="aspect-[4/3] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                          {draft.misiPhotoUrl ? (
                            <img
                              src={draft.misiPhotoUrl}
                              alt="Foto Misi"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground dark:text-zinc-300">
                              Belum ada foto
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </FormField>
              </div>

              <div
                className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'contact' && 'hidden')}
              >
                <FormField id="psp-footertagline" label="Footer Tagline" className="md:col-span-2">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.footerTagline}
                      onChange={(e) =>
                        updateDraft((p) => ({ ...p, footerTagline: e.target.value }))
                      }
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-instagram"
                  label="Instagram URL"
                  description="https://instagram.com/..."
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.instagramUrl}
                      onChange={(e) => updateDraft((p) => ({ ...p, instagramUrl: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="psp-tiktok" label="TikTok URL" description="https://tiktok.com/@...">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.tiktokUrl}
                      onChange={(e) => updateDraft((p) => ({ ...p, tiktokUrl: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="psp-youtube"
                  label="YouTube URL"
                  description="https://youtube.com/@..."
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.youtubeUrl}
                      onChange={(e) => updateDraft((p) => ({ ...p, youtubeUrl: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="psp-email" label="Email">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.email}
                      onChange={(e) => updateDraft((p) => ({ ...p, email: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="psp-phone" label="Telepon">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.phone}
                      onChange={(e) => updateDraft((p) => ({ ...p, phone: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="psp-address" label="Alamat" className="md:col-span-2">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.address}
                      onChange={(e) => updateDraft((p) => ({ ...p, address: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
              </div>

              <div
                className={cn('grid gap-5 md:grid-cols-2', profileTab !== 'identity' && 'hidden')}
              >
                <FormField id="psp-logolighturl" label="Logo (Light URL)">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.logoLightUrl}
                      onChange={(e) => updateDraft((p) => ({ ...p, logoLightUrl: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="psp-logodarkurl" label="Logo (Dark URL)">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={draft.logoDarkUrl}
                      onChange={(e) => updateDraft((p) => ({ ...p, logoDarkUrl: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="psp-logolightupload" label="Upload Logo Light">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <div
                      className="space-y-2"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    >
                      <Input
                        id={id}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={
                          uploading.light ||
                          uploading.home ||
                          uploading.dark ||
                          uploading.visi ||
                          uploading.misi
                        }
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
                        <Button
                          asChild
                          variant="outline"
                          disabled={
                            uploading.light ||
                            uploading.home ||
                            uploading.dark ||
                            uploading.visi ||
                            uploading.misi
                          }
                        >
                          <Label htmlFor={id} className="cursor-pointer">
                            {uploading.light
                              ? 'Uploading...'
                              : draft.logoLightUrl
                                ? 'Ganti Logo'
                                : 'Upload Logo'}
                          </Label>
                        </Button>
                        {draft.logoLightUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => updateDraft((p) => ({ ...p, logoLightUrl: '' }))}
                            disabled={
                              uploading.light ||
                              uploading.home ||
                              uploading.dark ||
                              uploading.visi ||
                              uploading.misi
                            }
                          >
                            Hapus
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </FormField>
                <FormField id="psp-logodarkupload" label="Upload Logo Dark">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <div
                      className="space-y-2"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    >
                      <Input
                        id={id}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={
                          uploading.dark ||
                          uploading.home ||
                          uploading.light ||
                          uploading.visi ||
                          uploading.misi
                        }
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
                        <Button
                          asChild
                          variant="outline"
                          disabled={
                            uploading.dark ||
                            uploading.home ||
                            uploading.light ||
                            uploading.visi ||
                            uploading.misi
                          }
                        >
                          <Label htmlFor={id} className="cursor-pointer">
                            {uploading.dark
                              ? 'Uploading...'
                              : draft.logoDarkUrl
                                ? 'Ganti Logo'
                                : 'Upload Logo'}
                          </Label>
                        </Button>
                        {draft.logoDarkUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => updateDraft((p) => ({ ...p, logoDarkUrl: '' }))}
                            disabled={
                              uploading.dark ||
                              uploading.home ||
                              uploading.light ||
                              uploading.visi ||
                              uploading.misi
                            }
                          >
                            Hapus
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </FormField>
              </div>
            </AdminContentTransition>

            <AdminCardActions>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsResetOpen(true)}
                disabled={saving}
                className="min-h-11 w-full sm:w-auto"
              >
                Reset
              </Button>
              <SubmitButton
                type="button"
                onClick={handleSave}
                disabled={!dirty}
                className="min-h-11 w-full sm:w-auto"
                isLoading={saving}
                label="Simpan"
                loadingLabel="Menyimpan…"
              />
            </AdminCardActions>
          </div>
        </CmsEditorLayout>
      </AdminCard>
    </AdminPageShell>
  );
}
