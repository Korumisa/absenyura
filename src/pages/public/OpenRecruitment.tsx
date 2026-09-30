import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import PublicLayout from '@/components/PublicLayout';
import type { PublicRecruitment } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X, ArrowRight, LogIn } from 'lucide-react';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import useLockBodyScroll from '@/lib/a11y/useLockBodyScroll';
import { useAuthStore } from '@/stores/authStore';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMockOrSwr } from '@/hooks/useMockOrSwr';
import { mockRecruitments } from '@/lib/utils/mockLandingData';
import { safeRelation } from '@/lib/utils/publicContent';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import { ensureHttpsUrl } from '@/lib/http/ensureHttpsUrl';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import { PublicPageMeta } from '@/components/public/PublicPageMeta';
import { publicSiteFetcher, safeArray } from '@/lib/utils/publicSiteFetcher';

function parseDateRange(dateRangeStr: string | null | undefined): { start?: Date; end?: Date } {
  if (!dateRangeStr) return {};
  const parts = String(dateRangeStr).split(' - ').map((s) => s.trim());
  const start = parts[0] ? new Date(parts[0]) : undefined;
  const end = parts[1] ? new Date(parts[1]) : undefined;
  return {
    start: start && !isNaN(start.getTime()) ? start : undefined,
    end: end && !isNaN(end.getTime()) ? end : undefined,
  };
}

function isRecruitmentOpen(r: { date_range: string | null }): boolean {
  const { start, end } = parseDateRange(r.date_range);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start) {
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    if (today < s) return false;
  }
  if (end) {
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
    if (today > e) return false;
  }
  return true;
}

function sanitizeDescriptionHtml(dirty: string | null | undefined): { __html: string } {
  if (!dirty) return { __html: '' };
  let cleaned = String(dirty);
  cleaned = cleaned.replace(/<(script|style)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  cleaned = cleaned.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  cleaned = cleaned.replace(
    /<a\s([^>]*)href="([^"]+)"([^>]*)>/gi,
    (_match, pre, href, post) => {
      const safeHref = /^https?:\/\//i.test(href) ? href : '#';
      return `<a ${pre} href="${safeHref}" ${post} target="_blank" rel="noopener noreferrer">`;
    }
  );
  cleaned = cleaned.replace(
    /<a\s([^>]*)href='([^']+)'([^>]*)>/gi,
    (_match, pre, href, post) => {
      const safeHref = /^https?:\/\//i.test(href) ? href : '#';
      return `<a ${pre} href='${safeHref}' ${post} target="_blank" rel="noopener noreferrer">`;
    }
  );
  return { __html: cleaned };
}

export default function OpenRecruitment() {
  const { swr, data, isInitialLoading: isLoading, isError, retry } = useMockOrSwr<PublicRecruitment[]>({
    swrKey: '/public-site/recruitments',
    fetcher: publicSiteFetcher<PublicRecruitment[]>,
    mockStatic: mockRecruitments,
  });
  const items = safeArray<PublicRecruitment>(data);
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => items.find((x) => x.id === openId) ?? null, [items, openId]);
  const selectedFormUrl = ensureHttpsUrl(selected?.form_url);
  const selectedIsOpen = useMemo(() => (selected ? isRecruitmentOpen(selected) : true), [selected]);
  useLockBodyScroll(Boolean(selected));
  useDialogA11y(Boolean(selected), () => closeModal(), { containerRef: modalRef });

  const openModal = (id: string) => {
    setOpenId(id);
    const next = new URLSearchParams(searchParams);
    next.set('id', id);
    setSearchParams(next);
  };

  const closeModal = () => {
    setOpenId(null);
    const next = new URLSearchParams(searchParams);
    next.delete('id');
    setSearchParams(next);
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    if (!items.length) return;
    if (items.some((x) => x.id === id)) setOpenId(id);
  }, [items, searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const onlyOpen = items.filter((x) => isRecruitmentOpen(x));
    if (!q) return onlyOpen;
    return onlyOpen.filter((x) => String(x.title || '').toLowerCase().includes(q));
  }, [items, query]);

  const contactHref = (value: string) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^mailto:/i.test(raw)) return raw;
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return '';
    const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
    return `https://wa.me/${normalized}`;
  };

  if (isError) {
    return <PublicPageError title="Gagal memuat open recruitment" error={swr.error} onRetry={retry} />;
  }

  return (
    <PublicLayout>
      <PublicPageMeta
        title="Open Recruitment"
        description="Informasi pendaftaran pengurus, rekrutmen terbuka, lowongan kepanitiaan, dan narahubung HM SDP Undiksha untuk periode berjalan."
        path="/open-recruitment"
      />
      <PublicLoadingOverlay show={isLoading} label="Memuat open recruitment..." />
      <PublicEnter>
        <PublicPageHero top="Open" bottom="Recruitment" subtitle="Informasi pendaftaran, deskripsi, dan link form. Bisa dikelola dari menu Konten Website.">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--public-primary)]/10 px-3.5 py-1.5 text-sm font-semibold text-[var(--public-primary)] ring-1 ring-[var(--public-primary)]/20">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--public-primary)]" />
            Ada {filtered.length} open recruitment yang sedang dibuka saat ini
          </div>
        </PublicPageHero>

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <label htmlFor="recruitment-search" className="sr-only">
                Cari open recruitment
              </label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="recruitment-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari open recruitment..."
                aria-label="Cari open recruitment"
                className="h-11 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[var(--public-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <Skeleton className="aspect-[4/5] w-full rounded-none" />
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
            <PublicEmptyState
              title="Belum ada open recruitment"
              description="Admin bisa menambahkan open recruitment dari menu Konten Website."
            />
          ) : filtered.length === 0 ? (
            query.trim() ? (
              <PublicEmptyState variant="search" />
            ) : (
              <PublicEmptyState
                variant="global"
                title="Saat ini tidak ada open recruitment yang sedang dibuka"
                description="Silakan cek kembali nanti ya! Informasi lowongan baru akan diumumkan di halaman ini."
              />
            )
          ) : (
            <div className="mt-6 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((r) => {
                const open = isRecruitmentOpen(r);
                const plainDesc = r.description
                  ? String(r.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                  : '';
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openModal(r.id)}
                    className="group flex w-full flex-col overflow-hidden border border-black/10 bg-white text-left transition hover:border-[var(--public-primary)]/40"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100">
                      <span
                        className={`absolute left-3 top-3 z-10 text-[11px] font-semibold uppercase tracking-wide ${
                          open ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {open ? 'Dibuka' : 'Ditutup'}
                      </span>
                      <PublicCoverImage
                        url={r.poster_image_url}
                        alt={r.title}
                        imgClassName="object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="text-base font-bold leading-snug tracking-tight text-slate-900 line-clamp-2">
                        {r.title}
                      </h3>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {r.date_range ?? '-'}
                      </p>
                      {plainDesc ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{plainDesc}</p>
                      ) : null}
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--public-primary)]">
                        Lihat detail
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruitment-dialog-title"
            tabIndex={-1}
            className="relative w-full max-w-5xl overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl outline-none"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Open recruitment
                  <span className="mx-2 text-slate-300">·</span>
                  <span className={selectedIsOpen ? 'text-emerald-700' : 'text-rose-700'}>
                    {selectedIsOpen ? 'Dibuka' : 'Ditutup'}
                  </span>
                </p>
                <h2
                  id="recruitment-dialog-title"
                  className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                >
                  {selected.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{selected.date_range ?? '-'}</p>
              </div>
              <button
                type="button"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-black/10 text-slate-600 transition hover:bg-slate-50"
                onClick={closeModal}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-col gap-6 md:flex-row md:gap-8">
                <div className="md:w-[42%] md:shrink-0">
                  <div className="overflow-hidden rounded-lg border border-black/10 bg-slate-50">
                    <div className="relative aspect-[3/4] w-full">
                      <PublicCoverImage
                        url={selected.poster_image_url}
                        alt={selected.title}
                        imgClassName="object-cover"
                        displayWidth={640}
                      />
                    </div>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-5">
                  {selected.description ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Deskripsi
                      </h3>
                      <div
                        className="recruitment-prose mt-2 text-sm leading-relaxed text-slate-700 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold [&_p]:mb-2.5 [&_ul]:mb-2.5 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:mb-2.5 [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-0.5 [&_a]:text-[var(--public-primary)] [&_a]:underline"
                        dangerouslySetInnerHTML={sanitizeDescriptionHtml(selected.description)}
                      />
                    </div>
                  ) : null}

                  {safeRelation(selected.committee).length ? (
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Posisi terbuka
                        </h3>
                        <span className="text-xs text-slate-400">
                          {safeRelation(selected.committee).length}
                        </span>
                      </div>
                      <ul className="mt-2 max-h-48 divide-y divide-black/5 overflow-y-auto border-y border-black/5">
                        {safeRelation(selected.committee).map((p) => (
                          <li
                            key={p.id}
                            className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-slate-900">
                                {p.role || p.name}
                              </span>
                              {p.role && p.name ? (
                                <span className="mt-0.5 block text-[11px] text-slate-400">
                                  Penanggung jawab · {p.name}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Posisi terbuka belum diumumkan.</p>
                  )}

                  {safeRelation(selected.contacts).length ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Narahubung
                      </h3>
                      <ul className="mt-2 divide-y divide-black/5 border-y border-black/5">
                        {safeRelation(selected.contacts).map((c) => (
                          <li key={c.id}>
                            <a
                              href={contactHref(c.contact)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 py-2.5 text-sm transition hover:text-[var(--public-primary)]"
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-slate-900">{c.name}</span>
                                <span className="block text-[11px] text-slate-400">Contact person</span>
                              </span>
                              <span className="shrink-0 truncate text-xs text-slate-500">{c.contact}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Narahubung belum diumumkan.</p>
                  )}

                  <div className="flex flex-col-reverse gap-2 border-t border-black/10 pt-4 sm:flex-row sm:justify-end sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-black/10 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={closeModal}
                    >
                      Tutup
                    </button>
                    {selectedFormUrl ? (
                      selectedIsOpen ? (
                        isAuthenticated && user ? (
                          <a
                            href={selectedFormUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[var(--public-primary)] px-4 text-sm font-semibold text-white transition hover:brightness-110"
                          >
                            Daftar Sekarang
                            <ArrowRight size={16} />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const next = new URLSearchParams(searchParams);
                              next.set('id', selected.id);
                              navigate('/login', {
                                state: {
                                  from: { pathname: location.pathname, search: `?${next.toString()}` },
                                },
                              });
                            }}
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[var(--public-primary)] px-4 text-sm font-semibold text-white transition hover:brightness-110"
                          >
                            Login untuk Daftar
                            <LogIn size={16} />
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-500"
                        >
                          Pendaftaran Ditutup
                        </button>
                      )
                    ) : (
                      <p className="self-center text-sm text-slate-500">Link pendaftaran belum diatur.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}
