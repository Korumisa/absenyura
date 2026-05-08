import React from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProgram } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import PublicProgramCard from '@/components/PublicProgramCard';

export default function ProgramKerja() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: items = [], isLoading } = useSWR<PublicProgram[]>('/public-site/programs', fetcher, { revalidateOnFocus: false });
  const showLoading = isLoading && items.length === 0;
  const recentCount = items.filter((x) => {
    const t = Date.parse(x.updated_at);
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < 1000 * 60 * 60 * 24 * 30;
  }).length;

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={showLoading} />
      <PublicEnter>
        <PublicPageHero top="Program" bottom="Kerja" subtitle="Daftar program kerja yang dapat dipantau publik dan dikelola oleh admin." />

        <PublicReveal className="mx-auto max-w-7xl px-6 pb-16">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-white/90 px-5 py-4 dark:border-white/10 dark:bg-zinc-900/80">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{items.length}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Total Program</div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/90 px-5 py-4 dark:border-white/10 dark:bg-zinc-900/80">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{recentCount}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Update 30 Hari</div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/90 px-5 py-4 dark:border-white/10 dark:bg-zinc-900/80">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{Math.max(items.length - recentCount, 0)}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Arsip Program</div>
            </div>
          </div>

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
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 sm:p-10">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Belum ada program kerja</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan program kerja dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <div className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Daftar Program
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:gap-6 lg:grid-cols-3">
                {items.map((program, idx) => (
                  <div key={program.id} className={idx === 0 ? 'md:col-span-2 lg:col-span-1' : ''}>
                    <PublicProgramCard program={program} index={idx} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </PublicReveal>
      </PublicEnter>
    </PublicLayout>
  );
}

