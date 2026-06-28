import React, { useMemo, useRef } from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProgram } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicProgramCard from '@/components/PublicProgramCard';
import useHorizontalWheelScroll from '@/lib/a11y/useHorizontalWheelScroll';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';

function extractDivisionFallback(program: PublicProgram) {
  const raw = String(program.description ?? '').trim();
  if (raw) {
    for (const line of raw.split('\n')) {
      const m = line.trim().match(/^divisi\s*:\s*(.+)$/i);
      if (m?.[1]) return m[1].trim();
    }
  }
  const title = String(program.title ?? '').trim();
  const bracket = title.match(/^\[([^\]]{2,32})\]\s*(.+)$/);
  if (bracket?.[1]) return bracket[1].trim();
  return null;
}

export default function ProgramKerja() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const swr = useSWR<PublicProgram[]>('/public-site/programs', fetcher, { revalidateOnFocus: false });
  const { data, isPending, isError, retry } = useSwrPageState(swr);
  const items = useMemo(() => data ?? [], [data]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const groups = useMemo(() => {
    const orderedKeys: string[] = [];
    const map = new Map<string, PublicProgram[]>();
    for (const p of items) {
      const div = p.division || extractDivisionFallback(p) || 'Lainnya';
      if (!map.has(div)) {
        map.set(div, []);
        orderedKeys.push(div);
      }
      map.get(div)!.push(p);
    }
    return orderedKeys.map((k) => ({ title: k, items: map.get(k) ?? [] }));
  }, [items]);
  const wheel = useHorizontalWheelScroll(groups.length > 1);

  if (isError) {
    return <PublicPageError title="Gagal memuat program kerja" error={swr.error} onRetry={retry} />;
  }

  function scrollByPage(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const page = Math.max(320, el.clientWidth);
    el.scrollBy({ left: dir * page, behavior: 'smooth' });
  }

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={isPending} label="Memuat program kerja..." />
      <PublicEnter>
        <PublicPageHero top="Program" bottom="Kerja" subtitle="Daftar program kerja yang dapat dipantau publik dan dikelola oleh admin." />

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          {isPending ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-black/10 bg-white p-6">
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
            <PublicEmptyState
              title="Belum ada program kerja"
              description="Admin bisa menambahkan program kerja dari menu Konten Website."
            />
          ) : (
            <div className="mt-8">
              {groups.length <= 1 ? (
                <div className="grid gap-5 md:grid-cols-2 lg:gap-6 lg:grid-cols-3">
                  {items.map((program, idx) => (
                    <PublicProgramCard key={program.id} program={program} index={idx} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Geser untuk ganti divisi</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => scrollByPage(-1)}
                        className="inline-flex size-9 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-slate-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35"
                        aria-label="Sebelumnya"
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollByPage(1)}
                        className="inline-flex size-9 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-slate-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35"
                        aria-label="Berikutnya"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="relative -mr-6 pr-6">
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-50/95 to-transparent" />
                    <div
                      ref={(node) => {
                        scrollerRef.current = node;
                        wheel.ref(node);
                      }}
                      className="mt-5 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide"
                      style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain', overscrollBehaviorY: 'contain' }}
                      role="region"
                      aria-label="Program kerja per divisi"
                      tabIndex={0}
                    >
                      <div className="flex w-max gap-6 pr-2">
                        {groups.map((g, gi) => (
                          <section key={`${g.title}-${gi}`} className="w-[calc(100vw-3rem)] max-w-7xl snap-start">
                            <div className="flex items-center gap-4">
                              <div className="text-sm font-extrabold tracking-tight text-slate-900">{g.title}</div>
                              <div className="h-px flex-1 bg-gradient-to-r from-[var(--public-primary)]/35 to-transparent" />
                            </div>
                            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:gap-6 lg:grid-cols-3">
                              {g.items.map((program, idx) => (
                                <PublicProgramCard key={program.id} program={program} index={idx} />
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>
    </PublicLayout>
  );
}

