import React, { useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicRecruitment } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';

export default function OpenRecruitment() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: items = [], isLoading } = useSWR<PublicRecruitment[]>('/public-site/recruitments', fetcher, { revalidateOnFocus: false });
  const showLoading = isLoading && items.length === 0;

  const [openId, setOpenId] = useState<string | null>(null);
  const selected = useMemo(() => items.find((x) => x.id === openId) ?? null, [items, openId]);

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={showLoading} />
      <PublicEnter>
        <PublicPageHero top="Open" bottom="Recruitment" subtitle="Informasi pendaftaran, deskripsi, dan link form. Bisa dikelola dari menu Konten Website." />

        <PublicReveal className="mx-auto max-w-7xl px-6 pb-16">
          {isLoading ? (
            <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="p-5">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="mt-3 h-4 w-24" />
                  <Skeleton className="mt-4 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-10/12" />
                  <div className="mt-5 flex items-center justify-between">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
            </div>
          ) : items.length === 0 ? (
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Belum ada open recruitment</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan open recruitment dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
              <div
                key={r.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]"
              >
                <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]" />
                <div className="p-5">
                  <div className="text-base font-semibold text-slate-900 dark:text-white">{r.title}</div>
                  <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{r.date_range ?? '-'}</div>
                  {r.description ? <div className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{r.description}</div> : null}
                  <div className="mt-5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setOpenId(r.id)}
                      className="rounded-lg border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[var(--public-primary)]/30 dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200"
                    >
                      Detail
                    </button>
                    {r.form_url ? (
                      <a
                        href={r.form_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-[var(--public-primary)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
                      >
                        Daftar
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
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
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.7)]"
          >
            <div className="aspect-[16/8] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]" />
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">{selected.title}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selected.date_range ?? '-'}</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-[var(--public-primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                  onClick={() => setOpenId(null)}
                >
                  Tutup
                </button>
              </div>
              {selected.description ? <div className="mt-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{selected.description}</div> : null}

              {selected.committee?.length ? (
                <div className="mt-6">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Panitia</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {selected.committee.map((p) => (
                      <div key={p.id} className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                        <div className="text-sm font-semibold text-slate-800 dark:text-white">{p.name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">{p.role}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.form_url ? (
                <div className="mt-8 flex justify-end">
                  <a
                    href={selected.form_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[var(--public-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
                  >
                    Daftar Sekarang
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}

