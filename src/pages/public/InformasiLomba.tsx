import React, { useMemo, useRef, useState } from 'react';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import PublicLayout from '@/components/PublicLayout';
import { Search } from 'lucide-react';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicPost } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import useLockBodyScroll from '@/lib/a11y/useLockBodyScroll';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';

type Status = 'Buka' | 'Tutup';
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

function extractFirstUrl(text: string) {
  const m = text.match(/https?:\/\/[^\s)]+/i);
  return m ? m[0] : null;
}

function getJoinUrl(p: PublicPost) {
  const direct = String(p.form_url ?? '').trim();
  if (direct) return direct;
  const fromContent = p.content ? extractFirstUrl(p.content) : null;
  if (fromContent) return fromContent;
  const fromExcerpt = p.excerpt ? extractFirstUrl(p.excerpt) : null;
  return fromExcerpt;
}

export default function InformasiLomba() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const swr = useSWR<Paged<PublicPost>>('/public-site/posts?type=LOMBA&page=1&pageSize=24', fetcher, { revalidateOnFocus: false });
  const { data: paged, isInitialLoading: isLoading, isError, retry } = useSwrPageState(swr);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'Semua' | Status>('Semua');
  const [openId, setOpenId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useDialogA11y(Boolean(openId), () => setOpenId(null), { containerRef: modalRef });

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lomba = paged?.items ?? [];
    return lomba.filter((l) => {
      const okQuery = !q || l.title.toLowerCase().includes(q);
      const okFilter = filter === 'Semua' ? true : (l.status ?? 'Buka') === filter;
      return okQuery && okFilter;
    });
  }, [paged?.items, query, filter]);

  const selected = useMemo(() => (paged?.items ?? []).find((l) => l.id === openId) ?? null, [paged?.items, openId]);
  useLockBodyScroll(Boolean(selected));

  if (isError) {
    return <PublicPageError title="Gagal memuat informasi lomba" error={swr.error} onRetry={retry} />;
  }

  return (
    <PublicLayout>
      <PublicEnter>
        <PublicPageHero top="Informasi" bottom="Lomba" subtitle="Info lomba yang masih buka/tutup, lengkap dengan detail. Konten dikelola dari menu Konten Website." />

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama lomba..."
                className="h-11 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[var(--public-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35"
              />
            </div>

            <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-black/10 bg-white p-1 scrollbar-hide md:w-fit md:overflow-visible">
              {(['Semua', 'Buka', 'Tutup'] as const).map((t) => {
                const isActive = filter === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilter(t)}
                    className={`h-11 flex-none whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45 sm:px-6 ${
                      isActive ? 'bg-[var(--public-primary)] text-white' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {!paged ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:gap-8 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <Skeleton className="aspect-[4/5] w-full rounded-none" />
                  <div className="p-5">
                    <Skeleton className="h-5 w-10/12" />
                    <Skeleton className="mt-2 h-4 w-24" />
                    <div className="mt-4 flex items-center justify-between">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-9 w-28 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <PublicEmptyState
              title="Belum ada informasi lomba"
              description="Admin bisa menambahkan post tipe LOMBA dari menu Konten Website."
            />
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:gap-8 lg:grid-cols-3">
              {items.map((l) => (
                <div
                  key={l.id}
                  className="group overflow-hidden rounded-2xl border border-[var(--public-primary)]/30 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)]"
                >
                  <div className="relative aspect-[4/3] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]">
                    <PublicCoverImage url={l.cover_image_url} alt={l.title} imgClassName="object-cover transition duration-700 group-hover:scale-[1.02]" />
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-extrabold tracking-tight text-slate-900 line-clamp-2">{l.title}</div>
                        <div className="mt-2 text-sm font-semibold text-muted-foreground">
                          {l.date_label ? `Batas Pendaftaran : ${l.date_label}` : 'Batas Pendaftaran : -'}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          (l.status ?? 'Buka') === 'Buka'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {l.status ?? 'Buka'}
                      </span>
                    </div>

                    {l.excerpt ? <div className="mt-4 text-sm leading-relaxed text-slate-700 line-clamp-3">{l.excerpt}</div> : null}

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => setOpenId(l.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--public-primary)]/45 bg-white px-5 py-3 text-sm font-semibold text-[var(--public-primary)] transition hover:bg-[var(--public-primary)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setOpenId(null)}
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] outline-none"
          >
            <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-slate-900">{selected.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{selected.date_label ?? '-'}</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--public-primary)]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                  onClick={() => setOpenId(null)}
                >
                  Tutup
                </button>
                {(() => {
                  const joinUrl = getJoinUrl(selected);
                  const isOpen = (selected.status ?? 'Buka') === 'Buka';
                  if (!isOpen || !joinUrl) return null;
                  return (
                    <a
                      href={joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-[var(--public-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(37,99,235,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                    >
                      Daftar
                    </a>
                  );
                })()}
              </div>
            </div>

            <div className="grid max-h-[82vh] gap-6 overflow-y-auto p-4 sm:p-6 md:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-slate-50">
                <div className="aspect-[4/5] w-full">
                  <PublicCoverImage url={selected.cover_image_url} alt={selected.title} imgClassName="object-cover" />
                </div>
              </div>
              <div className="min-w-0">
                {selected.excerpt ? <div className="text-sm leading-relaxed text-slate-700">{selected.excerpt}</div> : null}
                {selected.content ? <div className="mt-4 break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selected.content}</div> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}

