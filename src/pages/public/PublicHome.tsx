import { useEffect, useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { ArrowRight, GraduationCap, Lightbulb, PenLine, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicProgram } from '@/types/publicSite';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import { CabinetPeriodSwitcher } from '@/components/public/home/CabinetPeriodSwitcher';
import PublicCoverImage from '@/components/PublicCoverImage';
import PublicProgramCard from '@/components/PublicProgramCard';
import { PublicPageError } from '@/components/public/PublicPageError';
import { Skeleton } from '@/components/ui/skeleton';
import { hasText, showPublicSection } from '@/lib/utils/publicContent';
import { truncateText } from '@/lib/utils/utils';
import { BrandMark } from '@/components/public/home/BrandMark';
import { DivisionRail } from '@/components/public/home/DivisionRail';
import { HomeSectionTitle } from '@/components/public/home/HomeSectionTitle';
import { PublicSectionOrnament } from '@/components/public/PublicSectionOrnament';
import { isCoreStructureGroup } from '@/components/public/home/divisionUtils';
import { PublicHomeCmsHint } from '@/components/public/home/PublicHomeCmsHint';
import { normalizeYoutubeEmbedUrl } from '@/lib/media/normalizeYoutubeEmbedUrl';
import { optimizeCloudinaryUrl } from '@/lib/media/cloudinaryImage';
import { PublicSlowLoadingHint } from '@/components/public/PublicSlowLoadingHint';
import { PublicPageMeta } from '@/components/public/PublicPageMeta';
import { usePublicHomeData, isPublicProfileSparse } from '@/hooks/usePublicHomeData';
import { ensureHttpsUrl } from '@/lib/http/ensureHttpsUrl';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';

function PublicHomeSkeleton({
  showSlowHint,
  onRetry,
}: {
  showSlowHint: boolean;
  onRetry: () => void;
}) {
  const cards = Array.from({ length: 3 });
  return (
    <PublicLayout>
      <PublicLoadingOverlay show label="Memuat halaman publik..." />
      <div className="relative">
        <div>
          <section
            aria-label="Beranda organisasi"
            className="relative isolate min-h-[min(70vh,640px)] overflow-hidden bg-slate-950"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800" aria-hidden />
            <PublicEnter instant className="relative mx-auto flex min-h-[min(70vh,640px)] max-w-7xl flex-col justify-end px-4 pb-14 pt-24 sm:px-6">
              <div className="flex items-start gap-6">
                <div className="hidden size-20 shrink-0 sm:block">
                  <Skeleton className="size-20 rounded-2xl bg-white/15" />
                </div>
                <div className="w-full max-w-xl">
                  <div className="font-display text-4xl italic text-white/80 md:text-5xl">Kabinet</div>
                  <div
                    className="mt-2 space-y-3"
                    aria-busy="true"
                    aria-label="Memuat profil organisasi"
                  >
                    <Skeleton className="h-14 w-full max-w-md bg-white/20 md:h-16" />
                    <Skeleton className="h-4 w-40 bg-white/15" />
                    <Skeleton className="h-4 w-56 bg-white/10" />
                  </div>
                  {showSlowHint ? (
                    <div className="mt-5 max-w-md rounded-xl border border-white/15 bg-white/10 p-4">
                      <PublicSlowLoadingHint onRetry={onRetry} />
                    </div>
                  ) : null}
                </div>
              </div>
            </PublicEnter>
          </section>

          <section className="relative bg-white py-20">
            <PublicReveal className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-56" />
                  <Skeleton className="h-4 w-full max-w-lg" />
                  <Skeleton className="h-4 w-full max-w-md" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </div>
                <div className="aspect-video overflow-hidden rounded-3xl border border-black/10 bg-slate-50">
                  <Skeleton className="h-full w-full" />
                </div>
              </div>
            </PublicReveal>
          </section>

          <section className="relative bg-slate-50/55 py-20">
            <PublicReveal className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-9 w-64" />
                  <Skeleton className="h-4 w-96 max-w-full" />
                </div>
                <Skeleton className="h-11 w-40 rounded-xl" />
              </div>
              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {cards.map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)]"
                  >
                    <div className="aspect-[16/10] w-full bg-slate-100">
                      <Skeleton className="h-full w-full" />
                    </div>
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="mt-4 h-10 w-32 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </PublicReveal>
          </section>

          <section className="relative bg-white py-20">
            <PublicReveal className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-9 w-64" />
                  <Skeleton className="h-4 w-96 max-w-full" />
                </div>
                <Skeleton className="h-11 w-40 rounded-xl" />
              </div>
              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {cards.map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="mt-4 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-5/6" />
                    <Skeleton className="mt-6 h-10 w-32 rounded-xl" />
                  </div>
                ))}
              </div>
            </PublicReveal>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}

export default function PublicHome() {
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  const {
    profile: profileState,
    programs: programsState,
    structure: structureState,
    latest: latestState,
    recruitments: recruitmentsState,
    galleries: galleriesState,
    lombaPaged: lombaState,
  } = usePublicHomeData({ cabinetId: selectedCabinetId });

  const profile = profileState.data;
  const isLoadingProfile = profileState.isPending;
  const isProfileError = profileState.isError;
  const retryProfile = profileState.retry;
  const showProfileSlowHint = profileState.showSlowLoadingHint;

  const programs = Array.isArray(programsState.data) ? programsState.data : [];
  const isLoadingPrograms = programsState.isPending;
  const isProgramsError = programsState.isError;
  const retryPrograms = programsState.retry;

  useEffect(() => {
    const raw = profile?.home_image_url;
    if (!raw) return;
    const href = optimizeCloudinaryUrl(ensureHttpsUrl(raw), { width: 828 });
    const existing = document.querySelector('link[data-public-hero-preload]');
    if (existing?.getAttribute('href') === href) return;
    existing?.remove();
    if (document.head.querySelector(`link[rel="preload"][href="${CSS.escape(href)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    // Match <img> default (no CORS). Setting crossOrigin after href would fetch
    // no-cors then fail to match a CORS consumer — leave both unset for display-only.
    link.referrerPolicy = 'no-referrer';
    link.setAttribute('data-public-hero-preload', '1');
    link.href = href;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [profile?.home_image_url]);

  const structureData = structureState.data;
  const allCabinets = useMemo(() => structureData?.allCabinets ?? [], [structureData]);
  // API returns the requested (or active) cabinet tree in `cabinet`.
  const selectedCabinet = structureData?.cabinet ?? null;
  const structure = useMemo(
    () => selectedCabinet?.groups ?? structureData?.data ?? [],
    [selectedCabinet, structureData]
  );
  const isLoadingStructure = structureState.isPending;
  const latest = latestState.data;
  const isLoadingLatest = latestState.isPending;
  const recruitments = Array.isArray(recruitmentsState.data) ? recruitmentsState.data : [];
  const isLoadingRecruitments = recruitmentsState.isPending;
  const galleries = Array.isArray(galleriesState.data) ? galleriesState.data : [];
  const isLoadingGalleries = galleriesState.isPending;
  const lombaPaged = lombaState.data;
  const isLoadingLomba = lombaState.isPending;

  const orgName = profile?.org_name ?? '';
  const campusName = profile?.campus_name ?? '';
  const kabinetName = selectedCabinet?.name ?? profile?.kabinet_name ?? '';
  const kabinetPeriod = selectedCabinet?.period ?? profile?.kabinet_period ?? '';
  const heroSubtitle = profile?.hero_subtitle ?? '';
  const youtubeEmbedUrl = profile?.youtube_embed_url ?? '';
  const videoSrc = normalizeYoutubeEmbedUrl(youtubeEmbedUrl);
  const aboutTitle = profile?.about_title ?? '';
  const aboutContent = profile?.about_content ?? '';
  const aboutParagraphs = aboutContent.split('\n').flatMap((x) => {
    const result = x.trim()
    return result ? [result] : []
  })
  const homeCardLeftTitle = profile?.home_card_left_title ?? '';
  const homeCardLeftBody = profile?.home_card_left_body ?? '';
  const homeCardRightTitle = profile?.home_card_right_title ?? '';
  const homeCardRightBody = profile?.home_card_right_body ?? '';
  const vision = profile?.vision ?? '';
  const mission = profile?.mission ?? '';
  const missionItems = mission.split('\n').flatMap((x) => {
    const result = x.trim()
    return result ? [result] : []
  })
  const visiPhotoUrl = profile?.visi_photo_url ?? '';
  const visiName = profile?.visi_name ?? '';
  const visiRole = profile?.visi_role ?? '';
  const misiPhotoUrl = profile?.misi_photo_url ?? '';
  const misiName = profile?.misi_name ?? '';
  const misiRole = profile?.misi_role ?? '';

  const homeMetaDescription = useMemo(() => {
    const org = (orgName || 'HM SDP Undiksha').trim();
    const base = profile?.about_content?.trim();
    if (base && base.length >= 40) {
      return truncateText(base, 160);
    }
    const kabinet = [kabinetName, kabinetPeriod].filter(Boolean).join(' · ');
    return `Portal informasi ${org}${kabinet ? ` (${kabinet})` : ''}. Jelajahi struktur organisasi, program kerja, berita, galeri, dan informasi rekrutmen.`;
  }, [orgName, profile?.about_content, kabinetName, kabinetPeriod]);

  const coreMembers = useMemo(() => {
    const coreGroups = structure.filter(
      (g: any) => Boolean(g.is_core) || isCoreStructureGroup(g.title),
    );
    return coreGroups.flatMap((g: any) => g.members ?? []);
  }, [structure]);

  // T4 Dosen Pendamping / Pembimbing advisor extraction
  const isAdvisorByTitle = (title: string) => {
    const t = String(title ?? '').toLowerCase();
    return t.includes('dosen') || t.includes('pembimbing') || t.includes('pembina');
  };
  const advisorGroups = useMemo(
    () => structure.filter((g: any) => isAdvisorByTitle(g.title)),
    [structure],
  );
  const advisorPeople = useMemo(
    () => advisorGroups.flatMap((g: any) => (g.members ?? []) as any[]),
    [advisorGroups],
  );
  const displayAdvisorPeople = advisorPeople;

  const ketua = useMemo(() => {
    const k = coreMembers.find((m: any) => String(m.role ?? '').toLowerCase().includes('ketua') && !String(m.role ?? '').toLowerCase().includes('wakil'));
    return k ?? coreMembers.find((m: any) => String(m.role ?? '').toLowerCase().includes('ketua')) ?? null;
  }, [coreMembers]);

  const wakil = useMemo(() => {
    return coreMembers.find((m: any) => String(m.role ?? '').toLowerCase().includes('wakil')) ?? null;
  }, [coreMembers]);

  if (isProfileError && !profile) {
    return (
      <PublicPageError
        title="Beranda sedang tidak tersedia"
        error={profileState.swr.error}
        onRetry={retryProfile}
        message="Beranda belum dapat dimuat karena layanan sedang mengalami gangguan sementara. Silakan coba lagi dalam beberapa saat."
      />
    );
  }

  if (isLoadingProfile && !profile) {
    return <PublicHomeSkeleton showSlowHint={showProfileSlowHint} onRetry={retryProfile} />;
  }

  const logoSrc = profile?.logo_light_url ?? '';
  const posts = latest?.items ?? [];
  const lomba = lombaPaged?.items ?? [];
  const heroKabinetName = kabinetName || '';
  const showAboutVideoSection = Boolean(videoSrc) || aboutParagraphs.length > 0;
  const showVisiMisiSection = showPublicSection(
    vision,
    missionItems.join(' '),
    homeCardLeftBody,
    homeCardRightBody,
    aboutParagraphs.join(' '),
  );

  return (
    <PublicLayout>
      <PublicPageMeta
        title={orgName ? `${orgName} · Portal Informasi` : undefined}
        description={homeMetaDescription}
        path="/"
      />
      {!isLoadingProfile && isPublicProfileSparse(profile) ? <PublicHomeCmsHint /> : null}
      <div className="relative">
        <div>
          {/*
            Hero: full-bleed plane (not HMTI two-column card clone).
            Brand kabinet dominates; photo is atmosphere, not a side panel.
          */}
          <section
            aria-label="Beranda organisasi"
            className="relative isolate overflow-hidden bg-slate-950 text-white"
          >
            <div className="absolute inset-0" aria-hidden="true">
              {isLoadingProfile ? (
                <Skeleton className="h-full w-full rounded-none bg-slate-800" />
              ) : profile?.home_image_url ? (
                <PublicCoverImage
                  url={profile.home_image_url}
                  alt=""
                  priority
                  displayWidth={1600}
                  imgClassName="object-cover object-center opacity-70"
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(ellipse_at_30%_20%,var(--public-primary)_0%,transparent_55%),linear-gradient(160deg,#0f172a,#1e293b)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/50" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
              <div className="pointer-events-none absolute -left-24 top-1/4 size-[28rem] rounded-full bg-[var(--public-primary)]/25 blur-3xl" />
            </div>

            <PublicEnter
              instant
              className="relative mx-auto flex min-h-[min(76svh,720px)] max-w-7xl flex-col justify-center px-5 py-16 sm:px-6 sm:py-24"
            >
              <div className="max-w-3xl">
                <div className="flex items-center gap-4">
                  <BrandMark
                    className="hidden size-16 shrink-0 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/25 sm:grid sm:size-20"
                    src={logoSrc}
                    name={orgName || campusName}
                  />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
                    {orgName || 'Organisasi'}
                    {campusName ? ` · ${campusName}` : ''}
                  </p>
                </div>

                <h1 className="mt-6 tracking-tight">
                  <span className="block font-display text-4xl italic text-white/90 md:text-5xl lg:text-6xl">
                    Kabinet
                  </span>
                  {heroKabinetName ? (
                    <span className="mt-2 block break-words text-4xl font-extrabold uppercase leading-[1.08] text-white sm:text-6xl lg:text-7xl">
                      {heroKabinetName}
                    </span>
                  ) : null}
                </h1>

                {isLoadingProfile ? (
                  <div className="mt-6 space-y-3" aria-busy="true" aria-label="Memuat profil organisasi">
                    <Skeleton className="h-4 w-40 bg-white/20" />
                    <Skeleton className="h-4 w-72 max-w-full bg-white/15" />
                  </div>
                ) : showProfileSlowHint ? (
                  <div className="mt-6 max-w-md rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <PublicSlowLoadingHint onRetry={retryProfile} />
                  </div>
                ) : (
                  <>
                    {kabinetPeriod ? (
                      <p className="mt-4 text-sm font-semibold tracking-[0.18em] text-white/75 uppercase">
                        {kabinetPeriod}
                      </p>
                    ) : null}
                    {heroSubtitle ? (
                      <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
                        {heroSubtitle}
                      </p>
                    ) : null}
                  </>
                )}

                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <Link
                    to="/struktur-organisasi"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Struktur Organisasi
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <Link
                    to="/program-kerja"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    Program Kerja
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </PublicEnter>
          </section>

          {allCabinets.length > 1 && (
            <section className="relative bg-white py-6 sm:py-8">
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <CabinetPeriodSwitcher
                  cabinets={allCabinets}
                  selectedId={selectedCabinet?.id}
                  onSelect={setSelectedCabinetId}
                />

                {selectedCabinet?.tagline || selectedCabinet?.motto ? (
                  <div
                    key={`tagline-${selectedCabinet?.id ?? 'default'}`}
                    className="mx-auto mt-7 max-w-2xl text-center animate-[taglineFadeIn_520ms_ease-out_both]"
                  >
                    {selectedCabinet?.tagline ? (
                      <p className="font-display text-[1.65rem] italic leading-[1.15] tracking-tight text-slate-900 sm:text-3xl md:text-[2.15rem]">
                        <span className="text-[var(--public-primary)]/55" aria-hidden>
                          “
                        </span>
                        {String(selectedCabinet.tagline)}
                        <span className="text-[var(--public-primary)]/55" aria-hidden>
                          ”
                        </span>
                      </p>
                    ) : null}
                    {selectedCabinet?.motto ? (
                      <p className="mx-auto mt-4 max-w-xl text-[11px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-[var(--public-primary)] sm:text-xs">
                        {String(selectedCabinet.motto)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {/* T4 — DOSEN PENDAMPING / PEMBIMBING Section */}
          {displayAdvisorPeople.length > 0 && (
          <section className="relative bg-white py-14 overflow-hidden" aria-label="Dosen pembimbing kabinet periode ini">
            <PublicReveal className="relative mx-auto max-w-7xl px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--public-primary)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">
                  <GraduationCap size={16} aria-hidden="true" />
                  Dosen Pembimbing
                </div>
                <div className="mt-5">
                  <h2 className="text-3xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-4xl">
                    Dosen Pendamping
                  </h2>
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    Pembina akademik dan penasihat organisasi periode {kabinetPeriod || 'ini'}.
                  </p>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-x-10 gap-y-12 sm:gap-x-14 lg:gap-x-16">
                {displayAdvisorPeople.map((p: any) => {
                  const name = p.name ?? '-';
                  const role = p.role ?? 'Pembimbing';
                  const initial = String(name).trim().slice(0, 1).toUpperCase() || 'D';
                  return (
                    <div
                      key={p.id ?? `${name}-${role}`}
                      className="flex w-full max-w-[240px] shrink-0 flex-col items-center text-center break-words sm:max-w-[280px]"
                    >
                      <div className="relative shrink-0 overflow-hidden rounded-full border-[3px] border-[var(--public-primary)] bg-slate-100 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] h-48 w-48 sm:h-56 sm:w-56">
                        {p.photo_url ? (
                          <PublicCoverImage url={p.photo_url} alt={name} imgClassName="object-cover h-full w-full" variant="avatar" displayWidth={448} />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200">
                            <div className="grid size-20 place-items-center rounded-2xl bg-white/85 text-5xl font-extrabold text-[var(--public-primary)] ring-1 ring-black/10">
                              {initial}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 w-full text-base font-extrabold leading-snug tracking-tight text-slate-900 hyphens-auto">
                        {name}
                      </div>
                      <div className="mt-1 w-full text-sm font-semibold leading-snug text-muted-foreground hyphens-auto">
                        {role}
                      </div>
                      {(p.nip || p.nidn) ? (
                        <div className="mt-1 w-full text-xs text-muted-foreground/80">
                          {p.nip ? `NIP. ${p.nip}` : null}
                          {p.nip && p.nidn ? ' · ' : null}
                          {p.nidn ? `NIDN. ${p.nidn}` : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </PublicReveal>
          </section>
          )}

          {showAboutVideoSection ? (
          <section id="tentang-kami" aria-label="Tentang kami" className="relative overflow-hidden bg-slate-50">
            <PublicReveal className={`relative mx-auto grid max-w-7xl items-start gap-8 px-5 py-12 sm:px-6 md:gap-12 md:py-20 ${videoSrc && aboutParagraphs.length ? 'md:grid-cols-2' : ''}`}>
              {videoSrc ? (
              <div className="relative aspect-video w-full self-start overflow-hidden rounded-2xl border border-black/10 bg-slate-900 shadow-lg">
                    <iframe
                      className="absolute inset-0 block h-full w-full border-0"
                      src={videoSrc}
                      title="Video Profil"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
              </div>
              ) : null}

              {aboutParagraphs.length ? (
              <div className="text-slate-800">
                <HomeSectionTitle
                  align="left"
                  eyebrow="Profil"
                  lead="Tentang"
                  accent="Kami"
                  support={aboutTitle && aboutTitle !== 'Tentang' ? aboutTitle : undefined}
                  className="mb-6"
                />
                  <div className="max-w-prose space-y-4 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
                    {aboutParagraphs.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
              </div>
              ) : null}
            </PublicReveal>
          </section>
          ) : null}

          {showVisiMisiSection ? (
          <section className="relative overflow-hidden bg-white py-14">
            <PublicReveal className="relative mx-auto max-w-7xl px-4 sm:px-6">
              <div className="mx-auto max-w-5xl text-center">
                <div className="mx-auto flex max-w-xl items-center justify-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <div className="grid size-10 place-items-center rounded-full bg-[var(--public-primary)]/10 text-[var(--public-primary)]">
                    <Lightbulb size={18} />
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{orgName || 'Profil Organisasi'}</div>
                <div className="mx-auto mt-8 grid max-w-5xl gap-6 text-left md:grid-cols-2">
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-[0_18px_40px_-42px_rgba(15,23,42,0.30)]">
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {homeCardLeftTitle || `Tentang ${orgName || 'Organisasi'}`}
                    </div>
                    <div className="mt-3 text-sm leading-relaxed text-slate-700">
                      {homeCardLeftBody ||
                        aboutParagraphs[0] ||
                        `Organisasi ini menjadi ruang tumbuh mahasiswa untuk berkarya, berjejaring, dan meningkatkan kompetensi melalui program yang relevan dan berdampak.`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-[0_18px_40px_-42px_rgba(15,23,42,0.30)]">
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {homeCardRightTitle || `Kepengurusan ${kabinetPeriod || 'Tahun Ini'}`}
                    </div>
                    <div className="mt-3 text-sm leading-relaxed text-slate-700">
                      {homeCardRightBody ||
                        aboutParagraphs[1] ||
                        `Kabinet periode ${kabinetPeriod || 'ini'} berkomitmen menghadirkan layanan organisasi yang rapi, kolaboratif, dan adaptif untuk menjawab kebutuhan anggota.`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-auto mt-14 max-w-5xl space-y-14">
                <div className="grid gap-10 md:grid-cols-[1fr_360px] md:items-center lg:grid-cols-[1fr_420px]">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">
                      <PenLine size={16} />
                      Visi
                    </div>
                    <div className="mt-4 font-display text-4xl italic tracking-tight text-slate-900 sm:text-5xl">
                      Visi {orgName || 'Organisasi'}
                    </div>
                    {hasText(vision) ? (
                    <div className="mt-5 whitespace-pre-wrap text-[17px] leading-relaxed text-slate-700 sm:text-[18px]">
                      {vision}
                    </div>
                    ) : null}
                  </div>
                  <div className="relative mx-auto w-full max-w-[360px] md:mx-0 md:max-w-none md:justify-self-end">
                    <div className="relative overflow-hidden rounded-3xl bg-slate-50 shadow-[0_22px_60px_-52px_rgba(15,23,42,0.55)]">
                      <div className="aspect-square w-full">
                        <PublicCoverImage
                          url={visiPhotoUrl || ketua?.photo_url || profile?.home_image_url}
                          alt={visiName || ketua?.name || 'Visi'}
                          imgClassName="object-cover"
                          displayWidth={420}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-px w-full bg-[var(--public-primary)]" />
                      <div className="mt-3 text-center">
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {visiRole || ketua?.role || 'Ketua'}
                        </div>
                        <div className="mt-1 text-sm font-extrabold tracking-tight text-slate-900">{visiName || ketua?.name || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-10 md:grid-cols-[360px_1fr] md:items-center lg:grid-cols-[420px_1fr]">
                  <div className="order-2 md:order-1">
                    <div className="relative mx-auto w-full max-w-[360px] md:mx-0 md:max-w-none md:justify-self-start">
                      <div className="relative overflow-hidden rounded-3xl bg-slate-50 shadow-[0_22px_60px_-52px_rgba(15,23,42,0.55)]">
                        <div className="aspect-square w-full">
                          <PublicCoverImage
                            url={misiPhotoUrl || wakil?.photo_url || profile?.home_image_url}
                            alt={misiName || wakil?.name || 'Misi'}
                            imgClassName="object-cover"
                            displayWidth={420}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="h-px w-full bg-[var(--public-primary)]" />
                        <div className="mt-3 text-center">
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                            {misiRole || wakil?.role || 'Wakil Ketua'}
                          </div>
                          <div className="mt-1 text-sm font-extrabold tracking-tight text-slate-900">{misiName || wakil?.name || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="order-1 md:order-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">
                      <Users size={16} />
                      Misi
                    </div>
                    <div className="mt-4 font-display text-4xl italic tracking-tight text-slate-900 sm:text-5xl">
                      Misi {orgName || 'Organisasi'}
                    </div>
                    {missionItems.length ? (
                      <div className="mt-6 space-y-5">
                        {missionItems.map((item, idx) => (
                          <div key={`${idx}-${item}`} className="flex gap-4">
                            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-black/10 bg-white text-sm font-extrabold text-[var(--public-primary)]">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 text-[17px] leading-relaxed text-slate-700 sm:text-[18px]">{item}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </PublicReveal>
          </section>
          ) : null}

          <section className="relative bg-slate-50/55 py-20">
        <PublicReveal className="mx-auto max-w-7xl px-4 text-center sm:px-6">

          <HomeSectionTitle
            eyebrow="Kegiatan"
            lead="Program"
            accent="Kerja"
            support="Ringkasan program kerja yang sedang berjalan dan yang akan dilaksanakan."
          />
          <PublicSectionOrnament wide className="mx-auto mt-5" />

          <div className="relative mx-auto mt-10 max-w-5xl">
            {isLoadingPrograms ? (
              <div className="h-40" aria-busy="true" />
            ) : isProgramsError ? (
              <div className="relative overflow-hidden rounded-2xl border border-dashed border-red-200/80 bg-white/70 p-6 text-left sm:p-10">
                <div className="relative">
                  <div className="text-base font-extrabold tracking-tight text-slate-900">
                    Gagal memuat program kerja
                  </div>
                  <div className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Daftar program kerja belum dapat dimuat saat ini. Silakan coba lagi beberapa saat lagi.
                  </div>
                  <button
                    type="button"
                    onClick={retryPrograms}
                    className="mt-4 inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40"
                  >
                    Muat ulang program
                  </button>
                </div>
              </div>
            ) : programs.length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-muted-foreground sm:p-10">
                <div className="text-base font-extrabold tracking-tight text-slate-900">Belum ada program kerja</div>
                <div className="mt-2 max-w-2xl">
                  Program kerja yang dipublikasikan akan muncul di sini. Admin bisa menambahkannya dari menu Konten Website.
                </div>
              </div>
            ) : (
              (() => {
                const shown = programs.slice(0, 3);
                const count = shown.length;
                const gridClass =
                  count <= 1
                    ? 'grid gap-5 max-w-xl mx-auto'
                    : count === 2
                      ? 'grid gap-5 max-w-5xl mx-auto sm:grid-cols-2'
                      : 'grid gap-5 md:grid-cols-3';
                return (
                  <div className={gridClass}>
                    {shown.map((program: PublicProgram, idx: number) => (
                      <PublicProgramCard key={program.id} program={program} index={idx} />
                    ))}
                  </div>
                );
              })()
            )}
          </div>

          <div className="mt-10">
            <Link
              to="/program-kerja"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--public-primary)] px-10 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] transition hover:brightness-110"
            >
              Lihat Semua Program Kerja
            </Link>
          </div>
        </PublicReveal>
      </section>

      <section className="relative bg-white py-14">
        <PublicReveal className="mx-auto max-w-7xl px-4 sm:px-6" shiftY={0}>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="font-display text-5xl italic tracking-tight text-slate-900 md:text-6xl">Open</div>
              <div className="-mt-2 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-6xl">Recruitment</div>
              <div className="mt-3 max-w-xl text-sm text-slate-700">
                Informasi pendaftaran, poster, dan narahubung. Cek rekrutmen yang sedang dibuka.
              </div>
            </div>
            <Link
              to="/open-recruitment"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40"
            >
              Lihat Semua
              <ArrowRight size={18} />
            </Link>
          </div>

          {isLoadingRecruitments ? (
            <div className="mt-10 h-40" />
          ) : recruitments.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-muted-foreground">
              Belum ada open recruitment yang dipublikasikan.
            </div>
          ) : (
            (() => {
              const shown = recruitments.slice(0, 3);
              const count = shown.length;
              const gridClass =
                count <= 1
                  ? 'mt-10 grid gap-6 max-w-xl mx-auto'
                  : count === 2
                    ? 'mt-10 grid gap-6 max-w-5xl mx-auto sm:grid-cols-2'
                    : 'mt-10 grid gap-6 md:grid-cols-3';
              return (
                <div className={gridClass}>
                  {shown.map((r) => {
                    const joinUrl = ensureHttpsUrl(r.form_url);
                    const plainDesc = r.description
                      ? String(r.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                      : '';
                    return (
                      <article
                        key={r.id}
                        className="group flex h-full flex-col border border-black/10 bg-white"
                      >
                        <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                          <PublicCoverImage
                            url={r.poster_image_url}
                            alt={r.title}
                            imgClassName="object-cover transition duration-500 group-hover:scale-[1.02]"
                          />
                        </div>
                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {r.date_range ?? '-'}
                          </p>
                          <h3 className="mt-1.5 text-base font-bold leading-snug tracking-tight text-slate-900 line-clamp-2 sm:text-lg">
                            {r.title}
                          </h3>
                          <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-2">
                            {plainDesc || 'Informasi singkat belum tersedia.'}
                          </p>
                          <div className="mt-4 flex items-center gap-3 border-t border-black/5 pt-3">
                            <Link
                              to="/open-recruitment"
                              className="text-sm font-semibold text-slate-700 transition hover:text-[var(--public-primary)]"
                            >
                              Detail
                            </Link>
                            {joinUrl ? (
                              <a
                                href={joinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-[var(--public-primary)] transition hover:brightness-110"
                              >
                                Daftar
                                <ArrowRight size={14} />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              );
            })()
          )}
        </PublicReveal>
      </section>

      {(isLoadingStructure || structure.length > 0) ? (
      <section className="relative bg-slate-50/55 py-10 sm:py-12">
        <PublicReveal eager className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6">
          <HomeSectionTitle
            eyebrow="Kepengurusan"
            lead="Susunan"
            accent="Fungsionaris"
          />
          <PublicSectionOrnament wide className="mx-auto mt-4" />

          {isLoadingStructure ? (
            <div className="mt-5 h-40" aria-busy="true" />
          ) : (
            (() => {
              const ordered = structure
                .slice()
                .sort((a: any, b: any) => (Number(a.sort_order ?? 999) || 999) - (Number(b.sort_order ?? 999) || 999));
              const core = ordered.filter(
                (g: any) =>
                  Boolean((g as { is_core?: boolean }).is_core) ||
                  isCoreStructureGroup(g.title) ||
                  (Number(g.sort_order ?? 999) || 999) === 0,
              );
              const coreIds = new Set(core.map((g: any) => g.id));
              const support = ordered.filter((g: any) => !coreIds.has(g.id));
              return (
                <div className="mt-4 min-w-0 space-y-10 sm:mt-5 sm:space-y-12">
                  {core.length ? <DivisionRail groups={core} centerWhenFits /> : null}
                  {support.length ? (
                    <DivisionRail label="Divisi Pendukung" groups={support} />
                  ) : null}
                </div>
              );
            })()
          )}

          <div className="mt-10 flex justify-center">
            <Link
              to="/struktur-organisasi"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-8 py-3 text-sm font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40"
            >
              Lihat Struktur Organisasi
              <ArrowRight size={18} />
            </Link>
          </div>
        </PublicReveal>
      </section>
      ) : null}

      <section className="relative bg-white py-20">
        <PublicReveal className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <HomeSectionTitle
              align="left"
              eyebrow="Kompetisi"
              lead="Informasi"
              accent="Lomba"
              support="Kumpulan informasi lomba yang sedang dibuka dan mendekati tenggat."
            />
            <Link
              to="/informasi-lomba"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40"
            >
              Lihat Semua
              <ArrowRight size={18} />
            </Link>
          </div>

          {isLoadingLomba ? (
            <div className="mt-10 h-40" />
          ) : lomba.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-muted-foreground">
              Belum ada informasi lomba yang dipublikasikan.
            </div>
          ) : (
            (() => {
              const shown = lomba.slice(0, 6);
              const count = shown.length;
              const gridClass =
                count <= 1 ? 'mt-10 grid gap-6 max-w-xl mx-auto' : 'mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3';
              return (
                <div className={gridClass}>
                  {shown.map((l) => (
                    <Link
                      key={l.id}
                      to="/informasi-lomba"
                      className="group flex h-full flex-col border border-black/10 bg-white transition hover:border-[var(--public-primary)]/40"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                        <PublicCoverImage
                          url={l.cover_image_url}
                          alt={l.title}
                          imgClassName="object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <h3 className="text-base font-bold leading-snug tracking-tight text-slate-900 line-clamp-2 sm:text-lg">
                          {l.title}
                        </h3>
                        <p className="mt-1.5 text-xs font-medium text-slate-500">
                          {l.date_label ? `Batas: ${l.date_label}` : 'Batas pendaftaran belum diumumkan'}
                        </p>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-2">
                          {l.excerpt || 'Ringkasan belum tersedia.'}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--public-primary)]">
                          Lihat detail
                          <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })()
          )}
        </PublicReveal>
      </section>

      <section className="relative bg-slate-50/55 py-20">
        <PublicReveal className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="font-display text-5xl italic tracking-tight text-slate-900 md:text-6xl">Galeri</div>
              <div className="-mt-2 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-6xl">Kegiatan</div>
              <div className="mt-3 max-w-xl text-sm text-slate-700">
                Dokumentasi kegiatan dalam bentuk album dan foto pilihan.
              </div>
            </div>
            <Link
              to="/galeri"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40"
            >
              Lihat Semua
              <ArrowRight size={18} />
            </Link>
          </div>

          {isLoadingGalleries ? (
            <div className="mt-10 h-40" />
          ) : galleries.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-muted-foreground">
              Belum ada album galeri yang dipublikasikan.
            </div>
          ) : (
            (() => {
              const shown = galleries.slice(0, 3);
              const count = shown.length;
              const gridClass =
                count <= 1
                  ? 'mt-10 grid gap-6 max-w-3xl mx-auto'
                  : count === 2
                    ? 'mt-10 grid gap-6 max-w-5xl mx-auto sm:grid-cols-2'
                    : 'mt-10 grid gap-6 md:grid-cols-3';
              return (
                <div className={gridClass}>
                  {shown.map((a) => (
                    <Link
                      key={a.id}
                      to="/galeri"
                      className="group flex h-full flex-col border border-black/10 bg-white transition hover:border-[var(--public-primary)]/40"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                        <PublicCoverImage
                          url={a.items?.[0]?.image_url}
                          alt={a.title}
                          imgClassName="object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="min-w-0 text-base font-bold tracking-tight text-slate-900 line-clamp-1 sm:text-lg">
                            {a.title}
                          </h3>
                          <span className="shrink-0 text-xs font-medium text-slate-500">
                            {a.item_count ?? a.items?.length ?? 0} foto
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-2">
                          {a.description || 'Dokumentasi akan ditampilkan setelah diisi.'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })()
          )}
        </PublicReveal>
      </section>

      <section className="relative bg-white py-20">
        <PublicReveal className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="font-display text-5xl italic tracking-tight text-slate-900 md:text-6xl">Berita</div>
              <div className="-mt-2 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-6xl">Terbaru</div>
              <div className="mt-3 max-w-xl text-sm text-slate-700">
                Update kegiatan, prestasi, dan info kampus yang relevan buat kamu.
              </div>
            </div>
            <Link
              to="/berita"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40"
            >
              Lihat Semua
              <ArrowRight size={18} />
            </Link>
          </div>

          {isLoadingLatest ? (
            <div className="mt-10 h-40" />
          ) : posts.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-muted-foreground">
              Belum ada berita yang dipublikasikan.
            </div>
          ) : (
            (() => {
              const shown = posts.slice(0, 3);
              const count = shown.length;
              const gridClass =
                count <= 1
                  ? 'mt-10 grid gap-6 max-w-3xl mx-auto'
                  : count === 2
                    ? 'mt-10 grid gap-6 max-w-5xl mx-auto sm:grid-cols-2'
                    : 'mt-10 grid gap-6 md:grid-cols-3';
              return (
                <div className={gridClass}>
                  {shown.map((p) => (
                    <Link
                      key={p.id}
                      to={`/berita/${p.slug}`}
                      className="group flex h-full flex-col border border-black/10 bg-white transition hover:border-[var(--public-primary)]/40"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                        <PublicCoverImage
                          url={p.cover_image_url}
                          alt={p.title}
                          imgClassName="object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {p.category?.name ?? 'Berita'}
                          {p.date_label ? ` · ${p.date_label}` : ''}
                        </p>
                        <h3 className="mt-1.5 text-base font-bold leading-snug tracking-tight text-slate-900 line-clamp-2 sm:text-lg">
                          {p.title}
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-2">
                          {p.excerpt || 'Ringkasan belum tersedia.'}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--public-primary)]">
                          Baca
                          <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })()
          )}
            </PublicReveal>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
