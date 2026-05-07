import React from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProgram } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';

export default function ProgramKerja() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: items = [], isLoading } = useSWR<PublicProgram[]>('/public-site/programs', fetcher, { revalidateOnFocus: false });

  return (
    <PublicLayout>
      <PublicEnter>
        <PublicPageHero top="Program" bottom="Kerja" subtitle="Daftar program kerja yang dapat dipantau publik dan dikelola oleh admin." />

        <PublicReveal className="mx-auto max-w-7xl px-6 pb-16">
          {isLoading ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-4 w-24" />
                <Skeleton className="mt-5 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-11/12" />
                <Skeleton className="mt-2 h-4 w-10/12" />
              </div>
            ))}
            </div>
          ) : items.length === 0 ? (
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Belum ada program kerja</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan program kerja dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <div
                  key={p.id}
                  className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]"
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-[var(--public-primary)]/10 blur-3xl" />
                  <div className="pointer-events-none absolute -left-10 -bottom-10 h-44 w-44 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-sky-400/10 blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-800 dark:text-white">{p.title}</div>
                      <span className="rounded-full bg-[var(--public-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--public-primary)]">
                        Publik
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.date_range ?? '-'}</div>
                    {p.description ? (
                      <div className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{p.description}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>
    </PublicLayout>
  );
}

