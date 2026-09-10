import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toastError, toastSuccess, toastSuccessMessage } from '@/lib/utils/toastMessage';
import { useAuthStore } from '@/stores/authStore';
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
import PublicSiteProfilePreview from '@/components/publicSiteAdmin/PublicSiteProfilePreview';
import { AlertTriangle, Globe, Info } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { CmsTabNav, type CmsTabItem } from '@/components/ui/CmsTabNav';
import { CmsEditorLayout } from '@/components/cms/CmsEditorLayout';
import { AdminContentTransition } from '@/components/admin/AdminContentTransition';
import { useFormDirtyGuard } from '@/hooks/useFormDirtyGuard';
import { LastSavedIndicator } from '@/components/admin/LastSavedIndicator';

type ProfileTab = 'identity' | 'home' | 'visimisi' | 'contact';

const PROFILE_TABS: readonly CmsTabItem<ProfileTab>[] = [
  { id: 'identity', label: 'Identitas' },
  { id: 'home', label: 'Beranda' },
  { id: 'visimisi', label: 'Visi & Misi' },
  { id: 'contact', label: 'Kontak & Sosial' },
];

export default function PublicSiteProfile() {
  const { user } = useAuthStore();
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
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  type SectionValidationError = { id: string; label: string; hint: string; tab: ProfileTab };
  const [validationErrors, setValidationErrors] = useState<SectionValidationError[]>([]);
  const updateDraft = (updater: React.SetStateAction<Draft>) => {
    setDirty(true);
    setValidationErrors([]);
    setDraft(updater);
  };

  const { confirmIfDirty } = useFormDirtyGuard(dirty);

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
      maxWidth: 1920,
      quality: 0.82,
    });
    const form = new FormData();
    form.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', form);
    return res.data.data.url as string;
  };

  const CMS_SECTIONS: readonly {
    id: string;
    label: string;
    tab: ProfileTab;
    validate: (d: Draft) => boolean;
    errorHint: (d: Draft) => string;
  }[] = [
    {
      id: 'identity',
      label: 'Identitas',
      tab: 'identity',
      validate: (d) => d.orgName.trim().length > 0,
      errorHint: () =>
        'Kolom "Nama Organisasi" tidak boleh kosong. Harus diisi minimal 1 karakter.',
    },
    {
      id: 'home',
      label: 'Beranda',
      tab: 'home',
      validate: (d) => d.heroSubtitle.trim().length > 0 || d.aboutTitle.trim().length > 0,
      errorHint: () =>
        'Tab Beranda: Minimal isi "Hero Subtitle" ATAU "Judul Tentang (About Title)". Keduanya tidak boleh kosong bersamaan.',
    },
    {
      id: 'homeCards',
      label: 'Kartu Beranda',
      tab: 'home',
      validate: () => true,
      errorHint: () => 'Kartu kiri & kanan bersifat opsional, selalu dianggap valid.',
    },
    {
      id: 'visimisi',
      label: 'Visi & Misi',
      tab: 'visimisi',
      validate: (d) => d.vision.trim().length > 0 || d.mission.trim().length > 0,
      errorHint: () =>
        'Tab Visi & Misi: Minimal isi kolom "Visi" ATAU "Misi". Keduanya tidak boleh kosong bersamaan.',
    },
    {
      id: 'contact',
      label: 'Kontak',
      tab: 'contact',
      validate: (d) =>
        d.email.trim().length > 0 || d.phone.trim().length > 0 || d.address.trim().length > 0,
      errorHint: () =>
        'Tab Kontak & Sosial: Minimal isi salah satu dari 3 kolom: "Alamat Email", "Nomor Telepon", atau "Alamat Kantor".',
    },
    {
      id: 'logo',
      label: 'Logo',
      tab: 'identity',
      validate: () => true,
      errorHint: () => 'Logo bersifat opsional, selalu dianggap valid.',
    },
  ] as const;

  const handleSave = async () => {
    setSaving(true);
    try {
      const sectionResults = CMS_SECTIONS.map((section) => {
        const ok = section.validate(draft);
        return {
          id: section.id,
          label: section.label,
          tab: section.tab,
          ok,
          hint: ok ? '' : section.errorHint(draft),
        };
      });

      const blockingErrors = sectionResults.filter(
        (r) => !r.ok && r.tab === profileTab
      ) as SectionValidationError[];

      if (blockingErrors.length > 0) {
        setValidationErrors(blockingErrors);
        const blockingList = blockingErrors
          .map((f, idx) => `${idx + 1}. [${f.label}] ${f.hint}`)
          .join('\n');
        const summary = `${blockingErrors.length} bagian di tab "${
          PROFILE_TABS.find((t) => t.id === profileTab)?.label ?? profileTab
        }" wajib diisi sebelum simpan:`;
        toastError(null, `${summary}\n${blockingList}`);
        return;
      }

      setValidationErrors([]);
      await api.put('/public-site/admin/profile', { data: draft });
      toastSuccess('Profil situs berhasil tersimpan.');
      setLastSavedAt(new Date());
      setDirty(false);
      mutate();
    } catch (e: any) {
      const structuredMsg = getErrorMessage(
        e,
        'Gagal menyimpan data profil ke server. Silakan coba lagi.'
      );
      toastError(e, structuredMsg);
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
              onChange={async (next) => {
                const ok = await confirmIfDirty();
                if (ok) setProfileTab(next);
              }}
              ariaLabel="Bagian profil"
            />

            {/* ── Inline Validation Errors Banner (BLOCKING: tab aktif only) ─ */}
            {validationErrors.length > 0 ? (
              <div
                role="alert"
                aria-live="polite"
                className="mt-5 rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-5 shadow-sm dark:border-red-900/60 dark:from-red-950/40 dark:to-rose-950/30"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                    <AlertTriangle size={22} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-red-900 dark:text-red-100">
                      Data di tab ini belum lengkap — {validationErrors.length} bagian wajib diisi
                      sebelum simpan
                    </h3>
                    <p className="mt-1 text-sm text-red-700/85 dark:text-red-200/85">
                      Lengkapi kolom di bawah lalu simpan kembali.
                    </p>
                    <ul className="mt-4 space-y-3">
                      {validationErrors.map((err) => {
                        const tabInfo = PROFILE_TABS.find((t) => t.id === err.tab);
                        return (
                          <li
                            key={err.id}
                            className="flex flex-wrap items-start gap-3 rounded-xl border border-red-100 bg-white/60 p-3 backdrop-blur-sm dark:border-red-900/30 dark:bg-black/20"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-700 dark:bg-red-900/50 dark:text-red-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                  Bagian {err.label}
                                </span>
                                {tabInfo ? (
                                  <span className="text-xs font-medium text-red-600/75 dark:text-red-300/75">
                                    (Tab: {tabInfo.label})
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm text-red-800/90 dark:text-red-100/90">
                                {err.hint}
                              </p>
                            </div>
                            {tabInfo && profileTab !== err.tab && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await confirmIfDirty();
                                  if (ok) {
                                    setProfileTab(err.tab);
                                  }
                                }}
                                className="inline-flex flex-none items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(220,38,38,0.28)] transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                              >
                                Langsung perbaiki
                                <span aria-hidden="true">→</span>
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

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
                            const inputEl = e.currentTarget;
                            const file = inputEl.files?.[0];
                            if (!file) return;
                            setUploading((x) => ({ ...x, home: true }));
                            try {
                              const url = await uploadImage(file);
                              updateDraft((p) => ({ ...p, homeImageUrl: url }));
                              toastSuccess('Upload foto anggota berhasil');
                            } catch (err: any) {
                              toastError(err, 'Gagal upload');
                            } finally {
                              setUploading((x) => ({ ...x, home: false }));
                              inputEl.value = '';
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
                          {draft.homeImageUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => updateDraft((p) => ({ ...p, homeImageUrl: '' }))}
                              disabled={
                                uploading.home ||
                                uploading.light ||
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
                      <div className="overflow-hidden rounded-xl border border-border bg-slate-50">
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
                            const inputEl = e.currentTarget;
                            const file = inputEl.files?.[0];
                            if (!file) return;
                            setUploading((x) => ({ ...x, visi: true }));
                            try {
                              const url = await uploadImage(file);
                              updateDraft((p) => ({ ...p, visiPhotoUrl: url }));
                              toastSuccess('Upload foto visi berhasil');
                            } catch (err: any) {
                              toastError(err, 'Gagal upload');
                            } finally {
                              setUploading((x) => ({ ...x, visi: false }));
                              inputEl.value = '';
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
                            const inputEl = e.currentTarget;
                            const file = inputEl.files?.[0];
                            if (!file) return;
                            setUploading((x) => ({ ...x, misi: true }));
                            try {
                              const url = await uploadImage(file);
                              updateDraft((p) => ({ ...p, misiPhotoUrl: url }));
                              toastSuccess('Upload foto misi berhasil');
                            } catch (err: any) {
                              toastError(err, 'Gagal upload');
                            } finally {
                              setUploading((x) => ({ ...x, misi: false }));
                              inputEl.value = '';
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
                          const inputEl = e.currentTarget;
                          const file = inputEl.files?.[0];
                          if (!file) return;
                          setUploading((x) => ({ ...x, light: true }));
                          try {
                            const url = await uploadImage(file);
                            updateDraft((p) => ({ ...p, logoLightUrl: url }));
                            toastSuccess('Upload logo light berhasil');
                          } catch (err: any) {
                            toastError(err, 'Gagal upload');
                          } finally {
                            setUploading((x) => ({ ...x, light: false }));
                            inputEl.value = '';
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
                          const inputEl = e.currentTarget;
                          const file = inputEl.files?.[0];
                          if (!file) return;
                          setUploading((x) => ({ ...x, dark: true }));
                          try {
                            const url = await uploadImage(file);
                            updateDraft((p) => ({ ...p, logoDarkUrl: url }));
                            toastSuccess('Upload logo dark berhasil');
                          } catch (err: any) {
                            toastError(err, 'Gagal upload');
                          } finally {
                            setUploading((x) => ({ ...x, dark: false }));
                            inputEl.value = '';
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

            <div className="flex flex-col-reverse gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <LastSavedIndicator lastSavedAt={lastSavedAt} isDirty={dirty} isSaving={saving} />
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
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
              </div>
            </div>
          </div>
        </CmsEditorLayout>
      </AdminCard>
    </AdminPageShell>
  );
}
