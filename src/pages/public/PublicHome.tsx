import React, { useMemo } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { ArrowRight, Lightbulb, PenLine, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicPost, PublicProgram, PublicRecruitment } from '@/types/publicSite';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicCoverImage from '@/components/PublicCoverImage';
import PublicProgramCard from '@/components/PublicProgramCard';
import { PublicPageError } from '@/components/public/PublicPageError';
import { Skeleton } from '@/components/ui/skeleton';
import { hasText, showPublicSection } from '@/lib/utils/publicContent';
import { BrandMark } from '@/components/public/home/BrandMark';
import { DivisionRail } from '@/components/public/home/DivisionRail';
import { isCoreStructureGroup } from '@/components/public/home/divisionUtils';
import { PublicHomeCmsHint } from '@/components/public/home/PublicHomeCmsHint';
import { normalizeYoutubeEmbedUrl } from '@/lib/media/normalizeYoutubeEmbedUrl';
import { PublicSlowLoadingHint } from '@/components/public/PublicSlowLoadingHint';
import { usePublicHomeData, isPublicProfileSparse } from '@/hooks/usePublicHomeData';
export default function PublicHome() {
  const {
    profile: profileState,
    programs: programsState,
    structure: structureState,
    latest: latestState,
    recruitments: recruitmentsState,
    galleries: galleriesState,
    lombaPaged: lombaState,
  } = usePublicHomeData();

  const profile = profileState.data;
  const isLoadingProfile = profileState.isPending;
  const isProfileError = profileState.isError;
  const retryProfile = profileState.retry;
  const showProfileSlowHint = profileState.showSlowLoadingHint;

  const programs = programsState.data ?? [];
  const isLoadingPrograms = programsState.isPending;
  const structure = structureState.data ?? [];
  const isLoadingStructure = structureState.isPending;
  const latest = latestState.data;
  const isLoadingLatest = latestState.isPending;
  const recruitments = recruitmentsState.data ?? [];
  const isLoadingRecruitments = recruitmentsState.isPending;
  const galleries = galleriesState.data ?? [];
  const isLoadingGalleries = galleriesState.isPending;
  const lombaPaged = lombaState.data;
  const isLoadingLomba = lombaState.isPending;

  const orgName = profile?.org_name ?? '';
  const campusName = profile?.campus_name ?? '';
  const kabinetName = profile?.kabinet_name ?? '';
  const kabinetPeriod = profile?.kabinet_period ?? '';
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

  const coreMembers = useMemo(() => {
    const coreGroups = structure.filter(
      (g) => Boolean((g as { is_core?: boolean }).is_core) || isCoreStructureGroup(g.title),
    );
    return coreGroups.flatMap((g) => (g.members ?? []) as any[]);
  }, [structure]);

  const ketua = useMemo(() => {
    const k = coreMembers.find((m) => String(m.role ?? '').toLowerCase().includes('ketua') && !String(m.role ?? '').toLowerCase().includes('wakil'));
    return k ?? coreMembers.find((m) => String(m.role ?? '').toLowerCase().includes('ketua')) ?? null;
  }, [coreMembers]);

  const wakil = useMemo(() => {
    return coreMembers.find((m) => String(m.role ?? '').toLowerCase().includes('wakil')) ?? null;
  }, [coreMembers]);

  if (isProfileError && !profile) {
    return <PublicPageError title="Gagal memuat beranda" error={profileState.swr.error} onRetry={retryProfile} />;
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
      {!isLoadingProfile && isPublicProfileSparse(profile) ? <PublicHomeCmsHint /> : null}
      <div className="relative">
        <div>
          <section
            aria-label="Beranda organisasi"
            className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_50%),radial-gradient(circle_at_70%_10%,rgba(59,130,246,0.14),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.02),transparent)]"
          >
            <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_15%,rgba(37,99,235,0.10),transparent_56%),radial-gradient(circle_at_78%_10%,rgba(56,189,248,0.08),transparent_60%)]" />
            <PublicEnter instant className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
              <div className="flex items-start gap-6">
                <BrandMark className="hidden size-28 shrink-0 sm:block" src={logoSrc} name={orgName || campusName} />
                <div>
                  <div className="font-display text-4xl italic tracking-tight text-slate-900 md:text-5xl">Kabinet</div>
                  {isLoadingProfile ? (
                    <div className="mt-2 space-y-3" aria-busy="true" aria-label="Memuat profil organisasi">
                      <Skeleton className="h-14 w-full max-w-md md:h-16" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ) : showProfileSlowHint ? (
                    <div className="mt-4 max-w-md">
                      <PublicSlowLoadingHint onRetry={retryProfile} />
                    </div>
                  ) : (
                    <>
                      {heroKabinetName ? (
                        <div className="mt-1 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-7xl">
                          {heroKabinetName}
                        </div>
                      ) : null}
                      {kabinetPeriod ? (
                        <div className="mt-2 text-sm font-semibold tracking-wide text-muted-foreground">{kabinetPeriod}</div>
                      ) : null}
                      <div className="mt-5 max-w-md text-sm font-medium text-slate-700 md:text-base">
                        {orgName}
                        <div className="text-muted-foreground">{campusName}</div>
                      </div>
                    </>
                  )}
                  {heroSubtitle ? (
                    <div className="mt-4 max-w-xl text-sm text-muted-foreground md:text-base">{heroSubtitle}</div>
                  ) : null}

                  <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                    <Link
                      to="/struktur-organisasi"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--public-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                    >
                      Struktur Organisasi
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                    <Link
                      to="/berita"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-900 backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                    >
                      Berita &amp; Kegiatan
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_28px_70px_-50px_rgba(15,23,42,0.4)]">
                  <div className="relative aspect-[4/3] w-full bg-slate-50">
                    {isLoadingProfile ? (
                      <Skeleton className="h-full w-full rounded-none" aria-hidden="true" />
                    ) : profile?.home_image_url ? (
                      <PublicCoverImage
                        url={profile.home_image_url}
                        alt="Foto Anggota"
                        priority
                        displayWidth={828}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-8">
                        <p className="text-center text-sm text-muted-foreground">Foto anggota belum tersedia.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PublicEnter>
          </section>

          {showAboutVideoSection ? (
          <section className="relative overflow-hidden bg-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_20%,rgba(59,130,246,0.10),transparent_60%)] opacity-70" />
            <PublicReveal className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
              {videoSrc ? (
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)]">
                <div className="aspect-video w-full">
                    <iframe
                      className="h-full w-full"
                      src={videoSrc}
                      title="Video Profil"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                </div>
              </div>
              ) : null}

              {aboutParagraphs.length ? (
              <div className="text-slate-800">
                <div className="mb-4 font-display text-3xl italic tracking-tight md:text-4xl">{aboutTitle || 'Tentang'}</div>
                  <div className="space-y-5 text-[17px] leading-relaxed text-slate-700">
                    {aboutParagraphs.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
              </div>
              ) : null}
            </PublicReveal>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
              <div className="pointer-events-none absolute left-0 top-0 -translate-y-1/2">
                <div className="size-16 rounded-full bg-[var(--public-primary)]/14 blur-2xl" />
              </div>
              <div className="pointer-events-none absolute right-0 top-0 -translate-y-1/2">
                <div className="size-16 rounded-full bg-sky-400/12 blur-2xl" />
              </div>
              <div className="relative h-10 w-full">
                <div className="absolute left-1/2 top-1/2 h-10 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/18 blur-2xl" />
                <div className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/70" />
              </div>
            </div>
          </section>
          ) : null}

          {showVisiMisiSection ? (
          <section className="relative overflow-hidden bg-white py-20">
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
          <div className="pointer-events-none absolute left-0 top-12 hidden md:block">
            <div className="size-24 rounded-full bg-[var(--public-primary)]/16 blur-2xl" />
          </div>
          <div className="pointer-events-none absolute right-0 top-12 hidden md:block">
            <div className="size-24 rounded-full bg-sky-400/14 blur-2xl" />
          </div>

          <div className="font-display text-5xl italic tracking-tight text-slate-900 sm:text-6xl md:text-7xl">Program</div>
          <div className="-mt-2 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:-mt-3 sm:text-6xl md:text-7xl">Kerja</div>
          <div className="mx-auto mt-3 max-w-xl text-sm text-slate-700">
            Ringkasan program kerja yang sedang berjalan dan yang akan dilaksanakan.
          </div>

          <div className="relative mx-auto mt-10 max-w-5xl">
            <div className="pointer-events-none absolute -left-10 top-10 size-44 rounded-full bg-[var(--public-primary)]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-8 size-52 rounded-full bg-sky-400/10 blur-3xl" />
            {isLoadingPrograms ? (
              <div className="h-40" aria-busy="true" />
            ) : programs.length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-muted-foreground sm:p-10">
                <div className="pointer-events-none absolute -left-16 -top-16 size-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/14 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 -bottom-16 size-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
                <div className="relative">
                  <div className="text-base font-extrabold tracking-tight text-slate-900">Belum ada program kerja</div>
                  <div className="mt-2 max-w-2xl">
                    Program kerja yang dipublikasikan akan muncul di sini. Admin bisa menambahkannya dari menu Konten Website.
                  </div>
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

      <section className="relative overflow-hidden bg-white py-20">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_14%_18%,rgba(37,99,235,0.10),transparent_56%),radial-gradient(circle_at_86%_14%,rgba(56,189,248,0.10),transparent_60%)]" />
        <div className="pointer-events-none absolute left-6 top-10 hidden lg:block">
          <div className="size-24 rotate-6 rounded-[28px] bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(255,255,255,0.9))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-10 ml-14 size-20 -rotate-6 rounded-[26px] bg-[linear-gradient(135deg,rgba(56,189,248,0.14),rgba(255,255,255,0.92))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-10 ml-3 size-12 rotate-12 rounded-[18px] bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(255,255,255,0.94))] ring-1 ring-black/10 backdrop-blur" />
        </div>
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
                  {shown.map((r) => (
                    <div
                      key={r.id}
                      className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)]"
                    >
                      <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]">
                        <PublicCoverImage url={r.poster_image_url} alt={r.title} imgClassName="object-cover" />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{r.date_range ?? '-'}</div>
                        <div className="mt-2 text-lg font-extrabold tracking-tight text-slate-900 line-clamp-2">{r.title}</div>
                        {r.description ? (
                          <div className="mt-3 text-sm text-slate-700 line-clamp-2">{r.description}</div>
                        ) : (
                          <div className="mt-3 text-sm text-muted-foreground line-clamp-2">Informasi singkat belum tersedia.</div>
                        )}
                        <div className="mt-auto pt-5">
                          <div className="flex items-center justify-between gap-3">
                            <Link
                              to="/open-recruitment"
                              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[var(--public-primary)]/30"
                            >
                              Detail
                              <ArrowRight size={16} />
                            </Link>
                            {r.form_url ? (
                              <a
                                href={r.form_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--public-primary)] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_22px_rgba(37,99,235,0.28)] transition hover:brightness-110"
                              >
                                Join
                                <ArrowRight size={16} />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </PublicReveal>
      </section>

      {(isLoadingStructure || structure.length > 0) ? (
      <section className="relative bg-slate-50/55 py-20">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_12%_18%,rgba(37,99,235,0.10),transparent_55%),radial-gradient(circle_at_86%_12%,rgba(56,189,248,0.10),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute left-5 top-10 hidden md:block">
          <div className="size-24 rotate-6 rounded-[28px] bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(255,255,255,0.88))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-9 ml-14 size-20 -rotate-6 rounded-[26px] bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(255,255,255,0.9))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-10 ml-3 size-12 rotate-12 rounded-[18px] bg-[linear-gradient(135deg,rgba(99,102,241,0.14),rgba(255,255,255,0.92))] ring-1 ring-black/10 backdrop-blur" />
        </div>
        <div className="pointer-events-none absolute right-6 top-14 hidden lg:block">
          <div className="size-20 -rotate-12 rounded-[26px] bg-[linear-gradient(135deg,rgba(99,102,241,0.14),rgba(255,255,255,0.9))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-6 ml-12 size-14 rotate-6 rounded-[22px] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(255,255,255,0.92))] ring-1 ring-black/10 backdrop-blur" />
        </div>
        <PublicReveal className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <div className="font-display text-5xl italic tracking-tight text-slate-900 sm:text-6xl md:text-7xl">Susunan</div>
            <div className="-mt-2 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:-mt-3 sm:text-6xl md:text-7xl">
              Fungsionaris
            </div>
          </div>

          {isLoadingStructure ? (
            <div className="mt-12 h-40" />
          ) : (
            (() => {
              const ordered = structure
                .slice()
                .sort((a, b) => (Number(a.sort_order ?? 999) || 999) - (Number(b.sort_order ?? 999) || 999));
              const core = ordered.filter(
                (g) => Boolean((g as { is_core?: boolean }).is_core) || isCoreStructureGroup(g.title) || (Number(g.sort_order ?? 999) || 999) === 0,
              );
              const coreIds = new Set(core.map((g) => g.id));
              const support = ordered.filter((g) => !coreIds.has(g.id));
              return (
                <div className="mt-12 space-y-12">
                  {core.length ? <DivisionRail label="Divisi Inti" groups={core} /> : null}

                  {support.length ? <DivisionRail label="Divisi Pendukung" groups={support} /> : null}
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
            <div>
              <div className="font-display text-5xl italic tracking-tight text-slate-900 md:text-6xl">Informasi</div>
              <div className="-mt-2 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-6xl">Lomba</div>
              <div className="mt-3 max-w-xl text-sm text-slate-700">
                Kumpulan informasi lomba yang sedang dibuka dan mendekati tenggat.
              </div>
            </div>
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
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--public-primary)]/30 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/55"
                    >
                      <div className="relative aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]">
                        <PublicCoverImage url={l.cover_image_url} alt={l.title} imgClassName="object-cover transition duration-700 group-hover:scale-[1.02]" />
                        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="text-lg font-extrabold tracking-tight text-slate-900 line-clamp-2">{l.title}</div>
                        <div className="mt-2 text-sm font-semibold text-muted-foreground">
                          {l.date_label ? `Batas Pendaftaran : ${l.date_label}` : 'Batas Pendaftaran : -'}
                        </div>
                        {l.excerpt ? (
                          <div className="mt-4 text-sm leading-relaxed text-slate-700 line-clamp-3">{l.excerpt}</div>
                        ) : (
                          <div className="mt-4 text-sm text-muted-foreground line-clamp-3">Ringkasan belum tersedia.</div>
                        )}
                        <div className="mt-6">
                          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--public-primary)]/45 bg-white px-5 py-3 text-sm font-semibold text-[var(--public-primary)] transition group-hover:bg-[var(--public-primary)]/5">
                            Lihat Detail <ArrowRight size={16} />
                          </div>
                        </div>
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
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/30"
                    >
                      <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]">
                        <PublicCoverImage url={a.items?.[0]?.image_url} alt={a.title} imgClassName="transition duration-500 group-hover:scale-[1.02]" />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-lg font-extrabold tracking-tight text-slate-900 line-clamp-1">{a.title}</div>
                            {a.description ? (
                              <div className="mt-2 text-sm text-slate-700 line-clamp-2">{a.description}</div>
                            ) : (
                              <div className="mt-2 text-sm text-muted-foreground line-clamp-2">Dokumentasi akan ditampilkan setelah diisi.</div>
                            )}
                          </div>
                          <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--public-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--public-primary)]">
                            {a.items?.length ?? 0} foto
                          </div>
                        </div>
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
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/30"
                    >
                      <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]">
                        <PublicCoverImage url={p.cover_image_url} alt={p.title} imgClassName="object-cover transition duration-700 group-hover:scale-[1.01]" />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          <span>{p.category?.name ?? 'Berita'}</span>
                          {p.date_label ? <span className="text-slate-300">•</span> : null}
                          {p.date_label ? <span className="normal-case tracking-normal">{p.date_label}</span> : null}
                        </div>
                        <div className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 line-clamp-2">
                          {p.title}
                        </div>
                        {p.excerpt ? (
                          <div className="mt-3 text-sm leading-relaxed text-slate-700 line-clamp-3">
                            {p.excerpt}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                            Ringkasan belum tersedia.
                          </div>
                        )}
                        <div className="mt-auto pt-5">
                          <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--public-primary)]/25 bg-[var(--public-primary)]/10 px-3 py-2 text-sm font-semibold text-[var(--public-primary)] transition group-hover:bg-[var(--public-primary)] group-hover:text-white">
                            Baca selengkapnya
                            <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                          </div>
                        </div>
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
