import React from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicStructureGroup } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';

export default function Fungsionaris() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: groups = [], isLoading } = useSWR<PublicStructureGroup[]>('/public-site/structure', fetcher, { revalidateOnFocus: false });

  return (
    <PublicLayout>
      <PublicEnter>
        <PublicPageHero top="Struktur" bottom="Organisasi" subtitle="Susunan fungsionaris yang dapat dikelola dari menu Konten Website." />

        <PublicReveal className="mx-auto max-w-7xl px-6 pb-16">
          {isLoading ? (
            <div className="mt-6 space-y-10">
            {Array.from({ length: 2 }).map((_, gi) => (
              <div key={gi}>
                <div className="mb-6 flex justify-center">
                  <Skeleton className="h-10 w-56" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((__, idx) => (
                    <div key={idx} className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="mt-2 h-4 w-44" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Struktur organisasi belum diatur</div>
                <div className="mt-2 max-w-2xl">Admin bisa mengatur grup dan anggota dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-10 space-y-16">
            {groups.map((group) => (
              <section key={group.id}>
                <div className="mb-8 text-center text-4xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-5xl">
                  {group.title}
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {(group.members ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]"
                    >
                      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-[var(--public-primary)]/10 blur-3xl" />
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--public-primary)]/30 bg-[linear-gradient(135deg,rgba(37,99,235,0.25),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(255,255,255,0.04))]">
                          <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.8),transparent_60%)]" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-white">{p.role}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-300">{p.name}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>
    </PublicLayout>
  );
}

