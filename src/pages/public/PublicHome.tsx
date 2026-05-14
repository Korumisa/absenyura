import React, { useEffect, useMemo, useRef, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { ArrowRight, Lightbulb, PenLine, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicGalleryAlbum, PublicPost, PublicProfile, PublicProgram, PublicRecruitment, PublicStructureGroup } from '@/types/publicSite';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import PublicCoverImage from '@/components/PublicCoverImage';
import PublicProgramCard from '@/components/PublicProgramCard';
import useHorizontalWheelScroll from '@/lib/useHorizontalWheelScroll';
import { AnimatePresence, motion } from 'framer-motion';

function HorizontalSnapRail({
  children,
  ariaLabel,
  setScroller,
  onScroll,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  setScroller?: (el: HTMLDivElement | null) => void;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
  const wheel = useHorizontalWheelScroll(true);
  return (
    <div
      ref={(node) => {
        wheel.ref(node);
        setScroller?.(node as HTMLDivElement | null);
      }}
      onWheelCapture={wheel.onWheel}
      onScroll={onScroll}
      className="overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide"
      style={{
        touchAction: 'pan-x',
        overscrollBehaviorX: 'contain',
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch' as any,
      }}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

function getDivisionDisplayTitle(input: string) {
  const raw = String(input ?? '').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('badan pengurus harian') || lower === 'bph') return 'Pengurus Inti';
  return raw || 'Divisi';
}

function getDivisionTagline(input: string) {
  const title = getDivisionDisplayTitle(input);
  const t = title.toLowerCase();
  if (t.includes('pengurus inti') || t.includes('inti')) return 'Arah strategis, koordinasi, dan pengambilan keputusan organisasi.';
  if (t.includes('kominfo')) return 'Publikasi, dokumentasi, dan pengelolaan media organisasi.';
  if (t.includes('psdm')) return 'Pengembangan anggota, pelatihan, dan internal organisasi.';
  if (t.includes('humas')) return 'Kemitraan, komunikasi, dan relasi eksternal organisasi.';
  if (t.includes('minat') || t.includes('bakat')) return 'Wadah kegiatan, lomba, dan pengembangan prestasi anggota.';
  return 'Kolaborasi dan eksekusi program kerja divisi.';
}

function DivisionRail({
  label,
  groups,
}: {
  label: string;
  groups: PublicStructureGroup[];
}) {
  const ordered = useMemo(
    () =>
      groups
        .slice()
        .sort((a, b) => (Number(a.sort_order ?? 999) || 999) - (Number(b.sort_order ?? 999) || 999))
        .filter((g) => (g.members ?? []).length > 0),
    [groups],
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Array<HTMLDivElement | null>>([]);
  const offsets = useRef<number[]>([]);
  const rafScroll = useRef<number | null>(null);
  const [activeTitle, setActiveTitle] = useState(() => getDivisionDisplayTitle(ordered[0]?.title ?? ''));

  const recalc = () => {
    offsets.current = groupRefs.current.map((el) => el?.offsetLeft ?? 0);
  };

  const updateActive = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft;
    const list = offsets.current;
    if (!list.length) return;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < list.length; i++) {
      const d = Math.abs(list[i] - left);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    const next = getDivisionDisplayTitle(ordered[best]?.title ?? '');
    if (next && next !== activeTitle) setActiveTitle(next);
  };

  useEffect(() => {
    setActiveTitle(getDivisionDisplayTitle(ordered[0]?.title ?? ''));
    requestAnimationFrame(() => {
      recalc();
      updateActive();
    });
    const onResize = () => {
      recalc();
      updateActive();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ordered.length]);

  const onScroll = () => {
    if (rafScroll.current) return;
    rafScroll.current = requestAnimationFrame(() => {
      rafScroll.current = null;
      updateActive();
    });
  };

  if (!ordered.length) return null;

  const tagline = getDivisionTagline(activeTitle);

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center rounded-full bg-[var(--public-primary)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">
          {label}
        </div>
        <div className="mt-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTitle}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
            >
              <span className="text-[var(--public-primary)]">{activeTitle}</span>
            </motion.div>
          </AnimatePresence>
          <div className="relative mx-auto mt-4 h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-[var(--public-primary)]/35 to-transparent" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tagline}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="mt-3 text-sm font-medium text-slate-600"
            >
              {tagline}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-8 relative -mr-4 pr-4 sm:-mr-6 sm:pr-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-50/95 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-50/95 to-transparent" />
        <HorizontalSnapRail
          ariaLabel={label}
          setScroller={(el) => {
            scrollerRef.current = el;
          }}
          onScroll={onScroll}
        >
          <div className="flex w-max gap-8 px-2">
            {ordered.map((group, gi) => {
              const members = (group.members ?? []).slice(0, 8);
              return (
                <div
                  key={group.id}
                  ref={(el) => {
                    groupRefs.current[gi] = el;
                  }}
                  className="flex snap-start gap-4"
                >
                  {members.map((m) => {
                    const initial = String(m.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';
                    return (
                      <Link
                        key={m.id}
                        to="/struktur-organisasi"
                        className="group relative w-[240px] shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25 sm:w-[260px]"
                      >
                        <div className="relative aspect-[4/5] w-full bg-slate-100">
                          {m.photo_url ? (
                            <PublicCoverImage
                              url={m.photo_url}
                              alt={m.name}
                              imgClassName="object-cover grayscale transition duration-500 group-hover:grayscale-0"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.02))]">
                              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/80 text-4xl font-extrabold text-[var(--public-primary)] ring-1 ring-black/10">
                                {initial}
                              </div>
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-4">
                            <div className="truncate text-sm font-extrabold tracking-tight text-white">{m.role}</div>
                            <div className="mt-1 truncate text-xs font-semibold text-white/90">{m.name}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </HorizontalSnapRail>
      </div>
    </div>
  );
}

function BrandMark({ className, src, name }: { className?: string; src: string; name: string }) {
  if (src)
    return (
      <div className={className}>
        <PublicCoverImage url={src} alt={name || 'Logo'} imgClassName="object-contain" />
      </div>
    );
  const first = String(name || '').trim().slice(0, 1).toUpperCase() || 'H';
  return (
    <div
      className={[
        className,
        'grid place-items-center rounded-2xl bg-[var(--public-primary)]/15 text-[var(--public-primary)] ring-1 ring-black/10',
      ].join(' ')}
    >
      <div className="text-2xl font-extrabold">{first}</div>
    </div>
  );
}

function normalizeYoutubeEmbedUrl(input: string) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  if (raw.includes('tiktok.com/embed')) return raw.startsWith('http://') ? raw.replace(/^http:\/\//, 'https://') : raw;
  if (raw.includes('instagram.com') && raw.includes('/embed')) return raw.startsWith('http://') ? raw.replace(/^http:\/\//, 'https://') : raw;
  if (raw.includes('youtube.com/embed/') || raw.includes('youtube-nocookie.com/embed/')) return raw;
  const directId = raw.match(/^[a-zA-Z0-9_-]{6,}$/)?.[0];
  if (directId) return `https://www.youtube.com/embed/${directId}`;
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, '');
    let id = '';
    if (host.endsWith('tiktok.com')) {
      const m = url.pathname.match(/\/video\/(\d+)/);
      const vid = m?.[1] || '';
      if (vid) return `https://www.tiktok.com/embed/v2/${vid}`;
      const embed = url.pathname.match(/\/embed\/v2\/(\d+)/)?.[1] || url.pathname.match(/\/embed\/(\d+)/)?.[1] || '';
      if (embed) return `https://www.tiktok.com/embed/v2/${embed}`;
      return '';
    }
    if (host.endsWith('instagram.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      const kind = parts[0] || '';
      const code = parts[1] || '';
      if (!kind || !code) return '';
      if (kind !== 'p' && kind !== 'reel' && kind !== 'tv') return '';
      return `https://www.instagram.com/${kind}/${code}/embed/`;
    }
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
    if (host.endsWith('youtube.com')) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] || '';
      else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2] || '';
      else if (url.pathname.startsWith('/live/')) id = url.pathname.split('/')[2] || '';
    }
    id = id.trim();
    if (!id) return '';
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return '';
  }
}

export default function PublicHome() {
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('public-home-ready') === '1';
  });
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile, isLoading: isLoadingProfile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const { data: programs = [], isLoading: isLoadingPrograms } = useSWR<PublicProgram[]>('/public-site/programs', fetcher, { revalidateOnFocus: false });
  const { data: structure = [], isLoading: isLoadingStructure } = useSWR<PublicStructureGroup[]>('/public-site/structure', fetcher, { revalidateOnFocus: false });
  const { data: latest, isLoading: isLoadingLatest } = useSWR<{ items: PublicPost[] }>(
    '/public-site/posts?type=BERITA&page=1&pageSize=3',
    (url) => api.get(url).then((r) => r.data.data),
    { revalidateOnFocus: false }
  );
  const { data: recruitments = [], isLoading: isLoadingRecruitments } = useSWR<PublicRecruitment[]>(
    '/public-site/recruitments',
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: galleries = [], isLoading: isLoadingGalleries } = useSWR<PublicGalleryAlbum[]>(
    '/public-site/galleries',
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: lombaPaged, isLoading: isLoadingLomba } = useSWR<{ items: PublicPost[] }>(
    '/public-site/posts?type=LOMBA&page=1&pageSize=6',
    (url) => api.get(url).then((r) => r.data.data),
    { revalidateOnFocus: false }
  );

  const isPageLoading =
    isLoadingProfile || isLoadingPrograms || isLoadingStructure || isLoadingLatest || isLoadingRecruitments || isLoadingGalleries || isLoadingLomba;
  const showLoadingOverlay = !hasLoadedOnce && isPageLoading;

  useEffect(() => {
    if (!hasLoadedOnce && !isPageLoading) {
      setHasLoadedOnce(true);
      if (typeof window !== 'undefined') window.sessionStorage.setItem('public-home-ready', '1');
    }
  }, [hasLoadedOnce, isPageLoading]);

  const orgName = profile?.org_name ?? '';
  const campusName = profile?.campus_name ?? '';
  const kabinetName = profile?.kabinet_name ?? '';
  const kabinetPeriod = profile?.kabinet_period ?? '';
  const heroSubtitle = profile?.hero_subtitle ?? '';
  const youtubeEmbedUrl = profile?.youtube_embed_url ?? '';
  const videoSrc = normalizeYoutubeEmbedUrl(youtubeEmbedUrl);
  const aboutTitle = profile?.about_title ?? '';
  const aboutContent = profile?.about_content ?? '';
  const aboutParagraphs = aboutContent.split('\n').map((x) => x.trim()).filter(Boolean);
  const vision = profile?.vision ?? '';
  const mission = profile?.mission ?? '';
  const missionItems = mission
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

  const coreMembers = useMemo(() => {
    const isCoreByTitle = (title: string) => {
      const t = String(title ?? '').toLowerCase();
      return t.includes('inti') || t.includes('badan pengurus harian') || t === 'bph';
    };
    const coreGroups = structure.filter((g) => Boolean((g as any).is_core) || isCoreByTitle(g.title));
    return coreGroups.flatMap((g) => (g.members ?? []) as any[]);
  }, [structure]);

  const ketua = useMemo(() => {
    const k = coreMembers.find((m) => String(m.role ?? '').toLowerCase().includes('ketua') && !String(m.role ?? '').toLowerCase().includes('wakil'));
    return k ?? coreMembers.find((m) => String(m.role ?? '').toLowerCase().includes('ketua')) ?? null;
  }, [coreMembers]);

  const wakil = useMemo(() => {
    return coreMembers.find((m) => String(m.role ?? '').toLowerCase().includes('wakil')) ?? null;
  }, [coreMembers]);

  const logoSrc = profile?.logo_light_url ?? '';
  const posts = latest?.items ?? [];
  const lomba = lombaPaged?.items ?? [];
  const heroKabinetName = kabinetName || (!isLoadingProfile ? 'Kabinet belum diatur' : '');

  return (
    <PublicLayout>
      <div className="relative">
        <div className={`transition-opacity duration-200 ${showLoadingOverlay ? 'pointer-events-none select-none opacity-75' : ''}`}>
          <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_50%),radial-gradient(circle_at_70%_10%,rgba(59,130,246,0.14),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.02),transparent)]">
            <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_15%,rgba(37,99,235,0.10),transparent_56%),radial-gradient(circle_at_78%_10%,rgba(56,189,248,0.08),transparent_60%)]" />
            <PublicEnter className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
              <div className="flex items-start gap-6">
                <BrandMark className="hidden h-28 w-28 shrink-0 sm:block" src={logoSrc} name={orgName || campusName} />
                <div>
                  <div className="font-display text-4xl italic tracking-tight text-slate-900 md:text-5xl">Kabinet</div>
                  <div className="mt-1 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-7xl">
                    {heroKabinetName}
                  </div>
                  {kabinetPeriod ? <div className="mt-2 text-sm font-semibold tracking-wide text-slate-600">{kabinetPeriod}</div> : null}
                  <div className="mt-5 max-w-md text-sm font-medium text-slate-700 md:text-base">
                    {orgName}
                    <div className="text-slate-500">{campusName}</div>
                  </div>
                  {heroSubtitle ? (
                    <div className="mt-4 max-w-xl text-sm text-slate-600 md:text-base">{heroSubtitle}</div>
                  ) : null}

                  <div className="mt-10 flex flex-wrap items-center gap-4">
                    <Link
                      to="/struktur-organisasi"
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--public-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                    >
                      Struktur Organisasi
                      <ArrowRight size={18} />
                    </Link>
                    <Link
                      to="/informasi"
                      className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-900 backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                    >
                      Informasi Terbaru
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_28px_70px_-50px_rgba(15,23,42,0.4)]">
                  <div className="relative aspect-[4/3] w-full bg-slate-50">
                    {profile?.home_image_url ? (
                      <PublicCoverImage url={profile.home_image_url} alt="Foto Anggota" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-8">
                        <div className="w-full rounded-2xl border border-dashed border-black/20 bg-white/60 p-8 text-center text-sm text-slate-600">
                          <div className="text-base font-extrabold tracking-tight text-slate-900">Tempat Foto Anggota</div>
                          <div className="mt-2">Upload lewat admin: Konten Website → Profil → Upload Foto Anggota.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PublicEnter>
          </section>

          <section className="relative overflow-hidden bg-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_20%,rgba(59,130,246,0.10),transparent_60%)] opacity-70" />
            <PublicReveal className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)]">
                <div className="aspect-video w-full">
                  {videoSrc ? (
                    <iframe
                      className="h-full w-full"
                      src={videoSrc}
                      title="Video Profil"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_25%,rgba(37,99,235,0.22),transparent_58%),radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.14),transparent_60%),linear-gradient(135deg,rgba(15,23,42,0.06),rgba(15,23,42,0.02))]">
                      <div className="rounded-xl border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-700 backdrop-blur">
                        Video profil belum diatur
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-slate-800">
                <div className="mb-4 font-display text-3xl italic tracking-tight md:text-4xl">{aboutTitle || 'Tentang'}</div>
                {aboutParagraphs.length ? (
                  <div className="space-y-5 text-[17px] leading-relaxed text-slate-700">
                    {aboutParagraphs.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-sm text-slate-600">
                    Konten “Tentang” belum diatur. Admin bisa isi dari menu Konten Website.
                  </div>
                )}
              </div>
            </PublicReveal>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
              <div className="pointer-events-none absolute left-0 top-0 -translate-y-1/2">
                <div className="h-16 w-16 rounded-full bg-[var(--public-primary)]/14 blur-2xl" />
              </div>
              <div className="pointer-events-none absolute right-0 top-0 -translate-y-1/2">
                <div className="h-16 w-16 rounded-full bg-sky-400/12 blur-2xl" />
              </div>
              <div className="relative h-10 w-full">
                <div className="absolute left-1/2 top-1/2 h-10 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/18 blur-2xl" />
                <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/70" />
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden bg-white py-20">
            <PublicReveal className="relative mx-auto max-w-7xl px-4 sm:px-6">
              <div className="mx-auto max-w-5xl text-center">
                <div className="mx-auto flex max-w-xl items-center justify-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--public-primary)]/10 text-[var(--public-primary)]">
                    <Lightbulb size={18} />
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{orgName || 'Profil Organisasi'}</div>
                {heroSubtitle ? <div className="mt-2 text-sm text-slate-600">{heroSubtitle}</div> : null}
                <div className="mx-auto mt-8 grid max-w-5xl gap-6 text-left md:grid-cols-2">
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-[0_18px_40px_-42px_rgba(15,23,42,0.30)]">
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Tentang {orgName || 'Organisasi'}
                    </div>
                    <div className="mt-3 text-sm leading-relaxed text-slate-700">
                      {aboutParagraphs[0] ||
                        `Organisasi ini menjadi ruang tumbuh mahasiswa untuk berkarya, berjejaring, dan meningkatkan kompetensi melalui program yang relevan dan berdampak.`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-[0_18px_40px_-42px_rgba(15,23,42,0.30)]">
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Kepengurusan {kabinetPeriod || 'Tahun Ini'}
                    </div>
                    <div className="mt-3 text-sm leading-relaxed text-slate-700">
                      {aboutParagraphs[1] ||
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
                    <div className="mt-5 whitespace-pre-wrap text-[17px] leading-relaxed text-slate-700 sm:text-[18px]">
                      {vision || 'Visi belum diatur. Admin bisa isi dari menu Konten Website → Profil.'}
                    </div>
                  </div>
                  <div className="relative mx-auto w-full max-w-[360px] md:mx-0 md:max-w-none md:justify-self-end">
                    <div className="relative overflow-hidden rounded-3xl bg-slate-50 shadow-[0_22px_60px_-52px_rgba(15,23,42,0.55)]">
                      <div className="aspect-square w-full">
                        <PublicCoverImage
                          url={ketua?.photo_url || profile?.home_image_url}
                          alt={ketua?.name || 'Ketua'}
                          imgClassName="object-cover"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-px w-full bg-[var(--public-primary)]" />
                      <div className="mt-3 text-center">
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{ketua?.role || 'Ketua'}</div>
                        <div className="mt-1 text-sm font-extrabold tracking-tight text-slate-900">{ketua?.name || '-'}</div>
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
                            url={wakil?.photo_url || profile?.home_image_url}
                            alt={wakil?.name || 'Wakil'}
                            imgClassName="object-cover"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="h-px w-full bg-[var(--public-primary)]" />
                        <div className="mt-3 text-center">
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{wakil?.role || 'Wakil Ketua'}</div>
                          <div className="mt-1 text-sm font-extrabold tracking-tight text-slate-900">{wakil?.name || '-'}</div>
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
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-black/10 bg-white text-sm font-extrabold text-[var(--public-primary)]">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 text-[17px] leading-relaxed text-slate-700 sm:text-[18px]">{item}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-sm text-slate-600">
                        Misi belum diatur. Admin bisa isi dari menu Konten Website → Profil.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PublicReveal>
          </section>

          <section className="relative bg-slate-50/55 py-20">
            <PublicReveal className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <div className="pointer-events-none absolute left-0 top-12 hidden md:block">
            <div className="h-24 w-24 rounded-full bg-[var(--public-primary)]/16 blur-2xl" />
          </div>
          <div className="pointer-events-none absolute right-0 top-12 hidden md:block">
            <div className="h-24 w-24 rounded-full bg-sky-400/14 blur-2xl" />
          </div>

          <div className="font-display text-5xl italic tracking-tight text-slate-900 sm:text-6xl md:text-7xl">Program</div>
          <div className="-mt-2 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:-mt-3 sm:text-6xl md:text-7xl">Kerja</div>
          <div className="mx-auto mt-3 max-w-xl text-sm text-slate-700">
            Ringkasan program kerja yang sedang berjalan dan yang akan dilaksanakan.
          </div>

          <div className="relative mx-auto mt-10 max-w-5xl">
            <div className="pointer-events-none absolute -left-10 top-10 h-44 w-44 rounded-full bg-[var(--public-primary)]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-8 h-52 w-52 rounded-full bg-sky-400/10 blur-3xl" />
            {isLoadingPrograms ? (
              <div className="h-40" />
            ) : programs.length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-slate-600 sm:p-10">
                <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/14 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
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
          <div className="h-24 w-24 rotate-6 rounded-[28px] bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(255,255,255,0.9))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-10 ml-14 h-20 w-20 -rotate-6 rounded-[26px] bg-[linear-gradient(135deg,rgba(56,189,248,0.14),rgba(255,255,255,0.92))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-10 ml-3 h-12 w-12 rotate-12 rounded-[18px] bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(255,255,255,0.94))] ring-1 ring-black/10 backdrop-blur" />
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
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-slate-600">
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
                        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{r.date_range ?? '-'}</div>
                        <div className="mt-2 text-lg font-extrabold tracking-tight text-slate-900 line-clamp-2">{r.title}</div>
                        {r.description ? (
                          <div className="mt-3 text-sm text-slate-700 line-clamp-2">{r.description}</div>
                        ) : (
                          <div className="mt-3 text-sm text-slate-500 line-clamp-2">Informasi singkat belum tersedia.</div>
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

      <section className="relative bg-slate-50/55 py-20">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_12%_18%,rgba(37,99,235,0.10),transparent_55%),radial-gradient(circle_at_86%_12%,rgba(56,189,248,0.10),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute left-5 top-10 hidden md:block">
          <div className="h-24 w-24 rotate-6 rounded-[28px] bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(255,255,255,0.88))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-9 ml-14 h-20 w-20 -rotate-6 rounded-[26px] bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(255,255,255,0.9))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-10 ml-3 h-12 w-12 rotate-12 rounded-[18px] bg-[linear-gradient(135deg,rgba(99,102,241,0.14),rgba(255,255,255,0.92))] ring-1 ring-black/10 backdrop-blur" />
        </div>
        <div className="pointer-events-none absolute right-6 top-14 hidden lg:block">
          <div className="h-20 w-20 -rotate-12 rounded-[26px] bg-[linear-gradient(135deg,rgba(99,102,241,0.14),rgba(255,255,255,0.9))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
          <div className="-mt-6 ml-12 h-14 w-14 rotate-6 rounded-[22px] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(255,255,255,0.92))] ring-1 ring-black/10 backdrop-blur" />
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
          ) : structure.length === 0 ? (
            <div className="relative mt-12 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-slate-600 sm:p-10">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900">Struktur organisasi belum diatur</div>
                <div className="mt-2 max-w-2xl">
                  Admin bisa isi susunan fungsionaris dari menu Konten Website → Struktur.
                </div>
              </div>
            </div>
          ) : (
            (() => {
              const ordered = structure
                .slice()
                .sort((a, b) => (Number(a.sort_order ?? 999) || 999) - (Number(b.sort_order ?? 999) || 999));
              const isCore = (title: string) => {
                const t = String(title ?? '').toLowerCase();
                return t.includes('badan pengurus harian') || t === 'bph' || t.includes('inti');
              };
              const core = ordered.filter((g) => Boolean((g as any).is_core) || isCore(g.title) || (Number(g.sort_order ?? 999) || 999) === 0);
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
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-slate-600">
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
                        <div className="mt-2 text-sm font-semibold text-slate-600">
                          {l.date_label ? `Batas Pendaftaran : ${l.date_label}` : 'Batas Pendaftaran : -'}
                        </div>
                        {l.excerpt ? (
                          <div className="mt-4 text-sm leading-relaxed text-slate-700 line-clamp-3">{l.excerpt}</div>
                        ) : (
                          <div className="mt-4 text-sm text-slate-500 line-clamp-3">Ringkasan belum tersedia.</div>
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
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-slate-600">
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
                              <div className="mt-2 text-sm text-slate-500 line-clamp-2">Dokumentasi akan ditampilkan setelah diisi.</div>
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
              to="/informasi"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40"
            >
              Lihat Semua
              <ArrowRight size={18} />
            </Link>
          </div>

          {isLoadingLatest ? (
            <div className="mt-10 h-40" />
          ) : posts.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-slate-600">
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
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
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
                          <div className="mt-3 text-sm leading-relaxed text-slate-500 line-clamp-3">
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

        <PublicLoadingOverlay show={showLoadingOverlay} />
      </div>
    </PublicLayout>
  );
}
