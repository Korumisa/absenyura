import React, { useMemo, useRef, useState } from 'react';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import PublicLayout from '@/components/PublicLayout';
import { ArrowRight, BookOpen, CalendarDays, FileText, Search, X } from 'lucide-react';
import type { PublicPost } from '@/types/publicSite';
import type { PagedResponse } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import useLockBodyScroll from '@/lib/a11y/useLockBodyScroll';
import { useMockOrSwr } from '@/hooks/useMockOrSwr';
import { mockLomba } from '@/lib/utils/mockLandingData';
import { buildPagedResponse, safeItems } from '@/lib/utils/publicContent';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import { PublicPageMeta } from '@/components/public/PublicPageMeta';
import { publicSiteFetcher } from '@/lib/utils/publicSiteFetcher';
import { looksLikeHtml, sanitizeCmsHtml } from '@/lib/utils/sanitizeCmsHtml';
import { getGuidebookUrl, getJoinUrl } from '@/lib/utils/lombaLinks';

type Status = 'Buka' | 'Tutup';

function RichOrPlain({ value, className }: { value: string; className?: string }) {
  if (looksLikeHtml(value)) {
    return <div className={className} dangerouslySetInnerHTML={sanitizeCmsHtml(value)} />;
  }
  return <div className={`${className ?? ''} whitespace-pre-wrap`}>{value}</div>;
}

export default function InformasiLomba() {
  const { swr, data: paged, isInitialLoading: isLoading, isError, retry } = useMockOrSwr<
    PagedResponse<PublicPost>
  >({
    swrKey: '/public-site/posts?type=LOMBA&page=1&pageSize=24',
    fetcher: publicSiteFetcher<PagedResponse<PublicPost>>,
    mockStatic: () => buildPagedResponse(mockLomba, 1, 24),
  });

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'Semua' | Status>('Semua');
  const [openId, setOpenId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useDialogA11y(Boolean(openId), () => setOpenId(null), { containerRef: modalRef });

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lomba = safeItems<PublicPost>(paged);
    return lomba.filter((l) => {
      const okQuery = !q || l.title.toLowerCase().includes(q);
      const okFilter = filter === 'Semua' ? true : (l.status ?? 'Buka') === filter;
      return okQuery && okFilter;
    });
  }, [paged, query, filter]);

  const selected = useMemo(
    () => safeItems<PublicPost>(paged).find((l) => l.id === openId) ?? null,
    [paged, openId],
  );
  useLockBodyScroll(Boolean(selected));
  const selectedOpen = (selected?.status ?? 'Buka') === 'Buka';
  const selectedJoin = selected ? getJoinUrl(selected) : null;
  const selectedGuide = selected ? getGuidebookUrl(selected) : null;

  if (isError) {
    return <PublicPageError title="Gagal memuat informasi lomba" error={swr.error} onRetry={retry} />;
  }

  return (
    <PublicLayout>
      <PublicPageMeta
        title="Informasi Lomba"
        description="Kumpulan informasi lomba yang sedang dibuka dan mendekati batas pendaftaran untuk mahasiswa HM SDP Undiksha."
        path="/informasi-lomba"
      />
      <PublicLoadingOverlay show={isLoading} label="Memuat informasi lomba..." />
      <PublicEnter>
        <PublicPageHero
          top="Informasi"
          bottom="Lomba"
          subtitle="Info lomba yang masih buka/tutup, lengkap dengan syarat dan dokumen. Konten dikelola dari menu Konten Website."
        />

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <label htmlFor="competition-search" className="sr-only">
                Cari nama lomba
              </label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="competition-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama lomba..."
                aria-label="Cari nama lomba"
                className="h-11 w-full rounded-lg border border-black/10 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[var(--public-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35"
              />
            </div>

            <div className="flex w-full items-center gap-x-1 gap-y-1 md:w-auto">
              {(['Semua', 'Buka', 'Tutup'] as const).map((t) => {
                const isActive = filter === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilter(t)}
                    className={`relative min-h-10 px-3 text-sm font-semibold transition ${
                      isActive ? 'text-[var(--public-primary)]' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="relative inline-block pb-[3px]">
                      {t}
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[1px] origin-left bg-[var(--public-primary)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isActive ? 'scale-x-100' : 'scale-x-0'
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {!paged ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="p-4">
                    <Skeleton className="h-5 w-10/12" />
                    <Skeleton className="mt-2 h-4 w-24" />
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
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((l) => {
                const open = (l.status ?? 'Buka') === 'Buka';
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setOpenId(l.id)}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-left transition hover:border-[var(--public-primary)]/40 hover:shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)]"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                      <PublicCoverImage
                        url={l.cover_image_url}
                        alt={l.title}
                        imgClassName="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                      <span
                        className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm ${
                          open
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-rose-500/90 text-white'
                        }`}
                      >
                        {open ? 'Buka' : 'Tutup'}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="text-base font-bold leading-snug tracking-tight text-slate-900 line-clamp-2 sm:text-lg">
                        {l.title}
                      </h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <CalendarDays size={12} aria-hidden />
                        {l.date_label ? `Batas · ${l.date_label}` : 'Batas belum diumumkan'}
                      </p>
                      {l.excerpt ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                          {l.excerpt}
                        </p>
                      ) : null}
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--public-primary)]">
                        Lihat syarat & detail
                        <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setOpenId(null)}
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="competition-dialog-title"
            tabIndex={-1}
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl outline-none"
          >
            <div className="relative shrink-0 overflow-hidden bg-slate-950">
              <div className="aspect-[21/9] w-full sm:aspect-[2.4/1]">
                <PublicCoverImage
                  url={selected.cover_image_url}
                  alt={selected.title}
                  imgClassName="object-cover opacity-90"
                  displayWidth={1200}
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                  <span
                    className={`rounded-full px-2.5 py-0.5 ${
                      selectedOpen ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
                    }`}
                  >
                    {selectedOpen ? 'Pendaftaran dibuka' : 'Pendaftaran ditutup'}
                  </span>
                  {selected.date_label ? (
                    <span className="inline-flex items-center gap-1 text-white/85">
                      <CalendarDays size={12} aria-hidden />
                      Batas {selected.date_label}
                    </span>
                  ) : null}
                </div>
                <h2
                  id="competition-dialog-title"
                  className="mt-2 max-w-3xl text-xl font-bold tracking-tight text-white sm:text-2xl"
                >
                  {selected.title}
                </h2>
              </div>
              <button
                type="button"
                className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-lg bg-black/35 text-white backdrop-blur transition hover:bg-black/50"
                onClick={() => setOpenId(null)}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              {selected.excerpt ? (
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <FileText size={12} aria-hidden />
                    Ringkasan
                  </h3>
                  <p className="mt-2 text-base font-medium leading-relaxed text-slate-800">
                    {selected.excerpt}
                  </p>
                </section>
              ) : null}

              {selected.content ? (
                <section className="rounded-xl border border-black/8 bg-slate-50/80 p-4 sm:p-5">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <BookOpen size={12} aria-hidden />
                    Syarat &amp; ketentuan
                  </h3>
                  <RichOrPlain
                    value={selected.content}
                    className="mt-3 text-sm leading-relaxed text-slate-700 [&_a]:font-semibold [&_a]:text-[var(--public-primary)] [&_a]:underline [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-slate-800 [&_li]:mb-1.5 [&_ol]:ml-4 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:ml-4 [&_ul]:list-disc"
                  />
                </section>
              ) : !selected.excerpt ? (
                <p className="text-sm text-slate-500">Detail dan syarat lomba belum diisi.</p>
              ) : (
                <p className="rounded-xl border border-dashed border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Syarat lengkap belum dipublikasikan. Hubungi panitia atau cek tautan pendaftaran.
                </p>
              )}

              {selectedGuide ? (
                <a
                  href={selectedGuide}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-[var(--public-primary)]/25 bg-[var(--public-primary)]/[0.04] px-4 py-3 transition hover:border-[var(--public-primary)]/45 hover:bg-[var(--public-primary)]/[0.07]"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--public-primary)]/10 text-[var(--public-primary)]">
                    <BookOpen size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      Guidebook / panduan lomba
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      Unduh atau buka dokumen resmi (juknis, rulebook, petunjuk teknis)
                    </span>
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-[var(--public-primary)]" aria-hidden />
                </a>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-black/10 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setOpenId(null)}
              >
                Tutup
              </button>
              {selectedGuide ? (
                <a
                  href={selectedGuide}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--public-primary)]/30 px-4 text-sm font-semibold text-[var(--public-primary)] transition hover:bg-[var(--public-primary)]/[0.06]"
                >
                  <BookOpen size={16} aria-hidden />
                  Guidebook
                </a>
              ) : null}
              {selectedOpen && selectedJoin ? (
                <a
                  href={selectedJoin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[var(--public-primary)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Daftar sekarang
                  <ArrowRight size={16} />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}
