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

  const { data: paged, isLoading } = useSWR<Paged<PublicPost>>(queryUrl, fetcher, { revalidateOnFocus: false });
  const items = paged?.items ?? [];
  const showLoading = (isLoading && items.length === 0) || (isLoadingCategories && categories.length === 0);

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
              className="h-11 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[var(--public-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35 dark:border-white/10 dark:bg-zinc-950 dark:text-slate-100"
            />
          </div>
        </PublicPageHero>

        <PublicReveal className="mx-auto max-w-7xl px-6 pb-16">
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                !categorySlug
                  ? 'bg-[var(--public-primary)] text-white shadow-[0_12px_22px_rgba(37,99,235,0.32)]'
                  : 'border border-black/10 bg-white text-slate-700 hover:border-[var(--public-primary)]/30 dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200'
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
                          : 'border border-black/10 bg-white text-slate-700 hover:border-[var(--public-primary)]/30 dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200'
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
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
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
            <div className="relative mt-10 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 sm:p-10">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Belum ada berita</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan berita dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:gap-8 lg:grid-cols-3">
              {items.map((p) => {
                return (
                <Link
                  key={p.id}
                  to={`/berita/${p.slug}`}
                  className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)] dark:focus-visible:ring-offset-zinc-950"
                >
                  <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                    <PublicCoverImage url={p.cover_image_url} alt={p.title} />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                      <span>{p.category?.name ?? 'Berita'}</span>
                      {p.date_label ? <span className="text-slate-300 dark:text-slate-600">•</span> : null}
                      {p.date_label ? <span className="normal-case tracking-normal">{p.date_label}</span> : null}
                    </div>
                    <div className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white line-clamp-2">{p.title}</div>
                    {p.excerpt ? (
                      <div className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-3">{p.excerpt}</div>
                    ) : null}
                    <div className="mt-5 inline-flex items-center rounded-lg bg-[var(--public-primary)]/10 px-3 py-1.5 text-sm font-semibold text-[var(--public-primary)]">
                      Baca selengkapnya
                    </div>
                  </div>
                </Link>
                );
              })}
            </div>
          )}

          {paged ? (
            <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={paged.page <= 1}
                onClick={() => goPage(paged.page - 1)}
                className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45 dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200"
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
                          : 'border border-black/10 bg-white text-slate-700 hover:border-[var(--public-primary)]/30 dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200'
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
                className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45 dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200"
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

