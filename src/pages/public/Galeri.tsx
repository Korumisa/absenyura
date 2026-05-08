import React, { useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicGalleryAlbum } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import PublicPhotoFrame from '@/components/PublicPhotoFrame';
import PublicCoverImage from '@/components/PublicCoverImage';

export default function Galeri() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: albums = [], isLoading } = useSWR<PublicGalleryAlbum[]>('/public-site/galleries', fetcher, { revalidateOnFocus: false });
  const showLoading = isLoading && albums.length === 0;

  const [openId, setOpenId] = useState<string | null>(null);
  const selected = useMemo(() => albums.find((a) => a.id === openId) ?? null, [albums, openId]);

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={showLoading} />
      <PublicEnter>
        <PublicPageHero top="Galeri" bottom="Kegiatan" subtitle="Dokumentasi kegiatan, momen, dan karya. Album bisa dikelola dari menu Konten Website." />

        <PublicReveal className="mx-auto max-w-7xl px-6 pb-16">
          {isLoading ? (
            <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
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
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 sm:p-10">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Belum ada album galeri</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan album dan foto dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            (() => {
              const featured = albums[0];
              const rest = albums.slice(1);

              return (
                <div className="mt-6 space-y-8">
                  <button
                    type="button"
                    onClick={() => setOpenId(featured.id)}
                    className="group relative w-full overflow-hidden rounded-3xl border border-black/10 bg-white text-left shadow-[0_28px_70px_-52px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/30 dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_28px_70px_-52px_rgba(0,0,0,0.7)]"
                  >
                    <div className="grid gap-0 lg:grid-cols-2">
                      <div className="relative">
                        <PublicPhotoFrame className="aspect-[16/10] w-full lg:aspect-auto lg:h-full" inset={12}>
                          <PublicCoverImage
                            url={featured.items?.[0]?.image_url}
                            alt={featured.title}
                            imgClassName="transition duration-700 group-hover:scale-[1.02]"
                          />
                        </PublicPhotoFrame>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-90 lg:hidden" />
                        <div className="absolute inset-x-0 bottom-0 p-5 lg:hidden">
                          <div className="text-xl font-extrabold tracking-tight text-white line-clamp-2">{featured.title}</div>
                          <div className="mt-2 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/10 backdrop-blur">
                            {featured.items?.length ?? 0} foto
                          </div>
                        </div>
                      </div>

                      <div className="relative p-6 md:p-8">
                        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-[var(--public-primary)]/10 blur-3xl" />
                        <div className="relative">
                          <div className="hidden text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300 lg:block">
                            Highlight Album
                          </div>
                          <div className="mt-2 hidden text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:block">
                            {featured.title}
                          </div>
                          {featured.description ? (
                            <div className="mt-3 text-sm leading-relaxed text-slate-700 line-clamp-4 dark:text-slate-300">
                              {featured.description}
                            </div>
                          ) : (
                            <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">Dokumentasi kegiatan terbaru.</div>
                          )}
                          <div className="mt-6 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center rounded-full bg-[var(--public-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--public-primary)]">
                              {featured.items?.length ?? 0} foto
                            </div>
                            <div className="inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                              Klik untuk lihat
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {rest.map((a, idx) => {
                      const accent =
                        idx % 3 === 0
                          ? 'from-[var(--public-primary)]/35'
                          : idx % 3 === 1
                            ? 'from-sky-400/35'
                            : 'from-indigo-400/35';
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setOpenId(a.id)}
                          className="group overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/30 dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]"
                        >
                          <div className="relative">
                            <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent} via-transparent to-transparent`} />
                            <PublicPhotoFrame className="aspect-[16/10] w-full" inset={10}>
                              <PublicCoverImage
                                url={a.items?.[0]?.image_url}
                                alt={a.title}
                                imgClassName="transition duration-500 group-hover:scale-[1.02]"
                              />
                            </PublicPhotoFrame>
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent opacity-90" />
                            <div className="absolute inset-x-0 bottom-0 p-4">
                              <div className="text-base font-extrabold tracking-tight text-white line-clamp-1">{a.title}</div>
                              <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/10 backdrop-blur">
                                <span>{a.items.length} foto</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-5">
                            {a.description ? (
                              <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{a.description}</div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}
        </PublicReveal>
      </PublicEnter>

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setOpenId(null)} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative flex w-full max-w-4xl max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.7)]"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-black/10 bg-white/95 p-6 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-white">{selected.title}</div>
                {selected.description ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selected.description}</div> : null}
              </div>
              <button
                type="button"
                className="rounded-lg bg-[var(--public-primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                onClick={() => setOpenId(null)}
              >
                Tutup
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selected.items.length === 0 ? (
                <div className="text-center text-sm font-medium text-slate-500 dark:text-slate-300">Belum ada foto</div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {selected.items.map((it) => (
                    <div key={it.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                      <PublicPhotoFrame className="aspect-[4/3] w-full" inset={10}>
                        <PublicCoverImage url={it.image_url} alt={it.caption || selected.title} />
                      </PublicPhotoFrame>
                      {it.caption ? <div className="p-3 text-sm text-slate-700 dark:text-slate-200">{it.caption}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}

