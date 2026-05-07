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
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Belum ada album galeri</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan album dan foto dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {albums.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpenId(a.id)}
                className="group text-left overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/30 dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]"
              >
                <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                  {a.items?.[0]?.image_url ? (
                    <img src={a.items[0].image_url} alt={a.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                  ) : null}
                </div>
                <div className="p-5">
                  <div className="text-base font-semibold text-slate-900 dark:text-white">{a.title}</div>
                  {a.description ? <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{a.description}</div> : null}
                  <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                    {a.items.length} foto
                  </div>
                </div>
              </button>
            ))}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/50" onClick={() => setOpenId(null)} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.7)]"
          >
            <div className="flex items-start justify-between gap-6 border-b border-black/10 p-6 dark:border-white/10">
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
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {selected.items.length === 0 ? (
                <div className="text-center text-sm font-medium text-slate-500 dark:text-slate-300">Belum ada foto</div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {selected.items.map((it) => (
                    <div key={it.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                      <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-white/5">
                        {it.image_url ? <img src={it.image_url} alt={it.caption || selected.title} className="h-full w-full object-cover" /> : null}
                      </div>
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

