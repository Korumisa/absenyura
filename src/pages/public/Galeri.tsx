import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import PublicLayout from '@/components/PublicLayout';
import type { PublicGalleryAlbum, PublicProfile } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import useLockBodyScroll from '@/lib/a11y/useLockBodyScroll';
import { useMockOrSwr } from '@/hooks/useMockOrSwr';
import { mockGalleries, mockProfile } from '@/lib/utils/mockLandingData';
import { safeRelation } from '@/lib/utils/publicContent';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import { PublicPageMeta } from '@/components/public/PublicPageMeta';
import { publicSiteFetcher, safeArray } from '@/lib/utils/publicSiteFetcher';

function albumPhotoCount(a: PublicGalleryAlbum | null | undefined) {
  if (!a) return 0;
  return a.item_count ?? a.items?.length ?? 0;
}

function albumCoverUrl(a: PublicGalleryAlbum) {
  return a.items?.[0]?.image_url ?? null;
}

export default function Galeri() {
  const profileResult = useMockOrSwr<PublicProfile | null>({
    swrKey: '/public-site/profile',
    fetcher: publicSiteFetcher<PublicProfile | null>,
    mockStatic: mockProfile,
  });
  const profile = profileResult.data ?? null;
  const { swr, data, isInitialLoading: isLoading, isError, retry } = useMockOrSwr<PublicGalleryAlbum[]>({
    swrKey: '/public-site/galleries',
    fetcher: publicSiteFetcher<PublicGalleryAlbum[]>,
    mockStatic: mockGalleries,
  });
  const albums = safeArray<PublicGalleryAlbum>(data);
  const orgName = profile?.org_name ?? '';

  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ albumId: string; index: number } | null>(null);
  const lightboxDialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(Boolean(lightbox), () => setLightbox(null), { containerRef: lightboxDialogRef });
  useLockBodyScroll(Boolean(lightbox));

  const albumSummary = useMemo(
    () => albums.find((a) => a.id === activeAlbumId) ?? null,
    [albums, activeAlbumId],
  );

  const albumDetailResult = useMockOrSwr<PublicGalleryAlbum | null>({
    swrKey: activeAlbumId ? `/public-site/galleries/${activeAlbumId}` : null,
    fetcher: publicSiteFetcher<PublicGalleryAlbum | null>,
    mockStatic: () =>
      (mockGalleries.find((a) => a.id === activeAlbumId) ?? mockGalleries[0] ?? null) as PublicGalleryAlbum | null,
  });

  const activeAlbum = albumDetailResult.data ?? albumSummary;
  const isLoadingAlbum =
    Boolean(activeAlbumId) && (albumDetailResult.isInitialLoading || albumDetailResult.isPending);
  const albumItems = safeRelation(activeAlbum?.items);

  const galeriMetaDesc = useMemo(() => {
    const org = orgName || 'HM SDP Undiksha';
    if (albums.length > 0) {
      return `Galeri ${albums.length} album foto dokumentasi kegiatan ${org}. Jelajahi momen-momen kepanitiaan, rapat, dan acara organisasi.`;
    }
    return `Galeri dokumentasi kegiatan ${org} dalam bentuk album foto pilihan.`;
  }, [albums.length, orgName]);

  const lightboxAlbum = activeAlbum?.id === lightbox?.albumId ? activeAlbum : null;
  const lightboxItems = safeRelation(lightboxAlbum?.items);
  const lightboxItem = useMemo(() => {
    if (!lightbox || !lightboxItems.length) return null;
    return lightboxItems[lightbox.index] ?? null;
  }, [lightbox, lightboxItems]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setLightbox((s) =>
          s ? { ...s, index: (s.index - 1 + lightboxItems.length) % lightboxItems.length } : s,
        );
      } else if (e.key === 'ArrowRight') {
        setLightbox((s) => (s ? { ...s, index: (s.index + 1) % lightboxItems.length } : s));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, lightboxItems.length]);

  if (isError) {
    return <PublicPageError title="Gagal memuat galeri" error={swr.error} onRetry={retry} />;
  }

  const totalPhotos = lightboxItems.length;
  const photoIndex = lightbox ? lightbox.index + 1 : 0;
  const browsingAlbums = !activeAlbumId;

  return (
    <PublicLayout>
      <PublicPageMeta
        title="Galeri Kegiatan"
        description={galeriMetaDesc}
        path="/galeri"
      />
      <PublicLoadingOverlay show={isLoading} label="Memuat galeri..." />
      <PublicEnter>
        <PublicPageHero
          top="Galeri"
          bottom="Kegiatan"
          subtitle={
            browsingAlbums
              ? `Dokumentasi visual kegiatan ${orgName || 'organisasi'}. Pilih album untuk menjelajah foto.`
              : undefined
          }
        />

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          {isLoading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton
                  key={idx}
                  className={`w-full rounded-2xl ${idx === 0 ? 'aspect-[16/11] sm:col-span-2 sm:aspect-[21/10]' : 'aspect-[4/3]'}`}
                />
              ))}
            </div>
          ) : albums.length === 0 ? (
            <PublicEmptyState
              title="Belum ada album galeri"
              description="Admin bisa menambahkan album dan foto dari menu Konten Website."
            />
          ) : browsingAlbums ? (
            <div className="mt-8">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {albums.length} album
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Jelajahi dokumentasi
                  </h2>
                </div>
              </div>

              <div className="grid auto-rows-[minmax(200px,auto)] gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {albums.map((a, idx) => {
                  const count = albumPhotoCount(a);
                  const featured = idx === 0;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setActiveAlbumId(a.id)}
                      className={`group relative overflow-hidden rounded-2xl bg-slate-900 text-left shadow-[0_20px_50px_-36px_rgba(15,23,42,0.55)] transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-34px_rgba(15,23,42,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/50 ${
                        featured ? 'min-h-[260px] sm:col-span-2 sm:min-h-[320px] lg:row-span-2' : 'min-h-[220px]'
                      }`}
                    >
                      <PublicCoverImage
                        url={albumCoverUrl(a)}
                        alt={a.title}
                        imgClassName="object-cover transition duration-700 group-hover:scale-[1.05]"
                        displayWidth={featured ? 1400 : 800}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
                      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
                          <Images size={12} aria-hidden />
                          {count} foto
                        </div>
                        <h3
                          className={`mt-2 font-bold leading-snug tracking-tight text-white ${
                            featured ? 'text-xl sm:text-2xl md:text-3xl' : 'text-base sm:text-lg'
                          }`}
                        >
                          {a.title}
                        </h3>
                        {a.description ? (
                          <p
                            className={`mt-1.5 text-sm leading-relaxed text-white/75 ${
                              featured ? 'line-clamp-2 max-w-xl' : 'line-clamp-2'
                            }`}
                          >
                            {a.description}
                          </p>
                        ) : null}
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white/95 opacity-90 transition group-hover:opacity-100">
                          Buka album
                          <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setActiveAlbumId(null)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-[var(--public-primary)]"
              >
                <ArrowLeft size={16} aria-hidden />
                Semua album
              </button>

              <div className="mt-5 flex flex-col gap-3 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Album</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    {activeAlbum?.title || 'Album'}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                    {activeAlbum?.description ||
                      `Dokumentasi kegiatan dari ${orgName || 'organisasi'}.`}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-slate-500">
                  {albumPhotoCount(activeAlbum)} foto
                </p>
              </div>

              {/* Album switcher — horizontal chips */}
              <div className="mt-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {albums.map((a) => {
                  const isActive = a.id === activeAlbumId;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setActiveAlbumId(a.id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        isActive
                          ? 'border-[var(--public-primary)] bg-[var(--public-primary)] text-white'
                          : 'border-black/10 bg-white text-slate-700 hover:border-[var(--public-primary)]/40'
                      }`}
                    >
                      <span className="relative size-6 overflow-hidden rounded-full bg-slate-200">
                        <PublicCoverImage
                          url={albumCoverUrl(a)}
                          alt=""
                          imgClassName="object-cover"
                          displayWidth={80}
                        />
                      </span>
                      <span className="max-w-[10rem] truncate">{a.title}</span>
                    </button>
                  );
                })}
              </div>

              {isLoadingAlbum ? (
                <div className="mt-8 columns-1 gap-3 sm:columns-2 lg:columns-3">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <Skeleton
                      key={idx}
                      className={`mb-3 w-full break-inside-avoid rounded-xl ${
                        idx % 3 === 0 ? 'aspect-[3/4]' : idx % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'
                      }`}
                    />
                  ))}
                </div>
              ) : albumItems.length === 0 ? (
                <div className="mt-12 rounded-2xl border border-dashed border-black/15 bg-slate-50/80 px-6 py-16 text-center">
                  <Images className="mx-auto size-10 text-slate-300" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-slate-600">Belum ada foto di album ini.</p>
                  <p className="mt-1 text-sm text-slate-500">Foto akan muncul setelah admin mengunggahnya.</p>
                </div>
              ) : (
                <div className="mt-8 columns-1 gap-3 sm:columns-2 lg:columns-3">
                  {albumItems.map((it, idx) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setLightbox({ albumId: activeAlbum!.id, index: idx })}
                      className={`group relative mb-3 w-full break-inside-avoid overflow-hidden rounded-xl bg-slate-100 text-left transition duration-300 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45 ${
                        idx % 5 === 0 ? 'aspect-[3/4]' : idx % 5 === 2 ? 'aspect-square' : 'aspect-[4/3]'
                      }`}
                    >
                      <PublicCoverImage
                        url={it.image_url}
                        alt={it.caption || activeAlbum!.title}
                        imgClassName="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 p-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <p className="truncate text-sm font-medium text-white">
                          {it.caption || 'Perbesar'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>

      {lightboxAlbum && lightboxItem ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-black/88"
            onClick={() => setLightbox(null)}
          />
          <div
            ref={lightboxDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-lightbox-title"
            tabIndex={-1}
            className="relative flex h-[100dvh] w-full max-w-6xl flex-col outline-none sm:h-auto sm:max-h-[92vh] sm:px-4"
          >
            <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-0 sm:py-4">
              <div className="min-w-0">
                <h2 id="gallery-lightbox-title" className="truncate text-sm font-semibold tracking-tight sm:text-base">
                  {lightboxAlbum.title}
                </h2>
                <p className="mt-0.5 text-xs text-white/65">
                  {photoIndex} / {totalPhotos}
                  {lightboxItem.caption ? ` · ${lightboxItem.caption}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                onClick={() => setLightbox(null)}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              <div className="relative max-h-[78vh] w-full overflow-hidden bg-black sm:rounded-lg">
                <PublicCoverImage
                  url={lightboxItem.image_url}
                  alt={lightboxItem.caption || lightboxAlbum.title}
                  imgClassName="object-contain bg-black"
                  displayWidth={1600}
                />
              </div>

              {totalPhotos > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox((s) =>
                        s ? { ...s, index: (s.index - 1 + totalPhotos) % totalPhotos } : s,
                      )
                    }
                    className="absolute left-2 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/90 transition hover:bg-black/60 sm:left-0 sm:-translate-x-1/2"
                    aria-label="Sebelumnya"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox((s) => (s ? { ...s, index: (s.index + 1) % totalPhotos } : s))
                    }
                    className="absolute right-2 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/90 transition hover:bg-black/60 sm:right-0 sm:translate-x-1/2"
                    aria-label="Selanjutnya"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              ) : null}
            </div>

            {lightboxItem.caption ? (
              <p className="relative z-10 mx-auto max-w-3xl px-4 py-4 text-center text-sm text-white/80 sm:px-0">
                {lightboxItem.caption}
              </p>
            ) : (
              <div className="h-4 sm:h-6" />
            )}
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}
