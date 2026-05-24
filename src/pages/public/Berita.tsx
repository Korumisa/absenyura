import React, { useMemo } from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicCategory, PublicPost } from '@/types/publicSite';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import PublicCoverImage from '@/components/PublicCoverImage';
import useFirstLoadOverlay from '@/lib/useFirstLoadOverlay';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

export default function Berita() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const [params, setParams] = useSearchParams();

  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const q = params.get('q') || '';
  const categorySlug = params.get('kategori') || '';

  const { data: categories = [], isLoading: isLoadingCategories } = useSWR<PublicCategory[]>('/public-site/categories', fetcher, { revalidateOnFocus: false });

  const queryUrl = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('type', 'BERITA');
    sp.set('page', String(page));
    sp.set('pageSize', '6');
    if (q.trim()) sp.set('q', q.trim());
    if (categorySlug) sp.set('categorySlug', categorySlug);
    return `/public-site/posts?${sp.toString()}`;
  }, [page, q, categorySlug]);

  const postsSwr = useSWR<Paged<PublicPost>>(queryUrl, fetcher, { revalidateOnFocus: false });
  const { data: paged, isInitialLoading: isLoading, isError, retry } = useSwrPageState(postsSwr);
  const items = paged?.items ?? [];
  const showLoading = useFirstLoadOverlay(isLoading || isLoadingCategories);

  if (isError) {
    return (
      <PublicPageError title="Gagal memuat berita" error={postsSwr.error} onRetry={retry} />
    );
  }

  const setCategory = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('kategori', slug);
    else next.delete('kategori');
    next.set('page', '1');
    setParams(next);
  };

  const setQuery = (value: string) => {
    const next = new URLSearchParams(params);
    if (value.trim()) next.set('q', value);
    else next.delete('q');
    next.set('page', '1');
    setParams(next);
  };

  const goPage = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  };
  const pageNumbers = useMemo(() => {
    if (!paged) return [];
    const total = paged.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, paged.page - 2);
    const end = Math.min(total, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    const middle = Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
    return [1, ...middle.filter((n) => n !== 1 && n !== total), total];
  }, [paged]);

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={showLoading} />
      <PublicEnter>
        <PublicPageHero top="Berita" bottom="Terbaru" subtitle="Baca update kampus, prestasi, dan info penting. Formatnya singkat, jelas, dan enak dibagikan.">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari berita..."
              className="h-11 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[var(--public-primary)]/60 focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/40"
            />
          </div>
        </PublicPageHero>

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                !categorySlug
                  ? 'bg-[var(--public-primary)] text-white shadow-[0_12px_22px_rgba(37,99,235,0.32)]'
                  : 'border border-black/10 bg-white text-slate-700 hover:border-[var(--public-primary)]/30'
              }`}
            >
              Semua
            </button>
            {isLoadingCategories
              ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-9 w-24 rounded-full" />)
              : categories.map((c) => {
                  const active = categorySlug === c.slug;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.slug)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? 'bg-[var(--public-primary)] text-white shadow-[0_12px_22px_rgba(37,99,235,0.32)]'
                          : 'border border-black/10 bg-white text-slate-700 hover:border-[var(--public-primary)]/30'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
          </div>

          {isLoading ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:gap-8 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="p-5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="mt-3 h-6 w-11/12" />
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-10/12" />
                    <Skeleton className="mt-5 h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <PublicEmptyState
              title="Belum ada berita"
              description="Admin bisa menambahkan berita dari menu Konten Website."
            />
          ) : (
            <div className="relative mt-10">
              <div className="pointer-events-none absolute left-[116px] top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent md:block" />
              <div className="space-y-10">
                {items.map((p) => {
                  const date = p.date_label ? String(p.date_label) : '';
                  return (
                    <div key={p.id} className="grid gap-4 md:grid-cols-[96px_40px_1fr] md:items-start">
                      <div className="hidden pt-2 text-right text-xs font-semibold text-muted-foreground md:block">{date || '-'}</div>
                      <div className="relative hidden md:flex md:justify-center">
                        <div className="mt-3 h-4 w-4 rounded-full bg-white ring-2 ring-[var(--public-primary)]/55" />
                      </div>
                      <Link
                        to={`/berita/${p.slug}`}
                        className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                          <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] md:aspect-auto">
                            <div className="aspect-[16/10] w-full md:aspect-auto md:h-full">
                              <PublicCoverImage url={p.cover_image_url} alt={p.title} imgClassName="object-cover transition duration-700 group-hover:scale-[1.01]" />
                            </div>
                          </div>
                          <div className="p-5">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                              <span>{p.category?.name ?? 'Berita'}</span>
                              {date ? <span className="text-slate-300">•</span> : null}
                              {date ? <span className="normal-case tracking-normal">{date}</span> : null}
                            </div>
                            <div className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 line-clamp-2 md:text-xl">{p.title}</div>
                            {p.excerpt ? (
                              <div className="mt-3 text-sm leading-relaxed text-slate-700 line-clamp-3">{p.excerpt}</div>
                            ) : (
                              <div className="mt-3 text-sm text-muted-foreground line-clamp-3">Ringkasan belum tersedia.</div>
                            )}
                            <div className="mt-5 inline-flex items-center rounded-xl border border-[var(--public-primary)]/35 bg-white px-4 py-2 text-sm font-semibold text-[var(--public-primary)] transition group-hover:bg-[var(--public-primary)]/5">
                              Baca Selengkapnya
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {paged ? (
            <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={paged.page <= 1}
                onClick={() => goPage(paged.page - 1)}
                className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
              >
                Sebelumnya
              </button>
              {pageNumbers.map((p, idx) => {
                const active = p === paged.page;
                const prev = pageNumbers[idx - 1];
                const showEllipsis = typeof prev === 'number' && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis ? <span className="px-1 text-sm text-slate-400">...</span> : null}
                    <button
                      type="button"
                      onClick={() => goPage(p)}
                      className={`h-10 w-10 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45 ${
                        active
                          ? 'bg-[var(--public-primary)] text-white'
                          : 'border border-black/10 bg-white text-slate-700 hover:border-[var(--public-primary)]/30'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
              <button
                type="button"
                disabled={paged.page >= paged.totalPages}
                onClick={() => goPage(paged.page + 1)}
                className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
              >
                Selanjutnya
              </button>
            </div>
          ) : null}
        </PublicReveal>
      </PublicEnter>
    </PublicLayout>
  );
}

