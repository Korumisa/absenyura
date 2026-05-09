import React, { useEffect, useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicGalleryAlbum, PublicProfile } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import PublicPhotoFrame from '@/components/PublicPhotoFrame';
import PublicCoverImage from '@/components/PublicCoverImage';
import useLockBodyScroll from '@/lib/useLockBodyScroll';
import useFirstLoadOverlay from '@/lib/useFirstLoadOverlay';

export default function Galeri() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const { data: albums = [], isLoading } = useSWR<PublicGalleryAlbum[]>('/public-site/galleries', fetcher, { revalidateOnFocus: false });
  const showLoading = useFirstLoadOverlay(isLoading);
  const orgName = profile?.org_name ?? '';

  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ albumId: string; index: number } | null>(null);
  useLockBodyScroll(Boolean(lightbox));

  useEffect(() => {
    if (!activeAlbumId && albums.length > 0) setActiveAlbumId(albums[0].id);
  }, [activeAlbumId, albums]);

  const activeAlbum = useMemo(() => albums.find((a) => a.id === activeAlbumId) ?? null, [albums, activeAlbumId]);
  const lightboxAlbum = useMemo(() => (lightbox ? albums.find((a) => a.id === lightbox.albumId) ?? null : null), [albums, lightbox]);
  const lightboxItem = useMemo(() => {
    if (!lightboxAlbum || !lightbox) return null;
    return lightboxAlbum.items?.[lightbox.index] ?? null;
  }, [lightboxAlbum, lightbox]);

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={showLoading} />
      <PublicEnter>
        <PublicPageHero top="Galeri" bottom="Kegiatan" subtitle="Dokumentasi kegiatan, momen, dan karya. Album bisa dikelola dari menu Konten Website." />

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          {isLoading ? (
            <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="p-5">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-10/12" />
                    <Skeleton className="mt-4 h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : albums.length === 0 ? (
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-slate-600 sm:p-10">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900">Belum ada album galeri</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan album dan foto dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
              <aside className="space-y-4">
                <div className="text-sm font-semibold text-slate-900">Album</div>
                <div className="space-y-3">
                  {albums.map((a) => {
                    const isActive = a.id === activeAlbumId;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setActiveAlbumId(a.id)}
                        className={`flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-3 text-left transition ${
                          isActive ? 'border-[var(--public-primary)]/35 bg-[var(--public-primary)]/5' : 'border-black/10 bg-white hover:border-[var(--public-primary)]/25'
                        }`}
                      >
                        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-slate-50">
                          <PublicCoverImage url={a.items?.[0]?.image_url} alt={a.title} imgClassName="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">{a.title}</div>
                          {a.description ? <div className="mt-1 line-clamp-1 text-xs text-slate-600">{a.description}</div> : null}
                        </div>
                        <div className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {a.items?.length ?? 0}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="min-w-0">
                <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)]">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Galeri</div>
                      <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                        {activeAlbum?.title || 'Pilih album'}
                      </div>
                      {activeAlbum?.description ? <div className="mt-2 text-sm text-slate-600">{activeAlbum.description}</div> : null}
                      {!activeAlbum?.description ? (
                        <div className="mt-2 text-sm text-slate-600">Dokumentasi kegiatan terbaru dari {orgName || 'organisasi'}.</div>
                      ) : null}
                    </div>
                    <div className="inline-flex items-center rounded-full bg-[var(--public-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--public-primary)]">
                      {activeAlbum?.items?.length ?? 0} foto
                    </div>
                  </div>

                  {!activeAlbum ? (
                    <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-slate-50/80 p-6 text-sm text-slate-600">
                      Pilih album di sebelah kiri untuk melihat semua foto.
                    </div>
                  ) : activeAlbum.items.length === 0 ? (
                    <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-slate-50/80 p-6 text-sm text-slate-600">
                      Belum ada foto di album ini.
                    </div>
                  ) : (
                    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {activeAlbum.items.map((it, idx) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setLightbox({ albumId: activeAlbum.id, index: idx })}
                          className="group overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-[0_18px_45px_-42px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25"
                        >
                          <PublicPhotoFrame className="aspect-[4/3] w-full" inset={10}>
                            <PublicCoverImage url={it.image_url} alt={it.caption || activeAlbum.title} imgClassName="transition duration-500 group-hover:scale-[1.02]" />
                          </PublicPhotoFrame>
                          {it.caption ? <div className="p-4 text-sm font-medium text-slate-700">{it.caption}</div> : <div className="p-4 text-sm text-slate-500">Klik untuk memperbesar</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </PublicReveal>
      </PublicEnter>

      {lightboxAlbum && lightboxItem ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setLightbox(null)}
          />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.65)]">
            <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">{lightboxAlbum.title}</div>
                <div className="mt-0.5 truncate text-xs text-slate-600">{lightboxItem.caption || 'Foto'}</div>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white p-2 text-slate-800 hover:bg-slate-50"
                onClick={() => setLightbox(null)}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative bg-black">
              <div className="mx-auto max-h-[78vh] w-full">
                <PublicCoverImage url={lightboxItem.image_url} alt={lightboxItem.caption || lightboxAlbum.title} imgClassName="object-contain bg-black" />
              </div>

              <button
                type="button"
                onClick={() => {
                  const total = lightboxAlbum.items.length;
                  setLightbox((s) => (s ? { ...s, index: (s.index - 1 + total) % total } : s));
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
                aria-label="Sebelumnya"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const total = lightboxAlbum.items.length;
                  setLightbox((s) => (s ? { ...s, index: (s.index + 1) % total } : s));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
                aria-label="Selanjutnya"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}

