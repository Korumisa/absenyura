import React from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicStructureGroup } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import PublicPhotoFrame from '@/components/PublicPhotoFrame';
import PublicCoverImage from '@/components/PublicCoverImage';

export default function Fungsionaris() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: groups = [], isLoading } = useSWR<PublicStructureGroup[]>('/public-site/structure', fetcher, { revalidateOnFocus: false });
  const showLoading = isLoading && groups.length === 0;

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={showLoading} />
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
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 sm:p-10">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Struktur organisasi belum diatur</div>
                <div className="mt-2 max-w-2xl">Admin bisa mengatur grup dan anggota dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-10 space-y-16">
            {groups.map((group, gidx) => (
              <section key={group.id} className="relative">
                <div className="pointer-events-none absolute -left-16 -top-12 h-56 w-56 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/10 blur-3xl" />
                <div className={`pointer-events-none absolute -right-20 -bottom-10 h-64 w-64 blur-3xl ${gidx % 2 === 0 ? 'rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10' : 'rounded-[42%_58%_52%_48%/54%_44%_56%_46%] bg-indigo-400/10'}`} />

                <div className="mb-8 text-center text-3xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-4xl md:text-5xl">
                  {group.title}
                </div>
                {(group.members ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-5 text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
                    Anggota belum diisi.
                  </div>
                ) : (
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-x-0 -top-6 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/10" />
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {(group.members ?? []).map((p, idx) => {
                      const initial = String(p.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';
                      const variant =
                        idx % 3 === 0
                          ? 'from-black/75 via-black/10'
                          : idx % 3 === 1
                            ? 'from-black/70 via-black/8'
                            : 'from-black/80 via-black/12';
                      return (
                        <div
                          key={p.id}
                          className="group relative w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:border-[var(--public-primary)]/25 hover:shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)] dark:hover:shadow-[0_22px_56px_-48px_rgba(0,0,0,0.75)] active:scale-[0.99]"
                        >
                          <PublicPhotoFrame className="aspect-[4/3] w-full sm:aspect-[4/5]" inset={10}>
                            {p.photo_url ? (
                              <PublicCoverImage url={p.photo_url} alt={p.name} imgClassName="transition duration-300 group-hover:scale-[1.02]" />
                            ) : (
                              <div className="relative h-full w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.32),rgba(15,23,42,0.08))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.28),rgba(255,255,255,0.04))]">
                                <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.75),transparent_58%)]" />
                                <div className="grid h-full w-full place-items-center text-5xl font-extrabold text-white/90 drop-shadow-sm">
                                  {initial}
                                </div>
                              </div>
                            )}
                          </PublicPhotoFrame>
                          <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t ${variant} to-transparent sm:h-28`} />
                          <div className="absolute inset-x-0 bottom-0 p-4">
                            <div className="truncate text-sm font-extrabold tracking-tight text-white sm:text-base">{p.name}</div>
                            <div className="mt-1 inline-flex max-w-full rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/10 backdrop-blur">
                              <span className="truncate">{p.role}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </section>
            ))}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>
    </PublicLayout>
  );
}

