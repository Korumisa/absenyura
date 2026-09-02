import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicRecruitment } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X } from 'lucide-react';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import useLockBodyScroll from '@/lib/a11y/useLockBodyScroll';
import { useAuthStore } from '@/stores/authStore';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import { ensureHttpsUrl } from '@/lib/http/ensureHttpsUrl';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';

export default function OpenRecruitment() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const swr = useSWR<PublicRecruitment[]>('/public-site/recruitments', fetcher, { revalidateOnFocus: false });
  const { data: items = [], isInitialLoading: isLoading, isError, retry } = useSwrPageState(swr);
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => items.find((x) => x.id === openId) ?? null, [items, openId]);
  const selectedFormUrl = ensureHttpsUrl(selected?.form_url);
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
    if (!q) return items;
    return items.filter((x) => String(x.title || '').toLowerCase().includes(q));
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
      <PublicLoadingOverlay show={isLoading} label="Memuat open recruitment..." />
      <PublicEnter>
        <PublicPageHero top="Open" bottom="Recruitment" subtitle="Informasi pendaftaran, deskripsi, dan link form. Bisa dikelola dari menu Konten Website." />

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
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
            <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
            <PublicEmptyState variant="search" />
          ) : (
            <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] justify-start justify-items-start gap-6">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openModal(r.id)}
                  className="group w-full max-w-[260px] overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25"
                >
                  <div className="aspect-[4/5] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]">
                    <PublicCoverImage url={r.poster_image_url} alt={r.title} imgClassName="object-cover transition duration-700 group-hover:scale-[1.01]" />
                  </div>
                  <div className="p-5">
                    <div className="text-base font-extrabold tracking-tight text-slate-900 line-clamp-2">{r.title}</div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{r.date_range ?? '-'}</div>
                    {r.description ? <div className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-700">{r.description}</div> : null}
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition group-hover:border-[var(--public-primary)]/25">
                        Detail
                      </div>
                      <div className="inline-flex items-center rounded-xl bg-[var(--public-primary)] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_22px_rgba(37,99,235,0.28)] transition group-hover:brightness-110">
                        Daftar
                      </div>
                    </div>
                  </div>
                </button>
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
            onClick={closeModal}
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruitment-dialog-title"
            tabIndex={-1}
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] outline-none"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(56,189,248,0.08),transparent_60%)]" />
              <div className="relative flex items-start justify-between gap-4 border-b border-black/10 px-5 py-5 sm:px-7">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Open Recruitment</div>
                  <h2 id="recruitment-dialog-title" className="mt-2 truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                    {selected.title}
                  </h2>
                  <div className="mt-1 text-sm font-semibold text-muted-foreground">{selected.date_range ?? '-'}</div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white p-2 text-slate-800 hover:bg-slate-50"
                  onClick={closeModal}
                  aria-label="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-black/10 bg-slate-50">
                    <div className="aspect-[4/5] w-full">
                      <PublicCoverImage url={selected.poster_image_url} alt={selected.title} imgClassName="object-cover" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {selected.description ? (
                    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.25)]">
                      <div className="text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">Deskripsi</div>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selected.description}</div>
                    </div>
                  ) : null}
                  {selected.contacts?.length ? (
                    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.25)]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-extrabold tracking-tight text-slate-900">Contact Person</div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{selected.contacts.length} kontak</div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {selected.contacts.map((c) => (
                          <a
                            key={c.id}
                            href={contactHref(c.contact)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-2xl border border-black/10 bg-white p-4 text-left transition hover:border-[var(--public-primary)]/30 hover:bg-[var(--public-primary)]/5"
                          >
                            <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{c.contact}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selected.committee?.length ? (
                    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.25)]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-extrabold tracking-tight text-slate-900">Panitia / Posisi</div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{selected.committee.length} orang</div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {selected.committee.map((p) => (
                          <div key={p.id} className="rounded-2xl border border-black/10 bg-white p-4">
                            <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                            <div className="text-sm text-muted-foreground">{p.role}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.25)]">
                    <div className="text-sm font-extrabold tracking-tight text-slate-900">Pendaftaran</div>
                    {selectedFormUrl ? (
                      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          className="w-full rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-[var(--public-primary)]/25 sm:w-auto"
                          onClick={closeModal}
                        >
                          Tutup
                        </button>
                        {isAuthenticated && user ? (
                          <a
                            href={selectedFormUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full rounded-xl bg-[var(--public-primary)] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] transition hover:brightness-110 sm:w-auto"
                          >
                            Daftar Sekarang
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              openModal(selected.id);
                              const next = new URLSearchParams(searchParams);
                              next.set('id', selected.id);
                              navigate('/login', { state: { from: { pathname: location.pathname, search: `?${next.toString()}` } } });
                            }}
                            className="w-full rounded-xl bg-[var(--public-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] transition hover:brightness-110 sm:w-auto"
                          >
                            Login untuk Daftar
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-muted-foreground">Link pendaftaran belum diatur.</div>
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

